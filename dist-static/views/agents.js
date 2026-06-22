import{api as T,apiSafe as y}from"../lib/api.js";import{escape as s}from"../lib/dom.js";import{toast as m}from"../lib/toast.js";import{loadingScreen as U}from"../lib/ui.js";const z="feedia.agents.autonomy",A=()=>{try{return JSON.parse(localStorage.getItem(z)??"{}")}catch{return{}}},L=e=>{try{localStorage.setItem(z,JSON.stringify(e))}catch{}},ie=e=>A()[e]??"off",_=(e,n)=>{const i=A();i[e]=n,L(i)},v=[{id:"algorithm",name:"Algorithm Master",emoji:"\u{1F9E0}",gradient:"linear-gradient(135deg,#1a1f6b,#3451d1)",tagline:"Domina el algoritmo de Instagram",description:"Experto en se\xF1ales de ranking, Explore, shadowban, timing y alcance org\xE1nico. Hac\xE9 que cada post sea visto por la m\xE1xima audiencia posible.",specialties:["Ranking signals","Explore page","Shadowban check","Timing \xF3ptimo","Engagement velocity"],actions:[{id:"timing",icon:"\u23F0",label:"Timing \xF3ptimo",description:"Mejor horario seg\xFAn formato y objetivo",params:[{name:"format",label:"Formato",type:"select",options:["reel","carrusel","post-imagen","historia"]},{name:"goal",label:"Objetivo",type:"select",options:["alcance","engagement","explore","guardados"]}]},{id:"shadowban",icon:"\u{1F6AB}",label:"Diagn\xF3stico shadowban",description:"Detect\xE1 si est\xE1s shadowbanned y c\xF3mo salir",params:[{name:"symptoms",label:"S\xEDntomas observados",type:"textarea",placeholder:"Ej: alcance baj\xF3 80%, no aparezco en hashtags..."}]},{id:"explore-strategy",icon:"\u{1F50D}",label:"Estrategia Explore",description:"Plan para entrar y dominar el Explore",params:[{name:"format",label:"Formato",type:"select",options:["reel","carrusel","post-imagen"]}]},{id:"content-score",icon:"\u{1F4CA}",label:"Score de contenido",description:"Qu\xE9 puntaje algor\xEDtmico tendr\xEDa tu post",params:[{name:"caption",label:"Caption o descripci\xF3n",type:"textarea",placeholder:"Peg\xE1 tu caption..."},{name:"format",label:"Formato",type:"select",options:["reel","carrusel","post-imagen","historia"]}]},{id:"reach-boost",icon:"\u{1F680}",label:"Boost de alcance",description:"T\xE1cticas para multiplicar el alcance esta semana",params:[]}]},{id:"meta-ads",name:"Meta Ads Pro",emoji:"\u{1F4CA}",gradient:"linear-gradient(135deg,#0866ff,#00b0f4)",tagline:"Maximiz\xE1 tu ROI en Meta Ads",description:"Campa\xF1as, audiencias, creativos y ROAS. Toda la estrategia publicitaria de Meta con enfoque en resultados de negocio reales.",specialties:["Estructura de campa\xF1as","Lookalike audiences","Creative testing","ROAS optimization","Retargeting avanzado"],actions:[{id:"campaign-structure",icon:"\u{1F3D7}\uFE0F",label:"Estructura de campa\xF1a",description:"Dise\xF1\xE1 una campa\xF1a completa desde cero",params:[{name:"goal",label:"Objetivo",type:"select",options:["awareness","tr\xE1fico","engagement","leads","conversiones","ventas"]},{name:"budget",label:"Presupuesto diario (USD)",type:"text",placeholder:"Ej: 50"},{name:"product",label:"Producto o servicio",type:"text",placeholder:"Ej: curso de marketing digital"}]},{id:"ad-copy",icon:"\u270D\uFE0F",label:"Copy para anuncios",description:"5 variantes de copy para testear",params:[{name:"offer",label:"Oferta / propuesta de valor",type:"textarea",placeholder:"Describ\xED tu producto y beneficios..."},{name:"format",label:"Formato del anuncio",type:"select",options:["imagen","video","carrusel","story"]}]},{id:"audience",icon:"\u{1F3AF}",label:"Mapa de audiencias",description:"Segmentos y audiencias para tu nicho",params:[{name:"product",label:"Producto/servicio",type:"text",placeholder:"Ej: consultor\xEDa de redes sociales"}]},{id:"creative-brief",icon:"\u{1F3A8}",label:"Brief creativo",description:"Brief completo para creativos que convierten",params:[{name:"format",label:"Formato",type:"select",options:["imagen est\xE1tica","video 15s","video 30s","carrusel","story"]},{name:"objective",label:"Objetivo del creativo",type:"select",options:["awareness","consideration","conversi\xF3n"]}]},{id:"roas-plan",icon:"\u{1F4B9}",label:"Plan de ROAS",description:"Estrategia para alcanzar tu ROAS objetivo",params:[{name:"currentRoas",label:"ROAS actual",type:"text",placeholder:"Ej: 2.5"},{name:"targetRoas",label:"ROAS objetivo",type:"text",placeholder:"Ej: 6"},{name:"budget",label:"Presupuesto mensual (USD)",type:"text",placeholder:"Ej: 2000"}]}]},{id:"humor",name:"Humor Engine",emoji:"\u{1F602}",gradient:"linear-gradient(135deg,#f7971e,#ffd200)",tagline:"Contenido que hace re\xEDr y viraliza",description:"Memes de nicho, humor situacional, entertainment hooks y formatos virales que generan shares masivos y comunidad.",specialties:["Memes de nicho","Humor situacional","Trending jokes","Entertainment hooks","Viral comedy"],actions:[{id:"meme-concept",icon:"\u{1F3AD}",label:"Concepto de meme",description:"Memes adaptados a tu nicho y audiencia",params:[{name:"topic",label:"Tema o dolor del nicho",type:"text",placeholder:"Ej: clientes que piden rebaja"},{name:"format",label:"Formato",type:"select",options:["imagen con texto","video reacci\xF3n","before/after","expectativa vs realidad","libre"]}]},{id:"trending-humor",icon:"\u{1F525}",label:"Humor trending",description:"Adapt\xE1 tendencias de humor a tu marca",params:[{name:"trend",label:"Tendencia o meme actual",type:"text",placeholder:'Ej: "girl dinner", "demure", "rizz"...'}]},{id:"comedy-caption",icon:"\u270F\uFE0F",label:"Caption divertida",description:"Reescrib\xED tu caption con humor aut\xE9ntico",params:[{name:"originalCaption",label:"Caption o idea original",type:"textarea",placeholder:"Peg\xE1 lo que ten\xE9s..."},{name:"humorStyle",label:"Estilo de humor",type:"select",options:["sarcasmo suave","humor relatable","absurdo","wit inteligente","autocr\xEDtica"]}]},{id:"entertainment-calendar",icon:"\u{1F4C5}",label:"Calendario de entretenimiento",description:"7 ideas de posts de entertainment para la semana",params:[]},{id:"viral-comedy-hook",icon:"\u{1F3A3}",label:"Hooks de comedia viral",description:"10 ganchos de apertura para content de humor",params:[{name:"topic",label:"Tema o contexto",type:"text",placeholder:"Ej: emprendimiento, marketing digital..."}]}]},{id:"sales",name:"Sales Machine",emoji:"\u{1F4B0}",gradient:"linear-gradient(135deg,#11998e,#38ef7d)",tagline:"Convert\xED seguidores en clientes",description:"Story selling, DM funnels, CTAs que convierten y estrategia de lanzamientos para generar ingresos reales desde Instagram.",specialties:["Story selling","DM funnels","Social proof","Offer positioning","Launch strategy"],actions:[{id:"story-selling",icon:"\u{1F4F1}",label:"Secuencia story selling",description:"Stories que llevan a la venta en 5-7 d\xEDas",params:[{name:"product",label:"Producto o servicio",type:"text",placeholder:"Ej: mentor\xEDa de marketing digital"},{name:"price",label:"Precio (opcional)",type:"text",placeholder:"Ej: $500"},{name:"audience",label:"Pain point principal",type:"text",placeholder:"Ej: no sabe c\xF3mo conseguir clientes"}]},{id:"dm-funnel",icon:"\u{1F4AC}",label:"Script DM funnel",description:"Conversaci\xF3n de DMs lista para cerrar ventas",params:[{name:"product",label:"Producto/servicio",type:"text",placeholder:"Ej: pack de templates premium"},{name:"objection",label:"Objeci\xF3n m\xE1s com\xFAn",type:"select",options:["precio muy alto","necesito pensarlo","no tengo tiempo","no s\xE9 si funciona para m\xED","otra"]}]},{id:"social-proof",icon:"\u2B50",label:"Kit de social proof",description:"Estrategia completa para mostrar resultados",params:[{name:"results",label:"Resultados de tus clientes",type:"textarea",placeholder:"Ej: duplican ingresos en 3 meses..."}]},{id:"cta-generator",icon:"\u{1F3AF}",label:"CTAs que convierten",description:"10 variantes de CTA para tu oferta",params:[{name:"goal",label:"Acci\xF3n deseada",type:"select",options:["comprar","enviar DM","click al link","guardar","comentar","agendar llamada"]},{name:"offer",label:"Oferta",type:"text",placeholder:"Ej: ebook gratuito de captaci\xF3n de clientes"}]},{id:"launch-plan",icon:"\u{1F680}",label:"Plan de lanzamiento",description:"Estrategia de lanzamiento en Instagram",params:[{name:"product",label:"Qu\xE9 lanz\xE1s",type:"text",placeholder:"Ej: curso online de fotograf\xEDa"},{name:"days",label:"Duraci\xF3n",type:"select",options:["3 d\xEDas","5 d\xEDas","7 d\xEDas","14 d\xEDas"]}]}]},{id:"community",name:"Community Champion",emoji:"\u2764\uFE0F",gradient:"linear-gradient(135deg,#e1306c,#ff6b35)",tagline:"Constru\xED una comunidad que te ama",description:"Engagement real, cultura de comentarios, lives que convierten y campa\xF1as UGC que convierten seguidores en fans leales.",specialties:["Engagement loops","Comment culture","Lives strategy","UGC campaigns","Brand rituals"],actions:[{id:"engagement-plan",icon:"\u{1F91D}",label:"Plan de engagement",description:"Estrategia de engagement para los pr\xF3ximos 30 d\xEDas",params:[]},{id:"comment-templates",icon:"\u{1F4AC}",label:"Templates de respuestas",description:"Scripts para los comentarios m\xE1s frecuentes",params:[{name:"type",label:"Tipo de comentario",type:"select",options:["preguntas sobre precio","cr\xEDticas negativas","comentarios positivos","preguntas t\xE9cnicas","trolls","leads interesados"]}]},{id:"live-strategy",icon:"\u{1F4E1}",label:"Estrategia de Lives",description:"Plan de live que convierte y fideliza",params:[{name:"goal",label:"Objetivo del live",type:"select",options:["educaci\xF3n","ventas","Q&A","entretenimiento","lanzamiento","colaboraci\xF3n"]},{name:"duration",label:"Duraci\xF3n",type:"select",options:["15 min","30 min","45 min","60 min","m\xE1s de 1 hora"]}]},{id:"ugc-campaign",icon:"\u{1F4F8}",label:"Campa\xF1a UGC",description:"Que tu comunidad cree contenido para vos",params:[{name:"incentive",label:"Incentivo",type:"select",options:["sorteo","reconocimiento","descuento","feature en perfil","ninguno"]}]},{id:"community-ritual",icon:"\u{1F3AA}",label:"Ritual de comunidad",description:"Cre\xE1 un ritual recurrente que fidelice",params:[{name:"frequency",label:"Frecuencia",type:"select",options:["diario","lunes","mi\xE9rcoles","viernes","semanal","mensual"]}]}]},{id:"trends",name:"Trend Radar",emoji:"\u26A1",gradient:"linear-gradient(135deg,#00c6ff,#0072ff)",tagline:"Siempre un paso adelante en tendencias",description:"Detect\xE1 tendencias antes que todos, adapt\xE1 challenges y audios virales a tu marca con el timing perfecto.",specialties:["Trend scouting","Audios virales","Challenge strategy","Format forecasting","Timing de trends"],actions:[{id:"trend-scan",icon:"\u{1F4E1}",label:"Scan de tendencias",description:"Detect\xE1 las tendencias m\xE1s relevantes ahora",params:[{name:"platform",label:"Plataforma",type:"select",options:["Instagram Reels","TikTok\u2192Instagram","Stories","todas"]}]},{id:"audio-strategy",icon:"\u{1F3B5}",label:"Estrategia de audios",description:"Qu\xE9 audios usar y c\xF3mo sacarles partido",params:[{name:"contentStyle",label:"Estilo de contenido",type:"select",options:["educativo","entretenimiento","ventas","lifestyle","behind-the-scenes"]}]},{id:"trend-adaptation",icon:"\u{1F504}",label:"Adaptar una tendencia",description:"C\xF3mo adaptar una tendencia espec\xEDfica a tu marca",params:[{name:"trend",label:"Tendencia a adaptar",type:"text",placeholder:'Ej: "hot takes", "day in my life"...'}]},{id:"trend-calendar",icon:"\u{1F4C6}",label:"Calendario de trends",description:"Tendencias previstas por mes",params:[{name:"month",label:"Mes",type:"select",options:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]}]},{id:"challenge-plan",icon:"\u{1F3C6}",label:"Participar en challenge",description:"Estrategia para subirse a un challenge viral",params:[{name:"challenge",label:"Nombre del challenge",type:"text",placeholder:"Ej: #10yearschallenge..."}]}]},{id:"storyteller",name:"Brand Narrator",emoji:"\u{1F4D6}",gradient:"linear-gradient(135deg,#f7971e,#bc1888)",tagline:"Cont\xE1 historias que conectan y venden",description:"Historia de origen, narrativas del fundador, contenido behind-the-scenes y series de contenido que generan conexi\xF3n emocional duradera.",specialties:["Origin story","Narrative arcs","Behind-the-scenes","Founder story","Series de contenido"],actions:[{id:"origin-story",icon:"\u2728",label:"Historia de origen",description:"Cont\xE1 el origen de tu marca en 3 formatos distintos",params:[{name:"background",label:"Contexto del origen",type:"textarea",placeholder:"De d\xF3nde vino la idea, qu\xE9 problema resolv\xEDas, qu\xE9 te pas\xF3..."}]},{id:"bts-content",icon:"\u{1F3AC}",label:"Ideas Behind the Scenes",description:"10 ideas de contenido detr\xE1s de c\xE1maras",params:[{name:"businessType",label:"Tipo de negocio",type:"text",placeholder:"Ej: agencia de marketing, e-commerce de ropa..."}]},{id:"founder-arc",icon:"\u{1F464}",label:"Arco del fundador",description:"Narrativa personal del fundador para Instagram",params:[{name:"journey",label:"Tu historia personal (resumen)",type:"textarea",placeholder:"Tu recorrido, de d\xF3nde ven\xEDs, qu\xE9 aprendiste..."}]},{id:"content-series",icon:"\u{1F4FA}",label:"Serie de contenido",description:"Dise\xF1\xE1 una serie narrativa en episodios",params:[{name:"theme",label:"Tema de la serie",type:"text",placeholder:"Ej: el proceso de lanzar un producto, errores que comet\xED..."}]},{id:"emotional-hook",icon:"\u{1F49B}",label:"Hooks emocionales",description:"Ganchos que generan conexi\xF3n profunda",params:[{name:"emotion",label:"Emoci\xF3n objetivo",type:"select",options:["esperanza","nostalgia","orgullo","empat\xEDa","inspiraci\xF3n","curiosidad intensa"]}]}]},{id:"viral",name:"Viral Architect",emoji:"\u{1F680}",gradient:"linear-gradient(135deg,#7928ca,#ff0080)",tagline:"Dise\xF1\xE1 contenido que explota org\xE1nicamente",description:"F\xF3rmulas virales, mapeo de emociones, mec\xE1nicas de sharing y hooks de poder para contenido con ADN viral desde el concepto.",specialties:["Viral formulas","Emotion mapping","Share mechanics","Hook engineering","Contrarian takes"],actions:[{id:"viral-formula",icon:"\u{1F9EC}",label:"F\xF3rmula viral",description:"Constru\xED un concepto con ADN viral",params:[{name:"topic",label:"Tema del contenido",type:"text",placeholder:"Ej: los errores de los emprendedores novatos"},{name:"format",label:"Formato",type:"select",options:["reel","carrusel","post-imagen"]}]},{id:"emotion-map",icon:"\u{1F5FA}\uFE0F",label:"Mapa emocional",description:"Qu\xE9 emociones activan shares en tu nicho",params:[]},{id:"power-hooks",icon:"\u{1F3A3}",label:"Hooks de poder",description:"Los 10 hooks m\xE1s fuertes para tu nicho",params:[{name:"style",label:"Estilo",type:"select",options:["contrarian","secreto revelado","n\xFAmero + promesa","pregunta disruptiva","historia de fracaso","mix"]}]},{id:"share-audit",icon:"\u{1F50E}",label:"Auditor\xEDa shareabilidad",description:"Audit\xE1 tu contenido para maximizar shares",params:[{name:"content",label:"Descripci\xF3n del contenido",type:"textarea",placeholder:"Describ\xED el contenido que quer\xE9s auditar..."}]},{id:"contrarian-take",icon:"\u{1F525}",label:"Hot take viral",description:"Opini\xF3n fuerte que genere debate en tu nicho",params:[{name:"topic",label:"Tema del nicho",type:"text",placeholder:"Ej: el marketing de contenidos, los coaches de Instagram..."}]}]},{id:"growth",name:"Growth Hacker",emoji:"\u{1F4C8}",gradient:"linear-gradient(135deg,#0f0c29,#302b63)",tagline:"Crec\xE9 r\xE1pido con estrategia y datos",description:"Sprints de 30 d\xEDas, hashtag domination, collabs estrat\xE9gicas y bio optimization para multiplicar seguidores calificados.",specialties:["Growth sprints","Hashtag domination","Collab outreach","Bio optimization","Account audits"],actions:[{id:"growth-sprint",icon:"\u26A1",label:"Growth sprint 30 d\xEDas",description:"Plan de crecimiento acelerado con acciones diarias",params:[{name:"currentFollowers",label:"Seguidores actuales",type:"text",placeholder:"Ej: 2500"},{name:"targetFollowers",label:"Objetivo en 30 d\xEDas",type:"text",placeholder:"Ej: 10000"}]},{id:"hashtag-strategy",icon:"#\uFE0F\u20E3",label:"Estrategia de hashtags",description:"Sistema completo para dominar tu nicho en hashtags",params:[{name:"mainNiche",label:"Nicho principal",type:"text",placeholder:"Ej: coaching empresarial para mujeres"}]},{id:"collab-outreach",icon:"\u{1F91D}",label:"Outreach de collabs",description:"Scripts y estrategia para conseguir colaboraciones",params:[{name:"collabType",label:"Tipo de collab",type:"select",options:["intercambio de stories","live conjunto","post colaborativo","giveaway conjunto","mention mutua"]},{name:"partnerSize",label:"Tama\xF1o del partner",type:"select",options:["similar al m\xEDo","m\xE1s grande (10x)","m\xE1s peque\xF1o","cualquiera"]}]},{id:"bio-optimizer",icon:"\u2728",label:"Optimizador de bio",description:"Bio que convierte visitantes en seguidores",params:[{name:"currentBio",label:"Bio actual",type:"textarea",placeholder:"Peg\xE1 tu bio actual..."}]},{id:"account-audit",icon:"\u{1F50D}",label:"Auditor\xEDa de cuenta",description:"Diagn\xF3stico completo + plan de mejora",params:[{name:"mainIssue",label:"Principal problema",type:"select",options:["bajo alcance","pocos seguidores nuevos","buen alcance pero no convierte","engagement bajo","no s\xE9 cu\xE1l es"]}]}]},{id:"strategist",name:"Content Strategist",emoji:"\u{1F3AF}",gradient:"linear-gradient(135deg,#2c3e50,#4ca1af)",tagline:"Estrategia de contenido que genera resultados",description:"Pilares, calendarios editoriales, mix de formatos y biblioteca evergreen para publicar con intenci\xF3n y consistencia.",specialties:["Content pillars","Calendarios editoriales","Mix de formatos","Evergreen library","Content batching"],actions:[{id:"content-pillars",icon:"\u{1F3DB}\uFE0F",label:"Pilares de contenido",description:"Defin\xED los pilares ideales para tu marca",params:[]},{id:"monthly-calendar",icon:"\u{1F4C5}",label:"Calendario mensual",description:"Plan editorial completo para el mes",params:[{name:"postsPerWeek",label:"Posts por semana",type:"select",options:["3","4","5","6","7"]},{name:"includeStories",label:"Incluir stories",type:"select",options:["s\xED","no"]}]},{id:"format-mix",icon:"\u{1F3A8}",label:"Mix de formatos",description:"Combinaci\xF3n \xF3ptima seg\xFAn tu objetivo",params:[{name:"primaryGoal",label:"Objetivo principal",type:"select",options:["crecimiento","engagement","ventas","autoridad","awareness"]}]},{id:"evergreen-library",icon:"\u{1F332}",label:"Biblioteca evergreen",description:"Sistema de contenido que funciona siempre",params:[]},{id:"content-audit",icon:"\u{1F50E}",label:"Auditor\xEDa de contenido",description:"Diagn\xF3stico de tu estrategia actual",params:[{name:"currentProblem",label:"Problema principal",type:"select",options:["ideas para crear","falta consistencia","bajo engagement","no genera ventas","no crece el perfil","no s\xE9 qu\xE9 publicar"]}]}]}];let M=null;const g=new Map,Q=e=>e.type==="select"?`<div class="field-group" style="margin-bottom:8px">
      <label class="field-label">${s(e.label)}</label>
      <select class="input" name="${s(e.name)}" data-param="${s(e.name)}">
        <option value="">\u2014 elegir \u2014</option>
        ${e.options.map(n=>`<option value="${s(n)}">${s(n)}</option>`).join("")}
      </select>
    </div>`:e.type==="textarea"?`<div class="field-group" style="margin-bottom:8px">
      <label class="field-label">${s(e.label)}</label>
      <textarea class="input" name="${s(e.name)}" data-param="${s(e.name)}" rows="3" placeholder="${s(e.placeholder??"")}" style="resize:vertical"></textarea>
    </div>`:`<div class="field-group" style="margin-bottom:8px">
    <label class="field-label">${s(e.label)}</label>
    <input class="input" type="text" name="${s(e.name)}" data-param="${s(e.name)}" placeholder="${s(e.placeholder??"")}">
  </div>`,V=e=>`
  <div class="agent-action-card" data-action-id="${s(e.id)}">
    <div class="agent-action-header">
      <span class="agent-action-icon">${e.icon}</span>
      <div style="min-width:0">
        <div class="agent-action-name">${s(e.label)}</div>
        <div class="agent-action-desc">${s(e.description)}</div>
      </div>
    </div>
    ${e.params.length?`<div class="agent-action-form" id="aform-${s(e.id)}" style="display:none">
          ${e.params.map(Q).join("")}
          <button class="btn gradient small agent-run-btn" data-action-id="${s(e.id)}" style="width:100%;margin-top:6px">\u26A1 Ejecutar</button>
         </div>
         <button class="btn ghost small agent-toggle-btn" data-action-id="${s(e.id)}" style="width:100%;margin-top:8px">\u25B8 Configurar y ejecutar</button>`:`<button class="btn gradient small agent-run-btn" data-action-id="${s(e.id)}" style="width:100%;margin-top:8px">\u26A1 Ejecutar</button>`}
  </div>`,J=e=>{const n=e.items??[],i=n.length&&typeof n[0]=="object";return`<div class="agent-result-section">
    <div class="agent-result-section-heading">${s(e.heading)}</div>
    <ul class="agent-result-items">
      ${n.map(a=>i?`<li><strong>${s(a.label??"")}</strong>: ${s(a.value??"")}${a.detail?` <em style="color:var(--text-tertiary)">\u2014 ${s(a.detail)}</em>`:""}</li>`:`<li>${s(String(a))}</li>`).join("")}
    </ul>
  </div>`},K=e=>`
  <div class="agent-result-card">
    <div class="agent-result-title">\u2705 ${s(e.title)}</div>
    <div class="agent-result-summary">${s(e.summary)}</div>
    ${(e.sections??[]).map(J).join("")}
    ${e.tips?.length?`
      <div class="agent-result-tips">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">\u{1F4A1} Tips Pro</div>
        ${e.tips.map(n=>`<div class="agent-result-tip">\u2022 ${s(n)}</div>`).join("")}
      </div>`:""}
    ${e.cta?`<div class="agent-result-cta">\u2192 ${s(e.cta)}</div>`:""}
    <button class="btn ghost small" id="result-close-btn" style="width:100%;margin-top:12px">\u2715 Cerrar</button>
  </div>`,P=(e,n)=>{const i=e.role==="user";return`<div class="chat-message ${i?"user":"assistant"}">
    ${i?"":`<div class="chat-avatar" style="background:${n.gradient};border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${n.emoji}</div>`}
    <div class="chat-bubble ${i?"user":"assistant"}">
      <div class="chat-text">${i?s(e.content):e.html??s(e.content)}</div>
      ${e.suggestions?.length?`<div class="agent-chat-suggestions">
        ${e.suggestions.map(a=>`<button class="agent-suggestion-chip">${s(a)}</button>`).join("")}
      </div>`:""}
      <div class="chat-meta">${new Date(e.ts??Date.now()).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</div>
    </div>
    ${i?'<div class="chat-user-avatar">\u{1F9D1}</div>':""}
  </div>`},Y=e=>`
  <div class="chat-message assistant" id="agent-thinking">
    <div class="chat-avatar" style="background:${e.gradient};border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${e.emoji}</div>
    <div class="chat-bubble assistant">
      <div class="chat-dots"><span></span><span></span><span></span></div>
    </div>
  </div>`,D=(e,n)=>{const a={algorithm:{title:"Diagn\xF3stico de algoritmo",summary:"Tu engagement velocity est\xE1 OK pero tu reach est\xE1 22% abajo del promedio del nicho. Prob\xE1 publicar reels martes y jueves 19-21h (3 ventanas de mayor reach esta semana).",bullets:["\u{1F4C8} Reach: 22% bajo promedio","\u23F0 Mejor ventana: Mar/Jue 19-21h","\u{1F3AF} Probar 3 reels < 25s con CTA fuerte"]},"meta-ads":{title:"Estructura de campa\xF1a sugerida",summary:"Para tu nicho con presupuesto medio, recomiendo Advantage+ Sales con 3 audiencias: lookalike 1% (60%), interest stack (25%) y broad (15%). ROAS esperado \u2265 3.2.",bullets:["\u{1F3AF} Advantage+ Sales \xB7 7d click 1d view","\u{1F4B8} Daily $40-60 USD","\u{1F9EA} 3 creativos \xD7 3 hooks A/B"]},humor:{title:"Idea de meme + concepto",summary:'"Lo que la gente cree que hace IA vs lo que realmente hace". Formato split-screen con caption corta + hook visual. Funciona en reels (alta retenci\xF3n) y carrusel (alta salvada).',bullets:["\u{1F3AD} Split-screen expectativa vs realidad","\u26A1 Hook visual primeros 1.5s",'\u{1F4AC} CTA "etiquet\xE1 a alguien que\u2026"']},sales:{title:"Secuencia DM funnel (5 mensajes)",summary:"Flujo de DM que cierra en 5 mensajes: warm-up \u2192 qualifying \u2192 value \u2192 objection handler \u2192 close. Adaptado a tu producto/precio. Tasa de cierre esperada 8-12%.",bullets:["1\uFE0F\u20E3 Warm-up no-vendedor","2\uFE0F\u20E3 Pregunta de qualifying","3\uFE0F\u20E3 Valor con prueba social","4\uFE0F\u20E3 Cierre con escasez suave"]},community:{title:"Plan de engagement 7 d\xEDas",summary:"Mix de stories interactivas (polls, sliders, preguntas), 2 lives breves (15min Q&A) y respuestas a top 50 comentarios. Engagement rate esperado +35%.",bullets:["\u{1F4CA} 3 polls + 2 sliders/d\xEDa","\u{1F4E1} 1 live miercoles 19h","\u{1F4AC} Top 50 comments respondidos en 60min"]}}[e.id]??{title:`${n.label} \u2014 listo`,summary:`${e.name} prepar\xF3 una propuesta para "${n.label}". Conect\xE1 el backend para ejecutarla con datos reales de tu cuenta.`,bullets:e.specialties.slice(0,3).map(o=>`\u2022 ${o}`)};return{title:a.title,summary:a.summary,bullets:a.bullets,simulated:!0}},j=(e,n,i)=>{document.querySelectorAll(".agent-result-modal").forEach(r=>r.remove());const a=document.createElement("div");a.className="agent-result-modal",a.innerHTML=`
    <div class="agent-result-backdrop"></div>
    <div class="agent-result-card">
      <div class="agent-result-header" style="background:${e.gradient};">
        <span style="font-size:28px;">${e.emoji}</span>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:800;">${s(e.name)}</div>
          <div style="font-size:11px;opacity:.85;">${s(n.label)}</div>
        </div>
        ${i.simulated?'<span class="agent-result-simbadge">modo local</span>':""}
        <button class="agent-result-close">\u2715</button>
      </div>
      <div class="agent-result-body">
        <h3 class="agent-result-title">${s(i.title??n.label)}</h3>
        <p class="agent-result-summary">${s(i.summary??"")}</p>
        ${i.bullets?.length?`<ul class="agent-result-bullets">${i.bullets.map(r=>`<li>${s(r)}</li>`).join("")}</ul>`:""}
        ${i.simulated?'<div class="agent-result-foot">\u26A0\uFE0F Resultado preview generado localmente. Conect\xE1 el backend para ejecutar con datos reales y guardar en historial.</div>':""}
      </div>
      <div class="agent-result-actions">
        <button class="btn ghost" data-close>Cerrar</button>
        <button class="btn primary" data-open-workspace>Abrir workspace del agente \u2192</button>
      </div>
    </div>`,document.body.appendChild(a);const o=()=>a.remove();a.querySelector(".agent-result-backdrop").addEventListener("click",o),a.querySelector(".agent-result-close").addEventListener("click",o),a.querySelector("[data-close]").addEventListener("click",o),a.querySelector("[data-open-workspace]").addEventListener("click",()=>{o();const r=document.querySelector("#view")??document.querySelector("main");r&&B(r,e.id)})},I=(e,n,i)=>{if(!e)return;const a=e.querySelector(".agent-last-action"),o=`
    <span class="agent-last-action-label">\xDAltima actividad:</span>
    <span class="agent-last-action-text">${s(n)}</span>
    <span class="agent-last-action-time">${s(i)}</span>`;if(a)a.innerHTML=o;else{const r=e.querySelector(".agent-specialties");if(r){const t=document.createElement("div");t.className="agent-last-action",t.innerHTML=o,r.insertAdjacentElement("afterend",t)}}},q=async e=>{const{data:n}=await y("/api/agents/status",{}),i=A(),a=v.filter(t=>(i[t.id]??"off")!=="off").length,o=v.reduce((t,l)=>t+l.actions.length,0);e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F916} Agentes IA \xB7 Tu equipo aut\xF3nomo</h1>
        <p class="view-subtitle page-subtitle">${v.length} especialistas trabajando para vos. Cada uno con su rol, con o sin supervisi\xF3n. Como tener un equipo de profesionales de \xE9lite siempre disponible.</p>
      </div>
    </header>

    <div class="page-body">
      <!-- Stats del equipo -->
      <div class="agents-stats-row">
        <div class="agents-stat">
          <div class="agents-stat-num">${v.length}</div>
          <div class="agents-stat-lbl">agentes especialistas</div>
        </div>
        <div class="agents-stat">
          <div class="agents-stat-num" style="color:#4ade80;">${a}</div>
          <div class="agents-stat-lbl">activos ahora</div>
        </div>
        <div class="agents-stat">
          <div class="agents-stat-num">${o}</div>
          <div class="agents-stat-lbl">automatizaciones disponibles</div>
        </div>
        <div class="agents-stat">
          <div class="agents-stat-num">24/7</div>
          <div class="agents-stat-lbl">disponibilidad</div>
        </div>
      </div>

      <!-- Bulk actions -->
      <div class="agents-bulk-bar">
        <strong>Control del equipo:</strong>
        <button class="btn ghost small" data-bulk="off">\u23F8\uFE0F Pausar todos</button>
        <button class="btn ghost small" data-bulk="supervised">\u{1F441}\uFE0F Todos supervisados</button>
        <button class="btn primary small" data-bulk="auto">\u{1F680} Todos en auto</button>
        <span class="small muted" style="margin-left:auto;">El modo se aplica tambi\xE9n desde la flechita del topbar Computer Use.</span>
      </div>

      <!-- Grid de agentes con autonomy + status -->
      <div class="agents-grid">
        ${v.map(t=>{const l=i[t.id]??"off",c=n?.[t.id],d=c?.lastAction,p=c?.queueSize??0;return`
          <div class="agent-card" data-agent-id="${t.id}" style="--agent-gradient:${t.gradient}">
            <div class="agent-card-glow"></div>
            <div class="agent-card-status">
              <span class="agent-status-dot ${l==="off"?"off":l==="supervised"?"super":"auto"}"></span>
              <span class="agent-status-label">${l==="off"?"Pausado":l==="supervised"?"Supervisado":"Aut\xF3nomo"}</span>
            </div>
            <div class="agent-card-header">
              <div class="agent-emoji">${t.emoji}</div>
              <div class="agent-card-info">
                <div class="agent-name">${s(t.name)}</div>
                <div class="agent-tagline">${s(t.tagline)}</div>
              </div>
            </div>
            <p class="agent-card-desc">${s(t.description)}</p>
            <div class="agent-specialties">
              ${t.specialties.slice(0,3).map(u=>`<span class="agent-specialty-chip">${s(u)}</span>`).join("")}
              ${t.specialties.length>3?`<span class="agent-specialty-chip more">+${t.specialties.length-3}</span>`:""}
            </div>

            ${d?`
              <div class="agent-last-action">
                <span class="agent-last-action-label">\xDAltima actividad:</span>
                <span class="agent-last-action-text">${s(d.title??"\u2014")}</span>
                <span class="agent-last-action-time">${s(d.at??"")}</span>
              </div>`:""}

            <!-- Autonomy switch -->
            <div class="agent-autonomy">
              <div class="agent-autonomy-label">Autonom\xEDa:</div>
              <div class="agent-autonomy-pills">
                <button class="agent-autonomy-pill ${l==="off"?"active":""}" data-mode="off" data-agent-id="${t.id}" title="No ejecuta nada por su cuenta">\u{1F534} Off</button>
                <button class="agent-autonomy-pill ${l==="supervised"?"active":""}" data-mode="supervised" data-agent-id="${t.id}" title="Te pide aprobaci\xF3n para cada acci\xF3n importante">\u{1F441}\uFE0F Supervisado</button>
                <button class="agent-autonomy-pill ${l==="auto"?"active":""}" data-mode="auto" data-agent-id="${t.id}" title="Trabaja solo sin pedir confirmaci\xF3n">\u{1F680} Auto</button>
              </div>
            </div>

            <div class="agent-card-actions-row">
              <button class="btn primary small agent-open-btn" data-agent-id="${t.id}">Abrir workspace \u2192</button>
              <button class="btn ghost small agent-run-now" data-agent-id="${t.id}" title="Lanzar el agente con su acci\xF3n primaria ahora">\u26A1 Lanzar ahora</button>
            </div>
          </div>`}).join("")}
      </div>
    </div>`,e.querySelectorAll(".agent-open-btn").forEach(t=>{t.addEventListener("click",()=>B(e,t.dataset.agentId))});const r=async t=>{const l=t.target.closest(".agent-autonomy-pill");if(l){t.preventDefault(),t.stopPropagation();const d=l.dataset.agentId,p=l.dataset.mode;_(d,p),e.querySelectorAll(`.agent-autonomy-pill[data-agent-id="${d}"]`).forEach(b=>{b.classList.toggle("active",b.dataset.mode===p)});const u=e.querySelector(`.agent-card[data-agent-id="${d}"]`);if(u){const b=u.querySelector(".agent-status-dot"),$=u.querySelector(".agent-status-label");b&&(b.className=`agent-status-dot ${p==="off"?"off":p==="supervised"?"super":"auto"}`),$&&($.textContent=p==="off"?"Pausado":p==="supervised"?"Supervisado":"Aut\xF3nomo")}y(`/api/agents/${d}/autonomy`,null,{method:"PUT",body:{mode:p}}).catch(()=>{});const S=v.find(b=>b.id===d)?.name??d;m(`${S}: ${p==="off"?"\u23F8\uFE0F pausado":p==="supervised"?"\u{1F441}\uFE0F supervisado":"\u{1F680} aut\xF3nomo"}`,"ok");return}const c=t.target.closest(".agent-run-now");if(c){t.preventDefault(),t.stopPropagation();const d=c.dataset.agentId,p=v.find(h=>h.id===d);if(!p)return;const u=p.actions?.[0];if(!u){m("Este agente no tiene acci\xF3n primaria definida","warn");return}c.disabled=!0;const S=c.innerHTML;c.innerHTML="\u23F3 ejecutando\u2026";const{data:b,error:$}=await y(`/api/agents/${d}/action`,null,{method:"POST",body:{actionId:u.id,params:{}}});if($){await new Promise(G=>setTimeout(G,900));const h=D(p,u);j(p,u,h);const F=e.querySelector(`.agent-card[data-agent-id="${d}"]`);I(F,h.title,"ahora"),m(`\u2728 ${p.name}: ${h.title} (modo local)`,"ok")}else{j(p,u,b??{});const h=e.querySelector(`.agent-card[data-agent-id="${d}"]`);I(h,b?.title??u.label,"ahora"),m(`\u2728 ${p.name}: ${b?.title??u.label}`,"ok")}c.disabled=!1,c.innerHTML=S;return}};e.removeEventListener("click",e._agentsHubClick??(()=>{})),e._agentsHubClick=r,e.addEventListener("click",r),e.querySelectorAll("[data-bulk]").forEach(t=>{t.addEventListener("click",()=>{const l=t.dataset.bulk,c={};v.forEach(d=>{c[d.id]=l}),L(c),q(e),m(`Equipo: ${l==="off"?"\u23F8\uFE0F pausado":l==="supervised"?"\u{1F441}\uFE0F supervisado":"\u{1F680} aut\xF3nomo"}`,"ok")})})},O="feedia.agents.automations",H=()=>{try{return JSON.parse(localStorage.getItem(O)??"{}")}catch{return{}}},W=e=>{try{localStorage.setItem(O,JSON.stringify(e))}catch{}},f=e=>H()[e]??[],x=(e,n)=>{const i=H();i[e]=n,W(i)},E={hourly:"\u23F0 Cada hora","4h":"\u23F0 Cada 4 horas",daily:"\u2600\uFE0F Diario",weekdays:"\u{1F4C5} D\xEDas h\xE1biles (L-V)",weekly:"\u{1F4C6} Semanal",monthly:"\u{1F4C5} Mensual"},X={algorithm:[{actionId:"timing",freq:"daily",label:"Detectar ventana \xF3ptima de hoy"},{actionId:"shadowban",freq:"daily",label:"Chequeo diario shadowban"},{actionId:"reach-boost",freq:"weekly",label:"Boost de reach semanal"}],"meta-ads":[{actionId:"roas-plan",freq:"weekly",label:"Revisar ROAS semanal"},{actionId:"creative-brief",freq:"weekly",label:"Brief creativo semanal"}],humor:[{actionId:"entertainment-calendar",freq:"weekly",label:"Calendario humor 7 d\xEDas"},{actionId:"trending-humor",freq:"daily",label:"Detectar humor trending diario"}],sales:[{actionId:"cta-generator",freq:"weekly",label:"10 CTAs semanales"},{actionId:"story-selling",freq:"weekly",label:"Secuencia stories selling"}],community:[{actionId:"engagement-plan",freq:"weekly",label:"Plan engagement 7 d\xEDas"},{actionId:"comment-templates",freq:"daily",label:"Templates de comentarios al d\xEDa"}]},R=e=>{const n=f(e.id),i=X[e.id]??[];return`
    <div style="padding:16px;">
      <div style="margin-bottom:14px;">
        <h3 style="margin:0 0 4px;font-size:16px;">\u{1F501} Automatizaciones de ${s(e.name)}</h3>
        <p class="small muted" style="margin:0;line-height:1.5;">
          Program\xE1 tareas recurrentes. ${s(e.name)} las ejecuta solo (o pide aprobaci\xF3n seg\xFAn su modo de autonom\xEDa).
        </p>
      </div>

      <!-- Nueva automatizaci\xF3n -->
      <div class="agent-auto-new">
        <h4 style="margin:0 0 10px;font-size:13px;">\u2795 Nueva automatizaci\xF3n</h4>
        <div class="agent-auto-form">
          <select id="auto-action" class="input">
            <option value="">\u2014 Acci\xF3n \u2014</option>
            ${e.actions.map(a=>`<option value="${s(a.id)}">${a.icon??"\u2699\uFE0F"} ${s(a.label)}</option>`).join("")}
          </select>
          <select id="auto-freq" class="input">
            ${Object.entries(E).map(([a,o])=>`<option value="${a}">${o}</option>`).join("")}
          </select>
          <button class="btn primary" id="auto-add">Agregar</button>
        </div>
      </div>

      ${i.length?`
        <div class="agent-auto-suggestions">
          <h4 style="margin:14px 0 6px;font-size:12px;color:var(--text-muted,#9CA3AF);text-transform:uppercase;letter-spacing:.05em;">\u{1F4A1} Sugerencias para este agente</h4>
          <div class="agent-auto-sugg-list">
            ${i.map(a=>{const o=e.actions.find(r=>r.id===a.actionId);return o?`<button class="agent-auto-sugg-btn" data-sugg-action="${s(a.actionId)}" data-sugg-freq="${s(a.freq)}">
                <span>${o.icon??"\u2699\uFE0F"} ${s(a.label)}</span>
                <span class="agent-auto-sugg-freq">${E[a.freq]}</span>
              </button>`:""}).join("")}
          </div>
        </div>`:""}

      <!-- Lista de automatizaciones activas -->
      <div class="agent-auto-list" id="agent-auto-list" style="margin-top:18px;">
        ${n.length?n.map((a,o)=>{const r=e.actions.find(t=>t.id===a.actionId);return`
            <div class="agent-auto-item" data-idx="${o}">
              <span class="agent-auto-toggle ${a.enabled?"on":"off"}" data-toggle="${o}">${a.enabled?"\u{1F7E2}":"\u26AA"}</span>
              <div class="agent-auto-info">
                <div class="agent-auto-name">${r?.icon??"\u2699\uFE0F"} ${s(r?.label??a.actionId)}</div>
                <div class="agent-auto-meta">${E[a.freq]??a.freq} \xB7 ${a.lastRun?`\xFAltima ejecuci\xF3n: ${s(a.lastRun)}`:"nunca ejecutada"}</div>
              </div>
              <button class="agent-auto-run" data-run="${o}" title="Ejecutar ahora">\u25B6</button>
              <button class="agent-auto-del" data-del="${o}" title="Eliminar">\u{1F5D1}</button>
            </div>`}).join(""):'<div class="muted small" style="text-align:center;padding:24px;background:rgba(255,255,255,.02);border-radius:10px;">Sin automatizaciones todav\xEDa. Cre\xE1 una arriba o eleg\xED una sugerencia.</div>'}
      </div>
    </div>

    <style>
      .agent-auto-new { background:rgba(255,255,255,.03); padding:14px; border-radius:12px; border:1px solid var(--border); }
      .agent-auto-form { display:grid; grid-template-columns:1fr 1fr auto; gap:8px; }
      .agent-auto-form .input { font-size:12.5px; }
      @media (max-width:640px){ .agent-auto-form { grid-template-columns:1fr; } }
      .agent-auto-sugg-list { display:flex; flex-direction:column; gap:6px; }
      .agent-auto-sugg-btn {
        display:flex; justify-content:space-between; align-items:center; gap:10px;
        padding:9px 12px; border-radius:8px;
        background:rgba(168,85,247,.06); border:1px solid rgba(168,85,247,.2);
        color:var(--fg,#fff); cursor:pointer; font-size:12.5px;
      }
      .agent-auto-sugg-btn:hover { background:rgba(168,85,247,.12); }
      .agent-auto-sugg-freq { font-size:10.5px; color:var(--text-muted,#9CA3AF); }
      .agent-auto-item {
        display:flex; align-items:center; gap:10px; padding:11px 12px;
        background:var(--surface,#141418); border:1px solid var(--border);
        border-radius:10px; margin-bottom:6px;
      }
      .agent-auto-toggle { font-size:16px; cursor:pointer; flex-shrink:0; user-select:none; }
      .agent-auto-info { flex:1; min-width:0; }
      .agent-auto-name { font-weight:600; font-size:13px; }
      .agent-auto-meta { font-size:11px; color:var(--text-muted,#9CA3AF); margin-top:2px; }
      .agent-auto-run, .agent-auto-del {
        background:transparent; border:0; cursor:pointer; padding:6px 8px; border-radius:6px;
        color:var(--fg,#fff); font-size:14px;
      }
      .agent-auto-run:hover { background:rgba(16,185,129,.15); color:#10b981; }
      .agent-auto-del:hover { background:rgba(239,68,68,.15); color:#ef4444; }

      .agent-ws-tabs {
        display:flex; gap:4px; padding:8px 14px 0;
        border-bottom:1px solid var(--border);
      }
      .agent-ws-tab {
        background:transparent; border:0; padding:10px 14px; cursor:pointer;
        color:var(--text-muted,#9CA3AF); font-size:13px; font-weight:600;
        border-bottom:2px solid transparent; margin-bottom:-1px;
      }
      .agent-ws-tab.active {
        color:var(--fg,#fff); border-bottom-color:#a855f7;
      }
    </style>`},N=(e,n)=>{const i=()=>{const a=e.querySelector('[data-ws-pane="automations"]');a&&(a.innerHTML=R(n).replace(/^[\s\S]*<div style="padding:16px;">/,'<div style="padding:16px;">'),N(e,n))};e.querySelector("#auto-add")?.addEventListener("click",()=>{const a=e.querySelector("#auto-action")?.value,o=e.querySelector("#auto-freq")?.value;if(!a){m("Eleg\xED una acci\xF3n","warn");return}const r=f(n.id);r.push({actionId:a,freq:o,enabled:!0,lastRun:null,createdAt:new Date().toISOString()}),x(n.id,r),y(`/api/agents/${n.id}/automations`,null,{method:"POST",body:{actionId:a,freq:o}}).catch(()=>{}),m(`\u2705 Automatizaci\xF3n agregada \xB7 ${E[o]??o}`,"ok"),i()}),e.querySelectorAll("[data-sugg-action]").forEach(a=>{a.addEventListener("click",()=>{const o=f(n.id);o.push({actionId:a.dataset.suggAction,freq:a.dataset.suggFreq,enabled:!0,lastRun:null,createdAt:new Date().toISOString()}),x(n.id,o),m("\u2705 Automatizaci\xF3n sugerida activada","ok"),i()})}),e.querySelectorAll("[data-toggle]").forEach(a=>{a.addEventListener("click",()=>{const o=Number(a.dataset.toggle),r=f(n.id);r[o]&&(r[o].enabled=!r[o].enabled,x(n.id,r),m(r[o].enabled?"\u{1F7E2} Activada":"\u26AA Pausada","info"),i())})}),e.querySelectorAll("[data-run]").forEach(a=>{a.addEventListener("click",async()=>{const o=Number(a.dataset.run),r=f(n.id);if(!r[o])return;const t=n.actions.find(p=>p.id===r[o].actionId);if(!t)return;a.disabled=!0,a.textContent="\u23F3";const{data:l,error:c}=await y(`/api/agents/${n.id}/action`,null,{method:"POST",body:{actionId:t.id,params:{}}});a.disabled=!1,a.textContent="\u25B6";const d=c?D(n,t):l??{};j(n,t,d),r[o].lastRun=new Date().toLocaleString("es-MX",{dateStyle:"short",timeStyle:"short"}),x(n.id,r),i()})}),e.querySelectorAll("[data-del]").forEach(a=>{a.addEventListener("click",()=>{const o=Number(a.dataset.del),r=f(n.id);r.splice(o,1),x(n.id,r),m("Automatizaci\xF3n eliminada","info"),i()})})},B=(e,n)=>{const i=v.find(t=>t.id===n);if(!i)return;M=n,g.has(n)||g.set(n,[]),e.innerHTML=`
    <div class="agent-workspace">
      <div class="agent-workspace-header" style="background:${i.gradient}">
        <button class="btn ghost small" id="back-to-hub-btn" style="color:#fff;border-color:rgba(255,255,255,.3);flex-shrink:0">\u2190 Agentes</button>
        <div class="agent-workspace-title">
          <span style="font-size:34px;line-height:1">${i.emoji}</span>
          <div>
            <div style="font-size:18px;font-weight:800;color:#fff">${s(i.name)}</div>
            <div style="font-size:12.5px;color:rgba(255,255,255,.75)">${s(i.tagline)}</div>
          </div>
        </div>
        <div class="agent-specialties" style="flex:1;justify-content:flex-end">
          ${i.specialties.map(t=>`<span class="agent-specialty-chip" style="border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.85)">${s(t)}</span>`).join("")}
        </div>
      </div>

      <!-- Tabs del workspace -->
      <div class="agent-ws-tabs">
        <button class="agent-ws-tab active" data-ws="actions">\u26A1 Acciones r\xE1pidas</button>
        <button class="agent-ws-tab" data-ws="automations">\u{1F501} Automatizaciones</button>
        <button class="agent-ws-tab" data-ws="chat">\u{1F4AC} Chat</button>
      </div>

      <div class="agent-workspace-body">
        <!-- LEFT: Actions panel -->
        <div class="agent-actions-panel" data-ws-pane="actions">
          <div style="padding:14px 16px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-tertiary)">
            Acciones r\xE1pidas
          </div>
          <div class="agent-actions-list">
            ${i.actions.map(V).join("")}
          </div>
          <div class="agent-result-area" id="action-result-area" style="display:none"></div>
        </div>

        <!-- MID: Automatizaciones -->
        <div class="agent-automations-panel" data-ws-pane="automations" hidden>
          ${R(i)}
        </div>

        <!-- RIGHT: Chat panel -->
        <div class="agent-chat-panel" data-ws-pane="chat" hidden>
          <div id="agent-chat-messages" class="agent-chat-messages"></div>
          <div class="agent-chat-input-area">
            <textarea class="chat-input" id="agent-chat-input" placeholder="Preguntale a ${s(i.name)}\u2026" rows="1"></textarea>
            <button class="btn gradient chat-send-btn" id="agent-send-btn" style="flex-shrink:0;border-radius:12px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>`,e.querySelectorAll(".agent-ws-tab").forEach(t=>{t.addEventListener("click",()=>{const l=t.dataset.ws;e.querySelectorAll(".agent-ws-tab").forEach(c=>c.classList.toggle("active",c===t)),e.querySelectorAll("[data-ws-pane]").forEach(c=>c.hidden=c.dataset.wsPane!==l)})}),N(e,i),e.querySelector("#back-to-hub-btn")?.addEventListener("click",()=>{q(e)}),k(e,i),e.querySelectorAll(".agent-toggle-btn").forEach(t=>{t.addEventListener("click",()=>{const l=t.dataset.actionId,c=e.querySelector(`#aform-${l}`);if(!c)return;const d=c.style.display!=="none";c.style.display=d?"none":"flex",c.style.flexDirection="column",t.textContent=d?"\u25B8 Configurar y ejecutar":"\u25B4 Cerrar"})}),e.querySelectorAll(".agent-run-btn").forEach(t=>{t.addEventListener("click",()=>Z(e,i,t.dataset.actionId))});const a=e.querySelector("#agent-chat-input");e.querySelector("#agent-send-btn")?.addEventListener("click",()=>{const t=a?.value?.trim();t&&(a.value="",C(e,i,t))}),a?.addEventListener("keydown",t=>{if(t.key==="Enter"&&!t.shiftKey){t.preventDefault();const l=a.value.trim();l&&(a.value="",C(e,i,l))}}),a?.addEventListener("input",()=>{a.style.height="auto",a.style.height=Math.min(a.scrollHeight,120)+"px"});const r=g.get(n)??[];r.length||setTimeout(()=>{const t={role:"assistant",content:`\xA1Hola! Soy ${i.name}. ${i.description} \xBFEn qu\xE9 te puedo ayudar hoy?`,html:`\xA1Hola! Soy <strong>${i.name}</strong>. ${s(i.description)}<br><br>Pod\xE9s usar las <strong>Acciones r\xE1pidas</strong> de la izquierda para resultados inmediatos, o simplemente preguntarme lo que necesit\xE1s. \xBFPor d\xF3nde empezamos?`,ts:Date.now()};r.push(t),g.set(n,r),k(e,i)},100)},k=(e,n)=>{const i=e.querySelector("#agent-chat-messages");if(!i)return;const a=g.get(n.id)??[];if(!a.length){i.innerHTML=`<div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:40px;text-align:center">
      <div style="font-size:48px">${n.emoji}</div>
      <div style="font-size:16px;font-weight:700">${s(n.name)}</div>
      <div style="font-size:13px;color:var(--text-secondary);max-width:260px;line-height:1.6">${s(n.tagline)}</div>
    </div>`;return}i.innerHTML=a.map(o=>P(o,n)).join(""),i.scrollTop=i.scrollHeight,i.querySelectorAll(".agent-suggestion-chip").forEach(o=>{o.addEventListener("click",()=>C(e,n,o.textContent??""))})};let w=!1;const C=async(e,n,i)=>{if(w)return;w=!0;const a=g.get(n.id)??[];a.push({role:"user",content:i,ts:Date.now()}),g.set(n.id,a);const o=e.querySelector("#agent-chat-messages"),r=e.querySelector("#agent-send-btn");r&&(r.disabled=!0),o&&(o.innerHTML=a.map(t=>P(t,n)).join("")+Y(n),o.scrollTop=o.scrollHeight);try{const t=await T(`/api/agents/${n.id}/chat`,{body:{message:i,history:a.slice(-10,-1).map(l=>({role:l.role,content:l.content}))}});a.push({role:"assistant",content:t.reply??"",html:t.replyHtml??s(t.reply??""),suggestions:t.suggestions??[],ts:Date.now()}),g.set(n.id,a)}catch(t){a.push({role:"assistant",content:`Lo siento, hubo un error: ${t.message}`,ts:Date.now()}),g.set(n.id,a),m(t.message,"crit")}finally{w=!1,r&&(r.disabled=!1),k(e,n)}},Z=async(e,n,i)=>{const a=n.actions.find(l=>l.id===i);if(!a)return;const o={};if(a.params.length){const l=e.querySelector(`#aform-${i}`);l&&l.querySelectorAll("[data-param]").forEach(c=>{o[c.dataset.param]=c.value?.trim()??""})}const r=e.querySelector("#action-result-area");r&&(r.style.display="block",r.innerHTML=`<div style="padding:20px;text-align:center"><span class="spinner lg"></span><div class="small muted" style="margin-top:12px">\u26A1 ${s(n.name)} est\xE1 generando\u2026</div></div>`);const t=g.get(n.id)??[];t.push({role:"user",content:`[Acci\xF3n: ${a.label}]`,ts:Date.now()}),g.set(n.id,t);try{const l=await T(`/api/agents/${n.id}/action`,{body:{actionId:i,params:o}});r&&(r.innerHTML=K(l),r.querySelector("#result-close-btn")?.addEventListener("click",()=>{r.style.display="none"}),r.scrollIntoView({behavior:"smooth",block:"nearest"})),t.push({role:"assistant",content:l.summary??l.title??"Acci\xF3n completada.",html:`<strong>\u2705 ${s(l.title)}</strong><br><br>${s(l.summary??"")}`,ts:Date.now()}),g.set(n.id,t),k(e,n),m("Acci\xF3n completada \u2713","ok")}catch(l){r&&(r.innerHTML=`<div class="alert crit" style="margin:0">\u26A0\uFE0F Error: ${s(l.message)}</div>`),m(l.message,"crit")}};if(typeof document<"u"&&!document.getElementById("fd-agents-style")){const e=document.createElement("style");e.id="fd-agents-style",e.textContent=`
    .agent-card{background:#fff !important;border:1px solid #E6E8EE !important;border-radius:16px !important;padding:18px !important;color:#15181E !important;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:transform .15s,box-shadow .15s,border-color .15s;}
    .agent-card:hover{transform:translateY(-3px);border-color:#9da9ff !important;box-shadow:0 12px 32px rgba(124,58,237,.14) !important;}
    .agent-card .agent-card-glow{display:none;}
    .agent-card-info h3,.agent-card-info strong,.agent-card-info .agent-name{color:#15181E !important;}
    .agent-card-desc{color:#475067 !important;line-height:1.5;}
    .agent-card-status{color:#10B981;}
    .agents-stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;}
    .agents-stat{background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:12px;color:#15181E;}
    .agents-stat-num{font-size:22px;font-weight:800;color:#15181E;line-height:1;}
    .agents-stat-lbl{font-size:11px;color:#667085;text-transform:uppercase;letter-spacing:.04em;margin-top:6px;font-weight:600;}
    .agents-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
    .agents-bulk-bar{background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:10px 14px;color:#15181E;}
  `,document.head.appendChild(e)}export const renderAgents=async e=>{M=null,w=!1,e.innerHTML=U("Cargando agentes\u2026"),await new Promise(n=>setTimeout(n,80)),await q(e)};
