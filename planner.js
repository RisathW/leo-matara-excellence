// Project planner: fill in the form, get a one-page plan to print or save as PDF.
// Everything stays in this browser (localStorage). Nothing is sent anywhere.
(function () {
  const form = document.getElementById('plan-form');
  const sheet = document.getElementById('plan-sheet');
  if (!form || !sheet) return;
  const KEY = 'leo-project-plan-v1';
  const STEPS = [
    'Agree the goal with the club board',
    'Visit the place and talk to the people there',
    'Fix the date, time and venue',
    'Write the budget and find the money',
    'Share out the jobs in the team',
    'Tell our Lions club and the district',
    'Make the poster and share it',
    'Buy or collect what we need',
    'Do the project',
    'Thank everyone, share photos and write the report'
  ];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => 'Rs. ' + (Math.round(n * 100) / 100).toLocaleString('en-LK');

  let state = { f: {}, team: [['Project chair', ''], ['Secretary', ''], ['Treasurer', '']], budget: [['', '']], steps: STEPS.map(t => [t, false]) };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.team && s.budget && s.steps) state = s; } catch (e) {}

  const rows = { team: document.getElementById('team-rows'), budget: document.getElementById('budget-rows'), steps: document.getElementById('step-rows') };

  function drawRows() {
    rows.team.innerHTML = state.team.map((r, i) => `<div class="pl-row"><input aria-label="Role" placeholder="Role" value="${esc(r[0])}" data-k="team" data-i="${i}" data-c="0"><input aria-label="Name" placeholder="Name" value="${esc(r[1])}" data-k="team" data-i="${i}" data-c="1"><button type="button" class="pl-x" aria-label="Remove this person" data-rm="team" data-i="${i}">×</button></div>`).join('');
    rows.budget.innerHTML = state.budget.map((r, i) => `<div class="pl-row"><input aria-label="Item" placeholder="Item" value="${esc(r[0])}" data-k="budget" data-i="${i}" data-c="0"><input aria-label="Cost in rupees" placeholder="Rs." inputmode="decimal" value="${esc(r[1])}" data-k="budget" data-i="${i}" data-c="1"><button type="button" class="pl-x" aria-label="Remove this item" data-rm="budget" data-i="${i}">×</button></div>`).join('');
    rows.steps.innerHTML = state.steps.map((r, i) => `<div class="pl-row step"><input type="checkbox" aria-label="Done" ${r[1] ? 'checked' : ''} data-k="steps" data-i="${i}" data-c="1"><input aria-label="Step" value="${esc(r[0])}" data-k="steps" data-i="${i}" data-c="0"><button type="button" class="pl-x" aria-label="Remove this step" data-rm="steps" data-i="${i}">×</button></div>`).join('');
  }

  function draw() {
    const f = state.f;
    const total = state.budget.reduce((a, r) => a + (parseFloat(String(r[1]).replace(/,/g, '')) || 0), 0);
    const line = (label, v) => v ? `<div><dt>${label}</dt><dd>${esc(v)}</dd></div>` : '';
    const team = state.team.filter(r => r[0] || r[1]);
    const budget = state.budget.filter(r => r[0] || r[1]);
    const steps = state.steps.filter(r => r[0]);
    sheet.innerHTML = `
      <header><img src="assets/logo.webp" alt="" width="56" height="57"><div><small>Leo Club of Matara Excellence · Project plan</small><h2>${esc(f.name) || 'Your project name'}</h2></div></header>
      <dl class="ps-facts">${line('Cause', f.cause)}${line('Date', f.date)}${line('Time', f.time)}${line('Place', f.place)}${line('People we hope to reach', f.reach)}</dl>
      ${f.goal ? `<section><h3>Why we are doing this</h3><p>${esc(f.goal)}</p></section>` : ''}
      ${f.what ? `<section><h3>What we will do</h3><p>${esc(f.what)}</p></section>` : ''}
      ${team.length ? `<section><h3>Team</h3><table>${team.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</table></section>` : ''}
      ${budget.length ? `<section><h3>Budget</h3><table>${budget.map(r => `<tr><th>${esc(r[0])}</th><td class="num">${r[1] ? money(parseFloat(String(r[1]).replace(/,/g, '')) || 0) : ''}</td></tr>`).join('')}<tr class="tot"><th>Total</th><td class="num">${money(total)}</td></tr></table></section>` : ''}
      ${steps.length ? `<section><h3>Checklist</h3><ul class="ps-steps">${steps.map(r => `<li class="${r[1] ? 'done' : ''}">${esc(r[0])}</li>`).join('')}</ul></section>` : ''}
      ${f.notes ? `<section><h3>Notes</h3><p>${esc(f.notes)}</p></section>` : ''}
      <footer>Approved by: ____________________ &nbsp; Date: ____________</footer>`;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // fill the plain fields from saved state
  Array.from(form.elements).forEach(el => { if (el.name && state.f[el.name] != null) el.value = state.f[el.name]; });

  form.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) state[t.dataset.k][+t.dataset.i][+t.dataset.c] = t.type === 'checkbox' ? t.checked : t.value;
    else if (t.name) state.f[t.name] = t.value;
    draw();
  });
  form.addEventListener('click', e => {
    const add = e.target.closest('[data-add]'), rm = e.target.closest('[data-rm]');
    if (add) { state[add.dataset.add].push(add.dataset.add === 'steps' ? ['', false] : ['', '']); drawRows(); draw(); const ins = rows[add.dataset.add].querySelectorAll('.pl-row:last-child input:not([type=checkbox])'); if (ins[0]) ins[0].focus(); }
    if (rm) { state[rm.dataset.rm].splice(+rm.dataset.i, 1); drawRows(); draw(); }
  });
  form.addEventListener('submit', e => e.preventDefault());
  document.getElementById('plan-print').addEventListener('click', () => window.print());
  document.getElementById('plan-clear').addEventListener('click', () => {
    if (!state.f.name && !state.f.goal || document.getElementById('plan-clear').dataset.sure) {
      state = { f: {}, team: [['Project chair', ''], ['Secretary', ''], ['Treasurer', '']], budget: [['', '']], steps: STEPS.map(t => [t, false]) };
      form.reset(); drawRows(); draw();
      const b = document.getElementById('plan-clear'); delete b.dataset.sure; b.textContent = 'Start again';
    } else { const b = document.getElementById('plan-clear'); b.dataset.sure = '1'; b.textContent = 'Press again to clear everything'; }
  });
  drawRows(); draw();
})();
