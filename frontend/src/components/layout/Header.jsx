import { useCanvasStore } from '../../stores/canvasStore';
import { useExecutionStore } from '../../stores/executionStore';
import { formatCost, formatTokens } from '../../utils/helpers';

export default function Header({
  onStop,
  onToggleSidebar,
  showSidebarToggle,
  isSidebarOpen,
  onStartOver,
  onShowHelp,
  onShowHistory,
  hasHistory,
  onGoHome,
}) {
  const councilName = useCanvasStore((s) => s.councilName);
  const setCouncilName = useCanvasStore((s) => s.setCouncilName);
  const nodes = useCanvasStore((s) => s.nodes);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const totalTokens = useExecutionStore((s) => s.totalTokens);
  const totalCost = useExecutionStore((s) => s.totalCost);

  const participantCount = nodes.filter((n) => !n.data.isChairman).length;
  const hasChairman = nodes.some((n) => n.data.isChairman);
  const hasCouncil = nodes.length > 0;

  return (
    <header className="h-14 bg-bg-secondary border-b border-white/10 flex items-center px-4 gap-4">
      {/* Logo - clickable to go home */}
      <button
        onClick={onGoHome}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        title="Return to home"
      >
        <span className="text-xl">🏛️</span>
        <span className="text-sm font-semibold text-text-primary">AI Council</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Council name (editable) - only show when council exists */}
      {hasCouncil && (
        <input
          type="text"
          value={councilName}
          onChange={(e) => setCouncilName(e.target.value)}
          className="bg-transparent text-sm text-text-primary border-none outline-none
                     focus:bg-bg-tertiary px-2 py-1 rounded transition-colors
                     placeholder-text-muted min-w-[150px]"
          placeholder="Council name..."
        />
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 ml-auto text-xs text-text-secondary">
        {hasCouncil && (
          <>
            <span>{participantCount} participants</span>
            {hasChairman && <span className="text-accent-warning">+ Chairman</span>}
          </>
        )}
        {totalTokens > 0 && (
          <>
            <span className="w-px h-4 bg-white/10" />
            <span>{formatTokens(totalTokens)} tokens</span>
            <span>{formatCost(totalCost)}</span>
          </>
        )}
      </div>

      {/* Edit/Customize button - toggle sidebar */}
      {showSidebarToggle && (
        <button
          onClick={onToggleSidebar}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2
                     ${isSidebarOpen
                       ? 'bg-accent-primary/20 text-accent-primary'
                       : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                     }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Edit
        </button>
      )}

      {/* Start Over button */}
      {hasCouncil && (
        <button
          onClick={onStartOver}
          className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary
                     transition-colors"
        >
          Start over
        </button>
      )}

      {/* History button - always visible */}
      <button
        onClick={onShowHistory}
        className={`p-2 rounded-lg transition-colors relative
                   ${hasHistory
                     ? 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                     : 'text-text-muted hover:text-text-secondary hover:bg-white/5'}`}
        title="View history"
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
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M12 7v5l4 2"/>
        </svg>
        {/* Badge when has history */}
        {hasHistory && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-primary rounded-full" />
        )}
      </button>

      {/* Help button */}
      <button
        onClick={onShowHelp}
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5
                   rounded-lg transition-colors"
        title="Help & Guide"
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
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <path d="M12 17h.01"/>
        </svg>
      </button>

      {/* Stop button (only when executing) */}
      {isExecuting && (
        <button
          onClick={onStop}
          className="px-4 py-2 bg-accent-error text-white text-sm font-medium
                     rounded-lg hover:bg-accent-error/90 transition-colors
                     flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-sm bg-white" />
          Stop
        </button>
      )}
    </header>
  );
}
