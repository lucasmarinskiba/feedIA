import Anthropic from '@anthropic-ai/sdk';
import type { Intent, IntentResult, OrchestrationRequest } from '../types/intent';
import { getSkillRegistry } from '../services/skill-registry';

const INTENT_OPTIONS: Intent[] = [
  'content',
  'sales',
  'community',
  'product',
  'multi-agent',
  'custom',
  'help',
  'config',
];

const INTENT_DESCRIPTIONS: Record<Intent, string> = {
  content: 'Content strategy, carousel generation, hook creation, audience insights',
  sales: 'Sales system, prospecting, closing, 7-touch sequences, objection handling',
  community: 'Community building, member engagement, leader pipeline, growth strategies',
  product: 'Product validation, PMF testing, MVP development, pivot decisions',
  'multi-agent': 'Complex orchestration requiring multiple agents working together',
  custom: 'Custom workflows, specialized use cases, experimental features',
  help: 'User help, documentation, FAQs, system guidance',
  config: 'Configuration, settings, preferences, environment setup',
};

const INTENT_MAPPING: Record<Intent, { agents: string[]; generators: string[] }> = {
  content: {
    agents: ['content-strategist'],
    generators: ['offer-generator', 'growth-plan-generator'],
  },
  sales: {
    agents: ['sales-closer'],
    generators: ['sales-system-generator'],
  },
  community: {
    agents: ['community-manager'],
    generators: ['community-charter-generator'],
  },
  product: {
    agents: ['product-manager'],
    generators: ['product-roadmap-generator'],
  },
  'multi-agent': {
    agents: ['content-strategist', 'sales-closer', 'community-manager', 'product-manager'],
    generators: [],
  },
  custom: {
    agents: [],
    generators: [],
  },
  help: {
    agents: [],
    generators: [],
  },
  config: {
    agents: [],
    generators: [],
  },
};

export class MaestroSelector {
  private client: Anthropic;
  private registry: ReturnType<typeof getSkillRegistry>;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.registry = getSkillRegistry();
  }

  private buildPrompt(userRequest: string, previousIntents?: Intent[]): string {
    const intentDescriptions = INTENT_OPTIONS.map((intent) => `  - ${intent}: ${INTENT_DESCRIPTIONS[intent]}`).join(
      '\n',
    );

    const previousContext =
      previousIntents && previousIntents.length > 0
        ? `\nPrevious intents in this session: ${previousIntents.join(', ')}\n`
        : '';

    return `You are FeedIA's intent classifier. Your job is to understand what the user wants and route them to the right agent.

Available intents:
${intentDescriptions}

User request:
"${userRequest}"
${previousContext}

Analyze the request carefully. Consider:
1. Primary objective (what does the user want to accomplish?)
2. Domain (marketing, sales, community, product development?)
3. Urgency and complexity
4. Related skills or tools needed

Respond in JSON format:
{
  "intent": "<one of: ${INTENT_OPTIONS.join(' | ')}>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation of why this intent was selected>",
  "relatedIntents": ["<alternative intents if applicable>"],
  "suggestedSkills": ["<skill names from registry if applicable>"]
}

Only respond with valid JSON, no other text.`;
  }

  async classify(request: OrchestrationRequest): Promise<IntentResult> {
    const prompt = this.buildPrompt(request.userRequest, request.context?.previousIntents);

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      if (!message.content[0] || message.content[0].type !== 'text') {
        throw new Error('Invalid response format from Claude API');
      }

      const responseText = message.content[0].text;
      const parsed = JSON.parse(responseText);

      const intent = parsed.intent as Intent;
      const mapping = INTENT_MAPPING[intent];

      const selectedAgent = mapping.agents[0] || '';
      const selectedGenerator = mapping.generators[0] || '';

      return {
        intent,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        selectedSkill: intent,
        selectedAgent,
        selectedGenerator,
        relatedSkills: parsed.suggestedSkills || [],
        metadata: {
          relatedIntents: parsed.relatedIntents,
          rawResponse: parsed,
        },
      };
    } catch (err) {
      console.error('[MaestroSelector] Classification error:', err);
      throw new Error(`Intent classification failed: ${String(err)}`);
    }
  }

  async classifyMultiStep(userRequest: string, maxSteps = 3): Promise<IntentResult[]> {
    const results: IntentResult[] = [];
    let currentRequest = userRequest;
    const previousIntents: Intent[] = [];

    for (let i = 0; i < maxSteps; i++) {
      const result = await this.classify({
        userRequest: currentRequest,
        context: {
          previousIntents,
        },
      });

      results.push(result);
      previousIntents.push(result.intent);

      if (result.intent === 'multi-agent' || result.confidence < 0.6) {
        break;
      }

      currentRequest = `Follow-up to previous request about ${result.intent}: ${userRequest}`;
    }

    return results;
  }
}

export const getMaestroSelector = (): MaestroSelector => new MaestroSelector();
