const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s)),content=$("#content"),api=async(s,i={})=>{const a=await fetch(s,{method:i.method??"GET",headers:{"content-type":"application/json"},body:i.body?JSON.stringify(i.body):void 0});if(!a.ok)throw new Error(`${s} \u2192 ${a.status}`);return a.json()},escape=s=>String(s??"").replace(/[&<>"]/g,i=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[i]),empty=s=>`<div class="empty">${escape(s)}</div>`,renderDigest=async()=>{content.innerHTML='<p class="loading">Construyendo digest\u2026</p>';const s=await api("/api/digest"),i=s.data,a=`
    <div class="kpi-row">
      <div class="kpi"><div class="label">Conversaciones</div><div class="value">${i.conversaciones.totales}</div></div>
      <div class="kpi"><div class="label">Escaladas</div><div class="value">${i.conversaciones.escaladas}</div></div>
      <div class="kpi"><div class="label">Backlog nuevo</div><div class="value">${i.curatorBacklog.nuevos}</div></div>
      <div class="kpi"><div class="label">UGC pendientes</div><div class="value">${i.ugc.pendientes}</div></div>
      <div class="kpi"><div class="label">Experimentos corriendo</div><div class="value">${i.experimentos.corriendo}</div></div>
      <div class="kpi"><div class="label">Nurture activos</div><div class="value">${i.nurture.activos}</div></div>
    </div>`,e=i.crisis.pausado?`<div class="alert crit">\u26A0\uFE0F Publicaciones PAUSADAS por crisis. Alertas enviadas: ${i.crisis.alertasEnviadas}</div>`:"",t=s.cosasQueRequierenAtencion.length?s.cosasQueRequierenAtencion.map(o=>`<li>${escape(o)}</li>`).join(""):'<li class="muted">Nada urgente hoy \u2713</li>',n=s.cosasQuePuedenEsperar.length?s.cosasQuePuedenEsperar.map(o=>`<li>${escape(o)}</li>`).join(""):'<li class="muted">Sin pendientes</li>';content.innerHTML=`
    <div class="section">
      <div class="section-title"><h2>Digest del d\xEDa</h2><span class="muted">${escape(i.fecha)}</span></div>
      ${e}
      ${a}
      <div class="alert"><strong>${escape(s.resumenEjecutivo)}</strong></div>
      <h3>Hoy requieren tu atenci\xF3n</h3>
      <ul>${t}</ul>
      <h3>Corriendo solo</h3>
      <ul>${n}</ul>
    </div>`},renderCurator=async()=>{content.innerHTML='<p class="loading">Cargando curator\u2026</p>';const[s,i]=await Promise.all([api("/api/curator/sources"),api("/api/curator/backlog?status=nuevo")]),a=i.length?i.map(e=>`
        <div class="card" data-id="${escape(e.id)}">
          <h3>${escape(e.resumen.slice(0,80))}</h3>
          <div class="meta">
            <span class="tag info">score ${e.scoreRelevancia}</span>
            ${e.formatosSugeridos.map(t=>`<span class="tag">${escape(t)}</span>`).join("")}
          </div>
          <div class="body"><strong>Ideas derivadas:</strong><ul>${e.ideasDerivadas.map(t=>`<li>${escape(t)}</li>`).join("")}</ul></div>
          ${e.urlOriginal?`<a class="btn" href="${escape(e.urlOriginal)}" target="_blank">abrir fuente</a>`:""}
          <div class="actions">
            <button class="btn primary" data-action="approve" data-id="${escape(e.id)}">Aprobar</button>
            <button class="btn" data-action="used" data-id="${escape(e.id)}">Marcar usado</button>
          </div>
        </div>`).join(""):empty("Sin \xEDtems nuevos en el backlog. Configur\xE1 fuentes y corr\xE9 /api/scheduler/run/curator-fetch.");content.innerHTML=`
    <div class="section">
      <div class="section-title">
        <h2>Content Curator</h2>
        <span class="muted">${s.length} fuentes \xB7 ${i.length} \xEDtems nuevos</span>
      </div>
      <div class="grid">${a}</div>
    </div>`,$$('[data-action="approve"]').forEach(e=>e.addEventListener("click",async()=>{await api(`/api/curator/backlog/${e.dataset.id}/approve`,{method:"POST"}),renderCurator()})),$$('[data-action="used"]').forEach(e=>e.addEventListener("click",async()=>{await api(`/api/curator/backlog/${e.dataset.id}/used`,{method:"POST"}),renderCurator()}))},renderUgc=async()=>{content.innerHTML='<p class="loading">Cargando UGC\u2026</p>';const s=await api("/api/ugc?status=no-solicitado"),i=s.length?s.map(a=>`
        <div class="card">
          <h3>@${escape(a.autor)}</h3>
          <div class="meta">
            <span class="tag ${a.decision.riesgoLegal==="alto"?"crit":a.decision.riesgoLegal==="medio"?"warn":"ok"}">riesgo ${a.decision.riesgoLegal}</span>
            <span class="tag info">prio ${a.decision.prioridad}</span>
            ${a.decision.formatosSugeridos.map(e=>`<span class="tag">${escape(e)}</span>`).join("")}
          </div>
          <div class="body">${escape(a.decision.candidato.texto.slice(0,200))}</div>
          ${a.decision.borradorMensajePermiso?`<div class="body" style="opacity:0.7"><em>Borrador: ${escape(a.decision.borradorMensajePermiso)}</em></div>`:""}
          <div class="actions">
            <button class="btn primary" data-action="permission" data-id="${escape(a.id)}">Pedir permiso</button>
          </div>
        </div>`).join(""):empty("No hay UGC pendiente.");content.innerHTML=`<div class="section"><div class="section-title"><h2>UGC pendientes</h2></div><div class="grid">${i}</div></div>`,$$('[data-action="permission"]').forEach(a=>a.addEventListener("click",async()=>{await api(`/api/ugc/${a.dataset.id}/request-permission`,{method:"POST"}),renderUgc()}))},renderExperiments=async()=>{content.innerHTML='<p class="loading">Cargando experimentos\u2026</p>';const s=await api("/api/experiments"),i=s.length?s.map(a=>{const e=a.status==="completado"?"ok":a.status==="corriendo"?"info":a.status==="descartado"?"crit":"warn";return`
        <div class="card">
          <h3>${escape(a.hipotesis)}</h3>
          <div class="meta">
            <span class="tag ${e}">${escape(a.status)}</span>
            <span class="tag">${a.duracionDias}d</span>
          </div>
          <div class="body"><strong>Variable:</strong> ${escape(a.variableManipulada)}<br>
          <strong>M\xE9trica:</strong> ${escape(a.metricaPrimaria)}<br>
          <strong>Umbral:</strong> ${escape(a.metricaUmbralExito)}</div>
          ${a.resultados?`<div class="body"><em>${escape(a.resultados.aprendizaje)}</em></div>`:""}
          ${a.status==="dise\xF1ado"?`<div class="actions"><button class="btn primary" data-action="launch" data-id="${escape(a.id)}">Lanzar</button>
                 <button class="btn danger" data-action="discard" data-id="${escape(a.id)}">Descartar</button></div>`:""}
        </div>`}).join(""):empty("Sin experimentos. Dise\xF1\xE1 uno con la tool experimentos_disenar.");content.innerHTML=`<div class="section"><div class="section-title"><h2>Experimentos</h2></div><div class="grid">${i}</div></div>`,$$('[data-action="launch"]').forEach(a=>a.addEventListener("click",async()=>{await api(`/api/experiments/${a.dataset.id}/launch`,{method:"POST"}),renderExperiments()})),$$('[data-action="discard"]').forEach(a=>a.addEventListener("click",async()=>{const e=prompt("Motivo del descarte:")??"sin motivo";await api(`/api/experiments/${a.dataset.id}/discard`,{method:"POST",body:{motivo:e}}),renderExperiments()}))},renderCollab=async()=>{content.innerHTML='<p class="loading">Cargando collab\u2026</p>';const s=await api("/api/collab"),i=s.length?s.map(a=>`
      <div class="card">
        <h3>@${escape(a.handle)}</h3>
        <div class="meta">
          <span class="tag info">align ${a.alineacion}</span>
          <span class="tag ${a.riesgoMarca==="alto"?"crit":a.riesgoMarca==="medio"?"warn":"ok"}">riesgo ${a.riesgoMarca}</span>
          <span class="tag">${escape(a.formatoColabSugerido)}</span>
          <span class="tag">${escape(a.status)}</span>
        </div>
        <div class="body">${escape(a.motivacion)}</div>
        ${a.borradorOutreach?`<div class="body" style="opacity:0.7"><em>${escape(a.borradorOutreach)}</em></div>`:""}
      </div>`).join(""):empty("Sin prospects. Proces\xE1 observaciones con la tool procesar_creadores.");content.innerHTML=`<div class="section"><div class="section-title"><h2>Collab Manager</h2></div><div class="grid">${i}</div></div>`},renderNurture=async()=>{const[s,i]=await Promise.all([api("/api/nurture/sequences"),api("/api/nurture/enrollments?status=activo")]);content.innerHTML=`
    <div class="section">
      <div class="section-title"><h2>Nurture Sequences</h2></div>
      <h3>Secuencias (${s.length})</h3>
      <div class="grid">${s.length?s.map(a=>`
        <div class="card">
          <h3>${escape(a.nombre)}</h3>
          <div class="meta"><span class="tag">${escape(a.trigger)}</span><span class="tag">${a.pasos.length} pasos</span></div>
        </div>`).join(""):empty("Sin secuencias.")}</div>
      <h3 style="margin-top:24px">Enrollments activos (${i.length})</h3>
      ${i.length?renderTable(i,["igUserId","sequenceId","pasoActual","proximoEnvioEn"]):empty("Sin enrollments activos.")}
    </div>`},renderConversations=async()=>{const s=await api("/api/conversations");if(!s.length){content.innerHTML=`<div class="section"><div class="section-title"><h2>Conversaciones</h2></div>${empty("Sin conversaciones registradas.")}</div>`;return}content.innerHTML=`
    <div class="section">
      <div class="section-title"><h2>Conversaciones</h2><span class="muted">${s.length} usuarios</span></div>
      ${renderTable(s.sort((i,a)=>new Date(a.ultimoContacto)-new Date(i.ultimoContacto)).slice(0,50),["handle","channel","mensajesTotales","autoRepliesEnviados","escaladoAHumano","ultimoContacto"])}
    </div>`},renderCrisis=async()=>{const s=await api("/api/crisis");content.innerHTML=`
    <div class="section">
      <div class="section-title"><h2>Crisis Manager</h2></div>
      ${s.publicacionesPausadas?'<div class="alert crit"><strong>\u26A0\uFE0F PUBLICACIONES PAUSADAS</strong></div>':'<div class="alert">Operaci\xF3n normal.</div>'}
      <div class="kpi-row">
        <div class="kpi"><div class="label">Posts en observaci\xF3n</div><div class="value">${s.postsEnObservacion.length}</div></div>
        <div class="kpi"><div class="label">Alertas enviadas</div><div class="value">${s.alertasEnviadas}</div></div>
      </div>
      ${s.publicacionesPausadas?'<button class="btn primary" id="resume">Reanudar publicaciones</button>':""}
    </div>`;const i=$("#resume");i&&i.addEventListener("click",async()=>{confirm("\xBFReanudar publicaciones pausadas? Asegurate de que la crisis est\xE9 resuelta.")&&(await api("/api/crisis/resume",{method:"POST"}),renderCrisis())})},renderScheduler=async()=>{const[s,i]=await Promise.all([api("/api/scheduler/jobs"),api("/api/scheduler/runs?limit=20")]),a=s.map(e=>{const t=e.override?.cron??e.defaultCron,n=e.override?e.override.enabled:!0;return`
      <div class="card">
        <h3>${escape(e.name)}</h3>
        <div class="meta">
          <span class="tag ${n?"ok":"crit"}">${n?"activo":"deshabilitado"}</span>
          <span class="tag">${escape(t)}</span>
        </div>
        <div class="body">${escape(e.description)}</div>
        <div class="actions">
          <button class="btn primary" data-run="${escape(e.name)}">Ejecutar ahora</button>
        </div>
      </div>`}).join("");content.innerHTML=`
    <div class="section">
      <div class="section-title"><h2>Scheduler</h2><span class="muted">${s.length} jobs</span></div>
      <div class="grid">${a}</div>
      <h3 style="margin-top:24px">\xDAltimas ejecuciones</h3>
      ${i.length?renderTable(i,["name","startedAt","durationMs","ok","error"]):empty("Sin ejecuciones a\xFAn.")}
    </div>`,$$("[data-run]").forEach(e=>e.addEventListener("click",async()=>{e.textContent="Ejecutando\u2026";try{await api(`/api/scheduler/run/${e.dataset.run}`,{method:"POST"})}catch(t){alert(t.message)}renderScheduler()}))},renderTable=(s,i)=>{const a=i.map(t=>`<th>${escape(t)}</th>`).join(""),e=s.map(t=>`<tr>${i.map(n=>`<td>${escape(formatCell(t[n]))}</td>`).join("")}</tr>`).join("");return`<table><thead><tr>${a}</tr></thead><tbody>${e}</tbody></table>`},formatCell=s=>s==null?"\u2014":typeof s=="boolean"?s?"\u2713":"\xB7":typeof s=="number"?s.toLocaleString():String(s),tabs={digest:renderDigest,curator:renderCurator,ugc:renderUgc,experiments:renderExperiments,collab:renderCollab,nurture:renderNurture,conversations:renderConversations,crisis:renderCrisis,scheduler:renderScheduler},switchTab=s=>{$$("nav button").forEach(a=>a.classList.toggle("active",a.dataset.tab===s));const i=tabs[s];i&&i().catch(a=>{content.innerHTML=`<div class="alert crit">Error: ${escape(a.message)}</div>`})};$$("nav button").forEach(s=>s.addEventListener("click",()=>switchTab(s.dataset.tab))),switchTab("digest");
