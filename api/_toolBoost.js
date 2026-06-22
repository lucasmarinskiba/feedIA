/**
 * Tool Boost — biblioteca de modelos/libs/frameworks por (herramienta × plataforma).
 *
 * Cada herramienta de la sidebar (caption, hashtags, hooks, safety, profile,
 * repurpose, brand-studio, autopilot, etc) puede llamar `getToolBoost(tool, platform)`
 * y obtener:
 *   - modelHints: provider + modelo recomendado para esa tarea (gemini-flash | cerebras-reasoning | etc)
 *   - libs: librerías de datos (algoritmos, signals, métricas, palabras gatillo) específicas
 *   - frameworks: marcos mentales (PAS/AIDA/AARRR/4P/etc) que aplican mejor
 *   - reasoningSteps: pasos de chain-of-thought específicos
 *   - guardrails: qué NO hacer en esa plataforma para esa tool
 *
 * Aditivo: las tools existentes pueden ignorar el boost o prepender como priming.
 * GET /api/tool-boost?tool=caption&platform=instagram
 */

// ── PLATFORM PROFILES ───────────────────────────────────────────────────────
export const PLATFORM_PROFILES = {
  instagram: {
    label: 'Instagram',
    algorithmSignals: ['saves', 'shares', 'sends', 'dm_replies', 'profile_visits', 'completion'],
    weightedSignals: { saves: 5, shares: 4, sends: 4, comments: 3, dm: 4, likes: 0.5, follow: 5 },
    formats: ['reel', 'carousel', 'story', 'post', 'guide', 'broadcast'],
    primeFormats: ['reel', 'carousel'],
    canvasSpecs: { reel: '1080x1920', carousel: '1080x1440', story: '1080x1920', post: '1080x1350' },
    bestTimeWindows: ['18:00-20:00', '12:00-13:30', '07:00-08:30'],
    aiAlgoNotes:
      'IG 2026: prioriza Originalidad + Retención + DM Replies. Castiga reposts directos sin transformación. Caption ~125 chars max para preview sin "ver más".',
    audienceMindset: 'scroll consciente, busca valor + estética',
    avgAttention: '3-5s primera impresión, decisión swipe/skip en 1s',
  },
  tiktok: {
    label: 'TikTok',
    algorithmSignals: [
      'watch_time',
      'completion_rate',
      'rewatch',
      'shares',
      'comments',
      'follows_from_video',
      'fyp_distribution',
    ],
    weightedSignals: { watch_time: 8, completion: 7, rewatch: 6, shares: 5, comments: 3, likes: 0.3, follow: 6 },
    formats: ['video', 'photo-carousel', 'live', 'story', 'series'],
    primeFormats: ['video'],
    canvasSpecs: { video: '1080x1920', 'photo-carousel': '1080x1440', story: '1080x1920' },
    bestTimeWindows: ['19:00-22:00', '12:00-13:00', '06:00-09:00'],
    aiAlgoNotes:
      'TikTok 2026: For You Page premia Hook<3s + Watch Time >50% + Rewatch. Audio trending = boost. Hashtags ya no son determinantes, sí el on-screen text.',
    audienceMindset: 'scroll rápido, busca entretenimiento + sorpresa',
    avgAttention: '1-2s primer frame decide, abandono si no hay hook visual+textual',
  },
  sala: {
    label: 'Sala Ejecutiva (B2B / agencia)',
    algorithmSignals: ['booked_meetings', 'replies_value', 'demo_requests', 'pipeline_added', 'deal_velocity'],
    weightedSignals: { booked_meetings: 10, demo_requests: 8, replies_value: 6, comments: 3, dm: 5 },
    formats: ['linkedin-post', 'newsletter', 'webinar', 'proposal', 'case-study', 'cold-email', 'one-pager'],
    primeFormats: ['linkedin-post', 'case-study'],
    canvasSpecs: { 'linkedin-post': '1200x1200', 'one-pager': 'A4' },
    bestTimeWindows: ['Mar-Jue 09:00-11:00', 'Mar-Mié 14:00-16:00'],
    aiAlgoNotes:
      'B2B 2026: trust > viralidad. Decisiones con 3+ stakeholders. Buyer journey 60-180 días. ROI tangible obligatorio. Casos con números.',
    audienceMindset: 'pragmático, busca evidencia + reducir riesgo',
    avgAttention: '8-12s titular + lead, decisión continue/save/forward por estructura',
  },
};

// ── TOOL × PLATFORM KNOWLEDGE BASE ──────────────────────────────────────────
export const TOOL_BOOST = {
  // 1. CAPTION
  caption: {
    instagram: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'fast', maxTokens: 600 },
      libs: {
        chars: { ideal: 125, max_visible: 220, full: 2200 },
        powerWords_es: [
          'secreto',
          'nadie te dice',
          'imaginate',
          'gratis',
          'ahora',
          'descubrí',
          'método',
          'sistema',
          'real',
        ],
        ctaPatterns: ['Comentá [palabra]', 'Guardalo + compartilo', 'Etiquetá a alguien', 'Mandame "X" al DM'],
        hashtagsInCaption: false, // mejor en primer comentario
      },
      frameworks: ['Hook → Pain → Promise → Proof → CTA', 'PAS', 'AIDA'],
      reasoningSteps: [
        '1) Detectar awareness level',
        '2) Hook ≤8 palabras',
        '3) Body con UNA idea',
        '4) CTA con verbo concreto',
      ],
      guardrails: [
        'No empezar con "Hoy te traigo"',
        'No saturar emojis (max 4-5)',
        'No links en caption (afecta alcance)',
      ],
    },
    tiktok: {
      modelHints: { primary: 'cerebras-llama-3.3-70b', reasoning: 'low', maxTokens: 250 },
      libs: {
        chars: { ideal: 100, max: 2200 },
        ctaPatterns: ['Seguíme para parte 2', 'Comentá si querés más', 'Save para verlo después'],
        hashtagsInCaption: true, // sí, pero pocos (3-5)
        onScreenTextWeight: 'CRITICAL — caption es secundario, on-screen text es lo que vende',
      },
      frameworks: ['Hook visual + verbal → Tensión → Payoff → CTA', 'Sketch corto'],
      reasoningSteps: [
        '1) Caption refuerza hook, no lo repite',
        '2) Crear curiosity gap',
        '3) Mover audience a perfil/comments',
      ],
      guardrails: ['No caption largo (TT lo trunca)', 'No usar texto duplicado del video'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 900 },
      libs: {
        chars: { ideal: 600, max: 3000 },
        structureBlocks: [
          'Hook (1 línea)',
          'Contexto (2-3 líneas)',
          'Insight (1 frame)',
          'Prueba (números/caso)',
          'CTA (1 línea con baja fricción)',
        ],
        powerWords_es: ['validado', 'caso real', 'ROI', 'sistema', 'método probado', 'evidencia', 'rigor'],
        ctaPatterns: ['Comentá si te pasa', 'DM "AUDIT" si querés que lo miremos', 'Guardá esto para tu equipo'],
      },
      frameworks: ['Insight → Evidencia → Implicación → Acción', '4Ps (Promesa/Imagen/Prueba/Push)', 'AARRR para B2B'],
      reasoningSteps: [
        '1) Posicionar como peer, no vendedor',
        '2) Datos antes que opiniones',
        '3) CTA = micro-compromiso',
      ],
      guardrails: [
        'Cero hype',
        'No emojis decorativos (1-2 funcionales OK)',
        'No "secreto", "increíble", "espectacular"',
      ],
    },
  },

  // 2. HASHTAGS
  hashtags: {
    instagram: {
      modelHints: { primary: 'heuristic-only', reasoning: 'none', maxTokens: 0 },
      libs: {
        countOptimal: 8,
        countMax: 30,
        tierMix: { niche: 5, mid: 2, broad: 1 }, // 5 nicho (10K-200K) + 2 mid (200K-2M) + 1 broad
        avoidBanned: true,
        rotation: 'mover 30% del set cada semana',
        placement: 'primer comentario (no en caption)',
      },
      frameworks: ['Long tail dominance', 'Tribu + alcance + trend'],
      guardrails: [
        'No usar hashtags mega-saturados (#love)',
        'No 30 hashtags genéricos (penaliza)',
        'No copy/paste set fijo',
      ],
    },
    tiktok: {
      modelHints: { primary: 'heuristic-only', reasoning: 'none', maxTokens: 0 },
      libs: {
        countOptimal: 4,
        countMax: 6,
        tierMix: { trending: 1, niche: 2, broad: 1 },
        weight: 'BAJO — descubrimiento es 80% audio + on-screen text',
      },
      frameworks: ['Trending hijack + niche pin'],
      guardrails: ['#fyp ya NO funciona como antes', 'No copiar hashtag set viral ajeno (penaliza)'],
    },
    sala: {
      modelHints: { primary: 'heuristic-only', reasoning: 'none', maxTokens: 0 },
      libs: {
        countOptimal: 3,
        countMax: 5,
        tierMix: { industry: 2, role: 1, theme: 1 },
        examples: ['#B2BMarketing', '#SaaS', '#GoToMarket', '#RevOps'],
      },
      frameworks: ['Industry + Role + Trend'],
      guardrails: ['No usar hashtags consumer (#viral)', 'Foco en discoverability profesional'],
    },
  },

  // 3. HOOKS
  hooks: {
    instagram: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'low', maxTokens: 500 },
      libs: {
        wordCountMax: 8,
        topPatterns: [
          'Nadie te dice esto de X',
          '5 errores que matan tu X',
          'Si tenés X, no hagas Y',
          'POV: X',
          'Antes vs después de X',
          'El método que me dio Y resultados',
        ],
        avoidFirstWords: ['Hola', 'Hoy te traigo', 'Antes de empezar', 'Quiero contarles'],
      },
      frameworks: ['Curiosity-gap', 'Pattern-interrupt', 'Specificity (números + plazos)'],
      reasoningSteps: [
        '1) Identificar pain top de la persona',
        '2) Promesa concreta o gap',
        '3) Validar <8 palabras',
        '4) Forzar specificity',
      ],
      guardrails: ['No clickbait sin payoff', 'No generalizar'],
    },
    tiktok: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'low', maxTokens: 500 },
      libs: {
        wordCountMax: 6,
        firstFrameRules: ['Movimiento visual', 'Cambio de cámara', 'Cara + emoción', 'Texto on-screen contraintuitivo'],
        topPatterns: [
          'POV: X',
          'Tell me you X without saying it',
          'When you X',
          'I tried X for 30 days',
          'Things I wish I knew about X',
        ],
      },
      frameworks: ['Visual hook + verbal hook + on-screen text', 'Pattern interrupt en frame 1'],
      reasoningSteps: [
        '1) Frame 1 visual',
        '2) Texto on-screen 4 palabras max',
        '3) Tensión inmediata',
        '4) Payoff en <30s',
      ],
      guardrails: ['No intro larga', 'No saludar', 'No "hoy vamos a hablar de"'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 600 },
      libs: {
        wordCountMax: 14,
        topPatterns: [
          'Most [role] are doing X wrong. Here is the fix.',
          'Why we killed [practice] and saved [metric]',
          'How [company] went from X to Y in Z',
          '3 frameworks every [role] should steal',
        ],
      },
      frameworks: ['Contrarian thesis', 'Case study lead', 'Insight first, story second'],
      guardrails: ['No clickbait', 'Hook debe sostenerse con el body completo'],
    },
  },

  // 4. SAFETY / COMPLIANCE
  safety: {
    instagram: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'high', maxTokens: 400 },
      libs: {
        shadowbanRisks: [
          'palabras flag (suicide, sex, drug, weapon)',
          'hashtags baneados',
          'links externos en caption',
          'patrones spam (mass DM)',
          'engagement pod detection',
        ],
        bannedTags2026: ['#desnudo', '#fap', '#datesite', '#sex', '#snuff'],
        violationCategories: ['Sexual', 'Violence', 'Hate', 'Spam', 'IP infringement'],
        checks: ['hashtag flag', 'caption tone', 'image content (vision)', 'cta pattern'],
      },
      frameworks: ['NIST AI risk taxonomy lite', 'Platform-specific deny list'],
      guardrails: ['No saltarse copyright detection (Audio Library oficial siempre)'],
    },
    tiktok: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'high', maxTokens: 400 },
      libs: {
        suppressionRisks: [
          'mismo audio repetido',
          'click-bait sin payoff',
          'misleading thumbnails',
          'spam comments network',
        ],
        bannedTopics: ['weight loss extremo', 'medicine claims', 'crypto pump'],
      },
      frameworks: ['Community Guidelines TT 2026'],
      guardrails: ['No usar audios sin licencia comercial si la cuenta es business'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'high', maxTokens: 500 },
      libs: {
        complianceRisks: ['GDPR data mention', 'NDA breach', 'public client w/o consent', 'unsubstantiated ROI claim'],
        checks: ['claim has source', 'no client mentioned w/o permission', 'no proprietary data'],
      },
      frameworks: ['B2B disclosure standards', 'FTC/CONAR ad rules'],
      guardrails: ['Disclaimer en case studies con datos', 'Logos solo si hay autorización'],
    },
  },

  // 5. PROFILE / BIO
  profile: {
    instagram: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'medium', maxTokens: 500 },
      libs: {
        bioChars: 150,
        structure: ['Quién soy (1 línea)', 'Para quién (1 línea)', 'Qué obtienen (1 línea)', 'CTA + link'],
        nameKeywords: 'incluir keyword nicho en NAME (no @handle) para SEO IG',
        highlightCovers: 'visual coherente, 5-8 destacados temáticos',
      },
      frameworks: ['Bio-elevator-pitch', 'Niche keyword stacking'],
    },
    tiktok: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'medium', maxTokens: 400 },
      libs: {
        bioChars: 80,
        structure: ['Tagline corto', 'Promesa de contenido', 'CTA single line'],
        linkInBio: 'usar Linkpop nativo o herramienta integrada',
      },
      frameworks: ['Tagline-first', 'Single-promise bio'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 600 },
      libs: {
        linkedinHeadline: 220,
        structure: ['Cargo + empresa', 'A quién ayudás', 'Cómo (método/sistema)', 'Resultado típico (número)'],
      },
      frameworks: ['Headline value-prop', 'Featured section calibration'],
    },
  },

  // 6. REPURPOSE
  repurpose: {
    instagram: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 1200 },
      libs: {
        fromTo: {
          'long-form → carousel': '8-10 slides, 1 idea/slide, hook en slide 1, CTA en último',
          'reel → carousel': 'estructura beat-por-beat → slide-por-slide',
          'podcast → reels': 'cortar moments de 30-60s con caption sub',
        },
      },
      frameworks: ['Content molecule (1 idea → 5 formatos)', 'Pillar → Cluster → Feed'],
    },
    tiktok: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 1000 },
      libs: { fromTo: { 'reel IG → TT': 'reescribir hook frame 1, cambiar audio por trending TT' } },
      frameworks: ['Adapt-not-cross-post'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 1500 },
      libs: {
        fromTo: {
          'case-study → linkedin post': '300 palabras, hook contrarian, 3 bullets, CTA con comment',
          'webinar → newsletter': '5 takeaways + 1 frame + CTA',
        },
      },
      frameworks: ['B2B content pyramid'],
    },
  },

  // 7. CAROUSEL / SLIDES (delegado a _carouselDesignSystem)
  carousel: {
    instagram: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'low', maxTokens: 1500 },
      libs: {
        slidesIdeal: 7,
        slidesMax: 10,
        ratio: '4:5 (1080x1440)',
        textSize: 'XXL hook, XL título, L body',
        layoutVariants: 8,
      },
      frameworks: [
        'Validated 10-slide structure (hook/interes/atencion/practica/cta)',
        '8 layouts: editorial/brutal/premium_quote/comparison/list_numbered/before_after/data_card/story_narrative',
      ],
    },
    tiktok: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'low', maxTokens: 1200 },
      libs: {
        slidesIdeal: 8,
        slidesMax: 10,
        ratio: '4:5',
        textSize: 'GIGANTE on-screen',
        avoid: 'demasiado texto por slide',
      },
      frameworks: ['Photo mode 2025: cada slide es un "frame" de un mini-video'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 1800 },
      libs: {
        slidesIdeal: 9,
        slidesMax: 12,
        ratio: '1:1 LinkedIn / A4 vertical para deck',
        structureBlocks: ['Cover', 'Problem', 'Insight', 'Framework', 'Case', 'Steps', 'Results', 'CTA'],
      },
      frameworks: ['SCQA (Situation/Complication/Question/Answer)', 'Pyramid Principle'],
    },
  },

  // 8. REEL / VIDEO
  reel: {
    instagram: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'medium', maxTokens: 1500 },
      libs: {
        durationIdeal: '15-30s',
        durationMax: '90s',
        ratio: '9:16',
        subtitlesObligatory: true,
        broll: '60% del tiempo',
      },
      frameworks: ['Hook 3s → Tension 5-15s → Payoff 16-25s → CTA 26-30s', 'Pattern interrupt cada 3s'],
    },
    tiktok: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'medium', maxTokens: 1500 },
      libs: {
        durationIdeal: '21-34s',
        durationMax: '3min',
        ratio: '9:16',
        audio: 'trending obligatorio',
        onScreenText: 'CRITICAL',
      },
      frameworks: ['Hook 1s + 3s + 8s (3 hooks anidados)', 'Loop: último frame conecta con primero'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 1500 },
      libs: { durationIdeal: '45-90s', durationMax: '3min LinkedIn', ratio: '1:1 o 9:16', subtitlesObligatory: true },
      frameworks: ['Insight first → micro-case → CTA explícito'],
    },
  },

  // 9. STORIES
  story: {
    instagram: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'low', maxTokens: 800 },
      libs: {
        framesIdeal: 5,
        framesMax: 10,
        ratio: '9:16',
        stickers: ['poll', 'quiz', 'slider', 'question', 'countdown'],
        useStickerEverySecondFrame: true,
      },
      frameworks: ['Engagement-stacking: 1 frame valor → 1 frame sticker'],
    },
    tiktok: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'low', maxTokens: 600 },
      libs: { framesIdeal: 3, framesMax: 5, notes: 'TT Stories tiene bajo alcance, usar solo para community building' },
      frameworks: ['Behind-the-scenes only'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'low', maxTokens: 800 },
      libs: {
        equivalent: 'LinkedIn no tiene stories; usar carrusel corto o post imagen',
        note: 'reservado para creator-on-the-go',
      },
      frameworks: ['N/A'],
    },
  },

  // 10. AUTOPILOT (orchestrator entero)
  autopilot: {
    instagram: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'low', maxTokens: 2000 },
      libs: {
        stages: ['niche-detect', 'andromeda-combo', 'copy-slides', 'compose-svg', 'validate', 'publish-or-review'],
        budgetMs: 45000,
      },
      frameworks: ['Gstack meta-controller + Andromeda matrix + Validated structure'],
    },
    tiktok: {
      modelHints: { primary: 'cerebras-gpt-oss-120b', reasoning: 'low', maxTokens: 2000 },
      libs: {
        stages: ['niche-detect', 'andromeda-combo', 'script-beats', 'caption', 'publish-or-review'],
        requiresVideo: true,
      },
      frameworks: ['TT-first sequencing'],
    },
    sala: {
      modelHints: { primary: 'gemini-2.0-flash', reasoning: 'medium', maxTokens: 2500 },
      libs: {
        stages: ['detect-icp', 'angle-mining', 'structured-post', 'cta-engineering', 'review'],
        outputFormats: ['linkedin-post', 'newsletter', 'one-pager'],
      },
      frameworks: ['B2B content pyramid + SCQA'],
    },
  },
};

// ── API principal ───────────────────────────────────────────────────────────
export const getToolBoost = (tool, platform = 'instagram') => {
  const t = (tool || '').toLowerCase();
  const p = (platform || 'instagram').toLowerCase();
  const platformBoost = TOOL_BOOST[t]?.[p] || TOOL_BOOST[t]?.instagram || null;
  if (!platformBoost) return null;
  return {
    tool: t,
    platform: p,
    platformProfile: PLATFORM_PROFILES[p] || PLATFORM_PROFILES.instagram,
    ...platformBoost,
  };
};

// Devuelve texto compacto para inyectar en prompts LLM (system priming)
export const boostToPriming = (boost) => {
  if (!boost) return '';
  const lines = [];
  lines.push(`[BOOST · ${boost.tool} × ${boost.platform}]`);
  if (boost.platformProfile?.aiAlgoNotes) lines.push(`Algoritmo: ${boost.platformProfile.aiAlgoNotes}`);
  if (boost.platformProfile?.audienceMindset) lines.push(`Audiencia: ${boost.platformProfile.audienceMindset}`);
  if (boost.frameworks?.length) lines.push(`Frameworks aplicar: ${boost.frameworks.join(' · ')}`);
  if (boost.reasoningSteps?.length) lines.push(`Pasos razonamiento: ${boost.reasoningSteps.join(' → ')}`);
  if (boost.guardrails?.length) lines.push(`Guardrails: ${boost.guardrails.join(' · ')}`);
  if (boost.libs) lines.push(`Libs: ${JSON.stringify(boost.libs).slice(0, 400)}`);
  return lines.join('\n');
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleToolBoost = async (req, res, path, m) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };
  if (path === '/api/tool-boost' && m === 'GET') {
    try {
      const url = new URL(req.url, 'http://x');
      const tool = url.searchParams.get('tool');
      const platform = url.searchParams.get('platform') || 'instagram';
      if (tool) {
        const b = getToolBoost(tool, platform);
        if (!b) return json(404, { ok: false, error: 'not-found', message: `No hay boost para ${tool} × ${platform}` });
        return json(200, { ok: true, boost: b, priming: boostToPriming(b) });
      }
      // Lista todo
      return json(200, {
        ok: true,
        platforms: Object.keys(PLATFORM_PROFILES),
        tools: Object.keys(TOOL_BOOST),
        platformProfiles: PLATFORM_PROFILES,
        toolList: Object.fromEntries(Object.entries(TOOL_BOOST).map(([k, v]) => [k, Object.keys(v)])),
      });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }
  return false;
};
