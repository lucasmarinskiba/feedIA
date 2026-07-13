/* ══════════════════════════════════════════════════════════════════════════════
   CU TOOLBOX — Recetas Computer Use por tool, gateadas por plan.
   IG/TT/Canva/CapCut/Runway/Pika/Luma/Kling/HeyGen/InVideo/Veed.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const TOOL_GROUPS = {
  social: ['instagram', 'tiktok'],
  design: ['canva'],
  videoEditor: ['capcut', 'invideo', 'veed'],
  videoGen: ['runway', 'pika', 'luma', 'kling', 'heygen'],
};

const GROUP_LABELS = {
  social: '📱 Redes sociales',
  design: '🎨 Diseño',
  videoEditor: '🎞️ Editores de video',
  videoGen: '🎥 Generación IA de video',
};

const PLAN_BADGES = {
  free: { label: 'Free', color: '#6B7280', bg: 'rgba(107,114,128,.15)' },
  starter: { label: 'Starter', color: '#3B82F6', bg: 'rgba(59,130,246,.12)' },
  pro: { label: 'Pro', color: '#A855F7', bg: 'rgba(168,85,247,.12)' },
  gold: { label: 'Gold', color: '#F59E0B', bg: 'rgba(245,158,11,.15)' },
  premium: { label: 'Premium', color: '#EC4899', bg: 'rgba(236,72,153,.15)' },
};

const PLAN_ORDER = ['free', 'starter', 'pro', 'gold', 'premium'];
let activeTool = 'all';
let currentUserPlan = 'free';

const isPlanGte = (userPlan, minPlan) => PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan);

const renderRecipeCard = (recipe) => {
  const badge = PLAN_BADGES[recipe.minPlan] || PLAN_BADGES.free;
  const locked = !isPlanGte(currentUserPlan, recipe.minPlan);
  return `
    <div class="ctb-recipe ${locked ? 'locked' : ''}" data-recipe-id="${escape(recipe.id)}">
      <div class="ctb-recipe-head">
        <div class="ctb-recipe-title">${escape(recipe.label)}</div>
        <span class="ctb-badge" style="background:${badge.bg};color:${badge.color};">${badge.label}+</span>
      </div>
      <div class="ctb-recipe-meta">
        <span class="ctb-meta-item">⏱️ ${recipe.estimatedMin} min</span>
        <span class="ctb-meta-item">📋 ${recipe.steps?.length || 0} pasos</span>
        <span class="ctb-meta-item">🏷️ ${escape(recipe.category)}</span>
        ${recipe.riskLevel ? `<span class="ctb-meta-item ctb-risk-${escape(recipe.riskLevel)}">⚠️ ${escape(recipe.riskLevel)}</span>` : ''}
      </div>
      ${recipe.rateLimit ? `<div class="ctb-rate-limit">🛡️ ${escape(recipe.rateLimit)}</div>` : ''}
      <details class="ctb-steps">
        <summary>Ver ${recipe.steps?.length || 0} pasos</summary>
        <ol class="ctb-steps-list">
          ${(recipe.steps || [])
            .map(
              (s) => `
            <li>
              <span class="ctb-step-icon">${s.icon || '•'}</span>
              <div>
                <strong>${escape(s.action)}</strong>
                ${s.detail ? `<span class="ctb-step-detail">— ${escape(typeof s.detail === 'string' ? s.detail : '...')}</span>` : ''}
              </div>
            </li>`,
            )
            .join('')}
        </ol>
      </details>
      <div class="ctb-actions">
        ${
          locked
            ? `<a class="ctb-btn ghost" href="/pricing.html">🔒 Disponible en ${badge.label}+</a>`
            : `<button class="ctb-btn primary" data-execute="${escape(recipe.id)}">▶️ Ejecutar Recipe</button>`
        }
        <button class="ctb-btn ghost" data-copy-json="${escape(recipe.id)}">📋 Copiar JSON</button>
      </div>
    </div>`;
};

const renderToolsBar = (tools, allRecipes) => {
  const counts = { all: allRecipes.length };
  allRecipes.forEach((r) => {
    counts[r.tool] = (counts[r.tool] || 0) + 1;
  });
  return `
    <div class="ctb-tools-bar">
      <button class="ctb-tool-pill ${activeTool === 'all' ? 'active' : ''}" data-tool="all">
        🌐 Todas <span class="ctb-count">${counts.all}</span>
      </button>
      ${Object.entries(tools)
        .map(
          ([id, t]) => `
        <button class="ctb-tool-pill ${activeTool === id ? 'active' : ''}" data-tool="${escape(id)}">
          ${t.icon} ${escape(t.label)}
          <span class="ctb-count">${counts[id] || 0}</span>
        </button>`,
        )
        .join('')}
    </div>`;
};

const renderGroupedRecipes = (allRecipes, tools) => {
  const filtered = activeTool === 'all' ? allRecipes : allRecipes.filter((r) => r.tool === activeTool);
  if (filtered.length === 0) return '<div class="ctb-empty">Sin recetas para este tool en tu plan.</div>';
  // Agrupar por categoría dentro del tool
  const grouped = {};
  filtered.forEach((r) => {
    const key = `${r.tool}-${r.category}`;
    if (!grouped[key]) grouped[key] = { tool: r.tool, category: r.category, recipes: [] };
    grouped[key].recipes.push(r);
  });
  return Object.values(grouped)
    .map(
      (g) => `
    <div class="ctb-group">
      <h3 class="ctb-group-title">${tools[g.tool]?.icon || '⚙️'} ${escape(tools[g.tool]?.label || g.tool)} — ${escape(g.category)}</h3>
      <div class="ctb-recipes-grid">
        ${g.recipes.map(renderRecipeCard).join('')}
      </div>
    </div>`,
    )
    .join('');
};

const wireEvents = (root, allRecipes) => {
  root.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      const container = root.querySelector('#ctb-recipes');
      const toolsRes = root._cuTools || {};
      if (container) container.innerHTML = renderGroupedRecipes(allRecipes, toolsRes);
      root.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('active', b === btn));
      // Re-wire dynamic
      wireRecipeActions(root, allRecipes);
    });
  });
  wireRecipeActions(root, allRecipes);
};

const wireRecipeActions = (root, allRecipes) => {
  root.querySelectorAll('[data-copy-json]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.copyJson;
      const recipe = allRecipes.find((r) => r.id === id);
      if (!recipe) return;
      try {
        await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
        toast('📋 Recipe JSON copiado', 'ok');
      } catch {
        toast('No se pudo copiar', 'err');
      }
    });
  });
  root.querySelectorAll('[data-execute]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.execute;
      const recipe = allRecipes.find((r) => r.id === id);
      if (!recipe) return;
      // Free-tier: muestra modal con preview, no ejecuta CU real
      const cuMinutes = recipe.estimatedMin;
      toast(`▶️ Ejecutando "${recipe.label}" — ${cuMinutes} min CU se descontarán de tu cap diario`, 'info');
      // En implementación real: POST /api/cu/execute con recipe.id
      // Por ahora: redirect a panel CU
      setTimeout(() => {
        window.location.hash = '#pantalla';
      }, 1500);
    });
  });
};

export const renderCuToolbox = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🛠️ Computer Use Toolbox</h1>
        <p class="view-subtitle page-subtitle">Recetas para dominar IG · TikTok · Canva · CapCut · Runway · Pika · Luma · Kling · HeyGen · InVideo · Veed</p>
      </div>
    </header>
    <div class="page-body" id="ctb-root">
      <div class="ctb-loading"><span class="ctb-spin"></span> Cargando biblioteca de recipes…</div>
    </div>
    <style>
      .ctb-loading{padding:40px;text-align:center;color:var(--text-tertiary,#888);}
      .ctb-spin{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:#a855f7;border-radius:50%;animation:ctbSpin .9s linear infinite;}
      @keyframes ctbSpin{to{transform:rotate(360deg);}}
      .ctb-summary{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:16px;color:var(--text-primary,var(--fg));}
      .ctb-summary h2{font-size:18px;margin:0 0 4px;letter-spacing:-0.015em;}
      .ctb-summary-meta{font-size:13px;color:var(--text-tertiary,#888);}
      .ctb-tools-bar{display:flex;gap:6px;flex-wrap:wrap;padding:6px;background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;overflow-x:auto;}
      .ctb-tool-pill{padding:8px 14px;background:transparent;border:0;border-radius:8px;color:var(--text-secondary,var(--fg));font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transition:background .15s,color .15s;font-family:inherit;}
      .ctb-tool-pill:hover{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-primary,var(--fg));}
      .ctb-tool-pill.active{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;box-shadow:0 2px 10px rgba(168,85,247,.25);}
      .ctb-count{padding:2px 6px;background:rgba(17,18,22,.08);border-radius:99px;font-size:10.5px;font-weight:700;}
      .ctb-tool-pill.active .ctb-count{background:rgba(255,255,255,.25);color:#fff;}
      .ctb-group{margin-bottom:24px;}
      .ctb-group-title{font-size:14px;font-weight:700;margin:0 0 10px;color:var(--text-primary,var(--fg));text-transform:uppercase;letter-spacing:.05em;padding:6px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;display:inline-block;}
      .ctb-recipes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;}
      .ctb-recipe{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:14px;transition:transform .15s,border-color .15s;color:var(--text-primary,var(--fg));}
      .ctb-recipe:hover{transform:translateY(-2px);border-color:rgba(168,85,247,.3);}
      .ctb-recipe.locked{opacity:.62;}
      .ctb-recipe-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;}
      .ctb-recipe-title{font-weight:700;font-size:14px;line-height:1.3;flex:1;}
      .ctb-badge{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:999px;letter-spacing:.03em;flex-shrink:0;}
      .ctb-recipe-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:11px;color:var(--text-tertiary,#888);margin-bottom:8px;}
      .ctb-meta-item{padding:2px 6px;background:var(--bg-soft,rgba(17,18,22,.04));border-radius:5px;}
      .ctb-risk-safe{color:#10b981;background:rgba(16,185,129,.08);}
      .ctb-risk-low{color:#3b82f6;background:rgba(59,130,246,.08);}
      .ctb-risk-medium{color:#f59e0b;background:rgba(245,158,11,.10);}
      .ctb-risk-high{color:#ef4444;background:rgba(239,68,68,.10);}
      .ctb-rate-limit{font-size:11px;padding:6px 9px;background:rgba(34,211,238,.06);border-left:2px solid #22d3ee;border-radius:6px;margin-bottom:10px;color:var(--text-secondary);}
      .ctb-steps{margin-bottom:10px;}
      .ctb-steps summary{cursor:pointer;font-size:12.5px;font-weight:600;color:var(--text-secondary,var(--fg));padding:6px 0;list-style:none;}
      .ctb-steps summary::-webkit-details-marker{display:none;}
      .ctb-steps summary::before{content:'▸ ';transition:transform .2s;}
      .ctb-steps[open] summary::before{content:'▾ ';}
      .ctb-steps-list{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:5px;}
      .ctb-steps-list li{display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:6px 8px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:6px;line-height:1.4;}
      .ctb-step-icon{font-size:13px;flex-shrink:0;}
      .ctb-step-detail{color:var(--text-tertiary,#888);font-size:11px;}
      .ctb-actions{display:flex;gap:6px;}
      .ctb-btn{padding:8px 12px;border-radius:8px;border:0;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;text-align:center;flex:1;}
      .ctb-btn.primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .ctb-btn.primary:hover{filter:brightness(1.08);}
      .ctb-btn.ghost{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-secondary,var(--fg));border:1px solid var(--border);}
      .ctb-btn.ghost:hover{background:var(--bg-hover,rgba(17,18,22,.08));}
      .ctb-empty{padding:40px;text-align:center;color:var(--text-tertiary,#888);}
    </style>`;

  // Load user plan
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (meRes.ok) {
      const me = await meRes.json();
      currentUserPlan = me?.user?.plan || 'free';
    }
  } catch {
    /* default free */
  }

  // Load full library (no filter — frontend filtra por tool)
  const { data, error } = await apiSafe(`/api/cu/recipes?planId=premium`, null);
  const container = root.querySelector('#ctb-root');
  if (error || !data) {
    container.innerHTML = '<div class="ctb-empty">No se pudo cargar la biblioteca.</div>';
    return;
  }

  const allRecipes = data.recipes || [];
  const tools = data.tools || {};
  root._cuTools = tools;
  const planBadge = PLAN_BADGES[currentUserPlan] || PLAN_BADGES.free;
  const userAccessible = allRecipes.filter((r) => isPlanGte(currentUserPlan, r.minPlan)).length;

  container.innerHTML = `
    <div class="ctb-summary">
      <h2>Biblioteca: ${allRecipes.length} recipes en ${Object.keys(tools).length} herramientas</h2>
      <div class="ctb-summary-meta">
        Tu plan: <strong style="color:${planBadge.color};">${planBadge.label}</strong> ·
        Recipes disponibles: <strong>${userAccessible}/${allRecipes.length}</strong> ·
        <a href="/pricing.html" style="color:#a855f7;">Upgrade para más →</a>
      </div>
    </div>
    ${renderToolsBar(tools, allRecipes)}
    <div id="ctb-recipes">${renderGroupedRecipes(allRecipes, tools)}</div>
  `;

  wireEvents(root, allRecipes);
};
