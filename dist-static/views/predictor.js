import{apiSafe as M}from"../lib/api.js";import{escape as v}from"../lib/dom.js";import{toast as $}from"../lib/toast.js";const H=({formato:e,caption:s,hashtags:i,hora:r,dia:c})=>{let a=50;const o=[],t=[],p=s.split(/\s+/).slice(0,6).join(" "),n=p.length;/^(cómo|como|por qué|porque|qué|que|cuál|cual|cuándo|cuando)/i.test(s)&&(a+=8,o.push({factor:"Pregunta inicial (alto engagement)",impacto:"positivo"})),/\b(nadie|secreto|error|nunca|verdad|honesto|deja de|pará)\b/i.test(p)&&(a+=10,o.push({factor:"Hook con curiosidad / contradicci\xF3n",impacto:"positivo"})),/^\d+/.test(s)&&(a+=6,o.push({factor:"Inicia con n\xFAmero (mayor retenci\xF3n)",impacto:"positivo"})),n<20?(a-=4,o.push({factor:"Hook muy corto",impacto:"negativo"}),t.push("Hac\xE9 el hook m\xE1s espec\xEDfico \u2014 entre 30-60 caracteres funciona mejor.")):n>80&&(a-=6,o.push({factor:"Hook largo (lectores abandonan)",impacto:"negativo"}),t.push("Acort\xE1 el hook a 5-7 palabras de impacto en la primera l\xEDnea."));const m=(s.match(/\p{Emoji}/gu)??[]).length;m===0?(a-=3,o.push({factor:"Sin emojis (reduce scroll-stop)",impacto:"negativo"}),t.push("Prob\xE1 agregar 1-2 emojis espec\xEDficos al hook para frenar el scroll.")):m>6?(a-=4,o.push({factor:"Demasiados emojis (look spammy)",impacto:"negativo"}),t.push("Reduc\xED emojis a m\xE1ximo 3-4 \u2014 m\xE1s se siente spam.")):o.push({factor:"Uso balanceado de emojis",impacto:"positivo"});const l=i.length;l===0?(a-=8,o.push({factor:"Sin hashtags",impacto:"negativo"}),t.push("Agreg\xE1 5-12 hashtags relevantes \u2014 mix de nicho espec\xEDfico + medio.")):l<5?(a-=4,o.push({factor:"Pocos hashtags",impacto:"negativo"}),t.push(`Ten\xE9s ${l} hashtags. Llevalos a 8-12 para mejor discoverability.`)):l>20?(a-=5,o.push({factor:"Demasiados hashtags (penaliza el algoritmo)",impacto:"negativo"}),t.push("IG penaliza posts con >15 hashtags. Baj\xE1 a 10-12 highly relevantes.")):(a+=5,o.push({factor:`${l} hashtags (densidad \xF3ptima)`,impacto:"positivo"}));const y=["#love","#instagood","#follow","#like","#photooftheday","#picoftheday"];i.some(u=>y.includes(u.toLowerCase()))&&(a-=5,o.push({factor:"Hashtags gen\xE9ricos detectados",impacto:"negativo"}),t.push("Sac\xE1 hashtags gen\xE9ricos (#love, #instagood, etc) \u2014 bajan la calidad percibida."));const d=e==="reel"?[12,13,18,19,20,21]:e==="historia"?[8,9,12,13,21,22]:[9,10,11,19,20,21];d.includes(r)?(a+=6,o.push({factor:`Hora ${r}:00 \u2014 ventana \xF3ptima para ${e}`,impacto:"positivo"})):r>=0&&r<=6?(a-=10,o.push({factor:"Madrugada \u2014 alcance muy bajo",impacto:"negativo"}),t.push(`Movelo a ${d[0]}-${d[d.length-1]}h. Est\xE1s publicando cuando nadie ve.`)):(a-=3,o.push({factor:"Hora sub\xF3ptima para este formato",impacto:"negativo"}),t.push(`Para ${e}, los mejores horarios son: ${d.map(u=>`${u}h`).join(", ")}.`));const j=["martes","miercoles","jueves"],S=["lunes","viernes"];j.includes(c)?(a+=4,o.push({factor:`${c} \u2014 d\xEDa de alto engagement`,impacto:"positivo"})):S.includes(c)||(a-=3,o.push({factor:`${c} \u2014 engagement t\xEDpicamente bajo`,impacto:"negativo"}),t.push("Si pod\xE9s, movelo a martes/mi\xE9rcoles/jueves \u2014 engagement promedio +18%.")),e==="reel"?(a+=4,o.push({factor:"Reel (formato favorecido por IG)",impacto:"positivo"})):e==="carrusel"&&(a+=2,o.push({factor:"Carrusel (alto save rate)",impacto:"positivo"})),!/\?$/.test(s)&&a<75&&t.push("Cerr\xE1 el caption con una pregunta abierta \u2192 dispara comentarios."),!/(guardá|guarda|comentá|comenta|compart|etiquet)/i.test(s)&&a<80&&t.push('Agreg\xE1 un CTA expl\xEDcito ("guard\xE1", "etiquet\xE1 a alguien", "coment\xE1 X").'),l<12&&e==="reel"&&t.push("Para reel virales: us\xE1 10-15 hashtags mix nicho + tendencia actual."),a=Math.max(0,Math.min(100,a));const f=e==="reel"?8e3:e==="carrusel"?3500:2200,w={alcance:Math.round(f*(a/50)),impresiones:Math.round(f*(a/50)*1.4),engagementRate:+(2+a/100*8).toFixed(1),saves:Math.round(f*(a/50)*.04),shares:Math.round(f*(a/50)*.02)},k=d.slice(0,3).map(u=>({dia:c,hora:`${u}:00`,score:Math.min(95,a+(d.includes(r)?5:12))}));return{scoreGlobal:a,scoreViralidad:Math.max(0,Math.min(100,a-5+(e==="reel"?10:0))),resumen:a>=75?"\u{1F680} Potencial viral alto. Publicalo ya.":a>=50?"\u2705 Bueno, pero hay margen para mejorar antes de publicar.":"\u26A0\uFE0F Necesita trabajo antes de publicar. Aplic\xE1 las recomendaciones.",metricas:w,factores:o,recomendaciones:t,ventanaOptima:k,simulated:!0}};let h={result:null};const P=["carrusel","reel","historia","foto","video"],q=Array.from({length:24},(e,s)=>s),L=()=>`
  <div class="studio-form">
    <h3>Predictor de Performance</h3>
    <p class="small muted" style="margin-bottom:16px;">Us\xE1 IA + tu historial para predecir el alcance y engagement antes de publicar.</p>

    <div class="field">
      <label class="field-label">Tipo de contenido</label>
      <select class="field-select" id="formato">
        ${P.map(e=>`<option value="${e}">${e.charAt(0).toUpperCase()+e.slice(1)}</option>`).join("")}
      </select>
    </div>

    <div class="field">
      <label class="field-label">Caption (primeras palabras)</label>
      <textarea class="field-textarea" id="caption" rows="3" placeholder="ej: Lo que nadie te dice sobre crecer en Instagram\u2026"></textarea>
    </div>

    <div class="field">
      <label class="field-label">Hashtags (uno por l\xEDnea)</label>
      <textarea class="field-textarea" id="hashtags" rows="3" placeholder="#marketing
#IA
#instagram"></textarea>
    </div>

    <div class="field">
      <label class="field-label">Hora de publicaci\xF3n</label>
      <select class="field-select" id="hora">
        ${q.map(e=>{const s=`${String(e).padStart(2,"0")}:00`;return`<option value="${e}"${e===19?" selected":""}>${s}</option>`}).join("")}
      </select>
    </div>

    <div class="field">
      <label class="field-label">D\xEDa de la semana</label>
      <select class="field-select" id="dia">
        <option value="lunes">Lunes</option>
        <option value="martes">Martes</option>
        <option value="miercoles">Mi\xE9rcoles</option>
        <option value="jueves">Jueves</option>
        <option value="viernes" selected>Viernes</option>
        <option value="sabado">S\xE1bado</option>
        <option value="domingo">Domingo</option>
      </select>
    </div>

    <div class="btn-row">
      <button class="btn primary" id="predict-btn">\u{1F3AF} Predecir</button>
    </div>
  </div>`,b=e=>e>=75?"var(--ok)":e>=50?"var(--warn)":"var(--crit)",R=e=>e>=75?"Alto potencial":e>=50?"Potencial medio":"Bajo potencial",g=(e,s,i,r="")=>`
  <div class="gauge-row">
    <span class="small muted" style="min-width:120px;">${e}</span>
    <div class="gauge-bar">
      <div class="gauge-fill" style="width:${Math.min(100,s/i*100)}%;background:${b(s/i*100)};"></div>
    </div>
    <span class="small">${typeof s=="number"?s.toLocaleString():s}${r}</span>
  </div>`,x=()=>{if(!h.result)return`
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:520px;flex-direction:column;gap:12px;">
        <div style="font-size:56px;opacity:0.3;">\u{1F3AF}</div>
        <div class="muted">Complet\xE1 el formulario y dale "Predecir" para ver el an\xE1lisis ac\xE1.</div>
      </div>`;const e=h.result,s=e.scoreGlobal??0;return`
    <div>
      <!-- Score principal -->
      <div class="card predictor-score-card" style="margin-bottom:16px;text-align:center;">
        <div class="score-ring" style="--score:${s};--color:${b(s)};">
          <svg viewBox="0 0 120 120" class="score-svg">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="${b(s)}" stroke-width="10"
              stroke-dasharray="${Math.round(s*3.267)} 326.7"
              stroke-linecap="round" transform="rotate(-90 60 60)"/>
          </svg>
          <div class="score-center">
            <div class="score-num">${s}</div>
            <div class="tiny muted">/ 100</div>
          </div>
        </div>
        <div class="score-label" style="color:${b(s)};margin-top:8px;font-weight:600;">${R(s)}</div>
        <div class="small muted" style="margin-top:4px;">${v(e.resumen??"")}</div>
      </div>

      <!-- M\xE9tricas estimadas -->
      <div class="card" style="margin-bottom:14px;">
        <h3>\u{1F4CA} M\xE9tricas estimadas</h3>
        ${g("Alcance",e.metricas?.alcance??0,(e.metricas?.alcance??100)*2)}
        ${g("Impresiones",e.metricas?.impresiones??0,(e.metricas?.impresiones??100)*2)}
        ${g("Engagement",e.metricas?.engagementRate??0,10,"%")}
        ${g("Saves",e.metricas?.saves??0,(e.metricas?.saves??10)*2)}
        ${g("Shares",e.metricas?.shares??0,(e.metricas?.shares??5)*2)}
      </div>

      <!-- Ventanas de tiempo -->
      ${e.ventanaOptima?`
        <div class="card" style="margin-bottom:14px;">
          <h3>\u23F0 Ventana \xF3ptima</h3>
          <div class="time-grid">
            ${(e.ventanaOptima??[]).map(i=>`
              <div class="time-chip ${i.score>=70?"hot":""}">
                <div class="small">${v(i.dia)}</div>
                <div class="body" style="font-weight:600;">${v(i.hora)}</div>
                <div class="tiny muted">${i.score}%</div>
              </div>`).join("")}
          </div>
        </div>`:""}

      <!-- Factores -->
      <div class="card" style="margin-bottom:14px;">
        <h3>\u{1F52C} Factores analizados</h3>
        ${(e.factores??[]).map(i=>`
          <div class="factor-row">
            <span class="tag ${i.impacto==="positivo"?"ok":i.impacto==="negativo"?"crit":"warn"}">${i.impacto==="positivo"?"\u2191":i.impacto==="negativo"?"\u2193":"\u2192"}</span>
            <span class="small">${v(i.factor)}</span>
          </div>`).join("")}
      </div>

      <!-- Recomendaciones -->
      ${e.recomendaciones?.length?`
        <div class="card">
          <h3>\u{1F4A1} Recomendaciones</h3>
          <ul class="reco-list">
            ${e.recomendaciones.map(i=>`<li class="small">${v(i)}</li>`).join("")}
          </ul>
        </div>`:""}
    </div>`},A=e=>{const s=e.querySelector(".studio-form"),i=e.querySelector(".studio-preview");s.querySelector("#predict-btn").addEventListener("click",async()=>{const r=s.querySelector("#formato").value,c=s.querySelector("#caption").value.trim(),a=s.querySelector("#hashtags").value.trim(),o=a?a.split(`
`).map(y=>y.trim()).filter(Boolean):[],t=Number(s.querySelector("#hora").value),p=s.querySelector("#dia").value;if(!c){$("Escrib\xED algo del caption","crit");return}const n=s.querySelector("#predict-btn");n.disabled=!0,n.innerHTML='<span class="spinner"></span> prediciendo\u2026';const{data:m,error:l}=await M("/api/studio/predictor",null,{method:"POST",body:{formato:r,caption:c,hashtags:o,hora:t,dia:p}});l||!m?(h.result=H({formato:r,caption:c,hashtags:o,hora:t,dia:p}),i.innerHTML=x(),$("\u{1F9E0} Predicci\xF3n local lista (backend offline)","info")):(h.result=m,i.innerHTML=x(),$("Predicci\xF3n lista","ok")),n.disabled=!1,n.innerHTML="\u{1F3AF} Predecir"})};export const renderPredictor=async e=>{h={result:null},e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Predictor de Performance</h1>
        <p class="view-subtitle page-subtitle">Estim\xE1 el alcance y engagement de tu pr\xF3ximo post antes de publicarlo.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="studio-layout">
        ${L()}
        <div class="studio-preview">${x()}</div>
      </div>
    </div>`,A(e)};
