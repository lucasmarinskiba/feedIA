/**
 * Content Repurposing Strategy — Phase 15
 * Reutiliza 1 post exitoso en 5-10 variaciones
 */

export interface RepurposingVariation {
  id: string;
  format: 'video' | 'carousel' | 'static' | 'story' | 'reel';
  angle: 'educational' | 'inspirational' | 'promotional' | 'entertaining' | 'behind-the-scenes';
  duration?: string; // "15sec", "3min", etc
  copyTemplate: string;
  hashtagSet: string[];
  publishDay: string;
  publishTime: string;
  estimatedReach: number; // % of original
}

export interface RepurposingPlan {
  originalPostId: string;
  originalPerformance: { engagementRate: number; reach: number };
  variations: RepurposingVariation[];
  totalReachMultiplier: number; // 3x-5x original
  timelineWeeks: number;
  estimatedAdditionalEngagement: number;
  recommendations: string[];
}

export const planContentRepurposing = (
  originalEngagementRate: number = 0.08,
  originalReach: number = 5000,
): RepurposingPlan => {
  const variations: RepurposingVariation[] = [
    {
      id: 'reel-30sec',
      format: 'reel',
      angle: 'educational',
      duration: '30sec',
      copyTemplate: '[Hook] [3 steps] [CTA]',
      hashtagSet: ['#trending', '#educational', '#howto'],
      publishDay: 'Tuesday',
      publishTime: '8-10am',
      estimatedReach: 120,
    },
    {
      id: 'carousel-5slides',
      format: 'carousel',
      angle: 'educational',
      copyTemplate: 'Slide 1: Hook | Slides 2-4: Deep dive | Slide 5: CTA',
      hashtagSet: ['#carousel', '#insights', '#learn'],
      publishDay: 'Wednesday',
      publishTime: '12-2pm',
      estimatedReach: 100,
    },
    {
      id: 'static-quote',
      format: 'static',
      angle: 'inspirational',
      copyTemplate: '[Pull quote] + [Context] + [Actionable insight]',
      hashtagSet: ['#motivation', '#mindset', '#growth'],
      publishDay: 'Friday',
      publishTime: '6-8pm',
      estimatedReach: 85,
    },
    {
      id: 'story-series',
      format: 'story',
      angle: 'behind-the-scenes',
      duration: '15sec total',
      copyTemplate: '5 stories: journey from A→B (poll at end)',
      hashtagSet: ['#storytime', '#bts', '#journey'],
      publishDay: 'Saturday',
      publishTime: '7-9pm',
      estimatedReach: 90,
    },
    {
      id: 'video-testimonial',
      format: 'video',
      angle: 'promotional',
      duration: '2min',
      copyTemplate: '[Problem] [How we solved] [Results] [Link in bio]',
      hashtagSet: ['#case-study', '#results', '#testimonial'],
      publishDay: 'Monday',
      publishTime: '9-11am',
      estimatedReach: 110,
    },
    {
      id: 'carousel-comparison',
      format: 'carousel',
      angle: 'entertaining',
      copyTemplate: 'Before vs After (visual contrast) + Quick tips',
      hashtagSet: ['#transformation', '#before-after', '#entertainment'],
      publishDay: 'Thursday',
      publishTime: '5-7pm',
      estimatedReach: 95,
    },
    {
      id: 'reel-trending',
      format: 'reel',
      angle: 'entertaining',
      duration: '15sec',
      copyTemplate: '[Trending audio] [Your twist] [Hook to product]',
      hashtagSet: ['#trending', '#viral', '#entertainment'],
      publishDay: 'Sunday',
      publishTime: '6-8pm',
      estimatedReach: 125,
    },
  ];

  const totalReachMultiplier = variations.reduce((sum, v) => sum + v.estimatedReach, 0) / 100;
  const estimatedAdditionalEngagement = Math.round(originalReach * originalEngagementRate * (totalReachMultiplier - 1));

  const recommendations = [
    `📌 Repurposing ROI: 1 post exitoso → ${variations.length} variaciones = ${Math.round(totalReachMultiplier)}x reach potencial`,
    `📅 Timeline: Distribuye en 4-6 semanas (1-2 variaciones/semana) para evitar fatiga de audiencia`,
    `🎯 Ángulos varían: educativo → inspiracional → entretenimiento (máxima diversidad)`,
    `💾 Formatos: video/carousel/static/story (cubre preferencias de diferentes audiencias)`,
    `⏰ Timing: cada variación en su mejor día/hora según Phase 8 (Seasonality)`,
    `🔄 Reutilización: A los 3 meses, republica las top 2-3 variaciones (nouveau audience)`,
  ];

  return {
    originalPostId: 'post-001',
    originalPerformance: { engagementRate: originalEngagementRate, reach: originalReach },
    variations,
    totalReachMultiplier,
    timelineWeeks: 6,
    estimatedAdditionalEngagement,
    recommendations,
  };
};
