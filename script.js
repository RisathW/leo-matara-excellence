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
// first visit: one full draw-and-erase of the line-art logo (about 3.6s). later pages: a shorter splash (about 1.6s)
const minShow = reduceMotion ? 400 : first ? 3600 : 1600;
addEventListener('load', () => setTimeout(start, Math.max(250, minShow - performance.now())));
setTimeout(start, minShow + 3000); // fallback if load stalls

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
  if (no) no.textContent = String(hi + 1).padStart(2, '0');
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
  { file: 'abhivandana-amadam-team.jpg', title: 'Leo Abhivandana & Amadam Sisila · Our team' },
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

// join form: specific inline error messages
const validateJoin = form => {
  $$('.field-error', form).forEach(n => n.remove());
  let first = null;
  const fail = (input, msg) => {
    input.setAttribute('aria-invalid', 'true');
    const p = document.createElement('span');
    p.className = 'field-error';
    p.textContent = msg;
    input.closest('label').appendChild(p);
    if (!first) first = input;
  };
  const rules = [
    ['name', v => v.trim().length >= 2, 'Enter your full name.'],
    ['age', v => /^\d+$/.test(v) && +v >= 12 && +v <= 30, 'Enter an age between 12 and 30.'],
    ['email', v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), 'Enter a valid email address, for example name@gmail.com.'],
    ['phone', v => /^[0-9+ \-]{9,20}$/.test(v.trim()), 'Enter a phone number with 9 to 20 digits, for example 0771234567.']
  ];
  rules.forEach(([n, ok, msg]) => {
    const i = form.elements[n];
    i.removeAttribute('aria-invalid');
    if (!ok(i.value)) fail(i, msg);
  });
  if (first) first.focus();
  return !first;
};
$$('#join-form input').forEach(i => i.addEventListener('input', () => {
  i.removeAttribute('aria-invalid');
  const er = i.closest('label') && i.closest('label').querySelector('.field-error');
  if (er) er.remove();
}));

// join form: sends the application to the club through Web3Forms, then a confirmation email through EmailJS
const WEB3FORMS_KEY = 'aee02c62-6e71-45fc-b266-5611b861f6c3';
const EMAILJS = { service: 'service_e4dbg5t', template: 'template_djm2ta7', key: 'VbvrgfEaA8sxlCwAsIoJA' };
const THANKS = 'Thank you for applying. We will review your application and look forward to meeting you.';
if ($('#join-form')) $('#join-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateJoin(e.target)) return;
  const f = new FormData(e.target), status = $('#form-status');
  const btn = e.target.querySelector('button[type=submit]');
  if (btn.disabled) return;
  btn.disabled = true;
  status.textContent = 'Sending your application…';
  const interests = f.getAll('int').join(', ') || '-';
  try {
    if (f.get('botcheck')) throw new Error('spam');
    if (!f.get('h-captcha-response')) throw new Error('captcha');
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: 'New Leo application: ' + f.get('name'),
        from_name: 'Leo Club of Matara Excellence website',
        replyto: f.get('email'),
        'h-captcha-response': f.get('h-captcha-response'),
        name: f.get('name'), age: f.get('age'), phone: f.get('phone'), email: f.get('email'),
        school_or_workplace: f.get('org') || '-', interests, why_join: f.get('why') || '-'
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'failed');
    // confirmation email to the applicant (the application itself is already sent)
    let mailOk = false, mailWhy = '';
    try {
      const mr = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS.service, template_id: EMAILJS.template, user_id: EMAILJS.key,
          template_params: { to_email: f.get('email'), email: f.get('email'), first_name: String(f.get('name')).trim().split(/\s+/)[0], name: f.get('name') }
        })
      });
      mailOk = mr.ok;
      if (!mr.ok) mailWhy = (await mr.text()).slice(0, 160);
    } catch (er) { mailWhy = String(er && er.message || er); }
    if (!mailOk) console.error('Confirmation email failed:', mailWhy);
    e.target.reset();
    status.textContent = THANKS + (mailOk
      ? ' We have sent a confirmation to your email. We will be in touch soon.'
      : ' We could not send a confirmation email' + (mailWhy ? ' (' + mailWhy + ')' : '') + ', but your application has reached us and we will be in touch soon.');
    if (window.hcaptcha) try { window.hcaptcha.reset(); } catch (er) {}
    btn.disabled = false;
  } catch (err) {
    console.error('Application send failed:', err);
    const msg = err && err.message;
    status.textContent = msg === 'captcha'
      ? 'Please tick the "I am human" box before sending.'
      : 'We could not send your application. ' + (msg && !['failed', 'spam'].includes(msg) ? '(' + msg + ') ' : '') + 'Please check your connection and try again.';
    if (window.hcaptcha) try { window.hcaptcha.reset(); } catch (er) {}
    btn.disabled = false;
  }
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

// accent words (<em> in titles): small only when they wrap onto their own line
(() => {
  const ems = $$('h1 em, h2 em, .h1 em');
  const fit = () => ems.forEach(em => {
    em.classList.remove('wrapped');
    const rects = em.getClientRects();
    const heading = em.parentElement;
    const lh = parseFloat(getComputedStyle(heading).lineHeight) || em.getBoundingClientRect().height;
    if (rects.length && rects[0].top - heading.getBoundingClientRect().top > lh * 0.6) em.classList.add('wrapped');
  });
  fit();
  addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();


// tagline reveal: words move from muted to full colour one at a time as they cross a trigger line
(() => {
  const t = $('[data-words]');
  if (!t) return;
  const words = t.textContent.trim().split(/\s+/);
  t.textContent = '';
  const spans = words.map(w => {
    const s = document.createElement('span');
    s.className = 'tw';
    s.textContent = w;
    t.append(s, ' ');
    return s;
  });
  if (reduceMotion) { spans.forEach(s => s.classList.add('on')); return; }
  let queued = false;
  const update = () => {
    queued = false;
    const line = innerHeight * 0.78;
    spans.forEach(s => s.classList.toggle('on', s.getBoundingClientRect().top < line));
  };
  const req = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();
})();
