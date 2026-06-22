import{api as d}from"../lib/api.js";import{escape as i}from"../lib/dom.js";import{fmt as u}from"../lib/dom.js";import{toast as o}from"../lib/toast.js";let s={prospects:[],tab:"prospects"};const p={nuevo:"info",contactado:"warn",negociando:"accent",confirmado:"ok",rechazado:"crit",completado:"muted"},v=a=>`
  <div class="collab-card card">
    <div class="meta">
      <span class="tag ${p[a.status]??"info"}">${i(a.status??"nuevo")}</span>
      ${a.nicho?`<span class="tag">${i(a.nicho)}</span>`:""}
      <span class="tiny muted">${u.rel(a.creadoEn)}</span>
    </div>
    <div class="collab-header">
      <div class="collab-avatar">${i((a.handle??"@?").charAt(1).toUpperCase())}</div>
      <div>
        <div class="small" style="font-weight:600;">${i(a.handle??"desconocido")}</div>
        ${a.seguidores?`<div class="tiny muted">${u.num(a.seguidores)} seguidores</div>`:""}
        ${a.engagementRate?`<div class="tiny muted">ER: ${a.engagementRate}%</div>`:""}
      </div>
      ${a.score?`
        <div class="collab-score" style="margin-left:auto;">
          <div class="score-num-sm">${a.score}</div>
          <div class="tiny muted">score</div>
        </div>`:""}
    </div>
    ${a.propuesta?`
      <div class="small muted" style="margin-top:8px;border-left:2px solid var(--border);padding-left:8px;">
        ${i(a.propuesta)}
      </div>`:""}
    ${a.notas?`<div class="tiny muted" style="margin-top:6px;">\u{1F4DD} ${i(a.notas)}</div>`:""}
    <div class="btn-row" style="margin-top:12px;">
      ${a.status==="nuevo"?`<button class="btn primary tiny outreach-btn" data-id="${i(a.id??"")}">\u{1F4EC} Enviar outreach</button>`:""}
      ${a.status==="negociando"?`<button class="btn primary tiny respond-btn" data-id="${i(a.id??"")}">\u{1F4AC} Responder negociaci\xF3n</button>`:""}
      ${a.status==="contactado"?`<button class="btn ghost tiny mark-neg-btn" data-id="${i(a.id??"")}">\u2192 Marcar en negociaci\xF3n</button>`:""}
      ${a.status==="negociando"?`<button class="btn ghost tiny confirm-btn" data-id="${i(a.id??"")}">\u2713 Confirmar collab</button>`:""}
    </div>
  </div>`,m=()=>{const a=s.tab==="all"?s.prospects:s.tab==="active"?s.prospects.filter(t=>["nuevo","contactado","negociando"].includes(t.status)):s.prospects.filter(t=>t.status===s.tab);return a.length?a.map(v).join(""):`<div class="empty">Sin collabs con estado "${s.tab}".</div>`},f=()=>{const a=s.prospects.filter(t=>["nuevo","contactado","negociando"].includes(t.status)).length;return`
    <div class="tab-bar">
      <button class="tab-btn ${s.tab==="active"?"active":""}" data-tab="active">\u26A1 Activos (${a})</button>
      <button class="tab-btn ${s.tab==="confirmado"?"active":""}" data-tab="confirmado">\u2705 Confirmados</button>
      <button class="tab-btn ${s.tab==="all"?"active":""}" data-tab="all">\u{1F4CB} Todos (${s.prospects.length})</button>
    </div>`},l=a=>{const t=a.querySelector("#collab-content");t&&(t.innerHTML=`
    ${f()}
    <div class="btn-row" style="margin:14px 0;">
      <button class="btn primary" id="find-btn">\u{1F50D} Encontrar creadores</button>
      <button class="btn ghost" id="refresh-btn">\u21BB Refrescar</button>
    </div>
    <div id="collab-list">${m()}</div>`,g(a,t))},g=(a,t)=>{t.querySelectorAll(".tab-btn").forEach(e=>e.addEventListener("click",()=>{s.tab=e.dataset.tab,l(a)})),t.querySelector("#refresh-btn")?.addEventListener("click",()=>b(a)),t.querySelector("#find-btn")?.addEventListener("click",async()=>{const e=prompt("\xBFNicho o tema para buscar creadores? (ej: marketing digital, fitness, finanzas)");if(!e)return;const c=t.querySelector("#find-btn");c.disabled=!0,c.innerHTML='<span class="spinner"></span> buscando\u2026';try{const n=await d("/api/collab/find",{body:{nicho:e}});o(`${n.found??0} creadores encontrados`,"ok"),await b(a)}catch(n){o(n.message,"crit")}finally{c.disabled=!1,c.innerHTML="\u{1F50D} Encontrar creadores"}}),t.querySelectorAll(".outreach-btn").forEach(e=>e.addEventListener("click",async()=>{const c=e.dataset.id;e.disabled=!0;try{await d("/api/collab/outreach",{body:{prospectId:c}});const n=s.prospects.find(r=>r.id===c);n&&(n.status="contactado"),l(a),o("Outreach enviado","ok")}catch(n){o(n.message,"crit"),e.disabled=!1}})),t.querySelectorAll(".respond-btn").forEach(e=>e.addEventListener("click",async()=>{const c=e.dataset.id,n=prompt("\xBFAlguna observaci\xF3n sobre la negociaci\xF3n?")??"";e.disabled=!0;try{await d("/api/collab/respond",{body:{prospectId:c,observaciones:n}}),o("Respuesta de negociaci\xF3n enviada","ok"),await b(a)}catch(r){o(r.message,"crit"),e.disabled=!1}})),t.querySelectorAll(".confirm-btn").forEach(e=>e.addEventListener("click",async()=>{const c=e.dataset.id;e.disabled=!0;try{await d("/api/collab/confirm",{body:{prospectId:c}});const n=s.prospects.find(r=>r.id===c);n&&(n.status="confirmado"),l(a),o("Collab confirmado","ok")}catch(n){o(n.message,"crit"),e.disabled=!1}}))},b=async a=>{try{const t=await d("/api/collab/prospects");s.prospects=t.prospects??[],l(a)}catch{const t=a.querySelector("#collab-content");t&&(t.innerHTML='<div class="empty muted">Sin datos de collabs disponibles todav\xEDa.</div>')}};export const renderCollab=async a=>{s={prospects:[],tab:"active"},a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Collab Manager</h1>
        <p class="view-subtitle page-subtitle">Gestion\xE1 colaboraciones con creadores e influencers de tu nicho.</p>
      </div>
    </header>
    <div id="collab-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando\u2026</div></div>`,await b(a)};
