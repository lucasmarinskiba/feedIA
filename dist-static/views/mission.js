import{api as d,apiSafe as $}from"../lib/api.js";import{escape as t,fmt as u}from"../lib/dom.js";import{toast as c}from"../lib/toast.js";import{loadingScreen as h,withBtnSpinner as m}from"../lib/ui.js";const j=[{emoji:"\u{1F680}",title:"Lanzar un producto nuevo",goal:'Lanzar mi nuevo curso "Productividad con IA" \u2014 5 d\xEDas de teaser, 3 reels de valor, 1 carrusel de stack, story diaria, abrir DMs el d\xEDa del lanzamiento.'},{emoji:"\u{1F4C8}",title:"Crecer +1000 followers en 30 d\xEDas",goal:"Crecer mi cuenta de 0 a +1000 followers en 30 d\xEDas: 5 posts/sem con voz de marca, optimizar bio, responder DMs, colaborar con 2 cuentas del nicho."},{emoji:"\u{1F4B0}",title:"Vender en stories",goal:"Funnel de ventas en stories: 7 frames diarios con educaci\xF3n + caso + oferta + escasez + CTA. Replicar 4 semanas seguidas."},{emoji:"\u{1F3AC}",title:"Serie de reels educativos",goal:"Serie de 10 reels educativos sobre mi nicho. Cada uno con hook fuerte, 3 puntos clave en 25s, CTA a comentar. Publicar 2/semana."},{emoji:"\u{1F91D}",title:"Re-activar comunidad",goal:"Re-engagement de seguidores inactivos: identificar top 50 fans, 1 story-shoutout, DM personalizado a 20, live de Q&A semanal."},{emoji:"\u{1F525}",title:"Recuperar de baj\xF3n de alcance",goal:"Diagnosticar ca\xEDda de reach. An\xE1lisis de \xFAltimos 30 posts, comparar con baseline, identificar shadowban risk, plan de recovery 14 d\xEDas."}],L=e=>{const s=e.toLowerCase(),a=[];return/(reel|carrusel|story|post|contenido|publicar|lanzar)/.test(s)&&a.push({agent:"Nova",emoji:"\u{1F3A8}",task:"Dise\xF1ar piezas visuales con tu marca",eta:"15 min"}),/(caption|copy|texto|hook|narrativa)/.test(s),a.push({agent:"L\xEDa",emoji:"\u270D\uFE0F",task:"Escribir captions + hooks con voz de marca",eta:"8 min"}),a.push({agent:"Gard",emoji:"\u{1F6E1}\uFE0F",task:"Validar tono, hashtags y compliance",eta:"3 min"}),/(publicar|subir|lanzar|programar)/.test(s)&&a.push({agent:"Luca",emoji:"\u{1F680}",task:"Programar y publicar en Instagram",eta:"5 min"}),/(crecer|métrica|análisis|análisi|reach|engagement|boost)/.test(s)&&a.push({agent:"Mira",emoji:"\u{1F4C8}",task:"An\xE1lisis de performance + boost si aplica",eta:"10 min"}),/(comunidad|dm|mensaje|comentario|fan|seguidor)/.test(s)&&a.push({agent:"Luca",emoji:"\u{1F4AC}",task:"Responder DMs y comentarios con tu voz",eta:"20 min"}),a};let v="launch",g=null;const b=()=>{try{g&&g.close()}catch{}g=null};window.addEventListener("beforeunload",b),window.addEventListener("hashchange",()=>{(location.hash.replace("#","")||"feed")!=="mission"&&b()});const z={planned:"",running:"warn",completed:"ok",failed:"crit",cancelled:"muted"},M=async e=>{let s=[];try{const r=await d("/api/missions/library");s=Array.isArray(r)?r:Array.isArray(r?.library)?r.library:[]}catch(r){e.innerHTML=`<div class="alert crit">Error: ${t(r.message)}</div>`;return}e.innerHTML=`
    <div class="card mission-launch-card">
      <h3 style="margin:0 0 6px;">\u{1F3AF} Lanzar misi\xF3n multi-agente</h3>
      <p class="small muted" style="margin:0 0 14px;">Describ\xED qu\xE9 necesit\xE1s. El sistema interpreta, decompone en sub-tareas, asigna agentes y ejecuta.</p>
      <div class="field">
        <label class="field-label">Tu objetivo (lenguaje natural)</label>
        <textarea class="field-textarea" id="mission-intent" rows="2" placeholder="Ej: quiero crecer en autoridad este mes en el nicho de IA aplicada"></textarea>
      </div>
      <div class="field-row">
        <div class="field" style="flex:1;">
          <label class="field-label">Horizonte (d\xEDas)</label>
          <input class="field-input" id="mission-horizon" type="number" placeholder="30"/>
        </div>
        <div class="field" style="flex:2;align-self:flex-end;">
          <div class="btn-row">
            <button class="btn ghost" id="mission-plan-btn">\u{1F4CB} Solo planificar</button>
            <button class="btn primary" id="mission-launch-btn">\u{1F680} Lanzar y ejecutar</button>
          </div>
        </div>
      </div>
      <div id="mission-plan-result"></div>
    </div>

    <div class="col-header" style="margin-top:20px;"><h3>\u{1F4DA} Misiones can\xF3nicas disponibles</h3></div>
    <div class="page-grid">
      ${s.map(r=>`
        <div class="card mission-library-card" data-intent="${t(r.intent)}">
          <div class="meta">
            <span class="tag accent tiny">${t(r.intent)}</span>
          </div>
          <h3 style="margin:6px 0 4px;">${t(r.intent.replace(/-/g," "))}</h3>
          <p class="small muted" style="margin:0 0 8px;">${t(r.description)}</p>
          <div class="tiny muted">Disparadores: ${r.keywordTriggers.slice(0,5).map(o=>t(o)).join(" \xB7 ")}</div>
        </div>`).join("")}
    </div>`,e.querySelectorAll("[data-intent]").forEach(r=>{r.addEventListener("click",()=>{const o=e.querySelector("#mission-intent");o&&(o.value=r.dataset.intent.replace(/-/g," "),o.focus())})});const a=e.querySelector("#mission-plan-btn"),i=e.querySelector("#mission-launch-btn"),n=r=>`
      <div class="mission-plan-preview">
        <div class="meta">
          <span class="tag ${r.matchedIntent==="unknown"?"warn":"ok"}">match: ${t(r.matchedIntent)}</span>
          <span class="tag tiny">${r.playbook.tasks.length} tasks</span>
        </div>
        <h4 style="margin:8px 0 4px;">${t(r.playbook.name)}</h4>
        <p class="small muted" style="margin:0 0 10px;">${t(r.playbook.description)}</p>
        <div class="mission-task-list">
          ${r.playbook.tasks.map((o,l)=>`
            <div class="mission-task-row">
              <span class="mission-task-num">${l+1}</span>
              <div class="mission-task-body">
                <div class="small"><strong>${t(o.agentId)}</strong> \xB7 ${t(o.id)}</div>
                <div class="tiny muted">${t(o.goal)}</div>
                ${o.dependsOn?.length?`<div class="tiny muted">depende de: ${o.dependsOn.map(p=>t(p)).join(", ")}</div>`:""}
              </div>
            </div>`).join("")}
        </div>
      </div>`;a?.addEventListener("click",async r=>{const o=e.querySelector("#mission-intent").value.trim();if(!o){c("Describ\xED tu objetivo","warn");return}const l=Number(e.querySelector("#mission-horizon").value)||void 0;await m(r.currentTarget,"planificando\u2026",async()=>{try{const p=await d("/api/missions/decompose",{method:"POST",body:{freeIntent:o,horizonDays:l}});e.querySelector("#mission-plan-result").innerHTML=n(p)}catch(p){c("Error: "+p.message,"crit")}})}),i?.addEventListener("click",async r=>{const o=e.querySelector("#mission-intent").value.trim();if(!o){c("Describ\xED tu objetivo","warn");return}const l=Number(e.querySelector("#mission-horizon").value)||void 0;await m(r.currentTarget,"lanzando\u2026",async()=>{try{const p=await d("/api/missions/launch",{method:"POST",body:{freeIntent:o,horizonDays:l,runNow:!0}});c(`Misi\xF3n lanzada: ${p.mission.id}`,"ok"),e.querySelector("#mission-plan-result").innerHTML=`
          ${n({matchedIntent:p.mission.matchedIntent,playbook:p.mission.playbook})}
          <div class="alert" style="margin-top:12px;">
            <strong>\u{1F680} Ejecutando en background</strong><br>
            <span class="small muted">Mission id: ${t(p.mission.id)}. Ver progreso en tab "Misiones".</span>
          </div>`}catch(p){c("Error: "+p.message,"crit")}})})},w=async e=>{try{const s=await d("/api/missions/list?limit=30");if(!s.length){e.innerHTML='<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin misiones todav\xEDa. Lanz\xE1 una desde el tab "Lanzar".</div></div>';return}e.innerHTML=`
      <div class="autopilot-section-head">
        <h3 style="margin:0;">\u{1F3AF} Misiones (${s.length})</h3>
      </div>
      ${s.map(a=>`
          <div class="card mission-card">
            <div class="row spread">
              <div style="flex:1;min-width:0;">
                <div class="meta">
                  <span class="tag ${z[a.status]??""}">${t(a.status)}</span>
                  <span class="tag accent tiny">${t(a.matchedIntent)}</span>
                  <span class="tiny muted">${u.rel(a.createdAt)}</span>
                </div>
                <h3 style="margin:6px 0 4px;">${t(a.playbook.name)}</h3>
                <p class="small muted" style="margin:0 0 6px;">Intento: "${t(a.freeIntent)}"</p>
                <div class="small">${a.tasksCompleted??0} / ${a.tasksTotal??0} tasks</div>
                ${a.summary?`<div class="small muted" style="margin-top:6px;border-left:2px solid var(--border);padding-left:8px;">${t(a.summary.slice(0,200))}\u2026</div>`:""}
              </div>
              ${a.status==="planned"||a.status==="running"?`
                <div class="btn-row" style="flex-shrink:0;">
                  <button class="btn ghost tiny" data-cancel="${t(a.id)}">Cancelar</button>
                </div>`:""}
            </div>
          </div>`).join("")}`,e.querySelectorAll("[data-cancel]").forEach(a=>{a.addEventListener("click",async()=>{try{await d(`/api/missions/${a.dataset.cancel}/cancel`,{method:"POST"}),c("Misi\xF3n cancelada","ok"),await w(e)}catch(i){c("Error: "+i.message,"crit")}})})}catch(s){e.innerHTML=`<div class="alert crit">Error: ${t(s.message)}</div>`}},A=async e=>{try{const[s,a]=await Promise.all([d("/api/traces/list?limit=40"),d("/api/traces/stats")]);e.innerHTML=`
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">\u{1F9E0} Reasoning Traces</h3>
          <div class="small muted">Cada decisi\xF3n aut\xF3noma queda auditada con su contexto, alternativas, elecci\xF3n y razonamiento.</div>
        </div>
        <div class="autopilot-stat-row">
          <div class="autopilot-stat"><div class="autopilot-stat-num">${a.totalTraces}</div><div class="autopilot-stat-label">total</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${a.withOutcomes}</div><div class="autopilot-stat-label">con outcome</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${(a.successRate*100).toFixed(0)}%</div><div class="autopilot-stat-label">success rate</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${a.avgChosenScore.toFixed(0)}</div><div class="autopilot-stat-label">score prom</div></div>
        </div>
      </div>

      ${s.length===0?'<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin trazas todav\xEDa. Produc\xED piezas o lanz\xE1 misiones para acumular decisiones aut\xF3nomas.</div></div>':""}

      ${s.map(i=>`
        <div class="card trace-card">
          <div class="meta">
            <span class="tag accent tiny">${t(i.agentId)}</span>
            <span class="tag info tiny">${t(i.decisionType)}</span>
            ${i.outcome?`<span class="tag ${i.outcome.ranking==="better"?"ok":i.outcome.ranking==="worse"?"crit":""} tiny">outcome: ${t(i.outcome.ranking)}</span>`:'<span class="tag tiny muted">sin outcome</span>'}
            <span class="tiny muted" style="margin-left:auto;">${u.rel(i.createdAt)}</span>
          </div>
          <div class="trace-chosen">
            <span class="trace-chosen-label">Elegido:</span>
            <code class="trace-chosen-value">${t(i.chosen)}</code>
            <span class="tag ${i.chosenScore>=80?"ok":i.chosenScore>=60?"info":"warn"} tiny">${i.chosenScore}</span>
          </div>
          <div class="small" style="margin-top:6px;">${t(i.reasoning)}</div>
          ${i.alternatives.length>1?`
            <details class="trace-alternatives">
              <summary class="tiny muted">${i.alternatives.length-1} alternativa(s) descartada(s)</summary>
              <div class="trace-alt-list">
                ${i.alternatives.slice(0,10).map(n=>`
                  <div class="trace-alt-row ${n.option===i.chosen?"trace-alt-winner":""}">
                    <code>${t(n.option)}</code>
                    <span class="tag tiny">${n.score}</span>
                    ${n.reasoning?`<span class="tiny muted">${t(n.reasoning)}</span>`:""}
                  </div>`).join("")}
              </div>
            </details>`:""}
          ${i.factsUsed.length?`<div class="tiny muted" style="margin-top:6px;">Facts: ${i.factsUsed.map(n=>`<code>${t(n)}</code>`).join(" ")}</div>`:""}
        </div>
      `).join("")}`}catch(s){e.innerHTML=`<div class="alert crit">Error: ${t(s.message)}</div>`}},k={alta:"ok",media:"info",baja:"muted"},q=async e=>{try{const[s,a]=await Promise.all([d("/api/kb/facts"),d("/api/kb/learnings")]),i={};for(const n of s.facts)i[n.topic]||(i[n.topic]=[]),i[n.topic].push(n);e.innerHTML=`
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">\u{1F4D6} Base de Conocimiento</h3>
          <div class="small muted">${s.count} facts del algoritmo \xB7 ${a.length} aprendizajes propios de tu marca</div>
        </div>
      </div>

      <div class="autopilot-grid-2">
        <div>
          <div class="col-header"><h3>\u{1F310} Algorithm Facts (curados)</h3></div>
          ${Object.entries(i).map(([n,r])=>`
            <details class="kb-topic-group" open>
              <summary><strong>${t(n)}</strong> <span class="tiny muted">(${r.length})</span></summary>
              ${r.map(o=>`
                <div class="kb-fact-row">
                  <div class="meta" style="margin-bottom:4px;">
                    <span class="tag ${k[o.confidence]} tiny">${t(o.confidence)}</span>
                    <code class="tiny muted">${t(o.id)}</code>
                  </div>
                  <div class="small">${t(o.fact)}</div>
                </div>`).join("")}
            </details>`).join("")}
        </div>

        <div>
          <div class="col-header"><h3>\u{1F393} Brand Learnings (din\xE1micos)</h3></div>
          ${a.length===0?'<div class="card" style="padding:20px;text-align:center;"><div class="muted small">Sin aprendizajes propios todav\xEDa. El sistema captura insights autom\xE1ticamente a medida que produce contenido exitoso.</div></div>':a.slice(-30).reverse().map(n=>`
                <div class="card kb-learning-row">
                  <div class="meta">
                    <span class="tag accent tiny">${t(n.category)}</span>
                    <span class="tag ${k[n.confidence]} tiny">${t(n.confidence)}</span>
                    <span class="tag tiny">\xD7${n.reinforcements}</span>
                    <span class="tiny muted" style="margin-left:auto;">${u.rel(n.capturedAt)}</span>
                  </div>
                  <div class="small" style="margin-top:6px;">${t(n.insight)}</div>
                  <div class="tiny muted" style="margin-top:4px;">Evidencia: ${t(n.evidence)}</div>
                </div>`).join("")}
        </div>
      </div>`}catch(s){e.innerHTML=`<div class="alert crit">Error: ${t(s.message)}</div>`}},I={critical:"crit",high:"warn",normal:"info",low:"muted"},C=async e=>{try{const s=await d("/api/bus/history?limit=80");if(!s.length){e.innerHTML='<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin eventos en el bus todav\xEDa. A medida que el sistema opere se ir\xE1n acumulando aqu\xED.</div></div>';return}e.innerHTML=`
      <div class="autopilot-section-head">
        <h3 style="margin:0;">\u{1F4E1} Event Bus (${s.length})</h3>
      </div>
      <div class="card" style="padding:0;">
        ${s.slice().reverse().map(a=>`
          <div class="bus-event-row">
            <span class="tag ${I[a.priority]??""} tiny">${t(a.priority)}</span>
            <code class="bus-event-type">${t(a.type)}</code>
            <span class="tiny muted">${t(a.sourceAgent??"\u2014")} \u2192 ${t(a.targetAgent??"*")}</span>
            <span class="tiny muted" style="margin-left:auto;">${u.rel(a.timestamp)}</span>
          </div>`).join("")}
      </div>`}catch(s){e.innerHTML=`<div class="alert crit">Error: ${t(s.message)}</div>`}},S={"simple-reflex":"#5b9bff","model-based-reflex":"#4ade80","goal-based":"#e1306c","utility-based":"#fbbf24",learning:"#a855f7"},H=(e,s)=>{e.innerHTML=`
    <div class="card talia-hero">
      <div class="talia-avatar">F</div>
      <div style="flex:1;min-width:0;">
        <h3 style="margin:0 0 4px;">${t(s.assistant)} <span class="tag accent tiny">Sistema aut\xF3nomo</span></h3>
        <p class="small muted" style="margin:0;">${t(s.tagline)}</p>
        <p class="small" style="margin:8px 0 0;">${t(s.teamPosture)}</p>
      </div>
    </div>
    <div class="col-header" style="margin-top:18px;"><h3>Qu\xE9 hace FeedIA por vos</h3></div>
    <div class="page-grid">
      ${(s.capabilities||[]).map(a=>`
        <div class="card">
          <h3 style="margin:0 0 6px;">${t(a.area)}</h3>
          <p class="small muted" style="margin:0;">${t(a.whatItDoes)}</p>
        </div>`).join("")}
    </div>
    <div class="card" style="margin-top:16px;">
      <p class="small muted" style="margin:0;">\u{1F512} La arquitectura interna del sistema es propietaria y no se expone. Dale tus \xF3rdenes en la <strong>Pizarra</strong> o por voz \u2014 FeedIA se encarga del resto.</p>
    </div>`},O=async e=>{try{const[s,a,i]=await Promise.all([d("/api/talia/org-chart"),d("/api/talia/knowledge"),d("/api/taxonomy/types")]);if(s&&s.internalsHidden){H(e,s);return}e.innerHTML=`
      <div class="card talia-hero">
        <div class="talia-avatar">T</div>
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0 0 4px;">${t(s.manager.name)} <span class="tag accent tiny">Agent Manager</span></h3>
          <p class="small muted" style="margin:0;">${t(s.manager.title)}</p>
          <p class="small" style="margin:8px 0 0;">Gestiona <strong>${s.totalEmployees}</strong> agentes en <strong>${s.departments.length}</strong> departamentos \xB7 empresa: <strong>${t(s.companyId)}</strong></p>
        </div>
      </div>

      <div class="card" style="margin-top:14px;">
        <h3 style="margin:0 0 8px;">\u{1F3AF} Dale una orden global a Tal\xEDa</h3>
        <p class="small muted" style="margin:0 0 12px;">Ej: "FeedIA, ayudame a crecer la cuenta". Tal\xEDa la fragmenta y delega entre los agentes seg\xFAn su tipo (taxonom\xEDa IBM), departamento y carga.</p>
        <div class="field"><textarea class="field-textarea" id="talia-order" rows="2" placeholder="Escrib\xED tu orden global\u2026"></textarea></div>
        <div class="btn-row"><button class="btn primary" id="talia-delegate-btn">\u{1F9E9} Fragmentar y delegar</button></div>
        <div id="talia-plan"></div>
      </div>

      <div class="col-header" style="margin-top:20px;"><h3>\u{1F3E2} Organigrama por departamento</h3></div>
      <div class="page-grid">
        ${s.departments.map(n=>`
          <div class="card">
            <div class="meta"><span class="tag accent tiny">${t(n.name)}</span><span class="tag tiny">${n.headcount} agentes</span></div>
            <div class="talia-emp-list">
              ${n.employees.map(r=>`
                <div class="talia-emp-row">
                  <span class="talia-type-dot" style="background:${S[r.agentType]??"#888"}"></span>
                  <div style="flex:1;min-width:0;">
                    <div class="small"><strong>${t(r.name)}</strong></div>
                    <div class="tiny muted">${t(r.agentTypeName)} \xB7 ${t(r.seniority)} \xB7 carga ${r.recentWorkload}</div>
                  </div>
                </div>`).join("")}
            </div>
          </div>`).join("")}
      </div>

      <div class="col-header" style="margin-top:20px;"><h3>\u{1F9EC} Tipos de agente (clasificaci\xF3n IBM)</h3></div>
      <div class="page-grid">
        ${i.map(n=>`
          <div class="card">
            <div class="meta"><span class="talia-type-dot" style="background:${S[n.type]??"#888"}"></span><strong>${t(n.name)}</strong></div>
            <p class="small" style="margin:6px 0;">${t(n.definition)}</p>
            <p class="tiny muted" style="margin:0;"><strong>Tal\xEDa delega aqu\xED cuando:</strong> ${t(n.delegateWhen)}</p>
            <div class="meta" style="margin-top:6px;">${n.traits.map(r=>`<span class="tag tiny">${t(r)}</span>`).join("")}</div>
          </div>`).join("")}
      </div>

      <div class="card" style="margin-top:20px;">
        <h3 style="margin:0 0 8px;">\u{1F510} Qu\xE9 sabe Tal\xEDa (acceso scoped a la empresa)</h3>
        <ul class="small">${a.whatSheManages.map(n=>`<li>${t(n)}</li>`).join("")}</ul>
      </div>`,e.querySelector("#talia-delegate-btn")?.addEventListener("click",async n=>{const r=e.querySelector("#talia-order").value.trim();if(!r){c("Escrib\xED una orden","warn");return}await m(n.currentTarget,"delegando\u2026",async()=>{try{const o=await d("/api/talia/delegate",{method:"POST",body:{order:r,createMission:!0}});o.understood&&Array.isArray(o.plan)?e.querySelector("#talia-plan").innerHTML=`
              <div class="talia-plan-box">
                <div class="meta"><span class="tag ok">recibida</span><span class="tag tiny">${o.steps} pasos</span></div>
                <p class="small" style="margin:8px 0;font-style:italic;">"${t(o.note)}"</p>
                <div class="talia-assign-list">
                  ${o.plan.map(l=>`
                    <div class="talia-assign-row">
                      <span class="talia-assign-num">${l.step}</span>
                      <div style="flex:1;min-width:0;"><div class="small">${t(l.task)}</div></div>
                    </div>`).join("")}
                </div>
              </div>`:e.querySelector("#talia-plan").innerHTML=`
              <div class="talia-plan-box">
                <div class="meta"><span class="tag ${o.matchedIntent==="unknown"?"warn":"ok"}">${t(o.matchedIntent)}</span><span class="tag tiny">${o.assignments.length} delegaciones</span></div>
                <p class="small" style="margin:8px 0;font-style:italic;">"${t(o.managerNote)}"</p>
                <div class="talia-assign-list">
                  ${o.assignments.map((l,p)=>`
                    <div class="talia-assign-row">
                      <span class="talia-assign-num">${p+1}</span>
                      <div style="flex:1;min-width:0;">
                        <div class="small"><strong>${t(l.assignee.name)}</strong> <span class="tag tiny">${t(l.requiredTypeName)}</span> <span class="tag tiny">fit ${l.fitScore}</span></div>
                        <div class="tiny muted">${t(l.taskGoal)}</div>
                        <div class="tiny" style="color:var(--accent);">${t(l.rationale)}</div>
                      </div>
                    </div>`).join("")}
                </div>
              </div>`,c("FeedIA recibi\xF3 la orden","ok")}catch(o){c("Error: "+o.message,"crit")}})})}catch(s){e.innerHTML=`<div class="alert crit">Error: ${t(s.message)}</div>`}},D=async e=>{try{const s=await d("/api/computer/runtime");e.innerHTML=`
      <div class="card">
        <h3 style="margin:0 0 6px;">\u{1F5A5} Computer Use \u2014 control de cursor y teclado</h3>
        <p class="small muted" style="margin:0 0 4px;">FeedIA navega Instagram (Feed, Buscador, Explorar, Perfil, DMs, Historias, Reels, Crear +, Me gusta, Guardar, Compartir, Comentarios, Bio, Destacadas, Grid\u2026) y apps de escritorio como un humano.</p>
        <div class="meta" style="margin:8px 0;">
          <span class="tag ${s.liveRuntimeAvailable?"ok":"warn"} tiny">${s.liveRuntimeAvailable?"Runtime en vivo disponible":"Modo plan (runtime no instalado)"}</span>
        </div>
        <div class="field"><textarea class="field-textarea" id="cu-instruction" rows="2" placeholder='Ej: "abr\xED los DMs y respond\xE9 al primero", "dale like y guard\xE1 el \xFAltimo post de @cuenta"'></textarea></div>
        <div class="btn-row">
          <button class="btn primary" id="cu-plan-btn">\u{1F4CB} Planificar acciones</button>
          <button class="btn ghost" id="cu-exec-btn">\u25B6 Ejecutar (seguro)</button>
        </div>
        <div id="cu-result"></div>
      </div>`;const a=i=>`
      <div class="talia-plan-box">
        <div class="meta">
          <span class="tag tiny">${t(i.surface)}</span>
          <span class="tag ${i.requiresApproval?"warn":"ok"} tiny">${i.requiresApproval?"requiere aprobaci\xF3n":"solo lectura"}</span>
          <span class="tag tiny">${i.actions.length} pasos</span>
        </div>
        <p class="tiny muted" style="margin:6px 0;">${t(i.notes)}</p>
        <div class="cu-step-list">
          ${i.actions.map(n=>`
            <div class="cu-step-row">
              <span class="cu-step-num">${n.step}</span>
              <span class="tag tiny">${t(n.gesture)}</span>
              <div style="flex:1;min-width:0;">
                <div class="small">${t(n.humanAction)}</div>
                <div class="tiny muted">target: ${t(n.targetLabel)}${n.text?` \xB7 texto: "${t(n.text)}"`:""}</div>
              </div>
            </div>`).join("")}
        </div>
        ${i.unresolved.length?`<div class="tiny muted" style="margin-top:6px;">No resuelto: ${i.unresolved.map(n=>t(n)).join(" \xB7 ")}</div>`:""}
      </div>`;e.querySelector("#cu-plan-btn")?.addEventListener("click",async i=>{const n=e.querySelector("#cu-instruction").value.trim();if(!n){c("Escrib\xED una instrucci\xF3n","warn");return}await m(i.currentTarget,"planificando\u2026",async()=>{try{const r=await d("/api/computer/plan",{method:"POST",body:{instruction:n}});e.querySelector("#cu-result").innerHTML=a(r)}catch(r){c("Error: "+r.message,"crit")}})}),e.querySelector("#cu-exec-btn")?.addEventListener("click",async i=>{const n=e.querySelector("#cu-instruction").value.trim();if(!n){c("Escrib\xED una instrucci\xF3n","warn");return}await m(i.currentTarget,"ejecutando\u2026",async()=>{try{const{plan:r,result:o}=await d("/api/computer/execute",{method:"POST",body:{instruction:n}});e.querySelector("#cu-result").innerHTML=a(r)+`
            <div class="talia-plan-box" style="margin-top:10px;">
              <div class="meta"><span class="tag ${o.completed?"ok":"warn"} tiny">${t(o.mode)}</span><span class="tag tiny">${o.steps.filter(l=>l.status==="ok"||l.status==="planned-only").length}/${o.steps.length} pasos</span></div>
              <div class="cu-step-list">
                ${o.steps.map(l=>`
                  <div class="cu-step-row">
                    <span class="tag ${l.status==="ok"?"ok":l.status==="failed"?"crit":""} tiny">${t(l.status)}</span>
                    <div style="flex:1;"><div class="small">${t(l.targetLabel)}</div><div class="tiny muted">${t(l.detail??"")}</div></div>
                  </div>`).join("")}
              </div>
            </div>`,c(`Ejecutado en modo ${o.mode}`,o.completed?"ok":"warn")}catch(r){c("Error: "+r.message,"crit")}})})}catch(s){e.innerHTML=`<div class="alert crit">Error: ${t(s.message)}</div>`}},T={completed:"ok",partial:"warn",failed:"crit"},P={completed:"ok",escalated:"warn",failed:"crit"},R={decision:"\u{1F9ED}",artifact:"\u{1F4E6}",risk:"\u26A0\uFE0F",metric:"\u{1F4CA}",fact:"\u2022"};let y=null;const N=e=>{const s=T[e.status]??"",a=e.steps.filter(i=>i.status==="completed").length;return`
    <div class="card mission-card swarm-mission" data-mission="${t(e.id)}" style="cursor:pointer;${e.id===y?"border-color:var(--accent);":""}">
      <div class="row spread">
        <div style="flex:1;min-width:0;">
          <div class="meta">
            <span class="tag ${s}">${t(e.status)}</span>
            <span class="tag accent tiny">${t(e.planSource)}</span>
            <span class="tag tiny">crew ${e.crew.length}</span>
            <span class="tiny muted">${u.rel(e.startedAt)}</span>
          </div>
          <h3 style="margin:6px 0 4px;">${t(e.objective.slice(0,90))}</h3>
          <div class="small">${a}/${e.steps.length} tareas OK \xB7 replans ${e.replans}</div>
        </div>
      </div>
    </div>`},F=(e,s)=>e?`
    <div class="card">
      <div class="meta">
        <span class="tag ${T[e.status]??""}">${t(e.status)}</span>
        <span class="tag accent tiny">${t(e.planSource)}</span>
        <span class="tiny muted">${t(e.id)}</span>
      </div>
      <h3 style="margin:6px 0;">${t(e.objective)}</h3>
      <p class="small muted" style="margin:0 0 8px;">${t(e.rationale||"")}</p>
      <div class="small" style="margin-bottom:4px;font-weight:700;">Crew</div>
      <div class="meta" style="margin-bottom:10px;">
        ${e.crew.map(a=>`<span class="tag tiny">${t(a.agentId)} \xB7 ${t(a.role)}</span>`).join("")||'<span class="tiny muted">\u2014</span>'}
      </div>
      <div class="small" style="margin-bottom:4px;font-weight:700;">Pasos (${e.steps.length})</div>
      <div class="cu-step-list">
        ${e.steps.map(a=>`
          <div class="cu-step-row">
            <span class="tag ${P[a.status]??""} tiny">${t(a.status)}</span>
            <div style="flex:1;min-width:0;">
              <div class="small">${t(a.taskId)} \u2192 ${t(a.agentId)} <span class="tiny muted">(${t(a.verdict)}, score ${a.score}, ${a.attempts} intento/s)</span></div>
              <div class="tiny muted">${t(a.note||"")}</div>
            </div>
          </div>`).join("")}
      </div>
      ${e.summary?`<div class="small muted" style="margin-top:8px;border-left:2px solid var(--border);padding-left:8px;white-space:pre-wrap;">${t(e.summary)}</div>`:""}
    </div>
    <div class="card" style="margin-top:10px;">
      <div class="small" style="font-weight:700;margin-bottom:6px;">\u{1F9E9} Pizarra compartida ${s?`(${s.entries.length})`:""}</div>
      ${!s||!s.entries.length?'<div class="tiny muted">Sin aportes todav\xEDa.</div>':`
        <div class="cu-step-list">
          ${s.entries.slice().reverse().slice(0,40).map(a=>`
            <div class="cu-step-row">
              <span class="tiny">${R[a.kind]??"\u2022"}</span>
              <div style="flex:1;min-width:0;">
                <div class="tiny"><b>${t(a.by)}</b> \xB7 ${t(a.label)}</div>
                <div class="tiny muted">${t(typeof a.value=="string"?a.value.slice(0,240):JSON.stringify(a.value).slice(0,240))}</div>
              </div>
            </div>`).join("")}
        </div>`}
    </div>`:'<div class="muted small">Seleccion\xE1 una misi\xF3n para ver su traza y pizarra en vivo.</div>',E=e=>{b();const s=y?`?id=${encodeURIComponent(y)}`:"";g=new EventSource(`/api/swarm/stream${s}`),g.addEventListener("swarm",a=>{let i;try{i=JSON.parse(a.data)}catch{return}const n=e.querySelector("#swarm-missions"),r=e.querySelector("#swarm-detail");n&&(n.innerHTML=i.missions.length?i.missions.map(N).join(""):'<div class="card" style="text-align:center;padding:24px;"><div class="muted">Sin misiones aut\xF3nomas todav\xEDa.</div></div>',n.querySelectorAll("[data-mission]").forEach(o=>{o.addEventListener("click",()=>{y=o.dataset.mission,E(e)})})),r&&(r.innerHTML=F(i.detail,i.board))}),g.onerror=()=>{}},B=async e=>{e.innerHTML=`
    <div class="card mission-launch-card">
      <h3 style="margin:0 0 6px;">\u{1F41D} Misi\xF3n aut\xF3noma de punta a punta</h3>
      <p class="small muted" style="margin:0 0 10px;">El framework orquestador arma la crew, planifica el DAG, ejecuta en paralelo, autoeval\xFAa con un cr\xEDtico y replanifica si hace falta. Respeta los checkpoints humanos.</p>
      <textarea id="swarm-objetivo" class="input" rows="2" placeholder="Ej: Sub\xED 1 carrusel por d\xEDa esta semana con su estrategia y CTA"></textarea>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn primary" id="swarm-launch">\u{1F680} Lanzar misi\xF3n</button>
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <div class="row spread" style="align-items:center;">
        <div><b>\u{1F465} Director de Operaciones 24/7</b><div class="tiny muted">Departamentos que trabajan en segundo plano con cooldown propio.</div></div>
        <button class="btn ghost tiny" id="swarm-ops-run">\u25B6 Correr ciclo ahora</button>
      </div>
      <div id="swarm-ops" class="meta" style="margin-top:8px;"><span class="tiny muted">cargando\u2026</span></div>
    </div>
    <div class="row" style="gap:14px;align-items:flex-start;margin-top:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:260px;">
        <div class="autopilot-section-head"><h3 style="margin:0;">Misiones (en vivo)</h3></div>
        <div id="swarm-missions">${h()}</div>
      </div>
      <div style="flex:1.4;min-width:300px;">
        <div class="autopilot-section-head"><h3 style="margin:0;">Traza + pizarra</h3></div>
        <div id="swarm-detail"><div class="muted small">Seleccion\xE1 una misi\xF3n para ver su traza y pizarra en vivo.</div></div>
      </div>
    </div>`,e.querySelector("#swarm-launch")?.addEventListener("click",async a=>{const i=e.querySelector("#swarm-objetivo").value.trim();if(!i){c("Escrib\xED un objetivo","warn");return}await m(a.currentTarget,"lanzando\u2026",async()=>{try{await d("/api/swarm/mission",{method:"POST",body:{objetivo:i}}),c("Misi\xF3n aut\xF3noma en marcha \u{1F41D}","ok"),e.querySelector("#swarm-objetivo").value=""}catch(n){c("Error: "+n.message,"crit")}})});const s=async()=>{try{const a=await d("/api/swarm/operations"),i=e.querySelector("#swarm-ops");if(!i)return;const n=Date.now();i.innerHTML=a.map(r=>{const o=!r.nextEligibleAt||Date.parse(r.nextEligibleAt)<=n;return`<span class="tag ${o?"ok":""} tiny" title="${r.lastRunAt?"\xDAltimo: "+u.rel(r.lastRunAt):"Nunca corri\xF3"}">${t(r.label)} \xB7 ${o?"listo":"cooldown"}</span>`}).join("")}catch{}};e.querySelector("#swarm-ops-run")?.addEventListener("click",async a=>{await m(a.currentTarget,"corriendo\u2026",async()=>{try{await d("/api/swarm/operations/run",{method:"POST",body:{}}),c("Ciclo de operaciones lanzado \u{1F465}","ok"),setTimeout(s,1500)}catch(i){c("Error: "+i.message,"crit")}})}),await s(),E(e)},x=[{id:"launch",label:"\u{1F680} Lanzar",render:M},{id:"talia",label:"\u{1F469}\u200D\u{1F4BC} Tal\xEDa",render:O},{id:"computer",label:"\u{1F5A5} Computer Use",render:D},{id:"swarm",label:"\u{1F41D} Aut\xF3nomo",render:B},{id:"missions",label:"\u{1F3AF} Misiones",render:w},{id:"traces",label:"\u{1F9E0} Trazas",render:A},{id:"knowledge",label:"\u{1F4D6} Conocimiento",render:q},{id:"bus",label:"\u{1F4E1} Bus",render:C}],f=async e=>{const s=e.querySelector("#mission-content");if(!s)return;b(),v!=="swarm"&&(y=null);const a=x.find(i=>i.id===v)??x[0];s.innerHTML=h(),await a.render(s)};export const renderMission=async e=>{v="launch",e.innerHTML=`
    <!-- HERO: comando central revolucionario -->
    <div class="mc-cockpit">
      <div class="mc-cockpit-bg"></div>
      <div class="mc-cockpit-content">
        <div class="mc-eyebrow">
          <span class="mc-radar"></span>
          MISSION CONTROL \xB7 sistema multi-agente
        </div>
        <h1 class="mc-title">\xBFCu\xE1l es tu pr\xF3xima <span class="mc-grad">misi\xF3n</span>?</h1>
        <p class="mc-sub">Escrib\xED un objetivo en una sola frase. El sistema lo descompone en pasos, asigna a los agentes correctos y los ejecuta. Vos solo aprob\xE1s.</p>

        <!-- Input gigante estilo Spotlight -->
        <div class="mc-command-box">
          <span class="mc-cmd-icon">\u{1F3AF}</span>
          <textarea id="mc-goal-input" placeholder="Ej: 'Lanzar mi curso de IA con 5 d\xEDas de teaser, 3 reels educativos y vender 20 cupos en 7 d\xEDas'" rows="2"></textarea>
          <button class="btn primary mc-launch-btn" id="mc-launch-btn">\u{1F680} Descomponer y ejecutar</button>
        </div>

        <!-- Decomposition output: aparece cuando se lanza -->
        <div id="mc-decomposition" class="mc-decomposition" hidden></div>

        <!-- Templates -->
        <div class="mc-templates">
          <div class="mc-templates-label">O empez\xE1 con una misi\xF3n pre-armada:</div>
          <div class="mc-templates-grid">
            ${j.map(a=>`
              <button class="mc-template" data-goal="${t(a.goal)}">
                <span class="mc-template-emoji">${a.emoji}</span>
                <span class="mc-template-title">${t(a.title)}</span>
              </button>`).join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs avanzados (misiones activas, traces, knowledge, bus) -->
    <div class="page-toolbar" style="margin-top:22px;">
      <h3 style="margin:0 0 10px;font-size:13px;color:var(--text-muted,#9CA3AF);text-transform:uppercase;letter-spacing:.05em;font-weight:700;">\u{1F4CA} Operaciones avanzadas</h3>
      <div class="page-toolbar-tabs">
        ${x.map(a=>`
          <button class="tool-tab-btn ${a.id===v?"active":""}" data-tab="${a.id}">${t(a.label)}</button>
        `).join("")}
      </div>
    </div>
    <div id="mission-content" class="page-body">${h()}</div>

    <style data-v="mc-v3">
      /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 Mission Control v3 \xB7 Vercel-grade \xB7 MAX CONTRAST \xB7 THEME-AWARE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
         Uso !important para ganar sobre cualquier regla legacy de style.css.
         Tokens: --text-primary (#f5f5f5 dark / #16171c light), --bg-elevated, etc. */
      .mc-cockpit {
        position: relative !important;
        padding: 40px 32px !important;
        border-radius: 18px !important;
        background: var(--bg-elevated, #0a0a0a) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.10)) !important;
        overflow: hidden !important;
        margin-bottom: 12px !important;
        font-feature-settings: "tnum" 1, "ss01" 1 !important;
        letter-spacing: -0.011em !important;
        background-image: none !important;
      }
      .mc-cockpit-bg {
        position: absolute !important; inset: 0 !important; pointer-events: none !important;
        background: none !important;
        background-image: radial-gradient(circle, rgba(127,127,127,.10) 1px, transparent 1px) !important;
        background-size: 22px 22px !important;
        opacity: .55 !important;
      }
      .mc-cockpit-content { position: relative !important; z-index: 1 !important; }
      .mc-eyebrow {
        display: inline-flex !important; align-items: center !important; gap: 8px !important;
        font-size: 10.5px !important; font-weight: 700 !important; letter-spacing: .14em !important;
        color: var(--text-secondary, #d4d4d8) !important;
        text-transform: uppercase !important; margin-bottom: 16px !important;
        opacity: 1 !important;
      }
      .mc-radar {
        display: inline-block !important; width: 7px !important; height: 7px !important;
        border-radius: 50% !important;
        background: #10b981 !important; box-shadow: 0 0 10px rgba(16,185,129,.7) !important;
        animation: mcRadar 1.8s ease-in-out infinite !important;
      }
      @keyframes mcRadar { 0%,100% { opacity: .6; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.15); } }

      /* \u2500\u2500\u2500 TITLE: cero gradient transparente. Color s\xF3lido alto contraste \u2500\u2500\u2500 */
      .mc-title {
        font-size: 40px !important; font-weight: 700 !important;
        margin: 0 0 14px !important; line-height: 1.04 !important;
        letter-spacing: -.04em !important;
        color: var(--text-primary, #f5f5f5) !important;
        -webkit-text-fill-color: var(--text-primary, #f5f5f5) !important;
        background: none !important; background-image: none !important;
        -webkit-background-clip: border-box !important; background-clip: border-box !important;
      }
      .mc-grad {
        color: var(--text-tertiary, #a1a1aa) !important;
        -webkit-text-fill-color: var(--text-tertiary, #a1a1aa) !important;
        background: none !important; background-image: none !important;
        -webkit-background-clip: border-box !important; background-clip: border-box !important;
        font-weight: 700 !important;
      }
      .mc-sub {
        font-size: 15px !important;
        color: var(--text-secondary, #d4d4d8) !important;
        margin: 0 0 24px !important; max-width: 64ch !important; line-height: 1.55 !important;
        opacity: 1 !important;
      }

      /* \u2500\u2500\u2500 Command box \u2500\u2500\u2500 */
      .mc-command-box {
        display: flex !important; align-items: stretch !important; gap: 0 !important;
        padding: 6px !important;
        background: var(--bg-card-2, #0f0f0f) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.12)) !important;
        border: 0 !important; border-radius: 12px !important;
        transition: box-shadow .15s !important; margin-bottom: 24px !important;
      }
      .mc-command-box:focus-within {
        box-shadow: inset 0 0 0 1px var(--border-focus, rgba(255,255,255,.22)),
                    0 0 0 4px rgba(127,127,127,.08) !important;
      }
      .mc-cmd-icon {
        font-size: 18px !important; padding: 14px 10px 0 14px !important;
        flex-shrink: 0 !important; color: var(--text-tertiary, #a1a1aa) !important;
      }
      #mc-goal-input {
        flex: 1 !important; background: transparent !important; border: 0 !important;
        color: var(--text-primary, #f5f5f5) !important;
        padding: 14px 12px !important; font-size: 15px !important;
        outline: none !important; resize: none !important;
        font-family: inherit !important; line-height: 1.5 !important; min-height: 56px !important;
        letter-spacing: -.01em !important; font-weight: 500 !important;
      }
      #mc-goal-input::placeholder { color: var(--text-tertiary, #a1a1aa) !important; opacity: 1 !important; }

      /* \u2500\u2500\u2500 Launch button: pure white-on-bg, no rosa-fuchsia \u2500\u2500\u2500 */
      .mc-launch-btn {
        flex-shrink: 0 !important; border-radius: 10px !important;
        padding: 0 18px !important; height: auto !important;
        font-size: 13px !important; font-weight: 600 !important;
        background: var(--text-primary, #f5f5f5) !important;
        color: var(--bg-elevated, #0a0a0a) !important;
        border: 0 !important; box-shadow: none !important;
        background-image: none !important;
        letter-spacing: -.005em !important;
      }
      .mc-launch-btn:hover { opacity: .9 !important; }

      /* \u2500\u2500\u2500 Decomposition \u2500\u2500\u2500 */
      .mc-decomposition {
        margin-bottom: 24px !important; padding: 20px !important;
        background: var(--bg-card-2, #0f0f0f) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.10)) !important;
        border: 0 !important; border-radius: 14px !important;
        background-image: none !important;
      }
      .mc-decomposition.mc-show { animation: mcSlideIn .3s ease; }
      @keyframes mcSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .mc-decomp-head { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 14px !important; flex-wrap: wrap !important; gap: 10px !important; }
      .mc-decomp-head h4 { margin: 0 !important; font-size: 14px !important; color: var(--text-primary, #f5f5f5) !important; letter-spacing: -.015em !important; font-weight: 700 !important; }
      .mc-steps { display: flex !important; flex-direction: column !important; gap: 6px !important; }
      .mc-step {
        display: flex !important; gap: 12px !important; align-items: center !important;
        padding: 12px 14px !important;
        background: var(--bg-elevated, #0a0a0a) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.08)) !important;
        border: 0 !important; border-radius: 9px !important; position: relative !important;
      }
      .mc-step-num {
        width: 22px !important; height: 22px !important; border-radius: 50% !important;
        background: var(--text-primary, #f5f5f5) !important;
        color: var(--bg-elevated, #0a0a0a) !important;
        font-size: 11px !important; font-weight: 700 !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        flex-shrink: 0 !important; font-variant-numeric: tabular-nums !important;
        background-image: none !important;
      }
      .mc-step-emoji { font-size: 18px !important; flex-shrink: 0 !important; }
      .mc-step-body { flex: 1 !important; min-width: 0 !important; }
      .mc-step-task { font-weight: 600 !important; font-size: 13px !important; color: var(--text-primary, #f5f5f5) !important; letter-spacing: -.005em !important; }
      .mc-step-meta { font-size: 11px !important; color: var(--text-tertiary, #a1a1aa) !important; margin-top: 2px !important; }
      .mc-step-eta { font-size: 11px !important; color: var(--text-secondary, #d4d4d8) !important; font-weight: 600 !important; flex-shrink: 0 !important; font-variant-numeric: tabular-nums !important; }

      /* \u2500\u2500\u2500 Templates label + grid: t\xEDtulos visibles SI O SI \u2500\u2500\u2500 */
      .mc-templates-label {
        font-size: 10.5px !important; color: var(--text-secondary, #d4d4d8) !important;
        margin-bottom: 12px !important; font-weight: 700 !important;
        text-transform: uppercase !important; letter-spacing: .14em !important;
        opacity: 1 !important;
      }
      .mc-templates-grid {
        display: grid !important; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important; gap: 6px !important;
      }
      .mc-template {
        display: flex !important; align-items: center !important; gap: 10px !important;
        padding: 11px 14px !important;
        background: var(--bg-card-2, #0f0f0f) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.10)) !important;
        border: 0 !important; border-radius: 10px !important;
        cursor: pointer !important;
        color: var(--text-primary, #f5f5f5) !important;
        text-align: left !important; transition: box-shadow .15s, background .15s !important;
        font-family: inherit !important;
        background-image: none !important;
      }
      .mc-template:hover {
        box-shadow: inset 0 0 0 1px var(--border-focus, rgba(255,255,255,.22)) !important;
        background: var(--bg-hover, rgba(255,255,255,.05)) !important;
      }
      .mc-template-emoji { font-size: 18px !important; flex-shrink: 0 !important; }
      .mc-template-title {
        font-size: 13px !important; font-weight: 600 !important;
        color: var(--text-primary, #f5f5f5) !important;
        -webkit-text-fill-color: var(--text-primary, #f5f5f5) !important;
        letter-spacing: -.005em !important; opacity: 1 !important;
      }

      @media (max-width: 640px){
        .mc-cockpit { padding: 26px 18px !important; }
        .mc-title { font-size: 28px !important; }
        .mc-command-box { flex-direction: column !important; }
        .mc-launch-btn { margin-top: 6px !important; }
      }
    </style>`;const s=async a=>{if(!a||!a.trim()){c("Escrib\xED tu misi\xF3n primero","warn");return}const i=e.querySelector("#mc-decomposition");i.hidden=!1,i.classList.add("mc-show"),i.innerHTML='<div style="text-align:center;padding:20px;"><span class="spinner lg"></span><div class="small muted" style="margin-top:8px;">Descomponiendo en pasos\u2026</div></div>';const{data:n,error:r}=await $("/api/missions/decompose",null,{method:"POST",body:{goal:a.trim()}}),o=(n?.steps?.length?n.steps:L(a)).map((l,p)=>({...l,n:p+1}));i.innerHTML=`
      <div class="mc-decomp-head">
        <h4>\u{1F4CB} Plan generado \xB7 ${o.length} pasos</h4>
        ${r?'<span class="tag tiny warn">descomposici\xF3n local</span>':'<span class="tag tiny ok">backend conectado</span>'}
      </div>
      <div class="mc-steps">
        ${o.map(l=>`
          <div class="mc-step">
            <span class="mc-step-num">${l.n}</span>
            <span class="mc-step-emoji">${l.emoji}</span>
            <div class="mc-step-body">
              <div class="mc-step-task">${t(l.task)}</div>
              <div class="mc-step-meta">@${t(l.agent)}</div>
            </div>
            <span class="mc-step-eta">${t(l.eta??"\u2014")}</span>
          </div>`).join("")}
      </div>
      <div class="btn-row" style="margin-top:14px;gap:8px;">
        <button class="btn primary" id="mc-approve-all">\u2705 Aprobar y ejecutar todo</button>
        <button class="btn ghost" id="mc-edit">\u270F\uFE0F Editar misi\xF3n</button>
        <button class="btn ghost" id="mc-discard">\u{1F5D1} Descartar</button>
      </div>
    `,i.querySelector("#mc-approve-all").addEventListener("click",async()=>{const{error:l}=await $("/api/missions/launch",null,{method:"POST",body:{freeIntent:a,runNow:!0}});l?c(`\u{1F680} Misi\xF3n registrada localmente \xB7 ${o.length} pasos. Se ejecuta cuando vuelva el backend.`,"info"):c(`\u{1F680} \xA1Misi\xF3n lanzada! ${o.length} agentes trabajando.`,"ok"),v="missions",e.querySelectorAll(".tool-tab-btn").forEach(p=>p.classList.toggle("active",p.dataset.tab==="missions")),await f(e)}),i.querySelector("#mc-edit").addEventListener("click",()=>{i.hidden=!0,e.querySelector("#mc-goal-input")?.focus()}),i.querySelector("#mc-discard").addEventListener("click",()=>{i.hidden=!0;const l=e.querySelector("#mc-goal-input");l&&(l.value="")})};e.querySelector("#mc-launch-btn")?.addEventListener("click",()=>{const a=e.querySelector("#mc-goal-input")?.value;s(a)}),e.querySelector("#mc-goal-input")?.addEventListener("keydown",a=>{a.key==="Enter"&&(a.ctrlKey||a.metaKey)&&(a.preventDefault(),s(a.target.value))}),e.querySelectorAll(".mc-template").forEach(a=>{a.addEventListener("click",()=>{const i=a.dataset.goal,n=e.querySelector("#mc-goal-input");n&&(n.value=i),s(i)})}),e.querySelectorAll(".tool-tab-btn").forEach(a=>{a.addEventListener("click",async()=>{v=a.dataset.tab,e.querySelectorAll(".tool-tab-btn").forEach(i=>i.classList.toggle("active",i===a)),await f(e)})}),await f(e)};
