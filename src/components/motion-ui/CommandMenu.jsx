import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ArrowRight, BookOpen, Layers, Zap, Sliders, Film } from 'lucide-react';
import { motionPresets } from '../../design-system/motionPresets';

const SEARCH_ITEMS = [
  { id: 'animate', title: 'animate()', category: 'Animations', desc: 'Hardware-accelerated tween and spring transitions', icon: Zap },
  { id: 'spring', title: 'Spring Physics', category: 'Physics', desc: 'Stiffness, damping, and mass parameters', icon: Sliders },
  { id: 'gestures', title: 'Gestures (hover & tap)', category: 'Interactions', desc: 'Physical touch and cursor state feedback', icon: Layers },
  { id: 'layout', title: 'Layout Animation', category: 'Layout', desc: 'Automatic morphing with layoutId shared elements', icon: Layers },
  { id: 'video-scrub', title: 'Video Scrubber', category: 'TRIPHORIA Engine', desc: 'ProRes frame-by-frame scrubbing with inertia', icon: Film },
  { id: 'tokens', title: 'Design Tokens', category: 'Specification', desc: 'Near-black #0B0C0F palette and typography scale', icon: BookOpen }
];

export const CommandMenu = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = SEARCH_ITEMS.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase()) ||
    item.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={motionPresets.modalTransition.initial}
            animate={motionPresets.modalTransition.animate}
            exit={motionPresets.modalTransition.exit}
            transition={motionPresets.modalTransition.transition}
            className="relative w-full max-w-xl overflow-hidden rounded-[10px] border border-white/10 bg-[#111214] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center border-b border-white/[0.08] px-4 py-3">
              <Search size={16} className="text-[#a1a1a6] mr-3" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Motion.dev documentation & components..."
                className="w-full bg-transparent text-[14px] text-[#f5f5f5] placeholder-[#6f7075] focus:outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 rounded text-[#a1a1a6] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#a1a1a6]">
                  No matching documentation items found.
                </div>
              ) : (
                filtered.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      className="group flex w-full items-center justify-between rounded-[7px] p-2.5 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-white/10 bg-[#17181b] text-white">
                          <ItemIcon size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] font-medium text-white group-hover:text-white">
                              {item.title}
                            </span>
                            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.2 font-mono text-[10px] text-[#a1a1a6]">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#a1a1a6] line-clamp-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Shortcut Bar */}
            <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#0b0c0f] px-4 py-2 font-mono text-[11px] text-[#6f7075]">
              <span>Navigate with <kbd className="rounded border border-white/15 px-1 bg-white/5">↑</kbd> <kbd className="rounded border border-white/15 px-1 bg-white/5">↓</kbd></span>
              <span>Select <kbd className="rounded border border-white/15 px-1 bg-white/5">↵</kbd></span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
