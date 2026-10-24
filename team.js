// Renders the team cards from team-data.js into #exec-grid (home page), #all-exec-grid and #members-grid (members.html)
(function () {
  const T = window.TEAM || { exec: [], members: [] };
  const person = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c.6-4.2 3.9-6.5 8-6.5s7.4 2.3 8 6.5"/></svg>';

  function card(p) {
    const a = document.createElement('article');
    a.className = 'tcard';
    const av = document.createElement('div');
    av.className = 'tavatar' + (p.cutout ? ' cutout' : '');
    if (p.photo) {
      const img = new Image();
      img.src = p.photo;
      img.alt = p.name ? `${p.name}, ${p.role}` : p.role;
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
      h.textContent = (p.title ? p.title + ' ' : '') + p.name;
    } else {
      h.textContent = 'To be announced';
      h.className = 'tba';
    }
    const r = document.createElement('p');
    r.textContent = p.role || '';
    a.append(av, h, r);
    return a;
  }

  function fill(id, list, emptyMsg) {
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
    list.forEach(p => el.appendChild(card(p)));
  }

  fill('exec-grid', T.exec, 'The officers will be announced soon.');
  fill('all-exec-grid', [...T.exec, ...(T.moreExec || [])], 'The executive committee will be announced soon.');
  fill('members-grid', T.members, 'Our full member list is coming soon.');

  const c = document.getElementById('member-count');
  const total = (T.exec || []).length + (T.moreExec || []).length + T.members.length;
  if (c) c.textContent = total ? `${total} people listed.` : '';
})();
