import { create } from 'zustand';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthStoreState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string, email: string) => Promise<{ success: boolean; message?: string }>;
  registerCustomerAccount: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const STORAGE_SESSION_KEY = 'aether_active_session_user';

const getInitialSession = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(STORAGE_SESSION_KEY) || localStorage.getItem(STORAGE_SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const sendAuthRequest = async (action: string, payload: Record<string, any>) => {
  try {
    const res = await fetch(`/api/auth?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return { success: false, message: 'Network connection issue.' };
  }
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: getInitialSession(),
  isAuthenticated: Boolean(getInitialSession()),
  isLoading: false,

  login: async (password, email) => {
    set({ isLoading: true });
    const data = await sendAuthRequest('login', { email, password });
    if (data.success && data.user) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
    return data;
  },

  registerCustomerAccount: async (name, email, password) => {
    set({ isLoading: true });
    const data = await sendAuthRequest('register', { name, email, password });
    if (data.success && data.user) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
    return data;
  },

  updatePassword: async (oldPassword, newPassword) => {
    const email = get().user?.email;
    if (!email) return { success: false, message: 'Not logged in.' };
    set({ isLoading: true });
    const data = await sendAuthRequest('update-password', { email, oldPassword, newPassword });
    set({ isLoading: false });
    return data;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
    set({ user: null, isAuthenticated: false });
  },
}));
