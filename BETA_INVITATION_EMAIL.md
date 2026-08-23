# Beta Testing Invitation Email

**Subject:** You're invited to test FeedIA 🚀 (Early Access)

---

Hi [NAME],

You're invited to be a **beta tester** for **FeedIA** — the AI-powered content creation platform for Instagram, TikTok, and YouTube.

We're launching early access starting **August 23, 2026** and need your feedback to shape the final product.

## What You'll Test

- ✅ User registration & authentication
- ✅ Content management (posts, videos, carousels)
- ✅ Performance metrics & analytics
- ✅ API key management
- ✅ Storage & consumption tracking
- ✅ Tier-based limits (Free / Pro / Agency)

## Get Started in 5 Minutes

**1. Register:**
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "YourPassword123!",
    "username": "your_username"
  }'
```

**2. Use your tokens** in subsequent API calls

**3. Test all scenarios** in the guide below

**4. Report bugs/feedback** to lucasdmarin@gmail.com

## Pre-made Test Accounts (Optional)

If you prefer, use one of these accounts:

| Email | Password | Tier | Purpose |
|-------|----------|------|---------|
| beta-tester-1@feedia.dev | BetaTest123! | Free | Basic testing |
| beta-tester-2@feedia.dev | BetaTest123! | Pro | Advanced features |
| qa-engineer@feedia.dev | BetaTest123! | Pro | QA testing |

## Full Testing Guide

[Download/View: BETA_TESTERS_GUIDE.md](./BETA_TESTERS_GUIDE.md)

Covers:
- Registration & login
- Profile management
- Content upload & tracking
- API key management
- Error scenarios
- Performance testing

## Timeline

**Phase 1 (Aug 23-30):** Core features testing
- Registration, authentication, profile
- Content upload & management
- Consumption tracking

**Phase 2 (Aug 30-Sep 6):** Integrations testing
- Social media publishing
- Analytics integration
- Advanced features

**Phase 3 (Sep 6+):** Public launch

## What We Need From You

1. **Test the scenarios** in the guide
2. **Report bugs** with exact steps to reproduce
3. **Share feedback** on UX, performance, features
4. **Try edge cases** (invalid data, large files, etc.)
5. **Use API keys** and test programmatic access

## Sample Testing Checklist

- [ ] Registration works
- [ ] Login returns valid tokens
- [ ] Can update profile
- [ ] Can upload posts/videos
- [ ] Storage usage tracked correctly
- [ ] Can filter/search content
- [ ] API key creation works
- [ ] Error messages are clear
- [ ] Response times acceptable
- [ ] Authorization prevents unauthorized access

## Report Bugs

Email: lucasdmarin@gmail.com

**Format:**
```
Title: [What's broken]
Endpoint: [POST/GET /api/...]
Expected: [What should happen]
Actual: [What happened]
Reproduce: [Steps to reproduce]
Response: [JSON if applicable]
```

## Questions?

- **API Docs:** See BETA_TESTERS_GUIDE.md
- **System Status:** https://web-production-fa7b5.up.railway.app/health
- **Email:** lucasdmarin@gmail.com

## Beta Tester Benefits

- 🎁 Early access to all features
- 🎁 Free tier upgraded for testing period
- 🎁 Your feedback shapes the product
- 🎁 Special mention in launch credits
- 🎁 Lifetime discount code (TBD)

---

**Ready to test?** Start with your registration above or use a pre-made account.

Thank you for helping us build FeedIA! 🙌

**— The FeedIA Team**

---

P.S. Bring bugs, not opinions. We want data on what works/doesn't work, not what you'd prefer. Testing period is Aug 23 - Sep 6.
