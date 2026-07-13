import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

export interface AutomationTask {
  id: string;
  accountHandle: string;
  name: string;
  type: 'post' | 'engage' | 'dm' | 'story' | 'follow' | 'like' | 'comment';
  action: {
    content_id?: string;
    message?: string;
    hashtags?: string[];
    target_hashtag?: string;
    target_users?: string[];
    like_count?: number;
    comment_text?: string;
    follow_ratio?: number;
  };
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly' | 'interval';
    start_time: Date;
    end_time?: Date;
    interval_minutes?: number;
    days_of_week?: number[];
    time_of_day?: string;
  };
  status: 'active' | 'paused' | 'completed' | 'failed';
  execution_history: Execution[];
  max_daily_runs?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Execution {
  id: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  result?: string;
  error?: string;
}

export const automationSchedulerService = {
  async createTask(data: Omit<AutomationTask, 'id' | 'execution_history' | 'createdAt' | 'updatedAt'>): Promise<AutomationTask> {
    const task: AutomationTask = {
      ...data,
      id: uuid(),
      execution_history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveTask(task);
    return task;
  },

  async updateTask(id: string, updates: Partial<AutomationTask>): Promise<AutomationTask> {
    const task = await this.loadTask(id);
    if (!task) throw new Error(`Task ${id} not found`);

    const updated: AutomationTask = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveTask(updated);
    return updated;
  },

  async activateTask(id: string): Promise<AutomationTask> {
    return this.updateTask(id, { status: 'active' });
  },

  async pauseTask(id: string): Promise<AutomationTask> {
    return this.updateTask(id, { status: 'paused' });
  },

  async deleteTask(id: string): Promise<void> {
    const path = `/data/automation-tasks/${id}.json`;
    try {
      await fs.unlink(path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  },

  async loadTask(id: string): Promise<AutomationTask | null> {
    const path = `/data/automation-tasks/${id}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as AutomationTask;
      return {
        ...parsed,
        schedule: {
          ...parsed.schedule,
          start_time: new Date(parsed.schedule.start_time),
          end_time: parsed.schedule.end_time ? new Date(parsed.schedule.end_time) : undefined,
        },
        execution_history: parsed.execution_history.map((e) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        })),
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  },

  async saveTask(task: AutomationTask): Promise<void> {
    const dirPath = '/data/automation-tasks';

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }

    const path = `${dirPath}/${task.id}.json`;
    await fs.writeFile(path, JSON.stringify(task, null, 2));
  },

  async listTasks(accountHandle: string, status?: AutomationTask['status']): Promise<AutomationTask[]> {
    const dirPath = '/data/automation-tasks';

    try {
      const files = await fs.readdir(dirPath);
      const tasks: AutomationTask[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const task = await this.loadTask(file.replace('.json', ''));
        if (task && task.accountHandle === accountHandle && (!status || task.status === status)) {
          tasks.push(task);
        }
      }

      return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  },

  async recordExecution(taskId: string, execution: Omit<Execution, 'id'>): Promise<AutomationTask> {
    const task = await this.loadTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.execution_history.push({
      ...execution,
      id: uuid(),
    });

    // Keep only last 100 executions
    if (task.execution_history.length > 100) {
      task.execution_history = task.execution_history.slice(-100);
    }

    task.updatedAt = new Date();
    await this.saveTask(task);

    return task;
  },

  async getExecutionHistory(taskId: string, limit: number = 50): Promise<Execution[]> {
    const task = await this.loadTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    return task.execution_history.slice(-limit);
  },

  async getNextExecution(taskId: string): Promise<Date | null> {
    const task = await this.loadTask(taskId);
    if (!task || task.status !== 'active') return null;

    const schedule = task.schedule;
    const now = new Date();
    const lastExecution = task.execution_history[task.execution_history.length - 1];

    switch (schedule.type) {
      case 'once':
        return schedule.start_time > now ? schedule.start_time : null;

      case 'daily':
        const timeStr = schedule.time_of_day || '09:00';
        const [hours, minutes] = timeStr.split(':').map(Number);
        let next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next;

      case 'weekly':
        if (!schedule.days_of_week || schedule.days_of_week.length === 0) return null;
        let weekNext = new Date(now);
        let daysAdded = 0;
        while (daysAdded < 7) {
          if (schedule.days_of_week.includes(weekNext.getDay())) {
            return weekNext;
          }
          weekNext.setDate(weekNext.getDate() + 1);
          daysAdded++;
        }
        return null;

      case 'interval':
        if (!schedule.interval_minutes) return null;
        if (!lastExecution) return now;
        const nextInterval = new Date(
          lastExecution.timestamp.getTime() + schedule.interval_minutes * 60 * 1000
        );
        return nextInterval > now ? nextInterval : now;

      case 'monthly':
        const monthNext = new Date(now);
        monthNext.setMonth(monthNext.getMonth() + 1);
        monthNext.setDate(1);
        return monthNext;

      default:
        return null;
    }
  },

  async getDailyExecutionCount(taskId: string): Promise<number> {
    const task = await this.loadTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return task.execution_history.filter((e) => e.timestamp >= today).length;
  },

  async canExecute(taskId: string): Promise<boolean> {
    const task = await this.loadTask(taskId);
    if (!task || task.status !== 'active') return false;

    if (task.max_daily_runs) {
      const dailyCount = await this.getDailyExecutionCount(taskId);
      if (dailyCount >= task.max_daily_runs) return false;
    }

    const nextExecution = await this.getNextExecution(taskId);
    if (!nextExecution) return false;

    return new Date() >= nextExecution;
  },
};
