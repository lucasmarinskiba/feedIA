import{apiSafe as E}from"./api.js";const i=t=>document.getElementById(t),l=t=>String(t??"").replace(/[&<>"]/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[a]),j=[{emoji:"\u23F0",text:"\xBFCu\xE1l es la mejor hora para publicar?"},{emoji:"\u{1F0CF}",text:"Dame una idea de carrusel viral sobre IA"},{emoji:"\u{1F4CA}",text:"Analiz\xE1 mi marca en Instagram"},{emoji:"\u{1F3AC}",text:"5 hooks para un reel de automatizaci\xF3n"},{emoji:"\u{1F4C8}",text:"\xBFC\xF3mo subo mi engagement rate?"},{emoji:"\u{1F5D3}\uFE0F",text:"Estrategia de contenido para 30 d\xEDas"},{emoji:"\u{1F3AF}",text:"\xBFQu\xE9 formato me funciona mejor?"},{emoji:"\u{1F6E1}\uFE0F",text:"\xBFHay alg\xFAn riesgo de shadowban hoy?"}],S=[{e:"\u{1F3A8}",n:"Nova",t:"Dise\xF1adora \u2014 arma carruseles, reels y stories con tu marca"},{e:"\u270D\uFE0F",n:"L\xEDa",t:"Copywriter \u2014 escribe captions, hooks y respuestas con voz de marca"},{e:"\u{1F6E1}\uFE0F",n:"Gard",t:"Compliance \u2014 valida tono, riesgo, hashtags y pol\xEDticas antes de publicar"},{e:"\u{1F680}",n:"Luca",t:"Publisher \u2014 sube los posts a Instagram (API o Computer Use)"},{e:"\u{1F4C8}",n:"Mira",t:"M\xE9tricas \u2014 analiza performance y programa boosts cuando conviene"}];let T=0;const x=(t,a,o=8)=>{const s=`cblg-${++T}`;return`
  <svg viewBox="0 0 40 40" width="${t}" height="${a}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${s}g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
      <clipPath id="${s}"><rect width="40" height="40" rx="${o}"/></clipPath>
    </defs>
    <rect width="40" height="40" rx="${o}" fill="url(#${s}g)"/>
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
  </svg>`};let r=[],m=!1,v=!1,A=()=>{};const I=()=>`
  <div class="chatbot-welcome">
    <!-- Hero card: fondo claro con texto oscuro, contrasta sobre el panel dark -->
    <div class="chatbot-hero-card">
      <div class="chatbot-hero-orbs">
        <span class="chatbot-orb chatbot-orb-1"></span>
        <span class="chatbot-orb chatbot-orb-2"></span>
        <span class="chatbot-orb chatbot-orb-3"></span>
      </div>
      <div class="chatbot-hero-logo-wrap">
        <div class="chatbot-hero-logo">${x(54,54,14)}</div>
        <div class="chatbot-hero-pulse"></div>
      </div>
      <div class="chatbot-hero-eyebrow">
        <span class="chatbot-status-dot"></span>
        Asistente IA \xB7 en l\xEDnea
      </div>
      <h2 class="chatbot-hero-title">
        Hola, soy <span class="chatbot-grad">FeedIA</span> <span class="chatbot-sparkle">\u2726</span>
      </h2>
      <p class="chatbot-hero-sub">
        Tu agente IA especialista en Instagram. Conozco tu marca, tus m\xE9tricas y manejo a tu equipo IA.
      </p>
      <div class="chatbot-hero-hint">
        <span>\u{1F4A1}</span> Prob\xE1 una sugerencia abajo o escribime libre.
      </div>
    </div>

    <details class="chatbot-team-details">
      <summary>\u{1F465} \xBFQui\xE9nes son Nova, L\xEDa, Gard, Luca y Mira?</summary>
      <div class="chatbot-team-list">
        ${S.map(t=>`
          <div class="chatbot-team-row">
            <span class="chatbot-team-emoji">${t.e}</span>
            <div>
              <div class="chatbot-team-name">${l(t.n)}</div>
              <div class="chatbot-team-desc">${l(t.t)}</div>
            </div>
          </div>`).join("")}
        <div class="chatbot-team-foot">Son los agentes IA internos. Vos comand\xE1s, ellos ejecutan.</div>
      </div>
    </details>
  </div>`,q=t=>{const a=t.role==="user",o=t.tools?.length?`
    <div class="chatbot-tools-row">
      ${t.tools.map(n=>`<a class="chatbot-tool-chip" href="#${l(n.route??"")}" data-route="${l(n.route??"")}">${n.icon??"\u2192"} ${l(n.label)}</a>`).join("")}
    </div>`:"",s=t.html??l(t.content??""),e=new Date(t.ts??Date.now()).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});return`
    <div class="chatbot-msg-row ${a?"user":"bot"}">
      ${a?"":`<div class="chatbot-msg-avatar">${x(26,26,6)}</div>`}
      <div class="chatbot-msg-bubble ${a?"user":"bot"}">
        <div class="chatbot-msg-text">${s}</div>
        ${o}
        <div class="chatbot-msg-ts">${e}</div>
      </div>
    </div>`},H=()=>`
  <div class="chatbot-msg-row bot">
    <div class="chatbot-msg-avatar">${x(26,26,6)}</div>
    <div class="chatbot-msg-bubble bot">
      <div class="chatbot-typing-row"><span></span><span></span><span></span></div>
    </div>
  </div>`,C=()=>`
  <div class="chatbot-sugg-grid">
    ${j.map(t=>`<button class="chatbot-sugg" data-q="${l(t.text)}">${t.emoji} ${l(t.text)}</button>`).join("")}
  </div>`,g=()=>{const t=i("chatbot-log");if(t){if(!r.length){t.innerHTML=I();return}t.innerHTML=r.map(q).join(""),v&&t.insertAdjacentHTML("beforeend",H()),t.scrollTop=t.scrollHeight,t.querySelectorAll(".chatbot-offline-retry[data-q]").forEach(a=>{a.addEventListener("click",()=>{r.at(-1)?.content==="Sin conexi\xF3n"&&r.pop(),u(a.dataset.q)})}),t.querySelectorAll(".chatbot-tool-chip[data-route]").forEach(a=>{a.addEventListener("click",o=>{o.preventDefault();const s=a.dataset.route;s&&(y(),A(s))})})}},w=()=>{const t=i("chatbot-sugg-box");t&&(t.style.display=r.length===0?"block":"none")},k=()=>{const t=i("chatbot-panel");t&&(m=!0,t.classList.add("open"),t.setAttribute("aria-hidden","false"),g(),w(),setTimeout(()=>i("chatbot-input")?.focus(),60))},y=()=>{m=!1;const t=i("chatbot-panel");t&&(t.classList.remove("open"),t.setAttribute("aria-hidden","true"))},D=()=>{r=[],g(),w()},u=async t=>{const a=(t??"").trim();if(!a||v)return;r.push({role:"user",content:a,ts:Date.now()});const o=i("chatbot-input");o&&(o.value="",o.style.height="auto");const s=i("chatbot-send");s&&(s.disabled=!0),v=!0,w(),g();const{data:e,error:n}=await E("/api/assistant/chat",null,{method:"POST",body:{message:a,history:r.slice(-10,-1)}});v=!1,s&&(s.disabled=!1),n||!e?r.push({role:"assistant",html:`<div class="chatbot-offline-msg">
        <div class="chatbot-offline-title">\u{1F4E1} Estoy temporalmente sin conexi\xF3n</div>
        <div class="chatbot-offline-sub">El servidor de FeedIA no responde en este momento. Cuando vuelva, vas a poder consultarme sobre tu marca, m\xE9tricas y lanzar misiones.</div>
        <button class="chatbot-offline-retry" data-q="${l(a)}">\u21BB Reintentar</button>
      </div>`,content:"Sin conexi\xF3n",ts:Date.now()}):r.push({role:"assistant",content:e.reply??"",html:e.replyHtml,tools:e.tools??[],ts:Date.now()}),g()};export const initChatbotUI=({navigate:t})=>{A=t||(e=>{window.location.hash=`#${e}`}),i("chatbot-fab")?.addEventListener("click",()=>{m?y():k()}),i("chatbot-close")?.addEventListener("click",y),i("chatbot-clear")?.addEventListener("click",D),i("chatbot-form")?.addEventListener("submit",e=>{e.preventDefault(),u(i("chatbot-input")?.value??"")}),document.addEventListener("click",e=>{const n=e.target.closest?.(".chatbot-sugg");n&&n.dataset.q&&u(n.dataset.q)});const a=i("chatbot-input");a?.addEventListener("input",()=>{a.style.height="auto",a.style.height=Math.min(a.scrollHeight,100)+"px"}),a?.addEventListener("keydown",e=>{e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),u(a.value))}),document.addEventListener("keydown",e=>{e.key==="Escape"&&m&&y()});const o=i("chatbot-mic-btn"),s=typeof window<"u"?window.SpeechRecognition||window.webkitSpeechRecognition:null;if(o&&s){let e=null,n=!1;const b=()=>{n=!1,o.classList.remove("recording"),o.setAttribute("aria-label","Dictar mensaje");try{e?.stop()}catch{}};o.addEventListener("click",()=>{if(n){b();return}n=!0,o.classList.add("recording"),o.setAttribute("aria-label","Grabando\u2026 toc\xE1 para parar");const d=i("chatbot-input");e=new s,e.lang=navigator.language||"es-AR",e.continuous=!1,e.interimResults=!0,e.maxAlternatives=1;let f="",p=null;const $=()=>{clearTimeout(p),p=setTimeout(()=>{try{e?.stop()}catch{}},1800)};e.onresult=c=>{$();let L="";for(let h=c.resultIndex;h<c.results.length;h++)c.results[h].isFinal?f+=c.results[h][0].transcript+" ":L=c.results[h][0].transcript;d&&(d.value=(f+L).trim())},e.onend=()=>{clearTimeout(p),b();const c=(f||d?.value||"").trim();c&&c.split(/\s+/).filter(Boolean).length>=2&&u(c)},e.onerror=c=>{clearTimeout(p),c.error!=="aborted"&&(d&&(d.placeholder="Error de micr\xF3fono \u2014 verific\xE1 permisos"),setTimeout(()=>{d&&(d.placeholder="Preguntale lo que quieras a FeedIA\u2026")},3e3)),b()},$();try{e.start()}catch{b()}})}else o&&(o.style.display="none")},openChatbot=k;
