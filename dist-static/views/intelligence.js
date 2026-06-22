import{apiSafe as g}from"../lib/api.js";import{escape as s}from"../lib/dom.js";import{loadingScreen as u}from"../lib/ui.js";let l=null;const c=()=>{l&&(clearInterval(l),l=null)};window.addEventListener("beforeunload",c),window.addEventListener("hashchange",()=>{(location.hash.replace("#","")||"feed")!=="inteligencia"&&c()});const t={budget:{spentUsd:0,capUsd:0,usedPct:0,breaker:"closed",calls:0,inputTokens:0,outputTokens:0,byModel:{}},cache:{hitRatePct:0,entries:0,hits:0,misses:0,topReused:[]},bandits:[],digest:{resumenEjecutivo:"Sin datos a\xFAn. El sistema empieza a aprender en cuanto reciba la primera misi\xF3n.",data:{intel:{misiones:{ok:0,parciales:0,fallidas:0},trazas:{tasaExito:0},carruseles:{publicados:0,retenidos:0},riesgos:[]}},cosasQueRequierenAtencion:[]}},b=(a,e)=>{const i=Math.max(0,Math.min(100,a)),r=e?"var(--crit)":i>=80?"var(--warn)":"var(--ok)";return`<div style="background:var(--border);border-radius:6px;height:10px;overflow:hidden;">
    <div style="width:${i}%;height:100%;background:${r};"></div></div>`},x=a=>`
  <div class="card">
    <div class="row spread"><b>\u{1F4B0} Presupuesto de tokens (hoy)</b>
      <span class="tag ${a.breaker==="open"?"crit":"ok"} tiny">breaker ${a.breaker}</span></div>
    <div style="margin:10px 0 6px;font-size:22px;font-weight:800;">$${a.spentUsd} <span class="muted" style="font-size:13px;font-weight:500;">/ $${a.capUsd} (${a.usedPct}%)</span></div>
    ${b(a.usedPct,a.breaker==="open")}
    <div class="meta" style="margin-top:10px;">
      <span class="tag tiny">${a.calls} llamadas</span>
      <span class="tag tiny">in ${(a.inputTokens/1e3).toFixed(0)}k tok</span>
      <span class="tag tiny">out ${(a.outputTokens/1e3).toFixed(0)}k tok</span>
    </div>
    <div class="meta" style="margin-top:6px;">
      ${Object.entries(a.byModel||{}).map(([e,i])=>`<span class="tag accent tiny">${s(e)}: $${i.usd} (${i.calls})</span>`).join("")||'<span class="tiny muted">sin uso a\xFAn</span>'}
    </div>
  </div>`,f=a=>`
  <div class="card">
    <b>\u{1F3B0} Aprendizaje (bandits Thompson)</b>
    ${a.length?a.map(e=>`
      <div style="margin-top:10px;">
        <div class="small" style="font-weight:700;margin-bottom:4px;">${s(e.experimentId)} ${e.best?`<span class="tag ok tiny">mejor: ${s(e.best)}</span>`:""}</div>
        ${e.arms.map(i=>`
          <div class="row" style="gap:8px;align-items:center;margin:3px 0;">
            <span class="tiny" style="width:120px;">${s(i.armId)}</span>
            <div style="flex:1;">${b(i.mean*100,!1)}</div>
            <span class="tiny muted" style="width:90px;text-align:right;">${(i.mean*100).toFixed(0)}% \xB7 ${i.pulls}p</span>
          </div>`).join("")}
      </div>`).join(""):'<div class="tiny muted" style="margin-top:8px;">Sin experimentos a\xFAn. El sistema aprende de sus outcomes.</div>'}
  </div>`,h=a=>`
  <div class="card">
    <div class="row spread"><b>\u{1F9E0} Cach\xE9 sem\xE1ntica</b><span class="tag ok tiny">${a.hitRatePct}% hit</span></div>
    <div class="meta" style="margin-top:8px;">
      <span class="tag tiny">${a.entries} entradas</span>
      <span class="tag tiny">${a.hits} hits</span>
      <span class="tag tiny">${a.misses} misses</span>
      <span class="tag accent tiny">${a.hits} llamadas ahorradas</span>
    </div>
    ${a.topReused?.length?`<div style="margin-top:8px;">${a.topReused.map(e=>`<div class="tiny muted">\u2022 [${s(e.taskType)}] ${s(e.prompt)} \u2014 ${e.hits} reusos</div>`).join("")}</div>`:""}
  </div>`,y=a=>{const e=a.data?.intel??t.digest.data.intel;return`
  <div class="card">
    <b>\u{1F4CA} Digest del sistema</b>
    <p class="small" style="margin:8px 0;">${s(a.resumenEjecutivo??"")}</p>
    <div class="meta">
      <span class="tag tiny">misiones ${e.misiones.ok}\u2713/${e.misiones.parciales}~/${e.misiones.fallidas}\u2717</span>
      <span class="tag tiny">trazas \xE9xito ${e.trazas.tasaExito}%</span>
      <span class="tag tiny">carruseles ${e.carruseles.publicados} pub/${e.carruseles.retenidos} ret</span>
    </div>
    ${e.riesgos?.length?`<div style="margin-top:10px;"><div class="small" style="font-weight:700;color:var(--warn);">\u26A0\uFE0F Riesgos / atenci\xF3n</div>${e.riesgos.map(i=>`<div class="tiny muted">\u2022 ${s(i)}</div>`).join("")}</div>`:""}
    ${a.cosasQueRequierenAtencion?.length?`<div style="margin-top:8px;">${a.cosasQueRequierenAtencion.map(i=>`<div class="tiny">\u2022 ${s(i)}</div>`).join("")}</div>`:""}
  </div>`},d=[{id:"sensors",emoji:"\u{1F441}\uFE0F",name:"Sensores",desc:"IG API, Vision, Voz, comentarios, DMs, m\xE9tricas en tiempo real"},{id:"memory",emoji:"\u{1F9E0}",name:"Memoria",desc:"Brand profile, cach\xE9 sem\xE1ntica, historial de decisiones, embeddings"},{id:"reason",emoji:"\u2696\uFE0F",name:"Razonamiento",desc:"LLM (Claude/Ollama), bandits Thompson, scoring, descomposici\xF3n de goals"},{id:"agents",emoji:"\u{1F916}",name:"Agentes",desc:"Nova, L\xEDa, Gard, Luca, Mira + 10 especialistas (Algorithm, Meta Ads\u2026)"},{id:"actuators",emoji:"\u270B",name:"Actuadores",desc:"Computer Use cursor/teclado, IG Graph API, Canva, Upload Post, Meta Ads"},{id:"governance",emoji:"\u{1F6E1}\uFE0F",name:"Gobernanza",desc:"CUA mode gate, Approval gate, Compliance check, Budget breaker, GlassBox audit"}],$=[{from:"sensors",to:"memory",label:"datos crudos \u2192 embeddings"},{from:"memory",to:"reason",label:"contexto recuperado"},{from:"reason",to:"agents",label:"tarea decompuesta"},{from:"agents",to:"governance",label:"acci\xF3n propuesta"},{from:"governance",to:"actuators",label:"OK \u2192 ejecutar"},{from:"actuators",to:"sensors",label:"feedback loop"}],w=a=>`
    <div class="brain-arch">
      <div class="brain-arch-head">
        <h3>\u{1F9E0} Arquitectura del cerebro</h3>
        <p class="small muted">Las 6 capas del sistema y c\xF3mo se comunican entre s\xED.</p>
      </div>
      <div class="brain-layers">
        ${d.map(e=>`
          <div class="brain-layer" data-layer="${e.id}">
            <div class="brain-layer-emoji">${e.emoji}</div>
            <div class="brain-layer-content">
              <div class="brain-layer-name">${e.name}</div>
              <div class="brain-layer-desc">${s(e.desc)}</div>
            </div>
            <span class="brain-layer-pulse"></span>
          </div>`).join("")}
      </div>
      <div class="brain-flow">
        <h4 style="margin:14px 0 8px;font-size:13px;">\u26A1 Flujos de informaci\xF3n</h4>
        ${$.map(e=>`
          <div class="brain-flow-row">
            <span class="brain-flow-from">${d.find(i=>i.id===e.from).emoji} ${d.find(i=>i.id===e.from).name}</span>
            <span class="brain-flow-arrow">\u2192</span>
            <span class="brain-flow-label">${s(e.label)}</span>
            <span class="brain-flow-arrow">\u2192</span>
            <span class="brain-flow-to">${d.find(i=>i.id===e.to).emoji} ${d.find(i=>i.id===e.to).name}</span>
          </div>`).join("")}
      </div>
    </div>`,k=a=>{const e=a.cache??t.cache;return`
    <div class="brain-mem">
      <h3>\u{1F9E0} Memoria del sistema</h3>
      <p class="small muted" style="margin:4px 0 14px;">Qu\xE9 recuerda el cerebro: cach\xE9 sem\xE1ntica, brand profile, embeddings de tu historial.</p>
      <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
        <div class="brain-mem-card">
          <div class="brain-mem-icon">\u26A1</div>
          <div class="brain-mem-num">${e.entries}</div>
          <div class="brain-mem-lbl">Entradas en cach\xE9</div>
        </div>
        <div class="brain-mem-card">
          <div class="brain-mem-icon">\u{1F3AF}</div>
          <div class="brain-mem-num">${e.hitRatePct}%</div>
          <div class="brain-mem-lbl">Hit rate (ahorro)</div>
        </div>
        <div class="brain-mem-card">
          <div class="brain-mem-icon">\u{1F4B0}</div>
          <div class="brain-mem-num">${e.hits}</div>
          <div class="brain-mem-lbl">Llamadas LLM ahorradas</div>
        </div>
        <div class="brain-mem-card">
          <div class="brain-mem-icon">\u{1F4DA}</div>
          <div class="brain-mem-num">${(a.digest?.data?.intel?.carruseles?.publicados??0)+(a.digest?.data?.intel?.misiones?.ok??0)}</div>
          <div class="brain-mem-lbl">Producciones aprendidas</div>
        </div>
      </div>
      ${e.topReused?.length?`
        <h4 style="margin:18px 0 8px;font-size:13px;">\u{1F501} Top reusos de la memoria</h4>
        <div class="brain-mem-list">
          ${e.topReused.map(i=>`
            <div class="brain-mem-row">
              <span class="brain-mem-row-task">${s(i.taskType)}</span>
              <span class="brain-mem-row-prompt">${s(String(i.prompt).slice(0,80))}</span>
              <span class="brain-mem-row-hits">${i.hits}\xD7 reusos</span>
            </div>`).join("")}
        </div>`:'<div class="tiny muted" style="margin-top:14px;">Sin reusos registrados a\xFAn.</div>'}
    </div>`},A=a=>{const e=a.bandits??[],i=a.digest?.data?.intel??t.digest.data.intel;return`
    <div class="brain-reason">
      <h3>\u2696\uFE0F Razonamiento del sistema</h3>
      <p class="small muted" style="margin:4px 0 14px;">C\xF3mo decide: Thompson Sampling, scoring de contenido, tasas de \xE9xito.</p>
      <div class="brain-reason-stats">
        <div class="brain-reason-stat">
          <div class="num" style="color:var(--ok);">${i.trazas.tasaExito}%</div>
          <div class="lbl">tasa de acierto</div>
        </div>
        <div class="brain-reason-stat">
          <div class="num">${i.misiones.ok}</div>
          <div class="lbl">misiones OK</div>
        </div>
        <div class="brain-reason-stat" style="color:var(--warn);">
          <div class="num">${i.misiones.parciales}</div>
          <div class="lbl">parciales</div>
        </div>
        <div class="brain-reason-stat" style="color:var(--crit);">
          <div class="num">${i.misiones.fallidas}</div>
          <div class="lbl">fallidas</div>
        </div>
      </div>
      ${e.length?`
        <h4 style="margin:18px 0 8px;font-size:13px;">\u{1F3B0} Experimentos activos (bandits Thompson)</h4>
        ${e.map(r=>`
          <div class="brain-bandit">
            <div class="brain-bandit-head">
              <strong>${s(r.experimentId)}</strong>
              ${r.best?`<span class="tag ok tiny">mejor: ${s(r.best)}</span>`:""}
            </div>
            ${r.arms.map(n=>`
              <div class="brain-bandit-arm">
                <span class="arm-id">${s(n.armId)}</span>
                <div class="arm-bar"><div class="arm-fill" style="width:${(n.mean*100).toFixed(0)}%;"></div></div>
                <span class="arm-num">${(n.mean*100).toFixed(0)}% \xB7 ${n.pulls}p</span>
              </div>`).join("")}
          </div>`).join("")}
        `:'<div class="tiny muted" style="margin-top:14px;">Sin experimentos activos todav\xEDa. El sistema empieza a aprender cuando recibe outcomes.</div>'}
    </div>`},j=[{id:"consumption",emoji:"\u26A1",label:"Consumo"},{id:"architecture",emoji:"\u{1F9E0}",label:"Arquitectura"},{id:"memory",emoji:"\u{1F4DA}",label:"Memoria"},{id:"reasoning",emoji:"\u2696\uFE0F",label:"Razonamiento"}];let o="consumption";const v=a=>o==="consumption"?`
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;">
      ${x(a.budget??t.budget)}
      ${h(a.cache??t.cache)}
      ${f(a.bandits??t.bandits)}
      ${y(a.digest??t.digest)}
    </div>`:o==="architecture"?w(a):o==="memory"?k(a):o==="reasoning"?A(a):"",z=(a,e,i)=>{const r=a.querySelector("#intel-body");r&&(r.innerHTML=`
    ${i?`<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
      <span class="small">\u{1F4E1} Backend offline \xB7 mostrando valores por defecto. Reconect\xE1 para ver datos en vivo.</span>
    </div>`:""}
    <div class="brain-tabs">
      ${j.map(n=>`<button class="brain-tab ${n.id===o?"active":""}" data-tab="${n.id}">${n.emoji} ${n.label}</button>`).join("")}
    </div>
    <div id="brain-body">${v(e)}</div>

    <style>
      .brain-tabs{display:flex;gap:4px;padding:4px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;overflow-x:auto;}
      .brain-tab{flex-shrink:0;padding:8px 14px;border-radius:7px;border:0;background:transparent;color:var(--text-muted,#9CA3AF);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s;}
      .brain-tab:hover{background:rgba(255,255,255,.04);color:var(--fg,#fff);}
      .brain-tab.active{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;}

      .brain-arch-head h3{margin:0 0 4px;}
      .brain-layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:18px;}
      .brain-layer{position:relative;display:flex;gap:14px;align-items:center;padding:14px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
      .brain-layer::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#6366f1,#a855f7);}
      .brain-layer-emoji{font-size:30px;line-height:1;flex-shrink:0;}
      .brain-layer-name{font-weight:700;font-size:14px;}
      .brain-layer-desc{font-size:12px;color:var(--text-muted,#9CA3AF);line-height:1.45;margin-top:2px;}
      .brain-layer-pulse{position:absolute;top:10px;right:10px;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,.7);animation:brainPulse 2s ease-in-out infinite;}
      @keyframes brainPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(.85);}}

      .brain-flow{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;}
      .brain-flow-row{display:flex;gap:8px;align-items:center;padding:6px 0;font-size:12.5px;flex-wrap:wrap;}
      .brain-flow-from,.brain-flow-to{padding:3px 9px;border-radius:6px;background:rgba(168,85,247,.12);font-weight:600;}
      .brain-flow-arrow{color:var(--text-muted,#9CA3AF);}
      .brain-flow-label{color:var(--text-muted,#9CA3AF);font-style:italic;font-size:11.5px;}

      .brain-mem h3{margin:0 0 4px;}
      .brain-mem-card{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;}
      .brain-mem-icon{font-size:24px;margin-bottom:6px;}
      .brain-mem-num{font-size:24px;font-weight:800;}
      .brain-mem-lbl{font-size:11px;color:var(--text-muted,#9CA3AF);margin-top:4px;}
      .brain-mem-list{display:flex;flex-direction:column;gap:4px;}
      .brain-mem-row{display:flex;gap:10px;align-items:center;padding:8px 12px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:8px;font-size:12px;}
      .brain-mem-row-task{font-weight:700;color:#a855f7;flex-shrink:0;}
      .brain-mem-row-prompt{flex:1;color:var(--text-muted,#9CA3AF);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .brain-mem-row-hits{font-size:11px;color:var(--ok);flex-shrink:0;font-weight:600;}

      .brain-reason h3{margin:0 0 4px;}
      .brain-reason-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;}
      .brain-reason-stat{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;}
      .brain-reason-stat .num{font-size:28px;font-weight:800;line-height:1.1;}
      .brain-reason-stat .lbl{font-size:11px;color:var(--text-muted,#9CA3AF);margin-top:4px;}

      .brain-bandit{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;}
      .brain-bandit-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;}
      .brain-bandit-arm{display:flex;gap:8px;align-items:center;margin:4px 0;font-size:11.5px;}
      .arm-id{width:110px;flex-shrink:0;font-family:monospace;}
      .arm-bar{flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;}
      .arm-fill{height:100%;background:linear-gradient(90deg,#10b981,#22d3ee);}
      .arm-num{width:80px;text-align:right;color:var(--text-muted,#9CA3AF);}
    </style>
  `,r.querySelectorAll(".brain-tab").forEach(n=>{n.addEventListener("click",()=>{o=n.dataset.tab,r.querySelectorAll(".brain-tab").forEach(m=>m.classList.toggle("active",m===n));const p=r.querySelector("#brain-body");p&&(p.innerHTML=v(e))})}))};export const renderIntelligence=async a=>{c(),a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u26A1 Medidor de Consumo de IA</h1>
        <p class="view-subtitle page-subtitle">Cu\xE1nto consume tu sistema \xB7 presupuesto de tokens \xB7 aprendizaje (bandits) \xB7 cach\xE9 sem\xE1ntica \xB7 digest \u2014 en vivo.</p>
      </div>
    </header>
    <div id="intel-body" class="page-body">${u()}</div>`;const e=async()=>{const{data:i,error:r}=await g("/api/intelligence",t);z(a,i??t,!!r)};await e(),l=setInterval(e,5e3)};
