document.addEventListener('DOMContentLoaded', () => {
  const els = {
    title: document.querySelector('#f-title'),
    date: document.querySelector('#f-date'),
    cover: document.querySelector('#f-cover'),
    excerpt: document.querySelector('#f-excerpt'),
    tagInput: document.querySelector('#f-tag-input'),
    tagList: document.querySelector('#tag-list'),
    editable: document.querySelector('#editable'),
    out: document.querySelector('#code-out'),
    configOut: document.querySelector('#config-out'),
    copyBtn: document.querySelector('#copy-json'),
    copyConfigBtn: document.querySelector('#copy-config'),
    generateBtn: document.querySelector('#generate-btn'),
    resetBtn: document.querySelector('#reset-btn'),
    imgBtn: document.querySelector('#tb-image'),
    linkBtn: document.querySelector('#tb-link'),
  };

  let tags = [];
  const DRAFT_KEY = 'fuumafuma-draft-v1';

  // data de hoje por padrão
  if (!els.date.value) {
    els.date.value = new Date().toISOString().slice(0, 10);
  }

  // ---- toolbar de formatação ----
  document.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      els.editable.focus();
      document.execCommand(btn.dataset.cmd, false, btn.dataset.value || null);
      saveDraft();
    });
  });

  els.linkBtn.addEventListener('click', () => {
    const url = prompt('Endereço do link (https://...)');
    if (url) { els.editable.focus(); document.execCommand('createLink', false, url); }
    saveDraft();
  });

  els.imgBtn.addEventListener('click', () => {
    const url = prompt('Endereço da imagem (URL). Para imagens próprias, hospede no repositório em assets/images/posts/ e cole o caminho, ex: assets/images/posts/minha-imagem.jpg');
    if (url) { els.editable.focus(); document.execCommand('insertImage', false, url); }
    saveDraft();
  });

  // ---- tags ----
  els.tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = els.tagInput.value.trim().replace(/,$/, '');
      if (v && !tags.includes(v)) { tags.push(v); renderTags(); }
      els.tagInput.value = '';
      saveDraft();
    }
  });

  function renderTags() {
    els.tagList.innerHTML = tags.map((t, i) =>
      `<span class="chip">${t} <button type="button" data-i="${i}" aria-label="remover">×</button></span>`
    ).join('');
    els.tagList.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => { tags.splice(+b.dataset.i, 1); renderTags(); saveDraft(); });
    });
  }

  // ---- autosave em rascunho local ----
  function saveDraft() {
    const draft = {
      title: els.title.value,
      date: els.date.value,
      cover: els.cover.value,
      excerpt: els.excerpt.value,
      tags,
      html: els.editable.innerHTML,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function loadDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      els.title.value = d.title || '';
      if (d.date) els.date.value = d.date;
      els.cover.value = d.cover || '';
      els.excerpt.value = d.excerpt || '';
      tags = d.tags || [];
      renderTags();
      els.editable.innerHTML = d.html || '';
    } catch (e) { /* rascunho corrompido, ignora */ }
  }

  [els.title, els.date, els.cover, els.excerpt].forEach(el => el.addEventListener('input', saveDraft));
  els.editable.addEventListener('input', saveDraft);

  els.resetBtn.addEventListener('click', () => {
    if (!confirm('Limpar tudo o que foi escrito nesta página?')) return;
    localStorage.removeItem(DRAFT_KEY);
    els.title.value = ''; els.cover.value = ''; els.excerpt.value = '';
    els.editable.innerHTML = ''; tags = []; renderTags();
    els.date.value = new Date().toISOString().slice(0, 10);
    els.out.textContent = 'O código do post aparece aqui depois de clicar em "Gerar código do post".';
    els.configOut.textContent = '';
  });

  // ---- geração do JSON do post ----
  els.generateBtn.addEventListener('click', () => {
    if (!els.title.value.trim()) { alert('Dá um título para a publicação primeiro :)'); return; }
    const filename = els.date.value + '-' + FF.slugify(els.title.value) + '.json';
    const post = {
      title: els.title.value.trim(),
      date: els.date.value,
      tags,
      cover: els.cover.value.trim(),
      excerpt: els.excerpt.value.trim(),
      body: els.editable.innerHTML.trim(),
    };
    els.out.textContent = `// nome do arquivo: data/posts/${filename}\n` + JSON.stringify(post, null, 2);

    const meta = document.querySelector('#f-meta').value;
    els.configOut.textContent = `// só precisa mudar isto se quiser trocar o ritmo (o resto é automático)\n{\n  "metaEscrita": "${meta}"\n}`;
  });

  els.copyBtn.addEventListener('click', () => copy(els.out.textContent, els.copyBtn));
  els.copyConfigBtn.addEventListener('click', () => copy(els.configOut.textContent, els.copyConfigBtn));

  async function copy(text, btn) {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
    const original = btn.textContent;
    btn.textContent = 'copiado!';
    setTimeout(() => (btn.textContent = original), 1500);
  }

  loadDraft();
});
