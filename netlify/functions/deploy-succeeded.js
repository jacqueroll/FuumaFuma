// Envio automático da newsletter.
//
// O Netlify roda esta função sozinho ao final de cada deploy publicado
// (o nome do arquivo, deploy-succeeded, é o que faz isso acontecer).
//
// O que ela faz:
//  1. Lê data/posts.json do site publicado.
//  2. Compara com a lista de publicações já anunciadas (guardada no
//     Netlify Blobs, o armazenamento do próprio Netlify).
//  3. Para cada publicação nova, manda um e-mail pelo Gmail para quem se
//     inscreveu no formulário "newsletter" e não pediu para sair no
//     formulário "cancelamentos".
//
// Na primeira vez que roda, ela só registra as publicações que já existem,
// sem mandar nada, para ninguém receber aviso de post antigo.
//
// Variáveis de ambiente necessárias no Netlify:
//   NETLIFY_API_TOKEN   -> o mesmo token usado nos comentários
//   GMAIL_USER          -> o Gmail que envia os avisos
//   GMAIL_APP_PASSWORD  -> senha de app de 16 letras gerada nesse Gmail

const nodemailer = require('nodemailer');
const { getStore, connectLambda } = require('@netlify/blobs');

const API = 'https://api.netlify.com/api/v1';
const SENT_KEY = 'publicacoes-anunciadas';
const BCC_CHUNK = 80; // o Gmail aceita até 500 destinatários por dia

async function netlifyApi(path, token) {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Netlify API ${res.status} em ${path}`);
  return res.json();
}

async function formSubmissions(siteId, formName, token) {
  const forms = await netlifyApi(`/sites/${encodeURIComponent(siteId)}/forms`, token);
  const form = forms.find(f => f.name === formName);
  if (!form) return [];
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await netlifyApi(`/forms/${form.id}/submissions?per_page=100&page=${page}`, token);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

// junta inscrições e cancelamentos; vale o pedido mais recente de cada e-mail
function activeSubscribers(subs, cancels) {
  const latest = new Map();
  const add = (list, action) => list.forEach(s => {
    const email = String((s.data && s.data.email) || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const when = new Date(s.created_at).getTime() || 0;
    const prev = latest.get(email);
    if (!prev || when >= prev.when) latest.set(email, { action, when });
  });
  add(subs, 'entrar');
  add(cancels, 'sair');
  return [...latest].filter(([, v]) => v.action === 'entrar').map(([email]) => email);
}

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function absoluteUrl(siteUrl, url) {
  if (!url) return '';
  if (/^https?:/i.test(url)) return url;
  return siteUrl + '/' + url.replace(/^\.?\//, '');
}

function buildEmail(siteUrl, post) {
  const link = `${siteUrl}/post.html?slug=${encodeURIComponent(post.slug)}`;
  const leave = `${siteUrl}/newsletter.html#cancelar`;
  const cover = post.cover
    ? `<p style="margin:0 0 20px;"><img src="${escapeHtml(absoluteUrl(siteUrl, post.cover))}" alt="" style="max-width:100%;border-radius:3px;"></p>`
    : '';
  const excerpt = post.excerpt ? `<p style="margin:0 0 20px;font-size:17px;line-height:1.6;">${escapeHtml(post.excerpt)}</p>` : '';

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f3efe4;">
  <div style="max-width:560px;margin:0 auto;padding:28px 22px;font-family:Georgia,serif;color:#2c1c10;">
    <p style="margin:0 0 18px;font-size:22px;font-style:italic;font-weight:bold;">Fuuma<span style="color:#8a2f2f;font-style:normal;">Fuma</span></p>
    <p style="margin:0 0 6px;font-size:13px;color:#6b4b2c;">Publicação nova no cantinho</p>
    <h1 style="margin:0 0 18px;font-size:26px;font-style:italic;line-height:1.25;">${escapeHtml(post.title)}</h1>
    ${cover}
    ${excerpt}
    <p style="margin:0 0 28px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#3f2a17;color:#fbf8f0;text-decoration:none;padding:11px 18px;border-radius:3px;font-size:15px;">Ler a publicação</a></p>
    <p style="margin:0;font-size:12px;color:#a2825a;border-top:1px solid #d8cba3;padding-top:14px;">
      Você recebeu este e-mail porque se inscreveu na newsletter do FuumaFuma.
      <a href="${escapeHtml(leave)}" style="color:#6b4b2c;">Cancelar inscrição</a>
    </p>
  </div>
</body></html>`;

  const text = [
    'Publicação nova no FuumaFuma',
    '',
    post.title,
    post.excerpt || '',
    '',
    `Ler: ${link}`,
    '',
    `Para cancelar a inscrição: ${leave}`,
  ].join('\n');

  return { subject: `Nova publicação no FuumaFuma: ${post.title}`, html, text };
}

exports.handler = async (event) => {
  // só age no site publicado, nunca em pré-visualizações de deploy
  try {
    const payload = JSON.parse(event.body || '{}').payload || {};
    if (payload.context && payload.context !== 'production') {
      return { statusCode: 200, body: 'deploy fora da produção, nada a fazer' };
    }
  } catch (e) { /* segue */ }

  const { NETLIFY_API_TOKEN: token, GMAIL_USER: gmailUser, GMAIL_APP_PASSWORD: gmailPass } = process.env;
  if (!token || !gmailUser || !gmailPass) {
    console.log('Newsletter: faltam variáveis de ambiente (NETLIFY_API_TOKEN, GMAIL_USER, GMAIL_APP_PASSWORD).');
    return { statusCode: 200, body: 'newsletter não configurada' };
  }

  const siteUrl = (process.env.URL || 'https://fuumafuma.netlify.app').replace(/\/+$/, '');
  const siteId = process.env.SITE_ID || new URL(siteUrl).host;

  connectLambda(event);
  const store = getStore('newsletter');

  const res = await fetch(`${siteUrl}/data/posts.json?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`não consegui ler data/posts.json (${res.status})`);
  const posts = await res.json();

  const sent = await store.get(SENT_KEY, { type: 'json' });
  if (!Array.isArray(sent)) {
    await store.setJSON(SENT_KEY, posts.map(p => p.slug));
    console.log(`Newsletter: primeira execução, ${posts.length} publicação(ões) marcadas como já anunciadas.`);
    return { statusCode: 200, body: 'lista inicial registrada' };
  }

  const fresh = posts
    .filter(p => !sent.includes(p.slug))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!fresh.length) {
    console.log('Newsletter: nenhuma publicação nova.');
    return { statusCode: 200, body: 'nada novo' };
  }

  const [subs, cancels] = await Promise.all([
    formSubmissions(siteId, 'newsletter', token),
    formSubmissions(siteId, 'cancelamentos', token),
  ]);
  const recipients = activeSubscribers(subs, cancels);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass.replace(/\s+/g, '') },
  });

  for (const post of fresh) {
    if (recipients.length) {
      const mail = buildEmail(siteUrl, post);
      for (let i = 0; i < recipients.length; i += BCC_CHUNK) {
        await transporter.sendMail({
          from: { name: 'FuumaFuma', address: gmailUser },
          to: gmailUser,
          bcc: recipients.slice(i, i + BCC_CHUNK),
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
      }
    }
    sent.push(post.slug);
    await store.setJSON(SENT_KEY, sent);
    console.log(`Newsletter: "${post.title}" enviada para ${recipients.length} pessoa(s).`);
  }

  return { statusCode: 200, body: 'ok' };
};
