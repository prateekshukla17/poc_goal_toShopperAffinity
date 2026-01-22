import * as fs from "fs";
import type {
  Category,
  Customer,
  Order,
  LoadedData,
  MatrixStats,
  CoAffinityMatrix,
} from "../types/index.js";
import { readJSON } from "../utils/csv-writer.js";

/**
 * Load categories from JSON file
 */
export function loadCategories(dataDir: string): Category[] {
  const filePath = `${dataDir}/categories.json`;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Categories file not found: ${filePath}`);
  }
  return readJSON<Category[]>(filePath);
}

/**
 * Load customers from JSON file
 */
export function loadCustomers(dataDir: string): Customer[] {
  const filePath = `${dataDir}/customers.json`;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Customers file not found: ${filePath}`);
  }
  const raw = readJSON<Array<Customer & { createdAt: string }>>(filePath);
  return raw.map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt),
  }));
}

/**
 * Load orders from JSON file
 */
export function loadOrders(dataDir: string): Order[] {
  const filePath = `${dataDir}/orders.json`;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Orders file not found: ${filePath}`);
  }
  const raw = readJSON<Array<Order & { createdAt: string }>>(filePath);
  return raw.map((o) => ({
    ...o,
    createdAt: new Date(o.createdAt),
  }));
}

/**
 * Load all data at once
 */
export function loadAllData(dataDir: string): LoadedData {
  return {
    categories: loadCategories(dataDir),
    customers: loadCustomers(dataDir),
    orders: loadOrders(dataDir),
  };
}

/**
 * Load matrix stats from JSON file
 */
export function loadMatrixStats(dataDir: string): MatrixStats {
  const filePath = `${dataDir}/matrix-stats.json`;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Matrix stats file not found: ${filePath}`);
  }
  return readJSON<MatrixStats>(filePath);
}

/**
 * Load CoAffinity matrix from JSON file
 */
export function loadCoAffinityMatrix(dataDir: string): CoAffinityMatrix {
  const filePath = `${dataDir}/coaffinity-matrix.json`;
  if (!fs.existsSync(filePath)) {
    throw new Error(`CoAffinity matrix file not found: ${filePath}`);
  }
  return readJSON<CoAffinityMatrix>(filePath);
}

/**
 * Build a lookup map from category ID to matrix index
 */
export function buildCategoryIndexMap(
  categories: string[],
): Map<string, number> {
  const map = new Map<string, number>();
  categories.forEach((cat, index) => map.set(cat, index));
  return map;
}

/**
 * Get CoAffinity score between two categories from the matrix
 */
export function getCoAffinity(
  matrix: CoAffinityMatrix,
  categoryIndexMap: Map<string, number>,
  cat1: string,
  cat2: string,
): number {
  const idx1 = categoryIndexMap.get(cat1);
  const idx2 = categoryIndexMap.get(cat2);

  if (idx1 === undefined || idx2 === undefined) {
    return 0;
  }

  return matrix.matrix[idx1][idx2];
}
