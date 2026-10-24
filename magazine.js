(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MAGS = window.MAGAZINES || [];
const pageSrc = (m, n) => `assets/magazine/${m.folder}/${n}.${m.ext || 'jpg'}`;
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

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
if (!$('#flip').requestFullscreen) $('#flip-full').hidden = true; // iPhone Safari has no element fullscreen

const book = $('#flip-book'), label = $('#flip-label'), prevB = $('#flip-prev'), nextB = $('#flip-next');
const slider = $('#flip-slider'), thumbs = $('#flip-thumbs'), grid = $('#flip-thumbs-grid');
const N = mag.pages, KEY = 'mag:' + mag.id;
slider.max = N;
let single, leaves, f = 0, zoom = 1, ratio = 0.72, inited = false; // ratio = page width / height
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const leafEls = () => $$('.leaf', book);
const lastF = () => (single ? leaves - 1 : leaves);
const pageNow = () => (single ? f + 1 : f === 0 ? 1 : Math.min(N, 2 * f));
const visible = () => (single ? [f + 1] : f === 0 ? [1] : [2 * f, 2 * f + 1].filter(n => n <= N));

const build = () => {
  const pages = Array.from({ length: N }, (_, i) => pageSrc(mag, i + 1));
  if (!single && pages.length % 2) pages.push(''); // blank back so spreads pair up
  const faces = single
    ? pages.map(p => [p, ''])
    : pages.reduce((a, p, i) => { if (i % 2) a[a.length - 1].push(p); else a.push([p]); return a; }, []);
  leaves = faces.length;
  const img = (src, n) => (src ? `<img data-src="${src}" alt="Page ${n}" draggable="false" decoding="async">` : '');
  book.innerHTML = faces.map(([a, b], i) => `
    <div class="leaf"><div class="face front">${img(a, single ? i + 1 : i * 2 + 1)}</div><div class="face back">${img(b, i * 2 + 2)}</div></div>`).join('');
  book.classList.toggle('single', single);
};

// only load the pages near the reader, so phones don't download a whole magazine up front
const ensure = () => leafEls().forEach((el, i) => {
  if (i < f - 3 || i > f + 4) return;
  $$('img[data-src]', el).forEach(im => { im.onload = () => im.classList.add('ok'); im.src = im.dataset.src; im.removeAttribute('data-src'); });
});

const size = () => {
  const w = stage.clientWidth, h = stage.clientHeight;
  const pw = Math.min(single ? w : w / 2, h * ratio) * 0.96 * zoom;
  book.style.setProperty('--pw', pw + 'px');
  book.style.setProperty('--ph', pw / ratio + 'px');
};

const render = () => {
  leafEls().forEach((el, i) => {
    const flipped = i < f;
    el.classList.toggle('flipped', flipped);
    if (!el.classList.contains('turning') && !el.classList.contains('settling')) el.style.zIndex = flipped ? i : leaves - i;
  });
  book.classList.toggle('at-start', f === 0);
  book.classList.toggle('at-end', !single && f >= leaves);
  prevB.disabled = f === 0;
  nextB.disabled = f >= lastF();
  const v = visible();
  label.textContent = `${v.join('–')} / ${N}`;
  slider.value = pageNow();
  $$('button', grid).forEach(b => b.classList.toggle('on', v.includes(+b.dataset.p)));
  ensure();
  if (inited) { store.set(KEY, pageNow()); history.replaceState(null, '', '#p=' + pageNow()); }
};

const swish = () => navigator.vibrate?.(8); // a light buzz on phones

const settle = el => { el.style.zIndex = leaves + 1; setTimeout(() => { el.classList.remove('turning', 'settling'); render(); }, 650); };

const go = d => {
  const t = clamp(f + d, 0, lastF());
  if (t === f) return;
  const el = leafEls()[d > 0 ? f : t];
  el.classList.add('turning');
  f = t; render(); swish(); settle(el);
};

// jump without animating every page in between
const jump = p => {
  p = clamp(p, 1, N);
  book.classList.add('jumping');
  f = Math.min(single ? p - 1 : Math.floor(p / 2), lastF());
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => book.classList.remove('jumping')));
};

const setup = () => {
  // one page at a time on phones and in portrait, a two-page spread when there is room
  const s = stage.clientWidth < 700 || stage.clientWidth < stage.clientHeight;
  if (s !== single) {
    const page = single === undefined ? 0 : single ? f : f * 2; // keep the reader on the same page when the layout switches
    single = s; build();
    f = single ? Math.min(page, leaves - 1) : Math.ceil(page / 2);
  }
  size(); render();
  if (!inited) {
    inited = true;
    const h = /#p=(\d+)/.exec(location.hash);
    jump(h ? +h[1] : +store.get(KEY) || 1);
  }
};

// the first page decides the aspect ratio, so any page size works
const probe = new Image();
probe.onload = () => { if (probe.naturalWidth) ratio = probe.naturalWidth / probe.naturalHeight; grid.style.setProperty('--ratio', ratio); setup(); };
probe.onerror = setup;
probe.src = pageSrc(mag, 1);

const setZoom = z => {
  const was = zoom;
  zoom = clamp(z, 1, 3);
  stage.classList.toggle('zoomed', zoom > 1);
  size();
  if (was === 1 && zoom > 1) { stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2; stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2; }
  if (zoom === 1) { stage.scrollLeft = 0; stage.scrollTop = 0; }
};

// pointer handling: drag a page and it follows the finger, tap an edge to turn, pinch or double-tap to zoom
const ptrs = new Map();
let drag = null, pinch = null, lastTap = 0;
stage.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; drag = null; return; }
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: stage.scrollLeft, sy: stage.scrollTop, t: Date.now(), moved: false, leaf: null, dir: 0, p: 0 };
});
stage.addEventListener('pointermove', e => {
  const q = ptrs.get(e.pointerId);
  if (q) { q.x = e.clientX; q.y = e.clientY; }
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; setZoom(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); return; }
  if (!drag || e.pointerId !== drag.id || drag.dead) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (zoom > 1) { // pan the zoomed page (touch pans natively)
    if (e.pointerType === 'mouse' && e.buttons) { stage.scrollLeft = drag.sx - dx; stage.scrollTop = drag.sy - dy; }
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    return;
  }
  if (!drag.leaf) {
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
    drag.moved = true;
    const dir = dx < 0 ? 1 : -1, r = book.getBoundingClientRect(), idx = dir > 0 ? f : f - 1;
    const okSide = single || (dir > 0) === (drag.x > r.left + r.width / 2); // in a spread, grab the page you want to turn
    if (!okSide || idx < 0 || idx >= (single && dir > 0 ? leaves - 1 : leaves)) { drag.dead = true; return; }
    drag.dir = dir; drag.leaf = leafEls()[idx];
    drag.leaf.classList.add('dragging');
    drag.leaf.style.zIndex = leaves + 1;
    stage.setPointerCapture(e.pointerId);
  }
  const pageW = book.getBoundingClientRect().width / (single ? 1 : 2);
  drag.p = clamp(Math.abs(dx) / (pageW * (single ? 1 : 1.4)), 0, 1);
  const angle = drag.dir > 0 ? -180 * drag.p : -180 * (1 - drag.p);
  drag.leaf.style.transform = `rotateY(${angle}deg)`;
  drag.leaf.style.setProperty('--shade', (Math.sin(Math.PI * drag.p) * 0.6).toFixed(3));
});
const end = e => {
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (d.leaf) {
    const el = d.leaf, commit = e.type === 'pointerup' && (d.p > 0.25 || (Date.now() - d.t < 300 && d.p > 0.06));
    el.classList.remove('dragging'); el.classList.add('settling');
    el.style.transform = ''; el.style.removeProperty('--shade'); // the CSS transition now carries it from where the finger let go
    if (commit) { f = clamp(f + d.dir, 0, lastF()); swish(); }
    render(); settle(el);
    return;
  }
  if (d.moved || d.dead || e.type !== 'pointerup') return;
  const r = book.getBoundingClientRect(), s = stage.getBoundingClientRect(), rel = (e.clientX - s.left) / s.width;
  if (zoom > 1) { if (Date.now() - lastTap < 300) setZoom(1); lastTap = Date.now(); return; }
  if (!single) { if (e.target.closest('.face')) go(e.clientX < r.left + r.width / 2 ? -1 : 1); return; }
  if (rel < 0.3) go(-1);
  else if (rel > 0.7) go(1);
  else { if (Date.now() - lastTap < 300) setZoom(2); lastTap = Date.now(); }
};
stage.addEventListener('pointerup', end);
stage.addEventListener('pointercancel', end);

prevB.onclick = () => go(-1);
nextB.onclick = () => go(1);
slider.oninput = () => jump(+slider.value);
addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') go(1);
  else if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'Home') jump(1);
  else if (e.key === 'End') jump(N);
  else if (e.key === '+' || e.key === '=') setZoom(zoom + 0.25);
  else if (e.key === '-') setZoom(zoom - 0.25);
  else if (e.key === 'Escape' && !thumbs.hidden) thumbs.hidden = true;
});
$('#flip-zin').onclick = () => setZoom(zoom + 0.5);
$('#flip-zout').onclick = () => setZoom(zoom - 0.5);
$('#flip-full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('#flip').requestFullscreen?.());
$('#flip-share').onclick = async e => {
  const b = e.currentTarget;
  if (navigator.share) { try { await navigator.share({ title: mag.title, url: location.href }); } catch {} return; }
  try { await navigator.clipboard.writeText(location.href); b.setAttribute('aria-label', 'Link copied'); b.classList.add('done'); setTimeout(() => { b.setAttribute('aria-label', 'Share'); b.classList.remove('done'); }, 1800); } catch {}
};

// thumbnails
$('#flip-pages').onclick = () => {
  if (!grid.children.length) {
    grid.innerHTML = Array.from({ length: N }, (_, i) => `<button data-p="${i + 1}" aria-label="Go to page ${i + 1}"><img src="${pageSrc(mag, i + 1)}" alt="" loading="lazy"><span>${i + 1}</span></button>`).join('');
    render();
  }
  thumbs.hidden = false;
  $('.on', grid)?.scrollIntoView({ block: 'center' });
};
$('#flip-thumbs-close').onclick = () => { thumbs.hidden = true; };
grid.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { jump(+b.dataset.p); thumbs.hidden = true; } });

addEventListener('resize', setup);
document.addEventListener('fullscreenchange', () => setTimeout(setup, 100));
})();
