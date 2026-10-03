import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  AlertCircle,
  Layers,
  Users,
  Search,
  Check,
  X,
  FileText,
  Sliders,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { Role, User } from '../types/cmms.ts';

interface PermissionGroup {
  category: string;
  permissions: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: 'Fault Tracking & Maintenance Lifecycle',
    permissions: [
      { key: 'faults:view', label: 'View Faults', description: 'Access fault register, view details and history' },
      { key: 'faults:create', label: 'Log New Fault', description: 'Create and submit new equipment breakdown calls' },
      { key: 'faults:edit', label: 'Edit Fault Details', description: 'Update work done, corrective actions, and parts used' },
      { key: 'faults:assign', label: 'Assign Technicians', description: 'Dispatch and assign maintenance technicians to calls' },
      { key: 'faults:resolve', label: 'Resolve Faults', description: 'Transition fault status to Resolved' },
      { key: 'faults:close', label: 'Close Faults', description: 'Verify repair work and permanently close tickets' },
      { key: 'faults:reopen', label: 'Reopen Faults', description: 'Reopen recurring or improperly resolved faults' }
    ]
  },
  {
    category: 'Assets & Equipment Register',
    permissions: [
      { key: 'equipment:view', label: 'View Equipment', description: 'Access equipment asset register and fault history' },
      { key: 'equipment:manage', label: 'Manage Equipment', description: 'Register new equipment, edit serial numbers & specs' }
    ]
  },
  {
    category: 'Reports & Analytics',
    permissions: [
      { key: 'reports:view', label: 'View Reports & Dashboard', description: 'Access KPI dashboards and maintenance analytics' },
      { key: 'reports:export', label: 'Export Data (PDF/Excel)', description: 'Generate vector PDF reports and Excel spreadsheets' }
    ]
  },
  {
    category: 'Organizational Structure & Hierarchy',
    permissions: [
      { key: 'structure:manage', label: 'Manage Structure Hierarchy', description: 'Reconfigure levels (Line/Station, City/Location) & nodes' }
    ]
  },
  {
    category: 'Master Data Registry',
    permissions: [
      { key: 'masterdata:manage', label: 'Manage Master Data', description: 'Configure equipment types, technicians, and defect categories' }
    ]
  },
  {
    category: 'Data Migration & Historical Import',
    permissions: [
      { key: 'import:execute', label: 'Execute Excel Import', description: 'Upload, inspect, map, and commit Excel maintenance files' }
    ]
  },
  {
    category: 'Administration & Security',
    permissions: [
      { key: 'users:manage', label: 'Manage Users & Passwords', description: 'Create user accounts, reset passwords, change user status' },
      { key: 'roles:manage', label: 'Manage Roles & Permissions', description: 'Create and edit custom roles and permission assignments' },
      { key: 'audit:view', label: 'View Audit Trail Log', description: 'Access immutable security and compliance audit logs' },
      { key: 'settings:manage', label: 'System Settings & Purge', description: 'Configure enterprise settings, clear/seed sample data' }
    ]
  }
];

export const RolesAdminView: React.FC = () => {
  const { user: currentUser, refreshAuth, refreshMasterData, showToast } = useCMMS();

  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'cards' or 'matrix'
  const [viewTab, setViewTab] = useState<'matrix' | 'cards'>('matrix');

  // Edit / Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Users modal state
  const [assignRole, setAssignRole] = useState<Role | null>(null);
  const [assignUserModalOpen, setAssignUserModalOpen] = useState(false);

  const fetchRolesAndUsers = async () => {
    try {
      setLoading(true);
      const [rRes, uRes] = await Promise.all([
        api.getRoles(),
        api.getUsers().catch(() => ({ users: [] }))
      ]);
      setRoles(rRes.roles || []);
      setUsers(uRes.users || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndUsers();
  }, []);

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description);
    setSelectedPermissions(role.permissions || []);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setSelectedPermissions(['faults:view', 'equipment:view', 'reports:view']);
    setIsModalOpen(true);
  };

  const togglePermission = (key: string) => {
    if (editingRole?.id === 'role_admin') {
      showToast('Administrator has unconstrained permissions and cannot be modified.', 'warning');
      return;
    }
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleGroup = (groupKeys: string[], checkAll: boolean) => {
    if (editingRole?.id === 'role_admin') return;
    if (checkAll) {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...groupKeys])));
    } else {
      setSelectedPermissions(prev => prev.filter(k => !groupKeys.includes(k)));
    }
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      showToast('Role name is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingRole) {
        await api.updateRole(editingRole.id, {
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: editingRole.id === 'role_admin' ? editingRole.permissions : selectedPermissions
        });
        showToast(`Role "${roleName}" updated successfully`, 'success');
      } else {
        await api.createRole({
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: selectedPermissions
        });
        showToast(`Created new role "${roleName}"`, 'success');
      }
      setIsModalOpen(false);
      fetchRolesAndUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to save role', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      showToast('System roles cannot be deleted', 'error');
      return;
    }

    const assignedCount = users.filter(u => u.roleId === role.id).length;
    if (assignedCount > 0) {
      showToast(`Cannot delete role: ${assignedCount} user(s) are currently assigned to it.`, 'error');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete custom role "${role.name}"?`)) {
      return;
    }

    try {
      await api.deleteRole(role.id);
      showToast(`Role "${role.name}" deleted.`, 'info');
      fetchRolesAndUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  };

  const allPermissionKeys = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-purple-400" />
            Roles & Permissions Architecture (RBAC)
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Granular permission matrix, system roles, and custom role authoring with server-enforced authorization
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewTab('matrix')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewTab === 'matrix' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Permission Matrix
            </button>
            <button
              onClick={() => setViewTab('cards')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewTab === 'cards' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Role Cards
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Roles</span>
          <div className="text-2xl font-bold text-white">{roles.length}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">System Roles</span>
          <div className="text-2xl font-bold text-cyan-400">{roles.filter(r => r.isSystem).length}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Custom Roles</span>
          <div className="text-2xl font-bold text-purple-400">{roles.filter(r => !r.isSystem).length}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Granular Permissions</span>
          <div className="text-2xl font-bold text-emerald-400">{allPermissionKeys.length}</div>
        </div>
      </div>

      {/* MATRIX VIEW */}
      {viewTab === 'matrix' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/80 text-white font-semibold text-xs">
                  <th className="py-3.5 px-4 w-72 min-w-[240px]">Permission Name & Domain</th>
                  {roles.map(r => {
                    const assignedCount = users.filter(u => u.roleId === r.id).length;
                    return (
                      <th key={r.id} className="py-3.5 px-3 text-center min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-white whitespace-nowrap">{r.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                r.isSystem
                                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                  : 'bg-purple-950 text-purple-300 border border-purple-800'
                              }`}
                            >
                              {r.isSystem ? 'System' : 'Custom'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">({assignedCount} users)</span>
                          </div>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit Role</span>
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {PERMISSION_GROUPS.map(group => (
                  <React.Fragment key={group.category}>
                    {/* Category Header Row */}
                    <tr className="bg-slate-800/40 border-t border-b border-slate-800/80">
                      <td colSpan={roles.length + 1} className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider text-cyan-400">
                        {group.category}
                      </td>
                    </tr>

                    {/* Permissions Rows in this group */}
                    {group.permissions.map(perm => (
                      <tr key={perm.key} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-200">{perm.label}</div>
                          <div className="text-[10px] text-slate-400">{perm.description}</div>
                          <code className="text-[9px] text-slate-500 font-mono">{perm.key}</code>
                        </td>

                        {roles.map(r => {
                          const hasIt = r.permissions.includes('*') || r.permissions.includes(perm.key);
                          const isAdminRole = r.id === 'role_admin';

                          return (
                            <td key={r.id} className="py-2.5 px-3 text-center">
                              {hasIt ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800/50 text-slate-600">
                                  <X className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(r => {
            const assignedUsers = users.filter(u => u.roleId === r.id);
            const permCount = r.permissions.includes('*') ? allPermissionKeys.length : r.permissions.length;

            return (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl hover:border-slate-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border ${
                        r.isSystem
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-purple-950 text-purple-300 border-purple-800'
                      }`}
                    >
                      {r.isSystem ? 'System Defined' : 'Custom Defined'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {assignedUsers.length} user(s) assigned
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{r.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[38px]">{r.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Permissions:</span>
                    <span className="font-semibold text-cyan-400">
                      {r.permissions.includes('*') ? 'Full Unconstrained (*)' : `${permCount} of ${allPermissionKeys.length}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {r.permissions.includes('*') ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                        All System Permissions (*)
                      </span>
                    ) : (
                      r.permissions.map(p => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
                          {p}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Edit className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Edit Permissions</span>
                  </button>

                  {!r.isSystem && (
                    <button
                      onClick={() => handleDeleteRole(r)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete Custom Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role Edit & Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Role'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Role Name *</label>
                  <input
                    type="text"
                    disabled={editingRole?.isSystem && editingRole?.id === 'role_admin'}
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="e.g. Lead Inspector"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-medium disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Description</label>
                  <input
                    type="text"
                    value={roleDesc}
                    onChange={e => setRoleDesc(e.target.value)}
                    placeholder="Authority and duties description"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {editingRole?.id === 'role_admin' ? (
                <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800 text-cyan-200 text-xs">
                  <span className="font-bold">Root Administrator:</span> This role possesses unrestricted root access across all current and future modules. Individual permissions cannot be removed.
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Select Fine-Grained Permissions ({selectedPermissions.length} selected)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(allPermissionKeys)}
                        className="text-cyan-400 hover:underline text-[11px]"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="text-slate-400 hover:underline text-[11px]"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map(group => {
                      const groupKeys = group.permissions.map(p => p.key);
                      const allChecked = groupKeys.every(k => selectedPermissions.includes(k));

                      return (
                        <div key={group.category} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-cyan-300 text-xs">{group.category}</span>
                            <button
                              type="button"
                              onClick={() => toggleGroup(groupKeys, !allChecked)}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              {allChecked ? 'Deselect Category' : 'Select Category'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.permissions.map(perm => {
                              const checked = selectedPermissions.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                    checked
                                      ? 'bg-cyan-950/40 border-cyan-700/70 text-white'
                                      : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(perm.key)}
                                    className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-800 border-slate-600"
                                  />
                                  <div>
                                    <div className="font-medium text-xs">{perm.label}</div>
                                    <div className="text-[10px] text-slate-400">{perm.description}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveRole}
                className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/30"
              >
                {isSubmitting ? 'Saving...' : 'Save Role Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
