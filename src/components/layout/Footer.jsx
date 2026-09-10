import React, { useState } from 'react';

export const Footer = ({ onNavigate }) => {
  const [showTermsModal, setShowTermsModal] = useState(false);

  return (
    <footer className="bg-[#111111] border-t border-white/[0.08] text-[#A1A1A6] pt-16 pb-14 text-xs font-sans">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 space-y-12">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          
          {/* Brand Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div 
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => onNavigate('/')}
            >
              <div className="w-7 h-7 rounded-[6px] bg-[#00CDB8] text-[#111111] flex items-center justify-center font-mono font-bold text-xs">
                TP
              </div>
              <span className="font-sans font-semibold text-[18px] tracking-[-0.03em] text-white">
                TRIPHORIA
              </span>
            </div>
            
            <p className="text-[13px] leading-[1.6] text-[#a1a1a6] max-w-sm">
              Independent post-production for creators, brands, and teams who care about the final frame. Senior editors, clear review cycles, and a production process designed to keep every project moving.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 text-[11px] text-[#6f7075] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" aria-hidden="true" />
                POST-PRODUCTION STUDIO · ACTIVE CAPACITY
              </span>
            </div>
          </div>

          {/* Column 2: Studio Workspaces (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-white">Workspaces</h4>
            <ul className="space-y-2 text-[#a1a1a6]">
              <li>
                <button onClick={() => onNavigate('/dashboard')} className="hover:text-white transition-colors cursor-pointer">
                  Client Project Workspace
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/editor/dashboard')} className="hover:text-white transition-colors cursor-pointer">
                  Editor Work Queue
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/admin/dashboard')} className="hover:text-white transition-colors cursor-pointer">
                  Studio Management Control
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/admin/audit-logs')} className="hover:text-white transition-colors cursor-pointer">
                  Project Version History
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Studio Directory & Terms (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-white">Studio Directory</h4>
            <ul className="space-y-2 text-[#a1a1a6]">
              <li>
                <button onClick={() => onNavigate('/work')} className="hover:text-white transition-colors cursor-pointer">
                  Selected Commercial Portfolio
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/order')} className="hover:text-white transition-colors cursor-pointer">
                  Start a Project Brief
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setShowTermsModal(true)} 
                  className="hover:text-white transition-colors cursor-pointer underline text-[#6f7075]"
                >
                  14-Day Footage Retention Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/docs')} className="hover:text-white transition-colors cursor-pointer font-mono text-[#a1a1a6] text-[11px]">
                  Design System Reference →
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Understated Brand Statement */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-[#6f7075]">
          <div>
            © {new Date().getFullYear()} TRIPHORIA Post-Production. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <span>Editing</span>
            <span>·</span>
            <span>Color</span>
            <span>·</span>
            <span>Sound</span>
            <span>·</span>
            <span>Motion</span>
          </div>
        </div>

      </div>

      {/* Retention Policy Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-w-lg w-full bg-[#111214] border border-white/10 rounded-[10px] p-6 text-[#a1a1a6] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="font-sans font-semibold text-white text-base">Footage Retention Policy</h3>
              <button onClick={() => setShowTermsModal(false)} aria-label="Close retention modal" className="text-white hover:opacity-70 font-mono text-sm">✕</button>
            </div>
            <p className="text-[13px] leading-relaxed">
              Upon final project delivery and client approval, all project media remains safely stored in our active vault for a <strong className="text-white">14-day retention buffer</strong>. This window allows your team to request minor adaptations or export adjustments before raw project files transition to long-term archive.
            </p>
            <div className="text-right pt-2">
              <button 
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-1.5 rounded-[6px] bg-white text-black font-medium text-xs hover:bg-neutral-200"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
