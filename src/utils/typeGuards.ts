/**
 * Type guard helpers para deshacer unknown types de DB/JSON results.
 * USO: const row = asType<MyType>(dbResult.rows[0])
 */

export const asType = <T>(value: unknown): T => value as unknown as T;

export const asTypeOrNull = <T>(value: unknown): T | null => {
  if (value === null || value === undefined) return null;
  return value as unknown as T;
};

export const asArray = <T>(value: unknown): T[] => {
  if (!Array.isArray(value)) return [];
  return value as unknown as T[];
};

export const asObject = <T extends Record<string, unknown>>(value: unknown): T => {
  if (typeof value !== 'object' || value === null) return {} as T;
  return value as unknown as T;
};

export const asString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

export const asNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
};

export const asBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};
