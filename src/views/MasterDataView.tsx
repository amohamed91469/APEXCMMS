import React, { useState } from 'react';
import {
  Database,
  Plus,
  Edit,
  Tag,
  Users,
  CheckCircle,
  XCircle,
  Layers,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';

export const MasterDataView: React.FC = () => {
  const { equipmentTypes, technicians, categories, refreshMasterData, showToast } = useCMMS();
  const [activeTab, setActiveTab] = useState<'types' | 'technicians' | 'categories'>('types');

  // New Equipment Type modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeCode, setTypeCode] = useState('');
  const [typeName, setTypeName] = useState('');
  const [typeDesc, setTypeDesc] = useState('');

  // New Technician modal
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [techCode, setTechCode] = useState('');
  const [techName, setTechName] = useState('');
  const [techSpecialization, setTechSpecialization] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techEmail, setTechEmail] = useState('');

  // New Category modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateType = async () => {
    if (!typeCode.trim() || !typeName.trim()) {
      showToast('Code and Name are required', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.createEquipmentType({
        code: typeCode.trim().toUpperCase(),
        name: typeName.trim(),
        description: typeDesc.trim() || undefined,
        status: 'active'
      });
      showToast(`Created equipment type ${typeCode}`, 'success');
      setIsTypeModalOpen(false);
      setTypeCode('');
      setTypeName('');
      setTypeDesc('');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create equipment type', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTechnician = async () => {
    if (!techCode.trim() || !techName.trim()) {
      showToast('Code and Name are required', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.createTechnician({
        code: techCode.trim().toUpperCase(),
        name: techName.trim(),
        specialization: techSpecialization.trim() || undefined,
        phone: techPhone.trim() || undefined,
        email: techEmail.trim() || undefined,
        status: 'active'
      });
      showToast(`Registered technician ${techName}`, 'success');
      setIsTechModalOpen(false);
      setTechCode('');
      setTechName('');
      setTechSpecialization('');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to register technician', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!catCode.trim() || !catName.trim()) {
      showToast('Code and Name are required', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.createCategory({
        code: catCode.trim().toUpperCase(),
        name: catName.trim(),
        description: catDesc.trim() || undefined,
        status: 'active'
      });
      showToast(`Added category ${catName}`, 'success');
      setIsCatModalOpen(false);
      setCatCode('');
      setCatName('');
      setCatDesc('');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Database className="w-6 h-6 text-rose-400" />
          Master Data Registry
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Manage equipment classifications (GATE, TOM, TVM, SCU), maintenance technicians, and fault defect categories
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'types' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Equipment Types ({equipmentTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('technicians')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'technicians' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Maintenance Technicians ({technicians.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'categories' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Fault Categories ({categories.length})</span>
        </button>
      </div>

      {/* Equipment Types Tab */}
      {activeTab === 'types' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Equipment Types</h2>
              <p className="text-xs text-slate-400">Classifications are fully configurable and not permanently hardcoded.</p>
            </div>
            <button
              onClick={() => setIsTypeModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Equipment Type</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {equipmentTypes.map(t => (
              <div key={t.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    {t.code}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">{t.status}</span>
                </div>
                <div className="font-semibold text-xs text-white">{t.name}</div>
                {t.description && <div className="text-[11px] text-slate-400 leading-relaxed">{t.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technicians Tab */}
      {activeTab === 'technicians' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Maintenance Technicians</h2>
              <p className="text-xs text-slate-400">Certified technicians available for fault dispatch and work execution.</p>
            </div>
            <button
              onClick={() => setIsTechModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Technician</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {technicians.map(t => (
              <div key={t.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-400">{t.code}</span>
                  <span className="text-[10px] text-emerald-400 font-medium">{t.status}</span>
                </div>
                <div className="font-bold text-sm text-white">{t.name}</div>
                <div className="text-xs text-cyan-300 font-medium">{t.specialization || 'General AFC Maintenance'}</div>
                <div className="text-[11px] text-slate-400">
                  {t.phone && <div>Tel: {t.phone}</div>}
                  {t.email && <div>Email: {t.email}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Fault Defect Categories</h2>
              <p className="text-xs text-slate-400">Failure categorization used for Pareto root cause analysis.</p>
            </div>
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(c => (
              <div key={c.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-400">{c.code}</span>
                  <span className="text-[10px] text-emerald-400">{c.status}</span>
                </div>
                <div className="font-semibold text-xs text-white">{c.name}</div>
                {c.description && <div className="text-[11px] text-slate-400">{c.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Equipment Type</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Type Code (e.g. SCU, GATE, TVM) *</label>
                <input
                  type="text"
                  value={typeCode}
                  onChange={e => setTypeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SCU"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium">Type Name *</label>
                <input
                  type="text"
                  value={typeName}
                  onChange={e => setTypeName(e.target.value)}
                  placeholder="e.g. Station Concentrator Unit"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium">Description</label>
                <input
                  type="text"
                  value={typeDesc}
                  onChange={e => setTypeDesc(e.target.value)}
                  placeholder="Optional details"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTypeModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateType}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
              >
                Save Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technician Modal */}
      {isTechModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Register Technician</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Code *</label>
                <input
                  type="text"
                  value={techCode}
                  onChange={e => setTechCode(e.target.value.toUpperCase())}
                  placeholder="TECH-104"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium">Full Name *</label>
                <input
                  type="text"
                  value={techName}
                  onChange={e => setTechName(e.target.value)}
                  placeholder="e.g. Tarek Mansour"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium">Specialization</label>
                <input
                  type="text"
                  value={techSpecialization}
                  onChange={e => setTechSpecialization(e.target.value)}
                  placeholder="e.g. Gate Optics & Turnstiles"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium">Phone</label>
                <input
                  type="text"
                  value={techPhone}
                  onChange={e => setTechPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTechModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateTechnician}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Fault Category</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Category Code *</label>
                <input
                  type="text"
                  value={catCode}
                  onChange={e => setCatCode(e.target.value.toUpperCase())}
                  placeholder="e.g. COMM"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  placeholder="e.g. Fiber & Telecommunications"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium">Description</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={e => setCatDesc(e.target.value)}
                  placeholder="Optional details"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateCategory}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
