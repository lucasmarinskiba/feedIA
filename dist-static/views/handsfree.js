import{escape as h}from"../lib/dom.js";import{toast as k}from"../lib/toast.js";let m=[],F=null,p=null,S=!1,x=!1,y=!0,$=null,g="",z=!1,C=null,v=null;const N=async()=>{try{const o=await(await fetch("/api/voice/elevenlabs/status")).json();z=!!o?.configured,C=o?.voiceId||null}catch{z=!1}},P=async e=>{try{const o=await fetch("/api/voice/elevenlabs/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,voiceId:C})});if(!o.ok)throw new Error(`http ${o.status}`);const r=await o.blob(),i=URL.createObjectURL(r);if(v)try{v.pause()}catch{}return v=new Audio(i),v.play().catch(()=>{}),v.onended=()=>URL.revokeObjectURL(i),!0}catch{return!1}},q=()=>{if(!window.speechSynthesis)return null;const e=window.speechSynthesis.getVoices();if(!e.length)return null;const o=[/es-AR/i,/es-MX/i,/es-US/i,/es-419/i,/es-ES/i,/^es/i];for(const r of o){const i=e.find(a=>r.test(a.lang));if(i)return i}return e[0]},V=(e,{interrupt:o=!0,rate:r=1.05,pitch:i=1.02}={})=>{if(!window.speechSynthesis||!e)return;o&&window.speechSynthesis.cancel();const a=new SpeechSynthesisUtterance(String(e).slice(0,280));a.lang="es-AR",a.rate=r,a.pitch=i,$||($=q()),$&&(a.voice=$);try{window.speechSynthesis.speak(a)}catch{}},b=async(e,o={})=>{if(!(!y||!e)){if(z){if(o.interrupt!==!1&&v){try{v.pause()}catch{}v=null}if(await P(e))return;z=!1}V(e,o)}},L=()=>{try{window.speechSynthesis?.cancel()}catch{}if(v){try{v.pause()}catch{}v=null}},U=async()=>{try{let e="";try{e=JSON.parse(localStorage.getItem("feedia.brujula.account")||"{}").handle||""}catch{}const r=await(await fetch("/api/account/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get",accountId:e})})).json(),a=((r?.profile?.brandKit||r?.profile||{}).handle||e||"").replace(/^@/,"").split(/[._\-]/)[0];g=a&&a.length>1?a.charAt(0).toUpperCase()+a.slice(1):""}catch{g=""}},M=/\bfeedia\b/i,I=e=>e.replace(M,"").trim(),R=["En seguida","Dale","Voy","Manos a la obra","Vamos"],T=()=>{const e=R[Math.floor(Math.random()*R.length)];return g?`${e} ${g}`:`${e}`},H=e=>/carrusel|reel|historia|stories|post|publicar|generar|crear|hac[eé]/i.test(e),D=async()=>{try{(await fetch("/api/cua/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"auto"})})).ok&&(document.body.dataset.cuMode="auto")}catch{}},O=async()=>{try{return(await import("../lib/platform.js")).getPlatform()}catch{return"instagram"}},J=e=>`
  <div class="hf-shell">
    <div class="hf-header">
      <div class="hf-hdr-left">
        <span class="hf-dot"></span>
        <span class="hf-title">Manos Libres</span>
        <span class="hf-platform">\u2192 ${h(e)}</span>
      </div>
      <div class="hf-hdr-right">
        <button id="hf-cfg" class="hf-iconbtn" title="Configurar voz premium (ElevenLabs)">\u2699\uFE0F</button>
        <button id="hf-tts" class="hf-iconbtn" title="Voz on/off">\u{1F50A}</button>
        <button id="hf-always" class="hf-iconbtn" title="Modo siempre escuchando (dec\xED 'feedia' + comando)">\u{1F442}</button>
        <button id="hf-clear" class="hf-iconbtn" title="Limpiar log">\u2298</button>
        <button id="hf-close" class="hf-iconbtn" title="Volver a Hola FeedIA">\u2715</button>
      </div>
    </div>

    <details id="hf-cfg-panel" class="hf-cfg-panel">
      <summary class="hf-cfg-sum">\u{1F50A} Asistente de voz</summary>
      <div class="hf-cfg-body">
        <p class="hf-cfg-hint">FeedIA narra cada acci\xF3n, gu\xEDa y relata Computer Use en tiempo real. Elige tu estilo de voz para asistencia personalizada.</p>
        <div class="hf-cfg-row">
          <select id="hf-voice-style" class="hf-input" style="width:100%;">
            <option value="professional">Profesional \xB7 Tono ejecutivo</option>
            <option value="warm">C\xE1lida \xB7 Tono amigable</option>
            <option value="concise">Concisa \xB7 Tono directo</option>
            <option value="narrative">Narrativa \xB7 Tono relato</option>
          </select>
        </div>
        <div class="hf-cfg-actions">
          <button id="hf-voice-test" class="hf-iconbtn" style="width:auto;padding:6px 14px;">\u{1F50A} Probar</button>
          <span id="hf-voice-status" class="hf-cfg-status"></span>
        </div>
      </div>
    </details>

    <div class="hf-input-row">
      <textarea id="hf-input" class="hf-input" rows="3" placeholder='Decile a FeedIA qu\xE9 quer\xE9s que haga. Ej: "Feedia, cre\xE1 un carrusel sobre IA" \u2014 o toc\xE1 \u{1F399}\uFE0F y dict\xE1. Activ\xE1 \u{1F442} para modo manos libres total.'></textarea>
      <button id="hf-mic" class="hf-mic" title="Dictar por voz (toc\xE1 para empezar, toc\xE1 de nuevo para parar)">\u{1F399}\uFE0F</button>
    </div>
    <div class="hf-row-actions">
      <label class="hf-cb"><input type="checkbox" id="hf-autopublish" /> \u{1F680} Auto-publicar (requiere cuenta conectada)</label>
      <button id="hf-go" class="hf-go">\u25B6 Ejecutar</button>
    </div>

    <div class="hf-divider"><span>actividad en vivo</span></div>

    <div id="hf-timeline" class="hf-timeline">
      <div class="hf-empty">Esperando tu pedido\u2026</div>
    </div>

    <div id="hf-output" class="hf-output" hidden></div>
  </div>

  <style>
    .hf-shell{max-width:880px;margin:20px auto;padding:0 16px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,Arial,sans-serif;}
    .hf-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border);border-radius:12px 12px 0 0;background:linear-gradient(180deg,#0F0F14,#16161E);}
    .hf-hdr-left{display:flex;align-items:center;gap:10px;}
    .hf-dot{width:10px;height:10px;border-radius:50%;background:#10F2B0;box-shadow:0 0 10px #10F2B0;animation:hf-pulse 1.4s ease-in-out infinite;}
    @keyframes hf-pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
    .hf-title{font-weight:800;font-size:14px;color:#fff;letter-spacing:1px;}
    .hf-platform{font-size:11px;color:#a78bfa;}
    .hf-hdr-right{display:flex;gap:6px;}
    .hf-iconbtn{background:rgba(255,255,255,.06);border:1px solid var(--border);color:#fff;width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;}
    .hf-iconbtn:hover{background:rgba(255,255,255,.12);}
    .hf-cfg-panel{border-left:1px solid var(--border);border-right:1px solid var(--border);background:#0A0A0F;}
    .hf-cfg-sum{cursor:pointer;list-style:none;padding:10px 14px;font-size:12px;color:#a78bfa;font-weight:700;border-bottom:1px solid var(--border);user-select:none;}
    .hf-cfg-sum::-webkit-details-marker{display:none;}
    .hf-cfg-body{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:8px;}
    .hf-cfg-hint{font-size:11.5px;color:#9CA3AF;line-height:1.5;margin:0;}
    .hf-cfg-hint a{color:#a78bfa;text-decoration:underline;}
    .hf-cfg-row{display:flex;gap:8px;align-items:center;}
    .hf-cfg-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
    .hf-cfg-status{font-size:11px;}
    .hf-input-row{display:flex;gap:8px;padding:14px;border-left:1px solid var(--border);border-right:1px solid var(--border);background:#0A0A0F;align-items:stretch;}
    .hf-input{flex:1;background:rgba(255,255,255,.04);color:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:14.5px;font-family:inherit;resize:vertical;line-height:1.5;}
    .hf-input:focus{outline:none;border-color:#a855f7;}
    .hf-mic{width:58px;background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;border:none;border-radius:10px;font-size:22px;cursor:pointer;transition:transform .15s;}
    .hf-mic.listening{background:linear-gradient(135deg,#ef4444,#f59e0b);animation:hf-pulse 1s ease-in-out infinite;}
    .hf-mic:hover{transform:scale(1.05);}
    .hf-row-actions{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-left:1px solid var(--border);border-right:1px solid var(--border);background:#0A0A0F;border-bottom:1px solid var(--border);}
    .hf-cb{font-size:12px;color:#9CA3AF;display:flex;align-items:center;gap:6px;cursor:pointer;}
    .hf-go{background:linear-gradient(135deg,#10F2B0,#3B82F6);color:#0A0A0F;border:none;padding:8px 22px;border-radius:8px;font-weight:900;font-size:13px;cursor:pointer;letter-spacing:1px;}
    .hf-go:hover{filter:brightness(1.1);}
    .hf-go:disabled{opacity:.5;cursor:wait;}
    .hf-divider{display:flex;align-items:center;gap:10px;margin:14px 0 6px;font-size:10.5px;color:#6B7280;letter-spacing:3px;text-transform:uppercase;}
    .hf-divider::before,.hf-divider::after{content:"";flex:1;height:1px;background:var(--border);}
    .hf-timeline{padding:12px 14px;border:1px solid var(--border);border-radius:0 0 12px 12px;background:#070710;min-height:140px;font-family:"SF Mono","Cascadia Mono",Menlo,monospace;font-size:12.5px;line-height:1.7;color:#E5E7EB;}
    .hf-empty{color:#4B5563;font-style:italic;font-family:inherit;font-size:13px;}
    .hf-event{display:grid;grid-template-columns:60px 22px 1fr;gap:10px;padding:3px 0;animation:hf-slide-in .25s ease-out;}
    @keyframes hf-slide-in{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:none;}}
    .hf-event-time{color:#6B7280;}
    .hf-event-icon{text-align:center;}
    .hf-event-text{color:#E5E7EB;}
    .hf-event.fail .hf-event-text{color:#FCA5A5;}
    .hf-event.warn .hf-event-text{color:#FBBF24;}
    .hf-event.pending .hf-event-text{color:#A78BFA;}
    .hf-output{margin-top:16px;padding:14px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(180deg,rgba(16,242,176,.05),rgba(59,130,246,.03));}
    .hf-out-title{font-size:11px;font-weight:800;letter-spacing:2px;color:#10F2B0;margin-bottom:10px;text-transform:uppercase;}
    .hf-out-section{margin-bottom:10px;}
    .hf-out-label{font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;}
    .hf-out-text{font-size:13.5px;color:#fff;line-height:1.5;}
    .hf-slides{display:flex;gap:8px;overflow-x:auto;padding:6px 0;scroll-snap-type:x mandatory;margin-top:6px;}
    .hf-slide{flex:0 0 auto;width:140px;cursor:zoom-in;position:relative;transition:transform .15s;}
    .hf-slide:hover{transform:scale(1.04);}
    .hf-slide img{width:140px;height:187px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block;}
    .hf-slide-tag{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.75);color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;}
    .hf-pending-badge{display:inline-block;padding:3px 9px;border-radius:6px;background:rgba(168,85,247,.15);color:#A78BFA;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:6px;}
    /* Lightbox WhatsApp-style */
    .hf-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:hf-fade .2s ease-out;}
    @keyframes hf-fade{from{opacity:0;}to{opacity:1;}}
    .hf-lb-close{position:absolute;top:16px;right:18px;background:rgba(255,255,255,.1);color:#fff;border:none;width:42px;height:42px;border-radius:50%;font-size:20px;cursor:pointer;font-weight:700;}
    .hf-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);color:#fff;border:none;width:54px;height:54px;border-radius:50%;font-size:34px;cursor:pointer;line-height:1;}
    .hf-lb-nav:disabled{opacity:.25;cursor:not-allowed;}
    .hf-lb-prev{left:16px;}.hf-lb-next{right:16px;}
    .hf-lb-stage img{max-width:90vw;max-height:80vh;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.6);}
    .hf-lb-meta{color:rgba(255,255,255,.85);font-size:13px;text-align:center;margin-top:10px;background:rgba(0,0,0,.5);padding:6px 14px;border-radius:8px;display:inline-block;}
    .hf-lb-dl{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#a855f7;color:#fff;text-decoration:none;padding:10px 22px;border-radius:24px;font-size:13px;font-weight:800;}
    .hf-suggest{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
    .hf-chip{font-size:11.5px;background:rgba(168,85,247,.12);color:#C4B5FD;border:1px solid rgba(168,85,247,.3);padding:5px 11px;border-radius:14px;cursor:pointer;transition:all .15s;}
    .hf-chip:hover{background:rgba(168,85,247,.25);}
  </style>`,K=e=>`+${(e/1e3).toFixed(1)}s`,w=e=>{const o=e.querySelector("#hf-timeline");if(o){if(!m.length){o.innerHTML='<div class="hf-empty">Esperando tu pedido\u2026</div>';return}o.innerHTML=m.map(r=>`
    <div class="hf-event ${r.status||"done"}">
      <span class="hf-event-time">${h(K(r.at))}</span>
      <span class="hf-event-icon">${h(r.icon||"\xB7")}</span>
      <span class="hf-event-text">${h(r.text||"")}</span>
    </div>`).join(""),o.scrollTop=o.scrollHeight}},B=(e,o)=>{const r=e.querySelector("#hf-output");if(!r)return;if(!o){r.hidden=!0;return}const i=o.output||{},a=o.decision||{},u=Array.isArray(i.carouselSlides)?i.carouselSlides:i.image?.url?[{n:1,role:"output",dataUrl:i.image.url}]:[];r.hidden=!1,r.innerHTML=`
    <div class="hf-out-title">Resultado</div>
    ${i.pending?`<div class="hf-pending-badge">${h(i.reason||"PENDIENTE")}</div>`:""}
    ${a.archetype?`<div class="hf-out-section"><div class="hf-out-label">Voz \xB7 Est\xE9tica \xB7 Roles</div><div class="hf-out-text"><b>${h(a.archetype)}</b> \xB7 ${h(a.mood||"")} \xB7 ${(a.roles||[]).join(" + ")}</div></div>`:""}
    ${i.content?.hook?`<div class="hf-out-section"><div class="hf-out-label">Hook</div><div class="hf-out-text">${h(i.content.hook)}</div></div>`:""}
    ${i.content?.caption?`<div class="hf-out-section"><div class="hf-out-label">Caption</div><div class="hf-out-text">${h(i.content.caption.slice(0,400))}${i.content.caption.length>400?"\u2026":""}</div></div>`:""}
    ${i.reply?`<div class="hf-out-section"><div class="hf-out-label">Respuesta</div><div class="hf-out-text">${h(i.reply)}</div></div>`:""}
    ${u.length?`
      <div class="hf-out-section">
        <div class="hf-out-label">${u.length} slide${u.length>1?"s":""}</div>
        <div class="hf-slides">
          ${u.map((n,t)=>`<div class="hf-slide" data-idx="${t}"><img src="${h(n.dataUrl)}" alt="slide ${n.n}" loading="lazy" /><span class="hf-slide-tag">${n.n}</span></div>`).join("")}
        </div>
      </div>`:""}
    ${i.publish?.ok?`<div class="hf-out-section"><div class="hf-out-label">Publicado</div><div class="hf-out-text" style="color:#10F2B0;">\u2713 ${h(i.publish.mediaId||"OK")}</div></div>`:""}`;const c=u,l=n=>{let t=n;const s=document.createElement("div");s.className="hf-lightbox";const f=()=>{const d=c[t];d&&(s.innerHTML=`<button class="hf-lb-close">\u2715</button><button class="hf-lb-nav hf-lb-prev" ${t===0?"disabled":""}>\u2039</button><div class="hf-lb-stage"><img src="${h(d.dataUrl)}" /><div class="hf-lb-meta">Slide ${d.n} / ${c.length}</div></div><button class="hf-lb-nav hf-lb-next" ${t===c.length-1?"disabled":""}>\u203A</button><a class="hf-lb-dl" href="${h(d.dataUrl)}" download="hf-slide-${d.n}.svg">\u2B07 Descargar</a>`,s.querySelector(".hf-lb-close").onclick=()=>s.remove(),s.querySelector(".hf-lb-prev").onclick=()=>{t>0&&(t--,f())},s.querySelector(".hf-lb-next").onclick=()=>{t<c.length-1&&(t++,f())})};s.addEventListener("click",d=>{d.target===s&&s.remove()}),document.addEventListener("keydown",function d(E){if(!document.body.contains(s)){document.removeEventListener("keydown",d);return}E.key==="Escape"&&s.remove(),E.key==="ArrowLeft"&&t>0&&(t--,f()),E.key==="ArrowRight"&&t<c.length-1&&(t++,f())}),f(),document.body.appendChild(s)};r.querySelectorAll(".hf-slide").forEach(n=>n.addEventListener("click",()=>l(parseInt(n.dataset.idx,10)||0)))},W=e=>{const o=window.SpeechRecognition||window.webkitSpeechRecognition;if(!o){e.querySelector("#hf-mic")?.setAttribute("disabled","true"),e.querySelector("#hf-mic").title="Voz no disponible en este navegador (prob\xE1 Chrome)";return}p=new o,p.lang="es-AR",p.continuous=!0,p.interimResults=!0;let r="",i=null;p.onresult=a=>{let u="",c="";for(let t=a.resultIndex;t<a.results.length;t++){const s=a.results[t][0].transcript;a.results[t].isFinal?c+=s:u+=s}c&&(r+=" "+c);const l=(r+" "+u).trim(),n=e.querySelector("#hf-input");n&&(n.value=l),c&&M.test(l)&&(clearTimeout(i),i=setTimeout(()=>{const t=I(l);t.length>5&&(b(T()+". Empezando."),r="",n&&(n.value=t),j(e,{spoken:!0}))},900))},p.onend=()=>{if(x)try{p.start()}catch{}else S=!1,e.querySelector("#hf-mic")?.classList.remove("listening")},p.onerror=a=>{a.error==="no-speech"||a.error==="aborted"||(S=!1,x=!1,e.querySelector("#hf-mic")?.classList.remove("listening"),k(`Voz: ${a.error||"error"}`,"warn"))},window.speechSynthesis&&(window.speechSynthesis.onvoiceschanged=()=>{$=q()},setTimeout(()=>{$=q()},200))},j=async(e,{spoken:o=!1}={})=>{const r=e.querySelector("#hf-input"),i=e.querySelector("#hf-go"),a=!!e.querySelector("#hf-autopublish")?.checked,u=(r?.value||"").trim(),c=I(u);if(!c){o?b("No te escuch\xE9 bien. Repet\xED, por favor."):k("Escrib\xED o dict\xE1 qu\xE9 quer\xE9s que haga","warn");return}m=[{at:0,icon:"\u{1F399}\uFE0F",text:`Vos: "${c}"`,status:"done"}],w(e),i.disabled=!0,i.textContent="\u23F3 Procesando\u2026",H(c)?(m.push({at:1,icon:"\u{1F916}",text:"Activando Computer Use para visualizar la creaci\xF3n\u2026",status:"done"}),w(e),D(),o&&b(`${T()}. Activ\xE9 el modo autom\xE1tico y empiezo el carrusel.`,{interrupt:!0})):o&&b(`${T()}. Procesando.`);try{let l="";try{l=JSON.parse(localStorage.getItem("feedia.brujula.account")||"{}").handle||""}catch{}const n=await O(),s=await(await fetch("/api/handsfree/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:c,accountId:l,platform:n,autoPublish:a,goal:"engagement"})})).json();if(!s.ok){m.push({at:0,icon:"\u2717",text:s.message||s.error||"Error desconocido",status:"fail"}),w(e),o&&b("Hubo un problema. "+(s.message||s.error||"reintenta"));return}if((s.timeline||[]).forEach((f,d)=>{m.push(f),o&&d<4&&f.text&&f.status!=="fail"&&(d===1||/carrusel|reel|publicado|listo/i.test(f.text))&&setTimeout(()=>b(f.text.replace(/[…✓✗🎨🧠🤖💬📊]/g,"").trim().slice(0,120)),d*800)}),w(e),F=s,B(e,s),o){const f=s.output||{},d=(f.carouselSlides||[]).length,E=f.content?.hook||"";let A=g?`Listo ${g}. `:"Listo. ";d?A+=`Gener\xE9 ${d} slides. El hook dice: ${E}`:f.reply?A+="Te prepar\xE9 la respuesta.":s.action?A+=`Acci\xF3n ${s.action} completada.`:A+="Revisa el resultado abajo.",setTimeout(()=>b(A),1200)}}catch(l){m.push({at:0,icon:"\u2717",text:`Error de red: ${l?.message||"sin respuesta"}`,status:"fail"}),w(e),o&&b("Error de red. Volv\xE9 a probar.")}finally{i.disabled=!1,i.textContent="\u25B6 Ejecutar"}};export const renderHandsFree=async(e,{navigate:o}={})=>{const r=await O();e.innerHTML=J(r),await Promise.all([U(),N()]),W(e),w(e),B(e,F),setTimeout(()=>{if(y){const t=g?`Hola ${g}. Activ\xE1 el modo manos libres tocando el o\xEDdo arriba. O decime "Feedia" y tu pedido.`:'Hola. Activ\xE1 el modo manos libres tocando el o\xEDdo arriba. O decime "Feedia" y tu pedido.';b(t,{interrupt:!1})}},600),e.querySelector("#hf-close")?.addEventListener("click",()=>{L(),o?.("feed")||(window.location.hash="#feed")}),e.querySelector("#hf-go")?.addEventListener("click",()=>j(e)),e.querySelector("#hf-input")?.addEventListener("keydown",t=>{t.key==="Enter"&&(t.ctrlKey||t.metaKey)&&(t.preventDefault(),j(e))}),e.querySelector("#hf-mic")?.addEventListener("click",()=>{if(p){if(S){try{p.stop()}catch{}x=!1;return}try{x=!1,p.start(),S=!0,e.querySelector("#hf-mic").classList.add("listening")}catch(t){k(`No pude activar el mic: ${t?.message||""}`,"warn")}}});const i=e.querySelector("#hf-always");i?.addEventListener("click",()=>{if(p)if(x=!x,i.classList.toggle("active",x),i.style.background=x?"linear-gradient(135deg,#10F2B0,#3B82F6)":"",i.style.color=x?"#0A0A0F":"",x){try{p.start(),S=!0,e.querySelector("#hf-mic").classList.add("listening")}catch{}b(g?`Modo manos libres activado ${g}. Decime "Feedia" y tu pedido.`:'Modo manos libres activado. Decime "Feedia" y tu pedido.'),k('\u{1F442} Escuchando siempre. Dec\xED "Feedia" + comando.',"ok")}else{try{p.stop()}catch{}S=!1,e.querySelector("#hf-mic").classList.remove("listening"),L(),k("\u{1F442} Modo continuo desactivado","info")}});const a=e.querySelector("#hf-tts");a?.addEventListener("click",()=>{y=!y,a.textContent=y?"\u{1F50A}":"\u{1F507}",a.title=y?"Voz ON \xB7 click para silenciar":"Voz OFF \xB7 click para activar",y?b("Voz activada"):L()}),e.querySelector("#hf-clear")?.addEventListener("click",()=>{m=[],F=null,w(e),B(e,null)});const u=e.querySelector("#hf-cfg-panel");e.querySelector("#hf-cfg")?.addEventListener("click",()=>{u.open=!u.open});let l=localStorage.getItem("feedia-voice-style")||"professional";const n=e.querySelector("#hf-voice-style");n&&(n.value=l,n.addEventListener("change",t=>{l=t.target.value,localStorage.setItem("feedia-voice-style",l),k(`Asistente en modo ${t.target.options[t.target.selectedIndex].text}`,"ok")})),e.querySelector("#hf-voice-test")?.addEventListener("click",()=>{const t=l==="professional"?"Modo profesional activado":l==="warm"?"Modo c\xE1lido y amigable":l==="concise"?"Modo conciso y directo":"Modo narrativa activado";b(g?`Hola ${g}. ${t}.`:t)}),window.addEventListener("hashchange",()=>{L(),x=!1;try{p?.stop()}catch{}},{once:!0})};
