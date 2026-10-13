// Devolve os comentários de uma publicação.
//
// Os comentários chegam pelo formulário "comentarios" (Netlify Forms) que
// fica no post.html. Esta função lê as mensagens recebidas pela API do
// Netlify e filtra pela publicação pedida (?post=slug-da-publicacao).
//
// Precisa de uma variável de ambiente no Netlify:
//   NETLIFY_API_TOKEN  -> token pessoal criado em
//                         User settings > Applications > Personal access tokens
//
// Para moderar: apagar a mensagem em Netlify > Forms > comentarios faz o
// comentário sumir do site. Mensagens marcadas como spam não aparecem.

const API = 'https://api.netlify.com/api/v1';
const FORM_NAME = 'comentarios';

function reply(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=20',
    },
    body: JSON.stringify(data),
  };
}

async function api(path, token) {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Netlify API ${res.status} em ${path}`);
  return res.json();
}

exports.handler = async (event) => {
  const slug = ((event.queryStringParameters || {}).post || '').trim();
  if (!slug) return reply(400, { comments: [], error: 'faltou o parâmetro post' });

  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    return reply(200, { comments: [], error: 'Faltou configurar NETLIFY_API_TOKEN nas variáveis de ambiente do Netlify.' });
  }

  // o ID do site vem do próprio Netlify; o domínio serve de alternativa
  const siteId = process.env.SITE_ID || (event.headers && event.headers.host);

  try {
    const forms = await api(`/sites/${encodeURIComponent(siteId)}/forms`, token);
    const form = forms.find(f => f.name === FORM_NAME);
    if (!form) return reply(200, { comments: [] });

    const submissions = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await api(`/forms/${form.id}/submissions?per_page=100&page=${page}`, token);
      submissions.push(...batch);
      if (batch.length < 100) break;
    }

    const comments = submissions
      .filter(s => s.data && s.data.post === slug)
      .map(s => ({
        nome: String(s.data.nome || 'Anônimo').slice(0, 60),
        comentario: String(s.data.comentario || '').slice(0, 2000),
        data: s.created_at,
      }))
      .filter(c => c.comentario.trim())
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    return reply(200, { comments });
  } catch (e) {
    console.error(e);
    return reply(502, { comments: [], error: 'não foi possível ler os comentários' });
  }
};
