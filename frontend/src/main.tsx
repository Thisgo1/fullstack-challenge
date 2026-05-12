import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from 'react-oidc-context';
import { useMemo } from 'react';
import { routeTree } from './routeTree.gen';
import { oidcConfig } from './lib/auth';
import { queryClient } from './router';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const auth = useAuth();

  const router = useMemo(
    () => createRouter({
      routeTree,
      defaultPreload: 'intent',
      scrollRestoration: true,
      context: { queryClient, auth },
    }),
    [auth]
  );

  return <RouterProvider router={router} />;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

const rootElement = document.getElementById('app')!;
if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <AuthProvider {...oidcConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="bottom-right" theme="dark" richColors />
      </QueryClientProvider>
    </AuthProvider>
  );
}
