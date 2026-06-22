import{api as u,apiBust as v,apiSafe as m}from"../lib/api.js";import{escape as a}from"../lib/dom.js";import{toast as x}from"../lib/toast.js";import{setPlatform as h,getPlatform as f}from"../lib/platform.js";let s=null,d=null;const k={"initial-greeting":"\u{1F44B}","system-naming":"\u2728","mascot-selection":"\u{1F91D}","first-question":"\u{1F4AD}","theme-selection":"\u{1F3A8}","goal-aspiration":"\u{1F680}","sample-action":"\u{1F3AC}","first-promise":"\u{1F91E}",completion:"\u{1F389}"},g={instagram:{label:"Instagram",emoji:"\u{1F4F8}",accent:"#C13584",note:"Algoritmo IG: gana lo que se GUARDA y se MANDA por DM. FeedIA optimiza para sends/saves y alcance de Reels.",tools:[{route:"studio-carousel",icon:"\u{1F3A0}",name:"Studio Carrusel",tagline:"Carruseles 4:5 que la gente guarda y comparte.",caps:["Estrategia + copy slide a slide con tu voz de marca","Prompts de imagen gpt-image-2 / nano-banana","Render real de PNG 1080\xD71350","Caption + hashtags anti-shadowban","Dise\xF1a en Canva v\xEDa Computer Use"],help:"Sube saves + dwell time: slide 1 promete, \xFAltima paga + CTA."},{route:"studio-reel",icon:"\u{1F3AC}",name:"Studio Reel",tagline:"Reels 9:16, motor de alcance fr\xEDo (no-seguidores).",caps:["Guion beat a beat + hook visual 0.3s","Texto en pantalla + b-roll sugerido","Audio/sonido recomendado","Cover frame + caption + hashtags","Render IA o Canva (CU)"],help:"Optimiza retenci\xF3n y loop: lo que se ve completo, se distribuye."},{route:"studio-stories",icon:"\u{1F4D6}",name:"Studio Stories",tagline:"Secuencias 1080\xD71920 para tus seguidores.",caps:["Frames + copy por frame","Stickers poll / quiz / slider / pregunta","CTA + link sugerido","Render IA o Canva (CU)"],help:"Sube relaci\xF3n y respuestas (no alcance fr\xEDo): completion + replies."},{route:"feed",icon:"\u{1F464}",name:"Perfil & Feed",tagline:"Tu primera impresi\xF3n y coherencia visual.",caps:["Perfil: foto, @, bio, seguidores/seguidos/likes","Coherencia est\xE9tica del grid","Lectura de tus publicaciones"],help:"Convierte al visitante: bio clara + grid coherente = m\xE1s follows."}]},tiktok:{label:"TikTok",emoji:"\u{1F3B5}",accent:"#FE2C55",note:"Algoritmo TikTok (\u2260 IG): FYP en fr\xEDo, los seguidores casi no importan; mandan completion-rate + rewatch + sonido trending.",tools:[{route:"studio-tiktok",icon:"\u{1F3A5}",name:"Studio TikTok Video",tagline:"Video para FYP, de la idea al montaje final.",caps:["Estrategia FYP + guion con lenguaje no verbal","CapCut v\xEDa CU: cortes, subt\xEDtulos auto, beat-sync","Clip IA: Sora / Seedance / Pika / Kling","Frames/cover: Nano Banana / gpt-image","Editor nativo TikTok + sonido trending"],help:"Maximiza completion + rewatch: ritmo de cortes 2-4s y loop de cierre."},{route:"studio-tiktok-photo",icon:"\u{1F5BC}\uFE0F",name:"Foto TikTok \xB7 Photo Mode",tagline:"Carrusel de fotos NATIVO de TikTok (\u2260 carrusel IG).",caps:["Equipo de IA interno perfecciona el prompt de cada foto","Lienzo de preview 9:16 + miniaturas","Audiencia (edad/g\xE9nero/regi\xF3n) + estilo/paleta/mood","18 estilos visuales, densidad de texto","Render IA o editar en Canva / Photopea (CU)"],help:"Foto 1 = hook que obliga a deslizar; 1 idea por foto = swipe completion."},{route:"studio-tiktok-script",icon:"\u270D\uFE0F",name:"Guion TikTok",tagline:"Guion beat a beat listo para grabar.",caps:["Hooks 0-2s (verbal + visual + on-screen)","Lenguaje no verbal: gesto, expresi\xF3n, mirada","Audiencia + tono + tipo de gancho + CTA + ritmo","18 tipos de video (POV, storytime, listicle\u2026)","10 hooks + checklist de retenci\xF3n"],help:"Construido para completion: open loops, cliffhangers y loop final."}]}},E=e=>`
  <div class="tools-col" style="background:#fff;border:1px solid #E3E6EB;border-top:3px solid ${e.accent};border-radius:16px;padding:18px;box-shadow:0 1px 2px rgba(16,24,40,.04);">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:22px;">${e.emoji}</span>
      <h3 style="margin:0;font-size:18px;color:#15181E;">${a(e.label)}</h3>
    </div>
    <p style="margin:0 0 14px;line-height:1.5;font-size:13px;color:#475067;">${a(e.note)}</p>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${e.tools.map(t=>`
        <div class="tool-row" data-tool-route="${a(t.route)}" style="cursor:pointer;background:#F8F9FB;border:1px solid #E9ECF2;border-radius:12px;padding:15px;transition:transform .15s,border-color .15s,box-shadow .15s;">
          <div style="display:flex;gap:11px;align-items:center;">
            <span style="font-size:24px;line-height:1;flex-shrink:0;">${t.icon}</span>
            <span style="flex:1;min-width:0;">
              <span style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:15px;color:#15181E;">${a(t.name)} <span style="color:${e.accent};font-size:12px;margin-left:auto;white-space:nowrap;">Abrir \u2192</span></span>
              <span style="display:block;line-height:1.4;margin-top:2px;font-size:13px;color:#667085;">${a(t.tagline)}</span>
            </span>
          </div>
          <ul style="margin:11px 0 0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:5px;">
            ${t.caps.map(n=>`<li style="display:flex;gap:7px;line-height:1.45;font-size:13px;color:#344054;"><span style="color:${e.accent};flex-shrink:0;font-weight:700;">\u2713</span><span>${a(n)}</span></li>`).join("")}
          </ul>
          <div style="margin-top:10px;padding-top:9px;border-top:1px solid #E9ECF2;font-size:13px;color:#475067;line-height:1.45;"><strong style="color:${e.accent};">C\xF3mo te ayuda:</strong> ${a(t.help)}</div>
        </div>`).join("")}
    </div>
  </div>`,w=e=>e==="tiktok"?[g.tiktok]:e==="instagram"?[g.instagram]:[g.instagram,g.tiktok],C=e=>{const t=w(e);return`
  <div id="welcome-tools" style="margin-top:40px;">
    <h2 style="text-align:center;margin-bottom:6px;">${e==="tiktok"?"Tus herramientas de TikTok":e==="instagram"?"Tus herramientas de Instagram":"Tus herramientas \u2014 Instagram y TikTok"}</h2>
    <p class="small muted" style="text-align:center;margin-bottom:24px;">Qu\xE9 hace cada Studio y c\xF3mo te ayuda. Toc\xE1 una para abrirla.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;max-width:1100px;margin:0 auto;">
      ${t.map(E).join("")}
    </div>
    <style>
      .tool-row:hover{transform:translateY(-2px);border-color:var(--accent,#7C3AED) !important;box-shadow:0 6px 18px rgba(0,0,0,.25);}
    </style>
  </div>`},S=e=>{e.querySelectorAll(".tool-row").forEach(t=>{t.addEventListener("click",()=>{const n=t.dataset.toolRoute,r=n.startsWith("studio-tiktok")?"tiktok":n.startsWith("studio-")?"instagram":null;if(r)try{h(r)}catch{}window.location.hash=`#${n}`})})},b=e=>{e.querySelector("#welcome-tools")?.remove(),e.insertAdjacentHTML("beforeend",C(f())),S(e)},q=e=>{e.innerHTML=`
    <div class="welcome-hero" style="text-align:center;padding:60px 20px;background:linear-gradient(135deg,#FBE7C6 0%,#FFD6A5 100%);color:#1A1A1A;border-radius:18px;">
      <div style="font-size:80px;line-height:1;">\u{1F4E6}</div>
      <h1 style="font-size:42px;margin:20px 0 10px;">Bienvenido a tu nuevo asistente</h1>
      <p style="font-size:18px;opacity:0.85;max-width:600px;margin:0 auto;">Vamos a personalizarlo a tu medida. 7 minutos. Ning\xFAn clic se pierde.</p>
      <button class="btn primary large" id="show-tutorials" style="margin-top:30px;font-size:18px;padding:14px 32px;">Empezar la experiencia \u2192</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:30px;">
      <div class="card"><h4>\u{1F3A8} Tema visual</h4><p class="small muted">Eleg\xED los colores y la onda</p></div>
      <div class="card"><h4>\u{1F91D} Tu compa\xF1ero</h4><p class="small muted">Un mascot que te acompa\xF1a</p></div>
      <div class="card"><h4>\u{1F680} Tu meta</h4><p class="small muted">So\xF1emos en grande</p></div>
      <div class="card"><h4>\u{1F3AC} Demo en vivo</h4><p class="small muted">Te muestro qu\xE9 puedo hacer</p></div>
    </div>

    <div id="tutorial-picker" hidden style="margin-top:40px;">
      <h2 style="text-align:center;margin-bottom:10px;">\xBFC\xF3mo quer\xE9s usar FeedIA?</h2>
      <p class="small muted" style="text-align:center;margin-bottom:24px;">Eleg\xED el modo que m\xE1s se adapta a vos. Pod\xE9s cambiarlo despu\xE9s en cualquier momento desde el bot\xF3n "Computer Use" del top bar.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;max-width:1100px;margin:0 auto;">
        <button class="tutorial-card" data-tutorial="computer-use" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,rgba(63,184,201,0.15),rgba(63,184,201,0.04));border:2px solid rgba(63,184,201,0.4);border-radius:14px;padding:22px;color:inherit;">
          <div style="font-size:42px;margin-bottom:10px;">\u{1F916}</div>
          <h3 style="margin:0 0 8px;">Modo Autom\xE1tico</h3>
          <p class="small muted">FeedIA usa el cursor solo. Vos te cruz\xE1s de brazos y mir\xE1s c\xF3mo abre Canva, dise\xF1a, exporta y publica en Instagram.</p>
          <ul class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.6;">
            <li>El m\xE1s c\xF3modo: cero clicks tuyos</li>
            <li>Mir\xE1s todo en tiempo real (SSE)</li>
            <li>Requiere ANTHROPIC_API_KEY</li>
          </ul>
          <div class="small accent" style="margin-top:12px;font-weight:600;">\u2192 Recomendado para empezar</div>
        </button>

        <button class="tutorial-card" data-tutorial="supervised" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.04));border:2px solid rgba(245,158,11,0.4);border-radius:14px;padding:22px;color:inherit;">
          <div style="font-size:42px;margin-bottom:10px;">\u{1F441}\uFE0F</div>
          <h3 style="margin:0 0 8px;">Modo Acompa\xF1ado</h3>
          <p class="small muted">FeedIA propone cada paso y vos aprob\xE1s antes de ejecutar. Aprend\xE9s mientras opera.</p>
          <ul class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.6;">
            <li>Aprob\xE1s cada acci\xF3n importante</li>
            <li>Ideal para entender qu\xE9 hace el sistema</li>
            <li>Vos siempre ten\xE9s el control</li>
          </ul>
          <div class="small" style="margin-top:12px;color:#F59E0B;font-weight:600;">\u2192 Ideal si quer\xE9s aprender</div>
        </button>

        <button class="tutorial-card" data-tutorial="manual" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,rgba(132,204,22,0.15),rgba(132,204,22,0.04));border:2px solid rgba(132,204,22,0.4);border-radius:14px;padding:22px;color:inherit;">
          <div style="font-size:42px;margin-bottom:10px;">\u270B</div>
          <h3 style="margin:0 0 8px;">Modo Manual</h3>
          <p class="small muted">Vos hac\xE9s. FeedIA es tu asistente: te sugiere captions, hashtags, hooks, ideas. Decid\xEDs y public\xE1s vos.</p>
          <ul class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.6;">
            <li>Control 100% en tus manos</li>
            <li>FeedIA solo sugiere y analiza</li>
            <li>Sin Computer Use</li>
          </ul>
          <div class="small" style="margin-top:12px;color:#84CC16;font-weight:600;">\u2192 Para quien prefiere el control total</div>
        </button>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <button class="btn ghost" id="back-from-tutorials">\u2190 Volver</button>
        <button class="btn primary" id="start-onboarding" style="margin-left:10px;">Saltar tutorial y configurar \u2192</button>
      </div>
    </div>

    <div id="tutorial-detail" hidden style="margin-top:30px;"></div>

    <!-- Mini-tutoriales adicionales: features que el usuario suele preguntar -->
    <div style="margin-top:48px;">
      <h2 style="text-align:center;margin-bottom:6px;">M\xE1s cosas que pod\xE9s hacer</h2>
      <p class="small muted" style="text-align:center;margin-bottom:24px;">Mini-tutoriales para sacarle todo el jugo a la plataforma.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;max-width:1100px;margin:0 auto;">
        <button class="tutorial-card mini" data-tutorial="voice" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u{1F399}\uFE0F</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Comandos por voz</h3>
          <p class="small muted" style="line-height:1.5;">Dec\xED "Hola FeedIA" o toc\xE1 el micr\xF3fono y pedile cualquier cosa: "dise\xF1\xE1 un carrusel sobre X", "mostrame las m\xE9tricas", "respond\xE9 los DMs".</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="chatbot" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u2726</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Asistente FeedIA chat</h3>
          <p class="small muted" style="line-height:1.5;">La burbuja violeta al lado del micr\xF3fono. Conoce tu marca, m\xE9tricas, equipo y automatizaciones. Preg\xFAntale lo que sea.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="studios" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u{1F3A8}</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Studios: Carrusel / Reel / Story</h3>
          <p class="small muted" style="line-height:1.5;">Gener\xE1 contenido con preview en mockup de tel\xE9fono. Bot\xF3n "Dise\xF1ar en Canva" prioriza Canva API y cae a Computer Use si no hay key.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="taskboard" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u{1F4CB}</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Task Board del equipo</h3>
          <p class="small muted" style="line-height:1.5;">Kanban del equipo IA. Ves qu\xE9 hace Nova, L\xEDa, Gard, Luca, Mira en tiempo real, workload y standup diario.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="intelligence" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u{1F9EC}</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Inteligencia del sistema</h3>
          <p class="small muted" style="line-height:1.5;">Presupuesto de tokens, bandits de aprendizaje, cach\xE9 sem\xE1ntica y digest ejecutivo. Para ver c\xF3mo aprende solo.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="sala" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u{1F451}</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Sala Ejecutiva</h3>
          <p class="small muted" style="line-height:1.5;">Tu apalancamiento: cu\xE1ntas acciones ejecut\xF3 el equipo, sueldos que NO pag\xE1s, horas ahorradas y tu credencial de estatus.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="emergency" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u{1F6D1}</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Frenar al agente (emergencia)</h3>
          <p class="small muted" style="line-height:1.5;">En cualquier momento pod\xE9s frenar al Computer Use Agent desde el bot\xF3n rojo del top bar. Cancela pendientes y pasa a Desactivado.</p>
        </button>
        <button class="tutorial-card mini" data-tutorial="personalize" style="text-align:left;cursor:pointer;background:#fff;border:1px solid #E3E6EB;border-radius:14px;padding:20px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);">
          <div style="font-size:32px;">\u{1F3A8}</div>
          <h3 style="margin:8px 0 6px;font-size:16px;">Personalizaci\xF3n</h3>
          <p class="small muted" style="line-height:1.5;">Cambiale el nombre al sistema, eleg\xED el mascot, el tema visual, sound pack y rituales matutinos/nocturnos.</p>
        </button>
      </div>
    </div>
  `,document.getElementById("show-tutorials").addEventListener("click",()=>{document.querySelector(".welcome-hero").style.display="none",document.getElementById("tutorial-picker").hidden=!1,document.getElementById("tutorial-picker").scrollIntoView({behavior:"smooth"})}),document.getElementById("back-from-tutorials")?.addEventListener("click",()=>{document.querySelector(".welcome-hero").style.display="block",document.getElementById("tutorial-picker").hidden=!0,document.getElementById("tutorial-detail").hidden=!0,document.getElementById("tutorial-detail").innerHTML=""}),e.querySelectorAll(".tutorial-card").forEach(t=>{t.addEventListener("click",()=>{const n=t.dataset.tutorial;A(e,n)})}),b(e),document.getElementById("start-onboarding").addEventListener("click",async()=>{const{data:t,error:n}=await m("/api/welcome/start",null,{method:"POST",body:{}});if(n||!t){x("No se pudo iniciar (backend offline). Refresc\xE1 cuando vuelva el servidor.","warn");return}s=t,await y(e,s.currentStage)})},A=(e,t)=>{const r={"computer-use":{icon:"\u{1F916}",title:"Modo Autom\xE1tico \xB7 Computer Use Agent",summary:"FeedIA opera tu Instagram con cursor y teclado virtuales mientras vos mir\xE1s. Sin tocar nada.",steps:[{n:1,title:"Activ\xE1 Computer Use",desc:'Hac\xE9 click en el bot\xF3n "Computer Use" del top bar y eleg\xED el pill \u{1F7E2} Auto.'},{n:2,title:"Dale una orden por voz o texto",desc:'Dec\xED "FeedIA, dise\xF1\xE1 y public\xE1 un carrusel sobre productividad" \u2014 o us\xE1 el chatbot.'},{n:3,title:"Mir\xE1 c\xF3mo opera",desc:'En "Pantalla en vivo" ves el cursor abrir Canva, elegir template, escribir, exportar y subir a Instagram.'},{n:4,title:"Revis\xE1 el replay",desc:'En "Replay Log" queda grabada cada acci\xF3n con screenshot para auditar despu\xE9s.'}],ideal:"Si quer\xE9s que el sistema haga TODO mientras vos segu\xEDs con tu vida.",cta:"Configurar ahora \u2192"},supervised:{icon:"\u{1F441}\uFE0F",title:"Modo Acompa\xF1ado \xB7 Aprob\xE1s cada paso",summary:"FeedIA propone cada acci\xF3n importante y vos aprob\xE1s o rechaz\xE1s antes de ejecutar. Aprend\xE9s mientras te asiste.",steps:[{n:1,title:"Activ\xE1 modo Supervisado",desc:'En el top bar \u2192 "Computer Use" \u2192 pill \u{1F441}\uFE0F Acompa\xF1ar.'},{n:2,title:"Solicit\xE1 lo que necesites",desc:'Ped\xED lo mismo que en Auto, pero ahora antes de cada acci\xF3n importante ves un popup "\xBFAprob\xE1s?".'},{n:3,title:"Revis\xE1 y aprob\xE1",desc:'En el panel "Esperando aprobaci\xF3n" del top bar, le\xE9s qu\xE9 quiere hacer y hac\xE9s clic en \u2713 Aprobar o \u2717 Rechazar.'},{n:4,title:"Aprend\xE9s observando",desc:"Despu\xE9s de unas semanas vas a sentirte c\xF3modo para pasar a Auto sin perder el control."}],ideal:"Si quer\xE9s aprender c\xF3mo opera el sistema o no confi\xE1s 100% todav\xEDa.",cta:"Configurar ahora \u2192"},manual:{icon:"\u270B",title:"Modo Manual \xB7 Vos al volante",summary:"FeedIA es tu asistente experto: sugiere captions, hashtags, hooks, analiza m\xE9tricas. Vos public\xE1s manualmente.",steps:[{n:1,title:"Computer Use apagado",desc:'En el top bar \u2192 "Computer Use" \u2192 pill \u{1F534} Desactivado. El cursor no se mueve solo.'},{n:2,title:"Ped\xED sugerencias",desc:"Us\xE1 Studio (Carrusel/Reel/Story) o Tools (Hooks, Hashtags, Caption) para que FeedIA te genere contenido."},{n:3,title:"Revis\xE1 y ajust\xE1",desc:"Edit\xE1s lo que te pase, le dec\xEDs qu\xE9 cambiar. FeedIA itera con vos."},{n:4,title:"Public\xE1s vos",desc:"Copi\xE1s el contenido a Instagram y public\xE1s en el momento que elijas."}],ideal:"Si prefer\xEDs control total y solo quer\xE9s un asistente de ideas + m\xE9tricas.",cta:"Configurar ahora \u2192"},voice:{icon:"\u{1F399}\uFE0F",title:'Comandos por voz \xB7 "Hola FeedIA"',summary:"Hands-free total. Activ\xE1 el micr\xF3fono y ped\xED lo que necesites como si le hablaras a un asistente humano.",steps:[{n:1,title:"Activ\xE1 el micr\xF3fono",desc:'Toc\xE1 la burbuja roja con el \xEDcono de micr\xF3fono (esquina inferior derecha) o dec\xED "Hola FeedIA" si ten\xE9s wake word activo.'},{n:2,title:"Habl\xE1 natural",desc:'"Dise\xF1\xE1 un carrusel sobre disciplina", "mostrame las m\xE9tricas del mes", "respond\xE9 los DMs pendientes".'},{n:3,title:"Mir\xE1 la respuesta",desc:"FeedIA te habla de vuelta (voz neutra en espa\xF1ol) y ejecuta la acci\xF3n correspondiente. Si pide aprobaci\xF3n, te lo cuenta."},{n:4,title:"Configur\xE1 la voz",desc:"En Settings pod\xE9s cambiar la voz, el tono, activar/desactivar narrador autom\xE1tico y wake word."}],ideal:"Si quer\xE9s operar el sistema mientras hac\xE9s otra cosa o desde el celular.",cta:null},chatbot:{icon:"\u2726",title:"Asistente FeedIA \xB7 chat conversacional",summary:"La burbuja violeta junto al micr\xF3fono. Un chat persistente que conoce tu marca, m\xE9tricas, equipo y automatizaciones.",steps:[{n:1,title:"Abr\xED la burbuja",desc:"Toc\xE1 la burbuja violeta con \u2726 al lado del micr\xF3fono. Se despliega un panel a la derecha."},{n:2,title:"Us\xE1 las sugerencias",desc:"Hay 6 sugerencias r\xE1pidas (mejor hora, carrusel viral, an\xE1lisis, hooks, engagement, 30 d\xEDas) o escrib\xED libre."},{n:3,title:"Recib\xED respuestas con tool chips",desc:'FeedIA puede devolver chips con atajos directos a las vistas relevantes ("\u2192 Ver calendario", "\u{1F0CF} Carrusel").'},{n:4,title:"Limpi\xE1 la conversaci\xF3n",desc:"El \xEDcono \u{1F5D1} del header borra el historial actual. \xDAtil si quer\xE9s cambiar de tema sin contexto previo."}],ideal:"Para consultas r\xE1pidas sin abandonar la vista en la que est\xE1s.",cta:null},studios:{icon:"\u{1F3A8}",title:"Studios \xB7 Carrusel, Reel, Story",summary:"Generadores de contenido con preview real en mockup de tel\xE9fono. Cada uno con integraci\xF3n Canva.",steps:[{n:1,title:"Eleg\xED el formato",desc:"En el men\xFA: Studio Carrusel (slides 4:5), Studio Reel (beats 9:16) o Studio Stories (frames 9:16)."},{n:2,title:"Gener\xE1",desc:'Escrib\xED la idea/tema y dale "\u26A1 Generar". El sistema arma slides/beats/frames con SVG y la voz de tu marca.'},{n:3,title:"Dise\xF1\xE1 en Canva",desc:'Bot\xF3n "\u{1F3A8} Dise\xF1ar en Canva ahora": prioriza Canva API si est\xE1 conectada \u2192 cae a Computer Use \u2192 fallback a abrir canva.com.'},{n:4,title:"Render con autofill",desc:'Si ten\xE9s Canva Connect API, el bot\xF3n "Render Canva (API)" genera el archivo final ya autollenado con tu copy.'}],ideal:"Si quer\xE9s contenido editable r\xE1pido sin partir de cero.",cta:null},taskboard:{icon:"\u{1F4CB}",title:"Task Board \xB7 Kanban del equipo IA",summary:"Mir\xE1 qu\xE9 hace cada agente IA en tiempo real: workload, tareas activas, bloqueadas y standup diario.",steps:[{n:1,title:"Standup de hoy",desc:"Arriba: cu\xE1ntas tareas en progreso, cu\xE1ntas bloqueadas y cr\xEDticas para hoy. Como una daily de equipo."},{n:2,title:"Workload por agente",desc:"Cada agente (Nova, L\xEDa, Gard, Luca, Mira) con tareas activas, horas estimadas y bloqueos."},{n:3,title:"Kanban",desc:"Columnas: Por hacer / En progreso / Bloqueado / Hecho. Mov\xE9s tareas con los botones tiny de cada card."},{n:4,title:"Audit\xE1 decisiones",desc:"Cada tarea queda trazada en Replay Log con screenshots si fue ejecutada por Computer Use."}],ideal:'Para ver "qu\xE9 hace tu equipo" sin abrir consolas t\xE9cnicas.',cta:null},intelligence:{icon:"\u{1F9EC}",title:"Inteligencia \xB7 c\xF3mo aprende el sistema",summary:"Panel t\xE9cnico humanizado: token budget, bandits de Thompson, cach\xE9 sem\xE1ntica y digest del d\xEDa.",steps:[{n:1,title:"Token budget",desc:"Cu\xE1nto gast\xF3 hoy el sistema en LLM calls vs cap diario, breaker (cierra si pasa el l\xEDmite) y desglose por modelo."},{n:2,title:"Bandits de aprendizaje",desc:'Experimentos activos (hooks, hashtags, horarios). Thompson Sampling elige el "arm" con mejor performance.'},{n:3,title:"Cach\xE9 sem\xE1ntica",desc:"Hit rate de prompts reusados (ahorra plata). Top prompts m\xE1s reusados con contador."},{n:4,title:"Digest ejecutivo",desc:"Resumen narrativo del d\xEDa: misiones ok/parciales/fallidas, riesgos detectados y cosas que requieren atenci\xF3n."}],ideal:"Si te interesa entender por qu\xE9 el sistema decide lo que decide.",cta:null},sala:{icon:"\u{1F451}",title:"Sala Ejecutiva \xB7 tu apalancamiento",summary:"No es un panel de stats: es un ritual. Sent\xEDs que comand\xE1s un equipo de \xE9lite que trabaj\xF3 para vos.",steps:[{n:1,title:"Tu tier de estatus",desc:"Bronce / Plata / Oro / Platino / Visionario con barra de progreso al siguiente nivel."},{n:2,title:"Apalancamiento",desc:'Ratio "indicaciones que diste \u2192 acciones ejecutadas para vos". Cu\xE1ntos sueldos NO pag\xE1s, horas humanas ahorradas.'},{n:3,title:"Staff y trofeos",desc:"Tu staff de \xE9lite report\xE1ndote en vivo + vitrina de logros desbloqueados."},{n:4,title:"Credencial compartible",desc:'Texto + SVG/PNG descargables para mostrar a inversores o en redes ("Modo inversores").'}],ideal:"Para el momento de cierre del d\xEDa o de la semana.",cta:null},emergency:{icon:"\u{1F6D1}",title:"Frenar al agente \xB7 bot\xF3n de emergencia",summary:"En cualquier momento pod\xE9s cortar TODO lo que est\xE9 haciendo el Computer Use Agent.",steps:[{n:1,title:"Bot\xF3n rojo del top bar",desc:'Abr\xED el dropdown "Computer Use" del top bar. Abajo de todo hay un bot\xF3n rojo "\u{1F6D1} Frenar al agente".'},{n:2,title:"Qu\xE9 hace",desc:'Rechaza TODAS las pending approvals + fuerza modo "Desactivado". El cursor deja de moverse al instante.'},{n:3,title:"Cu\xE1ndo usarlo",desc:"Si ves que algo se est\xE1 por publicar mal, si el sistema entr\xF3 en loop, o si simplemente quer\xE9s cortar."},{n:4,title:"Reactivar despu\xE9s",desc:"Cuando quieras volver a activarlo, eleg\xED el modo (Activado / Asistente) desde el mismo dropdown."}],ideal:"Como red de seguridad mientras te acostumbr\xE1s al modo Auto.",cta:null},personalize:{icon:"\u{1F3A8}",title:"Personalizaci\xF3n \xB7 hacelo tuyo",summary:"Cambi\xE1 el nombre del sistema, el mascot, el tema visual, sound pack, fuentes y rituales diarios.",steps:[{n:1,title:"Identidad",desc:"C\xF3mo quer\xE9s que se llame el sistema (default: Tal\xEDa) y c\xF3mo quer\xE9s que te llame a vos."},{n:2,title:"Mascot + tema",desc:"Eleg\xED entre 6 mascots (Tal\xEDa, Nova, Luca, L\xEDa, Scout, Pixel) y 6 temas visuales (Sunrise, Ocean, Midnight, Forest, Sunset, Mono)."},{n:3,title:"Voz y sonido",desc:"Personalidad de voz (amistosa, profesional, p\xEDcara, mentora) y sound pack (gentle, energetic, retro, natural, silent)."},{n:4,title:"Rituales",desc:"Activ\xE1 el ritual matutino y nocturno con horarios personalizados. Notas privadas que el sistema tiene presente."}],ideal:"Una vez tengas el sistema funcionando, hacelo sentir tuyo.",cta:null}}[t];if(!r)return;const l=document.getElementById("tutorial-detail");l.hidden=!1,l.innerHTML=`
    <div style="max-width:760px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:56px;line-height:1;margin-bottom:8px;">${a(r.icon)}</div>
        <h2 style="margin:0;">${a(r.title)}</h2>
        <p class="small muted" style="margin-top:8px;">${a(r.summary)}</p>
      </div>
      <div class="card">
        ${r.steps.map(o=>`
          <div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);align-items:flex-start;">
            <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;">${o.n}</div>
            <div style="flex:1;">
              <strong>${a(o.title)}</strong>
              <div class="small muted" style="margin-top:4px;line-height:1.5;">${a(o.desc)}</div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="card accent-border" style="margin-top:14px;">
        <div class="small muted" style="text-transform:uppercase;letter-spacing:1px;font-size:11px;">Cu\xE1ndo elegirlo</div>
        <p style="margin:6px 0 0;">${a(r.ideal)}</p>
      </div>
      <div style="text-align:center;margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="btn ghost" data-back-to-picker>\u2190 Volver</button>
        ${r.cta?`<button class="btn primary" id="continue-to-onboarding-${t}">${a(r.cta)}</button>`:""}
      </div>
    </div>
  `,l.scrollIntoView({behavior:"smooth"}),l.querySelector("[data-back-to-picker]").addEventListener("click",()=>{l.hidden=!0,l.innerHTML=""}),r.cta&&l.querySelector(`#continue-to-onboarding-${t}`).addEventListener("click",async()=>{try{localStorage.setItem("feedia.preferredMode",t)}catch{}await m("/api/cu/mode",null,{method:"PUT",body:{mode:{"computer-use":"auto",supervised:"supervised",manual:"off"}[t],reason:"Welcome tutorial",changedBy:"user"}});const{data:i,error:c}=await m("/api/welcome/start",null,{method:"POST",body:{}});if(c||!i){x("No se pudo iniciar (backend offline)","warn");return}s=i,await y(e,s.currentStage)})},y=async(e,t)=>{e.innerHTML='<div class="loading">Preparando paso...</div>',v("/api/welcome"),d=await u(`/api/welcome/${s.id}/stage/${t}`),s=await u(`/api/welcome/${s.id}`),T(e)},T=e=>{const t=["initial-greeting","system-naming","mascot-selection","first-question","theme-selection","goal-aspiration","sample-action","first-promise","completion"],r=(t.indexOf(s.currentStage)+1)/t.length*100;if(e.innerHTML=`
    <div style="max-width:680px;margin:0 auto;">
      <div class="progress-bar" style="height:6px;background:var(--bg-card-2);border-radius:3px;margin-bottom:30px;overflow:hidden;">
        <div style="height:100%;width:${r}%;background:linear-gradient(90deg,#3FB8C9,#E85A2C);transition:width 0.5s;"></div>
      </div>
      <div style="text-align:center;margin-bottom:30px;">
        <div style="font-size:64px;line-height:1;">${k[s.currentStage]??"\u2728"}</div>
        <h1 style="margin:20px 0 10px;font-size:28px;">${a(d.title)}</h1>
        <p style="font-size:16px;color:var(--text-muted);max-width:560px;margin:0 auto;">${a(d.subtitle)}</p>
      </div>
      <div id="stage-body"></div>
    </div>`,s.currentStage==="completion"){z(e);return}const l=document.getElementById("stage-body");if(s.currentStage==="system-naming")l.innerHTML=`
      <div class="card">
        <label class="form-label">\xBFC\xF3mo quer\xE9s que me llame?</label>
        <input id="system-name" class="input" placeholder="Tal\xEDa, Nova, Lex...">
        <label class="form-label" style="margin-top:14px;">Y vos, \xBFc\xF3mo quer\xE9s que te llame?</label>
        <input id="owner-nickname" class="input" placeholder="Capi, jefa, Lucas...">
        <button class="btn primary" id="next-btn" style="margin-top:18px;width:100%;">Siguiente \u2192</button>
      </div>`,document.getElementById("next-btn").addEventListener("click",async()=>{const o=document.getElementById("system-name").value||"Tal\xEDa",i=document.getElementById("owner-nickname").value;await p({systemName:o,ownerNickname:i})});else if(s.currentStage==="mascot-selection"&&d.mascots){l.innerHTML=`
      <div class="page-grid">
        ${d.mascots.map(i=>`
          <div class="mascot-option" data-id="${a(i.id)}" style="cursor:pointer;text-align:center;padding:20px;border:2px solid var(--border);border-radius:12px;transition:all 0.2s;">
            <div style="font-size:48px;">${a(i.emoji)}</div>
            <h3 style="margin:10px 0 6px;">${a(i.name)}</h3>
            <p class="small muted">${a(i.description)}</p>
            <div class="meta" style="justify-content:center;margin-top:8px;">
              ${i.personality.map(c=>`<span class="tag tiny">${a(c)}</span>`).join("")}
            </div>
          </div>`).join("")}
      </div>
      <button class="btn primary" id="next-btn" style="margin-top:20px;width:100%;" disabled>Elegir uno \u2192</button>`;let o=null;e.querySelectorAll(".mascot-option").forEach(i=>{i.addEventListener("click",()=>{e.querySelectorAll(".mascot-option").forEach(c=>c.style.borderColor="var(--border)"),i.style.borderColor="var(--accent)",o=i.dataset.id,document.getElementById("next-btn").disabled=!1})}),document.getElementById("next-btn").addEventListener("click",async()=>{o&&await p({mascot:o})})}else if(s.currentStage==="first-question"&&d.questions)l.innerHTML=`
      <div class="card">
        ${d.questions.map((o,i)=>`
          <div style="margin-bottom:20px;">
            <label class="form-label">${a(o.question)}</label>
            <input class="input" data-key="${a(o.key)}" placeholder="${a(o.placeholder??"")}">
            ${o.hint?`<div class="small muted" style="margin-top:4px;">${a(o.hint)}</div>`:""}
          </div>`).join("")}
        <button class="btn primary" id="next-btn" style="width:100%;">Siguiente \u2192</button>
      </div>`,document.getElementById("next-btn").addEventListener("click",async()=>{const o={};e.querySelectorAll("input[data-key]").forEach(i=>{o[i.dataset.key]=i.value}),await p({},o)});else if(s.currentStage==="theme-selection"&&d.themes){l.innerHTML=`
      <div class="page-grid">
        ${d.themes.map(i=>`
          <div class="theme-option" data-id="${a(i.id)}" style="cursor:pointer;padding:16px;border:2px solid var(--border);border-radius:12px;">
            <h3 style="margin:0 0 8px;">${a(i.name)}</h3>
            <div style="display:flex;gap:6px;margin:8px 0;">
              ${i.palette.map(c=>`<div style="width:40px;height:40px;border-radius:8px;background:${c};"></div>`).join("")}
            </div>
            <p class="small muted">${a(i.vibe)}</p>
          </div>`).join("")}
      </div>
      <button class="btn primary" id="next-btn" style="margin-top:20px;width:100%;" disabled>Siguiente \u2192</button>`;let o=null;e.querySelectorAll(".theme-option").forEach(i=>{i.addEventListener("click",()=>{e.querySelectorAll(".theme-option").forEach(c=>c.style.borderColor="var(--border)"),i.style.borderColor="var(--accent)",o=i.dataset.id,document.getElementById("next-btn").disabled=!1})}),document.getElementById("next-btn").addEventListener("click",async()=>{await p({theme:o})})}else s.currentStage==="goal-aspiration"&&d.prompts?(l.innerHTML=`
      <div class="card">
        ${d.prompts.map(o=>`
          <div style="margin-bottom:16px;">
            <label class="form-label">${a(o.label)}</label>
            <input class="input" data-key="${a(o.key)}" placeholder="${a(o.placeholder??"")}">
          </div>`).join("")}
        <button class="btn primary" id="next-btn" style="width:100%;">Anotalo \u2192</button>
      </div>`,document.getElementById("next-btn").addEventListener("click",async()=>{const o={};e.querySelectorAll("input[data-key]").forEach(i=>{o[i.dataset.key]=i.value}),await p({},o)})):s.currentStage==="sample-action"?(l.innerHTML=`
      <div class="card">
        <p>${a(d.demoDescription??"Ahora te muestro qu\xE9 puedo hacer...")}</p>
        ${d.demoSteps?`<ol style="margin:10px 0;">${d.demoSteps.map(o=>`<li>${a(o)}</li>`).join("")}</ol>`:""}
        <button class="btn primary" id="next-btn" style="width:100%;margin-top:10px;">Continuar \u2192</button>
      </div>`,document.getElementById("next-btn").addEventListener("click",()=>p({}))):s.currentStage==="first-promise"?(l.innerHTML=`
      <div class="card" style="text-align:center;">
        <p style="font-size:18px;line-height:1.6;">${a(d.promiseText??"Te voy a acompa\xF1ar en esto.")}</p>
        <button class="btn primary" id="next-btn" style="margin-top:20px;">Acepto la promesa</button>
      </div>`,document.getElementById("next-btn").addEventListener("click",()=>p({}))):(l.innerHTML=`
      <div class="card">
        <p>${a(d.body??"")}</p>
        <button class="btn primary" id="next-btn" style="margin-top:14px;">Siguiente \u2192</button>
      </div>`,document.getElementById("next-btn").addEventListener("click",()=>p({})));b(e)},p=async(e,t)=>{const n=["initial-greeting","system-naming","mascot-selection","first-question","theme-selection","goal-aspiration","sample-action","first-promise","completion"],r=n.indexOf(s.currentStage),l=n[r+1]??"completion";v("/api/welcome"),await u(`/api/welcome/${s.id}/advance`,{method:"POST",body:{nextStage:l,choices:e,personalStory:t}}),await y(document.querySelector("#view"),l)},z=async e=>{const t=await u(`/api/welcome/${s.id}/recap`);e.innerHTML=`
    <div style="text-align:center;padding:40px 20px;background:linear-gradient(135deg,#3FB8C9 0%,#7FCC3F 100%);color:white;border-radius:18px;">
      <div style="font-size:80px;line-height:1;">\u{1F389}</div>
      <h1 style="margin:20px 0 10px;font-size:36px;">${a(t.headline)}</h1>
      <p style="font-size:18px;opacity:0.92;">${a(t.summary)}</p>
    </div>
    <div class="card" style="margin-top:30px;">
      <h3>Lo que vamos a hacer juntos</h3>
      <ul>${t.commitments.map(n=>`<li>${a(n)}</li>`).join("")}</ul>
    </div>
    <div class="card" style="margin-top:14px;">
      <h3>Tu primer paso</h3>
      <p>${a(t.firstAction)}</p>
    </div>
    <button class="btn primary large" id="enter-home" style="margin-top:20px;width:100%;font-size:18px;padding:14px;">Entrar a mi nueva casa \u2192</button>
  `,document.getElementById("enter-home").addEventListener("click",()=>{window.location.hash="#home"}),b(e)};typeof window<"u"&&!window.__feediaWelcomeToolsBound&&(window.__feediaWelcomeToolsBound=!0,window.addEventListener("feedia:platform",()=>{const e=document.querySelector("#view");e&&e.querySelector("#welcome-tools")&&b(e)}));export const renderWelcome=async e=>{q(e);const{data:t,error:n}=await m("/api/welcome/active",null);if(!n&&t&&t.currentStage!=="completion"){s=t;const r=e.querySelector(".welcome-hero");r&&(r.insertAdjacentHTML("beforeend",'<div style="margin-top:16px;"><button class="btn" id="resume-onboarding" style="background:rgba(0,0,0,.12);color:inherit;">\u21A9\uFE0F Continuar configuraci\xF3n donde quedaste</button></div>'),e.querySelector("#resume-onboarding")?.addEventListener("click",()=>y(e,t.currentStage)))}};
