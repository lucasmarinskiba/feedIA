import{apiSafe as i,apiBust as u}from"../lib/api.js";import{escape as a}from"../lib/dom.js";import{toast as p}from"../lib/toast.js";const m={morning:"\u2600\uFE0F",evening:"\u{1F319}","monday-kickoff":"\u{1F3AF}","friday-close":"\u{1F37B}"},y={morning:"Ma\xF1ana",evening:"Noche","monday-kickoff":"Lunes Kickoff","friday-close":"Cierre Viernes"},k=t=>`
  <div class="card">
    <div class="meta">
      <span style="font-size:24px;">${m[t.type]??"\u2728"}</span>
      <span class="tag tiny">${y[t.type]??t.type}</span>
      <span class="small muted">${new Date(t.deliveredAt).toLocaleString("es-AR")}</span>
    </div>
    <h3 style="margin:8px 0 4px;">${a(t.headline??"")}</h3>
    <p style="font-style:italic;color:var(--text-muted);">${a(t.body??"")}</p>
    ${t.tipOfTheDay?`<div class="small accent" style="margin-top:8px;"><strong>\u{1F4A1} Tip:</strong> ${a(t.tipOfTheDay)}</div>`:""}
    ${t.actionItems?.length?`<ul style="margin-top:8px;padding-left:20px;">${t.actionItems.map(e=>`<li>${a(e)}</li>`).join("")}</ul>`:""}
    ${t.kpiHighlight?`<div class="small" style="margin-top:8px;"><strong>${a(t.kpiHighlight.label)}:</strong> ${a(t.kpiHighlight.value)}</div>`:""}
    ${t.acknowledged?'<div class="small ok" style="margin-top:8px;">\u2713 Acknowledged</div>':`<button class="btn small" data-ack="${a(t.id)}" style="margin-top:10px;">\u2713 Vi esto</button>`}
  </div>`;export const renderRituals=async t=>{t.innerHTML=`
    <div class="page-header">
      <h1>\u2600\uFE0F Rituales</h1>
      <p class="muted">Ma\xF1ana, noche, lunes y viernes. El ritmo de tu casa.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">
      <button class="btn" data-trigger="morning">\u2600\uFE0F Generar ritual matutino</button>
      <button class="btn" data-trigger="evening">\u{1F319} Generar ritual nocturno</button>
      <button class="btn" data-trigger="monday">\u{1F3AF} Generar Monday kickoff</button>
      <button class="btn" data-trigger="friday">\u{1F37B} Generar cierre del viernes</button>
    </div>
    <div id="snapshot" class="stats-grid" style="margin-bottom:20px;"></div>
    <div id="rituals-grid"></div>
  `;const[e,l]=await Promise.all([i("/api/rituals/snapshot",{totalDelivered:0,thisWeekCount:0,streak:0,ackRate:0}),i("/api/rituals?limit=14",[])]),s=e.data??{totalDelivered:0,thisWeekCount:0,streak:0,ackRate:0},d=l.data??[],v=!!e.error&&!!l.error;document.getElementById("snapshot").innerHTML=`
    <div class="card stat-card"><div class="stat-label">Total entregados</div><div class="stat-value">${s.totalDelivered}</div></div>
    <div class="card stat-card"><div class="stat-label">Esta semana</div><div class="stat-value">${s.thisWeekCount}</div></div>
    <div class="card stat-card"><div class="stat-label">Streak</div><div class="stat-value">${s.streak} d\xEDas</div></div>
    <div class="card stat-card"><div class="stat-label">Acknowledgment</div><div class="stat-value">${s.ackRate?.toFixed(0)??0}%</div></div>
  `,document.getElementById("rituals-grid").innerHTML=d.length>0?d.map(k).join(""):v?'<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend. Los rituales se cargar\xE1n cuando el servidor vuelva.</div>':'<div class="empty-state">A\xFAn no hay rituales. Gener\xE1 uno con los botones arriba.</div>',t.addEventListener("click",async r=>{const o=r.target.closest("[data-trigger]");if(o){const c=o.dataset.trigger;p(`Generando ritual ${c}...`,"info"),u("/api/rituals");const{error:g}=await i(`/api/rituals/${c}`,null,{method:"POST",body:{}});if(g){p("No se pudo generar el ritual (offline)","warn");return}renderRituals(t);return}const n=r.target.closest("[data-ack]");n&&(await i(`/api/rituals/${n.dataset.ack}/ack`,null,{method:"POST",body:{}}),n.replaceWith(Object.assign(document.createElement("div"),{className:"small ok",textContent:"\u2713 Acknowledged",style:"margin-top:8px;"})))})};
