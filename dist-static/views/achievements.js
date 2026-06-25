import{apiSafe as d,apiBust as E}from"../lib/api.js";import{escape as a}from"../lib/dom.js";import{toast as v}from"../lib/toast.js";const b={totalUnlocked:0,totalAvailable:0,completionPct:0,totalPoints:0,epicUnlocked:0,legendaryUnlocked:0,mythicUnlocked:0,lastUnlocked:null},T={com\u00FAn:"#9CA3AF",rara:"#3B82F6",\u00E9pica:"#A855F7",legendaria:"#F59E0B",m\u00EDtica:"#EF4444"},L={crecimiento:"\u{1F4C8}",engagement:"\u2764\uFE0F",contenido:"\u{1F3AC}",comunidad:"\u{1F4AC}",ventas:"\u{1F4B0}",rituales:"\u2600\uFE0F",maestr\u00EDa:"\u{1F396}\uFE0F",especiales:"\u2728"};let c=null,$=!1;const A=(t,n)=>{const r=T[t.rarity]??"#9CA3AF",l=t.hidden&&!n;return`
    <div class="card achievement-card ${n?"unlocked":"locked"}" style="border-left: 4px solid ${r}; opacity: ${n||!t.hidden?1:.4};">
      <div class="meta">
        <span class="tag tiny" style="background:${r}; color:white;">${a(t.rarity)}</span>
        <span class="tag tiny">${a(t.category)}</span>
        <span class="tag tiny">+${t.points}pts</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0;">
        <div style="font-size:42px;line-height:1;">${l?"\u{1F512}":a(t.emoji)}</div>
        <div>
          <h3 style="margin:0;">${l?"???":a(t.name)}</h3>
          <div class="small muted">${l?"Logro oculto":a(t.description)}</div>
        </div>
      </div>
      ${n?`<div class="small accent" style="margin-top:6px;">\u2713 Desbloqueado \xB7 ${new Date(t.unlockedAt).toLocaleDateString("es-AR")}</div>`:""}
      ${l?"":`<div class="small muted" style="font-style:italic;margin-top:8px;">"${a(t.flavorText)}"</div>`}
      ${l?"":`<div class="small" style="margin-top:6px;"><strong>C\xF3mo:</strong> ${a(t.unlockCondition)}</div>`}
      ${n&&t.shareableText?`<button class="btn small" data-share="${a(t.id)}" style="margin-top:8px;">Compartir \u{1F4E4}</button>`:""}
    </div>`};export const renderAchievements=async t=>{t.innerHTML=`
    <div class="page-header">
      <h1>\u{1F3C6} Logros</h1>
      <p class="muted">Cada paso del camino tiene un trofeo. Coleccionalos.</p>
    </div>
    <div id="achievements-stats" class="stats-grid" style="margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;"></div>
    <div class="hook-category-filter" id="cat-filter"></div>
    <div style="margin:10px 0;display:flex;gap:10px;align-items:center;">
      <label class="small"><input type="checkbox" id="only-unlocked"> Solo desbloqueados</label>
      <button class="btn small" id="evaluate-btn">\u{1F504} Evaluar progreso</button>
    </div>
    <div id="achievements-grid" class="page-grid"></div>
    <div id="next-section" style="margin-top:30px;"></div>
  `;const[n,r,l,f]=await Promise.all([d("/api/achievements",[]),d("/api/achievements/unlocked",[]),d("/api/achievements/snapshot",b),d("/api/achievements/next",[])]),m=Array.isArray(n.data)?n.data:[],g=Array.isArray(r.data)?r.data:[],i=l.data??b,u=Array.isArray(f.data)?f.data:[];if(!!n.error&&!!l.error&&m.length===0){const e=t.querySelector("#achievements-grid");e&&(e.innerHTML='<div class="empty-state">\u{1F4E1} Sin conexi\xF3n al backend. Los logros se cargar\xE1n cuando el servidor vuelva.</div>');return}document.getElementById("achievements-stats").innerHTML=`
    <div class="card stat-card">
      <div class="stat-label">Desbloqueados</div>
      <div class="stat-value">${i.totalUnlocked}/${i.totalAvailable}</div>
      <div class="small muted">${(i.completionPct??0).toFixed(1)}%</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Puntos</div>
      <div class="stat-value">${i.totalPoints}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">\xC9picos+</div>
      <div class="stat-value">${i.epicUnlocked+i.legendaryUnlocked+i.mythicUnlocked}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">\xDAltimo desbloqueo</div>
      <div class="stat-value" style="font-size:14px;">${i.lastUnlocked?a(i.lastUnlocked.name):"\u2014"}</div>
    </div>
  `;const x=[...new Set(m.map(e=>e.category))];document.getElementById("cat-filter").innerHTML=`
    <button class="tab-btn ${c?"":"active"}" data-cat="">Todos</button>
    ${x.map(e=>`<button class="tab-btn ${c===e?"active":""}" data-cat="${a(e)}">${L[e]??""} ${a(e)}</button>`).join("")}
  `;const p=new Map(g.map(e=>[e.id,e]));let o=m;c&&(o=o.filter(e=>e.category===c)),$&&(o=o.filter(e=>p.has(e.id))),document.getElementById("achievements-grid").innerHTML=o.map(e=>A(p.get(e.id)??e,p.has(e.id))).join(""),u.length>0&&(document.getElementById("next-section").innerHTML=`
      <h2 style="margin-bottom:10px;">\u{1F3AF} Pr\xF3ximos a desbloquear</h2>
      <div class="page-grid">${u.map(e=>`
        <div class="card">
          <div style="font-size:28px;">${a(e.achievement.emoji)}</div>
          <h4>${a(e.achievement.name)}</h4>
          <div class="small muted">${a(e.achievement.description)}</div>
          <div class="small accent" style="margin-top:6px;"><strong>Progreso:</strong> ${a(e.progressHint)}</div>
        </div>`).join("")}</div>
    `),document.getElementById("cat-filter").addEventListener("click",e=>{const s=e.target.closest("[data-cat]");s&&(c=s.dataset.cat||null,renderAchievements(t))}),document.getElementById("only-unlocked").addEventListener("change",e=>{$=e.target.checked,renderAchievements(t)}),document.getElementById("evaluate-btn").addEventListener("click",async()=>{v("Evaluando achievements...","info"),E("/api/achievements");const{data:e}=await d("/api/achievements/evaluate",[],{method:"POST",body:{}}),s=(e??[]).length;s>0?v(`\u{1F389} ${s} nuevo${s>1?"s":""} achievement${s>1?"s":""} desbloqueado${s>1?"s":""}`,"success"):v("Sin nuevos achievements esta vez","info"),renderAchievements(t)}),t.addEventListener("click",async e=>{const s=e.target.closest("[data-share]");if(s){const h=s.dataset.share;await d(`/api/achievements/${h}/share`,null,{method:"POST",body:{}});const y=g.find(k=>k.id===h);y&&navigator.clipboard&&(navigator.clipboard.writeText(y.shareableText),v("Copiado al portapapeles","success"))}})};
