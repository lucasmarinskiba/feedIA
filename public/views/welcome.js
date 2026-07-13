/* ══════════════════════════════════════════════════════════════════════════════
   WELCOME — Onboarding wizard estilo unboxing
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiBust, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { setPlatform, getPlatform } from '../lib/platform.js';

let session = null;
let currentStageContent = null;

const STAGE_ICONS = {
  'initial-greeting': '👋',
  'system-naming': '✨',
  'mascot-selection': '🤝',
  'first-question': '💭',
  'theme-selection': '🎨',
  'goal-aspiration': '🚀',
  'sample-action': '🎬',
  'first-promise': '🤞',
  completion: '🎉',
};

/* Guía de herramientas por red (Instagram / TikTok): qué hace cada una, sus
   capacidades concretas y cómo te ayuda según el algoritmo de cada plataforma. */
const TOOLS_SUMMARY = {
  instagram: {
    label: 'Instagram',
    emoji: '📸',
    accent: '#C13584',
    note: 'Algoritmo IG: gana lo que se GUARDA y se MANDA por DM. FeedIA optimiza para sends/saves y alcance de Reels.',
    tools: [
      {
        route: 'studio-carousel',
        icon: '🎠',
        name: 'Studio Carrusel',
        tagline: 'Carruseles 4:5 que la gente guarda y comparte.',
        caps: [
          'Estrategia + copy slide a slide con tu voz de marca',
          'Prompts de imagen gpt-image-2 / nano-banana',
          'Render real de PNG 1080×1350',
          'Caption + hashtags anti-shadowban',
          'Diseña en Canva vía Computer Use',
        ],
        help: 'Sube saves + dwell time: slide 1 promete, última paga + CTA.',
      },
      {
        route: 'studio-reel',
        icon: '🎬',
        name: 'Studio Reel',
        tagline: 'Reels 9:16, motor de alcance frío (no-seguidores).',
        caps: [
          'Guion beat a beat + hook visual 0.3s',
          'Texto en pantalla + b-roll sugerido',
          'Audio/sonido recomendado',
          'Cover frame + caption + hashtags',
          'Render IA o Canva (CU)',
        ],
        help: 'Optimiza retención y loop: lo que se ve completo, se distribuye.',
      },
      {
        route: 'studio-stories',
        icon: '📖',
        name: 'Studio Stories',
        tagline: 'Secuencias 1080×1920 para tus seguidores.',
        caps: [
          'Frames + copy por frame',
          'Stickers poll / quiz / slider / pregunta',
          'CTA + link sugerido',
          'Render IA o Canva (CU)',
        ],
        help: 'Sube relación y respuestas (no alcance frío): completion + replies.',
      },
      {
        route: 'feed',
        icon: '👤',
        name: 'Perfil & Feed',
        tagline: 'Tu primera impresión y coherencia visual.',
        caps: [
          'Perfil: foto, @, bio, seguidores/seguidos/likes',
          'Coherencia estética del grid',
          'Lectura de tus publicaciones',
        ],
        help: 'Convierte al visitante: bio clara + grid coherente = más follows.',
      },
    ],
  },
  tiktok: {
    label: 'TikTok',
    emoji: '🎵',
    accent: '#FE2C55',
    note: 'Algoritmo TikTok (≠ IG): FYP en frío, los seguidores casi no importan; mandan completion-rate + rewatch + sonido trending.',
    tools: [
      {
        route: 'studio-tiktok',
        icon: '🎥',
        name: 'Studio TikTok Video',
        tagline: 'Video para FYP, de la idea al montaje final.',
        caps: [
          'Estrategia FYP + guion con lenguaje no verbal',
          'CapCut vía CU: cortes, subtítulos auto, beat-sync',
          'Clip IA: Sora / Seedance / Pika / Kling',
          'Frames/cover: Nano Banana / gpt-image',
          'Editor nativo TikTok + sonido trending',
        ],
        help: 'Maximiza completion + rewatch: ritmo de cortes 2-4s y loop de cierre.',
      },
      {
        route: 'studio-tiktok-photo',
        icon: '🖼️',
        name: 'Foto TikTok · Photo Mode',
        tagline: 'Carrusel de fotos NATIVO de TikTok (≠ carrusel IG).',
        caps: [
          'Equipo de IA interno perfecciona el prompt de cada foto',
          'Lienzo de preview 9:16 + miniaturas',
          'Audiencia (edad/género/región) + estilo/paleta/mood',
          '18 estilos visuales, densidad de texto',
          'Render IA o editar en Canva / Photopea (CU)',
        ],
        help: 'Foto 1 = hook que obliga a deslizar; 1 idea por foto = swipe completion.',
      },
      {
        route: 'studio-tiktok-script',
        icon: '✍️',
        name: 'Guion TikTok',
        tagline: 'Guion beat a beat listo para grabar.',
        caps: [
          'Hooks 0-2s (verbal + visual + on-screen)',
          'Lenguaje no verbal: gesto, expresión, mirada',
          'Audiencia + tono + tipo de gancho + CTA + ritmo',
          '18 tipos de video (POV, storytime, listicle…)',
          '10 hooks + checklist de retención',
        ],
        help: 'Construido para completion: open loops, cliffhangers y loop final.',
      },
    ],
  },
};

const toolGroupHtml = (g) => `
  <div class="tools-col" style="background:#fff;border:1px solid #E3E6EB;border-top:3px solid ${g.accent};border-radius:16px;padding:18px;box-shadow:0 1px 2px rgba(16,24,40,.04);">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:22px;">${g.emoji}</span>
      <h3 style="margin:0;font-size:18px;color:#15181E;">${escape(g.label)}</h3>
    </div>
    <p style="margin:0 0 14px;line-height:1.5;font-size:13px;color:#475067;">${escape(g.note)}</p>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${g.tools
        .map(
          (t) => `
        <div class="tool-row" data-tool-route="${escape(t.route)}" style="cursor:pointer;background:#F8F9FB;border:1px solid #E9ECF2;border-radius:12px;padding:15px;transition:transform .15s,border-color .15s,box-shadow .15s;">
          <div style="display:flex;gap:11px;align-items:center;">
            <span style="font-size:24px;line-height:1;flex-shrink:0;">${t.icon}</span>
            <span style="flex:1;min-width:0;">
              <span style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:15px;color:#15181E;">${escape(t.name)} <span style="color:${g.accent};font-size:12px;margin-left:auto;white-space:nowrap;">Abrir →</span></span>
              <span style="display:block;line-height:1.4;margin-top:2px;font-size:13px;color:#667085;">${escape(t.tagline)}</span>
            </span>
          </div>
          <ul style="margin:11px 0 0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:5px;">
            ${t.caps.map((c) => `<li style="display:flex;gap:7px;line-height:1.45;font-size:13px;color:#344054;"><span style="color:${g.accent};flex-shrink:0;font-weight:700;">✓</span><span>${escape(c)}</span></li>`).join('')}
          </ul>
          <div style="margin-top:10px;padding-top:9px;border-top:1px solid #E9ECF2;font-size:13px;color:#475067;line-height:1.45;"><strong style="color:${g.accent};">Cómo te ayuda:</strong> ${escape(t.help)}</div>
        </div>`,
        )
        .join('')}
    </div>
  </div>`;

// Devuelve los grupos según plataforma elegida en el switcher.
const groupsForPlatform = (plat) => {
  if (plat === 'tiktok') return [TOOLS_SUMMARY.tiktok];
  if (plat === 'instagram') return [TOOLS_SUMMARY.instagram];
  return [TOOLS_SUMMARY.instagram, TOOLS_SUMMARY.tiktok]; // 'general' / Sala → ambas
};

const renderToolsSummary = (plat) => {
  const groups = groupsForPlatform(plat);
  const titulo =
    plat === 'tiktok'
      ? 'Tus herramientas de TikTok'
      : plat === 'instagram'
        ? 'Tus herramientas de Instagram'
        : 'Tus herramientas — Instagram y TikTok';
  return `
  <div id="welcome-tools" style="margin-top:40px;">
    <h2 style="text-align:center;margin-bottom:6px;">${titulo}</h2>
    <p class="small muted" style="text-align:center;margin-bottom:24px;">Qué hace cada Studio y cómo te ayuda. Tocá una para abrirla.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;max-width:1100px;margin:0 auto;">
      ${groups.map(toolGroupHtml).join('')}
    </div>
    <style>
      .tool-row:hover{transform:translateY(-2px);border-color:var(--accent,#7C3AED) !important;box-shadow:0 6px 18px rgba(0,0,0,.25);}
    </style>
  </div>`;
};

// Cablea los clicks de las filas de herramientas dentro de un scope.
const wireToolRows = (scope) => {
  scope.querySelectorAll('.tool-row').forEach((row) => {
    row.addEventListener('click', () => {
      const route = row.dataset.toolRoute;
      const plat = route.startsWith('studio-tiktok') ? 'tiktok' : route.startsWith('studio-') ? 'instagram' : null;
      if (plat) {
        try {
          setPlatform(plat);
        } catch {
          /* noop */
        }
      }
      window.location.hash = `#${route}`;
    });
  });
};

// Asegura que el resumen (platform-aware) esté SIEMPRE al final del welcome.
const appendTools = (container) => {
  container.querySelector('#welcome-tools')?.remove();
  container.insertAdjacentHTML('beforeend', renderToolsSummary(getPlatform()));
  wireToolRows(container);
};

const renderInitialScreen = (container) => {
  container.innerHTML = `
    <div class="welcome-hero" style="text-align:center;padding:60px 20px;background:linear-gradient(135deg,#FBE7C6 0%,#FFD6A5 100%);color:#1A1A1A;border-radius:18px;">
      <div style="font-size:80px;line-height:1;">📦</div>
      <h1 style="font-size:42px;margin:20px 0 10px;">Bienvenido a tu nuevo asistente</h1>
      <p style="font-size:18px;opacity:0.85;max-width:600px;margin:0 auto;">Vamos a personalizarlo a tu medida. 7 minutos. Ningún clic se pierde.</p>
      <button class="btn primary large" id="show-tutorials" style="margin-top:30px;font-size:18px;padding:14px 32px;">Empezar la experiencia →</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:30px;">
      <div class="card"><h4>🎨 Tema visual</h4><p class="small muted">Elegí los colores y la onda</p></div>
      <div class="card"><h4>🤝 Tu compañero</h4><p class="small muted">Un mascot que te acompaña</p></div>
      <div class="card"><h4>🚀 Tu meta</h4><p class="small muted">Soñemos en grande</p></div>
      <div class="card"><h4>🎬 Demo en vivo</h4><p class="small muted">Te muestro qué puedo hacer</p></div>
    </div>

    <div id="tutorial-picker" hidden style="margin-top:40px;">
      <h2 style="text-align:center;margin-bottom:10px;">¿Cómo querés usar FeedIA?</h2>
      <p class="small muted" style="text-align:center;margin-bottom:24px;">Elegí el modo que más se adapta a vos. Podés cambiarlo después en cualquier momento desde el botón "Computer Use" del top bar.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;max-width:1100px;margin:0 auto;">
        <button class="tutorial-card" data-tutorial="computer-use" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,rgba(63,184,201,0.15),rgba(63,184,201,0.04));border:2px solid rgba(63,184,201,0.4);border-radius:14px;padding:22px;color:inherit;">
          <div style="font-size:42px;margin-bottom:10px;">🤖</div>
          <h3 style="margin:0 0 8px;">Modo Automático</h3>
          <p class="small muted">FeedIA usa el cursor solo. Vos te cruzás de brazos y mirás cómo abre Canva, diseña, exporta y publica en Instagram.</p>
          <ul class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.6;">
            <li>El más cómodo: cero clicks tuyos</li>
            <li>Mirás todo en tiempo real (SSE)</li>
            <li>Requiere ANTHROPIC_API_KEY</li>
          </ul>
          <div class="small accent" style="margin-top:12px;font-weight:600;">→ Recomendado para empezar</div>
        </button>

        <button class="tutorial-card" data-tutorial="supervised" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.04));border:2px solid rgba(245,158,11,0.4);border-radius:14px;padding:22px;color:inherit;">
          <div style="font-size:42px;margin-bottom:10px;">👁️</div>
          <h3 style="margin:0 0 8px;">Modo Acompañado</h3>
          <p class="small muted">FeedIA propone cada paso y vos aprobás antes de ejecutar. Aprendés mientras opera.</p>
          <ul class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.6;">
            <li>Aprobás cada acción importante</li>
            <li>Ideal para entender qué hace el sistema</li>
            <li>Vos siempre tenés el control</li>
          </ul>
          <div class="small" style="margin-top:12px;color:#F59E0B;font-weight:600;">→ Ideal si querés aprender</div>
        </button>

        <button class="tutorial-card" data-tutorial="manual" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,rgba(132,204,22,0.15),rgba(132,204,22,0.04));border:2px solid rgba(132,204,22,0.4);border-radius:14px;padding:22px;color:inherit;">
          <div style="font-size:42px;margin-bottom:10px;">✋</div>
          <h3 style="margin:0 0 8px;">Modo Manual</h3>
          <p class="small muted">Vos hacés. FeedIA es tu asistente: te sugiere captions, hashtags, hooks, ideas. Decidís y publicás vos.</p>
          <ul class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.6;">
            <li>Control 100% en tus manos</li>
            <li>FeedIA solo sugiere y analiza</li>
            <li>Sin Computer Use</li>
          </ul>
          <div class="small" style="margin-top:12px;color:#84CC16;font-weight:600;">→ Para quien prefiere el control total</div>
        </button>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <button class="btn ghost" id="back-from-tutorials">← Volver</button>
        <button class="btn primary" id="start-onboarding" style="margin-left:10px;">Saltar tutorial y configurar →</button>
      </div>
    </div>

    <div id="tutorial-detail" hidden style="margin-top:30px;"></div>

    <!-- Mini-tutoriales adicionales: features que el usuario suele preguntar -->
    <div style="margin-top:48px;">
      <h2 style="text-align:center;margin-bottom:6px;">Más cosas que podés hacer</h2>
      <p class="small muted" style="text-align:center;margin-bottom:24px;">Mini-tutoriales para sacarle todo el jugo a la plataforma.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;max-width:1100px;margin:0 auto;">
        <button class="tutorial-card mini" data-tutorial="voice" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">🎙️</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Comandos por voz</h3>
          <p class="small muted" style="line-height:1.5;">Decí "Hola FeedIA" o tocá el micrófono y pedile cualquier cosa: "diseñá un carrusel sobre X", "mostrame las métricas", "respondé los DMs".</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="chatbot" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">✦</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Asistente FeedIA chat</h3>
          <p class="small muted" style="line-height:1.5;">La burbuja violeta al lado del micrófono. Conoce tu marca, métricas, equipo y automatizaciones. Pregúntale lo que sea.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="studios" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">🎨</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Studios: Carrusel / Reel / Story</h3>
          <p class="small muted" style="line-height:1.5;">Generá contenido con preview en mockup de teléfono. Botón "Diseñar en Canva" prioriza Canva API y cae a Computer Use si no hay key.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="taskboard" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">📋</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Task Board del equipo</h3>
          <p class="small muted" style="line-height:1.5;">Kanban del equipo IA. Ves qué hace Nova, Lía, Gard, Luca, Mira en tiempo real, workload y standup diario.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="intelligence" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">🧬</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Inteligencia del sistema</h3>
          <p class="small muted" style="line-height:1.5;">Presupuesto de tokens, bandits de aprendizaje, caché semántica y digest ejecutivo. Para ver cómo aprende solo.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="sala" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">👑</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Sala Ejecutiva</h3>
          <p class="small muted" style="line-height:1.5;">Tu apalancamiento: cuántas acciones ejecutó el equipo, sueldos que NO pagás, horas ahorradas y tu credencial de estatus.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="emergency" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">🛑</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Frenar al agente (emergencia)</h3>
          <p class="small muted" style="line-height:1.5;">En cualquier momento podés frenar al Computer Use Agent desde el botón rojo del top bar. Cancela pendientes y pasa a Desactivado.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="personalize" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">🎨</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Personalización</h3>
          <p class="small muted" style="line-height:1.5;">Cambiale el nombre al sistema, elegí el mascot, el tema visual, sound pack y rituales matutinos/nocturnos.</p>
        </button>
      </div>
    </div>
  `;

  // Mostrar el picker de tutoriales al hacer click en "Empezar"
  document.getElementById('show-tutorials').addEventListener('click', () => {
    document.querySelector('.welcome-hero').style.display = 'none';
    document.getElementById('tutorial-picker').hidden = false;
    document.getElementById('tutorial-picker').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('back-from-tutorials')?.addEventListener('click', () => {
    document.querySelector('.welcome-hero').style.display = 'block';
    document.getElementById('tutorial-picker').hidden = true;
    document.getElementById('tutorial-detail').hidden = true;
    document.getElementById('tutorial-detail').innerHTML = '';
  });

  // Cada card abre detail
  container.querySelectorAll('.tutorial-card').forEach((card) => {
    card.addEventListener('click', () => {
      const mode = card.dataset.tutorial;
      renderTutorialDetail(container, mode);
    });
  });

  // Resumen de herramientas (platform-aware) al final, siempre visible.
  appendTools(container);

  document.getElementById('start-onboarding').addEventListener('click', async () => {
    const { data, error } = await apiSafe('/api/welcome/start', null, { method: 'POST', body: {} });
    if (error || !data) {
      toast('No se pudo iniciar (backend offline). Refrescá cuando vuelva el servidor.', 'warn');
      return;
    }
    session = data;
    await loadStage(container, session.currentStage);
  });
};

const renderTutorialDetail = (container, mode) => {
  const tutorials = {
    'computer-use': {
      icon: '🤖',
      title: 'Modo Automático · Computer Use Agent',
      summary: 'FeedIA opera tu Instagram con cursor y teclado virtuales mientras vos mirás. Sin tocar nada.',
      steps: [
        {
          n: 1,
          title: 'Activá Computer Use',
          desc: 'Hacé click en el botón "Computer Use" del top bar y elegí el pill 🟢 Auto.',
        },
        {
          n: 2,
          title: 'Dale una orden por voz o texto',
          desc: 'Decí "FeedIA, diseñá y publicá un carrusel sobre productividad" — o usá el chatbot.',
        },
        {
          n: 3,
          title: 'Mirá cómo opera',
          desc: 'En "Pantalla en vivo" ves el cursor abrir Canva, elegir template, escribir, exportar y subir a Instagram.',
        },
        {
          n: 4,
          title: 'Revisá el replay',
          desc: 'En "Replay Log" queda grabada cada acción con screenshot para auditar después.',
        },
      ],
      ideal: 'Si querés que el sistema haga TODO mientras vos seguís con tu vida.',
      cta: 'Configurar ahora →',
    },
    supervised: {
      icon: '👁️',
      title: 'Modo Acompañado · Aprobás cada paso',
      summary:
        'FeedIA propone cada acción importante y vos aprobás o rechazás antes de ejecutar. Aprendés mientras te asiste.',
      steps: [
        { n: 1, title: 'Activá modo Supervisado', desc: 'En el top bar → "Computer Use" → pill 👁️ Acompañar.' },
        {
          n: 2,
          title: 'Solicitá lo que necesites',
          desc: 'Pedí lo mismo que en Auto, pero ahora antes de cada acción importante ves un popup "¿Aprobás?".',
        },
        {
          n: 3,
          title: 'Revisá y aprobá',
          desc: 'En el panel "Esperando aprobación" del top bar, leés qué quiere hacer y hacés clic en ✓ Aprobar o ✗ Rechazar.',
        },
        {
          n: 4,
          title: 'Aprendés observando',
          desc: 'Después de unas semanas vas a sentirte cómodo para pasar a Auto sin perder el control.',
        },
      ],
      ideal: 'Si querés aprender cómo opera el sistema o no confiás 100% todavía.',
      cta: 'Configurar ahora →',
    },
    manual: {
      icon: '✋',
      title: 'Modo Manual · Vos al volante',
      summary:
        'FeedIA es tu asistente experto: sugiere captions, hashtags, hooks, analiza métricas. Vos publicás manualmente.',
      steps: [
        {
          n: 1,
          title: 'Computer Use apagado',
          desc: 'En el top bar → "Computer Use" → pill 🔴 Desactivado. El cursor no se mueve solo.',
        },
        {
          n: 2,
          title: 'Pedí sugerencias',
          desc: 'Usá Studio (Carrusel/Reel/Story) o Tools (Hooks, Hashtags, Caption) para que FeedIA te genere contenido.',
        },
        { n: 3, title: 'Revisá y ajustá', desc: 'Editás lo que te pase, le decís qué cambiar. FeedIA itera con vos.' },
        { n: 4, title: 'Publicás vos', desc: 'Copiás el contenido a Instagram y publicás en el momento que elijas.' },
      ],
      ideal: 'Si preferís control total y solo querés un asistente de ideas + métricas.',
      cta: 'Configurar ahora →',
    },
    voice: {
      icon: '🎙️',
      title: 'Comandos por voz · "Hola FeedIA"',
      summary:
        'Hands-free total. Activá el micrófono y pedí lo que necesites como si le hablaras a un asistente humano.',
      steps: [
        {
          n: 1,
          title: 'Activá el micrófono',
          desc: 'Tocá la burbuja roja con el ícono de micrófono (esquina inferior derecha) o decí "Hola FeedIA" si tenés wake word activo.',
        },
        {
          n: 2,
          title: 'Hablá natural',
          desc: '"Diseñá un carrusel sobre disciplina", "mostrame las métricas del mes", "respondé los DMs pendientes".',
        },
        {
          n: 3,
          title: 'Mirá la respuesta',
          desc: 'FeedIA te habla de vuelta (voz neutra en español) y ejecuta la acción correspondiente. Si pide aprobación, te lo cuenta.',
        },
        {
          n: 4,
          title: 'Configurá la voz',
          desc: 'En Settings podés cambiar la voz, el tono, activar/desactivar narrador automático y wake word.',
        },
      ],
      ideal: 'Si querés operar el sistema mientras hacés otra cosa o desde el celular.',
      cta: null,
    },
    chatbot: {
      icon: '✦',
      title: 'Asistente FeedIA · chat conversacional',
      summary:
        'La burbuja violeta junto al micrófono. Un chat persistente que conoce tu marca, métricas, equipo y automatizaciones.',
      steps: [
        {
          n: 1,
          title: 'Abrí la burbuja',
          desc: 'Tocá la burbuja violeta con ✦ al lado del micrófono. Se despliega un panel a la derecha.',
        },
        {
          n: 2,
          title: 'Usá las sugerencias',
          desc: 'Hay 6 sugerencias rápidas (mejor hora, carrusel viral, análisis, hooks, engagement, 30 días) o escribí libre.',
        },
        {
          n: 3,
          title: 'Recibí respuestas con tool chips',
          desc: 'FeedIA puede devolver chips con atajos directos a las vistas relevantes ("→ Ver calendario", "🃏 Carrusel").',
        },
        {
          n: 4,
          title: 'Limpiá la conversación',
          desc: 'El ícono 🗑 del header borra el historial actual. Útil si querés cambiar de tema sin contexto previo.',
        },
      ],
      ideal: 'Para consultas rápidas sin abandonar la vista en la que estás.',
      cta: null,
    },
    studios: {
      icon: '🎨',
      title: 'Studios · Carrusel, Reel, Story',
      summary: 'Generadores de contenido con preview real en mockup de teléfono. Cada uno con integración Canva.',
      steps: [
        {
          n: 1,
          title: 'Elegí el formato',
          desc: 'En el menú: Studio Carrusel (slides 4:5), Studio Reel (beats 9:16) o Studio Stories (frames 9:16).',
        },
        {
          n: 2,
          title: 'Generá',
          desc: 'Escribí la idea/tema y dale "⚡ Generar". El sistema arma slides/beats/frames con SVG y la voz de tu marca.',
        },
        {
          n: 3,
          title: 'Diseñá en Canva',
          desc: 'Botón "🎨 Diseñar en Canva ahora": prioriza Canva API si está conectada → cae a Computer Use → fallback a abrir canva.com.',
        },
        {
          n: 4,
          title: 'Render con autofill',
          desc: 'Si tenés Canva Connect API, el botón "Render Canva (API)" genera el archivo final ya autollenado con tu copy.',
        },
      ],
      ideal: 'Si querés contenido editable rápido sin partir de cero.',
      cta: null,
    },
    taskboard: {
      icon: '📋',
      title: 'Task Board · Kanban del equipo IA',
      summary: 'Mirá qué hace cada agente IA en tiempo real: workload, tareas activas, bloqueadas y standup diario.',
      steps: [
        {
          n: 1,
          title: 'Standup de hoy',
          desc: 'Arriba: cuántas tareas en progreso, cuántas bloqueadas y críticas para hoy. Como una daily de equipo.',
        },
        {
          n: 2,
          title: 'Workload por agente',
          desc: 'Cada agente (Nova, Lía, Gard, Luca, Mira) con tareas activas, horas estimadas y bloqueos.',
        },
        {
          n: 3,
          title: 'Kanban',
          desc: 'Columnas: Por hacer / En progreso / Bloqueado / Hecho. Movés tareas con los botones tiny de cada card.',
        },
        {
          n: 4,
          title: 'Auditá decisiones',
          desc: 'Cada tarea queda trazada en Replay Log con screenshots si fue ejecutada por Computer Use.',
        },
      ],
      ideal: 'Para ver "qué hace tu equipo" sin abrir consolas técnicas.',
      cta: null,
    },
    intelligence: {
      icon: '🧬',
      title: 'Inteligencia · cómo aprende el sistema',
      summary: 'Panel técnico humanizado: token budget, bandits de Thompson, caché semántica y digest del día.',
      steps: [
        {
          n: 1,
          title: 'Token budget',
          desc: 'Cuánto gastó hoy el sistema en LLM calls vs cap diario, breaker (cierra si pasa el límite) y desglose por modelo.',
        },
        {
          n: 2,
          title: 'Bandits de aprendizaje',
          desc: 'Experimentos activos (hooks, hashtags, horarios). Thompson Sampling elige el "arm" con mejor performance.',
        },
        {
          n: 3,
          title: 'Caché semántica',
          desc: 'Hit rate de prompts reusados (ahorra plata). Top prompts más reusados con contador.',
        },
        {
          n: 4,
          title: 'Digest ejecutivo',
          desc: 'Resumen narrativo del día: misiones ok/parciales/fallidas, riesgos detectados y cosas que requieren atención.',
        },
      ],
      ideal: 'Si te interesa entender por qué el sistema decide lo que decide.',
      cta: null,
    },
    sala: {
      icon: '👑',
      title: 'Sala Ejecutiva · tu apalancamiento',
      summary: 'No es un panel de stats: es un ritual. Sentís que comandás un equipo de élite que trabajó para vos.',
      steps: [
        {
          n: 1,
          title: 'Tu tier de estatus',
          desc: 'Bronce / Plata / Oro / Platino / Visionario con barra de progreso al siguiente nivel.',
        },
        {
          n: 2,
          title: 'Apalancamiento',
          desc: 'Ratio "indicaciones que diste → acciones ejecutadas para vos". Cuántos sueldos NO pagás, horas humanas ahorradas.',
        },
        {
          n: 3,
          title: 'Staff y trofeos',
          desc: 'Tu staff de élite reportándote en vivo + vitrina de logros desbloqueados.',
        },
        {
          n: 4,
          title: 'Credencial compartible',
          desc: 'Texto + SVG/PNG descargables para mostrar a inversores o en redes ("Modo inversores").',
        },
      ],
      ideal: 'Para el momento de cierre del día o de la semana.',
      cta: null,
    },
    emergency: {
      icon: '🛑',
      title: 'Frenar al agente · botón de emergencia',
      summary: 'En cualquier momento podés cortar TODO lo que esté haciendo el Computer Use Agent.',
      steps: [
        {
          n: 1,
          title: 'Botón rojo del top bar',
          desc: 'Abrí el dropdown "Computer Use" del top bar. Abajo de todo hay un botón rojo "🛑 Frenar al agente".',
        },
        {
          n: 2,
          title: 'Qué hace',
          desc: 'Rechaza TODAS las pending approvals + fuerza modo "Desactivado". El cursor deja de moverse al instante.',
        },
        {
          n: 3,
          title: 'Cuándo usarlo',
          desc: 'Si ves que algo se está por publicar mal, si el sistema entró en loop, o si simplemente querés cortar.',
        },
        {
          n: 4,
          title: 'Reactivar después',
          desc: 'Cuando quieras volver a activarlo, elegí el modo (Activado / Asistente) desde el mismo dropdown.',
        },
      ],
      ideal: 'Como red de seguridad mientras te acostumbrás al modo Auto.',
      cta: null,
    },
    personalize: {
      icon: '🎨',
      title: 'Personalización · hacelo tuyo',
      summary: 'Cambiá el nombre del sistema, el mascot, el tema visual, sound pack, fuentes y rituales diarios.',
      steps: [
        {
          n: 1,
          title: 'Identidad',
          desc: 'Cómo querés que se llame el sistema (default: Talía) y cómo querés que te llame a vos.',
        },
        {
          n: 2,
          title: 'Mascot + tema',
          desc: 'Elegí entre 6 mascots (Talía, Nova, Luca, Lía, Scout, Pixel) y 6 temas visuales (Sunrise, Ocean, Midnight, Forest, Sunset, Mono).',
        },
        {
          n: 3,
          title: 'Voz y sonido',
          desc: 'Personalidad de voz (amistosa, profesional, pícara, mentora) y sound pack (gentle, energetic, retro, natural, silent).',
        },
        {
          n: 4,
          title: 'Rituales',
          desc: 'Activá el ritual matutino y nocturno con horarios personalizados. Notas privadas que el sistema tiene presente.',
        },
      ],
      ideal: 'Una vez tengas el sistema funcionando, hacelo sentir tuyo.',
      cta: null,
    },
  };
  const t = tutorials[mode];
  if (!t) return;

  const detail = document.getElementById('tutorial-detail');
  detail.hidden = false;
  detail.innerHTML = `
    <div style="max-width:760px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:56px;line-height:1;margin-bottom:8px;">${escape(t.icon)}</div>
        <h2 style="margin:0;">${escape(t.title)}</h2>
        <p class="small muted" style="margin-top:8px;">${escape(t.summary)}</p>
      </div>
      <div class="card">
        ${t.steps
          .map(
            (s) => `
          <div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);align-items:flex-start;">
            <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;">${s.n}</div>
            <div style="flex:1;">
              <strong>${escape(s.title)}</strong>
              <div class="small muted" style="margin-top:4px;line-height:1.5;">${escape(s.desc)}</div>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
      <div class="card accent-border" style="margin-top:14px;">
        <div class="small muted" style="text-transform:uppercase;letter-spacing:1px;font-size:11px;">Cuándo elegirlo</div>
        <p style="margin:6px 0 0;">${escape(t.ideal)}</p>
      </div>
      <div style="text-align:center;margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="btn ghost" data-back-to-picker>← Volver</button>
        ${t.cta ? `<button class="btn primary" id="continue-to-onboarding-${mode}">${escape(t.cta)}</button>` : ''}
      </div>
    </div>
  `;
  detail.scrollIntoView({ behavior: 'smooth' });

  detail.querySelector('[data-back-to-picker]').addEventListener('click', () => {
    detail.hidden = true;
    detail.innerHTML = '';
  });

  if (!t.cta) return;
  detail.querySelector(`#continue-to-onboarding-${mode}`).addEventListener('click', async () => {
    // Guardar el modo elegido en localStorage para aplicarlo después
    try {
      localStorage.setItem('feedia.preferredMode', mode);
    } catch {
      /* noop */
    }
    // Si es computer-use o supervised, intentar setear el CUA mode al backend
    const cuaModeMap = { 'computer-use': 'auto', supervised: 'supervised', manual: 'off' };
    await apiSafe('/api/cu/mode', null, {
      method: 'PUT',
      body: { mode: cuaModeMap[mode], reason: 'Welcome tutorial', changedBy: 'user' },
    });
    const { data, error } = await apiSafe('/api/welcome/start', null, { method: 'POST', body: {} });
    if (error || !data) {
      toast('No se pudo iniciar (backend offline)', 'warn');
      return;
    }
    session = data;
    await loadStage(container, session.currentStage);
  });
};

const loadStage = async (container, stageName) => {
  container.innerHTML = '<div class="loading">Preparando paso...</div>';
  apiBust('/api/welcome');
  currentStageContent = await api(`/api/welcome/${session.id}/stage/${stageName}`);
  session = await api(`/api/welcome/${session.id}`);
  renderStage(container);
};

const renderStage = (container) => {
  const stages = [
    'initial-greeting',
    'system-naming',
    'mascot-selection',
    'first-question',
    'theme-selection',
    'goal-aspiration',
    'sample-action',
    'first-promise',
    'completion',
  ];
  const idx = stages.indexOf(session.currentStage);
  const progress = ((idx + 1) / stages.length) * 100;

  container.innerHTML = `
    <div style="max-width:680px;margin:0 auto;">
      <div class="progress-bar" style="height:6px;background:var(--bg-card-2);border-radius:3px;margin-bottom:30px;overflow:hidden;">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#3FB8C9,#E85A2C);transition:width 0.5s;"></div>
      </div>
      <div style="text-align:center;margin-bottom:30px;">
        <div style="font-size:64px;line-height:1;">${STAGE_ICONS[session.currentStage] ?? '✨'}</div>
        <h1 style="margin:20px 0 10px;font-size:28px;">${escape(currentStageContent.title)}</h1>
        <p style="font-size:16px;color:var(--text-muted);max-width:560px;margin:0 auto;">${escape(currentStageContent.subtitle)}</p>
      </div>
      <div id="stage-body"></div>
    </div>`;

  if (session.currentStage === 'completion') {
    renderCompletion(container);
    return;
  }

  const $body = document.getElementById('stage-body');

  if (session.currentStage === 'system-naming') {
    $body.innerHTML = `
      <div class="card">
        <label class="form-label">¿Cómo querés que me llame?</label>
        <input id="system-name" class="input" placeholder="Talía, Nova, Lex...">
        <label class="form-label" style="margin-top:14px;">Y vos, ¿cómo querés que te llame?</label>
        <input id="owner-nickname" class="input" placeholder="Capi, jefa, Lucas...">
        <button class="btn primary" id="next-btn" style="margin-top:18px;width:100%;">Siguiente →</button>
      </div>`;
    document.getElementById('next-btn').addEventListener('click', async () => {
      const sysName = document.getElementById('system-name').value || 'Talía';
      const nick = document.getElementById('owner-nickname').value;
      await advance({ systemName: sysName, ownerNickname: nick });
    });
  } else if (session.currentStage === 'mascot-selection' && currentStageContent.mascots) {
    $body.innerHTML = `
      <div class="page-grid">
        ${currentStageContent.mascots
          .map(
            (m) => `
          <div class="mascot-option" data-id="${escape(m.id)}" style="cursor:pointer;text-align:center;padding:20px;border:2px solid var(--border);border-radius:12px;transition:all 0.2s;">
            <div style="font-size:48px;">${escape(m.emoji)}</div>
            <h3 style="margin:10px 0 6px;">${escape(m.name)}</h3>
            <p class="small muted">${escape(m.description)}</p>
            <div class="meta" style="justify-content:center;margin-top:8px;">
              ${m.personality.map((p) => `<span class="tag tiny">${escape(p)}</span>`).join('')}
            </div>
          </div>`,
          )
          .join('')}
      </div>
      <button class="btn primary" id="next-btn" style="margin-top:20px;width:100%;" disabled>Elegir uno →</button>`;
    let selected = null;
    container.querySelectorAll('.mascot-option').forEach((el) => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.mascot-option').forEach((x) => (x.style.borderColor = 'var(--border)'));
        el.style.borderColor = 'var(--accent)';
        selected = el.dataset.id;
        document.getElementById('next-btn').disabled = false;
      });
    });
    document.getElementById('next-btn').addEventListener('click', async () => {
      if (!selected) return;
      await advance({ mascot: selected });
    });
  } else if (session.currentStage === 'first-question' && currentStageContent.questions) {
    $body.innerHTML = `
      <div class="card">
        ${currentStageContent.questions
          .map(
            (q, i) => `
          <div style="margin-bottom:20px;">
            <label class="form-label">${escape(q.question)}</label>
            <input class="input" data-key="${escape(q.key)}" placeholder="${escape(q.placeholder ?? '')}">
            ${q.hint ? `<div class="small muted" style="margin-top:4px;">${escape(q.hint)}</div>` : ''}
          </div>`,
          )
          .join('')}
        <button class="btn primary" id="next-btn" style="width:100%;">Siguiente →</button>
      </div>`;
    document.getElementById('next-btn').addEventListener('click', async () => {
      const story = {};
      container.querySelectorAll('input[data-key]').forEach((el) => {
        story[el.dataset.key] = el.value;
      });
      await advance({}, story);
    });
  } else if (session.currentStage === 'theme-selection' && currentStageContent.themes) {
    $body.innerHTML = `
      <div class="page-grid">
        ${currentStageContent.themes
          .map(
            (t) => `
          <div class="theme-option" data-id="${escape(t.id)}" style="cursor:pointer;padding:16px;border:2px solid var(--border);border-radius:12px;">
            <h3 style="margin:0 0 8px;">${escape(t.name)}</h3>
            <div style="display:flex;gap:6px;margin:8px 0;">
              ${t.palette.map((c) => `<div style="width:40px;height:40px;border-radius:8px;background:${c};"></div>`).join('')}
            </div>
            <p class="small muted">${escape(t.vibe)}</p>
          </div>`,
          )
          .join('')}
      </div>
      <button class="btn primary" id="next-btn" style="margin-top:20px;width:100%;" disabled>Siguiente →</button>`;
    let selected = null;
    container.querySelectorAll('.theme-option').forEach((el) => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.theme-option').forEach((x) => (x.style.borderColor = 'var(--border)'));
        el.style.borderColor = 'var(--accent)';
        selected = el.dataset.id;
        document.getElementById('next-btn').disabled = false;
      });
    });
    document.getElementById('next-btn').addEventListener('click', async () => {
      await advance({ theme: selected });
    });
  } else if (session.currentStage === 'goal-aspiration' && currentStageContent.prompts) {
    $body.innerHTML = `
      <div class="card">
        ${currentStageContent.prompts
          .map(
            (p) => `
          <div style="margin-bottom:16px;">
            <label class="form-label">${escape(p.label)}</label>
            <input class="input" data-key="${escape(p.key)}" placeholder="${escape(p.placeholder ?? '')}">
          </div>`,
          )
          .join('')}
        <button class="btn primary" id="next-btn" style="width:100%;">Anotalo →</button>
      </div>`;
    document.getElementById('next-btn').addEventListener('click', async () => {
      const story = {};
      container.querySelectorAll('input[data-key]').forEach((el) => {
        story[el.dataset.key] = el.value;
      });
      await advance({}, story);
    });
  } else if (session.currentStage === 'sample-action') {
    $body.innerHTML = `
      <div class="card">
        <p>${escape(currentStageContent.demoDescription ?? 'Ahora te muestro qué puedo hacer...')}</p>
        ${currentStageContent.demoSteps ? `<ol style="margin:10px 0;">${currentStageContent.demoSteps.map((s) => `<li>${escape(s)}</li>`).join('')}</ol>` : ''}
        <button class="btn primary" id="next-btn" style="width:100%;margin-top:10px;">Continuar →</button>
      </div>`;
    document.getElementById('next-btn').addEventListener('click', () => advance({}));
  } else if (session.currentStage === 'first-promise') {
    $body.innerHTML = `
      <div class="card" style="text-align:center;">
        <p style="font-size:18px;line-height:1.6;">${escape(currentStageContent.promiseText ?? 'Te voy a acompañar en esto.')}</p>
        <button class="btn primary" id="next-btn" style="margin-top:20px;">Acepto la promesa</button>
      </div>`;
    document.getElementById('next-btn').addEventListener('click', () => advance({}));
  } else {
    $body.innerHTML = `
      <div class="card">
        <p>${escape(currentStageContent.body ?? '')}</p>
        <button class="btn primary" id="next-btn" style="margin-top:14px;">Siguiente →</button>
      </div>`;
    document.getElementById('next-btn').addEventListener('click', () => advance({}));
  }

  // Resumen de herramientas siempre visible bajo el paso del onboarding.
  appendTools(container);
};

const advance = async (choices, personalStory) => {
  const stages = [
    'initial-greeting',
    'system-naming',
    'mascot-selection',
    'first-question',
    'theme-selection',
    'goal-aspiration',
    'sample-action',
    'first-promise',
    'completion',
  ];
  const idx = stages.indexOf(session.currentStage);
  const next = stages[idx + 1] ?? 'completion';
  apiBust('/api/welcome');
  await api(`/api/welcome/${session.id}/advance`, {
    method: 'POST',
    body: { nextStage: next, choices, personalStory },
  });
  await loadStage(document.querySelector('#view'), next);
};

const renderCompletion = async (container) => {
  const recap = await api(`/api/welcome/${session.id}/recap`);
  container.innerHTML = `
    <div style="text-align:center;padding:40px 20px;background:linear-gradient(135deg,#3FB8C9 0%,#7FCC3F 100%);color:white;border-radius:18px;">
      <div style="font-size:80px;line-height:1;">🎉</div>
      <h1 style="margin:20px 0 10px;font-size:36px;">${escape(recap.headline)}</h1>
      <p style="font-size:18px;opacity:0.92;">${escape(recap.summary)}</p>
    </div>
    <div class="card" style="margin-top:30px;">
      <h3>Lo que vamos a hacer juntos</h3>
      <ul>${recap.commitments.map((c) => `<li>${escape(c)}</li>`).join('')}</ul>
    </div>
    <div class="card" style="margin-top:14px;">
      <h3>Tu primer paso</h3>
      <p>${escape(recap.firstAction)}</p>
    </div>
    <button class="btn primary large" id="enter-home" style="margin-top:20px;width:100%;font-size:18px;padding:14px;">Entrar a mi nueva casa →</button>
  `;
  document.getElementById('enter-home').addEventListener('click', () => {
    window.location.hash = '#home';
  });
  appendTools(container);
};

// Refresca el resumen de herramientas al cambiar de plataforma (solo si welcome está montado).
if (typeof window !== 'undefined' && !window.__feediaWelcomeToolsBound) {
  window.__feediaWelcomeToolsBound = true;
  window.addEventListener('feedia:platform', () => {
    const view = document.querySelector('#view');
    if (view && view.querySelector('#welcome-tools')) appendTools(view);
  });
}

export const renderWelcome = async (container) => {
  // Render inmediato con la pantalla inicial (no requiere API).
  renderInitialScreen(container);

  // Intentar recuperar sesión activa en segundo plano.
  const { data: active, error } = await apiSafe('/api/welcome/active', null);
  if (error) {
    // Backend offline: el usuario igual puede ver la pantalla de bienvenida.
    // El botón "Empezar la experiencia" intentará startWelcome y si falla mostrará un toast.
    return;
  }
  // Hay onboarding a medias: NO secuestramos la pantalla (eso dejaba un paso vacío).
  // Mostramos un aviso para continuar; la guía de herramientas queda visible.
  if (active && active.currentStage !== 'completion') {
    session = active;
    const hero = container.querySelector('.welcome-hero');
    if (hero) {
      hero.insertAdjacentHTML(
        'beforeend',
        `<div style="margin-top:16px;"><button class="btn" id="resume-onboarding" style="background:rgba(0,0,0,.12);color:inherit;">↩️ Continuar configuración donde quedaste</button></div>`,
      );
      container
        .querySelector('#resume-onboarding')
        ?.addEventListener('click', () => loadStage(container, active.currentStage));
    }
  }
};
