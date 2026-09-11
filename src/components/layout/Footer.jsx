import React from 'react';

/**
 * Footer — editorial, quiet, token-driven. Real process language only, no
 * marketed guarantees or invented metrics (brief §41). Retention wording
 * reflects the actual state machine (Completed → 14-day retention buffer).
 */
export function Footer({ onNavigate }) {
  const cols = [
    {
      title: 'Studio',
      links: [
        { label: 'Selected Work', path: '/work' },
        { label: 'Start a Project', path: '/order' },
        { label: 'How It Works', path: '/#how-it-works' },
        { label: 'Services', path: '/#services' },
      ],
    },
    {
      title: 'Workspaces',
      links: [
        { label: 'Client Workspace', path: '/dashboard' },
        { label: 'Editor Queue', path: '/editor/dashboard' },
        { label: 'Studio Control', path: '/admin/dashboard' },
        { label: 'Sign In', path: '/login' },
      ],
    },
  ];

  return (
    <footer className="scene border-t border-[var(--border)] py-16">
      <div className="mx-auto max-w-[1280px] space-y-12 px-4 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="space-y-4 md:col-span-6">
            <button
              onClick={() => onNavigate('/')}
              className="u-focus flex items-center gap-2.5"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-editorial)] bg-[var(--foreground-strong)] font-mono text-[11px] font-bold tracking-tighter text-[var(--background)]">
                TP
              </span>
              <span className="font-mono text-[15px] font-bold tracking-tight text-[var(--foreground-strong)]">
                TRIPHORIA
              </span>
            </button>
            <p className="max-w-sm text-[13px] leading-[1.7] text-[var(--foreground-muted)]">
              A production workflow for creators and brands: controlled intake, a
              named editor per project, tracked output versions, structured review,
              and a clear delivery state. Every step is recorded.
            </p>
            <p className="font-mono text-[11px] text-[var(--foreground-subtle)]">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              POST-PRODUCTION WORKFLOW · ACTIVE
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title} className="space-y-3 md:col-span-3">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--foreground-strong)]">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.path}>
                    <button
                      onClick={() => onNavigate(l.path)}
                      className="u-focus text-[13px] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-strong)]"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-8 font-mono text-[11px] text-[var(--foreground-subtle)]">
          <span>© {new Date().getFullYear()} TRIPHORIA</span>
          <span className="flex items-center gap-2.5">
            <span>Edit</span>
            <span aria-hidden>·</span>
            <span>Color</span>
            <span aria-hidden>·</span>
            <span>Sound</span>
            <span aria-hidden>·</span>
            <span>Motion</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
