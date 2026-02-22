import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        demo: "docs/browser-entry.ts",
    },
    format: ["iife"],
    globalName: "TreeSitterTSHighlightDemo",
    platform: "browser",
    target: "es2018",
    sourcemap: true,
    minify: false,
    clean: false,
    outExtension() {
        return {
            js: ".iife.js",
        };
    },
});
