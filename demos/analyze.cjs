const { tokenize } = require("tree-sitter-ts");

const code = `import { readFile } from "node:fs/promises";

interface Config {
  port: number;
  host: string;
  debug?: boolean;
}

export class Server {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async start(): Promise<void> {
    const { port, host } = this.config;
    console.log("Server started");
  }
}

export function createServer(port = 3000): Server {
  return new Server({ port, host: "localhost", debug: true });
}`;

const tokens = tokenize(code, "typescript");

// Show each token with its category
console.log("=== Token Analysis (TypeScript) ===\n");
for (const t of tokens) {
  if (t.category === "whitespace" || t.category === "newline") continue;
  console.log(`  ${t.category.padEnd(14)} ${JSON.stringify(t.value)}`);
}

// Group by category and show unique values
console.log("\n=== By Category ===\n");
const byCategory = {};
for (const t of tokens) {
  if (t.category === "whitespace" || t.category === "newline") continue;
  if (!byCategory[t.category]) byCategory[t.category] = new Set();
  byCategory[t.category].add(t.value);
}

for (const [cat, values] of Object.entries(byCategory).sort()) {
  console.log(`  ${cat}: ${[...values].join(", ")}`);
}

// Now check Python
console.log("\n\n=== Token Analysis (Python) ===\n");
const pyCode = `from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    name: str
    email: str

    def greet(self) -> str:
        return f"Hello, {self.name}!"

def process_users(users: list[User]) -> dict[str, int]:
    """Count users by age group."""
    groups = {}
    for user in users:
        if user.age is None:
            continue
        key = "young" if user.age < 30 else "senior"
    return groups`;

const pyTokens = tokenize(pyCode, "python");
const pyByCat = {};
for (const t of pyTokens) {
  if (t.category === "whitespace" || t.category === "newline") continue;
  if (!pyByCat[t.category]) pyByCat[t.category] = new Set();
  pyByCat[t.category].add(t.value);
}
for (const [cat, values] of Object.entries(pyByCat).sort()) {
  console.log(`  ${cat}: ${[...values].join(", ")}`);
}

// Check what highlight.js differentiates that we don't
console.log("\n\n=== KEY GAPS ===\n");
console.log("Highlight.js differentiates these which we DON'T:");
console.log("  1. Function NAMES (title.function) vs regular identifiers");
console.log("  2. Class NAMES (title.class) vs regular identifiers");
console.log("  3. Built-in types (built_in) like console, Promise, Array");
console.log("  4. Function params (params) vs regular identifiers");
console.log("  5. Property access (property) like obj.property");
console.log("  6. Literals/constants (literal) like true, false, null, None");
console.log("  7. this/self (variable.language)");
console.log("");
console.log("In our tokenizer, ALL of these show as 'identifier' - same color!");
console.log("This makes our output look flat/monochrome compared to hljs.");
