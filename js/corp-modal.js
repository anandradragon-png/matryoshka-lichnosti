/* ================= ОКНО КАБИНЕТА КОМПАНИИ =================
   Одна модалка на весь корпоративный кабинет: создание, отрисовка HTML,
   закрытие. Экранам отдаётся корневой элемент — они вешают обработчики сами. */
let modal = null;

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'corp-modal';
  modal.innerHTML = '<div class="corp-backdrop"></div><div class="corp-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(modal);
  modal.querySelector('.corp-backdrop').addEventListener('click', closeCorp);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeCorp(); });
  return modal;
}

/* Показывает HTML в модалке и возвращает её корневой элемент. */
export function render(html) {
  ensureModal();
  modal.querySelector('.corp-box').innerHTML = html;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  return modal;
}

export function closeCorp() {
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* Кнопки «×» и [data-close] закрывают окно. */
export function bindClose() {
  modal.querySelectorAll('.corp-close, [data-close]').forEach(b => (b.onclick = closeCorp));
}
