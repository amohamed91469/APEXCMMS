import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  TrendingUp,
  Cpu,
  MapPin,
  Users,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { formatMinutes } from '../utils/timeCalculations.ts';
import { generatePDFReport } from '../utils/pdfGenerator.ts';

interface DashboardViewProps {
  onNavigate: (tab: string, meta?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { levels, nodes, equipmentTypes, getLevelName, settings, user, showToast } = useCMMS();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedEqTypeId, setSelectedEqTypeId] = useState<string>('');
  const [selectedRelevant, setSelectedRelevant] = useState<string>('');

  const level1Name = getLevelName(1);
  const level2Name = getLevelName(2);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const params: Record<string, string> = {};
      if (selectedNodeId) params.structureNodeId = selectedNodeId;
      if (selectedEqTypeId) params.equipmentTypeId = selectedEqTypeId;
      if (selectedRelevant) params.relevantState = selectedRelevant;

      if (dateRangePreset === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        params.startDate = today;
        params.endDate = today;
      } else if (dateRangePreset === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString().slice(0, 10);
      } else if (dateRangePreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.startDate = d.toISOString().slice(0, 10);
      }

      const res = await api.getDashboardAnalytics(params);
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedNodeId, selectedEqTypeId, selectedRelevant, dateRangePreset, showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleExportPDF = async () => {
    try {
      showToast('Compiling Monthly Maintenance PDF Report...', 'info');
      // Fetch full faults list for report
      const res = await api.getFaults({ limit: 1000 });
      if (!settings) return;

      generatePDFReport({
        title: 'Monthly Maintenance & Fault Operations Report',
        reportType: 'monthly',
        generatedBy: user?.fullName || 'Operator',
        settings,
        faults: res.faults,
        nodes,
        equipmentTypes,
        kpis: data?.kpis,
        filterSummary: selectedNodeId ? `Location: ${nodes.find(n => n.id === selectedNodeId)?.name}` : 'All Locations'
      });
      showToast('PDF Report downloaded successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to generate PDF: ' + err.message, 'error');
    }
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (selectedNodeId) params.append('structureNodeId', selectedNodeId);
    if (selectedEqTypeId) params.append('equipmentTypeId', selectedEqTypeId);
    if (selectedRelevant) params.append('relevantState', selectedRelevant);

    const link = document.createElement('a');
    link.href = `/api/data/export/faults?${params.toString()}`;
    link.setAttribute('download', `Fault_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = data?.kpis || {
    total: 0,
    open: 0,
    resolved: 0,
    closed: 0,
    relevant: 0,
    nonRelevant: 0,
    avgTTR: 0,
    avgDowntime: 0,
    totalDowntime: 0
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Operational Maintenance Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Real-time equipment fault tracking, TTR, downtime analysis, and failure distribution
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate PDF Report</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Presets */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDateRangePreset(p.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  dateRangePreset === p.id ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Dynamic Structure Filter (Level 2 e.g. Station or Location) */}
          <select
            value={selectedNodeId}
            onChange={e => setSelectedNodeId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All {level2Name}s</option>
            {nodes.filter(n => n.structureLevelId === 'level_2' || n.parentNodeId).map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>

          {/* Equipment Type Filter */}
          <select
            value={selectedEqTypeId}
            onChange={e => setSelectedEqTypeId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Equipment Types</option>
            {equipmentTypes.map(t => (
              <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
            ))}
          </select>

          {/* Relevant State Filter */}
          <select
            value={selectedRelevant}
            onChange={e => setSelectedRelevant(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Relevance States</option>
            <option value="Relevant">Relevant Only</option>
            <option value="Non-Relevant">Non-Relevant</option>
            <option value="Under Review">Under Review</option>
          </select>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Faults */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Faults</div>
          <div className="text-2xl font-bold text-white">{kpis.total}</div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Lifetime tracked</span>
          </div>
        </div>

        {/* Active Open Faults */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Open / Pending</div>
          <div className="text-2xl font-bold text-amber-300">{kpis.open}</div>
          <div className="text-[10px] text-amber-500/80">Requires maintenance</div>
        </div>

        {/* Resolved / Closed */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Resolved / Closed</div>
          <div className="text-2xl font-bold text-emerald-300">{kpis.resolved + kpis.closed}</div>
          <div className="text-[10px] text-emerald-500/80">
            {kpis.total > 0 ? Math.round(((kpis.resolved + kpis.closed) / kpis.total) * 100) : 0}% success rate
          </div>
        </div>

        {/* Relevant Faults */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">Relevant Faults</div>
          <div className="text-2xl font-bold text-blue-300">{kpis.relevant}</div>
          <div className="text-[10px] text-blue-400/80">Affects service KPI</div>
        </div>

        {/* Average TTR */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">Average TTR</div>
          <div className="text-2xl font-bold text-cyan-300">{formatMinutes(kpis.avgTTR)}</div>
          <div className="text-[10px] text-cyan-500/80">Mean time to repair</div>
        </div>

        {/* Total Downtime */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Total Downtime</div>
          <div className="text-2xl font-bold text-rose-300">{formatMinutes(kpis.totalDowntime)}</div>
          <div className="text-[10px] text-rose-500/80">Avg: {formatMinutes(kpis.avgDowntime)} / fault</div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Bar Chart */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Daily Fault Frequency & Relevance Trend</h2>
            </div>
            <span className="text-[10px] text-slate-400">Historical records</span>
          </div>

          <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-800 overflow-x-auto">
            {data?.trend && data.trend.length > 0 ? (
              data.trend.map((t: any, idx: number) => {
                const maxTotal = Math.max(...data.trend.map((x: any) => x.total), 1);
                const heightPct = Math.max(12, Math.round((t.total / maxTotal) * 100));
                return (
                  <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg z-10 pointer-events-none whitespace-nowrap">
                      <span>{t.date}</span>
                      <span className="text-cyan-300 font-bold">{t.total} Faults ({t.relevant} Relevant)</span>
                      <span className="text-rose-300">{formatMinutes(t.downtime)} downtime</span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-bold">{t.total}</div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t bg-gradient-to-t from-cyan-700 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-400 transition-all"
                    />
                    <div className="text-[9px] text-slate-500 truncate w-full text-center">{t.date.slice(5)}</div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                No fault history recorded for current filter criteria.
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-cyan-600 inline-block" /> Total Logged</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-400 inline-block" /> Relevant</span>
            </div>
            <span>Auto-aggregated</span>
          </div>
        </div>

        {/* Faults by Equipment Type */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Fault Distribution by Equipment Type</h2>
            </div>
            <span className="text-[10px] text-slate-400">Normalized categories</span>
          </div>

          <div className="space-y-3 my-auto">
            {data?.byEquipmentType && data.byEquipmentType.length > 0 ? (
              data.byEquipmentType.map((eq: any, idx: number) => {
                const totalF = kpis.total || 1;
                const pct = Math.round((eq.count / totalF) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                          {eq.code}
                        </span>
                        <span className="text-slate-300 truncate max-w-[200px]">{eq.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <span className="text-white font-semibold">{eq.count} faults</span>
                        <span className="text-slate-500 font-mono">({pct}%)</span>
                        <span className="text-rose-400 text-[11px]">{formatMinutes(eq.totalDowntime)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                No equipment type failure data available.
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Unified Equipment Model</span>
            <button onClick={() => onNavigate('faults')} className="text-cyan-400 hover:underline">View in fault log &rarr;</button>
          </div>
        </div>
      </div>

      {/* Second Row: Structure Breakdown & Recurring Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Organizational Structure (e.g. Station or Location) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Failures by Organizational {level2Name}</h2>
            </div>
            <span className="text-[10px] text-slate-400">Configured Node Mapping</span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {data?.byStructureNode && data.byStructureNode.length > 0 ? (
              data.byStructureNode.map((node: any, idx: number) => {
                const totalF = kpis.total || 1;
                const pct = Math.round((node.count / totalF) * 100);
                return (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-200">{node.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Code: {node.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{node.count} faults ({pct}%)</div>
                      <div className="text-[10px] text-rose-400">{formatMinutes(node.downtime)} downtime</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                No location records mapped yet.
              </div>
            )}
          </div>
        </div>

        {/* Top Recurring Failures Table */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Top Recurring Failure Causes (Pareto Analysis)</h2>
            </div>
            <span className="text-[10px] text-slate-400">Root Cause Priority</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data?.recurringFailures && data.recurringFailures.length > 0 ? (
              data.recurringFailures.map((rf: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-3">
                    <div className="font-medium text-slate-200 truncate">{rf.description}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span className="text-cyan-400 font-mono">{rf.equipmentType}</span>
                      <span>•</span>
                      <span>Downtime: {formatMinutes(rf.totalDowntime)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 px-2 py-1 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 font-bold text-xs">
                    {rf.count} times
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                No recurring fault patterns detected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
