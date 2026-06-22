/**
 * Tests básicos para Accountability Engine
 */
import { describe, it, expect } from 'vitest';
import { getAccountabilitySnapshot } from '../../src/capabilities/accountabilityEngine/accountabilityEngine.js';
import { escalateToHuman } from '../../src/capabilities/accountabilityEngine/escalationRouter.js';
import { runRemediation } from '../../src/capabilities/accountabilityEngine/remediationProtocol.js';
import type { PromiseContract } from '../../src/capabilities/promiseRegistry/promiseRegistry.js';

const mockBrand = {
  id: 'test-brand',
  name: 'Test Brand',
  type: 'empresa' as const,
  niche: 'tecnología',
  audience: { description: 'Test', pains: [], desires: [], locale: 'es-AR' },
  voice: { tone: ['directo'], forbidden: [], referenceQuotes: [] },
  visual: { palette: [], typography: [], style: 'minimalista' },
  goals: { primary: 'awareness' as const, metricsToWatch: [] },
  competitors: [],
};

const mockPromise: PromiseContract = {
  id: 'prom-test-001',
  clientId: 'client-001',
  clientName: 'Test Client',
  title: 'Test Promise',
  description: 'Desc',
  category: 'growth',
  metric: { metric: 'followers', target: 100, unit: 'seguidores', baseline: 0 },
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  compensation: { type: 'refund_pct', value: 100, description: 'Full refund' },
  status: 'at-risk',
  progress: 10,
  remediationCount: 2,
  autoRemediationEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: [],
  goalIds: [],
};

describe('AccountabilityEngine', () => {
  it('getAccountabilitySnapshot retorna métricas numéricas', () => {
    const snapshot = getAccountabilitySnapshot();
    expect(typeof snapshot.active).toBe('number');
    expect(typeof snapshot.avgRiskScore).toBe('number');
  });

  it('escalateToHuman crea un checkpoint', () => {
    const escalation = escalateToHuman(mockPromise, mockBrand);
    expect(escalation.checkpointId).toMatch(/^cp-/);
    expect(escalation.promiseId).toBe(mockPromise.id);
  });

  it('runRemediation retorna acciones en dry-run', async () => {
    const remediation = await runRemediation(mockPromise, mockBrand);
    expect(Array.isArray(remediation.actions)).toBe(true);
    expect(remediation.promiseId).toBe(mockPromise.id);
  });
});
