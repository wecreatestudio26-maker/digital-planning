import { QueryClient } from "@tanstack/react-query";
import { createRouter, ErrorComponent as DefaultErrorFallback } from "@tanstack/react-router";
import { useEffect } from "react";
import { routeTree } from "./routeTree.gen";
import { reportLovableError } from "./lib/lovable-error-reporting";

function GlobalDefaultError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportLovableError(error, { boundary: "router_default_error_component" });
    console.error("[RouterDefaultError]", error);
    const t = setTimeout(() => {
      reset();
      if (typeof window !== "undefined") window.location.replace("/");
    }, 4000);
    return () => clearTimeout(t);
  }, [error, reset]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground break-words">
          {error?.message || "Error inesperado."}
        </p>
        <p className="text-xs text-muted-foreground">Redirigiendo al inicio…</p>
      </div>
    </div>
  );
}

function GlobalDefaultNotFound() {
  useEffect(() => {
    const t = setTimeout(() => {
      if (typeof window !== "undefined") window.location.replace("/");
    }, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="text-sm text-muted-foreground">Página no encontrada</p>
        <p className="text-xs text-muted-foreground">Redirigiendo al inicio…</p>
      </div>
    </div>
  );
}

// Keep import so tree-shaking doesn't drop the fallback type
void DefaultErrorFallback;

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: GlobalDefaultError,
    defaultNotFoundComponent: GlobalDefaultNotFound,
  });

  return router;
};

