import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

/* Predictor local con heurísticas reales — funciona sin backend.
   Analiza: hook (primeras palabras), longitud, números, emojis, hashtags,
   timing, formato. Devuelve score 0-100 + factores + recomendaciones
   específicas para viralizar. */
const localPredict = ({ formato, caption, hashtags, hora, dia }) => {
  let score = 50;
  const factores = [];
  const recomendaciones = [];

  // ── Análisis del hook (primeras 6 palabras) ──
  const hook = caption.split(/\s+/).slice(0, 6).join(' ');
  const hookLen = hook.length;

  if (/^(cómo|como|por qué|porque|qué|que|cuál|cual|cuándo|cuando)/i.test(caption)) {
    score += 8;
    factores.push({ factor: 'Pregunta inicial (alto engagement)', impacto: 'positivo' });
  }
  if (/\b(nadie|secreto|error|nunca|verdad|honesto|deja de|pará)\b/i.test(hook)) {
    score += 10;
    factores.push({ factor: 'Hook con curiosidad / contradicción', impacto: 'positivo' });
  }
  if (/^\d+/.test(caption)) {
    score += 6;
    factores.push({ factor: 'Inicia con número (mayor retención)', impacto: 'positivo' });
  }
  if (hookLen < 20) {
    score -= 4;
    factores.push({ factor: 'Hook muy corto', impacto: 'negativo' });
    recomendaciones.push('Hacé el hook más específico — entre 30-60 caracteres funciona mejor.');
  } else if (hookLen > 80) {
    score -= 6;
    factores.push({ factor: 'Hook largo (lectores abandonan)', impacto: 'negativo' });
    recomendaciones.push('Acortá el hook a 5-7 palabras de impacto en la primera línea.');
  }

  // Emojis en hook
  const emojiCount = (caption.match(/\p{Emoji}/gu) ?? []).length;
  if (emojiCount === 0) {
    score -= 3;
    factores.push({ factor: 'Sin emojis (reduce scroll-stop)', impacto: 'negativo' });
    recomendaciones.push('Probá agregar 1-2 emojis específicos al hook para frenar el scroll.');
  } else if (emojiCount > 6) {
    score -= 4;
    factores.push({ factor: 'Demasiados emojis (look spammy)', impacto: 'negativo' });
    recomendaciones.push('Reducí emojis a máximo 3-4 — más se siente spam.');
  } else {
    factores.push({ factor: 'Uso balanceado de emojis', impacto: 'positivo' });
  }

  // ── Hashtags ──
  const hCount = hashtags.length;
  if (hCount === 0) {
    score -= 8;
    factores.push({ factor: 'Sin hashtags', impacto: 'negativo' });
    recomendaciones.push('Agregá 5-12 hashtags relevantes — mix de nicho específico + medio.');
  } else if (hCount < 5) {
    score -= 4;
    factores.push({ factor: 'Pocos hashtags', impacto: 'negativo' });
    recomendaciones.push(`Tenés ${hCount} hashtags. Llevalos a 8-12 para mejor discoverability.`);
  } else if (hCount > 20) {
    score -= 5;
    factores.push({ factor: 'Demasiados hashtags (penaliza el algoritmo)', impacto: 'negativo' });
    recomendaciones.push('IG penaliza posts con >15 hashtags. Bajá a 10-12 highly relevantes.');
  } else {
    score += 5;
    factores.push({ factor: `${hCount} hashtags (densidad óptima)`, impacto: 'positivo' });
  }
  // Detecta hashtags genéricos
  const generics = ['#love', '#instagood', '#follow', '#like', '#photooftheday', '#picoftheday'];
  const hasGeneric = hashtags.some((h) => generics.includes(h.toLowerCase()));
  if (hasGeneric) {
    score -= 5;
    factores.push({ factor: 'Hashtags genéricos detectados', impacto: 'negativo' });
    recomendaciones.push('Sacá hashtags genéricos (#love, #instagood, etc) — bajan la calidad percibida.');
  }

  // ── Timing ──
  const goodHoursReel = [12, 13, 18, 19, 20, 21];
  const goodHoursCar = [9, 10, 11, 19, 20, 21];
  const goodHoursStory = [8, 9, 12, 13, 21, 22];
  const goodHours = formato === 'reel' ? goodHoursReel : formato === 'historia' ? goodHoursStory : goodHoursCar;
  if (goodHours.includes(hora)) {
    score += 6;
    factores.push({ factor: `Hora ${hora}:00 — ventana óptima para ${formato}`, impacto: 'positivo' });
  } else if (hora >= 0 && hora <= 6) {
    score -= 10;
    factores.push({ factor: 'Madrugada — alcance muy bajo', impacto: 'negativo' });
    recomendaciones.push(
      `Movelo a ${goodHours[0]}-${goodHours[goodHours.length - 1]}h. Estás publicando cuando nadie ve.`,
    );
  } else {
    score -= 3;
    factores.push({ factor: 'Hora subóptima para este formato', impacto: 'negativo' });
    recomendaciones.push(`Para ${formato}, los mejores horarios son: ${goodHours.map((h) => `${h}h`).join(', ')}.`);
  }

  const goodDays = ['martes', 'miercoles', 'jueves'];
  const okDays = ['lunes', 'viernes'];
  if (goodDays.includes(dia)) {
    score += 4;
    factores.push({ factor: `${dia} — día de alto engagement`, impacto: 'positivo' });
  } else if (!okDays.includes(dia)) {
    score -= 3;
    factores.push({ factor: `${dia} — engagement típicamente bajo`, impacto: 'negativo' });
    recomendaciones.push('Si podés, movelo a martes/miércoles/jueves — engagement promedio +18%.');
  }

  // ── Formato bonus ──
  if (formato === 'reel') {
    score += 4;
    factores.push({ factor: 'Reel (formato favorecido por IG)', impacto: 'positivo' });
  } else if (formato === 'carrusel') {
    score += 2;
    factores.push({ factor: 'Carrusel (alto save rate)', impacto: 'positivo' });
  }

  // Recomendaciones generales viralidad
  if (!/\?$/.test(caption) && score < 75) {
    recomendaciones.push('Cerrá el caption con una pregunta abierta → dispara comentarios.');
  }
  if (!/(guardá|guarda|comentá|comenta|compart|etiquet)/i.test(caption) && score < 80) {
    recomendaciones.push('Agregá un CTA explícito ("guardá", "etiquetá a alguien", "comentá X").');
  }
  if (hCount < 12 && formato === 'reel') {
    recomendaciones.push('Para reel virales: usá 10-15 hashtags mix nicho + tendencia actual.');
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Métricas estimadas según score
  const baseReach = formato === 'reel' ? 8000 : formato === 'carrusel' ? 3500 : 2200;
  const metricas = {
    alcance: Math.round(baseReach * (score / 50)),
    impresiones: Math.round(baseReach * (score / 50) * 1.4),
    engagementRate: +(2 + (score / 100) * 8).toFixed(1),
    saves: Math.round(baseReach * (score / 50) * 0.04),
    shares: Math.round(baseReach * (score / 50) * 0.02),
  };

  // Ventana óptima
  const ventanaOptima = goodHours.slice(0, 3).map((h) => ({
    dia: dia,
    hora: `${h}:00`,
    score: Math.min(95, score + (goodHours.includes(hora) ? 5 : 12)),
  }));

  return {
    scoreGlobal: score,
    scoreViralidad: Math.max(0, Math.min(100, score - 5 + (formato === 'reel' ? 10 : 0))),
    resumen:
      score >= 75
        ? '🚀 Potencial viral alto. Publicalo ya.'
        : score >= 50
          ? '✅ Bueno, pero hay margen para mejorar antes de publicar.'
          : '⚠️ Necesita trabajo antes de publicar. Aplicá las recomendaciones.',
    metricas,
    factores,
    recomendaciones,
    ventanaOptima,
    simulated: true,
  };
};

let state = { result: null };

const FORMATS = ['carrusel', 'reel', 'historia', 'foto', 'video'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const renderForm = () => `
  <div class="studio-form">
    <h3>Predictor de Performance</h3>
    <p class="small muted" style="margin-bottom:16px;">Usá IA + tu historial para predecir el alcance y engagement antes de publicar.</p>

    <div class="field">
      <label class="field-label">Tipo de contenido</label>
      <select class="field-select" id="formato">
        ${FORMATS.map((f) => `<option value="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label class="field-label">Caption (primeras palabras)</label>
      <textarea class="field-textarea" id="caption" rows="3" placeholder="ej: Lo que nadie te dice sobre crecer en Instagram…"></textarea>
    </div>

    <div class="field">
      <label class="field-label">Hashtags (uno por línea)</label>
      <textarea class="field-textarea" id="hashtags" rows="3" placeholder="#marketing\n#IA\n#instagram"></textarea>
    </div>

    <div class="field">
      <label class="field-label">Hora de publicación</label>
      <select class="field-select" id="hora">
        ${HOURS.map((h) => {
          const label = `${String(h).padStart(2, '0')}:00`;
          const sel = h === 19 ? ' selected' : '';
          return `<option value="${h}"${sel}>${label}</option>`;
        }).join('')}
      </select>
    </div>

    <div class="field">
      <label class="field-label">Día de la semana</label>
      <select class="field-select" id="dia">
        <option value="lunes">Lunes</option>
        <option value="martes">Martes</option>
        <option value="miercoles">Miércoles</option>
        <option value="jueves">Jueves</option>
        <option value="viernes" selected>Viernes</option>
        <option value="sabado">Sábado</option>
        <option value="domingo">Domingo</option>
      </select>
    </div>

    <div class="btn-row">
      <button class="btn primary" id="predict-btn">🎯 Predecir</button>
    </div>
  </div>`;

const scoreColor = (score) => {
  if (score >= 75) return 'var(--ok)';
  if (score >= 50) return 'var(--warn)';
  return 'var(--crit)';
};

const scoreLabel = (score) => {
  if (score >= 75) return 'Alto potencial';
  if (score >= 50) return 'Potencial medio';
  return 'Bajo potencial';
};

const renderGauge = (label, value, max, unit = '') => `
  <div class="gauge-row">
    <span class="small muted" style="min-width:120px;">${label}</span>
    <div class="gauge-bar">
      <div class="gauge-fill" style="width:${Math.min(100, (value / max) * 100)}%;background:${scoreColor((value / max) * 100)};"></div>
    </div>
    <span class="small">${typeof value === 'number' ? value.toLocaleString() : value}${unit}</span>
  </div>`;

const renderResult = () => {
  if (!state.result) {
    return `
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:520px;flex-direction:column;gap:12px;">
        <div style="font-size:56px;opacity:0.3;">🎯</div>
        <div class="muted">Completá el formulario y dale "Predecir" para ver el análisis acá.</div>
      </div>`;
  }
  const r = state.result;
  const score = r.scoreGlobal ?? 0;

  return `
    <div>
      <!-- Score principal -->
      <div class="card predictor-score-card" style="margin-bottom:16px;text-align:center;">
        <div class="score-ring" style="--score:${score};--color:${scoreColor(score)};">
          <svg viewBox="0 0 120 120" class="score-svg">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="${scoreColor(score)}" stroke-width="10"
              stroke-dasharray="${Math.round(score * 3.267)} 326.7"
              stroke-linecap="round" transform="rotate(-90 60 60)"/>
          </svg>
          <div class="score-center">
            <div class="score-num">${score}</div>
            <div class="tiny muted">/ 100</div>
          </div>
        </div>
        <div class="score-label" style="color:${scoreColor(score)};margin-top:8px;font-weight:600;">${scoreLabel(score)}</div>
        <div class="small muted" style="margin-top:4px;">${escape(r.resumen ?? '')}</div>
      </div>

      <!-- Métricas estimadas -->
      <div class="card" style="margin-bottom:14px;">
        <h3>📊 Métricas estimadas</h3>
        ${renderGauge('Alcance', r.metricas?.alcance ?? 0, (r.metricas?.alcance ?? 100) * 2)}
        ${renderGauge('Impresiones', r.metricas?.impresiones ?? 0, (r.metricas?.impresiones ?? 100) * 2)}
        ${renderGauge('Engagement', r.metricas?.engagementRate ?? 0, 10, '%')}
        ${renderGauge('Saves', r.metricas?.saves ?? 0, (r.metricas?.saves ?? 10) * 2)}
        ${renderGauge('Shares', r.metricas?.shares ?? 0, (r.metricas?.shares ?? 5) * 2)}
      </div>

      <!-- Ventanas de tiempo -->
      ${
        r.ventanaOptima
          ? `
        <div class="card" style="margin-bottom:14px;">
          <h3>⏰ Ventana óptima</h3>
          <div class="time-grid">
            ${(r.ventanaOptima ?? [])
              .map(
                (v) => `
              <div class="time-chip ${v.score >= 70 ? 'hot' : ''}">
                <div class="small">${escape(v.dia)}</div>
                <div class="body" style="font-weight:600;">${escape(v.hora)}</div>
                <div class="tiny muted">${v.score}%</div>
              </div>`,
              )
              .join('')}
          </div>
        </div>`
          : ''
      }

      <!-- Factores -->
      <div class="card" style="margin-bottom:14px;">
        <h3>🔬 Factores analizados</h3>
        ${(r.factores ?? [])
          .map(
            (f) => `
          <div class="factor-row">
            <span class="tag ${f.impacto === 'positivo' ? 'ok' : f.impacto === 'negativo' ? 'crit' : 'warn'}">${f.impacto === 'positivo' ? '↑' : f.impacto === 'negativo' ? '↓' : '→'}</span>
            <span class="small">${escape(f.factor)}</span>
          </div>`,
          )
          .join('')}
      </div>

      <!-- Recomendaciones -->
      ${
        r.recomendaciones?.length
          ? `
        <div class="card">
          <h3>💡 Recomendaciones</h3>
          <ul class="reco-list">
            ${r.recomendaciones.map((rec) => `<li class="small">${escape(rec)}</li>`).join('')}
          </ul>
        </div>`
          : ''
      }
    </div>`;
};

const wireUp = (root) => {
  const form = root.querySelector('.studio-form');
  const preview = root.querySelector('.studio-preview');

  form.querySelector('#predict-btn').addEventListener('click', async () => {
    const formato = form.querySelector('#formato').value;
    const caption = form.querySelector('#caption').value.trim();
    const hashtagsRaw = form.querySelector('#hashtags').value.trim();
    const hashtags = hashtagsRaw
      ? hashtagsRaw
          .split('\n')
          .map((h) => h.trim())
          .filter(Boolean)
      : [];
    const hora = Number(form.querySelector('#hora').value);
    const dia = form.querySelector('#dia').value;

    if (!caption) {
      toast('Escribí algo del caption', 'crit');
      return;
    }

    const btn = form.querySelector('#predict-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> prediciendo…';
    const { data, error } = await apiSafe('/api/studio/predictor', null, {
      method: 'POST',
      body: { formato, caption, hashtags, hora, dia },
    });
    if (error || !data) {
      // Predicción local (sin backend) con heurísticas reales
      state.result = localPredict({ formato, caption, hashtags, hora, dia });
      preview.innerHTML = renderResult();
      toast('🧠 Predicción local lista (backend offline)', 'info');
    } else {
      state.result = data;
      preview.innerHTML = renderResult();
      toast('Predicción lista', 'ok');
    }
    btn.disabled = false;
    btn.innerHTML = '🎯 Predecir';
  });
};

export const renderPredictor = async (root) => {
  state = { result: null };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Predictor de Performance</h1>
        <p class="view-subtitle page-subtitle">Estimá el alcance y engagement de tu próximo post antes de publicarlo.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="studio-layout">
        ${renderForm()}
        <div class="studio-preview">${renderResult()}</div>
      </div>
    </div>`;
  wireUp(root);
};
