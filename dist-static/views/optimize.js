import{api as n}from"../lib/api.js";import{escape as s,fmt as x}from"../lib/dom.js";import{toast as o}from"../lib/toast.js";import{loadingScreen as w,emptyState as v,withBtnSpinner as g}from"../lib/ui.js";const $=["Dom","Lun","Mar","Mi\xE9","Jue","Vie","S\xE1b"],S=a=>!a||a.sampleSize===0?v("\u{1F501}","Datos insuficientes (n=0). Public\xE1 m\xE1s contenido para activar el loop de auto-optimizaci\xF3n.",240):`
    <div class="card">
      <div class="row spread" style="margin-bottom:14px;">
        <h3 style="margin:0;">\u{1F4D0} Patrones detectados</h3>
        <span class="tag info">n=${a.sampleSize} \xB7 ventana ${a.windowDays}d</span>
      </div>

      <div class="optimize-extraction-grid">
        <div>
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Formatos ganadores</div>
          ${(a.formatPerformance??[]).slice(0,4).map(t=>`
            <div class="optimize-format-row">
              <div class="optimize-format-name">${s(t.format)}</div>
              <div class="optimize-format-bar"><div class="optimize-format-bar-fill" style="width:${Math.min(100,t.weightedScore/Math.max(1,a.formatPerformance[0].weightedScore)*100)}%"></div></div>
              <div class="optimize-format-stats tiny muted">saves ${t.avgSaves.toFixed(0)} \xB7 shares ${t.avgShares.toFixed(0)} \xB7 n=${t.count}</div>
            </div>`).join("")}
        </div>

        <div>
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Hooks que funcionan</div>
          ${(a.hookPatternHits??[]).slice(0,5).map(t=>`
            <div class="optimize-hook-row">
              <span class="tag info tiny">${s(t.category)}</span>
              <span class="small">${s(t.patternName)}</span>
              <span class="muted tiny" style="margin-left:auto;">${t.hits} hits \xB7 score ${t.avgScore.toFixed(0)}</span>
            </div>`).join("")}
          ${a.hookPatternHits?.length?"":'<div class="small muted">Sin patrones clasificables a\xFAn.</div>'}
        </div>

        <div>
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Mejores ventanas horarias</div>
          ${(a.bestPostingWindows??[]).map(t=>`
            <div class="optimize-window-row">
              <span class="small">${$[t.dayOfWeek]} ${String(t.hour).padStart(2,"0")}:00</span>
              <span class="muted tiny" style="margin-left:auto;">peso ${t.avgWeightedScore.toFixed(0)} (n=${t.count})</span>
            </div>`).join("")}
          ${a.bestPostingWindows?.length?"":'<div class="small muted">Sin ventanas estables.</div>'}
        </div>
      </div>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border-soft);">
        <div class="small">
          <strong>Multiplicador del formato ganador vs tu propio baseline:</strong>
          <span class="tag ok">saves \xD7${a.baselineMultipliers.saves}</span>
          <span class="tag ok">shares \xD7${a.baselineMultipliers.shares}</span>
        </div>
      </div>
    </div>`,z=a=>`
  <div class="card recommendation-card">
    <div class="meta">
      <span class="tag accent">${s(a.format)}</span>
      <span class="tag info">\xD7${a.expectedSavesMultiplier} saves</span>
      ${a.recommendedSlot?`<span class="tag tiny">${$[a.recommendedSlot.dayOfWeek]} ${String(a.recommendedSlot.hour).padStart(2,"0")}:00</span>`:""}
      <span class="tag ${a.status==="producido"?"ok":a.status==="descartado"?"crit":"warn"} tiny">${s(a.status)}</span>
    </div>
    <h3 style="margin:6px 0 4px;">${s(a.hookText)}</h3>
    <div class="body small"><strong>\xC1ngulo:</strong> ${s(a.topicAngle)}</div>
    <div class="small muted">${s(a.whyThisWillWin)}</div>
    ${a.status==="propuesto"?`
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn primary tiny" data-action="produce" data-id="${s(a.id)}">\u{1F916} Producir</button>
        <button class="btn ghost tiny" data-action="discard" data-id="${s(a.id)}">Descartar</button>
      </div>`:""}
  </div>`,k=a=>`
  <div class="card adjustment-card">
    <div class="meta">
      <span class="tag info">${s(a.parameter)}</span>
      <span class="tag ${a.confidence==="alta"?"ok":a.confidence==="media"?"warn":"muted"}">${s(a.confidence)}</span>
      <span class="tag ${a.status==="aprobado"||a.status==="aplicado"?"ok":a.status==="rechazado"?"crit":a.status==="reverted"?"warn":""} tiny">${s(a.status)}</span>
    </div>
    <div class="small" style="margin-top:6px;">
      <span class="muted">de</span> <code style="background:var(--bg-card-2);padding:2px 6px;border-radius:4px;">${s(a.currentValue)}</code>
      <span class="muted">\u2192</span> <code style="background:var(--accent-soft);padding:2px 6px;border-radius:4px;color:var(--accent);">${s(a.recommendedValue)}</code>
    </div>
    <div class="small muted" style="margin-top:6px;">${s(a.rationale)}</div>
    ${a.status==="propuesto"?`
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn primary tiny" data-adj-action="aprobado" data-id="${s(a.id)}">\u2713 Aprobar</button>
        <button class="btn ghost tiny" data-adj-action="rechazado" data-id="${s(a.id)}">\u2715 Rechazar</button>
      </div>`:""}
  </div>`,r=async a=>{const t=a.querySelector("#optimize-content");if(t)try{const[i,d,c,y]=await Promise.allSettled([n("/api/optimize/patterns?windowDays=60"),n("/api/optimize/recommendations"),n("/api/optimize/adjustments"),n("/api/optimize/summary")]),h=i.status==="fulfilled"?i.value:null,b=d.status==="fulfilled"&&Array.isArray(d.value)?d.value:[],f=c.status==="fulfilled"&&Array.isArray(c.value)?c.value:[],l=y.status==="fulfilled"?y.value:null,p=b.filter(e=>e.status==="propuesto"),m=f.filter(e=>e.status==="propuesto");t.innerHTML=`
      ${l?.summary?`
        <div class="alert">
          <div class="tiny muted" style="margin-bottom:4px;">\xDAltimo resumen ejecutivo \xB7 ${x.rel(l.ranAt)}</div>
          <div>${s(l.summary)}</div>
        </div>`:""}

      ${S(h)}

      <div class="col-header" style="margin-top:20px"><h3>\u{1F3AF} Pr\xF3ximas piezas recomendadas <span class="muted tiny">${p.length} pendientes</span></h3></div>
      ${p.length?`<div class="page-grid">${p.map(z).join("")}</div>`:v("\u{1F52E}","Sin recomendaciones abiertas. Corr\xE9 el loop para generar nuevas.",180)}

      <div class="col-header" style="margin-top:20px"><h3>\u2699\uFE0F Ajustes de estrategia <span class="muted tiny">${m.length} pendientes</span></h3></div>
      ${m.length?`<div class="page-grid">${m.map(k).join("")}</div>`:v("\u{1F6E0}\uFE0F","Sin ajustes pendientes. El loop propondr\xE1 nuevos en el pr\xF3ximo run.",180)}`,t.querySelectorAll('[data-action="produce"]').forEach(e=>{e.addEventListener("click",async()=>{await g(e,"produciendo\u2026",async()=>{try{const u=await n("/api/autonomous/produce",{method:"POST",body:{kind:"recommendation",recommendationId:e.dataset.id}});o(`Pieza producida \u2014 score ${u.scoreCard?.combinedScore??"?"}/100`,"ok"),await r(a)}catch(u){o("Error: "+u.message,"crit")}})})}),t.querySelectorAll('[data-action="discard"]').forEach(e=>{e.addEventListener("click",async()=>{await n(`/api/optimize/recommendations/${e.dataset.id}/status`,{method:"POST",body:{status:"descartado"}}),await r(a)})}),t.querySelectorAll("[data-adj-action]").forEach(e=>{e.addEventListener("click",async()=>{await n(`/api/optimize/adjustments/${e.dataset.id}/status`,{method:"POST",body:{status:e.dataset.adjAction}}),await r(a)})})}catch(i){t.innerHTML=`<div class="alert crit">Error: ${s(i.message)}</div>`,o(i.message,"crit")}};export const renderOptimize=async a=>{a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F501} Auto-Optimization</h1>
        <p class="view-subtitle page-subtitle">Bucle de aprendizaje: el sistema extrae qu\xE9 funciona en tu cuenta y propone pr\xF3ximas piezas.</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" id="run-opt-btn">\u25B6 Correr loop</button>
        <button class="btn" id="produce-batch-btn">\u{1F916} Producir lote (3)</button>
      </div>
    </header>
    <div id="optimize-content" class="page-body">${w()}</div>`,a.querySelector("#run-opt-btn").addEventListener("click",async t=>{await g(t.currentTarget,"analizando\u2026",async()=>{try{await n("/api/optimize/run",{method:"POST",body:{windowDays:60,persist:!0}}),o("Loop ejecutado con \xE9xito","ok"),await r(a)}catch(i){o("Error: "+i.message,"crit")}})}),a.querySelector("#produce-batch-btn").addEventListener("click",async t=>{await g(t.currentTarget,"produciendo lote\u2026",async()=>{try{const i=await n("/api/autonomous/produce-batch",{method:"POST",body:{count:3}});o(`${i.count} piezas producidas`,"ok"),await r(a)}catch(i){o("Error: "+i.message,"crit")}})}),await r(a)};
