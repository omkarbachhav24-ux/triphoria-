import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CookieBanner } from './components/ui/CookieBanner';
import { SmoothScroll } from './components/ui/smooth-scroll';

// Public & Client Pages — kept in the main bundle: every visitor hits at
// least one of these, so splitting them would just add a request-waterfall
// with no payload ever skipped.
import { HomePage } from './pages/customer/HomePage';
import { WorkPage } from './pages/customer/WorkPage';
import { AuthPage } from './pages/customer/AuthPage';
import { OrderFlowPage } from './pages/customer/OrderFlowPage';
import { OrderSuccessPage } from './pages/customer/OrderSuccessPage';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { CustomerProjectPage } from './pages/customer/CustomerProjectPage';

// Editor & Admin Pages — lazy-loaded. A public visitor or customer never
// downloads the CMS editor, audit log table, editor-onboarding flow, etc.
// (B13 performance pass: this was previously one 880KB bundle shipped to
// every visitor regardless of role.)
const EditorDashboard = lazy(() => import('./pages/editor/EditorDashboard').then((m) => ({ default: m.EditorDashboard })));
const BusinessDashboard = lazy(() => import('./pages/admin/BusinessDashboard').then((m) => ({ default: m.BusinessDashboard })));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const EditorsManagementPage = lazy(() => import('./pages/admin/EditorsManagementPage').then((m) => ({ default: m.EditorsManagementPage })));
const CustomerCRMPage = lazy(() => import('./pages/admin/CustomerCRMPage').then((m) => ({ default: m.CustomerCRMPage })));
const CMSManagerPage = lazy(() => import('./pages/admin/CMSManagerPage').then((m) => ({ default: m.CMSManagerPage })));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const MotionDocsPage = lazy(() => import('./pages/docs/MotionDocsPage').then((m) => ({ default: m.MotionDocsPage })));

// Minimal, non-jarring loading fallback for lazy route chunks — deliberately
// not a full skeleton screen (brief §42: don't skeleton-load everywhere).
function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="font-mono text-[12px] text-[var(--primary)]">LOADING…</span>
    </div>
  );
}

export function App() {
  const { user, loading } = useAuth();
  
  // Custom router state
  const initialPath = window.location.pathname || '/';
  const isOrderSuccess = initialPath.startsWith('/order/success/');
  const isProjectDeepLink = initialPath.startsWith('/dashboard/project/');
  const [currentPath, setCurrentPath] = useState(
    isOrderSuccess ? '/order/success' : isProjectDeepLink ? '/dashboard/project' : initialPath
  );
  const [selectedPackage, setSelectedPackage] = useState('Pro Creator');
  const [orderSuccessId, setOrderSuccessId] = useState(isOrderSuccess ? initialPath.replace('/order/success/', '') : '');
  const [activeProjectId, setActiveProjectId] = useState(
    isProjectDeepLink ? initialPath.replace('/dashboard/project/', '') : ''
  );

  // Handle route navigation
  const navigateTo = (path) => {
    // Handle anchor hash links on homepage
    if (path.includes('#')) {
      const id = path.split('#')[1];
      if (currentPath !== '/') {
        setCurrentPath('/');
        window.history.pushState({}, '', '/#' + id);
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        window.history.pushState({}, '', '/#' + id);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (['/services', '/how-it-works', '/about', '/contact'].includes(path)) {
      const id = path.replace('/', '');
      if (currentPath !== '/') {
        setCurrentPath('/');
        window.history.pushState({}, '', path);
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        window.history.pushState({}, '', path);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (path.startsWith('/order/success/')) {
      const id = path.replace('/order/success/', '');
      setOrderSuccessId(id);
      setCurrentPath('/order/success');
      window.history.pushState({}, '', '/order/success/' + id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (path.startsWith('/dashboard/project/')) {
      const id = path.replace('/dashboard/project/', '');
      setActiveProjectId(id);
      setCurrentPath('/dashboard/project');
      window.history.pushState({}, '', '/dashboard/project/' + id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentPath(path);
    window.history.pushState({}, '', path);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.warn('ScrollTo failed', e);
    }
  };

  useEffect(() => {
    const p = window.location.pathname;
    if (['/services', '/how-it-works', '/about', '/contact'].includes(p)) {
      const id = p.replace('/', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, []);

  // Listen to popstate for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname || '/';
      if (p.startsWith('/order/success/')) {
        setOrderSuccessId(p.replace('/order/success/', ''));
        setCurrentPath('/order/success');
      } else if (p.startsWith('/dashboard/project/')) {
        setActiveProjectId(p.replace('/dashboard/project/', ''));
        setCurrentPath('/dashboard/project');
      } else {
        setCurrentPath(p);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdmin = user && user.role === 'admin';
  const isEditor = user && user.role === 'editor';

  const renderPage = () => {
    // Admin Protected Pages
    if (currentPath.startsWith('/admin')) {
      if (loading) {
        return (
          <div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-[#00CDB8]">
            <span className="w-2 h-2 rounded-full bg-[#00CDB8] animate-pulse mr-2" />
            VERIFYING STUDIO CREDENTIALS...
          </div>
        );
      }
      if (!isAdmin) {
        return <AuthPage onNavigate={navigateTo} />;
      }
      switch (currentPath) {
        case '/admin/dashboard':
          return <BusinessDashboard onNavigate={navigateTo} />;
        case '/admin/orders':
        case '/admin/production':
          return <AdminOrdersPage onNavigate={navigateTo} />;
        case '/admin/editors':
          return <EditorsManagementPage onNavigate={navigateTo} />;
        case '/admin/customers':
          return <CustomerCRMPage onNavigate={navigateTo} />;
        case '/admin/cms':
          return <CMSManagerPage onNavigate={navigateTo} />;
        case '/admin/audit-logs':
          return <AuditLogsPage onNavigate={navigateTo} />;
        default:
          return <BusinessDashboard onNavigate={navigateTo} />;
      }
    }

    // Editor Protected Pages
    if (currentPath.startsWith('/editor')) {
      if (loading) {
        return (
          <div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-[#00CDB8]">
            <span className="w-2 h-2 rounded-full bg-[#00CDB8] animate-pulse mr-2" />
            VERIFYING EDITOR CREDENTIALS...
          </div>
        );
      }
      if (!isEditor && !isAdmin) {
        return <AuthPage onNavigate={navigateTo} />;
      }
      return <EditorDashboard onNavigate={navigateTo} />;
    }

    // Customer & Public Pages
    switch (currentPath) {
      case '/':
        return <HomePage onNavigate={navigateTo} onSelectPackage={setSelectedPackage} />;
      case '/work':
        return <WorkPage onNavigate={navigateTo} onSelectPackage={setSelectedPackage} />;
      case '/login':
      case '/auth':
      case '/admin/login':
        return <AuthPage onNavigate={navigateTo} />;
      case '/order':
        return <OrderFlowPage selectedPackage={selectedPackage} onNavigate={navigateTo} />;
      case '/order/success':
        return <OrderSuccessPage orderId={orderSuccessId} onNavigate={navigateTo} />;
      case '/dashboard':
        if (loading) {
          return (
            <div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-[#00CDB8]">
              <span className="w-2 h-2 rounded-full bg-[#00CDB8] animate-pulse mr-2" />
              AUTHENTICATING CLIENT DOSSIER...
            </div>
          );
        }
        if (!user) {
          return <AuthPage onNavigate={navigateTo} />;
        }
        return <CustomerDashboard onNavigate={navigateTo} />;
      case '/dashboard/project':
        if (loading) {
          return (
            <div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-[#00CDB8]">
              <span className="w-2 h-2 rounded-full bg-[#00CDB8] animate-pulse mr-2" />
              AUTHENTICATING CLIENT DOSSIER...
            </div>
          );
        }
        if (!user) {
          return <AuthPage onNavigate={navigateTo} />;
        }
        return <CustomerProjectPage orderId={activeProjectId} onNavigate={navigateTo} />;
      default:
        return <HomePage onNavigate={navigateTo} onSelectPackage={setSelectedPackage} />;
    }
  };

  if (currentPath === '/docs') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <MotionDocsPage onNavigate={navigateTo} />
      </Suspense>
    );
  }

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[#111111] text-[#FAFAF5] flex flex-col justify-between selection:bg-[#00CDB8]/30 selection:text-white">
        <Navbar currentPath={currentPath} onNavigate={navigateTo} />
        <main className="flex-1">
          <Suspense fallback={<RouteLoadingFallback />}>
            {renderPage()}
          </Suspense>
        </main>
        <Footer onNavigate={navigateTo} />
        <CookieBanner />
      </div>
    </SmoothScroll>
  );
}
