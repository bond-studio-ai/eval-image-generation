"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * App-wide React Query provider. The `QueryClient` is created lazily in state
 * so each browser session gets a single stable instance (and SSR never shares
 * a client across requests). Defaults disable refetch-on-focus and retry to
 * match the prior hand-rolled `fetch`-in-effect behavior these queries replaced.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
