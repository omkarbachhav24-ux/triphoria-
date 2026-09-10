import React, { useState } from 'react';
import { 
  Film, FileText, Clock, CheckCircle2, Download, 
  ArrowRight, ExternalLink, Play, AlertCircle, Eye, Check
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { VideoPlayer } from '../../components/common/VideoPlayer';

export const CustomerDashboard = ({ onNavigate }) => {
  const { orders, trackDownload, approveFinalDelivery, requestRevision } = useOrders();
  const { user } = useAuth();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [revisionModalOrder, setRevisionModalOrder] = useState(null);
  const [revisionNotesInput, setRevisionNotesInput] = useState('');
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  // Customer sees strictly their own projects
  const clientOrders = orders.filter(ord => {
    if (!user) return false;
    return ord.customerEmail?.toLowerCase() === user.email?.toLowerCase() || ord.userId === user.id;
  });

  // Meaningful operational tallies
  const pendingCount = clientOrders.filter(o => o.status === 'Pending Approval').length;
  const inProgressCount = clientOrders.filter(o => o.status === 'In Progress').length;
  const reviewCount = clientOrders.filter(o => o.status === 'Review').length;
  const completedCount = clientOrders.filter(o => o.status === 'Completed').length;

  const handleDownloadDeliverable = (order, version) => {
    trackDownload(order.id, version.id || version.versionId, version.filename || 'master.mp4', version.url || version.downloadUrl);
  };

  const handleApproveCut = async (orderId) => {
    setIsApproving(true);
    try {
      await approveFinalDelivery(orderId);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'Completed' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsApproving(false);
    }
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

  const activeSelected = selectedOrder || clientOrders[0] || null;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider">
            CUSTOMER PRODUCTION WORKSPACE
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Video Projects
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            Track editorial progress, review delivered cuts, and access final master exports.
          </p>
        </div>

        <button 
          onClick={() => onNavigate('/order')}
          className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,205,184,0.25)] self-start sm:self-auto"
        >
          <span>Start New Project</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Operational State Tally */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#1A1A1A] border border-white/[0.08] rounded-[10px] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-[#A1A1A6]">Waiting for Team</div>
          <div className="text-2xl font-mono font-bold text-amber-400">{pendingCount}</div>
          <div className="text-[11px] text-[#6F7075]">Pending Approval</div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/[0.08] rounded-[10px] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-[#A1A1A6]">Being Edited</div>
          <div className="text-2xl font-mono font-bold text-[#00CDB8]">{inProgressCount}</div>
          <div className="text-[11px] text-[#6F7075]">In Progress</div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/[0.08] rounded-[10px] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-[#A1A1A6]">Ready for Review</div>
          <div className="text-2xl font-mono font-bold text-[#B7A8FF]">{reviewCount}</div>
          <div className="text-[11px] text-[#B7A8FF]">Cut Available</div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/[0.08] rounded-[10px] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-[#A1A1A6]">Final Videos</div>
          <div className="text-2xl font-mono font-bold text-[#34D399]">{completedCount}</div>
          <div className="text-[11px] text-[#6F7075]">Master Delivered</div>
        </div>
      </div>

      {clientOrders.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-[#00CDB8]">
            <Film size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">No active projects yet</h3>
          <p className="text-xs text-[#A1A1A6] leading-relaxed">
            Provide your creative brief and Google Drive footage link to launch your first edit with TRIPHORIA.
          </p>
          <button 
            onClick={() => onNavigate('/order')}
            className="btn-primary py-2.5 px-6 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Start a Project</span>
            <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Projects List (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-[#6F7075] px-1">
              <span>PROJECTS ({clientOrders.length})</span>
              <span>SELECT TO VIEW DETAILS</span>
            </div>

            {clientOrders.map(ord => {
              const isSelected = activeSelected?.id === ord.id;
              const hasOutput = ord.outputVersions && ord.outputVersions.length > 0;
              const latestOutput = hasOutput ? ord.outputVersions[ord.outputVersions.length - 1] : null;

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
                        <span className="text-[#00CDB8]">{ord.id}</span>
                        <span className="text-[#6F7075]">·</span>
                        <span className="text-[#A1A1A6]">{ord.packageName}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white">{ord.details?.projectName || 'Video Project'}</h3>
                    </div>

                    <StatusBadge status={ord.status} />
                  </div>

                  {ord.details?.projectDescription && (
                    <p className="text-xs text-[#A1A1A6] line-clamp-2 leading-relaxed">
                      {ord.details.projectDescription}
                    </p>
                  )}

                  <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#6F7075]">
                    <div className="flex items-center gap-2">
                      <span>{ord.details?.platform || '16:9'}</span>
                      <span>·</span>
                      <span>Target: {ord.deadline}</span>
                    </div>

                    {latestOutput && (
                      <span className="text-[#B7A8FF] font-medium text-[11px] flex items-center gap-1">
                        <Play size={10} />
                        <span>Version {latestOutput.version} Ready</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Details Panel (5 Cols) */}
          <div className="lg:col-span-5 sticky top-24">
            {activeSelected ? (
              <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-6 space-y-6 shadow-xl">
                
                {/* Panel Header */}
                <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-[#00CDB8]">Project Overview</span>
                    <h2 className="text-lg font-bold text-white">{activeSelected.details?.projectName}</h2>
                    <div className="text-xs font-mono text-[#6F7075]">{activeSelected.id} · {activeSelected.packageName}</div>
                  </div>

                  <StatusBadge status={activeSelected.status} />
                </div>

                {/* Status Explanation in Simple Language */}
                <div className="bg-[#111111] border border-white/[0.06] rounded-[10px] p-4 space-y-1 text-xs">
                  <span className="font-mono text-[10px] uppercase text-[#6F7075] block">Current Stage</span>
                  <p className="text-[#FAFAF5] font-medium leading-relaxed">
                    {activeSelected.status === 'Pending Approval' && 'Your project has been submitted and is waiting for our team to verify footage access.'}
                    {activeSelected.status === 'In Progress' && 'Your project is currently being edited by our studio team.'}
                    {activeSelected.status === 'Review' && 'Your edited video cut is ready for your review and approval.'}
                    {activeSelected.status === 'Completed' && 'Your final video is ready for download.'}
                    {activeSelected.status === 'Rejected' && (activeSelected.rejectionReason || 'Your project could not be accepted. Please contact studio support.')}
                  </p>
                </div>

                {/* Google Drive Source Footage */}
                {activeSelected.googleDriveUrl && (
                  <div className="bg-[#111111] border border-white/[0.06] rounded-[10px] p-4 space-y-2 text-xs">
                    <span className="font-mono text-[10px] uppercase text-[#6F7075] block">Source Footage Repository</span>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#00CDB8] break-all">
                      <Film size={13} className="shrink-0" />
                      <span className="truncate">{activeSelected.googleDriveUrl}</span>
                      <a 
                        href={activeSelected.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1 text-[#A1A1A6] hover:text-white ml-auto"
                        title="Open Google Drive folder"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Output Versions & Review */}
                <div className="space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                    Delivered Video Versions
                  </div>

                  {activeSelected.outputVersions && activeSelected.outputVersions.length > 0 ? (
                    <div className="space-y-3">
                      {activeSelected.outputVersions.map((ver, idx) => (
                        <div key={idx} className="bg-[#111111] border border-white/[0.08] rounded-[10px] p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-[#00CDB8]/15 text-[#00CDB8] text-[11px] font-mono font-medium">
                              {ver.version || 'v1.0'}
                            </span>
                            <span className="text-[11px] font-mono text-[#6F7075]">{ver.runtime || 'Full Cut'}</span>
                          </div>

                          {ver.notes && (
                            <p className="text-xs text-[#A1A1A6] italic bg-white/[0.02] p-2.5 rounded border border-white/[0.04]">
                              &ldquo;{ver.notes}&rdquo;
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {ver.url && (
                              <button
                                onClick={() => setPreviewVideoUrl(ver.url)}
                                className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play size={12} />
                                <span>Watch Preview</span>
                              </button>
                            )}

                            {activeSelected.status === 'Review' && (
                              <>
                                <button
                                  onClick={() => handleApproveCut(activeSelected.id)}
                                  disabled={isApproving}
                                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Check size={12} />
                                  <span>{isApproving ? 'Approving...' : 'Approve Final Cut'}</span>
                                </button>
                                <button
                                  onClick={() => setRevisionModalOrder(activeSelected)}
                                  className="btn-ghost text-[#A1A1A6] hover:text-white text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer border border-white/[0.08]"
                                >
                                  <AlertCircle size={12} />
                                  <span>Request Revision</span>
                                </button>
                              </>
                            )}

                            {activeSelected.status === 'Completed' && (
                              <button
                                onClick={() => handleDownloadDeliverable(activeSelected, ver)}
                                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Download size={12} />
                                <span>Download Master File</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#6F7075] bg-[#111111] p-4 rounded-[10px] border border-white/[0.04] font-mono">
                      {activeSelected.status === 'In Progress' 
                        ? 'Editor is currently cutting. Video cuts will appear here for your review.'
                        : 'No output cut uploaded yet.'}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-8 text-center text-xs text-[#6F7075]">
                Select a project to view specifications and deliverables.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] text-white rounded-[14px] overflow-hidden max-w-3xl w-full border border-white/15 shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider">Editorial Review Cut</span>
              <button 
                onClick={() => setPreviewVideoUrl(null)}
                className="text-[#A1A1A6] hover:text-white text-xs font-mono px-2 py-1"
              >
                Close (ESC)
              </button>
            </div>

            <div className="aspect-video bg-black rounded-[8px] overflow-hidden border border-white/10">
              <VideoPlayer src={previewVideoUrl} autoPlay />
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
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
