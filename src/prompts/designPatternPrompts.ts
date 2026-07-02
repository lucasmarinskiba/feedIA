/**
 * FeedIA Design Pattern Prompts
 *
 * Pinterest-extracted patterns + real-world design examples
 * Guides carousel/video generation with proven aesthetics
 */

export const designPatternPrompts = {
  // ── OVERHEAD SHOT + WHATSAPP CARD (Vulnerability Pattern) ────────────────

  overheadConfession: {
    name: 'Overhead Confession Card',
    description: 'Aerial view of people + WhatsApp bubble with vulnerable copy',
    template: `
Design carousel slide with authentic vulnerability pattern:

VISUAL:
- Overhead/aerial view of [SUBJECT: person/people/workspace]
- Natural lighting, intimate framing
- Minimal props around subject (coffee, laptop, food, tools)
- Background: White, patterned, or solid color with contrast
- Green WhatsApp-style card overlay (65% opacity)
- Card positioned bottom/center or side
- Timestamp (15:33 format) + double check mark (read receipt)

COPY:
- Honest admission of struggle or failure
- Self-aware humor (gentle self-roasting)
- Conversational, not corporate
- Relatable entrepreneur/creator pain point
- Starts with "Eu/Yo soy..." or "I'm..." for confession feel
- Keep under 15 words
- End with emotional truth, not punchline

EMOTION TRIGGERS:
- Vulnerability (builds trust)
- Recognition (audience sees themselves)
- Humor (makes pain digestible)

EXAMPLES OF AUTHENTIC COPY:
"Eu sou o gargalo da minha própria empresa"
"Meu concorrente é pior mas vende mais"
"Tenho equipe, mas tudo ainda depende de mim"
"Soy mejor pero vendo menos"
"Trabajo más que mis empleados"

AVOID:
- Bragging disguised as humor
- Fake humility
- Corporate language
- Perfectly polished appearance (aim for real)
    `,
    psychology: 'Vulnerability creates psychological safety. Audiences trust honesty over perfection.',
    useCase: 'Personal brand, creator content, entrepreneur realities, relatable messaging',
  },

  // ── 3D MOCKUP + PORTFOLIO (Cinematic Pattern) ──────────────────────────────

  cinematic3dPortfolio: {
    name: 'Cinematic 3D Portfolio Showcase',
    description: 'Professional with product mockup in 3D, technical cinematic copy',
    template: `
Design high-end portfolio carousel with cinematic 3D effect:

VISUAL:
- Hero image: Professional/creator with cool expression
- Background: Blue or cool gradient (confidence color)
- Foreground: 3D floating card/mockup (phone, website, product)
- 3D card shows: Instagram profile preview, website mockup, or product shot
- Depth effect: Shadow, perspective, floating sensation
- Lighting: Warm on subject, cool background (contrast)
- Overall vibe: Premium, technical, impressive

COPY:
- Technical description of work/service
- Cinematic language: "hiper-realista", "close-up", "profundidad", "movimiento"
- Storytelling about the solution or transformation
- Mention specific tools/techniques used
- Write as if describing a film scene
- Avoid buzzwords; use precise descriptive language

STRUCTURE:
Paragraph 1: What the work is (technical)
Paragraph 2: How it solves problem (transformation)
Paragraph 3: The experience/feeling (emotional)

EMOTION TRIGGERS:
- Aspiration (high-quality work)
- Trust (technical precision)
- Desire (want the same result)

EXAMPLE COPY:
"Fotografía cinematográfica hiper-realista. Un close-up con foco en una mano extendida en el primer plano, con la palma abierta y levemente curvada en un gesto de presentación. Flotando mágicamente logo acima da palma, há un card preto de perfil en 3D..."

AVOID:
- Generic descriptions
- Buzzwords (innovative, cutting-edge, etc)
- Overcomplicated sentences
- Focus on tools over transformation
    `,
    psychology: 'Premium presentation + technical precision = perceived value increase. 3D/depth = memorable.',
    useCase: 'Portfolio, B2B services, designer/developer showcase, premium brand positioning',
  },

  // ── TIME SCARCITY + PHILOSOPHY (Wisdom Pattern) ──────────────────────────

  timeScarcityWisdom: {
    name: 'Time Scarcity Philosophical Card',
    description: 'Overhead minimal shot + philosophical message about time/urgency',
    template: `
Design carousel with time-pressure + wisdom positioning:

VISUAL:
- Overhead view: Coffee cups, minimal objects
- 1-3 people visible from above, intimate framing
- Patterned or white background (icons, minimal design)
- Green or dark card overlay with copy
- High contrast: Make text pop against background
- Include implied waiting/pausing (coffee, thinking pose)
- Minimal, not cluttered

COPY:
- Philosophical angle on time/urgency
- Reality check (honest, not manipulative)
- "Time is your only asset you can't recover"
- Connect time waste to specific action user should take
- Wisdom tone: Guru-like, but accessible
- Create FOMO naturally (scarcity of time is real)
- End with self-reflection question

STRUCTURE:
Line 1: Time scarcity observation
Line 2: What you're doing wrong
Line 3: Why it matters
Line 4: Implicit call to change

EXAMPLES:
"Tiempo es el único activo que no recuperas. Y lo estás gastando intentando descubrir solo."
"Time you don't spend building is time your competitor gains."
"Every day you wait, your gap closes. Not in your favor."
"Você já perdeu tempo lendo isso. Quanto mais vai perder pensando?"

EMOTION TRIGGERS:
- Urgency (time running out)
- Wisdom (trusted advice)
- Self-awareness (audience recognizes truth)
- Slight anxiety (healthy pressure)

AVOID:
- Pushy sales language
- Fake urgency ("ONLY 3 SPOTS LEFT!!!")
- Manipulation
- Too long copy (keep under 30 words)
    `,
    psychology: 'Scarcity principle + wisdom positioning = motivates without pressure. Audience recognizes truth.',
    useCase: 'Course launches, coaching, consulting, personal development, service offers',
  },

  // ── PATTERN BACKGROUND + CONTRAST CARD (Visual Hierarchy) ──────────────────

  patternCardHierarchy: {
    name: 'Pattern Background + Contrast Card',
    description: 'Busy pattern background with calm card overlay for visual hierarchy',
    template: `
Design template maximizing visual hierarchy through contrast:

VISUAL STRUCTURE:
Background Layer:
- Repeating small icons/patterns (tools, ideas, symbols, emojis)
- White or light color base
- Icons: 3-5px stroke, minimal, outline style
- Creates "busy" intentional texture
- Fills entire slide

Card Overlay Layer:
- Solid color (green, blue, red, brand color)
- 65-75% opacity (see background slightly)
- Rounded corners (16px minimum)
- Positioned: Top-left, center, or bottom-right (asymmetrical)
- Padding: 24px internal
- Shadow: Subtle (0 2px 8px rgba)

Subject/Content Layer:
- Person or key visual element
- Positioned outside/overlapping card for depth
- Clear contrast against background

COPY POSITIONING:
- Copy ONLY on the colored card
- High contrast text (white on dark, dark on light)
- Font: Bold headline (28-36px)
- Max 15 words on card
- Secondary copy below card if needed (lighter opacity)

DESIGN RULES:
- Pattern fills ~60% background, leaves breathing room
- Card blocks ~30% of slide area
- Subject takes remaining space
- Total max 4 colors on slide

EMOTION TRIGGERS:
- Visual interest (pattern = engaged attention)
- Clarity (card = easy reading)
- Hierarchy (knows what to read first)

EXAMPLES:
- Icon pattern: Shopping bags, light bulbs, charts, checkmarks
- Card color: Green (growth), Blue (trust), Red (urgency), Purple (premium)
- Subject: Person pointing at card, holding product, thinking pose

AVOID:
- Pattern too busy (>10 different icons)
- Low contrast (can't read copy)
- Card too transparent (distracting)
- Centered, symmetrical design (feels dated)
    `,
    psychology: 'Patterned background = novelty/attention. Solid card = cognitive relief. Contrast = clarity.',
    useCase: 'Service offerings, course promotions, value propositions, stats/benefits presentation',
  },

  // ── BRUTAL HONESTY + FOOD/LIFESTYLE (Relatability Pattern) ──────────────────

  honestLifestyleCard: {
    name: 'Lifestyle Honesty + Flat Lay',
    description: 'Overhead flat lay with honest/humorous copy about reality',
    template: `
Design relatable content with lifestyle visual + brutal honesty copy:

VISUAL:
- Overhead flat lay: Person + lifestyle props
- Props: Food, coffee, tools, laptop, phone
- Natural positioning (not too styled, but intentional)
- Bright, natural lighting
- White or light background
- Person's expression: Honest, thinking, vulnerable (not smiling)

CARD OVERLAY:
- Contrasting color card (green standard)
- Positioned to not cover person's face
- Clear contrast for readability
- Timestamp included (15:33 format)

COPY STRATEGIES:

Strategy A: Competitive Reality
"Mi competidor es peor pero vende más"
"They're worse than me but still winning"
Copy truth: Market skills ≠ Product quality

Strategy B: Team Burden
"Tengo equipo pero todo depende de mí"
"I have a team but I'm the bottleneck"
Copy truth: Leadership isolation

Strategy C: Market Position
"Soy mejor pero cargo con menos"
"Better product, smaller audience"
Copy truth: Quality ≠ Success guarantee

TONE:
- Vulnerable but confident
- Honest without victimhood
- Humorous self-awareness
- No complaints (just facts)
- Leads to implicit: "Need help? Here's solution"

EMOTION TRIGGERS:
- Recognition (audience sees themselves)
- Solidarity (you're not alone)
- Subtle aspiration (future solution implied)

AVOID:
- Whining tone
- Blame-shifting
- False modesty
- Cringe attempts at humor
- Bragging disguised as honesty
    `,
    psychology: 'Honest struggle creates relatability. Audience feels understood. Opens door to solution.',
    useCase: 'Entrepreneur content, B2B services, creator communities, authenticity positioning',
  },

  // ── PROMPT LIBRARY ORGANIZATION STRATEGY ─────────────────────────────────

  promptLibraryStrategy: {
    name: 'Prompt Library Organization Framework',
    description: 'How to structure and maintain prompt library for content generation',
    template: `
Create scalable prompt library for consistent content generation:

STEP 1: IDENTIFY NEEDS
- Which tasks/content types take most time?
- What questions do customers ask repeatedly?
- Which emotional hooks resonate most?
- Map to: Carousel, Video, Story, Short-form

STEP 2: CREATE KEY PROMPTS
- Write clear, specific, business-adapted instructions
- Include: Visual requirements, copy tone, emotion triggers, psychology, use cases
- Test with LLM (Claude, GPT) multiple times
- Refine based on output quality
- Document exact prompt wording

STEP 3: ORGANIZE BY CATEGORIES
- Content Type: Carousel, Video, Story, Reel, TikTok
- Emotion: Vulnerability, Aspiration, Urgency, Joy, Curiosity
- Industry: B2B, Creator, E-commerce, Service, Education
- Stage: Awareness, Consideration, Decision, Advocacy

STEP 4: DOCUMENT & SHARE
- Version control (date last updated)
- Success examples (what worked, why)
- Failure cases (what bombed, why)
- Access: Shared drive, notion, wiki
- Include: Author, success metrics, audience

STEP 5: IMPROVE & UPDATE
- Monthly review: Which prompts generated best engagement?
- A/B test variations (urgency vs inspiration, etc)
- Add new prompts based on trend analysis
- Remove low-performing prompts
- Track: Time saved, engagement improvement, output quality

MEASUREMENT:
- Prompts used per week
- Output quality score (1-10)
- Engagement per prompt type
- Time saved vs manual creation
- Team satisfaction (usability)

STRUCTURE TEMPLATE:
[Prompt Name]
Category: [Type + Emotion + Industry]
Description: [1 line what it does]
Copy Examples: [3-5 real examples that worked]
Visual Requirements: [Specific visual elements]
Emotion Triggers: [Psychology principles]
Use Cases: [When to use this]
Success Rate: [% of time it works]
Last Updated: [Date]
    `,
    psychology: 'Organization reduces decision fatigue. Prompt library = scalable content machine.',
    useCase: 'Team scaling, content operations, consistency, speed, quality control',
  },
};

export const designPatternWorkflow = {
  photoEditing: 'Lightroom Mobile (edit) → Snapseed (retouch) → CapCut (arrange)',
  videoCreation: 'Canva (sketch/idea) → CapCut (assembly) → Snapseed (polish photos)',
  contentStrategy: 'Identify pain → Create prompt → Organize → Document → Improve',
};

export default designPatternPrompts;
