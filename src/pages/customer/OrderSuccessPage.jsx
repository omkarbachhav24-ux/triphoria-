import React from 'react';
import { ArrowRight, CheckCircle2, Clock, ExternalLink, Film, ShieldCheck } from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const OrderSuccessPage = ({ orderId, onNavigate }) => {
  const { orders } = useOrders();
  const order = orders.find(o => o.id === orderId);

  return (
    <div className="min-h-[85vh] py-16 px-4 sm:px-6 max-w-3xl mx-auto flex items-center justify-center bg-[#111111] text-[#FAFAF5]">
      <div className="w-full bg-[#1A1A1A] border border-white/10 rounded-[16px] p-8 sm:p-12 text-center space-y-8 shadow-2xl">
        
        {/* Animated Checkmark Badge */}
        <div className="w-16 h-16 rounded-full bg-[#00CDB8]/10 border border-[#00CDB8]/30 text-[#00CDB8] flex items-center justify-center mx-auto text-3xl font-medium shadow-[0_0_25px_rgba(0,205,184,0.2)]">
          <CheckCircle2 size={32} />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#00CDB8] block">
            PROJECT DISPATCHED & LOGGED
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Project Received & In Review
          </h1>
          <p className="text-sm text-[#A1A1A6] max-w-md mx-auto">
            Your brief and Google Drive footage repository have been registered into the TRIPHORIA production ledger.
          </p>
        </div>

        {/* Project Summary Dossier */}
        <div className="bg-[#111111] p-6 rounded-[12px] border border-white/[0.08] text-left space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] pb-3 gap-2">
            <div>
              <span className="text-[#6F7075] font-mono text-[10px] uppercase block">PROJECT IDENTIFIER</span>
              <span className="text-white font-mono text-sm font-semibold">{orderId || 'ORD-PENDING'}</span>
            </div>
            <StatusBadge status={order?.status || 'Pending Approval'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[#A1A1A6]">
            <div>
              <span className="text-[#6F7075] uppercase tracking-wider text-[10px] block font-mono mb-1">Service Tier</span>
              <span className="font-medium text-white text-sm">{order?.packageName || 'Pro Creator'}</span>
            </div>
            <div>
              <span className="text-[#6F7075] uppercase tracking-wider text-[10px] block font-mono mb-1">Project Name</span>
              <span className="font-medium text-white text-sm">{order?.details?.projectName || 'Editorial Cut'}</span>
            </div>
            <div>
              <span className="text-[#6F7075] uppercase tracking-wider text-[10px] block font-mono mb-1">Platform</span>
              <span className="font-mono text-white">{order?.details?.platform || 'YouTube (16:9)'}</span>
            </div>
            <div>
              <span className="text-[#6F7075] uppercase tracking-wider text-[10px] block font-mono mb-1">Target Delivery</span>
              <span className="font-mono text-[#00CDB8]">{order?.deadline || '4 Days'}</span>
            </div>
          </div>

          {order?.googleDriveUrl && (
            <div className="border-t border-white/[0.06] pt-3">
              <span className="text-[#6F7075] uppercase tracking-wider text-[10px] block font-mono mb-1">
                Google Drive Source Link
              </span>
              <div className="flex items-center gap-2 text-xs font-mono text-[#00CDB8] truncate">
                <Film size={13} className="shrink-0" />
                <span className="truncate">{order.googleDriveUrl}</span>
                <a 
                  href={order.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[#A1A1A6] hover:text-white ml-auto"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* What Happens Next Section */}
        <div className="bg-[#004C47]/15 border border-[#00CDB8]/20 rounded-[12px] p-5 text-left space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#00CDB8]">
            <Clock size={16} />
            <span>What Happens Next?</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#A1A1A6]">
            <div className="space-y-1">
              <span className="font-mono text-white font-medium block">01. Studio Verification</span>
              <p className="leading-relaxed text-[11px]">Administration verifies link permissions and footage completeness.</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-white font-medium block">02. Editor Assignment</span>
              <p className="leading-relaxed text-[11px]">Matched with a specialized editor based on your style specifications.</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-white font-medium block">03. Review Cut Delivery</span>
              <p className="leading-relaxed text-[11px]">Master review cut uploaded for your approval before final ProRes delivery.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button 
            onClick={() => onNavigate('/dashboard')} 
            className="btn-primary py-3.5 px-8 text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,205,184,0.3)]"
          >
            <span>Enter Customer Dashboard</span>
            <ArrowRight size={15} />
          </button>
        </div>

      </div>
    </div>
  );
};
