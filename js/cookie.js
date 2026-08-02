import { ML_KEYS } from './core.js';

/* ================= COOKIE-БАННЕР ================= */
(function () {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;
  const KEY = ML_KEYS.cookie;
  // Чтение тоже защищаем: если localStorage заблокирован (встроенный браузер),
  // getItem бросает исключение и без try/catch уронил бы весь модуль — тогда
  // обработчики кнопок ниже не навесились бы, и баннер стал бы «неубиваемым».
  let seen = false;
  try {
    seen = !!localStorage.getItem(KEY);
  } catch (e) {
    /* хранилище недоступно — показываем баннер как впервые */
  }
  if (!seen) banner.hidden = false;
  const decide = choice => {
    // Сначала прячем баннер, затем пробуем запомнить выбор. В Telegram и других
    // встроенных браузерах localStorage может быть заблокирован — тогда запись
    // бросает исключение; баннер всё равно должен закрыться.
    banner.hidden = true;
    try {
      localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    } catch (e) {
      /* хранилище недоступно (приватный режим / встроенный браузер) — не критично */
    }
  };
  document.getElementById('cookieAccept').addEventListener('click', () => decide('all'));
  document.getElementById('cookieDecline').addEventListener('click', () => decide('necessary'));
})();
