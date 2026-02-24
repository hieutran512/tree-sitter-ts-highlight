import { builtinThemes, highlight, highlightDiff, diffModel } from "../src/index.js";
import { extractSymbols, registerProfile } from "tree-sitter-ts";

type DemoApi = {
    builtinThemes: typeof builtinThemes;
    highlight: typeof highlight;
    highlightDiff: typeof highlightDiff;
    diffModel: typeof diffModel;
    extractSymbols: typeof extractSymbols;
    registerProfile: typeof registerProfile;
};

const demoApi: DemoApi = {
    builtinThemes,
    highlight,
    highlightDiff,
    diffModel,
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
