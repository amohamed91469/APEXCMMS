import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { AuditLog } from '../types/cmms.ts';
import { format24hDateTime } from '../utils/timeCalculations.ts';

export const AuditLogView: React.FC = () => {
  const { showToast } = useCMMS();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedModule, setSelectedModule] = useState('');
  const [searchAction, setSearchAction] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        module: selectedModule,
        action: searchAction,
        limit: 100
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch audit log', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule, searchAction]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-cyan-400" />
            Immutable System Audit Trail
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Append-only historical compliance log tracking security events, status transitions, imports, and configuration changes
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start"
          title="Refresh Log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1">
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Modules</option>
            <option value="Administration">Administration</option>
            <option value="FaultTracking">Fault Tracking</option>
            <option value="DataManagement">Data Management / Imports</option>
            <option value="Assets">Assets</option>
            <option value="Workforce">Workforce</option>
            <option value="MasterData">Master Data</option>
          </select>

          <input
            type="text"
            value={searchAction}
            onChange={e => setSearchAction(e.target.value)}
            placeholder="Filter by action (e.g. CREATE, TRANSITION, IMPORT)..."
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 flex-1 max-w-sm"
          />
        </div>

        <div className="text-slate-400 text-xs">
          Showing <span className="font-bold text-white">{logs.length}</span> of {total} records
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator / User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module / Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Change Log</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">No audit logs recorded for this criteria.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {format24hDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white">{log.userName || log.user}</span>
                      {log.userName && log.user && <div className="text-[10px] text-slate-500 font-mono">ID: {log.user}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="font-medium text-slate-200">{log.module}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.entity}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.entityId}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {log.oldValue || log.newValue ? (
                        <div className="space-y-0.5">
                          {log.oldValue && (
                            <div className="text-red-400 text-[10px] line-through truncate max-w-xs">
                              {log.oldValue}
                            </div>
                          )}
                          {log.newValue && (
                            <div className="text-emerald-400 text-[10px] truncate max-w-xs">
                              &rarr; {log.newValue}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.details}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
