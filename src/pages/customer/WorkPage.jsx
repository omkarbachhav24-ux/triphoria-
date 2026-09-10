import React, { useState } from 'react';
import { Play, ArrowRight, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCMS } from '../../context/CMSContext';
import { MotionButton } from '../../components/motion-ui/MotionButton';
import { VideoThumbnailScrubber } from '../../components/common/VideoThumbnailScrubber';
import { VideoPlayer } from '../../components/common/VideoPlayer';

export const WorkPage = ({ onNavigate, onSelectPackage }) => {
  const { portfolio } = useCMS();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedProject, setSelectedProject] = useState(null);

  // Only show published projects on public page
  const publishedWork = portfolio.filter(p => p.isPublished);

  const categories = ['ALL', 'Commercial & Brand', 'YouTube & Longform', 'Reels & Shorts'];

  const filteredWork = publishedWork.filter(item => {
    if (activeCategory === 'ALL') return true;
    return item.category === activeCategory;
  });

  const handleStartProjectWithStyle = (project) => {
    const pkg = project.category === 'Reels & Shorts' 
      ? 'Starter Cut' 
      : project.category === 'Commercial & Brand' 
      ? 'Studio Retainer' 
      : 'Pro Creator';
    
    if (onSelectPackage) onSelectPackage(pkg);
    setSelectedProject(null);
    onNavigate('/order');
  };

  return (
    <div className="bg-[#111111] text-[#FAFAF5] min-h-screen py-16 space-y-12 selection:bg-[#00CDB8]/30 selection:text-white">
      
      {/* Page Header (Editorial Typography) */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00CDB8]/10 border border-[#00CDB8]/20 text-xs font-mono text-[#00CDB8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00CDB8]" aria-hidden="true" />
          <span className="uppercase tracking-wider">Selected Work &middot; Editorial Archive</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-white">
          Selected Work
        </h1>
        <p className="text-[16px] sm:text-[18px] text-[#a1a1a6] max-w-2xl leading-relaxed">
          A selection of recent cuts shaped for creators, brands, and editorial teams across short-form campaigns, multi-camera narratives, and commercial films.
        </p>

        {/* Category Filters with Motion Shared-Layout Indicator */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <span className="text-xs font-mono text-[#6f7075] uppercase shrink-0 flex items-center gap-1">
            <Filter size={13} aria-hidden="true" /> Filter:
          </span>
          <div className="inline-flex items-center gap-1 p-1 rounded-[8px] border border-white/10 bg-[#111214] shrink-0">
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative z-10 px-3.5 py-1 text-xs font-mono transition-colors select-none ${
                    isActive ? 'text-white' : 'text-[#a1a1a6] hover:text-[#f5f5f5]'
                  }`}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.div
                      layoutId="work-filter-pill"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      className="absolute inset-0 rounded-[6px] bg-[#1d1e22] border border-white/10 -z-10 shadow-sm"
                    />
                  )}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWork.map((project, idx) => (
            <motion.div
              layout
              key={project.id}
              onClick={() => setSelectedProject(project)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedProject(project); }}
              tabIndex={0}
              role="button"
              aria-label={`View project details for ${project.title}`}
              className="group rounded-[10px] border border-white/10 bg-[#111214] p-5 space-y-4 cursor-pointer hover:border-white/25 transition-all flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <div className="space-y-3">
                {/* Media Thumbnail with Timeline Scrubber */}
                <VideoThumbnailScrubber
                  src={project.thumbnail}
                  alt={project.title}
                  runtime={project.runtime}
                  category={project.category}
                  slot={project.isFeatured ? project.featuredSlot : null}
                  onClick={() => setSelectedProject(project)}
                />

                {/* Metadata */}
                <div>
                  <div className="flex justify-between items-center font-mono text-[11px] text-[#a1a1a6] mb-1">
                    <span className="text-[#34d399] uppercase">{project.category}</span>
                    <span>{project.runtime}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-[#34d399] transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-[13px] text-[#a1a1a6] line-clamp-2 mt-1 leading-normal">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Technical Spec Footer */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between font-mono text-[11px] text-[#6f7075]">
                <span>{project.format || '4K Master'}</span>
                <span className="text-white group-hover:underline flex items-center gap-1">
                  View Project <ArrowRight size={11} aria-hidden="true" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1.0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl w-full bg-[#111214] border border-white/15 rounded-[12px] overflow-hidden shadow-2xl space-y-6 p-6"
            >
              <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-xs text-[#34d399] uppercase">{selectedProject.category}</span>
                  <h2 id="project-modal-title" className="text-2xl font-semibold text-white">{selectedProject.title}</h2>
                </div>
                <button 
                  onClick={() => setSelectedProject(null)} 
                  className="p-1 rounded text-[#a1a1a6] hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  aria-label="Close project modal"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Video Player */}
              <div className="w-full flex justify-center items-center">
                <VideoPlayer
                  playbackUrl={selectedProject.playbackUrl || selectedProject.videoUrl}
                  socialUrl={selectedProject.socialUrl}
                  socialProvider={selectedProject.socialProvider}
                  poster={selectedProject.thumbnail}
                  title={selectedProject.title}
                  aspectRatio={selectedProject.aspectRatio || '16:9'}
                  autoPlay={true}
                />
              </div>

              <p className="text-sm text-[#d4d4d4] leading-relaxed">
                {selectedProject.description}
              </p>

              {/* Technical Specs Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-[8px] border border-white/[0.08] bg-[#0b0c0f] font-mono text-xs">
                <div>
                  <span className="text-[#6f7075] block">Format:</span>
                  <span className="text-white">{selectedProject.format || '4K UHD'}</span>
                </div>
                <div>
                  <span className="text-[#6f7075] block">Runtime:</span>
                  <span className="text-white">{selectedProject.runtime}</span>
                </div>
                <div>
                  <span className="text-[#6f7075] block">Color:</span>
                  <span className="text-white">{selectedProject.technicalBreakdown?.colorGrade || 'DaVinci Wide Gamut'}</span>
                </div>
                <div>
                  <span className="text-[#6f7075] block">Sound:</span>
                  <span className="text-white">{selectedProject.technicalBreakdown?.audioMix || 'Broadcast -14 LUFS'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <MotionButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedProject(null)}
                >
                  Close
                </MotionButton>
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartProjectWithStyle(selectedProject)}
                >
                  Start Project in this Style &rarr;
                </MotionButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
