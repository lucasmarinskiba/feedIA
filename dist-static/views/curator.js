import{api as l}from"../lib/api.js";import{escape as c}from"../lib/dom.js";import{fmt as b}from"../lib/dom.js";import{toast as n}from"../lib/toast.js";let r={sources:[],backlog:[],tab:"backlog"};const p=t=>t.length?t.map(e=>`
    <div class="list-item">
      <div class="list-item-icon">\u{1F310}</div>
      <div class="list-item-body">
        <div class="small">${c(e.name??e.url)}</div>
        <div class="tiny muted">${c(e.url)}</div>
      </div>
      <span class="tag ${e.active?"ok":"warn"}">${e.active?"activa":"pausada"}</span>
    </div>`).join(""):'<div class="empty">Sin fuentes configuradas. Agreg\xE1 una URL para empezar.</div>',v=t=>t.length?t.map(e=>`
    <div class="curator-item card" data-id="${c(e.id??"")}">
      <div class="meta">
        <span class="tag">${c(e.source??"web")}</span>
        <span class="tiny muted">${b.rel(e.fetchedAt)}</span>
        ${e.approved?'<span class="tag ok">aprobado</span>':""}
      </div>
      <h3 class="curator-title">${c(e.title??e.url)}</h3>
      ${e.summary?`<div class="body">${c(e.summary)}</div>`:""}
      <div class="btn-row" style="margin-top:10px;">
        ${e.approved?"":`<button class="btn primary tiny approve-btn" data-id="${c(e.id??"")}">\u2713 Aprobar</button>`}
        <a href="${c(e.url)}" target="_blank" rel="noopener" class="btn ghost tiny">\u{1F517} Ver fuente</a>
      </div>
    </div>`).join(""):'<div class="empty">Backlog vac\xEDo. Hac\xE9 fetch de fuentes para llenar el backlog.</div>',g=()=>`
  <div class="tab-bar" style="margin-bottom:16px;">
    <button class="tab-btn ${r.tab==="backlog"?"active":""}" data-tab="backlog">\u{1F4E5} Backlog (${r.backlog.length})</button>
    <button class="tab-btn ${r.tab==="sources"?"active":""}" data-tab="sources">\u{1F310} Fuentes (${r.sources.length})</button>
  </div>`,u=t=>{const e=t.querySelector("#curator-content");if(!e)return;const a=g();let s="";r.tab==="backlog"?s=`
      <div class="curator-actions btn-row" style="margin-bottom:16px;">
        <button class="btn primary" id="fetch-btn">\u{1F504} Fetch fuentes</button>
        <button class="btn ghost" id="refresh-backlog-btn">\u21BB Refrescar</button>
      </div>
      <div id="backlog-list">${v(r.backlog)}</div>`:s=`
      <div class="card" style="margin-bottom:16px;">
        <h3>Agregar fuente</h3>
        <div class="field">
          <input class="field-input" id="source-url" type="url" placeholder="https://blog.ejemplo.com/feed"/>
        </div>
        <div class="field">
          <input class="field-input" id="source-name" type="text" placeholder="Nombre de la fuente"/>
        </div>
        <button class="btn primary" id="add-source-btn">+ Agregar</button>
      </div>
      <div id="sources-list">${p(r.sources)}</div>`,e.innerHTML=a+s,f(t)},f=t=>{const e=t.querySelector("#curator-content");e.querySelectorAll(".tab-btn").forEach(a=>a.addEventListener("click",()=>{r.tab=a.dataset.tab,u(t)})),e.querySelector("#fetch-btn")?.addEventListener("click",async()=>{const a=e.querySelector("#fetch-btn");a.disabled=!0,a.innerHTML='<span class="spinner"></span> fetching\u2026';try{const s=await l("/api/curator/fetch",{body:{}});n(`Fetch ok: ${s.added??0} \xEDtems nuevos`,"ok"),await o(t)}catch(s){n(s.message,"crit")}finally{a.disabled=!1,a.innerHTML="\u{1F504} Fetch fuentes"}}),e.querySelector("#refresh-backlog-btn")?.addEventListener("click",()=>o(t)),e.querySelectorAll(".approve-btn").forEach(a=>a.addEventListener("click",async()=>{const s=a.dataset.id;a.disabled=!0;try{await l("/api/curator/approve",{body:{id:s}});const i=r.backlog.find(d=>d.id===s);i&&(i.approved=!0),u(t),n("\xCDtem aprobado","ok")}catch(i){n(i.message,"crit"),a.disabled=!1}})),e.querySelector("#add-source-btn")?.addEventListener("click",async()=>{const a=e.querySelector("#source-url")?.value.trim(),s=e.querySelector("#source-name")?.value.trim();if(!a){n("Ingres\xE1 una URL","crit");return}const i=e.querySelector("#add-source-btn");i.disabled=!0;try{await l("/api/curator/sources",{body:{url:a,name:s||a}}),n("Fuente agregada","ok"),await o(t)}catch(d){n(d.message,"crit"),i.disabled=!1}})},o=async t=>{try{const[e,a]=await Promise.allSettled([l("/api/curator/sources"),l("/api/curator/backlog")]);r.sources=e.status==="fulfilled"?e.value.sources??[]:[],r.backlog=a.status==="fulfilled"?a.value.items??[]:[],u(t)}catch(e){n(e.message,"crit")}};export const renderCurator=async t=>{r={sources:[],backlog:[],tab:"backlog"},t.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Content Curator</h1>
        <p class="view-subtitle page-subtitle">Monitore\xE1 fuentes, aprob\xE1 contenido inspiracional para el backlog.</p>
      </div>
    </header>
    <div id="curator-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando\u2026</div></div>`,await o(t)};
