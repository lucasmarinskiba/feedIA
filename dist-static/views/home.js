import{apiSafe as p}from"../lib/api.js";import{escape as i}from"../lib/dom.js";let g=7,y=null,h=null,u=null;const z=a=>{try{const e=JSON.parse(localStorage.getItem("feedia.brand")??"null");if(e?.name&&e.name.trim()&&e.name.trim().toLowerCase()!=="mi marca")return e.name.trim()}catch{}if(u?.name&&u.name.trim().toLowerCase()!=="mi marca")return u.name.trim();if(a){if(a.brandName&&a.brandName.trim())return a.brandName.trim();if(a.instagramName&&a.instagramName.trim()){const e=a.instagramName.trim();return e.startsWith("@")?e:`@${e}`}if(a.displayName&&a.displayName.trim()&&a.displayName.trim()!=="tu cuenta")return a.displayName.trim();if(a.ownerNickname&&a.ownerNickname.trim())return a.ownerNickname.trim();if(a.systemName&&a.systemName.trim())return a.systemName.trim()}try{const e=JSON.parse(localStorage.getItem("feedia.personalization")??"null");if(e?.ownerNickname&&e.ownerNickname.trim())return e.ownerNickname.trim();if(e?.systemName&&e.systemName.trim())return e.systemName.trim()}catch{}return"tu cuenta"},k={7:"7 d\xEDas",30:"30 d\xEDas",90:"90 d\xEDas",365:"1 a\xF1o"},C=a=>typeof a!="number"||!Number.isFinite(a)?"\u2014":a===0?"0":Math.abs(a)>=1e6?`${(a/1e6).toFixed(1)}M`:Math.abs(a)>=1e3?`${(a/1e3).toFixed(1)}K`:String(Math.round(a)),$=a=>`
  <div class="card stat-card" style="border-left:3px solid var(--accent, #3FB8C9);position:relative;">
    <div class="stat-label">${i(a.label)}${a.tooltip?`<span class="kpi-info" title="${i(a.tooltip)}" style="cursor:help;margin-left:6px;opacity:0.55;">\u24D8</span>`:""}</div>
    <div class="stat-value">${i(String(a.value))}</div>
    ${a.delta?`<div class="small ${a.direction==="up"?"ok":a.direction==="down"?"crit":"muted"}">${i(a.delta)}</div>`:""}
    <div class="small muted" style="margin-top:4px;">${i(a.context??"")}</div>
  </div>`,w=a=>{if(!a)return[{label:"Seguidores",value:"\u2014",delta:"",direction:"flat",context:"Conect\xE1 Meta API para ver datos reales"},{label:"Alcance",value:"\u2014",delta:"",direction:"flat",context:"Sincroniz\xE1 m\xE9tricas"},{label:"Engagement Rate",value:"\u2014",delta:"",direction:"flat",context:"Pendiente de datos"},{label:"Velocidad",tooltip:"Seguidores nuevos por d\xEDa promedio en el per\xEDodo",value:"\u2014",delta:"",direction:"flat",context:"Sin baseline a\xFAn"}];const{followers:e,reach:t,engagementRate:s,velocity:l,periodDays:n,hasRealData:o}=a,d=k[n]??`${n}d`;return[{label:"Seguidores",value:C(e.current),delta:e.delta!==0?`${e.delta>0?"+":""}${e.delta} (${e.deltaPct>0?"+":""}${e.deltaPct}%)`:"",direction:e.direction,context:o?`cambio en ${d}`:"sin datos suficientes"},{label:`Alcance ${d}`,value:C(t.total),delta:t.deltaPct!==0?`${t.deltaPct>0?"+":""}${t.deltaPct}% vs per\xEDodo anterior`:"",direction:t.direction,context:o?"personas \xFAnicas alcanzadas":"sin datos suficientes"},{label:"Engagement Rate",value:o?`${s.value}%`:"\u2014",delta:"",direction:"flat",context:"promedio del per\xEDodo \xB7 (likes+comments+saves)/reach"},{label:"Velocidad",tooltip:l.description,value:o?`${l.value} ${l.unit}`:"\u2014",delta:"",direction:l.direction,context:"seguidores nuevos por d\xEDa (promedio)"}]},S=(a,e,t,s)=>{const n=`Bienvenido a casa, ${z(a)}`,o=e?.mascotEmoji??"\u2728",d=e?.themeColors?.primary??"#3FB8C9",c=e?.themeColors?.secondary??"#E85A2C";return`
    <div class="home-greeting" style="padding:16px 20px;background:linear-gradient(135deg,${d} 0%,${c} 100%);border-radius:16px;color:white;margin-bottom:16px;">
      <div style="display:flex;gap:14px;align-items:center;">
        <div style="font-size:40px;line-height:1;flex-shrink:0;">${i(o)}</div>
        <div style="flex:1;min-width:0;">
          <h1 style="margin:0;font-size:22px;line-height:1.15;">${i(n)}</h1>
          ${e?.timeBasedMessage?`<p style="margin:3px 0 0;opacity:0.92;font-size:13px;">${i(e.timeBasedMessage)}</p>`:`<p style="margin:3px 0 0;opacity:0.85;font-size:13px;">${i(a?.niche??u?.niche??"Tu casa de Instagram")}</p>`}
        </div>
        ${s?'<div style="font-size:11px;opacity:0.7;background:rgba(0,0,0,0.2);padding:4px 10px;border-radius:20px;">\u{1F4E1} offline</div>':""}
      </div>
      ${e?.delightMessage?`<p style="margin:10px 0 0;font-style:italic;font-size:13.5px;opacity:0.92;">"${i(e.delightMessage)}"</p>`:""}
    </div>

    <!-- Banner de conexi\xF3n IG/TT -->
    <div id="home-connections-banner" style="margin-bottom:16px;"></div>

    <!-- Widget de uso del plan -->
    <div id="home-usage-widget" style="margin-bottom:16px;"></div>

    <!-- 2 columnas: KPIs (per\xEDodo + m\xE9tricas) a la izquierda, Tablero a la derecha -->
    <div class="home-split">
      <div class="home-split-left">
        <div class="home-period-bar" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <span class="small muted">Per\xEDodo:</span>
          ${[7,30,90,365].map(r=>`
            <button class="tab-btn ${g===r?"active":""}" data-period="${r}">${k[r]}</button>
          `).join("")}
        </div>
        <div class="stats-grid" id="home-kpis-grid">
          ${w(t).map($).join("")}
        </div>
      </div>
      <section class="home-embed-section home-split-right" style="margin-top:0;">
        <h2 style="font-size:16px;margin:0 0 10px;display:flex;align-items:center;gap:8px;">\u{1F4CB} Tablero</h2>
        <div id="home-embed-kanban" class="home-embed-host"><div class="loading-screen"><span class="spinner lg"></span></div></div>
      </section>
    </div>

    <style>
      .home-split{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;margin-bottom:24px;}
      .home-split .stats-grid{margin-bottom:0;}
      .home-split-right{max-height:560px;overflow:auto;}
      @media (max-width: 980px){ .home-split{grid-template-columns:1fr;} .home-split-right{max-height:none;} }
    </style>

    ${(e?.activeCelebrations??[]).length?`
      <div class="card accent-border" style="margin-bottom:20px;">
        <h3>\u{1F389} Celebraciones activas</h3>
        ${(e.activeCelebrations??[]).map(r=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--border);">
            <strong>${i(r.title)}</strong>
            <p class="small muted" style="margin:4px 0;">${i(r.message)}</p>
            <button class="btn small" data-ack="${i(r.id)}">\u2713 Vi esto</button>
          </div>`).join("")}
      </div>`:""}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;">
      ${(e?.todayActions??["Conect\xE1 tu cuenta de Instagram","Defin\xED tu meta del mes","Hac\xE9 la entrevista de marca"]).length?`
        <div class="card">
          <h3>\u{1F4CB} Hoy</h3>
          <ul style="margin:8px 0 0;padding-left:20px;">
            ${(e?.todayActions??["Conect\xE1 tu cuenta de Instagram en Settings \u2192 Cuentas","Defin\xED tu meta del mes","Hac\xE9 la entrevista de marca para personalizar"]).map(r=>`<li>${i(r)}</li>`).join("")}
          </ul>
        </div>`:""}

      ${e?.recentMemory?`
        <div class="card" style="background:linear-gradient(135deg,#FBE7C6 0%,#FFD6A5 100%);color:#1A1A1A;">
          <div class="small" style="opacity:0.7;text-transform:uppercase;letter-spacing:1px;">\u{1F4D6} Recuerdo del d\xEDa</div>
          <h3 style="margin:6px 0;">${i(e.recentMemory.title)}</h3>
          <p style="font-style:italic;">${i(e.recentMemory.story??e.recentMemory.description??"")}</p>
        </div>`:""}

      ${(e?.unacknowledgedAchievements??[]).length?`
        <div class="card">
          <h3>\u{1F3C6} Trofeos sin ver</h3>
          ${(e.unacknowledgedAchievements??[]).slice(0,3).map(r=>`
            <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);align-items:center;">
              <div style="font-size:28px;">${i(r.emoji)}</div>
              <div style="flex:1;">
                <strong>${i(r.name)}</strong>
                <div class="small muted">${i(r.description)}</div>
              </div>
              <button class="btn tiny" data-ack-ach="${i(r.id)}">\u2713</button>
            </div>`).join("")}
          <a href="#achievements" class="small">Ver todos los logros \u2192</a>
        </div>`:""}

      ${e?.upcomingMilestone?`
        <div class="card">
          <h3>\u{1F3AF} Pr\xF3ximo hito</h3>
          <p>${i(e.upcomingMilestone.description)}</p>
          ${e.upcomingMilestone.daysAway!=null?`<div class="small accent">~ ${e.upcomingMilestone.daysAway} d\xEDas</div>`:""}
        </div>`:""}

      ${(e?.activeGoals??[]).length?`
        <div class="card">
          <h3>\u{1F680} Metas activas</h3>
          ${(e.activeGoals??[]).slice(0,3).map(r=>`
            <div style="padding:8px 0;border-bottom:1px solid var(--border);">
              <strong>${i(r.title)}</strong>
              <div class="small muted">${i(r.horizon)} \xB7 ${r.progress}%</div>
              <div class="progress-bar" style="height:4px;background:var(--bg-card-2);border-radius:2px;overflow:hidden;margin-top:4px;">
                <div style="height:100%;width:${r.progress}%;background:var(--accent);"></div>
              </div>
            </div>`).join("")}
        </div>`:""}

      <div class="card accent-border">
        <h3>\u{1F4A1} Sugerencias para vos</h3>
        <ul style="margin:8px 0 0;padding-left:20px;">
          ${(e?.suggestionsForNow??["Conect\xE1 tu cuenta de Instagram en Settings \u2192 Cuentas","Complet\xE1 la entrevista de marca para personalizar tu sistema","Defin\xED tu meta del mes para que el sistema sepa hacia d\xF3nde apuntar"]).map(r=>`<li>${i(r)}</li>`).join("")}
        </ul>
      </div>
    </div>

    ${e?.privateMessage?`
      <div class="card" style="margin-top:20px;padding:18px;background:var(--bg-card-2);border-left:3px solid var(--accent);">
        <div class="small muted">Nota privada</div>
        <p style="margin:6px 0 0;font-style:italic;">${i(e.privateMessage)}</p>
      </div>`:""}

    <!-- Aprobaciones embebido (Tablero ya vive arriba, al lado de los KPIs) -->
    <section class="home-embed-section" style="margin-top:24px;">
      <h2 style="font-size:16px;margin:0 0 10px;display:flex;align-items:center;gap:8px;">\u2705 Aprobaciones</h2>
      <div id="home-embed-approvals" class="home-embed-host"><div class="loading-screen"><span class="spinner lg"></span></div></div>
    </section>
    <style>
      .home-embed-section{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:14px;padding:16px;}
      .home-embed-host > .view-header,.home-embed-host .page-header{display:none;}
      .home-embed-host .page-body{padding:0;}
    </style>
  `};let v=null;const N=async a=>{const e=a.querySelector("#home-embed-kanban"),t=a.querySelector("#home-embed-approvals");if(!(!e||!t))try{v||(v=await import("./workspace.js")),await Promise.all([typeof v.renderKanban=="function"?v.renderKanban(e):Promise.resolve(),typeof v.renderApprovals=="function"?v.renderApprovals(t):Promise.resolve()])}catch(s){e.innerHTML=`<div class="alert crit small">No se pudo cargar Tablero: ${i(s.message)}</div>`,t.innerHTML=`<div class="alert crit small">No se pudo cargar Aprobaciones: ${i(s.message)}</div>`}},M=a=>{a.querySelectorAll("[data-period]").forEach(e=>{e.addEventListener("click",async()=>{const t=Number(e.dataset.period);if(t===g)return;g=t,a.querySelectorAll("[data-period]").forEach(n=>n.classList.toggle("active",Number(n.dataset.period)===g));const s=a.querySelector("#home-kpis-grid");s&&(s.innerHTML=w(null).map($).join(""));const{data:l}=await p(`/api/home/kpis?period=${g}`);s&&l&&(s.innerHTML=w(l).map($).join(""))})}),a.querySelectorAll("[data-ack]").forEach(e=>{e.addEventListener("click",async()=>{const{error:t}=await p(`/api/celebrations/${e.dataset.ack}/ack`,null,{method:"POST",body:{}});t||(e.closest("div").style.opacity="0.5")})}),a.querySelectorAll("[data-ack-ach]").forEach(e=>{e.addEventListener("click",async()=>{const{error:t}=await p(`/api/achievements/${e.dataset.ackAch}/ack`,null,{method:"POST",body:{}});t||(e.closest("div").style.opacity="0.5")})})},A=async a=>{const e=a.querySelector("#home-connections-banner");if(!e)return;const{data:t,error:s}=await p("/api/auth/connections",null);if(s||!Array.isArray(t)){e.innerHTML="";return}const l=Object.fromEntries(t.map(c=>[c.platform,c])),n=l.instagram||{connected:!1},o=l.tiktok||{connected:!1};if(n.connected&&o.connected){e.innerHTML="";return}const d=(c,r,f,m,x)=>r.connected?`<div class="conn-pill ok"><span>${m}</span><strong>${x}</strong><span class="tiny muted">conectado${r.handle?` @${i(r.handle)}`:""}</span></div>`:`<a class="conn-pill cta" href="/api/auth/${c}/login" style="background:${f};">
         <span style="font-size:18px;">${m}</span>
         <strong>Conect\xE1 tu ${x}</strong>
         <span class="tiny" style="opacity:.85;">datos reales en 1 click</span>
       </a>`;e.innerHTML=`
    <div class="conn-banner">
      <div class="conn-banner-title">
        <span style="font-size:18px;">\u{1F517}</span>
        <strong>Conect\xE1 tus cuentas para datos reales</strong>
        <span class="tiny muted">Sin conexi\xF3n, FeedIA muestra estado vac\xEDo.</span>
      </div>
      <div class="conn-banner-grid">
        ${d("instagram",n,"linear-gradient(135deg,#f09433,#dc2743,#bc1888)","\u{1F4F7}","Instagram")}
        ${d("tiktok",o,"linear-gradient(135deg,#25F4EE,#000,#FE2C55)","\u{1F3B5}","TikTok")}
      </div>
    </div>
    <style>
      .conn-banner{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;}
      .conn-banner-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--text-primary,var(--fg));}
      .conn-banner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;}
      .conn-pill{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;text-decoration:none;color:#fff;font-weight:700;font-size:14px;transition:filter .15s,transform .12s;border:0;}
      .conn-pill.cta:hover{filter:brightness(1.08);transform:translateY(-1px);}
      .conn-pill.ok{background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.35);color:var(--text-primary,var(--fg));}
      .conn-pill .tiny{font-size:11px;font-weight:500;opacity:.85;}
      html[data-theme="light"] .conn-pill.ok{background:rgba(16,185,129,.08);}
    </style>`},T=async a=>{const e=a.querySelector("#home-usage-widget");if(!e)return;const{data:t}=await p("/api/usage/summary",null);if(!t||!t.plan){e.innerHTML="";return}const s=(o,d,c,r,f="")=>{const m=Math.min(100,Math.max(0,Number(r)||0)),x=m>=90?"#ef4444":m>=70?"#f59e0b":"#10b981";return`
      <div class="uw-row">
        <div class="uw-row-head"><span>${i(o)}</span><strong>${d}${f} <span class="uw-muted">/ ${c===-1?"\u221E":`${c}${f}`}</span></strong></div>
        <div class="uw-bar"><div class="uw-bar-fill" style="width:${m}%;background:${x};"></div></div>
      </div>`},l=t.plan==="agency"?"\u{1F451} Agency":t.plan==="pro"?"\u{1F680} Pro":t.plan==="starter"?"\u26A1 Starter":"\u{1F193} Free",n=t.plan!=="agency"?`<a class="uw-upgrade" href="/pricing.html">${t.plan==="free"?"Upgrade":"Ver planes"} \u2192</a>`:"";e.innerHTML=`
    <div class="uw-card">
      <div class="uw-head">
        <div><strong>Tu uso este mes</strong> \xB7 <span class="uw-plan">${l}</span></div>
        ${n}
      </div>
      <div class="uw-grid">
        ${s("Publicaciones",t.posts.used,t.posts.limit,t.posts.pct)}
        ${s("Calls IA",t.aiCalls.used,t.aiCalls.limit,t.aiCalls.pct)}
        ${s("Costo IA",`$${t.aiCostUsd.used}`,`$${t.aiCostUsd.limit}`,t.aiCostUsd.pct)}
        ${s("Im\xE1genes",t.images.used,t.images.limit,t.images.pct)}
        ${t.cu.limit>0?s("Computer Use",t.cu.used,t.cu.limit,t.cu.pct," min"):""}
      </div>
    </div>
    <style>
      .uw-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:14px 16px;}
      .uw-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;color:var(--text-primary,var(--fg));}
      .uw-plan{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:linear-gradient(135deg,#e1306c22,#a855f722);color:var(--text-primary,var(--fg));}
      .uw-upgrade{font-size:12.5px;font-weight:700;color:#a855f7;text-decoration:none;padding:6px 12px;border-radius:8px;background:rgba(168,85,247,.08);transition:background .15s;}
      .uw-upgrade:hover{background:rgba(168,85,247,.15);}
      .uw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 16px;}
      .uw-row{font-size:12px;}
      .uw-row-head{display:flex;justify-content:space-between;margin-bottom:4px;color:var(--text-secondary,var(--fg));}
      .uw-row-head strong{font-weight:700;color:var(--text-primary,var(--fg));}
      .uw-muted{opacity:.55;font-weight:500;}
      .uw-bar{height:5px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:99px;overflow:hidden;}
      .uw-bar-fill{height:100%;transition:width .5s ease;}
    </style>`};export const renderHome=async a=>{a.innerHTML=S(null,null,null,!1),M(a),N(a),A(a),b(a),T(a),b(a);const[e,t,s,l]=await Promise.all([p("/api/home/identity",null),p("/api/home/dashboard",null),p(`/api/home/kpis?period=${g}`,null),p("/api/moodboard",null)]),n=!!e.error&&!!t.error&&!!s.error;y=e.data??y,h=t.data??h,u=l.data??u,a.innerHTML=S(y,h,s.data,n),M(a),N(a),A(a),b(a),T(a),b(a)};const b=async a=>{try{if(localStorage.getItem("feedia.brandkit.dismissed")==="1")return}catch{}let e=!1;try{const s=JSON.parse(localStorage.getItem("feedia.brujula.account")||"{}").handle||"",n=await(await fetch("/api/account/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get",accountId:s})})).json(),o=n?.profile?.brandKit||n?.profile;e=!!(o?.bgColor||o?.accentColor||o?.colors?.length||o?.photo||o?.font)}catch{}if(e)return;const t=document.createElement("div");t.style.cssText="margin:14px 16px;padding:14px 18px;border-radius:12px;background:linear-gradient(135deg,rgba(168,85,247,.15),rgba(99,102,241,.08));border:1px solid rgba(168,85,247,.3);display:flex;align-items:center;gap:14px;flex-wrap:wrap;",t.innerHTML=`
    <div style="font-size:32px;">\u{1F3A8}</div>
    <div style="flex:1;min-width:200px;">
      <div style="font-weight:800;color:var(--text-primary,var(--fg));font-size:14px;">Carg\xE1 tu Brand Kit 1 vez</div>
      <div style="font-size:12.5px;color:var(--text-secondary,var(--fg-2));margin-top:2px;">Colores + tipograf\xEDa + foto + nicho. Todas las herramientas leen de ah\xED. Sin volver a configurar nada nunca.</div>
    </div>
    <a href="#brandkit" style="background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;padding:9px 18px;border-radius:8px;font-weight:800;font-size:12.5px;text-decoration:none;">Configurar \u2192</a>
    <button id="bk-banner-dismiss" style="background:transparent;border:none;color:var(--text-tertiary,var(--fg-3));font-size:18px;cursor:pointer;padding:4px 8px;" title="Descartar">\u2715</button>`,a.prepend(t),t.querySelector("#bk-banner-dismiss")?.addEventListener("click",()=>{try{localStorage.setItem("feedia.brandkit.dismissed","1")}catch{}t.remove()})};
