import{api as g,apiSafe as y}from"../lib/api.js";import{escape as l,openExternal as w}from"../lib/dom.js";import{toast as n}from"../lib/toast.js";import{launchCanvaBrain as S}from"../lib/canvaBrain.js";let r={reel:null,previews:[],currentBeat:0,brand:null};const $=[{value:"15",label:"15 s \u2014 TikTok hook"},{value:"20",label:"20 s \u2014 Micro-story"},{value:"30",label:"30 s \u2014 Est\xE1ndar"},{value:"45",label:"45 s \u2014 Tutorial r\xE1pido"},{value:"60",label:"60 s \u2014 Showcase"}],T=()=>`
  <div class="studio-form">
    <h3>Generar reel</h3>
    <div class="field">
      <label class="field-label">Tema / Idea</label>
      <textarea class="field-textarea" id="tema" placeholder="ej: c\xF3mo triplicar engagement en 7 d\xEDas"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Duraci\xF3n</label>
      <select class="field-select" id="duracion">
        ${$.map(t=>`<option value="${t.value}"${t.value==="30"?" selected":""}>${t.label}</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <label class="field-label">Estilo visual</label>
      <select class="field-select" id="estilo">
        <option value="facecam">Facecam talking-head</option>
        <option value="broll" selected>B-roll + texto</option>
        <option value="screencast">Screencast</option>
        <option value="animacion">Animaci\xF3n / motion</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label" style="display:flex;align-items:center;gap:6px;">
        \u{1F3AF} Indicaciones extra para la IA
        <span class="tag tiny" id="brand-hint-pill" style="display:none;background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);">marca detectada</span>
      </label>
      <textarea class="field-textarea" id="indicaciones" rows="2"
        placeholder="Ej: \xE9nfasis en datos reales, ritmo r\xE1pido, no usar m\xFAsica de moda\u2026"
        style="font-size:12px;"></textarea>
      <div class="small muted" id="brand-hint-text" style="margin-top:4px;display:none;"></div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="generate">\u26A1 Generar</button>
      <button class="btn ghost" id="canva-render" disabled>\u{1F3A8} Render Canva (API)</button>
      <button class="btn ghost" id="capcut-live" disabled title="Mir\xE1 c\xF3mo el agente abre CapCut Web y edita el reel en vivo">\u{1F5A5}\uFE0F Editar en vivo en CapCut (mirar)</button>
    </div>
    <button class="btn accent" id="master-brain" style="margin-top:10px;width:100%;padding:14px;font-weight:600;background:linear-gradient(135deg,#7928ca,#e1306c);color:#fff;border:0;border-radius:10px;cursor:pointer;white-space:normal;display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.35;">
      <span>\u{1F9E0} Activar Cerebro Maestro</span>
      <span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain \u2014 todo unido para tu reel</span>
    </button>
    <button class="canva-cta-btn" id="canva-open" style="margin-top:8px;">
      <span class="canva-cta-emoji">\u{1F3A8}</span>
      <span class="canva-cta-body">
        <span class="canva-cta-title">Dise\xF1ar en Canva ahora</span>
        <span class="canva-cta-sub">Sin API, Nova lo abre con el cursor (CUA)</span>
      </span>
      <span class="canva-cta-arrow">\u2192</span>
    </button>
    <div class="divider"></div>
    <div id="beat-nav" style="display:none;">
      <div class="small muted" style="margin-bottom:6px;">Beats</div>
      <div id="beat-pills"></div>
    </div>
    <div class="divider" id="beat-divider" style="display:none;"></div>
    <div class="small muted">El preview SVG se genera localmente. "Render Canva" solicita los archivos finales con autofill.</div>
  </div>`,C=(t,e)=>t?`
    <div class="reel-beat-detail card">
      <div class="meta">
        <span class="tag crit">beat ${t.numero}</span>
        <span class="tag info">${l(t.tipo)}</span>
        <span class="tag">${t.duracionSegundos}s</span>
      </div>
      <div class="reel-frame-wrapper">
        <img src="${e?.dataUrl||""}" alt="beat ${t.numero}" class="reel-frame-img"/>
      </div>
      <div style="margin-top:12px;">
        <div class="small muted" style="margin-bottom:2px;">\u{1F399} Voz en off</div>
        <div class="body">${l(t.vozEnOff)}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="small muted" style="margin-bottom:2px;">\u{1F4FA} Texto en pantalla</div>
        <div class="body">${l(t.textoEnPantalla)}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="small muted" style="margin-bottom:2px;">\u{1F3AC} B-roll / Visual</div>
        <div class="body">${l(t.bRoll)}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="small muted" style="margin-bottom:2px;">\u2702\uFE0F Transici\xF3n</div>
        <div class="body">${l(t.transicion)}</div>
      </div>
    </div>`:"",E=()=>r.reel?`
    <div class="reel-timeline-wrapper">
      <div class="reel-timeline">
        ${r.reel.beats.map((t,e)=>`
          <div class="reel-timeline-beat ${e===r.currentBeat?"active":""}" data-i="${e}">
            <img src="${r.previews[e]?.dataUrl||""}" alt="beat ${e+1}"/>
            <div class="reel-timeline-label">${l(t.tipo)}</div>
            <div class="reel-timeline-time">${t.duracionSegundos}s</div>
          </div>`).join("")}
      </div>
    </div>`:"",f=()=>{if(!r.reel)return`
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:560px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">\u25B6</div>
        <div class="muted">Escrib\xED el tema y dale "Generar" para ver el reel ac\xE1.</div>
      </div>`;const t=r.reel.beats[r.currentBeat],e=r.previews?.[r.currentBeat]??{dataUrl:""},c=(r.brand?.name??"?").charAt(0).toUpperCase();return`
    <div>
      <div class="phone-frame">
        <div class="phone-screen aspect-9-16">
          <div class="phone-topbar">
            <div class="phone-avatar"><div>${l(c)}</div></div>
            <div class="phone-handle">${l(r.brand?.name??"marca")}</div>
          </div>
          <img src="${e.dataUrl}" alt="beat ${r.currentBeat+1}" style="width:100%;height:100%;object-fit:cover;"/>
          <div class="reel-overlay-badge">${l(t.tipo)} \xB7 ${t.duracionSegundos}s</div>
        </div>
      </div>

      ${E()}
      ${C(t,e)}

      <div class="card" style="margin-top:14px;">
        <h3>Caption</h3>
        <div class="body" style="white-space:pre-wrap;">${l(r.reel.caption)}</div>
        <div class="meta">${r.reel.hashtags.map(a=>`<span class="tag info">${l(a)}</span>`).join("")}</div>
        <div class="divider"></div>
        <div class="tiny muted">\u{1F3B5} Audio sugerido: ${l(r.reel.audioSugerido)}</div>
        <div class="tiny muted">\u{1F3A3} Hook: ${l(r.reel.hook)}</div>
        <div class="tiny muted">\u{1F4CC} Retenci\xF3n: ${l(r.reel.estrategiaRetencion)}</div>
      </div>
    </div>`},k=t=>{t.querySelectorAll(".reel-timeline-beat").forEach(e=>e.addEventListener("click",()=>{r.currentBeat=Number(e.dataset.i),t.innerHTML=f(),k(t)}))},q=t=>{const e=t.querySelector(".studio-form"),c=t.querySelector(".studio-preview");e.querySelector("#generate").addEventListener("click",async()=>{const a=e.querySelector("#tema").value.trim(),i=Number(e.querySelector("#duracion").value),s=e.querySelector("#estilo").value,v=e.querySelector("#indicaciones")?.value?.trim()||void 0;if(!a){n("Escrib\xED un tema primero","crit");return}const p=e.querySelector("#generate");p.disabled=!0,p.innerHTML='<span class="spinner"></span> generando\u2026';try{const u=await g("/api/studio/reel",{body:{tema:a,duracion:i,estilo:s,extraInstructions:v}}),d=u.reel||u,m=d?.beats;if(!m?.length){n("No se pudo generar el reel \u2014 configur\xE1 una API key en Ajustes para generaci\xF3n real","crit");return}r.reel=d,r.previews=u.previews||[],r.currentBeat=0,c.innerHTML=f(),k(c),e.querySelector("#canva-render").disabled=!1,e.querySelector("#capcut-live").disabled=!1;const x=e.querySelector("#beat-nav"),o=e.querySelector("#beat-pills");x.style.display="block",e.querySelector("#beat-divider").style.display="block",o.innerHTML=m.map((b,h)=>`<button class="btn ghost tiny beat-pill" data-i="${h}">${l(b.tipo||`beat ${h+1}`)}</button>`).join(""),o.querySelectorAll(".beat-pill").forEach(b=>b.addEventListener("click",()=>{r.currentBeat=Number(b.dataset.i),c.innerHTML=f(),k(c)})),n(`Reel generado con ${m.length} beats`,"ok"),L(t,a,u.reel)}catch(u){n(u.message,"crit")}finally{p.disabled=!1,p.innerHTML="\u26A1 Generar"}}),e.querySelector("#canva-open").addEventListener("click",async()=>{const a=e.querySelector("#tema")?.value?.trim()??"";await S({topic:a||r.reel?.hook?.slice(0,80)||"Reel sin tema",format:"reel",brand:r.brand,contentPayload:r.reel})}),t.querySelectorAll(".ttv-tool").forEach(a=>{a.addEventListener("click",async()=>{const i=a.dataset.tool;if(a.dataset.kind==="app"){const{error:v}=await y("/api/cu/apps/launch",null,{method:"POST",body:{app:i}});n(v?`\u{1F4E1} CU no disponible (demo). Activ\xE1 Computer Use para operar ${i}.`:`${i} abierto \xB7 Computer Use operando \u{1F5B1}\uFE0F`,v?"warn":"ok")}else{const v=a.dataset.url;(await w(v)).shownModal?n(`\u{1F517} Abr\xED ${i} en otra pesta\xF1a`,"info"):n(`${i} abierto`,"ok")}})}),e.querySelector("#capcut-live").addEventListener("click",async()=>{if(!r.reel)return;const a=e.querySelector("#capcut-live");a.disabled=!0,a.innerHTML='<span class="spinner"></span> iniciando\u2026';try{const i=r.reel.beats.map(p=>({texto:p.textoEnPantalla||p.vozEnOff||"",segundos:p.duracionSegundos,notaVisual:p.bRoll})),s=`Reel ${new Date().toISOString().split("T")[0]}`,v=await g("/api/computer/watch-capcut",{body:{beats:i,titulo:s,relacion:"9:16",speed:1,autoExportar:!0}});if(!v?.sessionId)throw new Error("no lleg\xF3 sessionId");sessionStorage.setItem("fx_cu_session",v.sessionId),n("\u{1F5A5}\uFE0F Pasame a Pantalla en vivo: el agente est\xE1 abriendo CapCut\u2026","ok"),location.hash="pantalla"}catch(i){n("Error: "+i.message,"crit")}finally{a.disabled=!1,a.innerHTML="\u{1F5A5}\uFE0F Editar en vivo en CapCut (mirar)"}}),e.querySelector("#canva-render").addEventListener("click",async()=>{if(!r.reel)return;const a=e.querySelector("#canva-render");a.disabled=!0,a.innerHTML='<span class="spinner"></span> renderizando\u2026';try{const i=await g("/api/studio/canva/reel",{body:{reel:r.reel,titulo:`Reel ${new Date().toISOString().split("T")[0]}`}});i.ok?n(`Canva ok: ${i.designUrl??i.designId??"listo"}`,"ok"):n(`Canva: ${i.error}`,"crit")}catch(i){n(i.message,"crit")}finally{a.disabled=!1,a.innerHTML="\u{1F3A8} Render Canva"}}),e.querySelector("#master-brain")?.addEventListener("click",async()=>{const a=e.querySelector("#tema").value.trim();if(!a){n("Escrib\xED un tema primero","crit");return}const i=e.querySelector("#master-brain");i.disabled=!0,i.innerHTML="\u{1F9E0} Cerebros trabajando...";try{const s=await y("/api/cu/master",null,{method:"POST",body:{userInput:a,intent:"create-content",mode:"supervisor",contentFormat:"reel",topic:a}});if(s.error){n("Master Brain: "+s.error,"crit");return}n(`\u{1F9E0} ${(s.data?.brainsActivated??[]).length} cerebros \xB7 innovaci\xF3n ${s.data?.innovationScore??"?"}/100`,"ok")}catch(s){n("Master Brain: "+s.message,"crit")}finally{i.disabled=!1,i.innerHTML='<span>\u{1F9E0} Activar Cerebro Maestro</span><span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain \u2014 todo unido para tu reel</span>'}})},A=(t,e)=>{const c=t.querySelector("#brand-hint-pill"),a=t.querySelector("#brand-hint-text"),i=t.querySelector("#indicaciones");if(!c||!a||!i)return;c.style.display="inline-flex";const s=Array.isArray(e?.voice?.tone)?e.voice.tone.join(", "):"",v=Array.isArray(e?.voice?.forbidden)&&e.voice.forbidden.length?`Prohibidas: ${e.voice.forbidden.join(", ")}.`:"",p=e?.brandStrategy?.positioning?`Posicionamiento: ${e.brandStrategy.positioning.slice(0,80)}.`:"",u=[s&&`Tono: ${s}`,v,p].filter(Boolean);if(!u.length)return;const d=u.join(" ");a.textContent=`\u2726 Contexto de marca: ${d}`,a.style.display="block",i.value.trim()||(i.placeholder=d.length>120?d.slice(0,120)+"\u2026":d)};export const renderTikTokStudio=t=>renderReelStudio(t,"tiktok"),renderReelStudio=async(t,e)=>{let c=e||"instagram";try{const{getPlatform:i}=await import("../lib/platform.js");c=e||i()}catch{}const a=c==="tiktok";r={reel:null,previews:[],currentBeat:0,brand:null};try{r.brand=await g("/api/brand")}catch{}t.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">${a?"\u{1F3B5} TikTok Video Studio":"Reel Studio"}</h1>
        <p class="view-subtitle page-subtitle">${a?"Guion 9:16 nativo TikTok: hook 0-2s, completion rate, lenguaje no verbal, sonido y loop. Algoritmo FYP (inter\xE9s puro), no followers.":"Guioniz\xE1 reels beat a beat con preview en mockup de tel\xE9fono. Optimizado para Explore IG."}</p>
      </div>
    </header>
    ${a?`<div class="card" style="margin-bottom:14px;border-left:3px solid #FE2C55;background:linear-gradient(135deg,rgba(37,244,238,.06),rgba(254,44,85,.06));">
      <div class="small"><strong>Modo TikTok</strong> \xB7 hook 0-2s, ritmo nativo, trending sound, loop para rewatch. Guion completo: bot\xF3n Guion TikTok.</div>
      <div class="ttv-tools">
        <div class="ttv-tools-label">Herramientas (FeedIA las opera v\xEDa Computer Use / API):</div>
        <div class="ttv-tools-row">
          <button class="btn ghost tiny ttv-tool" data-tool="capcut" data-kind="app">\u{1F3AC} CapCut</button>
          <button class="btn ghost tiny ttv-tool" data-tool="canva" data-kind="app">\u{1F3A8} Canva</button>
          <button class="btn ghost tiny ttv-tool" data-tool="tiktok" data-kind="app">\u{1F4F1} Editor TikTok</button>
          <button class="btn ghost tiny ttv-tool" data-tool="sora" data-kind="gen" data-url="https://sora.com">\u{1F3A5} Sora</button>
          <button class="btn ghost tiny ttv-tool" data-tool="seedance" data-kind="gen" data-url="https://fal.ai">\u{1F483} Seedance</button>
          <button class="btn ghost tiny ttv-tool" data-tool="pika" data-kind="gen" data-url="https://pika.art">\u2728 Pika</button>
          <button class="btn ghost tiny ttv-tool" data-tool="nano-banana" data-kind="gen" data-url="https://fal.ai">\u{1F34C} Nano Banana</button>
        </div>
      </div>
    </div>
    <style>
      .ttv-tools{margin-top:12px;}
      .ttv-tools-label{font-size:11px;font-weight:600;color:var(--text-muted,#9CA3AF);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}
      .ttv-tools-row{display:flex;gap:8px;flex-wrap:wrap;}
      .ttv-tool{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;border:1px solid var(--border) !important;border-radius:999px !important;padding:9px 14px !important;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s,background .15s;}
      .ttv-tool:hover{transform:translateY(-2px);border-color:#FE2C55 !important;box-shadow:0 5px 14px rgba(254,44,85,.2);background:linear-gradient(135deg,rgba(37,244,238,.08),rgba(254,44,85,.08)) !important;}
    </style>`:""}
    <div class="page-body">
      <div class="studio-layout studio-shell">
        ${T()}
        <div class="studio-preview">${f()}</div>
      </div>
    </div>`,q(t),r.brand&&A(t,r.brand);try{const i=sessionStorage.getItem("feedia.hook.preload");if(i){const s=t.querySelector("#tema");s&&(s.value=i),sessionStorage.removeItem("feedia.hook.preload"),n("\u{1F3A3} Hook precargado desde Hook Library","ok")}}catch{}};const L=async(t,e,c)=>{let a=t.querySelector("#cu-intelligence-panel");if(!a){const o=t.querySelector(".studio-preview");a=document.createElement("div"),a.id="cu-intelligence-panel",a.style.cssText="margin-top:16px;display:grid;gap:12px;",o?.after(a)}a.innerHTML=`
    <div style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">\u270D\uFE0F Variantes de Caption \xB7 #\uFE0F\u20E3 Hashtags</div>
      <div class="small muted">Generando con IA\u2026<span class="spinner" style="margin-left:8px;"></span></div>
    </div>`;const i=c?.beats?.[0]?.texto??e,s=c?.beats?.map(o=>o.texto).join(" ")??e,[v,p]=await Promise.allSettled([y("/api/caption/variants",null,{method:"POST",body:{topic:e,format:"reel",baseCaption:s}}),y("/api/hashtags/strategy",null,{method:"POST",body:{topic:e,format:"reel",hook:i}})]),u=v.status==="fulfilled"?v.value.data:null,d=p.status==="fulfilled"?p.value.data:null,m=u?["primary","casual","formal","short"].map(o=>{const b=u[o];return b?`
      <div style="background:#0d0d12;border:1px solid var(--border);border-radius:10px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;font-size:12px;">${{primary:"\u{1F3AF} Principal",casual:"\u{1F60A} Casual",formal:"\u{1F4BC} Formal",short:"\u26A1 Corta"}[o]}</span>
          <button class="btn ghost tiny cu-copy-caption" data-text="${(b.hook??"").replace(/"/g,"&quot;")}" style="padding:2px 8px;font-size:10px;">Copiar</button>
        </div>
        <div style="font-size:12px;opacity:0.85;line-height:1.5;max-height:80px;overflow:hidden;">${l(b.hook??"")}</div>
        <div style="font-size:10px;color:var(--text-secondary,#aab);margin-top:4px;">${b.characterCount??0} chars</div>
      </div>`:""}).join(""):'<div class="small muted">No se pudieron generar variantes</div>',x=d?`
    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary,#aab);margin-bottom:6px;">#\uFE0F\u20E3 ${(d.primarySet?.length??0)+(d.secondarySet?.length??0)+(d.contextualSet?.length??0)} hashtags</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(d.primarySet??[]).map(o=>`<span style="background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.4);border-radius:20px;padding:2px 8px;font-size:11px;">${l(o)}</span>`).join("")}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(d.secondarySet??[]).map(o=>`<span style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);border-radius:20px;padding:2px 7px;font-size:10px;">${l(o)}</span>`).join("")}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${(d.contextualSet??[]).slice(0,6).map(o=>`<span style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:20px;padding:2px 7px;font-size:10px;color:var(--text-secondary,#aab);">${l(o)}</span>`).join("")}
      </div>
      <button class="btn ghost tiny" id="cu-copy-all-hashtags" style="margin-top:8px;" data-tags="${[...d.primarySet??[],...d.secondarySet??[],...d.contextualSet??[]].join(" ").replace(/"/g,"&quot;")}">\u{1F4CB} Copiar todos los hashtags</button>
    </div>`:"";a.innerHTML=`
    <div style="background:var(--bg-card,#15151b);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;">\u270D\uFE0F Variantes de Caption \u2014 Reel</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;">${m}</div>
      ${x}
    </div>`,a.querySelectorAll(".cu-copy-caption").forEach(o=>{o.addEventListener("click",async b=>{b.stopPropagation();try{await navigator.clipboard.writeText(o.dataset.text??""),n("\u{1F4CB} Caption copiado","ok")}catch{n("No se pudo copiar","warn")}})}),a.querySelector("#cu-copy-all-hashtags")?.addEventListener("click",async o=>{try{await navigator.clipboard.writeText(o.currentTarget.dataset.tags??""),n("\u{1F4CB} Hashtags copiados","ok")}catch{n("No se pudo copiar","warn")}})};
