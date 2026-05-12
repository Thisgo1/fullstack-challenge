import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // POR QUE PASSAR O QUERYCLIENT PELO CONTEXTO DO ROUTER?
    // O TanStack Router tem suporte nativo a contexto tipado.
    // Isso permite usar o queryClient em loaders de rota —
    // você pode pré-buscar dados antes da rota renderizar.
    context: { queryClient },
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
