import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const fmtN = (n) => {
  if (typeof n !== 'number') return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
};

/* Header de perfil de la cuenta (TikTok o Instagram según switcher) */
const renderProfileHeader = (plat, p) => {
  if (!p) return '';
  const isTT = plat === 'tiktok';
  const accent = isTT ? 'linear-gradient(135deg,#25F4EE,#FE2C55)' : 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)';
  const stats = isTT
    ? [
        ['Siguiendo', p.following],
        ['Seguidores', p.followers],
        ['Me gusta', p.likes],
      ]
    : [
        ['Publicaciones', p.posts],
        ['Seguidores', p.followers],
        ['Siguiendo', p.following],
      ];
  return `
    <div class="profile-header card" style="display:flex;gap:16px;align-items:center;padding:16px;margin-bottom:14px;border-top:3px solid transparent;background-image:linear-gradient(var(--bg-card,#ffffff),var(--bg-card,#ffffff)),${accent};background-origin:border-box;background-clip:padding-box,border-box;color:var(--text-primary,var(--fg,#fff));">
      <img src="${escape(p.avatar || 'https://placehold.co/96')}" alt="pfp" style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border);" onerror="this.src='https://placehold.co/96'">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <strong style="font-size:17px;">${escape(p.name || 'Cuenta')}</strong>
          <span class="tag tiny ${isTT ? '' : 'accent'}">${isTT ? '🎵 TikTok' : '📷 Instagram'}</span>
        </div>
        <div class="small muted">@${escape(p.handle || 'cuenta')}</div>
        <div class="meta" style="gap:16px;margin-top:8px;">
          ${stats.map(([l, v]) => `<span class="small"><strong>${fmtN(v)}</strong> <span class="muted">${l}</span></span>`).join('')}
        </div>
        ${p.bio ? `<div class="small" style="margin-top:6px;line-height:1.4;">${escape(p.bio)}</div>` : ''}
        ${p.real === false ? `<a href="/api/auth/${isTT ? 'tiktok' : 'instagram'}/login" class="btn tiny" style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;background:${isTT ? '#FE2C55' : '#C13584'};color:#fff;border:0;border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:700;">🔗 Conectar ${isTT ? 'TikTok' : 'Instagram'} (datos reales)</a>` : `<span class="tag tiny ok" style="margin-top:10px;display:inline-block;">✓ Conectado</span>`}
      </div>
    </div>`;
};

const KPI_ICONS = {
  followers: '👥',
  reach: '📡',
  engagement: '❤️',
  saves: '🔖',
  shares: '↗️',
  impressions: '👁',
};

const renderStoriesBar = (stories = [], plat = 'instagram') => {
  if (plat === 'tiktok') return ''; // TikTok API no expone Stories — no mostrar la barra
  if (!stories.length) {
    return `<div class="stories-bar">
      <div class="story-add-btn" id="new-story-btn">
        <div class="story-add-icon">+</div>
        <div class="tiny">Tu historia</div>
      </div>
      <div class="muted small" style="align-self:center;margin-left:12px;">Sin historias · conectá Instagram para verlas</div>
    </div>`;
  }
  return `
    <div class="stories-bar">
      <div class="story-add-btn" id="new-story-btn">
        <div class="story-add-icon">+</div>
        <div class="tiny">Nueva</div>
      </div>
      ${stories
        .map(
          (s) => `
        <div class="story-bubble ${s.visto ? 'seen' : 'unseen'}">
          <div class="story-ring">
            <div class="story-avatar-inner">${escape((s.nombre ?? '?').charAt(0).toUpperCase())}</div>
          </div>
          <div class="tiny">${escape(s.nombre ?? '')}</div>
        </div>`,
        )
        .join('')}
    </div>`;
};

const renderKpiCard = (key, val, delta) => {
  const icon = KPI_ICONS[key] ?? '📊';
  const up = delta >= 0;
  return `
    <div class="kpi-card">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-value">${fmt.num(val)}</div>
      <div class="kpi-label">${escape(key)}</div>
      <div class="kpi-delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(delta)}%</div>
    </div>`;
};

const renderActivityFeed = (items = []) => {
  if (!items.length) return `<div class="empty">Sin actividad reciente registrada.</div>`;
  return items
    .map(
      (item) => `
    <div class="activity-item">
      <div class="activity-icon">${item.icon ?? '📌'}</div>
      <div class="activity-body">
        <div class="small">${escape(item.titulo)}</div>
        <div class="tiny muted">${fmt.rel(item.fecha)}</div>
      </div>
      ${item.badge ? `<span class="tag ${item.badgeKind ?? 'info'}">${escape(item.badge)}</span>` : ''}
    </div>`,
    )
    .join('');
};

const renderUpcoming = (jobs = []) => {
  if (!jobs.length) return `<div class="empty">Sin publicaciones programadas próximamente.</div>`;
  return jobs
    .map(
      (j) => `
    <div class="upcoming-item">
      <div class="upcoming-type tag">${escape(j.tipo ?? 'post')}</div>
      <div class="upcoming-info">
        <div class="small">${escape(j.titulo ?? 'Sin título')}</div>
        <div class="tiny muted">${fmt.date(j.scheduledFor)}</div>
      </div>
      <span class="tag ${j.status === 'pendiente' ? 'warn' : 'ok'}">${escape(j.status ?? 'pendiente')}</span>
    </div>`,
    )
    .join('');
};

const FORMAT_BADGE = {
  reel: { emoji: '🎬', label: 'Reel' },
  'reel-faceless': { emoji: '🎬', label: 'Reel' },
  carrusel: { emoji: '🗂️', label: 'Carrusel' },
  'post-imagen': { emoji: '🖼️', label: 'Post' },
  historia: { emoji: '📸', label: 'Story' },
  live: { emoji: '🔴', label: 'Live' },
};

const renderInstagramGridCell = (p) => {
  const badge = FORMAT_BADGE[p.format] ?? { emoji: '📌', label: p.format };
  const grad = p.isTopPerformer
    ? 'linear-gradient(135deg,#3FB8C9,#E85A2C)'
    : 'linear-gradient(135deg,rgba(63,184,201,0.18),rgba(232,90,44,0.18))';
  const hookSafe = escape((p.hook ?? '').slice(0, 80));
  return `
    <div class="ig-cell" data-post="${escape(p.id)}" style="
      position:relative;aspect-ratio:1;border-radius:6px;overflow:hidden;
      background:${grad};
      cursor:pointer;display:flex;align-items:flex-end;padding:8px;
      transition:transform 0.15s;
    ">
      <div style="position:absolute;top:6px;right:6px;font-size:11px;background:rgba(0,0,0,0.55);color:white;padding:2px 6px;border-radius:4px;">${badge.emoji}</div>
      ${p.isTopPerformer ? '<div style="position:absolute;top:6px;left:6px;font-size:11px;background:rgba(245,158,11,0.9);color:#000;padding:2px 6px;border-radius:4px;font-weight:700;">★ TOP</div>' : ''}
      <div style="position:relative;z-index:1;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.6);">
        <div style="font-size:11px;font-weight:600;line-height:1.25;">${hookSafe}${(p.hook ?? '').length > 80 ? '…' : ''}</div>
        <div style="font-size:10px;opacity:0.85;margin-top:3px;">
          ❤️ ${fmt.num(p.metrics?.likes ?? 0)} · 💬 ${fmt.num(p.metrics?.comments ?? 0)} · 🔖 ${fmt.num(p.metrics?.saves ?? 0)}
        </div>
      </div>
    </div>`;
};

const renderInstagramGrid = (data, plat = 'instagram') => {
  if (!data || !data.posts || data.posts.length === 0) {
    const isTT = plat === 'tiktok';
    return `
      <div class="ig-grid-empty card" style="text-align:center;padding:30px;">
        <div style="font-size:48px;opacity:0.4;">${isTT ? '🎵' : '📷'}</div>
        <h3 style="margin:10px 0 6px;">Sin ${isTT ? 'videos' : 'posts'} registrados</h3>
        <p class="small muted">${
          isTT
            ? 'Conectá TikTok en Configuración para sincronizar tus videos y métricas.'
            : 'Conectá Instagram en Configuración o publicá desde los studios para ver tu feed real.'
        }</p>
      </div>`;
  }
  return `
    <div class="card" style="padding:14px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(45deg,#f09433,#dc2743,#bc1888);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;">${escape((data.brand?.name ?? '?').charAt(0).toUpperCase())}</div>
        <div>
          <div style="font-weight:600;">@${escape(data.brand?.name ?? 'tu cuenta')}</div>
          <div class="small muted">${escape(data.brand?.niche ?? '')} · ${data.totalShown} posts en tu grid</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="ig-filter-btn tab-btn active" data-filter="">Todos</button>
          <button class="ig-filter-btn tab-btn" data-filter="reel">Reels</button>
          <button class="ig-filter-btn tab-btn" data-filter="carrusel">Carruseles</button>
          <button class="ig-filter-btn tab-btn" data-filter="post-imagen">Posts</button>
        </div>
      </div>
      <div class="ig-grid" id="ig-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
        ${data.posts.map(renderInstagramGridCell).join('')}
      </div>
    </div>`;
};

const renderDigestCard = (digest) => {
  if (!digest) return '';
  return `
    <div class="card digest-card" style="margin-bottom:20px;">
      <div class="meta" style="margin-bottom:8px;">
        <span class="tag accent">Digest IA</span>
        <span class="tiny muted">${fmt.date(digest.generadoEn)}</span>
      </div>
      <div class="body">${escape(digest.resumenEjecutivo ?? 'Sin resumen disponible.')}</div>
      ${
        digest.prioridades?.length
          ? `
        <div class="divider"></div>
        <div class="small muted" style="margin-bottom:6px;">Prioridades del día</div>
        <ul style="margin:0;padding-left:18px;">
          ${digest.prioridades.map((p) => `<li class="small">${escape(p)}</li>`).join('')}
        </ul>`
          : ''
      }
    </div>`;
};

export const renderFeed = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Feed</h1>
        <p class="view-subtitle page-subtitle">Resumen de hoy, KPIs y actividad reciente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="refresh-btn">↻ Actualizar</button>
      </div>
    </header>
    <div class="page-body"><div class="page-loading"><span class="spinner"></span> cargando feed…</div></div>`;

  let plat = 'instagram';
  try {
    const { getPlatform } = await import('../lib/platform.js');
    plat = getPlatform() === 'tiktok' ? 'tiktok' : 'instagram';
  } catch {
    /* noop */
  }

  const load = async () => {
    try {
      const profRes = await apiSafe(`/api/${plat}/profile`, null);
      const profile = profRes.data;
      const [digestRes, schedulerRes, memRes, gridRes] = await Promise.allSettled([
        api('/api/digest'),
        api('/api/scheduler/jobs'),
        api('/api/memory'),
        api('/api/feed/grid?limit=36'),
      ]);

      const digest = digestRes.status === 'fulfilled' ? digestRes.value : null;
      const jobs = schedulerRes.status === 'fulfilled' ? (schedulerRes.value.jobs ?? []) : [];
      const mem = memRes.status === 'fulfilled' ? memRes.value : null;
      const gridData = gridRes.status === 'fulfilled' ? gridRes.value : null;

      const kpis = mem?.kpis ?? {};
      const kpiKeys = Object.keys(kpis).filter((k) => typeof kpis[k]?.value === 'number');
      const activity = mem?.recentActivity ?? [];
      const stories = mem?.storiesHoy ?? [];
      const upcoming = jobs.filter((j) => j.status === 'pendiente').slice(0, 5);

      root.innerHTML = `
        <header class="view-header page-header">
          <div>
            <h1 class="view-title page-title">Feed</h1>
            <p class="view-subtitle page-subtitle">Resumen de hoy — ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div class="page-actions">
            <button class="btn ghost" id="refresh-btn">↻ Actualizar</button>
          </div>
        </header>
        <div class="page-body">
          ${renderProfileHeader(plat, profile)}

          ${plat === 'tiktok' && profile?.real ? '<div id="tt-videos" class="card" style="margin-bottom:14px;"><div class="small muted"><span class="spinner"></span> cargando tus videos de TikTok…</div></div>' : ''}

          ${renderDigestCard(digest)}

          ${renderStoriesBar(stories, plat)}

          ${renderInstagramGrid(gridData, plat)}

          ${
            kpiKeys.length
              ? `
            <div class="kpi-grid">
              ${kpiKeys.map((k) => renderKpiCard(k, kpis[k].value, kpis[k].delta ?? 0)).join('')}
            </div>`
              : `
            <div class="kpi-grid-empty card muted small" style="text-align:center;padding:20px;">
              Sin KPIs registrados aún. Conectá ${plat === 'tiktok' ? 'TikTok' : 'Instagram'} en Configuración para ver métricas reales.
            </div>`
          }

          <div class="feed-cols">
            <div class="feed-col">
              <div class="col-header"><h3>📅 Próximas publicaciones</h3></div>
              <div class="card" style="padding:0;">
                <div class="list-inner">${renderUpcoming(upcoming)}</div>
              </div>
            </div>
            <div class="feed-col">
              <div class="col-header"><h3>⚡ Actividad reciente</h3></div>
              <div class="card" style="padding:0;">
                <div class="list-inner">${renderActivityFeed(activity)}</div>
              </div>
            </div>
          </div>
        </div>`;

      // TikTok: videos del usuario (demuestra el scope video.list)
      const ttBox = root.querySelector('#tt-videos');
      if (ttBox) {
        (async () => {
          const { data: snap } = await apiSafe('/api/insights/tiktok', null);
          const vids = snap?.videos ?? [];
          if (!vids.length) {
            ttBox.innerHTML = '<div class="small muted">Sin videos para mostrar.</div>';
            return;
          }
          ttBox.innerHTML = `<div class="row spread" style="margin-bottom:10px;"><h3 style="margin:0;">🎵 Tus videos de TikTok</h3><span class="tag tiny ok">video.list</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">
              ${vids
                .map(
                  (v) => `<div class="card" style="padding:10px;">
                <div class="small" style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escape(v.title || 'Video')}</div>
                <div class="meta" style="gap:10px;margin-top:6px;font-size:11px;">
                  <span>👁 ${fmtN(v.view_count ?? 0)}</span><span>❤️ ${fmtN(v.like_count ?? 0)}</span>
                  <span>💬 ${fmtN(v.comment_count ?? 0)}</span><span>↗ ${fmtN(v.share_count ?? 0)}</span>
                </div></div>`,
                )
                .join('')}
            </div>`;
        })();
      }

      root.querySelector('#refresh-btn')?.addEventListener('click', () => {
        root.innerHTML = `<div class="page-loading"><span class="spinner"></span> actualizando…</div>`;
        load();
      });
      root.querySelector('#new-story-btn')?.addEventListener('click', () => {
        location.hash = 'studio-stories';
      });

      // IG grid filter
      root.querySelectorAll('.ig-filter-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const f = btn.dataset.filter;
          root.querySelectorAll('.ig-filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
          const grid = root.querySelector('#ig-grid');
          if (!grid) return;
          grid.innerHTML = '<div class="page-loading"><span class="spinner"></span></div>';
          try {
            const data = await api(`/api/feed/grid?limit=36${f ? `&format=${encodeURIComponent(f)}` : ''}`);
            grid.innerHTML =
              (data?.posts ?? []).map(renderInstagramGridCell).join('') ||
              '<div class="muted small" style="grid-column:1/-1;text-align:center;padding:20px;">Sin posts con ese filtro</div>';
          } catch (err) {
            grid.innerHTML = `<div class="alert crit" style="grid-column:1/-1;">${escape(err.message)}</div>`;
          }
        });
      });

      // IG grid: click en celda → ver detalle (toast con métricas por ahora)
      root.querySelectorAll('.ig-cell').forEach((cell) => {
        cell.addEventListener('click', () => {
          const id = cell.dataset.post;
          const post = (gridData?.posts ?? []).find((p) => p.id === id);
          if (!post) return;
          toast(
            `📊 ${post.format} · ${post.metrics.likes} likes · ${post.metrics.reach.toLocaleString('es-AR')} alcance · ER ${post.metrics.engagementRate.toFixed(2)}%`,
            'info',
          );
        });
      });
    } catch (err) {
      root.innerHTML = `<div class="alert crit">Error cargando feed: ${escape(err.message)}</div>`;
      toast(err.message, 'crit');
    }
  };

  await load();
};
