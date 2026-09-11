import React, { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { AspectFrame } from './AspectFrame';
import { motionPresets } from '../../design-system/motionPresets';

/**
 * VideoCard — media-first card used across the public site, the Video Library,
 * customer/editor project views, and output-version galleries.
 *
 * It shows a poster and, on hover, a short muted loop preview ONLY when a
 * directly-playable file URL is supplied (no iframe autoplay in a grid — see
 * brief §44). Clicking calls onOpen() so the caller can mount a <VideoModal>.
 *
 * No metadata is fabricated: a field is rendered only if it is passed in.
 *
 * Props (all optional except title):
 *   title, creator, category, platform
 *   poster        image URL for the still
 *   previewSrc    direct .mp4/.webm URL for the hover loop (skip for YT/Vimeo/IG)
 *   ratio         '9:16' | '4:5' | '1:1' | '16:9'  (default '9:16')
 *   duration      e.g. '0:42' — only if real
 *   version       e.g. 'V2'
 *   status        order/lifecycle status string -> coloured dot + label
 *   featured      boolean -> FEATURED tag
 *   badge         freeform short string (e.g. 'REEL')
 *   href / onOpen navigation
 */

const STATUS_TONE = {
  'Pending Approval': 'var(--warning)',
  'In Progress': 'var(--primary)',
  Review: 'var(--secondary)',
  'Revision Requested': 'var(--secondary)',
  Completed: 'var(--success)',
  Rejected: 'var(--error)',
  Published: 'var(--success)',
  Draft: 'var(--foreground-subtle)',
};

export function VideoCard({
  title,
  creator,
  category,
  platform,
  poster,
  previewSrc,
  ratio = '9:16',
  duration,
  version,
  status,
  featured = false,
  badge,
  href,
  onOpen,
  className = '',
}) {
  const reduce = useReducedMotion();
  const videoRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const canPreview = Boolean(previewSrc) && !reduce;

  const enter = () => {
    setHovering(true);
    if (canPreview && videoRef.current) {
      videoRef.current.currentTime = 0;
      const p = videoRef.current.play();
      if (p && p.catch) p.catch(() => {});
    }
  };
  const leave = () => {
    setHovering(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const Wrapper = href ? 'a' : 'button';
  const wrapperProps = href
    ? { href }
    : { type: 'button', onClick: onOpen };

  const tone = status ? STATUS_TONE[status] || 'var(--foreground-subtle)' : null;

  return (
    <motion.div
      className={`group text-left ${className}`.trim()}
      whileHover={reduce ? undefined : motionPresets.cardGestures.whileHover}
      transition={motionPresets.cardGestures.transition}
    >
      <Wrapper
        {...wrapperProps}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
        className="block w-full u-focus"
        aria-label={title ? `Open ${title}` : 'Open video'}
      >
        <AspectFrame ratio={ratio} radius="media" className="w-full">
          {/* still */}
          {poster ? (
            <img
              src={poster}
              alt={title || ''}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-end bg-[var(--surface-alt)] p-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--foreground-subtle)]">
                {badge || category || 'Video'}
              </span>
            </div>
          )}

          {/* hover loop */}
          {canPreview && (
            <video
              ref={videoRef}
              src={previewSrc}
              poster={poster}
              muted
              loop
              playsInline
              preload="none"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                hovering ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* gradient + controls */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {featured && <span className="u-tag u-tag-solid">Featured</span>}
            {badge && <span className="u-tag bg-black/45 !text-white !border-white/25">{badge}</span>}
          </div>

          <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
            <Play size={14} className="translate-x-[1px] fill-current" />
          </span>

          <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {title && (
                <div className="truncate text-[13px] font-semibold text-white drop-shadow">
                  {title}
                </div>
              )}
              {creator && (
                <div className="truncate font-mono text-[11px] text-white/70">{creator}</div>
              )}
            </div>
            {duration && (
              <span className="shrink-0 rounded-[var(--radius-editorial)] bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {duration}
              </span>
            )}
          </div>
        </AspectFrame>
      </Wrapper>

      {/* meta strip below the frame */}
      {(platform || category || version || status) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[var(--foreground-subtle)]">
          {status && (
            <span className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
              {status}
            </span>
          )}
          {version && <span className="text-[var(--foreground-muted)]">{version}</span>}
          {platform && <span>{platform}</span>}
          {category && <span className="uppercase tracking-wider">{category}</span>}
        </div>
      )}
    </motion.div>
  );
}

export default VideoCard;
