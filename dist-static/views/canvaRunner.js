import{apiSafe as l}from"../lib/api.js";import{escape as n}from"../lib/dom.js";import{toast as s}from"../lib/toast.js";import{launchCanvaBrain as m}from"../lib/canvaBrain.js";const u=[{emoji:"\u{1F3A8}",name:"Nova",role:"Dise\xF1adora",task:"crea el visual en Canva"},{emoji:"\u270D\uFE0F",name:"L\xEDa",role:"Copywriter",task:"escribe el caption con voz de marca"},{emoji:"\u{1F6E1}\uFE0F",name:"Gard",role:"Compliance",task:"valida tono, hashtags y riesgo"},{emoji:"\u{1F680}",name:"Luca",role:"Publisher",task:"sube el post a Instagram"},{emoji:"\u{1F4C8}",name:"Mira",role:"Boost & m\xE9trica",task:"programa el boost y mide retenci\xF3n"}],p=[{key:"design",emoji:"\u{1F3A8}",label:"Dise\xF1o en Canva"},{key:"caption",emoji:"\u270D\uFE0F",label:"Caption + tono"},{key:"publish",emoji:"\u{1F4F7}",label:"Publicaci\xF3n IG"},{key:"boost",emoji:"\u26A1",label:"Boost programado"}],g=()=>`
  <div class="canva-agents">
    ${u.map(e=>`
      <div class="canva-agent">
        <div class="canva-agent-emoji">${e.emoji}</div>
        <div class="canva-agent-name">${n(e.name)}</div>
        <div class="canva-agent-role">${n(e.role)}</div>
        <div class="canva-agent-task">${n(e.task)}</div>
      </div>`).join("")}
  </div>`,b=e=>{if(!e)return`<div class="canva-status-offline">
      \u{1F4E1} <strong>Backend offline</strong> \u2014 el pipeline no puede ejecutarse hasta reconectar.
      Igual pod\xE9s usar el formulario y se enviar\xE1 cuando vuelva.
    </div>`;const o=e.capabilitiesAvailable??{},i=Object.entries(o).filter(([,a])=>a).map(([a])=>a),t=Object.entries(o).filter(([,a])=>!a).map(([a])=>a),r=e.dryRun===!0;return`
    <div class="canva-status">
      <div class="canva-status-row">
        <span class="tag ${r?"warn":"ok"} tiny">${r?"\u26A0\uFE0F DRY RUN":"\u{1F7E2} Live"}</span>
        <span class="tag ok tiny">${i.length} capabilities activas</span>
        ${t.length?`<span class="tag muted tiny">${t.length} desactivadas</span>`:""}
      </div>
      <div class="canva-caps-grid">
        ${i.map(a=>`<span class="canva-cap on">\u2713 ${n(a)}</span>`).join("")}
        ${t.map(a=>`<span class="canva-cap off">\u2717 ${n(a)}</span>`).join("")}
      </div>
    </div>`},f=e=>{const o=[{ok:e.designStep?.ok,info:e.designStep?.filePath??"\u2014"},{ok:!!e.captionGeneration?.caption,info:e.captionGeneration?.toneScore!=null?`tono ${e.captionGeneration.toneScore}/100`:"\u2014"},{ok:e.publishStep?.ok,info:e.publishStep?.postUrl??"\u2014"},{ok:e.boostScheduled,info:e.boostScheduled?"programado":"\u2014"}];return`
    <div class="canva-timeline">
      ${p.map((i,t)=>`
        <div class="canva-step ${o[t].ok?"done":"fail"}">
          <div class="canva-step-emoji">${i.emoji}</div>
          <div class="canva-step-label">${n(i.label)}</div>
          <div class="canva-step-state">${o[t].ok?"\u2713":"\u2717"}</div>
          <div class="canva-step-info">${n(String(o[t].info)).slice(0,80)}</div>
        </div>
        ${t<p.length-1?'<div class="canva-step-arrow">\u2192</div>':""}
      `).join("")}
    </div>`};export const renderCanvaRunner=async e=>{e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F3A8} Canva \u2192 Instagram</h1>
        <p class="view-subtitle page-subtitle">Pipeline end-to-end. El cursor dise\xF1a, escribe, valida y publica solo. Vos mir\xE1s.</p>
      </div>
    </header>

    <div class="page-body">
      <!-- Hero: capabilities + acciones r\xE1pidas -->
      <div class="canva-hero">
        <div id="cu-status" class="canva-hero-status">
          <div class="canva-status-loading">Cargando estado del agente\u2026</div>
        </div>
        <div class="canva-hero-actions">
          <button class="btn ghost" id="open-canva">\u{1F4D0} Abrir Canva</button>
          <button class="btn ghost" id="open-ig">\u{1F4F7} Abrir Instagram</button>
          <a class="btn ghost" href="#pantalla">\u{1F440} Pantalla en vivo</a>
        </div>
      </div>

      <!-- Equipo IA que opera el pipeline -->
      <div class="canva-section">
        <h3 class="canva-section-title">Tu equipo IA en este pipeline</h3>
        <p class="small muted" style="margin:0 0 12px;">No es un script: es Nova dise\xF1ando, L\xEDa escribiendo, Gard validando, Luca publicando. Cada uno reporta lo que hace.</p>
        ${g()}
      </div>

      <!-- Form pipeline -->
      <div class="canva-grid-2">
        <div class="card canva-form">
          <h3>\u{1F4DD} Nueva pieza</h3>
          <label class="form-label">Tema del post</label>
          <input id="topic" class="input" placeholder="Disciplina, h\xE1bitos, marketing IA\u2026">

          <div class="canva-form-row">
            <div>
              <label class="form-label">Intent</label>
              <select id="intent" class="input">
                <option value="educar">Educar</option>
                <option value="inspirar">Inspirar</option>
                <option value="vender">Vender</option>
                <option value="entretener">Entretener</option>
                <option value="reflexionar">Reflexionar</option>
              </select>
            </div>
            <div>
              <label class="form-label">Formato</label>
              <select id="postType" class="input">
                <option value="feed-post">\u{1F4F8} Feed post</option>
                <option value="reel">\u{1F3AC} Reel</option>
                <option value="story">\u{1F4F2} Story</option>
                <option value="carousel">\u{1F0CF} Carrusel</option>
              </select>
            </div>
          </div>

          <label class="form-label" style="margin-top:12px;">M\xE9todo de publicaci\xF3n</label>
          <select id="publishMethod" class="input">
            <option value="upload-post-api">\u26A1 Upload-Post API (r\xE1pido \xB7 device puede estar off)</option>
            <option value="computer-use">\u{1F5B1}\uFE0F Computer Use (cursor visible \xB7 m\xE1s confiable)</option>
            <option value="preview-only">\u{1F441}\uFE0F Solo preview (no publica)</option>
          </select>

          <label class="form-label canva-form-check" style="margin-top:12px;">
            <input type="checkbox" id="generateCaption" checked>
            <span>L\xEDa escribe el caption autom\xE1ticamente</span>
          </label>

          <button class="btn primary" id="run-pipeline" style="margin-top:16px;width:100%;font-size:15px;padding:12px;">
            \u25B6 Lanzar pipeline completo
          </button>
          <div class="small muted" style="margin-top:8px;text-align:center;">
            Toma 2\u20135 min \xB7 seguilo en vivo en <a href="#pantalla" class="accent">Pantalla en vivo</a>
          </div>
        </div>

        <div class="card canva-tips">
          <h3>\u{1F4A1} C\xF3mo funciona</h3>
          <ol class="canva-tips-list">
            <li><strong>Nova</strong> abre Canva y arma el dise\xF1o con tu marca cargada.</li>
            <li><strong>L\xEDa</strong> escribe el caption respetando voz, intent y hashtags.</li>
            <li><strong>Gard</strong> valida tono, riesgo y compliance antes de subir.</li>
            <li><strong>Luca</strong> publica v\xEDa API o v\xEDa cursor (seg\xFAn m\xE9todo).</li>
            <li><strong>Mira</strong> programa boost si corresponde y mide retenci\xF3n.</li>
          </ol>
          <div class="canva-tip-cta">
            <strong>Modo Asistente activado?</strong>
            <p class="small muted">Cada paso importante te va a pedir aprobaci\xF3n. Frenalo cuando quieras desde el bot\xF3n "\u{1F6D1} Frenar al agente" del topbar.</p>
          </div>
        </div>
      </div>

      <div id="result" class="canva-result"></div>
    </div>

    <style>
      .canva-hero{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.05));border:1px solid var(--border);margin-bottom:18px;}
      .canva-hero-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0;}
      .canva-status-loading{padding:8px 0;color:var(--text-muted,#9CA3AF);font-size:13px;}
      .canva-status-offline{color:#fbbf24;font-size:13px;line-height:1.5;}
      .canva-status-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
      .canva-caps-grid{display:flex;gap:6px;flex-wrap:wrap;}
      .canva-cap{font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid var(--border);}
      .canva-cap.on{color:#4ade80;border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.08);}
      .canva-cap.off{color:#9CA3AF;opacity:.55;text-decoration:line-through;}

      .canva-section{margin-bottom:22px;}
      .canva-section-title{font-size:15px;margin:0 0 6px;}
      .canva-agents{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
      .canva-agent{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;}
      .canva-agent-emoji{font-size:30px;line-height:1;margin-bottom:6px;}
      .canva-agent-name{font-weight:800;font-size:14px;}
      .canva-agent-role{font-size:11px;color:var(--text-muted,#9CA3AF);}
      .canva-agent-task{font-size:11px;margin-top:6px;opacity:.85;line-height:1.4;}

      .canva-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;}
      .canva-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;}
      .canva-form-check{display:flex;align-items:center;gap:8px;cursor:pointer;}
      .canva-form-check input{margin:0;}
      .canva-tips-list{margin:8px 0 0;padding-left:20px;font-size:13px;line-height:1.7;}
      .canva-tips-list li{margin-bottom:4px;}
      .canva-tip-cta{margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);}

      .canva-result{margin-top:14px;}
      .canva-timeline{display:flex;align-items:stretch;gap:6px;flex-wrap:wrap;}
      .canva-step{flex:1;min-width:140px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;}
      .canva-step.done{border-color:rgba(74,222,128,.5);background:rgba(74,222,128,.05);}
      .canva-step.fail{border-color:rgba(239,68,68,.35);opacity:.7;}
      .canva-step-emoji{font-size:22px;}
      .canva-step-label{font-size:12px;font-weight:700;margin-top:4px;}
      .canva-step-state{font-size:18px;margin-top:2px;}
      .canva-step.done .canva-step-state{color:#4ade80;}
      .canva-step.fail .canva-step-state{color:#ef4444;}
      .canva-step-info{font-size:10px;color:var(--text-muted,#9CA3AF);margin-top:4px;word-break:break-word;}
      .canva-step-arrow{display:flex;align-items:center;color:var(--text-muted,#9CA3AF);}

      @media (max-width: 900px){
        .canva-hero{grid-template-columns:1fr;}
        .canva-hero-actions{flex-direction:row;flex-wrap:wrap;}
        .canva-grid-2{grid-template-columns:1fr;}
        .canva-form-row{grid-template-columns:1fr;}
      }
    </style>
  `;const{data:o,error:i}=await l("/api/cu/desktop-status",null);document.getElementById("cu-status").innerHTML=b(i?null:o),document.getElementById("run-pipeline").addEventListener("click",async()=>{const t=document.getElementById("topic").value.trim();if(!t){s("Falta el tema del post","error");return}await m({topic:t,format:document.getElementById("postType").value,contentPayload:{designIntent:document.getElementById("intent").value,publishMethod:document.getElementById("publishMethod").value,generateCaption:document.getElementById("generateCaption").checked}});const r={topic:t,designIntent:document.getElementById("intent").value,postType:document.getElementById("postType").value,publishMethod:"computer-use",generateCaption:document.getElementById("generateCaption").checked},{data:a,error:c}=await l("/api/cu/canva/to-instagram",null,{method:"POST",body:r});if(c||!a){const v=document.getElementById("result");v.innerHTML='<div class="card"><div class="small muted">\u{1F4E1} Backend offline \xB7 pipeline corri\xF3 en modo simulaci\xF3n. Conect\xE1 el server para historial real.</div></div>';return}const d=document.getElementById("result");d.innerHTML=`
      <div class="card">
        <div class="row spread" style="margin-bottom:10px;">
          <h3 style="margin:0;">${a.ok?"\u2705 Pipeline completado":"\u26A0\uFE0F Pipeline parcial"}</h3>
          <span class="small muted">replay <code>${n(a.replayId??"\u2014")}</code></span>
        </div>
        ${f(a)}
        ${a.captionGeneration?.caption?`
          <div style="margin-top:14px;padding:12px;background:var(--bg-elev,#1c1c22);border-radius:10px;">
            <div class="small muted" style="margin-bottom:4px;">Caption generado por L\xEDa</div>
            <div class="body" style="white-space:pre-wrap;">${n(a.captionGeneration.caption)}</div>
          </div>`:""}
        <div class="btn-row" style="margin-top:14px;gap:8px;">
          ${a.publishStep?.postUrl?`<a class="btn primary" href="${n(a.publishStep.postUrl)}" target="_blank" rel="noopener">Ver post \u2192</a>`:""}
          <a class="btn ghost" href="#replay">\u{1F4DC} Replay completo</a>
          <a class="btn ghost" href="#pantalla">\u{1F440} Pantalla en vivo</a>
        </div>
      </div>`,s(a.ok?"Pipeline completado \u{1F389}":"Pipeline parcial",a.ok?"success":"warn")}),document.getElementById("open-canva").addEventListener("click",async()=>{const{error:t}=await l("/api/cu/canva/open",null,{method:"POST",body:{}});if(t){s("Backend offline. No se puede abrir Canva.","error");return}s("Canva abierto en navegador","success")}),document.getElementById("open-ig").addEventListener("click",async()=>{const{error:t}=await l("/api/cu/apps/launch",null,{method:"POST",body:{app:"chrome",url:"https://instagram.com"}});if(t){s("Backend offline.","error");return}s("Instagram abierto","success")})};
