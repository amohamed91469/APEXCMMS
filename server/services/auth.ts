import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../db/store.ts';
import { User, Role } from '../../src/types/cmms.ts';

// Active session store with persistence
interface SessionData {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

const sessions = new Map<string, SessionData>();

// Load persisted sessions on startup
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    const now = Date.now();
    for (const [token, sess] of Object.entries(data as Record<string, SessionData>)) {
      if (sess.expiresAt > now) {
        sessions.set(token, sess);
      }
    }
  }
} catch (err) {
  console.warn('Could not load sessions file, starting with empty sessions:', err);
}

function saveSessions() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const obj: Record<string, SessionData> = {};
    for (const [token, sess] of sessions.entries()) {
      obj[token] = sess;
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist sessions:', err);
  }
}

// Session TTL: 14 days
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  user?: User & { permissions: string[] };
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  sessions.set(token, {
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  saveSessions();
  return token;
}

export function destroySession(token: string) {
  sessions.delete(token);
  saveSessions();
}

export function destroyAllSessions() {
  sessions.clear();
  saveSessions();
}

export function getUserFromToken(token?: string): (User & { permissions: string[] }) | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    saveSessions();
    return null;
  }

  const rawUser = store.getUserById(session.userId);
  if (!rawUser || rawUser.status !== 'active') {
    return null;
  }

  const roles = store.getRoles();
  const role = roles.find(r => r.id === rawUser.roleId);
  const permissions = role?.permissions || [];

  const { passwordHash: _, ...safeUser } = rawUser;
  return {
    ...safeUser,
    roleName: role?.name || rawUser.roleId,
    permissions
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Valid login session required.' });
  }

  req.user = user;
  next();
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Role admin or wildcard permission has all permissions
    const isSuper = req.user.roleId === 'role_admin' || req.user.permissions?.includes('*');
    if (isSuper || req.user.permissions?.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden. Missing required permission: "${permission}"`
    });
  };
}

export function requireAdminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const isSuper = req.user.roleId === 'role_admin' || req.user.permissions?.includes('*');
  const hasPerm = req.user.permissions?.includes('users:manage') || req.user.permissions?.includes('roles:manage');

  if (!isSuper && !hasPerm) {
    return res.status(403).json({
      error: 'Access denied. Administrative privileges required to manage users and roles.'
    });
  }
  next();
}
