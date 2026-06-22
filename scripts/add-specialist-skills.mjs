import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'commands');

const NET = {
  instagram: 'optimiza para sends/saves y alcance de Reels en frío (Instagram).',
  tiktok: 'optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG).',
  both: 'diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto.',
};
const footer = (net, role) =>
  `\n## 🧠 Cerebro FeedIA — hereda \`/feedIA-brain\`\n` +
  `Rol: **${role}**. Algoritmo: ${NET[net]} ` +
  `Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.\n`;

const skill = (desc, title, body, net, role) =>
  `---\ndescription: >\n${desc
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n')}\n---\n\n# ${title}\n\n${body}\n${footer(net, role)}`;

const SKILLS = {
  'feedIA-branding-specialist': skill(
    `Especialista en BRANDING para Instagram y TikTok. Define identidad (propósito,\nvalores, personalidad, arquetipo), voz/tono, sistema visual y consistencia entre redes.\nUsá cuando se pida "branding", "mi marca", "identidad", "tono de voz", "cómo me veo",\n"brand kit", o cuando varias piezas deban alinear marca.`,
    'FeedIA · Branding Specialist',
    `Construye y custodia la marca como un brand strategist senior. No logos sueltos:\nun sistema coherente que se reconoce de un vistazo en ambas redes.\n\n## Identidad de marca\n- **Propósito + valores**: por qué existe, qué defiende.\n- **Personalidad + arquetipo**: (héroe, sabio, rebelde, creador…) → guía tono y estética.\n- **Posicionamiento**: para quién, contra qué, qué promesa única.\n\n## Voz y tono\n- Léxico, ritmo y nivel de formalidad propios. Adaptación por red: IG más curado, TikTok más crudo/nativo — misma esencia.\n- Do/Don't de lenguaje. Frases firma. Cómo responde la marca (community).\n\n## Sistema visual\n- Logo/isotipo, paleta (primario + acento + neutros), tipografía (1-2 familias), grilla, texturas, fotografía.\n- Brand kit reutilizable para carrusel 4:5 y video/foto 9:16.\n- Naming de series y formatos recurrentes.\n\n## Consistencia cross-red\nMisma identidad, dos dialectos (IG/TikTok). Coherencia de paleta, voz y valores en todo.\n\n## HERMANAS\n\`/feedIA-tiktok-branding\` · \`/feedIA-brand-guidelines\` · \`/feedIA-visual-identity\` · \`/feedIA-voice-builder\` · \`/feedIA-art-director\`.`,
    'both',
    'brand strategist (identidad + voz + sistema visual + consistencia cross-red)',
  ),

  'feedIA-canva-specialist': skill(
    `Especialista en CANVA: diseño profesional + operación vía API y Computer Use. Domina\ntemplates, Brand Kit, Magic Resize 4:5/9:16, capas, autofill por API, export limpio.\nUsá cuando se pida "diseñá en Canva", "montá en Canva", "render Canva", "plantilla", o\ncuando una pieza visual deba producirse/editar en Canva.`,
    'FeedIA · Canva Specialist',
    `Opera Canva como diseñador experto, por API cuando hay Connect o por Computer Use.\nConvierte copy + dirección de arte en archivo terminado.\n\n## Capacidades\n- **Brand Kit**: aplica paleta, tipos y logo de la marca automáticamente.\n- **Templates**: elige/ajusta plantilla por formato (carrusel 4:5, story/reel 9:16).\n- **Magic Resize**: 1 diseño → todos los formatos manteniendo jerarquía.\n- **Capas + grilla**: alineación, contraste, safe-area, espacio para texto.\n- **Autofill API**: rellena variables (titular, cuerpo, imagen) y genera el archivo final.\n- **Export limpio**: PNG/MP4 sin watermark, tamaño correcto por red.\n\n## Cómo trabaja FeedIA\n1. Recibe copy + dirección de arte (\`/feedIA-art-director\`).\n2. Prioriza Canva Connect API → si no, opera por Computer Use (\`/feedIA-cu-brain\`).\n3. Devuelve el diseño listo o el archivo render.\n\n## HERMANAS\n\`/feedIA-canva\` · \`/feedIA-canvas-design\` · \`/feedIA-art-director\` · \`/feedIA-image\` · \`/feedIA-cu\`.`,
    'both',
    'operador experto de Canva (Brand Kit, resize, autofill API, export limpio)',
  ),

  'feedIA-capcut-specialist': skill(
    `Especialista en CAPCUT (vía Computer Use): montaje, cortes al beat, subtítulos auto,\ntransiciones, keyframes, sonido trending, export 1080x1920 sin watermark. Usá cuando se\npida "editá en CapCut", "subtítulos", "beat-sync", "montá el video", o al pasar de guion a montaje.`,
    'FeedIA · CapCut Specialist',
    `Edita video como editor pro de short-form. Toma el guion/clips y entrega el video final\noptimizado para retención y completion.\n\n## Capacidades\n- **Cortes al beat**: ritmo 2-4s, pattern interrupt, sincronía con la música.\n- **Subtítulos automáticos**: caption nativo, estilo legible, consumo sin audio.\n- **Keyframes + transiciones**: zoom, pan, match-cut nativos (no efectos baratos).\n- **Sonido trending**: agrega/sincroniza audio en tendencia.\n- **B-roll + overlays**: refuerza el mensaje, mantiene atención.\n- **Loop de cierre**: último frame reconecta con el inicio → rewatch.\n- **Export limpio**: 1080x1920 9:16, sin watermark (el watermark penaliza FYP).\n\n## Flujo\nImporta → ordena por beats → subtítulos → sonido → transiciones → loop → export. Opera vía Computer Use (Auto/Asistente).\n\n## HERMANAS\n\`/feedIA-tiktok-editing\` · \`/feedIA-tiktok-tools\` · \`/feedIA-cu-brain\` · \`/feedIA-video\`.`,
    'tiktok',
    'editor CapCut (beat-sync, subtítulos, transiciones, loop, export limpio)',
  ),

  'feedIA-tiktok-selling': skill(
    `Especialista en VENDER por TikTok. Contenido que vende sin parecer anuncio: demo/UGC,\nprueba social, soft-sell, hook de producto, embudo a perfil/link/Shop y LIVE de venta.\nUsá cuando se pida "vender en tiktok", "que convierta", "contenido de producto", "live de ventas".`,
    'FeedIA · Vender por TikTok',
    `Vende nativo: el video entretiene/educa y la venta entra por la puerta de atrás.\nEn TikTok la gente compra por descubrimiento, no por catálogo.\n\n## Tácticas\n- **Soft-sell nativo**: problema → producto como solución obvia, sin tono publicitario.\n- **Formatos que venden**: demo, antes/después, UGC, "cosas que no sabías", unboxing, restock.\n- **Hook de producto 0-2s**: el resultado o el problema, no la marca.\n- **Prueba social**: reviews, duetos, testimonios, cifras reales.\n- **Embudo**: video → perfil → link/Shop; o LIVE shoppable.\n- **Series**: "probando X por 7 días" mantiene audiencia caliente.\n- **CTA suave**: "está en el carrito naranja / link en bio".\n\n## Métrica\nCompletion + saves + clics a producto. Lo que se ve completo y se guarda, se compra.\n\n## HERMANAS\n\`/feedIA-tiktok-shop\` · \`/feedIA-tiktok\` · \`/feedIA-tiktok-script\` · \`/feedIA-live-shopping\` · \`/feedIA-cro\`.`,
    'tiktok',
    'social seller TikTok (soft-sell nativo, demo/UGC, embudo a Shop/LIVE)',
  ),

  'feedIA-tiktok-shop': skill(
    `Especialista en TIKTOK SHOP. Setup de catálogo, product links en video y LIVE, vitrina,\nafiliados, fichas optimizadas, video shoppable y LIVE shopping. Usá cuando se pida\n"tiktok shop", "vincular producto", "vender directo en tiktok", "afiliados", "live shopping".`,
    'FeedIA · TikTok Shop',
    `Convierte la cuenta en tienda dentro de TikTok: descubrimiento y checkout sin salir de la app.\n\n## Setup + operación\n- **Catálogo**: alta de productos, fichas (título, fotos, variantes, precio).\n- **Product links**: anclar producto en video, LIVE y vitrina (Showcase) del perfil.\n- **Affiliate**: programa de creadores con comisión para amplificar.\n- **LIVE shopping**: producto fijado, demo en vivo, ofertas por tiempo limitado.\n- **Ficha optimizada**: foto 1 clara, beneficio en título, reviews, envío.\n\n## Contenido shoppable\nVideo nativo que muestra el producto en uso + link visible. Volumen + series de producto.\n\n## Métricas\nGMV, CTR a producto, conversión de LIVE, tasa de devolución, comisión de afiliados.\n\n## HERMANAS\n\`/feedIA-tiktok-selling\` · \`/feedIA-tiktok\` · \`/feedIA-live-shopping\` · \`/feedIA-shopping-tags\`.`,
    'tiktok',
    'especialista TikTok Shop (catálogo, product links, afiliados, LIVE shopping)',
  ),

  'feedIA-instagram-shop': skill(
    `Especialista en TIENDA INSTAGRAM (IG Shopping). Setup de Commerce Manager + catálogo\nMeta, product tags en posts/Reels/Stories, colecciones, pestaña Shop y checkout. Usá cuando\nse pida "tienda instagram", "etiquetar productos", "ig shopping", "catálogo Meta", "shop tab".`,
    'FeedIA · Tienda Instagram (IG Shopping)',
    `Monta y optimiza la tienda nativa de Instagram para que el contenido sea comprable.\n\n## Setup\n- **Commerce Manager + catálogo Meta** (manual, e-commerce platform o feed).\n- **Requisitos**: cuenta business, cumplir políticas de comercio, dominio verificado.\n- **Pestaña Shop** + **colecciones** temáticas curadas.\n\n## Operación\n- **Product tags** en posts, Reels y Stories (sticker de producto).\n- **Fichas**: foto principal limpia, título con beneficio, precio, variantes.\n- **Checkout** (donde esté disponible) o link a sitio.\n- Contenido que etiqueta producto sin romper estética del feed.\n\n## Métricas\nVistas de producto, tags clic, add-to-cart, conversión, ROAS si hay ads.\n\n## HERMANAS\n\`/feedIA-shopping-tags\` · \`/feedIA-instagram-selling\` · \`/feedIA-instagram\` · \`/feedIA-meta-ads\`.`,
    'instagram',
    'especialista Tienda IG (Commerce Manager, catálogo, product tags, checkout)',
  ),

  'feedIA-instagram-selling': skill(
    `Especialista en VENDER por Instagram. Embudo de DM, link in bio, stories con sticker de\nlink, social selling y secuencia de cierre. Usá cuando se pida "vender en instagram",\n"cerrar ventas por DM", "embudo de bio", "convertir seguidores en clientes".`,
    'FeedIA · Vender por Instagram',
    `Convierte alcance y comunidad en ventas, sin spam. En IG se vende por relación y DM.\n\n## Embudo\n1. **Contenido** que atrae (Reels alcance + carrusel valor + stories relación).\n2. **CTA a conversación**: "comentá X" / "te mando info por DM" / sticker link.\n3. **DM**: calificar, resolver objeción, ofrecer, cerrar → CRM (\`/feedIA-crm\`).\n4. **Link in bio**: 1 destino claro por objetivo (no 10 links).\n\n## Tácticas\n- Stories de venta: prueba, oferta, urgencia, sticker link/pregunta.\n- Secuencia DM con disparador por palabra clave (automatizable, \`/feedIA-instagram\`).\n- Prueba social en feed (testimonios, casos).\n- Oferta clara + razón para actuar ya.\n\n## Métricas\nDMs iniciados, tasa de respuesta, leads, cierre, ticket promedio.\n\n## HERMANAS\n\`/feedIA-instagram-shop\` · \`/feedIA-instagram\` · \`/feedIA-crm\` · \`/feedIA-cro\` · \`/feedIA-copywriting\`.`,
    'instagram',
    'social seller IG (embudo DM, link in bio, stories de venta, cierre)',
  ),

  'feedIA-follower-growth': skill(
    `Especialista en CRECIMIENTO DE SEGUIDORES (IG + TikTok). Diseña la máquina de follows:\nalcance frío + razón para seguir + bio que convierte. Usá cuando se pida "ganar seguidores",\n"crecer la cuenta", "más followers", "por qué no crezco".`,
    'FeedIA · Crecimiento de Seguidores',
    `Seguir es una decisión: hay que dar alcance frío Y una razón clara para apretar "seguir".\n\n## Palancas\n1. **Alcance frío**: Reels (IG) / FYP (TikTok) que llegan a no-seguidores. Volumen + hooks.\n2. **Razón para seguir**: promesa de cuenta clara ("acá aprendés X cada día") + series.\n3. **Perfil que convierte**: foto, @ claro, bio con propuesta + para quién + CTA, destacadas/pinned.\n4. **Loop de exposición**: saves/shares (IG) y rewatch/shares (TikTok) exponen a nuevos.\n5. **Colabs**: collab posts (IG) y duet/stitch (TikTok) toman audiencia ajena.\n6. **Consistencia**: cadencia alta y constante > ráfagas.\n\n## Diagnóstico\nSi hay alcance pero no follows → problema de perfil/promesa. Si no hay alcance → hook/formato.\n\n## HERMANAS\n\`/feedIA-instagram-growth\` · \`/feedIA-tiktok-growth\` · \`/feedIA-profile-optimizer\` · \`/feedIA-bio-optimizer\` · \`/feedIA-collab-posts\`.`,
    'both',
    'especialista en crecimiento de seguidores (alcance frío + razón para seguir + perfil)',
  ),

  'feedIA-engagement-growth': skill(
    `Especialista en CRECIMIENTO DE INTERACCIÓN. Sube comentarios, saves, shares/sends y\nreplies con disparadores diseñados y respuesta veloz. Usá cuando se pida "más engagement",\n"que comenten", "más interacción", "que guarden/compartan".`,
    'FeedIA · Crecimiento de Interacción',
    `El engagement no se pide genérico ("comentá!"): se diseña con disparadores específicos.\n\n## Disparadores por señal\n- **Comentarios**: pregunta concreta, opinión dividida, "errores comunes" para corregir, completar frase.\n- **Saves**: contenido de referencia ("guardá esto para…"), listas, checklists, frameworks.\n- **Shares/sends**: "mandáselo a quien…", relatable, datos que dan ganas de reenviar.\n- **Replies (Stories/DM)**: stickers (poll/quiz/slider/pregunta), preguntas abiertas.\n\n## Tácticas\n- Responder en los primeros 30-60min (velocidad de engagement = empuje algorítmico).\n- Comentario fijado del autor que extiende la charla (\`/feedIA-community-manager\`).\n- Series interactivas recurrentes; controversia sana con criterio.\n\n## Métrica\nIG: save/send rate + comments. TikTok: comentarios + shares + rewatch.\n\n## HERMANAS\n\`/feedIA-community-manager\` · \`/feedIA-story-engagement-stacker\` · \`/feedIA-hook-generator\` · \`/feedIA-faq\`.`,
    'both',
    'especialista en interacción (disparadores de comments/saves/sends + respuesta veloz)',
  ),

  'feedIA-account-analyst': skill(
    `Analista de CUENTAS. Auditoría completa: perfil, mix de formatos, frecuencia, mejores y\npeores posts, benchmark de nicho, fortalezas/debilidades y plan 30 días. Usá cuando se pida\n"auditá mi cuenta", "qué estoy haciendo mal", "diagnóstico", "revisá mi perfil".`,
    'FeedIA · Analista de Cuentas',
    `Hace el diagnóstico que haría un consultor antes de tocar nada: foto clara + plan.\n\n## Auditoría\n- **Perfil**: foto, @, bio (propuesta/CTA), destacadas, link, coherencia de grid.\n- **Contenido**: mix de formatos, pilares, frecuencia, mejores vs peores posts (y por qué).\n- **Audiencia**: a quién llega vs a quién quiere llegar (\`/feedIA-buyer-persona\`).\n- **Benchmark**: vs referentes del nicho (\`/feedIA-competitor-profiling\`).\n- **Algoritmo**: ¿alcance frío? ¿retención? ¿conversión a follow?\n\n## Entrega\n- 3 fortalezas, 3 debilidades, 3 oportunidades.\n- Cuello de botella principal (1).\n- **Plan 30 días**: qué publicar, cuánto, qué arreglar primero.\n\n## HERMANAS\n\`/feedIA-kpi-analyst\` · \`/feedIA-growth-analyst\` · \`/feedIA-report\` · \`/feedIA-buyer-persona\` · \`/feedIA-competitor-profiling\`.`,
    'both',
    'analista de cuentas (auditoría perfil/contenido/benchmark + plan 30 días)',
  ),

  'feedIA-kpi-analyst': skill(
    `Analista de KPIs. Define north-star + KPIs por objetivo, arma dashboard, alertas y reporte\nejecutivo orientado a decisión. Usá cuando se pida "mis KPIs", "qué métricas miro", "dashboard",\n"reporte", "cómo voy este mes".`,
    'FeedIA · Analista de KPIs',
    `No reporta vanity metrics: conecta cada número con un objetivo de negocio y una decisión.\n\n## Marco\n- **North-star**: 1 métrica que resume el progreso (ej. ventas, leads, alcance cualificado).\n- **KPIs por capa**: alcance (reach/impresiones), retención (completion/avg view), engagement (save/send/comment), conversión (clics/leads/ventas).\n- **Dashboard**: tendencia (semana/mes), comparativa vs período anterior, por formato y por pieza.\n- **Alertas**: caída de alcance, spike de negativo, mejor post para escalar.\n\n## Lectura\nTendencia > foto puntual. Segmenta por formato y plataforma. Cohortes de seguidores nuevos.\n\n## Entrega\nReporte ejecutivo: qué pasó, por qué, qué hacer (1 acción priorizada).\n\n## HERMANAS\n\`/feedIA-account-analyst\` · \`/feedIA-growth-analyst\` · \`/feedIA-report\` · \`/feedIA-learning\`.`,
    'both',
    'analista de KPIs (north-star + dashboard + alertas + reporte de decisión)',
  ),

  'feedIA-instagram-growth': skill(
    `Especialista en CRECIMIENTO en INSTAGRAM. Estrategia de growth IG: Reels para alcance frío,\ncarrusel para saves, stories para relación, Explore, colabs y cadencia. Usá cuando se pida\n"crecer en instagram", "estrategia IG", "más alcance en instagram", "llegar a Explore".`,
    'FeedIA · Crecimiento en Instagram',
    `Crece con el algoritmo IG: cada formato cumple un rol distinto en el embudo de growth.\n\n## Estrategia por formato\n- **Reels**: motor de alcance frío (no-seguidores). Hook 0-1s, retención, loop, audio.\n- **Carrusel**: saves + dwell. Slide 1 promete, última paga + CTA. Contenido de referencia.\n- **Stories**: relación con seguidores (no alcance frío). Stickers, replies, detrás de escena.\n- **Explore**: aparecer = retención alta + saves/sends + tema consistente.\n\n## Palancas\n- Cadencia constante; series reconocibles.\n- Collab posts para audiencia cruzada.\n- Primeros 30min: empujar engagement (velocidad).\n- Bio + perfil que convierte alcance → follow (\`/feedIA-profile-optimizer\`).\n\n## Métrica reina\nsends/saves + reach rate de Reels + follows desde post.\n\n## HERMANAS\n\`/feedIA-explore-optimizer\` · \`/feedIA-follower-growth\` · \`/feedIA-reel-generator\` · \`/feedIA-instagram\` · \`/feedIA-collab-posts\`.`,
    'instagram',
    'especialista en growth Instagram (Reels frío + carrusel saves + stories + Explore)',
  ),

  'feedIA-tiktok-growth': skill(
    `Especialista en CRECIMIENTO en TIKTOK. Estrategia FYP: completion, series, sonidos,\ncadencia alta, nichado, duet/stitch y LIVE. Usá cuando se pida "crecer en tiktok",\n"estrategia tiktok", "llegar al FYP", "por qué no explota".`,
    'FeedIA · Crecimiento en TikTok',
    `Crece con el FYP: cada video se prueba en frío; ganan completion y rewatch, no los seguidores.\n\n## Estrategia\n- **Completion-first**: video corto que se ve 100% > largo a medias. Hook 0-2s triple capa.\n- **Series repetibles**: formato con nombre que la audiencia espera y busca.\n- **Sonidos**: usar trending temprano = empuje de distribución.\n- **Cadencia alta**: más tiros = más chances de FYP; consistencia diaria.\n- **Nichado**: señales claras de tema → el FYP encuentra tu público.\n- **Duet/Stitch**: engancharse a contenido con tracción.\n- **LIVE**: profundiza relación y empuja la cuenta.\n\n## Diagnóstico\nPoco alcance → hook/completion. Alcance sin follows → promesa de cuenta/bio. Picos sin sostener → cadencia/serie.\n\n## Métrica reina\ncompletion % + rewatch + shares; FYP vs followers.\n\n## HERMANAS\n\`/feedIA-tiktok-algorithm\` · \`/feedIA-follower-growth\` · \`/feedIA-tiktok\` · \`/feedIA-tiktok-research\` · \`/feedIA-tiktok-hooks\`.`,
    'tiktok',
    'especialista en growth TikTok (FYP, completion, series, sonidos, cadencia)',
  ),
};

let n = 0;
for (const [name, content] of Object.entries(SKILLS)) {
  writeFileSync(join(dir, `${name}.md`), content, 'utf8');
  n++;
}
console.log(JSON.stringify({ created: n, files: Object.keys(SKILLS) }, null, 2));
