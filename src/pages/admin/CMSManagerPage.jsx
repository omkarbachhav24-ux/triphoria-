import React, { useState } from 'react';
import { 
  Plus, Edit3, Trash2, Eye, Check, Film, 
  Layers, ExternalLink, Save
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { VideoPlayer, getAutoThumbnail } from '../../components/common/VideoPlayer';

const InstagramIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export const CMSManagerPage = ({ onNavigate }) => {
  const { 
    portfolio, social, 
    addPortfolioProject, updatePortfolioProject, deletePortfolioProject, toggleProjectPublish, setFeaturedSlots,
    addSocialPost, deleteSocialPost, toggleSocialPublish 
  } = useCMS();

  const [activeTab, setActiveTab] = useState('featured'); // 'featured', 'portfolio', 'social'
  
  // Featured Slots State
  const slot1 = portfolio.find(p => p.isFeatured && p.featuredSlot === 1);
  const slot2 = portfolio.find(p => p.isFeatured && p.featuredSlot === 2);
  const slot3 = portfolio.find(p => p.isFeatured && p.featuredSlot === 3);

  const [slot1Id, setSlot1Id] = useState(slot1?.id || '');
  const [slot2Id, setSlot2Id] = useState(slot2?.id || '');
  const [slot3Id, setSlot3Id] = useState(slot3?.id || '');
  const [featuredSaveNotice, setFeaturedSaveNotice] = useState(false);

  // Portfolio Form State (Modal)
  const [editingProject, setEditingProject] = useState(null); // 'NEW' or project obj
  const [projectForm, setProjectForm] = useState({
    title: '',
    client: '',
    category: 'Commercial & Brand',
    format: '4K DCI 60FPS',
    runtime: '01:00',
    videoUrl: '',
    thumbnail: '',
    description: '',
    isPublished: true,
    camera: 'Sony FX3 S-Log3 4K',
    colorGrade: 'Custom LUT Grade + Film Grain',
    audioMix: '14-Layer Foley & Dialogue Isolation',
    pacing: 'Dynamic Retention Cuts'
  });

  // Social Post Form State (Modal)
  const [editingSocial, setEditingSocial] = useState(null);
  const [socialForm, setSocialForm] = useState({
    platform: 'Instagram Reel',
    url: '',
    title: '',
    caption: '',
    thumbnail: '',
    likes: '',
    isPublished: true
  });

  // Preview Modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);

  // Save Featured Slots
  const handleSaveFeatured = async (e) => {
    e.preventDefault();
    await setFeaturedSlots({ slot1Id, slot2Id, slot3Id });
    setFeaturedSaveNotice(true);
    setTimeout(() => setFeaturedSaveNotice(false), 3000);
  };

  const openNewProjectModal = () => {
    setProjectForm({
      title: '',
      client: '',
      category: 'Commercial & Brand',
      format: '4K 60FPS',
      runtime: '01:00',
      socialProvider: 'instagram',
      socialUrl: '',
      playbackUrl: '',
      videoUrl: '',
      aspectRatio: '16:9',
      thumbnail: '',
      description: '',
      isPublished: true,
      camera: 'Cinema 4K',
      colorGrade: 'Custom Film Emulation',
      audioMix: 'Mastered Broadcast Mix',
      pacing: 'Dynamic Retention Cut'
    });
    setEditingProject('NEW');
  };

  const openEditProjectModal = (proj) => {
    setProjectForm({
      title: proj.title,
      client: proj.client,
      category: proj.category,
      format: proj.format,
      runtime: proj.runtime,
      socialProvider: proj.socialProvider || 'none',
      socialUrl: proj.socialUrl || '',
      playbackUrl: proj.playbackUrl || proj.videoUrl || '',
      videoUrl: proj.playbackUrl || proj.videoUrl || '',
      aspectRatio: proj.aspectRatio || '16:9',
      thumbnail: proj.thumbnail,
      description: proj.description,
      isPublished: proj.isPublished,
      camera: proj.technicalBreakdown?.camera || 'Cinema 4K',
      colorGrade: proj.technicalBreakdown?.colorGrade || 'Rec.709 Pass',
      audioMix: proj.technicalBreakdown?.audioMix || 'Dialogue Isolation',
      pacing: proj.technicalBreakdown?.pacing || 'Retention Cut'
    });
    setEditingProject(proj);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    const activePlayback = projectForm.playbackUrl || projectForm.videoUrl;
    const autoThumb = getAutoThumbnail(activePlayback, projectForm.thumbnail);
    const payload = {
      ...projectForm,
      videoUrl: activePlayback,
      playbackUrl: activePlayback,
      thumbnail: autoThumb,
      technicalBreakdown: {
        camera: projectForm.camera,
        colorGrade: projectForm.colorGrade,
        audioMix: projectForm.audioMix,
        pacing: projectForm.pacing
      }
    };

    if (editingProject === 'NEW') {
      await addPortfolioProject(payload);
    } else {
      await updatePortfolioProject(editingProject.id, payload);
    }
    setEditingProject(null);
  };

  const openNewSocialModal = () => {
    setSocialForm({
      platform: 'Instagram Reel',
      url: '',
      title: '',
      caption: '',
      thumbnail: '',
      likes: '',
      isPublished: true
    });
    setEditingSocial('NEW');
  };

  const handleSaveSocial = async (e) => {
    e.preventDefault();
    const autoThumb = getAutoThumbnail(socialForm.url, socialForm.thumbnail);
    const payload = {
      ...socialForm,
      thumbnail: autoThumb
    };
    await addSocialPost(payload);
    setEditingSocial(null);
  };

  const publishedProjects = portfolio.filter(p => p.isPublished);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00CDB8]" />
            <span>PUBLIC STOREFRONT CONTENT MANAGEMENT SYSTEM</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Portfolio &amp; Editorial Content Control
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            Configure the 3 Homepage Featured Video slots, manage published portfolio archives, and curate Instagram community reels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => onNavigate('/')} 
            className="btn-ghost text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Public Storefront &rarr;</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        {[
          { id: 'featured', label: 'Featured Work (3 Slots)', icon: Layers },
          { id: 'portfolio', label: `Portfolio Archive (${portfolio.length})`, icon: Film },
          { id: 'social', label: `Instagram & Social (${social.length})`, icon: InstagramIcon }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono transition-colors cursor-pointer ${
                isActive 
                  ? 'bg-[#00CDB8] text-[#111111] font-semibold' 
                  : 'bg-white/[0.04] text-[#A1A1A6] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: FEATURED WORK (3 SLOTS)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'featured' && (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-lg font-bold text-white">Homepage Featured Work Hierarchy</h2>
            <p className="text-xs text-[#A1A1A6]">
              Designate which published portfolio items occupy the 3 editorial positions on the homepage: Slot 1 (Dominant Left Lead) + Slots 2 &amp; 3 (Supporting Right).
            </p>
          </div>

          {featuredSaveNotice && (
            <div className="bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-xs p-3 rounded-[8px] flex items-center gap-2 font-mono">
              <Check size={14} />
              <span>Featured slots saved and live on homepage!</span>
            </div>
          )}

          <form onSubmit={handleSaveFeatured} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Slot 1: Lead Video */}
              <div className="bg-[#111111] border border-white/[0.08] rounded-[12px] p-5 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-[#00CDB8]">SLOT #1 (DOMINANT LEAD)</span>
                  <span className="text-[10px] bg-white/[0.05] text-[#A1A1A6] px-2 py-0.5 rounded">Hero Showcase</span>
                </div>

                <select
                  value={slot1Id}
                  onChange={e => setSlot1Id(e.target.value)}
                  className="triphoria-input text-xs"
                >
                  <option value="">-- No Project Assigned --</option>
                  {publishedProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.category})
                    </option>
                  ))}
                </select>

                {portfolio.find(p => p.id === slot1Id) ? (
                  <div className="space-y-2 pt-2">
                    <img 
                      src={portfolio.find(p => p.id === slot1Id).thumbnail} 
                      alt="Preview" 
                      className="w-full aspect-video object-cover rounded-[8px] border border-white/10"
                    />
                    <div className="text-xs font-medium text-white">
                      {portfolio.find(p => p.id === slot1Id).title}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-black/40 rounded-[8px] flex items-center justify-center text-xs text-[#6F7075] font-mono">
                    Slot Empty
                  </div>
                )}
              </div>

              {/* Slot 2: Supporting Video */}
              <div className="bg-[#111111] border border-white/[0.08] rounded-[12px] p-5 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-[#A1A1A6]">SLOT #2 (SUPPORTING)</span>
                  <span className="text-[10px] bg-white/[0.05] text-[#A1A1A6] px-2 py-0.5 rounded">Secondary</span>
                </div>

                <select
                  value={slot2Id}
                  onChange={e => setSlot2Id(e.target.value)}
                  className="triphoria-input text-xs"
                >
                  <option value="">-- No Project Assigned --</option>
                  {publishedProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.category})
                    </option>
                  ))}
                </select>

                {portfolio.find(p => p.id === slot2Id) ? (
                  <div className="space-y-2 pt-2">
                    <img 
                      src={portfolio.find(p => p.id === slot2Id).thumbnail} 
                      alt="Preview" 
                      className="w-full aspect-video object-cover rounded-[8px] border border-white/10"
                    />
                    <div className="text-xs font-medium text-white">
                      {portfolio.find(p => p.id === slot2Id).title}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-black/40 rounded-[8px] flex items-center justify-center text-xs text-[#6F7075] font-mono">
                    Slot Empty
                  </div>
                )}
              </div>

              {/* Slot 3: Supporting Video */}
              <div className="bg-[#111111] border border-white/[0.08] rounded-[12px] p-5 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-[#A1A1A6]">SLOT #3 (SUPPORTING)</span>
                  <span className="text-[10px] bg-white/[0.05] text-[#A1A1A6] px-2 py-0.5 rounded">Tertiary</span>
                </div>

                <select
                  value={slot3Id}
                  onChange={e => setSlot3Id(e.target.value)}
                  className="triphoria-input text-xs"
                >
                  <option value="">-- No Project Assigned --</option>
                  {publishedProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.category})
                    </option>
                  ))}
                </select>

                {portfolio.find(p => p.id === slot3Id) ? (
                  <div className="space-y-2 pt-2">
                    <img 
                      src={portfolio.find(p => p.id === slot3Id).thumbnail} 
                      alt="Preview" 
                      className="w-full aspect-video object-cover rounded-[8px] border border-white/10"
                    />
                    <div className="text-xs font-medium text-white">
                      {portfolio.find(p => p.id === slot3Id).title}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-black/40 rounded-[8px] flex items-center justify-center text-xs text-[#6F7075] font-mono">
                    Slot Empty
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex justify-end">
              <button
                type="submit"
                className="btn-primary py-2.5 px-6 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,205,184,0.25)]"
              >
                <Save size={14} />
                <span>Save Featured Positions</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: PORTFOLIO ARCHIVE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'portfolio' && (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white">Studio Portfolio Registry</h2>
              <p className="text-xs text-[#A1A1A6]">
                Publish video cuts, edit descriptions, adjust technical metadata, and curate categories.
              </p>
            </div>

            <button
              onClick={openNewProjectModal}
              className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
            >
              <Plus size={14} />
              <span>Add Portfolio Piece</span>
            </button>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {portfolio.map(proj => (
              <div key={proj.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] p-3 rounded-[10px] transition-colors">
                <div className="flex items-start gap-4">
                  <img 
                    src={proj.thumbnail} 
                    alt={proj.title} 
                    className="w-24 h-16 object-cover rounded-[6px] border border-white/10 flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#6F7075]">{proj.id}</span>
                      <span className="text-xs text-[#6F7075]">&bull;</span>
                      <span className="text-xs font-mono text-[#00CDB8]">{proj.category}</span>
                      {proj.isFeatured && (
                        <span className="text-[10px] font-mono bg-[#00CDB8]/15 text-[#00CDB8] px-2 py-0.5 rounded-full font-semibold">
                          Slot #{proj.featuredSlot}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{proj.title}</h3>
                    <div className="text-xs text-[#A1A1A6]">
                      Client: {proj.client} &middot; Runtime: {proj.runtime} &middot; Format: {proj.format}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center">
                  <button
                    onClick={() => toggleProjectPublish(proj.id)}
                    className={`text-xs font-mono px-3 py-1 rounded-full border transition-colors ${
                      proj.isPublished
                        ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                        : 'bg-white/[0.05] text-[#A1A1A6] border-white/10'
                    }`}
                  >
                    {proj.isPublished ? 'Live' : 'Draft'}
                  </button>

                  <button
                    onClick={() => setPreviewVideoUrl(proj.videoUrl)}
                    className="btn-ghost p-2 text-xs"
                    title="Watch preview"
                  >
                    <Eye size={13} />
                  </button>

                  <button
                    onClick={() => openEditProjectModal(proj)}
                    className="btn-ghost p-2 text-xs"
                    title="Edit project"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete portfolio project "${proj.title}"?`)) {
                        deletePortfolioProject(proj.id);
                      }
                    }}
                    className="p-2 text-[#6F7075] hover:text-red-400 text-xs"
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: SOCIAL / INSTAGRAM
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'social' && (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white">Instagram &amp; Social Floor</h2>
              <p className="text-xs text-[#A1A1A6]">
                Manage social clips shown on the public homepage community section.
              </p>
            </div>

            <button
              onClick={openNewSocialModal}
              className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
            >
              <Plus size={14} />
              <span>Add Social Post</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {social.map(post => (
              <div key={post.id} className="bg-[#111111] border border-white/[0.08] rounded-[10px] p-3 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="aspect-square rounded-[8px] overflow-hidden bg-black relative">
                    <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate">{post.title}</h3>
                    <p className="text-xs text-[#A1A1A6] line-clamp-2 mt-0.5">{post.caption}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => toggleSocialPublish(post.id)}
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                      post.isPublished ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30' : 'bg-white/[0.05] text-[#A1A1A6] border-white/10'
                    }`}
                  >
                    {post.isPublished ? 'Live' : 'Draft'}
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00CDB8] hover:underline flex items-center gap-1 font-mono"
                    >
                      <ExternalLink size={12} />
                      <span>URL</span>
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this social clip?')) {
                          deleteSocialPost(post.id);
                        }
                      }}
                      className="text-[#6F7075] hover:text-red-400 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Project */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] rounded-[16px] max-w-2xl w-full border border-white/15 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#00CDB8]">PORTFOLIO MANAGEMENT</span>
                <h3 className="text-lg font-bold text-white">
                  {editingProject === 'NEW' ? 'Add New Portfolio Project' : `Edit: ${editingProject.title}`}
                </h3>
              </div>
              <button onClick={() => setEditingProject(null)} className="text-[#A1A1A6] hover:text-white text-xs font-mono p-1">✕</button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={projectForm.title}
                    onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                    className="triphoria-input text-xs"
                    placeholder="e.g. Street Rush Japan 4K"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Client / Brand Name</label>
                  <input
                    type="text"
                    value={projectForm.client}
                    onChange={e => setProjectForm({ ...projectForm, client: e.target.value })}
                    className="triphoria-input text-xs"
                    placeholder="@brand.media"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Category *</label>
                  <select
                    value={projectForm.category}
                    onChange={e => setProjectForm({ ...projectForm, category: e.target.value })}
                    className="triphoria-input text-xs"
                  >
                    <option value="Commercial & Brand">Commercial &amp; Brand</option>
                    <option value="YouTube & Longform">YouTube &amp; Longform</option>
                    <option value="Reels & Shorts">Reels &amp; Shorts</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Format / Resolution</label>
                  <input
                    type="text"
                    value={projectForm.format}
                    onChange={e => setProjectForm({ ...projectForm, format: e.target.value })}
                    className="triphoria-input text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Runtime</label>
                  <input
                    type="text"
                    value={projectForm.runtime}
                    onChange={e => setProjectForm({ ...projectForm, runtime: e.target.value })}
                    className="triphoria-input text-xs"
                    placeholder="01:30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Social Platform</label>
                  <select
                    value={projectForm.socialProvider}
                    onChange={e => setProjectForm({ ...projectForm, socialProvider: e.target.value })}
                    className="triphoria-input text-xs"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Aspect Ratio</label>
                  <select
                    value={projectForm.aspectRatio}
                    onChange={e => setProjectForm({ ...projectForm, aspectRatio: e.target.value })}
                    className="triphoria-input text-xs"
                  >
                    <option value="16:9">16:9 (Landscape Standard)</option>
                    <option value="9:16">9:16 (Vertical Reel / Story)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:5">4:5 (Portrait Feed)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Direct Playback Video URL (MP4 / Hosted Asset) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://cdn.example.com/video.mp4"
                  value={projectForm.playbackUrl}
                  onChange={e => setProjectForm({ ...projectForm, playbackUrl: e.target.value, videoUrl: e.target.value })}
                  className="triphoria-input text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Social Reference URL (View on Instagram ↗)</label>
                <input
                  type="url"
                  placeholder="https://www.instagram.com/reel/XXXXX/"
                  value={projectForm.socialUrl}
                  onChange={e => setProjectForm({ ...projectForm, socialUrl: e.target.value })}
                  className="triphoria-input text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-[#A1A1A6] text-[11px]">Project Editorial Description</label>
                <textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="triphoria-input text-xs resize-y"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer"
                >
                  Save Project &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Social */}
      {editingSocial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] rounded-[16px] max-w-md w-full border border-white/15 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">Add Social Clip</h3>
              <button onClick={() => setEditingSocial(null)} className="text-[#A1A1A6] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSocial} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono uppercase text-[#A1A1A6]">Title</label>
                <input
                  type="text"
                  required
                  value={socialForm.title}
                  onChange={e => setSocialForm({ ...socialForm, title: e.target.value })}
                  className="triphoria-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-[#A1A1A6]">Caption</label>
                <textarea
                  rows={2}
                  value={socialForm.caption}
                  onChange={e => setSocialForm({ ...socialForm, caption: e.target.value })}
                  className="triphoria-input text-xs resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-[#A1A1A6]">Instagram Post URL</label>
                <input
                  type="url"
                  required
                  value={socialForm.url}
                  onChange={e => setSocialForm({ ...socialForm, url: e.target.value })}
                  className="triphoria-input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingSocial(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer"
                >
                  Save Clip &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] text-white rounded-[14px] overflow-hidden max-w-3xl w-full border border-white/15 shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-mono text-[#00CDB8] uppercase">Media Preview</span>
              <button onClick={() => setPreviewVideoUrl(null)} className="text-[#A1A1A6] hover:text-white text-xs font-mono px-2 py-1">✕</button>
            </div>
            <div className="aspect-video bg-black rounded-[8px] overflow-hidden border border-white/10">
              <VideoPlayer src={previewVideoUrl} autoPlay />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
