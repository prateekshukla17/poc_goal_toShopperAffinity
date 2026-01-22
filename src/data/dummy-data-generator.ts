import { faker } from "@faker-js/faker";
import type {
  Category,
  Customer,
  Order,
  OrderItem,
  GenerateDataOptions,
} from "../types/index.js";

import { writeJSON, writeCSV, ensureDir } from "../utils/csv-writer.js";

const PREDEFINED_CATEGORIES: Category[] = [
  { id: "skincare", name: "Skincare", popularity: 0.15 },
  { id: "beauty", name: "Beauty & Cosmetics", popularity: 0.12 },
  { id: "haircare", name: "Hair Care", popularity: 0.08 },
  { id: "electronics", name: "Electronics", popularity: 0.1 },
  { id: "fashion", name: "Fashion", popularity: 0.14 },
  { id: "footwear", name: "Footwear", popularity: 0.07 },
  { id: "home", name: "Home & Living", popularity: 0.08 },
  { id: "kitchen", name: "Kitchen", popularity: 0.05 },
  { id: "fitness", name: "Fitness & Sports", popularity: 0.06 },
  { id: "nutrition", name: "Health & Nutrition", popularity: 0.04 },
  { id: "baby", name: "Baby & Kids", popularity: 0.03 },
  { id: "toys", name: "Toys & Games", popularity: 0.02 },
  { id: "books", name: "Books", popularity: 0.02 },
  { id: "jewelry", name: "Jewelry & Accessories", popularity: 0.04 },
  { id: "pet", name: "Pet Supplies", popularity: 0.03 },
  { id: "automotive", name: "Automotive", popularity: 0.02 },
  { id: "garden", name: "Garden & Outdoor", popularity: 0.03 },
  { id: "office", name: "Office Supplies", popularity: 0.02 },
];

const CO_OCCURRENCE_RULES: [string, string, number][] = [
  // High co-occurrence pairs
  ["skincare", "beauty", 3.5],
  ["skincare", "haircare", 2.5],
  ["beauty", "haircare", 2.2],
  ["fashion", "footwear", 2.8],
  ["fashion", "jewelry", 2.5],
  ["home", "kitchen", 2.5],
  ["fitness", "nutrition", 3.0],
  ["baby", "toys", 3.2],
  ["electronics", "office", 2.0],
  ["garden", "home", 2.0],

  // Low co-occurrence pairs
  ["electronics", "beauty", 0.4],
  ["automotive", "skincare", 0.3],
  ["pet", "jewelry", 0.4],
  ["baby", "automotive", 0.3],
  ["books", "fitness", 0.5],
  ["toys", "office", 0.4],
  ["garden", "electronics", 0.5],
];

function buildCoOccurrenceMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (const [cat1, cat2, multiplier] of CO_OCCURRENCE_RULES) {
    map.set(`${cat1}-${cat2}`, multiplier);
    map.set(`${cat2}-${cat1}`, multiplier);
  }
  return map;
}

const coOccurrenceMap = buildCoOccurrenceMap();

function getCoOccurrenceMultiplier(cat1: string, cat2: string): number {
  return coOccurrenceMap.get(`${cat1}-${cat2}`) ?? 1.0;
}

/**
 * Select a category based on popularity weights
 */
function selectCategoryByPopularity(categories: Category[]): Category {
  const totalWeight = categories.reduce((sum, cat) => sum + cat.popularity, 0);
  let random = Math.random() * totalWeight;

  for (const category of categories) {
    random -= category.popularity;
    if (random <= 0) return category;
  }

  return categories[categories.length - 1];
}

/**
 * Select additional categories for an order based on co-occurrence patterns
 */
function selectAdditionalCategories(
  firstCategory: Category,
  categories: Category[],
  count: number,
): Category[] {
  const selected: Category[] = [];
  const availableCategories = categories.filter(
    (c) => c.id !== firstCategory.id,
  );

  for (let i = 0; i < count && availableCategories.length > 0; i++) {
    // Calculate weights based on popularity and co-occurrence
    const weights = availableCategories.map((cat) => {
      const coOccMultiplier = getCoOccurrenceMultiplier(
        firstCategory.id,
        cat.id,
      );
      // Also consider co-occurrence with already selected categories
      let additionalMultiplier = 1;
      for (const selectedCat of selected) {
        additionalMultiplier *= getCoOccurrenceMultiplier(
          selectedCat.id,
          cat.id,
        );
      }
      return cat.popularity * coOccMultiplier * additionalMultiplier;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let j = 0; j < availableCategories.length; j++) {
      random -= weights[j];
      if (random <= 0) {
        selected.push(availableCategories[j]);
        availableCategories.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

/**
 * Generate customers
 */
function generateCustomers(count: number): Customer[] {
  const customers: Customer[] = [];

  for (let i = 0; i < count; i++) {
    customers.push({
      id: `CUST-${String(i + 1).padStart(6, "0")}`,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      createdAt: faker.date.past({ years: 2 }),
    });
  }

  return customers;
}

/**
 * Generate orders with realistic patterns
 */
function generateOrders(
  count: number,
  customers: Customer[],
  categories: Category[],
): Order[] {
  const orders: Order[] = [];

  // Create a distribution of orders per customer (some customers buy more)
  const customerOrderCounts = new Map<string, number>();
  for (const customer of customers) {
    // Power law distribution: most customers have few orders, some have many
    const orderCount = Math.max(1, Math.floor(Math.pow(Math.random(), 2) * 20));
    customerOrderCounts.set(customer.id, orderCount);
  }

  // Normalize to match total order count
  const totalExpected = Array.from(customerOrderCounts.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const scaleFactor = count / totalExpected;

  for (const [customerId, expectedOrders] of customerOrderCounts.entries()) {
    const adjustedOrders = Math.max(
      1,
      Math.round(expectedOrders * scaleFactor),
    );

    for (let i = 0; i < adjustedOrders && orders.length < count; i++) {
      // Determine number of categories in this order (1-5, weighted toward fewer)
      const numCategories = Math.min(
        categories.length,
        Math.max(1, Math.floor(Math.pow(Math.random(), 0.7) * 5) + 1),
      );

      // Select first category by popularity
      const firstCategory = selectCategoryByPopularity(categories);

      // Select additional categories based on co-occurrence
      const additionalCategories = selectAdditionalCategories(
        firstCategory,
        categories,
        numCategories - 1,
      );

      const orderCategories = [firstCategory, ...additionalCategories];

      // Generate order items
      const items: OrderItem[] = orderCategories.map((cat) => ({
        categoryId: cat.id,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: parseFloat((Math.random() * 100 + 10).toFixed(2)),
      }));

      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      orders.push({
        id: `ORD-${String(orders.length + 1).padStart(8, "0")}`,
        customerId,
        items,
        createdAt: faker.date.recent({ days: 180 }),
        total: parseFloat(total.toFixed(2)),
      });
    }
  }

  // Sort by date
  orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return orders;
}

/**
 * Main function to generate all dummy data
 */
export async function generateDummyData(
  options: GenerateDataOptions,
): Promise<void> {
  const { customers: customerCount, orders: orderCount, outputDir } = options;

  console.log(
    `Generating ${customerCount} customers and ${orderCount} orders...`,
  );

  // Ensure output directory exists
  ensureDir(outputDir);

  // Generate data
  const categories = PREDEFINED_CATEGORIES;
  const customers = generateCustomers(customerCount);
  const orders = generateOrders(orderCount, customers, categories);

  console.log(
    `Generated ${customers.length} customers and ${orders.length} orders`,
  );

  // Calculate some statistics
  const categoryCounts = new Map<string, number>();
  const coOrderCounts = new Map<string, number>();

  for (const order of orders) {
    const orderCats = order.items.map((item) => item.categoryId);

    for (const cat of orderCats) {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }

    // Count co-occurrences
    for (let i = 0; i < orderCats.length; i++) {
      for (let j = i + 1; j < orderCats.length; j++) {
        const key = [orderCats[i], orderCats[j]].sort().join("-");
        coOrderCounts.set(key, (coOrderCounts.get(key) || 0) + 1);
      }
    }
  }

  // Print category distribution
  console.log("\nCategory Distribution:");
  for (const cat of categories) {
    const count = categoryCounts.get(cat.id) || 0;
    const pct = ((count / orders.length) * 100).toFixed(1);
    console.log(`  ${cat.name}: ${count} orders (${pct}%)`);
  }

  // Save data
  console.log("\nSaving data...");

  // JSON files
  writeJSON(`${outputDir}/categories.json`, categories);
  writeJSON(`${outputDir}/customers.json`, customers);
  writeJSON(`${outputDir}/orders.json`, orders);

  // CSV files
  writeCSV(`${outputDir}/categories.csv`, categories);
  writeCSV(
    `${outputDir}/customers.csv`,
    customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  );

  // Flatten orders for CSV
  const flatOrders = orders.flatMap((order) =>
    order.items.map((item) => ({
      orderId: order.id,
      customerId: order.customerId,
      categoryId: item.categoryId,
      quantity: item.quantity,
      price: item.price,
      orderTotal: order.total,
      createdAt: order.createdAt.toISOString(),
    })),
  );
  writeCSV(`${outputDir}/order-items.csv`, flatOrders);

  console.log(`\nData saved to ${outputDir}/`);
  console.log("  - categories.json, categories.csv");
  console.log("  - customers.json, customers.csv");
  console.log("  - orders.json, order-items.csv");
}

export { PREDEFINED_CATEGORIES };
