import React, { useState } from 'react';
import { History, Shield, Lock, Search, Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuditLog } from '../../context/AuditLogContext';

export const AuditLogsPage = ({ onNavigate }) => {
  const { logs } = useAuditLog();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const filteredLogs = logs.filter(l => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (l.actor && l.actor.toLowerCase().includes(term)) ||
      (l.details && l.details.toLowerCase().includes(term)) ||
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.entityId && l.entityId.toLowerCase().includes(term));

    const matchesAction = actionFilter === 'All' || l.action.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-8 bg-[#111111] text-[#FAFAF5]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#00CDB8]">
              TRIPHORIA TRUST &amp; TRACEABILITY LEDGER
            </span>
            <span className="text-[10px] bg-[#00CDB8]/15 text-[#00CDB8] px-2 py-0.5 rounded-full font-mono font-medium">
              IMMUTABLE APPEND-ONLY
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Operations &amp; State Mutation Audit Trail
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            Authoritative chronological records for every project intake, Google Drive verification, editor assignment, cut upload, and delivery approval.
          </p>
        </div>

        <button 
          onClick={() => onNavigate('/admin/dashboard')}
          className="btn-ghost text-xs py-2 px-3 self-start md:self-auto cursor-pointer"
        >
          &larr; Return to Dashboard
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#1A1A1A] border border-white/[0.08] p-4 rounded-[12px] flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F7075]" />
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by actor, action, order ID, or keyword..."
            className="triphoria-input pl-9 text-xs font-mono w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter size={14} className="text-[#6F7075]" />
          <select 
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="triphoria-input py-1.5 text-xs font-mono cursor-pointer"
          >
            <option value="All">All Operations ({logs.length})</option>
            <option value="ORDER">Project Lifecycles</option>
            <option value="EDITOR">Editor Assignments</option>
            <option value="OUTPUT">Output Cuts &amp; Deliveries</option>
            <option value="CMS">CMS &amp; Content Mutations</option>
            <option value="LOGIN">Security &amp; Sessions</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-[14px] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-[#6F7075] font-mono uppercase text-[11px] border-b border-white/[0.08]">
              <tr>
                <th className="py-3.5 px-4">Timestamp (UTC)</th>
                <th className="py-3.5 px-4">Action Type</th>
                <th className="py-3.5 px-4">Entity Target</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-6">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6F7075] font-sans">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-[#A1A1A6] whitespace-nowrap">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        log.action.includes('APPROVED') || log.action.includes('COMPLETED')
                          ? 'bg-[#34D399]/15 text-[#34D399]'
                          : log.action.includes('REJECTED')
                          ? 'bg-red-500/15 text-red-400'
                          : log.action.includes('ASSIGN') || log.action.includes('CREATED')
                          ? 'bg-[#00CDB8]/15 text-[#00CDB8]'
                          : 'bg-white/[0.05] text-[#A1A1A6]'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-medium whitespace-nowrap">
                      {log.entityType ? `${log.entityType} / ` : ''}{log.entityId}
                    </td>
                    <td className="py-3 px-4 text-[#A1A1A6] whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="py-3 px-6 text-[#FAFAF5] font-sans text-xs max-w-lg leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
