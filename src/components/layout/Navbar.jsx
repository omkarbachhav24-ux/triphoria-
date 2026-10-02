import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
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
 */
export function Navbar({ currentPath, onNavigate }) {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <header
      style={{
        backgroundColor: scrolled
          ? 'rgba(11,13,13,0.82)'
          : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0,200,181,0.10)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.40)' : 'none',
      }}
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-[var(--border)] backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 md:px-8">
        <button onClick={() => go('/')} className="u-focus flex items-center gap-2.5" aria-label="TRIPHORIA home">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-editorial)] bg-[#C6A15B] font-mono text-[11px] font-bold tracking-tighter text-[#0B0D0D]">
            T
          </span>
          <span className="font-mono text-[15px] font-bold tracking-tight" style={{color:'#C6A15B', letterSpacing:'-0.02em'}}>
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
