---
name: product-roadmap-generator
description: Product Roadmap Generator. AI system that takes hedgehog + customer insights → generates 90-day PMF validation roadmap (discovery + MVP + test + pivot decision).
type: content-generator
---

# Product Roadmap Generator

**Purpose**: Input hedgehog focus + customer insights → Output complete 90-day PMF roadmap (discovery → MVP → testing → pivot/persist decision).

**Timeline**: 3 hours (from inputs → ready-to-execute PMF validation plan).

**Uses**: PMF Validation SKILL + Olsen 6-step + Ries build-measure-learn + Fitzpatrick Mom Test + Collins Hedgehog.

---

## INPUT SECTION

**1. Hedgehog Focus** (3-circle intersection)

- What you understand deeply: _________________
- Economic driver (how makes money): _________________
- What gets you excited: _________________

**Hedgehog statement** (1 sentence): _________________

---

**2. Market Positioning**

- Target customer: _________________
- Problem they have: _________________
- Why you, not competitor: _________________

---

**3. Customer Discovery Insights**

- Interview 5-8 customers? (Yes/No)
- Common pain point that emerged: _________________
- % willing to pay: _____ (target 50%+)
- % with high urgency: _____ (target 50%+)

---

## GENERATOR LOGIC

**Step 1**: Validate positioning (weeks 1-2)

- Do 5-8 customer interviews (discovery questions)
- Test if positioning sticks (can 4/5 repeat it back?)
- Confirm pain is real (specific + urgent)

**Step 2**: Build MVP (weeks 3-4)

- Define 3-4 must-have features (test hypothesis)
- Decide fidelity (mockups, landing page, or working MVP?)
- Recruit 5-8 beta testers

**Step 3**: Launch + test (weeks 5-8)

- Deploy prototype
- Track retention, NPS, feature usage (weekly)
- Weekly check-ins with customers (why questions)
- Iterate weekly based on feedback

**Step 4**: Pivot vs Persist (weeks 9-10)

- Measure against criteria (retention >60% D7, NPS >50, churn <10%/mo)
- Decide: persist (scale), pivot (change hypothesis), or kill

**Step 5**: Scale path (weeks 11-12, if persist)

- Test pricing
- Optimize onboarding
- Prepare for sales execution

---

## OUTPUT TEMPLATE

### 90-DAY PMF VALIDATION ROADMAP

**Hedgehog**: "Help ADHD makers ship products faster via distraction-free task management"

**Customer**: ADHD women 25-40, remote ops/product roles, $20K/month tool budget

**Problem**: 20 hours/week drowning in task admin, losing focus, can't ship

---

**PHASE 1: DISCOVERY** (Weeks 1-2)

**Goal**: Validate positioning + confirm pain is real

**Customer Discovery Plan**:

Target interviews: 5-8 (from warm intros, existing community, Twitter ADHD space)

**Interview script** (30 min each):

> "I'm building task management for ADHD makers. Not selling — learning. Got 30 min?"
>
> Questions:
>
> 1. "What's hardest about task management now?"
> 2. "How are you solving this now?"
> 3. "When was last time you switched tools?"
> 4. "If you fix ONE thing, what?"
> 5. "Would you try this? Would you pay $50/mo?"

**Success criteria**:

- ☐ 5-8 interviews completed
- ☐ Consistent pain emerges (not random)
- ☐ 4+ willing to try (explicit)
- ☐ 2+ willing to pay (monetary commitment)
- ☐ 3+ high urgency (need within month)

**Positioning test**: "We help ADHD makers save 10 hours/week on task admin vs Asana's chaos."

- Pitch to 5 customers
- ☐ 4/5 remember it + repeat back? → Sticky
- ☐ 4/5 say "this solves my pain?" → Resonates

**Timeline**: 2 weeks
**Output**: Customer profile locked, positioning validated

---

**PHASE 2: MVP** (Weeks 3-4)

**Hypothesis**: "Customers want distraction-free task management (no notifications) because notifications create overwhelm + task switching."

**MVP Scope** (must-haves only):

| Feature                   | Must-Have? | Why                                  |
| ------------------------- | ---------- | ------------------------------------ |
| Add task                  | Yes        | Core: task management                |
| 3 priority levels         | Yes        | Tests if simple > complex            |
| Focus mode (no notifs)    | Yes        | Tests distraction-free = solves pain |
| Recurring tasks           | No         | Nice, not core hypothesis            |
| Integrations (Slack/mail) | No         | Delay to MVP2                        |
| Mobile app                | No         | Test web-only first                  |

**Prototype decision**:

| Option                      | Build Time | Cost    | Learns                    |
| --------------------------- | ---------- | ------- | ------------------------- |
| Figma mockups (low)         | 1-2 weeks  | $0      | "Do customers want this?" |
| Landing page + signup (low) | 1 week     | $0      | "Do customers care?"      |
| Working MVP (high)          | 3-4 weeks  | $500-2K | "Can customers use it?"   |

**Your choice**: _________________ (justify)

**Beta recruitment**:

- Cold DMs to discovery customers (ask referrals)
- Twitter/Reddit ADHD + productivity communities
- ProductHunt early access
- Goal: 5-8 beta testers, high intent

**Recruitment message**:

> "Building task management for ADHD makers. Beta test? 2-week free trial, no CC. Your feedback shapes it. [link]"

**Timeline**: 2 weeks
**Output**: Prototype live, 5-8 beta testers onboarded

---

**PHASE 3: TESTING + LEARNING** (Weeks 5-8)

**Qualitative** (weekly calls with each customer):

- "How's it going? What's working? What's frustrating? What's missing?"
- Watch them use it (don't guide, observe)
- Ask "Why?" not "Do you like it?"
- Iterate weekly (features based on feedback)

**Quantitative** (track daily):

| Metric              | Target  | Why It Matters                         |
| ------------------- | ------- | -------------------------------------- |
| Activation (D1 use) | 70%+    | If <70%, UX broken                     |
| Retention D7        | 60%+    | If <60%, wrong problem or bad solution |
| Retention D30       | 50%+    | If <50%, churn unsustainable           |
| NPS (week 2)        | 50+     | If <50%, not passionate enough         |
| Churn rate          | <10%/mo | If >10%, retention broken              |

**Weekly dashboard** (track):

| Week | Activated | D7 Retention | D14 Retention | NPS | Churn Reason        |
| ---- | --------- | ------------ | ------------- | --- | ------------------- |
| 5    | 70%       | —            | —             | —   | —                   |
| 6    | 75%       | 65%          | —             | 45  | Notifications still |
| 7    | 78%       | 68%          | 60%           | 52  | Missing recurring   |
| 8    | 80%       | 72%          | 65%           | 55  | Adoption improving  |

**Feature iteration**:

- Most used? (focus mode → double down)
- Ignored? (recurring tasks → remove or simplify)
- Blockers? (onboarding confusion → fix flow)

**Timeline**: 4 weeks
**Output**: Metrics + qualitative feedback → clear picture of PMF

---

**PHASE 4: PIVOT VS PERSIST DECISION** (Weeks 9-10)

**Persist criteria** (all must be true):

- ☐ Retention D7 > 60% (sticky)
- ☐ Retention curves flat or improving (not declining week 7+)
- ☐ NPS > 50 (enthusiastic)
- ☐ Customers paying (even discounted) without hesitation
- ☐ Churn < 10%/month (sustainable)

**All true?** → **PERSIST** → Scale (day 11+)

**Any false?** → **PIVOT**

**Pivot options**:

| Type             | Change                      | Example                                   |
| ---------------- | --------------------------- | ----------------------------------------- |
| Zoom-in          | Feature becomes product     | "Focus mode app" (instead of full tasks)  |
| Zoom-out         | Problem broader             | "Distraction mgmt" across work, not tasks |
| Customer segment | Different market, same pain | "ADHD students" instead of professionals  |
| Problem          | Same market, different pain | "Notification mgmt" instead of task mgmt  |
| Platform         | Business model change       | "Slack plugin" instead of standalone      |

**Persist example** (if D7 retention 72%, NPS 55, churn 8%):

> ✅ PERSIST. Metrics show PMF. Move to pricing test + sales execution.

**Pivot example** (if D7 retention 45%, NPS 35, churn 25%):

> ⚠️ PIVOT. Problem validation failed. New hypothesis: "Focus mode is the whole product" (zoom-in). Restart discovery with new positioning. 30-day sprint.

**Timeline**: 2 weeks
**Output**: Clear go/no-go decision + next phase path

---

**PHASE 5: SCALE PATH** (Weeks 11-12, if persist)

**Pricing test**:

| Tier     | Price  | Target | Conversion |
| -------- | ------ | ------ | ---------- |
| Early    | $30/mo | 5      | % signal?  |
| Standard | $50/mo | 5      | % winner?  |

- Which converts higher?
- If $30 converts 2x better → price too high, iterate
- Result: refined pricing

**Onboarding optimization**:

- If retention 60-70%, test:
  - Email onboarding sequence (daily tips week 1)
  - In-app nudges (remind to use focus mode)
  - Live onboarding call (help setup)
- Goal: push retention 60% → 70% → 80%

**Hiring for sales**:

- Profile: Someone who gets ADHD makers
- Onboarding: Give them Sales Playbook (sales-system-generator.md)
- Week 1: Land 5 customers
- Week 2: Land 10
- Week 3: Automate process

**Timeline**: 2 weeks
**Output**: Pricing validated, onboarding optimized, sales team hired + trained

---

## SUCCESS CRITERIA

**PMF Validated** when:

- ☐ 5-8 discovery interviews (Mom Test)
- ☐ Positioning resonates (4/5 repeat it back)
- ☐ MVP built (3-4 must-haves)
- ☐ 5-8 beta testers recruited
- ☐ Retention D7 > 60% (measured)
- ☐ Retention curves flat/improving D7-30
- ☐ NPS > 50 (enthusiastic customers)
- ☐ Churn < 10%/month (sustainable)
- ☐ Pivot vs Persist decision made (data-driven)
- ☐ Pricing tested + refined
- ☐ Ready for sales execution (playbook ready)

---

## METRICS DASHBOARD (Track Weekly)

| Week  | Interviews | Activation % | Retention D7 | NPS | Decision        |
| ----- | ---------- | ------------ | ------------ | --- | --------------- |
| 1-2   | 3-5        | —            | —            | —   | Positioning OK? |
| 3-4   | 5-8        | —            | —            | —   | MVP ready?      |
| 5-6   | 8          | 60%          | —            | —   | On track?       |
| 7-8   | 8          | 70%          | 65%          | 45  | Leaning persist |
| 9-10  | 8          | 75%          | 70%          | 55  | ✅ PERSIST      |
| 11-12 | —          | 80%          | 75%          | 60  | Ready for sales |

---

## NEXT STEPS

**Day 1-14**: Complete discovery (5-8 interviews, positioning validated)
**Day 15-28**: Build + recruit (MVP live, beta testers onboarded)
**Day 29-56**: Test + learn (weekly check-ins, iterate features)
**Day 57-70**: Analyze (retention curves, NPS trends, pivot signals)
**Day 71-84**: Pivot vs Persist decision (data-driven)
**Day 85-90**: Scale path (pricing tested, sales ready)

**If persist** → Launch Sales Execution (sales-system-generator.md) → land first 100 customers.

**If pivot** → Restart discovery with new hypothesis → 30-day sprint.

---

## ONGOING METRICS (Post-Day 90)

- Weekly retention (churn spike = early warning)
- Monthly NPS (sentiment tracking)
- Feature usage (what's sticking)
- Churn reasons (why people leave)
- Monthly MRR growth (revenue signal)
