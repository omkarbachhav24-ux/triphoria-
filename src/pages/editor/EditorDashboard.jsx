import React, { useState } from 'react';
import { 
  Scissors, Film, Play, Upload, CheckCircle2, Clock, 
  ExternalLink, ArrowRight, Eye, Shield, FileText, Check, AlertCircle, X
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { VideoPlayer } from '../../components/common/VideoPlayer';

export const EditorDashboard = ({ onNavigate }) => {
  const { orders, uploadEditorOutput } = useOrders();
  const { user } = useAuth();

  const [activeProject, setActiveProject] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  const [outputForm, setOutputForm] = useState({
    version: 'v1.0',
    filename: '',
    format: 'ProRes 422 HQ / Rec.709',
    resolution: '3840x2160 @ 24fps',
    runtime: '00:12:30',
    sizeDisplay: '1.20 GB',
    downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    notes: 'Initial master cut exported with full audio mix and primary color grade.'
  });

  // Editor sees STRICTLY work assigned to them (§13)
  const assignedOrders = orders.filter(o => o.assignedEditorId === user?.id);

  const openUploadModal = (ord) => {
    setShowUploadModal(ord);
    const existingCount = ord.outputVersions?.length || 0;
    const nextVer = `v1.${existingCount}`;
    setOutputForm({
      version: nextVer,
      filename: `${(ord.details?.projectName || 'Project').replace(/\s+/g, '_')}_MASTER_${nextVer}.mp4`,
      format: 'ProRes 422 HQ / Web 4K',
      resolution: ord.details?.platform?.includes('9:16') ? '2160x3840 @ 60fps' : '3840x2160 @ 24fps',
      runtime: ord.details?.targetLength || '00:10:00',
      sizeDisplay: '1.45 GB',
      downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      notes: 'Initial master cut complete with pacing, audio mix, and primary color grade applied.'
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!showUploadModal) return;

    await uploadEditorOutput(showUploadModal.id, outputForm);
    setShowUploadModal(null);
  };

  const selected = activeProject || assignedOrders[0] || null;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Editor Identity Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00CDB8]" />
            <span>EDITOR PRODUCTION SUITE &middot; ASSIGNED QUEUE ONLY</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Assigned Queue: {user?.name || 'Lead Video Editor'}
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            {user?.specialty || 'Commercial & Narrative Post-Production'} &middot; Access is restricted strictly to your assigned client briefs.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#1A1A1A] border border-white/10 px-4 py-2.5 rounded-[10px] text-xs font-mono">
          <div>
            <span className="text-[#6F7075] block text-[10px] uppercase">ACTIVE QUEUE</span>
            <span className="text-[#00CDB8] font-bold text-sm">
              {assignedOrders.length} <span className="text-[#6F7075]">/ {user?.maxCapacity || 3} Active</span>
            </span>
          </div>
        </div>
      </div>

      {assignedOrders.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-12 text-center space-y-3 max-w-md mx-auto">
          <Scissors size={28} className="mx-auto text-[#6F7075]" />
          <h3 className="text-base font-semibold text-white">No assigned projects</h3>
          <p className="text-xs text-[#A1A1A6] leading-relaxed">
            Studio administration has not routed any active briefs to your queue. Once an order is approved and assigned to you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Assigned Projects List (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-[#6F7075] px-1">
              <span>ACTIVE PROJECTS ({assignedOrders.length})</span>
              <span>SELECT TO INSPECT BRIEF</span>
            </div>

            {assignedOrders.map(ord => {
              const isSelected = selected?.id === ord.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => setActiveProject(ord)}
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
                        <span className="text-[#A1A1A6]">{ord.details?.platform}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white">{ord.details?.projectName}</h3>
                      <div className="text-xs text-[#6F7075]">Client: {ord.customerName} ({ord.customerEmail})</div>
                    </div>

                    <StatusBadge status={ord.status} />
                  </div>

                  {/* Google Drive Link Box for Editor */}
                  {ord.googleDriveUrl && (
                    <div className="flex items-center gap-2 p-2 rounded bg-[#111111] border border-white/[0.06] text-xs font-mono text-[#00CDB8] truncate">
                      <Film size={13} className="shrink-0" />
                      <span className="truncate">{ord.googleDriveUrl}</span>
                      <a 
                        href={ord.googleDriveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={e => e.stopPropagation()}
                        className="text-[#A1A1A6] hover:text-white ml-auto shrink-0 flex items-center gap-1"
                        title="Open in Google Drive"
                      >
                        <span>Open Drive</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#6F7075]">
                    <span>Target Delivery: {ord.deadline}</span>

                    {ord.status === 'In Progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openUploadModal(ord);
                        }}
                        className="btn-primary text-xs py-1 px-3 font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload size={12} />
                        <span>Upload Output Cut</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Details Panel (5 Cols) */}
          <div className="lg:col-span-5 sticky top-24">
            {selected ? (
              <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-6 space-y-5 shadow-xl">
                <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#00CDB8]">Production Brief</span>
                    <h2 className="text-lg font-bold text-white">{selected.details?.projectName}</h2>
                    <div className="text-xs font-mono text-[#6F7075]">{selected.id} &middot; {selected.packageName}</div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                {/* Google Drive Link Box */}
                {selected.googleDriveUrl && (
                  <div className="bg-[#111111] border border-white/[0.06] rounded-[10px] p-4 space-y-2 text-xs">
                    <span className="font-mono text-[10px] uppercase text-[#6F7075] block">Customer Footage Repository</span>
                    <div className="flex items-center gap-2 font-mono text-xs text-[#00CDB8] break-all">
                      <Film size={14} className="shrink-0" />
                      <span className="truncate">{selected.googleDriveUrl}</span>
                    </div>
                    <a
                      href={selected.googleDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 w-full mt-2"
                    >
                      <span>Access Footage in Google Drive</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* Requirements */}
                <div className="bg-[#111111] border border-white/[0.06] rounded-[10px] p-4 space-y-2 text-xs">
                  <span className="font-mono text-[10px] uppercase text-[#6F7075] block">Editing Directives</span>
                  <p className="text-[#A1A1A6] leading-relaxed whitespace-pre-line">
                    {selected.details?.editingInstructions || selected.details?.projectDescription || 'No special directives provided.'}
                  </p>
                </div>

                {/* Deliverables List */}
                <div className="space-y-2 pt-2 border-t border-white/[0.08] text-xs">
                  <div className="flex justify-between items-center font-mono text-[#6F7075] text-[10px] uppercase">
                    <span>Delivered Cuts ({selected.outputVersions?.length || 0})</span>
                  </div>

                  {selected.outputVersions?.length > 0 ? (
                    <div className="space-y-2">
                      {selected.outputVersions.map((ver, i) => (
                        <div key={i} className="bg-[#111111] border border-white/[0.06] p-3 rounded-[8px] space-y-2">
                          <div className="flex justify-between items-center font-mono">
                            <span className="px-2 py-0.5 rounded bg-[#00CDB8]/15 text-[#00CDB8] text-[10px]">
                              {ver.version}
                            </span>
                            <span className="text-[#6F7075] text-[11px]">{ver.runtime}</span>
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
                    <div className="p-3 bg-[#111111] text-[#6F7075] font-mono text-[11px] rounded-[8px]">
                      No version uploaded yet.
                    </div>
                  )}
                </div>

                {selected.status === 'In Progress' && (
                  <div className="pt-2 border-t border-white/[0.08]">
                    <button
                      onClick={() => openUploadModal(selected)}
                      className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,205,184,0.25)]"
                    >
                      <Upload size={13} />
                      <span>Submit Output Cut for Review</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-8 text-center text-xs text-[#6F7075] font-mono">
                Select a project to inspect directives and footage link.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Upload Output Cut Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] border border-white/15 rounded-[16px] max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-xs font-mono text-[#00CDB8] uppercase">DELIVERABLE CUT INTAKE</span>
                <h3 className="text-lg font-bold text-white">Record Finished Master Cut</h3>
              </div>
              <button onClick={() => setShowUploadModal(null)} className="text-[#A1A1A6] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-mono uppercase text-[#A1A1A6]">Version Tag</label>
                  <input
                    type="text"
                    required
                    value={outputForm.version}
                    onChange={e => setOutputForm({ ...outputForm, version: e.target.value })}
                    className="triphoria-input text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-mono uppercase text-[#A1A1A6]">Cut Runtime</label>
                  <input
                    type="text"
                    required
                    value={outputForm.runtime}
                    onChange={e => setOutputForm({ ...outputForm, runtime: e.target.value })}
                    placeholder="00:12:30"
                    className="triphoria-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-mono uppercase text-[#A1A1A6]">Filename / Deliverable Title</label>
                <input
                  type="text"
                  required
                  value={outputForm.filename}
                  onChange={e => setOutputForm({ ...outputForm, filename: e.target.value })}
                  className="triphoria-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-mono uppercase text-[#A1A1A6]">Preview / Delivery URL</label>
                <input
                  type="url"
                  required
                  value={outputForm.downloadUrl}
                  onChange={e => setOutputForm({ ...outputForm, downloadUrl: e.target.value })}
                  placeholder="https://..."
                  className="triphoria-input text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-mono uppercase text-[#A1A1A6]">Editor Delivery Notes</label>
                <textarea
                  rows={3}
                  value={outputForm.notes}
                  onChange={e => setOutputForm({ ...outputForm, notes: e.target.value })}
                  placeholder="Explain key cuts, revisions, music choices, or questions for client review..."
                  className="triphoria-input text-xs resize-y"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer"
                >
                  Submit Cut for Review &rarr;
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
              <span className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider">Output Cut Preview</span>
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
