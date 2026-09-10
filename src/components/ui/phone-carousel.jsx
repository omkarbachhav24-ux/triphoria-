import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useCursor } from '../../context/CursorContext';
import { STUDIO_EASE } from './motion-primitives';

export const PhoneCarousel = ({ items = [], onSelectProject }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCenterHovered, setIsCenterHovered] = useState(false);
  const { setCursor, resetCursor } = useCursor();

  if (!items.length) return null;

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const activeItem = items[activeIndex];
  const prevItem = items[(activeIndex - 1 + items.length) % items.length];
  const nextItem = items[(activeIndex + 1) % items.length];

  return (
    <div className="space-y-12 py-6">
      
      {/* ── SYMMETRICAL 3-PHONE STAGE (2 MIRRORED SIDE PHONES + 1 CENTER PHONE) ── */}
      <div 
        className="relative overflow-hidden py-10 px-2"
        onMouseEnter={() => setCursor('DRAG')}
        onMouseLeave={resetCursor}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-10 min-h-[620px]">
          
          {/* LEFT MIRRORED PHONE (Angled Inward, Dimmed on Center Hover) */}
          <motion.div 
            onClick={prevSlide}
            animate={{
              opacity: isCenterHovered ? 0.25 : 0.45,
              scale: isCenterHovered ? 0.80 : 0.84,
              rotate: -5
            }}
            transition={{ duration: 0.4, ease: STUDIO_EASE }}
            className="hidden md:block w-[240px] lg:w-[280px] aspect-[9/18.5] bg-[#07090E] rounded-[42px] p-2.5 border-[5px] border-[#1F2636] shadow-2xl hover:opacity-85 cursor-pointer origin-right relative group flex-shrink-0"
          >
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-3 bg-black rounded-full z-30" />
            <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-black flex flex-col justify-between">
              <img 
                src={prevItem.thumbnail} 
                alt={prevItem.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-300" />
              
              {/* Top OSD */}
              <div className="relative z-10 p-4 pt-6 flex justify-between items-center text-[9px] font-mono text-white">
                <span className="bg-black/70 px-2 py-0.5 rounded border border-white/20">9:16 REEL</span>
                <span className="text-[#CCFF00] font-bold">{prevItem.turnaround}</span>
              </div>

              {/* Center Play Icon */}
              <div className="relative z-10 flex items-center justify-center my-auto">
                <div className="w-12 h-12 rounded-full bg-[#CCFF00]/80 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play size={18} className="ml-0.5 fill-black" />
                </div>
              </div>

              {/* Bottom Metadata */}
              <div className="relative z-10 p-4 space-y-1 bg-gradient-to-t from-black via-black/90 to-transparent font-mono">
                <span className="text-[9px] text-[#CCFF00] block">&larr; PREVIOUS REEL</span>
                <h5 className="text-xs font-bold text-white truncate font-display">{prevItem.title}</h5>
                <span className="text-[10px] text-[#8A94A6] block">{prevItem.client}</span>
              </div>
            </div>
          </motion.div>

          {/* CENTER ACTIVE PHONE (Front-Facing, Largest, Deep Motion on Hover) */}
          <motion.div 
            key={activeItem.id}
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: isCenterHovered ? 1.02 : 1, opacity: 1, y: isCenterHovered ? -6 : 0 }}
            transition={{ duration: 0.45, ease: STUDIO_EASE }}
            onMouseEnter={() => {
              setIsCenterHovered(true);
              setCursor('PLAY');
            }}
            onMouseLeave={() => {
              setIsCenterHovered(false);
              setCursor('DRAG');
            }}
            className="relative w-[300px] sm:w-[340px] lg:w-[370px] aspect-[9/18.5] bg-[#07090E] rounded-[48px] p-3.5 border-[6px] border-[#222B3D] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.95)] ring-1 ring-white/20 z-20 flex-shrink-0 group"
          >
            {/* Dynamic Island Speaker Bar */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#11151E] ml-auto mr-3 border border-[#273244]" />
            </div>

            {/* Screen Inner Viewport (9:16 True Mobile Frame) */}
            <div className="relative w-full h-full rounded-[36px] overflow-hidden bg-black flex flex-col justify-between">
              
              {/* Background Video Frame */}
              <img 
                src={activeItem.thumbnail} 
                alt={activeItem.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50 pointer-events-none" />

              {/* Top OSD Header */}
              <div className="relative z-20 p-5 pt-8 flex justify-between items-center text-[10px] font-mono text-white">
                <span className="bg-black/70 px-2.5 py-1 rounded border border-white/20 backdrop-blur-md">
                  [9:16 REEL] &bull; 60 FPS
                </span>
                <span className="bg-[#CCFF00] text-black font-black px-2 py-0.5 rounded shadow-sm">
                  {activeItem.turnaround}
                </span>
              </div>

              {/* Center Play/Pause Trigger */}
              <div className="relative z-20 flex items-center justify-center my-auto">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-[#CCFF00] text-black flex items-center justify-center shadow-[0_0_35px_rgba(204,255,0,0.6)] group-hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer"
                >
                  {isPlaying ? <Pause size={22} className="fill-black" /> : <Play size={22} className="ml-1 fill-black" />}
                </button>
              </div>

              {/* Bottom Reel Details & Sound wave */}
              <div className="relative z-20 p-5 space-y-3 bg-gradient-to-t from-black via-black/95 to-transparent">
                <div>
                  <span className="text-[10px] font-mono text-[#CCFF00] font-bold block uppercase">[STUDIO EDIT ARCHIVE]</span>
                  <h4 className="text-lg font-black font-display text-white leading-tight">{activeItem.title}</h4>
                  <span className="text-xs font-mono text-[#8A94A6]">{activeItem.client}</span>
                </div>

                {/* Animated Retention Audio Wave Simulation */}
                <div className="flex items-center gap-2.5 bg-[#11151E]/95 border border-[#1F2636] p-2.5 rounded text-[10px] font-mono text-[#F8FAFC]">
                  <Volume2 size={14} className="text-[#CCFF00] animate-pulse flex-shrink-0" />
                  <span className="truncate">RETENTION HOOK &bull; 14-LAYER SFX TIMED</span>
                </div>

                <button 
                  onClick={() => onSelectProject && onSelectProject(activeItem)}
                  className="w-full py-2.5 bg-[#CCFF00] hover:bg-[#DCFF33] text-black text-xs font-mono font-bold uppercase tracking-wider text-center block transition-all rounded-sm shadow-md cursor-pointer hover:shadow-[0_0_20px_rgba(204,255,0,0.4)]"
                >
                  [ INSPECT EDIT BREAKDOWN &rarr; ]
                </button>
              </div>

            </div>
          </motion.div>

          {/* RIGHT MIRRORED PHONE (Angled Inward, Dimmed on Center Hover) */}
          <motion.div 
            onClick={nextSlide}
            animate={{
              opacity: isCenterHovered ? 0.25 : 0.45,
              scale: isCenterHovered ? 0.80 : 0.84,
              rotate: 5
            }}
            transition={{ duration: 0.4, ease: STUDIO_EASE }}
            className="hidden md:block w-[240px] lg:w-[280px] aspect-[9/18.5] bg-[#07090E] rounded-[42px] p-2.5 border-[5px] border-[#1F2636] shadow-2xl hover:opacity-85 cursor-pointer origin-left relative group flex-shrink-0"
          >
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-3 bg-black rounded-full z-30" />
            <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-black flex flex-col justify-between">
              <img 
                src={nextItem.thumbnail} 
                alt={nextItem.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-300" />
              
              {/* Top OSD */}
              <div className="relative z-10 p-4 pt-6 flex justify-between items-center text-[9px] font-mono text-white">
                <span className="bg-black/70 px-2 py-0.5 rounded border border-white/20">9:16 REEL</span>
                <span className="text-[#CCFF00] font-bold">{nextItem.turnaround}</span>
              </div>

              {/* Center Play Icon */}
              <div className="relative z-10 flex items-center justify-center my-auto">
                <div className="w-12 h-12 rounded-full bg-[#CCFF00]/80 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play size={18} className="ml-0.5 fill-black" />
                </div>
              </div>

              {/* Bottom Metadata */}
              <div className="relative z-10 p-4 space-y-1 bg-gradient-to-t from-black via-black/90 to-transparent font-mono">
                <span className="text-[9px] text-[#CCFF00] block">NEXT REEL &rarr;</span>
                <h5 className="text-xs font-bold text-white truncate font-display">{nextItem.title}</h5>
                <span className="text-[10px] text-[#8A94A6] block">{nextItem.client}</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── CONTROLS & PROJECT SELECTOR ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-t border-[#1F2636] pt-8">
        
        {/* Navigation Controls */}
        <div className="md:col-span-4 flex items-center gap-3">
          <button 
            onClick={prevSlide}
            className="p-3.5 border border-[#1F2636] bg-[#07090E] hover:bg-[#181E2B] text-white transition-colors cursor-pointer"
            title="Previous Reel"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={nextSlide}
            className="p-3.5 border border-[#1F2636] bg-[#07090E] hover:bg-[#181E2B] text-white transition-colors cursor-pointer"
            title="Next Reel"
          >
            <ChevronRight size={18} />
          </button>
          <span className="text-xs font-mono text-[#8A94A6] ml-2">
            REEL 0{activeIndex + 1} / 0{items.length}
          </span>
        </div>

        {/* Thumbnail Selector Tabs */}
        <div className="md:col-span-8 flex flex-wrap gap-2 justify-start md:justify-end">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(idx)}
              className={`px-3.5 py-2 text-xs font-mono border transition-all text-left flex items-center gap-2 cursor-pointer ${
                activeIndex === idx
                  ? 'bg-[#CCFF00] text-black border-[#CCFF00] font-bold shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                  : 'bg-[#07090E] text-[#8A94A6] border-[#1F2636] hover:border-white/30'
              }`}
            >
              <span>[{item.id}]</span>
              <span className="truncate max-w-[140px] hidden sm:inline">{item.title}</span>
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};
