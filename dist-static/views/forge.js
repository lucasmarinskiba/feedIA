import{apiSafe as f}from"../lib/api.js";import{escape as i}from"../lib/dom.js";import{toast as l}from"../lib/toast.js";let g=null;const v=()=>{try{return localStorage.getItem("feedia.platform")==="tiktok"?"tiktok":"instagram"}catch{return"instagram"}},m={"breakout-potential":"#10b981","high-potential":"#3b82f6",solid:"#a855f7",mediocre:"#f59e0b",low:"#ef4444"},u={"breakout-potential":"\u{1F680} Breakout potential","high-potential":"\u{1F3AF} High potential",solid:"\u{1F4AA} Solid",mediocre:"\u26A0\uFE0F Mediocre",low:"\u{1F6A8} Bajo"},b=e=>`
  <div class="fg-card">
    <h2 class="fg-section-title">1. Decile a Forge qu\xE9 crear</h2>
    <p class="fg-section-sub">Strategist + 12 hook formulas + viral predictor analizan ANTES de generar. Cero tokens malgastados.</p>

    <div class="fg-form-grid">
      <label class="fg-field fg-field-wide">
        <span class="fg-label">\xBFSobre qu\xE9?</span>
        <input class="fg-input" id="fg-topic" placeholder="Ej: c\xF3mo automatizar tu marketing con IA" autocomplete="off" />
      </label>

      <label class="fg-field">
        <span class="fg-label">Plataforma</span>
        <select class="fg-input" id="fg-platform">
          <option value="instagram" ${e==="instagram"?"selected":""}>\u{1F4F7} Instagram</option>
          <option value="tiktok" ${e==="tiktok"?"selected":""}>\u{1F3B5} TikTok</option>
        </select>
      </label>

      <label class="fg-field">
        <span class="fg-label">Formato</span>
        <select class="fg-input" id="fg-format">
          <option value="carousel">\u{1F5C2}\uFE0F Carrusel</option>
          <option value="reel" selected>\u{1F3AC} Reel / Video</option>
          <option value="story">\u25CE Story</option>
        </select>
      </label>

      <label class="fg-field">
        <span class="fg-label">Goal</span>
        <select class="fg-input" id="fg-goal">
          <option value="engagement" selected>\u{1F49C} Engagement</option>
          <option value="awareness">\u{1F4E1} Alcance</option>
          <option value="conversion">\u{1F4B0} Conversi\xF3n</option>
          <option value="community">\u{1F465} Comunidad</option>
          <option value="sales">\u{1F6D2} Ventas</option>
        </select>
      </label>

      <label class="fg-field">
        <span class="fg-label">Nicho</span>
        <input class="fg-input" id="fg-niche" placeholder="Ej: marketing, fitness, IA" autocomplete="off" />
      </label>

      <label class="fg-field">
        <span class="fg-label">Voz de marca</span>
        <select class="fg-input" id="fg-voice">
          <option value="cercano">Cercano</option>
          <option value="profesional">Profesional</option>
          <option value="autoritativo">Autoritativo</option>
          <option value="humor\xEDstico">Humor\xEDstico</option>
          <option value="inspirador">Inspirador</option>
        </select>
      </label>

      <label class="fg-field fg-field-wide">
        <span class="fg-label">\xC1ngulos competidores (opcional)</span>
        <input class="fg-input" id="fg-competitors" placeholder="Ej: tutorial paso a paso, tips de productividad" autocomplete="off" />
      </label>
    </div>

    <div class="fg-actions">
      <button class="fg-btn fg-btn-secondary" id="fg-strategy-only">\u{1F4CB} Solo estrategia</button>
      <button class="fg-btn fg-btn-primary" id="fg-forge-go">
        <span class="fg-btn-icon">\u2728</span>
        Forge contenido completo
      </button>
    </div>
    <p class="fg-disclaimer">Free: Llama 3.3 70B + Pollinations Flux. Paid: Claude Sonnet/Opus + fal.ai Flux-Pro. <a href="/pricing.html">Ver planes \u2192</a></p>
  </div>`,c=e=>{if(!e)return"";const a=e.strategicScore||0,s=a>=80?"#10b981":a>=60?"#3b82f6":"#f59e0b";return`
    <div class="fg-card">
      <div class="fg-strategy-head">
        <div>
          <h3 class="fg-section-title">2. Plan estrat\xE9gico</h3>
          <p class="fg-section-sub">${i(e.brandVoiceGuideline||"")}</p>
        </div>
        <div class="fg-score-circle" style="background:${s};">
          <div class="fg-score-val">${a}</div>
          <div class="fg-score-lbl">strategic</div>
        </div>
      </div>

      <div class="fg-strategy-grid">
        <div class="fg-strategy-block">
          <strong>\u{1F3AF} Formato recomendado</strong>
          <div class="fg-strategy-val">${i(e.recommendedFormat?.format||"")} <span class="fg-muted">(fit ${((e.recommendedFormat?.fit||0)*100).toFixed(0)}%)</span></div>
          <div class="fg-tiny-muted">${i(e.recommendedFormat?.reason||"")}</div>
        </div>

        <div class="fg-strategy-block">
          <strong>\u{1F465} Audiencia</strong>
          <div class="fg-strategy-val">${i(e.input?.audience||"")}</div>
          <div class="fg-tiny-muted">Triggers: ${(e.audienceProfile?.triggers||[]).slice(0,3).join(", ")}</div>
        </div>

        <div class="fg-strategy-block">
          <strong>\u23F0 Mejor ventana</strong>
          <div class="fg-strategy-val">${i((e.postingWindows||[])[0]||"cualquier hora")}</div>
          <div class="fg-tiny-muted">Atenci\xF3n: ${e.attentionBudgetSec||2}s</div>
        </div>
      </div>

      <div class="fg-hooks">
        <strong>\u{1F3A3} Top 5 hooks predichos:</strong>
        <div class="fg-hook-list">
          ${(e.hookCandidates||[]).map((r,d)=>`
            <div class="fg-hook ${d===0?"best":""}">
              <div class="fg-hook-head">
                <span class="fg-hook-formula">${i(r.formula)}</span>
                <span class="fg-hook-strength" style="color:${r.predictedStrength>=.85?"#10b981":"#a855f7"};">
                  ${(r.predictedStrength*100).toFixed(0)}% strength
                </span>
              </div>
              <div class="fg-hook-text">${i(r.hook)}</div>
              ${d===0?'<div class="fg-hook-badge">RECOMENDADO</div>':""}
            </div>`).join("")}
        </div>
      </div>

      ${(e.algorithmChecklist||[]).length?`
        <div class="fg-checklist">
          <strong>\u{1F9E0} Optimizaci\xF3n algor\xEDtmica (${e.input?.platform||"IG"}):</strong>
          <ul>
            ${(e.algorithmChecklist||[]).map(r=>`
              <li><strong>${i(r.signal)}:</strong> ${i(r.tactic)}</li>`).join("")}
          </ul>
        </div>`:""}

      ${(e.riskFlags||[]).length?`
        <div class="fg-flags">
          <strong>\u26A0\uFE0F Risk flags:</strong>
          ${(e.riskFlags||[]).map(r=>`<div class="fg-flag">${i(r)}</div>`).join("")}
        </div>`:""}
    </div>`},x=e=>{if(!e)return"";const a=m[e.virality]||"#a855f7";return`
    <div class="fg-card">
      <h3 class="fg-section-title">3. Viral predictor</h3>
      <p class="fg-section-sub">Modelo determin\xEDstico 0-100 con benchmarks reales IG/TT.</p>

      <div class="fg-viral-hero">
        <div class="fg-viral-score" style="border-color:${a};">
          <div class="fg-viral-num" style="color:${a};">${e.viralScore}</div>
          <div class="fg-viral-lbl">viral score</div>
        </div>
        <div class="fg-viral-body">
          <div class="fg-viral-class" style="background:${a}22;color:${a};">${u[e.virality]||e.virality}</div>
          <div class="fg-tiny-muted">Techo si optimiz\xE1s: ${e.ceilingScore} (gap ${e.optimizationGap}pts)</div>
        </div>
      </div>

      <div class="fg-pred-metrics">
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${e.predicted?.reach?.toLocaleString("es-AR")||0}</div>
          <div class="fg-pred-lbl">alcance predicho</div>
        </div>
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${((e.predicted?.engagementRate||0)*100).toFixed(1)}%</div>
          <div class="fg-pred-lbl">engagement rate</div>
        </div>
        ${e.predicted?.completion!==null?`
          <div class="fg-pred-metric">
            <div class="fg-pred-num">${(e.predicted?.completion*100).toFixed(0)}%</div>
            <div class="fg-pred-lbl">completion</div>
          </div>`:""}
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${e.predicted?.saves?.toLocaleString("es-AR")||0}</div>
          <div class="fg-pred-lbl">saves</div>
        </div>
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${e.predicted?.shares?.toLocaleString("es-AR")||0}</div>
          <div class="fg-pred-lbl">shares</div>
        </div>
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${e.predicted?.comments?.toLocaleString("es-AR")||0}</div>
          <div class="fg-pred-lbl">comments</div>
        </div>
      </div>

      <div class="fg-breakdown">
        <strong>Breakdown:</strong>
        <div class="fg-breakdown-grid">
          ${Object.entries(e.breakdown||{}).map(([s,r])=>`
            <div class="fg-break-row">
              <div class="fg-break-name">${i(s)} <span class="fg-tiny-muted">(${r.weight}%)</span></div>
              <div class="fg-break-bar"><div class="fg-break-fill" style="width:${r.score}%;background:${r.score>=75?"#10b981":r.score>=50?"#a855f7":"#f59e0b"};"></div></div>
              <div class="fg-break-score">${r.score}</div>
            </div>`).join("")}
        </div>
      </div>

      ${(e.improvements||[]).length?`
        <div class="fg-improvements">
          <strong>\u{1F4A1} Mejoras sugeridas:</strong>
          <ul>${(e.improvements||[]).map(s=>`<li>${i(s)}</li>`).join("")}</ul>
        </div>`:""}

      ${(e.flags||[]).length?`
        <div class="fg-flags">
          <strong>\u{1F6A8} Risk flags:</strong>
          ${(e.flags||[]).map(s=>`<div class="fg-flag">${i(s)}</div>`).join("")}
        </div>`:""}
    </div>`},h=(e,a,s)=>{if(!e)return"";const r=Array.isArray(e.slides),d=Array.isArray(e.beats),o=Array.isArray(e.frames);return`
    <div class="fg-card">
      <h3 class="fg-section-title">4. Contenido generado</h3>
      <p class="fg-section-sub">Provider: ${i(s?.llm?.provider||"free")} \xB7 Modelo: ${i(s?.llm?.model||"auto")}</p>

      ${a?.coverImage?`
        <div class="fg-cover">
          <img src="${i(a.coverImage.url)}" alt="Cover" loading="lazy" />
          <div class="fg-cover-meta">Cover ${a.coverImage.width}\xD7${a.coverImage.height} \xB7 ${i(a.coverImage.provider)}</div>
        </div>`:""}

      ${r?`
        <div class="fg-slides">
          ${e.slides.map(t=>`
            <div class="fg-slide">
              <div class="fg-slide-num">Slide ${t.n}</div>
              <div class="fg-slide-headline">${i(t.headline||"")}</div>
              ${t.body?`<div class="fg-slide-body">${i(t.body)}</div>`:""}
              ${t.imagePrompt?`<div class="fg-slide-prompt"><strong>Image prompt:</strong> ${i(t.imagePrompt)}</div>`:""}
            </div>`).join("")}
        </div>`:""}

      ${d?`
        <div class="fg-beats">
          ${e.beats.map(t=>`
            <div class="fg-beat">
              <div class="fg-beat-time">${i(t.sec)}s</div>
              <div class="fg-beat-body">
                <div class="fg-beat-visual">\u{1F3AC} ${i(t.visual||"")}</div>
                ${t.text?`<div class="fg-beat-text">\u{1F4DD} ${i(t.text)}</div>`:""}
                ${t.voiceover?`<div class="fg-beat-vo">\u{1F3A4} "${i(t.voiceover)}"</div>`:""}
              </div>
            </div>`).join("")}
        </div>
        ${e.suggestedAudio?`<div class="fg-audio-hint">\u{1F3B5} Audio: ${i(e.suggestedAudio)}</div>`:""}`:""}

      ${o?`
        <div class="fg-frames">
          ${e.frames.map((t,n)=>`
            <div class="fg-frame">
              ${a?.frameImages?.[n]?`<img src="${i(a.frameImages[n].url)}" alt="Frame ${t.n}" loading="lazy" />`:""}
              <div class="fg-frame-body">
                <div class="fg-frame-num">Frame ${t.n} \xB7 ${i(t.stickerType||"none")}</div>
                <div class="fg-frame-text">${i(t.overlayText||"")}</div>
              </div>
            </div>`).join("")}
        </div>`:""}

      ${e.caption?`
        <div class="fg-caption">
          <div class="fg-caption-head">
            <strong>\u{1F4DD} Caption</strong>
            <button class="fg-tiny-btn" data-copy="${encodeURIComponent(e.caption)}">Copiar</button>
          </div>
          <pre>${i(e.caption)}</pre>
        </div>`:""}

      ${(e.hashtags||[]).length?`
        <div class="fg-hashtags">
          <strong>#\uFE0F\u20E3 Hashtags (${e.hashtags.length})</strong>
          <div class="fg-tag-list">
            ${e.hashtags.map(t=>`<span class="fg-tag">${i(t)}</span>`).join("")}
          </div>
          <button class="fg-tiny-btn" data-copy="${encodeURIComponent((e.hashtags||[]).join(" "))}">Copiar todos</button>
        </div>`:""}

      <div class="fg-final-actions">
        <button class="fg-btn fg-btn-secondary" id="fg-regenerate">\u{1F504} Regenerar</button>
        <button class="fg-btn fg-btn-primary" id="fg-publish">\u{1F4E4} Enviar a publicar</button>
      </div>
    </div>`},y=e=>{const a=o=>e.querySelector(`#${o}`),s=()=>({topic:a("fg-topic")?.value.trim()||"tu producto",platform:a("fg-platform")?.value||"instagram",format:a("fg-format")?.value||"reel",goal:a("fg-goal")?.value||"engagement",brandNiche:a("fg-niche")?.value.trim()||"",brandVoice:a("fg-voice")?.value||"cercano",competitorAngles:(a("fg-competitors")?.value||"").split(",").map(o=>o.trim()).filter(Boolean)}),r=o=>{const t=e.querySelector("#fg-output");t&&(t.innerHTML=`<div class="fg-loading"><div class="fg-spin"></div><div>${i(o)}</div></div>`)},d=o=>{const t=e.querySelector("#fg-output");t&&(t.innerHTML=[c(o.strategy),h(o.content,o.assets,o.meta),x(o.prediction)].join(""),k(e))};a("fg-strategy-only")?.addEventListener("click",async()=>{r("Pensando estrategia (sin gastar tokens)...");const{data:o,error:t}=await f("/api/strategy/plan",null,{method:"POST",body:s()});if(t||!o){l("No se pudo generar estrategia","err");return}const n=e.querySelector("#fg-output");n.innerHTML=c(o),l("Estrategia generada (gratis)","ok")}),a("fg-forge-go")?.addEventListener("click",async()=>{const o=s();if(!o.topic||o.topic==="tu producto"){l("Decile sobre qu\xE9 crear contenido","warn"),a("fg-topic")?.focus();return}r("Forge en proceso \xB7 strategy \u2192 produce \u2192 predict (10-30s)...");try{const t=await fetch("/api/forge/content",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(o)}),n=await t.json();if(t.status===402){l(n.reason||"L\xEDmite alcanzado","warn"),window.dispatchEvent(new CustomEvent("feedia:quotaExceeded",{detail:n}));const p=e.querySelector("#fg-output");p.innerHTML=`<div class="fg-card" style="text-align:center;padding:40px;"><h3>\u{1F512} Llegaste al l\xEDmite</h3><p>${i(n.reason)}</p><a href="/pricing.html" class="fg-btn fg-btn-primary" style="display:inline-block;margin-top:14px;text-decoration:none;">Ver planes \u2192</a></div>`;return}if(!t.ok){l(n.message||"Error al forge","err");return}g=n,d(n),l(`Score viral: ${n.prediction?.viralScore||0}/100`,n.prediction?.viralScore>=70?"ok":"info")}catch{l("Error de red","err")}})},k=e=>{e.querySelectorAll("[data-copy]").forEach(a=>{a.addEventListener("click",()=>{const s=decodeURIComponent(a.dataset.copy||"");try{navigator.clipboard.writeText(s),l("Copiado","ok")}catch{l("No se pudo copiar","err")}})}),e.querySelector("#fg-regenerate")?.addEventListener("click",()=>{e.querySelector("#fg-forge-go")?.click()}),e.querySelector("#fg-publish")?.addEventListener("click",()=>{if(g)try{localStorage.setItem("feedia.forge.lastDraft",JSON.stringify(g)),l("Borrador guardado. Abriendo Studio\u2026","ok"),setTimeout(()=>{window.location.hash="#studio-carousel"},500)}catch{l("No se pudo guardar","err")}})};export const renderForge=async e=>{const a=v();e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u2728 Forge IA</h1>
        <p class="view-subtitle page-subtitle">Estrategia \u2192 producci\xF3n \u2192 predicci\xF3n viral \xB7 Para Instagram + TikTok</p>
      </div>
    </header>
    <div class="page-body">
      ${b(a)}
      <div id="fg-output"></div>
    </div>
    <style>
      .fg-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:16px;color:var(--text-primary,var(--fg));box-shadow:var(--shadow-card,0 1px 4px rgba(0,0,0,.05));}
      .fg-section-title{font-size:18px;letter-spacing:-0.015em;margin:0 0 4px;}
      .fg-section-sub{font-size:13px;color:var(--text-tertiary,var(--text-muted,#888));margin:0 0 16px;}
      .fg-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
      .fg-field-wide{grid-column:1 / -1;}
      .fg-field{display:flex;flex-direction:column;gap:5px;}
      .fg-label{font-size:12px;font-weight:600;color:var(--text-secondary,#666);}
      .fg-input{padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border-soft,rgba(17,18,22,.08));border-radius:9px;color:var(--text-primary,var(--fg));font-size:14px;font-family:inherit;outline:none;transition:border-color .15s,background .15s;}
      .fg-input:focus{background:var(--bg-card,#fff);border-color:rgba(225,48,108,.45);box-shadow:0 0 0 3px rgba(225,48,108,.08);}
      .fg-actions{display:flex;gap:10px;margin-top:18px;justify-content:flex-end;flex-wrap:wrap;}
      .fg-btn{padding:11px 18px;border-radius:10px;border:0;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:8px;transition:filter .15s,transform .12s;}
      .fg-btn-primary{background:linear-gradient(135deg,#f09433,#e1306c 40%,#a855f7);color:#fff;}
      .fg-btn-primary:hover{filter:brightness(1.08);} .fg-btn-primary:active{transform:scale(.985);}
      .fg-btn-secondary{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-primary,var(--fg));border:1px solid var(--border-soft);}
      .fg-btn-secondary:hover{background:var(--bg-hover,rgba(17,18,22,.08));}
      .fg-btn-icon{font-size:16px;}
      .fg-disclaimer{font-size:11.5px;color:var(--text-tertiary);text-align:center;margin-top:10px;}
      .fg-disclaimer a{color:#a855f7;text-decoration:none;font-weight:700;}

      .fg-loading{display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px;color:var(--text-secondary);}
      .fg-spin{width:36px;height:36px;border:3px solid var(--border);border-top-color:#a855f7;border-radius:50%;animation:fgSpin .9s linear infinite;}
      @keyframes fgSpin{to{transform:rotate(360deg);}}

      .fg-strategy-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px;}
      .fg-score-circle{flex-shrink:0;width:72px;height:72px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;}
      .fg-score-val{font-size:22px;font-weight:800;line-height:1;}
      .fg-score-lbl{font-size:9px;opacity:.85;letter-spacing:.05em;text-transform:uppercase;}
      .fg-strategy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:18px;}
      .fg-strategy-block{padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;}
      .fg-strategy-block strong{font-size:11.5px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;}
      .fg-strategy-val{font-size:15px;font-weight:700;margin:4px 0 2px;}
      .fg-tiny-muted{font-size:11px;color:var(--text-tertiary);}
      .fg-muted{color:var(--text-tertiary);font-weight:500;}

      .fg-hooks{margin-top:14px;}
      .fg-hook-list{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
      .fg-hook{padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;border-left:3px solid var(--border);position:relative;}
      .fg-hook.best{border-left-color:#a855f7;background:linear-gradient(90deg,rgba(168,85,247,.08),transparent);}
      .fg-hook-head{display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;}
      .fg-hook-formula{color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;font-weight:700;}
      .fg-hook-strength{font-weight:700;}
      .fg-hook-text{font-size:14px;line-height:1.4;}
      .fg-hook-badge{position:absolute;top:8px;right:10px;font-size:9px;font-weight:800;background:#a855f7;color:#fff;padding:2px 6px;border-radius:4px;letter-spacing:.05em;}

      .fg-checklist{margin-top:14px;font-size:13px;}
      .fg-checklist ul{margin:6px 0 0 16px;padding:0;display:flex;flex-direction:column;gap:6px;}
      .fg-checklist li{line-height:1.5;}

      .fg-flags{margin-top:14px;}
      .fg-flag{font-size:12.5px;padding:8px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;margin-top:6px;color:#dc2626;}
      [data-theme="dark"] .fg-flag{color:#fca5a5;}

      .fg-viral-hero{display:flex;align-items:center;gap:16px;padding:18px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:12px;margin-bottom:16px;}
      .fg-viral-score{width:80px;height:80px;border-radius:50%;border:4px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;}
      .fg-viral-num{font-size:30px;font-weight:800;line-height:1;}
      .fg-viral-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;}
      .fg-viral-class{display:inline-block;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;margin-bottom:4px;}

      .fg-pred-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:18px;}
      .fg-pred-metric{padding:10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;text-align:center;}
      .fg-pred-num{font-size:20px;font-weight:800;letter-spacing:-0.01em;}
      .fg-pred-lbl{font-size:10.5px;color:var(--text-tertiary);margin-top:2px;}

      .fg-breakdown{margin-bottom:14px;}
      .fg-breakdown-grid{display:flex;flex-direction:column;gap:6px;margin-top:8px;}
      .fg-break-row{display:grid;grid-template-columns:130px 1fr 40px;gap:10px;align-items:center;font-size:12.5px;}
      .fg-break-bar{height:5px;background:var(--border);border-radius:99px;overflow:hidden;}
      .fg-break-fill{height:100%;transition:width .5s ease;}
      .fg-break-score{text-align:right;font-weight:700;}

      .fg-improvements{margin-top:14px;font-size:13px;}
      .fg-improvements ul{margin:6px 0 0 16px;padding:0;display:flex;flex-direction:column;gap:6px;}

      .fg-cover{margin-bottom:14px;}
      .fg-cover img{width:100%;max-width:520px;border-radius:12px;display:block;}
      .fg-cover-meta{font-size:11px;color:var(--text-tertiary);margin-top:6px;}

      .fg-slides,.fg-beats,.fg-frames{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;}
      .fg-slide,.fg-beat,.fg-frame{padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;}
      .fg-slide-num,.fg-beat-time,.fg-frame-num{font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
      .fg-slide-headline{font-size:15px;font-weight:700;margin-bottom:4px;}
      .fg-slide-body{font-size:13px;line-height:1.45;color:var(--text-secondary);}
      .fg-slide-prompt{font-size:11px;color:var(--text-tertiary);margin-top:6px;padding:6px 8px;background:rgba(168,85,247,.06);border-radius:6px;}
      .fg-beat{display:flex;gap:14px;align-items:flex-start;}
      .fg-beat-time{flex-shrink:0;min-width:50px;}
      .fg-beat-body{flex:1;display:flex;flex-direction:column;gap:4px;font-size:13px;}
      .fg-frame{display:flex;gap:12px;align-items:flex-start;}
      .fg-frame img{width:80px;height:142px;object-fit:cover;border-radius:8px;flex-shrink:0;}
      .fg-frame-text{font-size:13px;line-height:1.4;}
      .fg-audio-hint{font-size:12.5px;padding:8px 12px;background:rgba(34,211,238,.08);border-radius:8px;color:var(--text-secondary);}

      .fg-caption{margin-bottom:14px;}
      .fg-caption-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
      .fg-caption pre{padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;font-family:inherit;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}
      .fg-tiny-btn{padding:4px 10px;font-size:11px;font-weight:700;background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:6px;cursor:pointer;}
      .fg-tiny-btn:hover{background:var(--bg-soft);color:var(--text-primary);}

      .fg-hashtags{margin-bottom:14px;}
      .fg-hashtags strong{display:block;margin-bottom:6px;}
      .fg-tag-list{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;}
      .fg-tag{padding:3px 9px;background:rgba(168,85,247,.10);color:#a855f7;font-size:12px;font-weight:600;border-radius:999px;}

      .fg-final-actions{display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--border-soft);padding-top:14px;margin-top:14px;flex-wrap:wrap;}

      @media (max-width: 640px){
        .fg-form-grid{grid-template-columns:1fr;}
        .fg-break-row{grid-template-columns:90px 1fr 35px;}
      }
    </style>`,y(e);const s=e.querySelector("#fg-platform");window.addEventListener("feedia:platform",r=>{s&&(s.value=r.detail?.platform==="tiktok"?"tiktok":"instagram")})};
