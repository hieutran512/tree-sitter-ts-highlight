import { renderTokensToHtml } from "./renderer.js";
import { escapeHtml } from "./escaper.js";
import type { DiffModelWithTokens } from "../diff/model.js";
import type { DiffOptions } from "../types.js";

export function renderDiffToHtml(
    diff: DiffModelWithTokens,
    options: DiffOptions = {},
): string {
    const view = options.view ?? "side-by-side";
    const prefix = options.classPrefix ?? "hlts-";

    if (view === "inline") {
        return renderInlineDiff(diff, options, prefix);
    }

    return renderSideBySideDiff(diff, options, prefix);
}

function renderSideBySideDiff(
    diff: DiffModelWithTokens,
    options: DiffOptions,
    prefix: string,
): string {
    const { model } = diff;
    const showHeader = options.showHeader ?? true;

    const rows: string[] = [];

    if (showHeader) {
        rows.push(
            `<tr class="${prefix}diff-header">` +
            `<th class="${prefix}diff-label" colspan="2">${escapeHtml(model.oldLabel)}</th>` +
            `<th class="${prefix}diff-label" colspan="2">${escapeHtml(model.newLabel)}</th>` +
            `</tr>`,
        );
    }

    for (const row of model.rows) {
        const className = `${prefix}diff-row ${prefix}diff-${row.changeType}`;
        const oldContent = renderLineContent(
            row.oldLineNumber,
            diff.oldLineTokens,
            options,
            row.oldText,
        );
        const newContent = renderLineContent(
            row.newLineNumber,
            diff.newLineTokens,
            options,
            row.newText,
        );

        rows.push(
            `<tr class="${className}">` +
            `<td class="${prefix}diff-gutter">${formatLineNumber(row.oldLineNumber)}</td>` +
            `<td class="${prefix}diff-content">${oldContent}</td>` +
            `<td class="${prefix}diff-gutter">${formatLineNumber(row.newLineNumber)}</td>` +
            `<td class="${prefix}diff-content">${newContent}</td>` +
            `</tr>`,
        );
    }

    return `<table class="${prefix}diff ${prefix}diff-side-by-side"><tbody>${rows.join("")}</tbody></table>`;
}

function renderInlineDiff(
    diff: DiffModelWithTokens,
    options: DiffOptions,
    prefix: string,
): string {
    const rows: string[] = [];

    for (const row of diff.model.rows) {
        if (row.changeType === "context") {
            rows.push(
                `<tr class="${prefix}diff-row ${prefix}diff-context">` +
                `<td class="${prefix}diff-gutter">${formatLineNumber(row.newLineNumber)}</td>` +
                `<td class="${prefix}diff-sign"> </td>` +
                `<td class="${prefix}diff-content">${renderLineContent(
                    row.newLineNumber,
                    diff.newLineTokens,
                    options,
                    row.newText,
                )}</td>` +
                `</tr>`,
            );
            continue;
        }

        if (row.oldLineNumber !== null) {
            rows.push(
                `<tr class="${prefix}diff-row ${prefix}diff-removed">` +
                `<td class="${prefix}diff-gutter">${formatLineNumber(row.oldLineNumber)}</td>` +
                `<td class="${prefix}diff-sign">-</td>` +
                `<td class="${prefix}diff-content">${renderLineContent(
                    row.oldLineNumber,
                    diff.oldLineTokens,
                    options,
                    row.oldText,
                )}</td>` +
                `</tr>`,
            );
        }

        if (row.newLineNumber !== null) {
            rows.push(
                `<tr class="${prefix}diff-row ${prefix}diff-added">` +
                `<td class="${prefix}diff-gutter">${formatLineNumber(row.newLineNumber)}</td>` +
                `<td class="${prefix}diff-sign">+</td>` +
                `<td class="${prefix}diff-content">${renderLineContent(
                    row.newLineNumber,
                    diff.newLineTokens,
                    options,
                    row.newText,
                )}</td>` +
                `</tr>`,
            );
        }
    }

    return `<table class="${prefix}diff ${prefix}diff-inline"><tbody>${rows.join("")}</tbody></table>`;
}

function renderLineContent(
    lineNumber: number | null,
    tokenMap: Map<number, import("tree-sitter-ts").Token[]>,
    options: DiffOptions,
    fallbackText: string,
): string {
    if (lineNumber === null) return "";

    const tokens = tokenMap.get(lineNumber);
    if (!tokens || tokens.length === 0) {
        return escapeHtml(fallbackText);
    }

    return renderTokensToHtml(tokens, {
        classPrefix: options.classPrefix,
        theme: options.theme,
        decorations: options.decorations,
    });
}

function formatLineNumber(lineNumber: number | null): string {
    return lineNumber === null ? "" : String(lineNumber);
}
