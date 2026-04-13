'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';
// Imported lazily to avoid circular references — only used to reset the
// in-memory admin auth store when a nurse logs in from the same tab.
import { useAuth } from './auth';

interface NurseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  orgUnit?: { id: string; name: string };
}

interface NurseAuthState {
  nurse: NurseUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useNurseAuth = create<NurseAuthState>()(
  persist(
    (set) => ({
      nurse: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        const roles: string[] = data.user?.roles?.map((r: any) => r.name) ?? [];
        const nurseRoles = ['NURSE', 'PCT', 'STAFF'];
        if (!roles.some((r) => nurseRoles.includes(r))) {
          throw new Error('Access denied. This portal is for nurses and staff only.');
        }
        // Evict any existing admin/manager session — prevents privilege escalation.
        // useAuth.getState().logout() resets the in-memory Zustand admin store
        // (critical when navigating from /dashboard → /portal → /dashboard in one tab)
        // and also clears access_token / refresh_token from localStorage.
        useAuth.getState().logout();
        // Wipe the persisted admin auth key so rehydration on next navigation
        // also starts clean.
        localStorage.removeItem('auth-storage');
        // Store nurse-specific tokens
        localStorage.setItem('nurse_access_token', data.accessToken);
        localStorage.setItem('nurse_refresh_token', data.refreshToken);
        set({ nurse: data.user, accessToken: data.accessToken, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('nurse_access_token');
        localStorage.removeItem('nurse_refresh_token');
        set({ nurse: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'nurse-auth',
      partialize: (s) => ({ nurse: s.nurse, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
