/**
 * Query Parameter Normalization Helpers
 * Converts Express req.query and req.params (which can be string | string[])
 * to single strings or arrays as needed
 */

/**
 * Convert query/param value to single string
 * If array, takes first element. If undefined, returns empty string.
 */
export const toSingleString = (val: unknown): string => {
  if (Array.isArray(val)) return String(val[0] ?? '');
  if (typeof val === 'string') return val;
  return '';
};

/**
 * Convert query/param value to array of strings
 * If single string, wraps in array. If undefined, returns empty array.
 */
export const toStringArray = (val: string | string[] | undefined): string[] => {
  if (Array.isArray(val)) return val;
  if (val) return [val];
  return [];
};

/**
 * Safely access object property that may be string | string[]
 */
export const getQueryParam = (params: Record<string, string | string[] | undefined>, key: string): string => {
  const val = params[key];
  return toSingleString(val);
};

export const getQueryParamArray = (params: Record<string, string | string[] | undefined>, key: string): string[] => {
  const val = params[key];
  return toStringArray(val);
};
