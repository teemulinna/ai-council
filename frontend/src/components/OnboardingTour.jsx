import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '../stores/onboardingStore';

export default function OnboardingTour() {
  const isActive = useOnboardingStore((s) => s.isActive);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const steps = useOnboardingStore((s) => s.steps);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const endTour = useOnboardingStore((s) => s.endTour);

  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = isActive && currentStep !== null ? steps[currentStep] : null;

  // Calculate target element position
  const updateTargetPosition = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position based on placement
      const padding = 16;
      const tooltipWidth = 320;
      const tooltipHeight = 180;

      let top, left;

      switch (step.placement) {
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + padding;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          break;
        case 'top':
          top = rect.top - tooltipHeight - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        default:
          top = window.innerHeight / 2 - tooltipHeight / 2;
          left = window.innerWidth / 2 - tooltipWidth / 2;
      }

      // Keep tooltip in viewport
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

      setTooltipPosition({ top, left });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // Update position on step change and window resize
  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);

    // Small delay to allow DOM updates
    const timer = setTimeout(updateTargetPosition, 100);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
      clearTimeout(timer);
    };
  }, [updateTargetPosition, currentStep]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return;
      if (e.key === 'Escape') endTour();
      if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, endTour]);

  if (!isActive || !step) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const isCentered = step.placement === 'center';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          onClick={endTour}
        />
      </svg>

      {/* Spotlight ring animation */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute pointer-events-none"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        >
          <div className="absolute inset-0 rounded-xl border-2 border-accent-primary animate-pulse" />
          <div className="absolute inset-0 rounded-xl ring-4 ring-accent-primary/30" />
        </motion.div>
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-auto"
          style={
            isCentered
              ? {
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }
              : {
                  top: tooltipPosition.top,
                  left: tooltipPosition.left,
                }
          }
        >
          <div className="w-80 bg-bg-secondary border border-white/20 rounded-xl shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-bg-tertiary">
              <div
                className="h-full bg-accent-primary transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-base font-semibold text-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {step.content}
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-bg-tertiary/50 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentStep
                        ? 'bg-accent-primary'
                        : idx < currentStep
                        ? 'bg-accent-primary/50'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={prevStep}
                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary
                               transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={isLastStep ? endTour : nextStep}
                  className="px-4 py-1.5 bg-accent-primary text-white text-sm font-medium
                             rounded-lg hover:bg-accent-primary/90 transition-colors"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>

            {/* Skip button */}
            {!isLastStep && (
              <button
                onClick={endTour}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center
                           text-text-muted hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
