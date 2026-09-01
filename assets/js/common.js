/* Utilitários compartilhados por todas as páginas do FuumaFuma. */

const FF = (() => {
  const BASE = (() => {
    // permite que o site funcione em qualquer subpasta do GitHub Pages
    // (ex.: usuario.github.io/FuumaFuma/) — todas as páginas .html vivem
    // na raiz do projeto, então basta usar a pasta do documento atual.
    const path = window.location.pathname;
    return path.slice(0, path.lastIndexOf('/') + 1);
  })();

  async function loadPosts() {
    const res = await fetch(BASE + 'data/posts.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const posts = await res.json();
    return posts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function loadConfig() {
    const res = await fetch(BASE + 'data/config.json', { cache: 'no-store' });
    if (!res.ok) return { metaEscrita: 'quinzenal', ultimaPublicacao: null };
    return res.json();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function formatDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function slugify(text) {
    return text
      .toString()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
  }

  function allTags(posts) {
    const set = new Set();
    posts.forEach(p => (p.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }

  function postCardHtml(post) {
    const cover = post.cover
      ? `<div class="post-card__cover"><img src="${BASE}${post.cover}" alt="" loading="lazy"></div>`
      : `<div class="post-card__cover is-empty">FF</div>`;
    const tags = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <a class="post-card" href="${BASE}post.html?slug=${encodeURIComponent(post.slug)}">
        ${cover}
        <div class="post-card__body">
          <span class="post-card__date">${formatDateShort(post.date)}</span>
          <h3 class="post-card__title">${post.title}</h3>
          <p class="post-card__excerpt">${post.excerpt || ''}</p>
          <div class="tag-row">${tags}</div>
          <span class="read-more">Ler publicação →</span>
        </div>
      </a>`;
  }

  function computeProgress(config, posts) {
    const days = config.metaEscrita === 'mensal' ? 30 : 14;
    const last = config.ultimaPublicacao || (posts[0] && posts[0].date) || null;
    if (!last) {
      return { hasLast: false, days, elapsed: 0, pct: 0, next: null, label: config.metaEscrita === 'mensal' ? 'mensal' : 'quinzenal' };
    }
    const lastDate = new Date(last + 'T00:00:00');
    const now = new Date();
    const elapsed = Math.max(0, Math.floor((now - lastDate) / 86400000));
    const pct = Math.min(100, Math.round((elapsed / days) * 100));
    const next = new Date(lastDate.getTime() + days * 86400000);
    return {
      hasLast: true,
      days,
      elapsed,
      pct,
      last,
      next,
      label: config.metaEscrita === 'mensal' ? 'mensal' : 'quinzenal'
    };
  }

  function initNav(current) {
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.dataset.page === current) a.setAttribute('aria-current', 'page');
    });
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => nav.classList.toggle('is-open'));
    }
    const year = document.querySelector('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  return { BASE, loadPosts, loadConfig, formatDate, formatDateShort, slugify, allTags, postCardHtml, computeProgress, initNav };
})();
