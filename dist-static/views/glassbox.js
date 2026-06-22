import{api as r}from"../lib/api.js";import{escape as t}from"../lib/dom.js";import{toast as o}from"../lib/toast.js";import{loadingScreen as g,emptyState as T,withBtnSpinner as l}from"../lib/ui.js";let b=null;const m=()=>{try{b&&b.close()}catch{}b=null};window.addEventListener("beforeunload",m),window.addEventListener("hashchange",()=>{(location.hash.replace("#","")||"feed")!=="glassbox"&&m()});const y={low:"ok",medium:"info",high:"warn",critical:"crit"},k={pending:"\u23F3",approved:"\u2705",rejected:"\u274C",executing:"\u25B6\uFE0F",completed:"\u2713",failed:"\u26A0\uFE0F",blocked:"\u{1F6AB}"},h=e=>e?new Date(e).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"-",L=e=>`<span class="tag ${{autonomous:"ok",supervised:"warn",paused:"crit"}[e]??"info"}">${t(e.toUpperCase())}</span>`,A=e=>`
  <div class="card gb-action-card" data-id="${t(e.id)}" data-status="pending">
    <div class="gb-action-header">
      <div class="gb-action-id">${t(e.id)}</div>
      <div class="gb-action-badges">
        <span class="tag ${y[e.riskLevel]??"info"}">risk: ${t(e.riskLevel)}</span>
        <span class="tag info">${t(e.actionType)}</span>
      </div>
    </div>
    <div class="gb-action-desc">${t(e.description)}</div>
    ${e.guardianWarning?`<div class="gb-action-warning">\u26A0\uFE0F ${t(e.guardianWarning)}</div>`:""}
    <div class="gb-action-meta small muted">
      Source: ${t(e.source)} | ${h(e.createdAt)}
      ${e.timeoutAt?`| Expira: ${h(e.timeoutAt)}`:""}
    </div>
    <div class="gb-action-btns">
      <button class="btn tiny primary gb-approve" data-id="${t(e.id)}">\u2705 Aprobar</button>
      <button class="btn tiny gb-reject" data-id="${t(e.id)}">\u274C Rechazar</button>
      <button class="btn tiny gb-modify" data-id="${t(e.id)}">\u270F\uFE0F Modificar</button>
    </div>
  </div>`,E=e=>`
  <div class="card gb-action-card gb-action-${e.status}">
    <div class="gb-action-header">
      <div class="gb-action-id">${k[e.status]??"\u2022"} ${t(e.id)}</div>
      <div class="gb-action-badges">
        <span class="tag ${y[e.riskLevel]??"info"}">${t(e.riskLevel)}</span>
        <span class="tag info">${t(e.actionType)}</span>
        <span class="tag ${e.status==="completed"?"ok":e.status==="failed"?"crit":e.status==="rejected"?"warn":"info"}">${t(e.status)}</span>
      </div>
    </div>
    <div class="gb-action-desc">${t(e.description)}</div>
    ${e.resolutionNote?`<div class="gb-action-note small">\u{1F4DD} ${t(e.resolutionNote)}</div>`:""}
    ${e.executionError?`<div class="gb-action-error small">\u26A0\uFE0F ${t(e.executionError)}</div>`:""}
    <div class="gb-action-meta small muted">${h(e.resolvedAt||e.createdAt)} | ${t(e.source)}</div>
  </div>`,M=e=>{e.querySelectorAll(".gb-approve").forEach(s=>{s.addEventListener("click",async a=>{const n=a.currentTarget.dataset.id;await l(a.currentTarget,"\u2026",async()=>{try{await r(`/api/glassbox/actions/${encodeURIComponent(n)}/approve`,{method:"POST",body:{note:"Aprobado desde dashboard"}}),o("Acci\xF3n aprobada","ok"),c(e)}catch(i){o(i.message,"crit")}})})}),e.querySelectorAll(".gb-reject").forEach(s=>{s.addEventListener("click",async a=>{const n=a.currentTarget.dataset.id,i=prompt("\xBFPor qu\xE9 rechaz\xE1s esta acci\xF3n?");i&&await l(a.currentTarget,"\u2026",async()=>{try{await r(`/api/glassbox/actions/${encodeURIComponent(n)}/reject`,{method:"POST",body:{reason:i}}),o("Acci\xF3n rechazada","warn"),c(e)}catch(d){o(d.message,"crit")}})})}),e.querySelectorAll(".gb-modify").forEach(s=>{s.addEventListener("click",async a=>{const n=a.currentTarget.dataset.id,i=prompt("Payload JSON modificado:");if(!i)return;let d;try{d=JSON.parse(i)}catch{o("JSON inv\xE1lido","crit");return}await l(a.currentTarget,"\u2026",async()=>{try{await r(`/api/glassbox/actions/${encodeURIComponent(n)}/modify`,{method:"POST",body:{payload:d}}),o("Acci\xF3n modificada","ok"),c(e)}catch(u){o(u.message,"crit")}})})})},c=async e=>{const s=e.querySelector("#gb-status"),a=e.querySelector("#gb-pending"),n=e.querySelector("#gb-history");s&&(s.innerHTML=g()),a&&(a.innerHTML=g()),n&&(n.innerHTML=g());try{const[i,d,u]=await Promise.allSettled([r("/api/glassbox/status"),r("/api/glassbox/pending"),r("/api/glassbox/history?limit=20")]),p=i.status==="fulfilled"?i.value:null,v=d.status==="fulfilled"?d.value?.pending??[]:[],f=u.status==="fulfilled"?u.value?.history??[]:[];if(s&&p){s.innerHTML=`
        <div class="gb-status-bar">
          <div class="gb-status-mode">Modo: ${L(p.mode)}</div>
          <div class="gb-status-counts">
            <div class="gb-status-count"><b>${p.pendingCount}</b> <span class="small muted">pendientes</span></div>
            <div class="gb-status-count"><b>${p.historyCount}</b> <span class="small muted">en historial</span></div>
          </div>
          <div class="gb-status-actions">
            <button class="btn ${p.mode==="paused"?"primary":""}" id="gb-pause-btn">\u23F8 Pausar</button>
            <button class="btn ${p.mode==="supervised"?"primary":""}" id="gb-resume-btn">\u25B6 Supervisado</button>
            <button class="btn ${p.mode==="autonomous"?"primary":""}" id="gb-auto-btn">\u26A1 Aut\xF3nomo</button>
          </div>
        </div>`;const $=s.querySelector("#gb-pause-btn"),w=s.querySelector("#gb-resume-btn"),S=s.querySelector("#gb-auto-btn");$?.addEventListener("click",async()=>{await l($,"\u2026",async()=>{await r("/api/glassbox/pause",{method:"POST"}),o("GlassBox pausado","warn"),c(e)})}),w?.addEventListener("click",async()=>{await l(w,"\u2026",async()=>{await r("/api/glassbox/resume",{method:"POST"}),o("GlassBox en modo supervisado","ok"),c(e)})}),S?.addEventListener("click",async()=>{await l(S,"\u2026",async()=>{await r("/api/glassbox/mode",{method:"POST",body:{mode:"autonomous"}}),o("GlassBox en modo aut\xF3nomo","ok"),c(e)})})}const x=e.querySelector("#gb-bulk-btns");x&&(x.style.display=v.length>1?"flex":"none"),a&&(a.innerHTML=v.length?`<div class="page-grid">${v.map(A).join("")}</div>`:T("\u2705","No hay acciones pendientes. El agente est\xE1 operando libremente.",280),M(a)),n&&(n.innerHTML=f.length?`<div class="page-grid">${f.map(E).join("")}</div>`:T("\u{1F4DC}","Sin historial de acciones todav\xEDa.",280))}catch(i){o(i.message,"crit")}},j=e=>{m(),b=new EventSource("/api/glassbox/stream"),b.addEventListener("gb",s=>{let a;try{a=JSON.parse(s.data)}catch{return}const n=e.querySelector("#gb-stream-log");if(!n)return;const i=document.createElement("div");i.className="gb-stream-line";const d=new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});for(a.kind==="action-pending"?(i.innerHTML=`<span class="muted">[${d}]</span> \u23F3 <b>${t(a.action?.actionType??"acci\xF3n")}</b> esperando aprobaci\xF3n <span class="tag ${y[a.action?.riskLevel]??"info"} tiny">${t(a.action?.riskLevel??"")}</span>`,c(e)):a.kind==="action-approved"?(i.innerHTML=`<span class="muted">[${d}]</span> \u2705 Acci\xF3n <b>${t(a.actionId)}</b> aprobada`,c(e)):a.kind==="action-rejected"?(i.innerHTML=`<span class="muted">[${d}]</span> \u274C Acci\xF3n <b>${t(a.actionId)}</b> rechazada`,c(e)):a.kind==="action-executing"?i.innerHTML=`<span class="muted">[${d}]</span> \u25B6\uFE0F Ejecutando <b>${t(a.actionId)}</b>`:a.kind==="mode-changed"?(i.innerHTML=`<span class="muted">[${d}]</span> \u{1F39B}\uFE0F Modo cambiado: <b>${t(a.previous)}</b> \u2192 <b>${t(a.mode)}</b>`,c(e)):i.innerHTML=`<span class="muted">[${d}]</span> ${t(a.kind)}`,n.prepend(i);n.children.length>60;)n.lastChild.remove()}),b.onerror=()=>{}};export const renderGlassBox=async e=>{m(),e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F50D} GlassBox</h1>
        <p class="view-subtitle page-subtitle">Caja de Cristal \u2014 supervis\xE1 cada acci\xF3n del agente en tiempo real.</p>
      </div>
    </header>

    <div class="page-body">
      <div id="gb-status" class="card">${g()}</div>

      <div class="col-header" style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;">
        <h3>\u23F3 Acciones Pendientes</h3>
        <div class="btn-row" id="gb-bulk-btns" style="display:none;">
          <button class="btn tiny primary" id="gb-approve-all">\u2705 Aprobar todas</button>
          <button class="btn tiny" id="gb-reject-all">\u274C Rechazar todas</button>
        </div>
      </div>
      <div id="gb-pending">${g()}</div>

      <div class="col-header" style="margin-top:20px;"><h3>\u{1F4DC} Historial Reciente</h3></div>
      <div id="gb-history">${g()}</div>

      <div class="col-header" style="margin-top:20px;"><h3>\u{1F4E1} Stream en vivo</h3></div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div id="gb-stream-log" class="gb-stream-log"></div>
      </div>
    </div>

    <style>
      .gb-status-bar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:space-between;}
      .gb-status-mode{font-size:18px;font-weight:700;}
      .gb-status-counts{display:flex;gap:16px;}
      .gb-status-count{text-align:center;}
      .gb-status-actions{display:flex;gap:8px;}
      .gb-action-card{padding:14px 16px;}
      .gb-action-header{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
      .gb-action-id{font-family:ui-monospace,monospace;font-size:12px;color:var(--muted);}
      .gb-action-badges{display:flex;gap:6px;flex-wrap:wrap;}
      .gb-action-desc{font-size:15px;margin-bottom:8px;line-height:1.5;}
      .gb-action-warning{font-size:13px;color:var(--warn);background:rgba(245,158,11,.08);padding:6px 10px;border-radius:6px;margin-bottom:8px;}
      .gb-action-meta{margin-bottom:10px;}
      .gb-action-btns{display:flex;gap:8px;flex-wrap:wrap;}
      .gb-action-note{color:var(--info);background:rgba(59,130,246,.08);padding:4px 10px;border-radius:6px;margin-top:6px;}
      .gb-action-error{color:var(--crit);background:rgba(239,68,68,.08);padding:4px 10px;border-radius:6px;margin-top:6px;}
      .gb-stream-log{max-height:240px;overflow:auto;padding:12px 16px;font-family:ui-monospace,monospace;font-size:13px;}
      .gb-stream-line{padding:3px 0;}
    </style>`,e.querySelector("#gb-approve-all")?.addEventListener("click",async s=>{await l(s.currentTarget,"\u2026",async()=>{try{await r("/api/glassbox/actions/approve-all",{method:"POST",body:{note:"Aprobadas en bulk desde dashboard"}}),o("Todas las acciones pendientes fueron aprobadas","ok"),c(e)}catch(a){o(a.message,"crit")}})}),e.querySelector("#gb-reject-all")?.addEventListener("click",async s=>{const a=prompt("\xBFPor qu\xE9 rechaz\xE1s TODAS las acciones pendientes?");a&&await l(s.currentTarget,"\u2026",async()=>{try{await r("/api/glassbox/actions/reject-all",{method:"POST",body:{reason:a}}),o("Todas las acciones pendientes fueron rechazadas","warn"),c(e)}catch(n){o(n.message,"crit")}})}),await c(e),j(e)};
