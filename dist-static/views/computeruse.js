import{api as x}from"../lib/api.js";import{escape as y}from"../lib/dom.js";import{toast as u}from"../lib/toast.js";import{withBtnSpinner as k}from"../lib/ui.js";let g=null;const m=()=>{try{g&&g.close()}catch{}g=null};window.addEventListener("beforeunload",m),window.addEventListener("hashchange",()=>{(location.hash.replace("#","")||"feed")!=="pantalla"&&m()});const S={navigate:"\u{1F9ED}",click:"\u{1F446}","double-click":"\u{1F446}",type:"\u2328\uFE0F",scroll:"\u{1F5B1}\uFE0F",hover:"\u270B",press:"\u23CE",wait:"\u23F3"},$=(a,t)=>{const c=a.querySelector("#cu-stage"),r=a.querySelector("#cu-cursor"),n=a.querySelector("#cu-apptitle"),o=a.querySelector("#cu-narrate"),d=a.querySelector("#cu-typed"),p=a.querySelector("#cu-log"),b=a.querySelector("#cu-progress");if(c)if(t.kind==="session-start")n.textContent=`Preparando \u2014 ${t.surface}`,o.textContent=`Instrucci\xF3n: ${t.instruction}`,p.innerHTML="",d.textContent="",b.textContent=`0 / ${t.steps}`,c.dataset.total=t.steps,t.requiresApproval&&u("Este plan toca acciones de escritura (requiere aprobaci\xF3n para ejecutar de verdad)","warn");else if(t.kind==="app-open"){n.textContent=t.app,c.classList.add("cu-screen-on");const e=document.createElement("div");e.className="tiny muted",e.textContent=`\u{1FA9F} ${t.note}`,p.prepend(e)}else if(t.kind==="cursor"){const e=c.getBoundingClientRect(),i=t.x/1e3*e.width,s=t.y/620*e.height;r.style.left=`${i}px`,r.style.top=`${s}px`,r.setAttribute("data-label",t.label)}else if(t.kind==="act")r.classList.add("cu-click"),setTimeout(()=>r.classList.remove("cu-click"),320),o.innerHTML=`${S[t.gesture]||"\u2022"} <b>${y(t.gesture)}</b> \u2192 ${y(t.target)}<br><span class="muted">${y(t.narrate)}</span>`,t.gesture!=="type"&&(d.textContent="");else if(t.kind==="screenshot"){let e=c.querySelector("#cu-shot");e||(e=document.createElement("img"),e.id="cu-shot",e.className="cu-shot",c.prepend(e)),e.src=t.dataUri,c.classList.add("cu-has-shot")}else if(t.kind==="type-char")d.textContent=t.full+"\u258C";else if(t.kind==="step-done"){const e=document.createElement("div");e.className="cu-step-row",e.innerHTML=`<span class="tag ok tiny">\u2713</span><span class="small">#${t.step} ${y(t.detail)}</span>`,p.prepend(e);const i=p.querySelectorAll(".cu-step-row").length;b.textContent=`${i} / ${c.dataset.total||"?"}`}else t.kind==="session-end"&&(n.textContent=t.completed?"\u2705 Tarea completada":"\u26D4 Sesi\xF3n finalizada",o.innerHTML=t.completed?`<b>Listo.</b> El sistema complet\xF3 ${t.ok}/${t.total} pasos solo.`:"La sesi\xF3n termin\xF3.",d.textContent="",r.classList.remove("cu-click"),m())},w=(a,t)=>{m(),g=new EventSource(`/api/computer/stream?session=${encodeURIComponent(t)}`),g.addEventListener("cu",c=>{let r;try{r=JSON.parse(c.data)}catch{return}$(a,r)}),g.onerror=()=>{}},C=async(a,t,c)=>{let r;try{r=await x("/api/computer/watch",{method:"POST",body:{instruction:t,speed:c}})}catch(n){u("Error: "+n.message,"crit");return}w(a,r.sessionId)};export const renderComputerUse=async a=>{m(),a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F5A5}\uFE0F Pantalla en vivo</h1>
        <p class="view-subtitle page-subtitle">Computer Use Agent: escrib\xED una orden y mir\xE1 c\xF3mo el sistema abre apps, mueve el cursor y opera solo.</p>
      </div>
    </header>
    <div class="page-body">
      <!-- \u{1F9E0} Cerebro Activado: master switch + 6 subsistemas -->
      <div class="card cu-brain" id="cu-brain">
        <div class="cu-brain-head">
          <div>
            <div class="cu-brain-title"><span>\u{1F9E0}</span> <b>Cerebro aut\xF3nomo</b> <span class="tag tiny" id="cu-brain-status">cargando\u2026</span></div>
            <div class="tiny muted">Cuando est\xE1 <b>Activado</b>, los subsistemas marcados corren solos en su ciclo. Apagado = todo manual.</div>
          </div>
          <label class="cu-switch" title="Activar cerebro aut\xF3nomo">
            <input type="checkbox" id="cu-master"/><span class="cu-slider"></span>
          </label>
        </div>
        <div class="cu-modules" id="cu-modules">
          <div class="tiny muted">cargando subsistemas\u2026</div>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div class="row" style="gap:8px;align-items:flex-end;flex-wrap:wrap;">
          <div style="flex:1;min-width:240px;">
            <label class="small muted">\xBFQu\xE9 quer\xE9s que haga? (modo manual)</label>
            <input id="cu-instruction" class="input" placeholder="Ej: arm\xE1 un carrusel del nicho y subilo a Instagram" />
          </div>
          <div style="width:120px;">
            <label class="small muted">Velocidad</label>
            <select id="cu-speed" class="input">
              <option value="0.5">Lenta</option>
              <option value="1" selected>Normal</option>
              <option value="2">R\xE1pida</option>
            </select>
          </div>
          <button class="btn primary" id="cu-go">\u25B6 Mirar</button>
        </div>
      </div>

      <div class="card" style="margin-top:12px;padding:0;overflow:hidden;">
        <div class="cu-titlebar">
          <span class="cu-dot" style="background:#ff5f56"></span>
          <span class="cu-dot" style="background:#ffbd2e"></span>
          <span class="cu-dot" style="background:#27c93f"></span>
          <span id="cu-apptitle" class="small" style="margin-left:10px;font-weight:600;">Pantalla apagada</span>
          <span id="cu-progress" class="tag tiny" style="margin-left:auto;">0 / 0</span>
        </div>
        <div id="cu-stage" class="cu-stage">
          <div id="cu-narrate" class="cu-narrate muted">Escrib\xED una instrucci\xF3n y toc\xE1 \u201CMirar\u201D. Te pod\xE9s cruzar de brazos.</div>
          <div id="cu-typed" class="cu-typed"></div>
          <div id="cu-cursor" class="cu-cursor"></div>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <b class="small">Registro en vivo</b>
        <div id="cu-log" class="cu-loglist" style="margin-top:8px;max-height:240px;overflow:auto;"></div>
      </div>
    </div>

    <style>
      .cu-titlebar{display:flex;align-items:center;gap:6px;padding:10px 14px;background:var(--surface-2,#1a1a1a);border-bottom:1px solid var(--border);}
      .cu-dot{width:11px;height:11px;border-radius:50%;display:inline-block;}
      .cu-stage{position:relative;height:440px;background:radial-gradient(circle at 50% 30%, #1d1d22, #0c0c0e);overflow:hidden;transition:background .4s;}
      .cu-stage.cu-screen-on{background:radial-gradient(circle at 50% 30%, #23232b, #101014);}
      .cu-shot{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:1;}
      .cu-stage.cu-has-shot .cu-narrate{background:rgba(0,0,0,.55);border-radius:8px;}
      .cu-narrate{position:absolute;top:18px;left:0;right:0;text-align:center;font-size:15px;padding:0 24px;line-height:1.5;}
      .cu-typed{position:absolute;left:50%;top:46%;transform:translateX(-50%);max-width:78%;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-family:ui-monospace,monospace;font-size:14px;color:var(--fg);min-height:0;}
      .cu-typed:empty{display:none;}
      .cu-cursor{position:absolute;left:40px;top:40px;width:22px;height:22px;pointer-events:none;transition:left .55s cubic-bezier(.4,.1,.2,1), top .55s cubic-bezier(.4,.1,.2,1);z-index:5;}
      .cu-cursor::before{content:"";position:absolute;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:16px solid #fff;transform:rotate(-35deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));}
      .cu-cursor::after{content:attr(data-label);position:absolute;left:18px;top:14px;font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:6px;white-space:nowrap;opacity:.92;}
      .cu-cursor.cu-click::before{filter:drop-shadow(0 0 6px var(--accent));}
      .cu-cursor.cu-click{animation:cuPulse .32s ease;}
      @keyframes cuPulse{0%{transform:scale(1)}50%{transform:scale(.78)}100%{transform:scale(1)}}
      .cu-loglist .cu-step-row{display:flex;gap:8px;align-items:center;padding:3px 0;}
      /* Cerebro Activado */
      .cu-brain{background:linear-gradient(135deg,rgba(225,48,108,.06),rgba(168,85,247,.04));border-color:var(--border-focus,#333);}
      .cu-brain.on{border-color:rgba(74,222,128,.55);box-shadow:0 0 0 1px rgba(74,222,128,.2), 0 12px 30px rgba(0,0,0,.25);}
      .cu-brain-head{display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap;}
      .cu-brain-title{display:flex;align-items:center;gap:8px;font-size:15px;}
      .cu-modules{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:14px;}
      .cu-mod{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:flex-start;gap:10px;transition:border-color .15s, opacity .2s;}
      .cu-mod.off{opacity:.55;}
      .cu-mod-info{flex:1;min-width:0;}
      .cu-mod-info b{font-size:13px;display:block;}
      .cu-mod-info .desc{font-size:11.5px;color:var(--text-tertiary,#8a8a98);line-height:1.4;margin-top:2px;}
      .cu-mod-info .meta{font-size:10.5px;color:var(--text-tertiary,#6a6a78);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;}
      /* Switch reutilizable */
      .cu-switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;cursor:pointer;}
      .cu-switch input{opacity:0;width:0;height:0;}
      .cu-slider{position:absolute;inset:0;background:#2c2c38;border-radius:24px;transition:background .2s;}
      .cu-slider::before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .22s cubic-bezier(.2,.8,.2,1);}
      .cu-switch input:checked + .cu-slider{background:linear-gradient(135deg,#e1306c,#a855f7);}
      .cu-switch input:checked + .cu-slider::before{transform:translateX(20px);}
      .cu-switch input:disabled + .cu-slider{opacity:.4;cursor:not-allowed;}
    </style>`;const t=a.querySelector("#cu-go");t.addEventListener("click",async e=>{const i=a.querySelector("#cu-instruction").value.trim();if(!i){u("Escrib\xED una instrucci\xF3n","warn");return}const s=Number(a.querySelector("#cu-speed").value)||1;await k(e.currentTarget,"mirando\u2026",async()=>{await C(a,i,s)})}),a.querySelector("#cu-instruction").addEventListener("keydown",e=>{e.key==="Enter"&&t.click()});const c=a.querySelector("#cu-brain"),r=a.querySelector("#cu-brain-status"),n=a.querySelector("#cu-master"),o=a.querySelector("#cu-modules"),d=e=>{if(!e)return"\u2014";const i=Date.now()-Date.parse(e);if(isNaN(i))return"\u2014";const s=Math.round(i/6e4);if(s<1)return"reci\xE9n";if(s<60)return`hace ${s} min`;const l=Math.round(s/60);return l<24?`hace ${l} h`:`hace ${Math.round(l/24)} d`},p=e=>{const i=Object.values(e.modules||{});o.innerHTML=i.map(s=>`
      <div class="cu-mod ${s.enabled?"":"off"}" data-id="${s.id}">
        <label class="cu-switch"><input type="checkbox" class="cu-mod-toggle" data-id="${s.id}" ${s.enabled?"checked":""} ${e.activated?"":"disabled"}/><span class="cu-slider"></span></label>
        <div class="cu-mod-info">
          <b>${s.label}</b>
          <div class="desc">${s.description}</div>
          <div class="meta"><span>\xFAltimo: ${d(s.lastRunAt)}</span>${s.nextRunAt?`<span>\xB7 pr\xF3x: ${d(s.nextRunAt)}</span>`:""}</div>
        </div>
      </div>`).join(""),o.querySelectorAll(".cu-mod-toggle").forEach(s=>{s.addEventListener("change",async l=>{const v=l.target.dataset.id,f=l.target.checked;try{const h=await x("/api/autopilot/activated",{method:"POST",body:{moduleId:v,enabled:f}});b(h),u(`${h.modules[v]?.label}: ${f?"activado":"pausado"}`,f?"ok":"info")}catch(h){u("No se pudo guardar: "+h.message,"crit"),l.target.checked=!f}})})},b=e=>{c.classList.toggle("on",!!e.activated),n.checked=!!e.activated,r.textContent=e.activated?"\u25CF Activado":"\u25CB Apagado",r.className=`tag tiny ${e.activated?"ok":""}`,p(e)};n.addEventListener("change",async e=>{const i=e.target.checked;try{const s=await x("/api/autopilot/activated",{method:"POST",body:{activated:i}});b(s),u(i?"\u{1F9E0} Cerebro aut\xF3nomo activado":"\u{1F9E0} Cerebro aut\xF3nomo apagado",i?"ok":"info")}catch(s){u("No se pudo cambiar: "+s.message,"crit"),e.target.checked=!i}}),x("/api/autopilot/activated").then(b).catch(()=>{r.textContent="sin conexi\xF3n",o.innerHTML='<div class="tiny muted">No se pudo cargar el estado. Reintent\xE1 refrescando.</div>'});try{const e=sessionStorage.getItem("fx_cu_session");if(e){sessionStorage.removeItem("fx_cu_session");const i=a.querySelector("#cu-apptitle");i&&(i.textContent="Continuando sesi\xF3n iniciada desde el Estudio\u2026"),w(a,e)}}catch{}};
