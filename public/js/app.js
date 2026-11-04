// Клиентская часть: главная, запись, помощник, мои записи, напоминания.
import { esc, $, $$, icon, api, toast, sheet, richText, formatPhone, applyAccent, busy, closeAllSheets } from './ui.js';
import { fmtDay, fmtDayRel, fmtDuration, fmtPrice, fmtMoney, toMin, dateOf, timeOf, addDays, weekday, WD_SHORT, MONTHS_NOM, localNow, fromMin } from '/core/time.js';
import { spanFor } from '/core/slots.js';
import { phoneHref, tgHref, waHref } from '/core/info.js';

const S = window.__BOOT__;
const BASE = `/${S.slug}`;
const API = (p, o) => api(`${BASE}/api${p}`, o);
const LINKS = { admin: `${BASE}/admin`, privacy: `${BASE}/privacy`, ...(window.__LINKS__ || {}) };
const ext = (href) => (href.startsWith('#') ? '' : 'target="_blank" rel="noopener"');
applyAccent(S.theme.accent);

const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(`${S.slug}:${k}`)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`${S.slug}:${k}`, JSON.stringify(v)); } catch {} },
};
const nowMin = () => localNow(S.timezone);
const today = () => dateOf(nowMin());
const svcById = (id) => S.services.find((s) => s.id === id);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const pushPossible = () => !window.__NO_PUSH__ && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ——— Мои записи (храним токены на устройстве) ———
const my = {
  list: () => LS.get('bookings', []),
  save: (l) => LS.set('bookings', l),
  upsert(b) { const l = my.list().filter((x) => x.token !== b.token); l.push(b); my.save(l); renderTop(); },
  upcoming: () => my.list().filter((b) => b.status !== 'cancelled' && toMin(b.end || b.start) > nowMin()).sort((a, b) => a.start.localeCompare(b.start)),
};

// ——— Главная ———
function render() {
  const cats = [...new Set(S.services.map((s) => s.category).filter(Boolean))];
  const minPrice = Math.min(...S.services.filter((s) => s.price).map((s) => s.price));
  const app = $('#app');
  app.innerHTML = `
  <header class="top" id="top"><div class="wrap top-in">
    <a class="brand" href="${BASE}/">
      <span class="brand-mark">${S.logo ? `<img src="${esc(S.logo)}" alt="">` : esc(initials(S.name))}</span>
      <span class="brand-name">${esc(S.name)}</span>
    </a>
    <button class="btn sm ghost hidden" id="installBtn">${icon('install', 'sm')} Установить</button>
    <button class="btn icon ghost" id="myBtn" aria-label="Мои записи" title="Мои записи">${icon('cal')}</button>
    ${S.phone ? `<a class="btn icon ghost" href="${phoneHref(S.phone)}" aria-label="Позвонить">${icon('phone')}</a>` : ''}
    <button class="btn sm primary top-cta" data-book>Записаться</button>
  </div></header>

  <section class="hero">
    <div class="hero-img" style="background-image:url('${esc(S.hero || '/media/defaults/hero.jpg')}')"></div>
    <div class="wrap" style="width:100%">
      <div class="hero-kind">
        ${S.kind ? `<span class="eyebrow ac">${esc(S.kind)}</span>` : ''}
        <span class="status ${S.status.open ? 'open' : ''}"><i></i>${esc(S.status.text)}</span>
      </div>
      <h1>${esc(S.name)}</h1>
      ${S.tagline ? `<p class="hero-tag">${esc(S.tagline)}</p>` : ''}
      <div class="hero-cta">
        <button class="btn lg primary" data-book>Записаться онлайн ${icon('arrow')}</button>
        <button class="btn lg" data-chat>${icon('spark')} Спросить</button>
      </div>
      <div class="hero-facts">
        ${Number.isFinite(minPrice) ? `<div><b>от ${fmtMoney(minPrice, S.currency)}</b><span>цены</span></div>` : ''}
        <div><b>${S.services.length}</b><span>${plural(S.services.length, ['услуга', 'услуги', 'услуг'])}</span></div>
        ${S.address ? `<div><b>${esc(S.city || 'Адрес')}</b><span>${esc(S.address)}</span></div>` : ''}
      </div>
    </div>
  </section>

  <section class="wrap" style="padding-top:8px">
    <div class="card ask">
      <div class="ask-top">
        <div class="ask-ico">${icon('spark', 'lg')}</div>
        <div><h3>Помощник студии</h3><p>Отвечает сразу — про цены, свободное время и дорогу</p></div>
      </div>
      <div class="ask-chips">${S.examples.map((q) => `<button class="chip ac" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <button class="ask-field" data-chat><span>Напишите свой вопрос…</span><span class="go">${icon('arrow', 'sm')}</span></button>
    </div>
  </section>

  ${S.cards.some((c) => c.title || c.text) ? `<section class="wrap block"><div class="cards3">
    ${S.cards.filter((c) => c.title || c.text).map((c, i) => `<div class="card info"><span class="info-n">0${i + 1}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>`).join('')}
  </div></section>` : ''}

  <section class="wrap block" id="services">
    <div class="sec-head"><div><span class="eyebrow">Прайс</span><h2>Услуги</h2></div></div>
    ${cats.length > 1 ? `<div class="svc-tabs"><button class="chip on" data-cat="">Все</button>${cats.map((c) => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    <div class="svc-list" id="svcList">${S.services.map(svcCard).join('')}</div>
  </section>

  ${S.gallery.length ? `<section class="block" id="works"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Портфолио</span><h2>Наши работы</h2></div>
      <div class="scroll-btns"><button class="btn icon" data-scroll="-1" aria-label="Назад">${icon('left')}</button><button class="btn icon" data-scroll="1" aria-label="Вперёд">${icon('right')}</button></div></div>
    <div class="works" id="worksRow">${S.gallery.map((g) => `<figure class="work" style="margin:0"><img src="${esc(g.image)}" alt="${esc(g.caption)}" loading="lazy">${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}</figure>`).join('')}</div>
  </div></section>` : ''}

  <section class="wrap block" id="contacts">
    <div class="sec-head"><div><span class="eyebrow">Контакты</span><h2>Как нас найти</h2></div></div>
    <div class="contacts">
      <div class="card c-card">
        <div class="c-addr">${esc([S.city, S.address].filter(Boolean).join(', ') || 'Адрес уточняйте по телефону')}</div>
        ${S.howToFind ? `<p class="c-how">${esc(S.howToFind)}</p>` : ''}
        <div class="c-row">
          <a class="btn" href="${esc(S.links.yandex)}" target="_blank" rel="noopener">${icon('map')} Яндекс Карты</a>
          <a class="btn" href="${esc(S.links.gis)}" target="_blank" rel="noopener">2ГИС</a>
        </div>
        <div class="c-row">
          ${S.phone ? `<a class="btn primary" href="${phoneHref(S.phone)}">${icon('phone')} ${esc(S.phone)}</a>` : ''}
          ${S.telegram ? `<a class="btn" href="${esc(tgHref(S.telegram))}" target="_blank" rel="noopener">${icon('tg')} Telegram</a>` : ''}
          ${S.whatsapp ? `<a class="btn" href="${esc(waHref(S.whatsapp))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>
      <div class="card c-card">
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">График</span><span class="status ${S.status.open ? 'open' : ''}"><i></i>${esc(S.status.open ? 'Открыто' : 'Закрыто')}</span></div>
        <div class="hours">${S.scheduleLines.map((l) => `<div><span class="muted">${esc(cap(l.days))}</span><b class="tnum">${esc(l.hours)}</b></div>`).join('')}</div>
      </div>
    </div>
  </section>

  <footer class="wrap foot"><span>© ${new Date().getFullYear()} ${esc(S.name)}</span><span style="display:flex;gap:18px;flex-wrap:wrap"><a href="${LINKS.privacy}">Политика конфиденциальности</a><a href="${LINKS.admin}">Кабинет владельца</a></span></footer>

  <div class="dock">
    <button class="btn primary" data-book>Записаться</button>
    <button class="btn icon" data-chat aria-label="Помощник">${icon('chat', 'lg')}</button>
  </div>`;

  app.addEventListener('click', onClick);
  const top = $('#top');
  const onScroll = () => top.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  renderTop();
}

function plural(n, [a, b, c]) { const x = Math.abs(n) % 100, y = x % 10; if (x > 10 && x < 20) return c; if (y > 1 && y < 5) return b; if (y === 1) return a; return c; }

function svcCard(s) {
  return `<button class="card svc" data-svc="${esc(s.id)}" data-c="${esc(s.category)}">
    <span class="svc-name">${esc(s.name)}${s.popular ? ' <span class="pill ac">хит</span>' : ''}</span>
    <span class="svc-price">${esc(fmtPrice(s, S.currency))}</span>
    ${s.description ? `<span class="svc-desc">${esc(s.description)}</span>` : ''}
    <span class="svc-meta">${icon('clock', 'sm')} ${esc(fmtDuration(s))}${s.days ? ' · машина остаётся у нас' : ''}</span>
    <span class="svc-go">${icon('arrow', 'sm')}</span>
  </button>`;
}

function renderTop() {
  const b = $('#myBtn');
  if (b) b.classList.toggle('badge-dot', my.upcoming().length > 0);
}

function onClick(e) {
  const t = e.target.closest('[data-book],[data-chat],[data-ask],[data-svc],[data-cat],[data-scroll],#myBtn,#installBtn');
  if (!t) return;
  if (t.matches('[data-book]')) openBooking({});
  else if (t.matches('[data-ask]')) openChat(t.dataset.ask);
  else if (t.matches('[data-chat]')) openChat();
  else if (t.matches('[data-svc]')) openBooking({ serviceId: t.dataset.svc });
  else if (t.matches('[data-cat]')) {
    $$('[data-cat]').forEach((x) => x.classList.toggle('on', x === t));
    $$('#svcList .svc').forEach((x) => x.classList.toggle('hidden', !!t.dataset.cat && x.dataset.c !== t.dataset.cat));
  } else if (t.matches('[data-scroll]')) { const r = $('#worksRow'); r.scrollBy({ left: Number(t.dataset.scroll) * r.clientWidth * 0.8, behavior: 'smooth' }); }
  else if (t.id === 'myBtn') openMy();
  else if (t.id === 'installBtn') install();
}

// ——— Запись ———
function openBooking(pre = {}) {
  closeAllSheets();
  const st = { svc: pre.serviceId ? svcById(pre.serviceId) : null, date: pre.date || null, time: pre.time || null, days: [], loaded: null, step: 'svc' };
  if (S.services.length === 1) st.svc = S.services[0];
  if (st.svc) st.step = st.date && st.time ? 'form' : 'time';
  const sh = sheet({ title: 'Запись', cls: 'tall' });

  const stepsBar = (n) => `<div class="steps">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;

  function go(step) { st.step = step; draw(); }
  function draw() {
    if (st.step === 'svc') return drawSvc();
    if (st.step === 'time') return drawTime();
    if (st.step === 'form') return drawForm();
  }

  function drawSvc() {
    sh.setTitle('Выберите услугу');
    const cats = [...new Set(S.services.map((s) => s.category || ''))];
    sh.setBody(`${stepsBar(1)}<div class="pick-svc">${cats.map((c) => `${c && cats.length > 1 ? `<div class="cat-h">${esc(c)}</div>` : ''}${S.services.filter((s) => (s.category || '') === c).map((s) => `
      <button data-pick="${esc(s.id)}"><span class="n">${esc(s.name)}<small>${esc(fmtDuration(s))}</small></span><span class="p">${esc(fmtPrice(s, S.currency))}</span>${icon('right', 'sm')}</button>`).join('')}`).join('')}</div>`);
    sh.setFoot('');
    sh.body.onclick = (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; st.svc = svcById(b.dataset.pick); st.date = null; st.time = null; st.days = []; go('time'); };
  }

  async function loadDays(from, n = 14) {
    const r = await API(`/slots?service=${encodeURIComponent(st.svc.id)}&from=${from}&days=${n}`);
    st.days.push(...r.days.filter((d) => !st.days.some((x) => x.date === d.date)));
    st.loaded = st.svc.id;
  }

  async function drawTime() {
    sh.setTitle('Дата и время');
    sh.setFoot('');
    if (st.loaded !== st.svc.id || !st.days.length) {
      st.days = [];
      sh.setBody(`${stepsBar(2)}${selSvc()}<div class="skeleton" style="height:80px;margin-bottom:18px"></div><div class="skeleton" style="height:160px"></div>`);
      try { await loadDays(today(), 14); } catch (e) { sh.setBody(`<div class="empty">${esc(e.message)}</div>`); return; }
      if (!st.days.some((d) => d.times.length)) { try { await loadDays(addDays(today(), 14), Math.max(1, S.booking.horizonDays - 13)); } catch {} }
    }
    if (!st.date || !st.days.some((d) => d.date === st.date)) st.date = (st.days.find((d) => d.times.length) || st.days[0] || {}).date;
    const day = st.days.find((d) => d.date === st.date);
    const lastLoaded = st.days.at(-1)?.date;
    const canMore = lastLoaded && lastLoaded < addDays(today(), S.booking.horizonDays);
    const mo = st.date ? MONTHS_NOM[+st.date.slice(5, 7) - 1] : '';
    const anyFree = st.days.some((d) => d.times.length);
    sh.setBody(`${stepsBar(2)}${selSvc()}
      <div class="month-l">${esc(cap(mo))}</div>
      <div class="days" id="days">${st.days.map((d) => `<button class="day ${d.date === st.date ? 'on' : ''} ${d.times.length ? '' : 'none'}" data-day="${d.date}">
        <small>${d.date === today() ? 'сег' : WD_SHORT[weekday(d.date)]}</small><b>${+d.date.slice(8)}</b><i></i></button>`).join('')}
        ${canMore ? `<button class="day more" data-more>ещё</button>` : ''}</div>
      ${!anyFree ? `<div class="empty">На ближайшие дни всё занято.${S.phone ? `<br><br><a class="btn" href="${phoneHref(S.phone)}">${icon('phone')} Позвонить</a>` : ''}</div>`
        : day && day.times.length ? `<div class="times">${day.times.map((t) => `<button class="time ${t === st.time ? 'on' : ''}" data-time="${t}">${t}</button>`).join('')}</div>`
          : `<div class="empty">${day && !day.open ? 'Выходной день' : 'На этот день свободного времени нет'}</div>`}
      ${st.svc.days ? `<div class="note">${icon('car')}<span>Работа занимает ${esc(fmtDuration(st.svc))} — машина всё это время остаётся у нас, бокс закреплён за вами.</span></div>` : ''}
      <div id="endNote"></div>`);
    const on = $('#days .day.on', sh.body); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (st.time) showEnd();
    sh.body.onclick = async (e) => {
      const d = e.target.closest('[data-day]'), t = e.target.closest('[data-time]'), more = e.target.closest('[data-more]'), ch = e.target.closest('[data-change]');
      if (ch) { go('svc'); return; }
      if (d) { st.date = d.dataset.day; st.time = null; drawTime(); }
      if (more) { busy(more); try { await loadDays(addDays(lastLoaded, 1), 14); } catch {} drawTime(); setTimeout(() => $('#days', sh.body)?.scrollBy({ left: 400, behavior: 'smooth' }), 50); }
      if (t) {
        st.time = t.dataset.time;
        $$('.time', sh.body).forEach((x) => x.classList.toggle('on', x === t));
        showEnd();
      }
    };
  }

  function showEnd() {
    const sp = spanFor(S, st.svc, toMin(`${st.date}T${st.time}`));
    const endD = dateOf(sp.end);
    const txt = endD === st.date ? `Начнём в ${st.time}, машина будет готова примерно к ${timeOf(sp.end)}.` : `Сдаёте машину ${fmtDay(st.date, { wd: false })} в ${st.time}, забираете ${fmtDay(endD)} после ${timeOf(sp.end)}.`;
    $('#endNote', sh.body).innerHTML = `<div class="note plain">${icon('clock')}<span>${esc(txt)}</span></div>`;
    sh.setFoot(`<button class="btn primary lg block" id="toForm">Продолжить · ${esc(fmtDayRel(st.date, today()))}, ${st.time}</button>`);
    $('#toForm', sh.foot).onclick = () => go('form');
  }

  function selSvc() {
    return `<div class="sel-svc"><div class="n"><b>${esc(st.svc.name)}</b><small>${esc(fmtPrice(st.svc, S.currency))} · ${esc(fmtDuration(st.svc))}</small></div>${S.services.length > 1 ? `<button data-change>Изменить</button>` : ''}</div>`;
  }

  function drawForm() {
    sh.setTitle('Ваши данные');
    const me = LS.get('me', {});
    const sp = spanFor(S, st.svc, toMin(`${st.date}T${st.time}`));
    const multi = dateOf(sp.end) !== st.date;
    sh.setBody(`${stepsBar(3)}
      <form class="form" id="bf" autocomplete="on">
        <label class="field"><span>Имя</span><input class="input" name="name" required autocomplete="given-name" placeholder="Как к вам обращаться" value="${esc(me.name || '')}"></label>
        <label class="field"><span>Телефон</span><input class="input" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="+7 900 000-00-00" value="${esc(me.phone || '')}"></label>
        <label class="field"><span>Автомобиль</span><input class="input" name="car" autocomplete="off" placeholder="Марка, модель, цвет" value="${esc(me.car || '')}"></label>
        <label class="field"><span>Комментарий <span class="dim">— необязательно</span></span><textarea class="input" name="comment" rows="2" placeholder="Что важно знать мастеру"></textarea></label>
        <div class="summary">
          <div class="row">${icon('spark')}<div><b>${esc(st.svc.name)}</b></div></div>
          <div class="row">${icon('cal')}<div><b>${esc(cap(fmtDayRel(st.date, today())))}, ${st.time}</b>${multi ? `<br><span class="muted">до ${esc(fmtDay(dateOf(sp.end), { wd: false }))}, ${timeOf(sp.end)}</span>` : ''}</div></div>
          <div class="row">${icon('map')}<div>${esc([S.address].filter(Boolean).join(''))}</div></div>
          <div class="total"><span>Стоимость</span><span>${esc(fmtPrice(st.svc, S.currency))}</span></div>
        </div>
        <label class="check" style="font-size:14px;align-items:flex-start"><input type="checkbox" name="consent" ${me.consent ? 'checked' : ''}><span>Согласен(на) на обработку имени, телефона и данных об автомобиле для записи и связи. <a href="${LINKS.privacy}" ${ext(LINKS.privacy)} style="color:var(--accent)">Политика конфиденциальности</a></span></label>
      </form>`);
    const ph = $('[name=phone]', sh.body);
    ph.addEventListener('input', () => { const p = ph.selectionStart, l = ph.value.length; ph.value = formatPhone(ph.value); try { ph.setSelectionRange(p + ph.value.length - l, p + ph.value.length - l); } catch {} });
    sh.setFoot(`<div style="display:flex;gap:10px"><button class="btn icon lg" id="back" aria-label="Назад">${icon('back')}</button><button class="btn primary lg" style="flex:1" id="send">Записаться</button></div>`);
    $('#back', sh.foot).onclick = () => go('time');
    const submit = async () => {
      const f = $('#bf', sh.body);
      const data = Object.fromEntries(new FormData(f));
      if (data.name.trim().length < 2) { toast('Напишите имя', { error: true }); f.name.focus(); return; }
      if (data.phone.replace(/\D/g, '').length < 11) { toast('Проверьте номер телефона', { error: true }); f.phone.focus(); return; }
      if (!f.consent.checked) { toast('Отметьте согласие на обработку данных', { error: true }); return; }
      LS.set('me', { name: data.name.trim(), phone: data.phone, car: data.car.trim(), consent: true });
      const btn = $('#send', sh.foot); busy(btn);
      try {
        const r = await API('/bookings', { method: 'POST', body: { serviceId: st.svc.id, date: st.date, time: st.time, ...data, consent: true } });
        my.upsert({ ...r.booking, calendar: r.calendar });
        sh.close();
        showDone(r.booking, r.calendar);
      } catch (e) {
        busy(btn, false);
        toast(e.message, { error: true, ms: 4000 });
        if (e.status === 409) { st.time = null; st.days = []; st.loaded = null; go('time'); }
      }
    };
    $('#send', sh.foot).onclick = submit;
    $('#bf', sh.body).onsubmit = (e) => { e.preventDefault(); submit(); };
  }

  draw();
}

// ——— После записи ———
function showDone(b, cal) {
  const sp = { start: b.start, end: b.end };
  const multi = b.end.slice(0, 10) !== b.start.slice(0, 10);
  const sh = sheet({ title: '' });
  sh.setBody(`<div class="done-hero"><div class="done-check">${icon('check')}</div><h2>Вы записаны</h2>
    <p>${esc(b.serviceName)}<br><b style="color:var(--text)">${esc(cap(fmtDayRel(b.start.slice(0, 10), today())))}, ${b.start.slice(11)}</b>${multi ? ` — до ${esc(fmtDay(b.end.slice(0, 10), { wd: false }))}` : ''}</p>
    <p class="dim" style="margin-top:8px;font-size:13px">Номер записи ${esc(b.code)} · ${esc(S.address || '')}</p></div>
    <div id="remindBox"></div>`);
  sh.setFoot(`<button class="btn lg block" data-close>Готово</button>`);
  reminderBox($('#remindBox', sh.body), b, cal);
  void sp;
}

/** Блок «Напомнить за сутки». Если уведомления недоступны — добавить в календарь. */
function reminderBox(el, b, cal) {
  const hoursLeft = (toMin(b.start) - nowMin()) / 60;
  const calBtns = `<div class="c-row">${cal.ics ? `<a class="btn" href="${esc(cal.ics)}">${icon('cal')} ${isIOS() ? 'Календарь iPhone' : 'Скачать .ics'}</a>` : ''}<a class="btn" href="${esc(cal.google)}" target="_blank" rel="noopener">Google Календарь</a></div>`;
  const iosNeedsInstall = isIOS() && !isStandalone();
  if (hoursLeft < 24) {
    el.innerHTML = `<div class="remind"><div class="remind-top"><div class="remind-ico">${icon('cal')}</div><div><b>Добавьте в календарь</b><small>До визита меньше суток — сохраните запись, чтобы не забыть адрес и время.</small></div></div>${calBtns}</div>`;
    return;
  }
  if (b.reminder) {
    el.innerHTML = `<div class="remind on"><div class="remind-top"><div class="remind-ico">${icon('bell')}</div><div><b>Напоминание включено</b><small>Пришлём уведомление за сутки до визита.</small></div></div>${calBtns}</div>`;
    return;
  }
  if (!pushPossible() || iosNeedsInstall || Notification.permission === 'denied') {
    const why = iosNeedsInstall ? 'На iPhone уведомления работают, когда приложение добавлено на экран «Домой». А пока — добавьте запись в календарь: он напомнит за сутки.'
      : Notification?.permission === 'denied' ? 'Уведомления отключены в браузере. Добавьте запись в календарь — он напомнит за сутки.'
        : 'Добавьте запись в календарь — он напомнит за сутки до визита.';
    el.innerHTML = `<div class="remind"><div class="remind-top"><div class="remind-ico">${icon('bell')}</div><div><b>Напомнить за сутки</b><small>${esc(why)}</small></div></div>${calBtns}
      ${iosNeedsInstall ? `<button class="btn ghost sm" id="howInstall" style="justify-self:start">${icon('share', 'sm')} Как добавить на экран «Домой»</button>` : ''}</div>`;
    $('#howInstall', el)?.addEventListener('click', install);
    return;
  }
  el.innerHTML = `<div class="remind"><div class="remind-top"><div class="remind-ico">${icon('bell')}</div><div><b>Напомнить за сутки?</b><small>Пришлём уведомление накануне — с адресом и временем.</small></div></div>
    <button class="btn primary block" id="pushOn">${icon('bell')} Включить напоминание</button>
    <details><summary class="muted" style="font-size:14px;cursor:pointer">Или добавить в календарь</summary><div style="margin-top:10px">${calBtns}</div></details></div>`;
  $('#pushOn', el).onclick = async (e) => {
    const btn = e.currentTarget; busy(btn);
    try {
      await enablePush(b);
      b.reminder = true; my.upsert({ ...b, calendar: cal });
      reminderBox(el, b, cal);
      toast('Напомним за сутки');
    } catch (err) {
      busy(btn, false);
      el.innerHTML = `<div class="remind"><div class="remind-top"><div class="remind-ico">${icon('cal')}</div><div><b>Уведомления не включились</b><small>${esc(err.message)} Добавьте запись в календарь — он напомнит за сутки.</small></div></div>${calBtns}</div>`;
    }
  };
}

async function enablePush(b) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Разрешение не выдано.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = Uint8Array.from(atob(S.vapidKey.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((S.vapidKey.length + 3) % 4)), (c) => c.charCodeAt(0));
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  await API(`/bookings/${b.token}/reminder`, { method: 'POST', body: { subscription: sub.toJSON() } });
}

// ——— Мои записи ———
async function openMy(focusToken) {
  const sh = sheet({ title: 'Мои записи' });
  const draw = () => {
    const list = my.list().filter((b) => toMin(b.end || b.start) > nowMin() - 7 * 1440).sort((a, b) => b.start.localeCompare(a.start));
    if (!list.length) { sh.setBody(`<div class="empty">${icon('cal', 'lg')}<p>Здесь появятся ваши записи</p><button class="btn primary" data-newbook>Записаться</button></div>`); return; }
    sh.setBody(list.map((b) => {
      const past = toMin(b.end || b.start) < nowMin();
      const st = { booked: ['Ждём вас', 'ac'], accepted: ['Машина в работе', 'info'], ready: ['Готово', 'ok'], cancelled: ['Отменена', 'danger'] }[b.status] || ['', ''];
      return `<div class="card my-item" data-token="${esc(b.token)}" ${b.token === focusToken ? 'style="border-color:var(--accent)"' : ''}>
        <div class="h"><b>${esc(b.serviceName)}</b><span class="pill ${st[1]}"><span class="dot"></span>${st[0]}</span></div>
        <div class="when">${icon('cal', 'sm')} ${esc(cap(fmtDayRel(b.start.slice(0, 10), today())))}, ${b.start.slice(11)}${b.end.slice(0, 10) !== b.start.slice(0, 10) ? ` → ${esc(fmtDay(b.end.slice(0, 10), { wd: false }))}` : ''}</div>
        <div class="muted" style="font-size:13px">Запись ${esc(b.code)} · ${esc(fmtMoney(b.price, S.currency))}${b.priceFrom ? '' : ''}</div>
        ${b.status === 'booked' && !past ? `<div class="c-row"><button class="btn sm" data-remind>${icon('bell', 'sm')} Напоминание</button><button class="btn sm danger" data-cancel>Отменить</button></div><div class="rb"></div>` : `<div class="c-row"><button class="btn sm ghost" data-forget>${icon('trash', 'sm')} Удалить мои данные</button></div>`}
      </div>`;
    }).join('') + `<button class="btn ghost sm" data-wipe style="margin-top:8px">Стереть список записей с этого устройства</button>
      <p class="dim" style="font-size:12px;margin:10px 0 0">Список хранится только в вашем браузере. <a href="${LINKS.privacy}" ${ext(LINKS.privacy)} style="text-decoration:underline">Как мы обращаемся с данными</a></p>`);
  };
  draw();
  sh.body.onclick = async (e) => {
    if (e.target.closest('[data-newbook]')) { sh.close(); openBooking({}); return; }
    const w = e.target.closest('[data-wipe]');
    if (w) {
      if (!w.dataset.sure) { w.dataset.sure = 1; w.textContent = 'Точно стереть? Записи в студии останутся'; return; }
      try { for (const k of Object.keys(localStorage)) if (k.startsWith(S.slug + ':')) localStorage.removeItem(k); sessionStorage.removeItem(`${S.slug}:chat`); } catch {}
      chat.log = []; chat.ctx = {}; renderTop(); draw(); toast('Данные на устройстве стёрты'); return;
    }
    const item = e.target.closest('[data-token]'); if (!item) return;
    const b = my.list().find((x) => x.token === item.dataset.token);
    const fg = e.target.closest('[data-forget]');
    if (fg) {
      if (!fg.dataset.sure) { fg.dataset.sure = 1; fg.textContent = 'Удалить имя и телефон из записи?'; return; }
      try { await API(`/bookings/${b.token}/forget`, { method: 'POST' }); my.save(my.list().filter((x) => x.token !== b.token)); renderTop(); draw(); toast('Ваши данные удалены'); }
      catch (err) { toast(err.message, { error: true }); }
      return;
    }
    if (e.target.closest('[data-remind]')) { reminderBox($('.rb', item), b, b.calendar || { ics: `${BASE}/api/bookings/${b.token}/ics`, google: '#' }); return; }
    const c = e.target.closest('[data-cancel]');
    if (c) {
      if (!c.dataset.sure) { c.dataset.sure = 1; c.textContent = 'Точно отменить?'; c.classList.add('primary'); setTimeout(() => { if (c.isConnected) { delete c.dataset.sure; c.textContent = 'Отменить'; c.classList.remove('primary'); } }, 4000); return; }
      busy(c);
      try { const r = await API(`/bookings/${b.token}/cancel`, { method: 'POST' }); my.upsert({ ...b, ...r.booking }); toast('Запись отменена'); draw(); }
      catch (err) { busy(c, false); toast(err.message, { error: true }); }
    }
  };
  // Обновить статусы с сервера
  for (const b of my.list()) {
    API(`/bookings/${b.token}`).then((r) => { my.upsert({ ...b, ...r.booking, calendar: r.calendar }); if (!sh.closed) draw(); }).catch((e) => { if (e.status === 404) { my.save(my.list().filter((x) => x.token !== b.token)); if (!sh.closed) draw(); } });
  }
}

// ——— Помощник ———
const chat = { log: [], ctx: {} };
try { const saved = JSON.parse(sessionStorage.getItem(`${S.slug}:chat`)); if (saved) Object.assign(chat, saved); } catch {}
const saveChat = () => { try { sessionStorage.setItem(`${S.slug}:chat`, JSON.stringify({ log: chat.log.slice(-40), ctx: chat.ctx })); } catch {} };

function openChat(first) {
  closeAllSheets();
  const sh = sheet({ title: `${icon('spark')} Помощник`, cls: 'tall' });
  sh.head.style.cssText = 'display:flex;align-items:center;gap:8px';
  sh.setBody(`<div class="chat" id="chatLog"></div>`);
  sh.setFoot(`<form class="chat-input" id="chatForm"><input class="input" name="q" placeholder="Спросите что угодно о студии" autocomplete="off" enterkeyhint="send"><button class="btn primary icon" aria-label="Отправить">${icon('send')}</button></form>`);
  const log = $('#chatLog', sh.body);
  const form = $('#chatForm', sh.foot);

  const add = (m, animate = true) => {
    if (m.role === 'me') log.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(m.text)}</div>`);
    else {
      log.insertAdjacentHTML('beforeend', `<div class="msg bot">${richText(m.text)}</div>`);
      if (m.chips?.length) {
        const wrap = document.createElement('div'); wrap.className = 'msg-chips';
        m.chips.forEach((c, i) => {
          const el = document.createElement(c.href ? 'a' : 'button');
          el.className = 'chip' + (c.book && c.book.time ? ' on' : c.book ? ' ac' : '');
          el.textContent = c.label;
          if (c.href) { el.href = c.href; if (/^https?:/.test(c.href)) { el.target = '_blank'; el.rel = 'noopener'; } }
          else el.onclick = () => {
            if (c.book) { sh.close(); openBooking(c.book); }
            else if (c.action === 'my') { sh.close(); openMy(); }
            else if (c.send) ask(c.send);
          };
          wrap.append(el);
          void i;
        });
        log.append(wrap);
      }
    }
    if (!animate) $$('.msg, .msg-chips', log).forEach((x) => (x.style.animation = 'none'));
    requestAnimationFrame(() => { sh.body.scrollTop = sh.body.scrollHeight; });
  };

  const greet = { role: 'bot', text: `Здравствуйте! Я помощник «${S.name}». Отвечу про цены, свободное время и как нас найти.`, chips: S.examples.map((q) => ({ label: q, send: q })) };
  if (!chat.log.length) chat.log.push(greet);
  chat.log.forEach((m) => add(m, false));

  async function ask(text) {
    text = String(text || '').trim(); if (!text) return;
    const me = { role: 'me', text }; chat.log.push(me); add(me);
    log.insertAdjacentHTML('beforeend', '<div class="msg bot typing" id="typing"><i></i><i></i><i></i></div>');
    sh.body.scrollTop = sh.body.scrollHeight;
    try {
      const [r] = await Promise.all([API('/assistant', { method: 'POST', body: { message: text, context: chat.ctx } }), new Promise((ok) => setTimeout(ok, 350))]);
      $('#typing', log)?.remove();
      chat.ctx = r.context || {};
      const m = { role: 'bot', text: r.text, chips: r.chips };
      chat.log.push(m); add(m);
    } catch (e) {
      $('#typing', log)?.remove();
      const m = { role: 'bot', text: e.message || 'Нет связи. Попробуйте ещё раз.' }; chat.log.push(m); add(m);
    }
    saveChat();
  }
  form.onsubmit = (e) => { e.preventDefault(); const q = form.q.value; form.q.value = ''; ask(q); };
  if (first) ask(first); else if (matchMedia('(pointer:fine)').matches) form.q.focus();
}

// ——— Установка на экран ———
let deferredPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('#installBtn')?.classList.remove('hidden'); });
addEventListener('appinstalled', () => { $('#installBtn')?.classList.add('hidden'); toast('Приложение добавлено на экран'); });
async function install() {
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(() => {}); deferredPrompt = null; $('#installBtn')?.classList.add('hidden'); return; }
  const ios = isIOS();
  sheet({ title: 'Добавить на экран', body: `<div class="install-hint"><p style="margin:0">Приложение «${esc(S.name)}» будет открываться с главного экрана — без адресной строки, со своей иконкой.</p>
    <ol>${ios ? `<li>Нажмите <b>«Поделиться»</b> ${icon('share', 'sm')} внизу экрана Safari</li><li>Выберите <b>«На экран „Домой“»</b></li><li>Нажмите <b>«Добавить»</b></li>`
      : `<li>Откройте меню браузера <b>⋮</b></li><li>Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b></li>`}</ol></div>` });
}
function maybeShowInstall() {
  if (isStandalone() || (window.__DEMO__ && !window.__CAN_INSTALL__)) return;
  if (isIOS()) $('#installBtn')?.classList.remove('hidden');
}

// ——— Старт ———
render();
maybeShowInstall();
if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
const qp = new URLSearchParams(location.search);
if (qp.get('booking')) {
  const t = qp.get('booking');
  history.replaceState(null, '', `${BASE}/`);
  API(`/bookings/${t}`).then((r) => { my.upsert({ ...r.booking, calendar: r.calendar }); openMy(t); }).catch(() => {});
} else if (qp.has('book')) { history.replaceState(null, '', `${BASE}/`); openBooking({ serviceId: qp.get('book') || undefined }); }
else if (qp.has('ask')) { history.replaceState(null, '', `${BASE}/`); openChat(qp.get('ask') || undefined); }
void fromMin;
