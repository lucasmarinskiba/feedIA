/**
 * UiMapEngine — Motor genérico de UI Maps para cualquier plataforma.
 * Extraído y generalizado desde el uiMap.ts de Instagram.
 */

export type Gesture = 'click' | 'double-click' | 'type' | 'scroll' | 'hover' | 'press' | 'wait' | 'navigate';

export interface UiTarget {
  id: string;
  label: string;
  url?: string;
  selectors: string[];
  gesture: Gesture;
  role?: string;
  note: string;
  confidence?: number; // 0-1, para scoring de fallback
}

export interface GenericUiMap {
  platform: string;
  baseUrl: string;
  targets: UiTarget[];
}

export const resolveTarget = (map: GenericUiMap, targetId: string): UiTarget | undefined =>
  map.targets.find((t) => t.id === targetId);

export const resolveTargetByLabel = (map: GenericUiMap, label: string): UiTarget | undefined =>
  map.targets.find((t) => t.label.toLowerCase().includes(label.toLowerCase()));

/** Encuentra el mejor selector disponible probando en orden */
export const findBestSelector = async (
  page: { locator: (selector: string) => { count: () => Promise<number> } },
  target: UiTarget,
  _timeoutPerSelector = 3000,
): Promise<{ selector: string; index: number } | null> => {
  for (let i = 0; i < target.selectors.length; i++) {
    const sel = target.selectors[i]!;
    try {
      const count = await page.locator(sel).count();
      if (count > 0) {
        return { selector: sel, index: i };
      }
    } catch {
      // Selector inválido para esta página, probar siguiente
    }
  }
  return null;
};

/** Construye un mapa UI para una nueva plataforma */
export const createUiMap = (platform: string, baseUrl: string, targets: UiTarget[]): GenericUiMap => ({
  platform,
  baseUrl,
  targets,
});

/** Target factory */
export const T = (
  id: string,
  label: string,
  selectors: string[],
  gesture: Gesture,
  note: string,
  extra: Partial<UiTarget> = {},
): UiTarget => ({ id, label, selectors, gesture, note, ...extra });

/** Valida que todos los IDs sean únicos */
export const validateUiMap = (map: GenericUiMap): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const target of map.targets) {
    if (ids.has(target.id)) {
      errors.push(`ID duplicado: ${target.id}`);
    }
    ids.add(target.id);
    if (target.selectors.length === 0) {
      errors.push(`${target.id}: sin selectores`);
    }
  }
  return errors;
};
