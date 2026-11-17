// Member portal: Google sign-in, profiles, member list and officer tools.
// Data lives in Firebase (Firestore). What each person may read or change is enforced
// by the security rules in Firebase, not by this file.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// The web config identifies the project. It is not a secret; access is controlled by the rules.
const app = initializeApp({
  apiKey: 'AIzaSyCx27SEgEUk3A_h83XOo0QXi4zqf4nZR_8',
  authDomain: 'leo-matara-excellence.firebaseapp.com',
  projectId: 'leo-matara-excellence',
  storageBucket: 'leo-matara-excellence.firebasestorage.app',
  messagingSenderId: '320567574376',
  appId: '1:320567574376:web:1397fc1f94161a842b20dd'
});
const auth = getAuth(app);
const db = getFirestore(app);

// The club account can always manage the portal, so the first officers can be approved.
const CLUB_EMAIL = 'leoclubofmataraexcellence@gmail.com';
const ROLES = { member: 'Member', director: 'Director', exco: 'Executive Committee', secretary: 'Secretary', president: 'President', admin: 'Portal admin' };
const OFFICER_ROLES = ['secretary', 'president', 'admin'];

const $ = s => document.querySelector(s);
// build elements with text only, so nothing a member types is ever read as HTML
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => c != null && n.append(c));
  return n;
};
const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const avatar = (m, cls = 'pt-av') => m.photo
  ? el('img', { class: cls, src: m.photo, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' })
  : el('span', { class: cls + ' pt-av-i', 'aria-hidden': 'true', text: initials(m.name) });
const say = (node, msg, bad = false) => { node.textContent = msg; node.classList.toggle('bad', bad); };

const views = ['pt-loading', 'pt-out', 'pt-pending', 'pt-app'];
const show = id => views.forEach(v => { $('#' + v).hidden = v !== id; });

let me = null, user = null, officer = false;

// plain-language reasons for sign-in problems; the code is shown too so it can be looked up
const AUTH_WHY = {
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/popup-closed-by-user': 'The Google window closed before sign-in finished. If you did not close it, your browser may be blocking third-party cookies for this site; allow them, or try another browser.',
  'auth/cancelled-popup-request': 'Another sign-in window was already open. Please try again.',
  'auth/unauthorized-domain': 'This web address is not allowed to sign in yet. The website admin must add it in Firebase.',
  'auth/network-request-failed': 'No internet connection, or the connection was blocked. Please try again.',
  'auth/web-storage-unsupported': 'This browser is blocking storage the sign-in needs. Allow cookies for this site or use another browser.',
  'auth/internal-error': 'Google sign-in had a problem. Please try again in a minute.'
};
const authFail = e => {
  console.error(e);
  say($('#pt-out-msg'), `${AUTH_WHY[e.code] || 'Sign-in did not work. Please try again.'} (${e.code || e.message})`, true);
};
// finish a sign-in that went through a full-page redirect
getRedirectResult(auth).catch(authFail);

$('#pt-signin').addEventListener('click', async () => {
  say($('#pt-out-msg'), '');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    // phones without pop-up support: go to Google and come back
    if (e.code === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, provider).catch(authFail);
    authFail(e);
  }
});
document.querySelectorAll('.pt-signout').forEach(b => b.addEventListener('click', () => signOut(auth)));

onAuthStateChanged(auth, async u => {
  user = u;
  if (!u) { me = null; show('pt-out'); return; }
  show('pt-loading');
  try {
    const ref = doc(db, 'members', u.uid);
    // people the officers listed in advance get their role and position straight away
    const email = (u.email || '').toLowerCase();
    const rs = email && u.emailVerified ? await getDoc(doc(db, 'roster', email)).catch(() => null) : null;
    const r = rs && rs.exists() ? rs.data() : null;
    let snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: ((r && r.name) || u.displayName || '').slice(0, 80), photo: u.photoURL || '',
        status: r ? 'approved' : 'pending', role: r ? r.role : 'member', position: r ? r.position : '',
        bio: '', school: '', createdAt: serverTimestamp(), ...(r ? { joined: serverTimestamp() } : {}),
        stats: { projects: 0, hours: 0, points: 0 }, awards: []
      });
      await setDoc(doc(db, 'contacts', u.uid), { email: u.email || '' });
      snap = await getDoc(ref);
    } else if (r && snap.data().status === 'pending') {
      await updateDoc(ref, { status: 'approved', role: r.role, position: r.position, name: (r.name || snap.data().name).slice(0, 80), joined: serverTimestamp() });
      snap = await getDoc(ref);
    }
    me = { id: u.uid, ...snap.data() };
    officer = (u.email === CLUB_EMAIL && u.emailVerified) || (me.status === 'approved' && OFFICER_ROLES.includes(me.role));
    if (me.status !== 'approved' && !officer) {
      $('#pt-pending-name').textContent = me.name || 'there';
      show('pt-pending');
      return;
    }
    renderApp();
  } catch (e) {
    console.error(e);
    show('pt-out');
    const why = e.code === 'permission-denied' ? ' (the database rules blocked it)'
      : e.code === 'unavailable' ? ' (no connection to the database)' : e.code ? ` (${e.code})` : '';
    say($('#pt-out-msg'), `The portal could not load your account${why}. Please try again later.`, true);
  }
});

// ---------- signed-in app ----------
const tabs = () => [...document.querySelectorAll('.pt-tab')];
tabs().forEach(t => t.addEventListener('click', () => openTab(t.dataset.tab)));
function openTab(name) {
  tabs().forEach(t => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  document.querySelectorAll('.pt-panel').forEach(p => { p.hidden = p.id !== 'pt-' + name; });
  if (name === 'members') loadMembers();
  if (name === 'manage') { loadManage(); loadRoster(); }
}
// arrow keys move between tabs
$('.pt-tabs').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const vis = tabs().filter(t => !t.hidden), i = vis.indexOf(document.activeElement);
  if (i < 0) return;
  const n = vis[(i + (e.key === 'ArrowRight' ? 1 : vis.length - 1)) % vis.length];
  n.focus(); openTab(n.dataset.tab);
});

function renderApp() {
  show('pt-app');
  $('#pt-who').textContent = me.name || user.email;
  $('#pt-manage-tab').hidden = !officer;
  renderProfile($('#pt-card'), me, true);
  const f = $('#pt-form');
  f.name.value = me.name || ''; f.school.value = me.school || ''; f.bio.value = me.bio || '';
  openTab('profile');
}

function renderProfile(box, m, mine = false) {
  const s = m.stats || {};
  const awards = m.awards || [];
  box.replaceChildren(
    el('div', { class: 'pt-banner' },
      el('img', { class: 'pt-banner-logo', src: 'assets/logo-sm-dark.png', alt: '' }),
      el('div', { class: 'pt-stats' },
        stat(s.projects || 0, 'Projects'), stat(s.hours || 0, 'Hours'), stat(s.points || 0, 'Points'), stat(awards.length, 'Awards'))),
    el('div', { class: 'pt-id' },
      avatar(m, 'pt-av pt-av-lg'),
      el('div', {},
        el('h2', { class: 'pt-name', text: m.name || 'New member' }),
        el('p', { class: 'pt-club', text: 'Leo Club of Matara Excellence' }),
        el('p', { class: 'pt-pos', text: [m.position, ROLES[m.role] && m.role !== 'member' ? ROLES[m.role] : (m.position ? '' : 'Member')].filter(Boolean).join(' · ') }),
        m.status !== 'approved' ? el('p', { class: 'pt-flag', text: 'Waiting for approval' }) : null)),
    m.school || m.bio ? el('div', { class: 'pt-about' },
      m.school ? el('p', {}, el('b', { text: 'School or workplace: ' }), m.school) : null,
      m.bio ? el('p', { text: m.bio }) : null) : null,
    awards.length ? el('ul', { class: 'pt-awards' }, awards.map(a => el('li', { text: a }))) : null
  );
  if (mine && !(s.projects || s.hours || s.points)) box.append(el('p', { class: 'small pt-note', text: 'Your projects, hours and points appear here once the Secretary records project attendance.' }));
}
const stat = (n, label) => el('div', { class: 'pt-stat' }, el('b', { text: String(n) }), el('span', { text: label }));

$('#pt-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, msg = $('#pt-form-msg');
  const data = { name: f.name.value.trim().slice(0, 80), school: f.school.value.trim().slice(0, 120), bio: f.bio.value.trim().slice(0, 400) };
  if (!data.name) { say(msg, 'Please type your name.', true); f.name.focus(); return; }
  try {
    await updateDoc(doc(db, 'members', me.id), data);
    Object.assign(me, data);
    renderProfile($('#pt-card'), me, true);
    $('#pt-who').textContent = me.name;
    say(msg, 'Saved.');
  } catch (err) { console.error(err); say(msg, 'Could not save. Please try again.', true); }
});

// ---------- members ----------
async function loadMembers() {
  const grid = $('#pt-grid');
  grid.replaceChildren(el('p', { class: 'small', text: 'Loading members…' }));
  try {
    const snap = await getDocs(query(collection(db, 'members'), where('status', '==', 'approved')));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => rank(b) - rank(a) || (a.name || '').localeCompare(b.name || ''));
    $('#pt-count').textContent = `${list.length} ${list.length === 1 ? 'member' : 'members'} in the portal`;
    grid.replaceChildren(...list.map(m => el('button', { class: 'pt-mcard', type: 'button', onclick: () => openMember(m) },
      avatar(m),
      el('b', { text: m.name || 'Member' }),
      el('span', { text: m.position || ROLES[m.role] || 'Member' }),
      el('small', { text: `${(m.stats || {}).projects || 0} projects · ${(m.stats || {}).points || 0} points` }))));
    if (!list.length) grid.replaceChildren(el('p', { class: 'small', text: 'No approved members yet.' }));
  } catch (e) { console.error(e); grid.replaceChildren(el('p', { class: 'small bad', text: 'Could not load the members.' })); }
}
const rank = m => ({ president: 5, secretary: 4, exco: 3, director: 2, admin: 1 })[m.role] || 0;

const dlg = $('#pt-dialog');
function openMember(m) {
  renderProfile($('#pt-dialog-body'), m);
  dlg.showModal();
}
$('#pt-dialog-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

// ---------- officer tools ----------
async function loadManage() {
  const pend = $('#pt-pend'), all = $('#pt-all');
  pend.replaceChildren(el('p', { class: 'small', text: 'Loading…' }));
  all.replaceChildren();
  try {
    const [p, a] = await Promise.all([
      getDocs(query(collection(db, 'members'), where('status', '==', 'pending'))),
      getDocs(query(collection(db, 'members'), where('status', '==', 'approved')))
    ]);
    const pending = p.docs.map(d => ({ id: d.id, ...d.data() }));
    const contacts = Object.fromEntries(await Promise.all(pending.map(async m => {
      const c = await getDoc(doc(db, 'contacts', m.id)).catch(() => null);
      return [m.id, c && c.exists() ? c.data().email : ''];
    })));
    $('#pt-pend-n').textContent = pending.length ? `(${pending.length})` : '';
    pend.replaceChildren(...(pending.length ? pending.map(m => el('div', { class: 'pt-row' },
      avatar(m),
      el('div', { class: 'pt-row-t' }, el('b', { text: m.name || 'No name' }), el('small', { text: contacts[m.id] || '' })),
      el('div', { class: 'pt-row-a' },
        el('button', { class: 'btn', type: 'button', text: 'Approve', onclick: e => act(e, () => updateDoc(doc(db, 'members', m.id), { status: 'approved', joined: serverTimestamp() })) }),
        el('button', { class: 'btn ghost', type: 'button', text: 'Decline', onclick: e => act(e, () => removeMember(m.id), `Decline ${m.name || 'this request'}?`) }))
    )) : [el('p', { class: 'small', text: 'No requests waiting.' })]));

    const members = a.docs.map(d => ({ id: d.id, ...d.data() })).sort((x, y) => rank(y) - rank(x) || (x.name || '').localeCompare(y.name || ''));
    all.replaceChildren(...members.map(m => {
      const role = el('select', { 'aria-label': `Role of ${m.name}` }, Object.entries(ROLES).map(([k, v]) => el('option', { value: k, text: v, selected: k === m.role })));
      const pos = el('input', { type: 'text', value: m.position || '', maxlength: '80', placeholder: 'Position, e.g. Treasurer', 'aria-label': `Position of ${m.name}` });
      return el('div', { class: 'pt-row' },
        avatar(m),
        el('div', { class: 'pt-row-t' }, el('b', { text: m.name || 'No name' }), el('small', { text: ROLES[m.role] || 'Member' })),
        el('div', { class: 'pt-row-a' }, role, pos,
          el('button', { class: 'btn', type: 'button', text: 'Save', onclick: e => act(e, () => updateDoc(doc(db, 'members', m.id), { role: role.value, position: pos.value.trim().slice(0, 80) })) }),
          m.id !== me.id ? el('button', { class: 'btn ghost', type: 'button', text: 'Remove', onclick: e => act(e, () => removeMember(m.id), `Remove ${m.name || 'this member'} from the portal?`) }) : null));
    }));
  } catch (e) { console.error(e); pend.replaceChildren(el('p', { class: 'small bad', text: 'Could not load. Only the Secretary, President and portal admins can open this tab.' })); }
}
// ---------- roster: people listed in advance by email ----------
const ROLE_WORDS = Object.fromEntries(Object.entries(ROLES).flatMap(([k, v]) => [[k, k], [v.toLowerCase(), k]]));
async function loadRoster() {
  const box = $('#pt-roster');
  try {
    const snap = await getDocs(collection(db, 'roster'));
    const list = snap.docs.map(d => ({ email: d.id, ...d.data() })).sort((a, b) => rank(b) - rank(a) || (a.name || '').localeCompare(b.name || ''));
    $('#pt-roster-n').textContent = list.length ? `(${list.length})` : '';
    box.replaceChildren(...(list.length ? list.map(x => el('div', { class: 'pt-row' },
      el('div', { class: 'pt-row-t' }, el('b', { text: x.name || x.email }), el('small', { text: `${x.position || ROLES[x.role] || ''} · ${x.email}` })),
      el('div', { class: 'pt-row-a' }, el('button', { class: 'btn ghost', type: 'button', text: 'Remove', onclick: e => act(e, () => deleteDoc(doc(db, 'roster', x.email)), `Remove ${x.name || x.email} from the roster?`) })))) : [el('p', { class: 'small', text: 'Nobody on the roster yet.' })]));
  } catch (e) { console.error(e); box.replaceChildren(el('p', { class: 'small bad', text: 'Could not load the roster.' })); }
}
$('#pt-roster-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, msg = $('#pt-roster-msg'), lines = f.list.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [], bad = [];
  for (const l of lines) {
    const [email, name, role, ...pos] = l.split(',').map(x => x.trim());
    const k = ROLE_WORDS[(role || 'member').toLowerCase()];
    if (!/^[^@\s]+@[^@\s]+\.[a-z]+$/i.test(email || '') || !name || !k) { bad.push(l); continue; }
    rows.push({ email: email.toLowerCase(), name: name.slice(0, 80), role: k, position: pos.join(', ').slice(0, 80) });
  }
  if (!rows.length) { say(msg, 'Nothing to add. Use one line per person: email, name, role, position', true); return; }
  const b = f.querySelector('button'); b.disabled = true; say(msg, `Adding ${rows.length}…`);
  try {
    for (const x of rows) await setDoc(doc(db, 'roster', x.email), { name: x.name, role: x.role, position: x.position });
    f.list.value = bad.join('\n');
    say(msg, `Added ${rows.length}.` + (bad.length ? ` ${bad.length} line(s) were not understood and are left in the box.` : ''), !!bad.length);
    loadRoster();
  } catch (err) { console.error(err); say(msg, 'Could not add. Only officers can change the roster.', true); }
  b.disabled = false;
});

const removeMember = async id => { await deleteDoc(doc(db, 'members', id)); await deleteDoc(doc(db, 'contacts', id)).catch(() => {}); };
// run an officer action, then reload the list (and refresh our own card if we changed ourselves)
async function act(e, fn, ask) {
  if (ask && !confirm(ask)) return;
  const b = e.currentTarget; b.disabled = true;
  try {
    await fn();
    const snap = await getDoc(doc(db, 'members', me.id));
    if (snap.exists()) { me = { id: me.id, ...snap.data() }; renderProfile($('#pt-card'), me, true); }
    loadManage();
  } catch (err) { console.error(err); b.disabled = false; alert('That did not work. Please try again.'); }
}
