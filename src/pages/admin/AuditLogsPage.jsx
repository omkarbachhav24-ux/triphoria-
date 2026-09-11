import React, { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useAuditLog } from '../../context/AuditLogContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal } from '../../components/motion/Reveal';
import { EmptyState } from '../../components/ui/EmptyState';

export function AuditLogsPage({ onNavigate }) {
  const { auditLogs: logs = [], pagination, page, goToPage, loading } = useAuditLog();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (l.actor && l.actor.toLowerCase().includes(term)) ||
      (l.details && l.details.toLowerCase().includes(term)) ||
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.entityId && l.entityId.toLowerCase().includes(term));
    const matchesAction = actionFilter === 'All' || l.action.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  const actionColor = (action) => {
    if (action.includes('APPROVED') || action.includes('COMPLETED')) return { background: 'var(--success-muted)', color: 'var(--success)' };
    if (action.includes('REJECTED') || action.includes('PURGED')) return { background: 'var(--error-muted)', color: 'var(--error)' };
    if (action.includes('ASSIGN') || action.includes('CREATED')) return { background: 'var(--primary)', color: 'var(--on-primary)', opacity: 0.85 };
    return { background: 'var(--surface-alt)', color: 'var(--foreground-muted)' };
  };

  return (
    <Scene variant="dark-editorial" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="type-eyebrow">TRIPHORIA trust &amp; traceability ledger</span>
              <span className="u-tag !py-0.5">Immutable append-only</span>
            </div>
            <h1 className="type-h1">Operations &amp; state mutation audit trail</h1>
            <p className="max-w-xl text-[12px] text-[var(--foreground-muted)]">
              Authoritative chronological records for every project intake, Google Drive verification, editor assignment, cut upload, and delivery approval.
            </p>
          </div>
          <button onClick={() => onNavigate('/admin/dashboard')} className="btn-ghost self-start md:self-auto">
            &larr; Return to Dashboard
          </button>
        </div>

        <Reveal className="u-frame mb-6 flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="relative w-full sm:w-96">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by actor, action, order ID, or keyword..."
              className="triphoria-input w-full py-2 pl-9 text-[12px] font-mono"
            />
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <Filter size={14} className="text-[var(--foreground-subtle)]" />
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="triphoria-input py-1.5 text-[12px] font-mono">
              <option value="All">All Operations ({pagination.total || logs.length})</option>
              <option value="ORDER">Project Lifecycles</option>
              <option value="EDITOR">Editor Assignments</option>
              <option value="OUTPUT">Output Cuts &amp; Deliveries</option>
              <option value="CMS">CMS &amp; Content Mutations</option>
              <option value="LOGIN">Security &amp; Sessions</option>
            </select>
          </div>
        </Reveal>

        {filteredLogs.length === 0 ? (
          <EmptyState icon={History} title="No matching audit records" body="Adjust your search or filter — the underlying ledger is immutable and append-only." />
        ) : (
          <Reveal className="u-frame overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-[var(--border)] font-mono text-[11px] uppercase text-[var(--foreground-subtle)]" style={{ background: 'var(--surface-alt)' }}>
                  <tr>
                    <th className="px-4 py-3.5">Timestamp (UTC)</th>
                    <th className="px-4 py-3.5">Action Type</th>
                    <th className="px-4 py-3.5">Entity Target</th>
                    <th className="px-4 py-3.5">Actor</th>
                    <th className="px-6 py-3.5">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-[var(--surface-hover)]">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground-muted)]">
                        {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase" style={actionColor(log.action)}>
                          {log.action}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--foreground-strong)]">
                        {(log.entity || log.entityType) ? `${log.entity || log.entityType} / ` : ''}{log.entityId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground-muted)]">{log.actor}</td>
                      <td className="max-w-lg px-6 py-3 font-sans text-[12px] leading-relaxed text-[var(--foreground)]">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 font-mono text-[11px] text-[var(--foreground-subtle)]">
                <span>Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total events</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                    className="u-focus flex items-center gap-1 border border-[var(--border)] px-2.5 py-1.5 disabled:opacity-40"
                    style={{ borderRadius: 'var(--radius-editorial)' }}
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= pagination.totalPages || loading}
                    className="u-focus flex items-center gap-1 border border-[var(--border)] px-2.5 py-1.5 disabled:opacity-40"
                    style={{ borderRadius: 'var(--radius-editorial)' }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </Reveal>
        )}
      </div>
    </Scene>
  );
}

export default AuditLogsPage;
