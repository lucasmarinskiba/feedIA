import{escape as s}from"../lib/dom.js";import{toast as v}from"../lib/toast.js";const y=async()=>{try{return(await import("../lib/platform.js")).getPlatform()}catch{return"instagram"}},m=e=>Promise.all([...e||[]].slice(0,5).map(i=>new Promise(r=>{const t=new FileReader;t.onload=()=>r(t.result),t.onerror=()=>r(null),t.readAsDataURL(i)}))).then(i=>i.filter(Boolean)),g=(e,i=1024,r=.85)=>new Promise(t=>{if(!e?.startsWith("data:image")){t(e);return}const o=new Image;o.onload=()=>{const a=Math.min(1,i/Math.max(o.width,o.height)),d=Math.round(o.width*a),c=Math.round(o.height*a),l=document.createElement("canvas");l.width=d,l.height=c,l.getContext("2d").drawImage(o,0,0,d,c),t(l.toDataURL("image/jpeg",r))},o.onerror=()=>t(e),o.src=e});let p=null;export const loadBrandKit=async(e="")=>{try{return p=(await(await fetch("/api/account/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get",accountId:e})})).json())?.profile?.brandKit||null,p}catch{return null}},saveBrandKit=async(e,i)=>(await fetch("/api/account/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",accountId:e,fields:{brandKit:i}})})).json();const f=(e={})=>`
  <div class="bk-shell">
    <div class="bk-hero">
      <div class="bk-emoji">\u{1F3A8}</div>
      <div>
        <h1 class="bk-title">Tu Brand Kit</h1>
        <p class="bk-sub">Defin\xED 1 sola vez: colores, tipograf\xEDa, foto protagonista, elementos visuales. Todas las herramientas (Manos Libres, Piloto, Carruseles, Reels, Historias) lo leen autom\xE1ticamente.</p>
      </div>
    </div>

    <div class="bk-grid">
      <div class="bk-card">
        <div class="bk-card-label">\u{1F464} Cuenta principal</div>
        <input id="bk-handle" type="text" class="bk-input" placeholder="@tucuenta" value="${s(e.handle||"")}" />
        <input id="bk-niche" type="text" class="bk-input" placeholder="Nicho (ej: marketing digital, fitness, finanzas)" value="${s(e.niche||"")}" />
        <select id="bk-brandtype" class="bk-input">
          <option value="personal" ${e.brandType==="personal"?"selected":""}>Marca personal</option>
          <option value="business" ${e.brandType==="business"?"selected":""}>Marca empresarial</option>
        </select>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">\u{1F3A8} Paleta de marca (3 colores)</div>
        <div class="bk-color-row">
          <div class="bk-color-cell"><span>Texto</span><input id="bk-c-text" type="color" value="${e.textColor||"#FFFFFF"}" /><input id="bk-c-text-h" type="text" class="bk-input bk-input-sm" value="${e.textColor||"#FFFFFF"}" /></div>
          <div class="bk-color-cell"><span>Fondo</span><input id="bk-c-bg" type="color" value="${e.bgColor||"#0B0B0F"}" /><input id="bk-c-bg-h" type="text" class="bk-input bk-input-sm" value="${e.bgColor||"#0B0B0F"}" /></div>
          <div class="bk-color-cell"><span>Acento</span><input id="bk-c-accent" type="color" value="${e.accentColor||"#10F2B0"}" /><input id="bk-c-accent-h" type="text" class="bk-input bk-input-sm" value="${e.accentColor||"#10F2B0"}" /></div>
        </div>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">\u270D\uFE0F Tipograf\xEDa</div>
        <select id="bk-font" class="bk-input">
          <option value="serif-editorial" ${e.font==="serif-editorial"||!e.font?"selected":""}>Serif Editorial (Georgia/Playfair) \u2014 elegante</option>
          <option value="sans-modern" ${e.font==="sans-modern"?"selected":""}>Sans Moderno (Inter/Helvetica) \u2014 limpio</option>
          <option value="serif-luxury" ${e.font==="serif-luxury"?"selected":""}>Serif Luxury (Cormorant) \u2014 premium</option>
          <option value="sans-bold" ${e.font==="sans-bold"?"selected":""}>Sans Bold (Inter Black) \u2014 impacto</option>
          <option value="mono-numbers" ${e.font==="mono-numbers"?"selected":""}>Mono (SF Mono) \u2014 data</option>
        </select>
        <select id="bk-mood" class="bk-input">
          <option value="premium" ${e.mood==="premium"||!e.mood?"selected":""}>Mood: Premium (oscuro elegante)</option>
          <option value="editorial" ${e.mood==="editorial"?"selected":""}>Mood: Editorial (revista)</option>
          <option value="minimalista" ${e.mood==="minimalista"?"selected":""}>Mood: Minimalista</option>
          <option value="brutal" ${e.mood==="brutal"?"selected":""}>Mood: Brutal (amarillo fuerte)</option>
          <option value="luxury" ${e.mood==="luxury"?"selected":""}>Mood: Luxury (dorado)</option>
          <option value="monochrome" ${e.mood==="monochrome"?"selected":""}>Mood: Monocromo</option>
          <option value="techno" ${e.mood==="techno"?"selected":""}>Mood: Techno (ne\xF3n)</option>
          <option value="organico" ${e.mood==="organico"?"selected":""}>Mood: Org\xE1nico</option>
        </select>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">\u{1F4F7} Foto protagonista (vos / producto)</div>
        ${e.photo?`<img src="${s(e.photo)}" alt="foto" class="bk-photo-preview" />`:'<div class="bk-photo-empty">Sin foto cargada</div>'}
        <input id="bk-photo" type="file" class="bk-file" accept="image/*" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">\u{1F3F7}\uFE0F Logo de marca</div>
        ${e.logo?`<img src="${s(e.logo)}" alt="logo" class="bk-photo-preview" style="max-height:80px;background:#fff;padding:10px;" />`:'<div class="bk-photo-empty">Sin logo cargado</div>'}
        <input id="bk-logo" type="file" class="bk-file" accept="image/*" />
      </div>

      <div class="bk-card bk-full">
        <div class="bk-card-label">\u2728 Elementos visuales de tu nicho</div>
        <input id="bk-elements" type="text" class="bk-input" placeholder="ej: laptop, gr\xE1ficos, dashboards, plantas, mockups" value="${s((e.elements||[]).join(", "))}" />
        <div class="bk-card-label" style="margin-top:10px;">\u{1F5E3}\uFE0F Frase / claim de marca (opcional)</div>
        <input id="bk-tagline" type="text" class="bk-input" placeholder="ej: Sistemas que escalan tu marca personal" value="${s(e.tagline||"")}" />
      </div>
    </div>

    <div class="bk-actions">
      <button id="bk-save" class="bk-btn bk-btn-primary">\u{1F4BE} Guardar Brand Kit</button>
      <span id="bk-status" class="bk-status"></span>
    </div>

    <div class="bk-info">
      <strong>\u{1F4CC} Esto se lee autom\xE1ticamente desde:</strong> Manos Libres \xB7 Piloto autom\xE1tico \xB7 Br\xFAjula \xB7 Carrusel Builder \xB7 Brand Studio \xB7 Gstack. No ten\xE9s que volver a cargarlo en ning\xFAn lado.
    </div>
  </div>

  <style>
    .bk-shell{max-width:920px;margin:24px auto;padding:0 16px;}
    .bk-hero{display:flex;gap:16px;align-items:center;margin-bottom:20px;padding:16px;border-radius:14px;background:linear-gradient(135deg,rgba(168,85,247,.12),rgba(99,102,241,.06));}
    .bk-emoji{font-size:42px;}
    .bk-title{margin:0;font-size:22px;font-weight:900;color:var(--text-primary,var(--fg));}
    .bk-sub{margin:4px 0 0;font-size:13px;color:var(--text-secondary,var(--fg-2));}
    .bk-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    @media(max-width:640px){.bk-grid{grid-template-columns:1fr;}}
    .bk-card{padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--card,rgba(255,255,255,.02));display:flex;flex-direction:column;gap:8px;}
    .bk-full{grid-column:1/-1;}
    .bk-card-label{font-size:11.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));text-transform:uppercase;letter-spacing:1px;}
    .bk-input{background:var(--bg,#0a0a0a);color:var(--text-primary,var(--fg));border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13.5px;font-family:inherit;}
    .bk-input-sm{padding:6px 10px;font-size:12px;}
    .bk-color-row{display:flex;flex-direction:column;gap:6px;}
    .bk-color-cell{display:flex;align-items:center;gap:8px;}
    .bk-color-cell span{font-size:11.5px;width:60px;color:var(--text-tertiary,var(--fg-3));}
    .bk-color-cell input[type=color]{width:42px;height:32px;padding:0;border-radius:6px;border:1px solid var(--border);background:none;cursor:pointer;}
    .bk-color-cell .bk-input-sm{flex:1;}
    .bk-photo-preview{max-width:100%;max-height:160px;border-radius:8px;border:1px solid var(--border);object-fit:cover;}
    .bk-photo-empty{font-size:12px;color:var(--text-tertiary,var(--fg-3));font-style:italic;padding:18px;text-align:center;border:1px dashed var(--border);border-radius:8px;}
    .bk-file{font-size:12px;color:var(--text-secondary,var(--fg-2));}
    .bk-actions{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:16px;}
    .bk-btn{padding:10px 22px;border:none;border-radius:10px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;}
    .bk-btn-primary{background:linear-gradient(135deg,#10F2B0,#3B82F6);color:#0A0A0F;}
    .bk-status{font-size:12px;color:var(--text-tertiary,var(--fg-3));}
    .bk-info{margin-top:16px;padding:12px;border-radius:10px;background:rgba(16,242,176,.06);border:1px solid rgba(16,242,176,.2);font-size:12px;color:var(--text-secondary,var(--fg-2));}
  </style>`;export const renderBrandKit=async e=>{const i=(()=>{try{return JSON.parse(localStorage.getItem("feedia.brujula.account")||"{}").handle||""}catch{return""}})();let r={};try{const o=await(await fetch("/api/account/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get",accountId:i})})).json();r=o?.profile?.brandKit||o?.profile||{}}catch{}e.innerHTML=f(r),["text","bg","accent"].forEach(t=>{const o=e.querySelector(`#bk-c-${t}`),a=e.querySelector(`#bk-c-${t}-h`);o&&a&&(o.addEventListener("input",()=>{a.value=o.value.toUpperCase()}),a.addEventListener("input",()=>{/^#[0-9A-Fa-f]{6}$/.test(a.value)&&(o.value=a.value)}))}),e.querySelector("#bk-save")?.addEventListener("click",async t=>{const o=e.querySelector("#bk-status");o.textContent="\u23F3 Guardando\u2026",t.target.disabled=!0;try{const a=(e.querySelector("#bk-handle")?.value||"").trim();try{localStorage.setItem("feedia.brujula.account",JSON.stringify({handle:a}))}catch{}const d=e.querySelector("#bk-photo")?.files?.[0],c=e.querySelector("#bk-logo")?.files?.[0];let l=r.photo,u=r.logo;if(d){const n=await m([d]);n[0]&&(l=await g(n[0]))}if(c){const n=await m([c]);n[0]&&(u=await g(n[0],512,.92))}const b={handle:a,niche:(e.querySelector("#bk-niche")?.value||"").trim(),brandType:e.querySelector("#bk-brandtype")?.value||"personal",textColor:e.querySelector("#bk-c-text-h")?.value||"#FFFFFF",bgColor:e.querySelector("#bk-c-bg-h")?.value||"#0B0B0F",accentColor:e.querySelector("#bk-c-accent-h")?.value||"#10F2B0",colors:[e.querySelector("#bk-c-bg-h")?.value||"",e.querySelector("#bk-c-accent-h")?.value||""].filter(Boolean),font:e.querySelector("#bk-font")?.value||"serif-editorial",mood:e.querySelector("#bk-mood")?.value||"premium",elements:(e.querySelector("#bk-elements")?.value||"").split(",").map(n=>n.trim()).filter(Boolean),tagline:(e.querySelector("#bk-tagline")?.value||"").trim(),photo:l,logo:u,updatedAt:new Date().toISOString()};(await saveBrandKit(a,b))?.profile?(p=b,o.textContent="\u2705 Guardado. Ya disponible en todas las herramientas.",v("\u{1F4BE} Brand Kit guardado","ok")):o.textContent="\u26A0\uFE0F Guardado parcial."}catch(a){o.textContent=`\u274C Error: ${a?.message||"sin respuesta"}`}finally{t.target.disabled=!1}})};
