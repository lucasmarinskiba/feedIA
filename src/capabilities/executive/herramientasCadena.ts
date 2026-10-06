/**
 * Cadena entre herramientas IA: qué herramienta puede seguir a otra, cómo se resume una creación para
 * usarla como material de la siguiente y qué valores se heredan. Función pura.
 */

import type { CampoHerramienta, MaterialPrevio, ResultadoHerramienta } from './herramientasCatalogo.js';

const CADENA: Record<string, string[]> = {
  ideas: ['hooks', 'guion', 'carrusel', 'stories'],
  hooks: ['caption', 'guion', 'carrusel'],
  guion: ['repurpose', 'carrusel', 'caption'],
  carrusel: ['repurpose', 'caption', 'safety'],
  caption: ['safety', 'repurpose'],
  repurpose: ['caption', 'safety'],
  hashtags: ['caption', 'safety'],
  brief: ['plan', 'okr', 'experimento', 'ideas'],
  plan: ['stories', 'calendario-inteligente', 'ideas'],
  stories: ['hooks', 'ideas'],
  okr: ['experimento', 'brief'],
  experimento: ['metricas'],
  metricas: ['okr', 'experimento', 'brief'],
  bandeja: ['respuestas', 'digest'],
  respuestas: ['perfil'],
  digest: ['okr', 'brief'],
};

const LIMITE_MATERIAL = 1500;
const ALIAS: ReadonlyArray<readonly [string, string]> = [
  ['idea', 'tema'],
  ['tema', 'idea'],
];

export const siguientesDe = (herramientaId: string): string[] =>
  Object.prototype.hasOwnProperty.call(CADENA, herramientaId) ? (CADENA[herramientaId] ?? []) : [];

interface CreacionParaMaterial {
  id: string;
  herramientaId: string;
  nombre: string;
  resultado: ResultadoHerramienta;
}

export const materialDe = (creacion: CreacionParaMaterial): MaterialPrevio => {
  const bloques = creacion.resultado.secciones.map((s) => {
    const cuerpo = Array.isArray(s.contenido) ? s.contenido.map((i) => `- ${i}`).join('\n') : s.contenido;
    return `${s.titulo}:\n${cuerpo}`;
  });
  const texto = [creacion.resultado.titulo, ...bloques].join('\n\n');
  return {
    creacionId: creacion.id,
    herramientaId: creacion.herramientaId,
    nombre: creacion.nombre,
    titulo: creacion.resultado.titulo,
    texto: texto.length > LIMITE_MATERIAL ? `${texto.slice(0, LIMITE_MATERIAL - 1)}…` : texto,
  };
};

export const valoresHeredados = (
  origen: Record<string, string | number>,
  campos: CampoHerramienta[],
): Record<string, string | number> => {
  const salida: Record<string, string | number> = {};
  for (const campo of campos) {
    const candidatos = [campo.id, ...ALIAS.filter(([, hacia]) => hacia === campo.id).map(([de]) => de)];
    const valor = candidatos.map((id) => origen[id]).find((v) => v !== undefined);
    if (valor === undefined) continue;
    if (campo.tipo === 'numero') {
      if (typeof valor === 'number') salida[campo.id] = valor;
      continue;
    }
    if (typeof valor !== 'string') continue;
    if (campo.tipo === 'select' && !(campo.opciones ?? []).includes(valor)) continue;
    salida[campo.id] = valor;
  }
  return salida;
};
