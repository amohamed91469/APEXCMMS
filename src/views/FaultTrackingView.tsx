import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  ArrowUpDown,
  Download,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { Fault, FaultStatus, RelevantState, Priority, FaultStatusHistory } from '../types/cmms.ts';
import { formatMinutes } from '../utils/timeCalculations.ts';

interface FaultTrackingViewProps {
  onNavigate: (tab: string, meta?: any) => void;
}

export const FaultTrackingView: React.FC<FaultTrackingViewProps> = ({ onNavigate }) => {
  const { levels, nodes, equipmentTypes, technicians, getLevelName, hasPermission, user, showToast } = useCMMS();

  const [faults, setFaults] = useState<Fault[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEqTypeId, setSelectedEqTypeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRelevant, setSelectedRelevant] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const limit = 20;
  const [sortBy, setSortBy] = useState('reportDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail / Status Transition Modal
  const [activeFault, setActiveFault] = useState<Fault | null>(null);
  const [statusHistory, setStatusHistory] = useState<FaultStatusHistory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'transition'>('view');

  // Transition form state
  const [targetStatus, setTargetStatus] = useState<FaultStatus>('In Progress');
  const [waitingReason, setWaitingReason] = useState('Spare Part');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [workDoneInput, setWorkDoneInput] = useState('');
  const [correctiveActionInput, setCorrectiveActionInput] = useState('');
  const [mEndInput, setMEndInput] = useState('');

  const level1Name = getLevelName(1);
  const level2Name = getLevelName(2);

  const fetchFaults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getFaults({
        search,
        structureNodeId: selectedNodeId,
        equipmentTypeId: selectedEqTypeId,
        status: selectedStatus,
        relevantState: selectedRelevant,
        priority: selectedPriority,
        technicianId: selectedTechnicianId,
        startDate,
        endDate,
        limit,
        offset: (page - 1) * limit,
        sortBy,
        sortOrder
      });
      setFaults(res.faults);
      setTotal(res.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch faults', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    search, selectedNodeId, selectedEqTypeId, selectedStatus, selectedRelevant,
    selectedPriority, selectedTechnicianId, startDate, endDate, page, sortBy, sortOrder, showToast
  ]);

  useEffect(() => {
    fetchFaults();
  }, [fetchFaults]);

  const handleOpenDetail = async (fault: Fault, mode: 'view' | 'edit' | 'transition') => {
    setActiveFault(fault);
    setModalMode(mode);
    setTargetStatus(fault.status);
    setWorkDoneInput(fault.workDone || '');
    setCorrectiveActionInput(fault.correctiveAction || '');
    setMEndInput(fault.maintenanceEnd || '');
    setTransitionNotes('');

    try {
      const res = await api.getFaultById(fault.id);
      setStatusHistory(res.history);
      setIsModalOpen(true);
    } catch (err: any) {
      showToast('Failed to load fault details: ' + err.message, 'error');
    }
  };

  const handleStatusTransitionSubmit = async () => {
    if (!activeFault) return;
    try {
      const payload: any = {
        status: targetStatus,
        notes: transitionNotes,
        waitingReason: targetStatus === 'Waiting' ? waitingReason : undefined,
        workDone: workDoneInput,
        correctiveAction: correctiveActionInput,
        maintenanceEnd: mEndInput
      };

      const res = await api.updateFaultStatus(activeFault.id, payload);
      showToast(`Fault status updated to ${targetStatus}`, 'success');
      setActiveFault(res.fault);
      setStatusHistory(res.history);
      setIsModalOpen(false);
      fetchFaults();
    } catch (err: any) {
      showToast(err.message || 'Status transition failed', 'error');
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedNodeId('');
    setSelectedEqTypeId('');
    setSelectedStatus('');
    setSelectedRelevant('');
    setSelectedPriority('');
    setSelectedTechnicianId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getStatusBadge = (status: FaultStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'Assigned':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      case 'In Progress':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'Waiting':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'Resolved':
        return 'bg-teal-950/80 text-teal-300 border-teal-800';
      case 'Closed':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'Reopened':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'Emergency':
        return 'text-rose-400 font-bold';
      case 'High':
        return 'text-orange-400 font-semibold';
      case 'Medium':
        return 'text-amber-300';
      case 'Low':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Fault Tracking & Maintenance Log
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Lifecycle fault management, technician dispatch, TTR/downtime calculations, and work verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (selectedNodeId) params.append('structureNodeId', selectedNodeId);
              if (selectedEqTypeId) params.append('equipmentTypeId', selectedEqTypeId);
              if (selectedStatus) params.append('status', selectedStatus);
              if (selectedRelevant) params.append('relevantState', selectedRelevant);
              if (startDate) params.append('startDate', startDate);
              if (endDate) params.append('endDate', endDate);
              window.open(`/api/data/export/faults?${params.toString()}`, '_blank');
            }}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Filtered ({total})</span>
          </button>

          {hasPermission('faults:create') && (
            <button
              onClick={() => onNavigate('new_fault')}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log New Fault</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by Call ID, Call No, description, equipment, technician, or work done..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleClearFilters}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
          >
            Clear Filters
          </button>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Location / Structure Node */}
          <select
            value={selectedNodeId}
            onChange={e => { setSelectedNodeId(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Filter {level2Name}</option>
            {nodes.filter(n => n.structureLevelId === 'level_2' || n.parentNodeId).map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>

          {/* Equipment Type */}
          <select
            value={selectedEqTypeId}
            onChange={e => { setSelectedEqTypeId(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Equipment Type</option>
            {equipmentTypes.map(t => (
              <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>

          {/* Relevant State */}
          <select
            value={selectedRelevant}
            onChange={e => { setSelectedRelevant(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Relevance</option>
            <option value="Relevant">Relevant</option>
            <option value="Non-Relevant">Non-Relevant</option>
            <option value="Under Review">Under Review</option>
          </select>

          {/* Technician */}
          <select
            value={selectedTechnicianId}
            onChange={e => { setSelectedTechnicianId(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Assigned Tech</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={selectedPriority}
            onChange={e => { setSelectedPriority(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Faults Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Call ID / No.</th>
                <th className="py-3 px-4">Report Date & Time</th>
                <th className="py-3 px-4">{level2Name}</th>
                <th className="py-3 px-4">Equip. Type / No.</th>
                <th className="py-3 px-4">Fault Description</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">TTR</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4">Relevance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Loading maintenance records from database...
                  </td>
                </tr>
              ) : faults.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No faults match current query. Adjust your search or filters.
                  </td>
                </tr>
              ) : (
                faults.map(f => {
                  const node = nodes.find(n => n.id === f.structureNodeId);
                  const eqType = equipmentTypes.find(t => t.id === f.equipmentTypeId);

                  return (
                    <tr key={f.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusBadge(f.status)}`}>
                          {f.status}
                        </span>
                      </td>

                      {/* Call ID / Call Number */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-200">
                        <div>{f.callNumber || f.callId}</div>
                        {f.callNumber && f.callId && f.callNumber !== f.callId && (
                          <div className="text-[10px] text-slate-500">ID: {f.callId}</div>
                        )}
                      </td>

                      {/* Report Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        <div>{f.reportDate}</div>
                        <div className="text-[10px] text-slate-500">{f.reportTime || '00:00'}</div>
                      </td>

                      {/* Structure Node */}
                      <td className="py-3 px-4 text-slate-300">
                        <span className="font-medium text-white">{node?.name || f.structureNodeId}</span>
                        {node?.code && <div className="text-[10px] text-slate-500 font-mono">[{node.code}]</div>}
                      </td>

                      {/* Equipment */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                            {eqType?.code || f.equipmentTypeId}
                          </span>
                          <span className="font-medium text-slate-200">{f.equipmentNumber}</span>
                        </div>
                      </td>

                      {/* Fault Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-200 truncate" title={f.faultDescription}>
                          {f.faultDescription}
                        </div>
                        {f.workDone && (
                          <div className="text-[10px] text-slate-400 truncate" title={f.workDone}>
                            Work: {f.workDone}
                          </div>
                        )}
                      </td>

                      {/* Technician */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {f.assignedTechnicianName ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{f.assignedTechnicianName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      {/* TTR */}
                      <td className="py-3 px-4 font-mono text-cyan-300 font-semibold whitespace-nowrap">
                        {formatMinutes(f.ttrMinutes)}
                      </td>

                      {/* Downtime */}
                      <td className="py-3 px-4 font-mono text-rose-300 font-semibold whitespace-nowrap">
                        {formatMinutes(f.downtimeMinutes)}
                      </td>

                      {/* Relevant State */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            f.relevantState === 'Relevant'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : f.relevantState === 'Non-Relevant'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {f.relevantState}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(f, 'view')}
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                            title="View Lifecycle Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {hasPermission('faults:edit') && (
                            <button
                              onClick={() => handleOpenDetail(f, 'transition')}
                              className="px-2 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors border border-slate-700"
                              title="Transition status or record maintenance work"
                            >
                              Action
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{faults.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-white">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-white">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Fault Detail & Status Transition Modal */}
      {isModalOpen && activeFault && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusBadge(activeFault.status)}`}>
                    {activeFault.status}
                  </span>
                  <span className="text-base font-bold text-white font-mono">
                    {activeFault.callNumber || activeFault.callId}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Reported on {activeFault.reportDate} at {activeFault.reportTime} • Priority: <span className={getPriorityBadge(activeFault.priority)}>{activeFault.priority}</span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Equipment & Location Context */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Location ({level2Name})</span>
                  <span className="font-semibold text-white">
                    {nodes.find(n => n.id === activeFault.structureNodeId)?.name || activeFault.structureNodeId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Equipment Type</span>
                  <span className="font-semibold text-cyan-400">
                    {equipmentTypes.find(t => t.id === activeFault.equipmentTypeId)?.code || activeFault.equipmentTypeId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Equipment Number</span>
                  <span className="font-semibold text-white">{activeFault.equipmentNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Relevance State</span>
                  <span className="font-semibold text-blue-300">{activeFault.relevantState}</span>
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reported Problem Description</label>
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200">
                  {activeFault.faultDescription}
                </div>
              </div>

              {/* Maintenance Work & Calculations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maintenance Start</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={activeFault.maintenanceStart || ''}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maintenance End</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={mEndInput}
                    onChange={e => setMEndInput(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:mm or HH:mm"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Calculated TTR</span>
                  <div className="text-xl font-bold text-cyan-400">{formatMinutes(activeFault.ttrMinutes)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Calculated Downtime</span>
                  <div className="text-xl font-bold text-rose-400">{formatMinutes(activeFault.downtimeMinutes)}</div>
                </div>
              </div>

              {/* Work Done & Corrective Action */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Work Done / Interventions</label>
                  <textarea
                    rows={2}
                    disabled={modalMode === 'view'}
                    value={workDoneInput}
                    onChange={e => setWorkDoneInput(e.target.value)}
                    placeholder="Describe maintenance actions performed by technicians..."
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-cyan-500 disabled:opacity-70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Corrective Action / Resolution</label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={correctiveActionInput}
                    onChange={e => setCorrectiveActionInput(e.target.value)}
                    placeholder="e.g. Replaced transport belt, cleaned optical sensor"
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-cyan-500 disabled:opacity-70"
                  />
                </div>
              </div>

              {/* Status Transition Panel */}
              {modalMode === 'transition' && (
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/60 space-y-3">
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Workflow Status Transition
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300 font-medium">New Status</label>
                      <select
                        value={targetStatus}
                        onChange={e => setTargetStatus(e.target.value as FaultStatus)}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-cyan-500"
                      >
                        <option value="New">New</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting">Waiting (Pending Reason)</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                        <option value="Reopened">Reopened</option>
                      </select>
                    </div>

                    {targetStatus === 'Waiting' && (
                      <div>
                        <label className="text-[11px] text-slate-300 font-medium">Waiting Reason</label>
                        <select
                          value={waitingReason}
                          onChange={e => setWaitingReason(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-cyan-500"
                        >
                          <option value="Spare Part">Spare Part Unavailable</option>
                          <option value="Access">Track/Facility Access Restricted</option>
                          <option value="Operations">Operations Suspension Required</option>
                          <option value="Contractor">Specialist Contractor Dispatched</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 font-medium">Transition Notes / Audit Reason</label>
                    <input
                      type="text"
                      value={transitionNotes}
                      onChange={e => setTransitionNotes(e.target.value)}
                      placeholder="Reason for status change..."
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Status History Audit Trail */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Lifecycle Status Transition Audit Trail
                </div>
                <div className="space-y-2">
                  {statusHistory.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No transition history logged.</div>
                  ) : (
                    statusHistory.map(h => (
                      <div key={h.id} className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">
                            {h.previousStatus} &rarr; <span className="text-cyan-400">{h.newStatus}</span>
                            {h.waitingReason && <span className="text-amber-400 text-[11px]"> ({h.waitingReason})</span>}
                          </div>
                          {h.notes && <div className="text-[11px] text-slate-400">{h.notes}</div>}
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                          <div>{new Date(h.changedAt).toLocaleString()}</div>
                          <div>By: {h.changedByName || h.changedBy}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
              >
                Close
              </button>

              {modalMode === 'transition' && (
                <button
                  type="button"
                  onClick={handleStatusTransitionSubmit}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Commit Status Change</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
