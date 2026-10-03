import React, { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  PlusCircle,
  Cpu,
  FileText,
  Users,
  Shield,
  GitBranch,
  Database,
  FileSpreadsheet,
  History,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  Menu,
  X,
  Package,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useCMMS } from '../context/CMMSContext.tsx';

interface LayoutProps {
  currentTab: string;
  onNavigate: (tab: string, meta?: any) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentTab, onNavigate, children }) => {
  const { user, login, switchUser, logout, settings, levels, getLevelName, hasPermission, modules, allUsers, showToast } = useCMMS();
  const [adminMenuOpen, setAdminMenuOpen] = useState(true);
  const [maintenanceMenuOpen, setMaintenanceMenuOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleInfoModal, setShowRoleInfoModal] = useState(false);

  const isAdmin = user?.roleId === 'role_admin' || user?.permissions?.includes('*');

  // Dynamic names for sidebar
  const level1Name = getLevelName(1, true);
  const level2Name = getLevelName(2, true);

  // Quick switch role for testing / simulation
  const handleQuickSwitchRole = async (targetUsername: string) => {
    try {
      await switchUser(targetUsername);
      onNavigate('dashboard');
    } catch (err: any) {
      showToast(`Failed to switch to ${targetUsername}: ${err.message}`, 'error');
    }
  };

  const hasAnyAdminPermission =
    isAdmin ||
    hasPermission('users:manage') ||
    hasPermission('roles:manage') ||
    hasPermission('structure:manage') ||
    hasPermission('masterdata:manage') ||
    hasPermission('audit:view') ||
    hasPermission('settings:manage');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">ApexCMMS</div>
            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{settings?.organizationName || 'Enterprise CMMS'}</div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Banner */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              ApexCMMS
              <span className="text-[9px] px-1.5 py-0.2 bg-cyan-950 border border-cyan-800/80 text-cyan-400 rounded">v1.0</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate" title={settings?.organizationName}>
              {settings?.organizationName || 'Maintenance System'}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
          {/* Main Dashboard */}
          <button
            onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Operational Dashboard</span>
          </button>

          {/* Maintenance Section (requires faults:view) */}
          {hasPermission('faults:view') && (
            <div className="pt-2">
              <button
                onClick={() => setMaintenanceMenuOpen(!maintenanceMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
              >
                <span>Maintenance</span>
                {maintenanceMenuOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {maintenanceMenuOpen && (
                <div className="mt-1 space-y-1 pl-1">
                  <button
                    onClick={() => { onNavigate('faults'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      currentTab === 'faults'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Fault Tracking & History</span>
                  </button>

                  {hasPermission('faults:create') && (
                    <button
                      onClick={() => { onNavigate('new_fault'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentTab === 'new_fault'
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Log New Fault</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Assets Section (requires equipment:view) */}
          {hasPermission('equipment:view') && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Assets & Locations
              </div>
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => { onNavigate('equipment'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    currentTab === 'equipment'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <Cpu className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>Equipment Register</span>
                </button>
              </div>
            </div>
          )}

          {/* Reports Section (requires reports:view) */}
          {hasPermission('reports:view') && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reports & KPIs
              </div>
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => { onNavigate('reports'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    currentTab === 'reports'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>PDF & Excel Reports</span>
                </button>
              </div>
            </div>
          )}

          {/* Data Management Section (requires import:execute) */}
          {hasPermission('import:execute') && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Data Migration
              </div>
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => { onNavigate('import_excel'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    currentTab === 'import_excel'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Excel Import Engine</span>
                </button>
              </div>
            </div>
          )}

          {/* Administration Section (guarded by RBAC permissions) */}
          {hasAnyAdminPermission && (
            <div className="pt-2">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
              >
                <span>Administration</span>
                {adminMenuOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {adminMenuOpen && (
                <div className="mt-1 space-y-1 pl-1">
                  {(hasPermission('users:manage') || isAdmin) && (
                    <button
                      onClick={() => { onNavigate('admin_users'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentTab === 'admin_users'
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0 text-teal-400" />
                      <span>Users Management</span>
                    </button>
                  )}

                  {(hasPermission('roles:manage') || hasPermission('users:manage') || isAdmin) && (
                    <button
                      onClick={() => { onNavigate('admin_roles'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentTab === 'admin_roles'
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <Shield className="w-4 h-4 shrink-0 text-purple-400" />
                      <span>Roles & Permissions</span>
                    </button>
                  )}

                  {(hasPermission('structure:manage') || isAdmin) && (
                    <button
                      onClick={() => { onNavigate('admin_structure'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentTab === 'admin_structure'
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <GitBranch className="w-4 h-4 shrink-0 text-amber-400" />
                      <span className="truncate">Organizational Structure</span>
                    </button>
                  )}

                  {(hasPermission('masterdata:manage') || isAdmin) && (
                    <button
                      onClick={() => { onNavigate('admin_masterdata'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentTab === 'admin_masterdata'
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <Database className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>Master Data Registry</span>
                    </button>
                  )}

                  {(hasPermission('audit:view') || isAdmin) && (
                    <button
                      onClick={() => { onNavigate('admin_audit'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        currentTab === 'admin_audit'
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <History className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span>Audit Trail Log</span>
                    </button>
                  )}

                  {(hasPermission('settings:manage') || isAdmin) && (
                    <>
                      <button
                        onClick={() => { onNavigate('admin_modules'); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          currentTab === 'admin_modules'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <Layers className="w-4 h-4 shrink-0 text-sky-400" />
                        <span>Module Registry</span>
                      </button>

                      <button
                        onClick={() => { onNavigate('admin_settings'); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          currentTab === 'admin_settings'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <Settings className="w-4 h-4 shrink-0 text-slate-400" />
                        <span>System Settings</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Architecture Extensions (Future modules indicator) */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Extensions (Reserved)</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Modular</span>
            </div>
            <div className="mt-1 space-y-1 opacity-60">
              <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Preventive Maintenance</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>Warehouse & Spares</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Workforce Attendance</span>
              </div>
            </div>
          </div>
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
          <div
            onClick={() => setShowRoleInfoModal(true)}
            className="min-w-0 flex items-center gap-2.5 cursor-pointer group"
            title="Click to view your role permissions"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 group-hover:border-cyan-500 flex items-center justify-center font-bold text-xs text-cyan-400 shrink-0 transition-colors">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                {user?.fullName}
              </div>
              <div className="text-[10px] text-cyan-400 font-medium truncate flex items-center gap-1">
                <span>{user?.roleName || user?.roleId}</span>
                <span className="text-[9px] text-slate-500">&bull; Info</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950">
        {/* Top App Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {settings?.maintenanceDepartment || 'Maintenance Operations Division'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-medium text-slate-300">
              Hierarchy: <span className="text-cyan-400 font-semibold">{level1Name} &rarr; {level2Name}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* RBAC Role Switcher & Indicator for easy verification */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-[11px] text-slate-400">Current Role:</span>
              <span className="font-semibold text-white">{user?.roleName || user?.roleId}</span>

              {/* 1-Click Role Switcher for verification */}
              <div className="ml-2 pl-2 border-l border-slate-700 flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-mono">Test as:</span>
                <button
                  onClick={() => handleQuickSwitchRole('admin')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    user?.username === 'admin' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Admin (Full Access)"
                >
                  Admin
                </button>
                <button
                  onClick={() => handleQuickSwitchRole('manager')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    user?.username === 'manager' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Manager (Operations & Reports)"
                >
                  Manager
                </button>
                <button
                  onClick={() => handleQuickSwitchRole('supervisor')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    user?.username === 'supervisor' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Supervisor (Fault Management)"
                >
                  Supervisor
                </button>
                <button
                  onClick={() => handleQuickSwitchRole('technician')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    user?.username === 'technician' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Technician (Work Done)"
                >
                  Tech
                </button>
                <button
                  onClick={() => handleQuickSwitchRole('analyst')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    user?.username === 'analyst' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Analyst (Read Only)"
                >
                  Analyst
                </button>

                {allUsers && allUsers.length > 0 && (
                  <select
                    value={user?.username || ''}
                    onChange={(e) => handleQuickSwitchRole(e.target.value)}
                    className="ml-1 bg-slate-900 border border-slate-700 text-[10px] rounded px-1.5 py-0.5 text-cyan-300 focus:outline-none"
                    title="Switch to any active account"
                  >
                    <option value="" disabled>All Users ({allUsers.length})</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.username}>
                        {u.username} ({u.roleName || u.roleId})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {hasPermission('faults:create') && (
              <button
                onClick={() => onNavigate('new_fault')}
                className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Record Fault</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Role Info & Active Permissions Modal */}
      {showRoleInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  Your Active Role & Permissions
                </h3>
                <p className="text-xs text-slate-400">
                  User: <span className="text-white font-medium">{user?.fullName}</span> (@{user?.username})
                </p>
              </div>
              <button onClick={() => setShowRoleInfoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{user?.roleName || user?.roleId}</div>
                  <div className="text-[10px] text-slate-400">
                    {isAdmin ? 'Unrestricted root administrator capabilities' : 'Role-based access policy enforced'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 font-bold text-[10px]">
                  {isAdmin ? 'ROOT ADMIN' : 'RBAC ACTIVE'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Granted System Capabilities ({user?.permissions?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto p-2 rounded-lg bg-slate-800/40 border border-slate-700">
                  {isAdmin ? (
                    <span className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold text-xs">
                      * All Capabilities Granted (Unrestricted Admin)
                    </span>
                  ) : user?.permissions && user.permissions.length > 0 ? (
                    user.permissions.map(p => (
                      <span key={p} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[10px]">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No administrative permissions assigned.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRoleInfoModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
