export interface CarouselSlide {
  slideNumber: number;
  headline: string;
  body: string;
  cta: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface Carousel {
  id: string;
  userId: string;
  title: string;
  format: 'carousel' | 'reel' | 'story';
  slides: CarouselSlide[];
  sourceCategory?: string;
  brandIdentity?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    typography?: string;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    status: 'draft' | 'published' | 'archived';
    platform: 'instagram' | 'tiktok' | 'linkedin';
    engagementMetrics?: {
      views?: number;
      likes?: number;
      comments?: number;
      saves?: number;
      shares?: number;
    };
  };
}

export interface CarouselCreateRequest {
  userId: string;
  title: string;
  format: 'carousel' | 'reel' | 'story';
  slides: CarouselSlide[];
  platform: 'instagram' | 'tiktok' | 'linkedin';
  sourceCategory?: string;
}

export interface CarouselUpdateRequest {
  title?: string;
  slides?: CarouselSlide[];
  status?: 'draft' | 'published' | 'archived';
  brandIdentity?: Carousel['brandIdentity'];
}
