import{api as p}from"../lib/api.js";import{escape as l}from"../lib/dom.js";import{toast as d}from"../lib/toast.js";let v="caption";const y=[{id:"caption",icon:"\u270D\uFE0F",label:"Caption IA",desc:"3 captions optimizadas",gradient:"linear-gradient(135deg,#6366f1,#a855f7)"},{id:"hashtags",icon:"\u{1F52C}",label:"Hashtag Lab",desc:"Sets balanceados nicho + tendencia",gradient:"linear-gradient(135deg,#ec4899,#f59e0b)"},{id:"hooks",icon:"\u{1F3A3}",label:"Hook Factory",desc:"Ganchos virales que paran scroll",gradient:"linear-gradient(135deg,#22d3ee,#3b82f6)"},{id:"repurpose",icon:"\u267B\uFE0F",label:"Repurposer",desc:"Reus\xE1 contenido en otros formatos",gradient:"linear-gradient(135deg,#10b981,#22d3ee)"},{id:"safety",icon:"\u{1F6E1}\uFE0F",label:"Safety Check",desc:"Compliance + riesgo de shadowban",gradient:"linear-gradient(135deg,#f59e0b,#ef4444)"},{id:"profile",icon:"\u2728",label:"Profile AI",desc:"Bio, link in bio, highlights",gradient:"linear-gradient(135deg,#a855f7,#ec4899)"}],u=(e,i="Generando\u2026")=>{e.disabled=!0,e._originalHtml=e.innerHTML,e.innerHTML=`<span class="spinner"></span> ${i}`},g=e=>{e.disabled=!1,e.innerHTML=e._originalHtml??e.innerHTML},m=()=>`
  <div class="tool-panel" id="panel-caption">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon gradient">\u270D\uFE0F</div>
        <div>
          <div class="tool-card-title">Caption IA</div>
          <div class="tool-card-desc">Gener\xE1 3 versiones de caption optimizadas para Instagram con hashtags incluidos</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Contexto del post</label>
        <textarea class="input" id="cap-context" rows="3"
          placeholder="Describ\xED qu\xE9 quer\xE9s publicar. Ej: foto en oficina mostrando el proceso de trabajo detr\xE1s de una automatizaci\xF3n\u2026"></textarea>
      </div>
      <div class="tool-row">
        <div class="field-group" style="flex:1">
          <label class="field-label">Formato</label>
          <select class="input" id="cap-format">
            <option value="reel">Reel</option>
            <option value="carrusel" selected>Carrusel</option>
            <option value="post-imagen">Post imagen</option>
            <option value="historia">Historia</option>
          </select>
        </div>
        <div class="field-group" style="flex:1">
          <label class="field-label">Objetivo</label>
          <select class="input" id="cap-goal">
            <option value="engagement" selected>Engagement</option>
            <option value="leads">Leads</option>
            <option value="awareness">Awareness</option>
            <option value="ventas">Ventas</option>
          </select>
        </div>
      </div>
      <button class="btn gradient" id="cap-generate-btn" style="width:100%">\u26A1 Generar 3 captions</button>
    </div>
    <div id="cap-results" style="display:none"></div>
  </div>`,f=(e,i)=>{const t=i.querySelector("#cap-results");t.style.display="";const a=[{label:"Corto \u2014 impacto m\xE1ximo",key:"captionCorto",icon:"\u26A1"},{label:"Medio \u2014 con valor",key:"captionMedio",icon:"\u{1F4DD}"},{label:"Largo \u2014 storytelling",key:"captionLargo",icon:"\u{1F4D6}"}];t.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:14px;">
      ${a.map(({label:s,key:o,icon:r})=>`
        <div class="result-card">
          <div class="result-card-head">
            <span>${r} <strong>${s}</strong></span>
            <button class="btn ghost small copy-btn" data-copy="${l(e[o])}">\u{1F4CB} Copiar</button>
          </div>
          <div class="result-text">${l(e[o])}</div>
        </div>`).join("")}
      <div class="result-card">
        <div class="result-card-head"><span>\u{1F516} Hashtags sugeridos</span>
          <button class="btn ghost small copy-btn" data-copy="${l((e.hashtags??[]).join(" "))}">\u{1F4CB} Copiar</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">
          ${(e.hashtags??[]).map(s=>`<span class="tag accent">${l(s)}</span>`).join("")}
        </div>
      </div>
      <div class="result-card">
        <div class="result-card-head"><span>\u{1F3A3} Hooks alternativos</span></div>
        <ol style="margin:0;padding-left:18px;">
          ${(e.hooksAlternativos??[]).map(s=>`<li class="small" style="margin-bottom:4px">${l(s)}</li>`).join("")}
        </ol>
      </div>
      <div class="result-card" style="border-color:var(--accent);border-width:1.5px">
        <div class="result-card-head"><span>\u{1F4E3} CTA propuesta</span></div>
        <div class="result-text">${l(e.ctaPropuesta??"")}</div>
      </div>
    </div>`,t.querySelectorAll(".copy-btn").forEach(s=>{s.addEventListener("click",()=>{navigator.clipboard.writeText(s.dataset.copy??"").then(()=>d("Copiado \u2713","ok"))})})},x=()=>`
  <div class="tool-panel" id="panel-hashtags">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#405de6,#5851db)">\u{1F52C}</div>
        <div>
          <div class="tool-card-title">Hashtag Lab</div>
          <div class="tool-card-desc">Investig\xE1 y constru\xED sets de hashtags estrat\xE9gicos para maximizar alcance org\xE1nico</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Tema o nicho</label>
        <input class="input" id="ht-topic" placeholder="ej: automatizaci\xF3n con IA para negocios" />
      </div>
      <div class="tool-row">
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="ht-rotate" checked>
          <span class="toggle-track"></span>
          <span class="small">Rotaci\xF3n autom\xE1tica</span>
        </label>
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="ht-niche" checked>
          <span class="toggle-track"></span>
          <span class="small">Incluir hashtags de nicho</span>
        </label>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#405de6,#5851db);border:0;color:#fff;width:100%" id="ht-generate-btn">\u{1F52C} Investigar hashtags</button>
    </div>
    <div id="ht-results" style="display:none"></div>
  </div>`,k=(e,i)=>{const t=i.querySelector("#ht-results");t.style.display="";const a=e.pools??{},s=[["mega","Mega (>10M)","\u{1F30A}"],["grande","Grande (1M-10M)","\u{1F3C4}"],["medio","Medio (100K-1M)","\u{1F3AF}"],["nicho","Nicho (<100K)","\u{1F52C}"],["marca","Marca","\u{1F3F7}\uFE0F"]];t.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:14px">
      ${s.map(([o,r,c])=>{const n=(a[o]??[]).map(b=>b.tag??b).filter(Boolean);return n.length?`
          <div class="result-card">
            <div class="result-card-head">
              <span>${c} <strong>${r}</strong> <span class="tag muted tiny">${n.length}</span></span>
              <button class="btn ghost small copy-btn" data-copy="${l(n.join(" "))}">\u{1F4CB} Copiar set</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">
              ${n.map(b=>`<span class="tag">${l(b)}</span>`).join("")}
            </div>
          </div>`:""}).join("")}
      ${e.seleccionOptima?`
        <div class="result-card" style="border-color:var(--ok);border-width:1.5px">
          <div class="result-card-head">
            <span>\u2705 <strong>Set \xF3ptimo (${(e.seleccionOptima??[]).length} tags)</strong></span>
            <button class="btn ghost small copy-btn" data-copy="${l((e.seleccionOptima??[]).join(" "))}">\u{1F4CB} Copiar</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">
            ${(e.seleccionOptima??[]).map(o=>`<span class="tag ok">${l(o)}</span>`).join("")}
          </div>
        </div>`:""}
    </div>`,t.querySelectorAll(".copy-btn").forEach(o=>{o.addEventListener("click",()=>{navigator.clipboard.writeText(o.dataset.copy??"").then(()=>d("Copiado \u2713","ok"))})})},w=()=>`
  <div class="tool-panel" id="panel-hooks">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#f09433,#e6683c)">\u{1F3A3}</div>
        <div>
          <div class="tool-card-title">Hook Factory</div>
          <div class="tool-card-desc">Gener\xE1 10 hooks de alta retenci\xF3n para cualquier tema usando frameworks probados</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Tema o idea del contenido</label>
        <input class="input" id="hk-idea" placeholder="ej: los errores m\xE1s comunes al automatizar procesos con IA" />
      </div>
      <div class="field-group">
        <label class="field-label">Tipo de hook</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px" id="hk-types">
          ${["pregunta","dato","controversia","historia","lista","misterio","problema","resultado"].map(e=>`<button class="action-chip ${e==="pregunta"||e==="dato"?"active":""}" data-type="${e}">${e}</button>`).join("")}
        </div>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#f09433,#e6683c);border:0;color:#fff;width:100%" id="hk-generate-btn">\u{1F3A3} Generar 10 hooks</button>
    </div>
    <div id="hk-results" style="display:none"></div>
  </div>`,$=(e,i)=>{const t=i.querySelector("#hk-results");t.style.display="",t.innerHTML=`
    <div class="result-card">
      <div class="result-card-head"><span>\u{1F3A3} <strong>${e.length} hooks generados</strong></span>
        <button class="btn ghost small copy-btn" data-copy="${l(e.join(`

`))}">\u{1F4CB} Copiar todos</button>
      </div>
      <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:10px">
        ${e.map((a,s)=>`
          <li style="margin-bottom:0">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <span class="small" style="flex:1">${l(a)}</span>
              <button class="btn ghost small copy-btn" style="flex-shrink:0" data-copy="${l(a)}">\u{1F4CB}</button>
            </div>
          </li>`).join("")}
      </ol>
    </div>`,t.querySelectorAll(".copy-btn").forEach(a=>{a.addEventListener("click",()=>{navigator.clipboard.writeText(a.dataset.copy??"").then(()=>d("Copiado \u2713","ok"))})})},S=()=>`
  <div class="tool-panel" id="panel-repurpose">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#4ade80,#22c55e)">\u267B\uFE0F</div>
        <div>
          <div class="tool-card-title">Content Repurposer</div>
          <div class="tool-card-desc">Convert\xED contenido existente (blog, video, hilo) en formatos Instagram listos para publicar</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">T\xEDtulo del contenido original</label>
        <input class="input" id="rp-title" placeholder="ej: C\xF3mo automatizar tu negocio con IA en 2024" />
      </div>
      <div class="field-group">
        <label class="field-label">Tipo de contenido</label>
        <select class="input" id="rp-type">
          <option value="blog">Art\xEDculo / Blog</option>
          <option value="video">Video / YouTube</option>
          <option value="transcripcion">Transcripci\xF3n</option>
          <option value="twitter">Hilo de Twitter/X</option>
          <option value="linkedin">Post de LinkedIn</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">Texto o transcripci\xF3n</label>
        <textarea class="input" id="rp-text" rows="4" placeholder="Peg\xE1 el contenido original ac\xE1\u2026"></textarea>
      </div>
      <div class="tool-row">
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="rp-carousel" checked>
          <span class="toggle-track"></span>
          <span class="small">Carrusel</span>
        </label>
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="rp-reel" checked>
          <span class="toggle-track"></span>
          <span class="small">Reel</span>
        </label>
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="rp-stories">
          <span class="toggle-track"></span>
          <span class="small">Stories</span>
        </label>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#4ade80,#16a34a);border:0;color:#fff;width:100%" id="rp-generate-btn">\u267B\uFE0F Repurposear contenido</button>
    </div>
    <div id="rp-results" style="display:none"></div>
  </div>`,q=(e,i)=>{const t=i.querySelector("#rp-results");t.style.display="";const a=[...(e.carruseles??[]).map(s=>({tipo:"Carrusel",icon:"\u{1F3A0}",data:s})),...(e.reels??[]).map(s=>({tipo:"Reel",icon:"\u25B6\uFE0F",data:s})),...(e.stories??[]).map(s=>({tipo:"Stories",icon:"\u25CE",data:s}))];t.innerHTML=a.map(({tipo:s,icon:o,data:r})=>`
    <div class="result-card" style="margin-bottom:14px">
      <div class="result-card-head"><span>${o} <strong>${s}</strong></span></div>
      <div class="small">${l(r.hook??r.titulo??"")}</div>
      <div class="tiny muted">${l(r.caption??r.cta??"")}</div>
    </div>`).join("")||'<div class="empty muted small">Sin resultados a\xFAn.</div>'},L=()=>`
  <div class="tool-panel" id="panel-safety">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#f04747,#dc2626)">\u{1F6E1}\uFE0F</div>
        <div>
          <div class="tool-card-title">Safety Auditor</div>
          <div class="tool-card-desc">Audit\xE1 contenido antes de publicar: riesgos de marca, shadow ban, lenguaje problem\xE1tico</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Caption completo</label>
        <textarea class="input" id="sf-caption" rows="4" placeholder="Peg\xE1 el caption completo con hashtags\u2026"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Hooks (opcional, uno por l\xEDnea)</label>
        <textarea class="input" id="sf-hooks" rows="2" placeholder="Hook principal&#10;Gancho alternativo\u2026"></textarea>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#f04747,#dc2626);border:0;color:#fff;width:100%" id="sf-check-btn">\u{1F6E1}\uFE0F Auditar contenido</button>
    </div>
    <div id="sf-results" style="display:none"></div>
  </div>`,T=(e,i)=>{const t=i.querySelector("#sf-results");t.style.display="";const a=e.score??80,s=a>=80?"ok":a>=60?"warn":"crit";t.innerHTML=`
    <div class="result-card">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
        <div class="score-ring-sm">
          <svg viewBox="0 0 60 60" style="width:60px;height:60px">
            <circle cx="30" cy="30" r="24" stroke="rgba(255,255,255,.1)" stroke-width="6" fill="none"/>
            <circle cx="30" cy="30" r="24" stroke="var(--${s})" stroke-width="6" fill="none"
              stroke-dasharray="${2*Math.PI*24}" stroke-dashoffset="${2*Math.PI*24*(1-a/100)}"
              stroke-linecap="round" transform="rotate(-90 30 30)"/>
            <text x="30" y="35" text-anchor="middle" font-size="14" font-weight="800" fill="white">${a}</text>
          </svg>
        </div>
        <div>
          <div class="small" style="font-weight:700">Score de seguridad</div>
          <div class="tiny muted">${e.resumen??""}</div>
        </div>
      </div>
      ${(e.problemas??[]).length?`
        <div style="margin-bottom:10px">
          <div class="small" style="font-weight:700;margin-bottom:6px">\u26A0\uFE0F Problemas detectados</div>
          ${(e.problemas??[]).map(o=>`<div class="small muted" style="margin-bottom:4px">\u2022 ${l(o)}</div>`).join("")}
        </div>`:'<div class="tag ok" style="display:inline-flex">\u2705 Sin problemas detectados</div>'}
      ${(e.sugerencias??[]).length?`
        <div>
          <div class="small" style="font-weight:700;margin-bottom:6px">\u{1F4A1} Sugerencias</div>
          ${(e.sugerencias??[]).map(o=>`<div class="small muted" style="margin-bottom:4px">\u2022 ${l(o)}</div>`).join("")}
        </div>`:""}
    </div>`},C=()=>`
  <div class="tool-panel" id="panel-profile">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:var(--ig-gradient)">\u2728</div>
        <div>
          <div class="tool-card-title">Profile AI Optimizer</div>
          <div class="tool-card-desc">Optimiz\xE1 tu bio, nombre de usuario y propuesta de valor para maximizar conversiones</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Bio actual</label>
        <textarea class="input" id="pf-bio" rows="3" placeholder="Peg\xE1 tu bio actual de Instagram\u2026"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Nombre de usuario actual</label>
        <input class="input" id="pf-handle" placeholder="@tuusuario" />
      </div>
      <div class="field-group">
        <label class="field-label">Objetivo principal</label>
        <select class="input" id="pf-goal">
          <option value="leads">Conseguir leads</option>
          <option value="ventas">Generar ventas</option>
          <option value="autoridad">Construir autoridad</option>
          <option value="comunidad">Crecer comunidad</option>
        </select>
      </div>
      <button class="btn gradient" style="width:100%" id="pf-optimize-btn">\u2728 Optimizar perfil</button>
    </div>
    <div id="pf-results" style="display:none"></div>
  </div>`,A=(e,i)=>{const t=i.querySelector("#pf-results");t.style.display="",t.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:14px">
      ${(e.bios??[]).map((a,s)=>`
        <div class="result-card">
          <div class="result-card-head">
            <span>\u{1F4DD} <strong>Opci\xF3n ${s+1}</strong> ${a.estrategia?`<span class="tag muted tiny">${l(a.estrategia)}</span>`:""}</span>
            <button class="btn ghost small copy-btn" data-copy="${l(a.bio??"")}">\u{1F4CB} Copiar</button>
          </div>
          <div class="result-text">${l(a.bio??"")}</div>
          ${a.razon?`<div class="tiny muted">${l(a.razon)}</div>`:""}
        </div>`).join("")}
      ${e.nombreSugerido?`
        <div class="result-card">
          <div class="result-card-head"><span>\u{1F3F7}\uFE0F <strong>Nombre sugerido</strong></span>
            <button class="btn ghost small copy-btn" data-copy="${l(e.nombreSugerido)}">\u{1F4CB} Copiar</button>
          </div>
          <div class="result-text">${l(e.nombreSugerido)}</div>
        </div>`:""}
      ${e.linkTreeSugerido?`
        <div class="result-card">
          <div class="result-card-head"><span>\u{1F517} <strong>Link in bio sugerido</strong></span></div>
          <div class="tiny muted">${l(e.linkTreeSugerido)}</div>
        </div>`:""}
    </div>`,t.querySelectorAll(".copy-btn").forEach(a=>{a.addEventListener("click",()=>{navigator.clipboard.writeText(a.dataset.copy??"").then(()=>d("Copiado \u2713","ok"))})})},j={caption:m,hashtags:x,hooks:w,repurpose:S,safety:L,profile:C},h=(e,i)=>{const t=e.querySelector("#tool-panel-area");t.innerHTML=j[v]?.()??"",z(e,i)},z=(e,i)=>{e.querySelectorAll(".tool-tab-btn").forEach(t=>{t.addEventListener("click",()=>{v=t.dataset.tab,e.querySelectorAll(".tool-tab-btn").forEach(a=>a.classList.toggle("active",a.dataset.tab===v)),h(e,i)})}),e.querySelectorAll("#hk-types .action-chip").forEach(t=>{t.addEventListener("click",()=>t.classList.toggle("active"))}),e.querySelector("#cap-generate-btn")?.addEventListener("click",async t=>{const a=t.currentTarget,s=e.querySelector("#cap-context")?.value.trim(),o=e.querySelector("#cap-format")?.value;if(!s){d("Escrib\xED el contexto del post","warn");return}u(a);try{const r=await p("/api/tools/caption",{body:{contexto:s,formato:o}});f(r,e)}catch(r){d(r.message,"crit")}finally{g(a)}}),e.querySelector("#ht-generate-btn")?.addEventListener("click",async t=>{const a=t.currentTarget,s=e.querySelector("#ht-topic")?.value.trim();if(!s){d("Ingres\xE1 un tema","warn");return}u(a,"Investigando\u2026");try{const o=await p("/api/tools/hashtags",{body:{tema:s}});k(o,e)}catch(o){d(o.message,"crit")}finally{g(a)}}),e.querySelector("#hk-generate-btn")?.addEventListener("click",async t=>{const a=t.currentTarget,s=e.querySelector("#hk-idea")?.value.trim();if(!s){d("Ingres\xE1 una idea","warn");return}const o=[...e.querySelectorAll("#hk-types .action-chip.active")].map(r=>r.dataset.type);u(a);try{const r=await p("/api/tools/hooks",{body:{idea:s,tipos:o}});$(r.hooks??[],e)}catch(r){d(r.message,"crit")}finally{g(a)}}),e.querySelector("#rp-generate-btn")?.addEventListener("click",async t=>{const a=t.currentTarget,s=e.querySelector("#rp-title")?.value.trim(),o=e.querySelector("#rp-text")?.value.trim(),r=e.querySelector("#rp-type")?.value;if(!s||!o){d("Complet\xE1 t\xEDtulo y texto","warn");return}const c={carruseles:e.querySelector("#rp-carousel")?.checked?1:0,reels:e.querySelector("#rp-reel")?.checked?1:0,stories:e.querySelector("#rp-stories")?.checked?1:0};u(a,"Repurposeando\u2026");try{const n=await p("/api/tools/repurpose",{body:{titulo:s,tipo:r,texto:o,...c}});q(n,e)}catch(n){d(n.message,"crit")}finally{g(a)}}),e.querySelector("#sf-check-btn")?.addEventListener("click",async t=>{const a=t.currentTarget,s=e.querySelector("#sf-caption")?.value.trim();if(!s){d("Peg\xE1 el caption a auditar","warn");return}const o=e.querySelector("#sf-hooks")?.value.trim(),r=o?o.split(`
`).filter(Boolean):[];u(a,"Auditando\u2026");try{const c=await p("/api/tools/safety",{body:{caption:s,hooks:r}});T(c,e)}catch(c){d(c.message,"crit")}finally{g(a)}}),e.querySelector("#pf-optimize-btn")?.addEventListener("click",async t=>{const a=t.currentTarget,s=e.querySelector("#pf-bio")?.value.trim();if(!s){d("Peg\xE1 tu bio actual","warn");return}u(a,"Analizando\u2026");try{const o=await p("/api/tools/profile",{body:{bio:s,handle:e.querySelector("#pf-handle")?.value.trim(),objetivo:e.querySelector("#pf-goal")?.value}});A(o,e)}catch(o){d(o.message,"crit")}finally{g(a)}})};export const renderTools=async e=>{v="caption",e.innerHTML=`
    <!-- Hero gradient -->
    <header class="tools-hero">
      <div class="tools-hero-content">
        <div class="tools-hero-emoji">\u{1F9F0}</div>
        <div>
          <h1 class="tools-hero-title">AI Toolbox</h1>
          <p class="tools-hero-sub">6 herramientas de IA especializadas para cada etapa de tu contenido. Gener\xE1, mejor\xE1, valid\xE1.</p>
        </div>
      </div>
      <div class="tools-hero-stats">
        <div class="tools-hero-stat"><div class="num">${y.length}</div><div class="lbl">herramientas</div></div>
        <div class="tools-hero-stat"><div class="num">\u221E</div><div class="lbl">generaciones</div></div>
        <div class="tools-hero-stat"><div class="num">\u26A1</div><div class="lbl">tiempo real</div></div>
      </div>
    </header>

    <!-- Grid de tools \u2014 visual cards -->
    <div class="tools-grid" id="tools-grid">
      ${y.map(i=>`
        <button class="tools-card ${i.id===v?"active":""}" data-tab="${i.id}" style="--tool-grad:${i.gradient}">
          <div class="tools-card-icon">${i.icon}</div>
          <div class="tools-card-info">
            <div class="tools-card-name">${i.label}</div>
            <div class="tools-card-desc">${i.desc}</div>
          </div>
          <div class="tools-card-arrow">\u2192</div>
        </button>`).join("")}
    </div>

    <!-- Active panel -->
    <div id="tool-panel-area" class="page-body tools-panel-area"></div>

    <style>
      .tools-hero {
        display: flex; align-items: center; justify-content: space-between; gap: 18px;
        padding: 22px 24px; margin-bottom: 18px;
        background: linear-gradient(135deg, #1a1a2e, #2a1a3e 50%, #1a2a3e);
        border-radius: 18px; position: relative; overflow: hidden;
        flex-wrap: wrap;
      }
      .tools-hero::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(circle at 0% 100%, rgba(168,85,247,.25), transparent 50%),
                    radial-gradient(circle at 100% 0%, rgba(236,72,153,.18), transparent 50%);
        pointer-events: none;
      }
      .tools-hero-content { display: flex; align-items: center; gap: 16px; position: relative; }
      .tools-hero-emoji { font-size: 48px; line-height: 1; filter: drop-shadow(0 4px 12px rgba(168,85,247,.4)); }
      .tools-hero-title { font-size: 28px; font-weight: 800; margin: 0; }
      .tools-hero-sub { font-size: 13.5px; color: rgba(255,255,255,.75); margin: 4px 0 0; max-width: 520px; line-height: 1.5; }
      .tools-hero-stats { display: flex; gap: 14px; position: relative; }
      .tools-hero-stat {
        background: rgba(255,255,255,.06); backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,.1); border-radius: 12px;
        padding: 10px 16px; text-align: center; min-width: 80px;
      }
      .tools-hero-stat .num { font-size: 22px; font-weight: 800; }
      .tools-hero-stat .lbl { font-size: 10px; opacity: .7; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }

      .tools-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;
        margin-bottom: 22px;
      }
      .tools-card {
        position: relative; display: flex; align-items: center; gap: 12px; padding: 14px;
        border-radius: 14px; border: 1px solid var(--border, #2a2a32);
        background: var(--surface, #141418); color: var(--fg, #fff);
        cursor: pointer; text-align: left;
        transition: transform .15s, border-color .15s, box-shadow .2s;
        overflow: hidden;
      }
      .tools-card::before {
        content: ''; position: absolute; inset: 0; opacity: 0;
        background: var(--tool-grad); transition: opacity .2s;
      }
      .tools-card > * { position: relative; z-index: 1; }
      .tools-card:hover { transform: translateY(-2px); border-color: transparent; box-shadow: 0 8px 24px rgba(168,85,247,.25); }
      .tools-card:hover::before { opacity: .15; }
      .tools-card.active { border-color: transparent; box-shadow: 0 8px 24px rgba(168,85,247,.4); }
      .tools-card.active::before { opacity: 1; }
      .tools-card.active .tools-card-desc { color: rgba(255,255,255,.85); }
      .tools-card-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
      .tools-card-info { flex: 1; min-width: 0; }
      .tools-card-name { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
      .tools-card-desc { font-size: 11.5px; color: var(--text-muted, #9CA3AF); line-height: 1.4; }
      .tools-card-arrow { font-size: 18px; opacity: .5; transition: transform .15s, opacity .15s; }
      .tools-card:hover .tools-card-arrow { opacity: 1; transform: translateX(2px); }
      .tools-card.active .tools-card-arrow { opacity: 1; }

      .tools-panel-area .tool-card {
        background: var(--surface, #141418); border: 1px solid var(--border, #2a2a32);
        border-radius: 14px; padding: 20px;
      }
    </style>`,e.querySelector("#tools-grid")?.addEventListener("click",i=>{const t=i.target.closest(".tools-card");t&&(v=t.dataset.tab,e.querySelectorAll(".tools-card").forEach(a=>a.classList.toggle("active",a===t)),h(e,e),e.querySelector("#tool-panel-area")?.scrollIntoView({behavior:"smooth",block:"start"}))}),h(e,e)};
