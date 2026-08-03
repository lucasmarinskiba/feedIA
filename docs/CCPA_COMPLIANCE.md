# CCPA Compliance — FeedIA

## California Consumer Privacy Act (CCPA) — California Residents

Applies to: Residents of California (regardless of location)

## Consumer Rights Under CCPA

### 1. Right to Know (§1798.100)
- **What**: All personal information collected about you
- **Endpoint**: `POST /api/users/:user_id/export`
- **Timeline**: 45 days (extendable 45 more)
- **Verification**: Confirm identity (email + password)

**Types of data collected**:
- Name, email, phone (account)
- IP address, user agent, device info (access logs)
- Usage patterns (carousel views, exports)
- Billing information (Pro+)
- 2FA secrets, backup codes (encrypted)

### 2. Right to Delete (§1798.105)
- **What**: Delete all personal information (with exceptions)
- **Endpoint**: `DELETE /api/users/:user_id`
- **Timeline**: 45 days
- **Exceptions**: Legal hold, tax records (7 years), fraud prevention

**Not deletable**:
- Audit logs required by law
- Backup copies (deleted within 60 days)
- De-identified data (CCPA no longer applies)

### 3. Right to Opt-Out (§1798.120)
- **Scope**: Sale or sharing of personal information
- **Status**: FeedIA does NOT sell consumer data
- **Verification**: Opt-out mechanism available via account settings

### 4. Right to Correct (§1798.100(d))
- Correct inaccurate personal information
- Update email, account details via settings
- Request correction via support

### 5. Right to Limit Use (§1798.115)
- Limit use to service delivery + legal obligation
- Pro+ users: Custom data retention policies
- Manage communications preferences

## Biometric Information (§1798.100)

FeedIA does NOT collect:
- Facial recognition
- Fingerprints
- Iris scans
- Voice/speech patterns (except user-provided)

## Categories of Personal Information Collected

| Category | Examples | Collected | Shared |
|----------|----------|-----------|--------|
| Identifiers | Email, user ID, IP | Yes | No |
| Biometric | (None) | No | No |
| Commercial | Billing, plan type | Yes | No |
| Activity | Login, uploads, exports | Yes | No |
| Geo | IP-derived location | Yes | No |
| Professional | N/A | No | No |
| Education | N/A | No | No |
| Inferences | Usage patterns | Yes (Pro+) | No |

## Source of Data

- **Direct**: User-provided (email, password, 2FA)
- **Automated**: System logs (IP, timestamps, API calls)
- **Inferred**: Usage analytics (anonymized)

## Use of Personal Information

### Service Delivery
- Carousel storage + retrieval
- User authentication
- Payment processing
- Customer support

### Legal Compliance
- Audit logging (security)
- GDPR/CCPA compliance
- Tax/financial records
- Fraud prevention

### Marketing (Opt-in only)
- Product updates
- Feature announcements
- Security alerts

## Consumer Request Process

### Verification
1. Email request to privacy@feedia.io
2. Confirm identity: Email + password
3. FeedIA verifies within 10 business days

### Response
- Provide data in portable format (JSON/CSV)
- Include all collected data
- List third parties (if any) with access

### Appeal
- Right to appeal denial within 45 days
- Provide supplemental information
- FeedIA responds within 60 days

## Accessibility

- Privacy policy in plain language (grades 8-10 reading level)
- Available in Spanish (upon request)
- Screen-reader accessible online form

## Shockingly Sensitive Data

**Not applicable**: FeedIA does not collect:
- SSN / Tax ID
- Financial account info
- Medical/health records
- Genetic data
- Sex life / sexual orientation
- Religion

## Non-Discrimination

FeedIA will NOT:
- Deny goods/services
- Charge different prices
- Provide different quality of service
- Discriminate against consumers for exercising CCPA rights

**Allowed**:
- Loyalty/financial incentive programs
- Data collection consent (if material difference disclosed)

## Contact

**Privacy Officer**: privacy@feedia.io
**Mailing Address**: [To be added]
**Response Time**: 45 days (extendable 45 more)

## Last Updated
August 3, 2026
