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

// ── STRATEGIC BUSINESS POSITIONING PATTERNS ────────────────────────────────

export const strategicPatterns = {
  // Pattern 1: EVOLUTION COMPARISON (Capability Gap)

  designerEvolution: {
    name: 'Designer Evolution (Quality Gap)',
    description: 'Before/After visual showing capability gap (simple vs detailed)',
    template: `
Design capability/quality carousel (show transformation power):

VISUAL:
- Split screen: Left = low-quality version (pixel art, simple, outdated)
- Right = high-quality version (realistic, detailed, modern)
- Visual evolution shows capability gap clearly
- Labels: "NORMAL" vs "CREATIVE" (or "BASIC" vs "PREMIUM")
- Light background, clean layout
- Purple or color accent on "premium" side

COPY STRATEGY:
- Headline: What strong presence looks like
- Problem: Current quality level
- Solution: Professional design transforms everything
- Tone: Aspirational, inspiring, empowering

EXAMPLES:
"MAKE YOUR ONLINE PRESENCE STRONG WITH FINE GRAPHICS"
"From Basic to Bold: Design That Stands Out"
"Good Isn't Enough: Great Design Wins"
"Low-Res vs High-Impact: Choose Better"

EMOTION TRIGGERS:
- Aspiration (want the better version)
- Recognition (see yourself in "before")
- Empowerment (transformation is possible)
- Quality consciousness (design matters)

PSYCHOLOGY:
Visual gap makes transformation undeniable. Before/after is powerful proof.

USE CASE:
- Design agencies
- Quality-focused positioning
- Capability showcases
- Transformation stories
- Upgrade messaging
    `,
  },

  // Pattern 2: SPEED METAPHOR (Slow → Fast)

  speedBoostMetaphor: {
    name: 'Speed Boost Metaphor (Momentum)',
    description: 'Slow animal → speed vehicle = transform sluggish business',
    template: `
Design momentum/speed carousel (overcome slowness, build velocity):

VISUAL:
- Slow animal (turtle, sloth) on fast vehicle (skateboard, surfboard)
- Motion lines, energy effects
- Bright, energetic background (blue, electric colors)
- Brand logo/name prominently
- Dynamic composition (feels fast even static)

COPY STRATEGY:
- Problem: "Your business is moving slow"
- Solution: "Give it a BOOST"
- Tone: Energetic, action-oriented, confident
- CTA: Transform, accelerate, move

EXAMPLES:
"To your slow moving Business, Give a Boost"
"Your growth isn't moving. Let's accelerate it."
"Business running slow? Time for a speed upgrade"
"Stuck in slow mode? We boost you to fast"

EMOTION TRIGGERS:
- Urgency (slow is dangerous)
- Possibility (transformation available now)
- Energy (excitement about speed)
- Momentum (movement feels good)

PSYCHOLOGY:
Speed metaphor = growth momentum. Slow business = competitive liability.

USE CASE:
- Marketing agencies
- Business growth services
- Sales acceleration
- Performance optimization
- Transformation messaging
    `,
  },

  // Pattern 3: DIRECTION/STRATEGY (Signpost Pathways)

  strategySignpost: {
    name: 'Strategy Signpost (Multiple Paths)',
    description: 'Signpost with multiple directions = strategy guides path',
    template: `
Design strategy-first carousel (direction, clarity, planning):

VISUAL:
- Central signpost with 5+ directional arms
- Each arm labeled with strategy element
- Blue + minimal aesthetic
- Pink/purple accent lines connecting elements
- Clean, organized layout
- Brand identity prominent

SIGNPOST DIRECTIONS (Example):
- Entender (Understand needs)
- Conectar (Connect with audience)
- Alinhar (Align brand + goals)
- Ganhar (Win market share)
- Compartilhar (Share value)

COPY STRATEGY:
- Main headline: "Smart technology begins with STRATEGY"
- Subheadline: "Strategy that generates RESULTS"
- Message: Technology follows strategy, not vice versa
- Tone: Professional, strategic, results-focused

EXAMPLES:
"Inteligência começa com ESTRATÉGIA"
"Every growth path requires strategy first"
"Technology without strategy = wasted money"
"Smart brands plan. Then execute."

EMOTION TRIGGERS:
- Clarity (know which direction)
- Trust (organized approach)
- Professional confidence (strategy-led)
- Results orientation (action toward goals)

PSYCHOLOGY:
Signpost = clarity. Multiple paths = options + control. Strategy = wisdom.

USE CASE:
- Consulting/strategy services
- Business advisory
- Digital transformation
- Rebranding/repositioning
- Strategic planning services
    `,
  },

  // Pattern 4: COMPREHENSIVE SOLUTION (All Directions)

  directionCompass: {
    name: 'Direction Compass (Full-Circle Growth)',
    description: 'Compass with all directions covered = comprehensive solution',
    template: `
Design comprehensive positioning carousel (all angles covered):

VISUAL:
- Central compass/signpost pointing in 3-4 directions
- Each direction = service/capability (Audience, Presence, Strategy, etc)
- Neon glow effects (electric blue, bright accents)
- Dark/midnight blue background
- Lightning/energy effects around compass
- Modern, tech-forward aesthetic

COMPASS DIRECTIONS (Example):
- Audience Engagement
- Digital Presence
- Ad Strategies
- Brand Direction

COPY STRATEGY:
- Headline: "Every Direction for YOUR BRAND"
- Subheadline: "Full-circle growth with [brand]"
- Message: We handle everything (no gaps, complete solution)
- Tone: Comprehensive, confident, complete

EXAMPLES:
"Every Direction for YOUR BRAND"
"All angles. One partner. Complete growth."
"Audiences, Presence, Strategy - All directions covered"
"Full-circle brand growth"

EMOTION TRIGGERS:
- Relief (everything covered)
- Confidence (complete solution)
- Possibility (growth on all fronts)
- Partnership (we handle it all)

PSYCHOLOGY:
Compass = guidance. All directions = no gaps. Full-circle = complete transformation.

USE CASE:
- Full-service agencies
- Comprehensive marketing solutions
- B2B service positioning
- Enterprise solutions
- One-stop-shop messaging
    `,
  },

  // Pattern 5: HAND GESTURE (Human Support)

  handLiftingSupport: {
    name: 'Hand Lifting (Active Support)',
    description: 'Hand lifting/supporting = we help you rise',
    template: `
Design support/partnership carousel (empowerment, lifting up):

VISUAL:
- Hand gesture: Lifting, supporting, pushing up (skateboard, business, goal)
- Warm, supportive framing
- Clean background (white, light blue, neutral)
- Clear subject (hand + object being lifted)
- Human touch (not corporate, personal support)

COPY STRATEGY:
- Main message: "LET US BOOST YOUR [SALES/GROWTH/PRESENCE]"
- Implied: We're here to lift you up
- Tone: Supportive, empowering, partnership
- CTA: Work with us, let us help

EXAMPLES:
"LET US BOOST YOUR SALES"
"We lift up your business"
"Let us support your growth"
"Your success matters to us"

EMOTION TRIGGERS:
- Support (not alone)
- Empowerment (can achieve more with help)
- Partnership (we're in this together)
- Confidence (expert hands lifting you)

PSYCHOLOGY:
Hand = human connection. Lifting = active support. Gesture = emotional warmth.

USE CASE:
- Service-based businesses
- Coaching/consulting
- Partnership/collaboration messaging
- Customer success stories
- Team/people-focused brands
    `,
  },
};

// ── AGENCY/SERVICE POSITIONING PATTERNS ────────────────────────────────────

// ── FINAL SERVICE/EDUCATION POSITIONING PATTERNS ────────────────────────────

export const finalPatterns = {
  // Pattern 1: PERFECT FIT (Alignment/Precision)

  perfectFitAlignment: {
    name: 'Perfect Fit (Alignment + Expertise)',
    description: 'Puzzle pieces fitting perfectly = service alignment with needs',
    template: `
Design perfect fit/alignment carousel (precision, matching, expertise):

VISUAL:
- Bold typography with arrow/movement elements
- Service icons/labels (editing, strategy, creative services)
- Puzzle pieces at bottom (perfect fit concept)
- Each puzzle labeled: "Your Idea", "Our [Service]", "Your Idea"
- Purple or brand color emphasis
- Clean, confident aesthetic

COPY STRATEGY:
- Main: "WE JUST FIT"
- Subtext: Perfect alignment, expertise match
- Tone: Confident, precise, professional
- Message: We understand exactly what you need

EXAMPLES:
"We Just Fit"
"Perfect alignment with your needs"
"We get your vision. Exactly."
"Precision meets creativity"

EMOTION TRIGGERS:
- Relief (finally, someone understands)
- Confidence (expert fit)
- Precision (exact match)
- Partnership (they get us)

PSYCHOLOGY:
Puzzle fit = perfect alignment. Reduces decision anxiety.

USE CASE:
- Service agencies (editing, creative, strategy)
- Specialist positioning
- Precision/expertise focus
- Custom service offering
    `,
  },

  // Pattern 2: MOOD/PAIN RECOGNITION (Empathy + Solution)

  moodPainRecognition: {
    name: 'Mood/Pain Recognition (Empathy → Relief)',
    description: 'Show frustration, recognize pain, offer immediate solution',
    template: `
Design empathy carousel (recognize pain, offer relief, solution):

VISUAL:
- Person with authentic frustrated/stressed expression
- Thought clouds/pain points hovering around
- Product/solution shown below or beside
- Light background with accent colors
- Emotional authenticity (not fake happiness)
- Solution clearly positioned as relief

PAIN POINTS (Examples):
- Too many interruptions?
- Drowning in tasks?
- Running out of time?
- Too many tools?
- No visibility?

COPY STRUCTURE:
- Recognition: "Your workday has [pain]"
- Empathy: "It doesn't have to be this way"
- Solution: "[Product] brings everything together"
- Features: List 4 key benefits
- CTA: Take action

EMOTION TRIGGERS:
- Recognition (they see my pain)
- Empathy (they understand)
- Hope (solution exists)
- Relief (can change this)

PSYCHOLOGY:
Pain recognition + empathy → trust. Solution → action.

USE CASE:
- Productivity software
- Work management tools
- B2B SaaS
- Workflow optimization
- Pain-point marketing
    `,
  },

  // Pattern 3: IMPOSSIBILITY STATEMENT (Can't → Can)

  impossibilityStatement: {
    name: 'Impossibility Statement (Problem = Impossible)',
    description: '"Can\'t scale [problem]" → solution makes it possible',
    template: `
Design impossibility/solution carousel (reframe impossible as possible):

VISUAL:
- Person with stress/confusion expression
- Stressed body language (hand on face, overwhelm)
- Grid background (order, structure coming)
- Clean, professional aesthetic
- Color: Purple, blue, professional palette

COPY STRUCTURE:
- Headline: "You Can't [verb] [problem noun]"
- Reason: "Because [root cause stays unaddressed]"
- Solution: "[Our service] fixes the root cause"
- CTA: "Structure/Organize/Fix with [brand]"

EXAMPLES:
"You Can't Scale Confusion"
"You Can't Grow Without Structure"
"You Can't Compete Without Strategy"
"You Can't Succeed Without Systems"

IMPOSSIBILITY STATEMENT LOGIC:
- Problem: Disorganized operations
- Impossibility: Can't scale confusion
- Root cause: Operations stay unstructured
- Solution: Implement structure with our system

EMOTION TRIGGERS:
- Reality check (harsh truth)
- Empowerment (but you CAN fix this)
- Agency (take control)
- Professional growth (become structured)

PSYCHOLOGY:
Impossibility statement → reframes problem as solvable. Action becomes necessary.

USE CASE:
- Operations/workflow tools
- Business process improvement
- Consulting services
- Structure/organization focus
- B2B positioning
    `,
  },

  // Pattern 4: UNIFIED SYSTEM (Connection + Synergy)

  unifiedSystemConnection: {
    name: 'Unified System (All Connected)',
    description: 'Team around table = every action connects, synergy',
    template: `
Design unified system carousel (connection, synergy, together):

VISUAL:
- Overhead view of team around table/circle
- All people equally positioned (no hierarchy)
- Devices/laptops visible (digital connection)
- Purple/gradient color aesthetic
- Circular arrangement (unity, cycles, connection)
- Connected visual elements (lines, flows between people)

COPY STRATEGY:
- Main: "From first interaction to long-term growth"
- Subheadline: "Unified system where every action connects"
- Message: Each step builds on previous, creates momentum
- Tone: Visionary, connected, growth-focused

EXAMPLES:
"Every action connects. Every step drives the next."
"One system. Total connection. Unlimited growth."
"From meeting to momentum"
"Unified platform. Connected growth."

FEATURES (List 3-4):
- All-in-one workspace
- Connected workflows
- Smart integration
- Growth analytics

EMOTION TRIGGERS:
- Unity (together, not fragmented)
- Progress (each step drives next)
- Vision (long-term growth)
- Connection (everything linked)

PSYCHOLOGY:
Connected system = momentum. Circular arrangement = equality + inclusion.

USE CASE:
- CRM/workflow platforms
- Team collaboration tools
- Business growth software
- End-to-end solutions
- Platform positioning
    `,
  },

  // Pattern 5: CAREER PROGRESSION (Hand Support + Stairs)

  careerProgressionSupport: {
    name: 'Career Progression (Hand + Stairs = Support + Growth)',
    description: 'Hand holding device + stairs = guidance up the ladder',
    template: `
Design career progression carousel (education → growth → jobs):

VISUAL:
- Hand holding laptop/device (support, guidance)
- Person climbing stairs (progression, steps, effort)
- Blue/gradient background (growth, possibility)
- Clean, professional aesthetic
- Upward movement (visual ascent)
- Human element (hand = personal guidance)

COPY STRATEGY:
- Main: "Learn. Build. Grow."
- Subheadline: "We turn learning into career growth"
- Details: Path components (basics → advanced)
- Support: Mentorship, real projects, job-ready
- Target: Students, freshers, career-changers

STRUCTURE:
Line 1: "WE TURN [input] INTO [outcome]"
Line 2: Program structure (from X to Y)
Line 3: What's included (mentor, projects, skills)
Line 4: Result (job-ready, career growth)

EXAMPLES:
"Learn → Build → Grow"
"From Basics to Advanced Career Growth"
"Mentorship Drives Career Success"
"Real Projects. Real Skills. Real Jobs."

COMPONENTS TO HIGHLIGHT:
- From Basics to Advanced
- Mentor Support
- Real Projects
- Job-Ready Skills
- Career Guidance

EMOTION TRIGGERS:
- Support (guided journey, not alone)
- Progress (visible steps up)
- Possibility (anyone can climb)
- Career (professional growth)

PSYCHOLOGY:
Hand = personal touch + care. Stairs = achievable progression (not cliff jump).

USE CASE:
- Education/training programs
- Career counseling
- Mentorship platforms
- Skills bootcamps
- Job preparation courses
- Career transition services
    `,
  },
};

export const agencyPatterns = {
  // Pattern 1: MOUNTAIN SUMMIT (Achievement Journey)

  mountainSummitDelivery: {
    name: 'Mountain Summit (Achievement + Services)',
    description: 'Climbers reaching peak = journey + multiple capabilities displayed',
    template: `
Design achievement/multi-service carousel (climbers, summit, journey):

VISUAL:
- Mountain/peak with climbers reaching top
- Flag at summit: "WE DELIVER" (confidence, arrival)
- Service icons positioned around mountain (3-4 services)
- Blue background (power, trust, achievement)
- Climbers in action (effort, journey, progression)
- Glow effects at peak (success, arrival)

SERVICE ICONS (Example):
- Social Media Marketing
- Search Engine Optimization
- Content Creation
- Brand Strategy

COPY STRATEGY:
- Headline: Service category + achievement promise
- Subheading: "Smart solutions. Real results."
- Message: We deliver across multiple capabilities
- Tone: Confident, results-oriented, multi-faceted

EXAMPLES:
"Our Digital Services - Smart solutions Real results"
"Climb to success with our services"
"Peak performance across all channels"
"Multiple services, one summit"

EMOTION TRIGGERS:
- Achievement (mountain top = success)
- Journey (climbing = effort leads to results)
- Capability (multiple icons = full-service)
- Confidence (flag planted = we deliver)

PSYCHOLOGY:
Mountain = journey + achievement. Multiple services = complete solution.

USE CASE:
- Full-service agencies
- Multi-capability positioning
- Results-driven messaging
- B2B service showcases
    `,
  },

  // Pattern 2: HANDSHAKE PARTNERSHIP (Legacy Building)

  handshakePartnership: {
    name: 'Handshake Partnership (Collaboration + Legacy)',
    description: 'Two professionals collaborating = partnership, legacy-focused',
    template: `
Design partnership/collaboration carousel (handshake, relationship):

VISUAL:
- Two professionals shaking hands (collaboration, agreement)
- Overhead view (intimate, equal partnership)
- Branded chairs (brand color emphasis, red/accent)
- Clean, minimal background (white/light)
- Professional attire (serious partnership)
- Direct eye contact/connection

COPY STRUCTURE:
- Opening quote: "Your Vision. Our Strategy. Digital Success."
- Body: What partnership looks like
- Closing CTA: Transform ideas into impact
- Subtext: Build digital legacies (long-term focus)

EXAMPLES:
"Your Vision. Our Strategy. Digital Success."
"We don't just market. We build legacies."
"Partnership that delivers."
"Ideas + Strategy = Impact"
"We Turn Ideas Into Impact"

EMOTION TRIGGERS:
- Trust (handshake = agreement, trust)
- Partnership (two people, equals)
- Legacy (long-term, lasting impact)
- Collaboration (together, not alone)

PSYCHOLOGY:
Handshake = trust + agreement. Legacy = purpose beyond transaction.

USE CASE:
- Consulting/agency positioning
- Partnership messaging
- Trust-building
- B2B relationship focus
- Long-term strategy services
    `,
  },

  // Pattern 3: PUZZLE + KEY (Solution/Access)

  puzzleKeySolution: {
    name: 'Puzzle + Key (Solution + Unlock)',
    description: 'Puzzle piece + key inserted = problem solved + access gained',
    template: `
Design solution/unlock carousel (puzzle + key = complete picture):

VISUAL:
- Puzzle piece (3D, elegant, glowing)
- Key inserted into puzzle (solution element)
- Glow effects (activation, unlock, tech-forward)
- Two color variations: Blue (trust) or Purple (premium)
- Minimal background (white/light with pattern)
- Tech-elegant aesthetic (not corporate)

COPY STRATEGY:
- Main headline: "UNLOCK your FUTURE"
- Subheadline: Strategic + creative + data-driven approach
- Message: Branding + strategy = unlimited opportunities
- Tone: Visionary, comprehensive, future-focused

EXAMPLES:
"UNLOCK your FUTURE"
"The key to your business growth"
"Puzzle solved. Potential unlocked."
"Your solution is waiting"
"Strategy unlocks opportunity"

DETAILS (Optional):
- Strong branding unlocks clarity
- Smart digital strategies unlock growth
- Data-driven insights unlock opportunity
- Creative solutions unlock potential

EMOTION TRIGGERS:
- Completion (puzzle solved)
- Access (key unlocks possibilities)
- Future (unlimited potential)
- Solution (answer provided)

PSYCHOLOGY:
Puzzle + Key = complete picture + access granted. Unlock = empowerment.

USE CASE:
- Strategic consulting
- Digital transformation
- Growth services
- Opportunity positioning
- Future-focused messaging
    `,
  },

  // Pattern 4: BINOCULARS/VISION (Clarity + Perspective)

  binocularsVision: {
    name: 'Binoculars Vision (Clarity + Perspective)',
    description: 'Binoculars = see clearly, have perspective, design vision',
    template: `
Design vision/clarity carousel (binoculars = see opportunities):

VISUAL:
- Binoculars prominently featured (3D, brand color: purple, blue, etc)
- Minimal white/light background
- Grid pattern or subtle geometric elements
- Clean, professional aesthetic
- Binoculars positioned bottom-right or center
- Brand logo at top

COPY STRATEGY:
- Main headline: "LET'S DESIGN YOUR VISION!"
- Subheadline: Genius approach, creative solutions, full perspective
- Message: Clear sight leads to better design decisions
- Tone: Confident, creative, visionary

EXAMPLES:
"LET'S DESIGN YOUR VISION!"
"See Your Future Clearly"
"Perspective Changes Everything"
"Vision + Genius = Success"
"We Design Your Tomorrow"

BRAND POSITIONING (Example):
"The Art of Genius" (Genivison positioning)
- Creative + strategic + clear sight

CTA:
- "Reach US" or "Let's Start"
- Contact information prominent

EMOTION TRIGGERS:
- Clarity (see clearly with binoculars)
- Perspective (wider view, bigger picture)
- Vision (future-focused, design-led)
- Genius (creative excellence)

PSYCHOLOGY:
Binoculars = clarity + perspective. Vision = purpose + direction.

USE CASE:
- Creative agencies
- Brand design services
- Strategic consulting
- Innovation positioning
- Future-focused brands
    `,
  },

  // Pattern 5: "UNLOCK" REPEATED POSITIONING (Versatile Pattern)

  unlockPositioning: {
    name: '"Unlock" Positioning (Versatile Framework)',
    description: 'Repeating "UNLOCK" pattern with variations = consistency + impact',
    template: `
Design "UNLOCK" carousel series (consistent, repeating positioning):

CORE MESSAGING:
"UNLOCK your [NOUN]"
- UNLOCK your FUTURE
- UNLOCK your POTENTIAL
- UNLOCK your GROWTH
- UNLOCK your VISION
- UNLOCK your SUCCESS

VISUAL VARIATIONS (Pick one per slide):
1. Puzzle + Key (solution metaphor)
2. Binoculars (vision metaphor)
3. Lock opening (literal unlock)
4. Door opening (access metaphor)
5. Light bulb (idea metaphor)

COLOR PALETTE OPTIONS:
- Blue: Trust, tech, delivery
- Purple: Premium, creativity, innovation
- Red: Energy, urgency, transformation
- Green: Growth, opportunity, nature

COPY STRUCTURE (Each slide):
- Headline: "UNLOCK your [benefit]"
- Subheadline: How your future transforms
- Body: Strategic + creative + data-driven approach
- CTA: Contact, learn more, start

SERIES EXAMPLES:
Slide 1: UNLOCK your FUTURE (puzzle + key, blue)
Slide 2: UNLOCK your GROWTH (binoculars, purple)
Slide 3: UNLOCK your VISION (light bulb, cyan)
Slide 4: UNLOCK your POTENTIAL (door opening, green)
Slide 5: UNLOCK your SUCCESS (combined elements, brand color)

EMOTION TRIGGERS:
- Hope (unlock = new possibilities)
- Capability (we have the key)
- Future (tomorrow is waiting)
- Empowerment (you control this)
- Possibility (potential unlimited)

PSYCHOLOGY:
"Unlock" = agency + hope. Repetition = brand reinforcement.

USE CASE:
- Multi-slide carousel campaigns
- Campaign consistency
- Repeated brand messaging
- Growth/transformation services
- Versatile positioning across niches
    `,
  },
};

export const designPatternWorkflow = {
  photoEditing: 'Lightroom Mobile (edit) → Snapseed (retouch) → CapCut (arrange)',
  videoCreation: 'Canva (sketch/idea) → CapCut (assembly) → Snapseed (polish photos)',
  contentStrategy: 'Identify pain → Create prompt → Organize → Document → Improve',
  strategyFirst: 'Strategy → Direction → Technology → Execution → Results',
  agencyFramework: 'Mountain (deliver multi-services) → Handshake (partner) → Puzzle (solve) → Binoculars (see clearly) → Unlock (future)',
};

// ── REAL CAROUSEL DESIGN PATTERNS ──────────────────────────────────────────

export const carouselDesignPatterns = {
  // Pattern 1: GOOD NEWS ANNOUNCEMENT (Celebration)

  goodNewsAnnouncement: {
    name: 'Good News Announcement Card',
    description: 'Person celebrating milestone/achievement with WhatsApp card',
    template: `
Design celebration carousel for good news (approval, promotion, win):

VISUAL:
- Person on couch/chair, happy/excited reaction
- Patterned background (light, busy pattern with icons)
- Green WhatsApp card overlay with announcement copy
- Card positioned center/bottom
- Warm, welcoming color palette
- Natural, authentic expression (not forced smile)

COPY STRUCTURE:
- Headline: The achievement/good news
- WhatsApp card: Short, exclamatory message
- Subheading: "Ese mensaje que cambia todo" (that message that changes everything)

EXAMPLES:
"¡Aprobaron el crédito!"
"¡Conseguí el trabajo!"
"¡Me aumentaron el sueldo!"
"¡Nació mi hijo!"
"¡Se aprobó el proyecto!"

EMOTION TRIGGERS:
- Joy (celebration)
- Recognition (audience celebrates with them)
- Hope (good things happen)
- Relatability (everyone wants this news)

PSYCHOLOGY:
Celebrating wins builds brand loyalty. Audience aspires to same wins.

USE CASE:
- Personal brand milestones
- Customer success stories
- Team celebrations
- Achievement announcements
    `,
  },

  // Pattern 2: LIFE MILESTONE (Couples/Family)

  lifeMilestoneCouple: {
    name: 'Life Milestone Couple Celebration',
    description: 'Overhead view of couple at table + WhatsApp card for milestone',
    template: `
Design life milestone carousel (moving, engagement, anniversary, project launch):

VISUAL:
- Overhead/aerial view of 2+ people at table
- Natural setting (home, restaurant, workspace)
- Props around them (objects related to milestone)
- Patterned light background
- Green WhatsApp card with copy
- Emoji reactions below card (❤️ 😍 😂 🙌)
- Warm, intimate framing

COPY STRUCTURE:
- WhatsApp message: Short, emotional announcement
- Subheading: "Ese mensaje que cambia todo"
- Support emojis showing emotional resonance

EXAMPLES:
"¡Nos mudamos!" (Moving)
"¡Nos casamos!" (Wedding)
"¡Aniversario de 10 años!" (Anniversary)
"¡Nuestro negocio llegó a 1M!" (Business milestone)
"¡Somos oficialmente familia!" (Adoption/pregnancy)

EMOTION TRIGGERS:
- Connection (shared moment)
- Celebration (infectious joy)
- Aspiration (audience wants same)
- Solidarity (community celebrates together)

PSYCHOLOGY:
Shared milestones create community. Audience invests emotionally in couple's journey.

USE CASE:
- Relationship brands
- Couples workshops/courses
- Community building
- Testimonial/success stories
    `,
  },

  // Pattern 3: SUSTAINABLE/MISSION-DRIVEN (Product + Purpose)

  sustainableBrandMessage: {
    name: 'Sustainable Brand Mission Card',
    description: 'Product + minimal aesthetic + environmental/purpose messaging',
    template: `
Design mission-driven carousel (sustainability, social impact, purpose):

VISUAL:
- Product hero shot (tote bag, eco product, etc)
- Minimal, natural color palette (cream, green, earth tones)
- Green or earth-tone background (solid or subtle pattern)
- Product positioned asymmetrically
- Clean, minimalist aesthetic
- High production quality (premium feel)

COPY STRUCTURE:
- Main question: "O que faz uma marca ser [sustainable/purpose-driven]?"
- Secondary: "E o que fizemos para [brand] ser parte desse movimiento"
- Connect product to bigger mission/impact

EXAMPLES:
"O que faz uma marca ser sustentável? E o que fizemos para a Nudaé ser parte desse movimiento"
"Por qué elegimos materiales eco-friendly? El impacto que queremos tener"
"¿Qué significa realmente responsabilidad social? Nuestro compromiso"

EMOTION TRIGGERS:
- Purpose (brand with values)
- Trust (transparency)
- Responsibility (doing good)
- Premium (high-quality + conscious)

PSYCHOLOGY:
Modern consumers want values-aligned brands. Mission messaging builds loyalty.

USE CASE:
- Eco-friendly brands
- Social enterprises
- Conscious consumption messaging
- Brand values/mission communication
    `,
  },

  // Pattern 4: CALL TO ACTION / OPPORTUNITY (Motivational)

  opportunityMotivation: {
    name: 'Opportunity Mindset CTA',
    description: 'Relatable person + motivational message about taking action',
    template: `
Design opportunity/mindset carousel (motivation, agency, empowerment):

VISUAL:
- Young person in casual pose (sitting, relaxed, thinking)
- Real, relatable setting (not too staged)
- Warm lighting
- Copy overlay in contrasting color
- Minimalist, focused framing

COPY STRUCTURE:
- Headline: Reframe waiting/fear as action
- Call to action: Create opportunity now
- Tone: Empowering, not pushy

EXAMPLES:
"No esperes, crea tu oportunidad"
"Dejar de esperar es el primer paso"
"Tu oportunidad está esperándote, úsala"
"No hay mejor momento que hoy"

EMOTION TRIGGERS:
- Empowerment (you have agency)
- Urgency (act now)
- Possibility (opportunity exists)
- Maturity (take responsibility)

PSYCHOLOGY:
Agency (belief you control outcomes) drives action. Reframe fear as opportunity.

USE CASE:
- Coaching/personal development
- Startup/entrepreneurship
- Career advancement
- Motivational content
- Course promotions
    `,
  },

  // Pattern 5: COMPETITIVE ADVANTAGE (Philosophy + Challenge)

  competitivePhilosophy: {
    name: 'Competitive Advantage Philosophy',
    description: 'Philosophical imagery + competitive messaging + reality check',
    template: `
Design competitive advantage carousel (reality check, agency, professionalism):

VISUAL:
- Philosophical imagery (statue, wise figure, aspirational)
- Person with laptop/work tools (creating, thinking, building)
- Dark/dramatic background for contrast
- Red/orange highlights on key copy words
- Professional, serious tone
- Message positioned dramatically

COPY STRUCTURE:
- Opening: Competitive reality (they have X)
- Challenge: Do you have it too?
- Subtext: Urgency + agency (take action)
- Tone: Philosophical, reality-check, slightly provocative

EXAMPLES:
"Tu competencia ya tiene agencia. ¿Y tú, sigues improvisando?"
"Ellos contrataron especialista. ¿Tú sigues solo/a?"
"Tu competidor invirtió en marca. ¿Vos en qué?"
"Tienen equipo profesional. ¿Vos sigues haciendo todo?"

EMOTION TRIGGERS:
- Competitive tension (healthy pressure)
- Reality check (truth-telling)
- Possibility (solution exists)
- Urgency (act now before too late)
- Agency (you can change this)

PSYCHOLOGY:
Competitive messaging motivates without guilt. Frames action as professional necessity.

USE CASE:
- B2B services (agency, consulting)
- Premium positioning
- Team/hiring services
- Business development
- Reality-check messaging (wake-up call)

DESIGN RULES:
- Use dramatic lighting/colors
- Red/orange accents for emphasis
- Philosophical imagery = wisdom + professionalism
- Challenge tone (not shame)
    `,
  },

  // ── TIER-BASED OFFERING + PHILOSOPHICAL IMAGERY ──────────────────────────

  philosopherServiceTiers: {
    name: 'Philosopher + Service Tiers (Premium Positioning)',
    description: 'Classical sculpture + modern tools + tiered service cards',
    template: `
Design premium service tier carousel (timeless + modern, scalable):

VISUAL:
- Classical philosopher/statue imagery (ancient, wisdom, timeless)
- Modern tool in hand (laptop, phone, notebook)
- Warm background (red, cream, gold tones)
- Dark overlay service tier cards (side-by-side comparison)
- Contrast: Ancient statue + contemporary tool = premium positioning

TIER CARDS STRUCTURE:
- Tier Name: Micro, Nano, Mega, etc (use catchy names)
- Deliverables: Concrete list (e.g., "12 statics, 4 dynamics, copywriting")
- Arrow/indicator pointing to next tier

COPY STRATEGY:
- Headline: Philosophical framing (timeless approach)
- Subheading: Modern application (contemporary solution)
- Tier details: Specific, measurable deliverables
- Each tier = complete solution at that level

EXAMPLES OF TIER NAMES:
- Micro, Nano (lightweight)
- Base, Pro, Premium (standard naming)
- Sage, Philosopher, Oracle (philosophical)
- Starter, Growth, Scale (business language)

EMOTION TRIGGERS:
- Premium positioning (classical imagery = authority)
- Wisdom (philosophy = intelligent approach)
- Accessibility (multiple tiers for all budgets)
- Clarity (concrete deliverables listed)
- Trust (timeless + modern = proven + innovative)

PSYCHOLOGY:
Classical imagery signals expertise + credibility. Tiers reduce decision anxiety (choose your level).

USE CASE:
- Premium service offerings
- Course/coaching programs
- Subscription services
- B2B service pricing
- Portfolio positioning

DESIGN RULES:
- Use warm tones (red, gold, cream) for premium feel
- Classical sculpture = authority, wisdom
- Modern tool = innovation, contemporary
- Tier cards: High contrast, easy scanning
- Left-to-right reading (upgrade path)
    `,
  },

  // ── VR/IMMERSION METAPHOR + CONTENT ABUNDANCE ──────────────────────────

  vrImmersionBrand: {
    name: 'VR Immersion Metaphor (Tech-Forward Experience)',
    description: 'VR headset + content cards floating = immersive brand experience',
    template: `
Design immersion/transformation carousel (tech metaphor, aspirational):

VISUAL:
- Person wearing VR headset (immersive technology)
- Social media content cards floating/cascading around person
- Bold, dramatic background (red, purple, dark colors)
- Cards show diverse content: posts, videos, feeds, stories
- Person centered, content swirling around (energy, abundance)
- Tech-forward, dynamic aesthetic

COPY STRATEGY:
- Problem statement: "Weak Social Media Presence"
- Solution frame: Full immersion/transformation into brand strategy
- Message: Not just posts, but complete brand experience
- Tone: Aspirational, tech-savvy, forward-thinking

EXAMPLES:
"Your presence isn't weak, it's not immersive enough"
"It's not about more posts, it's about immersive storytelling"
"Weak presence = missing the full brand experience"
"Transform passive followers into immersed community"

EMOTION TRIGGERS:
- Future-thinking (VR = next-gen)
- Abundance (content flowing)
- Transformation (weak → immersive)
- Innovation (tech metaphor)
- Possibility (endless content shown)

PSYCHOLOGY:
VR as metaphor = abstract concept made visual. Immersion language = commitment + engagement.

USE CASE:
- Tech-forward brands
- Digital transformation services
- Content strategy agencies
- Social media management
- Brand experience positioning

DESIGN RULES:
- VR headset = symbolic gateway to experience
- Cards around person = content abundance
- Bold background colors (red, purple) for drama
- Dynamic positioning (cards not static)
- Modern, energetic aesthetic (not corporate)
    `,
  },

  // ── PORTFOLIO CASCADE + MOCKUPS (Expertise Display) ─────────────────────

  portfolioCascade: {
    name: 'Portfolio Cascade (Expertise + Options)',
    description: 'Multiple phone mockups/content cards cascading = service range',
    template: `
Design portfolio showcase carousel (display expertise, multiple services):

VISUAL:
- Hand holding/arranging multiple phones/screens
- Each phone shows different service: Instagram posts, reels, stories, etc
- Phones arranged in cascading pattern (dynamic, not aligned)
- Clean, light background (blue, white, minimal)
- Brand name + CTA positioned prominently
- Professional mockup style

COPY STRATEGY:
- Headline: Service category ("Social Media Post Design")
- Subheading: Transformation promise ("Transform Your Presence")
- CTA: Clear action (DM, visit link, book call)
- Tone: Professional, inviting, collaborative ("let work together")

LAYOUT:
- Multiple mockups = multiple capabilities shown
- Each phone = different content type/service
- Cascading arrangement = energy + possibility
- Hand as human touch (personal service)

EXAMPLES:
"Social Media Post Design - Let's work together"
"Content Strategy Portfolio - Every post matters"
"Reel Production - Transform your feed"
"Story Creation - Keep them engaged"

EMOTION TRIGGERS:
- Expertise (portfolio displayed)
- Choice (multiple options shown)
- Professional quality (mockup aesthetic)
- Invitation ("let work together")
- Possibility (many services available)

PSYCHOLOGY:
Portfolio display = social proof + capability demonstration. Multiple options reduce friction.

USE CASE:
- Creative agencies
- Freelance designers/content creators
- Social media management services
- Portfolio presentation
- Service menu display

DESIGN RULES:
- Clean, minimal background
- Professional mockup quality
- Dynamic cascading (not rigid grid)
- Hand adds human touch
- Each phone clearly shows different service
- Clear brand identity + CTA
    `,
  },

  // ── INVESTMENT REFRAMING (ROI Psychology) ───────────────────────────────

  investmentNotCost: {
    name: 'Investment Reframing (ROI Psychology)',
    description: 'Cost vs Investment messaging + product mockup integration',
    template: `
Design investment/ROI carousel (reframe marketing spend):

VISUAL:
- Bold, high-contrast typography (orange + black, or bold complementary)
- Product mockup or smartphone integrated with message
- Minimal aesthetic (not cluttered)
- Clean background (white, light neutral)
- Message and imagery merged (not separate)

COPY STRATEGY:
- Headline reframe: "Not a COST, an INVESTMENT"
- Emphasis words in color (COST, INVESTMENT, GREAT)
- Subtext: ROI-focused language
- Tone: Business-minded, strategic, confident

EXAMPLES:
"GREAT MARKETING IS NOT A COST IT'S AN INVESTMENT"
"Social Media Strategy = Business Growth, Not Expense"
"Good Design Isn't Cheap, It's Profitable"
"Brand Investment = Long-Term Revenue"
"Marketing Budget = Competitive Advantage Fund"

EMOTION TRIGGERS:
- Business acumen (ROI language)
- Confidence (strategic positioning)
- Permission to spend (investment = smart money)
- Long-term thinking (not short-term cost)
- Smart decision-making (invest in yourself)

PSYCHOLOGY:
Reframing cost as investment removes guilt about spending. ROI language appeals to decision-makers.

USE CASE:
- Premium pricing positioning
- B2B service sales
- Course/coaching promotion
- Agency positioning
- Financial/business services
- Luxury brand messaging

DESIGN RULES:
- High contrast typography (boldness = authority)
- Emphasis words in brand color (draws eye)
- Minimal design (message clarity)
- Product integrated (not floating separately)
- Clean, professional aesthetic
- ROI/business language (not emotional)
    `,
  }
};

// ── FOUNDATIONAL CONCEPTS (User Education) ────────────────────────────────

export const foundationalConcepts = {
  visualIdentityDefinition: {
    name: 'Visual Identity Definition',
    definition: '"Face of your brand" — All graphic elements people see',
    components: ['Logo', 'Color palette', 'Typography', 'Iconography', 'Textures'],
    function: 'Make brand recognizable + aesthetically attractive',
    metaphor: 'Clothing + hairstyle of a person (appearance)',
    whatItIs: 'Tools/graphics that make immediate visual impression',
    whatItIsNot: 'The emotional feeling or personality behind brand',
  },

  brandingDefinition: {
    name: 'Branding Definition',
    definition: '"Soul of your business" — Strategic perception management',
    components: ['Values', 'Purpose', 'Tone of voice', 'Customer experience', 'Company culture'],
    function: 'Build emotional connection + trust with audience',
    metaphor: 'Personality, values, feelings of a person (essence)',
    whatItIs: 'Strategy that creates emotional connection',
    whatItIsNot: 'Just visual design or logo',
  },

  keyDifference: {
    name: 'Visual Identity vs Branding',
    visualIdentity: {
      label: 'Visual Identity',
      seeing: 'What you see (visual)',
      tools: 'Graphic tools',
      timeframe: 'First impression (immediate)',
      example: 'Logo, colors, fonts, layout',
    },
    branding: {
      label: 'Branding',
      seeing: 'What you feel (emotional)',
      strategy: 'Integral strategy',
      timeframe: 'Long-term impression (relationship)',
      example: 'Values, voice, experience, culture',
    },
  },

  businessNeedsBoth: {
    name: 'Both Visual Identity AND Branding Required',
    visualIdentityOnly: 'Incomplete tool. Attracts eyes. Won\'t retain trust or loyalty.',
    brandingOnly: 'Hard to remember. Strong values without recognizable face.',
    together: 'Complete strategy. Attracts → Engages → Retains → Scales',
    outcome: 'Invest in both = Assure future + scalability of business',
  },

  userEducationFramework: {
    order: [
      '1. Define your BRANDING (soul, values, personality, purpose)',
      '2. Design your VISUAL IDENTITY (face, colors, typography, graphics)',
      '3. Align both: Visual expresses Branding',
      '4. Generate content: All content reflects both visual + brand',
    ],
    criticalInsight: 'BRANDING FIRST → VISUAL SECOND. Visual derives from Brand essence.',
    whyMatters: 'If you design visual without clear branding, you\'ll confuse audience. If you define branding without visual identity, you\'ll be forgettable.',
  },

  strategyVsTactics: {
    name: 'Strategy vs Tactics (Trends Trap)',
    problem: 'Chasing trends = most energy-robbing trap',
    solution: 'Build strategy FIRST, then tactics second',
    trapToAvoid: 'Buscar tendencias no es trabajar (searching trends is not working)',
    realIssue: 'Es la trampa que más energía nos roba (is the trap stealing most energy)',
    keyInsight: 'Trends change. Strategy endures. Spend energy on strategy.',
  },

  contentPurposeMatrix: {
    name: 'Content Purpose by Format',
    reels: {
      purpose: 'Reach NEW people',
      strategy: 'Discovery, algorithm, growth',
      use: 'When you need new followers',
    },
    carouseles: {
      purpose: 'Keep EXISTING followers engaged',
      strategy: 'Nurture, education, deep content',
      use: 'When you need to retain audience',
    },
    stories: {
      purpose: 'Connect with followers + build community',
      strategy: 'Relationships, intimacy, real-time',
      use: 'When you need loyalty + engagement',
    },
    keyPoint: 'Different format = Different goal. Pick format based on strategy, not trend.',
  },

  authenticityFormula: {
    name: 'Authenticity Converts (UCC + Ads)',
    problem: 'Need content that converts',
    requirement: 'But feels real (se sienta real)',
    formula: 'UCC (User-Generated Content) + ADS',
    psychology: 'Que parezca una amiga recomendando algo (looks like friend recommending)',
    why: 'Authentic recommendations convert better than obvious ads',
    strategy: 'Combine UCC aesthetic with paid reach',
  },

  objectionsToAddress: {
    name: 'Entrepreneur Investment Objections',
    objection1: {
      barrier: 'No tengo presupuesto (no budget)',
      reframe: 'Investment → ROI conversation',
      copy: 'Start small. Test ROI. Scale wins.',
    },
    objection2: {
      barrier: 'No sé si es necesario (necessity doubt)',
      reframe: 'Competitors are doing it → you fall behind',
      copy: 'Every day you wait, market changes.',
    },
    objection3: {
      barrier: 'No estoy listo aún (readiness excuse)',
      reframe: 'Ready is a myth. Launch → Learn → Improve',
      copy: 'You never feel ready. Start now.',
    },
  },
};

// ── PHASE 26: INVERTED CAROUSEL PATTERNS (Punchline First) ──────────────────

export const invertedCarouselPatterns = {
  // Pattern 1: Product/Object + "Won't" Statement
  productWontPattern: {
    name: 'Product Won\'t Pattern (Punchline First)',
    description: 'Beautiful product → bold claim it won\'t solve problem → reveal system',
    slides: [
      { slide: 1, type: 'Punchline', example: 'Este café no te hará productivo', purpose: 'Stop scroll, curiosity hook' },
      { slide: 2, type: 'Error ID', example: 'EL ERROR: Beber café = Ser productivo', purpose: 'Validate frustration' },
      { slide: 3, type: 'Proof', example: 'Formulas: + cafeína ≠ + energía', purpose: 'Build credibility' },
      { slide: 4, type: 'System', example: 'Puzzle: Sueño + Café + Agua + Nutrición + Movimiento', purpose: 'Explain real solution' },
      { slide: 5, type: 'Context', example: 'Tu café es ALIADO, no solución', purpose: 'Wisdom + permission' }
    ],
    adaptableFor: ['Coffee', 'Phone', 'Gym membership', 'Course', 'Book', 'Furniture', 'Tool', 'App', 'Service', 'Product', 'Experience'],
    shareability: 'Slide 1 (meme) + Slide 5 (quote) both shareable independently'
  },

  // Pattern 2: Monkey/Character + Message
  characterPunchlinePattern: {
    name: 'Character Punchline (Mascot Humor First)',
    description: 'Funny character + bold statement → explain why → reveal system',
    examples: [
      { object: 'Monkey', statement: 'Publicar solo en redes no es vender', industry: 'Social media' },
      { object: 'Turtle', statement: 'Un curso no te hace experto', industry: 'Education' },
      { object: 'Person', statement: 'Una silla no arregla tu postura', industry: 'Wellness' }
    ],
    structure: 'Punchline (funny) → Error (frustration) → Proof (data) → System (solution) → Wisdom (context)',
    viralMechanic: 'Slide 1 gets shared as meme. Reverse-reading forces full carousel swipes.'
  },

  // Pattern 3: Before-During-After (Inverted)
  beforeDuringAfterInverted: {
    name: 'Before-During-After (Backwards Read)',
    description: 'Show "after" state first as punchline, then reveal journey backwards',
    structure: [
      { slide: 1, visual: 'Success state (happy person/results)', text: 'Así quieres estar...' },
      { slide: 2, visual: 'Emotional moment (realization, breakthrough)', text: 'Hasta que descubriste que...' },
      { slide: 3, visual: 'Process (effort, multiple steps)', text: 'Entonces comenzaste...' },
      { slide: 4, visual: 'Root frustration', text: 'Porque estabas...' },
      { slide: 5, visual: 'Before state (stuck)', text: 'Y todo empezó aquí' }
    ]
  },

  // Pattern 4: Fast Facts (Quick Debunk)
  fastFactsInverted: {
    name: 'Fast Facts Inverted (Myth Busting)',
    description: 'Open with punchline myth, then systematically debunk',
    examples: [
      { myth: 'Más followers = Más ventas', truth: 'Engagement quality matters' },
      { myth: 'Publicar mucho = Vender mucho', truth: 'Strategy matters' },
      { myth: 'Hermosa foto = Conversión', truth: 'Copy + psychology matter' }
    ]
  }
};

// ── PHASE 26: ADVANCED CAROUSEL MESSAGE PATTERNS ──────────────────────────

export const advancedMessagePatterns = {
  beforeDuringAfter: {
    name: 'Before-During-After Journey',
    slides: ['Before (pain)', 'During (process)', 'After (transformation)'],
    psychology: 'Emotional arc forces completion. Relatability high.',
    shareability: 'Before/After extremely shareable'
  },

  misconceptionFlip: {
    name: 'Misconception Flip',
    slides: ['False Belief', 'Where it comes from', 'The trap', 'What\'s actually true', 'New path'],
    psychology: 'Personal revelation = high engagement',
    shareability: '"I believed this too" moment'
  },

  accumulationStrategy: {
    name: 'Small Act × Time = Big Result',
    formula: '1 small action × 365 days = Transformation',
    slides: ['Tiny act', 'Repetition over time', 'Math proof', 'Transformation', 'You can start today'],
    examples: ['1L water/day = Health', '5min/day = Expertise', '1 client/week = Business']
  },

  objectionLadder: {
    name: 'Escalating Objections',
    layers: ['Surface objection', 'Second layer', 'Third layer', 'Real fear', 'Permission forward'],
    psychology: 'Addresses multiple resistance levels',
    examples: ['Too expensive → Necessity doubt → Fear of failure']
  },

  contrastStory: {
    name: 'Two People, Opposite Paths',
    split: ['Person A (right path)', 'Person B (wrong path)'],
    result: 'Side-by-side comparison after time period',
    cta: 'Which person are YOU?'
  },

  frameworkReveal: {
    name: 'Framework Explanation',
    slides: ['Problem (complexity)', 'Framework introduced', 'Component 1', 'Components 2-3', 'Full system working'],
    psychology: 'Naming = memorability. Framework = scalability.'
  },

  patternInterrupt: {
    name: 'Expectation → Twist → Lesson',
    structure: ['Set expectation', 'Surprise twist', 'Why did this happen', 'The lesson', 'How YOU apply this'],
    psychology: 'Surprise = stop scroll + attention spike'
  },

  proofProgression: {
    name: 'Escalating Credibility Evidence',
    progression: ['Bold claim', 'Proof #1 (soft)', 'Proof #2 (stronger)', 'Proof #3 (strongest)', 'You can be next'],
    psychology: 'Accumulation = undeniable credibility'
  },

  speedVsQuality: {
    name: 'False Choice Revelation',
    structure: ['The dilemma', 'Speed path results', 'Quality path results', 'The twist (false choice)', 'Real path (both)'],
    psychology: 'Reframes limiting belief. Empowers action.'
  },

  authorityChallenge: {
    name: 'Question Expert Wisdom',
    structure: ['Conventional wisdom', 'What if they\'re wrong?', 'Evidence against', 'What\'s actually true', 'Think differently'],
    psychology: 'Permission to question = empowerment'
  }
};

// ── PHASE 26: CROSS-FORMAT STORYTELLING TEMPLATES ───────────────────────

export const storytellingTemplates = {
  herosJourney: {
    name: 'Hero\'s Journey (5-Act Story)',
    acts: [
      { act: 1, title: 'Ordinary World', duration: '5-10%', emotion: 'Relatability' },
      { act: 2, title: 'The Call', duration: '10-15%', emotion: 'Crisis/Realization' },
      { act: 3, title: 'Resistance & Journey', duration: '60-70%', emotion: 'Hope + Struggle' },
      { act: 4, title: 'The Transformation', duration: '10-15%', emotion: 'Breakthrough' },
      { act: 5, title: 'Return Changed', duration: '5-10%', emotion: 'Wisdom + Invitation' }
    ],
    adaptation: 'Product story (customer as hero), service story, founder story, learning story, health story'
  },

  problemAgitationSolution: {
    name: 'PAS Framework',
    sections: [
      { section: 'Problem', duration: '30-40%', action: 'Identify pain clearly' },
      { section: 'Agitation', duration: '30-40%', action: 'Amplify emotionally' },
      { section: 'Solution', duration: '20-30%', action: 'Reveal path forward' }
    ],
    timing: { video: '10s problem, 10s agitation, 10s solution', carousel: '2 slides problem, 2 agitation, 1 solution' }
  },

  beforeDuringAfter: {
    name: 'Timeline Narrative',
    parts: [
      { part: 'Before', emotion: 'Frustration/stuck', duration: 'Brief' },
      { part: 'During', emotion: 'Hope + struggle', duration: 'Extended' },
      { part: 'After', emotion: 'Joy/relief', duration: 'Celebration' }
    ]
  },

  curiosityLoop: {
    name: 'Question-Answer Cycle',
    cycle: [
      { stage: 'Hook', duration: 'First 3s', purpose: 'Stop scroll' },
      { stage: 'Setup', duration: '10-15s', purpose: 'Build context' },
      { stage: 'Build', duration: '20-30s', purpose: 'Tension increase' },
      { stage: 'Payoff', duration: '10-15s', purpose: 'Answer + satisfaction' }
    ]
  },

  teachingStory: {
    name: 'Educational Narrative Arc',
    components: [
      { component: 'Premise', duration: '5-10%', action: 'Introduce topic' },
      { component: 'Context', duration: '10-15%', action: 'Why it matters' },
      { component: 'Teaching', duration: '60-70%', action: 'Step-by-step breakdown' },
      { component: 'Application', duration: '10-15%', action: 'Try this now' }
    ]
  }
};

// ── PHASE 26: PLATFORM-SPECIFIC STORYTELLING ─────────────────────────────

export const platformStoryTiming = {
  instagramCarousel: {
    format: '5 slides',
    timing: 'User controls pace (can swipe fast or slow)',
    structure: 'Hook → Build (2-3 slides) → Reveal/Deliver → CTA',
    typography: 'Bold + readable on mobile',
    recommendation: 'Each slide answers question from previous slide'
  },

  instagramReel: {
    duration: '15-60 seconds',
    timing: {
      first: '0-3s: Unmissable hook (trending audio)',
      middle: '3-45s: Build curiosity + deliver value',
      end: '45-60s: Memorable ending'
    },
    format: 'Fast cuts, text overlays, captions',
    recommendation: 'Audio-first design'
  },

  instagramStory: {
    format: '4-5 frames',
    timing: 'One swipe = one beat',
    pacing: 'Rapid fire, escalating urgency',
    structure: 'Hook → Quick clips/images → Deliver → Offer → CTA',
    tools: 'Emojis, stickers, text overlays, urgency',
    recommendation: 'Time limits + swipe-up CTAs'
  },

  tikTok: {
    format: '15-60 seconds',
    timing: {
      hook: '0-3s (MUST happen)',
      build: '3-15s (Pattern interrupt)',
      deliver: '15-45s (Teach/show/amuse)',
      end: '45-60s (Memorable, challenge or question)'
    },
    recommendation: 'Sound-first, subtitles mandatory'
  },

  youtubeShort: {
    format: '15-60 seconds',
    recommendation: 'Similar TikTok, can be extracted from longer videos',
    tools: 'Thumbnail + first frame critical'
  },

  linkedInPost: {
    hook: 'Provocative statement or question',
    body: 'Story or insight',
    proof: 'Stats, example, case study',
    cta: 'Engagement ask (comment, share, DM)',
    length: '1-3 paragraphs (mobile reading)',
    recommendation: 'Business language + personal touch'
  },

  blogPost: {
    subjectLine: 'Hook',
    firstParagraph: 'Grab attention',
    middle: 'Build case',
    keySection: 'Main insight',
    ctaSection: 'Clear next step'
  },

  email: {
    subject: 'Hook',
    body: 'Story',
    proof: 'Evidence',
    cta: 'Action'
  }
};

// ── PHASE 26: 150+ INDUSTRY ADAPTATIONS (Compact) ──────────────────────

export const industryAdaptations = {
  products: ['Phone', 'Laptop', 'Camera', 'Headphones', 'Watch', 'Shoes', 'Clothing', 'Makeup', 'Furniture', 'Tool', 'Gadget'],
  services: ['Gym', 'Therapy', 'Coaching', 'Consulting', 'Education', 'Travel', 'Beauty', 'Medical', 'Law', 'Finance'],
  experiences: ['Course', 'Book', 'Podcast', 'Retreat', 'Conference', 'Workshop', 'Program', 'Event'],
  tools: ['Software', 'App', 'Platform', 'Plugin', 'Template', 'Framework', 'Automation', 'AI'],
  food: ['Coffee', 'Protein', 'Supplements', 'Vitamins', 'Diet plan', 'Detox', 'Juice', 'Snack', 'Beverage'],
  health: ['Gym', 'Sauna', 'Stretching', 'Sleep gadget', 'Meditation app', 'Fitness tracker', 'Nutrition'],
  business: ['Logo', 'Website', 'SEO', 'Ads', 'Analytics', 'CRM', 'Email marketing', 'Automation'],
  lifestyle: ['Car', 'House', 'Furniture', 'Decoration', 'Gadget', 'Fashion', 'Accessories', 'Travel gear'],
  digital: ['Followers', 'Views', 'Likes', 'Subscribers', 'Rankings', 'Traffic', 'Downloads', 'Engagement'],

  patternRule: 'Use INVERTED structure for ALL industries: Punchline (funny/bold) → Error (frustration) → Proof (data) → System (solution) → Wisdom (context)'
};

// ── UNIVERSAL MASTER FORMULA (All Patterns) ─────────────────────────────

export const universalStoryFormula = {
  grab: {
    duration: '3 seconds / Slide 1',
    purpose: 'Stop scroll',
    tactics: ['Emotional hook', 'Curiosity spike', 'Visual surprise', 'Bold statement']
  },

  connect: {
    duration: 'Middle section',
    purpose: 'Make them care',
    tactics: ['Character relatable', 'Show struggle/effort', 'Emotional: build investment']
  },

  reveal: {
    duration: 'Build to peak',
    purpose: 'Force continuation',
    tactics: ['Tension increase', 'Surprise or insight', 'Visual dynamic']
  },

  deliver: {
    duration: 'Payoff moment',
    purpose: 'Memorable takeaway',
    tactics: ['Answer question', 'Satisfying conclusion', 'Emotional relief/joy/wisdom']
  },

  invite: {
    duration: 'Final CTA',
    purpose: 'Engagement/conversion',
    tactics: ['Permission to act', 'Clear next step', 'Emotional empowerment']
  }
};

// ── PHASE 27: VISUAL GENIUS PATTERNS (Car/Hero Images + Genius Techniques) ──

export const visualGeniusPatterns = {
  // 4 PATTERNS FROM CAR/HERO IMAGES

  productHeroNegation: {
    name: 'Product Hero + Negation Statement',
    description: 'Product (phone/car) + "No necesitas..." statement. Permission messaging.',
    template: `
VISUAL:
- Product: [Bright color: orange/red/vibrant] (hero shot)
- Person: [Optional - minimalist or absent]
- Background: [Solid light color - beige/cream]
- Text: [Bold statement negating assumption]

COPY STRUCTURE:
"No necesitas [OLD BELIEF] para [OUTCOME]"
Examples:
- "No necesitas ser viral para vender"
- "No necesitas equipo grande para crecer"
- "No necesitas presupuesto alto para empezar"

PSYCHOLOGY:
Permission-based messaging. Removes barrier. Empowerment through simplification.

ADAPTATIONS:
- Product: iPhone, laptop, car, furniture, tool
- Service: Coaching, consulting, marketing, design
- Business: Startup, agency, store, platform
    `,
    psychology: 'Removes objections via permission language',
    shareability: 'High (empowering message)'
  },

  isolationMetaphor: {
    name: 'Isolation Metaphor (Solitude → Support)',
    description: 'Visual contradiction: isolated image + "not alone" message. Metaphor inversion.',
    template: `
VISUAL:
- Person/subject: [Isolated, alone, minimal background]
- Visual metaphor: [Astronaut, alone in space, island, etc]
- Color: [Contrasting accent: orange/red primary]
- Text: [Negation + solution]

COPY STRUCTURE:
"No tienes que [STRUGGLE] todo solo"
"Elevamos tu [IMPACT/GROWTH]"

Examples:
- "No tienes que hacerlo todo solo"
- "No estás solo en esto"
- "No tienes que cargar el peso solo"

PSYCHOLOGY:
Visual contradiction creates cognitive interest. Metaphor = safe entry to real message.
Vulnerability → trust building.

ADAPTATIONS:
- Service offering: Coaching, agency, consultant, team builder
- Support: Therapy, mentorship, community, tribe
- Business: Partnership, collaboration, network
    `,
    psychology: 'Metaphor inversion = memorable. Isolation visual + solidarity message.',
    shareability: 'High (vulnerable + hopeful)'
  },

  overheadCar: {
    name: 'Overhead Car (Directional Metaphor)',
    description: 'Overhead view of car/vehicle + directional/movement text. Metaphor: driving growth.',
    template: `
VISUAL:
- Product: [Car/vehicle overhead view - red/orange]
- Angle: [Diagonal composition - creates movement]
- Background: [Clean - white/light with stripe]
- Text positioning: [Overlapping composition, large typography]

COPY STRUCTURE:
"STEER YOUR [THING] TO [OUTCOME]"
"DRIVING YOUR [BUSINESS] [DIRECTION]"

Examples:
- "Steer your brand to the next level"
- "Driving your business beyond limits"
- "Navigate your success with us"

PSYCHOLOGY:
Directional metaphor (driving = control, movement, progress).
Overhead view = strategic perspective + accessibility (seeing whole picture).

ADAPTATIONS:
- Service: Marketing, consulting, strategy, coaching
- Business growth: Scaling, acceleration, direction, momentum
- Journey metaphor: Career, learning, transformation
    `,
    psychology: 'Driving metaphor = agency + momentum. Overhead view = strategy perspective.',
    shareability: 'Medium (aspirational)'
  },

  drivingBeyondLimits: {
    name: 'Driving Metaphor (Action + Transcendence)',
    description: 'Car + "beyond limits" text. Action verb + boundary-breaking outcome.',
    template: `
VISUAL:
- Car: [Dynamic angle - action pose]
- Color: [Monochromatic accent - orange/red]
- Text: [Bold action verb + transcendence outcome]

COPY STRUCTURE:
"DRIVING YOUR [OBJECT] BEYOND [LIMIT]"

Examples:
- "Driving your business beyond limits"
- "Taking you beyond competition"
- "Pushing past boundaries"

PSYCHOLOGY:
Action verb (driving) + transcendence (beyond limits) = growth narrative.
Car = motion + control. Combined = ambitious trajectory.

ADAPTATIONS:
- Ambition: Scaling, growth, transformation, excellence
- Breaking barriers: Innovation, disruption, breakthrough
- Performance: Speed, acceleration, momentum
    `,
    psychology: 'Driving = active control. Beyond = aspirational growth.',
    shareability: 'Medium (action-oriented, ambitious)'
  },

  // 6 GENIUS PATTERNS (Psychology + Technique)

  typographyPhysicalLayer: {
    name: 'Typography Overlays Subject (Physical Interaction)',
    description: 'Text overlaps person/object like it\'s part of composition. Not floating - embedded.',
    template: `
VISUAL:
- Subject: [B&W or muted color for contrast]
- Text: [Large bold typography in accent color]
- Positioning: [Overlaps subject\'s body - chest, shoulders, center]
- No background clutter: [Clean, focused, high contrast]

COPY:
Bold single statement overlaid on person

PSYCHOLOGY:
Text becomes part of person\'s identity, not separate decoration.
Merging text + subject = ownership, embodiment, belief.

ADAPTATIONS:
- Fashion: Brand name overlaps model\'s chest
- Coaching: Service name overlaps coach\'s shoulders
- Music: Album title overlaps artist\'s body
- Sport: Achievement text overlaps athlete
- Business: Company name overlaps founder
    `,
    psychology: 'Text merging = embodied messaging, not external promotion',
    shareability: 'High (bold, personal)'
  },

  productAsCanvas: {
    name: 'Product Surface as Text Canvas (Overhead Integration)',
    description: 'Product (table/surface) becomes readable canvas. Text floats ON product.',
    template: `
VISUAL:
- Product: [Overhead view - fills 60% slide]
- Text: [Bold typography floats ON surface]
- Real elements: [Billiard balls, objects positioned strategically]
- Info boxes: [Colored rectangles with details scattered]
- Texture: [Wood, felt, fabric - real-world material visible]

PSYCHOLOGY:
Product surface = readable space. Text + objects merge into one design.
Not "text over image" but "text as part of surface."

ADAPTATIONS:
- Pool table → Pool hall event (billiards setup)
- Coffee table → Café booking (cups, napkins)
- Yoga mat → Fitness class (exercise setup)
- Dinner table → Restaurant reservation (place settings)
- Game board → Gaming tournament (game pieces)
    `,
    psychology: 'Product becomes usable canvas. Text integration = functional design.',
    shareability: 'High (clever integration, memorable)'
  },

  surealGeometryReal: {
    name: 'Surreal Geometry + Real Product (Impossible Perspective)',
    description: 'Geometric person (sphere head) + real product overhead. Perspective collision.',
    template: `
VISUAL:
- Real product: [Overhead view - car, bike, device]
- Geometric person: [Sphere head, minimal features, silhouette]
- Positioning: [Person appears above/beside product - impossible angle]
- Color: [Monochromatic + single accent]
- Text fills negative space: [Bold typography]

PSYCHOLOGY:
Impossible perspective = surreal, memorable, eye-catching.
Geometric abstraction + photorealism = tension = attention.

ADAPTATIONS:
- Car shop: Geometric driver + car overhead
- Tech store: Sphere-head hacker + laptop overhead
- Fashion: Abstract silhouette + handbag overhead
- Pet service: Geometric poodle + dog overhead
- Furniture: Geometric sitter + chair overhead
    `,
    psychology: 'Impossible perspective = surreal magnetism. Collision = memorability.',
    shareability: 'High (surreal, shareable)'
  },

  floatingInformationArchitecture: {
    name: 'Floating Information (Data as Visual Elements)',
    description: 'Person center + info boxes drift organically around. Data = design.',
    template: `
VISUAL:
- Person/subject: [Professional pose, B&W center]
- Main text: [Large overlays center]
- Floating boxes: [Colored rectangles - red/blue - drift around subject]
- Each box: [Date, location, time, detail]
- Layout: [Organic drift, no grid alignment]

PSYCHOLOGY:
Information floats like ephemeral elements. Not labels/annotations - they\'re part of visual.
Scattered = dynamic, organic, natural.

ADAPTATIONS:
- Concert tour: Person + floating tour dates/cities
- Medical: Doctor + floating appointment times/locations
- Author: Writer + floating book event locations
- Business: Founder + floating milestone dates
- Trainer: Coach + floating class schedules
    `,
    psychology: 'Information as design element, not annotation. Floating = dynamism.',
    shareability: 'High (information + visual merge)'
  },

  monochromeAccentColor: {
    name: 'Monochrome + Single Accent (Maximum Contrast)',
    description: 'B&W main image + ONE bold color only. Simplicity = impact.',
    template: `
VISUAL:
- Main image: [B&W or muted, high contrast]
- Accent color: [Single bold color ONLY: red OR blue OR neon]
- Typography: [Large, overlaid in accent color]
- Supporting text: [Also accent color, minimal]
- Background: [Clean white/light, no clutter]

PSYCHOLOGY:
One color choice = maximum visual impact, clarity, premium feel.
Simplification = sophistication. Contrast = readability.

ADAPTATIONS:
- Fashion: Red text on B&W model
- Finance: Blue text on B&W coins/money
- Tech: Neon green text on B&W device
- Sport: Red text on B&W athlete
- Luxury: Gold text on B&W product
    `,
    psychology: 'Single color decision = premium sophistication. Extreme contrast = clarity.',
    shareability: 'High (clean, professional)'
  },

  doubleExposureLayered: {
    name: 'Double Exposure + Layered Typography (Merging Subjects)',
    description: 'Multiple people merged + text overlays both. Intimacy + mystery.',
    template: `
VISUAL:
- Multiple subjects: [2-3 people merged/overlapped seamlessly]
- Texture background: [Subtle grain/lines, beige/tan]
- Large typography: [Overlays both merged figures]
- Elegant script: [Secondary fancy font layer]
- UI elements: [Integrated - music player, controls, etc.]

PSYCHOLOGY:
Merging = partnership, intimacy, collaboration.
Double exposure = mystique, connection, unity.
Layering = complexity within simplicity.

ADAPTATIONS:
- Music: Two singers merged + song title
- Business: Two entrepreneurs merged + company name
- Relationship: Couple merged + partnership name
- Team: Multiple people merged + team name
- Book: Co-authors merged + title
    `,
    psychology: 'Merging = belonging + unity. Double exposure = intimacy.',
    shareability: 'High (mysterious, relatable)'
  },

  // ── PHASE 28: AUTO/MECHANIC PATTERNS ────────────────────────────────────────

  speedBlurredMechanic: {
    name: 'Speed Blurred Motion (Mechanic Hero)',
    description: 'Mechanic on bike/vehicle with motion blur. Speed = expertise.',
    template: `
VISUAL:
- Mechanic: [Professional uniform, red/orange accent]
- Vehicle: [Bike/moto, front angle, sharp focus]
- Motion blur: [Background streaked, 30% opacity red gradient]
- Lighting: [Hot spot on mechanic, cold background]
- Text overlay: [Large bold headline, white stroke for contrast]

COPY (5-8 WORDS):
"Tu auto en manos de expertos" (Your car in expert hands)
"Reparación que no te frena" (Repair that won't slow you)
"Velocidad y precisión garantizada" (Speed and precision guaranteed)

PSYCHOLOGY:
Motion = speed = efficiency. Mechanic confidence = trust. Red = action, energy.

ADAPTATIONS:
- Car shop: "Cambios de aceite express"
- Brake service: "Frenadas de confianza"
- Transmission: "Velocidades sin demora"
- Suspension: "Manejo suave garantizado"
- Electrical: "Chispas de precisión"
- Tire service: "Agarre en cada ruta"
    `,
    psychology: 'Blur effect = speed perception. Mechanic hero = trust + authority.',
    shareability: 'High (dynamic, viral motion)'
  },

  beforeAfterEngine: {
    name: 'Before-After Engine (Visual Transformation)',
    description: 'Stock engine vs tuned engine side-by-side. Visible transformation.',
    template: `
VISUAL:
- Left half: [Original engine, muted grays, tired look]
- Right half: [Tuned engine, vibrant reds/golds, shiny parts highlighted]
- Center divider: [Thin white line or arrow pointing right]
- Typography: [BEFORE | AFTER in large white type]
- Overlay: [Performance specs (+HP, +Torque labels)]

COPY (HEADLINE):
"Stock vs Optimizado" (Stock vs Optimized)
"Rendimiento +40%" (Performance +40%)
"Tu motor dormido vs despierto" (Your sleepy motor vs awake)

PSYCHOLOGY:
Before-after = transformation proof. Visual = credibility. Metrics = trust.

ADAPTATIONS:
- Tuning shop: "400 HP sin modificación"
- Detailing: "Sucio vs impecable"
- Paint: "Oxidado vs espejo"
- Interior: "Gastado vs nuevo"
- Suspension: "Tieso vs suave"
- Electrónico: "Lento vs instantáneo"
    `,
    psychology: 'Before-after = cognitive closure. Proof in image form = high credibility.',
    shareability: 'Very high (transformation porn)'
  },

  partDissectionGrid: {
    name: 'Part Dissection Grid (Component Breakdown)',
    description: '3x3 grid showing disassembled car parts. Educational + impressive.',
    template: `
VISUAL:
- Black marble/dark background
- 9 slides (3x3): Each slide isolated component (engine, turbo, exhaust, spark plugs, etc)
- Each part: [Close-up shot, isolated, neon accent line around it]
- Neon color: [Cyan/electric blue, consistent]
- Icon/label: [Part name + one spec, white text]
- Layout: [Clean grid, even spacing]

COPY (MINIMAL):
"SORPRESAS DESGRACADAVEIS" (Ugly surprises)
"LO QUE NO VES" (What you don't see)
"Componentes que importan" (Components that matter)

PSYCHOLOGY:
Dissection = transparency + education. Grid = organized expertise. Neon = modern, technical.

ADAPTATIONS:
- Mechanics: "Diagnóstico completo"
- Auto parts: "Catálogo visual"
- Electric: "Sistema eléctrico desarmado"
- Suspension: "Geometría de precisión"
- Brakes: "Componentes de frenada"
    `,
    psychology: 'Transparency = trust. Grid = organized authority. Neon = modern tech vibes.',
    shareability: 'High (educational, shareable content)'
  },

  professionalMechanicHero: {
    name: 'Professional Mechanic Portrait (Expertise Hero)',
    description: 'Portrait of mechanic with tools/credentials visible. Trust builder.',
    template: `
VISUAL:
- Mechanic: [Professional pose, clean uniform, confident expression]
- Background: [Garage/workshop blurred, warm lighting]
- Credentials: [Floating boxes: certifications, years experience, specializations]
- Tools: [1-2 key tools visible in hand or beside]
- Color: [Warm tones, garage aesthetic, orange/red accents]

COPY (CREDENTIAL STACK):
"10 años de experiencia"
"Certificado en [SPECIALIZATION]"
"Más de 1000 autos reparados"
"Garantía en cada trabajo"

PSYCHOLOGY:
Person = trust + humanity. Credentials = authority. Experience visible = credibility.

ADAPTATIONS:
- Brake specialist: "Experto en sistemas ABS"
- Electrical: "Máster en electricidad automotriz"
- Transmission: "Especialista en cambios automáticos"
- Suspension: "Alineador certificado"
- Paint: "Pintor profesional con garantía"
    `,
    psychology: 'Face = immediate trust. Credentials = authority. Floating data = authority pyramid.',
    shareability: 'Medium-high (personal, credible)'
  },

  shockFactorDiagnosis: {
    name: 'Shock Factor Diagnosis (Discovery Moment)',
    description: 'Mechanic discovering problem. Surprise + solution messaging.',
    template: `
VISUAL:
- Mechanic: [Surprised/concerned expression, pointing at problem]
- Problem area: [Close-up highlighted in red circle]
- Damage visible: [Rust, worn part, broken component]
- Text: ["ENCUENTRAMOS...", "EL PROBLEMA"]
- Color: [Red background or red accent, urgent feeling]

COPY (REVELATION):
"Encuentramos lo que nadie ve"
"El error que te cuesta dinero"
"Lo que falta en tu mantenimiento"

PSYCHOLOGY:
Shock = attention capture. Discovery = engagement hook. Problem visualization = motivation to act.

ADAPTATIONS:
- Corrosion specialist: "Óxido invisible que avanza"
- Belt service: "Correa que está fallando"
- Coolant: "Líquido contaminado"
- Filter: "Aire que respira sucio"
    `,
    psychology: 'Shock = capture attention. Problem visibility = motivation to solve. Red = urgency.',
    shareability: 'High (wow moment, shareable discovery)'
  },

  serviceStackingChecklist: {
    name: 'Service Stacking (Multiple Services Checklist)',
    description: 'Carousel showing multiple service options. Solution abundance.',
    template: `
VISUAL:
- Left: [Professional checkboxes, clean design]
- Each service: [Icon + name + checkmark]
- Services shown: [Oil change, filters, brakes, suspension, etc]
- Right: [Pricing or savings highlight]
- Color: [Green checkmarks, red pricing highlight]

COPY (SERVICE LIST):
✓ Cambio de aceite
✓ Filtros (aire, combustible, cabina)
✓ Pastillas de freno
✓ Rotación de llantas
✓ Diagnóstico completo

PSYCHOLOGY:
Abundance = perceived value. Checklist = organized expertise. Visual = scannable.

ADAPTATIONS:
- Tire shop: "Toda la gama de neumáticos"
- Battery: "Baterías por marca/modelo"
- Accessories: "Catálogo completo"
    `,
    psychology: 'Abundance = high-value offer. Checklist = organized, trustworthy.',
    shareability: 'Medium (informational, useful)'
  },

  colorBlockingCar: {
    name: 'Color Blocking Car (Brand Identity)',
    description: 'Bold solid color background + car hero shot. Premium aesthetic.',
    template: `
VISUAL:
- Background: [Single bold color: red OR black OR orange]
- Car: [Professional side angle shot, centered, clean]
- Text: [Large bold white type, top/bottom]
- Minimal: [No clutter, focus entirely on car]

COPY (BRAND POSITIONING):
"Especialistas en velocidad"
"Tu auto merece más"
"Rendimiento premium"

PSYCHOLOGY:
Color psychology: Red=action/energy, Black=premium/power, Orange=enthusiasm.
Minimal = sophistication. Car hero = pride.

ADAPTATIONS:
- Tuning shop: Red background
- Luxury repair: Black background
- Young/energy: Orange background
- Custom shop: Gradient background
    `,
    psychology: 'Bold color = brand recognition. Minimal = premium. Car hero = aspiration.',
    shareability: 'High (clean, brandable)'
  },

  carouselPreviewMockup: {
    name: 'Carousel Preview Mockup (Meta Pattern)',
    description: 'Phone mockup showing carousel, then actual carousel follows.',
    template: `
VISUAL:
- Phone: [Left 40%, showing carousel UI with slide indicators]
- Slides previewed: [4 thumbnails visible in mockup]
- Actual slides: [Right 60%, showing expanded versions]
- CTA: [Bold "RESERVA" or "AGENDA" button]

COPY (MOCKUP INSIDE):
"Mira nuestros servicios"
"Elige tu horario"
"Reserva en 30 segundos"

PSYCHOLOGY:
Mockup = transparency, showing actual experience. Carousel preview = scanability.
Meta (carousel about carousel) = engagement.

ADAPTATIONS:
- Shop booking: "Agenda tu cita aquí"
- Service selection: "Elige servicio"
- Fleet options: "Selecciona tu vehículo"
    `,
    psychology: 'Transparency = trust. Meta carousel = novelty + engagement.',
    shareability: 'Medium (innovative, unique format)'
  },

  testimonialTrust: {
    name: 'Testimonial + Trust (Social Proof)',
    description: 'Customer face + quote + results. Third-party credibility.',
    template: `
VISUAL:
- Customer: [Smiling face, real person, professional photo]
- Background: [Garage or with car visible]
- Quote: [In speech bubble or overlay, white text]
- Results: [Before-after metrics OR satisfaction rating]

COPY (TESTIMONIAL):
"Llevé mi auto a [Shop] y quedé impresionado"
"Reparación rápida, precio justo, garantía real"
"Meses después, sigue andando impecable"
Rating: ⭐⭐⭐⭐⭐

PSYCHOLOGY:
Face = trust. Real customer = authenticity. Results = proof. Star rating = codified credibility.

ADAPTATIONS:
- Fleet customer: "Mis 5 autos en excelente estado"
- Dealership: "Clientes que vuelven"
- Specialist: "Expertos que recomiendo"
    `,
    psychology: 'Face + results = high credibility. Third-party voice = authentic trust.',
    shareability: 'Very high (social proof, relatable)'
  },

  ctaIntegration: {
    name: 'Call-to-Action Integration (Close Pattern)',
    description: 'Product/service showcase → Clear, frictionless CTA.',
    template: `
VISUAL:
- Service preview: [3-4 slides showing services/vehicles]
- CTA slide: [Bold headline + contact options]
- Buttons: [WhatsApp, Call, Website link, visible]
- Color: [Brand color for CTA, stands out]

COPY (CTA VARIATIONS):
"Reserva online en 30 segundos"
"Llama ahora: +56 912345678"
"Mensaje por WhatsApp"
"Agendar cita gratuita"

PSYCHOLOGY:
Multiple contact options = low friction. Clear urgency = conversion. Simplification = action.

ADAPTATIONS:
- Dealership: "Prueba de manejo"
- Service: "Diagnóstico gratis"
- Parts: "Cotización sin compromiso"
    `,
    psychology: 'Multiple CTAs = choice. Low friction = conversion. Urgency = action.',
    shareability: 'Low (conversion-focused, not social)'
  },

  // ── PHASE 28: LOGISTICS/TRANSPORT PATTERNS ──────────────────────────────────

  convenienceHookDelivery: {
    name: 'Convenience Hook (No Need Pattern)',
    description: 'User doesn\'t need to do X because service handles it.',
    template: `
VISUAL:
- Slide 1: [Person at home, relaxed, phone in hand]
- Slide 2: [App screen showing tracking]
- Slide 3: [Courier arriving with package]
- Slide 4: [Speed metric ("En 15 minutos")]
- Slide 5: [CTA button, bold]

COPY (PROBLEM ERASURE):
"Tú no necesitas buscar"
"Nosotros entregamos a tu puerta"
"Mientras tú trabajas, nos encargamos"
"En [TIME] llegamos"

PSYCHOLOGY:
Problem erasure = relief. Convenience = value. Speed metrics = proof.

ADAPTATIONS:
- Restaurant delivery: "No cocines hoy"
- Grocery: "No vayas al mercado"
- Pharmacy: "No esperes en fila"
- Parts delivery: "Consigue partes al instante"
- B2B: "Entrega mientras produces"
    `,
    psychology: 'Problem erasure = emotional relief. Convenience = premium positioning.',
    shareability: 'High (relatable, useful)'
  },

  geographicCoverageHero: {
    name: 'Geographic Coverage (Nationwide Trust)',
    description: 'Landmarks + vehicle showcase. "We reach everywhere."',
    template: `
VISUAL:
- Slide 1: [Landmark #1 + courier photo]
- Slide 2: [Service guarantee text]
- Slide 3: [National map with coverage points]
- Slide 4: [Vehicle fleet showcase]
- Slide 5: [CTA with regional claim]

COPY (GEOGRAPHY BUILDS TRUST):
"A encomenda, en el destino cierto"
"Nós chegamos a todo [PAÍS]"
"Confianza en cada región"
"Landmarks: São Paulo → Rio → Brasília"

PSYCHOLOGY:
Geography = local knowledge. Landmarks = city awareness. National scale = authority.

ADAPTATIONS:
- International: "Puerta a puerta en 50 países"
- Regional specialist: "Expertos en [REGION]"
- Bi-national: "Colombia ↔ Venezuela"
    `,
    psychology: 'Geography = local trust. Landmarks = place awareness. National = authority.',
    shareability: 'Medium (informational, regional interest)'
  },

  solutionStackingLogistics: {
    name: 'Solution Stacking (Multi-Service Flex)',
    description: 'Show multiple services, pricing, options. Abundance principle.',
    template: `
VISUAL:
- Slide 1: [Promo price highlight]
- Slide 2: ["Necesitas urgencia?" permission]
- Slide 3: [Service type showcase (movings/storage/express)]
- Slide 4: [Payment options (card/credit/cash)]
- Slide 5: [Educational tip or bonus]

COPY (OBJECTION HANDLERS):
"Tenemos solución para todo"
"Presupuesto flexible según necesidad"
"Pago sin estrés: tarjeta, efectivo, crédito"
"5 tips para empacar mejor"

PSYCHOLOGY:
Abundance = high value. Objection handling = confidence. Education = trust.

ADAPTATIONS:
- Movers: "Tamaños desde estudio hasta caseron"
- Freight: "Micro, pequeño, mediano, grande"
- Distribution: "Local, regional, nacional"
    `,
    psychology: 'Abundance = high-value perception. Flexibility = trust. Education = authority.',
    shareability: 'Medium-high (informational, useful)'
  },

  valueTriangleLogistics: {
    name: 'Value Triangle (Price + Speed + Trust)',
    description: 'Messaging balances three value pillars visually.',
    template: `
VISUAL:
- Slide 1: [Speed claim: "Envío seguro y rápido"]
- Slide 2: [Price comparison or savings math]
- Slide 3: [Multi-modal vehicles (truck + van + bike)]
- Slide 4: [Professional guarantee text]
- Slide 5: [Coverage + CTA]

COPY (TRIPLE POSITIONING):
"Melhor preço"
"Mejor servicio"
"Garantía en cada entrega"

PSYCHOLOGY:
Triangle = balance. Three pillars = comprehensive value. B2B professional = authority.

ADAPTATIONS:
- Courier: "Rápido, económico, confiable"
- Freight: "Capacidad, velocidad, seguridad"
- Distribution: "Cobertura, precio, exactitud"
    `,
    psychology: 'Triangle = complete value proposition. Three pillars = comprehensive.',
    shareability: 'Medium (B2B professional tone)'
  },

  surealDeliveryFantasy: {
    name: 'Surreal Delivery (Impossible Scenarios)',
    description: 'Product delivers in impossible/surreal location. Viral potential.',
    template: `
VISUAL:
- Slide 1: [Surreal scenario: hot air balloon, underwater, space, mountain top]
- Slide 2: [Product magically appears in crazy place]
- Slide 3: [Speed hero courier on vehicle, motion blur]
- Slide 4: ["Fastest delivery" data visual]
- Slide 5: [CTA in bold colors]

COPY (IMPOSSIBILITY MARKETING):
"Pedir lo imposible"
"Entregamos donde sea"
"Ni en la montaña te frenamos"
"Speed that defies physics"

PSYCHOLOGY:
Impossibility = viral (meme potential). Surprise = engagement. Hyperbole = memorable.

ADAPTATIONS:
- Food: "Burger en la montaña"
- Pharmacy: "Medicina en la playa"
- Flower: "Rosas desde las nubes"
- Tech: "Gadget desde el espacio"
- B2B: "Piezas industriales a cualquier lugar"
    `,
    psychology: 'Impossibility = viral, shareable. Hyperbole = memorable, entertaining.',
    shareability: 'Very high (meme-worthy, surreal)'
  },

  problemErasureLogistics: {
    name: 'Problem Erasure (Generic Template)',
    description: 'Fill-in-the-blank: "You don\'t need to X anymore."',
    template: `
VISUAL:
- Slide 1: [Pain state visualization - waiting, stress, chaos]
- Slide 2: [Old solution fails - outdated, slow]
- Slide 3: [New solution - clean, modern, fast]
- Slide 4: [Metric proof - time saved, cost reduced]
- Slide 5: [Permission slide - "Puedes confiar en nosotros"]

COPY TEMPLATE:
"No necesitas [OLD PAIN]"
"Porque nosotros [NEW SOLUTION]"
"En [TIME/METRIC] llegamos"
"Confía en quien entiende"

PSYCHOLOGY:
Problem erasure = emotional relief. Before-after narrative = satisfaction. Permission = trust.

ADAPTATIONS:
- "No busques frete en 10 transportadoras"
- "No esperes 3 días para tu paquete"
- "No pierdes control de tu envío"
- "No pagas sorpresas en destino"
    `,
    psychology: 'Problem erasure = relief + emotional connection. Narrative satisfaction.',
    shareability: 'High (relatable, problem-focused)'
  },

  specialistHeroLogistics: {
    name: 'Specialist Professional (Credentials Hero)',
    description: 'Driver/operator portrait with credentials floating. B2B authority.',
    template: `
VISUAL:
- Slide 1: [Professional operator portrait, with vehicle]
- Slide 2: [Credentials: "15 años experiencia"]
- Slide 3: [Equipment/tech showcase - GPS, temperature control, etc]
- Slide 4: [Success case - "X entregas completadas"]
- Slide 5: [Trust handoff - "Tu carga en buenas manos"]

COPY (AUTHORITY BUILD):
"Experto en carga especializada"
"Transporte de alto valor"
"Rastreamiento 24/7"
"Asegurado al 100%"

PSYCHOLOGY:
Face = immediate trust. Credentials = authority. Experience = proof. Equipment = professionalism.

ADAPTATIONS:
- Auto transport: "Piloto experto en vehículos de lujo"
- Cold chain: "Especialista en refrigeración"
- High-value: "Seguridad máxima"
    `,
    psychology: 'Face + credentials = high credibility. Professional equipment = trust.',
    shareability: 'Medium (B2B professional)'
  },

  speedEscalation: {
    name: 'Speed Escalation (Tiered Options)',
    description: 'Show speed progression: slow → fast → express. Urgency ladder.',
    template: `
VISUAL:
- Slide 1: [Standard option - truck, "48 horas"]
- Slide 2: [Express option - van, "24 horas"]
- Slide 3: [Ultra-fast option - bike/moto, "2 horas"]
- Slide 4: [Speed hero with motion blur, "Fastest delivery"]
- Slide 5: [CTA: "Elige tu velocidad"]

COPY (ESCALATION):
"48 horas: Económico"
"24 horas: Express"
"4 horas: Urgencia"
"2 horas: Supersónico"

PSYCHOLOGY:
Escalation = urgency ladder. User sees options without reading. Price ∝ speed.

ADAPTATIONS:
- Tiered shipping: Every layer has pricing
- Same-day: Hourly breakdowns
- On-demand: Real-time pricing
    `,
    psychology: 'Escalation = urgency ladder. User chooses based on need + budget.',
    shareability: 'Medium (informational, comparative)'
  },

  geographicCoverageReveal: {
    name: 'Geographic Coverage Reveal (Expansion Map)',
    description: 'Map shows expanding coverage. Narrative of growth.',
    template: `
VISUAL:
- Slide 1: [City spotlight - "Comenzamos en São Paulo"]
- Slide 2: [Regional expansion - map showing growth vector]
- Slide 3: [National scale - truck on highway, expansive vista]
- Slide 4: [International reach - plane, ship, ports visible]
- Slide 5: ["Entregamos en todo [REGION/PAÍS]" + CTA]

COPY (GROWTH NARRATIVE):
"2018: Uma cidade"
"2020: Três estados"
"2023: Todo Brasil"
"2024: América Latina"

PSYCHOLOGY:
Expansion = company growth visible + authority building. Map = aspirational. Timeline = proof.

ADAPTATIONS:
- "Ahora llegamos al Nordeste"
- "Expansión a Perú, Chile, Colombia"
- "50 ciudades, 10,000+ entregas"
    `,
    psychology: 'Geographic expansion = growth credibility. Timeline = proof of market fit.',
    shareability: 'Medium (company-focused, achievement-oriented)'
  },

  objectionLadderLogistics: {
    name: 'Objection Ladder (Addressing Doubts)',
    description: 'Start with common objection, climb to proof + permission.',
    template: `
VISUAL:
- Slide 1: [State objection: "¿Frete caro?"]
- Slide 2: [Solution intro with flexibility message]
- Slide 3: [Proof #1 - pricing example or comparison]
- Slide 4: [Proof #2 - case study or testimonial]
- Slide 5: [Permission - "Mereces flete justo"]

COPY (OBJECTION STACK):
"¿Frete muy caro?"
"Tenemos flexibilidad"
"Desde $5.90 por paquete"
"Mira este caso: 50% ahorro"
"Puedes contar con nosotros"

PSYCHOLOGY:
Objection = vulnerability opening. Addressing it = confidence. Proof ladder = credibility climb.

ADAPTATIONS:
- "¿Tarda mucho?" → Proof: "En 2 horas llegamos"
- "¿Se daña?" → Proof: "100% seguro o reembolso"
- "¿Qué horario?" → Proof: "Flexible, 24/7"
    `,
    psychology: 'Objection addressing = confidence. Proof ladder = credibility build.',
    shareability: 'High (problem-solving focused)'
  },

  // ── PHASE 29: STRATEGIC FORMULAS (Multi-Industry) ───────────────────────────

  strategicIdentityFormula: {
    name: 'Strategic Identity Formula (Branding Foundation)',
    description: 'Find brand essence before designing. 5-step discovery process.',
    template: `
SLIDE 1: IDENTIDAD NUCLEAR
"¿Quién eres REALMENTE?"
Visual: Formulario/worksheet design (Paint-style retro)
Copy: Haz estas preguntas:
- ¿Cuál es tu misión principal?
- ¿Qué problema SOLO tú resuelves?
- ¿Quién es tu cliente ideal? (edad, ingresos, dolor)
- ¿Qué valores NO negocías?

SLIDE 2: DIRECCIÓN VISUAL
"Define tu estética antes de crear"
Visual: Color palette swatches + typography samples
Copy: Decide:
- Colores primarios (máx 3)
- Tipografía (headlines, body, accent)
- Elementos visuales (geometric? organic? surreal?)
- Tono visual: premium/playful/professional/surreal?

SLIDE 3: VOZ Y TONO
"Cómo hablas con tu audiencia"
Visual: Speech bubble with voice tone examples
Copy: Define:
- ¿Formal o casual?
- ¿Educativo o entretenido?
- ¿Empático o directo?
- Ejemplos: "Yo soy quien dice..." / "Mi marca nunca dice..."

SLIDE 4: DIFERENCIADORES (LO QUE NO HACES)
"Define por lo que rechazas"
Visual: X marks (anti-patterns) vs check marks (your way)
Copy: Anti-patterns específicas:
- "NO usamos imágenes stock genéricas"
- "NO copiamos competencia"
- "NO hablamos en corporativo"
- "SIEMPRE priorizamos..."

SLIDE 5: GUÍA DE APLICACIÓN
"Cómo usar todo esto en carruseles"
Visual: Brand guide preview (system design)
Copy: Checkpoints:
- "Cada slide respeta estos colores"
- "Tipografía principal: [FONT]"
- "Voz es siempre: [TONE]"
- "Compartir si pases: identidad check ✓"

ADAPTATIONS BY USER TYPE:
- Emprendedor: Emphasis on "solving one specific problem"
- Empresario B2B: Emphasis on "enterprise positioning + trust metrics"
- Developer: Emphasis on "technical precision + documentation"
- Profesional independent: Emphasis on "personal brand + credibility stacking"
- Creator/influencer: Emphasis on "personality authenticity + audience connection"
- E-commerce: Emphasis on "product excellence + customer experience"
- Agency: Emphasis on "system scalability + client success stories"
    `,
    psychology: 'Identity before aesthetics. Foundation before building. Rejection defines inclusion.',
    shareability: 'High (framework-based, educational)'
  },

  templateReusabilityFormula: {
    name: 'Template Reusability Formula (Design Systems)',
    description: '5 slides to show "design once, use forever" power.',
    template: `
SLIDE 1: ESTRUCTURA BASE UNIVERSAL
"Un carrusel estructura que funciona para TODO"
Visual: 5-slide template grid
Copy: Template structure:
- Slide 1: Hook (problema o intriga)
- Slide 2: Desarrollo (contexto)
- Slide 3: Enseñanza (tu expertise)
- Slide 4: Prueba (resultado o caso)
- Slide 5: CTA (acción clara)

SLIDE 2: VARIABLES POR INDUSTRIA
"Misma estructura, contenido diferente"
Visual: 3-column comparison (product vs service vs creator)
Copy: Examples:
- Product: Hook product benefit → show features → proof photos → testimonial → Buy now
- Service: Hook solution promise → explain process → show expertise → case study → Book now
- Creator: Hook personal story → share lesson → teaching content → audience testimonial → Follow now

SLIDE 3: COPY HOOKS POR AUDIENCIA
"Hooks que funcionan para cada público"
Visual: Chat bubbles with different hook types
Copy: Hook templates:
- Entrepreneur: "Ganamos $X usando este sistema..."
- B2B: "5 empresas dejaron de perder dinero cuando..."
- Desarrollador: "Este código reduce latencia 70%..."
- Professional: "Mis clientes transformaron su negocio..."

SLIDE 4: ELEMENTOS VISUALES PRE-ARMADOS
"Elementos listos para usar"
Visual: Icon library, shape library, color swatches
Copy: Pre-built components:
- Icon library (50+ por categoría)
- Shape/frame templates
- Color palettes (5 opciones)
- Typography combos (10 pairings)
- Background patterns (15 styles)

SLIDE 5: GENERACIÓN ONE-CLICK
"De idea a carrusel en 5 minutos"
Visual: Timeline: Idea → Select template → Fill variables → Generate → Publish
Copy: Workflow:
"1. Elige template base"
"2. Ingresa tu industria + audiencia"
"3. Selecciona copy hook"
"4. Elige visual style"
"5. Genera carrusel automático"
CTA: "Prueba generador gratis"

ADAPTATIONS BY USER TYPE:
- Emprendedor startup: Speed is priority ("5 min carrusel")
- Empresario legacy: System is priority ("Consistencia en 50 carruseles")
- Developer: Technical is priority ("API integration + batch export")
- Independent pro: Personalization is priority ("Flexible, not cookie-cutter")
- Creator: Authenticity is priority ("My voice, not template voice")
    `,
    psychology: 'Templates = speed + confidence. Pre-built = reduced friction. One-click = adoption.',
    shareability: 'Very high (tool-focused, efficiency-driven)'
  },

  hookErrorActionResultCta: {
    name: 'Hook → Error → Action → Result → CTA Formula',
    description: 'Classic 5-slide persuasion structure (credibility climbing).',
    template: `
SLIDE 1: GANCHO CON PROMESA
Visual: Bold typography + problem visualization
Copy template: "[OUTCOME] en [TIMEFRAME]"
Examples:
- "+40% ventas en 30 días"
- "Tu auto +100HP sin dinero"
- "Entrega garantizada en 2 horas"
Psychology: Promise creates curiosity. Metric creates believability.

SLIDE 2: EL ERROR COMÚN
Visual: X mark or frustrated person
Copy template: "EL ERROR: la mayoría [WRONG BELIEF]"
Examples:
- "EL ERROR: Creen que dinero = ventas"
- "EL ERROR: Piensan que más potencia = mejor rendimiento"
- "EL ERROR: Asumen que caro = mejor servicio"
Psychology: Validation of pain. The audience recognizes their mistake. Trust builds.

SLIDE 3: ACCIONES TÉCNICAS
Visual: Step-by-step numbered (1, 2, 3, etc)
Copy template: "PASO 1: [TECHNICAL ACTION]"
Examples:
- "PASO 1: Estructura tu hook como pregunta"
- "PASO 1: Diagnostica el problema raíz"
- "PASO 1: Optimiza el ruteo del envío"
Psychology: Concrete, actionable steps. Transparency = expertise. Simplification = accessibility.

SLIDE 4: RESULTADO + BENEFICIO
Visual: Before-after or success celebration
Copy template: "Cuando aplicaste esto [METRIC] + [EMOTION]"
Examples:
- "Cuando hiciste esto: +$50k + confianza recuperada"
- "Resultado: auto ronronea + manejo suave"
- "Beneficio: clientes contentos + rentabilidad +30%"
Psychology: Result proves system works. Emotion = memory encoding.

SLIDE 5: CTA CLARA
Visual: Action button or next step
Copy template: "[ACTION VERB] + [SPECIFIC NEXT STEP]"
Examples:
- "Descarga la checklist gratuita"
- "Agenda diagnóstico sin costo"
- "Contáctanos para presupuesto gratis"
Psychology: Low friction. Clear action. Permission to move forward.

ADAPTATIONS BY USER TYPE:
- Emprendedor: Emphasis on speed/ROI metrics
- Empresario: Emphasis on system/scalability
- Developer: Emphasis on technical precision
- Profesional: Emphasis on expertise/credentials
- Creator: Emphasis on personal journey/authenticity
- E-commerce: Emphasis on product benefits/proof
- Service provider: Emphasis on process/results
    `,
    psychology: 'Promise-validation-proof escalation. Credibility climbs slide by slide. High conversion.',
    shareability: 'Very high (educational, proven formula)'
  },

  questionAnswerDetailApplicationCta: {
    name: 'Question → Answer → Detail → Application → CTA Formula',
    description: '5-slide problem-solving structure (audience engagement).',
    template: `
SLIDE 1: LA PREGUNTA QUE MÁS TE HACEN
Visual: Large question mark or thought bubble
Copy template: "¿ [QUESTION YOUR IDEAL CLIENT ASKS] ?"
Examples:
- "¿Cómo hago para vender más sin invertir más?"
- "¿Dónde encuentro mecánico confiable?"
- "¿Cómo envío urgente sin pagar caro?"
Psychology: Immediate relevance. The audience sees their exact question.

SLIDE 2: RESPUESTA DIRECTA (SIN AMBIGÜEDAD)
Visual: Bold type, simple background, no confusion
Copy template: "[DIRECT ANSWER IN 1 SENTENCE]"
Examples:
- "Respuesta: Usa copy que vende solo"
- "Respuesta: Busca certificaciones + reviews"
- "Respuesta: Servicio express con pricing flexible"
Psychology: Clarity = trust. Direct answer = respect for time.

SLIDE 3: EL DETALLE ESTRATÉGICO
Visual: Breakdown diagram or insider view
Copy template: "Lo que NO te cuenta la mayoría: [STRATEGIC DETAIL]"
Examples:
- "Lo que NOT dicen: El copy correcto vale 3x más que el anuncio"
- "Lo que omiten: Certificación ISO = 40% más confianza"
- "Lo que esconden: Consolidar envíos = 50% menos costo"
Psychology: Insider knowledge = authority. Non-obvious wisdom = shareable.

SLIDE 4: APLICACIÓN PRÁCTICA HOY
Visual: Walkthrough or checklist
Copy template: "Empieza HOY con esto:"
Examples:
- "Escribe 3 headlines usando esta fórmula"
- "Pide referencias a 3 mecánicos"
- "Consolidalos para cotización grupal"
Psychology: Actionable today = immediate value. No waiting = engagement.

SLIDE 5: CTA + INFORMACIÓN
Visual: Link/button + contact options
Copy template: "[ACTION] para [SPECIFIC OUTCOME]"
Examples:
- "Descarga template de copy → enlace en bio"
- "Llama para diagnóstico gratis → 👆 en conversaciones"
- "Contacta para cotización → WhatsApp"
Psychology: Multiple contact options = choice. Specific outcome = clarity.

ADAPTATIONS BY USER TYPE:
- Emprendedor: Emphasis on "do it yourself today"
- Empresario: Emphasis on "scale this system"
- Developer: Emphasis on "technical implementation"
- Profesional: Emphasis on "credibility markers"
- Creator: Emphasis on "audience engagement"
    `,
    psychology: 'Audience question = instant relevance. Direct answer = respect. Application = value.',
    shareability: 'Very high (Q&A format = natural sharing)'
  },

  numericTitleResourceBonusCtaFormula: {
    name: 'Numeric Title → Resources → Bonus → CTA Formula',
    description: '4-5 slide listicle structure (high engagement, quick scans).',
    template: `
SLIDE 1: TÍTULO NUMÉRICO IMPACTANTE
Visual: Large number + icon/visual
Copy template: "[NUMBER] [RESOURCE TYPE] que cambian todo"
Examples:
- "5 recursos de Canva que NO conocías"
- "7 pasos para diagnosticar autos"
- "10 tips para empacar sin daños"
Psychology: Number = specificity. Listicles = scannable = high shares.

SLIDE 2-4: RECURSO POR LÁMINA
Visual: Resource icon/preview + name + one-line benefit
Copy template: "[#] [RESOURCE NAME]: [ONE-LINE BENEFIT]"
Examples:
- "1. Mockups 3D: Muestra producto fotorrealista en segundos"
- "2. Font pairing tool: Tipografía correcta = diseño premium"
- "3. Color palette generator: Colores armoniosos automáticamente"
Psychology: Each resource is independent but part of collection. Scanning = satisfaction.

SLIDE 5 (OPTIONAL): BONUS TRACK
Visual: Gold star or "surprise" indicator
Copy template: "BONUS: [UNEXPECTED EXTRA VALUE]"
Examples:
- "BONUS: Template gratuita de embudo (no esperable)"
- "BONUS: Access 12 meses a biblioteca privada"
- "BONUS: Llamada de 30 min con experto"
Psychology: Surprise bonus = delight. Unexpected = memorable. Share-worthy.

FINAL SLIDE: CTA + GUARDADO
Visual: Save button or screenshot reminder
Copy template: "Guarda esto 📌 + acceso a [ADDITIONAL RESOURCE]"
Examples:
- "Guarda este carousel → Acceso a 20 templates más en bio"
- "Salva para referencia → Enlace a la planilla completa"
- "Screenshot y comparte → Gana acceso VIP"
Psychology: Save = retention. Sharing = network effect.

ADAPTATIONS BY USER TYPE:
- Emprendedor startup: "5 herramientas de growth gratis"
- Empresario: "7 sistemas de escalabilidad probados"
- Developer: "10 librerías que aceleran desarrollo"
- Profesional: "5 certificaciones que valen X sueldo"
- Creator: "10 formatos de contenido que explotan"
    `,
    psychology: 'Numbers = specificity. Lists = scannable. Resources = immediately useful. Bonus = delight.',
    shareability: 'Very high (listicle format is native-shareable)'
  },

  // ── PHASE 30: VISUAL INTELLIGENCE + PORTABLE SYSTEMS ────────────────────────

  errorVisualShock: {
    name: 'Error Visual Shock (Consequence Messaging)',
    description: 'B&W shocked faces + colored accent + "this destroys your brand" messaging.',
    template: `
VISUAL:
- Background: Black (dark, serious)
- People: 2-3 faces B&W, expressing shock/concern/frustration
- Accent color: Purple, neon, or brand color (thin outlines, small icons)
- Typography: Large white + accent color mixed
- Overlay: Small icons (broken heart, X mark, warning) in accent color
- Layout: People left/center, text right, unbalanced (creates tension)

COPY (CONSEQUENCES):
"El [ERROR VISUAL] que baja automáticamente la calidad de tu marca"
"...y pierdes [SPECIFIC CONSEQUENCE]"
- Loses sales
- Loses trust
- Loses audience
- Looks unprofessional
- Confuses customers

EXAMPLES:
"El uso inconsistente de colores que confunde a clientes"
"El logo pixelado que baja automáticamente tu credibilidad"
"La tipografía courrier que parece 1995 (y pierdes ventas)"

PSYCHOLOGY:
Shock = attention capture. Consequence = motivation. B&W + color = visual contrast = memorable.
Emotional + stakes = high shareability.

ADAPTATIONS:
- Brand: "El branding inconsistente que pierde confianza"
- Design: "El spacing incorrecto que cansa la vista"
- Content: "El copy vago que confunde a audiencia"
- Product: "El empaque genérico que no diferencia"
    `,
    psychology: 'Shock + consequence = motivation to fix. Visual contrast = memorability.',
    shareability: 'Very high (anxiety-driven, relatable problem)'
  },

  carouselConsistencySystem: {
    name: 'Carousel Consistency System (Branded Framework)',
    description: 'Fixed color palette + varied layouts + unified person/product integration.',
    template: `
VISUAL SYSTEM:
- Color palette: 3-4 fixed colors (e.g., yellow/green/cream/black)
- Layout variations: 5+ different compositional patterns
- Person integration: Consistent person across slides (brand ambassador feel)
- Product/mockup: Featured differently each slide (not repetitive)
- Shapes: Consistent geometric style (wavy, rounded, angular)

STRUCTURE:
Slide 1: Person + headline (primary introduction)
Slide 2: Product/service + benefit text (feature highlight)
Slide 3: Problem state (relatable)
Slide 4: Solution explanation (step-by-step or visual)
Slide 5: CTA + social proof (closing)

COPY PATTERN:
- Slide 1: Conversational question or hook
- Slide 2: Feature + benefit mashup
- Slide 3: Customer pain point (not YOUR problem, theirs)
- Slide 4: HOW system works (teach, don't sell)
- Slide 5: "Do this now" + proof

PSYCHOLOGY:
Consistency = brand recognition. Variety = no fatigue. Person = trust + humanity.
Repeated elements = subliminal cohesion.

ADAPTATIONS:
- Product launch: Consistent product + varied use cases
- Personal brand: Same person + different topics/services
- Agency: Consistent look + different client work
- Service: Same service + varied problem scenarios
    `,
    psychology: 'Consistency = recognition. Variety = engagement. Person = trust.',
    shareability: 'High (professional, branded, trustworthy)'
  },

  questionHookService: {
    name: 'Question Hook (Service Positioning)',
    description: '"Why hire MY service?" Question opens, carousel answers with proof.',
    template: `
SLIDE 1: THE QUESTION
Visual: Person headshot, thoughtful expression
Copy template: "Por qué contratar [MI SERVICIO]?"
Examples:
- "Por qué contratar o meu serviço de social media?"
- "¿Por qué elegir MY agencia de diseño?"
- "¿Por qué mi coaching es diferente?"

PSYCHOLOGY:
Question = immediate engagement. Audience MUST answer. Carousel then proves.

SLIDES 2-4: PROOF LAYERS
Slide 2: Authenticity + philosophy
Slide 3: Results or methodology showcase
Slide 4: Social proof + personality

COPY PROGRESSION:
- Slide 1: Question (creates cognitive gap)
- Slide 2: "Lee la leyenda y entienda cómo..." (invitation to discover)
- Slide 3: "Entenda mejor..." (deeper understanding)
- Slide 4: Metrics + proof ("97 clientes felices")

VISUAL TECHNIQUES:
- Magnifying glass icon (looking deeper)
- Timeline dates embedded (accountability)
- Metrics visible but humble (not bragging)
- Personality-driven (real person, not corporate)
- Thought bubbles or speech elements (dialogue feel)

ADAPTATIONS:
- Agency: "Por qué somos diferentes"
- Freelancer: "¿Por qué elegir mi servicio?"
- Coach: "¿Por qué mi método funciona?"
- Product: "¿Por qué este producto?"
    `,
    psychology: 'Question = cognitive engagement. Carousel answers = satisfaction. Proof = conversion.',
    shareability: 'High (question format is inherently engaging)'
  },

  portableSystemsFraming: {
    name: 'Portable Systems Framing (Immediately Usable)',
    description: 'Carousel teaches framework user can apply TODAY in their work.',
    template: `
POSITIONING:
"These aren't tutorials. They're PORTABLE SYSTEMS."
"Each carousel should feel like: 'Oh... I can use this in my work next time.'"

STRUCTURE (5 slides):
Slide 1: System name + hook ("How to FRAME your vertical")
Slide 2: Zone 1 visual guide (technical, "here's why this works")
Slide 3: Zone 2 visual guide (alternative, "or this also works")
Slide 4: Real-world application example
Slide 5: "Use this next time" permission + reminder

COPY CHARACTERISTICS:
- Practical, not theoretical
- "You can use this TODAY"
- Step-by-step, but integrated (not rigid list)
- Example-heavy, principle-light
- Immediately applicable to user's work

VISUAL GUIDANCE:
- Zone-based framing (show phone vertical optimization)
- Before-after or comparison layout
- Real photos from diverse industries (shows portability)
- Minimal text, maximum visual teaching
- Iconic labels (Zone 1: Text-heavy | Zone 2: Image-heavy)

PSYCHOLOGY:
Portable = low friction. "I can use this" = immediate value. Systems = replicable = confidence.

ADAPTATIONS:
- Design: "How to compose a thumbnail"
- Writing: "How to structure an email hook"
- Video: "How to frame a scene"
- Business: "How to structure a pitch"
    `,
    psychology: 'Portability = low friction + immediate utility. Systems = replicable confidence.',
    shareability: 'Very high (immediately useful, shareable framework)'
  },

  patternRecognitionStory: {
    name: 'Pattern Recognition Story (NOT Transformation Porn)',
    description: 'Help reader locate themselves in timeline. NOT "look how far I\'ve come" flex.',
    template: `
POSITIONING:
"These aren't 'look how far I've come' posts."
"They're pattern recognition stories that help the reader locate themselves in the timeline."
"Reader finds themselves. Reader sees progression possibility. Reader feels understood."

STRUCTURE (5 slides):
Slide 1: Starting point (vulnerable, real, relatable)
Slide 2: First small insight (recognition moment for reader)
Slide 3: Turning point (where reader might be NOW)
Slide 4: Current understanding (wisdom earned, not bragging)
Slide 5: "You're here, and you can get there too" (permission, not hierarchy)

COPY PATTERN:
- Slide 1: "I used to [BELIEF/BEHAVIOR]"
- Slide 2: "Then I realized [INSIGHT]"
- Slide 3: "Most people get stuck here [COMMON TRAP]"
- Slide 4: "But if you understand [PRINCIPLE], you move forward"
- Slide 5: "You might be in one of these stages. That's normal."

VISUAL APPROACH:
- Timeline-based (past → present, not finished → perfect)
- Person visible in each photo (shows humanity, not just achievement)
- Imperfect moments valued (not polished, curated highlight reel)
- Reader positioning (arrows, markers, "You are here" elements)

PSYCHOLOGY:
Reader self-location > creator glorification. Relatability > achievement. Growth = journey.

ADAPTATIONS:
- Business growth: "My scaling journey (and where you might be)"
- Personal brand: "My learning progression"
- Skill development: "How I became [EXPERTISE]"
- Mental health: "My healing journey (recognize yourself here)"
    `,
    psychology: 'Self-location > bragging. Relatability = trust. Timeline = possibility.',
    shareability: 'Very high (deeply relatable, non-aggressive, educational)'
  },

  timelineIntegrationPattern: {
    name: 'Timeline Integration (Dated Progress Narrative)',
    description: 'Visible dates/calendar elements + progress layers. Builds urgency + accountability.',
    template: `
VISUAL STRUCTURE:
- Background: Consistent grid/calendar aesthetic
- Dates visible: "19 de Dezembro", "20", "26", "27" (progress markers)
- Progression shown: Earlier dates → later dates (future visible)
- Color coding: Date highlight, event highlight (visual hierarchy)
- Icons/elements: Integration of date markers with content visuals

COPY INTEGRATION:
"Reunião de alinhamento: Opus estúdio" (date + event + person/brand)
"Produção de conteúdo" (date + activity)
Metrics at key dates: "19 de Dezembro - 97 posts"

PSYCHOLOGY:
Visible timeline = accountability. Future dates = urgency (limited time). Progress visible = motivation.
Calendar aesthetic = "I have a system" positioning.

ADAPTATIONS:
- Content calendar: Show production dates + publish dates
- Course delivery: Lesson dates embedded + progress tracking
- Product launch: Pre-launch → launch day → post-launch progress
- Personal brand: Content calendar transparency + deliverable dates
- Event promotion: Countdown calendar + building hype
    `,
    psychology: 'Timeline visibility = accountability + urgency. Dates = progress tangibility.',
    shareability: 'Medium (informational, systematic, professional)'
  },

  zoneBasedFraming: {
    name: 'Zone-Based Visual Framing (Vertical Optimization)',
    description: 'Define visual hierarchy zones. Zone 1 (text-heavy) vs Zone 2 (image-heavy).',
    template: `
CONCEPT:
"How to FRAME your vertical for maximum impact"
Each carousel teaches zone-based composition for vertical video/stories.

ZONE SYSTEM:
Zone 1: Upper 40% (text real estate, headlines, hooks)
Zone 2: Middle 40% (visual anchor, product/person)
Zone 3: Lower 20% (CTA, secondary info, interactive prompt)

SLIDE STRUCTURE:
Slide 1: "Here's how to frame content vertically"
Slide 2: Zone 1 focus - "This is where you put your hook" (text-heavy example)
Slide 3: Zone 2 focus - "This is where product lives" (image-heavy example)
Slide 4: Zone 3 focus - "This is your call-to-action zone"
Slide 5: Real-world mashup (all zones working together)

COPY:
- Minimal text (visual-first teaching)
- Each zone labeled with purpose
- Examples from different industries (shows portability)
- "Use this template next time you shoot vertical"

VISUAL GUIDANCE:
- Phone frame overlay (shows vertical orientation)
- Zone divisions marked (lines, color sections)
- Example content positioned correctly in zones
- Before (unoptimized) vs After (optimized) comparison

PSYCHOLOGY:
Zones = structure = confidence. Visual teaching = faster learning. Immediately applicable.

ADAPTATIONS:
- Video creation: Zone-based shot composition
- Story design: Zone-based layout planning
- Reel editing: Zone-based timing + visual placement
- Thumbnail design: Zone-based hierarchy for phone preview
    `,
    psychology: 'Zones = structure + confidence. Visual teaching = speed. Immediately useful.',
    shareability: 'High (technical but accessible, immediately useful)'
  },

  humbleMetricsIntegration: {
    name: 'Humble Metrics (Social Proof Without Bragging)',
    description: 'Numbers visible but embedded naturally. Proof without arrogance.',
    template: `
POSITIONING:
Numbers ≠ bragging. Numbers = proof of process.
"97 clients", "222 posts created", "55 testimonials" shown, not shouted.

PLACEMENT STRATEGY:
- Embedded in story (not featured)
- Context provided (what metrics mean, not raw numbers)
- Comparison avoided (not "better than")
- Process emphasized ("how we got here", not "look how big")

COPY INTEGRATION:
"97 clientes confían en nuestro proceso"
"222 carruseles publicados, 55 clientes satisfechos"
"Desde que comenzamos: X, Y, Z" (journey-focused, not achievement-focused)

VISUAL APPROACH:
- Small icons or badges (97, 222, 55)
- Integrated into design (not highlighted boxes)
- Surrounded by context (who, what, why, not just numbers)
- Narrative feel (numbers tell a story, don't brag)

PSYCHOLOGY:
Humble = trustworthy. Context = credible. Process = relatable.
Bragging = repels. Embedding = attracts.

ADAPTATIONS:
- Agency: Clients served + projects delivered (integrated narrative)
- Creator: Followers + engagement metrics (shown as byproduct, not goal)
- Product: Users + growth (framed as community, not conquest)
- Professional: Cases handled + success rate (embedded in teaching)
    `,
    psychology: 'Humble metrics = trust. Bragging = distrust. Embedded = authentic.',
    shareability: 'High (relatable, non-aggressive, credible)'
  },

  personalityQuestionMashup: {
    name: 'Personality + Question Mashup (Authentic Inquiry)',
    description: 'Real person headshot + genuine question in thought bubble. NOT rhetorical.',
    template: `
VISUAL:
- Headshot: Real person, authentic expression (not stock photo)
- Thought bubble: Genuine question (looks slightly confused, curious, thoughtful)
- Background: Clean, brand-colored (minimal distraction)
- Icons: Small personality markers (glasses, magnifying glass, lightbulb)
- Overall: Feels like "real person wondering about real problem"

COPY (THE QUESTION):
"Por que contratar o meu serviço?" (genuine inquiry, not rhetorical)
"¿Cómo construyo auténtica?" (real confusion, relatable)
"What's different about my method?" (honest self-questioning)

KEY DISTINCTION:
NOT: "Guess why my service is amazing?" (rhetorical, annoying)
YES: "Why SHOULD you hire me? Let me show you..." (genuine, inviting)

PSYCHOLOGY:
Authentic question = lowered defenses. Person + question = humanizes brand.
Thought bubble = internal dialogue (reader sees themselves thinking same Q).

FOLLOW-UP STRUCTURE:
Slide 1: Question + authentic person
Slide 2: "Here's why..." (start answering)
Slide 3: Proof or deep-dive
Slide 4: Application or case study
Slide 5: "Now YOU'RE ready to [hire/learn/buy]"

ADAPTATIONS:
- Service: "Why should you hire ME?"
- Product: "Why is THIS different?"
- Course: "What makes my teaching unique?"
- Personal brand: "What can I teach you?"
    `,
    psychology: 'Authentic question = lowered defenses. Person = humanized. Thought bubble = identification.',
    shareability: 'High (relatable, non-corporate, inviting)'
  },

  authenticityFirstPositioning: {
    name: 'Authenticity First (Real Problem, Real Solution)',
    description: 'Lead with genuine confusion/struggle. Solution secondary to relatability.',
    template: `
POSITIONING:
"Authenticity > Perfection. Real struggle > polished facade."

STRUCTURE (5 slides):
Slide 1: Real person in real struggle (vulnerable opening)
Slide 2: Real confusion or misconception (audience recognition moment)
Slide 3: How confusion trapped them (consequence, not judgment)
Slide 4: What actually solved it (simple, unglamorous solution)
Slide 5: "If you're struggling here, try this" (permission, not prescription)

COPY TONE:
- Conversational, not corporate
- Honest about difficulty (not toxic positivity)
- Solution is practical, not magical
- Emphasis on process, not outcome

VISUAL APPROACH:
- Imperfect moments valued (not retouched, filtered, polished)
- Person visible being REAL (not just success photo)
- Behind-the-scenes feel (workshop, desk, real environment)
- Casual composition (not perfectly framed)

PSYCHOLOGY:
Authenticity = vulnerability = trust. Imperfection = relatability.
Real problem + real solution = credible.

ADAPTATIONS:
- Business: "How I actually built this (unglamorous version)"
- Skill: "What really helped me learn this"
- Health: "Real talk about my struggle"
- Personal brand: "The messy middle of my journey"
    `,
    psychology: 'Authenticity > perfection. Vulnerability = trust. Real = relatable.',
    shareability: 'Very high (non-corporate, deeply relatable, shareable vulnerability)'
  },

  // ── PHASE 31: INSTAGRAM ALGORITHM INTELLIGENCE (2026) ─────────────────────

  nicheClaritySignal: {
    name: 'Niche Clarity Signal (Algorithm Amplification)',
    description: 'Clear niche positioning = algorithm understands who to show content to.',
    template: `
ALGO INSIGHT:
"The clearer your niche, the easier Instagram understands who to recommend you to."

Algorithm analyzes: likes, comments, saves, shares, watch time.
If signals are MIXED (fitness + fashion + business), algo gets confused = lower reach.
If signals are CLEAR (only fitness content + fitness interactions), algo AMPLIFIES.

CONTENT STRATEGY:
Slide 1: Define niche boundary ("I help [X] achieve [Y] without [Z]")
Slide 2: Show what you DON'T do (explicit non-niche content)
Slide 3: Prove niche clarity (3-5 recent posts all focused on niche)
Slide 4: Show audience alignment (comments from people IN niche)
Slide 5: "Pick your niche now" permission + CTA

COPY FRAMEWORK:
"I help [NICHE PERSON] do [SPECIFIC GOAL]"
- NOT: "I help everyone with everything"
- NOT: "I do design + marketing + coaching"
- YES: "I help personal trainers build online fitness communities"

VISUAL SIGNAL:
- Each slide clearly niche-focused
- Repeated visual elements (same color palette, same person, same setting = cohesion)
- Audience interaction visible (comments from niche members)
- No content drift (no random travel photos, food photos, unrelated topics)

PSYCHOLOGY:
Clarity = algorithm confidence = amplification.
Niche + consistent signals = Instagram sees pattern = recommends widely within that niche.

ADAPTATIONS:
- Personal brand: "Personal trainer → online fitness" (clear narrow niche)
- Product: "Eco-friendly water bottles → hiking community" (specific audience)
- Service: "Content creation → coaches specifically" (niche service)
    `,
    psychology: 'Clarity = confidence. Mixed signals = confusion. Algo amplifies clear niches.',
    shareability: 'High (educational, strategic positioning)'
  },

  creatorUserRelationship: {
    name: 'Creator-User Relationship Signal (Community Depth)',
    description: 'Algo prioritizes accounts with frequent interactions. Build relationships, not reach.',
    template: `
ALGO INSIGHT:
"Algorithm prioritizes content from people you interact with most."
Signals: comments, reactions, tags, saves, shares.
NOT: follower count.

STRATEGY: Depth over breadth.

STRUCTURE (5 slides):
Slide 1: "It's not about reaching everyone"
Slide 2: "It's about deepening relationships with YOUR people"
Slide 3: "Interactions that matter" (comment, save, share, tag)
Slide 4: "How to encourage depth" (ask questions, tag collaborators, create community moments)
Slide 5: "Your real audience size = repeat interactors" (find your 50-100 core people)

COPY POSITIONING:
"Don't chase 1M followers. Build 100 people who comment on everything."
"100 engaged followers > 1M ghost followers."
"Algorithm rewards accounts with deep community, not big audiences."

VISUAL APPROACH:
- Show comment threads (real interactions, visible)
- Highlight saves + shares (not just likes)
- Feature replies to comments (creator engagement visible)
- Tag collaborators/community members (shows relationship)

PSYCHOLOGY:
Depth = algorithmic confidence. Repeated interactions = pattern. Algo sees this = amplifies.
Follower count = vanity. Interaction depth = algorithm signal.

ADAPTATIONS:
- Creator: "Build 1000 true fans, not 100k fake fans"
- Brand: "5000 engaged customers > 50k inactive followers"
- Coach: "50 committed students > 500 browser students"
    `,
    psychology: 'Depth signals = algo amplification. Interactions > followers.',
    shareability: 'Very high (counter-narrative to follower obsession)'
  },

  recencyOptimization: {
    name: 'Recency Optimization (Timing + Freshness)',
    description: 'Recent content ranks higher. Timing + consistency = algorithm advantage.',
    template: `
ALGO INSIGHT:
"Instagram prioritizes recent content, but YOUR posting consistency matters."
Recent = higher initial reach.
Consistent posting = algo learns to show your content to followers at right time.

STRATEGY: Frequency + timing alignment.

STRUCTURE (5 slides):
Slide 1: "Recency is your algorithm advantage"
Slide 2: "Post when your audience is online" (analyze when YOUR followers engage most)
Slide 3: "Consistency > perfection" (weekly posting > random bursts)
Slide 4: "First 24-48 hours = critical window" (early engagement boosts algorithm)
Slide 5: "Set posting calendar" (planning beats spontaneity for algo)

COPY:
"A mediocre post published when your audience is online > perfect post at wrong time"
"Consistency = algorithm prediction = better reach"
"First engagement (first 2 hours) signals algo to boost content"

DATA TO TRACK:
- When your audience is most active (Instagram Insights)
- Your engagement rates by hour/day
- Which posts got engagement in first 2 hours
- Your natural posting rhythm

VISUAL STRATEGY:
- Show posting calendar (visual proof of consistency)
- Highlight early engagement (comments/saves in first hours)
- Compare timing impact (same content, different times = different reach)

PSYCHOLOGY:
Recency = freshness signal. Consistency = predictability. Algo optimizes for both.

ADAPTATIONS:
- B2B: "Post when your industry is working (9am-5pm)"
- Creator: "Post when your niche is scrolling (evenings + weekends)"
- E-commerce: "Post when shopping behavior peaks (Friday-Sunday)"
    `,
    psychology: 'Recency + consistency = algo confidence. Early engagement = amplification trigger.',
    shareability: 'High (actionable, data-driven strategy)'
  },

  sessionDurationOptimization: {
    name: 'Session Duration Optimization (Content Pacing)',
    description: 'Longer sessions = algo shows variety. Design content that keeps user scrolling.',
    template: `
ALGO INSIGHT:
"Instagram wants to maximize session duration."
- If user has 2-minute session: algo shows your BEST content first (high-value moments)
- If user has 20-minute session: algo shows variety (keeps engagement high)

YOUR ROLE: Design content that extends session duration.

CONTENT STRATEGY:
Slide 1: "Hook in first 0.5 seconds" (stop scroll instantly)
Slide 2: "First 3 seconds = headline job" (must stop scroll)
Slide 3: "Middle engagement" (sustain attention, build curiosity)
Slide 4: "End with micro-commitment" (like, save, comment, share)
Slide 5: "Series design" (multi-part content keeps users coming back)

COPY FRAMEWORK:
"Create carousel series, not one-off posts"
"Each carousel = one session value-add"
"Comments section = extend session (create conversation)"

VISUAL TIMING:
- Slide 1 (Reel/Carousel): Unmissable hook (0-3 seconds)
- Slide 2-3: Building tension + curiosity (keep scrolling)
- Slide 4-5: Payoff + reason to engage (comment, save, share)

PSYCHOLOGY:
Session length = algo priority. Longer sessions = more ads viewed = Instagram profit.
Your content either extends or cuts session short.

ADAPTATIONS:
- Entertainment: "Create cliffhanger carousels (forces next post view)"
- Education: "Series format (keeps students returning)"
- Product: "Carousel storytelling (product journey forces scroll)"
    `,
    psychology: 'Session duration = algo priority. Content pacing = engagement extension.',
    shareability: 'Medium-high (strategic, educational, immediately useful)'
  },

  originalityRewardSignal: {
    name: 'Originality Reward (Anti-Copy Penalty)',
    description: 'Instagram rewards original content. Copies penalized + tagged. Build original.',
    template: `
ALGO INSIGHT:
"Instagram actively penalizes content copies."
- Copies: ZERO recommendation (ghost penalized)
- Copies: Tagged with link to original
- Original: Amplified + prioritized
- Repost limit: 10+ reposts in 30 days = 1 month ghost (no reach)

STRATEGY: Original-first mindset.

STRUCTURE (5 slides):
Slide 1: "Copying costs you" (explain penalty)
Slide 2: "Instagram tracks originality" (how detection works)
Slide 3: "Significant modification isn't copy" (remixes + adaptations OK)
Slide 4: "Original content examples" (inspiration sources, not direct copies)
Slide 5: "Build original habit" (daily original content challenge)

COPY POSITIONING:
"Copy = 0 reach. Original = amplified."
"Remix + adapt = OK. Direct copy = penalized."
"10 reposts/month = shadow ban for 30 days"

CONTENT FRAMEWORK:
- Original: You create from scratch (high reward)
- Remix: You adapt + modify significantly (medium reward)
- Repost: You share + credit original (low reward + tagged)
- Copy: You duplicate without credit (PENALIZED)

VISUAL APPROACH:
- Show original content creation process
- Show remixing examples (before → after with YOUR spin)
- Avoid: Direct copies, generic trends without adaptation

PSYCHOLOGY:
Originality = platform value. Copies = waste of server space. Algo prioritizes unique.

ADAPTATIONS:
- Creator: "Your voice > trending sounds (when original)"
- Designer: "Your style > design trends copied"
- Writer: "Your perspective > trending topic topic"
    `,
    psychology: 'Originality = reward. Copies = penalize. Algo values unique content.',
    shareability: 'High (counter-trend advice, strategic edge)'
  },

  exploreTabRecommendations: {
    name: 'Explore Tab Recommendations (Discovery Algorithm)',
    description: 'Explore shows accounts based on interaction history. Optimize for discovery.',
    template: `
ALGO INSIGHT:
"Explore tab recommendations = not based on followers."
"Based on: Your interaction history + similar accounts' content"

Algorithm asks: "What has this user interacted with? Who else makes similar content? Show them."

STRATEGY: Get into Explore by optimizing interaction signals.

STRUCTURE (5 slides):
Slide 1: "Explore tab = discovery goldmine"
Slide 2: "Explore shows accounts YOU DON'T FOLLOW"
Slide 3: "But it's based on YOUR interests" (what you interact with)
Slide 4: "To appear in Explore: match niche + create quality" (algo matches similar accounts)
Slide 5: "Explore reach = exponential growth potential" (new audience, not current followers)

COPY:
"Explore tab users don't know you yet"
"They're already interested in YOUR niche (because they interact with similar content)"
"Explore = best place to find new audience without ads"

CONTENT OPTIMIZATION:
- Use hashtags wisely (helps algo categorize + recommend)
- Create content for YOUR niche (algo matches similar interests)
- Quality signals (saves, shares, comments) = Explore eligibility
- Avoid: Trending sounds without niche alignment (confuses recommendation)

VISUAL STRATEGY:
- Design specifically for Explore discovery (thumbnail appeal + clarity)
- First 3 seconds = unmissable (Explore users don't know you, need instant hook)
- Clear visual hook (what's the niche? immediately visible)

PSYCHOLOGY:
Explore = cold-to-warm audience. They don't know you but have matching interests.
Recommendation = algo confidence in content quality.

ADAPTATIONS:
- New creators: "Explore is your growth engine (before large follower base)"
- Niche brands: "Explore finds exact audience (interest matching)"
- Educators: "Explore finds students already interested in topic"
    `,
    psychology: 'Explore = algorithmic discovery. Interest-matching = recommendation.',
    shareability: 'High (growth strategy, educational, actionable)'
  },

  firstImpressionOptimization: {
    name: 'First Impression Optimization (Short Session Design)',
    description: 'Users with short sessions see your BEST content first. Design for instant impact.',
    template: `
ALGO INSIGHT:
"Short session users see highest-quality content first (algo prioritizes impact)."
"This means: Your BEST content must be immediately recognizable."

STRATEGY: First impression = make or break.

STRUCTURE (5 slides):
Slide 1: "Your first 3 seconds = critical"
Slide 2: "For short-session users, this IS your only chance"
Slide 3: "Design your BEST posts for maximum impact" (visual + copy clarity)
Slide 4: "Hook strategy: What stops scroll instantly?" (shock, question, surprise, beauty)
Slide 5: "Test your hooks" (which content gets instant saves/comments?)

COPY FRAMEWORK:
"In 3 seconds, the user must understand:"
- What content is this?
- Why should I care?
- What happens if I interact?

VISUAL RULES (3-SECOND TEST):
- Headline readable in thumbnail
- Main visual = unmissable (bold, clear, contrasting)
- Action clear (what should user do?)
- Niche obvious (who is this for?)

EXAMPLES:
- Question hook: "¿Qué error estás cometiendo?" (immediate curiosity)
- Contrast hook: "BEFORE | AFTER" (visual impact)
- Benefit hook: "This saves 5 hours per week" (value immediately clear)

PSYCHOLOGY:
First impression = algorithm signal. If short-session user engages = content is HIGH QUALITY.
Algo then shows to longer-session users as well.

ADAPTATIONS:
- Entertainment: "Shocking opening (0-1 second)"
- Education: "Clear value statement (0-2 seconds)"
- Product: "Beautiful hero shot (0-1 second)"
    `,
    psychology: 'First impression = quality signal. Short session = only chance. Make it count.',
    shareability: 'Very high (actionable, universally useful)'
  },

  communitySignalValue: {
    name: 'Community Signal Value (Beyond Likes)',
    description: 'Comments + saves + shares > likes. Design for community depth.',
    template: `
ALGO INSIGHT:
"Instagram algorithm weighs signals differently:"
- Like: +1 signal
- Save: +3 signals (user wants to return to it)
- Share: +5 signals (user wants others to see it)
- Comment: +7 signals (user invested thought in response)
- Comment reply: +10 signals (creates conversation thread)

STRATEGY: Design for saves, shares, comments > likes.

STRUCTURE (5 slides):
Slide 1: "Not all engagement is equal"
Slide 2: "Saves = intent (user plans to return)"
Slide 3: "Shares = trust (user endorses to friends)"
Slide 4: "Comments = investment (user thinks + responds)"
Slide 5: "Reply to comments = community depth (extend conversation)"

COPY CALLS TO ACTION:
- For saves: "Save this for next time"
- For shares: "Share this with someone who needs it"
- For comments: "What's YOUR [question]?"
- For replies: "[Tag person] - what do you think?"

DESIGN STRATEGY:
- End with question (forces comment)
- Include "save-worthy" value (bookmarking incentive)
- Create controversy gently (sharing incentive)
- Tag collaborators (creates reply threads)

VISUAL APPROACH:
- Show comment count prominently (social proof)
- Design for screenshot (share-worthy moments)
- End with visual cliffhanger (forces comment for explanation)

PSYCHOLOGY:
Deeper engagement = user investment. Investment = algorithm signal.
Community = stickiness = long-term reach.

ADAPTATIONS:
- Creator: "Ask audience questions (drive comments)"
- Educator: "Save-worthy templates + checklists"
- Brand: "Shareable insights (industry knowledge)"
    `,
    psychology: 'Comments > likes. Shares > comments. Community depth = algo priority.',
    shareability: 'Very high (counter-intuitive, valuable insight)'
  }
};

export default designPatternPrompts;
