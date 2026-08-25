/**
 * User Feedback Collection
 * Template/workflow ratings, feature requests
 */

import { v4 as uuid } from 'uuid';

export const handleFeedback = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return json(401, { error: 'x-user-id header required' });
  }

  // ─── POST /api/feedback/content ──────────────────────────────
  if (path === '/api/feedback/content' && m === 'POST') {
    const { contentId, rating, comment } = body || {};

    if (!contentId || !rating) {
      return json(400, { error: 'contentId, rating required' });
    }

    if (rating < 1 || rating > 5) {
      return json(400, { error: 'rating must be 1-5' });
    }

    try {
      const feedback = {
        id: `fb_${uuid()}`,
        userId,
        contentId,
        rating,
        comment: comment || null,
        createdAt: new Date().toISOString(),
        helpful: 0, // votes
      };

      // In production: save to DB
      // await store.saveFeedback(feedback);

      return json(200, feedback);
    } catch (err) {
      return json(500, { error: 'feedback-save-failed' });
    }
  }

  // ─── POST /api/feedback/template ────────────────────────────
  if (path === '/api/feedback/template' && m === 'POST') {
    const { templateId, rating, difficulty } = body || {};

    if (!templateId || !rating) {
      return json(400, { error: 'templateId, rating required' });
    }

    try {
      const feedback = {
        id: `fb_tpl_${uuid()}`,
        userId,
        templateId,
        rating,
        difficulty: difficulty || 'medium', // easy, medium, hard
        useCount: 0,
        createdAt: new Date().toISOString(),
      };

      // In production: save + aggregate template ratings
      // await store.saveFeedback(feedback);

      return json(200, feedback);
    } catch (err) {
      return json(500, { error: 'feedback-save-failed' });
    }
  }

  // ─── POST /api/feedback/feature-request ─────────────────────
  if (path === '/api/feedback/feature-request' && m === 'POST') {
    const { title, description, category } = body || {};

    if (!title || !description) {
      return json(400, { error: 'title, description required' });
    }

    try {
      const request = {
        id: `freq_${uuid()}`,
        userId,
        title,
        description,
        category: category || 'general', // general, video, analytics, collaboration
        votes: 1,
        status: 'new', // new, reviewed, planned, shipped, declined
        createdAt: new Date().toISOString(),
      };

      // In production: save + notify product team
      // await store.set(`feedia:feature-request:${request.id}`, request);

      return json(200, request);
    } catch (err) {
      return json(500, { error: 'request-save-failed' });
    }
  }

  // ─── GET /api/feedback/content/:contentId ───────────────────
  if (path.startsWith('/api/feedback/content/') && m === 'GET') {
    const contentId = path.split('/')[4];

    try {
      // In production: fetch from DB
      // const feedbacks = await store.getFeedback(contentId);
      const feedbacks = []; // mock

      const stats = {
        total: feedbacks.length,
        avgRating:
          feedbacks.length > 0
            ? (
                feedbacks.reduce((sum, f) => sum + f.rating, 0) /
                feedbacks.length
              ).toFixed(2)
            : 0,
        distribution: {
          5: feedbacks.filter(f => f.rating === 5).length,
          4: feedbacks.filter(f => f.rating === 4).length,
          3: feedbacks.filter(f => f.rating === 3).length,
          2: feedbacks.filter(f => f.rating === 2).length,
          1: feedbacks.filter(f => f.rating === 1).length,
        },
      };

      return json(200, { contentId, stats, feedbacks });
    } catch (err) {
      return json(500, { error: 'fetch-feedback-failed' });
    }
  }

  // ─── GET /api/feedback/top-templates ────────────────────────
  if (path === '/api/feedback/top-templates' && m === 'GET') {
    // Aggregate template ratings
    const topTemplates = [
      {
        templateId: 'tpl_carousel_edu',
        name: 'Educational 5-Slide',
        avgRating: 4.7,
        reviews: 24,
        difficultyScore: 2,
      },
      {
        templateId: 'tpl_reel_story',
        name: 'Storytelling 30-Second',
        avgRating: 4.5,
        reviews: 18,
        difficultyScore: 3,
      },
      {
        templateId: 'tpl_carousel_listicle',
        name: 'Top 10 List',
        avgRating: 4.3,
        reviews: 15,
        difficultyScore: 1,
      },
    ];

    return json(200, { templates: topTemplates });
  }

  // ─── GET /api/feedback/feature-requests ─────────────────────
  if (path === '/api/feedback/feature-requests' && m === 'GET') {
    const { status = 'new', category } = body || {};

    const requests = [
      {
        id: 'freq_123',
        title: 'Multi-language support',
        description: 'Support Spanish, Portuguese, French prompts',
        category: 'general',
        votes: 47,
        status: 'planned',
        createdAt: '2026-08-15T10:00:00Z',
      },
      {
        id: 'freq_124',
        title: 'TikTok Shop integration',
        description: 'Direct product links in TikTok videos',
        category: 'analytics',
        votes: 32,
        status: 'reviewed',
        createdAt: '2026-08-18T14:30:00Z',
      },
    ];

    const filtered = category
      ? requests.filter(r => r.category === category)
      : requests;

    return json(200, {
      requests: filtered.sort((a, b) => b.votes - a.votes),
      total: filtered.length,
    });
  }

  // ─── PUT /api/feedback/feature-requests/:id/vote ────────────
  if (
    path.startsWith('/api/feedback/feature-requests/') &&
    path.endsWith('/vote') &&
    m === 'PUT'
  ) {
    const id = path.split('/')[4];

    try {
      // In production: increment votes + dedup by userId
      // const request = await store.get(`feedia:feature-request:${id}`);
      // request.votes += 1;
      // await store.set(`feedia:feature-request:${id}`, request);

      return json(200, { id, voted: true, newVotes: 48 });
    } catch (err) {
      return json(500, { error: 'vote-failed' });
    }
  }

  return false;
};
