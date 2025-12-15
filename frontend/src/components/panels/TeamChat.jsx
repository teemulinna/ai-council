import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '../../stores/canvasStore';
import { useHistoryStore } from '../../stores/historyStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8347';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8347/ws/execute';

export default function TeamChat({ isVisible, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const nodes = useCanvasStore((s) => s.nodes);
  const exportConfig = useCanvasStore((s) => s.exportConfig);
  const addConversation = useHistoryStore((s) => s.addConversation);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || nodes.length === 0) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const config = exportConfig();

    try {
      const ws = new WebSocket(WS_URL);
      let responses = {};
      let finalAnswer = null;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'execute',
          query: userMessage,
          config,
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'response':
            responses[msg.nodeId] = {
              content: msg.content,
              tokens: msg.tokens,
            };
            // Add individual response to chat
            const node = nodes.find((n) => n.id === msg.nodeId);
            if (node && !node.data.isChairman) {
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  participant: node.data.displayName,
                  model: node.data.model,
                  content: msg.content,
                },
              ]);
            }
            break;

          case 'final_answer':
            finalAnswer = msg.content;
            setMessages((prev) => [
              ...prev,
              {
                role: 'chairman',
                content: msg.content,
              },
            ]);
            break;

          case 'complete':
            setIsLoading(false);
            // Save to history
            addConversation({
              query: userMessage,
              config,
              responses,
              finalAnswer: { content: finalAnswer },
            });
            ws.close();
            break;

          case 'error':
            setIsLoading(false);
            setMessages((prev) => [
              ...prev,
              { role: 'error', content: msg.error },
            ]);
            break;
        }
      };

      ws.onerror = () => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: 'error', content: 'Connection error. Is the backend running?' },
        ]);
      };
    } catch (error) {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: error.message },
      ]);
    }
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-0 left-0 right-0 h-[400px] bg-bg-secondary border-t border-white/10
                 flex flex-col z-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-sm font-medium text-text-primary">Team Discussion</span>
          <span className="text-xs text-text-muted">
            ({nodes.filter((n) => !n.data.isChairman).length} participants + Chairman)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-text-muted hover:text-text-primary hover:bg-white/5"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <span className="text-4xl block mb-3">💬</span>
            <p className="text-sm">Start a discussion with your council</p>
            <p className="text-xs mt-1">
              Ask questions and get responses from all participants
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-accent-primary text-white'
                    : msg.role === 'chairman'
                    ? 'bg-yellow-600/20 border border-yellow-500/30'
                    : msg.role === 'error'
                    ? 'bg-accent-error/20 border border-accent-error/30'
                    : 'bg-bg-tertiary'
                }`}
              >
                {msg.role !== 'user' && msg.role !== 'error' && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-text-primary">
                      {msg.role === 'chairman' ? '👑 Chairman' : msg.participant}
                    </span>
                    {msg.model && (
                      <span className="text-[10px] text-text-muted">
                        {msg.model.split('/').pop()}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-bg-tertiary rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-text-muted">Council is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={nodes.length === 0 ? 'Add participants first...' : 'Ask the council...'}
            disabled={isLoading || nodes.length === 0}
            className="flex-1 px-4 py-2.5 bg-bg-tertiary border border-white/10 rounded-lg
                       text-sm text-text-primary placeholder-text-muted
                       focus:outline-none focus:border-accent-primary
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || nodes.length === 0 || !input.trim()}
            className="px-4 py-2.5 bg-accent-primary text-white text-sm font-medium
                       rounded-lg hover:bg-accent-primary/90 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </motion.div>
  );
}
