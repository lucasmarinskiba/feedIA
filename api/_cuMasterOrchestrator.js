/**
 * CU Master Orchestrator — workflows multi-tool encadenados.
 *
 * Cada workflow = chain de recipes across IG/TT/Canva/CapCut/Ideogram/Freepik/
 * Kling/Runway/Pika/HeyGen/Veed/InVideo + analytics + publish.
 *
 * Workflows pre-armados que dominan TODAS las herramientas integradas para
 * impulsar marca personal/empresarial en IG/TT.
 */

import { CU_RECIPES } from './_cuRecipeLibrary.js';

export const MASTER_WORKFLOWS = {
  // ═══════ BRAND ESTABLISHMENT (semana 1) ═══════
  'brand-launch-week-1': {
    id: 'brand-launch-week-1',
    label: '🚀 Lanzar marca cero a presencia 7 días',
    estimatedDays: 7,
    estimatedTotalMin: 240,
    goal: 'Establecer marca + visual identity + 7 posts publicados + tribu inicial',
    chain: [
      { day: 1, tool: 'ideogram', recipe: 'ideogram-logo-design', why: 'logo único primero' },
      { day: 1, tool: 'canva', recipe: 'canva-apply-brand-kit', why: 'brand kit en Canva' },
      { day: 2, tool: 'ideogram', recipe: 'ideogram-typography-design', why: 'banner perfil + highlight covers' },
      { day: 2, tool: 'instagram', recipe: 'ig-publish-carousel', why: 'post #1 introducción marca (7 slides)' },
      { day: 3, tool: 'tiktok', recipe: 'tt-publish-video', why: 'reel #1 hook personal "quién soy + por qué"' },
      { day: 4, tool: 'canva', recipe: 'canva-edit-text-all-pages', why: 'carousel framework primer pilar' },
      { day: 4, tool: 'instagram', recipe: 'ig-publish-carousel', why: 'autoridad post' },
      { day: 5, tool: 'tiktok', recipe: 'tt-editor-text-overlay', why: 'reel storytelling personal historia' },
      { day: 5, tool: 'instagram', recipe: 'ig-publish-story-series', why: 'stories behind-the-scenes' },
      { day: 6, tool: 'instagram', recipe: 'ig-engage-feed', why: 'engagement nicho activo (algoritmo)' },
      { day: 6, tool: 'tiktok', recipe: 'tt-fyp-warming', why: 'TT algorithm warming' },
      { day: 7, tool: 'tiktok', recipe: 'tt-publish-video', why: 'reel #3 valor pilar 2' },
      { day: 7, tool: 'instagram', recipe: 'ig-publish-reel', why: 'cross-post adapted' },
    ],
    successMetrics: [
      '7 posts publicados',
      'logo + brand kit lockeado',
      'primeros 50-100 followers nuevos',
      'engagement ratio detectado',
    ],
  },

  // ═══════ VIRAL VIDEO PRODUCTION (1 día) ═══════
  'viral-video-1-day': {
    id: 'viral-video-1-day',
    label: '🎬 Video viral end-to-end en 1 día',
    estimatedDays: 1,
    estimatedTotalMin: 90,
    goal: 'Reel/TT video con hook ≥80 + production pro + publish + boost',
    chain: [
      { step: 1, tool: 'system', recipe: 'strategist-trend-detect', why: 'detectar trend nicho 24-72h' },
      { step: 2, tool: 'kling', recipe: 'kling-image-to-video', why: 'b-roll cinematic 5s' },
      { step: 3, tool: 'freepik', recipe: 'freepik-ai-image-gen', why: 'thumbnail hero shot' },
      { step: 4, tool: 'capcut', recipe: 'capcut-import-clip', why: 'setup proyecto' },
      { step: 5, tool: 'capcut', recipe: 'capcut-beat-sync', why: 'beat sync con sound trending' },
      { step: 6, tool: 'capcut', recipe: 'capcut-auto-captions', why: 'auto-captions estilo viral' },
      { step: 7, tool: 'capcut', recipe: 'capcut-add-b-roll', why: 'b-roll Kling insertado' },
      { step: 8, tool: 'capcut', recipe: 'capcut-color-grading', why: 'LUT teal-orange' },
      { step: 9, tool: 'capcut', recipe: 'capcut-export-1080', why: 'export 1080p sin watermark' },
      { step: 10, tool: 'tiktok', recipe: 'tt-publish-video', why: 'publish TT con trending sound' },
      { step: 11, tool: 'instagram', recipe: 'ig-publish-reel', why: 'cross-post IG Reel adapted' },
      { step: 12, tool: 'instagram', recipe: 'ig-engage-feed', why: 'warm comments first 30 min' },
    ],
    successMetrics: ['Viral score ≥80', 'Reach 5-50K en 24h', 'Engagement rate >6%', 'Cross-posted IG+TT'],
  },

  // ═══════ BATCH PRODUCTION (30 videos en 1 sesión) ═══════
  'batch-30-videos': {
    id: 'batch-30-videos',
    label: '📦 30 videos en 1 sesión filming + post-prod',
    estimatedDays: 4,
    estimatedTotalMin: 1440,
    goal: 'Contenido para 30 días con 1 sola sesión filming + post-prod ágil',
    chain: [
      { day: 1, tool: 'system', recipe: 'script-30-outline', why: '30 outlines en Notion (4hs)' },
      { day: 1, tool: 'system', recipe: 'shot-list-30', why: 'shot list director-level' },
      { day: 2, tool: 'physical', recipe: 'filming-day', why: 'filming 6-8hs todos 30 videos' },
      { day: 3, tool: 'capcut', recipe: 'capcut-import-clip', why: 'edit batch 1 (videos 1-10)' },
      { day: 3, tool: 'capcut', recipe: 'capcut-auto-captions', why: 'auto-captions batch' },
      { day: 3, tool: 'capcut', recipe: 'capcut-beat-sync', why: 'beat sync batch' },
      { day: 4, tool: 'capcut', recipe: 'capcut-color-grading', why: 'color grade consistente todos' },
      { day: 4, tool: 'capcut', recipe: 'capcut-export-1080', why: 'export 30 mp4' },
      { day: 4, tool: 'tiktok', recipe: 'tt-publish-schedule', why: 'schedule 1/día por 30 días' },
      { day: 4, tool: 'instagram', recipe: 'ig-publish-reel', why: 'cross-post a IG con offset 12hs' },
    ],
    successMetrics: ['30 videos listos', 'Schedule 30 días', 'Tiempo ahorrado 80% vs daily filming'],
  },

  // ═══════ AUTHORITY BUILD (carrusel value-bomb) ═══════
  'authority-carousel-value-bomb': {
    id: 'authority-carousel-value-bomb',
    label: '🧠 Carrusel "value bomb" autoridad nicho',
    estimatedDays: 1,
    estimatedTotalMin: 75,
    goal: 'Carrusel guardable 10 slides + 1K saves potential + autoridad establecida',
    chain: [
      { step: 1, tool: 'system', recipe: 'strategy-plan', why: 'plan estratégico topic + hooks' },
      {
        step: 2,
        tool: 'ideogram',
        recipe: 'ideogram-carousel-series',
        why: '10 slides consistentes typography brutal',
      },
      { step: 3, tool: 'canva', recipe: 'canva-apply-brand-kit', why: 'aplicar brand kit slides' },
      { step: 4, tool: 'canva', recipe: 'canva-edit-text-all-pages', why: 'editar text final por slide' },
      { step: 5, tool: 'canva', recipe: 'canva-export-png-batch', why: 'export 10 PNGs' },
      { step: 6, tool: 'instagram', recipe: 'ig-publish-carousel', why: 'publish 10-slide carousel' },
      { step: 7, tool: 'tiktok', recipe: 'tt-publish-photo-mode', why: 'cross-post photo mode TT' },
      { step: 8, tool: 'instagram', recipe: 'ig-stories-watch', why: 'engage nicho ig stories' },
    ],
    successMetrics: ['10-slide carousel publicado', 'Saves rate ≥6%', 'Share rate ≥3%', '+50-200 followers nicho-fit'],
  },

  // ═══════ COMMUNITY MANAGEMENT (semana) ═══════
  'community-week-management': {
    id: 'community-week-management',
    label: '💬 Community management semanal pro',
    estimatedDays: 7,
    estimatedTotalMin: 420,
    goal: 'Responder 100% comments + DMs + activate lurkers + nurture super-fans',
    chain: [
      { day: 'daily', tool: 'instagram', recipe: 'ig-engage-feed', why: 'engagement diario' },
      { day: 'daily', tool: 'instagram', recipe: 'ig-dm-respond-leads', why: 'DM leads <1h response' },
      { day: 'daily', tool: 'tiktok', recipe: 'tt-comments-respond', why: 'comments TT response' },
      { day: 'daily', tool: 'tiktok', recipe: 'tt-fyp-warming', why: 'TT algorithm warming' },
      { day: 'wednesday', tool: 'instagram', recipe: 'ig-publish-story-series', why: 'stories semanal Q&A' },
      { day: 'friday', tool: 'instagram', recipe: 'ig-dm-respond-leads', why: 'super-fan DM personal' },
      { day: 'saturday', tool: 'tiktok', recipe: 'tt-go-live', why: 'live engagement deep' },
    ],
    successMetrics: [
      '100% comments respondidos <60min',
      'DMs <2hs response',
      'Super-fan group identificado',
      'Tribu activa',
    ],
  },

  // ═══════ RESEARCH + TRENDS (research deep) ═══════
  'research-trends-deep': {
    id: 'research-trends-deep',
    label: '🔍 Research trends + competencia profundo',
    estimatedDays: 1,
    estimatedTotalMin: 90,
    goal: 'Mapa completo: trends 24-72h + top 10 competidores + 30 ángulos ideas',
    chain: [
      { step: 1, tool: 'tiktok', recipe: 'tt-creative-center-trends', why: 'TT Creative Center trends export' },
      { step: 2, tool: 'tiktok', recipe: 'tt-trending-sound-research', why: 'sonidos 24-72h vida' },
      { step: 3, tool: 'instagram', recipe: 'ig-engage-feed', why: 'scroll explore IG nicho' },
      { step: 4, tool: 'system', recipe: 'competitor-swipe-file', why: 'swipe file competidores top' },
      { step: 5, tool: 'system', recipe: 'viral-ideas-generator', why: '30 ángulos basados research' },
      { step: 6, tool: 'system', recipe: 'newsjack-monitor', why: 'newsjack opportunities <48h' },
    ],
    successMetrics: [
      '10 sounds trending capturados',
      '10 competidores swiped',
      '30 ángulos ideas',
      '3-5 newsjack opportunities',
    ],
  },

  // ═══════ MONETIZATION FUNNEL ═══════
  'monetization-funnel-setup': {
    id: 'monetization-funnel-setup',
    label: '💰 Setup funnel monetización (lead→cliente)',
    estimatedDays: 2,
    estimatedTotalMin: 240,
    goal: 'Setup completo: lead magnet → DM funnel → conversion',
    chain: [
      { step: 1, tool: 'canva', recipe: 'canva-export-png-batch', why: 'lead magnet PDF cover' },
      { step: 2, tool: 'instagram', recipe: 'ig-publish-carousel', why: 'carrusel ofrece lead magnet' },
      { step: 3, tool: 'instagram', recipe: 'ig-dm-respond-leads', why: 'DM template para "INFO" trigger' },
      { step: 4, tool: 'system', recipe: 'manychat-setup', why: 'ManyChat lead qualifier' },
      { step: 5, tool: 'tiktok', recipe: 'tt-shop-product-link', why: 'TikTok Shop link si applicable' },
      { step: 6, tool: 'instagram', recipe: 'ig-publish-reel', why: 'reel con CTA "comentá X"' },
      { step: 7, tool: 'tiktok', recipe: 'tt-publish-video', why: 'TT versión con CTA' },
    ],
    successMetrics: [
      'Lead magnet en bio',
      'ManyChat flow activo',
      '10+ leads qualified primera semana',
      'Conversion rate measurable',
    ],
  },

  // ═══════ AI AVATAR + VOICE CLONE (Premium) ═══════
  'ai-avatar-voice-clone-pipeline': {
    id: 'ai-avatar-voice-clone-pipeline',
    label: '🤖 Pipeline avatar IA + voice clone',
    estimatedDays: 1,
    estimatedTotalMin: 60,
    goal: 'Avatar talking head IA pesando 10 videos sin filming',
    chain: [
      { step: 1, tool: 'heygen', recipe: 'heygen-avatar-talking', why: '10 scripts → 10 videos avatar' },
      { step: 2, tool: 'kling', recipe: 'kling-lip-sync', why: 'lip-sync alternative o boost' },
      { step: 3, tool: 'capcut', recipe: 'capcut-auto-captions', why: 'captions overlay' },
      { step: 4, tool: 'capcut', recipe: 'capcut-export-1080', why: 'export 10 videos' },
      { step: 5, tool: 'tiktok', recipe: 'tt-publish-schedule', why: 'schedule TT' },
      { step: 6, tool: 'instagram', recipe: 'ig-publish-reel', why: 'cross-post IG' },
    ],
    successMetrics: ['10 videos generados sin filming', 'Quality avatar believable', 'Schedule 10 días'],
  },

  // ═══════ CINEMATIC AI VIDEO ═══════
  'cinematic-ai-video': {
    id: 'cinematic-ai-video',
    label: '🎥 Video cinematic 100% IA (sin cámara)',
    estimatedDays: 1,
    estimatedTotalMin: 90,
    goal: 'Reel cinematic 100% IA generado + viral potential',
    chain: [
      { step: 1, tool: 'ideogram', recipe: 'ideogram-typography-design', why: 'hero text shot' },
      { step: 2, tool: 'freepik', recipe: 'freepik-ai-image-gen', why: '5 imágenes cinematic source' },
      { step: 3, tool: 'kling', recipe: 'kling-image-to-video', why: 'animate cada imagen 5s' },
      { step: 4, tool: 'luma', recipe: 'luma-dream-machine', why: 'b-roll cinematic 9s extra' },
      { step: 5, tool: 'capcut', recipe: 'capcut-import-clip', why: 'setup proyecto' },
      { step: 6, tool: 'capcut', recipe: 'capcut-beat-sync', why: 'beat sync sound trending' },
      { step: 7, tool: 'capcut', recipe: 'capcut-color-grading', why: 'unified color teal-orange' },
      { step: 8, tool: 'capcut', recipe: 'capcut-export-1080', why: 'export final' },
      { step: 9, tool: 'tiktok', recipe: 'tt-publish-video', why: 'publish TT' },
      { step: 10, tool: 'instagram', recipe: 'ig-publish-reel', why: 'cross-post IG' },
    ],
    successMetrics: ['Reel cinematic publicado', 'Cero filming required', 'Production-quality consistente'],
  },

  // ═══════ BRAND IDENTITY FULL ═══════
  'full-brand-identity-setup': {
    id: 'full-brand-identity-setup',
    label: '🎨 Setup brand identity completo desde cero',
    estimatedDays: 3,
    estimatedTotalMin: 360,
    goal: 'Brand kit + logo + paleta + fonts + voice + templates + applied across IG/TT',
    chain: [
      { day: 1, tool: 'system', recipe: 'brand-identity-generator', why: 'brief → identity completo' },
      { day: 1, tool: 'ideogram', recipe: 'ideogram-logo-design', why: 'logo final' },
      { day: 1, tool: 'freepik', recipe: 'freepik-icon-pack', why: '10 iconos consistentes' },
      { day: 2, tool: 'canva', recipe: 'canva-apply-brand-kit', why: 'Canva brand kit setup' },
      { day: 2, tool: 'canva', recipe: 'canva-open-template', why: '5 templates: carousel/reel/story/photo/cover' },
      { day: 3, tool: 'instagram', recipe: 'ig-publish-carousel', why: 'lanzamiento brand reveal' },
      { day: 3, tool: 'tiktok', recipe: 'tt-publish-video', why: 'video story brand journey' },
    ],
    successMetrics: [
      'Brand identity completa',
      'Canva brand kit applied',
      '5 templates listos',
      'Brand reveal publicado',
    ],
  },
};

export const listMasterWorkflows = ({ planId = 'free' }) => {
  return Object.values(MASTER_WORKFLOWS).map((w) => ({
    id: w.id,
    label: w.label,
    goal: w.goal,
    estimatedDays: w.estimatedDays,
    estimatedTotalMin: w.estimatedTotalMin,
    stepsCount: w.chain.length,
    toolsUsed: [...new Set(w.chain.map((s) => s.tool))],
    successMetrics: w.successMetrics,
  }));
};

export const getMasterWorkflow = (id) => MASTER_WORKFLOWS[id] || null;

export const handleMasterOrchestrator = async (req, res, path, m) => {
  const json = (code, b) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(b));
  };
  const url = new URL(req.url || '/', 'http://x');

  if (path === '/api/cu/workflows' && m === 'GET') {
    const planId = url.searchParams.get('planId') || 'free';
    json(200, { workflows: listMasterWorkflows({ planId }), totalAvailable: Object.keys(MASTER_WORKFLOWS).length });
    return true;
  }
  if (path && path.startsWith('/api/cu/workflows/') && m === 'GET') {
    const id = path.split('/').pop();
    const w = getMasterWorkflow(id);
    if (!w) return (json(404, { error: 'workflow not found' }), true);
    json(200, w);
    return true;
  }
  return false;
};
