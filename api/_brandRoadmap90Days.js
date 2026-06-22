/**
 * 90-Day Brand Establishment Roadmap.
 *
 * 13 semanas de + a 0 → autoridad nicho:
 *   - Sem 1-2: Foundation (identity + first content + audience seed)
 *   - Sem 3-4: Authority Build (frameworks + thought leadership)
 *   - Sem 5-8: Growth Loop (viral content + funnel + monetization)
 *   - Sem 9-12: Scale + Compound (collaborations + media + saga)
 *   - Sem 13: Refinement + Setup next 90d
 *
 * Cada semana = goals + content plan + workflows + métricas.
 */

export const ROADMAP_90_DAYS = {
  totalDays: 90,
  totalWeeks: 13,
  phases: [
    {
      name: 'Foundation',
      weekRange: '1-2',
      goal: 'Brand identity + visual system + 14 posts + 100-500 followers seed',
      keyWorkflows: ['full-brand-identity-setup', 'brand-launch-week-1', 'authority-carousel-value-bomb'],
      kpis: ['Identity completa', 'Brand kit Canva aplicado', '14 posts publicados', 'Engagement rate baseline'],
      mindsetRule: 'Calidad > velocidad. Setear marca correcta para escalar después.',
    },
    {
      name: 'Authority Build',
      weekRange: '3-4',
      goal: 'Framework propio + thought leadership semanal + 500-2K followers',
      keyWorkflows: ['authority-carousel-value-bomb', 'research-trends-deep', 'viral-video-1-day'],
      kpis: ['1 framework propio publicado', '14 thought leadership posts', '5+ viral score ≥75', 'Saves rate ≥5%'],
      mindsetRule: 'Postear opiniones fuertes. Audience te recordará por tu take, no por tutoriales genéricos.',
    },
    {
      name: 'Growth Loop',
      weekRange: '5-8',
      goal: 'Viral content systematic + funnel monetization + 2K-10K followers',
      keyWorkflows: ['viral-video-1-day', 'monetization-funnel-setup', 'batch-30-videos', 'community-week-management'],
      kpis: ['10+ viral score ≥80', 'Lead magnet en bio', '50+ leads cualificados', 'Conversion rate measurable'],
      mindsetRule: 'Posting cadence consistente diaria. Engagement <60min response. Funnel arranca.',
    },
    {
      name: 'Scale + Compound',
      weekRange: '9-12',
      goal: 'Collaborations + media presence + saga unfolding + 10K-50K followers',
      keyWorkflows: ['cinematic-ai-video', 'community-week-management', 'authority-carousel-value-bomb'],
      kpis: ['3+ collaborations', '1 podcast guest', '5+ controversial takes que generan debate', '10K+ saves total'],
      mindsetRule: 'Media compounding. Cada appearance = 5 cross-posts. Saga multi-mes empieza.',
    },
    {
      name: 'Refinement + Setup Next 90d',
      weekRange: '13',
      goal: 'Audit + double-down on winners + setup próximo trimestre',
      keyWorkflows: ['research-trends-deep', 'monetization-funnel-setup'],
      kpis: ['Top 10 posts identified', 'Winning patterns documented', 'Next 90d roadmap'],
      mindsetRule: 'Kill mediocre stuff. Doubling down sobre lo que rompe.',
    },
  ],
};

const WEEK_TEMPLATES = {
  1: { theme: 'Brand reveal + first 7 posts', dailyCadence: '1 post/día IG + 2 reels semana + daily stories' },
  2: { theme: 'Origin story + framework intro', dailyCadence: '1 post/día + 3 TT videos + daily stories' },
  3: { theme: 'Authority deep-dive', dailyCadence: '5 posts IG + 7 TT + daily stories Q&A' },
  4: { theme: 'Thought leadership controversial', dailyCadence: '5 IG + 7 TT + 1 long-form podcast/article' },
  5: { theme: 'Viral content production', dailyCadence: '7 IG + 10-14 TT + lead magnet launch' },
  6: { theme: 'Funnel optimization', dailyCadence: '5 IG + 7 TT + DM response automation' },
  7: { theme: 'Community ritual establishment', dailyCadence: '5 IG + 7 TT + weekly Q&A live' },
  8: { theme: 'Batch production sprint', dailyCadence: 'Schedule 30 días contenido en 4 días' },
  9: { theme: 'Collab outreach', dailyCadence: '5 IG + 7 TT + 10 DM pitches a creators' },
  10: { theme: 'Cinematic AI content', dailyCadence: '3 cinematic + 5 viral + 7 TT' },
  11: { theme: 'Media presence push', dailyCadence: '5 IG + 7 TT + 3 podcast pitches + LinkedIn' },
  12: { theme: 'Saga arc reveal', dailyCadence: '5 IG + 7 TT + serie cinematic 5 partes' },
  13: { theme: 'Audit + next 90d setup', dailyCadence: 'Analytics deep + planning + final wrap' },
};

export const generateWeekPlan = ({ weekNumber, niche, brandStage }) => {
  const phase =
    ROADMAP_90_DAYS.phases.find((p) => {
      const [start, end] = p.weekRange.split('-').map(Number);
      return weekNumber >= start && weekNumber <= (end || start);
    }) || ROADMAP_90_DAYS.phases[0];
  const template = WEEK_TEMPLATES[weekNumber] || WEEK_TEMPLATES[1];
  return {
    weekNumber,
    phase: phase.name,
    theme: template.theme,
    dailyCadence: template.dailyCadence,
    workflows: phase.keyWorkflows,
    kpis: phase.kpis,
    mindsetRule: phase.mindsetRule,
    niche,
    brandStage,
  };
};

export const handleBrandRoadmap = async (req, res, path, m, body) => {
  const json = (code, b) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(b));
  };
  const url = new URL(req.url || '/', 'http://x');

  if (path === '/api/roadmap/90-days' && m === 'GET') {
    return (json(200, ROADMAP_90_DAYS), true);
  }
  if (path === '/api/roadmap/week' && m === 'GET') {
    const weekNumber = Number(url.searchParams.get('week')) || 1;
    const niche = url.searchParams.get('niche') || 'general';
    const brandStage = url.searchParams.get('stage') || 'foundation';
    return (json(200, generateWeekPlan({ weekNumber, niche, brandStage })), true);
  }
  if (path === '/api/roadmap/week' && m === 'POST') {
    return (json(200, generateWeekPlan(body || {})), true);
  }
  return false;
};
