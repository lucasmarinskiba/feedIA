import{apiSafe as s,apiBust as g}from"../lib/api.js";import{escape as e}from"../lib/dom.js";import{toast as d}from"../lib/toast.js";const h={"first-post":"\u{1F3AC}","first-milestone":"\u{1F3D4}\uFE0F","viral-post":"\u{1F680}","first-sale":"\u{1F4B0}","best-week":"\u2B50",comeback:"\u{1F525}","meaningful-comment":"\u{1F4AC}","collab-moment":"\u{1F91D}","launch-day":"\u{1F389}",anniversary:"\u{1F382}",breakthrough:"\u{1F4A1}","community-love":"\u{1F49B}"};let l=null;const p=t=>`
  <div class="card memory-card" data-id="${e(t.id)}" style="${t.pinned?"border-top:3px solid var(--accent);":""}">
    <div class="meta">
      <span style="font-size:24px;">${h[t.type]??"\u{1F4CC}"}</span>
      <span class="tag tiny">${e(t.type)}</span>
      <span class="tag tiny">\u2605 ${t.emotionalWeight}/5</span>
      ${t.pinned?'<span class="tag accent tiny">\u{1F4CC} PIN</span>':""}
    </div>
    <h3 style="margin:8px 0 4px;">${e(t.title)}</h3>
    <div class="small muted">${new Date(t.happenedAt).toLocaleDateString("es-AR")}</div>
    <p style="margin-top:10px;font-style:italic;color:var(--text-muted);">${e(t.storyText||t.description)}</p>
    ${t.associatedData?.quote?`<div class="small" style="margin-top:6px;padding:6px 10px;border-left:2px solid var(--accent);background:var(--bg-card-2);">"${e(t.associatedData.quote)}"</div>`:""}
    ${t.associatedData?.metric?`<div class="small accent" style="margin-top:6px;"><strong>${e(t.associatedData.metric.name)}:</strong> ${t.associatedData.metric.value.toLocaleString("es-AR")}</div>`:""}
    <div style="margin-top:10px;display:flex;gap:6px;">
      <button class="btn small" data-act="pin" data-id="${e(t.id)}">${t.pinned?"Despinear":"\u{1F4CC} Pin"}</button>
      <button class="btn small" data-act="revisit" data-id="${e(t.id)}">\u{1F441}\uFE0F Revisitar (${t.revisitCount})</button>
    </div>
  </div>`;export const renderMemorabilia=async t=>{t.innerHTML=`
    <div class="page-header">
      <h1>\u{1F4D6} Memorabilia</h1>
      <p class="muted">El \xE1lbum de tu journey. Momentos que se quedan.</p>
    </div>

    <div id="snapshot" class="stats-grid" style="margin-bottom:20px;"></div>

    <div id="on-this-day-section" style="margin-bottom:20px;"></div>
    <div id="throwback-section" style="margin-bottom:20px;"></div>

    <div style="display:flex;gap:10px;margin:10px 0;flex-wrap:wrap;">
      <button class="btn small" id="auto-detect">\u{1F50D} Auto-detectar memorias</button>
      <button class="btn small" id="highlight-reel-btn">\u{1F39E}\uFE0F Highlight reel</button>
      <button class="btn small" id="yearbook-btn">\u{1F4DA} Yearbook ${new Date().getFullYear()}</button>
    </div>

    <div class="hook-category-filter" id="type-filter"></div>
    <div id="memorabilia-grid" class="page-grid"></div>
  `;const[v,y,f,x,$]=await Promise.all([s("/api/memorabilia",[]),s("/api/memorabilia/snapshot",{totalMemories:0,pinnedCount:0,yearbooks:0,totalRevisits:0}),s("/api/memorabilia/throwback",null),s("/api/memorabilia/on-this-day",[]),s("/api/memorabilia/yearbooks",[])]),r=v.data??[],c=y.data??{totalMemories:0,pinnedCount:0,yearbooks:0,totalRevisits:0},o=f.data,b=x.data??[],k=$.data??[];!!v.error&&!!y.error&&(t.innerHTML+='<div class="empty-state" style="margin:20px 0;">\u{1F4E1} Sin conexi\xF3n al backend. Las memorias aparecer\xE1n cuando el servidor vuelva.</div>'),document.getElementById("snapshot").innerHTML=`
    <div class="card stat-card">
      <div class="stat-label">Total memorias</div>
      <div class="stat-value">${c.totalMemories}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Pineadas</div>
      <div class="stat-value">${c.pinnedCount}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Yearbooks</div>
      <div class="stat-value">${c.yearbooks}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Total revisitas</div>
      <div class="stat-value">${c.totalRevisits}</div>
    </div>
  `,b.length>0&&(document.getElementById("on-this-day-section").innerHTML=`
      <div class="card accent-border">
        <h3>\u{1F4C5} Un d\xEDa como hoy...</h3>
        ${b.map(p).join("")}
      </div>`),o&&(document.getElementById("throwback-section").innerHTML=`
      <div class="card" style="background:linear-gradient(135deg, #FBE7C6 0%, #FFD6A5 100%);color:#1A1A1A;">
        <div class="small" style="opacity:0.7;text-transform:uppercase;letter-spacing:1px;">Recuerdo aleatorio</div>
        <h3 style="margin:6px 0;">${e(o.title)}</h3>
        <p style="font-style:italic;">${e(o.storyText||o.description)}</p>
        <div class="small" style="margin-top:6px;opacity:0.8;">${new Date(o.happenedAt).toLocaleDateString("es-AR")}</div>
      </div>`);const w=[...new Set(r.map(a=>a.type))];document.getElementById("type-filter").innerHTML=`
    <button class="tab-btn ${l?"":"active"}" data-type="">Todas (${r.length})</button>
    ${w.map(a=>`<button class="tab-btn ${l===a?"active":""}" data-type="${e(a)}">${h[a]??"\u{1F4CC}"} ${e(a)}</button>`).join("")}
  `;let m=r;l&&(m=m.filter(a=>a.type===l)),document.getElementById("memorabilia-grid").innerHTML=m.length>0?m.map(p).join(""):'<div class="empty-state">A\xFAn no hay memorias capturadas. Hac\xE9 clic en "Auto-detectar" para que el sistema busque las importantes.</div>',document.getElementById("type-filter").addEventListener("click",a=>{const i=a.target.closest("[data-type]");i&&(l=i.dataset.type||null,renderMemorabilia(t))}),document.getElementById("auto-detect").addEventListener("click",async()=>{d("Buscando memorias del journey...","info"),g("/api/memorabilia");const{data:a=[]}=await s("/api/memorabilia/auto-detect",[],{method:"POST",body:{}});d(`${a.length} memorias nuevas capturadas`,"success"),renderMemorabilia(t)}),document.getElementById("highlight-reel-btn").addEventListener("click",async()=>{const{data:a}=await s("/api/memorabilia/highlight-reel?count=10",null);if(!a){d("No se pudo cargar el highlight reel","warn");return}const i=`
      <div class="modal-backdrop" id="reel-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="card" style="max-width:700px;max-height:80vh;overflow-y:auto;">
          <h2>\u{1F39E}\uFE0F Highlight Reel</h2>
          <p class="muted">Desde ${a.spanFromTo.from?.split("T")[0]??"?"} hasta hoy \xB7 ${a.totalMemories} memorias</p>
          <p style="font-style:italic;margin:15px 0;">${e(a.summary)}</p>
          ${a.highlights.map(p).join("")}
          <button class="btn" onclick="document.getElementById('reel-modal').remove()" style="margin-top:15px;">Cerrar</button>
        </div>
      </div>`;document.body.insertAdjacentHTML("beforeend",i)}),document.getElementById("yearbook-btn").addEventListener("click",async()=>{const a=new Date().getFullYear();d(`Generando yearbook ${a}...`,"info");const{data:i}=await s(`/api/memorabilia/yearbook/${a}`,null,{method:"POST",body:{}});if(!i){d("No se pudo generar el yearbook","warn");return}const n=`
      <div class="modal-backdrop" id="yb-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="card" style="max-width:800px;max-height:85vh;overflow-y:auto;">
          <div style="text-align:center;font-size:64px;">${i.coverEmoji}</div>
          <pre style="white-space:pre-wrap;font-family:inherit;">${e(i.markdown)}</pre>
          <button class="btn" onclick="document.getElementById('yb-modal').remove()" style="margin-top:15px;">Cerrar</button>
        </div>
      </div>`;document.body.insertAdjacentHTML("beforeend",n)}),t.addEventListener("click",async a=>{const i=a.target.closest("[data-act]");if(!i)return;const n=i.dataset.id,u=i.dataset.act;if(g("/api/memorabilia"),u==="pin"){const E=r.find(T=>T.id===n);await s(`/api/memorabilia/${n}/${E.pinned?"unpin":"pin"}`,null,{method:"POST",body:{}}),renderMemorabilia(t)}u==="revisit"&&(await s(`/api/memorabilia/${n}/revisit`,null,{method:"POST",body:{}}),renderMemorabilia(t))})};
