/**
 * CU Executor Engine — ejecuta workflows chained con state machine.
 *
 * Cada workflow corre como JobRun con steps tracked:
 *   pending → running → done | failed | skipped
 *
 * Persistencia en KV → user puede pausar/resumir.
 * Genera bundle final ejecutable por agente CU real o copy-paste manual.
 */

import * as store from './_store.js';
import { getSessionFromReq } from './_users.js';
import { MASTER_WORKFLOWS } from './_cuMasterOrchestrator.js';
import { CU_RECIPES } from './_cuRecipeLibrary.js';

export const startWorkflowRun = async ({ userId, workflowId }) => {
  const workflow = MASTER_WORKFLOWS[workflowId];
  if (!workflow) throw new Error('workflow not found');
  const runId = `wfr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const run = {
    runId,
    workflowId,
    userId,
    label: workflow.label,
    startedAt: new Date().toISOString(),
    status: 'running',
    currentStep: 0,
    totalSteps: workflow.chain.length,
    steps: workflow.chain.map((s, i) => ({
      n: i + 1,
      ...s,
      recipeDetail: CU_RECIPES[s.recipe] || null,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      output: null,
      error: null,
    })),
    finalBundle: null,
  };
  await store.set(`feedia:user:${userId}:wfrun:${runId}`, run);
  await store.lpush(`feedia:user:${userId}:wfruns`, runId);
  return run;
};

export const advanceWorkflowStep = async ({ userId, runId, stepOutput }) => {
  const run = await store.get(`feedia:user:${userId}:wfrun:${runId}`);
  if (!run) throw new Error('run not found');
  if (run.status !== 'running') return run;
  const stepIdx = run.currentStep;
  const step = run.steps[stepIdx];
  if (!step) {
    run.status = 'done';
    run.completedAt = new Date().toISOString();
    run.finalBundle = composeFinalBundle(run);
  } else {
    step.status = 'done';
    step.completedAt = new Date().toISOString();
    step.output = stepOutput || null;
    run.currentStep = stepIdx + 1;
    if (run.currentStep >= run.totalSteps) {
      run.status = 'done';
      run.completedAt = new Date().toISOString();
      run.finalBundle = composeFinalBundle(run);
    }
  }
  await store.set(`feedia:user:${userId}:wfrun:${runId}`, run);
  return run;
};

export const skipWorkflowStep = async ({ userId, runId, reason }) => {
  const run = await store.get(`feedia:user:${userId}:wfrun:${runId}`);
  if (!run) throw new Error('run not found');
  const step = run.steps[run.currentStep];
  if (step) {
    step.status = 'skipped';
    step.error = reason || 'manual skip';
  }
  run.currentStep += 1;
  if (run.currentStep >= run.totalSteps) {
    run.status = 'done';
    run.finalBundle = composeFinalBundle(run);
  }
  await store.set(`feedia:user:${userId}:wfrun:${runId}`, run);
  return run;
};

export const pauseWorkflow = async ({ userId, runId }) => {
  const run = await store.get(`feedia:user:${userId}:wfrun:${runId}`);
  if (!run) throw new Error('run not found');
  run.status = 'paused';
  await store.set(`feedia:user:${userId}:wfrun:${runId}`, run);
  return run;
};

export const resumeWorkflow = async ({ userId, runId }) => {
  const run = await store.get(`feedia:user:${userId}:wfrun:${runId}`);
  if (!run) throw new Error('run not found');
  run.status = 'running';
  await store.set(`feedia:user:${userId}:wfrun:${runId}`, run);
  return run;
};

export const listUserRuns = async ({ userId, limit = 20 }) => {
  const runIds = await store.lrange(`feedia:user:${userId}:wfruns`, 0, limit);
  const runs = [];
  for (const id of runIds) {
    const r = await store.get(`feedia:user:${userId}:wfrun:${id}`);
    if (r)
      runs.push({
        runId: r.runId,
        workflowId: r.workflowId,
        label: r.label,
        status: r.status,
        currentStep: r.currentStep,
        totalSteps: r.totalSteps,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      });
  }
  return runs;
};

const composeFinalBundle = (run) => ({
  summary: `${run.label} — ${run.totalSteps} steps`,
  completedSteps: run.steps.filter((s) => s.status === 'done').length,
  skippedSteps: run.steps.filter((s) => s.status === 'skipped').length,
  failedSteps: run.steps.filter((s) => s.status === 'failed').length,
  totalDurationMs: run.completedAt ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime() : 0,
  artifacts: run.steps.filter((s) => s.output).map((s) => ({ step: s.n, action: s.action, output: s.output })),
  nextRoutine: 'Repetir workflow cada [cadence] para consistency',
});

export const generateExecutionBundle = ({ workflowId }) => {
  const w = MASTER_WORKFLOWS[workflowId];
  if (!w) return null;
  const bundle = [];
  bundle.push(
    `# ${w.label}\n\nGoal: ${w.goal}\nDías: ${w.estimatedDays} · Min total: ${w.estimatedTotalMin}\n\n## Pasos\n`,
  );
  w.chain.forEach((step, i) => {
    const recipe = CU_RECIPES[step.recipe];
    bundle.push(`\n### Paso ${i + 1}${step.day ? ` (día ${step.day})` : ''}: ${recipe?.label || step.recipe}\n`);
    bundle.push(`Tool: ${step.tool}\nPor qué: ${step.why}\n`);
    if (recipe?.steps) {
      bundle.push('\nAcciones:\n');
      recipe.steps.forEach((s) =>
        bundle.push(
          `  ${s.n || s.step || ''}. ${s.icon || '•'} ${s.action || s.label || ''}${s.detail ? ` — ${typeof s.detail === 'string' ? s.detail : ''}` : ''}\n`,
        ),
      );
    }
  });
  bundle.push(`\n## Métricas de éxito\n${(w.successMetrics || []).map((m) => `- ${m}`).join('\n')}\n`);
  return bundle.join('');
};

export const handleCuExecutor = async (req, res, path, m, body) => {
  const json = (code, b) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(b));
  };
  const url = new URL(req.url || '/', 'http://x');

  if (path === '/api/cu/run/start' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    try {
      const run = await startWorkflowRun({ userId: ctx.user.id, workflowId: (body || {}).workflowId });
      return (json(200, run), true);
    } catch (e) {
      return (json(400, { error: String(e.message || e) }), true);
    }
  }

  if (path === '/api/cu/run/advance' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const run = await advanceWorkflowStep({
      userId: ctx.user.id,
      runId: (body || {}).runId,
      stepOutput: (body || {}).stepOutput,
    });
    return (json(200, run), true);
  }

  if (path === '/api/cu/run/skip' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const run = await skipWorkflowStep({ userId: ctx.user.id, runId: (body || {}).runId, reason: (body || {}).reason });
    return (json(200, run), true);
  }

  if (path === '/api/cu/run/pause' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const run = await pauseWorkflow({ userId: ctx.user.id, runId: (body || {}).runId });
    return (json(200, run), true);
  }

  if (path === '/api/cu/run/resume' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const run = await resumeWorkflow({ userId: ctx.user.id, runId: (body || {}).runId });
    return (json(200, run), true);
  }

  if (path === '/api/cu/runs' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const runs = await listUserRuns({ userId: ctx.user.id });
    return (json(200, { runs, count: runs.length }), true);
  }

  if (path === '/api/cu/run/detail' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const runId = url.searchParams.get('runId');
    const run = await store.get(`feedia:user:${ctx.user.id}:wfrun:${runId}`);
    if (!run) return (json(404, { error: 'run not found' }), true);
    return (json(200, run), true);
  }

  if (path === '/api/cu/bundle' && m === 'GET') {
    const workflowId = url.searchParams.get('workflowId');
    const bundle = generateExecutionBundle({ workflowId });
    if (!bundle) return (json(404, { error: 'workflow not found' }), true);
    res.setHeader('content-type', 'text/markdown; charset=utf-8');
    res.end(bundle);
    return true;
  }

  return false;
};
