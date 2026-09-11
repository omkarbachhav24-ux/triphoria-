import React, { useState } from 'react';
import { ArrowRight, Shield, Scissors, User, Film } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Scene } from '../../components/ui/Scene';
import { Reveal } from '../../components/motion/Reveal';
import { Field } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/ErrorState';

export function AuthPage({ onNavigate }) {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const routeByRole = (role) =>
    onNavigate(role === 'admin' ? '/admin/dashboard' : role === 'editor' ? '/editor/dashboard' : '/dashboard');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = isSignUp ? await register(name, email, password) : await login(email, password);
      if (res.success) routeByRole(res.user.role);
      else setError(res.message || 'Authentication failed.');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const quickLogin = async (qEmail, qPassword) => {
    setEmail(qEmail);
    setPassword(qPassword);
    setError('');
    setBusy(true);
    try {
      const res = await login(qEmail, qPassword);
      if (res.success) routeByRole(res.user.role);
      else setError(res.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Scene variant="black" className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px] space-y-6">
        <Reveal className="u-frame space-y-6 p-6 sm:p-9">
          <div className="space-y-3 text-center">
            <span className="u-tag mx-auto !text-[var(--primary)]"><Film size={12} /> Studio Authentication</span>
            <h1 className="type-h2">{isSignUp ? 'Create Client Account' : 'Sign in to TRIPHORIA'}</h1>
            <p className="mx-auto max-w-xs text-[12px] text-[var(--foreground-muted)]">
              {isSignUp
                ? 'Register to submit briefs and track production.'
                : 'One portal for customers, editors, and studio admins.'}
            </p>
          </div>

          {error && <ErrorState title="Sign-in failed" body={error} />}

          <form onSubmit={submit} className="space-y-4">
            {isSignUp && (
              <Field label="Full Name / Organization" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" />
            )}
            <Field label="Email Address" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
            <Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
              {busy ? 'Authenticating…' : isSignUp ? 'Register & Enter Workspace' : 'Authorize & Sign In'} <ArrowRight size={14} />
            </button>
          </form>

          <div className="border-t border-[var(--border-subtle)] pt-3 text-center">
            <button onClick={() => { setIsSignUp((v) => !v); setError(''); }} className="u-focus text-[12px] text-[var(--foreground-muted)] hover:text-[var(--primary)]">
              {isSignUp ? 'Already have an account? Sign in' : 'Need a client account? Register here'}
            </button>
          </div>
        </Reveal>

        {import.meta.env.DEV && (
          <div className="u-frame space-y-2.5 p-4 font-mono text-[11px]">
            <div className="flex items-center justify-between uppercase tracking-wider text-[var(--foreground-subtle)]">
              <span>Demo role access</span>
              <span>Dev only</span>
            </div>
            <div className="grid gap-1.5">
              {[
                { email: 'admin@triphoria.io', pw: 'adminpgt', label: 'Super Admin', Icon: Shield },
                { email: 'marcus@triphoria.io', pw: 'editorpgt', label: 'Lead Editor', Icon: Scissors },
                { email: 'alex@creator.com', pw: 'clientpgt', label: 'Client Creator', Icon: User },
              ].map(({ email: e, pw, label, Icon }) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => quickLogin(e, pw)}
                  className="u-focus flex items-center justify-between border border-[var(--border)] p-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ borderRadius: 'var(--radius-editorial)' }}
                >
                  <span className="flex items-center gap-2.5 font-sans">
                    <Icon size={14} className="text-[var(--primary)]" />
                    <span>
                      <span className="block text-[12px] font-medium text-[var(--foreground-strong)]">{label}</span>
                      <span className="text-[11px] text-[var(--foreground-subtle)]">{e}</span>
                    </span>
                  </span>
                  <ArrowRight size={12} className="text-[var(--foreground-subtle)]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Scene>
  );
}

export default AuthPage;
