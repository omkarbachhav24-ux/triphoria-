import React, { useState } from 'react';
import { 
  Film, ExternalLink, Filter, Search, Play, Check, AlertCircle 
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { VideoPlayer } from '../../components/common/VideoPlayer';

export const AdminOrdersPage = ({ onNavigate }) => {
  const { orders, approveOrder, rejectOrder, reassignEditor, approveFinalDelivery, requestRevision } = useOrders();
  const { editors } = useAuth();

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Modals
  const [approveModalOrder, setApproveModalOrder] = useState(null);
  const [selectedEditorId, setSelectedEditorId] = useState(editors[0]?.id || 'editor-01');
  const [adminNotesInput, setAdminNotesInput] = useState('');

  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const [revisionModalOrder, setRevisionModalOrder] = useState(null);
  const [revisionNotesInput, setRevisionNotesInput] = useState('');
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);

  // Filter orders
  const filteredOrders = orders.filter(ord => {
    const matchesStatus = filterStatus === 'ALL' || ord.status === filterStatus;
    const matchesSearch = 
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.details?.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider">
            STUDIO OPERATIONS ENGINE
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Orders &amp; Production Authority
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            Inspect customer briefs, verify Google Drive access, assign lead editors, and approve final deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => onNavigate('/admin/dashboard')}
            className="btn-ghost text-xs py-2 px-3 cursor-pointer"
          >
            Dashboard
          </button>
          <button 
            onClick={() => onNavigate('/admin/editors')}
            className="btn-ghost text-xs py-2 px-3 cursor-pointer"
          >
            Editor Team
          </button>
          <button 
            onClick={() => onNavigate('/admin/cms')}
            className="btn-ghost text-xs py-2 px-3 cursor-pointer"
          >
            Website CMS
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1A1A1A] p-4 rounded-[12px] border border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono text-[#6F7075] uppercase mr-2 flex items-center gap-1">
            <Filter size={12} /> Filter:
          </span>
          {['ALL', 'Pending Approval', 'In Progress', 'Review', 'Completed', 'Rejected'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`text-xs px-3 py-1.5 rounded-[6px] font-mono transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#00CDB8] text-[#111111] font-semibold'
                  : 'bg-white/[0.04] text-[#A1A1A6] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F7075]" />
          <input
            type="text"
            placeholder="Search projects, client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="triphoria-input pl-9 text-xs py-2 w-full"
          />
        </div>
      </div>

      {/* Main Grid: Orders Queue (7 cols) + Selected Order Dossier (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Orders Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex justify-between items-center text-xs font-mono text-[#6F7075] px-1">
            <span>PROJECT QUEUE ({filteredOrders.length})</span>
            <span>SELECT TO INSPECT</span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-white/[0.08] rounded-[12px] p-8 text-center text-xs text-[#6F7075] font-mono">
              No projects found matching the filter criteria.
            </div>
          ) : (
            filteredOrders.map(ord => {
              const isSelected = activeOrder?.id === ord.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`bg-[#1A1A1A] border rounded-[12px] p-5 space-y-3 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-[#00CDB8] shadow-[0_0_15px_rgba(0,205,184,0.15)] ring-1 ring-[#00CDB8]' 
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-[#00CDB8] font-bold">{ord.id}</span>
                        <span className="text-[#6F7075]">&bull;</span>
                        <span className="text-white font-medium">{ord.customerName}</span>
                        <span className="text-[#6F7075]">({ord.customerEmail})</span>
                      </div>
                      <h3 className="text-base font-semibold text-white">{ord.details?.projectName}</h3>
                    </div>

                    <StatusBadge status={ord.status} />
                  </div>

                  {ord.googleDriveUrl && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#00CDB8] truncate bg-black/40 p-2 rounded border border-white/[0.04]">
                      <Film size={12} className="shrink-0" />
                      <span className="truncate">{ord.googleDriveUrl}</span>
                      <a 
                        href={ord.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[#A1A1A6] hover:text-white ml-auto"
                        title="Open link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono text-[#6F7075]">
                    <div>
                      <span>Editor: </span>
                      <span className="text-white">{ord.assignedEditorName || 'Unassigned'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ord.status === 'Pending Approval' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setApproveModalOrder(ord);
                              setSelectedEditorId(editors[0]?.id || 'editor-01');
                            }}
                            className="btn-primary text-xs py-1 px-2.5 cursor-pointer font-semibold"
                          >
                            Approve &amp; Assign
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRejectModalOrder(ord);
                            }}
                            className="btn-danger text-xs py-1 px-2.5 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {ord.status === 'Review' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFinalDeliveryApprove(ord.id);
                          }}
                          className="btn-primary text-xs py-1 px-3 cursor-pointer flex items-center gap-1"
                        >
                          <Check size={12} />
                          <span>Approve Delivery</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Order Dossier (5 cols) */}
        <div className="lg:col-span-5 sticky top-24">
          {activeOrder ? (
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-6 space-y-6 shadow-xl">
              <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#00CDB8]">Project Dossier</span>
                  <h2 className="text-lg font-bold text-white">{activeOrder.details?.projectName}</h2>
                  <div className="text-xs font-mono text-[#6F7075]">{activeOrder.id} &middot; {activeOrder.packageName}</div>
                </div>
                <StatusBadge status={activeOrder.status} />
              </div>

              {/* Customer Google Drive Source Footage */}
              {activeOrder.googleDriveUrl && (
                <div className="bg-[#111111] border border-white/[0.06] rounded-[10px] p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] uppercase text-[#6F7075]">CUSTOMER FOOTAGE LINK</span>
                    <a 
                      href={activeOrder.googleDriveUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-[#00CDB8] hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>Open Drive</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="p-2.5 rounded bg-black/50 border border-white/[0.04] text-xs font-mono text-[#00CDB8] break-all">
                    {activeOrder.googleDriveUrl}
                  </div>
                </div>
              )}

              {/* Brief & Requirements */}
              <div className="bg-[#111111] border border-white/[0.06] rounded-[10px] p-4 space-y-2 text-xs">
                <span className="font-mono text-[10px] uppercase text-[#6F7075] block">Editorial Brief</span>
                <p className="text-[#A1A1A6] leading-relaxed whitespace-pre-line">
                  {activeOrder.details?.editingInstructions || activeOrder.details?.projectDescription || 'No detailed instructions provided.'}
                </p>
              </div>

              {/* Assigned Editor & Reassign */}
              <div className="bg-[#111111] border border-white/[0.06] rounded-[10px] p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] uppercase text-[#6F7075]">Assigned Lead Editor</span>
                  <span className="font-medium text-white">{activeOrder.assignedEditorName || 'None'}</span>
                </div>

                {activeOrder.status === 'In Progress' && (
                  <div className="pt-2 border-t border-white/[0.04] flex items-center gap-2">
                    <select
                      className="triphoria-input text-xs py-1.5 flex-1"
                      onChange={(e) => reassignEditor(activeOrder.id, e.target.value)}
                      defaultValue={activeOrder.assignedEditorId || ''}
                    >
                      <option value="" disabled>Reassign editor...</option>
                      {editors.map(ed => (
                        <option key={ed.id} value={ed.id}>{ed.name} ({ed.specialty})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Outputs Submissions */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08] text-xs">
                <span className="font-mono text-[10px] uppercase text-[#6F7075] block">
                  Output Version Submissions ({activeOrder.outputVersions?.length || 0})
                </span>

                {activeOrder.outputVersions?.length > 0 ? (
                  <div className="space-y-2">
                    {activeOrder.outputVersions.map((ver, i) => (
                      <div key={i} className="bg-[#111111] border border-white/[0.06] p-3 rounded-[8px] space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded bg-[#00CDB8]/15 text-[#00CDB8] font-mono text-[10px]">
                            {ver.version}
                          </span>
                          <span className="font-mono text-[#6F7075] text-[11px]">{ver.runtime}</span>
                        </div>
                        {ver.notes && <p className="text-xs text-[#A1A1A6] italic">&ldquo;{ver.notes}&rdquo;</p>}
                        {ver.url && (
                          <button
                            onClick={() => setPreviewVideoUrl(ver.url)}
                            className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                          >
                            <Play size={10} /> Preview Cut
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-[8px] bg-[#111111] text-[#6F7075] font-mono text-[11px]">
                    No output versions uploaded yet.
                  </div>
                )}
              </div>

              {/* Action Buttons for Selected Order */}
              {activeOrder.status === 'Pending Approval' && (
                <div className="pt-3 border-t border-white/[0.08] flex gap-3">
                  <button
                    onClick={() => {
                      setApproveModalOrder(activeOrder);
                      setSelectedEditorId(editors[0]?.id || 'editor-01');
                    }}
                    className="btn-primary text-xs py-2.5 px-4 font-semibold flex-1 cursor-pointer"
                  >
                    Approve &amp; Assign Editor
                  </button>
                  <button
                    onClick={() => setRejectModalOrder(activeOrder)}
                    className="btn-danger text-xs py-2.5 px-4 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}
              {activeOrder.status === 'Review' && (
                <div className="pt-3 border-t border-white/[0.08] flex gap-3">
                  <button
                    onClick={() => handleFinalDeliveryApprove(activeOrder.id)}
                    className="btn-primary text-xs py-2.5 px-4 font-semibold flex-1 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check size={12} />
                    <span>Approve Delivery</span>
                  </button>
                  <button
                    onClick={() => setRevisionModalOrder(activeOrder)}
                    className="btn-ghost text-[#A1A1A6] hover:text-white border border-white/[0.08] text-xs py-2.5 px-4 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle size={12} />
                    <span>Request Revision</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-8 text-center text-xs text-[#6F7075] font-mono">
              Select a project from the queue to inspect details.
            </div>
          )}
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          APPROVE & ASSIGN MODAL
      ───────────────────────────────────────────────────────────── */}
      {approveModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] border border-white/15 rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-xs font-mono text-[#00CDB8] uppercase">PRODUCTION AUTHORIZATION</span>
                <h3 className="text-lg font-bold text-white">Approve &amp; Assign Editor</h3>
              </div>
              <button onClick={() => setApproveModalOrder(null)} className="text-[#A1A1A6] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-[#111111] rounded-[8px] border border-white/[0.06] space-y-1">
                <span className="font-mono text-[#6F7075] block">PROJECT:</span>
                <div className="font-semibold text-white text-sm">{approveModalOrder.details?.projectName}</div>
                <div className="font-mono text-[#00CDB8] truncate">{approveModalOrder.googleDriveUrl}</div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Assign Lead Editor</label>
                <select
                  value={selectedEditorId}
                  onChange={e => setSelectedEditorId(e.target.value)}
                  className="triphoria-input text-xs"
                  required
                >
                  {editors.map(ed => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name} &mdash; {ed.specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Internal Admin Notes</label>
                <textarea
                  rows={2}
                  value={adminNotesInput}
                  onChange={e => setAdminNotesInput(e.target.value)}
                  placeholder="Special instructions or timeline priorities for the editor..."
                  className="triphoria-input text-xs resize-y"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setApproveModalOrder(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer"
                >
                  Authorize &amp; Dispatch &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          REJECT MODAL
      ───────────────────────────────────────────────────────────── */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] border border-white/15 rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-xs font-mono text-red-400 uppercase">PROJECT REJECTION</span>
                <h3 className="text-lg font-bold text-white">Decline Project Brief</h3>
              </div>
              <button onClick={() => setRejectModalOrder(null)} className="text-[#A1A1A6] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Rejection Justification Reason <span className="text-red-400">*</span></label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                  placeholder="Explain clearly why this brief cannot proceed (e.g., Google Drive link inaccessible, missing audio stems, unsupported codec)..."
                  className="triphoria-input text-xs resize-y"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setRejectModalOrder(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-danger text-xs py-2 px-5 font-semibold cursor-pointer bg-red-600 text-white"
                >
                  Confirm Rejection
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
              <span className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider">Output Preview</span>
              <button onClick={() => setPreviewVideoUrl(null)} className="text-[#A1A1A6] hover:text-white text-xs font-mono px-2 py-1">✕</button>
            </div>
            <div className="aspect-video bg-black rounded-[8px] overflow-hidden border border-white/10">
              <VideoPlayer src={previewVideoUrl} autoPlay />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          REQUEST REVISION MODAL
      ───────────────────────────────────────────────────────────── */}
      {revisionModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] border border-white/15 rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-xs font-mono text-[#00CDB8] uppercase">EDITORIAL REVISION</span>
                <h3 className="text-lg font-bold text-white">Request Revisions</h3>
              </div>
              <button onClick={() => setRevisionModalOrder(null)} className="text-[#A1A1A6] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRevisionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Revision Notes <span className="text-red-400">*</span></label>
                <textarea
                  rows={4}
                  required
                  value={revisionNotesInput}
                  onChange={e => setRevisionNotesInput(e.target.value)}
                  placeholder="Provide detailed feedback on what needs to be changed..."
                  className="triphoria-input text-xs resize-y"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setRevisionModalOrder(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRequestingRevision}
                  className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer"
                >
                  {isRequestingRevision ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
