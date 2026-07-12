import { promises as fs } from 'fs';

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  text?: string;
  textColor?: string;
  backgroundColor?: string;
  order: number;
}

export interface CarouselEditRequest {
  carouselId: string;
  slides: CarouselSlide[];
}

export interface CarouselEditOperation {
  type: 'reorder' | 'update-text' | 'update-image' | 'delete-slide' | 'add-slide' | 'update-style';
  slideId?: string;
  params: Record<string, unknown>;
}

interface ReorderParams {
  newOrder: number[];
}

interface UpdateTextParams {
  text: string;
  textColor?: string;
}

interface UpdateImageParams {
  imageUrl: string;
}

interface DeleteSlideParams {
  slideId: string;
}

interface AddSlideParams {
  imageUrl: string;
  text?: string;
  position: number;
}

interface UpdateStyleParams {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
}

export const carouselEditingService = {
  async reorderSlides(slides: CarouselSlide[], newOrder: number[]): Promise<CarouselSlide[]> {
    const reordered = newOrder.map((idx) => ({
      ...slides[idx],
      order: newOrder.indexOf(idx),
    }));
    return reordered;
  },

  async updateSlideText(
    slides: CarouselSlide[],
    slideId: string,
    params: UpdateTextParams
  ): Promise<CarouselSlide[]> {
    return slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            text: params.text,
            textColor: params.textColor ?? slide.textColor,
          }
        : slide
    );
  },

  async updateSlideImage(
    slides: CarouselSlide[],
    slideId: string,
    params: UpdateImageParams
  ): Promise<CarouselSlide[]> {
    return slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            imageUrl: params.imageUrl,
          }
        : slide
    );
  },

  async deleteSlide(slides: CarouselSlide[], slideId: string): Promise<CarouselSlide[]> {
    return slides
      .filter((slide) => slide.id !== slideId)
      .map((slide, idx) => ({ ...slide, order: idx }));
  },

  async addSlide(slides: CarouselSlide[], params: AddSlideParams): Promise<CarouselSlide[]> {
    const newSlide: CarouselSlide = {
      id: `slide-${Date.now()}`,
      imageUrl: params.imageUrl,
      text: params.text,
      order: params.position,
    };

    const updated = [...slides];
    updated.splice(params.position, 0, newSlide);
    return updated.map((slide, idx) => ({ ...slide, order: idx }));
  },

  async updateSlideStyle(
    slides: CarouselSlide[],
    slideId: string,
    params: UpdateStyleParams
  ): Promise<CarouselSlide[]> {
    return slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            backgroundColor: params.backgroundColor ?? slide.backgroundColor,
            textColor: params.textColor ?? slide.textColor,
          }
        : slide
    );
  },

  async processOperations(
    slides: CarouselSlide[],
    operations: CarouselEditOperation[]
  ): Promise<CarouselSlide[]> {
    let current = slides;

    for (const op of operations) {
      const params = op.params as unknown;
      switch (op.type) {
        case 'reorder':
          current = await this.reorderSlides(current, (params as ReorderParams).newOrder);
          break;
        case 'update-text':
          current = await this.updateSlideText(
            current,
            op.slideId!,
            params as UpdateTextParams
          );
          break;
        case 'update-image':
          current = await this.updateSlideImage(
            current,
            op.slideId!,
            params as UpdateImageParams
          );
          break;
        case 'delete-slide':
          current = await this.deleteSlide(current, op.slideId!);
          break;
        case 'add-slide':
          current = await this.addSlide(current, params as AddSlideParams);
          break;
        case 'update-style':
          current = await this.updateSlideStyle(
            current,
            op.slideId!,
            params as UpdateStyleParams
          );
          break;
      }
    }

    return current;
  },

  async saveCarousel(carouselId: string, slides: CarouselSlide[]): Promise<void> {
    const path = `/data/carousels/${carouselId}.json`;
    await fs.writeFile(path, JSON.stringify({ id: carouselId, slides, updatedAt: new Date() }, null, 2));
  },

  async loadCarousel(carouselId: string): Promise<CarouselSlide[]> {
    const path = `/data/carousels/${carouselId}.json`;
    const data = await fs.readFile(path, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.slides || [];
  },
};
