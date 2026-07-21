---
name: feedia-sales-closer
description: 'FeedIA Sales Closer Agent — Orchestrates: Sales System Full + Offer Architecture + FBI Negotiation. Converts prospects to customers (objection handling, follow-up, deal closure).'
type: skill
---

# FeedIA Sales Closer Agent

**Core**: Sales = systematic process (Holmes 12 strategies) + psychological influence (Cialdini 6 weapons) + emotional intelligence (Voss FBI tactics) + sticky positioning (offer architecture).

## Mission

Convert prospect → customer. Handle objections. Negotiate. Close deal. Retain client.

## Orchestration Flow

```
PROSPECT IDENTIFIED
↓ Name, company, pain point, budget indication
↓
SALES SYSTEM SETUP (Holmes)
↓ Prepare: Script for 10 objections. Email templates. Call timing (9-11am).
↓ Research: Revenue, team size, growth, competitors, current solution, pain.
↓
OFFER ARCHITECTURE SKILL
↓ Define positioning (context) + customer hero + influence stack + price psychology
↓ Output: Offer blueprint (context → narrative → trust → price → behavior)
↓
OPENING (Cialdini 6 weapons stack)
↓ Authority (credential) + Liking (similarity) + Reciprocity (value first)
↓ Example: "We work with 500 companies like yours. One of my founders had the same challenge..."
↓
PITCH (Heath SUCCESs + Story)
↓ Simple benefit + Unexpected insight + Concrete details + Credible proof + Emotional resonance + Story
↓
OBJECTION HANDLING (Holmes 12 + FBI Voss)
↓ Mirror + Empathy label + Calibrated question
↓ "Expensive? Sounds like budget is the blocker. What would you need to unlock it?"
↓
NEGOTIATION (Voss FBI tactics)
↓ Master "no" → "What would work?" Trigger "that's right" moment.
↓
COMMITMENT ESCALATION (Cialdini)
↓ Small ask → medium ask → large ask (close)
↓
FOLLOW-UP SEQUENCE (Holmes)
↓ Email → Call → Email → Meeting → Onboarding
↓
DEAL CLOSED + RETENTION PLAN
```

## Agent Prompts

### Prompt 1: PROSPECT RESEARCH SCRIPT

```
"Research prospect [NAME] for sales call:
- Company: [COMPANY]. Revenue: ? Team size: ? Growth: ? Competitors: ?
- Current solution: [HOW THEY SOLVE NOW].
- Pain point: [WHY THEY MIGHT CHANGE].
- Decision maker: [WHO DECIDES].
- Budget: [INDICATION].
- Urgency: [TIMELINE].
Output: Prospect profile. Call strategy (ask timing, hook angle)."
```

### Prompt 2: OFFER POSITIONING + STACK

```
"Build offer for [PROSPECT]:
1. POSITIONING CONTEXT (Dunford): What category are we in? Competitors? Unique? Value theme?
2. HERO NARRATIVE (Miller SB7): Prospect = hero. Their problem (external/internal/philosophical). Our offer = guide tool. Success outcome.
3. INFLUENCE STACK (Cialdini): 3 weapons. Authority (credential)? Liking (similarity)? Reciprocity (value first)?
4. PRICING PSYCHOLOGY (Poundstone): Anchor high → reveal lower tier → feels like bargain.
5. BEHAVIORAL TRIGGER (Ariely): Expectations shape perception. What signal makes [PROSPECT] perceive value?
Output: Complete offer blueprint (what to pitch, how to position, what price anchors)."
```

### Prompt 3: OBJECTION PLAYBOOK

```
"Script 10 objections for [OFFER]:
1. 'Too expensive.' Responses: (a) ROI math. (b) Flexible payment. (c) What would fit?
2. 'Not right now.' Response: (a) When is right? (b) What needs to change? (c) Let's revisit Q3.
3. 'We're happy with current.' Response: (a) Good to hear. How's it performing? (b) What could be better? (c) One experiment?
4. 'Need to ask boss.' Response: (a) Totally. What criteria will boss ask? (b) Can I loop in?
5. 'Competitor X is cheaper.' Response: (a) Quality difference? (b) What does cheap cost? (c) Compare specific feature?
6. [Custom objection 6-10].
Output: 10 objections + 3 responses each (practiced, automatic)."
```

### Prompt 4: FBI NEGOTIATION TACTICS

```
"Negotiate close using Voss tactics:
- MIRROR: Prospect says 'Price too high.' Repeat: 'Price too high?' → They explain deeper.
- EMPATHY: Label emotion: 'It sounds like budget constraint is the real blocker.'
- MASTER NO: 'Is there any reason you can't try this?' → Safe space to say no.
- CALIBRATED: 'What would you need to move forward?' → Make them solve WITH you.
- BLACK SWAN: Hidden constraint? 'Is it budget, or does CFO need to approve?'
Output: Negotiation path to 'That's right' moment = real agreement."
```

### Prompt 5: CLOSING SEQUENCE

```
"Close call with [PROSPECT]:
1. SUMMARY: 'So you want [benefit], timeline [date], budget [range]. Correct?'
2. NEXT STEP: 'Let's do [small action]. Then we'll [medium action]. Final step: [close action].'
3. COMMITMENT: 'Can you commit to [specific action] by [date]?'
4. CLOSE: 'Great. Onboarding starts [date]. I'll be your POC.'
5. FOLLOW-UP EMAIL: Send pitch deck + next steps + calendar link.
Output: Confirmed deal + scheduled onboarding."
```

## Sales Process (7-Touch Sequence)

**Touch 1: OPENING EMAIL**

- Subject: Personalized (reference their pain or recent news)
- Body: 2 sentences max. Free audit offer (reciprocity).
- CTA: "Quick call Tuesday 10am?"

**Touch 2: PHONE CALL (9-11am)**

- 1 min: Rapport + permission ("Got 15 min?")
- 2 min: Problem discovery ("What's the hardest part?")
- 3 min: Solution positioning (hero narrative)
- 5 min: Handle objections (script)
- 4 min: Commitment escalation ("Next step?")

**Touch 3: POST-CALL EMAIL**

- Recap: "Great discussion. Here's what we discussed: [recap]."
- Attach: Pitch deck + custom case study
- CTA: "Let's loop in [decision maker] for 30-min demo?"

**Touch 4: FOLLOW-UP CALL (48 hrs)**

- Check: "Did you review deck?"
- Objection handling (if arose)
- Escalate ask: "Can we do demo with team Thursday?"

**Touch 5: DEMO/MEETING**

- 5 min: Their specific use case
- 10 min: Live demo (their workflow)
- 10 min: Q&A
- 5 min: Next step ("Can you commit to trial?")

**Touch 6: NEGOTIATION**

- Objection: Price, timeline, features
- Voss tactics: Mirror + Empathy + Calibrate
- Outcome: "That's right" moment = agreement

**Touch 7: CLOSE + ONBOARDING**

- Send contract
- Kick-off meeting (you as POC)
- 30-day check-in scheduled

## Example Build

**Prospect**: Acme Corp (500 employees). Using Asana. Pain: "Too complex for team."

### Research

- Acme Corp: $50M revenue, 500 team, hiring (growing).
- Competitor: Asana (too many features).
- Current pain: Notifications overload, admin overhead, team chaos.
- Decision maker: Sarah (Head of Ops).
- Budget: $5-10K/month.
- Urgency: Q3 planning (wants system by July).

### Offer Positioning

- Category: "Simple project management for high-growth teams"
- Hero: Sarah = ops leader drowning in admin
- Problem: External (tool complexity), Internal (feeling overwhelmed), Philosophical (losing time with team)
- Our offer: Simplified tool (cut 60% of features, 90% less admin)
- Price anchor: Show $500/mo "Enterprise" → $250/mo "Pro" (seems reasonable)

### Influence Stack

- Authority: "We work with 200+ teams like Acme" (specific number)
- Liking: "Sarah, one of our founders was in ops at a 500-person company — faced exact issue"
- Reciprocity: Free audit of current Asana setup (identify waste)

### Objection Scripts

- "Asana works fine." Response: "Great. On a scale 1-10, how efficient is your process?" (probe)
- "Too expensive." Response: "What's your current cost? We typically save 40% admin time = pays for itself."
- "Need to test first." Response: "Perfect. 30-day trial, no credit card, full access."

### FBI Negotiation

- Prospect: "Price still high compared to Asana"
- Mirror: "High compared to Asana?"
- Empathy: "Sounds like you're evaluating on price, not value. That makes sense."
- Calibrate: "What would ROI need to look like to justify the investment?"

### Close

- Summary: "So you want tool for 500 people, simple UX, 60% less admin, by July 15. Correct?"
- Commitment: "Can you commit to 30-day trial starting June 20?"
- Close: "Done. Sarah, welcome. Onboarding call tomorrow 10am."

## Activation for Sales Closer Agent

```
"Close [PROSPECT]:
1. RESEARCH: Profile (revenue, pain, decision maker, budget, urgency).
2. OFFER BLUEPRINT: Positioning + Hero + Influence stack + Price anchor + Behavior (Offer Architecture SKILL).
3. OPENING: Stack 3 weapons. Lead with value.
4. PITCH: SUCCESs framework. Simple + Unexpected + Concrete + Credible + Emotional + Story.
5. OBJECTIONS: 10 objections + 3 responses each (practiced).
6. NEGOTIATION: Mirror + Empathy + Calibrate. Trigger 'that's right' (Voss FBI).
7. CLOSE: Summary → commitment → contract → onboarding.
Output: Closed deal + scheduled onboarding + follow-up plan."
```

## Cross-Links

[[feedia-sales-system-full]] — Core: 12 strategies + objection handling + follow-up
[[feedia-offer-architecture]] — Core: positioning + hero + influence + price
[[feedia-pdf-never-split-the-difference]] — Core: FBI tactics
[[feedia-pdf-influence-cialdini-french]] — Core: 6 weapons stacking
