(function () {
'use strict';
const $ = s => document.querySelector(s);
const view = $('#view'), kids = $('#kids'), kview = $('#kview');

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('hr-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hr-' + k, JSON.stringify(v)); } catch (e) {} if (store.hook) store.hook(k); }
};

/* ---------- language ---------- */
let lang = store.get('lang', (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en');
const L = (en, es) => lang === 'es' ? es : en;
function setLang(l) { lang = l; store.set('lang', l); document.documentElement.lang = l; }
document.documentElement.lang = lang;
document.documentElement.classList.toggle('big', !!store.get('big', false));

/* ---------- helpers ---------- */
const ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const im = n => `img/${n}.svg`;
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tel = n => 'tel:' + String(n).replace(/[^\d+]/g, '');
const go = h => { if (location.hash.slice(1) === h) route(); else location.hash = h; };
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; el.classList.toggle('high', !!home || !!document.querySelector('.screen.docked')); clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2000); }
function fmtDur(ms) { ms = Math.max(0, ms); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return h ? `${h} h ${m} min` : `${m} min`; }
const bar = title => `<header class="bar"><button class="back" data-back aria-label="${L('Back', 'Atrás')}">${ic('arrow-left')}</button><h1>${title}</h1></header>`;
const fmtDate = ms => new Date(ms).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' });

/* ---------- household ---------- */
const UTILS = {
  ae: { name: 'Austin Energy', phone: '512-322-9100', text: ['Or text OUT to 287846', 'O envía OUT por texto al 287846'] },
  pec: { name: 'Pedernales Electric (PEC)', phone: '888-883-3379', text: null },
  oncor: { name: 'Oncor', phone: '888-313-4747', text: ['Or text OUT to 66267 if signed up for MyOncor Alerts', 'O envía OUT al 66267 si te inscribiste en MyOncor Alerts'] },
  bb: { name: 'Bluebonnet Electric', phone: '800-949-4414', text: ['Or text OUT to 44141', 'O envía OUT por texto al 44141'] },
  other: { name: '', phone: '', text: null }
};
// Best guess only. The setup screen says to check the bill.
const ZIP_UTIL = {
  ae: '78701 78702 78703 78704 78705 78712 78719 78721 78722 78723 78724 78725 78727 78731 78735 78739 78741 78744 78745 78746 78747 78748 78749 78751 78752 78753 78754 78756 78757 78758 78759',
  oncor: '78664 78665 78681 78660 78634 76574',
  pec: '78613 78641 78642 78620 78610 78640 78676 78654 78636 78645 78669 78734 78737 78738 78732',
  bb: '78621 78957 78942'
};
function guessUtil(zip) { for (const k in ZIP_UTIL) if (ZIP_UTIL[k].split(' ').includes(zip)) return k; return null; }

let home = store.get('home', null);
const H = () => home || {};
const NEED = () => H().needs || {};
const apt = () => /^apt/.test(H().type);
const upstairs = () => H().type === 'apt-up';
const hasKids = () => (H().kids || 0) > 0;
const littles = () => hasKids() && ['baby', 'toddler'].includes(H().youngest);
const austin = () => H().util === 'ae' || /^787/.test(H().zip || '');
const vulnerable = () => (hasKids() && H().youngest !== 'teen') || H().older;
function util() {
  const h = H(), base = UTILS[h.util] || UTILS.other, u = { name: base.name, phone: base.phone, text: base.text ? L(...base.text) : '' };
  if (!UTILS[h.util] || h.util === 'other') { u.name = h.utilName || L('Electric company', 'Compañía eléctrica'); u.phone = h.utilPhone || ''; }
  return u;
}

/* ---------- data ---------- */
function emergency() {
  const u = util();
  return [[L('Emergency', 'Emergencia'), '911', L('Text 911 if calls fail', 'Envía un texto al 911 si no entra la llamada')],
    u.phone ? [L('Report outage: ', 'Reportar apagón: ') + u.name, u.phone, u.text] : null,
    [L('Poison Control, carbon monoxide', 'Control de Envenenamiento, monóxido de carbono'), '1-800-222-1222', ''],
    [L('Shelters, food, help (2-1-1 Texas)', 'Refugios, comida, ayuda (2-1-1 Texas)'), '211', ''],
    austin() ? [L('Austin city info, shelter rides', 'Información de Austin, transporte a refugios'), '311', L('Or 512-974-2000', 'O 512-974-2000')] : null].filter(Boolean);
}
function steps() {
  const u = util(), n = NEED();
  const s = [
    ['zap-off', L('Is it just us?', '¿Solo nosotros?'), apt() ? L('Check our breaker panel and look outside. Only our unit dark? Call the leasing office.', 'Revisa el panel de breakers y mira afuera. ¿Solo nuestro apartamento está sin luz? Llama a la oficina.') : L("Check our breaker panel and the neighbors' lights. Only our home dark? Check the main breaker.", 'Revisa el panel de breakers y las luces de los vecinos. ¿Solo nuestra casa está sin luz? Revisa el breaker principal.')],
    ['phone', L('Report it', 'Repórtalo'), u.phone ? `${esc(u.name)}: ${L('call', 'llama al')} ${esc(u.phone)}.${u.text ? ' ' + esc(u.text) + '.' : ''}` : L('Call your electric company. Add its outage number in Our info.', 'Llama a tu compañía eléctrica. Agrega su número en Nuestra info.'), u.phone ? [L('Call ', 'Llamar a ') + u.name, u.phone] : null],
    ['radio', L('Radio on', 'Prende el radio'), austin() ? L('KLBJ 590 AM or 99.7 FM carries Austin city alerts.', 'KLBJ 590 AM o 99.7 FM transmite las alertas de Austin.') : L('Local AM news radio carries emergency alerts.', 'La radio AM de noticias locales transmite las alertas.')],
    ['battery-low', L('Save phone battery', 'Ahorra batería'), L('Low-power mode. Charge from power banks, never a car in a garage.', 'Modo de bajo consumo. Carga con baterías portátiles, nunca con un carro en el garaje.')]
  ];
  if (n.device) s.push(['heart-pulse', L('Medical device', 'Equipo médico'), L("Switch it to battery or the power station. If it can't last until power returns, go somewhere with power now.", 'Pásalo a batería o a la estación de energía. Si no va a durar hasta que vuelva la luz, ve ahora a un lugar con electricidad.')]);
  if (n.coldmed) s.push(['snowflake', L('Cold medicine', 'Medicina fría'), L('Move insulin or other cold medicine to a cooler with ice packs. Check the label for how long it lasts.', 'Pasa la insulina u otra medicina fría a una hielera con hielo. Revisa en la etiqueta cuánto dura.')]);
  s.push(
    ['flame', L('Heat safely', 'Calefacción segura'), L('Never heat the home with a gas oven or stove. Generators and grills only outside, never in the house, garage or carport, at least 20 feet (6 m) from doors and windows.', 'Nunca uses el horno o la estufa de gas para calentar la casa. Generadores y parrillas solo afuera, nunca dentro de la casa, el garaje o la cochera, y al menos a 20 pies (6 metros) de puertas y ventanas.')],
    ['unplug', L('Unplug electronics', 'Desconecta aparatos'), L('TVs and computers. Leave one lamp switched on so we know when power is back.', 'Televisores y computadoras. Deja una lámpara encendida para saber cuándo vuelve la luz.')],
    ['refrigerator', L('Fridge closed', 'Refri cerrado'), L('The food clock started when you began this checklist.', 'El reloj de comida empezó cuando iniciaste esta lista.')],
    ['droplets', L('Fill water now', 'Llena agua ya'), upstairs() ? L('Bathtub and pots. Upper floors lose pressure first.', 'Tina y ollas. Los pisos de arriba pierden presión primero.') : L('Bathtub and pots, before the pressure drops.', 'Tina y ollas, antes de que baje la presión.')],
    ['users', L('Everyone together', 'Todos juntos'), hasKids() ? L('One room. Flashlights out. No candles near the kids.', 'Un solo cuarto. Linternas listas. Nada de velas cerca de los niños.') : L('One room. Flashlights out. No candles.', 'Un solo cuarto. Linternas listas. Nada de velas.')]
  );
  return s;
}
// [id, English, Spanish]
function kit() {
  const n = NEED(), K = [];
  const g = (en, es, items) => K.push([L(en, es), items.filter(Boolean)]);
  g('Water and food', 'Agua y comida', [
    ['water', 'Drinking water for 14 days', 'Agua para tomar para 14 días'], ['bladder', 'Bathtub water bladder', 'Bolsa de agua para la tina'],
    ['food', 'No-cook food for 14 days', 'Comida sin cocinar para 14 días'], ['opener', 'Manual can opener', 'Abrelatas manual'], ['bleach', 'Unscented bleach', 'Cloro sin aroma']
  ]);
  if (hasKids()) g('Kids', 'Niños', [
    littles() && ['diapers', 'Diapers or pull-ups and wipes', 'Pañales y toallitas'], littles() && ['potty', 'Portable potty with liners', 'Bacinica portátil con bolsas'], littles() && ['cups', 'Spill-proof cups', 'Vasos entrenadores'],
    ['kfood', "Kids' foods, milk boxes, snacks", 'Comida de los niños, leche en caja, botanas'], ['layers', 'Warm layers and hats', 'Ropa abrigadora y gorros'],
    ['box', 'Outage box: books, crayons, toys', 'Caja para apagones: libros, crayones, juguetes'], ['jackets', 'Phone number in jackets', 'Número de teléfono en sus chamarras'], ['kbag', "Kids' go-bag", 'Mochila de emergencia de los niños']
  ]);
  g('Medicine', 'Medicinas', [
    hasKids() && ['kmed', "Children's fever and pain reliever", 'Medicina infantil para fiebre y dolor'], hasKids() && ['kall', "Children's allergy medicine", 'Medicina infantil para alergias'],
    hasKids() && ['ors', 'Oral rehydration solution', 'Suero oral'], hasKids() && ['chart', 'Pediatrician dosing chart', 'Tabla de dosis del pediatra'],
    ['amed', 'Adult pain relievers', 'Analgésicos para adultos'], ['rx', 'Prescriptions, 2 weeks', 'Recetas para 2 semanas'], ['thermo', 'Thermometer', 'Termómetro'],
    ['firstaid', 'First-aid kit', 'Botiquín de primeros auxilios'], ['lockbox', 'Locked medicine box', 'Caja con llave para medicinas']
  ]);
  if (n.device || n.coldmed || n.stairs || n.nocar || H().older) g('Special needs', 'Necesidades especiales', [
    n.device && ['stear', 'Register with STEAR (call 211)', 'Registrarse en STEAR (llama al 211)'],
    n.device && ['devpower', 'Power station big enough for the device', 'Estación de energía suficiente para el equipo'],
    n.device && ['medlist', "Ask the electric company about its medical needs list", 'Preguntar a la compañía eléctrica por su lista de necesidades médicas'],
    n.coldmed && ['cooler', 'Cooler and ice packs for medicine', 'Hielera y hielo para la medicina'],
    n.coldmed && ['pharm', 'Ask the pharmacist how long it lasts unrefrigerated', 'Preguntar al farmacéutico cuánto dura sin refrigerar'],
    n.stairs && ['helper', 'Ask a neighbor to help on stairs', 'Pedir a un vecino que ayude con las escaleras'],
    n.nocar && ['ride', 'Plan a ride: neighbor, family or 211', 'Planear transporte: vecino, familia o 211'],
    n.nocar && ['center', 'Know the nearest warming or cooling center', 'Saber dónde está el centro de calor o frescura más cercano'],
    H().older && ['oldwarm', 'Extra blankets and hats for older adults', 'Cobijas y gorros extra para los mayores']
  ]);
  if (H().pets) g('Pets', 'Mascotas', [['petfood', 'Pet food and water, 2 weeks', 'Comida y agua para mascotas, 2 semanas'], ['carrier', 'Leash, carrier and vet records', 'Correa, transportadora y registros del veterinario']]);
  g('Light, power and safety', 'Luz, energía y seguridad', [
    ['co', 'Battery CO alarm in the bedroom', 'Alarma de monóxido de carbono con baterías en el cuarto'],
    ['radio', 'Battery or crank radio', 'Radio de baterías o de manivela'],
    ['whistle', 'A whistle for each go-bag', 'Un silbato para cada mochila'],
    ['ext', 'ABC fire extinguisher', 'Extintor ABC'],
    ['light', 'Headlamp or flashlight each', 'Lámpara de cabeza o linterna para cada uno'], ['bank', 'Power bank per adult', 'Batería portátil por adulto'],
    ['station', 'Power station', 'Estación de energía portátil'], ['solar', 'Folding solar panel', 'Panel solar plegable'], ['batt', 'Spare batteries', 'Baterías de repuesto']
  ]);
  g('Go-bags', 'Mochilas de emergencia', [
    ['bags', 'A go-bag per adult', 'Una mochila por adulto'], ['cash', 'Cash in small bills', 'Efectivo en billetes chicos'],
    ['ids', 'Copies of IDs and insurance', 'Copias de identificaciones y seguros'], ['tank', 'Car tank half full', 'Tanque del carro a la mitad']
  ]);
  return K.map(([t, items]) => [t, items.map(([id, en, es]) => [id, L(en, es)])]);
}
function infoFields() {
  return [
    ...(apt() ? [['building', L('Building', 'Edificio')], ['unit', L('Unit', 'Apartamento')], ['gate', L('Gate code', 'Código de la reja')]] : []),
    ['outside', L("Spot right outside home (if we can't get in)", 'Lugar justo afuera de casa (si no podemos entrar)')],
    ['fallback1', L('Fallback 1: nearby (name, address, phone)', 'Plan B 1: cerca (nombre, dirección, teléfono)')],
    ['fallback2', L('Fallback 2: out of town', 'Plan B 2: fuera de la ciudad')],
    ['contact', L('Out-of-area contact (name and phone)', 'Contacto fuera del área (nombre y teléfono)')],
    ...(apt() ? [['leasing', L('Leasing office / maintenance phone', 'Teléfono de la oficina / mantenimiento')]] : []),
    ['er', L('Nearest 24-hour ER (name, phone)', 'Sala de emergencias 24 horas más cercana (nombre, teléfono)')],
    ...(hasKids() ? [['pediatrician', L('Pediatrician phone', 'Teléfono del pediatra')]] : [['doctor', L('Doctor phone', 'Teléfono del doctor')]]),
    ['phone', L('Our phone number', 'Nuestro número de teléfono')]
  ];
}

/* ---------- audio (recorded clips, English and Spanish) ---------- */
const voice = new Audio(); voice.preload = 'auto';
let queue = [], voiceOn = store.get('voice', true), unlocked = false;
const canSpeak = () => voiceOn;
function playNext() { if (!queue.length) return; voice.src = 'audio/' + (lang === 'es' ? 'es/' : '') + queue.shift() + '.mp3'; const p = voice.play(); if (p && p.catch) p.catch(() => { queue = []; }); }
voice.addEventListener('ended', playNext);
function say(...keys) { if (!canSpeak()) return; queue = keys; try { voice.pause(); } catch (e) {} playNext(); }
function sayAfter(k) { if (!canSpeak()) return; queue.push(k); if (voice.paused) playNext(); }
document.addEventListener('pointerdown', () => { if (unlocked) return; unlocked = true; try { voice.src = 'audio/silent.mp3'; const p = voice.play(); if (p && p.catch) p.catch(() => unlocked = false); } catch (e) { unlocked = false; } }, { capture: true });

/* ---------- state ---------- */
let info = store.get('info', {});
const outage = () => store.get('outage', null);
const outTime = () => store.get('outTime', null);

/* ---------- router ---------- */
const R = {};
let danceStop = null, bedStop = null, pageStop = null;
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [name, ...rest] = h.split('/');
  clearInterval(route.tick); if (name !== 'calls') callEdit = false;
  if (pageStop) { const f = pageStop; pageStop = null; try { f(); } catch (e) {} }
  document.documentElement.classList.toggle('night', !!outage());
  if (danceStop && !(name === 'kids' && rest[0] === 'dance')) danceStop();
  if (bedStop && !(name === 'kids' && rest[0] === 'bed')) bedStop();
  if (name === 'kids') { const tb = $('#tabbar'); if (tb) tb.hidden = true; kids.hidden = false; kids.classList.toggle('kbed', rest[0] === 'bed'); document.body.style.overflow = 'hidden'; (K[rest[0] || 'home'] || K.home)(rest.slice(1)); return; }
  kids.hidden = true; document.body.style.overflow = ''; try { voice.pause(); } catch (e) {}
  if (!home && name !== 'setup' && name !== 'import' && name !== 'install' && name !== 'join' && name !== 'addlist') { location.replace('#setup'); return; }
  (R[name] || R.home)(rest);
  tabbar(R[name] ? name : '');
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
view.addEventListener('click', e => {
  const b = e.target.closest('[data-back]'); if (b) { const up = b.dataset.back; go(up || ''); return; }
  const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go);
});

/* ---------- home ---------- */
/* ---------- readiness: ten things, and the one to do next ---------- */
function readiness() {
  const kitT = store.get('kit2', {}), drill = store.get('lastDrill', 0), yr = 365 * 864e5;
  const items = [
    ['setup', !(H().skipped || []).length, L('Finish setting up', 'Termina de configurar'), 'setup/resume', 'list-checks'],
    ['contact', !!info.contact, L('Add an out-of-area contact', 'Agrega un contacto fuera del área'), 'details', 'users'],
    ['cross', !!H().cross, L('Save your cross streets for 911', 'Guarda tus calles para el 911'), 'setup/edit', 'map-pin'],
    ['co', !!kitT.co, L('Get a battery carbon monoxide alarm', 'Consigue una alarma de monóxido de carbono con baterías'), 'supplies', 'siren'],
    ['water', !!kitT.water, L('Store 14 days of drinking water', 'Guarda agua para 14 días'), 'supplies', 'droplets'],
    ['light', !!(kitT.light && kitT.bank), L('Flashlights and a power bank for each adult', 'Linternas y una batería portátil por adulto'), 'supplies', 'flashlight'],
    ['radio', !!kitT.radio, L('Get a battery or crank radio', 'Consigue un radio de baterías o de manivela'), 'supplies', 'radio'],
    ['fallback', !!info.fallback1, L('Pick a nearby place with power (Fallback 1)', 'Elige un lugar cercano con luz (Plan B 1)'), 'details', 'house'],
    ['near', !!store.get('near', null), L('Save nearby ERs and fire stations', 'Guarda las emergencias y bomberos cercanos'), 'near', 'locate'],
    ['drill', drill && Date.now() - drill < yr, L('Do a 5-minute practice drill', 'Haz un simulacro de 5 minutos'), 'drill', 'timer']
  ];
  const done = items.filter(x => x[1]).length;
  let next = items.find(x => !x[1]);
  if (checkDue()) next = ['check', false, L('Time for your twice-a-year check', 'Toca la revisión de cada seis meses'), 'check', 'bell'];
  return { done, total: items.length, next, items };
}
const greet = () => { const f = (H().family || '').trim(); return f ? L(`Hi, ${esc(f)} family`, `Hola, familia ${esc(f)}`) : L('Hi there', 'Hola'); };

function skillStrip(out) {
  return `<button class="sk-btn" data-go="skills"><span class="qa-ic t-green">${ic('book-open')}</span><div class="grow"><b>${L('Skills and how-tos', 'Habilidades y guías')}</b><small>${L('First aid, fire, knots, light, home', 'Primeros auxilios, fuego, nudos, luz, casa')}</small></div>${ic('chevron-right', 'chev')}</button>`;
}
R.home = () => {
  const o = outage();
  const top = `<div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">${greet()}</div><div class="status ${swOK ? 'ok' : ''}" id="status"><i></i><span>${swOK ? L('Works offline', 'Funciona sin internet') : L('Saving for offline…', 'Guardando para usar sin internet…')}</span></div></div>
    <button class="lang-chip" id="lang" lang="${lang === 'es' ? 'en' : 'es'}" aria-label="${L('Cambiar a español', 'Switch to English')}">${ic('languages')}${L('ES', 'EN')}</button><button class="icon-btn" data-go="details" aria-label="${L('Our info and settings', 'Nuestra info y ajustes')}">${ic('settings')}</button></div>`;
  const u = util();
  const where = [info.building && L('Bldg ', 'Edif. ') + info.building, info.unit && L('Unit ', 'Apto. ') + info.unit].filter(Boolean).join(', ');
  const qa = (go, i, t, tone) => `<button class="qa-tile t-${tone}" data-go="${go}"><span class="qa-ic">${ic(i)}</span><span>${t}</span></button>`;
  let body;
  if (o) {
    const ft = outTime() || o.start, left = 4 * 3600000 - (Date.now() - ft);
    body = `<div class="live"><div class="live-head"><span class="dot"></span><b>${L('Power out', 'Sin luz')}</b><span class="muted" id="elapsed" style="margin-left:auto">${fmtDur(Date.now() - o.start)}</span></div>
      <div class="muted">${L('Fridge', 'Refri')}: <b id="fridge">${fridgeLeft(left)}</b></div>
      <div class="row2">${o.done ? `<button class="btn ghost" data-go="stay">${L('Stay or go?', '¿Quedarse o irse?')}</button>` : `<button class="btn" data-go="outage">${L('Continue checklist', 'Seguir la lista')}</button>`}<button class="btn ghost" id="end">${L('Power is back', 'Ya volvió la luz')}</button></div></div>
      <div class="row2"><a class="call" href="tel:911">${ic('siren')}<div><b>911</b><small>${L('Emergency', 'Emergencia')}</small></div></a>${u.phone ? `<a class="call" href="${tel(u.phone)}">${ic('phone')}<div><b>${L('Outage', 'Apagón')}</b><small>${esc(u.phone)}</small></div></a>` : ''}</div>
      ${H().cross ? `<div class="where">${ic('map-pin')}<span>${L('Tell 911: we\'re near', 'Dile al 911: estamos cerca de')} <b>${esc(H().cross)}</b></span></div>` : ''}
      ${dayCheckHTML(o)}
      <div class="qa-row">${qa('stay', 'door-open', L('Stay or go', 'Quedarse o irse'), 'blue')}${qa('food', 'refrigerator', L('Food clock', 'Reloj de comida'), 'amber')}${qa('skills/c-aid', 'heart-pulse', L('First aid', 'Primeros auxilios'), 'red')}</div>
      <div class="qa-row">${qa('light', 'lamp-desk', L('Night-light', 'Lamparita'), 'amber')}${qa('notes', 'notebook-pen', L('Notes', 'Notas'), 'blue')}${qa('near', 'locate', L('Help near me', 'Ayuda cerca'), 'green')}</div>
      ${skillStrip(true)}`;
  } else {
    const r = readiness(), pct = Math.round(r.done / r.total * 100);
    body = `<button class="sos" id="sos">${ic('zap-off')}<div><b>${L('Power is out', 'Se fue la luz')}</b><span>${L('Start the first 10 minutes', 'Empieza los primeros 10 minutos')}</span></div>${ic('chevron-right', 'go')}</button>
      ${installCardHTML()}
      ${skillStrip(false)}
      <section class="ready" aria-label="${L('Readiness', 'Preparación')}">
        <div class="ready-top"><div class="ring" style="--p:${pct}"><span>${r.done}<small>/${r.total}</small></span></div>
          <div><b>${r.done === r.total ? L("You're ready", 'Están listos') : L('Your readiness', 'Su preparación')}</b><small>${r.done === r.total ? L('Keep it fresh with the twice-a-year check.', 'Manténganlo al día con la revisión de cada seis meses.') : L(`${r.total - r.done} steps to go`, `Faltan ${r.total - r.done} pasos`)}</small></div></div>
        ${r.next ? `<button class="next" data-go="${r.next[3]}"><span class="qa-ic">${ic(r.next[4])}</span><div><small>${L('Next step', 'Siguiente paso')}</small><b>${r.next[2]}</b></div>${ic('chevron-right', 'chev')}</button>` : ''}
        <button class="linkish" data-go="ready">${L('See all 10', 'Ver los 10')}</button>
      </section>
      <div class="qa-row">${qa('stay', 'door-open', L('Stay or go', 'Quedarse o irse'), 'blue')}${qa('food', 'refrigerator', L('Food clock', 'Reloj de comida'), 'amber')}${qa('supplies', 'list-checks', L('Supplies', 'Provisiones'), 'green')}</div>
      <button class="search home-search" data-go="find">${ic('search')}<span>${L('Search: fever, freezer, generator…', 'Buscar: fiebre, congelador, generador…')}</span></button>`;
  }
  view.innerHTML = `<div class="screen home">${top}${body}
    <div class="meet">${ic('map-pin')}<span>${L('Meeting point: home', 'Punto de reunión: casa')}${where ? ' (' + esc(where) + ')' : ''}${info.outside ? L('. Outside spot: ', '. Lugar afuera: ') + esc(info.outside) : ''}</span></div></div>`;
  $('#lang').onclick = () => { setLang(lang === 'es' ? 'en' : 'es'); R.home(); tabbar(''); };
  if (o) bindDayCheck(); else bindInstallCard();
  const sos = $('#sos'); if (sos) sos.onclick = () => { const now = Date.now(); store.set('outage', { start: now, step: 0, done: false }); store.set('outTime', now); go('outage'); };
  const end = $('#end'); if (end) { let armed = false; end.onclick = () => { if (!armed) { armed = true; end.textContent = L('Tap again to confirm', 'Toca otra vez para confirmar'); setTimeout(() => { armed = false; end.textContent = L('Power is back', 'Ya volvió la luz'); }, 3000); return; } store.set('outage', null); document.documentElement.classList.remove('night'); toast(L('Glad it\'s back. Check food before eating.', 'Qué bueno. Revisa la comida antes de comer.')); R.home(); }; }
  route.tick = setInterval(() => { const o = outage(); if (!o) return; const e = $('#elapsed'), f = $('#fridge'); const left = 4 * 3600000 - (Date.now() - (outTime() || o.start)); if (e) e.textContent = fmtDur(Date.now() - o.start); if (f) f.textContent = fridgeLeft(left); }, 30000);
};
R.ready = () => {
  const r = readiness();
  view.innerHTML = `<div class="screen">${bar(L('Your readiness', 'Su preparación'))}
    <p class="muted" style="padding:0 4px">${L('Ten things that matter most in an outage. Tap one to do it.', 'Las diez cosas que más importan en un apagón. Toca una para hacerla.')}</p>
    <div class="list">${r.items.map(([id, ok, t, go, icn]) => `<button class="row" data-go="${go}"><span class="lead ${ok ? 'ok' : ''}">${ic(ok ? 'circle-check' : icn)}</span><div class="grow"><b class="${ok ? 'done' : ''}">${t}</b></div>${ok ? '' : ic('chevron-right', 'chev')}</button>`).join('')}</div></div>`;
};
/* ---------- fridge sheet (print or save as PDF) ---------- */
R.sheet = () => {
  const u = util(), r = readiness(), h = H();
  const contacts = [['contact', L('Out-of-area contact', 'Contacto fuera del área')], ['fallback1', L('Fallback 1', 'Plan B 1')], ['fallback2', L('Fallback 2', 'Plan B 2')], ['er', L('Nearest ER', 'Emergencias')], ['pediatrician', L('Pediatrician', 'Pediatra')], ['doctor', L('Doctor', 'Doctor')], ['leasing', L('Leasing office', 'Oficina')]].filter(([k]) => info[k]);
  const extra = (info.extra || []).filter(x => x.p);
  const near = store.get('near', null);
  const nearRows = near ? [...(near.er || []).slice(0, 2), ...(near.fire || []).slice(0, 1), ...(near.pharm || []).slice(0, 1)] : [];
  const lim = vulnerable() ? 16 : 13;
  view.innerHTML = `<div class="screen sheet-screen">${bar(L('Fridge sheet', 'Hoja para el refri'))}
    <div class="noprint row2"><button class="btn" id="pr">${ic('printer')}${L('Print or save as PDF', 'Imprimir o guardar PDF')}</button><button class="btn ghost" data-go="details">${L('Edit details', 'Editar datos')}</button></div>
    <p class="noprint muted small" style="padding:0 4px">${L('Tape it inside a kitchen cabinet. Print a new one after you change anything.', 'Pégala dentro de un gabinete de la cocina. Imprime otra cuando cambies algo.')}</p>
    <article class="sheet">
      <header><img src="icons/icon-192.png" alt=""><div><h2>${h.family ? L(`The ${esc(h.family)} family outage plan`, `Plan para apagones de la familia ${esc(h.family)}`) : L('Our outage plan', 'Nuestro plan para apagones')}</h2><p>${L('Printed', 'Impreso el')} ${new Date().toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div></header>
      <section class="sh-sos"><b>911</b> ${L('Life-threatening emergency. If calls fail, text 911.', 'Emergencia de vida o muerte. Si no entra la llamada, envía un texto al 911.')}${h.cross ? `<br>${L("Tell them we're near", 'Diles que estamos cerca de')} <b>${esc(h.cross)}${h.zip ? ', ' + esc(h.zip) : ''}</b>` : ''}</section>
      <div class="sh-cols">
        <section><h3>${L('Numbers', 'Teléfonos')}</h3><table>
          ${u.phone ? `<tr><td>${L('Report outage', 'Reportar apagón')}: ${esc(u.name)}</td><td>${esc(u.phone)}</td></tr>` : ''}
          <tr><td>${L('Poison Control, carbon monoxide', 'Control de Envenenamiento')}</td><td>1-800-222-1222</td></tr>
          <tr><td>${L('Shelters and help', 'Refugios y ayuda')} (2-1-1)</td><td>211</td></tr>
          ${austin() ? `<tr><td>Austin 311</td><td>311</td></tr>` : ''}
          ${contacts.map(([k, t]) => `<tr><td>${t}</td><td>${esc(info[k])}</td></tr>`).join('')}
          ${extra.map(x => `<tr><td>${esc(x.n)}</td><td>${esc(x.p)}</td></tr>`).join('')}
          ${nearRows.map(x => `<tr><td>${esc(x.n)} (${x.d} mi)</td><td>${esc(x.p || '')}</td></tr>`).join('')}
        </table>
        <h3>${L('Where we meet', 'Dónde nos reunimos')}</h3><p>${L('Home', 'Casa')}${info.building || info.unit ? ` (${[info.building && L('Bldg ', 'Edif. ') + info.building, info.unit && L('Unit ', 'Apto. ') + info.unit].filter(Boolean).join(', ')})` : ''}${info.outside ? `. ${L("If we can't get in", 'Si no podemos entrar')}: <b>${esc(info.outside)}</b>` : ''}${info.fallback1 ? `. ${L('If home is unsafe', 'Si la casa no es segura')}: <b>${esc(info.fallback1)}</b>` : ''}.</p></section>
        <section><h3>${L('First 10 minutes', 'Primeros 10 minutos')}</h3><ol>${steps().map(([, t, d]) => `<li><b>${t}.</b> ${d.replace(/<[^>]+>/g, '')}</li>`).join('')}</ol></section>
      </div>
      <div class="sh-cols">
        <section><h3>${L('Leave when', 'Váyanse cuando')}</h3><ul>
          <li>${L(`The warmest room stays below ${lim}°C (${Math.round(lim * 9 / 5 + 32)}°F)`, `El cuarto más tibio sigue abajo de ${lim}°C (${Math.round(lim * 9 / 5 + 32)}°F)`)}</li>
          <li>${L('Indoors stays above 32°C (90°F)', 'Adentro sigue arriba de 32°C (90°F)')}</li>
          <li>${L('Less than 2 days of water', 'Quedan menos de 2 días de agua')}</li>
          <li>${L("A medicine or device can't be kept going", 'Una medicina o equipo no se puede mantener')}</li>
          <li><b>${L('Now', 'Ya')}:</b> ${L('CO alarm, fire or an evacuation order', 'alarma de monóxido, incendio u orden de evacuación')}</li></ul>
        <h3>${L('Food', 'Comida')}</h3><p>${L('Fridge: 4 hours. Full freezer: 48 hours. Half full: 24 hours. Keep doors shut. When in doubt, throw it out.', 'Refri: 4 horas. Congelador lleno: 48 horas. A la mitad: 24 horas. Mantén las puertas cerradas. Si tienes dudas, tíralo.')}</p>
        <h3>${L('Never indoors', 'Nunca adentro')}</h3><p>${L('Generators, grills, camp stoves, or a gas oven for heat. Carbon monoxide has no smell.', 'Generadores, parrillas, estufas de campamento, ni el horno de gas para calentar. El monóxido de carbono no tiene olor.')}</p></section>
        <section class="sh-next"><h3>${L('Our next steps to get ready', 'Nuestros siguientes pasos')}</h3><p class="sh-score">${r.done} ${L('of', 'de')} ${r.total} ${L('done', 'listos')}</p>
          <ul class="boxes">${r.items.filter(x => !x[1]).map(x => `<li>${x[2]}</li>`).join('') || `<li>${L('All done. Do the twice-a-year check in March and November.', 'Todo listo. Hagan la revisión de cada seis meses en marzo y noviembre.')}</li>`}</ul>
          <p class="small">${L('Twice a year, when the clocks change: test alarms, charge power banks, check medicine dates, rotate water, practice.', 'Dos veces al año, cuando cambia la hora: prueben alarmas, carguen baterías, revisen medicinas, cambien el agua y practiquen.')}</p></section>
      </div>
      <footer>${L('Huddle Ready is a planning aid, not medical advice. Official orders come first.', 'Huddle Ready es una ayuda para planear, no es consejo médico. Las órdenes oficiales van primero.')} nonapsatx.github.io/huddleready</footer>
    </article></div>`;
  $('#pr').onclick = () => window.print();
};

/* bottom tabs */
function tabbar(name) {
  const tb = $('#tabbar'); if (!tb) return;
  const hide = !home || ['setup', 'import', 'outage', 'drill'].includes(name);
  tb.hidden = hide; document.body.classList.toggle('has-tabs', !hide);
  if (hide) return;
  const tabs = [['', 'house', L('Home', 'Inicio')], ['calls', 'phone', L('Calls', 'Teléfonos')], ['plan', 'book-open', L('Guides', 'Guías')], hasKids() ? ['kids', 'baby', L('Kids', 'Niños')] : ['supplies', 'list-checks', L('Supplies', 'Provisiones')]];
  tb.innerHTML = tabs.map(([g, i, t]) => `<button data-tab="${g}" aria-current="${(g === '' ? !name || name === 'home' : name === g || (g === 'plan' && name === 'skills')) ? 'page' : 'false'}">${ic(i)}<span>${t}</span></button>`).join('');
}
document.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) go(t.dataset.tab); });
const fridgeLeft = left => left > 0 ? fmtDur(left) + L(' left', ' restantes') : L('past 4-hour limit', 'pasó el límite de 4 horas');

/* ---------- outage checklist and practice drill ---------- */
function checklist(drill) {
  const STEPS = steps();
  const o = drill ? (R.drill.state = R.drill.state || { step: 0 }) : (outage() || { start: Date.now(), step: 0, done: false });
  if (!drill && !outage()) { store.set('outage', o); store.set('outTime', o.start); }
  const i = Math.min(o.step, STEPS.length);
  const title = drill ? L('Practice drill', 'Simulacro') : L('First 10 minutes', 'Primeros 10 minutos');
  const banner = drill ? `<div class="drill-banner">${ic('timer')}<span>${L("Practice only. Nothing is reported and no timers start. Do each step for real where you can: find the flashlights, check the breaker panel, gather in one room.", 'Solo práctica. No se reporta nada ni empieza ningún reloj. Haz cada paso de verdad cuando puedas: busca las linternas, revisa el panel de breakers, reúnanse en un cuarto.')}</span></div>` : '';
  if (i >= STEPS.length) {
    if (drill) {
      store.set('lastDrill', Date.now());
      view.innerHTML = `<div class="screen">${bar(title)}<div class="step"><div class="big" style="background:var(--ok-soft);color:var(--ok)">${ic('circle-check')}</div><h2>${L('Drill done', 'Simulacro listo')}</h2><p>${L('Nice work. Write down anything you couldn\'t find, and add it to Supplies. Practice again each fall and spring.', 'Buen trabajo. Anota lo que no encontraste y agrégalo a Provisiones. Practiquen otra vez cada otoño y primavera.')}</p></div>
        ${hasKids() ? `<button class="btn wide" data-go="kids/story">${L('Read the outage story with the kids', 'Lean el cuento del apagón con los niños')}</button>` : ''}<div class="row2"><button class="btn ghost" data-go="supplies">${L('Supplies', 'Provisiones')}</button><button class="btn ghost" data-go="">${L('Home', 'Inicio')}</button></div></div>`;
      R.drill.state = null; return;
    }
    view.innerHTML = `<div class="screen">${bar(title)}<div class="step"><div class="big" style="background:var(--ok-soft);color:var(--ok)">${ic('circle-check')}</div><h2>${L("You're set", 'Listo')}</h2><p>${L('Check Stay or go every evening. The food clock is running.', 'Revisa Quedarse o irse cada noche. El reloj de comida está corriendo.')}</p></div>
      <div class="row2"><button class="btn" data-go="stay">${L('Stay or go', 'Quedarse o irse')}</button><button class="btn ghost" data-go="food">${L('Food clock', 'Reloj de comida')}</button></div><button class="btn ghost wide" data-go="">${L('Home', 'Inicio')}</button></div>`;
    return;
  }
  const [icon, t, d, act] = STEPS[i];
  const action = act ? (drill ? `<div class="muted small">${L('In a real outage you would tap', 'En un apagón de verdad tocarías')} “${esc(act[0])}”.</div>` : `<a class="btn ghost small" href="${tel(act[1])}">${ic('phone')}${esc(act[0])}</a>`) : '';
  view.innerHTML = `<div class="screen docked${drill ? ' is-drill' : ''}">${bar(title)}${banner}
    <div class="prog"><i style="width:${(i / STEPS.length) * 100}%"></i></div>
    <div class="step"><span class="step-n">${L('Step', 'Paso')} ${i + 1} ${L('of', 'de')} ${STEPS.length}</span><div class="big">${ic(icon)}</div><h2>${t}</h2><p>${d}</p>${action}</div>
    <div class="nav2 sticky"><button class="btn ghost" id="prev" ${i === 0 ? 'disabled style="opacity:.4"' : ''} aria-label="${L('Previous step', 'Paso anterior')}">${ic('arrow-left')}</button><button class="btn ${drill ? '' : 'danger'}" id="next">${ic('check')}${L('Done', 'Hecho')}${i === STEPS.length - 1 ? '' : L(', next', ', sigue')}</button></div></div>`;
  const save = () => { if (!drill) store.set('outage', o); };
  $('#next').onclick = () => { o.step = i + 1; if (o.step >= STEPS.length && !drill) o.done = true; save(); checklist(drill); window.scrollTo(0, 0); };
  $('#prev').onclick = () => { if (i > 0) { o.step = i - 1; save(); checklist(drill); } };
}
R.outage = () => checklist(false);
R.drill = () => checklist(true);

/* ---------- stay or go ---------- */
R.stay = () => {
  const s = Object.assign({ season: new Date().getMonth() >= 4 && new Date().getMonth() <= 8 ? 'hot' : 'cold', temp: null, water: 5, co: false, order: false, sick: false, meds: false }, store.get('stay', {}));
  if (s.temp == null) s.temp = s.season === 'hot' ? 30 : 17;
  const save = () => store.set('stay', s), n = NEED();
  function judge() {
    let lv = 0; const why = []; const up = (l, m) => { lv = Math.max(lv, l); why.push(m); };
    if (s.co) up(3, L('Possible carbon monoxide. Everyone outside now, call 911 from outside.', 'Posible intoxicación por monóxido de carbono, un gas sin olor ni color. Todos afuera al aire libre ya, y llama al 911 desde afuera.'));
    if (s.order) up(3, L('Evacuation order or fire. Grab go-bags and leave now.', 'Orden de evacuación o incendio. Agarren las mochilas y salgan ya.'));
    if (s.sick) up(3, L('Someone has warning signs. Treat them (Plan › Medical guide), call 911 if confused or drowsy.', 'Alguien tiene señales de alarma. Atiéndelo (Plan › Guía médica) y llama al 911 si está confundido o muy dormido.'));
    if (s.meds) up(2, L("A medicine or device can't be kept going. Go somewhere with power today.", 'Una medicina o equipo no se puede mantener. Vayan hoy a un lugar con electricidad.'));
    const lim = vulnerable() ? 16 : 13;
    if (s.season === 'cold') { if (s.temp < lim) up(2, L(`Warm room ${s.temp}°C is too cold${lim === 16 ? (hasKids() ? ' for young kids' : ' for older adults') : ''}.`, `El cuarto más tibio está a ${s.temp}°C: demasiado frío${lim === 16 ? (hasKids() ? ' para niños chicos' : ' para personas mayores') : ''}.`)); else if (s.temp < lim + 2) up(1, L(`Warm room ${s.temp}°C. Call Fallback 1 and pack the car.`, `El cuarto más tibio está a ${s.temp}°C. Llama al Plan B 1 y prepara el carro.`)); }
    else { if (s.temp > 32) up(2, L(`Indoors ${s.temp}°C. Leave by early afternoon.`, `Adentro hace ${s.temp}°C. Salgan antes de media tarde.`)); else if (s.temp >= 29) up(1, L(`Indoors ${s.temp}°C${upstairs() ? ' and upper floors get hotter' : ' and rising'}.`, `Adentro hace ${s.temp}°C${upstairs() ? ' y los pisos de arriba se calientan más' : ' y sigue subiendo'}.`)); }
    if (s.water < 2) up(2, L('Less than 2 days of water.', 'Quedan menos de 2 días de agua.')); else if (s.water < 3) up(1, L('Water is getting low.', 'Se está acabando el agua.'));
    if (lv >= 1 && n.nocar) why.push(L('No car: line up a ride now, before roads or phones get worse (211, or 311 in Austin).', 'Sin carro: consigan transporte ya, antes de que empeoren las calles o los teléfonos (211, o 311 en Austin).'));
    if (lv >= 1 && n.stairs && upstairs()) why.push(L('Stairs are hard for someone here: leave in daylight, with help.', 'A alguien se le dificultan las escaleras: salgan de día y con ayuda.'));
    if (n.device && !s.meds && lv < 2) why.push(L('Medical device: check how many hours of battery are left.', 'Equipo médico: revisa cuántas horas de batería quedan.'));
    const head = [L('Stay home', 'Quédense en casa'), L('Get ready to leave', 'Prepárense para salir'), L('Go to Fallback 1 today', 'Vayan hoy al Plan B 1'), L('Leave now', 'Salgan ya')][lv];
    const fb = lv >= 2 && info.fallback1 ? `<div class="small">${L('Fallback 1', 'Plan B 1')}: <b>${esc(info.fallback1)}</b></div>` : '';
    return `<div class="verdict v${lv}"><b>${head}</b>${why.length ? '<ul>' + why.map(w => `<li>${w}</li>`).join('') + '</ul>' : `<span>${L('Keep conserving. Check again this evening.', 'Sigan ahorrando. Revisen otra vez en la noche.')}</span>`}${fb}</div>`;
  }
  const tog = (k, t) => `<label class="toggle"><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}><span>${t}</span></label>`;
  function draw() {
    view.innerHTML = `<div class="screen">${bar(L('Stay or go?', '¿Quedarse o irse?'))}${judge()}
      <div class="seg" role="group" aria-label="${L('Weather', 'Clima')}"><button aria-pressed="${s.season === 'cold'}" data-season="cold">${L('Cold', 'Frío')}</button><button aria-pressed="${s.season === 'hot'}" data-season="hot">${L('Hot', 'Calor')}</button></div>
      <div class="card"><div class="stepper"><div><b>${s.season === 'cold' ? L('Warmest room', 'Cuarto más tibio') : L('Coolest room', 'Cuarto más fresco')}</b><div class="muted small">${L('Indoor temperature', 'Temperatura adentro')}</div></div><button data-d="temp,-1" aria-label="${L('Lower', 'Bajar')}">−</button><span class="val">${s.temp}°C</span><button data-d="temp,1" aria-label="${L('Higher', 'Subir')}">+</button></div></div>
      <div class="card"><div class="stepper"><div><b>${L('Drinking water', 'Agua para tomar')}</b><div class="muted small">${L('Days left', 'Días que quedan')}</div></div><button data-d="water,-1" aria-label="${L('Less', 'Menos')}">−</button><span class="val">${s.water} ${L('d', 'd')}</span><button data-d="water,1" aria-label="${L('More', 'Más')}">+</button></div></div>
      <div class="label">${L('Any of these?', '¿Alguno de estos?')}</div>
      <div class="list">${tog('co', L('CO alarm, or headaches and dizziness in several people', 'Suena la alarma de monóxido de carbono, o varias personas tienen dolor de cabeza y mareo'))}${tog('order', L('Evacuation order or fire nearby', 'Orden de evacuación o incendio cerca'))}${tog('sick', L('Someone confused, very sleepy or overheated', 'Alguien confundido, muy dormido o con mucho calor'))}${tog('meds', L("A medicine or device can't be kept going", 'Una medicina o equipo no se puede mantener'))}</div></div>`;
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
      view.innerHTML = `<div class="screen">${bar(L('Food clock', 'Reloj de comida'))}<div class="step"><div class="big" style="background:var(--accent-soft);color:var(--warn)">${ic('refrigerator')}</div><h2>${L('Start when the power goes out', 'Empiézalo cuando se vaya la luz')}</h2><p>${L('Keep the doors shut. The clock shows how long food stays safe.', 'Mantén las puertas cerradas. El reloj muestra cuánto tiempo la comida sigue segura.')}</p></div><button class="btn wide" id="now">${ic('clock')}${L('Power just went out', 'Se acaba de ir la luz')}</button></div>`;
      $('#now').onclick = () => { store.set('outTime', Date.now()); draw(); }; return;
    }
    const el = Date.now() - t;
    const rows = [[L('Fridge', 'Refrigerador'), 4, L('Then toss meat, fish, eggs, milk and leftovers', 'Después, tira carnes, pescado, huevos, leche y sobras')], [L('Full freezer', 'Congelador lleno'), 48, L('Still has ice crystals or is 4°C (40°F) or below: can refreeze', 'Si todavía tiene cristales de hielo o está a 4°C (40°F) o menos, se puede volver a congelar')], [L('Half-full freezer', 'Congelador lleno a la mitad'), 24, L('Keep the door shut; pack items together', 'Mantén la puerta cerrada y junta los alimentos')]];
    view.innerHTML = `<div class="screen">${bar(L('Food clock', 'Reloj de comida'))}
      <div class="card"><span class="muted small">${L('Power out for', 'Sin luz desde hace')}</span><span class="bigtime">${fmtDur(el)}</span><span class="muted small">${L('since', 'desde')} ${new Date(t).toLocaleString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span></div>
      <div class="list">${rows.map(([n, h, tip]) => { const lim = h * 3600000, left = lim - el, f = Math.min(1, el / lim); const c = left <= 0 ? 'bad' : left < lim * .25 ? 'warn' : 'ok'; const col = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--danger)' }[c];
        return `<div class="meter"><div class="top"><b>${n}</b><span class="pill p-${c}">${left > 0 ? fmtDur(left) + L(' left', ' restantes') : L('Past safe time', 'Ya no es seguro')}</span></div><div class="track"><i style="width:${f * 100}%;background:${col}"></i></div><small class="muted">${tip}</small></div>`; }).join('')}</div>
      ${NEED().coldmed ? `<p class="muted small" style="padding:0 4px"><b>${L('Cold medicine', 'Medicina fría')}:</b> ${L('check its label for how long it lasts out of the fridge.', 'revisa en la etiqueta cuánto dura fuera del refri.')}</p>` : ''}
      <p class="muted small" style="padding:0 4px">${L('A fridge thermometer at 4°C or below beats any timer. When in doubt, throw it out.', 'Un termómetro en el refri a 4°C (40°F) o menos vale más que cualquier reloj. No los pruebes para saber si están buenos. Si tienes dudas, tíralos.')}</p>
      <div class="card"><label class="muted small" for="t">${L('Change start time', 'Cambiar hora de inicio')}</label><input type="datetime-local" id="t" value="${local(t)}" style="border:0;background:var(--sunk);border-radius:12px;padding:12px"><button class="btn ghost small" id="clear">${L('Reset clock', 'Reiniciar reloj')}</button></div></div>`;
    $('#t').onchange = e => { const v = new Date(e.target.value).getTime(); if (!isNaN(v)) { store.set('outTime', v); draw(); } };
    let armed = false; $('#clear').onclick = e => { if (!armed) { armed = true; e.target.textContent = L('Tap again to reset', 'Toca otra vez para reiniciar'); return; } store.set('outTime', null); draw(); };
  }
  draw(); route.tick = setInterval(() => { if (location.hash === '#food') draw(); }, 60000);
};

/* ---------- find help near me (OpenStreetMap, looked up once from the phone) ---------- */
const NEAR_KIND = () => ({
  er: [L('Emergency rooms', 'Salas de emergencias'), 'heart-pulse'], fire: [L('Fire stations', 'Estaciones de bomberos'), 'siren'],
  pharm: [L('Pharmacies', 'Farmacias'), 'pill'], center: [L('Libraries and rec centers', 'Bibliotecas y centros recreativos'), 'library-big']
});
function milesBetween(a, b) { const R = 3958.8, r = x => x * Math.PI / 180, dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
function parseNear(json, at) {
  const out = { er: [], fire: [], pharm: [], center: [] };
  (json.elements || []).forEach(e => {
    const t = e.tags || {}, lat = e.lat != null ? e.lat : e.center && e.center.lat, lon = e.lon != null ? e.lon : e.center && e.center.lon;
    if (lat == null || !t.name) return;
    let k = null;
    if ((t.amenity === 'hospital' || t.healthcare === 'hospital') && t.emergency !== 'no') k = 'er';
    else if (t.emergency === 'yes' && t.healthcare) k = 'er';
    else if (t.amenity === 'fire_station') k = 'fire';
    else if (t.amenity === 'pharmacy') k = 'pharm';
    else if (t.amenity === 'library' || t.amenity === 'community_centre') k = 'center';
    if (!k) return;
    const addr = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
    out[k].push({ n: t.name, p: t.phone || t['contact:phone'] || '', a: addr, d: Math.round(milesBetween(at, [lat, lon]) * 10) / 10, la: Math.round(lat * 1e5) / 1e5, lo: Math.round(lon * 1e5) / 1e5,
      kid: k === 'er' && /child|pediatric|niñ/i.test(t.name), h24: t.opening_hours === '24/7' });
  });
  const seen = new Set(), uniq = arr => arr.filter(x => { const key = x.n.toLowerCase() + Math.round(x.d * 2); if (seen.has(key)) return false; seen.add(key); return true; });
  out.er = uniq(out.er.sort((a, b) => a.d - b.d)); const kidEr = out.er.find(x => x.kid); out.er = out.er.slice(0, 3); if (kidEr && !out.er.includes(kidEr)) out.er.push(kidEr);
  out.fire = uniq(out.fire.sort((a, b) => a.d - b.d)).slice(0, 2);
  out.pharm = uniq(out.pharm.sort((a, b) => (b.h24 - a.h24) || (a.d - b.d))).slice(0, 3).sort((a, b) => a.d - b.d);
  out.center = uniq(out.center.sort((a, b) => a.d - b.d)).slice(0, 2);
  return out;
}
async function lookupNear(lat, lon) {
  const q = `[out:json][timeout:25];(nwr["amenity"="hospital"](around:16000,${lat},${lon});nwr["healthcare"="hospital"](around:16000,${lat},${lon});nwr["emergency"="yes"]["healthcare"](around:16000,${lat},${lon});nwr["amenity"="fire_station"](around:8000,${lat},${lon});nwr["amenity"="pharmacy"](around:6000,${lat},${lon});nwr["amenity"="library"](around:10000,${lat},${lon});nwr["amenity"="community_centre"](around:6000,${lat},${lon}););out center tags;`;
  const hosts = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const h of hosts) {
    try { const r = await fetch(h, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (r.ok) return await r.json(); } catch (e) {}
  }
  throw new Error('lookup failed');
}
function nearSection() {
  const nr = store.get('near', null), K = NEAR_KIND();
  if (!nr) return `<div class="label">${L('Near us', 'Cerca de nosotros')}</div><button class="list row" data-go="near"><span class="lead">${ic('locate')}</span><div class="grow"><b>${L('Find help near me', 'Buscar ayuda cerca')}</b><small>${L('Nearest ERs, fire stations, pharmacies and warming centers, saved for offline', 'Emergencias, bomberos, farmacias y centros de calor más cercanos, guardados para usar sin internet')}</small></div>${ic('chevron-right', 'chev')}</button>`;
  const item = x => `<div class="row"><div class="grow"><b>${esc(x.n)}${x.kid ? ` <span class="pill p-ok">${L('Kids', 'Niños')}</span>` : ''}${x.h24 ? ` <span class="pill p-ok">24 h</span>` : ''}</b><small>${x.d} mi${x.a ? ' · ' + esc(x.a) : ''}</small></div>${x.p ? `<a class="round" href="${tel(x.p)}" aria-label="${L('Call', 'Llamar a')} ${esc(x.n)}">${ic('phone')}</a>` : ''}<a class="round ghost" href="https://www.google.com/maps/dir/?api=1&destination=${x.la},${x.lo}" target="_blank" rel="noopener" aria-label="${L('Directions to', 'Cómo llegar a')} ${esc(x.n)}">${ic('navigation')}</a></div>`;
  return `<div class="label">${L('Near us', 'Cerca de nosotros')}</div>` + Object.keys(K).filter(k => nr[k] && nr[k].length).map(k => `<div class="sub-label">${ic(K[k][1])}${K[k][0]}</div><div class="list">${nr[k].map(item).join('')}</div>`).join('') +
    `<p class="muted small" style="padding:0 4px">${L('Saved ', 'Guardado el ')}${fmtDate(nr.at)}. ${L('Libraries and rec centers often serve as warming and cooling centers; check the radio for which are open. Directions need internet.', 'Las bibliotecas y centros recreativos muchas veces son centros de calor y frescura; escucha en la radio cuáles abren. Las direcciones necesitan internet.')} <button class="linkish" data-go="near">${L('Update', 'Actualizar')}</button></p><p class="muted small" style="padding:0 4px">© OpenStreetMap ${L('contributors', 'colaboradores')}</p>`;
}
R.near = () => {
  view.innerHTML = `<div class="screen">${bar(L('Find help near me', 'Buscar ayuda cerca'))}
    <div class="step"><div class="big" style="background:var(--accent-soft);color:var(--warn)">${ic('locate')}</div><h2>${L('Save nearby help for offline', 'Guarda la ayuda cercana para usar sin internet')}</h2>
    <p>${L('The app asks your phone for its location once, rounds it to about half a mile, and looks up nearby emergency rooms, fire stations, pharmacies and libraries on OpenStreetMap, a free public map. The results are saved on this phone. Your location is not saved or sent to us.', 'La app le pide la ubicación a tu teléfono una vez, la redondea a casi un kilómetro y busca salas de emergencias, bomberos, farmacias y bibliotecas cercanas en OpenStreetMap, un mapa público y gratis. Los resultados se guardan en este teléfono. Tu ubicación no se guarda ni se nos envía.')}</p></div>
    <button class="btn wide" id="go">${ic('locate')}${L('Use my location once', 'Usar mi ubicación una vez')}</button>
    <p class="muted small" id="nmsg" style="padding:0 4px" aria-live="polite"></p>
    <div class="label">${L('Or open a map app', 'O abre una app de mapas')}</div>
    <div class="list">${[['emergency+room', L('Emergency rooms', 'Salas de emergencias')], ['fire+station', L('Fire stations', 'Estaciones de bomberos')], ['24+hour+pharmacy', L('24-hour pharmacies', 'Farmacias 24 horas')], ['warming+center', L('Warming or cooling centers', 'Centros de calor o frescura')]].map(([q, t]) => `<a class="row" href="https://www.google.com/maps/search/${q}+near+me" target="_blank" rel="noopener"><div class="grow"><b>${t}</b></div>${ic('chevron-right', 'chev')}</a>`).join('')}</div></div>`;
  const msg = $('#nmsg'), btn = $('#go');
  btn.onclick = () => {
    if (!navigator.onLine) { msg.textContent = L('No internet right now. Try again when you have a signal, or use the saved list on the Call list.', 'No hay internet ahora. Inténtalo cuando tengas señal, o usa la lista guardada en Teléfonos.'); return; }
    if (!navigator.geolocation) { msg.textContent = L("This phone can't share its location here. Use the map links below.", 'Este teléfono no puede compartir su ubicación aquí. Usa los enlaces de mapas.'); return; }
    btn.disabled = true; msg.textContent = L('Finding your location…', 'Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = Math.round(pos.coords.latitude * 100) / 100, lon = Math.round(pos.coords.longitude * 100) / 100;
      msg.textContent = L('Looking up nearby places…', 'Buscando lugares cercanos…');
      try {
        const res = parseNear(await lookupNear(lat, lon), [lat, lon]);
        if (!res.er.length && !res.fire.length && !res.pharm.length) { msg.textContent = L('Nothing found nearby. Use the map links below.', 'No encontramos nada cerca. Usa los enlaces de mapas.'); btn.disabled = false; return; }
        res.at = Date.now(); store.set('near', res); toast(L('Saved for offline', 'Guardado para usar sin internet')); go('calls');
      } catch (e) { msg.textContent = L("The map service didn't answer. Try again in a minute, or use the map links below.", 'El servicio de mapas no respondió. Inténtalo en un minuto, o usa los enlaces de mapas.'); btn.disabled = false; }
    }, () => { msg.textContent = L('Location is off or was not allowed. You can turn it on in your phone settings, or use the map links below.', 'La ubicación está apagada o no se permitió. Puedes activarla en los ajustes del teléfono, o usar los enlaces de mapas.'); btn.disabled = false; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  };
};

/* ---------- call list ---------- */
let callEdit = false;
R.calls = () => {
  const row = ([n, num, sub]) => `<div class="row"><div class="grow"><b>${esc(n)}</b><small>${esc(num)}${sub ? ' · ' + esc(sub) : ''}</small></div><a class="round" href="${tel(num)}" aria-label="${L('Call', 'Llamar a')} ${esc(n)}">${ic('phone')}</a></div>`;
  const keys = [['contact', L('Out-of-area contact', 'Contacto fuera del área')], ['fallback1', L('Fallback 1', 'Plan B 1')], ['fallback2', L('Fallback 2', 'Plan B 2')], ...(apt() ? [['leasing', L('Leasing / maintenance', 'Oficina / mantenimiento')]] : []), ['er', L('Nearest ER', 'Emergencias más cercana')], hasKids() ? ['pediatrician', L('Pediatrician', 'Pediatra')] : ['doctor', L('Doctor', 'Doctor')]];
  const extra = Array.isArray(info.extra) ? info.extra : [];
  const rowMine = ([who, num, cat]) => `<div class="row"><div class="grow"><b>${esc(who)}</b><small>${cat ? esc(cat) + ' · ' : ''}${esc(num)}</small></div><a class="round" href="${tel(num)}" aria-label="${L('Call', 'Llamar a')} ${esc(who)}">${ic('phone')}</a></div>`;
  const head = `<header class="bar"><button class="back" data-back aria-label="${L('Back', 'Atrás')}">${ic('arrow-left')}</button><h1>${L('Call list', 'Teléfonos')}</h1><button class="bar-act" id="cedit">${callEdit ? ic('check') + L('Done', 'Listo') : ic('pencil') + L('Edit', 'Editar')}</button></header>`;
  const where = H().cross ? `<div class="where">${ic('map-pin')}<span>${L('Tell 911: we\'re near', 'Dile al 911: estamos cerca de')} <b>${esc(H().cross)}</b>${H().zip ? ', ' + esc(H().zip) : ''}</span></div>` : '';
  if (!callEdit) {
    const mine = keys.filter(([k]) => info[k]).map(([k, cat]) => { const v = String(info[k]), m = v.match(/[+\d][\d\s().-]{6,}/); if (!m) return null; const who = v.replace(m[0], '').replace(/^[,\s·-]+|[,\s·-]+$/g, '').trim(); return [who || cat, m[0].trim(), who ? cat : ''] }).filter(Boolean)
      .concat(extra.filter(x => x.p).map(x => [x.n || L('Contact', 'Contacto'), x.p, '']));
    view.innerHTML = `<div class="screen">${head}${where}
      <div class="label">${L('Emergency', 'Emergencia')}</div><div class="list">${emergency().map(row).join('')}</div>
      <div class="label">${L('Ours', 'Nuestros')}</div>${mine.length ? `<div class="list">${mine.map(rowMine).join('')}</div>` : `<button class="list row" id="cadd0"><span class="lead">${ic('plus')}</span><div class="grow"><b>${L('Add our contacts', 'Agregar nuestros contactos')}</b><small>${L('Out-of-area contact, fallback places, nearest ER, doctor', 'Contacto fuera del área, lugares de Plan B, emergencias, doctor')}</small></div></button>`}
      ${nearSection()}
      <button class="list row" data-go="share"><span class="lead">${ic('share-2')}</span><div class="grow"><b>${L('Share our plan with family', 'Compartir nuestro plan con la familia')}</b><small>${L('Send these numbers and our plan to someone in our home', 'Envía estos números y nuestro plan a alguien de la casa')}</small></div>${ic('chevron-right', 'chev')}</button></div>`;
    const a0 = $('#cadd0'); if (a0) a0.onclick = () => { callEdit = true; R.calls(); };
  } else {
    const u = util();
    view.innerHTML = `<div class="screen">${head}
      <p class="muted" style="padding:0 4px">${L('Changes save as you type, on this phone only. Put the phone number anywhere in the box.', 'Los cambios se guardan al escribir, solo en este teléfono. Pon el número en cualquier parte del recuadro.')}</p>
      <div class="label">${L('Electric company', 'Compañía eléctrica')}</div>
      <button class="list row" data-go="setup/edit"><span class="lead">${ic('zap')}</span><div class="grow"><b>${esc(u.name)}</b><small>${esc(u.phone || L('No number yet', 'Sin número todavía'))} · ${L('change in Where you live', 'cámbiala en Dónde viven')}</small></div>${ic('chevron-right', 'chev')}</button>
      <div class="label">${L('Ours', 'Nuestros')}</div>
      <div class="list">${keys.map(([k, n]) => `<label class="field"><span>${n}</span><input data-k="${k}" value="${esc(info[k] || '')}" placeholder="${L('Name, phone', 'Nombre, teléfono')}" autocomplete="off"></label>`).join('')}</div>
      <div class="label">${L('More people and places', 'Más personas y lugares')}</div>
      <div class="list" id="extras">${extra.map((x, i) => `<div class="field xrow"><input data-x="${i},n" value="${esc(x.n || '')}" placeholder="${L('Name', 'Nombre')}" aria-label="${L('Name', 'Nombre')}"><input data-x="${i},p" value="${esc(x.p || '')}" placeholder="${L('Phone', 'Teléfono')}" inputmode="tel" aria-label="${L('Phone', 'Teléfono')}"><button class="xdel" data-del="${i}" aria-label="${L('Remove', 'Quitar')} ${esc(x.n || '')}">${ic('trash')}</button></div>`).join('')}
        <button class="row" id="cadd"><span class="lead">${ic('plus')}</span><div class="grow"><b>${L('Add a contact', 'Agregar un contacto')}</b><small>${L('Neighbor, grandparent, daycare, vet', 'Vecino, abuelos, guardería, veterinario')}</small></div></button></div></div>`;
    let t; const saved = () => { store.set('info', info); clearTimeout(t); t = setTimeout(() => toast(L('Saved', 'Guardado')), 600); };
    view.querySelectorAll('[data-k]').forEach(inp => inp.oninput = () => { info[inp.dataset.k] = inp.value.trim(); saved(); });
    view.querySelectorAll('[data-x]').forEach(inp => inp.oninput = () => { const [i, f] = inp.dataset.x.split(','); info.extra[+i][f] = inp.value.trim(); saved(); });
    view.querySelectorAll('[data-del]').forEach(b => { let armed = false; b.onclick = () => { if (!armed) { armed = true; b.classList.add('armed'); b.setAttribute('aria-label', L('Tap again to remove', 'Toca otra vez para quitar')); setTimeout(() => { armed = false; b.classList.remove('armed'); }, 2500); return; } info.extra.splice(+b.dataset.del, 1); store.set('info', info); R.calls(); }; });
    $('#cadd').onclick = () => { info.extra = extra.concat([{ n: '', p: '' }]); store.set('info', info); R.calls(); const ins = view.querySelectorAll('[data-x$=",n"]'); if (ins.length) ins[ins.length - 1].focus(); };
  }
  $('#cedit').onclick = () => { callEdit = !callEdit; if (!callEdit) { info.extra = (info.extra || []).filter(x => x.n || x.p); store.set('info', info); } R.calls(); };
};

/* ---------- skills: how-to guides ---------- */
const T = pair => lang === 'es' ? pair[1] : pair[0];
const guideSeg = cur => `<div class="seg" role="group" aria-label="${L('Guides', 'Guías')}"><button aria-pressed="${cur === 'plan'}" data-go="plan">${L('Our plan', 'Nuestro plan')}</button><button aria-pressed="${cur === 'skills'}" data-go="skills">${L('Skills', 'Habilidades')}</button></div>`;
const COVER = { aid: 'cpr', fire: 'firelay', knots: 'bowline-4', home: 'lantern', living: 'foodorder' };
const fig = (n, cls = 'fig') => `<img class="${cls}" src="img/skills/${n}${lang === 'es' ? '-es' : ''}.svg" alt="" loading="lazy" decoding="async">`;
const skillCat = c => (window.SKILL_CATS || []).find(x => x[0] === c);
R.skills = rest => {
  if (rest && rest[0] && rest[0].startsWith('c-')) return skillGroup(rest[0].slice(2));
  if (rest && rest[0]) return skill(rest[0]);
  const S = window.SKILLS || [], C = window.SKILL_CATS || [];
  view.innerHTML = `<div class="screen">${bar(L('Skills', 'Habilidades'))}${guideSeg('skills')}
    <p class="muted" style="padding:0 4px">${L('Short how-tos with drawings. Practice them on a normal day.', 'Guías cortas con dibujos. Practíquenlas en un día normal.')}</p>
    <div class="cat-grid">${C.map(([cat, icn, name, tone]) => { const n = S.filter(x => x.cat === cat).length; return `<button class="cat-card t-${tone}" data-go="skills/c-${cat}">${fig(COVER[cat], 'cover')}<span class="cat-name"><span class="qa-ic sm t-${tone}">${ic(icn)}</span><span><b>${T(name)}</b><small>${n} ${L('guides', 'guías')}</small></span></span></button>`; }).join('')}</div>
    <p class="muted small" style="padding:0 4px">${L('These are reminders, not training. A CPR and first-aid class (Red Cross or American Heart Association) is the best prep step there is.', 'Esto es un recordatorio, no un curso. Una clase de RCP y primeros auxilios (Cruz Roja o American Heart Association) es la mejor preparación que hay.')}</p></div>`;
};
function skillGroup(cat) {
  const c = skillCat(cat); if (!c) return go('skills');
  const S = (window.SKILLS || []).filter(x => x.cat === cat);
  view.innerHTML = `<div class="screen"><header class="bar"><button class="back" data-back="skills" aria-label="${L('Back to skills', 'Volver a habilidades')}">${ic('arrow-left')}</button><h1>${T(c[2])}</h1></header>
    <div class="list">${S.map(x => `<button class="row" data-go="skills/${x.id}"><span class="qa-ic sm t-${c[3]}">${ic(x.icon)}</span><div class="grow"><b>${T(x.title)}</b>${window.KNOT_ANIM && window.KNOT_ANIM[x.id] ? `<small>${ic('clapperboard')} ${L('animated', 'animado')}</small>` : x.figs ? `<small>${ic('image')} ${L('with drawings', 'con dibujos')}</small>` : ''}</div>${ic('chevron-right', 'chev')}</button>`).join('')}</div></div>`;
}
function skill(id) {
  const A = window.SKILLS || [], x = A.find(y => y.id === id); if (!x) return go('skills');
  const cat = skillCat(x.cat) || [, , , 'amber'];
  const S = A.filter(y => y.cat === x.cat), i = S.indexOf(x), nx = S[i + 1];
  const figs = x.figs || {};
  view.innerHTML = `<div class="screen"><header class="bar"><button class="back" data-back="skills/c-${x.cat}" aria-label="${L('Back', 'Volver')}">${ic('arrow-left')}</button><h1>${T(x.title)}</h1></header>
    <div class="skill-when t-${cat[3]}"><span class="qa-ic">${ic(x.icon)}</span><div><small>${L('When', 'Cuándo')}</small><p>${T(x.when)}</p></div></div>
    ${x.cat === 'knots' && window.KNOT_ANIM && window.KNOT_ANIM[x.id] ? knotPlayerHTML(window.KNOT_ANIM[x.id]) : ''}
    ${x.cat === 'aid' ? `<a class="call wide911" href="tel:911">${ic('siren')}<div><b>${L('Call 911', 'Llama al 911')}</b><small>${L('Call first, or have someone call while you help', 'Llama primero, o que alguien llame mientras ayudas')}</small></div></a>` : ''}
    <ol class="steps-big">${x.steps.map((st, k) => `<li>${T(st)}${figs[k] ? fig(figs[k]) : ''}</li>`).join('')}</ol>
    ${x.id === 'cpr' ? cprBeatHTML() : ''}
    ${x.dont && x.dont.length ? `<div class="dont">${ic('triangle-alert')}<div>${x.dont.map(d => `<p>${T(d)}</p>`).join('')}</div></div>` : ''}
    ${x.tip ? `<div class="tipbox">${ic('lightbulb')}<p>${T(x.tip)}</p></div>` : ''}
    <p class="muted small" style="padding:0 4px">${L('Source', 'Fuente')}: ${esc(x.src)}</p>
    <button class="btn ghost noprint" id="sprint">${ic('printer')}${L('Print this guide', 'Imprimir esta guía')}</button>
    ${nx ? `<button class="list row" data-go="skills/${nx.id}"><div class="grow"><small>${L('Next', 'Siguiente')}</small><b>${T(nx.title)}</b></div>${ic('chevron-right', 'chev')}</button>`
         : `<button class="list row" data-go="skills"><div class="grow"><small>${L('Done with', 'Terminaste')} ${T(cat[2])}</small><b>${L('See all skills', 'Ver todas las habilidades')}</b></div>${ic('chevron-right', 'chev')}</button>`}</div>`;
  if ($('#knot')) knotPlayer(window.KNOT_ANIM[x.id], $('#knot'));
  if ($('#beat')) cprBeat();
  view.querySelectorAll('.steps-big .fig').forEach(img => { img.tabIndex = 0; img.setAttribute('role', 'button'); img.setAttribute('aria-label', L('Show the picture full screen', 'Ver el dibujo en pantalla completa')); img.onclick = () => openPic(img.src); img.onkeydown = e => { if (e.key === 'Enter') openPic(img.src); }; });
  $('#sprint').onclick = () => window.print();
}

/* ---------- knot animation: the working end traces the knot, step by step ---------- */
function knotPlayerHTML(K) {
  return `<section class="knot" id="knot" aria-label="${L('Knot animation', 'Animación del nudo')}">
    <svg class="kstage" viewBox="0 0 320 230" aria-hidden="true"></svg>
    <p class="kcap" aria-live="polite"></p>
    <div class="kctl"><button class="kbtn kplay" aria-label="${L('Play', 'Reproducir')}">${ic('play')}</button>
      <div class="ksteps">${K.steps.map((s, i) => `<button class="kstep" data-k="${i}" aria-label="${L('Step', 'Paso')} ${i + 1}">${i + 1}</button>`).join('')}</div>
      <button class="kbtn kslow" aria-pressed="false" aria-label="${L('Slow motion', 'Cámara lenta')}">${ic('turtle')}</button></div>
    <input class="kscrub" type="range" min="0" max="1000" value="0" aria-label="${L('Scrub through the knot', 'Recorrer el nudo')}">
  </section>`;
}
function knotPlayer(K, root) {
  const NS = 'http://www.w3.org/2000/svg', svg = root.querySelector('.kstage'), cap = root.querySelector('.kcap');
  const playB = root.querySelector('.kplay'), slowB = root.querySelector('.kslow'), scrub = root.querySelector('.kscrub'), chips = [...root.querySelectorAll('.kstep')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let geoI = -1, pieces = [], tip = null, step = 0, p = 0, playing = false, slow = false, stopAt = null, hold = 0, last = 0;
  const n = K.steps.length;
  function build(gi) {
    const g = K.geos[gi]; geoI = gi; pieces = []; svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${g.w} ${g.h}`);
    const bg = document.createElementNS(NS, 'rect'); bg.setAttribute('width', g.w); bg.setAttribute('height', g.h); bg.setAttribute('rx', 14); bg.setAttribute('fill', '#f6f8fc'); svg.appendChild(bg);
    for (const it of g.layers) {
      if (it.o) { const t = document.createElementNS(NS, 'g'); t.innerHTML = it.o; svg.appendChild(t); continue; }
      const R = g.ropes[it.r], gr = document.createElementNS(NS, 'g'), len = Math.max(it.b - it.a, 1);
      gr.setAttribute('fill', 'none');
      const mk = (d, col, w, op) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); e.setAttribute('stroke', col); e.setAttribute('stroke-width', w); e.setAttribute('pathLength', len); e.setAttribute('stroke-linejoin', 'round'); if (op) e.setAttribute('stroke-opacity', op); gr.appendChild(e); return e; };
      const ps = [mk(it.c, R.case, R.W + 3.4), mk(it.f, R.fill, R.W), mk(it.f, R.hi, (R.W * .22).toFixed(1), '.55')];
      svg.appendChild(gr); pieces.push({ it, gr, ps, len });
    }
    tip = document.createElementNS(NS, 'circle'); svg.appendChild(tip);
  }
  function draw() {
    const s = K.steps[step];
    if (s.g !== geoI) build(s.g);
    const g = K.geos[s.g], e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, t = s.from + (s.to - s.from) * e;
    let host = null;
    for (const pc of pieces) {
      const { it, ps, len, gr } = pc;
      if (it.r !== s.r) { gr.style.display = ''; ps.forEach(x => x.removeAttribute('stroke-dasharray')); continue; }
      const v = t - it.a;
      if (v <= 0.01) { gr.style.display = 'none'; continue; }
      gr.style.display = '';
      if (v >= len) ps.forEach(x => x.removeAttribute('stroke-dasharray'));
      else { ps.forEach(x => x.setAttribute('stroke-dasharray', `${v.toFixed(2)} ${len + 2}`)); }
      if (it.a <= t && t <= it.b + .01) host = gr;
    }
    const R = g.ropes[s.r], P = R.pts, i = Math.min(Math.floor(t), P.length - 1), f = t - i, q = P[Math.min(i + 1, P.length - 1)];
    tip.setAttribute('cx', P[i][0] + (q[0] - P[i][0]) * f); tip.setAttribute('cy', P[i][1] + (q[1] - P[i][1]) * f);
    tip.setAttribute('r', (R.W + 3.4) / 2); tip.setAttribute('fill', R.case);
    if (host && host.nextSibling !== tip) svg.insertBefore(tip, host.nextSibling);
    cap.innerHTML = `<b>${L('Step', 'Paso')} ${step + 1} ${L('of', 'de')} ${n}</b> ${T(s.cap)}`;
    chips.forEach((c, k) => c.classList.toggle('on', k === step));
    scrub.value = Math.round((step + p) / n * 1000);
  }
  function setPlaying(v) { playing = v; playB.innerHTML = ic(v ? 'pause' : (step === n - 1 && p >= 1 ? 'rotate-ccw' : 'play')); playB.setAttribute('aria-label', v ? L('Pause', 'Pausa') : L('Play', 'Reproducir')); if (v) { last = performance.now(); requestAnimationFrame(tick); } }
  function tick(now) {
    if (!playing || !root.isConnected) return;
    const dt = now - last; last = now;
    if (hold > 0) { hold -= dt; if (hold <= 0) { if (step < n - 1) { step++; p = 0; } } draw(); return requestAnimationFrame(tick); }
    p += dt / (slow ? 5200 : 2600);
    if (p >= 1) { p = 1; draw(); if (stopAt === step || step === n - 1) { stopAt = null; setPlaying(false); return; } hold = slow ? 1100 : 750; }
    draw(); requestAnimationFrame(tick);
  }
  playB.onclick = () => { if (playing) return setPlaying(false); if (step === n - 1 && p >= 1) { step = 0; p = 0; } stopAt = null; setPlaying(true); };
  slowB.onclick = () => { slow = !slow; slowB.setAttribute('aria-pressed', slow); slowB.classList.toggle('on', slow); };
  chips.forEach((c, k) => c.onclick = () => { step = k; p = 0; hold = 0; stopAt = k; draw(); setPlaying(true); });
  scrub.oninput = () => { setPlaying(false); const v = scrub.value / 1000 * n; step = Math.min(Math.floor(v), n - 1); p = Math.min(v - step, 1); hold = 0; draw(); };
  // start: show the knot finished for reduced motion, otherwise play from the beginning
  if (reduce) { step = n - 1; p = 1; draw(); setPlaying(false); } else { draw(); setTimeout(() => root.isConnected && setPlaying(true), 400); }
}

/* ---------- plan ---------- */
const plan = () => (lang === 'es' && window.PLAN_ES && window.PLAN_ES.length) ? window.PLAN_ES : (window.PLAN || []);
const esNote = () => lang === 'es' && !(window.PLAN_ES && window.PLAN_ES.length) ? `<div class="es-note">${L('', 'El plan completo está en inglés por ahora. La traducción viene pronto.')}</div>` : '';
R.plan = (rest) => {
  if (rest[0]) return planSection(rest[0], rest[1]);
  const q0 = store.get('planq', '');
  view.innerHTML = `<div class="screen">${bar(L('Our plan', 'Nuestro plan'))}${guideSeg('plan')}${esNote()}
    <label class="search">${ic('search')}<input id="q" type="search" placeholder="${L('Search: fever, freezer, tornado', 'Buscar: fiebre, congelador, tornado')}" value="${esc(q0)}" aria-label="${L('Search the plan', 'Buscar en el plan')}"></label>
    <div class="list" id="secs"></div></div>`;
  const q = $('#q');
  function list() {
    const t = q.value.trim(); store.set('planq', t);
    const re = t ? new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
    const hits = plan().map(s => { const n = re ? (s.text.match(re) || []).length : 0; return { s, n }; }).filter(x => !re || x.n);
    $('#secs').innerHTML = hits.length ? hits.map(({ s, n }) => `<button class="row" data-go="plan/${s.id}${re ? '/' + encodeURIComponent(t) : ''}"><span class="lead">${ic(s.icon)}</span><div class="grow"><b>${s.title}</b>${re ? `<small>${n} ${n > 1 ? L('matches', 'resultados') : L('match', 'resultado')}</small>` : ''}</div>${ic('chevron-right', 'chev')}</button>`).join('') : `<div class="empty">${L('No matches. Try a shorter word.', 'Sin resultados. Prueba una palabra más corta.')}</div>`;
  }
  q.oninput = list; list();
};
function planSection(id, q) {
  const P = plan(), i = P.findIndex(s => s.id === id); const s = P[i]; if (!s) return go('plan');
  const nx = P[i + 1];
  view.innerHTML = `<div class="screen"><header class="bar"><button class="back" data-back="plan" aria-label="${L('Back to plan', 'Volver al plan')}">${ic('arrow-left')}</button><h1>${s.title}</h1></header>
    <article class="doc" id="doc" lang="${plan() === window.PLAN_ES ? 'es' : 'en'}">${s.html}</article>
    ${nx ? `<button class="list row" data-go="plan/${nx.id}"><div class="grow"><small>${L('Next', 'Siguiente')}</small><b>${nx.title}</b></div>${ic('chevron-right', 'chev')}</button>` : ''}</div>`;
  if (q) {
    const t = decodeURIComponent(q), re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); let first = null;
    const walk = n => { if (n.nodeType === 3) { if (!re.test(n.nodeValue)) return; re.lastIndex = 0; const sp = document.createElement('span'); sp.innerHTML = esc(n.nodeValue).replace(new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); n.replaceWith(sp); first = first || sp; re.lastIndex = 0; } else if (n.nodeType === 1) [...n.childNodes].forEach(walk); };
    walk($('#doc')); if (first) setTimeout(() => first.scrollIntoView({ block: 'center' }), 50);
  }
}

/* ---------- twice-a-year check (when the clocks change) ---------- */
function nthSunday(y, m, n) { const d = new Date(y, m, 1); const first = (7 - d.getDay()) % 7 + 1; return new Date(y, m, first + 7 * (n - 1)); }
function lastChange(now) { const y = now.getFullYear(); const c = [nthSunday(y - 1, 10, 1), nthSunday(y, 2, 2), nthSunday(y, 10, 1)].filter(d => d <= now); return c[c.length - 1]; }
function checkDue() { const now = new Date(), lc = lastChange(now), done = store.get('lastCheck', 0); return (now - lc) < 30 * 864e5 && done < lc.getTime() ? lc : null; }
const CHECK = () => [
  ['alarms', L('Test smoke and carbon monoxide alarms; change batteries', 'Prueba las alarmas de humo y de monóxido de carbono; cambia las baterías')],
  ['power', L('Charge power banks and the power station; test flashlights', 'Carga las baterías portátiles y la estación de energía; prueba las linternas')],
  ['meds', L('Check medicine expiration dates; refill what\'s low', 'Revisa la fecha de caducidad de las medicinas; repón lo que falte')],
  ['water', L('Rotate water you stored yourself', 'Cambia el agua que guardaste tú mismo')],
  ...(hasKids() ? [['clothes', L("Swap kids' spare clothes for their current size", 'Cambia la ropa de repuesto de los niños a su talla actual')]] : []),
  ...(H().pets ? [['pets', L('Check pet food and supplies', 'Revisa la comida y cosas de las mascotas')]] : []),
  ['numbers', L('Re-check phone numbers in Our info, then share the plan again', 'Revisa los teléfonos en Nuestra info y vuelve a compartir el plan')],
  ['drill', L('Do a practice drill', 'Haz un simulacro')]
];
R.check = () => {
  const ticks = store.get('checkTicks', {}), items = CHECK(), done = store.get('lastCheck', 0);
  view.innerHTML = `<div class="screen">${bar(L('Twice-a-year check', 'Revisión de cada seis meses'))}
    <p class="muted" style="padding:0 4px">${L('Do this when the clocks change in March and November.', 'Hazla cuando cambia la hora en marzo y noviembre.')}${done ? ' ' + L('Last done ', 'La última fue el ') + fmtDate(done) + '.' : ''}</p>
    <div class="list">${items.map(([id, t]) => `<label class="chk"><input type="checkbox" data-c="${id}" ${ticks[id] ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
    <button class="btn wide" id="cdone">${ic('circle-check')}${L('Mark the check done', 'Marcar la revisión como hecha')}</button>
    <a class="list row" href="${lang === 'es' ? 'reminders-es.ics' : 'reminders.ics'}" target="_blank" rel="noopener"><span class="lead">${ic('calendar-plus')}</span><div class="grow"><b>${L('Add reminders to my calendar', 'Agregar recordatorios a mi calendario')}</b><small>${L('Your calendar reminds you in March and November. Nothing is sent to us.', 'Tu calendario te avisa en marzo y noviembre. No se nos envía nada.')}</small></div>${ic('chevron-right', 'chev')}</a></div>`;
  view.querySelectorAll('[data-c]').forEach(cb => cb.onchange = () => { const t = store.get('checkTicks', {}); if (cb.checked) t[cb.dataset.c] = 1; else delete t[cb.dataset.c]; store.set('checkTicks', t); });
  $('#cdone').onclick = () => { store.set('lastCheck', Date.now()); store.set('checkTicks', {}); toast(L('Check done. See you in six months.', 'Revisión lista. Nos vemos en seis meses.')); go(''); };
};

/* ---------- find: screens and plan answers ---------- */
const SHORTCUTS = () => [
  ['outage', 'zap-off', L('First 10 minutes', 'Primeros 10 minutos'), 'power out outage checklist first steps report start luz apagón lista primeros pasos reportar'],
  ['stay', 'door-open', L('Stay or go', 'Quedarse o irse'), 'stay go leave evacuate cold hot heat freeze temperature warm cool quedarse irse salir evacuar frío calor temperatura helada'],
  ['food', 'refrigerator', L('Food clock', 'Reloj de comida'), 'food fridge freezer refrigerator milk meat eat spoil safe comida refri refrigerador congelador leche carne comer'],
  ['calls', 'phone', L('Call list', 'Teléfonos'), 'call phone number 911 contact emergency doctor er hospital poison 211 311 electric llamar teléfono contacto emergencia doctor hospital veneno'],
  ['supplies', 'list-checks', L('Supplies', 'Provisiones'), 'supplies kit water batteries buy checklist how much shopping provisiones agua baterías comprar lista cuánto'],
  ['details', 'house', L('Our info', 'Nuestra info'), 'info address contacts settings language spanish english share family about cross streets zip info contactos ajustes idioma español inglés compartir familia'],
  ['near', 'locate', L('Find help near me', 'Buscar ayuda cerca'), 'near nearby hospital er emergency room fire station pharmacy library warming cooling center shelter location map cerca hospital emergencias bomberos farmacia biblioteca centro refugio ubicación mapa'],
  ['sheet', 'printer', L('Fridge sheet', 'Hoja para el refri'), 'print fridge sheet paper pdf one page imprimir refri hoja papel pdf'],
  ['ready', 'circle-check', L('Your readiness', 'Su preparación'), 'ready readiness score progress next step listo preparación puntaje progreso siguiente paso'],
  ['check', 'bell', L('Twice-a-year check', 'Revisión de cada seis meses'), 'check reminder calendar battery batteries alarm smoke expiration twice year revisión recordatorio calendario batería alarma humo caducidad'],
  ['share', 'share-2', L('Share our plan (household only)', 'Compartir nuestro plan (solo la familia de casa)'), 'share send family spouse grandparent link text compartir enviar familia esposa abuelos enlace mensaje'],
  ['install', 'smartphone', L('Install the app', 'Instalar la app'), 'install add home screen iphone android download app icon instalar agregar inicio pantalla descargar icono'],
  ['notes', 'notebook-pen', L('Outage notes', 'Notas del apagón'), 'notes log write down restore time radio said boil water notas anotar hora regreso radio aviso hervir'],
  ['light', 'lamp-desk', L('Night-light', 'Lamparita'), 'night light lamp flashlight screen light red dark sleep lamparita luz noche linterna pantalla roja oscuro'],
  ['supplies/pantry', 'package', L('Pantry: days of food and water', 'Despensa: días de comida y agua'), 'pantry food cans canned how many days water gallons stock inventory expiration use first despensa comida latas cuántos días agua galones inventario caducidad'],
  ['drill', 'timer', L('Practice drill', 'Simulacro'), 'drill practice test rehearse simulacro práctica ensayo'],
  ['kids', 'baby', L('Kids Mode', 'Modo niños'), 'kids children child game story toddler niños niño juego cuento'],
  ['plan', 'book-open', L('Our plan', 'Nuestro plan'), 'plan guide read medical first aid guía leer médica primeros auxilios'],
  ['skills', 'wrench', L('Skills', 'Habilidades'), 'skills how to knot knots fire cpr choking bleeding burn splint lantern signal survival habilidades cómo nudo nudos fuego rcp atragantamiento sangrado quemadura señal supervivencia']
];
const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
R.find = () => {
  const q0 = store.get('findq', '');
  view.innerHTML = `<div class="screen">${bar(L('Search', 'Buscar'))}
    <label class="search">${ic('search')}<input id="fq" type="search" enterkeyhint="search" placeholder="${L('fever, freezer, generator, tornado', 'fiebre, congelador, generador, tornado')}" value="${esc(q0)}" aria-label="${L('Search', 'Buscar')}"></label>
    <div id="fres"></div></div>`;
  const q = $('#fq');
  function run() {
    const t = q.value.trim(); store.set('findq', t);
    if (t.length < 2) {
      $('#fres').innerHTML = `<div class="label">${L('Try', 'Prueba')}</div><div class="chips">${(lang === 'es' ? ['fiebre', 'atragantamiento', 'nudo', 'congelador', 'monóxido', 'fogata', 'insulina'] : ['fever', 'choking', 'knot', 'freezer', 'carbon monoxide', 'fire', 'insulin']).map(w => `<button class="chip" data-w="${w}">${w}</button>`).join('')}</div>`;
      view.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { q.value = b.dataset.w; run(); }); return;
    }
    const n = norm(t), words = n.split(/\s+/).filter(Boolean);
    const sc = SHORTCUTS().filter(([, , title, kw]) => words.every(w => norm(title + ' ' + kw).includes(w)) || norm(kw).split(' ').some(k => k.startsWith(n)));
    const hits = [];
    plan().forEach(sec => {
      const sentences = sec.text.split(/\n|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9])/);
      const found = sentences.filter(x => words.every(w => norm(x).includes(w)));
      if (found.length) hits.push([sec, found.slice(0, 2), found.length]);
    });
    hits.sort((a, b) => b[2] - a[2]);
    const sk = (window.SKILLS || []).filter(x => { const cat = (window.SKILL_CATS || []).find(c => c[0] === x.cat); const txt = norm([T(x.title), T(x.when), cat ? T(cat[2]) : '', ...x.steps.map(T)].join(' ')); return words.every(w => txt.includes(w)); });
    const mark = x => { const at = Math.max(0, norm(x).indexOf(words[0]) - 70); if (x.length > 200) x = (at > 0 ? '…' + x.slice(at, at + 190) : x.slice(0, 190)) + '…'; let h = esc(x); words.forEach(w => { const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'); h = h.replace(re, '<mark>$1</mark>'); }); return h; };
    $('#fres').innerHTML = (sc.length ? `<div class="label">${L('Go to', 'Ir a')}</div><div class="list">${sc.map(([go, icn, title]) => `<button class="row" data-go="${go}"><span class="lead">${ic(icn)}</span><div class="grow"><b>${title}</b></div>${ic('chevron-right', 'chev')}</button>`).join('')}</div>` : '') +
      (sk.length ? `<div class="label">${L('Skills', 'Habilidades')}</div><div class="list">${sk.slice(0, 6).map(x => `<button class="row" data-go="skills/${x.id}"><span class="lead">${ic(x.icon)}</span><div class="grow"><b>${T(x.title)}</b></div>${ic('chevron-right', 'chev')}</button>`).join('')}</div>` : '') +
      (hits.length ? `<div class="label">${L('In the plan', 'En el plan')}</div><div class="list">${hits.slice(0, 8).map(([sec, f, c]) => `<button class="row snip" data-go="plan/${sec.id}/${encodeURIComponent(t)}"><span class="lead">${ic(sec.icon)}</span><div class="grow"><b>${sec.title}</b>${f.map(x => `<small>${mark(x)}</small>`).join('')}${c > 2 ? `<small class="more">+${c - 2} ${L('more', 'más')}</small>` : ''}</div>${ic('chevron-right', 'chev')}</button>`).join('')}</div>` : '') +
      (!sc.length && !hits.length && !sk.length ? `<div class="empty">${L('Nothing found. Try one simple word, like "water" or "cold".', 'No encontramos nada. Prueba una palabra sencilla, como "agua" o "frío".')}</div>` : '');
  }
  q.oninput = run; run(); setTimeout(() => q.focus(), 60);
};

/* ---------- supplies ---------- */
const ESSENTIALS = () => ['water', 'co', 'light', 'bank', 'food', 'firstaid', 'rx', ...(littles() ? ['diapers'] : []), ...(hasKids() ? ['kmed'] : []), ...(H().pets ? ['petfood'] : []), ...(NEED().device ? ['devpower'] : []), ...(NEED().coldmed ? ['cooler'] : [])];
const calcDefault = () => ({ a: (H().adults || 2), k: H().kids || 0, d: littles() ? 1 : 0, days: 14 });
let supTab = 'list';
R.supplies = (rest) => {
  if (rest && rest[0]) supTab = rest[0];
  const ticks = store.get('kit2', {}), KIT = kit();
  const all = KIT.flatMap(([, items]) => items), done = all.filter(([id]) => ticks[id]).length;
  let body;
  if (supTab === 'list') {
    const full = store.get('kitFull', false), ess = ESSENTIALS(), byId = Object.fromEntries(all);
    const essItems = ess.filter(id => byId[id]).map(id => [id, byId[id]]), essDone = essItems.filter(([id]) => ticks[id]).length;
    const row = ([id, t]) => `<label class="chk"><input type="checkbox" data-it="${id}" ${ticks[id] ? 'checked' : ''}><span>${esc(t)}</span></label>`;
    const essSorted = [...essItems.filter(([id]) => !ticks[id]), ...essItems.filter(([id]) => ticks[id])];
    const rest = KIT.map(([g, items]) => [g, items.filter(([id]) => !ess.includes(id))]).filter(([, items]) => items.length);
    const restN = rest.reduce((n, [, items]) => n + items.length, 0);
    const open = store.get('kitOpen', null);
    body = `<section class="ess"><div class="ess-top"><div class="ring sm" style="--p:${Math.round(essDone / essItems.length * 100)}"><span>${essDone}<small>/${essItems.length}</small></span></div><div><b>${L('Start here', 'Empieza aquí')}</b><small>${essDone === essItems.length ? L('The essentials are covered. Nice.', 'Lo esencial está cubierto. Muy bien.') : L('The things that matter most, for your family', 'Lo que más importa, para tu familia')}</small></div></div>
      <div class="list flat">${(() => { const todo = essSorted.filter(([id]) => !ticks[id]), got = essSorted.filter(([id]) => ticks[id]), showAll = store.get('essAll', false), shown = showAll ? todo : todo.slice(0, 4);
        return shown.map(row).join('') + (todo.length > shown.length ? `<button class="more-row" id="essmore">${L('Show', 'Ver')} ${todo.length - shown.length} ${L('more', 'más')}</button>` : '') + (got.length ? `<details class="got"><summary>${ic('circle-check')}${got.length} ${L('done', 'listos')}</summary>${got.map(row).join('')}</details>` : ''); })()}</div></section>
      <button class="list row" id="full"><span class="lead">${ic(full ? 'chevron-up' : 'list-checks')}</span><div class="grow"><b>${full ? L('Hide the full list', 'Ocultar la lista completa') : L('Show the full list', 'Ver la lista completa')}</b><small>${restN} ${L('more items, in groups', 'cosas más, por grupos')}</small></div></button>` +
      (full ? `<div class="groups">` + rest.map(([g, items], gi) => {
        const n = items.filter(([id]) => ticks[id]).length;
        const sorted = [...items.filter(([id]) => !ticks[id]), ...items.filter(([id]) => ticks[id])];
        return `<details class="grp${n === items.length ? ' full' : ''}" data-g="${gi}" ${open === gi ? 'open' : ''}><summary><span class="g-t">${g}</span><span class="g-n">${n === items.length ? ic('circle-check') : ''}${n}/${items.length}</span>${ic('chevron-down', 'g-chev')}</summary><div class="g-body">${sorted.map(row).join('')}</div></details>`;
      }).join('') + `</div>` : '') +
      `<p class="muted small" style="padding:0 4px">${L('Saved on this phone. To-dos like signing up for alerts are in Your readiness on the home screen.', 'Se guarda en este teléfono. Pendientes como inscribirse a las alertas están en Su preparación en la pantalla de inicio.')}</p>`;
  } else if (supTab === 'pantry') {
    body = pantryHTML();
  } else {
    const c = Object.assign(calcDefault(), store.get('calc', {})); const p = c.a + c.k;
    const rows = [[L('Drinking water', 'Agua para tomar'), p * c.days + L(' gal', ' gal'), L('1 gallon per person per day', '1 galón por persona al día')], [L('Meals', 'Comidas'), p * c.days * 3, L('3 per person per day', '3 por persona al día')], [L("Kids' snacks", 'Botanas para niños'), c.k * c.days * 2, L('2 a day per child', '2 al día por niño')], [L('Diapers or pull-ups', 'Pañales'), c.d * c.days * 6, L('About 6 a day', 'Unos 6 al día')], [L('Flashlights or headlamps', 'Linternas o lámparas de cabeza'), p, L('1 per person', '1 por persona')], [L('Power banks', 'Baterías portátiles'), Math.max(1, c.a), L('1 per adult', '1 por adulto')], [L('Prescriptions', 'Recetas'), c.days + L(' days', ' días'), L('Each person', 'Cada persona')], [L('Cash', 'Efectivo'), '$' + Math.max(200, p * 50), L('Small bills', 'Billetes chicos')]];
    if (H().pets) rows.push([L('Pet food', 'Comida de mascota'), c.days + L(' days', ' días'), L('Plus water for them', 'Más agua para ellas')]);
    const st = (k, t) => `<div class="stepper" style="padding:10px 16px;border-bottom:1px solid var(--line)"><b style="flex:1">${t}</b><button data-c="${k},-1" aria-label="${L('Less', 'Menos')}">−</button><span class="val" style="font-size:1.3rem">${c[k]}</span><button data-c="${k},1" aria-label="${L('More', 'Más')}">+</button></div>`;
    body = `<div class="list">${st('a', L('Adults', 'Adultos'))}${st('k', L('Children', 'Niños'))}${st('d', L('In diapers', 'Con pañal'))}${st('days', L('Days', 'Días'))}</div><div class="list calc"><table>${rows.map(r => `<tr><td>${r[0]}<small>${r[2]}</small></td><td class="n">${r[1]}</td></tr>`).join('')}</table></div>`;
  }
  view.innerHTML = `<div class="screen">${bar(L('Supplies', 'Provisiones'))}<div class="seg"><button aria-pressed="${supTab === 'list'}" data-t="list">${L('Checklist', 'Lista')}</button><button aria-pressed="${supTab === 'pantry'}" data-t="pantry">${L('Pantry', 'Despensa')}</button><button aria-pressed="${supTab === 'calc'}" data-t="calc">${L('How much', 'Cuánto')}</button></div>${body}</div>`;
  if (supTab === 'pantry') bindPantry(() => R.supplies());
  view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { supTab = b.dataset.t; R.supplies(); });
  const em = $('#essmore'); if (em) em.onclick = () => { store.set('essAll', true); R.supplies(); };
  const fb = $('#full'); if (fb) fb.onclick = () => { store.set('kitFull', !store.get('kitFull', false)); R.supplies(); };
  view.querySelectorAll('details.grp').forEach(d => d.addEventListener('toggle', () => { if (d.open) { store.set('kitOpen', +d.dataset.g); view.querySelectorAll('details.grp').forEach(o => { if (o !== d) o.open = false; }); } }));
  view.querySelectorAll('[data-it]').forEach(cb => cb.onchange = () => { const t = store.get('kit2', {}); if (cb.checked) t[cb.dataset.it] = 1; else delete t[cb.dataset.it]; store.set('kit2', t); const y = scrollY; R.supplies(); scrollTo(0, y); });
  view.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = Object.assign(calcDefault(), store.get('calc', {})); const [k, d] = b.dataset.c.split(','); c[k] = Math.max(k === 'days' ? 1 : 0, c[k] + +d); store.set('calc', c); R.supplies(); });
};

/* ---------- our info ---------- */
const langSeg = () => `<div class="seg" role="group" aria-label="Language / Idioma"><button aria-pressed="${lang === 'en'}" data-lang="en">English</button><button aria-pressed="${lang === 'es'}" data-lang="es">Español</button></div>`;
function bindLang(redraw) { view.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { setLang(b.dataset.lang); redraw(); }); }
R.details = () => {
  const h = H(), n = NEED();
  const TYPE_T = { house: L('House', 'Casa'), 'apt-ground': L('Apartment, ground floor', 'Apartamento, planta baja'), 'apt-up': L('Apartment, upstairs', 'Apartamento, piso de arriba') };
  const AGE_T = { baby: L('under 2', 'menor de 2'), toddler: L('2 to 5', '2 a 5'), school: L('6 to 12', '6 a 12'), teen: L('13 and up', '13 o más') };
  const extras = [h.older && L('65 or older', 'mayores de 65'), h.pets && L('pets', 'mascotas'), n.device && L('medical device', 'equipo médico'), n.coldmed && L('cold medicine', 'medicina fría'), n.stairs && L('stairs are hard', 'escaleras difíciles'), n.nocar && L('no car', 'sin carro')].filter(Boolean);
  const sum = [`${h.adults || 0} ${h.adults === 1 ? L('adult', 'adulto') : L('adults', 'adultos')}${h.kids ? `, ${h.kids} ${h.kids > 1 ? L('kids', 'niños') : L('kid', 'niño')} (${L('youngest', 'el menor')} ${AGE_T[h.youngest] || ''})` : ''}`, TYPE_T[h.type] || '', h.heat === 'gas' ? L('some gas', 'con gas') : L('all-electric', 'todo eléctrico'), util().name, h.cross && esc(h.cross), extras.join(', ')].filter(Boolean).join(' · ');
  view.innerHTML = `<div class="screen">${bar(L('Our info', 'Nuestra info'))}
    ${langSeg()}
    <label class="toggle list big-toggle"><input type="checkbox" id="bigt" ${store.get('big', false) ? 'checked' : ''}><span><b>${L('Bigger text', 'Letra más grande')}</b><small>${L('Easier to read in the dark or without glasses', 'Más fácil de leer a oscuras o sin lentes')}</small></span></label>
    ${isInstalled() ? '' : `<button class="list row" data-go="install"><span class="lead">${ic('smartphone')}</span><div class="grow"><b>${L('Install the app', 'Instalar la app')}</b><small>${L('Buttons for Android and iPhone', 'Botones para Android y iPhone')}</small></div>${ic('chevron-right', 'chev')}</button>`}
    <button class="list row" data-go="sheet"><span class="lead">${ic('printer')}</span><div class="grow"><b>${L('Fridge sheet', 'Hoja para el refri')}</b><small>${L('One printable page with your numbers, first steps and what to do next', 'Una página para imprimir con tus teléfonos, primeros pasos y lo que sigue')}</small></div>${ic('chevron-right', 'chev')}</button>
    <button class="list row" data-go="setup/edit"><span class="lead">${ic('house')}</span><div class="grow"><b>${L('Our household', 'Nuestro hogar')}</b><small>${sum}</small></div>${ic('chevron-right', 'chev')}</button>
    <button class="list row" data-go="check"><span class="lead">${ic('bell')}</span><div class="grow"><b>${L('Twice-a-year check and reminders', 'Revisión de cada seis meses y recordatorios')}</b><small>${store.get('lastCheck', 0) ? L('Last done ', 'La última fue el ') + fmtDate(store.get('lastCheck', 0)) : L('Add reminders to your calendar', 'Agrega recordatorios a tu calendario')}</small></div>${ic('chevron-right', 'chev')}</button>
    <button class="list row share-row" id="shareapp"><span class="lead">${ic('share-2')}</span><div class="grow"><b>${L('Share the app', 'Compartir la app')}</b><small>${L('Send family and friends the link so they can set up their own plan. None of your details are included.', 'Envía el enlace a familia y amigos para que hagan su propio plan. No incluye ninguno de tus datos.')}</small></div>${ic('chevron-right', 'chev')}</button>
    <button class="list row" data-go="share"><span class="lead">${ic('users')}</span><div class="grow"><b>${L('Share our plan (household only)', 'Compartir nuestro plan (solo la familia de casa)')}</b><small>${L('For a spouse or caregiver who should have your same contacts and meeting spots', 'Para tu pareja o quien cuida a los niños, con los mismos contactos y lugares de reunión')}</small></div>${ic('chevron-right', 'chev')}</button>
    <p class="muted" style="padding:0 4px">${L('Saved on this phone only. Changes here don\'t update other phones; share again after big changes.', 'Se guarda solo en este teléfono. Los cambios no se pasan solos a otros teléfonos; compártelo otra vez si cambias algo importante.')}</p>
    <div class="list">${infoFields().map(([k, t]) => `<label class="field"><span>${t}</span><input id="f-${k}" data-k="${k}" value="${esc(info[k] || '')}" autocomplete="off" ${k === 'phone' ? 'inputmode="tel"' : ''}></label>`).join('')}</div>
    <p class="muted small" style="padding:0 4px">${L('Huddle Ready is a planning aid, not medical advice. In an emergency, call 911.', 'Huddle Ready es una ayuda para planear, no es consejo médico. En una emergencia, llama al 911.')}</p>
    <details class="about"><summary>${ic('info')}${L('About Huddle Ready', 'Acerca de Huddle Ready')}</summary>
      <p>${L('A free outage plan for Central Texas families. No account, no ads, and nothing you type leaves this phone.', 'Un plan gratis para apagones para familias del centro de Texas. Sin cuenta, sin anuncios, y nada de lo que escribes sale de este teléfono.')}</p>
      <p><a href="../" target="_blank" rel="noopener">${L('Website, safety and privacy', 'Sitio web, seguridad y privacidad')}</a> · <a href="mailto:hello@huddleready.com">hello@huddleready.com</a></p>
      <p class="muted small">${L('Credits: icons by Lucide (ISC license); illustrations by Microsoft Fluent Emoji (MIT license); voices made with the open Kokoro model and eSpeak NG; nearby places © OpenStreetMap contributors.', 'Créditos: íconos de Lucide (licencia ISC); ilustraciones de Microsoft Fluent Emoji (licencia MIT); voces hechas con el modelo abierto Kokoro y eSpeak NG; lugares cercanos © colaboradores de OpenStreetMap.')}</p>
    </details></div>`;
  bindLang(R.details);
  $('#bigt').onchange = e => { store.set('big', e.target.checked); document.documentElement.classList.toggle('big', e.target.checked); };
  $('#shareapp').onclick = shareApp;
  let t; view.querySelectorAll('[data-k]').forEach(inp => inp.oninput = () => { info[inp.dataset.k] = inp.value.trim(); store.set('info', info); clearTimeout(t); t = setTimeout(() => toast(L('Saved', 'Guardado')), 600); });
};

/* ---------- share with family (the plan travels only inside the link) ---------- */
const b64e = str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = str => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
function shareLink(withSup) {
  const h = Object.assign({}, home); delete h.skipped; delete h.utilManual;
  const i = Object.assign({}, info); if (Array.isArray(i.extra)) i.extra = i.extra.filter(x => x.n || x.p);
  const d = { v: 1, h, i, l: lang };
  if (withSup) { const P = store.get('pantry', null); d.s = { k: store.get('kit2', {}), p: P && { gal: P.gal || 0, items: (P.items || []).map(x => ({ k: x.k, n: x.n, q: x.q, m: x.m, c: x.c, e: x.e || '' })) } }; }
  const data = b64e(JSON.stringify(d));
  return location.href.split('#')[0] + '#import/' + data;
}
const APP_URL = () => location.href.split('#')[0];
function shareApp() {
  const msg = L("Try Huddle Ready, a free app for power outages. No account, nothing to pay, and it works with no internet. Open the link, answer 5 quick questions, then add it to your home screen:", 'Prueba Huddle Ready, una app gratis para cuando se va la luz. No necesitas cuenta, no cuesta nada y funciona sin internet. Abre el enlace, contesta 5 preguntas rápidas y agrégala a tu pantalla de inicio:');
  const url = APP_URL();
  const copy = () => { try { navigator.clipboard.writeText(msg + '\n' + url).then(() => toast(L('Link copied', 'Enlace copiado')), () => prompt('', url)); } catch (e) { prompt('', url); } };
  if (navigator.share) navigator.share({ title: 'Huddle Ready', text: msg, url }).catch(() => {}); else copy();
}
R.share = () => {
  const withSup = store.get('shareSup', true), url = shareLink(withSup);
  const has = [L('Household answers', 'Respuestas del hogar'), H().cross && L('Cross streets', 'Calles que cruzan'), info.outside && L('Meeting spot', 'Lugar de reunión'), (info.fallback1 || info.fallback2) && L('Fallback places', 'Lugares de Plan B'),
    ['contact', 'er', 'pediatrician', 'doctor', 'leasing'].some(k => info[k]) || (info.extra || []).length ? L('Contacts and phone numbers', 'Contactos y teléfonos') : null, info.gate && L('Gate code', 'Código de la reja'), info.phone && L('Our phone number', 'Nuestro teléfono'), withSup && L('Supply checklist and pantry', 'Lista de provisiones y despensa')].filter(Boolean);
  const msg = L("Here's our family's Huddle Ready outage plan. Open this link on your phone, then add the app to your home screen:", 'Este es el plan de apagones de nuestra familia en Huddle Ready. Abre este enlace en tu teléfono y luego agrega la app a tu pantalla de inicio:');
  view.innerHTML = `<div class="screen">${bar(L('Share with family', 'Compartir con la familia'))}
    ${syncCardHTML()}
    <div class="sub-label">${ic('send')}${L('Or send a one-time copy', 'O envía una copia única')}</div>
    <div class="card"><b>${L('The link includes', 'El enlace incluye')}</b><ul class="inc">${has.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="muted small" style="margin:0">${L('Your details travel only inside the link. Nothing is stored on a server. Anyone who has the link can see them, so send it only to family.', 'Tus datos viajan solo dentro del enlace. No se guarda nada en un servidor. Cualquiera que tenga el enlace puede verlos, así que envíalo solo a tu familia. La lista de provisiones se queda en cada teléfono.')}</p></div>
    <label class="chk keep"><input type="checkbox" id="inc" ${withSup ? 'checked' : ''}><span>${L('Include our supply checklist and pantry', 'Incluir nuestra lista de provisiones y despensa')}</span></label>
    <button class="btn wide" id="sh">${ic('share-2')}${L('Send the link', 'Enviar el enlace')}</button>
    <button class="btn ghost wide" id="cp">${ic('copy')}${L('Copy the link', 'Copiar el enlace')}</button>
    <p class="muted small" style="padding:0 4px">${L('On the other phone, opening the link shows what will be added and asks before saving.', 'En el otro teléfono, al abrir el enlace se muestra lo que se va a agregar y se pregunta antes de guardar.')}</p></div>`;
  const copy = () => { const done = () => toast(L('Link copied', 'Enlace copiado')); try { navigator.clipboard.writeText(msg + '\n' + url).then(done, () => prompt('', url)); } catch (e) { prompt('', url); } };
  $('#cp').onclick = copy;
  $('#inc').onchange = e => { store.set('shareSup', e.target.checked); R.share(); };
  bindSyncCard();
  $('#sh').onclick = () => { if (navigator.share) navigator.share({ title: 'Huddle Ready', text: msg, url }).catch(() => {}); else copy(); };
};
R.import = rest => {
  let d = null; try { d = JSON.parse(b64d(rest[0] || '')); } catch (e) {}
  if (!d || d.v !== 1 || !d.h) { view.innerHTML = `<div class="screen">${bar(L('Import plan', 'Importar plan'))}<div class="empty">${L("This link didn't work. Ask for a new one.", 'Este enlace no funcionó. Pide uno nuevo.')}</div><button class="btn wide" data-go="">${L('Home', 'Inicio')}</button></div>`; return; }
  const h = d.h, i = d.i || {};
  const rows = [h.cross && [L('Near', 'Cerca de'), h.cross + (h.zip ? ', ' + h.zip : '')], [L('Household', 'Hogar'), `${h.adults || 0} ${h.adults === 1 ? L('adult', 'adulto') : L('adults', 'adultos')}${h.kids ? ', ' + h.kids + ' ' + (h.kids === 1 ? L('kid', 'niño') : L('kids', 'niños')) : ''}`], (UTILS[h.util] || h.utilName) && [L('Electric company', 'Compañía eléctrica'), (UTILS[h.util] && UTILS[h.util].name) || h.utilName],
    i.outside && [L('Outside spot', 'Lugar afuera'), i.outside], i.fallback1 && [L('Fallback 1', 'Plan B 1'), i.fallback1], i.contact && [L('Out-of-area contact', 'Contacto fuera del área'), i.contact], d.s && [L('Also', 'También'), L('Supply checklist and pantry', 'Lista de provisiones y despensa')]].filter(Boolean);
  view.innerHTML = `<div class="screen"><div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">Huddle Ready</div><div class="muted small">${L('A family plan was shared with you', 'Te compartieron un plan familiar')}</div></div></div>
    <div class="list">${rows.map(([k, v]) => `<div class="row"><div class="grow"><small>${esc(k)}</small><b>${esc(v)}</b></div></div>`).join('')}</div>
    ${home ? `<div class="verdict v1"><b>${L('This replaces the plan on this phone', 'Esto reemplaza el plan de este teléfono')}</b><span>${d.s ? L('Household answers, contacts, supply checklist and pantry are replaced.', 'Se reemplazan las respuestas del hogar, los contactos, la lista de provisiones y la despensa.') : L('Household answers and contacts are replaced. Your supply checklist stays.', 'Se reemplazan las respuestas del hogar y los contactos. Tu lista de provisiones se queda.')}</span></div>` : ''}
    <button class="btn wide" id="imp">${L('Use this plan on this phone', 'Usar este plan en este teléfono')}</button>
    <button class="btn ghost wide" id="no">${L('Cancel', 'Cancelar')}</button></div>`;
  $('#imp').onclick = () => { home = Object.assign({ skipped: [] }, h); store.set('home', home); info = i; store.set('info', info); if (d.s) { if (d.s.k) store.set('kit2', d.s.k); if (d.s.p) store.set('pantry', d.s.p); } if (!store.get('lang', null) && d.l) setLang(d.l); history.replaceState(null, '', location.pathname); toast(L('Plan saved on this phone', 'Plan guardado en este teléfono')); route(); };
  $('#no').onclick = () => { history.replaceState(null, '', location.pathname + (home ? '' : '#setup')); route(); };
};

/* ---------- setup: five questions, each skippable ---------- */
let setupStep = 0, draft = null, resuming = false;
R.setup = (rest) => {
  const mode = rest && rest[0];
  if (mode === 'resume' || mode === 'edit') {
    draft = null; resuming = mode === 'resume' && (H().skipped || []).length > 0;
    setupStep = resuming ? Math.min(...H().skipped) : 0;
    history.replaceState(null, '', '#setup');
  }
  if (!draft) draft = Object.assign({ zip: '', cross: '', util: '', utilName: '', utilPhone: '', utilManual: false, adults: 2, kids: 0, youngest: 'toddler', older: false, pets: false, type: 'house', heat: 'electric', needs: {}, skipped: [] }, JSON.parse(JSON.stringify(home || {})));
  const d = draft, first = !home, N = 5, i = setupStep;
  const hasKidsDraft = () => d.kids > 0;
  const opt = (k, v, t, sub) => `<button class="opt" aria-pressed="${d[k] === v}" data-o="${k},${v}"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
  const tog = (k, t, sub, needs) => { const on = needs ? d.needs[k] : d[k]; return `<button class="opt check" aria-pressed="${!!on}" data-t="${needs ? 'n.' : ''}${k}"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</button>`; };
  const st = (k, t, min) => `<div class="stepper" style="padding:12px 16px;border-bottom:1px solid var(--line)"><b style="flex:1">${t}</b><button data-c="${k},-1,${min}" aria-label="${L('Fewer', 'Menos')} ${t.toLowerCase()}">−</button><span class="val" style="font-size:1.4rem">${d[k]}</span><button data-c="${k},1,${min}" aria-label="${L('More', 'Más')} ${t.toLowerCase()}">+</button></div>`;
  const utilOpts = () => {
    const g = guessUtil(d.zip);
    return `${g && !d.utilManual ? `<p class="hint-line">${ic('info')}<span>${L('Our best guess from your ZIP. Check your electric bill to be sure.', 'Nuestra mejor suposición según tu código postal. Revisa tu recibo de luz para confirmar.')}</span></p>` : `<p class="hint-line">${ic('info')}<span>${L("Not sure? It's printed on your electric bill.", '¿No sabes? Viene en tu recibo de luz.')}</span></p>`}
      <div class="opts col">${opt('util', 'ae', 'Austin Energy')}${opt('util', 'pec', 'Pedernales Electric (PEC)')}${opt('util', 'oncor', 'Oncor')}${opt('util', 'bb', 'Bluebonnet Electric')}${opt('util', 'other', L('Someone else', 'Otra compañía'))}</div>
      ${d.util === 'other' ? `<div class="list"><label class="field"><span>${L('Company name', 'Nombre de la compañía')}</span><input id="un" value="${esc(d.utilName)}"></label><label class="field"><span>${L('Outage phone number', 'Teléfono para reportar apagones')}</span><input id="up" inputmode="tel" value="${esc(d.utilPhone)}"></label></div>` : ''}`;
  };
  const pages = [
    () => `<h2>${L('Where do you live?', '¿Dónde viven?')}</h2><p class="muted">${L('Cross streets, not your address. If your phone can\'t share your location, this is what you tell 911.', 'Las calles que cruzan, no tu dirección. Si tu teléfono no puede compartir tu ubicación, esto es lo que le dices al 911.')}</p>
      <div class="list"><label class="field"><span>${L('ZIP code', 'Código postal')}</span><input id="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="${esc(d.zip)}"></label><label class="field"><span>${L('Nearest cross streets', 'Calles que cruzan más cerca')}</span><input id="cross" placeholder="${L('Brodie Ln & W Slaughter Ln', 'Brodie Ln y W Slaughter Ln')}" value="${esc(d.cross)}"></label></div>
      <div class="label">${L('Electric company', 'Compañía eléctrica')}</div><div id="utilbox">${utilOpts()}</div>`,
    () => `<h2>${L('Who lives at home?', '¿Quiénes viven en casa?')}</h2><p class="muted">${L('So checklists and supplies fit your family.', 'Para que las listas y provisiones sean para tu familia.')}</p><div class="list"><label class="field"><span>${L('Family name (optional, for the greeting)', 'Apellido de la familia (opcional, para el saludo)')}</span><input id="fam" autocomplete="family-name" value="${esc(d.family || '')}"></label>${st('adults', L('Adults', 'Adultos'), 1)}${st('kids', L('Kids', 'Niños'), 0)}</div>
      ${d.kids ? `<div class="label">${L('Youngest child', 'El niño más chico')}</div><div class="opts">${opt('youngest', 'baby', L('Under 2', 'Menor de 2'))}${opt('youngest', 'toddler', L('2 to 5', '2 a 5'))}${opt('youngest', 'school', L('6 to 12', '6 a 12'))}${opt('youngest', 'teen', L('13 and up', '13 o más'))}</div>` : ''}
      <div class="label">${L('Also at home', 'También en casa')}</div><div class="opts">${tog('older', L('Someone 65+', 'Alguien de 65+'))}${tog('pets', L('Pets', 'Mascotas'))}</div>`,
    () => `<h2>${L('What kind of home?', '¿Qué tipo de casa?')}</h2><p class="muted">${L('Upper floors get hotter and lose water pressure first.', 'Los pisos de arriba se calientan más y pierden la presión del agua primero.')}</p><div class="opts col">${opt('type', 'house', L('House', 'Casa'))}${opt('type', 'apt-ground', L('Apartment or condo', 'Apartamento o condominio'), L('Ground floor', 'Planta baja'))}${opt('type', 'apt-up', L('Apartment or condo', 'Apartamento o condominio'), L('Upstairs', 'Piso de arriba'))}</div>
      <div class="label">${L('Heating and cooking', 'Calefacción y cocina')}</div><div class="opts">${opt('heat', 'electric', L('All electric', 'Todo eléctrico'))}${opt('heat', 'gas', L('Some gas', 'Algo de gas'))}</div>`,
    () => `<h2>${L('Anything that needs extra planning?', '¿Algo que necesite más planeación?')}</h2><p class="muted">${L('Pick any that apply. These change the advice the most.', 'Elige los que apliquen. Esto es lo que más cambia los consejos.')}</p><div class="opts col">
      ${tog('device', L('Medical equipment that needs power', 'Equipo médico que necesita electricidad'), L('CPAP, oxygen, a breathing machine, a power wheelchair', 'CPAP, oxígeno, nebulizador, silla de ruedas eléctrica'), true)}
      ${tog('coldmed', L('Medicine that must stay cold', 'Medicina que debe estar fría'), L('Insulin and some other prescriptions', 'Insulina y otras recetas'), true)}
      ${tog('stairs', L('Someone has trouble with stairs or walking', 'Alguien tiene dificultad con escaleras o para caminar'), '', true)}
      ${tog('nocar', L('No car', 'No tenemos carro'), L("We'd need a ride to leave", 'Necesitaríamos transporte para salir'), true)}</div>`,
    () => `<h2>${L('Where do you meet?', '¿Dónde se reúnen?')}</h2><p class="muted">${L("Home is the meeting point. Add a backup in case you can't get in.", 'La casa es el punto de reunión. Agrega otro lugar por si no pueden entrar.')}</p><div class="list"><label class="field"><span>${L('Spot right outside home', 'Lugar justo afuera de casa')}</span><input id="so" placeholder="${L("The mailboxes, a neighbor's porch", 'Los buzones, el porche de un vecino')}" value="${esc(info.outside || '')}"></label><label class="field"><span>${L('Fallback 1: somewhere nearby with power', 'Plan B 1: un lugar cercano con electricidad')}</span><input id="sf" placeholder="${L('Name, address, phone', 'Nombre, dirección, teléfono')}" value="${esc(info.fallback1 || '')}"></label><label class="field"><span>${L('Out-of-area contact everyone texts', 'Contacto fuera del área a quien todos escriben')}</span><input id="sc" placeholder="${L('Name and phone', 'Nombre y teléfono')}" value="${esc(info.contact || '')}"></label><label class="field"><span>${hasKidsDraft() ? L('Our phone number (the kids practice it)', 'Nuestro teléfono (los niños lo practican)') : L('Our phone number', 'Nuestro teléfono')}</span><input id="sp" inputmode="tel" value="${esc(info.phone || '')}"></label></div>`
  ];
  view.innerHTML = `<div class="screen setup">${first && i === 0 ? `<div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">Huddle Ready</div><div class="muted small">${L('Five quick questions. Everything stays on this phone.', 'Cinco preguntas rápidas. Todo se queda en este teléfono.')}</div></div></div>${langSeg()}` : `<header class="bar"><button class="back" id="sback" aria-label="${L('Back', 'Atrás')}">${ic('arrow-left')}</button><h1>${first ? L('Set up', 'Configurar') : L('Our household', 'Nuestro hogar')}</h1></header>`}
    <div class="prog"><i style="width:${(i + 1) / N * 100}%"></i></div><span class="step-n">${L('Question', 'Pregunta')} ${i + 1} ${L('of', 'de')} ${N}</span>
    <div class="qa">${pages[i]()}</div>
    <button class="btn wide" id="snext">${i === N - 1 ? (first ? L('Make our plan', 'Hacer nuestro plan') : L('Save', 'Guardar')) : L('Next', 'Siguiente')}</button>
    <button class="skip" id="sskip">${L('Skip for now', 'Saltar por ahora')}</button>
    <p class="muted small" style="text-align:center;margin:0">${L('Huddle Ready is a planning aid, not medical advice.', 'Huddle Ready es una ayuda para planear, no es consejo médico.')}</p></div>`;
  const val = id => { const el = $('#' + id); return el ? el.value.trim() : null; };
  const keep = () => {
    if (val('fam') != null) d.family = val('fam');
    if (val('zip') != null) { d.zip = val('zip').replace(/\D/g, '').slice(0, 5); d.cross = val('cross'); }
    if (val('un') != null) { d.utilName = val('un'); d.utilPhone = val('up'); }
    if (val('so') != null) { info.outside = val('so'); info.fallback1 = val('sf'); info.contact = val('sc'); info.phone = val('sp'); store.set('info', info); }
  };
  const bind = () => {
    view.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { keep(); const [k, v] = b.dataset.o.split(','); d[k] = v; if (k === 'util') d.utilManual = true; R.setup(); });
  };
  bind();
  view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { keep(); const k = b.dataset.t; if (k.startsWith('n.')) d.needs[k.slice(2)] = !d.needs[k.slice(2)]; else d[k] = !d[k]; R.setup(); });
  view.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { keep(); const [k, n, min] = b.dataset.c.split(','); d[k] = Math.max(+min, Math.min(12, d[k] + +n)); R.setup(); });
  bindLang(() => { keep(); R.setup(); });
  const zip = $('#zip'); if (zip) zip.oninput = () => { zip.value = zip.value.replace(/\D/g, '').slice(0, 5); d.zip = zip.value; if (!d.utilManual) { const g = guessUtil(d.zip); if (g && g !== d.util) { d.util = g; $('#utilbox').innerHTML = utilOpts(); bind(); } } };
  const sb = $('#sback'); if (sb) sb.onclick = () => { keep(); if (i > 0 && !resuming) { setupStep--; R.setup(); } else { draft = null; resuming = false; go(first ? 'setup' : 'details'); } };
  const finish = () => {
    if (!d.util) d.util = 'other';
    home = Object.assign({}, d); delete home.utilManual; home.utilManual = d.utilManual;
    store.set('home', home); store.set('calc', null); const wasFirst = first; draft = null; setupStep = 0;
    toast(wasFirst ? L('Your plan is ready', 'Tu plan está listo') : L('Saved', 'Guardado')); go('');
  };
  const advance = skipped => {
    d.skipped = (d.skipped || []).filter(x => x !== i); if (skipped) d.skipped.push(i);
    d.skipped.sort((a, b) => a - b);
    let nextStep = i + 1;
    if (resuming) { const left = d.skipped.filter(x => x > i); nextStep = left.length ? left[0] : N; }
    if (nextStep < N) { setupStep = nextStep; R.setup(); window.scrollTo(0, 0); return; }
    resuming = false; finish();
  };
  $('#snext').onclick = () => { keep(); advance(false); };
  $('#sskip').onclick = () => { keep(); advance(true); };
};



/* ---------- family sync: the plan is encrypted on the phone (AES-GCM) and stored as scrambled text.
   The key travels only inside the family's private link (after the #), so the server can never read it. ---------- */
const SYNC_URL = 'https://phtfogprpnriunzwjrwr.supabase.co/rest/v1/rpc/', SYNC_KEY = 'sb_publishable_RorZQqPjHeKZE3uHLOgTzg_acJ-8xFy';
const SYNCED = ['home', 'info', 'kit2', 'pantry', 'notes'];
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const syncCfg = () => store.get('sync', null);
let syncBusy = false, syncTimer = null, syncApplying = false;
async function rpc(fn, body) {
  const r = await fetch(SYNC_URL + fn, { method: 'POST', headers: { apikey: SYNC_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('sync ' + r.status);
  return r.json();
}
async function syncKey(k) { return crypto.subtle.importKey('raw', ub64u(k), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function encryptSnap(cfg, snap) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await syncKey(cfg.key), new TextEncoder().encode(JSON.stringify(snap))); return { data: b64u(ct), iv: b64u(iv) }; }
async function decryptSnap(cfg, row) { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64u(row.iv) }, await syncKey(cfg.key), ub64u(row.data)); return JSON.parse(new TextDecoder().decode(pt)); }
// a snapshot = {key: {v: value, t: when it last changed}}; merging keeps the newer of each key
function localSnap() { const T = store.get('syncT', {}), o = {}; SYNCED.forEach(k => { const v = store.get(k, null); if (v != null) o[k] = { v, t: T[k] || 0 }; }); return o; }
function mergeSnap(a, b) { const o = Object.assign({}, a); for (const k in b) if (!o[k] || (b[k].t || 0) > (o[k].t || 0)) o[k] = b[k]; return o; }
function applySnap(snap) {
  const T = store.get('syncT', {}); let changed = false; syncApplying = true;
  for (const k of SYNCED) { const r = snap[k]; if (r && (r.t || 0) > (T[k] || 0)) { store.set(k, r.v); T[k] = r.t; changed = true; } }
  syncApplying = false; store.set('syncT', T);
  if (changed) { home = store.get('home', home); info = store.get('info', info); const a = document.activeElement; if (!(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) && !/^#(setup|kids|light)/.test(location.hash)) route(); }
  return changed;
}
store.hook = k => { if (syncApplying || !SYNCED.includes(k)) return; const T = store.get('syncT', {}); T[k] = Date.now(); localStorage.setItem('hr-syncT', JSON.stringify(T)); if (syncCfg()) { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 2500); } };
async function syncNow() {
  const cfg = syncCfg(); if (!cfg || syncBusy || !navigator.onLine) return;
  syncBusy = true;
  try {
    for (let tries = 0; tries < 3; tries++) {
      const rows = await rpc('get_plan', { p_id: cfg.id }), row = rows && rows[0];
      let snap = localSnap(), base = 0;
      if (row) { const remote = await decryptSnap(cfg, row); applySnap(remote); snap = mergeSnap(localSnap(), remote); base = row.rev; if (JSON.stringify(snap) === JSON.stringify(remote)) { store.set('sync', Object.assign(cfg, { at: Date.now(), rev: row.rev })); break; } }
      const enc = await encryptSnap(cfg, snap), rev = await rpc('put_plan', { p_id: cfg.id, p_data: enc.data, p_iv: enc.iv, p_base_rev: base });
      if (rev > 0) { store.set('sync', Object.assign(cfg, { at: Date.now(), rev })); break; }
    }
    store.set('syncErr', 0);
  } catch (e) { store.set('syncErr', Date.now()); }
  syncBusy = false;
  const st = $('#syncst'); if (st) st.textContent = syncStatus();
}
function syncStatus() {
  const c = syncCfg(); if (!c) return '';
  if (!navigator.onLine) return L('Waiting for internet. Changes will sync later.', 'Esperando internet. Los cambios se sincronizan después.');
  if (store.get('syncErr', 0) > (c.at || 0)) return L('Could not reach the server. Will try again.', 'No se pudo conectar. Se intentará otra vez.');
  if (!c.at) return L('Syncing…', 'Sincronizando…');
  const m = Math.round((Date.now() - c.at) / 60000);
  return m < 1 ? L('Synced just now', 'Sincronizado hace un momento') : m < 60 ? L(`Synced ${m} min ago`, `Sincronizado hace ${m} min`) : L('Synced ' + new Date(c.at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }), 'Sincronizado ' + new Date(c.at).toLocaleString('es-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }));
}
const joinLink = c => location.href.split('#')[0] + '#join/' + c.id + '.' + c.key;
async function startSync() { const c = { id: b64u(crypto.getRandomValues(new Uint8Array(18))), key: b64u(crypto.getRandomValues(new Uint8Array(32))), at: 0, rev: 0 }; store.set('sync', c); await syncNow(); return syncCfg(); }
window.addEventListener('online', () => syncNow());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 90000);
setTimeout(syncNow, 1500);

R.join = async rest => {
  const [id, key] = String(rest[0] || '').split('.');
  const fail = t => { view.innerHTML = `<div class="screen">${bar(L('Family sync', 'Sincronizar con la familia'))}<div class="empty">${t}</div><button class="btn wide" data-go="">${L('Home', 'Inicio')}</button></div>`; };
  if (!id || !key) return fail(L("This link didn't work. Ask for a new one.", 'Este enlace no funcionó. Pide uno nuevo.'));
  view.innerHTML = `<div class="screen">${bar(L('Family sync', 'Sincronizar con la familia'))}<div class="empty">${L('Opening your family plan…', 'Abriendo el plan familiar…')}</div></div>`;
  let snap;
  try { const rows = await rpc('get_plan', { p_id: id }); if (!rows || !rows[0]) return fail(L('This family plan was turned off. Ask for a new link.', 'Este plan familiar se apagó. Pide un enlace nuevo.')); snap = await decryptSnap({ key }, rows[0]); }
  catch (e) { return fail(navigator.onLine ? L("This link didn't work. Ask for a new one.", 'Este enlace no funcionó. Pide uno nuevo.') : L('Connect to the internet once to join, then it works offline.', 'Conéctate a internet una vez para unirte; luego funciona sin internet.')); }
  const h = (snap.home || {}).v || {}, i = (snap.info || {}).v || {};
  const rows = [h.family && [L('Family', 'Familia'), h.family], h.cross && [L('Near', 'Cerca de'), h.cross], [L('Household', 'Hogar'), `${h.adults || 0} ${L('adults', 'adultos')}${h.kids ? ', ' + h.kids + ' ' + L('kids', 'niños') : ''}`], i.contact && [L('Out-of-area contact', 'Contacto fuera del área'), i.contact], snap.pantry && [L('Also', 'También'), L('Supplies, pantry and notes', 'Provisiones, despensa y notas')]].filter(Boolean);
  view.innerHTML = `<div class="screen"><div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">Huddle Ready</div><div class="muted small">${L('Join your family\'s plan', 'Únete al plan de tu familia')}</div></div></div>
    <div class="list">${rows.map(([k, v]) => `<div class="row"><div class="grow"><small>${esc(k)}</small><b>${esc(v)}</b></div></div>`).join('')}</div>
    <div class="tipbox">${ic('refresh-cw')}<p>${L('Changes on either phone show up on the other whenever both have internet.', 'Los cambios en un teléfono aparecen en el otro cuando los dos tienen internet.')}</p></div>
    ${home ? `<div class="verdict v1"><b>${L('This replaces the plan on this phone', 'Esto reemplaza el plan de este teléfono')}</b></div>` : ''}
    <button class="btn wide" id="jy">${L('Join and keep in sync', 'Unirme y sincronizar')}</button><button class="btn ghost wide" id="jn">${L('Cancel', 'Cancelar')}</button></div>`;
  $('#jy').onclick = () => { store.set('syncT', {}); applySnap(snap); home = store.get('home', null); info = store.get('info', {}); if (home && !home.skipped) { home.skipped = []; store.set('home', home); }
    store.set('sync', { id, key, at: Date.now(), rev: 0 }); history.replaceState(null, '', location.pathname); toast(L('Joined. Your phones now stay in sync.', 'Listo. Sus teléfonos ahora se sincronizan.')); syncNow(); route(); };
  $('#jn').onclick = () => { history.replaceState(null, '', location.pathname + (home ? '' : '#setup')); route(); };
};
function syncCardHTML() {
  const c = syncCfg();
  if (!c) return `<section class="card sync"><div class="sync-top"><span class="qa-ic t-green">${ic('refresh-cw')}</span><div class="grow"><b>${L('Keep our phones in sync', 'Mantener nuestros teléfonos sincronizados')}</b><small>${L('Contacts, supplies, pantry and notes update on both phones automatically.', 'Contactos, provisiones, despensa y notas se actualizan solos en los dos teléfonos.')}</small></div></div>
    <button class="btn wide" id="syon">${ic('refresh-cw')}${L('Turn on sync', 'Activar sincronización')}</button>
    <p class="muted small" style="margin:0">${L('Your plan is locked (encrypted) on this phone before it is saved online. Only phones with your family link can unlock it.', 'Tu plan se cierra con llave (cifrado) en este teléfono antes de guardarse en internet. Solo los teléfonos con su enlace familiar lo pueden abrir.')}</p></section>`;
  return `<section class="card sync on"><div class="sync-top"><span class="qa-ic t-green">${ic('refresh-cw')}</span><div class="grow"><b>${L('Sync is on', 'Sincronización activada')}</b><small id="syncst">${syncStatus()}</small></div></div>
    <button class="btn wide" id="sysend">${ic('share-2')}${L('Send the sync link to your family', 'Enviar el enlace a tu familia')}</button>
    <button class="btn ghost wide" id="sycopy">${ic('copy')}${L('Copy the sync link', 'Copiar el enlace')}</button>
    <details class="got"><summary>${L('Turn off', 'Apagar')}</summary><div style="display:grid;gap:8px;padding-top:8px"><button class="btn ghost wide" id="syoff">${L('Stop syncing on this phone', 'Dejar de sincronizar en este teléfono')}</button><button class="btn ghost wide" id="sydel">${L('Delete the online copy for everyone', 'Borrar la copia en internet para todos')}</button></div></details></section>`;
}
function bindSyncCard() {
  const on = $('#syon'); if (on) on.onclick = async () => { on.disabled = true; on.textContent = L('Turning on…', 'Activando…'); await startSync(); R.share(); };
  const c = syncCfg(); if (!c) return;
  const msg = L("Join our family's Huddle Ready plan. Open this link on your phone and tap Join. Keep it private: it unlocks our plan.", 'Únete al plan de Huddle Ready de nuestra familia. Abre este enlace en tu teléfono y toca Unirme. Es privado: abre nuestro plan.');
  const copy = async () => { try { await navigator.clipboard.writeText(msg + '\n' + joinLink(c)); toast(L('Link copied', 'Enlace copiado')); } catch (e) { prompt('', joinLink(c)); } };
  $('#sycopy').onclick = copy;
  $('#sysend').onclick = () => { if (navigator.share) navigator.share({ title: 'Huddle Ready', text: msg, url: joinLink(c) }).catch(() => {}); else copy(); };
  $('#syoff').onclick = () => { store.set('sync', null); toast(L('Sync is off on this phone', 'Sincronización apagada en este teléfono')); R.share(); };
  const d = $('#sydel'); let armed = false; d.onclick = async () => { if (!armed) { armed = true; d.textContent = L('Tap again to delete for everyone', 'Toca otra vez para borrar para todos'); return; } try { await rpc('delete_plan', { p_id: c.id }); } catch (e) {} store.set('sync', null); toast(L('Online copy deleted', 'Copia en internet borrada')); R.share(); };
}




/* ---------- paste or upload a pantry list ("Tuna: 12 cans, 5 oz each") and turn it into pantry items ---------- */
// meals per unit: one "meal" = one person's meal. These are rough, label-based estimates people can edit.
const PANTRY_RULES = [
  [/flour|cornmeal|baking mix/i, 0, 1],
  [/\b(dry|dried)\b.*bean|bean.*\b(dry|dried)\b|lentil|split pea/i, 'bulk-beans', 1],
  [/\brice\b/i, 'bulk-rice', 1],
  [/oatmeal|\boats?\b|grits|cream of wheat/i, 'oats', 1],
  [/pasta|spaghetti(?!os)|macaroni|noodle(?!.*soup)/i, 'bulk-pasta', 1],
  [/tuna|sardine|salmon|vienna|spam\b/i, 'oz', 0],
  [/chili|stew|soup|ravioli|spaghettios|chef boyardee|dumpling|pot pie|hash|beef-?a-?roni/i, 'meal', 0],
  [/chicken|turkey|beef\b|ham\b|pork/i, 'meat', 0],
  [/ro-?tel|tomato|salsa|sauce|paste|broth|stock/i, 'side', 0],
  [/fruit|peach|pear|pineapple|mandarin|applesauce|cherry/i, 'fruit', 0],
  [/corn|green bean|\bpeas?\b|carrot|vegetable|veggie|spinach|potato/i, 'veg', 0],
  [/bean/i, 'beans', 0],
  [/peanut butter|nut butter/i, 6, 0],
  [/cracker|pretzel|chip/i, 3, 0],
  [/cereal/i, 5, 0],
  [/milk/i, 2, 0],
  [/granola|protein bar|\bbars?\b/i, .5, 0],
  [/baby food|pouch/i, .5, 0]
];
function sizeOz(t) {
  t = String(t).toLowerCase();
  let m = t.match(/([\d.]+)\s*(oz|ounce)/); if (m) return +m[1];
  m = t.match(/([\d.]+)\s*(g|gram)s?\b/); if (m) return +m[1] / 28.35;
  m = t.match(/([\d.]+)\s*(lb|pound)s?\b/); if (m) return +m[1] * 16;
  m = t.match(/([\d.]+)\s*kg\b/); if (m) return +m[1] * 35.27;
  return 0;
}
const half = v => Math.max(.5, Math.round(v * 2) / 2);
function mealsFor(kind, oz, isPacket) {
  if (typeof kind === 'number') return kind;
  const z = oz || 15;
  switch (kind) {
    case 'oz': return half(z / 5);                  // a 5 oz can of tuna = about 1 meal
    case 'meat': return half(z / 6);                // a 12.5 oz can of chicken = about 2 meals
    case 'meal': return half(z / 10);               // a 15 oz can of chili or soup = about 1.5 meals
    case 'side': return Math.max(.25, Math.round(z / 30 * 4) / 4); // tomatoes, Ro-Tel: part of a meal
    case 'veg': case 'fruit': return z >= 32 ? half(z / 20) : .5;
    case 'beans': return half(z / 10);
    case 'oats': return isPacket ? .5 : half(z / 3);
    default: return 1;
  }
}
const BULK = { 'bulk-beans': [6, 8], 'bulk-rice': [10, 7], 'bulk-pasta': [4, 4] }; // meals per lb, meals per quart (dry)
function parsePantryText(text) {
  const items = [], skipped = [];
  let section = '', gal = 0;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/^[\s\-*•·]+/, '').trim();
    if (!line) continue;
    let name, rest;
    const c = line.indexOf(':'), parts = line.split(',');
    if (c > 0) { name = line.slice(0, c).trim(); rest = line.slice(c + 1).trim(); }
    else if (parts.length >= 2 && /\d/.test(parts.slice(1).join(','))) { name = parts[0].trim(); rest = parts.slice(1).join(',').trim(); }
    else if (/^\d/.test(line)) { const m = line.match(/^([\d.]+)\s*(?:x\s*)?(.*)$/); name = m[2]; rest = m[1]; }
    else { if (!/\d/.test(line) && line.length < 40) section = line; else skipped.push(line); continue; }
    if (!name || !rest || /^(include|total|note)/i.test(name)) { skipped.push(line); continue; }
    const lower = rest.toLowerCase();
    if (/\bwater\b/i.test(name) && !/chestnut|melon/i.test(name)) { const g = lower.match(/([\d.]+)\s*(gallons?|gal)\b/), cs = lower.match(/([\d.]+)\s*(cases?|packs?)\b/), bt = lower.match(/([\d.]+)\s*(bottles?)\b/); gal += g ? +g[1] : cs ? +cs[1] * 3 : bt ? +bt[1] * .13 : 0; continue; }
    const cm = lower.match(/(?:about|around|~)?\s*([\d.]+)\s*(cans?|jars?|packets?|packs?|pouches?|boxes?|bags?|bottles?|cartons?|containers?|tins?|bars?)\b/);
    const each = (lower.match(/,\s*([^,]*?)\s*each/) || [])[1] || '';
    let rule = PANTRY_RULES.find(([re]) => re.test(name)) || [null, 1, 0];
    // loose beans by the quart or pound are dry beans, not cans
    if (rule[1] === 'beans' && !/\bcans?\b/.test(lower) && /(quarts?|qt|lb|pounds?|bags?)\b/.test(lower)) rule = [null, 'bulk-beans', 1];
    const kind = rule[1], cook = rule[2] || (/dry goods|dry food|grains/i.test(section) && kind !== 6 ? 1 : 0);
    let q, m;
    if (typeof kind === 'string' && kind.startsWith('bulk') && !(cm && /can/.test(cm[2]))) {
      const unit = cm ? (each || lower.replace(cm[0], '')) : lower;
      const lb = sizeOz(unit) / 16, qt = +((unit.match(/([\d.]+)\s*(quarts?|qt)\b/) || [])[1] || 0);
      q = cm ? Math.max(1, Math.round(+cm[1])) : 1; m = Math.round(lb ? lb * BULK[kind][0] : qt ? qt * BULK[kind][1] : 6);
    } else if (cm) {
      q = Math.max(1, Math.round(+cm[1]));
      m = kind === 0 ? 0 : mealsFor(/^bulk/.test(kind) ? 'beans' : kind, sizeOz(each) || sizeOz(lower.replace(cm[0], '')), /packet|pack|pouch/.test(cm[2]));
    } else if (kind === 0) {
      q = 1; m = 0;
    } else {
      const n = (lower.match(/^(?:about|around|~)?\s*([\d.]+)\b(?!\s*(oz|g|lb|kg|quarts?|qt)\b)/) || [])[1];
      q = n ? Math.max(1, Math.round(+n)) : 1; m = mealsFor(kind, sizeOz(lower), false);
    }
    const k = 'own-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    items.push({ k, n: name, d: rest.replace(/\s+/g, ' '), q, m, c: cook ? 1 : 0, e: '' });
  }
  return { items, skipped, gal: Math.round(gal) };
}
function pantryPreview(items, skipped, back, gal) {
  const meals = items.reduce((a, x) => a + x.q * x.m, 0);
  view.innerHTML = `<div class="screen">${bar(L('Check your list', 'Revisa tu lista'))}
    <p class="muted" style="padding:0 4px;margin:0">${items.length} ${L('foods found, about', 'comidas encontradas, unas')} ${Math.round(meals)} ${L('meals', 'comidas')}. ${L('Meal counts are estimates from the sizes. Change any of them later with Edit.', 'Las comidas son cálculos según el tamaño. Puedes cambiarlas después con Editar.')}</p>
    <div class="list">${items.map(x => `<div class="row"><div class="grow"><b>${esc(x.n)}</b><small>${esc(x.d)}${x.c ? ' · ' + L('needs cooking', 'hay que cocinar') : ''}</small></div><span class="pill">${x.m ? +(x.q * x.m).toFixed(1) + ' ' + L('meals', 'comidas') : L('not counted', 'no cuenta')}</span></div>`).join('')}</div>
    ${gal ? `<div class="tipbox">${ic('droplets')}<p>${L(`Plus ${gal} gallons of water, added to your water total.`, `Más ${gal} galones de agua, sumados a tu total de agua.`)}</p></div>` : ''}
    ${skipped.length ? `<p class="muted small" style="padding:0 4px">${L('Lines not used:', 'Líneas que no se usaron:')} ${skipped.map(esc).join(' · ')}</p>` : ''}
    <button class="btn wide" id="pa">${ic('plus')}${L('Add to my pantry', 'Agregar a mi despensa')}</button>
    <button class="btn ghost wide" id="pb">${L('Back', 'Atrás')}</button></div>`;
  $('#pa').onclick = () => {
    const P = store.get('pantry', { items: [], gal: 0 });
    if (gal) P.gal = (P.gal || 0) + gal;
    items.forEach(x => { const i = P.items.findIndex(y => y.k === x.k); if (i >= 0) P.items[i] = Object.assign(P.items[i], { n: x.n, d: x.d, q: x.q, m: x.m, c: x.c }); else P.items.push(x); });
    store.set('pantry', P); history.replaceState(null, '', location.pathname); toast(L('Added to your pantry', 'Agregado a tu despensa')); supTab = 'pantry'; go('supplies/pantry');
  };
  $('#pb').onclick = back;
}
R.pantrylist = () => {
  view.innerHTML = `<div class="screen">${bar(L('Add a list', 'Agregar una lista'))}
    <p class="muted" style="padding:0 4px;margin:0">${L('Paste a list, one food per line, like:', 'Pega una lista, una comida por línea, así:')}</p>
    <pre class="pl-ex">${L('Tuna: 12 cans, 5 oz each\nChili: 6 cans, 15 oz each\nFlour: 25 lb\nInstant oatmeal: 52 packets', 'Atún: 12 latas, 5 oz cada una\nChili: 6 latas, 15 oz cada una\nHarina: 25 lb\nAvena instantánea: 52 sobres')}</pre>
    <textarea id="pl" rows="10" placeholder="${L('Paste your list here', 'Pega tu lista aquí')}" aria-label="${L('Pantry list', 'Lista de la despensa')}"></textarea>
    <label class="btn ghost wide pl-file">${ic('upload')}${L('Or upload a text file', 'O sube un archivo de texto')}<input type="file" id="pf" accept=".txt,.csv,text/plain,text/csv" hidden></label>
    <button class="btn wide" id="pgo">${L('Read my list', 'Leer mi lista')}</button>
    <p class="muted small" style="padding:0 4px">${L('Headings like "Dry goods" are fine. Everything stays on this phone.', 'Puedes dejar títulos como "Granos secos". Todo se queda en este teléfono.')}</p></div>`;
  const ta = $('#pl');
  $('#pf').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { ta.value = String(r.result || ''); }; r.readAsText(f); };
  $('#pgo').onclick = () => { const { items, skipped, gal } = parsePantryText(ta.value); if (!items.length && !gal) { toast(L('No foods found. Try one per line.', 'No se encontraron comidas. Prueba una por línea.')); return ta.focus(); } const keep = ta.value; pantryPreview(items, skipped, () => { R.pantrylist(); $('#pl').value = keep; }, gal); };
};
// a link that carries a typed list: #addlist/<text>
R.addlist = rest => {
  let t = ''; try { t = b64d(rest[0] || ''); } catch (e) {}
  const { items, skipped, gal } = parsePantryText(t);
  if (!items.length && !gal) { view.innerHTML = `<div class="screen">${bar(L('Add a list', 'Agregar una lista'))}<div class="empty">${L("This link didn't work.", 'Este enlace no funcionó.')}</div></div>`; return; }
  pantryPreview(items, skipped, () => go('supplies/pantry'), gal);
};

/* ---------- install: a button for Android (real install prompt) and one for iPhone (Add to Home Screen steps) ---------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
window.addEventListener('appinstalled', () => { installEvt = null; store.set('installed', 1); toast(L('Installed. Look for Huddle Ready on your home screen.', 'Instalada. Busca Huddle Ready en tu pantalla de inicio.')); });
const UA = navigator.userAgent;
const isIOS = () => /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(UA);
const inAppBrowser = () => /FBAN|FBAV|Instagram|Line\/|GSA\/|Snapchat|musical_ly|TikTok|LinkedInApp|Pinterest|; wv\)/i.test(UA);
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function androidInstall() {
  if (installEvt) { const e = installEvt; installEvt = null; try { e.prompt(); const r = await e.userChoice; if (r && r.outcome === 'accepted') store.set('installed', 1); } catch (_) {} route(); return; }
  go('install/android');
}
function installCardHTML() {
  if (isInstalled() || store.get('installHide', 0)) return '';
  const os = isIOS() ? 'ios' : isAndroid() ? 'android' : '';
  return `<section class="inst" id="instcard"><div class="inst-top"><span class="qa-ic t-blue">${ic('smartphone')}</span><div class="grow"><b>${L('Put the app on your home screen', 'Pon la app en tu pantalla de inicio')}</b><small>${L('One tap to open, even with no internet.', 'Se abre con un toque, aunque no haya internet.')}</small></div><button class="inst-x" id="insthide" aria-label="${L('Hide', 'Ocultar')}">${ic('x')}</button></div>
    <div class="inst-btns"><button class="inst-btn ${os === 'android' ? 'main' : ''}" id="inst-android">${ic('download')}<span>${L('Install on Android', 'Instalar en Android')}</span></button>
      <button class="inst-btn ${os === 'ios' ? 'main' : ''}" data-go="install/ios">${ic('square-plus')}<span>${L('Add on iPhone', 'Agregar en iPhone')}</span></button></div></section>`;
}
function bindInstallCard() {
  const a = $('#inst-android'); if (a) a.onclick = androidInstall;
  const h = $('#insthide'); if (h) h.onclick = () => { store.set('installHide', 1); route(); toast(L('You can install it later from Our info.', 'Puedes instalarla después desde Nuestra info.')); };
}
R.install = (rest) => {
  const os = rest && rest[0] === 'android' ? 'android' : rest && rest[0] === 'ios' ? 'ios' : (isAndroid() ? 'android' : 'ios');
  const url = location.href.split('#')[0];
  const step = (n, icn, t, sub) => `<li><span class="inst-n">${n}</span><div class="grow"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div><span class="inst-ic">${ic(icn)}</span></li>`;
  const warnApp = inAppBrowser() ? `<div class="dont">${ic('triangle-alert')}<div><p>${os === 'ios' ? L('You opened this inside another app. Copy the link, then open it in Safari to install.', 'Abriste esto dentro de otra app. Copia el enlace y ábrelo en Safari para instalar.') : L('You opened this inside another app. Copy the link, then open it in Chrome to install.', 'Abriste esto dentro de otra app. Copia el enlace y ábrelo en Chrome para instalar.')}</p><button class="btn small" id="icopy">${ic('copy')}${L('Copy the link', 'Copiar el enlace')}</button></div></div>` : '';
  const done = isInstalled() ? `<div class="tipbox">${ic('circle-check')}<p>${L('Huddle Ready is already on your home screen.', 'Huddle Ready ya está en tu pantalla de inicio.')}</p></div>` : '';
  const ios = `<ol class="inst-steps">${step(1, 'compass', L('Open this page in Safari', 'Abre esta página en Safari'), L('In Chrome on iPhone this works too.', 'En Chrome para iPhone también funciona.'))}${step(2, 'share', L('Tap the Share button', 'Toca el botón Compartir'), L('The square with an arrow pointing up, at the bottom or top of the screen.', 'El cuadro con una flecha hacia arriba, abajo o arriba de la pantalla.'))}${step(3, 'square-plus', L('Scroll down and tap "Add to Home Screen"', 'Baja y toca "Agregar a pantalla de inicio"'), L('If you don\'t see it, tap "Edit Actions" at the bottom of the list.', 'Si no lo ves, toca "Editar acciones" al final de la lista.'))}${step(4, 'circle-check', L('Tap "Add"', 'Toca "Agregar"'), L('The Huddle Ready icon appears on your home screen.', 'El ícono de Huddle Ready aparece en tu pantalla de inicio.'))}</ol>`;
  const android = `${installEvt ? `<button class="btn inst-big" id="ago">${ic('download')}${L('Install Huddle Ready', 'Instalar Huddle Ready')}</button><p class="muted small" style="padding:0 4px;margin:0">${L('Or do it by hand:', 'O hazlo a mano:')}</p>` : ''}
    <ol class="inst-steps">${step(1, 'globe', L('Open this page in Chrome', 'Abre esta página en Chrome'), L('Samsung Internet works too. Not in a private tab.', 'Samsung Internet también funciona. No en una pestaña privada.'))}${step(2, 'ellipsis-vertical', L('Tap the ⋮ menu', 'Toca el menú ⋮'), L('Top right corner of Chrome.', 'Esquina de arriba a la derecha de Chrome.'))}${step(3, 'download', L('Tap "Install app" or "Add to Home screen"', 'Toca "Instalar app" o "Agregar a pantalla principal"'), '')}${step(4, 'circle-check', L('Tap "Install"', 'Toca "Instalar"'), L('The Huddle Ready icon appears with your apps.', 'El ícono de Huddle Ready aparece con tus apps.'))}</ol>`;
  view.innerHTML = `<div class="screen">${bar(L('Install the app', 'Instalar la app'))}
    <div class="seg" role="group" aria-label="${L('Phone type', 'Tipo de teléfono')}"><button aria-pressed="${os === 'android'}" data-go="install/android">Android</button><button aria-pressed="${os === 'ios'}" data-go="install/ios">iPhone</button></div>
    ${done}${warnApp}${os === 'ios' ? ios : android}
    <p class="muted small" style="padding:0 4px">${L('Free. No app store and no account. Everything you type stays on this phone. Not installed? It still works in the browser, even offline, once you\'ve opened it with internet.', 'Gratis. Sin tienda de apps y sin cuenta. Todo lo que escribes se queda en este teléfono. ¿No la instalaste? Igual funciona en el navegador, aun sin internet, después de abrirla una vez con internet.')}</p></div>`;
  const g = $('#ago'); if (g) g.onclick = androidInstall;
  const cp = $('#icopy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(url); toast(L('Link copied', 'Enlace copiado')); } catch (e) { prompt(L('Copy this link', 'Copia este enlace'), url); } };
};

/* ---------- outage day check: a short list each morning of a long outage ---------- */
const DAYCHECK = () => [
  ['food', L('Check the food clock. Eat fridge food first.', 'Revisa el reloj de comida. Coman primero lo del refri.'), 'food'],
  ['cooler', L('Fresh ice or frozen bottles in the cooler', 'Hielo nuevo o botellas congeladas en la hielera'), ''],
  ['phones', L('Charge phones from a power bank, one phone on at a time', 'Carga los teléfonos con la batería portátil, uno prendido a la vez'), 'skills/batteries'],
  ['water', L('Refill water bottles and check how much is left', 'Rellena las botellas y revisa cuánta agua queda'), 'supplies/pantry'],
  ['toilet', L('Toilet supplies: bags and cat litter', 'Cosas para el baño: bolsas y arena para gato'), 'skills/toilet'],
  ['temp', L('Check the temperature inside: stay or go?', 'Revisa la temperatura adentro: ¿quedarse o irse?'), 'stay'],
  ['neighbors', L('Check on neighbors, especially older ones', 'Pregunta por los vecinos, sobre todo los mayores'), ''],
  ...(hasKids() ? [['kids', L("Keep the kids' routine: breakfast, a job each", 'Mantén la rutina de los niños: desayuno y un trabajo para cada uno'), 'skills/kidsdays']] : []),
  ['news', L('Listen for the restore time and write it down', 'Escucha la hora estimada de regreso y anótala'), 'notes']
];
const dayN = o => Math.floor((Date.now() - o.start + 12 * 3600000) / 864e5) + 1;
function dayCheckHTML(o) {
  if (Date.now() - o.start < 12 * 3600000) return '';
  const n = dayN(o), t = (o.day && o.day.n === n) ? o.day.t : {}, D = DAYCHECK(), done = D.filter(([k]) => t[k]).length;
  return `<details class="daycheck" ${done < D.length ? 'open' : ''}><summary><span class="qa-ic t-amber">${ic('sunrise')}</span><div class="grow"><b>${L('Day', 'Día')} ${n} ${L('check', ': revisión')}</b><small>${done} ${L('of', 'de')} ${D.length} ${L('done', 'listos')}</small></div>${ic('chevron-down', 'g-chev')}</summary>
    <div class="dc-list">${D.map(([k, txt, link]) => `<div class="dc-row"><label class="chk"><input type="checkbox" data-day="${k}" ${t[k] ? 'checked' : ''}><span>${txt}</span></label>${link ? `<button class="round ghost" data-go="${link}" aria-label="${L('Open', 'Abrir')}">${ic('chevron-right')}</button>` : ''}</div>`).join('')}</div></details>`;
}
function bindDayCheck() {
  view.querySelectorAll('[data-day]').forEach(cb => cb.onchange = () => {
    const o = outage(); if (!o) return; const n = dayN(o);
    if (!o.day || o.day.n !== n) o.day = { n, t: {} };
    if (cb.checked) o.day.t[cb.dataset.day] = 1; else delete o.day.t[cb.dataset.day];
    store.set('outage', o);
    const s = view.querySelector('.daycheck small'), D = DAYCHECK(); if (s) s.textContent = `${Object.keys(o.day.t).length} ${L('of', 'de')} ${D.length} ${L('done', 'listos')}`;
  });
}

/* ---------- outage notes: what the radio said, restore times, who checked in ---------- */
const NOTE_QUICK = () => [L('Restore time: ', 'Hora de regreso: '), L('Boil-water notice', 'Aviso de hervir el agua'), L('Shelter or warming center open at ', 'Refugio o centro abierto en '), L('Checked on neighbors', 'Preguntamos por los vecinos'), L('Medicine given at ', 'Medicina a las ')];
R.notes = () => {
  const notes = store.get('notes', []);
  const fmt = ms => new Date(ms).toLocaleString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  view.innerHTML = `<div class="screen">${bar(L('Outage notes', 'Notas del apagón'))}
    <p class="muted" style="padding:0 4px;margin:0">${L('Write down what you hear and do, with the time. Saved on this phone.', 'Anota lo que escuchas y lo que hacen, con la hora. Se guarda en este teléfono.')}</p>
    <div class="card note-new"><div class="chips">${NOTE_QUICK().map((q, i) => `<button class="chip" data-q="${i}">${esc(q.trim())}</button>`).join('')}</div>
      <textarea id="nt" rows="3" placeholder="${L('e.g. Radio: power back by 6 pm', 'ej. Radio: regresa la luz a las 6 pm')}" aria-label="${L('New note', 'Nota nueva')}"></textarea>
      <button class="btn" id="nsave">${ic('plus')}${L('Save note', 'Guardar nota')}</button></div>
    ${notes.length ? `<div class="list">${notes.map((n, i) => `<div class="row note"><div class="grow"><small>${fmt(n.t)}</small><span>${esc(n.x)}</span></div><button class="round ghost" data-del="${i}" aria-label="${L('Delete note', 'Borrar nota')}">${ic('trash')}</button></div>`).join('')}</div>
      <div class="row2"><button class="btn ghost" id="nshare">${ic('share-2')}${L('Share', 'Compartir')}</button><button class="btn ghost" id="nclear">${L('Clear all', 'Borrar todo')}</button></div>`
      : `<div class="empty">${L('No notes yet.', 'Todavía no hay notas.')}</div>`}</div>`;
  const ta = $('#nt');
  view.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { ta.value = NOTE_QUICK()[+b.dataset.q] + ta.value; ta.focus(); });
  $('#nsave').onclick = () => { const x = ta.value.trim(); if (!x) return ta.focus(); const n = store.get('notes', []); n.unshift({ t: Date.now(), x }); store.set('notes', n.slice(0, 100)); R.notes(); toast(L('Saved', 'Guardada')); };
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const n = store.get('notes', []); n.splice(+b.dataset.del, 1); store.set('notes', n); R.notes(); });
  const sh = $('#nshare'); if (sh) sh.onclick = async () => {
    const text = L('Our outage notes', 'Nuestras notas del apagón') + '\n' + store.get('notes', []).slice().reverse().map(n => `${fmt(n.t)}: ${n.x}`).join('\n');
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(text); toast(L('Copied', 'Copiado')); } catch (e) { toast(L('Could not copy', 'No se pudo copiar')); }
  };
  const cl = $('#nclear'); if (cl) { let armed = false; cl.onclick = () => { if (!armed) { armed = true; cl.textContent = L('Tap again to clear', 'Toca otra vez para borrar'); setTimeout(() => { armed = false; if (cl.isConnected) cl.textContent = L('Clear all', 'Borrar todo'); }, 3000); return; } store.set('notes', []); R.notes(); }; }
};

/* ---------- night-light: the screen as a warm lamp, a red light for night vision, or a bright white one ---------- */
R.light = () => {
  const LIGHTS = { warm: '#ffb35c', red: '#ff2a12', white: '#fff6e6' };
  let mode = store.get('lightMode', 'warm'), level = store.get('lightLevel', 55), mins = store.get('lightMins', 30), lock = null, offT = null, hideT = null;
  view.innerHTML = `<div class="nl" id="nl"><div class="nl-glow" id="glow"></div>
    <div class="nl-ui" id="nlui"><button class="nl-x" id="nlx" aria-label="${L('Close the night-light', 'Cerrar la lamparita')}">${ic('x')}</button>
      <div class="nl-panel"><div class="nl-row">${[['warm', L('Warm', 'Cálida')], ['red', L('Red', 'Roja')], ['white', L('Bright', 'Blanca')]].map(([k, t]) => `<button class="nl-chip ${mode === k ? 'on' : ''}" data-m="${k}">${t}</button>`).join('')}</div>
        <label class="nl-slide"><span>${ic('sun')}</span><input type="range" id="lv" min="8" max="100" value="${level}" aria-label="${L('Brightness', 'Brillo')}"></label>
        <div class="nl-row">${[15, 30, 60, 0].map(m => `<button class="nl-chip ${mins === m ? 'on' : ''}" data-min="${m}">${m ? m + ' min' : L('Stay on', 'Siempre')}</button>`).join('')}</div>
        <p class="nl-tip">${L('Red keeps your eyes used to the dark. Turn the phone brightness up for more light; it uses more battery.', 'La roja mantiene tus ojos acostumbrados a la oscuridad. Sube el brillo del teléfono para más luz; gasta más batería.')}</p></div></div></div>`;
  const nl = $('#nl'), glow = $('#glow'), ui = $('#nlui');
  const paint = () => { glow.style.background = `radial-gradient(circle at 50% 45%, ${LIGHTS[mode]} 0, ${LIGHTS[mode]} 55%, #000 140%)`; glow.style.opacity = level / 100; };
  const arm = () => { clearTimeout(offT); if (mins) offT = setTimeout(close, mins * 60000); };
  const peek = () => { ui.classList.remove('hide'); clearTimeout(hideT); hideT = setTimeout(() => ui.classList.add('hide'), 5000); };
  function stop() { clearTimeout(offT); clearTimeout(hideT); try { lock && lock.release(); } catch (e) {} lock = null; }
  function close() { stop(); pageStop = null; history.length > 1 ? history.back() : go(''); }
  view.querySelectorAll('[data-m]').forEach(b => b.onclick = e => { e.stopPropagation(); mode = b.dataset.m; store.set('lightMode', mode); view.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); paint(); peek(); });
  view.querySelectorAll('[data-min]').forEach(b => b.onclick = e => { e.stopPropagation(); mins = +b.dataset.min; store.set('lightMins', mins); view.querySelectorAll('[data-min]').forEach(x => x.classList.toggle('on', x === b)); arm(); peek(); });
  $('#lv').oninput = e => { level = +e.target.value; store.set('lightLevel', level); paint(); peek(); };
  $('#nlx').onclick = e => { e.stopPropagation(); close(); };
  nl.addEventListener('pointerdown', e => { if (ui.classList.contains('hide')) { e.preventDefault(); peek(); } });
  pageStop = stop;
  (async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) {} })();
  paint(); arm(); peek();
};

/* ---------- CPR beat: a pulsing circle and a click at 110 a minute ---------- */
function cprBeatHTML() {
  return `<section class="beat" id="beat"><div class="beat-top"><div class="beat-dot" id="bdot"><span id="bcount">0</span></div>
    <div class="beat-info"><b>${L('Practice the beat', 'Practica el ritmo')}</b><small>${L('Push down with each pulse: 110 a minute. Practice on a pillow, never on a person.', 'Empuja con cada pulso: 110 por minuto. Practica en una almohada, nunca en una persona.')}</small><span class="beat-time" id="btime"></span></div></div>
    <button class="btn" id="bgo">${ic('play')}${L('Start the beat', 'Empezar el ritmo')}</button></section>`;
}
function cprBeat() {
  const dot = $('#bdot'), cnt = $('#bcount'), tm = $('#btime'), btn = $('#bgo');
  let ac = null, iv = null, n = 0, t0 = 0;
  const period = 60000 / 110;
  function click() {
    n++; cnt.textContent = n; dot.classList.remove('hit'); void dot.offsetWidth; dot.classList.add('hit');
    const s = Math.floor((Date.now() - t0) / 1000), left = Math.max(0, 120 - s);
    tm.textContent = left ? L(`Switch helpers in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, `Cambien en ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`) : L('Switch helpers now if you can', 'Cambien de persona si pueden');
    if (ac) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = n % 2 ? 1000 : 800; g.gain.setValueAtTime(.35, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .06); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .07); }
  }
  function stop() { clearInterval(iv); iv = null; try { ac && ac.close(); } catch (e) {} ac = null; if (btn.isConnected) btn.innerHTML = ic('play') + L('Start the beat', 'Empezar el ritmo'); pageStop = null; }
  btn.onclick = () => {
    if (iv) return stop();
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    n = 0; t0 = Date.now(); click(); iv = setInterval(click, period); pageStop = stop;
    btn.innerHTML = ic('pause') + L('Stop', 'Parar');
  };
}

/* ---------- tap a guide picture to see it full screen ---------- */
function openPic(src) {
  const d = document.createElement('div'); d.className = 'lbox'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', L('Picture, full screen', 'Dibujo en pantalla completa'));
  d.innerHTML = `<button class="lbox-x" aria-label="${L('Close', 'Cerrar')}">${ic('x')}</button><div class="lbox-in"><img src="${src}" alt=""></div><p>${L('Turn your phone sideways for a bigger view. Pinch to zoom.', 'Gira el teléfono para verlo más grande. Pellizca para acercar.')}</p>`;
  const close = () => { d.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('.lbox-x')) close(); });
  document.addEventListener('keydown', esc_);
  document.body.appendChild(d); d.querySelector('.lbox-x').focus();
}

/* ---------- pantry: what you have, and how many days it lasts ---------- */
/* pantry: a starter list everyone sees (tap + to fill in amounts), plus "something else" for anything not on it */
const PANTRY_QUICK = () => [
  ['soup', L('Canned soup', 'Sopa de lata'), 1, 0], ['chili', L('Canned chili', 'Chili de lata'), 1, 0], ['meat', L('Canned meat, chicken or tuna', 'Carne, pollo o atún de lata'), 1, 0],
  ['beans', L('Canned beans', 'Frijoles de lata'), 1.5, 0], ['veg', L('Canned vegetables', 'Verduras de lata'), .5, 0], ['fruit', L('Canned fruit', 'Fruta de lata'), .5, 0],
  ['pb', L('Peanut butter (16 oz jar)', 'Crema de cacahuate (16 oz)'), 6, 0], ['crackers', L('Crackers (box)', 'Galletas saladas (caja)'), 3, 0], ['cereal', L('Cereal (box)', 'Cereal (caja)'), 5, 0],
  ['milk', L('Shelf-stable milk (quart)', 'Leche de caja (cuarto)'), 2, 0], ['bars', L('Granola or protein bars', 'Barras de granola o proteína'), .5, 0],
  ...(littles() ? [['babyfood', L('Baby food jars or pouches', 'Frascos o bolsitas de comida de bebé'), .5, 0]] : []),
  ['oats', L('Oats (42 oz)', 'Avena (42 oz)'), 15, 1], ['rice', L('Rice (2 lb bag)', 'Arroz (bolsa de 2 lb)'), 10, 1], ['pasta', L('Pasta (1 lb box)', 'Pasta (caja de 1 lb)'), 4, 1],
  ['flour', L('Flour (needs an oven)', 'Harina (necesita horno)'), 0, 1]
];
// every row the pantry shows: the starter list (names in the current language) merged with what's saved, then your own items
function pantryRows(P) {
  const saved = Object.fromEntries(P.items.map(x => [x.k, x]));
  const base = PANTRY_QUICK().map(([k, n, m, c]) => Object.assign({ k, q: 0, m, c, e: '' }, saved[k] || {}, { n, c }));
  return base.concat(P.items.filter(x => !PANTRY_QUICK().some(q => q[0] === x.k)));
}
function pantryStats() {
  const P = store.get('pantry', { items: [], gal: 0 }), people = Math.max(1, (H().adults || 0) + (H().kids || 0));
  const meals = P.items.reduce((s, x) => s + x.q * x.m, 0), nocook = P.items.filter(x => !x.c).reduce((s, x) => s + x.q * x.m, 0);
  return { P, people, days: meals / (people * 3), nocookDays: nocook / (people * 3), waterDays: (P.gal || 0) / people };
}
function pantryHTML() {
  const { P, people, days, nocookDays, waterDays } = pantryStats();
  const d1 = v => v >= 10 ? Math.floor(v) : Math.floor(v * 2) / 2;
  const pct = v => Math.min(100, Math.round(v / 14 * 100));
  const now = new Date(), soon = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString().slice(0, 7);
  const rows = pantryRows(P), has = rows.filter(x => x.q > 0).length;
  const useFirst = rows.filter(x => x.q > 0 && x.e && x.e <= soon).sort((a, b) => a.e < b.e ? -1 : 1);
  const mon = e => new Date(e + '-15').toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', year: 'numeric' });
  const item = x => { const meals = x.q * x.m;
    return `<div class="pan-item${x.q ? '' : ' zero'}"><div class="pan-name"><div class="grow"><b>${esc(x.n)}</b><small>${x.d ? esc(x.d) + ' · ' : ''}${x.q ? (meals ? `${+meals.toFixed(1)} ${meals === 1 ? L('meal', 'comida') : L('meals', 'comidas')}` : L('not counted', 'no se cuenta')) + (x.e ? ' · ' + L('best by ', 'antes de ') + mon(x.e) : '') : L('Tap + to add', 'Toca + para agregar')}</small></div>
      <div class="stepper sm"><button data-pq="${x.k},-1" aria-label="${L('Less', 'Menos')} ${esc(x.n)}" ${x.q ? '' : 'disabled'}>−</button><span class="val">${x.q}</span><button data-pq="${x.k},1" aria-label="${L('More', 'Más')} ${esc(x.n)}">+</button></div></div>
      ${x.q || x.k.startsWith('own') ? `<details class="pan-edit"><summary>${L('Edit', 'Editar')}</summary><div class="pan-ctl"><label class="pan-f"><small>${L('meals each', 'comidas c/u')}</small><input type="number" inputmode="decimal" step="0.5" min="0" value="${x.m}" data-pm="${x.k}"></label>
        <label class="pan-f"><small>${L('best by', 'antes de')}</small><input type="month" value="${x.e || ''}" data-pe="${x.k}"></label>${x.k.startsWith('own') ? `<button class="round ghost" data-pdel="${x.k}" aria-label="${L('Remove', 'Quitar')} ${esc(x.n)}">${ic('trash')}</button>` : ''}</div></details>` : ''}</div>`; };
  const mineFirst = a => [...a.filter(x => x.k.startsWith('own') || x.q > 0), ...a.filter(x => !x.k.startsWith('own') && !x.q)];
  const ready = mineFirst(rows.filter(x => !x.c)), cook = mineFirst(rows.filter(x => x.c)), own = [];
  return `<section class="pan-sum"><div class="pan-stat"><span class="qa-ic t-amber">${ic('utensils')}</span><div class="grow"><b>${d1(days)} ${L('days of food', 'días de comida')}</b><small>${d1(nocookDays)} ${L('of them with no cooking', 'sin cocinar')} · ${people} ${people === 1 ? L('person', 'persona') : L('people', 'personas')}</small><div class="track"><i style="width:${pct(days)}%"></i></div></div></div>
    <div class="pan-stat"><span class="qa-ic t-blue">${ic('droplets')}</span><div class="grow"><b>${d1(waterDays)} ${L('days of water', 'días de agua')}</b><small>${L('1 gallon per person per day', '1 galón por persona al día')}</small><div class="track"><i style="width:${pct(waterDays)}%"></i></div></div></div>
    <p class="muted small" style="margin:0">${has ? L('Goal: 14 days. Estimates: 3 meals a person a day. Tap Edit to match your labels.', 'Meta: 14 días. Son cálculos: 3 comidas por persona al día. Toca Editar para ajustar a tus etiquetas.') : L('Tap + next to what you have. That\'s it. The days add up for you.', 'Toca + junto a lo que tienes. Eso es todo. Los días se suman solos.')}</p></section>
    <div class="list"><div class="stepper" style="padding:10px 16px"><b style="flex:1">${L('Gallons of water stored', 'Galones de agua guardados')}</b><button data-gal="-1" aria-label="${L('Less', 'Menos')}">−</button><span class="val" style="font-size:1.3rem">${P.gal || 0}</span><button data-gal="1" aria-label="${L('More', 'Más')}">+</button></div></div>
    ${useFirst.length ? `<div class="sub-label">${ic('calendar-check')}${L('Use first', 'Úsalos primero')}</div><div class="list">${useFirst.map(x => `<div class="row"><div class="grow"><b>${esc(x.n)}</b><small>${x.e < now.toISOString().slice(0, 7) ? L('Past date: ', 'Ya pasó la fecha: ') : L('Best by ', 'Consumir antes de ')}${mon(x.e)}</small></div></div>`).join('')}</div>` : ''}
    <div class="sub-label">${ic('package')}${L('Ready to eat', 'Listo para comer')}</div><div class="list">${ready.map(item).join('')}</div>
    <div class="sub-label">${ic('cooking-pot')}${L('Needs cooking', 'Hay que cocinar')}</div><div class="list">${cook.map(item).join('')}</div>
    <button class="list row" data-go="pantrylist"><span class="lead">${ic('clipboard-list')}</span><div class="grow"><b>${L('Paste or upload a list', 'Pegar o subir una lista')}</b><small>${L('Like "Tuna: 12 cans, 5 oz each"', 'Como "Atún: 12 latas, 5 oz cada una"')}</small></div>${ic('chevron-right', 'chev')}</button>
    <div class="sub-label">${ic('plus')}${L('Something else', 'Otra cosa')}</div>
    ${own.length ? `<div class="list">${own.map(item).join('')}</div>` : ''}
    <div class="card pan-own"><input id="pn" placeholder="${L('e.g. Tortillas, applesauce', 'ej. Tortillas, puré de manzana')}" aria-label="${L('Other food', 'Otra comida')}"><button class="btn small" id="padd">${ic('plus')}${L('Add', 'Agregar')}</button></div>`;
}
function bindPantry(redraw) {
  const get = () => store.get('pantry', { items: [], gal: 0 }), put = P => { P.items = P.items.filter(x => x.q > 0 || x.k.startsWith('own')); store.set('pantry', P); };
  const keep = fn => { const y = scrollY; fn(); redraw(); scrollTo(0, y); };
  // find a saved item by key, creating it from the starter list if it isn't saved yet
  const it = (P, k) => { let x = P.items.find(i => i.k === k); if (!x) { const q = PANTRY_QUICK().find(r => r[0] === k); x = { k, n: q[1], q: 0, m: q[2], c: q[3], e: '' }; P.items.push(x); } return x; };
  view.querySelectorAll('[data-gal]').forEach(b => b.onclick = () => keep(() => { const P = get(); P.gal = Math.max(0, (P.gal || 0) + +b.dataset.gal); put(P); }));
  view.querySelectorAll('[data-pq]').forEach(b => b.onclick = () => keep(() => { const [k, d] = b.dataset.pq.split(','), P = get(), x = it(P, k); x.q = Math.max(0, x.q + +d); put(P); }));
  const own = $('#padd'); if (own) own.onclick = () => { const v = $('#pn').value.trim(); if (!v) return $('#pn').focus(); keep(() => { const P = get(); P.items.push({ k: 'own' + Date.now(), n: v, q: 1, m: 1, c: 0, e: '' }); put(P); }); };
  view.querySelectorAll('[data-pdel]').forEach(b => b.onclick = () => keep(() => { const P = get(); P.items = P.items.filter(x => x.k !== b.dataset.pdel); put(P); }));
  view.querySelectorAll('[data-pm]').forEach(inp => inp.onchange = () => keep(() => { const P = get(), v = parseFloat(inp.value); it(P, inp.dataset.pm).m = isNaN(v) ? 0 : Math.max(0, v); put(P); }));
  view.querySelectorAll('[data-pe]').forEach(inp => inp.onchange = () => keep(() => { const P = get(); it(P, inp.dataset.pe).e = inp.value || ''; put(P); }));
}

/* ================= Kids Mode ================= */
const K = {};
const soundBtn = () => `<button class="k-sound ${voiceOn ? '' : 'off'}" id="snd" aria-label="${voiceOn ? L('Voice on', 'Voz encendida') : L('Voice off', 'Voz apagada')}">${ic(voiceOn ? 'volume-2' : 'volume-x')}</button>`;
const kbar = (title, extra) => `<div class="k-top"><button class="k-home" data-k="home" aria-label="${L('Kids home', 'Inicio de niños')}"><img src="${im('house')}" alt=""></button><span class="k-title">${title}</span><div class="k-tools">${extra || ''}${soundBtn()}</div></div>`;
kview.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) go('kids/' + b.dataset.k); const s = e.target.closest('#snd'); if (s) { voiceOn = !voiceOn; store.set('voice', voiceOn); if (!voiceOn) { queue = []; voice.pause(); } s.classList.toggle('off', !voiceOn); s.innerHTML = ic(voiceOn ? 'volume-2' : 'volume-x'); } });
const readBtn = id => `<button class="k-btn soft" id="${id}" style="width:100%">${ic('volume-2')}${L('Read it', 'Léelo')}</button>`;

K.home = () => {
  kview.innerHTML = `<div class="k-top"><div class="k-tools" style="margin-left:0;flex:1;justify-content:space-between"><button class="hold" id="hold">${ic('lock')}${L('Hold to exit', 'Mantén para salir')}<i></i></button>${soundBtn()}</div></div>
    <div class="k-hello"><img src="${im('moon')}" alt=""><h1>${L('Hi, light helpers!', '¡Hola, ayudantes de la luz!')}</h1></div>
    <div class="k-grid">
      <button class="k-tile c1" data-k="story"><img src="${im('book')}" alt="">${L('Story', 'Cuento')}</button>
      <button class="k-tile c2" data-k="hunt"><img src="${im('flashlight')}" alt="">${L('Flashlight', 'Linterna')}</button>
      <button class="k-tile c3" data-k="safe"><img src="${im('check')}" alt="">${L('Safe?', '¿Seguro?')}</button>
      <button class="k-tile c4" data-k="pack"><img src="${im('backpack')}" alt="">${L('My bag', 'Mi mochila')}</button>
      <button class="k-tile c6" data-k="shadow"><img src="${im('rabbit')}" alt="">${L('Shadows', 'Sombras')}</button>
      <button class="k-tile c7" data-k="breathe"><img src="${im('balloon')}" alt="">${L('Breathe', 'Respira')}</button>
      <button class="k-tile c8" data-k="dance"><img src="${im('disco')}" alt="">${L('Dance', 'Baila')}</button>
      <button class="k-tile c9" data-k="bed"><img src="${im('night')}" alt="">${L('Bedtime', 'A dormir')}</button>
      <button class="k-tile c5 wide" data-k="phone"><img src="${im('telephone')}" alt="" style="width:64px;height:64px"><span>${L('Our phone number', 'Nuestro teléfono')}</span></button>
    </div>`;
  const h = $('#hold'); let t;
  const start = e => { e.preventDefault(); h.classList.add('on'); t = setTimeout(() => { h.classList.remove('on'); go(''); }, 1400); };
  const stop = () => { clearTimeout(t); h.classList.remove('on'); };
  h.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => h.addEventListener(ev, stop));
  h.addEventListener('contextmenu', e => e.preventDefault());
  if (K.home.greeted !== true) { K.home.greeted = true; say('kids_hi'); }
};

/* story */
const STORY = () => [
  ['night', '#2c3a78', L("Uh oh, the lights went off! That's okay. Our grown-ups have a plan.", '¡Uy, se fue la luz! No pasa nada. Nuestros adultos tienen un plan.')],
  ['hug', '#ffd3e0', L('First, find a grown-up and stay close.', 'Primero, busca a un adulto y quédate cerca.')],
  ['flashlight', '#ffe9a8', L('Get your flashlight. You can be the light helper!', '¡Agarra tu linterna. Tú puedes ser el ayudante de la luz!')],
  ['tent', '#cdf3d9', L('We all go to our cozy room and build a blanket fort.', 'Todos vamos a nuestro cuarto calientito y hacemos un fuerte de cobijas.')],
  ['candle', '#ffe0cc', L('We stay away from candles, wires and heaters. Hot things are for grown-ups.', 'Nos alejamos de las velas, los cables y los calentadores. Las cosas calientes son para los adultos.')],
  ['feet', '#dcd6ff', L('If we need to leave, we hold hands and go together.', 'Si tenemos que salir, nos damos la mano y vamos juntos.')],
  ['house', '#cfe8ff', L('If we ever get lost, we stay where we are and ask a helper to find our grown-ups.', 'Si nos perdemos, nos quedamos donde estamos y le pedimos a alguien que nos ayude a encontrar a nuestros adultos.')]
];
const SKEY = ['story0g', 'story1', 'story2', 'story3', 'story4', 'story5g', 'story6g'];
const skey = i => lang === 'es' ? 'story' + i : SKEY[i];
let si = 0;
K.story = () => {
  const S = STORY(), [p, bg, t] = S[si];
  kview.innerHTML = `${kbar(L('Story', 'Cuento'))}<div class="k-card"><div class="k-pic" style="background:${bg}"><img src="${im(p)}" alt=""></div><p class="k-text">${t}</p><div class="k-dots">${S.map((_, i) => `<span class="${i === si ? 'on' : ''}"></span>`).join('')}</div>
    <div class="k-nav"><button class="k-btn soft" id="sb" ${si === 0 ? 'disabled' : ''}>${L('Back', 'Atrás')}</button><button class="k-btn" id="sn">${si === S.length - 1 ? L('Again', 'Otra vez') : L('Next', 'Sigue')}</button></div>
    ${readBtn('sr')}</div>`;
  $('#sn').onclick = () => { si = (si + 1) % S.length; K.story(); say(skey(si)); };
  $('#sb').onclick = () => { if (si) { si--; K.story(); say(skey(si)); } };
  const r = $('#sr'); if (r) r.onclick = () => say(skey(si));
};

/* flashlight hunt */
const HUNT = [['flashlight', 'flashlight', .16, .58], ['water', 'cup', .84, .3], ['teddy', 'teddy', .52, .82], ['snack', 'cookie', .2, .86], ['jacket', 'coat', .82, .74]];
K.hunt = () => {
  let found = new Set(), pos = null;
  kview.innerHTML = `${kbar(L('Flashlight hunt', 'Busca con la linterna'))}<div class="room" id="room"><div class="win"><img src="${im('moon')}" alt=""></div><div class="shelf"></div><div class="rug"></div>
    ${HUNT.map(([k, img, x, y]) => `<img class="item" src="${im(img)}" alt="" style="left:${x * 100}%;top:${y * 100}%">`).join('')}<canvas id="dark" aria-label="${L('Dark room. Move your finger to shine the flashlight.', 'Cuarto oscuro. Mueve el dedo para alumbrar con la linterna.')}"></canvas></div>
    <div class="found" id="found"></div><button class="k-btn soft" id="again" style="width:100%">${L('Play again', 'Jugar otra vez')}</button>`;
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
const QUIZ = () => [
  ['flashlight', L('Using a flashlight in the dark?', '¿Usar una linterna en la oscuridad?'), 1, L('Flashlights are safe and bright.', 'Las linternas son seguras y alumbran mucho.')],
  ['candle', L('Touching a candle?', '¿Tocar una vela?'), 0, L('Candles are hot. Only grown-ups use them.', 'Las velas queman. Solo los adultos las usan.')],
  ['hug', L('Staying close to a grown-up?', '¿Quedarte cerca de un adulto?'), 1, L('Stay close to your grown-ups.', 'Quédate cerca de tus adultos.')],
  ['plug', L('Touching a wire on the ground?', '¿Tocar un cable en el suelo?'), 0, L('Wires can hurt you. Stay far away and tell a grown-up.', 'Los cables te pueden lastimar. Aléjate y avísale a un adulto.')],
  ['cup', L('Drinking water from our water bottle?', '¿Tomar agua de nuestra botella?'), 1, L('Water keeps your body happy.', 'El agua mantiene feliz a tu cuerpo.')],
  ['fire', L('Playing next to a heater?', '¿Jugar junto a un calentador?'), 0, L('Heaters are hot. Play far away.', 'Los calentadores queman. Juega lejos.')],
  ['storm', L('Going outside alone during a storm?', '¿Salir solo durante una tormenta?'), 0, L('Storms are dangerous. Stay inside with a grown-up.', 'Las tormentas son peligrosas. Quédate adentro con un adulto.')],
  ['tent', L('Snuggling in a blanket fort?', '¿Acurrucarte en un fuerte de cobijas?'), 1, L('Blanket forts keep us warm.', 'Los fuertes de cobijas nos mantienen calientitos.')]
];
let qi = 0, score = 0;
K.safe = () => {
  let answered = false, timer;
  const Q = QUIZ(), [p, q] = Q[qi];
  kview.innerHTML = `${kbar(L('Safe or not?', '¿Seguro o no?'))}<div class="k-card"><div class="k-pic" style="background:#eef0fa;width:170px;height:170px"><img src="${im(p)}" alt="" style="width:110px;height:110px"></div><p class="k-text">${q}</p>
    <div class="k-nav"><button class="k-yes" id="y"><img src="${im('check')}" alt="">${L('Safe', 'Seguro')}</button><button class="k-no" id="n"><img src="${im('cross')}" alt="">${L('Not safe', 'No seguro')}</button></div>
    <p class="k-say" id="fb" aria-live="polite"></p><div class="k-stars">${Q.map((_, i) => `<img src="${im('star')}" alt="" class="${i < score ? 'lit' : ''}">`).join('')}</div>
    ${readBtn('qr')}</div>`;
  function next() { clearTimeout(timer); qi = (qi + 1) % Q.length; if (qi === 0) { say('quizdone'); score = 0; } K.safe(); if (qi) say('q' + qi); }
  function ans(v) {
    if (answered) return next(); answered = true;
    const [, , safe, why] = Q[qi], right = v === !!safe; if (right) score++;
    $('#fb').textContent = (right ? L('Great job! ', '¡Muy bien! ') : L('Not quite. ', 'Casi. ')) + why; say('q' + qi + (right ? 'right' : 'wrong') + (qi === 2 && lang === 'en' ? 'g' : ''));
    kview.querySelectorAll('.k-stars img').forEach((s, i) => s.classList.toggle('lit', i < score));
    timer = setTimeout(next, 4600);
  }
  $('#y').onclick = () => ans(true); $('#n').onclick = () => ans(false); const r = $('#qr'); if (r) r.onclick = () => say('q' + qi);
};

/* pack the bag */
const PACK = [['flashlight', 'flashlight', 1], ['water', 'cup', 1], ['tv', 'tv', 0], ['teddy', 'teddy', 1], ['snack', 'cookie', 1], ['candle', 'candle', 0], ['jacket', 'coat', 1], ['medicine', 'pill', 1]];
K.pack = () => {
  let packed = new Set(); const need = PACK.filter(p => p[2]).length;
  function draw() {
    kview.innerHTML = `${kbar(L('Pack my bag', 'Mi mochila'))}<div class="bag"><img src="${im('backpack')}" alt=""><div><b>${packed.size} ${L('of', 'de')} ${need}</b><div style="font-size:1rem">${packed.size === need ? L('All packed!', '¡Lista!') : L('Tap what goes in the bag', 'Toca lo que va en la mochila')}</div></div></div>
      <div class="items">${PACK.map(([k, img], i) => `<button data-i="${i}" class="${packed.has(k) ? 'in' : ''}" aria-label="${k}"><img src="${im(img)}" alt=""></button>`).join('')}</div>
      <button class="k-btn soft" id="again" style="width:100%">${L('Unpack and play again', 'Vaciar y jugar otra vez')}</button>`;
    kview.querySelectorAll('.items button').forEach(b => b.onclick = () => {
      const [k, , ok] = PACK[+b.dataset.i];
      if (ok) { if (!packed.has(k)) { packed.add(k); packed.size === need ? say('pack_' + k, 'pack_done') : say('pack_' + k); draw(); } }
      else { say('pack_' + k); b.classList.remove('oops'); void b.offsetWidth; b.classList.add('oops'); }
    });
    $('#again').onclick = () => { packed = new Set(); draw(); };
  }
  draw(); say('pack_intro');
};

/* shadow puppets: a lit wall that follows your finger; tap the shadow to make it move */
const PUP = () => [['bunny', L('Bunny', 'Conejo'), L('Make a fist. Hold up two fingers for ears.', 'Haz un puño. Levanta dos dedos para las orejas.')],
  ['dog', L('Doggy', 'Perrito'), L('Flat hand. Thumb up for an ear, drop your pinky for the mouth.', 'Mano plana. Pulgar arriba para la oreja, baja el meñique para la boca.')],
  ['bird', L('Bird', 'Pájaro'), L('Cross your wrists, hook your thumbs, flap your fingers.', 'Cruza las muñecas, engancha los pulgares, mueve los dedos.')],
  ['swan', L('Swan', 'Cisne'), L('Arm up, bend your hand down, pinch your fingers together for the beak.', 'Brazo arriba, dobla la mano hacia abajo y junta los dedos para el pico.')]];
let pupI = 0;
K.shadow = () => {
  const P = PUP(), [k, name, how] = P[pupI];
  kview.innerHTML = `${kbar(L('Shadow animals', 'Animales de sombra'))}
    <div class="wall" id="wall"><div class="pup p-${k}" id="pup" role="img" aria-label="${name}">${pupSVG(k, 'shadow', 'img/')}</div><div class="wall-name">${name}</div></div>
    <div class="hands-card"><div class="hands-pic" aria-hidden="true">${pupSVG(k, 'hands', 'img/')}</div><p class="k-hint"><b>${L('Your hands', 'Tus manos')}</b>${how}</p></div>
    <div class="k-nav"><button class="k-btn soft" id="pb">${L('Back', 'Atrás')}</button><button class="k-btn" id="pn">${L('Next', 'Sigue')}</button></div>`;
  const wall = $('#wall'), pup = $('#pup');
  const light = e => { const r = wall.getBoundingClientRect(); wall.style.setProperty('--x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); wall.style.setProperty('--y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); };
  wall.addEventListener('pointermove', light); wall.addEventListener('pointerdown', e => { light(e); pup.classList.remove('go'); void pup.offsetWidth; pup.classList.add('go'); say('shadow_' + k); });
  $('#pn').onclick = () => { pupI = (pupI + 1) % P.length; K.shadow(); say('shadow_' + P[pupI][0]); };
  $('#pb').onclick = () => { pupI = (pupI + P.length - 1) % P.length; K.shadow(); say('shadow_' + P[pupI][0]); };
  if (!K.shadow.greeted) { K.shadow.greeted = true; say('shadow_intro', 'shadow_' + k); }
};

/* brave breathing: the balloon fills as you breathe in and shrinks as you blow out */
K.breathe = () => {
  const N = 5, IN = 4000, OUT = 5000; let n = 0, phase = 'ready', t0 = 0, raf;
  kview.innerHTML = `${kbar(L('Brave breathing', 'Respira valiente'))}<div class="k-card breathe"><div class="bal-wrap"><div class="bal" id="bal"><img src="${im('balloon')}" alt=""></div></div>
    <p class="k-text" id="bt">${L('Watch the balloon', 'Mira el globo')}</p><div class="k-stars" id="bs">${Array.from({ length: N }, () => `<img src="${im('star')}" alt="">`).join('')}</div>
    <button class="k-btn" id="bgo" style="width:100%">${L('Start', 'Empezar')}</button></div>`;
  const bal = $('#bal'), bt = $('#bt'), go_ = $('#bgo');
  const stars = () => kview.querySelectorAll('#bs img').forEach((s, i) => s.classList.toggle('lit', i < n));
  function frame(now) {
    if (!bal.isConnected) return;
    const e = now - t0;
    if (phase === 'in') { const p = Math.min(e / IN, 1); bal.style.setProperty('--s', (.5 + .5 * (1 - Math.cos(Math.PI * p)) / 2).toFixed(3)); if (p >= 1) { phase = 'out'; t0 = now; bt.textContent = L('Blow out…', 'Sopla…'); say('breathe_out'); } }
    else if (phase === 'out') { const p = Math.min(e / OUT, 1); bal.style.setProperty('--s', (1 - .5 * (1 - Math.cos(Math.PI * p)) / 2).toFixed(3)); if (p >= 1) { n++; stars(); if (n >= N) { phase = 'done'; bt.textContent = L('Great breathing! Calm and brave.', '¡Muy bien! Tranquilo y valiente.'); go_.hidden = false; go_.textContent = L('Again', 'Otra vez'); say('breathe_done'); return; } phase = 'in'; t0 = now; bt.textContent = L('Breathe in…', 'Toma aire…'); say('breathe_in'); } }
    raf = requestAnimationFrame(frame);
  }
  go_.onclick = () => { n = 0; stars(); go_.hidden = true; phase = 'in'; t0 = performance.now(); bt.textContent = L('Breathe in…', 'Toma aire…'); say('breathe_in'); raf = requestAnimationFrame(frame); };
  say('breathe_intro');
};

/* freeze dance: music made on the phone (no files); it stops at random and everyone freezes */
K.dance = () => {
  if (danceStop) danceStop();
  kview.innerHTML = `${kbar(L('Freeze dance', 'Baila y congélate'))}<div class="k-card dance" id="dc"><div class="dancers" id="dz"><img src="${im('teddy')}" alt=""><img src="${im('disco')}" alt="" class="ball"><img src="${im('rabbit')}" alt=""></div>
    <p class="k-text" id="dt">${L('Dance when the music plays. When it stops, freeze!', 'Baila cuando suene la música. ¡Cuando pare, congélate!')}</p>
    <div class="k-say" id="dr"></div><button class="k-btn" id="dgo" style="width:100%">${ic('play')}${L('Start the music', 'Poner la música')}</button></div>`;
  const dc = $('#dc'), dt = $('#dt'), dr = $('#dr'), btn = $('#dgo');
  let ac = null, master, playing = false, frozen = false, nextT = 0, beat = 0, timer, sched, rounds = 0;
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5], BASS = [130.81, 174.61, 196, 130.81];
  function tone(f, t, d, type, vol) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02); }
  function tick() { const b = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * .03, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); b.buffer = buf; const g = ac.createGain(); g.gain.value = .12; b.connect(g); g.connect(master); return b; }
  function schedule() { const spb = .25; while (nextT < ac.currentTime + .2) { if (beat % 2 === 0) tone(BASS[(beat >> 3) % 4], nextT, .22, 'triangle', .35); if (Math.random() < .8) tone(NOTES[Math.floor(Math.random() * NOTES.length)], nextT, .18, 'square', .06); const h = tick(); h.start(nextT); nextT += spb; beat++; } }
  function music(on) { if (on) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(.9, ac.currentTime, .05); nextT = ac.currentTime + .05; sched = setInterval(schedule, 60); } else { clearInterval(sched); master.gain.setTargetAtTime(0, ac.currentTime, .03); } }
  function dance() { if (!dc.isConnected) return stop(); frozen = false; dc.classList.remove('frozen'); dc.classList.add('moving'); dt.textContent = L('Dance!', '¡A bailar!'); music(true); timer = setTimeout(freeze, 4000 + Math.random() * 6000); }
  function freeze() { if (!dc.isConnected) return stop(); frozen = true; music(false); dc.classList.remove('moving'); dc.classList.add('frozen'); dt.textContent = L('FREEZE!', '¡CONGELADOS!'); say('dance_freeze'); rounds++; dr.textContent = '⭐'.repeat(Math.min(rounds, 10)); timer = setTimeout(() => { say('dance_go'); dance(); }, 3000 + Math.random() * 1500); }
  function stop() { clearTimeout(timer); clearInterval(sched); try { if (ac) ac.close(); } catch (e) {} ac = null; playing = false; danceStop = null; if (dc.isConnected) { dc.classList.remove('moving', 'frozen'); btn.innerHTML = ic('play') + L('Start the music', 'Poner la música'); } }
  btn.onclick = () => {
    if (playing) return stop();
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { dt.textContent = L('Music is not available on this phone.', 'La música no funciona en este teléfono.'); return; }
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination); playing = true; danceStop = stop; rounds = 0; dr.textContent = '';
    btn.innerHTML = ic('pause') + L('Stop', 'Parar'); dance();
  };
  say('dance_intro');
};

/* bedtime: a dim night-light screen, a short routine with the voice, then rain or a music box made on the phone */
const BED = () => [['glow', L('Glow stick on', 'Barra de luz'), 'bed_glow'], ['teddy', L('Hug teddy', 'Abraza al osito'), 'bed_teddy'], ['tent', L('Snuggle in', 'Acurrúcate'), 'bed_blanket'], ['moon', L('Eyes closed', 'Ojos cerrados'), 'bed_eyes']];
K.bed = () => {
  if (bedStop) bedStop();
  const S = BED(); let sound = store.get('bedSound', 'rain'), mins = store.get('bedMins', 20);
  const stepPic = ([k]) => k === 'glow' ? '<span class="glowstick"></span>' : `<img src="${im(k)}" alt="">`;
  kview.innerHTML = `<div class="bed" id="bed"><div class="stars"></div>
    ${kbar(L('Bedtime', 'A dormir'))}
    <div class="bed-moon"><img src="${im('moon')}" alt=""></div>
    <div class="bed-steps" id="bsteps">${S.map((st, i) => `<div class="bed-step" data-i="${i}">${stepPic(st)}<span>${st[1]}</span></div>`).join('')}</div>
    <div class="bed-ctl" id="bctl">
      <div class="bed-row" role="group" aria-label="${L('Sound', 'Sonido')}">${[['rain', L('Rain', 'Lluvia')], ['music', L('Music box', 'Cajita musical')], ['off', L('Quiet', 'Silencio')]].map(([k, t]) => `<button class="bed-chip ${sound === k ? 'on' : ''}" data-snd="${k}">${t}</button>`).join('')}</div>
      <div class="bed-row" role="group" aria-label="${L('Timer', 'Tiempo')}">${[10, 20, 40].map(m => `<button class="bed-chip ${mins === m ? 'on' : ''}" data-min="${m}">${m} min</button>`).join('')}</div>
      <button class="k-btn bed-go" id="bgo">${ic('moon')}${L('Good night', 'Buenas noches')}</button>
      <p class="bed-note">${L('The screen stays on as a night-light, then turns itself off when the timer ends.', 'La pantalla se queda prendida como lamparita y se apaga sola al terminar el tiempo.')}</p>
    </div><p class="bed-sleep" id="bsl" aria-live="polite"></p></div>`;
  const bed = $('#bed'), ctl = $('#bctl'), sl = $('#bsl');
  let ac = null, out = null, timers = [], lock = null, running = false, hideT;
  kview.querySelectorAll('[data-snd]').forEach(b => b.onclick = () => { sound = b.dataset.snd; store.set('bedSound', sound); kview.querySelectorAll('[data-snd]').forEach(x => x.classList.toggle('on', x === b)); if (running) { stopSound(); startSound(); } });
  kview.querySelectorAll('[data-min]').forEach(b => b.onclick = () => { mins = +b.dataset.min; store.set('bedMins', mins); kview.querySelectorAll('[data-min]').forEach(x => x.classList.toggle('on', x === b)); });
  function startSound() {
    if (sound === 'off') return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination); out.gain.setTargetAtTime(sound === 'rain' ? .5 : .35, ac.currentTime, 2);
    if (sound === 'rain') {
      const len = ac.sampleRate * 4, buf = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .032; b2 = .95 * b2 + w * .048; d[i] = (b0 + b1 + b2 + w * .02) * .5; if (Math.random() < .00035) d[i] += (Math.random() - .5) * .6; } }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      src.connect(lp); lp.connect(out); src.start();
    } else {
      // music box: "Twinkle, Twinkle, Little Star" (traditional tune, public domain), slow and soft
      const N = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880 };
      const tune = 'CCGGAAG-FFEEDDC-GGFFEED-GGFFEED-CCGGAAG-FFEEDDC-';
      let t = ac.currentTime + .3; const beat = .62;
      const play = () => { if (!out) return; for (const ch of tune) { if (ch !== '-') { const f = N[ch]; [1, 2.01].forEach((m, j) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j ? .05 : .22, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + 1.8); o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.9); }); } t += beat; } t += beat * 2; };
      play(); const loop = setInterval(() => { if (!out) return clearInterval(loop); if (t - ac.currentTime < 4) play(); }, 1000); timers.push(loop);
    }
  }
  function stopSound() { if (out && ac) { try { out.gain.setTargetAtTime(0, ac.currentTime, .3); } catch (e) {} const o = out; setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 1500); } out = null; }
  function showCtl() { bed.classList.remove('asleep'); clearTimeout(hideT); if (running) hideT = setTimeout(() => bed.classList.add('asleep'), 6000); }
  function stop() { timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = []; clearTimeout(hideT); stopSound(); setTimeout(() => { try { ac && ac.close(); } catch (e) {} ac = null; }, 1600); try { lock && lock.release(); } catch (e) {} lock = null; running = false; bedStop = null; if (bed.isConnected) { bed.classList.remove('asleep', 'running'); $('#bgo').innerHTML = ic('moon') + L('Good night', 'Buenas noches'); kview.querySelectorAll('.bed-step').forEach(x => x.classList.remove('on', 'done')); } }
  $('#bgo').onclick = async () => {
    if (running) { stop(); sl.textContent = ''; return; }
    running = true; bedStop = stop; bed.classList.add('running'); $('#bgo').innerHTML = ic('pause') + L('Stop', 'Parar');
    try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) { lock = null; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    say('bed_intro');
    const steps = [...kview.querySelectorAll('.bed-step')];
    S.forEach(([, , clip], i) => timers.push(setTimeout(() => { steps.forEach((x, j) => { x.classList.toggle('on', j === i); x.classList.toggle('done', j < i); }); say(clip); }, 3500 + i * 6500)));
    const after = 3500 + S.length * 6500 + 2000;
    timers.push(setTimeout(() => { steps.forEach(x => { x.classList.remove('on'); x.classList.add('done'); }); startSound(); sl.textContent = L('Sleep tight', 'Que descanses'); showCtl(); }, after));
    timers.push(setTimeout(() => { if (out && ac) out.gain.setTargetAtTime(0, ac.currentTime, 20); }, after + mins * 60000 - 60000));
    timers.push(setTimeout(() => { stop(); sl.textContent = L('Sleep tight', 'Que descanses'); }, after + mins * 60000));
  };
  bed.addEventListener('pointerdown', e => { if (running && bed.classList.contains('asleep')) { e.preventDefault(); showCtl(); } });
  document.addEventListener('visibilitychange', async () => { if (running && document.visibilityState === 'visible' && navigator.wakeLock && !lock) { try { lock = await navigator.wakeLock.request('screen'); } catch (e) {} } });
};

/* phone number */
K.phone = () => {
  const d = String(info.phone || '').replace(/\D/g, '').slice(0, 11); let pi = 0;
  if (!d) { kview.innerHTML = `${kbar(L('Our number', 'Nuestro número'))}<div class="k-card"><div class="k-pic" style="background:#ffe0cc"><img src="${im('telephone')}" alt=""></div><p class="k-text">${L('Ask a grown-up to add our phone number.', 'Pídele a un adulto que agregue nuestro número.')}</p><p style="font-family:var(--ui);font-size:.95rem;color:#5b6280">${L('Grown-ups: exit Kids Mode, tap the gear, fill in "Our phone number".', 'Adultos: salgan del Modo niños, toquen el engrane y llenen "Nuestro número de teléfono".')}</p></div>`; return; }
  function draw() {
    let h = ''; for (let i = 0; i < d.length; i++) { if (d.length === 10 && (i === 3 || i === 6)) h += '<span class="gap"></span>'; h += `<span class="${i < pi ? 'done' : i === pi ? 'next' : ''}">${i < pi ? d[i] : '•'}</span>`; }
    kview.innerHTML = `${kbar(L('Our number', 'Nuestro número'))}<div class="k-card"><div class="digits">${h}</div><div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map(k => k ? `<button data-n="${k}" class="${k === d[pi] ? 'hint' : ''}">${k}</button>` : '<span></span>').join('')}</div><p class="k-say" id="pf"></p></div>`;
    kview.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      if (b.dataset.n === d[pi]) { pi++; say('d' + b.dataset.n); if (pi >= d.length) { sayAfter('phone_done'); draw(); $('#pf').textContent = L('You know our number!', '¡Ya te sabes nuestro número!'); setTimeout(() => { pi = 0; draw(); }, 3800); return; } draw(); }
      else { say('phone_try'); $('#pf').textContent = L('Try the glowing button!', '¡Prueba el botón que brilla!'); }
    });
  }
  draw(); say('phone_intro');
};

/* ---------- offline ---------- */
let swOK = false;
function setStatus(ok, t) { swOK = ok; const s = $('#status'); if (s) { s.classList.toggle('ok', ok); s.querySelector('span').textContent = t; } }
const onlineText = () => navigator.onLine ? L('Works offline', 'Funciona sin internet') : L('Offline · all good', 'Sin internet · todo bien');
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => setStatus(true, onlineText())).catch(() => setStatus(false, L('Offline saving unavailable', 'No se pudo guardar para usar sin internet')));
} else setStatus(false, L('Offline saving unavailable', 'No se pudo guardar para usar sin internet'));
addEventListener('offline', () => swOK && setStatus(true, onlineText()));
addEventListener('online', () => swOK && setStatus(true, onlineText()));

route();
})();
