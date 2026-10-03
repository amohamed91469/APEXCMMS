import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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
} from '../../src/types/cmms.ts';
import { calculateTTR, calculateDowntime } from '../../src/utils/timeCalculations.ts';

export interface DatabaseSchema {
  settings: OrganizationSettings;
  structureLevels: StructureLevel[];
  structureNodes: StructureNode[];
  equipmentTypes: EquipmentType[];
  equipment: Equipment[];
  technicians: Technician[];
  faultCategories: FaultCategory[];
  faultDescriptions: FaultDescriptionTemplate[];
  correctiveActions: CorrectiveActionTemplate[];
  faults: Fault[];
  faultStatusHistory: FaultStatusHistory[];
  users: (User & { passwordHash: string })[];
  roles: Role[];
  auditLogs: AuditLog[];
  modules: ModuleDefinition[];
  importJobs: ImportJob[];
  importErrors: ImportErrorItem[];
  importMappingTemplates: ImportMappingTemplate[];
  dashboardWidgets: DashboardWidget[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cmms_db.json');

const INITIAL_ROLES: Role[] = [
  {
    id: 'role_admin',
    name: 'Administrator',
    description: 'Full unconstrained system access, configuration, security and user management',
    isSystem: true,
    permissions: [
      'faults:view', 'faults:create', 'faults:edit', 'faults:assign', 'faults:resolve', 'faults:close', 'faults:reopen',
      'equipment:view', 'equipment:manage',
      'reports:view', 'reports:export',
      'structure:manage', 'masterdata:manage',
      'users:manage', 'roles:manage',
      'audit:view', 'import:execute', 'settings:manage'
    ]
  },
  {
    id: 'role_manager',
    name: 'Maintenance Manager',
    description: 'Maintenance supervision, reporting, KPI analysis, master data and import/export',
    isSystem: true,
    permissions: [
      'faults:view', 'faults:create', 'faults:edit', 'faults:assign', 'faults:resolve', 'faults:close', 'faults:reopen',
      'equipment:view', 'equipment:manage',
      'reports:view', 'reports:export',
      'masterdata:manage',
      'audit:view', 'import:execute'
    ]
  },
  {
    id: 'role_supervisor',
    name: 'Maintenance Supervisor',
    description: 'Day-to-day fault tracking, technician assignment, resolution approvals',
    isSystem: true,
    permissions: [
      'faults:view', 'faults:create', 'faults:edit', 'faults:assign', 'faults:resolve', 'faults:close',
      'equipment:view',
      'reports:view', 'reports:export'
    ]
  },
  {
    id: 'role_technician',
    name: 'Technician',
    description: 'Assigned corrective actions, work done recording, and resolution requests',
    isSystem: true,
    permissions: [
      'faults:view', 'faults:edit', 'faults:resolve',
      'equipment:view'
    ]
  },
  {
    id: 'role_analyst',
    name: 'Viewer / Analyst',
    description: 'Read-only access to faults, equipment history, reports, and audit logs',
    isSystem: true,
    permissions: [
      'faults:view',
      'equipment:view',
      'reports:view', 'reports:export',
      'audit:view'
    ]
  }
];

const INITIAL_MODULES: ModuleDefinition[] = [
  {
    id: 'mod_fault_tracking',
    name: 'Fault Tracking & Maintenance History',
    description: 'Core reactive maintenance tracking, call dispatch, TTR/downtime and history',
    version: '1.0.0',
    enabled: true,
    isCore: true,
    category: 'maintenance',
    navItems: [
      { title: 'Fault Tracking', path: '/faults', icon: 'AlertTriangle', permission: 'faults:view' },
      { title: 'New Fault Entry', path: '/faults/new', icon: 'PlusCircle', permission: 'faults:create' }
    ]
  },
  {
    id: 'mod_assets',
    name: 'Asset & Equipment Register',
    description: 'Equipment master records, asset numbering, and hierarchical structure mapping',
    version: '1.0.0',
    enabled: true,
    isCore: true,
    category: 'asset',
    navItems: [
      { title: 'Equipment Register', path: '/equipment', icon: 'Cpu', permission: 'equipment:view' }
    ]
  },
  {
    id: 'mod_preventive_maintenance',
    name: 'Preventive Maintenance (PM)',
    description: 'Scheduled PM routines, frequency plans, compliance tracking (Architecture Ready)',
    version: '0.1.0',
    enabled: false,
    isCore: false,
    category: 'maintenance',
    navItems: [
      { title: 'PM Plans', path: '/pm/plans', icon: 'Calendar', permission: 'faults:view' }
    ]
  },
  {
    id: 'mod_warehouse',
    name: 'Warehouse & Spare Parts',
    description: 'Stock control, inventory levels, spare parts consumption (Architecture Ready)',
    version: '0.1.0',
    enabled: false,
    isCore: false,
    category: 'inventory',
    navItems: [
      { title: 'Spare Parts', path: '/warehouse/parts', icon: 'Package', permission: 'equipment:view' }
    ]
  },
  {
    id: 'mod_workforce',
    name: 'Workforce & Attendance',
    description: 'Technician shifts, working hours, attendance and overtime (Architecture Ready)',
    version: '0.1.0',
    enabled: false,
    isCore: false,
    category: 'workforce',
    navItems: [
      { title: 'Attendance', path: '/workforce/shifts', icon: 'Clock', permission: 'users:manage' }
    ]
  }
];

const INITIAL_WIDGETS: DashboardWidget[] = [
  { id: 'w_kpis', title: 'Operational KPIs', type: 'stat', width: 'full', order: 1, visible: true },
  { id: 'w_trend', title: 'Fault Trend Over Time', type: 'chart_trend', width: 'half', order: 2, visible: true },
  { id: 'w_by_equip', title: 'Faults by Equipment Type', type: 'chart_equipment', width: 'half', order: 3, visible: true },
  { id: 'w_by_struct', title: 'Faults by Organizational Structure', type: 'chart_structure', width: 'half', order: 4, visible: true },
  { id: 'w_by_tech', title: 'Technician Workload & Performance', type: 'chart_technician', width: 'half', order: 5, visible: true },
  { id: 'w_recurring', title: 'Top Recurring Failures', type: 'recurring_table', width: 'full', order: 6, visible: true }
];

export class CMMSStore {
  private db: DatabaseSchema;
  private isPersisting: boolean = false;

  constructor() {
    this.db = this.loadInitial();
  }

  private getDefaultState(): DatabaseSchema {
    return {
      settings: {
        id: 'settings_default',
        organizationName: 'Metro Transit Maintenance Corp',
        maintenanceDepartment: 'Signaling & AFC Systems Division',
        logoUrl: '',
        timeZone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        language: 'en',
        currency: 'USD',
        downtimeCalculationRule: 'report_to_restoration',
        isInitialized: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      structureLevels: [],
      structureNodes: [],
      equipmentTypes: [],
      equipment: [],
      technicians: [],
      faultCategories: [],
      faultDescriptions: [],
      correctiveActions: [],
      faults: [],
      faultStatusHistory: [],
      users: [],
      roles: [...INITIAL_ROLES],
      auditLogs: [],
      modules: [...INITIAL_MODULES],
      importJobs: [],
      importErrors: [],
      importMappingTemplates: [],
      dashboardWidgets: [...INITIAL_WIDGETS]
    };
  }

  private loadInitial(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all arrays and sub-objects exist
        const defaultState = this.getDefaultState();
        return {
          ...defaultState,
          ...parsed,
          roles: parsed.roles?.length ? parsed.roles : defaultState.roles,
          modules: parsed.modules?.length ? parsed.modules : defaultState.modules,
          dashboardWidgets: parsed.dashboardWidgets?.length ? parsed.dashboardWidgets : defaultState.dashboardWidgets
        };
      } catch (e) {
        console.error('Failed to load database from file, initializing fresh state', e);
      }
    }

    const state = this.getDefaultState();
    this.persistSync(state);
    return state;
  }

  private persistSync(state: DatabaseSchema) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public save() {
    this.persistSync(this.db);
  }

  // --- Transaction Support ---
  public transaction<T>(fn: (tx: CMMSStore) => T): T {
    const snapshot = JSON.stringify(this.db);
    try {
      const result = fn(this);
      this.save();
      return result;
    } catch (err) {
      this.db = JSON.parse(snapshot);
      throw err;
    }
  }

  // --- Audit Trail ---
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.db.auditLogs.unshift(log);
    // keep maximum 5,000 logs in active memory file
    if (this.db.auditLogs.length > 5000) {
      this.db.auditLogs.pop();
    }
    this.save();
    return log;
  }

  // --- Getters ---
  public getSettings(): OrganizationSettings {
    return this.db.settings;
  }

  public updateSettings(settings: Partial<OrganizationSettings>, user: { id: string; name: string }): OrganizationSettings {
    this.db.settings = {
      ...this.db.settings,
      ...settings,
      updatedAt: new Date().toISOString()
    };
    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_SETTINGS',
      module: 'Administration',
      entity: 'OrganizationSettings',
      entityId: this.db.settings.id,
      details: 'Updated organization settings'
    });
    this.save();
    return this.db.settings;
  }

  // --- Structure Levels & Generic Hierarchy ---
  public getStructureLevels(): StructureLevel[] {
    return [...this.db.structureLevels].sort((a, b) => a.levelOrder - b.levelOrder);
  }

  public getStructureLevelById(id: string): StructureLevel | undefined {
    return this.db.structureLevels.find(l => l.id === id);
  }

  public setStructureLevels(levels: StructureLevel[], user: { id: string; name: string }): StructureLevel[] {
    const oldSummary = this.db.structureLevels.map(l => `${l.name} (${l.internalCode})`).join(' -> ');
    this.db.structureLevels = levels;
    const newSummary = levels.map(l => `${l.name} (${l.internalCode})`).join(' -> ');

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_STRUCTURE_LEVELS',
      module: 'Administration',
      entity: 'StructureLevel',
      entityId: 'all',
      oldValue: oldSummary,
      newValue: newSummary,
      details: `Reconfigured hierarchy terminology: ${newSummary}`
    });
    this.save();
    return this.getStructureLevels();
  }

  public updateStructureLevel(id: string, updates: Partial<StructureLevel>, user: { id: string; name: string }): StructureLevel {
    const index = this.db.structureLevels.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Structure level not found');
    const old = this.db.structureLevels[index];
    const updated = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.db.structureLevels[index] = updated;

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_STRUCTURE_LEVEL',
      module: 'Administration',
      entity: 'StructureLevel',
      entityId: id,
      oldValue: `${old.name} (${old.pluralName})`,
      newValue: `${updated.name} (${updated.pluralName})`,
      details: `Renamed level ${old.internalCode} from ${old.name} to ${updated.name}`
    });
    this.save();
    return updated;
  }

  // --- Structure Nodes ---
  public getStructureNodes(): StructureNode[] {
    return [...this.db.structureNodes].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  public getStructureNodeById(id: string): StructureNode | undefined {
    return this.db.structureNodes.find(n => n.id === id);
  }

  public createStructureNode(node: Omit<StructureNode, 'id' | 'createdAt' | 'updatedAt'>, user: { id: string; name: string }): StructureNode {
    // Validate level exists
    const level = this.getStructureLevelById(node.structureLevelId);
    if (!level) throw new Error('Invalid structure level ID');

    // Check duplicate code within level
    const existing = this.db.structureNodes.find(n => n.structureLevelId === node.structureLevelId && n.code.toLowerCase() === node.code.toLowerCase());
    if (existing) {
      throw new Error(`Node with code "${node.code}" already exists in level "${level.name}"`);
    }

    const newNode: StructureNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.name || user.id,
      ...node
    };
    this.db.structureNodes.push(newNode);

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'CREATE_NODE',
      module: 'Administration',
      entity: 'StructureNode',
      entityId: newNode.id,
      newValue: `${newNode.code} - ${newNode.name}`,
      details: `Created ${level.name} node: ${newNode.name}`
    });
    this.save();
    return newNode;
  }

  public updateStructureNode(id: string, updates: Partial<StructureNode>, user: { id: string; name: string }): StructureNode {
    const index = this.db.structureNodes.findIndex(n => n.id === id);
    if (index === -1) throw new Error('Structure node not found');
    const old = this.db.structureNodes[index];
    const updated = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: user.name || user.id
    };
    this.db.structureNodes[index] = updated;

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_NODE',
      module: 'Administration',
      entity: 'StructureNode',
      entityId: id,
      oldValue: `${old.code} - ${old.name} (${old.status})`,
      newValue: `${updated.code} - ${updated.name} (${updated.status})`,
      details: `Updated node ${updated.name}`
    });
    this.save();
    return updated;
  }

  public deactivateStructureNode(id: string, user: { id: string; name: string }): StructureNode {
    return this.updateStructureNode(id, { status: 'inactive' }, user);
  }

  // --- Equipment Types ---
  public getEquipmentTypes(): EquipmentType[] {
    return this.db.equipmentTypes;
  }

  public createEquipmentType(type: Omit<EquipmentType, 'id' | 'createdAt' | 'updatedAt'>, user: { id: string; name: string }): EquipmentType {
    const existing = this.db.equipmentTypes.find(t => t.code.toUpperCase() === type.code.toUpperCase());
    if (existing) throw new Error(`Equipment type code "${type.code}" already exists`);

    const newType: EquipmentType = {
      id: `eqtype_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...type,
      code: type.code.toUpperCase()
    };
    this.db.equipmentTypes.push(newType);

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'CREATE_EQUIPMENT_TYPE',
      module: 'Assets',
      entity: 'EquipmentType',
      entityId: newType.id,
      newValue: `${newType.code} (${newType.name})`,
      details: `Created equipment type ${newType.code}`
    });
    this.save();
    return newType;
  }

  public updateEquipmentType(id: string, updates: Partial<EquipmentType>, user: { id: string; name: string }): EquipmentType {
    const index = this.db.equipmentTypes.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Equipment type not found');
    const old = this.db.equipmentTypes[index];
    const updated = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.db.equipmentTypes[index] = updated;

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_EQUIPMENT_TYPE',
      module: 'Assets',
      entity: 'EquipmentType',
      entityId: id,
      oldValue: `${old.code} (${old.status})`,
      newValue: `${updated.code} (${updated.status})`,
      details: `Updated equipment type ${updated.code}`
    });
    this.save();
    return updated;
  }

  // --- Equipment ---
  public getEquipment(): Equipment[] {
    return this.db.equipment;
  }

  public createEquipment(eq: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>, user: { id: string; name: string }): Equipment {
    const existing = this.db.equipment.find(e => e.equipmentNumber.toLowerCase() === eq.equipmentNumber.toLowerCase() && e.structureNodeId === eq.structureNodeId);
    if (existing) {
      throw new Error(`Equipment number "${eq.equipmentNumber}" already exists at this location`);
    }

    const newEq: Equipment = {
      id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...eq
    };
    this.db.equipment.push(newEq);

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'CREATE_EQUIPMENT',
      module: 'Assets',
      entity: 'Equipment',
      entityId: newEq.id,
      newValue: newEq.equipmentNumber,
      details: `Registered equipment ${newEq.equipmentNumber}`
    });
    this.save();
    return newEq;
  }

  public updateEquipment(id: string, updates: Partial<Equipment>, user: { id: string; name: string }): Equipment {
    const index = this.db.equipment.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Equipment not found');
    const old = this.db.equipment[index];
    const updated = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.db.equipment[index] = updated;

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_EQUIPMENT',
      module: 'Assets',
      entity: 'Equipment',
      entityId: id,
      oldValue: `${old.equipmentNumber} (${old.status})`,
      newValue: `${updated.equipmentNumber} (${updated.status})`,
      details: `Updated equipment ${updated.equipmentNumber}`
    });
    this.save();
    return updated;
  }

  // --- Technicians ---
  public getTechnicians(): Technician[] {
    return this.db.technicians;
  }

  public createTechnician(tech: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>, user: { id: string; name: string }): Technician {
    const newTech: Technician = {
      id: `tech_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...tech
    };
    this.db.technicians.push(newTech);
    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'CREATE_TECHNICIAN',
      module: 'Workforce',
      entity: 'Technician',
      entityId: newTech.id,
      newValue: `${newTech.code} - ${newTech.name}`,
      details: `Registered technician ${newTech.name}`
    });
    this.save();
    return newTech;
  }

  public updateTechnician(id: string, updates: Partial<Technician>, user: { id: string; name: string }): Technician {
    const index = this.db.technicians.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Technician not found');
    const old = this.db.technicians[index];
    const updated = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.db.technicians[index] = updated;
    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_TECHNICIAN',
      module: 'Workforce',
      entity: 'Technician',
      entityId: id,
      oldValue: old.name,
      newValue: updated.name,
      details: `Updated technician ${updated.name}`
    });
    this.save();
    return updated;
  }

  // --- Master Data (Categories, Descriptions, Actions) ---
  public getFaultCategories(): FaultCategory[] {
    return this.db.faultCategories;
  }

  public createFaultCategory(cat: Omit<FaultCategory, 'id'>, user: { id: string; name: string }): FaultCategory {
    const newCat: FaultCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...cat
    };
    this.db.faultCategories.push(newCat);
    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'CREATE_FAULT_CATEGORY',
      module: 'MasterData',
      entity: 'FaultCategory',
      entityId: newCat.id,
      newValue: newCat.name,
      details: `Added fault category ${newCat.name}`
    });
    this.save();
    return newCat;
  }

  public getFaultDescriptions(): FaultDescriptionTemplate[] {
    return this.db.faultDescriptions;
  }

  public createFaultDescription(desc: Omit<FaultDescriptionTemplate, 'id'>, user: { id: string; name: string }): FaultDescriptionTemplate {
    const newDesc: FaultDescriptionTemplate = {
      id: `fdesc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...desc
    };
    this.db.faultDescriptions.push(newDesc);
    this.save();
    return newDesc;
  }

  public getCorrectiveActions(): CorrectiveActionTemplate[] {
    return this.db.correctiveActions;
  }

  public createCorrectiveAction(action: Omit<CorrectiveActionTemplate, 'id'>, user: { id: string; name: string }): CorrectiveActionTemplate {
    const newAction: CorrectiveActionTemplate = {
      id: `cact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...action
    };
    this.db.correctiveActions.push(newAction);
    this.save();
    return newAction;
  }

  // --- Faults (Tracking, Lifecycle, Workflow & Time Calculations) ---
  public getFaults(filters?: {
    search?: string;
    structureNodeId?: string;
    equipmentTypeId?: string;
    equipmentNumber?: string;
    technicianId?: string;
    status?: string;
    relevantState?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): { faults: Fault[]; total: number } {
    let list = [...this.db.faults];

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(f =>
          f.callId.toLowerCase().includes(q) ||
          f.callNumber.toLowerCase().includes(q) ||
          f.faultDescription.toLowerCase().includes(q) ||
          f.equipmentNumber.toLowerCase().includes(q) ||
          (f.workDone && f.workDone.toLowerCase().includes(q)) ||
          (f.correctiveAction && f.correctiveAction.toLowerCase().includes(q)) ||
          (f.assignedTechnicianName && f.assignedTechnicianName.toLowerCase().includes(q))
        );
      }
      if (filters.structureNodeId) {
        list = list.filter(f => f.structureNodeId === filters.structureNodeId);
      }
      if (filters.equipmentTypeId) {
        list = list.filter(f => f.equipmentTypeId === filters.equipmentTypeId);
      }
      if (filters.equipmentNumber) {
        list = list.filter(f => f.equipmentNumber.toLowerCase() === filters.equipmentNumber!.toLowerCase());
      }
      if (filters.technicianId) {
        list = list.filter(f => f.assignedTechnicianId === filters.technicianId);
      }
      if (filters.status) {
        list = list.filter(f => f.status === filters.status);
      }
      if (filters.relevantState) {
        list = list.filter(f => f.relevantState === filters.relevantState);
      }
      if (filters.priority) {
        list = list.filter(f => f.priority === filters.priority);
      }
      if (filters.startDate) {
        list = list.filter(f => f.reportDate >= filters.startDate!);
      }
      if (filters.endDate) {
        list = list.filter(f => f.reportDate <= filters.endDate!);
      }
    }

    const total = list.length;

    // Sorting
    const sortBy = filters?.sortBy || 'reportDate';
    const sortOrder = filters?.sortOrder || 'desc';

    list.sort((a, b) => {
      let valA = (a as any)[sortBy] ?? '';
      let valB = (b as any)[sortBy] ?? '';
      if (sortBy === 'reportDate') {
        valA = `${a.reportDate} ${a.reportTime}`;
        valB = `${b.reportDate} ${b.reportTime}`;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    if (filters?.offset !== undefined || filters?.limit !== undefined) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      list = list.slice(offset, offset + limit);
    }

    return { faults: list, total };
  }

  public getFaultById(id: string): Fault | undefined {
    return this.db.faults.find(f => f.id === id);
  }

  public getFaultStatusHistory(faultId: string): FaultStatusHistory[] {
    return this.db.faultStatusHistory
      .filter(h => h.faultId === faultId)
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }

  public createFault(
    input: Omit<Fault, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'ttrMinutes' | 'downtimeMinutes'>,
    user: { id: string; name: string }
  ): Fault {
    // Check call ID / call number uniqueness if provided
    if (input.callId) {
      const dup = this.db.faults.find(f => f.callId.toLowerCase() === input.callId.toLowerCase());
      if (dup) {
        throw new Error(`Fault with Call ID "${input.callId}" already exists`);
      }
    }

    // Resolve technician name if technician ID provided
    let assignedTechnicianName = input.assignedTechnicianName;
    if (input.assignedTechnicianId && !assignedTechnicianName) {
      const tech = this.db.technicians.find(t => t.id === input.assignedTechnicianId);
      if (tech) assignedTechnicianName = tech.name;
    }

    // Calculate TTR and Downtime
    const ttrMinutes = calculateTTR(input.maintenanceStart, input.maintenanceEnd, input.reportDate);
    const downtimeMinutes = calculateDowntime({
      reportDate: input.reportDate,
      reportTime: input.reportTime,
      maintenanceStart: input.maintenanceStart,
      maintenanceEnd: input.maintenanceEnd,
      restorationDate: input.restorationDate
    });

    const newFault: Fault = {
      id: `fault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...input,
      assignedTechnicianName,
      ttrMinutes,
      downtimeMinutes,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.name,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByName: user.name
    };

    this.db.faults.unshift(newFault);

    // Initial status history
    this.db.faultStatusHistory.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      faultId: newFault.id,
      previousStatus: 'New',
      newStatus: newFault.status,
      changedBy: user.id,
      changedByName: user.name,
      changedAt: new Date().toISOString(),
      notes: 'Initial fault logged'
    });

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'CREATE_FAULT',
      module: 'FaultTracking',
      entity: 'Fault',
      entityId: newFault.id,
      newValue: `${newFault.callId || newFault.callNumber} - ${newFault.faultDescription}`,
      details: `Logged fault ${newFault.callNumber || newFault.callId} on ${newFault.equipmentNumber}`
    });

    this.save();
    return newFault;
  }

  public updateFault(id: string, updates: Partial<Fault>, user: { id: string; name: string }): Fault {
    const index = this.db.faults.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Fault record not found');
    const old = this.db.faults[index];

    // Status transition tracking
    if (updates.status && updates.status !== old.status) {
      this.db.faultStatusHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        faultId: id,
        previousStatus: old.status,
        newStatus: updates.status,
        waitingReason: updates.waitingReason,
        notes: updates.notes,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: new Date().toISOString()
      });

      this.logAudit({
        user: user.name || user.id,
        userName: user.name,
        action: 'TRANSITION_FAULT_STATUS',
        module: 'FaultTracking',
        entity: 'Fault',
        entityId: id,
        oldValue: old.status,
        newValue: updates.status,
        details: `Changed fault ${old.callNumber || old.callId} status from ${old.status} to ${updates.status}${updates.waitingReason ? ` (Reason: ${updates.waitingReason})` : ''}`
      });
    }

    // Resolve technician name if changed
    let assignedTechnicianName = updates.assignedTechnicianName ?? old.assignedTechnicianName;
    if (updates.assignedTechnicianId && updates.assignedTechnicianId !== old.assignedTechnicianId) {
      const tech = this.db.technicians.find(t => t.id === updates.assignedTechnicianId);
      if (tech) assignedTechnicianName = tech.name;
    }

    // Recalculate TTR and Downtime if dates or times changed
    const reportDate = updates.reportDate ?? old.reportDate;
    const reportTime = updates.reportTime ?? old.reportTime;
    const maintenanceStart = updates.maintenanceStart !== undefined ? updates.maintenanceStart : old.maintenanceStart;
    const maintenanceEnd = updates.maintenanceEnd !== undefined ? updates.maintenanceEnd : old.maintenanceEnd;
    const restorationDate = updates.restorationDate !== undefined ? updates.restorationDate : old.restorationDate;

    const ttrMinutes = calculateTTR(maintenanceStart, maintenanceEnd, reportDate);
    const downtimeMinutes = calculateDowntime({
      reportDate,
      reportTime,
      maintenanceStart,
      maintenanceEnd,
      restorationDate
    });

    const updated: Fault = {
      ...old,
      ...updates,
      assignedTechnicianName,
      ttrMinutes,
      downtimeMinutes,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByName: user.name
    };

    this.db.faults[index] = updated;

    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'UPDATE_FAULT',
      module: 'FaultTracking',
      entity: 'Fault',
      entityId: id,
      details: `Updated fault details for ${updated.callNumber || updated.callId}`
    });

    this.save();
    return updated;
  }

  // --- Users & RBAC ---
  public getUsers(): User[] {
    return this.db.users.map(({ passwordHash, ...u }) => {
      const role = this.db.roles.find(r => r.id === u.roleId);
      return { ...u, roleName: role ? role.name : u.roleId };
    });
  }

  public getUserById(id: string): (User & { passwordHash: string }) | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public getUserByUsername(username: string): (User & { passwordHash: string }) | undefined {
    return this.db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public createUser(userData: {
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    employeeId?: string;
    roleId: string;
    password: string;
  }, creator?: { id: string; name: string }): User {
    const existing = this.getUserByUsername(userData.username);
    if (existing) {
      throw new Error(`Username "${userData.username}" is already taken`);
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(userData.password, salt);

    const newUser: User & { passwordHash: string } = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: userData.username,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      employeeId: userData.employeeId,
      roleId: userData.roleId,
      status: 'active',
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: creator?.id || 'system',
      updatedBy: creator?.id || 'system'
    };

    this.db.users.push(newUser);

    this.logAudit({
      user: creator?.name || 'SYSTEM',
      userName: creator?.name || 'System Setup',
      action: 'CREATE_USER',
      module: 'Administration',
      entity: 'User',
      entityId: newUser.id,
      newValue: `${newUser.username} (${newUser.fullName})`,
      details: `Created user ${newUser.username} with role ${userData.roleId}`
    });

    this.save();
    const { passwordHash: _, ...safeUser } = newUser;
    const role = this.db.roles.find(r => r.id === safeUser.roleId);
    return { ...safeUser, roleName: role?.name };
  }

  public updateUser(id: string, updates: Partial<User> & { password?: string }, actor: { id: string; name: string }): User {
    const index = this.db.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    const old = this.db.users[index];

    let passwordHash = old.passwordHash;
    if (updates.password && updates.password.trim().length > 0) {
      passwordHash = bcrypt.hashSync(updates.password, bcrypt.genSaltSync(10));
    }

    const { password, ...otherUpdates } = updates;

    const updated = {
      ...old,
      ...otherUpdates,
      passwordHash,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.id
    };

    this.db.users[index] = updated;

    this.logAudit({
      user: actor.name || actor.id,
      userName: actor.name,
      action: 'UPDATE_USER',
      module: 'Administration',
      entity: 'User',
      entityId: id,
      oldValue: `${old.username} (${old.roleId}) - status: ${old.status}`,
      newValue: `${updated.username} (${updated.roleId}) - status: ${updated.status}`,
      details: `Updated user profile/status for ${updated.username}`
    });

    this.save();
    const { passwordHash: _, ...safeUser } = updated;
    const role = this.db.roles.find(r => r.id === safeUser.roleId);
    return { ...safeUser, roleName: role?.name };
  }

  public getRoles(): Role[] {
    return this.db.roles;
  }

  public createRole(role: Omit<Role, 'id' | 'isSystem'>, actor: { id: string; name: string }): Role {
    const newRole: Role = {
      id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isSystem: false,
      ...role
    };
    this.db.roles.push(newRole);
    this.logAudit({
      user: actor.name || actor.id,
      userName: actor.name,
      action: 'CREATE_ROLE',
      module: 'Administration',
      entity: 'Role',
      entityId: newRole.id,
      newValue: newRole.name,
      details: `Created custom role ${newRole.name}`
    });
    this.save();
    return newRole;
  }

  public updateRole(id: string, updates: Partial<Role>, actor: { id: string; name: string }): Role {
    const index = this.db.roles.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Role not found');
    const old = this.db.roles[index];
    if (old.isSystem && updates.permissions === undefined) {
      // Allow modifying system role permissions if needed, but not deletion
    }
    const updated = {
      ...old,
      ...updates
    };
    this.db.roles[index] = updated;
    this.logAudit({
      user: actor.name || actor.id,
      userName: actor.name,
      action: 'UPDATE_ROLE',
      module: 'Administration',
      entity: 'Role',
      entityId: id,
      newValue: updated.name,
      details: `Updated role ${updated.name}`
    });
    this.save();
    return updated;
  }

  // --- Audit Logs ---
  public getAuditLogs(filters?: { module?: string; action?: string; limit?: number; offset?: number }): { logs: AuditLog[]; total: number } {
    let logs = [...this.db.auditLogs];
    if (filters?.module) {
      logs = logs.filter(l => l.module.toLowerCase() === filters.module!.toLowerCase());
    }
    if (filters?.action) {
      logs = logs.filter(l => l.action.toLowerCase() === filters.action!.toLowerCase());
    }
    const total = logs.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    return {
      logs: logs.slice(offset, offset + limit),
      total
    };
  }

  // --- Module Registry ---
  public getModules(): ModuleDefinition[] {
    return this.db.modules;
  }

  public toggleModule(moduleId: string, enabled: boolean, user: { id: string; name: string }): ModuleDefinition {
    const mod = this.db.modules.find(m => m.id === moduleId);
    if (!mod) throw new Error('Module not found');
    if (mod.isCore && !enabled) {
      throw new Error('Core modules cannot be disabled');
    }
    mod.enabled = enabled;
    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'TOGGLE_MODULE',
      module: 'Administration',
      entity: 'Module',
      entityId: moduleId,
      newValue: enabled ? 'ENABLED' : 'DISABLED',
      details: `${enabled ? 'Enabled' : 'Disabled'} module: ${mod.name}`
    });
    this.save();
    return mod;
  }

  // --- Import Engine Operations ---
  public getImportJobs(): ImportJob[] {
    return [...this.db.importJobs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getImportErrors(jobId: string): ImportErrorItem[] {
    return this.db.importErrors.filter(e => e.jobId === jobId);
  }

  public recordImportJob(job: ImportJob, errors: ImportErrorItem[]) {
    this.db.importJobs.unshift(job);
    if (errors.length > 0) {
      this.db.importErrors.push(...errors);
    }
    // Limit error logs to last 20 jobs
    if (this.db.importJobs.length > 20) {
      const oldJobIds = new Set(this.db.importJobs.slice(20).map(j => j.id));
      this.db.importErrors = this.db.importErrors.filter(e => !oldJobIds.has(e.jobId));
      this.db.importJobs = this.db.importJobs.slice(0, 20);
    }
    this.save();
  }

  public getMappingTemplates(): ImportMappingTemplate[] {
    return this.db.importMappingTemplates;
  }

  public saveMappingTemplate(template: Omit<ImportMappingTemplate, 'id' | 'createdAt' | 'updatedAt'>): ImportMappingTemplate {
    const newTpl: ImportMappingTemplate = {
      id: `map_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...template
    };
    this.db.importMappingTemplates.push(newTpl);
    this.save();
    return newTpl;
  }

  // --- Dashboard Widgets ---
  public getDashboardWidgets(): DashboardWidget[] {
    return [...this.db.dashboardWidgets].sort((a, b) => a.order - b.order);
  }

  public updateDashboardWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
    this.db.dashboardWidgets = widgets;
    this.save();
    return this.getDashboardWidgets();
  }

  // --- Demonstration / Sample Data Management ---
  public clearSampleData(user: { id: string; name: string }) {
    this.db.faults = [];
    this.db.faultStatusHistory = [];
    this.db.equipment = [];
    this.db.structureNodes = [];
    this.logAudit({
      user: user.name || user.id,
      userName: user.name,
      action: 'CLEAR_SAMPLE_DATA',
      module: 'Administration',
      entity: 'SampleData',
      entityId: 'all',
      details: 'Cleared all demonstration equipment, structure nodes, and fault records'
    });
    this.save();
  }

  public seedInitialMetroDemonstrationData(adminName: string = 'System') {
    // 1. Organizational structure: Level 1 = Line, Level 2 = Station
    const lineLevel: StructureLevel = {
      id: 'level_1',
      internalCode: 'ORG_LEVEL_1',
      name: 'Line',
      pluralName: 'Lines',
      levelOrder: 1,
      parentLevelId: null,
      isActive: true,
      isRequired: true,
      customFields: [
        { id: 'cf_line_code', name: 'Line Code', key: 'lineCode', type: 'text', required: true }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const stationLevel: StructureLevel = {
      id: 'level_2',
      internalCode: 'ORG_LEVEL_2',
      name: 'Station',
      pluralName: 'Stations',
      levelOrder: 2,
      parentLevelId: 'level_1',
      isActive: true,
      isRequired: true,
      customFields: [
        { id: 'cf_station_no', name: 'Station Number', key: 'stationNumber', type: 'text', required: true },
        { id: 'cf_trigram', name: 'Trigram', key: 'trigram', type: 'text', required: true },
        { id: 'cf_status', name: 'Operational Status', key: 'opStatus', type: 'dropdown', options: ['Open', 'Restricted', 'Closed'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.db.structureLevels = [lineLevel, stationLevel];

    // 2. Lines: Line 1, Line 2, Line 3
    const l1: StructureNode = {
      id: 'node_line_1',
      structureLevelId: 'level_1',
      parentNodeId: null,
      code: 'L1',
      name: 'Line 1',
      description: 'North-South Metro Trunk Line',
      status: 'active',
      sortOrder: 1,
      customValues: { lineCode: 'L1-RED' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminName
    };

    const l2: StructureNode = {
      id: 'node_line_2',
      structureLevelId: 'level_1',
      parentNodeId: null,
      code: 'L2',
      name: 'Line 2',
      description: 'East-West Metro Cross Line',
      status: 'active',
      sortOrder: 2,
      customValues: { lineCode: 'L2-BLUE' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminName
    };

    const l3: StructureNode = {
      id: 'node_line_3',
      structureLevelId: 'level_1',
      parentNodeId: null,
      code: 'L3',
      name: 'Line 3',
      description: 'Airport & Suburban Express Line',
      status: 'active',
      sortOrder: 3,
      customValues: { lineCode: 'L3-GREEN' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminName
    };

    // 3. Example Stations: ADM, ABC, XYZ (clearly identified as sample data)
    const stADM: StructureNode = {
      id: 'node_st_adm',
      structureLevelId: 'level_2',
      parentNodeId: 'node_line_1',
      code: 'ADM',
      name: 'Station ADM (Sample)',
      description: 'Sample Station ADM on Line 1',
      status: 'active',
      sortOrder: 1,
      customValues: { stationNumber: '101', trigram: 'ADM', opStatus: 'Open' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminName
    };

    const stABC: StructureNode = {
      id: 'node_st_abc',
      structureLevelId: 'level_2',
      parentNodeId: 'node_line_1',
      code: 'ABC',
      name: 'Station ABC (Sample)',
      description: 'Sample Station ABC on Line 1',
      status: 'active',
      sortOrder: 2,
      customValues: { stationNumber: '102', trigram: 'ABC', opStatus: 'Open' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminName
    };

    const stXYZ: StructureNode = {
      id: 'node_st_xyz',
      structureLevelId: 'level_2',
      parentNodeId: 'node_line_2',
      code: 'XYZ',
      name: 'Station XYZ (Sample)',
      description: 'Sample Station XYZ on Line 2',
      status: 'active',
      sortOrder: 3,
      customValues: { stationNumber: '201', trigram: 'XYZ', opStatus: 'Open' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminName
    };

    this.db.structureNodes = [l1, l2, l3, stADM, stABC, stXYZ];

    // 4. Equipment Types: GATE, TOM, TVM, SCU
    const eqTypes: EquipmentType[] = [
      {
        id: 'type_tvm',
        code: 'TVM',
        name: 'Ticket Vending Machine',
        description: 'Passenger self-service ticket and card revaluation machine',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'type_gate',
        code: 'GATE',
        name: 'Automatic Fare Collection Gate',
        description: 'Passenger access control turnstile gate (entry/exit/bidirectional)',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'type_tom',
        code: 'TOM',
        name: 'Ticket Office Machine',
        description: 'Station agent counter ticketing terminal',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'type_scu',
        code: 'SCU',
        name: 'Station Computer Unit',
        description: 'Local station supervisory and network concentrator',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.db.equipmentTypes = eqTypes;

    // 5. Sample Equipment
    this.db.equipment = [
      {
        id: 'eq_tvm_01',
        equipmentNumber: 'TVM-01',
        equipmentTypeId: 'type_tvm',
        structureNodeId: 'node_st_adm',
        serialNumber: 'SN-TVM-8821',
        manufacturer: 'Thales Transportation',
        model: 'TransCity V3',
        installationDate: '2024-03-15',
        criticality: 'High',
        status: 'operational',
        description: 'Sample Concourse TVM at Station ADM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'eq_tvm_02',
        equipmentNumber: 'TVM-02',
        equipmentTypeId: 'type_tvm',
        structureNodeId: 'node_st_adm',
        serialNumber: 'SN-TVM-8822',
        manufacturer: 'Thales Transportation',
        model: 'TransCity V3',
        installationDate: '2024-03-15',
        criticality: 'High',
        status: 'operational',
        description: 'Sample TVM #2 at Station ADM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'eq_gate_01',
        equipmentNumber: 'GATE-01',
        equipmentTypeId: 'type_gate',
        structureNodeId: 'node_st_adm',
        serialNumber: 'SN-GT-1001',
        manufacturer: 'Gunnebo',
        model: 'MetroGate 500',
        installationDate: '2024-03-20',
        criticality: 'Critical',
        status: 'operational',
        description: 'Main Entry Gate 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'eq_tom_01',
        equipmentNumber: 'TOM-01',
        equipmentTypeId: 'type_tom',
        structureNodeId: 'node_st_abc',
        serialNumber: 'SN-TOM-301',
        manufacturer: 'Cubic',
        model: 'NextGen POS',
        installationDate: '2024-04-01',
        criticality: 'Medium',
        status: 'operational',
        description: 'Ticket Office Window 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'eq_scu_01',
        equipmentNumber: 'SCU-01',
        equipmentTypeId: 'type_scu',
        structureNodeId: 'node_st_xyz',
        serialNumber: 'SN-SCU-900',
        manufacturer: 'Siemens Mobility',
        model: 'RackServer SCU-200',
        installationDate: '2024-01-10',
        criticality: 'Critical',
        status: 'operational',
        description: 'Station Server Unit XYZ',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 6. Technicians
    this.db.technicians = [
      {
        id: 'tech_01',
        code: 'TECH-101',
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@metro-cmms.internal',
        phone: '+20 100 123 4567',
        specialization: 'AFC Ticket & Coin Mechanisms',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tech_02',
        code: 'TECH-102',
        name: 'Mahmoud Farouk',
        email: 'mahmoud.f@metro-cmms.internal',
        phone: '+20 100 234 5678',
        specialization: 'Gate Optics & Flap Actuators',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tech_03',
        code: 'TECH-103',
        name: 'Sara Nour',
        email: 'sara.nour@metro-cmms.internal',
        phone: '+20 100 345 6789',
        specialization: 'SCU Networking & Power Systems',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 7. Fault Categories & Templates
    this.db.faultCategories = [
      { id: 'cat_mech', code: 'MECH', name: 'Mechanical / Transport Jam', description: 'Ticket path, card feeder, gate flaps', status: 'active' },
      { id: 'cat_elec', code: 'ELEC', name: 'Electrical / Power Supply', description: 'PSU failure, UPS, breaker trip', status: 'active' },
      { id: 'cat_net', code: 'NETW', name: 'Network & Communication', description: 'LAN timeout, SCU offline, optical link', status: 'active' },
      { id: 'cat_soft', code: 'SOFT', name: 'Software / Application Error', description: 'OS crash, firmware halt, memory fault', status: 'active' },
      { id: 'cat_consum', code: 'CONS', name: 'Consumables Depleted', description: 'Out of receipt rolls, smart tokens empty', status: 'active' }
    ];

    this.db.faultDescriptions = [
      { id: 'fd_1', categoryId: 'cat_consum', equipmentTypeId: 'type_tvm', description: 'Ticket roll empty or jammed in cutter', status: 'active' },
      { id: 'fd_2', categoryId: 'cat_mech', equipmentTypeId: 'type_gate', description: 'Aisle optical sensor blocked / flap fails to open', status: 'active' },
      { id: 'fd_3', categoryId: 'cat_elec', equipmentTypeId: 'type_tvm', description: 'Banknote acceptor rejection motor failure', status: 'active' },
      { id: 'fd_4', categoryId: 'cat_net', equipmentTypeId: 'type_scu', description: 'SCU communication packet drop with central server', status: 'active' },
      { id: 'fd_5', categoryId: 'cat_soft', equipmentTypeId: 'type_tom', description: 'Card reader firmware frozen during revaluation', status: 'active' }
    ];

    this.db.correctiveActions = [
      { id: 'ca_1', action: 'Replaced thermal printer paper roll and cleaned transport rollers', status: 'active' },
      { id: 'ca_2', action: 'Cleaned infrared safety photoelectric sensors and recalibrated flap motor', status: 'active' },
      { id: 'ca_3', action: 'Cleared jammed note from validator and performed self-test', status: 'active' },
      { id: 'ca_4', action: 'Rebooted switch port and re-seated fiber optic patch cable', status: 'active' },
      { id: 'ca_5', action: 'Restarted terminal software and verified database sync', status: 'active' }
    ];

    // 8. Sample Demonstration Faults (clearly marked, illustrating TTR, midnight crossing, downtime)
    this.db.faults = [
      {
        id: 'fault_demo_101',
        callId: '10025',
        callNumber: 'C-10025',
        reportDate: '2026-09-15',
        reportTime: '10:15',
        structureNodeId: 'node_st_adm',
        equipmentTypeId: 'type_tvm',
        equipmentId: 'eq_tvm_01',
        equipmentNumber: 'TVM-01',
        faultCategoryId: 'cat_consum',
        faultCategoryName: 'Consumables Depleted',
        faultDescription: 'Ticket roll problem - cutter jammed',
        relevantState: 'Relevant',
        priority: 'High',
        assignedTechnicianId: 'tech_01',
        assignedTechnicianName: 'Ahmed Hassan',
        workDone: 'Cleared paper jam and installed fresh receipt roll',
        correctiveAction: 'Replaced thermal printer paper roll and cleaned transport rollers',
        maintenanceStart: '2026-09-15T10:15:00',
        maintenanceEnd: '2026-09-15T10:32:00',
        restorationDate: '2026-09-15T10:32:00',
        ttrMinutes: 17,
        downtimeMinutes: 17,
        status: 'Closed',
        notes: 'Verified printing 5 test tickets successfully. Sample test record.',
        createdAt: '2026-09-15T10:15:00Z',
        createdBy: 'system',
        createdByName: adminName,
        updatedAt: '2026-09-15T10:35:00Z',
        updatedBy: 'system',
        updatedByName: adminName
      },
      {
        id: 'fault_demo_102',
        callId: '10026',
        callNumber: 'C-10026',
        reportDate: '2026-09-15',
        reportTime: '23:50',
        structureNodeId: 'node_st_adm',
        equipmentTypeId: 'type_gate',
        equipmentId: 'eq_gate_01',
        equipmentNumber: 'GATE-01',
        faultCategoryId: 'cat_mech',
        faultCategoryName: 'Mechanical / Transport Jam',
        faultDescription: 'Flap failed to close upon passenger egress - midnight shift',
        relevantState: 'Relevant',
        priority: 'Emergency',
        assignedTechnicianId: 'tech_02',
        assignedTechnicianName: 'Mahmoud Farouk',
        workDone: 'Inspected pneumatic actuator and sensor alignment crossing midnight',
        correctiveAction: 'Cleaned infrared safety photoelectric sensors and recalibrated flap motor',
        maintenanceStart: '2026-09-15T23:50:00',
        maintenanceEnd: '2026-09-16T00:20:00',
        restorationDate: '2026-09-16T00:20:00',
        ttrMinutes: 30, // 23:50 to 00:20 = 30 minutes!
        downtimeMinutes: 30,
        status: 'Closed',
        notes: 'Overnight maintenance action. Correctly calculated crossing midnight.',
        createdAt: '2026-09-15T23:50:00Z',
        createdBy: 'system',
        createdByName: adminName,
        updatedAt: '2026-09-16T00:22:00Z',
        updatedBy: 'system',
        updatedByName: adminName
      },
      {
        id: 'fault_demo_103',
        callId: '10027',
        callNumber: 'C-10027',
        reportDate: '2026-09-16',
        reportTime: '08:40',
        structureNodeId: 'node_st_abc',
        equipmentTypeId: 'type_tom',
        equipmentId: 'eq_tom_01',
        equipmentNumber: 'TOM-01',
        faultCategoryId: 'cat_soft',
        faultCategoryName: 'Software / Application Error',
        faultDescription: 'Card reader firmware frozen during morning rush',
        relevantState: 'Relevant',
        priority: 'High',
        assignedTechnicianId: 'tech_01',
        assignedTechnicianName: 'Ahmed Hassan',
        workDone: 'Power-cycled station reader unit and verified central synchronization',
        correctiveAction: 'Restarted terminal software and verified database sync',
        maintenanceStart: '2026-09-16T08:50:00',
        maintenanceEnd: '2026-09-16T09:05:00',
        restorationDate: '2026-09-16T09:05:00',
        ttrMinutes: 15,
        downtimeMinutes: 25,
        status: 'Resolved',
        notes: 'Ticket office supervisor confirmed normal passenger handling.',
        createdAt: '2026-09-16T08:40:00Z',
        createdBy: 'system',
        createdByName: adminName,
        updatedAt: '2026-09-16T09:06:00Z',
        updatedBy: 'system',
        updatedByName: adminName
      },
      {
        id: 'fault_demo_104',
        callId: '10028',
        callNumber: 'C-10028',
        reportDate: '2026-09-16',
        reportTime: '14:20',
        structureNodeId: 'node_st_xyz',
        equipmentTypeId: 'type_tvm',
        equipmentId: null,
        equipmentNumber: 'TVM-03',
        faultCategoryId: 'cat_elec',
        faultCategoryName: 'Electrical / Power Supply',
        faultDescription: 'Coin acceptor sensor dirty; occasional refund rejection',
        relevantState: 'Non-Relevant',
        priority: 'Low',
        assignedTechnicianId: 'tech_03',
        assignedTechnicianName: 'Sara Nour',
        workDone: 'Routine sensor cleaning during non-peak hours',
        correctiveAction: 'Cleaned coin optics with isopropyl alcohol',
        maintenanceStart: '2026-09-16T14:30:00',
        maintenanceEnd: '2026-09-16T14:42:00',
        restorationDate: '2026-09-16T14:42:00',
        ttrMinutes: 12,
        downtimeMinutes: 22,
        status: 'Closed',
        notes: 'Marked Non-Relevant as machine was never out of revenue service.',
        createdAt: '2026-09-16T14:20:00Z',
        createdBy: 'system',
        createdByName: adminName,
        updatedAt: '2026-09-16T14:45:00Z',
        updatedBy: 'system',
        updatedByName: adminName
      },
      {
        id: 'fault_demo_105',
        callId: '10029',
        callNumber: 'C-10029',
        reportDate: '2026-09-17',
        reportTime: '11:10',
        structureNodeId: 'node_st_adm',
        equipmentTypeId: 'type_scu',
        equipmentId: 'eq_scu_01',
        equipmentNumber: 'SCU-01',
        faultCategoryId: 'cat_net',
        faultCategoryName: 'Network & Communication',
        faultDescription: 'Intermittent optical packet loss on station ring port 2',
        relevantState: 'Under Review',
        priority: 'Medium',
        assignedTechnicianId: 'tech_03',
        assignedTechnicianName: 'Sara Nour',
        workDone: 'Monitoring packet error counters with OTDR tool',
        correctiveAction: '',
        maintenanceStart: '2026-09-17T11:30:00',
        maintenanceEnd: null,
        restorationDate: null,
        ttrMinutes: 0,
        downtimeMinutes: 0,
        status: 'In Progress',
        waitingReason: '',
        notes: 'Fiber patch cord replacement may be required during engineering night hours.',
        createdAt: '2026-09-17T11:10:00Z',
        createdBy: 'system',
        createdByName: adminName,
        updatedAt: '2026-09-17T11:35:00Z',
        updatedBy: 'system',
        updatedByName: adminName
      }
    ];

    // Status histories for demo faults
    this.db.faultStatusHistory = [
      {
        id: 'hist_demo_1',
        faultId: 'fault_demo_101',
        previousStatus: 'New',
        newStatus: 'Assigned',
        changedBy: 'system',
        changedByName: adminName,
        changedAt: '2026-09-15T10:15:30Z',
        notes: 'Assigned to Ahmed Hassan'
      },
      {
        id: 'hist_demo_2',
        faultId: 'fault_demo_101',
        previousStatus: 'Assigned',
        newStatus: 'Resolved',
        changedBy: 'tech_01',
        changedByName: 'Ahmed Hassan',
        changedAt: '2026-09-15T10:32:00Z',
        notes: 'Paper roll replaced'
      },
      {
        id: 'hist_demo_3',
        faultId: 'fault_demo_101',
        previousStatus: 'Resolved',
        newStatus: 'Closed',
        changedBy: 'system',
        changedByName: adminName,
        changedAt: '2026-09-15T10:35:00Z',
        notes: 'Verified by station supervisor'
      }
    ];

    this.save();
  }
}

export const store = new CMMSStore();
