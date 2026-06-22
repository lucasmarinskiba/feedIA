import{api as c}from"../lib/api.js";import{escape as a}from"../lib/dom.js";import{fmt as l}from"../lib/dom.js";import{toast as r}from"../lib/toast.js";let t={conversations:[],active:null,messages:[],tab:"all"};const v={compra:"ok",consulta:"info",queja:"crit",spam:"muted",colaboracion:"accent",otros:"warn"},b=()=>{const s=t.tab==="all"?t.conversations:t.conversations.filter(e=>e.intent===t.tab||e.unread);return s.length?s.map(e=>`
    <div class="inbox-conv-item ${e.id===t.active?.id?"active":""} ${e.unread?"unread":""}" data-id="${a(e.id??"")}">
      <div class="inbox-conv-avatar">${a((e.handle??"@?").charAt(1).toUpperCase())}</div>
      <div class="inbox-conv-body">
        <div class="inbox-conv-handle small">${a(e.handle??"desconocido")}</div>
        <div class="inbox-conv-preview tiny muted">${a((e.lastMessage??"").slice(0,50))}\u2026</div>
      </div>
      <div class="inbox-conv-meta">
        <div class="tiny muted">${l.rel(e.updatedAt)}</div>
        ${e.intent?`<span class="tag tiny ${v[e.intent]??"info"}">${a(e.intent)}</span>`:""}
        ${e.unread?'<div class="unread-dot"></div>':""}
      </div>
    </div>`).join(""):'<div class="empty muted small">Sin conversaciones.</div>'},u=()=>{if(!t.active)return`
      <div class="inbox-empty-state">
        <div style="font-size:40px;opacity:0.3;">\u{1F4AC}</div>
        <div class="muted">Seleccion\xE1 una conversaci\xF3n</div>
      </div>`;const s=t.messages;return`
    <div class="inbox-header">
      <div class="inbox-conv-avatar lg">${a((t.active.handle??"@?").charAt(1).toUpperCase())}</div>
      <div>
        <div class="small" style="font-weight:600;">${a(t.active.handle??"")}</div>
        ${t.active.intent?`<span class="tag tiny ${v[t.active.intent]??"info"}">${a(t.active.intent)}</span>`:""}
      </div>
      <div style="margin-left:auto;" class="btn-row">
        <button class="btn ghost tiny" id="suggest-reply-btn">\u{1F916} Sugerir reply</button>
        <button class="btn ghost tiny" id="mark-read-btn">\u2713 Marcar le\xEDdo</button>
      </div>
    </div>
    <div class="messages-list">
      ${s.map(e=>`
        <div class="message-bubble ${e.fromUs?"outgoing":"incoming"}">
          <div class="message-text small">${a(e.text??"")}</div>
          <div class="message-time tiny muted">${l.rel(e.createdAt)}</div>
        </div>`).join("")}
    </div>
    <div class="inbox-compose">
      <textarea class="field-textarea compose-input" id="compose-text" rows="2" placeholder="Escrib\xED tu respuesta\u2026"></textarea>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn primary" id="send-reply-btn">\u{1F4E4} Enviar</button>
      </div>
      <div id="suggested-reply" style="display:none;" class="suggested-reply-box">
        <div class="small muted" style="margin-bottom:4px;">\u{1F4A1} Reply sugerido por IA:</div>
        <div id="suggested-text" class="body"></div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="btn ghost tiny" id="use-suggestion-btn">Usar este</button>
        </div>
      </div>
    </div>`},o=s=>{const e=s.querySelector("#inbox-sidebar"),i=s.querySelector("#inbox-main");e&&(e.innerHTML=b()),i&&(i.innerHTML=u()),p(s)},p=s=>{s.querySelectorAll(".inbox-conv-item").forEach(e=>e.addEventListener("click",async()=>{const i=e.dataset.id;t.active=t.conversations.find(n=>n.id===i)??null;try{const n=await c(`/api/inbox/messages?conversationId=${i}`);t.messages=n.messages??[]}catch{t.messages=[]}o(s)})),s.querySelector("#suggest-reply-btn")?.addEventListener("click",async()=>{if(!t.active)return;const e=s.querySelector("#suggest-reply-btn");e.disabled=!0,e.innerHTML='<span class="spinner"></span>';try{const i=await c("/api/inbox/suggest",{body:{conversationId:t.active.id}}),n=s.querySelector("#suggested-reply"),d=s.querySelector("#suggested-text");n&&d&&(d.textContent=i.suggestion??"",n.style.display="block")}catch(i){r(i.message,"crit")}finally{e.disabled=!1,e.innerHTML="\u{1F916} Sugerir reply"}}),s.querySelector("#use-suggestion-btn")?.addEventListener("click",()=>{const e=s.querySelector("#suggested-text")?.textContent??"",i=s.querySelector("#compose-text");i&&(i.value=e);const n=s.querySelector("#suggested-reply");n&&(n.style.display="none")}),s.querySelector("#send-reply-btn")?.addEventListener("click",async()=>{const e=s.querySelector("#compose-text")?.value.trim();if(!e){r("Escrib\xED un mensaje","crit");return}if(!t.active)return;const i=s.querySelector("#send-reply-btn");i.disabled=!0;try{await c("/api/inbox/reply",{body:{conversationId:t.active.id,text:e}}),t.messages.push({text:e,fromUs:!0,createdAt:new Date().toISOString()});const n=s.querySelector("#compose-text");n&&(n.value=""),o(s),r("Respuesta enviada","ok")}catch(n){r(n.message,"crit")}finally{i.disabled=!1}}),s.querySelector("#mark-read-btn")?.addEventListener("click",async()=>{if(t.active)try{await c("/api/inbox/mark-read",{body:{conversationId:t.active.id}});const e=t.conversations.find(i=>i.id===t.active.id);e&&(e.unread=!1),o(s)}catch(e){r(e.message,"crit")}})};export const renderInbox=async s=>{t={conversations:[],active:null,messages:[],tab:"all"},s.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Inbox</h1>
        <p class="view-subtitle page-subtitle">DMs y comentarios con respuestas asistidas por IA.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="poll-btn">\u21BB Polling</button>
      </div>
    </header>
    <div class="page-body">
      <div class="inbox-layout">
        <div id="inbox-sidebar" class="inbox-sidebar">
          <div class="page-loading"><span class="spinner"></span></div>
        </div>
        <div id="inbox-main" class="inbox-main">
          ${u()}
        </div>
      </div>
    </div>`,s.querySelector("#poll-btn")?.addEventListener("click",async()=>{const e=s.querySelector("#poll-btn");e.disabled=!0,e.innerHTML='<span class="spinner"></span>';try{await c("/api/bot/run",{body:{}});const i=await c("/api/inbox/conversations");t.conversations=i.conversations??[],o(s),r("Inbox actualizado","ok")}catch(i){r(i.message,"crit")}finally{e.disabled=!1,e.innerHTML="\u21BB Polling"}});try{const e=await c("/api/inbox/conversations");t.conversations=e.conversations??[]}catch{t.conversations=[]}o(s)};
