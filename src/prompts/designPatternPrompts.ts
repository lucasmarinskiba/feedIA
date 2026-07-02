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
  },
});

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

export default designPatternPrompts;
