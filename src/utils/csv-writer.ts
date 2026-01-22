import * as fs from "fs";
import * as path from "path";

export function objectsToCSV<T extends Record<string, unknown>>(
  objects: T[],
  columns?: string[],
): string {
  if (objects.length === 0) return "";

  const headers = columns || Object.keys(objects[0]);
  const lines: string[] = [headers.join(",")];

  for (const obj of objects) {
    const values = headers.map((header) => {
      const value = obj[header];
      if (value === null || value === undefined) return "";
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"'))
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return String(value);
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

export function writeCSV<T extends Record<string, unknown>>(
  filePath: string,
  data: T[],
  columns?: string[],
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const csv = objectsToCSV(data, columns);
  fs.writeFileSync(filePath, csv, "utf-8");
}

export function writeMatrixToCSV(
  filePath: string,
  matrix: number[][],
  categories: string[],
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines: string[] = [];

  lines.push(["", ...categories].join(","));

  // Data rows
  for (let i = 0; i < matrix.length; i++) {
    const values = matrix[i].map((v) => v.toFixed(6));
    lines.push([categories[i], ...values].join(","));
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

export function writeJSON(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function readJSON<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
