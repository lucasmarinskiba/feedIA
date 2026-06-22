import{escape as u}from"../lib/dom.js";import{toast as x}from"../lib/toast.js";let y=[],L=null,f=null,E=!1,m=!1,w=!0,A=null,h="",k=!1,C=null,v=null;const O=async()=>{try{const t=await(await fetch("/api/voice/elevenlabs/status")).json();k=!!t?.configured,C=t?.voiceId||null}catch{k=!1}},V=async e=>{try{const t=await fetch("/api/voice/elevenlabs/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,voiceId:C})});if(!t.ok)throw new Error(`http ${t.status}`);const i=await t.blob(),o=URL.createObjectURL(i);if(v)try{v.pause()}catch{}return v=new Audio(o),v.play().catch(()=>{}),v.onended=()=>URL.revokeObjectURL(o),!0}catch{return!1}},F=()=>{if(!window.speechSynthesis)return null;const e=window.speechSynthesis.getVoices();if(!e.length)return null;const t=[/es-AR/i,/es-MX/i,/es-US/i,/es-419/i,/es-ES/i,/^es/i];for(const i of t){const o=e.find(a=>i.test(a.lang));if(o)return o}return e[0]},N=(e,{interrupt:t=!0,rate:i=1.05,pitch:o=1.02}={})=>{if(!window.speechSynthesis||!e)return;t&&window.speechSynthesis.cancel();const a=new SpeechSynthesisUtterance(String(e).slice(0,280));a.lang="es-AR",a.rate=i,a.pitch=o,A||(A=F()),A&&(a.voice=A);try{window.speechSynthesis.speak(a)}catch{}},g=async(e,t={})=>{if(!(!w||!e)){if(k){if(t.interrupt!==!1&&v){try{v.pause()}catch{}v=null}if(await V(e))return;k=!1}N(e,t)}},q=()=>{try{window.speechSynthesis?.cancel()}catch{}if(v){try{v.pause()}catch{}v=null}},U=async()=>{try{let e="";try{e=JSON.parse(localStorage.getItem("feedia.brujula.account")||"{}").handle||""}catch{}const i=await(await fetch("/api/account/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get",accountId:e})})).json(),a=((i?.profile?.brandKit||i?.profile||{}).handle||e||"").replace(/^@/,"").split(/[._\-]/)[0];h=a&&a.length>1?a.charAt(0).toUpperCase()+a.slice(1):""}catch{h=""}},M=/\bfeedia\b/i,P=e=>e.replace(M,"").trim(),I=["En seguida","Dale","Voy","Manos a la obra","Vamos"],T=()=>{const e=I[Math.floor(Math.random()*I.length)];return h?`${e} ${h}`:`${e}`},D=e=>/carrusel|reel|historia|stories|post|publicar|generar|crear|hac[eé]/i.test(e),H=async()=>{try{(await fetch("/api/cua/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"auto"})})).ok&&(document.body.dataset.cuMode="auto")}catch{}},R=async()=>{try{return(await import("../lib/platform.js")).getPlatform()}catch{return"instagram"}},J=e=>`
  <div class="hf-shell">
    <div class="hf-header">
      <div class="hf-hdr-left">
        <span class="hf-dot"></span>
        <span class="hf-title">Manos Libres</span>
        <span class="hf-platform">\u2192 ${u(e)}</span>
      </div>
      <div class="hf-hdr-right">
        <button id="hf-cfg" class="hf-iconbtn" title="Configurar voz premium (ElevenLabs)">\u2699\uFE0F</button>
        <button id="hf-tts" class="hf-iconbtn" title="Voz on/off">\u{1F50A}</button>
        <button id="hf-always" class="hf-iconbtn" title="Modo siempre escuchando (dec\xED 'feedia' + comando)">\u{1F442}</button>
        <button id="hf-clear" class="hf-iconbtn" title="Limpiar log">\u2298</button>
        <a href="#feed" class="hf-iconbtn" title="Salir a vista normal">\u21A9</a>
      </div>
    </div>

    <details id="hf-cfg-panel" class="hf-cfg-panel">
      <summary class="hf-cfg-sum">\u2699\uFE0F Voz premium (ElevenLabs \xB7 opcional)</summary>
      <div class="hf-cfg-body">
        <p class="hf-cfg-hint">Por default uso la voz nativa del navegador (gratis). Si peg\xE1s tu key de <a href="https://elevenlabs.io" target="_blank" rel="noopener">ElevenLabs</a> (plan free 10k chars/mes), respondo con voz mucho m\xE1s natural multilenguaje.</p>
        <div class="hf-cfg-row">
          <input id="hf-el-key" type="password" class="hf-input" placeholder="sk-... (tu API key ElevenLabs)" autocomplete="off" />
          <select id="hf-el-voice" class="hf-input" style="max-width:280px;">
            <option value="EXAVITQu4vr4xnSDxMaL">Bella \xB7 ES c\xE1lida</option>
            <option value="pNInz6obpgDQGcFmaJgB">Adam \xB7 ES masculina</option>
            <option value="XB0fDUnXU5powFXDhCwa">Charlotte \xB7 ES profesional</option>
            <option value="21m00Tcm4TlvDq8ikWAM">Rachel \xB7 ES narrativa</option>
          </select>
        </div>
        <div class="hf-cfg-actions">
          <button id="hf-el-save" class="hf-go" style="padding:6px 14px;font-size:12px;">Guardar key</button>
          <button id="hf-el-test" class="hf-iconbtn" style="width:auto;padding:6px 14px;">\u{1F3B5} Probar voz</button>
          <button id="hf-el-clear" class="hf-iconbtn" style="width:auto;padding:6px 14px;">\u{1F5D1} Quitar</button>
          <span id="hf-el-status" class="hf-cfg-status"></span>
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
  </style>`,K=e=>`+${(e/1e3).toFixed(1)}s`,S=e=>{const t=e.querySelector("#hf-timeline");if(t){if(!y.length){t.innerHTML='<div class="hf-empty">Esperando tu pedido\u2026</div>';return}t.innerHTML=y.map(i=>`
    <div class="hf-event ${i.status||"done"}">
      <span class="hf-event-time">${u(K(i.at))}</span>
      <span class="hf-event-icon">${u(i.icon||"\xB7")}</span>
      <span class="hf-event-text">${u(i.text||"")}</span>
    </div>`).join(""),t.scrollTop=t.scrollHeight}},B=(e,t)=>{const i=e.querySelector("#hf-output");if(!i)return;if(!t){i.hidden=!0;return}const o=t.output||{},a=t.decision||{},b=Array.isArray(o.carouselSlides)?o.carouselSlides:o.image?.url?[{n:1,role:"output",dataUrl:o.image.url}]:[];i.hidden=!1,i.innerHTML=`
    <div class="hf-out-title">Resultado</div>
    ${o.pending?`<div class="hf-pending-badge">${u(o.reason||"PENDIENTE")}</div>`:""}
    ${a.archetype?`<div class="hf-out-section"><div class="hf-out-label">Voz \xB7 Est\xE9tica \xB7 Roles</div><div class="hf-out-text"><b>${u(a.archetype)}</b> \xB7 ${u(a.mood||"")} \xB7 ${(a.roles||[]).join(" + ")}</div></div>`:""}
    ${o.content?.hook?`<div class="hf-out-section"><div class="hf-out-label">Hook</div><div class="hf-out-text">${u(o.content.hook)}</div></div>`:""}
    ${o.content?.caption?`<div class="hf-out-section"><div class="hf-out-label">Caption</div><div class="hf-out-text">${u(o.content.caption.slice(0,400))}${o.content.caption.length>400?"\u2026":""}</div></div>`:""}
    ${o.reply?`<div class="hf-out-section"><div class="hf-out-label">Respuesta</div><div class="hf-out-text">${u(o.reply)}</div></div>`:""}
    ${b.length?`
      <div class="hf-out-section">
        <div class="hf-out-label">${b.length} slide${b.length>1?"s":""}</div>
        <div class="hf-slides">
          ${b.map((r,n)=>`<div class="hf-slide" data-idx="${n}"><img src="${u(r.dataUrl)}" alt="slide ${r.n}" loading="lazy" /><span class="hf-slide-tag">${r.n}</span></div>`).join("")}
        </div>
      </div>`:""}
    ${o.publish?.ok?`<div class="hf-out-section"><div class="hf-out-label">Publicado</div><div class="hf-out-text" style="color:#10F2B0;">\u2713 ${u(o.publish.mediaId||"OK")}</div></div>`:""}`;const l=b,p=r=>{let n=r;const s=document.createElement("div");s.className="hf-lightbox";const d=()=>{const c=l[n];c&&(s.innerHTML=`<button class="hf-lb-close">\u2715</button><button class="hf-lb-nav hf-lb-prev" ${n===0?"disabled":""}>\u2039</button><div class="hf-lb-stage"><img src="${u(c.dataUrl)}" /><div class="hf-lb-meta">Slide ${c.n} / ${l.length}</div></div><button class="hf-lb-nav hf-lb-next" ${n===l.length-1?"disabled":""}>\u203A</button><a class="hf-lb-dl" href="${u(c.dataUrl)}" download="hf-slide-${c.n}.svg">\u2B07 Descargar</a>`,s.querySelector(".hf-lb-close").onclick=()=>s.remove(),s.querySelector(".hf-lb-prev").onclick=()=>{n>0&&(n--,d())},s.querySelector(".hf-lb-next").onclick=()=>{n<l.length-1&&(n++,d())})};s.addEventListener("click",c=>{c.target===s&&s.remove()}),document.addEventListener("keydown",function c($){if(!document.body.contains(s)){document.removeEventListener("keydown",c);return}$.key==="Escape"&&s.remove(),$.key==="ArrowLeft"&&n>0&&(n--,d()),$.key==="ArrowRight"&&n<l.length-1&&(n++,d())}),d(),document.body.appendChild(s)};i.querySelectorAll(".hf-slide").forEach(r=>r.addEventListener("click",()=>p(parseInt(r.dataset.idx,10)||0)))},X=e=>{const t=window.SpeechRecognition||window.webkitSpeechRecognition;if(!t){e.querySelector("#hf-mic")?.setAttribute("disabled","true"),e.querySelector("#hf-mic").title="Voz no disponible en este navegador (prob\xE1 Chrome)";return}f=new t,f.lang="es-AR",f.continuous=!0,f.interimResults=!0;let i="",o=null;f.onresult=a=>{let b="",l="";for(let n=a.resultIndex;n<a.results.length;n++){const s=a.results[n][0].transcript;a.results[n].isFinal?l+=s:b+=s}l&&(i+=" "+l);const p=(i+" "+b).trim(),r=e.querySelector("#hf-input");r&&(r.value=p),l&&M.test(p)&&(clearTimeout(o),o=setTimeout(()=>{const n=P(p);n.length>5&&(g(T()+". Empezando."),i="",r&&(r.value=n),j(e,{spoken:!0}))},900))},f.onend=()=>{if(m)try{f.start()}catch{}else E=!1,e.querySelector("#hf-mic")?.classList.remove("listening")},f.onerror=a=>{a.error==="no-speech"||a.error==="aborted"||(E=!1,m=!1,e.querySelector("#hf-mic")?.classList.remove("listening"),x(`Voz: ${a.error||"error"}`,"warn"))},window.speechSynthesis&&(window.speechSynthesis.onvoiceschanged=()=>{A=F()},setTimeout(()=>{A=F()},200))},j=async(e,{spoken:t=!1}={})=>{const i=e.querySelector("#hf-input"),o=e.querySelector("#hf-go"),a=!!e.querySelector("#hf-autopublish")?.checked,b=(i?.value||"").trim(),l=P(b);if(!l){t?g("No te escuch\xE9 bien. Repet\xED, por favor."):x("Escrib\xED o dict\xE1 qu\xE9 quer\xE9s que haga","warn");return}y=[{at:0,icon:"\u{1F399}\uFE0F",text:`Vos: "${l}"`,status:"done"}],S(e),o.disabled=!0,o.textContent="\u23F3 Procesando\u2026",D(l)?(y.push({at:1,icon:"\u{1F916}",text:"Activando Computer Use para visualizar la creaci\xF3n\u2026",status:"done"}),S(e),H(),t&&g(`${T()}. Activ\xE9 el modo autom\xE1tico y empiezo el carrusel.`,{interrupt:!0})):t&&g(`${T()}. Procesando.`);try{let p="";try{p=JSON.parse(localStorage.getItem("feedia.brujula.account")||"{}").handle||""}catch{}const r=await R(),s=await(await fetch("/api/handsfree/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:l,accountId:p,platform:r,autoPublish:a,goal:"engagement"})})).json();if(!s.ok){y.push({at:0,icon:"\u2717",text:s.message||s.error||"Error desconocido",status:"fail"}),S(e),t&&g("Hubo un problema. "+(s.message||s.error||"reintenta"));return}if((s.timeline||[]).forEach((d,c)=>{y.push(d),t&&c<4&&d.text&&d.status!=="fail"&&(c===1||/carrusel|reel|publicado|listo/i.test(d.text))&&setTimeout(()=>g(d.text.replace(/[…✓✗🎨🧠🤖💬📊]/g,"").trim().slice(0,120)),c*800)}),S(e),L=s,B(e,s),t){const d=s.output||{},c=(d.carouselSlides||[]).length,$=d.content?.hook||"";let z=h?`Listo ${h}. `:"Listo. ";c?z+=`Gener\xE9 ${c} slides. El hook dice: ${$}`:d.reply?z+="Te prepar\xE9 la respuesta.":s.action?z+=`Acci\xF3n ${s.action} completada.`:z+="Revisa el resultado abajo.",setTimeout(()=>g(z),1200)}}catch(p){y.push({at:0,icon:"\u2717",text:`Error de red: ${p?.message||"sin respuesta"}`,status:"fail"}),S(e),t&&g("Error de red. Volv\xE9 a probar.")}finally{o.disabled=!1,o.textContent="\u25B6 Ejecutar"}};export const renderHandsFree=async e=>{const t=await R();e.innerHTML=J(t),await Promise.all([U(),O()]),X(e),S(e),B(e,L),setTimeout(()=>{if(w){const r=h?`Hola ${h}. Activ\xE1 el modo manos libres tocando el o\xEDdo arriba. O decime "Feedia" y tu pedido.`:'Hola. Activ\xE1 el modo manos libres tocando el o\xEDdo arriba. O decime "Feedia" y tu pedido.';g(r,{interrupt:!1})}},600),e.querySelector("#hf-go")?.addEventListener("click",()=>j(e)),e.querySelector("#hf-input")?.addEventListener("keydown",r=>{r.key==="Enter"&&(r.ctrlKey||r.metaKey)&&(r.preventDefault(),j(e))}),e.querySelector("#hf-mic")?.addEventListener("click",()=>{if(f){if(E){try{f.stop()}catch{}m=!1;return}try{m=!1,f.start(),E=!0,e.querySelector("#hf-mic").classList.add("listening")}catch(r){x(`No pude activar el mic: ${r?.message||""}`,"warn")}}});const i=e.querySelector("#hf-always");i?.addEventListener("click",()=>{if(f)if(m=!m,i.classList.toggle("active",m),i.style.background=m?"linear-gradient(135deg,#10F2B0,#3B82F6)":"",i.style.color=m?"#0A0A0F":"",m){try{f.start(),E=!0,e.querySelector("#hf-mic").classList.add("listening")}catch{}g(h?`Modo manos libres activado ${h}. Decime "Feedia" y tu pedido.`:'Modo manos libres activado. Decime "Feedia" y tu pedido.'),x('\u{1F442} Escuchando siempre. Dec\xED "Feedia" + comando.',"ok")}else{try{f.stop()}catch{}E=!1,e.querySelector("#hf-mic").classList.remove("listening"),q(),x("\u{1F442} Modo continuo desactivado","info")}});const o=e.querySelector("#hf-tts");o?.addEventListener("click",()=>{w=!w,o.textContent=w?"\u{1F50A}":"\u{1F507}",o.title=w?"Voz ON \xB7 click para silenciar":"Voz OFF \xB7 click para activar",w?g("Voz activada"):q()}),e.querySelector("#hf-clear")?.addEventListener("click",()=>{y=[],L=null,S(e),B(e,null)});const a=e.querySelector("#hf-cfg-panel");e.querySelector("#hf-cfg")?.addEventListener("click",()=>{a.open=!a.open});const l=e.querySelector("#hf-el-status"),p=()=>{l&&(l.textContent=k?"\u2713 ElevenLabs activo":"\u25CB usando voz nativa del browser",l.style.color=k?"#10F2B0":"#9CA3AF")};p(),e.querySelector("#hf-el-save")?.addEventListener("click",async r=>{const n=e.querySelector("#hf-el-key")?.value.trim(),s=e.querySelector("#hf-el-voice")?.value;if(!n){x("Peg\xE1 tu API key primero","warn");return}r.target.disabled=!0,r.target.textContent="\u23F3";try{(await(await fetch("/api/voice/elevenlabs/key",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:n,voiceId:s})})).json()).ok?(await O(),p(),x("\u2713 Voz premium guardada","ok"),e.querySelector("#hf-el-key").value="",g(h?`Listo ${h}. Voz premium activa.`:"Listo. Voz premium activa.")):x("Error al guardar","err")}catch{x("Error de red","err")}finally{r.target.disabled=!1,r.target.textContent="Guardar key"}}),e.querySelector("#hf-el-test")?.addEventListener("click",()=>{g(h?`Hola ${h}, as\xED suena mi voz premium.`:"Hola, as\xED suena mi voz premium.")}),e.querySelector("#hf-el-clear")?.addEventListener("click",async()=>{try{await fetch("/api/voice/elevenlabs/key",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:""})}),k=!1,p(),x("Key removida \xB7 usando voz nativa","info")}catch{}}),window.addEventListener("hashchange",()=>{q(),m=!1;try{f?.stop()}catch{}},{once:!0})};
