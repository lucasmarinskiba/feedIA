/**
 * Creativity & Wit Engine (Motor de Ocurrencia)
 * Ensures content has genuine wit, originality, unexpected twists
 * Detects clichés, injects surprise, elevates concept beyond generic
 *
 * OCURRENTE definition: Ingenious, witty, unexpected, sharp, original.
 * Not just "correct" content — content that makes people stop and go "wow, didn't see that coming"
 */

import { log } from '../agent/logger.js';

interface WitAnalysis {
  witScore: number; // 0-100
  originalityScore: number; // 0-100
  clicheDetected: string[];
  surpriseElements: string[];
  recommendation: string;
  passed: boolean; // >= 70 combined
}

interface CreativeTwist {
  twistType: string;
  description: string;
  application: string;
}

class CreativityWitEngine {
  // Common clichés to detect and avoid across content types
  private readonly CLICHE_PATTERNS = [
    'live laugh love',
    'new year new me',
    'just do it',
    'good vibes only',
    'hustle hard',
    'grind never stops',
    'chase your dreams',
    'believe in yourself',
    'work hard play hard',
    'rise and grind',
    'boss babe',
    'squad goals',
    'blessed and grateful',
    'living my best life',
    'main character energy', // overused as of 2024
    'this is your sign',
    'the universe is telling you',
  ];

  // Wit patterns that signal genuine cleverness
  private readonly WIT_SIGNALS = [
    'unexpected juxtaposition',
    'plot twist',
    'subvert expectation',
    'ironic',
    'clever wordplay',
    'double meaning',
    'visual pun',
    'reveals at the end',
    'misdirection',
    'callback',
    'contrast reveals',
    'contradiction resolved',
  ];

  // Creative twist techniques (inject into prompts)
  private readonly TWIST_TECHNIQUES: CreativeTwist[] = [
    {
      twistType: 'expectation-subversion',
      description: 'Set up obvious expectation, then subvert with unexpected outcome',
      application: 'First 2 slides look like typical [X], slide 3 reveals unexpected [Y]',
    },
    {
      twistType: 'visual-pun',
      description: 'Literal visual representation of a figurative phrase',
      application: 'Show idiom/expression literally for comedic/clever effect',
    },
    {
      twistType: 'scale-distortion',
      description: 'Exaggerate size/proportion for surreal comedic effect',
      application: 'Make mundane object impossibly large/small to create wit',
    },
    {
      twistType: 'role-reversal',
      description: 'Flip expected power dynamic or roles',
      application: 'Underdog becomes hero, expected winner becomes punchline',
    },
    {
      twistType: 'callback-payoff',
      description: 'Plant detail early, payoff later in surprising way',
      application: 'Slide 1 shows small detail, final slide reveals its significance',
    },
    {
      twistType: 'contradiction-humor',
      description: 'Juxtapose contradictory elements for comedic tension',
      application: 'Serious tone + absurd content, or vice versa',
    },
    {
      twistType: 'meta-awareness',
      description: 'Content that winks at its own format/medium',
      application: 'Carousel that comments on being a carousel, breaks 4th wall cleverly',
    },
    {
      twistType: 'unexpected-comparison',
      description: 'Compare two unrelated things to reveal surprising truth',
      application: 'Connect [PRODUCT] to [UNRELATED CONCEPT] for fresh insight',
    },
    {
      twistType: 'reverse-chronology',
      description: 'Show ending first, then explain how we got there',
      application: 'Slide 1 = dramatic result, slides 2-9 = journey backward',
    },
    {
      twistType: 'literal-metaphor',
      description: 'Turn abstract metaphor into concrete visual scene',
      application: '"Burning bridges" shown as literal bridge on fire, cleverly staged',
    },
  ];

  /**
   * Analyze content for wit/originality
   */
  async analyzeWit(promptText: string): Promise<WitAnalysis> {
    const clicheDetected: string[] = [];
    const surpriseElements: string[] = [];

    const lowerText = promptText.toLowerCase();

    // Detect clichés
    for (const cliche of this.CLICHE_PATTERNS) {
      if (lowerText.includes(cliche)) {
        clicheDetected.push(cliche);
      }
    }

    // Detect wit signals
    for (const signal of this.WIT_SIGNALS) {
      if (lowerText.includes(signal.toLowerCase())) {
        surpriseElements.push(signal);
      }
    }

    // Calculate originality score (penalize clichés, reward wit signals)
    let originalityScore = 100;
    originalityScore -= clicheDetected.length * 20;
    originalityScore += surpriseElements.length * 10;
    originalityScore = Math.max(0, Math.min(100, originalityScore));

    // Calculate wit score (structural analysis)
    let witScore = 50; // baseline

    // Bonus for specific creative structures
    if (lowerText.includes('twist') || lowerText.includes('reveal')) witScore += 15;
    if (lowerText.includes('unexpected') || lowerText.includes('surprising')) witScore += 15;
    if (lowerText.includes('contrast') || lowerText.includes('juxtapos')) witScore += 10;
    if (lowerText.includes('irony') || lowerText.includes('ironic')) witScore += 10;
    if (clicheDetected.length === 0) witScore += 10; // clean bonus

    witScore = Math.max(0, Math.min(100, witScore));

    const combinedScore = (witScore + originalityScore) / 2;
    const passed = combinedScore >= 70;

    let recommendation = '';
    if (!passed) {
      if (clicheDetected.length > 0) {
        recommendation = `Remove clichés: ${clicheDetected.join(', ')}. Replace with fresh angle.`;
      } else {
        recommendation = 'Inject a creative twist technique to elevate originality.';
      }
    } else {
      recommendation = 'Content shows genuine wit and originality. Ready to proceed.';
    }

    log.info('[CreativityEngine] Wit analysis complete', {
      witScore,
      originalityScore,
      clicheCount: clicheDetected.length,
      passed,
    });

    return {
      witScore,
      originalityScore,
      clicheDetected,
      surpriseElements,
      recommendation,
      passed,
    };
  }

  /**
   * Inject creative twist into prompt
   */
  injectCreativeTwist(promptText: string, twistType?: string): { prompt: string; twist: CreativeTwist } {
    // Select twist technique (random or specified)
    const twist = twistType
      ? this.TWIST_TECHNIQUES.find(t => t.twistType === twistType) || this.TWIST_TECHNIQUES[0]
      : this.TWIST_TECHNIQUES[Math.floor(Math.random() * this.TWIST_TECHNIQUES.length)];

    const injection = `
[CREATIVE TWIST - OCURRENCIA INJECTION]
Technique: ${twist.twistType}
Concept: ${twist.description}
Application: ${twist.application}
[CRITICAL] This carousel/video/image must have genuine wit. Not generic. Not cliché.
Make viewer think "I didn't expect that" or "clever!" — surprise + intelligence combined.
`;

    const enhancedPrompt = `${promptText}\n${injection}`;

    log.info('[CreativityEngine] Creative twist injected', { twistType: twist.twistType });

    return { prompt: enhancedPrompt, twist };
  }

  /**
   * Remove clichés and suggest fresh alternatives
   */
  replaceClichés(promptText: string): { prompt: string; replacements: Array<{ from: string; to: string }> } {
    let refined = promptText;
    const replacements: Array<{ from: string; to: string }> = [];

    const clicheAlternatives: Record<string, string[]> = {
      'live laugh love': ['embrace beautiful chaos', 'collect moments not things', 'find joy in the mundane'],
      'new year new me': ['same me, sharper edges', 'evolution not resolution', 'upgrade in progress'],
      'just do it': ['stop overthinking, start moving', 'perfect is the enemy of done', 'action beats intention'],
      'good vibes only': ['real feelings, filtered honesty', 'authentic energy, no toxic positivity'],
      'hustle hard': ['work smart, rest intentional', 'sustainable ambition', 'burn bright not out'],
      'chase your dreams': ['build your reality', 'stop chasing, start creating', 'dreams need blueprints'],
      'believe in yourself': ['trust the process, question the doubt', 'confidence is built, not born'],
      'boss babe': ['unapologetic ambition', 'quietly powerful', 'competence over confidence theater'],
      'squad goals': ['chosen family energy', 'ride or die, no explanation needed'],
      'main character energy': ['own your narrative', 'protagonist mindset, ensemble humility'],
    };

    for (const [cliche, alternatives] of Object.entries(clicheAlternatives)) {
      if (refined.toLowerCase().includes(cliche)) {
        const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
        const regex = new RegExp(cliche, 'gi');
        refined = refined.replace(regex, replacement);
        replacements.push({ from: cliche, to: replacement });
      }
    }

    log.info('[CreativityEngine] Clichés replaced', { count: replacements.length });

    return { prompt: refined, replacements };
  }

  /**
   * Generate wit-boosted variation (full pipeline)
   */
  async boostWit(promptText: string): Promise<{
    originalPrompt: string;
    enhancedPrompt: string;
    analysis: WitAnalysis;
    twistApplied: CreativeTwist | null;
    clichesRemoved: Array<{ from: string; to: string }>;
  }> {
    // Step 1: Analyze
    const analysis = await this.analyzeWit(promptText);

    let enhancedPrompt = promptText;
    let twistApplied: CreativeTwist | null = null;
    let clichesRemoved: Array<{ from: string; to: string }> = [];

    // Step 2: Remove clichés if found
    if (analysis.clicheDetected.length > 0) {
      const clicheResult = this.replaceClichés(enhancedPrompt);
      enhancedPrompt = clicheResult.prompt;
      clichesRemoved = clicheResult.replacements;
    }

    // Step 3: Inject twist if score is low
    if (!analysis.passed) {
      const twistResult = this.injectCreativeTwist(enhancedPrompt);
      enhancedPrompt = twistResult.prompt;
      twistApplied = twistResult.twist;
    }

    log.info('[CreativityEngine] Wit boost complete', {
      originalScore: (analysis.witScore + analysis.originalityScore) / 2,
      clichesFixed: clichesRemoved.length,
      twistInjected: !!twistApplied,
    });

    return {
      originalPrompt: promptText,
      enhancedPrompt,
      analysis,
      twistApplied,
      clichesRemoved,
    };
  }

  /**
   * Get all available twist techniques
   */
  getAllTwistTechniques(): CreativeTwist[] {
    return this.TWIST_TECHNIQUES;
  }

  /**
   * Suggest twist technique based on content type
   */
  suggestTwistForContentType(contentType: 'carousel' | 'reel' | 'story' | 'image'): CreativeTwist[] {
    const suggestions: Record<string, string[]> = {
      carousel: ['expectation-subversion', 'callback-payoff', 'reverse-chronology'],
      reel: ['visual-pun', 'scale-distortion', 'meta-awareness'],
      story: ['role-reversal', 'contradiction-humor'],
      image: ['literal-metaphor', 'unexpected-comparison', 'scale-distortion'],
    };

    const types = suggestions[contentType] || [];
    return this.TWIST_TECHNIQUES.filter(t => types.includes(t.twistType));
  }
}

export const creativityWitEngine = new CreativityWitEngine();
