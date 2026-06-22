# Security Policy — FeedIA

## Supported versions

We release security patches for the latest tagged version and the current `main` branch.

| Version           | Supported |
| ----------------- | --------- |
| Latest tag (`v*`) | ✅        |
| `main` branch     | ✅        |
| Older tags        | ❌        |

## Reporting a vulnerability

If you discover a security vulnerability, please **do not open a public issue**.

Instead, report it privately to:

- **Email:** security@paithonlabs.com (or `lucasdmarin@gmail.com` if the security mailbox is not yet active)
- **Subject:** `[FeedIA Security] <short description>`

Include as much detail as possible:

- Steps to reproduce
- Affected endpoints, files, or dependencies
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within **48 hours** and provide a remediation timeline within **5 business days**.

## Security measures in place

- All pull requests run `npm audit`, Trivy filesystem/image scanning, and TruffleHog secret scanning.
- Docker images are signed with GitHub artifact attestations.
- SBOMs are generated for every release image.
- Secrets are stored in GitHub Secrets and never committed to the repository.
- Supabase Row-Level Security (RLS) is enforced for all tenant tables.
- Frontend builds disable source maps and inject a Content Security Policy.

## Disclosure policy

We follow coordinated disclosure. Once a fix is released, we will publish a security advisory and update `CHANGELOG.md` under the "Security" section.

## Security runbook

For incident response procedures (secret rotation, rollback, notification), see [`docs/SECURITY_RUNBOOK.md`](docs/SECURITY_RUNBOOK.md).
