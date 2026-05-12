import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';

export const Route = createFileRoute('/callback')({
  component: CallbackPage,
});

function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // O AuthProvider processa o ?code= automaticamente.
    // Quando não está mais carregando e está autenticado, redireciona.
    if (!auth.isLoading && auth.isAuthenticated) {
      navigate({ to: '/' });
    }

    // Se não está carregando e não está autenticado, algo deu errado
    if (!auth.isLoading && !auth.isAuthenticated && !auth.error) {
      navigate({ to: '/login' });
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.error]);

  if (auth.error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">Erro no login: {auth.error.message}</p>
        <button
          onClick={() => navigate({ to: '/login' })}
          className="text-zinc-400 hover:text-white underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-400">Autenticando...</p>
    </div>
  );
}
