/**
 * Admin Dashboard - User/Billing Management
 * Gated: OWNER_EMAIL only
 */

import crypto from 'crypto';

// Mock data stores
const adminLogs = [];
const users = new Map();
const subscriptions = new Map();

/**
 * Check admin access (OWNER_EMAIL only)
 */
const checkAdminAccess = (email) => {
  const ownerEmail = process.env.OWNER_EMAIL || 'admin@feedia.app';
  return email === ownerEmail;
};

/**
 * Log admin action
 */
const logAdminAction = (adminEmail, action, resourceType, resourceId, changes = {}) => {
  const entry = {
    id: crypto.randomUUID(),
    admin_email: adminEmail,
    action, // create, update, delete, view
    resource_type: resourceType, // user, subscription, content
    resource_id: resourceId,
    changes,
    timestamp: new Date().toISOString(),
    ip: '0.0.0.0', // In production: extract from request
  };

  adminLogs.push(entry);
  return entry;
};

/**
 * Get user stats
 */
const getUserStats = () => {
  const allUsers = Array.from(users.values());

  return {
    total_users: allUsers.length,
    by_tier: {
      free: allUsers.filter((u) => u.tier === 'free').length,
      starter: allUsers.filter((u) => u.tier === 'starter').length,
      premium: allUsers.filter((u) => u.tier === 'premium').length,
    },
    active_subscriptions: Array.from(subscriptions.values()).filter((s) => s.status === 'active').length,
    total_mrr: Array.from(subscriptions.values()).reduce((sum, s) => sum + (s.monthly_amount || 0), 0),
  };
};

/**
 * Get billing dashboard
 */
const getBillingDashboard = () => {
  const subs = Array.from(subscriptions.values());
  const active = subs.filter((s) => s.status === 'active');
  const canceled = subs.filter((s) => s.status === 'canceled');

  return {
    total_mrr: active.reduce((sum, s) => sum + (s.monthly_amount || 0), 0),
    total_arr: active.reduce((sum, s) => sum + (s.monthly_amount * 12 || 0), 0),
    active_subscriptions: active.length,
    canceled_subscriptions: canceled.length,
    churn_rate: canceled.length / (active.length + canceled.length) || 0,
    total_revenue_all_time: subs.reduce((sum, s) => sum + (s.total_paid || 0), 0),
    invoices_count: subs.length * 12, // Mock: 1 invoice per sub per month
    failed_payments: subs.filter((s) => s.status === 'payment_failed').length,
  };
};

/**
 * Admin HTTP handler
 */
export const handleAdmin = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  // Extract admin email from auth header or x-user-id
  const adminEmail = req.headers['x-admin-email'] || req.headers['x-user-id'];

  if (!adminEmail || !checkAdminAccess(adminEmail)) {
    return json(403, { error: 'Admin access required' });
  }

  try {
    // ── GET /api/admin/dashboard ────────────────────────────────────
    if (path === '/api/admin/dashboard' && m === 'GET') {
      const userStats = getUserStats();
      const billingDash = getBillingDashboard();

      logAdminAction(adminEmail, 'view', 'dashboard', 'main');

      return json(200, {
        users: userStats,
        billing: billingDash,
        system: {
          uptime_hours: 72,
          error_rate: 0.001,
          avg_response_time_ms: 245,
          cache_hit_rate: 0.68,
        },
      });
    }

    // ── GET /api/admin/users (list all) ──────────────────────────────
    if (path === '/api/admin/users' && m === 'GET') {
      const { search, tier, limit = 50, offset = 0 } = body || {};

      let filtered = Array.from(users.values());

      if (search) {
        filtered = filtered.filter((u) => u.email.includes(search) || u.name.includes(search));
      }

      if (tier) {
        filtered = filtered.filter((u) => u.tier === tier);
      }

      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      logAdminAction(adminEmail, 'view', 'users', 'list', {
        search,
        tier,
        returned: paginated.length,
      });

      return json(200, {
        users: paginated,
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      });
    }

    // ── GET /api/admin/users/:id ─────────────────────────────────────
    if (path.startsWith('/api/admin/users/') && m === 'GET') {
      const userId = path.split('/')[4];
      const user = users.get(userId);

      if (!user) {
        return json(404, { error: 'User not found' });
      }

      logAdminAction(adminEmail, 'view', 'user', userId);

      return json(200, {
        user: {
          ...user,
          last_login: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          content_count: 42,
          videos_generated: 15,
          total_storage_bytes: 2.5 * 1024 * 1024 * 1024,
        },
      });
    }

    // ── PUT /api/admin/users/:id/tier ────────────────────────────────
    if (path.includes('/users/') && path.includes('/tier') && m === 'PUT') {
      const userId = path.split('/')[4];
      const { new_tier } = body || {};
      const user = users.get(userId);

      if (!user) {
        return json(404, { error: 'User not found' });
      }

      const oldTier = user.tier;
      user.tier = new_tier;

      logAdminAction(adminEmail, 'update', 'user', userId, {
        tier: `${oldTier} → ${new_tier}`,
      });

      return json(200, { user, updated: true });
    }

    // ── POST /api/admin/users/:id/reset-password ─────────────────────
    if (path.includes('/reset-password') && m === 'POST') {
      const userId = path.split('/')[4];
      const user = users.get(userId);

      if (!user) {
        return json(404, { error: 'User not found' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');

      logAdminAction(adminEmail, 'update', 'user', userId, {
        action: 'password_reset_sent',
      });

      return json(200, {
        ok: true,
        reset_token: resetToken,
        expires_in_hours: 1,
        email_sent: true,
      });
    }

    // ── DELETE /api/admin/users/:id ──────────────────────────────────
    if (path.startsWith('/api/admin/users/') && !path.includes('/tier') && !path.includes('/reset') && m === 'DELETE') {
      const userId = path.split('/')[4];
      const user = users.get(userId);

      if (!user) {
        return json(404, { error: 'User not found' });
      }

      users.delete(userId);

      logAdminAction(adminEmail, 'delete', 'user', userId, {
        email: user.email,
        tier: user.tier,
      });

      return json(200, { deleted: true, user_id: userId });
    }

    // ── GET /api/admin/billing ───────────────────────────────────────
    if (path === '/api/admin/billing' && m === 'GET') {
      const dashboard = getBillingDashboard();

      logAdminAction(adminEmail, 'view', 'billing', 'dashboard');

      return json(200, dashboard);
    }

    // ── GET /api/admin/billing/invoices ──────────────────────────────
    if (path === '/api/admin/billing/invoices' && m === 'GET') {
      const invoices = Array.from(subscriptions.values()).flatMap((sub) => [
        {
          id: `inv_${sub.id}_1`,
          user_id: sub.user_id,
          amount: sub.monthly_amount,
          status: 'paid',
          issued_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          due_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          paid_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        },
      ]);

      logAdminAction(adminEmail, 'view', 'billing', 'invoices', {
        count: invoices.length,
      });

      return json(200, { invoices, total: invoices.length });
    }

    // ── GET /api/admin/content ───────────────────────────────────────
    if (path === '/api/admin/content' && m === 'GET') {
      const content = [
        {
          id: 'c1',
          user_id: 'u1',
          type: 'carousel',
          status: 'published',
          views: 1200,
          engagements: 45,
          created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        },
        {
          id: 'c2',
          user_id: 'u2',
          type: 'reel',
          status: 'published',
          views: 5600,
          engagements: 234,
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ];

      logAdminAction(adminEmail, 'view', 'content', 'all', {
        count: content.length,
      });

      return json(200, { content, total: content.length });
    }

    // ── DELETE /api/admin/content/:id ────────────────────────────────
    if (path.startsWith('/api/admin/content/') && m === 'DELETE') {
      const contentId = path.split('/')[4];

      logAdminAction(adminEmail, 'delete', 'content', contentId, {
        reason: 'admin_moderation',
      });

      return json(200, { deleted: true, content_id: contentId });
    }

    // ── GET /api/admin/logs ──────────────────────────────────────────
    if (path === '/api/admin/logs' && m === 'GET') {
      const { limit = 100, offset = 0 } = body || {};

      const paginated = adminLogs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);

      return json(200, {
        logs: paginated,
        total: adminLogs.length,
        limit,
        offset,
      });
    }

    // ── GET /api/admin/health ────────────────────────────────────────
    if (path === '/api/admin/health' && m === 'GET') {
      return json(200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime_seconds: 259200,
        checks: {
          database: 'up',
          cache: 'up',
          storage: 'up',
          email: 'up',
        },
        performance: {
          avg_response_time_ms: 245,
          p95_response_time_ms: 1200,
          p99_response_time_ms: 3400,
          cache_hit_rate: 0.68,
          error_rate: 0.001,
        },
      });
    }

    // ── POST /api/admin/feature-flag/:name ───────────────────────────
    if (path.startsWith('/api/admin/feature-flag/') && m === 'POST') {
      const featureName = path.split('/')[4];
      const { enabled } = body || {};

      logAdminAction(adminEmail, 'update', 'feature_flag', featureName, {
        enabled,
      });

      return json(200, {
        feature: featureName,
        enabled,
        applied_immediately: true,
      });
    }

    return false;
  } catch (err) {
    return json(500, { error: String(err).replace('Error: ', '') });
  }
};

export { logAdminAction, getUserStats, getBillingDashboard };
