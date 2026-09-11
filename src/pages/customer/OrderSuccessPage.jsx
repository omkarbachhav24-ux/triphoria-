import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal } from '../../components/motion/Reveal';
import { StatusBadge } from '../../components/common/StatusBadge';

export function OrderSuccessPage({ orderId, onNavigate }) {
  const { orders } = useOrders();
  const order = orders.find((o) => o.id === orderId);

  return (
    <Scene variant="black" className="flex min-h-[85vh] items-center justify-center px-4 py-16">
      <Reveal className="u-frame w-full max-w-[560px] space-y-7 p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--primary)]/30 bg-[var(--primary-muted)] text-[var(--primary)]">
          <CheckCircle2 size={26} />
        </span>
        <div className="space-y-2">
          <p className="type-eyebrow">Project dispatched</p>
          <h1 className="type-h1">Received &amp; in review.</h1>
          <p className="mx-auto max-w-sm text-[13px] text-[var(--foreground-muted)]">
            Your brief and footage link are registered in the production ledger.
          </p>
        </div>

        <div className="space-y-3 border border-[var(--border)] p-5 text-left" style={{ borderRadius: 'var(--radius-editorial)' }}>
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <span className="type-label block">Project</span>
              <span className="font-mono text-[14px] font-semibold text-[var(--foreground-strong)]">{orderId || 'ORD-PENDING'}</span>
            </div>
            <StatusBadge status={order?.status || 'Pending Approval'} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><span className="type-label block">Tier</span>{order?.packageName || '—'}</div>
            <div><span className="type-label block">Name</span>{order?.details?.projectName || '—'}</div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <button onClick={() => onNavigate('/dashboard')} className="btn-primary">
            View Dashboard <ArrowRight size={14} />
          </button>
          <button onClick={() => onNavigate('/')} className="btn-ghost">Back to Studio</button>
        </div>
      </Reveal>
    </Scene>
  );
}

export default OrderSuccessPage;
