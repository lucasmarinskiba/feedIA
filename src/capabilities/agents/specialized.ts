import type { BrandProfile } from '../../config/types.js';

export interface AdaptFormatRequest {
  sourceFormat: string;
  targetFormats: string[];
  content: string;
}

export interface AdaptFormatResult {
  ok: boolean;
  adaptations: Array<{
    targetFormat: string;
    adaptedContent: string;
    notes: string[];
  }>;
  error?: string;
}

export const adaptFormat = async (brand: BrandProfile, req: AdaptFormatRequest): Promise<AdaptFormatResult> => {
  const adaptations: AdaptFormatResult['adaptations'] = [];

  for (const target of req.targetFormats) {
    let adaptedContent = req.content;
    const notes: string[] = [];

    switch (req.sourceFormat) {
      case 'reel':
        if (target === 'carrusel') {
          adaptedContent = `🎬 DE REEL A CARRUSEL\n\nIdea original: ${req.content.slice(0, 100)}...\n\nSlides:\n1. Hook visual capturado del reel\n2. Punto clave 1\n3. Punto clave 2\n4. Punto clave 3\n5. CTA y recursos\n\nNota: Adaptar ritmo visual a lectura pausada.`;
          notes.push(
            'Extraer 3-5 puntos clave del reel',
            'Agregar contexto escrito que el reel no necesitaba',
            'Mantener el hook como primera slide',
          );
        } else if (target === 'stories' || target === 'historia') {
          adaptedContent = `📱 DE REEL A STORIES\n\nIdea: ${req.content.slice(0, 80)}...\n\nStory 1: Hook (3s)\nStory 2: Punto clave 1 (5s)\nStory 3: Punto clave 2 (5s)\nStory 4: CTA + swipe up/link (5s)`;
          notes.push(
            'Dividir en frames de 5-7 segundos',
            'Agregar interactividad: poll, question, countdown',
            'Texto más grande y legible',
          );
        }
        break;
      case 'carrusel':
        if (target === 'reel') {
          adaptedContent = `🎥 DE CARRUSEL A REEL\n\nIdea: ${req.content.slice(0, 100)}...\n\nBeats:\n0-3s: Hook animado con slide 1\n3-8s: Slide 2 en movimiento\n8-15s: Slide 3 + 4 aceleradas\n15-20s: Slide 5 (CTA)\n\nAudio: trending upbeat`;
          notes.push(
            'Animar transiciones entre slides',
            'Condensar texto para ritmo de video',
            'Agregar música y efectos de sonido',
          );
        } else if (target === 'stories' || target === 'historia') {
          adaptedContent = `📱 DE CARRUSEL A STORIES\n\nCada slide del carrusel = 1 story.\nAgregar stickers interactivos cada 2-3 stories.\nÚltima story: CTA directa.`;
          notes.push('1 slide = 1 story', 'Agregar encuestas o cajas de preguntas', 'Texto más grande para mobile');
        }
        break;
      case 'blog':
        if (target === 'carrusel') {
          adaptedContent = `📚 DE BLOG A CARRUSEL\n\nResumen ejecutivo del blog como primera slide.\n5-7 slides con puntos clave.\nCTA: leer el blog completo (link en bio).`;
          notes.push(
            'Extraer 5-7 puntos clave',
            'Simplificar lenguaje para Instagram',
            'Agregar visuales por cada punto',
          );
        } else if (target === 'reel') {
          adaptedContent = `🎥 DE BLOG A REEL\n\nHook: "Lo que nadie te dice sobre [tema]"\n30s con los 3 puntos más polémicos/sorprendentes.\nCTA: "¿Querés la versión completa? Link en bio"`;
          notes.push(
            'Seleccionar solo el contenido más impactante',
            'Condensar a 30-45 segundos',
            'Usar hook que genere curiosidad',
          );
        }
        break;
      default:
        adaptedContent = `🔄 ADAPTACIÓN: ${req.sourceFormat} → ${target}\n\nContenido original adaptado para formato ${target}.\n\n${req.content.slice(0, 200)}...`;
        notes.push(
          `Adaptación genérica de ${req.sourceFormat} a ${target}`,
          'Revisar dimensiones y ratio',
          'Optimizar texto para el nuevo formato',
        );
    }

    adaptations.push({ targetFormat: target, adaptedContent, notes });
  }

  return {
    ok: true,
    adaptations,
  };
};
