// Политика обработки персональных данных — отдельная страница у каждой студии.
// Текст собирается из настроек студии (оператор, ИНН, почта, срок хранения).
import { escHtml as e } from './http.js';

export function privacyHtml(cfg, nonce) {
  const op = cfg.legal.operator || cfg.name;
  const contact = [cfg.legal.email && `почта ${e(cfg.legal.email)}`, cfg.phone && `телефон ${e(cfg.phone)}`].filter(Boolean).join(', ') || 'контакты на странице студии';
  const days = cfg.privacy.retentionDays;
  const months = Math.round(days / 30);
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Политика конфиденциальности · ${e(cfg.name)}</title><meta name="theme-color" content="#0A0B0D"><meta name="robots" content="noindex">
<link rel="stylesheet" href="/assets/css/base.css"><style nonce="${nonce}">
main{max-width:720px;margin:0 auto;padding:40px 16px 80px;display:grid;gap:18px}
h1{font-size:clamp(32px,6vw,48px);margin-bottom:6px}h2{font-size:21px;font-weight:800;letter-spacing:-.02em;margin-top:14px}
p,li{color:#C9CDD3;line-height:1.6;margin:0}ul{margin:0;padding-left:20px;display:grid;gap:6px}a{color:var(--accent)}
</style></head><body><main>
<a href="/${e(cfg.slug)}/" class="muted">← ${e(cfg.name)}</a>
<div><span class="eyebrow">Онлайн-запись</span><h1>Политика обработки персональных данных</h1></div>
<p>Оператор персональных данных — <b>${e(op)}</b>${cfg.legal.inn ? `, ИНН ${e(cfg.legal.inn)}` : ''}${cfg.address ? `, адрес: ${e([cfg.city, cfg.address].filter(Boolean).join(', '))}` : ''}. Связаться по вопросам данных: ${contact}.</p>
<h2>Какие данные мы получаем</h2>
<ul><li>Имя и номер телефона — чтобы подтвердить запись и связаться с вами.</li>
<li>Марка и модель автомобиля, комментарий — чтобы подготовиться к работе.</li>
<li>Выбранные услуга, дата и время.</li>
<li>Если вы включили напоминание — технический адрес для уведомления в браузере. Он удаляется после визита.</li></ul>
<p>Регистрация не нужна. Мы не используем рекламные счётчики, не продаём и не передаём данные третьим лицам для рекламы. Шрифты и файлы страницы загружаются с нашего сервера.</p>
<h2>Зачем</h2>
<p>Только для записи на услуги, напоминания о визите, связи по записи и учёта оказанных услуг и оплат.</p>
<h2>Где и сколько хранятся</h2>
<p>Данные хранятся на сервере онлайн-записи отдельно от данных других организаций. Доступ есть только у сотрудников ${e(cfg.name)} через защищённый паролем кабинет. Через ${days} дн. (около ${months} мес.) после визита имя, телефон, автомобиль и комментарий автоматически удаляются; остаётся обезличенная информация об услуге и оплате для бухгалтерского учёта.</p>
<h2>Ваши права</h2>
<p>Вы можете узнать, какие данные о вас хранятся, исправить их, отозвать согласие и потребовать удаления — напишите или позвоните нам (${contact}). Отменённую или прошедшую запись можно удалить и самостоятельно в разделе «Мои записи». Данные на вашем устройстве (список ваших записей) хранятся только в браузере, и их можно стереть там же.</p>
<h2>Согласие</h2>
<p>Отмечая согласие при записи, вы разрешаете ${e(op)} обрабатывать указанные выше данные для указанных целей на срок, указанный выше. Согласие можно отозвать в любой момент.</p>
</main></body></html>`;
}
