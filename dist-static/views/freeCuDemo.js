import{escape as s}from"../lib/dom.js";import{toast as o}from"../lib/toast.js";const $={"strategy:start":"\u{1F9E0} Pensando estrategia...","strategy:done":"\u2705 Plan estrat\xE9gico listo","content:start":"\u270D\uFE0F Escribiendo carrusel con Llama 3.3 70B...","content:done":"\u2705 Slides + caption + hashtags listos","images:start":"\u{1F3A8} Generando im\xE1genes con Pollinations Flux...","images:done":"\u2705 Im\xE1genes listas","predict:start":"\u{1F4CA} Calculando score viral...","predict:done":"\u2705 Score viral calculado","recipe:start":"\u{1F916} Armando script Computer Use...","recipe:done":"\u2705 Recipe lista para publicar",done:"\u{1F389} Demo completa"},u=()=>`
  <div class="fcd-card">
    <h2 class="fcd-title">\u{1F3AC} Mir\xE1 FeedIA crear y publicar tu primer carrusel</h2>
    <p class="fcd-sub">Plan Free. $0. Llama 3.3 70B + Pollinations Flux. Vas a ver TODO el proceso paso a paso.</p>

    <div class="fcd-field">
      <label>\xBFSobre qu\xE9 armamos el carrusel?</label>
      <input id="fcd-topic" type="text" placeholder="Ej: c\xF3mo automatizar mi marketing con IA" autocomplete="off" maxlength="120" />
    </div>
    <div class="fcd-field-row">
      <div class="fcd-field">
        <label>Nicho</label>
        <input id="fcd-niche" type="text" placeholder="marketing / fitness / IA" maxlength="40" />
      </div>
      <div class="fcd-field">
        <label>Voz de marca</label>
        <select id="fcd-voice">
          <option value="cercano">Cercano</option>
          <option value="profesional">Profesional</option>
          <option value="humor\xEDstico">Humor\xEDstico</option>
          <option value="inspirador">Inspirador</option>
        </select>
      </div>
    </div>

    <button class="fcd-cta" id="fcd-start">
      <span class="fcd-cta-icon">\u25B6\uFE0F</span>
      Empezar la demo (5 min CU)
    </button>
    <p class="fcd-disclaimer">Consume ~5 min del cap diario de 30 min Computer Use. Costo a vos: $0.</p>
  </div>`,b=()=>`
  <div class="fcd-card fcd-progress-card">
    <h2 class="fcd-title">\u{1F3AC} FeedIA trabajando en vivo...</h2>
    <p class="fcd-sub">Mir\xE1 cada paso ejecut\xE1ndose. Si bloque\xE1s esta pesta\xF1a, el proceso sigue en backend.</p>

    <div class="fcd-stages" id="fcd-stages">
      <div class="fcd-stage active" data-stage="strategy">
        <div class="fcd-stage-num">1</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">\u{1F9E0} Estrategia</div>
          <div class="fcd-stage-detail">Detectando audiencia, formato \xF3ptimo, top 5 hooks</div>
        </div>
        <div class="fcd-stage-status"><span class="fcd-spin"></span></div>
      </div>
      <div class="fcd-stage" data-stage="content">
        <div class="fcd-stage-num">2</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">\u270D\uFE0F Contenido</div>
          <div class="fcd-stage-detail">Llama 3.3 70B escribe 7 slides + caption + 12 hashtags</div>
        </div>
        <div class="fcd-stage-status">\u23F3</div>
      </div>
      <div class="fcd-stage" data-stage="images">
        <div class="fcd-stage-num">3</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">\u{1F3A8} Im\xE1genes</div>
          <div class="fcd-stage-detail">Pollinations Flux genera 7 im\xE1genes 1080\xD71350 en paralelo</div>
        </div>
        <div class="fcd-stage-status">\u23F3</div>
      </div>
      <div class="fcd-stage" data-stage="predict">
        <div class="fcd-stage-num">4</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">\u{1F4CA} Predicci\xF3n viral</div>
          <div class="fcd-stage-detail">Algoritmo predice reach, engagement, saves, shares</div>
        </div>
        <div class="fcd-stage-status">\u23F3</div>
      </div>
      <div class="fcd-stage" data-stage="recipe">
        <div class="fcd-stage-num">5</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">\u{1F916} Computer Use Recipe</div>
          <div class="fcd-stage-detail">11 pasos automatizados para subir al Instagram</div>
        </div>
        <div class="fcd-stage-status">\u23F3</div>
      </div>
    </div>

    <div class="fcd-tip">
      \u{1F4A1} <strong>Sab\xEDas que...</strong> <span id="fcd-tip-text">FeedIA usa Llama 3.3 70B v\xEDa Groq \u2014 el mismo modelo que potencia chatbots de empresas top mundial. Y vos lo us\xE1s gratis.</span>
    </div>
  </div>`,m=e=>{const t=e.content?.slides||[],a=e.prediction||{},d=e.publishRecipe||{},r=a.viralScore>=70?"#10b981":a.viralScore>=55?"#3b82f6":"#f59e0b";return`
    <div class="fcd-card fcd-result-hero">
      <div class="fcd-hero-badge">\u2705 Carrusel completo en ${(e.timing?.totalMs/1e3).toFixed(1)}s</div>
      <h2 class="fcd-title">"${s(e.topic)}"</h2>
      <p class="fcd-sub">${t.length} slides + caption + ${e.content?.hashtags?.length||0} hashtags + recipe Computer Use lista. Costo a vos: <strong>$0</strong>.</p>
    </div>

    <div class="fcd-card">
      <div class="fcd-section-head">
        <h3>\u{1F4CA} Predicci\xF3n viral</h3>
        <div class="fcd-viral-badge" style="background:${r}22;color:${r};">${a.viralScore}/100 \xB7 ${s(a.virality||"solid")}</div>
      </div>
      <div class="fcd-pred-grid">
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(a.predicted?.reach||0).toLocaleString("es-AR")}</div><div class="fcd-pred-lbl">alcance</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${((a.predicted?.engagementRate||0)*100).toFixed(1)}%</div><div class="fcd-pred-lbl">engagement</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(a.predicted?.saves||0).toLocaleString("es-AR")}</div><div class="fcd-pred-lbl">saves</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(a.predicted?.shares||0).toLocaleString("es-AR")}</div><div class="fcd-pred-lbl">shares</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(a.predicted?.comments||0).toLocaleString("es-AR")}</div><div class="fcd-pred-lbl">comments</div></div>
      </div>
    </div>

    <div class="fcd-card">
      <h3>\u{1F3AC} Slides generados (${t.length})</h3>
      <div class="fcd-slides-grid">
        ${t.map(i=>`
          <div class="fcd-slide-card">
            ${i.imageUrl?`<img src="${s(i.imageUrl)}" alt="Slide ${i.n}" loading="lazy" />`:'<div class="fcd-slide-placeholder">Imagen pendiente</div>'}
            <div class="fcd-slide-body">
              <div class="fcd-slide-num">Slide ${i.n}/${t.length}</div>
              <div class="fcd-slide-headline">${s(i.headline||"")}</div>
              ${i.body?`<div class="fcd-slide-body-text">${s(i.body)}</div>`:""}
            </div>
          </div>`).join("")}
      </div>
    </div>

    <div class="fcd-card">
      <div class="fcd-section-head">
        <h3>\u{1F4DD} Caption + Hashtags</h3>
        <button class="fcd-copy-btn" data-copy="${encodeURIComponent(`${e.content?.caption||""}

${(e.content?.hashtags||[]).join(" ")}`)}">\u{1F4CB} Copiar todo</button>
      </div>
      <pre class="fcd-caption">${s(e.content?.caption||"")}</pre>
      <div class="fcd-tags">
        ${(e.content?.hashtags||[]).map(i=>`<span class="fcd-tag">${s(i)}</span>`).join("")}
      </div>
    </div>

    <div class="fcd-card fcd-recipe-card">
      <h3>\u{1F916} Computer Use Recipe \u2014 Publicar en Instagram</h3>
      <p class="fcd-sub">${d.totalSteps} pasos \xB7 ${d.estimatedMinutes} min estimado \xB7 Sin gasto adicional</p>
      <div class="fcd-recipe-steps">
        ${(d.steps||[]).map(i=>`
          <div class="fcd-step">
            <div class="fcd-step-num">${i.n}</div>
            <div class="fcd-step-icon">${i.icon}</div>
            <div class="fcd-step-body">
              <div class="fcd-step-label">${s(i.label)}</div>
              <div class="fcd-step-detail">${s(typeof i.detail=="string"?i.detail:`${(i.detail||[]).length} items`)}</div>
            </div>
            <div class="fcd-step-time">${i.estimatedSec}s</div>
          </div>`).join("")}
      </div>
      <div class="fcd-actions">
        <button class="fcd-action-btn primary" id="fcd-execute-cu">\u{1F680} Ejecutar Computer Use ahora</button>
        <button class="fcd-action-btn secondary" id="fcd-download-zip">\u{1F4E6} Descargar paquete (im\xE1genes + caption)</button>
        <button class="fcd-action-btn ghost" id="fcd-new-demo">\u{1F504} Nueva demo</button>
      </div>
    </div>

    <div class="fcd-card fcd-upgrade-card">
      <h3>\u{1F680} \xBFTe gust\xF3 lo que viste?</h3>
      <p>Free es un sneak peek. En <strong>Starter $7</strong> ten\xE9s:</p>
      <ul>
        <li>\u2728 Claude Sonnet 4.6 (calidad agencia) en lugar de Llama free</li>
        <li>\u{1F5BC}\uFE0F Im\xE1genes Full HD garantizadas con Flux-Dev en lugar de Pollinations</li>
        <li>\u{1F3AF} Viral score \u226565 obligatorio (regenera hasta cumplir)</li>
        <li>\u{1F916} Computer Use 90 min/d\xEDa + autopilot auto-execute</li>
        <li>\u{1F4CA} 20 publicaciones PREMIUM/mes garantizadas</li>
      </ul>
      <a class="fcd-action-btn primary" href="/pricing.html">Ver todos los planes \u2192</a>
    </div>
  `},x=e=>{const t=e.querySelector("#fcd-start");t&&t.addEventListener("click",async()=>{const a=e.querySelector("#fcd-topic")?.value.trim();if(!a||a.length<5){o("Decile un tema de al menos 5 caracteres","warn");return}const d=e.querySelector("#fcd-niche")?.value.trim()||"",r=e.querySelector("#fcd-voice")?.value||"cercano";e.innerHTML=b(),h(e);try{const i=await fetch("/api/free-cu/carousel-demo",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:a,brandNiche:d,brandVoice:r,platform:"instagram",goal:"engagement"})}),c=await i.json();if(!i.ok){o(c.message||"No se pudo correr la demo","err"),i.status===402?setTimeout(()=>{location.href=c.upgradeUrl||"/pricing.html"},1500):setTimeout(()=>l(e),1500);return}c.topic=a,e.innerHTML=m(c),y(e,c)}catch{o("Error de red","err"),setTimeout(()=>l(e),1500)}})},h=e=>{const t=["strategy","content","images","predict","recipe"],a=["FeedIA usa Llama 3.3 70B v\xEDa Groq \u2014 el mismo modelo que potencia chatbots de empresas top mundial. Y vos lo us\xE1s gratis.","Pollinations Flux genera im\xE1genes con calidad similar a Midjourney sin gastar tokens.","El viral predictor usa heur\xEDsticas calibradas contra patrones reales de IG/TikTok virales.","Computer Use recipe = pasos deterministas para publicar sin pagar Claude Computer Use real.","Plan Pro $19 desbloquea Sonnet 4.6 + viral score \u226572 garantizado + autopilot cada 30 min."];let d=0,r=0;const i=e.querySelector("#fcd-tip-text"),c=Array.from(e.querySelectorAll(".fcd-stage")),v=setInterval(()=>{i&&(r=(r+1)%a.length,i.textContent=a[r])},4e3),g=setInterval(()=>{if(d>=t.length){clearInterval(g);return}const n=c.find(f=>f.dataset.stage===t[d]);n&&(n.classList.remove("active"),n.classList.add("done"),n.querySelector(".fcd-stage-status").innerHTML="\u2705"),d++;const p=c.find(f=>f.dataset.stage===t[d]);p&&(p.classList.add("active"),p.querySelector(".fcd-stage-status").innerHTML='<span class="fcd-spin"></span>')},2e3);e._fcdIntervals=[v,g]},y=(e,t)=>{(e._fcdIntervals||[]).forEach(a=>clearInterval(a)),e.querySelectorAll("[data-copy]").forEach(a=>{a.addEventListener("click",()=>{const d=decodeURIComponent(a.dataset.copy);try{navigator.clipboard.writeText(d),o("\u{1F4CB} Copiado","ok")}catch{o("No se pudo copiar","err")}})}),e.querySelector("#fcd-execute-cu")?.addEventListener("click",()=>{o("\u{1F680} Para ejecutar CU real: upgrade a Starter ($7/mes)","info"),setTimeout(()=>{location.href="/pricing.html"},1200)}),e.querySelector("#fcd-download-zip")?.addEventListener("click",()=>{o("\u{1F4E6} Generando paquete...","info");const a=t.content?.slides?.[0]?.imageUrl;a&&window.open(a,"_blank")}),e.querySelector("#fcd-new-demo")?.addEventListener("click",()=>l(e))},l=e=>{e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F3AC} Free Carousel Demo</h1>
        <p class="view-subtitle page-subtitle">Mir\xE1 FeedIA crear y publicar un carrusel paso a paso \xB7 100% gratis \xB7 0 setup</p>
      </div>
    </header>
    <div class="page-body" id="fcd-container">
      ${u()}
    </div>
    <style>
      .fcd-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:16px;color:var(--text-primary,var(--fg));}
      .fcd-title{font-size:22px;letter-spacing:-0.02em;margin:0 0 6px;}
      .fcd-sub{font-size:13.5px;color:var(--text-tertiary,#888);margin:0 0 18px;line-height:1.5;}
      .fcd-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
      .fcd-field label{font-size:12px;font-weight:600;color:var(--text-secondary,#666);}
      .fcd-field input,.fcd-field select{padding:11px 13px;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border-soft,rgba(17,18,22,.08));border-radius:10px;color:var(--text-primary,var(--fg));font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;}
      .fcd-field input:focus,.fcd-field select:focus{border-color:rgba(225,48,108,.45);box-shadow:0 0 0 3px rgba(225,48,108,.08);}
      .fcd-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .fcd-cta{width:100%;padding:16px 18px;border:0;border-radius:12px;background:linear-gradient(135deg,#f09433,#e1306c 40%,#a855f7);color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;transition:filter .15s,transform .12s;}
      .fcd-cta:hover{filter:brightness(1.08);} .fcd-cta:active{transform:scale(.985);}
      .fcd-cta-icon{font-size:18px;}
      .fcd-disclaimer{font-size:11.5px;color:var(--text-tertiary);text-align:center;margin-top:10px;}

      .fcd-progress-card{background:linear-gradient(135deg,rgba(225,48,108,.04),rgba(168,85,247,.03));}
      .fcd-stages{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
      .fcd-stage{display:flex;gap:12px;align-items:center;padding:14px;background:var(--bg-soft,rgba(17,18,22,.03));border:1px solid var(--border-soft);border-radius:12px;opacity:.5;transition:all .3s;}
      .fcd-stage.active{opacity:1;border-color:rgba(168,85,247,.4);background:linear-gradient(90deg,rgba(168,85,247,.06),rgba(168,85,247,.02));}
      .fcd-stage.done{opacity:.8;border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.04);}
      .fcd-stage-num{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;}
      .fcd-stage.done .fcd-stage-num{background:#10b981;}
      .fcd-stage-body{flex:1;}
      .fcd-stage-label{font-weight:700;font-size:14px;margin-bottom:2px;}
      .fcd-stage-detail{font-size:11.5px;color:var(--text-tertiary);}
      .fcd-stage-status{font-size:18px;flex-shrink:0;}
      .fcd-spin{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:#a855f7;border-radius:50%;animation:fcdSpin .9s linear infinite;}
      @keyframes fcdSpin{to{transform:rotate(360deg);}}
      .fcd-tip{padding:12px 14px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.2);border-radius:10px;font-size:12.5px;line-height:1.5;color:var(--text-secondary);}

      .fcd-result-hero{background:linear-gradient(135deg,rgba(16,185,129,.05),rgba(168,85,247,.03));}
      .fcd-hero-badge{display:inline-block;padding:5px 11px;background:rgba(16,185,129,.12);color:#10b981;font-size:11.5px;font-weight:700;border-radius:999px;margin-bottom:6px;}
      .fcd-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
      .fcd-section-head h3{margin:0;font-size:16px;}
      .fcd-viral-badge{padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;}
      .fcd-pred-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;}
      .fcd-pred-stat{padding:10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;text-align:center;}
      .fcd-pred-num{font-size:18px;font-weight:800;letter-spacing:-0.01em;}
      .fcd-pred-lbl{font-size:10.5px;color:var(--text-tertiary);margin-top:2px;}

      .fcd-slides-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;}
      .fcd-slide-card{background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;overflow:hidden;}
      .fcd-slide-card img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;}
      .fcd-slide-placeholder{aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;background:var(--border);color:var(--text-tertiary);font-size:12px;}
      .fcd-slide-body{padding:10px;}
      .fcd-slide-num{font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;}
      .fcd-slide-headline{font-weight:700;font-size:13px;margin:3px 0 4px;line-height:1.3;}
      .fcd-slide-body-text{font-size:11.5px;color:var(--text-secondary);line-height:1.4;}

      .fcd-copy-btn{padding:6px 12px;font-size:12px;font-weight:700;background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:7px;cursor:pointer;}
      .fcd-copy-btn:hover{background:var(--bg-soft);color:var(--text-primary);}
      .fcd-caption{padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;font-family:inherit;font-size:13px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;margin:0 0 10px;}
      .fcd-tags{display:flex;flex-wrap:wrap;gap:4px;}
      .fcd-tag{padding:3px 9px;background:rgba(168,85,247,.10);color:#a855f7;font-size:11.5px;font-weight:600;border-radius:999px;}

      .fcd-recipe-card{background:linear-gradient(135deg,rgba(225,48,108,.03),rgba(168,85,247,.02));}
      .fcd-recipe-steps{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
      .fcd-step{display:flex;gap:10px;align-items:center;padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;font-size:13px;}
      .fcd-step-num{width:24px;height:24px;border-radius:50%;background:rgba(168,85,247,.15);color:#a855f7;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;flex-shrink:0;}
      .fcd-step-icon{font-size:16px;flex-shrink:0;}
      .fcd-step-body{flex:1;min-width:0;}
      .fcd-step-label{font-weight:700;font-size:12.5px;}
      .fcd-step-detail{font-size:11px;color:var(--text-tertiary);}
      .fcd-step-time{font-size:11px;color:var(--text-tertiary);flex-shrink:0;font-weight:600;}

      .fcd-actions{display:flex;gap:8px;flex-wrap:wrap;}
      .fcd-action-btn{padding:11px 18px;border-radius:10px;border:0;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;}
      .fcd-action-btn.primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .fcd-action-btn.primary:hover{filter:brightness(1.08);}
      .fcd-action-btn.secondary{background:var(--bg-soft);color:var(--text-primary);border:1px solid var(--border);}
      .fcd-action-btn.ghost{background:transparent;color:var(--text-secondary);border:1px solid var(--border);}

      .fcd-upgrade-card{background:linear-gradient(135deg,rgba(225,48,108,.06),rgba(168,85,247,.05));border-color:rgba(168,85,247,.3);}
      .fcd-upgrade-card ul{margin:10px 0 16px;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13.5px;}
      .fcd-upgrade-card li{line-height:1.5;}
    </style>`,x(e)};export const renderFreeCuDemo=async e=>{l(e)};
