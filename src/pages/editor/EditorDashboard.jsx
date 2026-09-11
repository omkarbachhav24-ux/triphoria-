import React, { useMemo, useState } from 'react';
import {
  Scissors, Film, Play, Upload, ExternalLink, ArrowRight, X,
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem } from '../../components/motion/Reveal';
import { AspectFrame } from '../../components/video/AspectFrame';
import { VideoModal } from '../../components/video/VideoModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';

// Reject empty links and known throwaway/sample hosts so a real hosted
// deliverable URL is always what gets recorded against the order.
const SAMPLE_HOSTS = ['commondatastorage.googleapis.com', 'sample-videos.com', 'test-videos.co.uk'];
function isRealDeliverableUrl(url) {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return !SAMPLE_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const isOverdueOrToday = (deadline) => {
  if (!deadline) return false;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
};

// Lane classification derives strictly from server-authoritative order.status
// (+ deadline for the In-Progress split) — never fabricated client state.
function classify(order) {
  if (order.status === 'Review') return 'review';
  if (order.status === 'Completed' || order.status === 'Rejected') return 'completed';
  if (order.status === 'In Progress') {
    return isOverdueOrToday(order.deadline) ? 'today' : 'upcoming';
  }
  return 'upcoming'; // Pending Approval — assigned but not yet actionable by editor
}

function LaneCount({ label, count, active }) {
  return (
    <div
      className="flex items-center justify-between border-b-2 px-1 pb-3 text-[12px] font-mono uppercase tracking-wider"
      style={{ borderColor: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--foreground-strong)' : 'var(--foreground-subtle)' }}
    >
      <span>{label}</span>
      <span className="ml-2 font-semibold">{count}</span>
    </div>
  );
}

export function EditorDashboard() {
  const { orders, uploadEditorOutput } = useOrders();
  const { user } = useAuth();

  const [lane, setLane] = useState('today');
  const [activeId, setActiveId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [outputForm, setOutputForm] = useState(null);

  // Editor sees STRICTLY work assigned to them — the server already scopes
  // GET /api/orders this way; this filter is defence-in-depth, not the
  // authorization boundary.
  const assignedOrders = useMemo(
    () => orders.filter((o) => o.assignedEditorId === user?.id),
    [orders, user]
  );

  const lanes = useMemo(() => {
    const grouped = { today: [], upcoming: [], review: [], completed: [] };
    for (const o of assignedOrders) grouped[classify(o)].push(o);
    return grouped;
  }, [assignedOrders]);

  const laneOrders = lanes[lane] || [];
  const active = laneOrders.find((o) => o.id === activeId) || laneOrders[0] || null;

  const openUploadModal = (ord) => {
    const existingCount = ord.outputVersions?.length || 0;
    setOutputForm({
      version: `v1.${existingCount}`,
      runtime: ord.details?.targetLength || '00:10:00',
      downloadUrl: '',
      notes: '',
    });
    setUploadError('');
    setShowUploadModal(ord);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!showUploadModal) return;
    if (!isRealDeliverableUrl(outputForm.downloadUrl)) {
      setUploadError('Enter the real hosted URL of the finished cut (e.g. a client Drive / Frame.io / CDN link). Sample or placeholder links are not accepted.');
      return;
    }
    setUploadError('');
    const res = await uploadEditorOutput(showUploadModal.id, {
      version: outputForm.version,
      runtime: outputForm.runtime,
      downloadUrl: outputForm.downloadUrl,
      notes: outputForm.notes,
    });
    if (res.success) {
      setShowUploadModal(null);
      setLane('review');
    }
  };

  return (
    <Scene variant="dark-editorial" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <p className="type-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Editor production suite &middot; assigned queue only
            </p>
            <h1 className="type-h1">{user?.name?.split(' ')[0] || 'Editor'}&rsquo;s queue</h1>
            <p className="text-[12px] text-[var(--foreground-muted)]">
              {user?.specialty || 'Commercial & Narrative Post-Production'} &middot; access restricted to your assigned briefs only.
            </p>
          </div>
          <div className="u-frame flex items-center gap-4 px-4 py-2.5 font-mono text-[12px]">
            <div>
              <span className="block text-[10px] uppercase text-[var(--foreground-subtle)]">Active queue</span>
              <span className="text-[15px] font-bold text-[var(--primary)]">
                {assignedOrders.length} <span className="font-normal text-[var(--foreground-subtle)]">/ {user?.maxCapacity || 3} capacity</span>
              </span>
            </div>
          </div>
        </div>

        {assignedOrders.length === 0 ? (
          <Scene variant="black" className="flex min-h-[50vh] items-center justify-center py-16">
            <EmptyState
              icon={Scissors}
              title="No assigned projects"
              body="Studio administration has not routed any active briefs to your queue. Once an order is approved and assigned to you, it appears here."
            />
          </Scene>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-0 border-b border-[var(--border)] sm:grid-cols-4 sm:gap-x-6">
              <button onClick={() => setLane('today')} className="u-focus"><LaneCount label="Today" count={lanes.today.length} active={lane === 'today'} /></button>
              <button onClick={() => setLane('upcoming')} className="u-focus"><LaneCount label="Upcoming" count={lanes.upcoming.length} active={lane === 'upcoming'} /></button>
              <button onClick={() => setLane('review')} className="u-focus"><LaneCount label="In Review" count={lanes.review.length} active={lane === 'review'} /></button>
              <button onClick={() => setLane('completed')} className="u-focus"><LaneCount label="Completed" count={lanes.completed.length} active={lane === 'completed'} /></button>
            </div>

            {laneOrders.length === 0 ? (
              <EmptyState icon={Film} title="Nothing in this lane" body="Projects will appear here as their status changes." />
            ) : (
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Lane list (7 cols) */}
                <div className="lg:col-span-7">
                  <Stagger speed="micro" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {laneOrders.map((ord) => {
                      const isSelected = active?.id === ord.id;
                      const ratio = ord.outputVersions?.length ? '9:16' : '4:5';
                      return (
                        <StaggerItem key={ord.id}>
                          <div
                            className="space-y-3 border p-4 transition-colors"
                            style={{
                              borderRadius: 'var(--radius-editorial)',
                              borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                              background: 'var(--surface)',
                            }}
                          >
                            <button onClick={() => setActiveId(ord.id)} className="u-focus block w-full space-y-3 text-left">
                              <div className="flex gap-3">
                                <AspectFrame ratio={ratio} radius="media" className="w-20 shrink-0">
                                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-alt)]">
                                    <Film size={16} className="text-[var(--foreground-subtle)]" />
                                  </div>
                                </AspectFrame>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--foreground-subtle)]">
                                    <span className="text-[var(--primary)]">{ord.id}</span>
                                    <span>&middot;</span>
                                    <span className="truncate">{ord.details?.platform}</span>
                                  </div>
                                  <div className="truncate text-[13px] font-semibold text-[var(--foreground-strong)]">{ord.details?.projectName}</div>
                                  <div className="truncate text-[11px] text-[var(--foreground-subtle)]">{ord.customerName}</div>
                                  <StatusBadge status={ord.status} />
                                </div>
                              </div>
                            </button>
                            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 font-mono text-[11px] text-[var(--foreground-subtle)]">
                              <span>Due {ord.deadline}</span>
                              {ord.status === 'In Progress' && (
                                <button
                                  onClick={() => openUploadModal(ord)}
                                  className="btn-primary !py-1 !px-2.5 !text-[11px]"
                                >
                                  <Upload size={11} /> Upload
                                </button>
                              )}
                            </div>
                          </div>
                        </StaggerItem>
                      );
                    })}
                  </Stagger>
                </div>

                {/* Workspace panel (5 cols) */}
                <div className="lg:sticky lg:top-24 lg:col-span-5">
                  {active && (
                    <Reveal key={active.id} className="u-frame space-y-5 p-6">
                      <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                        <div>
                          <span className="type-eyebrow">Production brief</span>
                          <h2 className="type-h3">{active.details?.projectName}</h2>
                          <div className="font-mono text-[11px] text-[var(--foreground-subtle)]">{active.id} &middot; {active.packageName}</div>
                        </div>
                        <StatusBadge status={active.status} />
                      </div>

                      {active.googleDriveUrl && (
                        <div className="space-y-2 border border-[var(--border)] p-4 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                          <span className="block font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Customer footage repository</span>
                          <div className="flex items-center gap-2 truncate font-mono text-[12px] text-[var(--primary)]">
                            <Film size={13} className="shrink-0" />
                            <span className="truncate">{active.googleDriveUrl}</span>
                          </div>
                          <a href={active.googleDriveUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-2 w-full justify-center !py-1.5 !text-[11px]">
                            Access footage in Google Drive <ExternalLink size={11} />
                          </a>
                        </div>
                      )}

                      <div className="space-y-2 border border-[var(--border)] p-4 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                        <span className="block font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Editing directives</span>
                        <p className="whitespace-pre-line leading-relaxed text-[var(--foreground-muted)]">
                          {active.details?.editingInstructions || active.details?.projectDescription || 'No special directives provided.'}
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-[var(--border)] pt-3">
                        <div className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">
                          Delivered cuts ({active.outputVersions?.length || 0})
                        </div>
                        {active.outputVersions?.length > 0 ? (
                          <div className="space-y-2">
                            {active.outputVersions.map((ver) => (
                              <div key={ver.id || ver.version} className="space-y-2 border border-[var(--border)] p-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
                                <div className="flex items-center justify-between font-mono text-[11px]">
                                  <span className="u-tag !py-0.5">{ver.version}</span>
                                  <span className="text-[var(--foreground-subtle)]">{ver.runtime}</span>
                                </div>
                                {ver.notes && <p className="text-[12px] italic text-[var(--foreground-muted)]">&ldquo;{ver.notes}&rdquo;</p>}
                                {ver.url && (
                                  <button onClick={() => setPreviewVersion(ver)} className="btn-ghost !py-1 !px-2.5 !text-[11px]">
                                    <Play size={10} /> Preview cut
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed border-[var(--border)] p-3 font-mono text-[11px] text-[var(--foreground-subtle)]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                            No version uploaded yet.
                          </div>
                        )}
                      </div>

                      {active.status === 'In Progress' && (
                        <button onClick={() => openUploadModal(active)} className="btn-primary w-full justify-center">
                          <Upload size={13} /> Submit output cut for review
                        </button>
                      )}
                      {active.status === 'Review' && (
                        <p className="text-center font-mono text-[11px] text-[var(--foreground-subtle)]">
                          Awaiting client review of latest cut.
                        </p>
                      )}
                    </Reveal>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Output Cut Modal */}
      {showUploadModal && outputForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-lg space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="type-eyebrow">Deliverable cut intake</span>
                <h3 className="type-h3">Record finished master cut</h3>
              </div>
              <button onClick={() => setShowUploadModal(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="border p-3 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)', borderColor: 'var(--error)', background: 'var(--error-muted)', color: 'var(--error)' }}>
                  {uploadError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Version Tag" value={outputForm.version} onChange={(e) => setOutputForm({ ...outputForm, version: e.target.value })} required />
                <Field label="Cut Runtime" value={outputForm.runtime} onChange={(e) => setOutputForm({ ...outputForm, runtime: e.target.value })} placeholder="00:12:30" required />
              </div>
              <Field
                label="Hosted Deliverable URL"
                type="url"
                required
                value={outputForm.downloadUrl}
                onChange={(e) => { setOutputForm({ ...outputForm, downloadUrl: e.target.value }); setUploadError(''); }}
                placeholder="https://drive.google.com/... or Frame.io / CDN link to the finished cut"
                hint="TRIPHORIA stores this reference, not the video file, until durable storage is configured."
              />
              <Field
                as="textarea"
                rows={3}
                label="Editor Delivery Notes"
                value={outputForm.notes}
                onChange={(e) => setOutputForm({ ...outputForm, notes: e.target.value })}
                placeholder="Explain key cuts, revisions, music choices, or questions for client review..."
              />
              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setShowUploadModal(null)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Submit cut for review <ArrowRight size={14} /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      <VideoModal
        open={!!previewVersion}
        onClose={() => setPreviewVersion(null)}
        src={previewVersion?.url}
        title={previewVersion ? `${active?.details?.projectName} · ${previewVersion.version}` : ''}
        eyebrow="Output cut preview"
        ratio={active?.outputVersions?.length ? '9:16' : '16:9'}
      />
    </Scene>
  );
}

export default EditorDashboard;
