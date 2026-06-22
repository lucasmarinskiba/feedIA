import{api as l}from"../lib/api.js";import{escape as c}from"../lib/dom.js";import{fmt as g}from"../lib/dom.js";import{toast as o}from"../lib/toast.js";let s={items:[],tab:"pending",autoMode:!1};const v=[{emoji:"\u{1F4F8}",titulo:"Repost del Top 3 de mentions de la semana",desc:'Tu equipo elige las 3 mentions con mejor sentimiento y arma carrusel "Lo que dice nuestra gente".',cta:"\u{1F3A8} Armar en Canva",action:"canva"},{emoji:"\u{1F3AC}",titulo:'Reel "Reaccionando a UGC"',desc:"Un reel donde reaccion\xE1s (texto+m\xFAsica) a un UGC top del mes. Alto retention.",cta:"\u{1F5A5}\uFE0F Editar en CapCut",action:"capcut"},{emoji:"\u2B50",titulo:"Testimonio destacado",desc:"Convert\xED un comentario o DM en una pieza de social proof branded.",cta:"\u{1F3A8} Armar en Canva",action:"canva"},{emoji:"\u{1F91D}",titulo:"Colaboraci\xF3n con creator",desc:"Detect\xE1 creators que ya te mencionan \u22653 veces y abr\xED conversaci\xF3n de colab.",cta:"\u{1F4AC} Iniciar outreach",action:"outreach"}],m=()=>`
  <div class="card ugc-auto" style="background:linear-gradient(135deg,rgba(225,48,108,.06),rgba(168,85,247,.04));">
    <div class="row spread" style="align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:14px;font-weight:700;">\u26A1 Modo Autom\xE1tico UGC</div>
        <div class="tiny muted" style="margin-top:2px;">Cuando est\xE1 ON: el equipo escanea menciones cada 6h, pide permisos por DM autom\xE1tico, y te avisa cuando hay UGC listo para publicar.</div>
      </div>
      <label class="ugc-switch" title="Modo Autom\xE1tico">
        <input type="checkbox" id="ugc-auto-toggle" ${s.autoMode?"checked":""}/><span class="ugc-slider"></span>
      </label>
    </div>
  </div>`,h=()=>`
  <div class="card" style="margin-top:12px;">
    <div class="row spread"><b>\u{1F4A1} Ideas UGC accionables</b><span class="tiny muted">${v.length} sugerencias</span></div>
    <div class="ugc-ideas">
      ${v.map((e,t)=>`
        <div class="ugc-idea">
          <div class="ugc-idea-emoji">${e.emoji}</div>
          <div style="flex:1;min-width:0;">
            <div class="small" style="font-weight:700;">${c(e.titulo)}</div>
            <div class="tiny muted" style="margin-top:3px;line-height:1.4;">${c(e.desc)}</div>
            <button class="btn ghost tiny ugc-idea-btn" data-action="${e.action}" data-i="${t}" style="margin-top:8px;">${c(e.cta)}</button>
          </div>
        </div>`).join("")}
    </div>
  </div>`,y={pending:"warn",approved:"ok",rejected:"crit",expired:"muted"},f=e=>`
  <div class="ugc-item card">
    <div class="meta">
      <span class="tag ${y[e.status]??"info"}">${c(e.status??"pending")}</span>
      <span class="tiny muted">${g.rel(e.createdAt)}</span>
      ${e.expiresAt?`<span class="tiny muted">expira ${g.rel(e.expiresAt)}</span>`:""}
    </div>
    <div class="ugc-creator">
      <div class="ugc-avatar">${c((e.creatorHandle??"@?").charAt(1).toUpperCase())}</div>
      <div>
        <div class="small">${c(e.creatorHandle??"desconocido")}</div>
        ${e.creatorFollowers?`<div class="tiny muted">${g.num(e.creatorFollowers)} seguidores</div>`:""}
      </div>
    </div>
    ${e.contentUrl?`<div class="ugc-thumb"><img src="${c(e.contentUrl)}" alt="ugc" onerror="this.style.display='none'"/></div>`:""}
    <div class="body" style="margin-top:8px;">${c(e.description??"")}</div>
    ${e.permissionMessage?`
      <div class="ugc-permission-msg small muted" style="margin-top:8px;border-left:2px solid var(--border);padding-left:8px;">
        "${c(e.permissionMessage)}"
      </div>`:""}
    ${e.status==="pending"?`
      <div class="btn-row" style="margin-top:12px;">
        <button class="btn primary tiny ugc-approve-btn" data-id="${c(e.id??"")}">\u2713 Aprobar uso</button>
        <button class="btn ghost tiny ugc-reject-btn" data-id="${c(e.id??"")}">\u2717 Rechazar</button>
        <button class="btn ghost tiny ugc-contact-btn" data-id="${c(e.id??"")}" data-handle="${c(e.creatorHandle??"")}">\u{1F4AC} Contactar</button>
      </div>`:""}
  </div>`,x=()=>{const e=s.items.filter(t=>s.tab==="all"?!0:t.status===s.tab);return e.length?e.map(f).join(""):`<div class="empty">Sin UGC con estado "${s.tab}".</div>`},$=()=>{const e={pending:0,approved:0,rejected:0,all:s.items.length};return s.items.forEach(t=>{e[t.status]!==void 0&&e[t.status]++}),`
    <div class="tab-bar">
      ${["pending","approved","rejected","all"].map(t=>`
        <button class="tab-btn ${s.tab===t?"active":""}" data-tab="${t}">
          ${t==="pending"?"\u23F3":t==="approved"?"\u2705":t==="rejected"?"\u274C":"\u{1F4CB}"} ${t.charAt(0).toUpperCase()+t.slice(1)} (${e[t]})
        </button>`).join("")}
    </div>`},u=e=>{const t=e.querySelector("#ugc-content");t&&(t.innerHTML=`
    ${m()}
    ${h()}
    <div style="margin-top:18px;">${$()}</div>
    <div class="btn-row" style="margin:14px 0;">
      <button class="btn primary" id="scan-btn">\u{1F50D} Escanear menciones</button>
      <button class="btn ghost" id="refresh-btn">\u21BB Refrescar</button>
    </div>
    <div id="ugc-list">${x()}</div>
    <style>
      .ugc-ideas{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:10px;}
      .ugc-idea{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:12px;display:flex;gap:10px;align-items:flex-start;transition:border-color .15s;}
      .ugc-idea:hover{border-color:var(--border-focus,#444);}
      .ugc-idea-emoji{font-size:20px;line-height:1;}
      .ugc-switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;cursor:pointer;}
      .ugc-switch input{opacity:0;width:0;height:0;}
      .ugc-slider{position:absolute;inset:0;background:#2c2c38;border-radius:24px;transition:background .2s;}
      .ugc-slider::before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .22s cubic-bezier(.2,.8,.2,1);}
      .ugc-switch input:checked + .ugc-slider{background:linear-gradient(135deg,#e1306c,#a855f7);}
      .ugc-switch input:checked + .ugc-slider::before{transform:translateX(20px);}
    </style>`,C(e),w(e))},w=e=>{const t=e.querySelector("#ugc-content");t.querySelector("#ugc-auto-toggle")?.addEventListener("change",async a=>{s.autoMode=a.target.checked;try{localStorage.setItem("fx_ugc_auto",s.autoMode?"1":"0")}catch{}o(s.autoMode?"\u26A1 Modo Autom\xE1tico ON \xB7 escanear\xE1 cada 6h":"Modo Autom\xE1tico apagado",s.autoMode?"ok":"info")}),t.querySelectorAll(".ugc-idea-btn").forEach(a=>a.addEventListener("click",async n=>{const i=n.currentTarget.dataset.action,r=v[Number(n.currentTarget.dataset.i)];if(r)if(i==="canva"){const p=[{titulo:"LO QUE DICE NUESTRA GENTE",cuerpo:r.desc},{titulo:r.titulo,cuerpo:"Top mentions de la semana."}];try{const d=await l("/api/computer/watch-canva",{body:{slides:p,titulo:`UGC ${new Date().toISOString().split("T")[0]}`,speed:1,autoExportar:!0}});d?.sessionId&&(sessionStorage.setItem("fx_cu_session",d.sessionId),o("\u{1F3A8} Abriendo Canva\u2026","ok"),location.hash="pantalla")}catch(d){o(d.message,"crit")}}else if(i==="capcut"){const p=[{texto:r.titulo,segundos:3,notaVisual:"B-roll del UGC"},{texto:"\xBFTe pasa?",segundos:2,notaVisual:"Texto grande"},{texto:r.desc,segundos:5},{texto:"Mandanos el tuyo \u2192",segundos:3}];try{const d=await l("/api/computer/watch-capcut",{body:{beats:p,titulo:"UGC Reel",relacion:"9:16",speed:1,autoExportar:!0}});d?.sessionId&&(sessionStorage.setItem("fx_cu_session",d.sessionId),o("\u{1F5A5}\uFE0F Abriendo CapCut\u2026","ok"),location.hash="pantalla")}catch(d){o(d.message,"crit")}}else i==="outreach"&&(o("Te llevo a Pantalla en vivo para que el equipo abra DMs de outreach.","info"),location.hash="pantalla")}))},C=e=>{const t=e.querySelector("#ugc-content");t.querySelectorAll(".tab-btn").forEach(a=>a.addEventListener("click",()=>{s.tab=a.dataset.tab,u(e)})),t.querySelector("#scan-btn")?.addEventListener("click",async()=>{const a=t.querySelector("#scan-btn");a.disabled=!0,a.innerHTML='<span class="spinner"></span> escaneando\u2026';try{const n=await l("/api/ugc/scan",{body:{}});o(`Escaneo ok: ${n.found??0} menciones nuevas`,"ok"),await b(e)}catch(n){o(n.message,"crit")}finally{a.disabled=!1,a.innerHTML="\u{1F50D} Escanear menciones"}}),t.querySelector("#refresh-btn")?.addEventListener("click",()=>b(e)),t.querySelectorAll(".ugc-approve-btn").forEach(a=>a.addEventListener("click",async()=>{const n=a.dataset.id;a.disabled=!0;try{await l("/api/ugc/approve",{body:{id:n}});const i=s.items.find(r=>r.id===n);i&&(i.status="approved"),u(e),o("UGC aprobado","ok")}catch(i){o(i.message,"crit"),a.disabled=!1}})),t.querySelectorAll(".ugc-reject-btn").forEach(a=>a.addEventListener("click",async()=>{const n=a.dataset.id;a.disabled=!0;try{await l("/api/ugc/reject",{body:{id:n}});const i=s.items.find(r=>r.id===n);i&&(i.status="rejected"),u(e),o("UGC rechazado","crit")}catch(i){o(i.message,"crit"),a.disabled=!1}})),t.querySelectorAll(".ugc-contact-btn").forEach(a=>a.addEventListener("click",async()=>{const n=a.dataset.id,i=a.dataset.handle;a.disabled=!0;try{await l("/api/ugc/contact",{body:{id:n,handle:i}}),o(`Mensaje de contacto enviado a ${i}`,"ok")}catch(r){o(r.message,"crit")}finally{a.disabled=!1}}))},b=async e=>{try{const t=await l("/api/ugc/list");s.items=t.items??[],u(e)}catch{const a=e.querySelector("#ugc-content");a&&(a.innerHTML='<div class="empty muted">Sin datos UGC disponibles (conect\xE1 Meta API para ver menciones reales).</div>')}};export const renderUgc=async e=>{let t=!1;try{t=localStorage.getItem("fx_ugc_auto")==="1"}catch{}s={items:[],tab:"pending",autoMode:t},e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">UGC Manager</h1>
        <p class="view-subtitle page-subtitle">Gestion\xE1 permisos de User Generated Content y menciones de tu marca.</p>
      </div>
    </header>
    <div id="ugc-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando\u2026</div></div>`,await b(e)};
