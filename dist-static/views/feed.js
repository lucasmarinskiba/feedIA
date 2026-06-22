import{api as p,apiSafe as k}from"../lib/api.js";import{escape as t}from"../lib/dom.js";import{fmt as c}from"../lib/dom.js";import{toast as w}from"../lib/toast.js";const v=i=>typeof i!="number"?"\u2014":i>=1e6?(i/1e6).toFixed(1)+"M":i>=1e3?(i/1e3).toFixed(1)+"K":String(i),R=(i,e)=>{if(!e)return"";const s=i==="tiktok",r=s?"linear-gradient(135deg,#25F4EE,#FE2C55)":"linear-gradient(135deg,#f09433,#dc2743,#bc1888)",l=s?[["Siguiendo",e.following],["Seguidores",e.followers],["Me gusta",e.likes]]:[["Publicaciones",e.posts],["Seguidores",e.followers],["Siguiendo",e.following]];return`
    <div class="profile-header card" style="display:flex;gap:16px;align-items:center;padding:16px;margin-bottom:14px;border-top:3px solid transparent;background-image:linear-gradient(var(--bg-card,#ffffff),var(--bg-card,#ffffff)),${r};background-origin:border-box;background-clip:padding-box,border-box;color:var(--text-primary,var(--fg,#fff));">
      <img src="${t(e.avatar||"https://placehold.co/96")}" alt="pfp" style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border);" onerror="this.src='https://placehold.co/96'">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <strong style="font-size:17px;">${t(e.name||"Cuenta")}</strong>
          <span class="tag tiny ${s?"":"accent"}">${s?"\u{1F3B5} TikTok":"\u{1F4F7} Instagram"}</span>
        </div>
        <div class="small muted">@${t(e.handle||"cuenta")}</div>
        <div class="meta" style="gap:16px;margin-top:8px;">
          ${l.map(([g,m])=>`<span class="small"><strong>${v(m)}</strong> <span class="muted">${g}</span></span>`).join("")}
        </div>
        ${e.bio?`<div class="small" style="margin-top:6px;line-height:1.4;">${t(e.bio)}</div>`:""}
        ${e.real===!1?`<a href="/api/auth/${s?"tiktok":"instagram"}/login" class="btn tiny" style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;background:${s?"#FE2C55":"#C13584"};color:#fff;border:0;border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:700;">\u{1F517} Conectar ${s?"TikTok":"Instagram"} (datos reales)</a>`:'<span class="tag tiny ok" style="margin-top:10px;display:inline-block;">\u2713 Conectado</span>'}
      </div>
    </div>`},A={followers:"\u{1F465}",reach:"\u{1F4E1}",engagement:"\u2764\uFE0F",saves:"\u{1F516}",shares:"\u2197\uFE0F",impressions:"\u{1F441}"},P=(i=[],e="instagram")=>e==="tiktok"?"":i.length?`
    <div class="stories-bar">
      <div class="story-add-btn" id="new-story-btn">
        <div class="story-add-icon">+</div>
        <div class="tiny">Nueva</div>
      </div>
      ${i.map(s=>`
        <div class="story-bubble ${s.visto?"seen":"unseen"}">
          <div class="story-ring">
            <div class="story-avatar-inner">${t((s.nombre??"?").charAt(0).toUpperCase())}</div>
          </div>
          <div class="tiny">${t(s.nombre??"")}</div>
        </div>`).join("")}
    </div>`:`<div class="stories-bar">
      <div class="story-add-btn" id="new-story-btn">
        <div class="story-add-icon">+</div>
        <div class="tiny">Tu historia</div>
      </div>
      <div class="muted small" style="align-self:center;margin-left:12px;">Sin historias \xB7 conect\xE1 Instagram para verlas</div>
    </div>`,z=(i,e,s)=>{const r=A[i]??"\u{1F4CA}",l=s>=0;return`
    <div class="kpi-card">
      <div class="kpi-icon">${r}</div>
      <div class="kpi-value">${c.num(e)}</div>
      <div class="kpi-label">${t(i)}</div>
      <div class="kpi-delta ${l?"up":"down"}">${l?"\u25B2":"\u25BC"} ${Math.abs(s)}%</div>
    </div>`},F=(i=[])=>i.length?i.map(e=>`
    <div class="activity-item">
      <div class="activity-icon">${e.icon??"\u{1F4CC}"}</div>
      <div class="activity-body">
        <div class="small">${t(e.titulo)}</div>
        <div class="tiny muted">${c.rel(e.fecha)}</div>
      </div>
      ${e.badge?`<span class="tag ${e.badgeKind??"info"}">${t(e.badge)}</span>`:""}
    </div>`).join(""):'<div class="empty">Sin actividad reciente registrada.</div>',I=(i=[])=>i.length?i.map(e=>`
    <div class="upcoming-item">
      <div class="upcoming-type tag">${t(e.tipo??"post")}</div>
      <div class="upcoming-info">
        <div class="small">${t(e.titulo??"Sin t\xEDtulo")}</div>
        <div class="tiny muted">${c.date(e.scheduledFor)}</div>
      </div>
      <span class="tag ${e.status==="pendiente"?"warn":"ok"}">${t(e.status??"pendiente")}</span>
    </div>`).join(""):'<div class="empty">Sin publicaciones programadas pr\xF3ximamente.</div>',M={reel:{emoji:"\u{1F3AC}",label:"Reel"},"reel-faceless":{emoji:"\u{1F3AC}",label:"Reel"},carrusel:{emoji:"\u{1F5C2}\uFE0F",label:"Carrusel"},"post-imagen":{emoji:"\u{1F5BC}\uFE0F",label:"Post"},historia:{emoji:"\u{1F4F8}",label:"Story"},live:{emoji:"\u{1F534}",label:"Live"}},T=i=>{const e=M[i.format]??{emoji:"\u{1F4CC}",label:i.format},s=i.isTopPerformer?"linear-gradient(135deg,#3FB8C9,#E85A2C)":"linear-gradient(135deg,rgba(63,184,201,0.18),rgba(232,90,44,0.18))",r=t((i.hook??"").slice(0,80));return`
    <div class="ig-cell" data-post="${t(i.id)}" style="
      position:relative;aspect-ratio:1;border-radius:6px;overflow:hidden;
      background:${s};
      cursor:pointer;display:flex;align-items:flex-end;padding:8px;
      transition:transform 0.15s;
    ">
      <div style="position:absolute;top:6px;right:6px;font-size:11px;background:rgba(0,0,0,0.55);color:white;padding:2px 6px;border-radius:4px;">${e.emoji}</div>
      ${i.isTopPerformer?'<div style="position:absolute;top:6px;left:6px;font-size:11px;background:rgba(245,158,11,0.9);color:#000;padding:2px 6px;border-radius:4px;font-weight:700;">\u2605 TOP</div>':""}
      <div style="position:relative;z-index:1;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.6);">
        <div style="font-size:11px;font-weight:600;line-height:1.25;">${r}${(i.hook??"").length>80?"\u2026":""}</div>
        <div style="font-size:10px;opacity:0.85;margin-top:3px;">
          \u2764\uFE0F ${c.num(i.metrics?.likes??0)} \xB7 \u{1F4AC} ${c.num(i.metrics?.comments??0)} \xB7 \u{1F516} ${c.num(i.metrics?.saves??0)}
        </div>
      </div>
    </div>`},H=(i,e="instagram")=>{if(!i||!i.posts||i.posts.length===0){const s=e==="tiktok";return`
      <div class="ig-grid-empty card" style="text-align:center;padding:30px;">
        <div style="font-size:48px;opacity:0.4;">${s?"\u{1F3B5}":"\u{1F4F7}"}</div>
        <h3 style="margin:10px 0 6px;">Sin ${s?"videos":"posts"} registrados</h3>
        <p class="small muted">${s?"Conect\xE1 TikTok en Configuraci\xF3n para sincronizar tus videos y m\xE9tricas.":"Conect\xE1 Instagram en Configuraci\xF3n o public\xE1 desde los studios para ver tu feed real."}</p>
      </div>`}return`
    <div class="card" style="padding:14px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(45deg,#f09433,#dc2743,#bc1888);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;">${t((i.brand?.name??"?").charAt(0).toUpperCase())}</div>
        <div>
          <div style="font-weight:600;">@${t(i.brand?.name??"tu cuenta")}</div>
          <div class="small muted">${t(i.brand?.niche??"")} \xB7 ${i.totalShown} posts en tu grid</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="ig-filter-btn tab-btn active" data-filter="">Todos</button>
          <button class="ig-filter-btn tab-btn" data-filter="reel">Reels</button>
          <button class="ig-filter-btn tab-btn" data-filter="carrusel">Carruseles</button>
          <button class="ig-filter-btn tab-btn" data-filter="post-imagen">Posts</button>
        </div>
      </div>
      <div class="ig-grid" id="ig-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
        ${i.posts.map(T).join("")}
      </div>
    </div>`},q=i=>i?`
    <div class="card digest-card" style="margin-bottom:20px;">
      <div class="meta" style="margin-bottom:8px;">
        <span class="tag accent">Digest IA</span>
        <span class="tiny muted">${c.date(i.generadoEn)}</span>
      </div>
      <div class="body">${t(i.resumenEjecutivo??"Sin resumen disponible.")}</div>
      ${i.prioridades?.length?`
        <div class="divider"></div>
        <div class="small muted" style="margin-bottom:6px;">Prioridades del d\xEDa</div>
        <ul style="margin:0;padding-left:18px;">
          ${i.prioridades.map(e=>`<li class="small">${t(e)}</li>`).join("")}
        </ul>`:""}
    </div>`:"";export const renderFeed=async i=>{i.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Feed</h1>
        <p class="view-subtitle page-subtitle">Resumen de hoy, KPIs y actividad reciente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="refresh-btn">\u21BB Actualizar</button>
      </div>
    </header>
    <div class="page-body"><div class="page-loading"><span class="spinner"></span> cargando feed\u2026</div></div>`;let e="instagram";try{const{getPlatform:r}=await import("../lib/platform.js");e=r()==="tiktok"?"tiktok":"instagram"}catch{}const s=async()=>{try{const l=(await k(`/api/${e}/profile`,null)).data,[g,m,y,h]=await Promise.allSettled([p("/api/digest"),p("/api/scheduler/jobs"),p("/api/memory"),p("/api/feed/grid?limit=36")]),S=g.status==="fulfilled"?g.value:null,C=m.status==="fulfilled"?m.value.jobs??[]:[],f=y.status==="fulfilled"?y.value:null,x=h.status==="fulfilled"?h.value:null,u=f?.kpis??{},$=Object.keys(u).filter(a=>typeof u[a]?.value=="number"),j=f?.recentActivity??[],E=f?.storiesHoy??[],L=C.filter(a=>a.status==="pendiente").slice(0,5);i.innerHTML=`
        <header class="view-header page-header">
          <div>
            <h1 class="view-title page-title">Feed</h1>
            <p class="view-subtitle page-subtitle">Resumen de hoy \u2014 ${new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</p>
          </div>
          <div class="page-actions">
            <button class="btn ghost" id="refresh-btn">\u21BB Actualizar</button>
          </div>
        </header>
        <div class="page-body">
          ${R(e,l)}

          ${e==="tiktok"&&l?.real?'<div id="tt-videos" class="card" style="margin-bottom:14px;"><div class="small muted"><span class="spinner"></span> cargando tus videos de TikTok\u2026</div></div>':""}

          ${q(S)}

          ${P(E,e)}

          ${H(x,e)}

          ${$.length?`
            <div class="kpi-grid">
              ${$.map(a=>z(a,u[a].value,u[a].delta??0)).join("")}
            </div>`:`
            <div class="kpi-grid-empty card muted small" style="text-align:center;padding:20px;">
              Sin KPIs registrados a\xFAn. Conect\xE1 ${e==="tiktok"?"TikTok":"Instagram"} en Configuraci\xF3n para ver m\xE9tricas reales.
            </div>`}

          <div class="feed-cols">
            <div class="feed-col">
              <div class="col-header"><h3>\u{1F4C5} Pr\xF3ximas publicaciones</h3></div>
              <div class="card" style="padding:0;">
                <div class="list-inner">${I(L)}</div>
              </div>
            </div>
            <div class="feed-col">
              <div class="col-header"><h3>\u26A1 Actividad reciente</h3></div>
              <div class="card" style="padding:0;">
                <div class="list-inner">${F(j)}</div>
              </div>
            </div>
          </div>
        </div>`;const b=i.querySelector("#tt-videos");b&&(async()=>{const{data:a}=await k("/api/insights/tiktok",null),o=a?.videos??[];if(!o.length){b.innerHTML='<div class="small muted">Sin videos para mostrar.</div>';return}b.innerHTML=`<div class="row spread" style="margin-bottom:10px;"><h3 style="margin:0;">\u{1F3B5} Tus videos de TikTok</h3><span class="tag tiny ok">video.list</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">
              ${o.map(n=>`<div class="card" style="padding:10px;">
                <div class="small" style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t(n.title||"Video")}</div>
                <div class="meta" style="gap:10px;margin-top:6px;font-size:11px;">
                  <span>\u{1F441} ${v(n.view_count??0)}</span><span>\u2764\uFE0F ${v(n.like_count??0)}</span>
                  <span>\u{1F4AC} ${v(n.comment_count??0)}</span><span>\u2197 ${v(n.share_count??0)}</span>
                </div></div>`).join("")}
            </div>`})(),i.querySelector("#refresh-btn")?.addEventListener("click",()=>{i.innerHTML='<div class="page-loading"><span class="spinner"></span> actualizando\u2026</div>',s()}),i.querySelector("#new-story-btn")?.addEventListener("click",()=>{location.hash="studio-stories"}),i.querySelectorAll(".ig-filter-btn").forEach(a=>{a.addEventListener("click",async()=>{const o=a.dataset.filter;i.querySelectorAll(".ig-filter-btn").forEach(d=>d.classList.toggle("active",d===a));const n=i.querySelector("#ig-grid");if(n){n.innerHTML='<div class="page-loading"><span class="spinner"></span></div>';try{const d=await p(`/api/feed/grid?limit=36${o?`&format=${encodeURIComponent(o)}`:""}`);n.innerHTML=(d?.posts??[]).map(T).join("")||'<div class="muted small" style="grid-column:1/-1;text-align:center;padding:20px;">Sin posts con ese filtro</div>'}catch(d){n.innerHTML=`<div class="alert crit" style="grid-column:1/-1;">${t(d.message)}</div>`}}})}),i.querySelectorAll(".ig-cell").forEach(a=>{a.addEventListener("click",()=>{const o=a.dataset.post,n=(x?.posts??[]).find(d=>d.id===o);n&&w(`\u{1F4CA} ${n.format} \xB7 ${n.metrics.likes} likes \xB7 ${n.metrics.reach.toLocaleString("es-AR")} alcance \xB7 ER ${n.metrics.engagementRate.toFixed(2)}%`,"info")})})}catch(r){i.innerHTML=`<div class="alert crit">Error cargando feed: ${t(r.message)}</div>`,w(r.message,"crit")}};await s()};
