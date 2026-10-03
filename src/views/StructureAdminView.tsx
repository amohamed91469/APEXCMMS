import React, { useState } from 'react';
import {
  GitBranch,
  Save,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
  Info
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { StructureLevel, StructureNode } from '../types/cmms.ts';

export const StructureAdminView: React.FC = () => {
  const { levels, nodes, refreshMasterData, showToast, getLevelName } = useCMMS();

  // Active level tab
  const [activeLevelId, setActiveLevelId] = useState<string>(levels[0]?.id || 'level_1');

  // Level renaming form state
  const currentLevel = levels.find(l => l.id === activeLevelId) || levels[0];
  const [levelName, setLevelName] = useState(currentLevel?.name || '');
  const [levelPlural, setLevelPlural] = useState(currentLevel?.pluralName || '');
  const [isSavingLevel, setIsSavingLevel] = useState(false);

  // Node editing state
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<StructureNode | null>(null);
  const [nodeCode, setNodeCode] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [nodeParentId, setNodeParentId] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [nodeCustomValues, setNodeCustomValues] = useState<Record<string, any>>({});
  const [isSavingNode, setIsSavingNode] = useState(false);

  // Sync state when level changes
  const handleSelectLevel = (lvl: StructureLevel) => {
    setActiveLevelId(lvl.id);
    setLevelName(lvl.name);
    setLevelPlural(lvl.pluralName);
  };

  const handleSaveLevelName = async () => {
    if (!currentLevel || !levelName.trim()) return;
    try {
      setIsSavingLevel(true);
      await api.updateLevel(currentLevel.id, {
        name: levelName.trim(),
        pluralName: levelPlural.trim() || `${levelName.trim()}s`
      });
      showToast(`Hierarchy level renamed to "${levelName}". All UI labels updated.`, 'success');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to rename level', 'error');
    } finally {
      setIsSavingLevel(false);
    }
  };

  const handleOpenNodeModal = (node?: StructureNode) => {
    if (node) {
      setEditingNode(node);
      setNodeCode(node.code);
      setNodeName(node.name);
      setNodeParentId(node.parentNodeId || '');
      setNodeDescription(node.description || '');
      setNodeCustomValues(node.customValues || {});
    } else {
      setEditingNode(null);
      setNodeCode('');
      setNodeName('');
      setNodeParentId('');
      setNodeDescription('');
      setNodeCustomValues({});
    }
    setIsNodeModalOpen(true);
  };

  const handleSaveNode = async () => {
    if (!nodeCode.trim() || !nodeName.trim()) {
      showToast('Code and Name are required', 'error');
      return;
    }
    try {
      setIsSavingNode(true);
      if (editingNode) {
        await api.updateNode(editingNode.id, {
          code: nodeCode.trim(),
          name: nodeName.trim(),
          parentNodeId: nodeParentId || null,
          description: nodeDescription.trim() || undefined,
          customValues: nodeCustomValues
        });
        showToast(`Updated node ${nodeName}`, 'success');
      } else {
        await api.createNode({
          structureLevelId: activeLevelId,
          parentNodeId: nodeParentId || null,
          code: nodeCode.trim(),
          name: nodeName.trim(),
          description: nodeDescription.trim() || undefined,
          status: 'active',
          sortOrder: nodes.length + 1,
          customValues: nodeCustomValues
        });
        showToast(`Created new ${currentLevel?.name || 'node'} ${nodeName}`, 'success');
      }
      setIsNodeModalOpen(false);
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save structure node', 'error');
    } finally {
      setIsSavingNode(false);
    }
  };

  const handleDeactivateNode = async (node: StructureNode) => {
    try {
      await api.deactivateNode(node.id);
      showToast(`Deactivated ${node.name}. Historical fault records remain intact.`, 'info');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate node', 'error');
    }
  };

  const levelNodes = nodes.filter(n => n.structureLevelId === activeLevelId);
  const possibleParents = currentLevel?.parentLevelId ? nodes.filter(n => n.structureLevelId === currentLevel.parentLevelId) : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <GitBranch className="w-6 h-6 text-amber-400" />
            Configurable Organizational Structure Builder
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Generic hierarchy configuration. Terminology like &quot;Line&quot; &amp; &quot;Station&quot; or &quot;City&quot; &amp; &quot;Location&quot; can be reconfigured dynamically without schema migration.
          </p>
        </div>
      </div>

      {/* Architecture Notice Banner */}
      <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/60 flex items-start gap-3 text-xs text-cyan-200">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-cyan-300">Generic Data Architecture Principle</div>
          <div className="text-[11px] leading-relaxed">
            The database stores generic relationships (<code className="bg-cyan-900/60 px-1 py-0.5 rounded text-cyan-300">structure_level_id</code> and <code className="bg-cyan-900/60 px-1 py-0.5 rounded text-cyan-300">parent_node_id</code>), not hardcoded column names like <code className="text-slate-400">line_id</code> or <code className="text-slate-400">station_id</code>. Renaming a level updates all forms, reports, and filters instantly while preserving referential integrity.
          </div>
        </div>
      </div>

      {/* Levels Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {levels.map(lvl => (
          <button
            key={lvl.id}
            onClick={() => handleSelectLevel(lvl)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeLevelId === lvl.id
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Level {lvl.levelOrder}: {lvl.name}</span>
            <span className="text-[10px] opacity-75 font-mono">({lvl.internalCode})</span>
          </button>
        ))}
      </div>

      {/* Level Renaming Form */}
      {currentLevel && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Configure Level {currentLevel.levelOrder} Display Terminology
              </h2>
              <p className="text-xs text-slate-400">
                Internal Code: <span className="font-mono text-cyan-400">{currentLevel.internalCode}</span>
              </p>
            </div>
            <button
              onClick={handleSaveLevelName}
              disabled={isSavingLevel}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingLevel ? 'Saving...' : 'Apply Rename'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Singular Display Name</label>
              <input
                type="text"
                value={levelName}
                onChange={e => setLevelName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-medium"
                placeholder="e.g. Line, City, Region, Warehouse"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Plural Display Name</label>
              <input
                type="text"
                value={levelPlural}
                onChange={e => setLevelPlural(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-medium"
                placeholder="e.g. Lines, Cities, Regions, Warehouses"
              />
            </div>
          </div>

          {/* Custom Fields list for this level */}
          {currentLevel.customFields && currentLevel.customFields.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold uppercase text-slate-400">Custom Master Data Attributes</span>
              <div className="flex flex-wrap gap-2">
                {currentLevel.customFields.map(cf => (
                  <span key={cf.id} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-cyan-400" />
                    <span>{cf.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({cf.type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structure Nodes Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{currentLevel?.pluralName || 'Nodes'} Master Registry</span>
              <span className="text-xs font-mono font-normal text-slate-400">({levelNodes.length} nodes)</span>
            </h2>
            <p className="text-xs text-slate-400">Actual locations or lines in your maintenance system</p>
          </div>

          <button
            onClick={() => handleOpenNodeModal()}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add {currentLevel?.name || 'Node'}</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-800/30">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Name</th>
                {currentLevel?.parentLevelId && <th className="py-2.5 px-4">Parent ({getLevelName(1)})</th>}
                <th className="py-2.5 px-4">Custom Attributes</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {levelNodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No nodes defined for {currentLevel?.name}. Click &quot;Add {currentLevel?.name}&quot; above.
                  </td>
                </tr>
              ) : (
                levelNodes.map(node => {
                  const parent = nodes.find(n => n.id === node.parentNodeId);
                  return (
                    <tr key={node.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{node.code}</td>
                      <td className="py-3 px-4 font-medium text-white">{node.name}</td>
                      {currentLevel?.parentLevelId && (
                        <td className="py-3 px-4 text-slate-300">
                          {parent ? parent.name : <span className="text-slate-500 italic">None</span>}
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {node.customValues && Object.keys(node.customValues).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(node.customValues).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            node.status === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {node.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenNodeModal(node)}
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                            title="Edit Node"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {node.status === 'active' && (
                            <button
                              onClick={() => handleDeactivateNode(node)}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                              title="Deactivate Node (Safe Soft Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Node Create/Edit Modal */}
      {isNodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingNode ? `Edit ${currentLevel?.name}` : `Create New ${currentLevel?.name}`}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Code (Unique identifier) *</label>
                <input
                  type="text"
                  value={nodeCode}
                  onChange={e => setNodeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ADM or L1"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Name *</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={e => setNodeName(e.target.value)}
                  placeholder="e.g. Station ADM or Line 1"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {currentLevel?.parentLevelId && (
                <div>
                  <label className="text-slate-300 font-medium">Parent ({getLevelName(1)})</label>
                  <select
                    value={nodeParentId}
                    onChange={e => setNodeParentId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">No Parent (Root Node)</option>
                    {possibleParents.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-medium">Description</label>
                <input
                  type="text"
                  value={nodeDescription}
                  onChange={e => setNodeDescription(e.target.value)}
                  placeholder="Optional operational details"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Custom fields inputs */}
              {currentLevel?.customFields?.map(cf => (
                <div key={cf.id}>
                  <label className="text-slate-300 font-medium">{cf.name}</label>
                  {cf.type === 'dropdown' && cf.options ? (
                    <select
                      value={nodeCustomValues[cf.key] || ''}
                      onChange={e => setNodeCustomValues({ ...nodeCustomValues, [cf.key]: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select...</option>
                      {cf.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={cf.type === 'number' ? 'number' : 'text'}
                      value={nodeCustomValues[cf.key] || ''}
                      onChange={e => setNodeCustomValues({ ...nodeCustomValues, [cf.key]: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsNodeModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNode}
                disabled={isSavingNode}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-600/30"
              >
                {isSavingNode ? 'Saving...' : 'Save Node'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
