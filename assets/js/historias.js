document.addEventListener('DOMContentLoaded', async () => {
  const posts = await FF.loadPosts();
  const filterRow = document.querySelector('#filter-row');
  const grid = document.querySelector('#all-grid');
  const empty = document.querySelector('#all-empty');
  const params = new URLSearchParams(window.location.search);
  let active = params.get('tag') || '';

  const tags = FF.allTags(posts);

  function renderFilters() {
    const chips = [{ t: '', label: 'Todas' }, ...tags.map(t => ({ t, label: t }))];
    filterRow.innerHTML = chips.map(c =>
      `<button type="button" class="tag${active === c.t ? ' is-active' : ''}" data-tag="${c.t}">${c.label}</button>`
    ).join('');
    filterRow.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        active = btn.dataset.tag;
        const url = new URL(window.location);
        if (active) url.searchParams.set('tag', active); else url.searchParams.delete('tag');
        history.replaceState(null, '', url);
        renderFilters();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const list = active ? posts.filter(p => (p.tags || []).includes(active)) : posts;
    if (!list.length) {
      grid.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    grid.style.display = 'grid';
    empty.style.display = 'none';
    grid.innerHTML = list.map(FF.postCardHtml).join('');
  }

  if (!tags.length) {
    filterRow.style.display = 'none';
  } else {
    renderFilters();
  }
  renderGrid();
});
