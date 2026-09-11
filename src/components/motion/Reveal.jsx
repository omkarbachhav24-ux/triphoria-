import React, { createContext, useContext } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionPresets } from '../../design-system/motionPresets';

/**
 * TRIPHORIA motion primitives (Level 2 — component choreography).
 * Thin wrappers over motion/react that all:
 *  - trigger once, on scroll into view
 *  - respect prefers-reduced-motion (render static, no transform)
 *  - use the shared easing/stagger constants in design-system/motionPresets
 *
 * Exports: Reveal, Stagger, StaggerItem, TextReveal, ImageReveal
 */

const VIEWPORT = { once: true, amount: 0.25, margin: '0px 0px -8% 0px' };

const DIRECTIONS = {
  up: { y: 20 },
  down: { y: -20 },
  left: { x: 24 },
  right: { x: -24 },
  none: {},
};

/** Reveal — fade + small directional rise as the element scrolls into view. */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  distance,
  as = 'div',
  className = '',
  ...rest
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as] || motion.div;
  const offset = DIRECTIONS[direction] || DIRECTIONS.up;
  const scaled =
    distance != null
      ? Object.fromEntries(
          Object.entries(offset).map(([k, v]) => [k, Math.sign(v) * distance])
        )
      : offset;

  if (reduce) {
    const Static = as;
    return (
      <Static className={className} {...rest}>
        {children}
      </Static>
    );
  }

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, ...scaled }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={VIEWPORT}
      transition={{ ...motionPresets.editorial, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

const StaggerCtx = createContext(null);

/**
 * Stagger — a container whose <StaggerItem> children reveal in sequence.
 * speed: 'micro' | 'standard' | 'editorial'
 */
export function Stagger({
  children,
  speed = 'standard',
  delay = 0,
  as = 'div',
  className = '',
  ...rest
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as] || motion.div;
  const stagger = motionPresets.stagger[speed] ?? motionPresets.stagger.standard;

  if (reduce) {
    const Static = as;
    return (
      <StaggerCtx.Provider value={{ reduce: true }}>
        <Static className={className} {...rest}>
          {children}
        </Static>
      </StaggerCtx.Provider>
    );
  }

  return (
    <StaggerCtx.Provider value={{ reduce: false }}>
      <Comp
        className={className}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: stagger, delayChildren: delay } },
        }}
        {...rest}
      >
        {children}
      </Comp>
    </StaggerCtx.Provider>
  );
}

export function StaggerItem({ children, direction = 'up', as = 'div', className = '', ...rest }) {
  const ctx = useContext(StaggerCtx);
  const Comp = motion[as] || motion.div;
  const offset = DIRECTIONS[direction] || DIRECTIONS.up;

  if (ctx?.reduce) {
    const Static = as;
    return (
      <Static className={className} {...rest}>
        {children}
      </Static>
    );
  }

  return (
    <Comp
      className={className}
      variants={{
        hidden: { opacity: 0, ...offset },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: motionPresets.gentle,
        },
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/**
 * TextReveal — reveals a headline word-by-word (mask + rise).
 * Pass a plain string. Preserves spaces; wraps naturally.
 */
export function TextReveal({ text = '', as = 'span', className = '', delay = 0, speed = 'editorial' }) {
  const reduce = useReducedMotion();
  const Tag = as;
  const words = String(text).split(' ');
  const stagger = motionPresets.stagger[speed] ?? motionPresets.stagger.editorial;

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className} style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}
        >
          <motion.span
            style={{ display: 'inline-block', willChange: 'transform' }}
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ ...motionPresets.editorial, delay: delay + i * stagger }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * ImageReveal — wipes media in with a clip-path + slow scale settle.
 * Wrap an <img>, <video>, or an AspectFrame.
 */
export function ImageReveal({ children, className = '', delay = 0, from = 'bottom' }) {
  const reduce = useReducedMotion();
  const clipFrom = {
    bottom: 'inset(100% 0 0 0)',
    top: 'inset(0 0 100% 0)',
    left: 'inset(0 100% 0 0)',
    right: 'inset(0 0 0 100%)',
  }[from] || 'inset(100% 0 0 0)';

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      style={{ willChange: 'clip-path, transform' }}
      initial={{ clipPath: clipFrom, scale: 1.06 }}
      animate={{ clipPath: 'inset(0 0 0 0)', scale: 1 }}
      transition={{ ...motionPresets.editorial, duration: 0.8, delay }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
