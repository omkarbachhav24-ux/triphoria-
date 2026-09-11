import React, { useState } from 'react';
import {
  Film, ExternalLink, Filter, Search, Play, Check, AlertCircle, X,
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal } from '../../components/motion/Reveal';
import { VideoModal } from '../../components/video/VideoModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';

const STATUS_FILTERS = ['ALL', 'Pending Approval', 'In Progress', 'Review', 'Completed', 'Rejected'];

export function AdminOrdersPage({ onNavigate }) {
  const { orders, approveOrder, rejectOrder, reassignEditor, approveFinalDelivery, requestRevision } = useOrders();
  const { editors } = useAuth();

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [approveModalOrder, setApproveModalOrder] = useState(null);
  const [selectedEditorId, setSelectedEditorId] = useState(editors[0]?.id || 'editor-01');
  const [adminNotesInput, setAdminNotesInput] = useState('');

  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const [revisionModalOrder, setRevisionModalOrder] = useState(null);
  const [revisionNotesInput, setRevisionNotesInput] = useState('');
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  const [previewVersion, setPreviewVersion] = useState(null);

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = filterStatus === 'ALL' || ord.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      ord.id.toLowerCase().includes(q) ||
      (ord.details?.projectName || '').toLowerCase().includes(q) ||
      (ord.customerName || '').toLowerCase().includes(q) ||
      (ord.customerEmail || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!approveModalOrder) return;
    await approveOrder(approveModalOrder.id, selectedEditorId, adminNotesInput);
    setApproveModalOrder(null);
    setAdminNotesInput('');
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModalOrder) return;
    await rejectOrder(rejectModalOrder.id, rejectionReasonInput);
    setRejectModalOrder(null);
    setRejectionReasonInput('');
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!revisionModalOrder) return;
    setIsRequestingRevision(true);
    try {
      const res = await requestRevision(revisionModalOrder.id, revisionNotesInput);
      if (res.success && selectedOrder && selectedOrder.id === revisionModalOrder.id) {
        setSelectedOrder({ ...selectedOrder, status: 'In Progress' });
      }
      setRevisionModalOrder(null);
      setRevisionNotesInput('');
    } finally {
      setIsRequestingRevision(false);
    }
  };

  const handleFinalDeliveryApprove = async (orderId) => {
    if (window.confirm(`Authorize final delivery for ${orderId}?`)) {
      await approveFinalDelivery(orderId);
    }
  };

  const activeOrder = selectedOrder || filteredOrders[0] || null;

  return (
    <Scene variant="dark-editorial" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <p className="type-eyebrow">Studio operations engine</p>
            <h1 className="type-h1">Orders &amp; production authority</h1>
            <p className="max-w-xl text-[12px] text-[var(--foreground-muted)]">
              Inspect customer briefs, verify Google Drive access, assign lead editors, and approve final deliverables.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('/admin/dashboard')} className="btn-ghost">Dashboard</button>
            <button onClick={() => onNavigate('/admin/editors')} className="btn-ghost">Editor Team</button>
            <button onClick={() => onNavigate('/admin/cms')} className="btn-ghost">Website CMS</button>
          </div>
        </div>

        <div className="u-frame mb-6 flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 font-mono text-[11px] uppercase text-[var(--foreground-subtle)]">
              <Filter size={12} /> Filter:
            </span>
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className="u-focus px-3 py-1.5 font-mono text-[11px] transition-colors"
                style={{
                  borderRadius: 'var(--radius-editorial)',
                  background: filterStatus === st ? 'var(--primary)' : 'var(--surface-alt)',
                  color: filterStatus === st ? 'var(--on-primary)' : 'var(--foreground-muted)',
                  fontWeight: filterStatus === st ? 600 : 400,
                }}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            <input
              type="text"
              placeholder="Search projects, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="triphoria-input w-full py-2 pl-9 text-[12px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Orders queue (7 cols) */}
          <div className="space-y-3 lg:col-span-7">
            <div className="flex items-center justify-between px-1 font-mono text-[11px] text-[var(--foreground-subtle)]">
              <span>PROJECT QUEUE ({filteredOrders.length})</span>
              <span>SELECT TO INSPECT</span>
            </div>

            {filteredOrders.length === 0 ? (
              <EmptyState icon={Film} title="No projects found" body="No projects match the current filter and search criteria." />
            ) : (
              filteredOrders.map((ord) => {
                const isSelected = activeOrder?.id === ord.id;
                return (
                  <div
                    key={ord.id}
                    className="space-y-3 border p-5 transition-colors"
                    style={{ borderRadius: 'var(--radius-editorial)', borderColor: isSelected ? 'var(--primary)' : 'var(--border)', background: 'var(--surface)' }}
                  >
                    <button onClick={() => setSelectedOrder(ord)} className="u-focus block w-full space-y-3 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex min-w-0 items-center gap-2 truncate font-mono text-[11px]">
                            <span className="shrink-0 font-bold text-[var(--primary)]">{ord.id}</span>
                            <span className="shrink-0 text-[var(--foreground-subtle)]">&bull;</span>
                            <span className="truncate font-medium text-[var(--foreground-strong)]">{ord.customerName}</span>
                            <span className="truncate text-[var(--foreground-subtle)]">({ord.customerEmail})</span>
                          </div>
                          <h3 className="truncate text-[15px] font-semibold text-[var(--foreground-strong)]">{ord.details?.projectName}</h3>
                        </div>
                        <StatusBadge status={ord.status} />
                      </div>
                      {ord.googleDriveUrl && (
                        <div className="flex items-center gap-1.5 truncate border border-[var(--border)] p-2 font-mono text-[11px] text-[var(--primary)]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                          <Film size={12} className="shrink-0" />
                          <span className="truncate">{ord.googleDriveUrl}</span>
                        </div>
                      )}
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2 font-mono text-[11px] text-[var(--foreground-subtle)]">
                      <div>
                        <span>Editor: </span>
                        <span className="text-[var(--foreground-strong)]">{ord.assignedEditorName || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ord.status === 'Pending Approval' && (
                          <>
                            <button
                              onClick={() => { setApproveModalOrder(ord); setSelectedEditorId(editors[0]?.id || 'editor-01'); }}
                              className="btn-primary !py-1 !px-2.5 !text-[11px]"
                            >
                              Approve &amp; Assign
                            </button>
                            <button onClick={() => setRejectModalOrder(ord)} className="btn-danger !py-1 !px-2.5 !text-[11px]">
                              Reject
                            </button>
                          </>
                        )}
                        {ord.status === 'Review' && (
                          <button onClick={() => handleFinalDeliveryApprove(ord.id)} className="btn-primary !py-1 !px-2.5 !text-[11px]">
                            <Check size={12} /> Approve Delivery
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected order dossier (5 cols) */}
          <div className="lg:sticky lg:top-24 lg:col-span-5">
            {activeOrder ? (
              <Reveal key={activeOrder.id} className="u-frame space-y-5 p-6">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                  <div className="min-w-0">
                    <span className="type-eyebrow">Project dossier</span>
                    <h2 className="type-h3 truncate">{activeOrder.details?.projectName}</h2>
                    <div className="truncate font-mono text-[11px] text-[var(--foreground-subtle)]">{activeOrder.id} &middot; {activeOrder.packageName}</div>
                  </div>
                  <StatusBadge status={activeOrder.status} />
                </div>

                {activeOrder.googleDriveUrl && (
                  <div className="space-y-2 border border-[var(--border)] p-4 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Customer footage link</span>
                      <a href={activeOrder.googleDriveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono text-[11px] text-[var(--primary)] hover:underline">
                        Open Drive <ExternalLink size={11} />
                      </a>
                    </div>
                    <div className="break-all border border-[var(--border)] p-2.5 font-mono text-[11px] text-[var(--primary)]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      {activeOrder.googleDriveUrl}
                    </div>
                  </div>
                )}

                <div className="space-y-2 border border-[var(--border)] p-4 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                  <span className="block font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Editorial brief</span>
                  <p className="whitespace-pre-line leading-relaxed text-[var(--foreground-muted)]">
                    {activeOrder.details?.editingInstructions || activeOrder.details?.projectDescription || 'No detailed instructions provided.'}
                  </p>
                </div>

                <div className="space-y-3 border border-[var(--border)] p-4 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Assigned lead editor</span>
                    <span className="font-medium text-[var(--foreground-strong)]">{activeOrder.assignedEditorName || 'None'}</span>
                  </div>
                  {activeOrder.status === 'In Progress' && (
                    <select
                      className="triphoria-input py-1.5 text-[12px]"
                      onChange={(e) => reassignEditor(activeOrder.id, e.target.value)}
                      defaultValue={activeOrder.assignedEditorId || ''}
                    >
                      <option value="" disabled>Reassign editor...</option>
                      {editors.map((ed) => (
                        <option key={ed.id} value={ed.id}>{ed.name} ({ed.specialty})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                  <span className="block font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">
                    Output version submissions ({activeOrder.outputVersions?.length || 0})
                  </span>
                  {activeOrder.outputVersions?.length > 0 ? (
                    <div className="space-y-2">
                      {activeOrder.outputVersions.map((ver) => (
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
                      No output versions uploaded yet.
                    </div>
                  )}
                </div>

                {activeOrder.status === 'Pending Approval' && (
                  <div className="flex gap-3 border-t border-[var(--border)] pt-3">
                    <button
                      onClick={() => { setApproveModalOrder(activeOrder); setSelectedEditorId(editors[0]?.id || 'editor-01'); }}
                      className="btn-primary flex-1 justify-center"
                    >
                      Approve &amp; Assign Editor
                    </button>
                    <button onClick={() => setRejectModalOrder(activeOrder)} className="btn-danger">Reject</button>
                  </div>
                )}
                {activeOrder.status === 'Review' && (
                  <div className="flex gap-3 border-t border-[var(--border)] pt-3">
                    <button onClick={() => handleFinalDeliveryApprove(activeOrder.id)} className="btn-primary flex-1 justify-center">
                      <Check size={12} /> Approve Delivery
                    </button>
                    <button onClick={() => setRevisionModalOrder(activeOrder)} className="btn-ghost">
                      <AlertCircle size={12} /> Request Revision
                    </button>
                  </div>
                )}
              </Reveal>
            ) : (
              <EmptyState icon={Film} title="Nothing selected" body="Select a project from the queue to inspect details." />
            )}
          </div>
        </div>
      </div>

      {/* Approve & Assign Modal */}
      {approveModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-md space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="type-eyebrow">Production authorization</span>
                <h3 className="type-h3">Approve &amp; assign editor</h3>
              </div>
              <button onClick={() => setApproveModalOrder(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div className="space-y-1 border border-[var(--border)] p-3 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                <span className="block font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Project</span>
                <div className="text-[14px] font-semibold text-[var(--foreground-strong)]">{approveModalOrder.details?.projectName}</div>
                <div className="truncate font-mono text-[11px] text-[var(--primary)]">{approveModalOrder.googleDriveUrl}</div>
              </div>
              <Field as="select" label="Assign Lead Editor" value={selectedEditorId} onChange={(e) => setSelectedEditorId(e.target.value)} required>
                {editors.map((ed) => (
                  <option key={ed.id} value={ed.id}>{ed.name} &mdash; {ed.specialty}</option>
                ))}
              </Field>
              <Field as="textarea" rows={2} label="Internal Admin Notes" value={adminNotesInput} onChange={(e) => setAdminNotesInput(e.target.value)} placeholder="Special instructions or timeline priorities for the editor..." />
              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setApproveModalOrder(null)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Authorize &amp; Dispatch &rarr;</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-md space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="type-eyebrow !text-[var(--error)]">Project rejection</span>
                <h3 className="type-h3">Decline project brief</h3>
              </div>
              <button onClick={() => setRejectModalOrder(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <Field
                as="textarea" rows={3} required label="Rejection Justification Reason"
                value={rejectionReasonInput} onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Explain clearly why this brief cannot proceed (e.g., Google Drive link inaccessible, missing audio stems, unsupported codec)..."
              />
              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setRejectModalOrder(null)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-danger">Confirm Rejection</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {revisionModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-md space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="type-eyebrow">Editorial revision</span>
                <h3 className="type-h3">Request revisions</h3>
              </div>
              <button onClick={() => setRevisionModalOrder(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleRevisionSubmit} className="space-y-4">
              <Field
                as="textarea" rows={4} required label="Revision Notes"
                value={revisionNotesInput} onChange={(e) => setRevisionNotesInput(e.target.value)}
                placeholder="Provide detailed feedback on what needs to be changed..."
              />
              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setRevisionModalOrder(null)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isRequestingRevision} className="btn-primary disabled:opacity-50">
                  {isRequestingRevision ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <VideoModal
        open={!!previewVersion}
        onClose={() => setPreviewVersion(null)}
        src={previewVersion?.url}
        title={previewVersion ? `${activeOrder?.details?.projectName} · ${previewVersion.version}` : ''}
        eyebrow="Output cut preview"
        ratio={activeOrder?.details?.aspectRatio || '16:9'}
      />
    </Scene>
  );
}

export default AdminOrdersPage;
