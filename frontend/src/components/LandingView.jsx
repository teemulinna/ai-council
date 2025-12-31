import { motion } from 'framer-motion';
import { PRESETS } from '../utils/presets';

export default function LandingView({ onSelectPreset, onCustomBuild }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-bg-primary paper-texture">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 sm:mb-12"
      >
        <motion.div
          className="text-5xl sm:text-6xl mb-4 block"
          initial={{ scale: 0.8, rotate: -5 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          role="img"
          aria-label="Council building icon"
        >
          🏛️
        </motion.div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-3">
          Convene Your <span className="gradient-text">AI Council</span>
        </h1>
        <p className="text-sm sm:text-base text-accent-primary font-medium mb-4">
          Diverse perspectives. Synthesized wisdom.
        </p>
        <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed px-4">
          Gather multiple AI experts in one deliberation.
          Each model brings unique insights, and the chairman synthesizes
          the collective intelligence into a single, refined answer.
        </p>
      </motion.div>

      {/* Preset Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full mb-8 px-4"
        role="list"
        aria-label="Council presets"
      >
        {PRESETS.slice(0, 4).map((preset, index) => (
          <motion.button
            key={preset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            onClick={() => onSelectPreset(preset)}
            role="listitem"
            aria-label={`${preset.name} - ${preset.nodes.length} participants, estimated cost $${preset.estimatedCost.toFixed(2)}`}
            className="interactive-card group p-5 sm:p-6 bg-bg-secondary border border-white/10 rounded-2xl
                       hover:border-accent-primary/50 hover:bg-bg-tertiary
                       transition-all duration-300 text-left elevation-1
                       focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            {/* Popular badge for first preset */}
            {index === 0 && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-accent-gold text-bg-primary text-[10px] font-bold rounded-full shadow-md">
                POPULAR
              </span>
            )}

            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl sm:text-3xl">{preset.icon}</span>
              <span className="text-xs text-text-secondary bg-bg-tertiary/80 px-2.5 py-1 rounded-full font-medium">
                ~${preset.estimatedCost.toFixed(2)}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
              {preset.name}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mb-4 line-clamp-2">
              {preset.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-primary" />
                {preset.nodes.length} participants
              </span>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Custom Build Link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onCustomBuild}
        className="group flex items-center gap-2 px-4 py-2 text-sm text-text-secondary
                   hover:text-accent-primary transition-colors rounded-lg
                   hover:bg-accent-primary/5"
      >
        <span>Or build a custom council</span>
        <motion.span
          className="inline-block"
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          →
        </motion.span>
      </motion.button>

      {/* Keyboard hint */}
      <p className="mt-6 text-xs text-text-muted hide-mobile">
        Press <kbd className="px-1.5 py-0.5 bg-bg-secondary rounded text-text-secondary">Tab</kbd> to navigate,{' '}
        <kbd className="px-1.5 py-0.5 bg-bg-secondary rounded text-text-secondary">Enter</kbd> to select
      </p>
    </div>
  );
}
