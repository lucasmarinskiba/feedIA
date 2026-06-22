/**
 * Schema and types for user-defined custom playbooks.
 * Playbooks live in data/playbooks/*.json and are hot-reloadable.
 */
import { z } from 'zod';

export const customTaskSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1).describe('ID del agente que ejecuta esta tarea'),
  instructions: z.string().min(1).describe('Prompt/instrucciones específicas para esta tarea'),
  dependsOn: z.array(z.string()).default([]).describe('IDs de tareas que deben completarse antes'),
  tools: z.array(z.string()).default([]).describe('Herramientas permitidas para esta tarea'),
  maxRetries: z.number().min(0).max(3).default(0),
  timeoutMs: z.number().min(5000).max(300000).default(60000),
});

export const customPlaybookSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  version: z.string().default('1.0.0'),
  createdBy: z.string().default('user'),
  tags: z.array(z.string()).default([]),
  tasks: z.array(customTaskSchema).min(1).max(20),
  metadata: z
    .object({
      estimatedDurationMinutes: z.number().min(1).max(240).optional(),
      recommendedFor: z.array(z.string()).default([]),
      autoSchedule: z
        .object({
          enabled: z.boolean().default(false),
          cron: z.string().optional(),
        })
        .default({ enabled: false }),
    })
    .default({}),
});

export type CustomTask = z.infer<typeof customTaskSchema>;
export type CustomPlaybook = z.infer<typeof customPlaybookSchema>;
