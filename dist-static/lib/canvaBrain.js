import{apiSafe as g}from"./api.js";import{toast as x}from"./toast.js";import{openExternal as v}from"./dom.js";const u=[{id:"brand",emoji:"\u{1F3A8}",name:"Brand Strategist",role:"Branding \xB7 Pixel",task:"Carga voz, paleta y reglas de marca del Brand Board",backendAgent:"algorithm",backendAction:"content-score",durationMs:1100},{id:"designer",emoji:"\u{1F5BC}\uFE0F",name:"Visual Designer",role:"Dise\xF1o \xB7 Nova",task:"Elige template, compone layout, aplica paleta y jerarqu\xEDa visual",backendAgent:"visual-storyteller",backendAction:"design-brief",durationMs:2200},{id:"comm",emoji:"\u270D\uFE0F",name:"Communicator",role:"Copy \xB7 L\xEDa",task:"Redacta titulares, bullets y CTA respetando voz de marca",backendAgent:"algorithm",backendAction:"content-score",durationMs:1600},{id:"publicist",emoji:"\u{1F4E3}",name:"Publicist",role:"Posicionamiento \xB7 Luca",task:"Optimiza hook + caption + hashtags para alcance en Explore",backendAgent:"algorithm",backendAction:"reach-boost",durationMs:1400},{id:"artist",emoji:"\u{1F3AD}",name:"Art Director",role:"Direcci\xF3n art\xEDstica \xB7 Pixel",task:"Aprueba mood, contraste y consistencia visual con tu feed",backendAgent:"visual-storyteller",backendAction:"visual-audit",durationMs:1300},{id:"compliance",emoji:"\u{1F6E1}\uFE0F",name:"Compliance Officer",role:"Gard",task:"Valida tono, riesgo de shadowban y pol\xEDticas de IG",backendAgent:"compliance",backendAction:"safety-check",durationMs:1e3},{id:"publisher",emoji:"\u{1F680}",name:"Publisher",role:"Operador CUA",task:"Toma el cursor: abre Canva \u2192 dise\xF1a \u2192 exporta \u2192 publica en Instagram",backendAgent:"computer-use",backendAction:"canva-to-instagram",durationMs:2600}],s=e=>String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]);let i=null;const h=()=>{if(document.getElementById("canva-brain-style"))return;const e=document.createElement("style");e.id="canva-brain-style",e.textContent=S,document.head.appendChild(e)},k=async()=>{const{data:e}=await g("/api/cu/mode",{mode:"off"});return e?.mode??"off"};export const launchCanvaBrain=async({topic:e,format:a,brand:t,contentPayload:o}={})=>{h(),document.querySelectorAll(".cb-modal").forEach(n=>n.remove());const r=await k(),p=r==="auto"?"\u{1F680} Auto \xB7 sin aprobaciones":r==="supervised"?"\u{1F441}\uFE0F Supervisado \xB7 aprob\xE1s cada paso cr\xEDtico":"\u{1F534} CUA Off \xB7 ejecuci\xF3n manual";i=document.createElement("div"),i.className="cb-modal",i.innerHTML=`
    <div class="cb-backdrop"></div>
    <div class="cb-panel">
      <div class="cb-header">
        <div class="cb-header-left">
          <span class="cb-radar"></span>
          <div>
            <div class="cb-title">\u{1F9E0} Cerebro Computer Use \xB7 Canva</div>
            <div class="cb-sub">${s(e?`"${e}"`:"Pipeline visual end-to-end")} \xB7 ${s(a??"feed-post")}</div>
          </div>
        </div>
        <div class="cb-mode-pill">${s(p)}</div>
        <button class="cb-close" aria-label="Cerrar">\u2715</button>
      </div>

      <div class="cb-team" id="cb-team">
        ${u.map((n,c)=>`
          <div class="cb-step" data-step="${n.id}" data-idx="${c}">
            <div class="cb-step-emoji">${n.emoji}</div>
            <div class="cb-step-info">
              <div class="cb-step-name">${s(n.name)}</div>
              <div class="cb-step-role">${s(n.role)}</div>
              <div class="cb-step-task">${s(n.task)}</div>
            </div>
            <div class="cb-step-state" data-state="idle">esperando</div>
          </div>`).join("")}
      </div>

      <div class="cb-log-wrap">
        <div class="cb-log-label">Log en vivo</div>
        <div class="cb-log" id="cb-log"></div>
      </div>

      <div class="cb-actions" id="cb-actions">
        <button class="cb-btn primary" id="cb-start">\u25B6 Iniciar pipeline</button>
        <button class="cb-btn ghost" id="cb-cancel">Cerrar</button>
      </div>
    </div>`,document.body.appendChild(i);const d=()=>{i?.remove(),i=null};i.querySelector(".cb-backdrop").addEventListener("click",d),i.querySelector(".cb-close").addEventListener("click",d),i.querySelector("#cb-cancel").addEventListener("click",d),i.querySelector("#cb-start").addEventListener("click",async()=>{i.querySelector("#cb-actions").innerHTML='<div class="cb-running">\u{1F504} Pipeline corriendo\u2026 el equipo est\xE1 operando.</div>',await w({topic:e,format:a,brand:t,contentPayload:o,mode:r})})};const l=(e,a="info")=>{const t=i?.querySelector("#cb-log");if(!t)return;const o=new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),r=document.createElement("div");r.className=`cb-log-line cb-log-${a}`,r.innerHTML=`<span class="cb-log-time">${s(o)}</span> ${s(e)}`,t.appendChild(r),t.scrollTop=t.scrollHeight},m=(e,a,t)=>{const o=i?.querySelector(`.cb-step[data-idx="${e}"]`);if(!o)return;const r=o.querySelector(".cb-step-state");r.dataset.state=a,r.textContent=t??a,o.classList.toggle("cb-step-active",a==="running"),o.classList.toggle("cb-step-done",a==="done"),o.classList.toggle("cb-step-skip",a==="skipped")},y=e=>new Promise(a=>setTimeout(a,e)),w=async({topic:e,format:a,brand:t,contentPayload:o,mode:r})=>{l(`\u{1F9E0} Cerebro Computer Use iniciado \xB7 ${u.length} especialistas activos`,"head"),l(`\u{1F4CB} Modo: ${r==="auto"?"AUTO":r==="supervised"?"SUPERVISED":"OFF (simulaci\xF3n)"}`,"head"),r==="off"&&l("\u26A0\uFE0F CUA est\xE1 apagado. Corriendo simulaci\xF3n visual. Activ\xE1 Auto/Supervisado para ejecuci\xF3n real.","warn");let p=null,d=null;for(let n=0;n<u.length;n++){const c=u[n];if(m(n,"running","trabajando\u2026"),l(`${c.emoji} ${c.name} \u2192 ${c.task}`,"step"),r==="supervised"&&(c.id==="designer"||c.id==="publisher")&&!await A(c))return m(n,"skipped","rechazado"),l(`\u2717 ${c.name} rechazado por el usuario. Pipeline detenido.`,"crit"),f({aborted:!0});const b=await C(c,{topic:e,format:a,brand:t,contentPayload:o});await y(c.durationMs*(r==="auto"?.55:1)),c.id==="publisher"&&b?.designUrl&&(p=b.designUrl),c.id==="publisher"&&b?.postUrl&&(d=b.postUrl),m(n,"done",b?.ok===!1?"simulado":"ok"),l(`\u2713 ${c.name} complet\xF3: ${b?.message??c.task}`,b?.ok===!1?"sim":"ok")}p?(l(`\u{1F3A8} Canva listo: ${p}`,"ok"),await v(p)):r!=="off"&&((await g("/api/cu/canva/open",null,{method:"POST",body:{topic:e,format:a}})).error?l("\u{1F310} No se pudo abrir Canva v\xEDa CUA. Abriendo manualmente\u2026","warn"):l("\u{1F5B1}\uFE0F Computer Use abri\xF3 Canva con el cursor","ok")),d&&l(`\u{1F4F7} Post publicado: ${d}`,"ok"),f({aborted:!1,designUrl:p,publishUrl:d})},C=async(e,a)=>{if(e.id==="publisher"){const o=await g("/api/cu/canva/to-instagram",null,{method:"POST",body:{topic:a.topic,designIntent:"educar",postType:a.format??"feed-post",publishMethod:"computer-use",generateCaption:!0}});return o.data?.ok?{ok:!0,message:"Dise\xF1o + publicaci\xF3n completados",designUrl:o.data?.designStep?.filePath??null,postUrl:o.data?.publishStep?.postUrl??null}:{ok:!1,message:"simulaci\xF3n: cursor abrir\xEDa Canva, exportar\xEDa a IG (sin backend)"}}const t=await g(`/api/agents/${e.backendAgent}/action`,null,{method:"POST",body:{actionId:e.backendAction,params:{topic:a.topic,format:a.format}}});return t.data?{ok:!0,message:t.data.summary??t.data.title??"completado"}:{ok:!1,message:"simulaci\xF3n local"}},A=e=>new Promise(a=>{if(!i)return a(!0);const t=document.createElement("div");t.className="cb-approval",t.innerHTML=`
    <div class="cb-approval-card">
      <div style="font-size:30px;">${e.emoji}</div>
      <h3>${s(e.name)} pide aprobaci\xF3n</h3>
      <p>${s(e.task)}</p>
      <div class="btn-row" style="justify-content:center;gap:8px;margin-top:14px;">
        <button class="cb-btn primary" id="cb-ap-yes">\u2713 Aprobar</button>
        <button class="cb-btn ghost" id="cb-ap-no">\u2717 Rechazar</button>
      </div>
    </div>`,i.appendChild(t),t.querySelector("#cb-ap-yes").addEventListener("click",()=>{t.remove(),a(!0)}),t.querySelector("#cb-ap-no").addEventListener("click",()=>{t.remove(),a(!1)})}),f=({aborted:e,designUrl:a,publishUrl:t})=>{const o=i?.querySelector("#cb-actions");o&&(e?o.innerHTML=`
      <button class="cb-btn ghost" id="cb-close-final">Cerrar</button>
      <div class="cb-aborted">Pipeline detenido. Pod\xE9s retomar m\xE1s tarde.</div>`:o.innerHTML=`
      <div class="cb-done">\u{1F389} Pipeline completado \xB7 el equipo termin\xF3</div>
      ${a?`<a class="cb-btn primary" href="${s(a)}" target="_blank" rel="noopener">Abrir dise\xF1o en Canva \u2192</a>`:""}
      ${t?`<a class="cb-btn primary" href="${s(t)}" target="_blank" rel="noopener">Ver post \u2192</a>`:""}
      <button class="cb-btn ghost" id="cb-close-final">Cerrar</button>`,o.querySelector("#cb-close-final")?.addEventListener("click",()=>{i?.remove(),i=null}),x(e?"Pipeline detenido":"\u{1F389} Canva pipeline completado",e?"warn":"ok"))},S=`
.cb-modal { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; animation: cbIn .15s ease; }
@keyframes cbIn { from { opacity: 0; } to { opacity: 1; } }
.cb-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.72); backdrop-filter: blur(6px); }
.cb-panel {
  position: relative; width: min(720px, calc(100% - 32px)); max-height: 90vh;
  display: flex; flex-direction: column;
  background: linear-gradient(180deg, #1a1530 0%, #0c0c14 100%);
  border: 1px solid rgba(168,85,247,.3); border-radius: 18px; overflow: hidden;
  box-shadow: 0 24px 70px rgba(168,85,247,.18), 0 24px 60px rgba(0,0,0,.6);
  animation: cbSlide .24s cubic-bezier(.16,.84,.44,1);
}
@keyframes cbSlide { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
.cb-header { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.cb-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.cb-radar {
  width: 10px; height: 10px; border-radius: 50%; background: #22d3ee;
  box-shadow: 0 0 14px rgba(34,211,238,.7);
  animation: cbRadar 1.8s ease-in-out infinite; flex-shrink: 0;
}
@keyframes cbRadar { 0%,100% { opacity: .55; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.18); } }
.cb-title { font-size: 15px; font-weight: 800; }
.cb-sub { font-size: 11.5px; color: rgba(255,255,255,.6); margin-top: 2px; }
.cb-mode-pill {
  font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  background: rgba(168,85,247,.18); color: #d8b4fe; border: 1px solid rgba(168,85,247,.35);
  white-space: nowrap;
}
.cb-close { background: transparent; border: 0; color: #fff; font-size: 18px; cursor: pointer; width: 30px; height: 30px; border-radius: 6px; }
.cb-close:hover { background: rgba(255,255,255,.08); }
.cb-team { padding: 14px 18px; overflow-y: auto; flex: 1; min-height: 200px; }
.cb-step {
  display: flex; gap: 12px; align-items: center; padding: 10px 12px; margin-bottom: 6px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06); border-radius: 10px;
  transition: background .15s, border-color .15s;
}
.cb-step.cb-step-active {
  background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(168,85,247,.1));
  border-color: rgba(168,85,247,.5);
  animation: cbPulseBorder 1.4s ease-in-out infinite;
}
@keyframes cbPulseBorder { 0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,.4); } 50% { box-shadow: 0 0 0 6px rgba(168,85,247,0); } }
.cb-step.cb-step-done { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.3); }
.cb-step.cb-step-skip { opacity: .4; }
.cb-step-emoji { font-size: 26px; flex-shrink: 0; line-height: 1; }
.cb-step-info { flex: 1; min-width: 0; }
.cb-step-name { font-size: 13.5px; font-weight: 700; }
.cb-step-role { font-size: 10.5px; color: rgba(255,255,255,.55); margin-top: 1px; }
.cb-step-task { font-size: 11.5px; color: rgba(255,255,255,.7); margin-top: 4px; line-height: 1.4; }
.cb-step-state {
  font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
  background: rgba(255,255,255,.05); color: rgba(255,255,255,.5);
  text-transform: uppercase; letter-spacing: .05em; flex-shrink: 0;
}
.cb-step-state[data-state="running"] { background: rgba(34,211,238,.18); color: #67e8f9; }
.cb-step-state[data-state="done"] { background: rgba(16,185,129,.18); color: #6ee7b7; }
.cb-step-state[data-state="skipped"] { background: rgba(239,68,68,.18); color: #fca5a5; }

.cb-log-wrap { padding: 0 18px 12px; }
.cb-log-label { font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
.cb-log { background: rgba(0,0,0,.4); border-radius: 8px; padding: 8px 10px; max-height: 120px; overflow-y: auto; font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
.cb-log-line { padding: 2px 0; line-height: 1.45; color: rgba(255,255,255,.75); }
.cb-log-line.cb-log-head { color: #d8b4fe; font-weight: 600; }
.cb-log-line.cb-log-step { color: #93c5fd; }
.cb-log-line.cb-log-ok { color: #6ee7b7; }
.cb-log-line.cb-log-sim { color: #fcd34d; }
.cb-log-line.cb-log-warn { color: #fdba74; }
.cb-log-line.cb-log-crit { color: #fca5a5; }
.cb-log-time { color: rgba(255,255,255,.35); margin-right: 6px; }

.cb-actions {
  display: flex; gap: 8px; align-items: center; padding: 14px 18px;
  border-top: 1px solid rgba(255,255,255,.06); background: rgba(0,0,0,.25);
  flex-wrap: wrap;
}
.cb-btn {
  border: 0; padding: 9px 16px; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
}
.cb-btn.primary { background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; }
.cb-btn.primary:hover { filter: brightness(1.1); }
.cb-btn.ghost { background: rgba(255,255,255,.05); color: #fff; border: 1px solid rgba(255,255,255,.1); }
.cb-running { color: #67e8f9; font-size: 12.5px; font-weight: 600; }
.cb-done { color: #6ee7b7; font-size: 13px; font-weight: 700; }
.cb-aborted { color: #fdba74; font-size: 12px; }

.cb-approval {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.6); backdrop-filter: blur(8px); z-index: 2;
  animation: cbIn .15s ease;
}
.cb-approval-card {
  background: var(--surface, #141418); border: 1px solid rgba(245,158,11,.5);
  border-radius: 14px; padding: 20px 22px; max-width: 360px; text-align: center;
  box-shadow: 0 16px 50px rgba(245,158,11,.2);
}
.cb-approval-card h3 { margin: 8px 0 6px; font-size: 15px; }
.cb-approval-card p { font-size: 12.5px; color: var(--text-muted, #9CA3AF); margin: 0; line-height: 1.5; }
`;
