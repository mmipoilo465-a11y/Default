// Кабинет владельца.
import { esc, $, $$, icon, api, toast, sheet, richText, formatPhone, applyAccent, busy, resizeImage, iconFromLogo, pickFile } from './ui.js';
import { fmtDay, fmtDayRel, fmtDuration, fmtPrice, fmtMoney, fmtRange, toMin, addDays, startOfWeek, weekday, WD_SHORT, WD_ORDER, WD_NAME, plural } from '/core/time.js';
import { paidOf, dueOf, STATUS } from '/core/stats.js';

const BOOT = window.__BOOT__;
const BASE = `/${BOOT.slug}`;
const A = (p, o) => api(`${BASE}/api/admin${p}`, o);
const LINKS = { site: `${BASE}/`, privacy: `${BASE}/privacy`, ...(window.__LINKS__ || {}) };
const ext = (href) => (href.startsWith('#') ? '' : 'target="_blank"');
applyAccent(BOOT.accent);

const st = { cfg: null, today: null, view: 'bookings', mode: 'day', date: null, data: null, setTab: 'studio', chat: [] };
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const money = (n) => fmtMoney(n, st.cfg?.currency || '₽');
const boxName = (id) => st.cfg.boxes.find((b) => b.id === id)?.name || '—';
const svcOf = (id) => st.cfg.services.find((s) => s.id === id);
const METHODS = ['Наличные', 'Карта', 'Перевод'];

// ——— Вход ———
let loginPassword = ''; // нужен один раз — чтобы сразу предложить сменить стартовый пароль, не спрашивая его снова
const pwProblem = (pw) => (pw.length < 8 ? 'Минимум 8 символов' : !/\d/.test(pw) || !/\D/.test(pw) ? 'Нужны и буквы, и цифры' : /^start-2026$/i.test(pw) ? 'Это стартовый пароль — придумайте свой' : '');
const pwField = (label, name, auto, extra = '') => `<label class="field"><span>${label}</span><span class="pw-wrap"><input class="input" name="${name}" type="password" autocomplete="${auto}" required ${extra}><button type="button" class="pw-eye" data-eye aria-label="Показать пароль">${icon('eye')}</button></span></label>`;
function wireEyes(root) {
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-eye]'); if (!b) return; const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; });
}
function wireStrength(input, hintEl) {
  input.addEventListener('input', () => { const p = pwProblem(input.value); hintEl.textContent = input.value ? (p || 'Надёжный пароль') : 'Минимум 8 символов, буквы и цифры'; hintEl.style.color = input.value && !p ? 'var(--ok)' : ''; });
}

function renderLogin(view = 'login') {
  const demo = window.__DEMO_LOGIN__;
  const head = `<div class="login-mark">${esc(initials(BOOT.name))}</div><div><span class="eyebrow">Кабинет владельца</span><h1>${esc(BOOT.name)}</h1></div>`;
  if (view === 'recover') {
    $('#app').innerHTML = `<div class="login"><form class="card login-card" id="rf">${head}
      <p class="muted" style="margin:0;font-size:14px">Введите код восстановления — его выдают вместе с паролем при подключении студии или создают в кабинете (Настройки → Доступ).</p>
      <label class="field"><span>Почта</span><input class="input" name="email" type="email" autocomplete="username" required></label>
      <label class="field"><span>Код восстановления</span><input class="input" name="code" autocomplete="one-time-code" placeholder="XXXX-XXXX-XXXX-XXXX" required style="text-transform:uppercase;letter-spacing:.08em"></label>
      ${pwField('Новый пароль', 'password', 'new-password')}<small class="dim" id="rh">Минимум 8 символов, буквы и цифры</small>
      <button class="btn primary lg block">Сменить пароль и войти</button>
      <button type="button" class="btn ghost block" id="back">← Ко входу</button></form></div>`;
    wireEyes($('#rf')); wireStrength($('#rf').password, $('#rh'));
    $('#back').onclick = () => renderLogin();
    $('#rf').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button.primary', e.target); busy(btn);
      try { await A('/recover', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Пароль изменён. Создайте новый код восстановления в настройках.', { ms: 5000 }); await start(); }
      catch (err) { busy(btn, false); toast(err.message, { error: true }); }
    };
    return;
  }
  $('#app').innerHTML = `<div class="login"><form class="card login-card" id="lf">${head}
    <label class="field"><span>Почта</span><input class="input" name="email" type="email" autocomplete="username" required></label>
    ${pwField('Пароль', 'password', 'current-password')}
    <button class="btn primary lg block">Войти</button>
    <button type="button" class="btn ghost block" id="forgot">Забыли пароль?</button>
    <a class="muted" style="font-size:14px;text-align:center" href="${LINKS.site}">← На страницу студии</a>${demo ? `<p class="dim" style="font-size:13px;margin:0;text-align:center">Демо: ${esc(demo.email)} / ${esc(demo.password)} — уже подставлены</p>` : ''}
  </form></div>`;
  wireEyes($('#lf'));
  if (demo) { $('#lf').email.value = demo.email; $('#lf').password.value = demo.password; }
  $('#forgot').onclick = () => renderLogin('recover');
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button.primary', e.target); busy(btn);
    const body = Object.fromEntries(new FormData(e.target));
    try { await A('/login', { method: 'POST', body }); loginPassword = body.password; await start(); }
    catch (err) { busy(btn, false); toast(err.message, { error: true }); }
  };
}

/** После входа со стартовым паролем — сразу предлагаем придумать свой. */
function askNewPassword() {
  const sh = sheet({ title: 'Придумайте свой пароль' });
  sh.setBody(`<form class="form" id="np">
    <p class="muted" style="margin:0">Сейчас вход по стартовому паролю, который вам выдали. Замените его на свой — так в кабинет сможете зайти только вы.</p>
    ${loginPassword ? '' : pwField('Текущий пароль', 'old', 'current-password')}
    ${pwField('Новый пароль', 'password', 'new-password')}
    ${pwField('Повторите новый пароль', 'repeat', 'new-password')}
    <small class="dim" id="nh">Минимум 8 символов, буквы и цифры</small></form>`);
  sh.setFoot(`<div style="display:flex;gap:10px"><button class="btn lg" data-close>Позже</button><button class="btn primary lg" style="flex:1" id="npSave">Сохранить пароль</button></div>`);
  const f = $('#np', sh.body); wireEyes(f); wireStrength(f.password, $('#nh', sh.body));
  $('#npSave', sh.foot).onclick = async (e) => {
    const d = Object.fromEntries(new FormData(f));
    const p = pwProblem(d.password); if (p) { toast(p, { error: true }); return; }
    if (d.password !== d.repeat) { toast('Пароли не совпадают', { error: true }); return; }
    const btn = e.currentTarget; busy(btn);
    try {
      await A('/password', { method: 'POST', body: { old: d.old || loginPassword, password: d.password } });
      loginPassword = ''; st.cfg.ownerMustChange = false; sh.close(); toast('Пароль сохранён');
      if (!st.cfg.ownerHasRecovery) { st.view = 'settings'; st.setTab = 'access'; draw(); }
    } catch (err) { busy(btn, false); toast(err.message, { error: true }); }
  };
}

// ——— Каркас ———
const NAV = [['bookings', 'list', 'Записи'], ['assistant', 'spark', 'Помощник'], ['settings', 'gear', 'Настройки']];
function renderShell() {
  const c = st.cfg;
  const mark = `<span class="mark">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : esc(initials(c.name))}</span>`;
  $('#app').innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand">${mark}<div><b>${esc(c.name)}</b><small>Кабинет</small></div></div>
      ${NAV.map(([k, i, l]) => `<button class="nav-a" data-nav="${k}">${icon(i)} ${l}</button>`).join('')}
      <div class="grow"></div>
      <a class="nav-a" href="${LINKS.site}" ${ext(LINKS.site)}>${icon('ext')} Страница студии</a>
      <button class="nav-a" data-logout>${icon('out')} Выйти</button>
    </aside>
    <main class="main"><div class="main-in">
      <div class="mob-brand">${mark}<b>${esc(c.name)}</b><a class="btn icon sm ghost" href="${LINKS.site}" ${ext(LINKS.site)} aria-label="Страница студии">${icon('ext', 'sm')}</a></div>
      <div id="view"></div>
    </div></main>
    <nav class="tabs">${NAV.map(([k, i, l]) => `<button data-nav="${k}">${icon(i)}<span>${l}</span></button>`).join('')}</nav>
  </div>`;
  $('#app').onclick = async (e) => {
    const n = e.target.closest('[data-nav]');
    if (n) { st.view = n.dataset.nav; draw(); scrollTo(0, 0); }
    if (e.target.closest('[data-logout]')) { await A('/logout', { method: 'POST' }).catch(() => {}); location.reload(); }
  };
  draw();
}

function draw() {
  $$('[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === st.view));
  if (st.view === 'bookings') drawBookings();
  else if (st.view === 'assistant') drawAssistant();
  else drawSettings();
}

// ——— Записи ———
function range() {
  if (st.mode === 'day') return [st.date, st.date];
  const f = startOfWeek(st.date); return [f, addDays(f, 6)];
}

async function loadBookings() {
  const [f, t] = range();
  const r = await A(`/bookings?from=${f}&to=${t}`);
  st.today = r.today; st.now = r.now;
  st.data = r;
}

async function drawBookings() {
  const v = $('#view');
  const [f, t] = range();
  const label = st.mode === 'day' ? cap(fmtDayRel(st.date, st.today)) : fmtRange(f, t);
  v.innerHTML = `<div class="page-h"><h1>Записи</h1><button class="btn primary" id="newBk">${icon('plus')} Запись</button></div>
    <div class="toolbar">
      <div class="seg"><button data-mode="day" class="${st.mode === 'day' ? 'on' : ''}">День</button><button data-mode="week" class="${st.mode === 'week' ? 'on' : ''}">Неделя</button></div>
      <div class="datenav"><button class="btn icon sm" data-shift="-1" aria-label="Раньше">${icon('left')}</button><span class="lbl">${esc(label)}</span><button class="btn icon sm" data-shift="1" aria-label="Позже">${icon('right')}</button></div>
      <span class="sp"></span>
      ${st.date !== st.today || st.mode !== 'day' ? `<button class="btn sm" data-today>Сегодня</button>` : ''}
    </div>
    <div class="kpis" id="kpis">${[1, 2, 3, 4].map(() => '<div class="card kpi skeleton" style="height:84px"></div>').join('')}</div>
    <div id="bkl"><div class="skeleton" style="height:76px;margin-bottom:8px"></div><div class="skeleton" style="height:76px"></div></div>`;
  v.onclick = (e) => {
    const m = e.target.closest('[data-mode]'), sh = e.target.closest('[data-shift]'), b = e.target.closest('[data-bk]');
    if (m) { st.mode = m.dataset.mode; drawBookings(); }
    if (sh) { st.date = addDays(st.date, Number(sh.dataset.shift) * (st.mode === 'day' ? 1 : 7)); drawBookings(); }
    if (e.target.closest('[data-today]')) { st.date = st.today; st.mode = 'day'; drawBookings(); }
    if (e.target.closest('#newBk')) openNew();
    if (b) openBooking(b.dataset.bk);
  };
  try { await loadBookings(); } catch (e) { if (e.status === 401) return renderLogin(); $('#bkl').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const s = st.data.summary;
  $('#kpis').innerHTML = `
    <div class="card kpi"><span>${icon('car', 'sm')} Заезды</span><b>${s.total}</b><small>${s.cancelled ? `отмен: ${s.cancelled}` : st.mode === 'day' ? 'за день' : 'за неделю'}</small></div>
    <div class="card kpi"><span>${icon('clock', 'sm')} В работе</span><b>${s.arrived - s.done}</b><small>ждём ещё ${s.waiting}</small></div>
    <div class="card kpi"><span>${icon('check', 'sm')} Готово</span><b>${s.done}</b><small>завершённых работ</small></div>
    <div class="card kpi ac"><span>${icon('money', 'sm')} Получено</span><b>${esc(money(s.received))}</b><small>${s.refunds ? `возвраты ${esc(money(s.refunds))}` : `по прайсу ${esc(money(s.expected))}`}</small></div>`;
  const list = st.data.bookings;
  const el = $('#bkl');
  if (st.mode === 'day') {
    const items = list.filter((b) => b.status !== 'cancelled' || b.start.slice(0, 10) === st.date);
    el.innerHTML = items.length ? `<div class="bk-list">${items.map((b) => bkRow(b, st.date)).join('')}</div>` : `<div class="card empty">${icon('cal', 'lg')}<p>На этот день записей нет</p><button class="btn" id="newBk2">${icon('plus')} Добавить запись</button></div>`;
    $('#newBk2')?.addEventListener('click', openNew);
  } else {
    const days = [...Array(7)].map((_, i) => addDays(f, i));
    el.innerHTML = days.map((d) => {
      const items = list.filter((b) => b.start.slice(0, 10) <= d && b.end.slice(0, 10) >= d && (b.status !== 'cancelled' || b.start.slice(0, 10) === d));
      const starts = items.filter((b) => b.start.slice(0, 10) === d && b.status !== 'cancelled');
      return `<div class="day-h"><b>${esc(cap(fmtDayRel(d, st.today)))}</b><span>${starts.length ? `${starts.length} ${plural(starts.length, ['заезд', 'заезда', 'заездов'])} · ${esc(money(starts.reduce((a, b) => a + b.price, 0)))}` : 'нет заездов'}</span></div>
        ${items.length ? `<div class="bk-list">${items.map((b) => bkRow(b, d)).join('')}</div>` : ''}`;
    }).join('');
  }
}

function payPill(b) {
  if (b.status === 'cancelled') return paidOf(b) > 0 ? `<span class="pill warn">не возвращено ${esc(money(paidOf(b)))}</span>` : '';
  const due = dueOf(b), paid = paidOf(b);
  if (!b.price && !paid) return '';
  if (due === 0) return `<span class="pill ok">${icon('check', 'sm')} оплачено</span>`;
  if (paid > 0) return `<span class="pill warn">долг ${esc(money(due))}</span>`;
  return `<span class="pill">${esc(money(b.price))}</span>`;
}
const stPill = (s) => `<span class="pill ${{ booked: 'ac', accepted: 'info', ready: 'ok', cancelled: 'danger' }[s]}"><span class="dot"></span>${STATUS[s]}</span>`;

function bkRow(b, day) {
  const sd = b.start.slice(0, 10), ed = b.end.slice(0, 10);
  const multi = sd !== ed;
  const t = sd === day ? b.start.slice(11) : '⋯';
  const sub = multi ? (sd === day ? `до ${fmtDay(ed, { wd: false })}` : ed === day ? `сдача ${b.end.slice(11)}` : 'в работе') : `до ${b.end.slice(11)}`;
  return `<button class="card bk s-${b.status}" data-bk="${esc(b.id)}">
    <div class="bk-t">${t}<small>${esc(sub)}</small></div>
    <div class="bk-m"><b>${esc(b.serviceName)}</b><span>${esc([b.car, b.clientName].filter(Boolean).join(' · ') || 'без данных клиента')}</span><span class="dim" style="font-size:12px">${esc(boxName(b.boxId))}${b.source === 'manual' ? ' · вручную' : ''}</span></div>
    <div class="bk-r">${stPill(b.status)}${payPill(b)}</div></button>`;
}

// ——— Карточка записи ———
async function openBooking(id) {
  const sh = sheet({ title: 'Запись', cls: 'tall' });
  let b;
  const refresh = async () => { b = (await A(`/bookings/${id}`)).booking; render(); };
  const changed = () => { if (st.view === 'bookings') drawBookings(); };

  function render() {
    sh.setTitle(esc(b.serviceName));
    const paid = paidOf(b), due = dueOf(b);
    const multi = b.start.slice(0, 10) !== b.end.slice(0, 10);
    const cancelled = b.status === 'cancelled';
    sh.setBody(`
      ${cancelled ? `<div class="note" style="background:color-mix(in srgb,var(--danger) 14%,transparent);margin:0 0 16px">${icon('x')}<span>Запись отменена${b.cancelledAt ? ' ' + esc(fmtDay(b.cancelledAt.slice(0, 10), { wd: false })) + ' в ' + b.cancelledAt.slice(11) : ''}. Бокс свободен.</span></div>` :
      `<div class="stat-seg">${['booked', 'accepted', 'ready'].map((s) => `<button data-st="${s}" class="${b.status === s ? 'on' : ''}">${s === 'ready' ? icon('check', 'sm') : ''}${{ booked: 'Записан', accepted: 'Принята', ready: 'Готова' }[s]}</button>`).join('')}</div>`}
      <div class="dl">
        <div>${icon('cal')}<div><span class="k">Когда</span>${esc(cap(fmtDayRel(b.start.slice(0, 10), st.today)))}, ${b.start.slice(11)} — ${multi ? esc(fmtDay(b.end.slice(0, 10), { wd: false })) + ', ' : ''}${b.end.slice(11)}</div></div>
        <div>${icon('box')}<div><span class="k">Бокс</span>${esc(boxName(b.boxId))}</div></div>
        <div>${icon('user')}<div><span class="k">Клиент</span>${esc(b.clientName || '—')}${b.clientPhone ? ` · <a href="tel:${esc(b.clientPhone)}">${esc(formatPhone(b.clientPhone))}</a>` : ''}</div></div>
        <div>${icon('car')}<div><span class="k">Автомобиль</span>${esc(b.car || '—')}</div></div>
        ${b.comment ? `<div>${icon('chat')}<div><span class="k">Комментарий</span>${esc(b.comment)}</div></div>` : ''}
        <div>${icon('list')}<div><span class="k">Запись</span>${esc(b.code)} · ${b.source === 'manual' ? 'добавлена вручную' : 'онлайн'} · ${esc(fmtDay(b.createdAt.slice(0, 10), { wd: false }))}${b.reminder ? ' · напоминание включено' : ''}</div></div>
      </div>
      <div class="card pay">
        <div class="pay-sum">
          <div><span>Стоимость</span><b><button data-price style="text-decoration:underline dotted;text-underline-offset:4px">${esc(money(b.price))}</button></b></div>
          <div><span>Получено</span><b style="color:var(--ok)">${esc(money(paid))}</b></div>
          <div><span>${cancelled ? 'К возврату' : 'Осталось'}</span><b style="color:${(cancelled ? paid : due) ? 'var(--warn)' : 'var(--text)'}">${esc(money(cancelled ? paid : due))}</b></div>
        </div>
        ${b.payments.map((p) => `<div class="pay-row">${icon(p.kind === 'refund' ? 'refund' : 'money', 'sm')}<span class="a ${p.kind === 'refund' ? 'neg' : ''}">${p.kind === 'refund' ? '−' : '+'}${esc(money(p.amount))}</span><span class="grow">${esc(p.method || '')} · ${esc(fmtDay(p.at.slice(0, 10), { wd: false }))} ${p.at.slice(11)}</span><button class="btn icon sm ghost" data-delpay="${esc(p.id)}" aria-label="Удалить">${icon('trash', 'sm')}</button></div>`).join('')}
        <form class="pay-form" id="payForm">
          <input class="input" name="amount" inputmode="numeric" placeholder="Сумма" value="${cancelled ? '' : due || ''}">
          <select class="input" name="method">${METHODS.map((m) => `<option>${m}</option>`).join('')}</select>
          <button class="btn primary" data-kind="payment">${icon('plus', 'sm')} Оплата</button>
          <button class="btn" data-kind="refund" ${paid ? '' : 'disabled'}>${icon('refund', 'sm')} Возврат</button>
        </form>
      </div>
      <div class="actions">
        ${!cancelled ? `<button class="btn" data-resched>${icon('cal', 'sm')} Перенести</button>` : `<button class="btn" data-restore>Восстановить</button>`}
        <button class="btn" data-edit>${icon('edit', 'sm')} Изменить данные</button>
        ${!cancelled ? `<button class="btn danger" data-cancel>Отменить запись</button>` : ''}
        ${!b.anonymized && (b.clientName || b.clientPhone) ? `<button class="btn ghost" data-anon>${icon('trash', 'sm')} Стереть данные клиента</button>` : ''}
      </div>
      ${b.anonymized ? `<p class="dim" style="font-size:13px;margin:14px 0 0">Данные клиента удалены. Услуга и оплаты сохранены для учёта.</p>` : b.consentAt ? `<p class="dim" style="font-size:13px;margin:14px 0 0">Согласие на обработку данных получено ${esc(fmtDay(b.consentAt.slice(0, 10), { wd: false }))} в ${b.consentAt.slice(11)}.</p>` : ''}`);
  }

  sh.body.onclick = async (e) => {
    const s = e.target.closest('[data-st]');
    if (s && s.dataset.st !== b.status) {
      try { b = (await A(`/bookings/${id}`, { method: 'PATCH', body: { status: s.dataset.st } })).booking; render(); changed(); toast(s.dataset.st === 'ready' ? 'Машина готова' : s.dataset.st === 'accepted' ? 'Машина принята' : 'Статус изменён'); }
      catch (err) { toast(err.message, { error: true }); }
    }
    const k = e.target.closest('[data-kind]');
    if (k) {
      e.preventDefault();
      const f = $('#payForm', sh.body);
      busy(k);
      try { b = (await A(`/bookings/${id}/payments`, { method: 'POST', body: { kind: k.dataset.kind, amount: f.amount.value, method: f.method.value } })).booking; render(); changed(); toast(k.dataset.kind === 'refund' ? 'Возврат записан' : 'Оплата внесена'); }
      catch (err) { busy(k, false); toast(err.message, { error: true }); }
    }
    const dp = e.target.closest('[data-delpay]');
    if (dp) {
      if (!dp.dataset.sure) { dp.dataset.sure = 1; dp.innerHTML = 'Удалить?'; dp.classList.remove('icon'); return; }
      b = (await A(`/bookings/${id}/payments/${dp.dataset.delpay}`, { method: 'DELETE' })).booking; render(); changed();
    }
    if (e.target.closest('[data-price]')) editDetails(true);
    if (e.target.closest('[data-edit]')) editDetails(false);
    if (e.target.closest('[data-resched]')) reschedule();
    const c = e.target.closest('[data-cancel]');
    if (c) {
      if (!c.dataset.sure) { c.dataset.sure = 1; c.textContent = 'Точно отменить?'; return; }
      b = (await A(`/bookings/${id}`, { method: 'PATCH', body: { status: 'cancelled' } })).booking; render(); changed(); toast('Запись отменена');
    }
    const an = e.target.closest('[data-anon]');
    if (an) {
      if (!an.dataset.sure) { an.dataset.sure = 1; an.textContent = 'Стереть имя, телефон, авто?'; return; }
      b = (await A(`/bookings/${id}/anonymize`, { method: 'POST' })).booking; render(); changed(); toast('Данные клиента стёрты');
    }
    if (e.target.closest('[data-restore]')) {
      try { b = (await A(`/bookings/${id}`, { method: 'PATCH', body: { status: 'booked' } })).booking; render(); changed(); }
      catch (err) { toast(err.message, { error: true }); }
    }
  };

  function editDetails(priceOnly) {
    const s2 = sheet({ title: priceOnly ? 'Стоимость' : 'Данные записи' });
    s2.setBody(`<form class="form" id="ef">
      ${priceOnly ? '' : `<label class="field"><span>Клиент</span><input class="input" name="clientName" value="${esc(b.clientName)}"></label>
      <label class="field"><span>Телефон</span><input class="input" name="clientPhone" type="tel" value="${esc(formatPhone(b.clientPhone))}"></label>
      <label class="field"><span>Автомобиль</span><input class="input" name="car" value="${esc(b.car)}"></label>
      <label class="field"><span>Комментарий</span><textarea class="input" name="comment">${esc(b.comment)}</textarea></label>`}
      <label class="field"><span>Стоимость, ${esc(st.cfg.currency)}</span><input class="input" name="price" inputmode="numeric" value="${b.price}"></label></form>`);
    s2.setFoot(`<button class="btn primary lg block" id="es">Сохранить</button>`);
    $('#es', s2.foot).onclick = async () => {
      const body = Object.fromEntries(new FormData($('#ef', s2.body)));
      try { b = (await A(`/bookings/${id}`, { method: 'PATCH', body })).booking; s2.close(); render(); changed(); toast('Сохранено'); }
      catch (err) { toast(err.message, { error: true }); }
    };
  }

  function reschedule() {
    const svc = svcOf(b.serviceId) || st.cfg.services[0];
    const s2 = sheet({ title: 'Перенести запись', cls: 'tall' });
    slotPicker(s2, { serviceId: svc.id, exclude: id, date: b.start.slice(0, 10), current: b, onPick: async ({ date, time, boxId, force }) => {
      try { b = (await A(`/bookings/${id}`, { method: 'PATCH', body: { date, time, boxId, force } })).booking; s2.close(); render(); changed(); toast(`Перенесено: ${fmtDay(date, { wd: false })}, ${time}`); return true; }
      catch (err) { if (err.data?.conflict) return 'conflict'; toast(err.message, { error: true }); return false; }
    } });
  }

  sh.setBody('<div class="skeleton" style="height:300px"></div>');
  try { await refresh(); } catch (e) { sh.setBody(`<div class="empty">${esc(e.message)}</div>`); }
}

/** Выбор даты/времени с учётом занятости (для новой записи и переноса). */
function slotPicker(sh, { serviceId, exclude, date, onPick, extraTop = '', current }) {
  const ps = { svc: serviceId, date: date && date >= st.today ? date : st.today, days: [], time: null, manual: false };
  async function load(from) {
    const r = await A(`/slots?service=${encodeURIComponent(ps.svc)}&from=${from}&days=14${exclude ? `&exclude=${exclude}` : ''}`);
    ps.days = r.days;
  }
  async function drawP() {
    const day = ps.days.find((d) => d.date === ps.date);
    const svc = svcOf(ps.svc);
    sh.setBody(`${extraTop}
      ${current ? `<div class="note plain" style="margin:0 0 16px">${icon('clock')}<span>Сейчас: ${esc(fmtDay(current.start.slice(0, 10)))}, ${current.start.slice(11)} · ${esc(boxName(current.boxId))}</span></div>` : ''}
      <div class="inline" style="margin-bottom:12px"><span class="eyebrow">${esc(svc ? fmtDuration(svc) : '')}</span><span class="sp" style="flex:1"></span><input class="input" type="date" id="pd" value="${ps.date}" style="max-width:180px;height:42px"></div>
      <div class="days" style="margin:0 -22px 16px">${ps.days.map((d) => `<button class="day ${d.date === ps.date ? 'on' : ''} ${d.times.length ? '' : 'none'}" data-day="${d.date}"><small>${WD_SHORT[weekday(d.date)]}</small><b>${+d.date.slice(8)}</b><i></i></button>`).join('')}</div>
      ${ps.manual ? `<div class="box card"><h3>Своё время</h3><p class="hint">Например, если клиент приехал без записи. Если бокс занят — система предупредит.</p>
        <div class="grid2"><label class="field"><span>Время</span><input class="input" type="time" id="mt" step="300" value="${ps.time || '10:00'}"></label>
        <label class="field"><span>Бокс</span><select class="input" id="mb"><option value="">Любой свободный</option>${st.cfg.boxes.filter((x) => x.active).map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label></div></div>`
        : day && day.times.length ? `<div class="times">${day.times.map((t) => `<button class="time ${t === ps.time ? 'on' : ''}" data-time="${t}">${t}</button>`).join('')}</div>` : `<div class="empty">${day && !day.open ? 'Выходной по графику' : 'Свободного времени нет'}</div>`}
      <button class="btn ghost sm" data-manual style="margin-top:14px">${ps.manual ? 'Показать свободное время' : 'Указать время вручную'}</button>
      <div id="conf"></div>`);
    sh.setFoot(`<button class="btn primary lg block" id="pick" ${ps.time || ps.manual ? '' : 'disabled'}>${ps.manual ? 'Сохранить' : ps.time ? `${esc(cap(fmtDayRel(ps.date, st.today)))}, ${ps.time}` : 'Выберите время'}</button>`);
    $('#pd', sh.body).onchange = async (e) => { if (!e.target.value) return; ps.date = e.target.value; ps.time = null; await load(ps.date); drawP(); };
    $('#pick', sh.foot).onclick = async (e) => {
      const btn = e.currentTarget; busy(btn);
      const time = ps.manual ? $('#mt', sh.body).value : ps.time;
      const boxId = ps.manual ? $('#mb', sh.body).value || undefined : undefined;
      const r = await onPick({ date: ps.date, time, boxId });
      if (r === 'conflict') {
        busy(btn, false);
        $('#conf', sh.body).innerHTML = `<div class="note" style="background:color-mix(in srgb,var(--warn) 14%,transparent)">${icon('clock')}<span>В это время бокс занят. Записать всё равно (с наложением)?<br><button class="btn sm" id="force" style="margin-top:10px">Да, записать</button></span></div>`;
        $('#force', sh.body).onclick = () => onPick({ date: ps.date, time, boxId, force: true });
      } else if (!r) busy(btn, false);
    };
  }
  sh.body.onclick = async (e) => {
    const d = e.target.closest('[data-day]'), t = e.target.closest('[data-time]');
    if (d) { ps.date = d.dataset.day; ps.time = null; drawP(); }
    if (t) { ps.time = t.dataset.time; drawP(); }
    if (e.target.closest('[data-manual]')) { ps.manual = !ps.manual; drawP(); }
  };
  (async () => { sh.setBody('<div class="skeleton" style="height:200px"></div>'); await load(ps.date); drawP(); })();
  return ps;
}

// ——— Новая запись ———
function openNew() {
  const sh = sheet({ title: 'Новая запись', cls: 'tall' });
  const svcs = st.cfg.services;
  const form = { serviceId: svcs[0]?.id, clientName: '', clientPhone: '', car: '', comment: '', price: '' };
  let step = 1, slot = null;
  const drawStep = () => {
    if (step === 1) {
      sh.setTitle('Новая запись');
      sh.setBody(`<div class="form">
        <label class="field"><span>Услуга</span><select class="input" id="ns">${svcs.map((s) => `<option value="${esc(s.id)}" ${s.id === form.serviceId ? 'selected' : ''}>${esc(s.name)} — ${esc(fmtPrice(s, st.cfg.currency))}</option>`).join('')}</select></label>
        <label class="field"><span>Клиент</span><input class="input" id="nn" value="${esc(form.clientName)}" placeholder="Имя"></label>
        <label class="field"><span>Телефон</span><input class="input" id="np" type="tel" value="${esc(form.clientPhone)}" placeholder="+7"></label>
        <label class="field"><span>Автомобиль</span><input class="input" id="nc" value="${esc(form.car)}" placeholder="Марка, модель, номер"></label>
        <label class="field"><span>Стоимость <span class="dim">— если отличается от прайса</span></span><input class="input" id="npr" inputmode="numeric" value="${esc(form.price)}" placeholder="${esc(String(svcOf(form.serviceId)?.price || ''))}"></label>
        <label class="field"><span>Комментарий</span><textarea class="input" id="nm">${esc(form.comment)}</textarea></label></div>`);
      $('#np', sh.body).oninput = (e) => { e.target.value = formatPhone(e.target.value); };
      sh.setFoot(`<button class="btn primary lg block" id="nx">Выбрать время ${icon('arrow')}</button>`);
      $('#nx', sh.foot).onclick = () => {
        Object.assign(form, { serviceId: $('#ns', sh.body).value, clientName: $('#nn', sh.body).value, clientPhone: $('#np', sh.body).value, car: $('#nc', sh.body).value, price: $('#npr', sh.body).value, comment: $('#nm', sh.body).value });
        step = 2; drawStep();
      };
    } else {
      sh.setTitle(`${icon('back')} Время`);
      sh.head.style.cursor = 'pointer';
      sh.head.onclick = () => { step = 1; sh.head.onclick = null; sh.head.style.cursor = ''; drawStep(); };
      slot = slotPicker(sh, { serviceId: form.serviceId, date: st.date >= st.today ? st.date : st.today, onPick: async ({ date, time, boxId, force }) => {
        try {
          const r = await A('/bookings', { method: 'POST', body: { ...form, date, time, boxId, force } });
          sh.close(); toast('Запись добавлена');
          st.date = date; st.mode = 'day'; st.view = 'bookings'; draw();
          void r; return true;
        } catch (err) { if (err.data?.conflict) return 'conflict'; toast(err.message, { error: true }); return false; }
      } });
    }
  };
  drawStep();
  void slot;
}

// ——— Помощник ———
function drawAssistant() {
  const v = $('#view');
  v.innerHTML = `<div class="page-h"><h1>Помощник</h1></div>
    <div class="card" style="padding:18px;display:flex;flex-direction:column;min-height:min(70dvh,640px)">
      <div class="chat" id="olog" style="flex:1;overflow:auto;padding-bottom:12px"></div>
      <form class="chat-input" id="of"><input class="input" name="q" placeholder="Например: сколько денег получено на неделе?" autocomplete="off" enterkeyhint="send"><button class="btn primary icon" aria-label="Отправить">${icon('send')}</button></form>
    </div>`;
  const log = $('#olog');
  const add = (m) => {
    if (m.role === 'me') log.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(m.text)}</div>`);
    else {
      log.insertAdjacentHTML('beforeend', `<div class="msg bot">${richText(m.text)}</div>`);
      const chips = [...(m.chips || [])];
      if (m.open) chips.push({ label: 'Открыть в записях →', open: m.open });
      if (chips.length) {
        const w = document.createElement('div'); w.className = 'msg-chips';
        for (const c of chips) {
          const b = document.createElement('button'); b.className = 'chip' + (c.open ? ' ac' : ''); b.textContent = c.label;
          b.onclick = () => { if (c.open) { st.date = c.open.date; st.mode = c.open.view; st.view = 'bookings'; draw(); } else ask(c.send); };
          w.append(b);
        }
        log.append(w);
      }
    }
    log.scrollTop = log.scrollHeight;
  };
  if (!st.chat.length) st.chat.push({ role: 'bot', text: 'Спросите про записи, машины и деньги — отвечаю по данным из базы.', chips: ['Что у меня завтра?', 'Сколько машин было на неделе?', 'Сколько денег получено?', 'Кто не оплатил?'].map((q) => ({ label: q, send: q })) });
  st.chat.forEach(add);
  async function ask(q) {
    q = String(q || '').trim(); if (!q) return;
    const me = { role: 'me', text: q }; st.chat.push(me); add(me);
    log.insertAdjacentHTML('beforeend', '<div class="msg bot typing" id="ot"><i></i><i></i><i></i></div>'); log.scrollTop = log.scrollHeight;
    try { const r = await A('/assistant', { method: 'POST', body: { message: q } }); $('#ot')?.remove(); const m = { role: 'bot', ...r }; st.chat.push(m); add(m); }
    catch (e) { $('#ot')?.remove(); add({ role: 'bot', text: e.message }); }
  }
  $('#of').onsubmit = (e) => { e.preventDefault(); const q = e.target.q.value; e.target.q.value = ''; ask(q); };
}

// ——— Настройки ———
const TABS = [['studio', 'Студия'], ['home', 'Главная'], ['works', 'Работы'], ['services', 'Услуги'], ['boxes', 'Боксы'], ['schedule', 'График'], ['data', 'Данные клиентов'], ['access', 'Доступ']];

function drawSettings() {
  const v = $('#view');
  v.innerHTML = `<div class="page-h"><h1>Настройки</h1></div>
    <div class="subnav">${TABS.map(([k, l]) => `<button class="chip ${st.setTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div id="panel" class="panel"></div>`;
  v.onclick = (e) => { const t = e.target.closest('[data-tab]'); if (t) { st.setTab = t.dataset.tab; drawSettings(); } };
  ({ studio: pStudio, home: pHome, works: pWorks, services: pServices, boxes: pBoxes, schedule: pSchedule, data: pData, access: pAccess })[st.setTab]($('#panel'));
}

async function savePatch(patch, btn, msg = 'Сохранено') {
  busy(btn);
  try { st.cfg = (await A('/config', { method: 'PUT', body: patch })).config; toast(msg); applyAccent(st.cfg.theme.accent); return true; }
  catch (e) { toast(e.message, { error: true }); return false; }
  finally { busy(btn, false); }
}
const saveBar = (id = 'save') => `<div class="savebar"><button class="btn primary lg" id="${id}">${icon('check')} Сохранить</button></div>`;
const fld = (label, name, val, attrs = '') => `<label class="field"><span>${label}</span><input class="input" name="${name}" value="${esc(val ?? '')}" ${attrs}></label>`;
const area = (label, name, val, attrs = '') => `<label class="field"><span>${label}</span><textarea class="input" name="${name}" ${attrs}>${esc(val ?? '')}</textarea></label>`;

function pStudio(el) {
  const c = st.cfg;
  const presets = ['#C8FF2E', '#FF6B2C', '#3DDCFF', '#FF3D6E', '#FFD23D', '#9B7BFF', '#FFFFFF'];
  el.innerHTML = `<form id="sf" class="panel">
    <div class="card box"><h3>Основное</h3>
      <div class="grid2">${fld('Название', 'name', c.name, 'required')}${fld('Тип', 'kind', c.kind, 'placeholder="Детейлинг-студия, автосервис…"')}</div>
      ${fld('Слоган на главной', 'tagline', c.tagline)}
    </div>
    <div class="card box"><h3>Логотип и главное фото</h3>
      <div class="media-row"><div class="media-prev">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : `<span class="mark" style="width:96px;height:96px;font-size:34px;border-radius:18px">${esc(initials(c.name))}</span>`}</div>
        <div style="display:grid;gap:8px"><b>Логотип</b><span class="muted" style="font-size:13px">PNG с прозрачным фоном. Станет и иконкой приложения.</span>
        <div class="inline"><button type="button" class="btn sm" id="upLogo">${icon('img', 'sm')} ${c.logo ? 'Заменить' : 'Загрузить'}</button>${c.logo ? `<button type="button" class="btn sm ghost" id="rmLogo">Убрать</button>` : ''}</div></div></div>
      <div class="media-row"><div class="media-prev wide" style="background-image:url('${esc(c.hero || '')}')"></div>
        <div style="display:grid;gap:8px"><b>Главное фото</b><span class="muted" style="font-size:13px">Горизонтальное, от 1600 px. Видно на первом экране и в превью ссылки.</span>
        <button type="button" class="btn sm" id="upHero" style="justify-self:start">${icon('img', 'sm')} Заменить фото</button></div></div>
    </div>
    <div class="card box"><h3>Фирменный цвет</h3>
      <div class="swatches">${presets.map((p) => `<button type="button" class="sw ${c.theme.accent.toUpperCase() === p ? 'on' : ''}" data-sw="${p}" style="background:${p}" aria-label="${p}"></button>`).join('')}
        <input type="color" class="sw" id="cc" value="${esc(c.theme.accent)}" title="Свой цвет"></div>
    </div>
    <div class="card box"><h3>Адрес и контакты</h3>
      <div class="grid2">${fld('Город', 'city', c.city)}${fld('Адрес', 'address', c.address)}</div>
      ${area('Как найти', 'howToFind', c.howToFind, 'rows="2" placeholder="Въезд, ворота, парковка"')}
      ${fld('Ссылка на карту <span class="dim">— необязательно</span>', 'mapUrl', c.mapUrl, 'placeholder="https://yandex.ru/maps/…"')}
      <div class="grid2">${fld('Телефон', 'phone', c.phone, 'type="tel"')}${fld('Telegram', 'telegram', c.telegram, 'placeholder="@studio"')}</div>
      <div class="grid2">${fld('WhatsApp', 'whatsapp', c.whatsapp, 'placeholder="+7…"')}${fld('Об оплате <span class="dim">— для помощника</span>', 'paymentInfo', c.paymentInfo)}</div>
    </div>
    ${saveBar()}</form>`;
  let accent = c.theme.accent;
  const setAccent = (a) => { accent = a; applyAccent(a); $$('[data-sw]', el).forEach((x) => x.classList.toggle('on', x.dataset.sw === a)); };
  el.onclick = (e) => { const s = e.target.closest('[data-sw]'); if (s) setAccent(s.dataset.sw); };
  $('#cc', el).oninput = (e) => setAccent(e.target.value.toUpperCase());
  $('#save', el).onclick = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData($('#sf', el)));
    if (await savePatch({ ...f, theme: { accent } }, e.currentTarget)) renderShell();
  };
  $('#upHero', el).onclick = () => upload('hero', 1920, 'image/jpeg', () => drawSettings());
  $('#upLogo', el).onclick = () => upload('logo', 512, 'image/png', () => renderShell());
  $('#rmLogo', el)?.addEventListener('click', async () => { st.cfg = (await A('/media', { method: 'POST', body: { kind: 'logo', remove: true } })).config; renderShell(); });
}

async function upload(kind, max, type, done, extra = {}) {
  const file = await pickFile();
  if (!file) return;
  toast('Загружаем…', { ms: 1500 });
  try {
    const dataUrl = await resizeImage(file, max, type, 0.86);
    const body = { kind, dataUrl, ...extra };
    if (kind === 'logo') { body.icon512 = await iconFromLogo(dataUrl, 512); body.icon192 = await iconFromLogo(dataUrl, 192); }
    st.cfg = (await A('/media', { method: 'POST', body })).config;
    toast('Фото обновлено');
    done && done();
  } catch (e) { toast(e.message, { error: true }); }
}

function pHome(el) {
  const c = st.cfg;
  el.innerHTML = `<form id="hf" class="panel">
    <div class="card box"><h3>Три карточки на главной</h3><p class="hint">Коротко о главных преимуществах: гарантия, условия, сервис.</p></div>
    ${c.cards.map((k, i) => `<div class="card box"><span class="eyebrow ac">Карточка 0${i + 1}</span>${fld('Заголовок', `t${i}`, k.title, 'maxlength="60"')}${area('Текст', `x${i}`, k.text, 'rows="2" maxlength="240"')}</div>`).join('')}
    <div class="card box"><h3>Подсказки помощника</h3><p class="hint">Кнопки с вопросами, которые видит клиент. Оставьте пустыми — подберутся автоматически.</p>
      ${[0, 1, 2].map((i) => fld(`Вопрос ${i + 1}`, `q${i}`, c.assistant.examples[i] || '', `placeholder="${['Когда ближайшее окно?', 'Сколько стоит полировка?', 'Как найти студию?'][i]}"`)).join('')}</div>
    ${saveBar()}</form>`;
  $('#save', el).onclick = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData($('#hf', el)));
    savePatch({ cards: [0, 1, 2].map((i) => ({ title: f[`t${i}`], text: f[`x${i}`] })), assistant: { examples: [0, 1, 2].map((i) => f[`q${i}`]) } }, e.currentTarget);
  };
}

function pWorks(el) {
  const g = st.cfg.gallery;
  el.innerHTML = `<div class="card box"><h3>Фотографии работ</h3><p class="hint">Добавьте новую карточку, замените фото или поменяйте подпись у конкретной работы — остальные останутся на месте.</p></div>
    <div class="gal">
      <button class="g-add" id="gAdd"><span class="ico">${icon('plus', 'lg')}</span>Добавить работу</button>
      ${g.map((w, i) => `<div class="card g-item" data-id="${esc(w.id)}">
        <div class="g-img" style="background-image:url('${esc(w.image)}')"><span class="pill num">${i + 1}</span></div>
        <div class="g-body">
          <div class="inline"><input class="input" data-cap value="${esc(w.caption)}" placeholder="Подпись: авто и работа" maxlength="140"><button class="btn icon sm hidden" data-savecap aria-label="Сохранить подпись">${icon('check', 'sm')}</button></div>
          <div class="g-act"><button class="btn sm" data-rep>${icon('img', 'sm')} Заменить фото</button><span class="grow"></span>
            <button class="btn icon sm ghost" data-mv="-1" ${i ? '' : 'disabled'} aria-label="Левее">${icon('left', 'sm')}</button><button class="btn icon sm ghost" data-mv="1" ${i < g.length - 1 ? '' : 'disabled'} aria-label="Правее">${icon('right', 'sm')}</button>
            <button class="btn icon sm ghost" data-del aria-label="Удалить">${icon('trash', 'sm')}</button></div>
        </div></div>`).join('')}
    </div>`;
  $('#gAdd', el).onclick = async () => {
    const file = await pickFile(); if (!file) return;
    const s2 = sheet({ title: 'Новая работа' });
    const dataUrl = await resizeImage(file, 1400, 'image/jpeg', 0.85);
    s2.setBody(`<div class="form"><div class="g-img" style="background-image:url('${dataUrl}');border-radius:16px"></div>${fld('Подпись', 'cap', '', 'id="nc" placeholder="Например: BMW X5 — полировка и керамика" maxlength="140"')}</div>`);
    s2.setFoot(`<button class="btn primary lg block" id="ga">Добавить</button>`);
    $('#ga', s2.foot).onclick = async (e) => {
      busy(e.currentTarget);
      try { st.cfg = (await A('/media', { method: 'POST', body: { kind: 'gallery-new', dataUrl, caption: $('#nc', s2.body).value } })).config; s2.close(); toast('Работа добавлена'); drawSettings(); }
      catch (err) { busy(e.currentTarget, false); toast(err.message, { error: true }); }
    };
  };
  el.oninput = (e) => { if (e.target.matches('[data-cap]')) e.target.parentElement.querySelector('[data-savecap]').classList.remove('hidden'); };
  const saveCap = async (item) => {
    const inp = $('[data-cap]', item);
    st.cfg = (await A(`/gallery/${item.dataset.id}`, { method: 'PATCH', body: { caption: inp.value } })).config;
    $('[data-savecap]', item).classList.add('hidden'); toast('Подпись сохранена');
  };
  el.onkeydown = (e) => { if (e.key === 'Enter' && e.target.matches('[data-cap]')) { e.preventDefault(); saveCap(e.target.closest('[data-id]')); } };
  el.onclick = async (e) => {
    const item = e.target.closest('[data-id]'); if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest('[data-savecap]')) saveCap(item);
    if (e.target.closest('[data-rep]')) upload('gallery-replace', 1400, 'image/jpeg', () => drawSettings(), { id });
    const mv = e.target.closest('[data-mv]');
    if (mv) { st.cfg = (await A(`/gallery/${id}`, { method: 'PATCH', body: { move: Number(mv.dataset.mv) } })).config; drawSettings(); }
    const d = e.target.closest('[data-del]');
    if (d) {
      if (!d.dataset.sure) { d.dataset.sure = 1; d.classList.remove('icon'); d.textContent = 'Удалить?'; return; }
      st.cfg = (await A(`/gallery/${id}`, { method: 'DELETE' })).config; toast('Работа удалена'); drawSettings();
    }
  };
}

function pServices(el) {
  let list = structuredClone(st.cfg.services);
  const boxes = st.cfg.boxes;
  const render = (openIdx = -1) => {
    el.innerHTML = `<div class="card box"><h3>Услуги и цены</h3><p class="hint">Длительность определяет, сколько бокс занят. Для долгих работ укажите дни — бокс будет занят все эти дни.</p></div>
      ${list.map((s, i) => `<details class="card svc-ed" data-i="${i}" ${i === openIdx ? 'open' : ''}>
        <summary><div class="n"><b>${esc(s.name)}</b><small>${esc(fmtPrice(s, st.cfg.currency))} · ${esc(fmtDuration(s))}${s.hidden ? ' · скрыта' : ''}</small></div><span class="chev">${icon('down')}</span></summary>
        <div class="in">
          <div class="grid2">${fld('Название', 'name', s.name)}${fld('Категория', 'category', s.category, 'placeholder="Кузов, Салон, ТО…"')}</div>
          <div class="row3">
            <label class="field"><span>Цена, ${esc(st.cfg.currency)}</span><input class="input" name="price" inputmode="numeric" value="${s.price}"></label>
            <label class="field"><span>Длительность</span><select class="input" name="dtype"><option value="min" ${!s.days ? 'selected' : ''}>Часы</option><option value="days" ${s.days ? 'selected' : ''}>Дни (машина остаётся)</option></select></label>
            <label class="field"><span>${s.days ? 'Рабочих дней' : 'Часов'}</span><input class="input" name="dval" inputmode="decimal" value="${s.days ? s.days : +((s.durationMin || 60) / 60).toFixed(2)}"></label>
          </div>
          ${area('Описание', 'description', s.description, 'rows="2"')}
          ${fld('Слова для помощника <span class="dim">— через запятую</span>', 'keywords', (s.keywords || []).join(', '), 'placeholder="керамика, защита кузова"')}
          <div class="field"><span>В каких боксах делается <span class="dim">— ничего не отмечено = во всех</span></span><div class="checks">${boxes.map((b) => `<label class="check"><input type="checkbox" name="box" value="${esc(b.id)}" ${(s.boxes || []).includes(b.id) ? 'checked' : ''}>${esc(b.name)}</label>`).join('')}</div></div>
          <div class="checks"><label class="check"><input type="checkbox" name="priceFrom" ${s.priceFrom ? 'checked' : ''}>Цена «от»</label><label class="check"><input type="checkbox" name="popular" ${s.popular ? 'checked' : ''}>Хит</label><label class="check"><input type="checkbox" name="hidden" ${s.hidden ? 'checked' : ''}>Скрыть от клиентов</label></div>
          <div class="actions"><button type="button" class="btn sm" data-mv="-1" ${i ? '' : 'disabled'}>${icon('up', 'sm')} Выше</button><button type="button" class="btn sm" data-mv="1" ${i < list.length - 1 ? '' : 'disabled'}>${icon('down', 'sm')} Ниже</button><span style="flex:1"></span><button type="button" class="btn sm danger" data-del>Удалить</button></div>
        </div></details>`).join('')}
      <button class="btn block" id="addSvc">${icon('plus')} Добавить услугу</button>
      ${saveBar()}`;
  };
  const collect = () => {
    $$('[data-i]', el).forEach((d) => {
      const s = list[+d.dataset.i];
      const v = (n) => $(`[name=${n}]`, d);
      s.name = v('name').value; s.category = v('category').value; s.price = Number(v('price').value.replace(/\s/g, '')) || 0;
      const dv = Number(String(v('dval').value).replace(',', '.')) || 1;
      if (v('dtype').value === 'days') { s.days = Math.max(1, Math.round(dv)); delete s.durationMin; } else { s.durationMin = Math.max(10, Math.round(dv * 60)); delete s.days; }
      s.description = v('description').value; s.keywords = v('keywords').value;
      s.boxes = $$('[name=box]:checked', d).map((x) => x.value);
      s.priceFrom = v('priceFrom').checked; s.popular = v('popular').checked; s.hidden = v('hidden').checked;
    });
  };
  render();
  el.onchange = (e) => { if (e.target.name === 'dtype') { collect(); render(+e.target.closest('[data-i]').dataset.i); } };
  el.onclick = async (e) => {
    const d = e.target.closest('[data-i]');
    const mv = e.target.closest('[data-mv]');
    if (mv && d) { collect(); const i = +d.dataset.i, j = i + Number(mv.dataset.mv); [list[i], list[j]] = [list[j], list[i]]; render(j); }
    const del = e.target.closest('[data-del]');
    if (del && d) { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'Точно удалить?'; return; } collect(); list.splice(+d.dataset.i, 1); render(); }
    if (e.target.closest('#addSvc')) { collect(); list.push({ name: 'Новая услуга', category: '', price: 0, durationMin: 60, boxes: [], description: '', keywords: [] }); render(list.length - 1); $$('[data-i]', el).at(-1).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if (e.target.closest('#save')) { collect(); if (await savePatch({ services: list }, e.target.closest('#save'))) { list = structuredClone(st.cfg.services); render(); } }
  };
}

function pBoxes(el) {
  let list = structuredClone(st.cfg.boxes);
  const render = () => {
    el.innerHTML = `<div class="card box"><h3>Боксы</h3><p class="hint">Каждый бокс принимает одну машину. Свободное время считается по всем боксам сразу.</p>
      <div class="boxes-ed">${list.map((b, i) => `<div data-i="${i}"><input class="input" value="${esc(b.name)}" data-name><label class="check" title="Принимает записи"><input type="checkbox" class="switch" data-act ${b.active ? 'checked' : ''}></label><button class="btn icon sm ghost" data-del aria-label="Удалить">${icon('trash', 'sm')}</button></div>`).join('')}</div>
      <button class="btn" id="addBox" style="justify-self:start">${icon('plus')} Добавить бокс</button>
      <p class="hint" style="margin:0">Переключатель выключает бокс без удаления — например, на ремонт.</p></div>${saveBar()}`;
  };
  const collect = () => $$('[data-i]', el).forEach((r) => { const b = list[+r.dataset.i]; b.name = $('[data-name]', r).value; b.active = $('[data-act]', r).checked; });
  render();
  el.onclick = async (e) => {
    const r = e.target.closest('[data-i]');
    if (e.target.closest('[data-del]') && r) { collect(); list.splice(+r.dataset.i, 1); render(); }
    if (e.target.closest('#addBox')) { collect(); list.push({ name: `Бокс ${list.length + 1}`, active: true }); render(); }
    if (e.target.closest('#save')) { collect(); if (await savePatch({ boxes: list }, e.target.closest('#save'))) { list = structuredClone(st.cfg.boxes); render(); } }
  };
}

function pSchedule(el) {
  const c = st.cfg;
  let sched = structuredClone(c.schedule), off = [...c.daysOff], special = structuredClone(c.specialDays || {});
  const render = () => {
    el.innerHTML = `<div class="card box"><h3>Часы работы</h3>
      <div class="sched">${WD_ORDER.map((k) => { const w = sched[k]; return `<div data-k="${k}"><span class="d">${WD_NAME[k].slice(0, 2)}</span><input type="checkbox" class="switch" data-open ${w ? 'checked' : ''} aria-label="Рабочий день">
        ${w ? `<div class="hrs"><input class="input" type="time" data-f value="${w[0]}"><span class="dim">—</span><input class="input" type="time" data-t value="${w[1]}"></div>` : `<span class="off">Выходной</span>`}</div>`; }).join('')}</div></div>
    <div class="card box"><h3>Выходные и праздники</h3><p class="hint">В эти даты запись закрыта.</p>
      <div class="tags">${off.length ? off.map((d) => `<span class="tag">${esc(fmtDay(d))}<button data-rmoff="${d}" aria-label="Убрать">${icon('x', 'sm')}</button></span>`).join('') : '<span class="dim">Нет</span>'}</div>
      <div class="inline"><input class="input" type="date" id="offd" min="${st.today}"><button class="btn" id="addOff">${icon('plus', 'sm')} Добавить</button></div></div>
    <div class="card box"><h3>Особые часы</h3><p class="hint">Например, короткий день перед праздником.</p>
      <div class="tags">${Object.keys(special).length ? Object.entries(special).sort().map(([d, w]) => `<span class="tag">${esc(fmtDay(d))}: ${w ? w.join('–') : 'выходной'}<button data-rmsp="${d}">${icon('x', 'sm')}</button></span>`).join('') : '<span class="dim">Нет</span>'}</div>
      <div class="inline"><input class="input" type="date" id="spd" min="${st.today}"><input class="input" type="time" id="spf" value="10:00" style="max-width:120px"><input class="input" type="time" id="spt" value="16:00" style="max-width:120px"><button class="btn" id="addSp">${icon('plus', 'sm')}</button></div></div>
    <div class="card box"><h3>Правила записи</h3>
      <div class="grid2">
        <label class="field"><span>Подготовка бокса между машинами, мин</span><input class="input" id="buf" type="number" min="0" max="240" step="5" value="${c.booking.bufferMinutes}"></label>
        <label class="field"><span>Шаг времени в записи, мин</span><select class="input" id="step">${[15, 20, 30, 60].map((n) => `<option ${c.booking.stepMinutes === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span>Записывать не позже чем за, ч</span><input class="input" id="lead" type="number" min="0" max="48" step="0.5" value="${c.booking.minLeadMinutes / 60}"></label>
        <label class="field"><span>Открыть запись на, дней вперёд</span><input class="input" id="hor" type="number" min="3" max="120" value="${c.booking.horizonDays}"></label>
      </div></div>${saveBar()}`;
  };
  const collect = () => $$('[data-k]', el).forEach((r) => { const k = r.dataset.k; if ($('[data-open]', r).checked) { const f = $('[data-f]', r), t = $('[data-t]', r); sched[k] = f ? [f.value, t.value] : ['09:00', '20:00']; } else sched[k] = null; });
  render();
  el.onchange = (e) => { if (e.target.matches('[data-open]')) { collect(); render(); } };
  el.onclick = async (e) => {
    if (e.target.closest('#addOff')) { const d = $('#offd', el).value; if (d && !off.includes(d)) { collect(); off.push(d); off.sort(); render(); } }
    const ro = e.target.closest('[data-rmoff]'); if (ro) { collect(); off = off.filter((d) => d !== ro.dataset.rmoff); render(); }
    if (e.target.closest('#addSp')) { const d = $('#spd', el).value; if (d) { collect(); special[d] = [$('#spf', el).value, $('#spt', el).value]; render(); } }
    const rs = e.target.closest('[data-rmsp]'); if (rs) { collect(); delete special[rs.dataset.rmsp]; render(); }
    if (e.target.closest('#save')) {
      collect();
      const bad = WD_ORDER.find((k) => sched[k] && sched[k][0] >= sched[k][1]);
      if (bad) { toast(`${WD_NAME[bad]}: время закрытия раньше открытия`, { error: true }); return; }
      savePatch({ schedule: sched, daysOff: off, specialDays: special, booking: { bufferMinutes: $('#buf', el).value, stepMinutes: $('#step', el).value, minLeadMinutes: Math.round(Number($('#lead', el).value) * 60), horizonDays: $('#hor', el).value } }, e.target.closest('#save'));
    }
  };
}

function pData(el) {
  const c = st.cfg;
  el.innerHTML = `<form class="card box" id="lf2"><h3>Оператор персональных данных</h3><p class="hint">Эти сведения попадают в политику конфиденциальности, которую видит клиент при записи.</p>
      ${fld('Юрлицо или ИП', 'operator', c.legal.operator, 'placeholder="ИП Иванов Иван Иванович"')}
      <div class="grid2">${fld('ИНН', 'inn', c.legal.inn, 'inputmode="numeric"')}${fld('Почта для запросов по данным', 'email', c.legal.email, 'type="email"')}</div>
      <label class="field"><span>Хранить имя и телефон клиента после визита, дней</span><input class="input" name="retention" type="number" min="30" max="1095" value="${c.privacy.retentionDays}"></label>
      <p class="hint" style="margin:0">Потом данные клиента стираются автоматически, а суммы и услуги остаются для отчётов. <a href="${LINKS.privacy}" ${ext(LINKS.privacy)} style="color:var(--accent)">Открыть политику</a></p>
      <button class="btn primary" style="justify-self:start" id="saveLegal">Сохранить</button></form>
    <div class="card box"><h3>Запрос клиента на удаление</h3><p class="hint">Если клиент просит удалить его данные — найдите записи по телефону и сотрите.</p>
      <div class="inline"><input class="input" id="fp" type="tel" placeholder="+7 900 000-00-00"><button class="btn" id="find">Найти</button></div><div id="found"></div></div>
    ${window.__DEMO__ ? '' : `<div class="card box"><h3>Выгрузка</h3><p class="hint">Все записи студии в таблицу (CSV, открывается в Excel). Храните файл бережно — в нём телефоны клиентов.</p>
      <a class="btn" style="justify-self:start" href="${BASE}/api/admin/export">${icon('install', 'sm')} Скачать записи</a></div>`}
    <div class="card box"><h3>Как защищены данные</h3><ul class="muted" style="margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px">
      <li>Записи вашей студии хранятся в отдельной базе — другие студии их не видят.</li>
      <li>Кабинет открывается только по вашей почте и паролю; пароль хранится в зашифрованном виде.</li>
      <li>Клиентам не нужна регистрация, рекламных счётчиков на странице нет.</li>
      <li>Каждый день делается резервная копия.</li></ul></div>`;
  $('#fp', el).oninput = (e) => { e.target.value = formatPhone(e.target.value); };
  $('#saveLegal', el).onclick = (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData($('#lf2', el))); savePatch({ legal: { operator: f.operator, inn: f.inn, email: f.email }, privacy: { retentionDays: f.retention } }, e.currentTarget); };
  $('#find', el).onclick = async () => {
    const phone = $('#fp', el).value;
    try {
      const r = await A('/privacy/find', { method: 'POST', body: { phone } });
      const box = $('#found', el);
      if (!r.bookings.length) { box.innerHTML = '<p class="muted" style="margin:0">Записей с таким телефоном нет.</p>'; return; }
      box.innerHTML = `<div class="dl" style="margin:0">${r.bookings.map((b) => `<div>${icon('user')}<div><span class="k">${esc(fmtDay(b.start.slice(0, 10)))} ${b.start.slice(11)} · ${esc(b.serviceName)}</span>${esc([b.clientName, b.car].filter(Boolean).join(' · '))}</div></div>`).join('')}</div>
        <button class="btn danger" id="forget" style="margin-top:10px">Стереть данные клиента (${r.bookings.length})</button>`;
      $('#forget', el).onclick = async (e) => {
        const btn = e.currentTarget;
        if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = 'Точно стереть? Это нельзя отменить'; return; }
        const x = await A('/privacy/forget', { method: 'POST', body: { phone } });
        box.innerHTML = `<p class="muted" style="margin:0">Готово: обезличено записей — ${x.anonymized}.</p>`;
      };
    } catch (err) { toast(err.message, { error: true }); }
  };
}

function pAccess(el) {
  const link = `${location.origin}${location.pathname.replace(/admin\/?$/, '')}`;
  el.innerHTML = `<div class="card box"><h3>Ссылка для клиентов</h3><p class="hint">Отправьте в мессенджер, поставьте в профиль на картах и в соцсетях.</p>
      <div class="link-box"><code>${esc(window.__DEMO__ ? 'появится после размещения на сервере' : link)}</code><button class="btn sm primary" id="copy" ${window.__DEMO__ ? 'disabled' : ''}>Скопировать</button></div></div>
    <form class="card box" id="pf"><h3>Пароль</h3>
      ${st.cfg.ownerMustChange ? `<div class="note" style="margin:0;background:color-mix(in srgb,var(--warn) 14%,transparent)">${icon('bell')}<span>Сейчас стоит стартовый пароль. Замените его на свой.</span></div>` : ''}
      ${pwField('Текущий пароль', 'old', 'current-password')}
      <div class="grid2">${pwField('Новый пароль', 'password', 'new-password')}${pwField('Повторите новый', 'repeat', 'new-password')}</div>
      <small class="dim" id="ph">Минимум 8 символов, буквы и цифры</small>
      <button class="btn primary" style="justify-self:start">Сменить пароль</button>
      <p class="hint" style="margin:0">После смены пароля другие устройства выйдут из кабинета.</p></form>
    <form class="card box" id="ef"><h3>Почта для входа</h3>
      <div class="grid2">${fld('Новая почта', 'email', st.cfg.ownerEmail, 'type="email" autocomplete="username" required')}${pwField('Пароль для подтверждения', 'password', 'current-password')}</div>
      <button class="btn" style="justify-self:start">Сохранить почту</button></form>
    <form class="card box" id="cf"><h3>Код восстановления</h3>
      <p class="hint">Если забудете пароль, войдёте по этому коду. Он одноразовый; новый код отменяет старый. ${st.cfg.ownerHasRecovery ? 'Код уже создан.' : '<b style="color:var(--warn)">Код ещё не создан.</b>'}</p>
      <div class="inline">${pwField('Пароль для подтверждения', 'password', 'current-password')}</div>
      <button class="btn" style="justify-self:start">${st.cfg.ownerHasRecovery ? 'Создать новый код' : 'Создать код'}</button>
      <div id="codeBox"></div></form>
    <div class="card box"><h3>Устройства</h3><p class="hint">Если входили с чужого телефона или компьютера — выйдите там удалённо.</p>
      <div class="actions"><button class="btn" id="outAll">Выйти на всех других устройствах</button><button class="btn danger" data-logout>${icon('out', 'sm')} Выйти здесь</button></div></div>
    <div class="card box"><h3>Кабинет на телефоне</h3><p class="hint">Откройте кабинет на телефоне и добавьте на главный экран: в Safari — «Поделиться» → «На экран Домой», в Chrome — меню → «Установить приложение».</p></div>`;
  wireEyes(el);
  wireStrength($('#pf', el).password, $('#ph', el));
  $('#copy', el).onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Ссылка скопирована'); } catch { toast(link); } };
  $('#pf', el).onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const p = pwProblem(d.password); if (p) { toast(p, { error: true }); return; }
    if (d.password !== d.repeat) { toast('Пароли не совпадают', { error: true }); return; }
    const btn = $('button.primary', e.target); busy(btn);
    try { await A('/password', { method: 'POST', body: { old: d.old, password: d.password } }); toast('Пароль изменён'); st.cfg = (await A('/config')).config; drawSettings(); }
    catch (err) { toast(err.message, { error: true }); busy(btn, false); }
  };
  $('#ef', el).onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button.btn:not(.pw-eye)', e.target); busy(btn);
    try { const r = await A('/email', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); st.cfg.ownerEmail = r.email; e.target.password.value = ''; toast('Почта для входа изменена'); }
    catch (err) { toast(err.message, { error: true }); } finally { busy(btn, false); }
  };
  $('#cf', el).onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button.btn:not(.pw-eye)', e.target); busy(btn);
    try {
      const r = await A('/recovery-code', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      st.cfg.ownerHasRecovery = true; e.target.password.value = '';
      $('#codeBox', el).innerHTML = `<div class="note" style="margin:0;flex-direction:column;gap:10px"><span>Сохраните код — больше он не покажется:</span>
        <div class="link-box"><code style="color:var(--text);font-size:17px;letter-spacing:.06em">${esc(r.code)}</code><button type="button" class="btn sm primary" id="cc">Скопировать</button></div></div>`;
      $('#cc', el).onclick = async () => { try { await navigator.clipboard.writeText(r.code); toast('Код скопирован'); } catch { toast(r.code, { ms: 8000 }); } };
    } catch (err) { toast(err.message, { error: true }); } finally { busy(btn, false); }
  };
  $('#outAll', el).onclick = async (e) => { busy(e.currentTarget); try { await A('/logout-all', { method: 'POST' }); toast('Другие устройства вышли из кабинета'); } catch (err) { toast(err.message, { error: true }); } finally { busy(e.currentTarget, false); } };
}

// ——— Старт ———
async function start() {
  try {
    const r = await A('/config');
    st.cfg = r.config; st.today = r.today; st.date = st.date || r.today;
    applyAccent(st.cfg.theme.accent);
    renderShell();
    if (st.cfg.ownerMustChange) askNewPassword();
  } catch (e) {
    if (e.status === 401) renderLogin();
    else { $('#app').innerHTML = `<div class="login"><div class="card login-card"><h3>Нет связи</h3><p class="muted">${esc(e.message)}</p><button class="btn" id="reload">Обновить</button></div></div>`; $('#reload').onclick = () => location.reload(); }
  }
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
start();
void toMin;
