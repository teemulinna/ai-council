import { useState } from 'react';
import { motion } from 'framer-motion';
import { useExecutionStore } from '../../stores/executionStore';

export default function QueryPanel({ onSubmit, isVisible }) {
  const [query, setQuery] = useState('');
  const isExecuting = useExecutionStore((s) => s.isExecuting);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isExecuting) {
      onSubmit(query.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl
                   overflow-hidden"
      >
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the council a question..."
          rows={3}
          disabled={isExecuting}
          className="w-full px-4 py-3 bg-transparent text-text-primary text-sm
                     placeholder-text-muted resize-none
                     focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
          <span className="text-xs text-text-muted">
            Press Enter to submit, Shift+Enter for new line
          </span>
          <button
            type="submit"
            disabled={!query.trim() || isExecuting}
            className="px-4 py-1.5 bg-accent-primary text-white text-sm font-medium
                       rounded-lg hover:bg-accent-primary/90 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? 'Running...' : 'Submit'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
