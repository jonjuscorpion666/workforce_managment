'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const DEMO_ACCOUNTS = [
  { name: 'System Admin',   email: 'admin@hospital.com',               role: 'SUPER_ADMIN', color: 'bg-purple-100 text-purple-700' },
  { name: 'Sarah Mitchell', email: 'svp@hospital.com',                 role: 'SVP',         color: 'bg-blue-100 text-blue-700' },
  { name: 'David Torres',   email: 'vp@hospital.com',                  role: 'VP',          color: 'bg-cyan-100 text-cyan-700' },
  { name: 'Maria Johnson',  email: 'director@hospital.com',            role: 'DIRECTOR',    color: 'bg-teal-100 text-teal-700' },
  { name: 'James Lee',      email: 'manager@hospital.com',             role: 'MANAGER',     color: 'bg-green-100 text-green-700' },
  { name: 'Tanya Brooks',   email: 'hr@hospital.com',                  role: 'HR_ANALYST',  color: 'bg-yellow-100 text-yellow-700' },
];

const CNO_ACCOUNTS = [
  { name: 'Rachel Adams',   email: 'cnp.carmel@franciscan.com',        hospital: 'Carmel' },
  { name: 'Thomas Reed',    email: 'cnp.crawfordsville@franciscan.com', hospital: 'Crawfordsville' },
  { name: 'Diane Walker',   email: 'cnp.crownpoint@franciscan.com',    hospital: 'Crown Point' },
  { name: 'Kevin Harris',   email: 'cnp.dyer@franciscan.com',          hospital: 'Dyer' },
  { name: 'Lisa Chen',      email: 'cnp.hammond@franciscan.com',       hospital: 'Hammond' },
  { name: 'Claire Nguyen',  email: 'cnp@hospital.com',                 hospital: 'Indianapolis' },
  { name: 'Robert Kim',     email: 'cnp.lafayette@franciscan.com',     hospital: 'Lafayette East' },
  { name: 'Patricia Moore', email: 'cnp.michigancity@franciscan.com',  hospital: 'Michigan City' },
  { name: 'Antonio Rivera', email: 'cnp.mooresville@franciscan.com',   hospital: 'Mooresville' },
  { name: 'Jennifer Cole',  email: 'cnp.munster@franciscan.com',       hospital: 'Munster' },
  { name: 'William Grant',  email: 'cnp.rensselaer@franciscan.com',    hospital: 'Rensselaer' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4 py-10">
      <div className="w-full max-w-md space-y-4">

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Workforce Platform</h1>
            <p className="text-gray-500 mt-1">Enterprise Workforce Transformation</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full text-center">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-400">
            Nurse?{' '}
            <a href="/portal/login" className="text-blue-600 hover:underline font-medium">
              Go to Nurse Portal →
            </a>
          </div>
        </div>

        {/* Demo credentials card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-5">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-3">
            Demo Credentials — All passwords: <span className="font-mono text-white">Password123!</span>
          </p>

          {/* Admin / leadership roles */}
          <div className="space-y-1.5 mb-4">
            {DEMO_ACCOUNTS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => { setEmail(u.email); setPassword('Password123!'); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.color}`}>
                    {u.role}
                  </span>
                  <span className="text-sm text-white/80 group-hover:text-white">{u.name}</span>
                </div>
                <span className="text-xs text-white/30 group-hover:text-white/60 font-mono truncate ml-2">
                  {u.email}
                </span>
              </button>
            ))}
          </div>

          {/* Hospital CNOs */}
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
            Chief Nursing Officers — Franciscan Health
          </p>
          <div className="space-y-1">
            {CNO_ACCOUNTS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => { setEmail(u.email); setPassword('Password123!'); }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    CNO
                  </span>
                  <span className="text-sm text-white/80 group-hover:text-white">{u.name}</span>
                  <span className="text-xs text-white/40 group-hover:text-white/60">— {u.hospital}</span>
                </div>
                <span className="text-xs text-white/30 group-hover:text-white/60 font-mono truncate ml-2">
                  {u.email}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
