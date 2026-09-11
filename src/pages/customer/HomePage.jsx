import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Play, Plus, Minus } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem, TextReveal } from '../../components/motion/Reveal';
import { AspectFrame } from '../../components/video/AspectFrame';
import { VideoCard } from '../../components/video/VideoCard';
import { VideoModal } from '../../components/video/VideoModal';
import { EmptyState } from '../../components/ui/EmptyState';

/* ── media helpers ─────────────────────────────────────────────────────── */
const SAMPLE_HOSTS = /commondatastorage\.googleapis\.com|sample-videos|test-videos\.co\.uk/i;
const SAMPLE_NAMES = /BigBuckBunny|ElephantsDream|TearsOfSteel|WeAreGoingOnBullrun|ForBiggerBlazes/i;
const DIRECT_FILE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

const mediaSrc = (v) => v?.playbackUrl || v?.videoUrl || '';
const isRealMedia = (v) => {
  const s = mediaSrc(v);
  if (!s && !v?.socialUrl) return false;
  return !(SAMPLE_HOSTS.test(s) || SAMPLE_NAMES.test(s));
};
const previewFor = (v) => {
  const s = mediaSrc(v);
  return DIRECT_FILE.test(s) && !SAMPLE_HOSTS.test(s) ? s : undefined;
};
const realThumb = (v) =>
  v?.thumbnail && !/unsplash\.com\/photo-1509198397868/.test(v.thumbnail) ? v.thumbnail : '';

/* ── static, real content (capabilities the workflow actually supports) ── */
const SERVICES = [
  {
    name: 'Short-Form & Reels',
    tag: '9:16',
    body: 'Instagram Reels, YouTube Shorts, TikTok. Hook-first pacing, kinetic captions, sound design, and a vertical master export.',
  },
  {
    name: 'Long-Form',
    tag: '16:9',
    body: 'YouTube episodes, vlogs, interviews. Multi-cam sync, graphic callouts, colour and audio finishing, chaptered structure.',
  },
  {
    name: 'Content Repurposing',
    tag: 'Multi-format',
    body: 'One shoot, many cuts. A long-form edit plus the vertical clips pulled from it — same story, every placement.',
  },
  {
    name: 'Podcast Editing',
    tag: 'Audio + video',
    body: 'Dialogue clean-up, levelling, silence trims, and a synced video cut with speaker framing and lower-thirds.',
  },
  {
    name: 'Commercial & Brand',
    tag: 'Cinematic',
    body: 'Launch spots and brand films. Film-emulation grade, layered sound, and the multi-aspect deliverables a campaign needs.',
  },
  {
    name: 'Thumbnails & Assets',
    tag: 'Creative',
    body: 'Frame selection and thumbnail design that matches the edit, plus the cover and poster assets for each platform.',
  },
];

const STEPS = [
  { n: '01', t: 'Start a project', d: 'Name the project, choose the format and aspect ratio, set a deadline, write the brief.' },
  { n: '02', t: 'Share footage', d: 'Paste a Google Drive link to your raw footage. Nothing large uploads through us — your media stays where it is.' },
  { n: '03', t: 'Editor assigned', d: 'Studio verifies access and assigns a named editor. The project moves to In Progress.' },
  { n: '04', t: 'Editing', d: 'Your editor works from the brief. You can see who has it and when it is due at any point.' },
  { n: '05', t: 'Review', d: 'The first cut lands as a tracked version. You watch it and either approve or request a revision — with notes.' },
  { n: '06', t: 'Revision', d: 'Revision notes go straight back to the same editor. The next version lands the same way. Nothing is overwritten.' },
  { n: '07', t: 'Final delivery', d: 'You approve the final cut. The project is marked Completed and the delivery is available with a 14-day review buffer.' },
];

const PROBLEMS = [
  'Editing drags and you lose the week to it.',
  'Footage and feedback scatter across chats and drives.',
  'You never quite know what stage a video is at.',
  'Versions blur together — which one is final?',
  'A freelancer goes quiet and the deadline slips.',
];
const ANSWERS = [
  'A named editor owns the cut, end to end.',
  'One project record: brief, footage link, every version.',
  'A live status — Pending, In Progress, Review, Completed.',
  'Numbered versions, kept. Final is explicit.',
  'A deadline on every project and a studio watching them.',
];

export function HomePage({ onNavigate }) {
  const { portfolio, featured, loading } = useCMS();
  const [openVideo, setOpenVideo] = useState(null);
  const [openService, setOpenService] = useState(0);

  const realFeatured = useMemo(
    () =>
      (featured || [])
        .filter((v) => v.isPublished !== false && isRealMedia(v))
        .sort((a, b) => (a.featuredSlot || 99) - (b.featuredSlot || 99))
        .slice(0, 3),
    [featured]
  );
  const showreel = useMemo(
    () => (portfolio || []).filter((v) => v.isPublished !== false && isRealMedia(v)).slice(0, 6),
    [portfolio]
  );
  const heroVideo = realFeatured[0] || showreel[0] || null;

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <Scene variant="black" className="relative overflow-hidden pt-14 md:pt-20">
        <div className="film-grid-env pointer-events-none absolute inset-0 opacity-[0.5]" />
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 pb-20 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:pb-28">
          <div>
            <Reveal>
              <p className="type-eyebrow mb-5">Post-production workflow</p>
            </Reveal>
            <h1 className="type-display">
              <TextReveal text="Video production," as="span" />
              <br />
              <TextReveal text="without the" as="span" delay={0.05} />{' '}
              <span className="text-[var(--primary)]">
                <TextReveal text="chaos." as="span" delay={0.1} />
              </span>
            </h1>
            <Reveal delay={0.15}>
              <p className="type-body-lg mt-6 max-w-xl">
                You record. TRIPHORIA runs the workflow — a named editor, tracked
                versions, structured review, and a clear delivery state. You always
                know exactly where your video is.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button onClick={() => onNavigate('/order')} className="btn-primary-lg">
                  Start a Project <ArrowRight size={16} />
                </button>
                <button onClick={() => onNavigate('/work')} className="btn-ghost">
                  <Play size={13} /> View Work
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal direction="left" delay={0.1}>
            <div className="relative">
              <AspectFrame ratio="9:16" radius="panel" className="mx-auto w-full max-w-[340px]">
                {heroVideo ? (
                  <button
                    onClick={() => setOpenVideo(heroVideo)}
                    className="group u-focus absolute inset-0"
                    aria-label={`Play ${heroVideo.title}`}
                  >
                    {realThumb(heroVideo) ? (
                      <img
                        src={realThumb(heroVideo)}
                        alt={heroVideo.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[var(--surface-alt)]" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
                        <Play size={18} className="translate-x-[2px] fill-current" />
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--surface-alt)] p-6 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--foreground-subtle)]">
                      Featured reel
                    </span>
                    <span className="text-[12px] text-[var(--foreground-subtle)]">
                      Set in Studio&nbsp;Control → Video Library
                    </span>
                  </div>
                )}
              </AspectFrame>

              {/* production-UI overlays (generic labels, not project data) */}
              <div className="pointer-events-none absolute left-3 top-3 hidden flex-col gap-2 xl:flex">
                <span className="u-tag whitespace-nowrap bg-[var(--background)]/80 backdrop-blur-sm">
                  9:16 · Reel master
                </span>
              </div>
              <div className="pointer-events-none absolute bottom-3 right-3 hidden flex-col items-end gap-2 xl:flex">
                <span className="u-tag whitespace-nowrap bg-[var(--background)]/80 backdrop-blur-sm">
                  Tracked versions
                </span>
                <span className="u-tag whitespace-nowrap bg-[var(--background)]/80 backdrop-blur-sm">
                  Named editor
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </Scene>

      {/* ── SHOWREEL STRIP ───────────────────────────────────────────── */}
      <Scene variant="dark-editorial" className="border-y border-[var(--border)] py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <Reveal>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="type-eyebrow mb-2">Recent cuts</p>
                <h2 className="type-h2">Work in motion</h2>
              </div>
              <button
                onClick={() => onNavigate('/work')}
                className="u-focus inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)]"
              >
                All work <ArrowUpRight size={13} />
              </button>
            </div>
          </Reveal>

          {showreel.length > 0 ? (
            <Stagger
              speed="standard"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
            >
              {showreel.map((v) => (
                <StaggerItem key={v.id}>
                  <VideoCard
                    title={v.title}
                    creator={v.client}
                    category={v.category}
                    poster={realThumb(v)}
                    previewSrc={previewFor(v)}
                    ratio="9:16"
                    duration={v.runtime}
                    badge={v.aspectRatio === '16:9' ? 'LONG' : 'REEL'}
                    onOpen={() => setOpenVideo(v)}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState
              icon={Play}
              title={loading ? 'Loading work…' : 'The reel is being curated'}
              body="Published portfolio pieces appear here. Add real media in Studio Control → Video Library."
            />
          )}
        </div>
      </Scene>

      {/* ── HOW IT WORKS (the real state machine) ────────────────────── */}
      <Scene variant="paper" id="how-it-works" className="py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <Reveal>
            <p className="type-eyebrow mb-3">How it works</p>
            <h2 className="type-h1 max-w-2xl">
              One project record, from brief to delivered.
            </h2>
            <p className="type-body-lg mt-4 max-w-xl">
              These aren't marketing steps — they're the states every project moves
              through in the app. The status you see is the status the studio sees.
            </p>
          </Reveal>

          <Stagger speed="standard" className="mt-12 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {STEPS.map((s) => (
              <StaggerItem
                key={s.n}
                className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 py-5 sm:grid-cols-[80px_240px_1fr] sm:py-6"
              >
                <span className="font-mono text-[13px] text-[var(--primary)]">{s.n}</span>
                <span className="text-[15px] font-semibold text-[var(--foreground-strong)] sm:text-[16px]">
                  {s.t}
                </span>
                <span className="col-span-2 text-[13px] leading-relaxed text-[var(--foreground-muted)] sm:col-span-1 sm:text-[14px]">
                  {s.d}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Scene>

      {/* ── SELECTED WORK (CMS featured, editorial asymmetry) ────────── */}
      <Scene variant="black" id="work" className="py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <Reveal>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="type-eyebrow mb-2">Selected work</p>
                <h2 className="type-h1">Three cuts, front and centre.</h2>
              </div>
              <button onClick={() => onNavigate('/work')} className="btn-ghost">
                See the full library <ArrowRight size={14} />
              </button>
            </div>
          </Reveal>

          {realFeatured.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-12">
              <Reveal className="lg:col-span-7" direction="up">
                <FeatureTile v={realFeatured[0]} onOpen={() => setOpenVideo(realFeatured[0])} large />
              </Reveal>
              <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
                {realFeatured.slice(1, 3).map((v, i) => (
                  <Reveal key={v.id} delay={0.08 * (i + 1)}>
                    <FeatureTile v={v} onOpen={() => setOpenVideo(v)} />
                  </Reveal>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Play}
              title={loading ? 'Loading featured work…' : 'No featured work selected'}
              body="An admin picks exactly three featured videos in Studio Control → Featured Work. The homepage reflects that selection."
              action={
                <button onClick={() => onNavigate('/admin/cms')} className="btn-ghost">
                  Open Featured Work
                </button>
              }
            />
          )}
        </div>
      </Scene>

      {/* ── WHY TRIPHORIA (problem / answer) ─────────────────────────── */}
      <Scene variant="dark-editorial" id="about" className="border-y border-[var(--border)] py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <Reveal>
            <p className="type-eyebrow mb-3">Why TRIPHORIA</p>
            <h2 className="type-h1 max-w-2xl">The chaos is the problem. The record is the fix.</h2>
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-editorial)] border border-[var(--border)] bg-[var(--border)] md:grid-cols-2">
            <div className="space-y-4 bg-[var(--background)] p-6 sm:p-8">
              <p className="type-label text-[var(--foreground-subtle)]">Without a workflow</p>
              <ul className="space-y-3">
                {PROBLEMS.map((p) => (
                  <li key={p} className="flex gap-3 text-[14px] leading-relaxed text-[var(--foreground-muted)]">
                    <Minus size={16} className="mt-0.5 shrink-0 text-[var(--error)]" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4 bg-[var(--background-elevated)] p-6 sm:p-8">
              <p className="type-label text-[var(--primary)]">With TRIPHORIA</p>
              <ul className="space-y-3">
                {ANSWERS.map((a) => (
                  <li key={a} className="flex gap-3 text-[14px] leading-relaxed text-[var(--foreground)]">
                    <Plus size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Scene>

      {/* ── SERVICES ─────────────────────────────────────────────────── */}
      <Scene variant="paper" id="services" className="py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <Reveal>
            <p className="type-eyebrow mb-3">Services</p>
            <h2 className="type-h1 max-w-2xl">What the studio takes on.</h2>
          </Reveal>
          <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col border-t border-[var(--border)]">
              {SERVICES.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setOpenService(i)}
                  className={`u-focus flex items-center justify-between border-b border-[var(--border)] py-4 text-left transition-colors ${
                    openService === i
                      ? 'text-[var(--foreground-strong)]'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)]'
                  }`}
                >
                  <span className="text-[15px] font-semibold">{s.name}</span>
                  <span className="u-tag shrink-0">{s.tag}</span>
                </button>
              ))}
            </div>
            <Reveal key={openService} className="u-frame p-8 sm:p-10">
              <p className="type-label mb-3 text-[var(--foreground-subtle)]">
                {SERVICES[openService].tag}
              </p>
              <h3 className="type-h2 mb-3">{SERVICES[openService].name}</h3>
              <p className="type-body max-w-lg">{SERVICES[openService].body}</p>
              <button onClick={() => onNavigate('/order')} className="btn-primary mt-8">
                Brief this project <ArrowRight size={14} />
              </button>
            </Reveal>
          </div>
        </div>
      </Scene>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <Scene variant="teal" id="contact" className="py-24 md:py-32">
        <div className="mx-auto max-w-[900px] px-4 text-center md:px-8">
          <Reveal>
            <h2 className="type-display">Put a video into the workflow.</h2>
            <p className="type-body-lg mx-auto mt-5 max-w-lg text-[var(--foreground-muted)]">
              Name the project, drop a footage link, set a deadline. An editor picks
              it up from there.
            </p>
            <button onClick={() => onNavigate('/order')} className="btn-primary-lg mx-auto mt-9">
              Start a Project <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </Scene>

      <VideoModal
        open={!!openVideo}
        onClose={() => setOpenVideo(null)}
        src={openVideo ? mediaSrc(openVideo) : ''}
        socialUrl={openVideo?.socialUrl || ''}
        socialProvider={openVideo?.socialProvider || 'none'}
        poster={openVideo ? realThumb(openVideo) : ''}
        title={openVideo?.title || ''}
        eyebrow={openVideo?.category || 'Selected work'}
        ratio={openVideo?.aspectRatio || '16:9'}
      />
    </>
  );
}

function FeatureTile({ v, onOpen, large = false }) {
  const thumb = realThumb(v);
  return (
    <button onClick={onOpen} className="group u-focus block w-full text-left" aria-label={`Play ${v.title}`}>
      <AspectFrame ratio={v.aspectRatio || (large ? '16:9' : '9:16')} radius="media" className="w-full">
        {thumb ? (
          <img
            src={thumb}
            alt={v.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--surface-alt)]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Play size={15} className="translate-x-[1px] fill-current" />
        </span>
        <div className="absolute inset-x-4 bottom-4">
          <div className={`font-semibold text-white ${large ? 'text-lg' : 'text-[14px]'}`}>{v.title}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-white/70">
            {v.client && <span>{v.client}</span>}
            {v.format && <span>{v.format}</span>}
            {v.runtime && <span>{v.runtime}</span>}
          </div>
        </div>
      </AspectFrame>
    </button>
  );
}

export default HomePage;
