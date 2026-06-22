export const skeletonBlock=(e=16,i="100%",t=10,a=8)=>`<div class="skeleton" style="height:${e}px;width:${i};margin-top:${t}px;border-radius:${a}px;"></div>`,loadingScreen=(e="cargando\u2026",i="skeleton")=>i==="spinner"?`<div class="loading-screen"><span class="spinner"></span> ${e}</div>`:`<div class="loading-screen" aria-busy="true" aria-label="${e}" style="display:block;padding:4px 2px;">
    <div class="skeleton" style="height:34px;width:42%;border-radius:10px;"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
      ${[0,1,2].map(()=>`<div class="card" style="padding:18px;">
        ${skeletonBlock(22,"60%",0)}${skeletonBlock(14,"100%")}${skeletonBlock(14,"85%")}${skeletonBlock(14,"40%")}
      </div>`).join("")}
    </div>
    <div class="card" style="margin-top:14px;padding:18px;">
      ${skeletonBlock(16,"30%",0)}${skeletonBlock(13,"100%")}${skeletonBlock(13,"92%")}${skeletonBlock(13,"70%")}
    </div>
  </div>`,emptyState=(e,i,t=420)=>`<div class="card" style="display:flex;align-items:center;justify-content:center;min-height:${t}px;flex-direction:column;gap:10px;text-align:center;">
    <div style="font-size:52px;opacity:0.22;line-height:1;">${e}</div>
    <div class="muted small" style="max-width:280px;line-height:1.5">${i}</div>
    <button class="btn ghost tiny" onclick="window.openCommandPalette&&window.openCommandPalette()" style="margin-top:6px;">\u2318K \xB7 Pedile algo a tu equipo</button>
  </div>`,errorAlert=e=>`<div class="alert crit" style="margin:20px 0">\u26A0\uFE0F ${e}</div>`,withBtnSpinner=async(e,i,t)=>{const a=e._html??e.innerHTML;e._html=a,e.disabled=!0,e.innerHTML=`<span class="spinner"></span> ${i}`;try{await t()}finally{e.disabled=!1,e.innerHTML=a}};
