/**
 * Motion.dev Design System Token Specification
 * Reference: Motion documentation v13.1.0 (Observed September 2026)
 * Characteristics: Technical, editorial, minimal, precise, dark-first, high contrast, quietly playful
 */

export const motionTokens = {
  colors: {
    // 1. Core Neutral Surfaces
    bg: '#0B0C0F',             // Main dark canvas
    bgElevated: '#111214',     // Code / demo stages
    surface: '#17181B',        // Cards / controls
    surfaceHover: '#1D1E22',   // Interactive hover surfaces

    // 2. High-Contrast Typography
    text: '#F5F5F5',           // Primary body
    textStrong: '#FFFFFF',     // Large display headings & high-emphasis
    textMuted: '#A1A1A6',      // Secondary explanatory copy
    textSubtle: '#6F7075',     // Monospace metadata & tertiary labels

    // 3. Restrained Borders (Border-driven architecture, NOT shadow-driven)
    border: 'rgba(255, 255, 255, 0.10)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',

    // 4. Demonstration Color Language (Used in live examples & interactive states)
    demo: {
      blue: '#4F46E5',
      pink: '#EC4899',
      purple: '#7C3AED',
      yellow: '#FACC15',
      green: '#34D399',
      red: '#F87171'
    },

    // 5. Semantic Accent Highlights (Used sparingly)
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA'
  },

  typography: {
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontMono: '"IBM Plex Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
    
    // Type Scale with tight letter-spacing
    scale: {
      display: { size: 'clamp(3.5rem, 6vw, 5rem)', weight: 600, leading: '1.0', tracking: '-0.04em' },
      h1: { size: 'clamp(2.75rem, 5vw, 4.5rem)', weight: 600, leading: '1.02', tracking: '-0.035em' },
      h2: { size: 'clamp(1.75rem, 3vw, 2.25rem)', weight: 600, leading: '1.1', tracking: '-0.025em' },
      h3: { size: '1.5rem', weight: 600, leading: '1.2', tracking: '-0.02em' },
      h4: { size: '1.125rem', weight: 600, leading: '1.3', tracking: '-0.01em' },
      bodyLarge: { size: '1.125rem', weight: 400, leading: '1.55', tracking: '-0.01em' },
      body: { size: '1rem', weight: 400, leading: '1.65', tracking: '0' },
      small: { size: '0.875rem', weight: 400, leading: '1.5', tracking: '0' },
      nav: { size: '0.8125rem', weight: 500, leading: '1', tracking: '0' },
      metadata: { size: '0.75rem', weight: 500, leading: '1.3', tracking: '0.01em' },
      code: { size: '0.8125rem', weight: 400, leading: '1.65', tracking: '0' },
      eyebrow: { size: '0.6875rem', weight: 600, leading: '1.2', tracking: '0.06em' }
    }
  },

  radii: {
    sm: '4px',
    md: '7px',       // Buttons & inputs standard
    code: '8px',     // Code containers
    lg: '10px',      // Cards & dialogs
    xl: '14px',      // Live demo stages
    pill: '999px'    // Badges & pill indicators
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
    32: '128px'
  },

  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 12px 40px rgba(0, 0, 0, 0.25)',
    dropdown: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
  }
};
