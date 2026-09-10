import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { motion } from 'motion/react';

export const VideoThumbnailScrubber = ({ 
  src, 
  alt, 
  runtime = "02:30", 
  category = "Video", 
  slot = null,
  onClick 
}) => {
  const [scrubPercent, setScrubPercent] = useState(null);

  // Convert runtime (e.g. "14:12" or "02:45") to seconds
  const parseSeconds = (timeStr) => {
    if (!timeStr) return 150;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 150;
  };

  const totalSeconds = parseSeconds(runtime);

  const formatTimecode = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 24);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setScrubPercent(x / rect.width);
  };

  const handleMouseLeave = () => {
    setScrubPercent(null);
  };

  const currentScrubTime = scrubPercent !== null ? scrubPercent * totalSeconds : 0;

  return (
    <div 
      className="aspect-video bg-black relative overflow-hidden group cursor-pointer select-none rounded-[8px] border border-white/10"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Thumbnail Image */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 opacity-90 group-hover:opacity-100"
      />

      {/* Ambient Overlay */}
      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        {/* Play Button - gentle scale down when actively scrubbing */}
        <motion.div 
          animate={{ scale: scrubPercent !== null ? 0.85 : 1, opacity: scrubPercent !== null ? 0.4 : 1 }}
          transition={{ duration: 0.15 }}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl pl-0.5"
        >
          <Play size={20} className="fill-current" aria-hidden="true" />
        </motion.div>
      </div>

      {/* Active Timeline Playhead Scrub Line */}
      {scrubPercent !== null && (
        <>
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20"
            style={{ left: `${scrubPercent * 100}%` }}
          />
          {/* Floating Timecode Pill */}
          <div 
            className="absolute top-2.5 z-30 font-mono text-[10px] bg-black/90 text-white px-2 py-0.5 rounded border border-white/20 pointer-events-none -translate-x-1/2 shadow-lg"
            style={{ 
              left: `${Math.max(12, Math.min(88, scrubPercent * 100))}%` 
            }}
          >
            {formatTimecode(currentScrubTime)}
          </div>
        </>
      )}

      {/* Bottom Timeline Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-20">
        <div 
          className="h-full bg-[#34d399] transition-all duration-75"
          style={{ width: `${(scrubPercent !== null ? scrubPercent : 0) * 100}%` }}
        />
      </div>

      {/* Metadata Badges */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center text-xs font-mono text-white z-10 pointer-events-none">
        <span className="bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 text-[10px]">
          {slot ? `0${slot} / ` : ''}{category.toUpperCase()}
        </span>
        <span className="bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 text-[10px]">
          {scrubPercent !== null ? formatTimecode(currentScrubTime) : runtime}
        </span>
      </div>
    </div>
  );
};
