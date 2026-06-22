const o="feedia.platform";let a="general";try{a=localStorage.getItem(o)||"general"}catch{}export const PLATFORMS={instagram:{id:"instagram",label:"Instagram",emoji:"\u{1F4F7}",accent:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#bc1888)"},tiktok:{id:"tiktok",label:"TikTok",emoji:"\u{1F3B5}",accent:"linear-gradient(135deg,#25F4EE,#000,#FE2C55)"},general:{id:"general",label:"Sala",emoji:"\u{1F451}",accent:"linear-gradient(135deg,#6366f1,#a855f7,#ec4899)"}},getPlatform=()=>a,setPlatform=t=>{if(!(!PLATFORMS[t]||t===a)){a=t;try{localStorage.setItem(o,t)}catch{}i(),window.dispatchEvent(new CustomEvent("feedia:platform",{detail:{platform:t}}))}};const i=()=>{document.querySelectorAll("[data-platform]").forEach(t=>{const e=t.dataset.platform,l=!e||e==="both"||e===a;t.style.display=l?"":"none"}),document.querySelectorAll(".side-nav .nav-group-label").forEach(t=>{let e=!1,l=t.nextElementSibling;for(;l&&!l.classList.contains("nav-group-label");){if(l.classList.contains("nav-item")&&l.style.display!=="none"){e=!0;break}l=l.nextElementSibling}t.style.display=e?"":"none"}),document.querySelectorAll(".plat-pill").forEach(t=>{t.classList.toggle("active",t.dataset.plat===a)}),document.body.classList.toggle("platform-tiktok",a==="tiktok"),document.body.classList.toggle("platform-instagram",a==="instagram"),document.body.classList.toggle("platform-general",a==="general")};export const initPlatformSwitcher=()=>{if(!document.getElementById("plat-style")){const e=document.createElement("style");e.id="plat-style",e.textContent=r,document.head.appendChild(e)}const t=document.getElementById("platform-switcher");t&&!t.dataset.mounted&&(t.dataset.mounted="1",t.innerHTML=`
      <div class="plat-bar" role="tablist" aria-label="Plataforma">
        ${Object.values(PLATFORMS).map(e=>`
          <button class="plat-pill ${e.id===a?"active":""}" data-plat="${e.id}" role="tab" aria-selected="${e.id===a}" title="${e.label}">
            <span class="plat-pill-emoji">${e.emoji}</span>
            <span class="plat-pill-label">${e.label}</span>
          </button>`).join("")}
        <span class="plat-bar-hint">Cambia qu\xE9 red administr\xE1s</span>
      </div>`,t.querySelectorAll(".plat-pill").forEach(e=>{e.addEventListener("click",()=>setPlatform(e.dataset.plat))})),i(),window.addEventListener("hashchange",()=>setTimeout(i,30))};const r=`
#platform-switcher { width: 100%; box-sizing: border-box; }
.plat-bar {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px;
  padding: 3px; border-radius: 11px; width: 100%; box-sizing: border-box; overflow: hidden;
  background: var(--bg-card-2, var(--bg-elev, #1c1c22)); border: 1px solid var(--border, #2a2a32);
}
html[data-theme="light"] .plat-bar { background: #eceef2; border-color: rgba(17,18,22,.10); }
html[data-theme="light"] .plat-pill { color: #474a54; }
html[data-theme="light"] .plat-pill:hover { background: rgba(17,18,22,.04); color: #16171c; }
.plat-bar-hint { display: none; }
.plat-pill {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-width: 0; width: 100%; padding: 6px 1px; border-radius: 8px; border: 0;
  background: transparent; color: var(--text-muted, #9CA3AF);
  font-weight: 700; cursor: pointer; transition: background .15s, color .15s;
  overflow: hidden;
}
.plat-pill:hover { color: var(--fg, #fff); background: rgba(255,255,255,.05); }
.plat-pill.active { color: #fff; }
.plat-pill[data-plat="instagram"].active { background: linear-gradient(135deg,#f09433,#dc2743,#bc1888); }
.plat-pill[data-plat="tiktok"].active   { background: linear-gradient(135deg,#25F4EE,#111,#FE2C55); }
.plat-pill[data-plat="general"].active  { background: linear-gradient(135deg,#6366f1,#a855f7,#ec4899); }
.plat-pill-emoji { font-size: 16px; line-height: 1; flex-shrink: 0; }
.plat-pill-label { font-size: 10px; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
