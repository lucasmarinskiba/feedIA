/* ══════════════════════════════════════════════════════════════════════════════
   COMMUNITY MANAGER — centro de mando de CM, común a Instagram y TikTok
   ──────────────────────────────────────────────────────────────────────────────
   Un solo lugar para ver y actuar sobre la comunidad: inbox, soporte y FAQ vienen
   del mismo backend genérico (api/cm/*, capabilities/community/*) sea cual sea la
   red — no dependen de Meta. Lo que SÍ es específico de Instagram es Comment Brain
   (responde comentarios públicos vía Graph API): esa tarjeta solo aparece con
   Instagram activo, con acceso directo a la cola de revisión completa (#revision).

   Con TikTok activo no se inventan datos: se muestra el mismo inbox/soporte/FAQ
   (comparten backend, así que si algún día se ingesta un mensaje de TikTok
   aparecerá acá también) más un aviso honesto de qué falta (lectura de
   comentarios/DMs de TikTok: no conectada todavía).
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafeAll, apiBust } from '../lib/api.js';
import { adminApi, isAuthError } from '../lib/adminKey.js';
import { h } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { getPlatform } from '../lib/platform.js';

const badge = (text, tone = '') => h('span', { class: `rv-badge ${tone}`.trim() }, text);

const statCard = (label, value) =>
  h('div', { class: 'card stat-card' }, [
    h('div', { class: 'stat-label' }, label),
    h('div', { class: 'stat-value' }, String(value ?? '—')),
  ]);

const snapshotSection = (title, cards) =>
  h('section', { class: 'cm-section' }, [
    h('h3', { class: 'cm-section-title' }, title),
    h('div', { class: 'stats-grid' }, cards),
  ]);

/** Comment Brain: solo tiene sentido con Instagram activo (envía por Graph API). */
const commentBrainCard = (status) => {
  const box = h('div', { class: 'card cm-brain-card' });
  if (!status) {
    box.append(
      h('div', { class: 'small muted' }, 'No se pudo leer el estado del bot de comentarios.'),
      h(
        'button',
        { type: 'button', class: 'btn small', onclick: () => (location.hash = 'revision') },
        'Ir a Revisión de comentarios →',
      ),
    );
    return box;
  }
  const q = status.queue ?? {};
  const ob = status.outbox;
  box.append(
    h('div', { class: 'cm-brain-head' }, [
      h('strong', {}, 'Bot de comentarios (Instagram)'),
      status.enabled ? badge('Activo', 'ok') : badge('Apagado', 'warn'),
      badge(
        status.autonomy === 'suggest' ? 'Modo sugerencia' : status.autonomy,
        status.autonomy === 'suggest' ? '' : 'info',
      ),
    ]),
    status.dryRun
      ? h('div', { class: 'rv-alert', role: 'note' }, 'DRY_RUN activo: nada se publica de verdad todavía.')
      : null,
    h(
      'div',
      { class: 'small muted' },
      `${q.byAction?.['draft-for-review'] ?? 0} borradores pendientes · ${q.byAction?.escalate ?? 0} escalados`,
    ),
    ob?.enabled
      ? h(
          'div',
          { class: 'small muted' },
          `Cola de envío: ${ob.summary?.counts?.queued ?? 0} en cola · ${ob.summary?.counts?.failed ?? 0} con problemas`,
        )
      : null,
    h(
      'button',
      { type: 'button', class: 'btn small', onclick: () => (location.hash = 'revision') },
      'Ir a Revisión de comentarios →',
    ),
  );
  return box;
};

const tiktokLimitNote = () =>
  h('div', { class: 'card cm-tiktok-note' }, [
    h('strong', {}, 'Comentarios y DMs de TikTok'),
    h(
      'p',
      { class: 'small muted' },
      'Todavía no hay lectura automática de comentarios ni mensajes de TikTok conectada (el bot de TikTok hoy detecta tendencias y produce contenido, no modera comunidad). El inbox, soporte y FAQ de abajo son el mismo sistema que usa Instagram: en cuanto haya una fuente de mensajes de TikTok, van a aparecer acá sin cambios.',
    ),
  ]);

export const renderCommunityManager = async (root) => {
  const platform = getPlatform();
  const isInstagram = platform === 'instagram';
  const isTikTok = platform === 'tiktok';

  const head = h('header', { class: 'rv-header' }, [
    h('h1', { class: 'rv-title' }, 'Community Manager'),
    h(
      'p',
      { class: 'rv-muted' },
      isTikTok
        ? 'Inbox, soporte y FAQ de la comunidad en TikTok.'
        : isInstagram
          ? 'Inbox, soporte, FAQ y respuesta automática de comentarios de Instagram, todo en un lugar.'
          : 'Inbox, soporte y FAQ de la comunidad.',
    ),
  ]);

  const body = h('div', { class: 'cm-body' });
  root.replaceChildren(h('div', { class: 'rv-page cm-page' }, [head, body]));

  body.append(h('p', { class: 'rv-muted', role: 'status' }, 'Cargando…'));

  const results = await apiSafeAll({
    inbox: { path: '/api/cm/inbox/snapshot', fallback: null },
    support: { path: '/api/cm/support/snapshot', fallback: null },
    faq: { path: '/api/cm/faq/snapshot', fallback: null },
  });

  let brainStatus = null;
  if (isInstagram) {
    try {
      brainStatus = await adminApi('/api/comment-brain/status');
    } catch (err) {
      if (!isAuthError(err)) toast('No se pudo leer el bot de comentarios', 'warn');
    }
  }

  body.replaceChildren();

  const inbox = results.inbox.data;
  const support = results.support.data;
  const faq = results.faq.data;

  if (!inbox && !support && !faq) {
    body.append(
      h('div', { class: 'rv-alert', role: 'alert' }, 'Sin conexión al backend. El panel se carga cuando vuelva.'),
    );
    return;
  }

  if (isTikTok) body.append(tiktokLimitNote());
  if (isInstagram) body.append(commentBrainCard(brainStatus));

  if (inbox) {
    body.append(
      snapshotSection('Inbox', [
        statCard('Necesitan respuesta', inbox.needingResponse),
        statCard('Escalados', inbox.escalatedToHuman),
        statCard('Sentiment promedio', inbox.avgSentiment?.toFixed?.(2) ?? inbox.avgSentiment),
        statCard('Activos', inbox.totalActive),
      ]),
    );
  }
  if (support) {
    body.append(
      snapshotSection('Soporte', [
        statCard('Casos activos', support.totalActive),
        statCard('Incumplen SLA', support.slaBreaches?.length ?? 0),
        statCard('Resueltos (30d)', support.resolvedLast30Days),
        statCard('Horas prom. resolución', support.avgResolutionHours?.toFixed?.(1) ?? support.avgResolutionHours),
      ]),
    );
  }
  if (faq) {
    body.append(
      snapshotSection('FAQ', [
        statCard('Preguntas guardadas', faq.totalFAQs),
        statCard('Aprobadas', faq.approvedFAQs),
        statCard('Patrones por revisar', faq.pendingPatterns),
      ]),
    );
  }

  const actions = h('div', { class: 'cm-actions' });
  const tick = h(
    'button',
    {
      type: 'button',
      class: 'btn',
      onclick: async () => {
        tick.disabled = true;
        toast('Procesando cola de inbox…', 'info');
        apiBust('/api/cm/inbox');
        try {
          const r = await fetch('/api/cm/inbox/tick', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}),
          });
          const result = await r.json();
          toast(`${result.processed ?? 0} procesadas, ${result.responded ?? 0} respondidas`, 'success');
        } catch {
          toast('Sin conexión con el servidor', 'warn');
        } finally {
          tick.disabled = false;
        }
      },
    },
    '▶ Procesar cola de inbox',
  );
  actions.append(
    tick,
    h(
      'button',
      { type: 'button', class: 'btn ghost', onclick: () => (location.hash = 'community') },
      'Ver Community Hub completo →',
    ),
  );
  body.append(actions);
};
