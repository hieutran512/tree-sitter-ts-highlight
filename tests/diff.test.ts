import { highlightDiff, diffModel } from "../src/index.js";

describe("highlightDiff()", () => {
    const oldSource = "const x = 1;\nconsole.log(x);";
    const newSource = "const x = 2;\nconsole.log(x);\nreturn x;";

    it("renders side-by-side diff view by default", () => {
        const html = highlightDiff(oldSource, newSource, "typescript");

        expect(html).toContain('class="hlts-diff hlts-diff-side-by-side"');
        expect(html).toContain('class="hlts-diff-header"');
        expect(html).toContain("hlts-diff-modified");
        expect(html).toContain("hlts-diff-added");
        expect(html).toContain('<span class="hlts-number">1</span>');
        expect(html).toContain('<span class="hlts-number">2</span>');
    });

    it("renders inline view with +/- markers", () => {
        const html = highlightDiff(oldSource, newSource, "typescript", {
            view: "inline",
        });

        expect(html).toContain('class="hlts-diff hlts-diff-inline"');
        expect(html).toContain('class="hlts-diff-sign">-</td>');
        expect(html).toContain('class="hlts-diff-sign">+</td>');
    });

    it("supports custom labels and hides header", () => {
        const html = highlightDiff(oldSource, newSource, "typescript", {
            oldLabel: "Before",
            newLabel: "After",
            showHeader: false,
        });

        expect(html).not.toContain("Before");
        expect(html).not.toContain("After");
        expect(html).not.toContain('class="hlts-diff-header"');
    });
});

describe("diffModel()", () => {
    it("returns framework-agnostic rows with change metadata", () => {
        const model = diffModel("const a = 1;\n", "const a = 2;\nreturn a;", {
            oldLabel: "Left",
            newLabel: "Right",
        });

        expect(model.oldLabel).toBe("Left");
        expect(model.newLabel).toBe("Right");
        expect(model.rows.length).toBeGreaterThan(0);

        const hasModified = model.rows.some((row) => row.changeType === "modified");
        const hasChanges = model.rows.some((row) => row.changeType !== "context");

        expect(hasModified).toBe(true);
        expect(hasChanges).toBe(true);
    });
});
