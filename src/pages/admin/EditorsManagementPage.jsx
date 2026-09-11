import React, { useState } from 'react';
import {
  CheckCircle2, Plus, Copy, Check, Trash2, UserCheck, X,
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem } from '../../components/motion/Reveal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';

export function EditorsManagementPage() {
  const { orders, reassignEditor } = useOrders();
  const { editors, addEditor, deleteEditor, generateEditorPassword } = useAuth();

  const [selectedEditor, setSelectedEditor] = useState(editors[0] || null);
  const [reassignModalOrder, setReassignModalOrder] = useState(null);
  const [newEditorId, setNewEditorId] = useState(editors[0]?.id || '');

  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newEditorForm, setNewEditorForm] = useState({
    name: '',
    email: '',
    password: '',
    specialty: 'Commercial & Color Grading',
    maxCapacity: 3,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  });

  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Compute live active projects per editor from order context — real DB
  // data, not fabricated stats.
  const getEditorStats = (editorId) => {
    const editorOrders = orders.filter((o) => o.assignedEditorId === editorId);
    const inProduction = editorOrders.filter((o) => o.status === 'In Progress').length;
    const inReview = editorOrders.filter((o) => o.status === 'Review').length;
    const completed = editorOrders.filter((o) => o.status === 'Completed').length;
    return { totalAssigned: editorOrders.length, inProduction, inReview, completed, active: inProduction + inReview, orders: editorOrders };
  };

  const handleOpenOnboard = () => {
    const autoPass = generateEditorPassword();
    setNewEditorForm({
      name: '',
      email: '',
      password: autoPass,
      specialty: 'Commercial & Color Grading',
      maxCapacity: 3,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 99999999)}?auto=format&fit=crop&q=80&w=200`,
    });
    setShowOnboardModal(true);
  };

  const handleGenerateNewPass = () => setNewEditorForm((prev) => ({ ...prev, password: generateEditorPassword() }));

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
      if (!created) return;
      setCreatedCredentials({ name: created.name, email: created.email, password: created.password, id: created.id });
      setShowOnboardModal(false);
      setSelectedEditor(created);
    } catch {
      // addEditor() already alerts the admin on failure.
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
        setSelectedEditor(editors.find((e) => e.id !== editorId) || null);
      }
    }
  };

  return (
    <Scene variant="dark-editorial" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <p className="type-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Studio workforce administration
            </p>
            <h1 className="type-h1">Editor roster &amp; access management</h1>
            <p className="max-w-xl text-[12px] text-[var(--foreground-muted)]">
              Onboard new editors, provision secure workspace credentials, monitor capacity, and reassign project queues.
            </p>
          </div>
          <button onClick={handleOpenOnboard} className="btn-primary">
            <Plus size={14} /> Onboard New Editor
          </button>
        </div>

        {createdCredentials && (
          <Reveal className="u-frame mb-6 space-y-4 p-6" style={{ borderColor: 'var(--primary)' }}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--primary)]">
                  <CheckCircle2 size={15} /> NEW EDITOR CREDENTIALS CREATED &amp; SAVED
                </div>
                <h3 className="text-[15px] font-bold text-[var(--foreground-strong)]">Login ready for {createdCredentials.name}</h3>
              </div>
              <button onClick={() => setCreatedCredentials(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 border border-[var(--border)] p-4 font-mono text-[12px] sm:grid-cols-2" style={{ borderRadius: 'var(--radius-editorial)' }}>
              <div>
                <span className="block text-[10px] uppercase text-[var(--foreground-subtle)]">Login Email</span>
                <span className="text-[14px] font-medium text-[var(--foreground-strong)]">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-[var(--foreground-subtle)]">Generated Password</span>
                <span className="text-[14px] font-medium tracking-wider text-[var(--primary)]">{createdCredentials.password}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[12px] text-[var(--foreground-muted)]">
                The editor can now log in immediately at <code className="text-[var(--foreground-strong)]">/login</code>.
              </p>
              <button onClick={handleCopyCredentials} className="btn-primary">
                {copiedNotice ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedNotice ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
              </button>
            </div>
          </Reveal>
        )}

        <Stagger speed="micro" className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {editors.map((editor) => {
            const stats = getEditorStats(editor.id);
            const isSelected = selectedEditor?.id === editor.id;
            const capacityPercent = Math.min(100, Math.round((stats.active / (editor.maxCapacity || 3)) * 100));
            const barColor = capacityPercent >= 100 ? 'var(--error)' : capacityPercent >= 66 ? 'var(--warning)' : 'var(--primary)';
            return (
              <StaggerItem key={editor.id}>
                <button
                  onClick={() => setSelectedEditor(editor)}
                  className="u-focus block w-full space-y-4 border p-5 text-left transition-colors"
                  style={{ borderRadius: 'var(--radius-editorial)', borderColor: isSelected ? 'var(--primary)' : 'var(--border)', background: 'var(--surface)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={editor.avatar} alt={editor.name} className="h-10 w-10 rounded-full border border-[var(--border)] object-cover" />
                      <div>
                        <h3 className="text-[14px] font-semibold text-[var(--foreground-strong)]">{editor.name}</h3>
                        <div className="text-[12px] text-[var(--foreground-muted)]">{editor.specialty}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground-subtle)]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                        {editor.id}
                      </span>
                      {editors.length > 1 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleDeleteEditor(editor.id, editor.name); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDeleteEditor(editor.id, editor.name); } }}
                          className="u-focus cursor-pointer p-1 text-[var(--foreground-subtle)] hover:text-[var(--error)]"
                          title="Deactivate editor"
                        >
                          <Trash2 size={13} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 border border-[var(--border)] p-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[var(--foreground-subtle)]">ACTIVE WORKLOAD</span>
                      <span className="font-semibold text-[var(--foreground-strong)]">{stats.active} / {editor.maxCapacity || 3} Projects</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
                      <div className="h-full transition-all duration-300" style={{ width: `${capacityPercent}%`, background: barColor }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-2 text-center">
                    <div className="border border-[var(--border)] p-2" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      <div className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Cutting</div>
                      <div className="font-mono text-[14px] font-bold text-[var(--primary)]">{stats.inProduction}</div>
                    </div>
                    <div className="border border-[var(--border)] p-2" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      <div className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Review</div>
                      <div className="font-mono text-[14px] font-bold text-[var(--accent)]">{stats.inReview}</div>
                    </div>
                    <div className="border border-[var(--border)] p-2" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      <div className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Done</div>
                      <div className="font-mono text-[14px] font-bold" style={{ color: 'var(--success)' }}>{stats.completed}</div>
                    </div>
                  </div>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>

        {selectedEditor && (
          <Reveal key={selectedEditor.id} className="u-frame space-y-5 p-6">
            <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center">
              <div>
                <span className="type-eyebrow">Workload dossier</span>
                <h2 className="type-h3">Active project pipeline: {selectedEditor.name}</h2>
              </div>
              <div className="font-mono text-[12px] text-[var(--foreground-muted)]">
                Contact: <span className="text-[var(--foreground-strong)]">{selectedEditor.email}</span>
              </div>
            </div>

            {getEditorStats(selectedEditor.id).orders.length === 0 ? (
              <EmptyState icon={UserCheck} title="No assignments" body="No projects currently assigned to this editor. Ready for new briefs." />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {getEditorStats(selectedEditor.id).orders.map((ord) => (
                  <div key={ord.id} className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-[var(--primary)]">{ord.id}</span>
                        <span className="text-[var(--foreground-subtle)]">&bull;</span>
                        <span className="text-[var(--foreground-muted)]">{ord.details?.platform || '16:9'}</span>
                      </div>
                      <div className="text-[14px] font-semibold text-[var(--foreground-strong)]">{ord.details?.projectName}</div>
                      <div className="text-[12px] text-[var(--foreground-muted)]">Client: {ord.customerName} &middot; Deadline: {ord.deadline}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={ord.status} />
                      {ord.status === 'In Progress' && (
                        <button
                          onClick={() => { setReassignModalOrder(ord); setNewEditorId(editors.find((e) => e.id !== selectedEditor.id)?.id || selectedEditor.id); }}
                          className="btn-ghost !py-1.5 !px-3 !text-[11px]"
                        >
                          <UserCheck size={12} /> Reassign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
        )}
      </div>

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-md space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="type-eyebrow">Staff onboarding</span>
                <h3 className="type-h3">Provision editor account</h3>
              </div>
              <button onClick={() => setShowOnboardModal(false)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <Field label="Full Name" required value={newEditorForm.name} onChange={(e) => setNewEditorForm({ ...newEditorForm, name: e.target.value })} placeholder="e.g. Maya Lin" />
              <Field label="Studio Email" type="email" required value={newEditorForm.email} onChange={(e) => setNewEditorForm({ ...newEditorForm, email: e.target.value })} placeholder="maya@triphoria.io" />
              <Field as="select" label="Specialty Discipline" value={newEditorForm.specialty} onChange={(e) => setNewEditorForm({ ...newEditorForm, specialty: e.target.value })}>
                <option value="Commercial & Color Grading">Commercial &amp; Color Grading</option>
                <option value="Longform & Documentary">Longform &amp; Documentary</option>
                <option value="Shorts, Reels & Motion Graphics">Shorts, Reels &amp; Motion Graphics</option>
                <option value="Audio Finishing & Sound Design">Audio Finishing &amp; Sound Design</option>
              </Field>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--foreground-subtle)]">Workspace Access Key</label>
                  <button type="button" onClick={handleGenerateNewPass} className="u-focus font-mono text-[10px] text-[var(--primary)] hover:underline">Regenerate</button>
                </div>
                <input
                  type="text" required value={newEditorForm.password}
                  onChange={(e) => setNewEditorForm({ ...newEditorForm, password: e.target.value })}
                  className="triphoria-input font-mono text-[12px]"
                />
              </div>
              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setShowOnboardModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isOnboarding} className="btn-primary disabled:opacity-50">
                  {isOnboarding ? 'Provisioning…' : 'Provision Account →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="u-frame w-full max-w-md space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="type-h3">Reassign lead editor</h3>
              <button onClick={() => setReassignModalOrder(null)} className="u-focus text-[var(--foreground-subtle)] hover:text-[var(--foreground-strong)]" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <Field as="select" label="Select New Lead Editor" value={newEditorId} onChange={(e) => setNewEditorId(e.target.value)}>
                {editors.map((ed) => (
                  <option key={ed.id} value={ed.id}>{ed.name} ({ed.specialty})</option>
                ))}
              </Field>
              <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
                <button type="button" onClick={() => setReassignModalOrder(null)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Confirm Reassignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Scene>
  );
}

export default EditorsManagementPage;
