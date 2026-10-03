import React, { useState } from 'react';
import { CMMSProvider, useCMMS } from './context/CMMSContext.tsx';
import { FirstRunWizard } from './components/FirstRunWizard.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { Layout } from './components/Layout.tsx';

import { DashboardView } from './views/DashboardView.tsx';
import { FaultTrackingView } from './views/FaultTrackingView.tsx';
import { NewFaultView } from './views/NewFaultView.tsx';
import { EquipmentView } from './views/EquipmentView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { ExcelImportView } from './views/ExcelImportView.tsx';
import { StructureAdminView } from './views/StructureAdminView.tsx';
import { UsersAdminView } from './views/UsersAdminView.tsx';
import { AuditLogView } from './views/AuditLogView.tsx';
import { MasterDataView } from './views/MasterDataView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { ModuleRegistryView } from './views/ModuleRegistryView.tsx';

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useCMMS();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md text-xs font-medium transition-all ${
            t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : t.type === 'error'
              ? 'bg-red-950/90 border-red-800 text-red-200'
              : t.type === 'warning'
              ? 'bg-amber-950/90 border-amber-800 text-amber-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>{t.message}</span>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
};

const CMMSApp: React.FC = () => {
  const { isInitialized, isAuthenticated, isLoading } = useCMMS();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        <span>Initializing ApexCMMS Engine...</span>
      </div>
    );
  }

  // First-run wizard if system has no users or uninitialized
  if (!isInitialized) {
    return <FirstRunWizard />;
  }

  // Login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginModal />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentTab} />;
      case 'faults':
        return <FaultTrackingView onNavigate={setCurrentTab} />;
      case 'new_fault':
        return <NewFaultView onNavigate={setCurrentTab} />;
      case 'equipment':
        return <EquipmentView />;
      case 'reports':
        return <ReportsView />;
      case 'import_excel':
        return <ExcelImportView onNavigate={setCurrentTab} />;
      case 'admin_structure':
        return <StructureAdminView />;
      case 'admin_users':
      case 'admin_roles':
        return <UsersAdminView />;
      case 'admin_audit':
        return <AuditLogView />;
      case 'admin_masterdata':
        return <MasterDataView />;
      case 'admin_settings':
        return <SettingsView />;
      case 'admin_modules':
        return <ModuleRegistryView />;
      default:
        return <DashboardView onNavigate={setCurrentTab} />;
    }
  };

  return (
    <Layout currentTab={currentTab} onNavigate={setCurrentTab}>
      {renderActiveView()}
    </Layout>
  );
};

export default function App() {
  return (
    <CMMSProvider>
      <CMMSApp />
      <ToastContainer />
    </CMMSProvider>
  );
}
