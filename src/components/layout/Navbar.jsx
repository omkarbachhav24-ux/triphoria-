import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, ChevronDown, Check, Shield, Scissors, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

const PUBLIC_LINKS = [
  { label: 'Work', path: '/work' },
  { label: 'Services', path: '/#services' },
  { label: 'How It Works', path: '/#how-it-works' },
  { label: 'About', path: '/#about' },
  { label: 'Contact', path: '/#contact' },
];

const ADMIN_LINKS = [
  { label: 'Overview', path: '/admin/dashboard' },
  { label: 'Projects', path: '/admin/orders' },
  { label: 'Library', path: '/admin/cms' },
  { label: 'Editors', path: '/admin/editors' },
  { label: 'Audit', path: '/admin/audit-logs' },
];

/**
 * Navbar — lightweight, editorial, scene-aware. Transparent at the top of a
 * page, a hairline-bordered blurred bar once scrolled. Role-aware link sets.
 * DEV-only workspace switch ribbon stays behind import.meta.env.DEV.
 */
export function Navbar({ currentPath, onNavigate }) {
  const { user, switchRole, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleMenu, setRoleMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (path) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  const role = user?.role || 'guest';
  const dashPath =
    role === 'admin' ? '/admin/dashboard' : role === 'editor' ? '/editor/dashboard' : '/dashboard';

  const links =
    role === 'admin'
      ? ADMIN_LINKS
      : role === 'editor'
      ? [{ label: 'Assigned Work', path: '/editor/dashboard' }]
      : role === 'customer'
      ? [
          { label: 'My Projects', path: '/dashboard' },
          { label: 'Work', path: '/work' },
        ]
      : PUBLIC_LINKS;

  const handleRoleSwitch = (r, id) => {
    switchRole(r, id);
    setRoleMenu(false);
    onNavigate(r === 'admin' ? '/admin/dashboard' : r === 'editor' ? '/editor/dashboard' : '/dashboard');
  };

  return (
    <header
      style={{
        backgroundColor: scrolled
          ? 'color-mix(in srgb, var(--background) 86%, transparent)'
          : 'transparent',
      }}
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-[var(--border)] backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      {import.meta.env.DEV && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--background-dark)] px-4 py-1 md:px-8">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2 font-mono text-[10px] text-[var(--foreground-subtle)]">
            <span className="truncate">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              {user ? `${user.role.toUpperCase()} · ${user.name}` : 'STUDIO PORTAL'}
            </span>
            <div className="relative shrink-0">
              <button
                onClick={() => setRoleMenu((v) => !v)}
                className="u-focus inline-flex items-center gap-1 rounded-[var(--radius-editorial)] border border-[var(--border)] px-2 py-0.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                Switch workspace <ChevronDown size={10} />
              </button>
              {roleMenu && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--background-elevated)] p-1.5 text-[12px] shadow-xl">
                  {[
                    { r: 'admin', id: null, Icon: Shield, label: 'Super Admin' },
                    { r: 'editor', id: 'editor-01', Icon: Scissors, label: 'Lead Editor' },
                    { r: 'client', id: 'user-101', Icon: User, label: 'Client' },
                  ].map(({ r, id, Icon, label }) => (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r, id)}
                      className="u-focus flex w-full items-center justify-between rounded-[var(--radius-editorial)] px-2.5 py-2 text-left font-sans hover:bg-[var(--surface-hover)]"
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={13} className="text-[var(--primary)]" /> {label}
                      </span>
                      {((r === 'client' && user?.role === 'customer') || user?.role === r) && (
                        <Check size={13} className="text-[var(--success)]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 md:px-8">
        <button onClick={() => go('/')} className="u-focus flex items-center gap-2.5" aria-label="TRIPHORIA home">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-editorial)] bg-[var(--foreground-strong)] font-mono text-[11px] font-bold tracking-tighter text-[var(--background)]">
            TP
          </span>
          <span className="font-mono text-[15px] font-bold tracking-tight text-[var(--foreground-strong)]">
            TRIPHORIA
          </span>
        </button>

        <nav className="hidden items-center gap-7 text-[13px] md:flex" aria-label="Primary">
          {links.map((l) => {
            const active = currentPath === l.path;
            return (
              <button
                key={l.path}
                onClick={() => go(l.path)}
                className={`u-focus transition-colors ${
                  active
                    ? 'font-medium text-[var(--foreground-strong)]'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)]'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <span className="hidden sm:inline-flex">
                <button onClick={() => go(dashPath)} className="btn-ghost">
                  Dashboard
                </button>
              </span>
              <button
                onClick={() => {
                  logout();
                  go('/');
                }}
                aria-label="Sign out"
                className="u-focus flex h-9 w-9 items-center justify-center rounded-[var(--radius-editorial)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)]"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => go('/login')}
                className="hidden text-[13px] text-[var(--foreground-muted)] hover:text-[var(--foreground-strong)] sm:inline-flex"
              >
                Sign In
              </button>
              <span className="hidden sm:inline-flex">
                <button onClick={() => go('/order')} className="btn-primary">
                  Start a Project
                </button>
              </span>
            </>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="u-focus p-1.5 text-[var(--foreground-muted)] md:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="absolute inset-y-0 right-0 flex w-72 flex-col justify-between border-l border-[var(--border)] bg-[var(--background)] p-6"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                  <span className="font-mono text-sm font-semibold text-[var(--foreground-strong)]">TRIPHORIA</span>
                  <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-[var(--foreground-muted)]">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {(user ? links : PUBLIC_LINKS).map((l) => (
                    <button
                      key={l.path}
                      onClick={() => go(l.path)}
                      className="u-focus py-2.5 text-left text-sm text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                    >
                      {l.label}
                    </button>
                  ))}
                  {!user && (
                    <button
                      onClick={() => go('/login')}
                      className="u-focus border-t border-[var(--border-subtle)] pt-3 text-left text-sm text-[var(--primary)]"
                    >
                      Sign In →
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => go(user ? dashPath : '/order')}
                className="btn-primary w-full"
              >
                {user ? 'Open Dashboard' : 'Start a Project'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
