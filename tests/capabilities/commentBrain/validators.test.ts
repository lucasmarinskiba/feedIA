import { describe, expect, it } from 'vitest';
import {
  hasBlockingIssue,
  similarity,
  validateReply,
  type ValidateOptions,
} from '../../../src/capabilities/commentBrain/validators.js';
import { cleanVerdict, makeBrand } from './helpers.js';

const opts = (over: Partial<ValidateOptions> = {}): ValidateOptions => ({
  brand: makeBrand(),
  commenterHandle: 'vecina_23',
  recentReplies: [],
  facts: [],
  promiseVerdict: cleanVerdict,
  ...over,
});

const codes = (text: string, over: Partial<ValidateOptions> = {}): string[] =>
  validateReply(text, opts(over)).map((i) => i.code);

describe('validateReply', () => {
  it('acepta una respuesta corta, limpia y con voz humana', () => {
    expect(validateReply('Ni las zapatillas se animan a discutirte eso 😄', opts())).toEqual([]);
  });

  it('bloquea vacío y exceso de largo', () => {
    expect(codes('   ')).toContain('vacio');
    expect(codes('a'.repeat(300))).toContain('muy-largo');
  });

  it('bloquea palabras prohibidas de la marca, sin distinguir acentos ni mayúsculas', () => {
    expect(codes('Es BARATO para lo que ofrece')).toContain('palabra-prohibida');
    expect(codes('Queda regalado, no es gratis eh')).toContain('palabra-prohibida');
  });

  it('no confunde subcadenas con palabras prohibidas', () => {
    expect(codes('Un abaratamiento sería un error')).not.toContain('palabra-prohibida');
  });

  it.each([
    ['link', 'Mirá en www.zapatosnorte.com'],
    ['dominio suelto', 'Escribinos a zapatosnorte.com.ar'],
    ['mail', 'Mandanos a hola@zapatosnorte.com'],
    ['teléfono', 'Llamanos al 11 5555 1234 hoy'],
  ])('bloquea contacto/link: %s', (_n, text) => {
    expect(codes(text)).toContain('contacto-o-link');
  });

  it('bloquea hashtags y menciones a terceros, pero permite mencionar a quien comenta', () => {
    expect(codes('Buenísimo #zapatos')).toContain('hashtag');
    expect(codes('Etiquetá a @otra_cuenta y listo')).toContain('mencion-ajena');
    expect(codes('Gracias @vecina_23, se agradece')).not.toContain('mencion-ajena');
  });

  it('bloquea precios que no estén respaldados por hechos verificados', () => {
    expect(codes('Salen $45.000 en negro')).toContain('precio-no-verificado');
    expect(codes('Salen $45.000 en negro', { facts: ['Precio de lista: $45.000'] })).not.toContain(
      'precio-no-verificado',
    );
  });

  it('bloquea frases que delatan a un bot', () => {
    expect(codes('Como inteligencia artificial no puedo opinar')).toContain('delata-ia');
    expect(codes('Soy un asistente virtual de la marca')).toContain('delata-ia');
  });

  it('bloquea gritos (mayúsculas sostenidas) pero no una sigla suelta', () => {
    expect(codes('GRACIAS POR ESTO QUE ES INCREÍBLE')).toContain('gritando');
    expect(codes('Gracias, esto va directo a la lista de la ONU')).not.toContain('gritando');
  });

  it('bloquea promesas duras y avisa las blandas', () => {
    expect(codes('Garantizado, vas a quedar feliz', { promiseVerdict: () => 'hard-promise' })).toContain(
      'promesa-dura',
    );
    const soft = validateReply('El mejor calzado', opts({ promiseVerdict: () => 'soft-promise' }));
    expect(soft.find((i) => i.code === 'promesa-blanda')?.severity).toBe('warn');
    expect(hasBlockingIssue(soft)).toBe(false);
  });

  it('bloquea respuestas calcadas a las recientes (patrón de bot)', () => {
    const recent = ['Gracias por el cariño, nos alegra que te guste el trabajo del equipo'];
    expect(
      codes('Gracias por el cariño, nos alegra que te guste el trabajo del equipo!', { recentReplies: recent }),
    ).toContain('repetida');
    expect(codes('Uh, qué lindo leer eso un lunes', { recentReplies: recent })).not.toContain('repetida');
  });

  it('avisa (sin bloquear) exceso de emojis y arranque de call center', () => {
    const issues = validateReply('Gracias por tu comentario 😀😀😀', opts());
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(['muchos-emojis', 'tono-corporativo']));
    expect(hasBlockingIssue(issues)).toBe(false);
  });
});

describe('similarity', () => {
  it('es 1 para textos idénticos, ~0 para textos sin vocabulario común', () => {
    expect(similarity('hola mundo cruel', 'hola mundo cruel')).toBe(1);
    expect(similarity('zapatillas negras livianas', 'camisetas blancas estampadas')).toBe(0);
  });

  it('ignora acentos, mayúsculas y palabras cortas', () => {
    expect(similarity('Qué LINDO día', 'que lindo dia')).toBe(1);
  });
});
