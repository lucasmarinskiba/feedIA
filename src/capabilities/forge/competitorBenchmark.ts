/**
 * Competitor Benchmarking — Phase 7
 * Compara scores vs benchmarks de mercado por nicho
 */

export interface NicheSegment {
  name: string;
  avgContentScore: number;
  avgHookScore: number;
  avgAccountScore: number;
  p75ContentScore: number; // Top 25%
  p75HookScore: number;
  p75AccountScore: number;
  postVolume: number; // Posts analyzed
}

export interface BenchmarkComparison {
  userScores: { contenido: number; hook: number; cuenta: number };
  niche: NicheSegment;
  gaps: {
    contenido: number; // User - avg (negative = behind)
    hook: number;
    cuenta: number;
  };
  topQuartileGaps: {
    contenido: number;
    hook: number;
    cuenta: number;
  };
  percentileRank: {
    contenido: number; // 0-100
    hook: number;
    cuenta: number;
  };
  recommendations: string[];
}

// Mock market data by niche (based on typical Instagram/TikTok patterns)
const nicheSegments: Record<string, NicheSegment> = {
  lifestyle: {
    name: 'Lifestyle & Wellness',
    avgContentScore: 62,
    avgHookScore: 58,
    avgAccountScore: 68,
    p75ContentScore: 78,
    p75HookScore: 75,
    p75AccountScore: 82,
    postVolume: 1250,
  },
  business: {
    name: 'Business & Education',
    avgContentScore: 68,
    avgHookScore: 65,
    avgAccountScore: 72,
    p75ContentScore: 84,
    p75HookScore: 82,
    p75AccountScore: 88,
    postVolume: 980,
  },
  entertainment: {
    name: 'Entertainment & Comedy',
    avgContentScore: 65,
    avgHookScore: 72,
    avgAccountScore: 70,
    p75ContentScore: 81,
    p75HookScore: 88,
    p75AccountScore: 85,
    postVolume: 1450,
  },
  tech: {
    name: 'Tech & Innovation',
    avgContentScore: 72,
    avgHookScore: 68,
    avgAccountScore: 75,
    p75ContentScore: 86,
    p75HookScore: 84,
    p75AccountScore: 89,
    postVolume: 650,
  },
  creator: {
    name: 'Creator & Personal Brand',
    avgContentScore: 64,
    avgHookScore: 66,
    avgAccountScore: 71,
    p75ContentScore: 79,
    p75HookScore: 81,
    p75AccountScore: 84,
    postVolume: 2100,
  },
};

const calculatePercentile = (userScore: number, avgScore: number, p75Score: number): number => {
  // Linear interpolation: 0-100 scale
  // < avg = 0-50, avg = 50, p75 = 75, > p75 = 75-100
  if (userScore < avgScore) {
    return Math.round((userScore / avgScore) * 50);
  } else if (userScore < p75Score) {
    return Math.round(50 + ((userScore - avgScore) / (p75Score - avgScore)) * 25);
  } else {
    return Math.round(75 + Math.min((userScore - p75Score) / 5, 25));
  }
};

export const benchmarkScores = (
  userScores: { contenido: number; hook: number; cuenta: number },
  niche: string = 'creator',
): BenchmarkComparison => {
  const segment = nicheSegments[niche] || nicheSegments.creator;

  const gaps = {
    contenido: userScores.contenido - segment.avgContentScore,
    hook: userScores.hook - segment.avgHookScore,
    cuenta: userScores.cuenta - segment.avgAccountScore,
  };

  const topQuartileGaps = {
    contenido: userScores.contenido - segment.p75ContentScore,
    hook: userScores.hook - segment.p75HookScore,
    cuenta: userScores.cuenta - segment.p75AccountScore,
  };

  const percentileRank = {
    contenido: calculatePercentile(userScores.contenido, segment.avgContentScore, segment.p75ContentScore),
    hook: calculatePercentile(userScores.hook, segment.avgHookScore, segment.p75HookScore),
    cuenta: calculatePercentile(userScores.cuenta, segment.avgAccountScore, segment.p75AccountScore),
  };

  const recommendations: string[] = [];

  // Content recommendations
  if (gaps.contenido < -5) {
    recommendations.push(
      `📝 Contenido ${Math.abs(Math.round(gaps.contenido))} pts bajo promedio. Refuerza estructura narrativa y densidad emocional.`,
    );
  }
  if (topQuartileGaps.contenido < 0) {
    recommendations.push(
      `📝 Para alcanzar top 25%: +${Math.abs(Math.round(topQuartileGaps.contenido))} pts. Focaliza en transformaciones y insights únicos.`,
    );
  }

  // Hook recommendations
  if (gaps.hook < -8) {
    recommendations.push(
      `🎣 Hook ${Math.abs(Math.round(gaps.hook))} pts bajo. Agrega números específicos y open loops.`,
    );
  }
  if (topQuartileGaps.hook < -5) {
    recommendations.push(
      `🎣 Para competir con top creators: +${Math.abs(Math.round(topQuartileGaps.hook))} pts. Incorpora sorpresa + urgencia.`,
    );
  }

  // Account recommendations
  if (gaps.cuenta < -5) {
    recommendations.push(
      `📊 Engagement ${Math.abs(Math.round(gaps.cuenta))} pts atrás. Aumenta frecuencia de posts y responde comentarios rápido.`,
    );
  }
  if (topQuartileGaps.cuenta < -8) {
    recommendations.push(
      `📊 Para alcanzar elite: +${Math.abs(Math.round(topQuartileGaps.cuenta))} pts. Audita audience fit y crea series de posts.`,
    );
  }

  // If above average in everything
  if (gaps.contenido >= 0 && gaps.hook >= 0 && gaps.cuenta >= 0) {
    recommendations.push(
      '✅ Estás por encima del promedio en todas categorías. Mantén ritmo y refina debilidades menores.',
    );
  }

  return {
    userScores,
    niche: segment,
    gaps,
    topQuartileGaps,
    percentileRank,
    recommendations,
  };
};

export const getAllNiches = (): NicheSegment[] => Object.values(nicheSegments);
