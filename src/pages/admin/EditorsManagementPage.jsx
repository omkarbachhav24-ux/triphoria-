import React, { useState } from 'react';
import { 
  Scissors, Film, CheckCircle2, Shield, 
  Plus, Copy, Check, Trash2, UserCheck
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const EditorsManagementPage = () => {
  const { orders, reassignEditor } = useOrders();
  const { editors, addEditor, deleteEditor, generateEditorPassword } = useAuth();

  const [selectedEditor, setSelectedEditor] = useState(editors[0] || null);
  const [reassignModalOrder, setReassignModalOrder] = useState(null);
  const [newEditorId, setNewEditorId] = useState(editors[0]?.id || '');

  // Onboard Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newEditorForm, setNewEditorForm] = useState({
    name: '',
    email: '',
    password: '',
    specialty: 'Commercial & Color Grading',
    maxCapacity: 3,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
  });

  // Credential Banner State (shown after onboarding)
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Compute live active projects per editor from order context
  const getEditorStats = (editorId) => {
    const editorOrders = orders.filter(o => o.assignedEditorId === editorId);
    const inProduction = editorOrders.filter(o => o.status === 'In Progress').length;
    const inReview = editorOrders.filter(o => o.status === 'Review').length;
    const completed = editorOrders.filter(o => o.status === 'Completed').length;
    return {
      totalAssigned: editorOrders.length,
      inProduction,
      inReview,
      completed,
      active: inProduction + inReview,
      orders: editorOrders
    };
  };

  const handleOpenOnboard = () => {
    const autoPass = generateEditorPassword();
    setNewEditorForm({
      name: '',
      email: '',
      password: autoPass,
      specialty: 'Commercial & Color Grading',
      maxCapacity: 3,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 99999999)}?auto=format&fit=crop&q=80&w=200`
    });
    setShowOnboardModal(true);
  };

  const handleGenerateNewPass = () => {
    setNewEditorForm(prev => ({ ...prev, password: generateEditorPassword() }));
  };

  const [isOnboarding, setIsOnboarding] = useState(false);

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!newEditorForm.email || !newEditorForm.name) return;

    setIsOnboarding(true);
    try {
      // addEditor() is async: it POSTs to /api/auth/editors and resolves to the
      // created editor, including the one-time generated password returned by
      // the server. That plaintext password is shown to the admin here once so
      // it can be delivered to the editor out-of-band; it is never logged and
      // never stored in plaintext (the server persists only a scrypt hash).
      const created = await addEditor(newEditorForm);
      if (!created) return; // addEditor surfaces its own error to the admin
      setCreatedCredentials({
        name: created.name,
        email: created.email,
        password: created.password,
        id: created.id
      });
      setShowOnboardModal(false);
      setSelectedEditor(created);
    } catch {
      // addEditor() already alerts the admin on failure; nothing to add here.
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `TRIPHORIA EDITOR WORKSPACE CREDENTIALS\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleReassignSubmit = (e) => {
    e.preventDefault();
    if (!reassignModalOrder) return;
    reassignEditor(reassignModalOrder.id, newEditorId);
    setReassignModalOrder(null);
  };

  const handleDeleteEditor = (editorId, editorName) => {
    const stats = getEditorStats(editorId);
    if (stats.active > 0) {
      alert(`Cannot deactivate editor "${editorName}" while they have ${stats.active} active projects in production. Reassign their projects first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to deactivate editor "${editorName}"?`)) {
      deleteEditor(editorId);
      if (selectedEditor?.id === editorId) {
        setSelectedEditor(editors.find(e => e.id !== editorId) || null);
      }
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Header & Onboarding CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00CDB8]" />
            <span>STUDIO WORKFORCE ADMINISTRATION</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Editor Roster &amp; Access Management
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            Onboard new editors, provision secure workspace credentials, monitor capacity, and reassign project queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenOnboard}
            className="btn-primary text-xs py-2.5 px-4 font-semibold flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,205,184,0.25)]"
          >
            <Plus size={14} />
            <span>Onboard New Editor</span>
          </button>
        </div>
      </div>

      {/* Created Credentials Banner */}
      {createdCredentials && (
        <div className="bg-[#1A1A1A] border border-[#00CDB8]/40 rounded-[14px] p-6 space-y-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-[#00CDB8]">
                <CheckCircle2 size={15} />
                <span>NEW EDITOR CREDENTIALS CREATED &amp; SAVED</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Login Ready for {createdCredentials.name}
              </h3>
            </div>
            <button 
              onClick={() => setCreatedCredentials(null)}
              className="text-[#A1A1A6] hover:text-white text-xs font-mono p-1"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#111111] p-4 rounded-[10px] border border-white/[0.06] text-xs font-mono">
            <div>
              <span className="text-[#6F7075] block text-[10px] uppercase">Login Email</span>
              <span className="text-white font-medium text-sm">{createdCredentials.email}</span>
            </div>
            <div>
              <span className="text-[#6F7075] block text-[10px] uppercase">Generated Password</span>
              <span className="text-[#00CDB8] font-medium text-sm tracking-wider">{createdCredentials.password}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#A1A1A6]">
              The editor can now log in immediately at <code className="text-white">/login</code>.
            </p>
            <button
              onClick={handleCopyCredentials}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedNotice ? <Check size={13} className="text-[#111111]" /> : <Copy size={13} />}
              <span>{copiedNotice ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {editors.map(editor => {
          const stats = getEditorStats(editor.id);
          const isSelected = selectedEditor?.id === editor.id;
          const capacityPercent = Math.min(100, Math.round((stats.active / (editor.maxCapacity || 3)) * 100));

          return (
            <div
              key={editor.id}
              onClick={() => setSelectedEditor(editor)}
              className={`bg-[#1A1A1A] border rounded-[12px] p-5 space-y-4 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-[#00CDB8] shadow-[0_0_15px_rgba(0,205,184,0.15)] ring-1 ring-[#00CDB8]' 
                  : 'border-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={editor.avatar} 
                    alt={editor.name} 
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                  />
                  <div>
                    <h3 className="text-base font-semibold text-white">{editor.name}</h3>
                    <div className="text-xs text-[#A1A1A6]">{editor.specialty}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono bg-white/[0.05] text-[#A1A1A6] px-2 py-0.5 rounded border border-white/[0.08]">
                    {editor.id}
                  </span>
                  {editors.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEditor(editor.id, editor.name);
                      }}
                      className="text-[#6F7075] hover:text-red-400 p-1"
                      title="Deactivate editor"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>


              {/* Workload Capacity Bar */}
              <div className="space-y-1.5 bg-[#111111] p-3 rounded-[8px] border border-white/[0.06]">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#6F7075]">ACTIVE WORKLOAD</span>
                  <span className="font-semibold text-white">
                    {stats.active} / {editor.maxCapacity || 3} Projects
                  </span>
                </div>
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      capacityPercent >= 100 ? 'bg-red-500' : capacityPercent >= 66 ? 'bg-amber-400' : 'bg-[#00CDB8]'
                    }`} 
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/[0.06]">
                <div className="bg-[#111111] p-2 rounded-[6px]">
                  <div className="text-[10px] font-mono uppercase text-[#6F7075]">Cutting</div>
                  <div className="text-sm font-mono font-bold text-[#00CDB8]">{stats.inProduction}</div>
                </div>
                <div className="bg-[#111111] p-2 rounded-[6px]">
                  <div className="text-[10px] font-mono uppercase text-[#6F7075]">Review</div>
                  <div className="text-sm font-mono font-bold text-[#B7A8FF]">{stats.inReview}</div>
                </div>
                <div className="bg-[#111111] p-2 rounded-[6px]">
                  <div className="text-[10px] font-mono uppercase text-[#6F7075]">Done</div>
                  <div className="text-sm font-mono font-bold text-[#34D399]">{stats.completed}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Drilldown: Selected Editor's Active Assignments */}
      {selectedEditor && (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#00CDB8]">Workload Dossier</span>
              <h2 className="text-lg font-bold text-white">
                Active Project Pipeline: {selectedEditor.name}
              </h2>
            </div>
            <div className="text-xs font-mono text-[#A1A1A6]">
              Contact: <span className="text-white">{selectedEditor.email}</span>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {getEditorStats(selectedEditor.id).orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6F7075] font-mono">
                No projects currently assigned to this editor. Ready for new briefs.
              </div>
            ) : (
              getEditorStats(selectedEditor.id).orders.map(ord => (
                <div key={ord.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#00CDB8]">{ord.id}</span>
                      <span className="text-[#6F7075]">&bull;</span>
                      <span className="text-[#A1A1A6]">{ord.details?.platform || '16:9'}</span>
                    </div>
                    <div className="text-sm font-semibold text-white">{ord.details?.projectName}</div>
                    <div className="text-xs text-[#A1A1A6]">
                      Client: {ord.customerName} &middot; Deadline: {ord.deadline}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={ord.status} />

                    {ord.status === 'In Progress' && (
                      <button
                        onClick={() => {
                          setReassignModalOrder(ord);
                          setNewEditorId(editors.find(e => e.id !== selectedEditor.id)?.id || selectedEditor.id);
                        }}
                        className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck size={12} />
                        <span>Reassign</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] border border-white/15 rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-xs font-mono text-[#00CDB8] uppercase">STAFF ONBOARDING</span>
                <h3 className="text-lg font-bold text-white">Provision Editor Account</h3>
              </div>
              <button onClick={() => setShowOnboardModal(false)} className="text-[#A1A1A6] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Full Name</label>
                <input
                  type="text"
                  required
                  value={newEditorForm.name}
                  onChange={e => setNewEditorForm({ ...newEditorForm, name: e.target.value })}
                  placeholder="e.g. Maya Lin"
                  className="triphoria-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Studio Email</label>
                <input
                  type="email"
                  required
                  value={newEditorForm.email}
                  onChange={e => setNewEditorForm({ ...newEditorForm, email: e.target.value })}
                  placeholder="maya@triphoria.io"
                  className="triphoria-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Specialty Discipline</label>
                <select
                  value={newEditorForm.specialty}
                  onChange={e => setNewEditorForm({ ...newEditorForm, specialty: e.target.value })}
                  className="triphoria-input text-xs"
                >
                  <option value="Commercial & Color Grading">Commercial &amp; Color Grading</option>
                  <option value="Longform & Documentary">Longform &amp; Documentary</option>
                  <option value="Shorts, Reels & Motion Graphics">Shorts, Reels &amp; Motion Graphics</option>
                  <option value="Audio Finishing & Sound Design">Audio Finishing &amp; Sound Design</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block font-mono uppercase text-[#A1A1A6]">Workspace Access Key</label>
                  <button
                    type="button"
                    onClick={handleGenerateNewPass}
                    className="text-[10px] font-mono text-[#00CDB8] hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newEditorForm.password}
                  onChange={e => setNewEditorForm({ ...newEditorForm, password: e.target.value })}
                  className="triphoria-input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOnboarding}
                  className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isOnboarding ? 'Provisioning…' : 'Provision Account →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1A1A1A] border border-white/15 rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">Reassign Lead Editor</h3>
              <button onClick={() => setReassignModalOrder(null)} className="text-[#A1A1A6] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-mono uppercase text-[#A1A1A6]">Select New Lead Editor</label>
                <select
                  value={newEditorId}
                  onChange={e => setNewEditorId(e.target.value)}
                  className="triphoria-input text-xs"
                >
                  {editors.map(ed => (
                    <option key={ed.id} value={ed.id}>{ed.name} ({ed.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setReassignModalOrder(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
