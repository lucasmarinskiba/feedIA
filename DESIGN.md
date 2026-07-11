# Design System: FeedIA

## 1. Visual Theme & Atmosphere

**Density:** 6/10 (Daily App Balanced) — structured data presentation with breathing room
**Variance:** 7/10 (Offset Asymmetric) — confidence without chaos, grids with intentional breakouts
**Motion:** 6/10 (Fluid CSS) — responsive feedback + elegant state transitions, no gratuitous animation

**Atmosphere:** A professional, content-focused intelligence platform. The vibe is "modern operations dashboard meets creative studio" — clinical precision in data presentation, warm tactile feedback in interactions. Users trust the interface to be responsive and intentional. Dark canvas with single indigo accent creates executive-level gravitas while remaining approachable. Spring-physics micro-interactions give the system personality without distraction.

---

## 2. Color Palette & Roles

- **Deep Canvas** (#0f0f0f) — Primary background, page base, high-contrast zone for text
- **Card Surface** (#1a1a1a) — Secondary background, component containers, visual separation
- **Charcoal Ink** (#ffffff) — Primary text, maximum legibility, critical information
- **Muted Steel** (#888888) — Secondary text, labels, metadata, helper copy
- **Whisper Border** (#333333) — Divider lines, card borders, subtle structure
- **Accent Indigo** (#6366f1) — Calls-to-action, active states, focus rings, trend indicators
- **Success Green** (#31a24c) — Positive states, success confirmations, growth indicators
- **Error Red** (#dc2626) — Destructive actions, error states, alerts
- **Warning Amber** (#f59e0b) — Warnings, caution states, attention-required indicators

**Constraints:**
- Single accent (Indigo). Saturation 68%. No neon outer glows
- No pure black (#000000) — all blacks are Deep Canvas (#0f0f0f) for retina comfort
- No gradients on text — gradient backgrounds only for decorative hero zones
- Color contrast minimum 7:1 for accessibility (WCAG AAA)

---

## 3. Typography Rules

- **Display/Headlines:** `Geist` (Sans-Serif) — 28–36px, weight 700–900, tracking tight (-0.02em)
  - Hero: 2–3 lines max. Color: Charcoal Ink (#ffffff)
  - Subheading: 16–20px, weight 600, color: Muted Steel (#888888)
- **Body:** `Geist` (Sans-Serif) — 14–18px, weight 400–500, line-height 1.6
  - Max 65 characters per line for readability
  - Color: Charcoal Ink on canvas, Muted Steel for secondary
- **Monospace:** `Geist Mono` (Monospace) — 12–14px for code, timestamps, API keys
  - Used in: Console logs, code blocks, technical metadata
  - Color: Muted Steel or Accent Indigo (for highlighted code)
- **Metadata:** 11–12px, weight 500, uppercase tracking (+0.05em), color: Muted Steel

**Banned Fonts:**
- Inter (too generic for premium creative/data context)
- Generic serifs (Times New Roman, Georgia, Garamond, Palatino)
- System fonts without clear hierarchy

---

## 4. Component Stylings

### Buttons
- **Primary (CTA):** Flat Accent Indigo fill, Charcoal text, 10px padding vertical/16px horizontal
- **Secondary (Ghost):** Border Card Surface, Charcoal text, 10px/16px padding
- **Active State:** `transform: scale(0.97)` on `:active` — tactile press feedback (160ms ease-out)
- **Hover State (desktop only):** Opacity 0.9, never transform on hover to avoid mobile false-positives
- **Focus Ring:** 3px Accent Indigo outline, 4px offset
- **Rounded:** 6–8px border-radius (never square, never 50px pill buttons)
- **Disabled State:** Opacity 0.5, cursor not-allowed

### Cards
- **Border:** 1px Whisper Border (#333333)
- **Rounded Corners:** 12px (generous, premium feel)
- **Shadow:** `0 2px 8px rgba(0,0,0,0.3)` — diffused, no harsh drop-shadow
- **Background:** Card Surface (#1a1a1a)
- **Padding:** 20px internal spacing (relaxed, not cramped)
- **Used for:** Metric cards, data breakdowns, grouped information
- **High-Density Override:** Replace with border-top divider lines instead of full cards (economy mode)

### Inputs & Forms
- **Label:** Above input, 12px Muted Steel, uppercase tracking, weight 500
- **Input Field:** 12px Geist, Charcoal text on Canvas, 1px Whisper Border
- **Padding:** 10px vertical / 12px horizontal
- **Border-Radius:** 6px
- **Focus State:** Border color → Accent Indigo, box-shadow `0 0 0 3px rgba(99,102,241,0.1)`
- **Placeholder:** Muted Steel, opacity 0.6
- **Error Message:** Below input, 12px Error Red (#dc2626), weight 500
- **Helper Text:** 11px Muted Steel, optional, below input

### Loading States (Skeleton Loaders)
- **Style:** Animated shimmer matching exact layout dimensions (not circular spinners)
- **Shimmer Gradient:** `linear-gradient(90deg, Card Surface, Whisper Border, Card Surface)` — 2s loop
- **Animation:** Perpetual, no interruption needed for perceived speed

### Empty States
- **Composition:** Illustrated, contextual visual + headline + descriptive copy + optional CTA
- **Headline:** 18–20px, weight 600, Charcoal text
- **Copy:** 14px, Muted Steel, 4–6 lines max
- **Illustration:** SVG or inline image, rounded corners, max 200px, centered or off-axis depending on layout

### Error States
- **Inline Errors:** Below field, 12px Error Red, weight 500, icon (⚠ or ✗) + text
- **Error Boxes:** Border Error Red, background rgba(220,38,38,0.1), padding 12px, border-radius 6px
- **Never:** Modal alerts for inline form errors — all errors display inline or as toasts

### Toasts / Notifications
- **Entry Animation:** Slide up from bottom, `translateY(100%)` → `translateY(0)`, 200ms ease-out
- **Exit Animation:** Fade + slide, 150ms ease-out
- **Background:** Card Surface with colored left border (4px) — green for success, red for error, amber for warning
- **Padding:** 16px
- **Duration:** 4–6 seconds (auto-dismiss), longer for errors

---

## 5. Layout Principles

### Grid System
- **Base Unit:** 8px (all spacing uses 8px multiples)
- **Container Max-Width:** 1400px (centered, with 20px padding on mobile)
- **Column Layout:**
  - Desktop (≥1024px): 12-column CSS Grid or flex with gap 16–24px
  - Tablet (768–1023px): 6-column or 2-column depending on content
  - Mobile (<768px): Single column, full-width (minus 16px padding each side)

### Spacing Strategy
- **Section Gaps (vertical):** `clamp(3rem, 8vw, 6rem)` — responsive, never fixed
- **Component Gaps (horizontal):** 16–20px between items
- **Internal Padding:** Cards 20px, containers 24px, sections 32px
- **No Overlapping:** Every element occupies its own clean spatial zone (no absolute positioning for content)

### Hero Section (Sala Ejecutiva Dashboard)
- **Layout:** Asymmetric split or left-aligned (not centered for high-variance projects)
- **Headline:** 24–32px, weight 700, Charcoal text, max 8 words / 2 lines
- **Subheading:** Optional, 14px Muted Steel
- **CTA:** Single primary button (refresh, filter, export) — no secondary "Learn More" links
- **Structure:** Header text + refresh button in flex row, staggered entry on mount

### Responsive Collapse Strategy
- **Mobile-First:** Desktop multi-column → tablet 2-column → mobile 1-column
- **No Horizontal Scroll:** Critical failure if x-overflow on mobile
- **Typography Scaling:** Headlines via `clamp(1.5rem, 5vw, 2.5rem)`, body stays ≥14px
- **Touch Targets:** All interactive elements ≥44px (tap-safe)
- **Navigation:** Desktop horizontal → mobile hamburger menu (clean, not animated)
- **Images/Inline Elements:** Stack below text on mobile, maintain aspect ratio

---

## 6. Motion & Interaction Philosophy

### Animation Engine
- **Default Spring Physics:** `{ stiffness: 100, damping: 20 }` — weighty, premium feel
- **Standard Easing:** `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out) for UI interactions
- **On-Screen Motion:** `cubic-bezier(0.77, 0, 0.175, 1)` (ease-in-out) for element movement

### Duration Targets
- **Button Feedback:** 100–160ms (instant tactile response)
- **Input Focus:** 200ms (smooth attention shift)
- **Dropdown/Modal Entry:** 200–250ms (responsive reveal)
- **Page Transitions:** 300ms max (perceived speed critical)
- **Perpetual Animation:** 2–3s loop (spinner, shimmer, pulse)

### Perpetual Micro-Interactions
- **Active Components:** Infinite loop animations on dashboard elements
  - Pulse effect on live data streams: scale 1.0 → 1.05 → 1.0 (3s loop)
  - Typewriter effect on loading text (reveal sequentially)
  - Shimmer on skeleton loaders (2s horizontal sweep)
  - Float effect on floating UI badges (gentle up/down, 4s cycle)
- **Never Block:** Perpetual animations run in background, never prevent user interaction

### Staggered Orchestration
- **List Entry:** Elements cascade in with delays
  - First item: 0ms
  - Second item: +50ms
  - Third item: +100ms
  - (Max stagger: 150ms for 4 items)
- **Choreography:** Sequential reveal creates visual rhythm, feels deliberate
- **Non-Blocking:** UI interactive immediately, animation is decorative

### Performance Rules
- **Hardware Acceleration:** Animate ONLY `transform` and `opacity`
- **GPU-Safe Properties:**
  - ✓ `transform: translateY()`, `translateX()`, `scale()`, `rotate()`
  - ✓ `opacity`
  - ✓ `filter: blur()`, `filter: brightness()`
  - ✗ Never animate `top`, `left`, `width`, `height`, `padding`, `margin`
- **CSS vs. JS:**
  - CSS animations for predetermined sequences (loaders, hover effects)
  - JavaScript (Framer Motion) for interruptible, gesture-based motion
- **Reduced Motion:** Respect `prefers-reduced-motion: reduce` — remove all transform-based motion, keep opacity/color transitions

---

## 7. Component-Specific Behaviors

### Dashboard Metric Cards
- **Entry Animation:** Stagger cascade (0ms, 50ms, 100ms, 150ms)
  - Animation: `translateY(8px), opacity: 0` → `translateY(0), opacity: 1` (400ms)
- **Hover State (desktop):** `translateY(-2px)` + shadow depth increase (200ms ease-out)
- **Touch:** No hover state on mobile (gated via media query)
- **Label:** Muted Steel, 11px, uppercase tracking
- **Value:** 32px, weight 700, Charcoal text (maximum visual prominence)
- **Trend:** 12px, Success Green for positive, Error Red for negative

### Tab Navigation
- **Active Indicator:** Background color + underline, not pill background
- **Transition:** 150ms ease-out on background + color change
- **Focus Ring:** Accessible outline on keyboard nav
- **Mobile:** Stack vertically if content is dense, horizontal scroll if space permits

### Form Fields (Browserless Settings, Engagement Config)
- **Label:** Above field, 12px Muted Steel, weight 500, uppercase
- **Input:** 14px Geist, full-width on mobile/tablet, 12px padding
- **Focus:** Accent Indigo border + subtle shadow
- **Error:** Inline below field, 12px Error Red
- **Helper Text:** Below input or beside label, 11px Muted Steel, italic

### Status Indicators
- **Live/Active:** Pulsing green circle + text label (Success Green)
- **Inactive:** Muted gray circle + text label (Muted Steel)
- **Loading:** Spinner (CSS or SVG) + "Loading..." text
- **Error:** Red circle/warning icon + error message

---

## 8. Anti-Patterns (Strictly Banned)

### Visual Anti-Patterns
- ❌ Emojis anywhere in the UI (unprofessional for executive dashboard)
- ❌ Generic serif fonts (Times New Roman, Georgia, Garamond, Palatino)
- ❌ Pure black (#000000) — use Deep Canvas (#0f0f0f) only
- ❌ Neon/outer glow shadows (`0 0 20px rgba(255,0,255,0.8)`)
- ❌ Oversaturated accents (saturation > 80%) — mute vibrant colors
- ❌ Gradient text on large headers (readable, but tacky)
- ❌ Custom mouse cursors — browser defaults only
- ❌ Purple, cyan, or neon accent colors (AI Purple is banned; use Indigo 6366f1 only)
- ❌ Overlapping elements (text on text, image on image) — every element has its own zone
- ❌ Shadows stacked to extreme depth (looks cheap, not premium)

### Layout Anti-Patterns
- ❌ 3-column equal card layouts on dashboard (replace with 2-col zig-zag or asymmetric grid)
- ❌ Centered Hero sections for high-variance projects (force asymmetric split or left-align)
- ❌ Horizontal overflow on mobile (critical failure)
- ❌ Absolute positioning for content (only for decorative overlays)
- ❌ Flexbox percentage math with calc() (use CSS Grid instead)
- ❌ `h-screen` for full-height sections (use `min-h-[100dvh]` for iOS Safari compatibility)

### Content Anti-Patterns
- ❌ Generic placeholder names ("John Doe", "Acme Corp", "Nexus")
- ❌ Fake round numbers ("99.99%", "50.0%") — use realistic metrics
- ❌ AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen", "Synergy")
- ❌ Filler UI text ("Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons)
- ❌ Broken image links — use `picsum.photos` or SVG placeholders

### Interaction Anti-Patterns
- ❌ No button press feedback (every button must have :active scale state)
- ❌ Animation on keyboard-triggered actions (100+ times/day → no animation)
- ❌ `ease-in` easing on UI elements (feels sluggish — use ease-out)
- ❌ Linear easing on UI animations (feels robotic — use ease or cubic-bezier)
- ❌ Modal confirm dialogs for every action (use inline errors, undo patterns)
- ❌ Hover states on touch devices without media query (false-positive interactions)

---

## 9. Accessibility & Performance

### Contrast & Readability
- **Text Contrast:** WCAG AAA (7:1 minimum)
  - Charcoal Ink (#ffffff) on Deep Canvas (#0f0f0f) = 21:1 ✓
  - Muted Steel (#888888) on Deep Canvas = 7.5:1 ✓
- **Focus Rings:** 3px Accent Indigo, 4px offset, always visible
- **Font Sizing:** Body text minimum 14px, never below 12px

### Motion Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- Respect user preference: remove transform-based motion, keep opacity/color changes

### Touch Safety
```css
@media (hover: hover) and (pointer: fine) {
  /* Hover effects desktop-only */
  .button:hover { transform: translateY(-2px); }
}
```
- Never hover on touch devices — gate behind media query

### Performance
- **Lazy Load Images:** Load on viewport entry via Intersection Observer
- **Code Splitting:** Separate dashboard components from settings components
- **CSS-in-JS:** Avoid runtime-generated styles — use static Tailwind or CSS modules
- **Animation Performance:** Use `will-change: transform` on perpetual elements sparingly

---

## 10. Implementation Checklist

- [ ] Apply Deep Canvas (#0f0f0f) to all page backgrounds
- [ ] Verify all text uses Geist or Geist Mono (ban Inter)
- [ ] Add :active button scale feedback (0.97) across all CTAs
- [ ] Implement focus rings (Accent Indigo, 3px) on all interactive elements
- [ ] Replace 3-column card grids with asymmetric 2-column or staggered layouts
- [ ] Add stagger animation to dashboard card entrance (0ms, 50ms, 100ms, 150ms)
- [ ] Implement hover lift on metric cards (+media query gate)
- [ ] Verify mobile collapse to single column (no horizontal scroll)
- [ ] Add motion accessibility rules (prefers-reduced-motion)
- [ ] Set up touch-safe hover gates (@media (hover: hover))
- [ ] Test contrast ratios (WCAG AAA minimum)
- [ ] Remove all neon/glow shadows, replace with diffused (0 2px 8px)
- [ ] Ban all emojis, AI clichés, generic placeholder names
- [ ] Verify spring physics on interactive elements (`stiffness: 100, damping: 20`)
- [ ] Test on real mobile devices (iOS Safari, Android Chrome)

---

## 11. Design Tokens (for Stitch Integration)

```
Colors:
  - deepCanvas: #0f0f0f
  - cardSurface: #1a1a1a
  - charcoalInk: #ffffff
  - mutedSteel: #888888
  - whisperBorder: #333333
  - accentIndigo: #6366f1
  - successGreen: #31a24c
  - errorRed: #dc2626

Typography:
  - displayFont: Geist, 700–900
  - bodyFont: Geist, 400–500
  - monoFont: Geist Mono, 400
  - lineHeightBody: 1.6

Spacing:
  - baseUnit: 8px
  - section: clamp(3rem, 8vw, 6rem)
  - component: 16–20px
  - cardPadding: 20px
  - containerPadding: 24px

Motion:
  - springPhysics: { stiffness: 100, damping: 20 }
  - easeOutUI: cubic-bezier(0.23, 1, 0.32, 1)
  - easeInOutMotion: cubic-bezier(0.77, 0, 0.175, 1)
  - durationFast: 160ms
  - durationStandard: 200ms
  - durationSlow: 300ms
```

---

**Last Updated:** 2026-07-11
**Version:** 1.0 (FeedIA Design System, Stitch-Ready)
