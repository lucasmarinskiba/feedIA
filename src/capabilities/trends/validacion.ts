import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface ValidacionAngulo {
  angulo: string;
  veredicto: 'subir' | 'descartar' | 'pivotear';
  razon: string;
  pivote?: string;
  riesgos: string[];
}

export const validarAngulos = async (brand: BrandProfile, angulos: string[]): Promise<ValidacionAngulo[]> => {
  const prompt = `Actuá como filtro de calidad antes de publicar.

${brandContext(brand)}

ÁNGULOS A VALIDAR:
${angulos.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Para cada uno decidí: subir tal cual, descartar, o pivotear. Considerá:
- ¿Encaja con la voz de marca o suena prestada?
- ¿Es ético dado el público objetivo?
- ¿Hay riesgo de quemar audiencia (clickbait, controversia barata)?
- ¿La ejecución es realista sin recursos avanzados?

JSON: array con un objeto por ángulo:
[
  {
    "angulo": "el ángulo evaluado",
    "veredicto": "subir|descartar|pivotear",
    "razon": "explicación clara",
    "pivote": "solo si veredicto=pivotear, cómo modificarlo",
    "riesgos": ["riesgo 1", "riesgo 2"]
  }
]`;
  return askJson<ValidacionAngulo[]>(prompt, { maxTokens: 3000 });
};
