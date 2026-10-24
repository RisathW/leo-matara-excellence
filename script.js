const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// mobile menu
const btn = $('.menu-btn'), links = $('.links');
const closeMenu = () => { links.classList.remove('open'); btn.setAttribute('aria-expanded', false); };
btn.addEventListener('click', () => btn.setAttribute('aria-expanded', links.classList.toggle('open')));
links.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });

// load + reveal animations
document.documentElement.classList.add('js');
const loader = $('#loader');
const start = () => { loader.classList.add('done'); document.body.classList.add('ready'); };
window.addEventListener('load', () => setTimeout(start, 600));
setTimeout(start, 3000); // fallback if load stalls

// hero slideshow
const heads = $$('.hs'), media = $$('.hm'), dots = $$('#dots button'), no = $('#hero-no');
let hi = 0, timer;
const show = i => {
  hi = (i + heads.length) % heads.length;
  [heads, media].forEach(g => g.forEach((el, k) => el.classList.toggle('active', k === hi)));
  dots.forEach((d, k) => d.classList.toggle('on', k === hi));
  no.textContent = String(hi + 1).padStart(2, '0');
};
const auto = () => { clearInterval(timer); timer = setInterval(() => show(hi + 1), 6000); };
dots.forEach((d, k) => d.addEventListener('click', () => { show(k); auto(); }));
auto();

// active nav link while scrolling
const navLinks = $$('.links > a[href^="#"]:not(.pill), .links .dd-t');
const secs = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
addEventListener('scroll', () => {
  const y = scrollY + 120;
  let cur = null;
  let best = -1;
  secs.forEach(s => { if (s.offsetTop <= y && s.offsetTop > best) { best = s.offsetTop; cur = s.id; } });
  navLinks.forEach(a => a.classList.toggle('active',
    cur ? a.getAttribute('href') === '#' + cur : a.getAttribute('href') === '#top'));
}, { passive: true });

// animated counters
const fmt = (n, el) => el.hasAttribute('data-plain') ? String(n) : n.toLocaleString('en-US');
const run = el => {
  const end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
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
const slots = Math.max(projects.length, 6);
for (let i = 0; i < slots; i++) {
  const p = projects[i], fig = document.createElement('figure');
  if (p) {
    fig.innerHTML = `<img src="assets/gallery/${p.file}" alt="${p.title}" loading="lazy"><figcaption>${p.title}</figcaption>`;
  } else {
    fig.className = 'empty';
    fig.innerHTML = '<figcaption>Project photo coming soon</figcaption>';
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

// testimonials
const slides = $$('.slide');
let cur = 0;
$('.slider-ctrl').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  slides[cur].classList.remove('active');
  cur = (cur + +b.dataset.dir + slides.length) % slides.length;
  slides[cur].classList.add('active');
});

// join form -> email draft (set the club address here)
const CLUB_EMAIL = 'hello@example.com';
$('#join-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = [
    `Name: ${f.get('name')}`, `Age: ${f.get('age')}`, `Phone: ${f.get('phone')}`,
    `School/Workplace: ${f.get('org')}`, `Interests: ${f.getAll('int').join(', ')}`,
    `Why join: ${f.get('why')}`
  ].join('\n');
  location.href = `mailto:${CLUB_EMAIL}?subject=${encodeURIComponent('Join Leo Club of Matara Excellence')}&body=${encodeURIComponent(body)}`;
});

// theme toggle (remembered per visitor)
$('#theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});
