import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../services/auth.ts';

export const structureRouter = Router();

// Get hierarchy levels
structureRouter.get('/levels', requireAuth, (req, res) => {
  const levels = store.getStructureLevels();
  res.json({ levels });
});

// Update all hierarchy levels (reconfiguration)
structureRouter.put('/levels', requireAuth, requirePermission('structure:manage'), (req: AuthenticatedRequest, res) => {
  const { levels } = req.body;
  if (!levels || !Array.isArray(levels)) {
    return res.status(400).json({ error: 'Levels array is required' });
  }

  try {
    const updated = store.setStructureLevels(levels, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ levels: updated, message: 'Structure hierarchy updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update structure levels' });
  }
});

// Update single level (e.g., rename Line -> City, or add custom fields)
structureRouter.patch('/levels/:id', requireAuth, requirePermission('structure:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateStructureLevel(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ level: updated, message: 'Level updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update level' });
  }
});

// Get structure nodes
structureRouter.get('/nodes', requireAuth, (req, res) => {
  const { levelId, parentId, status } = req.query;
  let nodes = store.getStructureNodes();

  if (levelId) {
    nodes = nodes.filter(n => n.structureLevelId === levelId);
  }
  if (parentId !== undefined) {
    nodes = nodes.filter(n => (parentId === 'root' || parentId === '' || parentId === 'null') ? !n.parentNodeId : n.parentNodeId === parentId);
  }
  if (status) {
    nodes = nodes.filter(n => n.status === status);
  }

  res.json({ nodes });
});

// Create structure node
structureRouter.post('/nodes', requireAuth, requirePermission('structure:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const node = store.createStructureNode(req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.status(201).json({ node, message: 'Structure node created successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create structure node' });
  }
});

// Update structure node
structureRouter.put('/nodes/:id', requireAuth, requirePermission('structure:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateStructureNode(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ node: updated, message: 'Structure node updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update structure node' });
  }
});

// Deactivate structure node
structureRouter.patch('/nodes/:id/deactivate', requireAuth, requirePermission('structure:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.deactivateStructureNode(req.params.id, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ node: updated, message: 'Structure node deactivated' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to deactivate structure node' });
  }
});
