# GDPR Compliance — FeedIA

## Legal Basis
- **Service Provision**: Processing user data for carousel storage service (Article 6(1)(b))
- **Legitimate Interest**: Security, fraud prevention, analytics (Article 6(1)(f))
- **Consent**: For audit logging (Pro+ tier, Article 7)

## Data Subject Rights

### Right to Access (Article 15)
- **Endpoint**: `POST /api/users/:user_id/export`
- **Response**: Complete user data export (JSON)
- **Timeline**: Within 30 days
- **Format**: Machine-readable, portable

### Right to Rectification (Article 16)
- Update user profile via account settings
- Contact support for correction of usage data

### Right to Erasure (Article 17)
- **Endpoint**: `DELETE /api/users/:user_id`
- **Scope**: Cascading delete of all user data, carousels, audit logs
- **Exceptions**: Legal hold, litigation, tax records (7 years)

### Right to Restrict Processing (Article 18)
- Premium tier: Custom encryption keys (BYOK)
- Pro tier: Data retention control

### Right to Data Portability (Article 20)
- Export endpoint provides JSON/CSV download
- All carousels + metadata included

### Right to Object (Article 21)
- Opt-out of analytics: Account settings
- Opt-out of marketing: Unsubscribe link in emails

## Data Processing Agreement (DPA)

### Data Controller
- **FeedIA** (User) — determines purpose and means of processing
- User owns all carousel data, images, metadata

### Data Processor
- **Cloud Infrastructure Providers**:
  - Railway (hosting)
  - Backblaze/Wasabi (storage)
  - PostgreSQL (database)
  
### Sub-processors
- Notification services (if implemented)
- Analytics services (anonymized)

## Security Measures

- **Encryption**: AES-256-GCM at rest, TLS 1.3 in transit
- **Access Control**: Role-based (Free/Pro/Premium)
- **Audit Logging**: All actions logged with 90d-7y retention
- **IP Whitelist**: Pro+ network access control
- **2FA**: TOTP + backup codes for Pro+

## Data Retention

| Data Type | Free | Pro | Premium |
|-----------|------|-----|---------|
| Audit Logs | 90 days | 1 year | 7 years |
| Carousels | Until deletion | Until deletion | Until deletion |
| User Account | Until deletion | Until deletion | Until deletion |
| Backup Codes | Encrypted, 1 year | Encrypted, 1 year | Encrypted, 1 year |

## Breach Notification

In case of data breach:
1. Notify supervisory authority within 72 hours (Article 33)
2. Notify affected users without undue delay (Article 34)
3. Document breach in audit logs
4. Preserve evidence for investigation

**Contact**: security@feedia.io

## Cross-Border Transfers

- Data stored in US-based infrastructure (Backblaze B2)
- Equivalent to EU adequacy (Standard Contractual Clauses available upon request)
- Premium users may request EU-only storage

## Privacy Policy Updates

- Last updated: 2026-08-03
- Annual review cycle
- Users notified of material changes via email
- 30-day opt-out period for new terms
