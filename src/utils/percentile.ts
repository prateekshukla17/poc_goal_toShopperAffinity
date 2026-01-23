import { clamp, normalizeToRange } from "./math-utils.js";

/**
 * Calculate a specific percentile of an array of numbers
 * @param values - Array of numbers
 * @param percentile - Percentile to calculate (0-100)
 */
export function calculatePercentile(
  values: number[],
  percentile: number,
): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  // Linear interpolation between the two nearest values
  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

/**
 * Get P5 and P95 bounds for an array of values
 */
export function getP5P95Bounds(values: number[]): { p5: number; p95: number } {
  return {
    p5: calculatePercentile(values, 5),
    p95: calculatePercentile(values, 95),
  };
}

/**
 * Normalize a value using P5-P95 clipping
 * Values below P5 become 0, values above P95 become 1
 */
export function normalizeP5P95(value: number, p5: number, p95: number): number {
  if (p95 === p5) return 0;
  const clampedValue = clamp(value, p5, p95);
  return normalizeToRange(clampedValue, p5, p95);
}

/**
 * Extract all non-diagonal values from a symmetric matrix
 */
export function extractMatrixValues(matrix: number[][]): number[] {
  const values: number[] = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix[i].length; j++) {
      // Only add non-zero values for percentile calculation
      if (matrix[i][j] > 0) {
        values.push(matrix[i][j]);
      }
    }
  }
  return values;
}

/**
 * Normalize an entire matrix using P5-P95 bounds
 */
export function normalizeMatrixP5P95(
  matrix: number[][],
  p5?: number,
  p95?: number,
): { normalizedMatrix: number[][]; p5: number; p95: number } {
  const values = extractMatrixValues(matrix);

  const bounds = {
    p5: p5 ?? calculatePercentile(values, 5),
    p95: p95 ?? calculatePercentile(values, 95),
  };

  const normalizedMatrix = matrix.map((row, i) =>
    row.map((value, j) => {
      // Keep diagonal as 0 (category with itself)
      if (i === j) return 0;
      return normalizeP5P95(value, bounds.p5, bounds.p95);
    }),
  );

  return {
    normalizedMatrix,
    p5: bounds.p5,
    p95: bounds.p95,
  };
}
