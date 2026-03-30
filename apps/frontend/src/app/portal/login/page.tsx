'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNurseAuth } from '@/lib/nurse-auth';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nurse Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Your voice matters — securely and anonymously</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Employee Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="you@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Anonymous notice */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-700">Your responses are anonymous.</span>{' '}
                Your login is used only to confirm participation. Your name is never attached to your survey answers.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Having trouble? Contact your unit manager or HR.
        </p>

        {/* Demo credentials */}
        <div className="mt-6 bg-white rounded-2xl border border-dashed border-gray-300 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Demo Credentials</p>
          <div className="space-y-2">
            {[
              { name: 'Emily Carter',   email: 'nurse1@hospital.com', role: 'Nurse' },
              { name: 'Marcus Williams',email: 'nurse2@hospital.com', role: 'Nurse' },
              { name: 'Priya Sharma',   email: 'nurse3@hospital.com', role: 'Nurse' },
              { name: 'Jordan Hayes',   email: 'pct1@hospital.com',   role: 'PCT'   },
            ].map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => { setEmail(u.email); setPassword('Password123!'); }}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className="text-xs text-gray-300 group-hover:text-blue-400 font-mono">click to fill</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Password: <span className="font-mono font-semibold text-gray-600">Password123!</span></p>
        </div>
      </div>
    </div>
  );
}
