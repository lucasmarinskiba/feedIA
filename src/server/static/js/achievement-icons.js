/**
 * Achievement Icons — 60+ SVG minimalistas para todos los logros
 * Optimizados para 40x40px, outline style, rarity-aware
 */

const ACHIEVEMENT_ICONS = {
  // ── CRECIMIENTO ──────────────────────────────────────
  'primeros-100': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="21 8 21 21 3 21"></polyline><polyline points="3 13 6 10 9 13 12 9 15 11 21 5"></polyline></svg>',
  'club-mil': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><text x="12" y="15" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor">1K</text></svg>',
  'cinco-mil': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><text x="12" y="15" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor">5K</text></svg>',
  'diez-mil': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><text x="12" y="15" text-anchor="middle" font-size="6.5" font-weight="bold" fill="currentColor">10K</text></svg>',
  'cien-mil': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="5" font-weight="bold" fill="currentColor">100K</text></svg>',
  'millon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 7v10M8 12h8" stroke="currentColor" stroke-width="1.5"/></svg>',

  // ── ENGAGEMENT ───────────────────────────────────────
  'primer-mil-likes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'engagement-5pct': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2z"/></svg>',
  'engagement-10pct': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13h1.5v8H3zm3-4h1.5v12H6zm3-2h1.5v14H9zm3-3h1.5v17h-1.5z"/></svg>',
  'cien-saves': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  'mil-saves': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1"/><text x="12" y="15" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor">1K</text></svg>',

  // ── CONTENIDO ────────────────────────────────────────
  'primer-post': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  'diez-posts': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>',
  'cien-posts': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor">100</text></svg>',
  'mil-posts': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><text x="12" y="16" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor">1K</text></svg>',
  'stories-diaria': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="2" width="6" height="10" rx="1"/><rect x="10.5" y="2" width="6" height="10" rx="1"/><rect x="18" y="2" width="3" height="10" rx="1"/><path d="M4 16h16"/></svg>',

  // ── COMUNIDAD ────────────────────────────────────────
  'primera-respuesta': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>',
  'cien-respuestas': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><text x="12" y="13" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor">100</text></svg>',
  'primer-embajador': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 20c0-2 2-4 6-4s6 2 6 4"/><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-5-6.5 5 2-7L2 9h7z" fill="currentColor"/></svg>',
  'diez-superfans': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="2.5"/><circle cx="15" cy="7" r="2"/><circle cx="12" cy="15" r="2.5"/><path d="M7 17c-1 1-2 2-3 3"/><path d="M17 17c1 1 2 2 3 3"/></svg>',

  // ── VENTAS ───────────────────────────────────────────
  'primer-lead': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  'primer-cierre': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
  'mil-usd': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m2-6a2 2 0 0 0-4 0m4 4a2 2 0 0 1-4 0"/></svg>',
  'diez-mil-usd': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1v22M17 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/></svg>',
  'boost-master': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/></svg>',

  // ── RITUALES ─────────────────────────────────────────
  'racha-7': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>',
  'racha-30': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  'primer-dia-completo': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  'fundador-mes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5"/></svg>',
  'fundador-año': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="0.75"/></svg>',
  'noche-creativa': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/></svg>',
  'cero-pendientes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',

  // ── AUTOMATIZACIONES ─────────────────────────────────
  'primer-workflow': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><line x1="9" y1="6" x2="15" y2="15"/><line x1="15" y1="6" x2="12" y2="15"/></svg>',
  'cinco-goals': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/><path d="M12 12l-6-6M12 12l6-6M12 12l-6 6M12 12l6 6"/></svg>',
  'goal-completado': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4" stroke="currentColor" stroke-width="1.5"/></svg>',
  'todas-categorias': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="5" height="5"/><rect x="10" y="2" width="5" height="5"/><rect x="18" y="2" width="4" height="5"/><rect x="2" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/><rect x="18" y="10" width="4" height="5"/><rect x="2" y="18" width="5" height="4"/><rect x="10" y="18" width="5" height="4"/><rect x="18" y="18" width="4" height="4"/></svg>',
  'top-performer-uno': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>',
  'top-performer-cinco': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/><text x="12" y="13" text-anchor="middle" font-size="5" font-weight="bold" fill="currentColor">5</text></svg>',
  'comeback': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v10a4 4 0 0 0 4 4h10"/><polyline points="17 7 21 3 17 10"/></svg>',
  'viernes-13': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><text x="12" y="17" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor">13</text></svg>',

  // ── TIKTOK ───────────────────────────────────────────
  'tt-100-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/></svg>',
  'tt-500-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><text x="18" y="14" font-size="5" font-weight="bold" fill="currentColor">500</text></svg>',
  'tt-1k-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><circle cx="18" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  'tt-2.5k-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><text x="17" y="13" font-size="4" font-weight="bold" fill="currentColor">2.5K</text></svg>',
  'tt-5k-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><text x="18" y="13" font-size="4" font-weight="bold" fill="currentColor">5K</text></svg>',
  'tt-10k-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><text x="17" y="13" font-size="3.5" font-weight="bold" fill="currentColor">10K</text></svg>',
  'tt-25k-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><text x="16.5" y="13" font-size="3" font-weight="bold" fill="currentColor">25K</text></svg>',
  'tt-50k-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><text x="16" y="13" font-size="3" font-weight="bold" fill="currentColor">50K</text></svg>',
  'tt-100k-seg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 5.1-1.82V9.4a6.84 6.84 0 0 0-5.1 2.81v-3.34a4.27 4.27 0 0 0-7.7 1.23v10.67h3.51v-5.36a2.88 2.88 0 0 1 5.75.64Z"/><text x="15" y="13" font-size="2.5" font-weight="bold" fill="currentColor">100K</text></svg>',
  'tt-100-likes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'tt-1k-likes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'tt-10k-likes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="0.75"/></svg>',
  'tt-100k-likes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="0.75"/></svg>',
  'tt-1m-likes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1"/></svg>',

  // ── INSTAGRAM ────────────────────────────────────────
  'ig-100-seg': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="6" r="1"/></svg>',
  'ig-1k-seg': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="6" r="1"/><text x="12" y="20" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor">1K</text></svg>',
  'ig-5k-seg': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="6" r="1"/><text x="12" y="20" text-anchor="middle" font-size="5.5" font-weight="bold" fill="currentColor">5K</text></svg>',
  'ig-10k-seg': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="6" r="1"/><text x="12" y="20" text-anchor="middle" font-size="5" font-weight="bold" fill="currentColor">10K</text></svg>',
  'ig-100k-seg': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="6" r="1"/><text x="12" y="20" text-anchor="middle" font-size="4" font-weight="bold" fill="currentColor">100K</text></svg>',
  'ig-100-likes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'ig-1k-likes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'ig-10k-likes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="0.75"/></svg>',
  'ig-100k-likes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="0.75"/></svg>',

  // ── DEFAULT (fallback) ───────────────────────────────
  'default': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
};

export const getAchievementIcon = (achievementId) => {
  return ACHIEVEMENT_ICONS[achievementId] || ACHIEVEMENT_ICONS.default;
};
