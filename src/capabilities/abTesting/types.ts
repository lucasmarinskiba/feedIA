export interface ABVariant {
  id: string;
  name: string;
  contentId?: string;
  postId?: string;
  impressions: number;
  engagements: number;
  conversions: number;
}

export interface ABTest {
  id: string;
  accountId: string;
  name: string;
  hypothesis?: string;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  variants: ABVariant[];
  winner?: string;
  confidence?: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABTestResult {
  testId: string;
  winner: string | null;
  confidence: number;
  isSignificant: boolean;
  variantResults: Array<{
    variantId: string;
    name: string;
    engagementRate: number;
    conversionRate: number;
    lift: number;
  }>;
}
