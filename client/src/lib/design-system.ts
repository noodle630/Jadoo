/**
 * S Platform Design System
 * 
 * This file establishes core design principles, tokens, and guardrails for the S platform.
 * All components should inherit from these definitions to maintain consistency.
 */

// Color System - Dark Premium Theme
export const colors = {
  // Base
  background: {
    primary: 'hsl(222, 47%, 11%)',   // Main background
    secondary: 'hsl(217, 33%, 17%)',  // Card/container backgrounds
    tertiary: 'hsl(215, 25%, 27%)',   // Hover states
    elevated: 'hsl(217, 33%, 20%)',   // Elevated components like modals
    overlay: 'hsla(222, 47%, 11%, 0.85)',  // Overlay for modals
  },
  
  // Content
  content: {
    primary: 'hsl(0, 0%, 98%)',       // Primary content (white text)
    secondary: 'hsl(214, 32%, 91%)',  // Secondary text content
    tertiary: 'hsl(215, 16%, 57%)',   // Less important text content
    muted: 'hsl(215, 16%, 47%)',      // Muted/disabled text
  },
  
  // Borders
  border: {
    subtle: 'hsl(217, 33%, 20%)',     // Subtle borders for cards
    strong: 'hsl(215, 25%, 27%)',     // More visible borders for interactive elements
    glow: 'hsla(214, 60%, 50%, 0.15)', // Border glow for focus/hover
  },
  
  // Brand
  brand: {
    primary: 'hsl(214, 89%, 52%)',    // Primary brand color (blue)
    secondary: 'hsl(214, 100%, 60%)', // Secondary brand color (lighter blue)
    ternary: 'hsl(262, 83%, 58%)',    // Accent color for gradients (purple)
  },
  
  // Status
  status: {
    success: 'hsl(145, 63%, 49%)',    // Success states (green)
    warning: 'hsl(40, 92%, 58%)',     // Warning states (yellow)
    error: 'hsl(358, 85%, 60%)',      // Error states (red)
    info: 'hsl(214, 82%, 51%)',       // Info states (blue)
    successBackground: 'hsla(145, 63%, 49%, 0.12)',
    warningBackground: 'hsla(40, 92%, 58%, 0.12)',
    errorBackground: 'hsla(358, 85%, 60%, 0.12)',
    infoBackground: 'hsla(214, 82%, 51%, 0.12)',
  },
  
  // Marketplace colors (for brand recognition)
  marketplace: {
    amazon: 'hsl(36, 100%, 59%)',
    walmart: 'hsl(199, 100%, 50%)',
    meta: 'hsl(214, 89%, 52%)',
    tiktok: 'hsl(330, 94%, 55%)',
    etsy: 'hsl(18, 86%, 54%)',
    catch: 'hsl(173, 82%, 46%)',
    reebelo: 'hsl(141, 73%, 42%)',
  }
};

// Spacing System (8px base)
export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
};

// Border Radius
export const radius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',   // Fully rounded (for circles and pills)
};

// Typography
export const typography = {
  fontFamily: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  // Colored shadows for premium feel
  blue: '0 4px 14px 0 rgba(0, 118, 255, 0.39)',
  purple: '0 4px 14px 0 rgba(128, 63, 255, 0.39)',
  success: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
  error: '0 4px 14px 0 rgba(239, 68, 68, 0.39)',
  warning: '0 4px 14px 0 rgba(245, 158, 11, 0.39)',
};

// Z-Index
export const zIndex = {
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  75: '75',
  100: '100',
  tooltip: '1000',
  modal: '1100',
  notification: '1200',
  max: '9999',
};

// Transitions
export const transitions = {
  DEFAULT: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  elastic: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  spring: '500ms cubic-bezier(0.18, 1.25, 0.4, 1)',
};

// Breakpoints (following Tailwind defaults)
export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Card/Container Styles
export const containerStyles = {
  card: {
    base: `bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden hover:bg-slate-800/80 transition-all shadow-md`,
    content: `p-4`,
    header: `px-4 py-3 border-b border-slate-800`,
    footer: `px-4 py-3 border-t border-slate-800`,
  },
  panel: {
    base: `bg-slate-900/95 border border-slate-800 rounded-lg shadow-lg`,
    content: `p-5`,
    header: `px-5 py-4 border-b border-slate-800`,
    footer: `px-5 py-4 border-t border-slate-800`,
  },
  modal: {
    overlay: `fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center`,
    content: `bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden`,
    header: `px-5 py-4 border-b border-slate-800`,
    body: `p-5 overflow-y-auto`,
    footer: `px-5 py-4 border-t border-slate-800 flex justify-end space-x-3`,
  },
};

// Loading States
export const loadingStates = {
  // Skeleton styles
  skeleton: `bg-slate-800/50 animate-pulse rounded`,
  
  // Spinners
  spinner: {
    sm: `h-4 w-4`,
    md: `h-5 w-5`,
    lg: `h-6 w-6`,
    xl: `h-8 w-8`,
  },
  
  // Loading text
  loadingText: {
    default: 'Loading...',
    processing: 'Processing...',
    analyzing: 'Analyzing...',
    transforming: 'Transforming...',
    generating: 'Generating...',
    connecting: 'Connecting...',
  },
};

// Text truncation
export const truncate = {
  line: (lines: number) => `overflow-hidden text-ellipsis ${lines === 1 ? 'whitespace-nowrap' : `line-clamp-${lines}`}`,
};

// Copy guidelines
export const copyGuidelines = {
  // Button text
  button: {
    primary: 'sentence-case, action verb, no ellipsis, max 20 chars',
    secondary: 'sentence-case, can be longer, descriptive',
    danger: 'be explicit about destructive intent',
  },
  
  // Headers
  headers: {
    title: 'Sentence case, concise, max 60 chars',
    section: 'Sentence case, descriptive, max 40 chars',
    modal: 'What the modal does, not what it is, max 30 chars',
  },
  
  // Messages
  messages: {
    success: 'Confirm what happened, be specific',
    error: 'Explain what went wrong, suggest a solution if possible',
    warning: 'Explain potential issue and how to resolve it',
    empty: 'Explain why content is missing and how to add it',
  },
  
  // AI related
  ai: {
    processing: 'Be transparent that AI is working, give estimate if possible',
    results: 'Quantify improvements made by AI (e.g., "42 descriptions enhanced")',
    humanReview: 'When human review is needed, be clear about what to check',
  },
};

// Brand guidelines
export const brandGuidelines = {
  name: {
    product: 'S',
    full: 'S Platform',
    possessive: 'S\'s',
  },
  tagline: 'AI-powered marketplace feeds',
  description: {
    short: 'Transform inventory data into marketplace-ready product feeds',
    medium: 'S transforms messy inventory data into marketplace-ready product feeds with AI',
    long: 'S is an AI-powered platform that transforms messy vendor inventory data into marketplace-ready product feeds, optimizing listings for Amazon, Walmart, and more.'
  },
  voice: {
    tone: 'Professional, confident, efficient',
    personality: 'Helpful expert that respects your time',
    avoid: 'Cutesy language, unnecessary jargon, lengthy explanations',
  },
};

export default {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  zIndex,
  transitions,
  breakpoints,
  containerStyles,
  loadingStates,
  truncate,
  copyGuidelines,
  brandGuidelines,
};