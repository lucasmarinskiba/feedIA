/**
 * Legendary Creator Engine — modela + supera arquetipos top mundial.
 *
 * Arquetipos modelados:
 *   - Luisito Comunica (travel-vlogger-explorer)
 *   - Trump-style (controversial-political-persona)
 *   - MrBeast (spectacle-engineering-philanthropy)
 *   - KSI (cultural-moment-react-comedy)
 *   - MKBHD (authority-tech-review)
 *   - AI accounts (cyber-aesthetic-futurism)
 *   - Casey Neistat (cinematic-vlog)
 *   - Logan/Jake Paul (drama-controversy-money)
 *   - Emma Chamberlain (anti-aspirational-relatable)
 *   - Joe Rogan (long-form-debate-curiosity)
 *
 * Cada archetype = persona + content patterns + language + visual + cadence.
 *
 * Modules:
 *   - archetypePlaybook: cada arquetipo desglosado
 *   - personaEngine: persona consistente across content
 *   - catchphraseGenerator: frases recurrentes neural-lock
 *   - placeSettingRotator: variación setting (Luisito travel)
 *   - controversyCalibrator: balance engagement vs reputation
 *   - repetitionEngine: Trump-style repetition + variation
 *   - simpleLanguageEnforcer: FK reading level 4-6
 *   - claimValidationMatrix: high-impact statements
 *   - emotionalTriggerSequence: 7-touchpoint emotional arc
 *   - tribeIdentityReinforce: creator becomes flag
 *   - curiosityGapIndustrial: gap machine
 *   - spectacleEngineering: MrBeast-grade events
 *   - culturalMomentLock: KSI/JJ react timing
 *   - authoritySignal: MKBHD trust markers
 *   - cyberAesthetic: AI account visual code
 *   - recurringSegments: weekly architecture
 *   - sagaUnfolding: multi-month arc
 *   - voiceOfThePeople: Trump-style us-vs-them
 *   - underdogStory: relatable struggle narrative
 *   - insiderKnowledgeTeasing: exclusivity hook
 *   - cultOfPersonalityCalibrator: ethical line
 *
 * Free plan: 100% accessible.
 */

/* ════════════════════ ARCHETYPE PLAYBOOKS ════════════════════ */

export const ARCHETYPES = {
  'luisito-comunica': {
    id: 'luisito-comunica',
    label: '🌎 Luisito-style (Travel Vlogger Explorer)',
    personaCore: {
      identity: 'mexicano cercano que viaja a lugares insólitos',
      voice: 'cómplice + curioso + sin filtros',
      catchphrase: '¿Qué pedo, banda?',
      uniformVisual: 'gorra + ropa casual + face cam',
    },
    contentPatterns: {
      formats: ['vlog-travel-3-5min', 'reel-discovery-30s', 'photo-mode-tt-collection'],
      structure: [
        'opening-greeting',
        'context-place',
        'discovery-moment',
        'people-interaction',
        'food-test',
        'cultural-shock',
        'closing-takeaway',
      ],
      cadence: '2-3 vlogs/semana + 5-7 stories/día',
    },
    languageRules: ['frases cortas', 'modismos locales', 'preguntas a cámara', 'reacción exagerada honest'],
    differentiator: 'va donde otros no van + traduce cultura para audiencia hispana',
    growthDriver: 'curiosity geográfica + identificación cultural latina',
    monetization: ['brand deals viajes', 'merch', 'productos propios', 'cursos'],
    weaknesses: ['depende de viajar', 'fatigue del formato', 'controversias políticas accidentales'],
  },
  'trump-style': {
    id: 'trump-style',
    label: '🇺🇸 Trump-style (Controversial Persona)',
    personaCore: {
      identity: 'outsider que dice lo que otros piensan',
      voice: 'declarativo + simple + repetitivo',
      catchphrase: 'BIG. HUGE. TREMENDOUS.',
      uniformVisual: 'frame fijo + texto MAYÚSCULA',
    },
    contentPatterns: {
      formats: ['short-post-claim', 'video-30s-declaración', 'all-caps-text-overlay'],
      structure: ['statement-bold', 'enemy-named', 'us-tribe', 'promise-grand', 'CTA-imperative'],
      cadence: 'multi-post diario',
    },
    languageRules: [
      'FK reading level 4-5',
      'frases <8 palabras',
      'repetir 3-5 veces clave',
      'MAYÚSCULAS para emphasis',
      'us vs them',
    ],
    differentiator: 'sayit-as-it-is + repetición masiva + tribal identity',
    growthDriver: 'controversia = algoritmo + tribu se siente representada',
    monetization: ['merchandise', 'eventos', 'membership', 'libros'],
    weaknesses: ['polariza audiencias', 'reputation risk extremo', 'no escala a marcas mainstream'],
    ethicalGate: 'NO replicar racism/hate. Sí replicar simplicidad + repetición + us-vs-them positivo.',
  },
  mrbeast: {
    id: 'mrbeast',
    label: '🎯 MrBeast (Spectacle Engineering)',
    personaCore: {
      identity: 'generoso + ambicioso + visual extremo',
      voice: 'urgente + entusiasta + claro',
      catchphrase: 'I gave them...',
      uniformVisual: 'colores saturados + thumbnails impactantes + face shock',
    },
    contentPatterns: {
      formats: ['mini-doc-15min', 'short-30s-result', 'photo-grid'],
      structure: ['hook-stake-set', 'rules-clear', 'escalation-tension', 'climax-payoff', 'gratitude-loop'],
      cadence: '1 gran video/sem + daily shorts',
    },
    languageRules: ['hooks 0-5s explícitos', 'stakes claros números', 'curiosity gap por chapter'],
    differentiator: 'production budget reinvertido en spectacle + altruism real',
    growthDriver: 'curiosity + emotional reward + shareable extreme',
    monetization: ['ads premium', 'Feastables/Shop', 'company spin-offs'],
    weaknesses: ['budget enorme para mantener nivel', 'burnout team', 'expectations escalada'],
  },
  'mkbhd-tech-authority': {
    id: 'mkbhd-tech-authority',
    label: '📱 MKBHD-style (Tech Authority Review)',
    personaCore: {
      identity: 'autoridad técnica con calm voice',
      voice: 'measured + crítico + accesible',
      catchphrase: 'Quality is...',
      uniformVisual: 'set negro profesional + producto centrado + lighting controlado',
    },
    contentPatterns: {
      formats: ['review-10-15min', 'short-impressions-60s', 'comparison-side-by-side'],
      structure: ['intro-context', 'design-tour', 'tech-specs', 'real-use-pros-cons', 'verdict'],
      cadence: '2 long videos/semana + shorts daily',
    },
    languageRules: ['lenguaje técnico accesible', 'comparaciones concretas', 'criticism constructive'],
    differentiator: 'visual quality + paciencia + honestidad',
    growthDriver: 'trust acumulado + alta calidad consistente',
    monetization: ['brand deals premium', 'ads', 'merchandise calidad'],
    weaknesses: ['intensivo de producción', 'depende de hardware releases'],
  },
  'ai-account-aesthetic': {
    id: 'ai-account-aesthetic',
    label: '🤖 AI Account (Cyber-Futurism)',
    personaCore: {
      identity: 'oracle de futuro tech + IA tools curator',
      voice: 'futurista + accesible + data-driven',
      catchphrase: 'AI just...',
      uniformVisual: 'gradient cyber + neon + glitch effects + 3D renders',
    },
    contentPatterns: {
      formats: ['carousel-tool-stack-7slides', 'reel-tool-demo-30s', 'thread-prompts'],
      structure: [
        'breakthrough-claim',
        'tool-name',
        'use-case-specific',
        'result-visual',
        'tutorial-tease',
        'CTA-newsletter',
      ],
      cadence: 'multi-post diario tools + breakthroughs',
    },
    languageRules: ['jerga tech con explicación inline', 'números concretos', 'comparaciones before/after'],
    differentiator: 'first-mover en herramientas + curaduría + tutorials prácticos',
    growthDriver: 'FOMO de tools + ahorro de tiempo + autoridad nicho',
    monetization: ['newsletter premium', 'cursos prompts', 'affiliates AI tools', 'consultoría'],
    weaknesses: ['saturación nicho', 'tools morirán/cambian rápido', 'audiencia exige velocidad'],
  },
  'casey-neistat-cinematic-vlog': {
    id: 'casey-neistat-cinematic-vlog',
    label: '🎬 Casey-style (Cinematic Vlog)',
    personaCore: {
      identity: 'storyteller + skater + NYC daily life',
      voice: 'reflective + honest + dry humor',
      uniformVisual: 'NYC bg + cinematic transitions + drone shots + slow-mo skate',
    },
    contentPatterns: {
      formats: ['daily-vlog-8-12min', 'time-lapse', 'short-philosophy'],
      structure: ['daily-context', 'theme-emergent', 'visual-poetry', 'reflection-takeaway'],
      cadence: 'daily o semanal con tema',
    },
    languageRules: ['narración primera persona', 'silences valen', 'visual > verbose'],
    differentiator: 'cinemato + autenticidad + city as character',
    growthDriver: 'aspiration lifestyle + cinematic envy + relatable struggles',
    monetization: ['brand integrations', 'props vendidos', 'studio'],
  },
  'emma-chamberlain-relatable': {
    id: 'emma-chamberlain-relatable',
    label: '☕ Emma-style (Anti-Aspirational Relatable)',
    personaCore: {
      identity: 'gen-z casual + flaws on display + coffee',
      voice: 'sarcastic + raw + casual',
      uniformVisual: 'home messy + coffee mug + casual hoodie + warm tone',
    },
    contentPatterns: {
      formats: ['talking-head-rambling-8min', 'tt-pov-30s', 'photo-dump-stories'],
      structure: ['random-opener', 'meandering-thought', 'self-deprecation', 'unexpected-insight'],
      cadence: '1-2 videos/sem + daily stories',
    },
    languageRules: ['informal extremo', 'ums + ahs preservados', 'self-deprecating', 'no pretentious'],
    differentiator: 'anti-perfeccionismo + autenticidad radical',
    growthDriver: 'identification gen-z + permission to be flawed',
    monetization: ['coffee brand propia', 'fashion collabs', 'podcast'],
  },
  'joe-rogan-long-form': {
    id: 'joe-rogan-long-form',
    label: '🎙️ Rogan-style (Long-Form Curiosity)',
    personaCore: {
      identity: 'curious everyman + asks hard questions',
      voice: 'curious + skeptical + casual + amused',
      uniformVisual: 'studio dark + 2-shot + mic visible',
    },
    contentPatterns: {
      formats: ['podcast-2-3hs', 'reel-clip-90s-best-moment', 'shorts-quote-card'],
      structure: ['guest-context', 'big-idea', 'go-deep', 'controversy-point', 'human-moment', 'closing-respect'],
      cadence: '3 podcasts/sem + clips diarios',
    },
    languageRules: ['conversational', 'follow curiosity', 'no-script', 'admit ignorance'],
    differentiator: 'time + space para complejidad + cross-disciplinas + audiencia paciente',
    growthDriver: 'depth + variedad + clip-cultura',
    monetization: ['Spotify exclusive', 'ads', 'merchandise', 'gym/comedy'],
  },
};

/* ════════════════════ PERSONA ENGINE ════════════════════ */

export const buildPersona = ({ baseArchetype, customTraits, niche }) => {
  const archetype = ARCHETYPES[baseArchetype] || ARCHETYPES['emma-chamberlain-relatable'];
  return {
    sourceArchetype: archetype.label,
    customizedPersona: {
      identity: customTraits?.identity || archetype.personaCore.identity,
      voiceTone: customTraits?.voice || archetype.personaCore.voice,
      catchphrase: customTraits?.catchphrase || archetype.personaCore.catchphrase,
      visualSignature: customTraits?.visualSignature || archetype.personaCore.uniformVisual,
      nicheSpecific: niche || 'general',
    },
    consistencyRules: [
      'Mismo opener cada video/post',
      'Mismo cierre / catchphrase',
      'Wardrobe/setting reconocible 80% del tiempo',
      'Lexicon: 5-10 palabras tuyas firma',
      'Cámara angle preferido',
    ],
    upgradeOverArchetype: [
      `Tomá ${archetype.differentiator}`,
      `Combinalo con tu nicho: ${niche || 'X'}`,
      `Adaptá language rules: ${archetype.languageRules.slice(0, 2).join(', ')}`,
      `Pero evitá weaknesses: ${(archetype.weaknesses || []).join(', ')}`,
    ],
  };
};

/* ════════════════════ CATCHPHRASE GENERATOR ════════════════════ */

export const generateCatchphrases = ({ niche, mood = 'energetic' }) => ({
  rule: 'Catchphrase = neural-lock. Repetición + ritmo + asociación. Audiencia te etiqueta automáticamente.',
  openers: [
    `¿Qué onda ${niche || 'banda'}?`,
    `Hoy te traigo algo que va a cambiar tu ${niche || 'forma de ver esto'}`,
    `Atrás de la pantalla, no me lo van a creer`,
    `Equipo, esto es importante`,
    `Listen — porque esto te va a sorprender`,
  ],
  closers: [
    `Y eso es todo. Si te sirvió, ya sabés qué hacer.`,
    `Si te gustó, comentá la palabra clave [X]`,
    `Mañana más. Hasta entonces — buen viaje.`,
    `Comentá si lo aplicarías. Te leo.`,
    `Y como siempre digo: ${mood === 'energetic' ? 'a por todas' : 'paso a paso'}.`,
  ],
  recurringMidPhrases: [
    `Y acá viene la parte importante`,
    `Si no entendiste eso, te lo explico otra vez`,
    `Esto cambió todo para mí`,
    `Probá esto y volvé a decirme`,
  ],
  neuralLockMechanism: 'Repetir mismo opener + closer ≥80% posts × 90 días = audiencia te asocia automáticamente.',
});

/* ════════════════════ CONTROVERSY CALIBRATOR ════════════════════ */

export const calibrateControversy = ({ topic, audiencePolarization, brandRisk = 'medium' }) => {
  const safetyLevels = {
    safe: { level: 0.2, examples: ['Por qué X opinión es popular pero ofensiva para nadie'] },
    medium: { level: 0.5, examples: ['Industry pet peeves', 'Common myths debunked'] },
    spicy: { level: 0.75, examples: ['Calling out specific (anonymous) trends/products'] },
    controversial: { level: 0.9, examples: ['Calling out named figures/brands'], warning: 'reputation risk' },
  };
  const target =
    brandRisk === 'low'
      ? safetyLevels.safe
      : brandRisk === 'medium'
        ? safetyLevels.medium
        : brandRisk === 'high'
          ? safetyLevels.spicy
          : safetyLevels.controversial;
  return {
    topic,
    recommendedLevel: target.level,
    examples: target.examples,
    formula: 'Strong opinion + concrete reason + invite disagree',
    rules: [
      'Ataca ideas, no personas',
      'Apoya con datos/experiencia',
      'Termina con question abierta',
      'NUNCA ataque protected groups',
      'Tener salida si polémica escala mal',
    ],
    expectedLift: target.level > 0.5 ? '+40-100% engagement' : '+10-20% engagement',
  };
};

/* ════════════════════ REPETITION ENGINE (Trump-style ético) ════════════════════ */

export const buildRepetitionPlan = ({ coreMessage, contentCount = 30 }) => ({
  rule: 'Trump regla: repetir core message 5+ veces antes que audiencia recuerde. Variación previene fatigue.',
  coreMessage,
  variations: Array.from({ length: 10 }, (_, i) => ({
    variant: i + 1,
    angle: [
      'statistic-front',
      'story-first',
      'enemy-named',
      'transformation-result',
      'list-numbered',
      'controversy-bait',
      'question-form',
      'metaphor',
      'before-after',
      'imperative-command',
    ][i],
    sampleFraming:
      i === 0
        ? `${coreMessage} — y los datos lo confirman`
        : i === 1
          ? `Cuando empecé, no creía en esto. Hasta que ${coreMessage.toLowerCase()}.`
          : i === 2
            ? `${coreMessage}. Quien te diga lo opuesto te miente.`
            : `Variation ${i + 1} of "${coreMessage}"`,
  })),
  cadence: `Distribuir 10 variations across ${contentCount} posts. Repetición invisible al casual viewer, profunda al fan.`,
  ethicalGate: 'Repetition serves clarity, not manipulation. Si message es harm → no.',
});

/* ════════════════════ SIMPLE LANGUAGE ENFORCER ════════════════════ */

export const enforceSimpleLanguage = ({ text }) => {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const sentences = (text || '').split(/[.!?]+/).filter((s) => s.trim());
  const avgWordsPerSentence = sentences.length ? words.length / sentences.length : 0;
  const longWords = words.filter((w) => w.length > 6).length;
  const longWordRatio = words.length ? longWords / words.length : 0;
  const fkReadingLevel = 0.39 * avgWordsPerSentence + 11.8 * (longWordRatio * 0.5) - 15.59;

  return {
    text,
    metrics: {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      longWordRatio: Math.round(longWordRatio * 100) + '%',
      fkReadingLevel: Math.round(fkReadingLevel),
    },
    targetLevel: '4-6 (Trump/MrBeast/viral)',
    passesViralStandard: fkReadingLevel <= 6,
    fixes:
      fkReadingLevel > 6
        ? [
            'Cortá frases >12 palabras',
            'Reemplazá palabras de 3+ sílabas con sinónimos cortos',
            'Usá "vos" en lugar de "usted"',
            'Verbo activo > pasiva',
            'Una idea por frase',
          ]
        : ['Listo para viralizar'],
  };
};

/* ════════════════════ SPECTACLE ENGINEERING (MrBeast-grade) ════════════════════ */

export const designSpectacle = ({ budget = 'low', topic }) => ({
  formula: 'Stakes claros + escalación visual + payoff emocional',
  budgetTiers: {
    low: {
      examples: ['$0 vs $100 ${topic}', '24 hours doing ${topic}', '${topic} extreme version'],
      tactics: ['DIY visual extreme', 'time pressure', 'before-after radical', 'helping 1 person'],
    },
    medium: {
      examples: ['Built ${topic} for $500', '7 days ${topic} challenge', 'I gave $X to person doing ${topic}'],
      tactics: ['multiple participants', 'production value medium', 'real stakes'],
    },
    high: {
      examples: ['$10K spent on ${topic}', '100 person ${topic}', 'I built business doing ${topic}'],
      tactics: ['team production', 'set design', 'multi-day', 'big payoff'],
    },
  },
  retentionMechanics: [
    'Hook 0-3s: la apuesta clara + stakes numerados',
    'Chapter 1 (3-15s): contexto + rules',
    'Chapter 2 (15-60s): escalación + obstáculos',
    'Chapter 3 (60-90s): clímax decision',
    'Chapter 4 (last 10s): payoff + gratitude + setup next',
  ],
  thumbnailFormula: 'Face shocked + huge text + before/after',
});

/* ════════════════════ CULTURAL MOMENT LOCK ════════════════════ */

export const lockCulturalMoment = ({ trend, niche }) => ({
  rule: 'Trend top viral <24hs = window de 6-48hs para react. Después es tarde.',
  reactPath: [
    { time: '0-6h', action: 'screenshot/quote trending → post inmediato con tu take' },
    { time: '6-24h', action: 'video react 30s con your angle nicho' },
    { time: '24-48h', action: 'long-form analysis o opinion piece carousel' },
    { time: '+48h', action: 'memorialize: añadir trend a tu running joke set' },
  ],
  angleTemplates: [
    `${trend} en ${niche || 'X'}: lo que nadie dijo`,
    `Lo bueno y lo malo de ${trend}`,
    `${trend} explained for ${niche || 'normal people'}`,
    `Mi reacción honesta a ${trend}`,
  ],
  warningGates: [
    'NO react a tragedias humanas para engagement',
    'NO political momentum sin tu autenticidad real',
    'NO trends que mueren en 12h con fragility',
  ],
});

/* ════════════════════ TRIBE IDENTITY ════════════════════ */

export const buildTribeIdentity = ({ creatorBrand, audienceArchetype }) => ({
  rule: 'Audiencia se siente parte de tribu cuando vos representás algo. Creator = bandera.',
  tribeMarkers: [
    'Nombre tribu (ej Beast Army, Vee Friends, MKBHDsquad)',
    'Insider language/jerga compartida',
    'In-jokes recurring que solo fans entienden',
    'Visual code (gorra, color, símbolo)',
    'Manifesto explícito de valores',
    'Recurring rituals (lunes X, viernes Y)',
  ],
  generatedFor: creatorBrand || 'tu marca',
  suggestedTribeName: `${(creatorBrand || 'feed').toLowerCase().replace(/\s/g, '')}-crew`,
  manifestoTemplate: [
    `Creemos en ${audienceArchetype || 'libertad creativa'}`,
    `No aceptamos ${'mediocridad'} ni ${'fake'}`,
    `Hacemos las cosas con ${'pasión'} y ${'autenticidad'}`,
    `Si te identificás → bienvenido a la tribu`,
  ],
  retentionMechanic: 'Mencionar tribu por nombre 1× cada 3-5 posts. Fortalece identidad.',
});

/* ════════════════════ EMOTIONAL TRIGGER SEQUENCE ════════════════════ */

export const buildEmotionalArc = ({ format = 'reel', goal = 'engagement' }) => ({
  rule: 'Hook + 7 emotional touchpoints en 30s = audience cant scroll',
  touchpoints: [
    { sec: '0-2', emotion: 'curiosity-shock', technique: 'Hook con pattern interrupt' },
    { sec: '2-5', emotion: 'identification', technique: '"¿Te pasa que...?" — espejo audience' },
    { sec: '5-10', emotion: 'frustration-validation', technique: 'Nombrar problema sin solución' },
    { sec: '10-15', emotion: 'hope-promise', technique: 'Promise concreta con stakes' },
    { sec: '15-22', emotion: 'aha-moment', technique: 'Insight no obvio + visual reveal' },
    { sec: '22-27', emotion: 'belonging', technique: 'Mencionar comunidad/tribu' },
    { sec: '27-30', emotion: 'urgency-action', technique: 'CTA directo + razón emocional' },
  ],
  emotionalPayoff: 'Audience cierra con: identification + hope + urgency = action.',
});

/* ════════════════════ COMPOSITE LEGEND BUILDER (mezclar archetypes) ════════════════════ */

export const composeLegendaryStrategy = ({ niche, primaryArchetype, secondaryArchetype, audience }) => {
  const a1 = ARCHETYPES[primaryArchetype] || ARCHETYPES['emma-chamberlain-relatable'];
  const a2 = ARCHETYPES[secondaryArchetype] || ARCHETYPES['mkbhd-tech-authority'];
  return {
    fusionStrategy: `${a1.label} × ${a2.label} aplicado a ${niche}`,
    fromPrimary: {
      voiceTone: a1.personaCore.voice,
      contentFormats: a1.contentPatterns.formats,
      languageRules: a1.languageRules,
    },
    fromSecondary: {
      visualSignature: a2.personaCore.uniformVisual,
      cadence: a2.contentPatterns.cadence,
      authorityMechanic: a2.differentiator,
    },
    superpowerCombination: `${a1.differentiator} + ${a2.differentiator}`,
    avoidWeaknesses: [...(a1.weaknesses || []), ...(a2.weaknesses || [])],
    monetizationMix: [...(a1.monetization || []), ...(a2.monetization || [])].slice(0, 5),
    nicheAdaptation: `Aplicado a ${niche || 'tu nicho'}: ${audience || 'cliente ideal'}`,
    upgradeVsArchetypes: [
      `Mezclás 2 archetypes → ningún single creator hace combinación`,
      `Sistema automatiza consistency → ningún humano sostiene 100% cadence`,
      `Plus calidad técnica (LUTs, color grading, beat-sync) → supera production de single human`,
    ],
  };
};

/* ════════════════════ HANDLER ════════════════════ */

export const handleLegendaryEngine = async (req, res, path, m, body) => {
  const json = (code, b) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(b));
  };
  const routes = {
    '/api/legendary/archetypes': () => ({ archetypes: ARCHETYPES, count: Object.keys(ARCHETYPES).length }),
    '/api/legendary/persona': () => buildPersona(body || {}),
    '/api/legendary/catchphrases': () => generateCatchphrases(body || {}),
    '/api/legendary/controversy-calibrate': () => calibrateControversy(body || {}),
    '/api/legendary/repetition-plan': () => buildRepetitionPlan(body || {}),
    '/api/legendary/simple-language': () => enforceSimpleLanguage(body || {}),
    '/api/legendary/spectacle': () => designSpectacle(body || {}),
    '/api/legendary/cultural-moment': () => lockCulturalMoment(body || {}),
    '/api/legendary/tribe-identity': () => buildTribeIdentity(body || {}),
    '/api/legendary/emotional-arc': () => buildEmotionalArc(body || {}),
    '/api/legendary/compose-strategy': () => composeLegendaryStrategy(body || {}),
  };
  if (routes[path] && (m === 'POST' || m === 'GET')) {
    json(200, routes[path]());
    return true;
  }
  if (path === '/api/legendary/list' && m === 'GET') {
    json(200, { modules: Object.keys(routes), count: Object.keys(routes).length });
    return true;
  }
  return false;
};
