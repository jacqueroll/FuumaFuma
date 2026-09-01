// Segunda etapa do login: o GitHub manda a pessoa de volta para cá com um
// "code" temporário. Trocamos esse code por um token de acesso de verdade
// e entregamos esse token para a janela do painel (Decap CMS), que ficou
// esperando essa mensagem.

exports.handler = async (event) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const code = event.queryStringParameters && event.queryStringParameters.code;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      body: 'Faltou configurar GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET nas variáveis de ambiente do Netlify.',
    };
  }

  if (!code) {
    return { statusCode: 400, body: 'Faltou o parâmetro "code" enviado pelo GitHub.' };
  }

  let token;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenJson = await tokenRes.json();
    if (tokenJson.error) {
      return { statusCode: 400, body: `Erro do GitHub: ${tokenJson.error_description || tokenJson.error}` };
    }
    token = tokenJson.access_token;
  } catch (err) {
    return { statusCode: 500, body: 'Não foi possível trocar o code pelo token: ' + err.message };
  }

  // Página que entrega o token para a aba/janela do painel (protocolo que
  // o Decap CMS espera de um provedor de OAuth do tipo "github").
  const html = `<!doctype html>
<html><body>
<script>
  (function () {
    function receiveMessage(e) {
      window.opener.postMessage(
        'authorization:github:success:' + JSON.stringify({ token: ${JSON.stringify(token)}, provider: 'github' }),
        e.origin
      );
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
Pode fechar esta janela.
</body></html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html,
  };
};
