import{apiSafe as c,apiBust as p}from"../lib/api.js";import{escape as i}from"../lib/dom.js";import{toast as v}from"../lib/toast.js";let m="inbox";const h=()=>`
  <div class="hook-category-filter">
    ${[["inbox","\u{1F4EC} Inbox"],["leads","\u{1F4BC} Leads"],["faq","\u2753 FAQ"],["fans","\u{1F49B} Fans"],["ugc","\u{1F3AC} UGC"],["mentions","\u{1F4E2} Menciones"]].map(([t,s])=>`<button class="tab-btn ${m===t?"active":""}" data-tab="${t}">${s}</button>`).join("")}
  </div>`,u=async t=>{const[s,n]=await Promise.all([c("/api/cm/inbox/snapshot",{needingResponse:0,escalatedToHuman:0,avgSentiment:0,totalActive:0}),c("/api/cm/inbox",[])]),d={needingResponse:0,escalatedToHuman:0,avgSentiment:0,totalActive:0},e=s.data&&typeof s.data=="object"&&!s.data.demoMode?{...d,...s.data}:d,l=Array.isArray(n.data)?n.data:[];if(s.error&&n.error){t.innerHTML='<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend. El inbox se cargar\xE1 cuando vuelva.</div>';return}t.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Necesitan respuesta</div><div class="stat-value">${e.needingResponse}</div></div>
      <div class="card stat-card"><div class="stat-label">Escalados</div><div class="stat-value">${e.escalatedToHuman}</div></div>
      <div class="card stat-card"><div class="stat-label">Sentiment promedio</div><div class="stat-value">${e.avgSentiment?.toFixed(2)??"\u2014"}</div></div>
      <div class="card stat-card"><div class="stat-label">Total activos</div><div class="stat-value">${e.totalActive}</div></div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <button class="btn" id="tick-inbox">\u25B6 Procesar cola</button>
    </div>
    <div id="conv-list" class="page-grid">
      ${l.slice(0,30).map(a=>`
        <div class="card">
          <div class="meta">
            <span class="tag tiny">${i(a.intent)}</span>
            <span class="tag tiny ${a.priority==="critical"?"crit":a.priority==="high"?"warn":""}">${i(a.priority)}</span>
            <span class="tag tiny">${i(a.status)}</span>
          </div>
          <h4 style="margin:8px 0 4px;">@${i(a.contact.username)}</h4>
          <div class="small muted">${a.messages.length} mensajes \xB7 sentiment ${a.sentiment?.toFixed(2)??"\u2014"}</div>
          <p class="small" style="margin:8px 0;">${i(a.messages[a.messages.length-1]?.text?.slice(0,140)??"")}</p>
          <button class="btn small" data-suggest="${i(a.id)}">\u{1F4A1} Sugerir respuesta</button>
        </div>`).join("")}
    </div>
  `,t.querySelector("#tick-inbox").addEventListener("click",async()=>{v("Procesando inbox...","info"),p("/api/cm/inbox");const{data:a,error:r}=await c("/api/cm/inbox/tick",null,{method:"POST",body:{}});if(r||!a){v("Backend offline","warn");return}v(`${a.processed} procesadas, ${a.responded} respondidas`,"success"),u(t)}),t.querySelectorAll("[data-suggest]").forEach(a=>{a.addEventListener("click",async()=>{v("Generando sugerencia...","info");const{data:r,error:o}=await c(`/api/cm/inbox/${a.dataset.suggest}/suggest-reply`,null,{method:"POST",body:{}});if(o||!r){v("Backend offline","warn");return}alert(`Sugerencia:

${r.text}

Confidence: ${r.confidence}
Intent: ${r.intent}`)})})},T=async t=>{const{data:s,error:n}=await c("/api/cm/leads/kanban",{});if(n&&!s){t.innerHTML='<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend. Los leads se cargar\xE1n cuando vuelva.</div>';return}const d=["new","qualified","engaged","proposal","negotiation","won","lost","nurture"];t.innerHTML=`
    <div style="overflow-x:auto;">
      <div style="display:grid;grid-template-columns:repeat(${d.length}, minmax(220px, 1fr));gap:10px;">
        ${d.map(e=>`
          <div class="card kanban-col">
            <h4 style="margin:0 0 8px;text-transform:capitalize;">${e} (${(s[e]??[]).length})</h4>
            ${(s[e]??[]).slice(0,6).map(l=>`
              <div class="card" style="margin-bottom:8px;padding:10px;">
                <div class="small"><strong>@${i(l.contactUsername)}</strong></div>
                <div class="small muted">Score: ${l.score.total}/100 (${l.score.classification})</div>
                <div class="small">${i(l.productInterest)}</div>
              </div>`).join("")}
          </div>`).join("")}
      </div>
    </div>
  `},g=async t=>{const[s,n,d]=await Promise.all([c("/api/cm/faq/snapshot",{totalFAQs:0,approvedFAQs:0,pendingPatterns:0}),c("/api/cm/faq",[]),c("/api/cm/faq/pending",[])]),e={totalFAQs:0,approvedFAQs:0,pendingPatterns:0},l=s.data&&typeof s.data=="object"&&!s.data.demoMode?{...e,...s.data}:e,a=Array.isArray(n.data)?n.data:[],r=Array.isArray(d.data)?d.data:[];if(s.error&&n.error){t.innerHTML='<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend.</div>';return}t.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total FAQs</div><div class="stat-value">${l.totalFAQs}</div></div>
      <div class="card stat-card"><div class="stat-label">Aprobadas</div><div class="stat-value">${l.approvedFAQs}</div></div>
      <div class="card stat-card"><div class="stat-label">Pendientes</div><div class="stat-value">${l.pendingPatterns}</div></div>
    </div>
    <button class="btn" id="detect-patterns">\u{1F50D} Detectar nuevos patrones</button>
    ${r.length?`
      <h3 style="margin-top:20px;">Pendientes de aprobaci\xF3n</h3>
      <div class="page-grid">
        ${r.map(o=>`
          <div class="card">
            <h4>${i(o.detectedQuestion)}</h4>
            <div class="small muted">${o.occurrences} apariciones</div>
            <ul class="small">${o.examples.slice(0,3).map(x=>`<li>${i(x)}</li>`).join("")}</ul>
          </div>`).join("")}
      </div>`:""}
    <h3 style="margin-top:20px;">FAQs aprobadas</h3>
    <div class="page-grid">
      ${a.slice(0,20).map(o=>`
        <div class="card">
          <h4>${i(o.question)}</h4>
          <p class="small">${i(o.answer)}</p>
          <div class="meta"><span class="tag tiny">${i(o.category)}</span><span class="tag tiny">${o.popularity} usos</span></div>
        </div>`).join("")}
    </div>
  `,t.querySelector("#detect-patterns").addEventListener("click",async()=>{v("Detectando patrones...","info");const{error:o}=await c("/api/cm/faq/detect-patterns",null,{method:"POST",body:{}});if(o){v("Backend offline","warn");return}p("/api/cm/faq"),g(t)})},y=async t=>{const[s,n]=await Promise.all([c("/api/cm/fans/snapshot",{total:0,byTier:{},pendingWelcomes:0}),c("/api/cm/fans/top",[])]),d={total:0,byTier:{},pendingWelcomes:0},e=s.data&&typeof s.data=="object"&&!s.data.demoMode?{...d,...s.data}:d,l=Array.isArray(n.data)?n.data:[];if(s.error&&n.error){t.innerHTML='<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend.</div>';return}t.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total fans</div><div class="stat-value">${e.total}</div></div>
      <div class="card stat-card"><div class="stat-label">Embajadores</div><div class="stat-value">${e.byTier?.embajador??0}</div></div>
      <div class="card stat-card"><div class="stat-label">Super fans</div><div class="stat-value">${e.byTier?.["super-fan"]??0}</div></div>
      <div class="card stat-card"><div class="stat-label">Welcomes pendientes</div><div class="stat-value">${e.pendingWelcomes}</div></div>
    </div>
    <button class="btn" id="fan-of-week">\u2B50 Fan de la semana</button>
    <button class="btn" id="refresh-fans">\u{1F504} Refresh perfiles</button>
    <h3 style="margin-top:20px;">Top fans</h3>
    <div class="page-grid">
      ${l.slice(0,12).map(a=>`
        <div class="card">
          <h4>@${i(a.username)}</h4>
          <div class="meta"><span class="tag tiny">${i(a.tier)}</span><span class="tag tiny">${a.engagementScore}/100</span></div>
          <div class="small">DMs: ${a.signals.dmsExchanged} \xB7 Comments: ${a.signals.commentsCount} \xB7 Mentions: ${a.signals.mentionsCount}</div>
        </div>`).join("")}
    </div>
  `,t.querySelector("#fan-of-week").addEventListener("click",async()=>{const{data:a,error:r}=await c("/api/cm/fans/fan-of-week",null);if(r){v("Backend offline","warn");return}a?alert(`Fan de la semana: @${a.fan.username}

${a.shoutoutText}`):v("Sin fans suficientes para feature","info")}),t.querySelector("#refresh-fans").addEventListener("click",async()=>{v("Refresh perfiles...","info");const{error:a}=await c("/api/cm/fans/refresh",null,{method:"POST",body:{}});if(a){v("Backend offline","warn");return}p("/api/cm/fans"),y(t)})},b=async t=>{const[s,n]=await Promise.all([c("/api/cm/ugc/snapshot",{total:0,readyToRepost:[],reposted:0}),c("/api/cm/ugc",[])]),d={total:0,readyToRepost:[],reposted:0},e=s.data&&typeof s.data=="object"&&!s.data.demoMode?{...d,...s.data,readyToRepost:Array.isArray(s.data.readyToRepost)?s.data.readyToRepost:[]}:d,l=Array.isArray(n.data)?n.data:[];if(s.error&&n.error){t.innerHTML='<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend.</div>';return}t.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total UGC</div><div class="stat-value">${e.total}</div></div>
      <div class="card stat-card"><div class="stat-label">Listos repost</div><div class="stat-value">${e.readyToRepost.length}</div></div>
      <div class="card stat-card"><div class="stat-label">Reposted</div><div class="stat-value">${e.reposted}</div></div>
    </div>
    <div class="page-grid">
      ${l.slice(0,20).map(a=>`
        <div class="card">
          <div class="meta"><span class="tag tiny">${i(a.ugcType)}</span><span class="tag tiny">${i(a.stage)}</span><span class="tag tiny">\u2605 ${a.qualityScore}</span></div>
          <h4 style="margin:6px 0;">@${i(a.authorUsername)}</h4>
          <p class="small">${i(a.caption?.slice(0,160)??"")}</p>
          ${a.stage==="detected"?`<button class="btn small" data-ugc-req="${i(a.id)}">\u{1F4E4} Pedir permiso</button>`:""}
          ${a.stage==="permission-granted"?`<button class="btn small" data-ugc-cap="${i(a.id)}">\u270D\uFE0F Generar caption</button>`:""}
        </div>`).join("")}
    </div>
  `,t.querySelectorAll("[data-ugc-req]").forEach(a=>{a.addEventListener("click",async()=>{v("Enviando pedido...","info");const{data:r,error:o}=await c(`/api/cm/ugc/${a.dataset.ugcReq}/request`,null,{method:"POST",body:{}});if(o){v("Backend offline","warn");return}v(r?.ok?"Pedido enviado":"Fall\xF3",r?.ok?"success":"error"),p("/api/cm/ugc"),b(t)})}),t.querySelectorAll("[data-ugc-cap]").forEach(a=>{a.addEventListener("click",async()=>{const{data:r,error:o}=await c(`/api/cm/ugc/${a.dataset.ugcCap}/caption`,null,{method:"POST",body:{}});if(o||!r){v("Backend offline","warn");return}alert(`Caption generado:

${r.caption}`)})})},f=async t=>{const[s,n]=await Promise.all([c("/api/cm/mentions/snapshot",{totalLast7Days:0,sentimentLast7Days:{positive:0,critical:0},estimatedReachLast30Days:0}),c("/api/cm/mentions",[])]),d={totalLast7Days:0,sentimentLast7Days:{positive:0,critical:0},estimatedReachLast30Days:0},e=s.data&&typeof s.data=="object"&&!s.data.demoMode?{...d,...s.data,sentimentLast7Days:s.data.sentimentLast7Days||d.sentimentLast7Days}:d,l=Array.isArray(n.data)?n.data:[];if(s.error&&n.error){t.innerHTML='<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend.</div>';return}t.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">\xDAltimos 7d</div><div class="stat-value">${e.totalLast7Days}</div></div>
      <div class="card stat-card"><div class="stat-label">Positivas 7d</div><div class="stat-value">${e.sentimentLast7Days?.positive??0}</div></div>
      <div class="card stat-card"><div class="stat-label">Cr\xEDticas 7d</div><div class="stat-value">${e.sentimentLast7Days?.critical??0}</div></div>
      <div class="card stat-card"><div class="stat-label">Reach 30d</div><div class="stat-value">${(e.estimatedReachLast30Days??0).toLocaleString("es-AR")}</div></div>
    </div>
    <div class="page-grid">
      ${l.slice(0,20).map(a=>`
        <div class="card">
          <div class="meta">
            <span class="tag tiny">${i(a.type)}</span>
            <span class="tag tiny ${a.sentiment==="critical"?"crit":a.sentiment==="negative"?"warn":a.sentiment==="positive"?"ok":""}">${i(a.sentiment)}</span>
            <span class="tag tiny">${i(a.importance)}</span>
          </div>
          <h4 style="margin:6px 0;">@${i(a.authorUsername)} ${a.authorFollowerCount?`(${a.authorFollowerCount.toLocaleString("es-AR")})`:""}</h4>
          <p class="small">${i(a.context.slice(0,200))}</p>
          ${a.acknowledged?"":`<button class="btn small" data-mention-ack="${i(a.id)}">\u2713 Acknowledge</button>`}
        </div>`).join("")}
    </div>
  `,t.querySelectorAll("[data-mention-ack]").forEach(a=>{a.addEventListener("click",async()=>{await c(`/api/cm/mentions/${a.dataset.mentionAck}/ack`,null,{method:"POST",body:{}}),p("/api/cm/mentions"),f(t)})})},$={inbox:u,leads:T,faq:g,fans:y,ugc:b,mentions:f};export const renderCommunityHub=async t=>{t.innerHTML=`
    <div class="page-header">
      <h1>\u{1F4AC} Community Hub</h1>
      <p class="muted">Toda la operaci\xF3n de community en un solo lugar.</p>
    </div>
    ${h()}
    <div id="cm-tab-body" style="margin-top:18px;"></div>
  `;const s=t.querySelector("#cm-tab-body");await $[m](s),t.addEventListener("click",async n=>{const d=n.target.closest("[data-tab]");d&&(m=d.dataset.tab,t.querySelectorAll("[data-tab]").forEach(e=>e.classList.toggle("active",e.dataset.tab===m)),s.innerHTML='<div class="loading">Cargando...</div>',await $[m](s))})};
