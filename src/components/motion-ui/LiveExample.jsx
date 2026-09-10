import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Play, Sliders, Hand, Layers, Film } from 'lucide-react';
import { MotionButton } from './MotionButton';

export const LiveExample = ({
  mode = 'spring', // 'spring' | 'drag' | 'layout' | 'video'
  title = 'Interactive Playground',
  description = '',
  className = ''
}) => {
  // Spring mode state
  const [stiffness, setStiffness] = useState(400);
  const [damping, setDamping] = useState(30);
  const [springToggled, setSpringToggled] = useState(false);

  // Layout morphing state
  const [layoutMode, setLayoutMode] = useState('cards'); // 'cards' | 'stack'

  // Video scrub state
  const [scrubPosition, setScrubPosition] = useState(35);

  // Drag reset key
  const [dragKey, setDragKey] = useState(0);

  const resetAll = () => {
    setStiffness(400);
    setDamping(30);
    setSpringToggled(false);
    setLayoutMode('cards');
    setScrubPosition(35);
    setDragKey(k => k + 1);
  };

  return (
    <div className={`relative my-8 overflow-hidden rounded-[12px] border border-white/10 bg-[#111214] ${className}`}>
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[#17181b]/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {mode === 'spring' && <Sliders size={14} className="text-[#34d399]" />}
          {mode === 'drag' && <Hand size={14} className="text-[#60a5fa]" />}
          {mode === 'layout' && <Layers size={14} className="text-[#ec4899]" />}
          {mode === 'video' && <Film size={14} className="text-[#facc15]" />}
          <span className="font-mono text-[12px] font-medium text-[#f5f5f5]">{title}</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-[#a1a1a6]">
            LIVE STAGE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MotionButton
            variant="ghost"
            size="sm"
            onClick={resetAll}
            icon={RotateCcw}
            className="text-[#a1a1a6] hover:text-white"
          >
            Reset
          </MotionButton>
        </div>
      </div>

      {/* Interactive Demonstration Canvas */}
      <div className="relative flex min-h-[280px] flex-col items-center justify-center p-6 bg-gradient-to-b from-transparent to-[#0b0c0f]/60">
        {/* MODE 1: Spring Physics Studio */}
        {mode === 'spring' && (
          <div className="w-full max-w-md space-y-6">
            {/* Visual Physics Track */}
            <div className="relative h-28 w-full rounded-[10px] border border-white/[0.06] bg-[#0b0c0f] p-4 flex items-center justify-between overflow-hidden">
              <div className="absolute left-6 h-12 w-12 rounded-[8px] border border-dashed border-white/20 flex items-center justify-center text-[10px] font-mono text-white/30">
                A
              </div>
              <div className="absolute right-6 h-12 w-12 rounded-[8px] border border-dashed border-white/20 flex items-center justify-center text-[10px] font-mono text-white/30">
                B
              </div>

              {/* Spring Animated Element */}
              <motion.div
                animate={{
                  x: springToggled ? 280 : 0
                }}
                transition={{
                  type: 'spring',
                  stiffness,
                  damping
                }}
                className="relative z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-[8px] bg-[#4F46E5] text-white shadow-[0_4px_16px_rgba(79,70,229,0.5)] active:scale-95"
                onClick={() => setSpringToggled(!springToggled)}
              >
                <Play size={16} fill="currentColor" />
              </motion.div>
            </div>

            {/* Live Sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 rounded-[8px] border border-white/[0.06] bg-[#17181b]/50 p-3">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-[#a1a1a6]">stiffness</span>
                  <span className="text-white font-semibold">{stiffness}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="20"
                  value={stiffness}
                  onChange={(e) => setStiffness(Number(e.target.value))}
                  className="w-full accent-[#4F46E5] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 rounded-[8px] border border-white/[0.06] bg-[#17181b]/50 p-3">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-[#a1a1a6]">damping</span>
                  <span className="text-white font-semibold">{damping}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="2"
                  value={damping}
                  onChange={(e) => setDamping(Number(e.target.value))}
                  className="w-full accent-[#4F46E5] cursor-pointer"
                />
              </div>
            </div>

            {/* Trigger Button */}
            <div className="flex justify-center">
              <MotionButton
                variant="primary"
                onClick={() => setSpringToggled(!springToggled)}
              >
                {springToggled ? 'Return to Position A' : 'Simulate Spring to Position B'}
              </MotionButton>
            </div>
          </div>
        )}

        {/* MODE 2: Draggable Physics Bounds */}
        {mode === 'drag' && (
          <div key={dragKey} className="flex flex-col items-center justify-center space-y-4 w-full">
            <div className="relative flex h-52 w-full max-w-lg items-center justify-center rounded-[10px] border border-dashed border-white/15 bg-[#0b0c0f] p-4">
              <span className="absolute top-2 left-3 font-mono text-[10px] text-white/30 uppercase tracking-widest">
                Elastic Drag Boundary (with Rubberband return)
              </span>

              <motion.div
                drag
                dragConstraints={{ left: -140, right: 140, top: -60, bottom: 60 }}
                dragElastic={0.25}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-20 w-28 cursor-grab items-center justify-center rounded-[10px] border border-white/20 bg-[#EC4899] text-white shadow-[0_8px_24px_rgba(236,72,153,0.4)] active:cursor-grabbing font-mono text-[12px] font-medium select-none"
              >
                Drag Me
              </motion.div>
            </div>
            <p className="text-center font-mono text-[12px] text-[#a1a1a6]">
              Release anywhere to see spring inertia snap back to boundary constraints.
            </p>
          </div>
        )}

        {/* MODE 3: Layout Morphing & Shared Elements */}
        {mode === 'layout' && (
          <div className="w-full max-w-md space-y-4">
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setLayoutMode('cards')}
                className={`px-3 py-1 text-[12px] font-mono rounded-[6px] border transition-colors ${
                  layoutMode === 'cards' ? 'bg-white text-black border-white' : 'bg-transparent text-[#a1a1a6] border-white/10'
                }`}
              >
                Grid Layout
              </button>
              <button
                onClick={() => setLayoutMode('stack')}
                className={`px-3 py-1 text-[12px] font-mono rounded-[6px] border transition-colors ${
                  layoutMode === 'stack' ? 'bg-white text-black border-white' : 'bg-transparent text-[#a1a1a6] border-white/10'
                }`}
              >
                Horizontal Row
              </button>
            </div>

            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`grid gap-3 p-4 rounded-[10px] border border-white/[0.08] bg-[#0b0c0f] ${
                layoutMode === 'cards' ? 'grid-cols-3' : 'grid-cols-1'
              }`}
            >
              {['ProRes Cut', 'Color Grade', 'Master Audio'].map((item, idx) => (
                <motion.div
                  layout
                  key={item}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="flex items-center justify-between rounded-[8px] border border-white/10 bg-[#17181b] p-3 text-white"
                >
                  <span className="font-mono text-[12px]">{item}</span>
                  <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* MODE 4: Video Frame Scrubber with Inertia */}
        {mode === 'video' && (
          <div className="w-full max-w-lg space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-[10px] border border-white/10 bg-[#000000] flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1b0624] via-[#0b0c0f] to-black opacity-80" />
              
              <div className="relative z-10 text-center space-y-1">
                <div className="font-mono text-[11px] uppercase tracking-widest text-[#facc15]">
                  High-Precision Frame Ingest
                </div>
                <div className="font-mono text-3xl font-semibold text-white tracking-wider">
                  00:04:{String(Math.floor(scrubPosition / 3)).padStart(2, '0')}:{String(Math.floor(scrubPosition % 30)).padStart(2, '0')}
                </div>
                <div className="text-[12px] text-[#a1a1a6]">
                  Simulated 60fps ProRes timeline frame interpolation
                </div>
              </div>
            </div>

            {/* Scrubber slider */}
            <div className="space-y-1.5 rounded-[8px] border border-white/[0.06] bg-[#17181b]/50 p-3">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[#a1a1a6]">Timeline Playhead</span>
                <span className="text-[#facc15]">{scrubPosition}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={scrubPosition}
                onChange={(e) => setScrubPosition(Number(e.target.value))}
                className="w-full accent-[#facc15] cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {description && (
        <div className="border-t border-white/[0.06] bg-[#0b0c0f]/80 px-4 py-3 font-mono text-[12px] text-[#a1a1a6]">
          {description}
        </div>
      )}
    </div>
  );
};
