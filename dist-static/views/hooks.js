import{api as h,apiSafe as w}from"../lib/api.js";import{escape as s}from"../lib/dom.js";import{toast as p}from"../lib/toast.js";import{loadingScreen as E,withBtnSpinner as k}from"../lib/ui.js";const L=async(a,e)=>{const{data:o}=await w(a,null,e);return o},q=(a,e)=>{if(!e)return[];const o=e;return[o.replace(/^/,"\u{1F6A8} ").replace(/\./,". Ya."),o.replace(/\b(el|la|los|las)\b/i,"tu").replace(/\bnadie\b/i,"el 90%"),o.replace(/(\d+)/,t=>String(Math.round(Number(t)*1.7))).replace(/^/,"\u26A0\uFE0F ")].slice(0,3)},T={educativo:"\u{1F4DA} Educativo",controversial:"\u{1F525} Controversial",storytelling:"\u{1F4D6} Storytelling",entretenimiento:"\u{1F602} Entretenimiento",transformacion:"\u{1F680} Transformaci\xF3n",lista:"\u{1F4CB} Lista","pregunta-abierta":"\u2753 Pregunta abierta",revelacion:"\u{1F513} Revelaci\xF3n",comparacion:"\u2696\uFE0F Comparaci\xF3n",callout:"\u{1F4E2} Callout"};let l="browser",g=null,m=[];const f=()=>{try{return new Set(JSON.parse(localStorage.getItem("feedia.hooks.favs")??"[]"))}catch{return new Set}},C=a=>{const e=f();e.has(a)?e.delete(a):e.add(a);try{localStorage.setItem("feedia.hooks.favs",JSON.stringify([...e]))}catch{}return e.has(a)},P=a=>{const e=f().has(a.id);return`
  <div class="card hook-pattern-card" data-id="${s(a.id)}" data-example="${s(a.example)}" data-skel="${s(a.skeleton)}">
    <div class="meta">
      <span class="tag accent tiny">${s(a.category)}</span>
      <span class="tag tiny">${s(a.primaryTrigger)}</span>
      <span class="tag info tiny">score ${a.baselineScore}</span>
      <button class="hook-fav-btn ${e?"on":""}" data-fav="${s(a.id)}" title="${e?"Quitar de favoritos":"Guardar como favorito"}">${e?"\u2B50":"\u2606"}</button>
    </div>
    <h3 style="margin:6px 0 4px;">${s(a.name)}</h3>
    <div class="small" style="font-family:'SF Mono','Fira Code',monospace;background:var(--bg-card-2,#1c1c22);padding:8px 10px;border-radius:6px;margin:6px 0;">${s(a.skeleton)}</div>
    <div class="small muted"><strong>Por qu\xE9 funciona:</strong> ${s(a.whyItWorks)}</div>
    <div class="small" style="margin-top:6px;"><strong>Ejemplo:</strong> <em>${s(a.example)}</em></div>
    <div class="meta" style="margin-top:8px;">
      ${a.bestFormats.map(o=>`<span class="tag tiny">${s(o)}</span>`).join("")}
    </div>
    <div class="btn-row" style="margin-top:10px;gap:6px;">
      <button class="btn ghost tiny" data-copy="${s(a.example)}" title="Copiar ejemplo al portapapeles">\u{1F4CB} Copiar</button>
      <button class="btn ghost tiny" data-vary="${s(a.id)}" title="Generar 3 variantes con IA">\u{1F3B2} Variar</button>
      <button class="btn primary tiny" data-use="${s(a.id)}" data-text="${s(a.example)}" title="Usar en una pieza nueva (carrusel/reel/story)">\u26A1 Usar</button>
    </div>
  </div>`},M=()=>{const a=[...new Set(m.map(r=>r.category))],e=f(),o=g==="__favs",t=o?m.filter(r=>e.has(r.id)):g?m.filter(r=>r.category===g):m;return`
    <div class="hook-category-filter">
      <button class="tab-btn ${g?"":"active"}" data-cat="">Todos (${m.length})</button>
      <button class="tab-btn ${o?"active":""}" data-cat="__favs">\u2B50 Favoritos (${e.size})</button>
      ${a.map(r=>`
        <button class="tab-btn ${g===r?"active":""}" data-cat="${s(r)}">
          ${s(T[r]??r)}
        </button>`).join("")}
    </div>
    ${t.length===0?`<div class="card" style="text-align:center;padding:30px;"><div class="muted">${o?"No ten\xE9s favoritos todav\xEDa. Toc\xE1 \u2606 en cualquier patr\xF3n para guardarlo.":"Sin patrones en esta categor\xEDa."}</div></div>`:`<div class="page-grid">${t.map(P).join("")}</div>`}`},H=a=>{const e=a.band==="excelente"||a.band==="fuerte"?"ok":a.band==="aceptable"?"info":"crit";return`
    <div class="card score-result-card">
      <div class="score-result-head">
        <div>
          <div class="score-result-num">${a.total}</div>
          <span class="tag ${e}">${s(a.band)}</span>
        </div>
        ${a.matchedPattern?`
          <div class="score-result-pattern">
            <div class="tiny muted">Patr\xF3n detectado</div>
            <div class="small"><strong>${s(a.matchedPattern.name)}</strong></div>
            <div class="tiny muted">${s(a.matchedPattern.category)}</div>
          </div>`:'<div class="small muted">Sin patr\xF3n claro detectado</div>'}
      </div>

      <div class="score-signals">
        ${Object.entries(a.signals).map(([o,t])=>`
          <span class="score-signal ${t?"on":"off"}">${t?"\u2713":"\xB7"} ${s(o)}</span>
        `).join("")}
      </div>

      ${a.penalties.length?`
        <div style="margin-top:12px;">
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Penalizaciones</div>
          <ul class="small">${a.penalties.map(o=>`<li>${s(o)}</li>`).join("")}</ul>
        </div>`:""}

      ${a.recommendations.length?`
        <div style="margin-top:8px;">
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Recomendaciones</div>
          <ul class="small">${a.recommendations.map(o=>`<li>${s(o)}</li>`).join("")}</ul>
        </div>`:""}
    </div>`},A=()=>`
  <div class="card">
    <h3 style="margin:0 0 8px;">\u{1F4D0} Scorer determin\xEDstico</h3>
    <p class="small muted" style="margin:0 0 14px;">Mide la fuerza de tu hook contra los 23 patrones del library. Sub-ms, sin LLM.</p>
    <div class="field">
      <label class="field-label">Hook a evaluar</label>
      <textarea class="field-textarea" id="score-input" rows="3" placeholder="Ej: El 87% de las marcas comete este error en los primeros 90 d\xEDas"></textarea>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="score-btn">Calcular score</button>
    </div>
    <div id="score-result"></div>
  </div>`,z=()=>`
  <div class="card">
    <h3 style="margin:0 0 8px;">\u26A1 Generar hooks con patrones probados</h3>
    <p class="small muted" style="margin:0 0 14px;">Eleg\xED 3 patrones \xF3ptimos para tu idea, los instancia con voz de marca y los scorea.</p>
    <div class="field">
      <label class="field-label">Idea o tema</label>
      <textarea class="field-textarea" id="gen-input" rows="3" placeholder="Ej: c\xF3mo cobrar m\xE1s sin perder clientes"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Formato (opcional)</label>
      <select class="field-select" id="gen-format">
        <option value="">\u2014 cualquiera \u2014</option>
        <option value="reel">Reel</option>
        <option value="carrusel">Carrusel</option>
        <option value="post-imagen">Post imagen</option>
        <option value="historia">Historia</option>
      </select>
    </div>
    <div class="btn-row">
      <button class="btn gradient" id="gen-btn">\u26A1 Generar 3 hooks</button>
    </div>
    <div id="gen-result"></div>
  </div>`,x=[{cat:"apertura",emoji:"\u{1F44B}",titulo:"Mirada directa a c\xE1mara",desc:"Plano cerrado, ojos a lente. Conexi\xF3n humana inmediata (+3-5% retention en los 3s)."},{cat:"apertura",emoji:"\u270B",titulo:"Pattern interrupt",desc:"Empez\xE1 con un gesto inesperado (tapate la boca, grit\xE1 bajo, mostr\xE1 objeto raro). Rompe el scroll."},{cat:"apertura",emoji:"\u{1F3A8}",titulo:"Texto BIG en pantalla",desc:"Una sola palabra/frase enorme (PAR\xC1 / NO / OJO) los primeros 1.5s. Funciona sin audio."},{cat:"apertura",emoji:"\u{1F504}",titulo:"Antes/Despu\xE9s en 2s",desc:"Split screen o cut r\xE1pido: estado A \u2192 estado B. Promesa visual de transformaci\xF3n."},{cat:"desarrollo",emoji:"\u{1F4CA}",titulo:"Gr\xE1fico que se dibuja solo",desc:'Una m\xE9trica subiendo en vivo (overlay), ancla el "vale la pena seguir mirando".'},{cat:"desarrollo",emoji:"\u{1F58D}\uFE0F",titulo:"Anotaci\xF3n a mano alzada",desc:"Subrayados/flechas hechos a mano sobre la imagen. Sensaci\xF3n de demo personal."},{cat:"desarrollo",emoji:"\u{1F39E}\uFE0F",titulo:"Jump cuts cada 1.5s",desc:"Cortes secos sin transici\xF3n \u2192 ritmo. Ideal para listas o consejos r\xE1pidos."},{cat:"retencion",emoji:"\u{1F501}",titulo:"Loop perfecto",desc:"\xDAltimo frame matchea al primero \u2192 el viewer no nota el corte y mira 2x."},{cat:"retencion",emoji:"\u{1F910}",titulo:"Reveal pendiente",desc:'Mostr\xE1 el resultado tapado/blureado al inicio: "esto es lo que vamos a hacer".'},{cat:"retencion",emoji:"\u{1F3AF}",titulo:"Caption interactivo",desc:'Texto en pantalla que invita a pausar y leer ("paus\xE1 si te pasa esto").'},{cat:"cta",emoji:"\u{1F447}",titulo:"Flecha al swipe-up/comments",desc:"Flecha animada al final apuntando a la siguiente acci\xF3n esperada."},{cat:"cta",emoji:"\u{1F4AC}",titulo:"Pregunta directa cierre",desc:"\xDAltima frame: pregunta concreta para forzar comentario."}],y=[{cat:"curiosidad",emoji:"\u2753",plantilla:"Lo que nadie te dice sobre [X]",ejemplo:"Lo que nadie te dice sobre crecer en Instagram en 2026"},{cat:"curiosidad",emoji:"\u{1F575}\uFE0F",plantilla:"El error #1 al [hacer X]",ejemplo:"El error #1 al automatizar tu Instagram (y c\xF3mo evitarlo)"},{cat:"curiosidad",emoji:"\u{1F381}",plantilla:"Lo que descubr\xED despu\xE9s de [N] [unidades]",ejemplo:"Lo que descubr\xED despu\xE9s de 100 carruseles publicados"},{cat:"contraste",emoji:"\u2696\uFE0F",plantilla:"No es [X], es [Y]",ejemplo:"No es contenido, es distribuci\xF3n"},{cat:"contraste",emoji:"\u{1F503}",plantilla:"Par\xE1 de [X]. Empez\xE1 a [Y]",ejemplo:"Par\xE1 de publicar todos los d\xEDas. Empez\xE1 a iterar."},{cat:"contraste",emoji:"\u{1FA9E}",plantilla:"Pens\xE1s que es [X], en realidad es [Y]",ejemplo:"Pens\xE1s que falta talento, en realidad falta sistema"},{cat:"autoridad",emoji:"\u{1F4DA}",plantilla:"[N] cosas que aprend\xED [haciendo X]",ejemplo:"5 cosas que aprend\xED gestionando 12 cuentas a la vez"},{cat:"autoridad",emoji:"\u{1F9E0}",plantilla:"C\xF3mo [meta] sin [obst\xE1culo]",ejemplo:"C\xF3mo crecer en IG sin postear todos los d\xEDas"},{cat:"autoridad",emoji:"\u2699\uFE0F",plantilla:"Mi sistema para [X] en [Y]",ejemplo:"Mi sistema para escribir 30 captions en 1 hora"},{cat:"urgencia",emoji:"\u23F0",plantilla:"Antes de [hacer X], le\xE9 esto",ejemplo:"Antes de invertir en ads, le\xE9 esto"},{cat:"urgencia",emoji:"\u{1F6A8}",plantilla:"[X] cambi\xF3. Esto es lo que ten\xE9s que saber",ejemplo:"El algoritmo cambi\xF3. Esto es lo que ten\xE9s que saber"},{cat:"social",emoji:"\u{1F465}",plantilla:"[N] personas hicieron [X]. Esto fue lo que pas\xF3",ejemplo:"50 marcas usaron este formato. Esto fue lo que pas\xF3"}],N=()=>{const a=[...new Set(x.map(e=>e.cat))];return`
    <div class="card">
      <div class="row spread"><b>\u{1F3AC} Ganchos visuales</b><span class="tiny muted">${x.length} patrones \xB7 listos para usar en Reels/Carruseles</span></div>
      <div class="meta" style="margin-top:10px;">
        ${a.map(e=>`<span class="tag accent tiny">${s(e)}</span>`).join("")}
      </div>
      <div class="hl-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:14px;">
        ${x.map(e=>`
          <div class="hl-card" style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:12px;">
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="font-size:18px;">${e.emoji}</span>
              <b class="small">${s(e.titulo)}</b>
            </div>
            <div class="tiny muted" style="margin-top:6px;line-height:1.5;">${s(e.desc)}</div>
            <div class="meta" style="margin-top:8px;"><span class="tag tiny">${s(e.cat)}</span></div>
          </div>`).join("")}
      </div>
    </div>`},I=()=>{const a=[...new Set(y.map(e=>e.cat))];return`
    <div class="card">
      <div class="row spread"><b>\u{1F4F0} T\xEDtulos gancho</b><span class="tiny muted">${y.length} plantillas \xB7 click en \u2702 para copiar el ejemplo</span></div>
      <div class="meta" style="margin-top:10px;">
        ${a.map(e=>`<span class="tag accent tiny">${s(e)}</span>`).join("")}
      </div>
      <div class="hl-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-top:14px;">
        ${y.map((e,o)=>`
          <div class="hl-card" style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:12px;">
            <div style="display:flex;gap:8px;align-items:flex-start;">
              <span style="font-size:16px;">${e.emoji}</span>
              <div style="flex:1;">
                <div class="small" style="font-weight:700;font-family:ui-monospace,monospace;">${s(e.plantilla)}</div>
                <div class="tiny muted" style="margin-top:4px;font-style:italic;">"${s(e.ejemplo)}"</div>
              </div>
              <button class="btn ghost tiny th-copy" data-i="${o}" title="Copiar ejemplo">\u2702</button>
            </div>
            <div class="meta" style="margin-top:8px;"><span class="tag tiny">${s(e.cat)}</span></div>
          </div>`).join("")}
      </div>
    </div>`},$=a=>{const e=a.querySelector("#hook-content");e&&(l==="browser"?e.innerHTML=M():l==="score"?e.innerHTML=A():l==="generate"?e.innerHTML=z():l==="visuals"?e.innerHTML=N():l==="titles"&&(e.innerHTML=I(),e.querySelectorAll(".th-copy").forEach(o=>o.addEventListener("click",async t=>{const r=Number(t.currentTarget.dataset.i),n=y[r];if(n)try{await navigator.clipboard.writeText(n.ejemplo),p("Copiado: "+n.ejemplo,"ok")}catch{p("No se pudo copiar","warn")}}))),O(a))},O=a=>{a.querySelectorAll("[data-cat]").forEach(t=>{t.addEventListener("click",()=>{g=t.dataset.cat||null,$(a)})}),a.querySelectorAll("[data-fav]").forEach(t=>{t.addEventListener("click",r=>{r.stopPropagation();const n=t.dataset.fav,i=C(n);t.classList.toggle("on",i),t.textContent=i?"\u2B50":"\u2606",t.title=i?"Quitar de favoritos":"Guardar como favorito"})}),a.querySelectorAll("[data-copy]").forEach(t=>{t.addEventListener("click",async r=>{r.stopPropagation();try{await navigator.clipboard.writeText(t.dataset.copy);const n=t.innerHTML;t.innerHTML="\u2713 Copiado",setTimeout(()=>{t.innerHTML=n},1100)}catch{p("No se pudo copiar","warn")}})}),a.querySelectorAll("[data-vary]").forEach(t=>{t.addEventListener("click",async r=>{r.stopPropagation();const n=t.closest(".hook-pattern-card"),i=n?.dataset.example??"",u=t.dataset.vary,c=m.find(d=>d.id===u);t.disabled=!0,t.innerHTML="\u23F3";const b=await L("/api/hooks/vary",{method:"POST",body:{hookId:u,example:i}});t.disabled=!1,t.innerHTML="\u{1F3B2} Variar";const S=b?.variants??q(c,i),v=document.createElement("div");v.className="hook-variants-pop",v.innerHTML=`
        <div class="hook-variants-head">3 variantes del patr\xF3n "${s(c?.name??"hook")}"</div>
        ${S.map((d,j)=>`
          <div class="hook-variant-row">
            <div class="hook-variant-text">${s(d)}</div>
            <button class="btn ghost tiny" data-copy-variant="${s(d)}">\u{1F4CB}</button>
          </div>`).join("")}
        <button class="btn ghost tiny" data-close-variants style="margin-top:8px;width:100%;">Cerrar</button>`,n.appendChild(v),v.querySelectorAll("[data-copy-variant]").forEach(d=>{d.addEventListener("click",async j=>{j.stopPropagation();try{await navigator.clipboard.writeText(d.dataset.copyVariant),d.textContent="\u2713"}catch{}})}),v.querySelector("[data-close-variants]").addEventListener("click",()=>v.remove())})}),a.querySelectorAll("[data-use]").forEach(t=>{t.addEventListener("click",r=>{r.stopPropagation();const n=t.dataset.text;try{sessionStorage.setItem("feedia.hook.preload",n)}catch{}const i=document.createElement("div");i.className="hook-use-modal",i.innerHTML=`
        <div class="hook-use-backdrop"></div>
        <div class="hook-use-card">
          <h3>\xBFD\xF3nde us\xE1s este hook?</h3>
          <p class="small muted">Te llevo al Studio con el hook precargado.</p>
          <div class="btn-row" style="gap:6px;justify-content:center;flex-wrap:wrap;">
            <button class="btn primary" data-go="studio-carousel">\u{1F3A0} Carrusel</button>
            <button class="btn primary" data-go="studio-reel">\u25B6\uFE0F Reel</button>
            <button class="btn primary" data-go="studio-stories">\u25CE Story</button>
            <button class="btn ghost" data-close-modal>Cancelar</button>
          </div>
        </div>`,document.body.appendChild(i),i.querySelector(".hook-use-backdrop").addEventListener("click",()=>i.remove()),i.querySelector("[data-close-modal]").addEventListener("click",()=>i.remove()),i.querySelectorAll("[data-go]").forEach(u=>{u.addEventListener("click",()=>{i.remove(),window.location.hash=`#${u.dataset.go}`})})})});const e=a.querySelector("#score-btn");e&&e.addEventListener("click",async t=>{const r=a.querySelector("#score-input");if(!r?.value.trim()){p("Peg\xE1 un hook para scorear","warn");return}await k(t.currentTarget,"calculando\u2026",async()=>{try{const n=await h("/api/hooks/score",{method:"POST",body:{hook:r.value.trim()}});a.querySelector("#score-result").innerHTML=H(n)}catch(n){p("Error: "+n.message,"crit")}})});const o=a.querySelector("#gen-btn");o&&o.addEventListener("click",async t=>{const r=a.querySelector("#gen-input")?.value.trim(),n=a.querySelector("#gen-format")?.value;if(!r){p("Escrib\xED una idea","warn");return}await k(t.currentTarget,"generando\u2026",async()=>{try{const u=`
            <div style="margin-top:14px;">
              <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">3 hooks generados, rankeados por score</div>
              ${((await h("/api/hooks/generate",{method:"POST",body:{idea:r,format:n||void 0}})).hooks??[]).map((c,b)=>`
                <div class="card" style="margin-bottom:10px;${b===0?"border-color:var(--accent);":""}">
                  <div class="meta">
                    <span class="tag ${b===0?"accent":""} tiny">#${b+1}</span>
                    <span class="tag info tiny">${s(c.patternName)}</span>
                    <span class="tag ${c.score.band==="excelente"||c.score.band==="fuerte"?"ok":"warn"} tiny">${c.score.total}/100 \xB7 ${s(c.score.band)}</span>
                  </div>
                  <div style="font-size:15px;font-weight:600;margin-top:8px;">${s(c.text)}</div>
                </div>`).join("")}
            </div>`;a.querySelector("#gen-result").innerHTML=u}catch(i){p("Error: "+i.message,"crit")}})})};export const renderHooks=async a=>{a.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F3A3} Hook Library</h1>
        <p class="view-subtitle page-subtitle">Biblioteca curada de patrones de hooks virales \xB7 scorer determin\xEDstico \xB7 generador con voz de marca.</p>
      </div>
    </header>
    <div class="page-toolbar">
      <div class="page-toolbar-tabs">
        <button class="tool-tab-btn ${l==="browser"?"active":""}" data-tab="browser">\u{1F4DA} Librer\xEDa</button>
        <button class="tool-tab-btn ${l==="visuals"?"active":""}" data-tab="visuals">\u{1F3AC} Visuales</button>
        <button class="tool-tab-btn ${l==="titles"?"active":""}" data-tab="titles">\u{1F4F0} T\xEDtulos</button>
        <button class="tool-tab-btn ${l==="score"?"active":""}" data-tab="score">\u{1F4D0} Scorer</button>
        <button class="tool-tab-btn ${l==="generate"?"active":""}" data-tab="generate">\u26A1 Generador</button>
      </div>
    </div>
    <div id="hook-content" class="page-body">${E()}</div>`;try{m=(await h("/api/hooks/patterns")).patterns??[]}catch(e){p("Error cargando librer\xEDa: "+e.message,"crit");return}$(a),a.querySelectorAll(".tool-tab-btn").forEach(e=>{e.addEventListener("click",()=>{l=e.dataset.tab,a.querySelectorAll(".tool-tab-btn").forEach(o=>o.classList.toggle("active",o===e)),$(a)})})};
