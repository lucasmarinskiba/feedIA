import{initVoiceUI as oe}from"./lib/voiceUI.js";import{initChatbotUI as re}from"./lib/chatbotUI.js";import{toast as N}from"./lib/toast.js";import{initTopbar as ie,refreshTopbarState as ne}from"./lib/topbar.js";import{initGlobalSearch as se}from"./lib/globalSearch.js";import{initPlatformSwitcher as ce}from"./lib/platform.js";import{initShortcuts as de,openShortcuts as le}from"./lib/shortcuts.js";import{initOfflineBanner as pe}from"./lib/offlineBanner.js";import"./lib/sidebarGroups.js";import"./lib/quickPanel.js";import"./lib/uxPolish.js";const G=new Map,ue="2026-05-29-16",c=(e,t)=>{const a=`${e}?v=${ue}`,r=()=>{let i=G.get(a);return i||(i=import(a),G.set(a,i)),i.then(d=>d[t])};return r._path=a,r},$={feed:c("./views/feed.js","renderFeed"),"studio-carousel":c("./views/studioCarousel.js","renderCarouselStudio"),"studio-reel":c("./views/studioReel.js","renderReelStudio"),"studio-stories":c("./views/studioStories.js","renderStoriesStudio"),vision:c("./views/vision.js","renderVision"),predictor:c("./views/predictor.js","renderPredictor"),curator:c("./views/curator.js","renderCurator"),ugc:c("./views/ugc.js","renderUgc"),experiments:c("./views/experiments.js","renderExperiments"),collab:c("./views/collab.js","renderCollab"),inbox:c("./views/inbox.js","renderInbox"),crisis:c("./views/crisis.js","renderCrisis"),scheduler:c("./views/scheduler.js","renderScheduler"),settings:c("./views/settings.js","renderSettings"),tools:c("./views/tools.js","renderTools"),analytics:c("./views/analytics.js","renderAnalytics"),assistant:c("./views/assistant.js","renderAssistant"),calendar:c("./views/calendar.js","renderCalendar"),agents:c("./views/agents.js","renderAgents"),skills:c("./views/skills.js","renderSkills"),"studio-tiktok":c("./views/studioReel.js","renderTikTokStudio"),"studio-tiktok-script":c("./views/studioTikTokScript.js","renderTikTokScript"),"studio-tiktok-photo":c("./views/studioTikTokPhoto.js","renderTikTokPhoto"),audit:c("./views/audit.js","renderAudit"),optimize:c("./views/optimize.js","renderOptimize"),hooks:c("./views/hooks.js","renderHooks"),autopilot:c("./views/autopilot.js","renderAutopilot"),mission:c("./views/mission.js","renderMission"),inteligencia:c("./views/intelligence.js","renderIntelligence"),pantalla:c("./views/computeruse.js","renderComputerUse"),glassbox:c("./views/glassbox.js","renderGlassBox"),imperio:c("./views/imperio.js","renderImperio"),forge:c("./views/forge.js","renderForge"),freeCuDemo:c("./views/freeCuDemo.js","renderFreeCuDemo"),cuToolbox:c("./views/cuToolbox.js","renderCuToolbox"),equipo:c("./views/equipo.js","renderEquipo"),pizarra:c("./views/pizarra.js","renderPizarra"),agenda:c("./views/agenda.js","renderAgenda"),approvals:c("./views/workspace.js","renderApprovals"),bitacora:c("./views/workspace.js","renderBitacora"),alertas:c("./views/workspace.js","renderAlertas"),kanban:c("./views/workspace.js","renderKanban"),moodboard:c("./views/workspace.js","renderMoodboard"),reportes:c("./views/workspace.js","renderReportes"),simulador:c("./views/workspace.js","renderSimulador"),cliente:c("./views/workspace.js","renderCliente"),welcome:c("./views/welcome.js","renderWelcome"),home:c("./views/home.js","renderHome"),brujula:c("./views/brujula.js","renderBrujula"),handsfree:c("./views/handsfree.js","renderHandsFree"),brandkit:c("./views/brandkit.js","renderBrandKit"),achievements:c("./views/achievements.js","renderAchievements"),memorabilia:c("./views/memorabilia.js","renderMemorabilia"),personalization:c("./views/personalization.js","renderPersonalization"),rituals:c("./views/rituals.js","renderRituals"),community:c("./views/communityHub.js","renderCommunityHub"),taskboard:c("./views/taskboard.js","renderTaskboard"),"canva-runner":c("./views/canvaRunner.js","renderCanvaRunner"),replay:c("./views/replayLog.js","renderReplayLog"),"scores-history":c("./views/scoresHistory.js","renderScoresHistory"),"studio-manager":c("./views/studioManager.js","renderStudioManager"),admin:c("./views/admin.js","renderAdmin")},U={feed:"Feed \xB7 Inicio \xB7 Dashboard",brujula:"Br\xFAjula \xB7 Estratega del d\xEDa \xB7 Movimiento del d\xEDa \xB7 Plan","studio-carousel":"Carrusel \xB7 Crear carrusel \xB7 Slides","studio-reel":"Reel \xB7 Video \xB7 Crear reel","studio-stories":"Stories \xB7 Historia \xB7 Crear historia",vision:"Vision IA \xB7 Analizar imagen \xB7 IA visual",predictor:"Predictor \xB7 Predecir engagement \xB7 Score",curator:"Backlog \xB7 Curador \xB7 Contenido curado",ugc:"UGC \xB7 Contenido de usuarios \xB7 Repost",experiments:"Experimentos \xB7 A/B test \xB7 Tests",collab:"Collabs \xB7 Colaboraciones \xB7 Prospectos",inbox:"Inbox \xB7 Mensajes \xB7 DMs \xB7 Comentarios",crisis:"Crisis \xB7 Reputaci\xF3n \xB7 Alertas",scheduler:"Scheduler \xB7 Programar \xB7 Automatizar",settings:"Ajustes \xB7 Configuraci\xF3n \xB7 Cuentas \xB7 API keys",tools:"Herramientas IA \xB7 Caption \xB7 Hashtags \xB7 Hooks \xB7 Repurpose",analytics:"Analytics \xB7 M\xE9tricas \xB7 Estad\xEDsticas \xB7 Engagement \xB7 Seguidores",assistant:"Asistente FeedIA \xB7 Chat IA \xB7 Estrategia \xB7 Consultar",calendar:"Calendario \xB7 Planificar \xB7 Programar contenido \xB7 Semana",agents:"Agentes IA \xB7 Especialistas \xB7 Algoritmo \xB7 Meta Ads \xB7 Viral \xB7 Humor",skills:"Skills \xB7 Habilidades \xB7 Generador carrusel \xB7 Reel \xB7 Story \xB7 Cat\xE1logo de skills \xB7 Canva","studio-tiktok":"TikTok Video \xB7 Studio TikTok \xB7 Video vertical \xB7 FYP \xB7 9:16 \xB7 hook 0-2s \xB7 completion","studio-tiktok-script":"Guion TikTok \xB7 Script video \xB7 Lenguaje no verbal \xB7 Retenci\xF3n \xB7 Beat a beat","studio-tiktok-photo":"Foto TikTok \xB7 Photo Mode \xB7 Carrusel tiktok \xB7 9:16 \xB7 swipe \xB7 hook foto 1",audit:"Audit semanal \xB7 KPIs \xB7 Score del sistema \xB7 Prioridades \xB7 Chief of Staff",optimize:"Auto-optimizaci\xF3n \xB7 Loop de aprendizaje \xB7 Patrones de \xE9xito \xB7 Recomendaciones \xB7 Ajustes",hooks:"Hook Library \xB7 Ganchos \xB7 Scorer \xB7 Patrones virales \xB7 Generador",autopilot:"Autopilot \xB7 Pin Slate \xB7 Originality \xB7 Templates \xB7 Convo Router \xB7 Retention \xB7 Outreach",mission:"Mission Control \xB7 Lanzar goals \xB7 Trazas \xB7 Knowledge Base \xB7 Bus \xB7 Multi-agente",inteligencia:"Inteligencia \xB7 Presupuesto tokens \xB7 Bandits \xB7 Cach\xE9 sem\xE1ntica \xB7 Digest \xB7 Aprendizaje",pantalla:"Pantalla en vivo \xB7 Computer Use \xB7 Ver al sistema operar \xB7 Cursor \xB7 Mirar en vivo \xB7 Visual AI Agent",glassbox:"GlassBox \xB7 Caja de Cristal \xB7 Supervisar acciones \xB7 Aprobar \xB7 Rechazar \xB7 Pausar agente",imperio:"Sala Ejecutiva \xB7 Tu imperio \xB7 Apalancamiento \xB7 Equipo reemplazado \xB7 Estatus \xB7 Logros \xB7 Credencial",equipo:"Tu equipo en vivo \xB7 Nova L\xEDa Luca Gard \xB7 Actividad humanizada \xB7 Staff trabajando",pizarra:"Pizarra \xB7 Pizarra virtual \xB7 Dibujar \xB7 Notas \xB7 Mapa conceptual \xB7 Indicaciones a la IA",agenda:"Agenda \xB7 Cronograma \xB7 Qu\xE9 va a hacer FeedIA \xB7 Indicaciones a la IA",approvals:"Aprobaciones \xB7 Bandeja \xB7 Pendientes \xB7 Aprobar rechazar \xB7 Checkpoints",bitacora:"Bit\xE1cora \xB7 Diario de la IA \xB7 Decisiones \xB7 Por qu\xE9 \xB7 Trazas legibles",alertas:"Alertas \xB7 Centro de alertas \xB7 Crisis \xB7 Compliance \xB7 Oportunidades",kanban:"Kanban \xB7 Tablero de contenido \xB7 Pipeline \xB7 Idea Producci\xF3n Publicado",moodboard:"Moodboard \xB7 Brand Board \xB7 Identidad \xB7 Paleta \xB7 Tipograf\xEDas \xB7 Voz",reportes:"Reportes \xB7 Reporte ejecutivo \xB7 PDF \xB7 Resumen del sistema",simulador:"Simulador \xB7 Qu\xE9 pasar\xEDa si \xB7 Proyecci\xF3n de directiva",cliente:"Modo Cliente \xB7 Vista ejecutiva \xB7 Solo lectura \xB7 Para el due\xF1o de la marca",welcome:"Bienvenida \xB7 Onboarding \xB7 Empezar ac\xE1 \xB7 Unboxing \xB7 Setup inicial",home:"Home \xB7 Inicio personalizado \xB7 Tu casa \xB7 Dashboard \xB7 Saludo del d\xEDa",achievements:"Logros \xB7 Trofeos \xB7 Galer\xEDa \xB7 Achievements \xB7 Desbloqueos \xB7 Coleccionables",memorabilia:"Memorabilia \xB7 Memorias \xB7 Recuerdos \xB7 Throwback \xB7 Yearbook \xB7 Highlight reel",personalization:"Personalizaci\xF3n \xB7 Tema \xB7 Mascot \xB7 Voz \xB7 Identidad \xB7 Apariencia \xB7 Setup",rituals:"Rituales \xB7 Ma\xF1ana \xB7 Noche \xB7 Lunes kickoff \xB7 Cierre Viernes \xB7 Daily ritual",community:"Community Hub \xB7 Inbox \xB7 Leads \xB7 FAQ \xB7 Fans \xB7 UGC \xB7 Menciones \xB7 Soporte",taskboard:"Task Board \xB7 Kanban del equipo \xB7 Tareas \xB7 Workload \xB7 Daily standup","canva-runner":"Canva \u2192 Instagram \xB7 Pipeline visual \xB7 Cursor dise\xF1ando \xB7 Auto-publish",replay:"Replay \xB7 Sesiones grabadas \xB7 Computer Use \xB7 Paso a paso \xB7 Auditor\xEDa visual","scores-history":"\u{1F4CA} Historial de Scores \xB7 Innovaci\xF3n \xB7 Influencer \xB7 Coherencia \xB7 Tendencias","studio-manager":"Studio Manager \xB7 CU Brain \xB7 Master Brain \xB7 Queue \xB7 A/B Tests \xB7 DMs \xB7 Hashtags \xB7 Trending \xB7 Competidores",admin:"Admin \xB7 Monitoreo \xB7 M\xE9tricas \xB7 Logs \xB7 Observabilidad \xB7 Sistema"},M=document.querySelector("#view"),V=document.querySelector("#fab-menu"),K=document.querySelector("#fab-btn"),me=document.querySelector("#fab-backdrop"),J=document.querySelector("#mobile-search-overlay"),fe=document.querySelector("#mobile-search-btn"),xe=document.querySelector("#close-search-btn"),P=document.querySelector("#mobile-search-input"),L=document.querySelector("#global-search");let Q="";const S=async e=>{$[e]||(e="feed"),Q=e,document.querySelectorAll("[data-route]").forEach(t=>{if(t.classList.contains("nav-item")||t.classList.contains("bottom-nav-item")){const r=t.dataset.route===e;t.classList.toggle("active",r),r?t.setAttribute("aria-current","page"):t.removeAttribute("aria-current")}}),O(),Y(),L&&(L.value=""),A(),M.innerHTML=`<div class="loading-screen" aria-busy="true" aria-label="cargando" style="display:block;padding:4px 2px;">
      <div class="skeleton" style="height:34px;width:42%;border-radius:10px;"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
        <div class="card" style="padding:18px;"><div class="skeleton" style="height:20px;width:60%"></div><div class="skeleton" style="height:13px;margin-top:10px"></div><div class="skeleton" style="height:13px;width:80%;margin-top:8px"></div></div>
        <div class="card" style="padding:18px;"><div class="skeleton" style="height:20px;width:55%"></div><div class="skeleton" style="height:13px;margin-top:10px"></div><div class="skeleton" style="height:13px;width:70%;margin-top:8px"></div></div>
        <div class="card" style="padding:18px;"><div class="skeleton" style="height:20px;width:65%"></div><div class="skeleton" style="height:13px;margin-top:10px"></div><div class="skeleton" style="height:13px;width:75%;margin-top:8px"></div></div>
      </div></div>`;try{document.querySelector("#main-content")?.scrollTo({top:0}),window.scrollTo(0,0)}catch{}window.dispatchEvent(new CustomEvent("fx:net",{detail:{delta:1}}));try{await(await $[e]())(M);try{M.querySelectorAll("img:not([loading])").forEach(a=>{a.loading="lazy",a.decoding="async"})}catch{}history.replaceState(null,"",`#${e}`)}catch(t){const a=t&&t.message?String(t.message):"Error desconocido",r=/Unexpected token '<'|<!doctype|<!DOCTYPE/i.test(a)||/Failed to fetch dynamically imported module/i.test(a)||/MIME type \("text\/html"\)/i.test(a),i=sessionStorage.getItem(`__retry_${e}`)==="1";if(r&&!i){sessionStorage.setItem(`__retry_${e}`,"1");const b=$[e];if(b&&b._path)try{const h=`?bust=${Date.now()}`,y=await import(b._path+h),E=Object.keys(y).find(k=>typeof y[k]=="function");if(E){M.innerHTML="",await y[E](M),sessionStorage.removeItem(`__retry_${e}`);return}}catch(h){console.error("[navigate] retry failed:",h)}}sessionStorage.removeItem(`__retry_${e}`);const d=r,p=d?"Servidor desactualizado":"Error al cargar la vista",q=d?`La vista "${e}" no est\xE1 disponible en el servidor (te devolvi\xF3 HTML donde esperaba JavaScript).<br>Probable causa: el c\xF3digo del backend cambi\xF3 pero el servidor no se reinici\xF3.`:a,v=d?`<div class="small muted" style="margin-top:14px;">Soluci\xF3n: <code style="background:var(--bg-card-2,#1a1f25);padding:2px 6px;border-radius:4px;">npm run build &amp;&amp; npm start</code></div>
         <div style="display:flex;gap:8px;justify-content:center;margin-top:18px;">
           <button class="btn" onclick="location.reload(true)">\u21BB Recargar (hard)</button>
           <button class="btn ghost" onclick="location.hash='feed'">\u2190 Volver al Feed</button>
         </div>`:`<button class="btn ghost" style="margin-top:20px;" onclick="navigate('${e}')">\u21BB Reintentar</button>`;M.innerHTML=`
      <div style="padding:40px 24px;text-align:center;max-width:560px;margin:0 auto;">
        <div style="font-size:40px;margin-bottom:16px;">${d?"\u{1F504}":"\u26A0\uFE0F"}</div>
        <div class="small" style="color:var(--crit);font-weight:700;margin-bottom:8px;">${p}</div>
        <div class="small muted" style="line-height:1.5;">${q}</div>
        ${v}
      </div>`,d||N(a,"crit"),console.error("[navigate]",e,t)}finally{window.dispatchEvent(new CustomEvent("fx:net",{detail:{delta:-1}}))}},be=()=>{V?.classList.add("open"),K?.classList.add("open"),document.body.style.overflow="hidden"},O=()=>{V?.classList.remove("open"),K?.classList.remove("open"),document.body.style.overflow=""},ge=()=>V?.classList.contains("open")?O():be();K?.addEventListener("click",e=>{e.stopPropagation(),ge()}),me?.addEventListener("click",O),document.addEventListener("keydown",e=>{e.key==="Escape"&&(O(),Y())});const ve=()=>{J?.classList.add("open"),setTimeout(()=>P?.focus(),80)},Y=()=>{J?.classList.remove("open"),P&&(P.value=""),A()};fe?.addEventListener("click",ve),xe?.addEventListener("click",Y);let T=null;const X=(e,t)=>{if(A(),!e.trim())return;const a=e.toLowerCase(),r=Object.entries(U).filter(([,i])=>i.toLowerCase().includes(a)).slice(0,6);r.length&&(T=document.createElement("div"),T.className="search-dropdown",T.innerHTML=r.map(([i,d])=>{const p=d.split(" \xB7 ")[0];return`<button class="search-dropdown-item" data-route="${i}">${p}</button>`}).join(""),T.querySelectorAll("[data-route]").forEach(i=>{i.addEventListener("click",()=>{S(i.dataset.route),t===L&&(t.value=""),A()})}),t.parentElement.style.position="relative",t.parentElement.appendChild(T))},A=()=>{T?.remove(),T=null};L?.addEventListener("input",e=>X(e.target.value,L)),L?.addEventListener("keydown",e=>{if(e.key==="Enter"){const t=T?.querySelector("[data-route]");t&&(S(t.dataset.route),L.value="",A())}e.key==="Escape"&&(L.value="",A())}),L?.addEventListener("blur",()=>setTimeout(A,200)),P?.addEventListener("input",e=>X(e.target.value,P)),P?.addEventListener("keydown",e=>{if(e.key==="Enter"){const t=T?.querySelector("[data-route]");t&&S(t.dataset.route)}});const he=()=>{document.querySelectorAll("[data-route]").forEach(e=>{e.id!=="fab-btn"&&(e.dataset.wired||(e.dataset.wired="1",e.addEventListener("click",()=>{const t=e.dataset.route;t&&S(t)})))})};he(),window.addEventListener("popstate",()=>{const e=location.hash.replace("#","")||"feed";$[e]&&e!==Q&&S(e)});const W=async()=>{try{const e=await fetch("/api/crisis/status");if(e.ok){const t=await e.json(),a=document.querySelector("#nb-crisis");a&&(a.style.display=t?.publicacionesPausadas?"":"none")}}catch{}try{const e=await fetch("/api/approvals");if(e.ok){const t=await e.json(),a=document.querySelector("#nb-approvals");a&&(a.textContent=t.count>0?String(t.count):"",a.style.display=t.count>0?"":"none")}}catch{}try{const e=await fetch("/api/alerts");if(e.ok){const t=await e.json(),a=document.querySelector("#nb-alertas");a&&(a.style.display=t.critical>0?"":"none")}}catch{}},ye=async()=>{try{const e=await fetch("/api/brand");if(!e.ok)return;const t=await e.json(),a=document.querySelector("#brand-footer");if(!a)return;const r=(t.name||"?").charAt(0).toUpperCase(),i=a.querySelector(".brand-avatar");i&&(i.setAttribute("data-letter",r),i.textContent=r);const d=a.querySelector(".brand-name");d&&(d.textContent=t.name??"Mi marca");const p=a.querySelector(".brand-niche");p&&(p.textContent=t.niche??"")}catch{}};ye(),W();const ke=setInterval(W,6e4);window._badgeInterval=ke;try{oe({navigate:S})}catch(e){console.error("[voiceUI] init fall\xF3:",e)}try{re({navigate:S})}catch(e){console.error("[chatbotUI] init fall\xF3:",e)}try{const{initAccountMenu:e}=await import("./lib/accountMenu.js");await e()}catch(e){console.error("[accountMenu] init fall\xF3:",e)}window.__feediaRouteSearch=e=>{const t=Object.entries(U).find(([a,r])=>r.toLowerCase().includes(e));t&&S(t[0])},ie(),window.__refreshTopbar=ne;try{se({routeLabels:U})}catch(e){console.error("[globalSearch] init fall\xF3:",e)}try{ce()}catch(e){console.error("[platform] init fall\xF3:",e)}try{de(),window.__openShortcuts=le}catch(e){console.error("[shortcuts] init fall\xF3:",e)}try{pe()}catch(e){console.error("[offlineBanner] init fall\xF3:",e)}window.__feediaToast=N,(async()=>{try{const e=await fetch("/api/auth/me");if(!e.ok)return;const{user:t}=await e.json();if(!t||t.role!=="owner"&&t.plan!=="owner")return;const a=document.querySelector("#sidebar nav, aside nav, .sidebar nav, nav.sidebar");if(!a||a.querySelector('[data-route="admin"]'))return;const r=document.createElement("button");r.className="nav-item",r.dataset.route="admin",r.title="Admin \xB7 Solo owner",r.innerHTML='<span class="nav-icon">\u2699\uFE0F</span><span class="nav-label">Admin</span>',r.addEventListener("click",()=>S("admin")),a.appendChild(r)}catch{}})();const Z=location.hash.replace("#","")||"feed";S($[Z]?Z:"feed");const we=async()=>{let e;try{const p=await fetch("/api/experience/welcome");if(!p.ok)return;e=await p.json()}catch{return}if(!document.querySelector("#fx-style")){const p=document.createElement("style");p.id="fx-style",p.textContent=`
      .fx-ribbon{display:flex;align-items:center;gap:10px;padding:8px 16px;font-size:13px;
        background:linear-gradient(90deg,rgba(225,48,108,.14),rgba(168,85,247,.10),transparent);
        border-bottom:1px solid var(--border);color:var(--text-primary,var(--fg));}
      .fx-pulse{width:9px;height:9px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 0 rgba(74,222,128,.7);animation:fxp 2s infinite;}
      @keyframes fxp{70%{box-shadow:0 0 0 9px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
      .fx-tier{margin-left:auto;font-weight:800;letter-spacing:.08em;font-size:11px;padding:3px 10px;border-radius:999px;background:linear-gradient(90deg,#e1306c,#a855f7);color:#fff;cursor:pointer;}
      .fx-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
        background:rgba(6,6,8,.86);backdrop-filter:blur(6px);animation:fxf .4s ease;}
      @keyframes fxf{from{opacity:0}to{opacity:1}}
      .fx-card{max-width:520px;width:92%;background:var(--bg-card,#15151b);
        border:1px solid var(--border);border-radius:20px;padding:34px 30px;text-align:center;
        color:var(--text-primary,var(--fg));box-shadow:var(--shadow-lg,0 18px 50px rgba(0,0,0,.5));}
      .fx-card h2{font-size:24px;margin:0 0 6px;color:var(--text-primary,var(--fg));}
      .fx-card .fx-sub{color:var(--text-secondary,var(--fg));opacity:.85;font-size:15px;line-height:1.6;margin:8px 0 18px;}
      .fx-stats{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:14px 0 20px;}
      .fx-chip{background:var(--bg-card-2,var(--bg-elevated,#15151b));border:1px solid var(--border);border-radius:12px;padding:10px 14px;min-width:84px;color:var(--text-primary,var(--fg));}
      .fx-chip b{display:block;font-size:22px;background:linear-gradient(90deg,#e1306c,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
      .fx-chip span{font-size:11px;opacity:.65;color:var(--text-tertiary,var(--fg));}
      .fx-next{background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.35);border-radius:12px;padding:12px 14px;font-size:14px;margin-bottom:18px;color:var(--text-primary,var(--fg));}
      .fx-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}

      /* Light mode overrides \u2014 sin negros pesados */
      html[data-theme="light"] .fx-card{background:#ffffff;border-color:rgba(17,18,22,.10);box-shadow:0 18px 50px rgba(20,22,30,.18);}
      html[data-theme="light"] .fx-card h2{color:#16171c;background:linear-gradient(90deg,#16171c,#a83a7e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
      html[data-theme="light"] .fx-card .fx-sub{color:#474a54;}
      html[data-theme="light"] .fx-chip{background:#f5f6f8;border-color:rgba(17,18,22,.10);color:#16171c;}
      html[data-theme="light"] .fx-chip span{color:#7c7f8a;}
      html[data-theme="light"] .fx-next{background:rgba(168,85,247,.08);border-color:rgba(168,85,247,.25);color:#16171c;}
      html[data-theme="light"] .fx-ov{background:rgba(235,237,240,.65);}
      html[data-theme="light"] .fx-ribbon{background:linear-gradient(90deg,rgba(225,48,108,.07),rgba(168,85,247,.05),transparent);color:#16171c;}`,document.head.appendChild(p)}const t=document.querySelector("#main-content"),a=document.querySelector("#view");if(t&&a&&!document.querySelector("#fx-ribbon")){const p=document.createElement("div");p.id="fx-ribbon",p.className="fx-ribbon",p.innerHTML=`<span class="fx-pulse"></span>
      <span><b>${(e.saludo||"Hola").replace(/</g,"")}</b> \xB7 tu equipo de ${e.equipoActivo||0} est\xE1 operando para vos</span>
      <span class="fx-tier" id="fx-tier" title="Ir a tu Sala Ejecutiva">${(e.tier||"Bronce").toUpperCase()}</span>`,t.insertBefore(p,a),p.querySelector("#fx-tier")?.addEventListener("click",()=>S("imperio"))}if(sessionStorage.getItem("fx_welcomed")==="1")return;sessionStorage.setItem("fx_welcomed","1");const r=e.desdeUltimaVisita||{},i=document.createElement("div");i.className="fx-ov",i.innerHTML=`
    <div class="fx-card">
      <div style="font-size:34px;margin-bottom:6px;">${e.primeraVez?"\u{1F451}":"\u2615"}</div>
      <h2>${e.primeraVez?`Bienvenido, ${f(e.marca||"")}`:`${f(e.saludo||"Hola")}`}</h2>
      <div class="fx-sub">${f(r.titular||"Tu equipo est\xE1 listo.")}</div>
      ${e.primeraVez?"":`<div class="fx-stats">
        <div class="fx-chip"><b>${r.misiones??0}</b><span>misiones</span></div>
        <div class="fx-chip"><b>${r.carruseles??0}</b><span>carruseles</span></div>
        <div class="fx-chip"><b>${r.decisiones??0}</b><span>decisiones</span></div>
        <div class="fx-chip"><b>${r.horas??0}h</b><span>sin vos</span></div>
      </div>`}
      <div class="fx-next">\u{1F4A1} ${f(e.proximaIndicacion||"")}</div>
      <div class="fx-btns">
        <button class="btn primary" id="fx-go">${e.primeraVez?"Empezar a comandar":"Ver mi imperio"}</button>
        <button class="btn ghost" id="fx-close">Entrar al panel</button>
      </div>
    </div>`,document.body.appendChild(i);const d=()=>i.remove();i.querySelector("#fx-close")?.addEventListener("click",d),i.querySelector("#fx-go")?.addEventListener("click",()=>{d(),S("imperio")}),i.addEventListener("click",p=>{p.target===i&&d()})};function f(e){return String(e).replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}we(),window.addEventListener("feedia:quotaExceeded",e=>{const t=e.detail||{};if(document.getElementById("feedia-quota-modal"))return;const a=document.createElement("div");if(a.id="feedia-quota-modal",a.innerHTML=`
    <div class="qm-backdrop"></div>
    <div class="qm-card">
      <div class="qm-emoji">\u{1F512}</div>
      <h2 class="qm-title">Llegaste al l\xEDmite</h2>
      <p class="qm-reason">${(t.reason||"Quota excedida en tu plan actual.").replace(/</g,"&lt;")}</p>
      ${t.used!==void 0&&t.limit!==void 0?`
        <div class="qm-bar"><div class="qm-bar-fill" style="width:100%;"></div></div>
        <div class="qm-stats"><span>Usado ${t.used}</span><span>L\xEDmite ${t.limit===-1?"\u221E":t.limit}</span></div>
      `:""}
      <p class="qm-plan">Plan actual: <strong>${(t.currentPlan||"free").toUpperCase()}</strong></p>
      <div class="qm-actions">
        <button class="qm-btn ghost" id="qm-close">Cerrar</button>
        <a class="qm-btn primary" href="${t.upgradeUrl||"/pricing.html"}">Ver planes \u2192</a>
      </div>
    </div>`,document.body.appendChild(a),!document.getElementById("qm-style")){const i=document.createElement("style");i.id="qm-style",i.textContent=`
      #feedia-quota-modal{position:fixed;inset:0;z-index:10080;display:flex;align-items:center;justify-content:center;}
      .qm-backdrop{position:absolute;inset:0;background:rgba(6,6,8,.7);backdrop-filter:blur(4px);animation:qmf .25s ease;}
      @keyframes qmf{from{opacity:0}to{opacity:1}}
      .qm-card{position:relative;background:var(--bg-card,#15161B);border:1px solid var(--border);border-radius:18px;padding:30px 28px;max-width:420px;width:92%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.5);animation:qmu .3s cubic-bezier(.16,.84,.44,1);color:var(--text-primary,#fff);}
      @keyframes qmu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      .qm-emoji{font-size:40px;margin-bottom:8px;}
      .qm-title{font-size:22px;letter-spacing:-0.02em;margin:0 0 6px;}
      .qm-reason{font-size:14px;color:var(--text-secondary,#aab);line-height:1.5;margin-bottom:16px;}
      .qm-bar{height:6px;background:rgba(239,68,68,.15);border-radius:99px;overflow:hidden;margin:12px 0 6px;}
      .qm-bar-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);}
      .qm-stats{display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary,#aab);margin-bottom:12px;}
      .qm-plan{font-size:13px;margin-bottom:18px;color:var(--text-secondary,#aab);}
      .qm-plan strong{color:var(--text-primary,#fff);}
      .qm-actions{display:flex;gap:8px;}
      .qm-btn{flex:1;padding:11px 16px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;border:0;font-family:inherit;}
      .qm-btn.ghost{background:rgba(255,255,255,.06);color:var(--text-primary,#fff);}
      .qm-btn.primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .qm-btn.primary:hover{filter:brightness(1.08);}`,document.head.appendChild(i)}const r=()=>a.remove();a.querySelector("#qm-close").addEventListener("click",r),a.querySelector(".qm-backdrop").addEventListener("click",r)});const Se=()=>{if(!document.querySelector("#cmdk-style")){const n=document.createElement("style");n.id="cmdk-style",n.textContent=`
      .cmdk-ov{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-start;justify-content:center;
        padding-top:14vh;background:rgba(6,6,8,.7);backdrop-filter:blur(8px);animation:cmf .18s ease;}
      @keyframes cmf{from{opacity:0}to{opacity:1}}
      .cmdk{width:min(620px,92%);background:#15151b;border:1px solid #2c2c38;border-radius:16px;
        box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden;animation:cms .2s cubic-bezier(.2,.8,.2,1);}
      @keyframes cms{from{transform:translateY(-12px) scale(.98);opacity:.6}to{transform:none;opacity:1}}
      .cmdk input{width:100%;border:0;background:transparent;color:#fff;font-size:18px;padding:20px 22px;outline:none;}
      .cmdk-hint{padding:0 22px 12px;color:#7a7a88;font-size:12px;display:flex;gap:8px;align-items:center;}
      .cmdk-kbd{border:1px solid #3a3a46;border-radius:6px;padding:1px 6px;font-size:11px;color:#aab;}
      .cmdk-res{border-top:1px solid #24242e;padding:16px 22px;display:none;}
      .cmdk-res.on{display:block;}
      .cmdk-act{display:flex;align-items:center;gap:12px;background:linear-gradient(90deg,rgba(225,48,108,.16),rgba(168,85,247,.10));
        border:1px solid rgba(168,85,247,.4);border-radius:12px;padding:14px 16px;cursor:pointer;transition:filter .15s;}
      .cmdk-act:hover{filter:brightness(1.15);}
      .cmdk-act b{font-size:15px;}
      .cmdk-reply{color:#aab;font-size:13px;margin:0 22px 8px;line-height:1.5;}
      .cmdk-go{margin-left:auto;font-size:12px;color:#fff;background:linear-gradient(90deg,#e1306c,#a855f7);
        border-radius:999px;padding:5px 12px;font-weight:700;}
      .cmdk-list{border-top:1px solid #24242e;max-height:46vh;overflow:auto;padding:8px;}
      .cmdk-sec{font-size:11px;letter-spacing:.1em;color:#6a6a78;padding:10px 14px 4px;text-transform:uppercase;}
      .cmdk-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;cursor:pointer;}
      .cmdk-row .cr-ic{font-size:16px;width:20px;text-align:center;}
      .cmdk-row .cr-tx{flex:1;min-width:0;font-size:14px;color:#e8e8ef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .cmdk-row .cr-tag{font-size:10px;color:#8a8a98;border:1px solid #33333f;border-radius:6px;padding:1px 7px;}
      .cmdk-row.sel,.cmdk-row:hover{background:linear-gradient(90deg,rgba(225,48,108,.16),rgba(168,85,247,.10));}
      .cmdk-row.sel .cr-tag{border-color:rgba(168,85,247,.5);color:#cbb6f5;}
      /* \u2500\u2500 loading skeleton \u2500\u2500 */
      .cmdk-loading{padding:18px 22px;display:flex;align-items:center;gap:12px;border-top:1px solid #24242e;}
      .cmdk-spin{width:18px;height:18px;border:2px solid #33333f;border-top-color:#a855f7;border-radius:50%;animation:cmspin .6s linear infinite;flex-shrink:0;}
      @keyframes cmspin{to{transform:rotate(360deg)}}
      .cmdk-spin-txt{font-size:13px;color:#7a7a88;}
      /* \u2500\u2500 rich AI response \u2500\u2500 */
      .cmdk-ai{border-top:1px solid #24242e;padding:16px 22px 4px;}
      .cmdk-ai-reply{font-size:14px;color:#d0d0e0;line-height:1.55;margin-bottom:10px;}
      .cmdk-ai-steps{margin:0 0 10px;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;}
      .cmdk-ai-steps li{font-size:12px;color:#6a6a78;padding-left:16px;position:relative;}
      .cmdk-ai-steps li::before{content:'\u2192';position:absolute;left:0;color:#5a5a68;}
      .cmdk-ai-actions{display:flex;flex-wrap:wrap;gap:8px;padding-bottom:14px;}
      .cmdk-action-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid;transition:filter .12s,transform .12s;}
      .cmdk-action-chip:hover{filter:brightness(1.12);transform:translateY(-1px);}
      .cmdk-action-chip.primary{background:linear-gradient(90deg,rgba(225,48,108,.18),rgba(168,85,247,.18));border-color:rgba(168,85,247,.5);color:#cbb6f5;}
      .cmdk-action-chip.secondary{background:transparent;border-color:#33333f;color:#9a9aa8;}
      .cmdk-action-chip.confirm{background:rgba(234,179,8,.1);border-color:rgba(234,179,8,.4);color:#fcd34d;}
      /* \u2500\u2500 cmdk-hint-global: LEFT of the FAB column, same z-layer \u2500\u2500 */
      .cmdk-hint-global{
        position:fixed !important; right:90px !important; bottom:22px !important; z-index:370 !important;
        font-size:13px; font-weight:600; color:var(--text-primary,#e8e8ef);
        background:var(--bg-elevated,#1a1a2e); border:1.5px solid var(--border-focus,#6366f1);
        border-radius:999px; padding:10px 18px; cursor:pointer; white-space:nowrap;
        box-shadow:0 4px 16px rgba(0,0,0,.3);
        transition:background .15s,color .15s,transform .15s,box-shadow .15s;
      }
      .cmdk-hint-global:hover{
        background:#a855f7 !important; color:#fff !important; border-color:transparent !important;
        transform:translateY(-2px); box-shadow:0 8px 24px rgba(168,85,247,.45);
      }
      @media(max-width:640px){
        .cmdk-hint-global{ right:80px !important; bottom:calc(var(--bottom-nav-h,60px) + 16px) !important; }
      }`,document.head.appendChild(n)}let e=null,t=null,a=[],r=0;const i="fx_cmd_recent",d=()=>{try{return JSON.parse(localStorage.getItem(i)||"[]")}catch{return[]}},p=n=>{if(!n||n.length<3)return;const l=d().filter(u=>u!==n);l.unshift(n);try{localStorage.setItem(i,JSON.stringify(l.slice(0,6)))}catch{}},q={feed:["sub\xED un carrusel sobre lo \xFAltimo del nicho","hac\xE9 crecer la cuenta esta semana"],imperio:["mostrame el reporte de mi imperio","gener\xE1 el one-pager para inversores"],equipo:["\xBFqu\xE9 est\xE1 haciendo mi equipo ahora?","respond\xE9 los DMs y comentarios"],inteligencia:["\xBFc\xF3mo va el presupuesto de tokens?","mostrame el aprendizaje del sistema"],pantalla:["mir\xE1 c\xF3mo arm\xE1s un carrusel y lo sub\xEDs","observ\xE1 al sistema responder mensajes"],mission:["lanz\xE1 una misi\xF3n de crecimiento","planific\xE1 el contenido de la semana"]},v=["sub\xED un carrusel sobre X","respond\xE9 los DMs","sub\xED 1 carrusel por d\xEDa siempre","mostrame mi imperio"],b=["/api/carousel/run","/api/swarm/mission","/api/computer/watch","/api/directives"],h=async n=>{const l=window.fxBeacon&&window.fxBeacon.start(`Tu equipo est\xE1 en eso\u2026 ${n.action.label}`);try{const u=n.action,C=await fetch(u.endpoint,{method:u.method||"POST",headers:{"content-type":"application/json"},body:JSON.stringify(u.body||{})});if(!C.ok)throw new Error("HTTP "+C.status);window.fxBeacon?window.fxBeacon.done(l,"\u2705 "+n.reply):N("\u2705 "+n.reply,"ok")}catch(u){window.fxBeacon?window.fxBeacon.fail(l,"\u26A0\uFE0F No se pudo: "+u.message):N("Error: "+u.message,"crit")}},y=(n,l)=>{const u=n.action,C=u.body?Object.entries(u.body).filter(([,o])=>o!==void 0&&o!==""&&typeof o!="object").map(([o,x])=>`<div class="cfm-kv"><span>${f(o)}</span><b>${f(String(x))}</b></div>`).join(""):"",w=document.createElement("div");w.className="cmdk-ov",w.style.zIndex="10003",w.innerHTML=`
      <div class="cmdk" style="padding:22px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:4px;">Confirm\xE1s esta acci\xF3n?</div>
        <div style="color:#9aa;font-size:13px;margin-bottom:14px;line-height:1.5;">${f(n.reply)}</div>
        <div style="background:#0f0f15;border:1px solid #2c2c38;border-radius:10px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${f(u.label)}</div>
          <div class="cfm-kv"><span>destino</span><b>${f(u.method||"POST")} ${f(u.endpoint)}</b></div>
          ${C}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="cfm-no" class="btn ghost">Cancelar</button>
          <button id="cfm-yes" class="btn primary">S\xED, ejecutalo</button>
        </div>
      </div>
      <style>.cfm-kv{display:flex;justify-content:space-between;gap:14px;font-size:12px;color:#8a8a98;padding:2px 0;}
        .cfm-kv b{color:#dfe;font-weight:600;text-align:right;word-break:break-word;}</style>`,document.body.appendChild(w);const s=()=>w.remove();w.addEventListener("click",o=>{o.target===w&&s()}),w.querySelector("#cfm-no").addEventListener("click",s),w.querySelector("#cfm-yes").addEventListener("click",()=>{s(),l()}),w.querySelector("#cfm-yes").focus(),document.addEventListener("keydown",function o(x){x.key==="Escape"&&(s(),document.removeEventListener("keydown",o))})},E=async(n,l)=>{if(l&&p(l),n.action.kind==="navigate"){g(),S(n.action.route);return}if(g(),b.includes(n.action.endpoint)){y(n,()=>h(n));return}await h(n)},k=(n="FeedIA est\xE1 pensando\u2026")=>{const l=e.querySelector("#cmdk-main");l.innerHTML=`<div class="cmdk-loading"><div class="cmdk-spin"></div><span class="cmdk-spin-txt">${f(n)}</span></div>`},j=(n,l)=>{e._route=n,e._typed=l;const u=n.actions?.length?n.actions:n.action?[n.action]:[],C=n.steps?.length?`<ul class="cmdk-ai-steps">${n.steps.map(o=>`<li>${f(o)}</li>`).join("")}</ul>`:"",w=u.map((o,x)=>`<button class="cmdk-action-chip ${o.kind==="confirm"?"confirm":x===0?"primary":"secondary"}" data-ai="${x}">${o.icon||"\u26A1"} ${f(o.label)}</button>`).join(""),s=e.querySelector("#cmdk-main");s.innerHTML=`
      <div class="cmdk-ai">
        <div class="cmdk-ai-reply">${f(n.reply||"")}</div>
        ${C}
        <div class="cmdk-ai-actions">${w}</div>
      </div>`,s.querySelectorAll(".cmdk-action-chip").forEach(o=>{o.addEventListener("click",()=>I(u[Number(o.dataset.ai)],l))})},I=async(n,l)=>{if(l&&p(l),!n)return;if(n.kind==="navigate"){g(),S(n.route);return}g();const u={reply:n.label,action:n};n.kind==="confirm"||b.includes(n.endpoint)?y(u,()=>h(u)):await h(u)},R=async n=>{k("FeedIA est\xE1 pensando\u2026");try{const l=await fetch("/api/command/route",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:n})});if(!l.ok){_();return}const u=await l.json();j(u,n)}catch{_()}},_=()=>{e._route=null;const n=location.hash.replace("#","")||"feed",l=d();a=[],l.forEach(u=>a.push({ic:"\u{1F558}",tx:u,tag:"reciente",kind:"suggest",text:u})),(q[n]||v).forEach(u=>a.push({ic:"\u2728",tx:u,tag:"sugerido",kind:"suggest",text:u})),r=0,z()},z=()=>{const n=e.querySelector("#cmdk-main");n.innerHTML=`<div class="cmdk-list" id="cmdk-list">${a.map((l,u)=>`
      <div class="cmdk-row ${u===r?"sel":""}" data-i="${u}">
        <span class="cr-ic">${l.ic}</span>
        <span class="cr-tx">${f(l.tx)}</span>
        <span class="cr-tag">${f(l.tag)}</span>
      </div>`).join("")}</div>`,n.querySelectorAll(".cmdk-row").forEach(l=>{l.addEventListener("click",()=>H(Number(l.dataset.i)))})},H=n=>{const l=a[n];if(!l)return;const u=e.querySelector("#cmdk-in");u.value=l.text,clearTimeout(t),R(l.text)},B=()=>{if(e)return;e=document.createElement("div"),e.className="cmdk-ov",e.innerHTML=`
      <div class="cmdk" role="dialog" aria-label="Command palette">
        <input id="cmdk-in" placeholder="\xBFQu\xE9 quer\xE9s hacer? Ej: sub\xED un carrusel sobre productividad\u2026" autocomplete="off" />
        <div class="cmdk-hint"><span class="cmdk-kbd">\u2191\u2193</span> elegir \xB7 <span class="cmdk-kbd">Enter</span> ejecutar \xB7 <span class="cmdk-kbd">Esc</span> cerrar</div>
        <div id="cmdk-main"></div>
      </div>`,document.body.appendChild(e);const n=e.querySelector("#cmdk-in");n.focus(),_(),e.addEventListener("click",l=>{l.target===e&&g()}),n.addEventListener("input",()=>{clearTimeout(t);const l=n.value.trim();if(l.length<3){_();return}t=setTimeout(()=>R(l),260)}),n.addEventListener("keydown",l=>{if(l.key==="Escape"){g();return}l.key==="ArrowDown"?(l.preventDefault(),r=Math.min(r+1,a.length-1),z()):l.key==="ArrowUp"?(l.preventDefault(),r=Math.max(r-1,0),z()):l.key==="Enter"&&(l.preventDefault(),e._route?.actions?.length?I(e._route.actions[0],e._typed):a.length&&H(r))})};function g(){e&&(e.remove(),e=null,a=[],r=0)}if(document.addEventListener("keydown",n=>{(n.ctrlKey||n.metaKey)&&n.key.toLowerCase()==="k"&&(n.preventDefault(),e?g():B())}),window.openCommandPalette=B,!document.querySelector("#cmdk-fab")){const n=document.createElement("div");n.id="cmdk-fab",n.className="cmdk-hint-global",n.innerHTML="\u2318K \xB7 Decile a FeedIA",n.addEventListener("click",()=>B()),document.body.appendChild(n)}};Se();const qe=()=>{const e=[["\u2318K / Ctrl+K","Abrir el command palette \u2014 decile algo a tu equipo"],["\u2191 \u2193","Navegar sugerencias / acciones"],["Enter","Ejecutar la acci\xF3n seleccionada"],["?","Mostrar / ocultar esta ayuda"],["Esc","Cerrar cualquier panel"]];let t=null;const a=()=>{t&&(t.remove(),t=null)},r=()=>{if(t){a();return}t=document.createElement("div"),t.className="cmdk-ov",t.innerHTML=`
      <div class="cmdk" style="padding:24px;">
        <div style="font-size:17px;font-weight:800;margin-bottom:4px;">\u2328\uFE0F Atajos de teclado</div>
        <div style="color:#8a8a98;font-size:13px;margin-bottom:16px;">Manej\xE1 todo sin tocar el mouse.</div>
        ${e.map(([d,p])=>`
          <div style="display:flex;gap:14px;align-items:center;padding:9px 0;border-bottom:1px solid #20202a;">
            <span class="cmdk-kbd" style="min-width:96px;text-align:center;">${d}</span>
            <span style="font-size:14px;color:#e8e8ef;">${p}</span>
          </div>`).join("")}
        <div style="text-align:center;margin-top:16px;display:flex;gap:10px;justify-content:center;align-items:center;">
          <button id="fxt-replay" class="cmdk-kbd" style="cursor:pointer;background:none;">\u25B6 Repetir tour guiado</button>
          <span style="color:#8a8a98;font-size:12px;"><span class="cmdk-kbd">Esc</span> cerrar</span>
        </div>
      </div>`,document.body.appendChild(t);const i=t.querySelector("#fxt-replay");i&&i.addEventListener("click",()=>{a(),window.startTour&&window.startTour()}),t.addEventListener("click",d=>{d.target===t&&a()})};document.addEventListener("keydown",i=>{const d=i.target&&i.target.tagName||"",p=d==="INPUT"||d==="TEXTAREA"||i.target&&i.target.isContentEditable;if(i.key==="Escape"){a();return}i.key==="?"&&!p&&!i.ctrlKey&&!i.metaKey&&(i.preventDefault(),r())})};qe();const Ee=()=>{if(!document.querySelector("#fxb-style")){const r=document.createElement("style");r.id="fxb-style",r.textContent=`
      #fxb-stack{position:fixed;right:16px;bottom:64px;z-index:9998;display:flex;flex-direction:column;gap:10px;max-width:360px;}
      .fxb{display:flex;gap:10px;align-items:flex-start;background:#15151b;border:1px solid #2c2c38;
        border-radius:12px;padding:12px 14px;box-shadow:0 12px 34px rgba(0,0,0,.5);animation:fxbin .25s ease;}
      @keyframes fxbin{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
      .fxb.ok{border-color:rgba(74,222,128,.45)}.fxb.err{border-color:rgba(248,113,113,.5)}
      .fxb .fxb-sp{width:15px;height:15px;border-radius:50%;border:2px solid #44445a;border-top-color:#e1306c;animation:fxbsp .8s linear infinite;flex-shrink:0;margin-top:2px;}
      @keyframes fxbsp{to{transform:rotate(360deg)}}
      .fxb .fxb-tx{font-size:13px;color:#e8e8ef;line-height:1.45;}
      .fxb .fxb-ic{font-size:15px;}`,document.head.appendChild(r)}const e=document.createElement("div");e.id="fxb-stack",document.body.appendChild(e);let t=0;const a=(r,i,d)=>{let p=document.getElementById(r);return p||(p=document.createElement("div"),p.id=r,e.appendChild(p)),p.className="fxb "+i,p.innerHTML=d,p};window.fxBeacon={start(r){const i="fxb-"+ ++t;return a(i,"",`<span class="fxb-sp"></span><span class="fxb-tx">${f(r)}</span>`),i},done(r,i){if(!r)return;const d=a(r,"ok",`<span class="fxb-ic">\u2705</span><span class="fxb-tx">${f(i)}</span>`);setTimeout(()=>d&&d.remove(),4200)},fail(r,i){if(!r)return;const d=a(r,"err",`<span class="fxb-ic">\u26A0\uFE0F</span><span class="fxb-tx">${f(i)}</span>`);setTimeout(()=>d&&d.remove(),6500)}}};Ee();const je=()=>{const e=[{sel:"#cmdk-fab",t:"Ac\xE1 empieza todo",d:"Toc\xE1 esto (o apret\xE1 \u2318K) y pedile cualquier cosa a tu equipo en una sola frase. Pocas indicaciones, todo pasa."},{sel:'[data-route="imperio"]',t:"Tu Sala Ejecutiva",d:"El resultado de tu imperio: apalancamiento, equipo que reemplaz\xE1s y tu estatus."},{sel:'[data-route="equipo"]',t:"Tu equipo en vivo",d:"Mir\xE1 a Nova, L\xEDa, Luca y el resto trabajando para vos en tiempo real."},{sel:'[data-route="pantalla"]',t:"Pantalla en vivo",d:"Cruzate de brazos y mir\xE1 al sistema operar solo: cursor, apps, todo."}];if(!document.querySelector("#fxt-style")){const v=document.createElement("style");v.id="fxt-style",v.textContent=`
      #fxt-ov{position:fixed;inset:0;z-index:99999;}
      #fxt-hole{position:absolute;border-radius:12px;box-shadow:0 0 0 9999px rgba(6,6,10,.82);
        transition:all .18s cubic-bezier(.2,.8,.2,1);pointer-events:none;border:2px solid var(--accent,#e1306c);
        z-index:99999;}
      #fxt-pop{position:absolute;max-width:300px;background:#15151b;border:1px solid #2c2c38;border-radius:14px;
        padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.6);animation:fxtin .14s ease;z-index:100000;}
      @keyframes fxtin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      /* Mientras el tour est\xE1 activo, esconder los FABs que tapan los spotlights */
      body.tour-active .voice-fab,
      body.tour-active .chatbot-fab,
      body.tour-active .bottom-nav-fab,
      body.tour-active .fab-menu{opacity:.12 !important;pointer-events:none !important;filter:grayscale(.6);}
      #fxt-pop h4{margin:0 0 6px;font-size:15px;}
      #fxt-pop p{margin:0 0 14px;font-size:13px;color:#aab;line-height:1.5;}
      #fxt-pop .row{display:flex;justify-content:space-between;align-items:center;}
      #fxt-skip{background:none;border:0;color:#7a7a88;font-size:12px;cursor:pointer;}
      #fxt-next{background:linear-gradient(90deg,#e1306c,#a855f7);color:#fff;border:0;border-radius:999px;
        padding:7px 16px;font-weight:700;font-size:13px;cursor:pointer;}
      #fxt-dots{display:flex;gap:5px;}#fxt-dots i{width:6px;height:6px;border-radius:50%;background:#3a3a46;}
      #fxt-dots i.on{background:var(--accent,#e1306c);}`,document.head.appendChild(v)}let t=0,a=null;const r=v=>{if(v)try{localStorage.setItem("fx_tour_v1","1")}catch{}a&&(a.remove(),a=null),document.body.classList.remove("tour-active")},i=v=>{const b=v&&v.getBoundingClientRect();return b&&b.width>4&&b.height>4},d=()=>{for(;t<e.length;){const k=document.querySelector(e[t].sel);if(k&&i(k))break;t++}if(t>=e.length){r(!0);return}const b=document.querySelector(e[t].sel).getBoundingClientRect(),h=a.querySelector("#fxt-hole"),y=6;h.style.left=b.left-y+"px",h.style.top=b.top-y+"px",h.style.width=b.width+y*2+"px",h.style.height=b.height+y*2+"px";const E=a.querySelector("#fxt-pop");E.querySelector("h4").textContent=e[t].t,E.querySelector("p").textContent=e[t].d,a.querySelector("#fxt-next").textContent=t===e.length-1?"Listo":"Siguiente",a.querySelector("#fxt-dots").innerHTML=e.map((k,j)=>`<i class="${j===t?"on":""}"></i>`).join(""),E.style.visibility="hidden",requestAnimationFrame(()=>{const k=E.getBoundingClientRect();let j=b.bottom+14;j+k.height>window.innerHeight-12&&(j=Math.max(12,b.top-k.height-14));let I=Math.min(Math.max(12,b.left),window.innerWidth-k.width-12);E.style.top=j+"px",E.style.left=I+"px",E.style.visibility="visible"})},p=()=>{t=0,a&&a.remove(),a=document.createElement("div"),a.id="fxt-ov",a.innerHTML=`
      <div id="fxt-hole"></div>
      <div id="fxt-pop">
        <h4></h4><p></p>
        <div class="row">
          <button id="fxt-skip">Saltar</button>
          <div id="fxt-dots"></div>
          <button id="fxt-next">Siguiente</button>
        </div>
      </div>`,document.body.appendChild(a),document.body.classList.add("tour-active"),a.querySelector("#fxt-skip").addEventListener("click",()=>r(!0)),a.querySelector("#fxt-next").addEventListener("click",()=>{t++,d()}),window.addEventListener("resize",d,{passive:!0}),d()};window.startTour=p;let q=!1;try{q=localStorage.getItem("fx_tour_v1")==="1"}catch{}q||setTimeout(p,450)};je();const Ce=()=>{if(!document.querySelector("#fxn-style")){const s=document.createElement("style");s.id="fxn-style",s.textContent=`
      #fxn-bell{position:fixed;top:14px;right:16px;z-index:9997;width:38px;height:38px;border-radius:50%;
        background:#15151b;border:1px solid var(--border,#2c2c38);color:#cfcfe0;display:flex;align-items:center;
        justify-content:center;cursor:pointer;transition:border-color .15s,transform .15s;}
      #fxn-bell:hover{border-color:var(--border-focus,#555);transform:translateY(-1px);}
      #fxn-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:99px;
        background:linear-gradient(90deg,#e1306c,#a855f7);color:#fff;font-size:11px;font-weight:800;
        display:none;align-items:center;justify-content:center;padding:0 5px;}
      #fxn-badge.on{display:flex;}
      #fxn-ov{position:fixed;inset:0;z-index:10002;background:rgba(6,6,10,.5);backdrop-filter:blur(3px);
        display:flex;justify-content:flex-end;animation:cmf .18s ease;}
      #fxn-panel{width:min(420px,94%);height:100%;background:#121218;border-left:1px solid #2c2c38;
        display:flex;flex-direction:column;animation:fxnsl .26s cubic-bezier(.2,.8,.2,1);}
      @keyframes fxnsl{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
      #fxn-panel header{padding:18px 20px;border-bottom:1px solid #24242e;display:flex;align-items:center;gap:10px;}
      #fxn-panel header b{font-size:16px;flex:1;}
      #fxn-mark{background:none;border:0;color:#8a8a98;font-size:12px;cursor:pointer;}
      #fxn-mark:hover{color:#fff;}
      #fxn-list{flex:1;overflow:auto;padding:8px;}
      .fxn-it{display:flex;gap:11px;align-items:flex-start;padding:11px 13px;border-radius:10px;
        cursor:pointer;position:relative;transition:background .12s;}
      .fxn-it:hover{background:rgba(255,255,255,.04);}
      .fxn-it.un{background:linear-gradient(90deg,rgba(225,48,108,.12),transparent);}
      .fxn-it.un::before{content:'';position:absolute;left:4px;top:50%;transform:translateY(-50%);
        width:6px;height:6px;border-radius:50%;background:#e1306c;box-shadow:0 0 6px rgba(225,48,108,.6);}
      .fxn-it .fxn-e{font-size:17px;line-height:1.2;flex-shrink:0;}
      .fxn-it .fxn-q{font-size:13px;color:#e8e8ef;}
      .fxn-it .fxn-a{font-size:12px;color:#9aa;line-height:1.45;}
      .fxn-it .fxn-w{font-size:11px;color:#6a6a78;white-space:nowrap;margin-left:auto;}
      .fxn-cat{display:inline-block;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;
        font-weight:800;padding:1px 6px;border-radius:4px;margin-right:6px;}
      .fxn-cat-approval{background:rgba(245,158,11,.18);color:#fbbf24;}
      .fxn-cat-report{background:rgba(99,102,241,.18);color:#a5b4fc;}
      .fxn-cat-analysis{background:rgba(168,85,247,.18);color:#d8b4fe;}
      .fxn-cat-goal{background:rgba(34,211,238,.18);color:#67e8f9;}
      .fxn-cat-achievement{background:rgba(234,179,8,.18);color:#facc15;}
      .fxn-cat-team{background:rgba(16,185,129,.18);color:#6ee7b7;}
      .fxn-filters{display:flex;gap:4px;padding:8px;border-bottom:1px solid #24242e;overflow-x:auto;}
      .fxn-filter{padding:5px 10px;border-radius:6px;border:0;background:transparent;color:#9aa;
        font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;}
      .fxn-filter.active{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .fxn-platsw{display:flex;gap:6px;padding:10px;border-bottom:1px solid #24242e;background:rgba(255,255,255,.02);}
      .fxn-plat{flex:1;padding:8px 6px;border-radius:9px;border:1px solid #2c2c38;background:transparent;color:#cfcfe0;font-size:12px;font-weight:700;cursor:pointer;transition:all .12s;}
      .fxn-plat:hover{border-color:#444;}
      .fxn-plat.active{background:#fff;color:#15181E;border-color:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4);}`,document.head.appendChild(s)}const e="fx_notif_read",t="fx_notif_read_ids",a=()=>{try{return Date.parse(localStorage.getItem(e)||"")||0}catch{return 0}},r=s=>{try{localStorage.setItem(e,new Date(s).toISOString())}catch{}},i=()=>{try{return new Set(JSON.parse(localStorage.getItem(t)||"[]"))}catch{return new Set}},d=s=>{try{const o=i();o.add(s),localStorage.setItem(t,JSON.stringify([...o].slice(-500)))}catch{}},p=(s,o)=>i().has(s)?!0:(Date.parse(o)||0)<=a();let q="all",v="all";const b=s=>{const o=(s||"").toLowerCase();return/\btiktok\b|\bfyp\b|9:16|tt\b/.test(o)?"tiktok":/\binstagram\b|\big\b|\breel\b|\bcarrusel\b|\bstor(y|ies|ia)\b|explore/.test(o)?"instagram":"sala"},h=document.createElement("div");h.id="fxn-bell",h.title="Notificaciones de tu equipo",h.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span id="fxn-badge"></span>',document.body.appendChild(h);let y=[];const E=s=>{const o=Date.now()-Date.parse(s);if(isNaN(o))return"";const x=Math.round(o/6e4);if(x<1)return"reci\xE9n";if(x<60)return`hace ${x} min`;const m=Math.round(x/60);return m<24?`hace ${m} h`:`hace ${Math.round(m/24)} d`},k=()=>{const s=y.filter(m=>!p(m.id,m.cuando)).length,o=document.querySelector("#fxn-badge"),x=document.querySelector("#topbar-notif-badge");o&&(o.textContent=s>9?"9+":String(s),o.classList.toggle("on",s>0)),x&&(x.textContent=s>9?"9+":String(s),x.hidden=s===0)},j=(s=[])=>s.map(o=>({id:"act-"+(o.id??o.cuando+(o.quien||"")),category:"team",emoji:o.emoji||"\u{1F916}",quien:o.quien||"",rol:o.rol||"",accion:o.accion||"",cuando:o.cuando,platform:o.platform||b(`${o.quien} ${o.rol} ${o.accion}`)})),I=(s=[])=>s.map(o=>({id:"app-"+o.id,category:"approval",emoji:"\u270B",quien:"Aprobaci\xF3n pendiente",rol:o.workflow||"Computer Use",accion:(o.action||"").slice(0,120),cuando:o.createdAt||new Date().toISOString(),route:"pantalla",platform:o.platform||b(`${o.workflow} ${o.action}`)})),R=(s=[])=>s.map((o,x)=>({id:"ach-"+(o.id??o.titulo+x),category:"achievement",emoji:"\u{1F3C6}",quien:"Logro desbloqueado",rol:"sistema",accion:`${o.titulo} \u2014 ${o.detalle??""}`.trim(),cuando:o.cuando||new Date().toISOString(),route:"imperio",platform:o.platform||b(`${o.titulo} ${o.detalle}`)})),_=(s=[])=>s.map((o,x)=>({id:"rep-"+(o.id??x),category:"report",emoji:"\u{1F4C4}",quien:"Reporte nuevo",rol:o.tipo||"semanal",accion:o.resumen||o.titulo||"Reporte generado",cuando:o.cuando||new Date().toISOString(),route:"reportes",platform:o.platform||b(`${o.tipo} ${o.resumen} ${o.titulo}`)})),z=async()=>{try{const[s,o,x]=await Promise.allSettled([fetch("/api/experience/activity"),fetch("/api/cu/mode/pending-approvals"),fetch("/api/experience/brief")]),m=s.status==="fulfilled"&&s.value.ok?await s.value.json():[],D=o.status==="fulfilled"&&o.value.ok?await o.value.json():[],ee=(x.status==="fulfilled"&&x.value.ok?await x.value.json():null)?.hitos??[];y=[...I(D),...R(ee),...j(m)].sort((te,ae)=>(Date.parse(ae.cuando)||0)-(Date.parse(te.cuando)||0)).slice(0,80),k()}catch{}},H={approval:"aprobaci\xF3n",report:"reporte",analysis:"an\xE1lisis",goal:"meta",achievement:"logro",team:"equipo"},B=[{id:"all",label:"Todo"},{id:"approval",label:"\u270B Aprobaciones"},{id:"achievement",label:"\u{1F3C6} Logros"},{id:"report",label:"\u{1F4C4} Reportes"},{id:"team",label:"\u{1F465} Equipo"}];let g=null;const n=()=>{g&&(g.remove(),g=null)},l=()=>{const s=g?.querySelector("#fxn-list");if(!s)return;const o=v==="all"?y:y.filter(m=>m.platform===v),x=q==="all"?o:o.filter(m=>m.category===q);s.innerHTML=x.length?x.map(m=>`<div class="fxn-it ${!p(m.id,m.cuando)?"un":""}" data-id="${f(m.id)}" ${m.route?`data-route="${f(m.route)}"`:""}>
        <span class="fxn-e">${m.emoji||"\u{1F916}"}</span>
        <div style="flex:1;min-width:0;">
          <div class="fxn-q">
            <span class="fxn-cat fxn-cat-${f(m.category)}">${f(H[m.category]||m.category)}</span>
            <b>${f(m.quien||"")}</b>
            ${m.rol?`<span style="color:#8a8a98;">\xB7 ${f(m.rol)}</span>`:""}
          </div>
          <div class="fxn-a">${f(m.accion||"")}</div>
        </div><span class="fxn-w">${E(m.cuando)}</span></div>`).join(""):'<div class="muted small" style="text-align:center;padding:40px 20px;">Sin notificaciones en esta categor\xEDa.</div>',s.querySelectorAll(".fxn-it").forEach(m=>{m.addEventListener("click",()=>{const D=m.dataset.id;d(D),m.classList.remove("un"),k();const F=m.dataset.route;F&&(n(),window.location.hash=`#${F}`)})})},u=async()=>{if(g){n();return}await z(),g=document.createElement("div"),g.id="fxn-ov",g.innerHTML=`
      <div id="fxn-panel" role="dialog" aria-label="Notificaciones">
        <header>
          <b>\u{1F514} Notificaciones de tu equipo</b>
          <button id="fxn-mark" title="Marcar todo como le\xEDdo">\u2713 Marcar todo</button>
        </header>
        <div class="fxn-platsw" id="fxn-platsw">
          ${[["all","Todo"],["instagram","\u{1F4F7} Instagram"],["tiktok","\u{1F3B5} TikTok"],["sala","\u{1F451} Sala"]].map(([s,o])=>`<button class="fxn-plat ${s===v?"active":""}" data-plat="${s}">${o}</button>`).join("")}
        </div>
        <div class="fxn-filters" id="fxn-filters">
          ${B.map(s=>`<button class="fxn-filter ${s.id===q?"active":""}" data-filter="${s.id}">${s.label}</button>`).join("")}
        </div>
        <div id="fxn-list"></div>
      </div>`,document.body.appendChild(g),l(),g.addEventListener("click",s=>{s.target===g&&n()}),g.querySelector("#fxn-mark").addEventListener("click",()=>{y.forEach(s=>d(s.id)),r(Date.now()),k(),l()}),g.querySelectorAll(".fxn-filter").forEach(s=>{s.addEventListener("click",()=>{q=s.dataset.filter,g.querySelectorAll(".fxn-filter").forEach(o=>o.classList.toggle("active",o===s)),l()})}),g.querySelectorAll(".fxn-plat").forEach(s=>{s.addEventListener("click",()=>{v=s.dataset.plat,g.querySelectorAll(".fxn-plat").forEach(o=>o.classList.toggle("active",o===s)),l()})})};h.addEventListener("click",u);const C=document.querySelector("#topbar-notif");C&&(h.style.display="none",C.addEventListener("click",s=>{s.preventDefault?.(),s.stopPropagation?.(),u()}));const w=document.querySelector("#mobile-notif-btn");w&&w.addEventListener("click",u),z(),setInterval(()=>{document.hidden||z()},6e4)};Ce();const Le=()=>{const e=document.querySelector("#view");if(e&&!e.hasAttribute("tabindex")&&e.setAttribute("tabindex","-1"),!document.querySelector("#skip-link")){const t=document.createElement("a");t.id="skip-link",t.href="#view",t.textContent="Saltar al contenido",t.addEventListener("click",a=>{a.preventDefault();const r=document.querySelector("#view");r&&(r.focus(),r.scrollIntoView())}),document.body.insertBefore(t,document.body.firstChild)}};Le();const Te=()=>{const e=document.documentElement,t=()=>e.getAttribute("data-theme")==="light"?"light":"dark",a=document.querySelector('meta[name="theme-color"]'),r=()=>{const d=t()==="dark";i&&(i.textContent=d?"\u2600\uFE0F":"\u{1F319}",i.title=d?"Cambiar a modo claro":"Cambiar a modo oscuro",i.setAttribute("aria-label",i.title)),a&&a.setAttribute("content",d?"#000000":"#f5f6f8")};let i=document.querySelector("#fx-theme-toggle");i||(i=document.createElement("button"),i.id="fx-theme-toggle",document.body.appendChild(i)),i.addEventListener("click",()=>{const d=t()==="dark"?"light":"dark";e.setAttribute("data-theme",d);try{localStorage.setItem("fx_theme",d)}catch{}r()}),r()};Te(),document.addEventListener("pointerdown",e=>{const t=e.target&&e.target.closest&&e.target.closest(".btn");if(!t)return;const a=t.getBoundingClientRect();t.style.setProperty("--rx",`${(e.clientX-a.left)/a.width*100}%`),t.style.setProperty("--ry",`${(e.clientY-a.top)/a.height*100}%`)},{passive:!0});const $e=()=>{const e=document.createElement("div");e.id="fx-progress",document.body.appendChild(e);let t=0,a=0,r=null,i=null;const d=()=>{e.style.width=a+"%"},p=()=>{t>0&&a<90&&(a+=(90-a)*.06+.4,d(),r=requestAnimationFrame(p))},q=()=>{clearTimeout(i),e.style.opacity="1",a===0&&(a=8,d()),cancelAnimationFrame(r),r=requestAnimationFrame(p)},v=()=>{cancelAnimationFrame(r),a=100,d(),i=setTimeout(()=>{e.style.opacity="0",setTimeout(()=>{a=0,d()},250)},200)};window.addEventListener("fx:net",b=>{t=Math.max(0,t+(b.detail?.delta||0)),t>0?q():v()})};$e();const ze=()=>{const e=a=>{try{$[a]&&$[a]()}catch{}};document.addEventListener("mouseover",a=>{const r=a.target&&a.target.closest&&a.target.closest("[data-route]");r&&r.dataset.route&&$[r.dataset.route]&&e(r.dataset.route)},{passive:!0}),(window.requestIdleCallback||(a=>setTimeout(a,1200)))(()=>["feed","imperio","equipo","mission","inteligencia"].forEach(e))};ze();const Ae=()=>{let e=null;const t=()=>{e&&(e.remove(),e=null)},a=i=>{if(e||sessionStorage.getItem("fx_ai_banner_off")==="1")return;e=document.createElement("div"),e.id="fx-ai-banner",e.innerHTML=`
      <span class="fx-aib-ic">\u26A0\uFE0F</span>
      <span class="fx-aib-tx">${f(i)}</span>
      <button class="fx-aib-cta" id="fx-aib-go">Ir a Ajustes</button>
      <button class="fx-aib-x" id="fx-aib-x" aria-label="Ocultar">\u2715</button>`;const d=document.querySelector("#main-content"),p=document.querySelector("#fx-ribbon")||document.querySelector("#view");d&&p?d.insertBefore(e,p):document.body.prepend(e),e.querySelector("#fx-aib-go").addEventListener("click",()=>S("settings")),e.querySelector("#fx-aib-x").addEventListener("click",()=>{sessionStorage.setItem("fx_ai_banner_off","1"),t()})},r=async()=>{try{const i=await fetch("/api/system/ai-status").then(d=>d.json());i&&i.aiReady===!1?a(i.message||"IA desactivada: falta API key."):t()}catch{}};r(),setInterval(()=>{document.hidden||r()},6e4)};Ae();
