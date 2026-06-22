import{apiSafe as v}from"../lib/api.js";import{escape as s}from"../lib/dom.js";import{toast as b}from"../lib/toast.js";const S={social:["instagram","tiktok"],design:["canva"],videoEditor:["capcut","invideo","veed"],videoGen:["runway","pika","luma","kling","heygen"]},T={social:"\u{1F4F1} Redes sociales",design:"\u{1F3A8} Dise\xF1o",videoEditor:"\u{1F39E}\uFE0F Editores de video",videoGen:"\u{1F3A5} Generaci\xF3n IA de video"},d={free:{label:"Free",color:"#6B7280",bg:"rgba(107,114,128,.15)"},starter:{label:"Starter",color:"#3B82F6",bg:"rgba(59,130,246,.12)"},pro:{label:"Pro",color:"#A855F7",bg:"rgba(168,85,247,.12)"},gold:{label:"Gold",color:"#F59E0B",bg:"rgba(245,158,11,.15)"},premium:{label:"Premium",color:"#EC4899",bg:"rgba(236,72,153,.15)"}},g=["free","starter","pro","gold","premium"];let n="all",p="free";const f=(t,r)=>g.indexOf(t)>=g.indexOf(r),y=t=>{const r=d[t.minPlan]||d.free,o=!f(p,t.minPlan);return`
    <div class="ctb-recipe ${o?"locked":""}" data-recipe-id="${s(t.id)}">
      <div class="ctb-recipe-head">
        <div class="ctb-recipe-title">${s(t.label)}</div>
        <span class="ctb-badge" style="background:${r.bg};color:${r.color};">${r.label}+</span>
      </div>
      <div class="ctb-recipe-meta">
        <span class="ctb-meta-item">\u23F1\uFE0F ${t.estimatedMin} min</span>
        <span class="ctb-meta-item">\u{1F4CB} ${t.steps?.length||0} pasos</span>
        <span class="ctb-meta-item">\u{1F3F7}\uFE0F ${s(t.category)}</span>
        ${t.riskLevel?`<span class="ctb-meta-item ctb-risk-${s(t.riskLevel)}">\u26A0\uFE0F ${s(t.riskLevel)}</span>`:""}
      </div>
      ${t.rateLimit?`<div class="ctb-rate-limit">\u{1F6E1}\uFE0F ${s(t.rateLimit)}</div>`:""}
      <details class="ctb-steps">
        <summary>Ver ${t.steps?.length||0} pasos</summary>
        <ol class="ctb-steps-list">
          ${(t.steps||[]).map(a=>`
            <li>
              <span class="ctb-step-icon">${a.icon||"\u2022"}</span>
              <div>
                <strong>${s(a.action)}</strong>
                ${a.detail?`<span class="ctb-step-detail">\u2014 ${s(typeof a.detail=="string"?a.detail:"...")}</span>`:""}
              </div>
            </li>`).join("")}
        </ol>
      </details>
      <div class="ctb-actions">
        ${o?`<a class="ctb-btn ghost" href="/pricing.html">\u{1F512} Disponible en ${r.label}+</a>`:`<button class="ctb-btn primary" data-execute="${s(t.id)}">\u25B6\uFE0F Ejecutar Recipe</button>`}
        <button class="ctb-btn ghost" data-copy-json="${s(t.id)}">\u{1F4CB} Copiar JSON</button>
      </div>
    </div>`},h=(t,r)=>{const o={all:r.length};return r.forEach(a=>{o[a.tool]=(o[a.tool]||0)+1}),`
    <div class="ctb-tools-bar">
      <button class="ctb-tool-pill ${n==="all"?"active":""}" data-tool="all">
        \u{1F310} Todas <span class="ctb-count">${o.all}</span>
      </button>
      ${Object.entries(t).map(([a,e])=>`
        <button class="ctb-tool-pill ${n===a?"active":""}" data-tool="${s(a)}">
          ${e.icon} ${s(e.label)}
          <span class="ctb-count">${o[a]||0}</span>
        </button>`).join("")}
    </div>`},m=(t,r)=>{const o=n==="all"?t:t.filter(e=>e.tool===n);if(o.length===0)return'<div class="ctb-empty">Sin recetas para este tool en tu plan.</div>';const a={};return o.forEach(e=>{const i=`${e.tool}-${e.category}`;a[i]||(a[i]={tool:e.tool,category:e.category,recipes:[]}),a[i].recipes.push(e)}),Object.values(a).map(e=>`
    <div class="ctb-group">
      <h3 class="ctb-group-title">${r[e.tool]?.icon||"\u2699\uFE0F"} ${s(r[e.tool]?.label||e.tool)} \u2014 ${s(e.category)}</h3>
      <div class="ctb-recipes-grid">
        ${e.recipes.map(y).join("")}
      </div>
    </div>`).join("")},k=(t,r)=>{t.querySelectorAll("[data-tool]").forEach(o=>{o.addEventListener("click",()=>{n=o.dataset.tool;const a=t.querySelector("#ctb-recipes"),e=t._cuTools||{};a&&(a.innerHTML=m(r,e)),t.querySelectorAll("[data-tool]").forEach(i=>i.classList.toggle("active",i===o)),u(t,r)})}),u(t,r)},u=(t,r)=>{t.querySelectorAll("[data-copy-json]").forEach(o=>{o.addEventListener("click",async()=>{const a=o.dataset.copyJson,e=r.find(i=>i.id===a);if(e)try{await navigator.clipboard.writeText(JSON.stringify(e,null,2)),b("\u{1F4CB} Recipe JSON copiado","ok")}catch{b("No se pudo copiar","err")}})}),t.querySelectorAll("[data-execute]").forEach(o=>{o.addEventListener("click",()=>{const a=o.dataset.execute,e=r.find(c=>c.id===a);if(!e)return;const i=e.estimatedMin;b(`\u25B6\uFE0F Ejecutando "${e.label}" \u2014 ${i} min CU se descontar\xE1n de tu cap diario`,"info"),setTimeout(()=>{window.location.hash="#pantalla"},1500)})})};export const renderCuToolbox=async t=>{t.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F6E0}\uFE0F Computer Use Toolbox</h1>
        <p class="view-subtitle page-subtitle">Recetas para dominar IG \xB7 TikTok \xB7 Canva \xB7 CapCut \xB7 Runway \xB7 Pika \xB7 Luma \xB7 Kling \xB7 HeyGen \xB7 InVideo \xB7 Veed</p>
      </div>
    </header>
    <div class="page-body" id="ctb-root">
      <div class="ctb-loading"><span class="ctb-spin"></span> Cargando biblioteca de recipes\u2026</div>
    </div>
    <style>
      .ctb-loading{padding:40px;text-align:center;color:var(--text-tertiary,#888);}
      .ctb-spin{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:#a855f7;border-radius:50%;animation:ctbSpin .9s linear infinite;}
      @keyframes ctbSpin{to{transform:rotate(360deg);}}
      .ctb-summary{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:16px;color:var(--text-primary,var(--fg));}
      .ctb-summary h2{font-size:18px;margin:0 0 4px;letter-spacing:-0.015em;}
      .ctb-summary-meta{font-size:13px;color:var(--text-tertiary,#888);}
      .ctb-tools-bar{display:flex;gap:6px;flex-wrap:wrap;padding:6px;background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;overflow-x:auto;}
      .ctb-tool-pill{padding:8px 14px;background:transparent;border:0;border-radius:8px;color:var(--text-secondary,var(--fg));font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transition:background .15s,color .15s;font-family:inherit;}
      .ctb-tool-pill:hover{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-primary,var(--fg));}
      .ctb-tool-pill.active{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;box-shadow:0 2px 10px rgba(168,85,247,.25);}
      .ctb-count{padding:2px 6px;background:rgba(17,18,22,.08);border-radius:99px;font-size:10.5px;font-weight:700;}
      .ctb-tool-pill.active .ctb-count{background:rgba(255,255,255,.25);color:#fff;}
      .ctb-group{margin-bottom:24px;}
      .ctb-group-title{font-size:14px;font-weight:700;margin:0 0 10px;color:var(--text-primary,var(--fg));text-transform:uppercase;letter-spacing:.05em;padding:6px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;display:inline-block;}
      .ctb-recipes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;}
      .ctb-recipe{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:12px;padding:14px;transition:transform .15s,border-color .15s;color:var(--text-primary,var(--fg));}
      .ctb-recipe:hover{transform:translateY(-2px);border-color:rgba(168,85,247,.3);}
      .ctb-recipe.locked{opacity:.62;}
      .ctb-recipe-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;}
      .ctb-recipe-title{font-weight:700;font-size:14px;line-height:1.3;flex:1;}
      .ctb-badge{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:999px;letter-spacing:.03em;flex-shrink:0;}
      .ctb-recipe-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:11px;color:var(--text-tertiary,#888);margin-bottom:8px;}
      .ctb-meta-item{padding:2px 6px;background:var(--bg-soft,rgba(17,18,22,.04));border-radius:5px;}
      .ctb-risk-safe{color:#10b981;background:rgba(16,185,129,.08);}
      .ctb-risk-low{color:#3b82f6;background:rgba(59,130,246,.08);}
      .ctb-risk-medium{color:#f59e0b;background:rgba(245,158,11,.10);}
      .ctb-risk-high{color:#ef4444;background:rgba(239,68,68,.10);}
      .ctb-rate-limit{font-size:11px;padding:6px 9px;background:rgba(34,211,238,.06);border-left:2px solid #22d3ee;border-radius:6px;margin-bottom:10px;color:var(--text-secondary);}
      .ctb-steps{margin-bottom:10px;}
      .ctb-steps summary{cursor:pointer;font-size:12.5px;font-weight:600;color:var(--text-secondary,var(--fg));padding:6px 0;list-style:none;}
      .ctb-steps summary::-webkit-details-marker{display:none;}
      .ctb-steps summary::before{content:'\u25B8 ';transition:transform .2s;}
      .ctb-steps[open] summary::before{content:'\u25BE ';}
      .ctb-steps-list{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:5px;}
      .ctb-steps-list li{display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:6px 8px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:6px;line-height:1.4;}
      .ctb-step-icon{font-size:13px;flex-shrink:0;}
      .ctb-step-detail{color:var(--text-tertiary,#888);font-size:11px;}
      .ctb-actions{display:flex;gap:6px;}
      .ctb-btn{padding:8px 12px;border-radius:8px;border:0;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;text-align:center;flex:1;}
      .ctb-btn.primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .ctb-btn.primary:hover{filter:brightness(1.08);}
      .ctb-btn.ghost{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-secondary,var(--fg));border:1px solid var(--border);}
      .ctb-btn.ghost:hover{background:var(--bg-hover,rgba(17,18,22,.08));}
      .ctb-empty{padding:40px;text-align:center;color:var(--text-tertiary,#888);}
    </style>`;try{const l=await fetch("/api/auth/me",{credentials:"include"});l.ok&&(p=(await l.json())?.user?.plan||"free")}catch{}const{data:r,error:o}=await v("/api/cu/recipes?planId=premium",null),a=t.querySelector("#ctb-root");if(o||!r){a.innerHTML='<div class="ctb-empty">No se pudo cargar la biblioteca.</div>';return}const e=r.recipes||[],i=r.tools||{};t._cuTools=i;const c=d[p]||d.free,x=e.filter(l=>f(p,l.minPlan)).length;a.innerHTML=`
    <div class="ctb-summary">
      <h2>Biblioteca: ${e.length} recipes en ${Object.keys(i).length} herramientas</h2>
      <div class="ctb-summary-meta">
        Tu plan: <strong style="color:${c.color};">${c.label}</strong> \xB7
        Recipes disponibles: <strong>${x}/${e.length}</strong> \xB7
        <a href="/pricing.html" style="color:#a855f7;">Upgrade para m\xE1s \u2192</a>
      </div>
    </div>
    ${h(i,e)}
    <div id="ctb-recipes">${m(e,i)}</div>
  `,k(t,e)};
