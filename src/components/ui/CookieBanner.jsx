import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('triphoria_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('triphoria_cookie_consent', 'accepted');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 bg-[#1A1A1A] border border-white/15 rounded-[12px] p-4 sm:max-w-[340px] shadow-2xl text-xs"
        >
          <div className="flex flex-col gap-3">
            <p className="leading-relaxed text-[#A1A1A6]">
              TRIPHORIA uses strictly necessary cookies for session authorization, CSRF protection, and editorial state tracking.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleAccept}
                className="btn-primary text-xs py-1.5 px-4 cursor-pointer font-medium"
              >
                Understood
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
