import { create } from 'zustand';

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, username: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,
  isAuthenticated: false,
  setAuth: (token, username, role) => set({ token, username, role, isAuthenticated: true }),
  logout: () => set({ token: null, username: null, role: null, isAuthenticated: false }),
}));
