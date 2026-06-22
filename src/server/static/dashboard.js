const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const content = $('#content');

const api = async (path, opts = {}) => {
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers: { 'content-type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
};

const escape = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const empty = (msg) => `<div class="empty">${escape(msg)}</div>`;

const renderDigest = async () => {
  content.innerHTML = '<p class="loading">Construyendo digest…</p>';
  const digest = await api('/api/digest');
  const d = digest.data;
  const kpis = `
    <div class="kpi-row">
      <div class="kpi"><div class="label">Conversaciones</div><div class="value">${d.conversaciones.totales}</div></div>
      <div class="kpi"><div class="label">Escaladas</div><div class="value">${d.conversaciones.escaladas}</div></div>
      <div class="kpi"><div class="label">Backlog nuevo</div><div class="value">${d.curatorBacklog.nuevos}</div></div>
      <div class="kpi"><div class="label">UGC pendientes</div><div class="value">${d.ugc.pendientes}</div></div>
      <div class="kpi"><div class="label">Experimentos corriendo</div><div class="value">${d.experimentos.corriendo}</div></div>
      <div class="kpi"><div class="label">Nurture activos</div><div class="value">${d.nurture.activos}</div></div>
    </div>`;
  const crisisAlert = d.crisis.pausado
    ? `<div class="alert crit">⚠️ Publicaciones PAUSADAS por crisis. Alertas enviadas: ${d.crisis.alertasEnviadas}</div>`
    : '';
  const atencion = digest.cosasQueRequierenAtencion.length
    ? digest.cosasQueRequierenAtencion.map((x) => `<li>${escape(x)}</li>`).join('')
    : '<li class="muted">Nada urgente hoy ✓</li>';
  const otros = digest.cosasQuePuedenEsperar.length
    ? digest.cosasQuePuedenEsperar.map((x) => `<li>${escape(x)}</li>`).join('')
    : '<li class="muted">Sin pendientes</li>';
  content.innerHTML = `
    <div class="section">
      <div class="section-title"><h2>Digest del día</h2><span class="muted">${escape(d.fecha)}</span></div>
      ${crisisAlert}
      ${kpis}
      <div class="alert"><strong>${escape(digest.resumenEjecutivo)}</strong></div>
      <h3>Hoy requieren tu atención</h3>
      <ul>${atencion}</ul>
      <h3>Corriendo solo</h3>
      <ul>${otros}</ul>
    </div>`;
};

const renderCurator = async () => {
  content.innerHTML = '<p class="loading">Cargando curator…</p>';
  const [sources, backlog] = await Promise.all([api('/api/curator/sources'), api('/api/curator/backlog?status=nuevo')]);
  const cards = backlog.length
    ? backlog
        .map(
          (b) => `
        <div class="card" data-id="${escape(b.id)}">
          <h3>${escape(b.resumen.slice(0, 80))}</h3>
          <div class="meta">
            <span class="tag info">score ${b.scoreRelevancia}</span>
            ${b.formatosSugeridos.map((f) => `<span class="tag">${escape(f)}</span>`).join('')}
          </div>
          <div class="body"><strong>Ideas derivadas:</strong><ul>${b.ideasDerivadas.map((i) => `<li>${escape(i)}</li>`).join('')}</ul></div>
          ${b.urlOriginal ? `<a class="btn" href="${escape(b.urlOriginal)}" target="_blank">abrir fuente</a>` : ''}
          <div class="actions">
            <button class="btn primary" data-action="approve" data-id="${escape(b.id)}">Aprobar</button>
            <button class="btn" data-action="used" data-id="${escape(b.id)}">Marcar usado</button>
          </div>
        </div>`,
        )
        .join('')
    : empty('Sin ítems nuevos en el backlog. Configurá fuentes y corré /api/scheduler/run/curator-fetch.');
  content.innerHTML = `
    <div class="section">
      <div class="section-title">
        <h2>Content Curator</h2>
        <span class="muted">${sources.length} fuentes · ${backlog.length} ítems nuevos</span>
      </div>
      <div class="grid">${cards}</div>
    </div>`;
  $$('[data-action="approve"]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api(`/api/curator/backlog/${b.dataset.id}/approve`, { method: 'POST' });
      renderCurator();
    }),
  );
  $$('[data-action="used"]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api(`/api/curator/backlog/${b.dataset.id}/used`, { method: 'POST' });
      renderCurator();
    }),
  );
};

const renderUgc = async () => {
  content.innerHTML = '<p class="loading">Cargando UGC…</p>';
  const items = await api('/api/ugc?status=no-solicitado');
  const cards = items.length
    ? items
        .map(
          (it) => `
        <div class="card">
          <h3>@${escape(it.autor)}</h3>
          <div class="meta">
            <span class="tag ${it.decision.riesgoLegal === 'alto' ? 'crit' : it.decision.riesgoLegal === 'medio' ? 'warn' : 'ok'}">riesgo ${it.decision.riesgoLegal}</span>
            <span class="tag info">prio ${it.decision.prioridad}</span>
            ${it.decision.formatosSugeridos.map((f) => `<span class="tag">${escape(f)}</span>`).join('')}
          </div>
          <div class="body">${escape(it.decision.candidato.texto.slice(0, 200))}</div>
          ${it.decision.borradorMensajePermiso ? `<div class="body" style="opacity:0.7"><em>Borrador: ${escape(it.decision.borradorMensajePermiso)}</em></div>` : ''}
          <div class="actions">
            <button class="btn primary" data-action="permission" data-id="${escape(it.id)}">Pedir permiso</button>
          </div>
        </div>`,
        )
        .join('')
    : empty('No hay UGC pendiente.');
  content.innerHTML = `<div class="section"><div class="section-title"><h2>UGC pendientes</h2></div><div class="grid">${cards}</div></div>`;
  $$('[data-action="permission"]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api(`/api/ugc/${b.dataset.id}/request-permission`, { method: 'POST' });
      renderUgc();
    }),
  );
};

const renderExperiments = async () => {
  content.innerHTML = '<p class="loading">Cargando experimentos…</p>';
  const exps = await api('/api/experiments');
  const cards = exps.length
    ? exps
        .map((e) => {
          const statusClass =
            e.status === 'completado'
              ? 'ok'
              : e.status === 'corriendo'
                ? 'info'
                : e.status === 'descartado'
                  ? 'crit'
                  : 'warn';
          return `
        <div class="card">
          <h3>${escape(e.hipotesis)}</h3>
          <div class="meta">
            <span class="tag ${statusClass}">${escape(e.status)}</span>
            <span class="tag">${e.duracionDias}d</span>
          </div>
          <div class="body"><strong>Variable:</strong> ${escape(e.variableManipulada)}<br>
          <strong>Métrica:</strong> ${escape(e.metricaPrimaria)}<br>
          <strong>Umbral:</strong> ${escape(e.metricaUmbralExito)}</div>
          ${e.resultados ? `<div class="body"><em>${escape(e.resultados.aprendizaje)}</em></div>` : ''}
          ${
            e.status === 'diseñado'
              ? `<div class="actions"><button class="btn primary" data-action="launch" data-id="${escape(e.id)}">Lanzar</button>
                 <button class="btn danger" data-action="discard" data-id="${escape(e.id)}">Descartar</button></div>`
              : ''
          }
        </div>`;
        })
        .join('')
    : empty('Sin experimentos. Diseñá uno con la tool experimentos_disenar.');
  content.innerHTML = `<div class="section"><div class="section-title"><h2>Experimentos</h2></div><div class="grid">${cards}</div></div>`;
  $$('[data-action="launch"]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api(`/api/experiments/${b.dataset.id}/launch`, { method: 'POST' });
      renderExperiments();
    }),
  );
  $$('[data-action="discard"]').forEach((b) =>
    b.addEventListener('click', async () => {
      const motivo = prompt('Motivo del descarte:') ?? 'sin motivo';
      await api(`/api/experiments/${b.dataset.id}/discard`, { method: 'POST', body: { motivo } });
      renderExperiments();
    }),
  );
};

const renderCollab = async () => {
  content.innerHTML = '<p class="loading">Cargando collab…</p>';
  const items = await api('/api/collab');
  const cards = items.length
    ? items
        .map(
          (p) => `
      <div class="card">
        <h3>@${escape(p.handle)}</h3>
        <div class="meta">
          <span class="tag info">align ${p.alineacion}</span>
          <span class="tag ${p.riesgoMarca === 'alto' ? 'crit' : p.riesgoMarca === 'medio' ? 'warn' : 'ok'}">riesgo ${p.riesgoMarca}</span>
          <span class="tag">${escape(p.formatoColabSugerido)}</span>
          <span class="tag">${escape(p.status)}</span>
        </div>
        <div class="body">${escape(p.motivacion)}</div>
        ${p.borradorOutreach ? `<div class="body" style="opacity:0.7"><em>${escape(p.borradorOutreach)}</em></div>` : ''}
      </div>`,
        )
        .join('')
    : empty('Sin prospects. Procesá observaciones con la tool procesar_creadores.');
  content.innerHTML = `<div class="section"><div class="section-title"><h2>Collab Manager</h2></div><div class="grid">${cards}</div></div>`;
};

const renderNurture = async () => {
  const [seqs, enrolls] = await Promise.all([
    api('/api/nurture/sequences'),
    api('/api/nurture/enrollments?status=activo'),
  ]);
  content.innerHTML = `
    <div class="section">
      <div class="section-title"><h2>Nurture Sequences</h2></div>
      <h3>Secuencias (${seqs.length})</h3>
      <div class="grid">${
        seqs.length
          ? seqs
              .map(
                (s) => `
        <div class="card">
          <h3>${escape(s.nombre)}</h3>
          <div class="meta"><span class="tag">${escape(s.trigger)}</span><span class="tag">${s.pasos.length} pasos</span></div>
        </div>`,
              )
              .join('')
          : empty('Sin secuencias.')
      }</div>
      <h3 style="margin-top:24px">Enrollments activos (${enrolls.length})</h3>
      ${enrolls.length ? renderTable(enrolls, ['igUserId', 'sequenceId', 'pasoActual', 'proximoEnvioEn']) : empty('Sin enrollments activos.')}
    </div>`;
};

const renderConversations = async () => {
  const ctxs = await api('/api/conversations');
  if (!ctxs.length) {
    content.innerHTML = `<div class="section"><div class="section-title"><h2>Conversaciones</h2></div>${empty('Sin conversaciones registradas.')}</div>`;
    return;
  }
  content.innerHTML = `
    <div class="section">
      <div class="section-title"><h2>Conversaciones</h2><span class="muted">${ctxs.length} usuarios</span></div>
      ${renderTable(ctxs.sort((a, b) => new Date(b.ultimoContacto) - new Date(a.ultimoContacto)).slice(0, 50), [
        'handle',
        'channel',
        'mensajesTotales',
        'autoRepliesEnviados',
        'escaladoAHumano',
        'ultimoContacto',
      ])}
    </div>`;
};

const renderCrisis = async () => {
  const state = await api('/api/crisis');
  content.innerHTML = `
    <div class="section">
      <div class="section-title"><h2>Crisis Manager</h2></div>
      ${state.publicacionesPausadas ? '<div class="alert crit"><strong>⚠️ PUBLICACIONES PAUSADAS</strong></div>' : '<div class="alert">Operación normal.</div>'}
      <div class="kpi-row">
        <div class="kpi"><div class="label">Posts en observación</div><div class="value">${state.postsEnObservacion.length}</div></div>
        <div class="kpi"><div class="label">Alertas enviadas</div><div class="value">${state.alertasEnviadas}</div></div>
      </div>
      ${state.publicacionesPausadas ? '<button class="btn primary" id="resume">Reanudar publicaciones</button>' : ''}
    </div>`;
  const btn = $('#resume');
  if (btn)
    btn.addEventListener('click', async () => {
      if (!confirm('¿Reanudar publicaciones pausadas? Asegurate de que la crisis esté resuelta.')) return;
      await api('/api/crisis/resume', { method: 'POST' });
      renderCrisis();
    });
};

const renderScheduler = async () => {
  const [jobs, runs] = await Promise.all([api('/api/scheduler/jobs'), api('/api/scheduler/runs?limit=20')]);
  const jobCards = jobs
    .map((j) => {
      const expr = j.override?.cron ?? j.defaultCron;
      const enabled = j.override ? j.override.enabled : true;
      return `
      <div class="card">
        <h3>${escape(j.name)}</h3>
        <div class="meta">
          <span class="tag ${enabled ? 'ok' : 'crit'}">${enabled ? 'activo' : 'deshabilitado'}</span>
          <span class="tag">${escape(expr)}</span>
        </div>
        <div class="body">${escape(j.description)}</div>
        <div class="actions">
          <button class="btn primary" data-run="${escape(j.name)}">Ejecutar ahora</button>
        </div>
      </div>`;
    })
    .join('');
  content.innerHTML = `
    <div class="section">
      <div class="section-title"><h2>Scheduler</h2><span class="muted">${jobs.length} jobs</span></div>
      <div class="grid">${jobCards}</div>
      <h3 style="margin-top:24px">Últimas ejecuciones</h3>
      ${runs.length ? renderTable(runs, ['name', 'startedAt', 'durationMs', 'ok', 'error']) : empty('Sin ejecuciones aún.')}
    </div>`;
  $$('[data-run]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.textContent = 'Ejecutando…';
      try {
        await api(`/api/scheduler/run/${b.dataset.run}`, { method: 'POST' });
      } catch (err) {
        alert(err.message);
      }
      renderScheduler();
    }),
  );
};

const renderTable = (rows, cols) => {
  const head = cols.map((c) => `<th>${escape(c)}</th>`).join('');
  const body = rows.map((r) => `<tr>${cols.map((c) => `<td>${escape(formatCell(r[c]))}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
};

const formatCell = (v) => {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'boolean') return v ? '✓' : '·';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
};

const tabs = {
  digest: renderDigest,
  curator: renderCurator,
  ugc: renderUgc,
  experiments: renderExperiments,
  collab: renderCollab,
  nurture: renderNurture,
  conversations: renderConversations,
  crisis: renderCrisis,
  scheduler: renderScheduler,
};

const switchTab = (tab) => {
  $$('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const fn = tabs[tab];
  if (fn)
    fn().catch((err) => {
      content.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
    });
};

$$('nav button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

switchTab('digest');
