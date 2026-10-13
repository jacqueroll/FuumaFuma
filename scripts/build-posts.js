/**
 * Roda automaticamente a cada deploy no Netlify (veja netlify.toml).
 *
 * O que faz:
 *  1. Lê cada arquivo em data/posts/*.json (um por publicação, escritos
 *     pelo painel em /admin).
 *  2. Converte o texto (markdown) de cada um em HTML.
 *  3. Junta tudo, ordenado da mais nova para a mais antiga, em
 *     data/posts.json — o arquivo que o site (index/historias/post.html)
 *     de fato lê no navegador.
 *  4. Atualiza data/config.json com a data da publicação mais recente,
 *     para o "Diário de escrita" da Home recalcular sozinho.
 *  5. Gera o feed.xml (RSS) na raiz do site, usado para o envio automático
 *     da newsletter a cada publicação nova.
 *
 * Ninguém precisa editar data/posts.json ou data/config.json à mão —
 * este script cuida disso a cada commit.
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'data', 'posts');
const POSTS_OUT = path.join(ROOT, 'data', 'posts.json');
const CONFIG_PATH = path.join(ROOT, 'data', 'config.json');
const FEED_OUT = path.join(ROOT, 'feed.xml');

// endereço público do site; o Netlify preenche URL sozinho durante o deploy
const SITE_URL = (process.env.URL || 'https://fuumafuma.netlify.app').replace(/\/+$/, '');
const SITE_TITLE = 'FuumaFuma';
const SITE_DESCRIPTION = 'FuumaFuma: cantinho de criatividade, fics e devaneios inspirados por X/1999 e o universo CLAMP.';

marked.setOptions({ breaks: true });

function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function slugFromFilename(filename) {
  return filename.replace(/\.json$/i, '');
}

function buildPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log('Nenhuma pasta data/posts/ encontrada — nada para compilar.');
    fs.writeFileSync(POSTS_OUT, '[]\n');
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
  const posts = [];

  for (const file of files) {
    const raw = readJsonSafe(path.join(POSTS_DIR, file), null);
    if (!raw || !raw.title || !raw.date) {
      console.warn(`Ignorando ${file}: faltam campos obrigatórios (title/date).`);
      continue;
    }
    posts.push({
      slug: slugFromFilename(file),
      title: raw.title,
      date: raw.date,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      cover: raw.cover || '',
      excerpt: raw.excerpt || '',
      contentHtml: marked.parse(raw.body || '').trim(),
    });
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  fs.writeFileSync(POSTS_OUT, JSON.stringify(posts, null, 2) + '\n');
  console.log(`data/posts.json gerado com ${posts.length} publicação(ões).`);
  return posts;
}

function updateConfig(posts) {
  const current = readJsonSafe(CONFIG_PATH, { metaEscrita: 'quinzenal', ultimaPublicacao: null });
  const latest = posts.length ? posts[0].date : null;
  const next = {
    metaEscrita: current.metaEscrita === 'mensal' ? 'mensal' : 'quinzenal',
    ultimaPublicacao: latest,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + '\n');
  console.log(`data/config.json atualizado (última publicação: ${latest || 'nenhuma ainda'}).`);
}

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(url) {
  if (!url) return '';
  if (/^(https?:|mailto:|#|data:)/i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return SITE_URL + '/' + url.replace(/^\.?\//, '');
}

// imagens e links com caminho relativo viram endereço completo,
// para funcionarem dentro do e-mail e nos leitores de RSS
function absolutizeHtml(html) {
  return html.replace(/(\s(?:src|href))="([^"]*)"/g, (m, attr, url) => `${attr}="${escapeXml(absoluteUrl(url.replace(/&amp;/g, '&')))}"`);
}

function cdata(text) {
  return '<![CDATA[' + String(text || '').replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
}

function rfc822(isoDate) {
  // publicações têm só a data; usamos 12h de Brasília para não "voltar" um dia
  return new Date(isoDate + 'T12:00:00-03:00').toUTCString();
}

function buildFeed(posts) {
  const items = posts.slice(0, 20).map(post => {
    const link = `${SITE_URL}/post.html?slug=${encodeURIComponent(post.slug)}`;
    const cover = post.cover ? `<p><img src="${escapeXml(absoluteUrl(post.cover))}" alt=""></p>\n` : '';
    const content = cover + absolutizeHtml(post.contentHtml) +
      `\n<p><a href="${escapeXml(link)}">Ler no site e comentar</a></p>`;
    const categories = post.tags.map(t => `      <category>${escapeXml(t)}</category>`).join('\n');
    const enclosure = post.cover ? `\n      <media:content url="${escapeXml(absoluteUrl(post.cover))}" medium="image"/>` : '';
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      <content:encoded>${cdata(content)}</content:encoded>${enclosure}
${categories}
    </item>`.replace(/\n\n/g, '\n');
  }).join('\n');

  const lastBuild = posts.length ? rfc822(posts[0].date) : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}/</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>pt-BR</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  fs.writeFileSync(FEED_OUT, xml);
  console.log(`feed.xml gerado com ${Math.min(posts.length, 20)} publicação(ões).`);
}

const posts = buildPosts();
updateConfig(posts);
buildFeed(posts);
