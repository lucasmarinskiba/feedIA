/**
 * Evaluación del Comment Brain contra el set dorado, con el LLM REAL.
 *
 *   npm run eval:comments                 → decisión completa (clasifica + redacta + valida)
 *   npm run eval:comments -- --no-write   → solo clasificación + política (más barato; no ve
 *                                           las degradaciones por falta de respaldo/humor flojo)
 *   npm run eval:comments -- --only sarc-critical-servicio
 *   npm run eval:comments -- --offline    → LLM guionado (verifica el script, no el modelo)
 *
 * No envía nada a Instagram ni toca la cola de revisión ni el bus: usa la decisión
 * pura (`decideReply`). Sale con código 1 si hay algún error de "sobre-autonomía"
 * (el bot respondería solo algo que una persona debía ver): esa es la métrica que importa.
 *
 * La calidad del humor NO se puede puntuar sola: el script imprime las candidatas
 * para que una persona las lea.
 */

import { hasApiKey } from '../src/agent/claude.js';
import { budgetAwareFreeOnly } from '../src/agent/tokenRouter.js';
import { classifyComment } from '../src/capabilities/commentBrain/classifier.js';
import { isSensitiveTopic } from '../src/capabilities/commentBrain/heuristics.js';
import { decideReply } from '../src/capabilities/commentBrain/index.js';
import { defaultCommentLlm, type CommentLlm } from '../src/capabilities/commentBrain/llm.js';
import { decidePlan } from '../src/capabilities/commentBrain/strategy.js';
import type { BrainConfig, PlanAction } from '../src/capabilities/commentBrain/types.js';
import { GOLDEN_SET, type GoldenCase } from '../tests/capabilities/commentBrain/goldenSet.js';
import { cleanVerdict, inputFor, scriptedLlm } from '../tests/capabilities/commentBrain/helpers.js';

const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const CONFIG: BrainConfig = { autonomy: 'balanced', minConfidence: 0.7 };
/** Cuánto cuesta equivocarse: responder solo lo que debía ver una persona es lo grave. */
const AUTONOMY_RANK: Record<PlanAction, number> = { ignore: 0, escalate: 1, 'draft-for-review': 2, reply: 3 };

interface Row {
  c: GoldenCase;
  kind: string;
  sarcasm: string;
  action: PlanAction;
  source: string;
  confidence: number;
  reply?: string;
  candidates: string[];
  reasons: string[];
  error?: string;
}

const pct = (n: number, d: number): string => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}% (${n}/${d})`);

const evaluate = async (c: GoldenCase, llm: CommentLlm, policyOnly: boolean): Promise<Row> => {
  const input = inputFor(c);
  if (policyOnly) {
    const cl = await classifyComment(input, { llm });
    const plan = decidePlan(cl, CONFIG, { sensitiveTopic: isSensitiveTopic(c.text, c.postCaption) });
    return {
      c,
      kind: cl.kind,
      sarcasm: cl.sarcasm.present ? (cl.sarcasm.stance ?? 'sí') : '-',
      action: plan.action,
      source: cl.source,
      confidence: cl.confidence,
      candidates: [],
      reasons: plan.reasons,
    };
  }
  const r = await decideReply(input, { llm, config: CONFIG, promiseVerdict: cleanVerdict });
  return {
    c,
    kind: r.classification.kind,
    sarcasm: r.classification.sarcasm.present ? (r.classification.sarcasm.stance ?? 'sí') : '-',
    action: r.action,
    source: r.classification.source,
    confidence: r.classification.confidence,
    reply: r.reply,
    candidates: r.candidates ?? [],
    reasons: r.reasons,
  };
};

const run = async (): Promise<number> => {
  const offline = flag('offline');
  const policyOnly = flag('no-write');
  const only = option('only');
  const cases = only ? GOLDEN_SET.filter((c) => c.id === only) : GOLDEN_SET;
  if (cases.length === 0) throw new Error(`No hay caso con id "${only}"`);

  const llm: CommentLlm = offline ? scriptedLlm(GOLDEN_SET) : defaultCommentLlm;
  const provider = offline
    ? 'OFFLINE (LLM guionado: valida el script, no el modelo)'
    : hasApiKey() && !budgetAwareFreeOnly(false)
      ? 'Claude (modelo fast)'
      : 'proveedores gratuitos (Groq/Ollama/OpenRouter): el humor será notablemente más flojo que en producción con Claude';
  console.log(
    `\nProveedor LLM: ${provider}\nCasos: ${cases.length}${policyOnly ? '\nModo: solo política (sin redacción)' : ''}\n`,
  );

  const rows: Row[] = [];
  for (const c of cases) {
    try {
      rows.push(await evaluate(c, llm, policyOnly));
    } catch (err) {
      rows.push({
        c,
        kind: '?',
        sarcasm: '?',
        action: 'draft-for-review',
        source: 'error',
        confidence: 0,
        candidates: [],
        reasons: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Detalle ────────────────────────────────────────────────────────────────
  for (const r of rows) {
    const okKind = r.kind === r.c.label.kind ? '✓' : '✗';
    const okAct = r.action === r.c.expect.action ? '✓' : '✗';
    console.log(`${okAct} ${r.c.id}`);
    console.log(`    "${r.c.text.trim()}"`);
    console.log(
      `    tipo ${okKind} ${r.kind} (esperado ${r.c.label.kind}) | sarcasmo ${r.sarcasm} (esperado ${r.c.label.sarcasm ?? '-'}) | ` +
        `acción ${r.action} (esperada ${r.c.expect.action}) | conf ${r.confidence.toFixed(2)} | ${r.source}`,
    );
    if (r.error) console.log(`    ⚠ error: ${r.error}`);
    if (r.action !== r.c.expect.action || r.action === 'draft-for-review') {
      console.log(`    motivos: ${r.reasons.join(' | ')}`);
    }
    r.candidates.forEach((t, i) => console.log(`    ${t === r.reply ? '►' : ' '}[${i}] ${t}`));
  }

  // ── Métricas ───────────────────────────────────────────────────────────────
  const valid = rows.filter((r) => !r.error);
  const kindOk = valid.filter((r) => r.kind === r.c.label.kind).length;
  const actionOk = valid.filter((r) => r.action === r.c.expect.action).length;

  const shouldBeSarcastic = valid.filter((r) => r.c.label.sarcasm !== null);
  const flaggedSarcastic = valid.filter((r) => r.sarcasm !== '-');
  const sarcasmHit = shouldBeSarcastic.filter((r) => r.sarcasm !== '-').length;
  const stanceOk = shouldBeSarcastic.filter((r) => r.sarcasm === r.c.label.sarcasm).length;
  const sarcasmFalsePos = flaggedSarcastic.filter((r) => r.c.label.sarcasm === null).length;

  const overAutonomy = valid.filter((r) => AUTONOMY_RANK[r.action] > AUTONOMY_RANK[r.c.expect.action]);
  const overCaution = valid.filter((r) => AUTONOMY_RANK[r.action] < AUTONOMY_RANK[r.c.expect.action]);

  console.log('\n══════════════ RESUMEN ══════════════');
  console.log(`Tipo correcto ............ ${pct(kindOk, valid.length)}`);
  console.log(`Acción correcta .......... ${pct(actionOk, valid.length)}`);
  console.log(`Sarcasmo detectado ....... ${pct(sarcasmHit, shouldBeSarcastic.length)}  (recall)`);
  console.log(`Postura de sarcasmo ok ... ${pct(stanceOk, shouldBeSarcastic.length)}`);
  console.log(
    `Falsos sarcasmos ......... ${pct(sarcasmFalsePos, flaggedSarcastic.length)} de lo marcado como sarcasmo`,
  );
  console.log(`Sobre-cautela (pide revisión de más) ... ${overCaution.length}`);
  console.log(`SOBRE-AUTONOMÍA (responde solo de más) . ${overAutonomy.length}`);
  for (const r of overAutonomy) {
    console.log(`  ✗ ${r.c.id}: fue ${r.action}, debía ser ${r.c.expect.action}`);
  }
  if (rows.some((r) => r.error)) console.log(`Errores de ejecución: ${rows.filter((r) => r.error).length}`);

  return overAutonomy.length > 0 || rows.some((r) => r.error) ? 1 : 0;
};

run()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
