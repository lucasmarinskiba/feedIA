import{apiSafe as g}from"../lib/api.js";import{escape as e}from"../lib/dom.js";import{toast as b}from"../lib/toast.js";const S=a=>"$"+(a||0).toLocaleString("en-US"),j=a=>a>=1e6?(a/1e6).toFixed(2)+"M":a>=1e4?(a/1e3).toFixed(1)+"k":a>=1e3?(a/1e3).toFixed(2)+"k":(a||0).toLocaleString("en-US"),E=[{id:"summary",label:"\u{1F451} Resumen"},{id:"commandCenter",label:"\u{1F3AF} Command Center"},{id:"decisions",label:"\u2696\uFE0F Decisiones"},{id:"okrs",label:"\u{1F3C1} OKRs"},{id:"igAutopilot",label:"\u{1F4F7} IG Autopilot"},{id:"ttAutopilot",label:"\u{1F3B5} TT Autopilot"},{id:"proposals",label:"\u{1F4A1} Propuestas"},{id:"posts",label:"\u{1F4CA} An\xE1lisis posts"},{id:"analytics",label:"\u{1F4C8} Analytics"},{id:"reports",label:"\u{1F4C4} Reportes"},{id:"audit",label:"\u2705 Audit"},{id:"predictor",label:"\u{1F4E1} Predictor"},{id:"tools",label:"\u{1F9F0} Herramientas IA"},{id:"alerts",label:"\u{1F6A8} Alertas"},{id:"logbook",label:"\u{1F4D2} Bit\xE1cora"},{id:"experiments",label:"\u{1F9EA} Experimentos"},{id:"scheduler",label:"\u23F0 Scheduler"},{id:"collabs",label:"\u{1F91D} Collabs"}],h={reports:{path:"./workspace.js",name:"renderReportes"},audit:{path:"./audit.js",name:"renderAudit"},predictor:{path:"./predictor.js",name:"renderPredictor"},tools:{path:"./tools.js",name:"renderTools"}};let c="summary";const P=(a,o)=>{if(!a||!a.length)return"";const s=Math.max(...a),n=Math.min(...a),i=Math.max(1,s-n),l=320/(a.length-1),d=a.map((A,z)=>`${(z*l).toFixed(1)},${(60-(A-n)/i*60).toFixed(1)}`).join(" "),v=a[a.length-1],m=(a.length-1)*l,p=60-(v-n)/i*60,x="g"+o.replace("#",""),$=`M0,60 L${d.replace(/ /g," L")} L320,60 Z`;return`<svg viewBox="0 0 320 60" preserveAspectRatio="none" style="width:100%;height:60px;display:block;">
    <defs><linearGradient id="${x}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${o}" stop-opacity=".34"/>
      <stop offset="100%" stop-color="${o}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${$}" fill="url(#${x})"/>
    <polyline points="${d}" fill="none" stroke="${o}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${m.toFixed(1)}" cy="${p.toFixed(1)}" r="5" fill="${o}" opacity=".22"/>
    <circle cx="${m.toFixed(1)}" cy="${p.toFixed(1)}" r="2.4" fill="${o}"/>
  </svg>`},f=({platform:a,handle:o,followers:r,deltaPct:t,deltaPositive:s=!0,spark:n,tier:i,metrics:l})=>{const d=a==="instagram"?{name:"Instagram",accent:"#E1306C",accent2:"#F77737",glyph:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'}:{name:"TikTok",accent:"#25F4EE",accent2:"#FE2C55",glyph:'<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.6 6.7c-1.5-.4-2.7-1.5-3.1-3l-.1-.5h-3.6v13.3a2.6 2.6 0 1 1-2.6-2.6c.3 0 .6 0 .8.1V10.4a6.2 6.2 0 0 0-6 6.2 6.2 6.2 0 0 0 12.4 0V9.5c1.1.7 2.4 1.1 3.8 1.1V7c-.6 0-1.2-.1-1.6-.3Z"/></svg>'},v=s?"#34d399":"#f87171",m=s?"\u2191":"\u2193";return`<div class="v2-card v2-grow-card">
    <div class="v2-grow-accent" style="background:linear-gradient(90deg,transparent,${d.accent},transparent);"></div>
    <div class="v2-grow-head">
      <div class="v2-grow-brand">
        <div class="v2-grow-glyph" style="background:${d.accent}1f;color:${d.accent};">${d.glyph}</div>
        <div>
          <div class="v2-eyebrow">${d.name}</div>
          <div class="v2-grow-handle">${e(o)}</div>
        </div>
      </div>
      <span class="v2-badge" style="background:${d.accent}1a;color:${d.accent};box-shadow:inset 0 0 0 1px ${d.accent}3a;">live</span>
    </div>
    <div class="v2-grow-primary">
      <div class="v2-eyebrow">Followers</div>
      <div class="v2-grow-followers-row">
        <span class="v2-num-xl">${j(r)}</span>
        <span class="v2-delta" style="color:${v};">${m} ${e(t)}</span>
      </div>
      <div class="v2-hint">vs \xFAltimos 30 d\xEDas</div>
    </div>
    <div class="v2-grow-spark">${P(n,d.accent)}</div>
    ${i?`<div class="v2-grow-tier">
      <div class="v2-grow-tier-head">
        <span class="v2-eyebrow">${e(i.name)}</span>
        <span class="v2-num-sm">${i.pct}%</span>
      </div>
      <div class="v2-grow-tier-bar"><div style="width:${i.pct}%;background:linear-gradient(90deg,${d.accent},${d.accent2});"></div></div>
    </div>`:""}
    <div class="v2-grow-metrics">
      ${l.map(p=>`<div class="v2-grow-metric">
        <div class="v2-eyebrow">${e(p.label)}</div>
        <div class="v2-grow-metric-val">
          <span class="v2-num-md">${e(String(p.value))}</span>
          ${p.delta?`<span class="v2-delta-sm" style="color:${p.delta.positive?"#34d399":"#f87171"};">${p.delta.positive?"\u2191":"\u2193"}${e(p.delta.value)}</span>`:""}
        </div>
        ${p.hint?`<div class="v2-hint">${e(p.hint)}</div>`:""}
      </div>`).join("")}
    </div>
  </div>`},R=[10200,10380,10510,10620,10780,10960,11210,11380,11520,11790,11900,12260,12410,12680,12830,13110,13280,13580,13720,14060],C=[24300,24700,25010,25320,25950,26380,27110,27530,28310,28780,29710,30260,31520,32890,34380,35980,36810,38510,39420,40380],q=a=>`
    ${a.ascenso?`<div class="v2-ascenso">\u{1F389} <strong>\xA1Ascendiste!</strong> Subiste de <strong>${e(a.ascenso.de)}</strong> a <strong>${e(a.ascenso.a)}</strong>.</div>`:""}

    <!-- HERO minimal -->
    <header class="v2-hero">
      <div class="v2-hero-inner">
        <div>
          <div class="v2-hero-tags">
            <span class="v2-badge v2-badge-brand">Sala Ejecutiva</span>
            <span class="v2-badge v2-badge-ok">Tier ${e(a.tier)}</span>
          </div>
          <h1 class="v2-h1">
            Tu imperio opera a escala
            <span class="v2-h1-dim">sin n\xF3mina ni agencia.</span>
          </h1>
          <p class="v2-lead">${e(a.narrativa||"FeedIA reemplaza un equipo ejecutivo de contenido. Esta sala muestra la econom\xEDa real y el crecimiento por red.")}</p>
        </div>
        <div class="v2-hero-cta">
          <button class="v2-btn v2-btn-primary" data-go-route="autopilot">Activar Auto-pilot \u2192</button>
          <button class="v2-btn v2-btn-outline" data-go-route="cliente">Modo Cliente</button>
        </div>
      </div>
      <div class="v2-tier-progress">
        <div class="v2-tier-progress-head">
          <span class="v2-eyebrow">Progreso al siguiente nivel</span>
          <span class="v2-num-sm">${a.tierProgresoPct||0}%</span>
        </div>
        <div class="v2-tier-progress-bar"><div style="width:${a.tierProgresoPct||0}%;"></div></div>
      </div>
    </header>

    <!-- KPI grid -->
    <section class="v2-section">
      <div class="v2-section-head">
        <div class="v2-eyebrow">Econom\xEDa operativa</div>
        <h2 class="v2-h2">Lo que tu equipo IA factura hoy</h2>
        <p class="v2-section-desc">M\xE9tricas financieras y de palanca.</p>
      </div>
      <div class="v2-kpi-grid">
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Apalancamiento</div><div class="v2-num-xl">${e(a.leverage.ratioLabel||"0\xD7")}</div><div class="v2-hint">acciones IA por indicaci\xF3n tuya</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Acciones ejecutadas</div><div class="v2-num-xl">${(a.leverage.accionesEjecutadas||0).toLocaleString("en-US")}</div><div class="v2-hint">por tu equipo IA</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Sueldos no pag\xE1s</div><div class="v2-num-xl">${S(a.leverage.costoEquipoUsdMes)}</div><div class="v2-hint">USD por mes</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Horas humanas ahorradas</div><div class="v2-num-xl">${(a.leverage.horasHumanasAhorradas||0).toLocaleString("en-US")}h</div><div class="v2-hint">por mes</div></div>
      </div>
    </section>

    <!-- GROWTH BY NETWORK -->
    <section class="v2-section">
      <div class="v2-section-head">
        <div class="v2-eyebrow">Crecimiento por red</div>
        <h2 class="v2-h2">Instagram &amp; TikTok</h2>
        <p class="v2-section-desc">Audiencia, alcance y conversi\xF3n por plataforma \xB7 sparkline 30d.</p>
      </div>
      <div class="v2-grow-grid">
        ${f({platform:"instagram",handle:"@feedia.ai",followers:14060,deltaPct:"+37.8%",deltaPositive:!0,spark:R,tier:{name:"Authority",pct:64},metrics:[{label:"Alcance 30d",value:"287.4k",delta:{value:"22%",positive:!0}},{label:"ER promedio",value:"5.2%",delta:{value:"0.8pp",positive:!0},hint:"vs benchmark 4.5%"},{label:"Saves + Sends",value:"8.9k",delta:{value:"31%",positive:!0}},{label:"Profile visits",value:"12.6k",delta:{value:"18%",positive:!0}}]})}
        ${f({platform:"tiktok",handle:"@feedia",followers:40380,deltaPct:"+66.2%",deltaPositive:!0,spark:C,tier:{name:"FYP Native",pct:81},metrics:[{label:"Views 30d",value:"1.42M",delta:{value:"54%",positive:!0}},{label:"Completion",value:"61%",delta:{value:"4.2pp",positive:!0},hint:"vs benchmark 48%"},{label:"Shares",value:"14.2k",delta:{value:"47%",positive:!0}},{label:"FYP entries",value:"62%",delta:{value:"9pp",positive:!0}}]})}
      </div>
    </section>

    <!-- STAFF + HITOS -->
    <section class="v2-2col">
      <div class="v2-card v2-card-pad">
        <div class="v2-card-head">
          <strong>Staff IA report\xE1ndote</strong>
          <span class="v2-badge v2-badge-ok">activo 24/7</span>
        </div>
        <div class="v2-staff">
          ${(a.staff||[]).map(r=>`
            <div class="v2-staff-row">
              <span class="v2-dot"></span>
              <div class="v2-staff-main">
                <div class="v2-staff-rol">${e(r.rol)}</div>
                <div class="v2-hint" style="color:#34d399;">${e(r.estado)}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>
      <div class="v2-card v2-card-pad">
        <div class="v2-card-head"><strong>Logros desbloqueados</strong></div>
        ${a.hitos&&a.hitos.length?`<div class="v2-hitos">
          ${a.hitos.map(r=>`
            <div class="v2-hito-row">
              <span class="v2-hito-ic">\u{1F3C6}</span>
              <div>
                <div class="v2-staff-rol">${e(r.titulo)}</div>
                <div class="v2-hint">${e(r.detalle)}</div>
              </div>
              <span class="v2-badge v2-badge-warn">nuevo</span>
            </div>`).join("")}
        </div>`:'<div class="v2-hint">Tus primeros logros aparecer\xE1n ac\xE1.</div>'}
      </div>
    </section>
  `,y=[{agent:"Nova",emoji:"\u{1F3A8}",priority:"alta",title:'Carrusel "el error #1 al automatizar"',why:"Predigo 2.3\xD7 engagement vs tu promedio.",cta:"Aprobar y agendar"},{agent:"L\xEDa",emoji:"\u270D\uFE0F",priority:"media",title:"Reescribir \xFAltimas 5 captions",why:"Las \xFAltimas perdieron tono c\xF3mplice. Recupero en 2 min.",cta:"Revisar borradores"},{agent:"Mira",emoji:"\u{1F4C8}",priority:"alta",title:"Boost de $40 al reel del martes",why:"ROAS estimado 3.8\xD7. Mejor performer del mes.",cta:"Aprobar boost"},{agent:"Gard",emoji:"\u{1F6E1}\uFE0F",priority:"cr\xEDtica",title:"#IAfacil entr\xF3 en lista gris",why:"Reemplazar antes de los pr\xF3ximos 3 posts.",cta:"Reemplazar ya"},{agent:"Luca",emoji:"\u{1F680}",priority:"media",title:"Serie story diaria 21h x 7 d\xEDas",why:"Retention 14% mayor en ese horario.",cta:"Activar serie"}],k={cr\u00EDtica:{bg:"rgba(239,68,68,.10)",col:"#fda4a4",ring:"rgba(239,68,68,.28)"},alta:{bg:"rgba(245,158,11,.10)",col:"#fbcb6b",ring:"rgba(245,158,11,.28)"},media:{bg:"rgba(124,58,237,.10)",col:"#c4b5fd",ring:"rgba(124,58,237,.28)"}},L=async()=>{const{data:a,error:o}=await g("/api/executive/proposals",y),r=Array.isArray(a)?a:y;return`
    <div class="v2-section-head">
      <div class="v2-eyebrow">Propuestas del equipo</div>
      <h2 class="v2-h2">${r.length} oportunidades detectadas</h2>
      <p class="v2-section-desc">Tus agentes IA priorizan. Aprob\xE1 o descart\xE1 en segundos. ${o?'<span class="v2-badge v2-badge-warn" style="margin-left:8px;">muestras \xB7 backend offline</span>':""}</p>
    </div>
    <div class="v2-prop-grid">
      ${r.map(t=>{const s=k[t.priority]||k.media;return`<div class="v2-card v2-prop">
          <div class="v2-prop-head">
            <span class="v2-prop-agent">${t.emoji} ${e(t.agent)}</span>
            <span class="v2-badge" style="background:${s.bg};color:${s.col};box-shadow:inset 0 0 0 1px ${s.ring};">${e(t.priority)}</span>
          </div>
          <div class="v2-prop-title">${e(t.title)}</div>
          <p class="v2-hint">${e(t.why)}</p>
          <div class="v2-prop-actions">
            <button class="v2-btn v2-btn-primary v2-btn-sm" data-prop-approve>${e(t.cta)}</button>
            <button class="v2-btn v2-btn-ghost v2-btn-sm" data-prop-reject>Descartar</button>
          </div>
        </div>`}).join("")}
    </div>`},T=async()=>{const{data:a,error:o}=await g("/api/executive/posts-analysis",null),r=[{type:"reel",title:"C\xF3mo automatizo mi marketing con IA",reach:12400,eng:8.7,verdict:"top performer",recommend:"Repetir formato facecam + texto grande. Probable Explore."},{type:"carrusel",title:"5 errores al elegir nicho",reach:4200,eng:6.2,verdict:"ok",recommend:"Hook del slide 1 mejorable: tensi\xF3n o n\xFAmero alto."},{type:"story",title:"Behind the scenes del setup",reach:1800,eng:12.4,verdict:"gem oculta",recommend:"Convertir a reel \u2014 ratio engagement/reach excepcional."}],t=a?.posts??r,s={"top performer":{bg:"rgba(16,185,129,.10)",col:"#6ee7b7"},ok:{bg:"rgba(255,255,255,.06)",col:"#e4e4e7"},"gem oculta":{bg:"rgba(168,85,247,.12)",col:"#d8b4fe"}};return`
    <div class="v2-section-head">
      <div class="v2-eyebrow">An\xE1lisis de tus posts</div>
      <h2 class="v2-h2">Verdict y recomendaci\xF3n espec\xEDfica</h2>
      <p class="v2-section-desc">${o?'<span class="v2-badge v2-badge-warn">muestras locales</span>':"Lectura algoritmo + benchmarks del nicho."}</p>
    </div>
    <div class="v2-posts">
      ${t.map(n=>{const i=s[n.verdict]||s.ok;return`<div class="v2-card v2-post">
          <div class="v2-post-ic">${n.type==="reel"?"\u25B6":n.type==="carrusel"?"\u2299":n.type==="story"?"\u25CE":"\u25A3"}</div>
          <div class="v2-post-main">
            <div class="v2-post-title">${e(n.title)}</div>
            <div class="v2-post-stats">
              <span><span class="v2-num-sm">${(n.reach||0).toLocaleString("en-US")}</span> reach</span>
              <span><span class="v2-num-sm">${n.eng}%</span> engagement</span>
              <span class="v2-badge" style="background:${i.bg};color:${i.col};box-shadow:inset 0 0 0 1px ${i.col}30;">${e(n.verdict)}</span>
            </div>
            <div class="v2-post-recom">\u{1F4A1} ${e(n.recommend)}</div>
          </div>
        </div>`}).join("")}
    </div>`},u=(a,o,r)=>`
  <div class="v2-card v2-card-pad v2-link-card">
    <h3 class="v2-h2" style="margin:0 0 8px;">${e(o)}</h3>
    <p class="v2-section-desc" style="margin:0 0 18px;">${e(r)}</p>
    <button class="v2-btn v2-btn-primary" data-go-route="${e(a)}">Abrir vista completa \u2192</button>
  </div>`,I=async()=>{const{data:a,error:o}=await g("/api/executive/command-center",null);if(!a)return`<div class="alert warn">Command Center sin datos. ${o||"Conect\xE1 backend."}</div>`;const r=a,t=r.systemPulse||{},s=r.topInsights||[],n=r.quickActions||[];return`
    <div class="cc-header">
      <div>
        <h2 style="margin:0;font-size:22px;">${e(r.digest?.headline||"Centro de mando")}</h2>
        <p class="small muted">${e(r.digest?.oneLineStatus||"")}</p>
      </div>
      <div class="cc-health-badge cc-health-${e(r.digest?.health||"steady")}">${e(r.digest?.health||"")}</div>
    </div>
    <div class="cc-pulse-grid">
      <div class="cc-pulse-card"><div class="cc-pulse-val">${t.brainModulesOnline??35}</div><div class="cc-pulse-lbl">m\xF3dulos cerebro online</div></div>
      <div class="cc-pulse-card"><div class="cc-pulse-val">${t.last24hActions??0}</div><div class="cc-pulse-lbl">acciones aut\xF3nomas 24h</div></div>
      <div class="cc-pulse-card"><div class="cc-pulse-val">${t.backlogSize??0}</div><div class="cc-pulse-lbl">decisiones backlog</div></div>
      <div class="cc-pulse-card"><div class="cc-pulse-val">${t.healthScore??0}%</div><div class="cc-pulse-lbl">health score</div></div>
    </div>
    <div class="cc-section">
      <h3>\u{1F50D} Top insights</h3>
      ${s.length?`<ul class="cc-insights">${s.map(i=>`<li>${e(i.icon)} ${e(i.text)}</li>`).join("")}</ul>`:'<div class="tiny muted">Sin insights por ahora.</div>'}
    </div>
    <div class="cc-section">
      <h3>\u26A1 Acciones r\xE1pidas</h3>
      <div class="cc-qa-grid">
        ${n.map(i=>`
          <button class="cc-qa-card" data-go-route="${e(i.route||"")}" data-skill="${e(i.skill||"")}">
            <div class="cc-qa-emoji">${e(i.emoji)}</div>
            <div class="cc-qa-text"><div class="cc-qa-lbl">${e(i.label)}</div><div class="cc-qa-desc">${e(i.description)}</div></div>
          </button>`).join("")}
      </div>
    </div>
    <style>
      .cc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:14px;flex-wrap:wrap;}
      .cc-health-badge{padding:5px 12px;border-radius:999px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;}
      .cc-health-thriving{background:#10b98122;color:#34d399;}
      .cc-health-healthy{background:#3b82f622;color:#60a5fa;}
      .cc-health-steady{background:#6366f122;color:#a5b4fc;}
      .cc-health-concerning{background:#f59e0b22;color:#fbbf24;}
      .cc-health-critical{background:#ef444422;color:#f87171;}
      .cc-pulse-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:18px;}
      .cc-pulse-card{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;}
      .cc-pulse-val{font-size:28px;font-weight:800;line-height:1;}
      .cc-pulse-lbl{font-size:11px;opacity:.7;margin-top:6px;}
      .cc-section{margin-top:18px;}
      .cc-section h3{margin:0 0 10px;font-size:15px;opacity:.85;}
      .cc-insights{list-style:none;padding:0;margin:0;}
      .cc-insights li{padding:9px 12px;border-radius:9px;background:rgba(168,85,247,.06);border-left:3px solid #a855f7;margin-bottom:6px;font-size:13px;}
      .cc-qa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;}
      .cc-qa-card{display:flex;gap:12px;align-items:center;background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:12px;cursor:pointer;text-align:left;transition:border-color .15s,background .15s;}
      .cc-qa-card:hover{border-color:#a855f7;background:rgba(168,85,247,.05);}
      .cc-qa-emoji{font-size:24px;flex-shrink:0;}
      .cc-qa-lbl{font-weight:700;font-size:13px;}
      .cc-qa-desc{font-size:11px;opacity:.65;margin-top:2px;}
    </style>`},F=async()=>{const{data:a}=await g("/api/executive/decisions/pending",[]),o=Array.isArray(a)?a:[];return o.length===0?'<div class="tiny muted" style="text-align:center;padding:40px;">Sin decisiones pendientes \u2728</div>':`
    <div class="exec-section-head"><h3>\u2696\uFE0F Decisiones esperando tu aprobaci\xF3n (${o.length})</h3></div>
    <div class="dec-list">
      ${o.map(r=>`
        <div class="dec-card" data-urgency="${e(r.urgency)}">
          <div class="dec-head">
            <span class="dec-source">${e(r.source)}</span>
            <span class="dec-urgency prio-${e(r.urgency==="critical"?"cr\xEDtica":r.urgency==="high"?"alta":"media")}">${e(r.urgency)}</span>
          </div>
          <h4>${e(r.title)}</h4>
          <p class="small muted">${e(r.context)}</p>
          <div class="dec-reasoning"><strong>Razonamiento:</strong> ${e(r.reasoning)}</div>
          <div class="dec-outcome"><strong>Esperado:</strong> ${e(r.expectedOutcome)}</div>
          ${r.risks?.length?`<div class="dec-risks"><strong>Riesgos:</strong> ${r.risks.map(t=>e(t)).join(" \xB7 ")}</div>`:""}
          <div class="btn-row" style="margin-top:10px;gap:6px;">
            <button class="v2-btn v2-btn-primary v2-btn-sm" data-resolve="approved" data-id="${e(r.id)}">\u2705 Aprobar</button>
            <button class="v2-btn v2-btn-ghost v2-btn-sm" data-resolve="rejected" data-id="${e(r.id)}">Rechazar</button>
          </div>
        </div>`).join("")}
    </div>
    <style>
      .dec-list{display:flex;flex-direction:column;gap:10px;}
      .dec-card{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;}
      .dec-card[data-urgency="critical"]{border-color:rgba(239,68,68,.5);}
      .dec-card[data-urgency="high"]{border-color:rgba(245,158,11,.4);}
      .dec-head{display:flex;justify-content:space-between;margin-bottom:6px;}
      .dec-source{font-size:11px;text-transform:uppercase;letter-spacing:.05em;opacity:.6;}
      .dec-urgency{font-size:10px;padding:2px 8px;border-radius:999px;text-transform:uppercase;font-weight:800;}
      .dec-card h4{margin:4px 0 6px;font-size:14px;}
      .dec-reasoning,.dec-outcome,.dec-risks{font-size:12px;margin-top:6px;line-height:1.5;}
      .dec-reasoning{background:rgba(99,102,241,.06);padding:8px 10px;border-radius:8px;}
      .dec-outcome{background:rgba(16,185,129,.06);padding:8px 10px;border-radius:8px;}
      .dec-risks{background:rgba(239,68,68,.06);padding:8px 10px;border-radius:8px;}
    </style>`},H=async()=>{const{data:a}=await g("/api/executive/okr/active",{objectives:[],summary:{totalActive:0,onTrack:0,atRisk:0,behind:0,ahead:0,overallScore:0}}),o=a?.objectives??[],r=a?.summary??{};return o.length===0?'<div class="tiny muted" style="text-align:center;padding:40px;">Sin OKRs activos. Cre\xE1 el primero desde la API o /api/executive/okr/create.</div>':`
    <div class="exec-section-head"><h3>\u{1F3C1} OKRs activos (${o.length}) \xB7 Score global ${(r.overallScore||0).toFixed(0)}%</h3></div>
    <div class="okr-summary-bar">
      <span class="okr-pill okr-ahead">${r.ahead||0} adelantados</span>
      <span class="okr-pill okr-ontrack">${r.onTrack||0} en track</span>
      <span class="okr-pill okr-atrisk">${r.atRisk||0} riesgo</span>
      <span class="okr-pill okr-behind">${r.behind||0} atrasados</span>
    </div>
    <div class="okr-list">
      ${o.map(t=>`
        <div class="okr-card" data-status="${e(t.status)}">
          <div class="okr-head">
            <h4>${e(t.title)}</h4>
            <span class="okr-status okr-${e(t.status)}">${e(t.status)}</span>
          </div>
          <div class="okr-progress-bar"><div class="okr-progress-fill" style="width:${(t.overallProgressPct||0).toFixed(0)}%;"></div></div>
          <div class="tiny muted" style="margin-top:4px;">${(t.overallProgressPct||0).toFixed(0)}% \xB7 ${t.weeksRemaining} semana(s) restantes</div>
          <ul class="okr-kr-list">
            ${(t.keyResults||[]).map(s=>`
              <li>
                <div class="okr-kr-desc">${e(s.description)}</div>
                <div class="okr-kr-meta">
                  <span>${s.current.toFixed(0)} / ${s.target.toFixed(0)} (${(s.progressPct||0).toFixed(0)}%)</span>
                  <span class="okr-trend okr-trend-${e(s.trend)}">${e(s.trend)}</span>
                </div>
              </li>`).join("")}
          </ul>
          ${t.recommendations?.length?`<div class="okr-recs"><strong>Recomendaciones:</strong><ul>${t.recommendations.map(s=>`<li>${e(s)}</li>`).join("")}</ul></div>`:""}
        </div>`).join("")}
    </div>
    <style>
      .okr-summary-bar{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
      .okr-pill{font-size:11px;padding:3px 10px;border-radius:999px;font-weight:700;}
      .okr-ahead{background:#10b98122;color:#34d399;}
      .okr-ontrack{background:#3b82f622;color:#60a5fa;}
      .okr-atrisk{background:#f59e0b22;color:#fbbf24;}
      .okr-behind{background:#ef444422;color:#f87171;}
      .okr-list{display:flex;flex-direction:column;gap:12px;}
      .okr-card{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;}
      .okr-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
      .okr-head h4{margin:0;font-size:14px;}
      .okr-status{font-size:10px;padding:2px 8px;border-radius:999px;text-transform:uppercase;font-weight:800;}
      .okr-on-track{background:#3b82f622;color:#60a5fa;}
      .okr-at-risk{background:#f59e0b22;color:#fbbf24;}
      .okr-behind{background:#ef444422;color:#f87171;}
      .okr-ahead{background:#10b98122;color:#34d399;}
      .okr-completed{background:#a855f722;color:#d8b4fe;}
      .okr-progress-bar{height:6px;background:var(--border);border-radius:99px;overflow:hidden;}
      .okr-progress-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#a855f7);transition:width .6s;}
      .okr-kr-list{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:6px;}
      .okr-kr-list li{padding:8px 10px;background:rgba(255,255,255,.03);border-radius:8px;font-size:12px;}
      .okr-kr-desc{margin-bottom:3px;}
      .okr-kr-meta{display:flex;justify-content:space-between;font-size:11px;opacity:.7;}
      .okr-trend{padding:1px 7px;border-radius:6px;font-weight:700;text-transform:uppercase;font-size:9px;}
      .okr-trend-accelerating{background:#10b98122;color:#34d399;}
      .okr-trend-steady{background:#6366f122;color:#a5b4fc;}
      .okr-trend-decelerating{background:#f59e0b22;color:#fbbf24;}
      .okr-trend-stalled{background:#ef444422;color:#f87171;}
      .okr-recs{margin-top:10px;font-size:12px;background:rgba(168,85,247,.06);padding:8px 10px;border-radius:8px;}
      .okr-recs ul{margin:4px 0 0;padding-left:18px;}
    </style>`},w=async a=>{const{data:o,error:r}=await g(`/api/autopilot/${a}/latest`,null);if(!o)return`<div class="tiny muted" style="text-align:center;padding:40px;">Sin reporte de ${a} todav\xEDa. ${r||""}<br><br>Disparar manual: POST /api/autopilot/${a}/run con m\xE9tricas.</div>`;const t=o,s=a==="instagram"?t.autopilotScore:t.fypHealthScore,n=a==="instagram"?"Autopilot Score":"FYP Health";return`
    <div class="ap-hero">
      <div class="ap-score-circle ${s>=70?"ok":s>=40?"warn":"crit"}">${s}</div>
      <div>
        <h3 style="margin:0;font-size:18px;">${n}: ${s}/100</h3>
        <p class="small" style="margin:4px 0 0;">${e(t.didacticInsight)}</p>
      </div>
    </div>
    <div class="cc-section">
      <h3>\u{1F4E1} Se\xF1ales detectadas (${t.signals?.length||0})</h3>
      ${(t.signals||[]).length===0?'<div class="tiny muted">Sistema sin flags \u2728</div>':`
        <div class="ap-signals">
          ${(t.signals||[]).map(i=>`
            <div class="ap-signal" data-severity="${e(i.severity)}">
              <div class="ap-sig-head">
                <span class="ap-sig-name">${e(i.signal)}</span>
                <span class="ap-sig-sev sev-${e(i.severity)}">${e(i.severity)}</span>
              </div>
              <div class="ap-sig-evidence">${e(i.evidence)}</div>
              <div class="ap-sig-reason">${e(i.reasoning)}</div>
              <div class="ap-sig-action">\u2192 <strong>${e(i.recommendedAction)}</strong></div>
              <div class="ap-sig-impact">\u{1F4C8} ${e(i.expectedImpact)}</div>
            </div>`).join("")}
        </div>`}
    </div>
    <style>
      .ap-hero{display:flex;gap:18px;align-items:center;background:var(--surface,#141418);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:18px;}
      .ap-score-circle{width:70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;flex-shrink:0;}
      .ap-score-circle.ok{background:linear-gradient(135deg,#10b981,#3b82f6);}
      .ap-score-circle.warn{background:linear-gradient(135deg,#f59e0b,#ef4444);}
      .ap-score-circle.crit{background:linear-gradient(135deg,#ef4444,#7f1d1d);}
      .ap-signals{display:flex;flex-direction:column;gap:10px;}
      .ap-signal{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:12px;}
      .ap-signal[data-severity="critical"]{border-color:rgba(239,68,68,.5);}
      .ap-signal[data-severity="high"]{border-color:rgba(245,158,11,.4);}
      .ap-sig-head{display:flex;justify-content:space-between;margin-bottom:6px;}
      .ap-sig-name{font-weight:800;font-size:13px;}
      .ap-sig-sev{font-size:10px;padding:2px 8px;border-radius:999px;text-transform:uppercase;font-weight:800;}
      .sev-critical{background:#ef444422;color:#f87171;}
      .sev-high{background:#f59e0b22;color:#fbbf24;}
      .sev-medium{background:#6366f122;color:#a5b4fc;}
      .sev-low{background:rgba(255,255,255,.08);color:#aab;}
      .ap-sig-evidence{font-size:11px;opacity:.65;margin-bottom:4px;}
      .ap-sig-reason{font-size:12px;line-height:1.5;margin-bottom:4px;}
      .ap-sig-action{font-size:12px;background:rgba(99,102,241,.08);padding:6px 9px;border-radius:7px;margin:6px 0 4px;}
      .ap-sig-impact{font-size:11px;opacity:.75;}
    </style>`},M=async a=>c==="summary"?q(a):c==="commandCenter"?I():c==="decisions"?F():c==="okrs"?H():c==="igAutopilot"?w("instagram"):c==="ttAutopilot"?w("tiktok"):c==="proposals"?L():c==="posts"?T():c==="analytics"?u("analytics","Analytics","M\xE9tricas completas de cuenta, posts, audiencia y crecimiento hist\xF3rico."):c==="alerts"?u("alertas","Alertas","Anomal\xEDas detectadas, riesgos de shadowban y oportunidades."):c==="logbook"?u("bitacora","Bit\xE1cora","Cronolog\xEDa de todas las acciones del sistema en tu cuenta."):c==="experiments"?u("experiments","Experimentos","A/B tests con bandits de Thompson."):c==="scheduler"?u("scheduler","Scheduler","Jobs programados y pr\xF3ximas ejecuciones."):c==="collabs"?u("collab","Collabs","Colaboraciones, brand deals y partnerships."):h[c]?`<div id="exec-embed" data-embed="${c}"><div class="loading-screen"><span class="spinner lg"></span></div></div>`:"";export const renderImperio=async a=>{c="summary",a.innerHTML=`
    <div class="v2-tabs">
      ${E.map(s=>`<button class="v2-tab ${s.id==="summary"?"is-active":""}" data-tab="${s.id}">${e(s.label)}</button>`).join("")}
    </div>
    <div id="exec-body" class="v2-body"><div class="loading-screen"><span class="spinner lg"></span></div></div>

    <style>
      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 Sala Ejecutiva v2 \xB7 Vercel-grade \xB7 THEME-AWARE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         Usamos los tokens globales del proyecto (--text-primary, --bg-elevated, etc.)
         que ya cambian con data-theme="light". Cualquier hardcoded color que no
         dependa de los tokens rompe modo claro. */
      .v2-body{
        --v2-line: var(--border, rgba(255,255,255,.08));
        --v2-line-strong: var(--border-focus, rgba(255,255,255,.18));
        --v2-fg: var(--text-primary, #fafafa);
        --v2-fg-2: var(--text-secondary, #d4d4d8);
        --v2-fg-3: var(--text-tertiary, #a1a1aa);
        --v2-surface: var(--bg-elevated, #0a0a0a);
        --v2-surface-2: var(--bg-card, #0f0f0f);
        --v2-hover: var(--bg-hover, rgba(255,255,255,.04));
        font-feature-settings:"tnum" 1,"ss01" 1;
        letter-spacing:-0.011em;
        color:var(--v2-fg);
      }

      /* Tabs minimal */
      .v2-tabs{display:flex;gap:2px;padding:4px;background:var(--v2-surface);box-shadow:inset 0 0 0 1px var(--v2-line);border-radius:10px;overflow-x:auto;margin-bottom:24px;}
      .v2-tab{flex-shrink:0;padding:7px 12px;border-radius:6px;border:0;background:transparent;color:var(--v2-fg-3);font-size:12.5px;font-weight:500;letter-spacing:-0.01em;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s;}
      .v2-tab:hover{background:var(--v2-hover);color:var(--v2-fg);}
      .v2-tab.is-active{background:var(--v2-hover);color:var(--v2-fg);box-shadow:inset 0 0 0 1px var(--v2-line-strong);}

      /* Eyebrow / nums / hint */
      .v2-eyebrow{font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;font-weight:600;color:var(--v2-fg-2);}
      .v2-h1{font-size:42px;line-height:1.04;letter-spacing:-0.04em;font-weight:600;color:var(--v2-fg);margin:14px 0 16px;}
      .v2-h1-dim{color:var(--v2-fg-3);display:block;}
      .v2-h2{font-size:22px;line-height:1.2;letter-spacing:-0.02em;font-weight:700;color:var(--v2-fg);margin:6px 0 0;}
      .v2-lead{font-size:14px;color:var(--v2-fg-2);max-width:60ch;line-height:1.55;margin:14px 0 0;}
      .v2-section-desc{font-size:13px;color:var(--v2-fg-3);margin:6px 0 0;}
      .v2-hint{font-size:11px;color:var(--v2-fg-3);letter-spacing:-0.005em;line-height:1.4;}
      .v2-num-xl{font-size:32px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums;}
      .v2-num-md{font-size:16px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
      .v2-num-sm{font-size:12px;font-weight:600;color:var(--v2-fg);font-variant-numeric:tabular-nums;}
      .v2-delta{font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-0.005em;}
      .v2-delta-sm{font-size:10.5px;font-weight:600;font-variant-numeric:tabular-nums;}

      /* Cards \xB7 hairline border, no shadow blob */
      .v2-card{background:var(--v2-surface);border-radius:14px;box-shadow:inset 0 0 0 1px var(--v2-line);transition:box-shadow .2s;position:relative;overflow:hidden;}
      .v2-card:hover{box-shadow:inset 0 0 0 1px var(--v2-line-strong);}
      .v2-card-pad{padding:18px;}
      .v2-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;}
      .v2-card-head strong{font-size:13px;font-weight:600;letter-spacing:-0.01em;color:var(--v2-fg);}

      /* Badges */
      .v2-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:5px;font-size:10.5px;font-weight:600;letter-spacing:-0.005em;line-height:1.5;}
      .v2-badge-brand{background:rgba(124,58,237,.12);color:#7c3aed;box-shadow:inset 0 0 0 1px rgba(124,58,237,.32);}
      .v2-badge-ok{background:rgba(16,185,129,.12);color:#059669;box-shadow:inset 0 0 0 1px rgba(16,185,129,.32);}
      .v2-badge-warn{background:rgba(217,119,6,.14);color:#b45309;box-shadow:inset 0 0 0 1px rgba(217,119,6,.32);}
      :root[data-theme="dark"] .v2-badge-brand,
      html:not([data-theme="light"]) .v2-badge-brand{color:#c4b5fd;}
      :root[data-theme="dark"] .v2-badge-ok,
      html:not([data-theme="light"]) .v2-badge-ok{color:#6ee7b7;}
      :root[data-theme="dark"] .v2-badge-warn,
      html:not([data-theme="light"]) .v2-badge-warn{color:#fbcb6b;}

      /* Buttons */
      .v2-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 14px;height:34px;border-radius:7px;font-size:13px;font-weight:600;letter-spacing:-0.01em;cursor:pointer;border:0;transition:background .15s,color .15s,box-shadow .15s;font-family:inherit;}
      .v2-btn-sm{height:28px;padding:0 10px;font-size:12px;}
      .v2-btn-primary{background:var(--v2-fg);color:var(--v2-surface);}
      .v2-btn-primary:hover{opacity:.88;}
      .v2-btn-outline{background:transparent;color:var(--v2-fg);box-shadow:inset 0 0 0 1px var(--v2-line-strong);}
      .v2-btn-outline:hover{background:var(--v2-hover);}
      .v2-btn-ghost{background:transparent;color:var(--v2-fg-2);}
      .v2-btn-ghost:hover{background:var(--v2-hover);color:var(--v2-fg);}

      /* HERO */
      .v2-hero{position:relative;background:var(--v2-surface);border-radius:18px;box-shadow:inset 0 0 0 1px var(--v2-line);padding:32px;overflow:hidden;}
      .v2-hero::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle, var(--v2-line-strong) 1px, transparent 1px);background-size:24px 24px;opacity:.5;pointer-events:none;}
      .v2-hero-inner{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap;}
      .v2-hero-tags{display:flex;gap:6px;margin-bottom:6px;}
      .v2-hero-cta{display:flex;flex-direction:column;gap:8px;min-width:200px;}
      .v2-tier-progress{position:relative;margin-top:28px;max-width:540px;}
      .v2-tier-progress-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
      .v2-tier-progress-bar{height:3px;background:var(--v2-line);border-radius:99px;overflow:hidden;}
      .v2-tier-progress-bar > div{height:100%;background:linear-gradient(90deg,var(--v2-fg),var(--v2-fg-2));transition:width .8s;}

      /* Sections + KPI grid */
      .v2-section{margin-top:36px;}
      .v2-section-head{margin-bottom:18px;}
      .v2-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;}
      .v2-kpi{padding:18px;}
      .v2-kpi .v2-eyebrow{margin-bottom:12px;}
      .v2-kpi .v2-num-xl{margin-bottom:8px;}

      /* Growth Card */
      .v2-grow-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;}
      .v2-grow-card{padding:20px;}
      .v2-grow-accent{position:absolute;top:0;left:0;right:0;height:1px;opacity:.7;}
      .v2-grow-head{display:flex;justify-content:space-between;align-items:center;gap:8px;}
      .v2-grow-brand{display:flex;align-items:center;gap:10px;}
      .v2-grow-glyph{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;}
      .v2-grow-handle{font-size:13px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.01em;margin-top:2px;}
      .v2-grow-primary{margin-top:18px;}
      .v2-grow-followers-row{display:flex;align-items:baseline;gap:10px;margin-top:6px;}
      .v2-grow-followers-row .v2-num-xl{font-size:38px;}
      .v2-grow-spark{margin-top:10px;}
      .v2-grow-tier{margin-top:14px;}
      .v2-grow-tier-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
      .v2-grow-tier-bar{height:3px;background:var(--v2-line);border-radius:99px;overflow:hidden;}
      .v2-grow-tier-bar > div{height:100%;border-radius:99px;}
      .v2-grow-metrics{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--v2-line);border-radius:10px;overflow:hidden;}
      .v2-grow-metric{background:var(--v2-surface);padding:12px;}
      .v2-grow-metric-val{display:flex;align-items:baseline;gap:6px;margin-top:4px;}

      /* Staff + Hitos */
      .v2-2col{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:36px;}
      .v2-staff{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;}
      .v2-staff-row{display:flex;gap:10px;align-items:center;background:var(--v2-surface-2);padding:10px 12px;border-radius:9px;box-shadow:inset 0 0 0 1px var(--v2-line);}
      .v2-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,.55);flex-shrink:0;}
      .v2-staff-main{min-width:0;}
      .v2-staff-rol{font-size:12.5px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.005em;}
      .v2-hitos{display:flex;flex-direction:column;gap:6px;}
      .v2-hito-row{display:flex;gap:10px;align-items:center;background:var(--v2-surface-2);padding:10px 12px;border-radius:9px;box-shadow:inset 0 0 0 1px var(--v2-line);}
      .v2-hito-ic{font-size:16px;}

      /* Propuestas */
      .v2-prop-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
      .v2-prop{padding:16px;}
      .v2-prop-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;}
      .v2-prop-agent{font-size:13px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.01em;}
      .v2-prop-title{font-size:14px;font-weight:600;color:var(--v2-fg);margin:0 0 6px;letter-spacing:-0.015em;}
      .v2-prop-actions{display:flex;gap:6px;margin-top:14px;}
      .v2-prop-actions .v2-btn{flex:1;}

      /* Posts */
      .v2-posts{display:flex;flex-direction:column;gap:10px;}
      .v2-post{padding:14px 16px;display:flex;gap:14px;}
      .v2-post-ic{font-size:22px;color:var(--v2-fg-3);width:30px;text-align:center;flex-shrink:0;}
      .v2-post-main{flex:1;min-width:0;}
      .v2-post-title{font-size:14px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.015em;margin-bottom:6px;}
      .v2-post-stats{display:flex;gap:14px;font-size:11.5px;color:var(--v2-fg-3);margin-bottom:10px;flex-wrap:wrap;align-items:center;}
      .v2-post-recom{font-size:12px;line-height:1.55;color:var(--v2-fg-2);background:rgba(168,85,247,.08);padding:8px 12px;border-radius:8px;border-left:2px solid #a855f7;}

      .v2-link-card{padding:36px 24px;text-align:center;}

      .v2-ascenso{margin-bottom:16px;padding:14px 18px;border-radius:12px;text-align:center;font-size:14px;color:#fff;background:linear-gradient(90deg,#e1306c,#a855f7,#22d3ee);}

      @media (max-width: 720px){
        .v2-h1{font-size:30px;}
        .v2-hero{padding:22px;}
        .v2-hero-cta{width:100%;}
        .v2-card-pad{padding:14px;}
      }
    </style>
  `;const{data:o}=await g("/api/experience/brief",null),r=o??{tier:"Bronce",tierProgresoPct:12,saludo:"Bienvenido a tu Sala Ejecutiva",narrativa:"Conect\xE1 el backend para ver tu apalancamiento real, equipo trabajando y trofeos.",leverage:{ratioLabel:"0\xD7",accionesEjecutadas:0,indicacionesDadas:0,costoEquipoUsdMes:0,ahorroAnualUsd:0,horasHumanasAhorradas:0},staff:[{rol:"Equipo en pausa",estado:"esperando conexi\xF3n"}],hitos:[],credencial:"FeedIA \xB7 founder mode"},t=async()=>{const s=a.querySelector("#exec-body");s.innerHTML='<div style="text-align:center;padding:40px;"><span class="spinner lg"></span></div>',s.innerHTML=await M(r);const n=s.querySelector("[data-embed]");if(n){const i=n.dataset.embed,l=h[i];if(l)try{const v=(await import(l.path))[l.name];typeof v=="function"&&await v(n)}catch(d){n.innerHTML=`<div class="alert crit">No se pudo cargar ${e(i)}: ${e(d.message)}</div>`}}s.querySelectorAll("[data-go-route]").forEach(i=>{i.addEventListener("click",()=>{window.location.hash=`#${i.dataset.goRoute}`})}),s.querySelectorAll("[data-prop-approve]").forEach(i=>{i.addEventListener("click",()=>{i.closest(".v2-prop").style.opacity=".4",b("\u2705 Aprobado","ok")})}),s.querySelectorAll("[data-prop-reject]").forEach(i=>{i.addEventListener("click",()=>{i.closest(".v2-prop").remove(),b("Descartado","info")})}),s.querySelectorAll("[data-resolve]").forEach(i=>{i.addEventListener("click",async()=>{const l=i.dataset.resolve,d=i.dataset.id;try{(await fetch("/api/executive/decisions/resolve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({decisionId:d,status:l})})).ok?(i.closest(".dec-card").style.opacity=".35",b(l==="approved"?"\u2705 Aprobada":"Rechazada",l==="approved"?"ok":"info")):b("Error al resolver","err")}catch{b("Backend offline","warn")}})})};a.querySelectorAll(".v2-tab").forEach(s=>{s.addEventListener("click",()=>{c=s.dataset.tab,a.querySelectorAll(".v2-tab").forEach(n=>n.classList.toggle("is-active",n===s)),t()})}),await t()};
