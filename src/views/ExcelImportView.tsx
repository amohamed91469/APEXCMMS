import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Layers,
  Save,
  RefreshCw,
  FileCheck,
  History,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useCMMS } from '../context/CMMSContext.tsx';
import { ImportJob, ImportErrorItem, ImportMappingTemplate } from '../types/cmms.ts';

interface ExcelImportViewProps {
  onNavigate: (tab: string, meta?: any) => void;
}

export const ExcelImportView: React.FC<ExcelImportViewProps> = ({ onNavigate }) => {
  const { showToast, equipmentTypes, getLevelName } = useCMMS();

  // Wizard Steps: 1: Upload, 2: Mapping, 3: Validation & Preview, 4: Results
  const [currentStep, setCurrentStep] = useState<number>(1);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [inspectData, setInspectData] = useState<any>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Column Mappings
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [defaultEquipmentType, setDefaultEquipmentType] = useState<string>('TVM');
  const [templateName, setTemplateName] = useState<string>('');
  const [savedTemplates, setSavedTemplates] = useState<ImportMappingTemplate[]>([]);

  // Validation & Preview state
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip'>('update');

  // Commit & Result state
  const [committing, setCommitting] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<any>(null);

  const level2Name = getLevelName(2);

  const CMMS_FIELDS = [
    { key: '', label: '-- Do Not Import --' },
    { key: 'callId', label: 'Call ID (Unique Identifier)' },
    { key: 'callNumber', label: 'Call Number / Ticket Ref' },
    { key: 'reportDate', label: 'Date Fault Reported *' },
    { key: 'reportTime', label: 'Time Fault Reported' },
    { key: 'structureNode', label: `Location (${level2Name}) *` },
    { key: 'equipmentType', label: 'Equipment Type (e.g. TVM, GATE)' },
    { key: 'equipmentNumber', label: 'Equipment Number (e.g. TVM-01) *' },
    { key: 'faultDescription', label: 'Fault Description *' },
    { key: 'relevantState', label: 'Relevant State (Relevant / Non-Relevant)' },
    { key: 'priority', label: 'Priority / Severity' },
    { key: 'technician', label: 'Corrected By / Assigned Technician' },
    { key: 'workDone', label: 'Work Done / Maintenance Action' },
    { key: 'correctiveAction', label: 'Corrective Action' },
    { key: 'maintenanceStart', label: 'Start of Fault Correction (Date/Time)' },
    { key: 'maintenanceEnd', label: 'End of Fault Correction (Date/Time)' },
    { key: 'status', label: 'Fault Status (New, Closed, etc.)' }
  ];

  // Fetch saved templates
  useEffect(() => {
    api.getMappingTemplates().then(res => setSavedTemplates(res.templates || [])).catch(() => {});
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);
    setFilename(uploaded.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const b64 = (evt.target?.result as string).split(',')[1];
      setFileBase64(b64);
      try {
        const inspect = await api.inspectExcel(b64, uploaded.name);
        setInspectData(inspect);
        setSelectedSheet(inspect.sheets[0]?.sheetName || '');
        setMappings(inspect.suggestedMappings || {});
        setCurrentStep(2);
        showToast(`Parsed ${inspect.sheets.length} worksheet(s) successfully!`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to inspect file', 'error');
      }
    };
    reader.readAsDataURL(uploaded);
  };

  const handleApplyTemplate = (tpl: ImportMappingTemplate) => {
    setMappings(tpl.mappings);
    showToast(`Applied mapping template: "${tpl.name}"`, 'info');
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      showToast('Please provide a name for this template', 'error');
      return;
    }
    try {
      const res = await api.saveMappingTemplate({
        name: templateName.trim(),
        mappings
      });
      setSavedTemplates(prev => [...prev, res.template]);
      setTemplateName('');
      showToast('Mapping template saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save template', 'error');
    }
  };

  const handleRunValidation = async () => {
    try {
      setValidating(true);
      const res = await api.validateImport({
        fileBase64,
        sheetName: selectedSheet,
        mappings,
        defaultEquipmentType
      });
      setValidationResult(res);
      setCurrentStep(3);
    } catch (err: any) {
      showToast(err.message || 'Validation error', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleCommitImport = async () => {
    try {
      setCommitting(true);
      const res = await api.commitImport({
        fileBase64,
        filename,
        sheetName: selectedSheet,
        mappings,
        defaultEquipmentType,
        duplicateStrategy
      });
      setCommitResult(res);
      setCurrentStep(4);
      showToast(`Imported ${res.recordsImported} fault records successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Import transaction failed', 'error');
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!commitResult?.jobId) return;
    window.open(`/api/data/jobs/${commitResult.jobId}/errors/export`, '_blank');
  };

  const activeSheet = inspectData?.sheets.find((s: any) => s.sheetName === selectedSheet) || inspectData?.sheets[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Historical Excel Import & Data Migration Engine
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Tolerant runtime ingestion for historical spreadsheets (.xlsx, .xls, .csv) with column mapping, validation & duplicate resolution
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-1 text-xs">
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Map Columns' },
            { num: 3, label: 'Validate & Preview' },
            { num: 4, label: 'Commit' }
          ].map(s => (
            <div
              key={s.num}
              className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all ${
                currentStep === s.num
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
                  : currentStep > s.num
                  ? 'bg-slate-800 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {s.num}. {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload File */}
      {currentStep === 1 && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 text-center shadow-xl">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Upload Historical Maintenance File</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload any existing maintenance spreadsheet. The engine will inspect sheets, detect headers, and map varied column formats without requiring changes to your Excel file.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition-all group">
              <FileSpreadsheet className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition-colors mb-2" />
              <span className="text-sm font-semibold text-slate-200">Click to select or drag & drop</span>
              <span className="text-xs text-slate-500 mt-1">Accepts .xlsx, .xls, .csv files (up to 50MB)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="max-w-xl mx-auto p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-left text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Tolerant Migration Features:</div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Handles varied column orders, missing columns, extra headers, and blank rows</li>
              <li>Auto-parses standard Excel serial dates, ISO strings, and separated date/time fields</li>
              <li>Calculates TTR & Downtime automatically for every row including midnight shifts</li>
              <li>Safely detects duplicate Call IDs to prevent duplicate record insertion</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Inspect & Column Mapping */}
      {currentStep === 2 && inspectData && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Worksheet Selection & Column Mapping
                </h2>
                <div className="text-xs text-slate-400">File: <span className="text-cyan-300 font-mono">{filename}</span></div>
              </div>

              {/* Sheet selector */}
              {inspectData.sheets.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Worksheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={e => setSelectedSheet(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {inspectData.sheets.map((s: any) => (
                      <option key={s.sheetName} value={s.sheetName}>
                        {s.sheetName} ({s.rowCount} rows)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Saved Templates Bar */}
            {savedTemplates.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                <span className="text-slate-400 font-medium">Quick Template:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {savedTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleApplyTemplate(t)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Column Mapping Table */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Match Excel Column Header &rarr; CMMS Field
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-800/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-4">Excel Header</th>
                      <th className="py-2.5 px-4">Sample Excel Value</th>
                      <th className="py-2.5 px-4">Mapped CMMS Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeSheet?.headers.map((h: string) => {
                      const sampleVal = activeSheet.sampleRows[0]?.[h] ?? '';
                      return (
                        <tr key={h} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                            {h}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 truncate max-w-xs">
                            {String(sampleVal || '(empty)')}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={mappings[h] || ''}
                              onChange={e => setMappings({ ...mappings, [h]: e.target.value })}
                              className={`w-full max-w-xs px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none ${
                                mappings[h]
                                  ? 'bg-cyan-950/80 border border-cyan-700 text-cyan-200'
                                  : 'bg-slate-800 border border-slate-700 text-slate-400'
                              }`}
                            >
                              {CMMS_FIELDS.map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Default Equipment Type fallback */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Default Equipment Type for this file:</span>
                <select
                  value={defaultEquipmentType}
                  onChange={e => setDefaultEquipmentType(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium"
                >
                  {equipmentTypes.map(t => (
                    <option key={t.id} value={t.code}>{t.code} - {t.name}</option>
                  ))}
                </select>
              </div>

              {/* Save template */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Template name (e.g. AFC Faults)"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save Mapping
                </button>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Back to File Selection
              </button>

              <button
                onClick={handleRunValidation}
                disabled={validating}
                className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30"
              >
                <FileCheck className="w-4 h-4" />
                <span>{validating ? 'Inspecting & Validating...' : 'Validate & Preview Import'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Validation & Preview */}
      {currentStep === 3 && validationResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Total Rows</div>
              <div className="text-2xl font-bold text-white">{validationResult.summary.totalRows}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-800/40">
              <div className="text-[10px] uppercase font-semibold text-emerald-400">Valid Records</div>
              <div className="text-2xl font-bold text-emerald-300">{validationResult.summary.validCount}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-amber-800/40">
              <div className="text-[10px] uppercase font-semibold text-amber-400">Warnings</div>
              <div className="text-2xl font-bold text-amber-300">{validationResult.summary.warningCount}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-red-800/40">
              <div className="text-[10px] uppercase font-semibold text-red-400">Critical Errors</div>
              <div className="text-2xl font-bold text-red-300">{validationResult.summary.errorCount}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-blue-800/40">
              <div className="text-[10px] uppercase font-semibold text-blue-400">Duplicates Detected</div>
              <div className="text-2xl font-bold text-blue-300">{validationResult.summary.duplicateCount}</div>
            </div>
          </div>

          {/* Duplicate Resolution Strategy */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-white">Duplicate Resolution Policy</div>
              <div className="text-[11px] text-slate-400">Choose how to handle records with Call IDs already in the database</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="dupStrategy"
                  checked={duplicateStrategy === 'update'}
                  onChange={() => setDuplicateStrategy('update')}
                  className="text-cyan-600 focus:ring-cyan-500"
                />
                <span>Update Existing Records</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 ml-4">
                <input
                  type="radio"
                  name="dupStrategy"
                  checked={duplicateStrategy === 'skip'}
                  onChange={() => setDuplicateStrategy('skip')}
                  className="text-cyan-600 focus:ring-cyan-500"
                />
                <span>Skip Duplicates</span>
              </label>
            </div>
          </div>

          {/* Preview Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="font-bold text-white uppercase tracking-wider">
                Preview Data (First 50 of {validationResult.allValidatedCount} records)
              </div>
              <span className="text-slate-400 text-[11px]">Normalized CMMS schema preview</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Call ID / No.</th>
                    <th className="py-2.5 px-3">Report Date</th>
                    <th className="py-2.5 px-3">{level2Name}</th>
                    <th className="py-2.5 px-3">Equip.</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Technician</th>
                    <th className="py-2.5 px-3">TTR</th>
                    <th className="py-2.5 px-3">Issues / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {validationResult.previewRows.map((r: any) => (
                    <tr key={r.rowNum} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500">#{r.rowNum}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.validationStatus === 'valid'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : r.validationStatus === 'warning'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : r.validationStatus === 'duplicate'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {r.validationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-200">{r.callNumber || r.callId}</td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{r.reportDate} {r.reportTime}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.structureNodeName}</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-400">{r.equipmentNumber}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-200" title={r.faultDescription}>
                        {r.faultDescription}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{r.technicianName}</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">{r.ttrMinutes}m</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs truncate">
                        {r.errors?.length > 0
                          ? r.errors.join(', ')
                          : r.warnings?.length > 0
                          ? r.warnings.join(', ')
                          : 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Adjust Column Mapping
            </button>

            <button
              onClick={handleCommitImport}
              disabled={committing || validationResult.summary.validCount + validationResult.summary.warningCount + validationResult.summary.duplicateCount === 0}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{committing ? 'Executing Import Transaction...' : 'Commit Import to Database'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Final Results & Error Reporting */}
      {currentStep === 4 && commitResult && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800/80 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Import Transaction Completed</h2>
            <p className="text-xs text-slate-400">All valid records have been normalized and committed to the database.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Processed</span>
              <div className="text-xl font-bold text-white">{commitResult.recordsProcessed}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
              <span className="text-[10px] uppercase font-semibold text-emerald-400">Imported</span>
              <div className="text-xl font-bold text-emerald-300">{commitResult.recordsImported}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Skipped</span>
              <div className="text-xl font-bold text-slate-300">{commitResult.recordsSkipped}</div>
            </div>
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50">
              <span className="text-[10px] uppercase font-semibold text-red-400">Rejected</span>
              <div className="text-xl font-bold text-red-300">{commitResult.recordsRejected}</div>
            </div>
          </div>

          {commitResult.recordsRejected > 0 && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/60 max-w-lg mx-auto flex items-center justify-between text-xs">
              <div className="text-left text-red-200">
                <div className="font-semibold">{commitResult.recordsRejected} rows had critical issues.</div>
                <div className="text-[11px] text-red-400">Download the error report for exact row/column details.</div>
              </div>
              <button
                onClick={handleDownloadErrors}
                className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Error Report (.xlsx)
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setFile(null);
                setFileBase64('');
                setInspectData(null);
                setValidationResult(null);
                setCommitResult(null);
                setCurrentStep(1);
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Import Another File
            </button>

            <button
              onClick={() => onNavigate('faults')}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30"
            >
              View In Fault Tracking Log &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
