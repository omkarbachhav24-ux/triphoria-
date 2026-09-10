import React from 'react';
import { motion } from 'motion/react';

export const RuntimeSwitcher = ({
  options = ['React', 'JavaScript', 'Vue'],
  active = 'React',
  onChange,
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center gap-1 rounded-[8px] border border-white/10 bg-[#111214] p-1 ${className}`}>
      {options.map((opt) => {
        const isActive = active === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`relative z-10 flex h-7 items-center justify-center px-3 text-[12px] font-medium transition-colors select-none ${
              isActive ? 'text-white' : 'text-[#a1a1a6] hover:text-[#f5f5f5]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="runtime-switcher-indicator"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 rounded-[6px] bg-[#1d1e22] border border-white/10 shadow-sm -z-10"
              />
            )}
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
};
