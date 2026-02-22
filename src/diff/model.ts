import { tokenize } from "tree-sitter-ts";
import type { Token } from "tree-sitter-ts";
import { groupTokensByLine } from "../html/line-wrapper.js";
import { enhanceTokenSemantics } from "../semantic/enhancer.js";
import type { DiffModel, DiffOptions, DiffRow } from "../types.js";

interface LinePair {
    oldLineNumber: number | null;
    newLineNumber: number | null;
    oldText: string;
    newText: string;
}

type Op =
    | { kind: "equal"; oldIndex: number; newIndex: number }
    | { kind: "delete"; oldIndex: number }
    | { kind: "add"; newIndex: number };

export interface DiffModelWithTokens {
    model: DiffModel;
    oldLineTokens: Map<number, Token[]>;
    newLineTokens: Map<number, Token[]>;
}

export function createDiffModel(
    oldSource: string,
    newSource: string,
    options: DiffOptions = {},
): DiffModel {
    const oldLines = splitLines(oldSource);
    const newLines = splitLines(newSource);
    const pairs = alignLinePairs(oldLines, newLines);

    const rows: DiffRow[] = pairs.map((pair) => {
        const { oldLineNumber, newLineNumber, oldText, newText } = pair;

        let changeType: DiffRow["changeType"] = "context";
        if (oldLineNumber === null) {
            changeType = "added";
        } else if (newLineNumber === null) {
            changeType = "removed";
        } else if (oldText !== newText) {
            changeType = "modified";
        }

        return {
            changeType,
            oldLineNumber,
            newLineNumber,
            oldText,
            newText,
        };
    });

    return {
        oldLabel: options.oldLabel ?? "Original",
        newLabel: options.newLabel ?? "Updated",
        rows,
    };
}

export function createDiffModelWithTokens(
    oldSource: string,
    newSource: string,
    language: string,
    options: DiffOptions = {},
): DiffModelWithTokens {
    const model = createDiffModel(oldSource, newSource, options);
    const oldLineTokens = tokenizeSourceByLine(oldSource, language, options);
    const newLineTokens = tokenizeSourceByLine(newSource, language, options);

    return {
        model,
        oldLineTokens,
        newLineTokens,
    };
}

function tokenizeSourceByLine(
    source: string,
    language: string,
    options: DiffOptions,
): Map<number, Token[]> {
    const rawTokens = tokenize(source, language);
    const tokens = options.semanticHighlighting
        ? enhanceTokenSemantics(rawTokens)
        : rawTokens;

    const grouped = groupTokensByLine(tokens);
    const map = new Map<number, Token[]>();

    for (const group of grouped) {
        map.set(group.lineNumber, group.tokens);
    }

    return map;
}

function splitLines(source: string): string[] {
    const normalized = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return normalized.split("\n");
}

function alignLinePairs(oldLines: string[], newLines: string[]): LinePair[] {
    const ops = buildLineOps(oldLines, newLines);
    const rows: LinePair[] = [];

    let index = 0;
    while (index < ops.length) {
        const op = ops[index];

        if (op.kind === "equal") {
            rows.push({
                oldLineNumber: op.oldIndex + 1,
                newLineNumber: op.newIndex + 1,
                oldText: oldLines[op.oldIndex],
                newText: newLines[op.newIndex],
            });
            index++;
            continue;
        }

        const deleted: number[] = [];
        const added: number[] = [];

        while (index < ops.length && ops[index].kind === "delete") {
            deleted.push((ops[index] as { kind: "delete"; oldIndex: number }).oldIndex);
            index++;
        }

        while (index < ops.length && ops[index].kind === "add") {
            added.push((ops[index] as { kind: "add"; newIndex: number }).newIndex);
            index++;
        }

        if (deleted.length === 0 && added.length === 0) {
            continue;
        }

        const width = Math.max(deleted.length, added.length);

        for (let i = 0; i < width; i++) {
            const oldIndex = deleted[i];
            const newIndex = added[i];

            rows.push({
                oldLineNumber: oldIndex === undefined ? null : oldIndex + 1,
                newLineNumber: newIndex === undefined ? null : newIndex + 1,
                oldText: oldIndex === undefined ? "" : oldLines[oldIndex],
                newText: newIndex === undefined ? "" : newLines[newIndex],
            });
        }
    }

    return rows;
}

function buildLineOps(oldLines: string[], newLines: string[]): Op[] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        Array<number>(n + 1).fill(0),
    );

    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            if (oldLines[i] === newLines[j]) {
                dp[i][j] = dp[i + 1][j + 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    const ops: Op[] = [];
    let i = 0;
    let j = 0;

    while (i < m && j < n) {
        if (oldLines[i] === newLines[j]) {
            ops.push({ kind: "equal", oldIndex: i, newIndex: j });
            i++;
            j++;
            continue;
        }

        if (dp[i + 1][j] >= dp[i][j + 1]) {
            ops.push({ kind: "delete", oldIndex: i });
            i++;
        } else {
            ops.push({ kind: "add", newIndex: j });
            j++;
        }
    }

    while (i < m) {
        ops.push({ kind: "delete", oldIndex: i });
        i++;
    }

    while (j < n) {
        ops.push({ kind: "add", newIndex: j });
        j++;
    }

    return ops;
}
