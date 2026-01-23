import { Faker } from "@faker-js/faker";

import { Command } from "commander";
import { generateDummyData } from "./data/dummy-data-generator.js";

import { calculateAffinities } from "./customer_level/batch-processor.js";
import { loadCategories, loadCoAffinityMatrix } from "./data/data-loader.js";
import { readJSON } from "./utils/csv-writer.js";
import type { CustomerAffinityResult, AffinityStats } from "./types/index.js";
import * as fs from "fs";
