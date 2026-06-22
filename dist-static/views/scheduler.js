import{api as c}from"../lib/api.js";import{escape as t}from"../lib/dom.js";import{fmt as o}from"../lib/dom.js";import{toast as d}from"../lib/toast.js";let n={jobs:[],runs:[]};const u={"digest-diario":"\u{1F4F0}","curator-fetch":"\u{1F310}","nurture-ejecutar":"\u{1F48C}","bot-poll":"\u{1F916}","ugc-expirar":"\u{1F4F8}","autopilot-semanal":"\u{1F680}"},v=e=>{const a=u[e.name]??"\u2699\uFE0F",s=n.runs.filter(i=>i.job===e.name).sort((i,r)=>new Date(r.startedAt)-new Date(i.startedAt))[0];return`
    <div class="job-card card">
      <div class="job-header">
        <div class="job-icon">${a}</div>
        <div class="job-info">
          <div class="small" style="font-weight:600;">${t(e.name)}</div>
          <div class="tiny muted">${t(e.cronExpr??"")}</div>
          ${s?`<div class="tiny muted">\xDAltima ejecuci\xF3n: ${o.rel(s.startedAt)} \u2014 <span class="tag tiny ${s.status==="ok"?"ok":"crit"}">${t(s.status)}</span></div>`:'<div class="tiny muted">Sin ejecuciones registradas</div>'}
        </div>
        <div class="job-actions">
          <span class="tag ${e.running?"warn":"ok"}">${e.running?"ejecutando":"listo"}</span>
          <button class="btn ghost tiny run-btn" data-name="${t(e.name)}" ${e.running?"disabled":""}>\u25B6 Ejecutar</button>
        </div>
      </div>
      ${e.description?`<div class="tiny muted" style="margin-top:6px;">${t(e.description)}</div>`:""}
    </div>`},m=()=>n.runs.length?`
    <div class="runs-log">
      ${n.runs.slice(0,20).map(e=>`
        <div class="run-row">
          <span class="run-icon">${u[e.job]??"\u2699\uFE0F"}</span>
          <span class="small run-job">${t(e.job)}</span>
          <span class="tag tiny ${e.status==="ok"?"ok":e.status==="running"?"warn":"crit"}">${t(e.status)}</span>
          <span class="tiny muted">${o.rel(e.startedAt)}</span>
          ${e.duration?`<span class="tiny muted">${e.duration}ms</span>`:""}
          ${e.error?`<span class="tiny crit" title="${t(e.error)}">\u26A0\uFE0F</span>`:""}
        </div>`).join("")}
    </div>`:'<div class="empty muted small">Sin ejecuciones registradas todav\xEDa.</div>',b=()=>`
  <div class="card" style="margin-bottom:14px;">
    <h3>\u2699\uFE0F Override de jobs</h3>
    <p class="small muted" style="margin-bottom:12px;">Modific\xE1 temporalmente la expresi\xF3n cron de un job sin reiniciar el servidor.</p>
    <div class="field-row">
      <select class="field-select" id="override-job" style="flex:1;">
        ${n.jobs.map(e=>`<option value="${t(e.name)}">${t(e.name)}</option>`).join("")}
      </select>
      <input class="field-input" id="override-cron" type="text" placeholder="*/5 * * * *" style="flex:1;"/>
      <button class="btn ghost" id="apply-override-btn">Aplicar</button>
    </div>
  </div>`,y=e=>{const a=e.querySelector("#scheduler-content");a&&(a.innerHTML=`
    <div class="scheduler-grid">
      <div>
        <div class="col-header" style="margin-bottom:12px;"><h3>\u{1F4CB} Jobs configurados</h3></div>
        ${n.jobs.map(v).join("")}
        ${b()}
      </div>
      <div>
        <div class="col-header" style="margin-bottom:12px;"><h3>\u{1F4DC} Log de ejecuciones</h3></div>
        <div class="card" style="padding:0;">
          <div class="list-inner">${m()}</div>
        </div>
      </div>
    </div>`,g(e,a))},g=(e,a)=>{a.querySelectorAll(".run-btn").forEach(s=>s.addEventListener("click",async()=>{const i=s.dataset.name;s.disabled=!0,s.innerHTML='<span class="spinner"></span>';try{await c("/api/scheduler/run",{body:{jobName:i}}),d(`Job "${i}" ejecutado`,"ok"),await l(e)}catch(r){d(r.message,"crit"),s.disabled=!1,s.innerHTML="\u25B6 Ejecutar"}})),a.querySelector("#apply-override-btn")?.addEventListener("click",async()=>{const s=a.querySelector("#override-job")?.value,i=a.querySelector("#override-cron")?.value.trim();if(!i){d("Ingres\xE1 una expresi\xF3n cron","crit");return}const r=a.querySelector("#apply-override-btn");r.disabled=!0;try{await c("/api/scheduler/override",{body:{jobName:s,cronExpr:i}}),d(`Override aplicado a "${s}"`,"ok"),await l(e)}catch(p){d(p.message,"crit")}finally{r.disabled=!1}})},l=async e=>{try{const[a,s]=await Promise.allSettled([c("/api/scheduler/jobs"),c("/api/scheduler/runs")]);n.jobs=a.status==="fulfilled"?a.value.jobs??[]:[],n.runs=s.status==="fulfilled"?s.value.runs??[]:[],y(e)}catch(a){d(a.message,"crit")}};export const renderScheduler=async e=>{n={jobs:[],runs:[]},e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Scheduler</h1>
        <p class="view-subtitle page-subtitle">Gestion\xE1 y ejecut\xE1 jobs cron del agente manualmente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="refresh-sch-btn">\u21BB Actualizar</button>
      </div>
    </header>
    <div id="scheduler-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando\u2026</div></div>`,e.querySelector("#refresh-sch-btn")?.addEventListener("click",()=>l(e)),await l(e)};
