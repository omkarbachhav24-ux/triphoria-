import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * CookieBanner — slim, token-driven, always dark (fixed overlay, reads over
 * whatever scene is behind it). Strictly-necessary cookies only; no consent
 * gate beyond acknowledgement.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let consent = null;
    try {
      consent = localStorage.getItem('triphoria_cookie_consent');
    } catch {
      /* private mode / blocked storage — show once, don't persist */
    }
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  const accept = () => {
    try {
      localStorage.setItem('triphoria_cookie_consent', 'accepted');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-[560px] items-center gap-4 rounded-[var(--radius-panel)] border border-white/12 bg-[#101114]/95 px-4 py-3 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-6"
          role="region"
          aria-label="Cookie notice"
        >
          <p className="flex-1 text-[11.5px] leading-relaxed text-[#A1A1A6]">
            Strictly-necessary cookies only — session auth, CSRF protection, and
            editorial state.
          </p>
          <button
            onClick={accept}
            className="u-focus shrink-0 rounded-[var(--radius-md)] bg-[#00CDB8] px-3.5 py-1.5 text-[12px] font-semibold text-[#0B0C0E] hover:bg-[#00E6CE]"
          >
            OK
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieBanner;
