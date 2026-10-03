import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission } from '../services/auth.ts';

export const analyticsRouter = Router();

analyticsRouter.get('/dashboard', requireAuth, (req, res) => {
  const { startDate, endDate, structureNodeId, equipmentTypeId, relevantState } = req.query;

  const { faults } = store.getFaults({
    startDate: startDate as string,
    endDate: endDate as string,
    structureNodeId: structureNodeId as string,
    equipmentTypeId: equipmentTypeId as string,
    relevantState: relevantState as string,
    limit: 10000
  });

  const total = faults.length;
  const open = faults.filter(f => ['New', 'Assigned', 'In Progress', 'Waiting'].includes(f.status)).length;
  const resolved = faults.filter(f => f.status === 'Resolved').length;
  const closed = faults.filter(f => f.status === 'Closed').length;
  const reopened = faults.filter(f => f.status === 'Reopened').length;

  const relevant = faults.filter(f => f.relevantState === 'Relevant').length;
  const nonRelevant = faults.filter(f => f.relevantState === 'Non-Relevant').length;
  const underReview = faults.filter(f => f.relevantState === 'Under Review').length;

  // TTR calculations (only for faults with recorded TTR > 0)
  const faultsWithTTR = faults.filter(f => f.ttrMinutes > 0);
  const totalTTR = faultsWithTTR.reduce((acc, f) => acc + f.ttrMinutes, 0);
  const avgTTR = faultsWithTTR.length > 0 ? Math.round(totalTTR / faultsWithTTR.length) : 0;

  // Downtime calculations
  const totalDowntime = faults.reduce((acc, f) => acc + (f.downtimeMinutes || 0), 0);
  const avgDowntime = total > 0 ? Math.round(totalDowntime / total) : 0;

  // Trend by date (sorted chronological)
  const trendMap: Record<string, { date: string; total: number; relevant: number; downtime: number }> = {};
  faults.forEach(f => {
    const d = f.reportDate || 'Unknown';
    if (!trendMap[d]) {
      trendMap[d] = { date: d, total: 0, relevant: 0, downtime: 0 };
    }
    trendMap[d].total += 1;
    if (f.relevantState === 'Relevant') trendMap[d].relevant += 1;
    trendMap[d].downtime += f.downtimeMinutes || 0;
  });
  const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  // Breakdown by Equipment Type
  const eqTypes = store.getEquipmentTypes();
  const eqTypeMap: Record<string, { code: string; name: string; count: number; totalDowntime: number }> = {};
  eqTypes.forEach(t => {
    eqTypeMap[t.id] = { code: t.code, name: t.name, count: 0, totalDowntime: 0 };
  });
  faults.forEach(f => {
    if (eqTypeMap[f.equipmentTypeId]) {
      eqTypeMap[f.equipmentTypeId].count += 1;
      eqTypeMap[f.equipmentTypeId].totalDowntime += f.downtimeMinutes || 0;
    } else {
      // Find by code if mapped
      const t = eqTypes.find(x => x.code === f.equipmentTypeId);
      if (t && eqTypeMap[t.id]) {
        eqTypeMap[t.id].count += 1;
        eqTypeMap[t.id].totalDowntime += f.downtimeMinutes || 0;
      }
    }
  });
  const byEquipmentType = Object.values(eqTypeMap).filter(t => t.count > 0);

  // Breakdown by Structure Node
  const nodes = store.getStructureNodes();
  const nodeMap: Record<string, { id: string; code: string; name: string; count: number; downtime: number }> = {};
  nodes.forEach(n => {
    nodeMap[n.id] = { id: n.id, code: n.code, name: n.name, count: 0, downtime: 0 };
  });
  faults.forEach(f => {
    if (nodeMap[f.structureNodeId]) {
      nodeMap[f.structureNodeId].count += 1;
      nodeMap[f.structureNodeId].downtime += f.downtimeMinutes || 0;
    }
  });
  const byStructureNode = Object.values(nodeMap).filter(n => n.count > 0).sort((a, b) => b.count - a.count);

  // Breakdown by Technician
  const techMap: Record<string, { name: string; count: number; resolvedCount: number; avgTTR: number; totalTTR: number }> = {};
  faults.forEach(f => {
    const techName = f.assignedTechnicianName || 'Unassigned';
    if (!techMap[techName]) {
      techMap[techName] = { name: techName, count: 0, resolvedCount: 0, avgTTR: 0, totalTTR: 0 };
    }
    techMap[techName].count += 1;
    if (f.status === 'Resolved' || f.status === 'Closed') {
      techMap[techName].resolvedCount += 1;
      techMap[techName].totalTTR += f.ttrMinutes;
    }
  });
  const byTechnician = Object.values(techMap).map(t => ({
    ...t,
    avgTTR: t.resolvedCount > 0 ? Math.round(t.totalTTR / t.resolvedCount) : 0
  })).sort((a, b) => b.count - a.count);

  // Top recurring failures
  const recurringMap: Record<string, { description: string; equipmentType: string; count: number; totalDowntime: number }> = {};
  faults.forEach(f => {
    const key = `${f.equipmentTypeId}:::${f.faultDescription.trim().toLowerCase()}`;
    if (!recurringMap[key]) {
      const eqType = eqTypes.find(t => t.id === f.equipmentTypeId)?.code || f.equipmentTypeId;
      recurringMap[key] = {
        description: f.faultDescription,
        equipmentType: eqType,
        count: 0,
        totalDowntime: 0
      };
    }
    recurringMap[key].count += 1;
    recurringMap[key].totalDowntime += f.downtimeMinutes || 0;
  });
  const recurringFailures = Object.values(recurringMap).sort((a, b) => b.count - a.count).slice(0, 10);

  // Pareto distribution
  const totalFaultsCount = total || 1;
  let runningPercent = 0;
  const pareto = recurringFailures.map(rf => {
    const pct = Math.round((rf.count / totalFaultsCount) * 100);
    runningPercent += pct;
    return {
      description: rf.description,
      count: rf.count,
      percent: pct,
      cumulativePercent: Math.min(100, runningPercent)
    };
  });

  res.json({
    kpis: {
      total,
      open,
      resolved,
      closed,
      reopened,
      relevant,
      nonRelevant,
      underReview,
      avgTTR,
      avgDowntime,
      totalDowntime
    },
    trend,
    byEquipmentType,
    byStructureNode,
    byTechnician,
    recurringFailures,
    pareto
  });
});
