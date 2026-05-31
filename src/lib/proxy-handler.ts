import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logger } from "./logger";

type ProxyErrorCode = "INTERNAL_ERROR" | "PROXY_CONFIG_ERROR" | "UPSTREAM_NETWORK_ERROR" | "UPSTREAM_BAD_JSON";

const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
/** Max chars of an upstream error body to log (full snippet for error responses). */
const ERROR_BODY_SNIPPET_LEN = 600;
/** Max chars of a malformed-JSON body to log/return in the error detail. */
const JSON_ERROR_SNIPPET_LEN = 300;

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
  rewriteQuery?: ProxyQueryRewriter | undefined;
  transformJson?: ProxyJsonTransformer | undefined;
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

type Attempt<T> = { ok: true; value: T } | { ok: false; error: unknown };

function attempt<T>(fn: () => T): Attempt<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error };
  }
}

async function attemptAsync<T>(fn: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error };
  }
}

async function readRequestBody(request: NextRequest): Promise<string | undefined> {
  // GET/HEAD and some platform requests do not expose a body.
  const result = await attemptAsync(() => request.text());
  return result.ok ? result.value : undefined;
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
    new Headers(extraHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
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
  const pathPart = path ? `/${path}` : "";
  const queryPart = search ? `?${search}` : "";
  const url = `${baseUrl}${pathPart}${queryPart}`;
  const headers = forwardedRequestHeaders(request, extraHeaders);

  const body = await readRequestBody(request);

  const fetchInit: RequestInit = {
    method: request.method,
    headers
  };
  if (body && body.length > 0) fetchInit.body = body;
  const resAttempt = await attemptAsync(() => fetch(url, fetchInit));
  if (!resAttempt.ok) {
    const message = resAttempt.error instanceof Error ? resAttempt.error.message : String(resAttempt.error);
    logger.error(`${serviceName} proxy network error`, {
      method: request.method,
      url,
      error: message,
      bodyLen: body?.length ?? 0
    });
    return errorJson("UPSTREAM_NETWORK_ERROR", message, HTTP_BAD_GATEWAY, { url });
  }
  const { value: res } = resAttempt;

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  let rawBody = "";
  try {
    rawBody = await res.text();
  } catch {
    rawBody = "";
  }

  if (!res.ok) {
    logger.error(`${serviceName} proxy upstream error`, {
      method: request.method,
      url,
      status: res.status,
      contentType,
      bodySnippet: rawBody.slice(0, ERROR_BODY_SNIPPET_LEN)
    });
  }

  if (isJson) {
    if (rawBody.length === 0) {
      return NextResponse.json({}, { status: res.status });
    }
    const parsedAttempt = attempt<unknown>(() => JSON.parse(rawBody) as unknown);
    if (!parsedAttempt.ok) {
      const { error } = parsedAttempt;
      logger.error(`${serviceName} proxy JSON parse failed`, {
        url,
        upstreamStatus: res.status,
        error: error instanceof Error ? error.message : String(error),
        bodySnippet: rawBody.slice(0, JSON_ERROR_SNIPPET_LEN)
      });
      return errorJson("UPSTREAM_BAD_JSON", "Upstream returned malformed JSON", HTTP_BAD_GATEWAY, {
        upstreamStatus: res.status,
        bodySnippet: rawBody.slice(0, JSON_ERROR_SNIPPET_LEN)
      });
    }
    const { value: parsed } = parsedAttempt;
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

interface CatchAllRouteHandlers {
  GET: RouteHandler;
  POST: RouteHandler;
  PATCH: RouteHandler;
  PUT: RouteHandler;
  DELETE: RouteHandler;
}

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

    const baseUrlAttempt = attempt(getBaseUrl);
    if (!baseUrlAttempt.ok) {
      logger.error(`${serviceName} proxy base-url error`, baseUrlAttempt.error);
      // 500 (not 502): the proxy itself is misconfigured; we never even tried
      // to reach upstream. `PROXY_CONFIG_ERROR` distinguishes this from
      // `UPSTREAM_NETWORK_ERROR` in logs and from any consumer trying to react.
      return errorJson("PROXY_CONFIG_ERROR", "Backend BASE_API_HOSTNAME is not configured", HTTP_INTERNAL_SERVER_ERROR);
    }
    const { value: baseUrl } = baseUrlAttempt;

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
