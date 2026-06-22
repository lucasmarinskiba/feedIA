import{api as x,apiSafe as $}from"../lib/api.js";import{escape as s,fmt as S}from"../lib/dom.js";import{toast as g}from"../lib/toast.js";import{loadingScreen as D,withBtnSpinner as z}from"../lib/ui.js";import{speak as P,stopSpeaking as M}from"../lib/voice.js";let E=!1;const L=async(l,i)=>{if(E){M(),E=!1,l.textContent="\u{1F50A} Escuchar";return}E=!0,l.textContent="\u23F9 Detener",await P(i),E=!1,l.textContent="\u{1F50A} Escuchar"},h=(l,i,a,c)=>(l.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">${i}</h1>
        <p class="view-subtitle page-subtitle">${a}</p>
      </div>
    </header>
    <div id="${c}" class="page-body">${D()}</div>`,l.querySelector("#"+c));export const renderApprovals=async l=>{const i=h(l,"\u2705 Bandeja de Aprobaciones","Todo lo que FeedIA dej\xF3 esperando tu OK, en un solo lugar.","ap-body"),a=async()=>{const[c,e]=await Promise.all([$("/api/approvals",{count:0,items:[]}),$("/api/cu/mode/pending-approvals",[])]),n=c.data??{count:0,items:[]},o=Array.isArray(e.data)?e.data:[],t=!!c.error&&!!e.error,b=[...o.map(r=>({kind:"cua",title:r.action||"Acci\xF3n del Computer Use Agent",detail:r.context||r.workflow||"Esperando aprobaci\xF3n",createdAt:r.createdAt||new Date().toISOString(),actionableId:r.id,_cua:!0})),...n.items??[]],u=b.length;i.innerHTML=`
      ${t?`<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
        <span class="small">\u{1F4E1} Backend offline \xB7 mostrando bandeja vac\xEDa. Volvemos cuando el server responda.</span>
      </div>`:""}
      ${u===0?'<div class="card" style="text-align:center;padding:36px;"><div style="font-size:42px;margin-bottom:10px;">\u{1F389}</div><div class="muted">Nada pendiente. FeedIA est\xE1 al d\xEDa.</div></div>':`<div class="col-header"><h3>Pendientes (${u})</h3></div>`+b.map(r=>`
          <div class="card ws-row" ${r._cua?'style="border-left:3px solid #a855f7;"':""}>
            <div style="flex:1;min-width:0;">
              <div class="meta">
                <span class="tag ${r.kind==="checkpoint"?"warn":r.kind==="cua"?"accent":"info"} tiny">${s(r.kind)}</span>
                <span class="tiny muted">${S.rel(r.createdAt)}</span>
              </div>
              <div class="small" style="font-weight:600;margin:6px 0 2px;">${s(r.title)}</div>
              <div class="tiny muted">${s(r.detail)}</div>
            </div>
            ${r.actionableId?`<div class="btn-row" style="flex-shrink:0;">
              <button class="btn primary tiny" data-ap="${s(r.actionableId)}" data-d="approve" data-cua="${r._cua?"1":"0"}">\u2713 Aprobar</button>
              <button class="btn ghost tiny" data-ap="${s(r.actionableId)}" data-d="reject" data-cua="${r._cua?"1":"0"}">\u2717 Rechazar</button>
            </div>`:'<span class="tag tiny muted">revisar en su secci\xF3n</span>'}
          </div>`).join("")}`,i.querySelectorAll("[data-ap]").forEach(r=>r.addEventListener("click",async()=>{const v=r.dataset.cua==="1"?`/api/cu/mode/${r.dataset.d==="approve"?"approve":"reject"}/${r.dataset.ap}`:`/api/approvals/${r.dataset.ap}/${r.dataset.d}`,{error:m}=await $(v,null,{method:"POST",body:{}});m?g("Backend offline. Lo procesamos cuando vuelva.","warn"):g(r.dataset.d==="approve"?"\u2713 Aprobado":"\u2717 Rechazado","ok"),await a()}))};await a()};const B={entries:[],stats:{totalTraces:0,withOutcomes:0,successRate:0}};export const renderBitacora=async l=>{const i=h(l,"\u{1F4D3} Bit\xE1cora de FeedIA","El diario en lenguaje humano: qu\xE9 decidi\xF3, por qu\xE9 y con qu\xE9 resultado.","bi-body"),{data:a,error:c}=await $("/api/bitacora?limit=80",B),e=a??B,n=!!c;try{const o=e.entries.length===0?"La bit\xE1cora est\xE1 vac\xEDa. Todav\xEDa no tom\xE9 decisiones registradas.":`Tengo ${e.stats.totalTraces} decisiones registradas, con ${(e.stats.successRate*100).toFixed(0)} por ciento de acierto. Las \xFAltimas: `+e.entries.slice(0,6).map(t=>`${t.what}. ${t.why}`).join(". ");i.innerHTML=`
      ${n?`<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
        <span class="small">\u{1F4E1} Backend offline \xB7 bit\xE1cora vac\xEDa.</span>
      </div>`:""}
      <div class="btn-row" style="margin-bottom:12px;"><button class="btn ghost" id="bi-voice">\u{1F50A} Escuchar</button></div>
      <div class="autopilot-stat-row" style="margin-bottom:14px;">
        <div class="autopilot-stat"><div class="autopilot-stat-num">${e.stats.totalTraces}</div><div class="autopilot-stat-label">decisiones</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${e.stats.withOutcomes}</div><div class="autopilot-stat-label">con resultado</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${(e.stats.successRate*100).toFixed(0)}%</div><div class="autopilot-stat-label">acierto</div></div>
      </div>
      ${e.entries.length===0?'<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin entradas todav\xEDa. A medida que FeedIA opere, su diario se llena solo.</div></div>':e.entries.map(t=>`
          <div class="card ws-log">
            <div class="meta"><span class="tag accent tiny">${s(t.agent)}</span><span class="tiny muted">${S.rel(t.at)}</span>${t.outcome?`<span class="tag ok tiny">${s(t.outcome)}</span>`:""}</div>
            <div class="small" style="margin:6px 0 2px;font-weight:600;">${s(t.what)}</div>
            <div class="tiny muted">${s(t.why)}</div>
          </div>`).join("")}`,i.querySelector("#bi-voice")?.addEventListener("click",t=>L(t.currentTarget,o))}catch(o){i.innerHTML=`<div class="alert crit">Error: ${s(o.message)}</div>`}};const A={critica:"crit",alta:"warn",media:"info",info:"muted"},j={count:0,critical:0,alerts:[]};export const renderAlertas=async l=>{const i=h(l,"\u{1F6A8} Centro de Alertas","Crisis, l\xEDmites de cumplimiento y oportunidades, todo consolidado.","al-body"),{data:a,error:c}=await $("/api/alerts",j),e=a??j,n=!!c;try{const o=e.count===0?"No hay alertas activas. Todo en orden.":`Ten\xE9s ${e.count} alertas, ${e.critical} cr\xEDticas. `+e.alerts.slice(0,6).map(t=>`${t.source}: ${t.message}`).join(". ");i.innerHTML=`
      ${n?`<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
        <span class="small">\u{1F4E1} Backend offline \xB7 sin alertas que mostrar.</span>
      </div>`:""}
      <div class="btn-row" style="margin-bottom:12px;"><button class="btn ghost" id="al-voice">\u{1F50A} Escuchar</button></div>
      <div class="autopilot-stat-row" style="margin-bottom:14px;">
        <div class="autopilot-stat"><div class="autopilot-stat-num">${e.count}</div><div class="autopilot-stat-label">alertas</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num" style="color:var(--crit)">${e.critical}</div><div class="autopilot-stat-label">cr\xEDticas</div></div>
      </div>
      ${e.alerts.map(t=>`
        <div class="card ws-row" style="border-left:3px solid var(--${A[t.level]==="crit"?"crit":A[t.level]==="warn"?"warn":A[t.level]==="info"?"info":"border"});">
          <div style="flex:1;">
            <div class="meta"><span class="tag ${A[t.level]} tiny">${s(t.level)}</span><span class="tag tiny">${s(t.source)}</span><span class="tiny muted">${S.rel(t.at)}</span></div>
            <div class="small" style="margin-top:6px;">${s(t.message)}</div>
          </div>
        </div>`).join("")}`,i.querySelector("#al-voice")?.addEventListener("click",t=>L(t.currentTarget,o))}catch(o){i.innerHTML=`<div class="alert crit">Error: ${s(o.message)}</div>`}};const q={columns:[{title:"\u{1F4A1} Idea",cards:[]},{title:"\u270D\uFE0F Producci\xF3n",cards:[]},{title:"\u{1F440} Revisi\xF3n",cards:[]},{title:"\u23F0 Programado",cards:[]},{title:"\u2705 Publicado",cards:[]}]};export const renderKanban=async l=>{const i=h(l,"\u{1F5C2} Tablero de Contenido","El pipeline de tus piezas: de la idea al publicado.","kb-body"),{data:a,error:c}=await $("/api/kanban",q),e=a&&Array.isArray(a.columns)?a:q,n=!!c,o=e.columns.reduce((t,p)=>t+(p.cards?.length??0),0);i.innerHTML=`
    ${n?`<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
      <span class="small">\u{1F4E1} Backend offline \xB7 tablero vac\xEDo. Volver\xE1 cuando el server responda.</span>
    </div>`:""}
    ${o===0&&!n?`<div class="card" style="text-align:center;padding:30px;margin-bottom:14px;">
      <div style="font-size:42px;margin-bottom:8px;">\u{1F5C2}</div>
      <div class="muted">Sin piezas en el pipeline. Lanz\xE1 una misi\xF3n o cre\xE1 contenido para empezar.</div>
    </div>`:""}
    <div class="kanban-grid">
      ${e.columns.map(t=>`
        <div class="kanban-col">
          <div class="kanban-col-head">${s(t.title)} <span class="tag tiny">${(t.cards??[]).length}</span></div>
          <div class="kanban-col-body">
            ${(t.cards??[]).length===0?'<div class="tiny muted" style="padding:14px;text-align:center;">vac\xEDo</div>':t.cards.map(p=>`<div class="kanban-card"><div class="small" style="font-weight:600;">${s(p.title??"\u2014")}</div><div class="tiny muted">${s(p.meta??"")}</div></div>`).join("")}
          </div>
        </div>`).join("")}
    </div>`};const T={warm:["#F59E0B","#EF4444","#FBBF24","#FEF3C7"],cool:["#3B82F6","#06B6D4","#A5B4FC","#E0E7FF"],bold:["#EC4899","#A855F7","#6366F1","#22D3EE"],earth:["#78350F","#A16207","#D4D4AA","#FDE68A"],mono:["#0A0A0A","#262626","#737373","#FAFAFA"],pastel:["#FBCFE8","#FDE68A","#A7F3D0","#BFDBFE"],cyberpunk:["#FF00FF","#00FFFF","#FFFF00","#0F0F23"]},R=["Inter","Merriweather","Poppins","Playfair Display","JetBrains Mono","Sistema"],O=["amistosa","profesional","c\xF3mplice","p\xEDcara","mentora","en\xE9rgica","sofisticada","rebelde","c\xE1lida","directa"],C={name:"Mi Marca",niche:"",style:"moderno",mood:"",palette:T.bold,typography:["Inter"],voiceTone:["amistosa","c\xF3mplice"],forbidden:[],allowedIconography:["minimalista","l\xEDneas finas"],forbiddenIconography:["clipart","emojis grandes"],values:"",mission:"",tagline:""};export const renderMoodboard=async l=>{const i=h(l,"\u{1F3A8} Brand Board","Defin\xED, mejor\xE1 y aplic\xE1 la identidad de tu marca. FeedIA usa este brand en cada pieza que genera.","mb-body");let a=C;try{a={...C,...await x("/api/moodboard")}}catch{}try{const e=JSON.parse(localStorage.getItem("feedia.brand")??"null");e&&(a={...a,...e})}catch{}const c=e=>Object.entries(T).map(([n,o])=>`
    <button type="button" class="bb-palette-card ${JSON.stringify(o)===JSON.stringify(e)?"selected":""}" data-palette="${n}">
      <div class="bb-palette-swatches">${o.map(t=>`<div style="background:${t};"></div>`).join("")}</div>
      <div class="bb-palette-name">${n}</div>
    </button>`).join("");i.innerHTML=`
    <div class="bb-hero">
      <div style="font-size:36px;">\u{1F3A8}</div>
      <div>
        <h2 class="bb-name">${s(a.name)}</h2>
        <p class="bb-tagline">${s(a.tagline||"Defin\xED tu tagline para que FeedIA lo use en cada pieza.")}</p>
      </div>
      <button class="btn primary" id="bb-ai-suggest" style="margin-left:auto;">\u2728 Sugerir mejora con IA</button>
    </div>

    <div class="bb-tabs" id="bb-tabs">
      <button class="bb-tab active" data-tab="identity">\u{1F4DB} Identidad</button>
      <button class="bb-tab" data-tab="palette">\u{1F3A8} Paleta</button>
      <button class="bb-tab" data-tab="typography">\u{1F524} Tipograf\xEDa</button>
      <button class="bb-tab" data-tab="voice">\u{1F5E3}\uFE0F Voz</button>
      <button class="bb-tab" data-tab="preview">\u{1F441}\uFE0F Preview</button>
    </div>

    <div class="bb-panel" data-panel="identity">
      <div class="card">
        <h3>Identidad de marca</h3>
        <div class="bb-form">
          <label class="form-label">Nombre</label>
          <input id="bb-name" class="input" value="${s(a.name)}" placeholder="Tu marca">
          <label class="form-label" style="margin-top:10px;">Nicho / Industria</label>
          <input id="bb-niche" class="input" value="${s(a.niche||"")}" placeholder="Ej: emprendimiento, fitness, marketing IA">
          <label class="form-label" style="margin-top:10px;">Tagline (frase memorable)</label>
          <input id="bb-tagline" class="input" value="${s(a.tagline||"")}" placeholder="Ej: 'Automatizaci\xF3n con alma'">
          <label class="form-label" style="margin-top:10px;">Misi\xF3n</label>
          <textarea id="bb-mission" class="input" rows="3" placeholder="\xBFQu\xE9 resolv\xE9s y para qui\xE9n?">${s(a.mission||"")}</textarea>
          <label class="form-label" style="margin-top:10px;">Valores (separados por coma)</label>
          <input id="bb-values" class="input" value="${s(a.values||"")}" placeholder="Honestidad, claridad, velocidad">
          <label class="form-label" style="margin-top:10px;">Mood (energ\xEDa visual)</label>
          <input id="bb-mood" class="input" value="${s(a.mood||"")}" placeholder="Ej: en\xE9rgico, sereno, t\xE9cnico, c\xE1lido">
        </div>
      </div>
    </div>

    <div class="bb-panel" data-panel="palette" hidden>
      <div class="card">
        <h3>Paleta de colores</h3>
        <p class="small muted" style="margin:4px 0 14px;">Eleg\xED una paleta base. FeedIA la usar\xE1 en todos los dise\xF1os generados.</p>
        <div class="bb-palette-grid">${c(a.palette)}</div>
        <div style="margin-top:18px;">
          <label class="form-label">Colores personalizados (HEX, separados por coma)</label>
          <input id="bb-custom-palette" class="input" placeholder="#FF0080, #6366F1, #FBBF24" value="${s((a.palette||[]).join(", "))}">
          <div class="bb-current-palette" id="bb-current-palette">
            ${(a.palette||[]).map(e=>`<div class="bb-swatch-big" style="background:${s(e)};" title="${s(e)}"><span>${s(e)}</span></div>`).join("")}
          </div>
        </div>
      </div>
    </div>

    <div class="bb-panel" data-panel="typography" hidden>
      <div class="card">
        <h3>Tipograf\xEDa</h3>
        <p class="small muted" style="margin:4px 0 14px;">Hasta 2 familias: una para t\xEDtulos (display) y otra para cuerpo.</p>
        <div class="bb-fonts-grid">
          ${R.map(e=>`
            <button type="button" class="bb-font ${(a.typography||[]).includes(e)?"selected":""}" data-font="${s(e)}">
              <div class="bb-font-sample" style="font-family:'${s(e)}', sans-serif;">${s(e)}</div>
              <div class="bb-font-name">${s(e)}</div>
            </button>`).join("")}
        </div>
      </div>
    </div>

    <div class="bb-panel" data-panel="voice" hidden>
      <div class="card">
        <h3>Voz de marca</h3>
        <p class="small muted" style="margin:4px 0 14px;">C\xF3mo se "siente" la marca cuando escribe. L\xEDa respeta esto en cada caption.</p>
        <div class="bb-tones">
          ${O.map(e=>`
            <button type="button" class="bb-tone ${(a.voiceTone||[]).includes(e)?"selected":""}" data-tone="${s(e)}">${s(e)}</button>`).join("")}
        </div>
        <label class="form-label" style="margin-top:16px;">Palabras prohibidas (separadas por coma)</label>
        <input id="bb-forbidden" class="input" value="${s((a.forbidden||[]).join(", "))}" placeholder="Ej: barato, urgente, \xFAltimo">
      </div>
    </div>

    <div class="bb-panel" data-panel="preview" hidden>
      <div class="card">
        <h3>Preview de marca aplicada</h3>
        <p class="small muted">As\xED se ve tu marca en una pieza ejemplo.</p>
        <div class="bb-preview" id="bb-preview">
          <div class="bb-preview-card" style="background:linear-gradient(135deg, ${(a.palette||["#000"])[0]}, ${(a.palette||["#000","#000"])[1]});">
            <div class="bb-preview-title" style="font-family:'${s((a.typography||["Inter"])[0])}', sans-serif;">${s(a.name)}</div>
            <div class="bb-preview-tag" style="font-family:'${s((a.typography||["Inter"])[1]||(a.typography||["Inter"])[0])}', sans-serif;">${s(a.tagline||"Tu tagline ac\xE1")}</div>
            <div class="bb-preview-tone">${(a.voiceTone||[]).slice(0,3).map(e=>`<span>${s(e)}</span>`).join("")}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bb-actions">
      <button class="btn primary" id="bb-save">\u{1F4BE} Guardar branding</button>
      <button class="btn ghost" id="bb-reset">\u{1F504} Restaurar default</button>
    </div>

    <style>
      .bb-hero{display:flex;align-items:center;gap:16px;padding:18px;background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(168,85,247,.06));border:1px solid rgba(168,85,247,.3);border-radius:14px;margin-bottom:16px;flex-wrap:wrap;}
      .bb-name{margin:0;font-size:24px;font-weight:800;}
      .bb-tagline{margin:4px 0 0;font-size:13px;color:var(--text-muted,#9CA3AF);}
      .bb-tabs{display:flex;gap:4px;padding:4px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;overflow-x:auto;}
      .bb-tab{flex-shrink:0;padding:8px 14px;border-radius:7px;border:0;background:transparent;color:var(--text-muted,#9CA3AF);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;}
      .bb-tab.active{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;}
      .bb-form{display:flex;flex-direction:column;}
      .bb-palette-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;}
      .bb-palette-card{background:var(--bg-elev,#1c1c22);border:2px solid var(--border);border-radius:10px;padding:8px;cursor:pointer;color:inherit;}
      .bb-palette-card:hover{border-color:rgba(168,85,247,.5);}
      .bb-palette-card.selected{border-color:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,.18);}
      .bb-palette-swatches{display:flex;gap:3px;height:36px;margin-bottom:6px;border-radius:6px;overflow:hidden;}
      .bb-palette-swatches div{flex:1;}
      .bb-palette-name{font-size:11px;text-transform:capitalize;font-weight:600;}
      .bb-current-palette{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
      .bb-swatch-big{width:80px;height:60px;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;padding:4px;}
      .bb-swatch-big span{background:rgba(0,0,0,.5);color:#fff;font-size:10px;padding:2px 5px;border-radius:4px;font-family:monospace;}
      .bb-fonts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
      .bb-font{background:var(--bg-elev,#1c1c22);border:2px solid var(--border);border-radius:10px;padding:14px;cursor:pointer;color:inherit;text-align:center;}
      .bb-font:hover{border-color:rgba(168,85,247,.5);}
      .bb-font.selected{border-color:#a855f7;}
      .bb-font-sample{font-size:22px;font-weight:700;margin-bottom:6px;}
      .bb-font-name{font-size:11px;color:var(--text-muted,#9CA3AF);}
      .bb-tones{display:flex;flex-wrap:wrap;gap:8px;}
      .bb-tone{padding:8px 16px;border-radius:999px;border:1px solid var(--border);background:var(--bg-elev,#1c1c22);color:var(--fg,#fff);cursor:pointer;font-size:13px;}
      .bb-tone:hover{border-color:rgba(168,85,247,.5);}
      .bb-tone.selected{background:linear-gradient(135deg,#6366f1,#a855f7);border-color:transparent;color:#fff;}
      .bb-preview{padding:24px;background:var(--bg-elev,#1c1c22);border-radius:12px;display:flex;justify-content:center;}
      .bb-preview-card{width:280px;height:280px;border-radius:18px;padding:24px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:#fff;}
      .bb-preview-title{font-size:28px;font-weight:800;margin-bottom:8px;}
      .bb-preview-tag{font-size:14px;opacity:.9;margin-bottom:16px;}
      .bb-preview-tone{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;}
      .bb-preview-tone span{font-size:10px;background:rgba(0,0,0,.3);padding:3px 8px;border-radius:999px;}
      .bb-actions{display:flex;gap:10px;margin-top:18px;}
    </style>
  `,i.querySelectorAll(".bb-tab").forEach(e=>{e.addEventListener("click",()=>{const n=e.dataset.tab;i.querySelectorAll(".bb-tab").forEach(o=>o.classList.toggle("active",o===e)),i.querySelectorAll(".bb-panel").forEach(o=>o.hidden=o.dataset.panel!==n)})}),i.querySelectorAll(".bb-palette-card").forEach(e=>{e.addEventListener("click",()=>{i.querySelectorAll(".bb-palette-card").forEach(p=>p.classList.toggle("selected",p===e));const n=T[e.dataset.palette];a.palette=n;const o=i.querySelector("#bb-custom-palette"),t=i.querySelector("#bb-current-palette");o&&(o.value=n.join(", ")),t&&(t.innerHTML=n.map(p=>`<div class="bb-swatch-big" style="background:${s(p)};"><span>${s(p)}</span></div>`).join(""))})}),i.querySelectorAll(".bb-font").forEach(e=>{e.addEventListener("click",()=>{e.classList.toggle("selected"),[...i.querySelectorAll(".bb-font.selected")].map(o=>o.dataset.font).length>2&&e.classList.remove("selected")})}),i.querySelectorAll(".bb-tone").forEach(e=>{e.addEventListener("click",()=>e.classList.toggle("selected"))}),i.querySelector("#bb-save")?.addEventListener("click",async()=>{const e=i.querySelector("#bb-custom-palette")?.value.trim(),n=e?e.split(",").map(t=>t.trim()).filter(Boolean):a.palette,o={name:i.querySelector("#bb-name").value.trim()||"Mi Marca",niche:i.querySelector("#bb-niche").value.trim(),tagline:i.querySelector("#bb-tagline").value.trim(),mission:i.querySelector("#bb-mission").value.trim(),values:i.querySelector("#bb-values").value.trim(),mood:i.querySelector("#bb-mood").value.trim(),palette:n,typography:[...i.querySelectorAll(".bb-font.selected")].map(t=>t.dataset.font),voiceTone:[...i.querySelectorAll(".bb-tone.selected")].map(t=>t.dataset.tone),forbidden:(i.querySelector("#bb-forbidden").value||"").split(",").map(t=>t.trim()).filter(Boolean)};try{localStorage.setItem("feedia.brand",JSON.stringify(o))}catch{}try{await x("/api/moodboard",{method:"PUT",body:o}),g("\u{1F4BE} Branding guardado","ok")}catch{g("Guardado localmente. Sincroniz\xE1 cuando el backend vuelva.","warn")}}),i.querySelector("#bb-reset")?.addEventListener("click",()=>{try{localStorage.removeItem("feedia.brand")}catch{}g("Restaurado a default. Recarg\xE1 la vista.","info")}),i.querySelector("#bb-ai-suggest")?.addEventListener("click",async e=>{const n=e.currentTarget;n.disabled=!0,n.innerHTML='<span class="spinner"></span> generando\u2026';try{const o=await x("/api/moodboard/ai-suggest",{method:"POST",body:{}});o?.tagline&&(i.querySelector("#bb-tagline").value=o.tagline),o?.mission&&(i.querySelector("#bb-mission").value=o.mission),o?.values&&(i.querySelector("#bb-values").value=o.values),g("\u2728 Sugerencia generada \u2014 revis\xE1 y guard\xE1 si te gusta","ok")}catch{g("Backend offline \u2014 no se puede generar ahora","warn")}finally{n.disabled=!1,n.innerHTML="\u2728 Sugerir mejora con IA"}})},renderReportes=async l=>{const i=h(l,"\u{1F4CA} Reportes","Resumen ejecutivo del sistema. Imprim\xED o export\xE1 a PDF.","rp-body");try{const a=await x("/api/report");i.innerHTML=`
      <div class="btn-row" style="margin-bottom:14px;"><button class="btn primary" id="rp-print">\u{1F5A8} Imprimir / PDF</button></div>
      <div class="card report-sheet" id="rp-sheet">
        <h2 style="margin:0 0 4px;">${s(a.brand)} \u2014 Reporte FeedIA</h2>
        <div class="small muted" style="margin-bottom:18px;">Generado: ${new Date(a.generatedAt).toLocaleString("es-AR")}</div>
        <h3>Directivas</h3>
        <p class="small">Total: <strong>${a.directives.total}</strong> \xB7 Activas: <strong>${a.directives.active}</strong></p>
        <h3>Ejecuciones</h3>
        <p class="small">Total: <strong>${a.runs.total}</strong> \xB7 OK: <strong style="color:var(--ok)">${a.runs.ok}</strong> \xB7 En revisi\xF3n: <strong style="color:var(--warn)">${a.runs.partial}</strong> \xB7 Fallidas: <strong style="color:var(--crit)">${a.runs.failed}</strong></p>
        <h3>Decisiones aut\xF3nomas</h3>
        <p class="small">Total: <strong>${a.decisions.totalTraces}</strong> \xB7 Con resultado medido: <strong>${a.decisions.withOutcomes}</strong> \xB7 Tasa de acierto: <strong>${(a.decisions.successRate*100).toFixed(0)}%</strong> \xB7 Score promedio: <strong>${a.decisions.avgChosenScore}</strong></p>
        <h3>Estado operativo</h3>
        <p class="small">Aprobaciones pendientes: <strong>${a.approvalsPending}</strong> \xB7 Crisis: <strong>${a.crisisActive?"\u26A0\uFE0F activa":"\u2705 ninguna"}</strong></p>
      </div>`,i.querySelector("#rp-print").addEventListener("click",()=>window.print())}catch(a){i.innerHTML=`<div class="alert crit">Error: ${s(a.message)}</div>`}},renderSimulador=async l=>{const i=h(l,"\u{1F52E} Simulador","Prob\xE1 una directiva y mir\xE1 la proyecci\xF3n antes de activarla.","sm-body");i.innerHTML=`
    <style>
      .sm-panel{background:#fff;border:1px solid #E3E6EB;border-radius:16px;padding:18px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);margin-bottom:14px;}
      .sm-input{width:100%;box-sizing:border-box;background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:12px;padding:12px 14px;font-size:15px;font-family:inherit;outline:none;}
      .sm-input:focus{border-color:#9da9ff;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      .sm-btn{border:0;border-radius:999px;padding:12px 22px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#7C3AED,#6366F1);color:#fff;}
      .sm-hero{background:linear-gradient(135deg,rgba(124,58,237,.10),rgba(99,102,241,.05));border:1px solid rgba(124,58,237,.25);}
      .sm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:14px;}
      .sm-kpi{background:#F7F8FB;border:1px solid #E6E8EE;border-radius:12px;padding:12px;}
      .sm-kpi-num{font-size:28px;font-weight:800;color:#15181E;line-height:1;}
      .sm-kpi-lbl{font-size:11px;font-weight:600;color:#667085;text-transform:uppercase;letter-spacing:.04em;margin-top:6px;}
      .sm-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;}
      .sm-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
      .sm-scen{background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:14px;border-top:3px solid var(--c,#6366F1);}
      .sm-scen-title{font-weight:800;color:#15181E;font-size:14px;}
      .sm-scen-x{font-size:24px;font-weight:800;color:var(--c,#6366F1);margin:6px 0;}
      .sm-list{margin:0;padding:0;list-style:none;}
      .sm-list li{display:flex;gap:8px;font-size:13px;color:#344054;line-height:1.5;padding:6px 0;border-top:1px solid #EEF0F4;}
      .sm-list li:first-child{border-top:0;}
      .sm-svg{width:100%;height:180px;display:block;}
      .sm-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#475067;margin-top:8px;}
      .sm-legend-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:middle;}
      /* \u{1F4FA} Pantalla de simulaci\xF3n */
      .sm-screen{background:#0F1115;border:1px solid #2A2E36;border-radius:18px;padding:0;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.04);margin-bottom:14px;}
      .sm-screen-bar{display:flex;align-items:center;gap:10px;padding:11px 16px;background:linear-gradient(180deg,#1A1D26,#13161D);border-bottom:1px solid #2A2E36;color:#E8E9EC;}
      .sm-screen-dots{display:flex;gap:5px;}
      .sm-screen-dots i{width:9px;height:9px;border-radius:50%;display:block;}
      .sm-screen-dots i:nth-child(1){background:#FF5F57;}
      .sm-screen-dots i:nth-child(2){background:#FEBC2E;}
      .sm-screen-dots i:nth-child(3){background:#28C840;}
      .sm-screen-title{font-size:13px;font-weight:700;color:#E8E9EC;letter-spacing:.02em;}
      .sm-screen-live{font-size:10px;font-weight:800;color:#10B981;background:rgba(16,185,129,.12);padding:3px 8px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;}
      .sm-screen-live::before{content:'';width:6px;height:6px;border-radius:50%;background:#10B981;animation:smPulse 1.4s ease-in-out infinite;}
      @keyframes smPulse{0%,100%{opacity:1;}50%{opacity:.3;}}
      .sm-screen-body{padding:18px;background:#fff;}
      .sm-replay{border:0;border-radius:999px;padding:7px 14px;background:linear-gradient(135deg,#7C3AED,#6366F1);color:#fff;font-weight:700;font-size:12px;cursor:pointer;margin-left:auto;}
      .sm-replay:disabled{opacity:.6;cursor:wait;}
      .sm-svg path{stroke-linecap:round;stroke-linejoin:round;}
    </style>
    <div class="sm-panel">
      <h3 style="margin:0 0 6px;color:#15181E;">\xBFQu\xE9 pasar\xEDa si le digo a FeedIA\u2026?</h3>
      <p style="color:#667085;font-size:13px;margin:0 0 10px;">Escrib\xED la directiva y FeedIA proyecta 12 semanas con escenarios, riesgos y recomendaciones.</p>
      <textarea class="sm-input" id="sm-in" rows="2" placeholder='Ej: "Sub\xED 2 carruseles por d\xEDa sobre IA"'></textarea>
      <button class="sm-btn" id="sm-go" style="margin-top:10px;">\u{1F52E} Simular</button>
      <div id="sm-out" style="margin-top:14px;"></div>
    </div>`;const a=e=>{if(!Array.isArray(e)||!e.length)return"";const n=e.map(d=>d.alcance||0),o=e.map(d=>d.engagement||0),t=e.map(d=>d.seguidores||0),p=Math.max(...n,...o,...t,100)*1.1,b=560,u=140,r=18,v=(d,y)=>r+d*(b-r*2)/(y-1),m=d=>u-r-d/p*(u-r*2),f=d=>d.map((y,w)=>`${w===0?"M":"L"}${v(w,d.length).toFixed(1)},${m(y).toFixed(1)}`).join(" "),k=f(n),F=`${k} L${v(n.length-1,n.length).toFixed(1)},${u-r} L${r},${u-r} Z`;return`<svg class="sm-svg" viewBox="0 0 ${b} ${u}" preserveAspectRatio="none">
      <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7C3AED" stop-opacity=".25"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/></linearGradient></defs>
      ${[0,.25,.5,.75,1].map(d=>`<line x1="${r}" x2="${b-r}" y1="${(r+d*(u-r*2)).toFixed(1)}" y2="${(r+d*(u-r*2)).toFixed(1)}" stroke="#EEF0F4" stroke-width="1"/>`).join("")}
      <path d="${F}" fill="url(#gA)"/>
      <path d="${k}" stroke="#7C3AED" stroke-width="2.4" fill="none"/>
      <path d="${f(o)}" stroke="#10B981" stroke-width="2.2" fill="none"/>
      <path d="${f(t)}" stroke="#F59E0B" stroke-width="2.2" fill="none" stroke-dasharray="4 3"/>
      ${e.map((d,y)=>y%3===0?`<text x="${v(y,e.length).toFixed(1)}" y="${u-4}" font-size="10" fill="#98A1B3" text-anchor="middle">S${d.semana}</text>`:"").join("")}
    </svg>
    <div class="sm-legend">
      <span><span class="sm-legend-dot" style="background:#7C3AED;"></span>Alcance</span>
      <span><span class="sm-legend-dot" style="background:#10B981;"></span>Engagement</span>
      <span><span class="sm-legend-dot" style="background:#F59E0B;"></span>Seguidores</span>
    </div>`},c=["#10B981","#7C3AED","#F59E0B"];i.querySelector("#sm-go").addEventListener("click",async e=>{const n=i.querySelector("#sm-in").value.trim();if(!n){g("Escrib\xED una indicaci\xF3n","warn");return}await z(e.currentTarget,"simulando\u2026",async()=>{try{const o=await x("/api/simulate",{method:"POST",body:{instruction:n}}),t=o.projection||{},p={bajo:"#10B981",medio:"#F59E0B",alto:"#EF4444"}[t.esfuerzo]||"#6366F1",b={baja:"#94A3B8",media:"#6366F1",alta:"#FE2C55"}[t.viralidad]||"#6366F1";i.querySelector("#sm-out").innerHTML=`
          <div class="sm-panel sm-hero">
            <div style="font-size:13px;color:#475067;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">FeedIA entendi\xF3</div>
            <div style="font-size:17px;font-weight:700;color:#15181E;margin:4px 0 10px;">${s(o.understood||"\u2014")}</div>
            <div style="display:flex;gap:7px;flex-wrap:wrap;">
              <span class="sm-chip" style="background:rgba(99,102,241,.12);color:#6366F1;">\u2699\uFE0F ${s(o.action||"acci\xF3n")}</span>
              <span class="sm-chip" style="background:rgba(124,58,237,.12);color:#7C3AED;">\u{1F501} ${s(o.recurrence||"cadencia")}</span>
              ${t.autoPublish?'<span class="sm-chip" style="background:rgba(16,185,129,.14);color:#10B981;">\u{1F916} Auto-publica</span>':'<span class="sm-chip" style="background:rgba(245,158,11,.14);color:#F59E0B;">\u270B Requiere tu OK</span>'}
              ${t.esfuerzo?`<span class="sm-chip" style="background:${p}22;color:${p};">\u{1F4AA} Esfuerzo ${s(t.esfuerzo)}</span>`:""}
              ${t.viralidad?`<span class="sm-chip" style="background:${b}22;color:${b};">\u{1F680} Viralidad ${s(t.viralidad)}</span>`:""}
            </div>
            <div class="sm-kpis">
              <div class="sm-kpi"><div class="sm-kpi-num sm-tick" data-to="${t.perWeek??0}">0</div><div class="sm-kpi-lbl">por semana</div></div>
              <div class="sm-kpi"><div class="sm-kpi-num sm-tick" data-to="${t.perMonth??0}">0</div><div class="sm-kpi-lbl">por mes</div></div>
              <div class="sm-kpi"><div class="sm-kpi-num sm-tick" data-to="${(t.perMonth??0)*3}">0</div><div class="sm-kpi-lbl">90 d\xEDas</div></div>
              <div class="sm-kpi"><div class="sm-kpi-num">12s</div><div class="sm-kpi-lbl">proyecci\xF3n</div></div>
            </div>
            <p style="margin-top:12px;color:#475067;font-size:13px;line-height:1.5;">${s(t.estImpact||"")}</p>
          </div>

          <div class="sm-screen">
            <div class="sm-screen-bar">
              <span class="sm-screen-dots"><i></i><i></i><i></i></span>
              <span class="sm-screen-title">\u{1F4FA} Pantalla de simulaci\xF3n \xB7 12 semanas</span>
              <span class="sm-screen-live">EN VIVO</span>
              <button class="sm-replay" id="sm-replay">\u25B6 Reproducir</button>
            </div>
            <div class="sm-screen-body">
              ${a(o.trayectoria)}
            </div>
          </div>

          <div class="sm-grid2">
            ${(o.escenarios||[]).map((v,m)=>`
              <div class="sm-scen" style="--c:${c[m]||"#6366F1"};">
                <div class="sm-scen-title">${s(v.nombre||"Escenario")}</div>
                <div class="sm-scen-x">\xD7${(Number(v.alcanceX)||1).toFixed(1)}</div>
                <div style="font-size:13px;color:#475067;line-height:1.5;">${s(v.resumen||"")}</div>
              </div>`).join("")}
          </div>

          <div class="sm-grid2" style="margin-top:12px;">
            ${o.riesgos&&o.riesgos.length?`<div class="sm-panel" style="border-top:3px solid #EF4444;margin-bottom:0;">
              <strong style="color:#15181E;">\u26A0\uFE0F Riesgos</strong>
              <ul class="sm-list" style="margin-top:8px;">${o.riesgos.map(v=>`<li>\u26A0\uFE0F ${s(v)}</li>`).join("")}</ul>
            </div>`:""}
            ${o.recomendaciones&&o.recomendaciones.length?`<div class="sm-panel" style="border-top:3px solid #10B981;margin-bottom:0;">
              <strong style="color:#15181E;">\u2705 Recomendaciones</strong>
              <ul class="sm-list" style="margin-top:8px;">${o.recomendaciones.map(v=>`<li>\u2713 ${s(v)}</li>`).join("")}</ul>
            </div>`:""}
          </div>`;const u=()=>{i.querySelectorAll(".sm-svg path[stroke]").forEach(m=>{try{const f=m.getTotalLength();m.style.transition="none",m.style.strokeDasharray=f,m.style.strokeDashoffset=f,m.getBoundingClientRect(),m.style.transition="stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)",m.style.strokeDashoffset=0}catch{}}),i.querySelectorAll(".sm-tick").forEach(m=>{const f=Number(m.dataset.to)||0,k=performance.now(),F=1400,d=y=>{const w=Math.min(1,(y-k)/F),I=Math.round(f*(1-Math.pow(1-w,3)));m.textContent=String(I),w<1&&requestAnimationFrame(d)};requestAnimationFrame(d)})},r=i.querySelector("#sm-replay");r&&r.addEventListener("click",()=>{r.disabled=!0,u(),setTimeout(()=>{r.disabled=!1},1700)}),u()}catch(o){g("Error: "+o.message,"crit")}})})},renderCliente=async l=>{const i=h(l,"\u{1F454} Modo Cliente","Vista ejecutiva de solo lectura para mostrarle al due\xF1o de la marca.","cl-body");try{const[a,c]=await Promise.all([x("/api/client-view"),x("/api/brand-profiles")]),e=a.estado==="saludable"?"ok":"crit";i.innerHTML=`
      <div class="card" style="padding:22px;">
        <h2 style="margin:0 0 4px;">${s(a.brand)}</h2>
        <div class="small muted">${s(a.niche)} \xB7 al ${new Date(a.generatedAt).toLocaleDateString("es-AR")}</div>
        <div class="meta" style="margin-top:10px;"><span class="tag ${e}">${a.estado==="saludable"?"\u2705 Saludable":"\u26A0\uFE0F Requiere atenci\xF3n"}</span></div>
      </div>
      <div class="autopilot-stat-row" style="margin-top:16px;flex-wrap:wrap;">
        <div class="autopilot-stat"><div class="autopilot-stat-num">${a.contenidoActivo}</div><div class="autopilot-stat-label">l\xEDneas de contenido activas</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${a.piezasPublicadas}</div><div class="autopilot-stat-label">piezas publicadas</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${a.enRevision}</div><div class="autopilot-stat-label">en revisi\xF3n</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${a.pendientesDeTuOk}</div><div class="autopilot-stat-label">esperan tu OK</div></div>
      </div>
      <div class="card" style="margin-top:16px;">
        <h3 style="margin:0 0 8px;">Cuentas gestionadas <span class="tag accent tiny">multi-cuenta en caliente</span></h3>
        ${(c.profiles||[]).length?c.profiles.map(n=>`<div class="ws-row" style="padding:8px 0;align-items:center;">
              <div style="flex:1;min-width:0;"><strong>${s(n.name)}</strong>${n.niche?`<div class="tiny muted">${s(n.niche)}</div>`:""}</div>
              ${n.active?'<span class="tag ok tiny">activa</span>':`<button class="btn ghost tiny" data-activate="${s(n.file)}">Cambiar a esta \u2192</button>`}
            </div>`).join(""):'<div class="muted small">1 cuenta activa.</div>'}
        <p class="tiny muted" style="margin:10px 0 0;">${s(c.note||"")}</p>
      </div>
      <p class="tiny muted" style="margin-top:14px;">\u{1F512} Esta vista es de solo lectura. No expone agentes, decisiones internas ni arquitectura del sistema.</p>`,i.querySelectorAll("[data-activate]").forEach(n=>n.addEventListener("click",async o=>{let t;try{t=await x(`/api/brand-profiles/${encodeURIComponent(n.dataset.activate)}/preview`)}catch(b){g("Error al previsualizar: "+b.message,"crit");return}const p=`Vas a cambiar a:

  ${t.name}
  ${t.niche}

IMPACTO de la cuenta destino:
  \u2022 Directivas activas: ${t.impacto.directivasActivas}
  \u2022 Aprobaciones pendientes: ${t.impacto.aprobacionesPendientes}
  \u2022 Pizarras: ${t.impacto.pizarras}

${t.aviso}

\xBFConfirm\xE1s el cambio EN CALIENTE?`;confirm(p)&&await z(o.currentTarget,"cambiando\u2026",async()=>{try{const b=await x("/api/brand-profiles/activate",{method:"POST",body:{file:n.dataset.activate}});b.ok?(g(`Cuenta activa: ${b.brand.name}`,"ok"),await renderCliente(l)):g("Error: "+(b.error||"no se pudo activar"),"crit")}catch(b){g("Error: "+b.message,"crit")}})}))}catch(a){i.innerHTML=`<div class="alert crit">Error: ${s(a.message)}</div>`}};
