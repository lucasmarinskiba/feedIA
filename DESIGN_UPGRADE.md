# Design System: FeedIA — Premium Content Automation Platform

## 1. Visual Theme & Atmosphere

**Density:** 6/10 (Daily App Balanced — data-rich dashboard with generous whitespace)  
**Variance:** 7/10 (Offset Asymmetric — navigation splits left, content expands right)  
**Motion:** 6/10 (Fluid CSS — spring-physics micro-interactions, perpetual pulse on metrics, staggered reveals)

A clinical yet warm interface — like a well-lit creative studio. Dark, professional substrate with single warm accent. No neon, no gradients. Typography leads hierarchy, motion is purposeful, spacing breathes.

---

## 2. Color Palette & Roles

- **Deep Canvas** (#0f0f0f) — Primary background; sidebar, main fill. Off-black.
- **Elevated Surface** (#1a1a1a) — Cards, panels, containers.
- **Tertiary Surface** (#242424) — Hover states, nested containers.
- **Border Whisper** (rgba(255,255,255,0.08)) — Structural dividers, card edges.
- **Border Focus** (rgba(255,255,255,0.16)) — Interactive borders, focus states.
- **Text Ink** (#f5f5f5) — Primary typography. WCAG AAA contrast.
- **Text Secondary** (#a8a8a8) — Descriptions, metadata. 4.5:1 ratio.
- **Text Tertiary** (#6e6e6e) — Disabled states, muted.
- **Accent Warm** (#d4af37) — Single accent for CTAs, focus rings. Soft gold, ~70% saturation.
- **Status OK** (#31a24c) — Success, positive trends.
- **Status Warn** (#f59e0b) — Alerts, cautions.
- **Status Crit** (#dc2626) — Errors, emergencies.
- **Status Info** (#3b82f6) — Informational, secondary.

---

## 3. Typography Rules

- **Display/Headline:** Geist (600–700 weight), 24–36px, track-tight, Text Ink
- **Body:** Geist (400–500 weight), 14–16px, leading 1.5–1.6, max-width 65ch
- **Mono:** Geist Mono (400 weight), 12–14px, for metrics & metadata
- **Banned:** Inter (generic), serif in dashboards, custom fonts without fallback

---

## 4. Component Stylings

### Buttons
- **Primary:** Flat fill #d4af37, text #0f0f0f, radius 6px, padding 10/16px
- **Active:** Scale(0.97), transform 160ms cubic-bezier(0.23, 1, 0.32, 1)
- **No outer glow, no lift**

### Cards
- **Container:** #1a1a1a bg, 1px Border Whisper, radius 12px, padding 20px
- **Shadow:** `0 4px 16px rgba(0,0,0,0.4)` (diffused, tinted)
- **Hover:** Translate(-2px), shadow `0 8px 24px rgba(0,0,0,0.6)` (desktop only)

### Inputs
- **Field:** #0f0f0f bg, 1px Border Whisper, radius 6px, padding 8/12px
- **Focus:** Border Focus, ring 2px #d4af37 offset 2px
- **Label:** Above input, weight 600, Text Ink

### Loading States
- **Skeletal:** Shimmer via linear-gradient(90deg, #242424, #1a1a1a, #242424), 2s infinite
- **No spinners**

---

## 5. Layout Principles

- **Grid-First:** CSS Grid for major layouts
- **Sidebar:** Fixed 240px (70px on mobile < 576px)
- **No Absolute Positioning:** Clean spatial zones only
- **Max-width:** 1400px for main content
- **Spacing:** 4px base unit (8, 12, 16, 20, 24, 32, 40px)
- **Mobile < 768px:** Single column strict, no horizontal scroll
- **Touch Targets:** Minimum 44×44px (WCAG AAA)

---

## 6. Motion & Interaction

### Spring Physics
- **Default:** Stiffness 100, damping 20 (Framer Motion equivalent)
- **Applied to:** Buttons, focus transitions, list reveals, metrics

### Perpetual Micro-Interactions
- **Metric Pulse:** 1 → 1.02 → 1 over 3s easeInOut
- **Live Indicators:** Scale 1 → 1.2 → 1 over 2s infinite
- **Shimmer:** 2s infinite linear

### Staggered Cascades
- **List Items:** opacity 0→1, translateY(8px)→0, 400ms, ease-out
- **Delays:** First 0ms, +100ms per item
- **Tab Transitions:** translateX(...) 150ms ease-out

### Hardware-Accelerated
- **Animate Only:** transform + opacity
- **Never:** top, left, width, height
- **Easing:** No linear. ease-out (enters), ease-in-out (transitions)

---

## 7. Anti-Patterns (Banned)

✗ No emojis  
✗ No Inter font  
✗ No pure black (#000000)  
✗ No neon glows  
✗ No gradients  
✗ No centered Hero layouts  
✗ No 3-column equal cards  
✗ No spinners (skeletal loaders only)  
✗ No overlapping elements  
✗ No generic names  
✗ No AI copy ("Elevate", "Seamless", etc.)  

---

## 8. Accessibility

- **Contrast:** Text Ink #f5f5f5 on Deep Canvas #0f0f0f = 18:1
- **Focus:** Ring 2px #d4af37, offset 2px, on all interactive elements
- **Motion:** Respect `prefers-reduced-motion` media query
- **Color Alone:** Never communicate state via color only (use icon + text + color)

---

## 9. Implementation

- CSS variables: --deep-canvas, --text-ink, --accent-warm, etc.
- Font: Geist + Geist Mono from Google Fonts or system fallback
- Animation: Framer Motion (React) or CSS @keyframes for springs
- Test: Validate contrast (WebAIM), touch targets, real devices
