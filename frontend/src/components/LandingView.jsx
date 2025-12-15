import { motion } from 'framer-motion';
import { PRESETS } from '../utils/presets';

export default function LandingView({ onSelectPreset, onCustomBuild }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-primary">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <motion.span
          className="text-6xl mb-4 block"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          🏛️
        </motion.span>
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          AI Council
        </h1>
        <p className="text-sm text-accent-primary/80 font-medium mb-4">
          Multiple minds. One answer.
        </p>
        <p className="text-base text-text-secondary max-w-md">
          Get diverse AI perspectives on any question.
          <br />
          Pick a council preset to begin.
        </p>
      </motion.div>

      {/* Preset Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full mb-8"
      >
        {PRESETS.slice(0, 4).map((preset, index) => (
          <motion.button
            key={preset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            onClick={() => onSelectPreset(preset)}
            className="group p-6 bg-bg-secondary border border-white/10 rounded-2xl
                       hover:border-accent-primary/50 hover:bg-bg-tertiary
                       transition-all duration-200 text-left"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{preset.icon}</span>
              <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded-full">
                ~${preset.estimatedCost.toFixed(2)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
              {preset.name}
            </h3>
            <p className="text-sm text-text-secondary mb-4 line-clamp-2">
              {preset.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-primary/50" />
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
        className="text-sm text-text-secondary hover:text-accent-primary transition-colors"
      >
        Or build a custom council →
      </motion.button>
    </div>
  );
}
