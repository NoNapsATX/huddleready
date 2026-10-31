(function () {
'use strict';
const $ = s => document.querySelector(s);
const view = $('#view'), kids = $('#kids'), kview = $('#kview');

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('hr-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hr-' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- helpers ---------- */
const ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const im = n => `img/${n}.svg`;
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tel = n => 'tel:' + String(n).replace(/[^\d+]/g, '');
const go = h => { if (location.hash.slice(1) === h) route(); else location.hash = h; };
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 1800); }
function fmtDur(ms) { ms = Math.max(0, ms); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return h ? `${h} h ${m} min` : `${m} min`; }
const bar = title => `<header class="bar"><button class="back" data-back aria-label="Back">${ic('arrow-left')}</button><h1>${title}</h1></header>`;

/* ---------- data ---------- */
const UTILS = {
  ae: { name: 'Austin Energy', phone: '512-322-9100', text: 'Or text OUT to 287846' },
  pec: { name: 'Pedernales Electric (PEC)', phone: '888-883-3379', text: '' },
  oncor: { name: 'Oncor', phone: '888-313-4747', text: 'Or text OUT to 66267 if signed up for MyOncor Alerts' },
  bb: { name: 'Bluebonnet Electric', phone: '800-949-4414', text: 'Or text OUT to 44141' },
  other: { name: 'Electric company', phone: '', text: '' }
};
let home = store.get('home', null);
const H = () => home || {};
const apt = () => /^apt/.test(H().type);
const upstairs = () => H().type === 'apt-up';
const hasKids = () => (H().kids || 0) > 0;
const littles = () => hasKids() && ['baby', 'toddler'].includes(H().youngest);
function util() { const h = H(), u = Object.assign({}, UTILS[h.util] || UTILS.other); if (!UTILS[h.util] || h.util === 'other') { u.name = h.utilName || 'Electric company'; u.phone = h.utilPhone || ''; } return u; }
function emergency() {
  const u = util();
  return [['Emergency', '911', 'Text 911 if calls fail'], u.phone ? ['Report outage: ' + u.name, u.phone, u.text] : null,
    ['Poison Control, carbon monoxide', '1-800-222-1222', ''], ['Shelters, food, help (2-1-1 Texas)', '211', ''],
    H().util === 'ae' ? ['Austin city info, shelter rides', '311', 'Or 512-974-2000'] : null].filter(Boolean);
}
function steps() {
  const u = util();
  return [
    ['zap-off', 'Is it just us?', apt() ? 'Check our breaker panel and look outside. Only our unit dark? Call the leasing office.' : "Check our breaker panel and the neighbors' lights. Only our home dark? Check the main breaker."],
    ['phone', 'Report it', u.phone ? `${esc(u.name)}: call ${esc(u.phone)}.${u.text ? ' ' + esc(u.text) + '.' : ''}` : 'Call your electric company. Add its outage number in Our info.', u.phone ? ['Call ' + u.name, u.phone] : null],
    ['radio', 'Radio on', 'Local AM news radio. In Austin, KLBJ 590 AM or 99.7 FM carries city alerts.'],
    ['battery-low', 'Save phone battery', 'Low-power mode. Charge from power banks, never a car in a garage.'],
    ['unplug', 'Unplug electronics', 'TVs and computers. Leave one lamp switched on so we know when power is back.'],
    ['refrigerator', 'Fridge closed', 'The food clock started when you began this checklist.'],
    ['droplets', 'Fill water now', upstairs() ? 'Bathtub and pots. Upper floors lose pressure first.' : 'Bathtub and pots, before the pressure drops.'],
    ['users', 'Everyone together', hasKids() ? 'One room. Flashlights out. No candles near the kids.' : 'One room. Flashlights out. No candles.']
  ];
}
function kit() {
  const k = {
    'This week': ['Download offline maps of our area', 'Sign up at WarnCentralTexas.org', "Sign up for the electric company's outage texts", 'Battery CO alarm in the bedroom', 'Battery or crank radio', 'Find breaker panel and water shutoff', 'Fill in Our info on every phone', apt() ? 'Walk the stairways out at night' : 'Walk the way out at night'],
    'Water and food': ['Drinking water for 14 days', 'Bathtub water bladder', 'No-cook food for 14 days', 'Manual can opener', 'Unscented bleach'],
    'Medicine': ['Adult pain relievers', 'Prescriptions, 2 weeks', 'Thermometer', 'First-aid kit', 'Locked medicine box'],
    'Power and light': ['Headlamp or flashlight each', 'Power bank per adult', 'Power station', 'Folding solar panel', 'Spare batteries'],
    'Go-bags': ['A go-bag per adult', 'Cash in small bills', 'Copies of IDs and insurance', 'Car tank half full']
  };
  if (H().heat === 'gas') k['This week'].splice(3, 0, 'Know how to shut off the gas');
  if (hasKids()) {
    k['Kids'] = [...(littles() ? ['Diapers or pull-ups and wipes', 'Portable potty with liners', 'Spill-proof cups'] : []), "Kids' foods, milk boxes, snacks", 'Warm layers and hats', 'Outage box: books, crayons, toys', 'Phone number in jackets', "Kids' go-bag"];
    k['Medicine'].unshift("Children's fever and pain reliever", "Children's allergy medicine", 'Oral rehydration solution', 'Pediatrician dosing chart');
  }
  return k;
}
function infoFields() {
  return [
    ...(apt() ? [['building', 'Building'], ['unit', 'Unit'], ['gate', 'Gate code']] : []),
    ['outside', "Spot right outside home (if we can't get in)"],
    ['fallback1', 'Fallback 1: nearby (name, address, phone)'], ['fallback2', 'Fallback 2: out of town'],
    ['contact', 'Out-of-area contact (name and phone)'],
    ...(apt() ? [['leasing', 'Leasing office / maintenance phone']] : []),
    ['er', 'Nearest 24-hour ER (name, phone)'],
    ...(hasKids() ? [['pediatrician', 'Pediatrician phone'], ['phone', 'Our phone number (for the kids to practice)']] : [['doctor', 'Doctor phone']])
  ];
}

/* ---------- audio ---------- */
const voice = new Audio(); voice.preload = 'auto';
let queue = [], voiceOn = store.get('voice', true), unlocked = false;
function playNext() { if (!queue.length) return; voice.src = 'audio/' + queue.shift() + '.mp3'; const p = voice.play(); if (p && p.catch) p.catch(() => { queue = []; }); }
voice.addEventListener('ended', playNext);
function say(...keys) { if (!voiceOn) return; queue = keys; try { voice.pause(); } catch (e) {} playNext(); }
function sayAfter(k) { if (!voiceOn) return; queue.push(k); if (voice.paused) playNext(); }
document.addEventListener('pointerdown', () => { if (unlocked) return; unlocked = true; try { voice.src = 'audio/silent.mp3'; const p = voice.play(); if (p && p.catch) p.catch(() => unlocked = false); } catch (e) { unlocked = false; } }, { capture: true });

/* ---------- state ---------- */
let info = store.get('info', {});
const outage = () => store.get('outage', null);
const outTime = () => store.get('outTime', null);

/* ---------- router ---------- */
const R = {};
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [name, ...rest] = h.split('/');
  clearInterval(route.tick);
  if (name === 'kids') { kids.hidden = false; document.body.style.overflow = 'hidden'; (K[rest[0] || 'home'] || K.home)(rest.slice(1)); return; }
  kids.hidden = true; document.body.style.overflow = ''; try { voice.pause(); } catch (e) {}
  if (!home && name !== 'setup') { location.replace('#setup'); return; }
  (R[name] || R.home)(rest);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
view.addEventListener('click', e => {
  const b = e.target.closest('[data-back]'); if (b) { const up = b.dataset.back; go(up || ''); return; }
  const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go);
});

/* ---------- home ---------- */
R.home = () => {
  const o = outage();
  const top = `<div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">Huddle Ready</div><div class="status ${swOK ? 'ok' : ''}" id="status"><i></i><span>${swOK ? 'Works offline' : 'Saving for offline…'}</span></div></div>
    <button class="icon-btn" data-go="details" aria-label="Our info and settings">${ic('settings')}</button></div>`;
  let main;
  if (o) {
    const ft = outTime() || o.start, left = 4 * 3600000 - (Date.now() - ft);
    main = `<div class="live"><div class="live-head"><span class="dot"></span><b>Power out</b><span class="muted" id="elapsed" style="margin-left:auto">${fmtDur(Date.now() - o.start)}</span></div>
      <div class="muted">Fridge: <b id="fridge">${left > 0 ? fmtDur(left) + ' left' : 'past 4-hour limit'}</b></div>
      <div class="row2">${o.done ? `<button class="btn ghost" data-go="stay">Stay or go?</button>` : `<button class="btn" data-go="outage">Continue checklist</button>`}<button class="btn ghost" id="end">Power is back</button></div></div>`;
  } else {
    main = `<button class="sos" id="sos">${ic('zap-off')}<div><b>Power is out</b><span>Start the first 10 minutes</span></div>${ic('chevron-right', 'go')}</button>`;
  }
  const tile = (go, i, t) => `<button class="tile" data-go="${go}">${ic(i)}<span>${t}</span></button>`;
  const where = [info.building && 'Bldg ' + info.building, info.unit && 'Unit ' + info.unit].filter(Boolean).join(', ');
  const u = util();
  view.innerHTML = `<div class="screen">${top}${main}
    <div class="row2"><a class="call" href="tel:911">${ic('siren')}<div><b>911</b><small>Emergency</small></div></a>${u.phone ? `<a class="call" href="${tel(u.phone)}">${ic('phone')}<div><b>Outage</b><small>${esc(u.phone)}</small></div></a>` : `<button class="call" data-go="details">${ic('phone')}<div><b>Outage</b><small>Add number</small></div></button>`}</div>
    <div class="tiles">${tile('stay', 'door-open', 'Stay or go')}${tile('food', 'refrigerator', 'Food clock')}${tile('calls', 'phone', 'Call list')}${tile('plan', 'book-open', 'Plan')}${tile('supplies', 'list-checks', 'Supplies')}${tile('details', 'house', 'Our info')}</div>
    ${hasKids() ? `<button class="kids-btn" data-go="kids"><img src="${im('flashlight')}" alt=""><div><b>Kids Mode</b><span>Story and games with a voice</span></div></button>` : ''}
    <div class="meet">${ic('map-pin')}<span>Meeting point: home${where ? ' (' + esc(where) + ')' : ''}${info.outside ? '. Outside spot: ' + esc(info.outside) : ''}</span></div></div>`;
  const sos = $('#sos'); if (sos) sos.onclick = () => { const now = Date.now(); store.set('outage', { start: now, step: 0, done: false }); store.set('outTime', now); go('outage'); };
  const end = $('#end'); if (end) { let armed = false; end.onclick = () => { if (!armed) { armed = true; end.textContent = 'Tap again to confirm'; setTimeout(() => { armed = false; end.textContent = 'Power is back'; }, 3000); return; } store.set('outage', null); toast('Glad it\'s back. Check food before eating.'); R.home(); }; }
  route.tick = setInterval(() => { const o = outage(); if (!o) return; const e = $('#elapsed'), f = $('#fridge'); const left = 4 * 3600000 - (Date.now() - (outTime() || o.start)); if (e) e.textContent = fmtDur(Date.now() - o.start); if (f) f.textContent = left > 0 ? fmtDur(left) + ' left' : 'past 4-hour limit'; }, 30000);
};

/* ---------- outage checklist ---------- */
R.outage = () => {
  const o = outage() || { start: Date.now(), step: 0, done: false };
  if (!outage()) { store.set('outage', o); store.set('outTime', o.start); }
  const STEPS = steps(); const i = Math.min(o.step, STEPS.length);
  if (i >= STEPS.length) {
    view.innerHTML = `<div class="screen">${bar('First 10 minutes')}<div class="step"><div class="big" style="background:var(--ok-soft);color:var(--ok)">${ic('circle-check')}</div><h2>You're set</h2><p>Check Stay or go every evening. The food clock is running.</p></div>
      <div class="row2"><button class="btn" data-go="stay">Stay or go</button><button class="btn ghost" data-go="food">Food clock</button></div><button class="btn ghost wide" data-go="">Home</button></div>`;
    return;
  }
  const [icon, t, d, act] = STEPS[i];
  view.innerHTML = `<div class="screen">${bar('First 10 minutes')}
    <div class="prog"><i style="width:${(i / STEPS.length) * 100}%"></i></div>
    <div class="step"><span class="step-n">Step ${i + 1} of ${STEPS.length}</span><div class="big">${ic(icon)}</div><h2>${t}</h2><p>${d}</p>${act ? `<a class="btn ghost small" href="${tel(act[1])}">${ic('phone')}${act[0]}</a>` : ''}</div>
    <div class="nav2"><button class="btn ghost" id="prev" ${i === 0 ? 'disabled style="opacity:.4"' : ''} aria-label="Previous step">${ic('arrow-left')}</button><button class="btn danger" id="next">${ic('check')}Done${i === STEPS.length - 1 ? '' : ', next'}</button></div></div>`;
  $('#next').onclick = () => { o.step = i + 1; if (o.step >= STEPS.length) o.done = true; store.set('outage', o); R.outage(); };
  $('#prev').onclick = () => { if (i > 0) { o.step = i - 1; store.set('outage', o); R.outage(); } };
};

/* ---------- stay or go ---------- */
R.stay = () => {
  const s = Object.assign({ season: new Date().getMonth() >= 4 && new Date().getMonth() <= 8 ? 'hot' : 'cold', temp: null, water: 5, co: false, order: false, sick: false, meds: false }, store.get('stay', {}));
  if (s.temp == null) s.temp = s.season === 'hot' ? 30 : 17;
  const save = () => store.set('stay', s);
  function judge() {
    let lv = 0; const why = []; const up = (l, m) => { lv = Math.max(lv, l); why.push(m); };
    if (s.co) up(3, 'Possible carbon monoxide. Everyone outside now, call 911 from outside.');
    if (s.order) up(3, 'Evacuation order or fire. Grab go-bags and leave now.');
    if (s.sick) up(3, 'Someone has warning signs. Treat them (Plan › Medical guide), call 911 if confused or drowsy.');
    if (s.meds) up(2, "A medicine or device can't be kept going. Go somewhere with power today.");
    const lim = hasKids() && H().youngest !== 'teen' ? 16 : 13;
    if (s.season === 'cold') { if (s.temp < lim) up(2, `Warm room ${s.temp}°C is too cold${lim === 16 ? ' for young kids' : ''}.`); else if (s.temp < lim + 2) up(1, `Warm room ${s.temp}°C. Call Fallback 1 and pack the car.`); }
    else { if (s.temp > 32) up(2, `Indoors ${s.temp}°C. Leave by early afternoon.`); else if (s.temp >= 29) up(1, `Indoors ${s.temp}°C${upstairs() ? ' and upper floors get hotter' : ' and rising'}.`); }
    if (s.water < 2) up(2, 'Less than 2 days of water.'); else if (s.water < 3) up(1, 'Water is getting low.');
    const head = ['Stay home', 'Get ready to leave', 'Go to Fallback 1 today', 'Leave now'][lv];
    const fb = lv >= 2 && info.fallback1 ? `<div class="small">Fallback 1: <b>${esc(info.fallback1)}</b></div>` : '';
    return `<div class="verdict v${lv}"><b>${head}</b>${why.length ? '<ul>' + why.map(w => `<li>${w}</li>`).join('') + '</ul>' : '<span>Keep conserving. Check again this evening.</span>'}${fb}</div>`;
  }
  const tog = (k, t) => `<label class="toggle"><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}><span>${t}</span></label>`;
  function draw() {
    view.innerHTML = `<div class="screen">${bar('Stay or go?')}${judge()}
      <div class="seg" role="group" aria-label="Weather"><button aria-pressed="${s.season === 'cold'}" data-season="cold">Cold</button><button aria-pressed="${s.season === 'hot'}" data-season="hot">Hot</button></div>
      <div class="card"><div class="stepper"><div><b>${s.season === 'cold' ? 'Warmest room' : 'Coolest room'}</b><div class="muted small">Indoor temperature</div></div><button data-d="temp,-1" aria-label="Lower">−</button><span class="val">${s.temp}°C</span><button data-d="temp,1" aria-label="Higher">+</button></div></div>
      <div class="card"><div class="stepper"><div><b>Drinking water</b><div class="muted small">Days left</div></div><button data-d="water,-1" aria-label="Less">−</button><span class="val">${s.water} d</span><button data-d="water,1" aria-label="More">+</button></div></div>
      <div class="label">Any of these?</div>
      <div class="list">${tog('co', 'CO alarm, or headaches and dizziness in several people')}${tog('order', 'Evacuation order or fire nearby')}${tog('sick', 'Someone confused, very sleepy or overheated')}${tog('meds', "A medicine or device can't be kept going")}</div></div>`;
    view.querySelectorAll('[data-season]').forEach(b => b.onclick = () => { s.season = b.dataset.season; s.temp = s.season === 'hot' ? 30 : 17; save(); draw(); });
    view.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.d.split(','); s[k] = Math.max(0, s[k] + +d); save(); draw(); });
    view.querySelectorAll('.toggle input').forEach(c => c.onchange = () => { s[c.dataset.k] = c.checked; save(); draw(); });
  }
  draw();
};

/* ---------- food clock ---------- */
R.food = () => {
  function local(ms) { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
  function draw() {
    const t = outTime();
    if (!t) {
      view.innerHTML = `<div class="screen">${bar('Food clock')}<div class="step"><div class="big" style="background:var(--accent-soft);color:var(--warn)">${ic('refrigerator')}</div><h2>Start when the power goes out</h2><p>Keep the doors shut. The clock shows how long food stays safe.</p></div><button class="btn wide" id="now">${ic('clock')}Power just went out</button></div>`;
      $('#now').onclick = () => { store.set('outTime', Date.now()); draw(); }; return;
    }
    const el = Date.now() - t;
    const rows = [['Fridge', 4, 'Then toss milk, meat, leftovers, cut fruit'], ['Full freezer', 48, 'Ice crystals or 4°C or below: can refreeze'], ['Half-full freezer', 24, 'Pack items together']];
    view.innerHTML = `<div class="screen">${bar('Food clock')}
      <div class="card"><span class="muted small">Power out for</span><span class="bigtime">${fmtDur(el)}</span><span class="muted small">since ${new Date(t).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span></div>
      <div class="list">${rows.map(([n, h, tip]) => { const lim = h * 3600000, left = lim - el, f = Math.min(1, el / lim); const c = left <= 0 ? 'bad' : left < lim * .25 ? 'warn' : 'ok'; const col = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--danger)' }[c];
        return `<div class="meter"><div class="top"><b>${n}</b><span class="pill p-${c}">${left > 0 ? fmtDur(left) + ' left' : 'Past safe time'}</span></div><div class="track"><i style="width:${f * 100}%;background:${col}"></i></div><small class="muted">${tip}</small></div>`; }).join('')}</div>
      <p class="muted small" style="padding:0 4px">A fridge thermometer at 4°C or below beats any timer. When in doubt, throw it out.</p>
      <div class="card"><label class="muted small" for="t">Change start time</label><input type="datetime-local" id="t" value="${local(t)}" style="border:0;background:var(--sunk);border-radius:12px;padding:12px"><button class="btn ghost small" id="clear">Reset clock</button></div></div>`;
    $('#t').onchange = e => { const v = new Date(e.target.value).getTime(); if (!isNaN(v)) { store.set('outTime', v); draw(); } };
    let armed = false; $('#clear').onclick = e => { if (!armed) { armed = true; e.target.textContent = 'Tap again to reset'; return; } store.set('outTime', null); draw(); };
  }
  draw(); route.tick = setInterval(() => { if (location.hash === '#food') draw(); }, 60000);
};

/* ---------- call list ---------- */
R.calls = () => {
  const row = ([n, num, sub]) => `<div class="row"><div class="grow"><b>${esc(n)}</b><small>${esc(num)}${sub ? ' · ' + esc(sub) : ''}</small></div><a class="round" href="${tel(num)}" aria-label="Call ${esc(n)}">${ic('phone')}</a></div>`;
  const keys = [['contact', 'Out-of-area contact'], ['fallback1', 'Fallback 1'], ['fallback2', 'Fallback 2'], ['leasing', 'Leasing / maintenance'], ['er', 'Nearest ER'], ['pediatrician', 'Pediatrician'], ['doctor', 'Doctor']];
  const mine = keys.filter(([k]) => info[k]).map(([k, n]) => { const m = String(info[k]).match(/[+\d][\d\s().-]{6,}/); return m ? [n, m[0].trim(), info[k].replace(m[0], '').replace(/[,\s]+$/, '').trim()] : null; }).filter(Boolean);
  view.innerHTML = `<div class="screen">${bar('Call list')}
    <div class="label">Emergency</div><div class="list">${emergency().map(row).join('')}</div>
    <div class="label">Ours</div>${mine.length ? `<div class="list">${mine.map(row).join('')}</div>` : ''}<button class="list row" data-go="details"><div class="grow"><b>${mine.length ? 'Edit our contacts' : 'Add our contacts'}</b><small>Out-of-area contact, fallback places, nearest ER, doctor</small></div>${ic('chevron-right', 'chev')}</button></div>`;
};

/* ---------- plan ---------- */
const PLAN = window.PLAN || [];
R.plan = (rest) => {
  if (rest[0]) return planSection(rest[0], rest[1]);
  const q0 = store.get('planq', '');
  view.innerHTML = `<div class="screen">${bar('Our plan')}
    <label class="search">${ic('search')}<input id="q" type="search" placeholder="Search: fever, freezer, tornado" value="${esc(q0)}" aria-label="Search the plan"></label>
    <div class="list" id="secs"></div></div>`;
  const q = $('#q');
  function list() {
    const t = q.value.trim(); store.set('planq', t);
    const re = t ? new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
    const hits = PLAN.map(s => { const txt = s.text; const n = re ? (txt.match(re) || []).length : 0; return { s, n }; }).filter(x => !re || x.n);
    $('#secs').innerHTML = hits.length ? hits.map(({ s, n }) => `<button class="row" data-go="plan/${s.id}${re ? '/' + encodeURIComponent(t) : ''}"><span class="lead">${ic(s.icon)}</span><div class="grow"><b>${s.title}</b>${re ? `<small>${n} match${n > 1 ? 'es' : ''}</small>` : ''}</div>${ic('chevron-right', 'chev')}</button>`).join('') : `<div class="empty">No matches. Try a shorter word.</div>`;
  }
  q.oninput = list; list();
};
function planSection(id, q) {
  const i = PLAN.findIndex(s => s.id === id); const s = PLAN[i]; if (!s) return go('plan');
  const nx = PLAN[i + 1];
  view.innerHTML = `<div class="screen"><header class="bar"><button class="back" data-back="plan" aria-label="Back to plan">${ic('arrow-left')}</button><h1>${s.title}</h1></header>
    <article class="doc" id="doc">${s.html}</article>
    ${nx ? `<button class="list row" data-go="plan/${nx.id}"><div class="grow"><small>Next</small><b>${nx.title}</b></div>${ic('chevron-right', 'chev')}</button>` : ''}</div>`;
  if (q) {
    const t = decodeURIComponent(q), re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); let first = null;
    const walk = n => { if (n.nodeType === 3) { if (!re.test(n.nodeValue)) return; re.lastIndex = 0; const sp = document.createElement('span'); sp.innerHTML = esc(n.nodeValue).replace(new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); n.replaceWith(sp); first = first || sp; re.lastIndex = 0; } else if (n.nodeType === 1) [...n.childNodes].forEach(walk); };
    walk($('#doc')); if (first) setTimeout(() => first.scrollIntoView({ block: 'center' }), 50);
  }
}

/* ---------- supplies ---------- */
const calcDefault = () => ({ a: H().adults || 2, k: H().kids || 0, d: littles() ? 1 : 0, days: 14 });
let supTab = 'list';
R.supplies = () => {
  const ticks = store.get('kit', {});
  const KIT = kit(); const all = Object.values(KIT).flat(), done = all.filter(x => ticks[x]).length;
  let body;
  if (supTab === 'list') {
    body = `<div class="card"><div class="progress"><div class="track"><i style="width:${done / all.length * 100}%;background:var(--ok)"></i></div><b>${done}/${all.length}</b></div><span class="muted small">Saved on this phone.</span></div>` +
      Object.entries(KIT).map(([g, items]) => `<div class="label">${g}</div><div class="list">${items.map(it => `<label class="chk"><input type="checkbox" data-it="${esc(it)}" ${ticks[it] ? 'checked' : ''}><span>${esc(it)}</span></label>`).join('')}</div>`).join('');
  } else {
    const c = Object.assign(calcDefault(), store.get('calc', {})); const p = c.a + c.k;
    const rows = [['Drinking water', p * c.days + ' gal', '1 gallon per person per day'], ['Meals', p * c.days * 3, '3 per person per day'], ["Kids' snacks", c.k * c.days * 2, '2 a day per child'], ['Diapers or pull-ups', c.d * c.days * 6, 'About 6 a day'], ['Flashlights or headlamps', p, '1 per person'], ['Power banks', Math.max(1, c.a), '1 per adult'], ['Prescriptions', c.days + ' days', 'Each person'], ['Cash', '$' + Math.max(200, p * 50), 'Small bills']];
    const st = (k, t) => `<div class="stepper" style="padding:10px 16px;border-bottom:1px solid var(--line)"><b style="flex:1">${t}</b><button data-c="${k},-1" aria-label="Less">−</button><span class="val" style="font-size:1.3rem">${c[k]}</span><button data-c="${k},1" aria-label="More">+</button></div>`;
    body = `<div class="list">${st('a', 'Adults')}${st('k', 'Children')}${st('d', 'In diapers')}${st('days', 'Days')}</div><div class="list calc"><table>${rows.map(r => `<tr><td>${r[0]}<small>${r[2]}</small></td><td class="n">${r[1]}</td></tr>`).join('')}</table></div>`;
  }
  view.innerHTML = `<div class="screen">${bar('Supplies')}<div class="seg"><button aria-pressed="${supTab === 'list'}" data-t="list">Checklist</button><button aria-pressed="${supTab === 'calc'}" data-t="calc">How much</button></div>${body}</div>`;
  view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { supTab = b.dataset.t; R.supplies(); });
  view.querySelectorAll('[data-it]').forEach(cb => cb.onchange = () => { const t = store.get('kit', {}); if (cb.checked) t[cb.dataset.it] = 1; else delete t[cb.dataset.it]; store.set('kit', t); const y = scrollY; R.supplies(); scrollTo(0, y); });
  view.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = Object.assign(calcDefault(), store.get('calc', {})); const [k, d] = b.dataset.c.split(','); c[k] = Math.max(k === 'days' ? 1 : 0, c[k] + +d); store.set('calc', c); R.supplies(); });
};

/* ---------- our info ---------- */
const TYPE_T = { house: 'House', 'apt-ground': 'Apartment, ground floor', 'apt-up': 'Apartment, upstairs' };
const AGE_T = { baby: 'under 2', toddler: '2 to 5', school: '6 to 12', teen: '13 and up' };
R.details = () => {
  const h = H();
  const sum = `${h.adults || 0} adult${h.adults === 1 ? '' : 's'}${h.kids ? `, ${h.kids} kid${h.kids > 1 ? 's' : ''} (youngest ${AGE_T[h.youngest] || ''})` : ''} · ${TYPE_T[h.type] || ''} · ${h.heat === 'gas' ? 'some gas' : 'all-electric'} · ${esc(util().name)}`;
  view.innerHTML = `<div class="screen">${bar('Our info')}
    <button class="list row" id="redo"><span class="lead">${ic('house')}</span><div class="grow"><b>Our household</b><small>${sum}</small></div>${ic('chevron-right', 'chev')}</button>
    <p class="muted" style="padding:0 4px">Saved on this phone only. Fill these in on every adult's phone.</p>
    <div class="list">${infoFields().map(([k, t]) => `<label class="field"><span>${t}</span><input id="f-${k}" data-k="${k}" value="${esc(info[k] || '')}" autocomplete="off" ${k === 'phone' ? 'inputmode="tel"' : ''}></label>`).join('')}</div>
    <p class="muted small" style="padding:0 4px">Huddle Ready is a planning aid, not medical advice. In an emergency, call 911. Icons: Lucide (ISC). Illustrations: Microsoft Fluent Emoji (MIT).</p></div>`;
  $('#redo').onclick = () => { setupStep = 0; draft = null; go('setup'); };
  let t; view.querySelectorAll('[data-k]').forEach(inp => inp.oninput = () => { info[inp.dataset.k] = inp.value.trim(); store.set('info', info); clearTimeout(t); t = setTimeout(() => toast('Saved'), 600); });
};

/* ---------- setup ---------- */
let setupStep = 0, draft = null;
R.setup = () => {
  if (!draft) draft = Object.assign({ adults: 2, kids: 0, youngest: 'toddler', type: 'house', heat: 'electric', util: 'ae', utilName: '', utilPhone: '' }, home || {});
  const d = draft, first = !home, N = 5, i = setupStep;
  const opt = (k, v, t, sub) => `<button class="opt" aria-pressed="${d[k] === v}" data-o="${k},${v}"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
  const st = (k, t, min) => `<div class="stepper" style="padding:12px 16px;border-bottom:1px solid var(--line)"><b style="flex:1">${t}</b><button data-c="${k},-1,${min}" aria-label="Fewer ${t.toLowerCase()}">−</button><span class="val" style="font-size:1.4rem">${d[k]}</span><button data-c="${k},1,${min}" aria-label="More ${t.toLowerCase()}">+</button></div>`;
  const pages = [
    () => `<h2>Who lives at home?</h2><p class="muted">So checklists and supplies fit your family.</p><div class="list">${st('adults', 'Adults', 1)}${st('kids', 'Kids', 0)}</div>
      ${d.kids ? `<div class="label">Youngest child</div><div class="opts">${opt('youngest', 'baby', 'Under 2')}${opt('youngest', 'toddler', '2 to 5')}${opt('youngest', 'school', '6 to 12')}${opt('youngest', 'teen', '13 and up')}</div>` : ''}`,
    () => `<h2>What kind of home?</h2><p class="muted">Upper floors get hotter and lose water pressure first.</p><div class="opts col">${opt('type', 'house', 'House')}${opt('type', 'apt-ground', 'Apartment or condo', 'Ground floor')}${opt('type', 'apt-up', 'Apartment or condo', 'Upstairs')}</div>`,
    () => `<h2>How do you heat and cook?</h2><p class="muted">Homes with gas need a shutoff plan and extra carbon monoxide care.</p><div class="opts col">${opt('heat', 'electric', 'All electric', 'No gas at home')}${opt('heat', 'gas', 'Some gas', 'Gas heat, stove or water heater')}</div>`,
    () => `<h2>Who is your electric company?</h2><p class="muted">It's on your bill. Their outage number goes on the home screen.</p><div class="opts col">${opt('util', 'ae', 'Austin Energy')}${opt('util', 'pec', 'Pedernales Electric (PEC)')}${opt('util', 'oncor', 'Oncor')}${opt('util', 'bb', 'Bluebonnet Electric')}${opt('util', 'other', 'Someone else')}</div>
      ${d.util === 'other' ? `<div class="list"><label class="field"><span>Company name</span><input id="un" value="${esc(d.utilName)}"></label><label class="field"><span>Outage phone number</span><input id="up" inputmode="tel" value="${esc(d.utilPhone)}"></label></div>` : ''}`,
    () => `<h2>Where do you meet?</h2><p class="muted">Home is the meeting point. Add a backup in case you can't get in. You can fill these in later too.</p><div class="list"><label class="field"><span>Spot right outside home</span><input id="so" placeholder="The mailboxes, a neighbor's porch" value="${esc(info.outside || '')}"></label><label class="field"><span>Fallback 1: somewhere nearby with power</span><input id="sf" placeholder="Name, address, phone" value="${esc(info.fallback1 || '')}"></label><label class="field"><span>Out-of-area contact everyone texts</span><input id="sc" placeholder="Name and phone" value="${esc(info.contact || '')}"></label></div>`
  ];
  view.innerHTML = `<div class="screen setup">${first && i === 0 ? `<div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">Huddle Ready</div><div class="muted small">Five quick questions. Everything stays on this phone.</div></div></div>` : `<header class="bar"><button class="back" id="sback" aria-label="Back">${ic('arrow-left')}</button><h1>${first ? 'Set up' : 'Our household'}</h1></header>`}
    <div class="prog"><i style="width:${(i + 1) / N * 100}%"></i></div><span class="step-n">Question ${i + 1} of ${N}</span>
    <div class="qa">${pages[i]()}</div>
    <button class="btn wide" id="snext">${i === N - 1 ? (first ? 'Make our plan' : 'Save') : 'Next'}</button>
    <p class="muted small" style="text-align:center;margin:0">Huddle Ready is a planning aid, not medical advice.</p></div>`;
  const keep = () => { const g = id => { const el = $('#' + id); return el ? el.value.trim() : null; };
    if (g('un') != null) { d.utilName = g('un'); d.utilPhone = g('up'); }
    if (g('so') != null) { info.outside = g('so'); info.fallback1 = g('sf'); info.contact = g('sc'); store.set('info', info); } };
  view.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { keep(); const [k, v] = b.dataset.o.split(','); d[k] = v; R.setup(); });
  view.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { keep(); const [k, n, min] = b.dataset.c.split(','); d[k] = Math.max(+min, Math.min(12, d[k] + +n)); R.setup(); });
  const sb = $('#sback'); if (sb) sb.onclick = () => { keep(); if (i > 0) { setupStep--; R.setup(); } else { draft = null; go('details'); } };
  $('#snext').onclick = () => { keep();
    if (i < N - 1) { setupStep++; R.setup(); window.scrollTo(0, 0); return; }
    home = Object.assign({}, d); store.set('home', home); store.set('calc', null); draft = null; setupStep = 0; toast(first ? 'Your plan is ready' : 'Saved'); go(''); };
};

/* ================= Kids Mode ================= */
const K = {};
const kbar = (title, extra) => `<div class="k-top"><button class="k-home" data-k="home" aria-label="Kids home"><img src="${im('house')}" alt=""></button><span class="k-title">${title}</span><div class="k-tools">${extra || ''}<button class="k-sound ${voiceOn ? '' : 'off'}" id="snd" aria-label="Voice ${voiceOn ? 'on' : 'off'}">${ic(voiceOn ? 'volume-2' : 'volume-x')}</button></div></div>`;
kview.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) go('kids/' + b.dataset.k); const s = e.target.closest('#snd'); if (s) { voiceOn = !voiceOn; store.set('voice', voiceOn); if (!voiceOn) { queue = []; voice.pause(); } s.classList.toggle('off', !voiceOn); s.innerHTML = ic(voiceOn ? 'volume-2' : 'volume-x'); } });

K.home = () => {
  kview.innerHTML = `<div class="k-top"><div class="k-tools" style="margin-left:0;flex:1;justify-content:space-between"><button class="hold" id="hold">${ic('lock')}Hold to exit<i></i></button><button class="k-sound ${voiceOn ? '' : 'off'}" id="snd" aria-label="Voice">${ic(voiceOn ? 'volume-2' : 'volume-x')}</button></div></div>
    <div class="k-hello"><img src="${im('moon')}" alt=""><h1>Hi, light helpers!</h1></div>
    <div class="k-grid">
      <button class="k-tile c1" data-k="story"><img src="${im('book')}" alt="">Story</button>
      <button class="k-tile c2" data-k="hunt"><img src="${im('flashlight')}" alt="">Flashlight</button>
      <button class="k-tile c3" data-k="safe"><img src="${im('check')}" alt="">Safe?</button>
      <button class="k-tile c4" data-k="pack"><img src="${im('backpack')}" alt="">My bag</button>
      <button class="k-tile c5 wide" data-k="phone"><img src="${im('telephone')}" alt="" style="width:64px;height:64px"><span>Our phone number</span></button>
    </div>`;
  const h = $('#hold'); let t;
  const start = e => { e.preventDefault(); h.classList.add('on'); t = setTimeout(() => { h.classList.remove('on'); go(''); }, 1400); };
  const stop = () => { clearTimeout(t); h.classList.remove('on'); };
  h.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => h.addEventListener(ev, stop));
  h.addEventListener('contextmenu', e => e.preventDefault());
  if (K.home.greeted !== true) { K.home.greeted = true; say('kids_hi'); }
};
kids.addEventListener('transitionend', () => {});

/* story */
const STORY = [['night', '#2c3a78', 'Uh oh, the lights went off! That\'s okay. Our grown-ups have a plan.'], ['hug', '#ffd3e0', 'First, find a grown-up and stay close.'], ['flashlight', '#ffe9a8', 'Get your flashlight. You can be the light helper!'], ['tent', '#cdf3d9', 'We all go to our cozy room and build a blanket fort.'], ['candle', '#ffe0cc', 'We stay away from candles, wires and heaters. Hot things are for grown-ups.'], ['feet', '#dcd6ff', 'If we need to leave, we hold hands and go together.'], ['house', '#cfe8ff', 'If we ever get lost, we stay where we are and ask a helper to find our grown-ups.']];
const SKEY = ['story0g', 'story1', 'story2', 'story3', 'story4', 'story5g', 'story6g'];
let si = 0;
K.story = () => {
  const [p, bg, t] = STORY[si];
  kview.innerHTML = `${kbar('Story')}<div class="k-card"><div class="k-pic" style="background:${bg}"><img src="${im(p)}" alt=""></div><p class="k-text">${t}</p><div class="k-dots">${STORY.map((_, i) => `<span class="${i === si ? 'on' : ''}"></span>`).join('')}</div>
    <div class="k-nav"><button class="k-btn soft" id="sb" ${si === 0 ? 'disabled' : ''}>Back</button><button class="k-btn" id="sn">${si === STORY.length - 1 ? 'Again' : 'Next'}</button></div>
    <button class="k-btn soft" id="sr" style="width:100%">${ic('volume-2')}Read it</button></div>`;
  $('#sn').onclick = () => { si = (si + 1) % STORY.length; K.story(); say(SKEY[si]); };
  $('#sb').onclick = () => { if (si) { si--; K.story(); say(SKEY[si]); } };
  $('#sr').onclick = () => say(SKEY[si]);
};

/* flashlight hunt */
const HUNT = [['flashlight', 'flashlight', .16, .58], ['water', 'cup', .84, .3], ['teddy', 'teddy', .52, .82], ['snack', 'cookie', .2, .86], ['jacket', 'coat', .82, .74]];
K.hunt = () => {
  let found = new Set(), pos = null;
  kview.innerHTML = `${kbar('Flashlight hunt')}<div class="room" id="room"><div class="win"><img src="${im('moon')}" alt=""></div><div class="shelf"></div><div class="rug"></div>
    ${HUNT.map(([k, img, x, y]) => `<img class="item" src="${im(img)}" alt="" style="left:${x * 100}%;top:${y * 100}%">`).join('')}<canvas id="dark" aria-label="Dark room. Move your finger to shine the flashlight."></canvas></div>
    <div class="found" id="found"></div><button class="k-btn soft" id="again" style="width:100%">Play again</button>`;
  const room = $('#room'), cv = $('#dark'), ctx = cv.getContext('2d');
  const chips = () => $('#found').innerHTML = HUNT.map(([k, img]) => `<span class="${found.has(k) ? 'got' : ''}"><img src="${im(img)}" alt=""></span>`).join('');
  function size() { const r = room.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(); }
  function draw() {
    const r = room.getBoundingClientRect(); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, r.width, r.height); ctx.fillStyle = 'rgba(8,10,28,.96)'; ctx.fillRect(0, 0, r.width, r.height);
    const holes = []; if (pos) holes.push([pos.x, pos.y, 86]); HUNT.forEach(([k, , x, y]) => { if (found.has(k)) holes.push([x * r.width, y * r.height, 50]); });
    ctx.globalCompositeOperation = 'destination-out';
    holes.forEach(([x, y, rad]) => { const g = ctx.createRadialGradient(x, y, rad * .4, x, y, rad); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
  }
  function move(e) {
    const r = room.getBoundingClientRect(); pos = { x: e.clientX - r.left, y: e.clientY - r.top };
    HUNT.forEach(([k, , x, y]) => { if (found.has(k)) return; const dx = x * r.width - pos.x, dy = y * r.height - pos.y; if (dx * dx + dy * dy < 44 * 44) { found.add(k); chips(); found.size === HUNT.length ? say('hunt_' + k, 'hunt_all') : say('hunt_' + k); } });
    draw();
  }
  room.addEventListener('pointermove', move); room.addEventListener('pointerdown', e => { try { room.setPointerCapture(e.pointerId); } catch (_) {} move(e); });
  room.addEventListener('pointerleave', () => { pos = null; draw(); });
  $('#again').onclick = () => { found = new Set(); pos = null; chips(); draw(); };
  chips(); requestAnimationFrame(size); window.addEventListener('resize', size, { once: true });
  say('hunt_intro');
};

/* safe or not */
const QUIZ = [['flashlight', 'Using a flashlight in the dark?', 1, 'Flashlights are safe and bright.'], ['candle', 'Touching a candle?', 0, 'Candles are hot. Only grown-ups use them.'], ['hug', 'Staying close to a grown-up?', 1, 'Stay close to your grown-ups.'], ['plug', 'Touching a wire on the ground?', 0, 'Wires can hurt you. Stay far away and tell a grown-up.'], ['cup', 'Drinking water from our water bottle?', 1, 'Water keeps your body happy.'], ['fire', 'Playing next to a heater?', 0, 'Heaters are hot. Play far away.'], ['storm', 'Going outside alone during a storm?', 0, 'Storms are dangerous. Stay inside with a grown-up.'], ['tent', 'Snuggling in a blanket fort?', 1, 'Blanket forts keep us warm.']];
let qi = 0, score = 0;
K.safe = () => {
  let answered = false, timer;
  const [p, q] = QUIZ[qi];
  kview.innerHTML = `${kbar('Safe or not?')}<div class="k-card"><div class="k-pic" style="background:#eef0fa;width:170px;height:170px"><img src="${im(p)}" alt="" style="width:110px;height:110px"></div><p class="k-text">${q}</p>
    <div class="k-nav"><button class="k-yes" id="y"><img src="${im('check')}" alt="">Safe</button><button class="k-no" id="n"><img src="${im('cross')}" alt="">Not safe</button></div>
    <p class="k-say" id="fb" aria-live="polite"></p><div class="k-stars">${QUIZ.map((_, i) => `<img src="${im('star')}" alt="" class="${i < score ? 'lit' : ''}">`).join('')}</div>
    <button class="k-btn soft" id="qr" style="width:100%">${ic('volume-2')}Read it</button></div>`;
  function next() { clearTimeout(timer); qi = (qi + 1) % QUIZ.length; if (qi === 0) { say('quizdone'); score = 0; } K.safe(); if (qi) say('q' + qi); }
  function ans(v) {
    if (answered) return next(); answered = true;
    const [, , safe, why] = QUIZ[qi], right = v === !!safe; if (right) score++;
    $('#fb').textContent = (right ? 'Great job! ' : 'Not quite. ') + why; say('q' + qi + (right ? 'right' : 'wrong') + (qi === 2 ? 'g' : ''));
    kview.querySelectorAll('.k-stars img').forEach((s, i) => s.classList.toggle('lit', i < score));
    timer = setTimeout(next, 4600);
  }
  $('#y').onclick = () => ans(true); $('#n').onclick = () => ans(false); $('#qr').onclick = () => say('q' + qi);
};

/* pack the bag */
const PACK = [['flashlight', 'flashlight', 1], ['water', 'cup', 1], ['tv', 'tv', 0], ['teddy', 'teddy', 1], ['snack', 'cookie', 1], ['candle', 'candle', 0], ['jacket', 'coat', 1], ['medicine', 'pill', 1]];
K.pack = () => {
  let packed = new Set(); const need = PACK.filter(p => p[2]).length;
  function draw() {
    kview.innerHTML = `${kbar('Pack my bag')}<div class="bag"><img src="${im('backpack')}" alt=""><div><b>${packed.size} of ${need}</b><div style="font-size:1rem">${packed.size === need ? 'All packed!' : 'Tap what goes in the bag'}</div></div></div>
      <div class="items">${PACK.map(([k, img], i) => `<button data-i="${i}" class="${packed.has(k) ? 'in' : ''}" aria-label="${k}"><img src="${im(img)}" alt=""></button>`).join('')}</div>
      <button class="k-btn soft" id="again" style="width:100%">Unpack and play again</button>`;
    kview.querySelectorAll('.items button').forEach(b => b.onclick = () => {
      const [k, , ok] = PACK[+b.dataset.i];
      if (ok) { if (!packed.has(k)) { packed.add(k); packed.size === need ? say('pack_' + k, 'pack_done') : say('pack_' + k); draw(); } }
      else { say('pack_' + k); b.classList.remove('oops'); void b.offsetWidth; b.classList.add('oops'); }
    });
    $('#again').onclick = () => { packed = new Set(); draw(); };
  }
  draw(); say('pack_intro');
};

/* phone number */
K.phone = () => {
  const d = String(info.phone || '').replace(/\D/g, '').slice(0, 11); let pi = 0;
  if (!d) { kview.innerHTML = `${kbar('Our number')}<div class="k-card"><div class="k-pic" style="background:#ffe0cc"><img src="${im('telephone')}" alt=""></div><p class="k-text">Ask a grown-up to add our phone number.</p><p style="font-family:var(--ui);font-size:.95rem;color:#5b6280">Grown-ups: exit Kids Mode, tap the gear, fill in "Our phone number".</p></div>`; return; }
  function draw() {
    let h = ''; for (let i = 0; i < d.length; i++) { if (d.length === 10 && (i === 3 || i === 6)) h += '<span class="gap"></span>'; h += `<span class="${i < pi ? 'done' : i === pi ? 'next' : ''}">${i < pi ? d[i] : '•'}</span>`; }
    kview.innerHTML = `${kbar('Our number')}<div class="k-card"><div class="digits">${h}</div><div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map(k => k ? `<button data-n="${k}" class="${k === d[pi] ? 'hint' : ''}">${k}</button>` : '<span></span>').join('')}</div><p class="k-say" id="pf"></p></div>`;
    kview.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      if (b.dataset.n === d[pi]) { pi++; say('d' + b.dataset.n); if (pi >= d.length) { sayAfter('phone_done'); draw(); $('#pf').textContent = 'You know our number!'; setTimeout(() => { pi = 0; draw(); }, 3800); return; } draw(); }
      else { say('phone_try'); $('#pf').textContent = 'Try the glowing button!'; }
    });
  }
  draw(); say('phone_intro');
};

/* ---------- offline ---------- */
let swOK = false;
function setStatus(ok, t) { swOK = ok; const s = $('#status'); if (s) { s.classList.toggle('ok', ok); s.querySelector('span').textContent = t; } }
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => setStatus(true, navigator.onLine ? 'Works offline' : 'Offline · all good')).catch(() => setStatus(false, 'Offline saving unavailable'));
} else setStatus(false, 'Offline saving unavailable');
addEventListener('offline', () => swOK && setStatus(true, 'Offline · all good'));
addEventListener('online', () => swOK && setStatus(true, 'Works offline'));

route();
})();
