/**
 * Video Engine Pricing — estima costos por proveedor y duración.
 *
 * Valores aproximados en USD, actualizables según plan contratado.
 */

export interface PricingTable {
  runway: { usdPerSecond: number; minUsd: number };
  heygen: { usdPerMinute: number; minUsd: number };
  elevenlabsTTS: { usdPer1kChars: number };
}

export const DEFAULT_PRICING: PricingTable = {
  runway: { usdPerSecond: 0.08, minUsd: 0.5 },
  heygen: { usdPerMinute: 2.5, minUsd: 1.0 },
  elevenlabsTTS: { usdPer1kChars: 0.018 },
};

export const estimateVideoCost = (
  provider: 'runway' | 'heygen' | 'mock' | 'ffmpeg' | 'none',
  durationSec: number,
  pricing: PricingTable = DEFAULT_PRICING,
): number => {
  if (provider === 'mock' || provider === 'none' || provider === 'ffmpeg') return 0;
  if (provider === 'runway') {
    return Math.max(pricing.runway.minUsd, durationSec * pricing.runway.usdPerSecond);
  }
  if (provider === 'heygen') {
    const minutes = durationSec / 60;
    return Math.max(pricing.heygen.minUsd, minutes * pricing.heygen.usdPerMinute);
  }
  return 0;
};

export const estimateTTSCost = (chars: number, pricing: PricingTable = DEFAULT_PRICING): number => {
  return (chars / 1000) * pricing.elevenlabsTTS.usdPer1kChars;
};
