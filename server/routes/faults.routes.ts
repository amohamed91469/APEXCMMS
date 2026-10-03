import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../services/auth.ts';
import { FaultStatus } from '../../src/types/cmms.ts';

export const faultsRouter = Router();

// Search and filter faults
faultsRouter.get('/', requireAuth, requirePermission('faults:view'), (req, res) => {
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
    endDate,
    limit,
    offset,
    sortBy,
    sortOrder
  } = req.query;

  const result = store.getFaults({
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
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
    sortBy: sortBy as string,
    sortOrder: (sortOrder as 'asc' | 'desc') || 'desc'
  });

  res.json(result);
});

// Get single fault with full history
faultsRouter.get('/:id', requireAuth, requirePermission('faults:view'), (req, res) => {
  const fault = store.getFaultById(req.params.id);
  if (!fault) {
    return res.status(404).json({ error: 'Fault record not found' });
  }

  const history = store.getFaultStatusHistory(fault.id);
  res.json({ fault, history });
});

// Create fault
faultsRouter.post('/', requireAuth, requirePermission('faults:create'), (req: AuthenticatedRequest, res) => {
  try {
    const fault = store.createFault(req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.status(201).json({ fault, message: 'Fault recorded successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create fault' });
  }
});

// Update fault
faultsRouter.put('/:id', requireAuth, requirePermission('faults:edit'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateFault(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ fault: updated, message: 'Fault updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update fault' });
  }
});

// Status transition endpoint
faultsRouter.patch('/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const { status, waitingReason, notes, workDone, correctiveAction, maintenanceStart, maintenanceEnd, restorationDate } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'New status is required' });
  }

  const user = req.user!;
  // Check permission depending on status transition
  if (status === 'Closed' && !user.permissions.includes('faults:close') && user.roleId !== 'role_admin') {
    return res.status(403).json({ error: 'Permission denied: faults:close required' });
  }
  if (status === 'Reopened' && !user.permissions.includes('faults:reopen') && user.roleId !== 'role_admin') {
    return res.status(403).json({ error: 'Permission denied: faults:reopen required' });
  }
  if (status === 'Resolved' && !user.permissions.includes('faults:resolve') && user.roleId !== 'role_admin') {
    return res.status(403).json({ error: 'Permission denied: faults:resolve required' });
  }

  try {
    const updates: any = {
      status: status as FaultStatus,
      waitingReason,
      notes
    };
    if (workDone) updates.workDone = workDone;
    if (correctiveAction) updates.correctiveAction = correctiveAction;
    if (maintenanceStart !== undefined) updates.maintenanceStart = maintenanceStart;
    if (maintenanceEnd !== undefined) updates.maintenanceEnd = maintenanceEnd;
    if (restorationDate) updates.restorationDate = restorationDate;

    // If resolving or closing without restorationDate set, default to maintenanceEnd or now
    if ((status === 'Resolved' || status === 'Closed') && !restorationDate) {
      updates.restorationDate = maintenanceEnd || new Date().toISOString();
    }

    const updated = store.updateFault(req.params.id, updates, {
      id: user.id,
      name: user.fullName
    });

    const history = store.getFaultStatusHistory(updated.id);
    res.json({ fault: updated, history, message: `Status updated to ${status}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update status' });
  }
});
