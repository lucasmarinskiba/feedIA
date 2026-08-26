/**
 * Normaliza nombres de env vars que el código lee bajo un nombre distinto al
 * que realmente está cargado en Railway/Vercel. Las keys son válidas — sólo
 * están bajo el nombre equivocado, así que el feature cae a mock para
 * siempre sin este alias. Ver memoria `credential-sources-map`.
 *
 * DEBE ser el primer import de cualquier entry point (server.ts, workers/index.ts)
 * — los módulos que leen `process.env.X` a nivel de módulo (top-level const)
 * lo hacen al ser importados, así que el alias tiene que aplicarse antes de
 * que ese import se resuelva.
 */

const alias = (from: string, to: string): void => {
  if (!process.env[to] && process.env[from]) {
    process.env[to] = process.env[from];
  }
};

// ElevenLabs: guardado como ELEVEN_LABS_API_KEY, leído como ELEVENLABS_API_KEY.
alias('ELEVEN_LABS_API_KEY', 'ELEVENLABS_API_KEY');

// FAL: guardado como FAL_API_KEY, leído como FAL_KEY (y algunos sitios como FAL_AI_API_KEY).
alias('FAL_API_KEY', 'FAL_KEY');
alias('FAL_API_KEY', 'FAL_AI_API_KEY');
alias('FAL_KEY', 'FAL_AI_API_KEY');

// Instagram: guardado en Vercel como IG_CLIENT_ID/SECRET, leído acá como
// INSTAGRAM_APP_ID/SECRET. Best-effort — si nunca se copió a Railway con
// ningún nombre, esto no alcanza; hace falta cargar el valor real (Meta for
// Developers) en Railway bajo INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET.
alias('IG_CLIENT_ID', 'INSTAGRAM_APP_ID');
alias('IG_CLIENT_SECRET', 'INSTAGRAM_APP_SECRET');
