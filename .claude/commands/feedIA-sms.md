---
description: SMS Marketing — welcome, cart abandonment, transactional, A2P 10DLC compliance
---

SMS Marketing para FeedIA. Integra con Twilio / Klaviyo / Postscript / Attentive.

## Según $ARGUMENTS

**"welcome"** → Welcome sequence 3-5 SMS post opt-in.

**"abandoned-cart"** → Cart abandonment 3 SMS: T+15min, T+1h, T+24h.

**"post-purchase"** → Order confirmation + shipping + review request.

**"win-back"** → Re-engagement para inactivos 60+ días.

**"promo [oferta]"** → Promotional blast con compliance footer.

**"transactional [tipo]"** → OTP, password reset, alerts.

**"compliance"** → A2P 10DLC checklist + TCPA disclosures.

**"vs-email [scenario]"** → Cuándo SMS > Email vs viceversa.

## Reglas core

### Length

- **SMS**: máx 160 chars (1 segment). 161+ se parte en 2 segments → costo 2x.
- **MMS**: hasta 1600 chars + image. Costo ~5x SMS.

### Cadence

- Welcome: 3 msgs en 7 días
- Promo: 4-8 por mes max
- Abandoned cart: 3 msgs en 48h
- NUNCA > 1 SMS/día (high opt-out)

### Send times

- L-V 10am-8pm hora local
- Sábado 11am-6pm
- NUNCA domingos, holidays, antes 9am, después 9pm

### Compliance USA (A2P 10DLC)

- Brand registration con Campaign Registry
- Use case approval (marketing/transactional/2FA)
- TCPA: opt-in explícito + opt-out fácil ("STOP")
- Always include: "Msg & data rates may apply. Reply STOP to unsubscribe."

### Compliance LATAM

- Argentina: ENACOM consent (opt-in checkbox)
- México: PROFECO opt-out
- Brasil: LGPD consent

## Templates

### Welcome (1 of 3)

```
Hola {firstName}! Sos parte de {brand}. Acá vas a recibir ofertas exclusivas + tips. Mensajes recurrentes. STOP para salir.
```

(140 chars, deja margen)

### Abandoned cart (T+15min)

```
{firstName}, dejaste algo en tu carrito 🛒
{product} te espera con 10% off solo hoy.
{shortlink}
```

### Promo

```
24h FLASH SALE ⚡
30% off TODO con código FLASH30.
Solo hoy en {shortlink}
STOP=salir
```

### Win-back

```
{firstName}, te extrañamos.
20% off para que vuelvas. Code: WELCOMEBACK
{shortlink}
```

## Stack recomendado

| Provider        | Mejor para               | Pricing             |
| --------------- | ------------------------ | ------------------- |
| **Twilio**      | Custom, máx control      | $0.0075/SMS USA     |
| **Klaviyo SMS** | Ecommerce, integra email | $0.015/SMS + $20/mo |
| **Postscript**  | Shopify ecommerce        | $25/mo + $0.015/SMS |
| **Attentive**   | Enterprise ecommerce     | custom              |

## ROI benchmarks

- Open rate SMS: **98%** (vs email 20-30%)
- CTR: 19% (vs email 2-3%)
- ROI: $71 por $1 gastado (top performer)
- Opt-out promedio: 2-3% (mantener < 5%)
- Conversion lift en abandoned cart: 25-35%

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **redactor de SMS/notificaciones de alta apertura**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
