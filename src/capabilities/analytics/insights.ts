import { fetchPostInsights, fetchAccountInsights } from '../../integrations/insightsApi.js';
import type { PostInsights, AccountInsights } from '../../integrations/insightsApi.js';

export interface PerformanceSnapshot {
  ventana: { desde: string; hasta: string };
  cuenta: AccountInsights | null;
  posts: PostInsights[];
  benchmarks: {
    savesProm: number;
    sharesProm: number;
    likesProm: number;
    commentsProm: number;
    completionProm: number;
  };
  topPerformers: PostInsights[];
  bajoRendimiento: PostInsights[];
}

const safeAvg = (values: number[]): number => {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  return valid.reduce((acc, v) => acc + v, 0) / valid.length;
};

export const buildSnapshot = async (desdeIso: string, hastaIso?: string): Promise<PerformanceSnapshot> => {
  const [posts, cuenta] = await Promise.all([
    fetchPostInsights(desdeIso, hastaIso),
    fetchAccountInsights(desdeIso, hastaIso),
  ]);
  const benchmarks = {
    savesProm: safeAvg(posts.map((p) => p.metrics.saves)),
    sharesProm: safeAvg(posts.map((p) => p.metrics.shares)),
    likesProm: safeAvg(posts.map((p) => p.metrics.likes)),
    commentsProm: safeAvg(posts.map((p) => p.metrics.comments)),
    completionProm: safeAvg(posts.map((p) => p.metrics.completionRate ?? 0).filter((v) => v > 0)),
  };
  const score = (p: PostInsights): number => p.metrics.saves * 3 + p.metrics.shares * 4 + p.metrics.comments * 1.5;
  const sorted = [...posts].sort((a, b) => score(b) - score(a));
  const topPerformers = sorted.slice(0, Math.min(5, sorted.length));
  const bajoRendimiento = sorted.slice(-Math.min(3, sorted.length)).reverse();
  return {
    ventana: { desde: desdeIso, hasta: hastaIso ?? new Date().toISOString() },
    cuenta,
    posts,
    benchmarks,
    topPerformers,
    bajoRendimiento,
  };
};

export const detectAnomalies = (snapshot: PerformanceSnapshot): string[] => {
  const alertas: string[] = [];
  const { benchmarks } = snapshot;
  if (snapshot.cuenta) {
    if (snapshot.cuenta.followersDelta < 0) {
      alertas.push(`Pérdida neta de ${Math.abs(snapshot.cuenta.followersDelta)} seguidores en la ventana.`);
    }
    if (snapshot.cuenta.followers > 0) {
      const tasa = snapshot.cuenta.reach / snapshot.cuenta.followers;
      if (tasa < 0.15) {
        alertas.push(`Reach/followers = ${(tasa * 100).toFixed(1)}% (sub-óptimo, esperado >25%).`);
      }
    }
  }
  for (const p of snapshot.bajoRendimiento) {
    const score = p.metrics.saves + p.metrics.shares;
    const benchScore = benchmarks.savesProm + benchmarks.sharesProm;
    if (benchScore > 0 && score < benchScore * 0.4) {
      alertas.push(`Post ${p.postId} (${p.format}) cayó >60% bajo benchmark.`);
    }
  }
  return alertas;
};
