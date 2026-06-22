import{api as P}from"../lib/api.js";import{escape as v}from"../lib/dom.js";import{toast as p}from"../lib/toast.js";let i={result:null,imagePreview:null,mode:"upload"};const j=()=>`
  <div class="tab-bar">
    <button class="tab-btn ${i.mode==="upload"?"active":""}" data-mode="upload">\u{1F4CE} Subir imagen</button>
    <button class="tab-btn ${i.mode==="camera"?"active":""}" data-mode="camera">\u{1F4F7} C\xE1mara</button>
    <button class="tab-btn ${i.mode==="url"?"active":""}" data-mode="url">\u{1F517} URL</button>
  </div>`,k=()=>`
  <div class="studio-form">
    <h3>Vision AI</h3>
    <p class="small muted" style="margin-bottom:16px;">Us\xE1 Claude multimodal para analizar im\xE1genes, generar captions y alt text con la voz de tu marca.</p>
    ${j()}
    <div id="input-area" style="margin-top:14px;">
      ${i.mode==="upload"?`
        <div class="field">
          <label class="field-label">Imagen</label>
          <div class="upload-zone" id="upload-zone">
            <div class="upload-icon">\u{1F5BC}\uFE0F</div>
            <div class="small muted">Arrastr\xE1 o hac\xE9 click para subir</div>
            <input type="file" id="file-input" accept="image/*" style="display:none;"/>
          </div>
          <div id="image-preview-wrap" style="display:none;margin-top:8px;">
            <img id="image-preview-img" style="max-width:100%;border-radius:8px;border:1px solid var(--border);"/>
          </div>
        </div>`:i.mode==="camera"?`
        <div class="field">
          <label class="field-label">\u{1F4F7} C\xE1mara en vivo</label>
          <div id="camera-wrap" style="position:relative;border-radius:12px;overflow:hidden;background:#000;min-height:240px;display:flex;align-items:center;justify-content:center;">
            <video id="camera-video" autoplay playsinline muted style="width:100%;display:none;border-radius:12px;"></video>
            <canvas id="camera-canvas" style="display:none;"></canvas>
            <div id="camera-placeholder" style="text-align:center;padding:30px;">
              <div style="font-size:48px;opacity:.5;">\u{1F4F7}</div>
              <div class="small muted" style="margin-top:8px;">Presion\xE1 "Activar c\xE1mara" para empezar</div>
            </div>
            <img id="camera-snapshot" style="display:none;width:100%;border-radius:12px;"/>
          </div>
          <div class="btn-row" style="margin-top:10px;gap:6px;flex-wrap:wrap;">
            <button class="btn" id="camera-start">\u{1F4F7} Activar c\xE1mara</button>
            <button class="btn primary" id="camera-capture" disabled>\u{1F4F8} Tomar foto</button>
            <button class="btn ghost" id="camera-retake" style="display:none;">\u21BB Repetir</button>
            <button class="btn ghost" id="camera-switch" disabled title="Cambiar entre c\xE1mara frontal/trasera">\u{1F504}</button>
          </div>
          <div class="small muted" style="margin-top:6px;">\u26A0\uFE0F Necesita permisos de c\xE1mara del navegador.</div>
        </div>`:`
        <div class="field">
          <label class="field-label">URL de la imagen</label>
          <input class="field-input" type="url" id="img-url" placeholder="https://..."/>
        </div>`}
    </div>
    <div class="field">
      <label class="field-label">An\xE1lisis a realizar</label>
      <div class="checkbox-group" id="analysis-opts">
        <label class="checkbox-label"><input type="checkbox" value="analisis" checked/> An\xE1lisis visual completo</label>
        <label class="checkbox-label"><input type="checkbox" value="caption" checked/> Caption para Instagram</label>
        <label class="checkbox-label"><input type="checkbox" value="altText" checked/> Alt text accesible</label>
        <label class="checkbox-label"><input type="checkbox" value="hashtags"/> Hashtags sugeridos</label>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="analyze-btn">\u{1F50D} Analizar</button>
    </div>
  </div>`,A=()=>{if(!i.result)return`
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:500px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">\u{1F441}</div>
        <div class="muted">Sub\xED una imagen para ver el an\xE1lisis de Claude Vision ac\xE1.</div>
      </div>`;const e=i.result;return`
    <div>
      ${i.imagePreview?`
        <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden;">
          <img src="${i.imagePreview}" style="width:100%;max-height:320px;object-fit:cover;display:block;border-radius:12px;"/>
        </div>`:""}

      ${e.analisis?`
        <div class="card" style="margin-bottom:14px;">
          <h3>\u{1F50D} An\xE1lisis visual</h3>
          <div class="body">${v(e.analisis.descripcion??"")}</div>
          ${e.analisis.elementosDestacados?.length?`
            <div class="divider"></div>
            <div class="small muted" style="margin-bottom:6px;">Elementos destacados</div>
            <div class="tag-row">${e.analisis.elementosDestacados.map(l=>`<span class="tag">${v(l)}</span>`).join("")}</div>
          `:""}
          ${e.analisis.paleta?.length?`
            <div class="palette-row" style="margin-top:10px;display:flex;gap:6px;">
              ${e.analisis.paleta.map(l=>`<div class="color-swatch" style="background:${v(l)};width:28px;height:28px;border-radius:6px;border:1px solid var(--border);" title="${v(l)}"></div>`).join("")}
            </div>
          `:""}
          ${e.analisis.puntuacionCalidad?`
            <div class="divider"></div>
            <div class="gauge-row">
              <span class="small muted">Calidad estimada</span>
              <div class="gauge-bar"><div class="gauge-fill" style="width:${e.analisis.puntuacionCalidad}%;background:var(--ok);"></div></div>
              <span class="small">${e.analisis.puntuacionCalidad}/100</span>
            </div>
          `:""}
        </div>`:""}

      ${e.caption?`
        <div class="card" style="margin-bottom:14px;">
          <h3>\u{1F4DD} Caption</h3>
          <div class="body" style="white-space:pre-wrap;">${v(e.caption.texto)}</div>
          ${e.caption.hashtags?.length?`
            <div class="divider"></div>
            <div class="meta">${e.caption.hashtags.map(l=>`<span class="tag info">${v(l)}</span>`).join("")}</div>
          `:""}
          <div class="btn-row" style="margin-top:10px;">
            <button class="btn ghost tiny" id="copy-caption">\u{1F4CB} Copiar caption</button>
          </div>
        </div>`:""}

      ${e.altText?`
        <div class="card" style="margin-bottom:14px;">
          <h3>\u267F Alt text</h3>
          <div class="body">${v(e.altText)}</div>
          <div class="btn-row" style="margin-top:10px;">
            <button class="btn ghost tiny" id="copy-alt">\u{1F4CB} Copiar alt text</button>
          </div>
        </div>`:""}

      ${e.hashtags?.length?`
        <div class="card">
          <h3>#\uFE0F\u20E3 Hashtags</h3>
          <div class="meta">${e.hashtags.map(l=>`<span class="tag info">${v(l)}</span>`).join("")}</div>
        </div>`:""}
    </div>`},D=e=>{const l=e.querySelector(".studio-form"),L=e.querySelector(".studio-preview");let y=null;const M=()=>{e.querySelectorAll(".tab-btn").forEach(a=>a.addEventListener("click",()=>{i.mode=a.dataset.mode,l.outerHTML,e.querySelector(".studio-form").outerHTML;const o=e.querySelector(".studio-layout > :first-child");o.outerHTML=k();const n=e.querySelector(".studio-layout > :first-child");f(n,L)}))},f=(a,o)=>{a.querySelectorAll(".tab-btn").forEach(r=>r.addEventListener("click",()=>{i.mode=r.dataset.mode;const u=document.createElement("div");u.innerHTML=k(),a.replaceWith(u.firstElementChild),f(e.querySelector(".studio-form"),o)}));const n=a.querySelector("#upload-zone"),c=a.querySelector("#file-input");n&&c&&(n.addEventListener("click",()=>c.click()),n.addEventListener("dragover",r=>{r.preventDefault(),n.classList.add("drag-over")}),n.addEventListener("dragleave",()=>n.classList.remove("drag-over")),n.addEventListener("drop",r=>{r.preventDefault(),n.classList.remove("drag-over");const u=r.dataTransfer.files[0];u&&S(u,a)}),c.addEventListener("change",()=>{c.files[0]&&S(c.files[0],a)}));const t=a.querySelector("#camera-video"),d=a.querySelector("#camera-canvas"),s=a.querySelector("#camera-snapshot"),$=a.querySelector("#camera-placeholder"),C=a.querySelector("#camera-start"),m=a.querySelector("#camera-capture"),b=a.querySelector("#camera-retake"),x=a.querySelector("#camera-switch");let g=null,h="environment";const w=()=>{g&&(g.getTracks().forEach(r=>r.stop()),g=null)},q=async()=>{try{w(),g=await navigator.mediaDevices.getUserMedia({video:{facingMode:h,width:{ideal:1280},height:{ideal:720}},audio:!1}),t&&(t.srcObject=g,t.style.display="block",$&&($.style.display="none"),s&&(s.style.display="none"),m&&(m.disabled=!1),x&&(x.disabled=!1),b&&(b.style.display="none"))}catch(r){p("No se pudo abrir la c\xE1mara: "+(r.message??"permiso denegado"),"crit")}};C?.addEventListener("click",()=>{q()}),x?.addEventListener("click",()=>{h=h==="environment"?"user":"environment",q()}),m?.addEventListener("click",()=>{if(!t||!d||!g)return;d.width=t.videoWidth,d.height=t.videoHeight;const r=d.getContext("2d");h==="user"&&(r.translate(d.width,0),r.scale(-1,1)),r.drawImage(t,0,0);const u=d.toDataURL("image/jpeg",.85);i.imagePreview=u,d.toBlob(T=>{T&&(y=new File([T],`camera-${Date.now()}.jpg`,{type:"image/jpeg"}))},"image/jpeg",.85),s&&(s.src=u,s.style.display="block"),t.style.display="none",b&&(b.style.display="inline-block"),m&&(m.disabled=!0),p('\u{1F4F8} Foto capturada \xB7 ahora seleccion\xE1 an\xE1lisis y dale "Analizar"',"ok")}),b?.addEventListener("click",()=>{i.imagePreview=null,y=null,s&&(s.style.display="none"),t&&(t.style.display="block"),m&&(m.disabled=!1),b&&(b.style.display="none")}),a.addEventListener("DOMNodeRemovedFromDocument",w),window.addEventListener("hashchange",w,{once:!0}),a.querySelector("#analyze-btn").addEventListener("click",()=>z(a,o,y))},S=(a,o)=>{y=a;const n=new FileReader;n.onload=c=>{i.imagePreview=c.target.result;const t=o.querySelector("#image-preview-wrap"),d=o.querySelector("#image-preview-img");t&&d&&(d.src=c.target.result,t.style.display="block")},n.readAsDataURL(a)},z=async(a,o,n)=>{const c=[...a.querySelectorAll("#analysis-opts input:checked")].map(s=>s.value);if(!c.length){p("Seleccion\xE1 al menos un tipo de an\xE1lisis","crit");return}let t=null;if(i.mode==="upload"){if(!n){p("Sub\xED una imagen primero","crit");return}t=i.imagePreview}else if(i.mode==="camera"){if(!i.imagePreview){p("Tom\xE1 una foto primero","crit");return}t=i.imagePreview}else{const s=a.querySelector("#img-url")?.value.trim();if(!s){p("Ingres\xE1 una URL de imagen","crit");return}t=s,i.imagePreview=s}const d=a.querySelector("#analyze-btn");d.disabled=!0,d.innerHTML='<span class="spinner"></span> analizando\u2026';try{const s=await P("/api/studio/vision",{body:{imageData:t,analisis:c.includes("analisis"),caption:c.includes("caption"),altText:c.includes("altText"),hashtags:c.includes("hashtags")}});i.result=s,o.innerHTML=A(),H(o),p("An\xE1lisis completado","ok")}catch(s){p(s.message,"crit")}finally{d.disabled=!1,d.innerHTML="\u{1F50D} Analizar"}};f(l,L)},H=e=>{e.querySelector("#copy-caption")?.addEventListener("click",()=>{const l=i.result?.caption?.texto??"";navigator.clipboard.writeText(l).then(()=>p("Caption copiado","ok"))}),e.querySelector("#copy-alt")?.addEventListener("click",()=>{const l=i.result?.altText??"";navigator.clipboard.writeText(l).then(()=>p("Alt text copiado","ok"))})};export const renderVision=async e=>{i={result:null,imagePreview:null,mode:"upload"},e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Vision AI</h1>
        <p class="view-subtitle page-subtitle">Claude multimodal analiza im\xE1genes y genera captions con la voz de tu marca.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="studio-layout">
        ${k()}
        <div class="studio-preview">${A()}</div>
      </div>
    </div>`,D(e)};
