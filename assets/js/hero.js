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

document.addEventListener('DOMContentLoaded', initHero);
