import React from 'react';

/**
 * EmptyState — intentional, compact. No giant illustration (brief §40).
 * A small icon, a firm line, a short explanation, one optional action.
 *
 *   <EmptyState icon={Scissors} title="No assigned edits"
 *               body="You're clear for now." />
 */
export function EmptyState({ icon: Icon, title, body, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-start gap-3 border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 ${className}`.trim()}
      style={{ borderRadius: 'var(--radius-editorial)' }}
    >
      {Icon && (
        <span className="flex h-9 w-9 items-center justify-center border border-[var(--border)] text-[var(--foreground-subtle)]" style={{ borderRadius: 'var(--radius-editorial)' }}>
          <Icon size={16} />
        </span>
      )}
      <div className="space-y-1">
        {title && <div className="text-[15px] font-semibold text-[var(--foreground-strong)]">{title}</div>}
        {body && <p className="max-w-sm text-[13px] leading-relaxed text-[var(--foreground-muted)]">{body}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
