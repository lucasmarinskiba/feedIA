import{api as y,apiSafe as h}from"../lib/api.js";import{escape as o}from"../lib/dom.js";import{toast as d}from"../lib/toast.js";import{launchCanvaBrain as $}from"../lib/canvaBrain.js";const S={gancho:"accent",tension:"warn",desarrollo:"info",climax:"crit",resolucion:"ok",cta:"accent"};let r={carrusel:null,previews:[],currentSlide:0,brand:null};const k=()=>`
  <div class="studio-form">
    <h3>Generar carrusel</h3>
    <div class="field">
      <label class="field-label">Idea</label>
      <textarea class="field-textarea" id="idea" placeholder="ej: 5 errores al automatizar con IA"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Longitud</label>
      <select class="field-select" id="longitud">
        <option value="corto">Corto (5-6 slides)</option>
        <option value="medio" selected>Medio (7-8 slides)</option>
        <option value="largo">Largo (9-10 slides)</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label" style="display:flex;align-items:center;gap:6px;">
        \u{1F3AF} Indicaciones extra para la IA
        <span class="tag tiny" id="brand-hint-pill" style="display:none;background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);">marca detectada</span>
      </label>
      <textarea class="field-textarea" id="indicaciones" rows="2"
        placeholder="Ej: enfocate en el \xE1ngulo de autoridad, us\xE1 ejemplos concretos, no usar la palabra 'incre\xEDble'\u2026"
        style="font-size:12px;"></textarea>
      <div class="small muted" id="brand-hint-text" style="margin-top:4px;display:none;"></div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="generate">\u26A1 Generar</button>
      <button class="btn ghost" id="canva-render" disabled>\u{1F3A8} Render Canva (API)</button>
      <button class="btn ghost" id="canva-live" disabled title="Mir\xE1 c\xF3mo el agente abre Canva y arma el carrusel en vivo">\u{1F5A5}\uFE0F Crear en vivo en Canva (mirar)</button>
    </div>
    <button class="btn accent" id="master-brain" style="margin-top:10px;width:100%;padding:14px;font-weight:600;background:linear-gradient(135deg,#7928ca,#e1306c);color:#fff;border:0;border-radius:10px;cursor:pointer;white-space:normal;display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.35;">
      <span>\u{1F9E0} Activar Cerebro Maestro</span>
      <span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain + Anti-gen\xE9rico \u2014 todo unido</span>
    </button>
    <button class="canva-cta-btn" id="canva-open" style="margin-top:8px;">
      <span class="canva-cta-emoji">\u{1F3A8}</span>
      <span class="canva-cta-body">
        <span class="canva-cta-title">Dise\xF1ar en Canva ahora</span>
        <span class="canva-cta-sub">Si no hay API key, Nova lo abre con el cursor (CUA)</span>
      </span>
      <span class="canva-cta-arrow">\u2192</span>
    </button>
    <div class="divider"></div>
    <div class="small muted">Preview SVG local con voz de marca. <strong>Render Canva (API)</strong> requiere Canva Connect API. <strong>Dise\xF1ar en Canva</strong> prioriza CUA si no hay API.</div>
  </div>`,f=()=>{if(!r.carrusel)return`
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:540px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">\u25D0</div>
        <div class="muted">Escrib\xED una idea y dale "Generar" para ver el carrusel ac\xE1.</div>
      </div>`;const n=r.carrusel.slides[r.currentSlide],a=r.previews[r.currentSlide]??{dataUrl:""},u=r.previews.map((e,l)=>`<span class="carousel-dot ${l===r.currentSlide?"active":""}" data-i="${l}"></span>`).join(""),t=r.previews.map((e,l)=>`<div class="carousel-thumb ${l===r.currentSlide?"active":""}" data-i="${l}"><img src="${e?.dataUrl||""}" alt="slide ${l+1}"/></div>`).join(""),s=(r.brand?.name??"?").charAt(0).toUpperCase();return`
    <div>
      <div class="phone-frame">
        <div class="phone-screen aspect-4-5">
          <div class="phone-topbar">
            <div class="phone-avatar"><div>${o(s)}</div></div>
            <div class="phone-handle">${o(r.brand?.name??"marca")}</div>
          </div>
          <img src="${a.dataUrl}" alt="slide ${r.currentSlide+1}"/>
        </div>
      </div>
      <div class="carousel-dots">${u}</div>
      <div class="carousel-thumbs">${t}</div>

      <div class="card" style="margin-top:24px;">
        <div class="meta">
          <span class="tag ${S[n.rolEnNarrativa]??"info"}">${o(n.rolEnNarrativa)}</span>
          <span class="tag">slide ${n.numero}/${r.carrusel.slides.length}</span>
        </div>
        <h3>${o(n.titulo)}</h3>
        <div class="body">${o(n.cuerpo)}</div>
        <div class="tiny muted">${o(n.direccionVisual)}</div>
      </div>

      <div class="card" style="margin-top:14px;">
        <h3>Caption</h3>
        <div class="body" style="white-space:pre-wrap;">${o(r.carrusel.caption)}</div>
        <div class="meta">${r.carrusel.hashtags.map(e=>`<span class="tag info">${o(e)}</span>`).join("")}</div>
        <div class="divider"></div>
        <div class="tiny muted">CTA: ${o(r.carrusel.cta)}</div>
        <div class="tiny muted">Formato \xF3ptimo: ${o(r.carrusel.formatoOptimo)}</div>
      </div>
    </div>`},C=n=>{const a=n.querySelector(".studio-form"),u=n.querySelector(".studio-preview");a.querySelector("#generate").addEventListener("click",async()=>{const t=a.querySelector("#idea").value.trim(),s=a.querySelector("#longitud").value,e=a.querySelector("#indicaciones")?.value?.trim()||void 0;if(!t){d("Escrib\xED una idea primero","crit");return}const l=a.querySelector("#generate");l.disabled=!0,l.innerHTML='<span class="spinner"></span> generando\u2026';try{const p=await y("/api/studio/carrusel",{body:{idea:t,longitud:s,extraInstructions:e}}),m=p.carrusel||p;if(!m?.slides?.length){d("No se pudo generar el carrusel \u2014 configur\xE1 una API key en Ajustes para generaci\xF3n real","crit");return}r.carrusel=m,r.previews=p.previews||[],r.currentSlide=0,u.innerHTML=f(),w(u),a.querySelector("#canva-render").disabled=!1,a.querySelector("#canva-live").disabled=!1,d(`Carrusel generado con ${m.slides.length} slides`,"ok"),I(n,t,p.carrusel)}catch(p){d(p.message,"crit")}finally{l.disabled=!1,l.innerHTML="\u26A1 Generar"}}),a.querySelector("#master-brain")?.addEventListener("click",async()=>{const t=a.querySelector("#idea").value.trim();if(!t){d("Escrib\xED una idea primero","crit");return}const s=a.querySelector("#master-brain");s.disabled=!0,s.innerHTML="\u{1F9E0} Cerebros trabajando...";try{const e=await y("/api/cu/master",{body:{userInput:t,intent:"create-content",mode:"supervisor",contentFormat:"carousel",topic:t}}),l=(e.recommendations??[]).map(i=>`<div style="background:#1a1a1a;border-left:3px solid ${i.type==="warning"?"#ef4444":i.type==="innovation"?"#a855f7":i.type==="opportunity"?"#22d3ee":"#10b981"};padding:10px;margin:6px 0;border-radius:6px;">
          <div style="font-weight:600;font-size:13px;">${o(i.title)}</div>
          <div style="font-size:11px;opacity:0.7;margin-top:4px;">${o(i.rationale)}</div>
        </div>`).join(""),p=(e.steps??[]).map(i=>`<div style="display:flex;gap:8px;padding:8px;border-bottom:1px solid #222;">
          <span style="font-size:18px;">${i.emoji}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:12px;">${o(i.brainLabel)} \xB7 ${o(i.phase)}</div>
            <div style="font-size:11px;opacity:0.7;">${o(i.output)}</div>
          </div>
        </div>`).join(""),m=e.brief?`
        <details style="margin-bottom:16px;" open>
          <summary style="cursor:pointer;font-weight:600;padding:8px 0;">\u{1F4C4} Brief generado</summary>
          <div style="background:#1a1a1a;padding:12px;border-radius:8px;font-size:12px;margin-top:8px;white-space:pre-wrap;">${o(e.brief)}</div>
        </details>`:"",v=e.copywriting?.headline||e.copywriting?.subheadline?`
        <details style="margin-bottom:16px;" open>
          <summary style="cursor:pointer;font-weight:600;padding:8px 0;">\u270D\uFE0F Copywriting</summary>
          <div style="background:#1a1a1a;padding:12px;border-radius:8px;margin-top:8px;">
            ${e.copywriting?.headline?`<div style="font-size:16px;font-weight:700;margin-bottom:6px;">${o(e.copywriting.headline)}</div>`:""}
            ${e.copywriting?.subheadline?`<div style="font-size:13px;opacity:0.8;">${o(e.copywriting.subheadline)}</div>`:""}
          </div>
        </details>`:"",g=e.visualPlan?.templateHint?`
        <details style="margin-bottom:16px;">
          <summary style="cursor:pointer;font-weight:600;padding:8px 0;">\u{1F3A8} Plan visual</summary>
          <div style="background:#1a1a1a;padding:12px;border-radius:8px;font-size:12px;margin-top:8px;">${o(e.visualPlan.templateHint)}</div>
        </details>`:"",x=e.approvalRequired?`
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button style="flex:1;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600;" id="mb-approve">\u2705 Aprobar y ejecutar en Canva</button>
          <button style="flex:1;background:#1a1a1a;color:#fff;border:1px solid #333;padding:10px 16px;border-radius:8px;cursor:pointer;" id="mb-changes">\u270F\uFE0F Pedir cambios</button>
          <button style="background:#1a1a1a;color:#ef4444;border:1px solid #ef4444;padding:10px 16px;border-radius:8px;cursor:pointer;" id="mb-reject">\u274C Rechazar</button>
        </div>`:"",c=`
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;overflow:auto;padding:20px;" id="master-brain-modal">
          <div style="max-width:720px;margin:30px auto;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h2 style="margin:0;background:linear-gradient(135deg,#7928ca,#e1306c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">\u{1F9E0} Cerebro Maestro</h2>
              <button style="background:#222;color:#fff;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;" id="mb-close">\u2715</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
              <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#a855f7;">${e.innovationScore}</div><div style="font-size:11px;opacity:0.7;">Innovaci\xF3n</div></div>
              <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#22d3ee;">${e.influencerScore}</div><div style="font-size:11px;opacity:0.7;">Influencer</div></div>
              <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#10b981;">${e.brandCoherenceScore}</div><div style="font-size:11px;opacity:0.7;">Coherencia</div></div>
            </div>
            <div style="font-size:12px;opacity:0.7;margin-bottom:8px;">${(e.brainsActivated??[]).length} cerebros activados \xB7 ${(e.steps??[]).length} pasos</div>
            ${m}
            ${v}
            ${g}
            <details style="margin-bottom:16px;" open><summary style="cursor:pointer;font-weight:600;padding:8px 0;">\u{1F4CB} Pasos ejecutados</summary>${p}</details>
            <details style="margin-bottom:16px;" open><summary style="cursor:pointer;font-weight:600;padding:8px 0;">\u{1F4A1} Recomendaciones (${(e.recommendations??[]).length})</summary>${l}</details>
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;font-size:12px;">${o(e.finalOutput?.summary??"")}</div>
            ${x}
          </div>
        </div>`;if(document.body.insertAdjacentHTML("beforeend",c),document.getElementById("mb-close")?.addEventListener("click",()=>document.getElementById("master-brain-modal")?.remove()),document.getElementById("mb-approve")?.addEventListener("click",async()=>{const i=e.jobId;if(!i){d("Sin jobId para aprobar","crit");return}try{await y(`/api/cu/canva/brain/${i}/approve`,{method:"POST",body:{}}),d("\u2705 Aprobado \u2014 ejecutando en Canva","ok"),document.getElementById("master-brain-modal")?.remove()}catch(b){d("Error al aprobar: "+b.message,"crit")}}),document.getElementById("mb-changes")?.addEventListener("click",()=>{d("\u270F\uFE0F Envi\xE1 tus cambios en el campo de indicaciones","ok"),document.getElementById("master-brain-modal")?.remove()}),document.getElementById("mb-reject")?.addEventListener("click",()=>{d("\u274C Job rechazado","warn"),document.getElementById("master-brain-modal")?.remove()}),document.getElementById("master-brain-modal")?.addEventListener("click",i=>{i.target===document.getElementById("master-brain-modal")&&document.getElementById("master-brain-modal")?.remove()}),document.addEventListener("keydown",function i(b){b.key==="Escape"&&(document.getElementById("master-brain-modal")?.remove(),document.removeEventListener("keydown",i))}),e.scoreEntry)try{const i=JSON.parse(localStorage.getItem("feedia.scores.history")||"[]");i.unshift(e.scoreEntry),localStorage.setItem("feedia.scores.history",JSON.stringify(i.slice(0,50)))}catch{}try{const i=JSON.parse(localStorage.getItem("feedia.brain.sessions")||"[]");i.unshift({jobId:e.jobId??Date.now().toString(36),ts:Date.now(),contentFormat:"carousel",steps:e.steps??[],scores:{innovation:e.innovationScore,influencer:e.influencerScore,coherence:e.brandCoherenceScore}}),localStorage.setItem("feedia.brain.sessions",JSON.stringify(i.slice(0,20)))}catch{}d(`\u{1F9E0} ${(e.brainsActivated??[]).length} cerebros activados \xB7 innovaci\xF3n ${e.innovationScore}/100`,"ok")}catch(e){d("Master Brain: "+e.message,"crit")}finally{s.disabled=!1,s.innerHTML='<span>\u{1F9E0} Activar Cerebro Maestro</span><span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain + Anti-gen\xE9rico \u2014 todo unido</span>'}}),a.querySelector("#canva-open").addEventListener("click",async()=>{const t=a.querySelector("#idea")?.value?.trim()??"";await $({topic:t||r.carrusel?.caption?.slice(0,80)||"Carrusel sin tema",format:"carrusel",brand:r.brand,contentPayload:r.carrusel})}),a.querySelector("#canva-live").addEventListener("click",async()=>{if(!r.carrusel)return;const t=a.querySelector("#canva-live");t.disabled=!0,t.innerHTML='<span class="spinner"></span> iniciando\u2026';try{const s=r.carrusel.slides.map(p=>({titulo:p.titulo,cuerpo:p.cuerpo})),e=`Carrusel ${new Date().toISOString().split("T")[0]}`,l=await y("/api/computer/watch-canva",{body:{slides:s,titulo:e,speed:1,autoExportar:!0}});if(!l?.sessionId)throw new Error("no lleg\xF3 sessionId");sessionStorage.setItem("fx_cu_session",l.sessionId),d("\u{1F5A5}\uFE0F Pasame a Pantalla en vivo: el agente est\xE1 abriendo Canva\u2026","ok"),location.hash="pantalla"}catch(s){d("Error: "+s.message,"crit")}finally{t.disabled=!1,t.innerHTML="\u{1F5A5}\uFE0F Crear en vivo en Canva (mirar)"}}),a.querySelector("#canva-render").addEventListener("click",async()=>{if(!r.carrusel)return;const t=a.querySelector("#canva-render");t.disabled=!0,t.innerHTML='<span class="spinner"></span> renderizando\u2026';try{const s=await y("/api/studio/canva/carrusel",{body:{carrusel:r.carrusel,titulo:`Carrusel ${new Date().toISOString().split("T")[0]}`}});s.ok?d(`Canva ok: ${s.designUrl??s.designId??"listo"}`,"ok"):d(`Canva: ${s.error}`,"crit")}catch(s){d(s.message,"crit")}finally{t.disabled=!1,t.innerHTML="\u{1F3A8} Render Canva"}})},I=async(n,a,u)=>{let t=n.querySelector("#cu-intelligence-panel");if(!t){const c=n.querySelector(".studio-preview");t=document.createElement("div"),t.id="cu-intelligence-panel",t.style.cssText="margin-top:16px;display:grid;gap:12px;",c?.after(t)}t.innerHTML=`
    <div style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">\u270D\uFE0F Variantes de Caption \xB7 #\uFE0F\u20E3 Hashtags</div>
      <div class="small muted">Generando con IA\u2026<span class="spinner" style="margin-left:8px;"></span></div>
    </div>`;const s=u?.slides?.[0]?.titulo??a,e=u?.caption??u?.slides?.map(c=>c.cuerpo).join(" ")??a,[l,p]=await Promise.allSettled([h("/api/caption/variants",null,{method:"POST",body:{topic:a,format:"carrusel",baseCaption:e}}),h("/api/hashtags/strategy",null,{method:"POST",body:{topic:a,format:"carrusel",hook:s}})]),m=l.status==="fulfilled"?l.value.data:null,v=p.status==="fulfilled"?p.value.data:null,g=m?["primary","casual","formal","short"].map(c=>{const i=m[c];if(!i)return"";const b={primary:"\u{1F3AF} Principal",casual:"\u{1F60A} Casual",formal:"\u{1F4BC} Formal",short:"\u26A1 Corta"}[c];return`
      <div class="cu-variant-card" style="background:#0d0d12;border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;" data-variant-key="${c}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;font-size:12px;">${b}</span>
          <button class="btn ghost tiny cu-copy-caption" data-text="${(i.hook??"").replace(/"/g,"&quot;")}" style="padding:2px 8px;font-size:10px;">Copiar</button>
        </div>
        <div style="font-size:12px;opacity:0.85;line-height:1.5;max-height:80px;overflow:hidden;">${o(i.hook??"")}</div>
        <div style="font-size:10px;color:var(--text-secondary,#aab);margin-top:4px;">${i.characterCount??0} chars \xB7 ${i.readingTimeSeconds??0}s</div>
      </div>`}).join(""):'<div class="small muted">No se pudieron generar variantes</div>',x=v?`
    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary,#aab);margin-bottom:6px;">#\uFE0F\u20E3 ${v.total?.length??0} hashtags \xB7 ${v.rationale?.slice(0,60)??""}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(v.primarySet??[]).map(c=>`<span style="background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.4);border-radius:20px;padding:2px 8px;font-size:11px;">${o(c)}</span>`).join("")}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(v.secondarySet??[]).map(c=>`<span style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);border-radius:20px;padding:2px 7px;font-size:10px;">${o(c)}</span>`).join("")}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${(v.contextualSet??[]).slice(0,6).map(c=>`<span style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:20px;padding:2px 7px;font-size:10px;color:var(--text-secondary,#aab);">${o(c)}</span>`).join("")}
      </div>
      <button class="btn ghost tiny" id="cu-copy-all-hashtags" style="margin-top:8px;" data-tags="${(v.total??[]).join(" ").replace(/"/g,"&quot;")}">\u{1F4CB} Copiar todos los hashtags</button>
    </div>`:"";t.innerHTML=`
    <div style="background:var(--bg-card,#15151b);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;">\u270D\uFE0F Variantes de Caption</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;">
        ${g}
      </div>
      ${x}
    </div>`,t.querySelectorAll(".cu-copy-caption").forEach(c=>{c.addEventListener("click",async i=>{i.stopPropagation();const b=c.dataset.text??"";try{await navigator.clipboard.writeText(b),d("\u{1F4CB} Caption copiado","ok")}catch{d("No se pudo copiar","warn")}})}),t.querySelector("#cu-copy-all-hashtags")?.addEventListener("click",async c=>{const i=c.currentTarget.dataset.tags??"";try{await navigator.clipboard.writeText(i),d("\u{1F4CB} Hashtags copiados","ok")}catch{d("No se pudo copiar","warn")}})},w=n=>{n.querySelectorAll(".carousel-dot, .carousel-thumb").forEach(a=>a.addEventListener("click",()=>{r.currentSlide=Number(a.dataset.i),n.innerHTML=f(),w(n)}))},E=(n,a)=>{const u=n.querySelector("#brand-hint-pill"),t=n.querySelector("#brand-hint-text"),s=n.querySelector("#indicaciones");if(!u||!t||!s)return;u.style.display="inline-flex";const e=Array.isArray(a?.voice?.tone)?a.voice.tone.join(", "):"",l=Array.isArray(a?.voice?.forbidden)&&a.voice.forbidden.length?`Palabras prohibidas: ${a.voice.forbidden.join(", ")}.`:"",p=a?.brandStrategy?.positioning?`Posicionamiento: ${a.brandStrategy.positioning.slice(0,80)}.`:"",m=a?.brandStrategy?.differentiator?`Diferenciador: ${a.brandStrategy.differentiator.slice(0,60)}.`:"",v=[e&&`Tono: ${e}`,l,p,m].filter(Boolean);if(!v.length)return;const g=v.join(" ");t.textContent=`\u2726 Contexto de marca detectado: ${g}`,t.style.display="block",s.value.trim()||(s.placeholder=g.length>120?g.slice(0,120)+"\u2026":g)};export const renderCarouselStudio=async n=>{r={carrusel:null,previews:[],currentSlide:0,brand:null};try{r.brand=await y("/api/brand")}catch{}n.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Carrusel Studio</h1>
        <p class="view-subtitle page-subtitle">Gener\xE1 carruseles con preview real en mockup de tel\xE9fono.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="studio-layout studio-shell">
        ${k()}
        <div class="studio-preview">${f()}</div>
      </div>
    </div>`,C(n),r.brand&&E(n,r.brand);try{const a=sessionStorage.getItem("feedia.hook.preload");if(a){const u=n.querySelector("#idea");u&&(u.value=a),sessionStorage.removeItem("feedia.hook.preload"),d("\u{1F3A3} Hook precargado desde Hook Library","ok")}}catch{}};
