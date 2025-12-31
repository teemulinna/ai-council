import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useExecutionStore } from '../../stores/executionStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { usePatternsStore } from '../../stores/patternsStore';
import { providerColors, getRole } from '../../utils/helpers';

const ParticipantNode = ({ id, data, selected }) => {
  const nodeState = useExecutionStore((s) => s.nodeStates[id]);
  const streamingContent = useExecutionStore((s) => s.streamingContent[id]);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const getPattern = usePatternsStore((s) => s.getPattern);

  const [isDragOver, setIsDragOver] = useState(false);

  const role = getRole(data.role);
  const providerColor = providerColors[data.provider] || providerColors.other;
  const currentPattern = getPattern(data.reasoningPattern || 'standard');

  // Handle pattern drop
  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/pattern')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const patternData = e.dataTransfer.getData('application/pattern');
    if (patternData) {
      const pattern = JSON.parse(patternData);
      updateNode(id, { reasoningPattern: pattern.id });
    }
  };

  // State-based styling
  const getStateStyles = () => {
    if (isDragOver) {
      return 'border-accent-primary border-dashed';
    }
    switch (nodeState) {
      case 'active':
      case 'streaming':
        return 'border-accent-primary glow-accent';
      case 'complete':
        return 'border-accent-success glow-success success-pulse-ring';
      case 'error':
        return 'border-accent-error';
      default:
        return selected ? 'border-accent-primary' : 'border-white/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={() => selectNode(id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative bg-bg-secondary rounded-xl p-4 min-w-[180px] max-w-[220px]
        border-2 transition-all duration-200 cursor-pointer
        hover:border-accent-primary/50 hover:shadow-lg
        ${getStateStyles()}
        ${isDragOver ? 'bg-accent-primary/10' : ''}
      `}
    >
      {/* Input handle - elegant connection point */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-bg-tertiary !border-2 !border-white/30
                   hover:!border-accent-primary hover:!bg-accent-primary/20
                   hover:!scale-125 !transition-all !duration-200"
        style={{ top: -8 }}
      />

      {/* Provider indicator */}
      <div
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-bg-secondary"
        style={{ backgroundColor: providerColor }}
      />

      {/* Chairman badge with glow */}
      {data.isChairman && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent-gold text-bg-primary text-[10px] font-bold px-2 py-0.5 rounded-full chairman-glow shadow-lg">
          CHAIRMAN
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{role.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {data.displayName}
          </h3>
          <p className="text-xs text-text-muted truncate">{role.name}</p>
        </div>
      </div>

      {/* Pattern badge */}
      {currentPattern && currentPattern.id !== 'standard' && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-accent-primary/10 rounded-md">
          <span className="text-sm">{currentPattern.icon}</span>
          <span className="text-[10px] text-accent-primary font-medium truncate">
            {currentPattern.name}
          </span>
        </div>
      )}

      {/* Drop hint */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent-primary/20 rounded-xl">
          <span className="text-xs text-accent-primary font-medium">
            Drop pattern here
          </span>
        </div>
      )}

      {/* State indicator */}
      {nodeState && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
          {nodeState === 'pending' && (
            <>
              <span className="w-2 h-2 rounded-full bg-text-muted" />
              <span className="text-xs text-text-muted">Waiting</span>
            </>
          )}
          {(nodeState === 'active' || nodeState === 'streaming') && (
            <>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-accent-primary"
              />
              <span className="text-xs text-accent-primary">
                {nodeState === 'streaming' ? 'Responding...' : 'Processing'}
              </span>
            </>
          )}
          {nodeState === 'complete' && (
            <>
              <span className="w-2 h-2 rounded-full bg-accent-success" />
              <span className="text-xs text-accent-success">Complete</span>
            </>
          )}
          {nodeState === 'error' && (
            <>
              <span className="w-2 h-2 rounded-full bg-accent-error" />
              <span className="text-xs text-accent-error">Error</span>
            </>
          )}
        </div>
      )}

      {/* Streaming preview */}
      {streamingContent && nodeState === 'streaming' && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-xs text-text-secondary line-clamp-2">
            {streamingContent.slice(-100)}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ▌
            </motion.span>
          </p>
        </div>
      )}

      {/* Speaking order badge */}
      <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-bg-tertiary border border-white/10 flex items-center justify-center">
        <span className="text-xs font-medium text-text-secondary">
          {data.speakingOrder}
        </span>
      </div>

      {/* Output handle - elegant connection point */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-bg-tertiary !border-2 !border-white/30
                   hover:!border-accent-primary hover:!bg-accent-primary/20
                   hover:!scale-125 !transition-all !duration-200"
        style={{ bottom: -8 }}
      />
    </motion.div>
  );
};

export default memo(ParticipantNode);
