# Video + Audio Engine — Guía operativa

El motor de video/audio produce Reels/TikTok con IA y los prepara para publicación.

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `src/capabilities/videoEngine/videoProducer.ts` | Elige proveedor (Runway/HeyGen/mock), controla presupuesto y genera video. |
| `src/capabilities/videoEngine/pricing.ts` | Tabla de costos estimados por proveedor. |
| `src/capabilities/videoEngine/usageTracker.ts` | Persiste cada generación en `data/runtime/videoUsage.json`. |
| `src/capabilities/videoEngine/audioVideoMixer.ts` | Une pista de audio con video (cloud → FFmpeg → fallback). |
| `src/capabilities/audioEngine/audioMixer.ts` | Mezcla voiceover + música + SFX (cloud → FFmpeg → proxy). |
| `src/capabilities/audioEngine/tts.ts` | Genera voz (ElevenLabs → fallback mock). |
| `src/capabilities/audioEngine/musicLibrary.ts` | Recomienda música según mood/contenido. |
| `src/capabilities/audioEngine/sfx.ts` | Efectos de sonido (ElevenLabs/mock). |

## Variables de entorno

```bash
# Video IA
RUNWAY_API_KEY=
HEYGEN_API_KEY=

# Audio
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
MUSIC_PROVIDER=none           # licensed | epidemic | artlist | none
MUSIC_PROVIDER_API_URL=
MUSIC_PROVIDER_API_KEY=

# Mezcla de audio real (voiceover + música + SFX)
AUDIO_MIXER_URL=
AUDIO_MIXER_API_KEY=

# Mux audio+video real
AUDIO_VIDEO_MUX_URL=
AUDIO_VIDEO_MUX_API_KEY=

# Modo
DRY_RUN=true
```

## Selección de proveedor por estilo

| `videoStyle` | Proveedor | Cuándo usar |
|---|---|---|
| `avatar` | HeyGen | Presentador humano virtual. |
| `broll` | Runway | Videos con B-roll cinematográfico. |
| `mixed` | Runway | Estilo trending/tiktok. |
| `motion` | Runway | Motion graphics (prompt específico). |

Se configura desde `BriefRequest.videoStyle` y llega a `VideoEngineConfig.style`.

## Cost tracking

Cada generación se guarda en `data/runtime/videoUsage.json`:

```json
{
  "id": "...",
  "provider": "runway",
  "format": "reel",
  "durationSec": 15,
  "costEstimateUsd": 1.2,
  "topic": "...",
  "brandName": "...",
  "style": "broll",
  "success": true,
  "createdAt": "2026-06-10T..."
}
```

Funciones disponibles:
- `recordVideoUsage(record)`
- `getVideoUsage({ provider, brandName, since })`
- `getTotalVideoCostUsd({ brandName, since })`

## Estrategia de mezcla

### Audio
1. Si `AUDIO_MIXER_URL` está configurado → mezcla cloud con ducking y loudnorm.
2. Si FFmpeg está instalado → mezcla local (`amix` + `loudnorm`).
3. Fallback → devuelve voiceover o música sola.

### Audio + Video
1. Si `AUDIO_VIDEO_MUX_URL` está configurado → mux cloud.
2. Si FFmpeg está instalado → `ffmpeg -i video -i audio -c:v copy -shortest`.
3. Fallback → error, el pipeline publica video sin audio mezclado.

## SFX

`generateAudioForVideo` acepta `sfx?: string[]`. Si no se pasan, usa `['pop']`.
Los nombres válidos están en `src/capabilities/audioEngine/sfx.ts`:
`pop`, `whoosh`, `notification`, `like`, `transition`, `success`, `error`.

## Tests y scripts

```bash
# Fase 3 end-to-end en DRY_RUN
npx tsx scripts/test-fase3-audio-video.ts

# Tests formales (cuando Vitest esté disponible)
npx vitest tests/capabilities/videoEngine/usageTracker.test.ts
npx vitest tests/capabilities/audioEngine/audioMixer.test.ts
```

## Notas

- FFmpeg no es obligatorio; sin él se usa proxy o mock.
- Runway Gen-2/Gen-3 limita duración a 5s o 10s; el motor adapta el request.
- HeyGen es más costoso por minuto; útil para `avatar`.
