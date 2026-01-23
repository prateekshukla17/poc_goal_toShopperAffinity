## Project Structure

```
src/
├── types/                      # TypeScript interfaces
├── utils/                      # Shared utilities
│   ├── math-utils.ts          # Statistical functions
│   ├── percentile.ts          # P5-P95 normalization
│   └── csv-writer.ts          # Writes Csv files
├── data/                       # Data layer
│   ├── dummy-data-generator.ts # Synthetic data generation
│   └── data-loader.ts         # Data loading utilities
├── merchant_level/             # Category relationship analysis
│   ├── co-orders-calculator.ts # Co-occurrence counting
│   ├── lift-calculator.ts     # Statistical lift
│   ├── normalizer.ts          # Value normalization
│   └── coaffinity-matrix.ts   # Combined affinity scores
└── customer_level/             # Customer scoring
    ├── seed-weight-calculator.ts  # Purchase behavior weights
    ├── affinity-calculator.ts     # Final affinity computation
    └── batch-processor.ts         # Batch processing & export
```

## Commands

```
npm reset -- --force  // resets the project and deletes output files

npm run generate-data -- --customers 5000 --orders 10000     //generate customers and order data

npm run build-matrix   //builds the coAffinity matrix from the order data

npm run calculate-affinity -- --goal beauty --active-days 90 // Calculate customer affinities for a specific goal category


npm run report -- --goal beauty // Display a summary report with top customers for a goal category.

npm run list-categories // list available product categories
```
