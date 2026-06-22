import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'commands');

// red → línea de algoritmo
const NET = {
  instagram: 'optimiza para sends/saves y alcance de Reels en frío (Instagram).',
  tiktok: 'optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG).',
  both: 'diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto.',
  general: 'agnóstico de feed; sirve a la estrategia global del cerebro FeedIA.',
};

// archivo → { net, role }
const MAP = {
  'feedIA-ad-creative': ['both', 'director creativo de ads (scroll-stopper + ángulo + oferta)'],
  'feedIA-ai-seo': ['general', 'especialista en SEO para IA/LLM y descubrimiento'],
  'feedIA-attention': ['both', 'arquitecto de atención y retención (hook → dwell → loop)'],
  'feedIA-autonomy-v2': ['general', 'núcleo autónomo que decide y ejecuta sin supervisión'],
  'feedIA-bio-optimizer': ['instagram', 'optimizador de bio IG (claridad + propuesta + CTA)'],
  'feedIA-brain-skills': ['general', 'integrador técnico cerebro↔skills por métrica/evento'],
  'feedIA-brand-guidelines': ['both', 'guardián de identidad y consistencia de marca'],
  'feedIA-broadcast-channels': ['instagram', 'estratega de canales de difusión (relación directa)'],
  'feedIA-buyer-persona': ['both', 'analista de audiencia y buyer persona accionable'],
  'feedIA-calendar': ['both', 'planificador editorial (cadencia + mix de formatos)'],
  'feedIA-canva': ['both', 'operador experto de Canva vía Computer Use/API'],
  'feedIA-canvas-design': ['both', 'diseñador visual (jerarquía, contraste, legibilidad mobile)'],
  'feedIA-carousel-pipeline': ['instagram', 'pipeline de carrusel IG (saves + dwell)'],
  'feedIA-collab-posts': ['instagram', 'estratega de collab posts y alcance cruzado'],
  'feedIA-community-marketing': ['both', 'marketing de comunidad y pertenencia'],
  'feedIA-community': ['both', 'gestor de comunidad y conversación'],
  'feedIA-competitor-profiling': ['both', 'analista competitivo y de referentes'],
  'feedIA-content-strategy': ['both', 'estratega de contenido (pilares + objetivos)'],
  'feedIA-copywriting': ['both', 'copywriter persuasivo (AIDA/PAS, hooks, CTA)'],
  'feedIA-crisis': ['both', 'gestor de crisis y reputación en tiempo real'],
  'feedIA-crm': ['general', 'arquitecto de CRM y ciclo de vida del cliente'],
  'feedIA-cro': ['general', 'especialista en conversión (CRO) y embudos'],
  'feedIA-cu-brain': ['general', 'cerebro de Computer Use (planifica y opera apps)'],
  'feedIA-cu': ['general', 'ejecutor de Computer Use sobre apps reales'],
  'feedIA-curador': ['both', 'curador de contenido y fuentes de valor'],
  'feedIA-ensemble': ['general', 'orquestador ensemble multi-skill (voting)'],
  'feedIA-explore-optimizer': ['instagram', 'optimizador para Explore/recomendados IG'],
  'feedIA-faq': ['general', 'agente de FAQ y respuestas de alto valor'],
  'feedIA-feed-aesthetic': ['instagram', 'curador estético del feed/grid IG'],
  'feedIA-formats': ['both', 'selector de formato según objetivo y algoritmo'],
  'feedIA-hashtag-science': ['both', 'científico de hashtags (tema/contexto, no magia)'],
  'feedIA-hook-generator': ['both', 'generador de ganchos de detención de scroll'],
  'feedIA-humanizer': ['general', 'humanizador de texto (quita tells de IA)'],
  'feedIA-image': ['both', 'generador de imagen IA (texto nativo, 9:16/1:1)'],
  'feedIA-influencer': ['both', 'estratega de influencers y colaboraciones'],
  'feedIA-instagram': ['instagram', 'experto integral del algoritmo y producto Instagram'],
  'feedIA-learning': ['general', 'motor de aprendizaje continuo del cerebro'],
  'feedIA-live-shopping': ['instagram', 'productor de live shopping y venta en vivo'],
  'feedIA-memory': ['general', 'memoria episódica/semántica del cerebro'],
  'feedIA-meta-ads': ['instagram', 'media buyer de Meta Ads (estructura + creativo + puja)'],
  'feedIA-multi-format': ['both', 'reempaquetador multi-formato de una idea'],
  'feedIA-neural': ['general', 'capa neural de decisión del cerebro autónomo'],
  'feedIA-pricing': ['general', 'estratega de precios y oferta'],
  'feedIA-product-marketing': ['both', 'product marketer (posicionamiento + mensaje)'],
  'feedIA-profile-optimizer': ['both', 'optimizador de perfil (primera impresión + conversión)'],
  'feedIA-programmatic-seo': ['general', 'arquitecto de SEO programático a escala'],
  'feedIA-publish-all': ['both', 'publicador multi-plataforma coordinado'],
  'feedIA-publish': ['both', 'publicador con timing y formato óptimo'],
  'feedIA-quick-carousel': ['instagram', 'generador rápido de carrusel IG de alta conversión'],
  'feedIA-reel-generator': ['instagram', 'generador de Reels (hook + retención + loop)'],
  'feedIA-reel-hook-master': ['both', 'maestro de hooks de video (0-2s, triple capa)'],
  'feedIA-reel-studio': ['instagram', 'estudio integral de producción de Reels'],
  'feedIA-remote-control': ['general', 'control remoto del cerebro y sus acciones'],
  'feedIA-report': ['general', 'analista de métricas y reporting accionable'],
  'feedIA-run-skill-generator': ['general', 'meta-ejecutor que corre el generador de skills'],
  'feedIA-seo-audit': ['general', 'auditor SEO técnico y de contenido'],
  'feedIA-shopping-tags': ['instagram', 'experto en shopping tags y catálogo IG'],
  'feedIA-site-architecture': ['general', 'arquitecto de información y estructura web'],
  'feedIA-skill-creator': ['general', 'creador de nuevas skills del cerebro'],
  'feedIA-sms': ['general', 'redactor de SMS/notificaciones de alta apertura'],
  'feedIA-story-engagement-stacker': ['instagram', 'apilador de engagement en Stories (stickers/replies)'],
  'feedIA-story-generator': ['instagram', 'generador de Stories (relación + completion)'],
  'feedIA-strategy': ['both', 'estratega jefe (objetivos → plan → ejecución)'],
  'feedIA-super-genius-2': ['general', 'razonamiento de élite multi-paso v2'],
  'feedIA-super-genius': ['general', 'razonamiento de élite multi-paso'],
  'feedIA-tiktok-agents': ['tiktok', 'equipo de agentes internos del cerebro TikTok'],
  'feedIA-tiktok-algorithm': ['tiktok', 'experto del algoritmo TikTok (FYP/completion/rewatch)'],
  'feedIA-tiktok-branding': ['tiktok', 'guardián de voz de marca nativa TikTok'],
  'feedIA-tiktok-editing': ['tiktok', 'editor TikTok (cortes, beat-sync, subtítulos, loop)'],
  'feedIA-tiktok-hooks': ['tiktok', 'maestro de hooks TikTok 0-2s (verbal+visual+texto)'],
  'feedIA-tiktok-photo': ['tiktok', 'especialista en Photo Mode TikTok (9:16, swipe, sonido)'],
  'feedIA-tiktok-research': ['tiktok', 'investigador de tendencias/sonidos/referentes TikTok'],
  'feedIA-tiktok-script': ['tiktok', 'guionista TikTok (arco, retención, on-screen, CTA)'],
  'feedIA-tiktok-tools': ['tiktok', 'operador de herramientas de video/imagen TikTok'],
  'feedIA-tiktok': ['tiktok', 'experto integral del algoritmo y producto TikTok'],
  'feedIA-training': ['general', 'entrenador del cerebro (fine-tune de comportamiento)'],
  'feedIA-video': ['both', 'generador de video IA (Sora/Seedance/Pika/Kling)'],
  'feedIA-visual-identity': ['both', 'diseñador de identidad visual (paleta, tipo, sistema)'],
  'feedIA-voice-builder': ['both', 'constructor de voz/tono de marca'],
  'feedIA-web-artifacts-builder': ['general', 'constructor de artefactos web (landing/UI)'],
};

const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'feedIA-brain.md');
let touched = 0,
  skipped = 0,
  unmapped = [];

for (const file of files) {
  const key = file.replace(/\.md$/, '');
  const meta = MAP[key];
  if (!meta) {
    unmapped.push(file);
    continue;
  }
  const path = join(dir, file);
  let txt = readFileSync(path, 'utf8');
  if (txt.includes('/feedIA-brain`') || txt.includes('Cerebro FeedIA — hereda')) {
    skipped++;
    continue;
  }
  const [net, role] = meta;
  const block =
    `\n## 🧠 Cerebro FeedIA — hereda \`/feedIA-brain\`\n` +
    `Rol: **${role}**. Algoritmo: ${NET[net]} ` +
    `Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.\n`;
  if (!txt.endsWith('\n')) txt += '\n';
  txt += block;
  writeFileSync(path, txt, 'utf8');
  touched++;
}

console.log(JSON.stringify({ touched, skipped, unmapped }, null, 2));
