import{api as v}from"../lib/api.js";import{escape as s}from"../lib/dom.js";import{toast as r}from"../lib/toast.js";import{SUPPORTED_LANGS as h,getLang as C,setLang as T,t as p}from"../lib/i18n.js";import{getConfig as L,setConfig as b,getVoices as A,speak as M,isSupported as E}from"../lib/voice.js";let c={section:"accounts",connections:{},automations:[],brand:null,apiKeys:{}};const q=[{id:"accounts",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',label:"Cuentas"},{id:"apikeys",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',label:"API Keys"},{id:"consumo",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/><path d="M7 17l4-6 4 3 6-9"/></svg>',label:"Consumo"},{id:"automations",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',label:"Automatizaciones"},{id:"brand",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',label:"Perfil de Marca"},{id:"notifications",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',label:"Notificaciones"},{id:"voice",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>',label:"Voz e idioma"}],P=()=>{const t=L(),a=C(),e=E(),i=A(),n=(h.find(l=>l.code===a)??h[0]).speech,o=i.filter(l=>l.lang&&l.lang.toLowerCase().startsWith(a)),d=(o.length?o:i).map(l=>`<option value="${s(l.voiceURI)}" ${l.voiceURI===t.voiceURI?"selected":""}>${s(l.name)} (${s(l.lang)})</option>`).join("");return`
    <div class="settings-section" id="section-voice">
      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:6px;">\u{1F310} ${s(p("settings.language"))}</h3>
        <p class="small muted" style="margin-bottom:14px;">El idioma afecta la interfaz, el reconocimiento de voz y c\xF3mo responde FeedIA.</p>
        <div class="lang-pills" id="lang-pills">
          ${h.map(l=>`
            <button class="lang-pill ${l.code===a?"active":""}" data-lang="${l.code}">
              <span>${l.flag}</span> ${s(l.label)}
            </button>`).join("")}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px;">\u{1F399} ${s(p("settings.voice"))}</h3>
        ${e?"":`<div class="alert crit" style="margin-bottom:14px;">${s(p("voice.notSupported"))}</div>`}
        <p class="small muted" style="margin-bottom:18px;">FeedIA usa la Web Speech API del navegador: sin tokens, sin costo, ilimitado. Dec\xED <strong>"${s(p("voice.wake"))}"</strong> y empez\xE1 a hablar.</p>

        <div class="list-inner" style="border:1px solid var(--border-soft);border-radius:var(--radius-lg);margin-bottom:18px;">
          <div class="automation-row">
            <div class="automation-info">
              <div class="automation-name">${s(p("settings.voiceEnabled"))}</div>
              <div class="automation-desc">Escucha continua en segundo plano para activarse con la palabra clave.</div>
            </div>
            <div class="automation-control">${y("voice-wake-toggle",t.wakeEnabled,!e)}</div>
          </div>
          <div class="automation-row">
            <div class="automation-info">
              <div class="automation-name">${s(p("settings.ttsEnabled"))}</div>
              <div class="automation-desc">FeedIA lee sus respuestas en voz alta con voz humana.</div>
            </div>
            <div class="automation-control">${y("voice-tts-toggle",t.ttsEnabled)}</div>
          </div>
        </div>

        <div class="voice-settings-grid">
          <div class="field-group">
            <label class="field-label">${s(p("settings.voicePick"))}</label>
            <select class="input" id="voice-pick">
              <option value="">Auto (mejor para el idioma)</option>
              ${d}
            </select>
          </div>
          <div class="voice-range-row">
            <label>${s(p("settings.rate"))}</label>
            <input type="range" id="voice-rate" min="0.6" max="1.6" step="0.02" value="${t.rate}">
            <span id="voice-rate-val" class="small muted">${t.rate.toFixed(2)}\xD7</span>
          </div>
          <div class="voice-range-row">
            <label>${s(p("settings.pitch"))}</label>
            <input type="range" id="voice-pitch" min="0.6" max="1.6" step="0.02" value="${t.pitch}">
            <span id="voice-pitch-val" class="small muted">${t.pitch.toFixed(2)}</span>
          </div>
          <div class="btn-row">
            <button class="btn primary small" id="voice-test-btn">\u25B6 ${s(p("settings.test"))}</button>
            <button class="btn ghost small" id="voice-open-btn">\u{1F399} ${s(p("voice.openMic"))}</button>
          </div>
        </div>
      </div>
    </div>`},z=(t,a)=>{a.querySelectorAll("[data-lang]").forEach(k=>{k.addEventListener("click",()=>{T(k.dataset.lang),c.section="voice",g(t)})});const e=a.querySelector("#voice-wake-toggle");e?.addEventListener("change",()=>{e.checked?(window.__feediaVoice?.enableWake(),r('Voz manos libres activada \u2014 dec\xED "'+p("voice.wake")+'"',"ok")):(window.__feediaVoice?.disableWake(),r("Voz manos libres desactivada","info"))});const i=a.querySelector("#voice-tts-toggle");i?.addEventListener("change",()=>b({ttsEnabled:i.checked}));const n=a.querySelector("#voice-pick");n?.addEventListener("change",()=>b({voiceURI:n.value}));const o=a.querySelector("#voice-rate"),d=a.querySelector("#voice-rate-val");o?.addEventListener("input",()=>{b({rate:Number(o.value)}),d&&(d.textContent=Number(o.value).toFixed(2)+"\xD7")});const l=a.querySelector("#voice-pitch"),u=a.querySelector("#voice-pitch-val");l?.addEventListener("input",()=>{b({pitch:Number(l.value)}),u&&(u.textContent=Number(l.value).toFixed(2))}),a.querySelector("#voice-test-btn")?.addEventListener("click",()=>{M(p("voice.greeting"))}),a.querySelector("#voice-open-btn")?.addEventListener("click",()=>{window.__feediaVoice?.open()})},y=(t,a,e=!1)=>`
  <label class="toggle-switch">
    <input class="toggle-input" type="checkbox" id="${t}" ${a?"checked":""} ${e?"disabled":""}>
    <span class="toggle-track"></span>
  </label>`,w=()=>{const t=c.connections.instagram??{},a=c.connections.tiktok??{},e=c.connections.canva??{},i=c.connections.meta??{};return`
    <div class="settings-section" id="section-accounts">
      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo instagram">\u{1F4F7}</div>
          <div class="connection-info">
            <div class="connection-name">Instagram</div>
            <div class="connection-desc">Publica, programa y analiza tu cuenta de Instagram</div>
          </div>
          <div class="connection-status">
            ${t.connected?'<div class="connected">Conectado</div>':'<div class="disconnected">No conectado</div>'}
          </div>
        </div>
        ${t.connected?`
          <div class="connection-body">
            <div class="connection-stats">
              <div class="connection-stat">
                <div class="connection-stat-num">${s(t.username??"@\u2014")}</div>
                <div class="connection-stat-label">Usuario</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${(t.followers??0).toLocaleString()}</div>
                <div class="connection-stat-label">Seguidores</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${t.mediaCount??0}</div>
                <div class="connection-stat-label">Publicaciones</div>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn ghost small" id="ig-reconnect-btn">\u{1F504} Reconectar</button>
              <button class="btn ghost small crit" id="ig-disconnect-btn">\u2715 Desconectar</button>
            </div>
          </div>`:`
          <div class="connection-body">
            <p class="small muted">Conect\xE1 tu cuenta para publicar directamente, programar posts y ver m\xE9tricas reales.</p>
            <button class="btn gradient" id="ig-connect-btn">
              <span style="font-size:16px;">\u{1F4F7}</span> Conectar Instagram
            </button>
          </div>`}
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo tiktok" style="background:#010101;">\u{1F3B5}</div>
          <div class="connection-info">
            <div class="connection-name">TikTok</div>
            <div class="connection-desc">Publica videos, foto-carruseles y analiza tu cuenta TikTok</div>
          </div>
          <div class="connection-status">
            ${a.connected?'<div class="connected">Conectado</div>':'<div class="disconnected">No conectado</div>'}
          </div>
        </div>
        ${a.connected?`
          <div class="connection-body">
            <div class="connection-stats">
              <div class="connection-stat">
                <div class="connection-stat-num">${s(a.username??"@\u2014")}</div>
                <div class="connection-stat-label">Usuario</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${(a.followers??0).toLocaleString()}</div>
                <div class="connection-stat-label">Seguidores</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${a.videoCount??0}</div>
                <div class="connection-stat-label">Videos</div>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn ghost small" id="tt-reconnect-btn">\u{1F504} Reconectar</button>
              <button class="btn ghost small crit" id="tt-disconnect-btn">\u2715 Desconectar</button>
            </div>
          </div>`:`
          <div class="connection-body">
            <p class="small muted">Conect\xE1 tu cuenta para publicar videos 9:16, photo sets y ver m\xE9tricas reales.</p>
            <button class="btn" style="background:linear-gradient(135deg,#010101,#FE2C55);color:#fff;" id="tt-connect-btn">
              <span style="font-size:16px;">\u{1F3B5}</span> Conectar TikTok
            </button>
          </div>`}
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo canva">\u{1F3A8}</div>
          <div class="connection-info">
            <div class="connection-name">Canva</div>
            <div class="connection-desc">Gener\xE1 y export\xE1 dise\xF1os desde el Studio directamente</div>
          </div>
          <div class="connection-status">
            ${e.connected?'<div class="connected">Conectado</div>':'<div class="disconnected">No conectado</div>'}
          </div>
        </div>
        ${e.connected?`
          <div class="connection-body">
            <div class="connection-stats">
              <div class="connection-stat">
                <div class="connection-stat-num">${s(e.teamName??"\u2014")}</div>
                <div class="connection-stat-label">Equipo</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${e.designsCreated??0}</div>
                <div class="connection-stat-label">Dise\xF1os creados</div>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn ghost small" id="canva-reconnect-btn">\u{1F504} Reconectar</button>
              <button class="btn ghost small crit" id="canva-disconnect-btn">\u2715 Desconectar</button>
            </div>
          </div>`:`
          <div class="connection-body">
            <p class="small muted">Conect\xE1 Canva para renderizar carruseles, reels y stories con tus plantillas de marca.</p>
            <button class="btn" style="background:linear-gradient(135deg,#8957e5,#00c4cc);color:#fff;" id="canva-connect-btn">
              <span style="font-size:16px;">\u{1F3A8}</span> Conectar Canva
            </button>
          </div>`}
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo meta">\u{1F4BC}</div>
          <div class="connection-info">
            <div class="connection-name">Meta Business Suite</div>
            <div class="connection-desc">Acceso a m\xE9tricas avanzadas, Ads y gesti\xF3n de p\xE1ginas</div>
          </div>
          <div class="connection-status">
            ${i.connected?'<div class="connected">Conectado</div>':'<div class="disconnected">No conectado</div>'}
          </div>
        </div>
        <div class="connection-body">
          ${i.connected?`
            <div class="btn-row">
              <button class="btn ghost small crit" id="meta-disconnect-btn">\u2715 Desconectar</button>
            </div>`:`
            <p class="small muted">Requerido para programaci\xF3n avanzada, anuncios y an\xE1lisis de audiencia profundo.</p>
            <button class="btn ghost" id="meta-connect-btn">
              <span style="font-size:16px;">\u{1F4BC}</span> Conectar Meta
            </button>`}
        </div>
      </div>
    </div>`},j=()=>`
  <div class="settings-section" id="section-apikeys">
    <div class="card">
      <h3 style="margin-bottom:6px;">\u{1F916} Modelos de IA</h3>
      <p class="small muted" style="margin-bottom:20px;">Las claves se guardan localmente en el servidor. Nunca se transmiten al cliente.</p>

      <div class="connection-card" style="margin-bottom:14px;">
        <div class="connection-header">
          <div class="connection-logo openai">\u2728</div>
          <div class="connection-info">
            <div class="connection-name">OpenAI</div>
            <div class="connection-desc">GPT-4o para generaci\xF3n de im\xE1genes y embeddings</div>
          </div>
          <div class="connection-status">
            ${c.apiKeys.openai?'<div class="connected">Configurado</div>':'<div class="disconnected">Sin configurar</div>'}
          </div>
        </div>
        <div class="connection-body">
          <div class="field-group">
            <label class="field-label">API Key</label>
            <div class="api-key-field">
              <input class="input" type="password" id="openai-key" placeholder="sk-\u2026" value="${s(c.apiKeys.openai??"")}">
              <button class="api-key-toggle" data-target="openai-key" title="Mostrar/ocultar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button class="btn primary small" data-save-key="openai">Guardar</button>
        </div>
      </div>

      <div class="connection-card" style="margin-bottom:14px;">
        <div class="connection-header">
          <div class="connection-logo replicate">\u{1F52E}</div>
          <div class="connection-info">
            <div class="connection-name">Replicate</div>
            <div class="connection-desc">Flux, SDXL y otros modelos de imagen</div>
          </div>
          <div class="connection-status">
            ${c.apiKeys.replicate?'<div class="connected">Configurado</div>':'<div class="disconnected">Sin configurar</div>'}
          </div>
        </div>
        <div class="connection-body">
          <div class="field-group">
            <label class="field-label">API Token</label>
            <div class="api-key-field">
              <input class="input" type="password" id="replicate-key" placeholder="r8_\u2026" value="${s(c.apiKeys.replicate??"")}">
              <button class="api-key-toggle" data-target="replicate-key" title="Mostrar/ocultar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button class="btn primary small" data-save-key="replicate">Guardar</button>
        </div>
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo" style="background:linear-gradient(135deg,#f09433,#bc1888);">\u{1F9E0}</div>
          <div class="connection-info">
            <div class="connection-name">Anthropic (Claude)</div>
            <div class="connection-desc">Motor principal del agente IA</div>
          </div>
          <div class="connection-status">
            ${c.apiKeys.anthropic?'<div class="connected">Configurado</div>':'<div class="disconnected">Sin configurar</div>'}
          </div>
        </div>
        <div class="connection-body">
          <div class="field-group">
            <label class="field-label">API Key</label>
            <div class="api-key-field">
              <input class="input" type="password" id="anthropic-key" placeholder="sk-ant-\u2026" value="${s(c.apiKeys.anthropic??"")}">
              <button class="api-key-toggle" data-target="anthropic-key" title="Mostrar/ocultar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button class="btn primary small" data-save-key="anthropic">Guardar</button>
        </div>
      </div>
    </div>
  </div>`,f={"bot-cycle":{icon:"\u{1F916}",name:"Bot de respuestas",desc:"Responde autom\xE1ticamente a DMs y comentarios seg\xFAn el contexto"},"digest-diario":{icon:"\u{1F4F0}",name:"Digest diario",desc:"Resumen de m\xE9tricas, tendencias y sugerencias cada ma\xF1ana"},"curator-fetch":{icon:"\u{1F50D}",name:"Curaci\xF3n de contenido",desc:"Busca y clasifica contenido relevante de tus fuentes"},"reel-weekly":{icon:"\u{1F3AC}",name:"Reel semanal autom\xE1tico",desc:"Genera gui\xF3n + storyboard de un reel cada semana"},"ugc-scan":{icon:"\u{1F4F8}",name:"Scanner de UGC",desc:"Detecta menciones y contenido de usuarios para reposts"},"crisis-watch":{icon:"\u{1F6E1}\uFE0F",name:"Monitoreo de crisis",desc:"Eval\xFAa reputaci\xF3n en tiempo real y pausa si detecta riesgo"},"competitor-spy":{icon:"\u{1F440}",name:"An\xE1lisis de competencia",desc:"Monitorea competidores y detecta oportunidades de contenido"},"hashtag-trends":{icon:"\u{1F4C8}",name:"Tendencias de hashtags",desc:"Actualiza tu banco de hashtags seg\xFAn lo que rankea hoy"}},I=()=>{const t=c.automations.length?c.automations:Object.keys(f).map(a=>({id:a,enabled:!1,lastRun:null,nextRun:null}));return`
    <div class="settings-section" id="section-automations">
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3>\u26A1 Automatizaciones activas</h3>
          <span class="tag ok">${t.filter(a=>a.enabled).length} activas</span>
        </div>
        <div class="list-inner" style="border:1px solid var(--border-soft);border-radius:var(--radius-lg);">
          ${t.map(a=>{const e=f[a.id]??{icon:"\u2699\uFE0F",name:a.id,desc:""};return`
              <div class="automation-row">
                <div class="automation-icon">${e.icon}</div>
                <div class="automation-info">
                  <div class="automation-name">${s(e.name)}</div>
                  <div class="automation-desc">${s(e.desc)}</div>
                  ${a.lastRun?`<div class="tiny muted" style="margin-top:3px;">\xDAltima ejecuci\xF3n: ${new Date(a.lastRun).toLocaleString("es-AR")}</div>`:""}
                </div>
                <div class="automation-control">
                  ${y(`auto-${a.id}`,a.enabled)}
                </div>
              </div>`}).join("")}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px;">\u{1F550} Programaci\xF3n global</h3>
        <div class="field-row" style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
          <div class="field-group" style="flex:1;min-width:160px;">
            <label class="field-label">Zona horaria</label>
            <select class="input" id="timezone-select">
              <option value="America/Argentina/Buenos_Aires" selected>Buenos Aires (UTC-3)</option>
              <option value="America/New_York">New York (UTC-5)</option>
              <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
              <option value="Europe/Madrid">Madrid (UTC+1)</option>
              <option value="Europe/London">London (UTC+0)</option>
            </select>
          </div>
          <div class="field-group" style="flex:1;min-width:160px;">
            <label class="field-label">Hora del digest diario</label>
            <input class="input" type="time" id="digest-time" value="08:00">
          </div>
          <button class="btn primary" id="save-schedule-btn">Guardar horario</button>
        </div>
      </div>
    </div>`},U=()=>{const t=c.brand??{},a=t.voice??{},e=t.visual??{},i=a.tone??[],n=e.palette??[];return`
    <div class="settings-section" id="section-brand">
      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:20px;">\u{1F3F7}\uFE0F Identidad de marca</h3>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Nombre de marca</label>
          <input class="input" id="brand-name" value="${s(t.name??"")}" placeholder="Ej: Somos Paithon Labs">
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Nicho / Industria</label>
          <input class="input" id="brand-niche" value="${s(t.niche??"")}" placeholder="Ej: Tecnolog\xEDa, Salud, Moda\u2026">
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Handle de Instagram</label>
          <input class="input" id="brand-handle" value="${s(t.handle??"")}" placeholder="@tuusuario">
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Bio / Descripci\xF3n</label>
          <textarea class="input" id="brand-bio" rows="3" placeholder="Describ\xED tu marca en 2-3 oraciones\u2026">${s(t.bio??"")}</textarea>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:20px;">\u{1F399}\uFE0F Voz de marca</h3>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Tono de comunicaci\xF3n</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;" id="tone-chips">
            ${["profesional","cercano","inspirador","divertido","educativo","provocador","emp\xE1tico","aspiracional"].map(o=>`
              <button class="action-chip ${i.includes(o)?"active":""}" data-tone="${o}">${o}</button>
            `).join("")}
          </div>
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">P\xFAblico objetivo</label>
          <input class="input" id="brand-audience" value="${s(t.targetAudience??"")}" placeholder="Ej: Emprendedores 25-40 a\xF1os en LATAM">
        </div>
        <div class="field-group">
          <label class="field-label">Propuesta de valor</label>
          <textarea class="input" id="brand-value-prop" rows="2" placeholder="\xBFQu\xE9 hace \xFAnica a tu marca?">${s(t.valueProp??"")}</textarea>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:20px;">\u{1F3A8} Identidad visual</h3>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Estilo visual</label>
          <select class="input" id="brand-style">
            ${["minimalista","colorido","oscuro","elegante","urbano","natural","tecnol\xF3gico","retro"].map(o=>`
              <option value="${o}" ${e.style===o?"selected":""}>${o}</option>
            `).join("")}
          </select>
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Paleta de colores (hex, separados por coma)</label>
          <input class="input" id="brand-palette" value="${s(n.join(", "))}" placeholder="#e1306c, #405de6, #ffffff">
          <div style="display:flex;gap:8px;margin-top:10px;" id="palette-preview">
            ${n.map(o=>`<div style="width:28px;height:28px;border-radius:50%;background:${s(o)};border:2px solid var(--border);"></div>`).join("")}
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Tipograf\xEDas</label>
          <input class="input" id="brand-typography" value="${s((e.typography??[]).join(", "))}" placeholder="Inter, Playfair Display\u2026">
        </div>
      </div>

      <div class="btn-row">
        <button class="btn gradient" id="save-brand-btn">\u{1F4BE} Guardar perfil de marca</button>
        <button class="btn ghost" id="preview-brand-btn">\u{1F441}\uFE0F Vista previa</button>
      </div>
    </div>`},S=[{id:"n-crisis",icon:"\u{1F6A8}",name:"Alertas de crisis",desc:"Cuando se detecte una situaci\xF3n de reputaci\xF3n cr\xEDtica",default:!0},{id:"n-digest",icon:"\u{1F4F0}",name:"Digest diario",desc:"Resumen matutino de m\xE9tricas y agenda del d\xEDa",default:!0},{id:"n-publish",icon:"\u2705",name:"Publicaciones exitosas",desc:"Cuando un post se publique correctamente en Instagram",default:!1},{id:"n-ugc",icon:"\u{1F4F8}",name:"Nuevo UGC detectado",desc:"Cuando se encuentre contenido nuevo de usuarios",default:!0},{id:"n-experiments",icon:"\u{1F9EA}",name:"Resultados de experimentos",desc:"Cuando finalice un A/B test con resultados",default:!1},{id:"n-collab",icon:"\u{1F91D}",name:"Nuevos prospectos de collab",desc:"Cuando el agente identifique nuevas oportunidades",default:!0},{id:"n-trending",icon:"\u{1F525}",name:"Tendencias detectadas",desc:"Cuando haya un tema trending relevante para tu nicho",default:!0}],R=()=>`
  <div class="settings-section" id="section-notifications">
    <div class="card" style="margin-bottom:14px;">
      <h3 style="margin-bottom:6px;">\u{1F514} Preferencias de notificaci\xF3n</h3>
      <p class="small muted" style="margin-bottom:20px;">Control\xE1 qu\xE9 eventos generan alertas en el dashboard.</p>
      <div class="list-inner" style="border:1px solid var(--border-soft);border-radius:var(--radius-lg);">
        ${S.map(t=>`
          <div class="automation-row">
            <div class="automation-icon">${t.icon}</div>
            <div class="automation-info">
              <div class="automation-name">${s(t.name)}</div>
              <div class="automation-desc">${s(t.desc)}</div>
            </div>
            <div class="automation-control">
              ${y(t.id,t.default)}
            </div>
          </div>`).join("")}
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:16px;">\u{1F4EC} Canal de notificaciones</h3>
      <div class="field-group" style="margin-bottom:14px;">
        <label class="field-label">Email de alertas</label>
        <input class="input" id="notif-email" type="email" placeholder="tu@email.com" value="">
      </div>
      <div class="field-group" style="margin-bottom:14px;">
        <label class="field-label">Webhook (Slack / Discord / n8n)</label>
        <input class="input" id="notif-webhook" type="url" placeholder="https://hooks.slack.com/\u2026">
      </div>
      <button class="btn primary small" id="save-notif-btn">Guardar configuraci\xF3n</button>
    </div>
  </div>`;let m="cost";const D=()=>`
  <div class="settings-section" id="section-consumo">
    <div class="card" style="margin-bottom:14px;">
      <h3 style="margin-bottom:6px;">\u{1F4CA} Consumo</h3>
      <p class="small muted" style="margin-bottom:14px;">Tu uso del sistema, calidad de las respuestas, plan recomendado y gu\xEDa de onboarding.</p>
      <div class="hook-category-filter" id="consumo-tabs">
        <button class="tab-btn ${m==="cost"?"active":""}" data-ctab="cost">\u{1F4B8} Cost Attribution</button>
        <button class="tab-btn ${m==="quality"?"active":""}" data-ctab="quality">\u2713 Quality Gate</button>
        <button class="tab-btn ${m==="plan"?"active":""}" data-ctab="plan">\u{1F4E6} Plan Recommendation</button>
        <button class="tab-btn ${m==="onboarding"?"active":""}" data-ctab="onboarding">\u{1F393} Smart Onboarding</button>
      </div>
    </div>
    <div id="consumo-body"><div class="loading">Cargando...</div></div>
  </div>`,B=async t=>{const a=await v("/api/consumption/cost/dashboard");t.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Hoy</div><div class="stat-value">$${a.today.spentUsd}</div><div class="small muted">de $${a.today.capUsd} (${a.today.usedPct}%)</div></div>
      <div class="card stat-card"><div class="stat-label">Llamadas hoy</div><div class="stat-value">${a.today.calls}</div></div>
      <div class="card stat-card"><div class="stat-label">7 d\xEDas</div><div class="stat-value">$${a.last7Days.totalCostUsd}</div><div class="small muted">${a.last7Days.totalCalls} calls</div></div>
      <div class="card stat-card"><div class="stat-label">30 d\xEDas</div><div class="stat-value">$${a.last30Days.totalCostUsd}</div><div class="small muted">${a.last30Days.totalCalls} calls</div></div>
      <div class="card stat-card"><div class="stat-label">Breaker</div><div class="stat-value" style="color:${a.today.breaker==="open"?"#EF4444":"#10B981"}">${a.today.breaker==="open"?"\u26D4":"\u2713"}</div></div>
    </div>
    ${a.optimizationHints?.length?`
      <div class="card accent-border" style="margin-bottom:14px;">
        <h4 style="margin:0 0 8px;">\u{1F4A1} Hints de optimizaci\xF3n</h4>
        <ul style="margin:0;padding-left:18px;">${a.optimizationHints.map(e=>`<li class="small">${s(e)}</li>`).join("")}</ul>
      </div>`:""}
    <div class="page-grid">
      <div class="card">
        <h4>Por Workflow</h4>
        ${(a.byWorkflow??[]).slice(0,8).map(e=>`<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${s(e.key)}</span><strong>$${e.totalCostUsd} <span class="muted">(${e.pctOfTotal}%)</span></strong></div>`).join("")||'<div class="small muted">Sin datos</div>'}
      </div>
      <div class="card">
        <h4>Por Agente</h4>
        ${(a.byAgent??[]).slice(0,8).map(e=>`<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>@${s(e.key)}</span><strong>$${e.totalCostUsd} <span class="muted">(${e.pctOfTotal}%)</span></strong></div>`).join("")||'<div class="small muted">Sin datos</div>'}
      </div>
      <div class="card">
        <h4>Por Tipo de Tarea</h4>
        ${(a.byTaskType??[]).slice(0,8).map(e=>`<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${s(e.key)}</span><strong>$${e.totalCostUsd} <span class="muted">(${e.pctOfTotal}%)</span></strong></div>`).join("")||'<div class="small muted">Sin datos</div>'}
      </div>
      <div class="card">
        <h4>Por Modelo (hoy)</h4>
        ${(a.byModel??[]).map(e=>`<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${s(e.model)}</span><strong>$${e.costUsdToday} <span class="muted">(${e.callsToday} calls)</span></strong></div>`).join("")||'<div class="small muted">Sin datos hoy</div>'}
      </div>
    </div>
    ${a.topCostlyEvents?.length?`
      <div class="card" style="margin-top:14px;">
        <h4>Top 10 eventos m\xE1s caros</h4>
        ${a.topCostlyEvents.map(e=>`<div class="small" style="padding:4px 0;border-bottom:1px solid var(--border);">${s(new Date(e.at).toLocaleString("es-AR"))} \xB7 ${s(e.model)} \xB7 <strong>$${e.costUsd}</strong> ${e.workflow?`\xB7 wf:${s(e.workflow)}`:""} ${e.agent?`\xB7 ag:${s(e.agent)}`:""}</div>`).join("")}
      </div>`:""}`},N=async t=>{const a=await v("/api/consumption/quality/dashboard");t.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total 24h</div><div class="stat-value">${a.rollingMetrics.last24h.total}</div></div>
      <div class="card stat-card"><div class="stat-label">Pass rate 24h</div><div class="stat-value">${a.rollingMetrics.last24h.total>0?Math.round(a.rollingMetrics.last24h.passed/a.rollingMetrics.last24h.total*100):0}%</div></div>
      <div class="card stat-card"><div class="stat-label">Score promedio 7d</div><div class="stat-value">${a.rollingMetrics.last7d.avgScore.toFixed(0)}</div></div>
      <div class="card stat-card"><div class="stat-label">Bloqueadas 7d</div><div class="stat-value">${a.rollingMetrics.last7d.blocked}</div></div>
    </div>
    ${a.degradationAlert?`<div class="card crit" style="margin-bottom:14px;"><strong>\u26A0\uFE0F Degradaci\xF3n detectada:</strong> ${s(a.degradationAlert)}</div>`:""}
    <div class="card" style="margin-bottom:14px;">
      <h4>Por superficie</h4>
      ${a.bySurface.map(e=>`
        <div style="padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;">
            <strong>${s(e.surface)}</strong>
            <span class="small">Threshold: ${a.thresholds[e.surface]}</span>
          </div>
          <div class="small muted">${e.total} checks \xB7 Pass ${e.passRate}% \xB7 Avg ${e.avgScore.toFixed(0)} \xB7 Block ${e.blockRate}%</div>
        </div>`).join("")}
    </div>
    ${a.topIssues?.length?`
      <div class="card" style="margin-bottom:14px;">
        <h4>Top issues</h4>
        ${a.topIssues.slice(0,6).map(e=>`<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;"><span>${s(e.dimension)}</span><strong>${e.count}\xD7 \xB7 severidad ${e.avgSeverityScore.toFixed(1)}/3</strong></div>`).join("")}
      </div>`:""}
    ${a.worstChecks?.length?`
      <div class="card">
        <h4>Peores checks recientes</h4>
        ${a.worstChecks.slice(0,5).map(e=>`
          <div style="padding:8px 0;border-bottom:1px solid var(--border);">
            <div class="small"><strong>${s(e.surface)}</strong> \xB7 score <span class="crit">${e.score.overall}</span></div>
            <div class="small muted" style="margin-top:4px;font-style:italic;">"${s(e.responseText.slice(0,120))}..."</div>
            <div class="small">${s(e.score.reasoning)}</div>
          </div>`).join("")}
      </div>`:""}`},H=async t=>{const a=await v("/api/consumption/plan/recommend");t.innerHTML=`
    <div class="card accent-border" style="margin-bottom:14px;">
      <div class="small muted" style="text-transform:uppercase;letter-spacing:1px;">Plan recomendado para vos</div>
      <h3 style="margin:6px 0;">${s(a.recommendedPlan.name)} \xB7 $${a.recommendedPlan.monthlyUsd}/mes</h3>
      <div class="small muted">${s(a.recommendedPlan.bestFor)}</div>
      <div style="margin-top:10px;"><strong>Estimado real:</strong> $${a.estimatedMonthlyCostUsd}/mes \xB7 Headroom ${a.headroomPct}%</div>
      <ul style="margin-top:10px;padding-left:18px;">${a.reasoning.map(e=>`<li class="small">${s(e)}</li>`).join("")}</ul>
      ${a.warnings?.length?`<div class="small warn" style="margin-top:8px;"><strong>\u26A0\uFE0F</strong> ${a.warnings.map(s).join(" \xB7 ")}</div>`:""}
    </div>
    <h4 style="margin:18px 0 10px;">Comparativa</h4>
    <div class="page-grid">
      ${a.comparison.map(e=>`
        <div class="card" style="border:2px solid ${e.plan.id===a.recommendedPlan.id?"var(--accent)":"var(--border)"};">
          <div class="meta"><span class="tag tiny ${e.fits?"ok":"crit"}">${e.fits?"\u2713 Te sirve":"\u2717 Te queda chico"}</span><span class="tag tiny">Match ${e.matchScore}/100</span></div>
          <h3 style="margin:8px 0 4px;">${s(e.plan.name)}</h3>
          <div class="small muted">$${e.plan.monthlyUsd}/mes base \xB7 $${e.monthlyEstimateUsd}/mes estimado</div>
          <div class="small" style="margin-top:6px;">${e.plan.includedCallsPerMonth.toLocaleString("es-AR")} llamadas/mes</div>
          <div class="small muted" style="margin-top:6px;">${s(e.plan.bestFor)}</div>
          ${e.notes.length?`<div class="small warn" style="margin-top:6px;">${e.notes.map(s).join(" \xB7 ")}</div>`:""}
          <div class="meta" style="margin-top:8px;">${e.plan.features.slice(0,4).map(i=>`<span class="tag tiny">${s(i)}</span>`).join("")}</div>
        </div>`).join("")}
    </div>`},$=async t=>{const a=await v("/api/consumption/onboarding/next");t.innerHTML=`
    <div class="card accent-border" style="margin-bottom:14px;">
      <div class="small muted" style="text-transform:uppercase;letter-spacing:1px;">Etapa actual</div>
      <h3 style="margin:6px 0;">${s(a.progress.currentStage)} \xB7 ${a.completionPct}% completado</h3>
      <p style="margin:6px 0;">${s(a.stageMessage)}</p>
      <p class="small accent" style="margin:6px 0;"><em>${s(a.encouragement)}</em></p>
    </div>
    <h4 style="margin:18px 0 10px;">Pr\xF3ximos pasos sugeridos</h4>
    <div class="page-grid">
      ${a.nextSteps.map(e=>`
        <div class="card">
          <div class="meta">
            <span class="tag tiny ${e.impactLevel==="game-changer"?"accent":e.impactLevel==="high"?"ok":""}">${s(e.impactLevel)}</span>
            <span class="tag tiny">${s(e.category)}</span>
            <span class="tag tiny">${e.estimatedMinutes} min</span>
          </div>
          <h4 style="margin:8px 0 4px;">${s(e.title)}</h4>
          <p class="small">${s(e.description)}</p>
          <div class="small accent" style="margin-top:8px;"><strong>\u{1F449}</strong> ${s(e.cta)}</div>
          <div style="margin-top:10px;display:flex;gap:6px;">
            <button class="btn small" data-step-done="${s(e.id)}">\u2713 Ya lo hice</button>
            <button class="btn small" data-step-skip="${s(e.id)}">Saltar</button>
          </div>
        </div>`).join("")}
    </div>
    ${a.nextSteps.length===0?'<div class="empty-state">\u{1F389} Completaste todos los pasos sugeridos. Sos un graduado del sistema.</div>':""}
    <div class="card" style="margin-top:14px;">
      <h4>Progreso total</h4>
      <div class="progress-bar" style="height:10px;background:var(--bg-card-2);border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${a.completionPct}%;background:linear-gradient(90deg, var(--accent), var(--secondary));transition:width 0.5s;"></div>
      </div>
      <div class="small muted" style="margin-top:6px;">${a.progress.completedStepIds.length} de los pasos catalogados \xB7 Etapa: ${s(a.progress.currentStage)}</div>
    </div>`},O=async t=>{const a=t.querySelector("#consumo-body");if(!a)return;const e={cost:B,quality:N,plan:H,onboarding:$};await e[m](a),t.querySelectorAll("[data-ctab]").forEach(i=>{i.addEventListener("click",async()=>{m=i.dataset.ctab,t.querySelectorAll("[data-ctab]").forEach(n=>n.classList.toggle("active",n.dataset.ctab===m)),a.innerHTML='<div class="loading">Cargando...</div>',await e[m](a)})}),a.addEventListener("click",async i=>{const n=i.target.closest("[data-step-done]");if(n){await v(`/api/consumption/onboarding/step/${n.dataset.stepDone}/done`,{method:"POST",body:{}}),r("Paso marcado como hecho","success"),await $(a);return}const o=i.target.closest("[data-step-skip]");o&&(await v(`/api/consumption/onboarding/step/${o.dataset.stepSkip}/skip`,{method:"POST",body:{}}),await $(a))})},F=()=>{switch(c.section){case"accounts":return w();case"apikeys":return j();case"consumo":return D();case"automations":return I();case"brand":return U();case"notifications":return R();case"voice":return P();default:return w()}},g=t=>{const a=t.querySelector("#settings-content");a&&(a.innerHTML=`
    <div class="settings-grid">
      <aside class="settings-nav">
        ${q.map(e=>`
          <div class="settings-nav-item ${c.section===e.id?"active":""}" data-section="${e.id}">
            ${e.icon}
            <span>${e.label}</span>
          </div>`).join("")}
        <div style="margin-top:auto;padding:12px 14px 8px;border-top:1px solid var(--border-soft);margin-top:16px;">
          <div class="small" style="color:var(--text-tertiary);font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Versi\xF3n</div>
          <div class="small muted" style="margin-top:2px;">FeedIA v1.0</div>
        </div>
      </aside>
      <div class="settings-main">
        ${F()}
      </div>
    </div>`,V(t,a))},V=(t,a)=>{a.querySelectorAll(".settings-nav-item").forEach(i=>{i.addEventListener("click",()=>{c.section=i.dataset.section,g(t)})}),c.section==="voice"&&z(t,a),c.section==="consumo"&&O(a),a.querySelectorAll(".api-key-toggle").forEach(i=>{i.addEventListener("click",()=>{const n=a.querySelector(`#${i.dataset.target}`);n&&(n.type=n.type==="password"?"text":"password")})}),a.querySelectorAll("[data-save-key]").forEach(i=>{i.addEventListener("click",async()=>{const n=i.dataset.saveKey,o=a.querySelector(`#${n}-key`);if(!o)return;const d=o.value.trim();if(!d){r("Ingres\xE1 una clave v\xE1lida","warn");return}i.disabled=!0,i.innerHTML='<span class="spinner"></span>';try{await v("/api/settings/apikeys",{body:{service:n,key:d}}),c.apiKeys[n]=d,r(`Clave de ${n} guardada`,"ok"),g(t)}catch(l){r(l.message,"crit"),i.disabled=!1,i.innerHTML="Guardar"}})});const e=[["ig-connect-btn","instagram","connect"],["ig-reconnect-btn","instagram","connect"],["ig-disconnect-btn","instagram","disconnect"],["tt-connect-btn","tiktok","connect"],["tt-reconnect-btn","tiktok","connect"],["tt-disconnect-btn","tiktok","disconnect"],["canva-connect-btn","canva","connect"],["canva-reconnect-btn","canva","connect"],["canva-disconnect-btn","canva","disconnect"],["meta-connect-btn","meta","connect"],["meta-disconnect-btn","meta","disconnect"]];for(const[i,n,o]of e)a.querySelector(`#${i}`)?.addEventListener("click",async()=>{await(o==="connect"?G(n,t):K(n,t))});a.querySelectorAll('[id^="auto-"]').forEach(i=>{i.addEventListener("change",async()=>{const n=i.id.replace("auto-","");try{await v("/api/settings/automations/toggle",{body:{id:n,enabled:i.checked}});const o=c.automations.find(d=>d.id===n);o&&(o.enabled=i.checked),r(`${i.checked?"\u25B6 Activado":"\u23F8 Pausado"}: ${f[n]?.name??n}`,i.checked?"ok":"warn")}catch(o){r(o.message,"crit"),i.checked=!i.checked}})}),a.querySelector("#save-schedule-btn")?.addEventListener("click",async()=>{const i=a.querySelector("#timezone-select")?.value,n=a.querySelector("#digest-time")?.value;try{await v("/api/settings/schedule",{body:{timezone:i,digestTime:n}}),r("Horario guardado","ok")}catch(o){r(o.message,"crit")}}),a.querySelectorAll("[data-tone]").forEach(i=>{i.addEventListener("click",()=>i.classList.toggle("active"))}),a.querySelector("#brand-palette")?.addEventListener("input",i=>{const n=a.querySelector("#palette-preview");if(!n)return;const o=i.target.value.split(",").map(d=>d.trim()).filter(d=>/^#[0-9a-fA-F]{3,6}$/.test(d));n.innerHTML=o.map(d=>`<div style="width:28px;height:28px;border-radius:50%;background:${d};border:2px solid var(--border);"></div>`).join("")}),a.querySelector("#save-brand-btn")?.addEventListener("click",async()=>{const i=a.querySelector("#save-brand-btn"),n=[...a.querySelectorAll("[data-tone].active")].map(u=>u.dataset.tone),o=a.querySelector("#brand-palette")?.value.split(",").map(u=>u.trim()).filter(Boolean)??[],d=a.querySelector("#brand-typography")?.value.split(",").map(u=>u.trim()).filter(Boolean)??[],l={name:a.querySelector("#brand-name")?.value.trim(),niche:a.querySelector("#brand-niche")?.value.trim(),handle:a.querySelector("#brand-handle")?.value.trim(),bio:a.querySelector("#brand-bio")?.value.trim(),targetAudience:a.querySelector("#brand-audience")?.value.trim(),valueProp:a.querySelector("#brand-value-prop")?.value.trim(),voice:{tone:n},visual:{style:a.querySelector("#brand-style")?.value,palette:o,typography:d}};i.disabled=!0,i.innerHTML='<span class="spinner"></span> guardando\u2026';try{await v("/api/brand",{method:"PUT",body:l}),c.brand={...c.brand,...l},r("Perfil de marca actualizado","ok"),i.disabled=!1,i.innerHTML="\u{1F4BE} Guardar perfil de marca"}catch(u){r(u.message,"crit"),i.disabled=!1,i.innerHTML="\u{1F4BE} Guardar perfil de marca"}}),a.querySelector("#save-notif-btn")?.addEventListener("click",async()=>{const i={};S.forEach(d=>{i[d.id]=a.querySelector(`#${d.id}`)?.checked??!1});const n=a.querySelector("#notif-email")?.value.trim(),o=a.querySelector("#notif-webhook")?.value.trim();try{await v("/api/settings/notifications",{body:{prefs:i,email:n,webhook:o}}),r("Notificaciones guardadas","ok")}catch(d){r(d.message,"crit")}})},G=async(t,a)=>{try{const e=await v("/api/settings/connect",{body:{service:t}});if(e.authUrl){const o=(screen.width-600)/2,d=(screen.height-700)/2,l=window.open(e.authUrl,`${t}-oauth`,`width=600,height=700,top=${d},left=${o},toolbar=no,menubar=no,scrollbars=yes`),u=setInterval(async()=>{l?.closed&&(clearInterval(u),await x(a),r(`Verificando conexi\xF3n con ${t}\u2026`,"info"))},800)}else e.connected&&(c.connections[t]=e,r(`${t} conectado`,"ok"),g(a))}catch(e){r(e.message,"crit")}},K=async(t,a)=>{if(confirm(`\xBFDesconectar ${t}? Perder\xE1s acceso a las funciones integradas.`))try{await v("/api/settings/disconnect",{body:{service:t}}),c.connections[t]={connected:!1},r(`${t} desconectado`,"warn"),g(a)}catch(e){r(e.message,"crit")}},x=async t=>{const[a,e,i,n]=await Promise.allSettled([v("/api/settings/connections"),v("/api/settings/automations"),v("/api/brand"),v("/api/settings/apikeys")]);c.connections=a.status==="fulfilled"?a.value??{}:{},c.automations=e.status==="fulfilled"?e.value.automations??[]:[],c.brand=i.status==="fulfilled"?i.value:null,c.apiKeys=n.status==="fulfilled"?n.value??{}:{},g(t)};export const renderSettings=async t=>{c={section:"accounts",connections:{},automations:[],brand:null,apiKeys:{}},t.innerHTML=`
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Configuraci\xF3n</h1>
        <p class="view-subtitle page-subtitle">Conect\xE1 tus cuentas, gestion\xE1 las automatizaciones y personaliz\xE1 el agente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="settings-refresh-btn">\u21BB Actualizar</button>
      </div>
    </header>
    <div id="settings-content" class="page-body">
      <div class="page-loading"><span class="spinner"></span> cargando\u2026</div>
    </div>`,t.querySelector("#settings-refresh-btn")?.addEventListener("click",()=>x(t)),await x(t)};
