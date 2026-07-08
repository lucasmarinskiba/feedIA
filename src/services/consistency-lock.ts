/**
 * Consistency Lock System
 * Maintains same character/product/environment across carousel frames
 * Locks visual traits: face, outfit, environment, product properties
 */

import { randomUUID as uuidv4 } from 'node:crypto';
import { log } from '../agent/logger.js';

interface CharacterLock {
  lockId: string;
  characterName: string;
  ageRange: string; // e.g., "25-35"
  gender: string;
  skinTone: string;
  facialFeatures: string; // description
  outfitDescription: string;
  styleVibe: string; // e.g., "casual", "professional", "luxury"
  uniqueTraits: string[]; // tattoos, scars, distinctive features
  createdAt: string;
}

interface ProductLock {
  lockId: string;
  productName: string;
  productCategory: string;
  shape: string; // e.g., "cylindrical", "rectangular", "organic"
  color: string;
  material: string; // e.g., "glass", "plastic", "metal", "fabric"
  brandMarkings: string;
  packagingStyle: string;
  dimensionApprox: string;
  uniqueFeatures: string[];
  createdAt: string;
}

interface EnvironmentLock {
  lockId: string;
  settingName: string;
  locationType: string; // e.g., "indoor office", "outdoor garden", "studio"
  lighting: string; // e.g., "golden hour", "studio bright", "moody"
  timeOfDay: string; // e.g., "morning", "evening"
  season: string;
  colorPalette: string[];
  backgroundStyle: string; // e.g., "minimalist", "cluttered", "natural"
  keyProps: string[];
  createdAt: string;
}

interface SeriesLock {
  seriesId: string;
  characterLock?: CharacterLock;
  productLock?: ProductLock;
  environmentLock?: EnvironmentLock;
  lockInstructions: string; // Injected into each prompt
  frameCount: number;
  createdAt: string;
}

class ConsistencyLockManager {
  private characterLocks: Map<string, CharacterLock> = new Map();
  private productLocks: Map<string, ProductLock> = new Map();
  private environmentLocks: Map<string, EnvironmentLock> = new Map();
  private seriesLocks: Map<string, SeriesLock> = new Map();

  /**
   * Create character lock from description
   */
  createCharacterLock(characterDescription: string): CharacterLock {
    const lockId = uuidv4();

    // Parse description (simple extraction)
    const charLock: CharacterLock = {
      lockId,
      characterName: this.extractField(characterDescription, 'name') || 'Character',
      ageRange: this.extractField(characterDescription, 'age') || '25-35',
      gender: this.extractField(characterDescription, 'gender') || 'neutral',
      skinTone: this.extractField(characterDescription, 'skin') || 'medium',
      facialFeatures: this.extractField(characterDescription, 'face') || characterDescription.slice(0, 100),
      outfitDescription: this.extractField(characterDescription, 'outfit') || characterDescription.slice(0, 100),
      styleVibe: this.extractField(characterDescription, 'style') || 'casual',
      uniqueTraits: this.extractArray(characterDescription, 'traits') || [],
      createdAt: new Date().toISOString(),
    };

    this.characterLocks.set(lockId, charLock);

    log.info('[ConsistencyLock] Character lock created', {
      lockId,
      character: charLock.characterName,
    });

    return charLock;
  }

  /**
   * Create product lock from description
   */
  createProductLock(productDescription: string): ProductLock {
    const lockId = uuidv4();

    const prodLock: ProductLock = {
      lockId,
      productName: this.extractField(productDescription, 'name') || 'Product',
      productCategory: this.extractField(productDescription, 'category') || 'general',
      shape: this.extractField(productDescription, 'shape') || 'rectangular',
      color: this.extractField(productDescription, 'color') || 'blue',
      material: this.extractField(productDescription, 'material') || 'plastic',
      brandMarkings: this.extractField(productDescription, 'brand') || 'no specific branding',
      packagingStyle: this.extractField(productDescription, 'packaging') || 'minimal',
      dimensionApprox: this.extractField(productDescription, 'size') || 'medium',
      uniqueFeatures: this.extractArray(productDescription, 'features') || [],
      createdAt: new Date().toISOString(),
    };

    this.productLocks.set(lockId, prodLock);

    log.info('[ConsistencyLock] Product lock created', {
      lockId,
      product: prodLock.productName,
    });

    return prodLock;
  }

  /**
   * Create environment lock from description
   */
  createEnvironmentLock(environmentDescription: string): EnvironmentLock {
    const lockId = uuidv4();

    const envLock: EnvironmentLock = {
      lockId,
      settingName: this.extractField(environmentDescription, 'name') || 'Setting',
      locationType: this.extractField(environmentDescription, 'type') || 'indoor',
      lighting: this.extractField(environmentDescription, 'lighting') || 'natural',
      timeOfDay: this.extractField(environmentDescription, 'time') || 'day',
      season: this.extractField(environmentDescription, 'season') || 'spring',
      colorPalette: this.extractArray(environmentDescription, 'colors') || ['neutral'],
      backgroundStyle: this.extractField(environmentDescription, 'style') || 'minimalist',
      keyProps: this.extractArray(environmentDescription, 'props') || [],
      createdAt: new Date().toISOString(),
    };

    this.environmentLocks.set(lockId, envLock);

    log.info('[ConsistencyLock] Environment lock created', {
      lockId,
      setting: envLock.settingName,
    });

    return envLock;
  }

  /**
   * Create series lock (combine all locks + generate injection prompt)
   */
  createSeriesLock(
    frameCount: number,
    characterLock?: CharacterLock,
    productLock?: ProductLock,
    environmentLock?: EnvironmentLock
  ): SeriesLock {
    const seriesId = uuidv4();

    // Build lock instructions for injection
    let lockInstructions = '[CONSISTENCY LOCK - APPLY TO ALL FRAMES]\n';

    if (characterLock) {
      lockInstructions += `CHARACTER LOCK:
- Name/Identity: ${characterLock.characterName}
- Age: ${characterLock.ageRange}
- Gender: ${characterLock.gender}
- Skin Tone: EXACT MATCH across frames (${characterLock.skinTone})
- Face: EXACT MATCH (${characterLock.facialFeatures})
- Outfit: EXACT MATCH (${characterLock.outfitDescription})
- Style: ${characterLock.styleVibe}
- Unique Traits: ${characterLock.uniqueTraits.join(', ') || 'none'}
[CRITICAL] Do NOT change face, skin tone, outfit, or unique traits between frames. Same character every frame.

`;
    }

    if (productLock) {
      lockInstructions += `PRODUCT LOCK:
- Product: ${productLock.productName} (${productLock.productCategory})
- Shape: EXACT MATCH (${productLock.shape})
- Color: EXACT MATCH (${productLock.color})
- Material: EXACT MATCH (${productLock.material})
- Branding: ${productLock.brandMarkings}
- Packaging: ${productLock.packagingStyle}
- Size: ${productLock.dimensionApprox}
- Features: ${productLock.uniqueFeatures.join(', ') || 'standard'}
[CRITICAL] Do NOT modify product appearance. Same product, same properties, all frames.

`;
    }

    if (environmentLock) {
      lockInstructions += `ENVIRONMENT LOCK:
- Setting: ${environmentLock.settingName} (${environmentLock.locationType})
- Lighting: CONSISTENT (${environmentLock.lighting})
- Time of Day: CONSISTENT (${environmentLock.timeOfDay})
- Season: ${environmentLock.season}
- Color Palette: ${environmentLock.colorPalette.join(', ')}
- Background Style: ${environmentLock.backgroundStyle}
- Key Props: ${environmentLock.keyProps.join(', ')}
[CRITICAL] Maintain same setting, lighting, time, and background across all frames.

`;
    }

    const seriesLock: SeriesLock = {
      seriesId,
      characterLock,
      productLock,
      environmentLock,
      lockInstructions: lockInstructions.trim(),
      frameCount,
      createdAt: new Date().toISOString(),
    };

    this.seriesLocks.set(seriesId, seriesLock);

    log.info('[ConsistencyLock] Series lock created', {
      seriesId,
      frameCount,
      hasCharacter: !!characterLock,
      hasProduct: !!productLock,
      hasEnvironment: !!environmentLock,
    });

    return seriesLock;
  }

  /**
   * Inject lock instructions into prompt
   */
  injectLockInstructions(prompt: string, seriesLock: SeriesLock): string {
    return `${seriesLock.lockInstructions}\n\n[FRAME PROMPT]\n${prompt}`;
  }

  /**
   * Generate frame prompts with locks applied
   */
  generateLockedPrompts(basePrompt: string, seriesLock: SeriesLock, frameCount: number): string[] {
    const lockedPrompts: string[] = [];

    for (let i = 0; i < frameCount; i++) {
      const frameIndicator = `[Frame ${i + 1}/${frameCount}]`;
      const lockedPrompt = this.injectLockInstructions(
        `${frameIndicator}\n${basePrompt}`,
        seriesLock
      );
      lockedPrompts.push(lockedPrompt);
    }

    return lockedPrompts;
  }

  /**
   * Get series lock
   */
  getSeriesLock(seriesId: string): SeriesLock | undefined {
    return this.seriesLocks.get(seriesId);
  }

  /**
   * Get character lock
   */
  getCharacterLock(lockId: string): CharacterLock | undefined {
    return this.characterLocks.get(lockId);
  }

  /**
   * Get product lock
   */
  getProductLock(lockId: string): ProductLock | undefined {
    return this.productLocks.get(lockId);
  }

  /**
   * Helper: Extract field from description
   */
  private extractField(description: string, fieldName: string): string | null {
    const regex = new RegExp(`${fieldName}[:\\s]([^,\\n]+)`, 'i');
    const match = description.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }

  /**
   * Helper: Extract array from description
   */
  private extractArray(description: string, fieldName: string): string[] {
    const regex = new RegExp(`${fieldName}[:\\s]([^\\n]+)`, 'i');
    const match = description.match(regex);
    if (!match || !match[1]) return [];

    return match[1]
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}

export const consistencyLockManager = new ConsistencyLockManager();
