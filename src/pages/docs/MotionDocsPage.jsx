import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Menu, X, ArrowLeft, ArrowRight, Check, Copy,
  Sparkles, Info
} from 'lucide-react';

import { MotionButton } from '../../components/motion-ui/MotionButton';
import { CodeBlock } from '../../components/motion-ui/CodeBlock';
import { RuntimeSwitcher } from '../../components/motion-ui/RuntimeSwitcher';
import { LiveExample } from '../../components/motion-ui/LiveExample';
import { CommandMenu } from '../../components/motion-ui/CommandMenu';

const DOC_SECTIONS = [
  {
    id: 'animate',
    category: 'Animations',
    title: 'animate()',
    subtitle: 'animate() runs easing and spring animations, hardware-accelerated where supported.',
    breadcrumb: 'Docs / React / animate()',
    code: `import { animate } from "motion";

// Simple hardware-accelerated transform
animate(".box", { x: 100, rotate: 90 }, {
  type: "spring",
  stiffness: 400,
  damping: 30
});`,
    mode: 'spring',
    details: 'The animate() function interpolates numerical and dimensional CSS properties with high-frequency compositor threads. Unlike traditional CSS transitions, spring parameters allow fluid, interruptible animations that respond dynamically to rapid user interactions without resetting position.'
  },
  {
    id: 'spring',
    category: 'Physics',
    title: 'Spring Physics',
    subtitle: 'Physical simulation models using mass, stiffness, and damping coefficients.',
    breadcrumb: 'Docs / Foundations / Spring Physics',
    code: `const springConfig = {
  type: "spring",
  stiffness: 450, // Tension of the physical spring
  damping: 32,    // Resistance opposing spring motion
  mass: 1.0       // Inertial resistance to acceleration
};`,
    mode: 'spring',
    details: 'Physical springs model natural movement. By configuring stiffness and damping instead of arbitrary millisecond durations, elements maintain velocity and realistic momentum when interrupted mid-flight.'
  },
  {
    id: 'drag',
    category: 'Gestures',
    title: 'Drag & Gestures',
    subtitle: 'High-performance pan, drag, and tap interactions with rubberband elastic limits.',
    breadcrumb: 'Docs / Gestures / drag',
    code: `<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
  dragElastic={0.2}
  whileTap={{ scale: 0.96 }}
/>`,
    mode: 'drag',
    details: 'Drag gestures automatically compute velocity vectors on release to calculate momentum throwing and rubberband resistance when dragged past boundaries.'
  },
  {
    id: 'layout',
    category: 'Layout',
    title: 'Layout & Shared Elements',
    subtitle: 'Smoothly interpolate DOM layout shifts and shared elements using layoutId.',
    breadcrumb: 'Docs / Layout / layoutId',
    code: `// Shared pill indicator across navigation tabs
{isActive && (
  <motion.div
    layoutId="active-nav-indicator"
    className="absolute inset-0 bg-white/10 rounded-[6px]"
  />
)}`,
    mode: 'layout',
    details: 'Layout animation calculates the bounding box of elements before and after a DOM update, applying an inverse transform to produce smooth 60fps morphing without expensive browser layout reflows.'
  },
  {
    id: 'video',
    category: 'Studio Engine',
    title: 'Video Frame Scrubber',
    subtitle: 'High-precision timeline playback and velocity scrub physics for video editing.',
    breadcrumb: 'Docs / TRIPHORIA / VideoScrubber',
    code: `// Sub-frame timeline playhead interpolation
const timecode = useTransform(playheadProgress, [0, 1], ["00:00:00", "00:15:30"]);
const frameScale = useSpring(zoomLevel, { stiffness: 600, damping: 40 });`,
    mode: 'video',
    details: 'TRIPHORIA integrates Motion physics directly into its timeline scrubbers, ensuring that jumping between cut points and scrubbing across raw 4K footage feels responsive with zero UI stutter.'
  }
];

export const MotionDocsPage = ({ onNavigate }) => {
  const [activeId, setActiveId] = useState('animate');
  const [runtime, setRuntime] = useState('React');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageCopied, setPageCopied] = useState(false);

  // Global Command+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentDoc = DOC_SECTIONS.find(d => d.id === activeId) || DOC_SECTIONS[0];

  const handleCopyPage = async () => {
    const fullText = `# ${currentDoc.title}\n${currentDoc.subtitle}\n\n\`\`\`${runtime.toLowerCase()}\n${currentDoc.code}\n\`\`\`\n\n${currentDoc.details}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setPageCopied(true);
      setTimeout(() => setPageCopied(false), 2000);
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0F] text-[#F5F5F5] selection:bg-white/20 selection:text-white font-sans antialiased">
      {/* 1. Global Motion Sticky Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#0B0C0F]/85 px-4 md:px-8 backdrop-blur-md">
        {/* Left: Logo & Nav items */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-white font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            <span className="h-4 w-4 rounded-[3px] bg-white text-black flex items-center justify-center text-[10px] font-mono font-bold">
              M
            </span>
            <span className="font-mono text-[14px] tracking-tight">Motion.dev</span>
            <span className="text-[11px] font-mono text-[#6F7075] hidden sm:inline">v13.1.0</span>
          </button>

          <nav className="hidden md:flex items-center gap-5 text-[13px] font-medium text-[#A1A1A6]">
            <span className="text-white">Docs</span>
            <span className="hover:text-white cursor-pointer transition-colors">Examples</span>
            <span className="hover:text-white cursor-pointer transition-colors">UI</span>
            <span className="hover:text-white cursor-pointer transition-colors">AI Kit</span>
            <span className="hover:text-white cursor-pointer transition-colors text-[#EC4899]">Motion+</span>
          </nav>
        </div>

        {/* Right: Runtime Switcher, Search & Studio Exit */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <RuntimeSwitcher active={runtime} onChange={setRuntime} />
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 items-center gap-2 rounded-[7px] border border-white/10 bg-[#111214] px-3 text-[12px] font-mono text-[#A1A1A6] hover:border-white/20 hover:text-white transition-colors"
          >
            <Search size={14} />
            <span className="hidden md:inline">Search docs</span>
            <kbd className="rounded border border-white/15 px-1 text-[10px] bg-white/5">⌘K</kbd>
          </button>

          <MotionButton
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/')}
            className="hidden lg:inline-flex text-[12px]"
          >
            Back to Studio
          </MotionButton>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-[6px] border border-white/10 text-[#A1A1A6] hover:text-white md:hidden"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* 2. Three-Zone Documentation Shell */}
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,760px)] lg:grid-cols-[240px_minmax(0,760px)_180px] gap-8 lg:gap-14">
          
          {/* Sidebar Zone (Desktop) */}
          <aside className="hidden md:block py-2">
            <div className="sticky top-24 space-y-6">
              <div>
                <div className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6F7075]">
                  Documentation
                </div>
                <div className="space-y-1">
                  {DOC_SECTIONS.map((sec) => {
                    const isActive = activeId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setActiveId(sec.id)}
                        className={`relative flex w-full items-center justify-between rounded-[6px] px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors select-none ${
                          isActive ? 'text-white' : 'text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            className="absolute inset-0 rounded-[6px] bg-white/[0.08] -z-10"
                          />
                        )}
                        <span className="font-mono text-[13px]">{sec.title}</span>
                        <span className="text-[10px] font-mono text-[#6F7075]">{sec.category}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Design System Reference Link */}
              <div className="rounded-[8px] border border-white/[0.08] bg-[#111214] p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[12px] font-mono font-medium text-white">
                  <Sparkles size={13} className="text-[#34D399]" />
                  Design Tokens
                </div>
                <p className="text-[11px] text-[#A1A1A6] leading-relaxed">
                  Near-black <code className="text-white">#0B0C0F</code> canvas with high-contrast type and subtle 10% white borders.
                </p>
              </div>
            </div>
          </aside>

          {/* Main Documentation Column */}
          <main className="min-w-0 max-w-[760px] pb-24">
            {/* Breadcrumb */}
            <div className="font-mono text-[12px] text-[#6F7075] mb-4">
              {currentDoc.breadcrumb}
            </div>

            {/* Document Header & Copy Page Action */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-6">
              <div>
                <h1 className="font-sans text-4xl sm:text-5xl font-semibold tracking-[-0.035em] text-white">
                  {currentDoc.title}
                </h1>
                <p className="mt-3 max-w-[650px] text-[17px] leading-[1.55] text-[#A1A1A6]">
                  {currentDoc.subtitle}
                </p>
              </div>

              <motion.button
                onClick={handleCopyPage}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-[7px] border border-white/10 bg-[#17181B] px-3.5 py-1.5 font-mono text-[12px] font-medium text-[#F5F5F5] hover:bg-[#1D1E22] hover:border-white/20 transition-colors"
              >
                {pageCopied ? (
                  <>
                    <Check size={14} className="text-[#34D399]" />
                    <span className="text-[#34D399]">Page Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-[#A1A1A6]" />
                    <span>Copy page</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Live Interactive Playground Demonstration */}
            <LiveExample
              mode={currentDoc.mode}
              title={`${currentDoc.title} Interactive Stage`}
              description={`Live experimental sandbox demonstrating real-time ${currentDoc.title.toLowerCase()} physics with zero frame delay.`}
            />

            {/* Technical Explanation Prose */}
            <div className="prose prose-invert max-w-none my-6 text-[15px] leading-[1.7] text-[#D4D4D4] space-y-4">
              <p>{currentDoc.details}</p>
            </div>

            {/* Code Block with Copy Action */}
            <CodeBlock
              code={currentDoc.code}
              title={`Example (${runtime})`}
              language="javascript"
              showLineNumbers
            />

            {/* Callout Component */}
            <div className="my-6 rounded-[8px] border-l-2 border-white/40 bg-white/[0.04] p-4 text-[14px] leading-relaxed text-[#D4D4D4]">
              <div className="flex items-center gap-2 font-medium text-white mb-1">
                <Info size={15} className="text-[#60A5FA]" />
                <span>Performance Recommendation</span>
              </div>
              Always prioritize compositor-friendly transform and opacity properties. Animating layout triggers such as width or margin will force full browser style recalculation.
            </div>

            {/* API Parameters Table */}
            <div className="my-10 space-y-3">
              <h2 className="font-sans text-xl font-semibold text-white tracking-tight">
                API Reference
              </h2>
              <div className="overflow-x-auto rounded-[8px] border border-white/[0.08] bg-[#111214]">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-white/[0.08] bg-[#17181B]/40 font-mono text-[11px] text-[#A1A1A6]">
                    <tr>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Default</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono text-[12px] text-[#D4D4D4]">
                    <tr>
                      <td className="px-4 py-2.5 text-white font-medium">type</td>
                      <td className="px-4 py-2.5 text-[#C586C0]">"spring" | "tween"</td>
                      <td className="px-4 py-2.5 text-[#A1A1A6]">"tween"</td>
                      <td className="px-4 py-2.5 font-sans text-[#A1A1A6]">Physical animation solver engine.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-white font-medium">stiffness</td>
                      <td className="px-4 py-2.5 text-[#CE9178]">number</td>
                      <td className="px-4 py-2.5 text-[#A1A1A6]">400</td>
                      <td className="px-4 py-2.5 font-sans text-[#A1A1A6]">Tension of the spring simulator.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-white font-medium">damping</td>
                      <td className="px-4 py-2.5 text-[#CE9178]">number</td>
                      <td className="px-4 py-2.5 text-[#A1A1A6]">30</td>
                      <td className="px-4 py-2.5 font-sans text-[#A1A1A6]">Friction opposing velocity.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-white font-medium">bounce</td>
                      <td className="px-4 py-2.5 text-[#CE9178]">number</td>
                      <td className="px-4 py-2.5 text-[#A1A1A6]">0.25</td>
                      <td className="px-4 py-2.5 font-sans text-[#A1A1A6]">Elastic rebound coefficient.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Navigation Pagination */}
            <div className="mt-14 flex items-center justify-between border-t border-white/[0.08] pt-6">
              <button
                onClick={() => setActiveId('animate')}
                className="group flex flex-col items-start gap-1 font-mono text-[12px] text-[#A1A1A6] hover:text-white"
              >
                <span className="text-[10px] uppercase text-[#6F7075] flex items-center gap-1">
                  <ArrowLeft size={10} /> Previous
                </span>
                <span className="font-sans font-medium text-white group-hover:underline">
                  animate()
                </span>
              </button>

              <button
                onClick={() => setActiveId(activeId === 'animate' ? 'spring' : activeId === 'spring' ? 'drag' : activeId === 'drag' ? 'layout' : 'video')}
                className="group flex flex-col items-end gap-1 font-mono text-[12px] text-[#A1A1A6] hover:text-white"
              >
                <span className="text-[10px] uppercase text-[#6F7075] flex items-center gap-1">
                  Next <ArrowRight size={10} />
                </span>
                <span className="font-sans font-medium text-white group-hover:underline">
                  Next Specification
                </span>
              </button>
            </div>
          </main>

          {/* Right Table of Contents (Desktop Large) */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-3 font-mono text-[12px]">
              <div className="font-semibold uppercase tracking-[0.06em] text-[#6F7075] text-[11px]">
                On this page
              </div>
              <ul className="space-y-2 text-[#A1A1A6]">
                <li className="hover:text-white cursor-pointer text-white">Overview</li>
                <li className="hover:text-white cursor-pointer">Interactive Stage</li>
                <li className="hover:text-white cursor-pointer">Technical Spec</li>
                <li className="hover:text-white cursor-pointer">Code Example</li>
                <li className="hover:text-white cursor-pointer">API Reference</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mobile Slide-Over Sidebar Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0B0C0F] border-r border-white/10 p-6 z-10 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[14px] font-semibold text-white">Motion.dev</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-[#A1A1A6] hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-1">
                  {DOC_SECTIONS.map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveId(sec.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-2 rounded-[6px] font-mono text-[13px] ${
                        activeId === sec.id ? 'bg-white/10 text-white font-medium' : 'text-[#A1A1A6]'
                      }`}
                    >
                      {sec.title}
                    </button>
                  ))}
                </div>
              </div>

              <MotionButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/');
                }}
                className="w-full"
              >
                Back to TRIPHORIA Studio
              </MotionButton>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Command Menu Palette Modal */}
      <CommandMenu
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(id) => {
          if (['animate', 'spring', 'drag', 'layout', 'video'].includes(id)) {
            setActiveId(id);
          }
        }}
      />
    </div>
  );
};
