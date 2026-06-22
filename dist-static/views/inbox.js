import{apiSafe as m}from"../lib/api.js";import{initChatbotUI as b,openChatbot as p}from"../lib/chatbotUI.js";import"../lib/toast.js";let v={navigate:()=>{}},l=[];const x=()=>`
  <div class="inbox-container">
    <!-- Left: Chatbot panel in inbox mode -->
    <div class="inbox-chat-half">
      <div id="inbox-chatbot-wrapper"></div>
    </div>

    <!-- Right: Calendar mini-view (next 7 days) -->
    <div class="inbox-calendar-half">
      <div class="inbox-cal-header">
        <h3 style="margin:0;font-size:14px;font-weight:700;">Pr\xF3ximos eventos</h3>
        <a href="#calendar" style="font-size:12px;color:var(--primary);">Ver calendario \u2192</a>
      </div>
      <div id="inbox-mini-calendar" class="inbox-mini-calendar">
        <!-- Populated by renderMiniCalendar -->
      </div>
    </div>
  </div>`,h=(n=0)=>{const t=new Date,i=new Date(t);return i.setDate(t.getDate()-(t.getDay()+6)%7+n*7),Array.from({length:7},(e,a)=>{const o=new Date(i);return o.setDate(i.getDate()+a),o})},y=()=>{const n=h(0),t=new Date().toISOString().slice(0,10),i=["Lun","Mar","Mi\xE9","Jue","Vie","S\xE1b","Dom"];let e='<div class="inbox-mini-grid">';return n.forEach((a,o)=>{const d=a.toISOString().slice(0,10),c=d===t,r=l.filter(s=>(s.scheduledFor??"").startsWith(d));e+=`
      <div class="inbox-mini-day ${c?"today":""}">
        <div class="inbox-mini-day-header">
          <span>${i[o]}</span>
          <span class="inbox-mini-day-num">${a.getDate()}</span>
        </div>
        <div class="inbox-mini-day-slots" data-date="${d}">
          ${r.length?r.map(s=>`<div class="inbox-mini-slot" title="${s.titulo||"Sin t\xEDtulo"}">${s.titulo?.slice(0,8)}\u2026</div>`).join(""):'<div class="inbox-mini-empty">\u2014</div>'}
        </div>
      </div>`}),e+="</div>",e},u=async()=>{const{data:n}=await m("/api/scheduler/jobs",null,{method:"GET"});if(n?.jobs){l=n.jobs.slice(0,20);const t=document.getElementById("inbox-mini-calendar");t&&(t.innerHTML=y())}},f=({navigate:n})=>{if(v.navigate=n,b({navigate:n}),!document.getElementById("inbox-chatbot-wrapper"))return;const i=document.getElementById("chatbot-panel");i&&i.classList.add("inbox-mode"),setTimeout(()=>p?.(),100)};export const renderInbox=({navigate:n})=>{const t=document.getElementById("main-content");t&&(t.innerHTML=x(),u(),f({navigate:n}))};
