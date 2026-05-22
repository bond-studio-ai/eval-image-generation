import { describe, expect, it } from 'vitest';
import { extractUpstreamError } from './proxy-error';

function response(body: string, status = 500, statusText = 'Server Error') {
  return new Response(body, { status, statusText });
}

describe('extractUpstreamError', () => {
  it('prefers proxy error envelopes', async () => {
    await expect(
      extractUpstreamError(
        response(
          JSON.stringify({ error: { code: 'UPSTREAM_NETWORK_ERROR', message: 'DNS failed' } }),
          502,
        ),
      ),
    ).resolves.toBe('502: DNS failed');
  });

  it('joins huma validation messages', async () => {
    await expect(
      extractUpstreamError(
        response(
          JSON.stringify({
            title: 'Bad Request',
            status: 400,
            errors: [{ message: 'scope is required' }, { message: 'verdict is invalid' }],
          }),
          400,
        ),
      ),
    ).resolves.toBe('400: scope is required; verdict is invalid');
  });

  it('falls back to title and detail', async () => {
    await expect(
      extractUpstreamError(
        response(JSON.stringify({ title: 'Internal Server Error', detail: 'submit review' })),
      ),
    ).resolves.toBe('500: Internal Server Error: submit review');
  });

  it('truncates raw non-json responses', async () => {
    const body = 'x'.repeat(350);
    await expect(extractUpstreamError(response(body))).resolves.toBe(`500: ${'x'.repeat(300)}`);
  });
});
