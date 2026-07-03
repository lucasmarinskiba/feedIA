/**
 * Agent Integration Layer
 * Wires agent frameworks into content generation endpoints
 * Reasoning-first: plan → generate → validate
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { log } from '../agent/logger.js';

interface AgentFramework {
  name: string;
  summary: string;
  templates?: Record<string, unknown>;
}

interface AgentContext {
  agents: Map<string, AgentFramework>;
  toolType: string;
  brief: Record<string, unknown>;
}

// ── System Prompt Builder ──────────────────────────────────────────

class AgentSystemPromptBuilder {
  private agents: Map<string, AgentFramework> = new Map();
  private reasoning: boolean = true;

  addAgent(type: string, framework: AgentFramework): this {
    this.agents.set(type, framework);
    return this;
  }

  build(toolType: string, briefSummary: string): string {
    const agentContextLines = Array.from(this.agents.values())
      .map((agent) => `## ${agent.name}\n${agent.summary}`)
      .join('\n\n');

    const reasoningInstructions = this.reasoning
      ? `## REASONING BEFORE GENERATION

Before you generate the ${toolType}:

1. CONCEPT CHECK: Which agent concept best fits?
2. DESIGN CHECK: Which visual specs align?
3. NARRATIVE CHECK: How does structure apply?
4. COPY CHECK: What psychology drives messaging?
5. DETAIL CHECK: What 8K specs required?

Then generate following reasoning.`
      : '';

    const qualityGates = `## QUALITY GATES

Output must:
✓ Match chosen concept/framework
✓ Follow design specifications
✓ Include narrative structure (if applicable)
✓ Use psychology-driven messaging
✓ Specify 8K details (if hero image)
✓ Align with brand guidelines
✓ Optimize for platform format`;

    return `You are a professional ${toolType} creator for FeedIA.
Your job: Think like strategist first. Reference agent frameworks.

${agentContextLines}

${reasoningInstructions}

${qualityGates}

Brief: ${briefSummary}`;
  }
}

// ── Agent Framework Loader ────────────────────────────────────────

const AGENT_FRAMEWORKS: Map<string, AgentFramework> = new Map([
  [
    'ideation',
    {
      name: 'CREATIVE IDEATION ENGINE',
      summary: `50+ mashup concepts. Examples:
- Scale collision (tiny object + giant environment)
- Inversion (expected reversed)
- Emotion mashup (two unrelated emotions merged)
- Temporal twist (past meets future)
- Tool mashup (object used for unexpected purpose)`,
      templates: {
        mashups: [
          'Athlete as FIFA trading card',
          'Trophy as backpack (weight of achievement)',
          'Victory kiss with national flag',
          'Silhouette double exposure with celebration',
          'Bench sitting contemplation before game',
        ],
      },
    },
  ],
  [
    'design',
    {
      name: 'DESIGN DIRECTOR SPECIFICATIONS',
      summary: `Visual direction specs:
Palettes: Gold Legacy (#FFD700), Coral Energy (#E8A8A8), Purple Icon (#8B00FF)
Poses: Double exposure fist, bench sitting clasped, icon day standing
Lighting: Cinematic rim light, daylight warm, studio dramatic
Typography: 28-36px headline bold, 14-18px body regular`,
    },
  ],
  [
    'narrative',
    {
      name: 'ACHIEVEMENT TRANSFORMATION ARC',
      summary: `5-stage structure:
1. Beginning (grey) - foundation
2. Struggle (coral) - effort shown
3. Breakthrough (orange) - turning point
4. Dominance (gold) - peak performance
5. Legacy (purple) - timeless impact
Each stage: visual mood + psychological energy + narrative purpose.`,
    },
  ],
  [
    'copy',
    {
      name: 'COPY ENGINE',
      summary: `Psychology-driven messaging:
Hook: Curiosity + mystery (grab first 2 seconds)
Education: Value + proof (build credibility)
Conclusion: Social proof + CTA (convert)
Never generic. Always psychology-first.`,
    },
  ],
  [
    'detail',
    {
      name: 'DETAIL OBSESSION SPECIFICATIONS',
      summary: `8K micro-detail specs:
Jersey: Embroidered crest (stitch count), arm band elastic, sleeve badge
Fabric: Knit weave pattern, moisture absorption zones, sweat darkening
Lighting: Reflections catching detail, shadows showing texture
Resolution: 8K rendering priority on hero images.`,
    },
  ],
  [
    'viral',
    {
      name: 'VIRAL HUMOR CONCEPTS',
      summary: `Absurdist mashup formulas:
- Normal element + absurdist twist + visual surprise
- Universally relatable + unexpected contrast
- Shareability factor: weird enough to share, relatable enough to understand
Examples: Pet as athlete, trophy as everyday object, silhouette as monument.`,
    },
  ],
  [
    'strategy',
    {
      name: 'CONTENT STRATEGY AGENT',
      summary: `Multi-platform alignment:
Instagram: Aspiration 40%, authenticity 30%, education 20%, entertainment 10%
TikTok: Trends 40%, authentic 30%, humor 20%, education 10%
LinkedIn: Insights 50%, professional 30%, personal 20%
YouTube: Deep-dive 100% (15-45min format)`,
    },
  ],
]);

// ── Core Integration Functions ────────────────────────────────────

async function planContentWithAgents(
  toolType: string,
  brief: Record<string, unknown>,
  relevantAgents: string[],
): Promise<string> {
  const client = new Anthropic();
  const builder = new AgentSystemPromptBuilder();

  // Load relevant agents
  relevantAgents.forEach((agentKey) => {
    const agent = AGENT_FRAMEWORKS.get(agentKey);
    if (agent) builder.addAgent(agentKey, agent);
  });

  const systemPrompt = builder.build(toolType, JSON.stringify(brief));

  log.info(`[Agent Integration] Planning ${toolType} with ${relevantAgents.length} agents`);

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Planning request:
Topic/Subject: ${brief.topic || brief.subject || 'N/A'}
Style: ${brief.style || brief.mood || 'aspirational'}
Platform: ${brief.platform || 'multi'}

Reason through:
1. Which concept mashup fits best?
2. Which design specs apply?
3. How does narrative arc structure this?
4. What psychology drives the messaging?
5. What details matter most?

Provide a detailed plan.`,
        },
      ],
    });

    const plan = response.content[0].type === 'text' ? response.content[0].text : '';
    log.info(`[Agent Integration] ✓ Plan generated (${plan.length} chars)`);
    return plan;
  } catch (error) {
    log.error(`[Agent Integration] Planning failed: ${error}`);
    throw error;
  }
}

async function generateContentWithPlan(
  toolType: string,
  brief: Record<string, unknown>,
  plan: string,
  relevantAgents: string[],
): Promise<string> {
  const client = new Anthropic();
  const builder = new AgentSystemPromptBuilder();

  relevantAgents.forEach((agentKey) => {
    const agent = AGENT_FRAMEWORKS.get(agentKey);
    if (agent) builder.addAgent(agentKey, agent);
  });

  const systemPrompt = builder.build(toolType, JSON.stringify(brief));

  log.info(`[Agent Integration] Generating ${toolType} from plan`);

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Following this plan:
${plan}

Now generate the complete ${toolType}:
- Specific copy for each slide/section
- Visual direction (design specs, palette, pose, lighting)
- Micro-detail specifications (if hero image)
- Animation/timing guidance
- Platform-specific optimizations

Make it high-quality, specific, and actionable.`,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    log.info(`[Agent Integration] ✓ Content generated (${content.length} chars)`);
    return content;
  } catch (error) {
    log.error(`[Agent Integration] Generation failed: ${error}`);
    throw error;
  }
}

// ── Public API ────────────────────────────────────────────────────

export async function generateCarouselWithAgents(
  brief: Record<string, unknown>,
): Promise<{ plan: string; content: string }> {
  const agents = ['ideation', 'design', 'narrative', 'copy', 'detail'];

  const plan = await planContentWithAgents('carousel', brief, agents);
  const content = await generateContentWithPlan('carousel', brief, plan, agents);

  return { plan, content };
}

export async function generatePhotoWithAgents(
  brief: Record<string, unknown>,
): Promise<{ plan: string; content: string }> {
  const agents = ['design', 'detail', 'narrative'];

  const plan = await planContentWithAgents('photo', brief, agents);
  const content = await generateContentWithPlan('photo', brief, plan, agents);

  return { plan, content };
}

export async function generateVideoWithAgents(
  brief: Record<string, unknown>,
): Promise<{ plan: string; content: string }> {
  const agents = ['narrative', 'viral', 'strategy', 'copy'];

  const plan = await planContentWithAgents('video', brief, agents);
  const content = await generateContentWithPlan('video', brief, plan, agents);

  return { plan, content };
}

export async function generateReelWithAgents(
  brief: Record<string, unknown>,
): Promise<{ plan: string; content: string }> {
  const agents = ['viral', 'strategy', 'copy'];

  const plan = await planContentWithAgents('reel', brief, agents);
  const content = await generateContentWithPlan('reel', brief, plan, agents);

  return { plan, content };
}

export function getAgentFrameworks(): Map<string, AgentFramework> {
  return AGENT_FRAMEWORKS;
}

export class AgentSystemPromptBuilderExport extends AgentSystemPromptBuilder {}
