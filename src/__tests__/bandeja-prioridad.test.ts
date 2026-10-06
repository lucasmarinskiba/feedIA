import { describe, it, expect } from 'vitest';
import type { Conversation } from '../capabilities/community/dmInbox.js';
import { priorizarBandeja } from '../capabilities/executive/herramientasEjecutivo.js';

const conversacion = (usuario: string, status: 'new' | 'escalated' | 'archived', texto: string): Conversation =>
  ({
    id: `c-${usuario}`,
    contact: { username: usuario, isFollower: false, isFollowing: false },
    messages: [{ id: `m-${usuario}`, timestamp: '2026-10-06T10:00:00.000Z', sender: 'them', text: texto }],
    status,
  }) as unknown as Conversation;

describe('priorizarBandeja', () => {
  it('pone primero las escaladas por riesgo y después los leads', () => {
    const lista = priorizarBandeja([
      conversacion('lead_ana', 'new', 'Hola, quiero saber cuánto cuesta reservar un turno hoy?'),
      conversacion('riesgo_luis', 'new', 'Me duele mucho después del tratamiento'),
      conversacion('pregunta_eva', 'new', '¿Dónde están ubicados?'),
    ]);
    expect(lista.map((p) => p.usuario)).toEqual(['riesgo_luis', 'lead_ana', 'pregunta_eva']);
    expect(lista[0]?.triaje.accion).toBe('escalar');
  });

  it('una conversación escalada por el equipo queda como escalar aunque el texto sea neutro', () => {
    const lista = priorizarBandeja([conversacion('equipo_sol', 'escalated', 'Gracias, sigo esperando')]);
    expect(lista[0]?.triaje.accion).toBe('escalar');
  });

  it('descarta el spam y las conversaciones archivadas', () => {
    const lista = priorizarBandeja([
      conversacion('spam_max', 'new', 'Gana dinero desde tu casa, haz clic ahora'),
      conversacion('viejo_tim', 'archived', '¿Hacen envíos?'),
    ]);
    expect(lista).toEqual([]);
  });
});
