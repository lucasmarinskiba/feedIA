import{api as g,apiSafe as b}from"../lib/api.js";import{escape as l}from"../lib/dom.js";import{toast as s}from"../lib/toast.js";import{launchCanvaBrain as S}from"../lib/canvaBrain.js";let t={stories:null,previews:[],currentFrame:0,brand:null};const $=[{value:"engagement",label:"Engagement (polls, preguntas)"},{value:"trafico",label:"Tr\xE1fico a link"},{value:"ventas",label:"Ventas / oferta"},{value:"comunidad",label:"Comunidad / behind the scenes"},{value:"educacion",label:"Educaci\xF3n r\xE1pida"}],w=()=>`
  <div class="studio-form">
    <h3>Generar historias</h3>
    <div class="field">
      <label class="field-label">Mensaje clave</label>
      <textarea class="field-textarea" id="mensaje" placeholder="ej: lanzamiento de mi nuevo curso de IA"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Objetivo</label>
      <select class="field-select" id="objetivo">
        ${$.map(a=>`<option value="${a.value}">${a.label}</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <label class="field-label">Cantidad de frames</label>
      <select class="field-select" id="frames">
        <option value="3">3 frames</option>
        <option value="5" selected>5 frames</option>
        <option value="7">7 frames</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label" style="display:flex;align-items:center;gap:6px;">
        \u{1F3AF} Indicaciones extra para la IA
        <span class="tag tiny" id="brand-hint-pill" style="display:none;background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);">marca detectada</span>
      </label>
      <textarea class="field-textarea" id="indicaciones" rows="2"
        placeholder="Ej: usar stickers interactivos, que el \xFAltimo frame sea solo CTA, tono urgente\u2026"
        style="font-size:12px;"></textarea>
      <div class="small muted" id="brand-hint-text" style="margin-top:4px;display:none;"></div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="generate">\u26A1 Generar</button>
      <button class="btn ghost" id="canva-render" disabled>\u{1F3A8} Render Canva (API)</button>
    </div>
    <button class="btn accent" id="master-brain" style="margin-top:10px;width:100%;padding:14px;font-weight:600;background:linear-gradient(135deg,#7928ca,#e1306c);color:#fff;border:0;border-radius:10px;cursor:pointer;white-space:normal;display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.35;">
      <span>\u{1F9E0} Activar Cerebro Maestro</span>
      <span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain \u2014 todo unido para tus stories</span>
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
    <div class="small muted">Preview 9:16 en mockup de tel\xE9fono. Toc\xE1 un frame en la tira inferior para verlo ampliado.</div>
  </div>`,k=()=>t.stories?`
    <div class="stories-strip">
      ${t.previews.map((a,e)=>`
        <div class="story-thumb ${e===t.currentFrame?"active":""}" data-i="${e}">
          <img src="${a.dataUrl}" alt="frame ${e+1}"/>
          <div class="story-thumb-num">${e+1}</div>
          ${e===t.currentFrame?'<div class="story-thumb-ring"></div>':""}
        </div>`).join("")}
    </div>`:"",j=()=>{if(!t.stories)return"";const a=t.stories.frames[t.currentFrame];return`
    <div class="card" style="margin-top:14px;">
      <div class="meta">
        <span class="tag ${a.tipo==="cta"?"crit":a.tipo==="gancho"?"accent":"info"}">${l(a.tipo)}</span>
        <span class="tag">frame ${a.numero}/${t.stories.frames.length}</span>
      </div>
      <h3>${l(a.textoPrincipal)}</h3>
      <div class="body">${l(a.textoSecundario??"")}</div>
      ${a.sticker?`<div class="small muted" style="margin-top:8px;">\u{1F3AF} Sticker: ${l(a.sticker)}</div>`:""}
      ${a.cta?`<div class="small muted">\u{1F446} CTA: ${l(a.cta)}</div>`:""}
      <div class="small muted" style="margin-top:8px;">\u{1F3A8} Fondo: ${l(a.fondoSugerido)}</div>
    </div>`},y=()=>{if(!t.stories)return`
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:560px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">\u25CE</div>
        <div class="muted">Escrib\xED el mensaje y dale "Generar" para ver las historias ac\xE1.</div>
      </div>`;const a=t.previews[t.currentFrame]??{dataUrl:""},e=(t.brand?.name??"?").charAt(0).toUpperCase();return`
    <div>
      <div class="phone-frame">
        <div class="phone-screen aspect-9-16">
          <div class="story-topbar">
            <div class="story-progress-bar">
              ${t.previews.map((d,i)=>`
                <div class="story-seg ${i<t.currentFrame?"done":i===t.currentFrame?"active":""}"></div>
              `).join("")}
            </div>
            <div class="phone-topbar" style="background:transparent;">
              <div class="phone-avatar story-avatar"><div>${l(e)}</div></div>
              <div class="phone-handle" style="color:#fff;">${l(t.brand?.name??"marca")}</div>
            </div>
          </div>
          <img src="${a.dataUrl}" alt="frame ${t.currentFrame+1}" style="width:100%;height:100%;object-fit:cover;"/>
        </div>
      </div>

      ${k()}
      ${j()}

      <div class="card" style="margin-top:10px;">
        <h3>Estrategia de la secuencia</h3>
        <div class="body">${l(t.stories.estrategia)}</div>
        <div class="divider"></div>
        <div class="tiny muted">\u{1F517} Link sugerido: ${l(t.stories.linkEnBio??"N/A")}</div>
        <div class="tiny muted">\u{1F5D3} Mejor horario: ${l(t.stories.horarioSugerido)}</div>
      </div>
    </div>`},f=a=>{a.querySelectorAll(".story-thumb").forEach(e=>e.addEventListener("click",()=>{t.currentFrame=Number(e.dataset.i),a.innerHTML=y(),f(a)}))},q=a=>{const e=a.querySelector(".studio-form"),d=a.querySelector(".studio-preview");e.querySelector("#generate").addEventListener("click",async()=>{const i=e.querySelector("#mensaje").value.trim(),r=e.querySelector("#objetivo").value,c=Number(e.querySelector("#frames").value),v=e.querySelector("#indicaciones")?.value?.trim()||void 0;if(!i){s("Escrib\xED un mensaje clave primero","crit");return}const u=e.querySelector("#generate");u.disabled=!0,u.innerHTML='<span class="spinner"></span> generando\u2026';try{const p=await g("/api/studio/stories",{body:{mensaje:i,objetivo:r,cantidadFrames:c,extraInstructions:v}}),n=p.stories||p;if(!n?.frames?.length){s("No se generaron frames","crit");return}t.stories=n,t.previews=p.previews||[],t.currentFrame=0,d.innerHTML=y(),f(d),e.querySelector("#canva-render").disabled=!1,s(`${n.frames.length} frames generados`,"ok"),T(a,i,n)}catch(p){s(p.message,"crit")}finally{u.disabled=!1,u.innerHTML="\u26A1 Generar"}}),e.querySelector("#canva-open").addEventListener("click",async()=>{const i=e.querySelector("#mensaje")?.value?.trim()??"";await S({topic:i||t.stories?.estrategia?.slice(0,80)||"Stories sin tema",format:"historia",brand:t.brand,contentPayload:t.stories})}),e.querySelector("#canva-render").addEventListener("click",async()=>{if(!t.stories)return;const i=e.querySelector("#canva-render");i.disabled=!0,i.innerHTML='<span class="spinner"></span> renderizando\u2026';try{const r=await g("/api/studio/canva/stories",{body:{stories:t.stories,titulo:`Stories ${new Date().toISOString().split("T")[0]}`}});r.ok?s(`Canva ok: ${r.designUrl??r.designId??"listo"}`,"ok"):s(`Canva: ${r.error}`,"crit")}catch(r){s(r.message,"crit")}finally{i.disabled=!1,i.innerHTML="\u{1F3A8} Render Canva"}}),e.querySelector("#master-brain")?.addEventListener("click",async()=>{const i=e.querySelector("#mensaje").value.trim();if(!i){s("Escrib\xED un mensaje primero","crit");return}const r=e.querySelector("#master-brain");r.disabled=!0,r.innerHTML="\u{1F9E0} Cerebros trabajando...";try{const{data:c,error:v}=await b("/api/cu/master",null,{method:"POST",body:{userInput:i,intent:"create-content",mode:"supervisor",contentFormat:"stories",topic:i}});if(v){s("Master Brain: "+v,"crit");return}s(`\u{1F9E0} ${(c?.brainsActivated??[]).length} cerebros \xB7 innovaci\xF3n ${c?.innovationScore??"?"}/100`,"ok")}catch(c){s("Master Brain: "+c.message,"crit")}finally{r.disabled=!1,r.innerHTML='<span>\u{1F9E0} Activar Cerebro Maestro</span><span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain \u2014 todo unido para tus stories</span>'}})},C=(a,e)=>{const d=a.querySelector("#brand-hint-pill"),i=a.querySelector("#brand-hint-text"),r=a.querySelector("#indicaciones");if(!d||!i||!r)return;d.style.display="inline-flex";const c=Array.isArray(e?.voice?.tone)?e.voice.tone.join(", "):"",v=Array.isArray(e?.voice?.forbidden)&&e.voice.forbidden.length?`Prohibidas: ${e.voice.forbidden.join(", ")}.`:"",u=e?.brandStrategy?.positioning?`Posicionamiento: ${e.brandStrategy.positioning.slice(0,80)}.`:"",p=[c&&`Tono: ${c}`,v,u].filter(Boolean);if(!p.length)return;const n=p.join(" ");i.textContent=`\u2726 Contexto de marca: ${n}`,i.style.display="block",r.value.trim()||(r.placeholder=n.length>120?n.slice(0,120)+"\u2026":n)};export const renderStoriesStudio=async a=>{t={stories:null,previews:[],currentFrame:0,brand:null};try{t.brand=await g("/api/brand")}catch{}a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Stories Studio</h1>
        <p class="view-subtitle page-subtitle">Secuencias de historias 9:16 con preview real en mockup de tel\xE9fono.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="studio-layout studio-shell">
        ${w()}
        <div class="studio-preview">${y()}</div>
      </div>
    </div>`,q(a),t.brand&&C(a,t.brand);try{const e=sessionStorage.getItem("feedia.hook.preload");if(e){const d=a.querySelector("#mensaje");d&&(d.value=e),sessionStorage.removeItem("feedia.hook.preload"),s("\u{1F3A3} Hook precargado desde Hook Library","ok")}}catch{}};const T=async(a,e,d)=>{let i=a.querySelector("#cu-intelligence-panel");if(!i){const o=a.querySelector(".studio-preview");i=document.createElement("div"),i.id="cu-intelligence-panel",i.style.cssText="margin-top:16px;display:grid;gap:12px;",o?.after(i)}i.innerHTML=`
    <div style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">\u270D\uFE0F Caption para la Historia \xB7 #\uFE0F\u20E3 Hashtags</div>
      <div class="small muted">Generando con IA\u2026<span class="spinner" style="margin-left:8px;"></span></div>
    </div>`;const r=d?.frames?.[0]?.texto??e,c=d?.frames?.map(o=>o.texto).join(" ")??e,[v,u]=await Promise.allSettled([b("/api/caption/variants",null,{method:"POST",body:{topic:e,format:"historia",baseCaption:c}}),b("/api/hashtags/strategy",null,{method:"POST",body:{topic:e,format:"historia",hook:r}})]),p=v.status==="fulfilled"?v.value.data:null,n=u.status==="fulfilled"?u.value.data:null,h=p?["primary","casual","short"].map(o=>{const m=p[o];return m?`
      <div style="background:#0d0d12;border:1px solid var(--border);border-radius:10px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;font-size:12px;">${{primary:"\u{1F3AF} Principal",casual:"\u{1F60A} Casual",short:"\u26A1 Corta"}[o]}</span>
          <button class="btn ghost tiny cu-copy-caption" data-text="${(m.hook??"").replace(/"/g,"&quot;")}" style="padding:2px 8px;font-size:10px;">Copiar</button>
        </div>
        <div style="font-size:12px;opacity:0.85;line-height:1.5;max-height:80px;overflow:hidden;">${l(m.hook??"")}</div>
      </div>`:""}).join(""):'<div class="small muted">No se pudieron generar variantes</div>',x=n?`
    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary,#aab);margin-bottom:6px;">#\uFE0F\u20E3 Hashtags para la historia</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(n.primarySet??[]).map(o=>`<span style="background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.4);border-radius:20px;padding:2px 8px;font-size:11px;">${l(o)}</span>`).join("")}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${(n.secondarySet??[]).map(o=>`<span style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);border-radius:20px;padding:2px 7px;font-size:10px;">${l(o)}</span>`).join("")}
      </div>
      <button class="btn ghost tiny" id="cu-copy-all-hashtags" style="margin-top:8px;" data-tags="${[...n.primarySet??[],...n.secondarySet??[]].join(" ").replace(/"/g,"&quot;")}">\u{1F4CB} Copiar hashtags</button>
    </div>`:"";i.innerHTML=`
    <div style="background:var(--bg-card,#15151b);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;">\u270D\uFE0F Caption para la Historia</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;">${h}</div>
      ${x}
    </div>`,i.querySelectorAll(".cu-copy-caption").forEach(o=>{o.addEventListener("click",async m=>{m.stopPropagation();try{await navigator.clipboard.writeText(o.dataset.text??""),s("\u{1F4CB} Caption copiado","ok")}catch{s("No se pudo copiar","warn")}})}),i.querySelector("#cu-copy-all-hashtags")?.addEventListener("click",async o=>{try{await navigator.clipboard.writeText(o.currentTarget.dataset.tags??""),s("\u{1F4CB} Hashtags copiados","ok")}catch{s("No se pudo copiar","warn")}})};
