/**
 * Simulación de alcance por bootstrap sobre los posts reales de la cuenta.
 *
 * Remuestrea con reemplazo el alcance histórico de la cuenta. No predice el post concreto:
 * describe qué tan probable es que una publicación de esta cuenta supere cierto múltiplo
 * de su alcance mediano. Sin al menos MIN_POSTS con alcance real no simula: un número
 * inventado es peor que no tener número.
 */

const MIN_POSTS = 5;
const TRIALS_MIN = 100;
const TRIALS_MAX = 1000;
const UMBRAL_SHIP = 0.2;

const percentil = (ordenados, p) => ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * p))];

export const simularAlcanceReal = ({ metrics = [], trials = 500 } = {}) => {
  const alcances = metrics.map((m) => Number(m?.reach)).filter((r) => Number.isFinite(r) && r > 0);
  if (alcances.length < MIN_POSTS) {
    return {
      available: false,
      trials: 0,
      basedOnPosts: alcances.length,
      reason: `Hacen falta al menos ${MIN_POSTS} posts con alcance real (hay ${alcances.length}).`,
    };
  }

  const mediana = percentil(
    [...alcances].sort((a, b) => a - b),
    0.5,
  );
  const n = Math.max(TRIALS_MIN, Math.min(Number(trials) || 500, TRIALS_MAX));
  const simulados = Array.from({ length: n }, () => alcances[Math.floor(Math.random() * alcances.length)]).sort(
    (a, b) => a - b,
  );
  const sobre = (umbral) => simulados.filter((r) => r >= umbral).length / n;
  const probExito = sobre(mediana * 1.5);

  return {
    available: true,
    trials: n,
    basedOnPosts: alcances.length,
    baseline: mediana,
    distribution: {
      p10: percentil(simulados, 0.1),
      p50: percentil(simulados, 0.5),
      p90: percentil(simulados, 0.9),
      mean: Math.round(simulados.reduce((s, r) => s + r, 0) / n),
    },
    successProbability: Number(probExito.toFixed(3)),
    blackSwanProbability: Number(sobre(mediana * 4).toFixed(3)),
    recommendation: probExito >= UMBRAL_SHIP ? 'ship' : 'mejorá el hook antes de publicar',
  };
};
