import { ML_KEYS } from './core.js';

/* ================= COOKIE-БАННЕР ================= */
(function () {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;
  const KEY = ML_KEYS.cookie;
  if (!localStorage.getItem(KEY)) banner.hidden = false;
  const decide = choice => {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    banner.hidden = true;
  };
  document.getElementById('cookieAccept').addEventListener('click', () => decide('all'));
  document.getElementById('cookieDecline').addEventListener('click', () => decide('necessary'));
})();
