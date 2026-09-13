/* ================= ЗАЯВКА B2B («Запросить расчёт и демо») =================
   Открывает модалку с формой. Два пути отправки:
   1) window.ML_LEAD_URL задан — заявка уходит POST-ом на сервер заявок
      (Cloud Function «сервер-заявок»: письмо оператору через SMTP Яндекса);
   2) адрес пуст или сервер недоступен — запасной путь через mailto:
      открываем почтовый клиент посетителя с готовым письмом.
   Валидация на клиенте (обязательные поля + формат e-mail). Приёма платежей
   это не касается — здесь только сбор заявки на индивидуальный расчёт (для
   B2B/НКО допустимо: договор индивидуальный, без фиксированной абонплаты). */
import { escapeHtml } from './util.js';

const LEAD_EMAIL = 'alicat_18@mail.ru';
const leadUrl = () => (typeof window !== 'undefined' && window.ML_LEAD_URL) || '';

function buildModal() {
  let modal = document.getElementById('leadModal');
  // После успешной отправки модалка «испорчена» экраном «готово» —
  // при следующем открытии строим форму заново.
  if (modal && modal.dataset.done) {
    modal.remove();
    modal = null;
  }
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'leadModal';
  modal.className = 'lead-modal';
  modal.innerHTML = `
    <div class="lead-backdrop"></div>
    <div class="lead-box" role="dialog" aria-modal="true" aria-labelledby="leadTitle">
      <button class="lead-close" type="button" aria-label="Закрыть">×</button>
      <h3 id="leadTitle">Запросить расчёт и демо</h3>
      <p class="lead-sub muted">Расскажите о задаче — рассчитаем стоимость и объём под вашу команду и вернёмся с ответом.</p>
      <form class="lead-form" novalidate>
        <label>Имя<span>*</span>
          <input name="name" type="text" required autocomplete="name" placeholder="Как к вам обращаться" />
        </label>
        <label>Компания<span>*</span>
          <input name="company" type="text" required autocomplete="organization" placeholder="Название организации" />
        </label>
        <label>E-mail<span>*</span>
          <input name="email" type="email" required autocomplete="email" placeholder="you@company.ru" />
        </label>
        <label>Телефон<span>*</span>
          <input name="phone" type="tel" required autocomplete="tel" placeholder="+7 900 000-00-00" />
        </label>
        <label>Комментарий
          <textarea name="comment" rows="3" placeholder="Размер команды, задачи, сроки — что важно учесть"></textarea>
        </label>
        <label style="display:none" aria-hidden="true">Сайт
          <input name="website" type="text" tabindex="-1" autocomplete="off" />
        </label>
        <p class="lead-err" hidden></p>
        <button class="btn btn-primary btn-lg lead-submit" type="submit">Отправить заявку</button>
        <p class="lead-note muted">${
          leadUrl()
            ? 'Заявка уйдёт прямо с сайта — мы ответим на указанные контакты.'
            : `Кнопка откроет ваш почтовый клиент с уже заполненным письмом на ${escapeHtml(LEAD_EMAIL)}.`
        }</p>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector('.lead-backdrop').addEventListener('click', closeLead);
  modal.querySelector('.lead-close').addEventListener('click', closeLead);
  modal.querySelector('.lead-form').addEventListener('submit', onSubmit);
  return modal;
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const err = form.querySelector('.lead-err');
  const data = Object.fromEntries(new FormData(form).entries());
  const name = (data.name || '').trim();
  const company = (data.company || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const comment = (data.comment || '').trim();

  if (!name || !company || !email || !phone) {
    return showErr(err, 'Заполните имя, компанию, e-mail и телефон.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showErr(err, 'Проверьте формат e-mail.');
  }
  // Телефон пишут как привыкли: со скобками, плюсом, пробелами и дефисами.
  // Придираемся только к количеству цифр — 10 (без кода страны) или 11.
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return showErr(err, 'Проверьте номер телефона — в нём должно быть не меньше 10 цифр.');
  }
  err.hidden = true;

  const lead = { name, company, email, phone, comment };

  if (!leadUrl()) {
    sendViaMail(lead);
    closeLead();
    return;
  }

  const btn = form.querySelector('.lead-submit');
  btn.disabled = true;
  btn.textContent = 'Отправляем…';
  try {
    const res = await fetch(leadUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // website — скрытое поле-приманка: человек его не видит и не заполняет,
      // сервер по нему отсеивает спам-ботов.
      body: JSON.stringify({ ...lead, website: (data.website || '').trim() }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'Не удалось отправить заявку.');
    showDone(form);
  } catch (ex) {
    // Сервер недоступен — заявку не теряем: запасной путь через почтовый клиент.
    showErr(err, `${ex.message || 'Не удалось отправить заявку.'} Открываем почтовый клиент как запасной путь.`);
    sendViaMail(lead);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Отправить заявку';
  }
}

function sendViaMail({ name, company, email, phone, comment }) {
  const bodyLines = [
    `Имя: ${name}`,
    `Компания: ${company}`,
    `E-mail: ${email}`,
    `Телефон: ${phone}`,
    '',
    comment ? `Комментарий:\n${comment}` : 'Комментарий: —',
    '',
    'Заявка отправлена с сайта «Матрёшка Личности» (раздел «Матрёшка для команд»).',
  ];
  const href =
    `mailto:${LEAD_EMAIL}` +
    `?subject=${encodeURIComponent('Заявка B2B — ' + company)}` +
    `&body=${encodeURIComponent(bodyLines.join('\n'))}`;
  window.location.href = href;
}

function showDone(form) {
  const modal = document.getElementById('leadModal');
  if (modal) modal.dataset.done = '1';
  form.innerHTML = `
    <p class="lead-done">Заявка отправлена. Мы рассчитаем стоимость под вашу
    команду и ответим на указанные контакты.</p>
    <button class="btn btn-primary btn-lg" type="button" data-lead-close>Закрыть</button>`;
  form.querySelector('[data-lead-close]').addEventListener('click', closeLead);
}

function showErr(err, msg) {
  err.textContent = msg;
  err.hidden = false;
}

function openLead() {
  const modal = buildModal();
  modal.classList.add('open');
  const first = modal.querySelector('input[name="name"]');
  if (first) first.focus();
}

function closeLead() {
  const modal = document.getElementById('leadModal');
  if (modal) modal.classList.remove('open');
}

document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-lead]');
  if (!trigger) return;
  e.preventDefault();
  openLead();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLead();
});
