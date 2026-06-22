/**
 * Computer Use — Action Planner v2
 * ─────────────────────────────────────────────────────────────────────────
 * Turns a high-level natural-language instruction into a deterministic,
 * auditable sequence of atomic computer actions over the semantic UI map.
 *
 * v2 improvements:
 *   • More intents: unfollow, delete, archive, insights, search, open-post
 *   • Quantifier support: "like the last 3 posts", "scroll 5 times"
 *   • Account targeting: "like posts from @cuenta"
 *   • Better multi-clause parsing with context carry-over
 */

import { INSTAGRAM_UI, INSTAGRAM_ROUTES, resolveTargetByName, type Gesture } from './uiMap.js';

export interface ComputerAction {
  step: number;
  gesture: Gesture;
  targetId: string;
  targetLabel: string;
  text?: string;
  url?: string;
  humanAction: string;
  selectors: string[];
  pacingMs: number;
}

export interface ComputerPlan {
  instruction: string;
  surface: 'instagram' | 'desktop-app' | 'feedia-internal';
  actions: ComputerAction[];
  requiresApproval: boolean;
  unresolved: string[];
  notes: string;
}

const PACING: Record<Gesture, number> = {
  navigate: 1400,
  click: 650,
  'double-click': 800,
  type: 1200,
  scroll: 500,
  hover: 300,
  press: 250,
  wait: 800,
};

const WRITE_TARGETS = new Set([
  'comment-post',
  'create-share',
  'create-caption',
  'comment-input',
  'story-reply',
  'follow-btn',
  'share',
  'unfollow-btn',
]);

let _seq = 0;
const mkAction = (
  gesture: Gesture,
  targetId: string,
  targetLabel: string,
  selectors: string[],
  humanAction: string,
  extra: Partial<ComputerAction> = {},
): ComputerAction => ({
  step: ++_seq,
  gesture,
  targetId,
  targetLabel,
  selectors,
  humanAction,
  pacingMs: PACING[gesture],
  ...extra,
});

/* ── Intent parsing ─────────────────────────────────────────────────────── */

interface ParsedIntent {
  verb:
    | 'navigate'
    | 'like'
    | 'save'
    | 'share'
    | 'comment'
    | 'open'
    | 'type'
    | 'scroll'
    | 'follow'
    | 'unfollow'
    | 'publish'
    | 'reply-dm'
    | 'view-stories'
    | 'search'
    | 'open-post'
    | 'insights'
    | 'delete'
    | 'archive'
    | 'react-story'
    | 'unknown';
  targetHint?: string;
  text?: string;
  /** Parsed from phrases like "last 3 posts", "scroll 5 times" */
  quantity?: number;
  /** Parsed @username mentions */
  username?: string;
}

const deaccent = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const extractQuantity = (text: string): number | undefined => {
  const m = text.match(/\b(?:last|últimos|últimas|primeros|primeras|top)\s+(\d+)\b/i);
  if (m) return Number(m[1]);
  const m2 = text.match(/\b(\d+)\s+(?:veces|times|posts|post|fotos|foto)\b/i);
  if (m2) return Number(m2[1]);
  return undefined;
};

const extractUsername = (text: string): string | undefined => {
  const m = text.match(/@([a-zA-Z0-9._]{1,30})/);
  return m?.[1];
};

const parseInstruction = (instruction: string): ParsedIntent[] => {
  const lower = instruction.toLowerCase();
  const intents: ParsedIntent[] = [];

  // Multi-clause split on connectors.
  const clauses = lower
    .split(/\s*(?:,|;| y luego | luego | y después | después | entonces | y )\s*/g)
    .filter((c) => c.trim().length > 2);

  for (const c of clauses) {
    const cn = deaccent(c);
    const qty = extractQuantity(c);
    const user = extractUsername(c);

    if (
      /\b(naveg|and[a]|ir a|abr[i] (el |la )?(feed|explorar|reels|dms?|mensajes|notificaciones|perfil|buscador))\b/.test(
        cn,
      )
    ) {
      intents.push({ verb: 'navigate', targetHint: c, quantity: qty, username: user });
    } else if (/\b(like|me gusta|likea|dale me gusta|darle like)\b/.test(cn)) {
      intents.push({ verb: 'like', targetHint: c, quantity: qty, username: user });
    } else if (/\b(guard[a]|save|guardalo|guardar)\b/.test(cn)) {
      intents.push({ verb: 'save', targetHint: c, quantity: qty, username: user });
    } else if (/\b(comparti|share|enviar por dm|compartir)\b/.test(cn)) {
      intents.push({ verb: 'share', targetHint: c, username: user });
    } else if (/\b(comenta|comentario|escrib[i] (un )?comentario)\b/.test(cn)) {
      const m = c.match(/comenta[r]?\s*[:"]?\s*(.+)$/);
      intents.push({ verb: 'comment', text: m?.[1]?.trim(), targetHint: c, username: user });
    } else if (/\b(respond[e] (el|al|los) (dm|mensaje|story|historia))\b/.test(cn)) {
      intents.push({ verb: 'reply-dm', targetHint: c, username: user });
    } else if (/\b(ve[r]? (las )?historias|stories|barra de historias)\b/.test(cn)) {
      intents.push({ verb: 'view-stories', targetHint: c, username: user });
    } else if (/\b(reaccionar|responder) (a )?(la )?historia\b/.test(cn)) {
      intents.push({ verb: 'react-story', targetHint: c, username: user });
    } else if (/\b(segu[i]r|follow)\b/.test(cn)) {
      intents.push({ verb: 'follow', targetHint: c, username: user });
    } else if (/\b(dejar de seguir|unfollow)\b/.test(cn)) {
      intents.push({ verb: 'unfollow', targetHint: c, username: user });
    } else if (/\b(publica|public[a] (la|esta) pieza|crear (post|reel|historia)|subir)\b/.test(cn)) {
      intents.push({ verb: 'publish', targetHint: c });
    } else if (/\b(scroll|baj[a]|despla[zc]|bajar)\b/.test(cn)) {
      intents.push({ verb: 'scroll', targetHint: c, quantity: qty });
    } else if (/\b(abr[i]|open|ver)\b/.test(cn)) {
      if (/\bpost|publicaci|foto|imagen|reel\b/.test(cn)) {
        intents.push({ verb: 'open-post', targetHint: c, quantity: qty, username: user });
      } else {
        intents.push({ verb: 'open', targetHint: c, quantity: qty, username: user });
      }
    } else if (/\b(busc|search|encontrar|find)\b/.test(cn)) {
      const m = c.match(/busca[r]?\s+[:"]?\s*(.+)$/);
      intents.push({ verb: 'search', text: m?.[1]?.trim(), targetHint: c, username: user });
    } else if (/\b(insights|métricas|estadísticas|analytics|ver (las )?stats)\b/.test(cn)) {
      intents.push({ verb: 'insights', targetHint: c });
    } else if (/\b(eliminar|borrar|delete)\b/.test(cn)) {
      intents.push({ verb: 'delete', targetHint: c });
    } else if (/\b(archivar|archive)\b/.test(cn)) {
      intents.push({ verb: 'archive', targetHint: c });
    } else {
      intents.push({ verb: 'unknown', targetHint: c });
    }
  }
  return intents.length ? intents : [{ verb: 'unknown', targetHint: lower }];
};

/* ── Plan builder ───────────────────────────────────────────────────────── */

export const planComputerUse = (instruction: string): ComputerPlan => {
  _seq = 0;
  const intents = parseInstruction(instruction);
  const actions: ComputerAction[] = [];
  const unresolved: string[] = [];
  let requiresApproval = false;

  const pushNav = (routeKey: string, label: string): void => {
    actions.push(mkAction('navigate', routeKey, label, [], `Navegar a ${label}`, { url: INSTAGRAM_ROUTES[routeKey] }));
  };

  const addSearchForUser = (username: string): void => {
    const searchBtn = INSTAGRAM_UI.find((x) => x.id === 'search')!;
    actions.push(mkAction('click', searchBtn.id, searchBtn.label, searchBtn.selectors, 'Abrir buscador'));
    actions.push(
      mkAction('type', 'search-input', 'Campo de búsqueda', ['input[placeholder*="Buscar"]'], `Buscar @${username}`, {
        text: username,
      }),
    );
    actions.push(
      mkAction('press', 'search-submit', 'Enviar búsqueda', ['input[placeholder*="Buscar"]'], 'Enviar búsqueda'),
    );
  };

  const addQuantifiedLikes = (qty: number): void => {
    const like = INSTAGRAM_UI.find((x) => x.id === 'like')!;
    for (let i = 0; i < qty; i++) {
      actions.push(mkAction('click', like.id, `${like.label} #${i + 1}`, like.selectors, `Dar like al post #${i + 1}`));
      if (i < qty - 1) {
        actions.push(mkAction('scroll', 'feed', 'Feed', [], `Scroll para siguiente post`));
      }
    }
  };

  for (const intent of intents) {
    // If username specified and not already on profile → search first
    if (intent.username && intent.verb !== 'search' && intent.verb !== 'navigate') {
      addSearchForUser(intent.username);
    }

    switch (intent.verb) {
      case 'navigate':
      case 'open': {
        const hint = intent.targetHint ?? '';
        const routeKey = /feed|inicio|home/.test(hint)
          ? 'feed'
          : /explorar|explore/.test(hint)
            ? 'explore'
            : /reels/.test(hint)
              ? 'reels'
              : /dms?|mensaje/.test(hint)
                ? 'dms'
                : /notificac/.test(hint)
                  ? 'activity'
                  : /perfil|biograf|editar/.test(hint)
                    ? 'editProfile'
                    : '';
        if (routeKey) {
          pushNav(routeKey, routeKey);
        } else {
          const tgt = resolveTargetByName(hint);
          if (tgt) {
            actions.push(
              mkAction(
                tgt.gesture,
                tgt.id,
                tgt.label,
                tgt.selectors,
                `${tgt.gesture === 'click' ? 'Hacer click en' : 'Operar'} ${tgt.label}`,
              ),
            );
          } else {
            unresolved.push(hint);
          }
        }
        break;
      }
      case 'like': {
        if (intent.quantity && intent.quantity > 1) {
          addQuantifiedLikes(intent.quantity);
        } else {
          const t = INSTAGRAM_UI.find((x) => x.id === 'like')!;
          actions.push(mkAction('click', t.id, t.label, t.selectors, 'Hacer click en el botón Me gusta'));
        }
        break;
      }
      case 'save': {
        if (intent.quantity && intent.quantity > 1) {
          const save = INSTAGRAM_UI.find((x) => x.id === 'save')!;
          for (let i = 0; i < intent.quantity; i++) {
            actions.push(
              mkAction('click', save.id, `${save.label} #${i + 1}`, save.selectors, `Guardar post #${i + 1}`),
            );
            if (i < intent.quantity - 1) actions.push(mkAction('scroll', 'feed', 'Feed', [], 'Scroll para siguiente'));
          }
        } else {
          const t = INSTAGRAM_UI.find((x) => x.id === 'save')!;
          actions.push(mkAction('click', t.id, t.label, t.selectors, 'Hacer click en Guardar'));
        }
        break;
      }
      case 'share': {
        const t = INSTAGRAM_UI.find((x) => x.id === 'share')!;
        actions.push(mkAction('click', t.id, t.label, t.selectors, 'Abrir panel Compartir'));
        requiresApproval = true;
        break;
      }
      case 'comment': {
        const open = INSTAGRAM_UI.find((x) => x.id === 'comment-open')!;
        const input = INSTAGRAM_UI.find((x) => x.id === 'comment-input')!;
        const post = INSTAGRAM_UI.find((x) => x.id === 'comment-post')!;
        actions.push(mkAction('click', open.id, open.label, open.selectors, 'Abrir comentarios'));
        actions.push(
          mkAction('type', input.id, input.label, input.selectors, `Escribir comentario: "${intent.text ?? '…'}"`, {
            text: intent.text,
          }),
        );
        actions.push(mkAction('click', post.id, post.label, post.selectors, 'Publicar el comentario'));
        requiresApproval = true;
        break;
      }
      case 'follow': {
        const t = INSTAGRAM_UI.find((x) => x.id === 'follow-btn')!;
        actions.push(mkAction('click', t.id, t.label, t.selectors, 'Hacer click en Seguir'));
        requiresApproval = true;
        break;
      }
      case 'unfollow': {
        const t = INSTAGRAM_UI.find((x) => x.id === 'follow-btn')!;
        actions.push(mkAction('click', t.id, t.label, t.selectors, 'Hacer click en Dejar de seguir'));
        requiresApproval = true;
        break;
      }
      case 'view-stories': {
        const bar = INSTAGRAM_UI.find((x) => x.id === 'story-bar')!;
        const first = INSTAGRAM_UI.find((x) => x.id === 'story-first')!;
        actions.push(mkAction('scroll', bar.id, bar.label, bar.selectors, 'Ubicar la barra de historias'));
        actions.push(mkAction('click', first.id, first.label, first.selectors, 'Abrir la primera historia'));
        break;
      }
      case 'react-story': {
        const storyReply = INSTAGRAM_UI.find((x) => x.id === 'story-reply')!;
        actions.push(
          mkAction('type', storyReply.id, storyReply.label, storyReply.selectors, 'Responder historia', {
            text: intent.text ?? '🔥',
          }),
        );
        requiresApproval = true;
        break;
      }
      case 'reply-dm': {
        pushNav('dms', 'Mensajes Directos');
        unresolved.push('contenido de la respuesta DM (requiere generación del agente community)');
        requiresApproval = true;
        break;
      }
      case 'publish': {
        const create = INSTAGRAM_UI.find((x) => x.id === 'create')!;
        const file = INSTAGRAM_UI.find((x) => x.id === 'create-select-file')!;
        const next = INSTAGRAM_UI.find((x) => x.id === 'create-next')!;
        const cap = INSTAGRAM_UI.find((x) => x.id === 'create-caption')!;
        const share = INSTAGRAM_UI.find((x) => x.id === 'create-share')!;
        actions.push(mkAction('click', create.id, create.label, create.selectors, 'Abrir Crear +'));
        actions.push(mkAction('click', file.id, file.label, file.selectors, 'Seleccionar archivo'));
        actions.push(mkAction('click', next.id, next.label, next.selectors, 'Siguiente'));
        actions.push(mkAction('click', next.id, next.label, next.selectors, 'Siguiente (filtros)'));
        actions.push(mkAction('type', cap.id, cap.label, cap.selectors, 'Escribir el caption'));
        actions.push(mkAction('click', share.id, share.label, share.selectors, 'Compartir / Publicar'));
        requiresApproval = true;
        break;
      }
      case 'scroll': {
        const qty = intent.quantity ?? 1;
        for (let i = 0; i < qty; i++) {
          actions.push(mkAction('scroll', 'feed', 'Feed', [], `Desplazar el feed hacia abajo (${i + 1}/${qty})`));
        }
        break;
      }
      case 'search': {
        if (intent.username) {
          addSearchForUser(intent.username);
        } else if (intent.text) {
          const searchBtn = INSTAGRAM_UI.find((x) => x.id === 'search')!;
          actions.push(mkAction('click', searchBtn.id, searchBtn.label, searchBtn.selectors, 'Abrir buscador'));
          actions.push(
            mkAction(
              'type',
              'search-input',
              'Campo de búsqueda',
              ['input[placeholder*="Buscar"]'],
              `Buscar: ${intent.text}`,
              { text: intent.text },
            ),
          );
          actions.push(
            mkAction('press', 'search-submit', 'Enviar búsqueda', ['input[placeholder*="Buscar"]'], 'Enviar búsqueda'),
          );
        } else {
          unresolved.push('búsqueda sin término especificado');
        }
        break;
      }
      case 'open-post': {
        const gridItem = INSTAGRAM_UI.find((x) => x.id === 'post-grid-item')!;
        const qty = intent.quantity ?? 1;
        for (let i = 0; i < qty; i++) {
          actions.push(
            mkAction(
              'click',
              gridItem.id,
              `${gridItem.label} #${i + 1}`,
              gridItem.selectors,
              `Abrir publicación #${i + 1}`,
            ),
          );
          if (i < qty - 1) {
            actions.push(mkAction('click', 'home', 'Cerrar modal', ['body'], 'Cerrar modal (ESC)'));
            actions.push(mkAction('scroll', 'feed', 'Feed', [], 'Scroll para siguiente'));
          }
        }
        break;
      }
      case 'insights': {
        pushNav('profile', 'Perfil');
        actions.push(
          mkAction('click', 'insights-tab', 'Ver insights', ['a[href*="/insights/"]'], 'Ver métricas del perfil'),
        );
        break;
      }
      case 'delete': {
        unresolved.push('eliminar contenido — requiere confirmación adicional no automatizable');
        requiresApproval = true;
        break;
      }
      case 'archive': {
        unresolved.push('archivar contenido — requiere menú contextual no automatizable');
        requiresApproval = true;
        break;
      }
      default:
        unresolved.push(intent.targetHint ?? instruction);
    }
  }

  return {
    instruction,
    surface: 'instagram',
    actions,
    requiresApproval: requiresApproval || actions.some((a) => WRITE_TARGETS.has(a.targetId)),
    unresolved,
    notes: requiresApproval
      ? 'Este plan contiene acciones de escritura (publicar/comentar/seguir/compartir). Requiere aprobación humana antes de ejecutar en vivo.'
      : 'Plan de solo lectura/navegación — seguro para ejecutar.',
  };
};

/** Plan navigation INSIDE the FeedIA dashboard itself (route hops). */
export const planInternalNavigation = (routeSequence: string[]): ComputerPlan => {
  _seq = 0;
  const actions = routeSequence.map((r) =>
    mkAction('navigate', r, `FeedIA › ${r}`, [`[data-route="${r}"]`], `Navegar internamente a la vista ${r}`, {
      url: `#${r}`,
    }),
  );
  return {
    instruction: `Navegación interna: ${routeSequence.join(' → ')}`,
    surface: 'feedia-internal',
    actions,
    requiresApproval: false,
    unresolved: [],
    notes: 'Navegación interna del dashboard FeedIA — siempre segura.',
  };
};
