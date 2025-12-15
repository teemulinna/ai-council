import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboardingStore = create(
  persist(
    (set, get) => ({
      // Has the user completed onboarding?
      hasCompletedOnboarding: false,

      // Current step in the tour (null = not running)
      currentStep: null,

      // Is tour active?
      isActive: false,

      // Tour steps
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to AI Council! 👋',
          content: 'Build multi-agent AI discussions with different models and perspectives. Let me show you how it works.',
          target: null, // No target, centered modal
          placement: 'center',
        },
        {
          id: 'presets',
          title: '1️⃣ Start with a Preset',
          content: 'Click "Presets" to load a ready-made council configuration. This is the fastest way to get started!',
          target: '[data-tour="presets-tab"]',
          placement: 'right',
          action: 'click-presets',
        },
        {
          id: 'preset-select',
          title: 'Choose a Preset',
          content: 'Pick a preset that matches your needs. "Simple Discussion" is great for beginners.',
          target: '[data-tour="preset-list"]',
          placement: 'right',
        },
        {
          id: 'canvas',
          title: '2️⃣ Your Council',
          content: 'This is your AI council. Each card is a participant with a specific model and role. Click any card to configure it.',
          target: '[data-tour="canvas"]',
          placement: 'left',
        },
        {
          id: 'models',
          title: 'Add More Participants',
          content: 'Drag models from the sidebar onto the canvas to add more council members.',
          target: '[data-tour="models-tab"]',
          placement: 'right',
        },
        {
          id: 'chat',
          title: '3️⃣ Ask Your Question',
          content: 'Type your question here. The council will discuss it and provide diverse perspectives.',
          target: '[data-tour="chat-input"]',
          placement: 'top',
        },
        {
          id: 'run',
          title: 'Run the Council',
          content: 'Click this button to start the discussion. Watch as each participant responds in turn!',
          target: '[data-tour="run-button"]',
          placement: 'top',
        },
        {
          id: 'done',
          title: 'You\'re Ready! 🎉',
          content: 'That\'s it! Build your council, ask questions, and get multi-perspective AI insights. Have fun!',
          target: null,
          placement: 'center',
        },
      ],

      // Start the tour
      startTour: () => set({ isActive: true, currentStep: 0 }),

      // Go to next step
      nextStep: () => {
        const { currentStep, steps } = get();
        if (currentStep < steps.length - 1) {
          set({ currentStep: currentStep + 1 });
        } else {
          // Tour complete
          set({ isActive: false, currentStep: null, hasCompletedOnboarding: true });
        }
      },

      // Go to previous step
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      // Skip/end tour
      endTour: () => set({ isActive: false, currentStep: null, hasCompletedOnboarding: true }),

      // Reset tour (for testing or re-watching)
      resetTour: () => set({ hasCompletedOnboarding: false, isActive: false, currentStep: null }),

      // Get current step data
      getCurrentStep: () => {
        const { currentStep, steps, isActive } = get();
        if (!isActive || currentStep === null) return null;
        return steps[currentStep];
      },
    }),
    {
      name: 'council-onboarding',
      partialize: (state) => ({ hasCompletedOnboarding: state.hasCompletedOnboarding }),
    }
  )
);
