import { WebStorageStateStore } from 'oidc-client-ts';

export const oidcConfig = {
  authority: 'http://localhost:8080/realms/crash-game',
  client_id: 'crash-game-client',
  redirect_uri: 'http://localhost:3000/callback',
  post_logout_redirect_uri: 'http://localhost:3000',
  scope: 'openid profile email',
  response_type: 'code',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,

  // POR QUE onSigninCallback?
  // Após processar o ?code=, limpa os parâmetros da URL.
  // Sem isso a URL fica como /callback?code=xxx&state=yyy
  // o que é feio e pode causar problemas se o usuário recarregar a página.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, '/callback');
  },
};
