/**
 * Email Service - SendGrid Integration
 * Notifications: signup, invites, alerts, billing, password reset
 */

import crypto from 'crypto';

// Mock SendGrid client (replace with real sendgrid package)
class EmailService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.SENDGRID_API_KEY || 'mock-key';
    this.emails = []; // Mock storage
  }

  /**
   * Email templates
   */
  templates = {
    welcome: {
      subject: 'Welcome to FeedIA',
      template: (user) => `
        <h1>Welcome, ${user.name}!</h1>
        <p>Your account has been created.</p>
        <p><a href="https://feedia.vercel.app/verify?token=${crypto.randomBytes(32).toString('hex')}">Verify Email</a></p>
      `,
    },
    invite: {
      subject: 'Team Invitation',
      template: (data) => `
        <h1>${data.inviter_name} invited you to ${data.workspace_name}</h1>
        <p>Role: ${data.role}</p>
        <p><a href="https://feedia.vercel.app/invite?code=${data.invite_code}">Accept Invitation</a></p>
      `,
    },
    publish_success: {
      subject: 'Content Published Successfully',
      template: (data) => `
        <h1>✅ Published!</h1>
        <p>Your ${data.content_type} has been published to ${data.platform}.</p>
        <p>Views: ${data.views || 0} | Engagements: ${data.engagements || 0}</p>
        <p><a href="https://feedia.vercel.app/analytics/${data.content_id}">View Analytics</a></p>
      `,
    },
    publish_failed: {
      subject: '❌ Publishing Failed',
      template: (data) => `
        <h1>Publishing failed</h1>
        <p>Error: ${data.error}</p>
        <p><a href="https://feedia.vercel.app/content/${data.content_id}">Retry</a></p>
      `,
    },
    password_reset: {
      subject: 'Reset Your Password',
      template: (data) => `
        <h1>Reset Password</h1>
        <p>Click the link below to reset your password (expires in 1 hour):</p>
        <p><a href="https://feedia.vercel.app/reset-password?token=${data.reset_token}">Reset Password</a></p>
      `,
    },
    billing_invoice: {
      subject: 'Invoice #{{invoice_id}}',
      template: (data) => `
        <h1>Invoice</h1>
        <p>Amount: $${data.amount} ${data.currency}</p>
        <p>Plan: ${data.plan_name}</p>
        <p>Period: ${data.period_start} to ${data.period_end}</p>
        <p><a href="https://feedia.vercel.app/billing/invoices/${data.invoice_id}">View Invoice</a></p>
      `,
    },
    billing_failed: {
      subject: 'Payment Failed',
      template: (data) => `
        <h1>Payment Failed</h1>
        <p>Your payment for ${data.plan_name} could not be processed.</p>
        <p>Reason: ${data.error}</p>
        <p><a href="https://feedia.vercel.app/billing">Update Payment Method</a></p>
      `,
    },
    weekly_report: {
      subject: 'Weekly Analytics Report',
      template: (data) => `
        <h1>Your Weekly Report</h1>
        <p>Total Views: ${data.total_views}</p>
        <p>Total Engagements: ${data.total_engagements}</p>
        <p>Content Published: ${data.content_count}</p>
        <p>ROI: ${data.roi}%</p>
        <p><a href="https://feedia.vercel.app/analytics">View Full Analytics</a></p>
      `,
    },
  };

  /**
   * Send email
   */
  async send(to, templateName, data = {}) {
    if (!this.apiKey || this.apiKey === 'mock-key') {
      console.log(`📧 [MOCK] Email to ${to}: ${templateName}`);
      return { id: crypto.randomUUID(), status: 'queued' };
    }

    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const email = {
      id: crypto.randomUUID(),
      to,
      subject: template.subject,
      html: template.template(data),
      template_name: templateName,
      sent_at: new Date().toISOString(),
      status: 'sent',
    };

    this.emails.push(email);

    // Mock SendGrid API call
    if (this.apiKey !== 'mock-key') {
      try {
        // Real SendGrid call would go here
        // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {...})
      } catch (err) {
        console.error('SendGrid error:', err);
        email.status = 'failed';
      }
    }

    return email;
  }

  /**
   * Get email logs
   */
  getLog(limit = 100) {
    return this.emails.slice(-limit);
  }

  /**
   * Get bounces/complaints
   */
  getBounces() {
    return this.emails.filter((e) => e.status === 'bounced' || e.status === 'complained');
  }
}

const emailService = new EmailService();

/**
 * Email HTTP handler
 */
export const handleEmail = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  try {
    // POST /api/email/send (internal only)
    if (path === '/api/email/send' && m === 'POST') {
      // Guard: only internal calls
      if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
        return json(401, { error: 'unauthorized' });
      }

      const { to, template, data } = body || {};

      if (!to || !template) {
        return json(400, { error: 'to, template required' });
      }

      const result = await emailService.send(to, template, data || {});
      return json(200, result);
    }

    // GET /api/email/templates
    if (path === '/api/email/templates' && m === 'GET') {
      const templates = Object.keys(emailService.templates).map((name) => ({
        name,
        subject: emailService.templates[name].subject,
      }));

      return json(200, { templates });
    }

    // POST /api/email/test (send test email)
    if (path === '/api/email/test' && m === 'POST') {
      const { to, template } = body || {};

      if (!to || !template) {
        return json(400, { error: 'to, template required' });
      }

      const result = await emailService.send(to, template, { name: 'Test User' });
      return json(200, result);
    }

    // GET /api/email/logs
    if (path === '/api/email/logs' && m === 'GET') {
      const limit = parseInt(req.headers['x-limit'] || '100');
      const logs = emailService.getLog(limit);

      return json(200, { emails: logs, total: logs.length });
    }

    // GET /api/email/bounces
    if (path === '/api/email/bounces' && m === 'GET') {
      const bounces = emailService.getBounces();
      return json(200, { bounces });
    }

    return false;
  } catch (err) {
    return json(500, { error: String(err).replace('Error: ', '') });
  }
};

export { emailService };
