import{apiSafe as k}from"./api.js";const i=t=>document.getElementById(t),d=t=>String(t??"").replace(/[&<>"]/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[o]),A=[{emoji:"\u23F0",text:"\xBFCu\xE1l es la mejor hora para publicar?"},{emoji:"\u{1F0CF}",text:"Dame una idea de carrusel viral sobre IA"},{emoji:"\u{1F4CA}",text:"Analiz\xE1 mi marca en Instagram"},{emoji:"\u{1F3AC}",text:"5 hooks para un reel de automatizaci\xF3n"},{emoji:"\u{1F4C8}",text:"\xBFC\xF3mo subo mi engagement rate?"},{emoji:"\u{1F5D3}\uFE0F",text:"Estrategia de contenido para 30 d\xEDas"},{emoji:"\u{1F3AF}",text:"\xBFQu\xE9 formato me funciona mejor?"},{emoji:"\u{1F6E1}\uFE0F",text:"\xBFHay alg\xFAn riesgo de shadowban hoy?"}],H=[{e:"\u{1F3A8}",n:"Nova",t:"Dise\xF1adora \u2014 arma carruseles, reels y stories con tu marca"},{e:"\u270D\uFE0F",n:"L\xEDa",t:"Copywriter \u2014 escribe captions, hooks y respuestas con voz de marca"},{e:"\u{1F6E1}\uFE0F",n:"Gard",t:"Compliance \u2014 valida tono, riesgo, hashtags y pol\xEDticas antes de publicar"},{e:"\u{1F680}",n:"Luca",t:"Publisher \u2014 sube los posts a Instagram (API o Computer Use)"},{e:"\u{1F4C8}",n:"Mira",t:"M\xE9tricas \u2014 analiza performance y programa boosts cuando conviene"}];let T=0;const x=(t,o,a=8)=>{const s=`cblg-${++T}`;return`
  <svg viewBox="0 0 40 40" width="${t}" height="${o}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${s}g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
      <clipPath id="${s}"><rect width="40" height="40" rx="${a}"/></clipPath>
    </defs>
    <rect width="40" height="40" rx="${a}" fill="url(#${s}g)"/>
    <g clip-path="url(#${s})" stroke="rgba(255,255,255,.85)" stroke-width="0.85" stroke-linecap="round">
      <line x1="20" y1="6"  x2="30" y2="9"/><line x1="30" y1="9"  x2="35" y2="18"/>
      <line x1="35" y1="18" x2="33" y2="28"/><line x1="33" y1="28" x2="25" y2="35"/>
      <line x1="25" y1="35" x2="14" y2="35"/><line x1="14" y1="35" x2="6"  y2="28"/>
      <line x1="6"  y1="28" x2="5"  y2="18"/><line x1="5"  y1="18" x2="11" y2="9"/>
      <line x1="11" y1="9"  x2="20" y2="6"/><line x1="20" y1="22" x2="24" y2="14"/>
      <line x1="20" y1="22" x2="30" y2="23"/><line x1="20" y1="22" x2="23" y2="31"/>
      <line x1="20" y1="22" x2="13" y2="31"/><line x1="20" y1="22" x2="11" y2="21"/>
    </g>
    <g fill="white" clip-path="url(#${s})">
      <circle cx="20" cy="6"  r="1.7"/><circle cx="30" cy="9"  r="1.7"/>
      <circle cx="35" cy="18" r="1.7"/><circle cx="33" cy="28" r="1.7"/>
      <circle cx="25" cy="35" r="1.7"/><circle cx="14" cy="35" r="1.7"/>
      <circle cx="6"  cy="28" r="1.7"/><circle cx="5"  cy="18" r="1.7"/>
      <circle cx="11" cy="9"  r="1.7"/><circle cx="20" cy="22" r="1.9"/>
    </g>
  </svg>`};let r=[],g=!1,y=!1,E=()=>{};const j=()=>`
  <div class="chatbot-welcome ${localStorage.getItem("chatbot-welcome-dismissed")==="1"?"hidden":""}">
    <!-- Dismissible tip card -->
    <div class="chatbot-hero-card">
      <button class="chatbot-welcome-close" id="chatbot-welcome-close" aria-label="Cerrar" title="Cerrar tutorial">\u2715</button>
      <div class="chatbot-hero-logo-wrap" style="margin-bottom:12px;">
        <div class="chatbot-hero-logo">${x(40,40,10)}</div>
      </div>
      <h2 style="margin:0;font-size:14px;font-weight:700;margin-bottom:6px;">
        Hola, soy <span class="chatbot-grad">FeedIA</span> \u2726
      </h2>
      <p style="margin:0;font-size:12px;color:#a5b4fc;line-height:1.4;margin-bottom:8px;">
        Tu especialista en Instagram. Conozco tu marca, tus m\xE9tricas y manejo tu equipo IA.
      </p>
      <div class="chatbot-hero-hint" style="font-size:11px;">
        <span>\u{1F4A1}</span> Prob\xE1 una sugerencia o escribime libre.
      </div>
    </div>
  </div>`,I=t=>{const o=t.role==="user",a=t.tools?.length?`
    <div class="chatbot-tools-row">
      ${t.tools.map(n=>`<a class="chatbot-tool-chip" href="#${d(n.route??"")}" data-route="${d(n.route??"")}">${n.icon??"\u2192"} ${d(n.label)}</a>`).join("")}
    </div>`:"",s=t.html??d(t.content??""),e=new Date(t.ts??Date.now()).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});return`
    <div class="chatbot-msg-row ${o?"user":"bot"}">
      ${o?"":`<div class="chatbot-msg-avatar">${x(26,26,6)}</div>`}
      <div class="chatbot-msg-bubble ${o?"user":"bot"}">
        <div class="chatbot-msg-text">${s}</div>
        ${a}
        <div class="chatbot-msg-ts">${e}</div>
      </div>
    </div>`},q=()=>`
  <div class="chatbot-msg-row bot">
    <div class="chatbot-msg-avatar">${x(26,26,6)}</div>
    <div class="chatbot-msg-bubble bot">
      <div class="chatbot-typing-row"><span></span><span></span><span></span></div>
    </div>
  </div>`,M=()=>`
  <div class="chatbot-sugg-grid">
    ${A.map(t=>`<button class="chatbot-sugg" data-q="${d(t.text)}">${t.emoji} ${d(t.text)}</button>`).join("")}
  </div>`,v=()=>{const t=i("chatbot-log");if(t){if(!r.length){t.innerHTML=j(),t.querySelector("#chatbot-welcome-close")?.addEventListener("click",()=>{localStorage.setItem("chatbot-welcome-dismissed","1");const a=t.querySelector(".chatbot-welcome");a&&(a.style.display="none")});return}t.innerHTML=r.map(I).join(""),y&&t.insertAdjacentHTML("beforeend",q()),t.scrollTop=t.scrollHeight,t.querySelectorAll(".chatbot-offline-retry[data-q]").forEach(o=>{o.addEventListener("click",()=>{r.at(-1)?.content==="Sin conexi\xF3n"&&r.pop(),m(o.dataset.q)})}),t.querySelectorAll(".chatbot-tool-chip[data-route]").forEach(o=>{o.addEventListener("click",a=>{a.preventDefault();const s=o.dataset.route;s&&(h(),E(s))})})}},w=()=>{const t=i("chatbot-sugg-box");t&&(t.style.display=r.length===0?"block":"none")},L=()=>{const t=i("chatbot-panel");t&&(g=!0,t.classList.add("open"),t.setAttribute("aria-hidden","false"),v(),w(),setTimeout(()=>i("chatbot-input")?.focus(),60))},h=()=>{g=!1;const t=i("chatbot-panel");t&&(t.classList.remove("open"),t.setAttribute("aria-hidden","true"),window.closeVoiceOverlay?.())},C=()=>{r=[],v(),w()},m=async t=>{const o=(t??"").trim();if(!o||y)return;r.push({role:"user",content:o,ts:Date.now()});const a=i("chatbot-input");a&&(a.value="",a.style.height="auto");const s=i("chatbot-send");s&&(s.disabled=!0),y=!0,w(),v();const{data:e,error:n}=await k("/api/assistant/chat",null,{method:"POST",body:{message:o,history:r.slice(-10,-1)}});y=!1,s&&(s.disabled=!1),n||!e?r.push({role:"assistant",html:`<div class="chatbot-offline-msg">
        <div class="chatbot-offline-title">\u{1F4E1} Estoy temporalmente sin conexi\xF3n</div>
        <div class="chatbot-offline-sub">El servidor de FeedIA no responde en este momento. Cuando vuelva, vas a poder consultarme sobre tu marca, m\xE9tricas y lanzar misiones.</div>
        <button class="chatbot-offline-retry" data-q="${d(o)}">\u21BB Reintentar</button>
      </div>`,content:"Sin conexi\xF3n",ts:Date.now()}):r.push({role:"assistant",content:e.reply??"",html:e.replyHtml,tools:e.tools??[],ts:Date.now()}),v()};export const initChatbotUI=({navigate:t})=>{E=t||(e=>{window.location.hash=`#${e}`}),i("chatbot-fab")?.addEventListener("click",()=>{g?h():L()}),i("chatbot-close")?.addEventListener("click",h),i("chatbot-clear")?.addEventListener("click",C),i("chatbot-form")?.addEventListener("submit",e=>{e.preventDefault(),m(i("chatbot-input")?.value??"")}),document.addEventListener("click",e=>{const n=e.target.closest?.(".chatbot-sugg");n&&n.dataset.q&&m(n.dataset.q)});const o=i("chatbot-input");o?.addEventListener("input",()=>{o.style.height="auto",o.style.height=Math.min(o.scrollHeight,100)+"px"}),o?.addEventListener("keydown",e=>{e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),m(o.value))}),document.addEventListener("keydown",e=>{e.key==="Escape"&&g&&h()});const a=i("chatbot-mic-btn"),s=typeof window<"u"?window.SpeechRecognition||window.webkitSpeechRecognition:null;if(a&&s){let e=null,n=!1;const p=()=>{n=!1,a.classList.remove("recording"),a.setAttribute("aria-label","Dictar mensaje");try{e?.stop()}catch{}};a.addEventListener("click",()=>{if(n){p();return}n=!0,a.classList.add("recording"),a.setAttribute("aria-label","Grabando\u2026 toc\xE1 para parar");const l=i("chatbot-input");e=new s,e.lang=navigator.language||"es-AR",e.continuous=!1,e.interimResults=!0,e.maxAlternatives=1;let f="",b=null;const $=()=>{clearTimeout(b),b=setTimeout(()=>{try{e?.stop()}catch{}},1800)};e.onresult=c=>{$();let S="";for(let u=c.resultIndex;u<c.results.length;u++)c.results[u].isFinal?f+=c.results[u][0].transcript+" ":S=c.results[u][0].transcript;l&&(l.value=(f+S).trim())},e.onend=()=>{clearTimeout(b),p();const c=(f||l?.value||"").trim();c&&c.split(/\s+/).filter(Boolean).length>=2&&m(c)},e.onerror=c=>{clearTimeout(b),c.error!=="aborted"&&(l&&(l.placeholder="Error de micr\xF3fono \u2014 verific\xE1 permisos"),setTimeout(()=>{l&&(l.placeholder="Preguntale lo que quieras a FeedIA\u2026")},3e3)),p()},$();try{e.start()}catch{p()}})}else a&&(a.style.display="none")},openChatbot=L;window.closeChatbotPanel=h;
