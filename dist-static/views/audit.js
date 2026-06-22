import{api as e}from"../lib/api.js";import{escape as i,fmt as c}from"../lib/dom.js";import{toast as r}from"../lib/toast.js";import{loadingScreen as h,emptyState as y,withBtnSpinner as g}from"../lib/ui.js";const l={excelente:"ok",bueno:"ok",aceptable:"info",riesgo:"warn",critico:"crit"},$=a=>{const t=l[a.band]??"info";return`
    <div class="card audit-section-card">
      <div class="audit-section-head">
        <div class="audit-section-title">${i(a.section)}</div>
        <div class="audit-section-score">
          <span class="audit-score-num">${a.score}</span>
          <span class="muted small">/100</span>
          <span class="tag ${t}">${i(a.band)}</span>
        </div>
      </div>
      <div class="audit-section-bar"><div class="audit-section-bar-fill" style="width:${a.score}%;background:var(--${a.band==="excelente"||a.band==="bueno"?"ok":a.band==="aceptable"?"info":a.band==="riesgo"?"warn":"crit"})"></div></div>
      <ul class="audit-observations">
        ${(a.observations??[]).map(s=>`<li class="small">${i(s)}</li>`).join("")}
      </ul>
    </div>`},b=a=>`
  <div class="card priority-card">
    <div class="priority-rank">#${a.rank}</div>
    <div class="priority-body">
      <h3 style="margin:0 0 4px;">${i(a.title)}</h3>
      <p class="small muted" style="margin:0 0 8px;">${i(a.rationale)}</p>
      <div class="small" style="margin-bottom:8px;"><strong>Resultado esperado:</strong> ${i(a.expectedOutcome)}</div>
      <div class="btn-row">
        <button class="btn tiny" data-route="agents" data-agent="${i(a.ownerHint)}">\u2192 ${i(a.ownerHint)}</button>
      </div>
    </div>
  </div>`,f=a=>{if(!a?.current)return"";const t=a.deltaPct,s=t===null?"sin comparativo":`${t>0?"\u25B2":t<0?"\u25BC":"\xB7"} ${Math.abs(t)}%`;return`
    <div class="audit-trend small ${t===null?"muted":t>0?"ok":t<0?"crit":"muted"}">
      ${s} vs. semana pasada
    </div>`},w=(a,t)=>{if(!a)return y("\u{1F4CA}","Sin auditor\xEDas todav\xEDa. Corr\xE9 la primera para arrancar el ciclo semanal.",360);const s=l[a.overallBand]??"info";return`
    <div class="audit-hero card">
      <div class="audit-hero-left">
        <div class="muted tiny">Score general \u2014 semana del ${c.date(a.generatedAt)}</div>
        <div class="audit-hero-score">
          <span class="audit-hero-num">${a.overallScore}</span>
          <span class="muted">/100</span>
          <span class="tag ${s}" style="font-size:12px;">${i(a.overallBand)}</span>
        </div>
        ${f(t)}
        <p class="audit-summary">${i(a.executiveSummary??"")}</p>
      </div>
      <div class="audit-hero-right">
        <div class="audit-stat">
          <div class="audit-stat-num">${a.priorities?.length??0}</div>
          <div class="audit-stat-label">Prioridades</div>
        </div>
        <div class="audit-stat">
          <div class="audit-stat-num">${a.appliedAdjustments??0}</div>
          <div class="audit-stat-label">Ajustes auto-aplicados</div>
        </div>
        <div class="audit-stat">
          <div class="audit-stat-num">${a.sections?.length??0}</div>
          <div class="audit-stat-label">\xC1reas auditadas</div>
        </div>
      </div>
    </div>

    <div class="col-header"><h3>\u{1F3AF} Prioridades de la semana</h3></div>
    <div class="page-grid">${(a.priorities??[]).map(b).join("")}</div>

    <div class="col-header"><h3>\u{1FA7A} Salud por \xE1rea</h3></div>
    <div class="page-grid">${(a.sections??[]).map($).join("")}</div>`},S=a=>`
  <div class="audit-history-row">
    <div class="small muted">${c.date(a.generatedAt)}</div>
    <div class="audit-history-score">
      <span style="font-weight:800">${a.overallScore}</span>
      <span class="muted tiny">/100</span>
      <span class="tag ${l[a.overallBand]??"info"} tiny">${i(a.overallBand)}</span>
    </div>
    <div class="tiny muted" style="flex:1;">${i((a.executiveSummary??"").slice(0,120))}\u2026</div>
  </div>`,v=async a=>{const t=a.querySelector("#audit-content");if(t)try{const[s,d,n]=await Promise.allSettled([e("/api/audit/latest"),e("/api/audit/trend"),e("/api/audit/history?limit=10")]),u=s.status==="fulfilled"?s.value:null,p=d.status==="fulfilled"?d.value:null,o=n.status==="fulfilled"?n.value:[];t.innerHTML=`
      ${w(u,p)}
      ${o.length>1?`
        <div class="col-header" style="margin-top:24px"><h3>\u{1F4DC} Historial</h3></div>
        <div class="card" style="padding:8px 0;">
          ${o.slice(1).map(S).join("")}
        </div>`:""}`,t.querySelectorAll("[data-agent]").forEach(m=>{m.addEventListener("click",()=>{location.hash="agents"})})}catch(s){t.innerHTML=`<div class="alert crit">Error: ${i(s.message)}</div>`,r(s.message,"crit")}};export const renderAudit=async a=>{a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F4CA} Audit semanal</h1>
        <p class="view-subtitle page-subtitle">Auditor\xEDa completa del sistema operativo. El Chief of Staff aut\xF3nomo de tu cuenta.</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" id="run-audit-btn">\u25B6 Correr audit ahora</button>
      </div>
    </header>
    <div id="audit-content" class="page-body">${h()}</div>`,a.querySelector("#run-audit-btn").addEventListener("click",async t=>{await g(t.currentTarget,"auditando\u2026",async()=>{try{await e("/api/audit/run",{method:"POST",body:{windowDays:7}}),r("Audit semanal completado","ok"),await v(a)}catch(s){r("Error: "+s.message,"crit")}})}),await v(a)};
