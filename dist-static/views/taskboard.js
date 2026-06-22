import{apiSafe as l,apiBust as y}from"../lib/api.js";import{escape as d}from"../lib/dom.js";import{toast as m}from"../lib/toast.js";const v={todo:"\u{1F4CB} Por hacer",doing:"\u{1F504} En progreso",done:"\u2705 Hecho",blocked:"\u26D4 Bloqueado",cancelled:"\u{1F6AB} Cancelado"},k={critical:"#EF4444",high:"#F59E0B",normal:"#3B82F6",low:"#9CA3AF"},T=a=>`
  <div class="card" style="margin-bottom:8px;padding:10px;border-left:3px solid ${k[a.priority]??"#9CA3AF"};">
    <div class="small"><strong>${d(a.title)}</strong></div>
    <div class="small muted" style="margin:4px 0;">@${d(a.assignedTo)} \xB7 ${a.estimatedHours}h \xB7 ${d(a.priority)}</div>
    ${a.dueDate?`<div class="small">\u{1F4C5} ${d(a.dueDate)}</div>`:""}
    <div style="display:flex;gap:4px;margin-top:6px;">
      ${["todo","doing","done","blocked"].filter(s=>s!==a.status).map(s=>`<button class="btn tiny" data-move="${d(a.id)}" data-status="${s}">${v[s].split(" ")[0]}</button>`).join("")}
    </div>
  </div>`;export const renderTaskboard=async a=>{a.innerHTML=`
    <div class="page-header">
      <h1>\u{1F4CB} Task Board</h1>
      <p class="muted">Kanban del equipo. Lo que hace cada agente.</p>
    </div>
    <div id="standup" class="card" style="margin-bottom:18px;"></div>
    <div id="workload" class="stats-grid" style="margin-bottom:18px;"></div>
    <div id="kanban" style="overflow-x:auto;"></div>
  `;const[s,n,e]=await Promise.all([l("/api/tasks/kanban",{}),l("/api/tasks/workload",[]),l("/api/tasks/standup",{date:new Date().toISOString().split("T")[0],totalDoing:0,totalBlocked:0,criticalDueToday:[]})]),r=s.data&&typeof s.data=="object"&&!s.data.demoMode?s.data:{},g=Array.isArray(n.data)?n.data:[],c={date:new Date().toISOString().split("T")[0],totalDoing:0,totalBlocked:0,criticalDueToday:[]},o=e.data&&typeof e.data=="object"&&!e.data.demoMode?{...c,...e.data,criticalDueToday:Array.isArray(e.data.criticalDueToday)?e.data.criticalDueToday:[]}:c;if(!!s.error&&!!n.error){a.innerHTML=`
      <div class="page-header"><h1>\u{1F4CB} Task Board</h1></div>
      <div style="text-align:center;padding:40px 24px;">
        <div style="font-size:48px;margin-bottom:14px;">\u{1F4E1}</div>
        <h2>Sin conexi\xF3n al backend</h2>
        <p class="small muted">El Task Board se cargar\xE1 cuando el servidor vuelva.</p>
      </div>`;return}document.getElementById("standup").innerHTML=`
    <h3>\u2600\uFE0F Standup de hoy (${o.date})</h3>
    <div class="small">
      <strong>${o.totalDoing}</strong> en progreso \xB7
      <strong>${o.totalBlocked}</strong> bloqueadas \xB7
      <strong>${o.criticalDueToday.length}</strong> cr\xEDticas para hoy
    </div>
    ${o.criticalDueToday.length?`
      <div class="small crit" style="margin-top:8px;">
        <strong>\u26A0\uFE0F Cr\xEDticas hoy:</strong>
        ${o.criticalDueToday.map(t=>d(t.title)).join(", ")}
      </div>`:""}
  `,document.getElementById("workload").innerHTML=g.slice(0,10).map(t=>`
    <div class="card stat-card">
      <div class="stat-label">@${d(t.name)}</div>
      <div class="stat-value">${t.activeTasks}</div>
      <div class="small muted">${t.load}h estimadas</div>
      ${t.blockedTasks>0?`<div class="small crit">${t.blockedTasks} bloqueadas</div>`:""}
    </div>`).join("");const p=["todo","doing","blocked","done"];document.getElementById("kanban").innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(${p.length}, minmax(260px, 1fr));gap:12px;">
      ${p.map(t=>`
        <div class="card kanban-col">
          <h4 style="margin:0 0 10px;">${v[t]} (${(r[t]??[]).length})</h4>
          ${(r[t]??[]).slice(0,20).map(T).join("")}
        </div>`).join("")}
    </div>`,a.addEventListener("click",async t=>{const i=t.target.closest("[data-move]");if(!i)return;y("/api/tasks");const{error:u}=await l(`/api/tasks/${i.dataset.move}/status`,null,{method:"POST",body:{status:i.dataset.status}});if(u){m("Backend offline","warn");return}m(`Tarea movida a ${i.dataset.status}`,"success"),renderTaskboard(a)})};
