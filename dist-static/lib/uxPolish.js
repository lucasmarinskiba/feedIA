const c="feedia.tourSeen",u="feedia.focusMode",f=`
/* 1) Topbar responsive \u2014 ocultar secundarios <768px */
@media (max-width: 767px) {
  .cua-label, .cua-dd-status .small.muted, .topbar-platform-pill,
  .topbar-search, #topbar-help-btn, #topbar-notifications-btn { display: none !important; }
  .cua-btn { padding: 6px 8px !important; }
}
@media (max-width: 480px) {
  .cua-mode-pill[data-mode="observe"] { display: none !important; }
}

/* 2) Empty states */
.feedia-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.015);
  color: var(--text-secondary, #9ca3af);
  margin: 24px 0;
}
.feedia-empty-emoji { font-size: 42px; opacity: 0.7; margin-bottom: 10px; }
.feedia-empty-title { font-size: 15px; font-weight: 700; color: var(--text-primary, #fff); margin-bottom: 4px; }
.feedia-empty-sub { font-size: 12.5px; line-height: 1.55; max-width: 380px; margin-bottom: 14px; }
.feedia-empty-cta {
  display: inline-block;
  background: linear-gradient(135deg, #10F2B0, #3B82F6);
  color: #0A0A0F;
  padding: 9px 18px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 12.5px;
  text-decoration: none;
  transition: filter .15s;
}
.feedia-empty-cta:hover { filter: brightness(1.1); }

/* 3) Modo enfoque \u2014 oculta sidebar + bottom nav + fabs */
body.focus-mode .sidebar,
body.focus-mode .desktop-sidebar,
body.focus-mode .bottom-nav,
body.focus-mode .mobile-bottom-nav,
body.focus-mode #voice-btn,
body.focus-mode #chatbot-fab,
body.focus-mode #assistant-fab {
  display: none !important;
}
body.focus-mode .app-main,
body.focus-mode main,
body.focus-mode .main-content {
  margin-left: 0 !important;
  padding-left: 0 !important;
  width: 100% !important;
  max-width: 1100px;
  margin-right: auto;
}
.focus-toggle {
  position: fixed;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(15, 15, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #a78bfa;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  z-index: 9997;
  transition: transform .15s, background .15s;
}
.focus-toggle:hover { transform: scale(1.08); background: rgba(168, 85, 247, .18); }
body.focus-mode .focus-toggle { background: rgba(168, 85, 247, .25); }

/* 4) Tour interactivo */
.tour-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: tour-fade .2s ease-out;
}
@keyframes tour-fade { from { opacity: 0; } to { opacity: 1; } }
.tour-card {
  max-width: 480px;
  background: linear-gradient(180deg, #11111A, #0A0A0F);
  border: 1px solid rgba(168, 85, 247, .3);
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  box-shadow: 0 24px 80px rgba(168, 85, 247, .15);
}
.tour-emoji { font-size: 48px; margin-bottom: 14px; }
.tour-title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -.4px; }
.tour-text { font-size: 13.5px; color: #D1D5DB; line-height: 1.55; margin-bottom: 22px; }
.tour-dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 18px; }
.tour-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, .15); transition: all .2s; }
.tour-dot.active { background: #10F2B0; width: 24px; border-radius: 3px; }
.tour-actions { display: flex; gap: 8px; justify-content: center; }
.tour-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: #9CA3AF;
  padding: 9px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.tour-btn:hover { background: rgba(255, 255, 255, .04); color: #fff; }
.tour-btn.primary {
  background: linear-gradient(135deg, #10F2B0, #3B82F6);
  color: #0A0A0F;
  border: none;
  font-weight: 800;
}
.tour-skip {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  color: #6B7280;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 10px;
}
.tour-skip:hover { color: #fff; }
`,g={"#bj-result-host:empty":{emoji:"\u{1F9ED}",title:"\xBFTu primera vez?",sub:'Escrib\xED cualquier tema arriba (ej: "marketing para emprendedores") y apret\xE1 <b>Analizar y generar mi plan</b>. Te armo 9 ideas en 30 segundos.',cta:null},"#hf-timeline:has(.hf-empty)":{emoji:"\u{1F399}\uFE0F",title:"Dec\xED algo y arranco",sub:'Ejemplo: <i>"Feedia, hac\xE9 un carrusel sobre IA con 5 slides azul y negro"</i>. Toc\xE1 el mic o escrib\xED abajo.',cta:null}},p=(t,e,o)=>{const i=o?`<a href="${o}" class="feedia-empty-cta">${e.ctaText||"Empezar"}</a>`:"";t.innerHTML=`
    <div class="feedia-empty">
      <div class="feedia-empty-emoji">${e.emoji}</div>
      <div class="feedia-empty-title">${e.title}</div>
      <div class="feedia-empty-sub">${e.sub}</div>
      ${i}
    </div>`};export const showEmptyIfBlank=(t,e)=>{const o=document.querySelector(t);o&&!o.children.length&&!o.textContent.trim()&&p(o,e,e.cta)};const x=()=>{try{localStorage.getItem(u)==="1"&&document.body.classList.add("focus-mode")}catch{}const t=document.createElement("button");t.className="focus-toggle",t.setAttribute("aria-label","Modo enfoque (F)"),t.title="Modo enfoque (F)",t.innerHTML="\u26F6",t.addEventListener("click",()=>m()),document.body.appendChild(t),document.addEventListener("keydown",e=>{if(e.key!=="f"&&e.key!=="F"||e.metaKey||e.ctrlKey||e.altKey)return;const o=(document.activeElement?.tagName||"").toLowerCase();o==="input"||o==="textarea"||document.activeElement?.isContentEditable||(e.preventDefault(),m())})},m=()=>{const t=document.body.classList.toggle("focus-mode");try{localStorage.setItem(u,t?"1":"0")}catch{}},s=[{emoji:"\u{1F44B}",title:"Bienvenido a FeedIA",text:"Sistema aut\xF3nomo que crea, optimiza y publica tu contenido en Instagram y TikTok. Te lo muestro en 4 pasos r\xE1pidos."},{emoji:"\u{1F3A8}",title:"Paso 1 \xB7 Tu Brand Kit",text:"Carg\xE1 UNA vez: colores, tipograf\xEDa, foto y nicho. Todas las herramientas leen de ah\xED \u2014 no volv\xE9s a configurar nada.",cta:{label:"Ir a Brand Kit",route:"brandkit"}},{emoji:"\u{1F399}\uFE0F",title:"Paso 2 \xB7 Manos Libres",text:'Dec\xED "Feedia, hac\xE9 un carrusel sobre IA" y respondo con voz mientras lo armo. Voz premium opcional con ElevenLabs.',cta:{label:"Probar Manos Libres",route:"handsfree"}},{emoji:"\u{1F916}",title:"Paso 3 \xB7 Run All",text:"En Br\xFAjula, 1 bot\xF3n verde corre todo el semanal: an\xE1lisis del nicho, 3 carruseles, plantillas de respuesta DM. Listo.",cta:{label:"Empezar a crear",route:"brujula"}}];let a=0,r=null;const l=()=>{const t=s[a];if(!t){d();return}r.innerHTML=`
    <div class="tour-card" style="position:relative;">
      <button class="tour-skip" data-act="skip">saltar</button>
      <div class="tour-emoji">${t.emoji}</div>
      <div class="tour-title">${t.title}</div>
      <div class="tour-text">${t.text}</div>
      <div class="tour-dots">${s.map((e,o)=>`<div class="tour-dot ${o===a?"active":""}"></div>`).join("")}</div>
      <div class="tour-actions">
        ${a>0?'<button class="tour-btn" data-act="back">\u2039 Atr\xE1s</button>':""}
        ${t.cta?`<button class="tour-btn primary" data-act="cta" data-route="${t.cta.route}">${t.cta.label}</button>`:""}
        <button class="tour-btn ${t.cta?"":"primary"}" data-act="next">${a===s.length-1?"Listo":"Siguiente \u203A"}</button>
      </div>
    </div>`,r.querySelectorAll("[data-act]").forEach(e=>{e.addEventListener("click",()=>{const o=e.dataset.act;if(o==="skip")d();else if(o==="back")a--,l();else if(o==="next")a===s.length-1?d():(a++,l());else if(o==="cta"){const i=e.dataset.route;d(),i&&(window.location.hash="#"+i)}})})},d=()=>{r&&(r.remove(),r=null);try{localStorage.setItem(c,"1")}catch{}},b=()=>{a=0,r=document.createElement("div"),r.className="tour-overlay",document.body.appendChild(r),l()},y=()=>{try{if(localStorage.getItem(c)==="1")return}catch{}setTimeout(b,1200)};export const restartTour=()=>{try{localStorage.removeItem(c)}catch{}b()};window.feediaRestartTour=restartTour;export const initUxPolish=()=>{if(document.getElementById("ux-polish-style"))return;const t=document.createElement("style");t.id="ux-polish-style",t.textContent=f,document.head.appendChild(t),x(),y();const e=()=>{Object.entries(g).forEach(([o,i])=>{try{const n=document.querySelector(o.replace(":has(.hf-empty)","").replace(":empty",""));if(!n)return;(!n.children.length||n.children.length===1&&n.firstElementChild.classList?.contains("hf-empty"))&&!n.querySelector(".feedia-empty")&&p(n,i)}catch{}})};setTimeout(e,800),window.addEventListener("hashchange",()=>setTimeout(e,600))};document.readyState==="complete"||document.readyState==="interactive"?setTimeout(initUxPolish,150):document.addEventListener("DOMContentLoaded",initUxPolish);
