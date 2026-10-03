import { Router } from 'express';
import * as XLSX from 'xlsx';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../services/auth.ts';
import { calculateTTR, calculateDowntime, parseFlexibleDateTime } from '../../src/utils/timeCalculations.ts';
import { Fault, ImportJob, ImportErrorItem } from '../../src/types/cmms.ts';

export const importExportRouter = Router();

// Helper to parse dates from Excel (supporting numbers, serial dates, strings)
function parseExcelDate(val: any): { dateStr: string; timeStr: string } {
  if (val === null || val === undefined || val === '') {
    return { dateStr: '', timeStr: '' };
  }

  // If number (Excel serial date)
  if (typeof val === 'number') {
    // Excel base date 1899-12-30
    const parsedDate = XLSX.SSF.parse_date_code(val);
    if (parsedDate) {
      const y = parsedDate.y;
      const m = String(parsedDate.m).padStart(2, '0');
      const d = String(parsedDate.d).padStart(2, '0');
      const hh = String(parsedDate.H || 0).padStart(2, '0');
      const mm = String(parsedDate.M || 0).padStart(2, '0');
      return {
        dateStr: `${y}-${m}-${d}`,
        timeStr: `${hh}:${mm}`
      };
    }
  }

  const str = String(val).trim();
  // If ISO string
  if (str.includes('T')) {
    const parts = str.split('T');
    return {
      dateStr: parts[0],
      timeStr: parts[1]?.slice(0, 5) || '00:00'
    };
  }

  // Check if contains both date and time (e.g. "2026-09-15 10:15")
  if (str.includes(' ') && str.length >= 14) {
    const [d, t] = str.split(' ');
    return {
      dateStr: d,
      timeStr: t.slice(0, 5)
    };
  }

  // Check if string is just time (e.g. "10:15")
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]/.test(str)) {
    return { dateStr: '', timeStr: str.slice(0, 5) };
  }

  // Standard date parsing (e.g. DD/MM/YYYY or YYYY-MM-DD)
  const parsed = parseFlexibleDateTime(str);
  if (parsed) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    const hh = String(parsed.getHours()).padStart(2, '0');
    const mm = String(parsed.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${y}-${m}-${d}`,
      timeStr: `${hh}:${mm}`
    };
  }

  return { dateStr: str, timeStr: '' };
}

// 1. Inspect uploaded Excel data (sent as base64 or raw buffer)
importExportRouter.post('/inspect', requireAuth, requirePermission('import:execute'), (req, res) => {
  const { fileBase64, filename } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ error: 'fileBase64 payload is required' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      return res.status(400).json({ error: 'Excel file contains no worksheets' });
    }

    const sheetsInfo = sheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

      if (!rawRows || rawRows.length === 0) {
        return {
          sheetName,
          rowCount: 0,
          headers: [],
          sampleRows: []
        };
      }

      // First non-empty row as header
      const headers = (rawRows[0] || []).map(h => String(h || '').trim()).filter(h => h.length > 0);
      const sampleRows = rawRows.slice(1, 6).map(row => {
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = row[idx] !== undefined ? row[idx] : '';
        });
        return rowObj;
      });

      return {
        sheetName,
        rowCount: Math.max(0, rawRows.length - 1),
        headers,
        sampleRows
      };
    });

    // Auto-suggest column mappings based on common CMMS synonyms
    const firstHeaders = sheetsInfo[0]?.headers || [];
    const suggestedMappings: Record<string, string> = {};

    const synonyms: Record<string, string[]> = {
      callId: ['call id', 'call_id', 'fault id', 'id', 'ticket id', 'ticket no'],
      callNumber: ['call no', 'call no.', 'call number', 'call_no', 'ticket number', 'log no'],
      reportDate: ['date fault reported', 'report date', 'fault date', 'reported date', 'date', 'failure date'],
      reportTime: ['time fault reported', 'report time', 'fault time', 'reported time', 'time'],
      structureNode: ['station', 'location', 'site', 'facility', 'line station', 'station name', 'node'],
      equipmentType: ['equipment type', 'equip type', 'category', 'asset type', 'call type'],
      equipmentNumber: ['equip. no.', 'equip no', 'equipment no', 'equipment number', 'asset no', 'asset id'],
      faultDescription: ['fault description', 'description', 'problem', 'failure details', 'defect', 'symptom'],
      relevantState: ['relevant state', 'relevant', 'relevance', 'state', 'kpi relevant'],
      priority: ['priority', 'severity', 'urgency'],
      technician: ['corrected by', 'technician', 'assigned to', 'engineer', 'repaired by'],
      workDone: ['work done', 'action taken', 'maintenance work', 'intervention'],
      correctiveAction: ['corrective action', 'resolution', 'solution', 'remedy'],
      maintenanceStart: ['start of fault correction', 'start time', 'maintenance start', 'repair start', 'started at'],
      maintenanceEnd: ['end of fault correction', 'end time', 'maintenance end', 'repair end', 'finished at'],
      status: ['fault status', 'status', 'state']
    };

    firstHeaders.forEach(header => {
      const lower = header.toLowerCase().trim();
      for (const [field, patterns] of Object.entries(synonyms)) {
        if (patterns.some(p => lower === p || lower.includes(p))) {
          if (!Object.values(suggestedMappings).includes(field)) {
            suggestedMappings[header] = field;
          }
          break;
        }
      }
    });

    res.json({
      filename: filename || 'import.xlsx',
      sheets: sheetsInfo,
      suggestedMappings
    });
  } catch (err: any) {
    res.status(400).json({ error: `Failed to inspect Excel file: ${err.message}` });
  }
});

// 2. Validate parsed Excel rows against system master data
importExportRouter.post('/validate', requireAuth, requirePermission('import:execute'), (req, res) => {
  const { fileBase64, sheetName, mappings, defaultEquipmentType } = req.body;
  if (!fileBase64 || !mappings) {
    return res.status(400).json({ error: 'fileBase64 and mappings are required' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const targetSheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheet];

    if (!worksheet) {
      return res.status(400).json({ error: `Sheet "${targetSheet}" not found` });
    }

    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Invert mapping: cmmsField -> excelHeader
    const fieldToHeader: Record<string, string> = {};
    for (const [excelH, cmmsF] of Object.entries(mappings as Record<string, string>)) {
      if (cmmsF) fieldToHeader[cmmsF] = excelH;
    }

    // Master data lookups
    const nodes = store.getStructureNodes();
    const eqTypes = store.getEquipmentTypes();
    const technicians = store.getTechnicians();
    const existingFaults = store.getFaults({ limit: 100000 }).faults;
    const existingCallIds = new Set(existingFaults.map(f => f.callId.toLowerCase().trim()));

    const validatedRows: any[] = [];
    const errors: any[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // 1-indexed row number in Excel including header
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];
      let rowStatus: 'valid' | 'warning' | 'error' | 'duplicate' = 'valid';

      // 1. Call ID & Call Number
      const callIdRaw = String(row[fieldToHeader.callId] || '').trim();
      const callNoRaw = String(row[fieldToHeader.callNumber] || '').trim();
      const callId = callIdRaw || callNoRaw || `CALL-${Date.now()}-${rowNum}`;
      const callNumber = callNoRaw || callId;

      if (callIdRaw && existingCallIds.has(callIdRaw.toLowerCase())) {
        rowStatus = 'duplicate';
        rowWarnings.push(`Call ID "${callIdRaw}" already exists in the system (will be updated or skipped)`);
        duplicateCount++;
      }

      // 2. Dates & Times
      const reportDateRaw = row[fieldToHeader.reportDate];
      const reportTimeRaw = row[fieldToHeader.reportTime];
      const parsedReport = parseExcelDate(reportDateRaw);
      let reportDate = parsedReport.dateStr;
      let reportTime = (reportTimeRaw ? String(reportTimeRaw).trim() : '') || parsedReport.timeStr || '00:00';

      if (!reportDate) {
        rowErrors.push('Missing or invalid Fault Report Date');
        errors.push({
          rowNumber: rowNum,
          column: fieldToHeader.reportDate || 'Date',
          value: String(reportDateRaw || ''),
          problem: 'Fault Report Date is mandatory',
          suggestedAction: 'Provide a valid date format (e.g. YYYY-MM-DD or DD/MM/YYYY)'
        });
      }

      // 3. Structure Node / Location
      const nodeRaw = String(row[fieldToHeader.structureNode] || '').trim();
      let matchedNode = nodes.find(n =>
        n.code.toLowerCase() === nodeRaw.toLowerCase() ||
        n.name.toLowerCase() === nodeRaw.toLowerCase() ||
        n.name.toLowerCase().includes(nodeRaw.toLowerCase())
      );

      if (!matchedNode && nodeRaw) {
        rowWarnings.push(`Structure location "${nodeRaw}" not recognized. Will map to unassigned or auto-create.`);
      } else if (!nodeRaw) {
        rowWarnings.push('No location specified in row');
      }

      // 4. Equipment Type
      const eqTypeRaw = String(row[fieldToHeader.equipmentType] || defaultEquipmentType || '').trim();
      let matchedEqType = eqTypes.find(t =>
        t.code.toLowerCase() === eqTypeRaw.toLowerCase() ||
        t.name.toLowerCase() === eqTypeRaw.toLowerCase()
      );
      if (!matchedEqType && eqTypeRaw) {
        rowWarnings.push(`Equipment type "${eqTypeRaw}" not found. Will be auto-created.`);
      }

      // 5. Equipment Number
      const equipNoRaw = String(row[fieldToHeader.equipmentNumber] || '').trim();
      if (!equipNoRaw) {
        rowWarnings.push('Equipment number missing. Will record as GENERAL.');
      }

      // 6. Fault Description
      const descRaw = String(row[fieldToHeader.faultDescription] || '').trim();
      if (!descRaw) {
        rowErrors.push('Fault description is required');
        errors.push({
          rowNumber: rowNum,
          column: fieldToHeader.faultDescription || 'Fault Description',
          value: '',
          problem: 'Fault description is blank',
          suggestedAction: 'Enter a valid description of the maintenance fault'
        });
      }

      // 7. Maintenance Start & End / Calculations
      const startRaw = row[fieldToHeader.maintenanceStart];
      const endRaw = row[fieldToHeader.maintenanceEnd];
      const startParsed = parseExcelDate(startRaw);
      const endParsed = parseExcelDate(endRaw);

      const mStart = startParsed.dateStr ? `${startParsed.dateStr}T${startParsed.timeStr || '00:00'}:00` : (startParsed.timeStr || null);
      const mEnd = endParsed.dateStr ? `${endParsed.dateStr}T${endParsed.timeStr || '00:00'}:00` : (endParsed.timeStr || null);

      const ttrMinutes = calculateTTR(mStart, mEnd, reportDate);
      const downtimeMinutes = calculateDowntime({
        reportDate,
        reportTime,
        maintenanceStart: mStart,
        maintenanceEnd: mEnd,
        restorationDate: mEnd
      });

      // 8. Technician
      const techRaw = String(row[fieldToHeader.technician] || '').trim();
      const matchedTech = technicians.find(t => t.name.toLowerCase().includes(techRaw.toLowerCase()) || t.code.toLowerCase() === techRaw.toLowerCase());

      // 9. Relevant state & Priority & Status
      let relevantState = String(row[fieldToHeader.relevantState] || 'Relevant').trim();
      if (relevantState.toLowerCase().startsWith('rel')) relevantState = 'Relevant';
      else if (relevantState.toLowerCase().includes('non')) relevantState = 'Non-Relevant';
      else relevantState = 'Under Review';

      let status = String(row[fieldToHeader.status] || '').trim();
      if (!status) {
        status = (mEnd || ttrMinutes > 0) ? 'Closed' : 'New';
      }

      if (rowErrors.length > 0) {
        rowStatus = 'error';
        errorCount++;
      } else if (rowStatus !== 'duplicate') {
        if (rowWarnings.length > 0) {
          rowStatus = 'warning';
          warningCount++;
        } else {
          validCount++;
        }
      }

      validatedRows.push({
        rowNum,
        callId,
        callNumber,
        reportDate,
        reportTime,
        structureNodeName: matchedNode ? matchedNode.name : (nodeRaw || 'Unassigned'),
        structureNodeId: matchedNode ? matchedNode.id : '',
        equipmentTypeCode: matchedEqType ? matchedEqType.code : (eqTypeRaw || 'TVM'),
        equipmentTypeId: matchedEqType ? matchedEqType.id : '',
        equipmentNumber: equipNoRaw || 'GEN-01',
        faultDescription: descRaw || '(No Description)',
        relevantState,
        priority: String(row[fieldToHeader.priority] || 'Medium').trim(),
        technicianName: matchedTech ? matchedTech.name : (techRaw || 'Unassigned'),
        technicianId: matchedTech ? matchedTech.id : null,
        workDone: String(row[fieldToHeader.workDone] || '').trim(),
        correctiveAction: String(row[fieldToHeader.correctiveAction] || '').trim(),
        maintenanceStart: mStart,
        maintenanceEnd: mEnd,
        ttrMinutes,
        downtimeMinutes,
        status,
        validationStatus: rowStatus,
        errors: rowErrors,
        warnings: rowWarnings
      });
    });

    res.json({
      summary: {
        totalRows: rawRows.length,
        validCount,
        warningCount,
        errorCount,
        duplicateCount
      },
      previewRows: validatedRows.slice(0, 50),
      allValidatedCount: validatedRows.length,
      errors
    });
  } catch (err: any) {
    res.status(400).json({ error: `Validation failed: ${err.message}` });
  }
});

// 3. Commit Import Transactionally
importExportRouter.post('/commit', requireAuth, requirePermission('import:execute'), (req: AuthenticatedRequest, res) => {
  const { fileBase64, filename, sheetName, mappings, defaultEquipmentType, duplicateStrategy } = req.body;
  if (!fileBase64 || !mappings) {
    return res.status(400).json({ error: 'fileBase64 and mappings are required' });
  }

  const user = req.user!;
  const jobId = `job_${Date.now()}`;

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const targetSheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheet];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const fieldToHeader: Record<string, string> = {};
    for (const [excelH, cmmsF] of Object.entries(mappings as Record<string, string>)) {
      if (cmmsF) fieldToHeader[cmmsF] = excelH;
    }

    const jobErrors: ImportErrorItem[] = [];
    let recordsImported = 0;
    let recordsSkipped = 0;
    let recordsRejected = 0;
    let warningsCount = 0;

    store.transaction((tx) => {
      let nodes = tx.getStructureNodes();
      const levels = tx.getStructureLevels();
      let eqTypes = tx.getEquipmentTypes();
      let technicians = tx.getTechnicians();
      const existingFaults = tx.getFaults({ limit: 100000 }).faults;
      const faultMapByCallId = new Map(existingFaults.map(f => [f.callId.toLowerCase().trim(), f]));

      // Fallback node if needed
      let defaultNode = nodes[0];
      if (!defaultNode) {
        let firstLevel = levels[0];
        if (!firstLevel) {
          firstLevel = {
            id: 'level_default_1',
            internalCode: 'ORG_LEVEL_1',
            name: 'Facility',
            pluralName: 'Facilities',
            levelOrder: 1,
            isActive: true,
            isRequired: true,
            customFields: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          tx.setStructureLevels([firstLevel], { id: user.id, name: user.fullName });
        }
        defaultNode = tx.createStructureNode({
          structureLevelId: firstLevel.id,
          code: 'MAIN',
          name: 'Main Facility',
          status: 'active',
          sortOrder: 1
        }, { id: user.id, name: user.fullName });
        nodes = tx.getStructureNodes();
      }

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const callIdRaw = String(row[fieldToHeader.callId] || '').trim();
        const callNoRaw = String(row[fieldToHeader.callNumber] || '').trim();
        const callId = callIdRaw || callNoRaw || `CALL-${Date.now()}-${rowNum}`;
        const callNumber = callNoRaw || callId;

        // Duplicate handling
        const existingFault = callIdRaw ? faultMapByCallId.get(callIdRaw.toLowerCase()) : null;
        if (existingFault) {
          if (duplicateStrategy === 'skip') {
            recordsSkipped++;
            return;
          }
        }

        // Date & Time
        const parsedReport = parseExcelDate(row[fieldToHeader.reportDate]);
        const reportDate = parsedReport.dateStr;
        const reportTime = (row[fieldToHeader.reportTime] ? String(row[fieldToHeader.reportTime]).trim() : '') || parsedReport.timeStr || '00:00';

        if (!reportDate) {
          recordsRejected++;
          jobErrors.push({
            id: `err_${Date.now()}_${rowNum}`,
            jobId,
            rowNumber: rowNum,
            column: fieldToHeader.reportDate || 'Date',
            value: String(row[fieldToHeader.reportDate] || ''),
            problem: 'Missing report date',
            suggestedAction: 'Provide valid date format'
          });
          return;
        }

        // Fault Description
        const faultDesc = String(row[fieldToHeader.faultDescription] || '').trim();
        if (!faultDesc) {
          recordsRejected++;
          jobErrors.push({
            id: `err_${Date.now()}_${rowNum}`,
            jobId,
            rowNumber: rowNum,
            column: fieldToHeader.faultDescription || 'Fault Description',
            value: '',
            problem: 'Fault description is blank',
            suggestedAction: 'Enter valid fault description'
          });
          return;
        }

        // Location Node
        const nodeRaw = String(row[fieldToHeader.structureNode] || '').trim();
        let targetNode = nodes.find(n =>
          n.code.toLowerCase() === nodeRaw.toLowerCase() ||
          n.name.toLowerCase() === nodeRaw.toLowerCase() ||
          n.name.toLowerCase().includes(nodeRaw.toLowerCase())
        );

        if (!targetNode && nodeRaw) {
          // Auto-create structure node to prevent data loss
          const targetLevel = levels.length > 1 ? levels[levels.length - 1] : levels[0];
          targetNode = tx.createStructureNode({
            structureLevelId: targetLevel.id,
            code: nodeRaw.toUpperCase().slice(0, 10).replace(/[^A-Z0-9]/g, ''),
            name: nodeRaw,
            status: 'active',
            sortOrder: nodes.length + 1
          }, { id: user.id, name: user.fullName });
          nodes = tx.getStructureNodes();
          warningsCount++;
        }
        const structureNodeId = targetNode ? targetNode.id : defaultNode.id;

        // Equipment Type
        const eqTypeRaw = String(row[fieldToHeader.equipmentType] || defaultEquipmentType || 'TVM').trim().toUpperCase();
        let targetEqType = eqTypes.find(t => t.code.toUpperCase() === eqTypeRaw || t.name.toUpperCase() === eqTypeRaw);
        if (!targetEqType && eqTypeRaw) {
          targetEqType = tx.createEquipmentType({
            code: eqTypeRaw.slice(0, 10),
            name: eqTypeRaw,
            status: 'active'
          }, { id: user.id, name: user.fullName });
          eqTypes = tx.getEquipmentTypes();
          warningsCount++;
        }
        const equipmentTypeId = targetEqType ? targetEqType.id : 'type_tvm';

        // Equipment Number
        const equipNo = String(row[fieldToHeader.equipmentNumber] || `${eqTypeRaw}-01`).trim();

        // Technician
        const techRaw = String(row[fieldToHeader.technician] || '').trim();
        let targetTech = technicians.find(t => t.name.toLowerCase().includes(techRaw.toLowerCase()));
        if (!targetTech && techRaw && techRaw.length > 2) {
          targetTech = tx.createTechnician({
            code: `TECH-${Date.now().toString().slice(-4)}`,
            name: techRaw,
            status: 'active'
          }, { id: user.id, name: user.fullName });
          technicians = tx.getTechnicians();
        }

        // Maintenance Start / End / TTR / Downtime
        const startParsed = parseExcelDate(row[fieldToHeader.maintenanceStart]);
        const endParsed = parseExcelDate(row[fieldToHeader.maintenanceEnd]);
        const mStart = startParsed.dateStr ? `${startParsed.dateStr}T${startParsed.timeStr || '00:00'}:00` : (startParsed.timeStr || null);
        const mEnd = endParsed.dateStr ? `${endParsed.dateStr}T${endParsed.timeStr || '00:00'}:00` : (endParsed.timeStr || null);

        // Relevant State
        let relevantState: any = 'Relevant';
        const relRaw = String(row[fieldToHeader.relevantState] || '').toLowerCase();
        if (relRaw.includes('non')) relevantState = 'Non-Relevant';
        else if (relRaw.includes('rev')) relevantState = 'Under Review';

        let status: any = String(row[fieldToHeader.status] || '').trim();
        if (!status) {
          status = mEnd ? 'Closed' : 'New';
        }

        if (existingFault && duplicateStrategy === 'update') {
          tx.updateFault(existingFault.id, {
            reportDate,
            reportTime,
            structureNodeId,
            equipmentTypeId,
            equipmentNumber: equipNo,
            faultDescription: faultDesc,
            relevantState,
            assignedTechnicianId: targetTech ? targetTech.id : undefined,
            assignedTechnicianName: targetTech ? targetTech.name : techRaw,
            workDone: String(row[fieldToHeader.workDone] || '').trim(),
            correctiveAction: String(row[fieldToHeader.correctiveAction] || '').trim(),
            maintenanceStart: mStart,
            maintenanceEnd: mEnd,
            restorationDate: mEnd,
            status
          }, { id: user.id, name: user.fullName });
          recordsImported++;
        } else {
          tx.createFault({
            callId,
            callNumber,
            reportDate,
            reportTime,
            structureNodeId,
            equipmentTypeId,
            equipmentNumber: equipNo,
            faultDescription: faultDesc,
            relevantState,
            priority: 'Medium',
            assignedTechnicianId: targetTech ? targetTech.id : undefined,
            assignedTechnicianName: targetTech ? targetTech.name : techRaw,
            workDone: String(row[fieldToHeader.workDone] || '').trim(),
            correctiveAction: String(row[fieldToHeader.correctiveAction] || '').trim(),
            maintenanceStart: mStart,
            maintenanceEnd: mEnd,
            restorationDate: mEnd,
            status,
            notes: `Imported from Excel file: ${filename || 'upload'}`
          }, { id: user.id, name: user.fullName });
          recordsImported++;
        }
      });

      // Record Import Job
      const importJob: ImportJob = {
        id: jobId,
        filename: filename || 'Import.xlsx',
        user: user.id,
        userName: user.fullName,
        timestamp: new Date().toISOString(),
        recordsProcessed: rawRows.length,
        recordsImported,
        recordsRejected,
        recordsSkipped,
        warningsCount,
        status: recordsRejected === 0 ? 'completed' : (recordsImported > 0 ? 'partial' : 'failed')
      };

      tx.recordImportJob(importJob, jobErrors);

      tx.logAudit({
        user: user.fullName,
        userName: user.fullName,
        action: 'EXCEL_IMPORT',
        module: 'DataManagement',
        entity: 'ImportJob',
        entityId: jobId,
        newValue: `${recordsImported} imported, ${recordsRejected} rejected, ${recordsSkipped} skipped`,
        details: `Imported ${recordsImported} fault records from ${filename || 'Excel'}`
      });
    });

    res.json({
      jobId,
      recordsProcessed: rawRows.length,
      recordsImported,
      recordsRejected,
      recordsSkipped,
      warningsCount,
      errors: jobErrors
    });
  } catch (err: any) {
    res.status(500).json({ error: `Import transaction failed: ${err.message}` });
  }
});

// 4. Download Import Error Report
importExportRouter.get('/jobs/:jobId/errors/export', requireAuth, (req, res) => {
  const errors = store.getImportErrors(req.params.jobId);
  const rows = errors.map(e => ({
    'Row Number': e.rowNumber,
    'Column': e.column,
    'Value': e.value,
    'Problem': e.problem,
    'Suggested Action': e.suggestedAction
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Errors');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Import_Errors_${req.params.jobId}.xlsx`);
  res.send(buffer);
});

// 5. Mapping templates
importExportRouter.get('/mappings', requireAuth, (req, res) => {
  res.json({ templates: store.getMappingTemplates() });
});

importExportRouter.post('/mappings', requireAuth, requirePermission('import:execute'), (req, res) => {
  const { name, description, mappings } = req.body;
  if (!name || !mappings) {
    return res.status(400).json({ error: 'Name and mappings are required' });
  }
  const tpl = store.saveMappingTemplate({ name, description, mappings });
  res.status(201).json({ template: tpl });
});

// 6. Export Filtered Faults to Excel
importExportRouter.get('/export/faults', requireAuth, requirePermission('reports:export'), (req, res) => {
  const {
    search,
    structureNodeId,
    equipmentTypeId,
    equipmentNumber,
    technicianId,
    status,
    relevantState,
    priority,
    startDate,
    endDate
  } = req.query;

  const { faults } = store.getFaults({
    search: search as string,
    structureNodeId: structureNodeId as string,
    equipmentTypeId: equipmentTypeId as string,
    equipmentNumber: equipmentNumber as string,
    technicianId: technicianId as string,
    status: status as string,
    relevantState: relevantState as string,
    priority: priority as string,
    startDate: startDate as string,
    endDate: endDate as string,
    limit: 100000
  });

  const nodes = store.getStructureNodes();
  const eqTypes = store.getEquipmentTypes();
  const nodeMap = new Map(nodes.map(n => [n.id, n.name]));
  const eqTypeMap = new Map(eqTypes.map(t => [t.id, t.code]));

  const rows = faults.map(f => ({
    'Call ID': f.callId,
    'Call Number': f.callNumber,
    'Report Date': f.reportDate,
    'Report Time': f.reportTime,
    'Location': nodeMap.get(f.structureNodeId) || f.structureNodeId,
    'Equipment Type': eqTypeMap.get(f.equipmentTypeId) || f.equipmentTypeId,
    'Equipment Number': f.equipmentNumber,
    'Fault Description': f.faultDescription,
    'Priority': f.priority,
    'Relevant State': f.relevantState,
    'Assigned Technician': f.assignedTechnicianName || 'Unassigned',
    'Work Done': f.workDone || '',
    'Corrective Action': f.correctiveAction || '',
    'Maintenance Start': f.maintenanceStart || '',
    'Maintenance End': f.maintenanceEnd || '',
    'TTR (Minutes)': f.ttrMinutes,
    'Downtime (Minutes)': f.downtimeMinutes,
    'Status': f.status,
    'Notes': f.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fault History');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Fault_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  res.send(buffer);
});
