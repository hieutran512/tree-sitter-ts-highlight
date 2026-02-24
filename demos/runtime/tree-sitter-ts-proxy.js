const params = new URLSearchParams(window.location.search);
const preferRemote = params.get("source") === "remote";

const candidates = preferRemote
  ? [
      "https://esm.sh/tree-sitter-ts@latest",
      "../vendor/tree-sitter-ts/index.js",
      "../../../tree-sitter-ts/dist/index.js",
      "../../tree-sitter-ts/dist/index.js",
      "../tree-sitter-ts/dist/index.js",
    ]
  : [
      "../vendor/tree-sitter-ts/index.js",
      "../../../tree-sitter-ts/dist/index.js",
      "../../tree-sitter-ts/dist/index.js",
      "../tree-sitter-ts/dist/index.js",
      "https://esm.sh/tree-sitter-ts@latest",
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

  throw new Error(["Failed to load tree-sitter-ts from any fallback source.", ...failures].join("\n"));
}

const loaded = await loadModule();
const mod = loaded.mod;

if (typeof mod.tokenize !== "function") {
  throw new Error("Loaded tree-sitter-ts module but tokenize export is missing.");
}

export const tokenize = mod.tokenize;
export const extractSymbols = mod.extractSymbols;
export const registerProfile = mod.registerProfile;
export const __source = loaded.specifier;
