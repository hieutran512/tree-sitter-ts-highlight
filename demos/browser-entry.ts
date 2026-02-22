import { builtinThemes, highlight } from "../src/index.js";
import { extractSymbols, registerProfile } from "tree-sitter-ts";

type DemoApi = {
    builtinThemes: typeof builtinThemes;
    highlight: typeof highlight;
    extractSymbols: typeof extractSymbols;
    registerProfile: typeof registerProfile;
};

const demoApi: DemoApi = {
    builtinThemes,
    highlight,
    extractSymbols,
    registerProfile,
};

const root =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
            ? window
            : typeof self !== "undefined"
                ? self
                : undefined;

if (root && typeof root === "object") {
    (root as typeof root & { TreeSitterTSHighlightDemo?: DemoApi }).TreeSitterTSHighlightDemo = demoApi;
}

export { demoApi };
