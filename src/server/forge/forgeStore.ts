import { getPool } from '../../db/postgres-real.js';

/** Subconjunto de pg.Pool que usa el store. Inyectable para testear contra PGlite. */
export interface Querier {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
}

const consultaPorDefecto: Querier = {
  query: (sql, params) => getPool().query(sql, params),
};

/** Sin DATABASE_URL, getPool() cae a un archivo JSON o a un mock sin persistencia: eso no es aceptable para Forge. */
export const baseDeDatosConfigurada = (): boolean => Boolean(process.env.DATABASE_URL);

export interface IntentoGuardado {
  id: string;
  accountId: string;
  userId: string | null;
  tema: string;
  formato: string;
  plataforma: string;
  objetivo: string;
  nicho: string;
  voz: string;
  hooksJson: unknown;
  planJson: unknown;
  hook: string;
  caption: string;
  hashtagsJson: unknown;
  portada: string | null;
  prediccionJson: unknown;
  contenidoScore: number | null;
  hookScore: number | null;
  cuentaScore: number | null;
  scoreTotal: number | null;
  status: 'completed' | 'draft' | 'error';
  errorMessage: string | null;
}

export interface IntentoListado {
  id: string;
  accountId: string;
  createdAt: string;
  tema: string;
  formato: string;
  plataforma: string;
  objetivo: string;
  nicho: string;
  voz: string;
  hooks: unknown;
  plan: unknown;
  hook: string;
  caption: string;
  hashtags: unknown;
  portada: string | null;
  prediccion: unknown;
  contenidoScore: number | null;
  hookScore: number | null;
  cuentaScore: number | null;
  scoreTotal: number | null;
  status: string;
  errorMessage: string | null;
}

const enIntentoListado = (fila: Record<string, unknown>): IntentoListado => ({
  id: String(fila.id),
  accountId: String(fila.account_id),
  createdAt: new Date(fila.created_at as string).toISOString(),
  tema: String(fila.tema),
  formato: String(fila.formato),
  plataforma: String(fila.plataforma),
  objetivo: String(fila.objetivo),
  nicho: String(fila.nicho),
  voz: String(fila.voz),
  hooks: fila.hooks_json,
  plan: fila.plan_json,
  hook: String(fila.hook),
  caption: String(fila.caption),
  hashtags: fila.hashtags_json,
  portada: (fila.portada as string | null) ?? null,
  prediccion: fila.prediccion_json,
  contenidoScore: (fila.contenido_score as number | null) ?? null,
  hookScore: (fila.hook_score as number | null) ?? null,
  cuentaScore: (fila.cuenta_score as number | null) ?? null,
  scoreTotal: (fila.score_total as number | null) ?? null,
  status: String(fila.status),
  errorMessage: (fila.error_message as string | null) ?? null,
});

export const guardarIntento = async (intento: IntentoGuardado, q: Querier = consultaPorDefecto): Promise<void> => {
  await q.query(
    `INSERT INTO forge_attempts (
       id, account_id, user_id, tema, formato, plataforma, objetivo, nicho, voz,
       hooks_json, plan_json, hook, caption, hashtags_json, portada, prediccion_json,
       contenido_score, hook_score, cuenta_score, score_total, status, error_message
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    [
      intento.id,
      intento.accountId,
      intento.userId,
      intento.tema,
      intento.formato,
      intento.plataforma,
      intento.objetivo,
      intento.nicho,
      intento.voz,
      JSON.stringify(intento.hooksJson),
      JSON.stringify(intento.planJson),
      intento.hook,
      intento.caption,
      JSON.stringify(intento.hashtagsJson),
      intento.portada,
      JSON.stringify(intento.prediccionJson),
      intento.contenidoScore,
      intento.hookScore,
      intento.cuentaScore,
      intento.scoreTotal,
      intento.status,
      intento.errorMessage,
    ],
  );
};

export const listarIntentos = async (
  accountId: string,
  limite: number,
  q: Querier = consultaPorDefecto,
): Promise<IntentoListado[]> => {
  const { rows } = await q.query(
    `SELECT * FROM forge_attempts WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [accountId, limite],
  );
  return (rows as Record<string, unknown>[]).map(enIntentoListado);
};

export interface PublicacionProgramada {
  id: string;
  userId: string;
  brandId: string;
  contentId: string;
  platform: string;
  scheduledFor: string;
}

/** Devuelve false si ya existía (misma marca, contenido y plataforma). */
export const programarPublicacion = async (
  publicacion: PublicacionProgramada,
  q: Querier = consultaPorDefecto,
): Promise<boolean> => {
  const { rowCount } = await q.query(
    `INSERT INTO forge_scheduled_posts (id, user_id, brand_id, content_id, platform, scheduled_for)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (brand_id, content_id, platform) DO NOTHING`,
    [
      publicacion.id,
      publicacion.userId,
      publicacion.brandId,
      publicacion.contentId,
      publicacion.platform,
      publicacion.scheduledFor,
    ],
  );
  return rowCount > 0;
};

export interface EventoIngreso {
  stripeEventId: string;
  stripeSessionId: string;
  eventType: string;
  amountCents: number;
  currency: string;
  metadata: Record<string, unknown>;
}

/** Idempotente: Stripe reintenta webhooks, el mismo evento no se cuenta dos veces. */
export const guardarEventoIngreso = async (
  evento: EventoIngreso,
  q: Querier = consultaPorDefecto,
): Promise<boolean> => {
  const { rowCount } = await q.query(
    `INSERT INTO forge_revenue_events (stripe_event_id, stripe_session_id, event_type, amount_cents, currency, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [
      evento.stripeEventId,
      evento.stripeSessionId,
      evento.eventType,
      evento.amountCents,
      evento.currency,
      JSON.stringify(evento.metadata),
    ],
  );
  return rowCount > 0;
};

export interface IngresoAtribuido {
  stripeSessionId: string;
  eventType: string;
  amountCents: number;
  currency: string;
  attributedBrandId: string;
  attributedContentId: string;
  attributedPlatform: string;
  attributedAt: string;
}

/** Asocia los eventos de una sesión de Stripe a un contenido publicado. null si el webhook todavía no llegó. */
export const atribuirIngreso = async (
  sesion: { stripeSessionId: string; brandId: string; contentId: string; platform: string },
  q: Querier = consultaPorDefecto,
): Promise<IngresoAtribuido | null> => {
  const { rows } = await q.query(
    `UPDATE forge_revenue_events
        SET attributed_brand_id = $2, attributed_content_id = $3, attributed_platform = $4, attributed_at = NOW()
      WHERE stripe_session_id = $1
      RETURNING stripe_session_id, event_type, amount_cents, currency,
                attributed_brand_id, attributed_content_id, attributed_platform, attributed_at`,
    [sesion.stripeSessionId, sesion.brandId, sesion.contentId, sesion.platform],
  );
  const fila = (rows as Record<string, unknown>[])[0];
  if (!fila) return null;
  return {
    stripeSessionId: String(fila.stripe_session_id),
    eventType: String(fila.event_type),
    amountCents: Number(fila.amount_cents),
    currency: String(fila.currency),
    attributedBrandId: String(fila.attributed_brand_id),
    attributedContentId: String(fila.attributed_content_id),
    attributedPlatform: String(fila.attributed_platform),
    attributedAt: new Date(fila.attributed_at as string).toISOString(),
  };
};
