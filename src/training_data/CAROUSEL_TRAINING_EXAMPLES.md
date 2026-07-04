# Carousel Training Examples - Real User Content

**5 carousel examples extracted from "The Good Fud" brand. FeedIA learns from these patterns.**

---

## EXAMPLE 1: "The Good Fud - Fibre Importance"

**SLIDE 1 (Hook):**
- Text: "Why is it important?"
- Subtext: "Adequate fibre supports: Better digestion, stable energy, fewer cravings and a healthier gut."
- Visual: Cream background, serif headline, dark text, left border accent (dark green)
- Color: Cream (#F5EEE0), Dark green accent (#2D5016)
- Typography: Serif headline (28px), body 14px, left align with accent bar
- Design pattern: Clean editorial, text-heavy, authoritative

**SLIDE 2 (Problem Setup):**
- Text: "Low fibre intake can cause:"
- Subtext: "Constipation, blood sugar spikes, poor gut health and higher metabolic risk."
- Visual: Same cream background, 2 bullet points
- Color: Same palette
- Typography: Same (28px headline, 14px body)
- Design pattern: Problem framing, consequence-driven

**SLIDE 3 (Education - Type A):**
- Text: "Soluble Fibre"
- Visual: 6 ingredient images (avocado, orange, sweet potato, seeds, leafy greens, cauliflower) arranged on left
- Bullets: "Slows down digestion", "Helps regulate blood sugar levels", "Helps manage cholesterol", "Feeds beneficial gut bacteria"
- Color: Cream background, ingredients in natural colors
- Typography: Red accent text (#C65911) for benefits
- Design pattern: Visual-heavy education, ingredient showcase

**SLIDE 4 (Education - Type B):**
- Text: "Insoluble Fibre"
- Visual: 6 ingredient images (cucumber, corn, rice, kale, nuts, cauliflower)
- Bullets: "Adds bulk to stool", "Supports regular bowel movements", "Helps move food through the digestive system", "Supports overall colon health"
- Color: Same cream, natural ingredient colors
- Typography: Same as Slide 3
- Design pattern: Parallel structure, educational consistency

**SLIDE 5 (CTA):**
- Text: "Fibre - The most ignored Nutrient"
- Visual: Large bowl of beans/legumes (visual anchor)
- Tagline: "The most ignored Nutrient"
- Color: Cream, beans add warm browns/reds
- Typography: Large serif headline (36px), centered
- Design pattern: Emotional hook, problem statement, call-to-emotion

**NARRATIVE ARC:**
1. Hook → Problem (Why + Consequence)
2. Solution Part A (Type 1 benefits + visuals)
3. Solution Part B (Type 2 benefits + visuals)
4. Emotional anchor (Problem statement drives action)

**PSYCHOLOGY TRIGGERS:**
- Consequence-driven (negative consequences motivate change)
- Visual proof (real ingredients build credibility)
- Parallel structure (two types taught side-by-side, retention boost)
- Emotional hook final slide (problem statement sticks in memory)

**ENGAGEMENT FACTORS:**
- Educational but accessible (technical terms + plain language)
- Color consistency (cream background unifies, doesn't distract)
- Visual variety (text → visuals → text, maintains engagement)
- No CTAs until final slide (focus on education, then convert)

---

## LEARNING PATTERNS

### Pattern 1: Problem-Solution-Problem Cycle
Slides 1-2: Present problem + consequences
Slides 3-4: Provide solution (two approaches)
Slide 5: Circle back to emotional problem statement

### Pattern 2: Visual Parallelism
Slide 3 structure = Slide 4 structure
- Same layout (left images, right text)
- Same bullet count (4 bullets each)
- Same typography, spacing, accent colors
- User's brain recognizes pattern → easier retention

### Pattern 3: Ingredient Credibility
6 real ingredients per slide (not illustrations)
- Builds trust (real foods, not manufactured)
- Visual appeal (natural colors)
- Specificity (avocado, not "healthy fat")

### Pattern 4: Emotional Arc
S1-2: Fear/Urgency (problems)
S3-4: Hope/Solution (possibilities)
S5: Pride/Action (I can do this)

### Pattern 5: Typography Consistency
- Serif font (premium, educational feel)
- 28px headline (readable mobile + desktop)
- 14px body (accessible, not overwhelming)
- Accent color (dark green #2D5016) for emphasis

---

## IMPLEMENTATION FOR FEEDIA

```typescript
// Register this carousel as training example
const trainingExample = {
  id: 'good_fud_fibre',
  name: 'Educational Carousel - Fibre Importance',
  category: 'education',
  niche: 'health/wellness',
  structure: 'problem-solution-problem',
  slides: 5,
  psychology: ['fear-consequence', 'hope-solution', 'pride-action'],
  visualPatterns: ['ingredient-showcase', 'parallel-structure'],
  colors: ['cream', 'dark_green_accent', 'natural_earth_tones'],
  typography: ['serif', '28px_headline', '14px_body'],
  engagement: 'high',
  replicability: 'high',
};

// When FeedIA generates similar content:
// 1. Check if topic = 'health/education'
// 2. Pull this training example
// 3. Apply same structure (problem → solution × 2 → emotional anchor)
// 4. Apply same color scheme (cream + accent)
// 5. Apply same visual patterns (ingredients on left, text on right)
// 6. Apply same psychology triggers
```

---

## FEEDIA LEARNS:

✓ Structure: Problem-setup → Solution dual → Emotional anchor
✓ Visuals: Ingredient-based proof (not illustrations)
✓ Colors: Cream + single accent color = premium educational feel
✓ Typography: Serif for authority, consistent sizing
✓ Psychology: Consequences → Solutions → Emotional hook
✓ Parallelism: Same structure slide-to-slide aids retention
✓ Pacing: Text-heavy → Visual-heavy → Text-heavy (rhythm)

**Next carousel on health/education topic: FeedIA will replicate this exact structure, psychology, visual approach, and emotional arc.**

FeedIA learns from your example. Creates infinite variations inspired by this proven pattern.
