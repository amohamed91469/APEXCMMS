import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Search,
  History,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  XCircle,
  Tag
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { Equipment, Fault } from '../types/cmms.ts';
import { formatMinutes } from '../utils/timeCalculations.ts';

export const EquipmentView: React.FC = () => {
  const { nodes, equipmentTypes, getLevelName, hasPermission, showToast } = useCMMS();

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEqTypeId, setSelectedEqTypeId] = useState('');

  // Selected equipment history drawer
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [historyFaults, setHistoryFaults] = useState<Fault[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // New Equipment Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEqNumber, setNewEqNumber] = useState('');
  const [newEqTypeId, setNewEqTypeId] = useState('');
  const [newStructureNodeId, setNewStructureNodeId] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCriticality, setNewCriticality] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const level2Name = getLevelName(2);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await api.getEquipment({
        search,
        structureNodeId: selectedNodeId,
        equipmentTypeId: selectedEqTypeId
      });
      setEquipmentList(res.equipment);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch equipment', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [search, selectedNodeId, selectedEqTypeId]);

  const handleViewHistory = async (eq: Equipment) => {
    setSelectedEq(eq);
    try {
      const res = await api.getEquipmentHistory(eq.id);
      setHistoryFaults(res.history);
      setIsHistoryOpen(true);
    } catch (err: any) {
      showToast('Failed to load history: ' + err.message, 'error');
    }
  };

  const handleCreateEquipment = async () => {
    if (!newEqNumber.trim()) {
      showToast('Equipment number is required', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.createEquipment({
        equipmentNumber: newEqNumber.trim().toUpperCase(),
        equipmentTypeId: newEqTypeId || equipmentTypes[0]?.id,
        structureNodeId: newStructureNodeId || nodes[0]?.id,
        serialNumber: newSerialNumber.trim() || undefined,
        manufacturer: newManufacturer.trim() || undefined,
        model: newModel.trim() || undefined,
        criticality: newCriticality,
        status: 'operational',
        description: newDescription.trim() || undefined
      });
      showToast(`Registered equipment ${newEqNumber}`, 'success');
      setIsCreateOpen(false);
      setNewEqNumber('');
      fetchEquipment();
    } catch (err: any) {
      showToast(err.message || 'Failed to create equipment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-blue-400" />
            Equipment & Asset Register
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Physical assets mapped to generic organizational locations, lifetime maintenance records, and criticality
          </p>
        </div>

        {hasPermission('equipment:manage') && (
          <button
            onClick={() => {
              setNewEqTypeId(equipmentTypes[0]?.id || '');
              setNewStructureNodeId(nodes[0]?.id || '');
              setIsCreateOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Equipment</span>
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by equipment no, serial, model..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedNodeId}
          onChange={e => setSelectedNodeId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All {level2Name}s</option>
          {nodes.filter(n => n.structureLevelId === 'level_2' || n.parentNodeId).map(n => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>

        <select
          value={selectedEqTypeId}
          onChange={e => setSelectedEqTypeId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Equipment Types</option>
          {equipmentTypes.map(t => (
            <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
          ))}
        </select>
      </div>

      {/* Equipment Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                <th className="py-3 px-4">Equip. Number</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Location ({level2Name})</th>
                <th className="py-3 px-4">Manufacturer & Model</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Criticality</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">Loading equipment register...</td>
                </tr>
              ) : equipmentList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No equipment found matching criteria.</td>
                </tr>
              ) : (
                equipmentList.map(eq => {
                  const node = nodes.find(n => n.id === eq.structureNodeId);
                  const eqType = equipmentTypes.find(t => t.id === eq.equipmentTypeId);

                  return (
                    <tr key={eq.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-white">{eq.equipmentNumber}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60 text-[10px] font-bold">
                          {eqType?.code || eq.equipmentTypeId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{node?.name || eq.structureNodeId}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {eq.manufacturer ? `${eq.manufacturer} ${eq.model || ''}` : <span className="text-slate-500">-</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{eq.serialNumber || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            eq.criticality === 'Critical'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : eq.criticality === 'High'
                              ? 'bg-orange-950 text-orange-300 border border-orange-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {eq.criticality}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            eq.status === 'operational'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {eq.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleViewHistory(eq)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors border border-slate-700 inline-flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          <span>Fault Log</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Maintenance History Drawer/Modal */}
      {isHistoryOpen && selectedEq && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  Maintenance History: <span className="font-mono text-cyan-300">{selectedEq.equipmentNumber}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {equipmentTypes.find(t => t.id === selectedEq.equipmentTypeId)?.name} • Location: {nodes.find(n => n.id === selectedEq.structureNodeId)?.name}
                </p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {historyFaults.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No historical faults logged for this equipment.
                </div>
              ) : (
                historyFaults.map(f => (
                  <div key={f.id} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400">{f.callNumber || f.callId}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{f.reportDate} {f.reportTime}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-white text-[10px]">{f.status}</span>
                      </div>
                    </div>
                    <div className="font-medium text-slate-200">{f.faultDescription}</div>
                    {f.workDone && <div className="text-slate-400 text-[11px]">Work Done: {f.workDone}</div>}
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                      <span>Tech: {f.assignedTechnicianName || 'Unassigned'}</span>
                      <span>TTR: {formatMinutes(f.ttrMinutes)}</span>
                      <span>Downtime: {formatMinutes(f.downtimeMinutes)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Equipment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Register New Equipment
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Equipment Number *</label>
                <input
                  type="text"
                  value={newEqNumber}
                  onChange={e => setNewEqNumber(e.target.value)}
                  placeholder="e.g. TVM-04 or GATE-201"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Equipment Type</label>
                <select
                  value={newEqTypeId}
                  onChange={e => setNewEqTypeId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                >
                  {equipmentTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium">Location ({level2Name})</label>
                <select
                  value={newStructureNodeId}
                  onChange={e => setNewStructureNodeId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium">Manufacturer</label>
                  <input
                    type="text"
                    value={newManufacturer}
                    onChange={e => setNewManufacturer(e.target.value)}
                    placeholder="e.g. Thales"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium">Model</label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    placeholder="e.g. TransCity V3"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium">Serial Number</label>
                  <input
                    type="text"
                    value={newSerialNumber}
                    onChange={e => setNewSerialNumber(e.target.value)}
                    placeholder="SN-12345"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium">Criticality</label>
                  <select
                    value={newCriticality}
                    onChange={e => setNewCriticality(e.target.value as any)}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateEquipment}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-600/30"
              >
                {isSubmitting ? 'Registering...' : 'Register Equipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
