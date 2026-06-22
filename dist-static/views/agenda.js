import{apiSafe as m}from"../lib/api.js";import{escape as x,fmt as I}from"../lib/dom.js";import{toast as s}from"../lib/toast.js";import{loadingScreen as S,withBtnSpinner as k}from"../lib/ui.js";const z=e=>new Date(e).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"}),q=e=>new Date(e).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),l=async e=>{const o=e.querySelector("#agenda-content");if(!o)return;o.innerHTML=S();const{data:n,error:d}=await m("/api/agenda",[]),g=Array.isArray(n)?n:Array.isArray(n?.items)?n.items:[],u=!!d||n&&n.demoMode===!0&&!Array.isArray(n),p={instagram:{ico:"\u{1F4F7}",label:"Instagram",color:"#C13584",soft:"rgba(193,53,132,.10)"},tiktok:{ico:"\u{1F3B5}",label:"TikTok",color:"#FE2C55",soft:"rgba(254,44,85,.10)"},general:{ico:"\u{1F4CC}",label:"General",color:"#6366F1",soft:"rgba(99,102,241,.10)"}},v=a=>p[a]||p.general,c=l._flt||"all",E=c==="all"?g:g.filter(a=>(a.platform||"general")===c),h={};for(const a of E){const i=z(a.at);(h[i]||=[]).push(a)}const T=g.length,w={instagram:g.filter(a=>a.platform==="instagram").length,tiktok:g.filter(a=>a.platform==="tiktok").length};o.innerHTML=`
    <style>
      .ag-wrap{--ink:#15181E;--ink2:#475067;--ink3:#667085;--line:#E6E8EE;--soft:#F7F8FB;}
      .ag-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .ag-card h3,.ag-card strong,.ag-card .ag-title{color:var(--ink);}
      .ag-input{width:100%;box-sizing:border-box;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:15px;font-family:inherit;outline:none;}
      .ag-input:focus{border-color:#9da9ff;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      select.ag-input{appearance:none;-webkit-appearance:none;cursor:pointer;}
      .ag-btn{border:0;border-radius:999px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;}
      .ag-btn.primary{background:linear-gradient(135deg,#7C3AED,#6366F1);color:#fff;}
      .ag-btn.ghost{background:var(--soft);color:var(--ink2);border:1px solid var(--line);}
      .ag-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--ink2);}
      .ag-chip.on{background:var(--ink);color:#fff;border-color:var(--ink);}
      .ag-day-head{font-size:13px;font-weight:800;color:var(--ink2);text-transform:capitalize;margin:18px 2px 8px;letter-spacing:.02em;}
      .ag-item{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-left:4px solid var(--pc,#6366F1);border-radius:12px;padding:13px 14px;margin-bottom:8px;}
      .ag-item.done{opacity:.55;}
      .ag-item.done .ag-title{text-decoration:line-through;}
      .ag-time{font-size:13px;font-weight:800;color:var(--ink);min-width:48px;}
      .ag-title{font-size:14px;font-weight:700;line-height:1.3;}
      .ag-notes{font-size:12px;color:var(--ink2);margin-top:3px;line-height:1.4;}
      .ag-meta{font-size:11px;color:var(--ink3);margin-top:5px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .ag-pbadge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}
      .ag-iconbtn{border:1px solid var(--line);background:#fff;color:var(--ink2);border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px;}
      .ag-iconbtn:hover{background:var(--soft);}
      .ag-empty{text-align:center;padding:36px 20px;color:var(--ink3);}
    </style>
    <div class="ag-wrap">
      ${u?'<div class="ag-card" style="border-style:dashed;padding:12px 14px;"><span style="color:#475067;font-size:13px;">\u{1F4E1} Backend offline. Lo que escribas se guardar\xE1 cuando vuelva.</span></div>':""}

      <!-- Plan IA: sincroniza con la cuenta -->
      <div class="ag-card" style="border-top:3px solid #7C3AED;">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">\u{1F9E0}</span><strong style="font-size:16px;">Planificador IA</strong><span class="ag-pbadge" style="background:rgba(124,58,237,.12);color:#7C3AED;">agente</span></div>
        <p style="color:#475067;font-size:13px;margin:6px 0 12px;">FeedIA arma tu calendario de contenido sincronizado con tu cuenta (mejores horarios, mix de formatos, cadencia por red).</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
          <select id="ag-plan-plat" class="ag-input"><option value="instagram">\u{1F4F7} Instagram</option><option value="tiktok">\u{1F3B5} TikTok</option><option value="both">\u{1F310} Ambas</option></select>
          <select id="ag-plan-dias" class="ag-input"><option value="7">7 d\xEDas</option><option value="14">14 d\xEDas</option><option value="30">30 d\xEDas</option></select>
          <input id="ag-plan-nicho" class="ag-input" placeholder="Tu nicho (ej: fitness, IA)">
        </div>
        <button class="ag-btn primary" id="ag-plan-go" style="margin-top:12px;width:100%;">\u2728 Generar plan de contenido</button>
      </div>

      <!-- Lenguaje natural -->
      <div class="ag-card">
        <strong>Decile a FeedIA qu\xE9 hacer</strong>
        <p style="color:#475067;font-size:13px;margin:4px 0 10px;">Escrib\xED natural: tareas, contenidos, recordatorios, automatizaciones.</p>
        <textarea id="ag-ai-input" class="ag-input" rows="2" placeholder='Ej: "Recordame revisar m\xE9tricas los lunes 9am" \xB7 "Grabar reel sobre disciplina ma\xF1ana 11am"'></textarea>
        <button class="ag-btn primary" id="ag-ai-go" style="margin-top:10px;">\u2728 Interpretar y agendar</button>
        <details style="margin-top:10px;">
          <summary style="cursor:pointer;color:#475067;font-size:13px;">\u2795 Agendar manualmente</summary>
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-top:10px;align-items:center;">
            <input class="ag-input" id="ag-title" placeholder="T\xEDtulo\u2026"/>
            <input class="ag-input" id="ag-at" type="datetime-local"/>
            <select class="ag-input" id="ag-plat"><option value="general">\u{1F4CC} General</option><option value="instagram">\u{1F4F7} IG</option><option value="tiktok">\u{1F3B5} TikTok</option></select>
            <button class="ag-btn primary" id="ag-add">Agendar</button>
          </div>
        </details>
      </div>

      <!-- Filtro por plataforma -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        <span class="ag-chip ${c==="all"?"on":""}" data-flt="all">Todo (${T})</span>
        <span class="ag-chip ${c==="instagram"?"on":""}" data-flt="instagram">\u{1F4F7} IG (${w.instagram})</span>
        <span class="ag-chip ${c==="tiktok"?"on":""}" data-flt="tiktok">\u{1F3B5} TikTok (${w.tiktok})</span>
      </div>

      ${Object.keys(h).length===0?`<div class="ag-card ag-empty">Sin nada agendado${c!=="all"?" en este filtro":""}. Gener\xE1 un plan IA arriba o escribile a FeedIA.</div>`:Object.entries(h).map(([a,i])=>`
          <div class="ag-day">
            <div class="ag-day-head">${x(a)}</div>
            ${i.map(t=>{const r=v(t.platform);return`
              <div class="ag-item ${t.done?"done":""}" style="--pc:${r.color};">
                <div class="ag-time">${q(t.at)}</div>
                <div style="flex:1;min-width:0;">
                  <div class="ag-title">${x(t.title)}</div>
                  ${t.notes?`<div class="ag-notes">${x(t.notes)}</div>`:""}
                  <div class="ag-meta">
                    <span class="ag-pbadge" style="background:${r.soft};color:${r.color};">${r.ico} ${r.label}</span>
                    ${t.format?`<span>\xB7 ${x(t.format)}</span>`:""}
                    <span>\xB7 ${t.fromDirective?"\u{1F916} IA":"\u270B manual"}</span>
                    <span>\xB7 ${I.rel(t.at)}</span>
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button class="ag-iconbtn" data-done="${x(t.id)}" title="${t.done?"reabrir":"hecho"}">${t.done?"\u21BA":"\u2713"}</button>
                  <button class="ag-iconbtn" data-del="${x(t.id)}" title="eliminar">\u{1F5D1}</button>
                </div>
              </div>`}).join("")}
          </div>`).join("")}
    </div>`,o.querySelectorAll("[data-flt]").forEach(a=>a.addEventListener("click",()=>{l._flt=a.dataset.flt,l(e)})),e.querySelector("#ag-plan-go")?.addEventListener("click",async a=>{await k(a.currentTarget,"planeando\u2026",async()=>{const i=e.querySelector("#ag-plan-plat").value,t=Number(e.querySelector("#ag-plan-dias").value),r=e.querySelector("#ag-plan-nicho").value.trim(),{data:f,error:y}=await m("/api/agenda/plan",null,{method:"POST",body:{platform:i,dias:t,nicho:r}});if(y){s("Backend offline \u2014 no se pudo planear","warn");return}const A=f?.created??[];if(!A.length){s("Necesit\xE1s un LLM (GROQ_API_KEY) para el plan IA","warn");return}s(`\u2728 Plan listo: ${A.length} contenidos${f.real?" (con tus datos reales)":""}`,"ok"),await l(e)})});const b=e.querySelector("#ag-ai-input"),$=e.querySelector("#ag-ai-go");$?.addEventListener("click",async a=>{const i=b?.value?.trim();if(!i){s("Escrib\xED qu\xE9 quer\xE9s agendar","warn");return}await k(a.currentTarget,"interpretando\u2026",async()=>{const{data:t,error:r}=await m("/api/agenda/interpret",null,{method:"POST",body:{text:i}});if(r){const y=D(i);y?(await m("/api/agenda",null,{method:"POST",body:{title:i.slice(0,80),at:y.toISOString()}}),s("\u{1F4C5} Interpretado localmente. Agendado.","ok"),b.value="",await l(e)):s("Backend offline. No se pudo interpretar.","warn");return}const f=t?.created??[];s(`\u2728 FeedIA agend\xF3 ${f.length} \xEDtem${f.length===1?"":"s"}`,"ok"),b.value="",await l(e)})}),b?.addEventListener("keydown",a=>{a.key==="Enter"&&!a.shiftKey&&(a.preventDefault(),$?.click())}),e.querySelector("#ag-add")?.addEventListener("click",async a=>{const i=e.querySelector("#ag-title").value.trim(),t=e.querySelector("#ag-at").value,r=e.querySelector("#ag-plat")?.value||"general";if(!i||!t){s("Complet\xE1 t\xEDtulo y fecha","warn");return}await k(a.currentTarget,"agendando\u2026",async()=>{const{error:f}=await m("/api/agenda",null,{method:"POST",body:{title:i,at:new Date(t).toISOString(),platform:r}});if(f){s("Backend offline \u2014 guardalo cuando vuelva","warn");return}s("Agendado","ok"),await l(e)})}),o.querySelectorAll("[data-done]").forEach(a=>a.addEventListener("click",async()=>{await m(`/api/agenda/${a.dataset.done}/done`,null,{method:"POST",body:{done:a.textContent.trim()==="\u2713"}}),await l(e)})),o.querySelectorAll("[data-del]").forEach(a=>a.addEventListener("click",async()=>{await m(`/api/agenda/${a.dataset.del}/delete`,null,{method:"POST",body:{}}),s("Eliminado","ok"),await l(e)}))},D=e=>{const o=e.toLowerCase(),n=new Date,d=new Date(n);/pasado\s*mañana/.test(o)?d.setDate(n.getDate()+2):/mañana/.test(o)&&d.setDate(n.getDate()+1);const g={domingo:0,lunes:1,martes:2,mi\u00E9rcoles:3,miercoles:3,jueves:4,viernes:5,s\u00E1bado:6,sabado:6};for(const[p,v]of Object.entries(g))if(new RegExp(`\\b${p}\\b`).test(o)){const c=(v-n.getDay()+7)%7||7;d.setDate(n.getDate()+c);break}const u=o.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|h)?/);if(u){let p=parseInt(u[1],10);const v=u[2]?parseInt(u[2],10):0;/pm/.test(u[3]??"")&&p<12&&(p+=12),d.setHours(p,v,0,0)}else d.setHours(9,0,0,0);return d};export const renderAgenda=async e=>{e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F4D2} Agenda</h1>
        <p class="view-subtitle page-subtitle">Lo que FeedIA va a hacer y lo que agend\xE1s a mano, d\xEDa por d\xEDa.</p>
      </div>
    </header>
    <div id="agenda-content" class="page-body">${S()}</div>`,await l(e)};
