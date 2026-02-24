import type { Range } from "tree-sitter-ts";

type SymbolRange = Pick<Range, "start" | "end">;

export interface SymbolLike {
    name?: string;
    contentRange?: SymbolRange;
    nameRange?: SymbolRange;
    startLine?: number;
    endLine?: number;
}

export interface SymbolBlockOptions {
    showFoldArrows?: boolean;
    classPrefix?: string;
}

interface SymbolBlock {
    id: string;
    startLine: number;
    endLine: number;
}

const LINE_ROW_RE = /<tr([^>]*)\bdata-line="(\d+)"([^>]*)>([\s\S]*?)<\/tr>/g;
const LINE_NUMBER_CELL_RE = /<td class="([^"]*\bhlts-line-number\b[^"]*)">([\s\S]*?)<\/td>/;

export function decorateLineTableWithSymbolBlocks(
    lineTableHtml: string,
    symbols: SymbolLike[],
    options: SymbolBlockOptions = {},
): string {
    const showFoldArrows = options.showFoldArrows ?? false;
    const classPrefix = options.classPrefix ?? "hlts-";
    const blocks = normalizeSymbolBlocks(symbols);

    if (blocks.length === 0) {
        return lineTableHtml;
    }

    const matches = Array.from(lineTableHtml.matchAll(LINE_ROW_RE));
    if (matches.length === 0) {
        return lineTableHtml;
    }

    let result = "";
    let cursor = 0;

    for (const match of matches) {
        const index = match.index ?? 0;
        const rowHtml = match[0];
        const lineNumber = Number(match[2]);
        const rowInner = match[4];

        const activeBlocks = blocks.filter(
            (block) => lineNumber >= block.startLine && lineNumber <= block.endLine,
        );
        const collapsibleActiveBlocks = activeBlocks.filter(
            (block) => block.endLine > block.startLine,
        );
        const startingBlocks = collapsibleActiveBlocks.filter(
            (block) => lineNumber === block.startLine,
        );
        const foldMemberIds = collapsibleActiveBlocks
            .filter((block) => lineNumber > block.startLine)
            .map((block) => block.id);

        let rowAttrs = `${match[1]} data-line="${lineNumber}"${match[3]}`;

        if (foldMemberIds.length > 0) {
            rowAttrs += ` data-hlts-fold-members="${foldMemberIds.join(",")}"`;
        }

        let nextInner = rowInner;

        if (showFoldArrows && startingBlocks.length > 0) {
            const foldIds = startingBlocks.map((block) => block.id).join(",");
            nextInner = nextInner.replace(
                LINE_NUMBER_CELL_RE,
                (_full, cls: string, content: string) =>
                    `<td class="${cls}" style="position:relative;"><span class="${classPrefix}line-number-text" style="display:inline-block;width:100%;padding-right:6px;box-sizing:border-box;">${content}</span><button type="button" class="${classPrefix}symbol-fold-toggle" data-hlts-fold-toggle="${foldIds}" aria-expanded="true" style="position:absolute;right:3px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:inherit;opacity:.75;cursor:pointer;padding:0;line-height:1;">▾</button></td>`,
            );
        }

        const nextRow = `<tr${rowAttrs}>${nextInner}</tr>`;

        result += lineTableHtml.slice(cursor, index);
        result += rowHtml === nextRow ? rowHtml : nextRow;
        cursor = index + rowHtml.length;
    }

    result += lineTableHtml.slice(cursor);
    return result;
}

function normalizeSymbolBlocks(symbols: SymbolLike[]): SymbolBlock[] {
    return symbols
        .map((symbol, index): SymbolBlock | null => {
            const contentRange = symbol.contentRange;
            const startLine =
                contentRange?.start?.line ??
                symbol.startLine;
            const endLine =
                contentRange?.end?.line ??
                symbol.endLine ??
                startLine;

            if (
                typeof startLine !== "number" ||
                typeof endLine !== "number" ||
                !Number.isFinite(startLine) ||
                !Number.isFinite(endLine)
            ) {
                return null;
            }

            return {
                id: String(index + 1),
                startLine: Math.floor(startLine),
                endLine: Math.max(Math.floor(startLine), Math.floor(endLine)),
            };
        })
        .filter((value): value is SymbolBlock => value !== null)
        .sort((a, b) => a.startLine - b.startLine || b.endLine - a.endLine);
}
