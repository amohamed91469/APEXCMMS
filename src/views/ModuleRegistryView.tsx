import React from 'react';
import {
  Layers,
  AlertTriangle,
  Cpu,
  Calendar,
  Package,
  Clock,
  CheckCircle2,
  Lock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { ModuleDefinition } from '../types/cmms.ts';

export const ModuleRegistryView: React.FC = () => {
  const { modules, refreshMasterData, showToast, user } = useCMMS();
  const isAdmin = user?.roleId === 'role_admin';

  const handleToggle = async (mod: ModuleDefinition) => {
    if (mod.isCore) {
      showToast('Core modules cannot be disabled', 'warning');
      return;
    }
    try {
      await api.toggleModule(mod.id, !mod.enabled);
      showToast(`${mod.name} is now ${!mod.enabled ? 'Enabled' : 'Disabled'}`, 'info');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle module', 'error');
    }
  };

  const getModuleIcon = (id: string) => {
    switch (id) {
      case 'mod_fault_tracking': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'mod_assets': return <Cpu className="w-5 h-5 text-blue-400" />;
      case 'mod_preventive_maintenance': return <Calendar className="w-5 h-5 text-cyan-400" />;
      case 'mod_warehouse': return <Package className="w-5 h-5 text-emerald-400" />;
      case 'mod_workforce': return <Clock className="w-5 h-5 text-purple-400" />;
      default: return <Layers className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Layers className="w-6 h-6 text-sky-400" />
          Modular Architecture & Extension Registry
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Independent module management architecture allowing preventive maintenance, warehouse inventory, and workforce tracking to be added without redesigning core CMMS services.
        </p>
      </div>

      {/* Architecture Concept Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
        <div className="font-semibold text-white">Separation of Concerns:</div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          The CMMS Core (Security, Generic Organization Structure, and Audit Logging) operates independently from Maintenance Modules. Fault Tracking is deployed as the primary initial operational module, with the normalized data model ready for future PM routines, spare part consumption tracking, and shift management.
        </p>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map(mod => (
          <div
            key={mod.id}
            className={`p-5 rounded-2xl border transition-all ${
              mod.enabled
                ? 'bg-slate-900/90 border-slate-700/80 shadow-lg'
                : 'bg-slate-900/40 border-slate-800/60 opacity-80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  {getModuleIcon(mod.id)}
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{mod.name}</span>
                    {mod.isCore && (
                      <span className="text-[9px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Core
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">v{mod.version} • {mod.category}</div>
                </div>
              </div>

              {/* Status & Toggle */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    mod.enabled
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {mod.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {isAdmin && !mod.isCore && (
                  <button
                    onClick={() => handleToggle(mod)}
                    className="text-xs text-cyan-400 hover:underline font-medium"
                  >
                    {mod.enabled ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {mod.description}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>RBAC Controlled</span>
              </div>
              <span className="font-mono text-slate-500">{mod.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
