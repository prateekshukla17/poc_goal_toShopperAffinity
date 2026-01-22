import type {
  Order,
  CustomerPurchaseHistory,
  SeedWeight,
  CategoryPurchaseInfo,
} from "../types/index.js";

import { log2 } from "../utils/math-utils.js";
const RECENCY_BOOST_LAST_ORDER = 0.75;
const RECENCY_BOOST_OLDER = 0.5;
const FREQUENCY_BOOST_CAP = 1.6;
const FREQUENCY_BOOST_BASE = 1.0;
const FREQUENCY_BOOST_MULTIPLIER = 0.5;

export function buildCustomerPurchaseHistory(
  customerId: string,
  orders: Array<Order>,
): CustomerPurchaseHistory | null {
  const customerOrders = orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (customerOrders.length === 0) {
    return null;
  }

  const lastOrder = customerOrders[0];
  const lastOrderCategories = new Set(
    lastOrder.items.map((item) => item.categoryId),
  );
  const categories = new Map<string, CategoryPurchaseInfo>();
  for (const order of customerOrders) {
    const orderCategories = [
      ...new Set(order.items.map((item) => item.categoryId)),
    ];

    for (const catId of orderCategories) {
      const existing = categories.get(catId);

      if (existing) {
        existing.frequency++;
        if (order.createdAt > existing.lastPurchaseDate) {
          existing.lastPurchaseDate = order.createdAt;
        }
      } else {
        categories.set(catId, {
          categoryId: catId,
          frequency: 1,
          lastPurchaseDate: order.createdAt,
          isLastOrder: lastOrderCategories.has(catId),
        });
      }
    }
  }
  return {
    customerId,
    categories,
    lastOrderDate: lastOrder.createdAt,
    totalOrders: customerOrders.length,
  };
}

export function calculateFrequencyBoost(frequency: number): number {
  if (frequency <= 0) return FREQUENCY_BOOST_BASE;

  const boost =
    FREQUENCY_BOOST_BASE + FREQUENCY_BOOST_MULTIPLIER * log2(frequency);
  return Math.min(boost, FREQUENCY_BOOST_CAP);
}

export function calculateRecencyBoost(isLastOrder: boolean): number {
  return isLastOrder ? RECENCY_BOOST_LAST_ORDER : RECENCY_BOOST_OLDER;
}

export function calculateSeedWeight(
  purchaseInfo: CategoryPurchaseInfo,
): SeedWeight {
  const recencyBoost = calculateRecencyBoost(purchaseInfo.isLastOrder);
  const frequencyBoost = calculateFrequencyBoost(purchaseInfo.frequency);
  const seedWeight = recencyBoost * frequencyBoost;

  return {
    categoryId: purchaseInfo.categoryId,
    recencyBoost,
    frequencyBoost,
    seedWeight,
  };
}

export function calculateAllSeedWeights(
  purchaseHistory: CustomerPurchaseHistory,
): SeedWeight[] {
  const seedWeights: SeedWeight[] = [];

  for (const purchaseInfo of purchaseHistory.categories.values()) {
    seedWeights.push(calculateSeedWeight(purchaseInfo));
  }

  return seedWeights;
}

export function getUnpurchasedCategories(
  purchaseHistory: CustomerPurchaseHistory,
  allCategories: string[],
): string[] {
  return allCategories.filter((cat) => !purchaseHistory.categories.has(cat));
}

export function isCustomerEligible(
  purchaseHistory: CustomerPurchaseHistory,
  goalCategory: string,
  activityDays: number,
  referenceDate: Date = new Date(),
): boolean {
  // Check if goal category has been purchased
  if (purchaseHistory.categories.has(goalCategory)) {
    return false;
  }

  const cutoffDate = new Date(referenceDate);
  cutoffDate.setDate(cutoffDate.getDate() - activityDays);

  return purchaseHistory.lastOrderDate >= cutoffDate;
}

export function printSeedWeightSummary(seedWeights: SeedWeight[]): void {
  console.log("Seed Weights:");
  const sorted = [...seedWeights].sort((a, b) => b.seedWeight - a.seedWeight);

  for (const sw of sorted) {
    console.log(
      `  ${sw.categoryId}: ` +
        `recency=${sw.recencyBoost.toFixed(2)}, ` +
        `frequency=${sw.frequencyBoost.toFixed(2)}, ` +
        `weight=${sw.seedWeight.toFixed(4)}`,
    );
  }
}
