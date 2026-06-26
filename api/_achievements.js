/**
 * Per-user achievement system para Vercel serverless.
 *
 * KV keys:
 *   feedia:user:{userId}:achievements           → AchievementsStore
 *   feedia:user:{userId}:ach:posts              → number
 *   feedia:user:{userId}:ach:dms               → number
 *   feedia:user:{userId}:ach:workflows         → number
 *   feedia:user:{userId}:ach:goals             → number
 *   feedia:user:{userId}:ach:boosts            → number
 *   feedia:user:{userId}:ach:top_performers    → number
 *   feedia:user:{userId}:ach:ambassadors       → number
 *   feedia:user:{userId}:ach:superfans         → number
 *   feedia:user:{userId}:ach:leads             → number
 *   feedia:user:{userId}:ach:sales             → number
 *   feedia:user:{userId}:ach:revenue_usd       → number
 *   feedia:user:{userId}:ach:active_days       → JSON array of 'YYYY-MM-DD'
 *   feedia:user:{userId}:ach:post_midnight     → true | null
 *   feedia:user:{userId}:ach:friday_13         → true | null
 *   feedia:user:{userId}:ach:inbox_zero        → true | null
 *   feedia:user:{userId}:ach:comeback          → true | null
 *   feedia:user:{userId}:snapshot:instagram    → { followers, totalLikes, maxSaves, engagementRate }
 *   feedia:user:{userId}:snapshot:tiktok       → { followers, totalLikes }
 */

import * as store from './_store.js';

// ── Achievement catalog ────────────────────────────────────────────────────

export const ACHIEVEMENT_DEFS = [
  { id:'primeros-100', name:'Primeros 100', description:'Llegaste a 100 seguidores', category:'crecimiento', rarity:'común', emoji:'🌱', badgeIcon:'sprout', flavorText:'Toda planta empieza por una semilla.', unlockCondition:'Alcanzar 100 seguidores', points:10, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'Acabo de cruzar 100 seguidores 🌱' },
  { id:'club-mil', name:'Club de los Mil', description:'1.000 seguidores reales', category:'crecimiento', rarity:'rara', emoji:'🚀', badgeIcon:'rocket', flavorText:'Mil ojos. Mil corazones. Esto es real.', unlockCondition:'Alcanzar 1.000 seguidores', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'¡1.000 seguidores! 🚀' },
  { id:'cinco-mil', name:'5K', description:'5.000 seguidores', category:'crecimiento', rarity:'rara', emoji:'⭐', badgeIcon:'star', flavorText:'Ya no es casualidad. Es construcción.', unlockCondition:'Alcanzar 5.000 seguidores', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Llegamos a 5K ⭐' },
  { id:'diez-mil', name:'Membresía 10K', description:'10.000 seguidores · gold tier', category:'crecimiento', rarity:'épica', emoji:'🏆', badgeIcon:'trophy', flavorText:'Diez mil personas eligieron escucharte.', unlockCondition:'Alcanzar 10.000 seguidores', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K seguidores 🏆 Gracias a cada uno.' },
  { id:'cien-mil', name:'Élite 100K', description:'Seis cifras. Una comunidad gigante.', category:'crecimiento', rarity:'legendaria', emoji:'👑', badgeIcon:'crown', flavorText:'Te lo ganaste con esfuerzo. Bienvenido a la élite.', unlockCondition:'Alcanzar 100.000 seguidores', points:1000, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100.000 seguidores 👑 Histórico.' },
  { id:'millon', name:'Un Millón', description:'Un millón de personas', category:'crecimiento', rarity:'mítica', emoji:'💎', badgeIcon:'diamond', flavorText:'Esto se cuenta a los nietos.', unlockCondition:'Alcanzar 1.000.000 seguidores', points:5000, hidden:false, unlockSound:'mythic-revelation', unlockAnimation:'cosmic-reveal', shareableText:'UN MILLÓN 💎' },
  { id:'racha-7', name:'Semana ganadora', description:'7 días seguidos sumando seguidores', category:'crecimiento', rarity:'común', emoji:'🔥', badgeIcon:'flame', flavorText:'Una semana entera para arriba.', unlockCondition:'7 días seguidos activo', points:30, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'7 días seguidos creciendo 🔥' },
  { id:'racha-30', name:'Mes Inquebrantable', description:'30 días seguidos sumando seguidores', category:'crecimiento', rarity:'épica', emoji:'🌋', badgeIcon:'volcano', flavorText:'Un mes entero sin pausa.', unlockCondition:'30 días seguidos activo', points:200, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'30 días creciendo sin parar 🌋' },
  { id:'primer-mil-likes', name:'Primer mil likes', description:'1000 likes acumulados', category:'engagement', rarity:'común', emoji:'❤️', badgeIcon:'heart', flavorText:'Mil corazoncitos. No es poco.', unlockCondition:'Acumular 1000 likes', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'1K likes ❤️' },
  { id:'engagement-5pct', name:'Engagement de fuego', description:'Engagement rate sostenido > 5%', category:'engagement', rarity:'rara', emoji:'🔥', badgeIcon:'fire', flavorText:'Tu audiencia te ama.', unlockCondition:'Engagement rate promedio > 5%', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Engagement rate +5% sostenido 🔥' },
  { id:'engagement-10pct', name:'Engagement de leyenda', description:'ER promedio > 10%', category:'engagement', rarity:'legendaria', emoji:'⚡', badgeIcon:'lightning', flavorText:'Esto es performance de top 1% mundial.', unlockCondition:'Engagement rate promedio > 10%', points:500, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'ER promedio +10% 🤯' },
  { id:'cien-saves', name:'Save Master', description:'100 saves en un solo post', category:'engagement', rarity:'rara', emoji:'🔖', badgeIcon:'bookmark', flavorText:'Que guarden es la mejor métrica.', unlockCondition:'Un post con 100+ saves', points:60, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Mi post fue guardado 100+ veces 🔖' },
  { id:'mil-saves', name:'Maestro del Save', description:'1000+ saves en un post', category:'engagement', rarity:'épica', emoji:'📚', badgeIcon:'books', flavorText:'Tu contenido se vuelve referencia.', unlockCondition:'Un post con 1000+ saves', points:300, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'1000+ saves en un post 📚' },
  { id:'primer-post', name:'Primera Pieza', description:'Publicaste tu primer post', category:'contenido', rarity:'común', emoji:'🎬', badgeIcon:'clapboard', flavorText:'El que arranca, gana.', unlockCondition:'Publicar 1+ post', points:5, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'Empecé 🎬' },
  { id:'diez-posts', name:'10 piezas', description:'Publicaste 10 posts', category:'contenido', rarity:'común', emoji:'✏️', badgeIcon:'pencil', flavorText:'La consistencia es difícil. Lo estás haciendo.', unlockCondition:'Publicar 10+ posts', points:20, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'10 piezas publicadas ✏️' },
  { id:'cien-posts', name:'Productor', description:'100 posts publicados', category:'contenido', rarity:'rara', emoji:'🎯', badgeIcon:'target', flavorText:'Cien piezas. Cien chances de ser visto.', unlockCondition:'Publicar 100+ posts', points:150, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'100 posts 🎯' },
  { id:'mil-posts', name:'Maquinista', description:'1000 posts publicados', category:'contenido', rarity:'épica', emoji:'⚙️', badgeIcon:'gear', flavorText:'Tu cuenta es una máquina. Y la manejás.', unlockCondition:'Publicar 1000+ posts', points:800, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'1000 piezas publicadas ⚙️' },
  { id:'top-performer-uno', name:'Tu Primer Top', description:'Tu primer post top performer', category:'contenido', rarity:'común', emoji:'🌟', badgeIcon:'star-twinkle', flavorText:'Algo conectó. Recordalo.', unlockCondition:'1+ post top performer', points:25, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'Mi primer top post 🌟' },
  { id:'top-performer-cinco', name:'Quinto Top', description:'5 posts top performers', category:'contenido', rarity:'rara', emoji:'⭐', badgeIcon:'stars', flavorText:'No fue suerte. Es patrón.', unlockCondition:'5+ top performers', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'5 top posts ⭐' },
  { id:'stories-diaria', name:'Story Daily', description:'7 días seguidos publicando stories', category:'contenido', rarity:'rara', emoji:'📱', badgeIcon:'phone', flavorText:'Estar todos los días no es fácil. Vos sí.', unlockCondition:'7 días activos en FeedIA', points:70, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'7 días de stories diarias 📱' },
  { id:'primera-respuesta', name:'Primera Respuesta', description:'Respondiste tu primer DM', category:'comunidad', rarity:'común', emoji:'💬', badgeIcon:'message-circle', flavorText:'Empezó la conversación.', unlockCondition:'1+ DM respondido', points:5, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
  { id:'cien-respuestas', name:'Conversador', description:'100 DMs respondidos', category:'comunidad', rarity:'rara', emoji:'🗣️', badgeIcon:'speech', flavorText:'Cada DM contestado es un voto de confianza.', unlockCondition:'100+ DMs respondidos', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'100 conversaciones 🗣️' },
  { id:'primer-embajador', name:'Tu Primer Embajador', description:'Promoviste un fan a tier embajador', category:'comunidad', rarity:'rara', emoji:'🤝', badgeIcon:'handshake', flavorText:'Alguien defiende tu marca sin que se lo pidas.', unlockCondition:'1+ embajador', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
  { id:'diez-superfans', name:'Núcleo Caliente', description:'10 super-fans activos', category:'comunidad', rarity:'épica', emoji:'💛', badgeIcon:'heart-pulse', flavorText:'Diez personas hablan de vos sin que las pinches.', unlockCondition:'10+ super-fans', points:200, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10 super-fans 💛' },
  { id:'primer-lead', name:'Primer Lead', description:'Detectaste tu primer lead calificado', category:'ventas', rarity:'común', emoji:'🎯', badgeIcon:'target', flavorText:'Detrás de cada lead hay una vida.', unlockCondition:'1+ lead creado', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
  { id:'primer-cierre', name:'Primera Venta', description:'Tu primera venta cerrada', category:'ventas', rarity:'rara', emoji:'💰', badgeIcon:'money-bag', flavorText:'El primer cliente nunca se olvida.', unlockCondition:'1+ venta cerrada', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Primera venta cerrada 💰' },
  { id:'mil-usd', name:'Mil dólares', description:'Facturaste $1000+ acumulados', category:'ventas', rarity:'rara', emoji:'💵', badgeIcon:'cash', flavorText:'Mil USD. Empieza lo serio.', unlockCondition:'Revenue >= $1000', points:200, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
  { id:'diez-mil-usd', name:'$10K', description:'Cinco cifras facturadas', category:'ventas', rarity:'épica', emoji:'💎', badgeIcon:'gem', flavorText:'Diez mil USD significa que tu marca convierte.', unlockCondition:'Revenue >= $10K', points:600, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'' },
  { id:'primer-dia-completo', name:'Día Completo', description:'Usaste el sistema un día entero', category:'rituales', rarity:'común', emoji:'☀️', badgeIcon:'sun', flavorText:'Un día con vos. Mil más por venir.', unlockCondition:'1+ día activo en FeedIA', points:10, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
  { id:'fundador-mes', name:'Mes Founder', description:'30 días usando FeedIA', category:'rituales', rarity:'rara', emoji:'📅', badgeIcon:'calendar', flavorText:'Un mes con FeedIA. Estás cambiando hábitos.', unlockCondition:'30+ días activos', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
  { id:'fundador-año', name:'Un Año Juntos', description:'365 días con el sistema', category:'rituales', rarity:'legendaria', emoji:'🌍', badgeIcon:'globe', flavorText:'Un año entero. Mirá hasta dónde llegaste.', unlockCondition:'365+ días activos', points:1500, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'Un año con FeedIA 🌍' },
  { id:'primer-workflow', name:'Primer Workflow', description:'Ejecutaste tu primer workflow', category:'maestría', rarity:'común', emoji:'⚡', badgeIcon:'bolt', flavorText:'Le diste cuerda al sistema.', unlockCondition:'1+ workflow ejecutado', points:10, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
  { id:'goal-completado', name:'Goal Completado', description:'Cumpliste tu primera meta', category:'maestría', rarity:'rara', emoji:'🏁', badgeIcon:'flag', flavorText:'Lo dijiste. Lo hiciste.', unlockCondition:'1+ meta completada', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
  { id:'cinco-goals', name:'Cumplidor', description:'5 metas completadas', category:'maestría', rarity:'épica', emoji:'🎖️', badgeIcon:'medal', flavorText:'Cinco veces te propusiste algo. Cinco veces lo hiciste.', unlockCondition:'5+ metas completadas', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'' },
  { id:'todas-categorias', name:'Polifacético', description:'Desbloqueaste al menos 1 logro en cada categoría', category:'maestría', rarity:'épica', emoji:'🎭', badgeIcon:'mask', flavorText:'No te quedaste en una sola área. Todas te interesan.', unlockCondition:'1 logro de cada categoría', points:400, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'' },
  { id:'boost-master', name:'Boost Master', description:'10+ boosts post-publicación con lift positivo', category:'maestría', rarity:'rara', emoji:'🚀', badgeIcon:'rocket-launch', flavorText:'Sabés sacar el jugo a la ventana del algoritmo.', unlockCondition:'10+ boosts exitosos', points:120, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
  { id:'noche-creativa', name:'Búho Creativo', description:'Publicaste algo después de medianoche', category:'especiales', rarity:'común', emoji:'🦉', badgeIcon:'owl', flavorText:'Las mejores ideas vienen tarde.', unlockCondition:'???', points:25, hidden:true, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
  { id:'viernes-13', name:'Viernes 13', description:'Publicaste un viernes 13', category:'especiales', rarity:'rara', emoji:'🔮', badgeIcon:'crystal-ball', flavorText:'No hay supersticiones cuando hay valor real.', unlockCondition:'???', points:35, hidden:true, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
  { id:'cero-pendientes', name:'Inbox Zero', description:'Cero conversaciones pendientes', category:'especiales', rarity:'rara', emoji:'🧘', badgeIcon:'lotus', flavorText:'La paz mental viene de no tener pendientes.', unlockCondition:'???', points:40, hidden:true, unlockSound:'rare-fanfare', unlockAnimation:'sparkle', shareableText:'Inbox zero 🧘' },
  { id:'comeback', name:'Renacer', description:'Volviste después de mucho tiempo', category:'especiales', rarity:'épica', emoji:'🔥', badgeIcon:'phoenix-feather', flavorText:'Los que vuelven, vuelven más fuertes.', unlockCondition:'???', points:100, hidden:true, unlockSound:'epic-orchestra', unlockAnimation:'phoenix-rise', shareableText:'' },
  { id:'tt-100-seg', name:'Primeros 100 en TikTok', description:'100 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'común', emoji:'🎵', badgeIcon:'tiktok-sprout', flavorText:'TikTok te conoce.', unlockCondition:'100 seguidores en TikTok', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 seguidores en TikTok 🎵' },
  { id:'tt-500-seg', name:'500 Seguidores', description:'500 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'común', emoji:'🎬', badgeIcon:'tiktok-grow', flavorText:'Tu contenido resonó.', unlockCondition:'500 seguidores en TikTok', points:25, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'500 seguidores en TikTok 🎬' },
  { id:'tt-1k-seg', name:'Club TikTok 1K', description:'1.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'rara', emoji:'🚀', badgeIcon:'tiktok-rocket', flavorText:'Mil personas te siguen.', unlockCondition:'1.000 seguidores en TikTok', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K seguidores en TikTok 🚀' },
  { id:'tt-2.5k-seg', name:'2.5K TikTokers', description:'2.500 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'rara', emoji:'⭐', badgeIcon:'tiktok-star', flavorText:'El algoritmo te ama.', unlockCondition:'2.500 seguidores en TikTok', points:75, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'2.5K en TikTok ⭐' },
  { id:'tt-5k-seg', name:'5K Viral', description:'5.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'rara', emoji:'🔥', badgeIcon:'tiktok-flame', flavorText:'Tu contenido quema.', unlockCondition:'5.000 seguidores en TikTok', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'5K en TikTok 🔥' },
  { id:'tt-10k-seg', name:'Creador TikTok 10K', description:'10.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'épica', emoji:'🏆', badgeIcon:'tiktok-trophy', flavorText:'Ya sos creator de verdad.', unlockCondition:'10.000 seguidores en TikTok', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K creators en TikTok 🏆' },
  { id:'tt-25k-seg', name:'25K Influencer', description:'25.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'épica', emoji:'👑', badgeIcon:'tiktok-crown', flavorText:'Ya sois influencer.', unlockCondition:'25.000 seguidores en TikTok', points:400, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'25K influencer en TikTok 👑' },
  { id:'tt-50k-seg', name:'50K Star', description:'50.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'legendaria', emoji:'💫', badgeIcon:'tiktok-star-burst', flavorText:'Medio millón de ojos sobre vos.', unlockCondition:'50.000 seguidores en TikTok', points:600, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'50K star en TikTok 💫' },
  { id:'tt-100k-seg', name:'TikTok Celeb 100K', description:'100.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'legendaria', emoji:'🌟', badgeIcon:'tiktok-celebrity', flavorText:'Seis cifras. Sos celebridad.', unlockCondition:'100.000 seguidores en TikTok', points:1000, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K celebridad en TikTok 🌟' },
  { id:'tt-100-likes', name:'Primeros 100 Likes TT', description:'100 likes totales en TikTok', category:'tiktok-engagement', rarity:'común', emoji:'❤️', badgeIcon:'tiktok-heart', flavorText:'Primeros corazones en TikTok.', unlockCondition:'100 likes en TikTok', points:20, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 likes en TikTok ❤️' },
  { id:'tt-1k-likes', name:'Mil Corazones TT', description:'1.000 likes totales en TikTok', category:'tiktok-engagement', rarity:'rara', emoji:'💕', badgeIcon:'tiktok-hearts', flavorText:'Tu contenido late fuerte.', unlockCondition:'1.000 likes en TikTok', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K likes en TikTok 💕' },
  { id:'tt-10k-likes', name:'10K Viral TT', description:'10.000 likes totales en TikTok', category:'tiktok-engagement', rarity:'épica', emoji:'🔥', badgeIcon:'tiktok-viral', flavorText:'Tu contenido es viral.', unlockCondition:'10.000 likes en TikTok', points:300, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K viral en TikTok 🔥' },
  { id:'tt-100k-likes', name:'100K Mega Viral', description:'100.000 likes totales en TikTok', category:'tiktok-engagement', rarity:'legendaria', emoji:'💎', badgeIcon:'tiktok-mega', flavorText:'Cien mil corazones.', unlockCondition:'100.000 likes en TikTok', points:800, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K mega viral en TikTok 💎' },
  { id:'tt-1m-likes', name:'1M Fenómeno', description:'1 millón de likes totales en TikTok', category:'tiktok-engagement', rarity:'mítica', emoji:'👑', badgeIcon:'tiktok-million', flavorText:'Un millón de corazones. Sos historia.', unlockCondition:'1.000.000 likes en TikTok', points:2000, hidden:false, unlockSound:'mythic-revelation', unlockAnimation:'cosmic-reveal', shareableText:'1M en TikTok 👑' },
  { id:'ig-100-seg', name:'Primeros 100 en Instagram', description:'100 seguidores en Instagram', category:'instagram-crecimiento', rarity:'común', emoji:'📸', badgeIcon:'ig-sprout', flavorText:'Instagram te conoce.', unlockCondition:'100 seguidores en Instagram', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 seguidores en Instagram 📸' },
  { id:'ig-1k-seg', name:'Club Instagram 1K', description:'1.000 seguidores en Instagram', category:'instagram-crecimiento', rarity:'rara', emoji:'🚀', badgeIcon:'ig-rocket', flavorText:'Mil personas en tu feed.', unlockCondition:'1.000 seguidores en Instagram', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K en Instagram 🚀' },
  { id:'ig-10k-seg', name:'Creador Instagram 10K', description:'10.000 seguidores en Instagram', category:'instagram-crecimiento', rarity:'épica', emoji:'🏆', badgeIcon:'ig-trophy', flavorText:'Sos creador de Instagram.', unlockCondition:'10.000 seguidores en Instagram', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K creador en Instagram 🏆' },
  { id:'ig-100k-seg', name:'Instagram Celebrity 100K', description:'100.000 seguidores en Instagram', category:'instagram-crecimiento', rarity:'legendaria', emoji:'👑', badgeIcon:'ig-crown', flavorText:'Seis cifras en Instagram.', unlockCondition:'100.000 seguidores en Instagram', points:1000, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K en Instagram 👑' },
  { id:'ig-100-likes', name:'Primeros 100 Likes IG', description:'100 likes totales en Instagram', category:'instagram-engagement', rarity:'común', emoji:'❤️', badgeIcon:'ig-heart', flavorText:'Instagram te quiere.', unlockCondition:'100 likes en Instagram', points:20, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 likes en Instagram ❤️' },
  { id:'ig-1k-likes', name:'Mil Corazones IG', description:'1.000 likes totales en Instagram', category:'instagram-engagement', rarity:'rara', emoji:'💕', badgeIcon:'ig-hearts', flavorText:'Tu feed enamora.', unlockCondition:'1.000 likes en Instagram', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K likes en Instagram 💕' },
  { id:'ig-10k-likes', name:'10K Hit IG', description:'10.000 likes totales en Instagram', category:'instagram-engagement', rarity:'épica', emoji:'🔥', badgeIcon:'ig-viral', flavorText:'Tu contenido es un hit.', unlockCondition:'10.000 likes en Instagram', points:300, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K hit en Instagram 🔥' },
  { id:'ig-100k-likes', name:'100K Sensación', description:'100.000 likes totales en Instagram', category:'instagram-engagement', rarity:'legendaria', emoji:'💎', badgeIcon:'ig-mega', flavorText:'Cien mil interacciones.', unlockCondition:'100.000 likes en Instagram', points:800, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K sensación en Instagram 💎' },
];

// ── Default store ──────────────────────────────────────────────────────────

const DEFAULT_STORE = () => ({
  version: 1,
  unlocked: [],
  totalPoints: 0,
  byCategory: { crecimiento:0, engagement:0, contenido:0, comunidad:0, ventas:0, rituales:0, maestría:0, especiales:0, 'tiktok-crecimiento':0, 'tiktok-engagement':0, 'instagram-crecimiento':0, 'instagram-engagement':0 },
  byRarity: { común:0, rara:0, épica:0, legendaria:0, mítica:0 },
});

// ── KV helpers ─────────────────────────────────────────────────────────────

const achKey = (userId) => `feedia:user:${userId}:achievements`;
const ctrKey = (userId, name) => `feedia:user:${userId}:ach:${name}`;

const loadStore = async (userId) => {
  const s = await store.get(achKey(userId));
  return s ?? DEFAULT_STORE();
};

const saveStore = async (userId, s) => store.set(achKey(userId), s);

const getCounter = async (userId, name) => Number((await store.get(ctrKey(userId, name))) || 0);

/** Increment a named action counter and return the new value. */
export const incrementCounter = async (userId, name, by = 1) => {
  const k = ctrKey(userId, name);
  const cur = Number((await store.get(k)) || 0);
  const next = cur + by;
  await store.set(k, next);
  return next;
};

/** Mark today as an active day and return array of all active dates. */
export const recordActiveDay = async (userId) => {
  const today = new Date().toISOString().slice(0, 10);
  const k = ctrKey(userId, 'active_days');
  const days = (await store.get(k)) ?? [];
  if (!days.includes(today)) {
    days.push(today);
    if (days.length > 500) days.splice(0, days.length - 500);
    await store.set(k, days);
  }
  return days;
};

const getActiveDaysCount = async (userId) => {
  const days = (await store.get(ctrKey(userId, 'active_days'))) ?? [];
  return days.length;
};

const checkConsecutiveStreak = async (userId, requiredDays) => {
  const days = (await store.get(ctrKey(userId, 'active_days'))) ?? [];
  if (days.length < requiredDays) return false;
  const sorted = [...new Set(days)].sort();
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const d1 = new Date(sorted[i]);
    const d2 = new Date(sorted[i - 1]);
    const diff = (d1 - d2) / 86400000;
    if (diff === 1) {
      streak++;
      if (streak >= requiredDays) return true;
    } else {
      streak = 1;
    }
  }
  return streak >= requiredDays;
};

// ── Metrics snapshot ───────────────────────────────────────────────────────

/** Build unified metrics object for evaluators. Priority: per-user KV → global KV → zeros. */
const buildMetrics = async (userId) => {
  const [igUser, igGlobal, ttUser, ttGlobal] = await Promise.all([
    store.get(`feedia:user:${userId}:snapshot:instagram`),
    store.get('feedia:last_snapshot:instagram'),
    store.get(`feedia:user:${userId}:snapshot:tiktok`),
    store.get('feedia:last_snapshot:tiktok'),
  ]);

  const ig = igUser ?? igGlobal?.profile ?? {};
  const tt = ttUser ?? ttGlobal?.profile ?? {};

  return {
    // Generic "primary account" followers
    followers: ig.followers ?? ig.followers_count ?? 0,
    totalLikes: ig.totalLikes ?? 0,
    maxSaves: ig.maxSaves ?? 0,
    engagementRate: ig.engagementRate ?? 0,
    // Platform-specific
    igFollowers: ig.followers ?? ig.followers_count ?? 0,
    igTotalLikes: ig.totalLikes ?? ig.likes ?? 0,
    ttFollowers: tt.followers ?? tt.follower_count ?? 0,
    ttTotalLikes: tt.totalLikes ?? tt.likes ?? tt.likes_count ?? 0,
  };
};

// ── Evaluators ─────────────────────────────────────────────────────────────

const EVALUATORS = {
  // ── Crecimiento (generic followers = IG primary)
  'primeros-100': async (uid, m) => m.followers >= 100,
  'club-mil':     async (uid, m) => m.followers >= 1000,
  'cinco-mil':    async (uid, m) => m.followers >= 5000,
  'diez-mil':     async (uid, m) => m.followers >= 10000,
  'cien-mil':     async (uid, m) => m.followers >= 100000,
  'millon':       async (uid, m) => m.followers >= 1000000,
  'racha-7':      async (uid)    => checkConsecutiveStreak(uid, 7),
  'racha-30':     async (uid)    => checkConsecutiveStreak(uid, 30),

  // ── Engagement
  'primer-mil-likes':  async (uid, m) => m.totalLikes >= 1000,
  'engagement-5pct':   async (uid, m) => m.engagementRate >= 5,
  'engagement-10pct':  async (uid, m) => m.engagementRate >= 10,
  'cien-saves':        async (uid, m) => m.maxSaves >= 100,
  'mil-saves':         async (uid, m) => m.maxSaves >= 1000,

  // ── Contenido (action counters)
  'primer-post':        async (uid) => await getCounter(uid, 'posts') >= 1,
  'diez-posts':         async (uid) => await getCounter(uid, 'posts') >= 10,
  'cien-posts':         async (uid) => await getCounter(uid, 'posts') >= 100,
  'mil-posts':          async (uid) => await getCounter(uid, 'posts') >= 1000,
  'top-performer-uno':  async (uid) => await getCounter(uid, 'top_performers') >= 1,
  'top-performer-cinco':async (uid) => await getCounter(uid, 'top_performers') >= 5,
  'stories-diaria':     async (uid) => checkConsecutiveStreak(uid, 7),

  // ── Comunidad
  'primera-respuesta':  async (uid) => await getCounter(uid, 'dms') >= 1,
  'cien-respuestas':    async (uid) => await getCounter(uid, 'dms') >= 100,
  'primer-embajador':   async (uid) => await getCounter(uid, 'ambassadors') >= 1,
  'diez-superfans':     async (uid) => await getCounter(uid, 'superfans') >= 10,

  // ── Ventas
  'primer-lead':    async (uid) => await getCounter(uid, 'leads') >= 1,
  'primer-cierre':  async (uid) => await getCounter(uid, 'sales') >= 1,
  'mil-usd':        async (uid) => await getCounter(uid, 'revenue_usd') >= 1000,
  'diez-mil-usd':   async (uid) => await getCounter(uid, 'revenue_usd') >= 10000,

  // ── Rituales (active days)
  'primer-dia-completo': async (uid) => await getActiveDaysCount(uid) >= 1,
  'fundador-mes':        async (uid) => await getActiveDaysCount(uid) >= 30,
  'fundador-año':        async (uid) => await getActiveDaysCount(uid) >= 365,

  // ── Maestría
  'primer-workflow':   async (uid) => await getCounter(uid, 'workflows') >= 1,
  'goal-completado':   async (uid) => await getCounter(uid, 'goals') >= 1,
  'cinco-goals':       async (uid) => await getCounter(uid, 'goals') >= 5,
  'todas-categorias':  async (uid, m, st) => {
    const categories = new Set(st.unlocked.map(u => {
      const def = ACHIEVEMENT_DEFS.find(a => a.id === u.achievementId);
      return def?.category;
    }).filter(Boolean));
    const required = ['crecimiento','engagement','contenido','comunidad','ventas','rituales','maestría'];
    return required.every(c => categories.has(c));
  },
  'boost-master': async (uid) => await getCounter(uid, 'boosts') >= 10,

  // ── Especiales (set by specific triggers elsewhere)
  'noche-creativa': async (uid) => Boolean(await store.get(ctrKey(uid, 'post_midnight'))),
  'viernes-13':     async (uid) => Boolean(await store.get(ctrKey(uid, 'friday_13'))),
  'cero-pendientes':async (uid) => Boolean(await store.get(ctrKey(uid, 'inbox_zero'))),
  'comeback':       async (uid) => Boolean(await store.get(ctrKey(uid, 'comeback'))),

  // ── TikTok crecimiento
  'tt-100-seg':   async (uid, m) => m.ttFollowers >= 100,
  'tt-500-seg':   async (uid, m) => m.ttFollowers >= 500,
  'tt-1k-seg':    async (uid, m) => m.ttFollowers >= 1000,
  'tt-2.5k-seg':  async (uid, m) => m.ttFollowers >= 2500,
  'tt-5k-seg':    async (uid, m) => m.ttFollowers >= 5000,
  'tt-10k-seg':   async (uid, m) => m.ttFollowers >= 10000,
  'tt-25k-seg':   async (uid, m) => m.ttFollowers >= 25000,
  'tt-50k-seg':   async (uid, m) => m.ttFollowers >= 50000,
  'tt-100k-seg':  async (uid, m) => m.ttFollowers >= 100000,

  // ── TikTok engagement
  'tt-100-likes':   async (uid, m) => m.ttTotalLikes >= 100,
  'tt-1k-likes':    async (uid, m) => m.ttTotalLikes >= 1000,
  'tt-10k-likes':   async (uid, m) => m.ttTotalLikes >= 10000,
  'tt-100k-likes':  async (uid, m) => m.ttTotalLikes >= 100000,
  'tt-1m-likes':    async (uid, m) => m.ttTotalLikes >= 1000000,

  // ── Instagram crecimiento
  'ig-100-seg':   async (uid, m) => m.igFollowers >= 100,
  'ig-1k-seg':    async (uid, m) => m.igFollowers >= 1000,
  'ig-10k-seg':   async (uid, m) => m.igFollowers >= 10000,
  'ig-100k-seg':  async (uid, m) => m.igFollowers >= 100000,

  // ── Instagram engagement
  'ig-100-likes':   async (uid, m) => m.igTotalLikes >= 100,
  'ig-1k-likes':    async (uid, m) => m.igTotalLikes >= 1000,
  'ig-10k-likes':   async (uid, m) => m.igTotalLikes >= 10000,
  'ig-100k-likes':  async (uid, m) => m.igTotalLikes >= 100000,
};

// ── Core evaluate ──────────────────────────────────────────────────────────

/**
 * Run all evaluators for a user. Returns array of newly unlocked achievement definitions.
 * Persists the updated store to KV.
 */
export const evaluateAchievements = async (userId) => {
  const [st, metrics] = await Promise.all([loadStore(userId), buildMetrics(userId)]);
  const alreadyUnlocked = new Set(st.unlocked.map(u => u.achievementId));
  const newUnlocks = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (alreadyUnlocked.has(def.id)) continue;
    const evaluator = EVALUATORS[def.id];
    if (!evaluator) continue;
    let result = false;
    try {
      result = await evaluator(userId, metrics, st);
    } catch {
      continue;
    }
    if (!result) continue;

    const unlock = {
      achievementId: def.id,
      unlockedAt: new Date().toISOString(),
      shared: false,
      acknowledged: false,
    };
    st.unlocked.push(unlock);
    st.totalPoints += def.points;
    st.byCategory[def.category] = (st.byCategory[def.category] ?? 0) + 1;
    st.byRarity[def.rarity] = (st.byRarity[def.rarity] ?? 0) + 1;
    alreadyUnlocked.add(def.id);
    newUnlocks.push({ ...def, ...unlock });
  }

  if (newUnlocks.length > 0) await saveStore(userId, st);
  return newUnlocks;
};

// ── Read helpers ──────────────────────────────────────────────────────────

export const getAllAchievements = () => ACHIEVEMENT_DEFS;

export const getUnlocked = async (userId) => {
  const st = await loadStore(userId);
  return st.unlocked.map(u => {
    const def = ACHIEVEMENT_DEFS.find(a => a.id === u.achievementId);
    return def ? { ...def, ...u } : null;
  }).filter(Boolean);
};

export const getSnapshot = async (userId) => {
  const st = await loadStore(userId);
  const lastUnlock = st.unlocked[st.unlocked.length - 1];
  const lastDef = lastUnlock ? ACHIEVEMENT_DEFS.find(a => a.id === lastUnlock.achievementId) : null;
  return {
    totalUnlocked: st.unlocked.length,
    totalAvailable: ACHIEVEMENT_DEFS.length,
    totalPoints: st.totalPoints,
    byCategory: st.byCategory,
    byRarity: st.byRarity,
    completionPct: (st.unlocked.length / ACHIEVEMENT_DEFS.length) * 100,
    rareUnlocked: st.byRarity.rara ?? 0,
    epicUnlocked: st.byRarity.épica ?? 0,
    legendaryUnlocked: st.byRarity.legendaria ?? 0,
    mythicUnlocked: st.byRarity.mítica ?? 0,
    lastUnlocked: lastDef && lastUnlock ? { name: lastDef.name, at: lastUnlock.unlockedAt } : undefined,
  };
};

export const getNext = async (userId) => {
  const st = await loadStore(userId);
  const unlocked = new Set(st.unlocked.map(u => u.achievementId));
  return ACHIEVEMENT_DEFS
    .filter(a => !unlocked.has(a.id) && !a.hidden)
    .slice(0, 5)
    .map(a => ({ achievement: a, progressHint: buildProgressHint(a.id) }));
};

export const getUnacknowledged = async (userId) => {
  const st = await loadStore(userId);
  return st.unlocked
    .filter(u => !u.acknowledged)
    .map(u => {
      const def = ACHIEVEMENT_DEFS.find(a => a.id === u.achievementId);
      return def ? { ...def, ...u } : null;
    }).filter(Boolean);
};

export const markShared = async (userId, achievementId) => {
  const st = await loadStore(userId);
  const u = st.unlocked.find(x => x.achievementId === achievementId);
  if (!u) return false;
  u.shared = true;
  await saveStore(userId, st);
  return true;
};

export const markAcknowledged = async (userId, achievementId) => {
  const st = await loadStore(userId);
  const u = st.unlocked.find(x => x.achievementId === achievementId);
  if (!u) return false;
  u.acknowledged = true;
  await saveStore(userId, st);
  return true;
};

// ── Progress hints ─────────────────────────────────────────────────────────

const PROGRESS_HINTS = {
  'primer-post': 'Publicá tu primer post desde FeedIA',
  'diez-posts': 'Publicá 10 posts en total',
  'cien-posts': 'Publicá 100 posts en total',
  'primera-respuesta': 'Respondé un DM desde el módulo de comunidad',
  'primer-lead': 'Registrá un lead en el CRM',
  'primer-workflow': 'Ejecutá un workflow en FeedIA',
  'primer-dia-completo': 'Usá FeedIA durante un día completo',
  'fundador-mes': 'Usá FeedIA 30 días activos',
  'primeros-100': 'Conectá tu Instagram y alcanzá 100 seguidores',
  'club-mil': 'Alcanzá 1.000 seguidores en tu cuenta principal',
  'racha-7': 'Ingresá a FeedIA 7 días seguidos',
  'tt-100-seg': 'Conectá tu TikTok y alcanzá 100 seguidores',
  'ig-100-seg': 'Conectá tu Instagram y alcanzá 100 seguidores',
};
const buildProgressHint = (id) => PROGRESS_HINTS[id] ?? 'Seguí usando FeedIA para desbloquear';

// ── Special trigger helpers (called from other routes) ─────────────────────

/** Call after a post is published. Increments counter + evaluates. */
export const onPostPublished = async (userId, { afterMidnight = false, friday13 = false } = {}) => {
  await recordActiveDay(userId);
  await incrementCounter(userId, 'posts');
  if (afterMidnight) await store.set(ctrKey(userId, 'post_midnight'), true);
  if (friday13) await store.set(ctrKey(userId, 'friday_13'), true);
  return evaluateAchievements(userId);
};

/** Call after a DM is replied to. */
export const onDmReplied = async (userId) => {
  await recordActiveDay(userId);
  await incrementCounter(userId, 'dms');
  return evaluateAchievements(userId);
};

/** Call after a workflow is executed. */
export const onWorkflowExecuted = async (userId) => {
  await recordActiveDay(userId);
  await incrementCounter(userId, 'workflows');
  return evaluateAchievements(userId);
};

/** Call after a goal is completed. */
export const onGoalCompleted = async (userId) => {
  await recordActiveDay(userId);
  await incrementCounter(userId, 'goals');
  return evaluateAchievements(userId);
};

/** Call after a boost is applied. */
export const onBoostApplied = async (userId) => {
  await incrementCounter(userId, 'boosts');
  return evaluateAchievements(userId);
};

/** Call on login to track active day and check for streak/comeback. */
export const onUserLogin = async (userId, lastActiveAt) => {
  const prev = lastActiveAt ? new Date(lastActiveAt) : null;
  const now = new Date();
  const days = await recordActiveDay(userId);
  // Comeback: 30+ days of inactivity
  if (prev && (now - prev) > 30 * 86400000 && days.length > 1) {
    await store.set(ctrKey(userId, 'comeback'), true);
  }
  return evaluateAchievements(userId);
};

/** Update per-user metric snapshot (called from analytics sync). */
export const updateMetricSnapshot = async (userId, platform, data) => {
  await store.set(`feedia:user:${userId}:snapshot:${platform}`, data);
  return evaluateAchievements(userId);
};
