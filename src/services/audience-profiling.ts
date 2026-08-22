/**
 * Audience Profiling Engine
 * Auto-segment audiences → psychographics, demographics, behavior patterns
 */

export interface AudienceSegment {
  segmentId: string;
  name: string;
  size: number;
  demographics: { ageRange: string; location: string; gender?: string };
  psychographics: { interests: string[]; values: string[]; painPoints: string[] };
  behavior: { engagementRate: number; purchaseFrequency: number; contentPreference: string };
  recommendedFormats: string[];
  contentAffinities: Record<string, number>;
}

export interface AudienceProfile {
  totalAudience: number;
  segments: AudienceSegment[];
  primarySegment: AudienceSegment;
  secondarySegments: AudienceSegment[];
  niche: string;
  psychographicProfile: { archetype: string; worldView: string; riskTolerance: string };
}

export interface EngagementPattern {
  segmentId: string;
  topicAffinity: Record<string, number>;
  formatPreference: Record<string, number>;
  timePreference: { bestDays: string[]; bestHours: number[] };
  contentLength: 'short' | 'medium' | 'long';
}

// Segment database (in-memory; DB in production)
const audienceSegments: Map<string, AudienceSegment> = new Map();
const engagementPatterns: Map<string, EngagementPattern> = new Map();

export const createAudienceSegment = (
  niche: string,
  targetDescription: string
): AudienceSegment => {
  const segmentId = `seg_${niche}_${Date.now()}`;

  // Auto-profile based on niche + description
  const profile = inferSegmentProfile(niche, targetDescription);

  const segment: AudienceSegment = {
    segmentId,
    name: profile.name,
    size: profile.size,
    demographics: profile.demographics,
    psychographics: profile.psychographics,
    behavior: profile.behavior,
    recommendedFormats: profile.recommendedFormats,
    contentAffinities: profile.contentAffinities,
  };

  audienceSegments.set(segmentId, segment);

  console.log('[AudienceProfiling] Segment created:', { segmentId, name: segment.name });
  return segment;
};

export const profileAudience = (
  niche: string,
  description: string,
  engagementData?: Record<string, number>
): AudienceProfile => {
  if (audienceSegments.size === 0) {
    const primarySegment = createAudienceSegment(niche, description);
    const secondarySegments = generateSecondarySegments(niche, primarySegment);

    return {
      totalAudience: primarySegment.size + secondarySegments.reduce((sum, s) => sum + s.size, 0),
      segments: [primarySegment, ...secondarySegments],
      primarySegment,
      secondarySegments,
      niche,
      psychographicProfile: {
        archetype: inferArchetype(niche),
        worldView: inferWorldView(niche),
        riskTolerance: inferRiskTolerance(niche),
      },
    };
  }

  // Return existing profiles
  const segments = Array.from(audienceSegments.values());
  return {
    totalAudience: segments.reduce((sum, s) => sum + s.size, 0),
    segments,
    primarySegment: segments[0]!,
    secondarySegments: segments.slice(1),
    niche,
    psychographicProfile: {
      archetype: inferArchetype(niche),
      worldView: inferWorldView(niche),
      riskTolerance: inferRiskTolerance(niche),
    },
  };
};

export const getSegmentAffinities = (segmentId: string): Record<string, number> => audienceSegments.get(segmentId)?.contentAffinities ?? {};

export const predictSegmentBehavior = (segmentId: string): EngagementPattern => {
  const segment = audienceSegments.get(segmentId);
  if (!segment) {
    throw new Error(`Segment ${segmentId} not found`);
  }

  // Calculate based on segment profile
  const pattern: EngagementPattern = {
    segmentId,
    topicAffinity: inferTopicAffinities(segment),
    formatPreference: inferFormatPreferences(segment),
    timePreference: inferTimePreferences(segment),
    contentLength: inferContentLength(segment),
  };

  engagementPatterns.set(segmentId, pattern);
  return pattern;
};

export const compareSegments = (segmentIds: string[]): { similarities: Record<string, number>; differences: Record<string, number> } => {
  const segments = segmentIds.map((id) => audienceSegments.get(id)).filter((s) => s !== undefined) as AudienceSegment[];

  if (segments.length < 2) {
    return { similarities: {}, differences: {} };
  }

  const similarities: Record<string, number> = {};
  const differences: Record<string, number> = {};

  // Compare first two segments
  const s1 = segments[0]!;
  const s2 = segments[1]!;

  // Interest overlap
  const interests1 = new Set(s1.psychographics.interests);
  const interests2 = new Set(s2.psychographics.interests);
  const overlap = [...interests1].filter((i) => interests2.has(i));
  similarities['interest_overlap'] = overlap.length / Math.max(interests1.size, 1);

  // Engagement difference
  differences['engagement_gap'] = Math.abs(s1.behavior.engagementRate - s2.behavior.engagementRate);

  // Format preference difference
  const formats1 = Object.keys(s1.contentAffinities);
  const formats2 = Object.keys(s2.contentAffinities);
  const formatOverlap = formats1.filter((f) => formats2.includes(f)).length;
  similarities['format_alignment'] = formatOverlap / Math.max(formats1.length, 1);

  return { similarities, differences };
};

// ============ HELPERS ============

const inferSegmentProfile = (
  niche: string,
  description: string
): {
  name: string;
  size: number;
  demographics: { ageRange: string; location: string; gender?: string };
  psychographics: { interests: string[]; values: string[]; painPoints: string[] };
  behavior: { engagementRate: number; purchaseFrequency: number; contentPreference: string };
  recommendedFormats: string[];
  contentAffinities: Record<string, number>;
} => {
  const lowerNiche = niche.toLowerCase();
  const lowerDesc = description.toLowerCase();

  // Infer segment name from niche
  let segmentName = 'General Audience';
  if (lowerNiche.includes('luxury')) segmentName = 'Luxury Enthusiasts';
  else if (lowerNiche.includes('budget')) segmentName = 'Value Seekers';
  else if (lowerNiche.includes('beauty')) segmentName = 'Beauty Aficionados';
  else if (lowerNiche.includes('fitness')) segmentName = 'Fitness Enthusiasts';
  else if (lowerNiche.includes('business')) segmentName = 'Business Professionals';

  return {
    name: segmentName,
    size: Math.floor(Math.random() * 500000) + 50000, // 50K-550K estimate
    demographics: {
      ageRange: lowerDesc.includes('young') ? '18-35' : lowerDesc.includes('professional') ? '25-45' : '18-65',
      location: lowerDesc.includes('urban') ? 'Urban' : lowerDesc.includes('rural') ? 'Rural' : 'Mixed',
      gender: lowerDesc.includes('women') ? 'Female' : lowerDesc.includes('men') ? 'Male' : undefined,
    },
    psychographics: {
      interests: [
        lowerNiche.includes('beauty') ? 'skincare' : 'general',
        lowerNiche.includes('fitness') ? 'health' : 'lifestyle',
        'social media',
      ],
      values: ['authenticity', 'quality', 'community'],
      painPoints: ['time constraints', 'decision fatigue', 'FOMO'],
    },
    behavior: {
      engagementRate: Math.random() * 0.2 + 0.05,
      purchaseFrequency: Math.random() * 12 + 2,
      contentPreference: 'mixed',
    },
    recommendedFormats: lowerNiche.includes('fitness')
      ? ['reel', 'carousel']
      : lowerNiche.includes('beauty')
        ? ['carousel', 'story']
        : ['reel', 'carousel', 'story'],
    contentAffinities: {
      educational: 0.8,
      inspirational: 0.7,
      entertaining: 0.6,
      promotional: 0.3,
    },
  };
};

const generateSecondarySegments = (niche: string, primary: AudienceSegment): AudienceSegment[] => {
  // Generate 2-3 secondary segments based on primary
  const secondary: AudienceSegment[] = [];

  const secondaryNames = ['Early Adopters', 'Loyal Community', 'Curious Explorers'];
  secondaryNames.forEach((name, idx) => {
    secondary.push({
      segmentId: `seg_sec_${niche}_${idx}`,
      name,
      size: Math.floor(primary.size * (0.3 - idx * 0.1)),
      demographics: { ...primary.demographics, ageRange: `${20 + idx * 10}-${40 + idx * 10}` },
      psychographics: primary.psychographics,
      behavior: { ...primary.behavior, engagementRate: primary.behavior.engagementRate * (0.8 - idx * 0.1) },
      recommendedFormats: primary.recommendedFormats,
      contentAffinities: primary.contentAffinities,
    });
  });

  return secondary;
};

const inferArchetype = (niche: string): string => {
  const lower = niche.toLowerCase();
  if (lower.includes('luxury')) return 'The Aspirant';
  if (lower.includes('fitness')) return 'The Optimizer';
  if (lower.includes('beauty')) return 'The Curator';
  if (lower.includes('business')) return 'The Builder';
  return 'The Explorer';
};

const inferWorldView = (niche: string): string => {
  const lower = niche.toLowerCase();
  if (lower.includes('luxury')) return 'Quality over quantity, status through taste';
  if (lower.includes('fitness')) return 'Health is wealth, self-improvement is identity';
  if (lower.includes('beauty')) return 'Authenticity through self-expression and ritual';
  return 'Balance between growth and enjoyment';
};

const inferRiskTolerance = (niche: string): string => {
  const lower = niche.toLowerCase();
  if (lower.includes('luxury')) return 'Low risk, high return preference';
  if (lower.includes('business')) return 'Calculated risk-taking';
  return 'Moderate risk tolerance';
};

const inferTopicAffinities = (segment: AudienceSegment): Record<string, number> => ({
    'before-after': 0.9,
    tips: 0.85,
    educational: 0.8,
    lifestyle: 0.75,
    trending: 0.6,
    promotional: 0.3,
  });

const inferFormatPreferences = (segment: AudienceSegment): Record<string, number> => {
  const prefs: Record<string, number> = {
    carousel: 0.85,
    reel: 0.8,
    story: 0.7,
    static: 0.5,
  };

  segment.recommendedFormats.forEach((fmt) => {
    prefs[fmt] = Math.min((prefs[fmt] ?? 0.5) + 0.15, 1.0);
  });

  return prefs;
};

const inferTimePreferences = (segment: AudienceSegment): { bestDays: string[]; bestHours: number[] } => ({
    bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
    bestHours: [9, 12, 18, 21],
  });

const inferContentLength = (segment: AudienceSegment): 'short' | 'medium' | 'long' => {
  if (segment.behavior.contentPreference.includes('quick')) return 'short';
  if (segment.behavior.contentPreference.includes('deep')) return 'long';
  return 'medium';
};
