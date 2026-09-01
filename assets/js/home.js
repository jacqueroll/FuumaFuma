document.addEventListener('DOMContentLoaded', async () => {
  const [posts, config] = await Promise.all([FF.loadPosts(), FF.loadConfig()]);

  renderProgress(config, posts);
  renderLatest(posts);
});

function renderProgress(config, posts) {
  const el = document.querySelector('#progress-card');
  if (!el) return;
  const p = FF.computeProgress(config, posts);

  if (!p.hasLast) {
    el.innerHTML = `
      <div>
        <span class="goal-pill">Meta ${p.label}</span>
        <h3>Ainda sem publicações por aqui</h3>
        <p class="progress-card__meta">Assim que a primeira publicação sair, este quadro passa a acompanhar o ritmo de escrita automaticamente.</p>
      </div>
      <div class="progress-side">
        Este espaço mostra <strong>há quanto tempo</strong> desde a última publicação e quando a próxima é esperada, com base na meta ${p.label} definida em <code>data/config.json</code>.
      </div>`;
    return;
  }

  const nextLabel = p.next.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  const overdue = p.elapsed > p.days;
  const remaining = p.days - p.elapsed;

  el.innerHTML = `
    <div>
      <span class="goal-pill">Meta ${p.label}</span>
      <h3>Diário de escrita</h3>
      <p class="progress-card__meta">Última publicação em ${FF.formatDate(p.last)}.</p>
      <div class="progress-bar"><div class="progress-bar__fill" style="width:${p.pct}%"></div></div>
      <div class="progress-stats">
        <div class="stat"><b>${p.elapsed}</b><span>dias desde o último capítulo</span></div>
        <div class="stat"><b>${overdue ? 'passou' : Math.max(remaining, 0)}</b><span>${overdue ? 'da janela prevista' : 'dias até a próxima janela'}</span></div>
      </div>
    </div>
    <div class="progress-side">
      Próxima publicação esperada por volta de <strong>${nextLabel}</strong>, seguindo o ritmo ${p.label} escolhido. A meta é um norte, não uma cobrança — quando sair, sai.
    </div>`;
}

function renderLatest(posts) {
  const grid = document.querySelector('#latest-grid');
  const empty = document.querySelector('#latest-empty');
  if (!grid) return;
  const latest = posts.slice(0, 3);
  if (!latest.length) {
    grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  grid.innerHTML = latest.map(FF.postCardHtml).join('');
}
