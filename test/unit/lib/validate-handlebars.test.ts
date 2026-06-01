import { describe, expect, it } from "vitest";
import { validateHandlebarsTemplate } from "@/lib/validate-handlebars";

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

  it.each([
    ["whitespace only", "   \n\t  "],
    ["balanced raw block", "{{{{raw}}}}body with {{ braces }}{{{{/raw}}}}"],
    ["long comment", "{{!-- a comment with }} inside --}}"],
    ["short comment", "{{! a short comment }}"],
    ["triple stash", "{{{ unescaped.value }}}"],
    ["partial", "{{> myPartial}}"],
    ["inverse block", "{{^flag}}shown{{/flag}}"],
    ["whitespace control", "{{~#if foo~}}x{{~/if~}}"],
    ["string literal containing }}", '{{concat "}}" foo}}'],
    ["else if inside block", "{{#if a}}A{{else if b}}B{{/if}}"]
  ])("accepts %s", (_label, template) => {
    expect(validateHandlebarsTemplate(template)).toEqual([]);
  });

  it.each([
    ["unclosed raw open", "{{{{raw", 'Unclosed "{{{{" — missing closing "}}}}"'],
    ["unclosed long comment", "{{!-- never ends", 'Unclosed "{{!--" — missing closing "--}}"'],
    ["unclosed short comment", "{{! never ends", 'Unclosed "{{!" — missing closing "}}"'],
    ["unclosed triple stash", "{{{ x }}", 'Unclosed "{{{" — missing closing "}}}"'],
    ["empty expression", "{{}}", 'Empty expression "{{}}"'],
    ["whitespace expression", "{{   }}", 'Empty expression "{{}}"'],
    ["else outside block", "{{else}}", "{{else}} outside of any {{#if}} / {{#each}} / {{#unless}} block"],
    ["orphan raw close", "{{{{/raw}}}}", "Unexpected {{{{/raw}}}} with no matching {{{{raw}}}}"],
    ["block open missing name", "{{#}}", 'Invalid "{{#}}" — missing block name'],
    ["block close missing name", "{{/}}", 'Invalid "{{/}}" — missing block name'],
    ["unclosed block at EOF", "{{#if a}}", "Unclosed {{#if a}} — missing {{/if}}"],
    ["mismatched close", "{{#if a}}{{/each}}", "Mismatched {{/each}} — expected {{/if}} to close block opened on line 1"]
  ])("reports %s", (_label, template, message) => {
    expect(validateHandlebarsTemplate(template)).toEqual([{ line: 1, message }]);
  });

  it("sorts multiple errors by line", () => {
    const errors = validateHandlebarsTemplate("{{/b}}\n{{/c}}");
    expect(errors.map((e) => e.line)).toEqual([1, 2]);
    expect(errors).toHaveLength(2);
  });
});
