import{api as n}from"../lib/api.js";import{escape as e}from"../lib/dom.js";import{fmt as l}from"../lib/dom.js";import{toast as t}from"../lib/toast.js";let c={crisis:null,historial:[]};const o={baja:"ok",media:"warn",alta:"crit",critica:"crit"},u={baja:"\u{1F7E1}",media:"\u{1F7E0}",alta:"\u{1F534}",critica:"\u{1F6A8}"},v=a=>a?.publicacionesPausadas?`
    <div class="crisis-alert-banner severity-${a.severidad??"alta"}">
      <div class="crisis-alert-icon">${u[a.severidad]??"\u{1F534}"}</div>
      <div style="flex:1;">
        <div class="small" style="font-weight:600;">CRISIS ACTIVA \u2014 ${e((a.severidad??"alta").toUpperCase())}</div>
        <div class="tiny" style="margin-top:2px;">${e(a.descripcion??"")}</div>
        <div class="tiny muted" style="margin-top:2px;">Detectada ${l.rel(a.detectadaEn)}</div>
      </div>
      <span class="tag crit blink">PUBLICACIONES PAUSADAS</span>
    </div>`:`
      <div class="crisis-ok-banner">
        <div class="crisis-ok-icon">\u2705</div>
        <div>
          <div class="small" style="font-weight:600;">Sin crisis activa</div>
          <div class="tiny muted">Las publicaciones se procesan con normalidad.</div>
        </div>
      </div>`,p=a=>a?.triggers?.length?`
    <div class="card" style="margin-bottom:14px;">
      <h3>\u26A0\uFE0F Disparadores detectados</h3>
      ${a.triggers.map(s=>`
        <div class="factor-row">
          <span class="tag ${o[s.severidad]??"warn"}">${e(s.severidad??"media")}</span>
          <div>
            <div class="small">${e(s.descripcion)}</div>
            <div class="tiny muted">${l.rel(s.detectadoEn)}</div>
          </div>
        </div>`).join("")}
    </div>`:"",m=a=>a?.acciones?.length?`
    <div class="card" style="margin-bottom:14px;">
      <h3>\u{1F4CB} Plan de acci\xF3n</h3>
      <ol style="margin:0;padding-left:18px;">
        ${a.acciones.map(s=>`
          <li class="small" style="margin-bottom:6px;">
            <span class="small">${e(s.descripcion)}</span>
            ${s.completada?'<span class="tag ok tiny" style="margin-left:6px;">\u2713 hecho</span>':""}
          </li>`).join("")}
      </ol>
    </div>`:"",b=a=>a.length?a.map(s=>`
    <div class="list-item">
      <div class="list-item-icon">${u[s.severidad]??"\u{1F534}"}</div>
      <div class="list-item-body">
        <div class="small">${e(s.descripcion??"Crisis")}</div>
        <div class="tiny muted">${l.date(s.detectadaEn)} \u2014 resuelto ${l.rel(s.resueltaEn)}</div>
      </div>
      <span class="tag ${o[s.severidad]??"warn"}">${e(s.severidad??"media")}</span>
    </div>`).join(""):'<div class="empty muted small">Sin historial de crisis previas.</div>',y=a=>{const s=c.crisis,i=a.querySelector("#crisis-content");i&&(i.innerHTML=`
    ${v(s)}

    ${s?.publicacionesPausadas?`
      ${p(s)}
      ${m(s)}
      <div class="card" style="margin-bottom:14px;">
        <h3>\u{1F504} Control de crisis</h3>
        <p class="small muted" style="margin-bottom:12px;">Cuando la situaci\xF3n est\xE9 bajo control, pod\xE9s reanudar las publicaciones programadas.</p>
        <div class="btn-row">
          <button class="btn primary" id="resume-btn">\u25B6 Reanudar publicaciones</button>
          <button class="btn ghost" id="check-btn">\u{1F50D} Re-evaluar situaci\xF3n</button>
        </div>
      </div>`:`
      <div class="card" style="margin-bottom:14px;">
        <h3>\u{1F50D} Monitoreo preventivo</h3>
        <p class="small muted" style="margin-bottom:12px;">Ejecut\xE1 un chequeo manual para detectar se\xF1ales de alerta antes de que escalen.</p>
        <div class="btn-row">
          <button class="btn ghost" id="check-btn">\u{1F50D} Chequear ahora</button>
          <button class="btn ghost crit" id="simulate-btn">\u26A0\uFE0F Simular crisis (test)</button>
        </div>
      </div>`}

    <div class="card" style="margin-top:8px;">
      <h3>\u{1F4DC} Historial</h3>
      <div id="historial-list">${b(c.historial)}</div>
    </div>`,g(a,i))},g=(a,s)=>{s.querySelector("#resume-btn")?.addEventListener("click",async()=>{if(!confirm("\xBFConfirm\xE1s que quer\xE9s reanudar todas las publicaciones?"))return;const i=s.querySelector("#resume-btn");i.disabled=!0,i.innerHTML='<span class="spinner"></span> reanudando\u2026';try{await n("/api/crisis/resume",{body:{}}),t("Publicaciones reanudadas","ok"),await d(a)}catch(r){t(r.message,"crit"),i.disabled=!1,i.innerHTML="\u25B6 Reanudar publicaciones"}}),s.querySelector("#check-btn")?.addEventListener("click",async()=>{const i=s.querySelector("#check-btn");i.disabled=!0,i.innerHTML='<span class="spinner"></span> evaluando\u2026';try{const r=await n("/api/crisis/check",{body:{}});t(r.crisisDetectada?"\u26A0\uFE0F Crisis detectada":"Sin se\xF1ales de crisis",r.crisisDetectada?"crit":"ok"),await d(a)}catch(r){t(r.message,"crit")}finally{i.disabled=!1,i.innerHTML="\u{1F50D} Re-evaluar situaci\xF3n"}}),s.querySelector("#simulate-btn")?.addEventListener("click",async()=>{if(confirm("Esto simular\xE1 una crisis activa (solo para pruebas). \xBFContinuar?"))try{await n("/api/crisis/simulate",{body:{}}),t("Crisis de prueba activada","warn"),await d(a)}catch(i){t(i.message,"crit")}})},d=async a=>{try{const[s,i]=await Promise.allSettled([n("/api/crisis/status"),n("/api/crisis/historial")]);c.crisis=s.status==="fulfilled"?s.value:null,c.historial=i.status==="fulfilled"?i.value.historial??[]:[],y(a)}catch(s){t(s.message,"crit")}};export const renderCrisis=async a=>{c={crisis:null,historial:[]},a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Crisis Manager</h1>
        <p class="view-subtitle page-subtitle">Monitoreo de reputaci\xF3n y control de crisis en tiempo real.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="refresh-top-btn">\u21BB Actualizar</button>
      </div>
    </header>
    <div id="crisis-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando\u2026</div></div>`,a.querySelector("#refresh-top-btn")?.addEventListener("click",()=>d(a)),await d(a)};
