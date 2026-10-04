import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  OrganizationSettings,
  StructureLevel,
  StructureNode,
  EquipmentType,
  Technician,
  FaultCategory,
  ModuleDefinition
} from '../types/cmms.ts';
import { api, getStoredToken, removeStoredToken, setStoredToken } from '../api/client.ts';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface CMMSContextType {
  // Auth & System State
  user: (User & { permissions: string[] }) | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setIsInitialized: (val: boolean) => void;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  switchUser: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;

  // Organization & Hierarchy
  settings: OrganizationSettings | null;
  levels: StructureLevel[];
  nodes: StructureNode[];
  equipmentTypes: EquipmentType[];
  technicians: Technician[];
  categories: FaultCategory[];
  modules: ModuleDefinition[];
  allUsers: User[];
  refreshMasterData: () => Promise<void>;

  // Helper terminology functions
  getLevelName: (order: number, plural?: boolean) => string;
  getNodeById: (id?: string | null) => StructureNode | undefined;
  getNodeHierarchyLabel: (nodeId?: string | null) => string;

  // Permissions check
  hasPermission: (perm: string) => boolean;

  // Toast notifications
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const CMMSContext = createContext<CMMSContextType | undefined>(undefined);

export const CMMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(User & { permissions: string[] }) | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);

  const [levels, setLevels] = useState<StructureLevel[]>([]);
  const [nodes, setNodes] = useState<StructureNode[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [categories, setCategories] = useState<FaultCategory[]>([]);
  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshMasterData = useCallback(async () => {
    try {
      const [levelsRes, nodesRes, typesRes, techRes, catRes, modRes, settingsRes, usersRes] = await Promise.all([
        api.getLevels().catch(() => ({ levels: [] })),
        api.getNodes().catch(() => ({ nodes: [] })),
        api.getEquipmentTypes().catch(() => ({ types: [] })),
        api.getTechnicians().catch(() => ({ technicians: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
        api.getModules().catch(() => ({ modules: [] })),
        api.getSettings().catch(() => ({ settings: null as any })),
        api.getUsers().catch(() => ({ users: [] }))
      ]);

      setLevels(levelsRes.levels || []);
      setNodes(nodesRes.nodes || []);
      setEquipmentTypes(typesRes.types || []);
      setTechnicians(techRes.technicians || []);
      setCategories(catRes.categories || []);
      setModules(modRes.modules || []);
      setAllUsers(usersRes.users || []);
      if (settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
    } catch (err) {
      console.error('Failed to refresh master data', err);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await api.getAuthStatus();
      setIsInitialized(status.isInitialized);
      if (status.settings) setSettings(status.settings);

      const token = getStoredToken();
      if (token && status.isInitialized) {
        try {
          const me = await api.getCurrentUser();
          setUser(me.user);
          await refreshMasterData();
        } catch {
          removeStoredToken();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to initialize CMMS context:', err);
    } finally {
      setIsLoading(false);
    }
  }, [refreshMasterData]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (credentials: { username: string; password: string }) => {
    const res = await api.login(credentials);
    setStoredToken(res.token);
    setUser(res.user);
    showToast(`Welcome back, ${res.user.fullName}!`, 'success');
    await refreshMasterData();
  };

  const switchUser = async (username: string) => {
    const res = await api.switchUser(username);
    setStoredToken(res.token);
    setUser(res.user);
    showToast(`Switched active session to ${res.user.fullName} (${res.user.roleName || res.user.roleId})`, 'success');
    await refreshMasterData();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    removeStoredToken();
    setUser(null);
    showToast('You have been logged out.', 'info');
  };

  const hasPermission = useCallback((perm: string): boolean => {
    if (!user) return false;
    if (user.roleId === 'role_admin' || user.permissions?.includes('*')) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
  }, [user]);

  // Dynamic terminology helper
  const getLevelName = useCallback((order: number, plural: boolean = false): string => {
    const lvl = levels.find(l => l.levelOrder === order);
    if (!lvl) {
      return order === 1 ? (plural ? 'Lines' : 'Line') : (plural ? 'Stations' : 'Station');
    }
    return plural ? (lvl.pluralName || `${lvl.name}s`) : lvl.name;
  }, [levels]);

  const getNodeById = useCallback((id?: string | null): StructureNode | undefined => {
    if (!id) return undefined;
    return nodes.find(n => n.id === id);
  }, [nodes]);

  const getNodeHierarchyLabel = useCallback((nodeId?: string | null): string => {
    if (!nodeId) return 'Unassigned';
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return nodeId;

    if (node.parentNodeId) {
      const parent = nodes.find(n => n.id === node.parentNodeId);
      if (parent) {
        return `${parent.name} → ${node.name}`;
      }
    }
    return node.name;
  }, [nodes]);

  return (
    <CMMSContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialized,
        setIsInitialized,
        isLoading,
        login,
        switchUser,
        logout,
        refreshAuth,
        settings,
        levels,
        nodes,
        equipmentTypes,
        technicians,
        categories,
        modules,
        allUsers,
        refreshMasterData,
        getLevelName,
        getNodeById,
        getNodeHierarchyLabel,
        hasPermission,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </CMMSContext.Provider>
  );
};

export const useCMMS = () => {
  const context = useContext(CMMSContext);
  if (!context) throw new Error('useCMMS must be used within a CMMSProvider');
  return context;
};
