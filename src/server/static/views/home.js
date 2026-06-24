/* ══════════════════════════════════════════════════════════════════════════════
   HOME — Bienvenido a casa, [nombre] · KPIs reales por período (7d/30d/90d/365d)
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';

let activePeriod = 7;
let cachedIdentity = null;
let cachedDashboard = null;
let cachedBrand = null;

/* Devuelve el mejor nombre disponible para el saludo. Prioriza:
   1. Nombre de la marca/empresa (Brand Board · ej "Paithon Labs")
   2. Nombre de la cuenta de Instagram (@handle)
   3. Display name del backend
   4. Apodo del owner (cómo querés que te llame)
   5. Nombre del sistema (Talía, FeedIA…)
   6. Fallback: "tu cuenta"
   También sanea espacios y devuelve la primera letra capitalizada cuando aplica. */
const getBestDisplayName = (identity) => {
  // 1) Brand Board (Personalización avanzada — Brand Board)
  try {
    const local = JSON.parse(localStorage.getItem('feedia.brand') ?? 'null');
    if (local?.name && local.name.trim() && local.name.trim().toLowerCase() !== 'mi marca') {
      return local.name.trim();
    }
  } catch {
    /* noop */
  }

  // 2) Backend brand cache (moodboard)
  if (cachedBrand?.name && cachedBrand.name.trim().toLowerCase() !== 'mi marca') {
    return cachedBrand.name.trim();
  }

  // 3) Identity desde /api/home/identity
  if (identity) {
    if (identity.brandName && identity.brandName.trim()) return identity.brandName.trim();
    if (identity.instagramName && identity.instagramName.trim()) {
      const ig = identity.instagramName.trim();
      return ig.startsWith('@') ? ig : `@${ig}`;
    }
    if (identity.displayName && identity.displayName.trim() && identity.displayName.trim() !== 'tu cuenta') {
      return identity.displayName.trim();
    }
    if (identity.ownerNickname && identity.ownerNickname.trim()) return identity.ownerNickname.trim();
    if (identity.systemName && identity.systemName.trim()) return identity.systemName.trim();
  }

  // 4) Personalización local (cómo te llamás vos al sistema)
  try {
    const pers = JSON.parse(localStorage.getItem('feedia.personalization') ?? 'null');
    if (pers?.ownerNickname && pers.ownerNickname.trim()) return pers.ownerNickname.trim();
    if (pers?.systemName && pers.systemName.trim()) return pers.systemName.trim();
  } catch {
    /* noop */
  }

  return 'tu cuenta';
};

const PERIOD_LABELS = { 7: '7 días', 30: '30 días', 90: '90 días', 365: '1 año' };

const fmtNumber = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const renderKpiCard = (k) => `
  <div class="card stat-card" style="border-left:3px solid var(--accent, #3FB8C9);position:relative;">
    <div class="stat-label">${escape(k.label)}${k.tooltip ? `<span class="kpi-info" title="${escape(k.tooltip)}" style="cursor:help;margin-left:6px;opacity:0.55;">ⓘ</span>` : ''}</div>
    <div class="stat-value">${escape(String(k.value))}</div>
    ${k.delta ? `<div class="small ${k.direction === 'up' ? 'ok' : k.direction === 'down' ? 'crit' : 'muted'}">${escape(k.delta)}</div>` : ''}
    <div class="small muted" style="margin-top:4px;">${escape(k.context ?? '')}</div>
  </div>`;

const buildKpisFromData = (kpisData) => {
  if (!kpisData) {
    return [
      {
        label: 'Seguidores',
        value: '—',
        delta: '',
        direction: 'flat',
        context: 'Conectá Meta API para ver datos reales',
      },
      { label: 'Alcance', value: '—', delta: '', direction: 'flat', context: 'Sincronizá métricas' },
      { label: 'Engagement Rate', value: '—', delta: '', direction: 'flat', context: 'Pendiente de datos' },
      {
        label: 'Velocidad',
        tooltip: 'Seguidores nuevos por día promedio en el período',
        value: '—',
        delta: '',
        direction: 'flat',
        context: 'Sin baseline aún',
      },
    ];
  }
  const { followers, reach, engagementRate, velocity, periodDays, hasRealData } = kpisData;
  const periodLabel = PERIOD_LABELS[periodDays] ?? `${periodDays}d`;
  return [
    {
      label: 'Seguidores',
      value: fmtNumber(followers.current),
      delta:
        followers.delta !== 0
          ? `${followers.delta > 0 ? '+' : ''}${followers.delta} (${followers.deltaPct > 0 ? '+' : ''}${followers.deltaPct}%)`
          : '',
      direction: followers.direction,
      context: hasRealData ? `cambio en ${periodLabel}` : 'sin datos suficientes',
    },
    {
      label: `Alcance ${periodLabel}`,
      value: fmtNumber(reach.total),
      delta: reach.deltaPct !== 0 ? `${reach.deltaPct > 0 ? '+' : ''}${reach.deltaPct}% vs período anterior` : '',
      direction: reach.direction,
      context: hasRealData ? 'personas únicas alcanzadas' : 'sin datos suficientes',
    },
    {
      label: 'Engagement Rate',
      value: hasRealData ? `${engagementRate.value}%` : '—',
      delta: '',
      direction: 'flat',
      context: 'promedio del período · (likes+comments+saves)/reach',
    },
    {
      label: 'Velocidad',
      tooltip: velocity.description,
      value: hasRealData ? `${velocity.value} ${velocity.unit}` : '—',
      delta: '',
      direction: velocity.direction,
      context: 'seguidores nuevos por día (promedio)',
    },
  ];
};

const buildHomeHTML = (identity, dashboard, kpisData, isOffline) => {
  const displayName = getBestDisplayName(identity);
  const greeting = `Bienvenido a casa, ${displayName}`;
  const mascotEmoji = dashboard?.mascotEmoji ?? '✨';
  const themePrimary = dashboard?.themeColors?.primary ?? '#3FB8C9';
  const themeSecondary = dashboard?.themeColors?.secondary ?? '#E85A2C';

  return `
    <div class="home-greeting" style="padding:16px 20px;background:linear-gradient(135deg,${themePrimary} 0%,${themeSecondary} 100%);border-radius:16px;color:white;margin-bottom:8px;">
      <div style="display:flex;gap:14px;align-items:center;">
        <div style="font-size:40px;line-height:1;flex-shrink:0;">${escape(mascotEmoji)}</div>
        <div style="flex:1;min-width:0;">
          <h1 style="margin:0;font-size:22px;line-height:1.15;">${escape(greeting)}</h1>
          ${dashboard?.timeBasedMessage ? `<p style="margin:3px 0 0;opacity:0.92;font-size:13px;">${escape(dashboard.timeBasedMessage)}</p>` : `<p style="margin:3px 0 0;opacity:0.85;font-size:13px;">${escape(identity?.niche ?? cachedBrand?.niche ?? 'Tu casa de Instagram')}</p>`}
        </div>
        ${isOffline ? '<div style="font-size:11px;opacity:0.7;background:rgba(0,0,0,0.2);padding:4px 10px;border-radius:20px;">📡 offline</div>' : ''}
      </div>
      ${dashboard?.delightMessage ? `<p style="margin:10px 0 0;font-style:italic;font-size:13.5px;opacity:0.92;">"${escape(dashboard.delightMessage)}"</p>` : ''}
    </div>

    <!-- Banner de conexión IG/TT -->
    <div id="home-connections-banner" style="margin-bottom:4px;"></div>

    <!-- Widget de uso del plan -->
    <div id="home-usage-widget" style="margin-bottom:4px;"></div>

    <!-- 2 columnas: KPIs (período + métricas) a la izquierda, Tablero a la derecha -->
    <div class="home-split">
      <div class="home-split-left">
        <div class="home-period-bar" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <span class="small muted">Período:</span>
          ${[7, 30, 90, 365]
            .map(
              (p) => `
            <button class="tab-btn ${activePeriod === p ? 'active' : ''}" data-period="${p}">${PERIOD_LABELS[p]}</button>
          `,
            )
            .join('')}
        </div>
        <div class="stats-grid" id="home-kpis-grid">
          ${buildKpisFromData(kpisData).map(renderKpiCard).join('')}
        </div>
      </div>
      <section class="home-embed-section home-split-right" style="margin-top:0;">
        <h2 style="font-size:16px;margin:0 0 10px;display:flex;align-items:center;gap:8px;">📋 Tablero</h2>
        <div id="home-embed-kanban" class="home-embed-host"><div class="loading-screen"><span class="spinner lg"></span></div></div>
      </section>
    </div>

    <style>
      .home-split{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;margin-bottom:24px;}
      .home-split .stats-grid{margin-bottom:0;}
      .home-split-right{max-height:560px;overflow:auto;}
      @media (max-width: 980px){ .home-split{grid-template-columns:1fr;} .home-split-right{max-height:none;} }
    </style>

    ${
      (dashboard?.activeCelebrations ?? []).length
        ? `
      <div class="card accent-border" style="margin-bottom:20px;">
        <h3>🎉 Celebraciones activas</h3>
        ${(dashboard.activeCelebrations ?? [])
          .map(
            (c) => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border);">
            <strong>${escape(c.title)}</strong>
            <p class="small muted" style="margin:4px 0;">${escape(c.message)}</p>
            <button class="btn small" data-ack="${escape(c.id)}">✓ Vi esto</button>
          </div>`,
          )
          .join('')}
      </div>`
        : ''
    }

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;">
      ${
        (
          dashboard?.todayActions ?? [
            'Conectá tu cuenta de Instagram',
            'Definí tu meta del mes',
            'Hacé la entrevista de marca',
          ]
        ).length
          ? `
        <div class="card">
          <h3>📋 Hoy</h3>
          <ul style="margin:8px 0 0;padding-left:20px;">
            ${(dashboard?.todayActions ?? ['Conectá tu cuenta de Instagram en Settings → Cuentas', 'Definí tu meta del mes', 'Hacé la entrevista de marca para personalizar']).map((a) => `<li>${escape(a)}</li>`).join('')}
          </ul>
        </div>`
          : ''
      }

      ${
        dashboard?.recentMemory
          ? `
        <div class="card" style="background:linear-gradient(135deg,#FBE7C6 0%,#FFD6A5 100%);color:#1A1A1A;">
          <div class="small" style="opacity:0.7;text-transform:uppercase;letter-spacing:1px;">📖 Recuerdo del día</div>
          <h3 style="margin:6px 0;">${escape(dashboard.recentMemory.title)}</h3>
          <p style="font-style:italic;">${escape(dashboard.recentMemory.story ?? dashboard.recentMemory.description ?? '')}</p>
        </div>`
          : ''
      }

      ${
        (dashboard?.unacknowledgedAchievements ?? []).length
          ? `
        <div class="card">
          <h3>🏆 Trofeos sin ver</h3>
          ${(dashboard.unacknowledgedAchievements ?? [])
            .slice(0, 3)
            .map(
              (a) => `
            <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);align-items:center;">
              <div style="font-size:28px;">${escape(a.emoji)}</div>
              <div style="flex:1;">
                <strong>${escape(a.name)}</strong>
                <div class="small muted">${escape(a.description)}</div>
              </div>
              <button class="btn tiny" data-ack-ach="${escape(a.id)}">✓</button>
            </div>`,
            )
            .join('')}
          <a href="#achievements" class="small">Ver todos los logros →</a>
        </div>`
          : ''
      }

      ${
        dashboard?.upcomingMilestone
          ? `
        <div class="card">
          <h3>🎯 Próximo hito</h3>
          <p>${escape(dashboard.upcomingMilestone.description)}</p>
          ${dashboard.upcomingMilestone.daysAway != null ? `<div class="small accent">~ ${dashboard.upcomingMilestone.daysAway} días</div>` : ''}
        </div>`
          : ''
      }

      ${
        (dashboard?.activeGoals ?? []).length
          ? `
        <div class="card">
          <h3>🚀 Metas activas</h3>
          ${(dashboard.activeGoals ?? [])
            .slice(0, 3)
            .map(
              (g) => `
            <div style="padding:8px 0;border-bottom:1px solid var(--border);">
              <strong>${escape(g.title)}</strong>
              <div class="small muted">${escape(g.horizon)} · ${g.progress}%</div>
              <div class="progress-bar" style="height:4px;background:var(--bg-card-2);border-radius:2px;overflow:hidden;margin-top:4px;">
                <div style="height:100%;width:${g.progress}%;background:var(--accent);"></div>
              </div>
            </div>`,
            )
            .join('')}
        </div>`
          : ''
      }

      <div class="card accent-border">
        <h3>💡 Sugerencias para vos</h3>
        <ul style="margin:8px 0 0;padding-left:20px;">
          ${(
            dashboard?.suggestionsForNow ?? [
              'Conectá tu cuenta de Instagram en Settings → Cuentas',
              'Completá la entrevista de marca para personalizar tu sistema',
              'Definí tu meta del mes para que el sistema sepa hacia dónde apuntar',
            ]
          )
            .map((s) => `<li>${escape(s)}</li>`)
            .join('')}
        </ul>
      </div>
    </div>

    ${
      dashboard?.privateMessage
        ? `
      <div class="card" style="margin-top:20px;padding:18px;background:var(--bg-card-2);border-left:3px solid var(--accent);">
        <div class="small muted">Nota privada</div>
        <p style="margin:6px 0 0;font-style:italic;">${escape(dashboard.privateMessage)}</p>
      </div>`
        : ''
    }

    <!-- Aprobaciones embebido (Tablero ya vive arriba, al lado de los KPIs) -->
    <section class="home-embed-section" style="margin-top:24px;">
      <h2 style="font-size:16px;margin:0 0 10px;display:flex;align-items:center;gap:8px;">✅ Aprobaciones</h2>
      <div id="home-embed-approvals" class="home-embed-host"><div class="loading-screen"><span class="spinner lg"></span></div></div>
    </section>
    <style>
      .home-embed-section{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:14px;padding:16px;}
      .home-embed-host > .view-header,.home-embed-host .page-header{display:none;}
      .home-embed-host .page-body{padding:0;}
    </style>
  `;
};

let _embedMod = null;
const embedHomeSections = async (container) => {
  const kHost = container.querySelector('#home-embed-kanban');
  const aHost = container.querySelector('#home-embed-approvals');
  if (!kHost || !aHost) return;
  try {
    if (!_embedMod) _embedMod = await import('./workspace.js');
    await Promise.all([
      typeof _embedMod.renderKanban === 'function' ? _embedMod.renderKanban(kHost) : Promise.resolve(),
      typeof _embedMod.renderApprovals === 'function' ? _embedMod.renderApprovals(aHost) : Promise.resolve(),
    ]);
  } catch (err) {
    kHost.innerHTML = `<div class="alert crit small">No se pudo cargar Tablero: ${escape(err.message)}</div>`;
    aHost.innerHTML = `<div class="alert crit small">No se pudo cargar Aprobaciones: ${escape(err.message)}</div>`;
  }
};

const wireEvents = (container) => {
  // Period selector
  container.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newPeriod = Number(btn.dataset.period);
      if (newPeriod === activePeriod) return;
      activePeriod = newPeriod;
      container
        .querySelectorAll('[data-period]')
        .forEach((b) => b.classList.toggle('active', Number(b.dataset.period) === activePeriod));
      const grid = container.querySelector('#home-kpis-grid');
      if (grid) grid.innerHTML = buildKpisFromData(null).map(renderKpiCard).join('');
      const { data } = await apiSafe(`/api/home/kpis?period=${activePeriod}`);
      if (grid && data) grid.innerHTML = buildKpisFromData(data).map(renderKpiCard).join('');
    });
  });

  container.querySelectorAll('[data-ack]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { error } = await apiSafe(`/api/celebrations/${btn.dataset.ack}/ack`, null, { method: 'POST', body: {} });
      if (!error) btn.closest('div').style.opacity = '0.5';
    });
  });
  container.querySelectorAll('[data-ack-ach]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { error } = await apiSafe(`/api/achievements/${btn.dataset.ackAch}/ack`, null, {
        method: 'POST',
        body: {},
      });
      if (!error) btn.closest('div').style.opacity = '0.5';
    });
  });
};

const renderConnectionsBanner = async (container) => {
  const host = container.querySelector('#home-connections-banner');
  if (!host) return;
  const { data, error } = await apiSafe('/api/auth/connections', null);
  if (error || !Array.isArray(data)) {
    host.innerHTML = '';
    return;
  }
  const conns = Object.fromEntries(data.map((c) => [c.platform, c]));
  const ig = conns.instagram || { connected: false };
  const tt = conns.tiktok || { connected: false };
  if (ig.connected && tt.connected) {
    host.innerHTML = '';
    return;
  }

  const card = (platform, c, accent, emoji, label) =>
    c.connected
      ? `<div class="conn-pill ok"><span>${emoji}</span><strong>${label}</strong><span class="tiny muted">conectado${c.handle ? ` @${escape(c.handle)}` : ''}</span></div>`
      : `<a class="conn-pill cta" href="/api/auth/${platform}/login" style="background:${accent};">
         <span style="font-size:18px;">${emoji}</span>
         <strong>Conectá tu ${label}</strong>
         <span class="tiny" style="opacity:.85;">datos reales en 1 click</span>
       </a>`;

  host.innerHTML = `
    <div class="conn-banner">
      <div class="conn-banner-title">
        <span style="font-size:18px;">🔗</span>
        <strong>Conectá tus cuentas para datos reales</strong>
        <span class="tiny muted">Sin conexión, FeedIA muestra estado vacío.</span>
      </div>
      <div class="conn-banner-grid">
        ${card('instagram', ig, 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)', '📷', 'Instagram')}
        ${card('tiktok', tt, 'linear-gradient(135deg,#25F4EE,#000,#FE2C55)', '🎵', 'TikTok')}
      </div>
    </div>
    <style>
      .conn-banner{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;}
      .conn-banner-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--text-primary,var(--fg));}
      .conn-banner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;}
      .conn-pill{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;text-decoration:none;color:#fff;font-weight:700;font-size:14px;transition:filter .15s,transform .12s;border:0;}
      .conn-pill.cta:hover{filter:brightness(1.08);transform:translateY(-1px);}
      .conn-pill.ok{background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.35);color:var(--text-primary,var(--fg));}
      .conn-pill .tiny{font-size:11px;font-weight:500;opacity:.85;}
      html[data-theme="light"] .conn-pill.ok{background:rgba(16,185,129,.08);}
    </style>`;
};

const renderUsageWidget = async (container) => {
  const host = container.querySelector('#home-usage-widget');
  if (!host) return;
  const { data } = await apiSafe('/api/usage/summary', null);
  if (!data || !data.plan) {
    host.innerHTML = '';
    return;
  }
  const bar = (label, used, limit, pct, unit = '') => {
    const safePct = Math.min(100, Math.max(0, Number(pct) || 0));
    const color = safePct >= 90 ? '#ef4444' : safePct >= 70 ? '#f59e0b' : '#10b981';
    return `
      <div class="uw-row">
        <div class="uw-row-head"><span>${escape(label)}</span><strong>${used}${unit} <span class="uw-muted">/ ${limit === -1 ? '∞' : `${limit}${unit}`}</span></strong></div>
        <div class="uw-bar"><div class="uw-bar-fill" style="width:${safePct}%;background:${color};"></div></div>
      </div>`;
  };
  const planBadge =
    data.plan === 'agency'
      ? '👑 Agency'
      : data.plan === 'pro'
        ? '🚀 Pro'
        : data.plan === 'starter'
          ? '⚡ Starter'
          : '🆓 Free';
  const upgradeCta =
    data.plan !== 'agency'
      ? `<a class="uw-upgrade" href="/pricing.html">${data.plan === 'free' ? 'Upgrade' : 'Ver planes'} →</a>`
      : '';
  host.innerHTML = `
    <div class="uw-card">
      <div class="uw-head">
        <div><strong>Tu uso este mes</strong> · <span class="uw-plan">${planBadge}</span></div>
        ${upgradeCta}
      </div>
      <div class="uw-grid">
        ${bar('Publicaciones', data.posts.used, data.posts.limit, data.posts.pct)}
        ${bar('Calls IA', data.aiCalls.used, data.aiCalls.limit, data.aiCalls.pct)}
        ${bar('Costo IA', `$${data.aiCostUsd.used}`, `$${data.aiCostUsd.limit}`, data.aiCostUsd.pct)}
        ${bar('Imágenes', data.images.used, data.images.limit, data.images.pct)}
        ${data.cu.limit > 0 ? bar('Computer Use', data.cu.used, data.cu.limit, data.cu.pct, ' min') : ''}
      </div>
    </div>
    <style>
      .uw-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:14px 16px;}
      .uw-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;color:var(--text-primary,var(--fg));}
      .uw-plan{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:linear-gradient(135deg,#e1306c22,#a855f722);color:var(--text-primary,var(--fg));}
      .uw-upgrade{font-size:12.5px;font-weight:700;color:#a855f7;text-decoration:none;padding:6px 12px;border-radius:8px;background:rgba(168,85,247,.08);transition:background .15s;}
      .uw-upgrade:hover{background:rgba(168,85,247,.15);}
      .uw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 16px;}
      .uw-row{font-size:12px;}
      .uw-row-head{display:flex;justify-content:space-between;margin-bottom:4px;color:var(--text-secondary,var(--fg));}
      .uw-row-head strong{font-weight:700;color:var(--text-primary,var(--fg));}
      .uw-muted{opacity:.55;font-weight:500;}
      .uw-bar{height:5px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:99px;overflow:hidden;}
      .uw-bar-fill{height:100%;transition:width .5s ease;}
    </style>`;
};

export const renderHome = async (container) => {
  // 1. Render inmediato con defaults (sin esperar a la red)
  container.innerHTML = buildHomeHTML(null, null, null, false);
  wireEvents(container);
  void embedHomeSections(container);
  void renderConnectionsBanner(container);
  void renderBrandKitBanner(container);
  void renderUsageWidget(container);
  void renderBrandKitBanner(container);

  // 2. Buscar identidad + dashboard + KPIs + brand en paralelo (apiSafe nunca tira)
  const [identityRes, dashboardRes, kpisRes, brandRes] = await Promise.all([
    apiSafe('/api/home/identity', null),
    apiSafe('/api/home/dashboard', null),
    apiSafe(`/api/home/kpis?period=${activePeriod}`, null),
    apiSafe('/api/moodboard', null),
  ]);

  const offline = !!identityRes.error && !!dashboardRes.error && !!kpisRes.error;
  cachedIdentity = identityRes.data ?? cachedIdentity;
  cachedDashboard = dashboardRes.data ?? cachedDashboard;
  cachedBrand = brandRes.data ?? cachedBrand;

  container.innerHTML = buildHomeHTML(cachedIdentity, cachedDashboard, kpisRes.data, offline);
  wireEvents(container);
  void embedHomeSections(container);
  void renderConnectionsBanner(container);
  void renderBrandKitBanner(container);
  void renderUsageWidget(container);
  void renderBrandKitBanner(container);
};

// Banner: si no hay brand kit cargado, invita al onboarding 1 vez
const renderBrandKitBanner = async (container) => {
  // Si usuario ya descartó banner → no mostrar
  try {
    if (localStorage.getItem('feedia.brandkit.dismissed') === '1') return;
  } catch {}
  // Lee profile actual
  let hasKit = false;
  try {
    const handle = JSON.parse(localStorage.getItem('feedia.brujula.account') || '{}').handle || '';
    const r = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', accountId: handle }),
    });
    const j = await r.json();
    const bk = j?.profile?.brandKit || j?.profile;
    hasKit = Boolean(bk?.bgColor || bk?.accentColor || bk?.colors?.length || bk?.photo || bk?.font);
  } catch {}
  if (hasKit) return;
  // Insertar banner al tope del home
  const banner = document.createElement('div');
  banner.style.cssText =
    'margin:14px 16px;padding:10px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(168,85,247,.15),rgba(99,102,241,.08));border:1px solid rgba(168,85,247,.3);display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
  banner.innerHTML = `
    <div style="font-size:32px;">🎨</div>
    <div style="flex:1;min-width:200px;">
      <div style="font-weight:800;color:var(--text-primary,var(--fg));font-size:14px;">Cargá tu Brand Kit 1 vez</div>
      <div style="font-size:12.5px;color:var(--text-secondary,var(--fg-2));margin-top:2px;">Colores + tipografía + foto + nicho. Todas las herramientas leen de ahí. Sin volver a configurar nada nunca.</div>
    </div>
    <a href="#brandkit" style="background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;padding:9px 18px;border-radius:8px;font-weight:800;font-size:12.5px;text-decoration:none;">Configurar →</a>
    <button id="bk-banner-dismiss" style="background:transparent;border:none;color:var(--text-tertiary,var(--fg-3));font-size:18px;cursor:pointer;padding:4px 8px;" title="Descartar">✕</button>`;
  container.prepend(banner);
  banner.querySelector('#bk-banner-dismiss')?.addEventListener('click', () => {
    try {
      localStorage.setItem('feedia.brandkit.dismissed', '1');
    } catch {}
    banner.remove();
  });
};
