import { Faker } from "@faker-js/faker";

import { Command } from "commander";
import { generateDummyData } from "./data/dummy-data-generator.js";
import { buildMatrix } from "./merchant_level/coaffinity-matrix.js";
import { calculateAffinities } from "./customer_level/batch-processor.js";
import { loadCategories, loadCoAffinityMatrix } from "./data/data-loader.js";
import { readJSON } from "./utils/csv-writer.js";
import type { CustomerAffinityResult, AffinityStats } from "./types/index.js";
import * as fs from "fs";

const program = new Command();

program
  .name("goal-affinity")
  .description("Calculate customer affinities to goal category")
  .version("1.0.0");

program
  .command("generate-data")
  .description("Generate dummy Data for customers,orders and category data")
  .option("-c, --customers <number>", "Number of customers to generate", "5000")
  .option("-o, --orders <number>", "Number of orders to generate", "10000")
  .option(
    "-d, --output-dir <path>",
    "Output directory for generated data",
    "./data",
  )
  .action(async (options) => {
    const customers = parseInt(options.customers, 10);
    const orders = parseInt(options.orders, 10);
    console.log("=== Generating Dummy Data ===");
    console.log(`Customers: ${customers}`);
    console.log(`Orders: ${orders}`);
    console.log(`Output: ${options.outputDir}`);
    await generateDummyData({
      customers,
      orders,
      outputDir: options.outputDir,
    });

    console.log("\nData generation complete!");
  });

program
  .command("build-matrix")
  .description("Build CoAffinity matrix from order data")
  .option("-d, --data-dir <path>", "Directory containing input data", "./data")
  .option(
    "-o, --output-dir <path>",
    "Output directory for matrix files",
    "./data",
  )
  .action(async (options) => {
    console.log("=== Building CoAffinity Matrix ===");
    console.log(`Data directory: ${options.dataDir}`);
    console.log(`Output directory: ${options.outputDir}`);

    await buildMatrix({
      dataDir: options.dataDir,
      outputDir: options.outputDir,
    });

    console.log("\nMatrix building complete!");
  });

program
  .command("calculate-affinity")
  .description("Calculate customer affinities for a goal category")
  .requiredOption(
    "-g, --goal <category>",
    "Goal category ID to calculate affinity for",
  )
  .option(
    "-d, --data-dir <path>",
    "Directory containing customer/order data",
    "./data",
  )
  .option(
    "-m, --matrix-dir <path>",
    "Directory containing CoAffinity matrix",
    "./data",
  )
  .option(
    "-o, --output-dir <path>",
    "Output directory for affinity results",
    "./output",
  )
  .option("-a, --active-days <number>", "Activity window in days", "90")
  .action(async (options) => {
    console.log("=== Calculating Customer Affinities ===");
    console.log(`Goal category: ${options.goal}`);
    console.log(`Activity window: ${options.activeDays} days`);

    await calculateAffinities({
      goal: options.goal,
      dataDir: options.dataDir,
      matrixDir: options.matrixDir,
      outputDir: options.outputDir,
      activeDays: parseInt(options.activeDays, 10),
    });

    console.log("\nAffinity calculation complete!");
  });

program
  .command("report")
  .description("Show summary report and top customers for a goal category")
  .requiredOption("-g, --goal <category>", "Goal category ID")
  .option(
    "-o, --output-dir <path>",
    "Directory containing affinity results",
    "./output",
  )
  .option("-t, --top <number>", "Number of top customers to show", "20")
  .option(
    "-d, --data-dir <path>",
    "Directory containing category data",
    "./data",
  )
  .action(async (options) => {
    const goal = options.goal;
    const outputDir = options.outputDir;
    const top = parseInt(options.top, 10);
    const dataDir = options.dataDir;

    console.log(`=== Affinity Report for "${goal}" ===`);

    // Check if results exist
    const resultsPath = `${outputDir}/affinity-${goal}.json`;
    const statsPath = `${outputDir}/affinity-${goal}-stats.json`;

    if (!fs.existsSync(resultsPath)) {
      console.error(`\nError: Results file not found: ${resultsPath}`);
      console.error('Run "calculate-affinity" first to generate results.');
      process.exit(1);
    }

    // Load results
    const results = readJSON<CustomerAffinityResult[]>(resultsPath);
    const stats = readJSON<AffinityStats>(statsPath);

    // Print statistics
    console.log("\n--- Statistics ---");
    console.log(`Total eligible customers: ${stats.processedCustomers}`);
    console.log(`Average affinity: ${stats.avgAffinity.toFixed(4)}`);
    console.log(`Median affinity: ${stats.medianAffinity.toFixed(4)}`);
    console.log(
      `Range: ${stats.minAffinity.toFixed(4)} - ${stats.maxAffinity.toFixed(4)}`,
    );

    console.log("\n--- Distribution ---");
    const { low, medium, high } = stats.affinityDistribution;
    const total = stats.processedCustomers;
    console.log(
      `Low (0-0.33):     ${low} customers (${((low / total) * 100).toFixed(1)}%)`,
    );
    console.log(
      `Medium (0.33-0.66): ${medium} customers (${((medium / total) * 100).toFixed(1)}%)`,
    );
    console.log(
      `High (0.66-1.0):  ${high} customers (${((high / total) * 100).toFixed(1)}%)`,
    );

    // Top customers
    console.log(`\n--- Top ${top} Customers ---`);
    const topCustomers = results.slice(0, top);

    for (let i = 0; i < topCustomers.length; i++) {
      const r = topCustomers[i];
      const topSeed =
        r.weightedSignals.length > 0
          ? [...r.weightedSignals].sort((a, b) => b.signal - a.signal)[0]
          : null;

      console.log(
        `${String(i + 1).padStart(2)}. ${r.customerId} ` +
          `| Affinity: ${r.affinity.toFixed(4)} ` +
          `| Signal: ${r.maxWeightedSignal.toFixed(4)} ` +
          `| Top Seed: ${topSeed ? topSeed.categoryId : "N/A"}`,
      );
    }

    // Category co-affinity info
    try {
      const coAffinityMatrix = loadCoAffinityMatrix(dataDir);
      const goalIndex = coAffinityMatrix.categories.indexOf(goal);

      if (goalIndex !== -1) {
        console.log(`\n--- Categories Most Related to "${goal}" ---`);

        const relatedCategories = coAffinityMatrix.categories
          .map((cat, idx) => ({
            category: cat,
            affinity: coAffinityMatrix.matrix[goalIndex][idx],
          }))
          .filter((c) => c.category !== goal && c.affinity > 0)
          .sort((a, b) => b.affinity - a.affinity)
          .slice(0, 10);

        for (const rc of relatedCategories) {
          console.log(`  ${rc.category}: ${rc.affinity.toFixed(4)}`);
        }
      }
    } catch {
      // Matrix not available, skip this section
    }

    console.log("\n--- Files ---");
    console.log(`Results: ${resultsPath}`);
    console.log(`Statistics: ${statsPath}`);
    console.log(`CSV: ${outputDir}/affinity-${goal}.csv`);
  });

program
  .command("list-categories")
  .description("List all available categories")
  .option(
    "-d, --data-dir <path>",
    "Directory containing category data",
    "./data",
  )
  .action((options) => {
    console.log("=== Available Categories ===\n");

    try {
      const categories = loadCategories(options.dataDir);

      for (const cat of categories) {
        console.log(`  ${cat.id.padEnd(15)} - ${cat.name}`);
      }

      console.log(`\nTotal: ${categories.length} categories`);
    } catch (error) {
      console.error('Error loading categories. Run "generate-data" first.');
      process.exit(1);
    }
  });

program
  .command("reset")
  .description("Clear all generated data and output files to start fresh")
  .option("-d, --data-dir <path>", "Data directory to clear", "./data")
  .option("-o, --output-dir <path>", "Output directory to clear", "./output")
  .option("--force", "Skip confirmation prompt", false)
  .action(async (options) => {
    const { dataDir, outputDir, force } = options;

    console.log("=== Reset Project ===\n");
    console.log("This will delete all files in:");
    console.log(`  - ${dataDir}`);
    console.log(`  - ${outputDir}`);

    if (!force) {
      // Simple confirmation using readline
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question("\nAre you sure you want to continue? (yes/no): ", resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "yes" && answer.toLowerCase() !== "y") {
        console.log("\nReset cancelled.");
        process.exit(0);
      }
    }

    console.log("\nClearing directories...");

    let filesDeleted = 0;
    let dirsDeleted = 0;

    // Helper function to recursively delete directory contents
    const clearDirectory = (dirPath: string): void => {
      if (!fs.existsSync(dirPath)) {
        console.log(`  Directory does not exist: ${dirPath}`);
        return;
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry.name}`;

        if (entry.isDirectory()) {
          clearDirectory(fullPath);
          fs.rmdirSync(fullPath);
          dirsDeleted++;
        } else {
          fs.unlinkSync(fullPath);
          filesDeleted++;
        }
      }
    };

    // Clear data directory
    if (fs.existsSync(dataDir)) {
      console.log(`\nClearing ${dataDir}...`);
      clearDirectory(dataDir);
      console.log(`  Cleared data directory`);
    }

    // Clear output directory
    if (fs.existsSync(outputDir)) {
      console.log(`\nClearing ${outputDir}...`);
      clearDirectory(outputDir);
      console.log(`  Cleared output directory`);
    }

    console.log("\n=== Reset Complete ===");
    console.log(
      `Deleted ${filesDeleted} files and ${dirsDeleted} subdirectories.`,
    );
    console.log("\nThe project is now ready for a fresh run:");
    console.log("  npx tsx src/index.ts run-all");
  });

program.parse();
