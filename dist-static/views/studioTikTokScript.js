import{apiSafe as g}from"../lib/api.js";import{escape as i}from"../lib/dom.js";import{toast as p}from"../lib/toast.js";const k=[{v:"talking-head",l:"\u{1F3A4} Talking head"},{v:"pov",l:"\u{1F441}\uFE0F POV"},{v:"storytime",l:"\u{1F4D6} Storytime"},{v:"tutorial",l:"\u{1F6E0}\uFE0F Tutorial 30s"},{v:"trend",l:"\u{1F525} Trend / sound"},{v:"listicle",l:"\u{1F522} Listicle (top X)"},{v:"reaction",l:"\u{1F62E} Reacci\xF3n"},{v:"duet-stitch",l:"\u{1F517} Duet / Stitch"},{v:"mythbusting",l:"\u274C Mito vs realidad"},{v:"before-after",l:"\u2194\uFE0F Antes / despu\xE9s"},{v:"day-in-life",l:"\u{1F305} D\xEDa en mi vida"},{v:"unboxing",l:"\u{1F4E6} Unboxing / demo"},{v:"green-screen",l:"\u{1F7E9} Green screen (noticia)"},{v:"voiceover-broll",l:"\u{1F399}\uFE0F Voz en off + b-roll"},{v:"skit",l:"\u{1F3AD} Skit / sketch"},{v:"challenge",l:"\u{1F3C6} Challenge"},{v:"asmr",l:"\u{1F92B} ASMR / satisfying"},{v:"street-interview",l:"\u{1F3A4} Entrevista en calle"}],h=[{v:"entretener",l:"\u{1F602} Entretener"},{v:"educar",l:"\u{1F393} Educar"},{v:"emocionar",l:"\u2764\uFE0F Emocionar"},{v:"vender",l:"\u{1F6D2} Vender (soft sell)"},{v:"inspirar",l:"\u{1F680} Inspirar"}],f=[{v:"cercano",l:"\u{1FAF6} Cercano / amigo"},{v:"autoridad",l:"\u{1F393} Autoridad experta"},{v:"humor",l:"\u{1F602} Humor"},{v:"contrarian",l:"\u{1F525} Pol\xE9mico / contrarian"},{v:"inspirador",l:"\u2728 Inspirador"},{v:"directo",l:"\u26A1 Directo / sin vueltas"}],y=[{v:"auto",l:"\u{1F916} Auto (mejor seg\xFAn tema)"},{v:"numero",l:"\u{1F522} N\xFAmero / dato"},{v:"contradiccion",l:"\u{1F92F} Contradicci\xF3n"},{v:"pov",l:"\u{1F441}\uFE0F POV"},{v:"pregunta",l:"\u2753 Pregunta directa"},{v:"error",l:"\u{1F6AB} Error com\xFAn"},{v:"resultado",l:"\u{1F3AF} Promesa de resultado"},{v:"curiosidad",l:"\u{1F573}\uFE0F Curiosity gap"},{v:"storytime",l:'\u{1F4D6} "Te cuento qu\xE9 pas\xF3"'}],E=[{v:"comentar",l:"\u{1F4AC} Comentarios"},{v:"seguir",l:"\u2795 Seguir"},{v:"guardar",l:"\u{1F516} Guardar"},{v:"compartir",l:"\u2197\uFE0F Compartir / send"},{v:"link",l:"\u{1F517} Link / bio"},{v:"vender",l:"\u{1F6D2} Venta"}],S=[{v:"rapido",l:"\u26A1 R\xE1pido (cortes 1-2s)"},{v:"medio",l:"\u{1F3B5} Medio (2-4s)"},{v:"lento",l:"\u{1F30A} Lento / narrativo"}],$=[{v:"tiktok",l:"\u{1F3B5} TikTok"},{v:"reels",l:"\u{1F4F8} Reels (IG)"},{v:"shorts",l:"\u25B6\uFE0F Shorts (YT)"},{v:"todas",l:"\u{1F310} Las 3 (adaptar)"}],A=[{v:"si",l:"\u2705 S\xED (recomendado)"},{v:"no",l:"\u274C No"}],w=[{v:"si",l:"\u{1F39E}\uFE0F S\xED, sugerir b-roll"},{v:"no",l:"\u2796 No"}],C=[{v:"media",l:"\u25E7 Media"},{v:"minima",l:"\u25AB\uFE0F M\xEDnima"},{v:"alta",l:"\u25A6 Alta"}],O=["Todos","13-17","18-24","25-34","35-44","45-54","55+"],T=["Todos","Mujeres","Hombres","No binario"],L=["Todos","LatAm","Argentina","M\xE9xico","Colombia","Chile","Espa\xF1a","USA hispano"],M=["Espa\xF1ol neutro","Rioplatense (AR/UY)","Mexicano","Espa\xF1a","Colombiano"],P=["Todos","Principiante","Intermedio","Avanzado"],l=t=>t.map(n=>typeof n=="string"?`<option value="${i(n)}">${i(n)}</option>`:`<option value="${n.v}">${n.l}</option>`).join(""),u=(t,n,e,a)=>`
  <div class="card">
    <h3>\u{1F4CB} Plantilla de guion \xB7 ${i(t||"tu tema")}</h3>
    <p class="small muted">${i(a)} \xB7 ${i(e)} \xB7 ${n}s \xB7 9:16. Complet\xE1 cada beat con las 5 capas.</p>
    <div class="ttk-beats">
      ${[{t:"HOOK (0-2s)",g:"Frase que detiene el scroll (n\xFAmero/contradicci\xF3n/POV). 6-10 palabras.",nv:"cejas arriba, mano que frena, mirada fija a lente",os:"gancho escrito grande"},{t:"PROMESA (2-5s)",g:"Qu\xE9 gana si se queda. Abre un loop.",nv:"acercarse a c\xE1mara, ritmo sube",os:'"esper\xE1 al paso 3"'},{t:"DESARROLLO 1",g:"1 idea concreta. Micro-cliffhanger.",nv:"gesto que enumera, corte de plano",os:"palabra clave"},{t:"DESARROLLO 2",g:"Segunda idea. Sube tensi\xF3n.",nv:"cambio de encuadre, energ\xEDa",os:"dato/cifra real"},{t:"PAYOFF",g:"El insight/giro que prometiste.",nv:"pausa, baja la voz, mirada directa",os:"la revelaci\xF3n"},{t:"CTA + LOOP",g:"Invit\xE1 a comentar/seguir. \xDAltima l\xEDnea reconecta con el hook (rewatch).",nv:"se\xF1alar comentarios, sonrisa",os:"CTA corto"}].map((s,r)=>`
        <div class="ttk-beat">
          <div class="ttk-beat-num">${r+1}</div>
          <div>
            <div class="ttk-beat-title">${s.t}</div>
            <div class="small"><strong>Guion:</strong> ${i(s.g)}</div>
            <div class="small muted"><strong>No verbal:</strong> ${i(s.nv)}</div>
            <div class="small muted"><strong>On-screen:</strong> ${i(s.os)}</div>
          </div>
        </div>`).join("")}
    </div>
    <div class="small muted" style="margin-top:12px;">\u{1F4A1} Para guion completo redactado por IA con tu voz de marca, conect\xE1 backend o pedilo por voz: <code>/feedIA-tiktok-script</code>.</div>
  </div>`;export const renderTikTokScript=async t=>{t.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u270D\uFE0F Guion TikTok</h1>
        <p class="view-subtitle page-subtitle">Guion beat a beat con elocuencia, lenguaje no verbal (gestos/expresiones/mirada) y ganchos de retenci\xF3n. Pensado para completion rate.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="gx-panel">
        <label class="gx-label">Tema del Video</label>
        <textarea id="ttk-tema" class="gx-input" rows="2" placeholder="p. ej., 'Abriendo un gadget tecnol\xF3gico misterioso'"></textarea>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">\u{1F465}</span> Audiencia Personalizada <span class="gx-chev">\u2304</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Edad</label><select id="ttk-edad" class="gx-input">${l(O)}</select></div>
              <div><label class="gx-mini">G\xE9nero</label><select id="ttk-genero" class="gx-input">${l(T)}</select></div>
              <div><label class="gx-mini">Regi\xF3n</label><select id="ttk-region" class="gx-input">${l(L)}</select></div>
              <div><label class="gx-mini">Idioma / variante</label><select id="ttk-idioma" class="gx-input">${l(M)}</select></div>
              <div><label class="gx-mini">Nivel del p\xFAblico</label><select id="ttk-nivel" class="gx-input">${l(P)}</select></div>
              <div><label class="gx-mini">Intereses (opcional)</label><input id="ttk-intereses" class="gx-input" placeholder="ej: IA, fitness, finanzas"></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse" open>
          <summary class="gx-summary"><span class="gx-sum-ico">\u{1F3AC}</span> Opciones del Video <span class="gx-chev">\u2304</span></summary>
          <div class="gx-body">
            <div style="margin-bottom:12px;">
              <label class="gx-mini">Duraci\xF3n</label>
              <div class="gx-seg" id="ttk-dur-seg">
                ${[["7","7s"],["15","15s"],["30","30s"],["45","45s"],["60","60s"],["90","90s"],["180","3 min"]].map(([a,s])=>`<button type="button" class="gx-seg-btn${a==="30"?" on":""}" data-v="${a}">${s}</button>`).join("")}
              </div>
              <input type="hidden" id="ttk-dur" value="30">
            </div>
            <div class="gx-grid">
              <div><label class="gx-mini">Tipo de video</label><select id="ttk-fmt" class="gx-input">${l(k)}</select></div>
              <div><label class="gx-mini">Objetivo</label><select id="ttk-modo" class="gx-input">${l(h)}</select></div>
              <div><label class="gx-mini">Tono</label><select id="ttk-tono" class="gx-input">${l(f)}</select></div>
              <div><label class="gx-mini">Tipo de gancho</label><select id="ttk-gancho" class="gx-input">${l(y)}</select></div>
              <div><label class="gx-mini">Objetivo del CTA</label><select id="ttk-cta" class="gx-input">${l(E)}</select></div>
              <div><label class="gx-mini">Ritmo de edici\xF3n</label><select id="ttk-ritmo" class="gx-input">${l(S)}</select></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">\u2699\uFE0F</span> Opciones Avanzadas <span class="gx-chev">\u2304</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Plataforma destino</label><select id="ttk-plat" class="gx-input">${l($)}</select></div>
              <div><label class="gx-mini">Subt\xEDtulos</label><select id="ttk-subs" class="gx-input">${l(A)}</select></div>
              <div><label class="gx-mini">B-roll sugerido</label><select id="ttk-broll" class="gx-input">${l(w)}</select></div>
              <div><label class="gx-mini">Densidad texto en pantalla</label><select id="ttk-dens" class="gx-input">${l(C)}</select></div>
              <div><label class="gx-mini">CTA exacto (opcional)</label><input id="ttk-ctatxt" class="gx-input" placeholder='ej: "Coment\xE1 IA y te paso la lista"'></div>
              <div><label class="gx-mini">Palabras / temas a evitar</label><input id="ttk-evitar" class="gx-input" placeholder="ej: pol\xEDtica, precios"></div>
            </div>
          </div>
        </details>

        <button class="btn primary" id="ttk-go" style="margin-top:14px;width:100%;">\u270D\uFE0F Armar guion inteligente</button>
        <div class="btn-row" style="margin-top:8px;gap:6px;flex-wrap:wrap;">
          <button class="btn ghost tiny" id="ttk-hooks">\u{1FA9D} 10 hooks 0-2s</button>
          <button class="btn ghost tiny" id="ttk-retention">\u{1F3AF} Checklist retenci\xF3n</button>
          <button class="btn ghost tiny" id="ttk-capcut">\u{1F3AC} Editar en CapCut (CU)</button>
        </div>
      </div>
      <div id="ttk-result"></div>
    </div>
    <style>
      /* Panel claro estilo referencia (recuadros blancos, bordes suaves) */
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
      .gx-seg-btn{flex:1;min-width:52px;border:0;background:transparent;color:#475067;font-size:13px;font-weight:700;padding:9px 6px;border-radius:9px;cursor:pointer;transition:all .15s;}
      .gx-seg-btn:hover{background:#E7EAF0;}
      .gx-seg-btn.on{background:#fff;color:#15181E;box-shadow:0 1px 3px rgba(16,24,40,.12);}
      /* Beats (resultado) \u2014 se mantienen en tema oscuro de la app */
      .ttk-beats{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
      .ttk-beat{display:flex;gap:12px;padding:10px;background:var(--bg-elev,#1c1c22);border:1px solid var(--border);border-radius:10px;}
      .ttk-beat-num{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#25F4EE,#FE2C55);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .ttk-beat-title{font-weight:700;font-size:13px;margin-bottom:3px;}
    </style>`;const n=["El 90% lo hace mal (y ni lo sabe)","Dej\xE1 de [error com\xFAn] ya","POV: sos [situaci\xF3n]","Esto nadie te lo dice","Perd\xED [X] para aprender esto","C\xF3mo [resultado] en [tiempo]","Si sos [nicho], parate","NO hagas [X] hasta ver esto","La verdad sobre [tema]","Mir\xE1 lo que pasa cuando [acci\xF3n]"];t.querySelector("#ttk-hooks").addEventListener("click",()=>{const a=t.querySelector("#ttk-tema").value.trim()||"tu tema";t.querySelector("#ttk-result").innerHTML=`<div class="card"><h3>\u{1FA9D} Hooks 0-2s (verbal + visual + on-screen)</h3>
      ${n.map((s,r)=>`<div class="ttk-beat"><div class="ttk-beat-num">${r+1}</div><div>
        <div class="ttk-beat-title">${i(s.replace("[tema]",a.slice(0,30)))}</div>
        <div class="small muted"><strong>Visual:</strong> pattern interrupt (zoom/corte) segundo 0 \xB7 <strong>On-screen:</strong> el hook escrito grande</div>
      </div></div>`).join("")}
      <div class="small muted" style="margin-top:10px;">M\xE1s: <code>/feedIA-tiktok-hooks</code></div></div>`,p("10 hooks listos","ok")}),t.querySelector("#ttk-retention").addEventListener("click",()=>{t.querySelector("#ttk-result").innerHTML=`<div class="card"><h3>\u{1F3AF} Checklist de retenci\xF3n (completion rate)</h3>
      <ul class="small" style="line-height:1.9;">
        <li>\u2705 Hook 0-2s: verbal + visual + on-screen text juntos</li>
        <li>\u2705 Open loop en el hook ("al final te digo\u2026")</li>
        <li>\u2705 1 idea por beat + micro-cliffhanger</li>
        <li>\u2705 Corte / pattern interrupt cada 2-4s</li>
        <li>\u2705 Ritmo creciente hacia el payoff</li>
        <li>\u2705 On-screen text que adelanta ("esper\xE1 al paso 3")</li>
        <li>\u2705 Loop de cierre: \xFAltima l\xEDnea reconecta con el hook \u2192 rewatch</li>
        <li>\u2705 Sonido trending + subt\xEDtulos (consumo sin audio)</li>
        <li>\u2705 Export limpio sin watermark (penaliza FYP)</li>
      </ul>
      <div class="small muted">Algoritmo: <code>/feedIA-tiktok-algorithm</code></div></div>`}),t.querySelector("#ttk-capcut").addEventListener("click",()=>{t.querySelector("#ttk-result").innerHTML=`<div class="card" style="border-left:3px solid #FE2C55;">
      <h3>\u{1F3AC} Editar en CapCut v\xEDa Computer Use</h3>
      <p class="small muted">FeedIA opera CapCut: importa clips \u2192 corta al ritmo \u2192 subt\xEDtulos auto \u2192 sonido trending \u2192 loop \u2192 export 1080\xD71920 limpio. Requiere CUA en <strong>Auto</strong> o <strong>Asistente</strong>.</p>
      <div class="btn-row" style="gap:8px;">
        <button class="btn primary tiny" id="ttk-capcut-go">\u25B6 Lanzar edici\xF3n CU</button>
        <a class="btn ghost tiny" href="#pantalla">\u{1F440} Pantalla en vivo</a>
      </div>
      <div class="small muted" style="margin-top:8px;">Skill: <code>/feedIA-tiktok-editing</code></div></div>`,t.querySelector("#ttk-capcut-go")?.addEventListener("click",async()=>{const{error:a}=await g("/api/cu/apps/launch",null,{method:"POST",body:{app:"capcut"}});p(a?"Backend offline \xB7 CU no disponible en demo":"\u{1F3AC} CapCut abierto \xB7 CU operando",a?"warn":"ok")})});const e=a=>t.querySelector(a)?.value??"";t.querySelector("#ttk-dur-seg")?.addEventListener("click",a=>{const s=a.target.closest(".gx-seg-btn");s&&(t.querySelectorAll("#ttk-dur-seg .gx-seg-btn").forEach(r=>r.classList.remove("on")),s.classList.add("on"),t.querySelector("#ttk-dur").value=s.dataset.v)}),t.querySelector("#ttk-go").addEventListener("click",async()=>{const a=t.querySelector("#ttk-tema").value.trim();if(!a){p("Escrib\xED un tema o idea","warn");return}const s=e("#ttk-dur"),r=e("#ttk-fmt"),v=e("#ttk-modo"),m={edad:e("#ttk-edad"),genero:e("#ttk-genero"),region:e("#ttk-region"),idioma:e("#ttk-idioma"),nivel:e("#ttk-nivel"),intereses:e("#ttk-intereses").trim()},c=t.querySelector("#ttk-result");c.innerHTML='<div class="card"><span class="spinner"></span> Armando guion\u2026</div>';const{data:o,error:b}=await g("/api/skills/tiktok/script",null,{method:"POST",body:{tema:a,duracion:Number(s),formato:r,modo:v,tono:e("#ttk-tono"),gancho:e("#ttk-gancho"),cta:e("#ttk-cta"),ritmo:e("#ttk-ritmo"),audiencia:m,plataforma:e("#ttk-plat"),subtitulos:e("#ttk-subs"),broll:e("#ttk-broll"),densidad:e("#ttk-dens"),ctaTexto:e("#ttk-ctatxt").trim(),evitar:e("#ttk-evitar").trim()}});if(b||!o){c.innerHTML=u(a,s,r,v),p("Plantilla local lista (backend offline)","info");return}o.beatsHtml?c.innerHTML=`<div class="card">${o.beatsHtml}</div>`:o.beats?c.innerHTML=`<div class="card"><h3>${i(o.title??"Guion")}</h3>${o.beats.map((d,x)=>`
        <div class="ttk-beat"><div class="ttk-beat-num">${x+1}</div><div>
          <div class="ttk-beat-title">${i(d.tipo??"")} ${d.duracion?`\xB7 ${i(String(d.duracion))}s`:""}</div>
          <div class="small"><strong>Guion:</strong> ${i(d.guion??d.vozEnOff??"")}</div>
          <div class="small muted"><strong>No verbal:</strong> ${i(d.noVerbal??"\u2014")}</div>
          <div class="small muted"><strong>On-screen:</strong> ${i(d.onScreen??d.textoEnPantalla??"")}</div>
        </div></div>`).join("")}
        ${o.caption?`<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${i(o.caption)}</div></div>`:""}
        ${o.hashtags?`<div class="small muted" style="margin-top:6px;">${i(o.hashtags)}</div>`:""}
        ${o.sonido?`<div class="small muted" style="margin-top:4px;">\u{1F3B5} ${i(o.sonido)}</div>`:""}</div>`:c.innerHTML=u(a,s,r,v),p("Guion listo \u{1F3AC}","ok")})};
