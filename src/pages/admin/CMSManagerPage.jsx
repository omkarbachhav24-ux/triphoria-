import React, { useMemo, useState } from 'react';
import {
  Plus, Edit3, Trash2, Eye, Check, Film,
  Layers, ExternalLink, Save, Search, Grid3x3, List, X,
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { VideoPlayer, getAutoThumbnail } from '../../components/common/VideoPlayer';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem } from '../../components/motion/Reveal';
import { AspectFrame } from '../../components/video/AspectFrame';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';

const InstagramIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const MEDIA_TYPE_OPTIONS = ['Reel', 'Short', 'LongForm', 'Commercial', 'Documentary', 'Other'];
const LIBRARY_FILTERS = ['All', 'Reels', 'Shorts', 'Long Form', 'Featured', 'Published', 'Draft'];

function matchesLibraryFilter(proj, filter) {
  switch (filter) {
    case 'All': return true;
    case 'Reels': return proj.mediaType === 'Reel' || proj.aspectRatio === '9:16';
    case 'Shorts': return proj.mediaType === 'Short';
    case 'Long Form': return proj.mediaType === 'LongForm' || (proj.aspectRatio === '16:9' && !proj.mediaType);
    case 'Featured': return proj.isFeatured;
    case 'Published': return proj.isPublished;
    case 'Draft': return !proj.isPublished;
    default: return true;
  }
}

const SORTS = {
  Newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  Oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  'A-Z': (a, b) => a.title.localeCompare(b.title),
  Featured: (a, b) => (b.isFeatured === a.isFeatured ? 0 : b.isFeatured ? 1 : -1),
};

export function CMSManagerPage({ onNavigate }) {
  const {
    portfolio, social,
    addPortfolioProject, updatePortfolioProject, deletePortfolioProject, toggleProjectPublish, setFeaturedSlots,
    addSocialPost, deleteSocialPost, toggleSocialPublish,
  } = useCMS();

  const [activeTab, setActiveTab] = useState('featured'); // 'featured', 'library', 'social'

  // Featured Slots State
  const slot1 = portfolio.find((p) => p.isFeatured && p.featuredSlot === 1);
  const slot2 = portfolio.find((p) => p.isFeatured && p.featuredSlot === 2);
  const slot3 = portfolio.find((p) => p.isFeatured && p.featuredSlot === 3);

  const [slot1Id, setSlot1Id] = useState(slot1?.id || '');
  const [slot2Id, setSlot2Id] = useState(slot2?.id || '');
  const [slot3Id, setSlot3Id] = useState(slot3?.id || '');
  const [featuredSaveNotice, setFeaturedSaveNotice] = useState(false);

  // Video Library controls
  const [libraryFilter, setLibraryFilter] = useState('All');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySort, setLibrarySort] = useState('Newest');
  const [libraryView, setLibraryView] = useState('grid'); // 'grid' | 'list'

  // Portfolio Form State (Modal)
  const [editingProject, setEditingProject] = useState(null); // 'NEW' or project obj
  const [projectForm, setProjectForm] = useState({
    title: '', client: '', category: 'Commercial & Brand', format: '4K DCI 60FPS', runtime: '01:00',
    videoUrl: '', thumbnail: '', description: '', isPublished: true,
    camera: 'Sony FX3 S-Log3 4K', colorGrade: 'Custom LUT Grade + Film Grain',
    audioMix: '14-Layer Foley & Dialogue Isolation', pacing: 'Dynamic Retention Cuts',
    mediaType: '', tags: '',
  });

  // Social Post Form State (Modal)
  const [editingSocial, setEditingSocial] = useState(null);
  const [socialForm, setSocialForm] = useState({
    platform: 'Instagram Reel', url: '', title: '', caption: '', thumbnail: '', likes: '', isPublished: true,
  });

  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);

  const handleSaveFeatured = async (e) => {
    e.preventDefault();
    await setFeaturedSlots({ slot1Id, slot2Id, slot3Id });
    setFeaturedSaveNotice(true);
    setTimeout(() => setFeaturedSaveNotice(false), 3000);
  };

  const openNewProjectModal = () => {
    setProjectForm({
      title: '', client: '', category: 'Commercial & Brand', format: '4K 60FPS', runtime: '01:00',
      socialProvider: 'instagram', socialUrl: '', playbackUrl: '', videoUrl: '', aspectRatio: '16:9',
      thumbnail: '', description: '', isPublished: true,
      camera: 'Cinema 4K', colorGrade: 'Custom Film Emulation',
      audioMix: 'Mastered Broadcast Mix', pacing: 'Dynamic Retention Cut',
      mediaType: '', tags: '',
    });
    setEditingProject('NEW');
  };

  const openEditProjectModal = (proj) => {
    setProjectForm({
      title: proj.title, client: proj.client, category: proj.category, format: proj.format, runtime: proj.runtime,
      socialProvider: proj.socialProvider || 'none', socialUrl: proj.socialUrl || '',
      playbackUrl: proj.playbackUrl || proj.videoUrl || '', videoUrl: proj.playbackUrl || proj.videoUrl || '',
      aspectRatio: proj.aspectRatio || '16:9', thumbnail: proj.thumbnail, description: proj.description,
      isPublished: proj.isPublished,
      camera: proj.technicalBreakdown?.camera || 'Cinema 4K',
      colorGrade: proj.technicalBreakdown?.colorGrade || 'Rec.709 Pass',
      audioMix: proj.technicalBreakdown?.audioMix || 'Dialogue Isolation',
      pacing: proj.technicalBreakdown?.pacing || 'Retention Cut',
      mediaType: proj.mediaType || '',
      tags: (proj.tags || []).join(', '),
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
      mediaType: projectForm.mediaType || null,
      tags: projectForm.tags ? projectForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      technicalBreakdown: {
        camera: projectForm.camera,
        colorGrade: projectForm.colorGrade,
        audioMix: projectForm.audioMix,
        pacing: projectForm.pacing,
      },
    };

    if (editingProject === 'NEW') {
      await addPortfolioProject(payload);
    } else {
      await updatePortfolioProject(editingProject.id, payload);
    }
    setEditingProject(null);
  };

  const openNewSocialModal = () => {
    setSocialForm({ platform: 'Instagram Reel', url: '', title: '', caption: '', thumbnail: '', likes: '', isPublished: true });
    setEditingSocial('NEW');
  };

  const handleSaveSocial = async (e) => {
    e.preventDefault();
    const autoThumb = getAutoThumbnail(socialForm.url, socialForm.thumbnail);
    await addSocialPost({ ...socialForm, thumbnail: autoThumb });
    setEditingSocial(null);
  };

  const publishedProjects = portfolio.filter((p) => p.isPublished);
  const activeFeaturedCount = portfolio.filter((p) => p.isFeatured).length;

  const libraryItems = useMemo(() => {
    const q = librarySearch.toLowerCase();
    return portfolio
      .filter((p) => matchesLibraryFilter(p, libraryFilter))
      .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.client || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
      .sort(SORTS[librarySort] || SORTS.Newest);
  }, [portfolio, libraryFilter, librarySearch, librarySort]);

  return (
    <Scene variant="dark-editorial" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <p className="type-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Public storefront content management
            </p>
            <h1 className="type-h1">Portfolio &amp; editorial content control</h1>
            <p className="max-w-xl text-[12px] text-[var(--foreground-muted)]">
              Configure the 3 homepage featured slots, manage the video library, and curate Instagram community reels.
            </p>
          </div>
          <button onClick={() => onNavigate('/')} className="btn-ghost">View Public Storefront &rarr;</button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          {[
            { id: 'featured', label: `Featured Work (${activeFeaturedCount}/3)`, icon: Layers },
            { id: 'library', label: `Video Library (${portfolio.length})`, icon: Film },
            { id: 'social', label: `Instagram & Social (${social.length})`, icon: InstagramIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="u-focus flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] transition-colors"
                style={{
                  background: isActive ? 'var(--primary)' : 'var(--surface-alt)',
                  color: isActive ? 'var(--on-primary)' : 'var(--foreground-muted)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: FEATURED WORK (3 SLOTS) */}
        {activeTab === 'featured' && (
          <Reveal className="u-frame space-y-6 p-6 sm:p-8">
            <div className="max-w-2xl space-y-1">
              <h2 className="type-h3">Homepage featured work hierarchy</h2>
              <p className="text-[12px] text-[var(--foreground-muted)]">
                Designate which published portfolio items occupy the 3 editorial positions on the homepage: Slot 1 (dominant lead) + Slots 2 &amp; 3 (supporting).
              </p>
            </div>

            {featuredSaveNotice && (
              <div className="flex items-center gap-2 border p-3 font-mono text-[12px]" style={{ borderRadius: 'var(--radius-editorial)', borderColor: 'var(--success)', background: 'var(--success-muted)', color: 'var(--success)' }}>
                <Check size={14} /> Featured slots saved and live on homepage!
              </div>
            )}

            <form onSubmit={handleSaveFeatured} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                  { label: 'Slot #1 (Dominant Lead)', tag: 'Hero Showcase', value: slot1Id, setValue: setSlot1Id },
                  { label: 'Slot #2 (Supporting)', tag: 'Secondary', value: slot2Id, setValue: setSlot2Id },
                  { label: 'Slot #3 (Supporting)', tag: 'Tertiary', value: slot3Id, setValue: setSlot3Id },
                ].map((slot, i) => {
                  const chosen = portfolio.find((p) => p.id === slot.value);
                  return (
                    <div key={i} className="space-y-3 border border-[var(--border)] p-5" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-[var(--primary)]">{slot.label}</span>
                        <span className="u-tag !py-0.5">{slot.tag}</span>
                      </div>
                      <select value={slot.value} onChange={(e) => slot.setValue(e.target.value)} className="triphoria-input text-[12px]">
                        <option value="">-- No Project Assigned --</option>
                        {publishedProjects.map((p) => (
                          <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
                        ))}
                      </select>
                      {chosen ? (
                        <div className="space-y-2 pt-1">
                          <AspectFrame ratio={chosen.aspectRatio || '16:9'} radius="media">
                            <img src={chosen.thumbnail} alt={chosen.title} className="absolute inset-0 h-full w-full object-cover" />
                          </AspectFrame>
                          <div className="truncate text-[12px] font-medium text-[var(--foreground-strong)]">{chosen.title}</div>
                        </div>
                      ) : (
                        <div className="flex aspect-video items-center justify-center border border-dashed border-[var(--border)] font-mono text-[11px] text-[var(--foreground-subtle)]" style={{ borderRadius: 'var(--radius-media)' }}>
                          Slot empty
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end border-t border-[var(--border)] pt-4">
                <button type="submit" className="btn-primary">
                  <Save size={14} /> Save Featured Positions
                </button>
              </div>
            </form>
          </Reveal>
        )}

        {/* TAB 2: VIDEO LIBRARY */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <Reveal className="u-frame flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                {LIBRARY_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setLibraryFilter(f)}
                    className="u-focus px-3 py-1.5 font-mono text-[11px] transition-colors"
                    style={{
                      borderRadius: 'var(--radius-editorial)',
                      background: libraryFilter === f ? 'var(--primary)' : 'var(--surface-alt)',
                      color: libraryFilter === f ? 'var(--on-primary)' : 'var(--foreground-muted)',
                      fontWeight: libraryFilter === f ? 600 : 400,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]" />
                  <input
                    type="text" placeholder="Search title, client..." value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="triphoria-input w-full py-1.5 pl-8 text-[12px]"
                  />
                </div>
                <select value={librarySort} onChange={(e) => setLibrarySort(e.target.value)} className="triphoria-input py-1.5 text-[12px]">
                  {Object.keys(SORTS).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center border border-[var(--border)]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                  <button onClick={() => setLibraryView('grid')} className="u-focus p-2" style={{ background: libraryView === 'grid' ? 'var(--surface-alt)' : 'transparent', color: libraryView === 'grid' ? 'var(--primary)' : 'var(--foreground-subtle)' }} aria-label="Grid view">
                    <Grid3x3 size={14} />
                  </button>
                  <button onClick={() => setLibraryView('list')} className="u-focus p-2" style={{ background: libraryView === 'list' ? 'var(--surface-alt)' : 'transparent', color: libraryView === 'list' ? 'var(--primary)' : 'var(--foreground-subtle)' }} aria-label="List view">
                    <List size={14} />
                  </button>
                </div>
                <button onClick={openNewProjectModal} className="btn-primary shrink-0">
                  <Plus size={14} /> <span className="hidden sm:inline">Add Video</span>
                </button>
              </div>
            </Reveal>

            {libraryItems.length === 0 ? (
              <EmptyState icon={Film} title="No videos match" body="Adjust your filter or search, or add a new video to the library." />
            ) : libraryView === 'grid' ? (
              <Stagger speed="micro" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {libraryItems.map((proj) => (
                  <StaggerItem key={proj.id}>
                    <div className="u-frame space-y-3 p-0 overflow-hidden">
                      <div className="relative">
                        <AspectFrame ratio={proj.aspectRatio || '16:9'} radius="none" frame={false}>
                          <img src={proj.thumbnail} alt={proj.title} className="absolute inset-0 h-full w-full object-cover" />
                        </AspectFrame>
                        {proj.isFeatured && (
                          <span className="absolute right-2 top-2 rounded-full bg-[var(--primary)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--on-primary)]">
                            Slot #{proj.featuredSlot}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 px-4 pb-4">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--foreground-subtle)]">
                          <span className="text-[var(--primary)]">{proj.mediaType || proj.category}</span>
                          <span>&middot;</span>
                          <span>{proj.aspectRatio || '16:9'}</span>
                        </div>
                        <h3 className="truncate text-[13px] font-semibold text-[var(--foreground-strong)]">{proj.title}</h3>
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => toggleProjectPublish(proj.id)}
                            className="u-focus rounded-full border px-2.5 py-0.5 font-mono text-[10px]"
                            style={proj.isPublished
                              ? { background: 'var(--success-muted)', color: 'var(--success)', borderColor: 'var(--success)' }
                              : { background: 'var(--surface-alt)', color: 'var(--foreground-subtle)', borderColor: 'var(--border)' }}
                          >
                            {proj.isPublished ? 'Live' : 'Draft'}
                          </button>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setPreviewVideoUrl(proj.videoUrl)} className="u-focus p-1.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" title="Preview"><Eye size={13} /></button>
                            <button onClick={() => openEditProjectModal(proj)} className="u-focus p-1.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" title="Edit"><Edit3 size={13} /></button>
                            <button
                              onClick={() => { if (window.confirm(`Delete portfolio project "${proj.title}"?`)) deletePortfolioProject(proj.id); }}
                              className="u-focus p-1.5 text-[var(--foreground-subtle)] hover:text-[var(--error)]" title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <Reveal className="u-frame divide-y divide-[var(--border)] p-0">
                {libraryItems.map((proj) => (
                  <div key={proj.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-[var(--surface-hover)] md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-24 shrink-0">
                        <AspectFrame ratio={proj.aspectRatio || '16:9'} radius="media">
                          <img src={proj.thumbnail} alt={proj.title} className="absolute inset-0 h-full w-full object-cover" />
                        </AspectFrame>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-[var(--foreground-subtle)]">{proj.id}</span>
                          <span className="text-[var(--foreground-subtle)]">&bull;</span>
                          <span className="text-[var(--primary)]">{proj.mediaType || proj.category}</span>
                          {proj.isFeatured && <span className="u-tag !py-0.5">Slot #{proj.featuredSlot}</span>}
                        </div>
                        <h3 className="text-[14px] font-semibold text-[var(--foreground-strong)]">{proj.title}</h3>
                        <div className="text-[12px] text-[var(--foreground-muted)]">
                          Client: {proj.client} &middot; Runtime: {proj.runtime} &middot; Format: {proj.format}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 self-end md:self-center">
                      <button
                        onClick={() => toggleProjectPublish(proj.id)}
                        className="u-focus rounded-full border px-3 py-1 font-mono text-[11px]"
                        style={proj.isPublished
                          ? { background: 'var(--success-muted)', color: 'var(--success)', borderColor: 'var(--success)' }
                          : { background: 'var(--surface-alt)', color: 'var(--foreground-subtle)', borderColor: 'var(--border)' }}
                      >
                        {proj.isPublished ? 'Live' : 'Draft'}
                      </button>
                      <button onClick={() => setPreviewVideoUrl(proj.videoUrl)} className="btn-ghost !p-2" title="Preview"><Eye size={13} /></button>
                      <button onClick={() => openEditProjectModal(proj)} className="btn-ghost !p-2" title="Edit"><Edit3 size={13} /></button>
                      <button
                        onClick={() => { if (window.confirm(`Delete portfolio project "${proj.title}"?`)) deletePortfolioProject(proj.id); }}
                        className="u-focus p-2 text-[var(--foreground-subtle)] hover:text-[var(--error)]" title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </Reveal>
            )}
          </div>
        )}

        {/* TAB 3: SOCIAL / INSTAGRAM */}
        {activeTab === 'social' && (
          <Reveal className="u-frame space-y-6 p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="type-h3">Instagram &amp; social floor</h2>
                <p className="text-[12px] text-[var(--foreground-muted)]">Manage social clips shown on the public homepage community section.</p>
              </div>
              <button onClick={openNewSocialModal} className="btn-primary self-start sm:self-center">
                <Plus size={14} /> Add Social Post
              </button>
            </div>
            {social.length === 0 ? (
              <EmptyState icon={InstagramIcon} title="No social posts yet" body="Add a clip to populate the homepage community section." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {social.map((post) => (
                  <div key={post.id} className="flex flex-col justify-between space-y-3 border border-[var(--border)] p-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
                    <div className="space-y-2">
                      <AspectFrame ratio="1:1" radius="media">
                        <img src={post.thumbnail} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
                      </AspectFrame>
                      <div>
                        <h3 className="truncate text-[13px] font-semibold text-[var(--foreground-strong)]">{post.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--foreground-muted)]">{post.caption}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                      <button
                        onClick={() => toggleSocialPublish(post.id)}
                        className="u-focus rounded-full border px-2.5 py-0.5 font-mono text-[10px]"
                        style={post.isPublished
                          ? { background: 'var(--success-muted)', color: 'var(--success)', borderColor: 'var(--success)' }
                          : { background: 'var(--surface-alt)', color: 'var(--foreground-subtle)', borderColor: 'var(--border)' }}
                      >
                        {post.isPublished ? 'Live' : 'Draft'}
                      </button>
                      <div className="flex items-center gap-2">
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono text-[11px] text-[var(--primary)] hover:underline">
                          <ExternalLink size={12} /> URL
                        </a>
                        <button
                          onClick={() => { if (window.confirm('Delete this social clip?')) deleteSocialPost(post.id); }}
                          className="u-focus p-1 text-[var(--foreground-subtle)] hover:text-[var(--error)]"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
        )}
      </div>

      {/* Modal: Add/Edit Project */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto p-6">
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="type-eyebrow">Video library management</span>
                <h3 className="type-h3">{editingProject === 'NEW' ? 'Add New Video' : `Edit: ${editingProject.title}`}</h3>
              </div>
              <button onClick={() => setEditingProject(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Project Title" required value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} placeholder="e.g. Street Rush Japan 4K" />
                <Field label="Client / Brand Name" value={projectForm.client} onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })} placeholder="@brand.media" />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field as="select" label="Category" value={projectForm.category} onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}>
                  <option value="Commercial & Brand">Commercial &amp; Brand</option>
                  <option value="YouTube & Longform">YouTube &amp; Longform</option>
                  <option value="Reels & Shorts">Reels &amp; Shorts</option>
                </Field>
                <Field as="select" label="Media Type" value={projectForm.mediaType} onChange={(e) => setProjectForm({ ...projectForm, mediaType: e.target.value })} hint="Powers the video library filters">
                  <option value="">-- Unset --</option>
                  {MEDIA_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </Field>
                <Field label="Format / Resolution" value={projectForm.format} onChange={(e) => setProjectForm({ ...projectForm, format: e.target.value })} />
                <Field label="Runtime" value={projectForm.runtime} onChange={(e) => setProjectForm({ ...projectForm, runtime: e.target.value })} placeholder="01:30" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field as="select" label="Social Platform" value={projectForm.socialProvider} onChange={(e) => setProjectForm({ ...projectForm, socialProvider: e.target.value })}>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="none">None</option>
                </Field>
                <Field as="select" label="Aspect Ratio" value={projectForm.aspectRatio} onChange={(e) => setProjectForm({ ...projectForm, aspectRatio: e.target.value })}>
                  <option value="16:9">16:9 (Landscape Standard)</option>
                  <option value="9:16">9:16 (Vertical Reel / Story)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:5">4:5 (Portrait Feed)</option>
                </Field>
              </div>

              <Field
                label="Direct Playback Video URL (MP4 / Hosted Asset)" type="url" required
                placeholder="https://cdn.example.com/video.mp4"
                value={projectForm.playbackUrl}
                onChange={(e) => setProjectForm({ ...projectForm, playbackUrl: e.target.value, videoUrl: e.target.value })}
              />
              <Field
                label="Social Reference URL (View on Instagram ↗)" type="url"
                placeholder="https://www.instagram.com/reel/XXXXX/"
                value={projectForm.socialUrl}
                onChange={(e) => setProjectForm({ ...projectForm, socialUrl: e.target.value })}
              />
              <Field
                label="Tags" value={projectForm.tags}
                onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })}
                placeholder="comma, separated, tags"
                hint="Optional — comma-separated. Reserved for future search/filter use."
              />
              <Field as="textarea" rows={3} label="Project Editorial Description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />

              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setEditingProject(null)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Save Video &rarr;</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Social */}
      {editingSocial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="type-h3">Add Social Clip</h3>
              <button onClick={() => setEditingSocial(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveSocial} className="space-y-3">
              <Field label="Title" required value={socialForm.title} onChange={(e) => setSocialForm({ ...socialForm, title: e.target.value })} />
              <Field as="textarea" rows={2} label="Caption" value={socialForm.caption} onChange={(e) => setSocialForm({ ...socialForm, caption: e.target.value })} />
              <Field label="Instagram Post URL" type="url" required value={socialForm.url} onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })} />
              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setEditingSocial(null)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Save Clip &rarr;</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-3xl space-y-4 overflow-hidden p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="type-eyebrow">Media preview</span>
              <button onClick={() => setPreviewVideoUrl(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>
            <AspectFrame ratio="16:9" radius="media">
              <div className="absolute inset-0">
                <VideoPlayer src={previewVideoUrl} autoPlay />
              </div>
            </AspectFrame>
          </div>
        </div>
      )}
    </Scene>
  );
}

export default CMSManagerPage;
