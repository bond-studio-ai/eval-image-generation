import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, type RenderHookOptions, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/** Fresh client per call so tests stay isolated; no retries/cache so async settles fast. */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 }
    }
  });
}

function QueryWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Render a component tree inside a fresh React Query provider. */
export function renderWithQuery(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const client = makeQueryClient();
  return {
    client,
    ...render(ui, { wrapper: ({ children }) => <QueryWrapper client={client}>{children}</QueryWrapper>, ...options })
  };
}

/** Render a hook inside a fresh React Query provider. */
export function renderHookWithQuery<Result, Props>(callback: (props: Props) => Result, options?: Omit<RenderHookOptions<Props>, "wrapper">) {
  const client = makeQueryClient();
  return {
    client,
    ...renderHook(callback, { wrapper: ({ children }) => <QueryWrapper client={client}>{children}</QueryWrapper>, ...options })
  };
}
