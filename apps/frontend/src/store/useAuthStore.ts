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
  customerPassword: string;
  hasCustomerCreatedPassword: boolean;
  
  // Actions
  login: (password: string, email?: string) => { success: boolean; message?: string };
  registerCustomerAccount: (name: string, email: string, password: string) => { success: boolean; message?: string };
  updatePassword: (oldPassword: string, newPassword: string) => { success: boolean; message?: string };
  logout: () => void;
}

// LocalStorage Keys
const STORAGE_USER_KEY = 'aether_customer_user';
const STORAGE_AUTH_KEY = 'aether_customer_auth';
const STORAGE_PASS_KEY = 'aether_customer_pass';

const getInitialUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const getInitialAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
};

const getInitialPassword = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_PASS_KEY) || '';
  } catch {
    return '';
  }
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: getInitialUser(),
  isAuthenticated: getInitialAuth(),
  customerPassword: getInitialPassword(),
  hasCustomerCreatedPassword: Boolean(getInitialPassword()),

  login: (password: string, email?: string) => {
    const currentPass = get().customerPassword;
    const currentUser = get().user;

    // If customer hasn't created a password yet, inform them to set one up
    if (!currentPass) {
      return {
        success: false,
        message: 'No customer account found. Please click "Create Account & Password" to set up your customer password.',
      };
    }

    if (password === currentPass) {
      const updatedUser = currentUser || {
        id: 'usr-customer-01',
        name: email ? email.split('@')[0] : 'Customer User',
        email: email || 'customer@aethercrop.io',
        role: 'Farm Operator / Owner',
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_AUTH_KEY, 'true');
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
      }

      set({ isAuthenticated: true, user: updatedUser });
      return { success: true };
    }

    return { success: false, message: 'Invalid password. Please check your credentials.' };
  },

  registerCustomerAccount: (name: string, email: string, password: string) => {
    if (!password || password.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    const newUser: UserProfile = {
      id: `usr-cust-${Date.now().toString().slice(-4)}`,
      name: name.trim() || 'Customer User',
      email: email.trim().toLowerCase() || 'customer@aethercrop.io',
      role: 'Farm Owner & System Administrator',
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
      localStorage.setItem(STORAGE_PASS_KEY, password);
      localStorage.setItem(STORAGE_AUTH_KEY, 'true');
    }

    set({
      user: newUser,
      customerPassword: password,
      hasCustomerCreatedPassword: true,
      isAuthenticated: true,
    });

    return { success: true, message: 'Customer account created successfully!' };
  },

  updatePassword: (oldPassword: string, newPassword: string) => {
    const currentPass = get().customerPassword;
    if (currentPass && oldPassword !== currentPass) {
      return { success: false, message: 'Current password does not match.' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: 'New password must be at least 4 characters long.' };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PASS_KEY, newPassword);
    }

    set({ customerPassword: newPassword, hasCustomerCreatedPassword: true });
    return { success: true, message: 'Customer password updated successfully!' };
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_AUTH_KEY, 'false');
    }
    set({ isAuthenticated: false });
  },
}));
