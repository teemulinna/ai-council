import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CollapsibleSection - Progressive disclosure component
 * Used for hiding advanced options until the user needs them
 */
export default function CollapsibleSection({
  title,
  defaultOpen = false,
  badge = null,
  children,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-white/10 rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-bg-tertiary/30 hover:bg-bg-tertiary/50 transition-colors
                   text-left focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-inset"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{title}</span>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 bg-accent-primary/20 text-accent-primary rounded-full">
              {badge}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-muted"
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
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="px-4 py-3 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
