// Renders the team cards from team-data.js into #exec-grid (home and About pages), #board-grid, #directors-grid and #members-list (members.html)
(function () {
  const T = window.TEAM || { exec: [], board: [], directors: [] };
  const person = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c.6-4.2 3.9-6.5 8-6.5s7.4 2.3 8 6.5"/></svg>';

  function card(p, href) {
    const a = document.createElement('article');
    a.className = 'tcard';
    const av = document.createElement('div');
    av.className = 'tavatar' + (p.cutout ? ' cutout' : '');
    if (p.photo) {
      const img = new Image();
      img.src = p.photo;
      img.alt = p.name ? `${p.title === undefined ? 'Leo' : p.title} ${p.name}, ${p.role}`.replace(/^ /, '') : p.role;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 128;
      img.height = 128;
      img.onerror = () => { av.classList.add('empty'); av.innerHTML = person; };
      av.appendChild(img);
    } else {
      av.classList.add('empty');
      av.innerHTML = person;
    }
    const h = document.createElement('h3');
    if (p.name) {
      const title = p.title === undefined ? 'Leo' : p.title;
      h.textContent = (title ? title + ' ' : '') + p.name;
    } else {
      h.textContent = 'To be announced';
      h.className = 'tba';
    }
    if (href) {
      const l = document.createElement('a');
      l.href = href;
      l.textContent = h.textContent;
      h.textContent = '';
      h.appendChild(l);
      a.classList.add('link');
    }
    const r = document.createElement('p');
    r.textContent = p.role || '';
    a.append(av, h, r);
    return a;
  }

  function fill(id, list, emptyMsg, home) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '';
      const m = document.createElement('p');
      m.className = 'team-empty';
      m.textContent = emptyMsg;
      el.appendChild(m);
      return;
    }
    list.forEach(p => el.appendChild(card(p, home ? 'members.html' : p.href)));
  }

  fill('exec-grid', T.exec, 'The officers will be announced soon.', true);
  fill('board-grid', T.board || [], 'The Executive Board will be announced soon.');
  fill('directors-grid', T.directors || [], 'The Board of Directors will be announced soon.');

  const ml = document.getElementById('members-list');
  if (ml) (T.members || []).forEach(n => { const li = document.createElement('li'); li.textContent = 'Leo ' + n; ml.appendChild(li); });

  const c = document.getElementById('member-count');
  const total = (T.board || []).length + (T.directors || []).length + (T.members || []).length;
  if (c) c.textContent = total ? `${total} people listed.` : '';
})();
