(() => {
'use strict';
const KEY = 'ml:cards', THEME = 'ml:theme';
const $ = s => document.querySelector(s);
const grid = $('#grid'), ed = $('#ed');
let cards = [], filter = '', query = '', intro = true, justAdded = null, editing = null, draft = '', dragEl = null;

const P = {
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));

function h(tag, a = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  el.append(...kids.filter(Boolean));
  return el;
}
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const byId = id => cards.find(c => c.id === id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function normUrl(s) {
  s = (s || '').trim(); if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;
  try { const u = new URL(s); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') || u.hostname === 'localhost' ? u.href : null; } catch { return null; }
}
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const defTitle = u => { const p = host(u).split('.'); const n = p.length > 1 ? p[p.length - (p.length > 2 && p[p.length - 2].length <= 3 ? 3 : 2)] : p[0]; return n.charAt(0).toUpperCase() + n.slice(1); };
const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const okImg = s => typeof s === 'string' && (/^data:image\//.test(s) || /^https?:\/\//i.test(s)) ? s : '';

function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d)) cards = d; } catch {} }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cards)); return true; }
  catch { toast('Sem espaço no navegador. Use imagens menores ou exporte um backup.'); return false; }
}

function toast(msg, action, fn) {
  const box = $('#toasts'); while (box.children.length > 2) box.firstChild.remove();
  const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: msg }));
  const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 220); };
  if (action) { const b = h('button', { type: 'button', text: action }); b.onclick = () => { fn(); close(); }; t.append(b); }
  box.append(t); setTimeout(close, action ? 6000 : 3800);
}
const shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

function autoCover(c) {
  const h0 = host(c.url), badge = h('div', { class: 'badge', text: (c.title || h0).charAt(0).toUpperCase() });
  const img = new Image(); img.alt = ''; img.draggable = false;
  img.onload = () => { if (img.naturalWidth >= 32) badge.replaceChildren(img); };
  img.src = 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(h0);
  const d = h('div', { class: 'auto' }, badge); d.style.setProperty('--h', hue(h0)); return d;
}
function fillCover(el, c) {
  el.replaceChildren();
  if (okImg(c.image)) {
    const img = h('img', { class: 'cover-img', alt: '', loading: 'lazy', draggable: 'false', src: c.image });
    img.onerror = () => img.replaceWith(autoCover(c)); el.append(img);
  } else el.append(autoCover(c));
}

const canDrag = () => !filter && !query;
function visible() {
  const q = norm(query);
  return cards.filter(c => (!filter || (filter === '__fav' ? c.fav : c.tag === filter)) &&
    (!q || norm([c.title, c.desc, c.url, c.tag].join(' ')).includes(q)));
}

function cardEl(c, i) {
  const cover = h('div', { class: 'cover' }); fillCover(cover, c);
  cover.append(
    h('button', { class: 'pin' + (c.fav ? ' on' : ''), type: 'button', 'data-act': 'fav', 'aria-pressed': String(!!c.fav), 'aria-label': 'Favorito', html: icon('star') }),
    h('button', { class: 'tool', type: 'button', 'data-act': 'edit', 'aria-label': 'Editar', html: icon('pen') }),
    h('button', { class: 'tool', type: 'button', 'data-act': 'del', 'aria-label': 'Excluir', html: icon('trash') }));
  const el = h('article', { class: 'card', 'data-id': c.id, tabindex: '0', role: 'link', 'aria-label': 'Abrir ' + c.title, draggable: canDrag() ? 'true' : 'false' },
    cover,
    h('div', { class: 'body' },
      h('h3', { class: 'title', text: c.title }),
      h('p', { class: 'host' }, h('span', { text: host(c.url) }), c.tag && h('span', { class: 'tag', text: c.tag })),
      h('div', { class: 'desc-area' }, c.desc ? h('p', { class: 'desc', text: c.desc }) : h('button', { class: 'desc-empty', type: 'button', 'data-act': 'edit', text: 'Adicionar descrição' })),
      h('div', { class: 'meta' }, h('span', { class: 'visits', text: visitsTxt(c) }), h('span', { html: icon('ext') }))));
  if (c.id === justAdded) el.classList.add('pop');
  else if (intro) { el.classList.add('enter'); el.style.setProperty('--i', Math.min(i, 12)); }
  return el;
}
const visitsTxt = c => !c.visits ? 'Nunca aberto' : c.visits === 1 ? '1 abertura' : c.visits + ' aberturas';

function render() {
  const tags = [...new Set(cards.map(c => c.tag).filter(Boolean))].sort();
  if (filter && filter !== '__fav' && !tags.includes(filter)) filter = '';
  if (filter === '__fav' && !cards.some(c => c.fav)) filter = '';
  const chips = $('#chips'); chips.replaceChildren();
  const chip = (label, val) => { const b = h('button', { class: 'chip', type: 'button', text: label, 'aria-pressed': String(filter === val) }); b.onclick = () => { filter = val; render(); }; chips.append(b); };
  if (tags.length || cards.some(c => c.fav)) { chip('Todos', ''); if (cards.some(c => c.fav)) chip('★ Favoritos', '__fav'); tags.forEach(t => chip(t, t)); }
  $('#tags').replaceChildren(...tags.map(t => h('option', { value: t })));

  const list = visible();
  grid.replaceChildren(...list.map(cardEl));
  intro = false; justAdded = null;
  const e = $('#empty'); e.hidden = list.length > 0;
  e.replaceChildren(cards.length
    ? h('strong', { text: 'Nada encontrado' }) : h('strong', { text: 'Nenhum link ainda' }),
    h('span', { text: cards.length ? 'Tente outra busca ou outro filtro.' : 'Cole o endereço de um site no campo acima e aperte Enter.' }));
  const f = cards.filter(c => c.fav).length;
  $('#stats').textContent = `${cards.length} ${cards.length === 1 ? 'link salvo' : 'links salvos'}` + (f ? `, ${f} ${f === 1 ? 'favorito' : 'favoritos'}` : '');
}

/* ações dos cards */
grid.addEventListener('click', e => {
  const card = e.target.closest('.card'); const c = card && byId(card.dataset.id); if (!c) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'fav') {
    c.fav = !c.fav; save();
    if (filter === '__fav') return render();
    const p = card.querySelector('.pin'); p.classList.toggle('on', c.fav); p.setAttribute('aria-pressed', String(c.fav));
    p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); setTimeout(render, 450);
  } else if (act === 'edit') openEditor(c);
  else if (act === 'del') remove(c, card);
  else {
    window.open(c.url, '_blank', 'noopener,noreferrer');
    c.visits = (c.visits || 0) + 1; save(); card.querySelector('.visits').textContent = visitsTxt(c);
  }
});
grid.addEventListener('keydown', e => { if (e.target.classList.contains('card') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.click(); } });

function remove(c, el) {
  el.classList.add('leaving');
  setTimeout(() => {
    const i = cards.indexOf(c); cards.splice(i, 1); save(); render();
    toast('Card excluído', 'Desfazer', () => { cards.splice(i, 0, c); save(); render(); });
  }, 240);
}

/* arrastar para reordenar */
grid.addEventListener('dragstart', e => { dragEl = e.target.closest('.card'); if (!dragEl) return; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragEl.dataset.id); requestAnimationFrame(() => dragEl.classList.add('dragging')); });
grid.addEventListener('dragover', e => {
  if (!dragEl) return; e.preventDefault();
  const o = e.target.closest('.card'); if (!o || o === dragEl) return;
  const r = o.getBoundingClientRect(); (e.clientX - r.left > r.width / 2 ? o.after(dragEl) : o.before(dragEl));
});
grid.addEventListener('dragend', () => {
  if (!dragEl) return; dragEl.classList.remove('dragging');
  const ids = [...grid.children].map(n => n.dataset.id); dragEl = null;
  if (ids.length === cards.length) { cards = ids.map(byId); save(); }
});

/* adicionar */
$('#adder').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('#add-in'), url = normUrl(inp.value);
  if (!url) { shake(e.currentTarget); return toast('Esse link não parece válido. Exemplo: github.com'); }
  if (cards.some(c => c.url === url)) { shake(e.currentTarget); return toast('Esse link já está salvo.'); }
  const c = { id: uid(), url, title: defTitle(url), desc: '', image: '', tag: '', fav: false, visits: 0 };
  cards.unshift(c); justAdded = c.id; filter = ''; query = ''; $('#q').value = ''; inp.value = '';
  save(); render(); toast('Card adicionado', 'Editar', () => openEditor(c));
});
$('#q').addEventListener('input', e => { query = e.target.value; render(); });

/* editor */
const E = id => $('#ed-' + id);
function previewCover() { fillCover(E('cover'), { url: normUrl(E('url').value) || 'https://exemplo.com', title: E('title').value, image: draft }); }
function openEditor(c) {
  editing = c; draft = c.image || '';
  E('title').value = c.title; E('desc').value = c.desc; E('url').value = c.url; E('tag').value = c.tag || '';
  E('img').value = /^https?:/.test(draft) ? draft : ''; E('err').hidden = true; previewCover(); ed.showModal();
}
E('img').addEventListener('input', e => { draft = okImg(e.target.value.trim()); previewCover(); });
E('url').addEventListener('change', previewCover);
E('auto').onclick = () => { draft = ''; E('img').value = ''; previewCover(); };
E('up').onclick = () => E('file').click();
E('file').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const bmp = await createImageBitmap(f), s = Math.min(1, 720 / Math.max(bmp.width, bmp.height));
    const cv = h('canvas'); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(bmp, 0, 0, cv.width, cv.height);
    draft = cv.toDataURL('image/jpeg', .84); E('img').value = ''; previewCover();
  } catch { toast('Não consegui ler essa imagem.'); }
};
E('cancel').onclick = () => ed.close();
ed.addEventListener('click', e => { if (e.target === ed) ed.close(); });
E('form').addEventListener('submit', e => {
  e.preventDefault(); const url = normUrl(E('url').value), err = E('err');
  const fail = m => { err.textContent = m; err.hidden = false; };
  if (!url) return fail('Digite um link válido. Exemplo: github.com');
  if (cards.some(c => c !== editing && c.url === url)) return fail('Esse link já está em outro card.');
  Object.assign(editing, { url, title: E('title').value.trim() || defTitle(url), desc: E('desc').value.trim(), tag: E('tag').value.trim(), image: draft });
  save(); ed.close(); render();
});

/* backup */
$('#b-export').onclick = () => {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ cards }, null, 2)], { type: 'application/json' })), download: `meus-links-${new Date().toISOString().slice(0, 10)}.json` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#b-import').onclick = () => $('#f-import').click();
$('#f-import').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text()), arr = Array.isArray(d) ? d : d.cards; let n = 0;
    for (const r of arr) {
      const url = normUrl(r.url); if (!url || cards.some(c => c.url === url)) continue;
      cards.push({ id: uid(), url, title: String(r.title || defTitle(url)).slice(0, 80), desc: String(r.desc || '').slice(0, 400), image: okImg(r.image), tag: String(r.tag || '').slice(0, 24), fav: !!r.fav, visits: +r.visits || 0 }); n++;
    }
    save(); render(); toast(n ? `${n} ${n === 1 ? 'card importado' : 'cards importados'}` : 'Nenhum card novo no arquivo.');
  } catch { toast('Arquivo inválido. Use um backup exportado por aqui.'); }
};

/* tema e sincronização entre abas */
const setTheme = t => { document.documentElement.dataset.theme = t; $('#b-theme').innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); try { localStorage.setItem(THEME, t); } catch {} };
$('#b-theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
window.addEventListener('storage', e => { if (e.key === KEY && !ed.open) { load(); render(); } });
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA/.test(e.target.tagName) && !ed.open) { e.preventDefault(); $('#q').focus(); } });

setTheme(document.documentElement.dataset.theme || 'light');
load(); render();
})();
