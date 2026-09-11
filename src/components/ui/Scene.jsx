import React from 'react';

/**
 * Scene — a background-scene wrapper.
 *
 * Rebinds the semantic CSS tokens (--background / --foreground / --surface /
 * --border / --primary …) for its subtree so a section can flip between
 * cream, black, deep-green, teal, lime, or dark-editorial without any
 * per-component colour overrides. See docs/TRIPHORIA-DESIGN-SYSTEM.md §Scenes
 * and the [data-scene='…'] blocks in src/index.css.
 *
 *   <Scene variant="paper" as="section" className="py-24">…</Scene>
 *
 * variant: 'black' (default, = the app shell) | 'paper' | 'pale-lime'
 *          | 'green' | 'teal' | 'lime' | 'dark-editorial'
 */
const SCENES = new Set([
  'black',
  'paper',
  'pale-lime',
  'green',
  'teal',
  'lime',
  'dark-editorial',
]);

export function Scene({
  variant = 'black',
  as: Tag = 'section',
  className = '',
  children,
  ...rest
}) {
  const scene = SCENES.has(variant) ? variant : 'black';
  return (
    <Tag
      data-scene={scene === 'black' ? undefined : scene}
      className={`scene ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Scene;
