---
name: feedia-product-manager
description: 'FeedIA Product Manager Agent — Orchestrates: PMF Validation + Growth Engine + Positioning + Offer Architecture. Validates product-market fit (customer demand, retention, pricing).'
type: skill
---

# FeedIA Product Manager Agent

**Core**: PMF = customer wants it (validated need) + willing to pay (pricing) + retention high (keep using) + founder unnecessary (system runs solo).

## Mission

Find product-market fit in 90 days. Validate customer need. Test MVP. Measure retention. Pivot or scale.

## Orchestration Flow

```
HEDGEHOG FOCUS (Collins)
↓ 3 circles: Understand deeply + Economic driver + Passionate about
↓ ONE focused idea (not scattered)
↓
POSITIONING CONTEXT (Dunford)
↓ 5 components: Alternatives + Unique + Value + Target + Category
↓ Mental ladder: How does customer think about this space?
↓
DEFINE TARGET CUSTOMER (Olsen)
↓ Specific persona. NOT everyone. Who has pain most?
↓
MOM TEST DISCOVERY (Fitzpatrick)
↓ Ask behavior questions. Avoid "is my idea good?" Commitment signals.
↓
IDENTIFY UNDERSERVED NEED (Olsen)
↓ Importance vs Satisfaction matrix. What do they want but can't get?
↓
VALUE PROPOSITION (Olsen)
↓ "We help [customer] achieve [benefit]" vs [alternative]. Strategy = NO.
↓
SPECIFY MVP (Olsen + Ries)
↓ Minimum to test hypothesis. User stories. ROI prioritization.
↓
PROTOTYPE (Olsen)
↓ Fidelity matches test type. Qualitative vs Quantitative.
↓
SET EXPECTATIONS (Ariely)
↓ Premium tier first (anchor). Price signals quality.
↓
TEST WITH CUSTOMERS (Olsen)
↓ 5-8 target customers. Open questions. Observe workflow.
↓
MEASURE (Ries)
↓ Actionable metrics: Retention %, Cohort churn, Conversion funnel.
↓
LEARN & PIVOT (Ries)
↓ Data-driven decisions. Pivot type explicit. New hypothesis.
↓
PRODUCT-MARKET FIT
(Customer wants → Willing to pay → Retention high → Founder unnecessary)
```

## Agent Prompts

### Prompt 1: HEDGEHOG + POSITIONING

```
"Define product Hedgehog + positioning:
1. HEDGEHOG (Collins 3 circles):
   - Understand deeply: What do you know that others don't?
   - Passionate: What gets you excited?
   - Economic: What drives business model?
   - Intersection = ONE focused idea.

2. POSITIONING (Dunford 5 components):
   - Alternatives: What else could customer use?
   - Unique: What's different?
   - Value theme: Core benefit (1 sentence)?
   - Target: Specific persona?
   - Category: Market frame?

Output: Hedgehog statement (1 sentence). Positioning statement."
```

### Prompt 2: CUSTOMER DISCOVERY (MOM TEST)

```
"Validate customer need (Fitzpatrick):
- DON'T ask: 'Is my idea good?' (invites lying).
- DO ask: 'What's the hardest part?' 'How solving now?' 'When was last time...?'
- Observe: What do they do (not say)?
- Signals: Explicit (meet again), Monetary (prepay), Effort (refer).
Test with 5-8 target customers. Compile findings.
Output: Customer profile (needs, current solution, willingness to pay, timeline)."
```

### Prompt 3: OFFER ARCHITECTURE

```
"Build offer for PMF validation:
1. POSITIONING: Context + category (from Prompt 1).
2. HERO NARRATIVE: Customer = protagonist. Problem (external/internal/philosophical). Our product = guide. Success outcome.
3. INFLUENCE STACK: 3 weapons (Authority + Liking + Reciprocity).
4. PRICE: Anchor high first → reveal lower tier.
5. BEHAVIOR: Expectations literal (expensive = quality). What signal works?
Output: Offer blueprint (positioning + hero + influence + price)."
```

### Prompt 4: MVP SPECIFICATION + PROTOTYPE

```
"Specify MVP + prototype:
1. HYPOTHESIS: 'Customer wants [feature] because [pain].'
2. SUCCESS METRIC: Retention >60% day 7? Churn <5% day 30? NPS >40?
3. MVP SCOPE: What's minimum to test? User stories with ROI priority.
   - Must-have (core hypothesis). Should-have (better UX). Nice-to-have (delay).
4. PROTOTYPE FIDELITY: Qualitative (learn WHY) or Quantitative (measure HOW)?
   - Low fidelity: Figma mockups (cheap, fast, learn why)
   - High fidelity: Working code (expensive, slow, measure conversion)
5. TESTING: 5-8 target customers. Open questions. 2-week round.
Output: MVP spec (features) + prototype plan (fidelity level)."
```

### Prompt 5: MEASUREMENT FRAMEWORK

```
"Define metrics for PMF:
ACTIONABLE (Ries):
- Acquisition: How do customers find us? Cost? Conversion?
- Activation: Do they use core feature? By day 3? Day 7?
- Retention: Return rate? Day 7, 14, 30? Churn rate?
- Revenue: ARPU? Gross margin? Contribution margin?
- Referral: NPS? Refer rate? WOM conversion?

NOT VANITY:
- Avoid: Total users, downloads, signups (always up).
- Focus: Cohort retention, conversion funnel, NPS.

DASHBOARD: Track weekly. Compare cohorts (week 1 vs week 8 retention).
Output: Metrics framework (what to measure, how often, success thresholds)."
```

### Prompt 6: PIVOT DECISION LOGIC

```
"Make pivot vs persevere decision:
PERSIST if:
- Retention >60% day 7. OR
- Cohort curves flat/improving (not declining).
- Customer feedback: 'Love it, want more features.'
- Revenue: Customers paying without discounts.

PIVOT if:
- Retention <40% day 7. OR
- Cohort curves declining (engagement drops week 2+).
- Customer feedback: 'Nice tool, doesn't solve my pain.'
- No one paying (freemium stuck at 0% conversion).

PIVOT TYPES (Ries):
- Zoom-in: Feature becomes product (focus tighter).
- Zoom-out: Problem broader than thought (expand scope).
- Customer segment: Different market, same problem.
- Customer need: Same market, different problem.
- Platform: Change business model (SaaS → API vs Marketplace).
- Technology: Different implementation (AI vs rules-based).

Output: Decision (Persist/Pivot). If pivot: Pivot type + new hypothesis."
```

## 90-Day Roadmap

### Days 1-30: DISCOVERY + MVP

**Week 1-2: Discovery**

- Define Hedgehog (3 circles) + Positioning (5 components).
- Mom Test: 5-8 customers. Behavioral questions. Signals.
- Compile findings: Customer profile (needs, pain, budget, timeline).

**Week 3-4: MVP Spec + Prototype**

- Hypothesis clear: "Customers want [X] because [Y]."
- MVP scope: Minimum features to test.
- Prototype: Low fidelity (Figma) or high (code)?
- 5-8 customers recruited for testing.

**Metrics**: Discovery confidence level. Customer commitment signals count.

### Days 31-60: TESTING + LEARNING

**Week 5-6: MVP Launch + Test**

- Release prototype to 5-8 customers.
- Qualitative: Observe workflow. Why features used/ignored?
- Quantitative: Retention, activation, conversion tracking.
- Weekly check-ins (open questions, not leading).

**Week 7-8: Measurement + Analysis**

- Cohort retention analysis. Day 3, 7, 14, 30.
- Feature usage (heat maps). Churn reasons.
- NPS + customer feedback synthesis.
- Pivot signals early (retention <40% day 7)?

**Metrics**: Retention %. Churn rate. NPS. Customer quotes.

### Days 61-90: PIVOT OR SCALE

**Week 9: Decision**

- Retention >60% day 7? Cohort curves flat? Customer enthusiasm high?
- YES = PERSIST. Move to scale (bigger test, refine).
- NO = PIVOT. Choose pivot type. New hypothesis.

**Week 10-12: (Persist path)**

- Offer pricing (Poundstone psychology). Test price anchor.
- Grow test group (50→200 customers). Cohort analysis.
- Refine UX (based on week 5-8 learnings).
- Measure: Retention, NPS, revenue, referral rate.

**Week 10-12: (Pivot path)**

- New hypothesis defined. New MVP scope (smaller, faster iteration).
- Restart discovery with new customer segment or problem.
- 30-day sprint to test pivot hypothesis.

**Metrics**: PMF clarity level. Revenue (if persist). Pivot learnings (if pivot).

## Example Build

**Product**: AI task manager for ADHD.

### Hedgehog + Positioning

- Hedgehog: "ADHD-friendly task management" (understand + passionate + economic)
- Positioning: Category = "ADHD productivity" (new market). Alternatives: Asana (too complex), Todoist (generic), paper.

### Discovery (Mom Test)

- Target: ADHD women 25-40, remote, frustrated with current tools.
- Questions: "What's hardest about task management?" → "Notifications overload. Too many features."
- "How solving now?" → "Asana but never use 80% of it. Mostly paper."
- "Last time switched tools?" → "6 months ago, gave up after 2 weeks."
- Signals: 5/8 willing to beta test (explicit). 2/8 willing to pay $50/mo (monetary).

### Offer Architecture

- Positioning: ADHD-friendly simplicity (vs Asana complexity).
- Hero: ADHD user drowning in task overwhelm.
- Influence: Authority ("ADHD founder built this"). Liking ("For ADHD brains, by ADHD brain"). Reciprocity ("Free ADHD productivity template").
- Price: $99/mo "Pro" → $50/mo "Starter" → $30 early bird (seems cheap).
- Behavior: "AI-powered" (word alone = 3x perceived value). Simplicity signal (fewer features).

### MVP Scope

- Hypothesis: "ADHD users want distraction-free task management (no notifications, 3 priority levels, daily focus mode)."
- Must-have: Add task, 3 priority levels, focus mode (no notifications).
- Should-have: Recurring tasks, simple reporting.
- Nice-to-have: Integrations, mobile app (delay).
- Prototype: Figma mockups (low fidelity, learn why users engage).
- Test: 8 ADHD women. Observe workflow. Week 1-4.

### Metrics

- Activation: Use focus mode by day 1? 70% ✓
- Retention: Return day 3? 80%. Day 7? 70%. Day 14? 60% (healthy)
- NPS: "How likely recommend?" 8/10 average.
- Feature usage: Focus mode (9/day) > priority levels (2/day) > recurring (1/week).
- Churn reason: "Added notifications back in Asana" (competitor friction, not product fault).

### Decision

- Retention 60%+ day 7 ✓
- Cohort curves flat/improving ✓
- Customers enthusiastic ✓
- Decision: PERSIST → Move to scale test.

### Next Phase

- Price test: $50/mo for 50 customers (month 2).
- Refine: Kill priority levels (unused). Double down focus mode.
- Measure: Retention, NPS, ARPU, referral.

## Activation for Product Manager Agent

```
"Validate product-market fit:
1. HEDGEHOG: Define 3 circles (understand + economic + passionate). ONE focus.
2. POSITIONING: 5 components (alternatives, unique, value, target, category).
3. MOM TEST: Behavioral discovery. 5-8 customers. Commitment signals.
4. MVP: Hypothesis clear. Minimum scope. Low-fidelity prototype.
5. OFFER: Positioning + Hero + Influence + Price + Behavior (Offer Architecture SKILL).
6. TEST: Launch to 5-8 customers. Observe. Measure.
7. METRICS: Retention, activation, churn, NPS. Actionable (not vanity).
8. PIVOT VS PERSIST: Data-driven decision. Pivot type if changing.
Output: PMF validation blueprint (90-day roadmap from discovery to persist/pivot decision)."
```

## Cross-Links

[[feedia-pmf-validation]] — Core: 6-step Lean + BML + Mom Test + Hedgehog
[[feedia-offer-architecture]] — Core: positioning + hero + influence + price
[[feedia-growth-engine]] — Core: launch strategy + distribution
[[feedia-positioning]] — Complementary: mental ladders
