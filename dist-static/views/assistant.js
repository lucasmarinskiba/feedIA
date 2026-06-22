import{api as p}from"../lib/api.js";import{escape as o}from"../lib/dom.js";import{toast as v}from"../lib/toast.js";let n=[],r=!1;const g=["\xBFCu\xE1l es la mejor hora para publicar en mi nicho?","Generame una idea de carrusel viral sobre IA","Analiz\xE1 el estado actual de mi marca en Instagram","\xBFQu\xE9 tipo de contenido debo priorizar esta semana?","Dame 5 ideas de hooks para un reel de automatizaci\xF3n","\xBFC\xF3mo puedo mejorar mi engagement rate?","Cre\xE1 una estrategia de contenido para los pr\xF3ximos 30 d\xEDas","\xBFCu\xE1les son mis formatos con mejor rendimiento?"];let h=0;const d=(e,a,t=8)=>{const c=`clp-${++h}`;return`
  <svg viewBox="0 0 40 40" width="${e}" height="${a}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="${c}"><rect width="40" height="40" rx="${t}"/></clipPath>
    </defs>
    <rect width="40" height="40" rx="${t}" fill="url(#lg)"/>
    <g clip-path="url(#${c})" stroke="rgba(255,255,255,.82)" stroke-width="0.85" stroke-linecap="round">
      <line x1="20" y1="6"  x2="30" y2="9"/>  <line x1="30" y1="9"  x2="35" y2="18"/>
      <line x1="35" y1="18" x2="33" y2="28"/> <line x1="33" y1="28" x2="25" y2="35"/>
      <line x1="25" y1="35" x2="14" y2="35"/> <line x1="14" y1="35" x2="6"  y2="28"/>
      <line x1="6"  y1="28" x2="5"  y2="18"/> <line x1="5"  y1="18" x2="11" y2="9"/>
      <line x1="11" y1="9"  x2="20" y2="6"/>
      <line x1="24" y1="14" x2="30" y2="23"/> <line x1="30" y1="23" x2="23" y2="31"/>
      <line x1="23" y1="31" x2="13" y2="31"/> <line x1="13" y1="31" x2="11" y2="21"/>
      <line x1="11" y1="21" x2="24" y2="14"/>
      <line x1="20" y1="6"  x2="24" y2="14"/> <line x1="30" y1="9"  x2="24" y2="14"/>
      <line x1="30" y1="9"  x2="30" y2="23"/> <line x1="35" y1="18" x2="30" y2="23"/>
      <line x1="33" y1="28" x2="30" y2="23"/> <line x1="33" y1="28" x2="23" y2="31"/>
      <line x1="25" y1="35" x2="23" y2="31"/> <line x1="14" y1="35" x2="13" y2="31"/>
      <line x1="6"  y1="28" x2="13" y2="31"/> <line x1="6"  y1="28" x2="11" y2="21"/>
      <line x1="5"  y1="18" x2="11" y2="21"/> <line x1="11" y1="9"  x2="11" y2="21"/>
      <line x1="11" y1="9"  x2="24" y2="14"/>
      <line x1="20" y1="22" x2="24" y2="14"/> <line x1="20" y1="22" x2="30" y2="23"/>
      <line x1="20" y1="22" x2="23" y2="31"/> <line x1="20" y1="22" x2="13" y2="31"/>
      <line x1="20" y1="22" x2="11" y2="21"/>
    </g>
    <g fill="white" clip-path="url(#${c})">
      <circle cx="20" cy="6"  r="1.9"/> <circle cx="30" cy="9"  r="1.9"/>
      <circle cx="35" cy="18" r="1.9"/> <circle cx="33" cy="28" r="1.9"/>
      <circle cx="25" cy="35" r="1.9"/> <circle cx="14" cy="35" r="1.9"/>
      <circle cx="6"  cy="28" r="1.9"/> <circle cx="5"  cy="18" r="1.9"/>
      <circle cx="11" cy="9"  r="1.9"/> <circle cx="24" cy="14" r="1.9"/>
      <circle cx="30" cy="23" r="1.9"/> <circle cx="23" cy="31" r="1.9"/>
      <circle cx="13" cy="31" r="1.9"/> <circle cx="11" cy="21" r="1.9"/>
      <circle cx="20" cy="22" r="1.9"/>
    </g>
  </svg>`},m=e=>{const a=e.role==="user";return`
    <div class="chat-message ${a?"user":"assistant"}">
      ${a?"":`<div class="chat-avatar">${d(32,32)}</div>`}
      <div class="chat-bubble ${a?"user":"assistant"}">
        <div class="chat-text">${e.html??o(e.content??"")}</div>
        ${e.tools?.length?`
          <div class="chat-tools-row">
            ${e.tools.map(t=>`<a class="chat-tool-chip" href="#${t.route??""}" data-route="${t.route??""}">${t.icon??"\u2192"} ${o(t.label)}</a>`).join("")}
          </div>`:""}
        <div class="chat-meta">${new Date(e.ts??Date.now()).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</div>
      </div>
      ${a?'<div class="chat-user-avatar">\u{1F9D1}</div>':""}
    </div>`},b=()=>`
  <div class="chat-message assistant" id="thinking-bubble">
    <div class="chat-avatar">${d(32,32)}</div>
    <div class="chat-bubble assistant">
      <div class="chat-dots"><span></span><span></span><span></span></div>
    </div>
  </div>`,f=e=>{e.scrollTop=e.scrollHeight},l=e=>{if(!n.length){e.innerHTML=`
      <div class="chat-welcome">
        <div class="chat-welcome-icon">${d(64,64,16)}</div>
        <div class="chat-welcome-title">Hola, soy <span class="gradient-text">FeedIA</span> \u{1F44B}</div>
        <div class="chat-welcome-sub">Tu agente IA especialista en Instagram.<br>Preguntame lo que quieras sobre tu marca, estrategia y contenido.</div>
      </div>`;return}e.innerHTML=n.map(m).join(""),r&&e.insertAdjacentHTML("beforeend",b()),f(e)},y=async(e,a)=>{if(!a.trim()||r)return;n.push({role:"user",content:a,ts:Date.now()}),r=!0;const t=e.querySelector("#chat-messages"),c=e.querySelector("#chat-input"),s=e.querySelector("#chat-send-btn");c&&(c.value=""),s&&(s.disabled=!0),l(t);try{const i=await p("/api/assistant/chat",{body:{message:a,history:n.slice(-10,-1)}});n.push({role:"assistant",content:i.reply??"",html:i.replyHtml,tools:i.tools??[],ts:Date.now()})}catch(i){n.push({role:"assistant",content:`Lo siento, hubo un error: ${i.message}`,ts:Date.now()}),v(i.message,"crit")}finally{r=!1,s&&(s.disabled=!1),l(t),t.querySelectorAll(".chat-tool-chip[data-route]").forEach(i=>{i.addEventListener("click",x=>{x.preventDefault();const u=i.dataset.route;u&&document.querySelector(`[data-route="${u}"]`)?.click()})})}};export const renderAssistant=async e=>{n=[],r=!1,h=0,e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title gradient-text">\u2726 Asistente FeedIA</h1>
        <p class="view-subtitle page-subtitle">Agente IA conversacional \u2014 conoce tu marca, estrategia y datos.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost small" id="clear-chat-btn">\u{1F5D1} Limpiar chat</button>
      </div>
    </header>

    <div class="page-body chat-page-body">
    <div class="chat-layout">
      <!-- Suggestions sidebar -->
      <div class="chat-sidebar">
        <div class="small" style="font-weight:700;margin-bottom:12px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.5px;font-size:11px">Sugerencias</div>
        <div class="chat-suggestions">
          ${g.map(s=>`
            <button class="suggestion-chip">${o(s)}</button>`).join("")}
        </div>
        <div class="chat-sidebar-footer">
          <div class="tiny muted" style="margin-top:16px;border-top:1px solid var(--border-soft);padding-top:12px">
            \u{1F4A1} <strong>Tip:</strong> FeedIA tiene acceso a tu perfil de marca, m\xE9tricas y todo el historial de contenido.
          </div>
        </div>
      </div>

      <!-- Chat area -->
      <div class="chat-main">
        <div id="chat-messages" class="chat-messages"></div>

        <div class="chat-input-area">
          <div class="chat-input-row">
            <textarea class="chat-input" id="chat-input" placeholder="Preguntale cualquier cosa a FeedIA\u2026" rows="1"></textarea>
            <button class="btn gradient chat-send-btn" id="chat-send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
          <div class="tiny muted" style="margin-top:6px;text-align:center">
            FeedIA usa tu perfil de marca y datos de sesi\xF3n. Las respuestas son sugerencias, siempre revis\xE1 antes de publicar.
          </div>
        </div>
      </div>
    </div>
    </div>`;const a=e.querySelector("#chat-messages"),t=e.querySelector("#chat-input"),c=e.querySelector("#chat-send-btn");l(a),c?.addEventListener("click",()=>y(e,t?.value??"")),t?.addEventListener("keydown",s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),y(e,t.value))}),t?.addEventListener("input",()=>{t.style.height="auto",t.style.height=Math.min(t.scrollHeight,120)+"px"}),e.querySelectorAll(".suggestion-chip").forEach(s=>{s.addEventListener("click",()=>y(e,s.textContent??""))}),e.querySelector("#clear-chat-btn")?.addEventListener("click",()=>{n=[],l(a)})};
