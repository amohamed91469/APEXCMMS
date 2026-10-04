import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Trash2,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Database,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';

export const SettingsView: React.FC = () => {
  const { settings, refreshMasterData, refreshAuth, factoryResetAndRestartWizard, showToast } = useCMMS();

  const [orgName, setOrgName] = useState(settings?.organizationName || '');
  const [department, setDepartment] = useState(settings?.maintenanceDepartment || '');
  const [timeZone, setTimeZone] = useState(settings?.timeZone || 'UTC');
  const [dateFormat, setDateFormat] = useState(settings?.dateFormat || 'YYYY-MM-DD');
  const [currency, setCurrency] = useState(settings?.currency || 'USD');
  const [isSaving, setIsSaving] = useState(false);

  // Sample data purge/seed state
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Full factory reset state
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleFactoryReset = async () => {
    if (resetInput !== 'RESET') {
      showToast('Please type RESET exactly to confirm factory reset', 'warning');
      return;
    }
    try {
      setIsResetting(true);
      await factoryResetAndRestartWizard();
    } catch (err: any) {
      showToast(err.message || 'Failed to factory reset', 'error');
      setIsResetting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await api.updateSettings({
        organizationName: orgName.trim(),
        maintenanceDepartment: department.trim(),
        timeZone,
        dateFormat,
        currency
      });
      showToast('System settings saved successfully!', 'success');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSampleData = async () => {
    try {
      setIsClearing(true);
      const res = await api.clearSampleData();
      showToast(res.message, 'success');
      setConfirmClearOpen(false);
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to clear sample data', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSeedSampleData = async () => {
    try {
      setIsSeeding(true);
      const res = await api.seedSampleData();
      showToast(res.message, 'success');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err.message || 'Failed to load demonstration data', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-slate-400" />
          System Settings & Enterprise Configuration
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Organization profile, localization settings, and demonstration test data control
        </p>
      </div>

      {/* Organization Settings */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Enterprise Profile & Formatting</h2>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="text-slate-300 font-medium">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-slate-300 font-medium">Maintenance Department</label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium">Time Zone</label>
            <select
              value={timeZone}
              onChange={e => setTimeZone(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">Eastern Time (US & Canada)</option>
              <option value="Europe/London">London / GMT</option>
              <option value="Africa/Cairo">Cairo / Eastern European Time</option>
              <option value="Asia/Dubai">Dubai / Gulf Standard Time</option>
              <option value="Asia/Singapore">Singapore / Hong Kong</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-medium">Date Format</label>
            <select
              value={dateFormat}
              onChange={e => setDateFormat(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </div>
        </div>
      </div>

      {/* Demonstration / Sample Data Management */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Demonstration Dataset Management</h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          As required by the specification (Section 53 &amp; 54), the application includes sample data for initial demonstration (Line 1/2/3, sample Stations ADM/ABC/XYZ, sample TVM/GATE faults illustrating TTR &amp; midnight-crossing).
          Before importing your real Excel maintenance records, use the button below to purge all sample records.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => setConfirmClearOpen(true)}
            disabled={isClearing}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Clear Demonstration Data</span>
          </button>

          <button
            onClick={handleSeedSampleData}
            disabled={isSeeding}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>Reload Metro AFC Sample Dataset</span>
          </button>
        </div>

        {/* Confirmation Modal */}
        {confirmClearOpen && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 space-y-3 text-xs">
            <div className="flex items-start gap-2.5 text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <span className="font-bold">Are you sure you want to delete all demonstration records?</span>
                <p className="text-[11px] text-red-300 mt-0.5">
                  This will remove all sample nodes (Line 1/2/3, ADM/ABC/XYZ), equipment, and sample faults. User accounts and security roles will be preserved.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearSampleData}
                disabled={isClearing}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
              >
                {isClearing ? 'Clearing...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone: Full Factory Reset & Installation Wizard */}
      <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/60 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-red-900/50 pb-3">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <div>
            <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider">Danger Zone: System Factory Reset</h2>
            <p className="text-[11px] text-slate-400">Wipe all application data, users, and hierarchy, and restart the First-Run Installation Wizard</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-red-950/40 border border-red-850/60 text-xs text-red-200/90 space-y-2">
          <p className="font-semibold text-red-300">
            Warning: This action is permanent and completely irreversible!
          </p>
          <p className="text-slate-300 leading-relaxed">
            Performing a factory reset will erase:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
            <li>All logged faults, status histories, maintenance work notes, and TTR/downtime statistics</li>
            <li>All registered equipment and organizational hierarchy nodes &amp; custom field schemas</li>
            <li>All master data (equipment types, fault categories, failure codes, and corrective actions)</li>
            <li>All user accounts, credentials, and custom roles</li>
            <li>All historical audit log entries, import jobs, and error archives</li>
          </ul>
          <p className="text-slate-300 text-[11px]">
            Once completed, the system will return to an uninitialized state and automatically present the <strong>First-Run Installation Wizard</strong> so you can configure a brand-new organization or fresh hierarchy from scratch.
          </p>
        </div>

        {!confirmResetOpen ? (
          <div className="pt-2">
            <button
              onClick={() => {
                setConfirmResetOpen(true);
                setResetInput('');
              }}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all hover:scale-[1.01]"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Reset All Data &amp; Start Installation Wizard</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-red-950/70 border-2 border-red-600 space-y-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-red-200 text-sm">Confirm Full Factory Reset</span>
                <p className="text-slate-300">
                  To confirm wiping the entire database and launching the setup wizard, type <strong className="text-white bg-red-900/60 px-1.5 py-0.5 rounded font-mono">RESET</strong> below:
                </p>
              </div>
            </div>

            <div className="pt-1">
              <input
                type="text"
                value={resetInput}
                onChange={e => setResetInput(e.target.value.toUpperCase())}
                placeholder="Type RESET here"
                disabled={isResetting}
                className="w-full sm:w-64 px-3 py-2 rounded-lg bg-slate-900 border border-red-700 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmResetOpen(false);
                  setResetInput('');
                }}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFactoryReset}
                disabled={resetInput !== 'RESET' || isResetting}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Resetting Database &amp; Reloading...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Confirm &amp; Launch Installation Wizard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
