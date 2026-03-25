'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';

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
        const nurseRoles = ['NURSE', 'STAFF'];
        if (!roles.some((r) => nurseRoles.includes(r))) {
          throw new Error('Access denied. This portal is for nurses and staff only.');
        }
        localStorage.setItem('nurse_access_token', data.accessToken);
        set({ nurse: data.user, accessToken: data.accessToken, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('nurse_access_token');
        set({ nurse: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'nurse-auth',
      partialize: (s) => ({ nurse: s.nurse, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
