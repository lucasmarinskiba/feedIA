/**
 * Reglas de oficio de seguridad para captions y hashtags: engagement bait, promesas absolutas, límites
 * de Instagram (30 hashtags), hashtags genéricos saturados y links. Función pura.
 */

export const HASHTAGS_GENERICOS = [
  '#love',
  '#instagood',
  '#follow',
  '#like',
  '#like4like',
  '#followme',
  '#photooftheday',
  '#picoftheday',
];
export const PATRON_BAIT =
  /(etiquet\S*\s+a\s+(alguien|un amigo|tu)|comparte\s+(para|y)\s+(ganar|participar)|sorteo|gana[rs]?\s+\$|sigu[eé]\s+y\s+te\s+(doy|regalo)|dale\s+like\s+si|comenta\s+(y|para)\s+(ganar|participar))/i;
export const PATRON_ABSOLUTO =
  /(\b(garantizad[oa]s?|siempre funciona|resultados seguros|sin esfuerzo|de la noche a la ma[ñn]ana)\b|100\s?%)/i;
export const PATRON_LINK = /https?:\/\/|www\./i;
export const MAX_CAPTION = 2200;
export const MAX_HOOK = 125;

export interface HallazgoSeguridad {
  severidad: 'alta' | 'media' | 'baja';
  texto: string;
  correccion: string;
}

export const auditoriaReglas = (
  caption: string,
  hashtags: string[],
): { nivel: 'alto' | 'medio' | 'bajo' | 'ninguno'; hallazgos: HallazgoSeguridad[] } => {
  const hallazgos: HallazgoSeguridad[] = [];
  if (PATRON_BAIT.test(caption)) {
    hallazgos.push({
      severidad: 'alta',
      texto: 'Engagement bait: pedir etiquetas, likes o compartidos a cambio de algo puede limitar el alcance.',
      correccion: 'Reemplazalo por una invitación genuina, por ejemplo: "Si te pasó algo parecido, contalo abajo".',
    });
  }
  if (PATRON_ABSOLUTO.test(caption)) {
    hallazgos.push({
      severidad: 'media',
      texto: 'Promesa absoluta o garantía: la audiencia la percibe como exagerada y la plataforma la puede marcar.',
      correccion: 'Describí el resultado con condiciones reales: "pensado para", "en nuestra experiencia".',
    });
  }
  const total = new Set(hashtags.map((h) => h.toLowerCase())).size;
  if (total > 30) {
    hallazgos.push({
      severidad: 'alta',
      texto: `${total} hashtags: Instagram admite hasta 30 por publicación.`,
      correccion: 'Quedate con 5 a 12 relevantes y sacá los que no describen el contenido.',
    });
  }
  const genericos = hashtags.filter((h) => HASHTAGS_GENERICOS.includes(h.toLowerCase()));
  if (genericos.length > 0) {
    hallazgos.push({
      severidad: 'media',
      texto: `Hashtags genéricos saturados: ${genericos.join(' ')}.`,
      correccion: 'Cambialos por hashtags de nicho más específicos.',
    });
  }
  if (PATRON_LINK.test(caption)) {
    hallazgos.push({
      severidad: 'baja',
      texto: 'Los links en el caption no son clickeables en Instagram.',
      correccion: 'Usá "link en bio" y dejá el enlace en el perfil.',
    });
  }
  const palabras = caption.split(/\s+/).filter((p) => p.length > 3);
  const mayusculas = palabras.filter((p) => p === p.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(p)).length;
  if (palabras.length >= 6 && mayusculas / palabras.length > 0.4) {
    hallazgos.push({
      severidad: 'baja',
      texto: 'Demasiadas palabras en mayúsculas: cuesta leer y se ve como grito.',
      correccion: 'Dejá mayúsculas solo para una palabra clave.',
    });
  }
  if (caption.length > MAX_CAPTION) {
    hallazgos.push({
      severidad: 'alta',
      texto: `El caption tiene ${caption.length} caracteres: Instagram admite hasta ${MAX_CAPTION}.`,
      correccion: 'Acortá el cuerpo y dejá el CTA al final.',
    });
  }
  const primeraLinea = caption.split('\n')[0] ?? '';
  if (primeraLinea.length > MAX_HOOK) {
    hallazgos.push({
      severidad: 'baja',
      texto: `La primera línea tiene ${primeraLinea.length} caracteres: se corta a los ${MAX_HOOK} y el gancho queda incompleto.`,
      correccion: 'Poné el gancho en una frase corta al principio.',
    });
  }
  const repetidos = hashtags.map((h) => h.toLowerCase()).filter((h, i, lista) => lista.indexOf(h) !== i);
  if (repetidos.length > 0) {
    hallazgos.push({
      severidad: 'baja',
      texto: `Hashtags repetidos: ${[...new Set(repetidos)].join(' ')}.`,
      correccion: 'Dejá cada hashtag una sola vez.',
    });
  }
  const nivel = hallazgos.some((h) => h.severidad === 'alta')
    ? 'alto'
    : hallazgos.some((h) => h.severidad === 'media')
      ? 'medio'
      : hallazgos.length > 0
        ? 'bajo'
        : 'ninguno';
  return { nivel, hallazgos };
};
