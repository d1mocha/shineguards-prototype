/* ════════════════════════════════════════════════════════════════════
   Shine Guards prototype — shared app for every page.
   Each page shell declares <meta name="sg" data-root data-page data-kind
   data-svc data-city>; this script renders header, page body, footer.
   The single-file build takes the same values from the URL hash instead.
   ════════════════════════════════════════════════════════════════════ */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};
/* Single-file build (_build.py --share): all pages live in one HTML file and the
   page is picked by the hash, e.g. #/vienna/ua/services/private/<slug>/?type=chem#chem */
const SINGLE = window.SG_SINGLE || null;
function parseRoute(hash) {
  let s = hash.replace(/^#/, '');
  const ai = s.indexOf('#'), anchor = ai >= 0 ? s.slice(ai + 1) : '';
  if (ai >= 0) s = s.slice(0, ai);
  const qi = s.indexOf('?'), query = qi >= 0 ? s.slice(qi + 1) : '';
  if (qi >= 0) s = s.slice(0, qi);
  const [a, b, c, kind, slug] = s.split('/').filter(Boolean);
  const stored = CITIES[store.get('sg-city')] ? store.get('sg-city') : 'vienna';
  let meta = { page: 'home', kind: 'private', city: stored };
  if (a === 'ua' && ['about', 'promotions', 'contacts', 'partnership'].includes(b)) meta = { page: b };
  else if (CITIES[a] && c === 'services' && SVCS[kind]) {
    const id = slug && Object.keys(SVCS[kind]).find((k) => slug === `${SVCS[kind][k].slug}-in-${a}`);
    meta = id ? { page: 'service', kind, svc: id, city: a } : { page: kind === 'private' ? 'list' : 'home', kind, city: a };
  } else if (CITIES[a] && c === 'locations') {
    const id = kind && Object.keys(OBJECTS).find((k) => kind === `${OBJECTS[k].slug}-in-${a}`);
    meta = id ? { page: 'object', kind: 'business', svc: id, city: a } : { page: 'home', kind: 'business', city: a };
  } else if (CITIES[a]) meta = { page: 'home', kind: 'private', city: a };
  return { meta, query, anchor };
}
const ROUTE = SINGLE ? parseRoute(location.hash) : null;
const META = SINGLE ? ROUTE.meta : document.querySelector('meta[name="sg"]').dataset;
const ROOT = SINGLE ? '#/' : META.root || './';
const IDX = !SINGLE && location.protocol === 'file:' ? 'index.html' : ''; // folder opened from disk
const LOGO = SINGLE ? SINGLE.logo : ROOT + 'assets/logo.svg';
const PAGE = META.page;
const SVC_ID = META.svc || null;
const GLOBAL_PAGE = ['about', 'promotions', 'contacts', 'partnership'].includes(PAGE);
const params = new URLSearchParams(SINGLE ? ROUTE.query : location.search);
const CALC_B = params.get('calc') !== 'a'; // ?calc=a → previous calculator (comparison / A-B test)
if (SINGLE) {
  // a new hash = another page: reload it from the top (no scroll restoring)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', () => location.reload());
  // in-page anchors ("#", "#compare") must not replace the page route
  document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (a && !a.getAttribute('href').startsWith('#/')) e.preventDefault(); }, true);
}

const state = {
  mode: META.kind || store.get('sg-mode') || 'private',
  city: META.city || (CITIES[store.get('sg-city')] ? store.get('sg-city') : 'vienna'),
  touched: false,
  type: 'basic', sqm: 70, freq: 'once', planUp: null, move: 'out',
  flat: new Set(), hours: {}, uph: {}, rugs: 0, carpet: 0, matt: {}, mattBoth: false,
  win: { single: 0, double: 0, door: 0, pano: 0, sides: 2, dirt: 'basic', high: false, blinds: 0, nets: 0, access: '' },
  biz: { obj: 'office', freq: 2, hours: 3, cleaners: 1, early: false, urgent: false, haccp: false, dirty: false, ownChem: false, winHours: 0 },
  apt: { rows: [{ sqm: 45, n: 1 }], chem: false, linen: false, urgent: false },
  drOpen: new Set(['kitchen']), faqCat: 0, wipeBonus: false,
  ui: { more: false, winMore: false, aptMore: false, bizMore: false, extras: false, welcome: false },
  winStep: 1, chemStep: 1, chemCats: new Set(), faqAll: false,
};
/* Calculator experiment: events go to window.dataLayer (GTM → GA4), tagged with the variant */
let calcStarted = false;
function track(event, data = {}) {
  try { (window.dataLayer = window.dataLayer || []).push({ event, calc_variant: CALC_B ? 'b' : 'a', page_type: PAGE, city: state.city, client: state.mode, ...data }); } catch (e) { /* analytics must never break the page */ }
}
if (META.city) store.set('sg-city', META.city);
if (META.kind && !GLOBAL_PAGE) store.set('sg-mode', META.kind);
const PAGE_SVC = PAGE === 'service' ? SVCS[state.mode][SVC_ID] : null;
const PAGE_OBJ = PAGE === 'object' ? OBJECTS[SVC_ID] : null;

/* ═════════ HELPERS ═════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const eur = (n) => Math.round(n).toLocaleString('uk-UA') + ' €';
const eur2 = (n) => { const v = Math.round(n * 100) / 100; return v.toLocaleString('uk-UA', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }) + ' €'; };
const dec = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const tasksWord = (n) => { const m10 = n % 10, m100 = n % 100; return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'завдання' : m10 === 1 && m100 !== 11 ? 'завдання' : 'завдань'; };
const ceil15 = (m) => Math.ceil(m / 15) * 15;
const dur = (m) => m < 60 ? `${m} хв` : `${dec(m / 60)} год`;
const f1 = (n) => +n.toFixed(1);
const country = () => CITIES[state.city].country;
const R = () => RATES[country()];
const P = () => state.mode === 'private';
const isPackage = (t = state.type) => ['basic', 'general', 'deep', 'moveout'].includes(t);
// the regular schedule and its discount belong to the basic package — general and deep are one-off jobs
const isRegType = (t = state.type) => t === 'basic';
const isReg = () => state.freq !== 'once' && isRegType();
// the Welcome bonus is counted in the calculator where no other discount can clash with it (so far: move-in / move-out)
const isWelcomeType = (t = state.type) => t === 'moveout';
const freqDisc = () => (FREQ.find((f) => f.id === state.freq) || FREQ[0]).disc;
const isIncluded = (id) => (INCLUDED[state.type] || []).includes(id);
// the first group of extras that really has something to add to the chosen package
const firstExtra = () => FLAT.some((x) => !isIncluded(x.id)) ? 'kitchen' : state.type === 'deep' ? 'uph' : 'win';
const tierOf = (sqm) => TIERS.findIndex((max) => sqm <= max);
const cityPrices = () => PRICES[CITIES[state.city].prices];
const rangeTxt = (rg) => Math.round(rg[0]) === Math.round(rg[1]) ? eur(rg[0]) : `${eur(rg[0])}–${eur(rg[1])}`;
const chev = '<svg class="chev" width="12" height="12" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';
const ICON_BIZ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/></svg>';
const G_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const SOC = {
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.6-.1 1.1z"/></svg>',
  tg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3l-3.2 15.1c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.2.2-.5.4-.9.4l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L6.7 13.3l-4.6-1.4c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.6.2 1.6.8z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.4V11H7v4h3v9h4v-9h3l1-4h-4V8.8c0-.5.3-.8 1-.8z"/></svg>',
  ph: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  em: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
};

/* ═════════ LINKS (prototype pages mirror production URLs) ═════════ */
const homeHref = (mode = state.mode, city = state.city) => mode === 'business' ? `${ROOT}${city}/ua/services/business/${IDX}` : `${ROOT}${city}/ua/${IDX}`;
const listHref = (city = state.city) => `${ROOT}${city}/ua/services/private/${IDX}`;
const svcHref = (id, kind, city = state.city) => `${ROOT}${city}/ua/services/${kind}/${SVCS[kind][id].slug}-in-${city}/${IDX}`;
const pageHref = (name) => `${ROOT}ua/${name}/${IDX}`;
const objHref = (id, city = state.city) => `${ROOT}${city}/ua/locations/${OBJECTS[id].slug}-in-${city}/${IDX}`;
const prodUrl = (id, kind, city = state.city) => `${BASE}/${city}/ua/services/${kind}/${SVCS[kind][id].slug}-in-${city}`;
function modeHref(m) {
  if (GLOBAL_PAGE) return `${pageHref(PAGE)}?mode=${m}`;
  if (PAGE === 'object') return m === 'business' ? objHref(SVC_ID) : homeHref('private');
  if (PAGE === 'service') return SVCS[m][SVC_ID] ? svcHref(SVC_ID, m) : homeHref(m);
  return homeHref(m);
}
function cityHref(c) {
  if (PAGE === 'home') return homeHref(state.mode, c);
  if (PAGE === 'list') return listHref(c);
  if (PAGE === 'service') return svcHref(SVC_ID, state.mode, c);
  if (PAGE === 'object') return objHref(SVC_ID, c);
  return null;
}
function isOnline() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date());
  const h = +parts.find((p) => p.type === 'hour').value, wd = parts.find((p) => p.type === 'weekday').value;
  return !['Sat', 'Sun'].includes(wd) && h >= 9 && h < 18;
}

/* ═════════ OUTLINE ICONS ═════════ */
const svgI = (inner) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const I = {
  spray:    svgI('<rect class="t" x="14" y="21" width="20" height="23" rx="4"/><path d="M19 21v-5h10v5"/><rect x="16" y="9" width="17" height="7" rx="2"/><path d="M33 12.5h4M17 16c-2.5 1-3.5 3-3 5M19 30h10M19 35h6"/><circle class="af" cx="41" cy="9" r="1.7"/><circle class="af" cx="43.5" cy="14" r="1.7"/><circle class="af" cx="41" cy="19" r="1.5"/>'),
  house:    svgI('<path class="t" d="M10 21v21h28V21L24 10z"/><path d="M5 24L24 9l19 15"/><path d="M20 42V31h8v11"/><path class="a" d="M38 3.5l1.3 3.2 3.2 1.3-3.2 1.3L38 12.5l-1.3-3.2L33.5 8l3.2-1.3z"/>'),
  fridge:   svgI('<rect class="t" x="8" y="5" width="21" height="38" rx="3"/><path d="M8 17h21M24 9v4M29 19l10 3v18l-10 3M13 25h11M13 32h11"/><path class="a" d="M40 3.5l1.3 3.2 3.2 1.3-3.2 1.3L40 12.5l-1.3-3.2L35.5 8l3.2-1.3z"/>'),
  boxkey:   svgI('<rect class="t" x="5" y="20" width="24" height="22" rx="2"/><path d="M5 27h24M17 20v7"/><rect x="9" y="10" width="16" height="10" rx="1.5"/><circle class="a" cx="37" cy="15" r="5"/><path class="a" d="M37 20v19M37 30h4M37 35h3"/>'),
  window:   svgI('<rect class="t" x="5" y="5" width="27" height="34" rx="2"/><path d="M18.5 5v34M5 22h27"/><path d="M9 16l4-5M22 34l5-6" opacity=".55"/><path class="a" d="M27 37l9-9" stroke-width="3.6"/><path d="M31.5 32.5l10 10"/>'),
  sofa:     svgI('<path class="t" d="M9 25v-8a4 4 0 0 1 4-4h22a4 4 0 0 1 4 4v8z"/><path d="M5 27a3 3 0 0 1 6 0v4h26v-4a3 3 0 0 1 6 0v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M9 38v3M39 38v3"/><circle class="a" cx="15" cy="7" r="3"/><circle class="a" cx="22.5" cy="4.5" r="1.8"/>'),
  roller:   svgI('<rect class="t" x="6" y="6" width="28" height="11" rx="4"/><path d="M34 11.5h5v9H21v6"/><rect class="af" x="18" y="26" width="6" height="17" rx="2.5"/><path class="a" d="M10 21v3M15 21v5"/>'),
  iron:     svgI('<path class="t" d="M5 35h35a3 3 0 0 0 3-3c0-6-5-11-11-11H17c-6 0-11 6-12 14z"/><path d="M4 39.5h40M18 21c0-5 2-8 6-8h9c3 0 4 3 3 8"/><path class="a" d="M13 11c-2-2 2-3.5 0-5.5M19 11c-2-2 2-3.5 0-5.5"/>'),
  office:   svgI('<rect class="t" x="9" y="6" width="30" height="21" rx="2"/><path d="M24 27v6M17 33h14M4 38h40M8 38v6M40 38v6"/><path class="a" d="M16 22v-3M21 22v-6M26 22v-4M31 22v-9"/>'),
  cloche:   svgI('<path class="t" d="M8 33a16 16 0 0 1 32 0z"/><path d="M4 37h40"/><circle cx="24" cy="14" r="2.6"/><path class="a" d="M14 28a10 10 0 0 1 6-8"/>'),
  dumbbell: svgI('<path d="M15 22h18"/><rect class="t" x="8" y="12" width="7" height="20" rx="2"/><rect class="t" x="33" y="12" width="7" height="20" rx="2"/><path d="M4 17v10M44 17v10"/><path class="a" d="M5 41h9l3-4 4 7 3-5h19"/>'),
  shop:     svgI('<path d="M5 17l4-9h30l4 9"/><path class="t" d="M5 17a4.75 4.75 0 0 0 9.5 0a4.75 4.75 0 0 0 9.5 0a4.75 4.75 0 0 0 9.5 0a4.75 4.75 0 0 0 9.5 0z"/><path d="M9 23v19h30V23M27 42V31h7v11M4 42h40"/><rect class="t" x="13" y="28" width="9" height="7" rx="1"/><path class="a" d="M15 25h5"/>'),
  bed:      svgI('<path d="M6 11v31M42 32v10M6 36h36"/><rect class="t" x="6" y="26" width="36" height="7" rx="2"/><rect x="10" y="19" width="11" height="7" rx="3"/><circle class="a" cx="36" cy="8" r="3"/><path class="a" d="M36 11v3"/><rect class="af" x="33" y="14" width="6" height="8" rx="1.5"/>'),
  towers:   svgI('<rect class="t" x="17" y="5" width="15" height="38" rx="1"/><path d="M32 17h10v26M17 23H7v20M3 43h42M21 11h2M27 11h2M21 17h2M27 17h2M21 23h2M27 23h2M21 29h2M27 29h2M21 35h2M27 35h2"/><path class="a" d="M36 23h2M36 29h2M11 29h2M11 35h2"/>'),
  oven:     svgI('<rect x="7" y="6" width="34" height="36" rx="3"/><path d="M7 15h34"/><circle cx="13" cy="10.5" r="1.4"/><circle cx="18" cy="10.5" r="1.4"/><rect class="t" x="13" y="21" width="22" height="15" rx="2"/><path class="a" d="M17 18h14"/>'),
  hanger:   svgI('<path d="M24 15a3.5 3.5 0 1 1 3.5-3.5"/><path class="t" d="M24 16L6 30.5A2 2 0 0 0 7.2 34h33.6a2 2 0 0 0 1.2-3.5z"/><path class="a" d="M13 40h22"/>'),
  rug:      svgI('<rect class="t" x="9" y="9" width="30" height="30" rx="2"/><rect x="15" y="15" width="18" height="18" rx="1"/><path class="a" d="M24 19l5 5-5 5-5-5z"/><path d="M13 9V5M19 9V5M25 9V5M31 9V5M36 9V5M13 43v-4M19 43v-4M25 43v-4M31 43v-4M36 43v-4"/>'),
  mattress: svgI('<rect class="t" x="5" y="15" width="38" height="16" rx="4"/><path d="M5 27c0 3 2 6 5 6h28c3 0 5-3 5-6"/><path d="M14 15v16M24 15v16M34 15v16" opacity=".45"/><path class="a" d="M10 5l1.1 2.9L14 9l-2.9 1.1L10 13l-1.1-2.9L6 9l2.9-1.1z"/>'),
  bath:     svgI('<path class="t" d="M5 24h38v6a8 8 0 0 1-8 8H13a8 8 0 0 1-8-8z"/><path d="M10 24V11a4 4 0 0 1 8 0M13 38l-2 4M35 38l2 4"/><circle class="af" cx="22" cy="15" r="1.6"/><circle class="af" cx="25" cy="19" r="1.4"/>'),
  calc:     svgI('<rect class="t" x="10" y="4" width="28" height="40" rx="4"/><rect x="15" y="9" width="18" height="8" rx="1.5"/><path d="M16 24h.01M24 24h.01M32 24h.01M16 31h.01M24 31h.01M16 38h.01M24 38h.01" stroke-width="3.4"/><path class="a" d="M32 31v7" stroke-width="3.4"/>'),
  chat:     svgI('<path class="t" d="M6 11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H21l-9 8v-8h-1a5 5 0 0 1-5-5z"/><path class="a" d="M16 19l5 5 10-10"/>'),
  bucket:   svgI('<path class="t" d="M9 18h30l-3 24H12z"/><path d="M12 18a12 12 0 0 1 24 0"/><path class="a" d="M39 3.5l1.1 2.9L43 7.5l-2.9 1.1L39 11.5l-1.1-2.9L35 7.5l2.9-1.1z"/>'),
  card:     svgI('<rect class="t" x="4" y="11" width="40" height="27" rx="4"/><path d="M4 19h40M10 31h9"/><circle class="af" cx="35" cy="31" r="3.6"/>'),
  doc:      svgI('<path class="t" d="M11 4h17l9 9v31H11z"/><path d="M28 4v9h9M16 22h16M16 28h16M16 34h10"/><path class="a" d="M16 16h6"/>'),
  search:   svgI('<circle class="t" cx="21" cy="21" r="13"/><path d="M31 31l11 11" stroke-width="3.2"/><path class="a" d="M15 21l4 4 8-8"/>'),
  sign:     svgI('<path class="t" d="M8 6h24v36H8z"/><path d="M13 14h14M13 20h14M13 26h8"/><path class="a" d="M41 15L27 35l-4.5 2 1-4.5L37.5 12z"/>'),
  receipt:  svgI('<path class="t" d="M10 4h28v40l-5-3-5 3-4-3-4 3-5-3-5 3z"/><path d="M16 14h16M16 20h16M16 26h10"/><path class="a" d="M16 33h8"/>'),
  headset:  svgI('<path d="M9 26v-4a15 15 0 0 1 30 0v4"/><rect class="t" x="6" y="25" width="7" height="12" rx="2.5"/><rect class="t" x="35" y="25" width="7" height="12" rx="2.5"/><path class="a" d="M38.5 37c0 4-4 6-9 6h-3"/>'),
  moon:     svgI('<path class="t" d="M33 31A15 15 0 0 1 17 9a15 15 0 1 0 16 22z"/><path class="a" d="M37 7v7M33.5 10.5h7"/>'),
  shield:   svgI('<path class="t" d="M24 4l16 6v12c0 11-7 18-16 22C15 40 8 33 8 22V10z"/><path class="a" d="M17 24l5 5 9-10"/>'),
  plus:     svgI('<circle class="t" cx="24" cy="24" r="18"/><path d="M24 16v16M16 24h16"/>'),
  people:   svgI('<circle class="t" cx="17" cy="16" r="6"/><circle cx="33" cy="18" r="5"/><path d="M5 40c0-7 5-12 12-12s12 5 12 12M29 29c7 0 13 4 13 11"/><path class="a" d="M38 5v6M35 8h6"/>'),
  pin:      svgI('<path class="t" d="M24 44s14-12.5 14-24a14 14 0 0 0-28 0c0 11.5 14 24 14 24z"/><circle cx="24" cy="20" r="5"/>'),
  clock:    svgI('<circle class="t" cx="24" cy="26" r="17"/><path d="M24 17v9l6 4"/><path class="a" d="M19 4h10"/>'),
  armchair: svgI('<path class="t" d="M13 24v-8a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v8"/><path d="M8 26a3.5 3.5 0 0 1 7 0v5h18v-5a3.5 3.5 0 0 1 7 0v9a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z"/><path d="M12 37v5M36 37v5"/><path class="a" d="M18 31h12"/>'),
  handshake: svgI('<path class="t" d="M4 20l8-8 8 4 6-4 6 2 12 10-6 8-8-6-4 3-6-5-8 6z"/><path d="M20 16l-6 6 4 4 6-5 5 4"/><path class="a" d="M31 32l5 4M27 35l4 4"/>'),
};
const ic = (name, cls = '') => `<span class="oi ${cls}">${I[name] || I.plus}</span>`;
const WIN_ICON = {
  single: '<svg viewBox="0 0 44 44" fill="none" stroke="#0B63E5" stroke-width="2.4" stroke-linejoin="round"><rect x="11" y="5" width="22" height="34" rx="2" fill="#E3EEFD"/><path d="M28 20v6" stroke-linecap="round"/></svg>',
  double: '<svg viewBox="0 0 44 44" fill="none" stroke="#0B63E5" stroke-width="2.4" stroke-linejoin="round"><rect x="4" y="6" width="36" height="32" rx="2" fill="#E3EEFD"/><path d="M22 6v32M18 19v6M26 19v6" stroke-linecap="round"/></svg>',
  door:   '<svg viewBox="0 0 44 44" fill="none" stroke="#0B63E5" stroke-width="2.4" stroke-linejoin="round"><rect x="12" y="2" width="20" height="40" rx="2" fill="#E3EEFD"/><rect x="12" y="28" width="20" height="14" fill="#C9DCF7"/><path d="M28 18v6" stroke-linecap="round"/></svg>',
  pano:   '<svg viewBox="0 0 44 44" fill="none" stroke="#0B63E5" stroke-width="2.4" stroke-linejoin="round"><rect x="2" y="8" width="40" height="30" rx="2" fill="#E3EEFD"/><path d="M15 8v30M29 8v30" stroke-width="1.8"/></svg>',
};
const SPARK = `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path class="spk" d="M0 -11C1.5 -2.9 2.9 -1.5 11 0C2.9 1.5 1.5 2.9 0 11C-1.5 2.9 -2.9 1.5 -11 0C-2.9 -1.5 -1.5 -2.9 0 -11Z" fill="url(#gSilver)" stroke="#9FBDD0"/></svg>`;

/* ═════════ PRIVATE CALCULATION ═════════ */
function windowMinutes(sides) {
  const w = state.win, d = WIN_DIRT[w.dirt];
  let m = 0, sashes = 0;
  for (const t of WIN_TYPES) {
    const n = w[t.id]; if (!n) continue;
    m += n * (t.frame * d.frame * (sides === 2 ? 1.5 : 1) + t.glass * d.glass * sides);
    sashes += n * t.sashes;
  }
  if (!m) return 0;
  if (w.high) m *= 1.2;
  m += Math.min(w.blinds, sashes) * 12.5 + Math.min(w.nets, sashes) * 10;
  return m + 15;
}
const winCount = () => WIN_TYPES.reduce((a, t) => a + state.win[t.id], 0);
const winSashes = () => WIN_TYPES.reduce((a, t) => a + state.win[t.id] * t.sashes, 0);
function winRange(minutes, rate, min = 0) {
  if (!minutes) return null;
  return { lo: Math.max(min, minutes / 60 * rate), hi: Math.max(min, (minutes + 15) / 60 * rate), upTo: minutes + 15 };
}
function aptCalc(withVat) {
  const a = state.apt, sk = country() === 'sk', vat = withVat ? CTRY[country()].vat : 0;
  if (a.rows.some((r) => r.sqm > 190)) return { aptBig: true };
  const N = a.rows.reduce((t, r) => t + r.n, 0);
  const tier = [...APT.counts].reverse().find((c) => N >= +c.id), d = tier ? tier.d : 0;
  const sur = (a.chem ? .08 : 0) + (a.urgent ? .2 : 0), linen = a.linen ? APT.linen[sk ? 'sk' : 'at'] : 0;
  const rows = a.rows.map((r) => {
    const i = APT.tiers.findIndex((m) => r.sqm <= m), baseN = APT[sk ? 'sk' : 'at'][i];
    return { sqm: r.sqm, n: r.n, tier: APT.labels[i], base: baseN * (1 + vat), each: (baseN * (1 + sur - d) + linen) * (1 + vat) };
  });
  const total = rows.reduce((t, r) => t + r.each * r.n, 0);
  return { apt: true, rows, N, disc: d, sur, price: total, total, tier: rows[0].tier, base: rows[0].base, net: total / (1 + vat) };
}
const aptWord = (n) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? 'апартамент' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'апартаменти' : 'апартаментів'; };
function computePriv() {
  const city = CITIES[state.city], r = R();
  const out = { lines: [], gifts: [], total: 0, listTotal: 0, extrasCount: 0 };
  if (state.type === 'reno') return { ...out, reno: true };
  let t = -1;
  if (isPackage()) {
    if (state.sqm > 300) return { ...out, bigArea: true };
    t = tierOf(state.sqm); const key = PRICE_KEY[state.type];
    out.base = cityPrices()[key][t];
    out.cleaners = city.crew[key].c[t];
    out.hours = city.crew[key].h[t];
    out.tier = TIER_LABELS[t];
    out.lines.push({ name: `${TYPES[state.type].full}${soloSvc() === 'moveout' ? ` · ${state.move === 'in' ? 'заїзд' : 'виїзд'}` : ''}, ${state.sqm} м²`, price: out.base });
  }
  const withHome = isPackage(), withWin = isPackage() || state.type === 'windows', withChem = state.type !== 'windows';
  for (const x of withHome ? FLAT : []) {
    if (!state.flat.has(x.id) || isIncluded(x.id)) continue;
    out.lines.push({ name: x.name, price: x.price }); out.extrasCount++;
  }
  for (const h of withHome ? HOURLY : []) {
    const n = state.hours[h.id] || 0;
    if (!n || isIncluded(h.id) || (state.type === 'moveout' && h.id === 'ironing')) continue; // not offered for move-out, so never charged there
    out.lines.push({ name: `${h.name} · ${n} год`, price: n * r.extraHour }); out.extrasCount++;
    if (h.id === 'ironing' && (state.type === 'general' || state.type === 'deep')) out.gifts.push({ name: 'Подарунок: 1 година прасування', price: -Math.min(n, 1) * r.extraHour });
  }
  if (withWin && winCount() && state.type !== 'deep') {
    let minutes = 0, label;
    if (state.type === 'general' || state.type === 'moveout') {
      if (state.win.sides === 2) { minutes = ceil15(windowMinutes(2)) - ceil15(windowMinutes(1)); label = 'Вікна ззовні'; }
    } else {
      minutes = ceil15(windowMinutes(state.win.sides));
      label = state.win.sides === 2 ? 'Вікна з обох боків' : 'Вікна зсередини';
    }
    if (minutes > 0) {
      const rg = winRange(minutes, r.windowHour);
      out.lines.push({ name: `${label} · ${winCount()} шт (орієнтовно)`, price: rg.lo }); out.extrasCount++;
      out.approx = true; out.win = rg;
    }
  }
  const chemUnits = [];
  if (withChem) {
    for (const u of UPH) {
      const q = state.uph[u.id] || 0; if (!q) continue;
      const p = r.uph[u.id];
      out.lines.push({ name: `${u.name} × ${q}`, price: p * q }); out.extrasCount++;
      if (u.min) for (let i = 0; i < Math.min(q, 4); i++) chemUnits.push({ min: u.min, p });
    }
    if (state.rugs) {
      out.lines.push({ name: `Маленькі килимки × ${state.rugs}`, price: state.rugs * r.rug }); out.extrasCount++;
      for (let i = 0; i < Math.min(state.rugs, 4); i++) chemUnits.push({ min: 30, p: r.rug });
    }
    if (state.carpet) {
      const s = state.carpet, rate = s <= 10 ? r.carpet[0] : s <= 15 ? r.carpet[1] : r.carpet[2];
      out.lines.push({ name: `Килим ${s} м² × ${rate} €/м²`, price: s * rate }); out.extrasCount++;
      if (s <= 10) chemUnits.push({ min: 60, p: s * rate });
    }
    for (const m of MATTRESS) {
      const n = state.matt[m.id] || 0; if (!n) continue;
      const p = state.mattBoth ? Math.round(m.p * 1.25) : m.p;
      out.lines.push({ name: `Матрац ${m.id.replace('x', '×')} × ${n}${state.mattBoth ? ' · 2 сторони' : ''}`, price: p * n }); out.extrasCount++;
      for (let i = 0; i < Math.min(n, 4); i++) chemUnits.push({ min: Math.round(m.min * (state.mattBoth ? 1.75 : 1)), p });
    }
  }
  if (state.type === 'deep' && chemUnits.length) {
    const best = Array(61).fill(0);
    for (const u of chemUnits) { if (u.min > 60) continue; for (let m = 60; m >= u.min; m--) best[m] = Math.max(best[m], best[m - u.min] + u.p); }
    const free = Math.max(...best);
    if (free > 0) out.gifts.push({ name: 'Подарунок: до 1 години хімчистки', price: -free });
  }
  out.listTotal = out.lines.reduce((a, l) => a + l.price, 0);
  let sum = out.listTotal + out.gifts.reduce((a, l) => a + l.price, 0);
  out.preReg = sum;
  if (isReg()) { const fd = freqDisc(), d = sum * fd; out.gifts.push({ name: `Регулярне прибирання −${Math.round(fd * 100)}%`, price: -d }); sum -= d; }
  if (isWelcomeType()) { // a new client's first order is 10% cheaper — shown in money, not only in percent
    out.preWelcome = sum;
    if (state.ui.welcome) { out.welcome = true; out.gifts.push({ name: `Welcome −${Math.round(WELCOME * 100)}% на перше замовлення`, price: -sum * WELCOME }); sum *= 1 - WELCOME; }
  }
  if (!isPackage() && sum > 0 && sum < r.minVisit) { out.minApplied = true; sum = r.minVisit; }
  out.exact = sum;
  out.total = Math.round(sum);
  out.listTotal = Math.round(out.listTotal);
  if (isReg()) {
    const vpm = VPM[state.freq], k = 1 - freqDisc();
    let month = out.total * vpm, upDiff = 0;
    const upOk = state.planUp && state.freq !== 'monthly' && PLAN_UP[state.type].includes(state.planUp);
    if (upOk) { upDiff = (cityPrices()[state.planUp][t] - cityPrices()[PRICE_KEY[state.type]][t]) * k; month += upDiff; }
    out.plan = { vpm, month: Math.round(month), up: upOk ? state.planUp : null, upDiff: Math.round(upDiff) };
  }
  if (state.type === 'windows' && out.win) out.range = [Math.max(r.minVisit, out.win.lo), Math.max(r.minVisit, out.win.hi)];
  return out;
}

/* ═════════ BUSINESS CALCULATION ═════════ */
function computeBiz() {
  const b = state.biz, ctry = country(), vat = CTRY[ctry].vat, sk = ctry === 'sk';
  const base = { biz: true, obj: b.obj, ctry, vat };
  if (b.obj === 'other') return { ...base, request: 'other' };
  if (b.obj === 'apartments') { const a = aptCalc(false); return a.aptBig ? { ...base, request: 'apt-big' } : { ...base, ...a, main: a.price }; }
  if (b.obj === 'windows') {
    const m = windowMinutes(state.win.sides);
    if (!m) return { ...base, winEmpty: true };
    const rate = sk ? 21.5 : BIZ.windowHour, min = sk ? 70 : BIZ.minOneOff;
    const rg = winRange(ceil15(m), rate, min);
    return { ...base, win: true, rate, range: [rg.lo, rg.hi], upTo: rg.upTo, main: rg.lo, minApplied: rg.lo === min };
  }
  if (sk) return { ...base, request: 'sk-hourly' };
  const oneOff = b.freq === 0;
  const perWeek = oneOff ? 0 : b.freq;
  const hoursVisit = b.hours * b.cleaners;
  const monthHours = oneOff ? hoursVisit : hoursVisit * perWeek * BIZ.weeks;
  if (!oneOff && monthHours >= BIZ.bigHours) return { ...base, request: 'big', monthHours };
  const sur = Math.min(BIZ.maxSur, (b.early ? .1 : 0) + (b.urgent ? .2 : 0) + (b.obj === 'restaurant' && b.haccp ? .1 : 0) + (b.dirty ? .1 : 0));
  // a big monthly volume gets an individual rate from the manager — no automatic public discount
  const volume = !oneOff && monthHours >= BIZ.volumeHours;
  const rate = Math.max(BIZ.floor, BIZ.rate * (1 + sur));
  const min = perWeek >= 3 ? BIZ.minRegular : BIZ.minOneOff;
  const visitRaw = rate * hoursVisit, visit = Math.max(min, visitRaw);
  const win = b.winHours * BIZ.windowHour;
  const perVisit = visit + win;
  const month = oneOff ? null : perVisit * perWeek * BIZ.weeks;
  return { ...base, hourly: true, oneOff, perWeek, rate, sur, volume, hoursVisit, monthHours, visit, minApplied: visit > visitRaw, win, perVisit, month, main: oneOff ? perVisit : month };
}
const compute = () => P() ? computePriv() : computeBiz();
function headline(c) {
  if (!state.touched) return null;
  if (P()) {
    if (c.reno || c.bigArea) return null;
    if (!c.total) return null;
    return c.range ? rangeTxt(c.range) : (c.approx ? '≈ ' : '') + eur(c.total);
  }
  if (c.request || c.winEmpty) return null;
  if (c.hourly && !c.oneOff) return '≈ ' + eur(c.month) + '/міс';
  if (c.win) return rangeTxt(c.range);
  return eur2(c.main);
}

/* ═════════ LAYOUT: header, footer, overlays ═════════ */
function modeSwitchHTML() {
  return `<a href="${modeHref('private')}" data-mode="private" aria-current="${P()}">${ICON_HOME}<span>Для дому</span></a>
    <a href="${modeHref('business')}" data-mode="business" aria-current="${!P()}">${ICON_BIZ}<span>Для бізнесу</span></a>`;
}
function cityOptions() { return Object.entries(CITIES).map(([k, c]) => `<option value="${k}" ${k === state.city ? 'selected' : ''}>${c.name}</option>`).join(''); }
function svcSubline(kind, id) {
  if (kind === 'business') return SVCS.business[id].tag;
  const cp = cityPrices(), r = R();
  if (PRICE_KEY[id]) return `від ${eur(cp[PRICE_KEY[id]][0])}`;
  return { windows: `від ${eur(r.minVisit)}`, extras: 'від 22 €', reno: `${dec(r.windowHour)} € / год за клінера` }[id] || '';
}
const objIco = (id) => `<span class="oi obj-ic">${OBJ_SVG[OBJECTS[id].icon] || I.office}</span>`;
const objMenuItem = (id) => `<a class="mega-item" href="${objHref(id)}" ${PAGE === 'object' && SVC_ID === id ? 'aria-current="page"' : ''}>${objIco(id)}<span><b>${OBJECTS[id].name}</b><small>${OBJECTS[id].tag}</small></span></a>`;
function megaItems(kind) {
  if (kind === 'business') return OBJ_MAIN.map(objMenuItem).join('') + ['windows', 'reno'].map((id) => `<a class="mega-item" href="${svcHref(id, 'business')}">${ic(SVCS.business[id].icon)}<span><b>${cardName('business', id)}</b><small>${SVCS.business[id].tag}</small></span></a>`).join('');
  return SVC_ORDER[kind].map((id) => {
    const s = SVCS[kind][id], cur = PAGE === 'service' && state.mode === kind && SVC_ID === id;
    return `<a class="mega-item" href="${svcHref(id, kind)}" ${cur ? 'aria-current="page"' : ''}>${ic(s.icon)}<span><b>${cardName(kind, id)}</b><small>${svcSubline(kind, id)}</small></span></a>`;
  }).join('');
}
const LANGS = [['ua', 'Українська'], ['de', 'Deutsch'], ['en', 'English'], ['ru', 'Русский'], ['sk', 'Slovenčina']];
function langMenuHTML() {
  return `<div class="lang-sw"><button type="button" class="lang" id="langBtn" aria-haspopup="true" aria-expanded="false" aria-label="Мова сайту: українська">UA ${chev}</button>
    <div class="lang-menu" id="langMenu">${LANGS.map(([c, n]) => c === 'ua' ? `<span class="cur">${n}<b>✓</b></span>` : `<a href="${BASE}/${state.city}/${c}" target="_blank" rel="noopener" hreflang="${c}">${n}<small>${c.toUpperCase()} ↗</small></a>`).join('')}
    <p>Прототип — українською. Інші мови відкриються на поточному сайті.</p></div></div>`;
}
const CHAT_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
function headerHTML() {
  const cur = (p) => PAGE === p ? 'aria-current="page"' : '';
  return `<header class="site" id="hdr"><div class="container">
    <a class="logo" href="${homeHref()}" aria-label="Shine Guards — на головну"><img src="${LOGO}" alt="Shine Guards — клінінгова компанія" width="106" height="60" /></a>
    <nav class="nav" aria-label="Головне меню">
      <button type="button" id="svcBtn" aria-expanded="false" aria-controls="mega">Послуги ${chev}</button>
      <a href="${pageHref('about')}" ${cur('about')}>Про нас</a>
      <a href="${pageHref('promotions')}" ${cur('promotions')}>Акції</a>
      <a href="${pageHref('partnership')}" ${cur('partnership')}>Партнерство</a>
      <a href="${pageHref('contacts')}" ${cur('contacts')}>Контакти</a>
    </nav>
    <div class="hdr-right">
      <div class="mode-sw" data-mode-sw aria-label="Тип клієнта">${modeSwitchHTML()}</div>
      <select class="city-select" data-city aria-label="Місто">${cityOptions()}</select>
      ${langMenuHTML()}
      <a class="rating" href="${GMAPS}" target="_blank" rel="noopener" aria-label="Рейтинг 4,9 з 5 у Google"><span class="g">${G_SVG}</span>4,9/5 <i class="stars">★★★★★</i></a>
      <button class="burger" type="button" id="burger" aria-label="Меню" aria-expanded="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
    <div class="mega" id="mega">
      <div class="mega-col ${P() ? 'cur' : ''}"><h4>Для дому <a href="${listHref()}">усі послуги →</a></h4><div class="mega-list">${megaItems('private')}</div></div>
      <div class="mega-col ${!P() ? 'cur' : ''}"><h4>Для бізнесу <a href="${homeHref('business')}">усі послуги →</a></h4><div class="mega-list">${megaItems('business')}</div></div>
    </div>
    <div class="mnav" id="mnav">
      <div class="mode-sw">${modeSwitchHTML()}</div>
      <h4>${P() ? 'Послуги для дому' : 'Послуги для бізнесу'}</h4>
      <div class="mega-list">${megaItems(state.mode)}</div>
      <div class="links"><a href="${pageHref('about')}">Про нас</a><a href="${pageHref('promotions')}">Акції</a><a href="${pageHref('partnership')}">Партнерство</a><a href="${pageHref('contacts')}">Контакти</a></div>
      <div class="row2"><select data-city aria-label="Місто">${cityOptions()}</select><a class="call" href="${WA}" target="_blank" rel="noopener">WhatsApp</a></div>
      <div class="m-meta"><span class="m-lang">${LANGS.map(([c]) => c === 'ua' ? '<b>UA</b>' : `<a href="${BASE}/${state.city}/${c}" target="_blank" rel="noopener" hreflang="${c}">${c.toUpperCase()}</a>`).join('')}</span><a class="rating" href="${GMAPS}" target="_blank" rel="noopener"><span class="g">${G_SVG}</span>4,9/5 <i class="stars">★★★★★</i></a></div>
    </div>
  </div></header>`;
}
const ftHead = (t) => `<button type="button" class="ft-h" data-ftcol aria-expanded="false">${t}${chev}</button>`;
const FOOT_PRIV = { basic: 'Базове прибирання', general: 'Генеральне прибирання', deep: 'Глибоке прибирання', moveout: 'Прибирання при переїзді', windows: 'Миття вікон', reno: 'Після ремонту', extras: 'Додаткові послуги' };
function footerHTML() {
  const col = (t, links) => `<div class="ft-col"><h4>${ftHead(t)}</h4><div class="ft-list">${links}</div></div>`;
  const cities = Object.entries(CITIES).map(([k, c]) => `<a href="${homeHref('private', k)}">${c.name}</a>`).join('');
  return `<footer class="ft"><div class="container">
    <div class="ft-top">
      <div class="ft-brand"><a class="ft-logo" href="${homeHref()}"><img src="${LOGO}" alt="Shine Guards" width="112" height="63" /></a>
        <p>Професійне прибирання квартир, будинків і офісів у Відні, Граці, Мюнхені та Братиславі.</p>
        <div class="ft-soc"><a href="${FB}" target="_blank" rel="noopener" aria-label="Facebook">${SOC.fb}</a><a href="${IG}" target="_blank" rel="noopener" aria-label="Instagram">${SOC.ig}</a><a href="${TG}" target="_blank" rel="noopener" aria-label="Telegram">${SOC.tg}</a><a href="${WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${SOC.wa}</a></div></div>
      ${col('Для дому', SVC_ORDER.private.map((id) => `<a href="${svcHref(id, 'private')}">${FOOT_PRIV[id]}</a>`).join(''))}
      ${col('Для бізнесу', OBJ_MAIN.map((id) => `<a href="${objHref(id)}">${OBJECTS[id].name}</a>`).join('') + ['windows', 'reno'].map((id) => `<a href="${svcHref(id, 'business')}">${cardName('business', id)}</a>`).join(''))}
      ${col('Компанія', `<a href="${pageHref('about')}">Про нас</a><a href="${pageHref('promotions')}">Акції</a><a href="${pageHref('partnership')}">Партнерство</a><a href="${pageHref('contacts')}">Контакти</a>`)}
      <div class="ft-contact"><h4>Звʼязатися</h4>
        <a class="ft-wa" href="${WA}" target="_blank" rel="noopener">${SOC.wa}<span>WhatsApp<small>відповідаємо найшвидше</small></span></a>
        <a href="tel:${PHONE_TEL}">${PHONE}</a><a href="mailto:${EMAIL}">${EMAIL}</a>
        <p>Відповідаємо пн–пт, 9:00–18:00 · прибирання щодня</p>
        <p>Stoß im Himmel 1/21, 1010 Відень</p></div>
    </div>
    <div class="ft-bottom"><span>© 2026 Shine Guards e.U.</span><a href="${BASE}/ua/impressum">Імпресум</a><a href="${BASE}/ua/privacy-policy">Політика конфіденційності</a>
      <span class="ft-cities">${cities}</span>
      <span class="pay"><img alt="Visa і Mastercard" src="https://www.shineguards.com/icons/payment/visa%20mc.svg" /><img alt="Stripe" src="https://www.shineguards.com/icons/payment/Stripe%20Logo%20Revised%202016%201.svg" /></span></div>
  </div></footer>`;
}
function overlaysHTML() {
  return `<button class="fab" id="fab" type="button" data-open="book" aria-label="Залишити заявку"><span class="pulse"></span>
      <span class="ico">${CHAT_SVG}</span>
      <span class="lbl" id="fabLbl">Залишити заявку</span><span class="fab-price num" id="fabPrice" hidden></span></button>
    <div class="scrim" id="scrim"></div>
    <aside class="drawer" id="drawer" aria-label="Додаткові послуги">
      <div class="dr-head"><h3 id="drTitle">Додаткові послуги</h3><button class="x" type="button" data-close aria-label="Закрити">×</button></div>
      <div class="dr-body" id="drBody"></div>
      <div class="dr-foot"><div class="t">Разом за прибирання<b class="num" id="drTotal">—</b></div><button class="cta" type="button" data-close>Готово</button></div>
    </aside>
    <div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle"></div>
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="gSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" /><stop offset=".55" stop-color="#E6EEF4" /><stop offset="1" stop-color="#AFC6D6" /></linearGradient></defs></svg>`;
}

/* ═════════ CALCULATOR (vertical, compact) ═════════ */
function stepper(key, val, max = 20, min = 0) {
  return `<span class="stepper"><button type="button" data-step="${key}" data-d="-1" ${val <= min ? 'disabled' : ''} aria-label="Менше">−</button><output>${val}</output><button type="button" data-step="${key}" data-d="1" ${val >= max ? 'disabled' : ''} aria-label="Більше">+</button></span>`;
}
const chip = (attr, val, cur, label) => `<button type="button" class="chip" ${attr}="${val}" aria-pressed="${String(cur) === String(val)}">${label}</button>`;
const checkrow = (key, on, title, sub, pct) => `<button type="button" class="checkrow" role="checkbox" aria-checked="${on}" data-chk="${key}"><span class="box">✓</span><span class="ct">${title}${sub ? `<small>${sub}</small>` : ''}</span>${pct ? `<span class="pct">${pct}</span>` : ''}</button>`;
const tchip = (key, on, label, pct, minus) => `<button type="button" class="tchip" data-chk="${key}" aria-pressed="${on}">${label}${pct ? ` <b class="${minus ? 'minus' : ''}">${pct}</b>` : ''}</button>`;
const APPROX_NOTE = `<div class="approx"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span><b>Це приблизна ціна.</b> Точну суму менеджер назве після фото ваших вікон.</span></div>`;

function windowsUI(ctx, compact) {
  const w = state.win, t = state.type;
  const generalOuter = ctx === 'drawer' && (t === 'general' || t === 'moveout');
  let h = `<div class="wtypes">${WIN_TYPES.map((wt) => `
      <div class="wt ${w[wt.id] ? 'has' : ''}">${WIN_ICON[wt.id]}<div><b>${wt.name}</b><small>${wt.size} · ${wt.sub}</small></div>${stepper('w:' + wt.id, w[wt.id], 40)}</div>`).join('')}</div>`;
  h += `<div class="sub-l">${generalOuter ? 'Мити також ззовні?' : 'Що миємо?'}</div><div class="optcards two">
      <button type="button" class="optcard" data-wopt="sides" data-v="1" aria-pressed="${w.sides === 1}"><b>${generalOuter ? 'Ні, лише зсередини' : 'Лише зсередини'}</b><small>${generalOuter ? (t === 'moveout' ? 'вже входить у прибирання' : 'вже входить у генеральне') : 'скло, рами, підвіконня'}</small></button>
      <button type="button" class="optcard" data-wopt="sides" data-v="2" aria-pressed="${w.sides === 2}"><b>Зсередини + ззовні</b><small>якщо є безпечний доступ</small></button></div>`;
  if (compact) {
    const n = (w.dirt !== 'basic') + w.high + (w.blinds > 0) + (w.nets > 0);
    h += moreBtn('winMore', `Уточнити: бруд, висота, жалюзі, сітки${n ? ` · обрано ${n}` : ''}`, state.ui.winMore);
    if (!state.ui.winMore) return h;
  }
  h += `<div class="sub-l">Наскільки брудні?</div><div class="optcards">${Object.entries(WIN_DIRT).map(([k, d]) =>
      `<button type="button" class="optcard" data-wopt="dirt" data-v="${k}" aria-pressed="${w.dirt === k}"><b>${d.name}</b><small>${d.sub}</small></button>`).join('')}</div>`;
  const sashes = winSashes();
  h += `<div class="sub-l">Особливості</div>
    ${checkrow('w:high', w.high, 'Вікна вище 2 метрів', 'потрібна драбина', '')}
    ${checkrow('w:blinds', w.blinds > 0, 'Є жалюзі', 'миємо кожну ламель', '')}
    ${w.blinds > 0 ? `<div class="subrow">На скількох стулках? ${stepper('w:blinds', w.blinds, Math.max(sashes, 1), 1)}</div>` : ''}
    ${checkrow('w:nets', w.nets > 0, 'Є москітні сітки', 'миємо окремо', '')}
    ${w.nets > 0 ? `<div class="subrow">Скільки сіток? ${stepper('w:nets', w.nets, Math.max(sashes, 1), 1)}</div>` : ''}`;
  if (ctx === 'drawer') {
    const c = computePriv();
    if (c.win) h += `<div class="est"><span>Орієнтовно<br /><b>до ${dur(c.win.upTo)}</b></span><span style="text-align:right">${dec(R().windowHour)} € / год<br /><b>≈ ${rangeTxt([c.win.lo, c.win.hi])}</b></span></div>`;
    h += APPROX_NOTE;
  }
  return h;
}
function aptInputs(sk) { return aptInputsB(sk, 2); }
function privInputs() {
  const cp = cityPrices();
  let h = `<div class="label">Тип прибирання</div>
    <div class="types">${['basic', 'general', 'deep'].map((t) => `<button type="button" class="type" data-type="${t}" aria-pressed="${state.type === t}"><b>${TYPES[t].name}</b><span>від <span class="from">${eur(cp[t][0])}</span></span></button>`).join('')}</div>
    <div class="more-types">${['moveout', 'windows', 'chem', 'reno'].map((t) => chip('data-type', t, state.type, TYPES[t].name)).join('')}</div>`;
  if (isPackage()) {
    const pct = ((Math.min(state.sqm, 301) - 15) / 286 * 100).toFixed(1);
    const tier = state.sqm <= 300 ? 'тариф ' + TIER_LABELS[tierOf(state.sqm)] + ' м²' : '';
    h += `<div class="label">Площа <span class="hint" id="tierHint">${tier}</span></div>
      <div class="area-row"><input type="range" id="sqmRange" min="15" max="301" step="1" value="${Math.min(state.sqm, 301)}" style="--p:${pct}%" aria-label="Площа, м²" />
        <label class="area-box"><input id="sqmInput" type="number" inputmode="numeric" min="15" max="999" value="${state.sqm}" aria-label="Площа в м²" /><span>м²</span></label></div>`;
  }
  if (isRegType()) {
    const d = freqDisc();
    h += `<div class="label">Як часто? <span class="hint ${d ? 'ok' : ''}">${d ? `−${Math.round(d * 100)}% на кожне прибирання` : 'регулярно — дешевше до 7%'}</span></div>
      <div class="freqs">${FREQ.map((x) => `<button type="button" class="chip" data-freq="${x.id}" aria-pressed="${state.freq === x.id}">${x.label}${x.disc ? ` <span class="save">−${Math.round(x.disc * 100)}%</span>` : ''}</button>`).join('')}</div>`;
    if ((state.freq === 'weekly' || state.freq === 'biweekly') && PLAN_UP[state.type].length) {
      const opts = PLAN_UP[state.type], on = !!state.planUp && opts.includes(state.planUp);
      h += `<div style="margin-top:6px">${checkrow('plan', on, 'Раз на місяць — ретельніше прибирання', `одне з прибирань місяця — ${on ? TYPES[state.planUp].name.toLowerCase() : opts.map((o) => TYPES[o].name.toLowerCase()).join(' або ')}`, '')}
        ${on && opts.length > 1 ? `<div class="subrow" style="justify-content:flex-start">${opts.map((o) => chip('data-planup', o, state.planUp, TYPES[o].name)).join('')}</div>` : ''}</div>`;
    }
  }
  if (state.type === 'windows') h += `<div class="label">Ваші вікна <span class="hint">орієнтовний розрахунок</span></div>${windowsUI('calc')}`;
  return h;
}

function incHref() {
  const own = ownTier(); // a package page explains its own package first; any other one — in the comparison
  if (own) return state.type === own ? '#incl' : '#compare';
  if (PAGE === 'home' || PAGE === 'list' || (PAGE === 'service' && PAGE_SVC.compare)) return '#compare';
  if (PAGE === 'service') return '#incl';
  const id = { basic: 'basic', general: 'general', deep: 'deep', moveout: 'moveout' }[state.type];
  return id ? svcHref(id, 'private') + '#incl' : '#';
}
function privOut() {
  const c = computePriv(), r = R(), ct = CTRY[country()];
  const payNote = state.type === 'moveout' ? '<span class="pre">Прибирання при переїзді — за передоплатою</span>' : '<span>Оплата після прибирання</span>';
  const foot = (label) => `<button class="cta" type="button" data-open="book" id="ctaMain">${label}</button><div class="cta-note">${payNote}<span class="live"><i class="dot"></i><span class="lt"></span></span></div>`;
  const extrasBtn = () => {
    if (['windows', 'reno'].includes(state.type)) return '';
    const chemOnly = state.type === 'chem';
    return `<button type="button" class="extras-btn" data-open="drawer">${ic(chemOnly ? 'sofa' : 'plus')}<div><b>${chemOnly ? 'Обрати меблі, килими, матраци' : 'Додати послуги'}</b><span class="s">${chemOnly ? 'ціна фіксована за кожну річ' : 'вікна, техніка, шафи, прасування, хімчистка'}</span></div>${c.extrasCount ? `<span class="count">${c.extrasCount}</span>` : chev}</button>`;
  };
  if (c.bigArea) return `<div class="notice"><b>Понад 300 м²</b>Для великих обʼєктів ціну розраховує менеджер індивідуально.</div>${foot('Залишити заявку')}`;
  if (c.reno) return `<div class="price-box"><div class="p-label">Прибирання після ремонту</div><div class="p-value">${dec(r.windowHour)} €<span class="per"> / год за клінера</span></div><div class="p-vat"><span>${ct.incl}</span><span>за фактичний час</span></div>
      <div class="incrow"><div class="pills"><span class="pill"><i>✓</i>Будівельний пил</span><span class="pill"><i>✓</i>Фарба, клей, цемент</span><span class="pill"><i>✓</i>Сантехніка й вікна</span></div></div></div>${foot('Надіслати фото й отримати оцінку')}`;
  if (!isPackage() && !c.lines.length) {
    return (state.type === 'windows'
      ? `<div class="notice"><b>Вкажіть свої вікна</b>Оберіть кількість і тип — порахуємо орієнтовну вартість. Мінімальне замовлення — ${eur(r.minVisit)}.</div>`
      : `<div class="notice"><b>Оберіть речі для хімчистки</b>Дивани, крісла, килими, матраци — ціна за кожну річ. Мінімальне замовлення — ${eur(r.minVisit)}.</div>`) + extrasBtn() + foot('Залишити заявку');
  }
  const savings = c.gifts.length && c.listTotal > c.total ? `<span class="p-old num">${eur(c.listTotal)}</span>` : '';
  const main = c.range && Math.round(c.range[0]) !== Math.round(c.range[1]) ? rangeTxt(c.range) : `${c.approx || c.range ? '≈ ' : ''}${eur(c.total)}`;
  const meta = c.cleaners ? `<b>${c.cleaners}</b> ${c.cleaners === 1 ? 'клінер' : 'клінери'}<br />~<b>${dec(c.hours)}</b> год` : c.win ? `до <b>${dur(c.win.upTo)}</b>` : '';
  const flags = [`${ct.incl} · ${c.approx || c.range ? 'орієнтовна' : 'фіксована'}`];
  if (isReg()) flags.push(`<span class="ok">−${Math.round(freqDisc() * 100)}% за регулярність</span>`);
  if (c.gifts.some((g) => g.name.startsWith('Подарунок'))) flags.push('<span class="ok">подарунок враховано</span>');
  if (c.minApplied) flags.push(`<span class="warn">мінімальне замовлення ${eur(r.minVisit)}</span>`);
  let h = `<div class="price-box"><div class="p-label">${isReg() ? 'Ціна одного прибирання' : 'Ваша ціна'}</div>
    <div class="p-row"><div class="p-value num"><span id="pNum" data-v="${c.range ? '' : c.total}">${main}</span>${savings}</div><div class="p-meta">${meta}</div></div>`;
  if (c.plan) {
    const n = state.freq === 'weekly' ? '≈ 4' : state.freq === 'biweekly' ? '≈ 2' : '1';
    h += `<div class="p-plan"><span>${FREQ.find((x) => x.id === state.freq).label} · ${n} на місяць${c.plan.up ? ` <small class="muted">(1 — ${TYPES[c.plan.up].name.toLowerCase()})</small>` : ''}</span><b class="num">≈ ${eur(c.plan.month)} / міс</b></div>`;
  }
  h += `<div class="p-vat">${flags.map((x) => `<span>${x}</span>`).join('')}</div>`;
  if (c.range && state.type === 'windows') h += APPROX_NOTE;
  if (INC_PILLS[state.type]) {
    const nTasks = pkgTasks(state.type); // the same number as in the package cards: gifts are not tasks
    const cnt = TIER_RANK[state.type] != null ? ` · <span class="cnt">${nTasks} ${tasksWord(nTasks)}</span>` : '';
    h += `<div class="incrow"><div class="head"><span><b>Що входить</b>${cnt}</span><a href="${incHref()}" data-inc>Детальніше →</a></div>
      <div class="pills">${INC_PILLS[state.type].map((x, i) => `<span class="pill ${i > 2 ? 'pop' : ''}" style="--i:${i}"><i>✓</i>${x}</span>`).join('')}</div>
      ${CAN_ADD[state.type] ? `<div class="inc-add">Можна додати: ${CAN_ADD[state.type].map(([g, n]) => `<button type="button" class="lnk" data-add="${g}">${n}</button>`).join(', ')}</div>` : ''}
      ${GIFTS[state.type] ? `<div class="gifts">${GIFTS[state.type].map((g) => `<span class="gift">${g}</span>`).join('')}</div>` : ''}</div>`;
  }
  h += '</div>';
  const hl = headline(c);
  return h + extrasBtn() + foot(`Продовжити бронювання${hl && !c.range ? `<span class="cta-pr"> — ${hl}</span>` : ''}`);
}

/* ═════════ CALCULATOR v2: fewer decisions, price first ═════════
   Two questions (what + how big) → price → one orange button. Everything else
   (other services, regular schedule, extras, fine-tuning) opens on demand.
   ?calc=a shows the previous calculator for side-by-side comparison / A-B test. */
const GIFT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>';
const BOLT_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
const giftTxt = (t) => t.replace(/^🎁\s*/, GIFT_SVG);
const qLabel = (n, text, extra = '') => `<div class="q"><span class="qn">${n}</span><span class="qt">${text}</span>${extra}</div>`;
const moreBtn = (key, text, open) => `<button type="button" class="more-t" data-ui="${key}" aria-expanded="${open}">${text} ${chev}</button>`;
// what can really be added on top of the chosen package — the rest is already in it
const XTRA_HINT = { basic: 'вікна, духовка, прасування, хімчистка', general: 'вікна ззовні, шафи всередині, хімчистка', deep: 'хімчистка меблів, килими, матраци', moveout: 'вікна ззовні, хімчистка меблів і килимів' };
// single-service pages (windows, move-in / move-out): the calculator serves only that service
const soloSvc = () => PAGE === 'service' && P() && SOLO_PAGE[SVC_ID] && state.type === SVC_ID ? SVC_ID : null;
const MOVES = [['out', 'Виїжджаю', 'передаю квартиру'], ['in', 'Заїжджаю', 'готую до заселення']];
function soloHeadHTML(solo) {
  return `<div class="calc-svc"><b>${ic(PAGE_SVC.icon)}${PAGE_SVC.name}</b><a href="${listHref()}">Обрати іншу послугу</a></div>`
    + (solo === 'moveout' ? qLabel(1, 'Ви заїжджаєте чи виїжджаєте?') + `<div class="optcards two">${MOVES.map(([id, t, x]) => `<button type="button" class="optcard" data-move="${id}" aria-pressed="${state.move === id}"><b>${t}</b><small>${x}</small></button>`).join('')}</div>` : '');
}
function privInputsB() {
  const cp = cityPrices(), other = ['moveout', 'windows', 'chem', 'reno'];
  const isOther = other.includes(state.type), open = state.ui.more || isOther;
  const solo = soloSvc();
  // a page about one service: no chooser of cleaning types, a quiet way out to the rest
  let h = solo ? soloHeadHTML(solo) : qLabel(1, 'Оберіть тип прибирання') + `<div class="types">${['basic', 'general', 'deep'].map((t) => `<button type="button" class="type" data-type="${t}" aria-pressed="${state.type === t}"><b>${TYPES[t].name}</b><span>від <span class="from">${eur(cp[t][0])}</span></span></button>`).join('')}</div>
    ${open ? `<div class="more-types">${other.map((t) => chip('data-type', t, state.type, TYPES[t].name)).join('')}</div>` : ''}
    ${isOther ? '' : moreBtn('more', 'Інша послуга: переїзд, вікна, після ремонту…', open)}`;
  if (isPackage()) {
    const pct = ((Math.min(state.sqm, 301) - 15) / 286 * 100).toFixed(1);
    h += qLabel(2, 'Площа квартири', `<label class="area-big"><input id="sqmInput" type="number" inputmode="numeric" min="15" max="999" value="${state.sqm}" aria-label="Площа в м²" /><span>м²</span></label>`)
      + `<input type="range" id="sqmRange" min="15" max="301" step="1" value="${Math.min(state.sqm, 301)}" style="--p:${pct}%" aria-label="Площа, м²" aria-valuetext="${state.sqm} квадратних метрів" />`;
    if (state.sqm <= 300) {
      const c = computePriv(), add = c.lines.slice(1).reduce((t, l) => t + l.price, 0);
      h += `<div class="xtra ${state.ui.extras ? 'open' : ''}"><button type="button" class="xtra-t" data-ui="extras" aria-expanded="${state.ui.extras}">${ic('plus')}<span><b>Додаткові послуги</b><small>${c.extrasCount ? `обрано ${c.extrasCount} · +${eur(add)}` : XTRA_HINT[state.type] || XTRA_HINT.basic}</small></span>${chev}</button>${state.ui.extras ? `<div class="xtra-b">${extrasHTML()}</div>` : ''}</div>`;
    }
  }
  if (state.type === 'windows') h += windowsWizard();
  if (state.type === 'chem') h += chemWizard();
  return h;
}
// Step bar shared by the step-by-step calculators
function wzBar(step, labels, key, canNext) {
  return `<ol class="wz">${labels.map((l, i) => { const n = i + 1, cls = n < step ? 'done' : n === step ? 'on' : '';
    return `<li class="${cls}"><button type="button" data-${key}="${n}" ${n > step && !canNext ? 'disabled' : ''} aria-current="${n === step ? 'step' : 'false'}"><span class="n">${n < step ? '✓' : n}</span>${l}</button></li>`; }).join('')}</ol>`;
}
const wzNav = (step, last, key, canNext, nextLabel = 'Далі') => `<div class="wz-nav">${step > 1 ? `<button type="button" class="wz-back" data-${key}="${step - 1}">← Назад</button>` : '<span></span>'}${step < last ? `<button type="button" class="wz-next" data-${key}="${step + 1}" ${canNext ? '' : 'disabled'}>${nextLabel} →</button>` : ''}</div>`;
// can the outer side be reached safely? (asked when both sides are washed; goes to the manager with the request)
const WIN_ACCESS = [['yes', 'Так', 'з балкона, з землі або стулки відчиняються'], ['inside', 'Тільки з квартири', 'дістатися можна лише зсередини'], ['ask', 'Потрібне уточнення', 'надішлю фото — підкажете']];
function windowsWizard() {
  const w = state.win, st = state.winStep, cnt = winCount(), sashes = winSashes();
  let body = '';
  if (st === 1) {
    body = `<p class="wz-q">Які у вас вікна і скільки їх?</p>
      <div class="wrows">${WIN_TYPES.map((t) => `<div class="wrow ${w[t.id] ? 'has' : ''}">${WIN_ICON[t.id]}<div class="wr-t"><b>${t.name}</b><small>${t.size} · ${t.sub}</small></div>${stepper('w:' + t.id, w[t.id], 40)}</div>`).join('')}</div>
      <p class="wz-hint">Розміри приблизні — оберіть найближче. Точну суму підтвердимо за фото.</p>`;
  } else if (st === 2) {
    body = `<p class="wz-q">Що потрібно помити?</p><div class="optcards two">
      <button type="button" class="optcard" data-wopt="sides" data-v="1" aria-pressed="${w.sides === 1}"><b>Лише зсередини</b><small>скло, рами, підвіконня</small></button>
      <button type="button" class="optcard" data-wopt="sides" data-v="2" aria-pressed="${w.sides === 2}"><b>З обох боків</b><small>ззовні — за безпечного доступу</small></button></div>
      <p class="wz-hint">Рами, фурнітура, підвіконня та відливи — уже в ціні.</p>
      <p class="wz-q">Додатково <span>необовʼязково</span></p>
      ${checkrow('w:nets', w.nets > 0, 'Москітні сітки', 'миємо окремо', '')}
      ${w.nets > 0 ? `<div class="subrow">Скільки сіток? ${stepper('w:nets', w.nets, Math.max(sashes, 1), 1)}</div>` : ''}
      ${checkrow('w:blinds', w.blinds > 0, 'Жалюзі', 'миємо кожну ламель', '')}
      ${w.blinds > 0 ? `<div class="subrow">На скількох стулках? ${stepper('w:blinds', w.blinds, Math.max(sashes, 1), 1)}</div>` : ''}`;
  } else {
    body = (w.sides === 2 ? `<p class="wz-q">Чи є безпечний доступ до зовнішньої сторони?</p><div class="optcards">${WIN_ACCESS.map(([id, t, x]) => `<button type="button" class="optcard" data-wopt="access" data-v="${id}" aria-pressed="${w.access === id}"><b>${t}</b><small>${x}</small></button>`).join('')}</div>
      <p class="wz-hint">Ззовні миємо без спеціального висотного обладнання. Якщо доступ складний — менеджер уточнить за фото.</p>` : '')
      + `<p class="wz-q">Наскільки брудні вікна?</p><div class="optcards">${Object.entries(WIN_DIRT).map(([k, dd]) => `<button type="button" class="optcard" data-wopt="dirt" data-v="${k}" aria-pressed="${w.dirt === k}"><b>${dd.name}</b><small>${dd.sub}</small></button>`).join('')}</div>
      <p class="wz-q">Особливості <span>необовʼязково</span></p>
      ${checkrow('w:high', w.high, 'Вікна вище 2 метрів', 'потрібна драбина', '')}`;
  }
  return wzBar(st, ['Тип і кількість', 'Що помити', 'Доступ і деталі'], 'wstep', cnt > 0) + `<div class="wz-body">${body}</div>` + wzNav(st, 3, 'wstep', cnt > 0, st === 2 ? 'Далі: доступ і деталі' : 'Далі');
}
// windows: the price is confirmed by photos — the estimate can go straight to WhatsApp, photos follow in the chat
function waPhotoLink() {
  const w = state.win, c = computePriv(), list = WIN_TYPES.filter((t) => w[t.id]).map((t) => `${w[t.id]} × ${t.name.toLowerCase()}`).join(', ');
  const txt = `Добрий день! Хочу помити вікна (${CITIES[state.city].name})${list ? `: ${list}; ${w.sides === 2 ? 'з обох боків' : 'лише зсередини'}${c.range ? `; орієнтовно ${rangeTxt(c.range)}` : ''}` : ''}. Надсилаю фото.`;
  return `<a class="cta-alt" href="${WA}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${SOC.wa}або надіслати фото у WhatsApp</a>`;
}
const winAccessLine = () => state.type === 'windows' && state.win.sides === 2 && state.win.access ? `<div class="ln sm"><span>Доступ до зовнішньої сторони: ${WIN_ACCESS.find(([id]) => id === state.win.access)[1].toLowerCase()}</span></div>` : '';
// Transparent estimate: time per window type × hourly rate
function winBreakdownHTML(rate, min) {
  const w = state.win, dd = WIN_DIRT[w.dirt], sides = w.sides;
  const per = (t) => t.frame * dd.frame * (sides === 2 ? 1.5 : 1) + t.glass * dd.glass * sides;
  const rows = WIN_TYPES.filter((t) => w[t.id]).map((t) => [`${w[t.id]} × ${t.name.toLowerCase()}`, w[t.id] * per(t)]);
  if (!rows.length) return '';
  const base = rows.reduce((a, r) => a + r[1], 0), sash = winSashes();
  const extra = [];
  if (w.high) extra.push(['Вікна вище 2 метрів', base * .2]);
  if (w.blinds) extra.push([`Жалюзі · ${Math.min(w.blinds, sash)} шт`, Math.min(w.blinds, sash) * 12.5]);
  if (w.nets) extra.push([`Москітні сітки · ${Math.min(w.nets, sash)} шт`, Math.min(w.nets, sash) * 10]);
  extra.push(['Підготовка й інвентар', 15]);
  const total = ceil15(windowMinutes(sides)), rg = winRange(total, rate, min);
  const ln = ([n, m]) => `<div class="ln"><span>${n}</span><span>≈ ${Math.round(m)} хв</span></div>`;
  return `<details class="how"><summary>Як ми рахуємо?</summary><div class="how-b">
    <p>Рахуємо час роботи: рами й скло кожного вікна ${sides === 2 ? 'з обох боків' : 'зсередини'}, з урахуванням забруднення.</p>
    ${rows.map(ln).join('')}${extra.map(ln).join('')}
    <div class="ln tot"><span>≈ ${dur(total)}–${dur(total + 15)} × ${dec(rate)} € / год</span><span>${rangeTxt([rg.lo, rg.hi])}</span></div>
    ${rg.lo === min ? `<p>Мінімальне замовлення — ${eur(min)}.</p>` : ''}</div></details>`;
}
const CHEM_CATS = [
  { id: 'sofa', name: 'Дивани', icon: 'sofa', items: ['2seater', '3seater', '4seater', 'lshaped', 'xl'] },
  { id: 'chairs', name: 'Крісла, пуфи, стільці', icon: 'armchair', items: ['armchair', 'pouf', 'chair', 'headboard', 'bedsides'] },
  { id: 'mat', name: 'Матраци', icon: 'mattress' },
  { id: 'rugs', name: 'Килими', icon: 'rug' },
];
function chemCount(cat) {
  if (cat.items) return cat.items.reduce((a, id) => a + (state.uph[id] || 0), 0);
  if (cat.id === 'mat') return Object.values(state.matt).reduce((a, n) => a + n, 0);
  return state.rugs + (state.carpet ? 1 : 0);
}
function chemWizard() {
  const r = R(), st = state.chemStep, any = state.chemCats.size > 0;
  let body;
  if (st === 1) {
    const from = { sofa: r.uph['2seater'], chairs: r.uph.pouf, mat: MATTRESS[0].p, rugs: r.carpet[2] };
    body = `<p class="wz-q">Що будемо чистити? <span>можна кілька</span></p>
      <div class="ctiles">${CHEM_CATS.map((c) => { const n = chemCount(c);
        return `<button type="button" class="ctile" data-chemcat="${c.id}" aria-pressed="${state.chemCats.has(c.id)}">${ic(c.icon)}<b>${c.name}</b><small>від ${eur(from[c.id])}${c.id === 'rugs' ? ' / м²' : ''}</small>${n ? `<span class="cnt">${n}</span>` : ''}</button>`; }).join('')}</div>`;
  } else {
    const cs = state.carpet, rate = cs <= 10 ? r.carpet[0] : cs <= 15 ? r.carpet[1] : r.carpet[2];
    body = CHEM_CATS.filter((c) => state.chemCats.has(c.id)).map((c) => {
      let list = '';
      if (c.items) list = c.items.map((id) => { const u = UPH.find((x) => x.id === id); return `<div class="row"><div class="nm">${u.name}<small>${eur(r.uph[id])}</small></div>${stepper('u:' + id, state.uph[id] || 0, 10)}</div>`; }).join('');
      else if (c.id === 'mat') list = `<div class="mats">${MATTRESS.map((m) => { const n = state.matt[m.id] || 0, p = state.mattBoth ? Math.round(m.p * 1.25) : m.p;
          return `<div class="mt ${n ? 'has' : ''}">${matIcon(m.w)}<b>${m.id.replace('x', ' × ')}</b><small>${eur(p)}</small>${stepper('m:' + m.id, n, 6)}</div>`; }).join('')}</div>
        <div style="margin-top:6px">${checkrow('mboth', state.mattBoth, 'Чистити з обох боків', 'для плям і запахів', '+25%')}</div>`;
      else list = `<div class="row"><div class="nm">Маленькі килимки<small>біля ліжка, під стіл · ${eur(r.rug)} / шт</small></div>${stepper('rugs', state.rugs, 10)}</div>
        <div class="row" style="display:block"><div class="nm" style="display:flex;justify-content:space-between">Великий килим<b class="num" id="carpetLbl">${cs ? cs + ' м² · ' + eur(cs * rate) : 'не потрібно'}</b></div>
          <input type="range" id="carpetRange" min="0" max="40" value="${cs}" style="--p:${cs / 40 * 100}%" aria-label="Площа килима" /></div>`;
      return `<div class="cgroup"><h4>${ic(c.icon)}${c.name}</h4>${list}</div>`;
    }).join('') + `<details class="how"><summary>Які тканини чистимо?</summary><div class="how-b">${FABRIC_HTML}</div></details>`;
  }
  return wzBar(st, ['Що чистимо', 'Розмір і кількість'], 'cstep', any) + `<div class="wz-body">${body}</div>` + wzNav(st, 2, 'cstep', any);
}
function aptInputsB(sk, n) {
  const a = state.apt, N = a.rows.reduce((t, r) => t + r.n, 0), tier = [...APT.counts].reverse().find((c) => N >= +c.id), d = tier ? tier.d : 0;
  const opts = [a.chem, a.linen, a.urgent].filter(Boolean).length;
  return qLabel(n, 'Ваші апартаменти', `<span class="val-big num">${N} ${aptWord(N)}</span>`)
    + `<div class="apt-rows">${a.rows.map((r, i) => `<div class="apt-row"><label class="area-big"><input class="apt-sqm" data-row="${i}" type="number" inputmode="numeric" min="15" max="400" value="${r.sqm}" aria-label="Площа апартаменту, м²" /><span>м²</span></label><span class="apt-x" aria-hidden="true">×</span>${stepper('ar:' + i, r.n, 99, 1)}${a.rows.length > 1 ? `<button type="button" class="apt-del" data-aptdel="${i}" aria-label="Прибрати цей розмір">×</button>` : '<span></span>'}</div>`).join('')}</div>
    <button type="button" class="more-t" data-aptadd>+ Додати апартаменти іншого розміру</button>
    <p class="apt-note">${d ? `<b>✓ Застосовано обʼємну ставку</b> — ${N} ${aptWord(N)}` : 'Від 5 апартаментів діє обʼємна ставка — до −10% залежно від кількості'}</p>`
    + (P() ? moreBtn('aptMore', `Опції: хімія, білизна, терміново${opts ? ` · обрано ${opts}` : ''}`, state.ui.aptMore) : '<div class="sub-l">Додаткові опції</div>')
    + (!P() || state.ui.aptMore ? `<div class="opts" style="margin-top:6px">${tchip('a:chem', a.chem, 'Наша хімія та інвентар', P() ? '+8%' : '')}${tchip('a:linen', a.linen, 'Доставка білизни', P() ? `+${APT.linen[sk ? 'sk' : 'at']} €` : '')}${tchip('a:urgent', a.urgent, 'Терміново, день у день', P() ? '+20%' : '')}</div>` : '');
}
function aptOutHTML(c, withVat) {
  const tax = country() === 'sk' ? 'Фінальна ціна' : withVat ? 'Ціна з ПДВ' : 'Ціна netto';
  const lines = c.rows.map((r) => `<div class="ln"><span>${r.n} × ${r.sqm} м²</span><span>${eur2(r.each)} за прибирання</span></div>`).join('');
  return `<div class="price-box"><div class="p-label">${c.N > 1 ? `За прибирання всіх ${c.N} ${aptWord(c.N)}` : 'За одне прибирання'}</div>
    <div class="p-row"><div class="p-value num"><span id="pNum" data-v="">${eur2(c.total)}</span></div><div class="p-meta">${c.disc ? '<span class="ok-t">✓ обʼємна ставка</span>' : ''}</div></div>
    ${c.N > 1 ? `<div class="apt-lines">${lines}</div>` : ''}
    <div class="p-sub">${tax} · чек-лист, білизна, поповнення розхідників, фотозвіт</div></div>`;
}
function privOutB() {
  const c = computePriv(), r = R(), ct = country();
  const pay = state.type === 'moveout' ? '<span class="pre">передоплата</span>' : 'оплата після прибирання';
  const foot = (label, extra = '') => `<button class="cta" type="button" data-open="book" id="ctaMain">${label}</button>${extra}<div class="cta-note"><span class="live"><i class="dot"></i><span class="lt"></span></span></div>`;
  if (!isPackage() && !c.lines.length && ['windows', 'chem'].includes(state.type)) {
    return `<div class="notice"><b>${state.type === 'windows' ? 'Додайте хоча б одне вікно' : 'Оберіть, що почистити'}</b>Ціна зʼявиться одразу. Мінімальне замовлення — ${eur(r.minVisit)}.</div>${state.type === 'windows' ? foot('Отримати ціну за фото', waPhotoLink()) : foot('Залишити заявку')}`;
  }
  if (c.bigArea || c.reno || (!isPackage() && !c.lines.length)) return privOut().replace(/<button class="extras-btn"[\s\S]*?<\/button>/, '').replace(/<div class="cta-note">[\s\S]*$/, '<div class="cta-note"><span class="live"><i class="dot"></i><span class="lt"></span></span></div>');
  const reg = isReg(), wel = !!c.welcome, cut = reg || wel, range = c.range && Math.round(c.range[0]) !== Math.round(c.range[1]);
  const main = cut ? `${c.approx ? '≈ ' : ''}${eur2(c.exact)}` : range ? rangeTxt(c.range) : `${c.approx || c.range ? '≈ ' : ''}${eur(c.total)}`;
  const was = cut ? `<span class="p-was num">${eur(reg ? c.preReg : c.preWelcome)}</span>` : c.gifts.length && c.listTotal > c.total ? `<span class="p-old num">${eur(c.listTotal)}</span>` : '';
  const meta = c.cleaners ? `<b>${c.cleaners}</b> ${c.cleaners === 1 ? 'клінер' : 'клінери'} · ~<b>${dec(c.hours)}</b> год` : c.win ? `до <b>${dur(c.win.upTo)}</b>` : '';
  const sub = [`${c.approx || c.range ? 'Орієнтовна ціна' : 'Фіксована ціна'}${ct === 'sk' ? '' : ' з ПДВ'}`, pay];
  if (c.minApplied) sub.push(`мінімум ${eur(r.minVisit)}`);
  let h = `<div class="price-box"><div class="p-label">${reg ? 'Кожне прибирання' : wel ? 'Ціна першого замовлення' : state.type === 'windows' ? 'Вартість миття вікон' : 'Ціна прибирання'}</div>
    <div class="p-row"><div class="p-value num">${cut ? was : ''}<span id="pNum" data-v="${cut || c.range ? '' : c.total}">${main}</span>${cut ? '' : was}</div><div class="p-meta">${meta}</div></div>
    <div class="p-sub">${sub.join(' · ')}</div>${PKG_GIFTS[state.type] ? giftsRow(state.type, 'p-gifts') : ''}${c.range && state.type === 'windows' ? winBreakdownHTML(r.windowHour, r.minVisit) : ''}`;
  if (INC_PILLS[state.type]) {
    const nTasks = pkgTasks(state.type); // the same number as in the package cards: gifts are not tasks
    const inc = incHref();
    h += `<div class="incrow"><div class="head"><span><b>Що входить</b>${TIER_RANK[state.type] != null ? ` · <span class="cnt">${nTasks} ${tasksWord(nTasks)}</span>` : ''}</span>${inc !== '#' ? `<a href="${inc}" data-inc>Детальніше →</a>` : ''}</div>
      <div class="pills">${INC_PILLS[state.type].map((x) => `<span class="pill"><i>✓</i>${x}</span>`).join('')}</div></div>`;
  }
  if (isRegType()) {
    const d = freqDisc();
    h += `<button type="button" class="reg" data-ui="reg" role="switch" aria-checked="${reg}"><span class="switch"><span class="knob"></span></span><span class="reg-t"><b>Зробити регулярним</b><small class="${d ? 'ok' : ''}">${d ? `−${Math.round(d * 100)}% · економія ${eur2(c.preReg - c.exact)} щоразу` : `заощаджуйте до 7% · ${eur2(c.exact * Math.max(...FREQ.map((x) => x.disc)))} щоразу`}</small></span></button>`;
    if (reg) {
      h += `<div class="freqs reg-opts">${FREQ.filter((x) => x.disc).map((x) => `<button type="button" class="chip" data-freq="${x.id}" aria-pressed="${state.freq === x.id}">${x.label} <span class="save">−${Math.round(x.disc * 100)}%</span></button>`).join('')}</div>`;
      const n = state.freq === 'weekly' ? '≈ 4' : state.freq === 'biweekly' ? '≈ 2' : '1';
      if (c.plan) h += `<div class="p-plan"><span>${n} на місяць${c.plan.up ? ` <small class="muted">(1 — ${TYPES[c.plan.up].name.toLowerCase()})</small>` : ''}</span><b class="num">≈ ${eur(c.plan.month)} / міс</b></div>`;
      if ((state.freq === 'weekly' || state.freq === 'biweekly') && PLAN_UP[state.type].length) {
        const opts = PLAN_UP[state.type], on = !!state.planUp && opts.includes(state.planUp);
        h += `<div style="margin-top:4px">${checkrow('plan', on, 'Раз на місяць — ретельніше', `одне з прибирань — ${on ? TYPES[state.planUp].name.toLowerCase() : opts.map((o) => TYPES[o].name.toLowerCase()).join(' або ')}`, '')}
          ${on && opts.length > 1 ? `<div class="subrow" style="justify-content:flex-start">${opts.map((o) => chip('data-planup', o, state.planUp, TYPES[o].name)).join('')}</div>` : ''}</div>`;
      }
    }
  }
  if (isWelcomeType()) {
    const off = c.preWelcome * WELCOME;
    h += `<button type="button" class="reg" data-ui="welcome" role="switch" aria-checked="${wel}"><span class="switch"><span class="knob"></span></span><span class="reg-t"><b>Я новий клієнт</b><small class="${wel ? 'ok' : ''}">${wel ? `−10% на перше замовлення · економія ${eur2(off)}` : `−10% на перше замовлення: ${eur(c.preWelcome)} → ${eur2(c.preWelcome - off)}`}</small></span></button>`;
  }
  h += '</div>';
  if (state.type === 'windows') return h + foot('Підтвердити ціну за фото', waPhotoLink());
  return h + foot(`Продовжити бронювання${!range ? `<span class="cta-pr"> — ${main}</span>` : ''}`);
}
function bizInputsB() {
  const b = state.biz, sk = country() === 'sk';
  let h = qLabel(1, 'Тип обʼєкта') + `<div class="objs">${BIZ_OBJ.map((o) => `<button type="button" class="obj" data-obj="${o.id}" aria-pressed="${b.obj === o.id}">${ic(o.icon)}${o.name}</button>`).join('')}</div>`;
  if (b.obj === 'restaurant') h += `<div class="haccp">${tchip('b:haccp', b.haccp, 'Прибирання за стандартами HACCP', '')}</div>`;
  if (['office', 'restaurant', 'gym', 'shop'].includes(b.obj) && !sk) {
    const pct = ((b.hours - 1) / 9 * 100).toFixed(1);
    h += qLabel(2, 'Графік прибирань') + `<div class="biz-grid"><label class="sel"><span>Як часто</span><select id="bizFreq" aria-label="Як часто прибирати">${BIZ_FREQ.map((x) => `<option value="${x.v}" ${x.v === b.freq ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
        <div class="cl"><span>Клінерів</span>${stepper('b:cleaners', b.cleaners, 6, 1)}</div></div>`
      + qLabel(3, 'Годин за один візит', `<span class="val-big num" id="bizHoursVal">${dec(b.hours)} год</span>`)
      + `<input type="range" id="bizHours" min="1" max="10" step=".5" value="${b.hours}" style="--p:${pct}%" aria-label="Годин за візит" />`
      + `<div class="row" style="margin-top:10px"><div class="nm">Миття вікон під час візиту<small>за годину роботи</small></div>${stepper('b:winHours', b.winHours, 8)}</div>
          <p class="biz-note">Особливі умови — ранній чи нічний час, терміновий старт, перше інтенсивне прибирання — враховуємо в розрахунку.</p>`;
  } else if (b.obj === 'apartments') {
    h += aptInputsB(sk, 2);
  } else if (b.obj === 'windows') {
    h += windowsWizard();
  } else h += b.obj === 'other' ? BIZ_NOTE_OTHER : BIZ_NOTE_SK;
  return h;
}
function bizOutB() {
  const c = computeBiz(), sk = c.ctry === 'sk', tax = sk ? 'Фінальна ціна' : 'Ціна netto', net = sk ? '' : ' netto';
  const note = '<p class="p-note">Орієнтовний розрахунок, не є комерційною пропозицією. Фінальна ставка — після огляду обʼєкта або погодження ТЗ.</p>';
  const foot = (label) => `<button class="cta" type="button" data-open="book" id="ctaMain">${label}</button><div class="cta-note"><span>Пропозиція протягом 24 годин</span><span class="live"><i class="dot"></i><span class="lt"></span></span></div>`;
  if (c.request || c.winEmpty) return bizOut();
  if (c.apt) return aptOutHTML(c, false).replace(/<\/div>$/, `${note}</div>`) + foot('Отримати пропозицію');
  if (c.win) return `<div class="price-box"><div class="p-label">Орієнтовно · миття вікон</div><div class="p-row"><div class="p-value num">${rangeTxt(c.range)}</div></div><div class="p-sub">${tax}</div>${winBreakdownHTML(sk ? 21.5 : BIZ.windowHour, sk ? 70 : BIZ.minOneOff)}${note}</div>${foot('Отримати пропозицію')}`;
  const v = Math.round(c.oneOff ? c.perVisit : c.month);
  return `<div class="price-box"><div class="p-label">${c.oneOff ? 'Орієнтовно за прибирання' : 'Орієнтовно на місяць'}</div>
    <div class="p-row"><div class="p-value num">≈ <span id="pNum" data-v="${v}">${eur(v)}</span><span class="per">${net} / ${c.oneOff ? 'прибирання' : 'місяць'}</span></div></div>
    ${c.volume ? '<div class="p-sub">Для такого обсягу підготуємо індивідуальну ставку</div>' : ''}${note}
    <div class="incrow"><div class="head"><b>Уже в ціні</b></div><div class="pills">${['Засоби та інвентар', 'Клінери за чек-листом', 'Договір і документи', 'Персональний менеджер'].map((t) => `<span class="pill"><i>✓</i>${t}</span>`).join('')}</div></div></div>${foot('Отримати пропозицію')}`;
}
const calcOutHTML = () => P() ? (CALC_B ? privOutB() : privOut()) : (CALC_B ? bizOutB() : bizOut());

const BIZ_NOTE_OTHER = `<div class="notice"><b>Розрахуємо індивідуально</b>Клініки, торгові центри, кінотеатри й прибирання після ремонту рахуємо після огляду. Вкажіть у заявці:<ul><li>тип і площу приміщення</li><li>бажаний графік прибирань</li><li>особливі вимоги — HACCP, нічні зміни</li></ul></div>`;
const BIZ_NOTE_SK = `<div class="notice"><b>Братислава — індивідуальний розрахунок</b>Ставку для комерційних приміщень у Братиславі менеджер розрахує за вашим запитом. Для апартаментів і вікон ціна вже доступна.</div>`;
function bizInputs() {
  const b = state.biz, sk = country() === 'sk';
  let h = `<div class="label">Тип обʼєкта</div>
    <div class="objs">${BIZ_OBJ.map((o) => `<button type="button" class="obj" data-obj="${o.id}" aria-pressed="${b.obj === o.id}">${ic(o.icon)}${o.name}</button>`).join('')}</div>`;
  if (['office', 'restaurant', 'gym', 'shop'].includes(b.obj) && !sk) {
    const pct = ((b.hours - 1) / 9 * 100).toFixed(1);
    h += `<div class="label">Як часто прибирати?</div>
      <div class="freqs">${BIZ_FREQ.map((x) => chip('data-bfreq', x.v, b.freq, x.label)).join('')}</div>
      <div class="two-col" style="margin-top:2px">
        <div><div class="label">Годин за один візит</div>
          <div class="area-row"><input type="range" id="bizHours" min="1" max="10" step=".5" value="${b.hours}" style="--p:${pct}%" aria-label="Годин за візит" /><span class="val-box num" id="bizHoursVal">${dec(b.hours)} год</span></div></div>
        <div><div class="label">Клінерів</div>${stepper('b:cleaners', b.cleaners, 6, 1)}</div>
      </div>
      <div class="label">Умови</div>
      <div class="opts">${tchip('b:early', b.early, 'До 7:00 / після 22:00', '+10%')}${tchip('b:urgent', b.urgent, 'Терміново', '+20%')}${b.obj === 'restaurant' ? tchip('b:haccp', b.haccp, 'HACCP', '+10%') : ''}${tchip('b:dirty', b.dirty, 'Сильне забруднення', '+10%')}${tchip('b:ownChem', b.ownChem, 'Ваші засоби', '−5%', true)}</div>
      <div class="row" style="border-top:1px solid #F0F3F7;margin-top:8px"><div class="nm">Миття вікон під час візиту<small>${BIZ.windowHour} € / год без ПДВ</small></div>${stepper('b:winHours', b.winHours, 8)}</div>`;
  } else if (b.obj === 'apartments') {
    h += aptInputs(sk);
  } else if (b.obj === 'windows') {
    h += `<div class="label">Ваші вікна <span class="hint">орієнтовний розрахунок</span></div>${windowsUI('calc')}`;
  } else if (b.obj === 'other') {
    h += BIZ_NOTE_OTHER;
  } else if (sk) {
    h += BIZ_NOTE_SK;
  }
  return h;
}
function bizOut() {
  const c = computeBiz(), b = state.biz, sk = c.ctry === 'sk', nt = sk ? 'ми не є платниками ПДВ' : 'без ПДВ';
  const withVat = (n, fmt = eur) => sk ? '' : `з ПДВ ${CTRY[c.ctry].pct}: ${fmt(n * (1 + c.vat))}`;
  const foot = (label) => `<button class="cta" type="button" data-open="book" id="ctaMain">${label}</button><div class="cta-note"><span>Пропозиція протягом 24 годин · договір і документи</span><span class="live"><i class="dot"></i><span class="lt"></span></span></div>`;
  const pills = (list) => `<div class="incrow"><div class="head"><b>Уже в ціні</b></div><div class="pills">${list.map((t) => `<span class="pill"><i>✓</i>${t}</span>`).join('')}</div></div>`;
  if (c.request === 'other') return `<div class="price-box"><div class="p-label">Індивідуальна пропозиція</div><div class="p-value" style="font-size:28px">за 24 години</div><div class="p-vat"><span>після опису або огляду обʼєкта</span></div>${pills(['Огляд обʼєкта', 'Розрахунок і документи', 'Участь у тендерах'])}</div>${foot('Надіслати запит')}`;
  if (c.request === 'big') return `<div class="notice"><b>Великий обʼєкт · ~${Math.round(c.monthHours)} год на місяць</b>Для обʼєктів від ${BIZ.bigHours} годин на місяць готуємо індивідуальну пропозицію після огляду обʼєкта.</div>${foot('Запросити огляд обʼєкта')}`;
  if (c.request === 'sk-hourly') return `<div class="notice"><b>Відповімо протягом 30 хвилин</b>Опишіть обʼєкт і графік — менеджер надішле ставку та пропозицію.</div>${foot('Залишити запит')}`;
  if (c.request === 'apt-big') return `<div class="notice"><b>Апартаменти понад 190 м²</b>Розрахуємо індивідуально — залиште запит.</div>${foot('Залишити запит')}`;
  if (c.winEmpty) return `<div class="notice"><b>Вкажіть вікна</b>Порахуємо орієнтовну вартість миття (${dec(sk ? 21.5 : BIZ.windowHour)} € / год, ${nt}).</div>${foot('Залишити запит')}`;
  let label, main, meta = '', flags = [], inc;
  if (c.apt) {
    label = `За одне прибирання · ${nt}`;
    main = `<span id="pNum" data-v="">${eur2(c.price)}</span>`;
    meta = `тариф ${c.tier} м²`;
    if (!sk) flags.push(withVat(c.price, eur2));
    if (c.disc) flags.push(`<span class="ok">−${Math.round(c.disc * 100)}% за кількість обʼєктів</span>`);
    inc = ['Чек-лист', 'Заміна білизни', 'Розхідники', 'Готово до чек-іну'];
  } else if (c.win) {
    label = `Миття вікон · ${nt}`;
    main = rangeTxt(c.range);
    meta = `до <b>${dur(c.upTo)}</b><br />${dec(c.rate)} € / год`;
    flags.push('<span class="warn">орієнтовно</span>');
    if (c.minApplied) flags.push(`мінімальне замовлення ${eur(c.range[0])}`);
    inc = ['Рами й підвіконня', 'Скло до блиску', 'Засоби та інвентар'];
  } else {
    label = c.oneOff ? `Разове прибирання · ${nt}` : `На місяць · ${nt}`;
    main = c.oneOff ? `<span id="pNum" data-v="${Math.round(c.perVisit)}">${eur(c.perVisit)}</span>` : `≈ <span id="pNum" data-v="${Math.round(c.month)}">${eur(c.month)}</span><span class="per"> / міс</span>`;
    meta = c.oneOff ? `${dec(c.rate)} € / год<br /><b>${dec(c.hoursVisit)}</b> год роботи` : `<b>${eur2(c.perVisit)}</b> за візит<br />${dec(c.rate)} € / год · ${Math.round(c.monthHours)} год/міс`;
    if (!sk) flags.push(withVat(c.main));
    if (c.volume) flags.push('<span class="ok">−5% за обсяг від 100 год/міс</span>');
    if (c.minApplied) flags.push(`<span class="warn">мінімальна вартість візиту ${eur(c.perWeek >= 3 ? BIZ.minRegular : BIZ.minOneOff)}</span>`);
    inc = [b.ownChem ? null : 'Засоби та інвентар', 'Клінери за чек-листом', 'Договір і документи', 'Персональний менеджер'].filter(Boolean);
  }
  return `<div class="price-box"><div class="p-label">${label}</div>
    <div class="p-row"><div class="p-value num">${main}</div><div class="p-meta">${meta}</div></div>
    <div class="p-vat">${flags.filter(Boolean).map((x) => `<span>${x}</span>`).join('')}</div>
    ${c.win ? APPROX_NOTE : ''}${pills(inc)}</div>${foot('Отримати пропозицію')}`;
}
function renderCalc() {
  const box = $('#calc'); if (!box || box.dataset.kind === 'partner') return;
  box.classList.toggle('v2', CALC_B);
  box.innerHTML = `
    <div class="calc-head"><h2>${CALC_B ? (P() ? 'Розрахуйте вартість' : 'Орієнтовний розрахунок для бізнесу') : P() ? 'Розрахуйте вартість прибирання' : 'Розрахуйте вартість для бізнесу'}</h2>
      <label class="city-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B63E5" stroke-width="2.4"><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg><select data-city aria-label="Місто">${cityOptions()}</select></label></div>
    ${CALC_B ? '' : `<nav class="seg" aria-label="Тип клієнта"><a href="${modeHref('private')}" data-mode="private" aria-current="${P()}">${ICON_HOME}Для дому</a><a href="${modeHref('business')}" data-mode="business" aria-current="${!P()}">${ICON_BIZ}Для бізнесу</a></nav>`}
    <div id="calcIn">${P() ? (CALC_B ? privInputsB() : privInputs()) : (CALC_B ? bizInputsB() : bizInputs())}</div>
    <div id="calcOut">${calcOutHTML()}</div>`;
  renderLive(); updateFab(); syncWelcome();
}
let lastNum = null;
function paintOut() {
  const out = $('#calcOut'); if (!out) return;
  out.innerHTML = calcOutHTML();
  const el = $('#pNum');
  const to = el && el.dataset.v !== '' ? +el.dataset.v : null;
  if (el && to != null && lastNum != null && lastNum !== to) tween(el, lastNum, to);
  if (to != null) lastNum = to;
  renderLive(); updateFab(); syncWelcome();
}
function tween(el, from, to) {
  const t0 = performance.now(), d = 380;
  const step = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = eur(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  const o = $('#calcOut .price-box'); if (o) { o.classList.remove('bump'); void o.offsetWidth; o.classList.add('bump'); }
}
function updateFab(c = compute()) {
  const hl = headline(c), fab = $('#fabPrice'); if (!fab) return;
  fab.hidden = !hl; fab.textContent = hl || '';
  const lbl = PAGE === 'partnership' ? 'Стати партнером' : P() ? 'Забронювати' : 'Отримати пропозицію';
  $('#fabLbl').textContent = lbl; $('#fab').setAttribute('aria-label', lbl + (hl ? ' · ' + hl : '')); $('#fab').title = lbl;
  if (P() && $('#drTotal')) $('#drTotal').textContent = c.total ? (c.approx ? '≈ ' : '') + eur(c.total) : '—';
}
function renderLive() {
  const on = isOnline();
  $$('.live').forEach((el) => { el.classList.toggle('off', !on); const lt = el.querySelector('.lt'); if (lt) lt.textContent = on ? 'Прибирання щодня · менеджери онлайн, відповімо за 30 хв' : 'Прибирання щодня · відповідаємо пн–пт, 9:00–18:00'; });
}

/* ═════════ DRAWER ═════════ */
function matIcon(w) {
  const bw = 12 + (w - 80) / 120 * 30;
  return `<svg viewBox="0 0 60 34" aria-hidden="true"><rect x="${f1(30 - bw / 2)}" y="3" width="${f1(bw)}" height="28" rx="4" fill="#E3EEFD" stroke="#0B63E5" stroke-width="2"/><rect x="${f1(30 - bw / 2 + 3)}" y="6" width="${f1(bw - 6)}" height="6" rx="3" fill="#fff" stroke="#0B63E5" stroke-width="1.4"/></svg>`;
}
function renderDrawer() {
  $('#drTitle').textContent = state.type === 'chem' ? 'Хімчистка меблів і килимів' : 'Додаткові послуги';
  const sc = $('#drBody').scrollTop;
  $('#drBody').innerHTML = extrasHTML(); $('#drBody').scrollTop = sc;
  updateFab();
}
function extrasHTML() {
  const r = R(), t = state.type, c = computePriv();
  const lineSum = (re) => (c.lines || []).filter((l) => re.test(l.name)).reduce((a, l) => a + l.price, 0);
  const tag = (n, txt) => `<span class="sum">${txt || (n ? eur(n) : '')}</span>`;
  const open = (g) => state.drOpen.has(g) ? 'open' : '';
  let h = '';
  if (isPackage()) {
    // only what can really be added: a group that is fully inside the package is not listed
    if (FLAT.some((x) => !isIncluded(x.id))) {
      const flatSum = FLAT.filter((x) => state.flat.has(x.id) && !isIncluded(x.id)).reduce((a, x) => a + x.price, 0);
      h += `<details class="grp" name="drg" data-g="kitchen" ${open('kitchen')}><summary>${ic('oven')}Техніка та балкон ${tag(flatSum)} ${chev}</summary><div class="in">
      ${FLAT.map((x) => { const inc = isIncluded(x.id);
        return `<div class="row"><div class="nm">${x.name}${inc ? '<span class="badge">у пакеті</span>' : `<small>${eur(x.price)}</small>`}</div>
          <button type="button" class="toggle" data-flat="${x.id}" aria-pressed="${state.flat.has(x.id)}" ${inc ? 'disabled' : ''}>${inc ? '✓ Включено' : state.flat.has(x.id) ? '✓ Додано' : 'Додати'}</button></div>`; }).join('')}</div></details>`;
    }
    // ironing makes no sense for an apartment that is being handed over
    const hourly = HOURLY.filter((x) => !isIncluded(x.id) && !(t === 'moveout' && x.id === 'ironing')), onlyIron = hourly.length === 1;
    const hSum = hourly.reduce((a, x) => a + (state.hours[x.id] || 0) * r.extraHour, 0);
    if (hourly.length) h += `<details class="grp" name="drg" data-g="hourly" ${open('hourly')}><summary>${ic(onlyIron ? 'iron' : 'hanger')}${onlyIron ? 'Прасування' : 'Шафи, гардероб, прасування'} ${tag(hSum)} ${chev}</summary><div class="in">
      ${hourly.map((x) => { const gift = x.id === 'ironing' && (t === 'general' || t === 'deep');
        return `<div class="row"><div class="nm">${x.name}${gift ? '<span class="badge gift">1 година у подарунок</span>' : ''}<small>${dec(r.extraHour)} € / год</small></div>
          ${stepper('h:' + x.id, state.hours[x.id] || 0, 8)}</div>`; }).join('')}</div></details>`;
    if (t !== 'deep') h += `<details class="grp" name="drg" data-g="win" ${open('win')}><summary>${ic('window')}Миття вікон ${tag(lineSum(/^Вікна/), c.win ? '≈ ' + eur(c.win.lo) : '')} ${chev}</summary><div class="in">
      ${windowsUI('drawer')}</div></details>`;
  }
  const uphSum = UPH.reduce((a, u) => a + (state.uph[u.id] || 0) * r.uph[u.id], 0);
  h += `<details class="grp" name="drg" data-g="uph" ${open('uph')}><summary>${ic('sofa')}Хімчистка мʼяких меблів ${tag(uphSum)} ${chev}</summary><div class="in">
    ${t === 'deep' ? `<p class="note" style="margin-top:0">${GIFT_SVG} До 1 години хімчистки — у подарунок до глибокого прибирання. Це час роботи, а не чистка будь-якого дивана повністю: калькулятор сам відніме вартість того, що вкладається в годину.</p>` : ''}
    ${UPH.map((u) => `<div class="row"><div class="nm">${u.name}<small>${eur(r.uph[u.id])}</small></div>${stepper('u:' + u.id, state.uph[u.id] || 0, 10)}</div>`).join('')}
    <div class="sub-l">Які тканини чистимо</div>${FABRIC_HTML}</div></details>`;
  const cs = state.carpet, rate = cs <= 10 ? r.carpet[0] : cs <= 15 ? r.carpet[1] : r.carpet[2];
  h += `<details class="grp" name="drg" data-g="rugs" ${open('rugs')}><summary>${ic('rug')}Килими ${tag(state.rugs * r.rug + cs * rate)} ${chev}</summary><div class="in">
    <div class="row"><div class="nm">Маленькі килимки<small>біля ліжка, під стіл · ${eur(r.rug)} / шт</small></div>${stepper('rugs', state.rugs, 10)}</div>
    <div class="row" style="display:block"><div class="nm" style="display:flex;justify-content:space-between">Великий килим<b class="num" id="carpetLbl">${cs ? cs + ' м² · ' + eur(cs * rate) : 'не потрібно'}</b></div>
      <input type="range" id="carpetRange" min="0" max="40" value="${cs}" style="--p:${cs / 40 * 100}%" aria-label="Площа килима" />
      <small class="muted" style="font-size:13px">до 10 м² — ${r.carpet[0]} €/м² · 10–15 м² — ${r.carpet[1]} €/м² · від 15 м² — ${r.carpet[2]} €/м²</small></div></div></details>`;
  h += `<details class="grp" name="drg" data-g="mat" ${open('mat')}><summary>${ic('mattress')}Матраци ${tag(lineSum(/^Матрац/))} ${chev}</summary><div class="in">
    <p class="note" style="margin-top:0">Оберіть розмір і кількість — ширина × довжина, см.</p>
    <div class="mats">${MATTRESS.map((m) => { const n = state.matt[m.id] || 0, p = state.mattBoth ? Math.round(m.p * 1.25) : m.p;
      return `<div class="mt ${n ? 'has' : ''}">${matIcon(m.w)}<b>${m.id.replace('x', ' × ')}</b><small>${eur(p)}</small>${stepper('m:' + m.id, n, 6)}</div>`; }).join('')}</div>
    <div style="margin-top:8px">${checkrow('mboth', state.mattBoth, 'Чистити з обох боків', 'рекомендуємо для плям і запахів', '+25%')}</div>
    <p class="note">Поролонові матраци без знімного чохла хімією не чистимо — вони довго сохнуть. У такому випадку перемо лише наматрацник. Матрац висихає 6–12 годин.</p></div></details>`;
  return h;
}
const FABRIC_HTML = `<div class="fabric">
  <div class="fb ok"><span class="fi">✓</span><span><b>Чистимо</b>Мікрофібра, синтетика (поліестер, нейлон, акрил), рогожка, флок («антикіготь»), шеніл.</span></div>
  <div class="fb warn"><span class="fi">!</span><span><b>Чистимо обережно</b>Бавовна, льон, вовна, велюр і оксамит — спершу робимо тест на непомітній ділянці, щоб тканина не втратила колір.</span></div>
  <div class="fb no"><span class="fi">×</span><span><b>Не чистимо водою</b>Натуральна шкіра й екошкіра, замша, нубук, віскоза, натуральний шовк і гобелен — від вологи вони псуються.</span></div>
</div><p class="note">Не впевнені, з якої тканини ваші меблі? Надішліть фото — менеджер підкаже. Після чистки меблі висихають 6–12 годин: провітрюйте кімнату й не сідайте на вологу оббивку.</p>`;

/* ═════════ SECTION BUILDERS ═════════ */
const sec = (id, title, sub, body, extra = '') => `<section class="block" id="${id}"><div class="container"><div class="sec-head reveal"><div><h2 class="sec-title">${title}</h2>${sub ? `<p class="sec-sub">${sub}</p>` : ''}</div>${extra}</div>${body}</div></section>`;
function heroHTML(o) {
  const crumbs = o.crumbs ? `<nav class="crumbs" aria-label="Навігація">${o.crumbs.map(([n, h], i) => (h ? `<a href="${h}">${n}</a>` : `<span>${n}</span>`) + (i < o.crumbs.length - 1 ? '<span class="sep">/</span>' : '')).join('')}</nav>` : '';
  const trust = o.trust ? `<ul class="trust">${o.trust.map(([p, s], i) => `<li class="pop" style="--i:${i + 3}"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${p}</svg></span>${s}</li>`).join('')}</ul>` : '';
  const team = o.team ? `<div class="hero-team pop" style="--i:7"><img alt="Клінери Shine Guards" width="58" height="58" src="${TEAM_ROUND}" /><div><b>Прибирає наша команда</b><span class="sub">Офіційно працевлаштовані клінери з повним страхуванням ризиків</span><span class="rt"><i class="stars">★★★★★</i> 4,9 у Google · 58 відгуків</span></div></div>` : '';
  const facts = o.facts ? `<dl class="kf pop" style="--i:3">${o.facts.map(([k, v, x]) => `<div><dt>${k}</dt><dd>${v}${x ? `<small>${x}</small>` : ''}</dd></div>`).join('')}</dl>` : '';
  return `<section class="hero" id="top"><div class="container">
    <div class="hero-text">${crumbs}${o.eyebrow ? `<span class="eyebrow pop"><i>${P() ? ICON_HOME : ICON_BIZ}</i>${o.eyebrow}</span>` : ''}
      <h1 class="pop" style="--i:1">${o.kicker ? `<span class="h1-kicker">${o.kicker}</span>` : ''}${o.h1}</h1>${o.sub ? `<p class="h1-sub pop" style="--i:1">${o.sub}</p>` : ''}
      <p class="lead pop" style="--i:2">${o.lead}</p>${o.note || ''}${facts}${trust}${team}${o.stats ? `<div class="hero-stats pop" style="--i:6">${statsHTML(o.stats)}</div>` : ''}${o.extra || ''}</div>
    ${o.side ? `<div class="hero-side">${o.side}</div>` : `<div class="calc-wrap"><div class="calc" id="calc" ${o.partner ? 'data-kind="partner"' : ''}>${o.partner || ''}</div></div>`}
  </div></section>`;
}
const TRUST_P = [
  ['<path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9"/>', 'Фіксована ціна без доплат'],
  ['<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>', 'Перевірена команда'],
  ['<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', 'Швидке бронювання'],
  ['<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', 'Контроль якості, прибирання за чек-листом'],
];
const TRUST_B = [
  ['<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>', 'Офіційний договір і повний пакет документів'],
  ['<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>', 'Комерційна пропозиція протягом 24 годин'],
  ['<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', 'Свята й вихідні — без доплат'],
];
// Short service name for cards/footer: the "для бізнесу" suffix is implied there
const cardName = (kind, id) => kind !== 'business' ? SVCS[kind][id].name : id === 'klining' ? 'Комплексний клінінг' : SVCS.business[id].name.replace(' для бізнесу', '');
// Trust bullets tailored to the service (windows/reno are estimates, move-out is prepaid)
const trustBiz = () => TRUST_B.slice();
function trustFor(kind, id) {
  if (kind === 'business') return trustBiz().slice(0, 3);
  const t = TRUST_P.slice();
  if (id === 'windows') t[0] = [t[0][0], 'Орієнтовна ціна одразу — точну підтвердимо за фото'];
  if (id === 'reno') t[0] = [t[0][0], 'Оплата після прибирання — за фактичний час'];
  if (id === 'moveout') { t[0] = [t[0][0], 'Фіксована ціна за площею']; t[2] = ['<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', 'Працюємо щодня — бронюйте на потрібну дату']; }
  return t;
}
function cardHTML(kind, id, i, featured) {
  if (id === 'chem') {
    return `<article class="svc pop" style="--i:${i}"><div class="svc-top">${ic(CHEM_CARD.icon)}</div>
      <h3><a href="${svcHref('extras', 'private')}?type=chem#chem">${CHEM_CARD.name}</a></h3><p>${CHEM_CARD.short}</p>
      <div class="svc-ft"><span class="price">від ${eur(R().uph.pouf)}</span><a class="go" href="${svcHref('extras', 'private')}?type=chem#chem">Розрахувати</a></div></article>`;
  }
  const s = SVCS[kind][id], href = svcHref(id, kind);
  const badge = kind === 'private' ? (s.badge ? `<span class="badges">${[].concat(s.badge).map((x) => `<span class="badge-top">${giftTxt(x)}</span>`).join('')}</span>` : '') : `<span class="badge-top blue">${s.tag}</span>`;
  return `<article class="svc pop" style="--i:${i}"><div class="svc-top">${ic(s.icon)}${badge}</div>
    <h3><a href="${href}">${cardName(kind, id)}</a></h3><p>${s.short}</p>${featured && INC_PILLS[id] && kind === 'private' ? `<ul class="svc-inc">${INC_PILLS[id].map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
    <div class="svc-ft">${kind === 'private' ? `<span class="price">${svcSubline('private', id)}</span>` : '<span></span>'}<a class="go" href="${href}">${kind === 'business' && s.calc.obj === 'other' ? 'Запит' : 'Розрахувати'}</a></div></article>`;
}
// Design doctrine: equal cards give the eye nowhere to land — the three main offers lead, the rest follow compactly
const FEATURED = { private: ['basic', 'general', 'deep'], business: ['klining', 'basic', 'airbnb'] };
function miniCardHTML(kind, id, i) {
  const chem = id === 'chem', s = chem ? CHEM_CARD : SVCS[kind][id];
  const href = chem ? `${svcHref('extras', 'private')}?type=chem#chem` : svcHref(id, kind);
  const sub = chem ? `від ${eur(R().uph.pouf)}` : kind === 'private' ? svcSubline('private', id) : s.tag;
  return `<a class="svc-mini pop" style="--i:${i}" href="${href}">${ic(s.icon)}<span><b>${chem ? s.name : cardName(kind, id)}</b><small>${sub}</small></span><svg class="arr" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a>`;
}
function servicesSec(title, sub, ids, kind) {
  const sk = country() === 'sk';
  const badge = kind === 'business' ? `<span class="rate-badge">Ставка ${sk ? '' : 'без ПДВ'}<b>${sk ? 'за запитом' : 'від 27 € / год'}</b></span>` : '';
  const feat = ids.filter((id) => FEATURED[kind].includes(id)), rest = ids.filter((id) => !FEATURED[kind].includes(id));
  return sec('services', title, sub, `<div class="services feat">${feat.map((id, i) => cardHTML(kind, id, i, true)).join('')}</div>`
    + (rest.length ? `<h3 class="more-h">${kind === 'private' ? 'Інші послуги' : 'Ще для бізнесу'}</h3><div class="svc-minis">${rest.map((id, i) => miniCardHTML(kind, id, i)).join('')}</div>` : ''), badge);
}
// Packages side by side. Rooms, kitchen and bathroom are in every package, so they share one tile and the space
// goes to the four works that tell the packages apart — the difference shows at a glance (aligned tiles, as on
// apple.com/iphone/compare; icons instead of lists). The full room-by-room checklist opens on demand.
const PKG_SCN = { basic: 'Для регулярного підтримання чистоти', general: 'Коли базового прибирання недостатньо', deep: 'Максимально детальне очищення всіх зон, включно з внутрішніми та важкодоступними поверхнями' };
const PKG_BASE = { basic: 'пил, підлога, поверхні, сантехніка', general: 'усе з базового й важкодоступні місця', deep: 'усе з генерального, меблі детально, кахель і шви' };
const PKG_GIFTS = { general: ['1 година прасування'], deep: ['1 година прасування', 'до 1 години хімчистки мʼяких меблів'] };
const GIFT_NOTE = { general: 'Один клінер прасує ваші речі до 60 хвилин.', deep: 'Подарунки — це час роботи: до 60 хвилин прасування й до 60 хвилин хімчистки, а не чистка будь-якого дивана чи комплекту повністю.' };
const PLAN_BADGE = { basic: 'Для регулярного прибирання', general: 'Оптимально для ретельного прибирання', deep: 'Максимальне очищення' };
// [icon, label (or a label per package), first package it is in, the group of extras that adds it to a smaller package]
const PLAN_WORKS = [
  ['window', { basic: 'Миття вікон', general: 'Вікна зсередини', deep: 'Вікна з обох боків' }, 'general', 'win'],
  ['fridge', 'Духовка й холодильник усередині', 'general', 'kitchen'],
  ['hanger', 'Шафи й техніка всередині', 'deep', 'hourly'],
  ['spray', 'Жир і вапняний наліт', 'deep', null],
];
const REPEAT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>';
const pkgTasks = (k) => ROOMS.reduce((a, rm) => a + rm.tasks.filter(([n, l]) => !n.startsWith('🎁') && TIER_RANK[l] <= TIER_RANK[k]).length, 0);
// gifts: one quiet label, every gift its own chip
const giftsRow = (k, cls = '') => `<div class="gifts-row ${cls}"><span class="gr-l">${GIFT_SVG}У подарунок</span>${(PKG_GIFTS[k] || []).map((g) => `<span class="gr-c">${g}</span>`).join('')}</div>`;
// the package a package page is about (null on every other page)
const ownTier = () => PAGE === 'service' && P() && PAGE_SVC && PAGE_SVC.incl === 'tier' ? SVC_ID : null;
function compareSec() {
  const t = TIER_RANK[state.type] != null ? state.type : 'basic', cp = cityPrices(), lv = (x) => TIER_RANK[x], own = ownTier();
  const tile = ([icn, label, from, grp], k) => {
    const on = lv(from) <= lv(k), txt = typeof label === 'string' ? label : label[k];
    const isNew = on && (from === k || (typeof label !== 'string' && k === 'deep'));
    // not in the package: either it can be added (the tile opens that group of extras in the calculator) or it is in the deep package only
    const add = !on && grp ? `<button type="button" class="zt-add" data-addto="${k}:${grp}" aria-label="${txt}: додати до пакета «${TYPES[k].name}» в калькуляторі">+ додати</button>` : '';
    return `<li class="zt ${!on ? 'off' : isNew ? 'new' : 'on'}${add ? ' add' : ''}">${ic(icn)}<span>${txt}${on || add ? '' : '<small>у глибокому</small>'}<span class="vh">${on ? ' — входить' : ' — не входить'}</span></span>${add}${on ? `<i class="zb" aria-hidden="true">${isNew ? '+' : '✓'}</i>` : ''}</li>`;
  };
  const card = (k) => {
    // on a package page the badge marks that page's package; elsewhere — the fullest one
    const badge = own ? (k === own ? PLAN_BADGE[k] : '') : k === 'deep' ? PLAN_BADGE.deep : '';
    return `<article class="plan ${k === t ? 'cur' : ''}">
      ${badge ? `<span class="plan-badge">${badge}</span>` : ''}
      <div class="plan-row"><h3>${TYPES[k].name}</h3><span class="plan-price">від <b>${eur(cp[k][0])}</b></span></div><p class="plan-scn">${PKG_SCN[k]}</p>
      <ul class="zones"><li class="zt base"><span class="zt-ics">${ic('sofa')}${ic('oven')}${ic('bath')}</span><span><b>Кімнати, кухня, ванна й туалет</b><small>${PKG_BASE[k]}</small><span class="vh"> — входить</span></span><i class="zb" aria-hidden="true">✓</i></li>${PLAN_WORKS.map((w) => tile(w, k)).join('')}</ul>
      <div class="plan-x">${k === 'basic' ? `<span class="px-reg">${REPEAT_SVG}Регулярно — знижка до 7%</span>` : giftsRow(k)}</div>
      <button type="button" class="plan-more" data-cklist="${k}">Повний чек-лист · ${pkgTasks(k)} ${tasksWord(pkgTasks(k))} →</button>
      <button type="button" class="plan-go" data-pick="${k}">${k === t ? '✓ Обрано' : 'Обрати ' + TYPES[k].name.toLowerCase()}</button>
    </article>`;
  };
  const pick = own === 'general'
    ? [['Генеральне', 'для ретельного очищення основних зон.'], ['Глибоке', 'коли потрібно очистити також внутрішні поверхні, складні забруднення та важкодоступні місця.']]
    : [['Базове', 'для підтримання чистоти.'], ['Генеральне', 'для ретельного прибирання.'], ['Глибоке', 'для максимальної деталізації, внутрішніх поверхонь і складних забруднень.']];
  const body = `<div class="plans">${['basic', 'general', 'deep'].map(card).join('')}</div>
    <p class="plans-leg"><span><i class="zb">✓</i>входить</span><span><i class="zb new">+</i>додається в цьому пакеті</span><span><i class="zb off"></i>не входить — додайте окремо або оберіть старший пакет</span></p>
    <div class="plans-pick reveal"><b>Як обрати</b>${pick.map(([n, x]) => `<p><b>${n}</b> — ${x}</p>`).join('')}</div>`;
  return sec('compare', 'Порівняйте пакети прибирання', 'Кожен наступний пакет включає все з попереднього та додаткові роботи.', body);
}
// the chosen package's card comes into view on phones, where the cards swipe
function showCurPlan() {
  const row = $('.plans'), cur = row && row.querySelector('.plan.cur');
  if (cur && row.scrollWidth > row.clientWidth) row.scrollLeft = cur.offsetLeft - row.offsetLeft - 16;
}
function refreshCompare() {
  const cmp = $('#compare'); if (!cmp) return;
  cmp.outerHTML = compareSec().replace(/\breveal"/g, 'reveal in"');
  showCurPlan();
}
// full checklist of one package, room by room — for those who want every detail
function openChecklist(k) {
  closeMenus();
  const lv = (x) => TIER_RANK[x], n = pkgTasks(k);
  const rooms = ROOMS.map((rm) => {
    const inc = rm.tasks.filter(([x, l]) => !x.startsWith('🎁') && lv(l) <= lv(k));
    return inc.length ? `<div class="ck-room"><h4>${ic(rm.icon)}${rm.name}</h4><ul>${inc.map(([x, l]) => `<li class="${l === k && k !== 'basic' ? 'new' : ''}">${x}</li>`).join('')}</ul></div>` : '';
  }).join('');
  const gifts = (PKG_GIFTS[k] || []).map((g) => `<span class="gift">${GIFT_SVG}${g} у подарунок</span>`).join('');
  const m = $('#modal');
  m.classList.add('wide');
  m.innerHTML = `<div class="ck-head"><div><h3 id="mTitle">${TYPES[k].full}</h3><p class="muted">Повний чек-лист · ${n} ${tasksWord(n)}${k !== 'basic' ? ' · синім — те, що додається в цьому пакеті' : ''}</p></div><button class="x" type="button" data-close aria-label="Закрити">×</button></div>
    ${gifts ? `<div class="ck-gifts">${gifts}</div><p class="ck-note">${GIFT_NOTE[k]}</p>` : ''}<div class="ck-rooms">${rooms}</div>
    <button class="cta" type="button" data-pick="${k}">Обрати ${TYPES[k].name.toLowerCase()} — від ${eur(cityPrices()[k][0])}</button>`;
  m.classList.add('on'); $('#scrim').classList.add('on');
}
function objectsSec() {
  const also = [['windows', 'Миття вікон'], ['reno', 'Прибирання після ремонту'], ['general', 'Генеральне прибирання'], ['deep', 'Глибоке прибирання'], ['moveout', 'Переїзд офісу'], ['extras', 'Додаткові послуги']];
  return sec('objects', 'Клінінг для різних типів бізнесу', 'Оберіть свій обʼєкт — покажемо, що саме робимо, і порахуємо ціну.', `<div class="objgrid main">${OBJ_MAIN.map(objTile).join('')}</div>
    <button type="button" class="more-t" data-objmore aria-expanded="false" aria-controls="objMore">Інші обʼєкти ${chev}</button>
    <div class="objgrid" id="objMore" hidden>${OBJ_MORE.map(objTile).join('')}</div>
    <div class="also"><span>Також виконуємо:</span>${also.map(([id, n]) => `<a href="${svcHref(id, 'business')}">${n}</a>`).join('')}</div>`);
}
function bizTermsSec() {
  return sec('terms', 'Умови для великих обʼєктів', '', `<div class="terms">
    <div class="term reveal">${ic('receipt')}<div><h3>Індивідуальні умови для великих обсягів</h3><p>Для обʼєктів із великим місячним обсягом або мережі локацій розраховуємо індивідуальну ставку.</p><button type="button" class="ps-btn" data-open="book" data-bizgoal="Індивідуальний розрахунок">Отримати індивідуальний розрахунок</button></div></div>
    <div class="term reveal">${ic('bed')}<div><h3>Спеціальні умови для керуючих апартаментами</h3><span class="term-badge">до −10% залежно від обсягу</span><p>Від 5 обʼєктів діє індивідуальна обʼємна ставка. Чим більше обʼєктів — тим вигідніша вартість прибирання.</p><a class="ps-btn" href="${objHref('hotels')}">Розрахувати</a></div></div></div>`);
}
const gScore = () => `<a class="g-score" href="${GMAPS}" target="_blank" rel="noopener">${G_SVG}<div><span class="big">4,9</span><i class="stars" style="margin-left:6px">★★★★★</i><small>58 відгуків у Google</small></div></a>`;
// Reviews come from Google on their own (nobody picks them) — the wheel shows the latest, all of them one click away
function revWheelHTML() {
  return `<div class="rev-track" id="revTrack" aria-label="Відгуки клієнтів з Google">${REVIEWS.map((r, i) => `
      <article class="rev" data-i="${i}"><div class="who"><span class="ava"><img alt="" loading="lazy" referrerpolicy="no-referrer" src="${r.ava}" onerror="this.replaceWith(document.createTextNode('${r.name[0].toUpperCase()}'))" /></span><div><b>${r.name}</b><small>${r.when}</small></div><span class="gmini">${G_SVG}</span></div>
        <div class="txt">${r.text}</div>${r.text.length > 240 ? '<button type="button" class="more" data-more>Читати повністю</button>' : ''}</article>`).join('')}</div>
    <div class="container rev-foot">
      <div class="rev-ctrl"><button type="button" data-rev="-1" aria-label="Попередній відгук"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button><button type="button" data-rev="1" aria-label="Наступний відгук"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button></div>
      <div class="dots" id="revDots">${REVIEWS.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Відгук ${i + 1}"></button>`).join('')}</div>
      <a class="btn-ghost" href="${GMAPS}" target="_blank" rel="noopener">Переглянути всі відгуки в Google ↗</a>
    </div>`;
}
function reviewsSec() {
  return `<section class="block" id="reviews">
    <div class="container sec-head reveal"><div><h2 class="sec-title" style="max-width:540px">Що говорять про нас наші клієнти?</h2><p class="sec-sub">Останні відгуки з Google · перекладено українською.</p></div>${gScore()}</div>
    ${revWheelHTML()}</section>`;
}
function teamGalleryHTML(biz, noGroup) {
  const g = TEAM_GALLERY, slides = noGroup ? g.slice(1) : biz ? [g[0], g[2], g[3], g[1], g[5]] : g;
  return `<div class="tg reveal" data-gal><div class="tg-track">${slides.map((sl, i) => `<figure class="tg-s ${sl.photo ? 'photo' : 'cut ' + sl.cls}"><img ${i ? 'loading="lazy"' : ''} alt="${sl.alt}" src="${sl.img}" />${sl.photo
      ? `<figcaption class="fbadge">${ic('people')}<span><b>Прибирає наша команда</b>Офіційно працевлаштовані клінери з повним страхуванням ризиків</span></figcaption>`
      : `<figcaption class="tg-cap">${sl.cap}</figcaption>`}</figure>`).join('')}</div>
    <div class="tg-nav"><button type="button" data-galnav="-1" aria-label="Попереднє фото">‹</button><span class="tg-dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</span><button type="button" data-galnav="1" aria-label="Наступне фото">›</button></div></div>`;
}
const logoMarquee = () => `<div class="container"><div class="logo-row">${LOGOS.map((l) => `<span class="logo-tile"><img loading="lazy" alt="${l.alt}" src="${l.src}" /></span>`).join('')}</div></div>`;
function logosSec(title = 'Компанії, які обрали нас для постійної співпраці') {
  return `<section class="block" id="logos"><div class="container"><div class="sec-head reveal"><div><h2 class="sec-title">${title}</h2><p class="sec-sub">Готелі, фітнес-клуби, офіси та керуючі компанії апартаментів.</p></div></div></div>
    ${logoMarquee()}</section>`;
}
const proofSec = () => P() ? reviewsSec() : logosSec();
function statsHTML(list) {
  return `<div class="stats">${list.map(([n, t, s, icn, sub]) => `<div class="stat">${icn === 'google' ? `<span class="oi st-ic g">${G_SVG}</span>` : icn ? ic(icn, 'st-ic') : ''}
    <b data-count="${n}" data-suffix="${s}">${/^\d+$/.test(n) ? '0' + s : n + s}</b><span class="st-l">${t}</span>${sub ? `<small class="st-s">${sub}</small>` : ''}</div>`).join('')}</div>`;
}
function aboutSec(title, opts = {}) {
  const adv = (P() ? ADV_PRIVATE : ADV_BIZ).map(([icn, h, p]) => `<div class="adv-item">${ic(icn)}<h3>${h}</h3><p>${p}</p></div>`).join('');
  const stats = opts.noStats ? '' : statsHTML(P() ? STATS_PRIVATE : STATS_BIZ);
  const body = opts.noPhoto ? `${stats}<div class="adv-grid wide">${adv}</div>` : `${stats}<div class="team">${teamGalleryHTML(!P())}<div class="adv-grid">${adv}</div></div>`;
  return sec('about', title || (P() ? 'Сервіс, якому довіряють найцінніше: чистоту, час та спокій' : 'Чому бізнес обирає Shine Guards'),
    P() ? '' : 'Надійні люди, фіксована ціна й повна відповідальність — закріплені в договорі.', body);
}
const statsStripSec = (list = P() ? STATS_PRIVATE : STATS_BIZ) => `<section class="block tight" id="numbers"><div class="container reveal">${statsHTML(list)}</div></section>`;
function moreServicesSec() {
  const ids = ['moveout', 'windows', 'chem', 'reno', 'extras'];
  return sec('more-svc', 'Інші послуги', 'Окремо або разом із прибиранням.', `<div class="svc-minis">${ids.map((id, i) => miniCardHTML('private', id, i)).join('')}</div>`);
}
// Two offers in the vivid promo style; the regular discount already lives in the calculator
const homePromos = () => promosSec([PROMOS.private[1], PROMOS.private[2]], 'Акції та спеціальні пропозиції', true);
// B2B: client logos right after the first screen, with how typical objects are served
function bizTrustSec() {
  return `<section class="block" id="logos"><div class="container"><div class="sec-head reveal"><div><h2 class="sec-title">Нам довіряють бізнеси у ${CITIES[state.city].loc}</h2><p class="sec-sub">Готелі, фітнес-клуби, офіси та керуючі компанії апартаментів.</p></div></div></div>
    ${logoMarquee()}
    <div class="container"><div class="cases">${BIZ_CASES.map(([icn, t, f, d], i) => `<div class="case pop" style="--i:${i}">${ic(icn)}<div><b>${t}</b><span class="case-f">${f}</span><p>${d}</p></div></div>`).join('')}</div></div></section>`;
}
const objTile = (id, i) => `<a class="objcard pop" style="--i:${i}" href="${objHref(id)}">${objIco(id)}<span>${OBJECTS[id].name}</span>${OBJECTS[id].haccp ? '<em class="obj-tag">HACCP</em>' : ''}</a>`;
function stepsSec(key = P() ? 'private' : 'business', title = 'Всього 4 простих кроки до бездоганної чистоти') {
  return sec('how', title, '', `<div class="steps">${STEPS[key].map(([icn, t, d], i) => `<div class="step pop" style="--i:${i}"><div class="step-top"><span class="n">${i + 1}</span>${ic(icn)}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`);
}
function promosSec(list = PROMOS[state.mode], title = 'Акції та спеціальні пропозиції', more = false) {
  return sec('promo', title, '', `<div class="promos${list.length === 2 ? ' two' : ''}">${list.map((p, i) => `
    <article class="promo ${p.cls} pop" style="--i:${i}">
      <div class="bd">${p.tag ? `<span class="pm-tag">${p.tag}</span>` : ''}<span class="pct ${p.sm ? 'sm' : ''}">${p.pct}</span><h3>${p.t.charAt(0).toUpperCase() + p.t.slice(1)}</h3><p>${p.d}</p><button type="button" class="pbtn" data-promo="${p.act}">${p.btn}</button></div>
      <img class="cut" loading="lazy" alt="${p.alt}" src="${p.img}" />
    </article>`).join('')}</div>${more ? `<a class="promo-more" href="${pageHref('promotions')}">Усі акції та знижки →</a>` : ''}`);
}
let FAQ_SET = null, FAQ_ONLY = false;
// only = the page has its own complete set of questions (package pages): the general list is not piled on top
function faqSec(extraQa, title = 'Часті питання', only = false) {
  FAQ_ONLY = only;
  FAQ_SET = (extraQa && extraQa.length ? [{ cat: 'Про цю послугу', qa: extraQa }] : []).concat(only ? [] : FAQ[state.mode]);
  return `<section class="block" id="faq"><div class="container"><div class="faq-wrap">
    <div class="faq-head reveal"><h2 class="sec-title">${title}</h2><p class="sec-sub">Не знайшли відповідь? <a href="${WA}" target="_blank" rel="noopener">Напишіть у WhatsApp</a> — відповімо протягом 30 хвилин у робочий час.</p></div>
    <div><div class="faq" id="faqList"></div><div id="faqMore"></div></div></div></div></section>`;
}
function renderFaq() {
  if (!FAQ_SET || !$('#faqList')) return;
  // round-robin over the categories so the first questions cover prices, cleaning and booking
  const top = [], rest = [], max = Math.max(...FAQ_SET.map((g) => g.qa.length));
  for (let i = 0; i < max; i++) FAQ_SET.forEach((g) => { if (g.qa[i]) (top.length < (FAQ_ONLY ? 99 : 6) ? top : rest).push(g.qa[i]); });
  const item = ([q, a], i) => `<details class="pop" style="--i:${i}" ${i === 0 ? 'open' : ''}><summary>${q}</summary><p>${a}</p></details>`;
  $('#faqList').innerHTML = top.map(item).join('') + (state.faqAll ? rest.map((qa, i) => item(qa, i + 6)).join('') : '');
  $('#faqMore').innerHTML = FAQ_ONLY ? `<a class="faq-all" href="${homeHref('private')}#faq">Інші питання — про оплату, бронювання та сервіс →</a>`
    : rest.length && !state.faqAll ? `<button type="button" class="faq-all" data-faqall>Показати всі питання · ${top.length + rest.length}</button>` : '';
}
function contactCardsHTML() {
  // WhatsApp first, phone second, the rest quietly below
  return `<div class="ct-cards">
    <a class="ct-card wa" href="${WA}" target="_blank" rel="noopener"><span class="ci wa">${SOC.wa}</span><span><b>WhatsApp</b><span class="fast">${BOLT_SVG}Тут відповідаємо найшвидше</span></span><span class="go-wa">Написати</span></a>
    <a class="ct-card ph" href="tel:${PHONE_TEL}"><span class="ci ph">${SOC.ph}</span><span><b>${PHONE}</b><small>дзвінки пн–пт, 9:00–18:00</small></span></a>
    <div class="ct-minor"><a href="${TG}" target="_blank" rel="noopener">${SOC.tg}Telegram</a><a href="mailto:${EMAIL}">${SOC.em}${EMAIL}</a></div>
  </div>`;
}
function contactsSec() {
  const side = `<div class="ct-side">
    <h3>Графік роботи</h3>
    <div class="hrow">${ic('chat')}<span><b>Відповідаємо</b><span>пн–пт, 9:00–18:00 — протягом 30 хвилин</span></span></div>
    <div class="hrow">${ic('bucket')}<span><b>Прибирання</b><span>щодня, включно з вихідними</span></span></div>
    <div class="hrow">${ic('pin')}<span><b>Офіс</b><span>${ADDRESS}</span><br /><a class="map" href="https://www.google.com/maps/search/?api=1&query=Sto%C3%9F+im+Himmel+1%2F21+1010+Wien" target="_blank" rel="noopener">Відкрити на карті ↗</a></span></div>
    <div class="btns"><button type="button" class="btn-o" data-open="book">${P() ? 'Залишити заявку' : 'Надіслати запит'}</button></div></div>`;
  return sec('contacts', 'Звʼяжіться з нами', 'Прибирання проводимо щодня. Менеджери відповідають з понеділка по пʼятницю — найшвидше у WhatsApp.', `<div class="contacts">${contactCardsHTML()}${side}</div>`);
}
function relatedSec(kind, ids, sub = '') {
  return sec('related', 'Інші послуги', sub, `<div class="svc-minis">${ids.map((id, i) => miniCardHTML(kind, id, i)).join('')}</div>`);
}
function inclSec(s) {
  const kind = state.mode;
  let body = '';
  if (s.incl === 'tier') {
    const tier = s.calc.type, rank = TIER_RANK[tier];
    body = `<div class="incl-grid">${ROOMS.map((rm) => {
      const rows = rm.tasks.map(([name, lv]) => {
        const inc = TIER_RANK[lv] <= rank, isNew = inc && TIER_RANK[lv] === rank && rank > 0;
        return inc ? `<li class="${isNew ? 'new' : ''}"><span class="ck">✓</span><span>${name}${isNew ? '<em>нове</em>' : ''}</span></li>`
          : `<li class="opt"><span class="ck">+</span><span>${name} <small>— ${TYPES[lv].name.toLowerCase()} або окремо</small></span></li>`;
      }).join('');
      return `<div class="incl-card pop"><h3>${ic(rm.icon)}${rm.name}</h3><ul>${rows}</ul></div>`;
    }).join('')}</div>`;
  } else if (s.incl === 'prices') {
    body = pricesHTML();
  } else if (s.incl === 'bizPrices') {
    body = `<div class="prices"><div class="pcard"><h3>${ic('receipt')}Ставки без ПДВ</h3>${BIZ_PRICES.map(([n, p]) => `<div class="pline"><span>${n}</span><b>${p}</b></div>`).join('')}</div>${inclGroups(INCL.bizRegular.slice(0, 1))}</div>`;
  } else {
    body = inclGroups(INCL[s.incl] || []);
  }
  return sec('incl', `Що входить у ${kind === 'business' ? 'послугу' : s.name.charAt(0).toLowerCase() + s.name.slice(1)}`, s.incl === 'tier' && TIER_RANK[s.calc.type] > 0 ? 'Синім позначено, що зʼявляється саме в цьому пакеті.' : '', body);
}
const inclGroups = (groups) => `<div class="incl-grid${groups.length === 4 ? ' c4' : ''}">${groups.map((g) => `<div class="incl-card pop"><h3>${g.icon ? ic(g.icon) : ''}${g.t}</h3><ul>${g.items.map((x) => `<li class="${/окремо|за запитом|додатков/i.test(x) ? 'opt' : ''}"><span class="ck">${/окремо|за запитом|додатков/i.test(x) ? '+' : '✓'}</span><span>${x}</span></li>`).join('')}</ul></div>`).join('')}</div>`;
function pricesHTML() {
  const r = R();
  const add = (g) => `<button type="button" class="pc-add" data-add="${g}" aria-label="Додати в калькулятор">+ Додати</button>`;
  const card = (id, icn, title, lines, g = id) => `<div class="pcard" id="${id}"><div class="pc-head"><h3>${ic(icn)}${title}</h3>${add(g)}</div>${lines.map(([n, p]) => `<div class="pline"><span>${n}</span><b>${p}</b></div>`).join('')}</div>`;
  return `<div class="prices">
    ${card('kitchen', 'oven', 'Техніка та балкон', FLAT.map((x) => [x.name, eur(x.price)]))}
    ${card('hourly', 'hanger', 'Шафи, гардероб, прасування', [...HOURLY.map((x) => [x.name, `${dec(r.extraHour)} € / год`]), ['Погодинне прибирання', `${dec(r.hourly)} € / год`]])}
    ${card('win', 'window', 'Миття вікон', [['Миття вікон', `${dec(r.windowHour)} € / год`], ['Орієнтовна ціна', 'у калькуляторі'], ['Мінімальне замовлення', eur(r.minVisit)]])}
    <div class="pcard" id="chem"><div class="pc-head"><h3>${ic('sofa')}Хімчистка мʼяких меблів</h3>${add('uph')}</div>${UPH.map((u) => `<div class="pline"><span>${u.name}</span><b>${eur(r.uph[u.id])}</b></div>`).join('')}</div>
    ${card('rugs', 'rug', 'Килими', [['Маленькі килимки', `${eur(r.rug)} / шт`], ['Килим до 10 м²', `${r.carpet[0]} € / м²`], ['Килим 10–15 м²', `${r.carpet[1]} € / м²`], ['Килим від 15 м²', `${r.carpet[2]} € / м²`]])}
    ${card('mat', 'mattress', 'Матраци (1 сторона)', MATTRESS.map((m) => [m.id.replace('x', ' × ') + ' см', eur(m.p)]))}
  </div><div class="pcard" style="margin-top:14px"><h3>${ic('shield')}Які тканини чистимо</h3>${FABRIC_HTML}</div>`;
}

/* ═════════ MINI-GAME: WIPE THE WINDOW ═════════
   A dusty window over a sunny view of the city. Wiping it (mouse hover, finger or
   pen drag) reveals the view; at ~80% clean the Welcome −10% bonus opens. */
const WIPE_DONE_AT = .8;
const WIPE_MSG = [[0, 'Скло чекає на вас'], [.1, 'Так тримати!'], [.4, 'Вже видно місто'], [.75, 'Майже блищить…']];
const REDUCED_MOTION = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const SQUEEGEE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="21" y="18" width="22" height="7" rx="2" fill="#9AA7B8"/><rect x="28.5" y="24" width="7" height="36" rx="3.5" fill="#FF570A"/><rect x="4" y="10" width="56" height="9" rx="3" fill="#1F2A3A"/><rect x="6" y="12" width="52" height="2.5" rx="1.2" fill="#56657A"/></svg>';
const wipe = { cv: null, ctx: null, mask: null, mctx: null, fx: null, fctx: null, parts: [], raf: 0, fxT: 0, last: null, down: false, started: 0, lastCheck: 0, pct: 0, done: false, auto: false };

function cityViewSVG(city) {
  const L = '#4E86D8', D = '#3C73C6', hill = '#6C9FE0', house = '#2F67C4', lit = '#D3E6FF';
  // stepped silhouette: [width, top y] pairs
  const step = (segs, fill) => { let d = 'M0 560', x = 0; for (const [w, y] of segs) { d += `V${y}H${x + w}`; x += w; } return `<path fill="${fill}" d="${d}V560Z"/>`; };
  // row of houses: [width, eave y, roof peak y, chimney?]
  const houses = (list) => {
    let d = `M0 560V${list[0][1]}`, x = 0, extra = '';
    for (const [w, eave, peak, chim] of list) {
      d += `L${x} ${eave}L${x + w / 2} ${peak}L${x + w} ${eave}`;
      if (chim) { const cx = x + w * .72, ry = peak + (eave - peak) * ((cx - x - w / 2) / (w / 2)); extra += `<rect x="${cx - 4}" y="${(ry - 14).toFixed(1)}" width="8" height="16" fill="${house}"/>`; }
      for (const fx of w > 60 ? [.26, .6] : [.4]) for (const fy of [16, 46]) if (eave + fy + 12 < 560) extra += `<rect x="${(x + w * fx).toFixed(1)}" y="${eave + fy}" width="9" height="12" rx="1.5" fill="${lit}"/>`;
      x += w;
    }
    return `<path fill="${house}" d="${d}V560Z"/>${extra}`;
  };
  const sky = `<defs><linearGradient id="wSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5AABFF"/><stop offset=".62" stop-color="#BFE0FF"/><stop offset="1" stop-color="#EAF5FF"/></linearGradient>
    <radialGradient id="wSun"><stop offset="0" stop-color="#FFF7D6"/><stop offset=".4" stop-color="#FFE38A" stop-opacity=".9"/><stop offset="1" stop-color="#FFE38A" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="560" fill="url(#wSky)"/><circle class="w-sunglow" cx="620" cy="118" r="120" fill="url(#wSun)"/><circle cx="620" cy="118" r="40" fill="#FFE27A"/>
    <g class="w-cloud" fill="#fff"><ellipse cx="150" cy="112" rx="64" ry="21"/><ellipse cx="178" cy="96" rx="38" ry="27"/><ellipse cx="128" cy="102" rx="30" ry="19"/></g>
    <g class="w-cloud c2" fill="#fff" opacity=".85"><ellipse cx="450" cy="70" rx="50" ry="15"/><ellipse cx="472" cy="59" rx="28" ry="17"/></g>
    <g class="w-birds" fill="none" stroke="#2F5FA8" stroke-width="2.4" stroke-linecap="round"><path d="M300 170q7-7 14 0q7-7 14 0"/><path d="M338 150q5-5 10 0q5-5 10 0"/><path d="M322 196q4-4 8 0q4-4 8 0"/></g>`;
  const far = step([[44, 396], [30, 378], [52, 390], [26, 366], [48, 384], [40, 398], [34, 372], [56, 388], [38, 362], [46, 392], [32, 376], [58, 394], [36, 368], [50, 386], [42, 374], [60, 396], [34, 380], [54, 390], [46, 370], [40, 392]], '#B4D3F4');
  let back = '', mid = '', front = houses([[70, 470, 440, 1], [90, 486, 446], [60, 462, 432], [110, 480, 438, 1], [80, 468, 436], [100, 490, 450, 1], [70, 466, 434], [120, 482, 444, 1], [110, 474, 440]]);
  if (city === 'vienna') { // Stephansdom + Riesenrad
    const spokes = Array.from({ length: 16 }, (_, i) => `M590 300L${(590 + 70 * Math.cos(i * Math.PI / 8)).toFixed(1)} ${(300 + 70 * Math.sin(i * Math.PI / 8)).toFixed(1)}`).join('');
    const cabins = Array.from({ length: 12 }, (_, i) => `<rect x="${(584 + 86 * Math.cos(i * Math.PI / 6)).toFixed(1)}" y="${(295 + 86 * Math.sin(i * Math.PI / 6)).toFixed(1)}" width="12" height="10" rx="2.5"/>`).join('');
    mid = `<g fill="${L}"><polygon points="150,445 176,358 318,358 344,445"/><rect x="178" y="318" width="26" height="60"/><path d="M178 320Q191 290 204 320Z"/><rect x="189" y="280" width="4" height="16"/><polygon points="284,445 284,318 289,292 293,256 297,206 300,110 303,206 307,256 311,292 316,318 316,445"/></g>
      <path d="M168 402l12-10 12 10 12-10 12 10 12-10 12 10 12-10 12 10 12-10 12 10 12-10 12 10" fill="none" stroke="#7AA8E8" stroke-width="3" stroke-linejoin="round"/>
      <g fill="none" stroke="${L}" stroke-linecap="round"><path d="M590 300L546 445M590 300L634 445" stroke-width="7"/><g class="w-wheel"><circle cx="590" cy="300" r="80" stroke-width="5"/><circle cx="590" cy="300" r="70" stroke-width="2"/><path d="${spokes}" stroke-width="1.6"/><g fill="${L}" stroke="none">${cabins}</g></g></g><circle cx="590" cy="300" r="8" fill="${D}"/>`;
  } else if (city === 'graz') { // Schlossberg + Uhrturm
    mid = `<path fill="${hill}" d="M40 452C130 352 220 330 300 330C390 330 470 352 560 452Z"/>
      <g fill="#5C92DC"><circle cx="150" cy="412" r="15"/><circle cx="176" cy="390" r="16"/><circle cx="206" cy="370" r="14"/><circle cx="236" cy="356" r="13"/><circle cx="366" cy="354" r="13"/><circle cx="398" cy="366" r="15"/><circle cx="430" cy="384" r="16"/><circle cx="462" cy="406" r="15"/></g>
      <g fill="${L}"><rect x="284" y="258" width="32" height="80"/><rect x="298" y="198" width="4" height="18"/><rect x="600" y="330" width="20" height="115"/><rect x="636" y="330" width="20" height="115"/><rect x="612" y="362" width="32" height="83"/><polygon points="598,332 610,294 622,332"/><polygon points="634,332 646,294 658,332"/></g>
      <g fill="${D}"><polygon points="272,256 300,214 328,256"/><rect x="268" y="252" width="64" height="9" rx="2"/></g>
      <circle cx="300" cy="286" r="11" fill="#EAF4FF"/><path d="M300 286v-7M300 286l5 3" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`;
  } else if (city === 'munich') { // Alps + Frauenkirche + Olympiaturm
    back = `<polygon fill="#D2E5FA" points="0,404 58,362 96,380 158,318 206,352 262,298 318,350 378,320 430,356 498,294 556,344 618,310 688,352 742,326 800,350 800,430 0,430"/>
      <path fill="#fff" d="M158 318L143 333L152 331L158 338L165 331L172 332ZM262 298L247 312L255 311L262 318L269 310L276 311ZM498 294L483 308L491 307L498 314L505 306L512 306Z"/>`;
    mid = `<g fill="${L}"><polygon points="300,445 322,340 468,340 490,445"/><rect x="236" y="244" width="36" height="201"/><rect x="290" y="244" width="36" height="201"/><path d="M236 246C236 206 272 206 272 246Z"/><path d="M290 246C290 206 326 206 326 246Z"/><rect x="251" y="194" width="6" height="18"/><rect x="305" y="194" width="6" height="18"/><circle cx="254" cy="192" r="4"/><circle cx="308" cy="192" r="4"/>
      <polygon points="682,445 698,445 694,238 686,238"/><ellipse cx="690" cy="240" rx="24" ry="9"/><ellipse cx="690" cy="256" rx="16" ry="6"/><rect x="688" y="150" width="4" height="90"/></g>
      <g fill="${D}"><rect x="248" y="272" width="12" height="20" rx="6"/><rect x="302" y="272" width="12" height="20" rx="6"/><rect x="248" y="320" width="12" height="20" rx="6"/><rect x="302" y="320" width="12" height="20" rx="6"/></g>`;
  } else { // Bratislava: castle + Danube + UFO bridge
    const wins = [306, 330].map((y) => Array.from({ length: 8 }, (_, i) => `<rect x="${244 + i * 16}" y="${y}" width="7" height="10" rx="1"/>`).join('')).join('');
    mid = `<path fill="${hill}" d="M10 468C100 376 200 352 300 352C400 352 490 376 580 468Z"/>
      <g fill="#6E9FE3"><rect x="238" y="262" width="24" height="44"/><rect x="338" y="262" width="24" height="44"/><polygon points="236,264 250,240 264,264"/><polygon points="336,264 350,240 364,264"/></g>
      <g fill="${L}"><rect x="212" y="292" width="176" height="66"/><rect x="204" y="270" width="30" height="88"/><rect x="366" y="270" width="30" height="88"/><polygon points="201,272 219,244 237,272"/><polygon points="363,272 381,244 399,272"/></g><g fill="#8DB6EE">${wins}</g>`;
    front = `<rect y="468" width="800" height="92" fill="#8CC2F5"/><path d="M30 502q20-8 40 0t40 0M150 526q20-8 40 0t40 0M470 510q20-8 40 0t40 0M640 536q20-8 40 0t40 0" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>
      <path d="M641 262L420 458M641 262L465 458M641 262L510 458M641 262L555 458M641 262L600 458" stroke="${L}" stroke-width="1.6" opacity=".9"/>
      <g fill="${L}"><rect x="360" y="456" width="440" height="10" rx="2"/><polygon points="598,470 612,470 650,252 638,250"/><ellipse cx="644" cy="246" rx="34" ry="10"/><path d="M629 242Q644 222 659 242Z"/></g>`;
  }
  return `<svg viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${sky}${back}${far}${mid}${front}</svg>`;
}

function wipeSec() {
  if (!P()) return '';
  return `<section class="block" id="wipe"><div class="container"><div class="wipe reveal">
    <div class="wipe-text">
      <span class="wipe-tag">Міні-гра</span>
      <h2 class="sec-title">Протріть вікно — і отримайте −10%</h2>
      <p class="sec-sub">Під шаром пилу ховається ${state.city === 'bratislava' ? 'сонячна' : 'сонячний'} ${CITIES[state.city].name}. Проведіть курсором або пальцем по склу — коли вікно засяє, Welcome-бонус на перше прибирання ваш.</p>
      <div class="wipe-meter" aria-live="polite"><div class="bar"><i id="wipeBar"></i></div><div class="lbl"><b id="wipePct">0%</b><span id="wipeMsg">${WIPE_MSG[0][1]}</span></div></div>
      <button type="button" class="wipe-auto" data-wipe="auto">${ic('spray')}Помити за мене</button>
    </div>
    <div class="wipe-stage" id="wipeStage">
      <div class="wipe-view" aria-hidden="true">${cityViewSVG(state.city)}</div>
      <canvas id="wipeCanvas" role="img" aria-label="Запилене вікно: протріть його курсором або пальцем"></canvas>
      <canvas id="wipeFx" aria-hidden="true"></canvas>
      <div class="wipe-frame" aria-hidden="true"><i class="handle"></i></div>
      <div class="wipe-sq" id="wipeSq" aria-hidden="true">${SQUEEGEE}</div>
      <div class="wipe-win" id="wipeWin" hidden><div class="ww-card">
        <div class="ww-spark">${SPARK}</div><h3>Бездоганно чисто!</h3><p class="ww-time" id="wipeTime"></p>
        <div class="ww-bonus"><b>−10%</b><span>Welcome-бонус<br />на перше прибирання</span></div>
        <button type="button" class="cta" data-open="book">Забронювати зі знижкою</button>
        <button type="button" class="ww-again" data-wipe="reset">Забруднити знову</button>
      </div></div>
    </div>
  </div></div></section>`;
}

function initWipe() {
  const cv = $('#wipeCanvas'); if (!cv) return;
  cancelAnimationFrame(wipe.raf);
  Object.assign(wipe, { cv, ctx: cv.getContext('2d'), fx: $('#wipeFx'), parts: [], raf: 0, fxT: 0, last: null, down: false, started: 0, pct: 0, done: false, auto: false });
  wipe.fctx = wipe.fx.getContext('2d');
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = wipe.fx.width = Math.round((r.width || 640) * dpr);
  cv.height = wipe.fx.height = Math.round((r.height || 448) * dpr);
  wipe.mask = document.createElement('canvas');
  wipe.mask.width = 96; wipe.mask.height = Math.round(96 * cv.height / cv.width);
  wipe.mctx = wipe.mask.getContext('2d', { willReadFrequently: true });
  cv.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(SQUEEGEE.replace('<svg ', '<svg width="40" height="40" '))}") 20 9, crosshair`;
  dirty();
  // redraw once the web font is ready so "ПОМИЙ МЕНЕ" uses Montserrat
  if (document.fonts) document.fonts.load('800 40px Montserrat').then(() => { if (wipe.cv === cv && !wipe.started) dirty(); }).catch(() => {});
  cv.addEventListener('pointerdown', wipeDown);
  cv.addEventListener('pointermove', wipeMove);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => cv.addEventListener(t, wipeUp));
}
// Paint the dirty glass: dusty haze, grime, dried rain streaks, specks, a cobweb and a finger-written "wash me"
function dirty() {
  const { ctx, cv, mctx, mask } = wipe, w = cv.width, h = cv.height, s = w / 700, rnd = Math.random;
  ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(214,208,196,.9)'); g.addColorStop(.55, 'rgba(203,194,178,.93)'); g.addColorStop(1, 'rgba(172,160,140,.96)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const blob = (x, y, r, rgb, a) => { const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${rgb},${a})`); rg.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  for (let i = 0; i < 60; i++) blob(rnd() * w, rnd() * h, (24 + rnd() * 90) * s, '112,96,74', (.05 + rnd() * .13).toFixed(3));
  for (let i = 0; i < 18; i++) blob(rnd() * w, rnd() * h, (30 + rnd() * 70) * s, '255,255,255', (.06 + rnd() * .1).toFixed(3));
  ctx.lineCap = 'round';
  for (let i = 0; i < 48; i++) {
    let x = rnd() * w; const y0 = rnd() * h * .55, len = (50 + rnd() * 220) * s;
    ctx.strokeStyle = `rgba(92,80,60,${(.07 + rnd() * .12).toFixed(3)})`; ctx.lineWidth = (1 + rnd() * 2.4) * s;
    ctx.beginPath(); ctx.moveTo(x, y0);
    for (let k = 8 * s; k < len; k += 8 * s) { x += (rnd() - .5) * 1.6 * s; ctx.lineTo(x, y0 + k); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.2 * s;
  for (let i = 0; i < 28; i++) { ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, (3 + rnd() * 9) * s, 0, 7); ctx.stroke(); }
  for (let i = 0; i < 1100; i++) { const sz = (.6 + rnd() * 1.8) * s; ctx.fillStyle = `rgba(66,56,42,${(.12 + rnd() * .35).toFixed(3)})`; ctx.fillRect(rnd() * w, rnd() * h, sz, sz); }
  const rays = [2, 18, 34, 52, 70, 88].map((d) => d * Math.PI / 180), R0 = 150 * s;
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.3 * s;
  for (const a of rays) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R0, Math.sin(a) * R0); ctx.stroke(); }
  for (let k = 1; k <= 5; k++) {
    const rr = R0 * k / 5.6; ctx.beginPath();
    rays.forEach((a, i) => { const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (!i) ctx.moveTo(x, y); else { const m = (a + rays[i - 1]) / 2; ctx.quadraticCurveTo(Math.cos(m) * rr * .86, Math.sin(m) * rr * .86, x, y); } });
    ctx.stroke();
  }
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.translate(w * .75, h * .3); ctx.rotate(-.07);
  ctx.font = `800 ${Math.round(34 * s)}px Montserrat, Arial, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillText('ПОМИЙ МЕНЕ', 0, 0); ctx.restore();
  mctx.globalCompositeOperation = 'source-over'; mctx.fillStyle = '#000'; mctx.fillRect(0, 0, mask.width, mask.height);
}
function wipeXY(e) {
  const r = wipe.cv.getBoundingClientRect(), k = wipe.cv.width / r.width;
  return [(e.clientX - r.left) * k, (e.clientY - r.top) * k, k, Math.max(28, Math.min(40, r.width * .06)) * k];
}
function wipeDown(e) {
  if (wipe.done || wipe.auto) return;
  wipe.down = true;
  try { wipe.cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
  const [x, y, , R] = wipeXY(e); wipe.last = [x, y]; wipeStroke(x, y, x, y, R);
}
function wipeMove(e) {
  if (wipe.done || wipe.auto || (e.pointerType !== 'mouse' && !wipe.down)) return;
  const [x, y, k, R] = wipeXY(e);
  if (wipe.last) wipeStroke(wipe.last[0], wipe.last[1], x, y, R);
  wipe.last = [x, y];
  if (Math.random() < .35) spark(x + (Math.random() - .5) * 40 * k, y + (Math.random() - .5) * 40 * k, k);
}
function wipeUp() { wipe.down = false; wipe.last = null; if (wipe.cv && !wipe.done) wipeCheck(true); }
// Erase a soft-edged stroke from the dirt, and a hard one from the low-res mask used to measure progress
function wipeStroke(x0, y0, x1, y1, R) {
  const { ctx, mctx, mask, cv } = wipe, ms = mask.width / cv.width;
  if (!wipe.started) wipe.started = performance.now();
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (R * .3)));
  ctx.globalCompositeOperation = 'destination-out'; mctx.globalCompositeOperation = 'destination-out'; mctx.fillStyle = '#000';
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    const g = ctx.createRadialGradient(x, y, R * .3, x, y, R);
    g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
    mctx.beginPath(); mctx.arc(x * ms, y * ms, R * ms * .8, 0, 7); mctx.fill();
  }
  wipeCheck();
}
function wipeCheck(force) {
  const now = performance.now();
  if (!force && now - wipe.lastCheck < 110) return;
  wipe.lastCheck = now;
  const d = wipe.mctx.getImageData(0, 0, wipe.mask.width, wipe.mask.height).data;
  let clean = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 128) clean++;
  wipe.pct = clean / (d.length / 4);
  wipeMeter();
  if (wipe.pct >= WIPE_DONE_AT && !wipe.done && !wipe.auto) wipeFinish(false);
}
function wipeMeter() {
  const bar = $('#wipeBar'); if (!bar) return;
  const p = wipe.done ? 1 : Math.min(1, wipe.pct / WIPE_DONE_AT);
  bar.style.width = (p * 100).toFixed(1) + '%';
  $('#wipePct').textContent = Math.round(p * 100) + '%';
  $('#wipeMsg').textContent = wipe.done ? 'Бездоганно!' : WIPE_MSG.filter(([v]) => p >= v).pop()[1];
}
function spark(x, y, k, big) {
  if (REDUCED_MOTION) return;
  wipe.parts.push({ x, y, r: (big ? 9 + Math.random() * 12 : 5 + Math.random() * 7) * k, vy: -(.2 + Math.random() * .5) * k, t: 0, life: big ? 900 + Math.random() * 500 : 520 + Math.random() * 320, delay: big ? Math.random() * 500 : 0 });
  if (!wipe.raf) wipe.raf = requestAnimationFrame(fxLoop);
}
function fxLoop(ts) {
  const { fctx, fx } = wipe, dt = wipe.fxT ? Math.min(50, ts - wipe.fxT) : 16;
  wipe.fxT = ts;
  fctx.clearRect(0, 0, fx.width, fx.height);
  wipe.parts = wipe.parts.filter((p) => (p.t += dt) < p.life + p.delay);
  for (const p of wipe.parts) {
    if (p.t < p.delay) continue;
    const q = (p.t - p.delay) / p.life, a = q < .3 ? q / .3 : 1 - (q - .3) / .7, r = p.r * (.6 + .4 * Math.sin(q * Math.PI));
    p.y += p.vy * dt / 16;
    fctx.save(); fctx.globalAlpha = Math.max(0, a); fctx.translate(p.x, p.y); fctx.beginPath();
    fctx.moveTo(0, -r); fctx.quadraticCurveTo(r * .15, -r * .15, r, 0); fctx.quadraticCurveTo(r * .15, r * .15, 0, r);
    fctx.quadraticCurveTo(-r * .15, r * .15, -r, 0); fctx.quadraticCurveTo(-r * .15, -r * .15, 0, -r);
    fctx.fillStyle = '#fff'; fctx.shadowColor = 'rgba(120,190,255,.9)'; fctx.shadowBlur = r; fctx.fill(); fctx.restore();
  }
  wipe.raf = wipe.parts.length ? requestAnimationFrame(fxLoop) : 0;
  if (!wipe.raf) wipe.fxT = 0;
}
function wipeFinish(auto) {
  wipe.done = true; wipe.auto = false; wipe.down = false; state.wipeBonus = true;
  const t = (performance.now() - wipe.started) / 1000, cv = wipe.cv, k = cv.width / cv.getBoundingClientRect().width;
  cv.classList.add('gone'); $('#wipeStage').classList.add('shine');
  for (let i = 0; i < 34; i++) spark(Math.random() * cv.width, Math.random() * cv.height, k, true);
  let line = 'Помили за вас за дві секунди — справжні вікна миємо так само, без розводів.';
  if (!auto) {
    const best = parseFloat(store.get('sg-wipe-best')) || 0;
    if (!best || t < best) store.set('sg-wipe-best', t.toFixed(1));
    line = `Ваш час — ${dec(f1(t))} с${!best ? '' : t < best ? ' · новий рекорд!' : ` · рекорд ${dec(best)} с`}`;
  }
  $('#wipeTime').textContent = line;
  wipeMeter();
  setTimeout(() => { const win = $('#wipeWin'); if (win && wipe.done) win.hidden = false; }, 650);
}
// "Помити за мене": a squeegee sweeps the glass in five horizontal passes
function wipeAuto() {
  if (!wipe.cv || wipe.done || wipe.auto) return;
  wipe.auto = true; if (!wipe.started) wipe.started = performance.now();
  const w = wipe.cv.width, h = wipe.cv.height, rows = 5, R = h / rows * .7, pts = [];
  for (let i = 0; i < rows; i++) { const y = (i + .5) * h / rows, l = [-R * .2, y], r = [w + R * .2, y]; pts.push(...(i % 2 ? [r, l] : [l, r])); }
  const segs = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], len]); total += len; }
  const at = (dist) => { let acc = 0; for (const [a, b, len] of segs) { if (acc + len >= dist) { const f = (dist - acc) / len; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } acc += len; } return pts[pts.length - 1]; };
  const sq = $('#wipeSq'), T = 2000, t0 = performance.now(); let prev = pts[0];
  sq.classList.add('on');
  const frame = (now) => {
    if (!wipe.auto || !sq.isConnected) return;
    const q = Math.min(1, (now - t0) / T), e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2, cur = at(total * e);
    wipeStroke(prev[0], prev[1], cur[0], cur[1], R);
    const s = wipe.cv.getBoundingClientRect().width / w, dir = cur[0] >= prev[0] ? 90 : -90;
    sq.style.transform = `translate(${cur[0] * s}px, ${cur[1] * s}px) rotate(${dir}deg)`;
    prev = cur;
    if (q < 1) requestAnimationFrame(frame); else { sq.classList.remove('on'); wipeFinish(true); }
  };
  requestAnimationFrame(frame);
}
function wipeReset() {
  if (!wipe.cv) return;
  Object.assign(wipe, { auto: false, done: false, down: false, started: 0, pct: 0, last: null });
  $('#wipeWin').hidden = true; $('#wipeSq').classList.remove('on');
  wipe.cv.classList.remove('gone'); $('#wipeStage').classList.remove('shine');
  dirty(); wipeMeter();
}

/* Request-only services (after renovation, office move): no fake calculator — explain how the estimate works */
const CAMERA_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>';
// after renovation: photos go straight to WhatsApp, the city is already in the message
const waRenoHref = () => `${WA}?text=${encodeURIComponent(`Добрий день! Потрібне прибирання після ремонту (${CITIES[state.city].name}). Надсилаю фото.`)}`;
function sideRequest() {
  const biz = !P();
  const steps = biz
    ? [['Опишіть обʼєкт', 'тип, площа, бажаний графік'], ['Огляд або фото', 'менеджер приїде чи оцінить за фото'], ['Пропозиція за 24 години', 'з договором і документами']]
    : SOLO_PAGE.reno.estimate;
  return `<div class="side-card">
    <h2>${biz ? 'Розрахуємо під ваш обʼєкт' : 'Оцінимо прибирання за фото'}</h2>
    <p class="muted">${biz ? 'Такі роботи рахуємо індивідуально — без шаблонних цін і доплат.' : 'Обсяг після ремонту дуже різний, тому ціну називаємо за фото, а не наосліп.'}</p>
    <ol class="side-steps">${steps.map(([t, d], i) => `<li><span class="n">${i + 1}</span><span><b>${t}</b><small>${d}</small></span></li>`).join('')}</ol>
    ${biz
      ? `<button type="button" class="cta" data-open="book" data-bizgoal="Комерційна пропозиція">Надіслати запит</button><button type="button" class="side-alt" data-open="book" data-bizgoal="Огляд обʼєкта">або запросити огляд обʼєкта</button>`
      : `<a class="cta wa-cta" href="${waRenoHref()}" target="_blank" rel="noopener">${SOC.wa}Надіслати фото у WhatsApp</a><p class="side-tip">${CAMERA_SVG}<span>${SOLO_PAGE.reno.photoTip}</span></p><button type="button" class="side-alt" data-open="book">або залишити заявку — передзвонимо</button>`}
    <div class="cta-note"><span class="live"><i class="dot"></i><span class="lt"></span></span></div>
  </div>`;
}

/* ═════════ PAGES ═════════ */
function pageHome() {
  const c = CITIES[state.city];
  if (P()) {
    // price → proof → choice → booking
    return heroHTML({ eyebrow: 'Your trusted cleaning service', h1: `Прибирання квартир і будинків <span class="accent">у ${c.loc}${SPARK}</span>`,
      lead: 'Оберіть тип прибирання та площу — і одразу побачите фіксовану ціну. Разово або регулярно, без очікування дзвінка менеджера.', trust: TRUST_P, stats: STATS_PRIVATE })
      + reviewsSec() + compareSec() + moreServicesSec() + aboutSec(null, { noStats: true }) + stepsSec() + homePromos() + faqSec() + contactsSec();
  }
  return heroHTML({ kicker: `Професійне прибирання для бізнесу у ${c.loc}`, h1: 'Беремо чистоту вашого бізнесу <span class="accent">під контроль</span>',
    lead: 'Регулярне прибирання, контроль якості, персональний менеджер і повний пакет документів — під ваш графік та вимоги.', trust: trustBiz() })
    + bizTrustSec() + aboutSec() + objectsSec() + stepsSec() + bizTermsSec() + faqSec() + contactsSec();
}
function pageList() {
  const c = CITIES[state.city];
  return heroHTML({ crumbs: [['Головна', homeHref('private')], ['Послуги для дому']], eyebrow: 'Послуги для фізичних осіб', h1: `Послуги прибирання для дому <span class="accent">у ${c.loc}</span>`,
    lead: 'Вдома хочеться відпочивати, а не прибирати. Беремо це на себе — від регулярного прибирання до складних випадків після ремонту чи переїзду.', trust: TRUST_P, stats: STATS_PRIVATE })
    + servicesSec('Усі послуги для дому', `Ціни для міста ${c.name}.`, SVC_ORDER.private, 'private')
    + reviewsSec() + compareSec() + homePromos() + faqSec() + contactsSec();
}
/* Package pages (basic / general / deep). Three pages — three different jobs: each explains its own package first
   and only then compares the three, so the pages are not copies with a swapped heading. */
const CALC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M8.5 18h.01M12 18h.01M15.5 14.5V18"/></svg>';
// when this package is the right one (the question a visitor of the deep page has: why not general?)
function whenSec(k) {
  return sec('when', `Коли варто обрати ${TYPES[k].full.toLowerCase()}?`, '', `<div class="principles when">${TIER_PAGE[k].when.map(([icn, t, x], i) => `<div class="pr pop" style="--i:${i}">${ic(icn)}<h3>${t}</h3><p>${x}</p></div>`).join('')}</div>
    <p class="when-note reveal">Переїжджаєте або щойно завершили ремонт? Для цього є окремі послуги: <a href="${svcHref('moveout', 'private')}">прибирання при переїзді</a> та <a href="${svcHref('reno', 'private')}">прибирання після ремонту</a>.</p>`);
}
// what exactly this package covers: a few zones with concrete actions, the full checklist one click away
function tierInclSec(k) {
  const tp = TIER_PAGE[k], n = pkgTasks(k), cnt = `${n} ${tasksWord(n)}`;
  const item = (x) => x[0] === '+' ? `<li class="new"><span class="ck">+</span><span>${x.slice(1)}</span></li>` : `<li><span class="ck">✓</span><span>${x}</span></li>`;
  return sec('incl', `Що входить у ${TYPES[k].full.toLowerCase()}`, tp.inclSub.replace('{n}', cnt),
    `<div class="incl-grid tz c${tp.zones.length === 4 ? 4 : 3}">${tp.zones.map(([icn, t, items], i) => `<div class="incl-card pop" style="--i:${i}"><h3>${ic(icn)}${t}</h3><ul>${items.map(item).join('')}</ul></div>`).join('')}</div>
    <div class="tz-foot reveal"><button type="button" class="btn-ghost" data-cklist="${k}">Переглянути всі ${cnt}</button>${tp.note ? `<p class="tz-note">${tp.note}</p>` : ''}</div>`);
}
// a page's own questions; price, crew, timing and minimums come from the city's tables
function fillFaq(list, key) {
  const c = CITIES[state.city], r = R(), cr = key && c.crew[key], n = TIER_RANK[key] != null ? pkgTasks(key) : 0;
  const span = (a) => { const lo = Math.min(...a), hi = Math.max(...a); return lo === hi ? dec(lo) : `від ${dec(lo)} до ${dec(hi)}`; };
  const vals = { loc: c.loc, min: eur(r.minVisit), rate: `${dec(r.windowHour)} €`, n: n ? `${n} ${tasksWord(n)}` : '', from: key ? `від ${eur(cityPrices()[key][0])}` : '', time: cr ? span(cr.h) : '', crew: cr ? span(cr.c) : '' };
  return list.map(([q, a]) => [q, a.replace(/\{(\w+)\}/g, (m, k) => vals[k] || m)]);
}
// one more button after the questions: back to this page's calculator
function finalCalcSec([t, x], pick) {
  return `<section class="block" id="start"><div class="container"><div class="final-cta reveal">
    <div><h2>${t}</h2><p>${x}</p></div>
    <div class="fc-btns"><button type="button" class="fc-btn home" data-pick="${pick}">${CALC_SVG}Розрахувати вартість</button><a class="fc-btn biz" href="${WA}" target="_blank" rel="noopener">${SOC.wa}Написати у WhatsApp</a></div>
  </div></div></section>`;
}
/* Move-in / move-out: one service and one price, two situations */
function movesSec() {
  return sec('scenario', 'Заїжджаєте чи виїжджаєте?', 'Одна послуга й одна ціна — різні акценти.', `<div class="scs">${SOLO_PAGE.moveout.moves.map(([id, icn, t, x, items], i) => `
    <article class="sc-card ${state.move === id ? 'cur' : ''} pop" style="--i:${i}" data-sc="${id}">${ic(icn)}<h3>${t}</h3><p>${x}</p>
      <ul>${items.map((y) => `<li><span class="ck">✓</span><span>${y}</span></li>`).join('')}</ul>
      <button type="button" class="plan-go" data-move="${id}">${state.move === id ? '✓ Обрано' : 'Обрати й розрахувати'}</button></article>`).join('')}</div>`);
}
// the scenario cards follow the choice made in the calculator (and the other way round)
function syncMove() {
  $$('#scenario .sc-card').forEach((el) => { const on = el.dataset.sc === state.move; el.classList.toggle('cur', on); el.querySelector('.plan-go').textContent = on ? '✓ Обрано' : 'Обрати й розрахувати'; });
}
function prepSec(k = 'moveout', title = 'Як підготувати квартиру до прибирання') {
  const list = SOLO_PAGE[k].prep;
  return sec('prep', title, '', `<div class="principles when${list.length === 3 ? ' c3' : ''}">${list.map(([icn, t, x], i) => `<div class="pr pop" style="--i:${i}">${ic(icn)}<h3>${t}</h3><p>${x}</p></div>`).join('')}</div>`);
}
// the Welcome banner shows the bonus in money for the apartment in the calculator
function syncWelcome() {
  const el = $('#welcomeCalc'); if (!el || !P()) return;
  const c = computePriv();
  el.textContent = c.preWelcome ? `Для вашої квартири: ${eur(c.preWelcome)} → ${eur2(c.preWelcome * (1 - WELCOME))}.` : '';
}
/* Windows: what the price covers, how it is formed and confirmed */
function winInclSec() {
  const sp = SOLO_PAGE.windows, li = (x, add) => `<li class="${add ? 'add' : ''}"><span class="ck">${add ? '+' : '✓'}</span><span>${x}</span></li>`;
  return sec('incl', 'Що входить у миття вікон', '', `<div class="incl-grid tz c2">
      <div class="incl-card pop"><h3>${ic('window')}У вартість входить</h3><ul>${sp.incl.map((x) => li(x)).join('')}</ul></div>
      <div class="incl-card pop" style="--i:1"><h3>${ic('plus')}Додатково</h3><ul>${sp.extra.map((x) => li(x, true)).join('')}</ul><p class="ic-note">${sp.extraNote}</p></div></div>
    <div class="tz-foot reveal"><p class="tz-note">${sp.note}</p><a class="btn-ghost" href="${svcHref('windows', 'business')}">Вікна в офісі чи закладі →</a></div>`);
}
function winPriceSec() {
  const sp = SOLO_PAGE.windows, r = R(), fill = (x) => x.replace(/\{min\}/g, eur(r.minVisit)).replace(/\{rate\}/g, `${dec(r.windowHour)} €`);
  return sec('price', 'Як формується ціна', '', `<ol class="flow reveal">${sp.flow.map(([t, x], i) => `<li><span class="n">${i + 1}</span><span><b>${t}</b><small>${x}</small></span></li>`).join('')}</ol>
    <div class="principles when c3">${sp.terms.map(([icn, t, x], i) => `<div class="pr pop" style="--i:${i}">${ic(icn)}<h3>${fill(t)}</h3><p>${fill(x)}</p></div>`).join('')}</div>`);
}
/* After renovation: one residential checklist, what it is not, conditions, before / after, the photo call at the end */
function renoInclSec() {
  const sp = SOLO_PAGE.reno;
  return sec('incl', 'Що входить у прибирання після ремонту', '', `<div class="incl-grid tz reno-incl">
      <div class="incl-card pop"><h3>${ic('roller')}Чек-лист прибирання</h3><ul>${sp.incl.map((x) => `<li><span class="ck">✓</span><span>${x}</span></li>`).join('')}</ul>
        <p class="ic-out"><span class="x" aria-hidden="true">✕</span>${sp.out}</p></div>
      <div class="incl-card vs-card pop" style="--i:1"><h3>Не плутайте з глибоким прибиранням</h3>${sp.vs.map(([icn, t, x], i) => `<div class="vs-row${i ? '' : ' cur'}">${ic(icn)}<span><b>${t}</b>${x}</span></div>`).join('')}</div></div>
    <div class="tz-foot reveal"><a class="btn-ghost" href="${svcHref('reno', 'business')}">Потрібне прибирання після ремонту для бізнесу? →</a></div>`);
}
function baSec() {
  const frame = (src, label, cap) => src ? `<img loading="lazy" alt="${cap}: ${label.toLowerCase()} прибирання" src="${src}" />`
    : `<span class="ba-ph">${ic(label === 'До' ? 'roller' : 'spray')}<small>фото «${label.toLowerCase()}»</small></span>`;
  return sec('before-after', 'До і після прибирання', 'Будівельний пил і сліди ремонту — і та сама квартира, готова до заселення.',
    `<div class="ba-grid">${SOLO_PAGE.reno.ba.map(([cap, b, a], i) => `<figure class="ba pop" style="--i:${i}"><div class="ba-pair">
      <div class="ba-img">${frame(b, 'До', cap)}<em>До</em></div><div class="ba-img">${frame(a, 'Після', cap)}<em class="after">Після</em></div></div><figcaption>${cap}</figcaption></figure>`).join('')}</div>`);
}
// the last call asks for photos, not for a booking
function finalPhotoSec([t, x]) {
  return `<section class="block" id="start"><div class="container"><div class="final-cta reveal">
    <div><h2>${t}</h2><p>${x}</p></div>
    <div class="fc-btns"><a class="fc-btn wa" href="${waRenoHref()}" target="_blank" rel="noopener">${SOC.wa}Надіслати фото у WhatsApp</a></div>
  </div></div></section>`;
}
function pageService() {
  const s = PAGE_SVC, kind = state.mode, c = CITIES[state.city], tier = ownTier();
  const crumbs = [['Головна', homeHref('private')], kind === 'private' ? ['Послуги для дому', listHref()] : ['Послуги для бізнесу', homeHref('business')], [s.name]];
  let facts = [];
  if (kind === 'private') {
    const sub = svcSubline('private', SVC_ID);
    if (SVC_ID === 'reno') facts.push(['Вартість', 'після оцінки за фото', `${dec(R().windowHour)} € / год роботи одного клінера`]);
    else if (sub) facts.push(SVC_ID === 'windows' ? ['Мінімальне замовлення', eur(R().minVisit)] : ['Ціна', sub]);
    if (PRICE_KEY[SVC_ID]) { const cr = c.crew[PRICE_KEY[SVC_ID]]; facts.push(['Тривалість', `${dec(Math.min(...cr.h))}–${dec(Math.max(...cr.h))} год`]); }
    // the third fact is what sets the package apart: the schedule for basic, the size of the checklist for general and deep
    if (tier === 'basic') facts.push(['Регулярно', 'до −7%']);
    else if (tier) facts.push(['Чек-лист', `${pkgTasks(tier)} ${tasksWord(pkgTasks(tier))}`]);
    if (SVC_ID === 'moveout') facts.push(['Контроль', 'перед передачею']);
    if (SVC_ID === 'windows') facts.push(['Розрахунок', 'за 3 кроки'], ['Точна ціна', 'за фото']);
    if (SVC_ID === 'extras') facts.push(['Замовлення', 'окремо або до прибирання'], ['Мінімум', eur(R().minVisit)]);
  } else {
    facts = [['moveout', 'reno'].includes(SVC_ID) ? ['Ціна', 'після огляду'] : SVC_ID === 'airbnb' ? ['Ціна без ПДВ', `від ${eur2(APT[country() === 'sk' ? 'sk' : 'at'][0])} / апартамент`] : country() === 'sk' ? ['Ставка', 'за запитом'] : ['Ставка без ПДВ', 'від 27 € / год'], ['Пропозиція', 'за 24 години'], ['Документи', 'договір і інвойс']];
  }
  const requestOnly = (kind === 'private' && SVC_ID === 'reno') || (kind === 'business' && ['moveout', 'reno'].includes(SVC_ID));
  const hero = heroHTML({ crumbs, h1: `${s.h1 || s.name} <span class="accent">у ${c.loc}</span>`, sub: s.sub, lead: s.lead, note: tier && PKG_GIFTS[tier] ? giftsRow(tier, 'hero-gifts pop') : '',
    facts, trust: trustFor(kind, SVC_ID), side: requestOnly ? sideRequest() : null });
  const faqTitle = `Питання про «${s.name.charAt(0).toLowerCase() + s.name.slice(1)}»`;
  // package page: (when to choose it) → what is in it → the three side by side → how it goes → reviews → what next →
  // its own questions → one more button → other services
  if (tier) return hero + (TIER_PAGE[tier].when ? whenSec(tier) : '') + tierInclSec(tier) + compareSec() + stepsSec('private') + proofSec() + promoBannerHTML()
    + faqSec(fillFaq(TIER_PAGE[tier].faq, tier), faqTitle, true) + finalCalcSec(TIER_PAGE[tier].final, tier) + relatedSec(kind, s.related, 'Можливо, вам підійде інший формат прибирання.');
  // single-service pages: own blocks → how we work → reviews → Welcome bonus → own questions → one more button → other services
  const solo = kind === 'private' && SOLO_PAGE[SVC_ID];
  // after renovation: photo estimate → what is in it → conditions → how we clean → before / after → reviews → Welcome bonus →
  // own questions → photos in WhatsApp → other services (no way out to deep cleaning: they are different jobs)
  if (solo && SVC_ID === 'reno') return hero + renoInclSec() + prepSec('reno', 'Важливо перед приїздом команди') + stepsSec(s.steps, 'Як ми це робимо') + baSec() + proofSec() + promoBannerHTML()
    + faqSec(fillFaq(solo.faq), faqTitle, true) + finalPhotoSec(solo.final) + relatedSec(kind, s.related, 'Окремо або разом із прибиранням.');
  if (solo) return hero + (SVC_ID === 'moveout' ? movesSec() + inclSec(s) + prepSec() : winInclSec() + winPriceSec()) + stepsSec(s.steps, 'Як ми це робимо') + proofSec() + promoBannerHTML()
    + faqSec(fillFaq(solo.faq, PRICE_KEY[SVC_ID]), faqTitle, true) + finalCalcSec(solo.final, SVC_ID) + relatedSec(kind, s.related, 'Можливо, вам підійде інший формат прибирання.');
  return hero
    + (s.incl === 'tier' ? compareSec() : inclSec(s))
    + stepsSec(s.steps || (kind === 'private' ? 'private' : 'business'), s.steps && !['private', 'business'].includes(s.steps) ? 'Як ми це робимо' : 'Всього 4 простих кроки до бездоганної чистоти')
    + proofSec()
    + relatedSec(kind, s.related)
    + promoBannerHTML()
    + faqSec(s.faq, faqTitle)
    + contactStripHTML();
}
// One promo that fits the page instead of the full three-card block
function promoBannerHTML() {
  const idx = P() ? (isRegType(SVC_ID) ? 0 : 1) : ({ airbnb: 1, klining: 0, basic: 0 }[SVC_ID] ?? 2);
  let p = PROMOS[state.mode][idx], btn = `<button type="button" class="pbtn" data-promo="${p.act}">${p.btn}</button>`;
  // general and deep are one-off jobs: there the regular discount is an offer to keep the result with the basic package
  const up = ownTier() && TIER_PAGE[SVC_ID].upsell;
  if (up) { p = { ...PROMOS.private[0], tag: up[0], t: up[1], d: up[2] }; btn = `<a class="pbtn" href="${svcHref('basic', 'private')}?freq=weekly">Розрахувати базове</a>`; }
  // single-service pages: the Welcome bonus speaks about this very service (and, where it is counted, in money)
  const sp = P() && SOLO_PAGE[SVC_ID] && SOLO_PAGE[SVC_ID].promo;
  if (sp) {
    p = { ...p, d: sp[0] };
    btn = sp[1] === 'welcome' ? '<button type="button" class="pbtn" data-promo="welcome">Застосувати −10%</button>'
      : sp[1] === 'photo' ? `<a class="pbtn" href="${waRenoHref()}" target="_blank" rel="noopener">Надіслати фото</a>`
      : `<button type="button" class="pbtn" data-pick="${SVC_ID}">Розрахувати вартість</button>`;
  }
  return `<section class="block" id="promo"><div class="container"><article class="promo promo-bn ${p.cls} reveal">
    <div class="bd"><span class="pct ${p.sm ? 'sm' : ''}">${p.pct}</span><div class="tx">${p.tag ? `<span class="pm-tag">${p.tag}</span>` : ''}<h3>${p.t.charAt(0).toUpperCase() + p.t.slice(1)}</h3><p>${p.d}</p></div>${btn}</div>
    <img class="cut" loading="lazy" alt="${p.alt}" src="${p.img}" /></article>
    <a class="promo-more" href="${pageHref('promotions')}">Усі акції та знижки →</a></div></section>`;
}
function contactStripHTML() {
  return `<section class="block" id="contacts"><div class="container"><div class="ct-strip reveal">
    <div class="cs-t"><b>Залишилися питання?</b><span>Відповідаємо пн–пт, 9:00–18:00 · прибирання щодня</span></div>
    <div class="cs-links"><a class="cs wa" href="${WA}" target="_blank" rel="noopener">${SOC.wa}<span>WhatsApp<small>${BOLT_SVG}найшвидше</small></span></a>
      <a class="cs" href="${TG}" target="_blank" rel="noopener">${SOC.tg}<span>Telegram</span></a>
      <a class="cs" href="tel:${PHONE_TEL}">${SOC.ph}<span>${PHONE}</span></a></div>
  </div></div></section>`;
}
function pageObject() {
  const o = PAGE_OBJ, c = CITIES[state.city], sk = country() === 'sk';
  const crumbs = [['Головна', homeHref('private')], ['Послуги для бізнесу', homeHref('business')], [o.name]];
  const price = o.calc.obj === 'other' ? ['Ціна', 'після огляду'] : o.calc.obj === 'apartments' ? ['Ціна без ПДВ', `від ${eur2(APT[sk ? 'sk' : 'at'][0])} / апартамент`] : sk ? ['Ставка', 'за запитом'] : ['Ставка без ПДВ', 'від 27 € / год'];
  return heroHTML({ crumbs, h1: `${o.h1} <span class="accent">у ${c.loc}</span>`, lead: o.lead, facts: [price, ['Пропозиція', 'за 24 години'], ['Документи', 'договір і інвойс']], trust: trustBiz() })
    + sec('incl', 'Що входить', o.haccp ? 'Кухню прибираємо за стандартами HACCP.' : '', inclGroups(o.incl))
    + aboutSec()
    + stepsSec('business')
    + proofSec()
    + objRelatedSec(SVC_ID)
    + faqSec(o.faq, 'Часті питання')
    + contactStripHTML();
}
function objRelatedSec(cur) {
  return sec('related', 'Інші обʼєкти', '', `<div class="obj-links">${[...OBJ_MAIN, ...OBJ_MORE].filter((id) => id !== cur).map((id) => `<a class="obj-link" href="${objHref(id)}">${objIco(id)}<span>${OBJECTS[id].name}</span></a>`).join('')}</div>`);
}
function pageAbout() {
  return heroHTML({ crumbs: [['Головна', homeHref()], ['Про нас']], kicker: 'Про Shine Guards', h1: 'Будуємо сервіс прибирання, якому можна <span class="accent">довірити свій простір</span>',
    lead: 'Shine Guards — професійний сервіс прибирання для дому та бізнесу. Ми поєднуємо перевірену команду, чіткі стандарти, контроль якості та персональний супровід.', trust: ABOUT_FACTS,
    side: `<div class="hero-photo"><img alt="Команда клінерів Shine Guards у формі" src="${TEAM_PHOTO}" /><div class="fbadge">${ic('pin')}<span><b>Команда Shine Guards</b>Відень · Грац · Мюнхен · Братислава</span></div></div>` })
    + statsStripSec(STATS_PRIVATE) + storySec() + missionSec() + peopleSec() + principlesSec() + audienceSec() + socialProofSec() + finalCtaSec() + contactsSec();
}
function storySec() {
  return sec('story', 'Як починався Shine Guards', '', `<ol class="story">${STORY.map(([tag, t, d], i) => `<li class="pop" style="--i:${i}"><span class="st-dot" aria-hidden="true"></span><div class="st-card">${tag ? `<span class="st-tag">${tag}</span>` : ''}<h3>${t}</h3><p>${d}</p></div></li>`).join('')}</ol>`);
}
function missionSec() {
  return sec('mission', 'Місія та мета', '', `<div class="mission">${MISSION.map(([t, d], i) => `<div class="pop" style="--i:${i}">${ic(i ? 'towers' : 'spray')}<h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`);
}
function peopleSec() {
  const f = FOUNDER;
  return sec('people', 'Люди за Shine Guards', '', `<div class="people">${teamGalleryHTML(false, true)}
    <div class="people-t reveal"><p class="people-lead">За кожним прибиранням — конкретні люди: офіційно працевлаштовані клінери, супервайзери, які перевіряють результат, і менеджери, які ведуть кожне замовлення від заявки до завершення.</p>
      <figure class="founder"><blockquote>${f.quote}</blockquote><figcaption><span class="fd-ava" aria-hidden="true">${f.initials}</span><span><b>${f.name}</b><small>${f.role}</small></span></figcaption></figure></div></div>`);
}
function principlesSec() {
  return sec('quality', 'Як ми забезпечуємо якість', 'Чотири принципи, на яких тримається кожне прибирання.', `<div class="principles">${PRINCIPLES.map(([icn, t, d], i) => `<div class="pr pop" style="--i:${i}">${ic(icn)}<h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`);
}
function audienceSec() {
  const card = (cls, icon, t, d, href, btn, sl) => `<a class="aud ${cls} pop" href="${href}"><div class="aud-t"><span class="aud-ic">${icon}</span><h3>${t}</h3><p>${d}</p><span class="aud-go">${btn} →</span></div><img class="cut" loading="lazy" alt="${sl.alt}" src="${sl.img}" /></a>`;
  return sec('audience', 'Працюємо для дому та бізнесу', '', `<div class="auds">
    ${card('home', ICON_HOME, 'Для дому', 'Квартири, будинки, регулярне та разове прибирання.', listHref(), 'Послуги для дому', TEAM_GALLERY[1])}
    ${card('biz', ICON_BIZ, 'Для бізнесу', 'Офіси, HoReCa, апартаменти та комерційні обʼєкти.', homeHref('business'), 'Рішення для бізнесу', TEAM_GALLERY[3])}</div>`);
}
// companies → real people → Google 4,9 in one block
function socialProofSec() {
  return `<section class="block" id="proof"><div class="container"><div class="sec-head reveal"><div><h2 class="sec-title">Нам довіряють</h2><p class="sec-sub">Готелі, фітнес-клуби, офіси та керуючі компанії апартаментів.</p></div></div></div>
    ${logoMarquee()}
    <div class="container sec-head reveal proof-rev"><div><h3 class="sub-title">Що говорять наші клієнти</h3><p class="sec-sub">Останні відгуки з Google · перекладено українською.</p></div>${gScore()}</div>
    ${revWheelHTML()}</section>`;
}
function finalCtaSec() {
  return `<section class="block" id="start"><div class="container"><div class="final-cta reveal">
    <div><h2>Готові довірити нам свій простір?</h2><p>Розрахуйте прибирання онлайн за хвилину або отримайте комерційну пропозицію протягом 24 годин.</p></div>
    <div class="fc-btns"><a class="fc-btn home" href="${homeHref('private')}#top">${ICON_HOME}Розрахувати прибирання для дому</a><a class="fc-btn biz" href="${homeHref('business')}#top">${ICON_BIZ}Отримати пропозицію для бізнесу</a></div>
  </div></div></section>`;
}
function pagePromotions() {
  const tiers = `<div class="tiers">${FREQ.filter((x) => x.disc).reverse().map((x) => `<div class="tier ${x.id === 'weekly' ? 'best' : ''}"><b>−${Math.round(x.disc * 100)}%</b><span>${x.label.toLowerCase()} — на кожне прибирання</span></div>`).join('')}</div>`;
  const side = P()
    ? `<div class="side-card"><h2>Регулярне прибирання дешевше</h2><p class="muted">Знижка діє на кожне прибирання за графіком.</p>${tiers}<a class="cta" href="${svcHref('basic', 'private')}?freq=weekly">Розрахувати зі знижкою</a></div>`
    : `<div class="side-card"><h2>Знижки для бізнесу</h2><div class="tiers"><div class="tier best"><b>Індивідуально</b><span>для великих обсягів і мереж локацій</span></div><div class="tier"><b>до −10%</b><span>для керуючих апартаментами — залежно від обсягу</span></div></div><button type="button" class="cta" data-open="book" data-bizgoal="Індивідуальний розрахунок">Отримати індивідуальний розрахунок</button></div>`;
  return heroHTML({ crumbs: [['Головна', homeHref()], ['Акції']], eyebrow: 'Знижки та бонуси', h1: 'Акції та <span class="accent">знижки</span>',
    lead: 'Регулярне прибирання дешевше до 7%, Welcome-бонус 10% на перше замовлення, подарункові сертифікати та знижки для бізнесу.', side })
    + promosSec(PROMOS.private, 'Для дому') + promosSec(PROMOS.business, 'Для бізнесу').replace('id="promo"', 'id="promo-b"')
    + stepsSec('private', 'Як отримати знижку') + faqSec() + contactsSec();
}
function pageContacts() {
  return heroHTML({ crumbs: [['Головна', homeHref()], ['Контакти']], eyebrow: 'Контакти', h1: 'Звʼяжіться з <span class="accent">Shine Guards</span>',
    lead: 'Прибирання проводимо щодня. Менеджери відповідають з понеділка по пʼятницю, 9:00–18:00, — найшвидше у WhatsApp.', extra: `<div style="margin-top:22px">${contactCardsHTML()}</div>`,
    side: `<div class="map-card"><iframe title="Shine Guards на карті" loading="lazy" src="https://www.google.com/maps?q=Sto%C3%9F+im+Himmel+1%2F21,+1010+Wien&output=embed"></iframe><div class="mc-foot">${ic('pin')}<span><b>Офіс у Відні</b><small>${ADDRESS}</small></span><a href="https://www.google.com/maps/search/?api=1&query=Sto%C3%9F+im+Himmel+1%2F21+1010+Wien" target="_blank" rel="noopener">Маршрут ↗</a></div></div>` })
    + sec('biz', 'Для бізнесу та комерційної нерухомості', '', `<div class="biz-cards">
        <div class="biz-card">${ic('doc')}<h3>Додайте нас до тендеру</h3><p>Надішліть ТЗ — швидко підготуємо документи й розрахунок за вашими вимогами.</p><button type="button" class="btn-blue" data-open="book" data-bizgoal="Тендер — надішлю ТЗ">Надіслати ТЗ</button></div>
        <div class="biz-card">${ic('sign')}<h3>Комерційна пропозиція за 24 години</h3><p>Опишіть обʼєкт — надішлемо пропозицію без прихованих доплат.</p><button type="button" class="btn-blue" data-open="book" data-bizgoal="Комерційна пропозиція">Отримати пропозицію</button></div>
        <div class="biz-card">${ic('search')}<h3>Зустріч або огляд обʼєкта</h3><p>Менеджер приїде у зручний час, оцінить обсяг робіт і погодить графік.</p><button type="button" class="btn-blue" data-open="book" data-bizgoal="Огляд обʼєкта">Запросити огляд</button></div></div>`)
    + proofSec() + faqSec();
}
function pagePartnership() {
  const form = `<div class="calc-head"><h2>Стати партнером</h2></div>
    <p class="muted" style="margin:6px 0 0;font-size:14px">Залиште контакти — обговоримо формат і винагороду.</p>
    <form id="partnerForm">
      <div class="fld-2"><div class="fld"><label for="pName">Імʼя</label><input id="pName" required placeholder="Ваше імʼя" autocomplete="name" /></div><div class="fld"><label for="pCo">Компанія</label><input id="pCo" placeholder="Назва (необовʼязково)" autocomplete="organization" /></div></div>
      <div class="fld-2"><div class="fld"><label for="pPhone">Телефон</label><input id="pPhone" required type="tel" placeholder="+43 …" autocomplete="tel" /></div><div class="fld"><label for="pEmail">Email</label><input id="pEmail" type="email" autocomplete="email" /></div></div>
      <div class="fld"><label for="pFmt">Формат партнерства</label><select id="pFmt">${PARTNER.formats.map((x) => `<option>${x}</option>`).join('')}<option>Інший формат</option></select></div>
      <button class="cta" type="submit">Стати партнером</button>
      <div class="cta-note"><span>Відповімо пн–пт протягом 30 хвилин</span></div>
    </form>`;
  return heroHTML({ crumbs: [['Головна', homeHref()], ['Партнерство']], eyebrow: 'Партнерська програма', h1: 'Станьте партнером <span class="accent">Shine Guards</span>',
    lead: 'Рекомендуйте нас своїм клієнтам, орендарям чи підписникам — і отримуйте винагороду за кожне замовлення. Умови підлаштуємо під ваш бізнес.',
    trust: [['<path d="M20 6 9 17l-5-5"/>', 'Винагорода за кожне замовлення за рекомендацією'], ['<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', 'Ваші клієнти отримують надійний сервіс'], ['<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>', 'Гнучкі умови під ваш бізнес']], partner: form })
    + sec('how-p', 'Як це працює', '', `<div class="steps">${[['handshake', 'Домовляємося', 'Обговорюємо формат співпраці та винагороду.'], ['chat', 'Ви рекомендуєте', 'Клієнти, орендарі чи спільнота дізнаються про Shine Guards від вас.'], ['bucket', 'Ми прибираємо', 'Клієнт отримує професійний сервіс за чек-листом.'], ['card', 'Ви отримуєте винагороду', 'За кожне успішне замовлення за вашою рекомендацією.']].map(([icn, t, d], i) => `<div class="step pop" style="--i:${i}"><div class="step-top"><span class="n">${i + 1}</span>${ic(icn)}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`)
    + sec('who', 'Кому підходить партнерство', '', `<div class="biz-cards" style="grid-template-columns:repeat(2,1fr)">${PARTNER.who.map(([icn, t, d]) => `<div class="biz-card">${ic(icn)}<h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`)
    + sec('formats', 'Оберіть свій формат партнерства', 'Маєте ідею іншого формату чи готову базу контактів? Напишіть нам — домовимося.', `<div class="formats">${PARTNER.formats.map((x, i) => `<div><span>${i + 1}</span>${x}</div>`).join('')}</div>`)
    + logosSec() + contactsSec();
}

/* ═════════ SEO: JSON-LD ═════════ */
function applyJsonLd() {
  const c = CITIES[state.city];
  const url = $('link[rel=canonical]') ? $('link[rel=canonical]').href : BASE;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Shine Guards', url: BASE, telephone: PHONE, email: EMAIL, priceRange: '€€',
    image: 'https://res.cloudinary.com/dbiy7qyfe/image/upload/v1781018440/ABOUT_US_ROUND_e913ada099.jpg',
    address: { '@type': 'PostalAddress', streetAddress: 'Stoß im Himmel 1/21', postalCode: '1010', addressLocality: 'Wien', addressCountry: 'AT' },
    areaServed: ['Wien', 'Graz', 'München', 'Bratislava'].map((n) => ({ '@type': 'City', name: n })),
    openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
    sameAs: [IG, FB],
  }];
  if (PAGE === 'service') {
    const s = PAGE_SVC, from = P() && PRICE_KEY[SVC_ID] ? cityPrices()[PRICE_KEY[SVC_ID]][0] : null;
    ld.push({ '@context': 'https://schema.org', '@type': 'Service', name: `${s.name} у ${c.loc}`, serviceType: s.name, url, areaServed: { '@type': 'City', name: c.name }, provider: { '@type': 'LocalBusiness', name: 'Shine Guards' },
      ...(from ? { offers: { '@type': 'Offer', priceCurrency: 'EUR', price: from, priceSpecification: { '@type': 'PriceSpecification', minPrice: from, priceCurrency: 'EUR' } } } : {}) });
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: `${BASE}/${state.city}/ua` },
      { '@type': 'ListItem', position: 2, name: P() ? 'Послуги для дому' : 'Послуги для бізнесу', item: `${BASE}/${state.city}/ua/services/${state.mode}` },
      { '@type': 'ListItem', position: 3, name: s.name, item: url }] });
  }
  if (PAGE === 'object') {
    ld.push({ '@context': 'https://schema.org', '@type': 'Service', name: `${PAGE_OBJ.h1} у ${c.loc}`, serviceType: PAGE_OBJ.h1, url, areaServed: { '@type': 'City', name: c.name }, provider: { '@type': 'LocalBusiness', name: 'Shine Guards' } });
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Головна', item: `${BASE}/${state.city}/ua` },
      { '@type': 'ListItem', position: 2, name: 'Послуги для бізнесу', item: `${BASE}/${state.city}/ua/services/business` },
      { '@type': 'ListItem', position: 3, name: PAGE_OBJ.name, item: url }] });
  }
  if (FAQ_SET) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ_SET.flatMap((g) => g.qa).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
  let el = $('#ld'); if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ld'; document.head.appendChild(el); }
  el.textContent = JSON.stringify(ld);
}

/* ═════════ REVIEWS WHEEL, COUNTERS, REVEAL ═════════ */
let revIdx = 0, revHover = false;
function revCenter() {
  const tr = $('#revTrack'); if (!tr) return;
  const mid = tr.scrollLeft + tr.clientWidth / 2;
  let best = 0, bd = Infinity;
  $$('.rev', tr).forEach((el, i) => {
    const d = (el.offsetLeft + el.offsetWidth / 2 - mid) / el.offsetWidth, a = Math.min(Math.abs(d), 1.6);
    el.style.transform = `rotateY(${Math.max(-1.6, Math.min(1.6, d)) * -6}deg) scale(${1 - a * .05})`;
    el.style.opacity = 1 - a * .18;
    el.classList.toggle('center', a < .5);
    if (Math.abs(d) < bd) { bd = Math.abs(d); best = i; }
  });
  revIdx = best;
  $$('#revDots button').forEach((b, i) => b.classList.toggle('on', i === best));
}
function revGo(i, instant) {
  const tr = $('#revTrack'); if (!tr) return;
  const cards = $$('.rev', tr); revIdx = (i + cards.length) % cards.length;
  const el = cards[revIdx];
  tr.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - tr.clientWidth / 2, behavior: instant ? 'auto' : 'smooth' });
}
function wireDynamic() {
  $$('[data-gal]').forEach((g) => { const tr = g.querySelector('.tg-track'), dots = [...g.querySelectorAll('.tg-dots i')];
    tr.addEventListener('scroll', () => { const i = Math.round(tr.scrollLeft / tr.clientWidth); dots.forEach((dt, k) => dt.classList.toggle('on', k === i)); }, { passive: true }); });
  // the footer has its own contacts: the floating button steps aside there instead of covering them
  const ft = $('footer.ft'), fab = $('#fab');
  if (ft && fab && 'IntersectionObserver' in window) new IntersectionObserver(([en]) => fab.classList.toggle('away', en.isIntersecting), { rootMargin: '0px 0px -40px 0px' }).observe(ft);
  // on a computer it waits until the first screen (which has its own button) is scrolled away, then follows at the top right
  const hero = $('#top');
  if (fab && hero && 'IntersectionObserver' in window) new IntersectionObserver(([en]) => fab.classList.toggle('show', !en.isIntersecting)).observe(hero);
  else if (fab) fab.classList.add('show');
  showCurPlan();
  const tr = $('#revTrack');
  if (tr) {
    tr.addEventListener('scroll', revCenter, { passive: true });
    tr.addEventListener('pointerenter', () => (revHover = true));
    tr.addEventListener('pointerleave', () => (revHover = false));
    requestAnimationFrame(() => { revGo(1, true); revCenter(); });
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .1 }) : null;
  $$('.reveal').forEach((el) => io ? io.observe(el) : el.classList.add('in'));
  const counters = $$('[data-count]').filter((e) => /^\d+$/.test(e.dataset.count));
  const io2 = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => ents.forEach((en) => {
    if (!en.isIntersecting) return; io2.unobserve(en.target);
    const el = en.target, to = +el.dataset.count, sfx = el.dataset.suffix || '', t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString('uk-UA') + sfx; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .4 }) : null;
  counters.forEach((el) => io2 ? io2.observe(el) : (el.textContent = (+el.dataset.count).toLocaleString('uk-UA') + (el.dataset.suffix || '')));
}

/* ═════════ MODAL ═════════ */
let bizGoal = null;
function summaryLines(c) {
  if (PAGE === 'partnership') return '';
  if (P()) {
    if (!state.touched || c.reno || c.bigArea) return '';
    if (!c.total) return '';
    const plan = c.plan ? `<div class="ln"><span>${FREQ.find((x) => x.id === state.freq).label}${c.plan.up ? ` · раз на місяць — ${TYPES[c.plan.up].name.toLowerCase()}` : ''}</span><span class="num">≈ ${eur(c.plan.month)} / міс</span></div>` : '';
    return `<div class="sumbox">${c.lines.map((l) => `<div class="ln"><span>${l.name}</span><span class="num">${eur(l.price)}</span></div>`).join('')}
      ${c.gifts.map((l) => `<div class="ln g"><span>${l.name}</span><span class="num">−${eur(-l.price)}</span></div>`).join('')}
      ${c.minApplied ? `<div class="ln"><span>Мінімальне замовлення</span><span class="num">${eur(R().minVisit)}</span></div>` : ''}
      <div class="ln tot"><span>${c.plan ? 'За одне прибирання' : 'Разом'} · ${CITIES[state.city].name}</span><span class="num">${c.range ? rangeTxt(c.range) : (c.approx ? '≈ ' : '') + eur(c.total)}</span></div>${plan}
      <div class="ln sm"><span>${CTRY[country()].incl}${c.approx || c.range ? ' · вікна — орієнтовно' : ''}${state.type === 'moveout' ? ' · передоплата' : ' · оплата після прибирання'}</span></div>${winAccessLine()}</div>`;
  }
  if (!state.touched || c.request || c.winEmpty) return '';
  const b = state.biz, obj = BIZ_OBJ.find((o) => o.id === b.obj).name, sk = c.ctry === 'sk';
  const rows = [];
  if (c.hourly) {
    rows.push([`${obj} · ${BIZ_FREQ.find((x) => x.v === b.freq).label} · ${dec(b.hours)} год за візит`, '']);
    if (c.win) rows.push([`Миття вікон · ${b.winHours} год`, '']);
    rows.push([`<b>${c.oneOff ? 'Орієнтовно за прибирання' : 'Орієнтовно на місяць'}</b>`, `<b>≈ ${eur(c.oneOff ? c.perVisit : c.month)}</b>`]);
  } else if (c.apt) {
    c.rows.forEach((r) => rows.push([`Апартаменти ${r.sqm} м² × ${r.n}`, eur2(r.each * r.n)]));
    if (c.disc) rows.push(['Застосовано обʼємну ставку', '✓']);
    rows.push(['<b>За одне прибирання</b>', `<b>${eur2(c.price)}</b>`]);
  } else if (c.win) {
    rows.push([`Миття вікон · ${winCount()} шт · до ${dur(c.upTo)}`, '']);
    rows.push(['<b>Орієнтовно</b>', `<b>${rangeTxt(c.range)}</b>`]);
  }
  return `<div class="sumbox">${rows.map(([a, v]) => `<div class="ln"><span>${a}</span><span class="num">${v}</span></div>`).join('')}<div class="ln sm"><span>${CITIES[state.city].name} · ${sk ? 'ми не є платниками ПДВ' : 'netto'} · орієнтовний розрахунок, не є комерційною пропозицією</span></div></div>`;
}
function renderModal(done = false) {
  const x = '<button class="x" type="button" data-close aria-label="Закрити">×</button>';
  if (done) {
    $('#modal').innerHTML = `<div class="ok-msg"><div class="big"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="24" cy="24" r="20"/><path d="M15 25l6 6 12-13"/></svg></div><h3 id="mTitle">Дякуємо! Заявку отримано</h3><p class="muted">${isOnline() ? 'Менеджер звʼяжеться з вами протягом 30 хвилин.' : 'Менеджер звʼяжеться з вами в робочий час — з понеділка по пʼятницю, 9:00–18:00.'}</p><button class="cta" type="button" data-close>Добре</button></div>`;
    return;
  }
  if (PAGE === 'partnership') {
    $('#modal').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><h3 id="mTitle">Стати партнером</h3>${x}</div>
      <form id="bookForm"><div class="fld"><label for="fName">Імʼя</label><input id="fName" required autocomplete="name" /></div><div class="fld"><label for="fPhone">Телефон</label><input id="fPhone" required type="tel" autocomplete="tel" /></div>
      <div class="fld"><label for="fFmt">Формат</label><select id="fFmt">${PARTNER.formats.map((f) => `<option>${f}</option>`).join('')}</select></div><button class="cta" type="submit">Надіслати</button></form>`;
    return;
  }
  const c = compute(), sum = summaryLines(c);
  if (P()) {
    $('#modal').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><h3 id="mTitle">${sum ? (isReg() ? 'Регулярне прибирання' : state.type === 'windows' ? 'Підтвердження ціни за фото' : 'Бронювання прибирання') : 'Залишити заявку'}</h3>${x}</div>
      ${sum}
      ${state.wipeBonus ? `<div class="bonus-note">${GIFT_SVG}Welcome −10% на перше прибирання — менеджер врахує при підтвердженні</div>` : ''}
      <form id="bookForm">
        ${sum ? '' : `<div class="fld"><label for="fSvc">Послуга</label><select id="fSvc">${Object.values(TYPES).map((t) => `<option>${t.full}</option>`).join('')}<option>Подарунковий сертифікат</option></select></div>`}
        <div class="fld-2"><div class="fld"><label for="fName">Імʼя</label><input id="fName" required placeholder="Ваше імʼя" autocomplete="name" /></div><div class="fld"><label for="fPhone">Телефон</label><input id="fPhone" required type="tel" placeholder="+43 …" autocomplete="tel" /></div></div>
        <details class="opt-f"><summary>Дата, час і email <span>необовʼязково</span></summary>
          <div class="fld-2"><div class="fld"><label for="fDate">${isReg() ? 'Дата першого прибирання' : 'Дата'}</label><input id="fDate" type="date" /></div><div class="fld"><label for="fEmail">Email</label><input id="fEmail" type="email" placeholder="для інвойсу" autocomplete="email" /></div></div>
          <div class="fld"><label>Зручний час початку</label><div class="slots">${['8:00', '9:00', '10:00', '14:00', '15:00', '16:00'].map((s) => `<button type="button" class="chip" data-slot aria-pressed="false">${s}</button>`).join('')}</div></div>
        </details>
        <p class="form-hint">${!sum ? 'Менеджер передзвонить або напише, щоб узгодити дату й деталі.' : state.type === 'windows' ? 'Менеджер напише вам, ви надішлете фото вікон — і він підтвердить фінальну суму та дату.' : `Це заявка на бронювання: менеджер передзвонить або напише й підтвердить дату та час.${c.welcome ? ' Знижку для нових клієнтів він перевірить під час підтвердження.' : ''}`}</p>
        <button class="cta" type="submit">${sum ? 'Надіслати заявку' : 'Отримати оцінку вартості'}</button>
        <div class="cta-note">Прибирання проводимо щодня · ${state.type === 'moveout' ? 'прибирання при переїзді — за передоплатою' : 'оплата після прибирання'}</div>
      </form>`;
  } else {
    $('#modal').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><h3 id="mTitle">${sum ? 'Отримати пропозицію' : 'Запит для бізнесу'}</h3>${x}</div>
      ${sum}
      <form id="bookForm">
        <div class="fld"><label for="fGoal">Мета звернення</label><select id="fGoal">${['Комерційна пропозиція', 'Огляд обʼєкта', 'Тендер — надішлю ТЗ'].map((g) => `<option ${g === bizGoal ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        <div class="fld-2"><div class="fld"><label for="fCo">Компанія</label><input id="fCo" required placeholder="Назва компанії" autocomplete="organization" /></div><div class="fld"><label for="fName">Контактна особа</label><input id="fName" required placeholder="Імʼя" autocomplete="name" /></div></div>
        <div class="fld"><label for="fPhone">Телефон</label><input id="fPhone" required type="tel" placeholder="+43 …" autocomplete="tel" /></div>
        <details class="opt-f"><summary>Email, адреса й опис обʼєкта <span>необовʼязково</span></summary>
          <div class="fld"><label for="fEmail">Email</label><input id="fEmail" type="email" placeholder="для пропозиції" autocomplete="email" /></div>
          <div class="fld"><label for="fAddr">Адреса обʼєкта</label><input id="fAddr" placeholder="${CITIES[state.city].name}, вулиця, будинок" /></div>
          <div class="fld"><label for="fMsg">Опишіть обʼєкт</label><textarea id="fMsg" placeholder="Площа, графік, особливі вимоги"></textarea></div>
        </details>
        <button class="cta" type="submit">Надіслати запит</button>
        <div class="cta-note">Пропозиція протягом 24 годин · договір і документи для бухгалтерії</div>
      </form>`;
  }
}
function openDrawer(group) {
  track('calc_extras_open', { group: group || 'all' });
  if (CALC_B && P() && isPackage() && $('#calcIn')) {
    state.ui.extras = true; state.drOpen = new Set([group || firstExtra()]); renderCalc();
    setTimeout(() => { const x = $('.xtra'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    return;
  }
  if (group) state.drOpen = new Set([group]);
  renderDrawer();
  $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
  if (group) setTimeout(() => { const g = $(`#drBody [data-g="${group}"]`); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 320);
}
function openModal() { closeMenus(); $('#modal').classList.remove('wide'); renderModal(); $('#modal').classList.add('on'); $('#scrim').classList.add('on'); }
function closeAll() { ['#drawer', '#modal', '#scrim'].forEach((s) => { const el = $(s); if (el) el.classList.remove('on'); }); }
function closeMenus() { const lm = $('#langMenu'), lb = $('#langBtn'); if (lm) lm.classList.remove('on'); if (lb) lb.setAttribute('aria-expanded', 'false'); const m = $('#mega'), n = $('#mnav'); if (m) m.classList.remove('on'); if (n) n.classList.remove('on'); const sb = $('#svcBtn'); if (sb) sb.setAttribute('aria-expanded', 'false'); const bg = $('#burger'); if (bg) bg.setAttribute('aria-expanded', 'false'); }
const toCalc = () => $('#top').scrollIntoView({ behavior: 'smooth' });

/* ═════════ RENDER ═════════ */
function render() {
  const pages = { home: pageHome, list: pageList, service: pageService, object: pageObject, about: pageAbout, promotions: pagePromotions, contacts: pageContacts, partnership: pagePartnership };
  document.getElementById('app').innerHTML = headerHTML() + `<main id="main">${(pages[PAGE] || pageHome)()}</main>` + footerHTML() + overlaysHTML();
  renderCalc(); renderFaq(); renderLive(); updateFab(); applyJsonLd(); wireDynamic(); initWipe();
  const sb = $('#svcBtn');
  sb.addEventListener('mouseenter', () => { clearTimeout(megaTimer); if (!$('#mega').classList.contains('on')) megaOpenedAt = Date.now(); $('#mega').classList.add('on'); sb.setAttribute('aria-expanded', 'true'); });
  $('#hdr').addEventListener('mouseleave', () => { megaTimer = setTimeout(closeMenus, 250); });
  $('#mega').addEventListener('mouseenter', () => clearTimeout(megaTimer));
}
let megaTimer, megaOpenedAt = 0;
function setType(t) {
  state.type = t; state.touched = true; track('calc_type', { type: t });
  if (t === 'windows' || t === 'deep') state.win.sides = 2;
  if (t === 'general' || t === 'moveout') state.win.sides = 1;
  if (!PLAN_UP[t] || !PLAN_UP[t].includes(state.planUp)) state.planUp = null;
  renderCalc();
  if (TIER_RANK[t] != null) refreshCompare();
}
function setSqm(v, fromRange) {
  v = Math.max(15, Math.min(999, Math.round(+v || 15)));
  const wasBig = state.sqm > 300;
  state.sqm = fromRange && v >= 301 ? 301 : v; state.touched = true;
  const rng = $('#sqmRange');
  if (rng) { rng.value = Math.min(state.sqm, 301); rng.style.setProperty('--p', ((Math.min(state.sqm, 301) - 15) / 286 * 100) + '%'); }
  if (fromRange && $('#sqmInput')) $('#sqmInput').value = state.sqm > 300 ? 300 : state.sqm;
  if ($('#tierHint')) $('#tierHint').textContent = state.sqm <= 300 ? 'тариф ' + TIER_LABELS[tierOf(state.sqm)] + ' м²' : '';
  if (wasBig !== state.sqm > 300) renderCalc(); else paintOut();
}
function applyPreset(p) {
  if (!p) return;
  if (P()) {
    if (p.type) { state.type = p.type; if (p.type === 'windows' || p.type === 'deep') state.win.sides = 2; if (p.type === 'general' || p.type === 'moveout') state.win.sides = 1; }
  } else {
    const { obj, ...rest } = p; if (obj) state.biz.obj = obj; Object.assign(state.biz, rest);
    if (obj === 'windows') state.win.sides = 2;
  }
}
// Every object in the calculator has its own page: choosing one opens it, with the schedule already set
function objTarget(obj) {
  if (obj === 'windows') return PAGE === 'service' && SVC_ID === 'windows' ? null : svcHref('windows', 'business');
  const id = OBJ_PAGE[obj];
  if (!id || (PAGE === 'object' && PAGE_OBJ.calc.obj === obj) || (obj === 'apartments' && PAGE === 'service' && SVC_ID === 'airbnb')) return null;
  const b = state.biz, keep = state.touched && obj !== 'apartments' ? `?bf=${b.freq}&bh=${b.hours}&bc=${b.cleaners}` : '';
  return objHref(id) + keep;
}
function applyParams() {
  if (params.get('mode') && GLOBAL_PAGE) { state.mode = params.get('mode') === 'business' ? 'business' : 'private'; store.set('sg-mode', state.mode); }
  if (params.get('type') && P() && TYPES[params.get('type')]) applyPreset({ type: params.get('type') });
  if (params.get('freq') && FREQ.some((x) => x.id === params.get('freq'))) { state.freq = params.get('freq'); if (!isRegType()) state.type = 'basic'; }
  const promo = params.get('promo');
  if (promo === 'volume' && !P()) { Object.assign(state.biz, { obj: 'office', freq: 5, hours: 5, cleaners: 1 }); state.touched = true; }
  if (promo === 'apt' && !P()) { state.biz.obj = 'apartments'; state.apt.rows = [{ sqm: 45, n: 5 }]; state.touched = true; }
  const obj = params.get('obj');
  if (obj && !P() && BIZ_OBJ.some((o) => o.id === obj)) { state.biz.obj = obj; if (params.get('haccp')) state.biz.haccp = true; }
  const bf = params.get('bf'), bh = params.get('bh'), bc = params.get('bc');
  if (!P() && bf != null && BIZ_FREQ.some((x) => String(x.v) === bf)) state.biz.freq = +bf;
  if (!P() && bh) state.biz.hours = Math.min(10, Math.max(1, +bh || 3));
  if (!P() && bc) state.biz.cleaners = Math.min(6, Math.max(1, Math.round(+bc) || 1));
  if (params.toString()) state.touched = true;
}

/* ═════════ EVENTS ═════════ */
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!calcStarted && t.closest && t.closest('#calc')) { calcStarted = true; track('calc_start'); }
  if (t.id === 'sqmRange') setSqm(t.value, true);
  else if (t.id === 'sqmInput' && t.value.length >= 2) setSqm(t.value, false);
  else if (t.id === 'bizHours') {
    state.biz.hours = +t.value; state.touched = true;
    t.style.setProperty('--p', ((state.biz.hours - 1) / 9 * 100) + '%');
    $('#bizHoursVal').textContent = dec(state.biz.hours) + ' год'; paintOut();
  } else if (t.id === 'aptRange') {
    state.apt.sqm = +t.value; state.touched = true;
    t.style.setProperty('--p', ((state.apt.sqm - 15) / 176 * 100) + '%');
    $('#aptVal').textContent = (state.apt.sqm > 190 ? '190+' : state.apt.sqm) + ' м²';
    const i = APT.tiers.findIndex((m) => state.apt.sqm <= m);
    $('#aptHint').textContent = i >= 0 ? 'тариф ' + APT.labels[i] + ' м²' : ''; paintOut();
  } else if (t.id === 'carpetRange') {
    state.carpet = +t.value; state.touched = true;
    t.style.setProperty('--p', (state.carpet / 40 * 100) + '%');
    const r = R(), rate = state.carpet <= 10 ? r.carpet[0] : state.carpet <= 15 ? r.carpet[1] : r.carpet[2];
    $('#carpetLbl').textContent = state.carpet ? `${state.carpet} м² · ${eur(state.carpet * rate)}` : 'не потрібно';
    paintOut();
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!calcStarted && t.closest && t.closest('#calc')) { calcStarted = true; track('calc_start'); }
  if (t.matches('[data-city]')) {
    store.set('sg-city', t.value);
    const href = cityHref(t.value);
    if (href) { location.href = href; return; }
    state.city = t.value; lastNum = null; render();
  } else if (t.id === 'sqmInput') { setSqm(t.value, false); renderCalc(); track('calc_area', { sqm: state.sqm }); }
  else if (t.id === 'sqmRange') track('calc_area', { sqm: state.sqm });
  else if (t.classList.contains('apt-sqm')) { state.apt.rows[+t.dataset.row].sqm = Math.max(15, Math.min(400, Math.round(+t.value || 15))); state.touched = true; renderCalc(); }
  else if (t.id === 'bizFreq') { state.biz.freq = +t.value; state.touched = true; renderCalc(); track('calc_freq', { freq: state.biz.freq }); }
  else if (t.id === 'carpetRange') { if ($('#drawer').classList.contains('on')) renderDrawer(); else renderCalc(); }
  else if (t.id === 'bizHours' || t.id === 'aptRange') renderCalc();
});
document.addEventListener('toggle', (e) => { const g = e.target.dataset && e.target.dataset.g; if (g) e.target.open ? state.drOpen.add(g) : state.drOpen.delete(g); }, true);
document.addEventListener('submit', (e) => { if (e.target.id === 'bookForm' || e.target.id === 'partnerForm') { e.preventDefault(); track(e.target.id === 'partnerForm' ? 'partner_submit' : 'booking_submit', { type: P() ? state.type : state.biz.obj, price: headline(compute()) || '' }); if (e.target.id === 'partnerForm') { $('#modal').classList.add('on'); $('#scrim').classList.add('on'); } renderModal(true); } });

document.addEventListener('click', (e) => {
  if (!calcStarted && e.target.closest && e.target.closest('#calc')) { calcStarted = true; track('calc_start'); }
  if (e.target.id === 'scrim') return closeAll();
  if (!e.target.closest('#mega, #svcBtn, #mnav, #burger, #langMenu, #langBtn')) closeMenus();
  const b = e.target.closest('button, a[data-mode], a[data-inc]');
  if (!b) return;
  const d = b.dataset;
  if (d.mode) { if (GLOBAL_PAGE) { e.preventDefault(); state.mode = d.mode; store.set('sg-mode', d.mode); lastNum = null; state.faqCat = 0; render(); } return; }
  if ('inc' in d) { const href = b.getAttribute('href'); if (href.startsWith('#') && !href.startsWith('#/')) { e.preventDefault(); const tgt = document.getElementById(href.slice(1)); if (tgt) tgt.scrollIntoView({ behavior: 'smooth' }); } return; }
  if (b.id === 'svcBtn') { const isOn = $('#mega').classList.contains('on'); const on = !isOn || Date.now() - megaOpenedAt < 500; $('#mega').classList.toggle('on', on); b.setAttribute('aria-expanded', on); if (on && !isOn) megaOpenedAt = Date.now(); return; }
  if (b.id === 'langBtn') { const on = !$('#langMenu').classList.contains('on'); $('#langMenu').classList.toggle('on', on); b.setAttribute('aria-expanded', on); return; }
  if (b.id === 'burger') { const on = !$('#mnav').classList.contains('on'); $('#mnav').classList.toggle('on', on); b.setAttribute('aria-expanded', on); return; }
  if ('close' in d) return closeAll();
  if (d.wipe) { if (d.wipe === 'auto') wipeAuto(); else wipeReset(); return; }
  if ('objmore' in d) { const g = $('#objMore'); g.hidden = !g.hidden; b.setAttribute('aria-expanded', !g.hidden); return; }
  if ('aptadd' in d) { state.apt.rows.push({ sqm: 70, n: 1 }); state.touched = true; renderCalc(); return; }
  if (d.aptdel) { state.apt.rows.splice(+d.aptdel, 1); state.touched = true; renderCalc(); return; }
  if (d.galnav) { const tr = b.closest('[data-gal]').querySelector('.tg-track'); tr.scrollBy({ left: +d.galnav * tr.clientWidth, behavior: 'smooth' }); return; }
  if (d.move) { state.move = d.move; state.touched = true; track('calc_move', { move: d.move }); renderCalc(); syncMove(); if (b.closest('#scenario')) toCalc(); return; }
  if (d.wstep) { state.winStep = +d.wstep; renderCalc(); return; }
  if (d.cstep) { state.chemStep = +d.cstep; renderCalc(); return; }
  if (d.chemcat) { const c = d.chemcat; state.chemCats.has(c) ? state.chemCats.delete(c) : state.chemCats.add(c); state.touched = true; renderCalc(); return; }
  if ('faqall' in d) { state.faqAll = true; renderFaq(); return; }
  if ('ftcol' in d) { const col = b.closest('.ft-col'), on = !col.classList.contains('open'); col.classList.toggle('open', on); b.setAttribute('aria-expanded', on); return; }
  if (d.ui) {
    if (d.ui === 'reg') { state.touched = true; state.planUp = null; state.freq = isReg() ? 'once' : 'weekly'; track('calc_freq', { freq: state.freq }); }
    else state.ui[d.ui] = !state.ui[d.ui];
    if (d.ui === 'welcome') state.touched = true;
    if (d.ui === 'extras' && state.drOpen.has('kitchen') && firstExtra() !== 'kitchen') state.drOpen = new Set([firstExtra()]); // no kitchen group where all of it is in the package
    renderCalc(); return;
  }
  if (d.open === 'drawer') return openDrawer(state.type === 'chem' ? 'uph' : null);
  if (d.open === 'book') { if (b.id === 'ctaMain') state.touched = true; /* the price was on screen — book exactly that */ track(b.id === 'ctaMain' ? 'calc_cta' : b.id === 'fab' ? 'fab_click' : 'book_click', { type: P() ? state.type : state.biz.obj, price: headline(compute()) || '' }); bizGoal = d.bizgoal || null; if (d.bizgoal && P()) { state.mode = 'business'; } return openModal(); }
  if (d.addto) { // a work that is not in the package: choose that package and open its group of extras in the calculator
    const [k, g] = d.addto.split(':'); closeAll(); if (state.type !== k) setType(k); state.touched = true;
    if (g === 'win' && !winCount() && k === 'basic') state.win.sides = 1;
    return openDrawer(g);
  }
  if (d.cklist) { openChecklist(d.cklist); return; }
  if (d.pick) { closeAll(); setType(d.pick); toCalc(); return; }
  if (d.faqcat != null) { state.faqCat = +d.faqcat; renderFaq(); return; }
  if (d.promo) {
    if (d.promo === 'regular') {
      if (!P() || !$('#calcIn')) { location.href = svcHref('basic', 'private') + '?freq=weekly'; return; }
      if (!isRegType()) state.type = 'basic'; state.freq = 'weekly'; state.touched = true; renderCalc(); toCalc();
    } else if (d.promo === 'volume' || d.promo === 'apt') {
      if (P() || !$('#calcIn')) { location.href = homeHref('business') + '?promo=' + d.promo; return; }
      if (d.promo === 'apt' && !(PAGE === 'service' && SVC_ID === 'airbnb')) { location.href = svcHref('airbnb', 'business') + '?promo=apt'; return; }
      if (d.promo === 'volume') Object.assign(state.biz, { obj: 'office', freq: 5, hours: 5, cleaners: 1 }); else { state.biz.obj = 'apartments'; state.apt.rows = [{ sqm: 45, n: 5 }]; }
      state.touched = true; renderCalc(); toCalc();
    } else if (d.promo === 'welcome') { state.ui.welcome = true; state.touched = true; renderCalc(); toCalc(); }
    else openModal();
    return;
  }
  if (d.rev) { revHover = true; setTimeout(() => (revHover = false), 6000); return revGo(revIdx + +d.rev); }
  if (d.dot) { revHover = true; setTimeout(() => (revHover = false), 6000); return revGo(+d.dot); }
  if ('more' in d) { const txt = b.previousElementSibling; txt.classList.toggle('full'); b.textContent = txt.classList.contains('full') ? 'Згорнути' : 'Читати повністю'; return; }
  if ('slot' in d) { b.parentElement.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
  if (d.add) {
    const map = { win: 'win', win_out: 'win', kitchen: 'kitchen', hourly: 'hourly', uph: 'uph', mat: 'mat', rugs: 'rugs' };
    if (d.add === 'win_out') state.win.sides = 2;
    if (d.add === 'win' && !winCount() && state.type === 'basic') state.win.sides = 1;
    return openDrawer(map[d.add]);
  }
  // calculator + drawer controls
  const b0 = state.biz;
  if (d.type) return setType(d.type);
  if (d.obj) { const to = objTarget(d.obj); if (to) { track('calc_type', { type: d.obj }); location.href = to; return; } }
  state.touched = true;
  if (d.freq) { track('calc_freq', { freq: d.freq }); state.freq = d.freq; if (d.freq === 'once' || d.freq === 'monthly') state.planUp = null; renderCalc(); return; }
  if (d.planup) { state.planUp = d.planup; renderCalc(); return; }
  if (d.obj) { track('calc_type', { type: d.obj }); b0.obj = d.obj; if (d.obj === 'windows') state.win.sides = 2; renderCalc(); return; }
  if (d.bfreq != null) { b0.freq = +d.bfreq; renderCalc(); return; }
  if (d.aptcount) { state.apt.count = d.aptcount; renderCalc(); return; }
  if (d.chk) {
    const [k, id] = d.chk.split(':');
    if (k === 'b') b0[id] = !b0[id];
    else if (k === 'a') state.apt[id] = !state.apt[id];
    else if (k === 'plan') state.planUp = state.planUp ? null : PLAN_UP[state.type][0];
    else if (k === 'mboth') state.mattBoth = !state.mattBoth;
    else if (id === 'high') state.win.high = !state.win.high;
    else if (id === 'blinds') state.win.blinds = state.win.blinds ? 0 : Math.max(1, winSashes());
    else if (id === 'nets') state.win.nets = state.win.nets ? 0 : Math.max(1, winSashes());
  } else if (d.flat) { state.flat.has(d.flat) ? state.flat.delete(d.flat) : state.flat.add(d.flat); }
  else if (d.step) {
    const [k, id] = d.step.split(':'), delta = +d.d;
    if (k === 'h') state.hours[id] = Math.max(0, (state.hours[id] || 0) + delta);
    else if (k === 'u') state.uph[id] = Math.max(0, (state.uph[id] || 0) + delta);
    else if (k === 'm') state.matt[id] = Math.max(0, (state.matt[id] || 0) + delta);
    else if (k === 'w') state.win[id] = Math.max(0, state.win[id] + delta);
    else if (k === 'b') b0[id] = Math.max(id === 'cleaners' ? 1 : 0, b0[id] + delta);
    else if (k === 'rugs') state.rugs = Math.max(0, state.rugs + delta);
    else if (k === 'ar') state.apt.rows[+id].n = Math.max(1, state.apt.rows[+id].n + delta);
  } else if (d.wopt) { if (d.wopt === 'sides') state.win.sides = +d.v; else if (d.wopt === 'access') state.win.access = state.win.access === d.v ? '' : d.v; else state.win.dirt = d.v; }
  else return;
  if ($('#drawer').classList.contains('on')) renderDrawer();
  renderCalc();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAll(); closeMenus(); } });

/* ═════════ INIT ═════════ */
applyPreset((PAGE_SVC || PAGE_OBJ || {}).calc);
applyParams();
render();
const ANCHOR = SINGLE ? ROUTE.anchor : location.hash.slice(1);
const toAnchor = () => { const t = ANCHOR && document.getElementById(ANCHOR); if (t) t.scrollIntoView(); };
if (ANCHOR) { setTimeout(toAnchor, 50); window.addEventListener('load', toAnchor); }
if (SINGLE) {
  const seo = SINGLE.seo[(cityHref(state.city) || pageHref(PAGE)).slice(1)];
  if (seo) { document.title = seo[0]; const md = $('meta[name="description"]'); if (md) md.content = seo[1]; }
}
setInterval(() => { if ($('#revTrack') && !revHover && !document.hidden) revGo(revIdx + 1); }, 5000);
window.addEventListener('resize', () => revCenter());
setInterval(renderLive, 60000);
