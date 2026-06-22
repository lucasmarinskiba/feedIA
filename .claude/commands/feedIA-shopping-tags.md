---
description: Shopping Tags — IG Shopping integration para ecommerce con product tags
---

Shopping Tags = tag de productos en posts/reels/stories → click → checkout in-app o web.

## Según $ARGUMENTS

**"setup-catalog"** → Setup Meta Commerce Manager + catálogo productos.

**"tag-strategy"** → Cuándo y cómo taggear (max 5 por post, regla del 80/20).

**"post-types"** → Tipos de posts que mejor convierten con shopping tags.

**"reels-shopping"** → Reels con product tags strategy.

**"shop-tab-optimize"** → Optimizar Shop tab del perfil.

**"audit [account]"** → Score current shopping setup + improvements.

## Setup checklist

1. ✅ Cuenta IG Business o Creator
2. ✅ Página Facebook vinculada
3. ✅ Catálogo Meta Commerce Manager
4. ✅ Aprobado Instagram Shopping (review 1-3 días)
5. ✅ Política de envíos + devoluciones publicadas
6. ✅ Producto en stock con imagen HD + descripción + precio

## Regla 80/20 de tags

- **80% posts**: contenido SIN tags (educación, comunidad, entretenimiento)
- **20% posts**: contenido CON tags (productos en uso, lifestyle, launches)

Saturar con tags → audiencia percibe spam → unfollows.

## Post types que mejor convierten

### 1. Carrusel "Cómo uso este producto" (CTR 4-6%)

Slide 1: problema. Slides 2-7: solución usando producto. Slide 8: tag + CTA.

### 2. Reel "Get ready with me" (CTR 3-5%)

Producto integrado naturalmente en rutina. Tag al final.

### 3. Story con poll + product tag (CTR 8-12%)

"¿Cuál te gusta más?" + 2 productos tagged.

### 4. Before/After (CTR 5-7%)

Antes producto / después producto. Tag visible.

### 5. UGC repost con tag (CTR 6-9%)

Reposteás cliente usando producto + tag → social proof + venta.

## Tagging best practices

- ✅ Tag visible en el producto (no en fondo)
- ✅ Solo productos que ESTÁN en la imagen (Meta penaliza tags fake)
- ✅ Max 5 tags por post (max 20 para carrusel)
- ✅ Stories: 1 tag por frame
- ✅ Reels: tag aparece al final del reel

## Métricas Shopping

| Métrica                  | Benchmark IG Shopping |
| ------------------------ | --------------------- |
| Tap rate (tag → product) | 5-12%                 |
| Add to cart              | 8-15% de taps         |
| Checkout completion      | 25-40% de carts       |
| AOV                      | varía por industria   |
| ROAS shopping ads        | 2-5x                  |

## Shop tab del perfil

- **Featured collection** — destacar 4-8 productos hero
- **Auto-curated** — IG muestra productos basados en tags recientes
- **Sale tag** — productos con descuento aparecen primero
- **Stories highlights "Shop"** — tutoriales + reviews

## Anti-patterns

- ❌ Tag todos los posts → spam percibido
- ❌ Tag productos no relevantes a la imagen
- ❌ Solo product shots → falta storytelling
- ❌ Sin UGC → falta social proof
- ❌ Catálogo desactualizado (sin stock) → tags muertos

## Integración

`POST /api/me/shopping/tag { postId, productIds[], positions[] }` — agrega tags vía Meta API.
Conecta con `metaAds.ts` para boost de posts con shopping tags (catalog ads).

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **experto en shopping tags y catálogo IG**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
