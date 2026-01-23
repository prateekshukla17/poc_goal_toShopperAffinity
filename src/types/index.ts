import { Interface } from "readline";

export interface Category {
  id: string;
  name: string;
  popularity: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface OrderItem {
  categoryId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  createdAt: Date;
  total: number;
}

export interface CoOrderMatrix {
  category: string[];
  matrix: number[][];
  totalOrders: number;
  orderCounts: Map<string, number>;
}

export interface LiftMatrix {
  category: Array<string>;
  matrix: Array<Array<number>>;
}

export interface NormalizedMatrix {
  categories: string[];
  matrix: number[][];
  p5: number;
  p95: number;
}
export interface CoAffinityMatrix {
  categories: string[];
  matrix: number[][];
}
export interface MatrixStats {
  liftP5: number;
  liftP95: number;
  coOrdersP5: number;
  coOrdersP95: number;
  totalOrders: number;
  categoryOrderCounts: Record<string, number>;
}
export interface CategoryPurchaseInfo {
  categoryId: string;
  frequency: number;
  lastPurchaseDate: Date;
  isLastOrder: boolean;
}

export interface CustomerPurchaseHistory {
  customerId: string;
  categories: Map<string, CategoryPurchaseInfo>;
  lastOrderDate: Date;
  totalOrders: number;
}

export interface SeedWeight {
  categoryId: string;
  recencyBoost: number;
  frequencyBoost: number;
  seedWeight: number;
}

export interface CustomerAffinityResult {
  customerId: string;
  goalCategory: string;
  seedWeights: Array<SeedWeight>;
  weightedSignals: Array<{ categoryId: string; signal: number }>;
  maxWeightedSignal: number;
  affinity: number;
}

// CLI Option Types
export interface GenerateDataOptions {
  customers: number;
  orders: number;
  outputDir: string;
}

export interface BuildMatrixOptions {
  dataDir: string;
  outputDir: string;
}

export interface CalculateAffinityOptions {
  goal: string;
  dataDir: string;
  matrixDir: string;
  outputDir: string;
  activeDays: number;
}

export interface ReportOptions {
  goal: string;
  outputDir: string;
  top: number;
}

// Data Loader Return Types
export interface LoadedData {
  categories: Category[];
  customers: Customer[];
  orders: Order[];
}

export interface AffinityStats {
  goalCategory: string;
  totalEligibleCustomers: number;
  processedCustomers: number;
  avgAffinity: number;
  medianAffinity: number;
  minAffinity: number;
  maxAffinity: number;
  affinityDistribution: {
    low: number; // 0-0.33
    medium: number; // 0.33-0.66
    high: number; // 0.66-1.0
  };
}
