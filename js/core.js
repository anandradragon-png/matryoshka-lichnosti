/* ================= Матрёшка Личности — прототип ================= */

/* ---------- Единый реестр ключей localStorage ----------
   Все ключи хранилища собраны здесь, чтобы они не рассинхронизировались
   при правках. Добавляя новое хранилище, регистрируйте ключ в этом объекте
   и обращайтесь через ML_KEYS.<имя>, а не строкой-литералом. */
export const ML_KEYS = {
  diary: 'ml_diary',
  users: 'ml_users',
  session: 'ml_session',
  promos: 'ml_promos',
  feedback: 'ml_feedback',
  cookie: 'ml_cookie_consent',
  companies: 'ml_companies',
};

/* ---------- Мобильное меню + активная навигация ---------- */
const burger = document.getElementById('burger');
const nav = document.getElementById('mainNav');
burger.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('[data-nav]').forEach(a =>
  a.addEventListener('click', () => nav.classList.remove('open'))
);

const sections = [...document.querySelectorAll('section[id]')];
const navLinks = [...document.querySelectorAll('.main-nav a')];
window.addEventListener('scroll', () => {
  const y = window.scrollY + 120;
  let cur = '';
  sections.forEach(s => { if (s.offsetTop <= y) cur = s.id; });
  navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + cur));
});
