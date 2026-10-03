import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Edit,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Lock,
  UserCheck
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { User, Role } from '../types/cmms.ts';

export const UsersAdminView: React.FC = () => {
  const { showToast, user: currentUser } = useCMMS();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');

  // User modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('role_supervisor');
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsersAndRoles = async () => {
    try {
      setLoading(true);
      const [uRes, rRes] = await Promise.all([
        api.getUsers(),
        api.getRoles()
      ]);
      setUsersList(uRes.users);
      setRolesList(rRes.roles);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setFullName(user.fullName);
      setEmail(user.email);
      setEmployeeId(user.employeeId || '');
      setPhone(user.phone || '');
      setRoleId(user.roleId);
      setStatus(user.status);
      setPassword('');
      setConfirmPassword('');
    } else {
      setEditingUser(null);
      setUsername('');
      setFullName('');
      setEmail('');
      setEmployeeId('');
      setPhone('');
      setRoleId('role_supervisor');
      setStatus('active');
      setPassword('');
      setConfirmPassword('');
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!username.trim() || !fullName.trim() || !email.trim()) {
      showToast('Username, full name, and email are required', 'error');
      return;
    }

    if (!editingUser) {
      if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }
    } else if (password && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingUser) {
        const payload: any = {
          fullName: fullName.trim(),
          email: email.trim(),
          employeeId: employeeId.trim() || undefined,
          phone: phone.trim() || undefined,
          roleId,
          status
        };
        if (password) payload.password = password;

        await api.updateUser(editingUser.id, payload);
        showToast(`Updated user ${fullName}`, 'success');
      } else {
        await api.createUser({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          employeeId: employeeId.trim() || undefined,
          phone: phone.trim() || undefined,
          roleId,
          password
        });
        showToast(`Created new user ${fullName}`, 'success');
      }
      setIsUserModalOpen(false);
      fetchUsersAndRoles();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (u: User) => {
    try {
      await api.updateUser(u.id, { status: u.status === 'active' ? 'inactive' : 'active' });
      showToast(`User status changed to ${u.status === 'active' ? 'inactive' : 'active'}`, 'info');
      fetchUsersAndRoles();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const filteredUsers = usersList.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-teal-400" />
            User Access Control & RBAC Administration
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Mandatory Administrator-Only User Management with secure bcrypt password hashing and granular role assignment
          </p>
        </div>

        <button
          onClick={() => handleOpenUserModal()}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create New User</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users by name, username, email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Roles</option>
            {rolesList.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="text-slate-400">
          Showing <span className="font-bold text-white">{filteredUsers.length}</span> of {usersList.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading user accounts...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No users match query.</td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const role = rolesList.find(r => r.id === u.roleId);
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{u.fullName}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">@{u.username} • {u.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          {role?.name || u.roleId}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">{u.employeeId || '-'}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.status === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : u.status === 'suspended'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenUserModal(u)}
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                            title="Edit User Profile & Reset Password"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeactivate(u)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors border border-slate-700"
                              title="Toggle Active / Inactive"
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create/Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              {editingUser ? `Edit User: @${editingUser.username}` : 'Create New System User'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Username *</label>
                <input
                  type="text"
                  disabled={!!editingUser}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jdoe@metro-transit.internal"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium">Role *</label>
                  <select
                    value={roleId}
                    onChange={e => setRoleId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none font-medium"
                  >
                    {rolesList.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Account Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                <span className="text-[11px] font-semibold uppercase text-slate-400">
                  {editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password *'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-600/30"
              >
                {isSubmitting ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
