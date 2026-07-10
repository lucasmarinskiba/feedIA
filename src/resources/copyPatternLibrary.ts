/**
 * Phase 34: Copy Pattern Intelligence
 *
 * Learns: headlines, captions, copy tone, CTAs, objections
 */

export interface CopyPattern {
  id: string;
  name: string;
  type: 'hook' | 'benefit' | 'education' | 'social-proof' | 'cta' | 'objection';
  industry?: string;
  tone: 'formal' | 'casual' | 'punchy' | 'intimate' | 'urgent' | 'aspirational';

  template: string; // with [VARIABLES]
  examples: string[];

  psychology: string;
  whenToUse: string;

  powerWords?: string[]; // words that work
  emotionTriggers?: string[];
}

export const copyPatterns: CopyPattern[] = [
  // HOOK PATTERNS
  {
    id: 'hook-challenge',
    name: 'Challenge Hook',
    type: 'hook',
    tone: 'punchy',
    template: 'Desafío [OBJECT] [OUTCOME]',
    examples: [
      'Desafío os límites',
      'Desafío os límites das trilhas',
      'Challenge yourself today'
    ],
    psychology: 'Activates competitive spirit, curiosity',
    whenToUse: 'First slide to stop scroll',
    powerWords: ['Desafío', 'Límites', 'Vence', 'Conquista'],
    emotionTriggers: ['empowerment', 'challenge']
  },
  {
    id: 'hook-promo',
    name: 'Promo Lead',
    type: 'hook',
    tone: 'urgent',
    template: '[OFFER] [URGENCY]',
    examples: [
      'Frete grátis agora',
      'Grab it Before It\'s Gone',
      'R$ 200,90 limitado'
    ],
    psychology: 'FOMO + value proposition',
    whenToUse: 'High-competition carousels needing immediate attention',
    powerWords: ['Grátis', 'Limitado', 'Agora', 'Antes'],
    emotionTriggers: ['urgency', 'value']
  },
  {
    id: 'hook-aspiration',
    name: 'Aspiration Hook',
    type: 'hook',
    tone: 'aspirational',
    template: '[DREAM] [ACTION] [BENEFIT]',
    examples: [
      'Pedale ao lado de quem você ama',
      'Explore the world on a bike',
      'Vive la adventure'
    ],
    psychology: 'Emotional connection to lifestyle desire',
    whenToUse: 'Lifestyle/dream-based campaigns',
    powerWords: ['Pedale', 'Explore', 'Vive', 'Descubre'],
    emotionTriggers: ['aspiration', 'belonging', 'adventure']
  },
  {
    id: 'hook-motivation',
    name: 'Motivation/Urgency Hook',
    type: 'hook',
    tone: 'urgent',
    template: '[ACTION_VERB] [BOLD_OUTCOME]',
    examples: [
      'START STRONG TRAIN STRONGER',
      'NO ONE CARES WORK HARDER',
      'Desafío os límites',
      'GREATNESS DOESN\'T TAKE BREAKS'
    ],
    psychology: 'Activates drive, competitive spirit, action bias',
    whenToUse: 'Fitness/motivation carousels, first slide hook',
    powerWords: ['START', 'TRAIN', 'STRONGER', 'WORK', 'HARDER', 'NO ONE', 'PUSH'],
    emotionTriggers: ['empowerment', 'urgency', 'challenge', 'pride']
  },
  {
    id: 'hook-numbered-list',
    name: 'Numbered Benefits Hook',
    type: 'hook',
    tone: 'punchy',
    template: '[NUMBER] [BENEFIT_TYPE] to [OUTCOME]',
    examples: [
      '4 Ways to GET THE MOST OUT OF YOUR WORKOUTS',
      '3 Reasons to TRAIN TOGETHER',
      '5 Tips para DOMINAR el gym'
    ],
    psychology: 'Curiosity + promise of structure/clarity',
    whenToUse: 'Multi-slide education carousels, numbered structure',
    powerWords: ['Ways', 'Reasons', 'Tips', 'Steps', 'Secrets'],
    emotionTriggers: ['curiosity', 'clarity', 'anticipation']
  },

  // EDUCATION PATTERNS
  {
    id: 'edu-list-benefits',
    name: 'Benefits List',
    type: 'education',
    tone: 'casual',
    template: '[NUMBER] [BENEFIT_TYPE] de [PRODUCT]\n✓ [BENEFIT1]\n✓ [BENEFIT2]\n✓ [BENEFIT3]\n✓ [BENEFIT4]',
    examples: [
      '4 beneficios de usar bicicleta',
      '7 razones para cambiar',
      '5 tips para mejorar'
    ],
    psychology: 'Scannable, credible, comprehensive',
    whenToUse: 'Slides 3-4 in carousel (post-hook, pre-proof)',
    powerWords: ['Beneficios', 'Motivos', 'Razones', 'Tips'],
    emotionTriggers: ['clarity', 'trust', 'value']
  },

  // SOCIAL PROOF PATTERNS
  {
    id: 'proof-testimonial-person',
    name: 'Testimonial + Person',
    type: 'social-proof',
    tone: 'intimate',
    template: 'Faça como [PERSON] e [ACTION]\n"[QUOTE]"',
    examples: [
      'Faça como a Rebeca e adquira sua bike',
      'Join thousands who discovered this'
    ],
    psychology: 'Relatability + social proof merge',
    whenToUse: 'Middle-to-late carousel slides (proof)',
    powerWords: ['Como', 'Descobrir', 'Juntos'],
    emotionTriggers: ['belonging', 'trust', 'relatability']
  },

  // CTA PATTERNS
  {
    id: 'cta-action-verb',
    name: 'Action Verb CTA',
    type: 'cta',
    tone: 'punchy',
    template: '[VERB] + [OUTCOME]',
    examples: [
      'Explore más, vá de bike',
      'Adquira su bike',
      'Descubre el mundo',
      'Contáctanos hoy'
    ],
    psychology: 'Direct action request, clear next step',
    whenToUse: 'Final slide or mid-carousel call-out',
    powerWords: ['Explore', 'Adquira', 'Descubre', 'Actúa'],
    emotionTriggers: ['action', 'clarity']
  },
  {
    id: 'cta-pricing-urgency',
    name: 'Pricing + Urgency',
    type: 'cta',
    tone: 'urgent',
    template: 'R$ [PRICE] | [URGENCY_MESSAGE]',
    examples: [
      'R$ 2.379,00 | Limitado',
      'R$ 200,90 | Antes de que termine',
      'From $199 | Limited time only'
    ],
    psychology: 'Value clarity + FOMO',
    whenToUse: 'Product showcase slides',
    powerWords: ['Limitado', 'Antes', 'Exclusivo'],
    emotionTriggers: ['value', 'urgency']
  },
  {
    id: 'feature-checklist',
    name: 'Feature Checklist',
    type: 'education',
    tone: 'casual',
    template: '✓ [FEATURE]\n✓ [FEATURE]\n✓ [FEATURE]\n✓ [FEATURE]',
    examples: [
      '✓ Electric\n✓ Suitable for rehabilitation\n✓ Light weight\n✓ Quiet (< 40 dB)',
      '✓ Smooth operation\n✓ Adjustable weight\n✓ Compact design\n✓ Easy to assemble'
    ],
    psychology: 'Clarity, scannability, confidence building',
    whenToUse: 'Product feature slides, equipment carousels',
    powerWords: ['Suitable', 'Smooth', 'Adjustable', 'Compact', 'Electric'],
    emotionTriggers: ['clarity', 'confidence', 'trust']
  },
  {
    id: 'benefit-replacement',
    name: 'Benefit Replacement (What Replaces)',
    type: 'education',
    tone: 'casual',
    template: '[NUMBER] MINUTES A DAY WILL REPLACE:\n• [ACTIVITY1]\n• [ACTIVITY2]\n• [ACTIVITY3]',
    examples: [
      '30 MINUTES A DAY WILL REPLACE:\n• Jogging for 2 hours\n• Swimming for 1 hour\n• Cycling 3 kilometers'
    ],
    psychology: 'Time efficiency, value justification',
    whenToUse: 'Product carousel, efficiency-focused messaging',
    powerWords: ['WILL REPLACE', 'MINUTES', 'EQUIVALENT'],
    emotionTriggers: ['efficiency', 'value', 'convenience']
  },
  {
    id: 'community-motivation',
    name: 'Community Motivation',
    type: 'social-proof',
    tone: 'punchy',
    template: '[ACTION] TOGETHER [OUTCOME] TOGETHER',
    examples: [
      'TRAIN TOGETHER WIN TOGETHER',
      'Grow together, achieve together',
      'Community over isolation'
    ],
    psychology: 'Belonging, shared purpose, mutual support',
    whenToUse: 'Gym/coaching carousels, community-building',
    powerWords: ['TOGETHER', 'COMMUNITY', 'COLLECTIVE', 'TEAM'],
    emotionTriggers: ['belonging', 'power', 'support']
  },
  {
    id: 'why-choose-format',
    name: 'Why Choose This (Circular Format)',
    type: 'education',
    tone: 'casual',
    template: 'WHY CHOOSE THIS?\n◦ [REASON1]\n◦ [REASON2]\n◦ [REASON3]',
    examples: [
      'WHY CHOOSE THIS?\n◦ Space-saving design\n◦ Adjustable weight system\n◦ Easy to assemble'
    ],
    psychology: 'Justification, clarity, decision-making support',
    whenToUse: 'Product comparison, feature emphasis slides',
    powerWords: ['CHOOSE', 'ADVANTAGE', 'BENEFIT', 'REASON'],
    emotionTriggers: ['clarity', 'confidence']
  },
  {
    id: 'coach-introduction',
    name: 'Coach/Expert Introduction',
    type: 'social-proof',
    tone: 'casual',
    template: 'Meet [COACH_NAME]\n[TITLE/SPECIALTY]\n[BRIEF_CREDENTIAL]',
    examples: [
      'Meet Coach MIKE\nStrength Specialist\nWith 20+ years in the field'
    ],
    psychology: 'Authority building, personal connection, trust',
    whenToUse: 'Personal training carousels, expert introduction',
    powerWords: ['COACH', 'SPECIALIST', 'EXPERT', 'CERTIFIED'],
    emotionTriggers: ['trust', 'authority', 'familiarity']
  },
  {
    id: 'transformation-proof',
    name: 'Transformation/Results Proof',
    type: 'social-proof',
    tone: 'intimate',
    template: 'I Lost [RESULT] in [TIMEFRAME]\n"[TESTIMONIAL]"\n- [PERSON_NAME]',
    examples: [
      'I Lost 15lbs in 8 Weeks\n"This program changed my life. I\'m stronger, healthier, and confident."\n- Sarah T.'
    ],
    psychology: 'Relatability, proof of results, aspiration',
    whenToUse: 'Transformation carousels, case study slides',
    powerWords: ['Lost', 'Gained', 'Transformed', 'Achieved'],
    emotionTriggers: ['hope', 'aspiration', 'confidence']
  },
  {
    id: 'finance-question-hook',
    name: 'Finance Educational Question',
    type: 'hook',
    tone: 'formal',
    template: '[CONCEPT1] & [CONCEPT2]:\nQual a diferença?',
    examples: [
      'Faturamento & Lucro: Qual a diferença?',
      'Imposto & Taxa: O que muda?',
      'Investimento & Poupança: Qual escolher?'
    ],
    psychology: 'Curiosity + education positioning, builds trust (explaining complex topics)',
    whenToUse: 'First slide, finance education carousels',
    powerWords: ['Qual', 'Diferença', 'Como', 'Por quê'],
    emotionTriggers: ['curiosity', 'clarity-seeking', 'education']
  },
  {
    id: 'benefit-outcome-headline',
    name: 'Benefit/Outcome Headline (Finance)',
    type: 'hook',
    tone: 'urgent',
    template: '[ACTION_VERB] seu [OUTCOME]',
    examples: [
      'Maximize seu faturamento',
      'Recupere seus impostos',
      'Proteja seu patrimônio',
      'Reduza seus custos'
    ],
    psychology: 'Direct outcome promise, action bias, benefit-focused',
    whenToUse: 'Service promotion, financial benefit messaging',
    powerWords: ['Maximize', 'Recupere', 'Reduza', 'Aumente'],
    emotionTriggers: ['opportunity', 'gain', 'action']
  },
  {
    id: 'risk-avoidance-warning',
    name: 'Risk Avoidance / Prevention Warning',
    type: 'cta',
    tone: 'urgent',
    template: '[ACTION] ANTES de [RISKY_ACTION]!',
    examples: [
      'Cheque seu boleto ANTES de PAGAR!',
      'Verifique seus documentos ANTES de assinar!',
      'Consulte um contador ANTES de declarar!'
    ],
    psychology: 'Loss aversion, prevention focus, error avoidance',
    whenToUse: 'Risk/fraud prevention messaging, educational safety alerts',
    powerWords: ['Cheque', 'Verifique', 'Consulte', 'ANTES', 'CUIDADO'],
    emotionTriggers: ['caution', 'prevention', 'safety']
  },
  {
    id: 'qa-educational-service',
    name: 'Q&A Educational Service Offering',
    type: 'education',
    tone: 'casual',
    template: '[QUESTION]?\nConte com a nossa ajuda e saiba como funciona o que pode acontecer',
    examples: [
      'Como fazer a restituição do Imposto de Renda?\nConte com a nossa ajuda',
      'Como abrir uma empresa?\nNós orientamos passo a passo',
      'Como reduzir meus impostos?\nConsulte conosco'
    ],
    psychology: 'Invites engagement, positions company as helper/guide',
    whenToUse: 'Service promotion, educational sales, Q&A slides',
    powerWords: ['Como', 'Conte conosco', 'Saiba', 'Ajuda'],
    emotionTriggers: ['trust', 'support', 'clarity']
  },
  {
    id: 'myth-busting-belief',
    name: 'Myth-Busting / Belief Challenge',
    type: 'hook',
    tone: 'punchy',
    template: 'Ao contrário do que pensa\n[BELIEF_CHANGE]\n[NEW_REALITY]',
    examples: [
      'Ao contrário do que pensa\nContador\nNão é uma calculadora',
      'Ao contrário do que pensa\nSucessor não precisa ser parente',
      'Ao contrário do que pensa\nPME pode crescer exponencialmente'
    ],
    psychology: 'Cognitive dissonance drives engagement, repositioning, educational surprise',
    whenToUse: 'Brand positioning, belief-challenging carousels, myth-busting series',
    powerWords: ['Ao contrário', 'Na verdade', 'Surpreendentemente', 'Engano'],
    emotionTriggers: ['surprise', 'reconsideration', 'enlightenment']
  },
  {
    id: 'price-shock-hook',
    name: 'Price Shock Hook (Cost Assumption Challenge)',
    type: 'hook',
    tone: 'urgent',
    template: 'Quanto custa um [PROFESSIONAL] de R$ [SALARY] para [CONTEXT]?\nVocê acha que custa [GUESS]?',
    examples: [
      'Quanto custa um profissional CLT de R$ 4.000 para a sua clínica? Você acha que custa 4 mil?',
      'Quanto custa um freelancer de R$ 2.000 para seu e-commerce?',
      'Quanto custa um operador de R$ 3.000 para sua loja?'
    ],
    psychology: 'Price assumption challenge, hidden cost revelation, attention-grabbing',
    whenToUse: 'First slide, cost/hiring educational carousel, hidden cost revelation',
    powerWords: ['Quanto custa', 'Você acha que', 'Para', 'Realmente'],
    emotionTriggers: ['surprise', 'cost-awareness', 'curiosity']
  },
  {
    id: 'fear-identification-reality',
    name: 'Fear Identification + Reality Reveal',
    type: 'hook',
    tone: 'formal',
    template: 'O problema não é [WRONG_ASSUMPTION].\nO problema é [REAL_ISSUE]: [FEAR_EMOTION], [CONSEQUENCE1] e [CONSEQUENCE2].',
    examples: [
      'O problema não é escolher CLT. O problema é escolher no medo, sem calcular margem e sem entender risco.',
      'O problema não é escolher freelancer. O problema é escolher por preço, sem entender qualidade e sem avaliar risco.',
      'O problema não é contratar. O problema é contratar no medo, sem calcular ROI e sem entender impacto.'
    ],
    psychology: 'Emotional root cause identification, repositioning problem, trust building (company understands real issue)',
    whenToUse: 'Mid-carousel myth-busting, emotional resonance, positioning as solution',
    powerWords: ['O problema não é', 'O problema é', 'No medo', 'Sem entender', 'Sem calcular'],
    emotionTriggers: ['recognition', 'relief', 'trust']
  },
  {
    id: 'structured-comparison-consequences',
    name: 'Structured Comparison with Consequences',
    type: 'education',
    tone: 'formal',
    template: 'Agora compare com outros modelos:\n• [OPTION1]\n• [OPTION2]\n• [OPTION3]\n\nCada um tem:\n• [CONSEQUENCE1]\n• [CONSEQUENCE2]\n• [CONSEQUENCE3]\n• [CONSEQUENCE4]',
    examples: [
      'Agora compare com outros modelos:\n• Autônomo (CPF)\n• PJ\n• Sócio de Serviço\n\nCada um tem:\n• Estrutura diferente\n• Impacto tributário diferente\n• Risco trabalhista diferente\n• Impacto direto na lucratividade'
    ],
    psychology: 'Systematic comparison, consequence clarity, empowerment through options',
    whenToUse: 'Comparison carousel, decision-making clarity, option evaluation',
    powerWords: ['Compare', 'Modelos', 'Cada um tem', 'Diferente', 'Impacto'],
    emotionTriggers: ['clarity', 'empowerment', 'decision-readiness']
  },
  {
    id: 'calculation-reality-check',
    name: 'Calculation Reality Check (Specific Numbers + Impact)',
    type: 'education',
    tone: 'formal',
    template: 'Vamos fazer a conta real:\n[SALARY/COST]: R$ [AMOUNT]\n• [EXPENSE1]\n• [EXPENSE2]\n• [EXPENSE3]\n• [EXPENSE4]\n\n[REALITY_CHECK]: [HIDDEN_COST]. E isso impacta diretamente [OUTCOME].',
    examples: [
      'Vamos fazer a conta real:\nSalário: R$ 4.000\n• INSS patronal\n• FGTS\n• Férias + 1/3\n• 13º salário\n• Possíveis adicionais\n\nO custo anual não é 4 mil por mês. É muito mais. E isso impacta diretamente sua margem.'
    ],
    psychology: 'Credibility through specific numbers, consequence clarity, ROI consciousness',
    whenToUse: 'Cost breakdown slides, financial reality education, consequence messaging',
    powerWords: ['Conta real', 'Não é', 'É muito mais', 'Impacta diretamente'],
    emotionTriggers: ['revelation', 'credibility', 'concern']
  },
  {
    id: 'myth-series-numbered',
    name: 'Myth Series Intro (Set-Up for Multiple Myths)',
    type: 'hook',
    tone: 'formal',
    template: '[CATEGORY/TOPIC]: [PROBLEM_AREA]\nMITOS que prejudicam [OUTCOME]\n\nCom acompanhamento especializado, sua [CONTEXT] garante:\n1. [BENEFIT1]\n2. [BENEFIT2]\n3. [BENEFIT3]',
    examples: [
      'MITOS que prejudicam a saúde financeira da sua escola\n\nCom acompanhamento especializado, sua escola garante:\n1. Redução da inadimplência\n2. Maior segurança financeira\n3. Mais tranquilidade para focar no ensino'
    ],
    psychology: 'Series introduction, problem naming, benefit preview, credibility setup',
    whenToUse: 'First slide in myth-busting series, establish expertise + benefits',
    powerWords: ['MITOS', 'prejudicam', 'Acompanhamento especializado', 'Garante'],
    emotionTriggers: ['recognition', 'hope', 'authority']
  },
  {
    id: 'myth-challenge-reality',
    name: 'Myth Challenge + Reality Reframe',
    type: 'education',
    tone: 'formal',
    template: 'MITO #[NUMBER]\n"[FALSE_BELIEF]"\n\nRealidade: [HOW_IT_ACTUALLY_WORKS_CORRECTLY]\n\n[COMPANY] [HOW_WE_SOLVE_THE_REAL_PROBLEM]',
    examples: [
      'MITO #01\n"Depois de muito tempo não dá para recuperar"\n\nRealidade: Mesmo mensalidades antigas podem ser recuperadas com instrumentos jurídicos e administrativos corretos.\n\nA BURDA Assessoria atua com estratégias seguras e eficazes para resgatar valores de meses e até anos anteriores.',
      'MITO #02\n"Cobrança sempre desgasta a relação com os pais"\n\nRealidade: Quando a cobrança é feita com técnica, respeito e humanização, ela fortalece a transparência e mantém o vínculo com as famílias.\n\nNa BURDA Assessoria, preservamos a relação de confiança entre escola e responsáveis.'
    ],
    psychology: 'Directly challenges false beliefs, provides proof of reality, positions company as solution specialist',
    whenToUse: 'Mid-carousel myth-busting slides (2-3 myths in series)',
    powerWords: ['MITO', 'Realidade', 'Mesmo', 'Quando', 'Preservamos'],
    emotionTriggers: ['revelation', 'relief', 'trust']
  },
  {
    id: 'truth-resolution-benefits',
    name: 'Truth Conclusion + Benefits + Transformation CTA',
    type: 'cta',
    tone: 'aspirational',
    template: 'VERDADE\n[AFFIRMATION] e necessário\n\nCom acompanhamento especializado, sua [CONTEXT] garante:\n1. [BENEFIT1]\n2. [BENEFIT2]\n3. [BENEFIT3]\n\nConte com [COMPANY] para transformar mitos em soluções.',
    examples: [
      'VERDADE\nRecuperar é possível e necessário\n\nCom acompanhamento especializado, sua escola garante:\n1. Redução da inadimplência\n2. Maior segurança financeira\n3. Mais tranquilidade para focar no ensino\n\nConte com a BURDA Assessoria para transformar mitos em soluções.'
    ],
    psychology: 'Resolution after myth-busting, empowerment, benefits restatement, call to partnership',
    whenToUse: 'Final slide in myth-busting series, close the narrative with truth + benefits + CTA',
    powerWords: ['VERDADE', 'Possível', 'Necessário', 'Garante', 'Transformar'],
    emotionTriggers: ['empowerment', 'hope', 'action', 'partnership']
  },
  {
    id: 'domain-transfer-analogy-hook',
    name: 'Domain Transfer Analogy Hook',
    type: 'hook',
    tone: 'casual',
    template: 'Te explicando [COMPLEX_CONCEPT] na linguagem do [FAMILIAR_DOMAIN]',
    examples: [
      'Te explicando consórcio na linguagem do futebol',
      'Te explicando investimento na linguagem da sua casa',
      'Te explicando imposto na linguagem do seu carro',
      'Te explicando seguros na linguagem do futebol'
    ],
    psychology: 'Learning transfer - complex topics become accessible through familiar domain analogy',
    whenToUse: 'First slide, complex financial/abstract concept education',
    powerWords: ['Te explicando', 'Na linguagem do', '[FAMILIAR_THING]'],
    emotionTriggers: ['recognition', 'anticipation', 'accessibility']
  },
  {
    id: 'implicit-learning-reframe',
    name: 'Implicit Learning Reframe (Already Know This)',
    type: 'education',
    tone: 'formal',
    template: 'O seu [FAMILIAR_ENTITY/PERSON] te ensinou tudo que você precisa saber sobre [COMPLEX_CONCEPT].\n\n[EXPLANATION of how familiar entity demonstrates the principle]',
    examples: [
      'O seu clube do coração te ensinou tudo que você precisa saber sobre consórcio.\n\nTodo ano você vê seu clube montando elenco, contratando jogador, renovando, planejando temporada.',
      'Seu banco te ensinou tudo que você precisa saber sobre juros compostos.\n\nVocê vê rendimento crescendo mês a mês na poupança.'
    ],
    psychology: 'Authority through existing knowledge - not teaching new concept, but reframing what they already know',
    whenToUse: 'Mid-carousel, connect familiar knowledge to abstract concept',
    powerWords: ['Te ensinou', 'Tudo que você precisa saber', 'Você vê'],
    emotionTriggers: ['recognition', 'authority', 'confidence']
  },
  {
    id: 'practical-example-transition',
    name: 'Practical Example Transition',
    type: 'education',
    tone: 'casual',
    template: 'E na prática?\n\n[CONCRETE_SCENARIO with real people/numbers/situations demonstrating principle]',
    examples: [
      'E na prática?\n\nO consórcio é um grupo que joga junto. Imagine o famoso bolão, cada participante contribui uma cota todo mês. Todo mês alguém do grupo é contemplado e recebe crédito pra comprar o bem.',
      'E na prática?\n\nSua mãe investe 1000 reais por mês. Depois de 5 anos tem 60k + rendimento. Isso é juros compostos em ação.'
    ],
    psychology: 'Theory → concrete application reduces cognitive gap',
    whenToUse: 'Mid-to-late carousel, show theory in action',
    powerWords: ['E na prática', 'Imagine', 'Cada', 'Todo mês'],
    emotionTriggers: ['clarity', 'relatability', 'actionability']
  },
  {
    id: 'misconception-clarifier',
    name: 'Misconception Clarifier (Not X, Actually Y)',
    type: 'education',
    tone: 'formal',
    template: 'Você não recebe [EXPECTED], recebe [ACTUAL_BENEFIT].',
    examples: [
      'Você não recebe dinheiro na conta, recebe poder de compra.',
      'Você não recebe juros fixos, recebe juros progressivos.',
      'Você não recebe promessa, recebe garantia legal.'
    ],
    psychology: 'Handles objections preemptively, clarifies value without being defensive',
    whenToUse: 'Reality check slide, clarify misconceptions about benefit',
    powerWords: ['Você não recebe', 'Recebe', 'Poder de'],
    emotionTriggers: ['clarification', 'relief', 'trust']
  },
  {
    id: 'expert-teaser-cta',
    name: 'Expert Teaser CTA',
    type: 'cta',
    tone: 'punchy',
    template: 'Você só não percebeu isso antes, vem que [EXPERT] explica',
    examples: [
      'Você só não percebeu isso antes, vem que a Baz explica',
      'Você só não sabia disso, vem que nosso especialista explica',
      'Você nunca tinha visto assim, deixa que a gente mostra'
    ],
    psychology: 'Light teaser (not pushy), position expert as guide/revealer',
    whenToUse: 'Final slide, soft CTA that invites expert guidance',
    powerWords: ['Você só não', 'Vem que', 'Explica', 'Mostra'],
    emotionTriggers: ['curiosity', 'trust-in-expert', 'discovery']
  }
];

export const ingestCopyExample = (copy: string, metadata: any): CopyPattern => ({
    id: `copy-${Date.now()}`,
    name: metadata.name || 'Untitled',
    type: metadata.type || 'hook',
    industry: metadata.industry,
    tone: metadata.tone || 'casual',
    template: copy,
    examples: [copy],
    psychology: metadata.psychology || '',
    whenToUse: metadata.whenToUse || '',
    powerWords: metadata.powerWords || [],
    emotionTriggers: metadata.emotionTriggers || []
  });

export const findCopyPattern = (criteria: {
  type?: string;
  tone?: string;
  industry?: string;
}): CopyPattern[] => copyPatterns.filter(p => {
    if (criteria.type && p.type !== criteria.type) return false;
    if (criteria.tone && p.tone !== criteria.tone) return false;
    if (criteria.industry && p.industry !== criteria.industry) return false;
    return true;
  });
