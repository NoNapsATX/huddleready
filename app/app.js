(function () {
'use strict';
const $ = s => document.querySelector(s);
const view = $('#view'), kids = $('#kids'), kview = $('#kview');

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('hr-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hr-' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- language ---------- */
let lang = store.get('lang', (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en');
const L = (en, es) => lang === 'es' ? es : en;
function setLang(l) { lang = l; store.set('lang', l); document.documentElement.lang = l; }
document.documentElement.lang = lang;

/* ---------- helpers ---------- */
const ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const im = n => `img/${n}.svg`;
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tel = n => 'tel:' + String(n).replace(/[^\d+]/g, '');
const go = h => { if (location.hash.slice(1) === h) route(); else location.hash = h; };
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; el.classList.toggle('high', !!document.querySelector('.screen.docked')); clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2000); }
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
  g('This week', 'Esta semana', [
    ['maps', 'Download offline maps of our area', 'Descargar mapas sin conexión de nuestra zona'],
    ['warn', 'Sign up at WarnCentralTexas.org', 'Inscribirse en WarnCentralTexas.org'],
    ['utxt', "Sign up for the electric company's outage texts", 'Inscribirse en los textos de apagones de la compañía eléctrica'],
    H().heat === 'gas' && ['gasoff', 'Know how to shut off the gas', 'Saber cómo cerrar el gas'],
    ['co', 'Battery CO alarm in the bedroom', 'Alarma de monóxido de carbono con baterías en el cuarto'],
    ['radio', 'Battery or crank radio', 'Radio de baterías o de manivela'],
    ['panel', 'Find breaker panel and water shutoff', 'Ubicar el panel de breakers y la llave del agua'],
    ['info', 'Fill in Our info on every phone', 'Llenar Nuestra info en cada teléfono'],
    ['walk', apt() ? 'Walk the stairways out at night' : 'Walk the way out at night', apt() ? 'Recorrer las escaleras de salida de noche' : 'Recorrer la salida de noche'],
    ['drill', 'Do a practice drill', 'Hacer un simulacro']
  ]);
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
  g('Power and light', 'Luz y energía', [
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
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [name, ...rest] = h.split('/');
  clearInterval(route.tick); if (name !== 'calls') callEdit = false;
  document.documentElement.classList.toggle('night', !!outage());
  if (name === 'kids') { kids.hidden = false; document.body.style.overflow = 'hidden'; (K[rest[0] || 'home'] || K.home)(rest.slice(1)); return; }
  kids.hidden = true; document.body.style.overflow = ''; try { voice.pause(); } catch (e) {}
  if (!home && name !== 'setup' && name !== 'import') { location.replace('#setup'); return; }
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
  const top = `<div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">Huddle Ready</div><div class="status ${swOK ? 'ok' : ''}" id="status"><i></i><span>${swOK ? L('Works offline', 'Funciona sin internet') : L('Saving for offline…', 'Guardando para usar sin internet…')}</span></div></div>
    <button class="lang-chip" id="lang" lang="${lang === 'es' ? 'en' : 'es'}" aria-label="${L('Cambiar a español', 'Switch to English')}">${ic('languages')}${L('ES', 'EN')}</button><button class="icon-btn" data-go="details" aria-label="${L('Our info and settings', 'Nuestra info y ajustes')}">${ic('settings')}</button></div>`;
  let main;
  if (o) {
    const ft = outTime() || o.start, left = 4 * 3600000 - (Date.now() - ft);
    main = `<div class="live"><div class="live-head"><span class="dot"></span><b>${L('Power out', 'Sin luz')}</b><span class="muted" id="elapsed" style="margin-left:auto">${fmtDur(Date.now() - o.start)}</span></div>
      <div class="muted">${L('Fridge', 'Refri')}: <b id="fridge">${fridgeLeft(left)}</b></div>
      <div class="row2">${o.done ? `<button class="btn ghost" data-go="stay">${L('Stay or go?', '¿Quedarse o irse?')}</button>` : `<button class="btn" data-go="outage">${L('Continue checklist', 'Seguir la lista')}</button>`}<button class="btn ghost" id="end">${L('Power is back', 'Ya volvió la luz')}</button></div></div>`;
  } else {
    main = `<button class="sos" id="sos">${ic('zap-off')}<div><b>${L('Power is out', 'Se fue la luz')}</b><span>${L('Start the first 10 minutes', 'Empieza los primeros 10 minutos')}</span></div>${ic('chevron-right', 'go')}</button>`;
  }
  const tile = (go, i, t) => `<button class="tile" data-go="${go}">${ic(i)}<span>${t}</span></button>`;
  const where = [info.building && L('Bldg ', 'Edif. ') + info.building, info.unit && L('Unit ', 'Apto. ') + info.unit].filter(Boolean).join(', ');
  const u = util(), skipped = (H().skipped || []).length, drill = store.get('lastDrill', null);
  view.innerHTML = `<div class="screen">${top}${main}
    <div class="row2"><a class="call" href="tel:911">${ic('siren')}<div><b>911</b><small>${L('Emergency', 'Emergencia')}</small></div></a>${u.phone ? `<a class="call" href="${tel(u.phone)}">${ic('phone')}<div><b>${L('Outage', 'Apagón')}</b><small>${esc(u.phone)}</small></div></a>` : `<button class="call" data-go="details">${ic('phone')}<div><b>${L('Outage', 'Apagón')}</b><small>${L('Add number', 'Agregar número')}</small></div></button>`}</div>
    ${H().cross ? `<div class="where">${ic('map-pin')}<span>${L('Tell 911: we\'re near', 'Dile al 911: estamos cerca de')} <b>${esc(H().cross)}</b>${H().zip ? ', ' + esc(H().zip) : ''}</span></div>` : ''}
    ${!o && checkDue() ? `<button class="finish due" data-go="check">${ic('bell')}<div><b>${L('Time for your twice-a-year check', 'Toca la revisión de cada seis meses')}</b><small>${L('Clocks changed. About 15 minutes.', 'Cambió la hora. Unos 15 minutos.')}</small></div>${ic('chevron-right', 'chev')}</button>` : ''}
    ${skipped && !o ? `<button class="finish" data-go="setup/resume">${ic('list-checks')}<div><b>${L('Finish setting up', 'Termina de configurar')}</b><small>${skipped} ${skipped > 1 ? L('questions left', 'preguntas pendientes') : L('question left', 'pregunta pendiente')}</small></div>${ic('chevron-right', 'chev')}</button>` : ''}
    <button class="search home-search" data-go="find">${ic('search')}<span>${L('Search: fever, freezer, generator…', 'Buscar: fiebre, congelador, generador…')}</span></button>
    <div class="tiles">${tile('stay', 'door-open', L('Stay or go', 'Quedarse o irse'))}${tile('food', 'refrigerator', L('Food clock', 'Reloj de comida'))}${tile('calls', 'phone', L('Call list', 'Teléfonos'))}${tile('plan', 'book-open', L('Plan', 'Plan'))}${tile('supplies', 'list-checks', L('Supplies', 'Provisiones'))}${tile('details', 'house', L('Our info', 'Nuestra info'))}</div>
    ${o ? '' : `<button class="list row drill-row" data-go="drill"><span class="lead">${ic('timer')}</span><div class="grow"><b>${L('Practice drill', 'Simulacro')}</b><small>${drill ? L('Last one ', 'El último fue el ') + fmtDate(drill) : L('5 minutes. Walk through an outage before a real one.', '5 minutos. Practica un apagón antes de que pase de verdad.')}</small></div>${ic('chevron-right', 'chev')}</button>`}
    ${hasKids() ? `<button class="kids-btn" data-go="kids"><img src="${im('flashlight')}" alt=""><div><b>${L('Kids Mode', 'Modo niños')}</b><span>${L('Story and games with a voice', 'Cuento y juegos')}</span></div></button>` : ''}
    <div class="meet">${ic('map-pin')}<span>${L('Meeting point: home', 'Punto de reunión: casa')}${where ? ' (' + esc(where) + ')' : ''}${info.outside ? L('. Outside spot: ', '. Lugar afuera: ') + esc(info.outside) : ''}</span></div></div>`;
  $('#lang').onclick = () => { setLang(lang === 'es' ? 'en' : 'es'); R.home(); };
  const sos = $('#sos'); if (sos) sos.onclick = () => { const now = Date.now(); store.set('outage', { start: now, step: 0, done: false }); store.set('outTime', now); go('outage'); };
  const end = $('#end'); if (end) { let armed = false; end.onclick = () => { if (!armed) { armed = true; end.textContent = L('Tap again to confirm', 'Toca otra vez para confirmar'); setTimeout(() => { armed = false; end.textContent = L('Power is back', 'Ya volvió la luz'); }, 3000); return; } store.set('outage', null); document.documentElement.classList.remove('night'); toast(L('Glad it\'s back. Check food before eating.', 'Qué bueno. Revisa la comida antes de comer.')); R.home(); }; }
  route.tick = setInterval(() => { const o = outage(); if (!o) return; const e = $('#elapsed'), f = $('#fridge'); const left = 4 * 3600000 - (Date.now() - (outTime() || o.start)); if (e) e.textContent = fmtDur(Date.now() - o.start); if (f) f.textContent = fridgeLeft(left); }, 30000);
};
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
      ${nearSection()}</div>`;
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

/* ---------- plan ---------- */
const plan = () => (lang === 'es' && window.PLAN_ES && window.PLAN_ES.length) ? window.PLAN_ES : (window.PLAN || []);
const esNote = () => lang === 'es' && !(window.PLAN_ES && window.PLAN_ES.length) ? `<div class="es-note">${L('', 'El plan completo está en inglés por ahora. La traducción viene pronto.')}</div>` : '';
R.plan = (rest) => {
  if (rest[0]) return planSection(rest[0], rest[1]);
  const q0 = store.get('planq', '');
  view.innerHTML = `<div class="screen">${bar(L('Our plan', 'Nuestro plan'))}${esNote()}
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
  ['check', 'bell', L('Twice-a-year check', 'Revisión de cada seis meses'), 'check reminder calendar battery batteries alarm smoke expiration twice year revisión recordatorio calendario batería alarma humo caducidad'],
  ['share', 'share-2', L('Share with family', 'Compartir con la familia'), 'share send family spouse grandparent link text compartir enviar familia esposa abuelos enlace mensaje'],
  ['drill', 'timer', L('Practice drill', 'Simulacro'), 'drill practice test rehearse simulacro práctica ensayo'],
  ['kids', 'baby', L('Kids Mode', 'Modo niños'), 'kids children child game story toddler niños niño juego cuento'],
  ['plan', 'book-open', L('Our plan', 'Nuestro plan'), 'plan guide read medical first aid guía leer médica primeros auxilios']
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
      $('#fres').innerHTML = `<div class="label">${L('Try', 'Prueba')}</div><div class="chips">${(lang === 'es' ? ['fiebre', 'congelador', 'monóxido', 'agua', 'tornado', 'insulina', 'mascotas'] : ['fever', 'freezer', 'carbon monoxide', 'water', 'tornado', 'insulin', 'pets']).map(w => `<button class="chip" data-w="${w}">${w}</button>`).join('')}</div>`;
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
    const mark = x => { const at = Math.max(0, norm(x).indexOf(words[0]) - 70); if (x.length > 200) x = (at > 0 ? '…' + x.slice(at, at + 190) : x.slice(0, 190)) + '…'; let h = esc(x); words.forEach(w => { const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'); h = h.replace(re, '<mark>$1</mark>'); }); return h; };
    $('#fres').innerHTML = (sc.length ? `<div class="label">${L('Go to', 'Ir a')}</div><div class="list">${sc.map(([go, icn, title]) => `<button class="row" data-go="${go}"><span class="lead">${ic(icn)}</span><div class="grow"><b>${title}</b></div>${ic('chevron-right', 'chev')}</button>`).join('')}</div>` : '') +
      (hits.length ? `<div class="label">${L('In the plan', 'En el plan')}</div><div class="list">${hits.slice(0, 8).map(([sec, f, c]) => `<button class="row snip" data-go="plan/${sec.id}/${encodeURIComponent(t)}"><span class="lead">${ic(sec.icon)}</span><div class="grow"><b>${sec.title}</b>${f.map(x => `<small>${mark(x)}</small>`).join('')}${c > 2 ? `<small class="more">+${c - 2} ${L('more', 'más')}</small>` : ''}</div>${ic('chevron-right', 'chev')}</button>`).join('')}</div>` : '') +
      (!sc.length && !hits.length ? `<div class="empty">${L('Nothing found. Try one simple word, like "water" or "cold".', 'No encontramos nada. Prueba una palabra sencilla, como "agua" o "frío".')}</div>` : '');
  }
  q.oninput = run; run(); setTimeout(() => q.focus(), 60);
};

/* ---------- supplies ---------- */
const calcDefault = () => ({ a: (H().adults || 2), k: H().kids || 0, d: littles() ? 1 : 0, days: 14 });
let supTab = 'list';
R.supplies = () => {
  const ticks = store.get('kit2', {}), KIT = kit();
  const all = KIT.flatMap(([, items]) => items), done = all.filter(([id]) => ticks[id]).length;
  let body;
  if (supTab === 'list') {
    body = `<div class="card"><div class="progress"><div class="track"><i style="width:${done / all.length * 100}%;background:var(--ok)"></i></div><b>${done}/${all.length}</b></div><span class="muted small">${L('Saved on this phone.', 'Se guarda en este teléfono.')}</span></div>` +
      KIT.map(([g, items]) => `<div class="label">${g}</div><div class="list">${items.map(([id, t]) => `<label class="chk"><input type="checkbox" data-it="${id}" ${ticks[id] ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>`).join('');
  } else {
    const c = Object.assign(calcDefault(), store.get('calc', {})); const p = c.a + c.k;
    const rows = [[L('Drinking water', 'Agua para tomar'), p * c.days + L(' gal', ' gal'), L('1 gallon per person per day', '1 galón por persona al día')], [L('Meals', 'Comidas'), p * c.days * 3, L('3 per person per day', '3 por persona al día')], [L("Kids' snacks", 'Botanas para niños'), c.k * c.days * 2, L('2 a day per child', '2 al día por niño')], [L('Diapers or pull-ups', 'Pañales'), c.d * c.days * 6, L('About 6 a day', 'Unos 6 al día')], [L('Flashlights or headlamps', 'Linternas o lámparas de cabeza'), p, L('1 per person', '1 por persona')], [L('Power banks', 'Baterías portátiles'), Math.max(1, c.a), L('1 per adult', '1 por adulto')], [L('Prescriptions', 'Recetas'), c.days + L(' days', ' días'), L('Each person', 'Cada persona')], [L('Cash', 'Efectivo'), '$' + Math.max(200, p * 50), L('Small bills', 'Billetes chicos')]];
    if (H().pets) rows.push([L('Pet food', 'Comida de mascota'), c.days + L(' days', ' días'), L('Plus water for them', 'Más agua para ellas')]);
    const st = (k, t) => `<div class="stepper" style="padding:10px 16px;border-bottom:1px solid var(--line)"><b style="flex:1">${t}</b><button data-c="${k},-1" aria-label="${L('Less', 'Menos')}">−</button><span class="val" style="font-size:1.3rem">${c[k]}</span><button data-c="${k},1" aria-label="${L('More', 'Más')}">+</button></div>`;
    body = `<div class="list">${st('a', L('Adults', 'Adultos'))}${st('k', L('Children', 'Niños'))}${st('d', L('In diapers', 'Con pañal'))}${st('days', L('Days', 'Días'))}</div><div class="list calc"><table>${rows.map(r => `<tr><td>${r[0]}<small>${r[2]}</small></td><td class="n">${r[1]}</td></tr>`).join('')}</table></div>`;
  }
  view.innerHTML = `<div class="screen">${bar(L('Supplies', 'Provisiones'))}<div class="seg"><button aria-pressed="${supTab === 'list'}" data-t="list">${L('Checklist', 'Lista')}</button><button aria-pressed="${supTab === 'calc'}" data-t="calc">${L('How much', 'Cuánto')}</button></div>${body}</div>`;
  view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { supTab = b.dataset.t; R.supplies(); });
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
    <button class="list row" data-go="setup/edit"><span class="lead">${ic('house')}</span><div class="grow"><b>${L('Our household', 'Nuestro hogar')}</b><small>${sum}</small></div>${ic('chevron-right', 'chev')}</button>
    <button class="list row" data-go="check"><span class="lead">${ic('bell')}</span><div class="grow"><b>${L('Twice-a-year check and reminders', 'Revisión de cada seis meses y recordatorios')}</b><small>${store.get('lastCheck', 0) ? L('Last done ', 'La última fue el ') + fmtDate(store.get('lastCheck', 0)) : L('Add reminders to your calendar', 'Agrega recordatorios a tu calendario')}</small></div>${ic('chevron-right', 'chev')}</button>
    <button class="list row share-row" data-go="share"><span class="lead">${ic('share-2')}</span><div class="grow"><b>${L('Share our plan with family', 'Compartir nuestro plan con la familia')}</b><small>${L('Send it to another phone by text. No account needed.', 'Envíalo a otro teléfono por mensaje. No necesitas cuenta.')}</small></div>${ic('chevron-right', 'chev')}</button>
    <p class="muted" style="padding:0 4px">${L('Saved on this phone only. Changes here don\'t update other phones; share again after big changes.', 'Se guarda solo en este teléfono. Los cambios no se pasan solos a otros teléfonos; compártelo otra vez si cambias algo importante.')}</p>
    <div class="list">${infoFields().map(([k, t]) => `<label class="field"><span>${t}</span><input id="f-${k}" data-k="${k}" value="${esc(info[k] || '')}" autocomplete="off" ${k === 'phone' ? 'inputmode="tel"' : ''}></label>`).join('')}</div>
    <p class="muted small" style="padding:0 4px">${L('Huddle Ready is a planning aid, not medical advice. In an emergency, call 911.', 'Huddle Ready es una ayuda para planear, no es consejo médico. En una emergencia, llama al 911.')}</p>
    <details class="about"><summary>${ic('info')}${L('About Huddle Ready', 'Acerca de Huddle Ready')}</summary>
      <p>${L('A free outage plan for Central Texas families. No account, no ads, and nothing you type leaves this phone.', 'Un plan gratis para apagones para familias del centro de Texas. Sin cuenta, sin anuncios, y nada de lo que escribes sale de este teléfono.')}</p>
      <p><a href="../" target="_blank" rel="noopener">${L('Website, safety and privacy', 'Sitio web, seguridad y privacidad')}</a> · <a href="mailto:hello@huddleready.com">hello@huddleready.com</a></p>
      <p class="muted small">${L('Credits: icons by Lucide (ISC license); illustrations by Microsoft Fluent Emoji (MIT license); voices made with the open Kokoro model and eSpeak NG; nearby places © OpenStreetMap contributors.', 'Créditos: íconos de Lucide (licencia ISC); ilustraciones de Microsoft Fluent Emoji (licencia MIT); voces hechas con el modelo abierto Kokoro y eSpeak NG; lugares cercanos © colaboradores de OpenStreetMap.')}</p>
    </details></div>`;
  bindLang(R.details);
  let t; view.querySelectorAll('[data-k]').forEach(inp => inp.oninput = () => { info[inp.dataset.k] = inp.value.trim(); store.set('info', info); clearTimeout(t); t = setTimeout(() => toast(L('Saved', 'Guardado')), 600); });
};

/* ---------- share with family (the plan travels only inside the link) ---------- */
const b64e = str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = str => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
function shareLink() {
  const h = Object.assign({}, home); delete h.skipped; delete h.utilManual;
  const i = Object.assign({}, info); if (Array.isArray(i.extra)) i.extra = i.extra.filter(x => x.n || x.p);
  const data = b64e(JSON.stringify({ v: 1, h, i, l: lang }));
  return location.href.split('#')[0] + '#import/' + data;
}
R.share = () => {
  const url = shareLink();
  const has = [L('Household answers', 'Respuestas del hogar'), H().cross && L('Cross streets', 'Calles que cruzan'), info.outside && L('Meeting spot', 'Lugar de reunión'), (info.fallback1 || info.fallback2) && L('Fallback places', 'Lugares de Plan B'),
    ['contact', 'er', 'pediatrician', 'doctor', 'leasing'].some(k => info[k]) || (info.extra || []).length ? L('Contacts and phone numbers', 'Contactos y teléfonos') : null, info.gate && L('Gate code', 'Código de la reja'), info.phone && L('Our phone number', 'Nuestro teléfono')].filter(Boolean);
  const msg = L("Here's our family's Huddle Ready outage plan. Open this link on your phone, then add the app to your home screen:", 'Este es el plan de apagones de nuestra familia en Huddle Ready. Abre este enlace en tu teléfono y luego agrega la app a tu pantalla de inicio:');
  view.innerHTML = `<div class="screen">${bar(L('Share with family', 'Compartir con la familia'))}
    <div class="card"><b>${L('The link includes', 'El enlace incluye')}</b><ul class="inc">${has.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="muted small" style="margin:0">${L('Your details travel only inside the link. Nothing is stored on a server. Anyone who has the link can see them, so send it only to family. The supply checklist stays on each phone.', 'Tus datos viajan solo dentro del enlace. No se guarda nada en un servidor. Cualquiera que tenga el enlace puede verlos, así que envíalo solo a tu familia. La lista de provisiones se queda en cada teléfono.')}</p></div>
    <button class="btn wide" id="sh">${ic('share-2')}${L('Send the link', 'Enviar el enlace')}</button>
    <button class="btn ghost wide" id="cp">${ic('copy')}${L('Copy the link', 'Copiar el enlace')}</button>
    <p class="muted small" style="padding:0 4px">${L('On the other phone, opening the link shows what will be added and asks before saving.', 'En el otro teléfono, al abrir el enlace se muestra lo que se va a agregar y se pregunta antes de guardar.')}</p></div>`;
  const copy = () => { const done = () => toast(L('Link copied', 'Enlace copiado')); try { navigator.clipboard.writeText(msg + '\n' + url).then(done, () => prompt('', url)); } catch (e) { prompt('', url); } };
  $('#cp').onclick = copy;
  $('#sh').onclick = () => { if (navigator.share) navigator.share({ title: 'Huddle Ready', text: msg, url }).catch(() => {}); else copy(); };
};
R.import = rest => {
  let d = null; try { d = JSON.parse(b64d(rest[0] || '')); } catch (e) {}
  if (!d || d.v !== 1 || !d.h) { view.innerHTML = `<div class="screen">${bar(L('Import plan', 'Importar plan'))}<div class="empty">${L("This link didn't work. Ask for a new one.", 'Este enlace no funcionó. Pide uno nuevo.')}</div><button class="btn wide" data-go="">${L('Home', 'Inicio')}</button></div>`; return; }
  const h = d.h, i = d.i || {};
  const rows = [h.cross && [L('Near', 'Cerca de'), h.cross + (h.zip ? ', ' + h.zip : '')], [L('Household', 'Hogar'), `${h.adults || 0} ${h.adults === 1 ? L('adult', 'adulto') : L('adults', 'adultos')}${h.kids ? ', ' + h.kids + ' ' + (h.kids === 1 ? L('kid', 'niño') : L('kids', 'niños')) : ''}`], (UTILS[h.util] || h.utilName) && [L('Electric company', 'Compañía eléctrica'), (UTILS[h.util] && UTILS[h.util].name) || h.utilName],
    i.outside && [L('Outside spot', 'Lugar afuera'), i.outside], i.fallback1 && [L('Fallback 1', 'Plan B 1'), i.fallback1], i.contact && [L('Out-of-area contact', 'Contacto fuera del área'), i.contact]].filter(Boolean);
  view.innerHTML = `<div class="screen"><div class="home-top"><img src="icons/icon-192.png" alt="" class="logo"><div><div class="brand">Huddle Ready</div><div class="muted small">${L('A family plan was shared with you', 'Te compartieron un plan familiar')}</div></div></div>
    <div class="list">${rows.map(([k, v]) => `<div class="row"><div class="grow"><small>${esc(k)}</small><b>${esc(v)}</b></div></div>`).join('')}</div>
    ${home ? `<div class="verdict v1"><b>${L('This replaces the plan on this phone', 'Esto reemplaza el plan de este teléfono')}</b><span>${L('Household answers and contacts are replaced. Your supply checklist stays.', 'Se reemplazan las respuestas del hogar y los contactos. Tu lista de provisiones se queda.')}</span></div>` : ''}
    <button class="btn wide" id="imp">${L('Use this plan on this phone', 'Usar este plan en este teléfono')}</button>
    <button class="btn ghost wide" id="no">${L('Cancel', 'Cancelar')}</button></div>`;
  $('#imp').onclick = () => { home = Object.assign({ skipped: [] }, h); store.set('home', home); info = i; store.set('info', info); if (!store.get('lang', null) && d.l) setLang(d.l); history.replaceState(null, '', location.pathname); toast(L('Plan saved on this phone', 'Plan guardado en este teléfono')); route(); };
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
    () => `<h2>${L('Who lives at home?', '¿Quiénes viven en casa?')}</h2><p class="muted">${L('So checklists and supplies fit your family.', 'Para que las listas y provisiones sean para tu familia.')}</p><div class="list">${st('adults', L('Adults', 'Adultos'), 1)}${st('kids', L('Kids', 'Niños'), 0)}</div>
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
