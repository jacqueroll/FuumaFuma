// Primeira etapa do login do painel: manda quem está tentando entrar
// para a tela do GitHub que pergunta "autorizar este app?".

exports.handler = async (event) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const siteUrl = process.env.URL || `https://${event.headers.host}`;

  if (!clientId) {
    return {
      statusCode: 500,
      body: 'Faltou configurar GITHUB_OAUTH_CLIENT_ID nas variáveis de ambiente do Netlify.',
    };
  }

  const redirectUri = `${siteUrl}/api/callback`;
  const authorizeUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent('repo,user')}`;

  return {
    statusCode: 302,
    headers: { Location: authorizeUrl },
  };
};
