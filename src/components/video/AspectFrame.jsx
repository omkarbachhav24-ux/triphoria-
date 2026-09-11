import React from 'react';

/**
 * AspectFrame — locks its child to a fixed aspect ratio and clips it.
 * The redesign treats vertical 9:16 as the primary format, so ratios are
 * first-class rather than everything-forced-to-16:9.
 *
 *   <AspectFrame ratio="9:16"><img … /></AspectFrame>
 *
 * ratio: '9:16' | '4:5' | '1:1' | '16:9' | '2.39:1' | any CSS aspect-ratio string
 * radius: 'media' (default, ~6px) | 'sharp' (~2px) | 'none'
 * frame:  true (default) draws a hairline border | false = bare
 */
const RATIOS = {
  '9:16': '9 / 16',
  '4:5': '4 / 5',
  '1:1': '1 / 1',
  '16:9': '16 / 9',
  '2.39:1': '2.39 / 1',
  '2.35:1': '2.35 / 1',
  '21:9': '21 / 9',
};

const RADII = {
  media: 'var(--radius-media)',
  sharp: 'var(--radius-editorial)',
  panel: 'var(--radius-panel)',
  none: '0',
};

export function AspectFrame({
  ratio = '16:9',
  radius = 'media',
  frame = true,
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <div
      className={`relative overflow-hidden bg-black ${className}`.trim()}
      style={{
        aspectRatio: RATIOS[ratio] || ratio,
        borderRadius: RADII[radius] ?? RADII.media,
        border: frame ? '1px solid var(--border)' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export const ASPECT_OPTIONS = ['9:16', '4:5', '1:1', '16:9'];

export default AspectFrame;
