/* ══════════════════════════════════════════════════════════════════════════════
   PIZARRA VIRTUAL — editor avanzado (zoom/pan · seleccionar · mover · resize)
   ──────────────────────────────────────────────────────────────────────────────
   Dibujá con tiza, subí imágenes, escribí ideas, pegá notas, armá mapas y
   líneas de tiempo. Seleccioná, movés, redimensionás y hacés zoom infinito.
   FeedIA interpreta la pizarra, dice qué entendió y genera directivas.
   ══════════════════════════════════════════════════════════════════════════════ */
import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, withBtnSpinner } from '../lib/ui.js';

let elements = [];
let tool = 'select';
let color = '#ffffff';
let imgCache = new Map();
let _seq = 0;
const eid = () => `el-${Date.now().toString(36)}-${(++_seq).toString(36)}`;
const CHALK_COLORS = ['#ffffff', '#ffe08a', '#9be7b4', '#9bd3ff', '#ff9bb3', '#d9b3ff'];

// camera (world→screen): screen = world*scale + {cx,cy}
let cam = { cx: 0, cy: 0, scale: 1 };
let selected = new Set();
let drag = null; // { mode:'move'|'resize'|'marquee'|'draw'|'pan', ... }
let cur = null; // in-progress draw element
let connectFrom = null;

const toWorld = (sx, sy) => [(sx - cam.cx) / cam.scale, (sy - cam.cy) / cam.scale];

const bbox = (e) => {
  if (e.points && e.points.length) {
    const xs = e.points.map((p) => p[0]);
    const ys = e.points.map((p) => p[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs) || 1,
      h: Math.max(...ys) - Math.min(...ys) || 1,
    };
  }
  return { x: e.x ?? 0, y: e.y ?? 0, w: e.w ?? 160, h: e.h ?? 70 };
};
const hitWorld = (wx, wy) => {
  for (let i = elements.length - 1; i >= 0; i--) {
    const b = bbox(elements[i]);
    if (wx >= b.x - 6 && wx <= b.x + b.w + 6 && wy >= b.y - 6 && wy <= b.y + b.h + 6) return elements[i];
  }
  return null;
};
// 8 resize handles for a single selected element (world coords)
const handlesOf = (el) => {
  const b = bbox(el);
  return {
    nw: [b.x, b.y],
    n: [b.x + b.w / 2, b.y],
    ne: [b.x + b.w, b.y],
    e: [b.x + b.w, b.y + b.h / 2],
    se: [b.x + b.w, b.y + b.h],
    s: [b.x + b.w / 2, b.y + b.h],
    sw: [b.x, b.y + b.h],
    w: [b.x, b.y + b.h / 2],
  };
};
const handleAt = (el, wx, wy) => {
  const hs = handlesOf(el);
  const r = 8 / cam.scale;
  for (const [k, [hx, hy]] of Object.entries(hs)) {
    if (Math.abs(wx - hx) <= r && Math.abs(wy - hy) <= r) return k;
  }
  return null;
};

/* ── render ──────────────────────────────────────────────────────────────── */
const wrapText = (ctx, text, x, y, maxW, lh) => {
  const words = String(text).split(/\s+/);
  let line = '';
  let yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w + ' ';
      yy += lh;
    } else line += w + ' ';
  }
  ctx.fillText(line, x, yy);
};
const arrow = (ctx, x1, y1, x2, y2, c) => {
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
};
const drawEl = (ctx, el) => {
  if (el.type === 'stroke') {
    ctx.strokeStyle = el.color || '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    (el.points || []).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (el.type === 'note') {
    ctx.fillStyle = el.color || '#fce38a';
    ctx.fillRect(el.x, el.y, el.w, el.h);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '13px Inter, sans-serif';
    wrapText(ctx, el.text || '', el.x + 8, el.y + 20, el.w - 16, 16);
  } else if (el.type === 'text') {
    ctx.fillStyle = el.color || '#fff';
    ctx.font = '18px "Comic Sans MS", Inter, cursive';
    wrapText(ctx, el.text || '', el.x, el.y + 18, el.w || 240, 22);
  } else if (el.type === 'shape') {
    ctx.strokeStyle = el.color || '#9bd3ff';
    ctx.lineWidth = 2;
    if (el.shape === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w / 2), Math.abs(el.h / 2), 0, 0, 7);
      ctx.stroke();
    } else ctx.strokeRect(el.x, el.y, el.w, el.h);
  } else if (el.type === 'image') {
    const im = imgCache.get(el.src);
    if (im && im.complete) ctx.drawImage(im, el.x, el.y, el.w, el.h);
    else {
      ctx.strokeStyle = '#9bd3ff';
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      ctx.fillStyle = '#9bd3ff';
      ctx.font = '12px Inter';
      ctx.fillText('🖼 imagen', el.x + 8, el.y + 20);
    }
  } else if (el.type === 'connector') {
    const a = elements.find((x) => x.id === el.from);
    const b = elements.find((x) => x.id === el.to);
    if (a && b) {
      const ba = bbox(a);
      const bb = bbox(b);
      arrow(ctx, ba.x + ba.w / 2, ba.y + ba.h / 2, bb.x + bb.w / 2, bb.y + bb.h / 2, el.color || '#9be7b4');
    }
  } else if (el.type === 'timeline') {
    ctx.strokeStyle = el.color || '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(el.x, el.y + 20);
    ctx.lineTo(el.x + el.w, el.y + 20);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Inter';
    ctx.fillText(el.text || 'Línea de tiempo', el.x, el.y);
    const ms = el.milestones || [];
    ms.forEach((m, i) => {
      const mx = el.x + (el.w / Math.max(1, ms.length - 1)) * i;
      ctx.beginPath();
      ctx.arc(mx, el.y + 20, 4, 0, 7);
      ctx.fillStyle = el.color || '#fff';
      ctx.fill();
      ctx.font = '11px Inter';
      ctx.fillText(m.label, mx - 10, el.y + 40);
    });
  }
};
const draw = (ctx, W, H) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#16322b';
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(cam.scale, 0, 0, cam.scale, cam.cx, cam.cy);

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1 / cam.scale;
  const [w0, h0] = toWorld(0, 0);
  const [w1, h1] = toWorld(W, H);
  for (let gx = Math.floor(w0 / 80) * 80; gx < w1; gx += 80) {
    ctx.beginPath();
    ctx.moveTo(gx, h0);
    ctx.lineTo(gx, h1);
    ctx.stroke();
  }
  for (let gy = Math.floor(h0 / 80) * 80; gy < h1; gy += 80) {
    ctx.beginPath();
    ctx.moveTo(w0, gy);
    ctx.lineTo(w1, gy);
    ctx.stroke();
  }

  for (const el of elements) drawEl(ctx, el);
  if (cur) drawEl(ctx, cur);

  // selection chrome (constant pixel size → divide by scale)
  const s = 1 / cam.scale;
  for (const id of selected) {
    const el = elements.find((x) => x.id === id);
    if (!el) continue;
    const b = bbox(el);
    ctx.strokeStyle = '#e1306c';
    ctx.lineWidth = 1.5 * s;
    ctx.setLineDash([5 * s, 4 * s]);
    ctx.strokeRect(b.x - 3 * s, b.y - 3 * s, b.w + 6 * s, b.h + 6 * s);
    ctx.setLineDash([]);
  }
  if (selected.size === 1) {
    const el = elements.find((x) => x.id === [...selected][0]);
    if (el && el.type !== 'connector' && el.type !== 'stroke') {
      const hs = handlesOf(el);
      ctx.fillStyle = '#e1306c';
      for (const [, [hx, hy]] of Object.entries(hs)) ctx.fillRect(hx - 5 * s, hy - 5 * s, 10 * s, 10 * s);
    }
  }
  if (drag?.mode === 'marquee') {
    ctx.strokeStyle = '#9bd3ff';
    ctx.fillStyle = 'rgba(155,211,255,.1)';
    ctx.lineWidth = s;
    const x = Math.min(drag.sx, drag.x);
    const y = Math.min(drag.sy, drag.y);
    ctx.fillRect(x, y, Math.abs(drag.x - drag.sx), Math.abs(drag.y - drag.sy));
    ctx.strokeRect(x, y, Math.abs(drag.x - drag.sx), Math.abs(drag.y - drag.sy));
  }
};

/* ── main ────────────────────────────────────────────────────────────────── */
export const renderPizarra = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🧑‍🏫 Pizarra Virtual</h1>
        <p class="view-subtitle page-subtitle">Editor con zoom/pan, seleccionar, mover y redimensionar. FeedIA la interpreta y genera directivas.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="wb-templates">📐 Plantillas</button>
        <button class="btn ghost" id="wb-versions">🕓 Versiones</button>
        <button class="btn ghost" id="wb-diff">🔀 Comparar</button>
        <button class="btn ghost" id="wb-snap">📸 Versión</button>
        <button class="btn ghost" id="wb-share">🔗 Compartir</button>
        <button class="btn ghost" id="wb-history">🕘 Historial</button>
        <button class="btn ghost" id="wb-undo-collab">↶ Revertir</button>
        <button class="btn ghost" id="wb-save">💾 Guardar</button>
        <button class="btn ghost" id="wb-ocr">👁 Leer dibujo</button>
        <button class="btn primary" id="wb-interpret">🧠 Interpretar</button>
      </div>
    </header>
    <div class="page-body wb-layout">
      <div class="wb-stage">
        <div class="wb-toolbar" id="wb-toolbar">
          <button class="wb-tool active" data-tool="select" title="Seleccionar / mover / resize">🖱️</button>
          <button class="wb-tool" data-tool="pan" title="Mano (mover lienzo)">✋</button>
          <button class="wb-tool" data-tool="chalk" title="Tiza">✏️</button>
          <button class="wb-tool" data-tool="eraser" title="Borrar">🧽</button>
          <button class="wb-tool" data-tool="note" title="Nota">🗒️</button>
          <button class="wb-tool" data-tool="text" title="Idea/Texto">🆎</button>
          <button class="wb-tool" data-tool="rect" title="Recuadro">▭</button>
          <button class="wb-tool" data-tool="ellipse" title="Elipse">◯</button>
          <button class="wb-tool" data-tool="connector" title="Conectar">↗</button>
          <button class="wb-tool" data-tool="timeline" title="Línea de tiempo">📊</button>
          <button class="wb-tool" data-tool="image" title="Imagen">🖼️</button>
          <span class="wb-sep"></span>
          <span class="wb-colors" id="wb-colors"></span>
          <span class="wb-sep"></span>
          <button class="wb-tool" id="wb-zoom-out" title="Zoom -">➖</button>
          <span id="wb-zoom" class="wb-zoom">100%</span>
          <button class="wb-tool" id="wb-zoom-in" title="Zoom +">➕</button>
          <button class="wb-tool" id="wb-zoom-reset" title="Reset vista">⊙</button>
          <span class="wb-sep"></span>
          <button class="wb-tool" id="wb-undo" title="Deshacer">↩︎</button>
          <button class="wb-tool" id="wb-clear" title="Limpiar">🗑️</button>
          <input type="file" id="wb-file" accept="image/*" style="display:none"/>
        </div>
        <canvas id="wb-canvas" class="wb-canvas"></canvas>
        <div class="wb-hint">Select: clic para elegir, arrastrá para mover, tirá de los puntos rosa para redimensionar. Shift+clic = multi-selección. Rueda = zoom. Supr = borrar.</div>
      </div>
      <aside class="wb-side">
        <div class="card" id="wb-understood">
          <h3 style="margin:0 0 6px;">🧠 Lo que FeedIA entendió</h3>
          <p class="small muted" style="margin:0;">Tocá "Interpretar" y FeedIA dirá qué entendió y creará directivas.</p>
        </div>
        <div class="card" style="margin-top:14px;">
          <h3 style="margin:0 0 8px;">📋 Directivas vigentes <span id="wb-dir-count" class="tag accent tiny">0</span></h3>
          <p class="tiny muted" style="margin:0 0 10px;">Si entendió mal, editá o eliminá acá.</p>
          <div id="wb-dir-list"><div class="muted small">cargando…</div></div>
        </div>
      </aside>
    </div>`;

  const canvas = root.querySelector('#wb-canvas');
  const ctx = canvas.getContext('2d');
  const stage = root.querySelector('.wb-stage');
  const zEl = root.querySelector('#wb-zoom');
  const redraw = () => {
    draw(ctx, canvas.width, canvas.height);
    zEl.textContent = Math.round(cam.scale * 100) + '%';
  };
  const fit = () => {
    canvas.width = stage.clientWidth - 4;
    canvas.height = Math.max(420, window.innerHeight - 270);
    redraw();
  };

  root.querySelector('#wb-colors').innerHTML = CHALK_COLORS.map(
    (c, i) => `<button class="wb-color ${i === 0 ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>`,
  ).join('');
  root.querySelectorAll('.wb-color').forEach((b) =>
    b.addEventListener('click', () => {
      color = b.dataset.c;
      root.querySelectorAll('.wb-color').forEach((x) => x.classList.toggle('active', x === b));
      if (selected.size) {
        for (const id of selected) {
          const el = elements.find((e) => e.id === id);
          if (el) el.color = color;
        }
        redraw();
      }
    }),
  );
  root.querySelectorAll('.wb-tool[data-tool]').forEach((b) =>
    b.addEventListener('click', () => {
      tool = b.dataset.tool;
      root.querySelectorAll('.wb-tool[data-tool]').forEach((x) => x.classList.toggle('active', x === b));
      connectFrom = null;
      if (tool !== 'select') selected.clear();
      if (tool === 'image') root.querySelector('#wb-file').click();
      canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
      redraw();
    }),
  );

  // Comprime/reescala una imagen antes de guardarla para no inflar el
  // estado del board (clave en colaboración: cada op viaja por SSE).
  const compressImage = (dataUrl, maxDim = 1100, quality = 0.72) =>
    new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        let { width: w, height: h } = im;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        // PNG con alpha → conservar PNG; resto → JPEG (mucho más liviano)
        const hasAlpha = /^data:image\/(png|webp)/i.test(dataUrl);
        try {
          resolve(c.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', quality));
        } catch {
          resolve(dataUrl);
        }
      };
      im.onerror = () => resolve(dataUrl);
      im.src = dataUrl;
    });

  root.querySelector('#wb-file').addEventListener('change', (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      const original = rd.result;
      const src = await compressImage(original);
      const saved = original.length - src.length;
      if (saved > 0) toast(`Imagen optimizada (−${Math.round(saved / 1024)} KB)`, 'ok');
      const im = new Image();
      im.onload = () => {
        imgCache.set(src, im);
        redraw();
      };
      im.src = src;
      imgCache.set(src, im);
      const [wx, wy] = toWorld(120, 120);
      elements.push({ id: eid(), type: 'image', x: wx, y: wy, w: 240, h: 170, src });
      redraw();
    };
    rd.readAsDataURL(f);
  });

  const sxy = (e) => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches?.[0] ?? e;
    return [t.clientX - r.left, t.clientY - r.top];
  };

  const down = (e) => {
    const [sx, sy] = sxy(e);
    const [wx, wy] = toWorld(sx, sy);
    if (tool === 'pan' || e.button === 1 || e.spaceKey) {
      drag = { mode: 'pan', sx, sy, ccx: cam.cx, ccy: cam.cy };
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (tool === 'select') {
      // resize handle on the single selection?
      if (selected.size === 1) {
        const el = elements.find((x) => x.id === [...selected][0]);
        if (el && el.type !== 'connector' && el.type !== 'stroke') {
          const hk = handleAt(el, wx, wy);
          if (hk) {
            drag = { mode: 'resize', el, hk, b0: { ...bbox(el) } };
            return;
          }
        }
      }
      const h = hitWorld(wx, wy);
      if (h) {
        if (!e.shiftKey && !selected.has(h.id)) selected = new Set([h.id]);
        else selected.add(h.id);
        drag = {
          mode: 'move',
          sx: wx,
          sy: wy,
          orig: new Map(
            [...selected].map((id) => {
              const el = elements.find((x) => x.id === id);
              return [id, { ...bbox(el), el }];
            }),
          ),
        };
      } else {
        if (!e.shiftKey) selected.clear();
        drag = { mode: 'marquee', sx: wx, sy: wy, x: wx, y: wy };
      }
      redraw();
      return;
    }
    if (tool === 'chalk') {
      drag = { mode: 'draw' };
      cur = { id: eid(), type: 'stroke', color, points: [[wx, wy]] };
    } else if (tool === 'eraser') {
      const h = hitWorld(wx, wy);
      if (h) {
        elements = elements.filter((x) => x.id !== h.id);
        redraw();
      }
    } else if (tool === 'note') {
      const t = prompt('Texto de la nota:');
      if (t) {
        elements.push({ id: eid(), type: 'note', x: wx, y: wy, w: 170, h: 90, text: t, color: '#fce38a' });
        redraw();
      }
    } else if (tool === 'text') {
      const t = prompt('Idea / texto:');
      if (t) {
        elements.push({ id: eid(), type: 'text', x: wx, y: wy, w: 260, h: 30, text: t, color });
        redraw();
      }
    } else if (tool === 'rect' || tool === 'ellipse') {
      drag = { mode: 'draw' };
      cur = { id: eid(), type: 'shape', shape: tool, x: wx, y: wy, w: 0, h: 0, color };
    } else if (tool === 'connector') {
      const h = hitWorld(wx, wy);
      if (h) {
        if (!connectFrom) {
          connectFrom = h;
          toast('Ahora tocá el destino', 'info');
        } else if (h.id !== connectFrom.id) {
          elements.push({ id: eid(), type: 'connector', from: connectFrom.id, to: h.id, color: '#9be7b4' });
          connectFrom = null;
          redraw();
        }
      }
    } else if (tool === 'timeline') {
      const label = prompt('Título de la línea de tiempo:') || 'Plan';
      const ms = (prompt('Hitos separados por coma:') || '')
        .split(',')
        .map((m) => ({ label: m.trim() }))
        .filter((m) => m.label);
      elements.push({
        id: eid(),
        type: 'timeline',
        x: wx,
        y: wy + 20,
        w: 360,
        h: 60,
        text: label,
        milestones: ms,
        color,
      });
      redraw();
    }
  };
  const move = (e) => {
    if (!drag) return;
    const [sx, sy] = sxy(e);
    const [wx, wy] = toWorld(sx, sy);
    if (drag.mode === 'pan') {
      cam.cx = drag.ccx + (sx - drag.sx);
      cam.cy = drag.ccy + (sy - drag.sy);
      redraw();
      return;
    }
    if (drag.mode === 'draw' && cur) {
      if (cur.type === 'stroke') cur.points.push([wx, wy]);
      else if (cur.type === 'shape') {
        cur.w = wx - cur.x;
        cur.h = wy - cur.y;
      }
      redraw();
      return;
    }
    if (drag.mode === 'move') {
      const dx = wx - drag.sx;
      const dy = wy - drag.sy;
      for (const [, o] of drag.orig) {
        if (o.el.points)
          o.el.points = o.el.points.map((p, i) => [drag.orig.get(o.el.id) && o.el.points[i] ? p[0] : p[0], p[1]]);
      }
      for (const [id, o] of drag.orig) {
        const el = o.el;
        if (el.points) {
          el.points = el.points.map((p) => p);
          el.points = elements.find((x) => x.id === id).points;
        }
      }
      for (const [id, o] of drag.orig) {
        const el = elements.find((x) => x.id === id);
        if (!el) continue;
        if (el.points) {
          el.points = el.points.map((p, idx) => [
            o.origPoints ? o.origPoints[idx][0] + dx : p[0],
            o.origPoints ? o.origPoints[idx][1] + dy : p[1],
          ]);
        } else {
          el.x = o.x + dx;
          el.y = o.y + dy;
        }
      }
      redraw();
      return;
    }
    if (drag.mode === 'resize') {
      const el = drag.el;
      const b0 = drag.b0;
      let { x, y, w, h } = b0;
      if (drag.hk.includes('e')) w = Math.max(20, wx - b0.x);
      if (drag.hk.includes('s')) h = Math.max(20, wy - b0.y);
      if (drag.hk.includes('w')) {
        w = Math.max(20, b0.x + b0.w - wx);
        x = wx;
      }
      if (drag.hk.includes('n')) {
        h = Math.max(20, b0.y + b0.h - wy);
        y = wy;
      }
      el.x = x;
      el.y = y;
      el.w = w;
      el.h = h;
      redraw();
      return;
    }
    if (drag.mode === 'marquee') {
      drag.x = wx;
      drag.y = wy;
      redraw();
    }
  };
  const up = () => {
    if (!drag) return;
    if (drag.mode === 'draw' && cur) {
      if (cur.type === 'shape') {
        if (cur.w < 0) {
          cur.x += cur.w;
          cur.w = -cur.w;
        }
        if (cur.h < 0) {
          cur.y += cur.h;
          cur.h = -cur.h;
        }
      }
      if (!(cur.type === 'stroke' && cur.points.length < 2)) elements.push(cur);
      cur = null;
    }
    if (drag.mode === 'marquee') {
      const x0 = Math.min(drag.sx, drag.x);
      const y0 = Math.min(drag.sy, drag.y);
      const x1 = Math.max(drag.sx, drag.x);
      const y1 = Math.max(drag.sy, drag.y);
      for (const el of elements) {
        const b = bbox(el);
        if (b.x >= x0 && b.y >= y0 && b.x + b.w <= x1 && b.y + b.h <= y1) selected.add(el.id);
      }
    }
    drag = null;
    canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
    redraw();
  };
  // capture original stroke points for move
  const downWrap = (e) => {
    down(e);
    if (drag?.mode === 'move')
      for (const [, o] of drag.orig) if (o.el.points) o.origPoints = o.el.points.map((p) => [...p]);
  };

  canvas.addEventListener('mousedown', downWrap);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      downWrap(e);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      move(e);
    },
    { passive: false },
  );
  canvas.addEventListener('touchend', up);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const [sx, sy] = sxy(e);
      const [bx, by] = toWorld(sx, sy);
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      cam.scale = Math.max(0.2, Math.min(4, cam.scale * f));
      cam.cx = sx - bx * cam.scale;
      cam.cy = sy - by * cam.scale;
      redraw();
    },
    { passive: false },
  );

  const keyHandler = (e) => {
    if (root.querySelector('#wb-canvas') == null) {
      window.removeEventListener('keydown', keyHandler);
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size) {
      elements = elements.filter((x) => !selected.has(x.id));
      selected.clear();
      redraw();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      selected.clear();
      redraw();
    } else if (e.key === '+' || e.key === '=') {
      cam.scale = Math.min(4, cam.scale * 1.12);
      redraw();
    } else if (e.key === '-') {
      cam.scale = Math.max(0.2, cam.scale / 1.12);
      redraw();
    } else if (e.key === '0') {
      cam = { cx: 0, cy: 0, scale: 1 };
      redraw();
    }
  };
  window.addEventListener('keydown', keyHandler);

  const zoomBy = (f) => {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const [bx, by] = toWorld(cx, cy);
    cam.scale = Math.max(0.2, Math.min(4, cam.scale * f));
    cam.cx = cx - bx * cam.scale;
    cam.cy = cy - by * cam.scale;
    redraw();
  };
  root.querySelector('#wb-zoom-in').addEventListener('click', () => zoomBy(1.2));
  root.querySelector('#wb-zoom-out').addEventListener('click', () => zoomBy(1 / 1.2));
  root.querySelector('#wb-zoom-reset').addEventListener('click', () => {
    cam = { cx: 0, cy: 0, scale: 1 };
    redraw();
  });
  root.querySelector('#wb-undo').addEventListener('click', () => {
    elements.pop();
    redraw();
  });
  root.querySelector('#wb-clear').addEventListener('click', () => {
    if (confirm('¿Limpiar toda la pizarra?')) {
      elements = [];
      selected.clear();
      redraw();
    }
  });

  root.querySelector('#wb-save').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'guardando…', async () => {
      try {
        await api('/api/whiteboard', { method: 'PUT', body: { elements } });
        toast('Pizarra guardada', 'ok');
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });
  // 🔗 Compartir: crear link de invitación con rol acotado
  root.querySelector('#wb-share').addEventListener('click', async () => {
    const role = confirm('¿Permitir EDITAR? (Aceptar = editor · Cancelar = solo lectura)') ? 'editor' : 'viewer';
    const hrs = Number(prompt('Expira en cuántas horas (vacío = sin expiración):', '72')) || undefined;
    try {
      const bId = (await api('/api/whiteboard/boards')).activeBoardId;
      const inv = await api(`/api/whiteboard/invite?board=${encodeURIComponent(bId)}`, {
        method: 'POST',
        body: { role, expiresInHours: hrs },
      });
      const link = `${location.origin}/#pizarra?invite=${inv.token}`;
      try {
        await navigator.clipboard.writeText(link);
        toast('Link copiado al portapapeles ✓', 'ok');
      } catch {
        /* clipboard bloqueado */
      }
      prompt(`Link de invitación (${role}${hrs ? `, expira en ${hrs}h` : ''}):`, link);
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    }
  });
  // 🕘 Historial: auditoría de operaciones de la pizarra
  root.querySelector('#wb-history').addEventListener('click', async () => {
    try {
      const bId = (await api('/api/whiteboard/boards')).activeBoardId;
      const logEntries = await api(`/api/whiteboard/oplog?board=${encodeURIComponent(bId)}&limit=40`);
      const html = logEntries.length
        ? logEntries
            .map(
              (o) =>
                `<div class="wb-log-row"><span class="tiny muted">${new Date(o.at).toLocaleString('es-AR')}</span> <span class="small">${escape(o.summary)}</span>${o.by ? `<span class="tiny muted"> · ${escape(o.by)}</span>` : ''}</div>`,
            )
            .join('')
        : '<div class="muted small">Sin operaciones registradas todavía.</div>';
      const m = document.createElement('div');
      m.className = 'wb-diff-modal';
      m.innerHTML = `<div class="wb-diff-card" style="max-width:560px;"><div class="row spread" style="margin-bottom:10px;"><h3 style="margin:0;">🕘 Historial / Auditoría</h3><button class="btn ghost tiny" id="wb-log-close">✕</button></div><div class="wb-log-list">${html}</div></div>`;
      document.body.appendChild(m);
      m.querySelector('#wb-log-close').addEventListener('click', () => m.remove());
      m.addEventListener('click', (ev) => {
        if (ev.target === m) m.remove();
      });
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    }
  });
  // ↶ Revertir última op (undo colaborativo)
  root.querySelector('#wb-undo-collab').addEventListener('click', async () => {
    if (!confirm('¿Revertir la última operación de la pizarra para TODOS?')) return;
    try {
      const r = await api('/api/whiteboard/revert-last', { method: 'POST', body: { peerId: myPeerId } });
      if (!r.ok) {
        toast(r.reason || 'Nada para revertir', 'warn');
        return;
      }
      const b = await api(`/api/whiteboard?board=${encodeURIComponent(currentBoardId)}`);
      applyingRemote = true;
      elements = b.elements || [];
      applyingRemote = false;
      snapshotElements();
      redrawWithCursors();
      toast(`Revertido: ${r.reverted?.summary || 'última op'}`, 'ok');
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    }
  });
  root.querySelector('#wb-templates').addEventListener('click', async () => {
    try {
      const tpls = await api('/api/whiteboard/templates');
      const pick = prompt(
        'Elegí plantilla:\n' + tpls.map((t, i) => `${i + 1}. ${t.name} — ${t.description}`).join('\n'),
      );
      const idx = Number(pick) - 1;
      if (!tpls[idx]) return;
      const { elements: els } = await api(`/api/whiteboard/templates/${tpls[idx].id}`);
      elements = els;
      selected.clear();
      cam = { cx: 0, cy: 0, scale: 1 };
      redraw();
      toast(`Plantilla "${tpls[idx].name}" cargada`, 'ok');
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    }
  });
  root.querySelector('#wb-snap').addEventListener('click', async () => {
    const label = prompt('Nombre de la versión:', new Date().toLocaleString('es-AR'));
    if (label === null) return;
    try {
      await api('/api/whiteboard', { method: 'PUT', body: { elements } });
      await api('/api/whiteboard/snapshot', { method: 'POST', body: { label } });
      toast('Versión guardada', 'ok');
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    }
  });
  root.querySelector('#wb-versions').addEventListener('click', async () => {
    try {
      const snaps = await api('/api/whiteboard/snapshots');
      if (!snaps.length) {
        toast('Sin versiones guardadas', 'info');
        return;
      }
      const pick = prompt(
        'Restaurar versión:\n' +
          snaps.map((s, i) => `${i + 1}. ${s.label} (${new Date(s.at).toLocaleString('es-AR')})`).join('\n'),
      );
      const idx = Number(pick) - 1;
      if (!snaps[idx]) return;
      const r = await api(`/api/whiteboard/snapshots/${snaps[idx].id}/restore`, { method: 'POST' });
      elements = r.elements;
      for (const el of elements)
        if (el.type === 'image' && el.src) {
          const im = new Image();
          im.src = el.src;
          imgCache.set(el.src, im);
        }
      selected.clear();
      redraw();
      toast('Versión restaurada', 'ok');
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    }
  });
  root.querySelector('#wb-diff').addEventListener('click', async () => {
    try {
      const snaps = await api('/api/whiteboard/snapshots');
      if (snaps.length < 2) {
        toast('Necesitás al menos 2 versiones para comparar', 'info');
        return;
      }
      const a = Number(prompt('Versión A (número):\n' + snaps.map((s, i) => `${i + 1}. ${s.label}`).join('\n'))) - 1;
      const b = Number(prompt('Versión B (número):')) - 1;
      if (!snaps[a] || !snaps[b]) return;
      const [ra, rb] = await Promise.all([
        api(`/api/whiteboard/snapshots/${snaps[a].id}/restore`, { method: 'POST' }),
        api(`/api/whiteboard/snapshots/${snaps[b].id}/restore`, { method: 'POST' }),
      ]);
      // restore B as current (last call already set it); show side-by-side modal
      showDiff(root, snaps[a].label, ra.elements, snaps[b].label, rb.elements);
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    }
  });
  root.querySelector('#wb-ocr').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'leyendo dibujo…', async () => {
      try {
        // export current canvas frame as PNG (lo que se ve, con tiza/dibujos)
        redraw();
        const imageBase64 = canvas.toDataURL('image/png');
        const r = await api('/api/whiteboard/interpret-visual', { method: 'POST', body: { imageBase64 } });
        root.querySelector('#wb-understood').innerHTML = `
          <h3 style="margin:0 0 6px;">👁 Lo que FeedIA leyó del dibujo</h3>
          <p class="small" style="margin:0 0 10px;">${escape(r.understood)}</p>
          ${r.extracted.length ? `<ul class="small" style="margin:0;padding-left:16px;">${r.extracted.map((x) => `<li>${escape(x.asDirectiveText)}</li>`).join('')}</ul>` : ''}`;
        toast(`FeedIA leyó el dibujo y creó ${r.createdDirectives.length} directiva(s)`, 'ok');
        await loadDirectives(root);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  root.querySelector('#wb-interpret').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'interpretando…', async () => {
      try {
        const r = await api('/api/whiteboard/interpret', { method: 'POST', body: { elements } });
        root.querySelector('#wb-understood').innerHTML = `
          <h3 style="margin:0 0 6px;">🧠 Lo que FeedIA entendió</h3>
          <p class="small" style="margin:0 0 10px;">${escape(r.understood)}</p>
          ${r.extracted.length ? `<div class="tiny muted" style="text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Directivas creadas</div><ul class="small" style="margin:0;padding-left:16px;">${r.extracted.map((x) => `<li>${escape(x.asDirectiveText)}</li>`).join('')}</ul>` : '<p class="tiny muted">No se extrajeron directivas.</p>'}`;
        toast(`FeedIA creó ${r.createdDirectives.length} directiva(s)`, 'ok');
        await loadDirectives(root);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  try {
    const board = await api('/api/whiteboard');
    if (Array.isArray(board.elements) && board.elements.length) {
      elements = board.elements;
      for (const el of elements)
        if (el.type === 'image' && el.src) {
          const im = new Image();
          im.src = el.src;
          imgCache.set(el.src, im);
        }
      if (board.lastInterpretation)
        root.querySelector('#wb-understood').innerHTML =
          `<h3 style="margin:0 0 6px;">🧠 Lo que FeedIA entendió</h3><p class="small" style="margin:0;">${escape(board.lastInterpretation.summary)}</p>`;
    }
  } catch {
    /* nuevo */
  }
  await loadDirectives(root);

  /* ── Colaboración en tiempo real (SSE + CRDT + locks + multi-pizarra) ── */
  const myPeerId = `peer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const myName = localStorage.getItem('feedia.collab.name') || `Tú-${myPeerId.slice(-4)}`;
  const remoteCursors = new Map(); // peerId -> {x,y,color,name,ts}
  const remoteLocks = new Map(); // elementId -> {peerId,name,color}
  const remoteSel = new Map(); // peerId -> {ids:[],color,name}
  let lastSelSig = '';
  const myLocks = new Set(); // elementos que YO tengo lockeados
  let applyingRemote = false;
  let lamport = 0; // reloj lógico CRDT
  let currentBoardId =
    (await api('/api/whiteboard')
      .then((b) => b.boardId)
      .catch(() => 'default')) || 'default';
  let prevSnap = new Map(); // id -> JSON (para diff de ops por-elemento)
  let es = null;

  // Si llegaste por un link de invitación (#pizarra?invite=TOKEN) resolvemos
  // el rol; un viewer queda en SOLO LECTURA.
  const inviteToken = new URLSearchParams(location.hash.split('?')[1] || '').get('invite') || '';
  let myRole = 'editor';
  if (inviteToken) {
    try {
      const r = await api(`/api/whiteboard/invite/${encodeURIComponent(inviteToken)}`);
      if (r.valid) {
        myRole = r.role;
        if (r.boardId) currentBoardId = r.boardId;
      }
    } catch {
      /* token inválido → editor por defecto si es el dueño */
    }
  }
  const readOnly = myRole === 'viewer';
  if (readOnly) toast('Estás en modo SOLO LECTURA (invitación de visor)', 'info');

  const norm = (e) => JSON.stringify({ ...e, rev: undefined, updatedBy: undefined });
  const snapshotElements = () => {
    prevSnap = new Map(elements.map((e) => [e.id, norm(e)]));
  };
  const op = (payload) =>
    fetch(`/api/whiteboard/op?board=${encodeURIComponent(currentBoardId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ peerId: myPeerId, op: payload, invite: inviteToken || undefined }),
    }).catch(() => {});

  // presence + board selector bar
  const bar = document.createElement('span');
  bar.className = 'wb-presence';
  bar.id = 'wb-presence';
  root.querySelector('#wb-toolbar').appendChild(bar);
  let rosterCache = [];
  const renderBar = () => {
    bar.innerHTML =
      `<span class="wb-sep"></span>` +
      `<select id="wb-board-sel" class="wb-board-sel" title="Pizarra activa"></select>` +
      `<button class="wb-tool" id="wb-board-new" title="Nueva pizarra">＋</button>` +
      `<button class="wb-tool" id="wb-board-ren" title="Renombrar">✎</button>` +
      `<button class="wb-tool" id="wb-board-del" title="Borrar pizarra">␡</button>` +
      `<span class="wb-sep"></span>` +
      rosterCache
        .map(
          (p) =>
            `<span class="wb-peer" title="${escape(p.name)}" style="background:${p.color}">${escape((p.name || '?').charAt(0).toUpperCase())}</span>`,
        )
        .join('') +
      `<span class="tiny muted" style="margin-left:6px;">${rosterCache.length} en vivo</span>`;
    wireBoardBar();
    fillBoardSelect();
  };
  const fillBoardSelect = async () => {
    try {
      const bd = await api('/api/whiteboard/boards');
      const sel = root.querySelector('#wb-board-sel');
      if (!sel) return;
      sel.innerHTML = bd.boards
        .map(
          (b) =>
            `<option value="${escape(b.id)}" ${b.id === currentBoardId ? 'selected' : ''}>${escape(b.name)}</option>`,
        )
        .join('');
    } catch {
      /* ignore */
    }
  };
  const switchBoard = async (boardId) => {
    await api(`/api/whiteboard/boards/${boardId}/activate`, { method: 'POST' });
    currentBoardId = boardId;
    try {
      es && es.close();
    } catch {}
    es = null;
    const b = await api(`/api/whiteboard?board=${encodeURIComponent(boardId)}`);
    applyingRemote = true;
    elements = b.elements || [];
    applyingRemote = false;
    for (const el of elements)
      if (el.type === 'image' && el.src && !imgCache.has(el.src)) {
        const im = new Image();
        im.src = el.src;
        imgCache.set(el.src, im);
      }
    snapshotElements();
    remoteLocks.clear();
    redrawWithCursors();
    connect();
  };
  const wireBoardBar = () => {
    root.querySelector('#wb-board-sel')?.addEventListener('change', (e) => switchBoard(e.target.value));
    root.querySelector('#wb-board-new')?.addEventListener('click', async () => {
      const name = prompt('Nombre de la nueva pizarra:');
      if (!name) return;
      const nb = await api('/api/whiteboard/boards', { method: 'POST', body: { name } });
      await switchBoard(nb.id);
      await fillBoardSelect();
      toast(`Pizarra "${name}" creada`, 'ok');
    });
    root.querySelector('#wb-board-ren')?.addEventListener('click', async () => {
      const name = prompt('Nuevo nombre:');
      if (!name) return;
      await api(`/api/whiteboard/boards/${currentBoardId}/rename`, { method: 'POST', body: { name } });
      await fillBoardSelect();
      toast('Pizarra renombrada', 'ok');
    });
    root.querySelector('#wb-board-del')?.addEventListener('click', async () => {
      if (!confirm('¿Borrar esta pizarra? (siempre queda al menos una)')) return;
      const r = await api(`/api/whiteboard/boards/${currentBoardId}/delete`, { method: 'POST' });
      if (!r.ok) {
        toast('No se puede borrar la última pizarra', 'warn');
        return;
      }
      const bd = await api('/api/whiteboard/boards');
      await switchBoard(bd.activeBoardId);
      toast('Pizarra borrada', 'ok');
    });
  };

  // overlay: cursores + locks remotos
  const drawCursors = () => {
    const now = Date.now();
    const s = 1 / cam.scale;
    // selección de otros peers (recuadro de su color)
    for (const [, sel] of remoteSel) {
      for (const id of sel.ids) {
        const E = elements.find((x) => x.id === id);
        if (!E) continue;
        const b = bbox(E);
        ctx.save();
        ctx.setTransform(cam.scale, 0, 0, cam.scale, cam.cx, cam.cy);
        ctx.strokeStyle = sel.color;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.5 * s;
        ctx.strokeRect(b.x - 2 * s, b.y - 2 * s, b.w + 4 * s, b.h + 4 * s);
        ctx.restore();
      }
    }
    for (const [elementId, l] of remoteLocks) {
      const E = elements.find((x) => x.id === elementId);
      if (!E) continue;
      const b = bbox(E);
      ctx.save();
      ctx.setTransform(cam.scale, 0, 0, cam.scale, cam.cx, cam.cy);
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 2 * s;
      ctx.setLineDash([6 * s, 4 * s]);
      ctx.strokeRect(b.x - 4 * s, b.y - 4 * s, b.w + 8 * s, b.h + 8 * s);
      ctx.setLineDash([]);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const sx = b.x * cam.scale + cam.cx;
      const sy = b.y * cam.scale + cam.cy;
      ctx.fillStyle = l.color;
      ctx.font = '11px Inter';
      ctx.fillText(`🔒 ${l.name}`, sx, sy - 6);
      ctx.restore();
    }
    for (const [, c] of remoteCursors) {
      if (now - c.ts > 8000) continue;
      const sx = c.x * cam.scale + cam.cx;
      const sy = c.y * cam.scale + cam.cy;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 12, sy + 4);
      ctx.lineTo(sx + 5, sy + 6);
      ctx.lineTo(sx + 4, sy + 13);
      ctx.closePath();
      ctx.fill();
      ctx.font = '11px Inter';
      ctx.fillText(c.name, sx + 12, sy + 18);
      ctx.restore();
    }
  };
  const redrawWithCursors = () => {
    redraw();
    drawCursors();
  };

  // CRDT: emitir ops por-elemento diffeando contra el snapshot anterior
  const flushOps = () => {
    if (applyingRemote || readOnly) return;
    const seen = new Set();
    for (const el of elements) {
      seen.add(el.id);
      const j = norm(el);
      if (prevSnap.get(el.id) !== j) {
        lamport = Math.max(lamport, el.rev || 0) + 1;
        el.rev = lamport;
        el.updatedBy = myPeerId;
        op({ kind: 'element-upsert', element: el });
      }
    }
    for (const id of prevSnap.keys()) if (!seen.has(id)) op({ kind: 'element-delete', id });
    snapshotElements();
  };
  window.addEventListener('mouseup', flushOps);
  canvas.addEventListener('touchend', flushOps);
  window.addEventListener('keyup', flushOps);
  // broadcast de MI selección cuando cambia
  const flushSelection = () => {
    const sig = [...selected].sort().join(',');
    if (sig === lastSelSig) return;
    lastSelSig = sig;
    op({ kind: 'selection', ids: [...selected] });
  };
  window.addEventListener('mouseup', flushSelection);
  window.addEventListener('keyup', flushSelection);
  const collabPoll = setInterval(() => {
    flushOps();
    flushSelection();
    drawCursors();
  }, 4000);

  // LOCKS: al empezar a mover/redimensionar, lockear lo seleccionado
  canvas.addEventListener(
    'mousedown',
    () => {
      if (tool !== 'select') return;
      setTimeout(() => {
        if (drag && (drag.mode === 'move' || drag.mode === 'resize')) {
          for (const id of selected) {
            if (!myLocks.has(id)) {
              myLocks.add(id);
              op({ kind: 'lock', elementId: id });
            }
          }
        }
      }, 0);
    },
    true,
  );
  window.addEventListener('mouseup', () => {
    for (const id of myLocks) op({ kind: 'unlock', elementId: id });
    myLocks.clear();
  });
  // bloquear interacción sobre elementos lockeados por otros (captura)
  canvas.addEventListener(
    'mousedown',
    (e) => {
      if (tool !== 'select' && tool !== 'eraser') return;
      const r = canvas.getBoundingClientRect();
      const [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top);
      const h = hitWorld(wx, wy);
      if (h && remoteLocks.has(h.id)) {
        const lk = remoteLocks.get(h.id);
        e.stopImmediatePropagation();
        toast(`🔒 "${h.text || h.type}" lo está editando ${lk.name}`, 'warn');
      }
    },
    true,
  );

  // cursor stream (throttled)
  let lastCursor = 0;
  canvas.addEventListener('mousemove', (e) => {
    const t = Date.now();
    if (t - lastCursor < 70) return;
    lastCursor = t;
    const r = canvas.getBoundingClientRect();
    const [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top);
    op({ kind: 'cursor', x: wx, y: wy });
  });

  // SSE con reconexión exponencial + replay de estado al (re)conectar
  let backoff = 1000;
  let reconnectTimer = null;
  const applyLocks = (locks) => {
    remoteLocks.clear();
    for (const l of locks || [])
      if (l.peerId !== myPeerId) remoteLocks.set(l.elementId, { name: l.name, color: l.color, peerId: l.peerId });
  };
  const replayState = async () => {
    try {
      const b = await api(`/api/whiteboard?board=${encodeURIComponent(currentBoardId)}`);
      if (Array.isArray(b.elements)) {
        applyingRemote = true;
        elements = b.elements;
        for (const el of elements)
          if (el.type === 'image' && el.src && !imgCache.has(el.src)) {
            const im = new Image();
            im.src = el.src;
            imgCache.set(el.src, im);
          }
        applyingRemote = false;
        snapshotElements();
        redrawWithCursors();
      }
    } catch {
      /* ignore */
    }
  };
  const connect = () => {
    try {
      es = new EventSource(
        `/api/whiteboard/stream?peerId=${encodeURIComponent(myPeerId)}&name=${encodeURIComponent(myName)}&board=${encodeURIComponent(currentBoardId)}`,
      );
      es.addEventListener('welcome', (ev) => {
        backoff = 1000;
        const d = JSON.parse(ev.data);
        rosterCache = d.roster || [];
        renderBar();
        applyLocks(d.locks);
        replayState();
      });
      es.addEventListener('presence', (ev) => {
        rosterCache = JSON.parse(ev.data).roster || [];
        const live = new Set(rosterCache.map((p) => p.id));
        for (const k of [...remoteSel.keys()]) if (!live.has(k)) remoteSel.delete(k);
        for (const k of [...remoteCursors.keys()]) if (!live.has(k)) remoteCursors.delete(k);
        renderBar();
        redrawWithCursors();
      });
      es.addEventListener('locks', (ev) => {
        applyLocks(JSON.parse(ev.data).locks);
        redrawWithCursors();
      });
      es.addEventListener('cursor', (ev) => {
        const d = JSON.parse(ev.data);
        remoteCursors.set(d.from, {
          x: d.op.x,
          y: d.op.y,
          color: d.color || '#e1306c',
          name: d.name || '·',
          ts: Date.now(),
        });
        redrawWithCursors();
      });
      es.addEventListener('selection', (ev) => {
        const d = JSON.parse(ev.data);
        remoteSel.set(d.from, { ids: d.op.ids || [], color: d.color || '#e1306c', name: d.name || '·' });
        redrawWithCursors();
      });
      es.addEventListener('op', (ev) => {
        const d = JSON.parse(ev.data);
        const o = d.op;
        applyingRemote = true;
        if (o.kind === 'board-replace') {
          elements = o.elements;
          for (const el of elements)
            if (el.type === 'image' && el.src && !imgCache.has(el.src)) {
              const im = new Image();
              im.src = el.src;
              imgCache.set(el.src, im);
            }
        } else if (o.kind === 'element-delete') {
          elements = elements.filter((x) => x.id !== o.id);
        } else if (o.kind === 'element-upsert') {
          const inc = o.element;
          const i = elements.findIndex((x) => x.id === inc.id);
          if (i < 0) elements.push(inc);
          else {
            const cur = elements[i];
            const cr = cur.rev || 0;
            const ir = inc.rev || 0;
            // CRDT LWW: mayor rev gana; empate → mayor updatedBy
            if (ir > cr || (ir === cr && (inc.updatedBy || '') >= (cur.updatedBy || ''))) elements[i] = inc;
          }
          lamport = Math.max(lamport, inc.rev || 0);
        }
        snapshotElements();
        redrawWithCursors();
        applyingRemote = false;
      });
      es.onerror = () => {
        try {
          es && es.close();
        } catch {}
        es = null;
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30_000);
      };
    } catch {
      /* sin SSE */
    }
  };

  snapshotElements();
  connect();
  window.addEventListener('beforeunload', () => {
    clearInterval(collabPoll);
    clearTimeout(reconnectTimer);
    for (const id of myLocks) op({ kind: 'unlock', elementId: id });
    try {
      es && es.close();
    } catch {}
  });

  fit();
  redrawWithCursors();
  window.addEventListener('resize', fit);
};

/* ── side-by-side diff modal ─────────────────────────────────────────────── */
const showDiff = (root, la, ea, lb, eb) => {
  const ids = (arr) => new Set(arr.map((e) => e.id));
  const A = ids(ea);
  const B = ids(eb);
  const added = eb.filter((e) => !A.has(e.id)).length;
  const removed = ea.filter((e) => !B.has(e.id)).length;
  const m = document.createElement('div');
  m.className = 'wb-diff-modal';
  m.innerHTML = `
    <div class="wb-diff-card">
      <div class="row spread" style="margin-bottom:10px;">
        <h3 style="margin:0;">🔀 Comparar versiones</h3>
        <button class="btn ghost tiny" id="wb-diff-close">✕</button>
      </div>
      <div class="small muted" style="margin-bottom:10px;">+${added} elementos agregados · −${removed} eliminados</div>
      <div class="wb-diff-cols">
        <div><div class="tiny muted">${escape(la)}</div><canvas id="dca" width="380" height="280"></canvas></div>
        <div><div class="tiny muted">${escape(lb)}</div><canvas id="dcb" width="380" height="280"></canvas></div>
      </div>
    </div>`;
  document.body.appendChild(m);
  const mini = (cid, els) => {
    const c = m.querySelector('#' + cid);
    const x = c.getContext('2d');
    const xs = els.flatMap((e) => {
      const b = bbox(e);
      return [b.x, b.x + b.w];
    });
    const ys = els.flatMap((e) => {
      const b = bbox(e);
      return [b.y, b.y + b.h];
    });
    const minX = Math.min(0, ...xs);
    const minY = Math.min(0, ...ys);
    const w = Math.max(400, Math.max(...xs, 400) - minX);
    const h = Math.max(300, Math.max(...ys, 300) - minY);
    const sc = Math.min(380 / w, 280 / h);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#16322b';
    x.fillRect(0, 0, 380, 280);
    x.setTransform(sc, 0, 0, sc, -minX * sc, -minY * sc);
    const prev = elements;
    elements = els;
    for (const e of els) drawEl(x, e);
    elements = prev;
  };
  mini('dca', ea);
  mini('dcb', eb);
  m.querySelector('#wb-diff-close').addEventListener('click', () => m.remove());
  m.addEventListener('click', (e) => {
    if (e.target === m) m.remove();
  });
};

const REC = (r) =>
  !r
    ? ''
    : r.kind === 'daily'
      ? `${r.times}×/día`
      : r.kind === 'weekly'
        ? `${r.times}×/sem`
        : r.kind === 'continuous'
          ? 'continuo'
          : r.kind === 'hourly'
            ? `cada ${r.everyHours}h`
            : 'una vez';
const loadDirectives = async (root) => {
  try {
    const dirs = await api('/api/directives');
    root.querySelector('#wb-dir-count').textContent = String(dirs.length);
    const host = root.querySelector('#wb-dir-list');
    if (!dirs.length) {
      host.innerHTML = '<div class="muted small">Sin directivas aún.</div>';
      return;
    }
    host.innerHTML = dirs
      .map(
        (d) => `
      <div class="wb-dir-row">
        <div style="flex:1;min-width:0;">
          <div class="small" style="font-weight:600;">"${escape(d.rawText)}"</div>
          <div class="tiny muted">${escape(d.interpretation)}</div>
          <div class="meta" style="margin-top:3px;"><span class="tag tiny ${d.status === 'active' ? 'ok' : 'warn'}">${escape(d.status)}</span><span class="tag accent tiny">${escape(REC(d.recurrence))}</span></div>
        </div>
        <div class="btn-row" style="flex-direction:column;gap:4px;flex-shrink:0;">
          <button class="btn ghost tiny" data-edit="${escape(d.id)}">✏️</button>
          <button class="btn ghost tiny" data-del="${escape(d.id)}">🗑</button>
        </div>
      </div>`,
      )
      .join('');
    host.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        await api(`/api/directives/${b.dataset.del}/delete`, { method: 'POST' });
        toast('Eliminada', 'ok');
        await loadDirectives(root);
      }),
    );
    host.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', async () => {
        const d = dirs.find((x) => x.id === b.dataset.edit);
        const nt = prompt('Editar la indicación:', d?.rawText || '');
        if (nt && nt.trim() && nt !== d.rawText) {
          await api(`/api/directives/${b.dataset.edit}/delete`, { method: 'POST' });
          await api('/api/directives', { method: 'POST', body: { text: nt.trim(), source: 'pizarra' } });
          toast('Actualizada', 'ok');
          await loadDirectives(root);
        }
      }),
    );
  } catch {
    /* ignore */
  }
};
