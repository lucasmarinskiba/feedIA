import{api as z,apiSafe as S}from"../lib/api.js";import{escape as $}from"../lib/dom.js";import{toast as u}from"../lib/toast.js";import{loadingScreen as C,withBtnSpinner as L}from"../lib/ui.js";let b={view:"week",slots:[],jobs:[]},c="week",v=0,y=0;const E={reel:{bg:"rgba(225,48,108,.15)",border:"#e1306c",icon:"\u25B6\uFE0F"},carrusel:{bg:"rgba(91,155,255,.15)",border:"#5b9bff",icon:"\u{1F3A0}"},"post-imagen":{bg:"rgba(251,191,36,.15)",border:"#fbbf24",icon:"\u{1F5BC}\uFE0F"},historia:{bg:"rgba(74,222,128,.15)",border:"#4ade80",icon:"\u25CE"}},j={pendiente:"warn",publicado:"ok",rechazado:"crit",borrador:"info"},A={publicacion:{color:"#7C3AED",soft:"rgba(124,58,237,.12)",icon:"\u{1F4E2}",label:"Publicaci\xF3n"},tarea:{color:"#0EA5E9",soft:"rgba(14,165,233,.12)",icon:"\u2705",label:"Tarea"},evento:{color:"#F59E0B",soft:"rgba(245,158,11,.14)",icon:"\u{1F4CC}",label:"Evento"},recordatorio:{color:"#10B981",soft:"rgba(16,185,129,.12)",icon:"\u23F0",label:"Recordatorio"}},P=e=>A[e.tipo]?e.tipo:"publicacion",T=e=>A[P(e)],B=(e=0)=>{const t=new Date,a=new Date(t);return a.setDate(t.getDate()-(t.getDay()+6)%7+e*7),Array.from({length:7},(o,n)=>{const s=new Date(a);return s.setDate(a.getDate()+n),s})},M=["Lun","Mar","Mi\xE9","Jue","Vie","S\xE1b","Dom"],D=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];let g=0;const q=e=>b.slots.filter(t=>(t.scheduledFor??"").startsWith(e)),R=()=>{const e=B(g),t=new Date().toISOString().slice(0,10);return`
    <div class="calendar-week-header">
      <button class="btn ghost small" id="cal-prev-btn">\u2190 Semana anterior</button>
      <div class="small" style="font-weight:700">
        ${e[0].toLocaleDateString("es-AR",{day:"numeric",month:"short"})} \u2013 ${e[6].toLocaleDateString("es-AR",{day:"numeric",month:"short",year:"numeric"})}
      </div>
      <button class="btn ghost small" id="cal-next-btn">Semana siguiente \u2192</button>
      <button class="btn primary small" id="cal-today-btn">Hoy</button>
    </div>

    <div class="calendar-grid">
      ${e.map((a,o)=>{const n=a.toISOString().slice(0,10),s=n===t,d=q(n);return`
          <div class="calendar-day ${s?"today":""}">
            <div class="calendar-day-header">
              <span class="calendar-day-name">${M[o]}</span>
              <span class="calendar-day-num ${s?"today-num":""}">${a.getDate()}</span>
            </div>
            <div class="calendar-day-slots" data-date="${n}">
              ${d.length?d.map(m=>H(m)).join(""):'<div class="calendar-empty-day">\u2014</div>'}
              <button class="calendar-add-btn" data-date="${n}" title="Agregar publicaci\xF3n">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          </div>`}).join("")}
    </div>

    <!-- Quick stats row -->
    <div class="calendar-stats">
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px">${b.slots.length}</div>
        <div class="tiny muted">programados</div>
      </div>
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px;color:var(--ok)">${b.slots.filter(a=>a.status==="publicado").length}</div>
        <div class="tiny muted">publicados</div>
      </div>
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px;color:var(--warn)">${b.slots.filter(a=>a.status==="pendiente").length}</div>
        <div class="tiny muted">pendientes</div>
      </div>
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px;color:var(--info)">${b.slots.filter(a=>a.status==="borrador").length}</div>
        <div class="tiny muted">borradores</div>
      </div>
    </div>`},H=e=>{const t=T(e),a=(E[e.formato]??{icon:"\u{1F4C4}"}).icon,o=e.scheduledFor?new Date(e.scheduledFor).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}):"";return`
    <div class="calendar-slot" style="background:${t.soft};border-left:3px solid ${t.color};color:#15181E;" data-id="${$(e.id??"")}">
      <div style="display:flex;align-items:center;gap:4px">
        <span>${t.icon}</span>
        <span class="tiny" style="font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#15181E;">${a} ${$(e.titulo??e.hook??"Sin t\xEDtulo")}</span>
      </div>
      ${o?`<div class="tiny" style="color:#667085;">${o}</div>`:""}
      <span class="tag ${j[e.status]??"info"} tiny">${$(e.status??"borrador")}</span>
    </div>`},Y=e=>`
  <div class="modal-overlay" id="add-slot-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>\u2795 Nueva publicaci\xF3n</h3>
        <button class="icon-btn modal-close-btn">\u2715</button>
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Fecha y hora</label>
        <input class="input" type="datetime-local" id="slot-datetime" value="${e}T09:00">
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Tipo</label>
        <select class="input" id="slot-tipo">
          <option value="publicacion">\u{1F4E2} Publicaci\xF3n</option>
          <option value="tarea">\u2705 Tarea</option>
          <option value="evento">\u{1F4CC} Evento</option>
          <option value="recordatorio">\u23F0 Recordatorio</option>
        </select>
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Formato</label>
        <select class="input" id="slot-format">
          <option value="reel">Reel</option>
          <option value="carrusel">Carrusel</option>
          <option value="post-imagen">Post imagen</option>
          <option value="historia">Historia</option>
        </select>
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Idea / T\xEDtulo</label>
        <input class="input" id="slot-title" placeholder="ej: 5 errores al automatizar con IA">
      </div>
      <div class="field-group" style="margin-bottom:16px">
        <label class="field-label">Estado</label>
        <select class="input" id="slot-status">
          <option value="borrador" selected>Borrador</option>
          <option value="pendiente">Pendiente</option>
        </select>
      </div>
      <div class="btn-row">
        <button class="btn gradient" id="save-slot-btn">\u{1F4BE} Guardar</button>
        <button class="btn ghost modal-close-btn">Cancelar</button>
      </div>
    </div>
  </div>`,N=()=>{const e=new Date,t=new Date(e.getFullYear(),e.getMonth()+v,1),a=D[t.getMonth()],o=t.getFullYear(),n=new Date(o,t.getMonth(),1),s=new Date(o,t.getMonth()+1,0),d=(n.getDay()+6)%7,m=s.getDate(),k=new Date().toISOString().slice(0,10),p=[];for(let l=0;l<d;l++)p.push({empty:!0});for(let l=1;l<=m;l++){const r=new Date(o,t.getMonth(),l).toISOString().slice(0,10);p.push({day:l,dateStr:r,isToday:r===k,slots:q(r)})}for(;p.length%7!==0;)p.push({empty:!0});return`
    <div class="calendar-week-header">
      <button class="btn ghost small" id="cal-prev-btn">\u2190 ${D[(t.getMonth()+11)%12]}</button>
      <div class="small" style="font-weight:700;font-size:15px;">${a} ${o}</div>
      <button class="btn ghost small" id="cal-next-btn">${D[(t.getMonth()+1)%12]} \u2192</button>
      <button class="btn primary small" id="cal-today-btn">Hoy</button>
    </div>
    <div class="calendar-month-dow">
      ${M.map(l=>`<div>${l}</div>`).join("")}
    </div>
    <div class="calendar-month-grid">
      ${p.map(l=>{if(l.empty)return'<div class="calendar-month-cell empty"></div>';const i=l.slots.length;return`
          <div class="calendar-month-cell ${l.isToday?"today":""}" data-date="${l.dateStr}">
            <div class="calendar-month-cell-head">
              <span class="calendar-month-day ${l.isToday?"today-num":""}">${l.day}</span>
              ${i>0?`<span class="calendar-month-count">${i}</span>`:""}
            </div>
            <div class="calendar-month-cell-body">
              ${l.slots.slice(0,3).map(r=>{const h=T(r),x=(E[r.formato]??{icon:""}).icon;return`<div class="calendar-month-pill" style="border-left:3px solid ${h.color};background:${h.soft};color:#15181E;">
                  ${h.icon}${x?" "+x:""} ${$((r.titulo??r.hook??"\u2014").slice(0,20))}
                </div>`}).join("")}
              ${i>3?`<div class="calendar-month-more">+${i-3} m\xE1s</div>`:""}
            </div>
            <button class="calendar-month-add" data-date="${l.dateStr}" title="Agregar publicaci\xF3n">+</button>
          </div>`}).join("")}
    </div>`},W=()=>{const t=new Date().getFullYear()+y,a=new Date().toISOString().slice(0,10);return`
    <div class="calendar-week-header">
      <button class="btn ghost small" id="cal-prev-btn">\u2190 ${t-1}</button>
      <div class="small" style="font-weight:700;font-size:18px;">${t}</div>
      <button class="btn ghost small" id="cal-next-btn">${t+1} \u2192</button>
      <button class="btn primary small" id="cal-today-btn">Hoy</button>
    </div>
    <div class="calendar-year-grid">
      ${D.map((o,n)=>{const s=new Date(t,n,1),d=new Date(t,n+1,0),m=(s.getDay()+6)%7,k=d.getDate(),p=b.slots.filter(i=>{const r=new Date(i.scheduledFor??0);return r.getFullYear()===t&&r.getMonth()===n}),l=[];for(let i=0;i<m;i++)l.push(null);for(let i=1;i<=k;i++)l.push(i);return`
          <div class="calendar-year-month" data-month="${n}">
            <div class="calendar-year-month-head">
              <strong>${o}</strong>
              ${p.length?`<span class="calendar-year-count">${p.length}</span>`:""}
            </div>
            <div class="calendar-year-dow">${M.map(i=>`<span>${i[0]}</span>`).join("")}</div>
            <div class="calendar-year-days">
              ${l.map(i=>{if(i===null)return'<span class="calendar-year-day empty"></span>';const r=`${t}-${String(n+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`,h=p.filter(I=>(I.scheduledFor??"").startsWith(r)),x=r===a,F=h[0]?E[h[0].formato]?.border??"var(--accent)":null;return`<span class="calendar-year-day ${x?"today":""} ${h.length?"has":""}"
                  style="${F?`--dot:${F};`:""}" data-date="${r}">${i}</span>`}).join("")}
            </div>
          </div>`}).join("")}
    </div>`},f=e=>{const t=e.querySelector("#calendar-content");t&&(c==="month"?t.innerHTML=N():c==="year"?t.innerHTML=W():t.innerHTML=R(),e.querySelectorAll(".cal-mode-btn").forEach(a=>a.classList.toggle("active",a.dataset.mode===c)),_(e,t))},_=(e,t)=>{t.querySelector("#cal-prev-btn")?.addEventListener("click",()=>{c==="month"?v--:c==="year"?y--:g--,f(e)}),t.querySelector("#cal-next-btn")?.addEventListener("click",()=>{c==="month"?v++:c==="year"?y++:g++,f(e)}),t.querySelector("#cal-today-btn")?.addEventListener("click",()=>{g=0,v=0,y=0,f(e)}),t.querySelectorAll(".calendar-month-add").forEach(a=>{a.addEventListener("click",o=>{o.stopPropagation();const n=a.dataset.date;O(e,n)})}),t.querySelectorAll(".calendar-year-day.has, .calendar-year-day.today").forEach(a=>{a.addEventListener("click",()=>{const o=a.dataset.date;if(!o)return;const n=new Date(o),s=new Date,d=new Date(n);d.setDate(n.getDate()-(n.getDay()+6)%7);const m=new Date(s);m.setDate(s.getDate()-(s.getDay()+6)%7),g=Math.round((d-m)/(7*864e5)),c="week",f(e)})}),t.querySelectorAll(".calendar-add-btn").forEach(a=>{a.addEventListener("click",()=>{O(e,a.dataset.date??new Date().toISOString().slice(0,10))})}),e.querySelector("#ai-plan-week-btn")?.addEventListener("click",async a=>{await L(a.currentTarget,"Planificando\u2026",async()=>{try{await z("/api/calendar/ai-plan",{body:{weekOffset:g}}),u("Semana planificada por IA \u2713","ok"),await w(e)}catch(o){u(o.message,"crit")}})})},w=async e=>{const{data:t}=await S("/api/scheduler/jobs",{jobs:[]}),a=t?.jobs??[];b.slots=a.map(o=>({id:o.id??o.name,titulo:o.titulo??o.description??o.name,formato:o.formato??"post-imagen",status:o.status??"pendiente",scheduledFor:o.scheduledFor??o.nextRun})).filter(o=>o.scheduledFor),f(e)},O=(e,t)=>{document.body.insertAdjacentHTML("beforeend",Y(t));const a=document.querySelector("#add-slot-modal");a?.querySelectorAll(".modal-close-btn").forEach(o=>o.addEventListener("click",()=>a.remove())),a?.querySelector("#save-slot-btn")?.addEventListener("click",async()=>{const o=a.querySelector("#slot-datetime")?.value,n=a.querySelector("#slot-title")?.value.trim();if(!n){u("Ingres\xE1 una idea o t\xEDtulo","warn");return}const{error:s}=await S("/api/calendar/slots",null,{method:"POST",body:{scheduledFor:o?new Date(o).toISOString():new Date().toISOString(),formato:a.querySelector("#slot-format")?.value,tipo:a.querySelector("#slot-tipo")?.value??"publicacion",titulo:n,status:a.querySelector("#slot-status")?.value??"borrador"}});if(s){u("Backend offline. Guardalo cuando vuelva.","warn");return}u("Publicaci\xF3n agregada \u2713","ok"),a.remove(),await w(e)})},V=async(e,t)=>{if(!t||!t.trim())return;u("\u{1F9E0} FeedIA est\xE1 interpretando\u2026","info");const{data:a,error:o}=await S("/api/calendar/interpret",null,{method:"POST",body:{text:t.trim(),context:{weekOffset:g,monthOffset:v,yearOffset:y,viewMode:c}}});if(o){const s=J(t);s?(await S("/api/calendar/slots",null,{method:"POST",body:s}),u("\u{1F4C5} Interpretado localmente. Slot creado.","ok"),await w(e)):u("Backend offline \u2014 no se pudo interpretar.","warn");return}const n=a?.created??[];u(`\u2728 FeedIA cre\xF3 ${n.length} \xEDtem${n.length===1?"":"s"} autom\xE1ticamente`,"ok"),await w(e)},J=e=>{const t=e.toLowerCase(),a=new Date;let o=new Date(a);/mañana/.test(t)?o.setDate(a.getDate()+1):/pasado mañana/.test(t)&&o.setDate(a.getDate()+2);const n=t.match(/(\d{1,2})\s*(am|pm|h|:00)?/);if(n){let d=parseInt(n[1],10);/pm/.test(n[2]??"")&&d<12&&(d+=12),o.setHours(d,0,0,0)}let s="post-imagen";return/reel/.test(t)?s="reel":/carrusel|carousel/.test(t)?s="carrusel":/story|historia/.test(t)&&(s="historia"),{scheduledFor:o.toISOString(),formato:s,titulo:e.trim().slice(0,80),status:"pendiente"}};export const renderCalendar=async e=>{g=0,v=0,y=0,c="month",b={view:"month",slots:[],jobs:[]},e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F4C5} Calendario de contenido</h1>
        <p class="view-subtitle page-subtitle">Planific\xE1, visualiz\xE1 y gestion\xE1 todas tus publicaciones. FeedIA interpreta lo que escrib\xEDs y agenda autom\xE1ticamente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="ai-plan-week-btn">\u{1F916} Planificar con IA</button>
        <button class="btn primary" id="cal-add-now-btn">+ Nueva publicaci\xF3n</button>
      </div>
    </header>

    <!-- IA-interpret box: escrib\xEDs libre, FeedIA agenda -->
    <div class="cal-ai-box">
      <div class="cal-ai-icon">\u{1F9E0}</div>
      <div class="cal-ai-body">
        <strong>Decile a FeedIA qu\xE9 publicar</strong>
        <input class="cal-ai-input" id="cal-ai-input"
          placeholder='Ej: "Ma\xF1ana 10am subir reel sobre disciplina" \xB7 "Carrusel semanal los martes a las 7pm" \xB7 "Story diaria con tip"' />
      </div>
      <button class="btn primary" id="cal-ai-go">\u2728 Interpretar y agendar</button>
    </div>

    <!-- Segmented control: Semana / Mes / A\xF1o -->
    <div class="cal-mode-bar">
      <button class="cal-mode-btn" data-mode="week">\u{1F4C5} Semana</button>
      <button class="cal-mode-btn active" data-mode="month">\u{1F5D3}\uFE0F Mes</button>
      <button class="cal-mode-btn" data-mode="year">\u{1F310} A\xF1o</button>
    </div>

    <!-- Leyenda de tipos -->
    <div class="cal-legend">
      ${Object.values(A).map(o=>`<span class="cal-legend-item"><span class="cal-legend-dot" style="background:${o.color};"></span>${o.icon} ${o.label}</span>`).join("")}
    </div>

    <div id="calendar-content" class="page-body">${C()}</div>

    <style>
      /* /frontend-design: calendario mensual CUADRADO + texto legible + tipos por color */
      .cal-legend{display:flex;gap:14px;flex-wrap:wrap;margin:6px 2px 12px;}
      .cal-legend-item{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text,#15181E);}
      .cal-legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block;}
      .cal-mode-bar{display:flex;gap:6px;background:#F2F4F7;border:1px solid #E3E6EB;border-radius:12px;padding:5px;width:fit-content;margin-bottom:12px;}
      .cal-mode-btn{border:0;background:transparent;color:#475067;font-weight:700;font-size:13px;padding:8px 16px;border-radius:9px;cursor:pointer;}
      .cal-mode-btn.active{background:#fff;color:#15181E;box-shadow:0 1px 3px rgba(16,24,40,.12);}
      .calendar-month-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:8px;}
      .calendar-month-dow>div{text-align:center;font-size:12px;font-weight:800;color:#667085;text-transform:uppercase;letter-spacing:.04em;}
      .calendar-month-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;}
      .calendar-month-cell{position:relative;aspect-ratio:1/1;background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:8px;display:flex;flex-direction:column;overflow:hidden;transition:border-color .15s,box-shadow .15s;}
      .calendar-month-cell:hover{border-color:#9da9ff;box-shadow:0 4px 12px rgba(16,24,40,.08);}
      .calendar-month-cell.empty{background:transparent;border:0;}
      .calendar-month-cell.today{border-color:#7C3AED;box-shadow:0 0 0 2px rgba(124,58,237,.18);}
      .calendar-month-cell-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
      .calendar-month-day{font-size:13px;font-weight:800;color:#15181E;}
      .calendar-month-day.today-num{background:#7C3AED;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;}
      .calendar-month-count{font-size:10px;font-weight:800;color:#7C3AED;background:rgba(124,58,237,.12);border-radius:999px;padding:1px 7px;}
      .calendar-month-cell-body{flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden;}
      .calendar-month-pill{font-size:11px;font-weight:600;padding:3px 7px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}
      .calendar-month-more{font-size:10px;color:#667085;font-weight:600;}
      .calendar-month-add{position:absolute;bottom:6px;right:6px;width:22px;height:22px;border-radius:7px;border:1px solid #E3E6EB;background:#F7F8FB;color:#475067;cursor:pointer;font-size:14px;line-height:1;opacity:0;transition:opacity .15s;}
      .calendar-month-cell:hover .calendar-month-add{opacity:1;}
      .calendar-slot{padding:6px 8px;border-radius:8px;margin-bottom:5px;}
      @media(max-width:640px){.calendar-month-cell{aspect-ratio:auto;min-height:74px;}.calendar-month-pill{font-size:10px;}}
    </style>`,e.querySelectorAll(".cal-mode-btn").forEach(o=>{o.addEventListener("click",()=>{c=o.dataset.mode,f(e)})});const t=e.querySelector("#cal-ai-go"),a=e.querySelector("#cal-ai-input");t?.addEventListener("click",async o=>{await L(o.currentTarget,"interpretando\u2026",async()=>{await V(e,a.value),a.value=""})}),a?.addEventListener("keydown",o=>{o.key==="Enter"&&t.click()}),e.querySelector("#cal-add-now-btn")?.addEventListener("click",()=>{O(e,new Date().toISOString().slice(0,10))}),await w(e)};
