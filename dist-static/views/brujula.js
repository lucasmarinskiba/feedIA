import{apiSafe as oe}from"../lib/api.js";import{escape as a}from"../lib/dom.js";import{toast as B}from"../lib/toast.js";const ne=[{id:"awareness",emoji:"\u{1F441}\uFE0F",label:"Llegar a m\xE1s gente",desc:"Maximizar alcance"},{id:"engagement",emoji:"\u{1F49C}",label:"M\xE1s interacci\xF3n",desc:"Comentarios + saves"},{id:"conversion",emoji:"\u{1F4B0}",label:"Vender",desc:"Convertir a cliente"},{id:"community",emoji:"\u{1F91D}",label:"Comunidad",desc:"Conectar con seguidores"},{id:"sales",emoji:"\u{1F6D2}",label:"Lanzar producto",desc:"Push a oferta"}],le=async()=>{try{return(await import("../lib/platform.js")).getPlatform()}catch{return"instagram"}};let N="engagement",q="",Q="",X="",Z="personal",R=null,ee=null;const de=e=>{const u=e==="instagram",i=e==="tiktok";return`
    <div class="bj-hero" style="background:${u?"linear-gradient(135deg,#f09433,#dc2743,#bc1888)":i?"linear-gradient(135deg,#25F4EE,#000,#FE2C55)":"linear-gradient(135deg,#6366f1,#a855f7)"};">
      <div class="bj-hero-emoji">\u{1F9ED}</div>
      <div>
        <h1>Br\xFAjula del D\xEDa</h1>
        <p>El movimiento m\xE1s inteligente para tu cuenta de ${a(u?"Instagram":i?"TikTok":"tu marca")}, hoy.</p>
      </div>
    </div>`},ce=e=>`
  <div class="bj-card">
    <div class="bj-step-label">\xBFSobre qu\xE9 vas a publicar hoy?</div>
    <input id="bj-topic" class="bj-input" type="text"
      placeholder='${e==="instagram"?'Ej: "mi nuevo curso de productividad", "mi error m\xE1s grande", "3 tips de IA"':'Ej: "rutina de ma\xF1ana de 5 min", "secreto que nadie cuenta", "viral challenge"'}' value="${a(q)}" />
    <div id="bj-topic-hint" class="bj-topic-hint" style="display:none;"></div>
    <div class="bj-step-label" style="margin-top:16px;">\xBFCu\xE1l es tu objetivo?</div>
    <div class="bj-goals">
      ${ne.map(k=>`
        <button class="bj-goal ${k.id===N?"active":""}" data-goal="${k.id}">
          <span class="bj-goal-emoji">${k.emoji}</span>
          <span class="bj-goal-label">${a(k.label)}</span>
          <span class="bj-goal-desc">${a(k.desc)}</span>
        </button>`).join("")}
    </div>
    <details class="bj-account-box">
      <summary class="bj-account-sum">\u{1F464} Mi cuenta <span class="bj-account-hint">\u2014 opcional: el sistema recuerda tu nicho y aprende de tus resultados</span></summary>
      <div class="bj-account-fields">
        <input id="bj-account" class="bj-input bj-input-sm" type="text" placeholder='@tucuenta (para activar memoria y aprendizaje)' value="${a(Q)}" />
        <div class="bj-account-row">
          <input id="bj-niche" class="bj-input bj-input-sm" type="text" placeholder='Nicho (ej: fitness, finanzas, humor)' value="${a(X)}" />
          <select id="bj-brandtype" class="bj-input bj-input-sm">
            <option value="personal"${Z==="personal"?" selected":""}>Marca personal</option>
            <option value="business"${Z==="business"?" selected":""}>Marca empresarial</option>
          </select>
        </div>
      </div>
    </details>
    <button class="bj-btn bj-btn-primary" id="bj-go">\u{1F9ED} Analizar y generar mi plan</button>
  </div>`,K={carousel:{label:"\u{1F3A8} Crear carrusel",route:"studio-carousel"},reel:{label:"\u{1F3AC} Crear Reel",route:"studio-reel"},stories:{label:"\u{1F4F1} Crear Stories",route:"studio-stories"},schedule:{label:"\u{1F4C5} Programar post",route:"scheduler"},hashtags:{label:"#\uFE0F\u20E3 Estrategia hashtags",endpoint:"/api/hashtags/strategy"},"ab-test":{label:"\u{1F9EA} A/B Test hooks",endpoint:"/api/ab-tests"},"dm-template":{label:"\u{1F4AC} Auto DM",route:"inbox"},competitor:{label:"\u{1F50D} Ver competidores",route:"studio-manager"}},Se=[{key:"hook",label:"Hook",weight:25},{key:"saves",label:"Saves signal",weight:20},{key:"algorithm",label:"Algoritmo IG",weight:18},{key:"audience",label:"Audiencia",weight:15},{key:"conversion",label:"Conversi\xF3n",weight:12},{key:"production",label:"Producci\xF3n",weight:7},{key:"timing",label:"Timing",weight:3}],Te=[{key:"hook",label:"Hook (3s)",weight:30},{key:"completion",label:"Completion %",weight:28},{key:"sound",label:"Audio trend",weight:15},{key:"shareability",label:"Shareability",weight:12},{key:"audience",label:"Audiencia",weight:10},{key:"production",label:"Producci\xF3n",weight:3},{key:"timing",label:"Timing FYP",weight:2}],Y=e=>e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(0)}K`:String(e),pe=e=>{if(!e)return"";const{viralScore:u,ceilingScore:i,contentScore:k,contentDecision:m,monteCarlo:w,improvements:n,predicted:y,optimizationGap:h=0,platform:o,disclaimer:t,honestAnalysis:d,confidence:z}=e,I=o==="tiktok",F=u>=85?"bj-vclass-breakout":u>=70?"bj-vclass-high":u>=55?"bj-vclass-solid":"bj-vclass-low",C=m==="GO"?"bj-d-go":m==="CONDITIONAL"?"bj-d-cond":"bj-d-nogo",c=w?.p10||0,s=w?.p50||0,v=w?.p90||1,g=v>0?Math.round(s/v*100):50,p=(n||[]).filter(b=>typeof b=="object"&&["CR\xCDTICA","alta"].includes(b.priority)).slice(0,2),r=p.length?p.map(b=>`<div class="bj-pred-imp ${b.priority==="CR\xCDTICA"?"bj-imp-critical":"bj-imp-high"}"><span class="bj-imp-pri">${a(b.priority)}</span><span class="bj-imp-body">${a(b.action)}</span>${b.impact?`<span class="bj-imp-impact">${a(b.impact)}</span>`:""}</div>`).join(""):"",l=d?.honestVerdict?`<div class="bj-pred-verdict-simple">"${a(d.honestVerdict)}"</div>`:"";return`
    <div class="bj-pred-minimal">
      <div class="bj-pred-min-header">
        <span class="bj-pred-min-title">\u{1F4CA} Predicciones</span>
        <span class="bj-pred-min-sub">${I?"modelo TikTok FYP":"modelo Instagram"} \xB7 confianza ${z!=null?Math.round(z*100)+"%":"~55%"}</span>
      </div>

      <div class="bj-pred-min-row">
        <div class="bj-pred-min-score">
          <div class="bj-pred-gauge" style="--vs:${u}%;width:64px;height:64px;">
            <span class="bj-pred-vn" style="width:50px;height:50px;font-size:18px;">${u}</span>
          </div>
          <span class="bj-pred-vlbl ${F}" style="font-size:9px;">viral score</span>
        </div>
        <div class="bj-pred-dbox ${C}" style="min-width:70px;">
          <span class="bj-pred-dbadge">${m}</span>
          <span class="bj-pred-dscore">${k}/100</span>
          <span class="bj-pred-dtitle">score</span>
        </div>
        <div class="bj-pred-min-metrics">
          <div class="bj-pred-min-met"><strong>${Y(y?.reach||0)}</strong><span>\u{1F441}\uFE0F alcance</span></div>
          ${y?.completion!=null?`<div class="bj-pred-min-met"><strong>${(y.completion*100).toFixed(0)}%</strong><span>\u25B6\uFE0F completion</span></div>`:`<div class="bj-pred-min-met"><strong>${((y?.engagementRate||0)*100).toFixed(1)}%</strong><span>\u{1F49C} engagement</span></div>`}
          ${y?.likes!=null?`<div class="bj-pred-min-met"><strong>${Y(y.likes)}</strong><span>\u2764\uFE0F likes</span></div>`:""}
          ${y?.saves!=null?`<div class="bj-pred-min-met"><strong>${Y(y.saves)}</strong><span>\u{1F516} guardados</span></div>`:""}
          ${y?.comments!=null?`<div class="bj-pred-min-met"><strong>${Y(y.comments)}</strong><span>\u{1F4AC} comentarios</span></div>`:""}
          ${y?.shares!=null?`<div class="bj-pred-min-met"><strong>${Y(y.shares)}</strong><span>\u{1F501} compartidos</span></div>`:""}
          ${y?.follows!=null?`<div class="bj-pred-min-met"><strong>${Y(y.follows)}</strong><span>\u2795 follows</span></div>`:""}
        </div>
      </div>

      <div class="bj-pred-range">
        <span class="bj-pred-range-lbl">Rango de alcance</span>
        <div class="bj-pred-range-bar">
          <div class="bj-pred-range-fill" style="width:${g}%;"></div>
          <div class="bj-pred-range-dot" style="left:${g}%;"></div>
        </div>
        <div class="bj-pred-range-vals">
          <span style="color:#ef4444;">${Y(c)} m\xEDn</span>
          <span style="color:#a855f7;">${Y(s)} probable</span>
          <span style="color:#10b981;">${Y(v)} \xF3ptimo</span>
        </div>
      </div>

      ${l}
      ${r?`<div class="bj-pred-imps" style="margin-top:10px;">${r}</div>`:""}
      ${t?`<div class="bj-pred-disclaimer">${a(t)}</div>`:""}
    </div>`},be=(e,u,i)=>{const k=e?._viralScore??u?.strategicScore??80,m=k>=85?"bj-hp-s-hot":k>=70?"bj-hp-s-good":"bj-hp-s-ok",w=e?.carousel||null,n=Array.isArray(e?.carousels)&&e.carousels.length>=1?e.carousels:null,y=g=>{const p=g.length,r=b=>b==="hook"?"bj-ig-slide-hook":b==="cta"?"bj-ig-slide-cta":"",l=(b,$)=>$===0||b==="hook"?"\u{1F3A3} T\xEDtulo":$===p-1||b==="cta"?"\u{1F4E3} CTA":"\u{1F4CC}";return g.map((b,$)=>`
      <div class="bj-ig-slide ${r(b.role)}">
        <div class="bj-ig-slide-num">
          <div class="bj-ig-slide-n">${$+1}</div>
          <div class="bj-ig-slide-nof">${$+1}/${p}</div>
          <div class="bj-ig-slide-role-badge">${l(b.role,$)}</div>
        </div>
        <div class="bj-ig-slide-body">
          ${b.title?`<div class="bj-ig-slide-title">${a(b.title)}</div>`:""}
          ${b.subtitle||b.body?`<div class="bj-ig-slide-subtitle">${a(b.subtitle||b.body)}</div>`:""}
          ${b.bodyText?`<div class="bj-ig-slide-bodytext">${a(b.bodyText)}</div>`:""}
          ${b.imageText?`<div class="bj-ig-slide-imgtext">\u270F\uFE0F ${a(b.imageText)}</div>`:""}
          ${b.visual?`<div class="bj-ig-slide-visual">\u{1F5BC}\uFE0F ${a(b.visual)}</div>`:""}
        </div>
      </div>`).join("")},h=(g,p)=>{const r=g?.slides||[],l=g?.captionHook||g?.hook||"",b=g?.captionCTA||"",$=g?.angle||`Opci\xF3n ${p+1}`;return`
      <div class="bj-car-col">
        <div class="bj-car-col-header">
          <span class="bj-car-col-num">${p+1}</span>
          <span class="bj-car-col-angle">${a($)}</span>
          <span class="bj-car-col-count">${r.length} slides</span>
        </div>
        ${l?`<div class="bj-ig-caption-block bj-car-caption">
          <div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">\u{1F4E2} Hook</span><span class="bj-ig-caption-text">${a(l)}</span></div>
          ${b?`<div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">\u{1F4E3} CTA</span><span class="bj-ig-caption-cta">${a(b)}</span></div>`:""}
        </div>`:""}
        <div class="bj-ig-slides">${y(r)}</div>
      </div>`},o=()=>{if(n)return`
        <div class="bj-ig-tab-panel" id="bj-ig-carousel">
          <div class="bj-car-grid">
            ${n.map((l,b)=>h(l,b)).join("")}
          </div>
        </div>`;const g=w?.slides||[],p=w?.captionHook||w?.hook||"",r=w?.captionCTA||"";return`
      <div class="bj-ig-tab-panel" id="bj-ig-carousel">
        <div class="bj-ig-carousel-header">
          <div class="bj-ig-slide-count">${g.length} slides</div>
        </div>
        ${p?`<div class="bj-ig-caption-block">
          <div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">\u{1F4E2} Caption hook</span><span class="bj-ig-caption-text">${a(p)}</span></div>
          ${r?`<div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">\u{1F4E3} CTA caption</span><span class="bj-ig-caption-cta">${a(r)}</span></div>`:""}
        </div>`:""}
        <div class="bj-ig-slides">${y(g)}</div>
      </div>`},t=e?.reel||null,d=Array.isArray(e?.reels)&&e.reels.length>=1?e.reels:null,z=(g,p)=>{const r=typeof g=="string"?g:g?.text||"",l=typeof g=="object"&&g.onScreen||"",b=typeof g=="object"&&g.visual||"";return`<div class="bj-reel-beat">
      <span class="bj-hp-bn">${p+1}</span>
      <div class="bj-reel-beat-body">
        <div class="bj-reel-beat-text">${a(r)}</div>
        ${l?`<div class="bj-reel-beat-onscreen">\u{1F4DD} ${a(l)}</div>`:""}
        ${b?`<div class="bj-reel-beat-visual">\u{1F3AC} ${a(b)}</div>`:""}
      </div>
    </div>`},I=(g,p)=>{const r=g?.hookLayer||{},l=g?.script||{},b=Array.isArray(g?.hooks)?g.hooks:g?.hook?[{text:g.hook,style:""}]:[],$=g?.angle||`Opci\xF3n ${p+1}`;return`
      <div class="bj-car-col">
        <div class="bj-car-col-header">
          <span class="bj-car-col-num">${p+1}</span>
          <span class="bj-car-col-angle">${a($)}</span>
        </div>
        ${b.length?`<div class="bj-reel-hooks-sec">
          <div class="bj-hp-sec-h">\u{1F3A3} Hook</div>
          <div class="bj-reel-hooks-list">
            ${b.map((j,f)=>`
              <div class="bj-reel-hook-opt${f===0?" best":""}">
                <div class="bj-reel-hook-opt-body">
                  <div class="bj-reel-hook-text">${a(j.text||j)}</div>
                  ${j.style?`<div class="bj-reel-hook-style">${a(j.style)}</div>`:""}
                </div>
              </div>`).join("")}
          </div>
        </div>`:""}
        ${r.videoText||r.openingFrame||r.imageDescription||r.poseExpression?`
        <div class="bj-hp-layers">
          <div class="bj-hp-sec-h">\u{1F3AC} Primer frame</div>
          ${r.videoText?`<div class="bj-hp-lrow"><span class="bj-hp-ltag">\u{1F4DD} Pantalla</span><span class="bj-hp-screen">${a(r.videoText)}</span></div>`:""}
          ${r.openingFrame||r.imageDescription?`<div class="bj-hp-lrow"><span class="bj-hp-ltag">\u{1F5BC}\uFE0F Frame</span><span>${a(r.openingFrame||r.imageDescription)}</span></div>`:""}
          ${r.poseExpression?`<div class="bj-hp-lrow"><span class="bj-hp-ltag">\u{1F3AD} Pose</span><span>${a(r.poseExpression)}</span></div>`:""}
        </div>`:""}
        ${l.apertura||l.beats?.length?`
        <div class="bj-hp-script-sec">
          <div class="bj-hp-sec-h">\u{1F4DC} Gui\xF3n</div>
          ${l.apertura?`<div class="bj-hp-apertura"><span class="bj-reel-time">0\u20133s</span>${a(l.apertura)}</div>`:""}
          <div class="bj-reel-beats">${(l.beats||[]).map(z).join("")}</div>
          ${l.cierre?`<div class="bj-hp-cierre">\u{1F3C1} ${a(l.cierre)}</div>`:""}
        </div>`:""}
        ${g?.cta?`<div class="bj-hp-cta-box">\u{1F4E3} ${a(g.cta)}</div>`:""}
      </div>`},F=()=>d?`
        <div class="bj-ig-tab-panel" id="bj-ig-reel" hidden>
          <div class="bj-reel-score-row">
            <div class="bj-hp-score ${m}" style="--vs:${k}%;"><span class="bj-hp-score-n">${k}</span></div>
            <div class="bj-reel-label">Viral Score Reel</div>
          </div>
          <div class="bj-car-grid">
            ${d.map((g,p)=>I(g,p)).join("")}
          </div>
        </div>`:`
      <div class="bj-ig-tab-panel" id="bj-ig-reel" hidden>
        <div class="bj-reel-score-row">
          <div class="bj-hp-score ${m}" style="--vs:${k}%;"><span class="bj-hp-score-n">${k}</span></div>
          <div class="bj-reel-label">Viral Score Reel</div>
        </div>
        ${t?I(t,0).replace('<div class="bj-car-col">','<div class="bj-car-col" style="max-width:none;">'):'<div style="color:#7878a0;padding:12px;">No hay plan de Reel disponible.</div>'}
      </div>`,C=e?.stories||null,c=Array.isArray(e?.storiesVariants)&&e.storiesVariants.length>=1?e.storiesVariants:null,s=(g,p)=>{const r=g?.frames||[],l=g?.angle||`Opci\xF3n ${p+1}`,b=j=>j==="hook"?"bj-ig-frame-hook":j==="cta"?"bj-ig-frame-cta":"",$=j=>({video:"\u{1F3AC}",foto:"\u{1F4F7}",texto:"\u{1F4DD}",boomerang:"\u{1F501}"})[j]||"\u{1F5BC}\uFE0F";return`
      <div class="bj-car-col">
        <div class="bj-car-col-header">
          <span class="bj-car-col-num">${p+1}</span>
          <span class="bj-car-col-angle">${a(l)}</span>
          <span class="bj-car-col-count">${r.length} frames</span>
        </div>
        <div class="bj-ig-frames">
          ${r.map(j=>`
            <div class="bj-ig-frame ${b(j.role)}">
              <div class="bj-ig-frame-num">
                <div class="bj-ig-frame-n">${j.n}</div>
                ${j.mediaType?`<div class="bj-frame-mediatype">${$(j.mediaType)}${a(j.mediaType)}</div>`:""}
                ${j.duration?`<div class="bj-frame-duration">${a(j.duration)}</div>`:""}
              </div>
              <div class="bj-ig-frame-body">
                ${j.onScreenText||j.text?`<div class="bj-frame-onscreen">${a(j.onScreenText||j.text)}</div>`:""}
                ${j.supportText?`<div class="bj-frame-support">${a(j.supportText)}</div>`:""}
                ${j.mediaDescription||j.visual?`<div class="bj-frame-mediadesc">\u{1F5BC}\uFE0F ${a(j.mediaDescription||j.visual)}</div>`:""}
                ${j.sticker&&j.sticker!=="ninguno"?`<div class="bj-ig-frame-sticker">\u{1F3AF} ${a(j.sticker)}</div>`:""}
              </div>
            </div>`).join("")}
        </div>
      </div>`},v=()=>c?`
        <div class="bj-ig-tab-panel" id="bj-ig-stories" hidden>
          <div class="bj-car-grid">
            ${c.map((g,p)=>s(g,p)).join("")}
          </div>
        </div>`:`
      <div class="bj-ig-tab-panel" id="bj-ig-stories" hidden>
        ${C?s(C,0):'<div style="color:#7878a0;padding:12px;">No hay plan de Historia disponible.</div>'}
      </div>`;return`
    <div class="bj-ig-plans-wrap">
      ${ue(u)}
      <div class="bj-block-label" style="margin-bottom:12px;">\u{1F4F1} Formatos Instagram \u2014 eleg\xED c\xF3mo publicar</div>
      <div class="bj-ig-tabs">
        <button class="bj-ig-tab active" data-tab="carousel">\u{1F3A0} Carrusel</button>
        <button class="bj-ig-tab" data-tab="reel">\u{1F3AC} Reel</button>
        <button class="bj-ig-tab" data-tab="stories">\u{1F4F1} Historia</button>
      </div>
      ${o()}
      ${F()}
      ${v()}
      ${ge(u)}
    </div>`},ge=e=>{const u=(e?.hookPlans||[]).slice(0,3),i=e?.recommendedFormat?.format||"carrusel";return`
    <div class="bj-cb-card" id="bj-cb-card">
      <div class="bj-cb-head">
        <span class="bj-cb-emoji">\u{1F3A8}</span>
        <div>
          <div class="bj-cb-title">Generar carrusel con tu est\xE9tica</div>
          <div class="bj-cb-sub">Eleg\xED qu\xE9 plan(es) usar \xB7 colores \xB7 tipograf\xEDa \xB7 fondo \xB7 archivos \xB7 elementos. Formato base: <b>${a(i)}</b></div>
        </div>
      </div>

      ${u.length?`
      <div class="bj-cb-plans">
        <div class="bj-cb-label">\u{1F4CB} Eleg\xED 1 o m\xE1s planes (cada uno = 1 carrusel generado)</div>
        <div class="bj-cb-plan-grid">
          ${u.map((k,m)=>`
            <label class="bj-cb-plan ${m===0?"selected":""}">
              <input type="checkbox" class="bj-cb-plan-cb" data-idx="${m}" ${m===0?"checked":""} />
              <div class="bj-cb-plan-head">
                <span class="bj-cb-plan-badge">PLAN ${m+1}${m===0?" \xB7 TOP":""}</span>
                <span class="bj-cb-plan-score">${k.viralScore||80}/100</span>
              </div>
              <div class="bj-cb-plan-hook">${a((k.hook||"").slice(0,100))}</div>
            </label>`).join("")}
        </div>
      </div>`:""}

      <div class="bj-cb-grid">
        <label class="bj-cb-field">
          <span>\u{1F3A8} Color de letra</span>
          <div class="bj-cb-color-row">
            <input id="cb-text-color" type="color" value="#FFFFFF" />
            <input id="cb-text-color-text" type="text" class="bj-input bj-input-sm" placeholder="#FFFFFF" value="#FFFFFF" />
          </div>
        </label>
        <label class="bj-cb-field">
          <span>\u{1F5BC}\uFE0F Color de fondo</span>
          <div class="bj-cb-color-row">
            <input id="cb-bg-color" type="color" value="#0B0B0F" />
            <input id="cb-bg-color-text" type="text" class="bj-input bj-input-sm" placeholder="#0B0B0F" value="#0B0B0F" />
          </div>
        </label>
        <label class="bj-cb-field">
          <span>\u2728 Color de acento</span>
          <div class="bj-cb-color-row">
            <input id="cb-accent-color" type="color" value="#10F2B0" />
            <input id="cb-accent-color-text" type="text" class="bj-input bj-input-sm" placeholder="#10F2B0" value="#10F2B0" />
          </div>
        </label>
        <label class="bj-cb-field">
          <span>\u{1F5BC}\uFE0F Imagen de fondo (opcional)</span>
          <input id="cb-bg-image" type="file" class="bj-file" accept="image/*" />
        </label>
        <label class="bj-cb-field">
          <span>\u{1F4F7} Foto protagonista (slide 1)</span>
          <input id="cb-files" type="file" class="bj-file" accept="image/*" multiple />
        </label>
        <label class="bj-cb-field">
          <span>\u270D\uFE0F Tipograf\xEDa</span>
          <select id="cb-font" class="bj-input bj-input-sm">
            <option value="serif-editorial" selected>Serif editorial (Georgia/Playfair)</option>
            <option value="sans-modern">Sans moderno (Inter/Helvetica)</option>
            <option value="serif-luxury">Serif luxury (Cormorant)</option>
            <option value="sans-bold">Sans bold (Inter Black)</option>
            <option value="mono-numbers">Mono (SF Mono) \u2014 data</option>
          </select>
        </label>
        <label class="bj-cb-field">
          <span>\u{1F3AD} Mood (opcional, sobre-escribe colores)</span>
          <select id="cb-mood" class="bj-input bj-input-sm">
            <option value="">\u2014 usar mis colores \u2014</option>
            <option value="premium">Premium (oscuro elegante)</option>
            <option value="editorial">Editorial (revista)</option>
            <option value="minimalista">Minimalista (blanco amplio)</option>
            <option value="brutal">Brutal (amarillo fuerte)</option>
            <option value="luxury">Luxury (dorado)</option>
            <option value="monochrome">Monocromo</option>
            <option value="organico">Org\xE1nico</option>
            <option value="techno">Techno (ne\xF3n)</option>
          </select>
        </label>
        <label class="bj-cb-field">
          <span>\u{1F3A8} Paleta marca (texto extra)</span>
          <input id="cb-colors" type="text" class="bj-input bj-input-sm" placeholder="ej: negro, verde menta" />
        </label>
        <label class="bj-cb-field bj-cb-full">
          <span>\u2728 Elementos visuales del nicho</span>
          <input id="cb-elements" type="text" class="bj-input bj-input-sm" placeholder="ej: laptop, gr\xE1ficos, plantas, mockups, ondas ne\xF3n..." />
        </label>
      </div>
      <button class="bj-btn bj-btn-primary bj-cb-go" id="bj-cb-go">\u{1F3A0} Generar carrusel(es)</button>
      <div id="bj-cb-result" class="bj-cb-result"></div>
    </div>
    <style>
      .bj-cb-card{margin-top:18px;padding:18px;border-radius:14px;border:1px solid var(--border);background:linear-gradient(180deg,rgba(168,85,247,0.08),rgba(99,102,241,0.04));}
      .bj-cb-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;}
      .bj-cb-emoji{font-size:30px;}
      .bj-cb-title{font-weight:800;font-size:15px;color:var(--text-primary,var(--fg));}
      .bj-cb-sub{font-size:12px;color:var(--text-secondary,var(--fg-2));margin-top:2px;}
      .bj-cb-label{font-size:11.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));margin-bottom:6px;}
      .bj-cb-plans{margin-bottom:14px;padding:12px;border-radius:10px;background:rgba(0,0,0,0.18);}
      .bj-cb-plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;}
      .bj-cb-plan{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:8px;border:1.5px solid var(--border);cursor:pointer;transition:all .15s;background:var(--bg,#0a0a0a);}
      .bj-cb-plan:hover{border-color:#a855f7;}
      .bj-cb-plan.selected{border-color:#a855f7;background:linear-gradient(180deg,rgba(168,85,247,0.15),rgba(99,102,241,0.05));}
      .bj-cb-plan-head{display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:800;}
      .bj-cb-plan-badge{color:#a855f7;letter-spacing:1px;}
      .bj-cb-plan-score{color:#10b981;}
      .bj-cb-plan-hook{font-size:12px;color:var(--text-primary,var(--fg));line-height:1.35;}
      .bj-cb-plan-cb{position:absolute;opacity:0;pointer-events:none;}
      .bj-cb-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
      .bj-cb-field{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--text-secondary,var(--fg-2));}
      .bj-cb-field span{font-weight:600;}
      .bj-cb-full{grid-column:1/-1;}
      .bj-cb-color-row{display:flex;gap:6px;align-items:center;}
      .bj-cb-color-row input[type=color]{width:44px;height:34px;padding:0;border-radius:6px;border:1px solid var(--border);background:none;cursor:pointer;}
      .bj-cb-color-row input[type=text]{flex:1;}
      @media(max-width:560px){.bj-cb-grid{grid-template-columns:1fr;}}
      .bj-cb-go{margin-top:6px;width:100%;}
      .bj-cb-result{margin-top:14px;}
    </style>`},ue=e=>{const u=e?.strategy;if(!u)return"";const i=(n,y="")=>(n||[]).filter(Boolean).map(h=>`<span class="bj-st-chip ${y}">${a(String(h))}</span>`).join(""),k=u.hashtagStrategy||{},m=[...k.core||[],...k.niche||[],...k.trending||[]],w=n=>(n||[]).filter(Boolean).map(y=>`<li>${a(String(y))}</li>`).join("");return`
    <details class="bj-strategy">
      <summary class="bj-strategy-sum">
        \u{1F9ED} Estrategia de cuenta
        <span class="bj-st-niche">nicho: ${a(u.niche||"general")}${u.brandType?` \xB7 ${a(u.brandType)}`:""}</span>
      </summary>
      <div class="bj-strategy-body">
        ${u.contentStyle?`<div class="bj-st-row"><span class="bj-st-k">\u{1F3AD} Estilo del nicho</span><span class="bj-st-v">${a(u.contentStyle)}</span></div>`:""}
        ${u.cadence?`<div class="bj-st-row"><span class="bj-st-k">\u{1F4C5} Cadencia</span><span class="bj-st-v">${a(u.cadence)}</span></div>`:""}
        ${(u.weekPlan||[]).length?`<div class="bj-st-row col"><span class="bj-st-k">\u{1F5D3}\uFE0F Calendario 7 d\xEDas</span><div class="bj-week">${u.weekPlan.map(n=>`<div class="bj-week-day"><span class="bj-week-d">${a(n.day)}</span><span class="bj-week-f">${a(n.format)}</span><span class="bj-week-a">${a(n.angle)}</span><span class="bj-week-w">${a(n.window)}</span></div>`).join("")}</div></div>`:""}
        ${u.calendarMonthly?.slots?.length?`<div class="bj-st-row col"><span class="bj-st-k">\u{1F4C6} Calendario mensual (${u.calendarMonthly.totalSlots} posts)</span><details class="bj-month"><summary>Ver 4 semanas</summary><div class="bj-month-grid">${u.calendarMonthly.slots.map(n=>`<div class="bj-month-slot"><span class="bj-month-date">${a(n.date||"")}${n.time?" \xB7 "+a(n.time):""}</span><span class="bj-month-fmt">${a(n.format||n.type||"")}</span>${n.theme||n.idea?`<span class="bj-month-theme">${a(n.theme||n.idea)}</span>`:""}</div>`).join("")}</div></details></div>`:""}
        ${(u.algorithmSignals||[]).length?`<div class="bj-st-row"><span class="bj-st-k">\u2699\uFE0F Se\xF1ales algoritmo</span><span class="bj-st-v">${i(u.algorithmSignals,"algo")}</span></div>`:""}
        ${(u.postingWindows||[]).length?`<div class="bj-st-row"><span class="bj-st-k">\u23F0 Mejores horarios</span><span class="bj-st-v">${i(u.postingWindows)}</span></div>`:""}
        ${m.length?`<div class="bj-st-row"><span class="bj-st-k">#\uFE0F\u20E3 Hashtags</span><span class="bj-st-v">${i(m,"tag")}</span></div>`:""}
        ${(u.contentPillars||[]).length?`<div class="bj-st-row"><span class="bj-st-k">\u{1F3DB}\uFE0F Pilares</span><span class="bj-st-v">${i(u.contentPillars)}</span></div>`:""}
        ${(u.ctaLadder||[]).length?`<div class="bj-st-row"><span class="bj-st-k">\u{1F4E3} Escalera CTA</span><span class="bj-st-v">${i(u.ctaLadder)}</span></div>`:""}
        ${(u.distribution||[]).length?`<div class="bj-st-row col"><span class="bj-st-k">\u{1F680} Distribuci\xF3n</span><ul class="bj-st-ul">${w(u.distribution)}</ul></div>`:""}
        ${(u.kpis||[]).length?`<div class="bj-st-row col"><span class="bj-st-k">\u{1F4CA} KPIs objetivo</span><ul class="bj-st-ul">${w(u.kpis)}</ul></div>`:""}
        ${(u.riskFlags||[]).length?`<div class="bj-st-row col"><span class="bj-st-k">\u26A0\uFE0F Evitar (riesgo algoritmo)</span><ul class="bj-st-ul risk">${w(u.riskFlags)}</ul></div>`:""}
        ${(u.monetization||[]).length?`<div class="bj-st-row"><span class="bj-st-k">\u{1F4B0} Monetizaci\xF3n</span><span class="bj-st-v">${i(u.monetization)}</span></div>`:""}
        ${(u.topPlayersHint||[]).length?`<div class="bj-st-row"><span class="bj-st-k">\u{1F440} Referentes del nicho</span><span class="bj-st-v">${i(u.topPlayersHint)}</span><span class="bj-st-note">referencias, no garant\xEDa de handles vigentes</span></div>`:""}
      </div>
    </details>`},me=e=>e?.length?`
    <div class="bj-hp-grid-wrap">
      <div class="bj-block-label" style="margin-bottom:10px;">\u{1F3A3} Planes de contenido \u2014 hook \xB7 gui\xF3n \xB7 cta</div>
      <div class="bj-hp-grid">
        ${e.slice(0,3).map((i,k)=>{const m=i.viralScore??Math.round((.88-k*.04)*100),w=i.hookLayer||{},n=i.script||{},y=m>=85?"bj-hp-s-hot":m>=70?"bj-hp-s-good":"bj-hp-s-ok";return`
          <div class="bj-hp-card${k===0?" top":""}">
            <!-- score + hook -->
            <div class="bj-hp-card-top">
              <div class="bj-hp-score ${y}" style="--vs:${m}%;">
                <span class="bj-hp-score-n">${m}</span>
              </div>
              <div class="bj-hp-hook-text">${a(i.hook)}${k===0?' <span class="bj-best-badge" style="font-size:9px;">\u2605 TOP</span>':""}</div>
            </div>
            <!-- hook layer -->
            ${w.videoText||w.imageDescription||w.poseExpression?`
            <div class="bj-hp-layers">
              ${w.videoText?`<div class="bj-hp-lrow"><span class="bj-hp-ltag">\u{1F4DD}</span><span class="bj-hp-screen">${a(w.videoText)}</span></div>`:""}
              ${w.imageDescription?`<div class="bj-hp-lrow"><span class="bj-hp-ltag">\u{1F5BC}\uFE0F</span><span>${a(w.imageDescription)}</span></div>`:""}
              ${w.poseExpression?`<div class="bj-hp-lrow"><span class="bj-hp-ltag">\u{1F3AD}</span><span>${a(w.poseExpression)}</span></div>`:""}
            </div>`:""}
            <!-- gui\xF3n -->
            ${n.apertura||n.beats?.length?`
            <div class="bj-hp-script-sec">
              <div class="bj-hp-sec-h">\u{1F4DC} Gui\xF3n</div>
              ${n.apertura?`<div class="bj-hp-apertura">${a(n.apertura)}</div>`:""}
              ${(n.beats||[]).map((h,o)=>`<div class="bj-hp-beat"><span class="bj-hp-bn">${o+1}</span><span>${a(h)}</span></div>`).join("")}
              ${n.cierre?`<div class="bj-hp-cierre">${a(n.cierre)}</div>`:""}
            </div>`:""}
            <!-- cta -->
            ${i.cta?`<div class="bj-hp-cta-box">\u{1F4E3} ${a(i.cta)}</div>`:""}
          </div>`}).join("")}
      </div>
    </div>`:"",ve=(e,u)=>{if(!e)return"";const i=e.recommendedFormat,k=e.hookCandidates||[],m=e.postingWindows||[],w=e.algorithmChecklist||[],n=e.enriched||{},y=n.ctaOptions?.length?n.ctaOptions:e.ctaLadder||[],h=e.differentiationAngles||[],o=u==="instagram",t=n.automations?.length?n.automations.map(d=>({...K[d.action]||{},label:d.label||K[d.action]?.label,desc:d.desc,action:d.action})):[K[o?"carousel":"reel"],K.schedule,K.hashtags,K["ab-test"]];return`
    <div class="bj-result">

      <!-- Score strip -->
      <div class="bj-score-strip">
        <div class="bj-score-num">${e.strategicScore}</div>
        <div class="bj-score-label">
          <strong>Score estrat\xE9gico \xB7 ${a(i.format.toUpperCase())}</strong>
          <span>${e.strategicScore>=80?"\u{1F525} Alta probabilidad de alcance":e.strategicScore>=60?"\u2705 Plan s\xF3lido":"\u26A0\uFE0F Mejorable \u2014 prob\xE1 otro \xE1ngulo"}</span>
          <span style="font-size:11px;opacity:.75;">Fit ${(i.fit*100).toFixed(0)}% \xB7 ${o?"Agente Instagram":"Agente TikTok"}</span>
        </div>
      </div>

      ${n.platformTip?`<div class="bj-tip-bar"><span class="bj-tip-icon">${o?"\u{1F4F8}":"\u{1F3B5}"}</span><span>${a(n.platformTip)}</span></div>`:""}
      ${n.quickWin?`<div class="bj-quickwin">\u26A1 <strong>Quick win:</strong> ${a(n.quickWin)}</div>`:""}

      <!-- Formatos por plataforma -->
      ${o?be(e.igPlans||(()=>{const d=k[0]?.hook||"",z=n.guion||{},I=(z.desarrollo||[]).map((F,C)=>({n:C+1,text:F,onScreen:n.onScreenText?.[C]||"",visual:n.cameraAngles?.[C+1]||""}));return{_viralScore:k[0]?.viralScore??Math.round((k[0]?.predictedStrength||.8)*100),carousel:{captionHook:d,captionCTA:n.ctaOptions?.[0]||"",slideCount:(z.desarrollo?.length||3)+2,slides:[{n:1,role:"hook",title:d,subtitle:z.apertura||"",bodyText:"",imageText:n.onScreenText?.[0]||"",visual:n.cameraAngles?.[0]||""},...(z.desarrollo||[]).map((F,C)=>({n:C+2,role:"content",title:`Punto ${C+1}`,subtitle:F,bodyText:"",imageText:"",visual:n.cameraAngles?.[C+1]||""})),{n:(z.desarrollo?.length||0)+2,role:"cta",title:"Guardalo \u{1F447}",subtitle:n.ctaOptions?.[0]||"",bodyText:n.ctaOptions?.[1]||"",imageText:"Guardalo \xB7 Compartilo \xB7 Seguime",visual:""}]},reel:{hooks:k.slice(0,3).map((F,C)=>({text:F.hook,style:C===0?"mejor opci\xF3n":`opci\xF3n ${C+1}`})),hookLayer:{videoText:n.onScreenText?.[0]?.split("\u2014")[0]?.trim()||"",openingFrame:n.cameraAngles?.[0]||"",poseExpression:n.cameraAngles?.[1]||""},script:{apertura:z.apertura||"",beats:I,cierre:z.cierre||""},cta:n.ctaOptions?.[0]||""},stories:{frames:[{n:1,role:"hook",mediaType:"video",mediaDescription:n.cameraAngles?.[0]||"",onScreenText:d,supportText:"",sticker:"Encuesta",duration:"5s"},...(z.desarrollo||[]).slice(0,2).map((F,C)=>({n:C+2,role:"content",mediaType:"foto",mediaDescription:"",onScreenText:F,supportText:"",sticker:"ninguno",duration:"5s"})),{n:Math.min(z.desarrollo?.length||0,2)+2,role:"cta",mediaType:"video",mediaDescription:"",onScreenText:n.ctaOptions?.[0]||"Link en bio \u{1F446}",supportText:"",sticker:"Link",duration:"7s"}]}}})(),e,n):me(e.hookPlans?.length?e.hookPlans:(()=>{const d=C=>String(C||"").trim().split(/\s+/).slice(0,3).join(" ").toUpperCase(),z=(C,c,s)=>s===0&&c?.length?c:["Contexto que valida el hook: por qu\xE9 esto importa ahora","Desarrollo central \u2014 dato, demostraci\xF3n o historia que sostiene la promesa","Prueba o resultado concreto \u2014 el payoff de lo que prometi\xF3 el hook","Cierre narrativo: qu\xE9 hacer con esta informaci\xF3n \u2192 CTA natural"],I=n.cameraAngles?.[0]||"Plano medio frontal mirando a c\xE1mara \u2014 transmite autoridad",F=n.cameraAngles?.[1]||"Directo a c\xE1mara, energ\xEDa confiada, gesticul\xE1 hacia la pantalla";return k.slice(0,3).map((C,c)=>({hook:C.hook,viralScore:C.viralScore??Math.round((C.predictedStrength||.8)*100),hookLayer:{videoText:c===0&&n.onScreenText?.[0]?(n.onScreenText[0]||"").split("\u2014")[0].trim():d(C.hook),imageDescription:I,poseExpression:F},script:{apertura:c===0&&n.guion?.apertura?n.guion.apertura:`Arranc\xE1 con energ\xEDa: "${C.hook.slice(0,50)}${C.hook.length>50?"...":""}" \u2014 mir\xE1 a c\xE1mara los primeros 2s`,beats:z(C.hook,n.guion?.desarrollo,c),cierre:c===0&&n.guion?.cierre?n.guion.cierre:n.ctaOptions?.[0]||"Guard\xE1 este video si te sirvi\xF3 \u{1F447}"},cta:n.ctaOptions?.[c]||n.ctaOptions?.[0]||null}))})())}

      <!-- Gu\xEDa de producci\xF3n -->
      ${n.cameraAngles?.length||n.onScreenText?.length||n.visualElements?.length?`
      <div class="bj-block">
        <div class="bj-block-label">\u{1F3A5} Gu\xEDa de producci\xF3n</div>
        <div class="bj-prod-grid">
          ${n.cameraAngles?.length?`<div class="bj-prod-col"><div class="bj-prod-col-h">\u{1F4F7} \xC1ngulos de c\xE1mara</div>${n.cameraAngles.map(d=>`<div class="bj-prod-item">${a(d)}</div>`).join("")}</div>`:""}
          ${n.onScreenText?.length?`<div class="bj-prod-col"><div class="bj-prod-col-h">\u{1F4DD} Texto en pantalla</div>${n.onScreenText.map(d=>`<div class="bj-prod-item">${a(d)}</div>`).join("")}</div>`:""}
          ${n.visualElements?.length?`<div class="bj-prod-col"><div class="bj-prod-col-h">\u2728 Elementos visuales</div>${n.visualElements.map(d=>`<div class="bj-prod-item">${a(d)}</div>`).join("")}</div>`:""}
        </div>
      </div>`:""}

      <!-- Caption + Outline -->
      ${n.captionDraft?`
      <div class="bj-block">
        <div class="bj-block-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>\u{1F4DD} Caption listo para publicar</span>
          <button class="bj-copy-btn" data-copy="${a(n.captionDraft)}">\u{1F4CB} Copiar</button>
        </div>
        <div class="bj-caption-draft">${a(n.captionDraft)}</div>
        ${n.contentOutline?.length?`<div class="bj-block-label" style="margin-top:12px;">\u{1F5C2}\uFE0F Estructura</div>${n.contentOutline.map((d,z)=>`<div class="bj-outline-step"><span class="bj-outline-n">${z+1}</span><span>${a(d)}</span></div>`).join("")}`:""}
      </div>`:""}

      <!-- Hashtags -->
      ${n.hashtags?`
      <div class="bj-block">
        <div class="bj-block-label">#\uFE0F\u20E3 Hashtags</div>
        <div class="bj-hashtag-section"><span class="bj-ht-cat">Core</span>${(n.hashtags.core||[]).map(d=>`<span class="bj-ht-chip core">${a(d)}</span>`).join("")}</div>
        <div class="bj-hashtag-section"><span class="bj-ht-cat">Nicho</span>${(n.hashtags.niche||[]).map(d=>`<span class="bj-ht-chip niche">${a(d)}</span>`).join("")}</div>
        ${n.hashtags.trending?.length?`<div class="bj-hashtag-section"><span class="bj-ht-cat">Trending</span>${n.hashtags.trending.map(d=>`<span class="bj-ht-chip trending">${a(d)}</span>`).join("")}</div>`:""}
        <button class="bj-copy-btn" style="margin-top:8px;" data-copy="${a([...n.hashtags.core||[],...n.hashtags.niche||[],...n.hashtags.trending||[]].join(" "))}">\u{1F4CB} Copiar todos</button>
      </div>`:""}

      <!-- Timing + Se\xF1ales -->
      <div class="bj-grid">
        <div class="bj-block"><div class="bj-block-label">\u23F0 Publicar hoy</div>${m.length?m.slice(0,3).map(d=>`<div class="bj-window">${a(d)}</div>`).join(""):'<div class="bj-muted">Cualquier momento</div>'}</div>
        <div class="bj-block"><div class="bj-block-label">\u{1F9E0} Se\xF1ales a optimizar</div>${w.slice(0,3).map(d=>`<div class="bj-checklist-item"><strong>${a(d.signal)}</strong><span>${a(d.tactic)}</span></div>`).join("")}</div>
      </div>

      <!-- CTAs + \xC1ngulos -->
      <div class="bj-grid">
        <div class="bj-block">
          <div class="bj-block-label">\u{1F4E3} CTAs</div>
          ${(n.ctaOptions?.length?n.ctaOptions:y).map(d=>`<div class="bj-cta">${a(d)}</div>`).join("")}
        </div>
        <div class="bj-block">
          <div class="bj-block-label">\u{1F3AF} \xC1ngulos diferenciados</div>
          ${h.map(d=>`<div class="bj-angle">${a(d)}</div>`).join("")}
        </div>
      </div>

      ${e.riskFlags?.length?`<div class="bj-warning"><strong>\u26A0\uFE0F Riesgos:</strong><ul>${e.riskFlags.map(d=>`<li>${a(d)}</li>`).join("")}</ul></div>`:""}

      <!-- PREDICCIONES \u2014 al final, minimalistas -->
      ${e.predictions?pe(e.predictions):""}

      <!-- Acciones -->
      <div class="bj-block">
        <div class="bj-block-label">\u{1F680} Crear y publicar</div>
        <div class="bj-auto-grid">
          <button class="bj-btn bj-btn-primary bj-auto-primary" id="bj-forge">\u2728 Generar ${a(i.format)} completo</button>
          ${t.filter(d=>d?.label).map(d=>`<button class="bj-btn bj-btn-ghost bj-auto-action" data-route="${a(d?.route||"")}" data-endpoint="${a(d?.endpoint||"")}">${a(d?.label||"")}</button>`).join("")}
          <button class="bj-btn bj-btn-ghost" id="bj-recalc">\u21BB Recalcular</button>
        </div>
      </div>
    </div>
    <div id="bj-agency-host" class="ab-loading">\u{1F3DB}\uFE0F Cargando an\xE1lisis completo de agencia\u2026</div>`},te=e=>e?`
    <div class="bj-pred-overlay" id="bj-pred-overlay">
      <div class="bj-pred-card">
        <button class="bj-pred-close" id="bj-pred-close">\u2715</button>
        <div class="bj-pred-score bj-pred-${e.virality==="breakout-potential"?"breakout":e.virality==="high-potential"?"high":e.virality==="solid"?"solid":"mediocre"}">
          <div class="bj-pred-num">${e.viralScore}</div>
          <div class="bj-pred-label">Viral Score</div>
          <div class="bj-pred-class">${a(e.virality.replace("-"," "))}</div>
        </div>
        <div class="bj-pred-grid">
          <div class="bj-pred-metric"><strong>${e.predicted.reach.toLocaleString("es-AR")}</strong><span>alcance predicho</span></div>
          <div class="bj-pred-metric"><strong>${(e.predicted.engagementRate*100).toFixed(2)}%</strong><span>engagement rate</span></div>
          ${e.predicted.completion!==null?`<div class="bj-pred-metric"><strong>${(e.predicted.completion*100).toFixed(0)}%</strong><span>completion</span></div>`:""}
          <div class="bj-pred-metric"><strong>${e.predicted.saves}</strong><span>saves</span></div>
          <div class="bj-pred-metric"><strong>${e.predicted.shares}</strong><span>shares</span></div>
          <div class="bj-pred-metric"><strong>${e.predicted.comments}</strong><span>comments</span></div>
        </div>
        ${e.improvements?.length?`
          <div class="bj-pred-improve">
            <strong>\u{1F4A1} Mejoras posibles (techo ${e.ceilingScore}):</strong>
            <ul>${e.improvements.map(i=>`<li>${a(typeof i=="string"?i:`[${i.priority}] ${i.action} \u2192 ${i.impact}`)}</li>`).join("")}</ul>
          </div>`:""}
      </div>
    </div>`:"",U=(e,u="\u{1F4CB}")=>`<button class="ab-copy" data-copy="${a(e)}" title="Copiar">${u}</button>`,fe=e=>{if(!e?.canvas)return"";const{w:u,h:i}=e.canvas,m=170/i,w=Math.round(u*m),n=Math.round(i*m),y=e.zones?.noGo||[],h=e.zones?.good||[],o=(e.margin?.left||0)*m,t=(e.margin?.right||0)*m,d=(s,v,g)=>{let p=0,r=0,l=w,b=n;return s.edge==="top"?b=s.px*m:s.edge==="bottom"?(r=n-s.px*m,b=s.px*m):s.edge==="left"?l=s.px*m:s.edge==="right"&&(p=w-s.px*m,l=s.px*m),`<rect x="${p}" y="${r}" width="${l}" height="${b}" fill="${v}" opacity="0.55"/>
      <text x="${p+l/2}" y="${r+b/2}" fill="#fff" font-size="7" text-anchor="middle" dominant-baseline="middle">${g} ${s.px}</text>`},z=o,I=(y.find(s=>s.edge==="top")?.px||h.find(s=>s.edge==="top")?.px||0)*m,F=(y.find(s=>s.edge==="bottom")?.px||h.find(s=>s.edge==="bottom")?.px||0)*m,C=w-o-t,c=n-I-F;return`
  <div class="cs-diagram-wrap">
    <svg viewBox="0 0 ${w} ${n}" width="${w}" height="${n}" class="cs-svg">
      <rect x="0" y="0" width="${w}" height="${n}" fill="#1a1a2e" stroke="var(--border)" stroke-width="1"/>
      ${h.length?`<rect x="${z}" y="${I}" width="${C}" height="${c}" fill="#10b981" opacity="0.18"/>`:`<rect x="${z}" y="${I}" width="${C}" height="${c}" fill="#10b981" opacity="0.22"/>`}
      <text x="${z+C/2}" y="${I+c/2}" fill="#6ee7b7" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle">SAFE</text>
      ${y.map(s=>d(s,"#ef4444","NO-GO")).join("")}
      ${h.map(s=>d(s,"#f59e0b","GOOD")).join("")}
      ${e.visibleArea?`<rect x="1" y="1" width="${w-2}" height="${e.visibleArea.h*m-2}" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 3"/>`:""}
    </svg>
    <div class="cs-dims">
      <div class="cs-dim-main">${u}\xD7${i}</div>
      <div class="cs-dim-aspect">${a(e.aspect||"")}</div>
    </div>
  </div>`},xe=(e,u)=>{if(!e)return"";const i=Object.entries(e);return i.length?`
  <details class="ab-section">
    <summary>\u{1F4D0} Medidas exactas + Safe-Zones (${u==="tiktok"?"TikTok":"Instagram"})</summary>
    <div class="ab-section-body">
      <div class="cs-legend">
        <span><i class="cs-dot cs-red"></i> No-Go (no poner texto)</span>
        <span><i class="cs-dot cs-amber"></i> Good Zone</span>
        <span><i class="cs-dot cs-green"></i> Safe</span>
        <span><i class="cs-dot cs-blue"></i> \xC1rea visible en feed</span>
      </div>
      <div class="cs-grid">
        ${i.map(([k,m])=>`
        <div class="cs-card">
          <div class="cs-card-title">${a(m.label||k)}</div>
          ${fe(m)}
          ${m.tip?`<div class="cs-tip">${a(m.tip)}</div>`:""}
          ${m.visibleArea?`<div class="cs-visible">\u{1F441}\uFE0F Visible en feed: ${m.visibleArea.w}\xD7${m.visibleArea.h}</div>`:""}
          <div class="cs-margins">M\xE1rgenes: ${m.margin?.left||0}px / ${m.margin?.right||0}px</div>
        </div>`).join("")}
      </div>
    </div>
  </details>`:""},he=e=>{if(!e||e.error)return`<div class="ab-error">\u26A0\uFE0F ${a(e?.error||"Error cargando an\xE1lisis")}</div>`;const u=(e.hooks||[]).map((t,d)=>`
    <div class="ab-hook-row${d===0?" ab-hook-top":""}">
      <div class="ab-hook-verbal">${a(t.verbal||"")}
        ${U(t.verbal||"","\u{1F4CB}")}
        ${d===0?'<span class="ab-badge">\u2605 MEJOR</span>':""}
      </div>
      <div class="ab-hook-meta">
        ${t.onScreenText?`<span class="ab-hook-screen">"${a(t.onScreenText)}"</span>`:""}
        ${t.visual?`<span class="ab-hook-visual">\u{1F4F9} ${a(t.visual)}</span>`:""}
        <span class="ab-hook-score">${t.score||0}/100</span>
      </div>
    </div>`).join(""),i=e.captions||{},k=[i.carousel&&{fmt:"\u{1F3A0} Carrusel",text:i.carousel},i.reel&&{fmt:"\u{1F3AC} Reel",text:i.reel},i.story&&{fmt:"\u{1F4F1} Historia",text:i.story}].filter(Boolean).map(t=>`
    <div class="ab-caption-block">
      <div class="ab-caption-fmt">${t.fmt} ${U(t.text)}</div>
      <div class="ab-caption-text">${a(t.text)}</div>
    </div>`).join(""),m=e.hashtags||{},w=(t,d)=>d?.length?`<div class="ab-ht-group"><span class="ab-ht-label">${t}</span>
        <div class="ab-ht-tags">${d.map(z=>`<span class="ab-ht">${a(z)}</span>`).join("")}</div>
        ${U(d.join(" "),"\u{1F4CB} Copiar bloque")}
       </div>`:"",n=(e.viralIdeas||[]).map((t,d)=>`
    <div class="ab-idea">
      <span class="ab-idea-n">${d+1}</span>
      <div>
        <div class="ab-idea-concept">${a(t.concept||"")}</div>
        <div class="ab-idea-meta">
          <span class="ab-tag">${a(t.format||"")}</span>
          <span class="ab-tag">\u23F1 ${t.creationMin||"?"} min</span>
          <span class="ab-tag">\u{1F525} ${t.shareability||0}% share</span>
        </div>
      </div>
    </div>`).join(""),y=(e.weekPlan||[]).map(t=>`
    <div class="ab-week-row">
      <span class="ab-week-day">${a(t.day)}</span>
      <span class="ab-week-fmt">${a(t.format)}</span>
      <span class="ab-week-angle">${a(t.angle)}</span>
    </div>`).join(""),h=e.audience||{},o=e.storytelling?.structure||[];return`
  <details class="ab-brain ab-brain-outer">
    <summary class="ab-brain-summary">
      <span class="ab-brain-title">\u{1F3DB}\uFE0F M\xE1s opciones \xB7 Paquete completo de agencia</span>
      <span class="ab-brain-sub">hooks \xB7 captions \xB7 hashtags \xB7 ideas virales \xB7 audiencia \xB7 calendario \xB7 medidas \xB7 copywriting \xB7 matriz creativa</span>
    </summary>
    <div class="ab-brain-body">

    <details class="ab-section">
      <summary>\u{1F3A3} Hooks Virales (${(e.hooks||[]).length} variantes)</summary>
      <div class="ab-section-body">${u||"<em>Sin hooks</em>"}</div>
    </details>

    <details class="ab-section">
      <summary>\u270D\uFE0F Captions Listos para Publicar</summary>
      <div class="ab-section-body">
        ${k||"<em>Sin captions</em>"}
        ${i.hook_caption?`<div class="ab-caption-block"><div class="ab-caption-fmt">\u{1F3AF} Hook de apertura ${U(i.hook_caption)}</div><div class="ab-caption-text ab-hook-highlight">${a(i.hook_caption)}</div></div>`:""}
        ${i.dm_script?`<div class="ab-caption-block"><div class="ab-caption-fmt">\u{1F4AC} Script DM ${U(i.dm_script)}</div><div class="ab-caption-text">${a(i.dm_script)}</div></div>`:""}
        ${(i.ctas||[]).length?`<div class="ab-caption-block"><div class="ab-caption-fmt">\u{1F4E2} CTAs ${U((i.ctas||[]).join(" | "))}</div><div class="ab-cta-list">${(i.ctas||[]).map(t=>`<span class="ab-cta">${a(t)}</span>`).join("")}</div></div>`:""}
      </div>
    </details>

    <details class="ab-section">
      <summary>#\uFE0F\u20E3 Estrategia de Hashtags</summary>
      <div class="ab-section-body">
        ${w("Nicho (alta relevancia)",m.niche)}
        ${w("Broad (m\xE1s alcance)",m.broad)}
        ${w("Mega (trending)",m.mega)}
        ${m.recommended?.length?`<div class="ab-ht-group ab-ht-recommended"><span class="ab-ht-label">\u2705 Mix recomendado ${U(m.recommended.join(" "),"\u{1F4CB} Copiar todo")}</span><div class="ab-ht-tags">${(m.recommended||[]).map(t=>`<span class="ab-ht">${a(t)}</span>`).join("")}</div></div>`:""}
        ${m.strategy?`<div class="ab-ht-strategy">${a(m.strategy)}</div>`:""}
      </div>
    </details>

    <details class="ab-section">
      <summary>\u{1F4A1} Ideas Virales de la Semana</summary>
      <div class="ab-section-body">${n||"<em>Sin ideas</em>"}</div>
    </details>

    <details class="ab-section">
      <summary>\u{1F4C5} Plan 7 D\xEDas</summary>
      <div class="ab-section-body ab-week">${y}</div>
    </details>

    <details class="ab-section">
      <summary>\u{1F9E0} Audiencia & Psicograf\xEDa</summary>
      <div class="ab-section-body">
        ${h.painPoints?.length?`<div class="ab-aud-block"><strong>Dolores:</strong> ${h.painPoints.map(t=>`<span class="ab-tag">${a(t)}</span>`).join("")}</div>`:""}
        ${h.dreamOutcomes?.length?`<div class="ab-aud-block"><strong>Sue\xF1os:</strong> ${h.dreamOutcomes.map(t=>`<span class="ab-tag ab-tag-green">${a(t)}</span>`).join("")}</div>`:""}
        ${h.triggers?.length?`<div class="ab-aud-block"><strong>Triggers:</strong> ${h.triggers.map(t=>`<span class="ab-tag ab-tag-blue">${a(t)}</span>`).join("")}</div>`:""}
        ${h.contentThatConverts?.length?`<div class="ab-aud-block"><strong>Qu\xE9 convierte:</strong> ${h.contentThatConverts.map(t=>`<span class="ab-tag ab-tag-purple">${a(t)}</span>`).join("")}</div>`:""}
        ${h.angle?`<div class="ab-aud-angle">${a(h.angle)}</div>`:""}
      </div>
    </details>

    ${e.niche?.trends2026?.length?`
    <details class="ab-section">
      <summary>\u{1F4C8} Tendencias 2026 en tu Nicho</summary>
      <div class="ab-section-body">
        <div class="ab-trends">${(e.niche.trends2026||[]).map(t=>`<span class="ab-trend">${a(t)}</span>`).join("")}</div>
        ${e.niche.topPlayers?.length?`<div class="ab-aud-block"><strong>Top cuentas:</strong> ${e.niche.topPlayers.map(t=>`<span class="ab-tag">${a(t)}</span>`).join("")}</div>`:""}
        ${e.niche.monetization?.length?`<div class="ab-aud-block"><strong>Monetizaci\xF3n:</strong> ${e.niche.monetization.map(t=>`<span class="ab-tag ab-tag-green">${a(t)}</span>`).join("")}</div>`:""}
      </div>
    </details>`:""}

    ${o.length?`
    <details class="ab-section">
      <summary>\u{1F3AC} Gui\xF3n Storytelling (reel/v\xEDdeo)</summary>
      <div class="ab-section-body">
        ${o.map(t=>`<div class="ab-beat"><span class="ab-beat-label">${a(t.beat)} <em>${a(t.sec||"")}</em></span><span class="ab-beat-text">${a(t.text)}</span></div>`).join("")}
      </div>
    </details>`:""}

    ${e.copy?.frameworks?`
    <details class="ab-section">
      <summary>\u270D\uFE0F Copywriting Persuasivo \u2014 PAS \xB7 AIDA \xB7 BAB</summary>
      <div class="ab-section-body">
        ${["PAS","AIDA","BAB"].map(t=>{const d=e.copy.frameworks[t];return d?`<div class="ab-fw-block">
            <div class="ab-fw-name">${t}</div>
            ${d.caption_completo?`<div class="ab-caption-block"><div class="ab-caption-fmt">${t} completo ${U(d.caption_completo)}</div><div class="ab-caption-text">${a(d.caption_completo)}</div></div>`:""}
            <div class="ab-fw-steps">
              ${t==="PAS"&&d.problema?`<div class="ab-fw-step"><span class="ab-fw-step-label">P \u2014 Problema</span><span>${a(d.problema)}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">A \u2014 Agitaci\xF3n</span><span>${a(d.agitacion||"")}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">S \u2014 Soluci\xF3n</span><span>${a(d.solucion||"")}</span></div>`:""}
              ${t==="AIDA"&&d.atencion?`<div class="ab-fw-step"><span class="ab-fw-step-label">A \u2014 Atenci\xF3n</span><span>${a(d.atencion)}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">I \u2014 Inter\xE9s</span><span>${a(d.interes||"")}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">D \u2014 Deseo</span><span>${a(d.deseo||"")}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">A \u2014 Acci\xF3n</span><span>${a(d.accion||"")}</span></div>`:""}
              ${t==="BAB"&&d.antes?`<div class="ab-fw-step"><span class="ab-fw-step-label">B \u2014 Antes</span><span>${a(d.antes)}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">A \u2014 Despu\xE9s</span><span>${a(d.despues||"")}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">B \u2014 Puente</span><span>${a(d.puente||"")}</span></div>`:""}
            </div>
          </div>`:""}).join("")}
        ${e.copy.frameworks.headline_options?.length?`<div class="ab-caption-block"><div class="ab-caption-fmt">\u{1F3AF} Headlines ${U((e.copy.frameworks.headline_options||[]).join(`
`))}</div><div class="ab-cta-list">${(e.copy.frameworks.headline_options||[]).map(t=>`<span class="ab-cta">${a(t)}</span>`).join("")}</div></div>`:""}
        ${e.copy.frameworks.micro_ctas?.length?`<div class="ab-caption-block"><div class="ab-caption-fmt">\u26A1 Micro-CTAs ${U((e.copy.frameworks.micro_ctas||[]).join(`
`))}</div><div class="ab-cta-list">${(e.copy.frameworks.micro_ctas||[]).map(t=>`<span class="ab-cta">${a(t)}</span>`).join("")}</div></div>`:""}
        ${e.copy.frameworks.objeciones_y_respuestas?.length?`
        <div class="ab-caption-block">
          <div class="ab-caption-fmt">\u{1F6E1}\uFE0F Objeciones + respuestas</div>
          ${(e.copy.frameworks.objeciones_y_respuestas||[]).map(t=>`<div class="ab-fw-step"><span class="ab-fw-step-label ab-obj">\u275D ${a(t.objecion)}</span><span class="ab-obj-flip">\u2192 ${a(t.flip)}</span></div>`).join("")}
        </div>`:""}
      </div>
    </details>`:""}

    ${e.copy?.contentPillars?.length?`
    <details class="ab-section">
      <summary>\u{1F3DB}\uFE0F Pilares de Contenido de tu Nicho</summary>
      <div class="ab-section-body">
        ${(e.copy.contentPillars||[]).map(t=>`
          <div class="ab-pillar">
            <div class="ab-pillar-name">${a(t.pillar)} <span class="ab-tag">${a(t.format||"")}</span></div>
            <div class="ab-pillar-sub">${(t.sub||[]).map(d=>`<span class="ab-tag ab-tag-blue">${a(d)}</span>`).join("")}</div>
          </div>`).join("")}
        <div class="ab-ht-strategy">${a(e.copy.funnel?.regla||"80/20 \u2014 80% valor, 20% pitch")}</div>
      </div>
    </details>`:""}

    ${e.copy?.contentPlan?.serie_educativa?`
    <details class="ab-section">
      <summary>\u{1F4DA} Serie de Contenido Educativo + Entretenimiento</summary>
      <div class="ab-section-body">
        <div class="ab-caption-block">
          <div class="ab-caption-fmt">\u{1F4FA} ${a(e.copy.contentPlan.serie_educativa.nombre||"")}</div>
          <div class="ab-caption-text">${a(e.copy.contentPlan.serie_educativa.descripcion||"")}</div>
          <div class="ab-week" style="margin-top:8px;">
            ${(e.copy.contentPlan.serie_educativa.episodios||[]).map(t=>`
              <div class="ab-week-row">
                <span class="ab-week-day">Ep ${t.n}</span>
                <span class="ab-week-fmt">${a(t.formato||"")}</span>
                <span class="ab-week-angle">${a(t.titulo||"")} \u2014 ${a(t.idea||"")}</span>
              </div>`).join("")}
          </div>
        </div>
        ${e.copy.contentPlan.contenido_educativo?.length?`<div class="ab-aud-block" style="flex-direction:column;gap:5px;"><strong>Educativo:</strong>${(e.copy.contentPlan.contenido_educativo||[]).map(t=>`<div class="ab-fw-step"><span class="ab-fw-step-label">${a(t.tipo)}</span><span>${a(t.titulo)} \u2014 ${a(t.descripcion)}</span></div>`).join("")}</div>`:""}
        ${e.copy.contentPlan.contenido_entretenimiento?.length?`<div class="ab-aud-block" style="flex-direction:column;gap:5px;"><strong>Entretenimiento:</strong>${(e.copy.contentPlan.contenido_entretenimiento||[]).map(t=>`<div class="ab-fw-step"><span class="ab-fw-step-label">${a(t.tipo)}</span><span>${a(t.titulo)} \u2014 ${a(t.descripcion)}</span></div>`).join("")}</div>`:""}
        ${e.copy.contentPlan.lead_magnet_sugerido?`<div class="ab-caption-block"><div class="ab-caption-fmt">\u{1F381} Lead Magnet</div><div class="ab-caption-text"><strong>${a(e.copy.contentPlan.lead_magnet_sugerido.nombre||"")}</strong> (${a(e.copy.contentPlan.lead_magnet_sugerido.formato||"")}) \u2014 ${a(e.copy.contentPlan.lead_magnet_sugerido.promesa||"")}</div></div>`:""}
        ${e.copy.contentPlan.angulo_diferencial?`<div class="ab-aud-angle">\u{1F3AF} \xC1ngulo diferencial: ${a(e.copy.contentPlan.angulo_diferencial)}</div>`:""}
      </div>
    </details>`:""}

    ${e.copy?.funnel?.stages?.length?`
    <details class="ab-section">
      <summary>\u{1F53B} Embudo de Contenido (Awareness \u2192 Conversion)</summary>
      <div class="ab-section-body">
        ${(e.copy.funnel.stages||[]).map(t=>`
          <div class="ab-pillar">
            <div class="ab-pillar-name">${a(t.stage)} <span class="ab-tag">${a(t.ratio||"")}</span></div>
            <div class="ab-pillar-sub" style="margin-bottom:4px;">${(t.content||[]).map(d=>`<span class="ab-tag">${a(d)}</span>`).join("")}</div>
            <div style="font-size:11px;color:var(--text-tertiary,var(--fg-3));">KPIs: ${(t.kpis||[]).join(" \xB7 ")}</div>
          </div>`).join("")}
        <div class="ab-aud-angle">Mezcla recomendada \u2192 ${Object.entries(e.copy.funnel.mixRecommendado||{}).map(([t,d])=>`${t}: ${d}`).join(" \xB7 ")}</div>
      </div>
    </details>`:""}

    ${e.copy?.rules?.length?`
    <details class="ab-section">
      <summary>\u{1F4CF} Reglas de Oro del Copy</summary>
      <div class="ab-section-body">
        ${(e.copy.rules||[]).map(t=>`<div class="ab-fw-step" style="border-color:#a855f730"><span class="ab-fw-step-label" style="color:#a855f7">\u2713</span><span>${a(t)}</span></div>`).join("")}
      </div>
    </details>`:""}

    ${e.andromeda?.featured?.length?`
    <details class="ab-section">
      <summary>\u{1F30C} Andr\xF3meda \u2014 Matriz Creativa (${e.andromeda.total||0} combinaciones \xFAnicas)</summary>
      <div class="ab-section-body">
        <div class="and-insight">${a(e.andromeda.insight||"")}</div>

        <div class="and-featured-title">\u2B50 Top combinaciones para objetivo "${a(e.andromeda.goal||"")}"</div>
        ${(e.andromeda.featured||[]).map((t,d)=>`
        <div class="and-combo${d===0?" and-combo-top":""}">
          <div class="and-combo-header">
            <span class="and-angle">${a(t.angle)}</span>
            <span class="and-sep">\xD7</span>
            <span class="and-persona">${a(t.persona)}</span>
            <span class="and-sep">\xD7</span>
            <span class="and-format">${a(t.format)}</span>
            ${d===0?'<span class="ab-badge">\u2605 BEST</span>':""}
          </div>
          <div class="and-meta">
            <span class="ab-tag">Awareness: ${a(t.awareness)}</span>
            <span class="ab-tag">Estado: ${a(t.emotionalState)}</span>
            <span class="ab-tag and-conv">Conversi\xF3n: ${a(t.conversionPotential||"")}</span>
          </div>
          ${t.hook_final||t.hook?`<div class="and-hook">"${a(t.hook_final||t.hook)}" ${U(t.hook_final||t.hook)}</div>`:""}
          ${t.copy_body?`<div class="and-body">${a(t.copy_body)}</div>`:""}
          <div class="and-details">
            <span><strong>Dolor:</strong> ${a(t.painAddressed||"")}</span>
            <span><strong>Trigger:</strong> ${a(t.triggerUsed||"")}</span>
          </div>
          <div class="and-cta">
            <strong>CTA:</strong> ${a(t.cta_final||t.cta||"")} ${U(t.cta_final||t.cta||"")}
          </div>
          ${t.why_this_works?`<div class="and-why">\u{1F4A1} ${a(t.why_this_works)}</div>`:""}
          ${t.formatHook?`<div class="and-fmt-hint">\u{1F4F9} Formato tip: ${a(t.formatHook)}</div>`:""}
        </div>`).join("")}

        ${e.andromeda.extras?.length?`
        <details class="and-extras">
          <summary>+ ${e.andromeda.extras.length} combinaciones extra (sin expandir)</summary>
          <div class="and-extras-grid">
            ${(e.andromeda.extras||[]).map(t=>`
            <div class="and-extra-pill">
              <span class="and-angle-sm">${a(t.angle)}</span>
              <span class="and-sep">\xD7</span>
              <span class="and-persona-sm">${a(t.persona)}</span>
              <span class="and-sep">\xD7</span>
              <span class="and-format-sm">${a(t.format)}</span>
            </div>`).join("")}
          </div>
        </details>`:""}

        <details class="and-extras" style="margin-top:8px;">
          <summary>\u{1F4D6} Ver todos los \xE1ngulos disponibles (${e.andromeda.allAngles?.length||0})</summary>
          <div class="and-angles-grid">
            ${(e.andromeda.allAngles||[]).map(t=>`
            <div class="and-angle-card">
              <div class="and-angle-name">${a(t.name)}</div>
              <div class="and-angle-desc">${a(t.desc)}</div>
              <div class="ab-pillar-sub">${(t.tags||[]).map(d=>`<span class="ab-tag">${a(d)}</span>`).join("")}</div>
            </div>`).join("")}
          </div>
        </details>

        <details class="and-extras" style="margin-top:8px;">
          <summary>\u{1F465} Ver todas las Buyer Personas (${e.andromeda.allPersonas?.length||0})</summary>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
            ${(e.andromeda.allPersonas||[]).map(t=>`
            <div class="and-persona-card">
              <div class="and-angle-name">${a(t.name)} <span class="ab-tag">Awareness: ${a(t.awareness)}</span> <span class="ab-tag and-conv">Conv: ${a(t.conversion)}</span></div>
              <div class="ab-pillar-sub" style="margin-top:4px;">${(t.pains||[]).map(d=>`<span class="ab-tag ab-tag-blue">${a(d)}</span>`).join("")}</div>
              <div class="and-cta" style="margin-top:4px;"><strong>CTA ideal:</strong> ${a(t.ctaStyle)}</div>
            </div>`).join("")}
          </div>
        </details>
      </div>
    </details>`:""}

    ${e.timing?`
    <details class="ab-section">
      <summary>\u23F0 Mejores horarios de publicaci\xF3n</summary>
      <div class="ab-section-body">
        <div class="ab-timing">
          <span><strong>Horarios:</strong> ${(e.timing.best||[]).join(" \xB7 ")}</span>
          <span><strong>D\xEDas:</strong> ${(e.timing.days||[]).join(", ")}</span>
          <span><strong>Cadencia:</strong> ${e.timing.cadence||""}</span>
        </div>
      </div>
    </details>`:""}

    ${xe(e.canvasSpecs,e._meta?.platform)}

    ${e.carouselRules?`
    <details class="ab-section">
      <summary>\u{1F3AF} Carrusel Viral \u2014 Qu\xE9 hacer vs Qu\xE9 NO</summary>
      <div class="ab-section-body">
        <div class="cr-cols">
          <div class="cr-col cr-do">
            <div class="cr-col-title">\u2705 VIRAL</div>
            ${(e.carouselRules.dos||[]).map(t=>`<div class="cr-item"><span class="cr-head">${a(t.do)}</span><span class="cr-why">${a(t.why)}</span></div>`).join("")}
          </div>
          <div class="cr-col cr-dont">
            <div class="cr-col-title">\u274C P\xC9SIMO</div>
            ${(e.carouselRules.donts||[]).map(t=>`<div class="cr-item"><span class="cr-head">${a(t.dont)}</span><span class="cr-why">${a(t.why)}</span></div>`).join("")}
          </div>
        </div>
        <div class="cr-format-title">\u{1F4D0} Formato validado de ${(e.carouselRules.validatedFormat||[]).length} slides</div>
        <div class="cr-slides">
          ${(e.carouselRules.validatedFormat||[]).map(t=>`
            <div class="cr-slide cr-role-${a(t.role)}">
              <span class="cr-slide-n">${t.slide}</span>
              <span class="cr-slide-purpose">${a(t.purpose)}</span>
              <span class="cr-slide-w">${a(t.textWeight)}</span>
            </div>`).join("")}
        </div>
        ${e.carouselRules.dimensions?`<div class="ab-aud-angle">\u{1F4CF} ${a(e.carouselRules.dimensions.note||"")} Recomendado: ${e.carouselRules.dimensions.recommended.w}\xD7${e.carouselRules.dimensions.recommended.h} (${a(e.carouselRules.dimensions.recommended.aspect)})</div>`:""}
      </div>
    </details>`:""}

    </div>
  </details>
  <style>
    .ab-brain-outer{background:var(--card,var(--bg-2,#111));border:1px solid var(--border);border-radius:14px;margin-top:16px;overflow:hidden;}
    .ab-brain-outer > summary{cursor:pointer;list-style:none;padding:14px 16px;user-select:none;display:flex;flex-direction:column;gap:2px;}
    .ab-brain-outer > summary::-webkit-details-marker{display:none;}
    .ab-brain-outer > summary:hover{background:var(--bg,rgba(255,255,255,.03));}
    .ab-brain-outer[open] > summary{border-bottom:1px solid var(--border);}
    .ab-brain-body{padding:14px 16px;}
    .ab-brain-title{font-size:14px;font-weight:800;color:var(--text-primary,var(--fg));}
    .ab-brain-sub{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
    .ab-error{color:#f87171;padding:10px;font-size:13px;}
    .ab-section{border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden;}
    .ab-section > summary{cursor:pointer;list-style:none;padding:10px 13px;font-size:13.5px;font-weight:700;color:var(--text-primary,var(--fg));user-select:none;display:flex;align-items:center;gap:6px;}
    .ab-section > summary::-webkit-details-marker{display:none;}
    .ab-section-body{padding:4px 13px 13px;display:flex;flex-direction:column;gap:9px;}
    /* Hooks */
    .ab-hook-row{padding:8px 10px;border-radius:8px;background:var(--bg,var(--bg-1,#0a0a0a));border:1px solid var(--border);}
    .ab-hook-top{border-color:#a855f7;box-shadow:0 0 0 1px #a855f760;}
    .ab-hook-verbal{font-size:14px;font-weight:700;color:var(--text-primary,var(--fg));display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .ab-hook-meta{margin-top:5px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
    .ab-hook-screen{font-size:11.5px;background:#1e1b4b;color:#a5b4fc;padding:2px 7px;border-radius:5px;}
    .ab-hook-visual{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
    .ab-hook-score{font-size:11.5px;font-weight:800;color:#a855f7;margin-left:auto;}
    .ab-badge{font-size:10px;background:#a855f7;color:#fff;padding:1px 6px;border-radius:5px;font-weight:800;}
    /* Captions */
    .ab-caption-block{padding:8px 10px;border-radius:8px;background:var(--bg,var(--bg-1,#0a0a0a));border:1px solid var(--border);}
    .ab-caption-fmt{font-size:11.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));margin-bottom:4px;display:flex;align-items:center;gap:8px;}
    .ab-caption-text{font-size:13px;color:var(--text-primary,var(--fg));line-height:1.55;white-space:pre-wrap;}
    .ab-hook-highlight{color:#a855f7;font-weight:700;}
    .ab-cta-list{display:flex;flex-direction:column;gap:5px;margin-top:4px;}
    .ab-cta{font-size:12.5px;background:var(--border);padding:4px 10px;border-radius:6px;color:var(--text-primary,var(--fg));}
    /* Copy */
    .ab-copy{background:none;border:1px solid var(--border);border-radius:5px;padding:2px 7px;font-size:11px;cursor:pointer;color:var(--text-secondary,var(--fg-2));transition:background .15s;}
    .ab-copy:hover{background:var(--border);}
    /* Hashtags */
    .ab-ht-group{display:flex;flex-direction:column;gap:5px;}
    .ab-ht-label{font-size:11.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));display:flex;align-items:center;gap:8px;}
    .ab-ht-recommended{padding:8px;background:var(--bg,#0a0a0a);border-radius:8px;border:1px solid #a855f740;}
    .ab-ht-tags{display:flex;flex-wrap:wrap;gap:5px;}
    .ab-ht{font-size:11.5px;background:var(--border);padding:2px 8px;border-radius:5px;color:var(--text-primary,var(--fg));}
    .ab-ht-strategy{font-size:11px;color:var(--text-tertiary,var(--fg-3));margin-top:4px;}
    /* Ideas */
    .ab-idea{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);}
    .ab-idea:last-child{border-bottom:none;}
    .ab-idea-n{font-size:18px;font-weight:900;color:#a855f7;min-width:22px;}
    .ab-idea-concept{font-size:13.5px;font-weight:700;color:var(--text-primary,var(--fg));margin-bottom:4px;}
    .ab-idea-meta{display:flex;gap:6px;flex-wrap:wrap;}
    /* Tags */
    .ab-tag{font-size:11px;background:var(--border);padding:2px 7px;border-radius:5px;color:var(--text-primary,var(--fg));}
    .ab-tag-green{background:#064e3b;color:#6ee7b7;}
    .ab-tag-blue{background:#1e3a5f;color:#93c5fd;}
    .ab-tag-purple{background:#2e1065;color:#c4b5fd;}
    /* Week */
    .ab-week{display:flex;flex-direction:column;gap:5px;}
    .ab-week-row{display:grid;grid-template-columns:90px 80px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
    .ab-week-row:last-child{border-bottom:none;}
    .ab-week-day{font-weight:800;color:var(--text-primary,var(--fg));}
    .ab-week-fmt{color:#a855f7;font-weight:700;}
    .ab-week-angle{color:var(--text-secondary,var(--fg-2));}
    /* Audience */
    .ab-aud-block{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
    .ab-aud-block strong{font-size:12px;color:var(--text-secondary,var(--fg-2));min-width:80px;}
    .ab-aud-angle{font-size:12.5px;color:var(--text-secondary,var(--fg-2));font-style:italic;padding:6px 8px;border-left:2px solid #a855f7;margin-top:4px;}
    /* Trends */
    .ab-trends{display:flex;flex-wrap:wrap;gap:6px;}
    .ab-trend{font-size:12px;background:linear-gradient(135deg,#2e1065,#1e1b4b);color:#c4b5fd;padding:3px 10px;border-radius:6px;}
    /* Storytelling beats */
    .ab-beat{display:grid;grid-template-columns:100px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
    .ab-beat:last-child{border-bottom:none;}
    .ab-beat-label{font-weight:800;color:#a855f7;}
    .ab-beat-label em{font-weight:400;color:var(--text-tertiary,var(--fg-3));font-style:normal;}
    .ab-beat-text{color:var(--text-primary,var(--fg));}
    /* Timing */
    .ab-timing{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--text-primary,var(--fg));}
    /* Loading placeholder */
    .ab-loading{padding:14px;text-align:center;font-size:13px;color:var(--text-secondary,var(--fg-2));}
    /* Copywriting frameworks */
    .ab-fw-block{border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--bg,#0a0a0a);}
    .ab-fw-name{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#a855f7;margin-bottom:7px;}
    .ab-fw-steps{display:flex;flex-direction:column;gap:5px;margin-top:6px;}
    .ab-fw-step{display:grid;grid-template-columns:110px 1fr;gap:8px;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--border);}
    .ab-fw-step:last-child{border-bottom:none;}
    .ab-fw-step-label{font-weight:800;color:var(--text-secondary,var(--fg-2));font-size:11px;}
    .ab-obj{color:#f87171;}
    .ab-obj-flip{color:#6ee7b7;font-size:12px;}
    /* Pillars */
    .ab-pillar{padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg,#0a0a0a);}
    .ab-pillar-name{font-size:13.5px;font-weight:800;color:var(--text-primary,var(--fg));margin-bottom:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .ab-pillar-sub{display:flex;flex-wrap:wrap;gap:5px;}
    /* Andr\xF3meda */
    .and-insight{font-size:12px;color:var(--text-secondary,var(--fg-2));background:var(--bg,#0a0a0a);padding:8px 10px;border-radius:8px;border-left:3px solid #a855f7;margin-bottom:10px;}
    .and-featured-title{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#a855f7;margin-bottom:8px;}
    .and-combo{border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--bg,#0a0a0a);display:flex;flex-direction:column;gap:6px;}
    .and-combo-top{border-color:#a855f7;box-shadow:0 0 0 1px #a855f750;}
    .and-combo-header{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .and-angle{font-size:12.5px;font-weight:800;color:#c4b5fd;background:#2e1065;padding:2px 8px;border-radius:5px;}
    .and-persona{font-size:12.5px;font-weight:800;color:#6ee7b7;background:#064e3b;padding:2px 8px;border-radius:5px;}
    .and-format{font-size:12.5px;font-weight:800;color:#93c5fd;background:#1e3a5f;padding:2px 8px;border-radius:5px;}
    .and-sep{font-size:10px;color:var(--text-tertiary,var(--fg-3));font-weight:900;}
    .and-meta{display:flex;gap:6px;flex-wrap:wrap;}
    .and-conv{background:#78350f;color:#fde68a;}
    .and-hook{font-size:13.5px;font-weight:800;color:var(--text-primary,var(--fg));display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-style:italic;}
    .and-body{font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.55;}
    .and-details{display:flex;gap:12px;font-size:11.5px;color:var(--text-tertiary,var(--fg-3));flex-wrap:wrap;}
    .and-cta{font-size:12px;color:var(--text-primary,var(--fg));display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .and-why{font-size:11.5px;color:#6ee7b7;background:#064e3b30;padding:4px 8px;border-radius:5px;}
    .and-fmt-hint{font-size:11px;color:var(--text-tertiary,var(--fg-3));font-style:italic;}
    .and-extras{border:1px solid var(--border);border-radius:8px;overflow:hidden;}
    .and-extras > summary{cursor:pointer;list-style:none;padding:8px 12px;font-size:12.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));user-select:none;}
    .and-extras > summary::-webkit-details-marker{display:none;}
    .and-extras-grid{padding:8px 12px;display:flex;flex-wrap:wrap;gap:5px;}
    .and-extra-pill{display:flex;align-items:center;gap:4px;background:var(--bg,#0a0a0a);border:1px solid var(--border);border-radius:6px;padding:3px 8px;}
    .and-angle-sm{font-size:11px;color:#c4b5fd;}
    .and-persona-sm{font-size:11px;color:#6ee7b7;}
    .and-format-sm{font-size:11px;color:#93c5fd;}
    .and-angles-grid{padding:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;}
    .and-angle-card,.and-persona-card{border:1px solid var(--border);border-radius:8px;padding:8px;background:var(--bg,#0a0a0a);}
    .and-angle-name{font-size:12.5px;font-weight:800;color:var(--text-primary,var(--fg));margin-bottom:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .and-angle-desc{font-size:11.5px;color:var(--text-secondary,var(--fg-2));margin-bottom:5px;line-height:1.4;}
    /* Canvas Specs */
    .cs-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--text-secondary,var(--fg-2));margin-bottom:10px;}
    .cs-legend span{display:flex;align-items:center;gap:4px;}
    .cs-dot{width:9px;height:9px;border-radius:2px;display:inline-block;}
    .cs-red{background:#ef4444;}.cs-amber{background:#f59e0b;}.cs-green{background:#10b981;}.cs-blue{background:transparent;border:1.5px dashed #3b82f6;}
    .cs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
    .cs-card{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--bg,#0a0a0a);display:flex;flex-direction:column;gap:6px;align-items:center;}
    .cs-card-title{font-size:12px;font-weight:800;color:var(--text-primary,var(--fg));text-align:center;}
    .cs-diagram-wrap{display:flex;align-items:center;gap:8px;}
    .cs-svg{border-radius:4px;flex-shrink:0;}
    .cs-dims{display:flex;flex-direction:column;}
    .cs-dim-main{font-size:13px;font-weight:900;color:#a855f7;}
    .cs-dim-aspect{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
    .cs-tip{font-size:10.5px;color:var(--text-secondary,var(--fg-2));line-height:1.4;text-align:center;}
    .cs-visible{font-size:10.5px;color:#93c5fd;}
    .cs-margins{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
    /* Carousel viral rules */
    .cr-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    @media(max-width:560px){.cr-cols{grid-template-columns:1fr;}}
    .cr-col{border-radius:10px;padding:10px;}
    .cr-do{background:#064e3b22;border:1px solid #10b98150;}
    .cr-dont{background:#7f1d1d22;border:1px solid #ef444450;}
    .cr-col-title{font-size:12px;font-weight:900;margin-bottom:8px;}
    .cr-do .cr-col-title{color:#6ee7b7;}.cr-dont .cr-col-title{color:#fca5a5;}
    .cr-item{margin-bottom:8px;}
    .cr-head{display:block;font-size:12.5px;font-weight:700;color:var(--text-primary,var(--fg));}
    .cr-why{display:block;font-size:11px;color:var(--text-secondary,var(--fg-2));line-height:1.4;}
    .cr-format-title{font-size:12px;font-weight:800;color:#a855f7;margin:12px 0 8px;}
    .cr-slides{display:flex;flex-direction:column;gap:4px;}
    .cr-slide{display:grid;grid-template-columns:28px 1fr 44px;gap:8px;align-items:center;padding:5px 8px;border-radius:6px;background:var(--bg,#0a0a0a);border-left:3px solid var(--border);font-size:12px;}
    .cr-role-hook{border-left-color:#10b981;}.cr-role-interes{border-left-color:#3b82f6;}
    .cr-role-atencion{border-left-color:#a855f7;}.cr-role-practica{border-left-color:#f59e0b;}.cr-role-cta{border-left-color:#ef4444;}
    .cr-slide-n{font-weight:900;color:#a855f7;text-align:center;}
    .cr-slide-purpose{color:var(--text-primary,var(--fg));}
    .cr-slide-w{font-size:9.5px;font-weight:800;color:var(--text-tertiary,var(--fg-3));text-align:right;}
  </style>`},ye=(e,u)=>{e.querySelectorAll(".bj-ig-tab").forEach(n=>{n.addEventListener("click",()=>{const y=n.dataset.tab;e.querySelectorAll(".bj-ig-tab").forEach(h=>h.classList.toggle("active",h===n)),e.querySelectorAll(".bj-ig-tab-panel").forEach(h=>{h.hidden=h.id!==`bj-ig-${y}`})})});const i=n=>e.querySelectorAll(n).forEach(y=>{y.addEventListener("click",async()=>{const h=y.dataset.copy||"";try{await navigator.clipboard.writeText(h),B("\u{1F4CB} Copiado","ok")}catch{B("No se pudo copiar","warn")}})});i(".bj-copy-btn"),i(".ab-copy"),e.querySelectorAll(".bj-auto-action").forEach(n=>{n.addEventListener("click",async()=>{const y=n.dataset.route,h=n.dataset.endpoint;if(y){window.location.hash=`#${y}`;return}if(h){n.disabled=!0;const o=q||"";try{const t=h.includes("hashtags")?{topic:o,format:R?.recommendedFormat?.format||"carrusel",hook:o}:h.includes("ab-tests")?{topic:o,contentType:R?.recommendedFormat?.format||"carrusel",variantCount:2}:{},z=await(await fetch(h,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(t)})).json().catch(()=>({}));if(h.includes("hashtags")&&z.total){try{await navigator.clipboard.writeText(z.total.join(" "))}catch{}B(`\u2705 ${z.total.length} hashtags copiados`,"ok")}else B("\u2705 Listo","ok")}catch{B("Error al ejecutar acci\xF3n","err")}n.disabled=!1}})});const k=e.querySelector("#bj-recalc");k&&k.addEventListener("click",()=>{R=null,ee=null,ie(e,u)});const m=e.querySelector("#bj-forge");m&&m.addEventListener("click",async()=>{if(!q){B("Escrib\xED un tema primero","warn");return}m.disabled=!0,m.textContent="\u2728 Generando contenido...";try{const y={reels:"reel",stories:"story",video:"reel",photo:"carousel",carousel:"carousel",feed:"carousel"}[R?.recommendedFormat?.format]||"carousel",h=await fetch("/api/forge/content",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({format:y,topic:q,platform:u,goal:N})});if(!h.ok){const z=await h.json().catch(()=>({}));B(z.error==="quota-exceeded"?"Llegaste al l\xEDmite \u2014 upgrade en /pricing":z.message||"Fall\xF3 generaci\xF3n","err"),m.disabled=!1,m.textContent="\u2728 Generar contenido completo";return}const o=await h.json();ee=o.prediction,B(`\u2705 Contenido generado \xB7 Score viral ${o.prediction.viralScore}/100`,"ok");const t=e.querySelector("#bj-pred-overlay");t&&t.remove(),e.insertAdjacentHTML("beforeend",te(o.prediction));const d=e.querySelector("#bj-pred-overlay");d?.querySelector("#bj-pred-close")?.addEventListener("click",()=>d.remove()),m.disabled=!1,m.textContent="\u2728 Generar otro"}catch{B("Error de red","err"),m.disabled=!1,m.textContent="\u2728 Generar contenido completo"}});const w=e.querySelector("#bj-predict");w&&w.addEventListener("click",async()=>{const n=R?.predictions;if(n){ee=n;const d=e.querySelector("#bj-pred-overlay");d&&d.remove(),e.insertAdjacentHTML("beforeend",te(n));const z=e.querySelector("#bj-pred-overlay");z?.querySelector("#bj-pred-close")?.addEventListener("click",()=>z.remove());return}if(!R?.topHook)return;const y=await fetch("/api/predict/virality",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hook:R.topHook.hook,caption:`${R.topHook.hook}

${R.ctaLadder[0]||""}`,hashtags:["#marketing","#ia","#contenido","#growth","#viral","#tips",`#${q.replace(/\s+/g,"")}`],format:R.recommendedFormat.format==="reels"?"reels":R.recommendedFormat.format,platform:u,thumbnail:{hasFace:!0,hasText:!0,highContrast:!0,brightColors:!0}})});if(!y.ok)return;const h=await y.json();ee=h;const o=e.querySelector("#bj-pred-overlay");o&&o.remove(),e.insertAdjacentHTML("beforeend",te(h));const t=e.querySelector("#bj-pred-overlay");t?.querySelector("#bj-pred-close")?.addEventListener("click",()=>t.remove())})},se={instagram:["\u{1F4F8} Agente Instagram analizando algoritmo IG\u2026","\u{1F3A3} Generando hooks para saves + shares\u2026","\u23F0 Calculando ventanas \xF3ptimas de publicaci\xF3n\u2026","\u{1F9E0} Enriqueciendo con IA especialista Instagram\u2026","\u{1F4CA} Corriendo modelos predictivos (Monte Carlo)\u2026","\u{1F3AF} Calculando score de viralidad y an\xE1lisis honesto\u2026"],tiktok:["\u{1F3B5} Agente TikTok analizando se\xF1ales FYP\u2026","\u{1F3A3} Generando hooks para completion rate m\xE1ximo\u2026","\u{1F50A} Evaluando formatos trending y audio\u2026","\u{1F9E0} Enriqueciendo con IA especialista TikTok\u2026","\u{1F4CA} Simulando distribuci\xF3n FYP (alta varianza)\u2026","\u{1F3AF} Calculando probabilidad real de viralidad\u2026"]},ie=async(e,u)=>{const i=e.querySelector("#bj-result-host");if(!i)return;const k=se[u]||se.instagram;let m=0;i.innerHTML=`<div class="bj-loading"><span class="spinner lg"></span><span id="bj-load-msg">${k[0]}</span></div>`;const w=setInterval(()=>{m=(m+1)%k.length;const n=e.querySelector("#bj-load-msg");n&&(n.textContent=k[m])},1200);try{const y=(await oe("/api/brand",null)).data||{},h=await fetch("/api/brujula/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:q||"tu producto",platform:u,goal:N,brandNiche:X||y.niche||"",brandVoice:y.voice||"cercano",brandType:Z||"personal",accountId:Q||""})});if(clearInterval(w),!h.ok){i.innerHTML='<div class="bj-warning">Error generando plan. Reintent\xE1.</div>';return}R=await h.json(),i.innerHTML=ve(R,u),ye(e,u);const t=(await oe("/api/brand",null).catch(()=>({data:{}}))).data||{};fetch("/api/agency/brain/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({topic:q||"tu producto",platform:u,goal:N,niche:X||t.niche||R?._debug?.niche||"",brandVoice:t.voice||"",briefSnippet:R?.briefText||"",accountId:Q||""})}).then(d=>d.json()).then(d=>{const z=e.querySelector("#bj-agency-host");z&&(z.innerHTML=he(d),z.querySelectorAll(".ab-copy").forEach(I=>{I.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(I.dataset.copy||""),B("\u{1F4CB} Copiado","ok")}catch{B("No se pudo copiar","warn")}})}))}).catch(()=>{const d=e.querySelector("#bj-agency-host");d&&(d.innerHTML="")})}catch{clearInterval(w),i.innerHTML='<div class="bj-warning">Error de red. Reintent\xE1.</div>'}},je=()=>`
  <div class="ra-card" id="ra-card">
    <div class="ra-head">
      <div class="ra-emoji">\u{1F916}</div>
      <div>
        <div class="ra-title">Trabajar mi cuenta esta semana</div>
        <div class="ra-sub">1 click \u2192 an\xE1lisis del nicho + aprendizaje de m\xE9tricas + 3 carruseles + drafts de respuestas DM</div>
      </div>
    </div>
    <button class="ra-btn" id="ra-go">\u25B6 Ejecutar todo</button>
    <div id="ra-result" class="ra-result"></div>
  </div>
  <style>
    .ra-card{margin:18px 0;padding:20px;border-radius:16px;background:linear-gradient(135deg,rgba(16,242,176,.10),rgba(59,130,246,.06));border:1px solid rgba(16,242,176,.3);}
    .ra-head{display:flex;gap:14px;align-items:center;margin-bottom:14px;}
    .ra-emoji{font-size:36px;}
    .ra-title{font-weight:900;font-size:16px;color:var(--text-primary,var(--fg));}
    .ra-sub{font-size:12.5px;color:var(--text-secondary,var(--fg-2));margin-top:3px;line-height:1.45;}
    .ra-btn{width:100%;padding:14px;background:linear-gradient(135deg,#10F2B0,#3B82F6);color:#0A0A0F;border:none;border-radius:10px;font-weight:900;font-size:14px;cursor:pointer;letter-spacing:1px;}
    .ra-btn:hover{filter:brightness(1.08);}
    .ra-btn:disabled{opacity:.6;cursor:wait;}
    .ra-result{margin-top:14px;}
    .ra-timeline{padding:10px 12px;border-radius:8px;background:#070710;border:1px solid var(--border);font-family:"SF Mono",Menlo,monospace;font-size:12px;line-height:1.65;color:#E5E7EB;max-height:240px;overflow-y:auto;}
    .ra-tl-row{display:grid;grid-template-columns:50px 20px 1fr;gap:8px;padding:2px 0;}
    .ra-tl-row.warn{color:#FBBF24;}.ra-tl-row.fail{color:#FCA5A5;}
    .ra-grp{margin-top:14px;}
    .ra-grp-title{font-size:13px;font-weight:800;color:#a855f7;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
    .ra-day{padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;background:var(--bg,rgba(255,255,255,.02));}
    .ra-day-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
    .ra-day-name{font-weight:800;color:#10F2B0;font-size:12.5px;}
    .ra-day-score{font-size:11.5px;color:#a78bfa;}
    .ra-day-hook{font-size:13.5px;color:var(--text-primary,var(--fg));font-weight:600;margin-bottom:8px;}
    .ra-dm{padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--bg,rgba(255,255,255,.02));}
    .ra-dm-intent{display:inline-block;padding:2px 8px;background:rgba(168,85,247,.15);color:#A78BFA;font-size:10.5px;font-weight:800;border-radius:5px;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;}
    .ra-dm-reply{font-size:13px;color:var(--text-primary,var(--fg));line-height:1.5;}
  </style>`,$e=()=>`
  ${je()}
  <details class="bj-card bj-studio bj-studio-collapsed">
    <summary class="bj-studio-summary">\u{1F6E0}\uFE0F M\xE1s herramientas <span class="bj-studio-sub">visi\xF3n de feed \xB7 auto-publicar \xB7 m\xE9tricas \xB7 conectar IG/TikTok</span></summary>

    <details class="bj-studio-panel">
      <summary>\u{1F441}\uFE0F Analizar mi feed (Computer Vision)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Sub\xED 1-9 capturas de tu feed/posts. La IA eval\xFAa coherencia visual, detecta huecos y te dice qu\xE9 publicar.</p>
        <input type="file" id="bj-vision-files" class="bj-file" accept="image/*" multiple />
        <button class="bj-btn bj-btn-secondary" id="bj-vision-go">Analizar feed</button>
        <div id="bj-vision-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F50D} Aprender de una cuenta exitosa</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Sub\xED captura del perfil/feed de un referente de tu nicho. Extrae patrones replicables (sin copiar literal).</p>
        <input type="file" id="bj-learn-files" class="bj-file" accept="image/*" multiple />
        <button class="bj-btn bj-btn-secondary" id="bj-learn-go">Analizar referente</button>
        <div id="bj-learn-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F517} Conectar Instagram / TikTok (publicar + m\xE9tricas reales)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Conect\xE1 tus cuentas v\xEDa API oficial para auto-publicar y traer m\xE9tricas reales autom\xE1ticamente. Requiere apps de Meta/TikTok configuradas.</p>
        <div id="bj-connect-status" class="bj-studio-result">\u23F3 Cargando estado\u2026</div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F4CA} Cargar resultados de un post (loop de aprendizaje)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Carg\xE1 las m\xE9tricas reales de un post publicado. El sistema aprende qu\xE9 funciona y ajusta tu estrategia.</p>
        <input id="bj-m-topic" class="bj-input bj-input-sm" type="text" placeholder="Tema del post" />
        <div class="bj-metric-grid">
          <select id="bj-m-format" class="bj-input bj-input-sm">
            <option value="reel">Reel</option><option value="carousel">Carrusel</option><option value="story">Historia</option>
          </select>
          <input id="bj-m-reach" class="bj-input bj-input-sm" type="number" placeholder="Alcance" />
          <input id="bj-m-saves" class="bj-input bj-input-sm" type="number" placeholder="Guardados" />
          <input id="bj-m-shares" class="bj-input bj-input-sm" type="number" placeholder="Compartidos" />
          <input id="bj-m-comments" class="bj-input bj-input-sm" type="number" placeholder="Comentarios" />
          <input id="bj-m-follows" class="bj-input bj-input-sm" type="number" placeholder="Follows" />
        </div>
        <button class="bj-btn bj-btn-secondary" id="bj-m-go">Guardar y aprender</button>
        <div id="bj-m-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F3A8} Brand Studio \u2014 Imagen de marca con tu foto</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Sub\xED tu(s) foto(s) autorizada(s). La IA las usa como protagonista, aplica tu estilo, colores de marca y elementos del nicho. Motor: Gemini nano-banana (foto\u2192imagen).</p>
        <input type="file" id="bs-files" class="bj-file" accept="image/*" multiple />
        <select id="bs-template" class="bj-input bj-input-sm">
          <option value="anuncio-ganador">\u{1F3C6} Anuncio ganador</option>
          <option value="carrusel">\u{1F3A0} Carrusel seamless</option>
          <option value="portada-reel">\u{1F3AC} Portada de Reel</option>
          <option value="branding">\u{1F3A8} Identidad visual / Branding</option>
          <option value="producto-mockup">\u{1F4E6} Mockup de producto</option>
        </select>
        <input id="bs-titulo" class="bj-input bj-input-sm" type="text" placeholder="T\xEDtulo principal / producto (ej: CarouselCode)" />
        <div class="bj-metric-grid">
          <select id="bs-estilo" class="bj-input bj-input-sm">
            <option value="premium">Premium</option>
            <option value="moderno">Moderno</option>
            <option value="minimalista">Minimalista</option>
            <option value="editorial">Editorial</option>
            <option value="oscuro-glow">Oscuro con glow</option>
            <option value="colorido-genz">Colorido Gen-Z</option>
            <option value="corporativo">Corporativo</option>
            <option value="organico">Org\xE1nico</option>
          </select>
          <input id="bs-colores" class="bj-input bj-input-sm" type="text" placeholder="Colores marca (ej: verde menta, negro)" />
          <select id="bs-formato" class="bj-input bj-input-sm">
            <option value="carousel">Carrusel 3:4</option>
            <option value="reel">Reel/Portada 9:16</option>
            <option value="sponsored-feed">Sponsored 4:5</option>
            <option value="profile">Perfil 1:1</option>
          </select>
        </div>
        <input id="bs-elementos" class="bj-input bj-input-sm" type="text" placeholder="Elementos visibles del nicho (ej: laptop, gr\xE1ficos, dashboards)" />
        <label style="font-size:12px;color:var(--text-secondary,var(--fg-2));display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="bs-refine" /> \u2728 Refinar calidad (FAL upscaler 2x \u2014 m\xE1s n\xEDtido, tarda m\xE1s)</label>
        <button class="bj-btn bj-btn-secondary" id="bs-build">\u{1F441}\uFE0F Ver prompt</button>
        <button class="bj-btn bj-btn-secondary" id="bs-go">\u2728 Generar imagen</button>
        <div id="bs-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F9E0} Aprender de mi cuenta (sin subir nada)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El sistema <b>se conecta a tu Instagram</b> (via Meta Graph API) y <b>TikTok</b> (si est\xE1n conectados en el panel "\u{1F517} Conectar Instagram/TikTok"), trae los \xFAltimos posts con sus m\xE9tricas reales, detecta <b>patrones ganadores</b> (formato, hook, horario) y los inyecta autom\xE1ticamente en TODAS las pr\xF3ximas generaciones. NO necesit\xE1s subir nada manualmente.</p>
        <button class="bj-btn bj-btn-secondary" id="fb-go">\u{1F9E0} Analizar y aprender</button>
        <div id="fb-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F9EC} Gstack \u2014 Decisi\xF3n inteligente (meta-controller)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Describ\xED tu objetivo en lenguaje libre. El meta-controller elige <b>archetype + mood + roles IA</b> \xF3ptimos y ejecuta el m\xF3dulo correcto (carrusel/reel/historia/comunidad).</p>
        <textarea id="gs-task" class="bj-input bj-input-sm" rows="2" placeholder='Ej: "Lanz\xE1 un carrusel para vender mi curso" o "Respond\xE9 este DM"'></textarea>
        <div class="bj-metric-grid">
          <select id="gs-format" class="bj-input bj-input-sm">
            <option value="">Auto-detectar formato</option>
            <option value="carousel">Carrusel</option>
            <option value="reel">Reel</option>
            <option value="story">Historia</option>
          </select>
          <input id="gs-colors" class="bj-input bj-input-sm" type="text" placeholder="Colores marca (opcional)" />
        </div>
        <button class="bj-btn bj-btn-secondary" id="gs-go">\u{1F9EC} Ejecutar Gstack</button>
        <div id="gs-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F4AC} Community Brain \u2014 CM inteligente (cultura \xB7 hilo \xB7 humor \xB7 contexto)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El sistema <b>analiza profundo en 5 pasos</b>: autor (pa\xEDs, hilo previo), contexto del post, intent + emoci\xF3n + complejidad, razona la respuesta y la ajusta a la cultura regional. Usa humor solo cuando corresponde. Spam/troll \u2192 ignora sin gastar IA.</p>
        <div class="bj-tabs" style="display:flex;gap:6px;margin-bottom:6px;">
          <button class="bj-btn bj-btn-secondary bj-tab-btn" data-ce="dm" style="flex:1;padding:6px;font-size:12px;">\u{1F4E8} DM</button>
          <button class="bj-btn bj-btn-ghost bj-tab-btn" data-ce="comment" style="flex:1;padding:6px;font-size:12px;">\u{1F4AD} Comentario</button>
        </div>
        <input id="ce-sender" class="bj-input bj-input-sm" type="text" placeholder="@handle del autor (opcional pero mejora an\xE1lisis y hilo)" />
        <textarea id="ce-input" class="bj-input bj-input-sm" rows="3" placeholder="Peg\xE1 el DM/comentario recibido\u2026"></textarea>
        <input id="ce-context" class="bj-input bj-input-sm" type="text" placeholder="Contexto del post (solo comentarios, opcional)" style="display:none;" />
        <button class="bj-btn bj-btn-secondary" id="ce-go">\u{1F9E0} Analizar y responder</button>
        <div id="ce-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F4F1} Historias visuales (5 frames 9:16 con stickers)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Genera <b>5 frames visuales</b> (1080\xD71920) con texto vectorial, stickers (encuesta/pregunta/slider/quiz/link) y good-zones de IG respetadas. Toc\xE1 un frame para ampliar.</p>
        <input type="file" id="se-file" class="bj-file" accept="image/*" />
        <div class="bj-metric-grid">
          <input id="se-colors" class="bj-input bj-input-sm" type="text" placeholder="Colores marca (ej: negro, menta)" />
          <select id="se-archetype" class="bj-input bj-input-sm">
            <option value="cercano">Cercano</option>
            <option value="educador">Educador</option>
            <option value="humorista">Humorista</option>
            <option value="autoridad">Autoridad</option>
            <option value="vendedor">Vendedor</option>
          </select>
          <input id="se-count" class="bj-input bj-input-sm" type="number" min="3" max="8" placeholder="Cantidad (3-8)" value="5" />
        </div>
        <button class="bj-btn bj-btn-secondary" id="se-go">\u{1F4F1} Generar historias</button>
        <div id="se-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F9EC} Niche Intelligence (estudio profundo del nicho + audiencia)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El sistema corre <b>5 an\xE1lisis encadenados</b> (nicho profundo + perfil audiencia + mapa competitivo + oportunidades + s\xEDntesis con 3 roles IA) y cachea 7 d\xEDas. Despu\xE9s se inyecta autom\xE1ticamente en cada generaci\xF3n.</p>
        <button class="bj-btn bj-btn-secondary" id="bj-intel-go">\u{1F9EC} Correr an\xE1lisis profundo</button>
        <div id="bj-intel-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F3A8} Conectar Canva (slides PRO con brand template)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Si conect\xE1s Canva, el carrusel usa tu <b>brand template oficial</b> (calidad pro, fuentes reales) en vez del composer SVG. Si no, el sistema usa el composer interno (tambi\xE9n legible, auto-fit safe-zones).</p>
        <div id="bj-canva-status" class="bj-studio-result">\u23F3 Cargando estado de Canva\u2026</div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F916} Piloto autom\xE1tico (crear + publicar solo)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El cerebro elige el mejor \xE1ngulo, escribe el copy, genera la imagen (con reglas virales) y \u2014 si tu cuenta est\xE1 conectada \u2014 <b>publica v\xEDa API oficial sin que hagas nada</b>. Sin foto = imagen IA; con foto = vos de protagonista.</p>
        <input type="file" id="ap-files" class="bj-file" accept="image/*" multiple />
        <div class="bj-metric-grid">
          <select id="ap-format" class="bj-input bj-input-sm">
            <option value="carousel">Carrusel</option>
            <option value="reel">Reel/Portada</option>
          </select>
          <input id="ap-colores" class="bj-input bj-input-sm" type="text" placeholder="Colores marca" />
          <input id="ap-elementos" class="bj-input bj-input-sm" type="text" placeholder="Elementos del nicho" />
        </div>
        <label style="font-size:12px;color:var(--text-secondary,var(--fg-2));display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="ap-publish" /> \u{1F680} Auto-publicar (requiere cuenta conectada arriba)</label>
        <button class="bj-btn bj-btn-secondary" id="ap-go">\u{1F916} Crear post aut\xF3nomo</button>
        <div id="ap-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>\u{1F3DB}\uFE0F Consejo de agencia (6 agentes IA)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Orquesta 6 especialistas (research de nicho, audiencia, hooks, sonidos, visuales, estrategia) sobre el tema de arriba. M\xE1s profundo, usa m\xE1s IA.</p>
        <button class="bj-btn bj-btn-secondary" id="bj-council-go">Convocar consejo</button>
        <div id="bj-council-result" class="bj-studio-result"></div>
      </div>
    </details>
  </details>
  <style>
    .bj-studio{margin-top:12px;}
    .bj-studio-collapsed{padding:0;overflow:hidden;}
    .bj-studio-summary{cursor:pointer;list-style:none;padding:14px 16px;font-size:14px;font-weight:800;color:var(--text-primary,var(--fg));user-select:none;display:flex;flex-direction:column;gap:2px;}
    .bj-studio-summary::-webkit-details-marker{display:none;}
    .bj-studio-summary:hover{background:var(--bg,rgba(255,255,255,.03));}
    .bj-studio-collapsed[open] > .bj-studio-summary{border-bottom:1px solid var(--border);}
    .bj-studio-collapsed > *:not(.bj-studio-summary){padding:14px 16px;}
    .bj-studio-title{font-size:15px;font-weight:800;color:var(--text-primary,var(--fg));margin-bottom:12px;}
    .bj-studio-sub{font-weight:400;font-size:12px;color:var(--text-tertiary,var(--fg-3));}
    .bj-studio-panel{border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden;}
    .bj-studio-panel > summary{cursor:pointer;list-style:none;padding:11px 13px;font-size:13.5px;font-weight:700;color:var(--text-primary,var(--fg));user-select:none;}
    .bj-studio-panel > summary::-webkit-details-marker{display:none;}
    .bj-studio-body{padding:0 13px 13px;display:flex;flex-direction:column;gap:9px;}
    .bj-studio-hint{font-size:12px;color:var(--text-secondary,var(--fg-2));margin:0;line-height:1.45;}
    .bj-file{font-size:12px;color:var(--text-secondary,var(--fg-2));}
    .bj-btn-secondary{align-self:flex-start;background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}
    .bj-btn-secondary:disabled{opacity:.6;cursor:wait;}
    .bj-metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
    @media(max-width:600px){.bj-metric-grid{grid-template-columns:repeat(2,1fr);}}
    .bj-studio-result{font-size:13px;color:var(--text-primary,var(--fg));line-height:1.55;}
    .bj-vr-score{display:inline-block;font-weight:800;color:#a855f7;font-size:18px;}
    .bj-vr-block{margin-top:8px;}
    .bj-vr-block b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,var(--fg-3));margin-bottom:3px;}
    .bj-vr-block ul{margin:0;padding-left:18px;}
    .bj-conn-row{display:flex;align-items:center;gap:10px;padding:6px 0;flex-wrap:wrap;}
    .bj-conn-name{font-weight:700;min-width:90px;}
    .bj-conn-ok{color:#10b981;font-size:12.5px;}
    .bj-conn-warn{color:#f59e0b;font-size:12px;}
    .bj-conn-btn{text-decoration:none;padding:6px 14px;font-size:12.5px;}
    .ap-slides{display:flex;gap:8px;overflow-x:auto;padding:6px 0 10px;scroll-snap-type:x mandatory;}
    .ap-slide{position:relative;flex:0 0 auto;width:135px;scroll-snap-align:start;}
    .ap-slide{cursor:zoom-in;transition:transform .15s;}
    .ap-slide:hover{transform:scale(1.03);}
    .ap-slide img{width:135px;height:180px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block;}
    .ap-slide-tag{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.7);color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;}
    /* Lightbox WhatsApp-style */
    .ap-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:apFade .15s ease-out;}
    @keyframes apFade{from{opacity:0;}to{opacity:1;}}
    .ap-lb-close{position:absolute;top:16px;right:18px;background:rgba(255,255,255,.1);color:#fff;border:none;width:42px;height:42px;border-radius:50%;font-size:20px;cursor:pointer;font-weight:700;}
    .ap-lb-close:hover{background:rgba(255,255,255,.2);}
    .ap-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);color:#fff;border:none;width:54px;height:54px;border-radius:50%;font-size:34px;cursor:pointer;line-height:1;}
    .ap-lb-nav:hover:not(:disabled){background:rgba(255,255,255,.25);}
    .ap-lb-nav:disabled{opacity:.25;cursor:not-allowed;}
    .ap-lb-prev{left:16px;}.ap-lb-next{right:16px;}
    .ap-lb-stage{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:90vw;max-height:90vh;}
    .ap-lb-stage img{max-width:90vw;max-height:78vh;width:auto;height:auto;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.6);}
    .ap-lb-meta{color:rgba(255,255,255,.85);font-size:13px;font-weight:600;background:rgba(0,0,0,.5);padding:6px 14px;border-radius:8px;text-align:center;}
    .ap-lb-dl{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#a855f7;color:#fff;text-decoration:none;padding:10px 22px;border-radius:24px;font-size:13px;font-weight:800;}
    .ap-lb-dl:hover{background:#9333ea;}
    @media(max-width:600px){.ap-lb-nav{width:44px;height:44px;font-size:28px;}.ap-lb-stage img{max-height:72vh;}}
  </style>`;export const renderBrujula=async e=>{const u=await le();e.innerHTML=`
    ${de(u)}
    <div class="bj-shell">
      ${ce(u)}
      <div id="bj-result-host"></div>
      ${$e()}
    </div>
    <style>
      .bj-topic-hint{margin-top:8px;padding:8px 12px;background:rgba(168,85,247,.07);border-left:3px solid #a855f7;border-radius:0 8px 8px 0;font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.5;}
      .bj-tip-bar{display:flex;gap:10px;align-items:flex-start;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.20);border-radius:12px;padding:10px 14px;font-size:13px;color:var(--text-primary,var(--fg));line-height:1.45;}
      .bj-tip-icon{font-size:16px;flex-shrink:0;margin-top:1px;}
      .bj-quickwin{background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.25);border-radius:12px;padding:10px 14px;font-size:13px;color:var(--text-primary,var(--fg));}
      .bj-caption-draft{font-size:14px;line-height:1.6;color:var(--text-primary,var(--fg));white-space:pre-wrap;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;padding:10px 12px;margin-top:4px;}
      .bj-copy-btn{font-size:11px;font-weight:700;color:#a855f7;background:transparent;border:1px solid rgba(168,85,247,.3);border-radius:6px;padding:3px 9px;cursor:pointer;font-family:inherit;transition:background .12s;}
      .bj-copy-btn:hover{background:rgba(168,85,247,.08);}
      .bj-outline-step{display:flex;gap:8px;align-items:baseline;padding:5px 0;border-bottom:1px solid var(--border-soft,rgba(17,18,22,.05));}
      .bj-outline-step:last-child{border:0;}
      .bj-outline-n{font-size:11px;font-weight:800;color:#a855f7;background:rgba(168,85,247,.12);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .bj-outline-step span{font-size:13px;color:var(--text-secondary,var(--fg-2));line-height:1.4;}
      .bj-hashtag-section{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;}
      .bj-ht-cat{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,var(--fg-3));min-width:48px;}
      .bj-ht-chip{font-size:12px;padding:3px 9px;border-radius:999px;font-weight:600;}
      .bj-ht-chip.core{background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.25);}
      .bj-ht-chip.niche{background:rgba(168,85,247,.10);color:#c084fc;border:1px solid rgba(168,85,247,.25);}
      .bj-ht-chip.trending{background:rgba(16,185,129,.10);color:#34d399;border:1px solid rgba(16,185,129,.25);}
      .bj-auto-grid{display:flex;flex-wrap:wrap;gap:8px;}
      .bj-auto-primary{flex:1;min-width:200px;margin-top:0;}
      .bj-auto-action{font-size:13px;padding:9px 14px;}
    </style>
    <style>
      .bj-hero{display:flex;gap:16px;align-items:center;padding:24px 28px;border-radius:18px;color:#fff;margin-bottom:18px;box-shadow:0 12px 40px rgba(0,0,0,.18);}
      .bj-hero-emoji{font-size:48px;line-height:1;}
      .bj-hero h1{margin:0;font-size:26px;letter-spacing:-0.02em;}
      .bj-hero p{margin:4px 0 0;font-size:14px;opacity:.92;}
      .bj-shell{display:flex;flex-direction:column;gap:16px;}
      .bj-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:16px;padding:20px 22px;}
      .bj-step-label{font-size:12.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));letter-spacing:-0.005em;margin-bottom:8px;text-transform:uppercase;}
      .bj-input{width:100%;box-sizing:border-box;padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border);border-radius:10px;color:var(--text-primary,var(--fg));font-size:15px;font-family:inherit;outline:none;transition:border-color .15s;}
      .bj-input:focus{border-color:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,.12);}
      .bj-input-sm{padding:9px 12px;font-size:13px;}
      .bj-account-box{margin-top:14px;border:1px dashed var(--border);border-radius:10px;padding:0;overflow:hidden;}
      .bj-account-sum{cursor:pointer;list-style:none;padding:10px 12px;font-size:13px;font-weight:700;color:var(--text-primary,var(--fg));user-select:none;}
      .bj-account-sum::-webkit-details-marker{display:none;}
      .bj-account-hint{font-weight:400;font-size:11px;color:var(--text-tertiary,var(--fg-3));}
      .bj-account-fields{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px;}
      .bj-account-row{display:flex;gap:8px;}
      .bj-account-row > *{flex:1;}
      .bj-goals{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;}
      .bj-goal{display:flex;flex-direction:column;gap:3px;padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.03));border:1.5px solid var(--border);border-radius:10px;cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s,background .15s;}
      .bj-goal:hover{border-color:rgba(168,85,247,.5);}
      .bj-goal.active{border-color:#a855f7;background:rgba(168,85,247,.06);}
      .bj-goal-emoji{font-size:18px;line-height:1;}
      .bj-goal-label{font-size:13px;font-weight:700;color:var(--text-primary,var(--fg));}
      .bj-goal-desc{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
      .bj-btn{padding:12px 18px;border-radius:10px;border:0;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:filter .15s,transform .12s;}
      .bj-btn-primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;width:100%;margin-top:14px;}
      .bj-btn-primary:hover{filter:brightness(1.08);} .bj-btn-primary:active{transform:scale(.985);} .bj-btn-primary:disabled{opacity:.6;cursor:wait;}
      .bj-btn-ghost{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-primary,var(--fg));border:1px solid var(--border);}
      .bj-btn-ghost:hover{background:rgba(17,18,22,.06);}
      .bj-loading{display:flex;align-items:center;gap:10px;padding:30px;justify-content:center;color:var(--text-secondary,var(--fg-2));}
      .bj-result{display:flex;flex-direction:column;gap:14px;}
      .bj-score-strip{display:flex;gap:18px;align-items:center;background:linear-gradient(135deg,rgba(168,85,247,.10),rgba(225,48,108,.08));border:1px solid rgba(168,85,247,.30);border-radius:14px;padding:16px 20px;}
      .bj-score-num{font-size:48px;font-weight:800;background:linear-gradient(135deg,#e1306c,#a855f7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;line-height:1;}
      .bj-score-label strong{display:block;font-size:14px;color:var(--text-primary,var(--fg));}
      .bj-score-label span{font-size:12.5px;color:var(--text-secondary,var(--fg-2));}
      .bj-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      @media (max-width:740px){.bj-grid{grid-template-columns:1fr;}}
      .bj-block{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:16px 18px;}
      .bj-block-label{font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-tertiary,var(--fg-3));margin-bottom:10px;}
      .bj-format-name{font-size:22px;font-weight:800;letter-spacing:-0.02em;}
      .bj-format-fit{font-size:13px;color:#10b981;font-weight:700;margin:4px 0 6px;}
      .bj-format-reason{font-size:12px;color:var(--text-secondary,var(--fg-2));line-height:1.5;}
      .bj-window{font-size:13px;padding:6px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;margin-bottom:4px;color:var(--text-primary,var(--fg));}
      .bj-hook{display:flex;gap:12px;align-items:center;padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;margin-bottom:6px;position:relative;}
      .bj-hook.best{background:linear-gradient(90deg,rgba(168,85,247,.10),transparent);border-left:3px solid #a855f7;}
      .bj-hook-strength{width:36px;height:36px;border-radius:50%;background:conic-gradient(#a855f7 var(--w),rgba(168,85,247,.15) 0);display:grid;place-items:center;flex-shrink:0;font-size:11px;font-weight:800;color:#a855f7;}
      .bj-hook-strength span{background:var(--bg-card,#fff);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;}
      .bj-hook-text{flex:1;font-size:14px;line-height:1.4;color:var(--text-primary,var(--fg));}
      .bj-best-badge{font-size:10px;background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;padding:3px 8px;border-radius:999px;font-weight:800;}
      .bj-checklist-item{display:flex;flex-direction:column;gap:2px;padding:8px 0;border-bottom:1px solid var(--border-soft,rgba(17,18,22,.05));}
      .bj-checklist-item:last-child{border-bottom:0;}
      .bj-checklist-item strong{font-size:12px;color:#a855f7;text-transform:uppercase;letter-spacing:0.03em;}
      .bj-checklist-item span{font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.45;}
      .bj-cta,.bj-angle{font-size:13px;padding:7px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;margin-bottom:4px;color:var(--text-primary,var(--fg));}
      .bj-warning{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.35);border-radius:12px;padding:12px 16px;color:var(--text-primary,var(--fg));font-size:13px;}
      .bj-warning ul{margin:6px 0 0 18px;padding:0;}
      .bj-actions{display:flex;gap:8px;flex-wrap:wrap;}
      .bj-actions .bj-btn-primary{width:auto;margin-top:0;flex:1;min-width:220px;}
      .bj-muted{color:var(--text-tertiary,var(--fg-3));font-size:13px;}
      .bj-pred-overlay{position:fixed;inset:0;z-index:10070;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;animation:bjf .25s ease;}
      @keyframes bjf{from{opacity:0}to{opacity:1}}
      .bj-pred-card{position:relative;background:var(--bg-card,#fff);border-radius:18px;padding:30px;max-width:520px;width:92%;color:var(--text-primary,var(--fg));max-height:88vh;overflow:auto;animation:bju .3s cubic-bezier(.16,.84,.44,1);}
      @keyframes bju{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      .bj-pred-close{position:absolute;top:14px;right:14px;background:transparent;border:0;font-size:18px;cursor:pointer;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-score{display:flex;flex-direction:column;align-items:center;padding:20px;border-radius:14px;margin-bottom:18px;color:#fff;}
      .bj-pred-breakout{background:linear-gradient(135deg,#10b981,#a855f7);}
      .bj-pred-high{background:linear-gradient(135deg,#3b82f6,#a855f7);}
      .bj-pred-solid{background:linear-gradient(135deg,#6366f1,#22d3ee);}
      .bj-pred-mediocre{background:linear-gradient(135deg,#f59e0b,#ef4444);}
      .bj-pred-num{font-size:56px;font-weight:800;letter-spacing:-0.03em;}
      .bj-pred-label{font-size:13px;opacity:.9;}
      .bj-pred-class{font-size:11px;text-transform:uppercase;font-weight:800;letter-spacing:0.08em;margin-top:4px;}
      .bj-pred-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
      .bj-pred-metric{background:var(--bg-soft,rgba(17,18,22,.03));padding:12px;border-radius:10px;text-align:center;}
      .bj-pred-metric strong{display:block;font-size:18px;color:var(--text-primary,var(--fg));}
      .bj-pred-metric span{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-improve{background:rgba(168,85,247,.06);border-left:3px solid #a855f7;border-radius:8px;padding:12px;font-size:12.5px;line-height:1.55;}
      .bj-pred-improve ul{margin:6px 0 0 18px;padding:0;}
      .bj-pred-inline{border:1px solid rgba(168,85,247,.22);background:linear-gradient(135deg,rgba(168,85,247,.04),rgba(99,102,241,.03));}
      .bj-pred-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;align-items:flex-start;}
      .bj-pred-gbox{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:90px;}
      .bj-pred-gauge{width:72px;height:72px;border-radius:50%;background:conic-gradient(#a855f7 var(--vs),rgba(168,85,247,.15) 0);display:grid;place-items:center;}
      .bj-pred-vn{font-size:20px;font-weight:800;color:#a855f7;background:var(--bg-card,#fff);width:56px;height:56px;border-radius:50%;display:grid;place-items:center;}
      .bj-pred-vlbl{font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;}
      .bj-vclass-breakout{color:#10b981;} .bj-vclass-high{color:#3b82f6;} .bj-vclass-solid{color:#a855f7;} .bj-vclass-low{color:#f59e0b;}
      .bj-pred-vceiling{font-size:10px;color:var(--text-tertiary,var(--fg-3));text-align:center;}
      .bj-pred-dbox{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 14px;border-radius:12px;gap:3px;min-width:80px;}
      .bj-d-go{background:rgba(16,185,129,.10);border:1.5px solid rgba(16,185,129,.35);}
      .bj-d-cond{background:rgba(245,158,11,.10);border:1.5px solid rgba(245,158,11,.35);}
      .bj-d-nogo{background:rgba(239,68,68,.10);border:1.5px solid rgba(239,68,68,.35);}
      .bj-pred-dbadge{font-size:15px;font-weight:900;letter-spacing:0.04em;}
      .bj-d-go .bj-pred-dbadge{color:#10b981;} .bj-d-cond .bj-pred-dbadge{color:#f59e0b;} .bj-d-nogo .bj-pred-dbadge{color:#ef4444;}
      .bj-pred-dscore{font-size:13px;font-weight:700;color:var(--text-primary,var(--fg));}
      .bj-pred-dtitle{font-size:9px;color:var(--text-tertiary,var(--fg-3));text-transform:uppercase;letter-spacing:0.04em;}
      .bj-pred-qm{display:flex;gap:8px;flex-wrap:wrap;flex:1;}
      .bj-pred-qmet{display:flex;flex-direction:column;gap:2px;background:var(--bg-soft,rgba(17,18,22,.03));padding:10px 12px;border-radius:10px;min-width:78px;flex:1;}
      .bj-pred-qmet strong{font-size:17px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-qmet span{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-mc{margin-bottom:14px;}
      .bj-pred-mc-title{font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-tertiary,var(--fg-3));margin-bottom:8px;}
      .bj-pred-mcrow{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
      .bj-pred-mclbl{font-size:11px;color:var(--text-secondary,var(--fg-2));min-width:114px;}
      .bj-pred-mcbar{flex:1;height:6px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:3px;overflow:hidden;}
      .bj-pred-mcfill{height:100%;border-radius:3px;transition:width .6s ease;}
      .bj-pred-mcval{font-size:12px;font-weight:700;min-width:50px;text-align:right;}
      .bj-pred-matrix{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;}
      .bj-pred-dim{display:flex;align-items:center;gap:8px;}
      .bj-pred-dimlbl{font-size:11px;color:var(--text-secondary,var(--fg-2));min-width:80px;display:flex;gap:4px;align-items:center;}
      .bj-pred-dimw{font-size:9px;color:var(--text-tertiary,var(--fg-3));background:var(--bg-soft,rgba(17,18,22,.06));padding:1px 4px;border-radius:3px;}
      .bj-pred-dimbar{flex:1;height:8px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:4px;overflow:hidden;}
      .bj-pred-dimsc{font-size:11px;font-weight:700;color:var(--text-secondary,var(--fg-2));min-width:28px;text-align:right;}
      .bj-pred-imps{background:rgba(168,85,247,.05);border-left:3px solid #a855f7;border-radius:0 8px 8px 0;padding:10px 12px;margin-top:10px;}
      .bj-pred-imps-h{display:block;font-size:11px;font-weight:800;color:#a855f7;margin-bottom:6px;}
      .bj-pred-imp{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(168,85,247,.08);}
      .bj-pred-imp:last-child{border-bottom:0;}
      .bj-imp-pri{font-size:9px;font-weight:900;padding:2px 6px;border-radius:999px;flex-shrink:0;text-transform:uppercase;letter-spacing:.04em;}
      .bj-imp-critical .bj-imp-pri{background:rgba(239,68,68,.15);color:#ef4444;}
      .bj-imp-high .bj-imp-pri{background:rgba(245,158,11,.15);color:#f59e0b;}
      .bj-imp-med .bj-imp-pri{background:rgba(99,102,241,.12);color:#818cf8;}
      .bj-imp-body{font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.4;flex:1;min-width:180px;}
      .bj-imp-impact{font-size:10px;font-weight:700;color:#10b981;white-space:nowrap;}
      .bj-pred-metrics-row{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0;}
      .bj-pred-mchip{display:flex;flex-direction:column;align-items:center;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border);border-radius:10px;padding:8px 12px;min-width:70px;flex:1;}
      .bj-pred-mchip strong{font-size:16px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-mchip span{font-size:10px;color:var(--text-tertiary,var(--fg-3));margin-top:2px;}
      .bj-pred-conf{font-size:10.5px;color:var(--text-tertiary,var(--fg-3));background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;padding:6px 10px;margin-bottom:8px;}
      .bj-pred-honest{margin-top:12px;background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.20);border-radius:10px;padding:12px 14px;}
      .bj-pred-honest-h{font-size:11px;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;}
      .bj-pred-verdict{font-size:13px;line-height:1.5;color:var(--text-primary,var(--fg));margin-bottom:10px;font-style:italic;border-left:3px solid #10b981;padding-left:10px;}
      .bj-pred-hgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:10px;}
      .bj-pred-hmet{background:var(--bg-soft,rgba(17,18,22,.03));padding:8px 10px;border-radius:8px;text-align:center;}
      .bj-pred-hmet strong{display:block;font-size:14px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-hmet span{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-factors{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;}
      .bj-pred-factor{font-size:11px;background:rgba(16,185,129,.10);color:#10b981;border:1px solid rgba(16,185,129,.25);padding:3px 9px;border-radius:999px;font-weight:600;}
      .bj-pred-risks{display:flex;flex-wrap:wrap;gap:6px;}
      .bj-pred-risk{font-size:11px;background:rgba(245,158,11,.08);color:#f59e0b;border:1px solid rgba(245,158,11,.25);padding:3px 9px;border-radius:999px;font-weight:600;}
      .bj-pred-disclaimer{margin-top:10px;font-size:11px;color:var(--text-tertiary,var(--fg-3));line-height:1.5;font-style:italic;text-align:center;padding-top:8px;border-top:1px solid var(--border-soft,rgba(17,18,22,.06));}
      /* \u2500\u2500 HookPlans 3-col grid \u2500\u2500 */
      .bj-hp-grid-wrap{background:var(--bg-card,#16171c);border:1px solid rgba(168,85,247,.25);border-radius:16px;padding:16px 18px;}
      .bj-hp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
      @media(max-width:900px){.bj-hp-grid{grid-template-columns:1fr;}}
      .bj-hp-card{border:1.5px solid rgba(255,255,255,.10);border-radius:13px;padding:14px 15px;display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,.03);}
      .bj-hp-card.top{border-color:rgba(168,85,247,.55);background:linear-gradient(160deg,rgba(168,85,247,.09),rgba(225,48,108,.04));}
      .bj-hp-card-top{display:flex;gap:11px;align-items:flex-start;}
      .bj-hp-score{width:48px;height:48px;border-radius:50%;background:conic-gradient(#a855f7 var(--vs),rgba(168,85,247,.18) 0);display:grid;place-items:center;flex-shrink:0;}
      .bj-hp-s-hot{background:conic-gradient(#e1306c var(--vs),rgba(225,48,108,.18) 0);}
      .bj-hp-s-good{background:conic-gradient(#a855f7 var(--vs),rgba(168,85,247,.18) 0);}
      .bj-hp-s-ok{background:conic-gradient(#818cf8 var(--vs),rgba(129,140,248,.18) 0);}
      .bj-hp-score-n{font-size:14px;font-weight:900;color:#c084fc;background:var(--bg-card,#16171c);width:36px;height:36px;border-radius:50%;display:grid;place-items:center;}
      .bj-hp-s-hot .bj-hp-score-n{color:#f472b6;}
      .bj-hp-hook-text{flex:1;font-size:15px;font-weight:700;line-height:1.4;color:#f1f1f5;}
      .bj-hp-layers{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:7px;}
      .bj-hp-lrow{display:flex;gap:7px;align-items:baseline;line-height:1.45;}
      .bj-hp-ltag{font-size:14px;flex-shrink:0;}
      .bj-hp-lrow span:last-child{font-size:13px;color:#c4c4d0;}
      .bj-hp-screen{font-size:12px!important;font-weight:900;color:#e879f9!important;letter-spacing:.07em;text-transform:uppercase;}
      .bj-hp-script-sec{display:flex;flex-direction:column;gap:4px;}
      .bj-hp-sec-h{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#a78bfa;margin-bottom:4px;}
      .bj-hp-apertura{font-size:13px;color:#d4d4e8;background:rgba(99,102,241,.12);border-left:3px solid #818cf8;border-radius:0 8px 8px 0;padding:7px 10px;line-height:1.5;}
      .bj-hp-beat{display:flex;gap:8px;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);}
      .bj-hp-beat:last-of-type{border:0;}
      .bj-hp-bn{font-size:10px;font-weight:900;color:#c084fc;background:rgba(168,85,247,.20);width:20px;height:20px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;}
      .bj-hp-beat span:last-child{font-size:13px;color:#c4c4d0;line-height:1.45;}
      .bj-hp-cierre{font-size:13px;color:#d4d4e8;background:rgba(16,185,129,.10);border-left:3px solid #34d399;border-radius:0 8px 8px 0;padding:7px 10px;line-height:1.5;}
      .bj-hp-cta-box{font-size:13px;background:rgba(16,185,129,.10);border:1.5px solid rgba(52,211,153,.35);border-radius:9px;padding:8px 11px;color:#6ee7b7;font-weight:600;line-height:1.45;margin-top:2px;}
      /* \u2500\u2500 Instagram format tabs \u2500\u2500 */
      .bj-ig-plans-wrap{background:var(--bg-card,#16171c);border:1px solid rgba(225,48,108,.25);border-radius:16px;padding:16px 18px;}
      .bj-ig-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
      .bj-ig-tab{padding:8px 18px;border-radius:999px;border:1.5px solid rgba(255,255,255,.12);background:transparent;color:#c4c4d0;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;}
      .bj-ig-tab:hover{border-color:rgba(225,48,108,.45);color:#f9a8d4;}
      .bj-ig-tab.active{background:linear-gradient(135deg,#e1306c,#a855f7);border-color:transparent;color:#fff;}
      .bj-ig-tab-panel{display:block;}
      .bj-ig-tab-panel[hidden]{display:none;}
      /* Strategy panel (account-aware) */
      .bj-strategy{margin-bottom:16px;border:1px solid rgba(168,85,247,.25);border-radius:14px;background:linear-gradient(135deg,rgba(168,85,247,.06),rgba(225,48,108,.04));overflow:hidden;}
      .bj-strategy-sum{cursor:pointer;list-style:none;padding:12px 14px;font-size:14px;font-weight:800;color:#f1f1f5;display:flex;align-items:center;gap:10px;flex-wrap:wrap;user-select:none;}
      .bj-strategy-sum::-webkit-details-marker{display:none;}
      .bj-strategy-sum::after{content:'\u25BE';margin-left:auto;color:#a78bfa;font-size:12px;transition:transform .2s;}
      .bj-strategy[open] .bj-strategy-sum::after{transform:rotate(180deg);}
      .bj-st-niche{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#a78bfa;background:rgba(168,85,247,.16);border:1px solid rgba(168,85,247,.3);border-radius:20px;padding:2px 10px;}
      .bj-strategy-body{padding:4px 14px 14px;display:flex;flex-direction:column;gap:9px;}
      .bj-st-row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:12.5px;}
      .bj-st-row.col{flex-direction:column;gap:5px;}
      .bj-st-k{flex-shrink:0;min-width:140px;font-weight:800;color:#c9b8f0;}
      .bj-st-v{color:#d4d4e8;line-height:1.5;display:flex;gap:5px;flex-wrap:wrap;}
      .bj-st-chip{font-size:11px;font-weight:600;color:#d4d4e8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:2px 8px;}
      .bj-st-chip.algo{color:#7dd3fc;border-color:rgba(125,211,252,.3);background:rgba(125,211,252,.08);}
      .bj-st-chip.tag{color:#f9a8d4;border-color:rgba(249,168,212,.3);background:rgba(249,168,212,.08);}
      .bj-st-ul{margin:0;padding-left:18px;color:#c4c4d0;line-height:1.55;font-size:12.5px;}
      .bj-st-ul.risk{color:#fca5a5;}
      .bj-st-note{font-size:10px;color:#7878a0;font-style:italic;width:100%;}
      .bj-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;width:100%;}
      @media(max-width:700px){.bj-week{grid-template-columns:repeat(2,1fr);}}
      .bj-week-day{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:7px 8px;}
      .bj-week-d{font-size:11px;font-weight:800;color:#a78bfa;}
      .bj-week-f{font-size:11px;font-weight:700;color:#f9a8d4;}
      .bj-week-a{font-size:10.5px;color:#c4c4d0;line-height:1.3;}
      .bj-week-w{font-size:10px;color:#7878a0;}
      .bj-month summary{cursor:pointer;font-size:12px;font-weight:700;color:#a78bfa;}
      .bj-month-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-top:8px;}
      .bj-month-slot{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:6px 8px;}
      .bj-month-date{font-size:10.5px;font-weight:700;color:#a78bfa;}
      .bj-month-fmt{font-size:11px;font-weight:700;color:#f9a8d4;}
      .bj-month-theme{font-size:10px;color:#c4c4d0;line-height:1.3;}
      @media(max-width:700px){.bj-st-k{min-width:100%;}}
      .bj-ig-fmt-hook{font-size:14px;font-weight:700;color:#f1f1f5;background:rgba(225,48,108,.10);border-left:3px solid #e1306c;border-radius:0 9px 9px 0;padding:8px 12px;margin-bottom:12px;line-height:1.4;}
      .bj-ig-fh-tag{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#f9a8d4;margin-bottom:3px;}
      /* Carrusel header */
      .bj-ig-carousel-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
      .bj-ig-slide-count{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#a78bfa;background:rgba(168,85,247,.18);border:1px solid rgba(168,85,247,.35);border-radius:20px;padding:3px 10px;white-space:nowrap;flex-shrink:0;}
      /* 3-column carousel grid */
      .bj-car-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start;}
      @media(max-width:900px){.bj-car-grid{grid-template-columns:1fr;}}
      .bj-car-col{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}
      .bj-car-col-header{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
      .bj-car-col-num{font-size:11px;font-weight:900;color:#a78bfa;background:rgba(168,85,247,.18);border:1px solid rgba(168,85,247,.3);border-radius:20px;padding:2px 8px;flex-shrink:0;}
      .bj-car-col-angle{font-size:12px;font-weight:700;color:#d4d4e8;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .bj-car-col-count{font-size:10px;color:#5a5a78;font-weight:600;flex-shrink:0;}
      .bj-car-caption{margin-bottom:0;}
      /* Slides */
      .bj-ig-slides{display:flex;flex-direction:column;gap:6px;}
      .bj-ig-slide{display:flex;gap:8px;align-items:flex-start;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:8px 10px;}
      .bj-ig-slide-hook{border-color:rgba(225,48,108,.35);background:rgba(225,48,108,.06);}
      .bj-ig-slide-cta{border-color:rgba(52,211,153,.30);background:rgba(16,185,129,.06);}
      .bj-ig-slide-num{display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;min-width:36px;}
      .bj-ig-slide-n{font-size:11px;font-weight:900;color:#a78bfa;background:rgba(168,85,247,.15);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;}
      .bj-ig-slide-hook .bj-ig-slide-n{color:#f9a8d4;background:rgba(225,48,108,.18);}
      .bj-ig-slide-cta .bj-ig-slide-n{color:#6ee7b7;background:rgba(16,185,129,.18);}
      .bj-ig-slide-nof{font-size:8px;color:#4a4a60;font-weight:600;}
      .bj-ig-slide-role-badge{font-size:8px;font-weight:700;color:#5a5a78;text-align:center;line-height:1.3;max-width:36px;}
      .bj-ig-slide-hook .bj-ig-slide-role-badge{color:#f9a8d4;}
      .bj-ig-slide-cta .bj-ig-slide-role-badge{color:#6ee7b7;}
      .bj-ig-slide-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
      .bj-ig-slide-title{font-size:13px;font-weight:800;color:#f1f1f5;line-height:1.3;letter-spacing:-.01em;}
      .bj-ig-slide-hook .bj-ig-slide-title{color:#fce7f3;}
      .bj-ig-slide-cta .bj-ig-slide-title{color:#6ee7b7;}
      .bj-ig-slide-subtitle{font-size:12px;color:#9898b8;line-height:1.4;}
      .bj-ig-slide-bodytext{font-size:11px;color:#7878a0;line-height:1.5;}
      .bj-ig-slide-imgtext{font-size:10px;color:#e879f9;background:rgba(232,121,249,.10);border:1px solid rgba(232,121,249,.20);border-radius:5px;padding:2px 6px;margin-top:2px;font-weight:600;display:inline-block;}
      .bj-ig-slide-visual{font-size:10px;color:#4a4a68;margin-top:1px;font-style:italic;display:block;}
      /* Caption block */
      .bj-ig-caption-block{background:rgba(225,48,108,.06);border:1px solid rgba(225,48,108,.20);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;flex-direction:column;gap:6px;}
      .bj-ig-caption-row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
      .bj-ig-caption-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#f9a8d4;white-space:nowrap;flex-shrink:0;}
      .bj-ig-caption-text{font-size:14px;font-weight:700;color:#fce7f3;line-height:1.4;}
      .bj-ig-caption-cta{font-size:13px;color:#e9a8c4;line-height:1.4;}
      /* Reel */
      .bj-reel-score-row{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
      .bj-reel-label{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;}
      .bj-reel-hooks-sec{margin-bottom:10px;}
      .bj-reel-hooks-list{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
      .bj-reel-hook-opt{display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:9px 12px;}
      .bj-reel-hook-opt.best{border-color:rgba(168,85,247,.50);background:rgba(168,85,247,.08);}
      .bj-reel-hook-opt-n{font-size:13px;flex-shrink:0;width:22px;text-align:center;margin-top:1px;}
      .bj-reel-hook-opt-body{flex:1;display:flex;flex-direction:column;gap:2px;}
      .bj-reel-hook-text{font-size:14px;font-weight:800;color:#f1f1f5;line-height:1.3;}
      .bj-reel-hook-opt.best .bj-reel-hook-text{color:#e9d5ff;}
      .bj-reel-hook-style{font-size:11px;color:#9ca3af;font-style:italic;}
      .bj-reel-beats{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
      .bj-reel-beat{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.06);}
      .bj-reel-beat-body{flex:1;display:flex;flex-direction:column;gap:3px;}
      .bj-reel-beat-text{font-size:13px;color:#d1d5db;line-height:1.45;}
      .bj-reel-beat-onscreen{font-size:11px;color:#e879f9;font-weight:700;background:rgba(232,121,249,.10);border:1px solid rgba(232,121,249,.20);border-radius:5px;padding:2px 7px;display:inline-block;margin-top:2px;}
      .bj-reel-beat-visual{font-size:11px;color:#6b7280;font-style:italic;}
      .bj-reel-time{font-size:9px;font-weight:800;text-transform:uppercase;color:#818cf8;background:rgba(99,102,241,.15);border-radius:4px;padding:1px 5px;margin-right:6px;}
      /* Stories frames */
      .bj-ig-frames{display:flex;flex-direction:column;gap:7px;}
      .bj-ig-frame{display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;}
      .bj-ig-frame-hook{border-color:rgba(225,48,108,.40);background:rgba(225,48,108,.07);}
      .bj-ig-frame-cta{border-color:rgba(52,211,153,.35);background:rgba(16,185,129,.07);}
      .bj-ig-frame-num{display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;}
      .bj-ig-frame-n{font-size:11px;font-weight:900;color:#a78bfa;background:rgba(168,85,247,.18);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;}
      .bj-ig-frame-hook .bj-ig-frame-n{color:#f9a8d4;background:rgba(225,48,108,.20);}
      .bj-ig-frame-cta .bj-ig-frame-n{color:#6ee7b7;background:rgba(16,185,129,.20);}
      .bj-frame-mediatype{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;text-align:center;max-width:36px;line-height:1.2;}
      .bj-frame-duration{font-size:9px;font-weight:700;color:#6b7280;background:rgba(255,255,255,.07);border-radius:4px;padding:1px 5px;white-space:nowrap;}
      .bj-ig-frame-body{flex:1;display:flex;flex-direction:column;gap:4px;}
      .bj-frame-onscreen{font-size:17px;font-weight:900;color:#f1f1f5;line-height:1.25;letter-spacing:-.01em;}
      .bj-ig-frame-hook .bj-frame-onscreen{color:#fce7f3;}
      .bj-ig-frame-cta .bj-frame-onscreen{color:#d1fae5;}
      .bj-frame-support{font-size:13px;color:#b4b4c8;line-height:1.4;margin-top:2px;}
      .bj-frame-mediadesc{font-size:12px;color:#7c7c90;font-style:italic;margin-top:3px;}
      .bj-ig-frame-sticker{font-size:12px;color:#c084fc;font-weight:700;}
      /* \u2500\u2500 Guion \u2500\u2500 */
      .bj-guion-apertura,.bj-guion-cierre{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:10px;margin-bottom:6px;font-size:13px;color:var(--text-primary,var(--fg));line-height:1.5;}
      .bj-guion-apertura{background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.18);}
      .bj-guion-cierre{background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.20);}
      .bj-guion-badge{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#818cf8;margin-bottom:3px;}
      .bj-guion-badge.bj-guion-cta{color:#10b981;}
      .bj-guion-step{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border-soft,rgba(17,18,22,.05));}
      .bj-guion-step:last-child{border:0;}
      .bj-guion-n{font-size:11px;font-weight:800;color:#a855f7;background:rgba(168,85,247,.12);width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
      .bj-guion-step span{font-size:13px;color:var(--text-secondary,var(--fg-2));line-height:1.45;}
      /* \u2500\u2500 Producci\xF3n \u2500\u2500 */
      .bj-prod-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px;}
      .bj-prod-col{display:flex;flex-direction:column;gap:6px;}
      .bj-prod-col-h{font-size:10px;font-weight:800;color:var(--text-tertiary,var(--fg-3));text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}
      .bj-prod-item{font-size:12.5px;color:var(--text-secondary,var(--fg-2));padding:6px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;line-height:1.4;}
      /* \u2500\u2500 Predicciones minimalistas \u2500\u2500 */
      .bj-pred-minimal{background:var(--bg-card,#fff);border:1px solid rgba(168,85,247,.20);border-radius:14px;padding:16px 18px;}
      .bj-pred-min-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;}
      .bj-pred-min-title{font-size:13px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-min-sub{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-min-row{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px;}
      .bj-pred-min-score{display:flex;flex-direction:column;align-items:center;gap:3px;}
      .bj-pred-min-metrics{display:flex;flex-wrap:wrap;gap:6px;flex:1;}
      .bj-pred-min-met{display:flex;flex-direction:column;align-items:center;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;padding:7px 10px;min-width:60px;flex:1;}
      .bj-pred-min-met strong{font-size:15px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-min-met span{font-size:10px;color:var(--text-tertiary,var(--fg-3));margin-top:2px;}
      .bj-pred-range{margin-bottom:10px;}
      .bj-pred-range-lbl{font-size:10px;font-weight:700;color:var(--text-tertiary,var(--fg-3));text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;}
      .bj-pred-range-bar{position:relative;height:6px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:3px;margin-bottom:5px;}
      .bj-pred-range-fill{height:100%;background:linear-gradient(90deg,#ef4444,#a855f7);border-radius:3px;}
      .bj-pred-range-dot{position:absolute;top:-3px;width:12px;height:12px;background:#a855f7;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 3px rgba(168,85,247,.2);}
      .bj-pred-range-vals{display:flex;justify-content:space-between;font-size:10px;font-weight:700;}
      .bj-pred-verdict-simple{font-size:12.5px;font-style:italic;color:var(--text-secondary,var(--fg-2));border-left:3px solid #10b981;padding-left:10px;margin:10px 0;line-height:1.5;}
    </style>`;const i=e;i.querySelectorAll(".bj-goal").forEach(c=>{c.addEventListener("click",()=>{N=c.dataset.goal,i.querySelectorAll(".bj-goal").forEach(s=>s.classList.toggle("active",s===c))})});const k=i.querySelector("#bj-topic"),m=i.querySelector("#bj-topic-hint");let w=null;const n={instagram:{awareness:"Reels",engagement:"Carrusel",conversion:"Carrusel + Stories",community:"Stories",sales:"Carrusel + Stories"},tiktok:{awareness:"Video",engagement:"Video",conversion:"Video + Stitch",community:"Video",sales:"Video + LIVE"}};k?.addEventListener("input",c=>{q=c.target.value.trim(),clearTimeout(w),q.length>=3&&m?w=setTimeout(()=>{const s=n[u]?.[N]||(u==="instagram"?"Carrusel":"Video");m.textContent=`Para "${q}" en ${u==="instagram"?"Instagram":"TikTok"} con objetivo "${N}" \u2192 formato recomendado: ${s}`,m.style.display="block"},400):m&&(m.style.display="none")}),i.querySelector("#bj-go")?.addEventListener("click",()=>{if(!q){B("Escrib\xED el tema sobre el cual vas a publicar","warn"),k?.focus();return}Q=(i.querySelector("#bj-account")?.value||"").trim(),X=(i.querySelector("#bj-niche")?.value||"").trim(),Z=i.querySelector("#bj-brandtype")?.value||"personal",ie(i,u)}),k?.addEventListener("keydown",c=>{c.key==="Enter"&&(c.preventDefault(),i.querySelector("#bj-go")?.click())});const y=c=>Promise.all([...c||[]].slice(0,9).map(s=>new Promise(v=>{const g=new FileReader;g.onload=()=>v(g.result),g.onerror=()=>v(null),g.readAsDataURL(s)}))).then(s=>s.filter(Boolean)),h=()=>({accountId:(i.querySelector("#bj-account")?.value||"").trim(),niche:(i.querySelector("#bj-niche")?.value||"").trim()}),o=c=>String(c??"").replace(/[&<>]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[s]),t=c=>`<ul>${(c||[]).map(s=>`<li>${o(typeof s=="string"?s:s.idea||s.tactic||JSON.stringify(s))}</li>`).join("")}</ul>`,d=async(c,s,v,g,p)=>{const r=i.querySelector(s)?.files,l=i.querySelector(v);if(!r?.length){l.innerHTML='<span style="color:#f59e0b;">Sub\xED al menos 1 imagen.</span>';return}g.disabled=!0,l.innerHTML="\u23F3 Analizando con visi\xF3n IA\u2026";try{const b=await y(r),{accountId:$,niche:j}=h(),x=await(await fetch(c,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId:$,niche:j,images:b})})).json();if(x.error){l.innerHTML=`<span style="color:#ef4444;">${o(x.message||x.error)}</span>`;return}l.innerHTML=p(x)}catch{l.innerHTML='<span style="color:#ef4444;">Error de red. Reintent\xE1.</span>'}finally{g.disabled=!1}};i.querySelector("#bj-vision-go")?.addEventListener("click",c=>d("/api/account/audit-feed","#bj-vision-files","#bj-vision-result",c.target,s=>`<div><span class="bj-vr-score">${s.coherenceScore??"\u2013"}/100</span> coherencia \xB7 ${o(s.visualStyle||"")} <em style="color:#7878a0;">(${o(s._provider||"ia")})</em></div>
      ${s.weaknesses?.length?`<div class="bj-vr-block"><b>Debilidades</b>${t(s.weaknesses)}</div>`:""}
      ${s.gaps?.length?`<div class="bj-vr-block"><b>Huecos en el feed</b>${t(s.gaps)}</div>`:""}
      ${s.whatToAdd?.length?`<div class="bj-vr-block"><b>Qu\xE9 agregar</b>${t(s.whatToAdd.map(v=>`${v.idea} (${v.format})`))}</div>`:""}`)),i.querySelector("#bj-learn-go")?.addEventListener("click",c=>d("/api/account/learn-competitor","#bj-learn-files","#bj-learn-result",c.target,s=>`${s.visualPatterns?.length?`<div class="bj-vr-block"><b>Patrones visuales</b>${t(s.visualPatterns)}</div>`:""}
      ${s.hookPatterns?.length?`<div class="bj-vr-block"><b>Patrones de hook</b>${t(s.hookPatterns)}</div>`:""}
      ${s.whatYouCanApply?.length?`<div class="bj-vr-block"><b>Aplic\xE1 a tu cuenta</b>${t(s.whatYouCanApply.map(v=>`${v.tactic}: ${v.how}`))}</div>`:""}
      ${s.avoid?.length?`<div class="bj-vr-block"><b>No copies</b>${t(s.avoid)}</div>`:""}`)),i.querySelector("#bj-m-go")?.addEventListener("click",async c=>{const s=i.querySelector("#bj-m-result"),{accountId:v}=h();if(!v){s.innerHTML='<span style="color:#f59e0b;">Pon\xE9 tu @cuenta arriba (en "Mi cuenta") para activar la memoria.</span>';return}const g=r=>{const l=i.querySelector(r)?.value;return l===""||l==null?null:Number(l)},p={topic:i.querySelector("#bj-m-topic")?.value||"",format:i.querySelector("#bj-m-format")?.value||"reel",reach:g("#bj-m-reach"),saves:g("#bj-m-saves"),shares:g("#bj-m-shares"),comments:g("#bj-m-comments"),follows:g("#bj-m-follows")};c.target.disabled=!0,s.innerHTML="\u23F3 Guardando\u2026";try{const b=(await(await fetch("/api/account/metrics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId:v,entry:p})})).json()).insights||{};s.innerHTML=`<div style="color:#10b981;">\u2713 Guardado. Posts trackeados: ${b.postsTracked??0}</div>
        ${b.bestFormat?`<div class="bj-vr-block"><b>Mejor formato</b>${o(b.bestFormat)} \xB7 tendencia: ${o(b.trend||"")}</div>`:""}
        ${b.recommendations?.length?`<div class="bj-vr-block"><b>Recomendaciones</b>${t(b.recommendations)}</div>`:""}`}catch{s.innerHTML='<span style="color:#ef4444;">Error de red. Reintent\xE1.</span>'}finally{c.target.disabled=!1}}),i.querySelector("#bj-council-go")?.addEventListener("click",async c=>{const s=i.querySelector("#bj-council-result");if(!q){s.innerHTML='<span style="color:#f59e0b;">Escrib\xED un tema arriba primero.</span>';return}const{niche:v}=h();c.target.disabled=!0,s.innerHTML="\u23F3 Convocando 6 agentes\u2026 (puede tardar)";try{const p=await(await fetch("/api/growth/council/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:q,niche:v,platform:u,goal:N})})).json(),r=p.parts||p.result||p,l=p.strategy||r?.strategy||{},b=r?.agents||p.agents||{},$=Object.entries(b).map(([j,f])=>{const x=f?.summary||f?.insight||f?.recommendation||f?.output||(typeof f=="string"?f:"");return x?`<div class="bj-vr-block"><b>\u{1F464} ${o(j)}</b>${o(String(x).slice(0,400))}${String(x).length>400?"\u2026":""}</div>`:""}).join("");s.innerHTML=`<div style="color:#10b981;">\u2713 Consejo completado${p.runId?" ("+o(p.runId)+")":""}</div>
        ${l.summary?`<div class="bj-vr-block"><b>\u{1F4CB} S\xEDntesis del consejo</b>${o(l.summary)}</div>`:""}
        ${l.northStar?`<div class="bj-vr-block"><b>\u2B50 North star</b>${o(l.northStar)}</div>`:""}
        ${Array.isArray(l.priorities)&&l.priorities.length?`<div class="bj-vr-block"><b>\u{1F3AF} Prioridades</b>${t(l.priorities)}</div>`:""}
        ${$||'<div style="font-size:11.5px;color:var(--text-tertiary,var(--fg-3));font-style:italic;">Sin detalle por agente disponible.</div>'}`}catch{s.innerHTML='<span style="color:#ef4444;">Error. Reintent\xE1.</span>'}finally{c.target.disabled=!1}});let z="dm";i.querySelectorAll(".bj-tab-btn").forEach(c=>{c.addEventListener("click",()=>{z=c.dataset.ce,i.querySelectorAll(".bj-tab-btn").forEach(g=>{g.classList.toggle("bj-btn-secondary",g.dataset.ce===z),g.classList.toggle("bj-btn-ghost",g.dataset.ce!==z)});const s=i.querySelector("#ce-context");s&&(s.style.display=z==="comment"?"":"none");const v=i.querySelector("#ce-input");v&&(v.placeholder=z==="dm"?"Peg\xE1 el DM recibido\u2026":"Peg\xE1 el comentario recibido\u2026")})}),i.querySelector("#ce-go")?.addEventListener("click",async c=>{const s=i.querySelector("#ce-result"),v=(i.querySelector("#ce-input")?.value||"").trim();if(!v){s.innerHTML='<span style="color:#f59e0b;">Peg\xE1 el mensaje primero.</span>';return}const{accountId:g}=h(),p=(i.querySelector("#ce-sender")?.value||"").trim().replace(/^@/,"");c.target.disabled=!0,c.target.textContent="\u{1F9E0} Pensando (5 pasos)\u2026",s.innerHTML='<div style="color:#a78bfa;font-size:12px;">\u{1F9E0} Paso 1/5: analizando autor (@'+o(p||"anon")+")\u2026<br>\u{1F4C2} Paso 2/5: contexto del hilo\u2026<br>\u{1F3AF} Paso 3/5: intent profundo + emoci\xF3n\u2026<br>\u{1F4AD} Paso 4/5: razonando respuesta (calibrando humor/registro al pa\xEDs)\u2026<br>\u2728 Paso 5/5: ajustes finales\u2026</div>";try{const l=await(await fetch("/api/community/brain/respond",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId:g,sender:p,message:v,postContext:(i.querySelector("#ce-context")?.value||"").trim(),channel:z||"dm"})})).json();if(!l.ok){s.innerHTML=`<span style="color:#ef4444;">${o(l.error||"error")}</span>`;return}l.intent=l.analysis?.intent,l.confidence=(l.analysis?.complexity||1)/5,l.method=`5-step \xB7 ${l.author?.country||"GLOBAL"} \xB7 ${l.thinkingMs}ms`,l.reply=l.response?.reply,l.suggestedAction=l.response?.action,l.tone=l.response?.tone,l.archetype=l.response?.tone||"",l.personalization_used=`${l.author?.country||""} \xB7 ${l.author?.isReturning?`${l.author.previousInteractions} interacciones previas`:"primera vez"} \xB7 ${l.analysis?.humor_used?"humor activado":"sin humor"} \xB7 emoci\xF3n: ${l.analysis?.emotion}`;const b={lead_warm:"#10b981",curiosity:"#3b82f6",support:"#f59e0b",compliment:"#a855f7",spam:"#ef4444",troll:"#ef4444",neutral:"#9ca3af"}[l.intent]||"#9ca3af";s.innerHTML=`
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
          <span style="background:${b};color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;">${o(l.intent)}</span>
          <span style="font-size:10.5px;color:var(--text-tertiary,var(--fg-3));">conf: ${l.confidence?.toFixed(2)||"?"} \xB7 m\xE9todo: ${o(l.method||"")}</span>
          ${l.archetype?`<span class="ab-tag">${o(l.archetype)}</span>`:""}
        </div>
        ${l.reply?`
          <div class="bj-vr-block"><b>\u{1F4DD} Respuesta sugerida</b>
            <div style="background:var(--bg,#0a0a0a);padding:10px;border-radius:8px;font-size:13px;line-height:1.55;border-left:3px solid ${b};">${o(l.reply)}</div>
            <button class="bj-copy-btn" data-copy="${o(l.reply)}" style="margin-top:6px;">\u{1F4CB} Copiar</button>
          </div>`:""}
        <div class="bj-vr-block"><b>\u{1F3AF} Acci\xF3n sugerida</b>${o(l.suggestedAction||"ninguna")}${l.tone?` \xB7 tono: ${o(l.tone)}`:""}</div>
        ${l.personalization_used?`<div class="bj-vr-block"><b>\u2728 Personalizaci\xF3n usada</b>${o(l.personalization_used)}</div>`:""}`,s.querySelector(".bj-copy-btn")?.addEventListener("click",async $=>{try{await navigator.clipboard.writeText($.target.dataset.copy),B("\u{1F4CB} Copiado","ok")}catch{}})}catch(r){s.innerHTML=`<span style="color:#ef4444;">${o(r?.message||"error")}</span>`}finally{c.target.disabled=!1,c.target.textContent="\u{1F9E0} Analizar y responder"}}),i.querySelector("#se-go")?.addEventListener("click",async c=>{const s=i.querySelector("#se-result");if(!q){s.innerHTML='<span style="color:#f59e0b;">Escrib\xED un tema arriba primero.</span>';return}const v=i.querySelector("#se-file")?.files?.[0],g=(i.querySelector("#se-colors")?.value||"").split(",").map($=>$.trim()).filter(Boolean),p=i.querySelector("#se-archetype")?.value||"cercano",r=parseInt(i.querySelector("#se-count")?.value||"5",10),{accountId:l,niche:b}=h();c.target.disabled=!0,s.innerHTML="\u{1F4F1} Generando frames visuales\u2026";try{let $=null;v&&($=(await y([v]))[0]);const f=await(await fetch("/api/stories/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:q,niche:b,goal:N,archetype:p,framesCount:r,brandColors:g,photoDataUrl:$,accountId:l})})).json();if(!f.ok){s.innerHTML=`<span style="color:#ef4444;">${o(f.error||"error")}</span>`;return}const x=f.frames||[];s.innerHTML=`
        <div style="color:#10b981;font-size:12px;">\u2713 ${x.length} frames generados (1080\xD71920)</div>
        <div class="ap-slides">
          ${x.map((P,M)=>`<div class="ap-slide" data-idx="${M}"><img src="${o(P.dataUrl)}" alt="frame ${P.n}" loading="lazy" /><span class="ap-slide-tag">${P.n}\xB7${o(P.role)}</span></div>`).join("")}
        </div>
        <button class="bj-btn bj-btn-secondary" id="se-dl-all" style="margin-top:8px;">\u2B07\uFE0F Descargar todos los frames</button>`,s.querySelector("#se-dl-all")?.addEventListener("click",()=>{x.forEach((P,M)=>setTimeout(()=>{const T=document.createElement("a");T.href=P.dataUrl,T.download=`story-${P.n}.svg`,document.body.appendChild(T),T.click(),T.remove()},M*250))});const L=P=>{let M=P;const T=document.createElement("div");T.className="ap-lightbox";const O=()=>{const S=x[M];T.innerHTML=`
            <button class="ap-lb-close">\u2715</button>
            <button class="ap-lb-nav ap-lb-prev" ${M===0?"disabled":""}>\u2039</button>
            <div class="ap-lb-stage"><img src="${o(S.dataUrl)}" /><div class="ap-lb-meta">Frame ${S.n} / ${x.length} \xB7 ${o(S.role)}${S.text?" \xB7 "+o(S.text):""}</div></div>
            <button class="ap-lb-nav ap-lb-next" ${M===x.length-1?"disabled":""}>\u203A</button>
            <a class="ap-lb-dl" href="${o(S.dataUrl)}" download="story-${S.n}.svg">\u2B07\uFE0F Descargar</a>`,T.querySelector(".ap-lb-close").onclick=()=>T.remove(),T.querySelector(".ap-lb-prev").onclick=()=>{M>0&&(M--,O())},T.querySelector(".ap-lb-next").onclick=()=>{M<x.length-1&&(M++,O())}};T.addEventListener("click",S=>{S.target===T&&T.remove()}),O(),document.body.appendChild(T)};s.querySelectorAll(".ap-slide").forEach(P=>P.addEventListener("click",()=>L(parseInt(P.dataset.idx,10)||0)))}catch($){s.innerHTML=`<span style="color:#ef4444;">${o($?.message||"error")}</span>`}finally{c.target.disabled=!1}}),i.querySelector("#fb-go")?.addEventListener("click",async c=>{const s=i.querySelector("#fb-result"),{accountId:v,niche:g}=h();if(!v){s.innerHTML='<span style="color:#f59e0b;">Pon\xE9 @cuenta arriba para que el sistema cachee aprendizajes.</span>';return}c.target.disabled=!0,s.innerHTML="\u{1F9E0} Analizando m\xE9tricas + sintetizando learnings\u2026";try{const r=await(await fetch("/api/feedback/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId:v,niche:g})})).json();if(!r.ok){s.innerHTML=`<span style="color:#ef4444;">${o(r.error||"error")}</span>`;return}if(!r.hasData){s.innerHTML=`<span style="color:#f59e0b;">${o(r.message)}</span>`;return}const l=r.patterns||{},b=r.learnings||{};s.innerHTML=`
        <div style="color:#10b981;font-size:12px;">\u2713 Aprendido en ${Math.round(r.durationMs/1e3)}s \xB7 ${l.totalAnalyzed} posts \xB7 score promedio ${l.avgScore}${r.nicheCacheUpdated?" \xB7 cache de Inteligencia actualizada":""}</div>
        ${b.summary?`<div class="bj-vr-block"><b>\u{1F4A1} Insight central</b>${o(b.summary)}</div>`:""}
        ${b.doubleDownOn?`<div class="bj-vr-block"><b>\u{1F680} Doblar la apuesta en</b>${o(b.doubleDownOn)}</div>`:""}
        <div class="bj-vr-block"><b>\u{1F3C6} Patrones ganadores</b>
          <div>Formato: <span style="color:#10b981;font-weight:700;">${o(l.bestFormat||"-")}</span> \xB7 Hook: <span style="color:#3b82f6;font-weight:700;">${o(l.bestHookStyle||"-")}</span> \xB7 Horario: <span style="color:#a855f7;font-weight:700;">${o(l.bestHour||"-")}</span></div>
          ${b.winningArchetype?`<div>Archetype recomendado: <span class="ab-tag ab-tag-purple">${o(b.winningArchetype)}</span></div>`:""}
        </div>
        ${b.recommendations?.length?`<div class="bj-vr-block"><b>\u{1F4CB} Recomendaciones (pr\xF3ximos 7 d\xEDas)</b>${t(b.recommendations)}</div>`:""}
        ${b.redFlags?.length?`<div class="bj-vr-block"><b>\u{1F6A9} Red flags (no repetir)</b>${t(b.redFlags)}</div>`:""}
        ${l.topPosts?.length?`<div class="bj-vr-block"><b>\u{1F947} Top posts</b>${t(l.topPosts.slice(0,3).map($=>`"${($.topic||"").slice(0,60)}" \xB7 ${$.format} \xB7 score ${$.score}`))}</div>`:""}
        ${r.syncLog?.length?`<div class="bj-vr-block"><b>\u{1F50C} Sincronizaci\xF3n con cuentas conectadas</b>${t(r.syncLog)}</div>`:""}`}catch(p){s.innerHTML=`<span style="color:#ef4444;">${o(p?.message||"error")}</span>`}finally{c.target.disabled=!1}}),i.querySelector("#gs-go")?.addEventListener("click",async c=>{const s=i.querySelector("#gs-result"),v=(i.querySelector("#gs-task")?.value||"").trim();if(!v){s.innerHTML='<span style="color:#f59e0b;">Escrib\xED qu\xE9 quer\xE9s que haga (ej: "lanz\xE1 un carrusel sobre IA").</span>';return}const{accountId:g,niche:p}=h(),r=(i.querySelector("#gs-colors")?.value||"").split(",").map(b=>b.trim()).filter(Boolean),l=i.querySelector("#gs-format")?.value||null;c.target.disabled=!0,s.innerHTML="\u{1F9EC} Gstack decidiendo + ejecutando\u2026";try{const $=await(await fetch("/api/gstack/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task:v,format:l,accountId:g,niche:p,topic:q||v,goal:N,platform:u,brandColors:r})})).json();if(!$.ok){s.innerHTML=`<span style="color:#ef4444;">${o($.error||"error")}: ${o($.message||"")}</span>`;return}const j=$.decision||{},f=$.output||{},x=Array.isArray(f.carouselSlides)?f.carouselSlides:[];s.innerHTML=`
        <div style="color:#10b981;font-size:12px;">\u2713 Gstack ejecutado en ${Math.round($.durationMs/1e3)}s</div>
        <div class="bj-vr-block"><b>\u{1F3AF} Decisi\xF3n del sistema</b>
          <div>Voz elegida: <span style="color:#a855f7;font-weight:700;">${o(j.archetype)}</span> \xB7 Est\xE9tica: <span style="color:#3b82f6;font-weight:700;">${o(j.mood)}</span></div>
          <div>Roles IA activos: ${(j.roles||[]).map(M=>`<span class="ab-tag ab-tag-purple">${o(M)}</span>`).join(" ")}</div>
          <div>Formato: ${o(j.format||"estrategia general")} \xB7 Intenci\xF3n: ${o(j.intent||"crear contenido")} \xB7 Nicho: ${o(j.niche)}</div>
        </div>
        ${(j.reasoning||[]).length?`<div class="bj-vr-block"><b>\u{1F9E0} Por qu\xE9 decidi\xF3 esto</b>${t(j.reasoning)}</div>`:""}
        ${f.pending?`<div style="color:#f59e0b;">\u23F3 ${o(f.reason)}</div>`:""}
        ${f.content?`<div class="bj-vr-block"><b>\u{1F4DD} Contenido generado</b>
          ${f.content.hook?`<div><strong>Hook:</strong> ${o(f.content.hook)}</div>`:""}
          ${f.content.caption?`<div style="margin-top:4px;"><strong>Caption:</strong> ${o(f.content.caption.slice(0,300))}${f.content.caption.length>300?"\u2026":""}</div>`:""}
          ${f.content.angle?`<div style="margin-top:4px;"><strong>\xC1ngulo:</strong> ${o(f.content.angle)}</div>`:""}
        </div>`:""}
        ${x.length?`
          <div class="bj-vr-block"><b>\u{1F5BC}\uFE0F Carrusel \xB7 ${x.length} slides</b> <span style="font-size:10.5px;color:#a78bfa;">(toc\xE1 uno para ampliar)</span></div>
          <div class="ap-slides" id="gs-slides">${x.map((M,T)=>`<div class="ap-slide" data-idx="${T}"><img src="${o(M.dataUrl)}" alt="slide ${M.n}" loading="lazy" /><span class="ap-slide-tag">${M.n}${M.role?"\xB7"+o(M.role):""}</span></div>`).join("")}</div>
        `:f.image?.url?`<div class="bj-vr-block"><b>\u{1F5BC}\uFE0F Imagen</b></div><div class="ap-slides"><div class="ap-slide" data-idx="0"><img src="${o(f.image.url)}" alt="output" loading="lazy" /><span class="ap-slide-tag">1</span></div></div>`:""}`;const L=x.length?x:f.image?.url?[{n:1,role:"output",dataUrl:f.image.url}]:[],P=M=>{let T=M;const O=document.createElement("div");O.className="ap-lightbox";const S=()=>{const E=L[T];E&&(O.innerHTML=`<button class="ap-lb-close">\u2715</button><button class="ap-lb-nav ap-lb-prev" ${T===0?"disabled":""}>\u2039</button><div class="ap-lb-stage"><img src="${o(E.dataUrl)}" /><div class="ap-lb-meta">Slide ${E.n} / ${L.length}${E.role?" \xB7 "+o(E.role):""}</div></div><button class="ap-lb-nav ap-lb-next" ${T===L.length-1?"disabled":""}>\u203A</button><a class="ap-lb-dl" href="${o(E.dataUrl)}" download="gstack-slide-${E.n}.svg">\u2B07\uFE0F Descargar</a>`,O.querySelector(".ap-lb-close").onclick=()=>O.remove(),O.querySelector(".ap-lb-prev").onclick=()=>{T>0&&(T--,S())},O.querySelector(".ap-lb-next").onclick=()=>{T<L.length-1&&(T++,S())})};O.addEventListener("click",E=>{E.target===O&&O.remove()}),S(),document.body.appendChild(O)};s.querySelectorAll(".ap-slide").forEach(M=>M.addEventListener("click",()=>P(parseInt(M.dataset.idx,10)||0)))}catch(b){s.innerHTML=`<span style="color:#ef4444;">${o(b?.message||"error")}</span>`}finally{c.target.disabled=!1}}),i.querySelector("#bj-intel-go")?.addEventListener("click",async c=>{const s=i.querySelector("#bj-intel-result"),{accountId:v,niche:g}=h();if(!v){s.innerHTML='<span style="color:#f59e0b;">Pon\xE9 @cuenta arriba (en "Mi cuenta") para cachear el an\xE1lisis.</span>';return}c.target.disabled=!0,s.innerHTML="\u{1F9EC} Corriendo 5 an\xE1lisis (nicho \u2192 audiencia \u2192 competencia \u2192 oportunidades \u2192 s\xEDntesis)\u2026";try{const r=await(await fetch("/api/intelligence/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:q,accountId:v,accountHandle:v,brandNiche:g,goal:N,force:!0})})).json();if(!r.ok){s.innerHTML=`<span style="color:#ef4444;">${o(r.error||"error")}</span>`;return}s.innerHTML=`
        <div style="color:#10b981;font-size:12px;">\u2713 Intelligence cacheada (${Math.round(r.durationMs/1e3)}s)${r.fromCache?" \xB7 cache hit":""}</div>
        <div class="bj-vr-block"><b>Nicho detectado</b>${o(r.niche?.primaryNiche||"")} (saturaci\xF3n: ${o(r.niche?.saturationLevel||"")} \xB7 monetizaci\xF3n: ${o(r.niche?.monetizationPotential||"")})</div>
        ${r.summary?.mainAngle?`<div class="bj-vr-block"><b>\u{1F3AF} Posicionamiento</b>${o(r.summary.mainAngle)}</div>`:""}
        ${r.summary?.differentiationPlay?`<div class="bj-vr-block"><b>\u26A1 Jugada diferenciaci\xF3n</b>${o(r.summary.differentiationPlay)}</div>`:""}
        ${r.audience?.decisionTriggers?.length?`<div class="bj-vr-block"><b>\u{1F381} Triggers audiencia</b>${t(r.audience.decisionTriggers)}</div>`:""}
        ${r.competitive?.contentGaps?.length?`<div class="bj-vr-block"><b>\u{1F48E} Gaps de contenido</b>${t(r.competitive.contentGaps)}</div>`:""}
        ${r.opportunities?.top3Opportunities?.length?`<div class="bj-vr-block"><b>\u{1F680} Top 3 oportunidades</b>${t(r.opportunities.top3Opportunities.map(l=>`${l.opportunity} \u2192 ${l.action}`))}</div>`:""}
        ${r.opportunities?.redFlags?.length?`<div class="bj-vr-block"><b>\u26A0\uFE0F NO hacer</b>${t(r.opportunities.redFlags)}</div>`:""}
        ${r.audience?.icp?`<div class="bj-vr-block"><b>\u{1F465} Audiencia ideal (ICP)</b><div>Edad: ${o(r.audience.icp.ageRange||"-")} \xB7 G\xE9nero: ${o(r.audience.icp.gender||"-")} \xB7 Geo: ${(r.audience.icp.geo||[]).map(o).join(", ")}</div>${r.audience.icp.lifestyle?`<div>Estilo de vida: ${o(r.audience.icp.lifestyle)}</div>`:""}</div>`:""}
        ${r.audience?.psychographics?.fears?.length?`<div class="bj-vr-block"><b>\u{1F630} Miedos de la audiencia</b>${t(r.audience.psychographics.fears)}</div>`:""}
        ${r.audience?.psychographics?.aspirations?.length?`<div class="bj-vr-block"><b>\u{1F31F} Aspiraciones</b>${t(r.audience.psychographics.aspirations)}</div>`:""}
        ${r.competitive?.differentiationPlay?`<div class="bj-vr-block"><b>\u{1F3AF} C\xF3mo diferenciarte</b>${o(r.competitive.differentiationPlay)}</div>`:""}
        ${r.opportunities?.contentPillars?.length?`<div class="bj-vr-block"><b>\u{1F3DB}\uFE0F Pilares de contenido</b>${t(r.opportunities.contentPillars.map(l=>`${l.pillar} (${l["%mix"]||""})`))}</div>`:""}`}catch(p){s.innerHTML=`<span style="color:#ef4444;">${o(p?.message||"error")}</span>`}finally{c.target.disabled=!1}}),i.querySelectorAll(".bj-cb-plan-cb").forEach(c=>{c.addEventListener("change",()=>c.closest(".bj-cb-plan")?.classList.toggle("selected",c.checked))}),["text","bg","accent"].forEach(c=>{const s=i.querySelector(`#cb-${c}-color`),v=i.querySelector(`#cb-${c}-color-text`);s&&v&&(s.addEventListener("input",()=>{v.value=s.value.toUpperCase()}),v.addEventListener("input",()=>{/^#[0-9A-Fa-f]{6}$/.test(v.value)&&(s.value=v.value)}))}),i.querySelector("#bj-cb-go")?.addEventListener("click",async c=>{const s=i.querySelector("#bj-cb-result");if(!q){s.innerHTML='<span style="color:#f59e0b;">Escrib\xED un tema arriba primero.</span>';return}const v=[...i.querySelectorAll(".bj-cb-plan-cb:checked")].map(p=>parseInt(p.dataset.idx,10)),g=(v.length?v:[0]).map(p=>R?.hookPlans?.[p]).filter(Boolean);!g.length&&!R?.hookPlans?.length&&g.push({hook:q,cta:"Coment\xE1 si te sirvi\xF3"}),c.target.disabled=!0,s.innerHTML=`\u{1F3A8} Componiendo ${g.length} carrusel(es) con tu est\xE9tica\u2026`;try{const p=i.querySelector("#cb-files")?.files,r=p?.length?await y(p):[],l=[];for(const A of r)try{l.push(await F(A))}catch{}const b=i.querySelector("#cb-bg-image")?.files?.[0];let $=null;if(b){const A=await y([b]);A[0]&&($=await F(A[0]))}const{accountId:j,niche:f}=h(),x=(i.querySelector("#cb-colors")?.value||"").split(",").map(A=>A.trim()).filter(Boolean),L=(i.querySelector("#cb-elements")?.value||"").split(",").map(A=>A.trim()).filter(Boolean),P=i.querySelector("#cb-text-color-text")?.value||null,M=i.querySelector("#cb-bg-color-text")?.value||null,T=i.querySelector("#cb-accent-color-text")?.value||null,O=i.querySelector("#cb-mood")?.value||"",S=i.querySelector("#cb-font")?.value||"serif-editorial",E=[];for(const A of g){const D={topic:q,niche:f,goal:N,platform:u,format:"carousel",accountId:j,images:l,brandColors:x,extraElements:L,textColor:P,bgColor:M,accentColor:T,bgImage:$,hookOverride:A?.hook||"",ctaOverride:A?.cta||"",mood:O||"premium",fontStyle:S,autoPublish:!1};try{const V=await(await fetch("/api/autopilot/create-post",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(D)})).json();V.ok&&E.push(V)}catch{}}if(!E.length){s.innerHTML='<span style="color:#ef4444;">No se pudo generar ning\xFAn carrusel.</span>';return}s.innerHTML=`<div style="color:#10b981;font-size:12px;margin-bottom:10px;">\u2713 ${E.length} carrusel(es) generado(s) \xB7 tipograf\xEDa: ${o(S)} \xB7 texto: ${o(P||"")} \xB7 fondo: ${o(M||"")} \xB7 acento: ${o(T||"")}</div>`,E.forEach((A,D)=>{const H=A.carouselSlides||[],V=document.createElement("div");V.style.marginBottom="18px",V.innerHTML=`<div style="font-size:13px;font-weight:800;color:#a855f7;margin-bottom:6px;">\u{1F4CB} Carrusel del Plan ${D+1}</div>
          ${H.length?`<div class="ap-slides" data-plan="${D}">${H.map((G,J)=>`<div class="ap-slide" data-idx="${J}"><img src="${o(G.dataUrl)}" alt="slide ${G.n}" loading="lazy" /><span class="ap-slide-tag">${G.n}${G.role?"\xB7"+o(G.role):""}</span></div>`).join("")}</div>
            <button class="bj-btn bj-btn-secondary cb-dl-plan" data-plan="${D}" style="margin-top:6px;font-size:11.5px;">\u2B07\uFE0F Descargar slides del Plan ${D+1}</button>`:"<em>Sin slides</em>"}`,s.appendChild(V);const re=G=>{let J=G;const _=document.createElement("div");_.className="ap-lightbox";const ae=()=>{const W=H[J];W&&(_.innerHTML=`<button class="ap-lb-close">\u2715</button><button class="ap-lb-nav ap-lb-prev" ${J===0?"disabled":""}>\u2039</button><div class="ap-lb-stage"><img src="${o(W.dataUrl)}" /><div class="ap-lb-meta">Plan ${D+1} \xB7 Slide ${W.n}/${H.length}${W.role?" \xB7 "+o(W.role):""}</div></div><button class="ap-lb-nav ap-lb-next" ${J===H.length-1?"disabled":""}>\u203A</button><a class="ap-lb-dl" href="${o(W.dataUrl)}" download="plan${D+1}-slide-${W.n}.svg">\u2B07\uFE0F Descargar</a>`,_.querySelector(".ap-lb-close").onclick=()=>_.remove(),_.querySelector(".ap-lb-prev").onclick=()=>{J>0&&(J--,ae())},_.querySelector(".ap-lb-next").onclick=()=>{J<H.length-1&&(J++,ae())})};_.addEventListener("click",W=>{W.target===_&&_.remove()}),ae(),document.body.appendChild(_)};V.querySelectorAll(".ap-slide").forEach(G=>G.addEventListener("click",()=>re(parseInt(G.dataset.idx,10)||0))),V.querySelector(".cb-dl-plan")?.addEventListener("click",()=>H.forEach((G,J)=>setTimeout(()=>{const _=document.createElement("a");_.href=G.dataUrl,_.download=`plan${D+1}-slide-${G.n}.svg`,document.body.appendChild(_),_.click(),_.remove()},J*250)))})}catch(p){s.innerHTML=`<span style="color:#ef4444;">${o(p?.message||"error")}</span>`}finally{c.target.disabled=!1}}),i.querySelector("#ra-go")?.addEventListener("click",async c=>{const s=i.querySelector("#ra-result"),{accountId:v,niche:g}=h();c.target.disabled=!0,c.target.textContent="\u23F3 Ejecutando todo (puede tardar 30-50s)\u2026",s.innerHTML="";try{const r=await(await fetch("/api/runall/week",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId:v,topic:q,platform:u,goal:N,carouselCount:3})})).json();if(!r.ok){s.innerHTML=`<span style="color:#ef4444;">${o(r.error||"Error")}</span>`;return}const l=(r.timeline||[]).map(f=>`<div class="ra-tl-row ${o(f.status||"done")}"><span>+${(f.at/1e3).toFixed(1)}s</span><span>${o(f.icon||"\xB7")}</span><span>${o(f.text)}</span></div>`).join(""),b=(r.carousels||[]).map(f=>`
        <div class="ra-day">
          <div class="ra-day-head">
            <span class="ra-day-name">\u{1F4C5} ${o(f.day)} \xB7 ${o(f.theme)}</span>
            ${f.score?`<span class="ra-day-score">${f.score}/100</span>`:""}
          </div>
          ${f.hook?`<div class="ra-day-hook">"${o(f.hook)}"</div>`:""}
          ${(f.slides||[]).length?`<div class="ap-slides">${f.slides.map((x,L)=>`<div class="ap-slide" data-c-idx="${f.day}-${L}"><img src="${o(x.dataUrl)}" alt="slide ${x.n}" loading="lazy" /><span class="ap-slide-tag">${x.n}</span></div>`).join("")}</div>`:'<em style="font-size:11.5px;color:#FBBF24;">Sin slides (timeout o error)</em>'}
        </div>`).join(""),$=(r.dmTemplates||[]).map(f=>`
        <div class="ra-dm">
          <span class="ra-dm-intent">${o(f.intent)}</span>
          <div class="ra-dm-reply">${o(f.reply)}</div>
          <button class="bj-copy-btn" data-copy="${o(f.reply)}" style="margin-top:6px;font-size:10.5px;">\u{1F4CB} Copiar</button>
        </div>`).join("");s.innerHTML=`
        <div class="ra-grp">
          <div class="ra-grp-title">\u{1F4CA} Resumen ejecuci\xF3n (${Math.round(r.durationMs/1e3)}s)</div>
          <div class="ra-timeline">${l}</div>
        </div>
        ${r.intel?.mainAngle?`<div class="ra-grp"><div class="ra-grp-title">\u{1F3AF} Posicionamiento</div><div style="font-size:13px;color:var(--text-primary,var(--fg));">${o(r.intel.mainAngle)}</div></div>`:""}
        ${r.feedback?.learnings?.summary?`<div class="ra-grp"><div class="ra-grp-title">\u{1F9E0} Aprendizaje</div><div style="font-size:13px;color:var(--text-primary,var(--fg));">${o(r.feedback.learnings.summary)}</div></div>`:""}
        ${r.carousels?.length?`<div class="ra-grp"><div class="ra-grp-title">\u{1F3A8} ${r.carousels.length} carruseles generados</div>${b}</div>`:""}
        ${r.dmTemplates?.length?`<div class="ra-grp"><div class="ra-grp-title">\u{1F4AC} Templates DM listos</div>${$}</div>`:""}`,s.querySelectorAll(".bj-copy-btn").forEach(f=>f.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(f.dataset.copy),B("\u{1F4CB} Copiado","ok")}catch{}}));const j={};(r.carousels||[]).forEach(f=>{(f.slides||[]).forEach((x,L)=>{j[`${f.day}-${L}`]={...x,day:f.day}})}),s.querySelectorAll(".ap-slide").forEach(f=>{f.addEventListener("click",()=>{const x=j[f.dataset.cIdx];if(!x)return;const L=document.createElement("div");L.className="ap-lightbox",L.innerHTML=`<button class="ap-lb-close">\u2715</button><div class="ap-lb-stage"><img src="${o(x.dataUrl)}" /><div class="ap-lb-meta">${o(x.day)} \xB7 slide ${x.n}</div></div><a class="ap-lb-dl" href="${o(x.dataUrl)}" download="${o(x.day)}-slide-${x.n}.svg">\u2B07\uFE0F Descargar</a>`,L.querySelector(".ap-lb-close").onclick=()=>L.remove(),L.addEventListener("click",P=>{P.target===L&&L.remove()}),document.body.appendChild(L)})})}catch(p){s.innerHTML=`<span style="color:#ef4444;">${o(p?.message||"Error de red")}</span>`}finally{c.target.disabled=!1,c.target.textContent="\u25B6 Ejecutar todo"}});const I=async()=>{const c=i.querySelector("#bs-files")?.files,s=c?.length?await y(c):[],{niche:v}=h(),g=(i.querySelector("#bs-colores")?.value||"").split(",").map(f=>f.trim()).filter(Boolean),p=i.querySelector("#bs-template")?.value||"anuncio-ganador",r=i.querySelector("#bs-titulo")?.value||"",l=i.querySelector("#bs-estilo")?.value||"premium",b=i.querySelector("#bs-formato")?.value||"carousel",$=(i.querySelector("#bs-elementos")?.value||"").split(",").map(f=>f.trim()).filter(Boolean),j=!!i.querySelector("#bs-refine")?.checked;return{templateKey:p,images:s,brandColors:g,niche:v,platform:u,format:b,refine:j,extraElements:$,vars:{producto:r,titulo:r,marca:r,estilo:l,tema:q||r,hook:r,colores:g.join(", ")}}};i.querySelector("#bs-build")?.addEventListener("click",async c=>{const s=i.querySelector("#bs-result");c.target.disabled=!0,s.innerHTML="\u23F3 Armando prompt\u2026";try{const v=await I(),p=await(await fetch("/api/brand-studio/build-prompt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(v)})).json();s.innerHTML=p.prompt?`<div class="bj-vr-block"><b>Prompt generado</b><div style="background:var(--bg,#0a0a0a);padding:8px;border-radius:6px;font-size:12px;line-height:1.5;">${o(p.prompt)}</div></div>
           <button class="bj-copy-btn" data-copy="${o(p.prompt)}">\u{1F4CB} Copiar prompt</button>`:`<span style="color:#ef4444;">${o(p.error||"error")}</span>`,s.querySelector(".bj-copy-btn")?.addEventListener("click",async r=>{try{await navigator.clipboard.writeText(r.target.dataset.copy),B("\u{1F4CB} Copiado","ok")}catch{}})}catch{s.innerHTML='<span style="color:#ef4444;">Error de red.</span>'}finally{c.target.disabled=!1}}),i.querySelector("#bs-go")?.addEventListener("click",async c=>{const s=i.querySelector("#bs-result");c.target.disabled=!0,s.innerHTML="\u{1F3A8} Generando imagen\u2026 (puede tardar 10-30s)";try{const v=await I(),p=await(await fetch("/api/brand-studio/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(v)})).json();p.url?s.innerHTML=`
          <div style="color:#10b981;font-size:12px;">\u2713 Generado \xB7 ${o(p.provider||"")} \xB7 modo: ${o(p.mode||"")}${p.usedPhotos?` \xB7 us\xF3 ${p.usedPhotos} foto(s)`:""}${p.refined?` \xB7 \u2728 refinado (${o(p.refineProvider||"")})`:""}</div>
          ${p.warning?`<div style="color:#f59e0b;font-size:11.5px;">${o(p.warning)}</div>`:""}
          <img src="${o(p.url)}" alt="generada" style="max-width:100%;border-radius:10px;margin-top:8px;border:1px solid var(--border);" />
          <a href="${o(p.url)}" download="feedia-marca.png" class="bj-btn bj-btn-secondary" style="margin-top:8px;text-decoration:none;display:inline-block;">\u2B07\uFE0F Descargar</a>`:s.innerHTML=`<span style="color:#ef4444;">${o(p.message||p.error||"No se pudo generar")}</span>`}catch{s.innerHTML='<span style="color:#ef4444;">Error de red. Reintent\xE1.</span>'}finally{c.target.disabled=!1}});const F=(c,s=1080,v=.82)=>new Promise(g=>{if(!c?.startsWith("data:image")){g(c);return}const p=new Image;p.onload=()=>{const r=Math.min(1,s/Math.max(p.width,p.height)),l=Math.round(p.width*r),b=Math.round(p.height*r),$=document.createElement("canvas");$.width=l,$.height=b,$.getContext("2d").drawImage(p,0,0,l,b),g($.toDataURL("image/jpeg",v))},p.onerror=()=>g(c),p.src=c});i.querySelector("#ap-go")?.addEventListener("click",async c=>{const s=i.querySelector("#ap-result");if(!q){s.innerHTML='<span style="color:#f59e0b;">Escrib\xED un tema arriba primero.</span>';return}c.target.disabled=!0,s.innerHTML="\u{1F916} El cerebro est\xE1 trabajando\u2026 (cerebro \u2192 imagen \u2192 validaci\xF3n \u2192 publicar)";try{const v=i.querySelector("#ap-files")?.files,g=v?.length?await y(v):[],p=[];for(const S of g)try{p.push(await F(S))}catch{}const{accountId:r,niche:l}=h(),b={topic:q,niche:l,goal:N,platform:u,format:i.querySelector("#ap-format")?.value||"carousel",accountId:r,images:p,brandColors:(i.querySelector("#ap-colores")?.value||"").split(",").map(S=>S.trim()).filter(Boolean),extraElements:(i.querySelector("#ap-elementos")?.value||"").split(",").map(S=>S.trim()).filter(Boolean),autoPublish:!!i.querySelector("#ap-publish")?.checked},$=new AbortController,j=setTimeout(()=>$.abort(),7e4);let f,x;try{f=await fetch("/api/autopilot/create-post",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b),signal:$.signal})}catch(S){clearTimeout(j),s.innerHTML=`<span style="color:#ef4444;">Error de red: ${o(S.message||"sin respuesta")}. Prob\xE1 sin foto o con foto m\xE1s chica.</span>`;return}if(clearTimeout(j),f.status===413){s.innerHTML='<span style="color:#f59e0b;">\u26A0\uFE0F Imagen demasiado pesada (>4.5MB). Vercel rechaz\xF3 el body. La comprimimos pero prob\xE1 una foto m\xE1s chica.</span>';return}if(f.status===504){s.innerHTML='<span style="color:#f59e0b;">\u23F0 Timeout del servidor (Vercel 60s). Hicimos demasiado en una sola llamada. Reintent\xE1 sin foto o con formato m\xE1s simple.</span>';return}if(!f.ok){const S=await f.text().catch(()=>"");s.innerHTML=`<span style="color:#ef4444;">HTTP ${f.status}: ${o(S.slice(0,200))}</span>`;return}try{x=await f.json()}catch{s.innerHTML='<span style="color:#ef4444;">Respuesta inv\xE1lida del servidor.</span>';return}if(!x.ok&&x.error){s.innerHTML=`<span style="color:#ef4444;">${o(x.error)}: ${o(x.message||"")}</span>`;return}const L=x.content||{},P=x.validation||{},M=x.status==="published"?"#10b981":x.status==="ready-for-review"?"#a855f7":"#f59e0b";s.innerHTML=`
        <div style="color:${M};font-weight:700;font-size:13px;">\u25CF ${o(x.status)}${x.publish?.ok?" \u2014 \u2713 publicado (mediaId "+o(x.publish.mediaId||"")+")":""}</div>
        <div style="font-size:11.5px;color:var(--text-tertiary,var(--fg-3));">${o(x.note||"")}</div>
        ${L.angle?`<div class="bj-vr-block"><b>\xC1ngulo \xD7 Persona</b>${o(L.angle)} \xD7 ${o(L.persona||"")}</div>`:""}
        ${L.hook?`<div class="bj-vr-block"><b>Hook</b>${o(L.hook)}</div>`:""}
        ${L.caption?`<div class="bj-vr-block"><b>Caption</b>${o(L.caption)}</div>`:""}
        ${L.hashtags?.length?`<div class="bj-vr-block"><b>Hashtags</b>${o(L.hashtags.join(" "))}</div>`:""}
        ${P.prediction?`<div class="bj-vr-block"><b>Predicci\xF3n</b><span class="bj-vr-score">${P.prediction.viralScore??"\u2013"}/100</span> \xB7 ${o(P.prediction.virality||"")} \xB7 carrusel: ${o(P.carousel?.verdict||"")}</div>`:""}
        ${Array.isArray(x.carouselSlides)&&x.carouselSlides.length?`
          <div class="bj-vr-block"><b>Carrusel \xB7 ${x.carouselSlides.length} slides</b> <span style="font-size:10.5px;color:#a78bfa;">(toc\xE1 uno para ampliar)</span></div>
          <div class="ap-slides">
            ${x.carouselSlides.map((S,E)=>`
              <div class="ap-slide" data-idx="${E}">
                <img src="${o(S.dataUrl)}" alt="slide ${S.n}" loading="lazy" />
                <span class="ap-slide-tag">${S.n} \xB7 ${o(S.role)}</span>
              </div>`).join("")}
          </div>
          <button class="bj-btn bj-btn-secondary" id="ap-dl-all" style="margin-top:8px;">\u2B07\uFE0F Descargar todos los slides</button>
        `:x.image?.url?`<img src="${o(x.image.url)}" alt="post" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" style="max-width:100%;border-radius:10px;margin-top:8px;border:1px solid var(--border);" />
          <div style="display:none;color:#f59e0b;font-size:11.5px;">\u26A0\uFE0F La imagen no carg\xF3 (modo: ${o(x.image.mode||"")}). Prob\xE1 de nuevo o sin foto.</div>
          <a href="${o(x.image.url)}" download="feedia-post.png" class="bj-btn bj-btn-secondary" style="margin-top:8px;text-decoration:none;display:inline-block;">\u2B07\uFE0F Descargar</a>`:`<div style="color:#f59e0b;font-size:11.5px;">\u26A0\uFE0F ${o(x.image?.error||"sin imagen")}</div>`}
        <details style="margin-top:8px;"><summary style="cursor:pointer;font-size:11px;color:#a78bfa;">\u{1F4CB} Ver paso a paso de lo que hizo el sistema</summary><div style="font-size:11.5px;color:var(--text-secondary,var(--fg-2));padding:8px 0;line-height:1.6;">${(x.log||[]).map(S=>`<div>${o(S)}</div>`).join("")}</div></details>`,i.querySelector("#ap-dl-all")?.addEventListener("click",()=>{(x.carouselSlides||[]).forEach((S,E)=>{setTimeout(()=>{const A=document.createElement("a");A.href=S.dataUrl,A.download=`slide-${S.n}.svg`,document.body.appendChild(A),A.click(),A.remove()},E*250)})});const T=x.carouselSlides||[],O=S=>{let E=S;const A=document.createElement("div");A.className="ap-lightbox";const D=()=>{const H=T[E];A.innerHTML=`
            <button class="ap-lb-close" aria-label="cerrar">\u2715</button>
            <button class="ap-lb-nav ap-lb-prev" aria-label="anterior" ${E===0?"disabled":""}>\u2039</button>
            <div class="ap-lb-stage">
              <img src="${o(H.dataUrl)}" alt="slide ${H.n}" />
              <div class="ap-lb-meta">Slide ${H.n} / ${T.length} \xB7 ${o(H.role)} ${H.title?"\xB7 "+o(H.title):""}</div>
            </div>
            <button class="ap-lb-nav ap-lb-next" aria-label="siguiente" ${E===T.length-1?"disabled":""}>\u203A</button>
            <a class="ap-lb-dl" href="${o(H.dataUrl)}" download="slide-${H.n}.svg">\u2B07\uFE0F Descargar</a>`,A.querySelector(".ap-lb-close").onclick=()=>A.remove(),A.querySelector(".ap-lb-prev").onclick=()=>{E>0&&(E--,D())},A.querySelector(".ap-lb-next").onclick=()=>{E<T.length-1&&(E++,D())}};A.addEventListener("click",H=>{H.target===A&&A.remove()}),document.addEventListener("keydown",function H(V){if(!document.body.contains(A)){document.removeEventListener("keydown",H);return}V.key==="Escape"&&A.remove(),V.key==="ArrowLeft"&&E>0&&(E--,D()),V.key==="ArrowRight"&&E<T.length-1&&(E++,D())}),D(),document.body.appendChild(A)};s.querySelectorAll(".ap-slide").forEach(S=>{S.addEventListener("click",()=>O(parseInt(S.dataset.idx,10)||0))})}catch(v){s.innerHTML=`<span style="color:#ef4444;">Error inesperado: ${o(v?.message||String(v))}</span>`}finally{c.target.disabled=!1}}),(async()=>{const c=i.querySelector("#bj-connect-status");if(c)try{const v=await(await fetch("/api/connect/status")).json(),g=(p,r,l,b)=>l.configured?l.connected?`<div class="bj-conn-row"><span class="bj-conn-name">${p}</span><span class="bj-conn-ok">\u2713 conectado${l.username?" @"+o(l.username):""}</span>${b||""}</div>`:`<div class="bj-conn-row"><span class="bj-conn-name">${p}</span><a class="bj-btn bj-btn-secondary bj-conn-btn" href="/api/connect/${r}/start">Conectar</a></div>`:`<div class="bj-conn-row"><span class="bj-conn-name">${p}</span><span class="bj-conn-warn">no configurado (faltan credenciales de la app)</span></div>`;c.innerHTML=g("Instagram","instagram",v.instagram,v.instagram.connected?'<button class="bj-copy-btn" id="bj-ig-sync">Traer m\xE9tricas</button>':"")+g("TikTok","tiktok",v.tiktok,""),i.querySelector("#bj-ig-sync")?.addEventListener("click",async p=>{p.target.disabled=!0,p.target.textContent="\u23F3";const{accountId:r}=h();try{const b=await(await fetch("/api/connect/instagram/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId:r})})).json();p.target.textContent=b.ok?`\u2713 ${b.synced} posts`:b.message||"error"}catch{p.target.textContent="error"}})}catch{c.innerHTML='<span style="color:#ef4444;">No se pudo cargar el estado.</span>'}})(),(async()=>{const c=i.querySelector("#bj-canva-status");if(c)try{const v=await(await fetch("/api/canva/status")).json();v.configured?v.connected?c.innerHTML=`<span style="color:#10b981;">\u2713 Canva conectado \xB7 expira ${v.expiresAt?new Date(v.expiresAt).toLocaleString():"pronto"}</span>`:c.innerHTML='<a class="bj-btn bj-btn-secondary bj-conn-btn" href="/api/canva/start">Conectar Canva</a>':c.innerHTML='<span style="color:#f59e0b;font-size:12px;">no configurado \xB7 admin debe setear CANVA_CLIENT_ID/SECRET/REDIRECT_URI en Vercel (registrar app en canva.dev)</span>'}catch{c.innerHTML='<span style="color:#ef4444;">No se pudo cargar Canva.</span>'}})(),window.addEventListener("feedia:platform",()=>{renderBrujula(e)},{once:!0})};
