export interface NicheKnowledge {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  description: string;
  painPoints: string[];
  contentPillars: string[];
  bestFormats: string[];
  hashtagStrategy: string;
  tone: string;
  ctas: string[];
  seasonality: string[];
  benchmarks: {
    avgEngagementRate: string;
    avgReachRate: string;
    contentFrequency: string;
  };
  audienceType: 'B2B' | 'B2C' | 'mix';
  specialConsiderations: string[];
}

export const NICHE_KNOWLEDGE: NicheKnowledge[] = [
  {
    id: 'emprendedor',
    name: 'Emprendedor/a Solitario/a',
    emoji: '🚀',
    gradient: 'linear-gradient(135deg,#ff6b6b,#feca57)',
    description:
      'Persona emprendiendo sola, con recursos limitados, haciendo de todo: ventas, marketing, operaciones y atención al cliente.',
    painPoints: [
      'No tiene tiempo para crear contenido diario',
      'Siente que Instagram es un monstruo que le roba horas',
      'No sabe qué publicar cuando está en blanco',
      'Le cuesta mostrarse (miedo al qué dirán)',
      'No tiene presupuesto para contratar un community manager',
      'El burnout creativo es real y recurrente',
    ],
    contentPillars: [
      'Día a día del emprendimiento (transparencia cruda)',
      'Lecciones aprendidas con errores reales',
      'Detrás de escena del producto/servicio',
      'Transformaciones de clientes o usuarios',
      'Tips prácticos de tu nicho que apliquen a tu audiencia',
      'Storytelling personal: por qué empezaste',
    ],
    bestFormats: ['reel', 'stories', 'carrusel'],
    hashtagStrategy:
      'Mix 60% nichos específicos (#emprendedoraonline #emprenderdesdecasa), 30% locales (#emprendedoresargentina #emprendedoresmx), 10% broad (#emprendimiento #motivación).',
    tone: 'Cercano, honesto, vulnerable pero empoderado. Como charlando con un amigo que también emprende. Evitar lenguaje corporativo.',
    ctas: [
      'Contame en comentarios si te pasó lo mismo',
      'Guardá esto para cuando lo necesites',
      'Mandame DM con la palabra INFO y te paso el detalle',
      '¿Querés que te cuente cómo lo resolví?',
    ],
    seasonality: [
      'Enero: objetivos y planificación del año',
      'Marzo: vuelta a la rutina post-verano',
      'Julio: mitad de año, revisión de metas',
      'Noviembre/Diciembre: Black Friday, cierre de año y campañas',
    ],
    benchmarks: {
      avgEngagementRate: '3-6%',
      avgReachRate: '8-15%',
      contentFrequency: '4-6 publicaciones por semana + stories diarias',
    },
    audienceType: 'mix',
    specialConsiderations: [
      'El rostro del emprendedor ES la marca: personal branding > marca corporativa',
      'El contenido debe ser fácil de producir con celular',
      'Los reels de "un día en mi vida" funcionan excepcionalmente bien',
      'La audiencia valora la autenticidad sobre la perfección',
    ],
  },
  {
    id: 'pyme-servicios',
    name: 'PyME / Empresa de Servicios',
    emoji: '🏢',
    gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)',
    description:
      'Empresas de servicios B2B o B2C: consultorías, agencias, estudios, firmas de servicios profesionales con equipo pequeño o mediano.',
    painPoints: [
      'Dificultad para diferenciarse en un mercado saturado de servicios similares',
      'El contenido técnico no genera engagement',
      'Los clientes potenciales no entienden el valor agregado',
      'Falta de tiempo del equipo para crear contenido',
      'El dueño/especialista no quiere salir en cámara',
    ],
    contentPillars: [
      'Casos de éxito de clientes reales (con resultados concretos)',
      'Educación sobre el problema que resolvemos (no el servicio)',
      'Procesos y metodologías (demostrar expertise)',
      'Equipo y cultura empresarial (humanizar)',
      'Tendencias del sector con opinión propia',
      'Preguntas frecuentes respondidas con valor',
    ],
    bestFormats: ['carrusel', 'reel', 'post-imagen'],
    hashtagStrategy:
      'B2B: 70% hashtags de industria (#consultoriafinanciera #marketingdigital), 20% hashtags de problema (#aumentarventas #optimizarprocesos), 10% broad. B2C: más hashtags emocionales y de lifestyle.',
    tone: 'Profesional pero accesible. Expertise demostrado sin arrogancia. Lenguaje claro que un CEO y un empleado entiendan.',
    ctas: [
      'Agendá una consulta gratuita de 15 minutos',
      'Descargá nuestra guía gratuita (link en bio)',
      'Contanos tu caso en comentarios',
      'Solicitá cotización por DM',
    ],
    seasonality: [
      'Enero: presupuestos anuales, planes de crecimiento',
      'Marzo-Abril: contrataciones y nuevos proyectos',
      'Septiembre: reactivación post-vacaciones',
      'Octubre-Noviembre: cierre de proyectos antes de fin de año',
    ],
    benchmarks: {
      avgEngagementRate: '2-4%',
      avgReachRate: '5-10%',
      contentFrequency: '3-5 publicaciones por semana',
    },
    audienceType: 'mix',
    specialConsiderations: [
      'Los carruseles con datos y casos de éxito funcionan mejor que reels para B2B',
      'El social proof (testimonios, logos de clientes) es crítico',
      'LinkedIn puede ser más efectivo que Instagram para B2B puro, pero Instagram humaniza',
      'El dueño debe aparecer al menos 30% del tiempo para personalizar la marca',
    ],
  },
  {
    id: 'fabrica-industria',
    name: 'Fábrica / Industria',
    emoji: '🏭',
    gradient: 'linear-gradient(135deg,#434343,#000000)',
    description:
      'Empresas manufactureras, fábricas, industrias, producción B2B y supply chain que necesitan humanizar su marca industrial.',
    painPoints: [
      'La marca industrial se percibe como fría y distante',
      'El contenido técnico aburre a la audiencia general',
      'No saben mostrar el proceso productivo de forma atractiva',
      'El comprador B2B no está acostumbrado a buscar en Instagram',
      'Falta de personal dedicado a redes sociales',
      'Resistencia cultural a "mostrar la fábrica"',
    ],
    contentPillars: [
      'Behind the scenes del proceso productivo (satisfying content)',
      'Testimonios de clientes B2B con resultados cuantificables',
      'Calidad, certificaciones y estándares (sin ser aburrido)',
      'Equipo, cultura laboral y "la cara detrás de la máquina"',
      'Innovación tecnológica aplicada a la producción',
      'Sostenibilidad y prácticas responsables',
    ],
    bestFormats: ['reel', 'carrusel', 'post-imagen'],
    hashtagStrategy:
      'Combinar hashtags industriales (#manufactura #industriaargentina) con hashtags de aplicación (#packaging #automatización) y de valor (#calidad #hechoenargentina).',
    tone: 'Profesional pero cercano. Orgullo de lo que se hace. Evitar jerga excesiva. Mostrar el lado humano de la industria. Satisfying y ASMR industrial funciona muy bien.',
    ctas: [
      'Pedí tu muestra gratuita',
      'Agendá una visita a planta',
      'Solicitá cotización por DM',
      'Conocé nuestro proceso de calidad',
    ],
    seasonality: [
      'Febrero-Marzo: reinicio de producción post-verano',
      'Mayo: ferias y eventos del sector',
      'Agosto-Septiembre: planificación de compras para fin de año',
      'Octubre-Noviembre: cierre de contratos anuales',
    ],
    benchmarks: {
      avgEngagementRate: '1.5-3%',
      avgReachRate: '4-8%',
      contentFrequency: '2-4 publicaciones por semana',
    },
    audienceType: 'B2B',
    specialConsiderations: [
      'El satisfying content industrial (máquinas trabajando, procesos ASMR) tiene alto potencial viral',
      'LinkedIn es primordial para B2B industrial, pero Instagram humaniza y atrae talento',
      'Los reels de "de materia prima a producto final" funcionan excepcionalmente',
      'Mostrar al equipo humaniza la marca y atrae talento joven',
      'Los compradores B2B revisan Instagram para validar que la empresa existe y es seria',
    ],
  },
  {
    id: 'inversor',
    name: 'Inversor / Fondo',
    emoji: '📈',
    gradient: 'linear-gradient(135deg,#11998e,#38ef7d)',
    description:
      'Inversores individuales, family offices, fondos de inversión, VC, real estate investors y asesores financieros.',
    painPoints: [
      'La audiencia desconfía de "gurús financieros" en Instagram',
      'El contenido financiero puede ser aburrido o intimidante',
      'Las regulaciones limitan qué se puede prometer',
      'Dificultad para explicar conceptos complejos de forma simple',
      'El público quiere resultados rápidos, no educación',
    ],
    contentPillars: [
      'Educación financiera simple y accionable (sin promesas)',
      'Análisis de mercado y oportunidades (con disclaimers)',
      'Casos de inversión reales (anónimos o con permiso)',
      'Mitos vs. realidades del mundo financiero',
      'Hábitos y mindset del inversor exitoso',
      'Detrás de escena de decisiones de inversión',
    ],
    bestFormats: ['carrusel', 'reel', 'post-imagen'],
    hashtagStrategy:
      'Hashtags educativos (#finanzaspersonales #inversiones), de nicho (#venturecapital #realestateinvesting), y de comunidad (#inversoresargentina #financialfreedom).',
    tone: 'Educador paciente, autoritario pero accesible. Sin arrogancia. Transparente sobre riesgos. Lenguaje que un principiante entienda pero que un experto respete.',
    ctas: [
      'Guardá esto y revisalo cuando inviertas',
      '¿Tenés alguna duda? Mandala por DM',
      'Unite a nuestra comunidad de inversores (link en bio)',
      'Agendá una asesoría personalizada',
    ],
    seasonality: [
      'Enero: metas financieras del año nuevo',
      'Abril: cierre fiscal, impuestos',
      'Julio-Agosto: reevaluación de portafolio a mitad de año',
      'Octubre: planificación financiera pre-fin de año',
    ],
    benchmarks: {
      avgEngagementRate: '2-5%',
      avgReachRate: '6-12%',
      contentFrequency: '3-5 publicaciones por semana',
    },
    audienceType: 'B2C',
    specialConsiderations: [
      'Los disclaimers legales son obligatorios en cada pieza de contenido',
      'Nunca prometer rendimientos. Usar frases como "históricamente..." o "en mi experiencia..."',
      'Los carruseles con "5 errores que cometen los inversores" funcionan muy bien',
      'La credibilidad se construye con consistencia y transparencia, no con flexing',
      'Los testimonios deben ser verificables y con disclaimers',
    ],
  },
  {
    id: 'coach-consultor',
    name: 'Coach / Consultor Independiente',
    emoji: '🎯',
    gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
    description:
      'Coaches de vida, negocio, fitness, mindset; consultores freelance; mentors independientes que venden su expertise y tiempo.',
    painPoints: [
      'Saturación de coaches en Instagram ("todo el mundo es coach")',
      'Dificultad para demostrar resultados tangibles',
      'El contenido motivacional ya no funciona como antes',
      'Línea fina entre inspirar y vender (spam percibido)',
      'Necesitan posicionarse como expertos, no como amateurs',
      'Burnout por tener que crear contenido, vender y entregar coaching',
    ],
    contentPillars: [
      'Transformaciones reales de clientes (con antes/después)',
      'Frameworks y metodologías propias (IP protection)',
      'Mitos que tu industria promueve y la verdad',
      'Contenido de valor que demuestre expertise real',
      'Storytelling personal: tu propia transformación',
      'Preguntas incómodas que tu audiencia debe hacerse',
    ],
    bestFormats: ['reel', 'carrusel', 'stories'],
    hashtagStrategy:
      'Hashtags de nicho (#coachdenegocios #consultordemarketing) + de problema (#superarbloqueos #escalarminegocio) + de comunidad (#emprendedores #mindset).',
    tone: 'Empoderador pero realista. Sin toxic positivity. Desafiante pero compasivo. Como un mentor que te quiere ver crecer pero no te miente.',
    ctas: [
      '¿Listo para el siguiente nivel? Mandame DM',
      'Guardá esto y ponelo en práctica esta semana',
      '¿Querés que analice tu caso particular? Agendá una call',
      'Contame en comentarios: ¿cuál de estos puntos te resiste más?',
    ],
    seasonality: [
      'Enero: nuevos propósitos, alta demanda de coaching',
      'Marzo: vuelta a la rutina, reactivación',
      'Junio: mitad de año, revisión de metas',
      'Septiembre: reactivación post-vacaciones, nuevo comienzo',
      'Noviembre: cierre de año, planificación siguiente',
    ],
    benchmarks: {
      avgEngagementRate: '4-8%',
      avgReachRate: '10-18%',
      contentFrequency: '5-7 publicaciones por semana + stories diarias',
    },
    audienceType: 'B2C',
    specialConsiderations: [
      'El contenido debe demostrar expertise, no solo motivar. Frameworks propios son clave',
      'Los reels de "el error que cometen el 90%" funcionan excepcionalmente',
      'La autoridad se construye con resultados de clientes, no con opiniones propias',
      'El DM es el canal principal de ventas: el contenido debe generar conversaciones',
      'Evitar "toxic positivity" y promesas irreales. La audiencia ya es escéptica',
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce / Dropshipping',
    emoji: '🛒',
    gradient: 'linear-gradient(135deg,#f093fb,#f5576c)',
    description:
      'Tiendas online, dropshippers, marketplaces, marcas D2C que venden productos físicos o digitales por Instagram.',
    painPoints: [
      'Costo de adquisición de clientes cada vez más alto',
      'Dificultad para destacar entre miles de productos similares',
      'El contenido promocional aburre y reduce alcance',
      'Devoluciones y quejas públicas en comentarios',
      'Necesidad de generar contenido UGC constantemente',
      'Instagram Shopping aún no está disponible en todos los mercados',
    ],
    contentPillars: [
      'Producto en acción / uso real (lifestyle)',
      'UGC y testimonios de clientes',
      'Antes/después o transformación con el producto',
      'Behind the scenes del emprendimiento del producto',
      'Educación relacionada al nicho del producto',
      'Ofertas flash y exclusivas para seguidores',
    ],
    bestFormats: ['reel', 'carrusel', 'stories'],
    hashtagStrategy:
      'Hashtags de producto (#skincare #techgadgets) + de uso (#morningroutine #setup) + de comunidad (#comprasonline #tiendaonline).',
    tone: 'Entusiasta, aspiracional pero alcanzable. Lifestyle real, no fake. El producto mejora la vida del cliente, no es el centro de atención.',
    ctas: [
      'Link en bio para comprar con descuento',
      'Etiquetá a alguien que necesita esto',
      '¿Te lo llevás? Mandame DM con TU CODIGO',
      'Deslizá para ver más colores/tamaños',
    ],
    seasonality: [
      'Enero: rebajas de verano / liquidación',
      'Febrero: Día de los Enamorados',
      'Marzo-May: lanzamientos de temporada',
      'Julio: Día del Amigo (AR), rebajas de invierno',
      'Octubre-Nov: Halloween, Black Friday',
      'Diciembre: Navidad, última milla',
    ],
    benchmarks: {
      avgEngagementRate: '2-4%',
      avgReachRate: '5-12%',
      contentFrequency: '5-7 publicaciones por semana + stories diarias con producto',
    },
    audienceType: 'B2C',
    specialConsiderations: [
      'El contenido UGC (user generated content) tiene 3x más engagement que contenido de marca',
      'Los reels de "unboxing" y "review honesto" generan confianza',
      'Instagram Shopping + Stories con stickers de producto son esenciales',
      'Las ofertas exclusivas para seguidores fidelizan',
      'El servicio al cliente en comentarios es visible: responder rápido es crítico',
    ],
  },
  {
    id: 'agencia',
    name: 'Agencia de Marketing / Creativa',
    emoji: '🎨',
    gradient: 'linear-gradient(135deg,#fa709a,#fee140)',
    description:
      'Agencias de marketing digital, diseño, publicidad, social media, branding y creativas que venden servicios a otros negocios.',
    painPoints: [
      '"Todo el mundo es agencia": saturación extrema',
      'Dificultad para mostrar resultados sin revelar estrategias de clientes',
      'El prospecto no entiende la diferencia entre agencia barata y agencia de valor',
      'El contenido educativo atrae a otros marketers, no a clientes potenciales',
      'Necesitan demostrar creatividad y calidad en cada pieza propia',
    ],
    contentPillars: [
      'Casos de éxito con datos (sin revelar todo)',
      'Mitos del marketing que las empresas creen',
      'Detrás de escena de campañas reales',
      'Educación para CEOs, no para marketers',
      'Cultura de agencia y proceso creativo',
      'Opinión sobre tendencias y cambios de plataforma',
    ],
    bestFormats: ['carrusel', 'reel', 'post-imagen'],
    hashtagStrategy:
      'Hashtags de servicio (#agenciademarketing #socialmediamanager) + de valor (#aumentarventas #estrategiadigital) + de comunidad (#marketingtips #growthhacking).',
    tone: 'Creativo, audaz, con opinión propia. Sin miedo a polemizar. Demuestra expertise sin ser pedante. El tono de la agencia ES su carta de presentación.',
    ctas: [
      '¿Tu agencia actual no te da estos resultados? Hablemos',
      'Agendá una auditoría gratuita de tu estrategia',
      'Descargá nuestro framework (link en bio)',
      'Etiquetá a un CEO que necesita ver esto',
    ],
    seasonality: [
      'Enero: presupuestos de marketing anuales',
      'Marzo-Abril: contrataciones de agencias',
      'Junio: evaluación de agencias a mitad de año',
      'Septiembre: reactivación post-vacaciones',
      'Octubre-Nov: Black Friday, campañas de fin de año',
    ],
    benchmarks: {
      avgEngagementRate: '3-6%',
      avgReachRate: '8-15%',
      contentFrequency: '4-6 publicaciones por semana',
    },
    audienceType: 'B2B',
    specialConsiderations: [
      'El contenido debe estar dirigido a CEOs/CMOs, no a otros marketers',
      'Cada pieza de contenido propia es un portafolio: debe ser impecable',
      'Los carruseles con "5 errores que cometen las empresas en Instagram" funcionan muy bien',
      'El social proof es clave: logos de clientes, resultados cuantificados',
      'La agencia debe posicionarse como experta, no como proveedora de servicios baratos',
    ],
  },
  {
    id: 'startup-saas',
    name: 'Startup / SaaS',
    emoji: '💻',
    gradient: 'linear-gradient(135deg,#30cfd0,#330867)',
    description: 'Startups tecnológicas, productos SaaS, apps, plataformas digitales, product-led growth.',
    painPoints: [
      'Dificultad para explicar un producto intangible',
      'El contenido técnico abruma, el contenido genérico no conecta',
      'Necesitan atraer tanto usuarios como inversores',
      'El contenido de producto suena a venta constante',
      'Los founders no tienen tiempo para redes sociales',
      'La competencia con grandes players con presupuestos masivos',
    ],
    contentPillars: [
      'Producto en acción: tutoriales y casos de uso reales',
      'Educación sobre el problema que resuelve (no el producto)',
      'Detrás de escena del desarrollo y cultura startup',
      'Customer success stories con métricas',
      'Opinión sobre tendencias tech y futuro',
      'Memes y contenido relatable para developers/tech',
    ],
    bestFormats: ['carrusel', 'reel', 'post-imagen'],
    hashtagStrategy:
      'Hashtags tech (#saas #startup #productmanagement) + de problema (#productividad #automatización) + de comunidad (#startuplife #founder).',
    tone: 'Smart, directo, sin fluff. Data-driven pero humano. La startup es cool pero no pretenciosa. Developer-friendly cuando aplica.',
    ctas: [
      'Probá gratis por 14 días (link en bio)',
      '¿Querés una demo personalizada? Agendá acá',
      'Unite a nuestra comunidad de usuarios',
      'Contanos en comentarios: ¿cómo resolvés esto hoy?',
    ],
    seasonality: [
      'Enero: objetivos anuales, presupuestos de software',
      'Marzo: contrataciones, nuevas herramientas',
      'Junio: mitad de año, evaluación de herramientas',
      'Septiembre: reactivación, nuevos proyectos',
      'Octubre: eventos tech, conferencias',
    ],
    benchmarks: {
      avgEngagementRate: '2-5%',
      avgReachRate: '6-12%',
      contentFrequency: '3-5 publicaciones por semana',
    },
    audienceType: 'B2B',
    specialConsiderations: [
      'El product-led growth (PLG) se refleja en el contenido: mostrar, no contar',
      'Los carruseles con comparativas "antes/después de usar el producto" funcionan muy bien',
      'El founder content (el CEO contando el journey) humaniza y atrae inversores',
      'Los memes tech tienen alto potencial viral dentro del nicho',
      'El onboarding y los tutoriales son contenido evergreen de alto valor',
    ],
  },
  {
    id: 'restaurante',
    name: 'Restaurante / Food & Bev',
    emoji: '🍽️',
    gradient: 'linear-gradient(135deg,#ff9a9e,#fecfef)',
    description: 'Restaurantes, bares, cafés, delivery, food trucks, pastelerías y todo el mundo gastronómico.',
    painPoints: [
      'La comida debe verse irresistible en foto/video',
      'La competencia es feroz y visual',
      'Necesitan promocionar sin parecer desesperados',
      'Los reviews negativos son públicos y visibles',
      'El contenido debe generar reservas/visitas, no solo likes',
      'Las tendencias de food cambian rápidamente',
    ],
    contentPillars: [
      'Platos estrella en proceso (satisfying cooking)',
      'Behind the scenes de la cocina y el equipo',
      'Ingredientes y proveedores (farm to table)',
      'Clientes disfrutando (UGC y experiencia)',
      'Recetas y tips que el público pueda replicar',
      'Eventos, menús especiales y temporada',
    ],
    bestFormats: ['reel', 'stories', 'post-imagen'],
    hashtagStrategy:
      'Hashtags de comida (#foodporn #foodie) + locales (#restaurantesbsas #cafecordoba) + de experiencia (#foodexperience #gastronomia).',
    tone: 'Apetitoso, cálido, generoso. La comida es amor. Evitar pretensión. Mostrar pasión por los ingredientes y el cliente.',
    ctas: [
      'Reservá tu mesa (link en bio)',
      '¿Te animás a probarlo? Etiquetá con quién venís',
      'Pedí por delivery (link en bio)',
      'Contanos en comentarios: ¿cuál probaste?',
    ],
    seasonality: [
      'Febrero: San Valentín, cena romántica',
      'Marzo-Abril: Día de la Madre (AR)',
      'Julio: Día del Amigo (AR), invierno comfort food',
      'Octubre: Halloween temático',
      'Diciembre: cenas de fin de año, Navidad',
    ],
    benchmarks: {
      avgEngagementRate: '4-8%',
      avgReachRate: '10-20%',
      contentFrequency: '5-7 publicaciones por semana + stories diarias',
    },
    audienceType: 'B2C',
    specialConsiderations: [
      'La fotografía de comida es crítica: iluminación natural, ángulos top-down y 45°',
      'Los reels ASMR de cocina (sizzle, chop, pour) tienen potencial viral masivo',
      'El UGC de clientes comiendo es el mejor social proof',
      'Las stories con encuestas ("¿Qué pedís?") generan engagement y datos',
      'El menú del día y las ofertas flash funcionan mejor en stories que en feed',
    ],
  },
  {
    id: 'profesional',
    name: 'Profesional Independiente',
    emoji: '⚖️',
    gradient: 'linear-gradient(135deg,#a8edea,#fed6e3)',
    description:
      'Abogados, médicos, arquitectos, contadores, terapeutas, psicólogos y otros profesionales que venden su expertise.',
    painPoints: [
      'Miedo a violar códigos de ética profesional',
      'Dificultad para humanizar una profesión seria',
      'El contenido técnico no genera engagement',
      'Los colegas pueden juzgar el uso de redes sociales',
      'Necesitan atraer pacientes/clientes sin parecer desesperados',
      'Las regulaciones de publicidad profesional son restrictivas',
    ],
    contentPillars: [
      'Educación sobre derechos, salud o proceso (sin asesorar individualmente)',
      'Mitos comunes desmentidos con rigor',
      'Procesos y metodologías explicados simple',
      'Testimonios de pacientes/clientes (con consentimiento)',
      'Día a día de la práctica profesional (humanizar)',
      'Colaboraciones con otros profesionales complementarios',
    ],
    bestFormats: ['carrusel', 'reel', 'post-imagen'],
    hashtagStrategy:
      'Hashtags de profesión (#abogado #medicina) + de problema (#derechoslaborales #saludmental) + locales (#abogadobsas #psicologacordoba).',
    tone: 'Profesional, empático, accesible. Sin condescendencia. El experto que te explica sin hacerte sentir ignorante. Calm authority.',
    ctas: [
      '¿Tenés una consulta? Agendá un turno (link en bio)',
      'Guardá esto para cuando lo necesites',
      '¿Conocés a alguien que necesita esta info? Etiquetalo',
      'Mandame DM para coordinar una consulta',
    ],
    seasonality: [
      'Enero: propósitos de salud, organización legal',
      'Marzo: inicio de actividades, consultas fiscales',
      'Mayo: Día de la Madre (salud preventiva)',
      'Agosto-Sept: reactivación post-vacaciones',
      'Octubre: salud mental awareness',
      'Diciembre: cierre de año fiscal/legal',
    ],
    benchmarks: {
      avgEngagementRate: '2-5%',
      avgReachRate: '5-12%',
      contentFrequency: '3-5 publicaciones por semana',
    },
    audienceType: 'B2C',
    specialConsiderations: [
      'Los disclaimers son obligatorios: "Esto es información general, no asesoría personalizada"',
      'Nunca diagnosticar, prescribir o asesorar individualmente en público',
      'Los carruseles con "5 derechos que no conocés" o "3 señales de alerta" funcionan muy bien',
      'El contenido debe educar, no vender. La venta viene del posicionamiento',
      'Las colaboraciones con profesionales complementarios expanden el alcance',
      'El testimonio de un paciente/cliente satisfecho es el mejor marketing',
    ],
  },
];

export const getNicheKnowledge = (id: string): NicheKnowledge | undefined => NICHE_KNOWLEDGE.find((n) => n.id === id);

export const listNiches = (): NicheKnowledge[] => [...NICHE_KNOWLEDGE];
