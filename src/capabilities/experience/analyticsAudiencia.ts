/**
 * Audiencia de Instagram (follower_demographics de la Graph API). Meta no publica el desglose
 * hasta que la cuenta tiene suficientes seguidores; en ese caso se devuelve disponible:false
 * con el motivo, nunca un porcentaje inventado.
 */

import { log } from '../../agent/logger.js';
import { metaFetch } from '../../integrations/metaApiClient.js';
import { getConnection, isExpired } from '../../integrations/oauthConnections.js';
import { parsearDesgloseMeta, type DistribucionItem, type RespuestaDesgloseMeta } from './analyticsMetricas.js';

export interface AudienciaInstagram {
  disponible: boolean;
  motivo: string | null;
  edad: DistribucionItem[];
  genero: DistribucionItem[];
  ciudades: DistribucionItem[];
  paises: DistribucionItem[];
}

const TTL_MS = 6 * 3_600_000;
const cache = new Map<string, { at: number; valor: AudienciaInstagram }>();

const ETIQUETAS_GENERO: Record<string, string> = { F: 'Mujeres', M: 'Hombres', U: 'Sin especificar' };

const sinDatos = (motivo: string): AudienciaInstagram => ({
  disponible: false,
  motivo,
  edad: [],
  genero: [],
  ciudades: [],
  paises: [],
});

const leerDesglose = async (igId: string, token: string, breakdown: string): Promise<RespuestaDesgloseMeta | null> => {
  try {
    const res = await metaFetch(
      `https://graph.instagram.com/v18.0/${igId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=${breakdown}&access_token=${token}`,
      {},
      { description: `IG audiencia por ${breakdown}`, maxAttempts: 2 },
    );
    return (await res.json()) as RespuestaDesgloseMeta;
  } catch (err) {
    log.warn('[AnalyticsAudiencia] desglose de audiencia no disponible', { breakdown, error: String(err) });
    return null;
  }
};

export const leerAudienciaInstagram = async (brandId: string): Promise<AudienciaInstagram> => {
  const conn = await getConnection(brandId, 'instagram');
  const igId = String(conn?.metadata?.igBusinessId ?? '');
  if (!conn || !conn.accessToken || !igId || isExpired(conn)) {
    return sinDatos('Conectá Instagram para ver la audiencia.');
  }
  const clave = `${brandId}:${igId}`;
  const previo = cache.get(clave);
  if (previo && Date.now() - previo.at < TTL_MS) return previo.valor;

  const token = conn.accessToken;
  const [edad, genero, ciudades, paises] = await Promise.all(
    ['age', 'gender', 'city', 'country'].map((b) => leerDesglose(igId, token, b)),
  );
  const valor: AudienciaInstagram = {
    disponible: false,
    motivo: null,
    edad: parsearDesgloseMeta(edad),
    genero: parsearDesgloseMeta(genero, ETIQUETAS_GENERO),
    ciudades: parsearDesgloseMeta(ciudades),
    paises: parsearDesgloseMeta(paises),
  };
  valor.disponible = [valor.edad, valor.genero, valor.ciudades, valor.paises].some((l) => l.length > 0);
  if (!valor.disponible) {
    return { ...valor, motivo: 'Meta todavía no publica datos demográficos de tu audiencia para esta cuenta.' };
  }
  cache.set(clave, { at: Date.now(), valor });
  return valor;
};
