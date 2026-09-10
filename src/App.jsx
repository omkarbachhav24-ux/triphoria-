import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CookieBanner } from './components/ui/CookieBanner';
import { SmoothScroll } from './components/ui/smooth-scroll';

// Public & Client Pages
import { HomePage } from './pages/customer/HomePage';
import { WorkPage } from './pages/customer/WorkPage';
import { AuthPage } from './pages/customer/AuthPage';
import { OrderFlowPage } from './pages/customer/OrderFlowPage';
import { OrderSuccessPage } from './pages/customer/OrderSuccessPage';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';

// Editor Pages
import { EditorDashboard } from './pages/editor/EditorDashboard';

// Admin Pages
import { BusinessDashboard } from './pages/admin/BusinessDashboard';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { EditorsManagementPage } from './pages/admin/EditorsManagementPage';
import { CMSManagerPage } from './pages/admin/CMSManagerPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { MotionDocsPage } from './pages/docs/MotionDocsPage';

export function App() {
  const { user, loading } = useAuth();
  
  // Custom router state
  const initialPath = window.location.pathname || '/';
  const isOrderSuccess = initialPath.startsWith('/order/success/');
  const [currentPath, setCurrentPath] = useState(isOrderSuccess ? '/order/success' : initialPath);
  const [selectedPackage, setSelectedPackage] = useState('Pro Creator');
  const [orderSuccessId, setOrderSuccessId] = useState(isOrderSuccess ? initialPath.replace('/order/success/', '') : '');

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
      default:
        return <HomePage onNavigate={navigateTo} onSelectPackage={setSelectedPackage} />;
    }
  };

  if (currentPath === '/docs') {
    return <MotionDocsPage onNavigate={navigateTo} />;
  }

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[#111111] text-[#FAFAF5] flex flex-col justify-between selection:bg-[#00CDB8]/30 selection:text-white">
        <Navbar currentPath={currentPath} onNavigate={navigateTo} />
        <main className="flex-1">
          {renderPage()}
        </main>
        <Footer onNavigate={navigateTo} />
        <CookieBanner />
      </div>
    </SmoothScroll>
  );
}
