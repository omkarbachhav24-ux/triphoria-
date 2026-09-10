import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowRight, Check, Film, Link as LinkIcon, 
  AlertCircle, CheckCircle2, Copy, ExternalLink, HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';

export const OrderFlowPage = ({ selectedPackage, onNavigate }) => {
  const { createOrder } = useOrders();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [copiedHelp, setCopiedHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Form State (lazy initializer for date purity)
  const [projectData, setProjectData] = useState(() => ({
    packageName: selectedPackage || 'Pro Creator',
    projectName: '',
    videoType: 'YouTube (16:9)',
    editingStyle: 'Dynamic Pacing with Minimalist Graphics',
    description: '',
    instructions: '',
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    googleDriveUrl: ''
  }));

  const isGoogleDriveValid = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return host === 'drive.google.com' || host.endsWith('.drive.google.com');
    } catch {
      return false;
    }
  };

  const copySharingInstructions = () => {
    const text = "1. Open Google Drive\n2. Right-click your footage folder -> Share -> Share\n3. Under General access, change 'Restricted' to 'Anyone with the link'\n4. Role: Viewer (or Editor if proxy export preferred)\n5. Click 'Copy link'";
    navigator.clipboard.writeText(text);
    setCopiedHelp(true);
    setTimeout(() => setCopiedHelp(false), 2500);
  };

  const handleNextFromStep1 = (e) => {
    e.preventDefault();
    if (!projectData.projectName.trim()) return;
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromStep2 = (e) => {
    e.preventDefault();
    if (!isGoogleDriveValid(projectData.googleDriveUrl)) {
      setSubmitError('Please enter a valid Google Drive shareable link (drive.google.com).');
      return;
    }
    setSubmitError(null);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!user) {
      // Direct unauthenticated user to login first
      onNavigate('/login');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newOrder = await createOrder({
        projectName: projectData.projectName,
        packageName: projectData.packageName,
        platform: projectData.videoType,
        editingStyle: projectData.editingStyle,
        targetLength: '10-12 mins',
        instructions: `${projectData.description}\n\nRequirements:\n${projectData.instructions}`.trim(),
        googleDriveUrl: projectData.googleDriveUrl,
        deadline: projectData.deadline
      });

      if (newOrder && newOrder.id) {
        onNavigate(`/order/success/${newOrder.id}`);
      } else {
        onNavigate('/dashboard');
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit project brief. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[90vh] py-12 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Header Progress Stepper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#A1A1A6] hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO STUDIO</span>
          </button>
          <span className="font-mono text-xs text-[#00CDB8] uppercase tracking-wider">
            STEP 0{currentStep} / 03
          </span>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { step: 1, title: 'Project Details' },
            { step: 2, title: 'Footage Source' },
            { step: 3, title: 'Review & Submit' }
          ].map((item) => (
            <div 
              key={item.step}
              onClick={() => {
                if (item.step < currentStep) setCurrentStep(item.step);
              }}
              className={`p-3 rounded-[8px] border transition-all cursor-pointer ${
                currentStep === item.step
                  ? 'bg-[#1A1A1A] border-[#00CDB8] text-white'
                  : currentStep > item.step
                  ? 'bg-[#1A1A1A]/60 border-white/10 text-[#00CDB8]'
                  : 'bg-white/[0.02] border-white/5 text-[#6F7075]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span>0{item.step}</span>
                {currentStep > item.step && <Check size={12} className="text-[#00CDB8]" />}
              </div>
              <div className="font-medium text-xs sm:text-sm mt-1">{item.title}</div>
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-[8px] flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: PROJECT DETAILS
      ───────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <motion.form 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleNextFromStep1}
          className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 sm:p-10 space-y-6 shadow-xl"
        >
          <div className="border-b border-white/[0.08] pb-4 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Project Scope & Brief</h1>
            <p className="text-xs text-[#A1A1A6]">
              Define your production target, platform requirements, and editorial specifications.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                Project Title <span className="text-[#00CDB8]">*</span>
              </label>
              <input 
                type="text" 
                required 
                value={projectData.projectName}
                onChange={e => setProjectData({ ...projectData, projectName: e.target.value })}
                placeholder="e.g. M4 Max Studio Workflow Deep-Dive"
                className="triphoria-input text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                  Selected Service Tier
                </label>
                <select 
                  value={projectData.packageName}
                  onChange={e => setProjectData({ ...projectData, packageName: e.target.value })}
                  className="triphoria-input text-sm"
                >
                  <option value="Starter Cut">Starter Cut (Short-Form / Reels) — $149</option>
                  <option value="Pro Creator">Pro Creator (Episodic / YouTube) — $399</option>
                  <option value="Cinematic Master">Cinematic Master (Commercial / Doc) — $899</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                  Primary Output Platform
                </label>
                <select 
                  value={projectData.videoType}
                  onChange={e => setProjectData({ ...projectData, videoType: e.target.value })}
                  className="triphoria-input text-sm"
                >
                  <option value="YouTube (16:9)">YouTube (16:9 4K UHD)</option>
                  <option value="Instagram / TikTok (9:16)">Instagram / TikTok / Shorts (9:16)</option>
                  <option value="Commercial Multi-Format (16:9 + 9:16 + 1:1)">Commercial Multi-Format (16:9 + 9:16 + 1:1)</option>
                  <option value="Documentary Widescreen (2.39:1 CinemaScope)">Documentary CinemaScope (2.39:1)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                Pacing & Editorial Style
              </label>
              <input 
                type="text" 
                value={projectData.editingStyle}
                onChange={e => setProjectData({ ...projectData, editingStyle: e.target.value })}
                placeholder="e.g. Dynamic Pacing with Minimalist Graphics, Punchy Retention Cuts"
                className="triphoria-input text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                Target Delivery Date
              </label>
              <input 
                type="date" 
                required 
                value={projectData.deadline}
                onChange={e => setProjectData({ ...projectData, deadline: e.target.value })}
                className="triphoria-input text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                Project Narrative & Context
              </label>
              <textarea 
                rows={3}
                value={projectData.description}
                onChange={e => setProjectData({ ...projectData, description: e.target.value })}
                placeholder="Describe what the video is about, the target audience, and the key story beats..."
                className="triphoria-input text-sm resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                Specific Creative Requirements & Brand Guidelines
              </label>
              <textarea 
                rows={3}
                value={projectData.instructions}
                onChange={e => setProjectData({ ...projectData, instructions: e.target.value })}
                placeholder="Notes on music genre, fonts, color palette, logos, references or specific timestamps..."
                className="triphoria-input text-sm resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/[0.08]">
            <button 
              type="submit" 
              className="btn-primary flex items-center gap-2 px-6 py-3 font-semibold text-sm cursor-pointer"
            >
              <span>Continue to Footage Link</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: GOOGLE DRIVE FOOTAGE LINK
      ───────────────────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <motion.form 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleNextFromStep2}
          className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 sm:p-10 space-y-6 shadow-xl"
        >
          <div className="border-b border-white/[0.08] pb-4 space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#00CDB8]">
              <Film size={13} />
              <span>DIRECT SOURCE REPOSITORY</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Google Drive Footage Source</h1>
            <p className="text-xs text-[#A1A1A6]">
              TRIPHORIA does not upload raw video bytes through our servers. Your raw media stays safely stored in your Google Drive.
            </p>
          </div>

          {/* Link Input Field */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
              Google Drive Shareable Folder or File Link <span className="text-[#00CDB8]">*</span>
            </label>
            <div className="relative">
              <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F7075]" />
              <input 
                type="url" 
                required 
                value={projectData.googleDriveUrl}
                onChange={e => {
                  setProjectData({ ...projectData, googleDriveUrl: e.target.value.trim() });
                  setSubmitError(null);
                }}
                placeholder="https://drive.google.com/drive/folders/1abc... or https://drive.google.com/file/d/..."
                className="triphoria-input pl-10 pr-12 text-sm font-mono"
              />
              {isGoogleDriveValid(projectData.googleDriveUrl) && (
                <CheckCircle2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#34D399]" />
              )}
            </div>
            
            {projectData.googleDriveUrl && !isGoogleDriveValid(projectData.googleDriveUrl) && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5 mt-1 font-mono">
                <AlertCircle size={13} />
                <span>Link must be a valid Google Drive address (drive.google.com).</span>
              </p>
            )}

            {isGoogleDriveValid(projectData.googleDriveUrl) && (
              <p className="text-xs text-[#34D399] flex items-center gap-1.5 mt-1 font-mono">
                <Check size={13} />
                <span>Google Drive link format verified.</span>
              </p>
            )}
          </div>

          {/* Sharing Permissions Instruction Box */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-[12px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle size={15} className="text-[#00CDB8]" />
                <span className="font-mono text-xs uppercase text-white font-medium tracking-wider">
                  Important Access Setting
                </span>
              </div>
              <button
                type="button"
                onClick={copySharingInstructions}
                className="inline-flex items-center gap-1.5 text-xs text-[#00CDB8] hover:text-[#00E6CE] font-mono transition-colors"
              >
                <Copy size={12} />
                <span>{copiedHelp ? 'Copied Instructions!' : 'Copy Steps'}</span>
              </button>
            </div>

            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Make sure your Google Drive folder or file permissions are set to:
              <strong className="text-white block mt-1 font-sans text-sm">
                &ldquo;Anyone with the link can view&rdquo;
              </strong>
            </p>

            <div className="bg-black/40 rounded-[8px] p-3 text-xs font-mono text-[#A1A1A6] space-y-1 border border-white/[0.04]">
              <div>1. In Google Drive, right-click the footage folder &rarr; Share</div>
              <div>2. Under General access, select &ldquo;Anyone with the link&rdquo;</div>
              <div>3. Set role to &ldquo;Viewer&rdquo; (or Editor if proxy exports are needed)</div>
              <div>4. Click &ldquo;Copy link&rdquo; and paste above</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            <button 
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn-ghost text-xs cursor-pointer"
            >
              Back to Details
            </button>
            <button 
              type="submit" 
              disabled={!isGoogleDriveValid(projectData.googleDriveUrl)}
              className="btn-primary flex items-center gap-2 px-6 py-3 font-semibold text-sm cursor-pointer disabled:opacity-40"
            >
              <span>Review Project</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 3: REVIEW & SUBMIT
      ───────────────────────────────────────────────────────────── */}
      {currentStep === 3 && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 sm:p-10 space-y-6 shadow-xl"
        >
          <div className="border-b border-white/[0.08] pb-4 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Review & Confirm Submission</h1>
            <p className="text-xs text-[#A1A1A6]">
              Verify your project information and footage access before dispatching to studio queue.
            </p>
          </div>

          {/* Project Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111111] border border-white/[0.08] p-4 rounded-[10px] space-y-1">
              <span className="font-mono text-[11px] text-[#6F7075] uppercase">Project Title</span>
              <div className="font-medium text-white text-base">{projectData.projectName}</div>
            </div>

            <div className="bg-[#111111] border border-white/[0.08] p-4 rounded-[10px] space-y-1">
              <span className="font-mono text-[11px] text-[#6F7075] uppercase">Service Tier</span>
              <div className="font-medium text-[#00CDB8] text-base">{projectData.packageName}</div>
            </div>

            <div className="bg-[#111111] border border-white/[0.08] p-4 rounded-[10px] space-y-1">
              <span className="font-mono text-[11px] text-[#6F7075] uppercase">Platform & Format</span>
              <div className="font-medium text-white text-sm">{projectData.videoType}</div>
            </div>

            <div className="bg-[#111111] border border-white/[0.08] p-4 rounded-[10px] space-y-1">
              <span className="font-mono text-[11px] text-[#6F7075] uppercase">Target Delivery</span>
              <div className="font-medium text-white text-sm font-mono">{projectData.deadline}</div>
            </div>
          </div>

          {/* Google Drive Link Box */}
          <div className="bg-[#111111] border border-white/[0.08] p-4 rounded-[10px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#6F7075] uppercase">Footage Source Repository</span>
              <button 
                type="button" 
                onClick={() => setCurrentStep(2)}
                className="text-xs text-[#00CDB8] hover:underline font-mono"
              >
                Edit Link
              </button>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-[6px] bg-black/50 border border-white/[0.06] text-xs font-mono text-[#00CDB8] break-all">
              <LinkIcon size={14} className="shrink-0" />
              <span className="truncate">{projectData.googleDriveUrl}</span>
              <a 
                href={projectData.googleDriveUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="shrink-0 p-1 text-[#A1A1A6] hover:text-white ml-auto"
                title="Open link in new tab"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Editorial Notes */}
          {(projectData.description || projectData.instructions) && (
            <div className="bg-[#111111] border border-white/[0.08] p-4 rounded-[10px] space-y-2 text-xs">
              <span className="font-mono text-[11px] text-[#6F7075] uppercase">Brief & Requirements</span>
              {projectData.description && (
                <p className="text-[#A1A1A6] leading-relaxed">{projectData.description}</p>
              )}
              {projectData.instructions && (
                <p className="text-[#A1A1A6] leading-relaxed border-t border-white/[0.06] pt-2">{projectData.instructions}</p>
              )}
            </div>
          )}

          {/* Notice */}
          <div className="bg-[#004C47]/20 border border-[#00CDB8]/20 rounded-[10px] p-4 text-xs space-y-1">
            <div className="font-medium text-[#00CDB8] flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>What Happens Next</span>
            </div>
            <p className="text-[#A1A1A6] leading-relaxed">
              Upon submission, your project status becomes <strong className="text-white">&ldquo;Pending Approval&rdquo;</strong>. Studio administration verifies Google Drive footage access and pairs your brief with a specialized lead editor. You will track every milestone directly from your project dashboard.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            <button 
              type="button"
              onClick={() => setCurrentStep(2)}
              className="btn-ghost text-xs cursor-pointer"
            >
              Back to Footage
            </button>
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 px-8 py-3.5 font-semibold text-sm cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Dispatching Brief...' : 'Submit Project to Studio'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
