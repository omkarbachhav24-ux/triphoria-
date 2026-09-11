import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, AlertCircle, Download, Film, ExternalLink } from 'lucide-react';
import { useOrders, STATE_EXPLANATIONS } from '../../context/OrderContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal } from '../../components/motion/Reveal';
import { AspectFrame } from '../../components/video/AspectFrame';
import { VideoPlayer } from '../../components/common/VideoPlayer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field } from '../../components/ui/Field';

/** Parse the `[REVISION DIRECTIVE - 2026-09-11 by Name]: notes` markers the
 * server appends to `instructions` on /revision into discrete timeline rows. */
function parseRevisionDirectives(instructions) {
  if (!instructions) return [];
  const re = /\[REVISION DIRECTIVE - (\d{4}-\d{2}-\d{2}) by ([^\]]+)\]:\s*([\s\S]*?)(?=\n\n\[REVISION DIRECTIVE|$)/g;
  const out = [];
  let m;
  while ((m = re.exec(instructions))) {
    out.push({ date: m[1], by: m[2], notes: m[3].trim() });
  }
  return out;
}

function buildTimeline(order) {
  if (!order) return [];
  const events = [];
  events.push({ at: order.createdAt, label: 'Project created', detail: order.details?.projectName });
  if (order.assignedEditorName) {
    events.push({ at: order.createdAt, label: `Editor assigned — ${order.assignedEditorName}` });
  }
  for (const v of order.outputVersions || []) {
    events.push({ at: v.uploadedAt, label: `${v.version} uploaded`, detail: v.uploadedBy ? `by ${v.uploadedBy}` : null });
  }
  for (const r of parseRevisionDirectives(order.details?.editingInstructions)) {
    events.push({ at: r.date, label: `Revision requested by ${r.by}`, detail: r.notes });
  }
  if (order.status === 'Completed') {
    events.push({ at: order.updatedAt, label: 'Final delivery approved' });
  }
  if (order.status === 'Rejected') {
    events.push({ at: order.updatedAt, label: 'Project rejected', detail: order.rejectionReason });
  }
  return events
    .filter((e) => e.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

export function CustomerProjectPage({ orderId, onNavigate }) {
  const { getOrderById, approveFinalDelivery, requestRevision, trackDownload } = useOrders();
  const [fetched, setFetched] = useState(null);
  const [fetchState, setFetchState] = useState('idle'); // idle | loading | notfound | forbidden | error
  const [activeVersionId, setActiveVersionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  const contextOrder = getOrderById ? getOrderById(orderId) : null;
  const order = contextOrder || fetched;

  // Deep-link / refresh support: fetch directly, scoped + authorized server-side.
  useEffect(() => {
    if (contextOrder || !orderId) return;
    let cancelled = false;
    setFetchState('loading');
    fetch(`/api/orders/${orderId}`, { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) return setFetchState('forbidden');
        if (res.status === 404) return setFetchState('notfound');
        if (!res.ok) return setFetchState('error');
        const data = await res.json();
        setFetched(data.order);
        setFetchState('idle');
      })
      .catch(() => !cancelled && setFetchState('error'));
    return () => {
      cancelled = true;
    };
  }, [orderId, contextOrder]);

  const versions = order?.outputVersions || [];
  const activeVersion = useMemo(
    () => versions.find((v) => v.id === activeVersionId) || versions[versions.length - 1] || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `order` is the stable dep; `versions` is derived from it each render
    [order, activeVersionId]
  );
  const timeline = useMemo(() => buildTimeline(order), [order]);

  if (fetchState === 'forbidden') {
    return (
      <Scene variant="black" className="flex min-h-[70vh] items-center justify-center px-4 py-20">
        <ErrorState title="Access denied" body="This project does not belong to your account." tone="error" />
      </Scene>
    );
  }
  if (fetchState === 'notfound') {
    return (
      <Scene variant="black" className="flex min-h-[70vh] items-center justify-center px-4 py-20">
        <ErrorState title="Project not found" body="Check the link, or return to your dashboard." tone="warning" />
      </Scene>
    );
  }
  if (!order) {
    return (
      <Scene variant="black" className="flex min-h-[70vh] items-center justify-center px-4 py-20">
        <EmptyState
          icon={Film}
          title={fetchState === 'error' ? 'Could not load this project' : 'Loading project…'}
          body={fetchState === 'error' ? 'Check your connection and try again.' : undefined}
        />
      </Scene>
    );
  }

  const canReview = order.status === 'Review';
  const canDownload = order.status === 'Completed';

  const handleApprove = async () => {
    if (!window.confirm('Approve this as the final delivery?')) return;
    setBusy(true);
    try {
      await approveFinalDelivery(order.id);
    } finally {
      setBusy(false);
    }
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!revisionNotes.trim()) return;
    setBusy(true);
    try {
      const res = await requestRevision(order.id, revisionNotes);
      if (res.success) {
        setRevisionOpen(false);
        setRevisionNotes('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Scene variant="black" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <button
          onClick={() => onNavigate('/dashboard')}
          className="u-focus mb-6 inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)]"
        >
          <ArrowLeft size={13} /> All projects
        </button>

        <Reveal>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
              <p className="type-eyebrow mb-2">{order.id}</p>
              <h1 className="type-h1">{order.details?.projectName}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-[var(--foreground-subtle)]">
                <span>{order.packageName}</span>
                <span>{order.details?.platform}</span>
                <span>Deadline {order.deadline}</span>
                {order.assignedEditorName && <span>Editor: {order.assignedEditorName}</span>}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </Reveal>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* video + review (8 cols) */}
          <div className="space-y-6 lg:col-span-8">
            <Reveal>
              {activeVersion ? (
                <AspectFrame ratio={order.details?.aspectRatio || '16:9'} radius="panel" className="w-full">
                  <VideoPlayer
                    playbackUrl={activeVersion.url}
                    title={`${order.details?.projectName} — ${activeVersion.version}`}
                    aspectRatio={order.details?.aspectRatio || '16:9'}
                    autoPlay={false}
                    className="!rounded-none"
                  />
                </AspectFrame>
              ) : (
                <EmptyState
                  icon={Film}
                  title={
                    order.status === 'Pending Approval'
                      ? 'Awaiting studio approval'
                      : order.status === 'In Progress'
                      ? 'Your editor is cutting this now'
                      : 'No cut uploaded yet'
                  }
                  body={STATE_EXPLANATIONS[order.status]}
                />
              )}
            </Reveal>

            {canReview && activeVersion && (
              <Reveal className="u-frame flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-[13px] text-[var(--foreground-muted)]">
                  Watched {activeVersion.version}? Approve it as final, or send it back with notes.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setRevisionOpen(true)} className="btn-ghost">
                    <AlertCircle size={13} /> Request Revision
                  </button>
                  <button onClick={handleApprove} disabled={busy} className="btn-primary">
                    <Check size={14} /> {busy ? 'Approving…' : 'Approve Final Cut'}
                  </button>
                </div>
              </Reveal>
            )}

            {canDownload && activeVersion && (
              <Reveal className="u-frame flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-[13px] text-[var(--foreground-muted)]">
                  Final delivery approved. Available for a 14-day review buffer.
                </p>
                <button
                  onClick={() => trackDownload(order.id, activeVersion.id, activeVersion.version, activeVersion.url)}
                  className="btn-primary"
                >
                  <Download size={14} /> Download Master
                </button>
              </Reveal>
            )}

            {/* version rail */}
            {versions.length > 0 && (
              <Reveal>
                <p className="type-label mb-3">Versions ({versions.length})</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setActiveVersionId(v.id)}
                      className={`u-focus shrink-0 rounded-[var(--radius-editorial)] border px-3.5 py-2.5 text-left transition-colors ${
                        activeVersion?.id === v.id
                          ? 'border-[var(--primary)] bg-[var(--primary-muted)]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-mono text-[12px]">
                        <span className="font-semibold text-[var(--foreground-strong)]">{v.version}</span>
                        {v.isAuthoritative && <span className="text-[var(--foreground-subtle)]">· master</span>}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-[var(--foreground-subtle)]">
                        {v.uploadedBy || 'editor'} · {v.runtime}
                      </div>
                    </button>
                  ))}
                </div>
                {activeVersion?.notes && (
                  <p className="mt-3 border-l-2 border-[var(--border)] pl-3 text-[13px] italic text-[var(--foreground-muted)]">
                    “{activeVersion.notes}”
                  </p>
                )}
              </Reveal>
            )}
          </div>

          {/* brief + timeline (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            <Reveal className="u-frame p-5">
              <p className="type-label mb-3">Brief</p>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--foreground-muted)]">
                {order.details?.projectDescription || 'No description provided.'}
              </p>
              {order.googleDriveUrl && (
                <a
                  href={order.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="u-focus mt-4 flex items-center gap-1.5 font-mono text-[12px] text-[var(--primary)] hover:underline"
                >
                  <Film size={12} /> Raw footage on Drive <ExternalLink size={11} />
                </a>
              )}
              {order.rejectionReason && (
                <ErrorState className="mt-4" title="Rejected" body={order.rejectionReason} />
              )}
            </Reveal>

            <Reveal className="u-frame p-5">
              <p className="type-label mb-4">Activity</p>
              <ol className="space-y-4 border-l border-[var(--border)] pl-4">
                {timeline.map((e, i) => (
                  <li key={i} className="relative text-[12px]">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[var(--primary)]" />
                    <div className="font-medium text-[var(--foreground-strong)]">{e.label}</div>
                    {e.detail && <div className="mt-0.5 text-[var(--foreground-muted)]">{e.detail}</div>}
                    <div className="mt-0.5 font-mono text-[10px] text-[var(--foreground-subtle)]">
                      {new Date(e.at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </div>

      {revisionOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <form
            onSubmit={handleRevisionSubmit}
            className="u-frame-elevated w-full max-w-md space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-[16px] font-bold text-[var(--foreground-strong)]">Request Revision</h3>
              <button type="button" onClick={() => setRevisionOpen(false)} className="text-[var(--foreground-muted)]" aria-label="Close">✕</button>
            </div>
            <Field
              as="textarea"
              label="What needs to change"
              required
              rows={4}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Be specific — this goes straight to your editor."
              hint="A meaningful reason is required before this can be submitted."
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setRevisionOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || !revisionNotes.trim()} className="btn-primary disabled:opacity-50">
                {busy ? 'Sending…' : 'Send Revision Notes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Scene>
  );
}

export default CustomerProjectPage;
