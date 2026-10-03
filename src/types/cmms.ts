export type StructureLevelType = 'ORG_LEVEL_1' | 'ORG_LEVEL_2' | 'ORG_LEVEL_3' | 'ORG_LEVEL_4';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  options?: string[];
  required?: boolean;
}

export interface StructureLevel {
  id: string;
  internalCode: string; // e.g. 'ORG_LEVEL_1', 'ORG_LEVEL_2'
  name: string; // e.g. 'Line' or 'City'
  pluralName: string; // e.g. 'Lines' or 'Cities'
  levelOrder: number; // 1, 2, ...
  parentLevelId?: string | null;
  isActive: boolean;
  isRequired: boolean;
  customFields: CustomFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface StructureNode {
  id: string;
  structureLevelId: string;
  parentNodeId?: string | null;
  code: string; // e.g. 'L1', 'ADM'
  name: string; // e.g. 'Line 1', 'Station ADM'
  description?: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  customValues?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface EquipmentType {
  id: string;
  code: string; // e.g. 'GATE', 'TOM', 'TVM', 'SCU'
  name: string; // e.g. 'Automatic Fare Gate', 'Ticket Office Machine'
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  equipmentNumber: string; // e.g. 'TVM-01', 'GATE-102'
  equipmentTypeId: string;
  structureNodeId: string; // points to leaf structure node (e.g. Station)
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  installationDate?: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'operational' | 'faulty' | 'maintenance' | 'decommissioned';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  status: 'active' | 'inactive';
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FaultCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface FaultDescriptionTemplate {
  id: string;
  categoryId?: string;
  equipmentTypeId?: string;
  description: string;
  status: 'active' | 'inactive';
}

export interface CorrectiveActionTemplate {
  id: string;
  action: string;
  description?: string;
  status: 'active' | 'inactive';
}

export type FaultStatus = 'New' | 'Assigned' | 'In Progress' | 'Waiting' | 'Resolved' | 'Closed' | 'Reopened';
export type RelevantState = 'Relevant' | 'Non-Relevant' | 'Under Review';
export type Priority = 'Low' | 'Medium' | 'High' | 'Emergency';

export interface FaultAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface FaultStatusHistory {
  id: string;
  faultId: string;
  previousStatus: FaultStatus;
  newStatus: FaultStatus;
  waitingReason?: string;
  notes?: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
}

export interface Fault {
  id: string;
  callId: string;
  callNumber: string;
  reportDate: string; // YYYY-MM-DD
  reportTime: string; // HH:mm
  structureNodeId: string;
  equipmentTypeId: string;
  equipmentId?: string | null;
  equipmentNumber: string;
  faultCategoryId?: string | null;
  faultCategoryName?: string;
  faultDescription: string;
  relevantState: RelevantState;
  priority: Priority;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string;
  workDone?: string;
  correctiveAction?: string;
  maintenanceStart?: string | null; // ISO string or YYYY-MM-DDTHH:mm
  maintenanceEnd?: string | null; // ISO string or YYYY-MM-DDTHH:mm
  restorationDate?: string | null;
  ttrMinutes: number; // calculated TTR
  downtimeMinutes: number; // calculated Downtime
  status: FaultStatus;
  waitingReason?: string;
  notes?: string;
  attachments?: FaultAttachment[];
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName?: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  technicianId?: string;
  roleId: string;
  roleName?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userName?: string;
  action: string;
  module: string;
  entity: string;
  entityId: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export interface OrganizationSettings {
  id: string;
  organizationName: string;
  maintenanceDepartment: string;
  logoUrl?: string;
  timeZone: string;
  dateFormat: string;
  language: string;
  currency: string;
  downtimeCalculationRule: 'report_to_restoration' | 'report_to_maintenance_end' | 'maintenance_window_only';
  isInitialized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  isCore: boolean;
  category: 'core' | 'maintenance' | 'inventory' | 'workforce' | 'asset';
  navItems: Array<{
    title: string;
    path: string;
    icon: string;
    permission?: string;
  }>;
}

export interface ImportJob {
  id: string;
  filename: string;
  user: string;
  userName?: string;
  timestamp: string;
  recordsProcessed: number;
  recordsImported: number;
  recordsRejected: number;
  recordsSkipped: number;
  warningsCount: number;
  status: 'completed' | 'failed' | 'partial';
}

export interface ImportErrorItem {
  id: string;
  jobId: string;
  rowNumber: number;
  column: string;
  value: string;
  problem: string;
  suggestedAction: string;
}

export interface ImportMappingTemplate {
  id: string;
  name: string;
  description?: string;
  mappings: Record<string, string>; // excelHeader -> cmmsField
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'stat' | 'chart_trend' | 'chart_structure' | 'chart_equipment' | 'chart_technician' | 'recurring_table';
  width: 'full' | 'half' | 'third';
  order: number;
  visible: boolean;
}
