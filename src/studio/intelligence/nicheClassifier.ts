import type { NicheCategory } from './nicheAnalyzer.js';

/**
 * Neural-inspired multi-signal niche classifier
 * Architecture: signal extraction → feature vector → weight matrix → softmax
 * 1-layer perceptron ensemble with domain-expert weights
 */

export interface ClassificationInput {
  bioText: string;
  hashtags: string[];
  ctaText: string;
  contentSamples: string[];
  linkDomain?: string;
  followersCount?: number;
  engagementRate?: number;
  hasBusinessAccount?: boolean;
  pricingMentions?: string[];
}

export interface ClassificationResult {
  primaryNiche: NicheCategory;
  secondaryNiche?: NicheCategory;
  scores: NicheScore[];
  confidence: number;
  triggeringFeatures: string[];
  monetizationHints: string[];
}

export interface NicheScore {
  niche: NicheCategory;
  probability: number;
  activatedFeatures: string[];
}

// Layer 1: feature extraction patterns → binary activation
const FEATURE_PATTERNS: Record<string, RegExp> = {
  sells_supplements: /suplemento|proteína|whey|creatina|pre.?workout|protein|supplement|bcaa|collagen|vitamin/i,
  sells_clothing: /ropa|indumentaria|outfit|leggings|gym.?wear|clothing|apparel|activewear/i,
  sells_equipment: /mancuerna|barra|equipo|accesorio|dumbbell|equipment|gear|band|resistance/i,
  has_shop_cta: /shop.?now|buy.?now|tienda|comprar|order.?now|get.?yours|add.?to.?cart/i,
  has_link_in_bio: /link.?in.?bio|bio.?link|check.?bio|tap.?bio/i,
  sells_coaching: /coaching|coach|asesor[ií]a|transform|programa|program|mentor/i,
  dm_funnel: /dm.?me|escrib[ei]me|manda.?dm|send.?dm|message.?me|inbox.?me/i,
  transformation_focus: /transform|cambio|resultado|result|antes.?despu[eé]s|before.?after|fat.?loss|muscle/i,
  targets_coaches: /coaches|entrenadores|profesionales del fitness|fitness.?pros|other.?trainers/i,
  b2b_results: /clientes|clients|negocio|business|factura|revenue|income|10k|5k.?month/i,
  b2b_methodology: /sistema|method|blueprint|formula|framework|estrategia|paso.?a.?paso/i,
  lifestyle_content: /mi vida|my life|lifestyle|día a día|daily|vlog|behind.?scenes/i,
  personal_growth: /grow|crecer|seguidores|followers|viral|trending|crecimiento/i,
  personal_story: /historia|story|journey|proceso|process|transparencia|transparency/i,
  product_catalog: /catálogo|catalog|colección|collection|new.?arrival|nuevo.?producto/i,
  shipping_mention: /env[ií]o|shipping|entrega|delivery|worldwide|internacional/i,
  teaches_skills: /aprender|learn|curso|course|clase|class|tutorial|lesson|masterclass/i,
  comedy_signals: /humor|funny|meme|jaja|lol|entretenimiento|comedy/i,
  financial_content: /dinero|money|inversión|invest|finanza|finance|trading|cripto|crypto/i,
  real_estate_signals: /propiedad|property|inmobili|real.?estate|apartment|house|rent/i,
  beauty_signals: /maquillaje|makeup|skincare|belleza|beauty|cosmetic|glow|skin/i,
  fashion_signals: /moda|fashion|style|estilo|outfit|look|ootd|streetwear/i,
  travel_signals: /viaje|travel|destino|destination|explore|aventura|wanderlust/i,
  tech_signals: /tech|tecnolog[ií]a|software|app|digital|ia\b|ai\b|startup|code/i,
  food_signals: /receta|recipe|comida|food|cocina|cook|chef|delicious|yummy/i,
  has_pricing: /\$\d+|\d+\s*usd|\d+\s*eur|precio|price|costo|cost|tarifa/i,
  has_testimonials: /testimonio|testimonial|review|resultado.?real|cliente.?dice/i,
  ugc_signals: /repost|ugc|user.?generated|cliente.?comparte|customer.?photo/i,
  authority_signals: /experto|expert|especialista|specialist|certified|certificado|años de experiencia/i,
  sponsorship_signals: /ad|sponsored|collaboration|collab|partnership|brand.?deal|gifted/i,
  affiliate_signals: /affiliate|link|código.?descuento|discount.?code|referral|comisión/i,
};

// Weight matrix: feature → (niche: affinity_weight)
// Range 0-3. Higher = stronger classifier signal.
const WEIGHT_MATRIX: Record<string, Partial<Record<NicheCategory, number>>> = {
  sells_supplements: { 'fitness-products': 3, ecommerce: 1 },
  sells_clothing: { 'fitness-products': 2, ecommerce: 2, fashion: 1 },
  sells_equipment: { 'fitness-products': 3, ecommerce: 1 },
  has_shop_cta: { 'fitness-products': 2, ecommerce: 3, fashion: 1, beauty: 1 },
  has_link_in_bio: { 'fitness-products': 1, ecommerce: 1, 'fitness-coaching': 1, 'b2b-services': 1 },
  sells_coaching: { 'fitness-coaching': 3, coaching: 2, 'fitness-b2b': 1 },
  dm_funnel: { 'fitness-coaching': 3, coaching: 2, 'fitness-b2b': 2 },
  transformation_focus: { 'fitness-coaching': 3, 'fitness-products': 1, 'fitness-lifestyle': 1 },
  targets_coaches: { 'fitness-b2b': 3, 'b2b-services': 2 },
  b2b_results: { 'fitness-b2b': 2, 'b2b-services': 3, coaching: 1 },
  b2b_methodology: { 'fitness-b2b': 2, 'b2b-services': 3, coaching: 1 },
  lifestyle_content: { 'personal-brand': 2, 'fitness-lifestyle': 2 },
  personal_growth: { 'personal-brand': 2, entertainment: 1, 'fitness-lifestyle': 1 },
  personal_story: { 'personal-brand': 3, 'fitness-coaching': 1, 'fitness-lifestyle': 2 },
  product_catalog: { ecommerce: 3, 'fitness-products': 1, fashion: 1 },
  shipping_mention: { ecommerce: 3, 'fitness-products': 1 },
  teaches_skills: { education: 3, coaching: 1, 'fitness-coaching': 1, 'fitness-b2b': 1 },
  comedy_signals: { entertainment: 3 },
  financial_content: { finance: 3 },
  real_estate_signals: { 'real-estate': 3 },
  beauty_signals: { beauty: 3, fashion: 1 },
  fashion_signals: { fashion: 3, beauty: 1 },
  travel_signals: { travel: 3 },
  tech_signals: { tech: 3, education: 1 },
  food_signals: { food: 3, 'personal-brand': 1 },
  has_pricing: { 'fitness-products': 2, ecommerce: 2, 'fitness-coaching': 2, 'b2b-services': 2 },
  has_testimonials: { 'fitness-products': 2, 'fitness-coaching': 3, coaching: 2, ecommerce: 1 },
  ugc_signals: { ecommerce: 3, 'fitness-products': 2 },
  authority_signals: { 'fitness-b2b': 2, 'b2b-services': 2, education: 2, coaching: 2 },
  sponsorship_signals: { 'personal-brand': 3, entertainment: 2, fashion: 2, beauty: 2 },
  affiliate_signals: { 'personal-brand': 2, entertainment: 1, 'fitness-lifestyle': 2 },
};

const ALL_NICHES: NicheCategory[] = [
  'fitness-products',
  'fitness-coaching',
  'fitness-b2b',
  'fitness-lifestyle',
  'ecommerce',
  'coaching',
  'b2b-services',
  'personal-brand',
  'entertainment',
  'education',
  'travel',
  'food',
  'tech',
  'finance',
  'beauty',
  'fashion',
  'real-estate',
];

export class NicheClassifier {
  /**
   * Classify niche from raw account signals
   * Returns probability distribution over all niches
   */
  classify(input: ClassificationInput): ClassificationResult {
    const corpus = this.buildCorpus(input);
    const activatedFeatures = this.extractFeatures(corpus);
    const rawScores = this.computeScores(activatedFeatures);
    const normalized = this.softmax(rawScores);
    const sorted = normalized.sort((a, b) => b.probability - a.probability);

    const primary = sorted[0]!;
    const secondary = sorted[1]!;

    // Confidence: gap between top two scores
    const confidence = primary.probability - secondary.probability;

    return {
      primaryNiche: primary.niche,
      secondaryNiche: secondary.probability > 0.15 ? secondary.niche : undefined,
      scores: sorted,
      confidence: Math.min(confidence * 3, 1),
      triggeringFeatures: primary.activatedFeatures,
      monetizationHints: this.inferMonetization(activatedFeatures),
    };
  }

  private buildCorpus(input: ClassificationInput): string {
    return [
      input.bioText,
      input.ctaText,
      ...input.hashtags,
      ...input.contentSamples,
      ...(input.pricingMentions ?? []),
      input.linkDomain ?? '',
    ].join(' ');
  }

  private extractFeatures(corpus: string): string[] {
    return Object.entries(FEATURE_PATTERNS)
      .filter(([, pattern]) => pattern.test(corpus))
      .map(([name]) => name);
  }

  private computeScores(features: string[]): NicheScore[] {
    const scoreMap: Map<NicheCategory, { total: number; features: string[] }> = new Map(
      ALL_NICHES.map((n) => [n, { total: 0, features: [] }]),
    );

    for (const feature of features) {
      const weights = WEIGHT_MATRIX[feature];
      if (!weights) continue;

      for (const [niche, weight] of Object.entries(weights) as [NicheCategory, number][]) {
        const entry = scoreMap.get(niche);
        if (entry) {
          entry.total += weight;
          entry.features.push(feature);
        }
      }
    }

    return ALL_NICHES.map((niche) => {
      const entry = scoreMap.get(niche)!;
      return { niche, probability: entry.total, activatedFeatures: entry.features };
    });
  }

  private softmax(scores: NicheScore[]): NicheScore[] {
    const maxScore = Math.max(...scores.map((s) => s.probability));
    const exps = scores.map((s) => ({ ...s, probability: Math.exp(s.probability - maxScore) }));
    const sum = exps.reduce((acc, s) => acc + s.probability, 0);

    return exps.map((s) => ({
      ...s,
      probability: sum > 0 ? s.probability / sum : 1 / scores.length,
    }));
  }

  private inferMonetization(features: string[]): string[] {
    const hints: string[] = [];
    if (features.includes('sells_supplements') || features.includes('sells_clothing')) hints.push('physical-products');
    if (features.includes('sells_coaching') || features.includes('dm_funnel')) hints.push('services-b2c');
    if (features.includes('targets_coaches') || features.includes('b2b_methodology')) hints.push('services-b2b');
    if (features.includes('affiliate_signals')) hints.push('affiliate');
    if (features.includes('sponsorship_signals')) hints.push('sponsorships');
    if (features.includes('teaches_skills')) hints.push('digital-products');
    if (hints.length === 0) hints.push('content-only');
    return hints;
  }
}

export const nicheClassifier = new NicheClassifier();
