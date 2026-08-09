import { create } from 'zustand';
import { Account, AuditLogEntry, DeviceTransferRecord, IoTDevice, UserRole } from '@aether/shared';

export type AdminViewType = 'OVERVIEW' | 'USERS' | 'ACCOUNTS' | 'DEVICES' | 'AUDIT' | 'HEALTH' | 'EMERGENCY' | 'SETTINGS';

export interface AdminUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  accountId: string;
  mustChangePassword?: boolean;
}

export interface AdminStoreState {
  adminUser: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  activeView: AdminViewType;
  isLoading: boolean;
  
  // Data State
  usersList: any[];
  accountsList: Account[];
  devicesList: IoTDevice[];
  auditLogs: AuditLogEntry[];
  transferHistory: DeviceTransferRecord[];
  systemHealth: any | null;
  selectedUser: any | null;

  // Actions
  setAdminSession: (user: AdminUser, token: string) => void;
  logoutAdmin: () => void;
  setActiveView: (view: AdminViewType) => void;
  fetchAdminData: () => Promise<void>;
  toggleUserStatus: (userId: string, currentStatus: string) => Promise<boolean>;
  updateUserRole: (userId: string, role: string) => Promise<boolean>;
  transferDevice: (deviceId: string, newAccountId: string, reason: string) => Promise<boolean>;
  rotateDeviceCredentials: (deviceId: string) => Promise<string | null>;
  triggerEmergencyAction: (action: string, reason: string, targetId?: string) => Promise<boolean>;
  setSelectedUser: (user: any | null) => void;
}

const STORAGE_ADMIN_TOKEN_KEY = 'aether_admin_token';
const STORAGE_ADMIN_USER_KEY = 'aether_admin_user';

const getInitialAdminUser = (): AdminUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_ADMIN_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const getInitialAdminToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_ADMIN_TOKEN_KEY);
};

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  adminUser: getInitialAdminUser(),
  token: getInitialAdminToken(),
  isAuthenticated: Boolean(getInitialAdminUser() && getInitialAdminToken()),
  activeView: 'OVERVIEW',
  isLoading: false,

  usersList: [],
  accountsList: [],
  devicesList: [],
  auditLogs: [],
  transferHistory: [],
  systemHealth: null,
  selectedUser: null,

  setAdminSession: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ADMIN_USER_KEY, JSON.stringify(user));
      localStorage.setItem(STORAGE_ADMIN_TOKEN_KEY, token);
    }
    set({ adminUser: user, token, isAuthenticated: true });
  },

  logoutAdmin: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_ADMIN_USER_KEY);
      localStorage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
    }
    set({ adminUser: null, token: null, isAuthenticated: false });
  },

  setActiveView: (view) => set({ activeView: view }),

  setSelectedUser: (user) => set({ selectedUser: user }),

  fetchAdminData: async () => {
    const { token } = get();
    if (!token) return;

    set({ isLoading: true });
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [usersRes, accountsRes, devicesRes, auditRes, healthRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/accounts', { headers }),
        fetch('/api/admin/devices', { headers }),
        fetch('/api/admin/audit', { headers }),
        fetch('/api/admin/health', { headers }),
      ]);

      const usersData = usersRes.ok ? await usersRes.json() : {};
      const accountsData = accountsRes.ok ? await accountsRes.json() : {};
      const devicesData = devicesRes.ok ? await devicesRes.json() : {};
      const auditData = auditRes.ok ? await auditRes.json() : {};
      const healthData = healthRes.ok ? await healthRes.json() : {};

      set({
        usersList: usersData.users || [],
        accountsList: accountsData.accounts || [],
        devicesList: devicesData.devices || [],
        transferHistory: devicesData.transferHistory || [],
        auditLogs: auditData.auditLogs || [],
        systemHealth: healthData.services ? healthData : null,
        isLoading: false,
      });
    } catch (e) {
      console.error('[Admin Store] Fetch error:', e);
      set({ isLoading: false });
    }
  },

  toggleUserStatus: async (userId, currentStatus) => {
    const { token, fetchAdminData } = get();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_STATUS', userId, status: currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
        return true;
      }
    } catch (e) {
      console.error('[Admin Store] Toggle status error:', e);
    }
    return false;
  },

  updateUserRole: async (userId, role) => {
    const { token, fetchAdminData } = get();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_ROLE', userId, role }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
        return true;
      }
    } catch (e) {
      console.error('[Admin Store] Update role error:', e);
    }
    return false;
  },

  transferDevice: async (deviceId, newAccountId, reason) => {
    const { token, fetchAdminData } = get();
    try {
      const res = await fetch('/api/admin/devices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TRANSFER_DEVICE', deviceId, newAccountId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
        return true;
      }
    } catch (e) {
      console.error('[Admin Store] Transfer device error:', e);
    }
    return false;
  },

  rotateDeviceCredentials: async (deviceId) => {
    const { token, fetchAdminData } = get();
    try {
      const res = await fetch('/api/admin/devices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ROTATE_CREDENTIALS', deviceId }),
      });
      const data = await res.json();
      if (data.success && data.authCode) {
        await fetchAdminData();
        return data.authCode;
      }
    } catch (e) {
      console.error('[Admin Store] Rotate credentials error:', e);
    }
    return null;
  },

  triggerEmergencyAction: async (action, reason, targetId) => {
    const { token, fetchAdminData } = get();
    try {
      const res = await fetch('/api/admin/emergency', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, targetAccountId: targetId, targetDeviceId: targetId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
        return true;
      }
    } catch (e) {
      console.error('[Admin Store] Emergency action error:', e);
    }
    return false;
  },
}));
