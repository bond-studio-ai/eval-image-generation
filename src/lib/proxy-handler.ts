import { NextRequest, NextResponse } from 'next/server';

type ProxyErrorCode = 'INTERNAL_ERROR' | 'UPSTREAM_NETWORK_ERROR' | 'UPSTREAM_BAD_JSON';

interface ProxyUpstreamOptions {
  request: NextRequest;
  pathSegments: string[];
  baseUrl: string;
  serviceName: string;
  extraHeaders?: HeadersInit;
}

function errorJson(
  code: ProxyErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

function forwardedRequestHeaders(request: NextRequest, extraHeaders?: HeadersInit): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'accept' ||
      lower === 'content-type' ||
      lower === 'authorization' ||
      lower.startsWith('x-')
    ) {
      headers.set(key, value);
    }
  });

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  }

  return headers;
}

function forwardedResponseHeaders(response: Response): Headers {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'content-type' ||
      lower === 'content-length' ||
      lower === 'cache-control' ||
      lower.startsWith('x-')
    ) {
      headers.set(key, value);
    }
  });
  return headers;
}

export async function proxyUpstream({
  request,
  pathSegments,
  baseUrl,
  serviceName,
  extraHeaders,
}: ProxyUpstreamOptions) {
  const path = pathSegments.length > 0 ? pathSegments.join('/') : '';
  const search = request.nextUrl.searchParams.toString();
  const url = `${baseUrl}${path ? `/${path}` : ''}${search ? `?${search}` : ''}`;
  const headers = forwardedRequestHeaders(request, extraHeaders);

  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    // GET/HEAD and some platform requests do not expose a body.
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: request.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${serviceName} proxy network error`, {
      method: request.method,
      url,
      error: message,
      bodyLen: body?.length ?? 0,
    });
    return errorJson('UPSTREAM_NETWORK_ERROR', message, 502, { url });
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const rawBody = await res.text().catch(() => '');

  if (!res.ok) {
    console.error(`${serviceName} proxy upstream error`, {
      method: request.method,
      url,
      status: res.status,
      contentType,
      bodySnippet: rawBody.slice(0, 600),
    });
  }

  if (isJson) {
    if (rawBody.length === 0) {
      return NextResponse.json({}, { status: res.status });
    }
    try {
      return NextResponse.json(JSON.parse(rawBody), { status: res.status });
    } catch (err) {
      console.error(`${serviceName} proxy JSON parse failed`, {
        url,
        upstreamStatus: res.status,
        error: err instanceof Error ? err.message : String(err),
        bodySnippet: rawBody.slice(0, 300),
      });
      return errorJson('UPSTREAM_BAD_JSON', 'Upstream returned malformed JSON', 502, {
        upstreamStatus: res.status,
        bodySnippet: rawBody.slice(0, 300),
      });
    }
  }

  return new NextResponse(rawBody, {
    status: res.status,
    statusText: res.statusText,
    headers: forwardedResponseHeaders(res),
  });
}
