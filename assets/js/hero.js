/* Carrossel horizontal do banner principal (Fuuma & Kamui rotativos). */

function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const slides = Array.from(hero.querySelectorAll('.hero__slide'));
  const dotsWrap = hero.querySelector('.hero__dots');
  const prevBtn = hero.querySelector('.hero__arrow--prev');
  const nextBtn = hero.querySelector('.hero__arrow--next');
  let index = slides.findIndex(s => s.classList.contains('is-active'));
  if (index < 0) index = 0;
  let timer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero__dot' + (i === index ? ' is-active' : '');
    dot.setAttribute('aria-label', `Ir para a imagem ${i + 1}`);
    dot.addEventListener('click', () => go(i));
    dotsWrap.appendChild(dot);
  });

  function render() {
    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    dotsWrap.querySelectorAll('.hero__dot').forEach((d, i) => d.classList.toggle('is-active', i === index));
  }

  function go(i) {
    index = (i + slides.length) % slides.length;
    render();
    restart();
  }

  function next() { go(index + 1); }
  function prev() { go(index - 1); }

  function restart() {
    clearInterval(timer);
    timer = setInterval(next, 6000);
  }

  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);

  hero.addEventListener('mouseenter', () => clearInterval(timer));
  hero.addEventListener('mouseleave', restart);

  render();
  restart();
}

/*
 * Imagens e enquadramento editáveis pelo painel (Configurações > Banner da
 * página inicial), salvos em data/hero.json. Se o arquivo não carregar, o
 * banner usa as imagens que já estão escritas no index.html.
 */
async function applyHeroData() {
  const slides = Array.from(document.querySelectorAll('.hero__slide'));
  if (!slides.length) return;
  try {
    const base = (typeof FF !== 'undefined' && FF.BASE) || '/';
    const res = await fetch(base + 'data/hero.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const items = Object.keys(data)
      .filter(k => /^slide\d+$/.test(k))
      .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
      .map(k => data[k]);

    slides.forEach((slide, i) => {
      const item = items[i];
      if (!item || !item.imagem) return;
      const img = slide.querySelector('img');
      if (!img) return;
      const src = /^(https?:)?\/\//.test(item.imagem) ? item.imagem : base + item.imagem.replace(/^\//, '');
      img.src = src;
      if (item.descricao) img.alt = item.descricao;
      const [x, y, z] = String(item.enquadramento || '').trim().split(/\s+/).map(Number);
      if (isFinite(x) && isFinite(y)) slide.style.setProperty('--focus', `${x}% ${y}%`);
      slide.style.setProperty('--zoom', isFinite(z) && z >= 1 ? z : 1);
    });
  } catch (e) {
    // mantém as imagens do HTML
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await applyHeroData();
  initHero();
});
