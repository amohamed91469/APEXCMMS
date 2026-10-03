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
  const { settings, refreshMasterData, refreshAuth, showToast } = useCMMS();

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
    </div>
  );
};
