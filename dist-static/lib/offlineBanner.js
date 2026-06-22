const c=6e4,f=4;let n=0,e=null,i=null,r=!0;const b=o=>String(o??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),d=()=>{if(!e&&(e=document.createElement("div"),e.id="feedia-offline-banner",e.innerHTML=`
    <div class="ob-icon">\u{1F4E1}</div>
    <div class="ob-body">
      <strong>Sin conexi\xF3n al backend</strong>
      <div class="ob-sub">La UI sigue funcionando con datos locales. Cuando vuelva el servidor, se sincroniza autom\xE1ticamente.</div>
    </div>
    <button class="ob-retry" id="ob-retry">\u21BB Reintentar</button>
    <button class="ob-close" id="ob-close" aria-label="Ocultar">\u2715</button>`,document.body.appendChild(e),e.querySelector("#ob-retry").addEventListener("click",()=>{a(!0)}),e.querySelector("#ob-close").addEventListener("click",()=>{e?.remove(),e=null}),!document.getElementById("ob-style"))){const o=document.createElement("style");o.id="ob-style",o.textContent=l,document.head.appendChild(o)}},s=()=>{e&&(e.classList.add("ob-fade-out"),setTimeout(()=>{e?.remove(),e=null},280))},a=async(o=!1)=>{try{let t=await fetch("/api/health",{method:"GET",cache:"no-store"});if((!t.ok||!t.headers.get("content-type")?.includes("json"))&&(t=await fetch("/api/home/identity",{method:"GET",cache:"no-store"})),!t.ok)throw new Error("not ok");if(!t.headers.get("content-type")?.includes("json"))throw new Error("html response");n=0,r||(r=!0,typeof window.__feediaToast=="function"&&window.__feediaToast("\u2713 Backend conectado","ok")),s()}catch{n++,n>=4&&(r=!1,d()),o&&n>0}};export const initOfflineBanner=()=>{setTimeout(()=>void a(),4e3),i=setInterval(()=>{document.hidden||a()},6e4),document.addEventListener("visibilitychange",()=>{document.hidden||a()})},stopOfflineBanner=()=>{i&&clearInterval(i),s()};const l=`
#feedia-offline-banner {
  position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
  z-index: 9990; display: flex; align-items: center; gap: 12px;
  padding: 10px 14px 10px 12px;
  background: linear-gradient(135deg, #1a1f3a, #2a1f3a);
  border: 1px solid rgba(245,158,11,.4);
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0,0,0,.45), 0 0 0 1px rgba(245,158,11,.18);
  color: #fff; max-width: 92vw; animation: obSlide .26s cubic-bezier(.16,.84,.44,1);
}
@keyframes obSlide { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
#feedia-offline-banner.ob-fade-out { animation: obFadeOut .26s ease forwards; }
@keyframes obFadeOut { to { opacity: 0; transform: translate(-50%, -8px); } }
.ob-icon { font-size: 22px; line-height: 1; flex-shrink: 0; animation: obPulse 1.6s ease-in-out infinite; }
@keyframes obPulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
.ob-body strong { font-size: 13.5px; }
.ob-sub { font-size: 11.5px; color: rgba(255,255,255,.7); margin-top: 2px; line-height: 1.4; max-width: 460px; }
.ob-retry, .ob-close {
  background: transparent; border: 1px solid rgba(255,255,255,.15);
  color: #fff; cursor: pointer; padding: 6px 10px; border-radius: 8px;
  font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.ob-retry { background: linear-gradient(135deg, #6366f1, #a855f7); border-color: transparent; }
.ob-retry:hover { filter: brightness(1.12); }
.ob-close { padding: 5px 8px; border: 0; font-size: 14px; opacity: .6; }
.ob-close:hover { opacity: 1; background: rgba(255,255,255,.08); }
@media (max-width: 640px) {
  #feedia-offline-banner { left: 8px; right: 8px; transform: none; max-width: calc(100vw - 16px); }
  .ob-sub { display: none; }
  @keyframes obSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  #feedia-offline-banner.ob-fade-out { animation: obFadeOutMobile .26s ease forwards; }
  @keyframes obFadeOutMobile { to { opacity: 0; transform: translateY(-8px); } }
}
`;
