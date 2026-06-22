import { getDb } from './db.js';

export interface AccountRecord {
  id: string;
  name: string;
  niche?: string;
  type?: string;
  metaIgBusinessId?: string;
  metaPageId?: string;
  brandJson?: string;
  strategyJson?: string;
  onboardingJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const upsertAccount = (account: AccountRecord): void => {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO accounts (id, name, niche, type, meta_ig_business_id, meta_page_id, brand_json, strategy_json, onboarding_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      niche=excluded.niche,
      type=excluded.type,
      meta_ig_business_id=excluded.meta_ig_business_id,
      meta_page_id=excluded.meta_page_id,
      brand_json=excluded.brand_json,
      strategy_json=excluded.strategy_json,
      onboarding_json=excluded.onboarding_json,
      updated_at=datetime('now')
  `);
  stmt.run(
    account.id,
    account.name,
    account.niche ?? null,
    account.type ?? null,
    account.metaIgBusinessId ?? null,
    account.metaPageId ?? null,
    account.brandJson ?? null,
    account.strategyJson ?? null,
    account.onboardingJson ?? null,
  );
};

export const getAccount = (id: string): AccountRecord | undefined => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    id: String(row.id),
    name: String(row.name),
    niche: row.niche ? String(row.niche) : undefined,
    type: row.type ? String(row.type) : undefined,
    metaIgBusinessId: row.meta_ig_business_id ? String(row.meta_ig_business_id) : undefined,
    metaPageId: row.meta_page_id ? String(row.meta_page_id) : undefined,
    brandJson: row.brand_json ? String(row.brand_json) : undefined,
    strategyJson: row.strategy_json ? String(row.strategy_json) : undefined,
    onboardingJson: row.onboarding_json ? String(row.onboarding_json) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
};

export const listAccounts = (): AccountRecord[] => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM accounts ORDER BY name').all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    niche: row.niche ? String(row.niche) : undefined,
    type: row.type ? String(row.type) : undefined,
    metaIgBusinessId: row.meta_ig_business_id ? String(row.meta_ig_business_id) : undefined,
    metaPageId: row.meta_page_id ? String(row.meta_page_id) : undefined,
    brandJson: row.brand_json ? String(row.brand_json) : undefined,
    strategyJson: row.strategy_json ? String(row.strategy_json) : undefined,
    onboardingJson: row.onboarding_json ? String(row.onboarding_json) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }));
};

export const deleteAccount = (id: string): void => {
  const db = getDb();
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
};
