import{api as c}from"../lib/api.js";import{escape as r}from"../lib/dom.js";import{fmt as l}from"../lib/dom.js";import{toast as d}from"../lib/toast.js";let s={experiments:[],tab:"active"};const b={active:"ok",pendiente:"warn",completado:"info",cancelado:"crit"},u=e=>{const t=e.ganador?`<span class="tag ok">Ganador: ${r(e.ganador)}</span>`:"";return`
    <div class="experiment-card card">
      <div class="meta">
        <span class="tag ${b[e.status]??"info"}">${r(e.status??"pendiente")}</span>
        <span class="tag">${r(e.tipo??"A/B")}</span>
        ${t}
        <span class="tiny muted">${l.rel(e.creadoEn)}</span>
      </div>
      <h3>${r(e.nombre??"Experimento sin nombre")}</h3>
      <div class="body" style="margin-bottom:12px;">${r(e.hipotesis??"")}</div>

      ${e.variantes?.length?`
        <div class="variants-grid">
          ${e.variantes.map(a=>`
            <div class="variant-card ${a.id===e.ganador?"winner":""}">
              <div class="small" style="font-weight:600;">${r(a.nombre??a.id)}</div>
              ${a.metricas?`
                <div class="variant-metrics">
                  ${a.metricas.engagementRate!==void 0?`<div class="tiny"><span class="muted">ER</span> ${a.metricas.engagementRate}%</div>`:""}
                  ${a.metricas.alcance!==void 0?`<div class="tiny"><span class="muted">Alcance</span> ${l.num(a.metricas.alcance)}</div>`:""}
                  ${a.metricas.saves!==void 0?`<div class="tiny"><span class="muted">Saves</span> ${l.num(a.metricas.saves)}</div>`:""}
                </div>`:'<div class="tiny muted">Sin datos a\xFAn</div>'}
            </div>`).join("")}
        </div>`:""}

      ${e.status==="active"||e.status==="pendiente"?`
        <div class="btn-row" style="margin-top:12px;">
          ${e.status==="pendiente"?`<button class="btn primary tiny launch-btn" data-id="${r(e.id??"")}">\u25B6 Lanzar</button>`:""}
          ${e.status==="active"?`<button class="btn ghost tiny complete-btn" data-id="${r(e.id??"")}">\u2713 Completar</button>`:""}
        </div>`:""}
    </div>`},v=()=>{const e=s.experiments.filter(t=>s.tab==="all"?!0:s.tab==="active"?t.status==="active"||t.status==="pendiente":t.status===s.tab);return e.length?e.map(u).join(""):`<div class="empty">Sin experimentos con estado "${s.tab}".</div>`},g=()=>{const e={active:s.experiments.filter(t=>t.status==="active"||t.status==="pendiente").length,completado:s.experiments.filter(t=>t.status==="completado").length,all:s.experiments.length};return`
    <div class="tab-bar">
      <button class="tab-btn ${s.tab==="active"?"active":""}" data-tab="active">\u{1F52C} Activos (${e.active})</button>
      <button class="tab-btn ${s.tab==="completado"?"active":""}" data-tab="completado">\u2705 Completados (${e.completado})</button>
      <button class="tab-btn ${s.tab==="all"?"active":""}" data-tab="all">\u{1F4CB} Todos (${e.all})</button>
    </div>`},p=e=>{const t=e.querySelector("#exp-content");t&&(t.innerHTML=`
    ${g()}
    <div class="btn-row" style="margin:14px 0;">
      <button class="btn primary" id="design-btn">\u{1F9EA} Dise\xF1ar experimento</button>
      <button class="btn ghost" id="refresh-btn">\u21BB Refrescar</button>
    </div>
    <div id="exp-list">${v()}</div>`,y(e,t))},y=(e,t)=>{t.querySelectorAll(".tab-btn").forEach(a=>a.addEventListener("click",()=>{s.tab=a.dataset.tab,p(e)})),t.querySelector("#refresh-btn")?.addEventListener("click",()=>o(e)),t.querySelector("#design-btn")?.addEventListener("click",async()=>{const a=prompt("\xBFQu\xE9 quer\xE9s mejorar? (ej: tasa de guardados en carruseles de tips)");if(!a)return;const n=t.querySelector("#design-btn");n.disabled=!0,n.innerHTML='<span class="spinner"></span> dise\xF1ando\u2026';try{const i=await c("/api/experiments/design",{body:{objetivo:a}});d(`Experimento dise\xF1ado: ${i.experiment?.nombre??"listo"}`,"ok"),await o(e)}catch(i){d(i.message,"crit")}finally{n.disabled=!1,n.innerHTML="\u{1F9EA} Dise\xF1ar experimento"}}),t.querySelectorAll(".launch-btn").forEach(a=>a.addEventListener("click",async()=>{const n=a.dataset.id;a.disabled=!0;try{await c("/api/experiments/launch",{body:{experimentId:n}});const i=s.experiments.find(m=>m.id===n);i&&(i.status="active"),p(e),d("Experimento lanzado","ok")}catch(i){d(i.message,"crit"),a.disabled=!1}})),t.querySelectorAll(".complete-btn").forEach(a=>a.addEventListener("click",async()=>{const n=a.dataset.id;a.disabled=!0;try{const i=await c("/api/experiments/complete",{body:{experimentId:n}});d(`Experimento completado. Ganador: ${i.ganador??"N/A"}`,"ok"),await o(e)}catch(i){d(i.message,"crit"),a.disabled=!1}}))},o=async e=>{try{const t=await c("/api/experiments/list");s.experiments=t.experiments??[],p(e)}catch{const t=e.querySelector("#exp-content");t&&(t.innerHTML='<div class="empty muted">Sin experimentos disponibles todav\xEDa.</div>')}};export const renderExperiments=async e=>{s={experiments:[],tab:"active"},e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Growth Experiments</h1>
        <p class="view-subtitle page-subtitle">Dise\xF1\xE1 y segu\xED experimentos A/B para optimizar tu crecimiento.</p>
      </div>
    </header>
    <div id="exp-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando\u2026</div></div>`,await o(e)};
