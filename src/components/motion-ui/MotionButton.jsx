import React from 'react';
import { motion } from 'motion/react';
import { motionPresets } from '../../design-system/motionPresets';

export const MotionButton = ({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  onClick,
  disabled = false,
  icon: Icon,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0f] disabled:opacity-40 disabled:pointer-events-none select-none";

  const sizeStyles = {
    sm: "h-8 px-3 text-[12px] rounded-[6px]",
    default: "h-10 px-4 text-[13px] rounded-[7px]",
    lg: "h-11 px-5 text-[14px] rounded-[8px]",
    icon: "h-9 w-9 p-0 rounded-[7px]"
  };

  const variantStyles = {
    primary: "bg-[#ffffff] text-[#000000] hover:bg-[#eaeaea] active:bg-[#d9d9d9] shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
    secondary: "bg-transparent text-[#f5f5f5] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 active:bg-white/[0.09]",
    surface: "bg-[#17181b] text-[#f5f5f5] border border-white/10 hover:bg-[#1d1e22] hover:border-white/20 active:bg-[#232429]",
    ghost: "bg-transparent text-[#a1a1a6] hover:text-[#ffffff] hover:bg-white/[0.05]",
    destructive: "bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/30 hover:bg-[#f87171]/25"
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : motionPresets.buttonGestures.whileHover}
      whileTap={disabled ? undefined : motionPresets.buttonGestures.whileTap}
      transition={motionPresets.buttonGestures.transition}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.default} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={1.75} />}
      {children}
    </motion.button>
  );
};
