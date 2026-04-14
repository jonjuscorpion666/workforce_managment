'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNurseAuth } from '@/lib/nurse-auth';
import { Eye, EyeOff, ArrowRight, Key, ShieldCheck, Stethoscope, ArrowLeft } from 'lucide-react';

const DEMO_NURSES = [
  { name: 'Emily Carter',    email: 'nurse1@hospital.com', role: 'RN',  color: 'bg-blue-500 text-white' },
  { name: 'Marcus Williams', email: 'nurse2@hospital.com', role: 'RN',  color: 'bg-blue-500 text-white' },
  { name: 'Priya Sharma',    email: 'nurse3@hospital.com', role: 'RN',  color: 'bg-blue-500 text-white' },
  { name: 'Jordan Hayes',    email: 'pct1@hospital.com',   role: 'PCT', color: 'bg-teal-500 text-white' },
];

export default function NurseLoginPage() {
  const { login } = useNurseAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/portal');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-10 px-4 pb-16">
      <div className="w-full max-w-[460px] space-y-4">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Stethoscope className="w-7 h-7 text-blue-600" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Nurse Portal</h1>
            <p className="text-sm text-gray-500">Your voice matters — safely &amp; anonymously</p>
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
                autoComplete="email"
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

          {/* Privacy notice */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">Your responses are always anonymous.</span>{' '}
              Your login only confirms participation — your name is never linked to your answers.
            </p>
          </div>
        </div>

        {/* Demo accounts card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-800">Demo Accounts</span>
              <span className="ml-1 text-xs font-mono bg-gray-900 text-gray-100 px-2.5 py-0.5 rounded-full">
                Password123!
              </span>
            </div>

            <div className="space-y-1">
              {DEMO_NURSES.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword('Password123!'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${u.color}`}>
                    {u.role}
                  </span>
                  <span className="text-sm font-medium text-gray-800 flex-1">{u.name}</span>
                  <span className="text-xs text-gray-400 font-mono group-hover:text-gray-600 transition-colors truncate">
                    {u.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

        {/* Back to admin */}
        <div className="text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Login
          </a>
        </div>

      </div>
    </div>
  );
}
