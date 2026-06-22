import{api as l,apiSafe as v}from"../lib/api.js";import{escape as s,fmt as M}from"../lib/dom.js";import{toast as r}from"../lib/toast.js";import{loadingScreen as d,withBtnSpinner as g}from"../lib/ui.js";let c="intelligence";const S="feedia.autopilot",p=()=>{try{return JSON.parse(localStorage.getItem(S)??"null")??A()}catch{return A()}},A=()=>({enabled:!1,mode:"balanced",postsPerWeek:5,storiesPerDay:2,reelsPerWeek:3,dmAutoReply:!0,commentAutoReply:!1,boostAutoApprove:!1}),y=e=>{try{localStorage.setItem(S,JSON.stringify(e))}catch{}},b={conservative:{name:"\u{1F422} Conservador",desc:"Bajo volumen, alta supervisi\xF3n. Ideal mientras te acostumbr\xE1s.",plan:[{emoji:"\u{1F3A8}",what:"Generar 1 carrusel borrador",when:"Lun 9h",agent:"Nova"},{emoji:"\u270D\uFE0F",what:"Re-escribir 2 captions con voz de marca",when:"Mi\xE9 10h",agent:"L\xEDa"},{emoji:"\u{1F4CA}",what:"Reporte semanal de m\xE9tricas",when:"Vie 18h",agent:"Mira"}]},balanced:{name:"\u2696\uFE0F Balanceado",desc:"Volumen est\xE1ndar. El sistema publica y respeta tus aprobaciones.",plan:[{emoji:"\u{1F3A8}",what:"Generar 3 carruseles + 2 reels",when:"Lun-Vie",agent:"Nova"},{emoji:"\u270D\uFE0F",what:"Captions auto-generados con tu voz",when:"Diario",agent:"L\xEDa"},{emoji:"\u{1F4AC}",what:"Auto-respuesta DMs frecuentes",when:"24/7",agent:"Luca"},{emoji:"\u{1F4C8}",what:"Boost al post con mejor 24h reach",when:"Mar/Jue",agent:"Mira"},{emoji:"\u{1F4CA}",what:"Reporte semanal",when:"Vie 18h",agent:"Mira"}]},aggressive:{name:"\u{1F680} Agresivo",desc:"Volumen m\xE1ximo. El sistema publica con menos checks. Solo si conf\xEDas en la voz de marca.",plan:[{emoji:"\u{1F3A8}",what:"5 carruseles + 4 reels + stories diarias",when:"Lun-Dom",agent:"Nova"},{emoji:"\u270D\uFE0F",what:"Captions + reescrituras autom\xE1ticas",when:"Diario",agent:"L\xEDa"},{emoji:"\u{1F4AC}",what:"Auto-respuesta DMs y comentarios",when:"24/7",agent:"Luca"},{emoji:"\u{1F4C8}",what:"Boost agresivo a 3 best performers/semana",when:"Diario",agent:"Mira"},{emoji:"\u{1F6E1}\uFE0F",what:"Compliance check continuo",when:"24/7",agent:"Gard"},{emoji:"\u{1F4CA}",what:"Reportes diario + semanal",when:"Diario",agent:"Mira"}]}},h=(e,t)=>{const i=e.source==="gap-brief";return`
    <div class="card pin-slot-card ${i?"pin-gap":""}">
      <div class="pin-slot-label">${t}</div>
      <div class="pin-source-tag">
        <span class="tag ${i?"warn":"ok"} tiny">${s(e.source)}</span>
        ${e.format?`<span class="tag tiny">${s(e.format)}</span>`:""}
        ${e.fitScore>0?`<span class="tag info tiny">fit ${e.fitScore}</span>`:""}
      </div>
      <div class="pin-description">${s(e.description)}</div>
      <div class="small muted">${s(e.rationale)}</div>
    </div>`},L=async e=>{e.innerHTML=d();try{const t=await l("/api/pins/recommend"),i=t.band==="s\xF3lido"?"ok":t.band==="mejorable"?"warn":"crit";e.innerHTML=`
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">\u{1F4CC} Pin Slate \u2014 Posts fijados estrat\xE9gicos</h3>
          <div class="small muted">El sistema elige 3 piezas seg\xFAn funnel position: awareness \u2192 consideration \u2192 conversion.</div>
        </div>
        <div class="autopilot-slate-score">
          <span class="autopilot-score-num">${t.slateScore}</span>
          <span class="muted small">/100</span>
          <span class="tag ${i}">${s(t.band)}</span>
        </div>
      </div>
      <div class="pin-grid">
        ${h(t.awarenessPin,"AWARENESS")}
        ${h(t.considerationPin,"CONSIDERATION")}
        ${h(t.conversionPin,"CONVERSION")}
      </div>
      ${t.recommendations.length?`
        <div class="card" style="margin-top:14px;">
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Recomendaciones</div>
          <ul class="small">${t.recommendations.map(a=>`<li>${s(a)}</li>`).join("")}</ul>
        </div>`:""}`}catch(t){e.innerHTML=`<div class="alert crit">Error: ${s(t.message)}</div>`}},T=async e=>{e.innerHTML=`
    <div class="autopilot-grid-2">
      <div class="card">
        <h3 style="margin:0 0 6px;">\u{1F6E1} Originality Engine</h3>
        <p class="small muted" style="margin:0 0 14px;">Peg\xE1 un draft. El motor compara contra el historial de la marca (fingerprints n-gram + hook overlap) y devuelve un score 0\u2013100.</p>
        <div class="field">
          <label class="field-label">Hook</label>
          <textarea class="field-textarea" id="orig-hook" rows="2" placeholder="El 87% de las marcas comete este error..."></textarea>
        </div>
        <div class="field">
          <label class="field-label">Cuerpo</label>
          <textarea class="field-textarea" id="orig-body" rows="4" placeholder="Desarrollo del contenido..."></textarea>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="orig-check-btn">Verificar originalidad</button>
        </div>
        <div id="orig-result"></div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 6px;">\u{1F4DA} Fingerprints registrados</h3>
        <div id="orig-fps" class="small muted">cargando\u2026</div>
      </div>
    </div>`;try{const t=await l("/api/originality/fingerprints?limit=10"),i=e.querySelector("#orig-fps");i.innerHTML=t.length===0?"Sin fingerprints todav\xEDa. Cuando produzcas contenido se ir\xE1n acumulando ac\xE1.":t.slice(-10).reverse().map(a=>`
          <div class="orig-fp-row">
            <span class="tiny muted">${M.rel(a.createdAt)}</span>
            <span class="tiny" style="font-family:'SF Mono',monospace;color:var(--text-tertiary);">${s(a.hash.slice(0,8))}</span>
            <span class="small" style="flex:1;">${s(a.hookLine.slice(0,80)||"(sin hook)")}</span>
          </div>`).join("")}catch(t){e.querySelector("#orig-fps").innerHTML=`<span class="crit">Error: ${s(t.message)}</span>`}e.querySelector("#orig-check-btn").addEventListener("click",async t=>{const i=e.querySelector("#orig-hook").value.trim(),a=e.querySelector("#orig-body").value.trim();if(!i&&!a){r("Peg\xE1 al menos un hook o body","warn");return}await g(t.currentTarget,"verificando\u2026",async()=>{try{const o=await l("/api/originality/check",{method:"POST",body:{hook:i,body:a}}),n=o.band==="unico"||o.band==="fresco"?"ok":o.band==="similar"?"warn":"crit",u=`
          <div class="orig-result-box">
            <div class="orig-result-head">
              <div class="orig-score-num">${o.originalityScore}</div>
              <span class="tag ${n}">${s(o.band)}</span>
              <span class="muted tiny">${o.passed?"\u2713 puede publicar":"\u2717 retry"}</span>
            </div>
            ${o.closestMatch?`
              <div class="small muted" style="margin-top:8px;">
                Match m\xE1s cercano: <span style="color:var(--text-secondary);">"${s(o.closestMatch.hookLine.slice(0,80))}"</span>
                <br>Similitud cuerpo: ${(o.closestMatch.bodySimilarity*100).toFixed(0)}% \xB7 hook: ${(o.closestMatch.hookSimilarity*100).toFixed(0)}%
              </div>`:'<div class="small muted" style="margin-top:8px;">Sin match cercano \u2014 pieza \xFAnica.</div>'}
            ${o.triggeredRules.length?`<ul class="small" style="margin-top:8px;">${o.triggeredRules.map(m=>`<li>${s(m)}</li>`).join("")}</ul>`:""}
            ${o.recommendations.length?`
              <div style="margin-top:8px;">
                <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Sugerencias</div>
                <ul class="small">${o.recommendations.map(m=>`<li>${s(m)}</li>`).join("")}</ul>
              </div>`:""}
          </div>`;e.querySelector("#orig-result").innerHTML=u}catch(o){r("Error: "+o.message,"crit")}})})},j=async e=>{e.innerHTML=d();try{const i=(await l("/api/templates/list")).templates??[];e.innerHTML=`
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">\u{1F9E9} Concept Templates</h3>
          <div class="small muted">${i.length} plantillas conceptuales. Cada una es el esqueleto narrativo completo de una pieza probada.</div>
        </div>
      </div>
      <div class="page-grid">
        ${i.map(a=>`
          <div class="card template-card" data-id="${s(a.id)}">
            <div class="meta">
              <span class="tag accent tiny">${s(a.format)}</span>
              <span class="tag info tiny">${s(a.funnelPosition)}</span>
              <span class="tag tiny">score ${a.baselineScore}</span>
            </div>
            <h3 style="margin:6px 0 4px;">${s(a.name)}</h3>
            <div class="small muted">${s(a.whyItWorks)}</div>
            <div class="small" style="margin-top:6px;"><strong>${a.slots.length} slots:</strong> ${a.slots.map(o=>s(o.key)).join(" \u2192 ")}</div>
            <div class="meta" style="margin-top:6px;">${a.goals.map(o=>`<span class="tag tiny">${s(o)}</span>`).join("")}</div>
          </div>`).join("")}
      </div>`}catch(t){e.innerHTML=`<div class="alert crit">Error: ${s(t.message)}</div>`}},P={"lead-qualified":"ok","lead-warm":"info",support:"info",complaint:"crit",collab:"accent",spam:"muted",compliment:"ok","content-ask":"info","off-topic":"muted",unknown:"warn"},E=async e=>{e.innerHTML=`
    <div class="autopilot-grid-2">
      <div class="card">
        <h3 style="margin:0 0 6px;">\u{1F5E3} Convo Router live tester</h3>
        <p class="small muted" style="margin:0 0 12px;">Peg\xE1 un mensaje real (DM o comentario). El router lo clasifica determin\xEDsticamente y decide el flujo de respuesta.</p>
        <div class="field">
          <label class="field-label">Mensaje entrante</label>
          <textarea class="field-textarea" id="convo-input" rows="3" placeholder="Hola, cu\xE1nto cuesta tu servicio?"></textarea>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="convo-route-btn">Rutear</button>
        </div>
        <div id="convo-result"></div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 6px;">\u{1F4CB} FAQs registradas</h3>
        <div id="convo-faqs" class="small muted">cargando\u2026</div>
      </div>
    </div>`;try{const t=await l("/api/convo/faqs"),i=e.querySelector("#convo-faqs");i.innerHTML=t.length===0?"Sin FAQs. Agregalas via API o desde Settings para que el router responda autom\xE1ticamente.":t.map(a=>`
          <div class="convo-faq-row">
            <div class="small"><strong>${s(a.topic)}</strong></div>
            <div class="tiny muted">${a.questionVariants.length} variantes \xB7 ${a.hits} hits</div>
          </div>`).join("")}catch(t){e.querySelector("#convo-faqs").innerHTML=`<span class="crit">Error: ${s(t.message)}</span>`}e.querySelector("#convo-route-btn").addEventListener("click",async t=>{const i=e.querySelector("#convo-input").value.trim();if(!i){r("Peg\xE1 un mensaje","warn");return}await g(t.currentTarget,"ruteando\u2026",async()=>{try{const a=await l("/api/convo/route",{method:"POST",body:{text:i}}),n=`
          <div class="convo-result-box">
            <div class="meta">
              <span class="tag ${P[a.detectedIntent]??"info"}">${s(a.detectedIntent)}</span>
              <span class="tag tiny">conf ${(a.intentConfidence*100).toFixed(0)}%</span>
              <span class="tag info tiny">policy: ${s(a.policy)}</span>
              <span class="tag accent tiny">action: ${s(a.action)}</span>
              ${a.requiresApproval?'<span class="tag warn tiny">requiere aprobaci\xF3n</span>':""}
            </div>
            ${a.suggestedReply?`
              <div class="convo-suggested">
                <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Reply sugerido (${s(a.source)})</div>
                <div class="small">${s(a.suggestedReply)}</div>
              </div>`:'<div class="small muted" style="margin-top:8px;">Sin reply template \u2014 se requiere LLM o intervenci\xF3n.</div>'}
            ${a.signals.length?`
              <div class="tiny muted" style="margin-top:8px;">Se\xF1ales: ${a.signals.map(u=>s(u)).join(" \xB7 ")}</div>`:""}
          </div>`;e.querySelector("#convo-result").innerHTML=n}catch(a){r("Error: "+a.message,"crit")}})})},q={"cold-lead-dm":"\u{1F4E8}","dormant-story":"\u{1F4D6}","callback-content":"\u{1F501}","nurture-reactivation":"\u{1F331}","buyer-thanks":"\u{1F64F}","birthday-callout":"\u{1F389}"},f=async e=>{e.innerHTML=d();try{const[t,i]=await Promise.all([l("/api/retention/stats"),l("/api/retention/pulses")]);e.innerHTML=`
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">\u{1F501} Retention Pulses</h3>
          <div class="small muted">Re-engagement proactivo: DMs a leads fr\xEDos, stories a dormidos, callbacks a virales pasados.</div>
        </div>
        <div class="autopilot-stat-row">
          <div class="autopilot-stat"><div class="autopilot-stat-num">${t.total}</div><div class="autopilot-stat-label">total</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${t.byStatus.propuesto}</div><div class="autopilot-stat-label">propuestos</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${t.highPriorityPending}</div><div class="autopilot-stat-label">prio alta</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin:0 0 8px;">\u26A1 Generar pulsos desde signals</h3>
        <p class="small muted" style="margin:0 0 12px;">Ingres\xE1 se\xF1ales aproximadas de tu audiencia. El motor genera pulsos accionables.</p>
        <div class="field-row">
          <div class="field" style="flex:1;"><label class="field-label">Cold leads</label><input class="field-input" id="sig-cold" type="number" placeholder="ej: 25"/></div>
          <div class="field" style="flex:1;"><label class="field-label">Dormidos</label><input class="field-input" id="sig-dormant" type="number" placeholder="ej: 250"/></div>
          <div class="field" style="flex:1;"><label class="field-label">Compradores recientes</label><input class="field-input" id="sig-buyers" type="number" placeholder="ej: 5"/></div>
          <div class="field" style="flex:1;"><label class="field-label">Warm sin compra</label><input class="field-input" id="sig-warm" type="number" placeholder="ej: 15"/></div>
        </div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="btn primary" id="pulse-plan-btn">Planificar pulsos</button>
        </div>
      </div>

      <div id="pulse-list">
        ${i.length===0?'<div class="small muted" style="text-align:center;padding:20px;">Sin pulsos. Gener\xE1 unos a partir de se\xF1ales arriba.</div>':i.map(a=>`
              <div class="card pulse-card">
                <div class="pulse-icon">${q[a.type]??"\u26A1"}</div>
                <div class="pulse-body">
                  <div class="meta">
                    <span class="tag ${a.priority==="alta"?"crit":a.priority==="media"?"warn":""} tiny">${s(a.priority)}</span>
                    <span class="tag info tiny">${s(a.type)}</span>
                    <span class="tag ${a.status==="enviado"?"ok":a.status==="descartado"?"crit":""} tiny">${s(a.status)}</span>
                  </div>
                  <h3 style="margin:6px 0 4px;">${s(a.title)}</h3>
                  <div class="small">${s(a.actionRequired)}</div>
                  ${a.draftCopy?`<div class="small muted" style="font-style:italic;margin-top:6px;border-left:2px solid var(--border);padding-left:8px;">"${s(a.draftCopy)}"</div>`:""}
                  ${a.status==="propuesto"?`
                    <div class="btn-row" style="margin-top:8px;">
                      <button class="btn primary tiny" data-pulse-action="enviado" data-id="${s(a.id)}">\u2713 Marcar enviado</button>
                      <button class="btn ghost tiny" data-pulse-action="descartado" data-id="${s(a.id)}">Descartar</button>
                    </div>`:""}
                </div>
              </div>`).join("")}
      </div>`,e.querySelector("#pulse-plan-btn").addEventListener("click",async a=>{const o={coldLeads:Number(e.querySelector("#sig-cold").value)||0,dormantFollowers:Number(e.querySelector("#sig-dormant").value)||0,recentBuyers:Number(e.querySelector("#sig-buyers").value)||0,warmNonBuyers:Number(e.querySelector("#sig-warm").value)||0};await g(a.currentTarget,"planificando\u2026",async()=>{try{const n=await l("/api/retention/plan",{method:"POST",body:o});r(`${n.created} pulsos generados`,"ok"),await f(e)}catch(n){r("Error: "+n.message,"crit")}})}),e.querySelectorAll("[data-pulse-action]").forEach(a=>{a.addEventListener("click",async()=>{await l(`/api/retention/pulses/${a.dataset.id}/status`,{method:"POST",body:{status:a.dataset.pulseAction}}),await f(e)})})}catch(t){e.innerHTML=`<div class="alert crit">Error: ${s(t.message)}</div>`}},R=async e=>{e.innerHTML=d();try{const[t,i]=await Promise.all([l("/api/outreach/templates"),l("/api/outreach/summary")]);e.innerHTML=`
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">\u{1F4EC} Outreach DM Engine</h3>
          <div class="small muted">Templates con secuencias multi-step + A/B variants. ${t.count} templates, ${i.total} secuencias disparadas.</div>
        </div>
        <div class="autopilot-stat-row">
          <div class="autopilot-stat"><div class="autopilot-stat-num">${i.inProgress}</div><div class="autopilot-stat-label">en curso</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${i.replied}</div><div class="autopilot-stat-label">replicados</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${(i.overallReplyRate*100).toFixed(0)}%</div><div class="autopilot-stat-label">reply rate</div></div>
        </div>
      </div>

      <div class="col-header" style="margin-top:16px;"><h3>\u{1F4DA} Templates disponibles</h3></div>
      <div class="page-grid">
        ${t.templates.map(a=>`
          <div class="card outreach-template-card">
            <div class="meta">
              <span class="tag accent tiny">${s(a.category)}</span>
              <span class="tag tiny">${s(a.intensity)}</span>
              <span class="tag ok tiny">${(a.expectedReplyRate*100).toFixed(0)}% reply esperado</span>
            </div>
            <h3 style="margin:6px 0 4px;">${s(a.name)}</h3>
            <div class="small muted">${s(a.whyItWorks)}</div>
            <div class="small" style="margin-top:6px;"><strong>Variants:</strong> ${a.variants.map(o=>s(o.label)).join(" \xB7 ")}</div>
            <div class="small" style="margin-top:6px;"><strong>Steps:</strong> ${a.variants[0].steps.length} paso(s)</div>
          </div>`).join("")}
      </div>

      ${i.variantPerformance.length?`
        <div class="col-header" style="margin-top:24px;"><h3>\u{1F3C6} Variant performance (A/B)</h3></div>
        <div class="card" style="padding:0;">
          <table style="width:100%;">
            <thead>
              <tr><th>Template</th><th>Variant</th><th style="text-align:right">Sent</th><th style="text-align:right">Reply</th><th style="text-align:right">Rate</th></tr>
            </thead>
            <tbody>
              ${i.variantPerformance.map(a=>`
                <tr>
                  <td class="small">${s(a.templateId)}</td>
                  <td class="small">${s(a.variantLabel)}</td>
                  <td class="small" style="text-align:right">${a.totalSent}</td>
                  <td class="small" style="text-align:right">${a.replied}</td>
                  <td class="small" style="text-align:right"><strong>${(a.replyRate*100).toFixed(1)}%</strong></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`:""}`}catch(t){e.innerHTML=`<div class="alert crit">Error: ${s(t.message)}</div>`}},x=[{id:"intelligence",label:"\u{1F4CC} Pin Slate",render:L},{id:"production",label:"\u{1F9E9} Templates",render:j},{id:"protection",label:"\u{1F6E1} Originality",render:T},{id:"conversation",label:"\u{1F5E3} Convo Router",render:E},{id:"retention",label:"\u{1F501} Retention",render:f},{id:"outreach",label:"\u{1F4EC} Outreach",render:R}],k=async e=>{const t=e.querySelector("#autopilot-content");if(!t)return;await(x.find(a=>a.id===c)??x[0]).render(t)},$=()=>{const e=p(),t=b[e.mode];return`
    <div class="autopilot-master">
      <div class="autopilot-master-head">
        <div class="autopilot-master-title">
          <span class="autopilot-master-status ${e.enabled?"on":"off"}"></span>
          <h2>\u{1F6F0} Autopilot ${e.enabled?'<span class="autopilot-on-pill">ACTIVADO</span>':'<span class="autopilot-off-pill">EN PAUSA</span>'}</h2>
        </div>
        <button class="btn ${e.enabled?"ghost":"primary"} large" id="autopilot-toggle">
          ${e.enabled?"\u23F8\uFE0F Pausar Autopilot":"\u{1F680} Activar Autopilot"}
        </button>
      </div>
      <p class="autopilot-master-sub">
        ${e.enabled?`El sistema est\xE1 operando en modo <strong>${s(t.name)}</strong>. Acciones planeadas abajo.`:"Cuando lo actives, el equipo IA empieza a ejecutar el plan autom\xE1ticamente."}
      </p>

      <!-- Mode selector -->
      <div class="autopilot-mode-row">
        ${Object.entries(b).map(([i,a])=>`
          <button class="autopilot-mode-card ${e.mode===i?"active":""}" data-mode="${i}">
            <div class="autopilot-mode-name">${s(a.name)}</div>
            <div class="autopilot-mode-desc">${s(a.desc)}</div>
          </button>`).join("")}
      </div>

      <!-- Plan visible -->
      <div class="autopilot-plan">
        <h4>\u{1F4C5} Plan autom\xE1tico para ${s(t.name)}</h4>
        <div class="autopilot-plan-list">
          ${t.plan.map(i=>`
            <div class="autopilot-plan-item">
              <span class="autopilot-plan-emoji">${i.emoji}</span>
              <div class="autopilot-plan-body">
                <div class="autopilot-plan-what">${s(i.what)}</div>
                <div class="autopilot-plan-meta">${s(i.when)} \xB7 @${s(i.agent)}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>

      <!-- Permisos r\xE1pidos -->
      <div class="autopilot-perms">
        <h4>\u{1F510} Permisos del Autopilot</h4>
        <label class="autopilot-perm">
          <input type="checkbox" data-perm="dmAutoReply" ${e.dmAutoReply?"checked":""}>
          <span><strong>Auto-responder DMs frecuentes</strong><div class="small muted">L\xEDa responde preguntas comunes con tu voz</div></span>
        </label>
        <label class="autopilot-perm">
          <input type="checkbox" data-perm="commentAutoReply" ${e.commentAutoReply?"checked":""}>
          <span><strong>Auto-responder comentarios</strong><div class="small muted">Responde comentarios positivos y preguntas</div></span>
        </label>
        <label class="autopilot-perm">
          <input type="checkbox" data-perm="boostAutoApprove" ${e.boostAutoApprove?"checked":""}>
          <span><strong>Boost auto-aprobado &lt;$50</strong><div class="small muted">Boosts de hasta $50 USD sin pedir confirmaci\xF3n</div></span>
        </label>
      </div>
    </div>

    <style>
      .autopilot-master {
        background: linear-gradient(135deg, #1a1a2e, #2a1a3e 70%);
        border: 1px solid rgba(168,85,247,.3); border-radius: 18px; padding: 22px;
        margin-bottom: 20px; position: relative; overflow: hidden;
      }
      .autopilot-master::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(circle at 100% 0%, rgba(168,85,247,.2), transparent 50%);
        pointer-events: none;
      }
      .autopilot-master-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; position: relative; }
      .autopilot-master-title { display: flex; align-items: center; gap: 12px; }
      .autopilot-master-title h2 { margin: 0; font-size: 22px; font-weight: 800; }
      .autopilot-master-status {
        width: 12px; height: 12px; border-radius: 50%;
      }
      .autopilot-master-status.on { background: #10b981; box-shadow: 0 0 14px rgba(16,185,129,.8); animation: apPulse 2s ease-in-out infinite; }
      .autopilot-master-status.off { background: #6b7280; }
      @keyframes apPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
      .autopilot-on-pill {
        font-size: 11px; padding: 2px 9px; border-radius: 999px;
        background: linear-gradient(90deg,#10b981,#22d3ee); color: #fff; font-weight: 800;
        text-transform: uppercase; letter-spacing: .05em; vertical-align: middle;
      }
      .autopilot-off-pill {
        font-size: 11px; padding: 2px 9px; border-radius: 999px;
        background: #6b7280; color: #fff; font-weight: 800;
        text-transform: uppercase; letter-spacing: .05em; vertical-align: middle;
      }
      .autopilot-master-sub { font-size: 13.5px; color: var(--text-muted, #9CA3AF); margin: 12px 0 18px; position: relative; }

      .autopilot-mode-row {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px; margin-bottom: 18px; position: relative;
      }
      .autopilot-mode-card {
        background: var(--surface, #141418); border: 2px solid var(--border);
        border-radius: 12px; padding: 14px; cursor: pointer; color: inherit; text-align: left;
        transition: border-color .15s, transform .15s, box-shadow .2s;
      }
      .autopilot-mode-card:hover { transform: translateY(-1px); border-color: rgba(168,85,247,.5); }
      .autopilot-mode-card.active {
        border-color: #a855f7;
        box-shadow: 0 0 0 3px rgba(168,85,247,.18), 0 6px 18px rgba(168,85,247,.25);
        background: linear-gradient(135deg, rgba(99,102,241,.1), rgba(168,85,247,.05));
      }
      .autopilot-mode-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
      .autopilot-mode-desc { font-size: 11.5px; color: var(--text-muted, #9CA3AF); line-height: 1.4; }

      .autopilot-plan { margin-bottom: 18px; position: relative; }
      .autopilot-plan h4 { margin: 0 0 10px; font-size: 14px; }
      .autopilot-plan-list { display: flex; flex-direction: column; gap: 6px; }
      .autopilot-plan-item {
        display: flex; gap: 12px; align-items: center; padding: 10px 12px;
        background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
        border-radius: 10px;
      }
      .autopilot-plan-emoji { font-size: 22px; flex-shrink: 0; }
      .autopilot-plan-body { flex: 1; }
      .autopilot-plan-what { font-weight: 600; font-size: 13px; }
      .autopilot-plan-meta { font-size: 11px; color: var(--text-muted, #9CA3AF); margin-top: 2px; }

      .autopilot-perms { position: relative; }
      .autopilot-perms h4 { margin: 0 0 10px; font-size: 14px; }
      .autopilot-perm {
        display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px;
        background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
        border-radius: 10px; margin-bottom: 6px; cursor: pointer;
      }
      .autopilot-perm:hover { border-color: rgba(168,85,247,.3); }
      .autopilot-perm input { width: 18px; height: 18px; margin-top: 2px; accent-color: #a855f7; }
      .autopilot-perm > span { flex: 1; }
    </style>
  `},w=e=>{e.querySelector("#autopilot-toggle")?.addEventListener("click",()=>{const t=p();t.enabled=!t.enabled,y(t),v("/api/autopilot/state",null,{method:"PUT",body:{enabled:t.enabled}}),r(t.enabled?"\u{1F680} Autopilot activado \u2014 el equipo est\xE1 operando":"\u23F8\uFE0F Autopilot en pausa","ok");const i=e.querySelector(".autopilot-master");if(i){const a=document.createElement("div");a.innerHTML=$(),i.outerHTML=a.firstElementChild.outerHTML,w(e)}}),e.querySelectorAll(".autopilot-mode-card").forEach(t=>{t.addEventListener("click",()=>{const i=p();i.mode=t.dataset.mode,y(i),v("/api/autopilot/state",null,{method:"PUT",body:{mode:i.mode}}),r(`Modo: ${b[i.mode].name}`,"ok");const a=e.querySelector(".autopilot-master");if(a){const o=document.createElement("div");o.innerHTML=$(),a.outerHTML=o.firstElementChild.outerHTML,w(e)}})}),e.querySelectorAll("[data-perm]").forEach(t=>{t.addEventListener("change",()=>{const i=p();i[t.dataset.perm]=t.checked,y(i),v("/api/autopilot/state",null,{method:"PUT",body:i}),r(`${t.checked?"\u2713":"\u2717"} ${t.dataset.perm}`,"info")})})};export const renderAutopilot=async e=>{c="intelligence",e.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">\u{1F6F0} Autopilot</h1>
        <p class="view-subtitle page-subtitle">Centro de operaci\xF3n aut\xF3noma \xB7 activ\xE1 el plan autom\xE1tico y el equipo trabaja solo.</p>
      </div>
    </header>

    ${$()}

    <div class="page-toolbar">
      <h3 style="margin:0 0 10px;font-size:14px;color:var(--text-muted,#9CA3AF);text-transform:uppercase;letter-spacing:.05em;">M\xF3dulos avanzados</h3>
      <div class="page-toolbar-tabs">
        ${x.map(t=>`
          <button class="tool-tab-btn ${t.id===c?"active":""}" data-tab="${t.id}">${s(t.label)}</button>
        `).join("")}
      </div>
    </div>
    <div id="autopilot-content" class="page-body">${d()}</div>`,w(e),e.querySelectorAll(".tool-tab-btn").forEach(t=>{t.addEventListener("click",async()=>{c=t.dataset.tab,e.querySelectorAll(".tool-tab-btn").forEach(i=>i.classList.toggle("active",i===t)),await k(e)})}),await k(e)};
