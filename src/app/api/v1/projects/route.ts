import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { platformApiBase } from "@/lib/env";
import { normalizeV2PaginationResponse, rewriteV1PaginationToV2 } from "@/lib/v2-pagination";

const PROJECTS_BASE = `${platformApiBase()}/v2/projects`;

const FORWARDED_SCALAR_KEYS = ["status", "crmStatus", "contractorId", "before", "after", "currentPage", "perPage", "page", "limit", "includeSummary"] as const;

const FORWARDED_ARRAY_KEYS = ["format[]", "include[]"] as const;

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "Sign in is required to access the projects API.");
  }

  try {
    const incoming = new URL(request.url).searchParams;

    // Funnel anything we recognize into a clean URLSearchParams, then map page/limit
    // to the upstream v2 convention so callers can use the v1 shape consistently.
    const allowed = new URLSearchParams();
    for (const key of FORWARDED_SCALAR_KEYS) {
      const value = incoming.get(key);
      if (value) allowed.set(key, value);
    }
    for (const key of FORWARDED_ARRAY_KEYS) {
      for (const value of incoming.getAll(key)) {
        allowed.append(key, value);
      }
    }
    const upstreamParams = rewriteV1PaginationToV2(allowed);
    const qs = upstreamParams.toString();
    const upstreamUrl = `${PROJECTS_BASE}${qs ? `?${qs}` : ""}`;

    const res = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!res.ok) {
      return errorResponse("INTERNAL_ERROR", `Projects API returned ${res.status}`);
    }

    const json: unknown = await res.json();
    return NextResponse.json(normalizeV2PaginationResponse(json), { status: 200 });
  } catch (error) {
    console.error("[projects list] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch projects");
  }
}
