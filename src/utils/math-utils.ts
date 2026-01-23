export function log2(n: number): number {
  if (n <= 0) return 0;
  return Math.log2(n);
}
/**
 * Calculate the mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a value to a 0-1 range given min and max bounds
 */
export function normalizeToRange(
  value: number,
  min: number,
  max: number,
): number {
  if (max === min) return 0;
  const clamped = clamp(value, min, max);
  return (clamped - min) / (max - min);
}

/**
 * Calculate min value in array
 */
export function min(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

/**
 * Calculate max value in array
 */
export function max(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}
