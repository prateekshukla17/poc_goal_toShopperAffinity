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
