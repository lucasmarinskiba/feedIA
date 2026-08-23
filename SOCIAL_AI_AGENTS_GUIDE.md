# FeedIA: Social Intelligence Agents Guide

**Platform:** Complete AI system for Instagram + TikTok automation  
**Status:** Production Ready  
**Agents:** 8 specialized AI agents coordinated by Master Orchestrator

---

## Overview

FeedIA is NOT just a scheduler — it's a **complete AI social media system** that acts as:

- **Community Manager** (engagement, tribe building)
- **Growth Specialist** (viral tactics, timing, collaborations)
- **Graphic Designer** (visual systems, layouts, typography)
- **Copywriter** (hooks, tone, CTAs)
- **Strategy Consultant** (positioning, content pillars)
- **Niche Expert** (domain-specific knowledge)
- **Audience Analyzer** (psychographics, triggers)
- **Account Auditor** (metrics analysis, opportunities)

**Key:** FeedIA AI *suggests* — you *decide*. Full human control over accounts.

---

## Quick Start: 3-Step Setup

### Step 1: Connect Your Accounts

```bash
POST /api/social/oauth/instagram/authorize
POST /api/social/oauth/tiktok/authorize
```

Get OAuth URLs, authorize in browser, tokens stored automatically.

### Step 2: Analyze Your Current Account

```bash
POST /api/social/ai/analyze-account
{
  "platform": "instagram",
  "accountId": "your_account_id",
  "accessToken": "your_token"
}
```

Response: Niche detected, audience demographics, content strengths, growth opportunities.

### Step 3: Generate Your Growth Plan

```bash
POST /api/social/ai/master-plan
{
  "niche": "fitness",
  "currentFollowers": 5000,
  "targetFollowers": 100000,
  "timeframe": 90
}
```

Response: Complete 4-phase growth plan (foundation → launch → optimize → scale).

---

## 8 Agents: How to Use

### AGENT 1: Account Analyzer
**What it does:** Audits your account, identifies niche, finds growth opportunities

**Endpoint:** `POST /api/social/ai/analyze-account`

**Request:**
```json
{
  "platform": "instagram",
  "accountId": "17841400960",
  "accessToken": "IGQVJXYno..."
}
```

**Response:**
```json
{
  "account": {
    "username": "yourname",
    "followers": 5000,
    "engagement_rate": 4.2,
    "niche": "fitness",
    "audience_age_group": "25-34",
    "top_content_type": "carousel",
    "best_posting_time": "19:00"
  },
  "analysis": {
    "content_strengths": ["high_engagement", "consistent_posting"],
    "growth_opportunities": ["hashtag_optimization", "cross_platform"],
    "next_steps": ["define_positioning", "create_strategy"]
  }
}
```

---

### AGENT 2: Strategy Generator
**What it does:** Creates personalized growth strategy using 36-book knowledge base

**Endpoint:** `POST /api/social/ai/generate-strategy`

**Request:**
```json
{
  "niche": "fitness",
  "targetAudience": {
    "age": "25-34",
    "gender": "mixed"
  },
  "currentFollowers": 5000
}
```

**Response:**
```json
{
  "strategy": {
    "niche": "fitness",
    "positioning": "Your fitness guide — no BS, real stories, proven frameworks",
    "value_proposition": "Help 25-34 year-olds master fitness via short-form storytelling",
    "content_pillars": [
      "Behind-the-scenes (authenticity)",
      "Educational tips (value)",
      "Transformations (proof)",
      "Community wins (social proof)",
      "Mistakes + lessons (relatability)"
    ],
    "posting_schedule": {
      "frequency": "5-6 posts per week",
      "best_times": ["7-9 AM", "12-1 PM", "6-8 PM"],
      "best_days": ["Tuesday", "Wednesday", "Friday"]
    },
    "growth_hooks": [
      "Curiosity gap (hidden truth)",
      "Contradiction (everyone wrong)",
      "Pattern interrupt (unexpected)",
      "Scarcity (limited time)",
      "Urgency (act now)"
    ]
  },
  "implementation": {
    "phase_1_weeks_1_2": "Establish positioning, define voice, create 2-week content calendar",
    "phase_2_weeks_3_4": "Launch consistent posting, track metrics, analyze engagement",
    "phase_3_weeks_5_8": "Optimize top content, A/B test captions, grow to next follower milestone",
    "phase_4_ongoing": "Scale what works, collaborate, monetize community"
  }
}
```

---

### AGENT 3: CM Agent (Community Manager)
**What it does:** Daily/weekly engagement playbook, response templates, tribe building

**Endpoint:** `POST /api/social/ai/cm-agent`

**Request:**
```json
{
  "accountType": "creator",
  "audienceSize": 5000
}
```

**Response:**
```json
{
  "cm_playbook": {
    "daily_tasks": [
      {
        "time": "8-9 AM",
        "task": "Check comments + DMs, respond to 80% within 2 hrs",
        "priority": "high"
      },
      {
        "time": "12-1 PM",
        "task": "Post daily content, engage with 10-15 accounts in niche",
        "priority": "high"
      },
      {
        "time": "6-8 PM",
        "task": "Check metrics, respond to new comments, post story",
        "priority": "medium"
      }
    ],
    "response_templates": {
      "thank_you": "Thanks for the love! 🙏 [personalized comment about their profile]",
      "question": "[Answer specific question] DM me if you want deeper dive!",
      "collaboration": "Love your vibe! Let's collab — DM me"
    },
    "engagement_rules": [
      "Respond to 80%+ comments in first 2 hours",
      "Reply to DMs within 4 hours",
      "Tag collaborators and micro-influencers",
      "Engage with 5-10 accounts daily in your niche"
    ],
    "tribe_building": [
      "Create insider language (jokes, references)",
      "Celebrate community wins publicly",
      "Feature user-generated content weekly",
      "Host live Q&A biweekly"
    ]
  }
}
```

---

### AGENT 4: Growth Agent
**What it does:** Viral content formulas, hashtag strategy, posting optimization, collaborations

**Endpoint:** `POST /api/social/ai/growth-agent`

**Request:**
```json
{
  "currentFollowers": 5000,
  "niche": "fitness",
  "goal": "100000"
}
```

**Response:**
```json
{
  "growth_tactics": {
    "viral_content_formulas": [
      {
        "name": "Before/After Transformation",
        "structure": "Problem → Journey → Result → Lessons",
        "urgency": "High (relatability)",
        "expected_engagement": "8-12%"
      },
      {
        "name": "Controversial Take",
        "structure": "Opinion → Challenge consensus → Proof → Nuance",
        "urgency": "Very High (debate)",
        "expected_engagement": "10-15%"
      }
    ],
    "hashtag_strategy": {
      "distribution": "30% high-volume (100K-1M), 40% medium (10K-100K), 30% low (1K-10K)",
      "rotation": "Change 20-30% of hashtags each post to test reach",
      "branded_hashtags": "#FitnessMovement for community"
    },
    "posting_optimization": {
      "instagram_carousel": {
        "best_time": "Tuesday 6-7 PM, Wednesday 11 AM",
        "caption_length": "150-300 words (max engagement)",
        "cta_placement": "End of caption (save this)"
      },
      "tiktok_video": {
        "best_time": "Tuesday-Friday 6-9 PM",
        "length": "21-34 seconds (sweet spot)",
        "hook_first_frame": "Grab in first 0.5 seconds"
      }
    },
    "collaboration_tactics": [
      {
        "type": "Duet/Stitch (TikTok)",
        "effort": "Low",
        "reach": "High (to creator audience)"
      },
      {
        "type": "Co-create Post",
        "effort": "Medium",
        "reach": "High (both audiences)"
      }
    ],
    "conversion_funnel": {
      "awareness": "Viral reels + Hashtags (reach new)",
      "interest": "Educational carousels + Stories (build trust)",
      "consideration": "Testimonials + Case studies (proof)",
      "decision": "Limited offer + Urgency (now or never)",
      "loyalty": "Community + Exclusive content (keep them)"
    }
  },
  "next_milestone": "6000K followers in 60 days (20% growth)"
}
```

---

### AGENT 5: Design Agent
**What it does:** Visual system, color palettes, typography, carousel layouts, motion

**Endpoint:** `POST /api/social/ai/design-agent`

**Request:**
```json
{
  "niche": "fitness",
  "aesthetic": "modern"
}
```

**Response:**
```json
{
  "design_system": {
    "color_palettes": {
      "warm_organic": {
        "primary": "#C65911",
        "secondary": "#6B8E71",
        "accent": "#D4AF37",
        "use_case": "Lifestyle, wellness, authenticity"
      },
      "bold_playful": {
        "primary": "#E91E8C",
        "secondary": "#00D9FF",
        "accent": "#7FFF00",
        "use_case": "Growth, viral, youth-targeted"
      }
    },
    "typography": {
      "headline": {
        "font": "Montserrat Bold (900)",
        "size": "32-48px",
        "max_words": "8"
      },
      "body": {
        "font": "Inter Regular (400)",
        "size": "14-18px"
      }
    },
    "carousel_layout_patterns": [
      {
        "name": "Hook → Value → Proof → CTA",
        "slides": 5,
        "structure": ["Curiosity hook", "Pain point", "3-4 tips", "Testimonial", "Call to action"],
        "engagement": "Very High"
      }
    ],
    "motion": {
      "slide_transitions": ["fade", "slide_left", "pop_in"],
      "duration": "Max 2.5s per slide animation"
    }
  }
}
```

---

### AGENT 6: Copy Agent
**What it does:** Caption formulas, emotional triggers, hashtag strategies, CTAs

**Endpoint:** `POST /api/social/ai/copy-agent`

**Request:**
```json
{
  "contentType": "carousel",
  "tone": "engaging",
  "niche": "fitness",
  "audience": "25-34 ambitious fitness enthusiasts"
}
```

**Response:**
```json
{
  "copy_system": {
    "caption_formulas": [
      {
        "name": "Curiosity Gap Hook",
        "formula": "[Surprising statement] → [Context] → [Reveal] → [CTA]",
        "example": "This one 'mistake' cost me $10K. But here's why I'm grateful... [story] ... Save this for later.",
        "engagement": "Very High",
        "platforms": ["instagram", "tiktok"]
      },
      {
        "name": "Problem/Solution",
        "formula": "[Pain point] → [Most people do X] → [Better way] → [Action]",
        "example": "Mistake: Networking without a goal. Real way: [specific method]. Follow for daily tips.",
        "engagement": "High"
      }
    ],
    "emotional_triggers": {
      "high_arousal": ["Excitement", "Anger", "Surprise", "Awe", "Urgency"],
      "formula": "Use excitement for fitness"
    },
    "cta_options": [
      { "type": "Save", "usage": "Educational content", "urgency": "Medium" },
      { "type": "Share", "usage": "Relatable/funny", "urgency": "High" },
      { "type": "Follow", "usage": "Series/consistency", "urgency": "Medium" },
      { "type": "DM", "usage": "Lead gen/questions", "urgency": "High" },
      { "type": "Link in bio", "usage": "Products/offers", "urgency": "Very High" }
    ],
    "copywriting_principles": [
      "Specificity = Credibility (numbers beat vague)",
      "Emotion > Logic (System 1 makes decisions)",
      "Loss aversion > Gain (Losing $X more painful than earning $X)",
      "Scarcity + Urgency > Low price (creates reactance)",
      "Social proof = Authority (testimonials, numbers)"
    ]
  }
}
```

---

### AGENT 7: Niche Expert
**What it does:** Domain-specific knowledge (fitness, finance, lifestyle, tech, etc)

**Endpoint:** `POST /api/social/ai/niche-expert`

**Request:**
```json
{
  "niche": "fitness"
}
```

**Response:**
```json
{
  "niche": "fitness",
  "expertise": {
    "pain_points": [
      "No visible results in 8 weeks",
      "Boring routines (compliance failure)",
      "Nutrition confusion (too many diets)",
      "Lack of accountability",
      "Body image insecurity"
    ],
    "content_angles": [
      "Transformation stories (real people, 90 days)",
      "Nutrition myths busted",
      "Workout hacks (10 min at home)",
      "Mindset > physique",
      "Sustainable vs extreme"
    ],
    "authority_signals": [
      "Certification (NASM, ACE, ISSN)",
      "Transformation portfolio",
      "Science-backed education",
      "Personal story (struggled too)"
    ]
  },
  "content_calendar_ideas": [
    "Monday Motivation (fitness transformation story)",
    "Wednesday Workshop (deep dive tip)",
    "Friday Faceoff (controversy or myth-busting)",
    "Sunday Story (personal lesson from week)"
  ]
}
```

---

### AGENT 8: Master Orchestrator
**What it does:** Coordinates all 7 agents → complete 90-day growth plan

**Endpoint:** `POST /api/social/ai/master-plan`

**Request:**
```json
{
  "niche": "fitness",
  "currentFollowers": 5000,
  "targetFollowers": 100000,
  "timeframe": 90
}
```

**Response:**
```json
{
  "goal": "Grow from 5000 to 100000 followers in 90 days",
  "strategy": {
    "positioning": "Authority in fitness via storytelling + education",
    "target_audience": "fitness enthusiasts seeking transformation",
    "unique_angle": "Real stories, proven frameworks, community-first"
  },
  "phases": {
    "phase_1_foundation": {
      "week": "1-2",
      "focus": "Audit account + define strategy + create 2-week calendar",
      "deliverables": [
        "Account analysis report",
        "Positioning statement",
        "Content pillars defined",
        "14-day content calendar",
        "Voice guide (tone, style, language)"
      ]
    },
    "phase_2_launch": {
      "week": "3-4",
      "focus": "Consistent posting + engagement + optimization",
      "deliverables": [
        "4 carousels (hooks working)",
        "4 reels (viral testing)",
        "10+ stories (daily engagement)",
        "Analytics review (what works)"
      ]
    },
    "phase_3_optimize": {
      "week": "5-8",
      "focus": "Double down on what works, A/B test, collaborate",
      "deliverables": [
        "6-8 high-performing carousels",
        "4-6 viral reels (1K+ views)",
        "Collaboration post (reach expansion)",
        "First 5K followers milestone"
      ]
    },
    "phase_4_scale": {
      "week": "9-12",
      "focus": "Monetization, community, systemization",
      "deliverables": [
        "10K followers achieved",
        "Monetization method (ads, sponsorships)",
        "Community features (group, challenges)",
        "Content automation system"
      ]
    }
  },
  "weekly_metrics": {
    "week_1_2": { "followers": "+50-100", "engagement_rate": "3-4%" },
    "week_3_4": { "followers": "+200-300", "engagement_rate": "4-6%" },
    "week_5_8": { "followers": "+400-600/week", "engagement_rate": "6-8%" },
    "week_9_12": { "followers": "+600-1000/week", "engagement_rate": "8-12%" }
  },
  "next_steps": [
    "1. Share niche + audience with design agent (visual system)",
    "2. Run account analyzer (current state)",
    "3. Generate strategy (positioning + content pillars)",
    "4. Build 2-week calendar (CM + Copy agents)",
    "5. Launch consistently, track metrics, optimize weekly"
  ]
}
```

---

## Recommended Workflow: 7-Step Process

### Step 1: Analyze Your Current Account
```bash
POST /api/social/ai/analyze-account
```
→ Understand where you are now

### Step 2: Define Your Niche Positioning
```bash
POST /api/social/ai/niche-expert
```
→ Get domain-specific knowledge + pain points + authority signals

### Step 3: Generate Personalized Strategy
```bash
POST /api/social/ai/generate-strategy
```
→ Content pillars + positioning + growth hooks + CTAs

### Step 4: Get Design System
```bash
POST /api/social/ai/design-agent
```
→ Colors + typography + carousel layouts + motion

### Step 5: Get Copy Framework
```bash
POST /api/social/ai/copy-agent
```
→ Caption formulas + emotional triggers + hashtag strategy

### Step 6: Get Growth Tactics
```bash
POST /api/social/ai/growth-agent
```
→ Viral content formulas + posting optimization + collaboration tactics

### Step 7: Get Daily CM Playbook
```bash
POST /api/social/ai/cm-agent
```
→ Daily/weekly tasks + engagement rules + response templates

### Step 8 (Optional): Get Master 90-Day Plan
```bash
POST /api/social/ai/master-plan
```
→ Complete orchestrated plan (all 7 agents coordinated)

---

## Use Cases

### Use Case 1: New Creator (0 followers → 10K)
1. Run Master Plan (niche: your expertise)
2. Get Design System + Copy Framework
3. Build 2-week content calendar using formulas
4. Post consistently, track metrics
5. Iterate based on engagement data

### Use Case 2: Existing Creator (5K → 50K)
1. Analyze current account (strengths/opportunities)
2. Run Strategy Generator (new positioning)
3. Get Growth Agent (viral tactics + collaborations)
4. A/B test 5 new content angles
5. Scale what works

### Use Case 3: Brand Account
1. Define brand voice + positioning
2. Get Design System (brand colors + typography)
3. Get CM Agent (engagement + community building)
4. Build monthly calendar (30-40 posts)
5. Monitor metrics + optimize

### Use Case 4: Personal Brand (Expert → Authority)
1. Get Niche Expert (pain points + authority signals)
2. Build portfolio of transformation stories
3. Use Copy Agent (emotional triggers + specificity)
4. Collaborate with micro-influencers
5. Create course/product to monetize

---

## Real Example: Fitness Creator

**Account:** @fitnessjoe (5K followers, 2% engagement)

### Step 1: Analyze
```bash
POST /api/social/ai/analyze-account
```
Result: Fitness niche detected, engagement below average, top content = transformations

### Step 2: Niche Expert
```bash
POST /api/social/ai/niche-expert
{ "niche": "fitness" }
```
Result: Pain points = no results in 8 weeks, boring routines, nutrition confusion

### Step 3: Strategy Generator
```bash
POST /api/social/ai/generate-strategy
{
  "niche": "fitness",
  "targetAudience": { "age": "25-34" },
  "currentFollowers": 5000
}
```
Result: 5 content pillars, positioning = "Real transformations, proven methods", 5-6 posts/week

### Step 4: Design System
```bash
POST /api/social/ai/design-agent
{ "niche": "fitness", "aesthetic": "modern" }
```
Result: Bold Playful palette (#E91E8C + #00D9FF), Montserrat + Inter typography, carousel layouts

### Step 5: Copy Framework
```bash
POST /api/social/ai/copy-agent
{ "contentType": "carousel", "niche": "fitness", "tone": "engaging" }
```
Result: 4 caption formulas (curiosity gap, problem/solution, story, controversial)

### Step 6: Growth Tactics
```bash
POST /api/social/ai/growth-agent
{ "currentFollowers": 5000, "niche": "fitness" }
```
Result: Before/After formula (8-12% engagement), hashtag distribution (30/40/30), best posting times

### Step 7: CM Playbook
```bash
POST /api/social/ai/cm-agent
{ "accountType": "creator", "audienceSize": 5000 }
```
Result: Daily tasks (8-9 AM check DMs, 12-1 PM post + engage, 6-8 PM analytics), response templates

**Result:** Complete system for @fitnessjoe to 50K in 90 days.

---

## Key Principles

### 1. **AI Suggests, You Decide**
FeedIA gives you frameworks, not forced automation. You control all posting.

### 2. **Real Metrics, Not Vanity**
Focus on engagement rate + reach + conversions, not follower count alone.

### 3. **Consistency Over Virality**
5 good posts per week > 1 viral post per month. Build habits.

### 4. **Community > Content**
Respond to 80% of comments, engage 5-10 accounts daily. Relationship = growth.

### 5. **Test + Iterate**
A/B test captions, hashtags, posting times. Data drives decisions.

### 6. **Repurpose Relentlessly**
1 core idea → 5 formats (carousel, reel, TikTok, story, blog). Maximum leverage.

### 7. **Monetize Authenticity**
Real transformations + real people + real stories = trust = customers.

---

## Beta Testing

**Testers:**
- Sofia Ruiz (creator, 250K IG, travel/lifestyle)
- Juan Mendez (dev, API testing)
- Carla Gómez (QA, edge cases)
- Marco López (growth, launch readiness)

**Testing Focus:**
- Agent accuracy (do strategies work?)
- API reliability (errors, timeouts?)
- Real account integration (OAuth flow)
- Content quality (captions, designs)

**Feedback:** lucasdmarin@gmail.com

---

## Support

**Quick Answers:**
- Niche-specific content: Use Niche Expert agent
- Viral tactics: Use Growth Agent
- Design questions: Use Design Agent
- Writing captions: Use Copy Agent

**Account-Level Help:**
- Where am I now: Analyze Account agent
- How do I grow: Strategy Generator + Master Plan
- Daily operations: CM Agent

**Complete Automation:**
- 90-day roadmap: Master Plan orchestrator
- All 7 agents: All endpoints

---

**FeedIA is ready. Your accounts are ready. Let's grow.**
