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
  
  // Actions
  login: (password: string, email: string) => Promise<{ success: boolean; message?: string }>;
  registerCustomerAccount: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkSession: () => void;
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

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: getInitialSession(),
  isAuthenticated: Boolean(getInitialSession()),
  isLoading: false,

  checkSession: () => {
    const user = getInitialSession();
    if (user) {
      set({ user, isAuthenticated: true });
    }
  },

  login: async (password: string, email: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        }
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return { success: true, message: data.message };
      }

      set({ isLoading: false });
      return {
        success: false,
        message: data.message || 'Invalid email or password.',
      };
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: 'Network error connecting to global auth server. Please check your internet connection.',
      };
    }
  },

  registerCustomerAccount: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
        }
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return { success: true, message: data.message };
      }

      set({ isLoading: false });
      return {
        success: false,
        message: data.message || 'Failed to create account in global database.',
      };
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: 'Network error connecting to global auth server. Please try again.',
      };
    }
  },

  updatePassword: async (oldPassword: string, newPassword: string) => {
    const currentUser = get().user;
    if (!currentUser || !currentUser.email) {
      return { success: false, message: 'You must be logged in to update password.' };
    }

    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth?action=update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      set({ isLoading: false });

      if (response.ok && data.success) {
        return { success: true, message: data.message };
      }

      return { success: false, message: data.message || 'Failed to update password.' };
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: 'Network error connecting to global auth server. Please try again.',
      };
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
    set({ user: null, isAuthenticated: false });
  },
}));
