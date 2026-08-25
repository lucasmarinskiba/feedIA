/**
 * Templates — reusable content & workflow templates
 * Types: carousel, reel, story, workflow (autopilot sequences)
 */

import { v4 as uuid } from 'uuid';

/**
 * Pre-built carousel templates
 */
export const CAROUSEL_TEMPLATES = {
  'educational-5-slide': {
    id: 'tpl_carousel_edu',
    name: 'Educational 5-Slide',
    category: 'carousel',
    slides: 5,
    structure: [
      { position: 1, role: 'hook', title: 'HOOK: Max 8 words', subtitle: 'Attention grabber' },
      { position: 2, role: 'content', title: 'Point 1: Concept', subtitle: 'Explain first idea' },
      { position: 3, role: 'content', title: 'Point 2: Breakdown', subtitle: 'Deep dive' },
      { position: 4, role: 'insight', title: 'Hidden insight', subtitle: 'What nobody says' },
      { position: 5, role: 'cta', title: 'CTA: Action now', subtitle: 'Call to action' },
    ],
    estimatedTimeMin: 45,
  },
  'narrative-8-slide': {
    id: 'tpl_carousel_narrative',
    name: 'Narrative Story 8-Slide',
    category: 'carousel',
    slides: 8,
    structure: [
      { position: 1, role: 'hook', title: 'Scene 1: Problem', subtitle: 'Relatable situation' },
      { position: 2, role: 'context', title: 'Context: Why it matters', subtitle: 'Stakes' },
      { position: 3, role: 'content', title: 'Journey: Challenge 1', subtitle: 'First obstacle' },
      { position: 4, role: 'content', title: 'Journey: Challenge 2', subtitle: 'Rising tension' },
      { position: 5, role: 'content', title: 'Transformation', subtitle: 'The pivot' },
      { position: 6, role: 'content', title: 'Result: Outcome', subtitle: 'Happy ending' },
      { position: 7, role: 'insight', title: 'Lesson: Key takeaway', subtitle: 'Universal truth' },
      { position: 8, role: 'cta', title: 'CTA: Next step', subtitle: 'How to apply' },
    ],
    estimatedTimeMin: 60,
  },
  'listicle-10-slide': {
    id: 'tpl_carousel_listicle',
    name: 'Top 10 List',
    category: 'carousel',
    slides: 10,
    structure: Array.from({ length: 10 }, (_, i) => ({
      position: i + 1,
      role: i === 0 ? 'hook' : i === 9 ? 'cta' : 'content',
      title: i === 0 ? 'Top 10:' : `#${i}: Item`,
      subtitle: i === 0 ? 'Hook intro' : i === 9 ? 'Call to action' : 'Benefit/explanation',
    })),
    estimatedTimeMin: 90,
  },
};

/**
 * Pre-built reel templates
 */
export const REEL_TEMPLATES = {
  'quick-tip-15sec': {
    id: 'tpl_reel_tip',
    name: 'Quick Tip 15-Second',
    category: 'reel',
    durationSec: 15,
    beats: [
      { time: '0-2s', role: 'hook', description: 'Verbal hook + visual hook', content: 'Attention grabber' },
      { time: '2-8s', role: 'content', description: 'Tip/hack demonstration', content: 'Show the thing' },
      { time: '8-13s', role: 'result', description: 'Quick result or benefit', content: 'Why it matters' },
      { time: '13-15s', role: 'cta', description: 'Call to action', content: 'Save/Share/Follow' },
    ],
    estimatedTimeMin: 20,
  },
  'storytelling-30sec': {
    id: 'tpl_reel_story',
    name: 'Storytelling 30-Second',
    category: 'reel',
    durationSec: 30,
    beats: [
      { time: '0-5s', role: 'hook', description: 'Relatable problem', content: 'Opening hook' },
      { time: '5-15s', role: 'journey', description: 'Journey/transformation', content: 'Middle development' },
      { time: '15-25s', role: 'result', description: 'Result + emotional hit', content: 'Payoff' },
      { time: '25-30s', role: 'cta', description: 'Call to action', content: 'Next step' },
    ],
    estimatedTimeMin: 40,
  },
};

/**
 * Workflow templates (autopilot sequences)
 */
export const WORKFLOW_TEMPLATES = {
  'daily-posting': {
    id: 'wf_daily',
    name: 'Daily Content Schedule',
    description: 'Post carousel at 9am, reel at 12pm, story at 6pm',
    triggers: ['time-based'],
    actions: [
      {
        time: '09:00',
        action: 'publish-carousel',
        params: { format: 'carousel', slots: 5 },
      },
      {
        time: '12:00',
        action: 'publish-reel',
        params: { format: 'reel', durationSec: 15 },
      },
      {
        time: '18:00',
        action: 'publish-story',
        params: { format: 'story', frames: 4 },
      },
    ],
  },
  'weekly-strategy': {
    id: 'wf_weekly',
    name: 'Weekly Content Strategy',
    description: 'Monday=Planning, Tue-Thu=Content, Fri=CTA, Sat-Sun=Engagement',
    triggers: ['day-of-week'],
    actions: [
      { day: 'monday', action: 'plan-week', params: {} },
      { day: 'tuesday', action: 'publish-carousel', params: {} },
      { day: 'wednesday', action: 'publish-reel', params: {} },
      { day: 'thursday', action: 'publish-carousel', params: {} },
      { day: 'friday', action: 'publish-cta', params: {} },
      { day: 'saturday', action: 'engage-comments', params: {} },
      { day: 'sunday', action: 'analyze-week', params: {} },
    ],
  },
};

/**
 * Templates HTTP handler
 */
export const handleTemplates = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  // ─── GET /api/templates/carousels ─────────────────────────
  if (path === '/api/templates/carousels' && m === 'GET') {
    return json(200, {
      templates: Object.values(CAROUSEL_TEMPLATES),
      count: Object.keys(CAROUSEL_TEMPLATES).length,
    });
  }

  // ─── GET /api/templates/reels ──────────────────────────────
  if (path === '/api/templates/reels' && m === 'GET') {
    return json(200, {
      templates: Object.values(REEL_TEMPLATES),
      count: Object.keys(REEL_TEMPLATES).length,
    });
  }

  // ─── GET /api/templates/workflows ──────────────────────────
  if (path === '/api/templates/workflows' && m === 'GET') {
    return json(200, {
      templates: Object.values(WORKFLOW_TEMPLATES),
      count: Object.keys(WORKFLOW_TEMPLATES).length,
    });
  }

  // ─── GET /api/templates/:id ──────────────────────────────
  if (path.startsWith('/api/templates/') && !path.includes('/apply') && m === 'GET') {
    const id = path.split('/')[3];
    const allTemplates = {
      ...CAROUSEL_TEMPLATES,
      ...REEL_TEMPLATES,
      ...WORKFLOW_TEMPLATES,
    };
    const template = allTemplates[id];

    if (!template) {
      return json(404, { error: 'template-not-found' });
    }

    return json(200, template);
  }

  // ─── POST /api/templates/:id/apply ────────────────────────
  if (path.endsWith('/apply') && m === 'POST') {
    const id = path.split('/')[3];
    const { workspaceId, customization = {} } = body || {};

    if (!workspaceId) {
      return json(400, { error: 'workspaceId required' });
    }

    const allTemplates = {
      ...CAROUSEL_TEMPLATES,
      ...REEL_TEMPLATES,
      ...WORKFLOW_TEMPLATES,
    };
    const template = allTemplates[id];

    if (!template) {
      return json(404, { error: 'template-not-found' });
    }

    // Apply template: merge with customization
    const appliedTemplate = {
      id: `applied_${uuid()}`,
      baseTemplateId: id,
      workspaceId,
      template: {
        ...template,
        ...customization,
      },
      createdAt: new Date().toISOString(),
    };

    // In production: save to DB
    // await store.set(`feedia:applied-template:${appliedTemplate.id}`, appliedTemplate);

    return json(200, appliedTemplate);
  }

  // ─── POST /api/templates/custom ────────────────────────────
  if (path === '/api/templates/custom' && m === 'POST') {
    const { name, category, structure, userId } = body || {};

    if (!name || !category || !structure) {
      return json(400, { error: 'name, category, structure required' });
    }

    const customTemplate = {
      id: `tpl_custom_${uuid()}`,
      name,
      category,
      structure,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    // In production: save to DB
    // await store.set(`feedia:template:${customTemplate.id}`, customTemplate);

    return json(200, customTemplate);
  }

  return false;
};
