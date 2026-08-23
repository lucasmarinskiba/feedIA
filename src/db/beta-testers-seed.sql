-- Beta Testers Seed Data
-- Insert test accounts for beta phase

-- Insert beta tester accounts (passwords: BetaTest123! hashed with bcrypt at rounds 12)
INSERT INTO users (
  id, email, username, password_hash, tier, plan, status,
  first_name, last_name, storage_limit_gb, api_calls_limit,
  language, timezone, created_at, updated_at
) VALUES
-- beta-tester-1: Password hashed (normally would use bcrypt)
  (
    gen_random_uuid(),
    'beta-tester-1@feedia.dev',
    'betatester1',
    '$2b$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', -- bcrypt hash
    'free',
    'free',
    'active',
    'Beta',
    'Tester One',
    5,
    1000,
    'es',
    'America/Argentina/Buenos_Aires',
    NOW(),
    NOW()
  ),
-- beta-tester-2
  (
    gen_random_uuid(),
    'beta-tester-2@feedia.dev',
    'betatester2',
    '$2b$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    'pro',
    'pro',
    'active',
    'Beta',
    'Tester Two',
    50,
    10000,
    'es',
    'America/Argentina/Buenos_Aires',
    NOW(),
    NOW()
  ),
-- qa-engineer
  (
    gen_random_uuid(),
    'qa-engineer@feedia.dev',
    'qaengineer',
    '$2b$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    'pro',
    'pro',
    'active',
    'QA',
    'Engineer',
    50,
    10000,
    'es',
    'America/Argentina/Buenos_Aires',
    NOW(),
    NOW()
  ),
-- product-manager
  (
    gen_random_uuid(),
    'pm@feedia.dev',
    'productmanager',
    '$2b$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    'agency',
    'agency',
    'active',
    'Product',
    'Manager',
    500,
    100000,
    'es',
    'America/Argentina/Buenos_Aires',
    NOW(),
    NOW()
  ),
-- security-tester
  (
    gen_random_uuid(),
    'security@feedia.dev',
    'securitytester',
    '$2b$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    'pro',
    'pro',
    'active',
    'Security',
    'Tester',
    50,
    10000,
    'es',
    'America/Argentina/Buenos_Aires',
    NOW(),
    NOW()
  )
ON CONFLICT(email) DO NOTHING;

-- Insert sample content for beta-tester-1
INSERT INTO user_generated_content (
  id, user_id, content_type, title, description,
  file_url, file_size_mb, platform, status,
  metadata, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'post'::TEXT,
  'Beta Testing Post ' || i,
  'Sample content for beta testing - Post ' || i,
  'https://example.com/post-' || i || '.jpg',
  (RANDOM() * 10 + 0.5)::DECIMAL,
  CASE WHEN (i % 3 = 0) THEN 'instagram' WHEN (i % 3 = 1) THEN 'tiktok' ELSE 'youtube' END,
  CASE WHEN (i % 2 = 0) THEN 'draft' ELSE 'published' END,
  '{"dimensions": "1080x1080", "format": "square"}'::JSONB,
  NOW() - INTERVAL '1 day' * (i % 30),
  NOW() - INTERVAL '1 day' * (i % 30)
FROM users u, generate_series(1, 10) AS i
WHERE u.email = 'beta-tester-1@feedia.dev'
ON CONFLICT DO NOTHING;

-- Insert sample content for beta-tester-2
INSERT INTO user_generated_content (
  id, user_id, content_type, title, description,
  file_url, file_size_mb, platform, status,
  metadata, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  CASE WHEN (i % 2 = 0) THEN 'post' ELSE 'video' END,
  'Professional Content ' || i,
  'Sample content for beta testing - Pro tier ' || i,
  'https://example.com/pro-' || i || CASE WHEN (i % 2 = 0) THEN '.jpg' ELSE '.mp4' END,
  (RANDOM() * 100 + 10)::DECIMAL,
  CASE WHEN (i % 3 = 0) THEN 'instagram' WHEN (i % 3 = 1) THEN 'tiktok' ELSE 'youtube' END,
  CASE WHEN (i % 2 = 0) THEN 'published' ELSE 'draft' END,
  '{"dimensions": "1080x1920", "duration": 30}'::JSONB,
  NOW() - INTERVAL '1 day' * (i % 30),
  NOW() - INTERVAL '1 day' * (i % 30)
FROM users u, generate_series(1, 15) AS i
WHERE u.email = 'beta-tester-2@feedia.dev'
ON CONFLICT DO NOTHING;

-- Insert usage tracking
INSERT INTO user_usage (user_id, date, api_calls, storage_added_gb, content_generated)
SELECT
  u.id,
  CURRENT_DATE - INTERVAL '1 day' * (i % 30),
  FLOOR(RANDOM() * 100 + 10)::INT,
  (RANDOM() * 2 + 0.1)::DECIMAL,
  FLOOR(RANDOM() * 5 + 1)::INT
FROM users u, generate_series(1, 20) AS i
WHERE u.email IN ('beta-tester-1@feedia.dev', 'beta-tester-2@feedia.dev')
ON CONFLICT(user_id, date) DO UPDATE SET
  api_calls = EXCLUDED.api_calls,
  storage_added_gb = EXCLUDED.storage_added_gb,
  content_generated = EXCLUDED.content_generated;

-- Insert sample analytics for published content
INSERT INTO carousel_analytics (carousel_id, user_id, event_type, source)
SELECT
  c.id,
  c.user_id,
  CASE WHEN (random() < 0.4) THEN 'view'
       WHEN (random() < 0.7) THEN 'like'
       WHEN (random() < 0.85) THEN 'share'
       ELSE 'save' END,
  'instagram'
FROM user_generated_content c
WHERE c.status = 'published'
  AND c.user_id IN (
    SELECT id FROM users WHERE email IN ('beta-tester-1@feedia.dev', 'beta-tester-2@feedia.dev')
  )
LIMIT 100
ON CONFLICT DO NOTHING;

-- Log audit events for beta testers
INSERT INTO audit_log (user_id, action, resource_type, resource_id, status, created_at)
SELECT
  u.id,
  'beta_account_created',
  'user',
  u.id::TEXT,
  'success',
  NOW()
FROM users u
WHERE u.email IN (
  'beta-tester-1@feedia.dev',
  'beta-tester-2@feedia.dev',
  'qa-engineer@feedia.dev',
  'pm@feedia.dev',
  'security@feedia.dev'
)
ON CONFLICT DO NOTHING;
