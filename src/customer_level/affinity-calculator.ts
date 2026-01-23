import type {
  CustomerPurchaseHistory,
  SeedWeight,
  CoAffinityMatrix,
  CustomerAffinityResult,
} from "../types/index.js";
import { buildCategoryIndexMap, getCoAffinity } from "../data/data-loader.js";
import { calculateAllSeedWeights } from "./seed-weight_calculator.js";

export function calculateWeightedSignals(
  seedWeights: SeedWeight[],
  goalCategory: string,
  coAffinityMatrix: CoAffinityMatrix,
  categoryIndexMap: Map<string, number>,
): { categoryId: string; signal: number }[] {
  const signals: { categoryId: string; signal: number }[] = [];
  for (const seedWeight of seedWeights) {
    const coAffinity = getCoAffinity(
      coAffinityMatrix,
      categoryIndexMap,
      seedWeight.categoryId,
      goalCategory,
    );

    const signal = coAffinity * seedWeight.seedWeight;

    signals.push({
      categoryId: seedWeight.categoryId,
      signal,
    });
  }

  return signals;
}

export function calculateRawSignal(
  weightedSignals: { categoryId: string; signal: number }[],
): number {
  if (weightedSignals.length === 0) return 0;
  return Math.max(...weightedSignals.map((s) => s.signal));
}

export function calculateFinalAffinity(rawSignal: number): number {
  return 1 - Math.exp(-rawSignal);
}

export function calculateCustomerAffinity(
  purchaseHistory: CustomerPurchaseHistory,
  goalCategory: string,
  coAffinityMatrix: CoAffinityMatrix,
  categoryIndexMap: Map<string, number>,
): CustomerAffinityResult {
  const seedWeights = calculateAllSeedWeights(purchaseHistory);

  const weightedSignals = calculateWeightedSignals(
    seedWeights,
    goalCategory,
    coAffinityMatrix,
    categoryIndexMap,
  );

  const maxWeightedSignal = calculateRawSignal(weightedSignals);

  const affinity = calculateFinalAffinity(maxWeightedSignal);

  return {
    customerId: purchaseHistory.customerId,
    goalCategory,
    seedWeights,
    weightedSignals,
    maxWeightedSignal,
    affinity,
  };
}

export function printAffinityBreakdown(result: CustomerAffinityResult): void {
  console.log(`\n=== Affinity Breakdown for ${result.customerId} ===`);
  console.log(`Goal Category: ${result.goalCategory}`);

  console.log("\nSeed Weights (purchased categories):");
  const sortedSeeds = [...result.seedWeights].sort(
    (a, b) => b.seedWeight - a.seedWeight,
  );
  for (const sw of sortedSeeds) {
    console.log(
      `  ${sw.categoryId}: weight=${sw.seedWeight.toFixed(4)} ` +
        `(recency=${sw.recencyBoost}, freq=${sw.frequencyBoost.toFixed(2)})`,
    );
  }

  console.log("\nWeighted Signals (CoAffinity * SeedWeight):");
  const sortedSignals = [...result.weightedSignals].sort(
    (a, b) => b.signal - a.signal,
  );
  for (const ws of sortedSignals) {
    console.log(`  ${ws.categoryId}: ${ws.signal.toFixed(4)}`);
  }

  console.log(`\nMax Signal: ${result.maxWeightedSignal.toFixed(4)}`);
  console.log(`Final Affinity: ${result.affinity.toFixed(4)}`);
}

export function createCategoryIndexMap(
  coAffinityMatrix: CoAffinityMatrix,
): Map<string, number> {
  return buildCategoryIndexMap(coAffinityMatrix.categories);
}
