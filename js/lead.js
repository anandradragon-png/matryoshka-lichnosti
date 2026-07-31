/* ================= ЗАЯВКА B2B («Запросить расчёт и демо») =================
   Открывает модалку с формой. Т.к. бэкенда нет, отправка — через mailto:
   собираем письмо на почту оператора с уже подставленными данными. Валидация
   на клиенте (обязательные поля + формат e-mail). Приёма платежей это не
   касается — здесь только сбор заявки на индивидуальный расчёт (для B2B/НКО
   допустимо: договор индивидуальный, без фиксированной абонплаты). */
import { escapeHtml } from './util.js';

const LEAD_EMAIL = 'alicat_18@mail.ru';

function buildModal() {
  let modal = document.getElementById('leadModal');
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
        <label>Телефон
          <input name="phone" type="tel" autocomplete="tel" placeholder="Необязательно" />
        </label>
        <label>Комментарий
          <textarea name="comment" rows="3" placeholder="Размер команды, задачи, сроки — что важно учесть"></textarea>
        </label>
        <p class="lead-err" hidden></p>
        <button class="btn btn-primary btn-lg lead-submit" type="submit">Отправить заявку</button>
        <p class="lead-note muted">Кнопка откроет ваш почтовый клиент с уже заполненным письмом на ${escapeHtml(LEAD_EMAIL)}.</p>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector('.lead-backdrop').addEventListener('click', closeLead);
  modal.querySelector('.lead-close').addEventListener('click', closeLead);
  modal.querySelector('.lead-form').addEventListener('submit', onSubmit);
  return modal;
}

function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const err = form.querySelector('.lead-err');
  const data = Object.fromEntries(new FormData(form).entries());
  const name = (data.name || '').trim();
  const company = (data.company || '').trim();
  const email = (data.email || '').trim();

  if (!name || !company || !email) {
    return showErr(err, 'Заполните имя, компанию и e-mail.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showErr(err, 'Проверьте формат e-mail.');
  }
  err.hidden = true;

  const phone = (data.phone || '').trim();
  const comment = (data.comment || '').trim();
  const bodyLines = [
    `Имя: ${name}`,
    `Компания: ${company}`,
    `E-mail: ${email}`,
    phone ? `Телефон: ${phone}` : null,
    '',
    comment ? `Комментарий:\n${comment}` : 'Комментарий: —',
    '',
    'Заявка отправлена с сайта «Матрёшка Личности» (раздел «Матрёшка для команд»).',
  ].filter(l => l !== null);

  const href =
    `mailto:${LEAD_EMAIL}` +
    `?subject=${encodeURIComponent('Заявка B2B — ' + company)}` +
    `&body=${encodeURIComponent(bodyLines.join('\n'))}`;
  window.location.href = href;
  closeLead();
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
