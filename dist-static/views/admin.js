import{apiSafe as n}from"../lib/api.js";import{escape as i}from"../lib/dom.js";import{loadingScreen as d}from"../lib/ui.js";const v=e=>new Date(e).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"medium"}),m=e=>{if(!e)return"";const t=parseFloat(e.errorRate||0),r=t>5?"#ef4444":t>1?"#f59e0b":"#10b981";return`
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin:0 0 14px">\u{1F4CA} M\xE9tricas \xFAltimas 24h</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        <div style="background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.18);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase">Hits 24h</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px">${e.hits24h}</div>
        </div>
        <div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase">Errores 24h</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px">${e.errors24h}</div>
        </div>
        <div style="background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.18);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase">Error rate</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px;color:${r}">${e.errorRate}</div>
        </div>
      </div>
    </div>`},g=e=>{if(!e)return"";const t=e.kv?.ok?`\u2705 ${e.kv.latencyMs}ms (${e.kv.mode})`:`\u274C ${e.kv.mode}`,r=e.llm?.configured?"\u2705 Configurado":"\u274C Sin API keys",s=Object.entries(e.llm?.providers||{}).map(([a,o])=>`${o?"\u2705":"\u26AA"} ${a}`).join(" \xB7 ");return`
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin:0 0 14px">\u{1F527} Health checks</h3>
      <div style="font-size:13px;line-height:1.8">
        <div><strong>KV:</strong> ${t}</div>
        <div><strong>LLM:</strong> ${r} <span class="tiny muted">(${s})</span></div>
        <div><strong>Versi\xF3n:</strong> <code>${i(e.version||"?")}</code></div>
      </div>
    </div>`},x=e=>e?.length?`
    <div class="card">
      <h3 style="margin:0 0 14px">\u{1F4DC} \xDAltimos ${e.length} errores</h3>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:520px;overflow-y:auto">
        ${e.map(t=>`
          <div style="background:var(--bg-soft,rgba(17,18,22,.03));border-left:3px solid #ef4444;border-radius:6px;padding:10px 12px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-tertiary)">
              <span>${i(v(t.ts))}</span>
              <span>${i(t.method||"?")} ${i(t.path||"?")}</span>
            </div>
            ${t.userId?`<div style="font-size:11px;color:var(--text-tertiary)">user: <code>${i(t.userId)}</code></div>`:""}
            <pre style="margin:6px 0 0;font-size:11px;white-space:pre-wrap;color:var(--text-secondary);font-family:ui-monospace,monospace">${i((t.error||"").slice(0,600))}</pre>
          </div>`).join("")}
      </div>
    </div>`:`
    <div class="card"><h3 style="margin:0 0 8px">\u{1F4DC} Errores recientes</h3><p class="small muted">Sin errores en el ring buffer.</p></div>`,l=async e=>{const t=e.querySelector("#admin-content");t&&(t.innerHTML=d());const[r,s,a]=await Promise.all([n("/api/admin/stats"),n("/api/admin/logs?limit=100"),n("/api/admin/health/deep")]);if(r.error?.status===403||s.error?.status===403){t&&(t.innerHTML=`<div class="card" style="text-align:center;padding:40px">
      <div style="font-size:40px;margin-bottom:10px">\u{1F512}</div>
      <h3 style="margin:0 0 8px">Acceso restringido</h3>
      <p class="small muted">Esta vista es solo para el owner del sistema (lucasdmarin@gmail.com).</p>
    </div>`);return}const o=r.data?.stats,p=s.data?.errors||[],c=a.data;t&&(t.innerHTML=`
    ${m(o)}
    ${g(c)}
    ${x(p)}
  `)};export const renderAdmin=async e=>{e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F6E1}\uFE0F Admin</h1>
        <p class="view-subtitle page-subtitle">M\xE9tricas, logs y health checks del sistema (owner-only).</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="admin-refresh-btn">\u21BB Refrescar</button>
      </div>
    </header>
    <div id="admin-content" class="page-body">${d()}</div>`,e.querySelector("#admin-refresh-btn")?.addEventListener("click",()=>l(e)),await l(e)};
