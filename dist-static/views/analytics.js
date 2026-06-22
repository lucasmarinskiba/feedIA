import{api as g}from"../lib/api.js";import{escape as h,fmt as f}from"../lib/dom.js";import{toast as b}from"../lib/toast.js";import{loadingScreen as x,emptyState as S,withBtnSpinner as E}from"../lib/ui.js";let c={overview:null,engagement:[],bestTimes:[],formats:[],competitors:[]};const M=e=>e?e.connected===!1&&!e.real?`<div class="card" style="text-align:center;padding:32px;margin-bottom:20px">
      <div style="font-size:40px;margin-bottom:10px">\u{1F4E1}</div>
      <div style="font-weight:800;font-size:16px;margin-bottom:6px">Conect\xE1 Instagram para ver tus m\xE9tricas reales</div>
      <p class="small muted" style="max-width:340px;margin:0 auto 16px">Seguimiento de seguidores, alcance, engagement y guardados directo desde tu cuenta.</p>
      <a href="#settings" class="btn primary small" onclick="window.navigate?.('settings')">Conectar cuenta</a>
    </div>`:`<div class="kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
    ${[{icon:"\u{1F465}",label:"Seguidores",value:e.followers??0,delta:e.followersDelta??0,color:"#5b9bff"},{icon:"\u{1F4E1}",label:"Alcance",value:e.reach??0,delta:e.reachDelta??0,color:"#4ade80"},{icon:"\u2764\uFE0F",label:"Engagement",value:(e.engagementRate??0).toFixed(2)+"%",delta:e.engagementDelta??0,color:"#e1306c"},{icon:"\u{1F516}",label:"Guardados",value:e.saves??0,delta:e.savesDelta??0,color:"#fbbf24"},{icon:"\u2197\uFE0F",label:"Compartidos",value:e.shares??0,delta:e.sharesDelta??0,color:"#a78bfa"},{icon:"\u{1F441}",label:"Impresiones",value:e.impressions??0,delta:e.impressionsDelta??0,color:"#22d3ee"}].map(({icon:t,label:i,value:o,delta:s,color:n})=>{const d=s>=0;return`
        <div class="kpi-card" style="border-color:${n}22">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="kpi-icon">${t}</span>
            <span class="kpi-delta ${d?"up":"down"}">${d?"\u25B2":"\u25BC"} ${Math.abs(s)}%</span>
          </div>
          <div class="kpi-value" style="color:${n}">${typeof o=="number"?f.num(o):o}</div>
          <div class="kpi-label">${i}</div>
          <svg viewBox="0 0 60 32" style="width:100%;height:32px;opacity:.35">
            <polyline points="${Array.from({length:7},(p,m)=>`${m*10},${32*.55}`).join(" ")}" stroke="${n}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>`}).join("")}
  </div>`:S("\u{1F4CA}","Cargando m\xE9tricas\u2026"),A=e=>{if(!e.length)return`
    <div class="card" style="margin-bottom:20px">
      <h3>\u{1F4C8} Engagement Rate \u2014 \xFAltimos 14 d\xEDas</h3>
      <div style="text-align:center;padding:28px 16px">
        <div style="font-size:32px;margin-bottom:8px">\u{1F4C8}</div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">A\xFAn sin historial de engagement</div>
        <div class="tiny muted">Se registrar\xE1 autom\xE1ticamente al conectar Instagram y usar Analytics</div>
      </div>
    </div>`;const a=e,t=600,i=120,o=20,s=a.map(r=>parseFloat(r.engagementRate??0)),n=Math.min(...s),d=Math.max(...s)-n||1,p=a.map((r,l)=>o+l/(a.length-1)*(t-o*2)),m=s.map(r=>o+(1-(r-n)/d)*(i-o*2)),y=p.map((r,l)=>`${l===0?"M":"L"}${r},${m[l]}`).join(" "),w=`${y} L${p.at(-1)},${i} L${p[0]},${i} Z`,k=p.map((r,l)=>`<circle cx="${r}" cy="${m[l]}" r="3" fill="#e1306c"/>`).join(""),j=a.filter((r,l)=>l%2===0).map((r,l)=>{const R=l*2;return`<text x="${p[R]}" y="${i+14}" text-anchor="middle" font-size="9" fill="#6e6e6e">${r.fecha?.slice(5)??""}</text>`}).join("");return`
    <div class="card" style="margin-bottom:20px">
      <h3>\u{1F4C8} Engagement Rate \u2014 \xFAltimos 14 d\xEDas</h3>
      <svg viewBox="0 0 ${t} ${i+20}" style="width:100%;height:auto;overflow:visible">
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e1306c" stop-opacity=".35"/>
            <stop offset="100%" stop-color="#e1306c" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${w}" fill="url(#eg)"/>
        <path d="${y}" stroke="#e1306c" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        ${k}
        ${j}
      </svg>
    </div>`},H=["Lun","Mar","Mi\xE9","Jue","Vie","S\xE1b","Dom"],$=[6,9,12,15,18,21],D=[{dia:0,hora:9,score:.62},{dia:0,hora:12,score:.78},{dia:0,hora:18,score:.71},{dia:0,hora:21,score:.58},{dia:1,hora:9,score:.68},{dia:1,hora:12,score:.82},{dia:1,hora:18,score:.75},{dia:1,hora:21,score:.63},{dia:2,hora:9,score:.65},{dia:2,hora:12,score:.73},{dia:2,hora:18,score:.8},{dia:2,hora:21,score:.69},{dia:3,hora:9,score:.7},{dia:3,hora:12,score:.85},{dia:3,hora:18,score:.77},{dia:3,hora:21,score:.72},{dia:4,hora:9,score:.72},{dia:4,hora:12,score:.88},{dia:4,hora:15,score:.84},{dia:4,hora:18,score:.76},{dia:5,hora:9,score:.55},{dia:5,hora:12,score:.74},{dia:5,hora:15,score:.79},{dia:5,hora:18,score:.83},{dia:6,hora:9,score:.52},{dia:6,hora:12,score:.71},{dia:6,hora:15,score:.77},{dia:6,hora:18,score:.82}],L=e=>{const a=!e?.length,t=a?D:e,i={};t.forEach(s=>{i[`${s.dia}-${s.hora}`]=s.score});const o=(s,n)=>i[`${s}-${n}`]??.3;return`
    <div class="card" style="margin-bottom:20px">
      <h3>\u{1F550} Mejores horarios de publicaci\xF3n</h3>
      <p class="small muted" style="margin-bottom:14px">${a?"Benchmarks 2024 \xB7 Conect\xE1 Instagram para ver tus horarios reales":"Mayor color = mayor engagement en tu cuenta"}</p>
      <div class="heatmap-grid">
        <div class="heatmap-corner"></div>
        ${$.map(s=>`<div class="heatmap-hlabel">${s}hs</div>`).join("")}
        ${H.map((s,n)=>`
          <div class="heatmap-dlabel">${s}</div>
          ${$.map(v=>{const d=o(n,v),p=.1+d*.9;return`<div class="heatmap-cell ${d>.75?"best":""}" style="background:rgba(225,48,108,${p.toFixed(2)})" title="${s} ${v}hs \u2014 score: ${(d*100).toFixed(0)}"></div>`}).join("")}`).join("")}
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
        <div style="width:80px;height:8px;border-radius:4px;background:linear-gradient(to right,rgba(225,48,108,.1),rgba(225,48,108,1))"></div>
        <span class="tiny muted">Menor \u2192 Mayor engagement</span>
      </div>
    </div>`},T=e=>`
    <div class="card" style="margin-bottom:20px">
      <h3>\u{1F4CA} Rendimiento por formato</h3>
      ${(e.length?e:[{formato:"Reel",score:92,posts:12,avgEng:4.2},{formato:"Carrusel",score:78,posts:8,avgEng:3.1},{formato:"Post imagen",score:55,posts:20,avgEng:1.8},{formato:"Historia",score:45,posts:35,avgEng:1.2}]).map(t=>`
        <div class="gauge-row" style="margin:10px 0">
          <span class="small" style="width:90px;flex-shrink:0">${h(t.formato)}</span>
          <div class="gauge-bar" style="flex:1">
            <div class="gauge-fill" style="width:${t.score}%;background:var(--ig-gradient)"></div>
          </div>
          <span class="small muted" style="width:60px;text-align:right">${t.score}/100</span>
          <span class="tag tiny" style="margin-left:8px">${t.posts} posts</span>
        </div>`).join("")}
    </div>`,z=e=>`
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h3>\u{1F440} Radar de competidores</h3>
        <button class="btn ghost small" id="refresh-competitors-btn">\u21BB Actualizar</button>
      </div>
      <div class="list-inner" style="border:1px solid var(--border-soft);border-radius:var(--radius-lg)">
        ${(e.length?e:[{handle:"@competidor1",followers:12400,engRate:3.8,lastPost:"2h"},{handle:"@competidor2",followers:8900,engRate:5.1,lastPost:"1d"},{handle:"@competidor3",followers:31e3,engRate:1.9,lastPost:"3d"}]).map(t=>`
          <div class="list-item">
            <div class="list-item-icon" style="font-size:32px;width:40px;height:40px;border-radius:50%;background:var(--ig-gradient);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:14px">
              ${h(t.handle.slice(1,3).toUpperCase())}
            </div>
            <div class="list-item-body">
              <div class="small" style="font-weight:700">${h(t.handle)}</div>
              <div class="tiny muted">${f.num(t.followers)} seguidores \xB7 \xFAltimo post: ${t.lastPost}</div>
            </div>
            <div style="text-align:right">
              <div class="small" style="font-weight:700;color:var(--accent)">${t.engRate}%</div>
              <div class="tiny muted">eng rate</div>
            </div>
          </div>`).join("")}
      </div>
    </div>`,C=e=>{const a=e.querySelector("#analytics-content");a&&(a.innerHTML=`
    ${M(c.overview)}
    ${A(c.engagement)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>${T(c.formats)}</div>
      <div>${L(c.bestTimes)}</div>
    </div>
    ${z(c.competitors)}
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h3>\u{1F4CB} Generar reporte semanal</h3>
        <button class="btn primary" id="generate-report-btn">\u{1F4E9} Generar y enviar</button>
      </div>
      <p class="small muted">El reporte consolida m\xE9tricas de los \xFAltimos 7 d\xEDas y lo env\xEDa al webhook configurado.</p>
    </div>`,e.querySelector("#refresh-competitors-btn")?.addEventListener("click",()=>u(e)),e.querySelector("#generate-report-btn")?.addEventListener("click",async t=>{await E(t.currentTarget,"Generando\u2026",async()=>{try{await g("/api/analytics/report",{body:{}}),b("Reporte enviado \u2713","ok")}catch(i){b(i.message,"crit")}})}))},u=async e=>{const a=e.querySelector("#analytics-content");a&&(a.innerHTML=x());const[t,i,o,s]=await Promise.allSettled([g("/api/analytics/overview"),g("/api/analytics/engagement"),g("/api/analytics/formats"),g("/api/analytics/best-times")]);c.overview=t.status==="fulfilled"?t.value:null,c.engagement=i.status==="fulfilled"?i.value.data??[]:[],c.formats=o.status==="fulfilled"?o.value.formats??[]:[],c.bestTimes=s.status==="fulfilled"?s.value.data??[]:[],C(e)};export const renderAnalytics=async e=>{c={overview:null,engagement:[],bestTimes:[],formats:[],competitors:[]},e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F4CA} Analytics</h1>
        <p class="view-subtitle page-subtitle">M\xE9tricas, rendimiento y an\xE1lisis inteligente de tu cuenta.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="analytics-refresh-btn">\u21BB Actualizar</button>
      </div>
    </header>
    <div id="analytics-content" class="page-body">${x()}</div>`,e.querySelector("#analytics-refresh-btn")?.addEventListener("click",()=>u(e)),await u(e)};
