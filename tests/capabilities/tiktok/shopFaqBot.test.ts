import { beforeEach, describe, expect, it } from 'vitest';
import {
  AI_DISCLOSURE_PREFIX,
  buildShopFaqReply,
  classifyShopFaqTopic,
  findCatalogMatch,
  respondToShopFaq,
  type ShopFaqCatalog,
} from '../../../src/capabilities/tiktok/shopFaqBot.js';
import { configureRateLimitStore } from '../../../src/compliance/rateLimiter.js';

const catalog: ShopFaqCatalog = {
  entries: [
    { sku: 'SKU-1', name: 'Serum Vitamina C', price: '$8.500', stock: 'in-stock', aliases: ['serum', 'vitamina c'] },
    { sku: 'SKU-2', name: 'Crema Hidratante', price: '$6.200', stock: 'out-of-stock', aliases: ['crema'] },
  ],
  shippingInfo: 'Envíos a todo el país en 3-5 días hábiles.',
  hoursInfo: 'Atendemos de lunes a viernes de 9 a 18h.',
};

beforeEach(() => {
  configureRateLimitStore(null);
});

describe('classifyShopFaqTopic', () => {
  it.each([
    ['saludo', 'hola!'],
    ['precio', '¿cuánto cuesta el serum?'],
    ['stock', '¿hay stock de la crema?'],
    ['envio', '¿cuánto demora el envío?'],
    ['horario', '¿qué horario tienen?'],
    ['desconocido', 'quiero cancelar mi suscripción de otra cosa'],
  ])('clasifica "%s" para "%s"', (expected, text) => {
    expect(classifyShopFaqTopic(text)).toBe(expected);
  });
});

describe('findCatalogMatch', () => {
  it('matchea por alias, sin importar mayúsculas/acentos', () => {
    expect(findCatalogMatch('cuanto sale el SERUM?', catalog)?.sku).toBe('SKU-1');
  });

  it('sin match, devuelve undefined', () => {
    expect(findCatalogMatch('el producto inventado', catalog)).toBeUndefined();
  });
});

describe('buildShopFaqReply (TT-SHOP-001: siempre etiquetado como IA, datos SOLO del catálogo fijo)', () => {
  it('precio: responde el precio exacto del catálogo, con disclosure', () => {
    const reply = buildShopFaqReply({ senderId: 'u1', text: '¿cuánto cuesta el serum?' }, catalog);
    expect(reply.text.startsWith(AI_DISCLOSURE_PREFIX)).toBe(true);
    expect(reply.text).toContain('$8.500');
    expect(reply.matchedSku).toBe('SKU-1');
    expect(reply.shouldEscalate).toBe(false);
  });

  it('stock: responde el estado exacto del catálogo', () => {
    const reply = buildShopFaqReply({ senderId: 'u1', text: 'hay stock de la crema?' }, catalog);
    expect(reply.text).toMatch(/agotado/i);
    expect(reply.matchedSku).toBe('SKU-2');
  });

  it('precio de un producto que no está en el catálogo: nunca inventa, escala a humano', () => {
    const reply = buildShopFaqReply({ senderId: 'u1', text: 'cuanto sale el producto fantasma?' }, catalog);
    expect(reply.matchedSku).toBeUndefined();
    expect(reply.shouldEscalate).toBe(true);
    expect(reply.text.startsWith(AI_DISCLOSURE_PREFIX)).toBe(true);
  });

  it('envío: usa el texto fijo de shippingInfo', () => {
    const reply = buildShopFaqReply({ senderId: 'u1', text: 'cuanto demora el envio' }, catalog);
    expect(reply.text).toContain(catalog.shippingInfo);
    expect(reply.shouldEscalate).toBe(false);
  });

  it('sin shippingInfo cargado, escala en vez de inventar', () => {
    const reply = buildShopFaqReply({ senderId: 'u1', text: 'como es el envio' }, { entries: catalog.entries });
    expect(reply.shouldEscalate).toBe(true);
  });

  it('saludo: menú con los productos del catálogo', () => {
    const reply = buildShopFaqReply({ senderId: 'u1', text: 'hola' }, catalog);
    expect(reply.text).toContain('Serum Vitamina C');
    expect(reply.text).toContain('Crema Hidratante');
  });
});

describe('respondToShopFaq (gateado por tiktokGuardian: catalog_send)', () => {
  it('genera y permite una respuesta a quien escribió primero', () => {
    const result = respondToShopFaq({ senderId: 'tt-shop-user-1', text: '¿precio del serum?' }, catalog);
    expect(result.sent).toBe(true);
    expect(result.text?.startsWith(AI_DISCLOSURE_PREFIX)).toBe(true);
  });

  it('nunca envía sin senderId (TT-BIZ-001, mismo gate que business_dm_reply)', () => {
    const result = respondToShopFaq({ senderId: '', text: 'hola' }, catalog);
    expect(result.sent).toBe(false);
    expect(result.reason).toMatch(/TT-BIZ-001/);
  });

  it('dos respuestas seguidas al mismo usuario: la segunda queda bloqueada por espaciado mínimo', () => {
    const first = respondToShopFaq({ senderId: 'same-shop-user', text: 'hola' }, catalog);
    expect(first.sent).toBe(true);
    const second = respondToShopFaq({ senderId: 'same-shop-user', text: 'otra vez' }, catalog);
    expect(second.sent).toBe(false);
  });
});
