(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MAGS = window.MAGAZINES || [];
const pageSrc = (m, n) => `assets/magazine/${m.folder}/${n}.${m.ext || 'jpg'}`;

// list page: one card per edition
const list = $('#mag-list');
if (list) {
  list.innerHTML = MAGS.length ? MAGS.map(m => `
      <a class="mag" href="magazine-viewer.html?issue=${encodeURIComponent(m.id)}">
        <img src="${pageSrc(m, 1)}" alt="${m.title} cover" loading="lazy">
        <div class="mag-body"><h3>${m.title}</h3><p>${m.date || ''}</p></div>
      </a>`).join('') : '<p class="intro">Our first edition is on its way.</p>';
}

// viewer: page-flip book
const stage = $('#flip-stage');
if (!stage) return;
const mag = MAGS.find(m => m.id === new URLSearchParams(location.search).get('issue')) || MAGS[0];
if (!mag) { stage.textContent = 'No editions yet.'; return; }

$('#flip-title').textContent = `${mag.title}${mag.date ? ' · ' + mag.date : ''}`;
document.title = `${mag.title} | Leo Club of Matara Excellence`;
if (mag.pdf) { const d = $('#flip-pdf'); d.href = mag.pdf; d.hidden = false; }

const book = $('#flip-book'), label = $('#flip-label'), prevB = $('#flip-prev'), nextB = $('#flip-next');
const N = mag.pages;
let single, leaves, f = 0, zoom = 1, ratio = 0.72; // ratio = page width / height

const build = () => {
  const pages = Array.from({ length: N }, (_, i) => pageSrc(mag, i + 1));
  if (!single && pages.length % 2) pages.push(''); // blank back so spreads pair up
  const faces = single
    ? pages.map(p => [p, ''])
    : pages.reduce((a, p, i) => { if (i % 2) a[a.length - 1].push(p); else a.push([p]); return a; }, []);
  leaves = faces.length;
  const img = (src, n) => (src ? `<img src="${src}" alt="Page ${n}" draggable="false">` : '');
  book.innerHTML = faces.map(([a, b], i) => `
    <div class="leaf"><div class="face front">${img(a, single ? i + 1 : i * 2 + 1)}</div><div class="face back">${img(b, i * 2 + 2)}</div></div>`).join('');
  book.classList.toggle('single', single);
};

const size = () => {
  const w = stage.clientWidth, h = stage.clientHeight;
  const pw = Math.min(single ? w : w / 2, h * ratio) * 0.96 * zoom;
  book.style.setProperty('--pw', pw + 'px');
  book.style.setProperty('--ph', pw / ratio + 'px');
};

const lastF = () => (single ? leaves - 1 : leaves);

const render = () => {
  $$('.leaf', book).forEach((el, i) => {
    const flipped = i < f;
    el.classList.toggle('flipped', flipped);
    el.style.zIndex = flipped ? i : leaves - i;
  });
  book.classList.toggle('at-start', f === 0);
  book.classList.toggle('at-end', !single && f >= leaves);
  prevB.disabled = f === 0;
  nextB.disabled = f >= lastF();
  const p = single ? [f + 1] : f === 0 ? [1] : [2 * f, 2 * f + 1].filter(n => n <= N);
  label.textContent = `${p.join('–')} / ${N}`;
};

const go = d => {
  const t = Math.max(0, Math.min(lastF(), f + d));
  if (t === f) return;
  const moving = $$('.leaf', book)[d > 0 ? f : t];
  f = t; render();
  moving.style.zIndex = leaves + 1; // keep the turning page on top until it lands
  setTimeout(render, 650);
};

const setup = () => {
  const s = stage.clientWidth < 700;
  if (s !== single) {
    const page = single === undefined ? 0 : single ? f : f * 2; // keep the reader on the same page when the layout switches
    single = s; build();
    f = single ? Math.min(page, leaves - 1) : Math.ceil(page / 2);
  }
  size(); render();
};

// the first page decides the aspect ratio, so any page size works
const probe = new Image();
probe.onload = () => { if (probe.naturalWidth) ratio = probe.naturalWidth / probe.naturalHeight; setup(); };
probe.onerror = setup;
probe.src = pageSrc(mag, 1);

prevB.onclick = () => go(-1);
nextB.onclick = () => go(1);
book.addEventListener('click', e => {
  if (zoom > 1 || !e.target.closest('.face')) return;
  const r = book.getBoundingClientRect();
  go(!single && e.clientX < r.left + r.width / 2 ? -1 : 1);
});
addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
let x0 = null;
stage.addEventListener('pointerdown', e => { x0 = e.clientX; });
stage.addEventListener('pointerup', e => { if (x0 !== null && zoom === 1 && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1); x0 = null; });
const setZoom = z => { zoom = Math.max(1, Math.min(2.5, z)); stage.classList.toggle('zoomed', zoom > 1); size(); };
$('#flip-zin').onclick = () => setZoom(zoom + .25);
$('#flip-zout').onclick = () => setZoom(zoom - .25);
$('#flip-full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('#flip').requestFullscreen?.());
$('#flip-share').onclick = async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; setTimeout(() => (b.textContent = 'Share'), 1800); } catch {}
};
addEventListener('resize', setup);
document.addEventListener('fullscreenchange', () => setTimeout(setup, 100));
})();
