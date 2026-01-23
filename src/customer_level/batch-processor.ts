import type {
  Order,
  Customer,
  CoAffinityMatrix,
  CustomerAffinityResult,
  CalculateAffinityOptions,
  AffinityStats,
} from "../types/index.js";
import {
  loadOrders,
  loadCustomers,
  loadCoAffinityMatrix,
  loadCategories,
} from "../data/data-loader.js";
import {
  buildCustomerPurchaseHistory,
  isCustomerEligible,
} from "./seed-weight_calculator.js";
import {
  calculateCustomerAffinity,
  createCategoryIndexMap,
} from "./affinity-calculator.js";
import { writeJSON, writeCSV, ensureDir } from "../utils/csv-writer.js";
import { mean, median, min, max } from "../utils/math-utils.js";

/**
 * Process all customers and calculate affinities for a goal category
 */
export function processAllCustomers(
  customers: Customer[],
  orders: Order[],
  coAffinityMatrix: CoAffinityMatrix,
  goalCategory: string,
  activeDays: number,
  referenceDate: Date = new Date(),
): {
  results: CustomerAffinityResult[];
  skipped: { customerId: string; reason: string }[];
} {
  const categoryIndexMap = createCategoryIndexMap(coAffinityMatrix);
  const results: CustomerAffinityResult[] = [];
  const skipped: { customerId: string; reason: string }[] = [];

  // Validate goal category exists
  if (!coAffinityMatrix.categories.includes(goalCategory)) {
    throw new Error(
      `Goal category "${goalCategory}" not found. ` +
        `Available categories: ${coAffinityMatrix.categories.join(", ")}`,
    );
  }

  console.log(`Processing ${customers.length} customers...`);
  let processed = 0;
  let eligible = 0;

  for (const customer of customers) {
    processed++;

    if (processed % 1000 === 0) {
      console.log(`  Processed ${processed}/${customers.length} customers...`);
    }

    // Build purchase history
    const purchaseHistory = buildCustomerPurchaseHistory(customer.id, orders);

    if (!purchaseHistory) {
      skipped.push({ customerId: customer.id, reason: "No orders" });
      continue;
    }

    // Check eligibility
    if (
      !isCustomerEligible(
        purchaseHistory,
        goalCategory,
        activeDays,
        referenceDate,
      )
    ) {
      const hasGoalCategory = purchaseHistory.categories.has(goalCategory);
      const reason = hasGoalCategory
        ? "Already purchased goal category"
        : "Not active in window";
      skipped.push({ customerId: customer.id, reason });
      continue;
    }

    eligible++;

    // Calculate affinity
    const result = calculateCustomerAffinity(
      purchaseHistory,
      goalCategory,
      coAffinityMatrix,
      categoryIndexMap,
    );

    results.push(result);
  }

  console.log(`\nProcessed ${processed} customers`);
  console.log(`  Eligible: ${eligible}`);
  console.log(`  Skipped: ${skipped.length}`);

  return { results, skipped };
}

/**
 * Calculate statistics for affinity results
 */
export function calculateAffinityStats(
  results: CustomerAffinityResult[],
  goalCategory: string,
  totalCustomers: number,
): AffinityStats {
  const affinities = results.map((r) => r.affinity);

  // Calculate distribution buckets
  const low = affinities.filter((a) => a < 0.33).length;
  const medium = affinities.filter((a) => a >= 0.33 && a < 0.66).length;
  const high = affinities.filter((a) => a >= 0.66).length;

  return {
    goalCategory,
    totalEligibleCustomers: totalCustomers,
    processedCustomers: results.length,
    avgAffinity: mean(affinities),
    medianAffinity: median(affinities),
    minAffinity: min(affinities),
    maxAffinity: max(affinities),
    affinityDistribution: { low, medium, high },
  };
}

/**
 * Print affinity statistics
 */
export function printAffinityStats(stats: AffinityStats): void {
  console.log("\n=== Affinity Statistics ===");
  console.log(`Goal Category: ${stats.goalCategory}`);
  console.log(`Processed Customers: ${stats.processedCustomers}`);
  console.log(`\nAffinity Distribution:`);
  console.log(`  Average: ${stats.avgAffinity.toFixed(4)}`);
  console.log(`  Median: ${stats.medianAffinity.toFixed(4)}`);
  console.log(`  Min: ${stats.minAffinity.toFixed(4)}`);
  console.log(`  Max: ${stats.maxAffinity.toFixed(4)}`);
  console.log(`\nAffinity Buckets:`);
  console.log(
    `  Low (0-0.33): ${stats.affinityDistribution.low} ` +
      `(${((stats.affinityDistribution.low / stats.processedCustomers) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  Medium (0.33-0.66): ${stats.affinityDistribution.medium} ` +
      `(${((stats.affinityDistribution.medium / stats.processedCustomers) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  High (0.66-1.0): ${stats.affinityDistribution.high} ` +
      `(${((stats.affinityDistribution.high / stats.processedCustomers) * 100).toFixed(1)}%)`,
  );
}

/**
 * Export results to files
 */
export function exportResults(
  results: CustomerAffinityResult[],
  stats: AffinityStats,
  outputDir: string,
  goalCategory: string,
): void {
  ensureDir(outputDir);

  // Sort by affinity descending
  const sortedResults = [...results].sort((a, b) => b.affinity - a.affinity);

  // Save full results as JSON
  writeJSON(`${outputDir}/affinity-${goalCategory}.json`, sortedResults);

  // Save summary CSV
  const csvData = sortedResults.map((r) => ({
    customerId: r.customerId,
    goalCategory: r.goalCategory,
    affinity: r.affinity.toFixed(6),
    maxSignal: r.maxWeightedSignal.toFixed(6),
    numSeedCategories: r.seedWeights.length,
    topSeedCategory:
      r.weightedSignals.length > 0
        ? [...r.weightedSignals].sort((a, b) => b.signal - a.signal)[0]
            .categoryId
        : "",
    topSeedSignal:
      r.weightedSignals.length > 0
        ? [...r.weightedSignals]
            .sort((a, b) => b.signal - a.signal)[0]
            .signal.toFixed(6)
        : "",
  }));
  writeCSV(`${outputDir}/affinity-${goalCategory}.csv`, csvData);

  // Save stats
  writeJSON(`${outputDir}/affinity-${goalCategory}-stats.json`, stats);

  console.log(`\nResults saved to ${outputDir}/`);
  console.log(`  - affinity-${goalCategory}.json (full results)`);
  console.log(`  - affinity-${goalCategory}.csv (summary)`);
  console.log(`  - affinity-${goalCategory}-stats.json (statistics)`);
}

/**
 * CLI entry point for calculating affinities
 */
export async function calculateAffinities(
  options: CalculateAffinityOptions,
): Promise<void> {
  const { goal, dataDir, matrixDir, outputDir, activeDays } = options;

  console.log(`\nCalculating affinities for goal category: ${goal}`);
  console.log(`Activity window: ${activeDays} days`);

  // Load data
  console.log(`\nLoading data from ${dataDir}...`);
  const customers = loadCustomers(dataDir);
  const orders = loadOrders(dataDir);
  const categories = loadCategories(dataDir);

  console.log(`Loaded ${customers.length} customers, ${orders.length} orders`);

  // Load matrix
  console.log(`Loading CoAffinity matrix from ${matrixDir}...`);
  const coAffinityMatrix = loadCoAffinityMatrix(matrixDir);

  // Validate goal category
  const validCategories = categories.map((c) => c.id);
  if (!validCategories.includes(goal)) {
    console.error(`\nError: Invalid goal category "${goal}"`);
    console.error(`Valid categories: ${validCategories.join(", ")}`);
    process.exit(1);
  }

  // Process customers
  const { results, skipped } = processAllCustomers(
    customers,
    orders,
    coAffinityMatrix,
    goal,
    activeDays,
  );

  // Calculate and print stats
  const stats = calculateAffinityStats(results, goal, customers.length);
  printAffinityStats(stats);

  // Show skip reasons summary
  const skipReasons = new Map<string, number>();
  for (const s of skipped) {
    skipReasons.set(s.reason, (skipReasons.get(s.reason) || 0) + 1);
  }
  console.log("\nSkipped Customers:");
  for (const [reason, count] of skipReasons.entries()) {
    console.log(`  ${reason}: ${count}`);
  }

  // Export results
  exportResults(results, stats, outputDir, goal);

  // Show top customers
  console.log("\nTop 10 Customers by Affinity:");
  const top10 = [...results]
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, 10);
  for (let i = 0; i < top10.length; i++) {
    const r = top10[i];
    console.log(
      `  ${i + 1}. ${r.customerId}: affinity=${r.affinity.toFixed(4)}, ` +
        `signal=${r.maxWeightedSignal.toFixed(4)}`,
    );
  }
}
