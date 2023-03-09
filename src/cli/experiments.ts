import fs from "node:fs";
import ExperimentParser from "../experimentParser/ExperimentParser";

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error("Usage: esno src/cli/experiments.ts FILE...");
  process.exit(1);
}

const parser = new ExperimentParser();

for (const file of files) {
  const script = fs.readFileSync(file, "utf8");
  parser.parseScript(script);
}

console.log("Parsed experiments:");
console.log(parser.experiments);
