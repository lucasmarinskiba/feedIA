export const CREATE_RUNS_TABLE = `
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    intent TEXT NOT NULL,
    input_data TEXT,
    selected_skill TEXT,
    selected_agent TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    confidence REAL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_ms INTEGER
  )
`;

export const CREATE_OUTPUTS_TABLE = `
  CREATE TABLE IF NOT EXISTS outputs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id),
    generator_type TEXT NOT NULL,
    content_type TEXT,
    content TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  )
`;

export const CREATE_SKILL_CACHE_TABLE = `
  CREATE TABLE IF NOT EXISTS skill_cache (
    skill_name TEXT PRIMARY KEY,
    skill_type TEXT NOT NULL,
    content TEXT NOT NULL,
    frontmatter TEXT,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
  )
`;

export const CREATE_STEP_RESULTS_TABLE = `
  CREATE TABLE IF NOT EXISTS step_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id),
    step_index INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    status TEXT NOT NULL,
    output_data TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  )
`;

export const SCHEMA_MIGRATIONS = [
  { version: 1, sql: CREATE_RUNS_TABLE },
  { version: 2, sql: CREATE_OUTPUTS_TABLE },
  { version: 3, sql: CREATE_SKILL_CACHE_TABLE },
  { version: 4, sql: CREATE_STEP_RESULTS_TABLE },
];

export interface RunRecord {
  id: string;
  user_id?: string;
  intent: string;
  input_data?: string;
  selected_skill: string;
  selected_agent?: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed';
  confidence?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface OutputRecord {
  id: string;
  run_id: string;
  generator_type: string;
  content_type?: string;
  content?: string;
  metadata?: string;
  created_at: string;
}

export interface StepResultRecord {
  id: string;
  run_id: string;
  step_index: number;
  step_type: string;
  skill_name: string;
  status: 'success' | 'failed' | 'skipped';
  output_data?: string;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}
