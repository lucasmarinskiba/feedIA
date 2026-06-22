import{apiSafe as E}from"../lib/api.js";import{escape as n,openExternal as S}from"../lib/dom.js";import{toast as u}from"../lib/toast.js";let $=null;const k=()=>{$&&(clearInterval($),$=null)},I=[{v:"photo set",l:"\u{1F4F8} Photo set"},{v:"carrusel",l:"\u{1F0CF} Carrusel"},{v:"album",l:"\u{1F4DA} \xC1lbum"}],L=[{v:"nano-banana-2",l:"\u{1F34C} Nano Banana (r\xE1pido, texto)"},{v:"gpt-image-2",l:"\u{1F3A8} gpt-image-2 (calidad)"},{v:"flux",l:"\u{1F300} Flux (est\xE9tica)"}],z=[{v:"educar",l:"\u{1F393} Educar"},{v:"entretener",l:"\u{1F602} Entretener"},{v:"vender",l:"\u{1F6D2} Vender (soft sell)"},{v:"inspirar",l:"\u{1F680} Inspirar"}],P=[{v:"realista",l:"\u{1F4F7} Realista nativo"},{v:"minimal",l:"\u2B1C Minimal"},{v:"bold-tipo",l:"\u{1F520} Bold tipogr\xE1fico"},{v:"cinematico",l:"\u{1F3AC} Cinem\xE1tico"},{v:"editorial",l:"\u{1F4F0} Editorial / revista"},{v:"retro",l:"\u{1F4FC} Retro / anal\xF3gico"},{v:"3d",l:"\u{1F9CA} 3D / render"},{v:"collage",l:"\u2702\uFE0F Collage / meme"},{v:"ilustrado",l:"\u{1F58D}\uFE0F Ilustrado / mano"}],F=[{v:"marca",l:"\u{1F3A8} De la marca"},{v:"alto-contraste-bn",l:"\u2B1B Alto contraste B&N"},{v:"vibrante",l:"\u{1F308} Vibrante"},{v:"pastel",l:"\u{1FA70} Pastel"},{v:"neon",l:"\u{1F4A1} Ne\xF3n"},{v:"tierra",l:"\u{1F3DC}\uFE0F Tierra / c\xE1lida"},{v:"frio",l:"\u{1F9CA} Fr\xEDo / azulado"}],M=[{v:"energetico",l:"\u26A1 Energ\xE9tico"},{v:"autoridad",l:"\u{1F393} Serio / autoridad"},{v:"aspiracional",l:"\u2728 Aspiracional"},{v:"divertido",l:"\u{1F604} Divertido"},{v:"misterioso",l:"\u{1F576}\uFE0F Misterioso"},{v:"cercano",l:"\u{1FAF6} Cercano"}],O=[{v:"media",l:"\u25E7 Media"},{v:"minima",l:"\u25AB\uFE0F M\xEDnima"},{v:"alta",l:"\u25A6 Alta"}],j=["Todos","13-17","18-24","25-34","35-44","45-54","55+"],q=["Todos","Mujeres","Hombres","No binario"],U=["Todos","LatAm","Argentina","M\xE9xico","Colombia","Chile","Espa\xF1a","USA hispano"],R=["Espa\xF1ol neutro","Rioplatense (AR/UY)","Mexicano","Espa\xF1a","Colombiano"],N=["Todos","Principiante","Intermedio","Avanzado"],c=o=>o.map(a=>typeof a=="string"?`<option value="${n(a)}">${n(a)}</option>`:`<option value="${a.v}">${a.l}</option>`).join(""),D=(o,a)=>Array.from({length:a},(m,r)=>({n:r+1,role:r===0?"HOOK":r===a-1?"REMATE + CTA":`Revelaci\xF3n ${r}`,text:r===0?`Hook brutal: "${o.slice(0,40)}"`:r===a-1?'Punch final + "volv\xE9 a la 1\xAA / coment\xE1"':`Una idea nueva (${r})`,prompt:`[SUJETO] escena sobre "${o.slice(0,50)}", foto ${r+1}/${a}. [PLANO] ${r===0?"impactante que obliga a deslizar":"idea clara"}. [LUZ] direccional alto contraste. [ESTILO] crudo real nativo TikTok. [ON-SCREEN] texto grande en safe-area. [CALIDAD] 1080x1920 9:16 sin watermark.`,alt:`Foto ${r+1} sobre ${o.slice(0,40)}`})),C=(o,a,m)=>{const r=/hook/i.test(a),b=/cta|remate/i.test(a),f=r?"#FE2C55":b?"#7928CA":"#25F4EE",h=f==="#25F4EE"?"#0d0d12":"#fff",g="#fff",y=t=>String(t).replace(/[<>&"]/g,i=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"})[i]),x=y(a.length>16?a.slice(0,16)+"\u2026":a),w=y(m.length>32?m.slice(0,32)+"\u2026":m),A=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 480" width="270" height="480"><rect width="270" height="480" fill="${f}"/><defs><linearGradient id="pg${o}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs><rect width="270" height="480" fill="url(#pg${o})"/><circle cx="135" cy="100" r="32" fill="rgba(255,255,255,0.18)"/><text x="135" y="108" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" font-weight="900" fill="${g}">${o}</text><text x="135" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${h}">${x}</text><text x="135" y="260" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${g}" opacity="0.8">${w}</text><text x="135" y="440" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="${g}" opacity="0.45">TikTok Photo \xB7 9:16</text></svg>`;return`data:image/svg+xml;charset=utf-8,${encodeURIComponent(A)}`};export const renderTikTokPhoto=async o=>{k(),o.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F5BC}\uFE0F Foto TikTok \xB7 Photo Mode</h1>
        <p class="view-subtitle page-subtitle">Carrusel de fotos NATIVO de TikTok: 9:16 vertical, foto 1 = hook, 1 idea por foto, sonido obligatorio, loop para rewatch. Equipo de IA interno perfecciona el prompt de cada imagen.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="card" style="margin-bottom:14px;border-left:3px solid #FE2C55;background:linear-gradient(135deg,rgba(37,244,238,.06),rgba(254,44,85,.06));">
        <div class="small"><strong>TikTok Photo \u2260 IG Carrusel</strong> \xB7 vertical 9:16 \xB7 foto 1 obliga a deslizar \xB7 texto corto sobre imagen \xB7 sonido trending \xB7 swipe completion + replays mandan.</div>
      </div>

      <div class="gx-panel">
        <label class="gx-label">Tema / idea / URL</label>
        <textarea id="ph-tema" class="gx-input" rows="2" placeholder="Ej: '5 apps de IA que cambian el juego' \xB7 una idea \xB7 link"></textarea>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">\u{1F465}</span> Audiencia Personalizada <span class="gx-chev">\u2304</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Edad</label><select id="ph-edad" class="gx-input">${c(j)}</select></div>
              <div><label class="gx-mini">G\xE9nero</label><select id="ph-genero" class="gx-input">${c(q)}</select></div>
              <div><label class="gx-mini">Regi\xF3n</label><select id="ph-region" class="gx-input">${c(U)}</select></div>
              <div><label class="gx-mini">Idioma / variante</label><select id="ph-idioma" class="gx-input">${c(R)}</select></div>
              <div><label class="gx-mini">Nivel del p\xFAblico</label><select id="ph-nivel" class="gx-input">${c(N)}</select></div>
              <div><label class="gx-mini">Intereses (opcional)</label><input id="ph-intereses" class="gx-input" placeholder="ej: IA, fitness, finanzas"></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse" open>
          <summary class="gx-summary"><span class="gx-sum-ico">\u{1F4F8}</span> Opciones del Photo set <span class="gx-chev">\u2304</span></summary>
          <div class="gx-body">
            <div style="margin-bottom:12px;">
              <label class="gx-mini">Cantidad de fotos</label>
              <div class="gx-seg" id="ph-n-seg">
                ${["3","4","5","6","7","8","10"].map(t=>`<button type="button" class="gx-seg-btn${t==="6"?" on":""}" data-v="${t}">${t}</button>`).join("")}
              </div>
              <input type="hidden" id="ph-n" value="6">
            </div>
            <div class="gx-grid">
              <div><label class="gx-mini">Tipo</label><select id="ph-tipo" class="gx-input">${c(I)}</select></div>
              <div><label class="gx-mini">Objetivo</label><select id="ph-modo" class="gx-input">${c(z)}</select></div>
              <div><label class="gx-mini">Modelo de imagen</label><select id="ph-model" class="gx-input">${c(L)}</select></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">\u{1F3A8}</span> Est\xE9tica avanzada <span class="gx-chev">\u2304</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Estilo visual</label><select id="ph-estilo" class="gx-input">${c(P)}</select></div>
              <div><label class="gx-mini">Paleta</label><select id="ph-paleta" class="gx-input">${c(F)}</select></div>
              <div><label class="gx-mini">Mood</label><select id="ph-mood" class="gx-input">${c(M)}</select></div>
              <div><label class="gx-mini">Densidad de texto</label><select id="ph-dens" class="gx-input">${c(O)}</select></div>
            </div>
          </div>
        </details>

        <div class="btn-row" style="margin-top:14px;gap:8px;">
          <button class="btn primary" id="ph-plan">\u{1F4CB} Planear photo set</button>
          <button class="btn" id="ph-render">\u{1F3A8} Generar im\xE1genes (IA)</button>
        </div>

        <div class="ph-tools">
          <div class="ph-tools-label">O que FeedIA edite por vos (Computer Use / web):</div>
          <div class="ph-tools-row">
            <button class="btn ghost tiny ph-tool" data-tool="canva" data-kind="app">\u{1F3A8} Canva (CU)</button>
            <button class="btn ghost tiny ph-tool" data-tool="photopea" data-kind="web" data-url="https://www.photopea.com">\u{1F5BC}\uFE0F Editor imagen (Photopea)</button>
            <button class="btn ghost tiny ph-tool" data-tool="nano-banana" data-kind="web" data-url="https://fal.ai/models/fal-ai/nano-banana">\u{1F34C} Nano Banana</button>
            <button class="btn ghost tiny ph-tool" data-tool="gpt-image" data-kind="web" data-url="https://fal.ai/models/fal-ai/gpt-image-1">\u{1F3A8} gpt-image</button>
          </div>
        </div>
      </div>

      <!-- Lienzo: recuadro 9:16 que muestra la imagen generada por IA -->
      <div class="ph-canvas-wrap">
        <div class="ph-canvas-head">
          <span>\u{1F5BC}\uFE0F Lienzo \xB7 vista previa 9:16</span>
          <span class="small muted" id="ph-canvas-meta">vac\xEDo</span>
        </div>
        <div class="ph-frame" id="ph-frame">
          <div class="ph-frame-empty" id="ph-frame-empty">
            <div style="font-size:34px;">\u{1F5BC}\uFE0F</div>
            <div class="small muted" style="margin-top:8px;text-align:center;">Tu imagen 9:16 aparece ac\xE1.<br>Us\xE1 "Generar im\xE1genes (IA)" o edit\xE1 en Canva/Photopea.</div>
          </div>
          <img id="ph-frame-img" alt="imagen generada" style="display:none;">
        </div>
        <div class="ph-thumbs" id="ph-thumbs"></div>
      </div>

      <div id="ph-result"></div>
    </div>
    <style>
      /* Panel claro (mismas reglas que Guion) */
      .gx-panel{background:#fff;border:1px solid #E3E6EB;border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .gx-label{display:block;font-size:14px;font-weight:700;color:#15181E;margin-bottom:8px;}
      .gx-mini{display:block;font-size:12px;font-weight:600;color:#475067;margin-bottom:5px;}
      .gx-input{width:100%;box-sizing:border-box;background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:12px;padding:13px 15px;font-size:15px;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s;}
      .gx-input::placeholder{color:#98A1B3;}
      .gx-input:focus{border-color:#9da9ff;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      textarea.gx-input{resize:vertical;line-height:1.5;}
      select.gx-input{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:40px;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2398A1B3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat:no-repeat;background-position:right 14px center;}
      .gx-collapse{margin-top:12px;border:1px solid #E3E6EB;border-radius:12px;background:#fff;overflow:hidden;}
      .gx-summary{display:flex;align-items:center;gap:10px;padding:14px 15px;font-size:15px;font-weight:700;color:#15181E;cursor:pointer;list-style:none;user-select:none;}
      .gx-summary::-webkit-details-marker{display:none;}
      .gx-sum-ico{font-size:16px;}
      .gx-chev{margin-left:auto;color:#98A1B3;font-size:18px;transition:transform .2s;line-height:1;}
      .gx-collapse[open] .gx-chev{transform:rotate(180deg);}
      .gx-body{padding:0 15px 16px;}
      .gx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;}
      .gx-seg{display:flex;flex-wrap:wrap;gap:6px;background:#F2F4F7;border:1px solid #E3E6EB;border-radius:12px;padding:5px;}
      .gx-seg-btn{flex:1;min-width:42px;border:0;background:transparent;color:#475067;font-size:14px;font-weight:700;padding:9px 6px;border-radius:9px;cursor:pointer;transition:all .15s;}
      .gx-seg-btn:hover{background:#E7EAF0;}
      .gx-seg-btn.on{background:#fff;color:#15181E;box-shadow:0 1px 3px rgba(16,24,40,.12);}
      /* Herramientas CU / web \u2014 chips modernos */
      .ph-tools{margin-top:16px;border-top:1px solid #EEF0F4;padding-top:14px;}
      .ph-tools-label{font-size:11px;font-weight:600;color:#667085;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}
      .ph-tools-row{display:flex;gap:8px;flex-wrap:wrap;}
      .ph-tool{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#15181E !important;background:#fff !important;border:1px solid #E3E6EB !important;border-radius:999px !important;padding:9px 14px !important;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s,background .15s;}
      .ph-tool:hover{transform:translateY(-2px);border-color:#FE2C55 !important;box-shadow:0 5px 14px rgba(254,44,85,.18);background:linear-gradient(135deg,rgba(37,244,238,.08),rgba(254,44,85,.08)) !important;}
      /* Lienzo 9:16 */
      .ph-canvas-wrap{background:var(--bg-elev,#1c1c22);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;}
      .ph-canvas-head{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:14px;margin-bottom:10px;}
      .ph-frame{position:relative;width:100%;max-width:300px;margin:0 auto;aspect-ratio:9/16;border-radius:18px;overflow:hidden;background:#0c0c10;border:2px solid #2a2a33;box-shadow:0 8px 30px rgba(0,0,0,.35);}
      .ph-frame img{width:100%;height:100%;object-fit:cover;display:block;}
      .ph-frame-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;}
      .ph-thumbs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px;}
      .ph-thumb{width:46px;aspect-ratio:9/16;border-radius:7px;overflow:hidden;border:2px solid transparent;cursor:pointer;background:#0c0c10;}
      .ph-thumb.on{border-color:#FE2C55;}
      .ph-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
      /* Resultado (tema oscuro de la app) */
      .ph-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px;}
      .ph-slot{background:var(--bg-elev,#1c1c22);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
      .ph-slot img{width:100%;aspect-ratio:9/16;object-fit:cover;display:block;}
      .ph-slot-body{padding:8px;}
      .ph-role{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#FE2C55;}
      .ph-text{font-size:12px;margin-top:2px;}
      .ph-skel{aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,rgba(255,255,255,.03),rgba(255,255,255,.03) 10px,transparent 10px,transparent 20px);}
      .ph-prompt{margin-top:6px;}
      .ph-prompt summary{font-size:10px;color:var(--text-dim,#9CA3AF);cursor:pointer;}
      .ph-prompt .small{font-size:11px;white-space:pre-wrap;color:var(--text-dim,#9CA3AF);margin-top:4px;}
    </style>`;const a=t=>o.querySelector(t)?.value??"",m=()=>a("#ph-tema").trim(),r=()=>({edad:a("#ph-edad"),genero:a("#ph-genero"),region:a("#ph-region"),idioma:a("#ph-idioma"),nivel:a("#ph-nivel"),intereses:a("#ph-intereses").trim()});o.querySelector("#ph-n-seg")?.addEventListener("click",t=>{const i=t.target.closest(".gx-seg-btn");i&&(o.querySelectorAll("#ph-n-seg .gx-seg-btn").forEach(s=>s.classList.remove("on")),i.classList.add("on"),o.querySelector("#ph-n").value=i.dataset.v)}),o.querySelectorAll(".ph-tool").forEach(t=>{t.addEventListener("click",async()=>{const i=t.dataset.tool;if(t.dataset.kind==="app"){const{error:s}=await E("/api/cu/apps/launch",null,{method:"POST",body:{app:i}});u(s?`\u{1F4E1} CU no disponible (demo). Activ\xE1 Computer Use para operar ${i}.`:`${i} abierto \xB7 Computer Use editando \u{1F5B1}\uFE0F`,s?"warn":"ok")}else{const s=await S(t.dataset.url);u(s.shownModal?`\u{1F517} ${i} abierto en otra pesta\xF1a`:`${i} abierto`,"info")}})});const b=o.querySelector("#ph-frame-img"),f=o.querySelector("#ph-frame-empty"),h=o.querySelector("#ph-thumbs"),g=o.querySelector("#ph-canvas-meta"),y=(t,i)=>t.url?t.url:`/api/skills/carousel/slide/${encodeURIComponent(i??"")}/${encodeURIComponent(t.name??t)}`,x=t=>{b.src=t,b.style.display="block",f.style.display="none"},w=(t,i)=>{const s=(t??[]).map(e=>y(e,i)).filter(Boolean);s.length&&(x(s[0]),g.textContent=`${s.length} foto${s.length>1?"s":""} \xB7 9:16`,h.innerHTML=s.map((e,d)=>`<div class="ph-thumb${d===0?" on":""}" data-i="${d}"><img src="${n(e)}" alt="foto ${d+1}" onerror="this.parentElement.style.display='none'"></div>`).join(""),h.querySelectorAll(".ph-thumb").forEach(e=>e.addEventListener("click",()=>{h.querySelectorAll(".ph-thumb").forEach(d=>d.classList.remove("on")),e.classList.add("on"),x(s[Number(e.dataset.i)])})))},A=(t,i,s,e,d)=>{const v=d?'<span class="tag tiny warn">local</span>':e?.simulated?'<span class="tag tiny warn">sin ANTHROPIC_API_KEY</span>':'<span class="tag tiny ok">agentes IA</span>';return`
      <div class="card">
        <div class="row spread" style="margin-bottom:6px;"><h3 style="margin:0;">\u{1F4CB} ${n(i)} \xB7 ${n(s)}</h3>${v}</div>
        <div class="ph-grid">
          ${t.map(l=>`
            <div class="ph-slot">
              <img src="${C(l.n,l.role,l.text)}" style="width:100%;aspect-ratio:9/16;object-fit:cover;display:block;border-radius:4px 4px 0 0;">
              <div class="ph-slot-body">
                <div class="ph-role">${l.n}. ${n(l.role)}</div>
                <div class="ph-text">${n(l.text)}</div>
                ${l.prompt?`<details class="ph-prompt"><summary>\u{1F3A8} prompt perfeccionado</summary><div class="small">${n(l.prompt)}</div></details>`:""}
              </div>
            </div>`).join("")}
        </div>
        ${e?.caption?`<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${n(e.caption)}</div></div>`:""}
        ${e?.hashtags?`<div class="small muted" style="margin-top:6px;">${n(e.hashtags)}</div>`:""}
        ${e?.sonido?`<div class="small muted" style="margin-top:4px;">\u{1F3B5} Sonido: ${n(e.sonido)}</div>`:""}
        <div class="small muted" style="margin-top:10px;">\u{1F4A1} "Generar im\xE1genes" produce los PNG 9:16 desde estos prompts. Skill: <code>/feedIA-tiktok-photo</code></div>
      </div>`};o.querySelector("#ph-plan").addEventListener("click",async()=>{const t=m();if(!t){u("Escrib\xED un tema","warn");return}const i=Number(a("#ph-n")),s=a("#ph-tipo"),e=o.querySelector("#ph-result");e.innerHTML='<div class="card"><span class="spinner"></span> El equipo TikTok + imagen est\xE1 planeando\u2026</div>';const{data:d,error:v}=await E("/api/skills/tiktok/photo",null,{method:"POST",body:{tema:t,fotos:i,tipo:s,modelo:a("#ph-model"),modo:a("#ph-modo"),estilo:a("#ph-estilo"),paleta:a("#ph-paleta"),mood:a("#ph-mood"),densidad:a("#ph-dens"),audiencia:r()}}),l=(d?.photos??[]).length?d.photos:D(t,i);e.innerHTML=A(l,s,t,d,v),l.length&&(x(C(l[0].n,l[0].role,l[0].text)),g.textContent=`${l.length} foto${l.length>1?"s":""} \xB7 plan IA`),u("Photo set listo","ok")}),o.querySelector("#ph-render").addEventListener("click",async()=>{const t=m();if(!t){u("Escrib\xED un tema","warn");return}const i=a("#ph-model"),s=o.querySelector("#ph-result");s.innerHTML='<div class="card"><span class="spinner"></span> Generando fotos 9:16\u2026</div>';const{data:e,error:d}=await E("/api/skills/carousel/generate",null,{method:"POST",body:{input:t,model:i,format:"historia"}});if(d||!e){s.innerHTML='<div class="card"><div class="small muted">\u{1F4E1} Backend offline. Us\xE1 "Planear photo set" o Canva (Computer Use).</div></div>';return}if(e.hasFalKey===!1||e.status==="plan-only"){s.innerHTML='<div class="card" style="border-color:rgba(245,158,11,.4);"><strong>\u26A0\uFE0F Falta FAL_KEY</strong><div class="small muted" style="margin-top:6px;">Configur\xE1 FAL_KEY para render real, o us\xE1 camino Canva.</div></div>';return}const v=l=>`<div class="ph-grid">${(l??[]).map(p=>{const T=p.url?p.url:`/api/skills/carousel/slide/${encodeURIComponent(e.jobId??"")}/${encodeURIComponent(p.name??p)}`;return`<div class="ph-slot"><img src="${n(T)}" alt="foto ${n(String(p.num??""))}" onerror="this.parentElement.style.display='none'"></div>`}).join("")}</div>`;if(e.status){s.innerHTML=`<div class="card"><div class="row spread" style="margin-bottom:8px;"><strong>${e.status==="done"?"\u2705 Fotos listas":e.status==="error"?"\u26A0\uFE0F Error":"\u{1F504} "+n(e.status)}</strong><span class="small muted">9:16 \xB7 ${n(i)}</span></div>${e.error?`<div class="small crit">${n(e.error)}</div>`:""}${v(e.slides)}${e.caption?`<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${n(e.caption)}</div></div>`:""}</div>`,w(e.slides,e.jobId),u(e.status==="done"?"\u{1F389} Fotos generadas":"Generaci\xF3n con error",e.status==="error"?"warn":"ok");return}if(e.jobId){k();const l=Date.now();$=setInterval(async()=>{if(Date.now()-l>18e4){k();return}const{data:p}=await E(`/api/skills/carousel/status/${e.jobId}`,null);p&&(s.innerHTML=`<div class="card"><strong>${p.status==="done"?"\u2705 Fotos listas":"\u{1F504} "+n(p.status)}</strong>${v(p.slides)}</div>`,p.slides?.length&&w(p.slides,e.jobId),["done","error","plan-only"].includes(p.status)&&k())},2e3)}})};
