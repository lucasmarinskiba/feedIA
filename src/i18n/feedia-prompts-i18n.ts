/**
 * FeedIA Multi-Language Prompt Templates — i18n Integration
 * Supports: EN, ES, RU, PT, ZH for prompt generation
 */

interface PromptTemplate {
  hook: string;
  showcase: string;
  interactive: string;
  cta: string;
}

const promptTemplates: Record<string, PromptTemplate> = {
  en: {
    hook: 'Create compelling {domain} content: {brief}. Angle: {angle}. Style: {style}.',
    showcase: 'Professional {domain} product/feature photography. Product: {product}. Lighting: {lighting}. Composition: {composition}.',
    interactive: 'Engage audience with {domain} content. Question: {question}. Interactive element: {element}.',
    cta: 'High-conversion call-to-action carousel slide. Action: {action}. Urgency: {urgency}. Offer: {offer}.',
  },
  es: {
    hook: 'Crear contenido cautivador {domain}: {brief}. Ángulo: {angle}. Estilo: {style}.',
    showcase: 'Fotografía profesional de producto/característica {domain}. Producto: {product}. Iluminación: {lighting}. Composición: {composition}.',
    interactive: 'Enganchar audiencia con contenido {domain}. Pregunta: {question}. Elemento interactivo: {element}.',
    cta: 'Diapositiva de llamada a la acción de alta conversión. Acción: {action}. Urgencia: {urgency}. Oferta: {offer}.',
  },
  ru: {
    hook: 'Создать привлекательный контент {domain}: {brief}. Угол: {angle}. Стиль: {style}.',
    showcase: 'Профессиональная фотография товара/функции {domain}. Товар: {product}. Освещение: {lighting}. Композиция: {composition}.',
    interactive: 'Привлечь аудиторию контентом {domain}. Вопрос: {question}. Интерактивный элемент: {element}.',
    cta: 'Слайд призыва к действию с высокой конверсией. Действие: {action}. Срочность: {urgency}. Предложение: {offer}.',
  },
  pt: {
    hook: 'Criar conteúdo cativante {domain}: {brief}. Ângulo: {angle}. Estilo: {style}.',
    showcase: 'Fotografia profissional de produto/recurso {domain}. Produto: {product}. Iluminação: {lighting}. Composição: {composition}.',
    interactive: 'Engajar audiência com conteúdo {domain}. Pergunta: {question}. Elemento interativo: {element}.',
    cta: 'Slide de chamada à ação de alta conversão. Ação: {action}. Urgência: {urgency}. Oferta: {offer}.',
  },
  zh: {
    hook: '创建引人入胜的{domain}内容：{brief}。角度：{angle}。风格：{style}。',
    showcase: '专业{domain}产品/功能摄影。产品：{product}。照明：{lighting}。构图：{composition}。',
    interactive: '用{domain}内容吸引观众。问题：{question}。互动元素：{element}。',
    cta: '高转化率行动号召幻灯片。操作：{action}。紧迫性：{urgency}。优惠：{offer}。',
  },
};

class FeedIAI18n {
  getTemplate(language: string, slideType: 'hook' | 'showcase' | 'interactive' | 'cta'): string {
    const lang = language.toLowerCase();
    const template = promptTemplates[lang] ?? promptTemplates['en']!;
    return template[slideType];
  }

  interpolate(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return result;
  }

  generatePrompt(
    language: string,
    slideType: 'hook' | 'showcase' | 'interactive' | 'cta',
    variables: Record<string, string>
  ): string {
    const template = this.getTemplate(language, slideType);
    return this.interpolate(template, variables);
  }

  getSupportedLanguages(): string[] {
    return Object.keys(promptTemplates);
  }
}

export const feediaI18n = new FeedIAI18n();
