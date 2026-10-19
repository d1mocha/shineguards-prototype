/* ════════════════════════════════════════════════════════════════════
   Shine Guards — the managers' calculator, /ua/manager/ (not linked from the site, noindex).
   Owner, 2026-10-19: «калькулятор, который будут использовать ДМ, чтобы считать стоимость для клиента» → «делай».
   It counts with the site's own data and functions (data.js, site.js), so a manager and a client always see the same
   price, and adds what a manager needs: the team and the time behind a price, a discount or a surcharge, another
   hourly rate, one sum instead of a range, and a ready message for the client in the client's language (the texts of
   the site come from its own dictionaries).
   Round 43 (owner, 2026-10-20): a plain hourly calculator of its own; «после ремонта» apart and counted as an estimate,
   like the windows, while the packages are fixed prices; the team as «N клінерів · X год Y хв» at the top; dry cleaning
   shows every item at once; the groups of extras start closed.
   Loaded before site.js and only defines things: site.js calls dmRender / dmRenderCalc / dmPaintOut on this page.
   ════════════════════════════════════════════════════════════════════ */

// the services of each side: [id, label]; a business id with a calculator is an OBJECTS / BIZ_SOLO id
const DM_SVC = {
  private: [['basic', 'Базове'], ['general', 'Генеральне'], ['deep', 'Глибоке'], ['moveout', 'Переїзд'], ['windows', 'Вікна'], ['chem', 'Хімчистка'], ['extras', 'Окремі послуги'], ['reno', 'Після ремонту'], ['hourly', 'Погодинно']],
  business: [['offices', 'Офіс'], ['shops', 'Магазин'], ['restaurants', 'Ресторан'], ['kitchens', 'Профкухня'], ['gyms', 'Спортзал'], ['cars', 'Автосалон'], ['hotels', 'Апартаменти'], ['windows', 'Вікна й вітрини'], ['reno', 'Після ремонту'], ['hourly', 'Погодинно']],
};
// counted here by the hour: cleaners × time × rate; after a renovation that is an estimate (the client pays the time worked)
const DM_HR = ['reno', 'hourly'];
// € netto per cleaner-hour of a business job after a renovation or before an opening: the business glass rate
const DM_BIZ_ONCE = 30;
// the usual rate: home — the site's (after a renovation 36 / 21,50 €, hourly cleaning 32,50 / 18 €); business netto —
// 27 €, after a renovation 30 €; Bratislava business 21 € (no online rate on the site there)
const dmHrRate = () => (DM.side === 'private' ? (DM.svc === 'reno' ? R().windowHour : R().hourly) : country() === 'sk' ? 21 : DM.svc === 'reno' ? DM_BIZ_ONCE : BIZ.rate);
const DM = {
  side: 'private', svc: 'basic', last: { private: 'basic', business: 'offices' }, started: false,
  adj: 0, rate: '', pick: 'range', lang: 'ua',
  hr: { cleaners: 2, mins: 180, freq: 0, rate: '' }, // freq: visits a week of a business hourly job, 0 — once
};
const DM_FREQ = [[0, 'Разово'], [1, '1×'], [2, '2×'], [3, '3×'], [5, '5×'], [6, '6×'], [7, 'Щодня']];
const DM_ADJ = [[-10, '−10%'], [-5, '−5%'], [0, 'Без змін'], [10, '+10%'], [20, '+20% терміново'], [30, '+30% ніч']];
const DM_PICK = [['range', 'Діапазон'], ['lo', 'Нижня межа'], ['mid', 'Середина'], ['hi', 'Верхня межа']];
const DM_LANGS = [['ua', 'UA'], ['ru', 'RU'], ['en', 'EN'], ['de', 'DE']];
const DM_UNIT = { vat: 'з ПДВ', net: 'netto', none: 'фінальна ціна' };
const DM_PER = { month: '/ міс', clean: 'за прибирання', job: '' };
const DM_DICT = {}; // the site's dictionaries of the client's languages (assets/i18n/{lang}.js), loaded on first use
const DM_TEAM_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.3c2.4.2 4 1.9 4.5 4.7"/></svg>';
// minutes in words: 270 → «4 год 30 хв»
const dmHM = (m) => { m = Math.round(m); const h = Math.floor(m / 60), mm = m % 60; return h && mm ? `${h} год ${mm} хв` : h ? `${h} год` : `${mm} хв`; };
const dmCl = (n) => `${n} ${pl(n, 'клінер|клінери|клінерів')}`;
const r5 = (m) => Math.max(5, Math.round(m / 5) * 5); // time to 5 minutes

/* ═════════ PAGE ═════════ */
function dmRender() {
  document.documentElement.classList.add('dm-page');
  if (!DM.started) {
    const l = store.get('sg-dm-lang'); if (DM_LANGS.some(([k]) => k === l)) DM.lang = l;
    state.drOpen = new Set(); // the groups of extras open only when the manager opens them
  }
  $('#app').innerHTML = `<div class="dm" id="top">
    <header class="dm-top"><a class="dm-logo" href="${homeHref('private')}"><img src="${LOGO}" alt="Shine Guards" width="71" height="40" /></a>
      <div class="dm-title"><h1>Калькулятор менеджера</h1><small>Ціни й розрахунок — ті самі, що на сайті. Внутрішня сторінка, не для клієнтів.</small></div>
      <label class="dm-city"><span>Місто</span><select data-city aria-label="Місто">${cityOptions()}</select></label>
      <div class="dm-side" role="group" aria-label="Клієнт">${['private', 'business'].map((s) => `<button type="button" data-dmside="${s}" aria-pressed="${DM.side === s}">${s === 'private' ? `${ICON_HOME}Для дому` : `${ICON_BIZ}Для бізнесу`}</button>`).join('')}</div></header>
    <nav class="dm-svcs" id="dmSvcs" aria-label="Послуга"></nav>
    <div class="dm-grid"><section class="calc v2 dm-calc" id="calc" aria-label="Розрахунок"></section><aside class="dm-panel" id="dmPanel"></aside></div></div>${overlaysHTML()}`;
  // the first draw sets the calculator up for the service; a new city keeps everything chosen
  if (DM.started) dmRenderCalc(); else { DM.started = true; dmSelect(DM.svc); }
}
function dmSelect(id) {
  DM.svc = id; DM.last[DM.side] = id; DM.rate = ''; DM.pick = 'range'; DM.hr.rate = '';
  state.mode = DM.side; state.touched = true;
  // every service starts a new count: windows or items chosen in another service never ride along (owner, 2026-10-20: a
  // basic cleaning showed «≈» — the windows counted a moment before had come with it as an extra)
  clearChoice('all'); state.ui.welcome = false; state.freq = 'once'; state.planUp = null;
  SOLO_ID = null; SOLO_B = null;
  if (DM.side === 'private') {
    if (!DM_HR.includes(id)) { // as the site's setType
      state.type = id; state.winStep = 1;
      if (id === 'windows' || winsIncl(id) === 'both') state.win.sides = 2; else if (winsIncl(id) === 'in') state.win.sides = 1;
      if (!(PLAN_UP[id] || []).includes(state.planUp)) state.planUp = null;
    }
  } else if (BIZ_SOLO[id]) { // an object calculator of the site, set up as on its page
    SOLO_ID = id; SOLO_B = BIZ_SOLO[id]; state.bs = soloState(SOLO_B);
    const c = OBJECTS[id].calc; state.biz.obj = c.obj; state.biz.freq = c.freq || 3; state.biz.haccp = !!c.haccp;
  } else if (id === 'hotels') state.biz.obj = 'apartments';
  else if (id === 'windows') { state.biz.obj = 'windows'; state.win.sides = 2; state.winStep = 1; }
  else state.biz.obj = 'office';
  dmRenderCalc();
}
function dmRenderCalc() {
  const box = $('#calc'); if (!box) return;
  $('#dmSvcs').innerHTML = DM_SVC[DM.side].map(([id, l]) => `<button type="button" class="chip" data-dmsvc="${id}" aria-pressed="${DM.svc === id}">${l}</button>`).join('');
  $$('[data-dmside]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dmside === DM.side)));
  box.classList.toggle('solo', !DM_HR.includes(DM.svc) && (!!bizSolo() || hospPage()));
  box.innerHTML = `<div id="calcIn">${dmInputsHTML()}</div><div id="calcOut">${dmOutHTML()}</div>`;
  dmRenderPanel();
}
function dmPaintOut() { const o = $('#calcOut'); if (o) o.innerHTML = dmOutHTML(); dmRenderPanel(); }
// the site's own questions and price box for every service; the hourly jobs have their own
function dmInputsHTML() {
  if (DM_HR.includes(DM.svc)) return dmHourlyInputs();
  if (P()) {
    if (state.type !== 'chem') return privInputsB();
    // dry cleaning: every kind of item at once (owner: «чтобы не выбирать, что будем химчистить») — no first step
    state.chemCats = new Set(CHEM_CATS.map((c) => c.id)); state.chemStep = 2;
    return `<div class="dm-chem">${privInputsB()}</div>`;
  }
  if (bizSolo()) return bizSoloInputs();
  if (hospPage()) return hospInputs();
  return windowsWizard();
}
const dmOutHTML = () => (DM_HR.includes(DM.svc) ? dmHourlyOut() : P() ? privOutB() : bizOutB());

/* ═════════ BY THE HOUR: cleaners × time × rate, never below the minimum order ═════════ */
function dmHr() {
  const h = DM.hr, biz = DM.side === 'business', sk = country() === 'sk', approx = DM.svc === 'reno';
  const site = dmHrRate(), rate = +h.rate > 0 ? +h.rate : site, perWeek = biz && DM.svc === 'hourly' ? h.freq : 0;
  // the site's minimums: a home order 108 € (Bratislava 70 €); business by visits a week, one-off 90 € (Bratislava 70 €)
  const min = biz ? (sk ? 70 : bizMin(perWeek)) : R().minVisit;
  const work = h.cleaners * h.mins / 60 * rate, visit = Math.max(min, work), visits = perWeek ? perWeek * BIZ.weeks : 1;
  return { rate, site, perWeek, min, work, visit, visits, total: visit * visits, monthly: perWeek > 0, minApplied: work < min, biz, sk, approx };
}
const dmStepper = (key, text, dn, up) => `<span class="stepper"><button type="button" data-dmstep="${key}:-1" ${dn ? '' : 'disabled'} aria-label="Менше">−</button><output>${text}</output><button type="button" data-dmstep="${key}:1" ${up ? '' : 'disabled'} aria-label="Більше">+</button></span>`;
function dmHourlyInputs() {
  const h = DM.hr, x = dmHr(); let n = 0;
  return qLabel(++n, 'Команда й час') + `<div class="bs-counts dm-hr"><div class="cl"><span>Клінерів</span>${dmStepper('cleaners', h.cleaners, h.cleaners > 1, h.cleaners < 20)}</div><div class="cl"><span>Час кожного клінера</span>${dmStepper('mins', dmHM(h.mins), h.mins > 30, h.mins < 1440)}</div></div>`
    + `<p class="bs-hint">Разом ${dmHM(h.cleaners * h.mins)} роботи${x.approx ? ' — це оцінка: клієнт платить за фактично відпрацьований час' : ''}</p>`
    + (x.biz && DM.svc === 'hourly' ? qLabel(++n, 'Як часто (разів на тиждень)') + `<div class="freqs">${DM_FREQ.map(([v, l]) => `<button type="button" class="chip" data-dmfreq="${v}" aria-pressed="${h.freq === v}">${l}</button>`).join('')}</div>` : '')
    + qLabel(++n, 'Ставка за годину одного клінера', `<label class="area-big"><input id="dmHrRate" type="number" inputmode="decimal" min="1" step="0.5" value="${+h.rate > 0 ? h.rate : x.site}" aria-label="Ставка, € за годину" /><span>€</span></label>`)
    + `<p class="bs-hint">${x.sk ? 'Фінальна ціна' : x.biz ? 'Ставка netto, без ПДВ' : 'Ціна з ПДВ'} · звичайна ставка ${dec(x.site)} € / год · мінімальне замовлення ${eur(x.min)}</p>`;
}
function dmHourlyOut() {
  const x = dmHr(), h = DM.hr;
  return `<div class="price-box"><div class="p-label">${x.monthly ? 'Орієнтовно на місяць' : x.approx ? 'Орієнтовна вартість' : 'Вартість роботи'}</div>
    <div class="p-row"><div class="p-value num">${x.approx || x.monthly ? `≈ ${eur(x.total)}` : eur2(x.total)}${x.monthly ? '<span class="per"> / міс</span>' : ''}</div></div>
    <div class="p-sub">${dmCl(h.cleaners)} × ${dmHM(h.mins)} × ${dec(x.rate)} € = ${eur2(x.work)}${x.minApplied ? ` · діє мінімум ${eur(x.min)}` : ''}${x.monthly ? ` · за візит ${eur2(x.visit)}, у середньому ${dec(f1(x.visits))} візиту на місяць` : ''}</div></div>`;
}
// a team for a number of cleaner-minutes: at most `cap` minutes for each cleaner
const dmTeamFor = (mins, cap) => Math.max(1, Math.ceil(mins / cap - 1e-9));

/* ═════════ ONE SHAPE FOR EVERY SERVICE ═════════
   q = { title, kind, note, crew: { c, from, to?, approx?, per?, note? } (minutes of each cleaner), facts: [[name, value]],
         lines: [[name, sum | null]], price: [lo, hi] | null, approx, per: 'month' | 'clean' | 'job', unit: 'vat' | 'net' | 'none',
         cents, rate: { now, fn(rate) → [lo, hi] } | null, msg(lang) → lines of the message, terms: [keys of DM_T], min }
   — the panel shows it, the client's message is written from it. A package is a fixed price; windows, after a
   renovation and the business estimates are approximate (≈). */
function dmQuote() {
  const sk = country() === 'sk', side = DM.side, unit = sk ? 'none' : side === 'private' ? 'vat' : 'net';
  const none = (title, note) => ({ title, note, facts: [], lines: [], price: null, unit });
  if (DM_HR.includes(DM.svc)) {
    const x = dmHr(), h = DM.hr, crew = { c: h.cleaners, from: h.mins, approx: x.approx };
    return { title: x.approx ? 'Прибирання після ремонту' : 'Погодинне прибирання', kind: x.approx ? 'reno' : x.monthly ? 'bizRegular' : 'hourly', unit, crew,
      per: x.monthly ? 'month' : 'job', price: [x.total, x.total], approx: x.approx || x.monthly, cents: !x.approx && !x.monthly, rate: null, min: x.min,
      facts: [['Ставка', `${dec(x.rate)} € / год`], ...(x.monthly ? [['За візит', eur2(x.visit)], ['Візитів на місяць', `≈ ${dec(f1(x.visits))}`]] : []), ['Мінімум', eur(x.min)]],
      lines: [], msg: (L) => [dmTeam(L, crew), ...(x.monthly ? [dmT(L, 'sched', DM_TIMES[L](x.perWeek))] : [])],
      terms: side === 'private' ? ['incl', 'hourly', 'min'] : x.approx ? ['incl', 'hourly', 'contract'] : ['incl', 'contract'] };
  }
  const c = compute();
  if (P()) {
    const t = state.type, r = R();
    if (c.bigArea) return none(TYPES[t].full, 'Понад 300 м² — рахуємо індивідуально: порахуйте у «Погодинно» або після огляду.');
    const lines = c.lines.slice(isPackage() ? 1 : 0).map((l) => [l.name, l.price]).concat(c.gifts.map((g) => [g.name, g.price]));
    if (isPackage()) { // a fixed price and a fixed team: the time is the norm of the area, not an estimate
      const crew = { c: c.cleaners, from: Math.round(c.hours * 60) }, facts = [['Площа', `${state.sqm} м²`]];
      if (t === 'moveout') facts.push(['Квартира', state.moveEmpty ? 'без меблів — ціна як у генерального' : 'з меблями — ціна як у глибокого']);
      if (c.plan) facts.push(['Графік', `${FREQ.find((f) => f.id === state.freq).label} · ≈ ${eur(c.plan.month)} / міс`]);
      if (c.minFloor) facts.push(['Мінімальна ціна', eur(c.minFloor)]);
      return { title: TYPES[t].full, kind: t, crew, facts, lines, price: [c.exact, c.exact], approx: false, per: c.plan ? 'clean' : 'job', unit, cents: isReg() || !!c.welcome, rate: null,
        msg: (L) => [dmT(L, 'area', state.sqm), ...(t === 'moveout' ? [dmT(L, state.moveEmpty ? 'empty' : 'furn')] : []), ...lines.map(([n, p]) => `${dmLine(L, n)}${p < 0 ? ` (−${dmMoney(L, -p, true)})` : ''}`),
          dmTeam(L, crew), ...(c.plan ? [dmT(L, 'regular', dmT(L, 'freq_' + state.freq))] : [])],
        terms: t === 'moveout' ? ['incl', 'prepay'] : ['incl', 'pay'] };
    }
    if (t === 'windows') { // an estimate: the time of the windows to a quarter of an hour, the price confirmed by photos
      const w = c.win, wn = state.win, n = winCount() - winPhotoCount();
      if (!w) return none(TYPES.windows.full, winPhotoCount() ? 'Обрано лише «інший тип» вікна — його ціну називаємо за фото.' : 'Додайте хоча б одне вікно.');
      const minutes = w.upTo - 15, min = r.minVisit, cl = dmTeamFor(minutes + 15, 360), crew = { c: cl, from: r5(minutes / cl), to: r5((minutes + 15) / cl), approx: true };
      return { title: TYPES.windows.full, kind: 'windows', crew, unit, per: 'job', price: c.range, approx: true, cents: false, min,
        facts: [['Вікон', `${n} шт · ${wn.sides === 2 ? 'з обох боків' : 'зсередини'}`], ['Ставка', `${dec(r.windowHour)} € / год`], ['Мінімум', eur(min)]],
        lines: [], note: winPhotoCount() ? `Ще ${winPhotoCount()} шт «інший тип» — їх ціна лише за фото, у суму не входять.` : '',
        rate: { now: r.windowHour, fn: (rate) => [Math.max(min, minutes / 60 * rate), Math.max(min, (minutes + 15) / 60 * rate)] },
        msg: (L) => [dmT(L, 'windows', n, dmT(L, wn.sides === 2 ? 'both' : 'inside')), ...(wn.nets ? [`${dmD(L, 'Москітні сітки')} × ${wn.nets}`] : []), ...(wn.blinds ? [`${dmD(L, 'Жалюзі')} × ${wn.blinds}`] : []), dmTeam(L, crew)],
        terms: ['incl', 'photo', 'pay'] };
    }
    // dry cleaning, separate services: a list of items at fixed prices, the order minimum
    if (!c.lines.length) return none(TYPES[t].full, t === 'chem' ? 'Додайте, що почистити.' : 'Оберіть послуги.');
    return { title: TYPES[t].full, kind: t, unit, per: 'job', price: [c.exact, c.exact], approx: false, cents: true, rate: null, min: r.minVisit,
      facts: c.minApplied ? [['Обрано на', eur2(c.picked)], ['Мінімальне замовлення', eur(r.minVisit)]] : [], lines,
      msg: (L) => lines.map(([n]) => dmLine(L, n)), terms: c.minApplied ? ['incl', 'pay', 'min'] : ['incl', 'pay'] };
  }
  // business
  if (c.request) return none(dmBizTitle(), { 'sk-hourly': 'Братислава: на сайті тут ставка за запитом — порахуйте у «Погодинно».', big: 'Великий обсяг: на сайті — індивідуально. Порахуйте у «Погодинно» або після огляду.', hotel: 'Готель: на сайті — індивідуально.', 'apt-big': 'Апартаменти понад 190 м² — індивідуально.' }[c.request] || 'Індивідуально.');
  if (c.winEmpty) return none('Миття вікон для бізнесу', 'Вкажіть скло та його кількість.');
  if (c.solo) {
    const rows = soloAnswers(c), floor = Math.round(c.min * c.visits), all = r5(c.hours * 60), cl = dmTeamFor(all, 240);
    // the site's own rule (computeBizSolo): a visit is the base work never below the minimum + the work on top of it
    const fn = (rate) => BIZ_SOLO_RANGE.map((f) => { const p = Math.max(c.min, c.coreH * rate * f) + c.overH * rate * f; return p <= c.min ? floor : Math.max(floor, Math.round(p * c.visits / 10) * 10); });
    return { title: SOLO_B.name, kind: c.oneOff ? 'bizOnce' : 'bizRegular', unit, per: c.oneOff ? 'clean' : 'month', price: c.range, approx: true, cents: false,
      crew: { c: cl, from: r5(all / cl), approx: true, per: 'visit', note: `${dmHM(all)} роботи за візит; до 4 год на клінера — склад команди визначаєте ви` },
      facts: [['Обʼєкт', rows[0]], ...(c.oneOff ? [] : [['Візитів на місяць', `≈ ${dec(f1(c.visits))}`]]), ['Ставка', `${dec(c.rate)} € / год`], ['Мінімум візиту', `${eur(c.min)}${c.minApplied ? ' — діє' : ''}`]],
      lines: rows.slice(1).map((x) => [x, null]), note: [c.photo ? SOLO_B.photoNote : '', c.glassPhoto ? 'Вітрини в суму не входять — ціна після фото.' : ''].filter(Boolean).join(' '),
      rate: { now: c.rate, fn }, msg: (L) => dmSoloRows(L, c), terms: ['incl', 'contract', c.photo ? 'photo' : 'approxT'] };
  }
  if (c.apt) {
    const a = state.apt;
    return { title: 'Апартаменти', kind: 'hotels', unit, per: 'clean', price: [c.total, c.total], approx: false, cents: true, rate: null,
      facts: [['Тип прибирання', c.ctype.name], ['Апартаментів', String(c.N)], ...(c.disc ? [['Обʼємна ставка', `−${Math.round(c.disc * 100)}%`]] : []), ...(c.commonMonth ? [['Загальні зони', `≈ ${eur(c.commonMonth[0])}–${eur(c.commonMonth[1])} / міс, окремо`]] : [])],
      lines: c.rows.map((x) => [`${x.n} × ${x.sqm} м² (тариф ${x.tier})`, x.each * x.n]),
      msg: (L) => [dmD(L, c.ctype.name), ...c.rows.map((x) => `${x.n} × ${x.sqm} ${dmT(L, 'm2')}`), ...(a.chem ? [dmD(L, 'Засоби та інвентар від Shine Guards')] : []), ...(a.linen ? [dmD(L, 'Доставка білизни')] : []),
        ...(a.urgent ? [dmD(L, 'Терміново, день у день')] : []), ...(c.commonMonth ? [dmT(L, 'common', a.commonArea, dmMoney(L, c.commonMonth[0]), dmMoney(L, c.commonMonth[1]))] : [])],
      terms: ['contract'] };
  }
  if (c.win) { // business glass: minutes × the business rate, blinds per window
    const w = state.win, minutes = c.upTo - 15, n = winCount(), inside = c.hard || w.sides === 1, reg = WIN_BIZ.regular.find(([k]) => k === w.regular);
    const cl = dmTeamFor(minutes + 15, 360), crew = { c: cl, from: r5(minutes / cl), to: r5((minutes + 15) / cl), approx: true };
    return { title: 'Миття вікон для бізнесу', kind: 'bizWindows', crew, unit, per: 'job', price: c.range, approx: true, cents: false,
      facts: [['Скло', `${n} шт${w.facade ? ` + ${w.facade} м² вітрин / фасаду` : ''} · ${inside ? 'зсередини' : 'з обох боків'}`], ['Ставка', `${dec(c.rate)} € / год`], ['Мінімум', eur(c.min)], ...(c.blinds ? [['Жалюзі', eur(c.blinds)]] : [])],
      lines: [], note: c.hard ? 'Складний доступ ззовні — у суму входить лише миття зсередини.' : '',
      rate: { now: c.rate, fn: (rate) => [Math.max(c.min, minutes / 60 * rate) + c.blinds, Math.max(c.min, (minutes + 15) / 60 * rate) + c.blinds] },
      msg: (L) => [...(n ? [dmT(L, 'glass', n, dmT(L, inside ? 'inside' : 'both'))] : []), ...(w.facade ? [dmT(L, 'facade', w.facade)] : []), ...(c.blinds ? [`${dmD(L, 'Жалюзі')} × ${Math.min(w.blinds, n)}`] : []),
        ...(reg && w.regular !== 'once' ? [dmT(L, 'sched', dmLow(L, dmD(L, reg[1])))] : []), dmTeam(L, crew)],
      terms: ['incl', 'photo', 'contract'] };
  }
  return none(dmBizTitle(), 'Індивідуально.');
}
const dmBizTitle = () => (SOLO_B ? SOLO_B.name : (DM_SVC.business.find(([id]) => id === DM.svc) || ['', 'Бізнес'])[1]);
// the client's price: another hourly rate (the same hours), one sum of a range, then the percent
function dmFinal(q) {
  if (!q.price) return null;
  let v = q.rate && +DM.rate > 0 ? q.rate.fn(+DM.rate) : q.price.slice();
  if (v[0] !== v[1] && DM.pick !== 'range') { const x = DM.pick === 'lo' ? v[0] : DM.pick === 'hi' ? v[1] : (v[0] + v[1]) / 2; v = [x, x]; }
  const k = 1 + DM.adj / 100, rd = (x) => (q.cents ? Math.round(x * 100) / 100 : Math.round(x));
  return v.map((x) => rd(x * k));
}
const dmSum = (q, v) => `${q.approx ? '≈ ' : ''}${v[0] === v[1] ? (q.cents ? eur2(v[0]) : eur(v[0])) : money(`${nf(Math.round(v[0]))}–${nf(Math.round(v[1]))}`)}`;
// the team at the top of the panel: «2 клінери · 4 год 30 хв» — a fixed norm for a package, «≈» for an estimate
function dmCrewHTML(k) {
  if (!k) return '';
  const each = `${dmHM(k.from)}${k.to ? ` – ${dmHM(k.to)}` : ''}`, all = `${dmHM(k.c * k.from)}${k.to ? ` – ${dmHM(k.c * k.to)}` : ''}`;
  return `<div class="dm-crew">${DM_TEAM_SVG}<div><b>${k.approx ? '≈ ' : ''}${dmCl(k.c)} · ${each}${k.per ? ' за візит' : ''}</b><small>${k.note || (k.c > 1 ? `разом ${all} роботи` : k.approx ? 'орієнтовно' : 'фіксована норма')}</small></div></div>`;
}

/* ═════════ PANEL ═════════ */
function dmRenderPanel() {
  const p = $('#dmPanel'); if (!p) return;
  const q = dmQuote();
  // the inputs of the adjustments are drawn once per service, so typing in them keeps the focus
  const key = `${DM.side}:${DM.svc}:${q.rate ? 1 : 0}`;
  if (p.dataset.k !== key) {
    p.dataset.k = key;
    p.innerHTML = `<div class="dm-card" id="dmCalcCard"></div>
      <div class="dm-card"><h3>Ціна для клієнта</h3>
        <div class="dm-pick" id="dmPick"><span>Ціна на сайті — діапазон. Клієнту назвати:</span><div class="dm-chips">${DM_PICK.map(([v, l]) => `<button type="button" class="chip" data-dmpick="${v}" aria-pressed="${DM.pick === v}">${l}</button>`).join('')}</div></div>
        <div class="dm-chips">${DM_ADJ.map(([v, l]) => `<button type="button" class="chip" data-dmadj="${v}" aria-pressed="${DM.adj === v}">${l}</button>`).join('')}</div>
        <div class="dm-fields"><label class="dm-field"><span>Знижка (−) або надбавка (+), %</span><input id="dmAdj" type="number" inputmode="numeric" step="1" min="-50" max="100" value="${DM.adj}" /></label>
        ${q.rate ? `<label class="dm-field"><span>Своя ставка, € / год <small>на сайті ${dec(q.rate.now)} €</small></span><input id="dmRate" type="number" inputmode="decimal" step="0.5" min="1" value="${DM.rate}" placeholder="${dec(q.rate.now)}" /></label>` : ''}</div>
        <div class="dm-final" id="dmFinal" aria-live="polite"></div></div>
      <div class="dm-card"><h3>Текст для клієнта</h3><div class="dm-chips">${DM_LANGS.map(([l, t]) => `<button type="button" class="chip" data-dmlang="${l}" aria-pressed="${DM.lang === l}">${t}</button>`).join('')}</div>
        <textarea id="dmText" rows="12" spellcheck="false" aria-label="Текст для клієнта"></textarea>
        <div class="dm-btns"><button type="button" class="dm-copy" data-dmcopy>Скопіювати текст</button><a class="dm-wa" id="dmWa" target="_blank" rel="noopener">${SOC.wa}Відкрити у WhatsApp</a></div>
        <p class="dm-hint">Текст складається з розрахунку. Правте його перед копіюванням: після зміни в розрахунку він складеться заново.</p></div>`;
  }
  $('#dmCalcCard').innerHTML = `<div class="dm-h"><b>${q.title}</b><small>${CITIES[state.city].name} · ${DM.side === 'private' ? 'для дому' : 'для бізнесу'}</small></div>
    ${dmCrewHTML(q.crew)}
    ${q.note ? `<p class="dm-note">${q.note}</p>` : ''}
    ${q.facts.length ? `<dl class="dm-facts">${q.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    ${q.lines.length ? `<div class="dm-lines">${q.lines.map(([n, v]) => `<div class="ln"><span>${n}</span>${v == null ? '' : `<span class="num">${v < 0 ? '−' : ''}${eur2(Math.abs(v))}</span>`}</div>`).join('')}</div>` : ''}
    ${q.price ? `<div class="dm-site"><span>${DM_HR.includes(DM.svc) ? 'Розрахунок' : 'Ціна на сайті'}${q.approx ? ' · орієнтовно' : ' · фіксована'}</span><b class="num">${dmSum(q, q.price)}</b><small>${DM_UNIT[q.unit]} ${DM_PER[q.per]}</small></div>` : ''}`;
  dmUpdateFinal(q);
}
function dmUpdateFinal(q = dmQuote()) {
  const el = $('#dmFinal'); if (!el) return;
  const f = dmFinal(q), range = !!q.price && q.price[0] !== q.price[1], pk = $('#dmPick');
  if (pk) pk.hidden = !range;
  const same = !DM.adj && !(q.rate && +DM.rate > 0) && (!range || DM.pick === 'range');
  el.innerHTML = f ? `<span>Клієнту${same ? (DM_HR.includes(DM.svc) ? ' — як у розрахунку' : ' — як на сайті') : ''}</span><b class="num">${dmSum(q, f)}</b><small>${DM_UNIT[q.unit]} ${DM_PER[q.per]}</small>` : '<span>Ціни немає — дивіться примітку вище</span>';
  dmWriteText(q, f);
}
function dmWriteText(q, f) {
  const ta = $('#dmText'), wa = $('#dmWa'); if (!ta) return;
  if (DM.lang !== 'ua' && !DM_DICT[DM.lang]) { ta.value = '…'; dmLoadDict(DM.lang).then(() => dmWriteText(q, f)); return; }
  const text = f ? dmMessage(DM.lang, q, f) : '';
  ta.value = text;
  if (wa) { wa.href = `https://wa.me/?text=${encodeURIComponent(text)}`; wa.classList.toggle('off', !text); }
}
function dmLoadDict(lang) {
  if (lang === 'ua' || DM_DICT[lang]) return Promise.resolve();
  if (!DM_DICT['_' + lang]) DM_DICT['_' + lang] = new Promise((ok) => {
    const s = document.createElement('script'), v = (document.querySelector('meta[name="sg-build"]') || {}).content || '';
    s.src = `${ROOT}assets/i18n/${lang}.js${v ? `?v=${v}` : ''}`;
    s.onload = () => { DM_DICT[lang] = window.SG_I18N || {}; ok(); };
    s.onerror = () => { DM_DICT[lang] = {}; ok(); };
    document.head.appendChild(s);
  });
  return DM_DICT['_' + lang];
}

/* ═════════ THE CLIENT'S MESSAGE ═════════ */
const DM_T = {
  ua: { hi: 'Добрий день!', calc: 'Розрахували для вас:', price: 'Вартість', priceApprox: 'Орієнтовна вартість', per_month: 'на місяць', per_clean: 'за одне прибирання',
    vat: 'з ПДВ', net: 'netto, без ПДВ', m2: 'м²', area: 'Площа: {0} м²', empty: 'Квартира без меблів', furn: 'Квартира з меблями',
    team: 'Команда: {0}, {1}', cl: 'клінер|клінери|клінерів', h: 'год', min: 'хв', sched: 'Графік: {0}', regular: 'Регулярно: {0}',
    freq_weekly: 'щотижня', freq_biweekly: 'раз на 2 тижні', freq_monthly: 'раз на місяць',
    windows: 'Вікна: {0} шт, {1}', glass: 'Скло (вікна, двері, вітрини): {0} шт, {1}', facade: 'Великі вітрини / фасад: {0} м²', both: 'з обох боків', inside: 'зсередини',
    common: 'Загальні зони {0} м², щодня: ≈ {1} – {2} на місяць',
    incl: 'Засоби та інвентар — наші.', pay: 'Оплата — після прибирання.', prepay: 'Прибирання при переїзді — за передоплатою.', hourly: 'Оплата — за фактично відпрацьований час.',
    minT: 'Мінімальне замовлення — {0}.', contract: 'Працюємо за договором і виставляємо рахунок.', photo: 'Остаточну суму підтвердимо за фото.', approxT: 'Остаточну вартість зафіксуємо в комерційній пропозиції.',
    askHome: 'Напишіть, будь ласка, зручну дату й час — забронюємо команду.', askBiz: 'Підготуємо комерційну пропозицію й договір — напишіть, будь ласка, зручний час для дзвінка або огляду.',
    t_reno: 'Прибирання після ремонту', t_hourly: 'Погодинне прибирання', t_bizRegular: 'Регулярне прибирання обʼєкта', t_bizOnce: 'Разове прибирання обʼєкта', t_hotels: 'Прибирання апартаментів', t_bizWindows: 'Миття вікон і вітрин' },
  ru: { hi: 'Добрый день!', calc: 'Рассчитали для вас:', price: 'Стоимость', priceApprox: 'Ориентировочная стоимость', per_month: 'в месяц', per_clean: 'за одну уборку',
    vat: 'с НДС', net: 'нетто, без НДС', m2: 'м²', area: 'Площадь: {0} м²', empty: 'Квартира без мебели', furn: 'Квартира с мебелью',
    team: 'Команда: {0}, {1}', cl: 'клинер|клинера|клинеров', h: 'ч', min: 'мин', sched: 'График: {0}', regular: 'Регулярно: {0}',
    freq_weekly: 'каждую неделю', freq_biweekly: 'раз в 2 недели', freq_monthly: 'раз в месяц',
    windows: 'Окна: {0} шт., {1}', glass: 'Стекло (окна, двери, витрины): {0} шт., {1}', facade: 'Большие витрины / фасад: {0} м²', both: 'с двух сторон', inside: 'изнутри',
    common: 'Общие зоны {0} м², ежедневно: ≈ {1} – {2} в месяц',
    incl: 'Средства и инвентарь — наши.', pay: 'Оплата — после уборки.', prepay: 'Уборка при переезде — по предоплате.', hourly: 'Оплата — за фактически отработанное время.',
    minT: 'Минимальный заказ — {0}.', contract: 'Работаем по договору и выставляем счёт.', photo: 'Итоговую сумму подтвердим по фото.', approxT: 'Итоговую стоимость зафиксируем в коммерческом предложении.',
    askHome: 'Напишите, пожалуйста, удобные дату и время — забронируем команду.', askBiz: 'Подготовим коммерческое предложение и договор — напишите, пожалуйста, удобное время для звонка или осмотра.',
    t_reno: 'Уборка после ремонта', t_hourly: 'Почасовая уборка', t_bizRegular: 'Регулярная уборка объекта', t_bizOnce: 'Разовая уборка объекта', t_hotels: 'Уборка апартаментов', t_bizWindows: 'Мойка окон и витрин' },
  en: { hi: 'Hello!', calc: 'Our calculation for you:', price: 'Price', priceApprox: 'Estimated price', per_month: 'per month', per_clean: 'per cleaning',
    vat: 'incl. VAT', net: 'net, excl. VAT', m2: 'm²', area: 'Area: {0} m²', empty: 'Unfurnished apartment', furn: 'Furnished apartment',
    team: 'Team: {0}, {1}', cl: 'cleaner|cleaners', h: 'h', min: 'min', sched: 'Schedule: {0}', regular: 'Regular cleaning: {0}',
    freq_weekly: 'every week', freq_biweekly: 'every 2 weeks', freq_monthly: 'once a month',
    windows: 'Windows: {0} pcs, {1}', glass: 'Glass (windows, doors, shop windows): {0} pcs, {1}', facade: 'Large shop windows / facade: {0} m²', both: 'both sides', inside: 'inside only',
    common: 'Common areas {0} m², daily: ≈ {1} – {2} per month',
    incl: 'Cleaning products and equipment are included.', pay: 'Payment after the cleaning.', prepay: 'Move-in / move-out cleaning is paid in advance.', hourly: 'You pay for the time actually worked.',
    minT: 'Minimum order: {0}.', contract: 'We work under a contract and issue invoices.', photo: 'We will confirm the final price from photos.', approxT: 'The final price will be fixed in our commercial offer.',
    askHome: 'Please let us know a convenient date and time, and we will book a team for you.', askBiz: 'We will prepare an offer and a contract — please let us know a convenient time for a call or a site visit.',
    t_reno: 'Post-renovation cleaning', t_hourly: 'Hourly cleaning', t_bizRegular: 'Regular cleaning of your premises', t_bizOnce: 'One-off cleaning of your premises', t_hotels: 'Apartment cleaning', t_bizWindows: 'Window and shop-window cleaning' },
  de: { hi: 'Guten Tag!', calc: 'Unsere Kalkulation für Sie:', price: 'Preis', priceApprox: 'Voraussichtlicher Preis', per_month: 'pro Monat', per_clean: 'pro Reinigung',
    vat: 'inkl. MwSt.', net: 'netto, zzgl. MwSt.', m2: 'm²', area: 'Fläche: {0} m²', empty: 'Unmöblierte Wohnung', furn: 'Möblierte Wohnung',
    team: 'Team: {0}, {1}', cl: 'Reinigungskraft|Reinigungskräfte', h: 'Std.', min: 'Min.', sched: 'Rhythmus: {0}', regular: 'Regelmäßig: {0}',
    freq_weekly: 'jede Woche', freq_biweekly: 'alle 2 Wochen', freq_monthly: 'einmal im Monat',
    windows: 'Fenster: {0} Stk., {1}', glass: 'Glas (Fenster, Türen, Schaufenster): {0} Stk., {1}', facade: 'Große Schaufenster / Fassade: {0} m²', both: 'beidseitig', inside: 'nur innen',
    common: 'Allgemeinflächen {0} m², täglich: ≈ {1} – {2} pro Monat',
    incl: 'Reinigungsmittel und Geräte bringen wir mit.', pay: 'Bezahlung nach der Reinigung.', prepay: 'Die Umzugsreinigung wird im Voraus bezahlt.', hourly: 'Abgerechnet wird die tatsächlich geleistete Zeit.',
    minT: 'Mindestauftrag: {0}.', contract: 'Wir arbeiten mit Vertrag und stellen Rechnungen aus.', photo: 'Den Endpreis bestätigen wir anhand von Fotos.', approxT: 'Den Endpreis halten wir im Angebot fest.',
    askHome: 'Bitte nennen Sie uns einen passenden Termin — wir reservieren das Team für Sie.', askBiz: 'Gerne bereiten wir ein Angebot und einen Vertrag vor — wann passt Ihnen ein Telefonat oder eine Besichtigung?',
    t_reno: 'Reinigung nach Renovierung', t_hourly: 'Stundenweise Reinigung', t_bizRegular: 'Regelmäßige Objektreinigung', t_bizOnce: 'Einmalige Objektreinigung', t_hotels: 'Apartmentreinigung', t_bizWindows: 'Fenster- und Schaufensterreinigung' },
};
// visits a week in words: «3 рази на тиждень», «twice a week», «3-mal pro Woche»
const DM_TIMES = {
  ua: (n) => (n === 7 ? 'щодня' : `${n} ${dmPl('ua', n, 'раз|рази|разів')} на тиждень`),
  ru: (n) => (n === 7 ? 'ежедневно' : `${n} ${dmPl('ru', n, 'раз|раза|раз')} в неделю`),
  en: (n) => (n === 7 ? 'daily' : n === 1 ? 'once a week' : n === 2 ? 'twice a week' : `${n} times a week`),
  de: (n) => (n === 7 ? 'täglich' : n === 1 ? 'einmal pro Woche' : `${n}-mal pro Woche`),
};
const dmT = (L, k, ...a) => (DM_T[L][k] != null ? DM_T[L][k] : DM_T.ua[k] != null ? DM_T.ua[k] : k).replace(/\{(\d+)\}/g, (m, i) => (a[+i] != null ? a[+i] : ''));
// texts of the site that its dictionaries do not have yet (the translation of the site is paused) — a message to a client
// must not be half Ukrainian; once a dictionary has a text, the dictionary wins
const DM_X = {
  ru: { 'Інший торговий обʼєкт': 'Другой торговый объект', 'Підтримувальне прибирання': 'Поддерживающая уборка', 'Двічі на рік': 'Дважды в год', 'Потрібно уточнити': 'Нужно уточнить',
    'Засоби та інвентар від Shine Guards': 'Средства и инвентарь от Shine Guards', 'одноразово': 'однократно', 'Власний HACCP-план або графік прибирання:': 'Собственный HACCP-план или график уборки:',
    ' — вартість після фото або огляду': ' — стоимость после фото или осмотра', 'Килим {0} м²': 'Ковёр {0} м²' },
  en: { 'Інший торговий обʼєкт': 'Other retail premises', 'Підтримувальне прибирання': 'Maintenance cleaning', 'Двічі на рік': 'Twice a year', 'Потрібно уточнити': 'To be clarified',
    'Засоби та інвентар від Shine Guards': 'Cleaning products and equipment from Shine Guards', 'одноразово': 'one-off', 'Власний HACCP-план або графік прибирання:': 'Own HACCP plan or cleaning schedule:',
    ' — вартість після фото або огляду': ' — price after photos or a site visit', 'Килим {0} м²': 'Carpet {0} m²' },
  de: { 'Інший торговий обʼєкт': 'Anderes Geschäftslokal', 'Підтримувальне прибирання': 'Laufende Reinigung', 'Двічі на рік': 'Zweimal im Jahr', 'Потрібно уточнити': 'Noch zu klären',
    'Засоби та інвентар від Shine Guards': 'Reinigungsmittel und Geräte von Shine Guards', 'одноразово': 'einmalig', 'Власний HACCP-план або графік прибирання:': 'Eigener HACCP-Plan oder Reinigungsplan:',
    ' — вартість після фото або огляду': ' — Preis nach Fotos oder Besichtigung', 'Килим {0} м²': 'Teppich {0} m²' },
};
// a text of the site in the client's language: the site's dictionary (Ukrainian → translation), then DM_X; else the Ukrainian text
const dmD = (L, s) => { if (L === 'ua') return s; const t = DM_DICT[L] && DM_DICT[L][s]; return t != null ? t : (DM_X[L] && DM_X[L][s]) || s; };
const dmLow = (L, s) => (L === 'de' ? s : s.charAt(0).toLowerCase() + s.slice(1)); // a German noun keeps its capital letter
// plural forms: 'one|few|many' (Slavic rules) or 'one|other'; a key of DM_T or the forms themselves
function dmPl(L, n, forms) {
  const f = (DM_T[L][forms] || forms).split('|');
  if (f.length === 2) return n === 1 ? f[0] : f[1];
  const n10 = n % 10, n100 = n % 100;
  return n10 === 1 && n100 !== 11 ? f[0] : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? f[1] : f[2];
}
// money in the client's language: «1 030 €», «€1,030»; Germany writes «1.030 €», Austria «€ 1.030»
const dmMoney = (L, v, cents) => {
  const at = L === 'de' && country() !== 'de', fr = cents && !Number.isInteger(Math.round(v * 100) / 100) ? 2 : 0;
  const n = new Intl.NumberFormat({ ua: 'uk-UA', ru: 'ru-RU', en: 'en-GB', de: at ? 'de-AT' : 'de-DE' }[L], { minimumFractionDigits: fr, maximumFractionDigits: fr }).format(v);
  return L === 'en' ? `€${n}` : at ? `€ ${n}` : `${n} €`;
};
// minutes in the client's language: «4 год 30 хв», «4 h 30 min», «45 Min.»
const dmDur = (L, mins) => { const m = Math.round(mins), hh = Math.floor(m / 60), mm = m % 60; return hh ? `${hh} ${DM_T[L].h}${mm ? ` ${mm} ${DM_T[L].min}` : ''}` : `${mm} ${DM_T[L].min}`; };
const dmTeam = (L, k) => dmT(L, 'team', `${k.c} ${dmPl(L, k.c, 'cl')}`, `${k.approx ? '≈ ' : ''}${dmDur(L, k.from)}${k.to ? ` – ${dmDur(L, k.to)}` : ''}`);
// a line of the site's breakdown (computePriv) in the client's language: the whole text, else the template it was built from
function dmLine(L, s) {
  if (L === 'ua') return s;
  const d = (x) => dmD(L, x), t = (key, ...a) => d(key).replace(/\{(\d+)\}/g, (m, i) => (a[+i] != null ? a[+i] : ''));
  if (d(s) !== s) return d(s);
  let m;
  if ((m = s.match(/^(.+) −(\d+)%(.*)$/))) return t(`${m[1]} −{0}%${m[3]}`, m[2]); // the regular discount, Welcome
  if ((m = s.match(/^Погодинне прибирання · (.+) год$/))) return t('Погодинне прибирання · {0} год', m[1]);
  if ((m = s.match(/^Килим до (\d+) м² × (\d+)$/))) return `${t('Килим до {0} м² ×', m[1])} ${m[2]}`;
  if ((m = s.match(/^Килим до (\d+) м²$/))) return t('Килим до {0} м²', m[1]);
  if ((m = s.match(/^Килим (\d+) м² × (.+) €\/м²$/))) return t('Килим {0} м² × {1} €/м²', m[1], m[2]);
  if ((m = s.match(/^Килим (\d+) м²$/))) return t('Килим {0} м²', m[1]);
  if ((m = s.match(/^Матрац (\S+) × (\d+)( · 2 сторони)?$/))) return `${t('Матрац {0} ×', m[1])} ${m[2]}${m[3] ? d(' · 2 сторони') : ''}`;
  if ((m = s.match(/^(.+) · (\d+) шт \(орієнтовно\)$/))) return `${d(m[1])} ${t('· {0} шт (орієнтовно)', m[2])}`;
  if ((m = s.match(/^(.+) · (.+) год$/))) return `${d(m[1])} ${t('· {0} год', m[2])}`;
  if ((m = s.match(/^(.+) × (\d+)$/))) return `${d(m[1])} × ${m[2]}`;
  return s;
}
// the answers of an object calculator (as soloAnswers of the site) in the client's language
function dmSoloRows(L, c) {
  const cfg = SOLO_B, st = state.bs, kt = soloType(), d = (s) => dmD(L, s), low = (s) => dmLow(L, d(s));
  const fmt = !kt ? (c.oneOff ? '' : DM_TIMES[L](soloFreq())) : kt.regular && st.kfmt !== 'once' ? DM_TIMES[L](soloFreq()) : st.kfmt === 'once' ? d('одноразово') : low(cfg.pers.find(([k]) => k === st.kper)[1]);
  const rows = [`${kt ? `${d(kt.name)} ${d('· кухня')}` : d(cfg.kinds[st.kind])} ${st.area} ${dmT(L, 'm2')}${fmt ? ` · ${fmt}` : ''}`];
  if (cfg.times) rows.push(`${d('Час прибирання:')} ${low(cfg.times.find(([k]) => k === st.time)[1])}`);
  if (cfg.counts) rows.push(cfg.counts.map(([k, l]) => `${d(l)}: ${st.counts[k]}`).join(' · '));
  if (cfg.glass && st.glass !== 'no') rows.push(`${d(cfg.glassLbl || 'Вітрини')}: ${low(cfg.glass.find(([k]) => k === st.glass)[1])}${cfg.glassPhoto ? d(' — вартість після фото або огляду') : st.glass === 'both' ? d(' (зовнішня сторона — окремий розрахунок)') : ''}`);
  if (cfg.dirt) rows.push(`${d('Забруднення:')} ${low(cfg.dirt.find(([k]) => k === st.dirt)[1])}`);
  if (cfg.zoneQ) { const on = cfg.zones.filter((z) => st.zones.has(z.id)); rows.push(`${d('Зони:')} ${cfg.all && on.length === cfg.zones.length ? low(cfg.all) : on.map((z) => low(z.name)).join(', ')}`); }
  if (cfg.adds && st.adds.size) rows.push(`${d('Додаткові зони:')} ${cfg.adds.filter(([k]) => st.adds.has(k)).map(([, l]) => low(l)).join(', ')}`);
  if (cfg.haccpQ) rows.push(`${d('Власний HACCP-план або графік прибирання:')} ${low(cfg.haccpA.find(([k]) => k === st.haccp)[1])}`);
  if (cfg.flags) cfg.flags.filter(([k]) => st.flags.has(k)).forEach(([, l]) => rows.push(d(l)));
  return rows;
}
function dmMessage(L, q, f) {
  const head = q.kind && DM_T.ua['t_' + q.kind] ? dmT(L, 't_' + q.kind) : dmD(L, q.title);
  const approx = q.approx || f[0] !== f[1];
  const sum = `${approx ? '≈ ' : ''}${f[0] === f[1] ? dmMoney(L, f[0], q.cents) : `${dmMoney(L, f[0])} – ${dmMoney(L, f[1])}`}`;
  const per = q.per === 'month' ? dmT(L, 'per_month') : q.per === 'clean' ? dmT(L, 'per_clean') : '';
  const price = `${dmT(L, approx ? 'priceApprox' : 'price')}: ${sum}${per ? ` ${per}` : ''}${q.unit !== 'none' ? `, ${dmT(L, q.unit)}` : ''}`;
  const terms = (q.terms || []).map((t) => (t === 'min' ? dmT(L, 'minT', dmMoney(L, q.min)) : dmT(L, t)));
  const body = (q.msg ? q.msg(L) : []).filter(Boolean).map((x) => `— ${x}`);
  // «Розрахували для вас: генеральне прибирання»; English titles are in Title Case, German nouns keep their capitals
  return [dmT(L, 'hi'), '', `${dmT(L, 'calc')} ${L === 'en' ? head.toLowerCase() : dmLow(L, head)}`, ...body, '', price, ...(terms.length ? [terms.join(' ')] : []), '', dmT(L, DM.side === 'private' ? 'askHome' : 'askBiz')].join('\n');
}

/* ═════════ EVENTS (this file is loaded first: these run before the site's own handlers, which skip these buttons) ═════════ */
document.addEventListener('click', (e) => {
  if (!DM_PAGE) return;
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset, press = (attr, v) => $$(`[${attr}]`).forEach((x) => x.setAttribute('aria-pressed', String(x.getAttribute(attr) === String(v))));
  if (d.dmside) { if (DM.side !== d.dmside) { DM.side = d.dmside; dmSelect(DM.last[DM.side]); } return; }
  if (d.dmsvc) { if (DM.svc !== d.dmsvc) dmSelect(d.dmsvc); return; }
  if (d.dmfreq != null) { DM.hr.freq = +d.dmfreq; dmRenderCalc(); return; }
  if (d.dmstep) { // the team by one cleaner, the time by a quarter of an hour
    const [k, s] = d.dmstep.split(':'), h = DM.hr;
    if (k === 'cleaners') h.cleaners = Math.min(20, Math.max(1, h.cleaners + +s)); else h.mins = Math.min(1440, Math.max(30, h.mins + 15 * +s));
    dmRenderCalc(); return;
  }
  if (d.dmadj != null) { DM.adj = +d.dmadj; const i = $('#dmAdj'); if (i) i.value = DM.adj; press('data-dmadj', DM.adj); dmUpdateFinal(); return; }
  if (d.dmpick) { DM.pick = d.dmpick; press('data-dmpick', DM.pick); dmUpdateFinal(); return; }
  if (d.dmlang) { DM.lang = d.dmlang; store.set('sg-dm-lang', DM.lang); press('data-dmlang', DM.lang); dmUpdateFinal(); return; }
  if ('dmcopy' in d) {
    const ta = $('#dmText'); if (!ta || !ta.value) return;
    const done = () => { b.textContent = 'Скопійовано ✓'; setTimeout(() => { b.textContent = 'Скопіювати текст'; }, 1600); };
    const old = () => { ta.select(); try { document.execCommand('copy'); } catch (err) { /* the text stays selected for Ctrl+C */ } done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, old); else old();
  }
});
document.addEventListener('input', (e) => {
  if (!DM_PAGE) return;
  const t = e.target;
  if (t.id === 'dmHrRate') { DM.hr.rate = t.value; dmPaintOut(); }
  else if (t.id === 'dmAdj') { DM.adj = Math.max(-50, Math.min(100, Math.round(+t.value || 0))); $$('[data-dmadj]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.dmadj === DM.adj))); dmUpdateFinal(); }
  else if (t.id === 'dmRate') { DM.rate = t.value; dmUpdateFinal(); }
});
