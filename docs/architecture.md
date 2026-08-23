# FeedIA System Architecture

## Overview

FeedIA runs on Railway (PostgreSQL + Redis) + Vercel (frontend) with 112 endpoints across 15 autonomous tiers.

## Request → Response Cycle

1. Client Request (HTTPS)
2. Railway Express Server receives
3. Auth Middleware validates API key
4. Rate Limiter checks Redis bucket (1000 req/min)
5. Tier Enforcer validates campaign limits + budget
6. Feature Flags middleware checks tier access
7. Endpoint handler processes → Check Redis cache → If miss: Query PostgreSQL → Update cache → Return response
8. Activity logged (audit trail)
9. Response sent to client

## Tier System (Tiers 1-15)

| Tier | Limit | Features |
|------|-------|----------|
| 1-3 | 1 campaign | Prompt generation |
| 4-7 | 3 campaigns | Content generation |
| 8-10 | 6 campaigns | Video generation + A/B testing |
| 11-13 | 20 campaigns | ROI tracking + webhooks |
| 14-15 | Unlimited | Custom branding + white label |

## Database Schema

- users (id, email, tier, stripe_subscription_id, created_at)
- campaigns (id, user_id, title, platform, status, created_at)
- carousel_analytics (id, campaign_id, event_type, count, created_at)
- audience_segments (id, user_id, campaign_id, name, rules, created_at)
- ab_tests (id, campaign_id, user_id, name, variant_a_id, variant_b_id, status)
- api_costs (id, user_id, provider, operation, cost, metadata, created_at)

## Caching Strategy (Redis)

- L1 (5min): /api/trends/detect, /api/carousel/:id/metrics
- L2 (10min): /api/abtest/:id/results, /api/roi/calculate
- L3 (15min): /api/audience/segments, /api/cost/summary

Hit rate target: 60-80%. Fallback: direct PostgreSQL query.

## Security

- Authentication: X-API-Key header, timing-safe comparison
- Encryption: TLS 1.2+ for all traffic
- Rate Limiting: 1000 req/min per key
- SQL Injection: Parameterized queries
- Secrets: Environment variables only

Status: Production-ready.
