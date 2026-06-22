import{apiSafe as b,apiBust as E}from"../lib/api.js";import{escape as p}from"../lib/dom.js";import{toast as v}from"../lib/toast.js";const S={mascots:[{id:"talia",name:"Tal\xEDa",emoji:"\u{1F98A}",description:"Estratega c\xE1lida, te empuja sin ser autoritaria",personality:["estratega","c\xF3mplice","c\xE1lida"]},{id:"nova",name:"Nova",emoji:"\u2728",description:"Creativa, llena de ideas frescas",personality:["creativa","curiosa","r\xE1pida"]},{id:"luca",name:"Luca",emoji:"\u{1F43A}",description:"Comercial, directo al grano para vender",personality:["cerrador","directo","enfocado"]},{id:"lia",name:"L\xEDa",emoji:"\u{1F338}",description:"Emp\xE1tica, perfecta para gesti\xF3n de comunidad",personality:["emp\xE1tica","cuidadora","cercana"]},{id:"scout",name:"Scout",emoji:"\u{1F985}",description:"Investigadora, detecta tendencias y oportunidades",personality:["anal\xEDtica","curiosa","precisa"]},{id:"pixel",name:"Pixel",emoji:"\u{1F3A8}",description:"Dise\xF1ador visual, obsesivo con la est\xE9tica",personality:["creativo","detallista","visual"]}],themes:[{id:"sunrise",name:"Sunrise",palette:["#FBE7C6","#FFD6A5","#FFAD86","#FF8E72"],vibe:"C\xE1lido y optimista, energ\xEDa de ma\xF1ana"},{id:"ocean",name:"Ocean",palette:["#3FB8C9","#2A8A98","#1E5F73","#0D3B4F"],vibe:"Sereno y profesional"},{id:"midnight",name:"Midnight",palette:["#1A1C1E","#2D3033","#6366F1","#A855F7"],vibe:"Sofisticado, vibe nocturna"},{id:"forest",name:"Forest",palette:["#0F3D2E","#16A085","#52BE80","#82E0AA"],vibe:"Org\xE1nico, sostenible"},{id:"sunset",name:"Sunset",palette:["#FF6B6B","#FFD93D","#FF8E53","#C44569"],vibe:"Vibrante, lleno de vida"},{id:"mono",name:"Mono",palette:["#0A0A0A","#262626","#737373","#FAFAFA"],vibe:"Minimalista absoluto"}],soundPacks:[{id:"gentle",name:"Gentle",vibe:"Notificaciones suaves, casi inaudibles"},{id:"energetic",name:"Energetic",vibe:"Sonidos vibrantes, te suben el \xE1nimo"},{id:"retro",name:"Retro",vibe:"8-bit nostalgia"},{id:"natural",name:"Natural",vibe:"Sonidos org\xE1nicos: agua, p\xE1jaros, viento"},{id:"silent",name:"Silent",vibe:"Sin sonidos, solo visual"}],densities:[{id:"compact",name:"Compacto",description:"M\xE1s info por pantalla"},{id:"comfortable",name:"C\xF3modo",description:"Equilibrio (default)"},{id:"spacious",name:"Espacioso",description:"Mucho aire, f\xE1cil de leer"}],fonts:[{id:"inter",name:"Inter",description:"Moderna, neutral"},{id:"merriweather",name:"Merriweather",description:"Editorial, profesional"},{id:"jetbrains",name:"JetBrains Mono",description:"Mono, tech"},{id:"system",name:"Sistema",description:"La fuente nativa del OS"}]},w={systemName:"Tal\xEDa",ownerNickname:"",mascot:"talia",theme:"sunrise",soundPack:"gentle",voicePersonality:"amistosa",density:"comfortable",fontStyle:"inter",enableCelebrations:!0,enableNarration:!0,enableEasterEggs:!0,morningRitualEnabled:!0,eveningRitualEnabled:!0,curseWordsAllowed:!1,morningTime:"09:00",eveningTime:"21:00",privateNotes:""},k=(e,t,n)=>`
  <header class="pz-hero">
    <div class="pz-hero-inner">
      <div class="pz-hero-icon">\u{1F3A8}</div>
      <div>
        <h1 class="pz-hero-title">Personalizaci\xF3n</h1>
        <p class="pz-hero-sub">Hac\xE9 que <strong>${p(e.systemName??"FeedIA")}</strong> se sienta tuyo. Nombre, tema, voz, rituales \u2014 todo a tu medida.</p>
      </div>
      ${n?'<span class="pz-offline-pill">\u{1F4E1} offline \xB7 cambios locales</span>':""}
    </div>
  </header>

  <!-- Tab navigation -->
  <nav class="pz-tabs" id="pz-tabs">
    <button class="pz-tab active" data-tab="identity">\u{1F464} Identidad</button>
    <button class="pz-tab" data-tab="mascot">\u{1F91D} Mascot</button>
    <button class="pz-tab" data-tab="theme">\u{1F3A8} Tema</button>
    <button class="pz-tab" data-tab="voice">\u{1F5E3}\uFE0F Voz & sonido</button>
    <button class="pz-tab" data-tab="appearance">\u{1F4D0} Apariencia</button>
    <button class="pz-tab" data-tab="behavior">\u2699\uFE0F Comportamiento</button>
    <button class="pz-tab" data-tab="notes">\u{1F4DD} Notas privadas</button>
    <button class="pz-tab pz-tab-brain" data-tab="branding">\u{1F9E0} Branding IA</button>
  </nav>

  <section class="pz-panel" data-panel="identity">
    <div class="pz-card">
      <h3 class="pz-card-title">Identidad del sistema</h3>
      <p class="pz-card-sub">Defin\xED c\xF3mo se llama el sistema y c\xF3mo te llama a vos.</p>
      <div class="pz-form-grid">
        <div>
          <label class="pz-label">\xBFC\xF3mo quer\xE9s llamarme?</label>
          <input id="systemName" class="pz-input" value="${p(e.systemName)}" placeholder="Tal\xEDa, FeedIA, Aurora\u2026">
          <div class="pz-hint">El nombre aparece en saludos, narrador de voz y notificaciones.</div>
        </div>
        <div>
          <label class="pz-label">\xBFC\xF3mo quer\xE9s que te llame?</label>
          <input id="ownerNickname" class="pz-input" value="${p(e.ownerNickname??"")}" placeholder="Lucas, capi, jefa\u2026">
          <div class="pz-hint">Se usa en saludos personalizados y notificaciones.</div>
        </div>
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="mascot" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Tu compa\xF1ero (mascot)</h3>
      <p class="pz-card-sub">El mascot define la personalidad por defecto y el avatar del sistema.</p>
      <div class="pz-mascot-grid" id="mascot-grid">
        ${t.mascots.map(a=>`
          <button type="button" class="pz-mascot ${e.mascot===a.id?"selected":""}" data-id="${p(a.id)}">
            <div class="pz-mascot-emoji">${p(a.emoji)}</div>
            <div class="pz-mascot-name">${p(a.name)}</div>
            <div class="pz-mascot-desc">${p(a.description)}</div>
            <div class="pz-mascot-tags">
              ${a.personality.map(l=>`<span class="pz-tag">${p(l)}</span>`).join("")}
            </div>
          </button>`).join("")}
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="theme" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Tema visual</h3>
      <p class="pz-card-sub">Paleta de colores y vibe general del sistema.</p>
      <div class="pz-theme-grid" id="theme-grid">
        ${t.themes.map(a=>`
          <button type="button" class="pz-theme ${e.theme===a.id?"selected":""}" data-id="${p(a.id)}">
            <div class="pz-theme-palette">
              ${a.palette.map(l=>`<div class="pz-theme-swatch" style="background:${l};"></div>`).join("")}
            </div>
            <div class="pz-theme-name">${p(a.name)}</div>
            <div class="pz-theme-vibe">${p(a.vibe)}</div>
          </button>`).join("")}
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="voice" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Voz y tono</h3>
      <p class="pz-card-sub">Personalidad de las respuestas y sonido del sistema.</p>
      <label class="pz-label">Personalidad de voz</label>
      <select id="voicePersonality" class="pz-input">
        ${["amistosa","profesional","p\xEDcara","mentora","c\xF3mplice"].map(a=>`<option value="${a}" ${e.voicePersonality===a?"selected":""}>${a}</option>`).join("")}
      </select>

      <label class="pz-label" style="margin-top:16px;">Sound pack</label>
      <div class="pz-sound-grid" id="sound-grid">
        ${t.soundPacks.map(a=>`
          <button type="button" class="pz-sound ${e.soundPack===a.id?"selected":""}" data-id="${p(a.id)}">
            <div class="pz-sound-name">${p(a.name)}</div>
            <div class="pz-sound-vibe">${p(a.vibe)}</div>
          </button>`).join("")}
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="appearance" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Apariencia</h3>
      <p class="pz-card-sub">Densidad de la interfaz y familia tipogr\xE1fica.</p>
      <div class="pz-form-grid">
        <div>
          <label class="pz-label">Densidad</label>
          <select id="density" class="pz-input">
            ${t.densities.map(a=>`<option value="${a.id}" ${e.density===a.id?"selected":""}>${a.name} \u2014 ${a.description}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="pz-label">Familia tipogr\xE1fica</label>
          <select id="fontStyle" class="pz-input">
            ${t.fonts.map(a=>`<option value="${a.id}" ${e.fontStyle===a.id?"selected":""}>${a.name} \u2014 ${a.description}</option>`).join("")}
          </select>
        </div>
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="behavior" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Comportamiento</h3>
      <p class="pz-card-sub">Qu\xE9 hace el sistema, qu\xE9 te avisa, qu\xE9 celebra.</p>
      <div class="pz-toggle-list">
        <label class="pz-toggle">
          <span><strong>\u{1F389} Celebraciones</strong><div class="pz-hint">Confetti + sonido al lograr hitos</div></span>
          <input type="checkbox" id="enableCelebrations" ${e.enableCelebrations?"checked":""}>
        </label>
        <label class="pz-toggle">
          <span><strong>\u{1F5E3}\uFE0F Narraci\xF3n por voz</strong><div class="pz-hint">El sistema te cuenta lo que hace ("Abriendo Canva...")</div></span>
          <input type="checkbox" id="enableNarration" ${e.enableNarration?"checked":""}>
        </label>
        <label class="pz-toggle">
          <span><strong>\u{1F95A} Easter eggs</strong><div class="pz-hint">Sorpresas ocasionales para alegrar la sesi\xF3n</div></span>
          <input type="checkbox" id="enableEasterEggs" ${e.enableEasterEggs?"checked":""}>
        </label>
        <label class="pz-toggle">
          <span><strong>\u2600\uFE0F Ritual matutino</strong><div class="pz-hint">Briefing diario con plan y m\xE9tricas</div></span>
          <input type="checkbox" id="morningRitualEnabled" ${e.morningRitualEnabled?"checked":""}>
        </label>
        <label class="pz-toggle">
          <span><strong>\u{1F319} Ritual nocturno</strong><div class="pz-hint">Cierre del d\xEDa con resumen y aprendizajes</div></span>
          <input type="checkbox" id="eveningRitualEnabled" ${e.eveningRitualEnabled?"checked":""}>
        </label>
        <label class="pz-toggle">
          <span><strong>\u{1F92C} Lenguaje fuerte</strong><div class="pz-hint">Permite que el sistema se exprese sin filtros</div></span>
          <input type="checkbox" id="curseWordsAllowed" ${e.curseWordsAllowed?"checked":""}>
        </label>
      </div>

      <div class="pz-form-grid" style="margin-top:16px;">
        <div>
          <label class="pz-label">Hora ritual matutino</label>
          <input id="morningTime" type="time" class="pz-input" value="${p(e.morningTime)}">
        </div>
        <div>
          <label class="pz-label">Hora ritual nocturno</label>
          <input id="eveningTime" type="time" class="pz-input" value="${p(e.eveningTime)}">
        </div>
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="notes" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Notas privadas</h3>
      <p class="pz-card-sub">Cosas que quer\xE9s que el sistema tenga presente. No se publican: solo se usan como contexto.</p>
      <textarea id="privateNotes" class="pz-input pz-textarea" rows="6" placeholder="Ej: prefiero publicar martes y jueves, mi mejor amigo se llama Mati, no quiero hablar de pol\xEDtica\u2026">${p(e.privateNotes??"")}</textarea>
      <div class="pz-hint">Tip: cuanto m\xE1s espec\xEDfico, mejor adapta las respuestas el asistente.</div>
    </div>
  </section>

  <section class="pz-panel" data-panel="branding" hidden>
    <div id="bb-panel-inner">
      <div class="pz-card" style="text-align:center;padding:32px;">
        <div style="font-size:32px;margin-bottom:8px;">\u{1F9E0}</div>
        <div class="small muted">Cargando Branding Brain\u2026</div>
      </div>
    </div>
  </section>

  <div class="pz-actions">
    <button class="btn primary" id="save-btn">\u{1F4BE} Guardar cambios</button>
    <button class="btn ghost" id="reset-btn">\u{1F504} Restaurar defaults</button>
    ${n?'<div class="small muted" style="align-self:center;">\u26A0\uFE0F Los cambios se guardar\xE1n cuando el servidor vuelva</div>':""}
  </div>
`,A=e=>{let t=!1;e.querySelectorAll(".pz-tab").forEach(a=>{a.addEventListener("click",()=>{const l=a.dataset.tab;e.querySelectorAll(".pz-tab").forEach(r=>r.classList.toggle("active",r===a)),e.querySelectorAll(".pz-panel").forEach(r=>{r.hidden=r.dataset.panel!==l}),l==="branding"&&!t&&(t=!0,B(e))})});const n=a=>{e.querySelectorAll(a).forEach(l=>{l.addEventListener("click",()=>{e.querySelectorAll(a).forEach(r=>r.classList.remove("selected")),l.classList.add("selected")})})};n(".pz-mascot"),n(".pz-theme"),n(".pz-sound"),document.getElementById("save-btn")?.addEventListener("click",async()=>{const a={systemName:document.getElementById("systemName").value,ownerNickname:document.getElementById("ownerNickname").value||void 0,mascot:e.querySelector(".pz-mascot.selected")?.dataset.id,theme:e.querySelector(".pz-theme.selected")?.dataset.id,soundPack:e.querySelector(".pz-sound.selected")?.dataset.id,voicePersonality:document.getElementById("voicePersonality").value,density:document.getElementById("density").value,fontStyle:document.getElementById("fontStyle").value,enableCelebrations:document.getElementById("enableCelebrations").checked,enableNarration:document.getElementById("enableNarration").checked,enableEasterEggs:document.getElementById("enableEasterEggs").checked,morningRitualEnabled:document.getElementById("morningRitualEnabled").checked,eveningRitualEnabled:document.getElementById("eveningRitualEnabled").checked,curseWordsAllowed:document.getElementById("curseWordsAllowed").checked,morningTime:document.getElementById("morningTime").value,eveningTime:document.getElementById("eveningTime").value,privateNotes:document.getElementById("privateNotes").value};try{localStorage.setItem("feedia.personalization",JSON.stringify(a))}catch{}const{error:l}=await b("/api/personalization",null,{method:"PUT",body:a});if(E("/api/personalization"),l)v("\u{1F4BE} Guardado localmente. Se sincronizar\xE1 con el server cuando vuelva.","warn");else{v("\u2728 Personalizaci\xF3n guardada","success");const r=document.getElementById("personalization-css");r&&(r.href=`/api/personalization/css?ts=${Date.now()}`)}}),document.getElementById("reset-btn")?.addEventListener("click",async()=>{if(confirm("\xBFRestaurar defaults?")){try{localStorage.removeItem("feedia.personalization")}catch{}await b("/api/personalization/reset",null,{method:"POST",body:{}}),E("/api/personalization"),v("Restaurado a defaults","info"),renderPersonalization(e)}})},q=()=>{try{const e=localStorage.getItem("feedia.personalization");if(e)return JSON.parse(e)}catch{}return null},u=e=>String(e??"").replace(/"/g,"&quot;").replace(/</g,"&lt;"),o=e=>String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t]),L=e=>{if(!e)return"";const t=Array.isArray(e?.visual?.palette)?e.visual.palette:[],n=Array.isArray(e?.visual?.typography)?e.visual.typography:[],a=Array.isArray(e?.voice?.tone)?e.voice.tone:[],l=Array.isArray(e?.voice?.forbidden)?e.voice.forbidden:[],r=e?.visual?.style??"",c=e?.visual?.mood??"",s=e?.name??"Tu marca",i=e?.niche??"";return`
    <section id="brand-board-section" class="card brand-board" style="margin-top:18px;">
      <div class="row spread" style="align-items:flex-start;gap:14px;flex-wrap:wrap;">
        <div>
          <h2 style="margin:0 0 4px;font-size:18px;">\u{1F3A8} Brand Board \xB7 ${o(s)}</h2>
          <p class="small muted" style="margin:0;">Identidad viva de tu marca \u2014 paleta, tipograf\xEDas, voz y mood, todo en un lugar.</p>
        </div>
        <a class="btn ghost tiny" href="#moodboard" title="Vista cl\xE1sica completa de Moodboard">\u2197 Vista cl\xE1sica</a>
      </div>

      <div class="bb-grid">
        <div class="bb-tile">
          <div class="bb-tile-h">\u{1F3A8} Paleta</div>
          ${t.length?`<div class="bb-swatches">${t.slice(0,8).map(d=>`
            <div class="bb-swatch" title="${u(d)}">
              <div class="bb-color" style="background:${u(d)};"></div>
              <div class="bb-hex">${o(d)}</div>
            </div>`).join("")}</div>`:'<div class="tiny muted">Sin paleta cargada todav\xEDa.</div>'}
        </div>

        <div class="bb-tile">
          <div class="bb-tile-h">\u{1F524} Tipograf\xEDa</div>
          ${n.length?n.slice(0,3).map((d,m)=>`
            <div class="bb-font" style="font-family:'${u(d)}', ui-sans-serif, system-ui;">
              <div style="font-size:${m===0?"28px":"20px"};font-weight:${m===0?800:600};line-height:1.05;">Aa</div>
              <div class="tiny muted">${o(d)}</div>
            </div>`).join(""):'<div class="tiny muted">Sin tipograf\xEDas configuradas.</div>'}
        </div>

        <div class="bb-tile">
          <div class="bb-tile-h">\u{1F399}\uFE0F Voz</div>
          ${a.length?`<div class="meta" style="margin-bottom:8px;">${a.map(d=>`<span class="tag tiny accent">${o(d)}</span>`).join("")}</div>`:""}
          ${l.length?`<div class="tiny muted" style="margin-top:6px;"><b>Prohibido:</b> ${l.map(o).join(" \xB7 ")}</div>`:""}
          ${!a.length&&!l.length?'<div class="tiny muted">Sin voz definida a\xFAn.</div>':""}
        </div>

        <div class="bb-tile">
          <div class="bb-tile-h">\u2728 Mood & estilo</div>
          ${r?`<div class="small"><b>Estilo:</b> ${o(r)}</div>`:""}
          ${c?`<div class="small" style="margin-top:4px;"><b>Mood:</b> ${o(c)}</div>`:""}
          ${i?`<div class="small muted" style="margin-top:6px;">Nicho \xB7 ${o(i)}</div>`:""}
          ${!r&&!c?'<div class="tiny muted">Sin mood definido.</div>':""}
        </div>

        <div class="bb-tile bb-canva" id="canva-connect-tile">
          <div class="bb-tile-h">\u{1F3A8} Canva Connect</div>
          <div class="tiny muted" id="canva-status">verificando\u2026</div>
          <div id="canva-actions" style="margin-top:10px;"></div>
        </div>
      </div>

      <style>
        .brand-board{background:linear-gradient(135deg,rgba(225,48,108,.05),rgba(168,85,247,.03));}
        .bb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:14px;}
        .bb-tile{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:14px;}
        .bb-tile-h{font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--text-secondary,#aab);margin-bottom:10px;text-transform:uppercase;}
        .bb-swatches{display:flex;flex-wrap:wrap;gap:8px;}
        .bb-swatch{display:flex;flex-direction:column;align-items:center;gap:4px;}
        .bb-color{width:42px;height:42px;border-radius:10px;border:1px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);}
        .bb-hex{font-size:10px;font-family:ui-monospace,monospace;color:var(--text-tertiary,#8a8a98);}
        .bb-font{display:flex;align-items:baseline;gap:10px;padding:6px 0;border-top:1px solid var(--border-soft,#222);}
        .bb-font:first-of-type{border-top:0;padding-top:0;}
      </style>
    </section>`},C=async e=>{const t=e.querySelector("#canva-status"),n=e.querySelector("#canva-actions");if(!t||!n)return;const a=await b("/api/canva/health",null);if(a.data){const s=a.data;s.apiReachable?t.innerHTML=`<span class="tag tiny ok">operativo</span> ${o(s.message??"")}`:s.connected?t.innerHTML=`<span class="tag tiny warn">conectado \xB7 API ca\xEDda</span> ${o(s.reason??"")}`:s.oauthConfigured?t.innerHTML='<span class="tag tiny warn">desconectado</span> Sin cuentas Canva conectadas.':t.innerHTML=`<span class="tag tiny crit">no configurado</span> ${o(s.reason??"")}`,n.innerHTML=s.connected?`<div class="tiny" style="margin-bottom:6px;">${s.tokens} cuenta(s) conectada(s).</div>
         <div class="btn-row">
           <a class="btn ghost tiny" href="/connect/canva">+ Conectar otra</a>
           <button class="btn ghost tiny" id="canva-disconnect-btn">Desconectar</button>
         </div>`:s.oauthConfigured?`<a class="btn primary tiny" href="/connect/canva">\u{1F517} Conectar Canva</a>
           <div class="tiny muted" style="margin-top:6px;">Habilita "Render Canva (API)" en Carrusel Studio.</div>`:'<div class="tiny muted">Configur\xE1 <code>CANVA_CLIENT_ID</code> y <code>CANVA_CLIENT_SECRET</code> en <code>.env</code> y reinici\xE1 el servidor.</div>',n.querySelector("#canva-disconnect-btn")?.addEventListener("click",async()=>{if(!confirm("\xBFDesconectar todas las cuentas Canva conectadas?"))return;(await b("/api/canva/disconnect",null,{method:"POST",body:{}})).error||C(e)});return}const{data:l,error:r}=await b("/api/canva/users",{users:[]});if(r){t.textContent="\u{1F4E1} endpoint no disponible (servidor desactualizado)",n.innerHTML="";return}const c=Array.isArray(l?.users)?l.users:[];t.innerHTML=c.length?`<span class="tag tiny ok">conectado</span> ${c.length} cuenta(s).`:'<span class="tag tiny warn">desconectado</span> Sin cuentas Canva.',n.innerHTML=c.length?'<a class="btn ghost tiny" href="/connect/canva">+ Conectar otra</a>':'<a class="btn primary tiny" href="/connect/canva">\u{1F517} Conectar Canva</a>'},j=async e=>{const t=e.querySelector("#brand-board-section");t&&t.remove();const{data:n}=await b("/api/brand",null),a=L(n);a&&(e.insertAdjacentHTML("beforeend",a),C(e))},T=[{id:"brand-strategist-senior",name:"Lorenzo Vidal",emoji:"\u{1F3DB}\uFE0F",role:"Estratega Senior",specialty:"Visi\xF3n, misi\xF3n, valores, posicionamiento"},{id:"audience-researcher",name:"Renata Ib\xE1\xF1ez",emoji:"\u{1F52C}",role:"Investigador Audiencia",specialty:"Avatar, JTBD, dolores, deseos"},{id:"naming-voice",name:"Tom\xE1s Quiroga",emoji:"\u{1F4E3}",role:"Naming & Voz",specialty:"Tono, vocabulario, hooks de marca"},{id:"visual-identity",name:"Aurora Blanchet",emoji:"\u{1F3A8}",role:"Identidad Visual",specialty:"Paleta, tipograf\xEDa, mood, iconograf\xEDa"},{id:"narrative-architect",name:"Joaqu\xEDn Bressan",emoji:"\u{1F4D6}",role:"Narrativa",specialty:"Origin story, mensajes clave, arcos"},{id:"differential-strategist",name:"Mariela Costa",emoji:"\u26A1",role:"Estratega Diferencial",specialty:"Anti-gen\xE9rico, takes \xFAnicos, innovaci\xF3n"},{id:"influencer-positioner",name:"Bautista Rold\xE1n",emoji:"\u{1F31F}",role:"Posicionador Influencer",specialty:"Autoridad de nicho, signature pieces"},{id:"coherence-guardian",name:"Helena Saavedra",emoji:"\u{1F6E1}\uFE0F",role:"Guardian Coherencia",specialty:"Auditor\xEDa de identidad y consistencia"}],P=(e,t=[])=>{const n=e?.brandStrategy?.positioning,a=e?.nichePackId??null,l=t.reduce((s,i)=>(s[i.accountCategory]||(s[i.accountCategory]=[]),s[i.accountCategory].push(i),s),{}),r={"marca-personal":"\u{1F464} Marca Personal",empresa:"\u{1F3E2} Empresa",agencia:"\u{1F3DB}\uFE0F Agencia","creador-de-contenido":"\u{1F3AC} Creador de Contenido","profesional-independiente":"\u{1F4BC} Profesional Independiente","comercio-local":"\u{1F3EA} Comercio Local",influencer:"\u{1F31F} Influencer",educador:"\u{1F393} Educador",artista:"\u{1F3A8} Artista"},c=Object.entries(l).map(([s,i])=>`
    <optgroup label="${r[s]??s}">
      ${i.map(d=>`<option value="${u(d.id)}" ${d.id===a?"selected":""}>${d.emoji} ${o(d.label)}</option>`).join("")}
    </optgroup>
  `).join("");return`
    <style>
      .pz-tab-brain { background: linear-gradient(135deg,rgba(168,85,247,.15),rgba(59,130,246,.1)); }
      .pz-tab-brain.active { background: linear-gradient(135deg,rgba(168,85,247,.35),rgba(59,130,246,.2)); }
      .bb-agents { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; margin:14px 0; }
      .bb-agent { background:var(--bg-card,#15151b); border:1px solid var(--border); border-radius:12px; padding:12px 14px; display:flex; gap:10px; align-items:flex-start; }
      .bb-agent-emoji { font-size:22px; line-height:1; flex-shrink:0; margin-top:2px; }
      .bb-agent-info { min-width:0; }
      .bb-agent-name { font-weight:700; font-size:13px; }
      .bb-agent-role { font-size:11px; color:var(--text-secondary,#aab); margin-top:1px; }
      .bb-agent-spec { font-size:11px; color:var(--text-tertiary,#888); margin-top:4px; line-height:1.4; }
      .bb-agent.active-agent { border-color:rgba(168,85,247,.6); background:rgba(168,85,247,.07); animation:bb-pulse 1.5s ease-in-out infinite; }
      @keyframes bb-pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
      .bb-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      @media(max-width:600px){ .bb-form-grid{grid-template-columns:1fr;} }
      .bb-score-ring { display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; border:3px solid; font-size:18px; font-weight:800; flex-shrink:0; }
      .bb-step { border-left:2px solid var(--border); padding:0 0 16px 14px; margin-left:11px; position:relative; }
      .bb-step::before { content:''; position:absolute; left:-5px; top:4px; width:8px; height:8px; border-radius:50%; background:var(--accent,#a855f7); }
      .bb-step-header { display:flex; gap:8px; align-items:center; margin-bottom:6px; }
      .bb-step-agent { font-weight:700; font-size:13px; }
      .bb-step-phase { font-size:11px; color:var(--text-secondary,#aab); }
      .bb-step-output { font-size:12px; color:var(--text-secondary,#aab); line-height:1.5; white-space:pre-wrap; }
      .bb-cache-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; margin-top:4px; }
      .bb-cache-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#10b981,#34d399); transition:width .6s; }
      .bb-results-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; margin-top:14px; }
      .bb-result-tile { background:var(--bg-card,#15151b); border:1px solid var(--border); border-radius:12px; padding:14px; }
      .bb-result-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-secondary,#aab); margin-bottom:8px; }
      /* Niche pack selector */
      .bb-niche-banner { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1px solid rgba(168,85,247,.35); background:rgba(168,85,247,.06); margin-bottom:10px; }
      .bb-niche-emoji { font-size:24px; flex-shrink:0; }
      .bb-niche-info { flex:1; min-width:0; }
      .bb-niche-name { font-weight:700; font-size:13px; }
      .bb-niche-desc { font-size:11px; color:var(--text-secondary,#aab); margin-top:2px; }
      .bb-niche-pillars { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
      .bb-pillar-tag { font-size:10px; background:rgba(168,85,247,.15); border:1px solid rgba(168,85,247,.3); border-radius:20px; padding:2px 8px; color:var(--text-secondary,#aab); }
    </style>

    <div class="pz-card" style="background:linear-gradient(135deg,rgba(168,85,247,.08),rgba(59,130,246,.04));border-color:rgba(168,85,247,.25);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
        <span style="font-size:28px;">\u{1F9E0}</span>
        <div>
          <h3 class="pz-card-title" style="margin:0;">Branding Brain</h3>
          <p class="pz-card-sub" style="margin:0;">8 especialistas IA construyen y refinan la identidad completa de tu marca en un solo job.</p>
        </div>
        ${n?'<span class="tag tiny ok" style="margin-left:auto;flex-shrink:0;">Estrategia activa</span>':'<span class="tag tiny warn" style="margin-left:auto;flex-shrink:0;">Sin estrategia a\xFAn</span>'}
      </div>
    </div>

    <!-- Agentes -->
    <div class="pz-card" style="margin-top:10px;">
      <div class="pz-card-title" style="font-size:13px;margin-bottom:10px;">El equipo</div>
      <div class="bb-agents" id="bb-agents-grid">
        ${T.map(s=>`
          <div class="bb-agent" data-agent-id="${u(s.id)}">
            <div class="bb-agent-emoji">${o(s.emoji)}</div>
            <div class="bb-agent-info">
              <div class="bb-agent-name">${o(s.name)}</div>
              <div class="bb-agent-role">${o(s.role)}</div>
              <div class="bb-agent-spec">${o(s.specialty)}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>

    <!-- Niche Pack selector -->
    <div class="pz-card" style="margin-top:10px;" id="bb-niche-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div class="pz-card-title" style="font-size:13px;margin:0;">\u{1F5C2}\uFE0F Tipo de cuenta</div>
        <span class="tiny muted">Pre-configura la estrategia para tu industria</span>
        ${a?'<span class="tag tiny ok" style="margin-left:auto;">Pack activo</span>':""}
      </div>

      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <label class="pz-label">Seleccion\xE1 tu tipo de cuenta</label>
          <select id="bb-niche-select" class="pz-input">
            <option value="">\u2014 Sin pack (modo libre) \u2014</option>
            ${c}
          </select>
        </div>
        <button class="btn ghost" id="bb-niche-apply-btn" style="flex-shrink:0;height:38px;">
          Aplicar pack
        </button>
      </div>

      <!-- Preview del pack seleccionado -->
      <div id="bb-niche-preview" style="margin-top:10px;display:none;"></div>
    </div>

    <!-- Presets r\xE1pidos -->
    <div class="pz-card" style="margin-top:10px;">
      <div class="pz-card-title" style="font-size:13px;">\u26A1 Presets r\xE1pidos</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button class="btn ghost tiny bb-preset" data-goal="Quiero convertir mi cuenta en una autoridad de nicho y construir una audiencia masiva que conf\xEDe en mi criterio" data-tier="established">\u{1F680} Convertirme en influencer</button>
        <button class="btn ghost tiny bb-preset" data-goal="Necesito construir mi identidad de marca desde cero \u2014 no s\xE9 por d\xF3nde empezar" data-tier="starting" data-mode="discovery">\u{1F331} Arrancar desde cero</button>
        <button class="btn ghost tiny bb-preset" data-goal="Mi marca ya existe pero necesita un salto de calidad en posicionamiento, voz y visual" data-tier="growing" data-mode="evolution">\u26A1 Evolucionar mi marca actual</button>
        <button class="btn ghost tiny bb-preset" data-goal="Quiero construir la identidad digital de mi negocio local para atraer clientes de la zona" data-tier="starting">\u{1F3E2} Marca para mi negocio local</button>
        <button class="btn ghost tiny bb-preset" data-goal="Soy profesional y quiero que mi Instagram refleje mi expertise y atraiga clientes o empleadores" data-tier="growing">\u{1F393} Autoridad en mi nicho profesional</button>
      </div>
    </div>

    <!-- Formulario -->
    <div class="pz-card" style="margin-top:10px;" id="bb-form-card">
      <div class="pz-card-title" style="font-size:13px;margin-bottom:12px;">Nuevo job de branding</div>
      <div>
        <label class="pz-label">\u{1F3AF} Objetivo principal <span style="color:#f87171;">*</span></label>
        <textarea id="bb-goal" class="pz-input pz-textarea" rows="2" placeholder="Ej: Quiero construir mi marca personal como referente de marketing digital en Argentina\u2026"></textarea>
      </div>
      <div class="bb-form-grid" style="margin-top:10px;">
        <div>
          <label class="pz-label">\u{1F4A1} Tus ideas (opcional)</label>
          <textarea id="bb-ideas" class="pz-input pz-textarea" rows="2" placeholder="Ideas, intuiciones o elementos que s\xED o s\xED quer\xE9s incluir\u2026"></textarea>
        </div>
        <div>
          <label class="pz-label">\u{1F6AB} Restricciones (opcional)</label>
          <textarea id="bb-constraints" class="pz-input pz-textarea" rows="2" placeholder="Cosas que no quer\xE9s, limitaciones de presupuesto, etc\u2026"></textarea>
        </div>
      </div>
      <div class="bb-form-grid" style="margin-top:10px;">
        <div>
          <label class="pz-label">\u{1F4CA} Tier actual</label>
          <select id="bb-tier" class="pz-input">
            <option value="starting">\u{1F331} Starting \u2014 arrancando de cero</option>
            <option value="growing" selected>\u{1F33F} Growing \u2014 creciendo (default)</option>
            <option value="established">\u{1F333} Established \u2014 ya tengo audiencia</option>
            <option value="influencer">\u2B50 Influencer \u2014 referente del nicho</option>
          </select>
        </div>
        <div>
          <label class="pz-label">\u{1F504} Modo</label>
          <select id="bb-mode" class="pz-input">
            <option value="discovery">\u{1F50D} Discovery \u2014 construir desde cero</option>
            <option value="refinement" selected>\u2728 Refinement \u2014 mejorar lo existente</option>
            <option value="evolution">\u{1F680} Evolution \u2014 next level</option>
            <option value="autopilot">\u{1F916} Autopilot \u2014 full auto</option>
          </select>
        </div>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <button class="btn primary" id="bb-run-btn" style="background:linear-gradient(135deg,#a855f7,#3b82f6);border:none;">
          \u{1F9E0} Activar Branding Brain
        </button>
        <div class="small muted">~2-3 min \xB7 8 agentes \xB7 Opus 4.7 + Sonnet 4.6</div>
      </div>
    </div>

    <!-- Resultados (oculto hasta que corra) -->
    <div id="bb-results" style="display:none;margin-top:10px;"></div>
  `},N=(e,t)=>{const n=e.querySelector("#bb-results");if(!n)return;const a=t.coherenceReport?.score??0,l=a>=80?"#10b981":a>=60?"#f59e0b":"#ef4444",r=t.totalCacheReadTokens+t.totalCacheWriteTokens,c=r>0?Math.round(t.totalCacheReadTokens/r*100):0,s=Math.round(c*.8);n.style.display="block",n.innerHTML=`
    <!-- Header de resultados -->
    <div class="pz-card" style="background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(168,85,247,.05));border-color:rgba(16,185,129,.3);">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div class="bb-score-ring" style="border-color:${u(l)};color:${u(l)};">${a}</div>
        <div style="flex:1;min-width:160px;">
          <div style="font-weight:700;font-size:15px;">Coherencia de marca: ${a}/100</div>
          <div class="small muted" style="margin-top:2px;">${t.coherenceReport?.conflicts?.length?t.coherenceReport.conflicts.length+" conflicto(s) detectado(s)":"\u2705 Sin conflictos cr\xEDticos"}</div>
          <div style="margin-top:6px;">
            <div style="font-size:11px;color:var(--text-secondary,#aab);margin-bottom:3px;">Ahorro de cach\xE9 estimado: ${s}%</div>
            <div class="bb-cache-bar"><div class="bb-cache-fill" style="width:${c}%;"></div></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn ghost tiny" id="bb-apply-btn">\u{1F4BE} Aplicar a marca</button>
          <button class="btn ghost tiny" id="bb-rerun-btn">\u{1F504} Reejecutar</button>
        </div>
      </div>
    </div>

    <!-- Key outputs grid -->
    <div class="bb-results-grid">
      <div class="bb-result-tile">
        <div class="bb-result-label">\u{1F3DB}\uFE0F Posicionamiento</div>
        <div class="small">${o(t.brandStrategy?.positioning??"\u2014")}</div>
        <div class="tiny muted" style="margin-top:6px;">${o(t.brandStrategy?.differentiator??"")}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">\u{1F399}\uFE0F Voz de marca</div>
        <div class="small">${(t.voice?.tone??[]).map(i=>`<span class="tag tiny">${o(i)}</span>`).join(" ")}</div>
        ${t.voice?.sampleHooks?.length?`<div class="tiny muted" style="margin-top:6px;font-style:italic;">"${o(t.voice.sampleHooks[0])}"</div>`:""}
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">\u{1F3A8} Identidad Visual</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
          ${(t.visualIdentity?.palette??[]).slice(0,5).map(i=>`<div style="width:24px;height:24px;border-radius:6px;background:${u(i)};border:1px solid var(--border);" title="${u(i)}"></div>`).join("")}
        </div>
        <div class="tiny muted">${o(t.visualIdentity?.mood??"")}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">\u26A1 \xC1ngulo diferencial</div>
        <div class="small">${(t.differentialAngles?.contraTakes??[]).slice(0,2).map(i=>`<div style="margin-bottom:4px;">\u21AF ${o(i)}</div>`).join("")}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">\u{1F31F} Plan Influencer</div>
        <div class="small">${(t.influencerPlan?.authorityPillars??[]).slice(0,3).map(i=>`<div style="margin-bottom:3px;">\u25B8 ${o(i)}</div>`).join("")}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">\u{1F6E1}\uFE0F Recomendaciones</div>
        <div class="small">${(t.coherenceReport?.recommendations??[]).slice(0,3).map(i=>`<div style="margin-bottom:3px;">\u2022 ${o(i)}</div>`).join("")}</div>
      </div>
    </div>

    <!-- Steps trace acorde\xF3n -->
    <div class="pz-card" style="margin-top:10px;">
      <div class="pz-card-title" style="font-size:13px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
        Traza de agentes
        <button class="btn ghost tiny" id="bb-toggle-steps">Expandir todo</button>
      </div>
      <div id="bb-steps-list">
        ${(t.steps??[]).map((i,d)=>`
          <div class="bb-step" style="${d===t.steps.length-1?"padding-bottom:0;":""}">
            <div class="bb-step-header">
              <span style="font-size:16px;">${o(i.emoji)}</span>
              <span class="bb-step-agent">${o(i.agentName)}</span>
              <span class="bb-step-phase">${o(i.phase)}</span>
              <span class="tiny muted" style="margin-left:auto;">${(i.durationMs/1e3).toFixed(1)}s${i.cacheReadTokens?" \xB7 \u{1F7E2} cache":""}</span>
            </div>
            <div class="bb-step-output">${o(i.output)}</div>
          </div>`).join("")}
      </div>
    </div>
  `,n.querySelector("#bb-apply-btn")?.addEventListener("click",async()=>{const i={brandStrategy:t.brandStrategy,audienceAvatar:t.audienceAvatar,voice:t.voice,visualIdentity:t.visualIdentity,narrative:t.narrative},{error:d}=await b("/api/brand/apply-branding-brain",null,{method:"POST",body:i});if(d){v("\u26A0\uFE0F No se pudo aplicar. Guardando localmente\u2026","warn");try{localStorage.setItem("feedia.brandingBrainResult",JSON.stringify(i))}catch{}}else v("\u2705 Identidad de marca actualizada con los resultados del Branding Brain","success")}),n.querySelector("#bb-rerun-btn")?.addEventListener("click",()=>{n.style.display="none",e.querySelector("#bb-form-card")?.scrollIntoView({behavior:"smooth"})})},M=(e,t=[])=>{const n=e.querySelector("#bb-niche-select"),a=e.querySelector("#bb-niche-preview"),l=e.querySelector("#bb-niche-apply-btn"),r=s=>{if(!a)return;const i=t.find(d=>d.id===s);if(!i){a.style.display="none",a.innerHTML="";return}a.style.display="block",a.innerHTML=`
      <div class="bb-niche-banner">
        <div class="bb-niche-emoji">${i.emoji}</div>
        <div class="bb-niche-info">
          <div class="bb-niche-name">${o(i.label)}</div>
          <div class="bb-niche-desc">${o(i.description)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px;">
        <div class="bb-result-tile" style="padding:10px;">
          <div class="bb-result-label">Voz</div>
          <div class="bb-niche-pillars">${(i.tone??[]).slice(0,4).map(d=>`<span class="bb-pillar-tag">${o(d)}</span>`).join("")}</div>
        </div>
        <div class="bb-result-tile" style="padding:10px;">
          <div class="bb-result-label">Pilares de contenido</div>
          <div class="bb-niche-pillars">${(i.pillars??[]).slice(0,4).map(d=>`<span class="bb-pillar-tag">${o(d)}</span>`).join("")}</div>
        </div>
        <div class="bb-result-tile" style="padding:10px;">
          <div class="bb-result-label">Objetivo principal</div>
          <div class="small" style="margin-top:4px;">${o(i.goal??"")}</div>
        </div>
      </div>
    `};n?.addEventListener("change",()=>r(n.value)),l?.addEventListener("click",async()=>{const s=n?.value;if(!s){v("Seleccion\xE1 un tipo de cuenta primero","warn");return}l.disabled=!0,l.textContent="Aplicando\u2026";const{error:i}=await b(`/api/niche-packs/${s}/apply`,null,{method:"POST",body:{}});l.disabled=!1,l.textContent="Aplicar pack",i?v("\u26A0\uFE0F Error al aplicar el pack: "+i,"error"):(v("\u2705 Pack de nicho aplicado. Los valores de tu marca se actualizaron como punto de partida.","success"),B(e.closest(".pz-panel")??e.parentElement??e))}),e.querySelectorAll(".bb-preset").forEach(s=>{s.addEventListener("click",()=>{const i=s.dataset.goal??"",d=s.dataset.tier??"growing",m=s.dataset.mode??"",x=e.querySelector("#bb-goal"),g=e.querySelector("#bb-tier"),h=e.querySelector("#bb-mode");x&&(x.value=i),g&&(g.value=d),m&&h&&(h.value=m),e.querySelector("#bb-form-card")?.scrollIntoView({behavior:"smooth"})})});const c=e.querySelector("#bb-run-btn");c&&c.addEventListener("click",async()=>{const s=e.querySelector("#bb-goal")?.value?.trim();if(!s){v("\u26A0\uFE0F El objetivo es obligatorio","warn");return}const i=e.querySelector("#bb-ideas")?.value?.trim()||void 0,d=e.querySelector("#bb-constraints")?.value?.trim()||void 0,m=e.querySelector("#bb-tier")?.value||"growing",x=e.querySelector("#bb-mode")?.value||"refinement";c.disabled=!0,c.textContent="\u23F3 Ejecutando\u2026";const g=e.querySelector("#bb-agents-grid");let h=0;const z=()=>{g&&(g.querySelectorAll(".bb-agent").forEach((y,f)=>{y.classList.toggle("active-agent",f===h)}),h=(h+1)%T.length)},$=setInterval(z,4e3);z();try{const{data:y,error:f}=await b("/api/branding/brain",null,{method:"POST",body:{goal:s,userIdeas:i,constraints:d,targetTier:m,mode:x}});if(clearInterval($),g?.querySelectorAll(".bb-agent").forEach(I=>I.classList.remove("active-agent")),c.disabled=!1,c.textContent="\u{1F9E0} Activar Branding Brain",f||!y){v("\u274C Error al ejecutar Branding Brain: "+(f??"respuesta vac\xEDa"),"error");return}v("\u2705 Branding Brain completado \xB7 coherencia: "+(y.coherenceReport?.score??"?")+"/100","success"),N(e,y)}catch(y){clearInterval($),g?.querySelectorAll(".bb-agent").forEach(f=>f.classList.remove("active-agent")),c.disabled=!1,c.textContent="\u{1F9E0} Activar Branding Brain",v("\u274C "+y.message,"error")}})},B=async e=>{const t=e.querySelector("#bb-panel-inner");if(!t)return;const[{data:n},{data:a}]=await Promise.all([b("/api/brand",null),b("/api/niche-packs",null)]);t.innerHTML=P(n??{},a?.packs??[]),M(t,a?.packs??[])};export const renderPersonalization=async e=>{const t=q(),n={...w,...t??{}};e.innerHTML=k(n,S,!1),A(e),j(e);try{const r=sessionStorage.getItem("feedia.open-tab");if(r){sessionStorage.removeItem("feedia.open-tab");const c=e.querySelector(`.pz-tab[data-tab="${r}"]`);c&&c.click()}}catch{}const[a,l]=await Promise.all([b("/api/personalization",null),b("/api/personalization/catalogs",null)]);if(a.data||l.data){const r={...w,...t??{},...a.data??{}},c={...S,...l.data??{}};e.innerHTML=k(r,c,!1),A(e),j(e)}else if(a.error){const r=e.querySelector("h1");r&&!r.innerHTML.includes("offline")&&(r.innerHTML+=' <span class="small muted" style="font-weight:400;font-size:12px;background:rgba(0,0,0,0.2);padding:3px 8px;border-radius:12px;margin-left:8px;">\u{1F4E1} offline</span>')}};
