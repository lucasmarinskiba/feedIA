import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const USERS_FILE = resolve('data/runtime/users.json');

export interface UserRecord {
  handle: string;
  displayName?: string;
  canvaConnected: boolean;
  createdAt: string;
}

interface UsersDb {
  users: Record<string, UserRecord>;
}

const loadDb = (): UsersDb => {
  if (!existsSync(USERS_FILE)) return { users: {} };
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf-8')) as UsersDb;
  } catch {
    return { users: {} };
  }
};

const saveDb = (db: UsersDb): void => {
  mkdirSync(dirname(USERS_FILE), { recursive: true });
  writeFileSync(USERS_FILE, JSON.stringify(db, null, 2), 'utf-8');
};

export const ensureUser = (handle: string, displayName?: string): UserRecord => {
  const db = loadDb();
  const key = handle.toLowerCase().trim();
  if (!db.users[key]) {
    db.users[key] = {
      handle: key,
      displayName: displayName ?? key,
      canvaConnected: false,
      createdAt: new Date().toISOString(),
    };
    saveDb(db);
  }
  return db.users[key]!;
};

export const getUser = (handle: string): UserRecord | undefined => {
  const db = loadDb();
  return db.users[handle.toLowerCase().trim()];
};

export const listUsers = (): UserRecord[] => {
  const db = loadDb();
  return Object.values(db.users);
};

export const updateUser = (handle: string, patch: Partial<Omit<UserRecord, 'handle'>>): UserRecord | undefined => {
  const db = loadDb();
  const key = handle.toLowerCase().trim();
  if (!db.users[key]) return undefined;
  db.users[key] = { ...db.users[key]!, ...patch };
  saveDb(db);
  return db.users[key];
};

export const deleteUser = (handle: string): boolean => {
  const db = loadDb();
  const key = handle.toLowerCase().trim();
  if (!db.users[key]) return false;
  delete db.users[key];
  saveDb(db);
  return true;
};
