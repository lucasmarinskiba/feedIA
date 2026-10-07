/**
 * Content Calendar Planner — Phase 11
 * Planifica calendario de contenido óptimo
 */

export interface CalendarSlot {
  day: string; // "Monday", "Tuesday", etc
  date?: string; // "2026-10-07"
  contentType: 'educational' | 'inspirational' | 'promotional' | 'entertainment' | 'behind-the-scenes';
  format: 'carousel' | 'reel' | 'static' | 'story' | 'mix';
  persona: string; // "Early Adopter", "Lifestyle Seeker", etc
  optimalTime: string; // "8-10am", "6-8pm"
  hook?: string; // Suggested hook template
  description: string;
}

export interface ContentBalance {
  educational: number; // %
  inspirational: number; // %
  promotional: number; // %
  entertainment: number; // %
  behindTheScenes: number; // %
}

export interface ContentCalendarPlan {
  weekPlan: CalendarSlot[];
  contentBalance: ContentBalance;
  monthlyThemes: string[];
  contentGaps: string[];
  recommendations: string[];
}

const contentTypeDistribution: Record<string, number> = {
  educational: 35, // % of week
  inspirational: 25,
  promotional: 15,
  entertainment: 15,
  behindTheScenes: 10,
};

const dayOfWeekContentStrategy: Record<string, { contentType: string; format: string }> = {
  Monday: { contentType: 'motivational', format: 'carousel' },
  Tuesday: { contentType: 'educational', format: 'reel' },
  Wednesday: { contentType: 'entertainment', format: 'static' },
  Thursday: { contentType: 'educational', format: 'carousel' },
  Friday: { contentType: 'inspirational', format: 'reel' },
  Saturday: { contentType: 'behind-the-scenes', format: 'story' },
  Sunday: { contentType: 'promotional', format: 'static' },
};

export const planContentCalendar = (): ContentCalendarPlan => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const personas = ['Early Adopter', 'Lifestyle Seeker', 'Skeptical Consumer', 'Entertainment First'];
  const optimalTimes = ['8-10am', '12-2pm', '6-8pm', '8-10pm'];

  const weekPlan: CalendarSlot[] = days.map((day, idx) => {
    const strategy = dayOfWeekContentStrategy[day] || { contentType: 'educational', format: 'carousel' };
    const persona = personas[idx % personas.length];
    const time = optimalTimes[idx % optimalTimes.length];

    return {
      day,
      contentType: strategy.contentType as any,
      format: strategy.format as any,
      persona,
      optimalTime: time,
      hook: `${day} hook template...`,
      description: `${strategy.contentType} post targeting ${persona}`,
    };
  });

  const contentBalance: ContentBalance = {
    educational: 35,
    inspirational: 25,
    promotional: 15,
    entertainment: 15,
    behindTheScenes: 10,
  };

  const monthlyThemes = [
    'Week 1: "Foundation" — core principles, basics',
    'Week 2: "Deep Dive" — detailed case studies, tutorials',
    'Week 3: "Trending" — current events, hot takes',
    'Week 4: "Reflection" — behind-the-scenes, results, wins',
  ];

  const contentGaps = [
    'No testimonial/case study content in plan — add 1/week',
    'Underutilizing video format (reels) — increase to 3/week',
    'Promotional content scattered — batch to Friday',
    'No user-generated content strategy — feature 1 user/week',
  ];

  const recommendations = [
    `📅 Mezcla semanal: ${contentBalance.educational}% educativo, ${contentBalance.inspirational}% inspiracional, ${contentBalance.promotional}% promocional.`,
    `📍 Publica los mejores posts a las ${optimalTimes.slice(0, 2).join(', ')} (picos de audiencia).`,
    `🎯 Tema mensual propuesto: semana 1 = fundamentos, semana 4 = resultados (cierre fuerte).`,
    `✅ Gap detectado: agrega 1 video/semana. Reels generan 3x+ engagement que static.`,
    `🔄 Tema rotativo: cada semana destaca una persona diferente (diversidad de perspectivas).`,
  ];

  return {
    weekPlan,
    contentBalance,
    monthlyThemes,
    contentGaps,
    recommendations,
  };
};
