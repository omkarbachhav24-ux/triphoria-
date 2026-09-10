/**
 * Motion.dev Animation Physics & Preset Standards
 * Easing curves, spring dynamics, and gesture hooks
 */

export const motionPresets = {
  // 1. Duration Easing Presets
  instant: {
    duration: 0.12,
    ease: [0.22, 1, 0.36, 1]
  },
  fast: {
    duration: 0.18,
    ease: [0.22, 1, 0.36, 1]
  },
  standard: {
    duration: 0.25,
    ease: [0.22, 1, 0.36, 1]
  },
  gentle: {
    duration: 0.4,
    ease: [0.22, 1, 0.36, 1]
  },
  editorial: {
    duration: 0.6,
    ease: [0.16, 1, 0.3, 1]
  },

  // 2. Physics Springs
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 1
  },
  subtleSpring: {
    type: 'spring',
    stiffness: 450,
    damping: 35
  },
  playfulSpring: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
    bounce: 0.25
  },
  stiffSpring: {
    type: 'spring',
    stiffness: 600,
    damping: 40
  },

  // 3. Stagger Speeds
  stagger: {
    micro: 0.03,    // Fast lists and characters
    standard: 0.04, // Navigation and cards
    editorial: 0.06 // Initial page sections
  },

  // 4. Standard UI Interaction Hooks
  buttonGestures: {
    whileHover: { y: -1 },
    whileTap: { scale: 0.98, y: 0 },
    transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] }
  },

  cardGestures: {
    whileHover: { y: -2 },
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
  },

  // 5. Overlays (Modal & Dropdown)
  dropdownTransition: {
    initial: { opacity: 0, y: -4, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -4, scale: 0.98 },
    transition: { duration: 0.18, ease: [0, 0, 0.2, 1] }
  },

  modalTransition: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
    transition: { type: 'spring', stiffness: 450, damping: 32 }
  }
};
