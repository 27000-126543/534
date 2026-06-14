import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/services/api';
import { RoleCode } from 'shared/types/enums';
import type { UserSummary, AuthResponse } from 'shared/types/api';

interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  login: (username: string, password: string) => Promise<void>;
  verifyTwoFactor: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  hasRole: (roles: RoleCode | RoleCode[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      requiresTwoFactor: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ username, password });
          const data = response.data as AuthResponse;
          if (data.requiresTwoFactor) {
            set({ requiresTwoFactor: true, isLoading: false });
            return;
          }
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            requiresTwoFactor: false,
            isLoading: false
          });
        } catch (err: any) {
          set({
            error: err.response?.data?.message || '登录失败',
            isLoading: false
          });
          throw err;
        }
      },

      verifyTwoFactor: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.verifyTwoFactor?.(token) || { data: {} };
          const data = response.data as AuthResponse;
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            requiresTwoFactor: false,
            isLoading: false
          });
        } catch (err: any) {
          set({
            error: err.response?.data?.message || '双因素验证失败',
            isLoading: false
          });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authAPI.logout();
        } catch {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          requiresTwoFactor: false,
          isLoading: false,
          error: null
        });
      },

      getCurrentUser: async () => {
        try {
          const response = await authAPI.getCurrentUser();
          const user = response.data as UserSummary;
          localStorage.setItem('user', JSON.stringify(user));
          set({ user, isAuthenticated: true });
        } catch (err: any) {
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false
            });
          }
        }
      },

      clearError: () => set({ error: null }),

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        const roleList = Array.isArray(roles) ? roles : [roles];
        return roleList.includes(user.roleCode);
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
