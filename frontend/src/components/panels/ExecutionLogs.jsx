import { useState, useEffect } from 'react';
import { formatCost, formatTokens, providerColors } from '../../utils/helpers';
import { API_BASE } from '../../api';

/**
 * ExecutionLogs - View detailed execution logs, round traversal, and decision tree
 */
export default function ExecutionLogs({ conversationId, isVisible, onClose }) {
  const [logs, setLogs] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(1);
  const [decisionTree, setDecisionTree] = useState([]);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs', 'tree', 'timeline'
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  // Fetch rounds when conversation changes
  useEffect(() => {
    if (conversationId && isVisible) {
      fetchRounds();
    }
  }, [conversationId, isVisible]);

  // Fetch logs when round changes
  useEffect(() => {
    if (conversationId && selectedRound) {
      fetchLogs();
      fetchDecisionTree();
    }
  }, [conversationId, selectedRound]);

  const fetchRounds = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs/${conversationId}/rounds`);
      const data = await res.json();
      setRounds(data.rounds || [1]);
      if (data.rounds?.length > 0) {
        setSelectedRound(data.rounds[0]);
      }
    } catch (err) {
      console.error('Failed to fetch rounds:', err);
      setRounds([1]);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/logs/${conversationId}?round_number=${selectedRound}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecisionTree = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs/${conversationId}/decision-tree?round_number=${selectedRound}`);
      const data = await res.json();
      setDecisionTree(data.tree || []);
    } catch (err) {
      console.error('Failed to fetch decision tree:', err);
      setDecisionTree([]);
    }
  };

  const getStageColor = (stage) => {
    if (stage.includes('stage1')) return '#10B981';
    if (stage.includes('stage2')) return '#F59E0B';
    if (stage.includes('stage3')) return '#8B5CF6';
    if (stage.includes('error')) return '#EF4444';
    return '#6B7280';
  };

  const getStageBadge = (stage) => {
    if (stage.includes('stage1')) return 'Stage 1';
    if (stage.includes('stage2')) return 'Stage 2';
    if (stage.includes('stage3')) return 'Stage 3';
    return stage;
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary rounded-xl border border-white/10 w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Execution Logs</h2>
            {/* Round Selector */}
            {rounds.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Round:</span>
                <div className="flex gap-1">
                  {rounds.map((round) => (
                    <button
                      key={round}
                      onClick={() => setSelectedRound(round)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedRound === round
                          ? 'bg-accent-primary text-white'
                          : 'bg-white/5 text-text-secondary hover:bg-white/10'
                      }`}
                    >
                      {round}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-text-secondary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-white/10 bg-white/2">
          {[
            { id: 'logs', label: 'Interaction Logs', icon: '📝' },
            { id: 'tree', label: 'Decision Tree', icon: '🌳' },
            { id: 'timeline', label: 'Timeline', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-text-secondary hover:bg-white/5'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full" />
            </div>
          ) : activeTab === 'logs' ? (
            <LogsView
              logs={logs}
              expandedLog={expandedLog}
              setExpandedLog={setExpandedLog}
              getStageColor={getStageColor}
              getStageBadge={getStageBadge}
              formatDuration={formatDuration}
            />
          ) : activeTab === 'tree' ? (
            <TreeView
              tree={decisionTree}
              getStageColor={getStageColor}
            />
          ) : (
            <TimelineView
              logs={logs}
              getStageColor={getStageColor}
              getStageBadge={getStageBadge}
              formatDuration={formatDuration}
            />
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/2">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-text-secondary">
              <span className="text-white font-medium">{logs.length}</span> interactions
            </span>
            <span className="text-text-secondary">
              <span className="text-white font-medium">
                {formatTokens(logs.reduce((sum, log) => sum + (log.tokens_used || 0), 0))}
              </span> tokens
            </span>
            <span className="text-text-secondary">
              <span className="text-white font-medium">
                {formatCost(logs.reduce((sum, log) => sum + (log.cost || 0), 0))}
              </span> cost
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            Conversation: {conversationId?.slice(0, 8)}...
          </span>
        </div>
      </div>
    </div>
  );
}

// Logs View Component
function LogsView({ logs, expandedLog, setExpandedLog, getStageColor, getStageBadge, formatDuration }) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
        <span className="text-4xl mb-2">📋</span>
        <p>No logs available for this conversation</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log, idx) => (
        <div
          key={log.id || idx}
          className="bg-white/3 rounded-lg border border-white/5 overflow-hidden"
        >
          {/* Log Header */}
          <button
            onClick={() => setExpandedLog(expandedLog === idx ? null : idx)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: getStageColor(log.stage) + '20', color: getStageColor(log.stage) }}
              >
                {getStageBadge(log.stage)}
              </span>
              <span className="font-medium text-white">{log.node_name || log.node_id}</span>
              <span className="text-text-secondary text-sm">{log.model}</span>
              {log.role && (
                <span className="text-text-secondary text-sm">({log.role})</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">{formatDuration(log.duration_ms || 0)}</span>
              <span className="text-sm text-text-secondary">{formatTokens(log.tokens_used || 0)} tokens</span>
              <span className="text-sm text-green-400">{formatCost(log.cost || 0)}</span>
              <svg
                className={`w-5 h-5 text-text-secondary transition-transform ${expandedLog === idx ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Expanded Content */}
          {expandedLog === idx && (
            <div className="border-t border-white/10 p-4 space-y-4">
              {/* Input */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                  <span className="text-blue-400">→</span> Input
                </h4>
                <pre className="bg-black/30 rounded-lg p-3 text-sm text-white/80 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {log.input_content || 'No input recorded'}
                </pre>
              </div>

              {/* Output */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                  <span className="text-green-400">←</span> Output
                </h4>
                <pre className="bg-black/30 rounded-lg p-3 text-sm text-white/80 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {log.output_content || 'No output recorded'}
                </pre>
              </div>

              {/* Metadata */}
              <div className="flex gap-4 text-xs text-text-secondary">
                <span>Timestamp: {new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Decision Tree View Component
function TreeView({ tree, getStageColor }) {
  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
        <span className="text-4xl mb-2">🌳</span>
        <p>No decision tree data available</p>
      </div>
    );
  }

  // Build tree structure from flat list
  const buildTree = (items) => {
    const nodeMap = {};
    const roots = [];

    items.forEach(item => {
      nodeMap[item.node_id] = { ...item, children: [] };
    });

    items.forEach(item => {
      if (item.parent_node_id && nodeMap[item.parent_node_id]) {
        nodeMap[item.parent_node_id].children.push(nodeMap[item.node_id]);
      } else {
        roots.push(nodeMap[item.node_id]);
      }
    });

    return roots;
  };

  const TreeNode = ({ node, depth = 0 }) => {
    const data = node.decision_data || {};
    return (
      <div className="ml-4" style={{ marginLeft: depth * 24 }}>
        <div className="flex items-start gap-2 py-2">
          {depth > 0 && (
            <div className="flex items-center">
              <div className="w-4 h-px bg-white/20" />
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          )}
          <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStageColor(node.decision_type || '') }}
              />
              <span className="font-medium text-white text-sm">{node.node_id}</span>
              <span className="text-xs text-text-secondary">({node.decision_type})</span>
            </div>
            {Object.keys(data).length > 0 && (
              <div className="text-xs text-text-secondary mt-1">
                {Object.entries(data).slice(0, 3).map(([k, v]) => (
                  <span key={k} className="mr-3">
                    {k}: <span className="text-white/70">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {node.children?.map((child, idx) => (
          <TreeNode key={child.node_id || idx} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  const roots = buildTree(tree);

  return (
    <div className="space-y-2">
      {roots.map((node, idx) => (
        <TreeNode key={node.node_id || idx} node={node} />
      ))}
    </div>
  );
}

// Timeline View Component
function TimelineView({ logs, getStageColor, getStageBadge, formatDuration }) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
        <span className="text-4xl mb-2">📊</span>
        <p>No timeline data available</p>
      </div>
    );
  }

  const totalDuration = logs.reduce((sum, log) => sum + (log.duration_ms || 0), 0);

  return (
    <div className="space-y-4">
      {/* Duration Bar */}
      <div className="bg-white/5 rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-secondary mb-3">Execution Duration</h4>
        <div className="h-8 bg-black/30 rounded-full overflow-hidden flex">
          {logs.map((log, idx) => {
            const width = totalDuration > 0 ? ((log.duration_ms || 0) / totalDuration) * 100 : 0;
            return (
              <div
                key={idx}
                className="h-full relative group"
                style={{
                  width: `${Math.max(width, 1)}%`,
                  backgroundColor: getStageColor(log.stage)
                }}
                title={`${log.node_name || log.node_id}: ${formatDuration(log.duration_ms || 0)}`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {log.node_name || log.node_id}: {formatDuration(log.duration_ms || 0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-secondary">
          <span>0s</span>
          <span>Total: {formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
        {logs.map((log, idx) => (
          <div key={idx} className="relative flex items-start gap-4 pb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center z-10"
              style={{ backgroundColor: getStageColor(log.stage) }}
            >
              <span className="text-white text-xs font-bold">{idx + 1}</span>
            </div>
            <div className="flex-1 bg-white/3 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">{log.node_name || log.node_id}</span>
                <span className="text-sm text-text-secondary">{formatDuration(log.duration_ms || 0)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span
                  className="px-2 py-0.5 rounded"
                  style={{ backgroundColor: getStageColor(log.stage) + '20', color: getStageColor(log.stage) }}
                >
                  {getStageBadge(log.stage)}
                </span>
                <span>{log.model}</span>
                <span>{formatTokens(log.tokens_used || 0)} tokens</span>
                <span className="text-green-400">{formatCost(log.cost || 0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
