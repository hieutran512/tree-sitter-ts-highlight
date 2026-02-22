import type { Token, TokenCategory } from "tree-sitter-ts";

const TYPE_KEYWORDS = new Set([
    "class",
    "interface",
    "type",
    "enum",
    "struct",
    "trait",
    "namespace",
    "module",
]);

const VARIABLE_DECL_KEYWORDS = new Set([
    "const",
    "let",
    "var",
    "val",
    "final",
]);

const FUNCTION_DECL_KEYWORDS = new Set([
    "function",
    "def",
    "fn",
]);

const CONSTANT_LITERALS = new Set([
    "true",
    "false",
    "null",
    "undefined",
    "None",
    "nil",
]);

const PRIMITIVE_TYPE_NAMES = new Set([
    "string",
    "number",
    "boolean",
    "object",
    "void",
    "never",
    "unknown",
    "any",
    "int",
    "float",
    "double",
    "char",
    "str",
    "bytes",
]);

const BUILTIN_TYPE_LIKE_NAMES = new Set([
    "Array",
    "Map",
    "Set",
    "Date",
    "Promise",
    "Error",
    "RegExp",
    "Math",
    "JSON",
    "console",
]);

const isAlphaNumOrUnderscore = /^[A-Za-z0-9_]+$/;
const isUpperSnakeCase = /^[A-Z][A-Z0-9_]*$/;
const isPascalCase = /^[A-Z][A-Za-z0-9_]*$/;

type IndexedToken = {
    token: Token;
    index: number;
};

export function enhanceTokenSemantics(tokens: Token[]): Token[] {
    const indexed = tokens
        .map((token, index) => ({ token, index }))
        .filter(({ token }) => token.category !== "whitespace" && token.category !== "newline");

    if (indexed.length === 0) return tokens;

    const categoryOverrides = new Map<number, TokenCategory>();

    for (let i = 0; i < indexed.length; i++) {
        const current = indexed[i];
        const prev = i > 0 ? indexed[i - 1] : undefined;
        const next = i + 1 < indexed.length ? indexed[i + 1] : undefined;
        const next2 = i + 2 < indexed.length ? indexed[i + 2] : undefined;

        applyConstantLiteralHeuristic(current, categoryOverrides);
        applyIdentifierHeuristics(current, prev, next, next2, categoryOverrides);
    }

    if (categoryOverrides.size === 0) return tokens;

    return tokens.map((token, index) => {
        const override = categoryOverrides.get(index);
        if (!override || override === token.category) return token;
        return { ...token, category: override };
    });
}

function applyConstantLiteralHeuristic(
    current: IndexedToken,
    overrides: Map<number, TokenCategory>,
): void {
    const { token, index } = current;
    if (token.category !== "identifier") return;
    if (CONSTANT_LITERALS.has(token.value)) {
        overrides.set(index, "constant");
    }
}

function applyIdentifierHeuristics(
    current: IndexedToken,
    prev: IndexedToken | undefined,
    next: IndexedToken | undefined,
    next2: IndexedToken | undefined,
    overrides: Map<number, TokenCategory>,
): void {
    const { token, index } = current;
    if (token.category !== "identifier") return;
    if (!isAlphaNumOrUnderscore.test(token.value)) return;

    if (prev?.token.value === ".") {
        overrides.set(index, "attribute");
        return;
    }

    if (isUpperSnakeCase.test(token.value)) {
        overrides.set(index, "constant");
        return;
    }

    if (PRIMITIVE_TYPE_NAMES.has(token.value) || BUILTIN_TYPE_LIKE_NAMES.has(token.value)) {
        overrides.set(index, "type");
        return;
    }

    if (isPascalCase.test(token.value)) {
        overrides.set(index, "type");
        return;
    }

    if (prev?.token.category === "keyword" && TYPE_KEYWORDS.has(prev.token.value)) {
        overrides.set(index, "type");
        return;
    }

    if (prev?.token.category === "keyword" && FUNCTION_DECL_KEYWORDS.has(prev.token.value)) {
        overrides.set(index, "variable");
        return;
    }

    if (prev?.token.category === "keyword" && VARIABLE_DECL_KEYWORDS.has(prev.token.value)) {
        overrides.set(index, "variable");
        return;
    }

    if (next?.token.value === "=" && prev?.token.value !== ".") {
        overrides.set(index, "attribute");
        return;
    }

    if (prev?.token.value === "(" && next?.token.value === ")" && next2?.token.value === "=>") {
        overrides.set(index, "variable");
        return;
    }

    if (next?.token.value === "(") {
        overrides.set(index, "variable");
        return;
    }
}