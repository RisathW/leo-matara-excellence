// Club awards (Leo of the Month, Leo of the Year and others), announced by officers in the member portal.
// Read straight from the public "awards" list in Firebase; the sections stay hidden if there are none.
(() => {
  const spot = document.getElementById('aw-spot');
  if (!spot) return;
  const sec = spot.closest('section');
  const list = document.getElementById('aw-list');
  const URL = 'https://firestore.googleapis.com/v1/projects/leo-matara-excellence/databases/(default)/documents/awards?pageSize=300&key=AIzaSyCx27SEgEUk3A_h83XOo0QXi4zqf4nZR_8';
  const NAMES = { month: 'Leo of the Month', year: 'Leo of the Year', director: 'Outstanding Director of the Year', exco: 'Outstanding Executive Member of the Year', special: 'Special Recognition' };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const ly = y => `${y}/${String((Number(y) + 1) % 100).padStart(2, '0')}`;
  const label = a => a.type === 'month' ? `${NAMES.month}, ${MONTHS[Number(a.period.slice(5, 7)) - 1]} ${a.period.slice(0, 4)}` : `${NAMES[a.type]} ${ly(a.period)}`;
  const key = a => a.type === 'month' ? a.period : `${Number(a.period) + 1}-06`;
  const norm = s => (s || '').toLowerCase().replace(/[^a-z]/g, '');
  // use the club's own portrait from the Team page when there is one
  const team = window.TEAM ? [...(TEAM.exec || []), ...(TEAM.board || []), ...(TEAM.directors || [])] : [];
  const photoOf = a => (team.find(t => t.photo && norm(t.name) === norm(a.name)) || {}).photo || a.photo || '';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const face = a => {
    const src = photoOf(a);
    if (!src) return el('span', 'aw-face aw-face-i', (a.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase());
    const img = el('img', 'aw-face'); img.src = src; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    return img;
  };
  fetch(URL).then(r => r.ok ? r.json() : { documents: [] }).then(j => {
    const all = (j.documents || []).map(d => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, v.stringValue ?? v.integerValue ?? ''])))
      .filter(a => NAMES[a.type] && /^\d{4}(-\d{2})?$/.test(a.period || '') && a.name)
      .sort((x, y) => key(y).localeCompare(key(x)) || (x.type === 'year' ? -1 : 1));
    if (!all.length) return;
    const none = document.getElementById('aw-none'), allH = document.getElementById('aw-all-h');
    if (none) none.hidden = true;
    if (allH) allH.hidden = false;
    const lead = [all.find(a => a.type === 'month'), all.find(a => a.type === 'year')].filter(Boolean);
    spot.replaceChildren(...lead.map(a => {
      const card = el('article', 'aw-card');
      const t = el('div', 'aw-t');
      t.append(el('p', 'aw-what', label(a)), el('h3', null, a.name));
      if (a.position) t.append(el('p', 'aw-pos', a.position));
      if (a.citation) t.append(el('p', 'aw-cite', a.citation));
      card.append(face(a), t);
      return card;
    }));
    if (list) list.replaceChildren(...all.map(a => {
      const li = el('li');
      li.append(face(a));
      const t = el('div'); t.append(el('b', null, a.name), el('span', null, label(a)));
      li.append(t);
      return li;
    }));
    sec.hidden = false;
  }).catch(() => {});
})();
