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

const posts = buildPosts();
updateConfig(posts);
