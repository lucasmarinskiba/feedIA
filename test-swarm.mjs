// Smoke test del Framework Orquestador de Agentes Autónomos (swarm).
// Fuerza fallo de Claude (API key inválida) para ejercitar los caminos
// deterministas de fallback (planner heurístico, crítico heurístico) y
// verificar el plumbing del conductor: plan → act → reflect → persist.
process.env.ANTHROPIC_API_KEY = 'sk-invalid-smoke-key';
process.env.DRY_RUN = 'true';

const pass = [];
const fail = [];
const ok = (c, m) => (c ? pass : fail).push(m);

// Estado determinista: limpiar ledgers que persisten entre corridas.
const { rmSync: _rm } = await import('node:fs');
for (const f of [
  'budgetLedger.json',
  'bandits.json',
  'opsCooldowns.json',
  'semanticCache.json',
  'experienceTrophies.json',
  'experienceConcierge.json',
]) {
  try {
    _rm(`./data/runtime/${f}`);
  } catch {
    /* no existía */
  }
}

const m = await import('./src/capabilities/agents/registerExisting.js');
m.registerDashboardAgents();
m.registerProductionAgents();

const { loadBrandProfile } = await import('./src/config/index.js');
const brand = loadBrandProfile();

const bb = await import('./src/agent/swarm/blackboard.js');
const critic = await import('./src/agent/swarm/critic.js');
const planner = await import('./src/agent/swarm/planner.js');
const conductor = await import('./src/agent/swarm/conductor.js');

// 1. Blackboard: init + post + summarize
bb.initBlackboard('test-msn', 'objetivo de prueba', brand.name);
bb.post('test-msn', { kind: 'decision', by: 'planner', label: 'plan', value: 'pipeline A→B' });
bb.post('test-msn', { kind: 'artifact', by: 'nova', label: 't1', value: 'copy listo' });
const sum = bb.summarizeBlackboard('test-msn');
ok(sum.includes('plan') && sum.includes('t1'), `blackboard summarize OK (${sum.length} chars)`);

// 2. Critic heurístico: output corto → retry; output sólido → accept
const cShort = await critic.critique(brand, {
  objective: 'x',
  taskGoal: 'g',
  agentId: 'a',
  output: 'no',
  attempt: 1,
  maxAttempts: 2,
});
ok(cShort.verdict === 'retry', `critic: output corto → ${cShort.verdict}`);
const cGood = await critic.critique(brand, {
  objective: 'x',
  taskGoal: 'g',
  agentId: 'a',
  output: 'Este es un entregable concreto y suficientemente largo con el resultado real solicitado.',
  attempt: 1,
  maxAttempts: 2,
});
ok(cGood.verdict === 'accept', `critic: output sólido → ${cGood.verdict}`);
const cExhausted = await critic.critique(brand, {
  objective: 'x',
  taskGoal: 'g',
  agentId: 'a',
  output: 'error: falló',
  attempt: 2,
  maxAttempts: 2,
});
ok(cExhausted.verdict === 'replan', `critic: sin intentos → ${cExhausted.verdict} (no loop infinito)`);

// 3. Planner heurístico (Claude falla): plan accionable con agentes reales
const plan = await planner.planMission(brand, 'Subí 1 carrusel por día con su estrategia');
ok(plan.source === 'heuristic', `planner cae a heurístico sin API (${plan.source})`);
ok(plan.playbook.tasks.length >= 2, `planner produjo ${plan.playbook.tasks.length} tareas`);
ok(plan.crew.length >= 1, `planner armó crew de ${plan.crew.length} agentes`);

// 4. runMission de punta a punta: nunca lanza, persiste record
const rec = await conductor.runMission(brand, 'Generá un carrusel de prueba', { maxAttemptsPerTask: 1, maxReplans: 0 });
ok(!!rec && !!rec.id, `runMission devolvió record ${rec?.id}`);
ok(['completed', 'partial', 'failed'].includes(rec.status), `mission status válido: ${rec.status}`);
ok(rec.steps.length >= 1, `mission ejecutó ${rec.steps.length} pasos`);
ok(typeof rec.summary === 'string' && rec.summary.length > 0, 'mission produjo resumen');

// 5. Persistencia: listMissions / getMission lo recuperan
const listed = conductor.listMissions(brand.name);
ok(
  listed.some((x) => x.id === rec.id),
  `listMissions recupera la misión (${listed.length} total)`,
);
const fetched = conductor.getMission(rec.id);
ok(fetched?.id === rec.id, 'getMission recupera por id');

// 6. Directive Engine → misión swarm automática (acción 'custom')
const dirEngine = await import('./src/capabilities/directives/engine.js');
const dir = {
  id: 'd-smoke',
  brandId: brand.name,
  rawText: 'Hacé crecer la cuenta esta semana',
  source: 'texto',
  action: 'custom',
  recurrence: { kind: 'once' },
  contentSpec: { applyBranding: true, autoPublish: false },
  status: 'active',
  createdAt: new Date().toISOString(),
  runCount: 0,
  interpretation: 'crecimiento orgánico',
};
const drun = await dirEngine.executeDirective(brand, dir);
ok(
  typeof drun.artifactId === 'string' && drun.artifactId.startsWith('msn-'),
  `directiva 'custom' → misión swarm (${drun.artifactId})`,
);
ok(['ok', 'partial', 'failed'].includes(drun.status), `directive run status válido: ${drun.status}`);
ok(
  drun.steps.some((s) => s.label === 'Misión autónoma'),
  'directive run registra paso "Misión autónoma"',
);

// 7. Director de Operaciones 24/7: despacha 1 misión, setea cooldown
const { rmSync } = await import('node:fs');
try {
  rmSync('./data/runtime/opsCooldowns.json');
} catch {
  /* no existía */
}
const ops = await import('./src/agent/swarm/operations.js');
const opsReport = await ops.runOperationsCycle(brand, { autonomy: 'fully_autonomous', maxMissions: 1 });
ok(
  opsReport.dispatched.length === 1,
  `ops despachó exactamente 1 misión (acota costo) — ${opsReport.dispatched.length}`,
);
ok(
  opsReport.dispatched[0]?.missionId?.startsWith('msn-'),
  `ops misión es swarm (${opsReport.dispatched[0]?.missionId})`,
);
const opsStatus = ops.getOperationsStatus();
const dispatchedDept = opsReport.dispatched[0]?.department;
const stRow = opsStatus.find((s) => s.department === dispatchedDept);
ok(!!stRow?.lastRunAt && !!stRow?.nextEligibleAt, 'ops registró cooldown del departamento despachado');
const opsReport2 = await ops.runOperationsCycle(brand, { autonomy: 'fully_autonomous', maxMissions: 1 });
ok(
  !opsReport2.dispatched.some((d) => d.department === dispatchedDept),
  'ops respeta cooldown (no redispatcha el mismo dpto)',
);
const supReport = await ops.runOperationsCycle(brand, { autonomy: 'supervised', maxMissions: 1 });
ok(supReport.dispatched.length === 0, 'ops no actúa en autonomía supervised');

// 8. Research kit (autoservicio): calc / ledger / webFetch / consult / study
const research = await import('./src/capabilities/research/index.js');

const er = research.igCalc({ op: 'engagement', input: { followers: 1000, likes: 80, comments: 20 } });
ok(
  er.classicPct === 10 && ['bueno', 'excelente', 'normal'].includes(er.band),
  `ig_calc engagement determinista (${er.classicPct}%, ${er.band})`,
);
const gp = research.igCalc({ op: 'growth', input: { current: 1000, weeklyGrowthPct: 5, weeks: 4 } });
ok(gp.final > 1000 && gp.weekly.length === 4, `ig_calc growth proyecta (${gp.final})`);

const led = research.recordLedgerEntry({
  topic: 'policy-change',
  insight: 'Test: nueva política de prueba para smoke',
  confidence: 'media',
  source: 'smoke',
  needsVerification: true,
});
ok(!!led.id && !!led.expiresAt, `ledger registra apunte (${led.id})`);
const q = research.queryLedger({ topic: 'policy-change', search: 'smoke' });
ok(
  q.some((e) => e.id === led.id),
  `ledger query recupera el apunte (${q.length})`,
);
const led2 = research.recordLedgerEntry({
  topic: 'policy-change',
  insight: 'Test: nueva política de prueba para smoke',
  confidence: 'alta',
  source: 'smoke2',
});
ok(led2.id === led.id && led2.confidence === 'alta', 'ledger dedup refresca en vez de duplicar');
ok(research.formatLedgerAsPrompt(5).length > 0, 'ledger formatea prompt para grounding');
const pr = research.pruneLedger();
ok(typeof pr.kept === 'number', `ledger prune OK (kept ${pr.kept})`);

const wf = await research.webFetch('http://127.0.0.1/secret');
ok(wf.ok === false && /privada|loopback|permitido/i.test(wf.error || ''), `webFetch bloquea SSRF (${wf.error})`);
const wfBad = await research.webFetch('ftp://x');
ok(wfBad.ok === false, 'webFetch rechaza protocolos no http(s)');

const consult = await research.askProfessor(brand, '¿Cómo afectan los saves al alcance de un reel?');
ok(
  consult.source === 'facts-deterministas' && consult.answer.length > 0,
  `askProfessor degrada sin API (${consult.source})`,
);

const study = await research.runStudySession(brand);
ok(
  study.ran === false && typeof study.pruned === 'number',
  `study degrada sin API pero purga ledger (pruned ${study.pruned})`,
);

// 9. Carousel Factory: render branded determinista + pipeline end-to-end
const render = await import('./src/capabilities/render/index.js');
const fakeSlide = {
  numero: 1,
  titulo: 'Gancho de prueba',
  cuerpo: 'Cuerpo de prueba del slide para smoke.',
  rolEnNarrativa: 'gancho',
  direccionVisual: 'fondo oscuro',
};
const svg = render.renderCarruselSlideSvg(fakeSlide, brand, 5);
ok(
  svg.includes('<svg') && svg.includes('1080') && svg.includes(brand.name),
  'renderCarruselSlideSvg produce SVG branded',
);
const dataUri = render.svgToDataUrl(svg);
ok(dataUri.startsWith('data:image/svg+xml'), 'svgToDataUrl genera data URI');

const cf = await import('./src/capabilities/content/carouselFactory.js');
const cjob = await cf.runCarouselFactory(brand, { topic: 'Smoke: 3 tips de prueba', autoPublish: true });
ok(!!cjob && !!cjob.id && cjob.id.startsWith('crsl-'), `carouselFactory devuelve job (${cjob?.id})`);
ok(['published', 'queued', 'held', 'failed'].includes(cjob.status), `carousel job status válido: ${cjob.status}`);
ok(typeof cjob.note === 'string' && cjob.note.length > 0, 'carousel job tiene nota explicativa');
const cjFetched = cf.getCarouselJob(cjob.id);
ok(cjFetched?.id === cjob.id, 'carousel job se persiste y se recupera');
ok(
  cf.listCarouselJobs(brand.name).some((j) => j.id === cjob.id),
  'listCarouselJobs incluye el job',
);

// 10. Budget Governor + Mission Recall
try {
  rmSync('./data/runtime/budgetLedger.json');
} catch {
  /* no existía */
}
const budget = await import('./src/agent/budget.js');
const b0 = budget.getBudgetStatus();
ok(b0.spentUsd === 0 && b0.breaker === 'closed', `budget arranca limpio (cap $${b0.capUsd})`);
const cost = budget.recordUsage('claude-opus-4-7', { input_tokens: 1_000_000, output_tokens: 1_000_000 });
ok(Math.round(cost) === 90, `budget tarifa opus correcta ($${cost} = 15+75)`);
const b1 = budget.getBudgetStatus();
ok(b1.spentUsd === 90 && b1.calls === 1 && b1.byModel['claude-opus-4-7'], 'budget acumula gasto y desglose por modelo');
ok(budget.canSpend() === false, 'budget canSpend=false superado el tope ($90 > $5)');
let threw = false;
try {
  budget.guardBudget();
} catch (e) {
  threw = e.name === 'BudgetExceededError';
}
ok(threw, 'guardBudget lanza BudgetExceededError con el breaker abierto');

const recall = await import('./src/agent/swarm/recall.js');
const hits = recall.recallSimilarMissions('Generá un carrusel de prueba ahora', brand.name, 3);
ok(Array.isArray(hits), `recall devuelve array (${hits.length} similares)`);
const rprompt = recall.formatRecallForPrompt('Generá un carrusel de prueba ahora', brand.name);
ok(typeof rprompt === 'string' && rprompt.length > 0, 'recall formatea bloque para el planner');

// 11. Router budget-aware + Bandit + Rasterizer + Digest resiliente
try {
  rmSync('./data/runtime/budgetLedger.json');
} catch {
  /* limpio */
}
const router = await import('./src/agent/tokenRouter.js');
ok(router.budgetAwareFreeOnly(false) === false, 'router: budget OK → no fuerza free');
ok(router.budgetAwareFreeOnly(true) === true, 'router: freeOnly pedido se respeta');
budget.recordUsage('claude-opus-4-7', { input_tokens: 2_000_000, output_tokens: 0 });
ok(router.budgetAwareFreeOnly(false) === true, 'router: presupuesto agotado → fuerza proveedores gratis');
try {
  rmSync('./data/runtime/budgetLedger.json');
} catch {
  /* limpio */
}

try {
  rmSync('./data/runtime/bandits.json');
} catch {
  /* limpio */
}
const exp = await import('./src/capabilities/experiments/index.js');
const pick = exp.pickArm('hook-pattern', ['curiosity', 'contrarian', 'howto']);
ok(['curiosity', 'contrarian', 'howto'].includes(pick.armId), `bandit pickArm elige brazo (${pick.armId})`);
exp.rewardArm('hook-pattern', 'contrarian', true);
exp.rewardArm('hook-pattern', 'contrarian', true);
exp.rewardArm('hook-pattern', 'curiosity', false);
const bstats = exp.banditStats('hook-pattern');
ok(bstats.best === 'contrarian', `bandit aprende: mejor brazo = ${bstats.best} (mean ${bstats.arms[0]?.mean})`);
const sync1 = exp.syncBanditsFromTraces(brand.name);
const sync2 = exp.syncBanditsFromTraces(brand.name);
ok(
  typeof sync1.processed === 'number' && sync2.processed === 0,
  `bandit sync idempotente (1ª ${sync1.processed}, 2ª ${sync2.processed})`,
);

const rast = await import('./src/capabilities/render/rasterizer.js');
const png = rast.renderCarruselSlidePng(fakeSlide, brand, 5);
const sig = [...png.buffer.slice(0, 8)];
ok(sig[0] === 137 && sig[1] === 80 && sig[2] === 78 && sig[3] === 71, 'rasterizer emite firma PNG válida');
ok(
  png.dataUri.startsWith('data:image/png;base64,') && png.buffer.length > 1000,
  `rasterizer PNG no vacío (${png.buffer.length} bytes)`,
);

const dg = await import('./src/capabilities/digest/index.js');
const digest = await dg.construirDigest(brand).catch(() => null);
// Sin API el LLM falla; validamos el camino determinista vía enviarDigest.
const sent = await dg.enviarDigest(brand);
ok(
  !!sent && !!sent.data.intel && typeof sent.data.intel.presupuesto.usadoPct === 'number',
  'digest resiliente trae bloque intel determinista',
);
ok(sent.resumenEjecutivo.length > 0, 'digest resiliente produce resumen aunque falle el LLM');

// 12. Semantic cache (b) + router-bandit naming (a) + digest snapshot (c)
const sc = await import('./src/agent/semanticCache.js');
sc.storeSemantic('caption', 'Escribí un caption sobre lanzamiento de producto nuevo', 'CAPTION-CACHEADO', 'groq');
const miss = sc.lookupSemantic('caption', 'tema totalmente distinto sin relación alguna xyz');
ok(miss === null, 'semantic cache: prompt no relacionado → miss');
const hit = sc.lookupSemantic('caption', 'Escribí un caption sobre el lanzamiento de un producto nuevo');
ok(hit && hit.text === 'CAPTION-CACHEADO', `semantic cache: paráfrasis cercana → hit (sim ${hit?.similarity})`);
const scs = sc.semanticCacheStats();
ok(
  scs.entries >= 1 && scs.hits >= 1 && scs.hitRatePct > 0,
  `semantic cache stats (${scs.hits}h/${scs.misses}m, ${scs.hitRatePct}%)`,
);

const tr = await import('./src/agent/tokenRouter.js');
ok(typeof tr.budgetAwareFreeOnly === 'function', 'tokenRouter expone budgetAwareFreeOnly (router→bandit integrado)');

const dg2 = await import('./src/capabilities/digest/index.js');
const snap = dg2.digestSnapshot(brand);
ok(
  !!snap.data.intel && typeof snap.data.intel.presupuesto.usadoPct === 'number',
  'digestSnapshot determinista (sin LLM) trae intel para el panel',
);

// 13. Computer-Use Live Theater (observable)
const cu = await import('./src/capabilities/computerUse/index.js');
const watch = cu.startWatchSession('Dale like y guardá el post', { brandId: brand.name, speed: 3 });
ok(
  typeof watch.sessionId === 'string' && watch.sessionId.startsWith('cu-'),
  `watch session creada (${watch.sessionId})`,
);
ok(watch.steps >= 1, `watch plan tiene ${watch.steps} paso(s)`);
ok(
  cu.listWatchSessions().some((x) => x.id === watch.sessionId),
  'listWatchSessions incluye la sesión',
);

const got = [];
const fakeRes = {
  statusCode: 0,
  setHeader() {},
  flushHeaders() {},
  write(s) {
    const m = /^data: (.*)$/m.exec(s);
    if (m) {
      try {
        got.push(JSON.parse(m[1]).kind);
      } catch {}
    }
    return true;
  },
  end() {},
  on() {},
};
cu.subscribeWatch(watch.sessionId, fakeRes);
const deadline = Date.now() + 12000;
while (!got.includes('session-end') && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 250));
}
ok(got.includes('session-start'), 'stream emitió session-start');
ok(got.includes('cursor'), 'stream emitió movimientos de cursor (el usuario lo ve moverse)');
ok(got.includes('act'), 'stream emitió acciones (click/type/scroll)');
ok(got.includes('session-end'), 'stream emitió session-end (tarea completada)');
ok(cu.computerUseLiveEnabled() === false, 'CU-Live gateado: deshabilitado sin env/API real (cae a simulación)');
ok((await cu.isComputerUseLiveAvailable()) === false, 'CU-Live no disponible sin Playwright/opt-in (fallback seguro)');

// 14. Experiencialización — Sala Ejecutiva (estatus + ego, determinista)
const xp = await import('./src/capabilities/experience/index.js');
const lev = xp.computeLeverage(brand.name);
ok(
  lev.indicacionesDadas >= 1 && lev.accionesEjecutadas >= 1,
  `leverage calcula (${lev.indicacionesDadas} ind → ${lev.accionesEjecutadas} acc)`,
);
ok(lev.ratioLabel.startsWith('1 : ') && lev.ratio >= 1, `apalancamiento formateado (${lev.ratioLabel})`);
ok(
  lev.equipoReemplazado === 8 && lev.costoEquipoUsdMes > 10000,
  `equipo reemplazado ${lev.equipoReemplazado} · $${lev.costoEquipoUsdMes}/mes`,
);
const brief = await xp.buildExecutiveBrief(brand, { conNarrativaIA: false });
ok(
  brief.staff.length === 8 && brief.tier && brief.credencial.includes('FeedIA'),
  `brief: staff 8, tier ${brief.tier}, credencial OK`,
);
ok(
  brief.hitos.some((t) => t.id === 'first-blood'),
  'brief desbloquea trofeo "primer movimiento"',
);
ok(brief.narrativa.length > 60 && brief.saludo.includes(brand.name), 'brief narrativa+saludo personalizados (sin LLM)');

// 15. Toques de experiencialización: recap, ceremonia de tier, one-pager
const recapD = xp.buildRecapData(brand);
ok(
  recapD.marca === brand.name && recapD.tier && recapD.acciones >= 1,
  `recap data (${recapD.tier}, ${recapD.acciones} acc)`,
);
const rsvg = xp.recapSvg(brand);
ok(
  rsvg.includes('<svg') && rsvg.includes('MI AÑO CON FEEDIA') && rsvg.includes(brand.name),
  'recap SVG animado válido y branded',
);
const rpng = xp.recapPng(brand);
const psig = [...rpng.buffer.slice(0, 4)];
ok(
  psig[0] === 137 && psig[1] === 80 && rpng.dataUri.startsWith('data:image/png'),
  `recap PNG válido (${rpng.buffer.length} bytes)`,
);
const opd = xp.buildOnePagerData(brand);
ok(
  opd.highlights.length >= 4 && opd.costoEvitadoAnioUsd > 100000,
  `one-pager data (ahorro $${opd.costoEvitadoAnioUsd})`,
);
const ophtml = xp.investorOnePagerHtml(brand);
ok(
  ophtml.includes('<!doctype html') && ophtml.includes('ONE-PAGER') && ophtml.includes(brand.name),
  'one-pager HTML imprimible autónomo',
);

// Ceremonia de ascenso de tier (fuerzo lastTier bajo y verifico el salto)
const { writeFileSync: _wf, readFileSync: _rf } = await import('node:fs');
const TP = './data/runtime/experienceTrophies.json';
let tpStore = {};
try {
  tpStore = JSON.parse(_rf(TP, 'utf-8'));
} catch {
  tpStore = { won: [] };
}
tpStore.lastTier = 'Bronce';
_wf(TP, JSON.stringify(tpStore));
const briefUp = await xp.buildExecutiveBrief(brand, { conNarrativaIA: false });
ok(
  briefUp.ascenso && briefUp.ascenso.de === 'Bronce' && briefUp.ascenso.a === briefUp.tier,
  `ceremonia: ascenso ${briefUp.ascenso?.de}→${briefUp.ascenso?.a}`,
);
const briefSame = await xp.buildExecutiveBrief(brand, { conNarrativaIA: false });
ok(!briefSame.ascenso, 'ceremonia se dispara UNA sola vez (no repite)');

// 16. Concierge — ritual de entrada + feed humanizado
const w1 = xp.getWelcome(brand);
ok(w1.primeraVez === true && w1.visita === 1, 'concierge: primera visita detectada');
ok(w1.saludo.includes(brand.name) && /Bue[n]/.test(w1.saludo), `concierge: saludo personalizado ("${w1.saludo}")`);
ok(
  typeof w1.proximaIndicacion === 'string' && w1.proximaIndicacion.length > 10,
  'concierge: sugiere próxima indicación',
);
ok(
  w1.equipoActivo >= 1 && typeof w1.desdeUltimaVisita.titular === 'string',
  `concierge: equipo activo (${w1.equipoActivo}) + titular`,
);
const w2 = xp.getWelcome(brand);
ok(w2.primeraVez === false && w2.visita === 2, 'concierge: 2ª visita ya no es primera (lastSeen persistido)');
const act = xp.humanizeActivity(brand.name, 20);
ok(Array.isArray(act) && act.length >= 1, `concierge: feed humanizado (${act.length} ítems)`);
ok(
  act[0].quien && act[0].emoji && act[0].accion && act[0].cuando,
  'concierge: ítem tiene persona/emoji/acción/tiempo (no es log crudo)',
);

// 17. Command Router — "decile a FeedIA" en una frase
const cmd = await import('./src/capabilities/command/index.js');
const c1 = cmd.routeCommand(brand, 'subí un carrusel sobre productividad');
ok(
  c1.intent === 'publicar-carrusel' && c1.action.endpoint === '/api/carousel/run',
  `cmd: carrusel → ${c1.action.endpoint}`,
);
const c2 = cmd.routeCommand(brand, 'respondé todos los DMs y comentarios');
ok(c2.intent === 'responder-comunidad' && c2.action.endpoint === '/api/swarm/mission', `cmd: comunidad → ${c2.intent}`);
const c3 = cmd.routeCommand(brand, 'mostrame el reporte de mi imperio');
ok(
  c3.intent === 'reporte-ejecutivo' && c3.action.kind === 'navigate' && c3.action.route === 'imperio',
  'cmd: reporte → navega a imperio',
);
const c4 = cmd.routeCommand(brand, 'subí 1 carrusel por día siempre');
ok(c4.intent === 'publicar-carrusel' || c4.intent === 'agendar-directiva', `cmd: recurrencia/carrusel (${c4.intent})`);
const c5 = cmd.routeCommand(brand, 'hacé crecer la cuenta esta semana');
ok(
  c5.action.endpoint === '/api/swarm/mission' && c5.confidence >= 0.5,
  `cmd: objetivo general → misión (${c5.intent})`,
);
const c6 = cmd.routeCommand(brand, '');
ok(c6.intent === 'vacio' && c6.confidence === 0, 'cmd: vacío manejado sin romper');
ok(typeof c1.reply === 'string' && c1.reply.length > 10, 'cmd: respuesta humana de confirmación');

console.log('\n── Swarm smoke ──');
pass.forEach((m) => console.log('  ✓ ' + m));
fail.forEach((m) => console.log('  ✗ ' + m));
console.log(`\n${pass.length}/${pass.length + fail.length} OK`);
process.exit(fail.length ? 1 : 0);
