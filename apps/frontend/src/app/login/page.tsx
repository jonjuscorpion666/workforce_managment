'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, ArrowRight, Key, ChevronDown, ChevronUp, ExternalLink, Heart } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { name: 'System Admin',   email: 'admin@hospital.com',                role: 'ADMIN', color: 'bg-red-600 text-white' },
  { name: 'Sarah Mitchell', email: 'svp@hospital.com',                  role: 'SVP',   color: 'bg-purple-600 text-white' },
  { name: 'David Torres',   email: 'vp@hospital.com',                   role: 'VP',    color: 'bg-blue-500 text-white' },
  { name: 'Maria Johnson',  email: 'director@hospital.com',             role: 'DIR',   color: 'bg-orange-400 text-white' },
  { name: 'James Lee',      email: 'manager@hospital.com',              role: 'MGR',   color: 'bg-green-500 text-white' },
  { name: 'Tanya Brooks',   email: 'hr@hospital.com',                   role: 'HR',    color: 'bg-pink-500 text-white' },
];

const CNO_ACCOUNTS = [
  { name: 'Rachel Adams',   email: 'cnp.carmel@franciscan.com',         hospital: 'Carmel' },
  { name: 'Thomas Reed',    email: 'cnp.crawfordsville@franciscan.com', hospital: 'Crawfordsville' },
  { name: 'Diane Walker',   email: 'cnp.crownpoint@franciscan.com',     hospital: 'Crown Point' },
  { name: 'Kevin Harris',   email: 'cnp.dyer@franciscan.com',           hospital: 'Dyer' },
  { name: 'Lisa Chen',      email: 'cnp.hammond@franciscan.com',        hospital: 'Hammond' },
  { name: 'Claire Nguyen',  email: 'cnp@hospital.com',                  hospital: 'Indianapolis' },
  { name: 'Robert Kim',     email: 'cnp.lafayette@franciscan.com',      hospital: 'Lafayette East' },
  { name: 'Patricia Moore', email: 'cnp.michigancity@franciscan.com',   hospital: 'Michigan City' },
  { name: 'Antonio Rivera', email: 'cnp.mooresville@franciscan.com',    hospital: 'Mooresville' },
  { name: 'Jennifer Cole',  email: 'cnp.munster@franciscan.com',        hospital: 'Munster' },
  { name: 'William Grant',  email: 'cnp.rensselaer@franciscan.com',     hospital: 'Rensselaer' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [cnoOpen, setCnoOpen]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(e: string) {
    setEmail(e);
    setPassword('Password123!');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-10 px-4 pb-16">
      <div className="w-full max-w-[460px] space-y-4">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Heart className="w-7 h-7 text-blue-600" fill="currentColor" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Workforce Platform</h1>
            <p className="text-sm text-gray-500">Healthcare Staffing &amp; Engagement</p>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-400 text-sm mt-0.5">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p data-testid="error-message" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="sign-in-button"
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/portal/login" className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 font-medium transition-colors">
              Nurse Portal <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Demo accounts card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-800">Demo Accounts</span>
            <span className="ml-1 text-xs font-mono bg-gray-900 text-gray-100 px-2.5 py-0.5 rounded-full">
              Password123!
            </span>
          </div>

          {/* Leadership rows */}
          <div className="space-y-1">
            {DEMO_ACCOUNTS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => quickLogin(u.email)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${u.color}`}>
                  {u.role}
                </span>
                <span className="text-sm font-medium text-gray-800 flex-1">{u.name}</span>
                <span className="text-xs text-gray-400 font-mono group-hover:text-gray-600 transition-colors truncate max-w-[160px]">
                  {u.email}
                </span>
              </button>
            ))}
          </div>

          {/* CNO section — collapsible */}
          <div className="mt-2 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => setCnoOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-sm text-gray-500 font-medium">CNOs — Franciscan Health</span>
              {cnoOpen
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>
            {cnoOpen && (
              <div className="mt-1 space-y-0.5">
                {CNO_ACCOUNTS.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => quickLogin(u.email)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-indigo-500 text-white">
                      CNO
                    </span>
                    <span className="text-sm font-medium text-gray-800 flex-1">{u.name}</span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0">
                      {u.hospital}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>}

      </div>
    </div>
  );
}
