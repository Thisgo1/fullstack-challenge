import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from 'react-oidc-context';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-2">Crash Game</h1>
        <p className="text-zinc-400">Aposte e saque antes do crash</p>
      </div>

      <button
        onClick={() => auth.signinRedirect()}
        className="bg-green-600 hover:bg-green-500 text-white font-bold
                   px-8 py-3 rounded-xl text-lg transition-colors"
      >
        Entrar com Keycloak
      </button>
    </div>
  );
}
