import React, { useMemo, useState } from 'react';
import { ArrowRight, Film, Play } from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem } from '../../components/motion/Reveal';
import { AspectFrame } from '../../components/video/AspectFrame';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

const NEEDS_ATTENTION = new Set(['Review']);

export function CustomerDashboard({ onNavigate }) {
  const { orders, loading } = useOrders();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(null);

  // The server already scopes GET /api/orders to the caller; this is a
  // defence-in-depth match, not the authorization boundary.
  const mine = useMemo(
    () => orders.filter((o) => !user || o.userId === user.id || o.customerEmail?.toLowerCase() === user.email?.toLowerCase()),
    [orders, user]
  );

  const attention = mine.filter((o) => NEEDS_ATTENTION.has(o.status));
  const sorted = [...mine].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const featured = sorted.find((o) => o.id === selectedId) || attention[0] || sorted[0] || null;

  if (loading && mine.length === 0) {
    return (
      <Scene variant="black" className="flex min-h-[60vh] items-center justify-center">
        <span className="font-mono text-[12px] text-[var(--primary)]">LOADING PROJECTS…</span>
      </Scene>
    );
  }

  if (mine.length === 0) {
    return (
      <Scene variant="black" className="flex min-h-[70vh] items-center justify-center px-4 py-20">
        <EmptyState
          icon={Film}
          title="No active projects yet"
          body="Your next edit starts here — name the project, drop a footage link, set a deadline."
          action={
            <button onClick={() => onNavigate('/order')} className="btn-primary">
              Start a Project <ArrowRight size={14} />
            </button>
          }
        />
      </Scene>
    );
  }

  const latestVersion = featured?.outputVersions?.[featured.outputVersions.length - 1];

  return (
    <Scene variant="black" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="type-eyebrow mb-1">Your workspace</p>
            <h1 className="type-h1">{user?.name?.split(' ')[0] || 'Your'} projects</h1>
          </div>
          <button onClick={() => onNavigate('/order')} className="btn-primary">
            Start a Project <ArrowRight size={14} />
          </button>
        </div>

        {attention.length > 0 && (
          <Reveal className="mb-8 flex items-center gap-3 border border-[var(--secondary)]/30 bg-[var(--secondary-muted)] px-4 py-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--secondary)]" />
            <p className="text-[13px] text-[var(--foreground)]">
              <strong>{attention.length}</strong> {attention.length === 1 ? 'project needs' : 'projects need'} your review.
            </p>
          </Reveal>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* active project hero (8 cols) */}
          <div className="lg:col-span-8">
            {featured && (
              <Reveal>
                <p className="type-label mb-3">
                  {NEEDS_ATTENTION.has(featured.status) ? 'Needs your review' : 'Active project'}
                </p>
                <button
                  onClick={() => onNavigate(`/dashboard/project/${featured.id}`)}
                  className="group u-focus block w-full text-left"
                >
                  <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
                    <AspectFrame ratio={featured.details?.aspectRatio || '9:16'} radius="panel" className="w-full">
                      {latestVersion ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-alt)]">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white">
                            <Play size={16} className="translate-x-[1px] fill-current" />
                          </span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-alt)]">
                          <Film size={22} className="text-[var(--foreground-subtle)]" />
                        </div>
                      )}
                    </AspectFrame>
                    <div className="flex flex-col justify-between py-1">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <StatusBadge status={featured.status} />
                        </div>
                        <h2 className="type-h2 transition-colors group-hover:text-[var(--primary)]">
                          {featured.details?.projectName}
                        </h2>
                        <p className="mt-2 font-mono text-[12px] text-[var(--foreground-subtle)]">
                          {featured.id} · {featured.packageName} · {featured.details?.platform}
                        </p>
                        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-[var(--foreground-muted)]">
                          {featured.assignedEditorName
                            ? `Editor: ${featured.assignedEditorName}`
                            : 'Awaiting studio review and editor assignment.'}
                          {latestVersion && ` · Latest: ${latestVersion.version}`}
                        </p>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--primary)]">
                        Open project <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </button>
              </Reveal>
            )}
          </div>

          {/* status tallies (4 cols) */}
          <div className="lg:col-span-4">
            <Reveal className="u-frame divide-y divide-[var(--border)] p-0">
              {[
                ['Pending Approval', mine.filter((o) => o.status === 'Pending Approval').length],
                ['In Progress', mine.filter((o) => o.status === 'In Progress').length],
                ['Review', mine.filter((o) => o.status === 'Review').length],
                ['Completed', mine.filter((o) => o.status === 'Completed').length],
              ].map(([label, count]) => (
                <div key={label} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[13px] text-[var(--foreground-muted)]">{label}</span>
                  <span className="font-mono text-[15px] font-semibold text-[var(--foreground-strong)]">{count}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </div>

        {/* project list */}
        <div className="mt-10">
          <p className="type-label mb-4">All projects ({mine.length})</p>
          <Stagger speed="micro" className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {sorted.map((o) => (
              <StaggerItem key={o.id}>
                <button
                  onClick={() => {
                    setSelectedId(o.id);
                    onNavigate(`/dashboard/project/${o.id}`);
                  }}
                  className="u-focus flex w-full flex-wrap items-center justify-between gap-3 py-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--foreground-subtle)]">
                      <span className="text-[var(--primary)]">{o.id}</span>
                      <span>·</span>
                      <span>{o.details?.platform}</span>
                    </div>
                    <div className="truncate text-[14px] font-semibold text-[var(--foreground-strong)]">
                      {o.details?.projectName}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-[var(--foreground-subtle)]">Due {o.deadline}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </Scene>
  );
}

export default CustomerDashboard;
