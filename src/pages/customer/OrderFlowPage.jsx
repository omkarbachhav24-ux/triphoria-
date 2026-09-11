import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Link as LinkIcon, AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal } from '../../components/motion/Reveal';
import { Field } from '../../components/ui/Field';

const VIDEO_TYPES = [
  { value: 'Reel', aspect: '9:16', platform: 'Instagram Reel (9:16)' },
  { value: 'Short', aspect: '9:16', platform: 'YouTube Shorts (9:16)' },
  { value: 'TikTok', aspect: '9:16', platform: 'TikTok (9:16)' },
  { value: 'YouTube', aspect: '16:9', platform: 'YouTube (16:9)' },
  { value: 'Long-form', aspect: '16:9', platform: 'Long-form (16:9)' },
  { value: 'Podcast', aspect: '16:9', platform: 'Podcast (16:9 + audio)' },
  { value: 'Commercial', aspect: '16:9', platform: 'Commercial / Brand (multi-format)' },
  { value: 'Other', aspect: '1:1', platform: 'Other' },
];

const isGoogleDriveUrl = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'drive.google.com' || h.endsWith('.drive.google.com');
  } catch {
    return false;
  }
};

export function OrderFlowPage({ selectedPackage, onNavigate }) {
  const { createOrder } = useOrders();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(() => ({
    packageName: selectedPackage || 'Pro Creator',
    projectName: '',
    videoType: 'Reel',
    aspectRatio: '9:16',
    editingStyle: 'Dynamic Pacing with Minimalist Graphics',
    description: '',
    instructions: '',
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    googleDriveUrl: '',
  }));

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const selectVideoType = (value) => {
    const meta = VIDEO_TYPES.find((t) => t.value === value);
    set({ videoType: value, aspectRatio: meta?.aspect || '16:9' });
  };

  const copySteps = () => {
    navigator.clipboard.writeText(
      "1. Open Google Drive\n2. Right-click your footage folder -> Share -> Share\n3. Under General access, change 'Restricted' to 'Anyone with the link'\n4. Role: Viewer\n5. Click 'Copy link'"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const next1 = (e) => {
    e.preventDefault();
    if (!form.projectName.trim()) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next2 = (e) => {
    e.preventDefault();
    if (!isGoogleDriveUrl(form.googleDriveUrl)) {
      setError('Enter a valid Google Drive link (drive.google.com).');
      return;
    }
    setError('');
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (!user) return onNavigate('/login');
    setSubmitting(true);
    setError('');
    const meta = VIDEO_TYPES.find((t) => t.value === form.videoType);
    try {
      const order = await createOrder({
        projectName: form.projectName,
        packageName: form.packageName,
        platform: meta?.platform || form.videoType,
        aspectRatio: form.aspectRatio,
        mediaType: form.videoType,
        editingStyle: form.editingStyle,
        targetLength: '10-12 mins',
        instructions: `${form.description}\n\nRequirements:\n${form.instructions}`.trim(),
        googleDriveUrl: form.googleDriveUrl,
        deadline: form.deadline,
      });
      if (order?.id) onNavigate(`/order/success/${order.id}`);
      else onNavigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to submit project brief. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Scene variant="black" className="min-h-[90vh] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-[760px] space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('/')} className="u-focus inline-flex items-center gap-2 font-mono text-[12px] text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)]">
              <ArrowLeft size={14} /> Studio
            </button>
            <span className="type-eyebrow">Step 0{step} / 03</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { n: 1, t: 'Project Details' },
              { n: 2, t: 'Footage Source' },
              { n: 3, t: 'Review & Submit' },
            ].map((s) => (
              <div
                key={s.n}
                onClick={() => s.n < step && setStep(s.n)}
                className={`cursor-pointer border p-3 transition-colors ${
                  step === s.n
                    ? 'border-[var(--primary)] bg-[var(--surface)]'
                    : step > s.n
                    ? 'border-[var(--border)] bg-[var(--surface)]/60 text-[var(--primary)]'
                    : 'border-[var(--border-subtle)] text-[var(--foreground-subtle)]'
                }`}
                style={{ borderRadius: 'var(--radius-editorial)' }}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span>0{s.n}</span>
                  {step > s.n && <Check size={12} />}
                </div>
                <div className="mt-1 text-[13px] font-medium">{s.t}</div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 border border-[var(--error)]/30 bg-[var(--error-muted)] p-3.5 text-[13px] text-[var(--error)]" style={{ borderRadius: 'var(--radius-editorial)' }}>
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {step === 1 && (
          <Reveal as="form" onSubmit={next1} className="u-frame space-y-5 p-6 sm:p-9">
            <div className="border-b border-[var(--border)] pb-4">
              <h1 className="type-h2">Project Scope &amp; Brief</h1>
              <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">Define the format, platform, and editorial specification.</p>
            </div>

            <Field label="Project Title" required value={form.projectName} onChange={(e) => set({ projectName: e.target.value })} placeholder="e.g. M4 Max Studio Workflow Deep-Dive" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Service Tier" as="select" value={form.packageName} onChange={(e) => set({ packageName: e.target.value })}>
                <option value="Starter Cut">Starter Cut (Short-Form) — $149</option>
                <option value="Pro Creator">Pro Creator (Episodic) — $399</option>
                <option value="Cinematic Master">Cinematic Master (Commercial) — $899</option>
              </Field>
              <Field label="Video Type" as="select" value={form.videoType} onChange={(e) => selectVideoType(e.target.value)}>
                {VIDEO_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.value}</option>
                ))}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Aspect Ratio" as="select" value={form.aspectRatio} onChange={(e) => set({ aspectRatio: e.target.value })} hint="Defaults from video type — vertical for short-form.">
                <option value="9:16">9:16 (Vertical)</option>
                <option value="4:5">4:5 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="16:9">16:9 (Landscape)</option>
              </Field>
              <Field label="Target Delivery Date" type="date" required value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} />
            </div>

            <Field label="Pacing &amp; Editorial Style" value={form.editingStyle} onChange={(e) => set({ editingStyle: e.target.value })} placeholder="Dynamic pacing, punchy retention cuts…" />
            <Field as="textarea" rows={3} label="Project Narrative &amp; Context" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What is this video about? Who is it for?" />
            <Field as="textarea" rows={3} label="Creative Requirements &amp; Brand Guidelines" value={form.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="Music genre, fonts, color palette, references…" />

            <div className="flex justify-end border-t border-[var(--border)] pt-4">
              <button type="submit" className="btn-primary">Continue to Footage Link <ArrowRight size={14} /></button>
            </div>
          </Reveal>
        )}

        {step === 2 && (
          <Reveal as="form" onSubmit={next2} className="u-frame space-y-5 p-6 sm:p-9">
            <div className="border-b border-[var(--border)] pb-4">
              <p className="type-eyebrow mb-2 !text-[var(--primary)]">Direct source repository</p>
              <h1 className="type-h2">Google Drive Footage Source</h1>
              <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
                TRIPHORIA does not upload raw video through our servers. Your footage stays in your Drive.
              </p>
            </div>

            <div className="relative">
              <LinkIcon size={15} className="pointer-events-none absolute left-3.5 top-[38px] text-[var(--foreground-subtle)]" />
              <Field
                label="Google Drive Shareable Link"
                required
                type="url"
                value={form.googleDriveUrl}
                onChange={(e) => { set({ googleDriveUrl: e.target.value.trim() }); setError(''); }}
                placeholder="https://drive.google.com/drive/folders/…"
                className="[&_input]:pl-10"
              />
              {isGoogleDriveUrl(form.googleDriveUrl) && (
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[12px] text-[var(--success)]"><Check size={13} /> Link format verified.</p>
              )}
            </div>

            <div className="space-y-3 border border-[var(--border)] bg-[var(--background)] p-4" style={{ borderRadius: 'var(--radius-editorial)' }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] uppercase tracking-wider text-[var(--foreground-strong)]">Access setting</span>
                <button type="button" onClick={copySteps} className="u-focus inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--primary)] hover:underline">
                  <Copy size={12} /> {copied ? 'Copied!' : 'Copy Steps'}
                </button>
              </div>
              <p className="text-[13px] text-[var(--foreground-muted)]">Set sharing to “Anyone with the link can view”.</p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost">Back</button>
              <button type="submit" disabled={!isGoogleDriveUrl(form.googleDriveUrl)} className="btn-primary disabled:opacity-40">Review Project <ArrowRight size={14} /></button>
            </div>
          </Reveal>
        )}

        {step === 3 && (
          <Reveal className="u-frame space-y-5 p-6 sm:p-9">
            <div className="border-b border-[var(--border)] pb-4">
              <h1 className="type-h2">Review &amp; Confirm</h1>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['Project Title', form.projectName],
                ['Service Tier', form.packageName],
                ['Video Type', `${form.videoType} · ${form.aspectRatio}`],
                ['Target Delivery', form.deadline],
              ].map(([label, val]) => (
                <div key={label} className="border border-[var(--border)] p-4" style={{ borderRadius: 'var(--radius-editorial)' }}>
                  <span className="type-label block">{label}</span>
                  <div className="mt-1 text-[15px] font-medium text-[var(--foreground-strong)]">{val}</div>
                </div>
              ))}
            </div>
            <div className="border border-[var(--border)] p-4" style={{ borderRadius: 'var(--radius-editorial)' }}>
              <div className="flex items-center justify-between">
                <span className="type-label">Footage source</span>
                <button type="button" onClick={() => setStep(2)} className="font-mono text-[11px] text-[var(--primary)] hover:underline">Edit</button>
              </div>
              <div className="mt-2 flex items-center gap-2 break-all font-mono text-[12px] text-[var(--primary)]">
                <LinkIcon size={13} className="shrink-0" /> {form.googleDriveUrl}
                <a href={form.googleDriveUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-[var(--foreground-muted)]"><ExternalLink size={13} /></a>
              </div>
            </div>

            <div className="flex items-start gap-2.5 border border-[var(--primary)]/25 bg-[var(--primary-muted)] p-4 text-[13px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--primary)]" />
              <span className="text-[var(--foreground-muted)]">
                On submit your project enters <strong className="text-[var(--foreground-strong)]">Pending Approval</strong>. The studio verifies footage access and assigns an editor — track every step from your dashboard.
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <button type="button" onClick={() => setStep(2)} className="btn-ghost">Back</button>
              <button type="button" onClick={submit} disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? 'Dispatching…' : 'Submit Project to Studio'} <ArrowRight size={14} />
              </button>
            </div>
          </Reveal>
        )}
      </div>
    </Scene>
  );
}

export default OrderFlowPage;
