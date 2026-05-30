import { describe, expect, it } from "vitest";
import { validateHandlebarsTemplate } from "./validate-handlebars";

describe("validateHandlebarsTemplate", () => {
  it("accepts balanced blocks and else branches", () => {
    expect(validateHandlebarsTemplate("{{#if title}}{{title}}{{else}}Untitled{{/if}}")).toEqual([]);
  });

  it("reports unclosed expressions", () => {
    expect(validateHandlebarsTemplate("Hello {{name")).toEqual([{ line: 1, message: 'Unclosed "{{" — missing closing "}}"' }]);
  });

  it("reports orphan close tags", () => {
    expect(validateHandlebarsTemplate("{{/if}}")).toEqual([{ line: 1, message: "Unexpected {{/if}} with no matching {{#if}}" }]);
  });

  it("attributes missing nested closes to the nested block", () => {
    expect(validateHandlebarsTemplate("{{#if a}}\n  {{#each b}}\n{{/if}}")).toEqual([
      {
        line: 2,
        message: "Unclosed {{#each b}} — missing {{/each}} before the {{/if}} on line 3"
      }
    ]);
  });
});
