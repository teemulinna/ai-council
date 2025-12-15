import { motion, AnimatePresence } from 'framer-motion';

const GUIDE_SECTIONS = [
  {
    id: 'basics',
    title: 'Getting Started',
    icon: '🚀',
    items: [
      { label: 'Pick a preset', desc: 'Choose a ready-made council to start quickly' },
      { label: 'Ask a question', desc: 'Type your question and click "Run Council"' },
      { label: 'View responses', desc: 'Each AI provides their perspective, then the Chairman synthesizes' },
    ],
  },
  {
    id: 'customize',
    title: 'Customization',
    icon: '✏️',
    items: [
      { label: 'Edit button', desc: 'Opens sidebar to modify your council' },
      { label: 'Click any participant', desc: 'Configure model, role, and reasoning pattern' },
      { label: 'Drag models', desc: 'Add new participants from the Models tab' },
      { label: 'Redirect connections', desc: 'Hover over a connection line, drag the endpoints to redirect flow' },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    icon: '⚡',
    items: [
      { label: 'Roles', desc: 'Assign specialized behaviors (Expert, Devil\'s Advocate, etc.)' },
      { label: 'Reasoning Patterns', desc: 'Change how AI thinks (Chain of Thought, Socratic, etc.)' },
      { label: 'Chairman', desc: 'The final synthesizer who combines all responses' },
    ],
  },
];

export default function HelpGuide({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📖</span>
              <h2 className="text-lg font-semibold text-text-primary">Quick Guide</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6 overflow-y-auto max-h-[60vh]">
            {GUIDE_SECTIONS.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{section.icon}</span>
                  <h3 className="text-sm font-semibold text-text-primary">{section.title}</h3>
                </div>
                <div className="space-y-2 pl-7">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-accent-primary text-sm">•</span>
                      <div>
                        <span className="text-sm text-text-primary font-medium">{item.label}</span>
                        <span className="text-sm text-text-secondary"> — {item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/10 bg-bg-tertiary/30">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-accent-primary text-white text-sm font-medium
                         rounded-lg hover:bg-accent-primary/90 transition-colors"
            >
              Got it!
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
