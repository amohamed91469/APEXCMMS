import React, { useState } from 'react';
import {
  Layers,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Trash2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useCMMS } from '../context/CMMSContext.tsx';

export const LoginModal: React.FC = () => {
  const { login, settings, factoryResetAndRestartWizard, showToast } = useCMMS();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetSystem = async () => {
    if (resetConfirmInput !== 'RESET') {
      showToast('Please type RESET to confirm factory reset', 'warning');
      return;
    }
    try {
      setIsResetting(true);
      await factoryResetAndRestartWizard();
      setShowResetModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset system', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }

    try {
      setIsLoading(true);
      await login({ username: username.trim(), password });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-600/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">ApexCMMS Enterprise</h1>
          <p className="text-xs text-slate-400">
            {settings?.organizationName || 'Modular Maintenance Management System'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all mt-2"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to CMMS'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Demo Test Accounts */}
        <div className="pt-2 space-y-2 border-t border-slate-800/80">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
            Test RBAC Roles (1-Click Fill)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('password123'); }}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-white text-xs">Administrator</div>
              <div className="text-[10px] text-cyan-400 font-mono">admin / Full Access</div>
            </button>
            <button
              type="button"
              onClick={() => { setUsername('manager'); setPassword('password123'); }}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-white text-xs">Manager</div>
              <div className="text-[10px] text-purple-400 font-mono">manager / Operations</div>
            </button>
            <button
              type="button"
              onClick={() => { setUsername('supervisor'); setPassword('password123'); }}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-white text-xs">Supervisor</div>
              <div className="text-[10px] text-amber-400 font-mono">supervisor / Dispatch</div>
            </button>
            <button
              type="button"
              onClick={() => { setUsername('technician'); setPassword('password123'); }}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-white text-xs">Technician</div>
              <div className="text-[10px] text-teal-400 font-mono">technician / Work Done</div>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex flex-col items-center gap-2">
          <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>Bcrypt Encrypted • Role-Based Access Control</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowResetModal(true);
              setResetConfirmInput('');
            }}
            className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition-colors underline decoration-slate-600 underline-offset-4"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Clear all data &amp; start installation wizard</span>
          </button>
        </div>

        {/* Factory Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3 text-red-400">
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Full System Reset</h3>
                  <p className="text-xs text-red-300 mt-0.5">Wipe all database records and start installation wizard</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900 text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  This action will <strong className="text-red-300">permanently delete</strong> all records in the CMMS:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 pl-1">
                  <li>All fault tickets &amp; maintenance history</li>
                  <li>All equipment inventory and structure hierarchy</li>
                  <li>All users, admin accounts, and passwords</li>
                  <li>All audit logs and master data</li>
                </ul>
                <p className="text-[11px] text-amber-300 pt-1">
                  The application will launch the First-Run Installation Wizard immediately so you can set up a fresh system.
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-300 font-medium">
                  Type <span className="font-mono font-bold text-white bg-red-900/60 px-1.5 py-0.5 rounded">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={resetConfirmInput}
                  onChange={e => setResetConfirmInput(e.target.value.toUpperCase())}
                  placeholder="RESET"
                  disabled={isResetting}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-red-700 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmInput('');
                  }}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetSystem}
                  disabled={resetConfirmInput !== 'RESET' || isResetting}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Resetting &amp; Launching...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Wipe &amp; Launch Wizard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
