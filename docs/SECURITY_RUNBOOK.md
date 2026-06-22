# Security Runbook — FeedIA

## Incident response

### 1. Secret compromise

If you suspect a secret (API key, database password, etc.) has been leaked:

1. **Rotate immediately:**
   - Supabase: Project Settings → Database → Reset password.
   - Upstash: Rotate Redis password.
   - Anthropic: Regenerate API key.
   - Vercel: Regenerate token.
   - GitHub: Regenerate `GITHUB_TOKEN` / PATs.

2. **Update GitHub Secrets** with the new values.

3. **Trigger redeploy** of staging and production.

4. **Review logs** in Sentry and Vercel for unauthorized usage.

5. **Notify users** if personal data was affected (GDPR/compliance).

### 2. Dependency vulnerability

1. Check `npm audit` and Trivy reports.
2. Apply patch or update dependency.
3. Run `npm run verify`.
4. Deploy hotfix.

### 3. Suspicious traffic / DDoS

1. Check Vercel analytics and rate-limit metrics.
2. Enable stricter rate limits temporarily.
3. Contact Vercel support if needed.

### 4. Database breach

1. Pause affected services.
2. Restore from latest verified backup.
3. Audit RLS policies.
4. Force password reset for affected users.

## Reporting

See [`SECURITY.md`](../SECURITY.md).
