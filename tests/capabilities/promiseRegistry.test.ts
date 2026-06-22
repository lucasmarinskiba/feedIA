/**
 * Tests básicos para Promise Registry
 */
import { describe, it, expect } from 'vitest';
import {
  createPromise,
  getPromise,
  updatePromise,
  listPromises,
  cancelPromise,
} from '../../src/capabilities/promiseRegistry/promiseRegistry.js';

const TEST_CLIENT = 'test-client-001';

describe('PromiseRegistry', () => {
  it('createPromise retorna una promesa activa', () => {
    const promise = createPromise({
      clientId: TEST_CLIENT,
      clientName: 'Test Client',
      title: '+500 seguidores en 30 días',
      description: 'Crecimiento orgánico de cuenta',
      category: 'growth',
      metric: { metric: 'followers', target: 500, unit: 'seguidores', baseline: 0 },
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      compensation: { type: 'credit_pct', value: 50, description: '50% descuento mes siguiente' },
    });

    expect(promise.id).toMatch(/^prom-/);
    expect(promise.status).toBe('active');
    expect(promise.progress).toBe(0);
    expect(promise.clientId).toBe(TEST_CLIENT);
  });

  it('getPromise recupera una promesa creada', () => {
    const promise = createPromise({
      clientId: TEST_CLIENT,
      clientName: 'Test Client',
      title: 'Test getPromise',
      description: 'Desc',
      category: 'growth',
      metric: { metric: 'followers', target: 100, unit: 'seguidores', baseline: 0 },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      compensation: { type: 'credit_pct', value: 10, description: '10% descuento' },
    });

    const fetched = getPromise(promise.id);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe(promise.title);
  });

  it('updatePromise actualiza campos', () => {
    const promise = createPromise({
      clientId: TEST_CLIENT,
      clientName: 'Test Client',
      title: 'Test updatePromise',
      description: 'Desc',
      category: 'growth',
      metric: { metric: 'followers', target: 100, unit: 'seguidores', baseline: 0 },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      compensation: { type: 'credit_pct', value: 10, description: '10% descuento' },
    });

    const updated = updatePromise(promise.id, { progress: 45 });
    expect(updated).toBeDefined();
    expect(updated?.progress).toBe(45);
  });

  it('listPromises filtra por cliente', () => {
    const all = listPromises({ clientId: TEST_CLIENT });
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('cancelPromise cambia el estado', () => {
    const promise = createPromise({
      clientId: TEST_CLIENT,
      clientName: 'Test Client',
      title: 'Test cancelPromise',
      description: 'Desc',
      category: 'growth',
      metric: { metric: 'followers', target: 100, unit: 'seguidores', baseline: 0 },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      compensation: { type: 'credit_pct', value: 10, description: '10% descuento' },
    });

    const cancelled = cancelPromise(promise.id, 'Test cleanup');
    expect(cancelled).toBeDefined();
    expect(cancelled?.status).toBe('cancelled');
  });
});
