import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * CharacterPreloader — Kinetic Studio Character Preloader
 * Features an animated vector character mascot, pulsing aperture lens,
 * dynamic audio frequency visualizer, and progress counter in Teal Green (#00CDB8).
 */
export function CharacterPreloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDone(true);
            if (onComplete) onComplete();
          }, 400);
          return 100;
        }
        const diff = Math.floor(Math.random() * 15) + 5;
        return Math.min(prev + diff, 100);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07080A] text-[#FAFAF5] selection:bg-[#00CDB8]/30"
        >
          {/* Environmental Glow */}
          <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-[#00CDB8]/10 blur-[120px]" />

          {/* Animated Mascot Character */}
          <div className="relative mb-8 flex items-center justify-center">
            <svg
              width="140"
              height="140"
              viewBox="0 0 140 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10"
            >
              {/* Outer Spinning Film Reel Ring */}
              <motion.circle
                cx="70"
                cy="70"
                r="62"
                stroke="#00CDB8"
                strokeWidth="2.5"
                strokeDasharray="12 8"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: 'center' }}
              />

              {/* Inner Counter-Rotating Ring */}
              <motion.circle
                cx="70"
                cy="70"
                r="52"
                stroke="rgba(0, 205, 184, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: 'center' }}
              />

              {/* Mascot Body / Camera Shell */}
              <motion.rect
                x="35"
                y="45"
                width="70"
                height="50"
                rx="10"
                fill="#17181B"
                stroke="#00CDB8"
                strokeWidth="3"
                animate={{ y: [45, 42, 45] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Mascot Eye 1 (Left Camera Lens) */}
              <motion.circle
                cx="54"
                cy="70"
                r="12"
                fill="#07080A"
                stroke="#00CDB8"
                strokeWidth="3"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="54"
                cy="70"
                r="4"
                fill="#00CDB8"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Mascot Eye 2 (Right Camera Lens / Aperture) */}
              <motion.circle
                cx="86"
                cy="70"
                r="12"
                fill="#07080A"
                stroke="#00CDB8"
                strokeWidth="3"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />
              <motion.circle
                cx="86"
                cy="70"
                r="4"
                fill="#00CDB8"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />

              {/* Mascot Smile / Sound Wave Mouth */}
              <motion.path
                d="M 58 84 Q 70 92 82 84"
                stroke="#00CDB8"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                animate={{ d: ["M 58 84 Q 70 92 82 84", "M 58 84 Q 70 88 82 84", "M 58 84 Q 70 92 82 84"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Director Hat / Viewfinder Crown */}
              <polygon points="50,33 90,33 70,20" fill="#00CDB8" />
            </svg>

            {/* Audio Waveform Bars underneath Character */}
            <div className="absolute -bottom-6 flex items-end gap-1">
              {[12, 24, 18, 28, 14, 22, 10].map((h, i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-[#00CDB8]"
                  animate={{ height: [8, h, 8] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Title & Brand */}
          <div className="mt-4 space-y-1 text-center font-mono">
            <div className="text-[13px] font-bold tracking-wider text-[#00CDB8] uppercase">
              TRIPHORIA STUDIO
            </div>
            <div className="text-[11px] text-[var(--foreground-muted)]">
              INITIALIZING CREATIVE WORKFLOW…
            </div>
          </div>

          {/* Progress Bar & Counter */}
          <div className="mt-8 w-64 space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#17181B] p-0.5">
              <motion.div
                className="h-full rounded-full bg-[#00CDB8]"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
            <div className="flex justify-between font-mono text-[11px] text-[#00CDB8]">
              <span>LOADING</span>
              <span>{progress}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CharacterPreloader;
