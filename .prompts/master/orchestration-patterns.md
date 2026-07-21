---
name: orchestration-patterns
description: Technical orchestration patterns. How agents invoke base SKILLs. Chaining, dependencies, error handling, feedback loops.
type: master-prompt
---

# FeedIA Orchestration Patterns — Technical Layer

**Core**: Each FeedIA Agent orchestrates 2-3 base SKILLs (cross-book frameworks). Base SKILLs activate book knowledge. All composition, no duplication.

## Architecture Map

```
USER REQUEST
↓
MAESTRO SELECTOR (route → agent + frameworks)
↓
FEEDIA AGENT (orchestrator layer)
├─ Content Strategist
├─ Sales Closer
├─ Community Manager
└─ Product Manager
↓
BASE SKILLs (framework layer — cross-book composition)
├─ offer-architecture
├─ growth-engine
├─ community-flywheel
├─ sales-system-full
└─ pmf-validation
↓
BOOK KNOWLEDGE (reference layer — 36 books + frameworks)
├─ Positioning (Dunford), StoryBrand (Miller), Persuasion (Cialdini)
├─ DEAL (Ferriss), Bullseye (Weinberg), STEPPS (Berger), SUCCESs (Heath)
├─ Flywheel (Collins), SPACES (Spinks), Appreciation (Carnegie)
├─ FBI Negotiation (Voss), 12 Strategies (Holmes), Mom Test (Fitzpatrick)
└─ [32 more books] (referenced, activated contextually)
↓
OUTPUT (actionable roadmap/system)
```

## Invocation Patterns

### Pattern 1: Single Agent + Single Base SKILL

**Scenario**: User: "Give me sales scripts for my offer."

```
FLOW:
Maestro Selector → Sales Closer agent
↓
Sales Closer invokes: Sales System Full SKILL
├─ Holmes 12 strategies: Script generation (objection handling)
├─ Voss FBI: Negotiation framework
├─ SUCCESs: Sticky pitch structure
└─ Cialdini: Influence stacking
↓
OUTPUT: 10 objections × 3 responses each (30 sales scripts, practiced)
```

### Pattern 2: Single Agent + Multiple Base SKILLs (Sequential)

**Scenario**: User: "Design complete offer (positioning + messaging + pricing)."

```
FLOW:
Maestro Selector → Sales Closer agent
↓
Sales Closer invokes (sequentially):
├─ STEP 1: Offer Architecture SKILL
│  ├─ Positioning (Dunford 5 components)
│  ├─ Hero narrative (StoryBrand)
│  ├─ Influence stack (Cialdini 6 weapons)
│  ├─ Pricing psychology (Poundstone + Ariely)
│  └─ Output: Offer blueprint
├─ STEP 2: Sales System Full SKILL
│  ├─ Objection scripts (Holmes)
│  ├─ Negotiation tactics (Voss)
│  └─ Output: Sales scripts (ready for use)
↓
FEEDBACK: Offer blueprint → informs scripts (scripts reference offer's unique mechanism)
↓
OUTPUT: Complete offer package (positioning + pricing + messaging + objections + negotiations)
```

### Pattern 3: Single Agent + Parallel Base SKILLs (Independent)

**Scenario**: User: "Build 90-day growth plan (define target + channels + acquisition tactics)."

```
FLOW:
Maestro Selector → Product Manager agent (PMF Validation context)
↓
Product Manager invokes (in parallel):
├─ PATH A: PMF Validation SKILL
│  ├─ Mom Test (discovery)
│  ├─ Hedgehog focus (Collins)
│  ├─ Lean build-measure-learn
│  └─ 90-day roadmap (timeline-based)
├─ PATH B: Growth Engine SKILL
│  ├─ DEAL framework (Ferriss)
│  ├─ Bullseye (Weinberg 19 channels)
│  └─ Channel prioritization (2-week sprints)
└─ These run in parallel (independent, no blocking)
↓
MERGE: Combine outputs
├─ PMF roadmap (discovery → MVP → test → persist/pivot)
├─ Growth roadmap (channel strategy + acceleration plan)
├─ Metrics framework (actionable, not vanity)
↓
OUTPUT: 90-day plan (both PMF + growth validated, integrated)
```

### Pattern 4: Multi-Agent Orchestration (Sequential + Feedback Loop)

**Scenario**: User: "Launch SaaS product from zero (full stack: validate, offer design, launch, community, sales)."

```
FLOW:
Maestro Selector → Multi-Agent route (5 flows run in parallel, with feedback loops)
↓
AGENT 1: Product Manager (days 1-90)
├─ Invokes: PMF Validation SKILL
├─ Output: Validated product + messaging + pricing signals
├─ Feedback to: Agent 2 (messaging), Agent 3 (content hooks), Agent 5 (pitch)
↓
AGENT 2: Sales Closer (days 1-30, then days 30-90)
├─ Invokes: Offer Architecture SKILL → Sales System Full SKILL
├─ Inputs from: Agent 1 (product validation messaging)
├─ Output: Offer blueprint + sales scripts
├─ Feedback to: Agent 3 (positioning + sticky hook), Agent 5 (pitch structure)
↓
AGENT 3: Content Strategist (days 1-90)
├─ Invokes: Growth Engine SKILL (parallel: Offer Architecture for context)
├─ Inputs from: Agent 2 (positioning, sticky hook from offer)
├─ Output: 30/60/90 content strategy + 100 posts + posting calendar
├─ Feedback to: Agent 4 (content assets), Agent 5 (warmed leads)
↓
AGENT 4: Community Manager (days 1-90)
├─ Invokes: Community Flywheel SKILL
├─ Inputs from: Agent 3 (content assets for UGC), Agent 5 (customer testimonials)
├─ Output: Founding community (100 members) + identity + leaders + referral loop
├─ Feedback to: Agent 3 (member stories → viral content), Agent 5 (warm referrals)
↓
AGENT 5: Sales Closer (days 1-90)
├─ Invokes: Sales System Full SKILL (input: Offer Architecture from Agent 2)
├─ Inputs from: Agent 3 (warmed leads from content), Agent 4 (referral warm introductions)
├─ Output: 100 customers + $5K MRR + founder-independent sales system
├─ Feedback to: Agent 1 (retention data), Agent 4 (testimonials for social proof)
↓
ORCHESTRATION DAG (Directed Acyclic Graph):
Agent1 (PMF) → Agent2 (Offer) → Agent3 (Content) → Agent5 (Sales)
                ↓
            Agent4 (Community)
        (receives from 3, 5; sends to 3, 5)
↓
METRICS AGGREGATION (day 90):
├─ Agent 1 (PMF): Retention >60%, NPS >50, churn <10% ✓
├─ Agent 2 (Offer): Converts 50%+ of sales prospects ✓
├─ Agent 3 (Content): 10K followers, 50% audience→customer, 3+ viral ✓
├─ Agent 4 (Community): 100 founding members, 70% weekly active, 3+ leaders ✓
├─ Agent 5 (Sales): 100 customers, $5K MRR, founder-independent ✓
├─ Cross-metric: Each flow amplifies others (compound effect) ✓
↓
OUTPUT: Sustainable flywheel (product validated, offer proven, audience acquired, community built, revenue predictable)
```

## Dependency Graph

```
FEED1A Agent Dependencies:

Content Strategist:
├─ Requires: Offer Architecture SKILL (positioning + hero + influence)
├─ Requires: Growth Engine SKILL (channel selection + Bullseye)
├─ Optionally uses: Sales System Full (for call-to-action copy)
├─ Produces: Content strategy + 100+ posts + posting calendar
└─ Dependencies resolved: ✓ sequential (offer blueprint → content strategy)

Sales Closer:
├─ Requires: Offer Architecture SKILL (complete offer blueprint)
├─ Requires: Sales System Full SKILL (12 strategies + objection handling)
├─ Optionally uses: Growth Engine SKILL (channel sourcing for leads)
├─ Produces: Repeatable sales system + 100+ sales conversations
└─ Dependencies resolved: ✓ sequential (offer → sales system)

Community Manager:
├─ Requires: Community Flywheel SKILL (3 stages + 9 steps + SPACES)
├─ Requires: Growth Engine SKILL (channel strategy for member acquisition)
├─ Optionally uses: Offer Architecture SKILL (community value prop positioning)
├─ Produces: Community identity + leadership structure + referral automation
└─ Dependencies resolved: ✓ sequential (positioning → community strategy)

Product Manager:
├─ Requires: PMF Validation SKILL (6-step lean + build-measure-learn)
├─ Requires: Offer Architecture SKILL (customer positioning + pricing psychology)
├─ Optionally uses: Growth Engine SKILL (launch channel strategy)
├─ Produces: Product-market fit validation + customer profile + messaging
└─ Dependencies resolved: ✓ sequential (discovery → MVP → test → persist/pivot)
```

## Chaining Patterns (How Agents Call Each Other)

### Chain Pattern 1: Sequential (Output of Agent A feeds Agent B)

```
USER REQUEST: "Launch ADHD task manager (full stack)"
↓
CHAIN:
Product Manager (day 1-90)
├─ Output: PMF validated + messaging + pricing tested
↓
Sales Closer (day 1-30, then scale)
├─ Input: PMF messaging from Product Manager
├─ Output: Offer blueprint + sales system
↓
Content Strategist (day 1-90 parallel, but amplified by Sales Closer output)
├─ Input: Sticky hook + positioning from Sales Closer
├─ Output: 30/60/90 content strategy + 100 posts
↓
Sales Closer (days 31-90)
├─ Input: Warmed audience from Content Strategist
├─ Output: 100 customers (higher close rate due to content warmth)

TRIGGER RULE:
Agent B starts → when Agent A reaches MILESTONE (not day X, but output milestone).
Example: Content Strategist waits for Sales Closer's "sticky hook output", not day 30.
```

### Chain Pattern 2: Feedback Loop (Circular Dependency with Convergence)

```
SCENARIO: Community feedback improves product, which improves sales, which grows community

FLOW:
Community Manager (month 1)
├─ Recruits 50 founding members
├─ Asks: "What feature would make this 10x better?"
├─ Output: Feature requests from members
↓
Product Manager (month 1-2)
├─ Input: Community feature requests
├─ Prioritizes MVP improvement (high-impact features)
├─ Output: Updated MVP (testing with community)
↓
Sales Closer (month 2-3)
├─ Input: Improved product from Product Manager
├─ Pitch improves: "Shaped BY community, shipping 2x faster"
├─ Output: Better close rate (50% → 60%)
↓
Community Manager (month 3+)
├─ Input: Customer testimonials + case studies from Sales Closer
├─ Social proof strengthens community engagement
├─ Output: Community doubles referral rate (20% → 40% from referrals)
↓
Product Manager (month 3+)
├─ Input: Community growth + retention data
├─ Signals: Product validation confirmed
├─ Output: Green light for scale (features adding, not pivoting)
↓
CONVERGENCE: All signals aligned (community wants it, customers pay, retention high, referrals strong).
OUTCOME: Virtuous cycle (community → product → sales → community growth).
```

### Chain Pattern 3: Parallel Independent (No Blocking)

```
SCENARIO: Offer design + Content strategy can run in parallel (both need positioning input)

FLOW:
Maestro Selector
├─ Routes positioning analysis request to both agents
↓
PATH A: Sales Closer (parallel with PATH B)
├─ Invokes: Offer Architecture SKILL
├─ Positioning input: Dunford 5 components analysis
├─ Output: Offer blueprint + pricing
├─ No dependency on Content Strategist
↓
PATH B: Content Strategist (parallel with PATH A)
├─ Invokes: Growth Engine SKILL
├─ Positioning input: Dunford 5 components analysis + mental ladder
├─ Output: Content strategy + hook types
├─ No dependency on Sales Closer (yet)
↓
CONVERGENCE (day 30):
Both outputs merged
├─ Sales Closer hook → Content Strategist updates hook pillars
├─ Content Strategist audience → Sales Closer considers channel sourcing
↓
TRIGGER RULE:
No blocking. If one agent finishes early, it continues to next phase.
If one agent needs the other's output, it waits (but both run in parallel until dependency point).
```

## Error Handling + Fallback Patterns

| Scenario                                                              | Resolution                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Agent requests base SKILL, SKILL unavailable**                      | Fallback: Activate framework manually (agent prompts activation logic directly)                        |
| **Circular dependency detected (A needs B output, B needs A output)** | Resolve: Run both with partial inputs. Merge outputs. Iterate (feedback loop pattern).                 |
| **Milestone not met (e.g., PMF retention <40%, can't launch)**        | Action: Trigger pivot decision logic. Change hypothesis. Restart from Product Manager.                 |
| **Multi-agent chain broken (one agent fails, downstream blocked)**    | Action: Run downstream agent with current data. Flag risk. Continue with iterate-fast approach (Lean). |
| **Agent output quality low (e.g., sales script doesn't convert)**     | Action: Trigger Sales System Full SKILL re-evaluation. Update objection handling. Re-test.             |
| **Feedback loop too slow (month 3, still no PMF signal)**             | Action: Accelerate. Run smaller tests. Pivot faster. Consider new hypothesis.                          |

## Activation Flow (Agent → SKILL → Books)

**Example: Content Strategist Creates 30-Day Hook Strategy**

```
STEP 1: Content Strategist receives user request
Request: "Create 30-day content hooks for ADHD task manager"
↓
STEP 2: Agent determines which base SKILLs needed
Decision: Offer Architecture (positioning) + Growth Engine (channel strategy)
↓
STEP 3: Agent invokes Offer Architecture SKILL
SKILL Prompt: "Analyze positioning + extract sticky hook"
├─ Dunford 5 Components activated: Alternatives, Unique, Value, Target, Category
├─ StoryBrand Hero Narrative activated: Customer protagonist, problem, offer as guide
├─ Influence Stacking activated: Authority + Liking + Reciprocity
├─ Output: Sticky hook statement (1 sentence: "Stop task overwhelm. Ship 2x faster.")
↓
STEP 4: Agent invokes Growth Engine SKILL
SKILL Prompt: "Channel strategy for content"
├─ Ferriss DEAL activated: Definition (10K followers), Elimination (80% tactics), Automation, Liberation
├─ Weinberg Bullseye activated: 19 channels → rank → 3 finalists → test (TikTok wins)
├─ Output: Channel prioritization (TikTok primary, Instagram secondary, Twitter thought leadership)
↓
STEP 5: Agent synthesizes SKILLs into framework prompts
Framework Prompt 1: "Design 5 hook types using SUCCESs (Heath)"
├─ SUCCESs activated: Simple + Unexpected + Concrete + Credible + Emotional + Stories
├─ Hook 1: Problem-Agitation-Solution (PAS)
├─ Hook 2: Curiosity gap
├─ Hook 3: Social proof
├─ Hook 4: Behind-the-scenes
├─ Hook 5: Viral (STEPPS → Berger activated)
├─ Output: 5 hook templates
↓
Framework Prompt 2: "Map STEPPS virality mechanics to hooks"
├─ STEPPS activated: Social Currency + Triggers + Emotion + Public + Practical + Stories
├─ Output: Each hook tagged with STEPPS layer (e.g., Hook 1 drives Social Currency, Hook 5 drives Emotion)
↓
STEP 6: Agent generates 30-day content strategy
Output: 5 hook types × 4 posts each = 20 total posts + posting calendar + engagement tactics
├─ Hooks (5): Positioned (Dunford), Sticky (Heath SUCCESs), Viral (Berger STEPPS)
├─ Channel: TikTok (Bullseye winner), daily posting
├─ Metrics: Reach, engagement rate, follower growth
├─ Ready to execute: Copy-paste ready, schedule ready, metrics tracked
↓
STEP 7: Output delivered to user
"Your 30-day content strategy: 5 hook types, 20 posts, TikTok-optimized, ready to post."
```

## Composition Rules (No Duplication)

**Rule 1: Each Base SKILL composes multiple books, never duplicates**

```
Offer Architecture SKILL composes:
├─ Dunford (Positioning) — 5 components, mental ladder
├─ Miller (StoryBrand) — Hero narrative, SB7 framework
├─ Cialdini (Persuasion) — 6 weapons, stacking
├─ Poundstone (Priceless) — Pricing psychology, anchoring
├─ Ariely (Behavioral) — Expectations, framing, loss aversion
└─ No duplication: Each book used once, in specific step of offer architecture
```

**Rule 2: Books referenced only through SKILLs (no direct book activation)**

```
CORRECT:
User request → Agent → invokes Growth Engine SKILL → SKILL activates Ferriss DEAL + Weinberg Bullseye

INCORRECT (never do this):
User request → Agent → directly activates Ferriss book → directly activates Weinberg book
(redundant, breaks composition model)
```

**Rule 3: Cross-SKILL references are OK (SKILLs invoke each other)**

```
Content Strategist can invoke:
├─ Growth Engine SKILL (for channel strategy)
├─ Offer Architecture SKILL (for positioning + hook)
└─ These SKILLs can reference each other (e.g., Offer Architecture hook feeds Growth Engine content pillars)
```

## Metrics Collection (How Agents Report Results)

**Pattern: Agent output always includes metrics framework**

```
Each Agent outputs:
├─ Deliverable (the actual work product)
├─ Metrics framework (how to measure success)
├─ Timeline (when to check metrics)
└─ Pivot triggers (when to change course)

Example (Content Strategist):
├─ Deliverable: 30-day content strategy (20 posts, 5 hook types)
├─ Metrics: Reach, engagement rate, follower growth, conversion to customer
├─ Timeline: Daily (tracking), weekly (analysis), monthly (strategy review)
├─ Pivot triggers: Engagement rate <2% (change hook type), conversion <5% (change CTA)
```

---

## Master Checklist (Before Activating Agent)

```
☐ USER REQUEST PARSED
  └─ Intent clear? (content, sales, community, product, hybrid)

☐ AGENT + FRAMEWORKS SELECTED
  └─ Primary agent chosen? Secondary agents (if multi)?
  └─ Base SKILLs identified?
  └─ Books referenced (implicitly via SKILLs)?

☐ DEPENDENCIES RESOLVED
  └─ All SKILL inputs available (positioning, offer, growth target)?
  └─ Sequential dependencies ordered (A before B)?
  └─ Parallel paths identified (no blocking)?

☐ METRICS DEFINED
  └─ Success threshold set (not vanity metrics)?
  └─ Timeline clear (30/60/90 days, or milestone-based)?

☐ ACTIVATION READY
  └─ Agent prompt template filled?
  └─ SKILL activation sequence clear?
  └─ Output format specified?

→ ACTIVATE AGENT + RUN ORCHESTRATION
```
