import{apiSafe as n}from"../lib/api.js";import{escape as s}from"../lib/dom.js";const f={success:"ok",partial:"warn",failed:"crit",cancelled:"","in-progress":""};export const renderReplayLog=async l=>{l.innerHTML=`
    <div class="page-header">
      <h1>\u{1F4DC} Replay Log</h1>
      <p class="muted">Cada sesi\xF3n de Computer Use queda grabada paso por paso.</p>
    </div>
    <div id="replay-stats" class="stats-grid" style="margin-bottom:18px;"></div>
    <div id="replay-list"></div>
  `;const d={totalSessions:0,byOutcome:{},avgStepsPerSession:0,avgDurationMs:0,diskUsageMB:0},[o,r]=await Promise.all([n("/api/cu/replay-stats",d),n("/api/cu/replay",[])]),i=o.data??d,c=r.data??[],y=!!o.error&&!!r.error;document.getElementById("replay-stats").innerHTML=`
    <div class="card stat-card"><div class="stat-label">Total sesiones</div><div class="stat-value">${i.totalSessions}</div></div>
    <div class="card stat-card"><div class="stat-label">Success</div><div class="stat-value">${i.byOutcome?.success??0}</div></div>
    <div class="card stat-card"><div class="stat-label">Avg pasos</div><div class="stat-value">${Math.round(i.avgStepsPerSession??0)}</div></div>
    <div class="card stat-card"><div class="stat-label">Avg duraci\xF3n</div><div class="stat-value">${Math.round((i.avgDurationMs??0)/1e3)}s</div></div>
    <div class="card stat-card"><div class="stat-label">Disco</div><div class="stat-value">${i.diskUsageMB} MB</div></div>
  `,document.getElementById("replay-list").innerHTML=c.length>0?c.map(a=>`

    <div class="card" style="cursor:pointer;" data-replay="${s(a.id)}">
      <div class="meta">
        <span class="tag tiny ${f[a.outcome]??""}">${s(a.outcome)}</span>
        <span class="tag tiny">${s(a.workflowName)}</span>
        <span class="small muted">${new Date(a.startedAt).toLocaleString("es-AR")}</span>
      </div>
      <div class="small" style="margin-top:6px;">${a.stepCount} pasos \xB7 @${s(a.brandName)}</div>
    </div>`).join(""):y?'<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend. Los replays se cargar\xE1n cuando el servidor vuelva.</div>':'<div class="empty-state">A\xFAn no hay replays. Ejecut\xE1 un pipeline en "Canva \u2192 IG" para generar tu primer replay.</div>';const p=(()=>{try{return JSON.parse(localStorage.getItem("feedia.brain.sessions")||"[]")}catch{return[]}})(),v=document.createElement("div");v.innerHTML=`
    <h2 style="margin-top:24px;margin-bottom:10px;">\u{1F9E0} Brain Sessions</h2>
    ${p.length===0?'<div class="empty-state">A\xFAn no hay brain sessions. Activ\xE1 el Cerebro Maestro en Carrusel Studio para registrar una.</div>':p.map(a=>`
        <div class="card" style="margin-bottom:8px;">
          <div class="meta">
            <span class="tag tiny info">${s(a.contentFormat??"carousel")}</span>
            <span class="tag tiny">${s(String(a.jobId??"").slice(0,12))}</span>
            <span class="small muted">${new Date(a.ts).toLocaleString("es-AR")}</span>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px;">
            <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:#a855f7;">${a.scores?.innovation??"\u2014"}</div><div style="font-size:9px;opacity:0.6;">innovaci\xF3n</div></div>
            <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:#22d3ee;">${a.scores?.influencer??"\u2014"}</div><div style="font-size:9px;opacity:0.6;">influencer</div></div>
            <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:#10b981;">${a.scores?.coherence??"\u2014"}</div><div style="font-size:9px;opacity:0.6;">coherencia</div></div>
            <div class="small muted" style="margin-left:auto;align-self:center;">${(a.steps??[]).length} pasos</div>
          </div>
        </div>`).join("")}
  `,l.appendChild(v),l.addEventListener("click",async a=>{const m=a.target.closest("[data-replay]");if(!m)return;const{data:u,error:g}=await n(`/api/cu/replay/${m.dataset.replay}`,null);if(g||!u)return;const e=u.session,$=`
      <div class="modal-backdrop" id="rep-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="card" style="max-width:900px;max-height:90vh;overflow-y:auto;">
          <button class="btn small" onclick="document.getElementById('rep-modal').remove()" style="float:right;">\u2715</button>
          <h2>\u{1F4DC} ${s(e.workflowName)}</h2>
          <div class="small muted">${e.steps.length} pasos \xB7 ${Math.round((e.totalDurationMs??0)/1e3)}s \xB7 ${s(e.outcome)}</div>
          ${e.summary?`<p style="margin-top:10px;font-style:italic;">${s(e.summary)}</p>`:""}
          <h3 style="margin-top:18px;">Pasos</h3>
          ${e.steps.map(t=>`
            <div class="card" style="margin-bottom:8px;padding:10px;${t.ok?"":"border-left:3px solid var(--crit);"}">
              <div class="meta">
                <span class="tag tiny">${s(t.actionType)}</span>
                <span class="small muted">${new Date(t.at).toLocaleTimeString("es-AR")}</span>
              </div>
              <div class="small" style="margin-top:6px;"><strong>#${t.stepNumber}.</strong> ${s(t.description)}</div>
              ${t.rationale?`<div class="small muted" style="margin-top:4px;font-style:italic;">${s(t.rationale)}</div>`:""}
              ${t.error?`<div class="small crit">\u274C ${s(t.error)}</div>`:""}
            </div>`).join("")}
          ${e.outputs?.publishedUrls?.length?`
            <h3>URLs publicadas</h3>
            <ul>${e.outputs.publishedUrls.map(t=>`<li><a href="${s(t)}" target="_blank">${s(t)}</a></li>`).join("")}</ul>`:""}
        </div>
      </div>`;document.body.insertAdjacentHTML("beforeend",$)})};
