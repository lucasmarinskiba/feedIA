import { Router, Request, Response } from 'express';
import {
  automationSchedulerService,
  AutomationTask,
  Execution,
} from '../services/automation-scheduler-service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as Omit<AutomationTask, 'id' | 'execution_history' | 'createdAt' | 'updatedAt'>;

    if (!data.accountHandle || !data.name || !data.type) {
      res.status(400).json({
        error: 'Missing required fields: accountHandle, name, type',
      });
      return;
    }

    const task = await automationSchedulerService.createTask(data);

    res.status(201).json({ ok: true, task });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Task creation failed: ${error}` });
    return;
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const status = req.query.status as AutomationTask['status'] | undefined;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const tasks = await automationSchedulerService.listTasks(accountHandle, status);

    res.json({ ok: true, tasks });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Task listing failed: ${error}` });
    return;
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const task = await automationSchedulerService.loadTask(id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ ok: true, task });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Task load failed: ${error}` });
    return;
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const updates = req.body as Partial<AutomationTask>;

    const task = await automationSchedulerService.updateTask(id, updates);

    res.json({ ok: true, task });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Task update failed: ${error}` });
    return;
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    await automationSchedulerService.deleteTask(id);

    res.json({ ok: true, deleted: true });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Task deletion failed: ${error}` });
    return;
  }
});

router.post('/:id/activate', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const task = await automationSchedulerService.activateTask(id);

    res.json({ ok: true, task });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Task activation failed: ${error}` });
    return;
  }
});

router.post('/:id/pause', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const task = await automationSchedulerService.pauseTask(id);

    res.json({ ok: true, task });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Task pause failed: ${error}` });
    return;
  }
});

router.post('/:id/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const execution = req.body as Omit<Execution, 'id'>;

    const task = await automationSchedulerService.recordExecution(id, execution);

    res.status(201).json({ ok: true, task });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Execution recording failed: ${error}` });
    return;
  }
});

router.get('/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await automationSchedulerService.getExecutionHistory(id, limit);

    res.json({ ok: true, history });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `History fetch failed: ${error}` });
    return;
  }
});

router.get('/:id/next-execution', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const nextExecution = await automationSchedulerService.getNextExecution(id);

    res.json({ ok: true, nextExecution });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Next execution fetch failed: ${error}` });
    return;
  }
});

router.get('/:id/can-execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const canExecute = await automationSchedulerService.canExecute(id);

    res.json({ ok: true, canExecute });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Can execute check failed: ${error}` });
    return;
  }
});

router.get('/:id/daily-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const count = await automationSchedulerService.getDailyExecutionCount(id);

    res.json({ ok: true, count });
    return;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Daily count fetch failed: ${error}` });
    return;
  }
});

export default router;
