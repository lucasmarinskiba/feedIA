/**
 * TikTok Video Templates — Templates nativos de TikTok para máximo FYP performance
 * Fast cuts, text-on-screen, transitions, hooks visuales.
 */

export interface TikTokTemplate {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  durationRangeSec: [number, number];
  structure: TemplateSegment[];
  fypScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  requiredElements: string[];
}

export interface TemplateSegment {
  startSec: number;
  endSec: number;
  type: 'hook' | 'body' | 'cta' | 'transition' | 'loop';
  description: string;
  textOverlay?: string;
  visualStyle: string;
  audioCue?: string;
}

export const TEMPLATES: TikTokTemplate[] = [
  {
    id: 'tt-tpl-fast-hook',
    name: 'Fast Hook + Punchline',
    description: 'Hook en 1s, setup rápido, punchline en 5-8s. Texto grande sincronizado.',
    bestFor: ['comedy', 'education', 'life_hack'],
    durationRangeSec: [5, 10],
    difficulty: 'easy',
    fypScore: 88,
    requiredElements: ['big_text_0s', 'sound_drop_1s', 'zoom_punchline'],
    structure: [
      {
        startSec: 0,
        endSec: 1,
        type: 'hook',
        description: 'Texto grande que plantea problema/pregunta',
        visualStyle: 'text_fullscreen_bold',
        audioCue: 'beat_hit',
      },
      {
        startSec: 1,
        endSec: 4,
        type: 'body',
        description: 'Setup rápido con B-roll o selfie',
        visualStyle: ' selfie_or_broll',
        audioCue: 'build_up',
      },
      {
        startSec: 4,
        endSec: 7,
        type: 'cta',
        description: 'Punchline + CTA de follow/comment',
        visualStyle: 'text_reveal_zoom',
        audioCue: 'drop',
      },
      {
        startSec: 7,
        endSec: 10,
        type: 'loop',
        description: 'Loop sutil para rewatch',
        visualStyle: 'same_as_opening',
        audioCue: 'fade',
      },
    ],
  },
  {
    id: 'tt-tpl-transition',
    name: 'Outfit/Scene Transition',
    description: 'Dos escenas separadas por transición en beat drop. Muy viral en fashion/beauty.',
    bestFor: ['fashion', 'beauty', 'lifestyle'],
    durationRangeSec: [7, 12],
    difficulty: 'medium',
    fypScore: 92,
    requiredElements: ['two_outfits', 'beat_drop_transition', 'sync_movement'],
    structure: [
      {
        startSec: 0,
        endSec: 2,
        type: 'hook',
        description: 'Pose inicial, texto "Before"',
        visualStyle: 'full_body_static',
        audioCue: 'intro',
      },
      {
        startSec: 2,
        endSec: 3,
        type: 'transition',
        description: 'Transición rápida en beat drop (zoom/spin/cover)',
        visualStyle: 'flash_transition',
        audioCue: 'beat_drop',
      },
      {
        startSec: 3,
        endSec: 6,
        type: 'body',
        description: 'Pose final, texto "After"',
        visualStyle: 'full_body_static',
        audioCue: 'build_up',
      },
      {
        startSec: 6,
        endSec: 9,
        type: 'cta',
        description: 'CTA: "Which one?" / "Save this"',
        visualStyle: 'text_overlay',
        audioCue: 'outro',
      },
    ],
  },
  {
    id: 'tt-tpl-storytime',
    name: 'Storytime with Text Overlay',
    description: 'Voz en off contando historia + texto sincronizado en pantalla. Alto retention.',
    bestFor: ['storytelling', 'education', 'motivation'],
    durationRangeSec: [15, 30],
    difficulty: 'easy',
    fypScore: 82,
    requiredElements: ['voiceover', 'text_sync', 'b_roll'],
    structure: [
      {
        startSec: 0,
        endSec: 3,
        type: 'hook',
        description: 'Texto impactante: "Nunca hagas esto..."',
        visualStyle: 'text_fullscreen_red',
        audioCue: 'tension',
      },
      {
        startSec: 3,
        endSec: 12,
        type: 'body',
        description: 'Historia con B-roll relevante',
        visualStyle: 'b_roll_with_text',
        audioCue: 'background',
      },
      {
        startSec: 12,
        endSec: 18,
        type: 'body',
        description: 'Plot twist o moral',
        visualStyle: 'close_up_emotional',
        audioCue: 'build_up',
      },
      {
        startSec: 18,
        endSec: 22,
        type: 'cta',
        description: 'CTA: "¿Te pasó? Comenta"',
        visualStyle: 'text_overlay',
        audioCue: 'resolve',
      },
    ],
  },
  {
    id: 'tt-tpl-duet-response',
    name: 'Duet Response',
    description: 'Respuesta a video trending con split screen. Aprovecha tráfico existente.',
    bestFor: ['reaction', 'education', 'comedy'],
    durationRangeSec: [10, 25],
    difficulty: 'easy',
    fypScore: 85,
    requiredElements: ['original_video_left', 'response_right', 'reaction_face'],
    structure: [
      {
        startSec: 0,
        endSec: 3,
        type: 'hook',
        description: 'Reacción facial inicial al video original',
        visualStyle: 'split_screen_reaction',
        audioCue: 'original_sound',
      },
      {
        startSec: 3,
        endSec: 10,
        type: 'body',
        description: 'Comentario educativo o gracioso',
        visualStyle: 'split_screen_talking',
        audioCue: 'voiceover',
      },
      {
        startSec: 10,
        endSec: 15,
        type: 'cta',
        description: 'CTA: "Dime tu opinión"',
        visualStyle: 'text_overlay',
        audioCue: 'outro',
      },
    ],
  },
  {
    id: 'tt-tpl-listicle',
    name: 'Fast Listicle',
    description: '3-5 items rápidos. Texto numérico grande + clip por item. Muy shareable.',
    bestFor: ['education', 'tips', 'productivity'],
    durationRangeSec: [10, 20],
    difficulty: 'easy',
    fypScore: 86,
    requiredElements: ['numbered_text', 'fast_cuts', 'one_item_per_3s'],
    structure: [
      {
        startSec: 0,
        endSec: 2,
        type: 'hook',
        description: 'Texto: "5 cosas que..."',
        visualStyle: 'text_fullscreen',
        audioCue: 'beat_hit',
      },
      {
        startSec: 2,
        endSec: 5,
        type: 'body',
        description: '#1 con clip/demo',
        visualStyle: 'split_text_clip',
        audioCue: 'tick',
      },
      {
        startSec: 5,
        endSec: 8,
        type: 'body',
        description: '#2 con clip/demo',
        visualStyle: 'split_text_clip',
        audioCue: 'tick',
      },
      {
        startSec: 8,
        endSec: 11,
        type: 'body',
        description: '#3 con clip/demo',
        visualStyle: 'split_text_clip',
        audioCue: 'tick',
      },
      {
        startSec: 11,
        endSec: 14,
        type: 'cta',
        description: 'CTA: "Guarda para después"',
        visualStyle: 'text_overlay',
        audioCue: 'resolve',
      },
    ],
  },
];

export const getTemplateById = (id: string): TikTokTemplate | undefined => TEMPLATES.find((t) => t.id === id);

export const listTemplates = (opts?: { bestFor?: string; maxDifficulty?: string }): TikTokTemplate[] => {
  let filtered = [...TEMPLATES];
  if (opts?.bestFor) filtered = filtered.filter((t) => t.bestFor.includes(opts.bestFor!));
  if (opts?.maxDifficulty) {
    const order = { easy: 1, medium: 2, hard: 3 };
    filtered = filtered.filter((t) => order[t.difficulty] <= order[opts.maxDifficulty as 'easy' | 'medium' | 'hard']);
  }
  return filtered.sort((a, b) => b.fypScore - a.fypScore);
};

export const recommendTemplate = (contentType: string, _durationSec: number): TikTokTemplate => {
  const candidates = TEMPLATES.filter(
    (t) =>
      t.bestFor.some((b) => contentType.toLowerCase().includes(b)) ||
      (_durationSec >= t.durationRangeSec[0] && _durationSec <= t.durationRangeSec[1]),
  );
  return candidates.sort((a, b) => b.fypScore - a.fypScore)[0] ?? TEMPLATES[0]!;
};

export interface VideoBlueprint {
  templateId: string;
  segments: Array<{
    timestamp: string;
    instruction: string;
    textOverlay?: string;
    visualNote: string;
    audioNote: string;
  }>;
  totalDuration: number;
  equipment: string[];
  estimatedFYPScore: number;
}

export const generateBlueprint = (templateId: string, _topic: string): VideoBlueprint => {
  const tpl = getTemplateById(templateId) ?? TEMPLATES[0]!;
  return {
    templateId: tpl.id,
    segments: tpl.structure.map((seg) => ({
      timestamp: `${seg.startSec}s - ${seg.endSec}s`,
      instruction: seg.description,
      textOverlay: seg.textOverlay,
      visualNote: seg.visualStyle,
      audioNote: seg.audioCue ?? 'keep_original',
    })),
    totalDuration: tpl.durationRangeSec[1],
    equipment: ['smartphone', 'ring_light', 'tripod'],
    estimatedFYPScore: tpl.fypScore,
  };
};
