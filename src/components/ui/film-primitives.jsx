import React from 'react';
import { motion } from 'motion/react';

/**
 * Authentic post-production crop crosshairs
 */
export const CropMarks = ({ className = "" }) => (
  <div className={`pointer-events-none absolute inset-0 select-none ${className}`} aria-hidden="true">
    {/* Top-Left Cross */}
    <div className="absolute top-2 left-2 flex items-center justify-center w-3 h-3 text-white/30 font-mono text-[10px] leading-none">
      +
    </div>
    {/* Top-Right Cross */}
    <div className="absolute top-2 right-2 flex items-center justify-center w-3 h-3 text-white/30 font-mono text-[10px] leading-none">
      +
    </div>
    {/* Bottom-Left Cross */}
    <div className="absolute bottom-2 left-2 flex items-center justify-center w-3 h-3 text-white/30 font-mono text-[10px] leading-none">
      +
    </div>
    {/* Bottom-Right Cross */}
    <div className="absolute bottom-2 right-2 flex items-center justify-center w-3 h-3 text-white/30 font-mono text-[10px] leading-none">
      +
    </div>
  </div>
);

/**
 * Sub-frame timeline tick track (Level 3 Environment Ruler)
 */
export const TimelineTickTrack = ({ className = "", count = 24, activeIndex = -1 }) => (
  <div className={`flex items-end gap-1 select-none pointer-events-none py-1 ${className}`} aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => {
      const isMajor = idx % 4 === 0;
      const isActive = activeIndex >= 0 && idx <= activeIndex;
      return (
        <div
          key={idx}
          className={`w-[1px] transition-all duration-200 ${
            isMajor ? 'h-3' : 'h-1.5'
          } ${
            isActive 
              ? 'bg-[#34d399]' 
              : isMajor 
              ? 'bg-white/25' 
              : 'bg-white/10'
          }`}
        />
      );
    })}
  </div>
);

/**
 * FilmFrame: Wraps media in an authentic cinema gate with metadata, crop marks & timecode
 */
export const FilmFrame = ({ 
  children, 
  title = "REEL // MASTER", 
  aspectRatio = "aspect-video",
  timecode = "00:01:24:12",
  fps = "24.00 FPS",
  format = "4K DCI",
  colorSpace = "REC.709",
  className = "",
  interactive = true,
  onClick = null
}) => {
  return (
    <div 
      className={`relative rounded-[12px] border border-white/15 bg-[#0B0C0F] p-2.5 sm:p-3.5 shadow-2xl transition-all duration-300 ${
        interactive ? 'hover:border-white/30' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Film Header Metadata Strip */}
      <div className="flex items-center justify-between font-mono text-[10px] text-[#6f7075] pb-2 border-b border-white/[0.08] mb-2.5 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" aria-hidden="true" />
          <span className="text-white font-medium uppercase tracking-wider">{title}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>{fps}</span>
          <span>·</span>
          <span>{format}</span>
          <span>·</span>
          <span className="text-[#a1a1a6]">{colorSpace}</span>
        </div>
        <div className="text-white font-mono bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10">
          {timecode}
        </div>
      </div>

      {/* Main Media Container */}
      <div className={`relative ${aspectRatio} rounded-[6px] overflow-hidden bg-black border border-white/[0.06]`}>
        <CropMarks />
        {children}
      </div>

      {/* Film Footer Safe Area Info */}
      <div className="flex items-center justify-between font-mono text-[9px] text-[#55565a] pt-2 select-none">
        <div className="flex items-center gap-1.5">
          <span>TRIPHORIA OPTICAL MASTER</span>
          <span>·</span>
          <span>100% TITLE SAFE</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>PRORES 422 HQ</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Editorial Category / Spec Badge
 */
export const EditorialMeta = ({ label, value, highlight = false, className = "" }) => (
  <div className={`inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-[6px] border ${
    highlight 
      ? 'bg-[#34d399]/10 border-[#34d399]/40 text-[#34d399]' 
      : 'bg-white/[0.04] border-white/10 text-[#a1a1a6]'
  } ${className}`}>
    {label && <span className="text-[#6f7075] uppercase">{label}:</span>}
    <span className="text-white font-medium">{value}</span>
  </div>
);
