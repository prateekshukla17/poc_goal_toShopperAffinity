import type {
  Order,
  Category,
  CoOrderMatrix,
  LiftMatrix,
  NormalizedMatrix,
  CoAffinityMatrix,
  MatrixStats,
  BuildMatrixOptions,
} from "../types/index.js";
import { loadOrders, loadCategories } from "../data/data-loader.js";
import {
  calculateCoOrderMatrix,
  printCoOrdersSummary,
} from "./co-orders-calculator.js";
import { calculateLiftMatrix, printLiftSummary } from "./lift-calculator.js";
import {
  normalizeLiftMatrix,
  normalizeCoOrdersMatrix,
  getLiftBounds,
  getCoOrdersBounds,
  printNormalizationSummary,
} from "./normaliser.js";
import { writeJSON, writeMatrixToCSV, ensureDir } from "../utils/csv-writer.js";

// Weight constants for CoAffinity calculation
const LIFT_WEIGHT = 0.7;
const CO_ORDERS_WEIGHT = 0.3;

/**
 * Calculate CoAffinity matrix from normalized lift and co-orders matrices
 *
 * CoAffinity = 0.7 * normalized_lift + 0.3 * normalized_co_orders
 */
export function calculateCoAffinityMatrix(
  normalizedLift: NormalizedMatrix,
  normalizedCoOrders: NormalizedMatrix,
): CoAffinityMatrix {
  const n = normalizedLift.categories.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0; // No self-affinity
      } else {
        matrix[i][j] =
          LIFT_WEIGHT * normalizedLift.matrix[i][j] +
          CO_ORDERS_WEIGHT * normalizedCoOrders.matrix[i][j];
      }
    }
  }

  return {
    categories: normalizedLift.categories,
    matrix,
  };
}

/**
 * Get CoAffinity score between two categories
 */
export function getCoAffinityScore(
  coAffinityMatrix: CoAffinityMatrix,
  cat1: string,
  cat2: string,
): number {
  const idx1 = coAffinityMatrix.categories.indexOf(cat1);
  const idx2 = coAffinityMatrix.categories.indexOf(cat2);

  if (idx1 === -1 || idx2 === -1) {
    return 0;
  }

  return coAffinityMatrix.matrix[idx1][idx2];
}

/**
 * Print CoAffinity matrix summary
 */
export function printCoAffinitySummary(
  coAffinityMatrix: CoAffinityMatrix,
): void {
  console.log("\n=== CoAffinity Matrix Summary ===");
  console.log(
    `Weight: ${LIFT_WEIGHT * 100}% Lift + ${CO_ORDERS_WEIGHT * 100}% Co-Orders`,
  );

  // Collect all pairs
  const pairs: { cat1: string; cat2: string; affinity: number }[] = [];
  const cats = coAffinityMatrix.categories;

  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      pairs.push({
        cat1: cats[i],
        cat2: cats[j],
        affinity: coAffinityMatrix.matrix[i][j],
      });
    }
  }

  pairs.sort((a, b) => b.affinity - a.affinity);

  console.log("\nTop 10 Highest CoAffinity Pairs:");
  for (let i = 0; i < Math.min(10, pairs.length); i++) {
    const p = pairs[i];
    console.log(`  ${p.cat1} + ${p.cat2}: ${p.affinity.toFixed(4)}`);
  }

  pairs.sort((a, b) => a.affinity - b.affinity);

  console.log("\nTop 10 Lowest CoAffinity Pairs:");
  for (let i = 0; i < Math.min(10, pairs.length); i++) {
    const p = pairs[i];
    console.log(`  ${p.cat1} + ${p.cat2}: ${p.affinity.toFixed(4)}`);
  }
}

/**
 * Full pipeline to build CoAffinity matrix from orders
 */
export function buildCoAffinityFromOrders(
  orders: Order[],
  categories: Category[],
): {
  coOrdersMatrix: CoOrderMatrix;
  liftMatrix: LiftMatrix;
  normalizedLift: NormalizedMatrix;
  normalizedCoOrders: NormalizedMatrix;
  coAffinityMatrix: CoAffinityMatrix;
  stats: MatrixStats;
} {
  console.log("Step 1: Calculating co-orders matrix...");
  const coOrdersMatrix = calculateCoOrderMatrix(orders, categories);
  printCoOrdersSummary(coOrdersMatrix);

  console.log("\nStep 2: Calculating lift matrix...");
  const liftMatrix = calculateLiftMatrix(coOrdersMatrix);
  printLiftSummary(liftMatrix);

  console.log("\nStep 3: Normalizing matrices (P5-P95)...");
  const liftBounds = getLiftBounds(liftMatrix);
  const coOrdersBounds = getCoOrdersBounds(coOrdersMatrix);

  const normalizedLift = normalizeLiftMatrix(
    liftMatrix,
    liftBounds.p5,
    liftBounds.p95,
  );
  const normalizedCoOrders = normalizeCoOrdersMatrix(
    coOrdersMatrix,
    coOrdersBounds.p5,
    coOrdersBounds.p95,
  );
  printNormalizationSummary(normalizedLift, normalizedCoOrders);

  console.log("\nStep 4: Calculating CoAffinity matrix...");
  const coAffinityMatrix = calculateCoAffinityMatrix(
    normalizedLift,
    normalizedCoOrders,
  );
  printCoAffinitySummary(coAffinityMatrix);

  // Build stats object
  const categoryOrderCounts: Record<string, number> = {};
  for (const [cat, count] of coOrdersMatrix.orderCounts.entries()) {
    categoryOrderCounts[cat] = count;
  }

  const stats: MatrixStats = {
    liftP5: liftBounds.p5,
    liftP95: liftBounds.p95,
    coOrdersP5: coOrdersBounds.p5,
    coOrdersP95: coOrdersBounds.p95,
    totalOrders: coOrdersMatrix.totalOrders,
    categoryOrderCounts,
  };

  return {
    coOrdersMatrix,
    liftMatrix,
    normalizedLift,
    normalizedCoOrders,
    coAffinityMatrix,
    stats,
  };
}

/**
 * CLI entry point to build matrix from data directory
 */
export async function buildMatrix(options: BuildMatrixOptions): Promise<void> {
  const { dataDir, outputDir } = options;

  console.log(`Loading data from ${dataDir}...`);
  const categories = loadCategories(dataDir);
  const orders = loadOrders(dataDir);

  console.log(
    `Loaded ${categories.length} categories and ${orders.length} orders`,
  );

  // Build matrices
  const result = buildCoAffinityFromOrders(orders, categories);

  // Save results
  console.log(`\nSaving results to ${outputDir}...`);
  ensureDir(outputDir);

  // Save JSON files
  writeJSON(`${outputDir}/co-orders-matrix.json`, {
    categories: result.coOrdersMatrix.category,
    matrix: result.coOrdersMatrix.matrix,
    totalOrders: result.coOrdersMatrix.totalOrders,
    orderCounts: Object.fromEntries(result.coOrdersMatrix.orderCounts),
  });
  writeJSON(`${outputDir}/lift-matrix.json`, result.liftMatrix);
  writeJSON(`${outputDir}/normalized-lift-matrix.json`, result.normalizedLift);
  writeJSON(
    `${outputDir}/normalized-coorders-matrix.json`,
    result.normalizedCoOrders,
  );
  writeJSON(`${outputDir}/coaffinity-matrix.json`, result.coAffinityMatrix);
  writeJSON(`${outputDir}/matrix-stats.json`, result.stats);

  // Save CSV files
  writeMatrixToCSV(
    `${outputDir}/co-orders-matrix.csv`,
    result.coOrdersMatrix.matrix,
    result.coOrdersMatrix.category,
  );
  writeMatrixToCSV(
    `${outputDir}/lift-matrix.csv`,
    result.liftMatrix.matrix,
    result.liftMatrix.category,
  );
  writeMatrixToCSV(
    `${outputDir}/coaffinity-matrix.csv`,
    result.coAffinityMatrix.matrix,
    result.coAffinityMatrix.categories,
  );

  console.log("\nMatrix files saved:");
  console.log("  - co-orders-matrix.json, co-orders-matrix.csv");
  console.log("  - lift-matrix.json, lift-matrix.csv");
  console.log("  - normalized-lift-matrix.json");
  console.log("  - normalized-coorders-matrix.json");
  console.log("  - coaffinity-matrix.json, coaffinity-matrix.csv");
  console.log("  - matrix-stats.json");
}
