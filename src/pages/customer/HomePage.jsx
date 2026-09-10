import React, { useState, useEffect } from 'react';
import { 
  Play, ArrowRight, CheckCircle2, ShieldCheck, Clock, Layers, Star, 
  Sparkles, Video, Award, ChevronRight, Zap, ExternalLink, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCMS } from '../../context/CMSContext';
import { CropMarks, TimelineTickTrack } from '../../components/ui/film-primitives';
import { VideoPlayer } from '../../components/common/VideoPlayer';

export const HomePage = ({ onNavigate, onSelectPackage }) => {
  const { portfolio, social } = useCMS();

  // Active Video Modal State
  const [playingVideo, setPlayingVideo] = useState(null);

  // Active Service Tab
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);

  // Filter tag state for Selected Work
  const [activeWorkFilter, setActiveWorkFilter] = useState('All');

  // Live running timecode generator for Hero Film Frame (~24fps)
  const [heroTimecode, setHeroTimecode] = useState("01:24:18:04");
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const frames = Math.floor((now.getMilliseconds() / 1000) * 24);
      const secs = String(now.getSeconds()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setHeroTimecode(`01:${mins}:${secs}:${String(frames).padStart(2, '0')}`);
    }, 41);
    return () => clearInterval(timer);
  }, []);

  // Handle ESC key to close video modal (Accessibility WCAG 2.1 AA)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && playingVideo) {
        setPlayingVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playingVideo]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (playingVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [playingVideo]);

  // Derive Published Portfolio Items (with fallback if API state is transient)
  const publishedPortfolio = portfolio && portfolio.length > 0 
    ? portfolio.filter(p => p.isPublished !== false) 
    : [
        {
          id: "WORK-01",
          title: "Tokyo Cyberpunk // Street Run",
          category: "Commercial",
          aspectRatio: "16:9",
          duration: "01:24",
          playbackUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1000",
          description: "High-energy commercial edit featuring multi-layered neon color grading, film grain halation, and 14-layer diegetic sound design.",
          isFeatured: true,
          featuredSlot: 1,
          isPublished: true
        },
        {
          id: "WORK-02",
          title: "AI Hardware Breakdown: 2026 Edition",
          category: "Documentary",
          aspectRatio: "16:9",
          duration: "14:12",
          playbackUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1000",
          description: "Longform tech review cut with 3-camera synchronized angles, dynamic animated callouts, and audio dialogue isolation.",
          isFeatured: true,
          featuredSlot: 2,
          isPublished: true
        },
        {
          id: "WORK-03",
          title: "Aura // High Fashion Spring 2026",
          category: "Shortform",
          aspectRatio: "9:16",
          duration: "00:45",
          playbackUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000",
          description: "High-fashion vertical teaser shot on RED V-Raptor 8K with kinetic typography, bass punctuation, and soft diffusion.",
          isFeatured: true,
          featuredSlot: 3,
          isPublished: true
        }
      ];

  // Derive Featured Videos from CMS
  const publishedFeatured = publishedPortfolio
    .filter(p => p.isFeatured)
    .sort((a, b) => (a.featuredSlot || 99) - (b.featuredSlot || 99));

  const leadVideo = publishedFeatured[0] || publishedPortfolio[0] || null;

  // Filtered portfolio items for Selected Work grid
  const filteredWork = activeWorkFilter === 'All' 
    ? publishedPortfolio 
    : publishedPortfolio.filter(p => 
        (p.category && p.category.toLowerCase().includes(activeWorkFilter.toLowerCase())) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(activeWorkFilter.toLowerCase())))
      );

  const handleStartProjectWithPackage = (pkgName) => {
    if (onSelectPackage) onSelectPackage(pkgName);
    onNavigate('/order');
  };

  const MARQUEE_ITEMS = [
    "4K PRORES MASTERING",
    "DAVINCI WIDE GAMUT COLOR",
    "STEM AUDIO MIXING (-14 LUFS)",
    "KINETIC SUBTITLE TYPOGRAPHY",
    "DIRECT GOOGLE DRIVE INTAKE",
    "14-DAY VAULT BUFFER",
    "SENIOR EDITOR DISPATCH"
  ];

  const DISCIPLINES = [
    {
      num: "01",
      name: "Short-Form & Vertical",
      headline: "Rhythmic pacing calibrated for mobile retention.",
      description: "Hook dynamics, micro-zooms, kinetic subtitle typography, and bespoke stem audio mixing built specifically for 9:16 vertical distribution.",
      specs: ["9:16 Vertical", "Mobile 60fps", "Stem Audio Mix", "Animated Captions"],
      packageTarget: "Starter Cut",
      image: publishedPortfolio[2]?.thumbnail || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000"
    },
    {
      num: "02",
      name: "Narrative & Longform",
      headline: "Multi-camera continuity with broadcast-grade audio isolation.",
      description: "Dialogue restoration, multi-cam switching, story arc sequencing, documentary lower-thirds, and broadcast sound level mastering (-14 LUFS).",
      specs: ["16:9 Widescreen", "Multi-Cam Isolation", "-14 LUFS Mastering", "Color Conformed"],
      packageTarget: "Pro Creator",
      image: publishedPortfolio[0]?.thumbnail || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=1000"
    },
    {
      num: "03",
      name: "Commercial & Brand Films",
      headline: "Cinematic color grades and deliberate sound design.",
      description: "Film stock emulation (Kodak 2383 / DaVinci Wide Gamut), halation, sound design Foley, and multi-format exports for broadcast, web, and social.",
      specs: ["4K ProRes 422 HQ", "DaVinci Wide Gamut", "Bespoke Foley & Mix", "Multi-Aspect Delivery"],
      packageTarget: "Cinematic Master",
      image: publishedPortfolio[1]?.thumbnail || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=1000"
    }
  ];

  return (
    <div className="bg-[#0B0C0E] text-[#FAFAF5] selection:bg-[#00CDB8]/30 selection:text-white space-y-24 sm:space-y-36 pb-24 overflow-x-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          01 HERO SECTION — High-Impact CreatorFlow Rhythm
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 sm:pt-20 px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial from-[#00CDB8]/15 via-transparent to-transparent pointer-events-none blur-3xl -z-10" />

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
          
          {/* Eyebrow Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#17181B] border border-[#00CDB8]/30 text-[#00CDB8] text-xs font-mono tracking-wider shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-[#00CDB8] animate-pulse" />
            <span>PREMIUM POST-PRODUCTION STUDIO &middot; ACTIVE CAPACITY</span>
          </motion.div>

          {/* Headline: CreatorFlow Editorial Typography */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05]"
          >
            VIDEO <span className="text-[#00CDB8]">WITHOUT</span> THE CHAOS.
          </motion.h1>

          {/* Supporting Copy */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#9E9EA4] text-base sm:text-xl max-w-2xl leading-relaxed font-normal"
          >
            TRIPHORIA pairs your raw footage directly with specialized senior editors, structured review cycles, and zero storage overhead. Paste your Drive link. Receive broadcast-grade cuts.
          </motion.p>

          {/* CTA Button Group */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <button
              onClick={() => handleStartProjectWithPackage('Pro Creator')}
              className="px-8 py-4 rounded-full bg-[#00CDB8] text-[#0B0C0E] font-semibold text-sm sm:text-base hover:bg-[#00E6CE] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(0,205,184,0.3)] flex items-center gap-3 cursor-pointer"
            >
              <span>Start a Project</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('showreel');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 rounded-full bg-[#17181B] text-white border border-white/10 font-medium text-sm sm:text-base hover:bg-white/[0.08] hover:border-white/20 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <Play size={16} className="fill-white text-white" />
              <span>Watch Showreel</span>
            </button>
          </motion.div>

          {/* Live Studio Metadata Strip */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[#9E9EA4]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[#00CDB8]" />
              <span>Google Drive Intake</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[#00CDB8]" />
              <span>ProRes 422 & 4K Masters</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[#00CDB8]" />
              <span>Verified Editor Dispatch</span>
            </div>
          </motion.div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            HERO VISUAL ANCHOR — Interactive Master Monitor Viewport
        ───────────────────────────────────────────────────────────── */}
        <motion.div 
          id="showreel"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 sm:mt-16 relative max-w-5xl mx-auto"
        >
          <div className="relative bg-[#17181B] border border-white/15 rounded-2xl overflow-hidden shadow-2xl p-3 sm:p-5 space-y-3 group">
            
            {/* Monitor Top Status Bar */}
            <div className="flex items-center justify-between font-mono text-xs text-[#9E9EA4] px-2">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-medium tracking-wide">REC 4K MASTER &bull; TRIPHORIA CUT</span>
              </div>
              <div className="text-[#00CDB8] font-mono tracking-wider tabular-nums font-semibold">
                {heroTimecode}
              </div>
            </div>

            {/* Video Viewport Frame */}
            <div 
              onClick={() => leadVideo && setPlayingVideo(leadVideo)}
              className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 cursor-pointer group/frame"
            >
              {leadVideo ? (
                <>
                  <img 
                    src={leadVideo.thumbnail} 
                    alt={leadVideo.title || "TRIPHORIA Showreel"}
                    className="w-full h-full object-cover group-hover/frame:scale-105 transition-transform duration-700 ease-out brightness-90 group-hover/frame:brightness-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover/frame:opacity-60 transition-opacity" />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#00CDB8] text-[#0B0C0F] flex items-center justify-center shadow-[0_0_30px_rgba(0,205,184,0.5)] transition-transform"
                    >
                      <Play size={28} className="fill-[#0B0C0F] ml-1" />
                    </motion.div>
                  </div>

                  {/* Title & Metadata Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-end justify-between">
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded bg-[#00CDB8]/20 border border-[#00CDB8]/30 text-[#00CDB8] font-mono text-[11px] uppercase tracking-wider mb-2">
                        {leadVideo.category || "Showreel"}
                      </span>
                      <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                        {leadVideo.title || "TRIPHORIA Master Showreel"}
                      </h3>
                    </div>
                    <div className="font-mono text-xs text-[#9E9EA4] hidden sm:block">
                      <span>{leadVideo.duration || "02:15"}</span> &bull; <span>4K ProRes HQ</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-[#17181B] to-black">
                  <Play size={48} className="text-[#00CDB8] mb-3" />
                  <p className="font-mono text-sm text-[#9E9EA4]">PLAY MASTER SHOWREEL</p>
                </div>
              )}

              <CropMarks />
            </div>

            {/* Scrubber Track Visualizer */}
            <div className="pt-2 px-1 hidden sm:block">
              <TimelineTickTrack />
            </div>

          </div>
        </motion.div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          02 TICKER MARQUEE BAND — CreatorFlow Continuous Ribbon
      ───────────────────────────────────────────────────────────── */}
      <section className="py-6 bg-[#17181B] border-y border-white/[0.08] overflow-hidden select-none">
        <div className="flex whitespace-nowrap animate-marquee">
          {MARQUEE_ITEMS.concat(MARQUEE_ITEMS).map((item, idx) => (
            <div key={idx} className="flex items-center gap-8 mx-6 font-mono text-xs text-[#9E9EA4] tracking-widest uppercase">
              <span className="text-[#00CDB8]">&bull;</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>


      {/* ─────────────────────────────────────────────────────────────
          03 REAL PROOF / METRICS — Transparent Studio Proof
      ───────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { metric: "100%", label: "ProRes 422 HQ Mastered", desc: "Broadcast specification output on every order" },
            { metric: "48h", label: "Initial Cut Turnaround", desc: "First cut in your review portal within 2 business days" },
            { metric: "0 GB", label: "Local Drive Storage Overhead", desc: "Direct cloud sync via Google Drive & Frame-accurate link intake" },
            { metric: "14-Day", label: "Vault Retention Buffer", desc: "Active project media retention for revisions & re-exports" },
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="bg-[#17181B] border border-white/[0.08] rounded-2xl p-6 hover:border-[#00CDB8]/30 transition-all group"
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-[#00CDB8] tracking-tight font-mono group-hover:scale-105 transition-transform origin-left">
                {stat.metric}
              </div>
              <div className="text-white font-semibold text-base mt-2">
                {stat.label}
              </div>
              <div className="text-[#9E9EA4] text-xs leading-relaxed mt-1">
                {stat.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>


      {/* ─────────────────────────────────────────────────────────────
          04 WHAT WE DO / DISCIPLINES — CreatorFlow Interactive Tabs
      ───────────────────────────────────────────────────────────── */}
      <section id="services" className="px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[#00CDB8] font-mono text-xs uppercase tracking-widest">
            01 &bull; STUDIO DISCIPLINES
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Tailored Post-Production Services
          </h2>
          <p className="text-[#9E9EA4] text-base">
            From vertical high-retention social content to broadcast 4K documentaries.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {DISCIPLINES.map((disc, idx) => (
            <button
              key={idx}
              onClick={() => setActiveServiceIndex(idx)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all cursor-pointer ${
                activeServiceIndex === idx
                  ? 'bg-[#00CDB8] text-[#0B0C0F] font-semibold shadow-[0_0_20px_rgba(0,205,184,0.3)]'
                  : 'bg-[#17181B] text-[#9E9EA4] hover:text-white border border-white/[0.08]'
              }`}
            >
              <span className="font-mono text-xs opacity-60 mr-2">{disc.num}</span>
              <span>{disc.name}</span>
            </button>
          ))}
        </div>

        {/* Active Discipline Card */}
        <AnimatePresence mode="wait">
          {DISCIPLINES.map((disc, idx) => {
            if (idx !== activeServiceIndex) return null;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="bg-[#17181B] border border-white/[0.08] rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                {/* Discipline Specs & Info (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#00CDB8]/10 text-[#00CDB8] font-mono text-xs">
                    <span>DISCIPLINE {disc.num}</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                    {disc.headline}
                  </h3>
                  <p className="text-[#9E9EA4] text-base leading-relaxed">
                    {disc.description}
                  </p>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {disc.specs.map((spec, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 text-xs font-mono text-[#FAFAF5]">
                        <CheckCircle2 size={14} className="text-[#00CDB8]" />
                        <span>{spec}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleStartProjectWithPackage(disc.packageTarget)}
                      className="px-6 py-3 rounded-full bg-[#00CDB8] text-[#0B0C0F] font-semibold text-sm hover:bg-[#00E6CE] transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Start Brief with {disc.packageTarget}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Discipline Visual Frame (5 cols) */}
                <div className="lg:col-span-5 relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-black border border-white/10">
                  <img 
                    src={disc.image} 
                    alt={disc.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 font-mono text-xs text-white/80">
                    <span>SPECS // {disc.specs[0]}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          05 HOW IT WORKS — Step-by-Step Intake & Delivery Protocol
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[#00CDB8] font-mono text-xs uppercase tracking-widest">
            02 &bull; PRODUCTION PROTOCOL
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            How TRIPHORIA Works
          </h2>
          <p className="text-[#9E9EA4] text-base">
            3 simple steps from raw footage intake to broadcast master delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {[
            {
              step: "01",
              title: "Submit Brief & Link",
              desc: "Paste your Google Drive, Dropbox, or Frame.io footage link directly into our intake form along with editing instructions.",
              badge: "INTAKE PROTOCOL"
            },
            {
              step: "02",
              title: "Senior Editor Cut",
              desc: "Your dedicated senior editor cuts, grades, and masters audio using DaVinci Resolve & Premiere Pro tools.",
              badge: "PRODUCTION QUEUE"
            },
            {
              step: "03",
              title: "Review & Master Delivery",
              desc: "Review your cut in your interactive client dossier, request revisions, and download 4K ProRes masters upon approval.",
              badge: "4K PRORES MASTER"
            }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.5 }}
              className="bg-[#17181B] border border-white/[0.08] rounded-2xl p-8 space-y-6 relative hover:border-[#00CDB8]/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl font-extrabold font-mono text-[#00CDB8]">
                  {item.step}
                </span>
                <span className="px-2.5 py-1 rounded bg-white/[0.05] font-mono text-[10px] text-[#9E9EA4] tracking-wider">
                  {item.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {item.title}
              </h3>
              <p className="text-[#9E9EA4] text-sm leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          06 SELECTED WORK / PORTFOLIO GRID — CreatorFlow Multi-Aspect Grid
      ───────────────────────────────────────────────────────────── */}
      <section id="work" className="px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto space-y-10">
        
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-3">
            <span className="text-[#00CDB8] font-mono text-xs uppercase tracking-widest">
              03 &bull; PORTFOLIO REEL
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Selected Work
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Commercial', 'Shortform', 'Documentary'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveWorkFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  activeWorkFilter === cat
                    ? 'bg-[#00CDB8] text-[#0B0C0F] font-bold'
                    : 'bg-[#17181B] text-[#9E9EA4] hover:text-white border border-white/[0.08]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Grid Supporting Multi-Aspect Containers (16:9, 9:16, 1:1, 4:5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWork.map((item, idx) => {
            const aspectClass = item.aspectRatio === '9:16' 
              ? 'aspect-[9/16]' 
              : item.aspectRatio === '1:1' 
              ? 'aspect-square' 
              : item.aspectRatio === '4:5' 
              ? 'aspect-[4/5]' 
              : 'aspect-video';

            return (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="bg-[#17181B] border border-white/[0.08] rounded-2xl overflow-hidden group flex flex-col justify-between"
              >
                {/* Media Container */}
                <div 
                  onClick={() => {
                    if (item.playbackUrl) {
                      setPlayingVideo(item);
                    } else if (item.socialUrl) {
                      window.open(item.socialUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={`relative ${aspectClass} bg-black overflow-hidden cursor-pointer group/media`}
                >
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover/media:opacity-60 transition-opacity" />

                  {/* Play Button or External Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#00CDB8] text-[#0B0C0F] flex items-center justify-center shadow-lg transform group-hover/media:scale-110 transition-transform">
                      {item.playbackUrl ? (
                        <Play size={20} className="fill-[#0B0C0F] ml-0.5" />
                      ) : (
                        <ExternalLink size={20} />
                      )}
                    </div>
                  </div>

                  {/* Aspect Badge */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 font-mono text-[10px] text-white/80">
                    {item.aspectRatio || "16:9"}
                  </div>
                </div>

                {/* Card Content & Metadata */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#00CDB8]">
                    <span>{item.category || "Commercial"}</span>
                    <span>{item.duration || "01:30"}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-[#00CDB8] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[#9E9EA4] text-xs leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          07 WHY TRIPHORIA — CreatorFlow High-Contrast Matrix
      ───────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[#00CDB8] font-mono text-xs uppercase tracking-widest">
            04 &bull; COMPARATIVE MATRIX
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Why TRIPHORIA Studio?
          </h2>
          <p className="text-[#9E9EA4] text-base">
            Built to solve the reliability, file management, and quality control bottlenecks of traditional editing options.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-[#17181B] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#9E9EA4]">
              <thead className="bg-[#111214] font-mono text-xs text-white border-b border-white/[0.08]">
                <tr>
                  <th className="p-4 sm:p-6 font-semibold">FEATURE / METRIC</th>
                  <th className="p-4 sm:p-6 text-[#00CDB8] font-semibold bg-[#00CDB8]/10">TRIPHORIA STUDIO</th>
                  <th className="p-4 sm:p-6 font-semibold">SOLO FREELANCERS</th>
                  <th className="p-4 sm:p-6 font-semibold">TRADITIONAL AGENCIES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs sm:text-sm">
                {[
                  { feature: "Turnaround Time", triphoria: "48-Hour Initial Cuts", free: "Unpredictable / 5-10 Days", agency: "2-3 Weeks" },
                  { feature: "Editor Quality", triphoria: "Senior Vetted Editors", free: "Varies Wildly", agency: "Junior Staff Assigned" },
                  { feature: "File Intake Protocol", triphoria: "Direct Google Drive Sync", free: "Messy WeTransfer Links", agency: "Complex FTP Systems" },
                  { feature: "Audio & Color Standard", triphoria: "-14 LUFS & DaVinci Wide", free: "Basic Stock Presets", agency: "Extra Add-On Cost" },
                  { feature: "Vault Storage Buffer", triphoria: "14-Day Active Vault", free: "Immediate File Purge", agency: "Expensive Storage Retainers" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 sm:p-6 font-medium text-white">{row.feature}</td>
                    <td className="p-4 sm:p-6 text-white font-semibold bg-[#00CDB8]/5 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#00CDB8] shrink-0" />
                      <span>{row.triphoria}</span>
                    </td>
                    <td className="p-4 sm:p-6">{row.free}</td>
                    <td className="p-4 sm:p-6">{row.agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          08 ABOUT / STUDIO VISION — Editorial Philosophy
      ───────────────────────────────────────────────────────────── */}
      <section id="about" className="px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto">
        <div className="bg-[#17181B] border border-white/[0.08] rounded-2xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-8 space-y-4">
            <span className="text-[#00CDB8] font-mono text-xs uppercase tracking-widest">
              05 &bull; ABOUT THE STUDIO
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Post-Production Built for Modern Creators & Brands
            </h2>
            <p className="text-[#9E9EA4] text-base leading-relaxed">
              TRIPHORIA operates as a high-performance post-production studio bridging senior editorial expertise with zero-friction digital logistics. We believe great editing requires precise pacing, clean audio stems, and color consistency—without administrative back-and-forth.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-[#00CDB8]">
              <span>&bull; DAVINCI RESOLVE STUDIO</span>
              <span>&bull; ADOBE PREMIERE PRO</span>
              <span>&bull; PRORES 422 MASTERING</span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#111214] border border-white/10 rounded-xl p-6 space-y-4 text-center">
            <Award size={36} className="text-[#00CDB8] mx-auto" />
            <div className="text-white font-bold text-lg">Broadcast Specification Guarantee</div>
            <p className="text-[#9E9EA4] text-xs leading-relaxed">
              Every deliverable undergoes technical verification for loudness standards (-14 LUFS), color gamut accuracy, and export integrity before client delivery.
            </p>
          </div>

        </div>
      </section>


      {/* ─────────────────────────────────────────────────────────────
          09 START A PROJECT CTA — High-Converting Banner
      ───────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-10 max-w-[1320px] mx-auto">
        <div className="relative bg-gradient-to-r from-[#00CDB8]/20 via-[#17181B] to-[#17181B] border border-[#00CDB8]/30 rounded-2xl p-8 sm:p-16 text-center space-y-6 overflow-hidden shadow-[0_0_50px_rgba(0,205,184,0.15)]">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00CDB8]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00CDB8]/10 border border-[#00CDB8]/30 text-[#00CDB8] text-xs font-mono tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#00CDB8] animate-pulse" />
            <span>READY TO ELEVATE YOUR FOOTAGE?</span>
          </div>

          <h2 className="text-3xl sm:text-6xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Start Your First Post-Production Brief Today.
          </h2>

          <p className="text-[#9E9EA4] text-base sm:text-lg max-w-xl mx-auto">
            Paste your raw footage link, pick your package tier, and let our senior editing team deliver broadcast-ready cuts.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => handleStartProjectWithPackage('Pro Creator')}
              className="px-10 py-5 rounded-full bg-[#00CDB8] text-[#0B0C0F] font-bold text-base hover:bg-[#00E6CE] hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,205,184,0.4)] flex items-center gap-3 cursor-pointer"
            >
              <span>Start a Project Brief</span>
              <ArrowRight size={20} />
            </button>
          </div>

        </div>
      </section>

      {/* Video Player Modal Component */}
      {playingVideo && (
        <VideoPlayer 
          video={playingVideo} 
          onClose={() => setPlayingVideo(null)} 
        />
      )}

    </div>
  );
};
