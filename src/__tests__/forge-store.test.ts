import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import {
  atribuirIngreso,
  guardarEventoIngreso,
  guardarIntento,
  listarIntentos,
  programarPublicacion,
  type IntentoGuardado,
  type Querier,
} from '../server/forge/forgeStore.js';

// Postgres real (PGlite, WASM) con la migración de producción: valida el SQL, no un mock.
const MIGRACION = readFileSync(resolve(process.cwd(), 'db/migrations/004_forge.sql'), 'utf-8');

const pausa = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const intento = (overrides: Partial<IntentoGuardado> = {}): IntentoGuardado => ({
  id: `att_${Math.random().toString(36).slice(2)}`,
  accountId: 'brand_a',
  userId: 'user_1',
  tema: 'marketing para cafeterías',
  formato: 'carrusel',
  plataforma: 'instagram',
  objetivo: 'alcance',
  nicho: 'gastronomía',
  voz: 'cercana',
  hooksJson: [{ hook: 'Tu café tiene una historia', score: 81 }],
  planJson: { rutaFundacion: 'educar' },
  hook: 'Tu café tiene una historia',
  caption: 'Caption de prueba',
  hashtagsJson: ['#cafe'],
  portada: null,
  prediccionJson: { veredicto: 'publicar' },
  contenidoScore: 70,
  hookScore: 80,
  cuentaScore: 60,
  scoreTotal: 71,
  status: 'completed',
  errorMessage: null,
  ...overrides,
});

describe('forgeStore contra Postgres real (PGlite)', () => {
  let db: PGlite;
  let q: Querier;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(MIGRACION);
    q = {
      query: async (sql, params) => {
        const r = await db.query(sql, params);
        return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
      },
    };
  });

  afterEach(async () => {
    await db.close();
  });

  it('la migración 004 crea las tres tablas', async () => {
    const r = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const nombres = r.rows.map((f) => f.table_name);
    expect(nombres).toEqual(
      expect.arrayContaining(['forge_attempts', 'forge_scheduled_posts', 'forge_revenue_events']),
    );
  });

  it('guarda y lista intentos: filtra por cuenta, ordena por fecha y respeta el límite', async () => {
    await guardarIntento(intento({ id: 'a1', tema: 'primero' }), q);
    await pausa(5);
    await guardarIntento(intento({ id: 'a2', tema: 'segundo' }), q);
    await pausa(5);
    await guardarIntento(intento({ id: 'otra', accountId: 'brand_b' }), q);

    const lista = await listarIntentos('brand_a', 10, q);
    expect(lista.map((i) => i.id)).toEqual(['a2', 'a1']);
    expect(lista[0]?.tema).toBe('segundo');
    expect(lista[0]?.hooks).toEqual([{ hook: 'Tu café tiene una historia', score: 81 }]);
    expect(lista[0]?.prediccion).toEqual({ veredicto: 'publicar' });

    const limitada = await listarIntentos('brand_a', 1, q);
    expect(limitada).toHaveLength(1);
  });

  it('rechaza un status fuera del CHECK', async () => {
    await expect(guardarIntento(intento({ status: 'publicado' as never }), q)).rejects.toThrow();
  });

  it('programarPublicacion: la segunda vez no duplica (ON CONFLICT)', async () => {
    const base = {
      userId: 'user_1',
      brandId: 'brand_a',
      contentId: 'carousel_1',
      platform: 'instagram',
      scheduledFor: '2030-01-01T10:00:00.000Z',
    };
    expect(await programarPublicacion({ id: 'p1', ...base }, q)).toBe(true);
    expect(await programarPublicacion({ id: 'p2', ...base }, q)).toBe(false);
    const r = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM forge_scheduled_posts`);
    expect(r.rows[0]?.n).toBe(1);
  });

  it('eventos de Stripe son idempotentes por stripe_event_id', async () => {
    const evento = {
      stripeEventId: 'evt_123',
      stripeSessionId: 'cs_123',
      eventType: 'checkout.session.completed',
      amountCents: 4900,
      currency: 'usd',
      metadata: { plan: 'pro' },
    };
    expect(await guardarEventoIngreso(evento, q)).toBe(true);
    expect(await guardarEventoIngreso(evento, q)).toBe(false);
    const r = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM forge_revenue_events`);
    expect(r.rows[0]?.n).toBe(1);
  });

  it('atribuirIngreso devuelve null sin webhook previo y atribuye después', async () => {
    const sesion = { stripeSessionId: 'cs_9', brandId: 'brand_a', contentId: 'carousel_9', platform: 'instagram' };
    expect(await atribuirIngreso(sesion, q)).toBeNull();

    await guardarEventoIngreso(
      {
        stripeEventId: 'evt_9',
        stripeSessionId: 'cs_9',
        eventType: 'checkout.session.completed',
        amountCents: 1500,
        currency: 'usd',
        metadata: {},
      },
      q,
    );
    const atribuido = await atribuirIngreso(sesion, q);
    expect(atribuido).not.toBeNull();
    expect(atribuido?.amountCents).toBe(1500);
    expect(atribuido?.attributedBrandId).toBe('brand_a');
    expect(atribuido?.attributedContentId).toBe('carousel_9');
  });
});
