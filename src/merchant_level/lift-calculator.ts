import type { CoOrderMatrix, LiftMatrix } from "../types/index.js";

/**
 * Calculate lift matrix from co-orders data
 *
 * Lift formula: lift(A,B) = (co_orders * total_orders) / (orders_A * orders_B)
 *
 * Lift > 1 means A and B appear together more often than expected by chance
 * Lift < 1 means A and B appear together less often than expected
 * Lift = 1 means they are independent
 */
export function calculateLiftMatrix(coOrdersMatrix: CoOrderMatrix): LiftMatrix {
  const {
    category,
    matrix: coOrdersMatrixData,
    totalOrders,
    orderCounts,
  } = coOrdersMatrix;
  const n = category.length;

  // Initialize lift matrix
  const liftMatrix: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0),
  );

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const coOrders = coOrdersMatrixData[i][j];
      const ordersA = orderCounts.get(category[i]) || 0;
      const ordersB = orderCounts.get(category[j]) || 0;

      // Avoid division by zero
      if (ordersA === 0 || ordersB === 0) {
        liftMatrix[i][j] = 0;
        liftMatrix[j][i] = 0;
        continue;
      }

      // Calculate lift
      // lift(A,B) = P(A and B) / (P(A) * P(B))
      // = (co_orders / total_orders) / ((orders_A / total_orders) * (orders_B / total_orders))
      // = (co_orders * total_orders) / (orders_A * orders_B)
      const lift = (coOrders * totalOrders) / (ordersA * ordersB);

      liftMatrix[i][j] = lift;
      liftMatrix[j][i] = lift; // Symmetric
    }
  }

  return {
    category,
    matrix: liftMatrix,
  };
}

/**
 * Get lift value for a specific category pair
 */
export function getLift(
  liftMatrix: LiftMatrix,
  cat1: string,
  cat2: string,
): number {
  const idx1 = liftMatrix.category.indexOf(cat1);
  const idx2 = liftMatrix.category.indexOf(cat2);

  if (idx1 === -1 || idx2 === -1) {
    return 0;
  }

  return liftMatrix.matrix[idx1][idx2];
}

/**
 * Print a summary of the lift matrix
 */
export function printLiftSummary(liftMatrix: LiftMatrix): void {
  console.log("\n=== Lift Matrix Summary ===");

  // Collect all non-diagonal lift values
  const pairs: { cat1: string; cat2: string; lift: number }[] = [];
  const cats = liftMatrix.category;

  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      const lift = liftMatrix.matrix[i][j];
      if (lift > 0) {
        pairs.push({ cat1: cats[i], cat2: cats[j], lift });
      }
    }
  }

  // Sort by lift descending
  pairs.sort((a, b) => b.lift - a.lift);

  console.log("\nTop 10 Highest Lift Pairs (strong positive association):");
  for (let i = 0; i < Math.min(10, pairs.length); i++) {
    const p = pairs[i];
    console.log(`  ${p.cat1} + ${p.cat2}: ${p.lift.toFixed(3)}`);
  }

  // Sort by lift ascending (lowest lift)
  pairs.sort((a, b) => a.lift - b.lift);

  console.log("\nTop 10 Lowest Lift Pairs (negative association):");
  for (let i = 0; i < Math.min(10, pairs.length); i++) {
    const p = pairs[i];
    console.log(`  ${p.cat1} + ${p.cat2}: ${p.lift.toFixed(3)}`);
  }

  // Statistics
  const lifts = pairs.map((p) => p.lift);
  const avgLift = lifts.reduce((a, b) => a + b, 0) / lifts.length;
  const minLift = Math.min(...lifts);
  const maxLift = Math.max(...lifts);

  console.log("\nLift Statistics:");
  console.log(`  Min: ${minLift.toFixed(3)}`);
  console.log(`  Max: ${maxLift.toFixed(3)}`);
  console.log(`  Average: ${avgLift.toFixed(3)}`);
}
