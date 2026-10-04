import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Save,
  ArrowLeft,
  Calendar,
  Clock,
  Cpu,
  UserCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { FaultStatus, RelevantState, Priority } from '../types/cmms.ts';
import {
  calculateTTR,
  calculateDowntime,
  formatMinutes,
  format24hTime,
  getCurrent24hTime,
  getTodayDate,
  offset24hTime
} from '../utils/timeCalculations.ts';

interface NewFaultViewProps {
  onNavigate: (tab: string, meta?: any) => void;
}

export const NewFaultView: React.FC<NewFaultViewProps> = ({ onNavigate }) => {
  const { levels, nodes, equipmentTypes, technicians, categories, getLevelName, showToast } = useCMMS();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Form State
  const [callId, setCallId] = useState(`CALL-${Math.floor(10000 + Math.random() * 90000)}`);
  const [callNumber, setCallNumber] = useState(`C-${Math.floor(10000 + Math.random() * 90000)}`);
  const [reportDate, setReportDate] = useState(todayStr);
  const [reportTime, setReportTime] = useState(timeStr);

  const [selectedParentNodeId, setSelectedParentNodeId] = useState('');
  const [selectedStructureNodeId, setSelectedStructureNodeId] = useState('');

  const [selectedEquipmentTypeId, setSelectedEquipmentTypeId] = useState('');
  const [equipmentNumber, setEquipmentNumber] = useState('');
  const [faultCategoryId, setFaultCategoryId] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [relevantState, setRelevantState] = useState<RelevantState>('Relevant');
  const [priority, setPriority] = useState<Priority>('High');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');

  const [status, setStatus] = useState<FaultStatus>('New');
  const [maintenanceStart, setMaintenanceStart] = useState('');
  const [maintenanceEnd, setMaintenanceEnd] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const level1Name = getLevelName(1);
  const level2Name = getLevelName(2);

  // Filter child nodes by parent level 1 selection
  const parentNodes = nodes.filter(n => n.structureLevelId === 'level_1' || !n.parentNodeId);
  const childNodes = selectedParentNodeId
    ? nodes.filter(n => n.parentNodeId === selectedParentNodeId)
    : nodes.filter(n => n.structureLevelId === 'level_2');

  // Set default node if available
  useEffect(() => {
    if (childNodes.length > 0 && !selectedStructureNodeId) {
      setSelectedStructureNodeId(childNodes[0].id);
    }
  }, [childNodes, selectedStructureNodeId]);

  // Set default equipment type if available
  useEffect(() => {
    if (equipmentTypes.length > 0 && !selectedEquipmentTypeId) {
      setSelectedEquipmentTypeId(equipmentTypes[0].id);
    }
  }, [equipmentTypes, selectedEquipmentTypeId]);

  // Real-time calculations
  const previewTTR = calculateTTR(maintenanceStart, maintenanceEnd, reportDate);
  const previewDowntime = calculateDowntime({
    reportDate,
    reportTime,
    maintenanceStart,
    maintenanceEnd,
    restorationDate: maintenanceEnd
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDate || !faultDescription.trim()) {
      showToast('Report date and fault description are required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const cat = categories.find(c => c.id === faultCategoryId);
      const tech = technicians.find(t => t.id === assignedTechnicianId);

      const payload = {
        callId: callId.trim(),
        callNumber: callNumber.trim() || callId.trim(),
        reportDate,
        reportTime,
        structureNodeId: selectedStructureNodeId || (nodes[0]?.id || 'unassigned'),
        equipmentTypeId: selectedEquipmentTypeId || (equipmentTypes[0]?.id || 'default'),
        equipmentNumber: equipmentNumber.trim() || 'EQUIP-01',
        faultCategoryId: faultCategoryId || null,
        faultCategoryName: cat?.name,
        faultDescription: faultDescription.trim(),
        relevantState,
        priority,
        assignedTechnicianId: assignedTechnicianId || null,
        assignedTechnicianName: tech?.name,
        status,
        maintenanceStart: maintenanceStart || null,
        maintenanceEnd: maintenanceEnd || null,
        restorationDate: maintenanceEnd || null,
        workDone: workDone.trim() || undefined,
        correctiveAction: correctiveAction.trim() || undefined,
        notes: notes.trim() || undefined
      };

      await api.createFault(payload);
      showToast('Fault recorded successfully!', 'success');
      onNavigate('faults');
    } catch (err: any) {
      showToast(err.message || 'Failed to record fault', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('faults')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Record Equipment Fault
            </h1>
            <p className="text-xs text-slate-400">
              Log new corrective maintenance call with automatic TTR & downtime computation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving Fault...' : 'Save & Log Fault'}</span>
        </button>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identification & Timing */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              1. Call Identification & Timing
            </h2>
            <span className="text-[10px] text-slate-400">Mandatory</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Call ID *</label>
              <input
                type="text"
                value={callId}
                onChange={e => setCallId(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Call Number</label>
              <input
                type="text"
                value={callNumber}
                onChange={e => setCallNumber(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">Report Date *</label>
                <button
                  type="button"
                  onClick={() => setReportDate(getTodayDate())}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
                >
                  Today
                </button>
              </div>
              <input
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">Report Time (24h) *</label>
                <button
                  type="button"
                  onClick={() => setReportTime(getCurrent24hTime())}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
                >
                  Now
                </button>
              </div>
              <input
                type="time"
                value={reportTime}
                onChange={e => setReportTime(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Organizational Location & Equipment */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              2. Hierarchy & Equipment Classification
            </h2>
            <span className="text-[10px] text-cyan-400 font-mono">Dynamic Hierarchy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Level 1 Filter (e.g. Line / City) */}
            {parentNodes.length > 0 && (
              <div>
                <label className="text-slate-300 font-medium">{level1Name}</label>
                <select
                  value={selectedParentNodeId}
                  onChange={e => setSelectedParentNodeId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Select {level1Name}</option>
                  {parentNodes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Level 2 (e.g. Station / Location) */}
            <div>
              <label className="text-slate-300 font-medium">{level2Name} *</label>
              <select
                value={selectedStructureNodeId}
                onChange={e => setSelectedStructureNodeId(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                {childNodes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            {/* Equipment Type */}
            <div>
              <label className="text-slate-300 font-medium">Equipment Type *</label>
              <select
                value={selectedEquipmentTypeId}
                onChange={e => setSelectedEquipmentTypeId(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                {equipmentTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                ))}
              </select>
            </div>

            {/* Equipment Number */}
            <div>
              <label className="text-slate-300 font-medium">Equipment Number *</label>
              <input
                type="text"
                value={equipmentNumber}
                onChange={e => setEquipmentNumber(e.target.value)}
                placeholder="e.g. TVM-01, GATE-102"
                required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Fault Details & Priority */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              3. Fault Details & Operational Priority
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Fault Category</label>
              <select
                value={faultCategoryId}
                onChange={e => setFaultCategoryId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">General / Uncategorized</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium">Relevant State *</label>
              <select
                value={relevantState}
                onChange={e => setRelevantState(e.target.value as RelevantState)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Relevant">Relevant (Service Affecting)</option>
                <option value="Non-Relevant">Non-Relevant (Internal/Routine)</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium">Priority *</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Emergency">Emergency (Critical Line Outage)</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low / Deferred</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-slate-300 font-medium">Fault Description *</label>
              <textarea
                rows={3}
                value={faultDescription}
                onChange={e => setFaultDescription(e.target.value)}
                required
                placeholder="Detailed description of the observed defect or malfunction..."
                className="mt-1 w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Maintenance Work & Time Calculations */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              4. Maintenance Action & Real-time Calculations
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Assigned Technician</label>
              <select
                value={assignedTechnicianId}
                onChange={e => setAssignedTechnicianId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium">Initial Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as FaultStatus)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="New">New</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">Maintenance Start (24h)</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setMaintenanceStart(getCurrent24hTime())}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono"
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaintenanceStart(reportTime)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                  >
                    Report Time
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={maintenanceStart}
                onChange={e => setMaintenanceStart(e.target.value)}
                placeholder="HH:mm or YYYY-MM-DD HH:mm (24h)"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">Maintenance End (24h)</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setMaintenanceEnd(getCurrent24hTime())}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono"
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = maintenanceStart || reportTime || getCurrent24hTime();
                      setMaintenanceEnd(offset24hTime(base, 30));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono"
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = maintenanceStart || reportTime || getCurrent24hTime();
                      setMaintenanceEnd(offset24hTime(base, 60));
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono"
                  >
                    +1h
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={maintenanceEnd}
                onChange={e => setMaintenanceEnd(e.target.value)}
                placeholder="HH:mm or YYYY-MM-DD HH:mm (24h)"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-300 font-medium">Work Done</label>
              <input
                type="text"
                value={workDone}
                onChange={e => setWorkDone(e.target.value)}
                placeholder="Brief summary of actions taken..."
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-slate-300 font-medium">Corrective Action</label>
              <input
                type="text"
                value={correctiveAction}
                onChange={e => setCorrectiveAction(e.target.value)}
                placeholder="Permanent resolution or component replacement details..."
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Real-time TTR / Downtime Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Real-time TTR:</span>
                <div className="text-lg font-bold text-cyan-400 font-mono">{formatMinutes(previewTTR)}</div>
              </div>
              <div className="border-l border-slate-700 pl-6">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Real-time Downtime:</span>
                <div className="text-lg font-bold text-rose-400 font-mono">{formatMinutes(previewDowntime)}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 italic">
              Supports overnight midnight-crossing calculation
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('faults')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Committing...' : 'Commit Fault to Database'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
