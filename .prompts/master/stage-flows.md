---
name: stage-flows
description: 5 canonical flows showing agent activation + framework sequencing. Discovery → Build → Launch → Scale patterns.
type: master-prompt
---

# FeedIA Stage Flows — 5 Canonical Patterns

## Flow 1: DISCOVERY → Validate Customer Need (PMF Validation Agent)

**Goal**: Determine if customers WANT product + willing to PAY + retention HIGH + founder unnecessary.

**Timeline**: 90 days.

**Primary Agent**: Product Manager.

**Frameworks Activated**:

- Hedgehog (Collins): 3-circle focus (understand + economic + passionate)
- Positioning (Dunford): 5 components (alternatives, unique, value, target, category)
- Mom Test (Fitzpatrick): Behavioral discovery (avoid confirmation bias)
- Expectations (Ariely): Anchor pricing psychology
- Lean Build-Measure-Learn (Ries): Actionable metrics

**Orchestration**:

```
WEEK 1-2: DISCOVERY
├─ Hedgehog: Define 3 circles. What do you understand? Economic driver? Passionate about?
├─ Positioning: 5 components. Who's alternative? Unique? Value theme? Target? Category?
├─ Mom Test: 5-8 customers. Behavioral questions. Commitment signals.
└─ Output: Customer profile + opportunity validated

WEEK 3-4: MVP DESIGN
├─ Hypothesis clear: "Customers want [X] because [Y]."
├─ MVP scope: Minimum features to test hypothesis.
├─ Prototype: Low-fidelity (Figma mockups) or high-fidelity (coded)?
└─ Output: MVP spec + prototype plan

WEEK 5-8: TESTING + LEARNING
├─ Launch prototype to 5-8 customers.
├─ Qualitative: Observe workflow. Why features used/ignored?
├─ Quantitative: Retention (day 3, 7, 14, 30), activation (% using core feature), churn.
├─ Weekly check-ins (open questions, not leading).
└─ Output: Cohort retention data + customer feedback synthesis

WEEK 9-12: PIVOT VS PERSIST
├─ Metrics analysis: Retention >60% day 7? Cohort curves flat/improving?
├─ Customer feedback: Love it (persist) or "nice tool, doesn't solve pain" (pivot)?
├─ Decision: Persist (scale test) or Pivot (change hypothesis + segment/feature/platform)
└─ Output: PMF validation blueprint (persist → scale path, or pivot → new hypothesis)
```

**Success Criteria**:

- Retention >60% day 7
- NPS >50 (willing to recommend)
- Churn <10% (staying engaged)
- Revenue predictable (customers paying without discount)
- Founder unnecessary (system runs solo, team can onboard new customers)

**Example: ADHD Task Manager**

- Week 1-2: Discover ADHD women 25-40 (distraction-free, simplicity > features). Positioning: "ADHD productivity" (new market). Mom Test: 8 customers, 5 willing beta, 2 willing $50/mo.
- Week 3-4: MVP = Add task, 3 priorities, focus mode (no notifications). Prototype: Figma mockups.
- Week 5-8: Test with 8 beta customers. 70% use focus mode day 1. Retention: 80% day 3, 70% day 7, 60% day 14. Qualitative: "Finally, no overwhelm. Ship twice as fast."
- Week 9-12: Retention >60% ✓. NPS 8/10 ✓. Decision: PERSIST → Scale to 50 beta customers (month 2). Price test $50/mo.

---

## Flow 2: OFFER DESIGN → Craft Premium Offer (Sales Closer Agent)

**Goal**: Design complete offer (positioning + pricing + positioning + messaging) ready to sell.

**Timeline**: 30 days.

**Primary Agent**: Sales Closer.

**Frameworks Activated**:

- Positioning (Dunford): Context setting (what category customer thinks)
- Hero Narrative (StoryBrand Miller): Customer = protagonist. Problem. Offer = guide. Success.
- Influence Stacking (Cialdini): 6 weapons combined for maximum effect
- Pricing Psychology (Poundstone + Ariely): Anchoring, relativity, loss aversion framing
- SUCCESs (Heath): Sticky positioning statement (simple + unexpected + concrete + credible + emotional + stories)

**Orchestration**:

```
WEEK 1: POSITIONING CONTEXT
├─ Dunford 5 Components:
│  ├─ Alternatives: What else could customer use? (Asana, paper, nothing)
│  ├─ Unique: What's different? (ADHD-friendly UX, distraction-free)
│  ├─ Value theme: "Focus via simplicity"
│  ├─ Target: ADHD women 25-40 remote
│  └─ Category: "ADHD-friendly productivity"
├─ Mental Ladder: Where does customer think category sits? (New market = we own category)
└─ Output: Positioning statement (1 sentence)

WEEK 2: HERO NARRATIVE
├─ Customer as protagonist:
│  ├─ External problem: Tool complexity, notifications overload
│  ├─ Internal problem: Feeling overwhelmed, losing trust in self
│  └─ Philosophical problem: Losing time with team (should be shipping, not managing admin)
├─ Our offer as guide:
│  ├─ Simplicity (cut 60% of features)
│  ├─ Distraction-free (no notifications)
│  └─ AI-assisted (priority ranking, focus mode)
├─ Success outcome: "Ship twice as fast. Reclaim your brain."
└─ Output: Hero narrative (3-page customer story)

WEEK 2: INFLUENCE STACK
├─ Authority: "Built by ADHD founder. 8/10 NPS from beta." (credential + social proof)
├─ Liking: "ADHD-friendly design. Designed BY people with ADHD, FOR people with ADHD." (similarity)
├─ Reciprocity: "Free ADHD productivity template (30-day challenge)." (give first value)
├─ Scarcity: "Early founder pricing ($30/mo). Increases to $50 next month." (real scarcity)
└─ Output: Influence stack (3-4 weapons per pitch touchpoint)

WEEK 3: PRICING ARCHITECTURE
├─ Anchor high first: Show $99/mo "Pro" tier (enterprises)
├─ Reveal lower: $50/mo "Starter" (standard), $30/mo early bird (scarcity + anchor drives perception)
├─ Behavioral trigger: "AI-powered" label (word alone = 3x perceived value)
├─ Loss aversion framing: "Don't lose 10 hours/week to task overwhelm." (not "save 10 hours")
└─ Output: 3-tier pricing + anchor strategy

WEEK 3: STICKY POSITIONING STATEMENT
├─ SUCCESs: "Stop task overwhelm. Ship twice as fast with distraction-free, ADHD-friendly task management. Join 500+ makers."
├─ Simple: Core benefit (7 words: "stop overwhelm, ship faster")
├─ Unexpected: "ADHD-friendly" (breaks expectation of generic tool)
├─ Concrete: "500+ makers" (specific number), "twice as fast" (measurable)
├─ Credible: "ADHD founder" + NPS proof + user counts
├─ Emotional: Relief + empowerment (high arousal)
├─ Stories: Founder ADHD journey (trojan horse for offer reveal)
└─ Output: Sticky hook statement (1 sentence pitch)

WEEK 4: OBJECTION PLAYBOOK
├─ 10 common objections:
│  1. "Asana works fine for us." → "Scale to 1000 people? How's simplicity?" (probe)
│  2. "Too expensive." → "Saves 40% admin time = $40K/mo in labor." (ROI math)
│  3. "Need to test first." → "30-day trial, no CC, full access." (risk reversal)
│  4-10: [Custom to market]
├─ 3 responses per objection (practiced, automatic)
└─ Output: Objection handling script (ready for sales team)
```

**Success Criteria**:

- Positioning statement can pass "grandmother test" (non-technical person understands in 5 seconds)
- Hero narrative resonates with target customer (they see themselves)
- Influence stack stacks (3-4 weapons activate automatically without feeling salesy)
- Pricing anchoring works (lower tiers feel like bargain)
- Sticky hook tested with 5 customers → 80% retention (they remember, repeat, share)

**Example: ADHD Task Manager Offer**

- Week 1: Positioning confirmed. Category: "ADHD productivity" (new market, we own first position). Competitors: Asana (complex), Todoist (generic), paper (no tools).
- Week 2: Hero: Sarah (ADHD, remote, operations lead, drowning in Asana). Problem: 20 hours/week on task admin. Wants: Simplicity + focus. Offer guides her to "ship 10x faster."
- Week 2: Authority: ADHD founder (credential). "8/10 NPS from beta" (proof). Liking: "Designed BY ADHD, FOR ADHD" (similarity). Reciprocity: Free ADHD challenges (give value first).
- Week 3: Pricing: $99 Pro (shown first, anchors high) → $50 Starter (seems reasonable) → $30 early bird (scarcity drives urgency).
- Week 3: Hook: "Stop task overwhelm. Ship twice as fast with distraction-free, ADHD-friendly task management. Join 500+ makers."
- Week 4: Objection scripts built. "Too expensive?" → "$40K/mo labor savings" (math checks out).
- Result: Offer ready. 30-day trial → 70% day 7 retention → "This is it, I want to pay."

---

## Flow 3: LAUNCH STRATEGY → Go-to-Market + 30/60/90 Plan (Content Strategist Agent)

**Goal**: Execute launch via 30/60/90-day content + growth strategy. Acquire first 100 customers/followers.

**Timeline**: 90 days.

**Primary Agent**: Content Strategist.

**Secondary Agent**: Sales Closer (land first 20 customers).

**Frameworks Activated**:

- Offer Architecture (from Flow 2 output)
- Growth Engine (DEAL framework + Bullseye channel testing)
- SUCCESs (Heath) + STEPPS (Berger): Content pillars
- Positioning (Dunford): Mental ladder
- Behavioral psychology (Ariely + Poundstone): Anchor strategy

**Orchestration**:

```
DAYS 1-30: FOUNDATION
├─ Positioning analysis (from offer design):
│  └─ Category: ADHD productivity. Competitors: generic tools. Unique: ADHD-first design.
├─ 5 hook types (4 posts each = 20 total posts):
│  1. Problem-Agitation-Solution (PAS): "Asana for 1000 people = admin hell. Here's simplicity."
│  2. Curiosity gap: "We removed 60% of features. Shipping 2x faster."
│  3. Social proof: "500+ beta users, 8/10 NPS."
│  4. Behind-the-scenes: "ADHD founder on why distraction-free matters."
│  5. Viral (STEPPS): "ADHD brain hack: 3-priority system ships 10x faster."
├─ Growth target: 1000 followers / 10 customers (30 days)
├─ Channel: TikTok (primary) + Twitter (thought leadership) + Email (nurture)
├─ Posting: 1 post/day (batch created, scheduled)
├─ Engagement: Reply all comments (community building)
└─ Output: Sticky ideas (5 hook types) + posting calendar (20 posts) + engagement tactics

DAYS 31-60: EXPANSION
├─ 10 hook types (add 5 new):
│  6. Comparison: vs Asana (what's different?)
│  7. Data-driven: Stats on ADHD productivity gaps
│  8. Founder story: How I built this for myself
│  9. Transformation: Before/after user journey
│  10. CTA-focused: "Try free 30-day trial"
├─ Growth target: 5000 followers / 50 customers
├─ Channels: Add Instagram Reels (secondary)
├─ Posting: Daily + 3 stories/day
├─ Engagement: DMs + community challenges (refer-a-friend)
└─ Output: 10 hook types + 40 posts + affiliate referral system

DAYS 61-90: OPTIMIZATION
├─ 15 hook types (add 5 new):
│  11. Controversial: "Productivity culture is broken. Simplicity is revolution."
│  12. Tutorial: "5-minute setup. No learning curve."
│  13. Trend jacking: "LinkedIn layoffs = solo founder surge. Here's your tool."
│  14. Collaboration: "Partner founder features us. New audience."
│  15. Community proof: User-generated content (testimonials, dashboards, workflows)
├─ Growth target: 10K followers / 100 customers
├─ Channels: Add LinkedIn (enterprise) + YouTube short (authority)
├─ Posting: Daily + Reels (3x/week) + Stories (daily)
├─ Engagement: Affiliate program launch + ambassador recruitment
└─ Output: 15 hook types + 60 posts + ambassador program + growth flywheel

PARALLEL: SALES EXECUTION (Days 1-90)
├─ Days 1-30: Land 10 customers (direct outreach to ADHD communities)
├─ Days 31-60: Land 25 customers (content-warmed leads)
├─ Days 61-90: Land 65 customers (viral + referrals + affiliates)
└─ Output: Repeatable sales system (Sales Closer SKILL activated)
```

**Success Criteria**:

- 10K followers (90 days)
- 100+ customers acquired
- 50%+ audience-to-customer conversion (high quality)
- 70%+ retention day 7 (product delivers)
- $5K MRR (sustainable)
- 3+ pieces of viral content (10K+ reach each)

**Example: ADHD Task Manager Launch**

- Day 1-30: 5 hook types tested. "Asana = hell" (resonates). "ADHD brain hack" (8K views). 1000 followers. 10 customers ($300 MRR).
- Day 31-60: Expand to 10 hook types. Instagram Reels add reach. "Before/after" (15K views). Refer-a-friend working (20% of new customers from referrals). 5000 followers. 50 customers ($1.5K MRR).
- Day 61-90: 15 hook types. YouTube launch. "Productivity culture broken" (20K views + 500 shares). Ambassador program (5 micro-influencers in ADHD space). 10K followers. 100 customers. $5K MRR.
- Result: Launched. Growth flywheel spinning. Ready for Scale flow.

---

## Flow 4: COMMUNITY BUILDING → 100 → 1000 Members (12 Months) (Community Manager Agent)

**Goal**: Build self-sustaining community (founder facilitates, members drive). Exponential growth via flywheel.

**Timeline**: 12 months.

**Primary Agent**: Community Manager.

**Frameworks Activated**:

- Community Flywheel (Collins): Consistent push → exponential momentum
- SPACES Outcomes (Spinks): Support, Product, Acquisition, Contribution, Engagement, Success
- 3 Stages + 9 Steps (Richardson): Spark → Stoke → Pass
- Genuine Appreciation (Carnegie): Recognition drives engagement + loyalty
- Growth Engine (Ferriss DEAL + Weinberg Bullseye): Referral automation

**Orchestration**:

```
MONTHS 1-3: SPARK + BUILD IDENTITY
├─ Weeks 1-4: Recruit 50 founding members (most passionate, connected)
├─ DO: Weekly ritual (Zoom call, 30 min). "Ship Day" — share progress, give feedback.
├─ Tone: Peer-to-peer (NO lectures, NO selling)
├─ Identity: Name ("Indie SaaS Builders"). Values: Shipping, learning, helping. Ritual: Ship Day.
├─ Appreciation: Public shout-outs for wins ("@Sam shipped [product]. Revenue-positive in 2 weeks.")
├─ Growth: 50 → 100 members (3 months)
├─ Metrics: Retention 70%+, engagement >50% weekly active
└─ Output: Community charter + identity locked + appreciation system

MONTHS 4-6: STOKE + DISTRIBUTE LEADERSHIP
├─ Identify 3-5 leaders (helpers, organizers, speakers)
│  ├─ Ravi (helper): Leads Q&A thread Fridays
│  ├─ Priya (organizer): Monthly in-person meetup
│  └─ Anmol (speaker): Monthly case study video
├─ Give autonomy: Delegate, empower, credit publicly
├─ SPACES audit: Rate 6 outcomes (support 8/10, product 4/10, acquisition 5/10, contribution 6/10, engagement 8/10, success 9/10)
├─ Invest in underserved: Contribution (UGC) + Acquisition (referral program)
├─ Growth: 100 → 300 members (6 months)
├─ Metrics: Retention 75%+, NPS 50+, 40% new members from referrals
└─ Output: Leader roster + delegated ownership + SPACES action plan

MONTHS 7-9: PASS + FLYWHEEL MOMENTUM
├─ Distribute leadership (founder facilitates, members drive)
├─ Content from members (case studies, guides, templates)
├─ Community as growth channel (email + partner channels amplify)
├─ Flywheel turn 4 = self-sustaining (no founder push needed)
├─ Growth: 300 → 500 members (9 months)
├─ Metrics: Retention 80%+, 50% new members from referrals, 30% of customers from community
└─ Output: UGC content library + referral automation + flywheel data

MONTHS 10-12: EXPONENTIAL + SUSTAINABILITY
├─ Flywheel hitting 2x per turn (exponential growth curve)
├─ Leadership deep (5+ sub-leaders running parallel initiatives)
├─ Community = largest traction channel (viral WOM)
├─ Plan 2-year roadmap (geographic expansion, sub-communities)
├─ Growth: 500 → 1000 members (12 months)
├─ Metrics: Retention 85%+, 60% new members from referrals, community = revenue driver
└─ Output: 1000-member community + self-sustaining system + 2-year vision
```

**Success Criteria**:

- 1000 members (month 12)
- 85% retention (monthly active)
- 60% new members from referrals (founder-independent)
- 5+ distributed leaders (founder not critical node)
- Community = top 3 traction channels (product, sales, content all benefit from community halo)
- NPS >60 (members love it, refer friends)

**Example: Indie SaaS Builders**

- Months 1-3: Recruit 50 solo founders. Weekly Ship Day call (30 min, live demo + feedback). "Stop and Ship" values locked. Appreciation: Weekly shout-outs. Growth: 50 → 100.
- Months 4-6: Identify Ravi (active Q&A), Priya (organizes NYC meetup), Anmol (shares case studies). SPACES audit: Support strong, Acquisition weak. Launch referral program ($1-month free for refer). Growth: 100 → 300.
- Months 7-9: Ravi owns Q&A (100+ threads/month). Priya runs 3 in-person meetups (60 attendees). Anmol records case studies (500K+ views). UGC content 80% of output. Founder facilitates, doesn't create. Growth: 300 → 500. 30% of product customers from community.
- Months 10-12: Flywheel exponential. 5 sub-leaders. 60% new members from referrals. 1000 members. Community = partner ecosystem (product recommendations, job board, capital network). $50K/month revenue influenced by community.

---

## Flow 5: SALES EXECUTION → Land First 100 Customers (90 Days) (Sales Closer Agent)

**Goal**: Close first 100 customers using repeatable sales system. Predictable pipeline. Founder-independent.

**Timeline**: 90 days.

**Primary Agent**: Sales Closer.

**Frameworks Activated**:

- Sales System Full (Holmes 12 strategies): Scripts, schedules, objection handling, follow-up
- FBI Negotiation (Voss): Mirror + Empathy + Calibrated questions
- SUCCESs (Heath) + Influence Stacking (Cialdini): Sticky pitch + 6 weapons
- Offer Architecture (from Flow 2): Positioning + hero narrative + pricing psychology

**Orchestration**:

```
DAYS 1-14: SYSTEM SETUP + FIRST 10 CUSTOMERS
├─ Holmes 12 strategies operationalized:
│  ├─ Time management: Calls 9-11am (peak energy)
│  ├─ Scripts: 10 objections × 3 responses (practiced, automatic)
│  ├─ Standards: Email template, call template, deck template
│  ├─ Strategy: Focus on 1 customer segment (highest intent)
│  ├─ Hiring: Sales person or founder takes first 100
│  └─ Follow-up: 3-touch sequence (email → call → email)
├─ Prospect research:
│  ├─ Target: ADHD users in SaaS / Marketing / Ops roles
│  ├─ Pain: Asana fatigue, notification overload, admin hell
│  ├─ Budget: $50-500/mo (pricing test)
│  ├─ Timeline: "Replacing tool this month"
├─ Opening (Cialdini 3 weapons):
│  ├─ Authority: "We work with 500+ ADHD makers." (credential)
│  ├─ Liking: "ADHD founder building for ADHD users." (similarity)
│  └─ Reciprocity: "Free ADHD productivity audit." (give value first)
├─ Pitch (SUCCESs):
│  ├─ Simple: "Stop task overwhelm in 2 weeks."
│  ├─ Unexpected: "60% fewer features, 90% less admin."
│  ├─ Concrete: "30-min setup. 10 hours/week saved."
│  ├─ Credible: "500+ beta users, 8/10 NPS, 70% day-7 retention."
│  ├─ Emotional: "Reclaim your brain. Ship faster. Breathe."
│  └─ Stories: Founder story (ADHD journey → built this for self → now helps 500+)
├─ Objection handling (Holmes): 10 scripts ready
├─ Negotiation (Voss): Mirror + Empathy + Calibrated questions
├─ Close (Cialdini): Commitment escalation (small ask → medium ask → contract)
├─ Results: 10 customers (Day 14 milestone)
└─ Output: Sales system proven. Repeatable. Ready to scale.

DAYS 15-45: SCALE TO 50 CUSTOMERS
├─ Repeat system: Same scripts, schedules, follow-up
├─ Optimize based on early wins:
│  ├─ What objection came up most? Update script.
│  ├─ What pitch resonated? Emphasize it.
│  ├─ What closes deal? Build ritual around it.
├─ Hire: Add second sales person (or outsource VA for research/scheduling)
├─ Channel: Use content as lead generation (content-warmed prospects close 2x faster)
├─ Referral: Ask every customer, "Who else should use this?" (3rd-touch becomes referral)
├─ Results: 50 customers (Day 45 milestone, 50% of goal)
└─ Output: Repeatable system validated with 50 customers. Revenue: $2.5K MRR.

DAYS 46-90: MOMENTUM TO 100 CUSTOMERS
├─ Continue 9-11am call schedule (now: 40-50 calls/week, 10-20 closes/week)
├─ Scaling tactics:
│  ├─ Content-warmed leads (90% of pipeline from content strategy output)
│  ├─ Affiliate referrals (ambassador program from community flow)
│  ├─ Inbound (sales page + demo video + social proof)
│  └─ Outbound (still 20% of pipeline, but efficient system)
├─ Founder-independence:
│  ├─ Sales person runs system (founder not in calls by day 60)
│  ├─ Scripts automated (CRM + template engine)
│  ├─ Objection handling: Sales person has playbook (no guessing)
│  └─ Follow-up: Automated email sequences + calendar reminders
├─ Results: 100 customers (Day 90 complete goal)
└─ Output: Founder-independent sales system. $5K MRR. Scalable to 500+ customers.
```

**Success Criteria**:

- 100 customers in 90 days
- Repeatable sales system (12 strategies × scripts practiced = automatic excellence)
- Founder-independent (sales person runs system, founder not critical)
- Sales velocity: 10-20 closes/week (predictable pipeline)
- Deal size: $50-500/mo (premium customers who commit to ADHD-friendly model)
- Retention: 70%+ day 7, <10% churn (system attracts quality customers)
- Revenue: $5K MRR sustainable (predictable, recurring)
- NPS >50 (customers recommend)

**Example: ADHD Task Manager Sales**

- Days 1-14: System setup. 50 prospects identified (ADHD users in SaaS). 10 calls/day. Scripts memorized. 10 closes by day 14 ($500 MRR).
- Days 15-45: Scale. Add VA for scheduling. Content strategy starts warming leads. 40 calls/week. 15-20 closes/week. Day 45: 50 customers ($2.5K MRR). Sales person trained (founder steps out).
- Days 46-90: Momentum. 90% of pipeline from content + community. 50 calls/week (50% close rate = system working). 20+ closes/week. Day 90: 100 customers ($5K MRR). Founder can take month off — system runs without them.
- Result: Proven sales machine. Ready for Scale flow (500 → 1000 customers).

---

## Cross-Flow Orchestration (All 5 Flows Together)

**Scenario: Launch SaaS product from zero to sustainable ($5K MRR, 100 customers, 1000-member community)**

```
TIMELINE: 90 days (parallel execution)

FLOW 1 (Discovery) — Days 1-90: PMF Validation
├─ Outcomes: Product validated (retention >60%), messaging locked, pricing tested
└─ Inputs to: Flows 2 (offer messaging), 3 (content), 5 (sales)

FLOW 2 (Offer Design) — Days 1-30: Craft Premium Offer
├─ Outcomes: Positioning statement, hero narrative, influence stack, pricing, objection scripts
└─ Inputs to: Flows 3 (content hooks), 5 (sales pitch)

FLOW 3 (Launch Strategy) — Days 1-90: Content + Growth
├─ Outcomes: 10K followers, 100+ content pieces, 50% audience-to-customer conversion
└─ Inputs to: Flows 4 (community content assets), 5 (warmed leads for sales)

FLOW 4 (Community Building) — Days 1-90: Founding Community
├─ Outcomes: 100 founding members, identity locked, 3-5 leaders identified, referral system
└─ Inputs to: Flows 3 (content UGC), 5 (referral loop + warm introductions)

FLOW 5 (Sales Execution) — Days 1-90: First 100 Customers
├─ Outcomes: 100 customers, $5K MRR, founder-independent system
└─ Inputs to: Flows 1 (retention data), 4 (customer testimonials for community)

FEEDBACK LOOPS:
Discovery → Sales (PMF messaging informs pitch)
Sales → Content (customer stories → viral content)
Content → Sales (warmed audience → higher close rate)
Community → Content (member case studies → authentic UGC)
Community → Sales (referrals → warm leads)
Sales → Community (customer testimonials → social proof)

METRICS (Day 90):
├─ Flow 1: Retention >60% day 7, NPS >50, churn <10%, revenue >$5K MRR
├─ Flow 2: Offer converts 50%+ of prospects (via Flow 3 content warmth)
├─ Flow 3: 10K followers, 50% audience-to-customer, 3+ viral pieces (10K+ reach)
├─ Flow 4: 100 founding members, 70% weekly active, 3-5 leaders, 20% from referrals
├─ Flow 5: 100 customers acquired, $5K MRR, founder-independent sales system
└─ Combined: Sustainable flywheel running (each flow amplifies others)
```

---

## Metrics Dashboard (All Flows)

| Flow                 | Day 30                                   | Day 60                                    | Day 90                                        |
| -------------------- | ---------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| **Discovery (PMF)**  | Retention 60-70%, NPS 40+                | Retention 65-75%, NPS 45+                 | Retention >60% ✓, NPS >50 ✓, Persist/Pivot    |
| **Offer Design**     | Positioning locked, hero narrative       | Pricing tested (alpha)                    | Objection scripts ready, offer blueprint      |
| **Launch (Content)** | 1K followers, 5 hook types, 10 customers | 5K followers, 10 hook types, 50 customers | 10K followers, 15 hook types, 100 customers   |
| **Community**        | 50 founding members, weekly ritual       | 150-200 members, 2-3 leaders emerging     | 100+ members, 3-5 leaders, 20% from referrals |
| **Sales**            | 10 customers ($300 MRR)                  | 50 customers ($1.5K MRR)                  | 100 customers ($5K MRR)                       |
| **Revenue**          | $300/mo                                  | $1.5K/mo                                  | $5K/mo ✓                                      |

---

## Activation Template

```
STAGE FLOW: [FLOW NAME]
Timeline: [DAYS]
Primary agent: [AGENT]
Secondary agents: [IF ANY]
Frameworks: [LIST]

PHASE 1 ([DAYS]): [PHASE NAME]
├─ Activities: [LIST]
├─ Frameworks: [LIST]
├─ Output: [DELIVERABLE]
└─ Metrics: [SUCCESS THRESHOLD]

PHASE 2 ([DAYS]): [PHASE NAME]
├─ Activities: [LIST]
├─ Frameworks: [LIST]
├─ Output: [DELIVERABLE]
└─ Metrics: [SUCCESS THRESHOLD]

...

SUCCESS CRITERIA: [FINAL THRESHOLD]
Example: [REAL SCENARIO + RESULTS]
```
