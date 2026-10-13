/*
 * Comentários das publicações.
 *
 * Envio: formulário "comentarios" do Netlify Forms (post.html).
 * Leitura: função netlify/functions/comments.js, que devolve os comentários
 * da publicação aberta. Para apagar um comentário, basta excluí-lo em
 * Netlify > Forms > comentarios.
 */

(() => {
  const ENDPOINT = '/.netlify/functions/comments';

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function commentHtml(c) {
    return `
      <article class="comment">
        <header class="comment__head">
          <span class="comment__name">${escapeHtml(c.nome)}</span>
          <time class="comment__date" datetime="${escapeHtml(c.data)}">${formatWhen(c.data)}</time>
        </header>
        <p class="comment__text">${escapeHtml(c.comentario).replace(/\n/g, '<br>')}</p>
      </article>`;
  }

  function renderList(list, comments) {
    if (!comments.length) {
      list.innerHTML = '<p class="comments__empty">Ainda não há comentários. Que tal deixar o primeiro?</p>';
      return;
    }
    list.innerHTML = comments.map(commentHtml).join('');
  }

  async function loadComments(slug, list) {
    list.innerHTML = '<p class="comments__empty">Carregando comentários...</p>';
    try {
      const res = await fetch(`${ENDPOINT}?post=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('falha');
      const data = await res.json();
      renderList(list, Array.isArray(data.comments) ? data.comments : []);
    } catch (e) {
      list.innerHTML = '<p class="comments__empty">Não consegui carregar os comentários agora.</p>';
    }
  }

  document.addEventListener('ff:post-ready', (event) => {
    const post = event.detail;
    const section = document.querySelector('#comments');
    const list = document.querySelector('#comments-list');
    const form = document.querySelector('#comment-form');
    const status = document.querySelector('#comment-status');
    if (!section || !post) return;

    section.hidden = false;
    form.querySelector('#comment-post').value = post.slug;
    loadComments(post.slug, list);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      status.className = 'form-status';
      status.textContent = 'Enviando...';
      button.disabled = true;

      const body = new URLSearchParams(new FormData(form)).toString();
      try {
        const res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        if (!res.ok) throw new Error('falha no envio');

        const novo = {
          nome: form.querySelector('#comment-nome').value,
          comentario: form.querySelector('#comment-texto').value,
          data: new Date().toISOString()
        };
        const empty = list.querySelector('.comments__empty');
        if (empty) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', commentHtml(novo));

        form.querySelector('#comment-texto').value = '';
        status.classList.add('is-ok');
        status.textContent = 'Comentário enviado. Obrigada!';
      } catch (err) {
        status.classList.add('is-error');
        status.textContent = 'Não consegui enviar agora. Tente de novo em instantes.';
      } finally {
        button.disabled = false;
      }
    });
  });
})();
