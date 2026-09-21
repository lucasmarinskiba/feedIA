/* ══════════════════════════════════════════════════════════════════════════════
   REVISIÓN DE COMENTARIOS — la bandeja donde una persona cierra el ciclo del Comment Brain
   ──────────────────────────────────────────────────────────────────────────────
   - Borradores: el bot propuso una respuesta; se aprueba tal cual, se edita y envía, o se descarta.
   - Escalados: casos que el bot NO redacta (legal, salud, odio…); los resuelve una persona.
   - Ignorados: auditoría de lo que el bot decidió no responder (para cazar falsos negativos).
   Cada decisión alimenta la métrica "¿listo para balanced?": de lo que el bot habría enviado
   sin supervisión, cuánto aprobó una persona tal cual.

   Seguridad: el texto de los comentarios es de TERCEROS. Todo entra por h()/textContent, nunca
   por innerHTML.
   ══════════════════════════════════════════════════════════════════════════════ */
import { adminApi, askAdminKey, clearAdminKey, isAuthError } from '../lib/adminKey.js';
import { h } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const MAX_CHARS = 500; // mismo tope que aplica el servidor a textos humanos

const KIND = {
  praise: 'Elogio',
  banter: 'Humor',
  question: 'Pregunta',
  'purchase-intent': 'Intención de compra',
  complaint: 'Reclamo',
  criticism: 'Crítica',
  troll: 'Provocación',
  hate: 'Odio / acoso',
  spam: 'Spam',
  'tag-friend': 'Etiqueta a alguien',
  'emoji-only': 'Solo emojis',
  other: 'Otro',
};
const SARCASM = {
  playful: 'Sarcasmo en buena onda',
  critical: 'Sarcasmo: hay un reclamo real',
  hostile: 'Sarcasmo hostil',
};
const MODE = {
  thank: 'Agradecer',
  'playful-banter': 'Complicidad',
  'witty-comeback': 'Contraataque ingenioso',
  answer: 'Responder',
  'empathize-resolve': 'Empatía y resolver',
  'sales-handoff': 'Pasar a ventas',
  'acknowledge-critique': 'Reconocer la crítica',
};
const ISSUE = {
  vacio: 'La respuesta está vacía.',
  'muy-largo': 'Es demasiado larga.',
  'palabra-prohibida': 'Usa una palabra prohibida por la marca.',
  'contacto-o-link': 'Tiene un link, mail o teléfono (no van en respuestas públicas).',
  hashtag: 'Tiene hashtags.',
  'mencion-ajena': 'Menciona a otra cuenta.',
  'precio-no-verificado': 'Menciona un precio que nadie verificó.',
  'delata-ia': 'Dice que es un bot o una IA.',
  gritando: 'Está escrita en mayúsculas.',
  'promesa-dura': 'Promete un resultado que la marca no puede sostener.',
  repetida: 'Es casi igual a una respuesta reciente (parece un bot).',
};
const TABS = [
  {
    id: 'draft-for-review',
    label: 'Borradores',
    empty: 'No hay borradores pendientes. Cuando el bot proponga una respuesta, aparece acá.',
  },
  { id: 'escalate', label: 'Escalados', empty: 'Nada escalado. Los casos delicados (legal, salud, odio) llegan acá.' },
  { id: 'ignore', label: 'Ignorados', empty: 'Sin ignorados para auditar.' },
];
const AUTONOMY = {
  suggest: ['Modo sugerencia', 'Nada se envía solo: cada respuesta pasa por esta bandeja.'],
  balanced: ['Modo balanceado', 'El bot responde solo lo seguro; el resto llega a esta bandeja.'],
  full: ['Autonomía alta', 'El bot responde solo con umbral de confianza más bajo; lo grave llega acá.'],
};

const pct = (n) => (n == null ? '—' : `${Math.round(n * 100)}%`);
const enc = encodeURIComponent;

const timeAgo = (iso) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `hace ${hrs} h` : `hace ${Math.round(hrs / 24)} d`;
};

const explainError = (err) => {
  const code = err?.payload?.error;
  if (isAuthError(err)) return 'Hace falta la clave de admin.';
  if (err?.status === 503 && code === 'admin-key-not-configured') {
    return 'El servidor no tiene FEEDIA_ADMIN_KEY configurada: esta bandeja está bloqueada por seguridad.';
  }
  if (err?.status === 503) return 'No hay perfil de marca activo: no se puede validar la respuesta.';
  if (err?.status === 404 && code === 'not-found')
    return 'Este comentario ya no está en la bandeja (¿lo atendió otra persona?).';
  if (err?.status === 404 || err?.code === 'API_NOT_FOUND')
    return 'Este servidor no tiene la bandeja todavía. Reinicialo para activarla.';
  if (err?.status === 409) return err?.payload?.detail || 'Este item no se puede aprobar.';
  if (err?.status === 502) {
    const detail = err?.payload?.detail || 'error de la red social';
    // El guardián de compliance separa las respuestas de la cuenta (anti-spam): no es un error, hay que esperar.
    const wait = /esperar (\d+)\s*s/i.exec(detail)?.[1];
    if (wait)
      return `Límite de seguridad de la cuenta: hay que esperar ${wait} s entre respuestas. Reintentá en unos segundos; el item sigue acá.`;
    return `No se pudo enviar: ${detail}. El item sigue acá para reintentar.`;
  }
  return 'Sin conexión con el servidor.';
};

/* ── Estado del módulo ─────────────────────────────────────────────────────── */

const state = { tab: 'draft-for-review', items: [], status: null, error: '', needsKey: false, loading: true };

/* ── Piezas ────────────────────────────────────────────────────────────────── */

const badge = (text, tone = '') => h('span', { class: `rv-badge ${tone}`.trim() }, text);

const summaryView = () => {
  const box = h('section', { class: 'rv-summary', 'aria-label': 'Estado del bot de comentarios' });
  const s = state.status;
  if (!s) return box;

  const [modeName, modeText] = AUTONOMY[s.autonomy] ?? AUTONOMY.suggest;
  box.append(
    h('div', { class: 'rv-summary-row' }, [
      h('div', {}, [h('strong', {}, modeName), h('div', { class: 'rv-muted' }, modeText)]),
      s.enabled ? null : badge('Comment Brain apagado', 'warn'),
    ]),
  );

  if (s.dryRun) {
    box.append(
      h(
        'div',
        { class: 'rv-alert', role: 'note' },
        'DRY_RUN activo: al aprobar se registra tu decisión pero NO se publica nada en Instagram.',
      ),
    );
  }

  const g = s.graduation;
  const shadow = s.decisions?.shadow;
  if (g) {
    const progress = Math.min(100, Math.round((g.sample / g.thresholds.minSample) * 100));
    box.append(
      h('div', { class: 'rv-grad' }, [
        h('div', { class: 'rv-grad-head' }, [
          h('strong', {}, '¿Listo para pasar a balanced?'),
          badge(g.ready ? 'Sí' : 'Todavía no', g.ready ? 'ok' : 'warn'),
        ]),
        h(
          'div',
          { class: 'rv-muted' },
          `De lo que el bot habría enviado solo, revisaste ${g.sample} de ${g.thresholds.minSample} necesarias.`,
        ),
        h(
          'div',
          {
            class: 'rv-bar',
            role: 'progressbar',
            'aria-valuemin': '0',
            'aria-valuemax': '100',
            'aria-valuenow': String(progress),
            'aria-label': 'Revisiones necesarias',
          },
          [h('div', { class: 'rv-bar-fill', style: { width: `${progress}%` } })],
        ),
        shadow && g.sample > 0
          ? h(
              'div',
              { class: 'rv-muted' },
              `${shadow.approvedAsIs} sin cambios (${pct(g.asIsRate)}) · ${shadow.approvedEdited} editadas · ${shadow.rejected} rechazadas (${pct(g.rejectedRate)})`,
            )
          : null,
        ...(g.ready
          ? [
              h(
                'div',
                { class: 'rv-muted' },
                `Cumple los criterios (${pct(g.thresholds.minAsIsRate)} sin cambios, máx. ${pct(g.thresholds.maxRejectedRate)} rechazadas). Para activarlo: COMMENT_BRAIN_AUTONOMY=balanced en el servidor.`,
              ),
            ]
          : g.blockers.map((b) => h('div', { class: 'rv-muted' }, `• ${b}`))),
      ]),
    );
  }

  const c = s.costGuards;
  if (c) {
    const sk = c.skipped;
    box.append(
      h(
        'div',
        { class: 'rv-muted rv-cost' },
        `Gasto: ${c.processedLastHour} comentarios al modelo en la última hora · omitidos sin gastar: ${sk.duplicado} duplicados, ${sk['eco-propio']} ecos propios, ${sk['tope-por-autor']} por tope de autor, ${sk['tope-por-hora']} por tope horario.`,
      ),
    );
  }
  return box;
};

const cardView = (item, { onDone }) => {
  const isDraft = item.action === 'draft-for-review';
  const cl = item.classification ?? {};
  const feedback = h('div', { class: 'rv-feedback', role: 'status', 'aria-live': 'polite' });
  const article = h('article', { class: 'rv-card', 'data-id': item.id, 'aria-label': `Comentario de @${item.handle}` });

  const head = h('div', { class: 'rv-card-head' }, [
    h('strong', {}, `@${item.handle}`),
    h('span', { class: 'rv-muted' }, timeAgo(item.createdAt)),
    badge(KIND[cl.kind] ?? cl.kind ?? 'Otro'),
    cl.sarcasm?.present
      ? badge(SARCASM[cl.sarcasm.stance] ?? 'Sarcasmo', cl.sarcasm.stance === 'playful' ? '' : 'warn')
      : null,
    item.wouldHaveReplied ? badge('Habría salido solo', 'info') : null,
    cl.source === 'heuristic' ? badge('Sin IA (reglas)', 'warn') : null,
  ]);
  const quote = h('blockquote', { class: 'rv-quote' }, item.commentText);
  const reasons = h(
    'ul',
    { class: 'rv-reasons rv-muted' },
    (item.reasons ?? []).map((r) => h('li', {}, r)),
  );
  article.append(head, quote, reasons);

  let textarea = null;
  let counter = null;
  if (isDraft) {
    textarea = h('textarea', {
      class: 'rv-textarea',
      id: `rv-ta-${item.id}`,
      rows: '3',
      'aria-describedby': `rv-ct-${item.id}`,
    });
    textarea.value = item.draft ?? '';
    counter = h('span', { class: 'rv-muted', id: `rv-ct-${item.id}` });
    const updateCounter = () => {
      const n = textarea.value.trim().length;
      counter.textContent = `${n}/${MAX_CHARS}`;
      counter.classList.toggle('rv-over', n > MAX_CHARS);
    };
    textarea.addEventListener('input', updateCounter);
    updateCounter();
    article.append(
      h('label', { class: 'rv-label', for: `rv-ta-${item.id}` }, [
        `Respuesta propuesta${item.mode ? ` · ${MODE[item.mode] ?? item.mode}` : ''}`,
      ]),
      textarea,
      counter,
    );
  }

  const buttons = [];
  let busy = false;
  const setBusy = (v) => {
    busy = v;
    for (const b of buttons) b.disabled = v;
    article.setAttribute('aria-busy', String(v));
  };

  const run = async (path, body, { okMessage, forceButton }) => {
    if (busy) return;
    setBusy(true);
    feedback.replaceChildren();
    try {
      const res = await adminApi(
        `/api/comment-brain/review/${enc(item.id)}/${path}`,
        { method: 'POST', body },
        { interactive: true },
      );
      if (res?.dryRun && path === 'approve')
        toast('Aprobado en modo simulado: DRY_RUN está activo y no se publicó nada.', 'warn');
      else toast(okMessage, 'ok');
      article.remove();
      onDone(item);
    } catch (err) {
      if (err?.status === 404 && err?.payload?.error === 'not-found') {
        // Otra persona (u otra pestaña) ya lo atendió: la tarjeta no tiene nada que hacer acá.
        toast(explainError(err), 'info');
        article.remove();
        onDone(item);
        return;
      }
      if (err?.status === 422 && Array.isArray(err?.payload?.issues)) {
        const blocking = err.payload.issues.filter((i) => i.severity === 'block');
        feedback.append(
          h('div', { class: 'rv-alert' }, 'No se envió: hay problemas con la respuesta.'),
          h(
            'ul',
            { class: 'rv-issues' },
            blocking.map((i) => h('li', {}, ISSUE[i.code] ?? i.code)),
          ),
          h('div', { class: 'rv-muted' }, 'Corregila, o enviala igual si estás seguro.'),
        );
        forceButton?.removeAttribute('hidden');
      } else {
        feedback.append(h('div', { class: 'rv-alert', role: 'alert' }, explainError(err)));
      }
      if (isAuthError(err)) clearAdminKey();
    } finally {
      setBusy(false);
    }
  };

  const mk = (label, cls, onclick, extra = {}) => {
    const b = h('button', { type: 'button', class: `btn ${cls}`.trim(), onclick, ...extra }, label);
    buttons.push(b);
    return b;
  };

  const actions = h('div', { class: 'rv-actions' });
  if (isDraft) {
    const force = mk(
      'Enviar igual',
      'ghost',
      () =>
        run(
          'approve',
          { text: textarea.value.trim(), force: true },
          { okMessage: `Respuesta enviada a @${item.handle}` },
        ),
      { hidden: 'hidden' },
    );
    const approve = mk('Aprobar y enviar', 'primary', () =>
      run(
        'approve',
        { text: textarea.value.trim() },
        { okMessage: `Respuesta enviada a @${item.handle}`, forceButton: force },
      ),
    );
    actions.append(
      approve,
      force,
      mk('Descartar', 'ghost', () => run('reject', {}, { okMessage: 'Borrador descartado' })),
    );
  }
  actions.append(mk('Ya lo resolví', 'ghost', () => run('resolve', undefined, { okMessage: 'Marcado como resuelto' })));
  article.append(actions, feedback);
  return article;
};

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export const renderCommentReview = async (root) => {
  const summaryHost = h('div', {});
  const tabsHost = h('div', { class: 'rv-tabs', role: 'tablist', 'aria-label': 'Tipo de item' });
  const listHost = h('div', { class: 'rv-list' });
  const drafts = new Map(); // id → texto en edición (sobrevive a repintar la lista)

  root.replaceChildren(
    h('div', { class: 'rv-page' }, [
      h('header', { class: 'rv-header' }, [
        h('h1', { class: 'rv-title' }, 'Revisión de comentarios'),
        h(
          'p',
          { class: 'rv-muted' },
          'Aprobá, editá o descartá lo que propone el bot. Cada decisión lo hace mejor y mide cuándo puede trabajar solo.',
        ),
      ]),
      summaryHost,
      tabsHost,
      listHost,
    ]),
  );

  const counts = () => state.status?.queue?.byAction ?? {};

  const paintTabs = () => {
    tabsHost.replaceChildren(
      ...TABS.map((t) =>
        h(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: `rv-tab${state.tab === t.id ? ' active' : ''}`,
            'aria-selected': String(state.tab === t.id),
            onclick: () => {
              if (state.tab === t.id) return;
              state.tab = t.id;
              void load();
            },
          },
          `${t.label} (${counts()[t.id] ?? 0})`,
        ),
      ),
    );
  };

  const paintList = () => {
    listHost.replaceChildren();
    if (state.loading) {
      listHost.append(h('p', { class: 'rv-muted', role: 'status' }, 'Cargando…'));
      return;
    }
    if (state.error) {
      const box = h('div', { class: 'rv-alert', role: 'alert' }, state.error);
      listHost.append(box);
      if (state.needsKey) {
        listHost.append(
          h(
            'button',
            {
              type: 'button',
              class: 'btn primary',
              onclick: () => {
                if (askAdminKey()) void load();
              },
            },
            'Ingresar clave de admin',
          ),
        );
      }
      return;
    }
    if (state.items.length === 0) {
      listHost.append(h('p', { class: 'rv-muted rv-empty' }, TABS.find((t) => t.id === state.tab)?.empty ?? ''));
      return;
    }
    for (const item of state.items) {
      const card = cardView(item, { onDone: onDone });
      const ta = card.querySelector('textarea');
      if (ta) {
        if (drafts.has(item.id)) {
          ta.value = drafts.get(item.id);
          ta.dispatchEvent(new Event('input'));
        }
        ta.addEventListener('input', () => drafts.set(item.id, ta.value));
      }
      listHost.append(card);
    }
  };

  const refreshStatus = async () => {
    try {
      state.status = await adminApi('/api/comment-brain/status');
    } catch {
      /* el resumen es accesorio: si falla no se rompe la bandeja */
    }
    summaryHost.replaceChildren(summaryView());
    paintTabs();
  };

  async function onDone(item) {
    drafts.delete(item.id);
    state.items = state.items.filter((i) => i.id !== item.id);
    if (state.items.length === 0) paintList();
    // Primero el refresco: repinta las pestañas, y enfocar una pestaña que está por reemplazarse no sirve.
    await refreshStatus();
    // La tarjeta con el foco desapareció: el teclado no debe quedar perdido en el vacío.
    (
      listHost.querySelector('.rv-card textarea, .rv-card .rv-actions button') ?? tabsHost.querySelector('.active')
    )?.focus();
  }

  async function load() {
    state.loading = true;
    state.error = '';
    state.needsKey = false;
    paintTabs();
    paintList();
    try {
      const [status, review] = await Promise.all([
        adminApi('/api/comment-brain/status'),
        adminApi(`/api/comment-brain/review?action=${enc(state.tab)}&limit=100`),
      ]);
      state.status = status;
      state.items = review.items ?? [];
    } catch (err) {
      state.items = [];
      state.error = explainError(err);
      state.needsKey = isAuthError(err);
    } finally {
      state.loading = false;
    }
    summaryHost.replaceChildren(summaryView());
    paintTabs();
    paintList();
  }

  await load();
};
