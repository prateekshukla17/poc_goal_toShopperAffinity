import type { Order, Category, CoOrderMatrix } from "../types/index.js";

export function calculateCoOrderMatrix(
  orders: Array<Order>,
  categories: Array<Category>,
): CoOrderMatrix {
  const categoryIds = categories.map((c) => c.id);
  const categoryIndexMap = new Map<string, number>();
  categoryIds.forEach((id, index) => categoryIndexMap.set(id, index));

  const n = categoryIds.length;

  const matrix: Array<Array<number>> = Array.from({ length: n }, () =>
    Array(n).fill(0),
  );

  const orderCounts = new Map<string, number>();
  for (const cat of categoryIds) {
    orderCounts.set(cat, 0);
  }
  for (const order of orders) {
    // Get unique categories in this order
    const orderCategories = [
      ...new Set(order.items.map((item) => item.categoryId)),
    ];

    // Count single category occurrences
    for (const cat of orderCategories) {
      const count = orderCounts.get(cat);
      if (count !== undefined) {
        orderCounts.set(cat, count + 1);
      }
    }

    // Count co-occurrences (pairs of categories in same order)
    for (let i = 0; i < orderCategories.length; i++) {
      for (let j = i + 1; j < orderCategories.length; j++) {
        const idx1 = categoryIndexMap.get(orderCategories[i]);
        const idx2 = categoryIndexMap.get(orderCategories[j]);

        if (idx1 !== undefined && idx2 !== undefined) {
          matrix[idx1][idx2]++;
          matrix[idx2][idx1]++; // Symmetric
        }
      }
    }
  }

  return {
    category: categoryIds,
    matrix,
    totalOrders: orders.length,
    orderCounts,
  };
}
export function getCoOrderCount(
  coOrdersMatrix: CoOrderMatrix,
  cat1: string,
  cat2: string,
): number {
  const idx1 = coOrdersMatrix.category.indexOf(cat1);
  const idx2 = coOrdersMatrix.category.indexOf(cat2);

  if (idx1 === -1 || idx2 === -1) {
    return 0;
  }

  return coOrdersMatrix.matrix[idx1][idx2];
}

/**
 * Print a summary of the co-orders matrix
 */
export function printCoOrdersSummary(coOrdersMatrix: CoOrderMatrix): void {
  console.log("\n=== Co-Orders Matrix Summary ===");
  console.log(`Total Orders: ${coOrdersMatrix.totalOrders}`);
  console.log("\nOrders per Category:");

  for (const [cat, count] of coOrdersMatrix.orderCounts.entries()) {
    const pct = ((count / coOrdersMatrix.totalOrders) * 100).toFixed(1);
    console.log(`  ${cat}: ${count} (${pct}%)`);
  }

  // Find top co-occurring pairs
  const pairs: { cat1: string; cat2: string; count: number }[] = [];
  const cats = coOrdersMatrix.category;

  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      pairs.push({
        cat1: cats[i],
        cat2: cats[j],
        count: coOrdersMatrix.matrix[i][j],
      });
    }
  }

  pairs.sort((a, b) => b.count - a.count);

  console.log("\nTop 10 Co-occurring Category Pairs:");
  for (let i = 0; i < Math.min(10, pairs.length); i++) {
    const p = pairs[i];
    console.log(`  ${p.cat1} + ${p.cat2}: ${p.count} orders`);
  }
}
