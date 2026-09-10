import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'motion/react';
import { useCursor } from '../../context/CursorContext';

export const CustomCursor = () => {
  const { cursorType, cursorText, isTouchDevice } = useCursor();
  const [isVisible, setIsVisible] = useState(false);

  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const cursorX = useSpring(-100, springConfig);
  const cursorY = useSpring(-100, springConfig);

  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseMove = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isTouchDevice, isVisible, cursorX, cursorY]);

  if (isTouchDevice || !isVisible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center font-mono text-[10px] font-black uppercase tracking-wider"
      style={{
        x: cursorX,
        y: cursorY
      }}
    >
      {cursorType === 'DEFAULT' && (
        <motion.div 
          className="w-3 h-3 rounded-full bg-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.8)]"
          layoutId="cursor"
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        />
      )}

      {cursorType === 'PLAY' && (
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-3.5 py-1.5 rounded-full bg-[#CCFF00] text-black font-bold flex items-center gap-1.5 shadow-[0_0_20px_rgba(204,255,0,0.6)]"
        >
          <span>PLAY</span>
          <span className="text-[11px]">&rarr;</span>
        </motion.div>
      )}

      {cursorType === 'VIEW' && (
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-3.5 py-1.5 rounded-full bg-white text-black font-bold flex items-center gap-1.5 shadow-xl border border-black/10"
        >
          <span>{cursorText || 'INSPECT'}</span>
          <span className="text-[11px]">&nearr;</span>
        </motion.div>
      )}

      {cursorType === 'DRAG' && (
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-3.5 py-1.5 rounded-full bg-[#06B6D4] text-black font-bold flex items-center gap-1 shadow-[0_0_20px_rgba(6,182,212,0.6)]"
        >
          <span>&larr; DRAG &rarr;</span>
        </motion.div>
      )}
    </motion.div>
  );
};
