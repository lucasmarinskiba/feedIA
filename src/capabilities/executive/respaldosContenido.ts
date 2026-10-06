/**
 * Respaldos por reglas de las herramientas de contenido (ganchos, hashtags, revisión de caption,
 * carrusel, adaptación de formato y bio). Cada uno trabaja con lo que escribió el usuario y, cuando
 * existe, con el historial real de la cuenta. Función pura.
 */

import type { ContextoCuenta, ResultadoHerramienta, SeccionResultado } from './herramientasCatalogo.js';
import { HASHTAGS_GENERICOS, MAX_CAPTION, auditoriaReglas } from './herramientasReglas.js';
import { normalizarTexto } from './respuestasTriaje.js';

type Valores = Record<string, string | number>;

const AVISO = 'Respaldo por reglas: la IA no respondió. Revisá el texto antes de usarlo.';
const STOPWORDS = new Set([
  'de',
  'la',
  'el',
  'que',
  'y',
  'en',
  'un',
  'una',
  'los',
  'las',
  'por',
  'para',
  'con',
  'es',
  'lo',
  'al',
  'del',
  'se',
  'no',
  'si',
  'mi',
  'tu',
  'te',
  'me',
  'a',
  'o',
  'u',
  'como',
  'hay',
  'son',
  'sus',
  'mas',
  'muy',
  'ya',
]);

const texto = (v: Valores, clave: string): string => String(v[clave] ?? '').trim();
const numero = (v: Valores, clave: string, defecto: number): number => {
  const n = Number(v[clave]);
  return Number.isFinite(n) && n > 0 ? n : defecto;
};

const palabras = (t: string): string[] => t.split(/\s+/).filter(Boolean);

const primerasPalabras = (t: string, cantidad: number): string => {
  const p = palabras(t);
  return p.length > cantidad ? `${p.slice(0, cantidad).join(' ')}…` : p.join(' ');
};

const hastaCaracteres = (t: string, max: number): string => {
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return `${ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte}…`;
};

const frases = (t: string): string[] =>
  t
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

const CTA_CARRUSEL: Record<string, string> = {
  educar: 'Guardá este carrusel para volver a verlo cuando lo necesites.',
  convertir: 'Si querés aplicarlo a tu caso, escribinos por DM.',
  guardados: 'Guardalo y compartilo con alguien que lo necesite.',
  debate: 'Contanos en los comentarios: ¿vos cómo lo hacés?',
};

const ESTRUCTURAS_GANCHO = [
  { tipo: 'contraste', frase: (t: string) => `Nadie te cuenta esto de ${t}.`, pantalla: 'Lo que nadie te cuenta' },
  { tipo: 'número', frase: (t: string) => `3 errores con ${t} que te cuestan.`, pantalla: '3 errores que cuestan' },
  { tipo: 'pregunta', frase: (t: string) => `¿Por qué ${t} no te da resultados?`, pantalla: '¿Por qué no funciona?' },
  {
    tipo: 'consecuencia',
    frase: (t: string) => `Si seguís igual con ${t}, perdés tiempo.`,
    pantalla: 'Dejá de perder tiempo',
  },
  { tipo: 'curiosidad', frase: (t: string) => `Lo que aprendí de ${t} al cambiar.`, pantalla: 'Lo que aprendí' },
];

const MAX_PALABRAS_GANCHO = 12;

export const respaldoHooks = (valores: Valores): ResultadoHerramienta => {
  const idea = primerasPalabras(texto(valores, 'idea'), 6);
  const ganchos = ESTRUCTURAS_GANCHO.map((e) => {
    const frase = e.frase(idea);
    return `[${e.tipo}] ${frase}${palabras(frase).length > MAX_PALABRAS_GANCHO ? ' (demasiado largo: acortalo)' : ''}`;
  });
  return {
    titulo: `Ganchos para ${idea}`,
    secciones: [
      { titulo: 'Ganchos (primeros 2-3 segundos)', tipo: 'lista', contenido: ganchos },
      {
        titulo: 'Texto en pantalla',
        tipo: 'lista',
        contenido: ESTRUCTURAS_GANCHO.map((e) => `${e.tipo}: ${e.pantalla}`),
      },
      {
        titulo: 'Cómo elegir',
        tipo: 'texto',
        contenido:
          'Si mostrás a alguien hablando, la pregunta funciona mejor. Si el contenido es una lista, el número. Si hay un resultado concreto que mostrar, el contraste.',
      },
    ],
    notas: [AVISO, 'Reemplazá el ejemplo por un dato real de tu caso: sin dato real, el gancho pierde credibilidad.'],
  };
};

const STOP_HASHTAG = STOPWORDS;

export const respaldoHashtags = (valores: Valores, contexto: ContextoCuenta): ResultadoHerramienta => {
  const tema = texto(valores, 'tema');
  const cantidad = Math.min(30, Math.max(3, numero(valores, 'cantidad', 10)));
  const clavesTema = normalizarTexto(tema)
    .replace(/\?/g, ' ')
    .split(' ')
    .filter((p) => p.length > 2 && !STOP_HASHTAG.has(p));
  const compuesto = clavesTema.length >= 2 ? [`#${clavesTema[0]}${clavesTema[1]}`] : [];
  const sueltos = clavesTema.map((p) => `#${p}`);
  const delHistorial = contexto.hashtagsTop.filter((h) => !HASHTAGS_GENERICOS.includes(h.toLowerCase()));
  const lista = [...new Set([...compuesto, ...sueltos, ...delHistorial])].slice(0, cantidad);
  const secciones: SeccionResultado[] = [
    { titulo: 'Listo para copiar', tipo: 'copiable', contenido: lista.join(' ') },
    {
      titulo: 'Mezcla',
      tipo: 'lista',
      contenido: [
        compuesto.length > 0
          ? `Específico: ${compuesto.join(' ')}`
          : 'Específico: escribí el tema con dos palabras para armar uno.',
        `Del tema: ${sueltos.join(' ') || 'sin palabras clave en el tema'}`,
        delHistorial.length > 0
          ? `De tus posts que mejor rinden: ${delHistorial.slice(0, 5).join(' ')}`
          : 'Todavía no hay historial de posts para tomar hashtags de tu cuenta.',
      ],
    },
  ];
  return {
    titulo: `Hashtags para ${tema}`,
    secciones,
    notas: [
      'No tenemos volumen por hashtag: la mezcla es una heurística de discovery, no una medición.',
      'Los genéricos saturados (#love, #instagood, #follow) quedan afuera a propósito.',
    ],
  };
};

export const respaldoSafety = (valores: Valores): ResultadoHerramienta => {
  const caption = texto(valores, 'caption');
  const hashtags = texto(valores, 'hashtags')
    .split(/[\s\n]+/)
    .map((h) => h.trim())
    .filter(Boolean);
  const { nivel, hallazgos } = auditoriaReglas(caption, hashtags);
  const etiqueta = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo', ninguno: 'Sin hallazgos' }[nivel];
  return {
    titulo: 'Revisión previa a publicar',
    secciones: [
      { titulo: 'Nivel de riesgo', tipo: 'texto', contenido: etiqueta },
      { titulo: 'Longitud', tipo: 'texto', contenido: `${caption.length} de ${MAX_CAPTION} caracteres.` },
      {
        titulo: 'Hallazgos',
        tipo: 'lista',
        contenido: hallazgos.length
          ? hallazgos.map((h) => `[${h.severidad}] ${h.texto} Corrección: ${h.correccion}`)
          : ['No se detectaron patrones de riesgo en este caption.'],
      },
    ],
    notas: ['Revisión por reglas: no reemplaza el criterio de quien conoce tu cuenta ni es asesoría legal.'],
  };
};

const ROLES_CENTRALES = ['Problema', 'Método', 'Método', 'Ejemplo', 'Error común', 'Ejemplo', 'Resumen'];

const fraseDeRol = (rol: string, tema: string, indice: number): string => {
  if (rol === 'Problema') return `Qué pasa cuando no tenés un método para ${tema}.`;
  if (rol === 'Método') return `Paso ${indice}: definí una acción concreta y repetila.`;
  if (rol === 'Ejemplo') return 'Ejemplo real: aplicalo a una publicación de tu cuenta.';
  if (rol === 'Error común') return 'Error común: intentar hacerlo todo a la vez.';
  return `${tema} se resuelve con constancia y medición.`;
};

export const respaldoCarrusel = (valores: Valores): ResultadoHerramienta => {
  const tema = primerasPalabras(texto(valores, 'tema'), 8);
  const total = Math.min(10, Math.max(5, numero(valores, 'slides', 7)));
  const objetivo = texto(valores, 'objetivo');
  const medio = total - 2;
  const slides: string[] = [`Portada: ${medio} pasos para ${tema}`];
  for (let i = 0; i < medio; i += 1) {
    const rol = ROLES_CENTRALES[i % ROLES_CENTRALES.length] ?? 'Método';
    slides.push(`Slide ${i + 2} · ${rol}: ${primerasPalabras(fraseDeRol(rol, tema, i + 1), 30)}`);
  }
  slides.push(`Cierre: ${CTA_CARRUSEL[objetivo] ?? CTA_CARRUSEL['educar'] ?? ''}`);
  return {
    titulo: `Carrusel de ${total} slides: ${tema}`,
    secciones: [
      { titulo: 'Portada', tipo: 'copiable', contenido: slides[0] ?? '' },
      { titulo: 'Slides', tipo: 'lista', contenido: slides.slice(1) },
    ],
    notas: [AVISO, 'Una idea por slide y menos de 30 palabras cada uno: el texto es la base, el diseño va aparte.'],
  };
};

const CTA_REPURPOSE = 'Guardalo y contame qué te sirvió.';

export const respaldoRepurpose = (valores: Valores): ResultadoHerramienta => {
  const original = texto(valores, 'contenido');
  const origen = texto(valores, 'formato_origen');
  const destino = texto(valores, 'formato_destino');
  const oraciones = frases(original);
  const fuentes = oraciones.length > 0 ? oraciones : [original];
  const tesis = fuentes[0] ?? original;
  const apoyo = fuentes.slice(1);
  let usadas = 1;
  const secciones: SeccionResultado[] = [];

  if (destino === 'reel') {
    const beats = apoyo.slice(0, 4);
    usadas += beats.length;
    secciones.push({
      titulo: 'Guion del reel',
      tipo: 'lista',
      contenido: [
        `0-2 s: ${primerasPalabras(tesis, 12)}`,
        ...beats.map((s, i) => `${i * 3}-${(i + 1) * 3} s: ${primerasPalabras(s, 14)}`),
        `Final: ${CTA_REPURPOSE}`,
      ],
    });
  } else if (destino === 'carrusel') {
    const slides = apoyo.slice(0, 8);
    usadas += slides.length;
    secciones.push(
      { titulo: 'Portada', tipo: 'copiable', contenido: primerasPalabras(tesis, 12) },
      { titulo: 'Slides', tipo: 'lista', contenido: slides.map((s) => primerasPalabras(s, 30)) },
    );
  } else if (destino === 'historia') {
    const dato = apoyo[0] ?? tesis;
    usadas = Math.min(fuentes.length, 2);
    secciones.push({
      titulo: 'Historia (3 pantallas)',
      tipo: 'lista',
      contenido: [
        `Pantalla 1 (pregunta): ${primerasPalabras(tesis, 10)}`,
        `Pantalla 2 (dato): ${primerasPalabras(dato, 14)}`,
        'Pantalla 3 (CTA): respondé la historia con tu caso.',
      ],
    });
  } else {
    usadas = fuentes.length;
    secciones.push({
      titulo: 'Caption',
      tipo: 'copiable',
      contenido: `${hastaCaracteres(fuentes.join(' '), MAX_CAPTION - CTA_REPURPOSE.length - 2)}\n\n${CTA_REPURPOSE}`,
    });
  }

  const perdidas = Math.max(0, fuentes.length - usadas);
  secciones.push(
    {
      titulo: 'Qué se gana',
      tipo: 'texto',
      contenido: `El mensaje entra en el formato ${destino}, que es donde consume esa audiencia.`,
    },
    {
      titulo: 'Qué se pierde',
      tipo: 'texto',
      contenido: `Se usan ${usadas} de ${fuentes.length} ideas. ${perdidas} quedan afuera para mantener el formato.`,
    },
  );
  const notas = [AVISO];
  if (origen === destino) notas.push('El formato de origen y el de destino son iguales: revisá qué querés cambiar.');
  return { titulo: `${origen} → ${destino}`, secciones, notas };
};

const PALABRAS_CLAVE_PERFIL = new Set([...STOPWORDS, 'hacemos', 'ayudamos', 'somos', 'soy', 'para', 'todos']);

export const respaldoPerfil = (valores: Valores): ResultadoHerramienta => {
  const propuesta = texto(valores, 'propuesta');
  const link = texto(valores, 'link');
  const nombre = texto(valores, 'nombre_visible');
  const bioActual = texto(valores, 'bio_actual');
  const primera = frases(propuesta)[0] ?? propuesta;
  const cta = link ? 'Link en bio ↓' : 'Escribinos por DM';
  const bio = hastaCaracteres(`${primerasPalabras(primera, 14)} · ${cta}`, 150);
  const claves = normalizarTexto(propuesta)
    .split(' ')
    .filter((p) => p.length > 3 && !PALABRAS_CLAVE_PERFIL.has(p))
    .slice(0, 2);
  const palabraClave = claves.join(' ');
  const nombreSugerido = nombre
    ? hastaCaracteres(`${nombre} | ${palabraClave}`, 30)
    : hastaCaracteres(palabraClave, 30);
  return {
    titulo: 'Perfil sugerido',
    secciones: [
      { titulo: 'Bio sugerida', tipo: 'copiable', contenido: bio },
      { titulo: 'Nombre visible', tipo: 'texto', contenido: nombreSugerido || 'Sumá una palabra clave de tu nicho.' },
      {
        titulo: 'Highlights',
        tipo: 'lista',
        contenido: ['Empezar', 'Resultados', 'Servicios o precio', 'Contacto'],
      },
      {
        titulo: 'Frente a la bio actual',
        tipo: 'texto',
        contenido: bioActual
          ? `Tu bio actual tiene ${bioActual.length} caracteres. La sugerida tiene ${bio.length}.`
          : 'No tenés bio cargada: esta sería la primera.',
      },
    ],
    notas: [`La bio sugerida tiene ${bio.length} de 150 caracteres.`, AVISO],
  };
};
