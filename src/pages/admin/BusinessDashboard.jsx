import React from 'react';
import {
  Clock, Play, CheckCircle2, AlertTriangle, ArrowRight,
  Users, Film, FileText, Layers,
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem } from '../../components/motion/Reveal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

function MetricCard({ label, index, value, hint, icon: Icon, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="u-focus group space-y-2 border p-5 text-left transition-colors"
      style={{ borderRadius: 'var(--radius-editorial)', borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between font-mono text-[11px]" style={{ color: accent }}>
        <span>{index}. {label}</span>
        <Icon size={15} />
      </div>
      <div className="font-mono text-3xl font-bold text-[var(--foreground-strong)] transition-colors">
        {value}
      </div>
      <div className="flex items-center justify-between text-[12px] text-[var(--foreground-muted)]">
        <span>{hint}</span>
        <span className="font-mono text-[14px]" style={{ color: accent }}>&rarr;</span>
      </div>
    </button>
  );
}

export function BusinessDashboard({ onNavigate }) {
  const { orders } = useOrders();
  const { editors } = useAuth();

  // Operationally focused queues, strict priority order — all real DB-derived
  // counts, nothing fabricated.
  const pendingOrders = orders.filter((o) => o.status === 'Pending Approval');
  const inProgressOrders = orders.filter((o) => o.status === 'In Progress');
  const reviewOrders = orders.filter((o) => o.status === 'Review');

  // Urgent deadlines (< 48 hours remaining)
  const urgentOrders = orders.filter((o) => {
    if (o.status === 'Completed' || o.status === 'Rejected') return false;
    const hoursLeft = (new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft < 48;
  });

  return (
    <Scene variant="dark-editorial" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <p className="type-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              Studio super admin &middot; operational dispatch
            </p>
            <h1 className="type-h1">Production pipeline control</h1>
            <p className="max-w-xl text-[12px] text-[var(--foreground-muted)]">
              Real-time operational authority over customer briefs, active editor assignments, review decisions, and the website CMS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => onNavigate('/admin/orders')} className="btn-primary">
              Orders Queue <ArrowRight size={13} />
            </button>
            <button onClick={() => onNavigate('/admin/editors')} className="btn-ghost">Manage Editors</button>
            <button onClick={() => onNavigate('/admin/customers')} className="btn-ghost">Customers</button>
            <button onClick={() => onNavigate('/admin/cms')} className="btn-ghost">Website CMS</button>
            <button onClick={() => onNavigate('/admin/audit-logs')} className="btn-ghost">Audit Log</button>
          </div>
        </div>

        <Stagger speed="micro" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <MetricCard
              index="01" label="Pending Approval" value={pendingOrders.length}
              hint="Awaiting brief review & editor assignment" icon={Clock}
              accent="var(--warning)" onClick={() => onNavigate('/admin/orders')}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              index="02" label="In Production" value={inProgressOrders.length}
              hint="Active editor assembly & cut queues" icon={Play}
              accent="var(--primary)" onClick={() => onNavigate('/admin/orders')}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              index="03" label="Ready for Review" value={reviewOrders.length}
              hint="Cuts submitted for client decision" icon={Film}
              accent="var(--accent)" onClick={() => onNavigate('/admin/orders')}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              index="04" label="Editor Pool" value={editors.length}
              hint="Active studio editors available" icon={Users}
              accent="var(--foreground-muted)" onClick={() => onNavigate('/admin/editors')}
            />
          </StaggerItem>
        </Stagger>

        {urgentOrders.length > 0 && (
          <Reveal
            className="mb-6 space-y-3 border p-4"
            style={{ borderRadius: 'var(--radius-editorial)', borderColor: 'var(--warning)', background: 'var(--warning-muted)' }}
          >
            <div className="flex items-center gap-2 font-mono text-[12px] font-semibold uppercase" style={{ color: 'var(--warning)' }}>
              <AlertTriangle size={15} />
              <span>Urgent delivery deadlines (&lt; 48 hours remaining)</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {urgentOrders.map((ord) => (
                <button
                  key={ord.id}
                  onClick={() => onNavigate('/admin/orders')}
                  className="u-focus flex items-center justify-between border border-[var(--border)] bg-[var(--surface)] p-3 text-left"
                  style={{ borderRadius: 'var(--radius-editorial)' }}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[12px] text-[var(--foreground-strong)]">{ord.id}</span>
                    <div className="truncate text-[11px] text-[var(--foreground-muted)]">{ord.details?.projectName}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[12px]" style={{ color: 'var(--warning)' }}>{ord.deadline}</span>
                </button>
              ))}
            </div>
          </Reveal>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Priority queue (7 cols) */}
          <div className="lg:col-span-7">
            <Reveal className="u-frame space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <span className="type-eyebrow !text-[var(--warning)]">Immediate action required</span>
                  <h2 className="type-h3">Pending project approvals ({pendingOrders.length})</h2>
                </div>
                <button onClick={() => onNavigate('/admin/orders')} className="u-focus font-mono text-[12px] text-[var(--primary)] hover:underline">
                  Open full directory &rarr;
                </button>
              </div>

              {pendingOrders.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Queue clear" body="All incoming project briefs have been approved and assigned." />
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map((ord) => (
                    <button
                      key={ord.id}
                      onClick={() => onNavigate('/admin/orders')}
                      className="u-focus block w-full space-y-2 border border-[var(--border)] p-4 text-left transition-colors hover:border-[var(--warning)]"
                      style={{ borderRadius: 'var(--radius-editorial)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2 truncate font-mono text-[11px]">
                            <span className="shrink-0 font-bold" style={{ color: 'var(--warning)' }}>{ord.id}</span>
                            <span className="shrink-0 text-[var(--foreground-subtle)]">&bull;</span>
                            <span className="truncate text-[var(--foreground-muted)]">{ord.customerName} ({ord.customerEmail})</span>
                          </div>
                          <h3 className="mt-0.5 truncate text-[14px] font-semibold text-[var(--foreground-strong)]">{ord.details?.projectName}</h3>
                        </div>
                        <StatusBadge status={ord.status} />
                      </div>
                      {ord.googleDriveUrl && (
                        <div className="flex items-center gap-1.5 truncate font-mono text-[11px] text-[var(--primary)]">
                          <Film size={12} className="shrink-0" />
                          <span className="truncate">{ord.googleDriveUrl}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 font-mono text-[11px] text-[var(--foreground-subtle)]">
                        <span>Format: {ord.details?.platform || '16:9'}</span>
                        <span>Target: {ord.deadline}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Reveal>
          </div>

          {/* Quick controls (5 cols) */}
          <div className="space-y-5 lg:col-span-5">
            <Reveal className="u-frame space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="type-label">Editor Capacity</h3>
                <button onClick={() => onNavigate('/admin/editors')} className="u-focus font-mono text-[12px] text-[var(--primary)] hover:underline">
                  Manage &rarr;
                </button>
              </div>
              <div className="space-y-2">
                {editors.slice(0, 4).map((ed) => (
                  <div key={ed.id} className="flex items-center justify-between border border-[var(--border)] p-2.5 text-[12px]" style={{ borderRadius: 'var(--radius-editorial)' }}>
                    <div>
                      <div className="font-medium text-[var(--foreground-strong)]">{ed.name}</div>
                      <div className="font-mono text-[10px] text-[var(--foreground-subtle)]">{ed.specialty}</div>
                    </div>
                    <span className="u-tag !py-0.5">Active</span>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal className="u-frame space-y-3 p-6">
              <h3 className="type-label">System Administration</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onNavigate('/admin/cms')}
                  className="u-focus space-y-1.5 border border-[var(--border)] p-3 text-left transition-colors hover:border-[var(--primary)]"
                  style={{ borderRadius: 'var(--radius-editorial)' }}
                >
                  <Layers size={16} className="text-[var(--primary)]" />
                  <div className="text-[12px] text-[var(--foreground-strong)]">Website CMS</div>
                  <div className="text-[10px] text-[var(--foreground-subtle)]">Portfolio &amp; Featured</div>
                </button>
                <button
                  onClick={() => onNavigate('/admin/audit-logs')}
                  className="u-focus space-y-1.5 border border-[var(--border)] p-3 text-left transition-colors hover:border-[var(--accent)]"
                  style={{ borderRadius: 'var(--radius-editorial)' }}
                >
                  <FileText size={16} className="text-[var(--accent)]" />
                  <div className="text-[12px] text-[var(--foreground-strong)]">Audit Registry</div>
                  <div className="text-[10px] text-[var(--foreground-subtle)]">Immutable logs</div>
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </Scene>
  );
}

export default BusinessDashboard;
