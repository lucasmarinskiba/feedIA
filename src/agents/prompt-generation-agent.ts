export interface PromptGenerationRequest {
  type?: string;
  content?: string;
  basePromptId?: string;
  styleOverride?: string;
  numberOfVariations?: number;
  [key: string]: unknown;
}

export interface GeneratedPrompt {
  id: string;
  prompt: string;
  // Consumed by api/scaling-layer.ts's DB insert, but generatePromptVariations/
  // batchGeneratePrompts below are stubs that never populate them (only id/
  // prompt) -- optional here to reflect that honestly rather than claim a
  // guarantee the current implementation doesn't keep.
  baseId?: string;
  style?: string;
  occasion?: string;
}

export const generatePromptVariations = async (req: PromptGenerationRequest, ...args: unknown[]): Promise<GeneratedPrompt[]> => [{ id: '1', prompt: 'stub' }];

export const batchGeneratePrompts = async (requests: PromptGenerationRequest[], ...args: unknown[]): Promise<GeneratedPrompt[]> => requests.map((_, i) => ({ id: String(i), prompt: 'stub' }));

export const promptGenerationAgent = async (input: unknown): Promise<unknown> => ({ prompt: 'stub', batch: [] });
