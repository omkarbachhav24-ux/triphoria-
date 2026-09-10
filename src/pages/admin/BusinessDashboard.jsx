import React from 'react';
import { 
  Clock, Play, CheckCircle2, AlertTriangle, ArrowRight, 
  Users, Film, FileText, Layers
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const BusinessDashboard = ({ onNavigate }) => {
  const { orders } = useOrders();
  const { editors } = useAuth();

  // Operationally Focused Queues (Strict Priority Order per §10)
  const pendingOrders = orders.filter(o => o.status === 'Pending Approval');
  const inProgressOrders = orders.filter(o => o.status === 'In Progress');
  const reviewOrders = orders.filter(o => o.status === 'Review');

  // Urgent Deadlines (< 48 hours remaining)
  const urgentOrders = orders.filter(o => {
    if (o.status === 'Completed' || o.status === 'Rejected') return false;
    const due = new Date(o.deadline).getTime();
    const now = Date.now();
    const hoursLeft = (due - now) / (1000 * 60 * 60);
    return hoursLeft < 48;
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Operational Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#00CDB8] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00CDB8] animate-pulse" />
            <span>STUDIO SUPER ADMIN &middot; OPERATIONAL DISPATCH</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Production Pipeline Control
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            Real-time operational authority over customer briefs, active editor assignments, review decisions, and website CMS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => onNavigate('/admin/orders')} 
            className="btn-primary text-xs py-2.5 px-4 font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Orders Queue</span>
            <ArrowRight size={13} />
          </button>
          <button 
            onClick={() => onNavigate('/admin/editors')} 
            className="btn-ghost text-xs py-2 px-3 cursor-pointer"
          >
            Manage Editors
          </button>
          <button 
            onClick={() => onNavigate('/admin/cms')} 
            className="btn-ghost text-xs py-2 px-3 cursor-pointer"
          >
            Website CMS
          </button>
          <button 
            onClick={() => onNavigate('/admin/audit-logs')} 
            className="btn-ghost text-xs py-2 px-3 cursor-pointer"
          >
            Audit Log
          </button>
        </div>
      </div>

      {/* Priority 1-4: Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Pending Approvals (Top Priority) */}
        <div 
          onClick={() => onNavigate('/admin/orders')}
          className="bg-[#1A1A1A] border border-amber-500/30 hover:border-amber-400 rounded-[12px] p-5 space-y-2 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex justify-between items-center text-xs font-mono text-amber-400">
            <span>01. PENDING APPROVAL</span>
            <Clock size={15} />
          </div>
          <div className="text-3xl font-mono font-bold text-white group-hover:text-amber-400 transition-colors">
            {pendingOrders.length}
          </div>
          <div className="text-xs text-[#A1A1A6] flex items-center justify-between">
            <span>Awaiting brief review & editor assignment</span>
            <span className="text-amber-400 font-mono text-sm">&rarr;</span>
          </div>
        </div>

        {/* 2. Active Projects In Progress */}
        <div 
          onClick={() => onNavigate('/admin/orders')}
          className="bg-[#1A1A1A] border border-white/[0.08] hover:border-[#00CDB8]/50 rounded-[12px] p-5 space-y-2 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex justify-between items-center text-xs font-mono text-[#00CDB8]">
            <span>02. IN PRODUCTION</span>
            <Play size={15} />
          </div>
          <div className="text-3xl font-mono font-bold text-white group-hover:text-[#00CDB8] transition-colors">
            {inProgressOrders.length}
          </div>
          <div className="text-xs text-[#A1A1A6] flex items-center justify-between">
            <span>Active editor assembly & cut queues</span>
            <span className="text-[#00CDB8] font-mono text-sm">&rarr;</span>
          </div>
        </div>

        {/* 3. Requiring Review */}
        <div 
          onClick={() => onNavigate('/admin/orders')}
          className="bg-[#1A1A1A] border border-white/[0.08] hover:border-[#B7A8FF]/50 rounded-[12px] p-5 space-y-2 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex justify-between items-center text-xs font-mono text-[#B7A8FF]">
            <span>03. READY FOR REVIEW</span>
            <Film size={15} />
          </div>
          <div className="text-3xl font-mono font-bold text-white group-hover:text-[#B7A8FF] transition-colors">
            {reviewOrders.length}
          </div>
          <div className="text-xs text-[#A1A1A6] flex items-center justify-between">
            <span>Cuts submitted for client decision</span>
            <span className="text-[#B7A8FF] font-mono text-sm">&rarr;</span>
          </div>
        </div>

        {/* 4. Active Editor Capacity */}
        <div 
          onClick={() => onNavigate('/admin/editors')}
          className="bg-[#1A1A1A] border border-white/[0.08] hover:border-white/20 rounded-[12px] p-5 space-y-2 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex justify-between items-center text-xs font-mono text-[#A1A1A6]">
            <span>04. EDITOR POOL</span>
            <Users size={15} />
          </div>
          <div className="text-3xl font-mono font-bold text-white group-hover:text-[#00CDB8] transition-colors">
            {editors.length || 3}
          </div>
          <div className="text-xs text-[#A1A1A6] flex items-center justify-between">
            <span>Active studio editors available</span>
            <span className="text-white font-mono text-sm">&rarr;</span>
          </div>
        </div>

      </div>

      {/* Urgent SLA Alerts (if any) */}
      {urgentOrders.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[12px] p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-mono uppercase font-semibold">
            <AlertTriangle size={15} />
            <span>Urgent Delivery Deadlines (&lt; 48 Hours Remaining)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {urgentOrders.map(ord => (
              <div 
                key={ord.id}
                onClick={() => onNavigate('/admin/orders')}
                className="bg-[#111111] p-3 rounded-[8px] border border-white/[0.06] flex items-center justify-between cursor-pointer hover:border-amber-400/50"
              >
                <div>
                  <span className="font-mono text-white text-xs">{ord.id}</span>
                  <div className="text-[11px] text-[#A1A1A6] truncate max-w-[180px]">{ord.details?.projectName}</div>
                </div>
                <span className="font-mono text-amber-400 text-xs">{ord.deadline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Queues: Pending Approvals (Priority 1) & Active Production */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Priority 1 Queue: Pending Orders (7 cols) */}
        <div className="lg:col-span-7 bg-[#1A1A1A] border border-white/10 rounded-[14px] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase">IMMEDIATE ACTION REQUIRED</span>
              <h2 className="text-lg font-bold text-white">Pending Project Approvals ({pendingOrders.length})</h2>
            </div>
            <button 
              onClick={() => onNavigate('/admin/orders')}
              className="text-xs font-mono text-[#00CDB8] hover:underline"
            >
              Open Full Directory &rarr;
            </button>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6F7075] font-mono space-y-1">
              <CheckCircle2 size={24} className="text-[#34D399] mx-auto mb-2" />
              <div>All incoming project briefs have been approved and assigned.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map(ord => (
                <div 
                  key={ord.id}
                  onClick={() => onNavigate('/admin/orders')}
                  className="bg-[#111111] border border-white/[0.06] hover:border-amber-400/50 rounded-[10px] p-4 space-y-2 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-amber-400 font-bold">{ord.id}</span>
                        <span className="text-[#6F7075]">&bull;</span>
                        <span className="text-[#A1A1A6]">{ord.customerName} ({ord.customerEmail})</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-0.5">{ord.details?.projectName}</h3>
                    </div>
                    <StatusBadge status={ord.status} />
                  </div>

                  {ord.googleDriveUrl && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#00CDB8] truncate">
                      <Film size={12} className="shrink-0" />
                      <span className="truncate">{ord.googleDriveUrl}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] font-mono text-[#6F7075]">
                    <span>Format: {ord.details?.platform || '16:9'}</span>
                    <span>Target: {ord.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational Quick Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Editor Capacity Snapshot */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Editor Capacity</h3>
              <button 
                onClick={() => onNavigate('/admin/editors')}
                className="text-xs font-mono text-[#00CDB8] hover:underline"
              >
                Manage &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {editors.slice(0, 4).map(ed => (
                <div key={ed.id} className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#111111] border border-white/[0.04] text-xs">
                  <div className="space-y-0.5">
                    <div className="font-medium text-white">{ed.name}</div>
                    <div className="text-[10px] font-mono text-[#6F7075]">{ed.specialty}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[#00CDB8] font-mono text-[11px]">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick CMS & Audit Navigation */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] p-6 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">System Administration</h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={() => onNavigate('/admin/cms')}
                className="p-3 rounded-[8px] bg-[#111111] border border-white/[0.06] hover:border-[#00CDB8] text-left transition-all group"
              >
                <Layers size={16} className="text-[#00CDB8] mb-1.5" />
                <div className="text-white group-hover:text-[#00CDB8]">Website CMS</div>
                <div className="text-[10px] text-[#6F7075]">Portfolio &amp; Featured</div>
              </button>

              <button
                onClick={() => onNavigate('/admin/audit-logs')}
                className="p-3 rounded-[8px] bg-[#111111] border border-white/[0.06] hover:border-[#00CDB8] text-left transition-all group"
              >
                <FileText size={16} className="text-[#B7A8FF] mb-1.5" />
                <div className="text-white group-hover:text-[#B7A8FF]">Audit Registry</div>
                <div className="text-[10px] text-[#6F7075]">Immutable logs</div>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
