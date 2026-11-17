// Member portal: Google sign-in, service record, projects and attendance, leaderboard,
// members and officer tools. Data lives in Firebase (Firestore); what each person may
// read or change is enforced by the security rules in Firebase, not by this file.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp }
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
// awards: monthly ones are kept per month, the rest per Leo year
const AWARDS = {
  month: { name: 'Leo of the Month', monthly: true, single: true },
  year: { name: 'Leo of the Year', single: true },
  director: { name: 'Outstanding Director of the Year', single: true },
  exco: { name: 'Outstanding Executive Member of the Year', single: true },
  special: { name: 'Special Recognition' }
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const $ = s => document.querySelector(s);
// build elements with text only, so nothing a member types is ever read as HTML
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => c != null && c !== false && n.append(c));
  return n;
};
// fill a node with children, skipping the optional ones that are empty
const fill = (node, ...kids) => node.replaceChildren(...kids.flat().filter(c => c != null && c !== false));
const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const avatar = (m, cls = '') => m.photo
  ? el('img', { class: 'pt-av ' + cls, src: m.photo, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' })
  : el('span', { class: 'pt-av pt-av-i ' + cls, 'aria-hidden': 'true', text: initials(m.name) });
const say = (node, msg, bad = false) => { node.textContent = msg; node.classList.toggle('bad', bad); };
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const roleLine = m => m.position || (m.role && m.role !== 'member' ? ROLES[m.role] : 'Member');

// ---------- Leo year: 1 July to 30 June ----------
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const leoYear = iso => { const [y, m] = iso.split('-').map(Number); return m >= 7 ? y : y - 1; };
const lyLabel = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
const THIS_LY = leoYear(todayISO());
const awardLabel = a => AWARDS[a.type].monthly
  ? `${AWARDS[a.type].name}, ${MONTHS[Number(a.period.slice(5, 7)) - 1]} ${a.period.slice(0, 4)}`
  : `${AWARDS[a.type].name} ${lyLabel(Number(a.period))}`;
// newest first: monthly awards by month; year awards count as the end of their Leo year
const awardKey = a => AWARDS[a.type].monthly ? a.period : `${Number(a.period) + 1}-06`;
const awardOrder = (x, y) => awardKey(y).localeCompare(awardKey(x)) || (x.type === 'year' ? -1 : 1);
const awardsOf = uid => awards.filter(a => a.memberId === uid);
const niceDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

const views = ['pt-loading', 'pt-out', 'pt-pending', 'pt-app'];
const show = id => views.forEach(v => { $('#' + v).hidden = v !== id; });

let me = null, user = null, officer = false;
let members = [], projects = [], awards = [];

// ---------- sign-in ----------
const AUTH_WHY = {
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/popup-closed-by-user': 'The Google window closed before sign-in finished. If you did not close it, your browser may be blocking third-party cookies for this site; allow them, or try another browser.',
  'auth/cancelled-popup-request': 'Another sign-in window was already open. Try again.',
  'auth/unauthorized-domain': 'This web address is not allowed to sign in yet. The website admin must add it in Firebase.',
  'auth/network-request-failed': 'No internet connection, or the connection was blocked. Try again.',
  'auth/web-storage-unsupported': 'This browser is blocking storage the sign-in needs. Allow cookies for this site or use another browser.',
  'auth/internal-error': 'Google sign-in had a problem. Try again in a minute.'
};
const authFail = e => {
  console.error(e);
  say($('#pt-out-msg'), `${AUTH_WHY[e.code] || 'Sign-in did not work. Try again.'} (${e.code || e.message})`, true);
};
getRedirectResult(auth).catch(authFail);

$('#pt-signin').addEventListener('click', async () => {
  say($('#pt-out-msg'), '');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, provider); }
  catch (e) {
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
      $('#pt-pending-name').textContent = (me.name || 'there').split(' ')[0];
      show('pt-pending');
      return;
    }
    await loadData();
    renderApp();
  } catch (e) {
    console.error(e);
    show('pt-out');
    const why = e.code === 'permission-denied' ? ' (the database rules blocked it)'
      : e.code === 'unavailable' ? ' (no connection to the database)' : e.code ? ` (${e.code})` : '';
    say($('#pt-out-msg'), `The portal could not load your account${why}. Try again later.`, true);
  }
});

async function loadData() {
  const [m, p, a] = await Promise.all([
    getDocs(query(collection(db, 'members'), where('status', '==', 'approved'))),
    getDocs(collection(db, 'projects')),
    getDocs(collection(db, 'awards')).catch(() => ({ docs: [] }))
  ]);
  awards = a.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => AWARDS[x.type]).sort(awardOrder);
  members = m.docs.map(d => ({ id: d.id, ...d.data() }));
  projects = p.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date || ''))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- numbers, worked out from project attendance ----------
function statsFor(uid, year = null) {
  const s = { projects: 0, hours: 0, points: 0 };
  for (const p of projects) {
    if (p.date > todayISO() || (year != null && leoYear(p.date) !== year) || !(p.attendees || []).includes(uid)) continue;
    s.projects++; s.hours += Number(p.hours) || 0; s.points += Number(p.points) || 0;
  }
  return s;
}
function ranking(year) {
  return members.map(m => ({ m, s: statsFor(m.id, year) }))
    .sort((a, b) => b.s.points - a.s.points || b.s.hours - a.s.hours || (a.m.name || '').localeCompare(b.m.name || ''));
}

// ---------- app shell ----------
const navs = () => [...document.querySelectorAll('.pt-nav button')];
navs().forEach(b => b.addEventListener('click', () => openPanel(b.dataset.panel)));
function openPanel(name) {
  navs().forEach(b => b.toggleAttribute('aria-current', b.dataset.panel === name));
  document.querySelectorAll('.pt-panel').forEach(p => { p.hidden = p.id !== 'pt-' + name; });
  ({ overview: renderOverview, projects: renderProjects, board: renderBoard, members: renderMembers, manage: loadManage, give: () => { drawAwardForm(); drawAwards(); } })[name]();
  const main = $('.pt-main');
  if (main.getBoundingClientRect().top < 0) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderApp() {
  show('pt-app');
  $('#pt-me').replaceChildren(avatar(me), el('span', {}, el('b', { text: me.name || user.email }), el('small', { text: roleLine(me) })));
  $('#pt-nav-manage').hidden = !officer;
  document.querySelectorAll('.pt-officer').forEach(n => { n.hidden = !officer; });
  const f = $('#pt-form');
  f.name.value = me.name || ''; f.school.value = me.school || ''; f.bio.value = me.bio || '';
  fill($('#pt-photo-prev'), avatar(me, 'pt-av-lg'));
  $('#pt-photo-google').hidden = !user.photoURL || me.photo === user.photoURL;
  $('#pt-photo-none').hidden = !me.photo;
  openPanel('overview');
}

// ---------- overview ----------
function renderOverview() {
  const s = statsFor(me.id, THIS_LY), all = statsFor(me.id);
  const pos = ranking(THIS_LY).findIndex(r => r.m.id === me.id);
  $('#pt-hello').textContent = `Hello, ${(me.name || 'Leo').split(' ')[0]}`;
  $('#pt-hello-sub').textContent = `${roleLine(me)}, Leo Club of Matara Excellence. Leo year ${lyLabel(THIS_LY)}.`;
  $('#pt-figs').replaceChildren(
    fig(s.projects, 'projects served', `${all.projects} in total`),
    fig(s.hours, 'service hours', `${all.hours} in total`),
    fig(s.points, 'points', `${all.points} in total`),
    fig(pos >= 0 && s.points > 0 ? pos + 1 : '–', 'club rank', `of ${members.length} Leos`));
  renderTrack($('#pt-track'), me.id);
  const mine = projects.filter(p => (p.attendees || []).includes(me.id) && p.date <= todayISO()).slice(0, 5);
  const next = projects.filter(p => p.date > todayISO()).reverse().slice(0, 3);
  $('#pt-recent').replaceChildren(...(mine.length ? mine.map(p => projRow(p, false)) : [empty('No projects recorded for you yet. The Secretary marks attendance after each project.')]));
  $('#pt-next').replaceChildren(...(next.length ? next.map(p => projRow(p, false)) : [empty('No upcoming projects added yet.')]));
  const aw = awardsOf(me.id);
  $('#pt-awards-box').hidden = !aw.length;
  $('#pt-awards').replaceChildren(...aw.map(a => el('li', { text: awardLabel(a) })));
  // the club's latest Leo of the Month, for everyone
  const lm = awards.find(a => a.type === 'month');
  const box = $('#pt-spot');
  box.hidden = !lm;
  if (lm) {
    const m = memberById(lm.memberId) || lm;
    fill(box, avatar(m),
      el('p', {}, el('span', { text: awardLabel(lm) }), el('b', { text: lm.name }), lm.citation ? el('small', { text: lm.citation }) : null));
  }
}
const memberById = id => members.find(m => m.id === id);
const fig = (n, label, sub) => el('div', { class: 'pt-fig' }, el('b', { text: String(n) }), el('span', { text: label }), el('small', { text: sub }));
const empty = t => el('p', { class: 'pt-empty', text: t });

// the service year: one mark per club project from July to June; filled where this Leo served
function renderTrack(box, uid) {
  const start = Date.UTC(THIS_LY, 6, 1), end = Date.UTC(THIS_LY + 1, 6, 1);
  const at = iso => { const [y, m, d] = iso.split('-').map(Number); return (Date.UTC(y, m - 1, d) - start) / (end - start) * 100; };
  const yearP = projects.filter(p => leoYear(p.date) === THIS_LY);
  const today = todayISO();
  const served = yearP.filter(p => (p.attendees || []).includes(uid) && p.date <= today).length;
  const done = yearP.filter(p => p.date <= today).length;
  const line = el('div', { class: 'pt-track-line' },
    el('span', { class: 'pt-track-done', style: `width:${Math.min(100, at(today))}%` }),
    el('span', { class: 'pt-track-now', style: `left:${Math.min(100, at(today))}%`, title: 'Today' }),
    yearP.map(p => {
      const mine = (p.attendees || []).includes(uid), future = p.date > today;
      return el('span', { class: 'pt-mark' + (future ? ' is-next' : mine ? ' is-mine' : ''), style: `left:${at(p.date)}%`, title: `${p.title}, ${niceDate(p.date)}${future ? ' (upcoming)' : mine ? ' (served)' : ''}` });
    }));
  const months = el('div', { class: 'pt-track-m', 'aria-hidden': 'true' }, [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5].map(i => el('span', { text: MONTHS[i].slice(0, 3) })));
  box.replaceChildren(
    el('p', { class: 'pt-track-t' }, el('b', { text: `Your service year ${lyLabel(THIS_LY)}` }),
      el('span', { text: done ? `You served at ${served} of the ${plural(done, 'project')} the club has held so far.` : 'The club’s projects for this Leo year will appear here.' })),
    el('div', { class: 'pt-track-w', 'aria-hidden': 'true' }, line, months),
    el('p', { class: 'pt-key', 'aria-hidden': 'true' },
      el('span', { class: 'k-mine', text: 'Served' }), el('span', { class: 'k-club', text: 'Club project' }), el('span', { class: 'k-next', text: 'Upcoming' })));
}

$('#pt-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, msg = $('#pt-form-msg');
  const data = { name: f.name.value.trim().slice(0, 80), school: f.school.value.trim().slice(0, 120), bio: f.bio.value.trim().slice(0, 400) };
  if (!data.name) { say(msg, 'Type your name.', true); f.name.focus(); return; }
  try {
    await updateDoc(doc(db, 'members', me.id), data);
    Object.assign(me, data);
    const mm = members.find(m => m.id === me.id); if (mm) Object.assign(mm, data);
    renderApp();
    say($('#pt-form-msg'), 'Profile saved.');
  } catch (err) { console.error(err); say(msg, 'Your profile was not saved. Check your connection and try again.', true); }
});

// ---------- projects ----------
let projFilter = 'all';
document.querySelectorAll('[data-pfilter]').forEach(b => b.addEventListener('click', () => {
  projFilter = b.dataset.pfilter;
  document.querySelectorAll('[data-pfilter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  renderProjects();
}));
function renderProjects() {
  const list = projects.filter(p => projFilter === 'all' || (p.attendees || []).includes(me.id));
  const box = $('#pt-plist');
  if (!list.length) {
    box.replaceChildren(empty(projFilter === 'mine' ? 'You have no recorded projects yet.' : officer ? 'No projects yet. Add the first one with "Add project".' : 'No projects have been added yet.'));
    return;
  }
  const groups = [];
  for (const p of list) {
    const key = p.date.slice(0, 7);
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, items: [] });
    groups[groups.length - 1].items.push(p);
  }
  box.replaceChildren(...groups.map(g => {
    const [y, m] = g.key.split('-').map(Number);
    return el('section', { class: 'pt-month' }, el('h3', { text: `${MONTHS[m - 1]} ${y}` }), el('div', { class: 'pt-rows' }, g.items.map(p => projRow(p, true))));
  }));
}
function projRow(p, full) {
  const [y, m, d] = p.date.split('-').map(Number);
  const wd = new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short' });
  const att = (p.attendees || []).length, mine = (p.attendees || []).includes(me.id), future = p.date > todayISO();
  const facts = [p.cause, p.venue].filter(Boolean).join(', ');
  return el('article', { class: 'pt-proj' + (mine ? ' is-mine' : '') },
    el('div', { class: 'pt-date', 'aria-hidden': 'true' }, el('b', { text: String(d) }), el('span', { text: full ? wd : MONTHS[m - 1].slice(0, 3) })),
    el('div', { class: 'pt-proj-t' },
      el('h4', { text: p.title || 'Untitled project' }),
      el('p', { text: `${niceDate(p.date)}${facts ? ', ' + facts : ''}` }),
      full && p.notes ? el('p', { class: 'pt-notes', text: p.notes }) : null),
    el('div', { class: 'pt-proj-n' },
      el('span', { text: `${Number(p.hours) || 0} h, ${Number(p.points) || 0} pts` }),
      el('small', { text: future ? 'Upcoming' : mine ? 'You served' : plural(att, 'Leo') + ' served' })),
    full && officer ? el('div', { class: 'pt-proj-a' },
      el('button', { class: 'pt-btn', type: 'button', text: 'Attendance', onclick: () => openAttendance(p) }),
      el('button', { class: 'pt-btn ghost', type: 'button', text: 'Edit', onclick: () => openProjectForm(p) })) : null);
}

// add / edit a project (officers)
const pdlg = $('#pt-pdlg'), pform = $('#pt-pform');
let editing = null;
$('#pt-add').addEventListener('click', () => openProjectForm(null));
function openProjectForm(p) {
  editing = p;
  $('#pt-pdlg-h').textContent = p ? 'Edit project' : 'Add project';
  pform.title.value = p ? p.title || '' : '';
  pform.date.value = p ? p.date : todayISO();
  pform.cause.value = p ? p.cause || '' : '';
  pform.venue.value = p ? p.venue || '' : '';
  pform.hours.value = p ? p.hours ?? 3 : 3;
  pform.points.value = p ? p.points ?? 10 : 10;
  pform.notes.value = p ? p.notes || '' : '';
  $('#pt-pdel').hidden = !p;
  say($('#pt-pform-msg'), '');
  pdlg.showModal();
  pform.title.focus();
}
pform.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#pt-pform-msg');
  const data = {
    title: pform.title.value.trim().slice(0, 120), date: pform.date.value, cause: pform.cause.value.trim().slice(0, 60),
    venue: pform.venue.value.trim().slice(0, 120), notes: pform.notes.value.trim().slice(0, 600),
    hours: Math.max(0, Math.min(48, Number(pform.hours.value) || 0)), points: Math.max(0, Math.min(500, Math.round(Number(pform.points.value) || 0))),
    updatedAt: serverTimestamp()
  };
  if (!data.title) { say(msg, 'Type the project name.', true); pform.title.focus(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) { say(msg, 'Choose the date.', true); pform.date.focus(); return; }
  try {
    if (editing) await updateDoc(doc(db, 'projects', editing.id), data);
    else await addDoc(collection(db, 'projects'), { ...data, attendees: [], createdAt: serverTimestamp(), createdBy: me.id });
    pdlg.close();
    await loadData(); renderProjects();
    toast(editing ? 'Project saved.' : 'Project added. Mark attendance once it has taken place.');
  } catch (err) { console.error(err); say(msg, 'The project was not saved. Only the Secretary, President and portal admins can add projects.', true); }
});
$('#pt-pdel').addEventListener('click', async () => {
  if (!editing || !confirm(`Delete "${editing.title}"? Everyone's hours and points from it will be removed.`)) return;
  try { await deleteDoc(doc(db, 'projects', editing.id)); pdlg.close(); await loadData(); renderProjects(); toast('Project deleted.'); }
  catch (err) { console.error(err); say($('#pt-pform-msg'), 'The project was not deleted. Try again.', true); }
});

// attendance (officers)
const adlg = $('#pt-adlg');
let attP = null, picked = new Set();
function openAttendance(p) {
  attP = p; picked = new Set(p.attendees || []);
  $('#pt-adlg-h').textContent = p.title;
  $('#pt-adlg-sub').textContent = `${niceDate(p.date)}. Tick everyone who served. Each gets ${Number(p.hours) || 0} hours and ${Number(p.points) || 0} points.`;
  $('#pt-asearch').value = '';
  drawAttendance();
  say($('#pt-adlg-msg'), '');
  adlg.showModal();
}
function drawAttendance() {
  const q = $('#pt-asearch').value.trim().toLowerCase();
  const list = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '')).filter(m => !q || (m.name || '').toLowerCase().includes(q));
  $('#pt-alist').replaceChildren(...list.map(m => el('label', { class: 'pt-pick' },
    el('input', { type: 'checkbox', checked: picked.has(m.id), onchange: e => { e.target.checked ? picked.add(m.id) : picked.delete(m.id); countAtt(); } }),
    avatar(m), el('span', {}, el('b', { text: m.name || 'Member' }), el('small', { text: roleLine(m) })))));
  countAtt();
}
const countAtt = () => { $('#pt-acount').textContent = `${plural(picked.size, 'Leo')} ticked`; };
$('#pt-asearch').addEventListener('input', drawAttendance);
$('#pt-asave').addEventListener('click', async e => {
  const b = e.currentTarget; b.disabled = true;
  try {
    await updateDoc(doc(db, 'projects', attP.id), { attendees: [...picked], updatedAt: serverTimestamp() });
    adlg.close(); await loadData(); renderProjects(); toast(`Attendance saved for ${plural(picked.size, 'Leo')}.`);
  } catch (err) { console.error(err); say($('#pt-adlg-msg'), 'Attendance was not saved. Try again.', true); }
  b.disabled = false;
});
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  d.querySelectorAll('.pt-x, [data-close]').forEach(b => b.addEventListener('click', () => d.close()));
});

// ---------- leaderboard ----------
let boardYear = THIS_LY;
document.querySelectorAll('[data-byear]').forEach(b => b.addEventListener('click', () => {
  boardYear = b.dataset.byear === 'all' ? null : THIS_LY;
  document.querySelectorAll('[data-byear]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  renderBoard();
}));
function renderBoard() {
  $('#pt-byear-this').textContent = `Leo year ${lyLabel(THIS_LY)}`;
  const rows = ranking(boardYear).filter(r => r.s.points > 0 || r.s.projects > 0);
  const max = rows.length ? rows[0].s.points || 1 : 1;
  $('#pt-board-list').replaceChildren(...(rows.length ? rows.map((r, i) => el('li', { class: 'pt-rank' + (r.m.id === me.id ? ' is-me' : '') },
    el('span', { class: 'pt-rank-n', text: String(i + 1) }),
    avatar(r.m),
    el('span', { class: 'pt-rank-t' }, el('b', { text: r.m.name || 'Member' }), el('small', { text: `${roleLine(r.m)}, ${plural(r.s.projects, 'project')}, ${r.s.hours} h${awardsOf(r.m.id).length ? ', ' + plural(awardsOf(r.m.id).length, 'award') : ''}` })),
    el('span', { class: 'pt-rank-bar', 'aria-hidden': 'true' }, el('i', { style: `width:${Math.max(4, r.s.points / max * 100)}%` })),
    el('span', { class: 'pt-rank-p', text: `${r.s.points} pts` }))) : [empty('Points appear here once attendance is recorded for a project.')]));
}

// ---------- members ----------
$('#pt-msearch').addEventListener('input', renderMembers);
function renderMembers() {
  const q = $('#pt-msearch').value.trim().toLowerCase();
  const list = [...members].sort((a, b) => rank(b) - rank(a) || (a.name || '').localeCompare(b.name || ''))
    .filter(m => !q || `${m.name} ${m.position}`.toLowerCase().includes(q));
  $('#pt-count').textContent = `${plural(members.length, 'Leo')} in the portal`;
  $('#pt-grid').replaceChildren(...(list.length ? list.map(m => {
    const s = statsFor(m.id, THIS_LY);
    return el('button', { class: 'pt-mcard', type: 'button', onclick: () => openMember(m) },
      avatar(m, 'pt-av-md'), el('b', { text: m.name || 'Member' }), el('span', { text: roleLine(m) }),
      el('small', { text: `${s.points} pts this year` }));
  }) : [empty('No one matches that name.')]));
}
const rank = m => ({ president: 5, secretary: 4, exco: 3, director: 2, admin: 1 })[m.role] || 0;

const mdlg = $('#pt-mdlg');
function openMember(m) {
  const s = statsFor(m.id, THIS_LY), all = statsFor(m.id);
  const done = projects.filter(p => (p.attendees || []).includes(m.id) && p.date <= todayISO()).slice(0, 6);
  fill($('#pt-mdlg-body'),
    el('div', { class: 'pt-mhead' }, avatar(m, 'pt-av-lg'),
      el('div', {}, el('h3', { text: m.name || 'Member' }), el('p', { text: roleLine(m) }), m.school ? el('p', { class: 'pt-muted', text: m.school }) : null)),
    m.bio ? el('p', { class: 'pt-bio', text: m.bio }) : null,
    el('div', { class: 'pt-figs pt-figs-sm' }, fig(s.projects, 'projects', `${all.projects} in total`), fig(s.hours, 'hours', `${all.hours} in total`), fig(s.points, 'points', `${all.points} in total`)),
    awardsOf(m.id).length ? el('ul', { class: 'pt-awards' }, awardsOf(m.id).map(a => el('li', { text: awardLabel(a) }))) : null,
    done.length ? el('div', { class: 'pt-rows' }, done.map(p => projRow(p, false))) : null);
  mdlg.showModal();
}

// ---------- officer tools ----------
async function loadManage() {
  const pend = $('#pt-pend'), all = $('#pt-all');
  pend.replaceChildren(empty('Loading…'));
  all.replaceChildren();
  loadRoster();
  try {
    const p = await getDocs(query(collection(db, 'members'), where('status', '==', 'pending')));
    const pending = p.docs.map(d => ({ id: d.id, ...d.data() }));
    const contacts = Object.fromEntries(await Promise.all(pending.map(async m => {
      const c = await getDoc(doc(db, 'contacts', m.id)).catch(() => null);
      return [m.id, c && c.exists() ? c.data().email : ''];
    })));
    $('#pt-pend-n').textContent = $('#pt-pend-n2').textContent = pending.length ? String(pending.length) : '';
    pend.replaceChildren(...(pending.length ? pending.map(m => el('div', { class: 'pt-row' },
      avatar(m),
      el('div', { class: 'pt-row-t' }, el('b', { text: m.name || 'No name' }), el('small', { text: contacts[m.id] || '' })),
      el('div', { class: 'pt-row-a' },
        el('button', { class: 'pt-btn', type: 'button', text: 'Approve', onclick: e => act(e, () => updateDoc(doc(db, 'members', m.id), { status: 'approved', joined: serverTimestamp() })) }),
        el('button', { class: 'pt-btn ghost', type: 'button', text: 'Decline', onclick: e => act(e, () => removeMember(m.id), `Decline ${m.name || 'this request'}?`) }))
    )) : [empty('No one is waiting for approval.')]));

    all.replaceChildren(...[...members].sort((x, y) => rank(y) - rank(x) || (x.name || '').localeCompare(y.name || '')).map(m => {
      const role = el('select', { 'aria-label': `Role of ${m.name}` }, Object.entries(ROLES).map(([k, v]) => el('option', { value: k, text: v, selected: k === m.role })));
      const pos = el('input', { type: 'text', value: m.position || '', maxlength: '80', placeholder: 'Position, for example Treasurer', 'aria-label': `Position of ${m.name}` });
      return el('div', { class: 'pt-row', 'data-name': `${m.name} ${m.position}`.toLowerCase() },
        avatar(m),
        el('div', { class: 'pt-row-t' }, el('b', { text: m.name || 'No name' }), el('small', { text: [...new Set([ROLES[m.role] || 'Member', m.position].filter(Boolean))].join(', ') })),
        el('div', { class: 'pt-row-a' }, role, pos,
          el('button', { class: 'pt-btn', type: 'button', text: 'Save', onclick: e => act(e, () => updateDoc(doc(db, 'members', m.id), { role: role.value, position: pos.value.trim().slice(0, 80) })) }),
          m.id !== me.id ? el('button', { class: 'pt-btn ghost', type: 'button', text: 'Remove', onclick: e => act(e, () => removeMember(m.id), `Remove ${m.name || 'this member'} from the portal?`) }) : null));
    }));
    filterRoles();
  } catch (e) { console.error(e); pend.replaceChildren(el('p', { class: 'pt-empty bad', text: 'This list did not load. Only the Secretary, President and portal admins can open Manage.' })); }
}

// the three parts of Manage
let mtab = 'approve';
document.querySelectorAll('[data-mtab]').forEach(b => b.addEventListener('click', () => openMtab(b.dataset.mtab)));
function openMtab(name) {
  mtab = name;
  document.querySelectorAll('[data-mtab]').forEach(b => { const on = b.dataset.mtab === name; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  document.querySelectorAll('.pt-mpart').forEach(p => { p.hidden = p.id !== 'pt-m-' + name; });
}
$('.pt-sub').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const t = [...document.querySelectorAll('[data-mtab]')], i = t.indexOf(document.activeElement);
  if (i < 0) return;
  const n = t[(i + (e.key === 'ArrowRight' ? 1 : t.length - 1)) % t.length];
  n.focus(); openMtab(n.dataset.mtab);
});
openMtab('approve');
$('#pt-rsearch').addEventListener('input', filterRoles);
function filterRoles() {
  const q = $('#pt-rsearch').value.trim().toLowerCase();
  document.querySelectorAll('#pt-all .pt-row').forEach(r => { r.hidden = !!q && !r.dataset.name.includes(q); });
}

// roster: people listed in advance by email
const ROLE_WORDS = Object.fromEntries(Object.entries(ROLES).flatMap(([k, v]) => [[k, k], [v.toLowerCase(), k]]));
async function loadRoster() {
  const box = $('#pt-roster');
  try {
    const snap = await getDocs(collection(db, 'roster'));
    const list = snap.docs.map(d => ({ email: d.id, ...d.data() })).sort((a, b) => rank(b) - rank(a) || (a.name || '').localeCompare(b.name || ''));
    $('#pt-roster-n').textContent = list.length ? String(list.length) : '';
    box.replaceChildren(...(list.length ? list.map(x => el('div', { class: 'pt-row' },
      el('div', { class: 'pt-row-t' }, el('b', { text: x.name || x.email }), el('small', { text: `${x.position || ROLES[x.role] || ''}, ${x.email}` })),
      el('div', { class: 'pt-row-a' }, el('button', { class: 'pt-btn ghost', type: 'button', text: 'Remove', onclick: e => act(e, () => deleteDoc(doc(db, 'roster', x.email)), `Remove ${x.name || x.email} from the roster?`) })))) : [empty('No one is on the roster yet.')]));
  } catch (e) { console.error(e); box.replaceChildren(el('p', { class: 'pt-empty bad', text: 'The roster did not load.' })); }
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
  if (!rows.length) { say(msg, 'Nothing was added. Use one line per person: email, name, role, position', true); return; }
  const b = f.querySelector('button'); b.disabled = true; say(msg, `Adding ${rows.length}…`);
  try {
    for (const x of rows) await setDoc(doc(db, 'roster', x.email), { name: x.name, role: x.role, position: x.position });
    f.list.value = bad.join('\n');
    say(msg, `Added ${rows.length} to the roster.` + (bad.length ? ` ${bad.length} line(s) were not understood and are left in the box.` : ''), !!bad.length);
    loadRoster();
  } catch (err) { console.error(err); say(msg, 'The roster was not changed. Only officers can change it.', true); }
  b.disabled = false;
});

const removeMember = async id => { await deleteDoc(doc(db, 'members', id)); await deleteDoc(doc(db, 'contacts', id)).catch(() => {}); };
// run an officer action, then reload everything (and refresh our own details if we changed ourselves)
async function act(e, fn, ask) {
  if (ask && !confirm(ask)) return;
  const b = e.currentTarget; b.disabled = true;
  try {
    await fn();
    const snap = await getDoc(doc(db, 'members', me.id));
    if (snap.exists()) me = { id: me.id, ...snap.data() };
    await loadData();
    if (!$('#pt-give').hidden) drawAwards(); else loadManage();
    toast('Saved.');
  } catch (err) { console.error(err); b.disabled = false; toast('That change was not saved. Try again.', true); }
}

let toastT;
function toast(msg, bad = false) {
  const t = $('#pt-toast');
  t.textContent = msg; t.classList.toggle('bad', bad); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

// ---------- awards (officers announce; everyone, and the public website, can see them) ----------
const aform = $('#pt-aform');
aform.type.replaceChildren(...Object.entries(AWARDS).map(([k, v]) => el('option', { value: k, text: v.name })));
aform.type.addEventListener('change', drawAwardForm);
function drawAwardForm() {
  const monthly = AWARDS[aform.type.value].monthly;
  $('#pt-a-month').hidden = !monthly; $('#pt-a-year').hidden = monthly;
  if (!aform.month.value) { const d = new Date(); d.setMonth(d.getMonth() - 1); aform.month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  if (!aform.ly.options.length) aform.ly.replaceChildren(...[THIS_LY, THIS_LY - 1, THIS_LY - 2].map(y => el('option', { value: String(y), text: `Leo year ${lyLabel(y)}` })));
  const cur = aform.member.value;
  aform.member.replaceChildren(el('option', { value: '', text: 'Choose a Leo' }),
    ...[...members].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(m => el('option', { value: m.id, text: `${m.name}${m.position ? ' (' + m.position + ')' : ''}` })));
  aform.member.value = cur;
}
function drawAwards() {
  $('#pt-alist-aw').replaceChildren(...(awards.length ? awards.map(a => el('div', { class: 'pt-row' },
    avatar(memberById(a.memberId) || a),
    el('div', { class: 'pt-row-t' }, el('b', { text: a.name }), el('small', { text: awardLabel(a) + (a.citation ? `. ${a.citation}` : '') })),
    el('div', { class: 'pt-row-a' }, el('button', { class: 'pt-btn ghost', type: 'button', text: 'Withdraw', onclick: e => act(e, () => deleteDoc(doc(db, 'awards', a.id)), `Withdraw "${awardLabel(a)}" from ${a.name}? It will disappear from the website.`) })))) : [empty('No awards announced yet.')]));
}
aform.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#pt-aform-msg'), type = aform.type.value, A = AWARDS[type];
  const period = A.monthly ? aform.month.value : aform.ly.value;
  const m = memberById(aform.member.value);
  if (!/^\d{4}(-\d{2})?$/.test(period || '')) { say(msg, A.monthly ? 'Choose the month.' : 'Choose the Leo year.', true); return; }
  if (!m) { say(msg, 'Choose the Leo who receives the award.', true); aform.member.focus(); return; }
  const data = { type, period, memberId: m.id, name: m.name || '', position: m.position || '', photo: m.photo || '', citation: aform.citation.value.trim().slice(0, 280), createdAt: serverTimestamp() };
  const label = awardLabel(data);
  const ref = A.single ? doc(db, 'awards', `${type}-${period}`) : null;
  if (A.single && awards.some(a => a.id === ref.id) && !confirm(`${label} has already been announced. Replace it with ${m.name}?`)) return;
  const b = aform.querySelector('button[type=submit]'); b.disabled = true;
  try {
    if (ref) await setDoc(ref, data); else await addDoc(collection(db, 'awards'), data);
    aform.citation.value = ''; aform.member.value = '';
    await loadData(); drawAwards();
    say(msg, ''); toast(`${label} announced for ${m.name}. It now shows on the website.`);
  } catch (err) { console.error(err); say(msg, 'The award was not saved. Only the Secretary, President and portal admins can announce awards.', true); }
  b.disabled = false;
});

// ---------- profile photo ----------
const photoIn = $('#pt-photo-in'), photoMsg = $('#pt-photo-msg');
$('#pt-photo-pick').addEventListener('click', () => photoIn.click());
$('#pt-photo-google').addEventListener('click', () => savePhoto(user.photoURL || '', 'Your Google photo is back on your profile.'));
$('#pt-photo-none').addEventListener('click', () => savePhoto('', 'Photo removed. Your initials show instead.'));
photoIn.addEventListener('change', async () => {
  const f = photoIn.files[0];
  photoIn.value = '';
  if (!f) return;
  if (!/^image\//.test(f.type)) { say(photoMsg, 'Choose a picture file, such as a JPG or PNG.', true); return; }
  if (f.size > 15e6) { say(photoMsg, 'That picture is larger than 15 MB. Choose a smaller one.', true); return; }
  say(photoMsg, 'Preparing your photo…');
  try { await savePhoto(await squarePhoto(f), 'New photo saved.'); }
  catch (e) { console.error(e); say(photoMsg, 'That picture could not be read. Try a JPG or PNG.', true); }
});
// crop the middle square (a little above centre, where faces usually are) and shrink it to 320 x 320
async function squarePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2, sy = Math.max(0, (img.naturalHeight - side) * 0.3);
    const c = document.createElement('canvas'); c.width = c.height = 320;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, side, side, 0, 0, 320, 320);
    let q = 0.86, out = c.toDataURL('image/jpeg', q);
    while (out.length > 90000 && q > 0.5) { q -= 0.08; out = c.toDataURL('image/jpeg', q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}
async function savePhoto(photo, done) {
  try {
    await updateDoc(doc(db, 'members', me.id), { photo });
    me.photo = photo;
    const mm = members.find(m => m.id === me.id); if (mm) mm.photo = photo;
    renderApp(); $('.pt-edit').open = true;
    say(photoMsg, done);
  } catch (e) { console.error(e); say(photoMsg, 'Your photo was not saved. Check your connection and try again.', true); }
}
