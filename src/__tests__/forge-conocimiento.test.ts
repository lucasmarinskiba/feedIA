import { describe, it, expect } from 'vitest';
import {
  RUTA_FUNDACION_30_DIAS,
  angulosPara,
  chequeosEstrategia,
  detectaCta,
  planEstrategia,
  type EntradaChequeo,
} from '../capabilities/forge/conocimientoEstrategia.js';

const entradaBase: EntradaChequeo = {
  objetivo: 'conversion',
  formato: 'carrusel',
  hook: 'Dejá de publicar sin estrategia: esto te cuesta 3 veces más alcance',
  caption: 'Si querés el paso a paso, escribime GUÍA por DM.',
  cuerpoTexto: 'Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5',
  partes: 5,
  hashtagsCount: 8,
  notasInteractivas: '',
};

const pasa = (id: string, e: EntradaChequeo): boolean => chequeosEstrategia(e).find((c) => c.id === id)?.ok ?? false;

describe('detectaCta', () => {
  it('reconoce la CTA del objetivo y no la de otro', () => {
    expect(detectaCta('Escribime GUÍA por DM', 'conversion')).toBe(true);
    expect(detectaCta('Contame tu caso en comentarios', 'conversion')).toBe(false);
    expect(detectaCta('Contame tu caso en comentarios', 'engagement')).toBe(true);
  });
});

describe('chequeosEstrategia', () => {
  it('aprueba una pieza bien armada', () => {
    const chequeos = chequeosEstrategia(entradaBase);
    expect(chequeos.every((c) => c.ok)).toBe(true);
  });

  it('marca hook fuera de rango', () => {
    expect(pasa('hook-largo', { ...entradaBase, hook: 'Corto' })).toBe(false);
    expect(pasa('hook-largo', { ...entradaBase, hook: 'x'.repeat(91) })).toBe(false);
  });

  it('exige hashtags en el rango 5-12 y no los pide para historias', () => {
    expect(pasa('hashtags', { ...entradaBase, hashtagsCount: 3 })).toBe(false);
    expect(pasa('hashtags', { ...entradaBase, hashtagsCount: 13 })).toBe(false);
    const historia = chequeosEstrategia({ ...entradaBase, formato: 'historia', notasInteractivas: 'poll' });
    expect(historia.find((c) => c.id === 'hashtags')).toBeUndefined();
  });

  it('exige interacción en historias', () => {
    const sin = { ...entradaBase, formato: 'historia' as const, notasInteractivas: 'sticker de color' };
    const con = { ...entradaBase, formato: 'historia' as const, notasInteractivas: 'encuesta de sí o no' };
    expect(pasa('interaccion', sin)).toBe(false);
    expect(pasa('interaccion', con)).toBe(true);
  });

  it('controla el largo del carrusel', () => {
    expect(pasa('slides', { ...entradaBase, partes: 3 })).toBe(false);
    expect(pasa('slides', { ...entradaBase, partes: 11 })).toBe(false);
  });
});

describe('angulosPara', () => {
  it('genera ángulos del tema en orden de los ganchos del objetivo, sin repetir categoría', () => {
    const angulos = angulosPara('marketing con IA', 'alcance', 3);
    expect(angulos).toHaveLength(3);
    expect(new Set(angulos.map((a) => a.categoria)).size).toBe(3);
    expect(angulos[0]?.categoria).toBe('secreto-revelado');
    expect(angulos.every((a) => a.texto.includes('marketing con IA'))).toBe(true);
  });
});

describe('planEstrategia', () => {
  it('avisa cuando el formato no es el principal para el objetivo', () => {
    const plan = planEstrategia({
      tema: 'x',
      objetivo: 'ventas',
      formato: 'reel',
      mejorFormatoCuenta: null,
    });
    expect(plan.avisos.some((a) => a.includes('el formato que más sirve es carrusel'))).toBe(true);
    const principal = planEstrategia({ tema: 'x', objetivo: 'ventas', formato: 'carrusel', mejorFormatoCuenta: null });
    expect(principal.avisos).toEqual([]);
  });

  it('usa el formato que rindió mejor en la cuenta sólo si es un formato de Forge', () => {
    const conFormato = planEstrategia({
      tema: 'x',
      objetivo: 'engagement',
      formato: 'carrusel',
      mejorFormatoCuenta: 'reel',
    });
    expect(conFormato.avisos.some((a) => a.includes('rindió mejor con reel'))).toBe(true);
    const conImagen = planEstrategia({
      tema: 'x',
      objetivo: 'engagement',
      formato: 'carrusel',
      mejorFormatoCuenta: 'imagen',
    });
    expect(conImagen.avisos.some((a) => a.includes('imagen'))).toBe(false);
  });

  it('incluye la escalera de CTA y la ruta de 30 días completa', () => {
    const plan = planEstrategia({ tema: 'x', objetivo: 'comunidad', formato: 'historia', mejorFormatoCuenta: null });
    expect(plan.objetivo.ctaEscalera.length).toBeGreaterThanOrEqual(2);
    expect(plan.rutaFundacion).toBe(RUTA_FUNDACION_30_DIAS);
    expect(RUTA_FUNDACION_30_DIAS.reduce((acc, b) => acc + b.piezas, 0)).toBe(20);
  });
});
