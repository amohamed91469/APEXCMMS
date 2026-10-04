import React, { useState } from 'react';
import {
  Building2,
  GitBranch,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  LogIn,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { api, setStoredToken } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { StructureLevel } from '../types/cmms.ts';

export const FirstRunWizard: React.FC = () => {
  const { refreshAuth, setIsInitialized, factoryResetAndRestartWizard, showToast } = useCMMS();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetAllData = async () => {
    try {
      setIsResetting(true);
      await factoryResetAndRestartWizard();
      setError(null);
      setStep(1);
      setShowResetConfirm(false);
      showToast('Database wiped clean. Starting fresh installation setup.', 'info');
    } catch (err: any) {
      setError(err.message || 'Failed to reset system');
    } finally {
      setIsResetting(false);
    }
  };

  // Step 1: Organization
  const [orgData, setOrgData] = useState({
    name: 'Metro Transit Maintenance Enterprise',
    department: 'Signaling & Automated Fare Collection (AFC)',
    timeZone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    language: 'en',
    currency: 'USD'
  });

  // Step 2: Organizational Structure
  const [level1Name, setLevel1Name] = useState('Line');
  const [level1Plural, setLevel1Plural] = useState('Lines');
  const [level2Name, setLevel2Name] = useState('Station');
  const [level2Plural, setLevel2Plural] = useState('Stations');
  const [stationCustomFields, setStationCustomFields] = useState<Array<{ name: string; key: string; type: any; required: boolean }>>([
    { name: 'Station Number', key: 'stationNumber', type: 'text', required: true },
    { name: 'Trigram', key: 'trigram', type: 'text', required: true },
    { name: 'Operational Status', key: 'opStatus', type: 'dropdown', required: false }
  ]);

  // Step 3: Initial Master Data
  const [equipmentTypes, setEquipmentTypes] = useState<Array<{ code: string; name: string }>>([
    { code: 'GATE', name: 'Automatic Fare Collection Turnstile Gate' },
    { code: 'TOM', name: 'Ticket Office Machine Terminal' },
    { code: 'TVM', name: 'Ticket Vending Machine' },
    { code: 'SCU', name: 'Station Computer Unit Concentrator' }
  ]);
  const [newEqCode, setNewEqCode] = useState('');
  const [newEqName, setNewEqName] = useState('');
  const [seedSampleData, setSeedSampleData] = useState<boolean>(true);

  // Step 4: Administrator Account
  const [adminData, setAdminData] = useState({
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@metro-transit.internal',
    password: '',
    confirmPassword: ''
  });

  const handleAddEquipmentType = () => {
    if (!newEqCode.trim()) return;
    setEquipmentTypes(prev => [...prev, { code: newEqCode.trim().toUpperCase(), name: newEqName.trim() || newEqCode.trim() }]);
    setNewEqCode('');
    setNewEqName('');
  };

  const handleRemoveEquipmentType = (index: number) => {
    setEquipmentTypes(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinishSetup = async () => {
    setError(null);
    if (!adminData.username || !adminData.email || !adminData.password) {
      setError('Please provide username, email, and password.');
      return;
    }
    if (adminData.password !== adminData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (adminData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);

      const structureLevels: StructureLevel[] = [
        {
          id: 'level_1',
          internalCode: 'ORG_LEVEL_1',
          name: level1Name.trim() || 'Line',
          pluralName: level1Plural.trim() || `${level1Name}s`,
          levelOrder: 1,
          parentLevelId: null,
          isActive: true,
          isRequired: true,
          customFields: [
            { id: 'cf_code', name: 'Code', key: 'code', type: 'text', required: true }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'level_2',
          internalCode: 'ORG_LEVEL_2',
          name: level2Name.trim() || 'Station',
          pluralName: level2Plural.trim() || `${level2Name}s`,
          levelOrder: 2,
          parentLevelId: 'level_1',
          isActive: true,
          isRequired: true,
          customFields: stationCustomFields.map((cf, idx) => ({
            id: `cf_${idx}_${cf.key}`,
            name: cf.name,
            key: cf.key,
            type: cf.type,
            required: cf.required,
            options: cf.type === 'dropdown' ? ['Open', 'Restricted', 'Closed'] : undefined
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const payload = {
        organization: orgData,
        structure: { levels: structureLevels },
        masterData: {
          equipmentTypes,
          seedSampleData
        },
        admin: adminData
      };

      const res = await api.setupSystem(payload);
      setStoredToken(res.token);
      showToast('CMMS successfully initialized! Logged in as administrator.', 'success');
      await refreshAuth();
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-3xl bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
        {/* Wizard Header */}
        <div className="px-8 py-6 border-b border-slate-700/80 bg-slate-800/50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">ApexCMMS Initial System Setup</h1>
                <p className="text-xs text-slate-400">Enterprise Modular Maintenance & Fault Tracking Architecture</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 transition-colors"
                title="Wipe database and restart installation wizard"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset System</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInitialized(true);
                  refreshAuth();
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600 transition-colors"
                title="If an administrator already exists, switch to the login screen"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Existing Admin? Sign In</span>
              </button>
              <div className="text-xs font-semibold px-3 py-1 bg-cyan-950 border border-cyan-800/60 text-cyan-400 rounded-full">
                Step {step} of 4
              </div>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-4 gap-2 pt-3">
            {[
              { num: 1, label: 'Organization', icon: Building2 },
              { num: 2, label: 'Hierarchy', icon: GitBranch },
              { num: 3, label: 'Master Data', icon: Layers },
              { num: 4, label: 'Administrator', icon: ShieldCheck }
            ].map(item => {
              const Icon = item.icon;
              const isPast = step > item.num;
              const isCurrent = step === item.num;
              return (
                <div
                  key={item.num}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                      : isPast
                      ? 'bg-slate-700/40 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800/50 text-slate-500 border border-slate-700/40'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {isPast && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-8 flex-1 overflow-y-auto max-h-[65vh]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-850/80 text-red-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Setup Notice</div>
                  <div className="text-red-200 text-xs mt-0.5">{error}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-100 text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Wipe &amp; Start Over</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsInitialized(true);
                    refreshAuth();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3 text-red-400">
                  <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reset All System Data</h3>
                    <p className="text-xs text-red-300 mt-0.5">Wipe all records, users, and hierarchy</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to clear all data in the system? This will delete all registered users, organizational nodes, equipment, and records, and reset the wizard to Step 1.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isResetting}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAllData}
                    disabled={isResetting}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all"
                  >
                    {isResetting ? (
                      <span>Resetting...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Reset &amp; Restart</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Organization */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Step 1 — Organization Profile</h2>
                <p className="text-sm text-slate-400">Specify your operating enterprise and regional formatting preferences.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Organization Name *</label>
                  <input
                    type="text"
                    value={orgData.name}
                    onChange={e => setOrgData({ ...orgData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Metro Transit Maintenance Enterprise"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Maintenance Department *</label>
                  <input
                    type="text"
                    value={orgData.department}
                    onChange={e => setOrgData({ ...orgData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Signaling & AFC Division"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Time Zone</label>
                  <select
                    value={orgData.timeZone}
                    onChange={e => setOrgData({ ...orgData, timeZone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="Europe/London">London / GMT</option>
                    <option value="Africa/Cairo">Cairo / Eastern European Time</option>
                    <option value="Asia/Dubai">Dubai / Gulf Standard Time</option>
                    <option value="Asia/Singapore">Singapore / Hong Kong</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Date Format</label>
                  <select
                    value={orgData.dateFormat}
                    onChange={e => setOrgData({ ...orgData, dateFormat: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601 Standard)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Language</label>
                  <select
                    value={orgData.language}
                    onChange={e => setOrgData({ ...orgData, language: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic (العربية)</option>
                    <option value="fr">French (Français)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Currency Symbol</label>
                  <input
                    type="text"
                    value={orgData.currency}
                    onChange={e => setOrgData({ ...orgData, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="USD, EUR, EGP, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configurable Organizational Structure */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Step 2 — Generic Configurable Organizational Hierarchy</h2>
                <p className="text-sm text-slate-400">
                  ApexCMMS avoids permanently hard-coding terminology like &quot;Line&quot; or &quot;Station&quot;. Configure the display names for your levels below.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-xs text-cyan-200">
                <span className="font-semibold text-cyan-300">Configurability Guarantee:</span> The database uses internal codes (<code className="bg-cyan-900/50 px-1 py-0.5 rounded">ORG_LEVEL_1</code>, <code className="bg-cyan-900/50 px-1 py-0.5 rounded">ORG_LEVEL_2</code>). You can rename them anytime (e.g. to City &rarr; Location, or Warehouse &rarr; Store) without breaking historical records.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Structure Level 1 (Internal: ORG_LEVEL_1)</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Root Level</span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Singular Display Name</label>
                    <input
                      type="text"
                      value={level1Name}
                      onChange={e => setLevel1Name(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      placeholder="e.g. Line, City, Region, Warehouse"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Plural Display Name</label>
                    <input
                      type="text"
                      value={level1Plural}
                      onChange={e => setLevel1Plural(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      placeholder="e.g. Lines, Cities, Regions, Warehouses"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Structure Level 2 (Internal: ORG_LEVEL_2)</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Child of Level 1</span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Singular Display Name</label>
                    <input
                      type="text"
                      value={level2Name}
                      onChange={e => setLevel2Name(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      placeholder="e.g. Station, Location, Building, Store"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Plural Display Name</label>
                    <input
                      type="text"
                      value={level2Plural}
                      onChange={e => setLevel2Plural(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      placeholder="e.g. Stations, Locations, Buildings, Stores"
                    />
                  </div>
                </div>
              </div>

              {/* Custom fields preview */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Custom Fields for Level 2 ({level2Name})
                  </h3>
                  <span className="text-xs text-slate-400">Dynamic master data schema</span>
                </div>
                <div className="space-y-2">
                  {stationCustomFields.map((cf, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-200">{cf.name}</span>
                        <code className="text-slate-400 text-[11px]">({cf.key})</code>
                        <span className="px-2 py-0.5 bg-slate-700 text-cyan-300 rounded text-[10px]">{cf.type}</span>
                      </div>
                      <span className={cf.required ? 'text-amber-400 text-[11px]' : 'text-slate-500 text-[11px]'}>
                        {cf.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hierarchy Visualizer */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/70">
                <div className="text-xs text-slate-400 mb-2 font-medium">Hierarchy Preview:</div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 flex-wrap">
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300">{level1Name}</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-950 border border-blue-800 text-blue-300">{level2Name}</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300">Equipment Type</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-800 text-purple-300">Equipment</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300">Fault History</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Master Data */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Step 3 — Initial Master Data & Equipment Types</h2>
                <p className="text-sm text-slate-400">
                  Configure initial equipment categories. Additional equipment types can be added or deactivated at any time.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-300">Initial Equipment Types</label>
                <div className="space-y-2">
                  {equipmentTypes.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-700/80">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-cyan-900/40 text-cyan-300 border border-cyan-800 rounded">
                          {t.code}
                        </span>
                        <span className="text-sm text-slate-200">{t.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipmentType(idx)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Remove equipment type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newEqCode}
                    onChange={e => setNewEqCode(e.target.value.toUpperCase())}
                    placeholder="Code (e.g. SCU)"
                    className="w-28 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newEqName}
                    onChange={e => setNewEqName(e.target.value)}
                    placeholder="Equipment Name description"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddEquipmentType}
                    className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Sample Data Toggle */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="seedSample"
                  checked={seedSampleData}
                  onChange={e => setSeedSampleData(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-600 bg-slate-800"
                />
                <label htmlFor="seedSample" className="text-xs space-y-1 cursor-pointer">
                  <div className="font-semibold text-slate-200">
                    Seed Demonstration Dataset (Line 1/2/3, Sample Stations ADM/ABC/XYZ, sample equipment & faults)
                  </div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    Recommended for first run to explore dashboards, TTR/downtime calculations (including midnight-crossing demo), and reports.
                    All records are clearly identified as sample data and can be purged with one click in Administration Settings before importing real historical Excel files.
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Administrator Account */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Step 4 — Create First Administrator Account</h2>
                <p className="text-sm text-slate-400">
                  Create the root administrator account. Passwords are encrypted with bcrypt before being stored.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Admin Username *</label>
                  <input
                    type="text"
                    value={adminData.username}
                    onChange={e => setAdminData({ ...adminData, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="admin"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    value={adminData.fullName}
                    onChange={e => setAdminData({ ...adminData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Chief Maintenance Engineer"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    value={adminData.email}
                    onChange={e => setAdminData({ ...adminData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="admin@metro-transit.internal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Password (Min 6 chars) *</label>
                  <input
                    type="password"
                    value={adminData.password}
                    onChange={e => setAdminData({ ...adminData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Confirm Password *</label>
                  <input
                    type="password"
                    value={adminData.confirmPassword}
                    onChange={e => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="px-8 py-5 border-t border-slate-700/80 bg-slate-800/50 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev + 1)}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-600/30"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinishSetup}
              className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Initializing CMMS...' : 'Complete System Initialization'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
