import React, { useMemo, useState } from 'react';
import { Search, Users, Mail, Film } from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal, Stagger, StaggerItem } from '../../components/motion/Reveal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

/**
 * CustomerCRMPage — derives a customer roster directly from real order
 * records (admin already receives client_name/client_email on every order
 * via GET /api/orders). There is no separate customers table/endpoint, so
 * this view is built entirely from genuine transaction history rather than
 * a parallel data source — no fabricated metrics, no synthetic customers.
 */
function buildCustomers(orders) {
  const byEmail = new Map();
  for (const o of orders) {
    const email = (o.customerEmail || '').toLowerCase();
    if (!email) continue;
    if (!byEmail.has(email)) {
      byEmail.set(email, { email, name: o.customerName || email, orders: [] });
    }
    byEmail.get(email).orders.push(o);
  }
  return Array.from(byEmail.values()).map((c) => {
    const sorted = [...c.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      ...c,
      orders: sorted,
      totalProjects: sorted.length,
      active: sorted.filter((o) => !['Completed', 'Rejected'].includes(o.status)).length,
      completed: sorted.filter((o) => o.status === 'Completed').length,
      lastActivity: sorted[0]?.updatedAt || sorted[0]?.createdAt || null,
    };
  }).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

export function CustomerCRMPage({ onNavigate }) {
  const { orders } = useOrders();
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);

  const customers = useMemo(() => buildCustomers(orders), [orders]);
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });
  const selected = filtered.find((c) => c.email === selectedEmail) || filtered[0] || null;

  return (
    <Scene variant="dark-editorial" className="min-h-screen pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <p className="type-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Customer relationship registry
            </p>
            <h1 className="type-h1">Customers ({customers.length})</h1>
            <p className="max-w-xl text-[12px] text-[var(--foreground-muted)]">
              Every customer here has placed at least one real order. Profile and history are derived directly from production records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('/admin/dashboard')} className="btn-ghost">Dashboard</button>
            <button onClick={() => onNavigate('/admin/orders')} className="btn-ghost">Orders</button>
          </div>
        </div>

        <div className="u-frame mb-6 p-4">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="triphoria-input w-full py-2 pl-9 text-[12px]"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" body="No customer accounts match your search, or no orders have been placed yet." />
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Customer roster (7 cols) */}
            <div className="lg:col-span-7">
              <Stagger speed="micro" className="space-y-3">
                {filtered.map((c) => {
                  const isSelected = selected?.email === c.email;
                  return (
                    <StaggerItem key={c.email}>
                      <button
                        onClick={() => setSelectedEmail(c.email)}
                        className="u-focus block w-full space-y-2 border p-4 text-left transition-colors"
                        style={{ borderRadius: 'var(--radius-editorial)', borderColor: isSelected ? 'var(--primary)' : 'var(--border)', background: 'var(--surface)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-semibold text-[var(--foreground-strong)]">{c.name}</div>
                            <div className="flex items-center gap-1.5 truncate font-mono text-[11px] text-[var(--foreground-subtle)]">
                              <Mail size={11} className="shrink-0" /> {c.email}
                            </div>
                          </div>
                          <span className="u-tag shrink-0 !py-0.5">{c.totalProjects} project{c.totalProjects === 1 ? '' : 's'}</span>
                        </div>
                        <div className="flex items-center gap-4 border-t border-[var(--border)] pt-2 font-mono text-[11px] text-[var(--foreground-subtle)]">
                          <span>Active: <span className="text-[var(--foreground-strong)]">{c.active}</span></span>
                          <span>Completed: <span className="text-[var(--foreground-strong)]">{c.completed}</span></span>
                        </div>
                      </button>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </div>

            {/* Selected customer profile + history (5 cols) */}
            <div className="lg:sticky lg:top-24 lg:col-span-5">
              {selected && (
                <Reveal key={selected.email} className="u-frame space-y-5 p-6">
                  <div className="border-b border-[var(--border)] pb-4">
                    <span className="type-eyebrow">Customer profile</span>
                    <h2 className="type-h3">{selected.name}</h2>
                    <div className="font-mono text-[11px] text-[var(--foreground-subtle)]">{selected.email}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="border border-[var(--border)] p-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      <div className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Total</div>
                      <div className="font-mono text-[16px] font-bold text-[var(--foreground-strong)]">{selected.totalProjects}</div>
                    </div>
                    <div className="border border-[var(--border)] p-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      <div className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Active</div>
                      <div className="font-mono text-[16px] font-bold text-[var(--primary)]">{selected.active}</div>
                    </div>
                    <div className="border border-[var(--border)] p-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
                      <div className="font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Completed</div>
                      <div className="font-mono text-[16px] font-bold text-[var(--success)]">{selected.completed}</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[var(--border)] pt-3">
                    <span className="block font-mono text-[10px] uppercase text-[var(--foreground-subtle)]">Project history</span>
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {selected.orders.map((o) => (
                        <div key={o.id} className="space-y-1.5 border border-[var(--border)] p-3" style={{ borderRadius: 'var(--radius-editorial)' }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-[var(--foreground-subtle)]">
                              <Film size={11} className="shrink-0" />
                              <span className="text-[var(--primary)]">{o.id}</span>
                            </div>
                            <StatusBadge status={o.status} />
                          </div>
                          <div className="truncate text-[13px] font-medium text-[var(--foreground-strong)]">{o.details?.projectName}</div>
                          <div className="font-mono text-[10px] text-[var(--foreground-subtle)]">
                            Editor: {o.assignedEditorName || 'Unassigned'} &middot; Due {o.deadline}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => onNavigate('/admin/orders')} className="btn-ghost w-full justify-center">
                    View in Orders Queue
                  </button>
                </Reveal>
              )}
            </div>
          </div>
        )}
      </div>
    </Scene>
  );
}

export default CustomerCRMPage;
