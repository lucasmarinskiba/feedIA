/* ══════════════════════════════════════════════════════════════════════════════
   ACHIEVEMENTS — Galería de trofeos desbloqueables
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const EMPTY_SNAPSHOT = {
  totalUnlocked: 0,
  totalAvailable: 0,
  completionPct: 0,
  totalPoints: 0,
  epicUnlocked: 0,
  legendaryUnlocked: 0,
  mythicUnlocked: 0,
  lastUnlocked: null,
};

const RARITY_COLORS = {
  común: '#9CA3AF',
  rara: '#3B82F6',
  épica: '#A855F7',
  legendaria: '#F59E0B',
  mítica: '#EF4444',
};

const CATEGORY_EMOJI = {
  crecimiento: '📈',
  engagement: '❤️',
  contenido: '🎬',
  comunidad: '💬',
  ventas: '💰',
  rituales: '☀️',
  maestría: '🎖️',
  especiales: '✨',
  'tiktok-crecimiento': '🎵',
  'tiktok-engagement': '💕',
  'instagram-crecimiento': '📸',
  'instagram-engagement': '❤️',
};

const RARITY_SOUNDS = {
  común: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  rara: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  épica: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  legendaria: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  mítica: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
};

let activeCategory = null;
let showOnlyUnlocked = false;
let lastUnlockedCount = 0;

const playSound = (rarity) => {
  try {
    const audio = new Audio(RARITY_SOUNDS[rarity] ?? RARITY_SOUNDS.común);
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Ignore errors (user may have muted browser)
  } catch (e) {
    // Silently fail if audio not supported
  }
};

const showUnlockNotification = (achievement) => {
  const rarity = achievement.rarity || 'común';
  const rarityColor = RARITY_COLORS[rarity];

  // Toast notification
  toast(
    `🎉 ${escape(achievement.name)}\n${escape(achievement.description)}`,
    rarity === 'mítica' ? 'success' : rarity === 'legendaria' ? 'info' : 'default',
    5000
  );

  // Play sound
  playSound(rarity);

  // Visual pulse effect
  const shelf = document.getElementById('medal-shelf');
  if (shelf) {
    shelf.style.animation = 'none';
    setTimeout(() => {
      shelf.style.animation = 'pulse 0.6s ease-out';
    }, 10);
  }
};

const renderBadge = (a, unlocked) => {
  const c = RARITY_COLORS[a.rarity] ?? '#9CA3AF';
  const hidden = a.hidden && !unlocked;
  return `
    <div class="card achievement-card ${unlocked ? 'unlocked' : 'locked'}" style="border-left: 4px solid ${c}; opacity: ${unlocked || !a.hidden ? 1 : 0.4};">
      <div class="meta">
        <span class="tag tiny" style="background:${c}; color:white;">${escape(a.rarity)}</span>
        <span class="tag tiny">${escape(a.category)}</span>
        <span class="tag tiny">+${a.points}pts</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0;">
        <div style="font-size:42px;line-height:1;">${hidden ? '🔒' : escape(a.emoji)}</div>
        <div>
          <h3 style="margin:0;">${hidden ? '???' : escape(a.name)}</h3>
          <div class="small muted">${hidden ? 'Logro oculto' : escape(a.description)}</div>
        </div>
      </div>
      ${unlocked ? `<div class="small accent" style="margin-top:6px;">✓ Desbloqueado · ${new Date(a.unlockedAt).toLocaleDateString('es-AR')}</div>` : ''}
      ${!hidden ? `<div class="small muted" style="font-style:italic;margin-top:8px;">"${escape(a.flavorText)}"</div>` : ''}
      ${!hidden ? `<div class="small" style="margin-top:6px;"><strong>Cómo:</strong> ${escape(a.unlockCondition)}</div>` : ''}
      ${unlocked && a.shareableText ? `<button class="btn small" data-share="${escape(a.id)}" style="margin-top:8px;">Compartir 📤</button>` : ''}
    </div>`;
};

export const renderAchievements = async (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1>🏆 Logros</h1>
      <p class="muted">Cada paso del camino tiene un trofeo. Coleccionalos.</p>
    </div>
    <div id="achievements-stats" class="stats-grid" style="margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;"></div>
    <div id="medal-shelf" style="margin:30px 0;"></div>
    <div class="hook-category-filter" id="cat-filter"></div>
    <div style="margin:10px 0;display:flex;gap:10px;align-items:center;">
      <label class="small"><input type="checkbox" id="only-unlocked"> Solo desbloqueados</label>
      <button class="btn small" id="evaluate-btn">🔄 Evaluar progreso</button>
    </div>
    <div id="achievements-grid" class="page-grid"></div>
    <div id="next-section" style="margin-top:30px;"></div>
  `;

  const [allRes, unlockedRes, snapshotRes, nextRes] = await Promise.all([
    apiSafe('/api/achievements', []),
    apiSafe('/api/achievements/unlocked', []),
    apiSafe('/api/achievements/snapshot', EMPTY_SNAPSHOT),
    apiSafe('/api/achievements/next', []),
  ]);
  const all = Array.isArray(allRes.data) ? allRes.data : [];
  const unlocked = Array.isArray(unlockedRes.data) ? unlockedRes.data : [];
  const snapshot = snapshotRes.data ?? EMPTY_SNAPSHOT;
  const next = Array.isArray(nextRes.data) ? nextRes.data : [];
  const isOffline = !!allRes.error && !!snapshotRes.error;

  if (isOffline && all.length === 0) {
    const grid = container.querySelector('#achievements-grid');
    if (grid)
      grid.innerHTML =
        '<div class="empty-state">📡 Sin conexión al backend. Los logros se cargarán cuando el servidor vuelva.</div>';
    return;
  }

  // Stats
  document.getElementById('achievements-stats').innerHTML = `
    <div class="card stat-card">
      <div class="stat-label">Desbloqueados</div>
      <div class="stat-value">${snapshot.totalUnlocked}/${snapshot.totalAvailable}</div>
      <div class="small muted">${(snapshot.completionPct ?? 0).toFixed(1)}%</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Puntos</div>
      <div class="stat-value">${snapshot.totalPoints}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Épicos+</div>
      <div class="stat-value">${snapshot.epicUnlocked + snapshot.legendaryUnlocked + snapshot.mythicUnlocked}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Último desbloqueo</div>
      <div class="stat-value" style="font-size:14px;">${snapshot.lastUnlocked ? escape(snapshot.lastUnlocked.name) : '—'}</div>
    </div>
  `;

  // Medal Shelf
  if (unlocked.length > 0) {
    const unlockedDefs = unlocked
      .map((u) => {
        const def = all.find((a) => a.id === u.id);
        return def ? { ...def, ...u } : null;
      })
      .filter((x) => x !== null)
      .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
      .slice(0, 12); // Show top 12 recent medals

    const rarityStyles = {
      común: { border: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', glow: 'rgba(156,163,175,0.3)', hoverGlow: 'rgba(156,163,175,0.5)' },
      rara: { border: '#3B82F6', bg: 'rgba(59,130,246,0.15)', glow: 'rgba(59,130,246,0.4)', hoverGlow: 'rgba(59,130,246,0.6)' },
      épica: { border: '#A855F7', bg: 'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(168,85,247,0.1))', glow: 'rgba(168,85,247,0.5)', hoverGlow: 'rgba(168,85,247,0.8)' },
      legendaria: { border: '#F59E0B', bg: 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(245,158,11,0.1))', glow: 'rgba(245,158,11,0.5)', hoverGlow: 'rgba(245,158,11,0.8)' },
      mítica: { border: '#EF4444', bg: 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.1))', glow: 'rgba(239,68,68,0.6)', hoverGlow: 'rgba(239,68,68,0.9)' },
    };

    document.getElementById('medal-shelf').innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(88,28,135,0.1),rgba(200,124,124,0.05));border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:16px;margin-bottom:20px;backdrop-filter:blur(8px);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h2 style="margin:0;font-size:18px;font-weight:600;">🏅 Repisa de Medallas</h2>
          <span class="badge" style="background:rgba(139,92,246,0.3);color:#a78bfa;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${unlocked.length} medallas</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px;">
          ${unlockedDefs
            .map(
              (m, idx) => {
                const style = rarityStyles[m.rarity];
                return `
            <div class="medal-item" data-rarity="${m.rarity}" style="padding:12px 8px;text-align:center;border:2px solid ${style.border};border-radius:8px;cursor:pointer;background:${style.bg};transition:all 0.3s ease;animation:slideInUp 0.5s ease-out ${idx * 50}ms;transform:translateY(0);box-shadow:0 0 0 0 ${style.glow};"
              onmouseover="this.style.transform='translateY(-4px)';const s=this.getAttribute('data-rarity');const styles={'común': {hoverGlow:'rgba(156,163,175,0.5)'}, 'rara': {hoverGlow:'rgba(59,130,246,0.6)'}, 'épica': {hoverGlow:'rgba(168,85,247,0.8)'}, 'legendaria': {hoverGlow:'rgba(245,158,11,0.8)'}, 'mítica': {hoverGlow:'rgba(239,68,68,0.9)'}};this.style.boxShadow='0 8px 24px '+styles[s].hoverGlow;"
              onmouseout="this.style.transform='translateY(0)';const s=this.getAttribute('data-rarity');const styles={'común': {glow:'rgba(156,163,175,0.3)'}, 'rara': {glow:'rgba(59,130,246,0.4)'}, 'épica': {glow:'rgba(168,85,247,0.5)'}, 'legendaria': {glow:'rgba(245,158,11,0.5)'}, 'mítica': {glow:'rgba(239,68,68,0.6)'}};this.style.boxShadow='0 0 0 0 '+styles[s].glow;"
              title="${escape(m.name)}&#10;${escape(m.description)}&#10;Desbloqueado: ${new Date(m.unlockedAt).toLocaleDateString('es-AR')}">
              <div style="font-size:40px;margin-bottom:6px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${escape(m.emoji)}</div>
              <div class="tiny" style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e0e0e0;">${escape(m.name)}</div>
              <div class="tiny muted" style="margin-top:4px;font-size:11px;">${new Date(m.unlockedAt).toLocaleDateString('es-AR')}</div>
            </div>
            `;
              },
            )
            .join('')}
        </div>
      </div>
      <style>
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0.7); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(139,92,246,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        @keyframes unlock-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          75% { transform: scale(1.1) rotate(5deg); }
        }
        .medal-item {
          position: relative;
        }
        .medal-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent);
          border-radius: 8px;
          pointer-events: none;
        }
        .medal-item.unlocking {
          animation: unlock-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      </style>
    `;
  }

  // Category filter
  const cats = [...new Set(all.map((a) => a.category))];
  document.getElementById('cat-filter').innerHTML = `
    <button class="tab-btn ${!activeCategory ? 'active' : ''}" data-cat="">Todos</button>
    ${cats.map((c) => `<button class="tab-btn ${activeCategory === c ? 'active' : ''}" data-cat="${escape(c)}">${CATEGORY_EMOJI[c] ?? ''} ${escape(c)}</button>`).join('')}
  `;

  // Grid
  const unlockedMap = new Map(unlocked.map((u) => [u.id, u]));
  let visible = all;
  if (activeCategory) visible = visible.filter((a) => a.category === activeCategory);
  if (showOnlyUnlocked) visible = visible.filter((a) => unlockedMap.has(a.id));

  document.getElementById('achievements-grid').innerHTML = visible
    .map((a) => renderBadge(unlockedMap.get(a.id) ?? a, unlockedMap.has(a.id)))
    .join('');

  // Next achievements
  if (next.length > 0) {
    document.getElementById('next-section').innerHTML = `
      <h2 style="margin-bottom:10px;">🎯 Próximos a desbloquear</h2>
      <div class="page-grid">${next
        .map(
          (n) => `
        <div class="card">
          <div style="font-size:28px;">${escape(n.achievement.emoji)}</div>
          <h4>${escape(n.achievement.name)}</h4>
          <div class="small muted">${escape(n.achievement.description)}</div>
          <div class="small accent" style="margin-top:6px;"><strong>Progreso:</strong> ${escape(n.progressHint)}</div>
        </div>`,
        )
        .join('')}</div>
    `;
  }

  // Listeners
  document.getElementById('cat-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    activeCategory = btn.dataset.cat || null;
    renderAchievements(container);
  });

  document.getElementById('only-unlocked').addEventListener('change', (e) => {
    showOnlyUnlocked = e.target.checked;
    renderAchievements(container);
  });

  document.getElementById('evaluate-btn').addEventListener('click', async () => {
    toast('Evaluando achievements...', 'info');
    apiBust('/api/achievements');
    const { data: newUnlocks } = await apiSafe('/api/achievements/evaluate', [], { method: 'POST', body: {} });
    const count = (newUnlocks ?? []).length;
    if (count > 0) {
      // Show unlock notifications for each new achievement
      newUnlocks.forEach((unlock) => {
        const def = all.find((a) => a.id === unlock.achievementId);
        if (def) {
          showUnlockNotification(def);
        }
      });
      toast(
        `🎉 ${count} nuevo${count > 1 ? 's' : ''} achievement${count > 1 ? 's' : ''} desbloqueado${count > 1 ? 's' : ''}`,
        'success',
      );
    } else {
      toast('Sin nuevos achievements esta vez', 'info');
    }
    renderAchievements(container);
  });

  // Real-time polling for new achievements (every 30s)
  const pollInterval = setInterval(async () => {
    const { data: snapshot } = await apiSafe('/api/achievements/snapshot', EMPTY_SNAPSHOT);
    const currentCount = snapshot.totalUnlocked ?? 0;

    if (currentCount > lastUnlockedCount) {
      const newCount = currentCount - lastUnlockedCount;
      // Fetch latest unlocked to show notification
      const { data: unlockedList } = await apiSafe('/api/achievements/unlocked', []);
      if (unlockedList && unlockedList.length > 0) {
        const newest = unlockedList[unlockedList.length - 1];
        const def = all.find((a) => a.id === newest.achievementId);
        if (def) {
          showUnlockNotification(def);
        }
      }
      lastUnlockedCount = currentCount;
      renderAchievements(container);
    }
  }, 30000);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => clearInterval(pollInterval));

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-share]');
    if (btn) {
      const id = btn.dataset.share;
      await apiSafe(`/api/achievements/${id}/share`, null, { method: 'POST', body: {} });
      const a = unlocked.find((x) => x.id === id);
      if (a && navigator.clipboard) {
        navigator.clipboard.writeText(a.shareableText);
        toast('Copiado al portapapeles', 'success');
      }
    }
  });
};

// Initialize last unlocked count
lastUnlockedCount = EMPTY_SNAPSHOT.totalUnlocked;
