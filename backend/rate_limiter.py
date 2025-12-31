"""Rate limiting for AI Council backend.

Implements token bucket rate limiting for:
- Request rate limiting
- Cost-based limiting
- WebSocket connection limiting
"""

import time
import hashlib
import logging
from collections import defaultdict
from typing import Dict, Tuple, Optional
from fastapi import Request, WebSocket

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for API endpoints."""

    def __init__(
        self,
        max_requests: int = 10,
        window_seconds: int = 60,
        max_cost_per_hour: float = 5.0
    ):
        """
        Initialize rate limiter.

        Args:
            max_requests: Maximum requests per window
            window_seconds: Time window in seconds
            max_cost_per_hour: Maximum cost in USD per hour
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_cost_per_hour = max_cost_per_hour

        # Track requests: {client_id: [(timestamp, cost), ...]}
        self.requests: Dict[str, list] = defaultdict(list)

        # Track WebSocket connections: {client_id: connection_count}
        self.websocket_connections: Dict[str, int] = defaultdict(int)
        self.max_websocket_connections = 3

        logger.info(
            f"Rate limiter initialized: {max_requests} req/{window_seconds}s, "
            f"${max_cost_per_hour}/hour, {self.max_websocket_connections} WS/client"
        )

    def _get_client_id(self, request: Request = None, websocket: WebSocket = None) -> str:
        """
        Get client identifier from request.

        Args:
            request: FastAPI request object
            websocket: WebSocket connection

        Returns:
            Hashed client identifier
        """
        if request:
            # Use forwarded IP if behind proxy (for production)
            forwarded = request.headers.get("X-Forwarded-For")
            client_ip = forwarded.split(",")[0] if forwarded else request.client.host
        elif websocket:
            client_ip = websocket.client.host
        else:
            return "unknown"

        # Hash IP for privacy (GDPR compliance)
        return hashlib.sha256(client_ip.encode()).hexdigest()[:16]

    def _cleanup_old_requests(self, client_id: str):
        """Remove requests outside the time window."""
        cutoff = time.time() - self.window_seconds
        self.requests[client_id] = [
            (ts, cost) for ts, cost in self.requests[client_id]
            if ts > cutoff
        ]

    async def check_rate_limit(
        self,
        request: Request = None,
        websocket: WebSocket = None,
        estimated_cost: float = 0.0
    ) -> Tuple[bool, str]:
        """
        Check if request is within rate limits.

        Args:
            request: FastAPI request
            websocket: WebSocket connection
            estimated_cost: Estimated cost of operation in USD

        Returns:
            (allowed, error_message)
        """
        client_id = self._get_client_id(request, websocket)
        self._cleanup_old_requests(client_id)

        # Check request count
        request_count = len(self.requests[client_id])
        if request_count >= self.max_requests:
            logger.warning(
                f"Rate limit exceeded for client {client_id}: "
                f"{request_count}/{self.max_requests} requests"
            )
            return False, f"Rate limit exceeded: {self.max_requests} requests per {self.window_seconds}s"

        # Check cost limit (last hour)
        hour_cutoff = time.time() - 3600
        hourly_cost = sum(
            cost for ts, cost in self.requests[client_id]
            if ts > hour_cutoff
        )

        if hourly_cost + estimated_cost > self.max_cost_per_hour:
            logger.warning(
                f"Cost limit exceeded for client {client_id}: "
                f"${hourly_cost:.4f} + ${estimated_cost:.4f} > ${self.max_cost_per_hour}"
            )
            return False, f"Cost limit exceeded: ${self.max_cost_per_hour}/hour"

        # Allow request and track it
        self.requests[client_id].append((time.time(), estimated_cost))
        logger.debug(
            f"Request allowed for client {client_id}: "
            f"{request_count + 1}/{self.max_requests}, cost: ${estimated_cost:.4f}"
        )
        return True, ""

    async def check_websocket_limit(self, websocket: WebSocket) -> Tuple[bool, str]:
        """
        Check WebSocket connection limits.

        Args:
            websocket: WebSocket connection

        Returns:
            (allowed, error_message)
        """
        client_id = self._get_client_id(websocket=websocket)

        current_connections = self.websocket_connections[client_id]
        if current_connections >= self.max_websocket_connections:
            logger.warning(
                f"WebSocket limit exceeded for client {client_id}: "
                f"{current_connections}/{self.max_websocket_connections}"
            )
            return False, f"Too many concurrent WebSocket connections: max {self.max_websocket_connections}"

        self.websocket_connections[client_id] += 1
        logger.info(
            f"WebSocket connection accepted for client {client_id}: "
            f"{current_connections + 1}/{self.max_websocket_connections}"
        )
        return True, ""

    async def release_websocket(self, websocket: WebSocket):
        """
        Release a WebSocket connection.

        Args:
            websocket: WebSocket connection to release
        """
        client_id = self._get_client_id(websocket=websocket)
        self.websocket_connections[client_id] = max(0, self.websocket_connections[client_id] - 1)
        logger.info(
            f"WebSocket connection released for client {client_id}: "
            f"{self.websocket_connections[client_id]} remaining"
        )

    def get_stats(self) -> Dict:
        """
        Get rate limiter statistics.

        Returns:
            Dictionary with current stats
        """
        return {
            "total_clients_tracked": len(self.requests),
            "total_websocket_clients": len(self.websocket_connections),
            "max_requests": self.max_requests,
            "window_seconds": self.window_seconds,
            "max_cost_per_hour": self.max_cost_per_hour,
            "max_websocket_connections": self.max_websocket_connections
        }
