import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type ProxyErrorCode = "INTERNAL_ERROR" | "PROXY_CONFIG_ERROR" | "UPSTREAM_NETWORK_ERROR" | "UPSTREAM_BAD_JSON";

/**
 * Optional rewrite of inbound query params before the upstream call (e.g.
 * translating the v1 `page`/`limit` convention into v2's `currentPage`/`perPage`).
 * Receives the inbound `URLSearchParams` and must return a new one to use.
 */
export type ProxyQueryRewriter = (params: URLSearchParams) => URLSearchParams;

/**
 * Optional transformation of a parsed JSON body before it's returned to the
 * caller (e.g. translating the v2 `pagination.lastPage` shape back into the
 * v1 `pagination.totalPages` shape).
 */
export type ProxyJsonTransformer = (json: unknown) => unknown;

interface ProxyUpstreamOptions {
  request: NextRequest;
  pathSegments: string[];
  baseUrl: string;
  serviceName: string;
  extraHeaders?: HeadersInit;
  rewriteQuery?: ProxyQueryRewriter;
  transformJson?: ProxyJsonTransformer;
}

function errorJson(code: ProxyErrorCode, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    { status }
  );
}

function forwardedRequestHeaders(request: NextRequest, extraHeaders?: HeadersInit): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "accept" || lower === "content-type" || lower === "authorization" || lower.startsWith("x-")) {
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
    if (lower === "content-type" || lower === "content-length" || lower === "cache-control" || lower.startsWith("x-")) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxyUpstream({ request, pathSegments, baseUrl, serviceName, extraHeaders, rewriteQuery, transformJson }: ProxyUpstreamOptions) {
  const path = pathSegments.length > 0 ? pathSegments.join("/") : "";
  const outboundParams = rewriteQuery ? rewriteQuery(request.nextUrl.searchParams) : request.nextUrl.searchParams;
  const search = outboundParams.toString();
  const url = `${baseUrl}${path ? `/${path}` : ""}${search ? `?${search}` : ""}`;
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
      body: body && body.length > 0 ? body : undefined
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${serviceName} proxy network error`, {
      method: request.method,
      url,
      error: message,
      bodyLen: body?.length ?? 0
    });
    return errorJson("UPSTREAM_NETWORK_ERROR", message, 502, { url });
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const rawBody = await res.text().catch(() => "");

  if (!res.ok) {
    console.error(`${serviceName} proxy upstream error`, {
      method: request.method,
      url,
      status: res.status,
      contentType,
      bodySnippet: rawBody.slice(0, 600)
    });
  }

  if (isJson) {
    if (rawBody.length === 0) {
      return NextResponse.json({}, { status: res.status });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch (err) {
      console.error(`${serviceName} proxy JSON parse failed`, {
        url,
        upstreamStatus: res.status,
        error: err instanceof Error ? err.message : String(err),
        bodySnippet: rawBody.slice(0, 300)
      });
      return errorJson("UPSTREAM_BAD_JSON", "Upstream returned malformed JSON", 502, {
        upstreamStatus: res.status,
        bodySnippet: rawBody.slice(0, 300)
      });
    }
    const transformed = transformJson && res.ok ? transformJson(parsed) : parsed;
    return NextResponse.json(transformed, { status: res.status });
  }

  return new NextResponse(rawBody, {
    status: res.status,
    statusText: res.statusText,
    headers: forwardedResponseHeaders(res)
  });
}

interface CreateCatchAllProxyOptions {
  /** Returns the upstream base URL. Called per-request so env errors surface as 502s. */
  getBaseUrl: () => string;
  /** Short label included in log lines (e.g. `'image-generation-v2'`). */
  serviceName: string;
  /** When `true` (default) the route requires a Clerk session. */
  requireAuth?: boolean;
  rewriteQuery?: ProxyQueryRewriter;
  transformJson?: ProxyJsonTransformer;
}

type RouteHandler = (request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) => Promise<Response>;

type CatchAllRouteHandlers = {
  GET: RouteHandler;
  POST: RouteHandler;
  PATCH: RouteHandler;
  PUT: RouteHandler;
  DELETE: RouteHandler;
};

/**
 * Build the five HTTP-method handlers for a Next.js `[[...path]]` proxy route.
 * Exists so each per-route file is a one-liner and the only difference between
 * upstreams is which base URL / transformers / auth they need.
 */
export function createCatchAllProxy(opts: CreateCatchAllProxyOptions): CatchAllRouteHandlers {
  const { getBaseUrl, serviceName, requireAuth = true, rewriteQuery, transformJson } = opts;

  const handle: RouteHandler = async (request, { params }) => {
    if (requireAuth) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: `Sign in is required to access the ${serviceName} API.`
            }
          },
          { status: 401 }
        );
      }
    }

    let baseUrl: string;
    try {
      baseUrl = getBaseUrl();
    } catch (err) {
      console.error(`${serviceName} proxy base-url error`, err);
      // 500 (not 502): the proxy itself is misconfigured; we never even tried
      // to reach upstream. `PROXY_CONFIG_ERROR` distinguishes this from
      // `UPSTREAM_NETWORK_ERROR` in logs and from any consumer trying to react.
      return errorJson("PROXY_CONFIG_ERROR", "Backend BASE_API_HOSTNAME is not configured", 500);
    }

    const { path = [] } = await params;
    return proxyUpstream({
      request,
      pathSegments: path,
      baseUrl,
      serviceName,
      rewriteQuery,
      transformJson
    });
  };

  return { GET: handle, POST: handle, PATCH: handle, PUT: handle, DELETE: handle };
}
