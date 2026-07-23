# FeedIA Integration Audit + Plan

**Date**: 2026-07-23  
**Goal**: Deploy 22-layer knowledge base (5 SKILLs + 4 agents + 3 prompts + 5 frameworks + 5 generators) to Vercel

---

## AUDIT: Current State

### ✅ What Exists

**Codebase**:

- TypeScript 1132 files, strict mode enabled
- Node.js 20+ with Express
- Pre-commit hooks (lint-staged, prettier, typecheck) all pass
- Package.json configured for build + deployment
- Vercel config (custom build script)

**Directory Structure**:

- `.agents/skills/` — 50+ SKILL.md files (Etapa 1 base SKILLs here)
- `.prompts/master/` — 3 master prompts (maestro-selector, stage-flows, orchestration-patterns)
- `.prompts/decision-frameworks/` — 5 frameworks (offer-design-canvas, growth-planning-roadmap, community-charter, sales-playbook, product-validation)
- `.prompts/content-generators/` — 5 generators (offer-generator, growth-plan-generator, community-charter-generator, sales-system-generator, product-roadmap-generator)

**Database**:

- better-sqlite3 + MongoDB + Redis (all configured, not yet wired)
- src/database/ + src/db/ (schemas + migrations exist)
- No active ORM (raw queries)

**API**:

- Express server (api/index.ts)
- Minimal endpoints: /health, /api/info, /api/debug, /api/files
- No business logic endpoints yet
- SPA fallback to index.html

**TypeScript**:

- All 1132 files type-check clean (no errors)
- ESLint passes
- Ready for build

---

## ❌ GAPS

### Missing Integration Layer

**Problem**: Knowledge base files exist (SKILLs, prompts, frameworks, generators) but NOT wired into API/runtime.

**What's Missing**:

1. **No API endpoints for generators** — POST /api/generate/offer, /api/generate/sales-system, etc.
2. **No agent invocation layer** — agents defined but not callable from API
3. **No maestro-selector routing** — user request → 8-way intent parser → framework → agent → generator (not implemented)
4. **No database persistence** — no tables to store generated outputs, runs, history
5. **No skill loader/registry** — .agents/skills/ not scanned/loaded at runtime
6. **No prompt loader** — .prompts/ not loaded into memory/cache at runtime

### Architecture Gaps

```
CURRENT STATE:                  NEEDED STATE:
Frontend (SPA)                 Frontend (SPA)
     ↓                              ↓
API (static files only)    →    API (business logic)
     ↓                              ↓
                            maestro-selector
                                    ↓
                        [Intent Parser 8-way]
                                    ↓
                        [Agent Invocation]
                                    ↓
                        [SKILL Registry]
                                    ↓
                        [Prompt Loader]
                                    ↓
                        [Generator Exec]
                                    ↓
                        [DB Store Output]
```

---

## INTEGRATION PLAN (3 Phases)

### PHASE 1: Skill + Prompt Loaders (Week 1)

**Objective**: Make SKILLs and prompts discoverable and callable at runtime.

**Files to Create**:

1. `src/core/skill-loader.ts` — Read .agents/skills/\*/SKILL.md, parse frontmatter, build registry
   - Input: skill name
   - Output: { name, description, type, content, metadata }
   - Cache in memory

2. `src/core/prompt-loader.ts` — Read .prompts/\*/\*.md, build index
   - Load master prompts (maestro-selector, stage-flows, orchestration-patterns)
   - Load decision frameworks
   - Load content generators
   - Index by name + type

3. `src/types/skill.ts` — Define TypeScript types

   ```ts
   type SkillType = 'base' | 'agent' | 'decision-framework' | 'content-generator';
   interface Skill {
     name: string;
     description: string;
     type: SkillType;
     content: string; // markdown
     metadata: Record<string, any>;
   }
   ```

4. `src/services/skill-registry.ts` — Singleton to manage skill lookup
   - `getSkill(name): Skill | null`
   - `listSkills(type?: SkillType): Skill[]`
   - `search(query: string): Skill[]`

**Deliverable**:

- Skill loader scans and indexes 50+ .agents/skills/\*/SKILL.md
- Prompt loader scans and indexes 13 .prompts/ files
- Registry queryable from API

**Est. Lines of Code**: 400 TS

---

### PHASE 2: Maestro Selector + Intent Router (Week 1-2)

**Objective**: User request → 8-way intent parser → select right agent/framework/generator.

**Files to Create**:

1. `src/core/maestro-selector.ts` — Implement 8-way intent classifier
   - Inputs: user request + context
   - Outputs: { intent, confidence, selectedFramework, selectedAgent, selectedGenerator }
   - 8 intents: Content / Sales / Community / Product / Multi-agent / Custom / Help / Config
   - Calls Claude API for LLM-based classification (multi-hop reasoning)

2. `src/core/orchestration-engine.ts` — Invokes right execution path based on intent
   - If Content → invoke content-strategist agent → invoke offer-generator / growth-plan-generator
   - If Sales → invoke sales-closer agent → invoke sales-system-generator
   - If Community → invoke community-manager agent → invoke community-charter-generator
   - If Product → invoke product-manager agent → invoke product-roadmap-generator
   - Chain agents + generators based on flow

3. `src/types/intent.ts` — Define intent types
   ```ts
   type Intent = 'content' | 'sales' | 'community' | 'product' | 'multi-agent' | 'custom' | 'help' | 'config';
   interface IntentResult {
     intent: Intent;
     confidence: number;
     reasoning: string;
     selectedSkill: string;
     selectedAgent?: string;
     selectedGenerator?: string;
   }
   ```

**Deliverable**:

- User input → classified to one of 8 intents
- Intent → agent path (with 50%+ accuracy)
- Multi-step reasoning (plan → execute → feedback)

**Est. Lines of Code**: 600 TS + prompt engineering

---

### PHASE 3: REST API + Database (Week 2-3)

**Objective**: Expose generators as REST API endpoints + persist outputs.

**Files to Create**:

1. `src/api/routes/generators.ts` — POST endpoints for each generator
   - `POST /api/generate/offer` → offer-generator + store in DB
   - `POST /api/generate/sales-system` → sales-system-generator
   - `POST /api/generate/growth-plan` → growth-plan-generator
   - `POST /api/generate/community-charter` → community-charter-generator
   - `POST /api/generate/product-roadmap` → product-roadmap-generator

2. `src/api/routes/orchestrate.ts` — POST /api/orchestrate (maestro-selector → execution)
   - Input: user_request, context
   - Output: orchestration_plan + execution_result

3. `src/database/schema.ts` — Database tables

   ```sql
   CREATE TABLE runs (
     id UUID PRIMARY KEY,
     user_id VARCHAR,
     intent VARCHAR,
     input JSON,
     selected_skill VARCHAR,
     selected_agent VARCHAR,
     status VARCHAR,
     created_at TIMESTAMP
   );

   CREATE TABLE outputs (
     id UUID PRIMARY KEY,
     run_id UUID FOREIGN KEY,
     generator_type VARCHAR,
     content JSON,
     metadata JSON,
     created_at TIMESTAMP
   );

   CREATE TABLE skill_cache (
     skill_name VARCHAR PRIMARY KEY,
     content LONGTEXT,
     type VARCHAR,
     cached_at TIMESTAMP
   );
   ```

4. `src/services/orchestration-service.ts` — Business logic
   - Accept intent result
   - Invoke agent(s)
   - Collect outputs
   - Store in DB
   - Return result

**Deliverable**:

- POST /api/orchestrate: request → full pipeline
- POST /api/generate/*: direct generator calls
- All outputs persisted to DB
- Response includes run_id for tracking

**Est. Lines of Code**: 800 TS + SQL

---

## TIMELINE

```
Week 1:
  Day 1-2: Phase 1 (Loaders) - 400 lines TS
  Day 3-4: Phase 2 (Maestro) - 600 lines TS
  Day 5: Testing + integration

Week 2:
  Day 6-7: Phase 3 API - 800 lines TS
  Day 8-9: Database schema + migrations
  Day 10: Testing + e2e validation

Week 3:
  Day 11: Vercel deployment + staging
  Day 12: Live deployment + monitoring
  Day 13: Buffer/polish
```

---

## DEPLOYMENT CHECKLIST

- [ ] Phase 1: Loaders + Registry (skill-loader.ts, prompt-loader.ts, skill-registry.ts)
- [ ] Phase 2: Maestro + Orchestration (maestro-selector.ts, orchestration-engine.ts)
- [ ] Phase 3: API Routes (generators.ts, orchestrate.ts, orchestration-service.ts)
- [ ] Database: Schema + migrations (runs, outputs, skill_cache tables)
- [ ] ENV Vars: ANTHROPIC_API_KEY, DATABASE_URL, REDIS_URL (if using)
- [ ] Vercel Config: Update api/index.ts to use orchestration routes
- [ ] Tests: Unit + integration for each phase
- [ ] Build: npm run build passes
- [ ] Typecheck: npm run typecheck passes
- [ ] Lint: npm run lint passes
- [ ] Deploy: git push → Vercel auto-deploy

---

## RISK MITIGATION

**Risk 1: Skill file parsing complexity**

- _Mitigation_: Use simple regex for frontmatter, test with 10 existing SKILL.md files first

**Risk 2: Intent classification accuracy**

- _Mitigation_: Use few-shot prompting, test against 20 sample intents, iterate

**Risk 3: Database scaling**

- _Mitigation_: Start with better-sqlite3 (local), migrate to PostgreSQL if needed

**Risk 4: API latency (multiple LLM calls)**

- _Mitigation_: Implement caching for skill lookups, batch generator calls where possible

---

## SUCCESS CRITERIA

- [ ] User: "Create offer for ADHD task manager" → POST /api/orchestrate
- [ ] FeedIA: Classifies as "content" → invokes content-strategist → offer-generator
- [ ] Output: 10 complete offers (positioning + pricing + scripts) in < 5 seconds
- [ ] Database: Run stored with ID, outputs queryable
- [ ] Vercel: Live at feedia.vercel.app with /api/orchestrate endpoint
- [ ] All 22 layers (5+4+3+5+5) accessible + functional
