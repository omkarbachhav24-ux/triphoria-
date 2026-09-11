import React, { useMemo, useState } from 'react';
import { Search, ArrowRight, Play } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem } from '../../components/motion/Reveal';
import { VideoCard } from '../../components/video/VideoCard';
import { VideoModal } from '../../components/video/VideoModal';
import { EmptyState } from '../../components/ui/EmptyState';

const SAMPLE = /commondatastorage\.googleapis\.com|sample-videos|BigBuckBunny|ElephantsDream|TearsOfSteel|WeAreGoingOnBullrun|ForBiggerBlazes/i;
const DIRECT_FILE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

const src = (v) => v?.playbackUrl || v?.videoUrl || '';
const isReal = (v) => {
  const s = src(v);
  return (Boolean(s) || Boolean(v?.socialUrl)) && !SAMPLE.test(s);
};
const previewFor = (v) => (DIRECT_FILE.test(src(v)) && !SAMPLE.test(src(v)) ? src(v) : undefined);
const thumbOf = (v) =>
  v?.thumbnail && !/unsplash\.com\/photo-1509198397868/.test(v.thumbnail) ? v.thumbnail : '';
const isVertical = (v) => v?.aspectRatio === '9:16' || v?.aspectRatio === '4:5';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'vertical', label: 'Reels & Shorts' },
  { id: 'long', label: 'Long Form' },
  { id: 'featured', label: 'Featured' },
];

export function WorkPage({ onNavigate }) {
  const { portfolio, loading } = useCMS();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);

  const published = useMemo(
    () => (portfolio || []).filter((v) => v.isPublished !== false && isReal(v)),
    [portfolio]
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return published
      .filter((v) => {
        if (filter === 'vertical' && !isVertical(v)) return false;
        if (filter === 'long' && isVertical(v)) return false;
        if (filter === 'featured' && !v.isFeatured) return false;
        if (term) {
          const hay = `${v.title || ''} ${v.client || ''} ${v.category || ''}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }, [published, filter, q]);

  return (
    <>
      <Scene variant="black" className="pt-16 md:pt-24">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <Reveal>
            <p className="type-eyebrow mb-3">Selected work</p>
            <h1 className="type-display max-w-3xl">The library.</h1>
            <p className="type-body-lg mt-5 max-w-xl">
              Every published cut, newest first. Vertical is the default format —
              filter the rest as you need.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-col gap-4 border-y border-[var(--border)] py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={filter === f.id}
                    className={`u-focus shrink-0 rounded-[var(--radius-editorial)] px-3 py-1.5 font-mono text-[12px] transition-colors ${
                      filter === f.id
                        ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title, client, category"
                  className="triphoria-input pl-9 text-[13px]"
                  aria-label="Search work"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </Scene>

      <Scene variant="dark-editorial" className="border-t border-[var(--border)] py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          {results.length > 0 ? (
            <Stagger
              speed="standard"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {results.map((v) => (
                <StaggerItem key={v.id}>
                  {/* Uniform 4:5 frame keeps the library grid calm while still
                      reading as portrait-first. The modal shows the true ratio. */}
                  <VideoCard
                    title={v.title}
                    creator={v.client}
                    category={v.category}
                    platform={v.format}
                    poster={thumbOf(v)}
                    previewSrc={previewFor(v)}
                    ratio="4:5"
                    duration={v.runtime}
                    featured={v.isFeatured}
                    badge={isVertical(v) ? 'REEL' : 'LONG'}
                    onOpen={() => setOpen(v)}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState
              icon={Play}
              title={
                loading
                  ? 'Loading library…'
                  : published.length === 0
                  ? 'No published work yet'
                  : 'Nothing matches that filter'
              }
              body={
                published.length === 0
                  ? 'Published portfolio pieces with real media appear here. Add them in Studio Control → Video Library.'
                  : 'Try a different filter or clear the search.'
              }
              action={
                published.length === 0 ? (
                  <button onClick={() => onNavigate('/admin/cms')} className="btn-ghost">
                    Open Video Library
                  </button>
                ) : null
              }
            />
          )}
        </div>
      </Scene>

      <Scene variant="teal" className="py-20 md:py-24">
        <div className="mx-auto max-w-[820px] px-4 text-center md:px-8">
          <Reveal>
            <h2 className="type-h1">Want your cut in here?</h2>
            <p className="type-body-lg mx-auto mt-4 max-w-md text-[var(--foreground-muted)]">
              Start a project and it runs through the same workflow.
            </p>
            <button onClick={() => onNavigate('/order')} className="btn-primary-lg mx-auto mt-8">
              Start a Project <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </Scene>

      <VideoModal
        open={!!open}
        onClose={() => setOpen(null)}
        src={open ? src(open) : ''}
        socialUrl={open?.socialUrl || ''}
        socialProvider={open?.socialProvider || 'none'}
        poster={open ? thumbOf(open) : ''}
        title={open?.title || ''}
        eyebrow={open?.category || 'Selected work'}
        ratio={open?.aspectRatio || '16:9'}
        meta={
          open ? (
            <>
              {open.client && <span>{open.client}</span>}
              {open.format && <span>{open.format}</span>}
              {open.runtime && <span>{open.runtime}</span>}
              {open.technicalBreakdown?.colorGrade && <span>{open.technicalBreakdown.colorGrade}</span>}
            </>
          ) : null
        }
      />
    </>
  );
}

export default WorkPage;
