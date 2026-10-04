import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Cpu,
  MapPin
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { generatePDFReport } from '../utils/pdfGenerator.ts';

export const ReportsView: React.FC = () => {
  const { nodes, equipmentTypes, settings, user, getLevelName, showToast } = useCMMS();

  const [reportType, setReportType] = useState<'monthly' | 'equipment' | 'structure' | 'history'>('monthly');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEqTypeId, setSelectedEqTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const level2Name = getLevelName(2);

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      showToast('Fetching dataset and compiling vector PDF report...', 'info');

      const params: Record<string, string> = { limit: '1000' };
      if (selectedNodeId) params.structureNodeId = selectedNodeId;
      if (selectedEqTypeId) params.equipmentTypeId = selectedEqTypeId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [faultsRes, analyticsRes] = await Promise.all([
        api.getFaults(params),
        api.getDashboardAnalytics(params)
      ]);

      if (!settings) {
        throw new Error('System settings not loaded');
      }

      const reportTitles = {
        monthly: 'Monthly Fault & Maintenance Performance Report',
        equipment: 'Equipment Failure History Report',
        structure: `${level2Name} Maintenance Summary Report`,
        history: 'Master Fault Tracking Audit Report'
      };

      const dateStr = startDate && endDate ? `${startDate} to ${endDate}` : (startDate ? `From ${startDate}` : 'Complete History');

      generatePDFReport({
        title: reportTitles[reportType],
        reportType,
        dateRangeStr: dateStr,
        generatedBy: user?.fullName || 'Authorized Maintenance Specialist',
        settings,
        faults: faultsRes.faults,
        nodes,
        equipmentTypes,
        kpis: analyticsRes.kpis,
        filterSummary: selectedNodeId ? `Location: ${nodes.find(n => n.id === selectedNodeId)?.name}` : 'All Locations'
      });

      showToast('PDF report generated and downloaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (selectedNodeId) params.append('structureNodeId', selectedNodeId);
    if (selectedEqTypeId) params.append('equipmentTypeId', selectedEqTypeId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const link = document.createElement('a');
    link.href = `/api/data/export/faults?${params.toString()}`;
    link.setAttribute('download', `Fault_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-indigo-400" />
          Maintenance Reports & Exports
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Executive KPI reports, recurring failure analysis, equipment history dossiers, and filtered spreadsheets
        </p>
      </div>

      {/* Report Configuration Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
        {/* Report Type Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Report Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'monthly',
                title: 'Monthly Maintenance Report',
                desc: 'Executive KPIs, TTR/Downtime averages, structure breakdown, and top recurring defects'
              },
              {
                id: 'equipment',
                title: 'Equipment History Dossier',
                desc: 'Chronological maintenance history, intervention logs, and component wear profile'
              },
              {
                id: 'structure',
                title: `${level2Name} Infrastructure Report`,
                desc: `Failure count, outage duration, and active faults grouped by ${level2Name}`
              },
              {
                id: 'history',
                title: 'Complete Fault Log Export',
                desc: 'Detailed tabular audit log of all maintenance calls matching filter criteria'
              }
            ].map(r => (
              <div
                key={r.id}
                onClick={() => setReportType(r.id as any)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  reportType === r.id
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-900/20'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white">{r.title}</div>
                  <input
                    type="radio"
                    name="reportTypeRadio"
                    checked={reportType === r.id}
                    onChange={() => setReportType(r.id as any)}
                    className="text-cyan-600 focus:ring-cyan-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Parameters */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Scope & Date Range (Optional Filter)
            </label>
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setStartDate(today);
                  setEndDate(today);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setStartDate(start);
                  setEndDate(end);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const past = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                  setStartDate(past);
                  setEndDate(now.toISOString().slice(0, 10));
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Last 30 Days
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-red-900/50 text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Filter {level2Name}</label>
              <select
                value={selectedNodeId}
                onChange={e => setSelectedNodeId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All {level2Name}s</option>
                {nodes.filter(n => n.structureLevelId === 'level_2' || n.parentNodeId).map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium">Equipment Type</label>
              <select
                value={selectedEqTypeId}
                onChange={e => setSelectedEqTypeId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Equipment Types</option>
                {equipmentTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Generate Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handleExportExcel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export to Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>{isGenerating ? 'Compiling PDF...' : 'Download Vector PDF Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
