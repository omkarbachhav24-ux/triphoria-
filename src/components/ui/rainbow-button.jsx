import React from "react";
import { cn } from "../../lib/utils";
import { MagneticButton } from "./magnetic-button";

export const RainbowButton = React.forwardRef(
  ({ children, className, onClick, isMagnetic = true, ...props }, ref) => {
    const buttonElement = (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          "group relative inline-flex items-center justify-center rounded-sm px-8 py-4 font-display text-xs font-black uppercase tracking-wider text-black transition-all duration-300",
          "hover:scale-[1.02] active:scale-[0.98]",
          "before:absolute before:inset-0 before:-z-10 before:rounded-sm before:p-[2px]",
          "before:bg-gradient-to-r before:from-[#FB7185] before:via-[#A855F7] before:via-[#3B82F6] before:via-[#06B6D4] before:to-[#CCFF00] before:animate-rainbow",
          "bg-[#CCFF00] hover:bg-[#DCFF33] shadow-[0_0_30px_rgba(204,255,0,0.35)] cursor-pointer",
          className
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );

    if (isMagnetic) {
      return <MagneticButton strength={22}>{buttonElement}</MagneticButton>;
    }

    return buttonElement;
  }
);

RainbowButton.displayName = "RainbowButton";
