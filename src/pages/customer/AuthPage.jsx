import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, Shield, Scissors, User, Film, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthPage = ({ onNavigate }) => {
  const { login, register } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = isSignUp 
        ? await register(name, email, password)
        : await login(email, password);

      if (res.success) {
        // Role is determined strictly by the server
        if (res.user.role === 'admin') {
          onNavigate('/admin/dashboard');
        } else if (res.user.role === 'editor') {
          onNavigate('/editor/dashboard');
        } else {
          onNavigate('/dashboard');
        }
      } else {
        setErrorMessage(res.message || 'Authentication failed.');
      }
    } catch (err) {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const res = await login(quickEmail, quickPassword);
      if (res.success) {
        if (res.user.role === 'admin') {
          onNavigate('/admin/dashboard');
        } else if (res.user.role === 'editor') {
          onNavigate('/editor/dashboard');
        } else {
          onNavigate('/dashboard');
        }
      } else {
        setErrorMessage(res.message || 'Authentication failed.');
      }
    } catch (err) {
      setErrorMessage('Connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-16 bg-[#111111] text-[#FAFAF5]">
      <div className="max-w-[460px] w-full space-y-6">
        
        {/* Main Authentication Card */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 sm:p-8 md:p-10 space-y-6 shadow-2xl">
          
          {/* Header Branding */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00CDB8]/10 border border-[#00CDB8]/20 text-[#00CDB8] text-[11px] font-mono uppercase tracking-wider">
              <Film size={12} />
              <span>Studio Authentication</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
              {isSignUp ? 'Create Client Account' : 'Sign in to TRIPHORIA'}
            </h1>
            
            <p className="text-xs text-[#A1A1A6] max-w-sm mx-auto">
              {isSignUp 
                ? 'Register to submit video briefs and track active editorial production.' 
                : 'Unified production portal for customers, lead editors, and studio administrators.'}
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-[8px] flex items-start gap-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                  Full Name / Organization
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F7075]" />
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="triphoria-input pl-10 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F7075]" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="triphoria-input pl-10 text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A1A1A6]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F7075]" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="triphoria-input pl-10 text-sm"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : (isSignUp ? 'Register & Enter Workspace' : 'Authorize & Sign In')}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="text-center pt-3 border-t border-white/[0.08]">
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(''); }}
              className="text-xs text-[#A1A1A6] hover:text-[#00CDB8] transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Need a client account? Register here"}
            </button>
          </div>
        </div>

        {/* Quick Inspection Accounts for Development / Verification */}
        {import.meta.env.DEV && (
          <div className="bg-[#1A1A1A]/70 border border-white/[0.08] rounded-[12px] p-4 space-y-2.5 text-xs font-mono">
          <div className="flex justify-between items-center text-[#6F7075] text-[11px] uppercase tracking-wider">
            <span>DEMO ROLE ACCESS</span>
            <span>AUTO-DETECTS ROLE</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 font-sans">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@triphoria.io', 'adminpgt')}
              className="w-full p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-[8px] flex items-center justify-between transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5">
                <Shield size={14} className="text-[#00CDB8]" />
                <div>
                  <div className="font-medium text-xs text-white group-hover:text-[#00CDB8] transition-colors">Super Admin</div>
                  <div className="text-[11px] text-[#6F7075] font-mono">admin@triphoria.io</div>
                </div>
              </div>
              <ArrowRight size={12} className="text-[#6F7075] group-hover:text-white transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('marcus@triphoria.io', 'editorpgt')}
              className="w-full p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-[8px] flex items-center justify-between transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5">
                <Scissors size={14} className="text-[#D8FF00]" />
                <div>
                  <div className="font-medium text-xs text-white group-hover:text-[#D8FF00] transition-colors">Lead Editor</div>
                  <div className="text-[11px] text-[#6F7075] font-mono">marcus@triphoria.io</div>
                </div>
              </div>
              <ArrowRight size={12} className="text-[#6F7075] group-hover:text-white transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('alex@creator.com', 'clientpgt')}
              className="w-full p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-[8px] flex items-center justify-between transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5">
                <User size={14} className="text-[#B7A8FF]" />
                <div>
                  <div className="font-medium text-xs text-white group-hover:text-[#B7A8FF] transition-colors">Client Creator</div>
                  <div className="text-[11px] text-[#6F7075] font-mono">alex@creator.com</div>
                </div>
              </div>
              <ArrowRight size={12} className="text-[#6F7075] group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
