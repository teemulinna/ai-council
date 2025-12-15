import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../stores/canvasStore';
import ParticipantNode from './ParticipantNode';
import FlowEdge from './FlowEdge';
import { providerColors } from '../../utils/helpers';

// Custom node types
const nodeTypes = {
  participant: ParticipantNode,
};

// Custom edge types
const edgeTypes = {
  flow: FlowEdge,
};

// MiniMap node color
const nodeColor = (node) => {
  return providerColors[node.data?.provider] || '#6B6B6B';
};

export default function CouncilCanvas({ onNodeSelect }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [showMiniMap, setShowMiniMap] = useState(false);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const onReconnect = useCanvasStore((s) => s.onReconnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const selectEdge = useCanvasStore((s) => s.selectEdge);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);

  // Track edge being reconnected
  const edgeReconnectSuccessful = useRef(true);

  // Handle node click
  const handleNodeClick = useCallback(
    (event, node) => {
      selectNode(node.id);
      onNodeSelect?.(node);
    },
    [selectNode, onNodeSelect]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
    onNodeSelect?.(null);
  }, [selectNode, selectEdge, onNodeSelect]);

  // Handle edge click
  const handleEdgeClick = useCallback(
    (event, edge) => {
      selectEdge(edge.id);
      selectNode(null);
      onNodeSelect?.(null);
    },
    [selectEdge, selectNode, onNodeSelect]
  );

  // Add flow type to edges for rendering
  const edgesWithType = edges.map((edge) => ({
    ...edge,
    type: 'flow',
    selected: edge.id === selectedEdgeId,
  }));

  // Handle drop from sidebar
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/json');
      if (!data) return;

      const nodeData = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode({
        ...nodeData,
        position,
      });
    },
    [screenToFlowPosition, addNode]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle edge reconnection start
  const handleReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  // Handle edge reconnection
  const handleReconnect = useCallback(
    (oldEdge, newConnection) => {
      edgeReconnectSuccessful.current = true;
      onReconnect(oldEdge, newConnection);
    },
    [onReconnect]
  );

  // Handle edge reconnection end - delete if dropped on empty space
  const handleReconnectEnd = useCallback(
    (_, edge) => {
      if (!edgeReconnectSuccessful.current) {
        // Edge was dropped on empty space - delete it
        onEdgesChange([{ id: edge.id, type: 'remove' }]);
      }
      edgeReconnectSuccessful.current = true;
    },
    [onEdgesChange]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edgesWithType}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnectStart={handleReconnectStart}
        onReconnect={handleReconnect}
        onReconnectEnd={handleReconnectEnd}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        // Edge interaction settings
        edgesReconnectable={true}
        edgesFocusable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        // Default edge options for new connections
        defaultEdgeOptions={{
          type: 'flow',
          animated: false,
          focusable: true,
          reconnectable: true,
        }}
        connectionLineStyle={{ stroke: '#6366F1', strokeWidth: 2 }}
        className="bg-bg-primary"
      >
        <Background
          variant="dots"
          gap={20}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          className="!bg-bg-secondary !border-white/10 !rounded-lg !shadow-lg"
          showInteractive={false}
        />

        {/* MiniMap - only show when toggled */}
        {showMiniMap && (
          <MiniMap
            nodeColor={nodeColor}
            nodeStrokeColor={(node) => providerColors[node.data?.provider] || '#6B6B6B'}
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            maskColor="rgba(0, 0, 0, 0.6)"
            className="!bg-bg-secondary/90 !border-white/20 !rounded-lg !shadow-lg"
            style={{
              backgroundColor: 'rgba(30, 30, 35, 0.95)',
            }}
            pannable
            zoomable
          />
        )}
      </ReactFlow>

      {/* MiniMap Toggle Button */}
      <button
        onClick={() => setShowMiniMap(!showMiniMap)}
        className={`absolute bottom-24 left-4 w-10 h-10 rounded-lg shadow-lg
                    flex items-center justify-center transition-colors z-10
                    ${showMiniMap
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-white/10'
                    }`}
        title={showMiniMap ? 'Hide minimap' : 'Show minimap'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <rect x="7" y="7" width="3" height="3"/>
          <rect x="14" y="7" width="3" height="3"/>
          <rect x="7" y="14" width="3" height="3"/>
          <rect x="14" y="14" width="3" height="3"/>
        </svg>
      </button>
    </div>
  );
}
