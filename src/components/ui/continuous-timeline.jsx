import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, Film, PlayCircle, Download, CheckCircle2, Sliders, Scissors, Check, ArrowRight } from 'lucide-react';
import { STUDIO_EASE } from './motion-primitives';

export const ContinuousTimeline = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      step: "01",
      title: "YOU SEND",
      subtitle: "Cloud Link Intake",
      desc: "Drop your Google Drive, WeTransfer, or Dropbox raw footage URL into our 5-step wizard. We verify footage integrity, codec, and frame rates immediately.",
      icon: UploadCloud,
      visualBadge: "CLOUD INTAKE // 4K PRORES RAW",
      metadata: "SUPPORTED: PRORES, BRAW, LOG, MP4"
    },
    {
      step: "02",
      title: "WE CUT",
      subtitle: "Multi-layer Post-Production",
      desc: "Senior editors assemble your narrative, match multi-cam angles, grade cinematic colors with custom Kodak LUTs, and master a 14-layer spatial soundscape.",
      icon: Scissors,
      visualBadge: "NLE TIMELINE // KODAK 2383 LUT",
      metadata: "14-LAYER AUDIO MIX &bull; RETENTION CUTS"
    },
    {
      step: "03",
      title: "YOU REVIEW",
      subtitle: "Interactive Timestamped Player",
      desc: "Inspect your first draft on your private Client Portal. Leave timestamped revision notes with pinpoint accuracy or approve the cut with a single click.",
      icon: PlayCircle,
      visualBadge: "PORTAL PLAYER // TIMECODE NOTES",
      metadata: "FRAME-ACCURATE FEEDBACK &bull; V01 READY"
    },
    {
      step: "04",
      title: "WE DELIVER",
      subtitle: "Broadcast Master Ready",
      desc: "Download your uncompressed 4K master ProRes and high-bitrate platform-optimized MP4 files with clean audio stems and social thumbnail cuts.",
      icon: Download,
      visualBadge: "MASTER EXPORT // 4K BROADCAST",
      metadata: "ZERO COMPRESSION LOSS &bull; 48H TOTAL"
    }
  ];

  return (
    <div className="space-y-12 py-6">
      
      {/* ── CONTINUOUS INTERACTIVE PROGRESS TRACKER ── */}
      <div className="relative">
        
        {/* Background Connecting Rail Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1F2636] -translate-y-1/2 hidden md:block" />
        
        {/* Active Animated Highlight Line */}
        <motion.div 
          className="absolute top-1/2 left-0 h-0.5 bg-[#CCFF00] -translate-y-1/2 hidden md:block shadow-[0_0_12px_rgba(204,255,0,0.8)]"
          initial={{ width: "25%" }}
          animate={{ width: `${(activeStep / steps.length) * 100}%` }}
          transition={{ duration: 0.5, ease: STUDIO_EASE }}
        />

        {/* 4 Interactive Step Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative z-10 font-mono">
          {steps.map((s, idx) => {
            const isActive = activeStep === idx + 1;
            const isCompleted = activeStep > idx + 1;
            const Icon = s.icon;

            return (
              <div 
                key={s.step}
                onClick={() => setActiveStep(idx + 1)}
                className={`p-6 border cursor-pointer transition-all duration-300 rounded-sm relative ${
                  isActive 
                    ? 'bg-[#181E2B] border-[#CCFF00] shadow-[0_0_30px_rgba(204,255,0,0.15)] transform -translate-y-1' 
                    : isCompleted
                    ? 'bg-[#0F131C] border-[#CCFF00]/40 text-[#8A94A6]'
                    : 'bg-[#07090E] border-[#1F2636] text-[#525E75] hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-2xl font-black font-mono ${isActive ? 'text-[#CCFF00]' : isCompleted ? 'text-white' : 'text-[#525E75]'}`}>
                    {s.step}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    isActive 
                      ? 'bg-[#CCFF00] text-black border-[#CCFF00]' 
                      : isCompleted
                      ? 'bg-[#11151E] text-[#CCFF00] border-[#CCFF00]/40'
                      : 'bg-[#11151E] text-[#525E75] border-[#1F2636]'
                  }`}>
                    {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                  </div>
                </div>

                <h4 className={`text-lg font-black font-display mb-1 ${isActive ? 'text-white' : 'text-[#F8FAFC]'}`}>
                  {s.title}
                </h4>
                <span className="text-[10px] text-[#CCFF00] block mb-2 font-bold uppercase">
                  [{s.subtitle}]
                </span>
                <p className="text-xs text-[#8A94A6] leading-relaxed font-body">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── ACTIVE STEP VISUAL METAPHOR STAGE ── */}
      <motion.div 
        key={activeStep}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: STUDIO_EASE }}
        className="bg-[#0F131C] border border-[#1F2636] p-6 sm:p-8 rounded-sm font-mono text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="space-y-1">
          <span className="text-[10px] text-[#CCFF00] font-bold block uppercase">[ACTIVE PIPELINE STAGE 0{activeStep}]</span>
          <h4 className="text-xl font-bold font-display text-white">{steps[activeStep - 1].visualBadge}</h4>
          <span className="text-[#8A94A6] block">{steps[activeStep - 1].metadata}</span>
        </div>

        <div className="flex items-center gap-4">
          {activeStep < 4 ? (
            <button 
              onClick={() => setActiveStep(prev => prev + 1)}
              className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2"
            >
              NEXT STAGE &rarr;
            </button>
          ) : (
            <button 
              onClick={() => setActiveStep(1)}
              className="btn-secondary py-2.5 px-6 text-xs font-bold"
            >
              RESTART PIPELINE &circlearrowleft;
            </button>
          )}
        </div>
      </motion.div>

    </div>
  );
};
