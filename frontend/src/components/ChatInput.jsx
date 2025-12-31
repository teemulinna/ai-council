import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ChatInput({ onSubmit, isDisabled, isExecuting, placeholder }) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isDisabled) {
      onSubmit(query.trim());
      setQuery('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-tour="chat-input"
      className="bg-bg-secondary border-t border-white/10"
    >
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDisabled}
              placeholder={placeholder || "Ask your council a question..."}
              rows={1}
              className="w-full px-4 py-3 bg-bg-tertiary border border-white/10 rounded-xl
                         text-sm text-text-primary placeholder-text-muted resize-none
                         focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all"
            />
            <div className="absolute right-3 bottom-2.5 text-xs text-text-muted">
              <kbd className="px-1.5 py-0.5 bg-bg-primary/50 rounded text-[10px]">Enter</kbd>
              <span className="mx-1">to send</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isDisabled}
            data-tour="run-button"
            aria-label={isExecuting ? "Council is running" : "Run council"}
            className="px-6 py-3 bg-accent-primary text-white font-medium rounded-xl
                       hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center gap-2 whitespace-nowrap
                       focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary
                       active:scale-[0.98]"
          >
            {isExecuting ? (
              <>
                <span className="flex items-center gap-1" aria-label="Processing">
                  <span className="w-1.5 h-1.5 bg-white rounded-full pulse-dot" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full pulse-dot" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full pulse-dot" />
                </span>
                <span className="ml-1">Running...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                Run Council
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2 text-center">
          Your question will be discussed by all council members
        </p>
      </form>
    </motion.div>
  );
}
