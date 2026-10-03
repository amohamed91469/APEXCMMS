import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../services/auth.ts';

export const masterDataRouter = Router();

masterDataRouter.use(requireAuth);

// Technicians
masterDataRouter.get('/technicians', (req, res) => {
  res.json({ technicians: store.getTechnicians() });
});

masterDataRouter.post('/technicians', requirePermission('masterdata:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const tech = store.createTechnician(req.body, { id: req.user!.id, name: req.user!.fullName });
    res.status(201).json({ technician: tech });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create technician' });
  }
});

masterDataRouter.put('/technicians/:id', requirePermission('masterdata:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateTechnician(req.params.id, req.body, { id: req.user!.id, name: req.user!.fullName });
    res.json({ technician: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update technician' });
  }
});

// Fault Categories
masterDataRouter.get('/categories', (req, res) => {
  res.json({ categories: store.getFaultCategories() });
});

masterDataRouter.post('/categories', requirePermission('masterdata:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const cat = store.createFaultCategory(req.body, { id: req.user!.id, name: req.user!.fullName });
    res.status(201).json({ category: cat });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create category' });
  }
});

// Fault Description Templates
masterDataRouter.get('/descriptions', (req, res) => {
  res.json({ descriptions: store.getFaultDescriptions() });
});

masterDataRouter.post('/descriptions', requirePermission('masterdata:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const desc = store.createFaultDescription(req.body, { id: req.user!.id, name: req.user!.fullName });
    res.status(201).json({ description: desc });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create description' });
  }
});

// Corrective Action Templates
masterDataRouter.get('/corrective-actions', (req, res) => {
  res.json({ correctiveActions: store.getCorrectiveActions() });
});

masterDataRouter.post('/corrective-actions', requirePermission('masterdata:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const act = store.createCorrectiveAction(req.body, { id: req.user!.id, name: req.user!.fullName });
    res.status(201).json({ correctiveAction: act });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create corrective action' });
  }
});
