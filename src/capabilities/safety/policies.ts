export interface SafetyPolicy {
  nombre: string;
  descripcion: string;
  detector: (texto: string) => { hit: boolean; razon?: string };
}

const buildRegexPolicy = (nombre: string, descripcion: string, patterns: RegExp[]): SafetyPolicy => ({
  nombre,
  descripcion,
  detector: (texto): { hit: boolean; razon?: string } => {
    for (const re of patterns) {
      const m = texto.match(re);
      if (m) return { hit: true, razon: `Match: "${m[0]}"` };
    }
    return { hit: false };
  },
});

export const defaultPolicies: SafetyPolicy[] = [
  buildRegexPolicy('datos-personales', 'No publicar datos identificables (DNI, CUIT, tarjetas, teléfonos completos).', [
    /\b\d{7,8}\b\s*[-\s]?\s*\d{1}\b/,
    /\b\d{2}-?\d{8}-?\d\b/,
    /\b(?:\d[ -]*?){13,16}\b/,
    /\+\d{2,3}\s*\d{2,4}\s*\d{4}\s*\d{4}/,
  ]),
  buildRegexPolicy('promesas-absolutas', 'Evitar lenguaje que prometa resultados garantizados.', [
    /\b(garantizado|guaranteed|100\s*%\s*efectivo|sin riesgo|asegurado al 100)/i,
    /\bduplica?\s+tus\s+ventas\b/i,
  ]),
  buildRegexPolicy('palabras-guru', 'Lenguaje gurú que la marca rechaza.', [
    /\b(gurú|guru|secreto revelado|fórmula mágica|trucazo|literalmente|rompiéndola)\b/i,
  ]),
  buildRegexPolicy('controversia-politica', 'Evitar tomar posiciones políticas no relevantes al nicho.', [
    /\b(milei|macri|kirchner|alberto|massa|cfk|comunismo|izquierda|derecha radical)\b/i,
  ]),
  buildRegexPolicy('lenguaje-medico-legal', 'No dar consejo médico/legal/financiero específico sin disclaimer.', [
    /\b(curar?|tratamiento garantizado|reemplaza al médico|asesoramiento legal|consejo financiero)\b/i,
  ]),
];

export const customPolicy = (nombre: string, descripcion: string, forbiddenPhrases: string[]): SafetyPolicy => ({
  nombre,
  descripcion,
  detector: (texto): { hit: boolean; razon?: string } => {
    const lower = texto.toLowerCase();
    for (const phrase of forbiddenPhrases) {
      if (lower.includes(phrase.toLowerCase())) {
        return { hit: true, razon: `Frase prohibida: "${phrase}"` };
      }
    }
    return { hit: false };
  },
});
