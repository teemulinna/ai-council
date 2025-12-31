import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { useCanvasStore } from './stores/canvasStore';
import { useExecutionStore } from './stores/executionStore';
import { useHistoryStore } from './stores/historyStore';

import LandingView from './components/LandingView';
import Header from './components/layout/Header';
import Sidebar from './components/panels/Sidebar';
import CouncilCanvas from './components/canvas/CouncilCanvas';
import ConfigPanel from './components/panels/ConfigPanel';
import EdgePanel from './components/panels/EdgePanel';
import ResultsPanel from './components/panels/ResultsPanel';
import ChatInput from './components/ChatInput';
import ExecutionLogs from './components/panels/ExecutionLogs';
import HelpGuide from './components/HelpGuide';
import HistoryPanel from './components/panels/HistoryPanel';
import ExecutionProgress from './components/ExecutionProgress';

// Use environment variables for API URLs
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8347/ws/execute';

export default function App() {
  const [showResults, setShowResults] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logsConversationId, setLogsConversationId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false); // Hidden by default
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const currentConversationId = useRef(null);

  const nodes = useCanvasStore((s) => s.nodes);
  const loadPreset = useCanvasStore((s) => s.loadPreset);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const exportConfig = useCanvasStore((s) => s.exportConfig);

  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const setNodeState = useExecutionStore((s) => s.setNodeState);
  const setResponse = useExecutionStore((s) => s.setResponse);
  const setRanking = useExecutionStore((s) => s.setRanking);
  const setFinalAnswer = useExecutionStore((s) => s.setFinalAnswer);
  const setStage = useExecutionStore((s) => s.setStage);
  const completeExecution = useExecutionStore((s) => s.completeExecution);
  const stopExecution = useExecutionStore((s) => s.stopExecution);
  const appendStreamingContent = useExecutionStore((s) => s.appendStreamingContent);

  const addConversation = useHistoryStore((s) => s.addConversation);
  const conversations = useHistoryStore((s) => s.conversations);
  const syncWithBackend = useHistoryStore((s) => s.syncWithBackend);
  const restoreFromHistory = useExecutionStore((s) => s.restoreFromHistory);

  // Sync history with backend on app load
  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  // Has council been set up?
  const hasCouncil = nodes.length > 0;
  const hasHistory = conversations.length > 0;

  // Handle preset selection from LandingView
  const handleSelectPreset = useCallback((preset) => {
    loadPreset(preset);
  }, [loadPreset]);

  // Handle custom build from LandingView
  const handleCustomBuild = useCallback(() => {
    setShowSidebar(true);
  }, []);

  // Handle query submission from ChatInput
  const handleQuerySubmit = useCallback(async (query) => {
    if (nodes.length === 0) return;

    setShowResults(true);

    const config = exportConfig();
    const executionId = Date.now().toString();

    // Start execution state with the query
    startExecution(executionId, nodes.length, query);

    // Set all nodes to pending
    nodes.forEach((node) => {
      setNodeState(node.id, 'pending');
    });

    try {
      // Connect to WebSocket for streaming
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        // Send execution request
        ws.send(JSON.stringify({
          type: 'execute',
          query,
          config,
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        // Capture conversation ID from any message that includes it
        if (msg.conversationId) {
          currentConversationId.current = msg.conversationId;
        }

        switch (msg.type) {
          case 'stage_update':
            setStage(msg.stage);
            break;

          case 'node_state':
            setNodeState(msg.nodeId, msg.state);
            break;

          case 'stream_chunk':
            appendStreamingContent(msg.nodeId, msg.chunk);
            break;

          case 'response':
            setResponse(msg.nodeId, {
              content: msg.content,
              tokens: msg.tokens,
              cost: msg.cost,
            });
            setNodeState(msg.nodeId, 'complete');
            break;

          case 'ranking':
            setRanking(msg.nodeId, {
              rankings: msg.rankings,
              reasoning: msg.reasoning,
            });
            break;

          case 'final_answer':
            setFinalAnswer({
              content: msg.content,
              tokens: msg.tokens,
              cost: msg.cost,
            });
            break;

          case 'complete':
            // Save to history with conversation ID from backend
            addConversation({
              id: currentConversationId.current,
              query,
              config,
              responses: useExecutionStore.getState().responses,
              rankings: useExecutionStore.getState().rankings, // Include rankings!
              finalAnswer: useExecutionStore.getState().finalAnswer,
              tokens: useExecutionStore.getState().totalTokens,
              cost: useExecutionStore.getState().totalCost,
            });
            completeExecution();
            ws.close();
            break;

          case 'error':
            console.error('Execution error:', msg.error);
            setNodeState(msg.nodeId, 'error');
            break;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        stopExecution();
      };

      ws.onclose = () => {
        if (isExecuting) {
          completeExecution();
        }
      };
    } catch (error) {
      console.error('Execution failed:', error);
      stopExecution();
    }
  }, [
    nodes,
    exportConfig,
    startExecution,
    setNodeState,
    setStage,
    setResponse,
    setRanking,
    setFinalAnswer,
    completeExecution,
    stopExecution,
    appendStreamingContent,
    isExecuting,
    addConversation,
  ]);

  // Handle stop
  const handleStop = useCallback(() => {
    stopExecution();
  }, [stopExecution]);

  // Handle view logs from history
  const handleViewLogs = useCallback((conversationId) => {
    setLogsConversationId(conversationId);
    setShowLogs(true);
  }, []);

  // Handle starting over (back to landing)
  const handleStartOver = useCallback(() => {
    clearCanvas();
    setShowSidebar(false);
  }, [clearCanvas]);

  // Handle replay from history
  const handleReplay = useCallback((conversation) => {
    // Load the config from the conversation if available
    if (conversation.config) {
      // Recreate the council from the saved config
      const preset = {
        name: conversation.config.name || 'Replayed Council',
        nodes: conversation.config.nodes,
        edges: conversation.config.edges,
      };
      loadPreset(preset);
    }

    // Restore the execution state from the saved conversation
    restoreFromHistory(conversation);

    setShowResults(true);
  }, [loadPreset, restoreFromHistory]);

  return (
    <ReactFlowProvider>
      {/* Skip to main content - Accessibility */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <div id="main-content" className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
        {/* Header - always visible */}
        <Header
          onStop={handleStop}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          showSidebarToggle={hasCouncil}
          isSidebarOpen={showSidebar}
          onStartOver={handleStartOver}
          onShowHelp={() => setShowHelp(true)}
          onShowHistory={() => setShowHistory(true)}
          hasHistory={hasHistory}
          onGoHome={handleStartOver}
        />

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Landing View - when no council */}
          {!hasCouncil && !showSidebar && (
            <LandingView
              onSelectPreset={handleSelectPreset}
              onCustomBuild={handleCustomBuild}
            />
          )}

          {/* Sidebar - collapsible, hidden by default */}
          {(hasCouncil || showSidebar) && showSidebar && (
            <Sidebar onViewLogs={handleViewLogs} />
          )}

          {/* Canvas View - when council exists or custom build mode */}
          {(hasCouncil || showSidebar) && (
            <div className="flex-1 flex flex-col relative">
              <div className="flex-1 relative">
                <CouncilCanvas />

                {/* Empty state for custom build */}
                {!hasCouncil && showSidebar && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <span className="text-5xl mb-4 block opacity-50">🏛️</span>
                      <h2 className="text-lg font-semibold text-text-secondary mb-2">
                        Drag models from sidebar
                      </h2>
                      <p className="text-sm text-text-muted">
                        Or select a preset to get started quickly
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input - Always visible at bottom when council exists */}
              <ChatInput
                onSubmit={handleQuerySubmit}
                isDisabled={nodes.length === 0 || isExecuting}
                isExecuting={isExecuting}
                placeholder={nodes.length === 0
                  ? "Add participants to your council first..."
                  : "Ask your council a question..."}
              />
            </div>
          )}

          {/* Config Panel (modal) */}
          <ConfigPanel />

          {/* Edge Panel (floating bottom bar when edge selected) */}
          <EdgePanel />
        </div>

        {/* Results Panel (bottom drawer) */}
        <ResultsPanel
          isVisible={showResults}
          onClose={() => setShowResults(false)}
        />

        {/* Execution Logs Modal */}
        <ExecutionLogs
          conversationId={logsConversationId}
          isVisible={showLogs}
          onClose={() => {
            setShowLogs(false);
            setLogsConversationId(null);
          }}
        />

        {/* Help Guide Modal */}
        <HelpGuide
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />

        {/* History Panel Modal */}
        <HistoryPanel
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          onViewLogs={handleViewLogs}
          onReplay={handleReplay}
        />

        {/* Execution Progress Overlay */}
        <ExecutionProgress />
      </div>
    </ReactFlowProvider>
  );
}
