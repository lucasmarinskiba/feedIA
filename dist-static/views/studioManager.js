import{apiSafe as c}from"../lib/api.js";import{escape as n}from"../lib/dom.js";import{toast as p}from"../lib/toast.js";import{withBtnSpinner as l}from"../lib/ui.js";const f=e=>e<1e3?`${e}ms`:e<6e4?`${(e/1e3).toFixed(1)}s`:`${Math.round(e/6e4)}m`,m=(e,d="#3451d1")=>`<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${d}20;color:${d}">${n(e)}</span>`,h=e=>{const d={rising:["#22c55e","\u2191 subiendo"],peak:["#f59e0b","\u26A1 pico"],declining:["#ef4444","\u2193 bajando"]},[o,s]=d[e]??["#6b7280",e];return m(s,o)},w=e=>m(e,{alta:"#22c55e",media:"#f59e0b",baja:"#6b7280"}[e]??"#6b7280"),A=e=>{navigator.clipboard.writeText(e).then(()=>p("Copiado \u2713","success")).catch(()=>p("Error al copiar","error"))},I=(e,d,o,s,t,a=!1)=>`
  <div class="sm-card" id="sm-card-${e}">
    <button class="sm-card-header" onclick="document.getElementById('sm-body-${e}').classList.toggle('hidden');this.querySelector('.sm-chevron').classList.toggle('rotated')">
      <span>${d} <strong>${n(o)}</strong> ${s}</span>
      <span class="sm-chevron${a?" rotated":""}">\u25BE</span>
    </button>
    <div id="sm-body-${e}" class="${a?"":"hidden"}">${t}</div>
  </div>`,$=()=>{if(document.getElementById("sm-styles"))return;const e=document.createElement("style");e.id="sm-styles",e.textContent=`
    .sm-wrap { display:flex; flex-direction:column; gap:16px; padding:24px; max-width:960px; margin:0 auto; }
    .sm-topbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .sm-topbar h1 { font-size:22px; font-weight:700; margin:0; flex:1; }
    .sm-tabs { display:flex; gap:6px; flex-wrap:wrap; }
    .sm-tab { padding:6px 14px; border-radius:20px; font-size:13px; cursor:pointer; border:1px solid var(--border,#e2e8f0); background:transparent; transition:all .15s; }
    .sm-tab.active { background:#3451d1; color:#fff; border-color:#3451d1; }
    .sm-panel { display:none; flex-direction:column; gap:12px; }
    .sm-panel.visible { display:flex; }
    .sm-card { border:1px solid var(--border,#e2e8f0); border-radius:12px; overflow:hidden; background:var(--surface,#fff); }
    .sm-card-header { width:100%; text-align:left; padding:14px 16px; background:none; border:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-size:14px; }
    .sm-card-header:hover { background:var(--hover,#f8fafc); }
    .sm-chevron { transition:transform .2s; display:inline-block; }
    .sm-chevron.rotated { transform:rotate(180deg); }
    .sm-body { padding:16px; border-top:1px solid var(--border,#e2e8f0); display:flex; flex-direction:column; gap:10px; }
    #sm-body-masterrun { padding:16px; border-top:1px solid var(--border,#e2e8f0); }
    .sm-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .sm-stat { background:var(--hover,#f8fafc); border-radius:8px; padding:8px 12px; font-size:13px; }
    .sm-stat strong { display:block; font-size:18px; }
    .sm-stat-row { display:flex; gap:8px; flex-wrap:wrap; }
    .sm-step { display:flex; gap:8px; padding:8px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-step:last-child { border:none; }
    .sm-step-emoji { font-size:18px; flex-shrink:0; }
    .sm-step-body { flex:1; min-width:0; }
    .sm-step-phase { font-weight:600; }
    .sm-step-out { color:var(--text-muted,#64748b); margin-top:2px; }
    .sm-step-dur { font-size:11px; color:var(--text-muted,#64748b); }
    .sm-trend-item { display:flex; flex-direction:column; gap:4px; padding:10px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-trend-item:last-child { border:none; }
    .sm-trend-name { font-weight:600; }
    .sm-trend-desc { color:var(--text-muted,#64748b); }
    .sm-trend-meta { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .sm-insight { padding:10px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-insight:last-child { border:none; }
    .sm-insight-title { font-weight:600; }
    .sm-insight-desc { color:var(--text-muted,#64748b); margin:2px 0; }
    .sm-insight-rec { font-style:italic; font-size:12px; color:#3451d1; }
    .sm-ab-item { display:flex; gap:8px; align-items:center; padding:8px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-ab-item:last-child { border:none; }
    .sm-q-item { display:flex; gap:8px; align-items:flex-start; padding:8px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-q-item:last-child { border:none; }
    .sm-q-status { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px; }
    .sm-q-status.scheduled { background:#f59e0b; }
    .sm-q-status.pending { background:#94a3b8; }
    .sm-q-status.published { background:#22c55e; }
    .sm-q-status.failed { background:#ef4444; }
    .sm-input { width:100%; padding:8px 12px; border:1px solid var(--border,#e2e8f0); border-radius:8px; font-size:13px; background:var(--surface,#fff); color:inherit; }
    .sm-select { padding:7px 10px; border:1px solid var(--border,#e2e8f0); border-radius:8px; font-size:13px; background:var(--surface,#fff); color:inherit; }
    .sm-btn { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; background:#3451d1; color:#fff; transition:opacity .15s; }
    .sm-btn:hover { opacity:.85; }
    .sm-btn.secondary { background:var(--hover,#f1f5f9); color:var(--text,#1e293b); border:1px solid var(--border,#e2e8f0); }
    .sm-btn.danger { background:#ef4444; }
    .sm-btn.success { background:#22c55e; }
    .sm-score-bar { height:6px; border-radius:3px; background:#e2e8f0; overflow:hidden; }
    .sm-score-fill { height:100%; border-radius:3px; background:#3451d1; transition:width .4s; }
    .sm-tag { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:500; background:#e2e8f0; color:#374151; margin:2px; }
    .sm-tag.purple { background:#7c3aed20; color:#7c3aed; }
    .sm-tag.blue { background:#3451d120; color:#3451d1; }
    .sm-tag.gray { background:#6b728020; color:#6b7280; }
    .sm-empty { text-align:center; padding:32px; color:var(--text-muted,#64748b); font-size:14px; }
    .hidden { display:none !important; }
  `,document.head.appendChild(e)},S=e=>{const d=e.querySelector("#sm-panel-brain");d&&(d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">
        \u{1F9E0} <strong>Master Brain</strong> \u2014 Orquestador unificado de Computer Use
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
        <div class="sm-row">
          <select id="sm-mb-intent" class="sm-select">
            <option value="create-content">\u270D\uFE0F Crear contenido</option>
            <option value="build-brand">\u{1F3DB}\uFE0F Construir marca</option>
            <option value="evolve-brand">\u{1F504} Evolucionar marca</option>
            <option value="analyze" selected>\u{1F50D} An\xE1lisis completo</option>
            <option value="publish">\u{1F4E4} Publicar</option>
            <option value="full-takeover">\u{1F916} Full Takeover (autopilot)</option>
            <option value="manage-dms">\u{1F4AC} Gestionar DMs</option>
            <option value="manage-comments">\u{1F4A1} Gestionar comentarios</option>
            <option value="optimize-hashtags">#\uFE0F\u20E3 Optimizar hashtags</option>
            <option value="schedule-queue">\u{1F4C5} Programar cola</option>
            <option value="generate-captions">\u270D\uFE0F Generar captions</option>
            <option value="detect-trends">\u{1F4C8} Detectar tendencias</option>
            <option value="analyze-competitors">\u{1F50D} Analizar competidores</option>
            <option value="ab-test">\u{1F9EA} A/B Test</option>
          </select>
          <select id="sm-mb-mode" class="sm-select">
            <option value="supervisor">\u{1F464} Supervisor</option>
            <option value="autopilot">\u{1F916} Autopilot</option>
            <option value="observer">\u{1F441}\uFE0F Observer</option>
          </select>
          <select id="sm-mb-format" class="sm-select">
            <option value="carousel">Carrusel</option>
            <option value="reel">Reel</option>
            <option value="story">Historia</option>
            <option value="post">Post</option>
          </select>
        </div>
        <input id="sm-mb-topic" class="sm-input" placeholder="Tema / instrucci\xF3n (ej: 'recetas r\xE1pidas para mam\xE1s ocupadas')" />
        <div class="sm-row">
          <button class="sm-btn" id="sm-mb-run">\u26A1 Ejecutar Master Brain</button>
          <button class="sm-btn secondary" id="sm-mb-list">\u{1F4CB} Ver cerebros disponibles</button>
        </div>
        <div id="sm-mb-result" style="display:none;"></div>
      </div>
    </div>`,e.querySelector("#sm-mb-run").addEventListener("click",async o=>{const s=o.currentTarget,t=e.querySelector("#sm-mb-intent").value,a=e.querySelector("#sm-mb-mode").value,i=e.querySelector("#sm-mb-format").value,r=e.querySelector("#sm-mb-topic").value.trim(),u=e.querySelector("#sm-mb-result");await l(s,async()=>{const b=await c("/api/cu/master-brain","POST",{intent:t,mode:a,contentFormat:i,userInput:r||t,topic:r});if(u.style.display="block",!b.ok){u.innerHTML=`<p style="color:#ef4444">Error: ${n(b.error??"desconocido")}</p>`;return}const{steps:g=[],brainsActivated:x=[],finalOutput:y}=b;u.innerHTML=`
        <div class="sm-stat-row" style="margin-bottom:12px">
          <div class="sm-stat"><strong>${x.length}</strong>Cerebros activados</div>
          <div class="sm-stat"><strong>${g.length}</strong>Pasos ejecutados</div>
          <div class="sm-stat"><strong>${y?.deliverables?.length??0}</strong>Entregables</div>
        </div>
        <div class="sm-score-bar" style="margin-bottom:12px"><div class="sm-score-fill" style="width:${Math.min(x.length*8,100)}%"></div></div>
        ${g.map(v=>`
          <div class="sm-step">
            <div class="sm-step-emoji">${n(v.emoji)}</div>
            <div class="sm-step-body">
              <div class="sm-step-phase">${n(v.brainLabel)} \xB7 ${n(v.phase)}</div>
              <div class="sm-step-out">${n(v.output)}</div>
              <div class="sm-step-dur">${f(v.durationMs)}</div>
            </div>
          </div>`).join("")}
        ${y?.nextActions?.length?`<div class="sm-row" style="margin-top:8px">${y.nextActions.map(v=>`<button class="sm-btn secondary" onclick="toast('${n(v.apiCall??v.route??"")}','info')">${n(v.label)}</button>`).join("")}</div>`:""}`,p("Master Brain ejecutado \u2713","success")})}),e.querySelector("#sm-mb-list").addEventListener("click",async o=>{const s=o.currentTarget;await l(s,async()=>{const t=await c("/api/cu/master-brain/brains"),a=e.querySelector("#sm-mb-result");if(a.style.display="block",!t.ok||!t.brains){a.innerHTML='<p style="color:#ef4444">No se pudo cargar</p>';return}a.innerHTML=t.brains.map(i=>`
        <div class="sm-row" style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0)">
          <span>${n(i.emoji)}</span>
          <span style="font-weight:600;font-size:13px">${n(i.label)}</span>
          ${m(i.isAvailable?"disponible":"inactivo",i.isAvailable?"#22c55e":"#ef4444")}
          <span style="font-size:12px;color:var(--text-muted,#64748b);flex:1">${n(i.description)}</span>
        </div>`).join("")})}))},T=async e=>{const d=e.querySelector("#sm-panel-queue");if(!d)return;d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">\u{1F4C5} <strong>Content Queue</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-q-load">\u{1F504} Cargar cola</button>
          <button class="sm-btn secondary" id="sm-q-windows">\u23F0 Ver ventanas prime</button>
          <button class="sm-btn secondary" id="sm-q-next">\u25B6\uFE0F Procesar siguiente</button>
        </div>
        <div id="sm-q-list"><div class="sm-empty">Carg\xE1 la cola para ver el contenido programado</div></div>
      </div>
    </div>`;const o=s=>{const t=e.querySelector("#sm-q-list");if(!s?.length){t.innerHTML='<div class="sm-empty">Cola vac\xEDa \u2014 no hay contenido programado</div>';return}t.innerHTML=s.map(a=>`
      <div class="sm-q-item">
        <div class="sm-q-status ${n(a.status??"pending")}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${n(a.contentType??"post")} \xB7 ${n(a.topic??"\u2014")}</div>
          <div style="font-size:12px;color:var(--text-muted,#64748b)">${a.scheduledFor?new Date(a.scheduledFor).toLocaleString("es-AR"):"Sin fecha"} \xB7 ${m(a.status??"pending")}</div>
        </div>
        <button class="sm-btn secondary" style="padding:4px 10px;font-size:11px" onclick="api('/api/queue/${n(a.id)}','DELETE').then(()=>toast('Eliminado','success'))">\u2715</button>
      </div>`).join("")};e.querySelector("#sm-q-load").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/queue");o(t.items??t.queue??[])})}),e.querySelector("#sm-q-windows").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/queue/windows","POST"),a=e.querySelector("#sm-q-list"),i=["Dom","Lun","Mar","Mi\xE9","Jue","Vie","S\xE1b"],r=t.windows??t??[];a.innerHTML='<div style="font-weight:600;font-size:13px;margin-bottom:8px">\u{1F550} Ventanas de publicaci\xF3n \xF3ptimas</div>'+r.slice(0,12).map(u=>`
          <div class="sm-row" style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
            <span style="font-weight:600;width:40px">${i[u.dayOfWeek]??"?"}</span>
            <span>${String(u.hour).padStart(2,"0")}:00hs</span>
            ${m(u.quality,u.quality==="prime"?"#22c55e":u.quality==="good"?"#f59e0b":"#6b7280")}
            <span style="font-size:12px;color:var(--text-muted,#64748b)">${n(u.reason??"")}</span>
          </div>`).join("")})}),e.querySelector("#sm-q-next").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/queue/process-next","POST");p(t.message??(t.processed?"Procesado \u2713":"Nada pendiente"),t.processed?"success":"info")})})},q=async e=>{const d=e.querySelector("#sm-panel-ab");d&&(d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">\u{1F9EA} <strong>A/B Tests</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-ab-load">\u{1F504} Cargar tests</button>
          <button class="sm-btn secondary" id="sm-ab-suggest">\u{1F4A1} Sugerir pr\xF3ximo test</button>
        </div>
        <div style="display:flex;gap:8px">
          <input id="sm-ab-topic" class="sm-input" placeholder="Tema del test (ej: 'caption de reel de recetas')" style="flex:1" />
          <button class="sm-btn" id="sm-ab-create">+ Crear test</button>
        </div>
        <div id="sm-ab-list"><div class="sm-empty">Carg\xE1 los tests para verlos</div></div>
      </div>
    </div>`,e.querySelector("#sm-ab-load").addEventListener("click",async o=>{await l(o.currentTarget,async()=>{const s=await c("/api/ab-tests"),t=e.querySelector("#sm-ab-list"),a=s.tests??s??[];if(!a.length){t.innerHTML='<div class="sm-empty">Sin tests \u2014 cre\xE1 el primero</div>';return}t.innerHTML=a.map(i=>`
        <div class="sm-ab-item">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${n(i.name??i.id)}</div>
            <div style="font-size:12px;color:var(--text-muted,#64748b)">${i.variants?.length??0} variantes \xB7 ${m(i.status??"running")}</div>
          </div>
          <button class="sm-btn secondary" style="padding:4px 10px;font-size:11px"
            onclick="apiSafe('/api/ab-tests/${n(i.id)}/evaluate','POST').then(r=>toast(r.winner?'Ganador: '+r.winner:'Sin ganador a\xFAn','info'))">
            \u{1F4CA} Evaluar
          </button>
        </div>`).join("")})}),e.querySelector("#sm-ab-create").addEventListener("click",async o=>{const s=e.querySelector("#sm-ab-topic").value.trim();if(!s){p("Escrib\xED un tema para el test","warn");return}await l(o.currentTarget,async()=>{const t=await c("/api/ab-tests","POST",{name:s,topic:s});t.id?p(`Test creado: ${t.id}`,"success"):p("Error al crear test","error")})}),e.querySelector("#sm-ab-suggest").addEventListener("click",async o=>{await l(o.currentTarget,async()=>{const s=await c("/api/ab-tests/suggest-next","POST"),t=e.querySelector("#sm-ab-list");s.suggestion&&(t.innerHTML=`<div style="padding:12px;background:var(--hover,#f8fafc);border-radius:8px;font-size:13px">
          <div style="font-weight:600;margin-bottom:4px">\u{1F4A1} Test sugerido: ${n(s.suggestion.name??"\u2014")}</div>
          <div style="color:var(--text-muted,#64748b)">${n(s.suggestion.rationale??"")}</div>
        </div>`)})}))},z=async e=>{const d=e.querySelector("#sm-panel-dm");d&&(d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">\u{1F4AC} <strong>DM Intelligence</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-dm-load">\u{1F504} Cargar conversaciones</button>
          <button class="sm-btn secondary" id="sm-dm-templates">\u{1F916} Generar auto-respuestas</button>
        </div>
        <div style="display:flex;gap:8px">
          <input id="sm-dm-text" class="sm-input" placeholder="Texto de un DM para clasificar..." style="flex:1" />
          <button class="sm-btn secondary" id="sm-dm-classify">\u{1F50D} Clasificar</button>
        </div>
        <div id="sm-dm-result"><div class="sm-empty">Carg\xE1 conversaciones o clasific\xE1 un DM</div></div>
      </div>
    </div>`,e.querySelector("#sm-dm-load").addEventListener("click",async o=>{await l(o.currentTarget,async()=>{const s=await c("/api/dm/conversations"),t=e.querySelector("#sm-dm-result"),a=s.conversations??s??[];if(!a.length){t.innerHTML='<div class="sm-empty">Sin conversaciones guardadas</div>';return}t.innerHTML=a.slice(0,10).map(i=>`
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
          <div style="font-weight:600">${n(i.username??i.userId??"\u2014")} ${m(i.intent??"desconocido")}</div>
          <div style="color:var(--text-muted,#64748b)">${n(i.lastMessage?.slice(0,80)??"")}...</div>
          <div style="font-size:11px;color:var(--text-muted,#64748b)">${m(i.status??"abierto",i.status==="resolved"?"#22c55e":"#f59e0b")}</div>
        </div>`).join("")})}),e.querySelector("#sm-dm-classify").addEventListener("click",async o=>{const s=e.querySelector("#sm-dm-text").value.trim();if(!s){p("Escrib\xED el texto de un DM","warn");return}await l(o.currentTarget,async()=>{const t=await c("/api/dm/classify","POST",{message:s}),a=e.querySelector("#sm-dm-result");a.innerHTML=`<div style="padding:12px;background:var(--hover,#f8fafc);border-radius:8px;font-size:13px">
        <div class="sm-row"><strong>Intent:</strong>${m(t.intent??"\u2014","#3451d1")}</div>
        <div class="sm-row"><strong>Sentimiento:</strong>${m(t.sentiment??"\u2014",t.sentiment==="positivo"?"#22c55e":t.sentiment==="negativo"?"#ef4444":"#6b7280")}</div>
        <div class="sm-row"><strong>Urgencia:</strong>${m(t.urgency??"normal")}</div>
        ${t.suggestedResponse?`<div style="margin-top:8px;padding:8px;border:1px solid var(--border,#e2e8f0);border-radius:6px">${n(t.suggestedResponse)}</div>`:""}
      </div>`})}),e.querySelector("#sm-dm-templates").addEventListener("click",async o=>{await l(o.currentTarget,async()=>{const s=await c("/api/dm/templates/build","POST"),t=e.querySelector("#sm-dm-result"),a=Object.entries(s??{});if(!a.length){t.innerHTML='<div class="sm-empty">Sin templates generados</div>';return}t.innerHTML=`<div style="font-weight:600;margin-bottom:8px;font-size:13px">\u{1F916} ${a.length} plantillas de auto-respuesta generadas</div>`+a.map(([i,r])=>`
          <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:12px">
            <div style="font-weight:600">${m(i,"#3451d1")}</div>
            <div style="color:var(--text-muted,#64748b);margin-top:4px">${n(typeof r=="string"?r:JSON.stringify(r))}</div>
          </div>`).join(""),p(`${a.length} plantillas listas \u2713`,"success")})}))},k=async e=>{const d=e.querySelector("#sm-panel-hashtag");if(!d)return;d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">#\uFE0F\u20E3 <strong>Hashtag Engine</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <input id="sm-ht-topic" class="sm-input" placeholder="Tema o contenido (ej: 'reel de recetas veganas')" style="flex:1" />
          <button class="sm-btn" id="sm-ht-strategy">\u26A1 Generar estrategia</button>
        </div>
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-ht-pool">\u{1F3CA} Build pool</button>
          <button class="sm-btn secondary" id="sm-ht-rotate">\u{1F504} Rotar sets</button>
        </div>
        <div id="sm-ht-result"><div class="sm-empty">Gener\xE1 una estrategia de hashtags</div></div>
      </div>
    </div>`;const o=(s,t)=>{if(!s){t.innerHTML='<div class="sm-empty">Sin estrategia</div>';return}t.innerHTML=`
      <div style="margin-bottom:8px;font-size:13px"><strong>Total: ${s.total??0} hashtags</strong> \xB7 ${n(s.rationale??"")}</div>
      <div style="margin-bottom:4px;font-size:12px;font-weight:600;color:var(--text-muted,#64748b)">\u{1F7E3} PRIMARIOS (nicho)</div>
      <div style="margin-bottom:8px">${(s.primarySet??[]).map(a=>`<span class="sm-tag purple">${n(a)}</span>`).join("")}</div>
      <div style="margin-bottom:4px;font-size:12px;font-weight:600;color:var(--text-muted,#64748b)">\u{1F535} SECUNDARIOS (audiencia)</div>
      <div style="margin-bottom:8px">${(s.secondarySet??[]).map(a=>`<span class="sm-tag blue">${n(a)}</span>`).join("")}</div>
      <div style="margin-bottom:4px;font-size:12px;font-weight:600;color:var(--text-muted,#64748b)">\u26AB CONTEXTUALES (contenido)</div>
      <div style="margin-bottom:12px">${(s.contextualSet??[]).map(a=>`<span class="sm-tag gray">${n(a)}</span>`).join("")}</div>
      <button class="sm-btn secondary" style="font-size:12px" onclick="copyText([...(${JSON.stringify(s.primarySet??[])}),(${JSON.stringify(s.secondarySet??[])}),(${JSON.stringify(s.contextualSet??[])})].join(' '))">\u{1F4CB} Copiar todos</button>`};e.querySelector("#sm-ht-strategy").addEventListener("click",async s=>{const t=e.querySelector("#sm-ht-topic").value.trim();await l(s.currentTarget,async()=>{const a=await c("/api/hashtags/strategy","POST",{topic:t,contentText:t});o(a.strategy??a,e.querySelector("#sm-ht-result"))})}),e.querySelector("#sm-ht-pool").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/hashtags/build-pool","POST"),a=e.querySelector("#sm-ht-result"),i=t.pool??t??{},r=Object.values(i).flat();a.innerHTML=`<div style="font-size:13px;margin-bottom:8px"><strong>${r.length} hashtags en el pool</strong></div>`+r.map(u=>`<span class="sm-tag">${n(u)}</span>`).join(""),p(`Pool de ${r.length} hashtags listo \u2713`,"success")})}),e.querySelector("#sm-ht-rotate").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/hashtags/rotate","POST",{currentSets:[]});o(t.strategy??t,e.querySelector("#sm-ht-result")),p("Hashtags rotados \u2713","success")})})},L=async e=>{const d=e.querySelector("#sm-panel-comment");if(!d)return;d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">\u{1F4A1} <strong>Comment Intelligence</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-cm-library">\u{1F4DA} Build librer\xEDa</button>
          <button class="sm-btn secondary" id="sm-cm-seed">\u{1F331} Generar seeds</button>
        </div>
        <textarea id="sm-cm-comments" class="sm-input" rows="3" placeholder='Peg\xE1 comentarios (uno por l\xEDnea) para analizar...'></textarea>
        <div class="sm-row">
          <button class="sm-btn" id="sm-cm-analyze">\u{1F50D} Analizar</button>
          <button class="sm-btn secondary" id="sm-cm-replies">\u{1F4AC} Generar respuestas</button>
          <button class="sm-btn secondary" id="sm-cm-crisis">\u{1F6A8} Detectar crisis</button>
        </div>
        <div id="sm-cm-result"><div class="sm-empty">Analiz\xE1 comentarios o constru\xED la librer\xEDa</div></div>
      </div>
    </div>`;const o=s=>{const t=s.querySelector("#sm-cm-comments").value.trim();return t?t.split(`
`).filter(Boolean).map((a,i)=>({id:String(i),text:a,author:"usuario",timestamp:new Date().toISOString()})):[]};e.querySelector("#sm-cm-analyze").addEventListener("click",async s=>{const t=o(e);if(!t.length){p("Peg\xE1 comentarios para analizar","warn");return}await l(s.currentTarget,async()=>{const a=await c("/api/comments/analyze","POST",{comments:t}),i=e.querySelector("#sm-cm-result"),r=a.batch??a;i.innerHTML=`
        <div class="sm-stat-row" style="margin-bottom:8px">
          <div class="sm-stat"><strong>${r?.positiveCount??0}</strong>Positivos</div>
          <div class="sm-stat"><strong>${r?.negativeCount??0}</strong>Negativos</div>
          <div class="sm-stat"><strong>${r?.neutralCount??0}</strong>Neutros</div>
          <div class="sm-stat"><strong>${r?.questionCount??0}</strong>Preguntas</div>
        </div>
        ${r?.overallSentiment?`<div style="font-size:13px">Sentimiento general: ${m(r.overallSentiment)}</div>`:""}`})}),e.querySelector("#sm-cm-replies").addEventListener("click",async s=>{const t=o(e);if(!t.length){p("Peg\xE1 comentarios primero","warn");return}await l(s.currentTarget,async()=>{const[a,i]=await Promise.all([c("/api/comments/analyze","POST",{comments:t}),Promise.resolve(null)]),r=await c("/api/comments/replies","POST",{batch:a,mode:"supervised"}),u=e.querySelector("#sm-cm-result"),b=r.plans??r??[];u.innerHTML=b.slice(0,5).map(g=>`
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
          <div style="color:var(--text-muted,#64748b)">${m("a: "+n(g.comment?.text?.slice(0,40)??"\u2014"))}</div>
          <div style="margin-top:4px">${n(g.suggestedReply??g.reply??"\u2014")}</div>
        </div>`).join("")})}),e.querySelector("#sm-cm-crisis").addEventListener("click",async s=>{const t=o(e);if(!t.length){p("Peg\xE1 comentarios primero","warn");return}await l(s.currentTarget,async()=>{const a=await c("/api/comments/analyze","POST",{comments:t}),i=await c("/api/comments/detect-crisis","POST",{batch:a}),r=e.querySelector("#sm-cm-result");r.innerHTML=`<div style="padding:12px;border-radius:8px;background:${i.isCrisis?"#fef2f2":"#f0fdf4"};font-size:13px">
        <div style="font-weight:600">${i.isCrisis?"\u{1F6A8} CRISIS DETECTADA":"\u2705 Sin crisis"}</div>
        ${i.triggers?.length?`<ul style="margin:6px 0 0 16px">${i.triggers.map(u=>`<li>${n(u)}</li>`).join("")}</ul>`:""}
        ${i.recommendedAction?`<div style="margin-top:6px;font-style:italic">${n(i.recommendedAction)}</div>`:""}
      </div>`})}),e.querySelector("#sm-cm-seed").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/comments/seed","POST",{hook:"contenido de marca",count:5}),a=e.querySelector("#sm-cm-result"),i=t.comments??t??[];a.innerHTML=`<div style="font-weight:600;margin-bottom:8px;font-size:13px">\u{1F331} ${i.length} comentarios seed generados</div>`+i.map(r=>`<div style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">${n(typeof r=="string"?r:r.text??JSON.stringify(r))}</div>`).join("")})}),e.querySelector("#sm-cm-library").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{await c("/api/comments/library/build","POST"),p("Librer\xEDa de respuestas construida \u2713","success")})})},M=async e=>{const d=e.querySelector("#sm-panel-trend");if(!d)return;d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">\u{1F4C8} <strong>Trending Engine</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn" id="sm-tr-detect">\u{1F50D} Detectar tendencias</button>
          <button class="sm-btn secondary" id="sm-tr-latest">\u{1F4C4} Cargar \xFAltimo reporte</button>
          <button class="sm-btn secondary" id="sm-tr-calendar">\u{1F4C5} Generar calendario</button>
        </div>
        <div id="sm-tr-result"><div class="sm-empty">Detect\xE1 tendencias para tu nicho</div></div>
      </div>
    </div>`;const o=(s,t)=>{if(!s?.trends?.length){t.innerHTML='<div class="sm-empty">Sin tendencias detectadas</div>';return}t.innerHTML=`
      <div class="sm-stat-row" style="margin-bottom:12px">
        <div class="sm-stat"><strong>${s.trends.length}</strong>Tendencias</div>
        <div class="sm-stat"><strong>${s.topPicks.length}</strong>Top picks</div>
        <div class="sm-stat"><strong>${new Date(s.generatedAt).toLocaleDateString("es-AR")}</strong>Generado</div>
      </div>
      <div style="padding:8px;background:var(--hover,#f8fafc);border-radius:8px;font-size:12px;margin-bottom:12px;color:var(--text-muted,#64748b)">${n(s.summary)}</div>
      ${s.trends.map(a=>`
        <div class="sm-trend-item">
          <div class="sm-trend-meta">${h(a.momentum)} ${m(`${a.relevanceScore}/100`,a.relevanceScore>=80?"#22c55e":a.relevanceScore>=60?"#f59e0b":"#6b7280")} ${m(a.timeWindow)}</div>
          <div class="sm-trend-name">${n(a.name)}</div>
          <div class="sm-trend-desc">${n(a.description)}</div>
          <div style="margin-top:4px">${a.hashtags.slice(0,5).map(i=>`<span class="sm-tag blue">${n(i)}</span>`).join("")}</div>
          <div style="font-size:12px;color:#3451d1;margin-top:4px">\u{1F4A1} ${n(a.contentIdeas[0]??"")}</div>
        </div>`).join("")}`};e.querySelector("#sm-tr-detect").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/trends/detect","POST");o(t,e.querySelector("#sm-tr-result")),p(`${t.trends?.length??0} tendencias detectadas \u2713`,"success")})}),e.querySelector("#sm-tr-latest").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/trends/latest");if(t.error){p(t.error,"warn");return}o(t,e.querySelector("#sm-tr-result"))})}),e.querySelector("#sm-tr-calendar").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/trends/calendar","POST",{days:7}),a=e.querySelector("#sm-tr-result");if(t.error){p(t.error,"warn");return}const i=t.calendar??[];a.innerHTML='<div style="font-weight:600;margin-bottom:8px;font-size:13px">\u{1F4C5} Calendario de contenido trending (7 d\xEDas)</div>'+i.map(r=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
            <div class="sm-row">${m(r.date,"#3451d1")} ${m(r.publishTime)} ${m(r.priority,r.priority==="alta"?"#22c55e":r.priority==="media"?"#f59e0b":"#6b7280")}</div>
            <div style="font-weight:600;margin-top:4px">${n(r.trend.name)}</div>
            <div style="color:var(--text-muted,#64748b)">${n(r.adaptation?.contentIdea??r.adaptation?.hook??"\u2014")}</div>
            <div style="font-size:11px;margin-top:4px">${m(r.adaptation?.format??"reel")} ${m(r.adaptation?.urgency??"esta-semana")}</div>
          </div>`).join("")})})},E=async e=>{const d=e.querySelector("#sm-panel-comp");if(!d)return;d.innerHTML=`
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">\u{1F50D} <strong>Competitor Analysis</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <input id="sm-comp-handles" class="sm-input" placeholder="@handle1, @handle2 (opcional \u2014 deja vac\xEDo para auto-detectar)" style="flex:1" />
          <button class="sm-btn" id="sm-comp-analyze">\u{1F50D} Analizar competencia</button>
        </div>
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-comp-latest">\u{1F4C4} \xDAltimo an\xE1lisis</button>
          <button class="sm-btn secondary" id="sm-comp-strategies">\u26A1 Estrategias ganadoras</button>
          <button class="sm-btn secondary" id="sm-comp-gaps">\u{1F4A1} Ideas desde gaps</button>
        </div>
        <div id="sm-comp-result"><div class="sm-empty">Analiz\xE1 la competencia de tu nicho</div></div>
      </div>
    </div>`;const o=(s,t)=>{if(!s?.competitors?.length){t.innerHTML='<div class="sm-empty">Sin datos de competidores</div>';return}t.innerHTML=`
      <div class="sm-stat-row" style="margin-bottom:12px">
        <div class="sm-stat"><strong>${s.competitors.length}</strong>Competidores</div>
        <div class="sm-stat"><strong>${s.insights.length}</strong>Insights</div>
        <div class="sm-stat"><strong>${s.topOpportunities.length}</strong>Top oportunidades</div>
      </div>
      <div style="padding:8px;background:var(--hover,#f8fafc);border-radius:8px;font-size:12px;margin-bottom:12px;color:var(--text-muted,#64748b)">${n(s.competitivePosition)}</div>
      <div style="font-weight:600;font-size:13px;margin-bottom:6px">\u{1F3C6} Top oportunidades</div>
      ${s.topOpportunities.map(a=>`
        <div class="sm-insight">
          <div class="sm-row sm-insight-title">${n(a.title)} ${w(a.opportunity)}</div>
          <div class="sm-insight-desc">${n(a.description)}</div>
          <div class="sm-insight-rec">\u2192 ${n(a.actionableRecommendation)}</div>
        </div>`).join("")}
      <div style="font-weight:600;font-size:13px;margin:10px 0 6px">\u{1F3E2} Competidores analizados</div>
      ${s.competitors.map(a=>`
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
          <div class="sm-row"><span style="font-weight:600">${n(a.handle)}</span> ${m(a.postingFrequency)} <span style="font-size:12px;color:var(--text-muted,#64748b)">${a.estimatedFollowers.toLocaleString()} seguidores \xB7 ${a.estimatedEngagementRate}% eng.</span></div>
          <div style="font-size:12px;color:var(--text-muted,#64748b);margin-top:3px">${n(a.winningFormula)}</div>
        </div>`).join("")}`};e.querySelector("#sm-comp-analyze").addEventListener("click",async s=>{const t=e.querySelector("#sm-comp-handles").value.trim(),a=t?t.split(",").map(i=>i.trim()).filter(Boolean):[];await l(s.currentTarget,async()=>{const i=await c("/api/competitors/analyze","POST",{handles:a});o(i,e.querySelector("#sm-comp-result")),p(`${i.competitors?.length??0} competidores analizados \u2713`,"success")})}),e.querySelector("#sm-comp-latest").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/competitors/latest");if(t.error){p(t.error,"warn");return}o(t,e.querySelector("#sm-comp-result"))})}),e.querySelector("#sm-comp-strategies").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/competitors/strategies","POST");if(t.error){p(t.error,"warn");return}const a=e.querySelector("#sm-comp-result"),i=t.strategies??[];a.innerHTML=`<div style="font-weight:600;margin-bottom:8px;font-size:13px">\u26A1 ${i.length} estrategias ganadoras adaptadas</div>`+i.map((r,u)=>`<div style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">${u+1}. ${n(r)}</div>`).join("")})}),e.querySelector("#sm-comp-gaps").addEventListener("click",async s=>{await l(s.currentTarget,async()=>{const t=await c("/api/competitors/content-from-gaps","POST",{maxIdeas:5});if(t.error){p(t.error,"warn");return}const a=e.querySelector("#sm-comp-result"),i=t.ideas??[];a.innerHTML=`<div style="font-weight:600;margin-bottom:8px;font-size:13px">\u{1F4A1} ${i.length} ideas de contenido desde gaps</div>`+i.map(r=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
            <div class="sm-row">${m(r.format,"#3451d1")} ${m(r.estimatedImpact,r.estimatedImpact==="alto"?"#22c55e":r.estimatedImpact==="medio"?"#f59e0b":"#6b7280")}</div>
            <div style="font-weight:600;margin-top:4px">${n(r.title)}</div>
            <div style="color:var(--text-muted,#64748b)">${n(r.differentiationAngle)}</div>
            <div style="font-size:12px;color:#3451d1;margin-top:3px">Hook: ${n(r.hook)}</div>
          </div>`).join("")})})};export const renderStudioManager=e=>{$();const d=[{id:"brain",label:"\u{1F9E0} Master Brain"},{id:"queue",label:"\u{1F4C5} Queue"},{id:"ab",label:"\u{1F9EA} A/B Tests"},{id:"dm",label:"\u{1F4AC} DMs"},{id:"hashtag",label:"#\uFE0F\u20E3 Hashtags"},{id:"comment",label:"\u{1F4A1} Comentarios"},{id:"trend",label:"\u{1F4C8} Trending"},{id:"comp",label:"\u{1F50D} Competidores"}];e.innerHTML=`
    <div class="sm-wrap">
      <div class="sm-topbar">
        <h1>\u{1F916} Studio Manager</h1>
        <div style="font-size:12px;color:var(--text-muted,#64748b)">CU Brain \xB7 ${d.length} m\xF3dulos activos</div>
      </div>
      <div class="sm-tabs" id="sm-tabs">
        ${d.map((o,s)=>`<button class="sm-tab${s===0?" active":""}" data-tab="${o.id}">${o.label}</button>`).join("")}
      </div>
      ${d.map((o,s)=>`<div class="sm-panel${s===0?" visible":""}" id="sm-panel-${o.id}"></div>`).join("")}
    </div>`,e.querySelector("#sm-tabs").addEventListener("click",o=>{const s=o.target.closest(".sm-tab");if(!s)return;const t=s.dataset.tab;e.querySelectorAll(".sm-tab").forEach(i=>i.classList.remove("active")),s.classList.add("active"),e.querySelectorAll(".sm-panel").forEach(i=>i.classList.remove("visible"));const a=e.querySelector(`#sm-panel-${t}`);a&&a.classList.add("visible")}),S(e),T(e),q(e),z(e),k(e),L(e),M(e),E(e)};export default renderStudioManager;
