/**
 * User Accounts — Multi-tenant.
 *
 * Cada User puede tener N cuentas de Instagram asociadas (BrandProfile).
 * Plans definen cuántas cuentas IG puede tener.
 *
 * Sin dependencias externas: usa node:crypto (scrypt) para passwords +
 * file-based store en data/auth/.
 */

import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../agent/logger.js';

const AUTH_DIR = path.resolve('data/auth');
const USERS_FILE = path.join(AUTH_DIR, 'users.json');
const SESSIONS_FILE = path.join(AUTH_DIR, 'sessions.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'pro' | 'business' | 'enterprise';

export type UserStatus = 'active' | 'suspended' | 'closed';

export interface User {
  id: string;
  email: string; // identificador único de login
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
  plan: PlanTier;
  status: UserStatus;
  brandIds: string[]; // IDs de BrandProfile (cuentas Instagram)
  activeBrandId?: string; // cuenta IG actualmente seleccionada
  createdAt: string;
  lastLoginAt?: string;
  closedAt?: string;
  metadata: Record<string, unknown>;
}

export interface Session {
  token: string; // 64 hex chars
  userId: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ip?: string;
}

export interface PlanLimits {
  maxBrands: number; // máx cuentas IG por user
  maxPostsPerMonth: number;
  maxAdsCampaigns: number;
  featuresEnabled: string[];
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxBrands: 1,
    maxPostsPerMonth: 30,
    maxAdsCampaigns: 0,
    featuresEnabled: ['basic-publishing', 'basic-analytics'],
  },
  pro: {
    maxBrands: 5,
    maxPostsPerMonth: 300,
    maxAdsCampaigns: 5,
    featuresEnabled: ['basic-publishing', 'basic-analytics', 'meta-ads', 'rl-cycles', 'multi-format'],
  },
  business: { maxBrands: 20, maxPostsPerMonth: 2000, maxAdsCampaigns: 50, featuresEnabled: ['*'] },
  enterprise: { maxBrands: 100, maxPostsPerMonth: -1, maxAdsCampaigns: -1, featuresEnabled: ['*'] },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureAuthDir = async (): Promise<void> => {
  await fs.mkdir(AUTH_DIR, { recursive: true });
};

const loadUsers = async (): Promise<User[]> => {
  try {
    return JSON.parse(await fs.readFile(USERS_FILE, 'utf-8')) as User[];
  } catch {
    return [];
  }
};

const saveUsers = async (users: User[]): Promise<void> => {
  await ensureAuthDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
};

const loadSessions = async (): Promise<Session[]> => {
  try {
    return JSON.parse(await fs.readFile(SESSIONS_FILE, 'utf-8')) as Session[];
  } catch {
    return [];
  }
};

const saveSessions = async (sessions: Session[]): Promise<void> => {
  await ensureAuthDir();
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
};

const hashPassword = (password: string, salt?: string): { hash: string; salt: string } => {
  const saltUsed = salt ?? randomBytes(16).toString('hex');
  const hash = scryptSync(password, saltUsed, 64).toString('hex');
  return { hash, salt: saltUsed };
};

const verifyPassword = (password: string, hash: string, salt: string): boolean => {
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
};

const normalizeEmail = (email: string): string => email.toLowerCase().trim();

// ── User CRUD ─────────────────────────────────────────────────────────────────

export const registerUser = async (params: {
  email: string;
  password: string;
  displayName: string;
  plan?: PlanTier;
}): Promise<User> => {
  if (!params.email.includes('@')) throw new Error('Email inválido');
  if (params.password.length < 8) throw new Error('Password mínimo 8 caracteres');

  const users = await loadUsers();
  const email = normalizeEmail(params.email);
  if (users.find((u) => u.email === email && u.status !== 'closed')) {
    throw new Error('Email ya registrado');
  }

  const { hash, salt } = hashPassword(params.password);
  const user: User = {
    id: `usr-${randomUUID()}`,
    email,
    displayName: params.displayName,
    passwordHash: hash,
    passwordSalt: salt,
    plan: params.plan ?? 'free',
    status: 'active',
    brandIds: [],
    createdAt: new Date().toISOString(),
    metadata: {},
  };

  users.push(user);
  await saveUsers(users);

  log.info('[auth] user registered', { userId: user.id, plan: user.plan });

  // Auto-crear brand default para que el user pueda empezar a usar el sistema
  try {
    const { buildMinimalBrandProfile } = await import('./brandHelpers.js');
    const { saveBrandProfile } = await import('../config/accounts.js');
    const defaultBrandId = `default-${user.id.replace('usr-', '').slice(0, 8)}`;
    const profile = buildMinimalBrandProfile({
      id: defaultBrandId,
      name: params.displayName,
      niche: 'general',
    });
    saveBrandProfile(defaultBrandId, profile);
    user.brandIds.push(defaultBrandId);
    user.activeBrandId = defaultBrandId;
    await saveUsers(users);
    log.info('[auth] default brand auto-created', { userId: user.id, brandId: defaultBrandId });
  } catch (err) {
    log.warn('[auth] auto-create default brand failed', { err: String(err) });
  }

  return user;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const users = await loadUsers();
  return users.find((u) => u.email === normalizeEmail(email) && u.status !== 'closed') ?? null;
};

export const findUserById = async (userId: string): Promise<User | null> => {
  const users = await loadUsers();
  return users.find((u) => u.id === userId && u.status !== 'closed') ?? null;
};

export const updateUser = async (userId: string, patch: Partial<User>): Promise<User | null> => {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  users[idx] = { ...users[idx]!, ...patch, id: users[idx]!.id };
  await saveUsers(users);
  return users[idx]!;
};

/** Cerrar cuenta de usuario (soft delete + revoke sessions). */
export const closeUserAccount = async (userId: string): Promise<boolean> => {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;

  users[idx]!.status = 'closed';
  users[idx]!.closedAt = new Date().toISOString();
  await saveUsers(users);

  // Revocar todas las sessions del user
  const sessions = await loadSessions();
  const remaining = sessions.filter((s) => s.userId !== userId);
  await saveSessions(remaining);

  log.warn('[auth] user account closed', { userId });
  return true;
};

// ── Sessions ─────────────────────────────────────────────────────────────────

export const login = async (
  email: string,
  password: string,
  meta: { userAgent?: string; ip?: string } = {},
): Promise<{ session: Session; user: User } | null> => {
  const user = await findUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) return null;
  if (user.status !== 'active') return null;

  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  const session: Session = {
    token,
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
    userAgent: meta.userAgent,
    ip: meta.ip,
  };

  const sessions = await loadSessions();
  sessions.push(session);
  // Limpiar sessions expiradas oportunisticamente
  const valid = sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  await saveSessions(valid);

  await updateUser(user.id, { lastLoginAt: session.createdAt });

  log.info('[auth] login', { userId: user.id });
  return { session, user };
};

export const logout = async (token: string): Promise<boolean> => {
  const sessions = await loadSessions();
  const remaining = sessions.filter((s) => s.token !== token);
  if (remaining.length === sessions.length) return false;
  await saveSessions(remaining);
  return true;
};

export const getSessionUser = async (token: string | undefined): Promise<User | null> => {
  if (!token) return null;
  const sessions = await loadSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return findUserById(session.userId);
};

// ── Brand (cuenta IG) management ──────────────────────────────────────────────

export const addBrandToUser = async (userId: string, brandId: string): Promise<User | null> => {
  const user = await findUserById(userId);
  if (!user) return null;

  const limits = PLAN_LIMITS[user.plan];
  if (limits.maxBrands !== -1 && user.brandIds.length >= limits.maxBrands) {
    throw new Error(`Plan ${user.plan} permite máximo ${limits.maxBrands} cuentas IG. Upgrade para agregar más.`);
  }
  if (user.brandIds.includes(brandId)) return user;

  user.brandIds.push(brandId);
  if (!user.activeBrandId) user.activeBrandId = brandId;
  return updateUser(userId, { brandIds: user.brandIds, activeBrandId: user.activeBrandId });
};

export const removeBrandFromUser = async (userId: string, brandId: string): Promise<User | null> => {
  const user = await findUserById(userId);
  if (!user) return null;

  user.brandIds = user.brandIds.filter((id) => id !== brandId);
  if (user.activeBrandId === brandId) {
    user.activeBrandId = user.brandIds[0];
  }
  return updateUser(userId, { brandIds: user.brandIds, activeBrandId: user.activeBrandId });
};

export const setActiveBrand = async (userId: string, brandId: string): Promise<User | null> => {
  const user = await findUserById(userId);
  if (!user) return null;
  if (!user.brandIds.includes(brandId)) {
    throw new Error('Cuenta IG no pertenece a este usuario');
  }
  return updateUser(userId, { activeBrandId: brandId });
};

export const userOwnsBrand = async (userId: string, brandId: string): Promise<boolean> => {
  const user = await findUserById(userId);
  return user?.brandIds.includes(brandId) ?? false;
};

// ── Plan helpers ──────────────────────────────────────────────────────────────

export const canAddBrand = async (
  userId: string,
): Promise<{ canAdd: boolean; reason?: string; current: number; max: number }> => {
  const user = await findUserById(userId);
  if (!user) return { canAdd: false, reason: 'Usuario no existe', current: 0, max: 0 };
  const limits = PLAN_LIMITS[user.plan];
  const max = limits.maxBrands;
  const current = user.brandIds.length;
  if (max === -1) return { canAdd: true, current, max };
  if (current >= max) return { canAdd: false, reason: `Plan ${user.plan} permite máximo ${max}`, current, max };
  return { canAdd: true, current, max };
};

export const upgradePlan = async (userId: string, newPlan: PlanTier): Promise<User | null> => {
  log.info('[auth] plan upgrade', { userId, newPlan });
  return updateUser(userId, { plan: newPlan });
};

/** Vista resumida del user (sin info sensible). */
export const sanitizeUser = (user: User): Omit<User, 'passwordHash' | 'passwordSalt'> => {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = user;
  void _h;
  void _s;
  return safe;
};

/** Lista todos los users (admin). Sin passwords. */
export const listUsers = async (): Promise<Array<ReturnType<typeof sanitizeUser>>> => {
  const users = await loadUsers();
  return users.map(sanitizeUser);
};

/** Encuentra usuarios que tienen un brand asociado (1 brand puede ser shared en planes business). */
export const findUsersByBrandId = async (brandId: string): Promise<User[]> => {
  const users = await loadUsers();
  return users.filter((u) => u.status === 'active' && u.brandIds.includes(brandId));
};

/** Estadísticas para dashboard admin. */
export const getUserStats = async (): Promise<{
  total: number;
  active: number;
  suspended: number;
  closed: number;
  byPlan: Record<PlanTier, number>;
  totalBrands: number;
}> => {
  const users = await loadUsers();
  const byPlan: Record<PlanTier, number> = { free: 0, pro: 0, business: 0, enterprise: 0 };
  let totalBrands = 0;
  for (const u of users) {
    byPlan[u.plan]++;
    totalBrands += u.brandIds.length;
  }
  return {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
    closed: users.filter((u) => u.status === 'closed').length,
    byPlan,
    totalBrands,
  };
};
