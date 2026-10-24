const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// mobile menu: full-screen panel, hamburger turns into a cross, page scroll locked while open
const btn = $('.menu-btn'), links = $('.links');
const setMenu = open => {
  links.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.documentElement.classList.toggle('menu-open', open);
};
const closeMenu = () => setMenu(false);
btn.setAttribute('aria-label', 'Open menu');
btn.addEventListener('click', () => setMenu(!links.classList.contains('open')));
links.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && links.classList.contains('open')) { closeMenu(); btn.focus(); } });
addEventListener('resize', () => { if (innerWidth > 980) closeMenu(); });

// load + reveal animations
document.documentElement.classList.add('js');
const loader = $('#loader');
const start = () => { loader.classList.add('done'); document.body.classList.add('ready'); };
// the logo draws itself on the first visit of a session; later pages only flash the loader
let first = true;
try { first = !sessionStorage.getItem('seen'); sessionStorage.setItem('seen', '1'); } catch {}
const minShow = first && !reduceMotion ? 2300 : 250;
addEventListener('load', () => setTimeout(start, Math.max(250, minShow - performance.now())));
setTimeout(start, 4500); // fallback if load stalls

if ($('.hero')) {
// hero slideshow: auto-advances, but can be paused (WCAG 2.2.2) and stays still for reduced-motion users
const heads = $$('.hs'), media = $$('.hm'), dots = $$('#dots button:not(.pause)'), no = $('#hero-no');
const pauseBtn = $('#pause');
let hi = 0, timer = null, paused = reduceMotion;
const show = i => {
  hi = (i + heads.length) % heads.length;
  heads.forEach((el, k) => { el.classList.toggle('active', k === hi); el.setAttribute('aria-hidden', k === hi ? 'false' : 'true'); });
  media.forEach((el, k) => el.classList.toggle('active', k === hi));
  dots.forEach((d, k) => { d.classList.toggle('on', k === hi); d.toggleAttribute('aria-current', k === hi); });
  no.textContent = String(hi + 1).padStart(2, '0');
};
const auto = () => { clearInterval(timer); if (!paused) timer = setInterval(() => show(hi + 1), 6000); };
const setPaused = p => {
  paused = p;
  pauseBtn.setAttribute('aria-pressed', String(p));
  pauseBtn.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
  pauseBtn.classList.toggle('is-paused', p);
  auto();
};
dots.forEach((d, k) => d.addEventListener('click', () => { show(k); auto(); }));
pauseBtn.addEventListener('click', () => setPaused(!paused));
$('.hero').addEventListener('mouseenter', () => clearInterval(timer));
$('.hero').addEventListener('mouseleave', auto);
$('.hero').addEventListener('focusin', () => clearInterval(timer));
show(0);
setPaused(reduceMotion);
}

// active nav link while scrolling (follows page order)
const navLinks = $$('.links > a[href^="#"]:not(.pill), .links .dd-t');
const secs = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
addEventListener('scroll', () => {
  const y = scrollY + 120;
  let cur = null, best = -1;
  secs.forEach(s => { if (s.offsetTop <= y && s.offsetTop > best) { best = s.offsetTop; cur = s.id; } });
  navLinks.forEach(a => {
    const on = cur ? a.getAttribute('href') === '#' + cur : a.getAttribute('href') === '#top';
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
}, { passive: true });

// animated counters
const fmt = (n, el) => el.hasAttribute('data-plain') ? String(n) : n.toLocaleString('en-US');
const run = el => {
  const end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
  if (reduceMotion) { el.textContent = fmt(end, el) + suf; return; }
  const step = t => {
    const p = Math.min((t - t0) / 1400, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(end * e), el) + (p === 1 ? suf : '');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const counters = $$('[data-count]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }), { threshold: .6 });
  counters.forEach(c => io.observe(c));
}

// gallery: add photos to assets/gallery/ and list them here
const projects = [
  { file: 'district-orientation.jpg', title: 'Leo District 306 D8 · District Orientation' },
  { file: 'orientation-group-1.jpg', title: 'District Orientation · Group photo' },
  { file: 'orientation-group-2.jpg', title: 'District Orientation · Our members' },
  // { file: 'beach-cleanup.jpg', title: 'Beach clean-up' },
];
const gallery = $('#gallery');
const slots = gallery ? Math.max(projects.length, 6) : 0;
for (let i = 0; i < slots; i++) {
  const p = projects[i], fig = document.createElement('figure');
  if (p) {
    fig.innerHTML = `<img src="assets/gallery/${p.file}" alt="${p.title}" loading="lazy" decoding="async"><figcaption>${p.title}</figcaption>`;
  } else {
    fig.className = 'empty';
    fig.innerHTML = '<figcaption>More project photos coming soon</figcaption>';
  }
  gallery.appendChild(fig);
}

// scroll reveal
const reveals = $$('[data-reveal]');
reveals.forEach(sec => $$('.pillar-list article,.cards article,.timeline li,.gallery figure,.chips li,.stats div', sec)
  .forEach((el, i) => el.style.setProperty('--i', i % 6)));
if ('IntersectionObserver' in window) {
  const ro = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
  }), { threshold: .12 });
  reveals.forEach(r => ro.observe(r));
} else reveals.forEach(r => r.classList.add('in'));

// sticky "Become a Leo" bar on phones: appears once you have scrolled past the first screen
const sticky = $('#sticky-cta');
if (sticky) {
  const upd = () => sticky.classList.toggle('show', scrollY > 520);
  addEventListener('scroll', upd, { passive: true });
  upd();
}

// theme toggle (remembered per visitor)
const themeBtn = $('#theme');
const syncTheme = () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
};
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncTheme();
});
syncTheme();

// join form: sends by email if CLUB_EMAIL is set, otherwise copies the details and opens the club's Instagram inbox
const CLUB_EMAIL = '';
const IG_DM = 'https://ig.me/m/leos.of.matara.excellence';
if ($('#join-form')) $('#join-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target), status = $('#form-status');
  const body = [
    'Join request: Leo Club of Matara Excellence',
    `Name: ${f.get('name')}`, `Age: ${f.get('age')}`, `Phone: ${f.get('phone')}`,
    `School/Workplace: ${f.get('org')}`, `Interests: ${f.getAll('int').join(', ') || '-'}`,
    `Why join: ${f.get('why') || '-'}`
  ].join('\n');
  if (CLUB_EMAIL) {
    location.href = `mailto:${CLUB_EMAIL}?subject=${encodeURIComponent('Join Leo Club of Matara Excellence')}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Opening your email app…';
    return;
  }
  let copied = false;
  try { await navigator.clipboard.writeText(body); copied = true; } catch (err) {}
  status.textContent = copied
    ? 'Details copied. Paste them into the Instagram message that just opened.'
    : 'Instagram is opening. Please type your name, age and phone number in the message.';
  window.open(IG_DM, '_blank', 'noopener');
});


// L / E / O panels: hover or tap to open one at a time
const leoPanels = $$('.leo-panel');
if (leoPanels.length) {
  const openPanel = p => leoPanels.forEach(q => {
    const on = q === p;
    q.classList.toggle('is-open', on);
    $('.leo-tab', q).setAttribute('aria-expanded', String(on));
  });
  const canHover = matchMedia('(hover: hover)').matches;
  leoPanels.forEach(p => {
    $('.leo-tab', p).addEventListener('click', () => openPanel(p));
    if (canHover) p.addEventListener('mouseenter', () => openPanel(p));
  });
}

// causes page: show all causes or only the Lions global ones
const causeBtns = $$('.cause-filter button');
causeBtns.forEach(b => b.addEventListener('click', () => {
  causeBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  $$('.cause-card').forEach(c => { c.hidden = b.dataset.f === 'global' && !c.dataset.global; });
}));
