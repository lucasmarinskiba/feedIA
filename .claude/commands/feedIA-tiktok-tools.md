---
description: >
  Acceso y dominio (vía Computer Use) de las herramientas de creación/edición de video
  e imagen para TikTok: CapCut, Canva, editor nativo de TikTok, y generadores de video
  IA (Seedance, Sora, Pika, Kling, Runway) e imagen (Nano Banana, gpt-image-2, Flux).
  FeedIA elige la herramienta correcta, la abre y la opera. Usá cuando se pida "abrí
  CapCut", "generá el video con Sora/Pika/Seedance", "imagen con Nano Banana", "montá
  en Canva", "editar en TikTok", o desde Studio TikTok Video. Requiere CUA Auto/Asistente
  para operar apps; los generadores IA via API si hay key.
---

# FeedIA · Herramientas TikTok (CapCut/Sora/Pika/Nano Banana/…)

Mapa de herramientas que FeedIA domina para producir video/imagen TikTok. Elige según
la tarea, abre vía Computer Use (`/feedIA-cu-brain`) o llama API si está conectada.

## EDICIÓN / MONTAJE (vía Computer Use)

| Herramienta              | Uso                                                                    | Cómo                                       |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------ |
| **CapCut**               | montaje, subtítulos auto, cortes, beat-sync, export limpio 9:16        | CU abre y opera (`/feedIA-tiktok-editing`) |
| **Canva**                | cover, intro/outro, overlays de marca                                  | CU o Canva API (`/feedIA-canva`)           |
| **Editor nativo TikTok** | publicar + sonido trending + stickers + texto in-app (señales nativas) | CU                                         |

## GENERACIÓN DE VIDEO IA

| Modelo             | Fuerte en                               | Acceso                   |
| ------------------ | --------------------------------------- | ------------------------ |
| **Sora**           | escenas realistas, físicas, narrativa   | API/web (CU)             |
| **Seedance**       | movimiento/baile, clips dinámicos       | API/web (CU)             |
| **Pika**           | efectos, transformaciones, motion brush | API/web (CU)             |
| **Kling / Runway** | b-roll cinemático, image-to-video       | `/feedIA-video` / fal.ai |

## GENERACIÓN DE IMAGEN (frames/cover/Foto TikTok)

| Modelo                          | Fuerte en                      | Acceso                   |
| ------------------------------- | ------------------------------ | ------------------------ |
| **Nano Banana** (nano-banana-2) | texto nativo en imagen, rápido | fal.ai (`/api/skills/*`) |
| **gpt-image-2**                 | calidad alta, render de texto  | fal.ai                   |
| **Flux**                        | estilo/estética                | fal.ai (`/feedIA-image`) |

## CÓMO ELIGE FeedIA

- Texto sobre imagen / Foto TikTok → Nano Banana o gpt-image-2.
- Clip generado IA → Sora/Seedance/Pika según mood (realista/movimiento/efecto).
- Montaje final + subtítulos → CapCut (CU).
- Cover/branding → Canva.
- Publicar → editor nativo TikTok (CU) para señales nativas.

## $ARGUMENTS

| Arg                                             | Acción                                |
| ----------------------------------------------- | ------------------------------------- |
| `capcut` / `canva` / `tiktok`                   | abre la app vía CU                    |
| `sora` / `seedance` / `pika` / `kling` [prompt] | genera clip IA                        |
| `nano-banana` / `gpt-image` [prompt]            | genera imagen 9:16                    |
| `auto [tarea]`                                  | FeedIA elige la herramienta y ejecuta |

## REGLAS

Export limpio sin watermark · sonido dentro de TikTok cuando se pueda · 9:16 ·
requiere CUA Auto/Asistente para operar apps; APIs si hay key. Sin key/CU → da el plan.

## HERMANAS

`/feedIA-tiktok-editing` · `/feedIA-cu-brain` · `/feedIA-video` · `/feedIA-image` ·
`/feedIA-canva` · `/feedIA-tiktok` · `/feedIA-tiktok-agents`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **operador de herramientas de video/imagen TikTok**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
