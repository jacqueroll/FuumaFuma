document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const posts = await FF.loadPosts();
  const post = posts.find(p => p.slug === slug);
  const root = document.querySelector('#post-root');

  if (!post) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>Publicação não encontrada</h3>
        <p>Ela pode ter sido apagada ou o link está incorreto.</p>
        <p><a class="btn btn--ghost" href="historias.html">← voltar para histórias</a></p>
      </div>`;
    return;
  }

  document.title = post.title + ' — FuumaFuma';
  const url = window.location.origin + window.location.pathname + '?slug=' + encodeURIComponent(post.slug);
  const tags = (post.tags || []).map(t => `<a class="tag" href="historias.html?tag=${encodeURIComponent(t)}">${t}</a>`).join('');
  const cover = post.cover ? `<div class="post-cover"><img src="${post.cover}" alt=""></div>` : '';

  root.innerHTML = `
    <a class="btn btn--ghost btn--sm" href="historias.html">← todas as histórias</a>
    <div class="post-head" style="margin-top:22px;">
      <div class="post-head__meta">
        <span>${FF.formatDate(post.date)}</span>
        <div class="tag-row">${tags}</div>
      </div>
      <h1>${post.title}</h1>
    </div>
    ${cover}
    <div class="prose">${post.contentHtml}</div>
    <div class="share-row">
      <span class="share-row__label">Compartilhar:</span>
      <a class="share-btn" title="E-mail" href="mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent('Vem ler: ' + url)}">${icon('mail')}</a>
      <a class="share-btn" title="WhatsApp" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(post.title + ' — ' + url)}">${icon('whatsapp')}</a>
      <a class="share-btn" title="X (Twitter)" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}">${icon('x')}</a>
      <a class="share-btn" title="Facebook" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">${icon('facebook')}</a>
      <button class="share-btn" title="Copiar link" id="copy-link">${icon('link')}</button>
      <span class="copy-toast" id="copy-toast">link copiado!</span>
    </div>`;

  document.querySelector('#copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = url; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    const toast = document.querySelector('#copy-toast');
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 1800);
  });
});

function icon(name) {
  const icons = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.1-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.2 0-.3 0-.4-.1-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.6-5.8 6.6H1.5l7.5-8.6L1 3h6.5l4.6 6.1L17.5 3zm-1.1 16.2h1.8L7.7 4.7H5.8l10.6 14.5z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.9.2-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10H8v3h2.4v8h3.1z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5"/></svg>'
  };
  return icons[name] || '';
}
