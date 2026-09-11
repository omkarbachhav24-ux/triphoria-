import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { AspectFrame } from './AspectFrame';
import { VideoPlayer } from '../common/VideoPlayer';
import { motionPresets } from '../../design-system/motionPresets';

/**
 * VideoModal — full-attention player overlay. Wraps the existing VideoPlayer
 * engine (YouTube / Vimeo / Instagram / Google Drive / direct MP4) inside a
 * ratio-locked frame so vertical reels are shown at their true shape.
 *
 *   <VideoModal open={!!v} onClose={…} src={v?.playbackUrl} socialUrl={v?.socialUrl}
 *              ratio={v?.aspectRatio} title={v?.title} eyebrow="Selected work" />
 */
export function VideoModal({
  open,
  onClose,
  src = '',
  socialUrl = '',
  socialProvider = 'none',
  poster = '',
  title = '',
  eyebrow = '',
  ratio = '16:9',
  meta = null,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;
  const isVertical = ratio === '9:16' || ratio === '4:5';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Video'}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${isVertical ? 'max-w-[420px]' : 'max-w-4xl'}`}
            initial={motionPresets.modalTransition.initial}
            animate={motionPresets.modalTransition.animate}
            exit={motionPresets.modalTransition.exit}
            transition={motionPresets.modalTransition.transition}
          >
            <div className="mb-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                {eyebrow && (
                  <div className="type-eyebrow mb-1">{eyebrow}</div>
                )}
                {title && (
                  <h3 className="truncate text-lg font-semibold text-white">{title}</h3>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="u-focus flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <AspectFrame ratio={ratio} radius="panel" className="w-full shadow-2xl">
              <div className="absolute inset-0">
                <VideoPlayer
                  src={src}
                  playbackUrl={src}
                  socialUrl={socialUrl}
                  socialProvider={socialProvider}
                  poster={poster}
                  title={title}
                  aspectRatio={ratio}
                  className="!rounded-none"
                />
              </div>
            </AspectFrame>

            {meta && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-white/55">
                {meta}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default VideoModal;
