---
description: >
  Generador de Foto / Photo Mode de TikTok (carrusel de imágenes nativo de TikTok).
  Distinto al carrusel de Instagram: razonamiento y formato propios de TikTok —
  swipe-driven, sonido obligatorio, primera foto = hook brutal, texto sobre foto,
  ritmo de revelación slide a slide para retención. Usá cuando se pida "foto tiktok",
  "photo mode", "carrusel de tiktok", "post de fotos tiktok", o desde Studio TikTok →
  Foto. Funciona por voz, prompt, Autopilot o sugerencia.
---

# FeedIA · Foto TikTok (Photo Mode)

El **Photo Mode** de TikTok ≠ carrusel de Instagram. Acá manda el swipe + el sonido +
la curiosidad por avanzar. Esta skill razona y produce con formato propio de TikTok.

> Para producir las imágenes usá `/feedIA-canva` (IA-render 9:16 o Canva-CU).
> Branding: `/feedIA-tiktok-branding`. Alcance: `/feedIA-tiktok-algorithm`.

## TIKTOK PHOTO ≠ IG CARRUSEL

|          | IG Carrusel                 | TikTok Photo                                        |
| -------- | --------------------------- | --------------------------------------------------- |
| Ratio    | 4:5 (1080×1350)             | **9:16 (1080×1920)** vertical                       |
| Densidad | alta, magazine, mucho texto | baja, **1 idea por foto**, texto corto sobre imagen |
| Sonido   | opcional                    | **obligatorio** (trending = empuje FYP)             |
| Motor    | saves                       | **swipe completion + replays + shares**             |
| Foto 1   | portada-título              | **hook brutal** que obliga a deslizar               |
| Estética | pulida                      | nativa, real, alto contraste                        |
| Cierre   | CTA slide                   | última foto = punch + loop a la 1ª                  |

## RAZONAMIENTO TIKTOK PHOTO

- Foto 1 = el hook (los mismos 0-2s del video). Si no engancha, no deslizan.
- Cada foto revela UNA cosa nueva → curiosidad por la siguiente (open loop visual).
- Texto sobre foto: corto, grande, legible. No párrafos.
- 5-8 fotos (más corto que IG; el swipe se abandona rápido).
- Última foto: remate + invita a volver (replay) o comentar.
- Sonido trending elegido para el mood.

## ESTRUCTURA (6-8 fotos)

1. **Foto 1 — HOOK** (número/contradicción/POV) texto grande sobre imagen impactante.
2. **2-3 — tensión/contexto** una idea c/u, revelación progresiva.
3. **4-6 — valor/desarrollo** el contenido, punch visual por foto.
4. **Última — remate + CTA/loop** (comentá / seguí / volvé a la 1ª).

## $ARGUMENTS

| Arg               | Acción                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `[tema/idea/URL]` | photo set completo (estructura + textos + prompts 9:16 + sonido) |
| `5\|6\|7\|8`      | cantidad de fotos                                                |
| `render`          | produce imágenes vía /feedIA-canva (IA o Canva-CU)               |
| `sonido`          | sugiere trending sounds para el mood                             |

## OUTPUT

```
## Estrategia (modo · hook · sonido sugerido)
## Foto 1 (HOOK): texto sobre imagen + prompt visual 9:16
## Fotos 2..N: idea + texto corto + prompt visual 9:16
## Foto final: remate + CTA/loop
## Caption corto + hashtags (nicho+amplio+trend)
```

## ANTI-PATRONES

Reusar carrusel IG 4:5 tal cual · texto largo tipo IG · sin sonido · foto 1 sin hook ·
+8 fotos · estética sobreproducida · sin loop/CTA final.

## HERMANAS

`/feedIA-tiktok` · `/feedIA-tiktok-hooks` · `/feedIA-canva` (render) ·
`/feedIA-canvas-design` · `/feedIA-tiktok-branding` · `/feedIA-publish`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **especialista en Photo Mode TikTok (9:16, swipe, sonido)**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
