import { describe, expect, it } from 'vitest';
import {
  decodePromptTemplate,
  encodePromptTemplate,
  extractReferencedVariables,
  tokenizePromptTemplate,
} from './prompt-template-format';

describe('prompt template envelopes', () => {
  it('decodes canonical JSON envelopes, including deliberately empty fields', () => {
    expect(decodePromptTemplate('{"system":"","user":""}')).toEqual({
      system: '',
      user: '',
      source: 'json',
    });
  });

  it('preserves unrelated JSON as plain text', () => {
    expect(decodePromptTemplate('{"foo":"bar"}')).toEqual({
      system: '',
      user: '{"foo":"bar"}',
      source: 'plain',
    });
  });

  it('decodes legacy divider templates', () => {
    expect(decodePromptTemplate('system\n---\nuser')).toEqual({
      system: 'system',
      user: 'user',
      source: 'legacy-divider',
    });
  });

  it('encodes edited templates as the backend JSON envelope', () => {
    expect(encodePromptTemplate('system', 'user')).toBe('{"system":"system","user":"user"}');
  });
});

describe('prompt template tokenization', () => {
  it('classifies variables, directives, expressions, and text without changing raw text', () => {
    expect(
      tokenizePromptTemplate('Hello {{.Title}}{{if .Color}} {{or .Color .Finish}}{{end}}'),
    ).toEqual([
      { kind: 'text', raw: 'Hello ' },
      { kind: 'variable', raw: '{{.Title}}', name: 'Title' },
      { kind: 'directive', raw: '{{if .Color}}', name: 'if' },
      { kind: 'text', raw: ' ' },
      { kind: 'expression', raw: '{{or .Color .Finish}}' },
      { kind: 'directive', raw: '{{end}}', name: 'end' },
    ]);
  });

  it('extracts top-level field references from expressions and directives', () => {
    expect(extractReferencedVariables('{{if .Color}}{{or .Nested.Value .Finish}}{{end}}')).toEqual([
      'Color',
      'Finish',
      'Nested',
    ]);
  });
});
