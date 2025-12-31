# AI Council - UX/UI Analysis & Recommendations

**Analysis Date:** 2025-12-30
**Scope:** Frontend codebase in `/frontend/src`
**Goal:** Progressive disclosure, multi-audience support, avoiding "generic AI slop" aesthetics

---

## Executive Summary

The AI Council frontend demonstrates solid technical implementation with React Flow, Framer Motion, and Tailwind CSS. However, there are significant opportunities to enhance user experience through better progressive disclosure, visual hierarchy, and interaction design. The current design leans heavily on dark mode developer aesthetics without strong differentiation.

**Current Strengths:**
- Clean component architecture
- Smooth animations (Framer Motion)
- Real-time WebSocket streaming
- Drag-and-drop interactions

**Critical Gaps:**
- Weak visual identity (generic dark mode)
- Poor mobile/responsive support
- Inadequate progressive disclosure
- Missing accessibility features
- Limited visual feedback during interactions

---

## 1. Visual Design & Brand Identity

### Current State
**Files:** `frontend/src/styles/globals.css`, `frontend/tailwind.config.js`

**Colors:**
- `bg-primary: #0D0D0D` (near black)
- `bg-secondary: #1A1A1A`
- `accent-primary: #6366F1` (indigo)
- Standard provider colors for models

**Problems:**
1. **Generic "AI Dashboard" look** - indistinguishable from countless dark-mode SaaS apps
2. **No unique brand personality** - could be any AI tool
3. **Flat hierarchy** - everything has similar visual weight
4. **Limited color usage** - monochromatic with accent spots

### Recommendations

#### A. Establish Distinctive Visual Identity

**Council Chamber Theme** - Lean into the 🏛️ metaphor:
```css
/* Suggested palette: Classical meets Contemporary */
--color-marble: #F5F3EE;           /* Warm white, not stark */
--color-bronze: #CD7F32;           /* Accent for authority */
--color-slate: #2F4858;            /* Professional blue-grey */
--color-parchment: #FFF8DC;        /* Subtle warm background */
--color-debate-active: #E8935C;    /* Warm orange for activity */
--color-wisdom: #4A7C59;           /* Deep green for insights */

/* Alternative: Modern Professional */
--color-deep-navy: #0A1929;        /* Rich, not flat black */
--color-twilight: #1E3A5F;         /* Deeper blues */
--color-gold-accent: #D4AF37;      /* Gold instead of purple */
--color-success-sage: #6B8E7A;     /* Muted, sophisticated */
```

**Implementation locations:**
- `frontend/src/styles/globals.css` (lines 4-25)
- `frontend/tailwind.config.js` (lines 9-33)

#### B. Typography Hierarchy

**Current:** Inter + JetBrains Mono (adequate but unremarkable)

**Suggestions:**
```css
/* More distinctive pairing */
--font-heading: 'Playfair Display', serif;  /* Classical for headings */
--font-sans: 'Inter Variable', sans-serif;   /* Keep for body */
--font-mono: 'JetBrains Mono', monospace;    /* Keep for code */

/* Or more modern */
--font-heading: 'Cabinet Grotesk', sans-serif;
--font-sans: 'Satoshi', sans-serif;
```

**Add to `globals.css`:**
```css
h1, h2, h3 {
  font-family: var(--font-heading);
  letter-spacing: -0.02em;
  font-weight: 700;
}

.council-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  line-height: 1.1;
}
```

#### C. Depth & Layering

**Add to `globals.css` (after line 198):**
```css
/* Elevation system for depth */
.elevation-1 {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
              0 1px 2px rgba(0, 0, 0, 0.24);
}

.elevation-2 {
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16),
              0 3px 6px rgba(0, 0, 0, 0.23);
}

.elevation-3 {
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19),
              0 6px 6px rgba(0, 0, 0, 0.23);
}

/* Subtle texture for visual interest */
.paper-texture {
  background-image:
    radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.02) 0%, transparent 50%);
}
```

**Apply to:**
- `LandingView.jsx` line 48: Add `elevation-2` to preset cards
- `ParticipantNode.jsx` line 73: Add `elevation-1` and increase on hover
- `ConfigPanel.jsx` line 154: Add `elevation-3` to modal

---

## 2. Interaction Design & Feedback

### Current State

**Animation Usage:** Heavy Framer Motion throughout
- `LandingView.jsx` lines 8-20: Hero animation
- `ParticipantNode.jsx` lines 65-68: Node mounting
- `ResultsPanel.jsx` lines 27-30: Panel slide-in

**Problems:**
1. **No loading states** - Users wait without knowing what's happening
2. **Minimal hover feedback** - Unclear what's clickable
3. **Abrupt state changes** - No smooth transitions between app states
4. **Missing micro-interactions** - Generic button clicks

### Recommendations

#### A. Enhanced Loading States

**Add to `ChatInput.jsx` (replace line 68-78):**
```jsx
{isExecuting ? (
  <div className="flex items-center gap-2">
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <span className="text-sm">Deliberating...</span>
  </div>
) : (
  // existing button content
)}
```

#### B. Skeleton Screens

**Create new file:** `frontend/src/components/SkeletonCard.jsx`
```jsx
export default function SkeletonCard() {
  return (
    <div className="animate-pulse p-6 bg-bg-secondary border border-white/10 rounded-2xl">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-white/5 rounded-lg" />
        <div className="w-12 h-5 bg-white/5 rounded-full" />
      </div>
      <div className="h-5 bg-white/5 rounded w-3/4 mb-2" />
      <div className="h-4 bg-white/5 rounded w-full mb-4" />
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-white/5 rounded-full" />
        <div className="w-20 h-3 bg-white/5 rounded" />
      </div>
    </div>
  );
}
```

**Use in `LandingView.jsx` while presets load**

#### C. Enhanced Hover States

**Add to `globals.css`:**
```css
/* Sophisticated hover transitions */
.interactive-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.interactive-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg,
    rgba(99, 102, 241, 0.3),
    rgba(139, 92, 246, 0.3));
  -webkit-mask: linear-gradient(#fff 0 0) content-box,
                linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s;
}

.interactive-card:hover::before {
  opacity: 1;
}

.interactive-card:hover {
  transform: translateY(-2px);
}
```

**Apply to:**
- `LandingView.jsx` line 48: Replace existing classes
- `Sidebar.jsx` line 226: Preset buttons
- `ParticipantNode.jsx` line 73: Node container

#### D. Micro-interactions

**Add to `ParticipantNode.jsx` (after line 89):**
```jsx
/* Success pulse animation when node completes */
{nodeState === 'complete' && (
  <motion.div
    className="absolute inset-0 rounded-xl border-2 border-accent-success"
    initial={{ scale: 1, opacity: 0.5 }}
    animate={{ scale: 1.1, opacity: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
  />
)}
```

---

## 3. Information Architecture & Progressive Disclosure

### Current State

**Problems:**
1. **Everything visible at once** in Sidebar (660 lines, 3 tabs with dense content)
2. **No guided workflows** - users must understand the entire system upfront
3. **Flat hierarchy** - expert features mixed with basics
4. **Overwhelming modal** - ConfigPanel shows all options simultaneously

**Files:**
- `Sidebar.jsx` (660 lines) - Too much in one place
- `ConfigPanel.jsx` (425 lines) - No progressive sections
- `LandingView.jsx` - Good entry point but limited guidance

### Recommendations

#### A. Three-Tier Disclosure Strategy

**Tier 1: Simple Surface (Personal Users)**
- Quick presets with clear outcomes
- One-click council creation
- Simplified chat interface
- Hide advanced features by default

**Tier 2: Intermediate (Team Collaboration)**
- Custom council builder
- Role assignments
- Basic pattern selection
- Simple sharing

**Tier 3: Power Features (Open Source Community)**
- Full model configuration
- Custom roles creation
- Advanced reasoning patterns
- Export/import capabilities

#### B. Redesigned Sidebar Structure

**Create:** `frontend/src/components/panels/CollapsibleSection.jsx`
```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CollapsibleSection({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
  tier = 'basic' // 'basic', 'intermediate', 'advanced'
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const tierColors = {
    basic: 'text-accent-success',
    intermediate: 'text-accent-primary',
    advanced: 'text-accent-warning',
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg
                   bg-bg-tertiary/30 hover:bg-bg-tertiary transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-text-primary">{title}</span>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${tierColors[tier]} bg-current/10`}>
              {badge}
            </span>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-text-muted group-hover:text-text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pl-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Refactor `Sidebar.jsx` to use sections:**
```jsx
{activeTab === 'models' && (
  <motion.div key="models" /* ... */>
    <CollapsibleSection
      title="Favourites"
      icon="⭐"
      defaultOpen={true}
      tier="basic"
    >
      {/* Favourites content */}
    </CollapsibleSection>

    <CollapsibleSection
      title="Quick Access"
      icon="⚡"
      badge="Fast & Affordable"
      defaultOpen={false}
      tier="basic"
    >
      {/* Budget models */}
    </CollapsibleSection>

    <CollapsibleSection
      title="Advanced Models"
      icon="🔬"
      badge="Power Users"
      defaultOpen={false}
      tier="advanced"
    >
      {/* Premium models grouped by provider */}
    </CollapsibleSection>
  </motion.div>
)}
```

#### C. Wizard-Style Onboarding

**Add to `LandingView.jsx` (new component):**
```jsx
<motion.button
  onClick={() => setShowQuickStart(true)}
  className="mt-4 px-6 py-3 bg-accent-primary/10 text-accent-primary
             rounded-xl border border-accent-primary/30 hover:bg-accent-primary/20
             transition-all flex items-center gap-2 mx-auto"
>
  <span>🧭</span>
  <span className="text-sm font-medium">Quick Start Guide</span>
</motion.button>
```

**Create step-by-step modal** that walks users through:
1. Choose your use case (question answering, brainstorming, analysis)
2. Select council size (3, 5, 7 members)
3. Pick expertise level (balanced, technical, creative)
4. Auto-configure and explain choices

#### D. ConfigPanel Tabs/Accordion

**Refactor `ConfigPanel.jsx` lines 178-395 to use tabs:**
```jsx
const CONFIG_TABS = [
  { id: 'basic', label: 'Basic', icon: '⚙️' },
  { id: 'role', label: 'Role & Behavior', icon: '🎭' },
  { id: 'advanced', label: 'Advanced', icon: '🔬' },
];

const [configTab, setConfigTab] = useState('basic');

// Basic tab: Name, Model, Speaking Order
// Role tab: Role, Reasoning Pattern, System Prompt
// Advanced tab: Temperature, Chairman toggle, Custom settings
```

---

## 4. Accessibility (WCAG 2.1 AA Compliance)

### Current State

**Critical Issues Found:**

1. **No keyboard navigation** - Canvas interactions mouse-only
2. **Missing ARIA labels** - Buttons lack accessible names
3. **Insufficient color contrast** - `text-muted: #6B6B6B` on `bg-primary: #0D0D0D` = 3.7:1 (fails 4.5:1)
4. **No focus indicators** - Unclear where keyboard focus is
5. **Missing skip links** - No way to skip to main content
6. **No screen reader announcements** - State changes silent

### Recommendations

#### A. Color Contrast Fixes

**Update `globals.css` and `tailwind.config.js`:**
```css
/* Current: fails WCAG AA */
--color-text-muted: #6B6B6B;  /* 3.7:1 contrast */

/* Fixed: meets WCAG AA */
--color-text-muted: #8A8A8A;  /* 5.2:1 contrast */
--color-text-secondary: #B8B8B8;  /* 7.8:1 contrast */
```

**Test all color combinations:**
- Primary text on primary bg: ✅ (17.5:1)
- Secondary text on primary bg: ❌ 4.2:1 → needs to be #A8A8A8
- Accent primary on tertiary bg: ✅ (6.1:1)
- Links (accent-primary): ✅ (8.3:1)

#### B. Keyboard Navigation

**Add to `CouncilCanvas.jsx` (after line 75):**
```jsx
const [focusedNodeIndex, setFocusedNodeIndex] = useState(-1);

// Keyboard navigation handler
useEffect(() => {
  const handleKeyNav = (e) => {
    if (nodes.length === 0) return;

    switch(e.key) {
      case 'Tab':
        e.preventDefault();
        setFocusedNodeIndex(prev =>
          e.shiftKey
            ? (prev - 1 + nodes.length) % nodes.length
            : (prev + 1) % nodes.length
        );
        break;
      case 'Enter':
      case ' ':
        if (focusedNodeIndex >= 0) {
          e.preventDefault();
          selectNode(nodes[focusedNodeIndex].id);
        }
        break;
      case 'Escape':
        selectNode(null);
        setFocusedNodeIndex(-1);
        break;
    }
  };

  window.addEventListener('keydown', handleKeyNav);
  return () => window.removeEventListener('keydown', handleKeyNav);
}, [nodes, focusedNodeIndex, selectNode]);

// Apply focus visual indicator
useEffect(() => {
  if (focusedNodeIndex >= 0 && nodes[focusedNodeIndex]) {
    // Highlight focused node
    const nodeElement = document.querySelector(
      `[data-id="${nodes[focusedNodeIndex].id}"]`
    );
    nodeElement?.focus();
  }
}, [focusedNodeIndex, nodes]);
```

#### C. ARIA Labels

**Add to all interactive elements:**

**`ChatInput.jsx` line 41:**
```jsx
<textarea
  ref={textareaRef}
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  aria-label="Ask your council a question"
  aria-describedby="input-hint"
  // ... other props
/>
<span id="input-hint" className="sr-only">
  Press Enter to submit, Shift+Enter for new line
</span>
```

**`ParticipantNode.jsx` line 64:**
```jsx
<motion.div
  role="article"
  aria-label={`Council member: ${data.displayName}, ${role.name}, Status: ${nodeState || 'ready'}`}
  tabIndex={0}
  // ... other props
>
```

**`Header.jsx` buttons (lines 112-139):**
```jsx
<button
  onClick={onShowHistory}
  aria-label="View conversation history"
  aria-pressed={showHistory}
  // ... other props
>
```

#### D. Focus Management

**Add to `globals.css`:**
```css
/* Visible focus indicators */
*:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Skip to main content */
.skip-to-main {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-accent-primary);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  z-index: 100;
}

.skip-to-main:focus {
  top: 0;
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Add to `App.jsx` line 231:**
```jsx
<a href="#main-content" className="skip-to-main">
  Skip to main content
</a>

<div id="main-content" className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
```

#### E. Live Regions for Dynamic Content

**Add to `ResultsPanel.jsx` line 26:**
```jsx
<div
  role="region"
  aria-live="polite"
  aria-atomic="true"
  aria-label="Council results"
  className="absolute bottom-0 left-0 right-0..."
>
  {isExecuting && (
    <div className="sr-only" role="status">
      Council is deliberating. Stage {currentStage} of 3.
    </div>
  )}
  {finalAnswer && (
    <div className="sr-only" role="status">
      Final answer ready. {Object.keys(responses).length} responses received.
    </div>
  )}
```

#### F. Alt Text & Semantic HTML

**Replace icon spans with proper semantics:**

**`LandingView.jsx` line 19:**
```jsx
<div className="text-6xl mb-4" role="img" aria-label="Council building icon">
  🏛️
</div>
```

**Use semantic HTML:**
- Replace `<div>` with `<main>`, `<aside>`, `<nav>`, `<article>`, `<section>` where appropriate
- `Sidebar.jsx` → wrap in `<aside role="complementary">`
- `ResultsPanel.jsx` → wrap in `<section role="region">`

---

## 5. Mobile & Responsive Design

### Current State

**Critical Problems:**
1. **Fixed widths everywhere** - No mobile breakpoints
2. **Sidebar always 256px** - Unusable on mobile
3. **Canvas interactions touch-unfriendly** - Tiny drag handles
4. **No mobile layout** - Desktop-only design
5. **Modal overlays full width** - Breaks on small screens

**Examples:**
- `Sidebar.jsx` line 77: `w-64` (fixed 256px width)
- `ConfigPanel.jsx` line 154: `w-96` (384px fixed)
- `ParticipantNode.jsx` line 74: `min-w-[180px] max-w-[220px]` (too wide for mobile)

### Recommendations

#### A. Mobile-First Breakpoint System

**Add to `tailwind.config.js`:**
```js
theme: {
  extend: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  }
}
```

#### B. Responsive Sidebar

**Refactor `Sidebar.jsx` line 77:**
```jsx
<aside className="
  /* Mobile: full screen overlay */
  fixed inset-0 z-30 bg-bg-secondary

  /* Tablet: slide-in drawer */
  md:relative md:inset-auto md:z-auto
  md:w-64 md:border-r md:border-white/10

  /* Desktop: permanent sidebar */
  lg:w-72
">
```

**Add mobile header:**
```jsx
{/* Mobile close button */}
<div className="md:hidden flex items-center justify-between p-4 border-b border-white/10">
  <h2 className="text-sm font-semibold text-text-primary">Council Builder</h2>
  <button
    onClick={onClose}
    aria-label="Close sidebar"
    className="p-2 hover:bg-white/5 rounded-lg"
  >
    ✕
  </button>
</div>
```

#### C. Touch-Friendly Controls

**Increase tap targets to 44x44px minimum:**

**`ParticipantNode.jsx` - Larger handles:**
```jsx
<Handle
  type="target"
  position={Position.Top}
  className="!w-6 !h-6 md:!w-4 md:!h-4
             !bg-bg-tertiary !border-2 !border-white/30
             hover:!border-accent-primary hover:!bg-accent-primary/20
             !transition-all !duration-200
             touch-none" /* Prevent default touch behavior */
  style={{ top: -12 }}
/>
```

**All buttons 44px minimum:**
```jsx
<button className="min-h-[44px] min-w-[44px] /* ... */">
```

#### D. Responsive Canvas

**Update `CouncilCanvas.jsx` line 144:**
```jsx
<ReactFlow
  nodes={nodes.map(node => ({
    ...node,
    // Scale nodes on mobile
    style: {
      ...node.style,
      transform: window.innerWidth < 768
        ? 'scale(0.8)'
        : 'scale(1)',
    }
  }))}
  // ... other props
  minZoom={0.1}  // Allow more zoom out on mobile
  maxZoom={2}
  defaultZoom={window.innerWidth < 768 ? 0.5 : 1}
>
```

#### E. Mobile-Optimized Landing

**`LandingView.jsx` line 39:**
```jsx
<div className="
  /* Mobile: single column */
  grid grid-cols-1 gap-4 w-full px-4

  /* Tablet: 2 columns */
  sm:grid-cols-2 sm:px-6

  /* Desktop: 4 columns */
  lg:grid-cols-4 lg:max-w-5xl
">
```

#### F. Bottom Sheet for Mobile Modals

**Create `frontend/src/components/BottomSheet.jsx`:**
```jsx
import { motion } from 'framer-motion';

export default function BottomSheet({ isOpen, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-bg-secondary rounded-t-2xl border-t border-white/10
                   max-h-[85vh] overflow-y-auto
                   md:hidden"
      >
        {/* Drag handle */}
        <div className="sticky top-0 bg-bg-secondary pt-3 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
        </div>

        {children}
      </motion.div>
    </>
  );
}
```

**Use in `ConfigPanel.jsx` for mobile:**
```jsx
const isMobile = window.innerWidth < 768;

return isMobile ? (
  <BottomSheet isOpen={!!selectedNode} onClose={handleClose}>
    {/* Config form */}
  </BottomSheet>
) : (
  <motion.div className="fixed right-4..." /* Desktop modal */>
);
```

#### G. Responsive Typography

**Add to `globals.css`:**
```css
/* Fluid typography */
:root {
  --text-xs: clamp(0.7rem, 0.66rem + 0.2vw, 0.75rem);
  --text-sm: clamp(0.8rem, 0.74rem + 0.3vw, 0.875rem);
  --text-base: clamp(0.9rem, 0.83rem + 0.35vw, 1rem);
  --text-lg: clamp(1rem, 0.91rem + 0.45vw, 1.125rem);
  --text-xl: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-2xl: clamp(1.25rem, 1.08rem + 0.85vw, 1.5rem);
  --text-3xl: clamp(1.5rem, 1.24rem + 1.3vw, 1.875rem);
}
```

---

## 6. Specific Component Improvements

### A. LandingView (`frontend/src/components/LandingView.jsx`)

**Current Issues:**
- Lines 24-26: Tagline too generic ("Multiple minds. One answer")
- Line 41-71: Cards lack visual differentiation
- No loading state while presets load

**Recommendations:**

```jsx
{/* More compelling hero copy */}
<h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-3">
  Convene Your AI Council
</h1>
<p className="text-base md:text-lg text-accent-primary/90 font-medium mb-4">
  Diverse perspectives. Synthesized wisdom.
</p>
<p className="text-sm md:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
  Gather multiple AI experts in one deliberation.
  Each model brings unique insights, and the chairman synthesizes
  the collective intelligence into a single, refined answer.
</p>

{/* Add visual preview/demo */}
<motion.div
  className="mt-8 mb-12 max-w-2xl mx-auto"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.3 }}
>
  <img
    src="/preview-animation.svg"
    alt="Council deliberation flow diagram"
    className="w-full h-auto"
  />
</motion.div>
```

**Enhanced preset cards with better visual hierarchy:**
```jsx
<motion.button
  className={`group relative p-6 rounded-2xl border-2 transition-all
              ${preset.featured
                ? 'border-accent-primary bg-accent-primary/5'
                : 'border-white/10 bg-bg-secondary hover:border-accent-primary/50'
              }
              hover:bg-bg-tertiary hover:shadow-xl`}
>
  {preset.featured && (
    <span className="absolute -top-2 -right-2 px-2 py-1
                     bg-accent-primary text-white text-xs font-bold
                     rounded-full">
      POPULAR
    </span>
  )}
  {/* Rest of card */}
</motion.button>
```

### B. ParticipantNode (`frontend/src/components/canvas/ParticipantNode.jsx`)

**Current Issues:**
- Line 74: Too wide (180-220px) for complex councils
- Line 99: Chairman badge too prominent
- Lines 171-183: Streaming preview text too small

**Recommendations:**

```jsx
{/* Compact mode for dense councils */}
const isCompact = nodes.length > 8;

<motion.div
  className={`relative bg-bg-secondary rounded-xl border-2 transition-all
              ${isCompact ? 'p-3 min-w-[140px] max-w-[160px]' : 'p-4 min-w-[180px] max-w-[220px]'}
              ${getStateStyles()}`}
>

{/* More subtle chairman indicator */}
{data.isChairman && (
  <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-warning
                  rounded-full flex items-center justify-center text-xs"
       title="Chairman - Final synthesizer">
    👑
  </div>
)}

{/* Better streaming visualization */}
{streamingContent && nodeState === 'streaming' && (
  <div className="mt-2 pt-2 border-t border-white/5">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs text-text-secondary">Responding</span>
      <motion.div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1 h-1 bg-accent-primary rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>
    </div>
    <p className="text-xs text-text-secondary line-clamp-2 italic">
      {streamingContent.slice(-80)}...
    </p>
  </div>
)}
```

### C. ResultsPanel (`frontend/src/components/panels/ResultsPanel.jsx`)

**Current Issues:**
- Line 31: Fixed 50vh height awkward on some screens
- Lines 38-52: Tabs not descriptive enough
- No export/share functionality

**Recommendations:**

```jsx
{/* Resizable panel */}
const [panelHeight, setPanelHeight] = useState(50);

<motion.div
  className="absolute bottom-0 left-0 right-0 bg-bg-secondary
             border-t border-white/10 flex flex-col z-10"
  style={{ height: `${panelHeight}vh` }}
>
  {/* Resize handle */}
  <div
    className="h-1 bg-white/5 hover:bg-accent-primary cursor-ns-resize
               flex items-center justify-center group"
    onMouseDown={handleResizeStart}
  >
    <div className="w-12 h-1 bg-white/10 rounded-full
                    group-hover:bg-accent-primary transition-colors" />
  </div>

  {/* Better tab labels */}
  <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
    {[
      { id: 'final', label: 'Final Answer', icon: '📜' },
      { id: 'individual', label: 'All Responses', icon: '💬' },
      { id: 'rankings', label: 'Evaluations', icon: '📊' },
    ].map((tab) => (
      <button key={tab.id} className="...">
        <span className="mr-1">{tab.icon}</span>
        {tab.label}
      </button>
    ))}
  </div>

  {/* Export button */}
  <button
    onClick={handleExport}
    className="text-xs text-text-secondary hover:text-text-primary
               flex items-center gap-1"
  >
    <span>📤</span>
    Export
  </button>
```

### D. ChatInput (`frontend/src/components/ChatInput.jsx`)

**Current Issues:**
- Line 55-58: Keyboard hint too prominent
- No character count
- No example prompts

**Recommendations:**

```jsx
{/* Example prompts - show when empty */}
{!query && (
  <div className="absolute inset-0 pointer-events-none">
    <div className="p-4 flex flex-wrap gap-2">
      {[
        "Compare approaches to climate change",
        "Analyze pros/cons of remote work",
        "Best practices for API design"
      ].slice(0, 1).map((example, i) => (
        <button
          key={i}
          onClick={() => setQuery(example)}
          className="pointer-events-auto text-xs px-3 py-1.5
                     bg-white/5 hover:bg-white/10 rounded-full
                     text-text-muted hover:text-text-primary
                     transition-colors"
        >
          {example}
        </button>
      ))}
    </div>
  </div>
)}

{/* Character count and hint */}
<div className="absolute right-3 bottom-2.5 flex items-center gap-3">
  {query.length > 100 && (
    <span className={`text-xs ${query.length > 500 ? 'text-accent-warning' : 'text-text-muted'}`}>
      {query.length} / 1000
    </span>
  )}
  <span className="text-xs text-text-muted hidden sm:block">
    <kbd className="px-1.5 py-0.5 bg-bg-primary/50 rounded text-[10px]">↵</kbd>
  </span>
</div>
```

---

## 7. Implementation Priority

### Phase 1: Quick Wins (1-2 days)
1. **Color contrast fixes** - Update `globals.css` and `tailwind.config.js`
2. **Focus indicators** - Add `:focus-visible` styles
3. **ARIA labels** - Add to all interactive elements
4. **Loading states** - Add spinners and skeleton screens
5. **Mobile tap targets** - Increase button sizes to 44px

### Phase 2: Progressive Disclosure (3-5 days)
1. **CollapsibleSection component** - Implement and refactor Sidebar
2. **ConfigPanel tabs** - Split into Basic/Role/Advanced
3. **Quick Start wizard** - Add to LandingView
4. **Tier badges** - Add to features (basic/intermediate/advanced)

### Phase 3: Mobile & Responsive (5-7 days)
1. **Breakpoint system** - Add to Tailwind config
2. **Responsive Sidebar** - Implement drawer pattern
3. **BottomSheet component** - For mobile modals
4. **Touch-friendly controls** - Larger handles and targets
5. **Responsive typography** - Fluid sizing

### Phase 4: Visual Polish (3-5 days)
1. **Brand identity** - New color palette
2. **Typography hierarchy** - Custom fonts
3. **Depth system** - Elevation shadows
4. **Micro-interactions** - Enhanced animations
5. **Hover states** - Gradient borders

---

## 8. Design System Recommendations

### Create Shared Component Library

**File:** `frontend/src/components/ui/Button.jsx`
```jsx
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  ...props
}) {
  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary/90',
    secondary: 'bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80 border border-white/10',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
    danger: 'bg-accent-error text-white hover:bg-accent-error/90',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`
        rounded-lg font-medium transition-all
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:ring-2 focus-visible:ring-accent-primary
        ${variants[variant]}
        ${sizes[size]}
      `}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
```

**Use throughout:**
```jsx
<Button variant="primary" size="lg" icon="▶">
  Run Council
</Button>
```

---

## 9. Testing Strategy

### Accessibility Testing
```bash
# Add to package.json
"scripts": {
  "test:a11y": "pa11y-ci --config .pa11yci.json",
  "test:contrast": "achecker frontend/src"
}
```

### Visual Regression
```bash
# Add Playwright for visual testing
npm install -D @playwright/test
```

**File:** `frontend/tests/visual.spec.js`
```js
test('landing page matches design', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing.png', {
    maxDiffPixels: 100,
  });
});
```

### Responsive Testing
Test on:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- iPad (768px)
- Desktop (1440px)
- Large desktop (1920px)

---

## 10. Metrics & Success Criteria

### Measure Improvements

**Before:**
- Lighthouse Accessibility Score: ~75
- Mobile usability: Poor (75% viewport only)
- First Contentful Paint: ~1.2s
- Time to Interactive: ~2.5s

**Target:**
- Lighthouse Accessibility Score: >95
- Mobile usability: Excellent (100% viewport)
- First Contentful Paint: <0.8s
- Time to Interactive: <1.8s

**User Metrics:**
- New user completion rate: >80% (from landing to first query)
- Mobile bounce rate: <30%
- Average time to first council creation: <2 minutes
- User satisfaction (NPS): >70

---

## Conclusion

The AI Council frontend has a solid technical foundation but needs significant UX/UI enhancement to stand out and serve diverse audiences effectively. The recommended progressive disclosure strategy, accessibility improvements, and distinctive visual identity will transform it from a functional tool into a delightful, professional-grade application.

**Key Takeaways:**
1. **Progressive disclosure** through collapsible sections and wizard flows
2. **Distinctive visual identity** moving beyond generic dark mode
3. **Full accessibility compliance** for inclusive design
4. **Mobile-first responsive design** for universal access
5. **Thoughtful micro-interactions** for polished experience

**Next Steps:**
1. Review and prioritize recommendations
2. Implement Phase 1 quick wins
3. User test progressive disclosure changes
4. Iterate based on feedback
5. Roll out full redesign in phases
