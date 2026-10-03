import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../services/auth.ts';

export const equipmentRouter = Router();

// Equipment Types
equipmentRouter.get('/types', requireAuth, (req, res) => {
  const types = store.getEquipmentTypes();
  res.json({ types });
});

equipmentRouter.post('/types', requireAuth, requirePermission('masterdata:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const type = store.createEquipmentType(req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.status(201).json({ type, message: 'Equipment type created successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create equipment type' });
  }
});

equipmentRouter.put('/types/:id', requireAuth, requirePermission('masterdata:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateEquipmentType(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ type: updated, message: 'Equipment type updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update equipment type' });
  }
});

// Equipment Items
equipmentRouter.get('/', requireAuth, (req, res) => {
  const { structureNodeId, equipmentTypeId, status, search } = req.query;
  let items = store.getEquipment();

  if (structureNodeId) {
    items = items.filter(e => e.structureNodeId === structureNodeId);
  }
  if (equipmentTypeId) {
    items = items.filter(e => e.equipmentTypeId === equipmentTypeId);
  }
  if (status) {
    items = items.filter(e => e.status === status);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    items = items.filter(e =>
      e.equipmentNumber.toLowerCase().includes(q) ||
      (e.serialNumber && e.serialNumber.toLowerCase().includes(q)) ||
      (e.manufacturer && e.manufacturer.toLowerCase().includes(q)) ||
      (e.model && e.model.toLowerCase().includes(q))
    );
  }

  res.json({ equipment: items });
});

equipmentRouter.post('/', requireAuth, requirePermission('equipment:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const item = store.createEquipment(req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.status(201).json({ equipment: item, message: 'Equipment created successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create equipment' });
  }
});

equipmentRouter.put('/:id', requireAuth, requirePermission('equipment:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateEquipment(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ equipment: updated, message: 'Equipment updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update equipment' });
  }
});

// Equipment Maintenance History
equipmentRouter.get('/:id/history', requireAuth, (req, res) => {
  const eq = store.getEquipment().find(e => e.id === req.params.id);
  if (!eq) return res.status(404).json({ error: 'Equipment not found' });

  const { faults } = store.getFaults({
    equipmentNumber: eq.equipmentNumber,
    limit: 1000
  });

  res.json({ equipment: eq, history: faults });
});
