import React, { useState, useEffect } from 'react';
import { 
  LogOut, Shield, User, Scissors, ChevronDown, Check,
  Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = ({ currentPath, onNavigate }) => {
  const { user, switchRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (path) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const handleRoleSwitch = (role, id = null) => {
    switchRole(role, id);
    setRoleMenuOpen(false);
    if (role === 'admin') {
      onNavigate('/admin/dashboard');
    } else if (role === 'editor') {
      onNavigate('/editor/dashboard');
    } else {
      onNavigate('/dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    onNavigate('/');
    setMobileMenuOpen(false);
  };

  const userRole = user?.role || 'guest';

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled 
          ? 'bg-[#0B0C0E]/85 backdrop-blur-md border-b border-white/[0.08] shadow-[0_4px_25px_rgba(0,0,0,0.6)]' 
          : 'bg-[#0B0C0E]/60 backdrop-blur-sm border-b border-white/[0.06]'
      }`}
    >
      {/* Studio Workspace ribbon for team testing */}
      {import.meta.env.DEV && (
      <div className="bg-[#0B0C0F] text-[#a1a1a6] text-[10px] sm:text-[11px] py-1 px-3 sm:px-6 md:px-8 border-b border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-2 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#34d399] shrink-0" aria-hidden="true" />
            <span className="text-[#a1a1a6] uppercase tracking-wider hidden sm:inline">Studio Workspace /</span>
            <span className="text-white font-medium truncate">
              {user ? `${user.role.toUpperCase()}: ${user.name}` : 'STUDIO PORTAL ACTIVE'}
            </span>
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="inline-flex items-center gap-1 bg-white/[0.05] hover:bg-white/10 text-white px-2 py-0.5 rounded-[5px] text-[10px] sm:text-[11px] transition-colors border border-white/10"
              aria-label="Switch workspace role"
            >
              <span>Switch Workspace</span>
              <ChevronDown size={11} aria-hidden="true" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-[#111214] text-white rounded-[8px] shadow-2xl border border-white/10 py-1.5 z-50 text-[12px] font-sans">
                <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#6f7075] border-b border-white/[0.06]">
                  Role Selection
                </div>
                
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.05] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-[#facc15]" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-white text-[12px]">Super Admin</div>
                      <div className="text-[10px] text-[#a1a1a6]">Studio Operations & Content</div>
                    </div>
                  </div>
                  {user?.role === 'admin' && <Check size={14} className="text-[#34d399]" aria-hidden="true" />}
                </button>

                <button
                  onClick={() => handleRoleSwitch('editor', 'editor-01')}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.05] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scissors size={14} className="text-[#60a5fa]" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-white text-[12px]">Senior Editor</div>
                      <div className="text-[10px] text-[#a1a1a6]">Marcus Vance (Active Queue)</div>
                    </div>
                  </div>
                  {user?.role === 'editor' && <Check size={14} className="text-[#34d399]" aria-hidden="true" />}
                </button>

                <button
                  onClick={() => handleRoleSwitch('client', 'user-101')}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.05] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[#c586c0]" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-white text-[12px]">Client Partner</div>
                      <div className="text-[10px] text-[#a1a1a6]">Alex Morgan (Project Dossier)</div>
                    </div>
                  </div>
                  {user?.role === 'customer' && <Check size={14} className="text-[#34d399]" aria-hidden="true" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main Navigation Row */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => handleNavClick('/')}
            className="flex items-center gap-2.5 group cursor-pointer"
            aria-label="TRIPHORIA Home"
          >
            <div className="w-8 h-8 rounded-[6px] bg-white text-[#0B0C0F] font-bold text-xs flex items-center justify-center tracking-tighter group-hover:bg-[#00CDB8] transition-colors">
              TP
            </div>
            <div className="flex flex-col text-left">
              <span className="font-mono text-base font-bold tracking-tight text-white leading-none">
                TRIPHORIA
              </span>
              <span className="font-mono text-[9px] text-[#6f7075] uppercase tracking-widest leading-none mt-1">
                Post-Production Studio
              </span>
            </div>
          </button>
        </div>

        {/* Center: Context-Aware Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-[13px] font-sans" aria-label="Main Navigation">
          {/* Admin Navigation */}
          {userRole === 'admin' && (
            <>
              <button 
                onClick={() => handleNavClick('/admin/dashboard')} 
                className={`transition-colors ${currentPath === '/admin/dashboard' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => handleNavClick('/admin/orders')} 
                className={`transition-colors ${currentPath === '/admin/orders' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                Orders
              </button>
              <button 
                onClick={() => handleNavClick('/admin/editors')} 
                className={`transition-colors ${currentPath === '/admin/editors' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                Editors
              </button>
              <button 
                onClick={() => handleNavClick('/admin/storage')} 
                className={`transition-colors ${currentPath === '/admin/storage' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                Storage
              </button>
              <button 
                onClick={() => handleNavClick('/admin/cms')} 
                className={`transition-colors ${currentPath === '/admin/cms' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                CMS
              </button>
              <button 
                onClick={() => handleNavClick('/admin/audit-logs')} 
                className={`transition-colors ${currentPath === '/admin/audit-logs' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                Audit Log
              </button>
            </>
          )}

          {/* Editor Navigation */}
          {userRole === 'editor' && (
            <button 
              onClick={() => handleNavClick('/editor/dashboard')} 
              className={`transition-colors ${currentPath === '/editor/dashboard' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
            >
              Assigned Orders
            </button>
          )}

          {/* Authenticated Client Navigation */}
          {(userRole === 'customer' || userRole === 'client') && (
            <>
              <button 
                onClick={() => handleNavClick('/dashboard')} 
                className={`transition-colors ${currentPath === '/dashboard' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                My Projects
              </button>
              <button 
                onClick={() => handleNavClick('/work')} 
                className={`transition-colors ${currentPath === '/work' ? 'text-white font-medium' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                Portfolio
              </button>
            </>
          )}

          {/* Public Storefront Navigation */}
          {userRole === 'guest' && (
            <>
              <button 
                onClick={() => handleNavClick('/work')} 
                className={`transition-colors ${currentPath === '/work' ? 'text-[#00CDB8] font-semibold' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                Work
              </button>
              <button 
                onClick={() => handleNavClick('/#services')} 
                className="text-[#a1a1a6] hover:text-white transition-colors"
              >
                Services
              </button>
              <button 
                onClick={() => handleNavClick('/#how-it-works')} 
                className="text-[#a1a1a6] hover:text-white transition-colors"
              >
                How It Works
              </button>
              <button 
                onClick={() => handleNavClick('/#about')} 
                className="text-[#a1a1a6] hover:text-white transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => handleNavClick('/#contact')} 
                className="text-[#a1a1a6] hover:text-white transition-colors"
              >
                Contact
              </button>
            </>
          )}
        </nav>

        {/* Right CTA / Session Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavClick(userRole === 'admin' ? '/admin/dashboard' : userRole === 'editor' ? '/editor/dashboard' : '/dashboard')}
                className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-mono px-3 py-1.5 rounded-[6px] bg-[#00CDB8]/10 border border-[#00CDB8]/30 text-[#00CDB8] hover:bg-[#00CDB8]/20 transition-colors"
              >
                <User size={13} aria-hidden="true" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 rounded-[6px] border border-white/10 text-[#a1a1a6] hover:text-white hover:bg-white/[0.05]"
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleNavClick('/login')}
                className="text-[12px] sm:text-[13px] font-medium text-[#a1a1a6] hover:text-white px-2 py-1 transition-colors"
              >
                Sign In
              </button>

              <button
                onClick={() => handleNavClick('/order')}
                className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-full bg-[#00CDB8] text-[#0B0C0E] text-[13px] font-semibold hover:bg-[#00E6CE] hover:scale-105 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(0,205,184,0.3)] focus-visible:ring-2 focus-visible:ring-[#00CDB8] focus-visible:outline-none cursor-pointer"
              >
                Start a Project
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile navigation menu"
            className="p-1.5 text-[#a1a1a6] hover:text-white md:hidden cursor-pointer"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
              className="fixed inset-y-0 right-0 w-72 bg-[#0B0C0F] border-l border-white/10 p-6 z-10 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <span className="font-mono text-sm font-semibold text-white">TRIPHORIA</span>
                  <button onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu" className="text-[#a1a1a6] hover:text-white">
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleNavClick('/work')}
                    className="block w-full text-left py-2 text-sm text-[#a1a1a6] hover:text-[#00CDB8]"
                  >
                    Work
                  </button>
                  <button
                    onClick={() => handleNavClick('/#services')}
                    className="block w-full text-left py-2 text-sm text-[#a1a1a6] hover:text-[#00CDB8]"
                  >
                    Services
                  </button>
                  <button
                    onClick={() => handleNavClick('/#how-it-works')}
                    className="block w-full text-left py-2 text-sm text-[#a1a1a6] hover:text-[#00CDB8]"
                  >
                    How It Works
                  </button>
                  <button
                    onClick={() => handleNavClick('/#about')}
                    className="block w-full text-left py-2 text-sm text-[#a1a1a6] hover:text-[#00CDB8]"
                  >
                    About
                  </button>
                  <button
                    onClick={() => handleNavClick('/#contact')}
                    className="block w-full text-left py-2 text-sm text-[#a1a1a6] hover:text-[#00CDB8]"
                  >
                    Contact
                  </button>
                  {!user && (
                    <button
                      onClick={() => handleNavClick('/login')}
                      className="block w-full text-left py-2 text-sm text-[#00CDB8] hover:text-white pt-3 border-t border-white/[0.08]"
                    >
                      Sign In →
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleNavClick('/order')}
                className="w-full h-11 rounded-[6px] bg-[#00CDB8] text-[#111111] font-semibold text-sm flex items-center justify-center shadow-[0_0_15px_rgba(0,205,184,0.3)]"
              >
                Start a Project
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
