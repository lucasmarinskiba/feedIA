import{apiSafe as v}from"../lib/api.js";import{escape as i}from"../lib/dom.js";import{toast as g}from"../lib/toast.js";import{launchCanvaBrain as f}from"../lib/canvaBrain.js";const h=[{id:"feedIA-canva",title:"Canva \xB7 Generador",category:"Creaci\xF3n visual",description:"Carruseles/stories/reels desde YouTube, art\xEDculo, idea, PDF o post IG. IA-render o Canva-CU."},{id:"feedIA-canvas-design",title:"Canvas Design",category:"Creaci\xF3n visual",description:"Cerebro de dise\xF1o compartido: reglas visuales, hooks, paleta brand-aware."},{id:"feedIA-reel-generator",title:"Reel Generator",category:"Creaci\xF3n visual",description:"Reels multi-fuente: guion beat a beat + hook 0.3s + cover."},{id:"feedIA-story-generator",title:"Story Generator",category:"Creaci\xF3n visual",description:"Stories 9:16 + stickers interactivos + CTA."},{id:"feedIA-cu-brain",title:"Computer Use Brain",category:"Cerebro / Computer Use",description:"CU brain-aware: memoria + safety + RL operando Canva/IG."},{id:"feedIA-quick-carousel",title:"Quick Carousel",category:"Creaci\xF3n visual",description:"Carrusel completo desde 1 prompt m\xEDnimo."}],y={"Creaci\xF3n visual":"\u{1F3A8}","Cerebro / Computer Use":"\u{1F9E0}","Copy & estrategia":"\u270D\uFE0F","Ventas & ads":"\u{1F4B0}",Comunidad:"\u2764\uFE0F",Operaci\u00F3n:"\u2699\uFE0F",General:"\u26A1"};let u=null;const c=()=>{u&&(clearInterval(u),u=null)};window.addEventListener("hashchange",()=>{(location.hash.replace("#","")||"feed")!=="skills"&&c()});const w=()=>`
  <div class="skills-gen">
    <div class="skills-gen-head">
      <div class="skills-gen-emoji">\u{1F3A8}</div>
      <div>
        <h2>Generador de contenido con IA</h2>
        <p class="small muted">Peg\xE1 una URL de YouTube/art\xEDculo o escrib\xED una idea. FeedIA lo transforma en carrusel listo: estrategia + PNGs 1080\xD71350, o lo dise\xF1a en Canva con Computer Use.</p>
      </div>
    </div>
    <textarea id="sk-input" class="skills-gen-input" rows="2"
      placeholder="Ej: https://youtu.be/... \xB7 'errores al automatizar con IA' \xB7 peg\xE1 el link del art\xEDculo"></textarea>
    <div class="skills-gen-row">
      <select id="sk-format" class="input">
        <option value="carrusel">\u{1F0CF} Carrusel</option>
        <option value="reel">\u25B6\uFE0F Reel</option>
        <option value="historia">\u25CE Story</option>
      </select>
      <select id="sk-model" class="input">
        <option value="gpt-image-2">gpt-image-2 (calidad)</option>
        <option value="nano-banana-2">nano-banana-2 (r\xE1pido)</option>
      </select>
    </div>
    <div class="skills-gen-actions">
      <button class="btn primary" id="sk-generate">\u26A1 Generar con IA-render</button>
      <button class="btn canva-cta-btn" id="sk-canva">
        <span class="canva-cta-emoji">\u{1F3A8}</span>
        <span class="canva-cta-body">
          <span class="canva-cta-title">Dise\xF1ar en Canva (Computer Use)</span>
          <span class="canva-cta-sub">Equipo de especialistas opera Canva</span>
        </span>
        <span class="canva-cta-arrow">\u2192</span>
      </button>
    </div>
    <div id="sk-result" class="skills-gen-result"></div>
  </div>`,C=a=>{const d=a?.skills?.length?a.skills:h,p=a?.categories?.length?a.categories:[...new Set(d.map(l=>l.category))];return`
    <div class="skills-catalog">
      <div class="skills-cat-head">
        <h3>Cat\xE1logo de skills \xB7 ${d.length}</h3>
        <input id="sk-search" class="input" placeholder="Buscar skill\u2026" style="max-width:260px;">
      </div>
      ${p.map(l=>`
        <div class="skills-cat" data-cat="${i(l)}">
          <div class="skills-cat-label">${y[l]??"\u26A1"} ${i(l)}</div>
          <div class="skills-grid">
            ${d.filter(s=>s.category===l).map(s=>`
              <div class="skills-card" data-skill="${i(s.id)}" data-name="${i(s.title.toLowerCase())} ${i(s.description.toLowerCase())}">
                <div class="skills-card-title">${i(s.title)}</div>
                <div class="skills-card-desc">${i((s.description??"").slice(0,160))}</div>
                <code class="skills-card-id">/${i(s.id)}</code>
              </div>`).join("")}
          </div>
        </div>`).join("")}
    </div>`};export const renderSkills=async a=>{c(),a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u26A1 Skills de FeedIA</h1>
        <p class="view-subtitle page-subtitle">Todas las habilidades del sistema. Gener\xE1 carruseles/reels/stories reales o explor\xE1 el cat\xE1logo completo.</p>
      </div>
    </header>
    <div class="page-body">
      ${w()}
      <div id="sk-catalog"><div class="loading-screen"><span class="spinner lg"></span></div></div>
    </div>
    <style>
      /* enterprise look: cards blancas + texto oscuro legible */
      .skills-gen{background:linear-gradient(135deg,#F8FAFF,#FFF);border:1px solid #E3E6EB;border-radius:18px;padding:22px;margin-bottom:22px;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .skills-gen-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;}
      .skills-gen-emoji{font-size:36px;line-height:1;}
      .skills-gen-head h2{margin:0 0 4px;font-size:18px;color:#15181E;}
      .skills-gen-head p{color:#475067;}
      .skills-gen-input{width:100%;box-sizing:border-box;background:#fff;border:1px solid #E3E6EB;border-radius:12px;padding:12px 14px;color:#15181E;font-size:14px;resize:vertical;font-family:inherit;}
      .skills-gen-input::placeholder{color:#98A1B3;}
      .skills-gen-input:focus{border-color:#9da9ff;outline:none;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      .skills-gen-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
      .skills-gen-row .input{flex:1;min-width:140px;background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:12px;padding:11px 13px;}
      .skills-gen-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}
      .skills-gen-actions .btn{border-radius:999px !important;font-weight:700;}
      .skills-gen-result{margin-top:14px;}
      .skills-log{background:#0F1115;color:#E8E9EC;border-radius:10px;padding:12px;font-family:ui-monospace,Consolas,monospace;font-size:11.5px;max-height:240px;overflow-y:auto;line-height:1.5;}
      .skills-log-line{color:rgba(255,255,255,.82);padding:1px 0;}
      .skills-slides{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px;}
      .skills-slides img{width:100%;border-radius:10px;border:1px solid #E6E8EE;}
      .skills-cat-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;}
      .skills-cat-head h3{margin:0;color:#15181E;}
      .skills-cat-head .input{background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:999px;padding:10px 16px;min-width:240px;}
      .skills-cat-head .input::placeholder{color:#98A1B3;}
      .skills-cat{margin-bottom:24px;}
      .skills-cat-label{font-size:12px;font-weight:800;color:#667085;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
      .skills-cat-label::before{content:'';width:24px;height:2px;background:linear-gradient(90deg,#7C3AED,transparent);}
      .skills-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}
      .skills-card{background:#fff;border:1px solid #E6E8EE;border-radius:14px;padding:16px;transition:border-color .15s,transform .15s,box-shadow .15s;cursor:default;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .skills-card:hover{border-color:#9da9ff;transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,.12);}
      .skills-card-title{font-weight:800;font-size:14px;margin-bottom:6px;color:#15181E;}
      .skills-card-desc{font-size:12px;color:#475067;line-height:1.5;margin-bottom:10px;}
      .skills-card-id{font-size:10.5px;font-weight:700;color:#7C3AED;background:rgba(124,58,237,.1);padding:3px 9px;border-radius:999px;letter-spacing:.02em;}
      .skills-card.hidden{display:none;}
    </style>`;const{data:d}=await v("/api/skills/list",null);a.querySelector("#sk-catalog").innerHTML=C(d);const p=a.querySelector("#sk-search");p?.addEventListener("input",()=>{const l=p.value.toLowerCase().trim();a.querySelectorAll(".skills-card").forEach(s=>{s.classList.toggle("hidden",l&&!s.dataset.name.includes(l))}),a.querySelectorAll(".skills-cat").forEach(s=>{const o=[...s.querySelectorAll(".skills-card")].some(m=>!m.classList.contains("hidden"));s.style.display=o?"":"none"})}),a.querySelector("#sk-canva")?.addEventListener("click",async()=>{const l=a.querySelector("#sk-input").value.trim(),s=a.querySelector("#sk-format").value;await f({topic:l||"Contenido sin tema",format:s})}),a.querySelector("#sk-generate")?.addEventListener("click",async()=>{const l=a.querySelector("#sk-input").value.trim(),s=a.querySelector("#sk-model").value;if(!l){g("Peg\xE1 una URL o escrib\xED una idea","warn");return}const o=a.querySelector("#sk-result");o.innerHTML='<div class="card"><div class="row" style="gap:10px;align-items:center;"><span class="spinner"></span><div><strong>Generando\u2026</strong><div class="small muted">FeedIA est\xE1 analizando la fuente y produciendo el contenido.</div></div></div></div>';const m=a.querySelector("#sk-format").value,{data:r,error:x}=await v("/api/skills/carousel/generate",null,{method:"POST",body:{input:l,model:s,format:m}});if(x||!r){o.innerHTML='<div class="card"><div class="small muted">\u{1F4E1} Backend del generador offline. Us\xE1 el camino Canva (Computer Use) o reintent\xE1 cuando el server vuelva.</div></div>';return}const k=e=>{const t=(e.slides??[]).length?`<div class="skills-slides">${e.slides.map(n=>{const b=n.url?n.url:`/api/skills/carousel/slide/${encodeURIComponent(e.jobId??"")}/${encodeURIComponent(n.name??n)}`;return`<img src="${i(b)}" alt="slide ${i(String(n.num??""))}" onerror="this.style.display='none'">`}).join("")}</div>`:"";o.innerHTML=`
        <div class="card">
          <div class="row spread" style="margin-bottom:8px;">
            <strong>${e.status==="done"?"\u2705 Listo":e.status==="error"?"\u26A0\uFE0F Error":e.status==="plan-only"?"\u{1F4CB} Solo estrategia":"\u{1F504} "+i(e.status??"")}</strong>
            <span class="small muted">${i(e.format??"")} \xB7 ${i(e.model??s)}</span>
          </div>
          ${e.error?`<div class="small crit" style="margin-bottom:8px;">${i(e.error)}</div>`:""}
          ${e.status==="plan-only"?`<div class="small muted" style="margin-bottom:8px;">\u26A0\uFE0F Falta <code>FAL_KEY</code> para render real. Estrategia generada (${(e.strategy?.slides??[]).length} slides). Us\xE1 el camino <strong>Canva (Computer Use)</strong> o configur\xE1 FAL_KEY.</div>`:""}
          ${(e.log??[]).length?`<div class="skills-log">${e.log.map(n=>`<div class="skills-log-line">${i(n)}</div>`).join("")}</div>`:""}
          ${t}
          ${e.caption?`<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${i(e.caption)}</div></div>`:""}
          ${e.hashtags?`<div class="small muted" style="margin-top:8px;">${i(e.hashtags)}</div>`:""}
        </div>`};if(r.status){k(r),g(r.status==="done"?"\u{1F389} Im\xE1genes generadas":r.status==="plan-only"?"Estrategia lista (sin FAL_KEY)":"Error en generaci\xF3n",r.status==="error"?"warn":"ok");return}if(r.jobId){o.innerHTML='<div class="card"><div class="row" style="gap:10px;align-items:center;"><span class="spinner"></span><div><strong>Generando\u2026</strong></div></div></div>',c();const e=Date.now();u=setInterval(async()=>{if(Date.now()-e>18e4){c(),g("Tard\xF3 demasiado \xB7 revis\xE1 logs","warn");return}const{data:t}=await v(`/api/skills/carousel/status/${r.jobId}`,null);t&&(t.jobId=r.jobId,k(t),["done","error","plan-only"].includes(t.status)&&(c(),g(t.status==="done"?"\u{1F389} Contenido generado":t.status==="plan-only"?"Estrategia lista":"Error",t.status==="error"?"warn":"ok")))},2e3);return}o.innerHTML='<div class="card"><div class="small muted">Respuesta inesperada del generador.</div></div>'})};
