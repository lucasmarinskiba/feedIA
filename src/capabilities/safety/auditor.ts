import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import { defaultPolicies, customPolicy, type SafetyPolicy } from './policies.js';

export type SafetyVerdict = 'aprobado' | 'cambios-menores' | 'requiere-revision' | 'bloqueado';

export interface PolicyViolation {
  policy: string;
  razon: string;
  severidad: 'baja' | 'media' | 'alta';
  fragmento: string;
}

export interface SafetyReport {
  veredicto: SafetyVerdict;
  scoreRiesgo: number;
  violaciones: PolicyViolation[];
  ajustesSugeridos: string[];
  versionSegura?: string;
  notas: string;
}

const runDeterministicPolicies = (texto: string, policies: SafetyPolicy[]): PolicyViolation[] => {
  const out: PolicyViolation[] = [];
  for (const p of policies) {
    const r = p.detector(texto);
    if (r.hit) {
      out.push({
        policy: p.nombre,
        razon: r.razon ?? p.descripcion,
        severidad: 'alta',
        fragmento: (r.razon?.match(/"([^"]+)"/) ?? [, ''])[1] ?? '',
      });
    }
  }
  return out;
};

export const auditarPrePublicacion = async (
  brand: BrandProfile,
  contenido: { caption: string; hooks?: string[]; otros?: string[] },
  policiesExtra: SafetyPolicy[] = [],
): Promise<SafetyReport> => {
  const fullText = [contenido.caption, ...(contenido.hooks ?? []), ...(contenido.otros ?? [])].join('\n');

  const brandPolicy = brand.voice.forbidden.length
    ? [customPolicy('voz-marca-prohibido', 'Términos prohibidos por la voz de marca.', brand.voice.forbidden)]
    : [];

  const allPolicies = [...defaultPolicies, ...brandPolicy, ...policiesExtra];
  const violacionesDeterministas = runDeterministicPolicies(fullText, allPolicies);

  const prompt = `Actuá como auditor de marca y compliance previo a publicar en Instagram.

${brandContext(brand)}

CONTENIDO A PUBLICAR:
"""
${fullText.slice(0, 8000)}
"""

VIOLACIONES DETERMINISTAS YA DETECTADAS:
${violacionesDeterministas.length ? JSON.stringify(violacionesDeterministas, null, 2) : '(ninguna)'}

Sumá tu análisis de riesgos que un regex no detecta:
- Tono que pueda leerse como ofensivo o tone-deaf en el contexto actual.
- Promesa de resultado que no podemos sostener.
- Datos sin fuente que parecen estadísticos.
- Comparación con competencia que pueda ser difamatoria.
- Riesgos de copyright (citas largas, lyrics).

Veredictos:
- "aprobado": cero riesgo.
- "cambios-menores": el contenido sirve, sólo ajustes de palabras.
- "requiere-revision": un humano debe leerlo antes.
- "bloqueado": no publicar como está.

Score 0-100 de riesgo (0 = nada, 100 = catastrófico).

Si veredicto != aprobado y los ajustes son menores, generá una "versionSegura" del caption.

JSON:
{
  "veredicto": "aprobado|cambios-menores|requiere-revision|bloqueado",
  "scoreRiesgo": 0,
  "violaciones": [
    { "policy": "...", "razon": "...", "severidad": "baja|media|alta", "fragmento": "..." }
  ],
  "ajustesSugeridos": ["..."],
  "versionSegura": "caption corregido o null",
  "notas": "..."
}`;
  const llmReport = await askJson<SafetyReport>(prompt, { maxTokens: 3000 });
  llmReport.violaciones = [...violacionesDeterministas, ...llmReport.violaciones];

  if (violacionesDeterministas.some((v) => v.severidad === 'alta')) {
    if (llmReport.veredicto === 'aprobado') llmReport.veredicto = 'requiere-revision';
    llmReport.scoreRiesgo = Math.max(llmReport.scoreRiesgo, 70);
  }
  return llmReport;
};
