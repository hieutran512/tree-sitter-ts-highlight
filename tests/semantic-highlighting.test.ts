import { tokenize } from "tree-sitter-ts";
import { enhanceSemantics, highlight } from "../src/index.js";

describe("semantic highlighting", () => {
    it("keeps default behavior when semanticHighlighting is disabled", () => {
        const html = highlight("const answer = Math.max(1, value);", "typescript");
        expect(html).toContain('<span class="hlts-identifier">answer</span>');
        expect(html).toContain('<span class="hlts-identifier">max</span>');
    });

    it("reclassifies overloaded identifiers when semanticHighlighting is enabled", () => {
        const html = highlight(
            "const answer = Math.max(1, value); return this.host;",
            "typescript",
            { semanticHighlighting: true },
        );

        expect(html).toContain('<span class="hlts-variable">answer</span>');
        expect(html).toContain('<span class="hlts-type">Math</span>');
        expect(html).toContain('<span class="hlts-attribute">max</span>');
        expect(html).toContain('<span class="hlts-attribute">host</span>');
    });

    it("supports explicit token enhancement API", () => {
        const tokens = tokenize("const name = user.profile;", "typescript");
        const enhanced = enhanceSemantics(tokens);

        const nameToken = enhanced.find((token) => token.value === "name");
        const profileToken = enhanced.find((token) => token.value === "profile");

        expect(nameToken?.category).toBe("variable");
        expect(profileToken?.category).toBe("attribute");
    });
});
