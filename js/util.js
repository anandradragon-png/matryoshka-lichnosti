/* Общие утилиты. ES-модуль: экспортирует escapeHtml для модулей, которые её используют. */
/* String(s) — подстраховка: если случайно придёт число/undefined, не роняем .replace, а экранируем как текст. */
export function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* Безопасный разбор JSON из localStorage. Если данные повреждены (кто-то
   правил хранилище руками / оборвалась запись) — возвращаем запасное значение,
   а не роняем приложение в пустой экран. Когда ждём массив (fallback = []),
   а в хранилище лежит не массив — тоже отдаём запас, чтобы .map/.find не падали. */
export function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw ?? '');
    if (v == null) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(v)) return fallback;
    return v;
  } catch {
    return fallback;
  }
}

/* Запись в localStorage с защитой от переполнения (~5 МБ на домен —
   дневник копится годами, и однажды setItem бросит исключение).
   Возвращает true/false, чтобы вызывающий мог честно сказать человеку,
   что запись не сохранилась, а не потерять её молча. */
export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn('Хранилище браузера переполнено, запись не сохранена:', key);
    return false;
  }
}

/* Календарный день метки времени. Один и тот же день в дневнике, журнале и
   отчёте должен считаться одинаково, поэтому функция живёт здесь, а не
   дублируется по модулям. Год-месяц-день локального времени пользователя. */
export const dayKey = ts => {
  const d = new Date(ts);
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
};

/* Доступность модалок: ловушка фокуса + возврат фокуса на открывавший элемент.
   Вызывать при открытии модалки; возвращает release() — вызвать при закрытии.
   Tab/Shift+Tab циклятся внутри container, фокус не «убегает» на фон. */
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function trapFocus(container) {
  const opener = document.activeElement; // куда вернуть фокус после закрытия
  const focusables = () =>
    [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(el => !el.hidden);
  function onKey(e) {
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', onKey, true);
  const firstFocusable = focusables()[0];
  if (firstFocusable) firstFocusable.focus();
  return function release() {
    document.removeEventListener('keydown', onKey, true);
    if (opener && typeof opener.focus === 'function') opener.focus();
  };
}
