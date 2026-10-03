import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requireAdminOnly, AuthenticatedRequest } from '../services/auth.ts';

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.use(requireAdminOnly);

// List users
usersRouter.get('/', (req, res) => {
  const users = store.getUsers();
  res.json({ users });
});

// Create user
usersRouter.post('/', (req: AuthenticatedRequest, res) => {
  const { username, fullName, email, phone, employeeId, roleId, password } = req.body;
  if (!username || !fullName || !email || !roleId || !password) {
    return res.status(400).json({ error: 'Username, full name, email, role, and password are required.' });
  }

  try {
    const newUser = store.createUser({
      username: username.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone,
      employeeId,
      roleId,
      password
    }, {
      id: req.user!.id,
      name: req.user!.fullName
    });

    res.status(201).json({ user: newUser, message: 'User created successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
});

// Update user
usersRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateUser(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ user: updated, message: 'User updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});

// Roles
usersRouter.get('/roles/list', (req, res) => {
  const roles = store.getRoles();
  res.json({ roles });
});

usersRouter.post('/roles', (req: AuthenticatedRequest, res) => {
  const { name, description, permissions } = req.body;
  if (!name || !permissions) {
    return res.status(400).json({ error: 'Role name and permissions are required' });
  }

  try {
    const role = store.createRole({ name, description: description || '', permissions }, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.status(201).json({ role });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create role' });
  }
});

usersRouter.put('/roles/:id', (req: AuthenticatedRequest, res) => {
  try {
    const role = store.updateRole(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ role });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update role' });
  }
});
