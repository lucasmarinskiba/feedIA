const i=[{label:"\u{1F50D} Navegaci\xF3n",items:[{keys:["\u2318","K"],alt:["Ctrl","K"],desc:"Abrir b\xFAsqueda global"},{keys:["/"],desc:"Abrir b\xFAsqueda (alternativo)"},{keys:["?"],desc:"Mostrar este panel de atajos"},{keys:["Esc"],desc:"Cerrar overlay / panel actual"},{keys:["G","H"],desc:"Ir a Home"},{keys:["G","M"],desc:"Ir a Mission Control"},{keys:["G","C"],desc:"Ir a Calendario"},{keys:["G","A"],desc:"Ir a Agenda"},{keys:["G","S"],desc:"Ir a Sala Ejecutiva"},{keys:["G","I"],desc:"Ir a Agentes IA"}]},{label:"\u{1F399}\uFE0F Voz y chat",items:[{keys:["Hola FeedIA"],desc:"Wake word (si est\xE1 activado en Settings)"},{keys:["Click","mic FAB"],desc:"Abrir overlay de voz"},{keys:["Click","\u2726 FAB"],desc:"Abrir chatbot Asistente FeedIA"},{keys:["Enter"],desc:"En el chat: enviar mensaje"},{keys:["Shift","Enter"],desc:"En el chat: nueva l\xEDnea"},{keys:["Esc"],desc:"Cerrar voice / chatbot"}]},{label:"\u{1F916} Computer Use",items:[{keys:["Click","topbar CUA"],desc:"Abrir dropdown Computer Use"},{keys:["Click","\u{1F534}/\u{1F7E2}/\u{1F441}\uFE0F"],desc:"Cambiar modo: Off/Auto/Asistente"},{keys:["Click","\u{1F6D1} rojo"],desc:"Frenar al agente (emergencia)"}]},{label:"\u{1F514} Notificaciones",items:[{keys:["Click","\u{1F514}"],desc:"Abrir campanita"},{keys:["Click","item"],desc:"Marcar como le\xEDdo + navegar"},{keys:["\u2713 Marcar todo"],desc:"Marcar todas como le\xEDdas"}]},{label:"\u26A1 Acciones r\xE1pidas (v\xEDa b\xFAsqueda)",items:[{keys:['/ \u2192 "misi\xF3n"'],desc:"Lanzar misi\xF3n nueva"},{keys:['/ \u2192 "frenar"'],desc:"Stop de emergencia del agente"},{keys:['/ \u2192 "canva"'],desc:"Abrir pipeline Canva \u2192 IG"},{keys:['/ \u2192 "camara"'],desc:"Vision IA con c\xE1mara"},{keys:['/ \u2192 "autopilot"'],desc:"Activar Autopilot"}]}],r=s=>String(s??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),o=s=>s.map(e=>e.length===1||e==="\u2318"||e==="\u2325"||e==="\u21E7"?`<kbd>${r(e)}</kbd>`:e==="Ctrl"||e==="Enter"||e==="Esc"||e==="Shift"?`<kbd>${r(e)}</kbd>`:`<span class="sc-token">${r(e)}</span>`).join('<span class="sc-plus">+</span>');let a=null;export const openShortcuts=()=>{if(a)return;a=document.createElement("div"),a.className="sc-overlay",a.setAttribute("role","dialog"),a.setAttribute("aria-label","Atajos de teclado"),a.innerHTML=`
    <div class="sc-backdrop"></div>
    <div class="sc-card">
      <div class="sc-header">
        <div>
          <div class="sc-title">\u2328\uFE0F Atajos de teclado</div>
          <div class="sc-sub">Todo lo que pod\xE9s hacer sin tocar el mouse.</div>
        </div>
        <button class="sc-close" aria-label="Cerrar">\u2715</button>
      </div>
      <div class="sc-body">
        ${i.map(e=>`
          <div class="sc-group">
            <div class="sc-group-label">${e.label}</div>
            <div class="sc-items">
              ${e.items.map(t=>`
                <div class="sc-item">
                  <div class="sc-keys">${o(t.keys)}</div>
                  <div class="sc-desc">${r(t.desc)}</div>
                  ${t.alt?`<div class="sc-alt">o ${o(t.alt)}</div>`:""}
                </div>`).join("")}
            </div>
          </div>`).join("")}
      </div>
      <div class="sc-footer">
        <span>Presion\xE1 <kbd>Esc</kbd> para cerrar</span>
        <span style="opacity:.6;">\xB7</span>
        <span>Si tu cuenta tiene Mac, \u2318 = <kbd>Cmd</kbd>; en Windows = <kbd>Ctrl</kbd></span>
      </div>
    </div>`,document.body.appendChild(a);const s=()=>{a?.remove(),a=null};a.querySelector(".sc-backdrop").addEventListener("click",s),a.querySelector(".sc-close").addEventListener("click",s),document.addEventListener("keydown",function e(t){t.key==="Escape"&&(s(),document.removeEventListener("keydown",e))})},closeShortcuts=()=>{a?.remove(),a=null},initShortcuts=()=>{if(!document.getElementById("sc-style")){const s=document.createElement("style");s.id="sc-style",s.textContent=c,document.head.appendChild(s)}document.addEventListener("keydown",s=>{const e=(document.activeElement?.tagName??"").toUpperCase();if(!(["INPUT","TEXTAREA"].includes(e)||document.activeElement?.isContentEditable)){if(s.key==="?"){s.preventDefault(),openShortcuts();return}(s.metaKey||s.ctrlKey)&&s.key==="/"&&(s.preventDefault(),openShortcuts())}})};const c=`
.sc-overlay { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; animation: scIn .14s ease; }
@keyframes scIn { from { opacity: 0; } to { opacity: 1; } }
.sc-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(4px); }
.sc-card {
  position: relative; width: min(680px, calc(100% - 32px)); max-height: 86vh; display: flex; flex-direction: column;
  background: var(--surface, #141418); border: 1px solid var(--border, #2a2a32);
  border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.55);
  animation: scSlide .22s cubic-bezier(.16,.84,.44,1);
}
@keyframes scSlide { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.sc-header {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 18px 20px; border-bottom: 1px solid var(--border, #2a2a32);
  background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(168,85,247,.1));
}
.sc-title { font-size: 18px; font-weight: 800; }
.sc-sub { font-size: 12.5px; color: var(--text-muted, #9CA3AF); margin-top: 2px; }
.sc-close {
  background: transparent; border: 0; color: var(--fg, #fff); cursor: pointer;
  font-size: 18px; width: 32px; height: 32px; border-radius: 8px;
}
.sc-close:hover { background: rgba(255,255,255,.08); }
.sc-body { padding: 14px 16px; overflow-y: auto; flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .sc-body { grid-template-columns: 1fr; } }
.sc-group-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted, #9CA3AF); margin-bottom: 8px; }
.sc-items { display: flex; flex-direction: column; gap: 6px; }
.sc-item {
  display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 7px 10px;
  background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.04);
  border-radius: 8px; align-items: center;
}
.sc-keys { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.sc-desc { font-size: 12.5px; line-height: 1.4; }
.sc-alt { grid-column: 1 / -1; font-size: 11px; color: var(--text-muted, #9CA3AF); margin-top: 2px; display: flex; gap: 4px; align-items: center; }
.sc-overlay kbd {
  background: var(--bg-elev, #1c1c22); border: 1px solid var(--border, #2a2a32);
  border-radius: 5px; padding: 2px 7px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px; font-weight: 600; box-shadow: 0 1px 0 var(--border, #2a2a32);
  min-width: 18px; text-align: center;
}
.sc-token {
  background: rgba(168,85,247,.15); color: #d8b4fe; border: 1px solid rgba(168,85,247,.3);
  border-radius: 5px; padding: 1px 7px; font-size: 11px; font-weight: 600;
}
.sc-plus { color: var(--text-muted, #9CA3AF); font-size: 11px; padding: 0 2px; }
.sc-footer {
  display: flex; gap: 8px; align-items: center; padding: 12px 18px;
  border-top: 1px solid var(--border, #2a2a32); font-size: 11.5px; color: var(--text-muted, #9CA3AF);
}
`;
