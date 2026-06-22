const x="feedia.scores.history",u=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),j=()=>{try{return JSON.parse(localStorage.getItem(x)||"[]")}catch{return[]}},C=e=>{try{return new Date(e).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return"\u2014"}},k=e=>{if(!e.length)return'<div class="muted" style="text-align:center;padding:20px;">Sin datos para graficar</div>';const t=600,d=140,o=30,p=10,v=10,b=20,g=t-o-p,y=d-v-b,s=e.slice().reverse(),h=s.length,m=i=>o+(h<=1?g/2:i/(h-1)*g),r=i=>v+y-Math.min(100,Math.max(0,i))/100*y,a=(i,n)=>`<polyline points="${s.map((l,w)=>`${m(w).toFixed(1)},${r(l[i]??0).toFixed(1)}`).join(" ")}" fill="none" stroke="${n}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,c=(i,n)=>s.map((f,l)=>`<circle cx="${m(l).toFixed(1)}" cy="${r(f[i]??0).toFixed(1)}" r="3" fill="${n}"/>`).join(""),S=[0,25,50,75,100].map(i=>{const n=r(i).toFixed(1);return`<line x1="${o}" y1="${n}" x2="${t-p}" y2="${n}" stroke="#333" stroke-width="1"/>
            <text x="${o-4}" y="${n}" text-anchor="end" fill="#666" font-size="9" dominant-baseline="middle">${i}</text>`}).join("");return`
    <svg viewBox="0 0 ${t} ${d}" style="width:100%;height:auto;display:block;">
      ${S}
      ${a("innovationScore","#a855f7")}
      ${a("influencerScore","#22d3ee")}
      ${a("brandCoherenceScore","#10b981")}
      ${c("innovationScore","#a855f7")}
      ${c("influencerScore","#22d3ee")}
      ${c("brandCoherenceScore","#10b981")}
    </svg>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:6px;font-size:11px;">
      <span><span style="color:#a855f7;">\u25CF</span> Innovaci\xF3n</span>
      <span><span style="color:#22d3ee;">\u25CF</span> Influencer</span>
      <span><span style="color:#10b981;">\u25CF</span> Coherencia</span>
    </div>`},z=e=>e.length?e.slice(0,5).map(t=>`
    <div class="card" style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
      <div>
        <div class="meta" style="margin-bottom:4px;">
          <span class="tag tiny">${u(t.contentFormat??"carousel")}</span>
          ${t.jobId?`<span class="tag tiny info">${u(String(t.jobId).slice(0,10))}</span>`:""}
          <span class="small muted">${C(t.ts)}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#a855f7;">${t.innovationScore??"\u2014"}</div>
          <div style="font-size:9px;opacity:0.6;">innov</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#22d3ee;">${t.influencerScore??"\u2014"}</div>
          <div style="font-size:9px;opacity:0.6;">infl</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#10b981;">${t.brandCoherenceScore??"\u2014"}</div>
          <div style="font-size:9px;opacity:0.6;">coher</div>
        </div>
      </div>
    </div>`).join(""):'<div class="empty-state">A\xFAn no hay scores registrados. Activ\xE1 el Cerebro Maestro en Carrusel Studio para generar el primero.</div>',$=e=>{const t=j();e.innerHTML=`
    <div class="page-header">
      <h1>\u{1F4CA} Historial de Scores</h1>
      <p class="muted">Evoluci\xF3n de los scores del Cerebro Maestro a lo largo del tiempo.</p>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-weight:700;">L\xEDneas de tendencia (\xFAltimas ${Math.min(t.length,50)} sesiones)</div>
        <button class="btn ghost tiny" id="sh-clear">\u{1F5D1}\uFE0F Limpiar historial</button>
      </div>
      <div id="sh-chart">${k(t)}</div>
    </div>

    <h3 style="margin-bottom:10px;">\xDAltimas 5 sesiones</h3>
    <div id="sh-cards">${z(t)}</div>
  `,e.querySelector("#sh-clear")?.addEventListener("click",()=>{confirm("\xBFLimpiar todo el historial de scores?")&&(localStorage.removeItem(x),$(e))})};export const renderScoresHistory=e=>{$(e)};
