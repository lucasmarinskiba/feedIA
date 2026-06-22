import{apiSafe as r}from"../lib/api.js";import{escape as n,fmt as p}from"../lib/dom.js";import{loadingScreen as c}from"../lib/ui.js";let l=null;const d=()=>{l&&(clearInterval(l),l=null)};window.addEventListener("beforeunload",d),window.addEventListener("hashchange",()=>{(location.hash.replace("#","")||"feed")!=="equipo"&&d()});const o=(i,s)=>{const a=i.querySelector("#eq-body");if(!a)return;if(!s.length){a.innerHTML='<div class="card" style="text-align:center;padding:30px;"><div class="muted">Tu equipo est\xE1 esperando tu primera indicaci\xF3n. Ped\xED algo y miralos trabajar.</div></div>';return}const t=new Map;for(const e of s)t.has(e.quien)||t.set(e.quien,e);a.innerHTML=`
    <div class="card">
      <b class="small">Staff en l\xEDnea</b>
      <div class="meta" style="margin-top:8px;flex-wrap:wrap;gap:6px;">
        ${[...t.values()].map(e=>`<span class="tag tiny" title="${n(e.rol)}">${e.emoji} ${n(e.quien)} \xB7 activo</span>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <b class="small">Actividad del equipo</b>
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:2px;">
        ${s.map(e=>`
          <div class="row" style="gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:18px;line-height:1.2;">${e.emoji}</span>
            <div style="flex:1;min-width:0;">
              <div class="small"><b>${n(e.quien)}</b> <span class="muted">${n(e.rol)}</span></div>
              <div class="small">${n(e.accion)}</div>
            </div>
            <span class="tiny muted" style="white-space:nowrap;">${p.rel(e.cuando)}</span>
          </div>`).join("")}
      </div>
    </div>`};export const renderEquipo=async i=>{d(),i.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F465} Tu equipo en vivo</h1>
        <p class="view-subtitle page-subtitle">No ten\xE9s software corriendo: ten\xE9s a Nova, L\xEDa, Luca, Gard y el resto trabajando para vos ahora.</p>
      </div>
    </header>
    <div id="eq-body" class="page-body">${c()}</div>`;const s=async()=>{const{data:a,error:t}=await r("/api/experience/activity",[]);if(a&&a.length>0)o(i,a);else if(t){const e=i.querySelector("#eq-body");e&&(e.innerHTML=`
          <div style="text-align:center;padding:40px 24px;">
            <div style="font-size:48px;margin-bottom:14px;">\u{1F4E1}</div>
            <h2 style="margin:0 0 8px;">Tu equipo est\xE1 en pausa</h2>
            <p class="small muted" style="max-width:480px;margin:0 auto;line-height:1.5;">
              El backend est\xE1 offline. Cuando vuelva, vas a ver la actividad humanizada del equipo
              (Nova publicando, L\xEDa respondiendo DMs, Luca cerrando leads, etc.).
            </p>
          </div>`)}else o(i,[])};await s(),l=setInterval(s,6e3)};
