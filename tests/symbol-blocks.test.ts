import { decorateLineTableWithSymbolBlocks } from "../src/html/symbol-blocks.js";

describe("decorateLineTableWithSymbolBlocks", () => {
    const table =
        '<table class="hlts-table"><tbody>' +
        '<tr data-line="1"><td class="hlts-line-number">1</td><td class="hlts-line-content">a</td></tr>' +
        '<tr data-line="2"><td class="hlts-line-number">2</td><td class="hlts-line-content">b</td></tr>' +
        '<tr data-line="3"><td class="hlts-line-number">3</td><td class="hlts-line-content">c</td></tr>' +
        '<tr data-line="4"><td class="hlts-line-number">4</td><td class="hlts-line-content">d</td></tr>' +
        '</tbody></table>';

    it("adds fold member metadata for multi-line symbols using contentRange", () => {
        const html = decorateLineTableWithSymbolBlocks(table, [
            {
                name: "foo",
                contentRange: {
                    start: { line: 2, column: 0, offset: 10 },
                    end: { line: 4, column: 0, offset: 40 },
                },
            },
        ]);

        expect(html).toContain('data-line="2"');
        expect(html).toContain('data-line="3"');
        expect(html).toContain('data-line="4"');
        expect(html).toContain('data-hlts-fold-members="1"');
    });

    it("falls back to startLine/endLine for older symbol shape", () => {
        const html = decorateLineTableWithSymbolBlocks(table, [
            {
                name: "foo",
                startLine: 1,
                endLine: 2,
            },
        ]);

        expect(html).toContain('data-line="1"');
        expect(html).toContain('data-line="2"');
        expect(html).toContain('data-hlts-fold-members="1"');
    });

    it("does not add fold metadata for single-line symbols", () => {
        const html = decorateLineTableWithSymbolBlocks(table, [
            {
                name: "foo",
                contentRange: {
                    start: { line: 2, column: 0, offset: 10 },
                    end: { line: 2, column: 5, offset: 15 },
                },
            },
        ]);

        expect(html).not.toContain("data-hlts-fold-members");
        expect(html).not.toContain("data-hlts-fold-toggle");
    });

    it("adds fold arrows when enabled", () => {
        const html = decorateLineTableWithSymbolBlocks(
            table,
            [
                {
                    name: "foo",
                    contentRange: {
                        start: { line: 2, column: 0, offset: 10 },
                        end: { line: 3, column: 0, offset: 30 },
                    },
                },
            ],
            { showFoldArrows: true },
        );

        expect(html).toContain('data-hlts-fold-toggle="1"');
        expect(html).toContain('hlts-symbol-fold-toggle');
    });
});
