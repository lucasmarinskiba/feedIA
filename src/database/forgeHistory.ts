import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';
import type { EntradaForge } from '../server/forgeRoutes.js';
import type { PiezaForge } from '../server/forgeRoutes.js';
import type { PrediccionContenido } from '../capabilities/executive/predictorModelo.js';

export interface ForgeAttempt {
  id: string;
  accountId: string;
  createdAt: string;
  tema: string;
  formato: string;
  plataforma: string;
  objetivo: string;
  nicho: string;
  voz: string;
  hooksJson: string;
  planJson: string;
  hook: string;
  caption: string;
  hashtagsJson: string;
  portada: string | null;
  prediccionJson: string;
  contenidoScore: number;
  hookScore: number;
  cuentaScore: number;
  scoreTotal: number;
  status: string;
  errorMessage: string | null;
}

const calcularScoreTotal = (contenido: number, hook: number, cuenta: number): number => {
  return Math.round(contenido * 0.45 + hook * 0.35 + cuenta * 0.2);
};

export const saveForgeAttempt = (
  db: Database,
  accountId: string,
  entrada: EntradaForge,
  hooksData: unknown,
  planData: unknown,
  pieza: PiezaForge,
  prediccion: PrediccionContenido,
  scores: { contenido: number; hook: number; cuenta: number },
): string => {
  const id = randomUUID();
  const now = new Date().toISOString();
  const scoreTotal = calcularScoreTotal(scores.contenido, scores.hook, scores.cuenta);

  const stmt = db.prepare(`
    INSERT INTO forge_attempts (
      id, account_id, created_at,
      tema, formato, plataforma, objetivo, nicho, voz,
      hooks_json, plan_json,
      hook, caption, hashtags_json, portada,
      prediccion_json, contenido_score, hook_score, cuenta_score, score_total,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    accountId,
    now,
    entrada.tema,
    entrada.formato,
    entrada.plataforma,
    entrada.objetivo,
    entrada.nicho,
    entrada.voz,
    JSON.stringify(hooksData),
    JSON.stringify(planData),
    pieza.hook,
    pieza.caption,
    JSON.stringify(pieza.hashtags),
    pieza.portada,
    JSON.stringify(prediccion),
    scores.contenido,
    scores.hook,
    scores.cuenta,
    scoreTotal,
    'completed',
  );

  return id;
};

export const getForgeHistory = (db: Database, accountId: string, limit: number = 20): ForgeAttempt[] => {
  const stmt = db.prepare(`
    SELECT * FROM forge_attempts
    WHERE account_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return stmt.all(accountId, limit) as ForgeAttempt[];
};

export const getForgeAttempt = (db: Database, attemptId: string): ForgeAttempt | null => {
  const stmt = db.prepare(`SELECT * FROM forge_attempts WHERE id = ?`);
  return (stmt.get(attemptId) as ForgeAttempt | undefined) ?? null;
};

export const saveImprovement = (
  db: Database,
  attemptId: string,
  previousAttemptId: string | null,
  scores: { contenido: number; hook: number; cuenta: number },
  previousScores: { contenido: number; hook: number; cuenta: number } | null,
  changes: unknown,
): void => {
  const id = randomUUID();
  const now = new Date().toISOString();

  const contenidoDelta = previousScores ? scores.contenido - previousScores.contenido : 0;
  const hookDelta = previousScores ? scores.hook - previousScores.hook : 0;
  const cuentaDelta = previousScores ? scores.cuenta - previousScores.cuenta : 0;
  const scoreTotalDelta = previousScores
    ? calcularScoreTotal(scores.contenido, scores.hook, scores.cuenta) -
      calcularScoreTotal(previousScores.contenido, previousScores.hook, previousScores.cuenta)
    : 0;

  const stmt = db.prepare(`
    INSERT INTO forge_improvements (
      id, attempt_id, previous_attempt_id,
      contenido_delta, hook_delta, cuenta_delta, score_total_delta,
      changes_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    attemptId,
    previousAttemptId,
    contenidoDelta,
    hookDelta,
    cuentaDelta,
    scoreTotalDelta,
    JSON.stringify(changes),
    now,
  );
};

export const getImprovementsBetween = (
  db: Database,
  attemptId: string,
  previousAttemptId: string | null,
): Record<string, number> | null => {
  if (!previousAttemptId) return null;

  const stmt = db.prepare(`
    SELECT contenido_delta, hook_delta, cuenta_delta, score_total_delta
    FROM forge_improvements
    WHERE attempt_id = ? AND previous_attempt_id = ?
    LIMIT 1
  `);

  const row = stmt.get(attemptId, previousAttemptId) as
    | { contenido_delta: number; hook_delta: number; cuenta_delta: number; score_total_delta: number }
    | undefined;

  if (!row) return null;

  return {
    contenido: row.contenido_delta,
    hook: row.hook_delta,
    cuenta: row.cuenta_delta,
    total: row.score_total_delta,
  };
};
