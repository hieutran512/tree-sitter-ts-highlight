const params = new URLSearchParams(window.location.search);
const preferLocal = params.get("source") === "local";

const candidates = preferLocal
  ? [
      "../vendor/tree-sitter-ts-highlight/index.js",
      "../../../tree-sitter-ts-highlight/dist/index.js",
      "../../tree-sitter-ts-highlight/dist/index.js",
      "../tree-sitter-ts-highlight/dist/index.js",
      "https://esm.sh/tree-sitter-ts-highlight@latest",
    ]
  : [
      "https://esm.sh/tree-sitter-ts-highlight@latest",
      "../vendor/tree-sitter-ts-highlight/index.js",
      "../../../tree-sitter-ts-highlight/dist/index.js",
      "../../tree-sitter-ts-highlight/dist/index.js",
      "../tree-sitter-ts-highlight/dist/index.js",
    ];

async function loadModule() {
  const failures = [];

  for (const specifier of candidates) {
    try {
      const mod = await import(specifier);
      return { mod, specifier };
    } catch (error) {
      failures.push(specifier + ": " + String(error));
    }
  }

  throw new Error(["Failed to load tree-sitter-ts-highlight from any fallback source.", ...failures].join("\n"));
}

const loaded = await loadModule();
const mod = loaded.mod;

const required = ["builtinThemes", "highlight", "highlightDiff", "diffModel"];
for (const name of required) {
  if (!(name in mod)) {
    throw new Error("Loaded tree-sitter-ts-highlight module but missing export: " + name);
  }
}

export const builtinThemes = mod.builtinThemes;
export const highlight = mod.highlight;
export const highlightDiff = mod.highlightDiff;
export const diffModel = mod.diffModel;
export const __source = loaded.specifier;
