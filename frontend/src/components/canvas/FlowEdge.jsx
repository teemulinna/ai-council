import { memo, useCallback } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useCanvasStore } from '../../stores/canvasStore';

/**
 * FlowEdge - Custom edge component with elegant direction arrows and interactions
 *
 * Features:
 * - Bezier curves for smooth, organic connections
 * - Animated directional arrow that pulses on selection
 * - Hover glow effect with luminous feedback
 * - Click to select, then edit or delete
 * - Flow animation when data is being transmitted
 */
const FlowEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style = {},
  data,
  markerEnd,
}) => {
  const { setEdges } = useReactFlow();
  const selectEdge = useCanvasStore((s) => s.selectEdge);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);

  const isSelected = selected || selectedEdgeId === id;

  // Calculate bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  // Calculate arrow position and rotation (at 70% of the path for better visibility)
  const arrowOffset = 0.7;
  const t = arrowOffset;

  // Bezier curve interpolation for arrow position
  const cx1 = sourceX;
  const cy1 = sourceY + (targetY - sourceY) * 0.5;
  const cx2 = targetX;
  const cy2 = sourceY + (targetY - sourceY) * 0.5;

  // Get point on bezier curve
  const arrowX = Math.pow(1-t, 3) * sourceX + 3 * Math.pow(1-t, 2) * t * cx1 + 3 * (1-t) * Math.pow(t, 2) * cx2 + Math.pow(t, 3) * targetX;
  const arrowY = Math.pow(1-t, 3) * sourceY + 3 * Math.pow(1-t, 2) * t * cy1 + 3 * (1-t) * Math.pow(t, 2) * cy2 + Math.pow(t, 3) * targetY;

  // Calculate tangent for arrow rotation
  const dt = 0.01;
  const t2 = Math.min(t + dt, 1);
  const nextX = Math.pow(1-t2, 3) * sourceX + 3 * Math.pow(1-t2, 2) * t2 * cx1 + 3 * (1-t2) * Math.pow(t2, 2) * cx2 + Math.pow(t2, 3) * targetX;
  const nextY = Math.pow(1-t2, 3) * sourceY + 3 * Math.pow(1-t2, 2) * t2 * cy1 + 3 * (1-t2) * Math.pow(t2, 2) * cy2 + Math.pow(t2, 3) * targetY;

  const angle = Math.atan2(nextY - arrowY, nextX - arrowX) * (180 / Math.PI);

  // Handle edge click
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    selectEdge?.(id);
  }, [id, selectEdge]);

  // Colors based on state
  const baseColor = '#4B5563'; // Neutral gray
  const hoverColor = '#818CF8'; // Soft indigo
  const selectedColor = '#6366F1'; // Vibrant indigo
  const flowColor = data?.isFlowing ? '#10B981' : selectedColor; // Green when flowing

  const currentColor = isSelected ? flowColor : baseColor;
  const strokeWidth = isSelected ? 2.5 : 2;

  return (
    <>
      {/* Glow layer - visible on hover/selection */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isSelected ? `${selectedColor}40` : 'transparent',
          strokeWidth: isSelected ? 12 : 0,
          filter: isSelected ? 'blur(8px)' : 'none',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Interactive hit area - wider for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
        className="react-flow__edge-interaction"
      />

      {/* Main edge path */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: currentColor,
          strokeWidth,
          strokeLinecap: 'round',
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
          ...style,
        }}
      />

      {/* Animated flow indicator when selected or flowing */}
      {(isSelected || data?.isFlowing) && (
        <motion.circle
          r={3}
          fill={flowColor}
          initial={{ offsetDistance: '0%' }}
          animate={{ offsetDistance: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            offsetPath: `path("${edgePath}")`,
          }}
        />
      )}

      {/* Direction arrow */}
      <EdgeLabelRenderer>
        <motion.div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${arrowX}px, ${arrowY}px) rotate(${angle}deg)`,
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: 1,
            scale: isSelected ? 1.2 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            style={{
              filter: isSelected ? `drop-shadow(0 0 4px ${selectedColor})` : 'none',
            }}
          >
            {/* Arrow shape - elegant chevron */}
            <path
              d="M4 3 L12 8 L4 13"
              fill="none"
              stroke={currentColor}
              strokeWidth={isSelected ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 0.2s ease' }}
            />
          </svg>
        </motion.div>

        {/* Selection indicator - subtle label */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 20}px)`,
              pointerEvents: 'none',
            }}
            className="px-2 py-1 rounded-md text-[10px] font-medium
                       bg-accent-primary/90 text-white backdrop-blur-sm
                       shadow-lg"
          >
            Flow connection
          </motion.div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(FlowEdge);
