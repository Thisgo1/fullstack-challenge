import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { type AuthContextProps } from 'react-oidc-context';
import '../styles.css';

interface RouterContext {
  queryClient: QueryClient;
  auth: AuthContextProps;    
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <TanStackDevtools
        config={{ position: 'bottom-right' }}
        plugins={[{ name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> }]}
      />
    </>
  );
}
