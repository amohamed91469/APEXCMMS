import {
  StructureLevel,
  StructureNode,
  EquipmentType,
  Equipment,
  Technician,
  FaultCategory,
  FaultDescriptionTemplate,
  CorrectiveActionTemplate,
  Fault,
  FaultStatusHistory,
  User,
  Role,
  AuditLog,
  OrganizationSettings,
  ModuleDefinition,
  ImportJob,
  ImportErrorItem,
  ImportMappingTemplate,
  DashboardWidget
} from '../types/cmms.ts';

const TOKEN_KEY = 'apex_cmms_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.error) errMsg = errorJson.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  // Auth & System Setup
  getAuthStatus: () => request<{ isInitialized: boolean; hasAdmin: boolean; settings: OrganizationSettings }>('/api/auth/status'),
  setupSystem: (payload: any) => request<{ message: string; token: string; user: User }>('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  login: (credentials: { username: string; password: string }) => request<{ token: string; user: User & { permissions: string[] } }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  switchUser: (username: string) => request<{ token: string; user: User & { permissions: string[] } }>('/api/auth/switch-user', {
    method: 'POST',
    body: JSON.stringify({ username })
  }),
  getCurrentUser: () => request<{ user: User & { permissions: string[] } }>('/api/auth/me'),

  // Generic Hierarchy & Structure
  getLevels: () => request<{ levels: StructureLevel[] }>('/api/structure/levels'),
  updateLevels: (levels: StructureLevel[]) => request<{ levels: StructureLevel[]; message: string }>('/api/structure/levels', {
    method: 'PUT',
    body: JSON.stringify({ levels })
  }),
  updateLevel: (id: string, updates: Partial<StructureLevel>) => request<{ level: StructureLevel; message: string }>(`/api/structure/levels/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),
  getNodes: (params?: { levelId?: string; parentId?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ nodes: StructureNode[] }>(`/api/structure/nodes${q ? `?${q}` : ''}`);
  },
  createNode: (node: Partial<StructureNode>) => request<{ node: StructureNode; message: string }>('/api/structure/nodes', {
    method: 'POST',
    body: JSON.stringify(node)
  }),
  updateNode: (id: string, updates: Partial<StructureNode>) => request<{ node: StructureNode; message: string }>(`/api/structure/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  deactivateNode: (id: string) => request<{ node: StructureNode; message: string }>(`/api/structure/nodes/${id}/deactivate`, {
    method: 'PATCH'
  }),

  // Equipment Types & Equipment
  getEquipmentTypes: () => request<{ types: EquipmentType[] }>('/api/equipment/types'),
  createEquipmentType: (data: Partial<EquipmentType>) => request<{ type: EquipmentType }>('/api/equipment/types', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateEquipmentType: (id: string, data: Partial<EquipmentType>) => request<{ type: EquipmentType }>(`/api/equipment/types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getEquipment: (params?: { structureNodeId?: string; equipmentTypeId?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ equipment: Equipment[] }>(`/api/equipment${q ? `?${q}` : ''}`);
  },
  createEquipment: (data: Partial<Equipment>) => request<{ equipment: Equipment }>('/api/equipment', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateEquipment: (id: string, data: Partial<Equipment>) => request<{ equipment: Equipment }>(`/api/equipment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getEquipmentHistory: (id: string) => request<{ equipment: Equipment; history: Fault[] }>(`/api/equipment/${id}/history`),

  // Faults
  getFaults: (filters?: Record<string, any>) => {
    const clean: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') clean[k] = String(v);
      });
    }
    const q = new URLSearchParams(clean).toString();
    return request<{ faults: Fault[]; total: number }>(`/api/faults${q ? `?${q}` : ''}`);
  },
  getFaultById: (id: string) => request<{ fault: Fault; history: FaultStatusHistory[] }>(`/api/faults/${id}`),
  createFault: (data: Partial<Fault>) => request<{ fault: Fault; message: string }>('/api/faults', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateFault: (id: string, data: Partial<Fault>) => request<{ fault: Fault; message: string }>(`/api/faults/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updateFaultStatus: (id: string, payload: {
    status: string;
    waitingReason?: string;
    notes?: string;
    workDone?: string;
    correctiveAction?: string;
    maintenanceStart?: string | null;
    maintenanceEnd?: string | null;
    restorationDate?: string | null;
  }) => request<{ fault: Fault; history: FaultStatusHistory[]; message: string }>(`/api/faults/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),

  // Analytics & Dashboard
  getDashboardAnalytics: (filters?: Record<string, any>) => {
    const clean: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') clean[k] = String(v);
      });
    }
    const q = new URLSearchParams(clean).toString();
    return request<any>(`/api/analytics/dashboard${q ? `?${q}` : ''}`);
  },

  // Master Data
  getTechnicians: () => request<{ technicians: Technician[] }>('/api/masterdata/technicians'),
  createTechnician: (data: Partial<Technician>) => request<{ technician: Technician }>('/api/masterdata/technicians', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateTechnician: (id: string, data: Partial<Technician>) => request<{ technician: Technician }>(`/api/masterdata/technicians/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getCategories: () => request<{ categories: FaultCategory[] }>('/api/masterdata/categories'),
  createCategory: (data: Partial<FaultCategory>) => request<{ category: FaultCategory }>('/api/masterdata/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getDescriptions: () => request<{ descriptions: FaultDescriptionTemplate[] }>('/api/masterdata/descriptions'),
  createDescription: (data: Partial<FaultDescriptionTemplate>) => request<{ description: FaultDescriptionTemplate }>('/api/masterdata/descriptions', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getCorrectiveActions: () => request<{ correctiveActions: CorrectiveActionTemplate[] }>('/api/masterdata/corrective-actions'),
  createCorrectiveAction: (data: Partial<CorrectiveActionTemplate>) => request<{ correctiveAction: CorrectiveActionTemplate }>('/api/masterdata/corrective-actions', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Excel Import / Export
  inspectExcel: (fileBase64: string, filename: string) => request<{
    filename: string;
    sheets: Array<{ sheetName: string; rowCount: number; headers: string[]; sampleRows: any[] }>;
    suggestedMappings: Record<string, string>;
  }>('/api/data/inspect', {
    method: 'POST',
    body: JSON.stringify({ fileBase64, filename })
  }),
  validateImport: (payload: { fileBase64: string; sheetName?: string; mappings: Record<string, string>; defaultEquipmentType?: string }) =>
    request<{
      summary: { totalRows: number; validCount: number; warningCount: number; errorCount: number; duplicateCount: number };
      previewRows: any[];
      allValidatedCount: number;
      errors: any[];
    }>('/api/data/validate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  commitImport: (payload: {
    fileBase64: string;
    filename: string;
    sheetName?: string;
    mappings: Record<string, string>;
    defaultEquipmentType?: string;
    duplicateStrategy: 'update' | 'skip';
  }) => request<{
    jobId: string;
    recordsProcessed: number;
    recordsImported: number;
    recordsRejected: number;
    recordsSkipped: number;
    warningsCount: number;
    errors: any[];
  }>('/api/data/commit', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getMappingTemplates: () => request<{ templates: ImportMappingTemplate[] }>('/api/data/mappings'),
  saveMappingTemplate: (data: { name: string; description?: string; mappings: Record<string, string> }) =>
    request<{ template: ImportMappingTemplate }>('/api/data/mappings', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Users & Roles
  getUsers: () => request<{ users: User[] }>('/api/users'),
  createUser: (data: any) => request<{ user: User; message: string }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateUser: (id: string, data: any) => request<{ user: User; message: string }>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getRoles: () => request<{ roles: Role[] }>('/api/users/roles/list'),
  createRole: (data: any) => request<{ role: Role }>('/api/users/roles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateRole: (id: string, data: any) => request<{ role: Role }>(`/api/users/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteRole: (id: string) => request<{ message: string }>(`/api/users/roles/${id}`, {
    method: 'DELETE'
  }),

  // Audit Logs
  getAuditLogs: (params?: { module?: string; action?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ logs: AuditLog[]; total: number }>(`/api/audit${q ? `?${q}` : ''}`);
  },

  // Settings & Widgets
  getSettings: () => request<{ settings: OrganizationSettings }>('/api/settings'),
  updateSettings: (settings: Partial<OrganizationSettings>) => request<{ settings: OrganizationSettings; message: string }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  }),
  getWidgets: () => request<{ widgets: DashboardWidget[] }>('/api/settings/widgets'),
  updateWidgets: (widgets: DashboardWidget[]) => request<{ widgets: DashboardWidget[] }>('/api/settings/widgets', {
    method: 'PUT',
    body: JSON.stringify({ widgets })
  }),
  clearSampleData: () => request<{ message: string }>('/api/settings/clear-sample-data', { method: 'POST' }),
  seedSampleData: () => request<{ message: string }>('/api/settings/seed-sample-data', { method: 'POST' }),
  factoryReset: () => request<{ success: boolean; message: string }>('/api/settings/factory-reset', { method: 'POST' }),
  resetSystem: (confirmation: string = 'RESET') => request<{ success: boolean; message: string }>('/api/auth/reset-system', {
    method: 'POST',
    body: JSON.stringify({ confirmation })
  }),

  // Modules
  getModules: () => request<{ modules: ModuleDefinition[] }>('/api/modules'),
  toggleModule: (id: string, enabled: boolean) => request<{ module: ModuleDefinition }>(`/api/modules/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled })
  })
};
