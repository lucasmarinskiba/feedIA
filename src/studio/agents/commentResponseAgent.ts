import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Comment Response Agent
 * Generates original, on-brand responses to comments and DMs
 * Maintains conversation authenticity + brand voice
 */

export interface CommentInput {
  commentText: string;
  commenterHandle: string;
  postType: 'carousel' | 'reel' | 'story' | 'post';
  engagement: 'question' | 'compliment' | 'criticism' | 'inquiry' | 'spam';
}

export interface ResponseOutput {
  response: string;
  length: 'short' | 'medium' | 'long';
  emoji?: string;
  callToAction?: string;
  isPersonalized: boolean;
}

export class CommentResponseAgent {
  /**
   * Generate original response to comment
   * Analyzes sentiment + engagement type + brand voice
   */
  generateResponse(input: CommentInput, brand: BrandProfile): ResponseOutput {
    const engagement = this.detectEngagement(input.commentText);

    let response = '';
    let emoji = '';
    let callToAction = '';
    let length: 'short' | 'medium' | 'long' = 'medium';

    switch (engagement) {
      case 'question':
        response = this.respondToQuestion(input.commentText, brand);
        callToAction = 'Check DMs for more details';
        emoji = '💬';
        break;

      case 'compliment':
        response = this.respondToCompliment(input.commentText, brand);
        emoji = '❤️';
        length = 'short';
        break;

      case 'criticism':
        response = this.respondToCriticism(input.commentText, brand);
        emoji = '🙏';
        callToAction = 'We appreciate your feedback';
        break;

      case 'inquiry':
        response = this.respondToInquiry(input.commentText, brand);
        emoji = '👀';
        callToAction = 'Slide into DMs for details';
        break;

      default:
        response = this.respondDefault(brand);
        length = 'short';
    }

    log.debug(`[CommentResponse] Generated ${length} response for ${engagement} comment`);

    return {
      response,
      length,
      emoji,
      callToAction,
      isPersonalized: true,
    };
  }

  private detectEngagement(comment: string): CommentInput['engagement'] {
    const lower = comment.toLowerCase();

    if (
      lower.includes('?') ||
      lower.includes('how') ||
      lower.includes('what') ||
      lower.includes('where') ||
      lower.includes('when')
    ) {
      return 'question';
    }

    if (
      lower.includes('love') ||
      lower.includes('amazing') ||
      lower.includes('great') ||
      lower.includes('awesome') ||
      lower.includes('beautiful') ||
      lower.includes('perfect')
    ) {
      return 'compliment';
    }

    if (
      lower.includes('not') ||
      lower.includes('bad') ||
      lower.includes('dislike') ||
      lower.includes('wrong') ||
      lower.includes('fail')
    ) {
      return 'criticism';
    }

    if (
      lower.includes('interested') ||
      lower.includes('collab') ||
      lower.includes('business') ||
      lower.includes('partner')
    ) {
      return 'inquiry';
    }

    return 'spam';
  }

  private respondToQuestion(question: string, brand: BrandProfile): string {
    const responses = [
      `Great question! ${this.getRandomOpener(brand.voice.tone)} We're addressing this in our next post.`,
      `Love this question! Check our bio for the full breakdown. DM us if you need more!`,
      `Excellent catch! This is exactly why we exist. Let's chat in the DMs.`,
      `You nailed the question. Our team is on it and we'll share more soon.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)] as string;
  }

  private respondToCompliment(compliment: string, brand: BrandProfile): string {
    const responses: string[] = [
      `This made our day! 🙌 Thank you for the love.`,
      `You're too kind! This keeps us going. 💙`,
      `Right back at you! Appreciate the support so much.`,
      `Means the world to us! Keep shining. ✨`,
      `Let's go! So grateful for you.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)] as string;
  }

  private respondToCriticism(criticism: string, brand: BrandProfile): string {
    const responses: string[] = [
      `We hear you. Every critique helps us improve. Thanks for keeping us honest.`,
      `Valid point. We're always evolving based on feedback like yours.`,
      `Noted and appreciated. Let's connect to understand your perspective better.`,
      `This is the feedback we need. Sliding into your DMs to chat more.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)] as string;
  }

  private respondToInquiry(inquiry: string, brand: BrandProfile): string {
    const responses: string[] = [
      `This is interesting! Let's chat more. Check your DMs.`,
      `We're intrigued. Our team would love to explore this. DM sent!`,
      `Awesome timing. Let's have a conversation. Watch for our message.`,
      `Definitely interested. Our business team is reaching out now.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)] as string;
  }

  private respondDefault(brand: BrandProfile): string {
    return `Thanks for the comment! Keep the love coming. 🙌`;
  }

  private getRandomOpener(tones: string[]): string {
    const openers: Record<string, string[]> = {
      professional: ['We appreciate the insight.', "That's a strategic observation.", 'Well put.'],
      casual: ['Yo, good point!', 'Haha, yes!', 'So real.'],
      educational: ['Great curiosity!', 'Love the learning mindset.', "You're asking the right questions."],
      emotional: ['So true!', 'Felt that!', 'You get it!'],
    };

    const tone = tones[0] || 'professional';
    const options = (openers[tone as keyof typeof openers] || openers['professional'] || ['Well put.']) as string[];
    return options[Math.floor(Math.random() * options.length)] as string;
  }

  /**
   * Generate DM response (more detailed, conversational)
   */
  generateDMResponse(dmContent: string, brand: BrandProfile): string {
    const isBusiness =
      dmContent.toLowerCase().includes('collab') ||
      dmContent.toLowerCase().includes('partnership') ||
      dmContent.toLowerCase().includes('brand');

    if (isBusiness) {
      return `Hey! Thanks so much for reaching out. This is exactly the kind of collaboration we're interested in. Can you tell us more about what you have in mind? We'd love to explore this together. 🚀`;
    }

    return `Hey! Thanks for the message. Really appreciate the support. What's on your mind?`;
  }
}

export const commentResponseAgent = new CommentResponseAgent();
