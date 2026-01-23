import type {
  LiftMatrix,
  NormalizedMatrix,
  CoOrderMatrix,
} from "../types/index.js";
import {
  normalizeMatrixP5P95,
  extractMatrixValues,
  getP5P95Bounds,
} from "../utils/percentile.js";

/**
 * Normalize lift matrix using P5-P95 clipping
 *
 * This normalizes all lift values to a 0-1 range:
 * - Values at or below P5 become 0
 * - Values at or above P95 become 1
 * - Values between are linearly interpolated
 */
export function normalizeLiftMatrix(
  liftMatrix: LiftMatrix,
  p5?: number,
  p95?: number,
): NormalizedMatrix {
  const {
    normalizedMatrix,
    p5: actualP5,
    p95: actualP95,
  } = normalizeMatrixP5P95(liftMatrix.matrix, p5, p95);

  return {
    categories: liftMatrix.category,
    matrix: normalizedMatrix,
    p5: actualP5,
    p95: actualP95,
  };
}

/**
 * Normalize co-orders matrix using P5-P95 clipping
 */
export function normalizeCoOrdersMatrix(
  coOrdersMatrix: CoOrderMatrix,
  p5?: number,
  p95?: number,
): NormalizedMatrix {
  const {
    normalizedMatrix,
    p5: actualP5,
    p95: actualP95,
  } = normalizeMatrixP5P95(coOrdersMatrix.matrix, p5, p95);

  return {
    categories: coOrdersMatrix.category,
    matrix: normalizedMatrix,
    p5: actualP5,
    p95: actualP95,
  };
}

/**
 * Calculate P5 and P95 bounds for lift matrix
 */
export function getLiftBounds(liftMatrix: LiftMatrix): {
  p5: number;
  p95: number;
} {
  const values = extractMatrixValues(liftMatrix.matrix);
  return getP5P95Bounds(values);
}

/**
 * Calculate P5 and P95 bounds for co-orders matrix
 */
export function getCoOrdersBounds(coOrdersMatrix: CoOrderMatrix): {
  p5: number;
  p95: number;
} {
  const values = extractMatrixValues(coOrdersMatrix.matrix);
  return getP5P95Bounds(values);
}

/**
 * Print normalization summary
 */
export function printNormalizationSummary(
  normalizedLift: NormalizedMatrix,
  normalizedCoOrders: NormalizedMatrix,
): void {
  console.log("\n=== Normalization Summary ===");

  console.log("\nLift Normalization:");
  console.log(`  P5 (floor): ${normalizedLift.p5.toFixed(4)}`);
  console.log(`  P95 (ceiling): ${normalizedLift.p95.toFixed(4)}`);

  console.log("\nCo-Orders Normalization:");
  console.log(`  P5 (floor): ${normalizedCoOrders.p5.toFixed(4)}`);
  console.log(`  P95 (ceiling): ${normalizedCoOrders.p95.toFixed(4)}`);

  // Sample of normalized values
  const cats = normalizedLift.categories;
  console.log("\nSample Normalized Values:");
  for (let i = 0; i < Math.min(3, cats.length); i++) {
    for (let j = i + 1; j < Math.min(i + 4, cats.length); j++) {
      const normLift = normalizedLift.matrix[i][j];
      const normCoOrders = normalizedCoOrders.matrix[i][j];
      console.log(
        `  ${cats[i]} + ${cats[j]}: ` +
          `lift=${normLift.toFixed(3)}, co-orders=${normCoOrders.toFixed(3)}`,
      );
    }
  }
}
