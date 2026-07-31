import { ML_KEYS } from './core.js';
import { escapeHtml, trapFocus } from './util.js';
import { loadEntries, computeStreak, emotionColor, entryNames } from './organizer.js';

/* ================= ЛИЧНЫЙ КАБИНЕТ (вход / регистрация) ================= */
(function account() {
  const USERS_KEY = ML_KEYS.users;
  const SESSION_KEY = ML_KEYS.session;

  const PROMO_KEY = ML_KEYS.promos;
  const FEEDBACK_KEY = ML_KEYS.feedback;

  const loadUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const saveUsers = u => localStorage.setItem(USERS_KEY, JSON.stringify(u));
  const getSession = () => localStorage.getItem(SESSION_KEY) || '';
  const setSession = login => login ? localStorage.setItem(SESSION_KEY, login) : localStorage.removeItem(SESSION_KEY);
  const findUser = login => loadUsers().find(u => u.login.toLowerCase() === String(login).trim().toLowerCase());
  const currentUser = () => findUser(getSession());
  const isAdmin = u => u && u.role === 'admin';

  const loadPromos = () => JSON.parse(localStorage.getItem(PROMO_KEY) || '[]');
  const savePromos = p => localStorage.setItem(PROMO_KEY, JSON.stringify(p));
  const loadFeedback = () => JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  const saveFeedback = f => localStorage.setItem(FEEDBACK_KEY, JSON.stringify(f));

  // Стартовые аккаунты: demo (гость) + два администратора-разработчика (Светлана и Альбина).
  (function seedAccounts() {
    const users = loadUsers();
    let changed = false;
    const ensure = u => {
      const ex = users.find(x => x.login === u.login);
      if (!ex) { users.push(u); changed = true; return; }
      // Подстраховка: гарантируем роль администратора у аккаунтов-разработчиков,
      // даже если аккаунт был создан ранней версией без роли.
      if (u.role && ex.role !== u.role) { ex.role = u.role; changed = true; }
      // Пароль сид-аккаунтов авторитетно берётся из кода: если он менялся
      // (ротация), синхронизируем существующую запись в localStorage.
      if (u.pass && ex.pass !== u.pass) { ex.pass = u.pass; changed = true; }
    };
    // ВНИМАНИЕ: это временные учётки прототипа. Проверка пароля пока идёт
    // на клиенте (localStorage), поэтому эти значения НЕ являются настоящей
    // защитой — после подключения бэкенда (post-юрлицо) вход перейдёт на
    // серверную авторизацию с хешированием паролей (bcrypt/argon2).
    // Пароли специально заменены на уникальные, не используемые на других
    // сервисах, чтобы исключить риск повторного использования.
    ensure({ name: 'Гость', login: 'demo', pass: 'demo123', created: Date.now() });
    ensure({ name: 'Светлана', login: 'sveta', pass: 'Mtr$Sv-2026-q7Xk', role: 'admin', created: Date.now() });
    ensure({ name: 'Альбина', login: 'albina', pass: 'Mtr$Al-2026-w9Rb', role: 'admin', created: Date.now() });
    if (changed) saveUsers(users);
  })();

  const authBtn = document.getElementById('authBtn');
  let modal = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'account-modal';
    modal.innerHTML = '<div class="am-backdrop"></div><div class="am-box" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modal);
    modal.querySelector('.am-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
    return modal;
  }
  let releaseTrap = null; // снятие ловушки фокуса текущей модалки
  function openModal(html) {
    ensureModal();
    const box = modal.querySelector('.am-box');
    const wasOpen = modal.classList.contains('open');
    box.innerHTML = html;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const f = box.querySelector('input');
    if (f) setTimeout(() => f.focus(), 50);
    // Ловушку и запоминание opener ставим только при первом открытии:
    // .am-box переиспользуется, при смене экранов внутри трап уже активен.
    if (!wasOpen) releaseTrap = trapFocus(box);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
  }

  /* ---- Экран входа ---- */
  function showLogin(msg) {
    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <h3 class="am-title">Вход в личный кабинет</h3>
      <p class="am-sub">Введите логин и пароль, которые вы указали при регистрации.</p>
      ${msg ? `<div class="am-error">${msg}</div>` : ''}
      <form class="am-form" id="loginForm">
        <label>Логин или e-mail<input type="text" name="login" autocomplete="username" required></label>
        <label>Пароль<input type="password" name="pass" autocomplete="current-password" required></label>
        <button type="submit" class="btn btn-primary btn-lg am-submit">Войти</button>
      </form>
      <div class="am-demo">Demo-доступ для быстрого просмотра: логин <b>demo</b> · пароль <b>demo123</b></div>
      <div class="am-switch">Нет аккаунта? <button type="button" id="toRegister">Зарегистрироваться</button></div>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelector('#toRegister').onclick = () => showRegister();
    modal.querySelector('#loginForm').onsubmit = e => {
      e.preventDefault();
      const login = e.target.login.value.trim();
      const pass = e.target.pass.value;
      const u = findUser(login);
      if (!u || u.pass !== pass) { showLogin('Неверный логин или пароль. Попробуйте ещё раз.'); return; }
      setSession(u.login);
      renderAuthState();
      showCabinet();
    };
  }

  /* ---- Экран регистрации ---- */
  function showRegister(msg) {
    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <h3 class="am-title">Регистрация</h3>
      <p class="am-sub">Придумайте логин и пароль — они понадобятся для входа в кабинет.</p>
      ${msg ? `<div class="am-error">${msg}</div>` : ''}
      <form class="am-form" id="regForm">
        <label>Как к вам обращаться<input type="text" name="name" autocomplete="name" required></label>
        <label>Логин или e-mail<input type="text" name="login" autocomplete="username" required></label>
        <label>Пароль (мин. 4 символа)<input type="password" name="pass" autocomplete="new-password" minlength="4" required></label>
        <div class="am-consents">
          <label class="am-consent"><input type="checkbox" name="c_pdn">
            <span>Я даю <a href="docs/soglasie-pdn.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a> <span class="am-consent-req">*</span></span></label>
          <label class="am-consent"><input type="checkbox" name="c_special">
            <span>Я даю <a href="docs/soglasie-spec-kategorii.html" target="_blank" rel="noopener">согласие на обработку специальных категорий данных</a> (о психоэмоциональном состоянии) <span class="am-consent-req">*</span></span></label>
          <label class="am-consent"><input type="checkbox" name="c_privacy">
            <span>Я ознакомлен(а) и принимаю <a href="docs/politika-konfidencialnosti.html" target="_blank" rel="noopener">Политику конфиденциальности</a> <span class="am-consent-req">*</span></span></label>
          <label class="am-consent"><input type="checkbox" name="c_terms">
            <span>Я принимаю <a href="docs/polzovatelskoe-soglashenie.html" target="_blank" rel="noopener">Пользовательское соглашение</a> <span class="am-consent-req">*</span></span></label>
        </div>
        <button type="submit" class="btn btn-primary btn-lg am-submit">Создать кабинет</button>
      </form>
      <div class="am-switch">Уже есть аккаунт? <button type="button" id="toLogin">Войти</button></div>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelector('#toLogin').onclick = () => showLogin();
    modal.querySelector('#regForm').onsubmit = e => {
      e.preventDefault();
      const name = e.target.name.value.trim();
      const login = e.target.login.value.trim();
      const pass = e.target.pass.value;
      if (!e.target.c_pdn.checked || !e.target.c_special.checked || !e.target.c_privacy.checked || !e.target.c_terms.checked) {
        showRegister('Чтобы создать кабинет, отметьте все четыре обязательных согласия.'); return;
      }
      if (findUser(login)) { showRegister('Такой логин уже занят. Выберите другой или войдите.'); return; }
      const users = loadUsers();
      users.push({ name, login, pass, created: Date.now(),
        consent: { pdn: true, special: true, privacy: true, terms: true, at: new Date().toISOString() } });
      saveUsers(users);
      setSession(login);
      renderAuthState();
      showCabinet();
    };
  }

  /* ---- Кабинет ---- */
  function showCabinet() {
    const u = currentUser();
    if (!u) { showLogin(); return; }
    const entries = (typeof loadEntries === 'function') ? loadEntries() : [];
    const streak = (typeof computeStreak === 'function') ? computeStreak(entries) : 0;
    const total = entries.length;
    const level = Math.min(5, 1 + Math.floor(total / 3));
    const last = entries.length ? new Date(entries[entries.length - 1].date).toLocaleDateString('ru-RU') : '—';
    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <div class="am-hello">
        <div class="am-avatar">${escapeHtml((u.name || u.login).slice(0,1).toUpperCase())}</div>
        <div>
          <h3 class="am-title">Здравствуйте, ${escapeHtml(u.name || u.login)}!</h3>
          <p class="am-sub">Ваш личный кабинет Матрёшки</p>
        </div>
      </div>
      <div class="am-stats">
        <div class="am-stat"><b>${streak}</b><span>дней подряд</span></div>
        <div class="am-stat"><b>${total}</b><span>записей в дневнике</span></div>
        <div class="am-stat"><b>${level}/5</b><span>слой матрёшки</span></div>
      </div>
      <p class="am-last">Последняя отметка: <b>${last}</b></p>
      <div class="am-actions">
        <button class="btn btn-primary" data-go="#organizer">📔 Дневник эмоций</button>
        <button class="btn btn-outline" data-go="#map">🪆 Карта личности</button>
        <button class="btn btn-outline" data-go="#practices">🧘 Практики</button>
        <button class="btn btn-outline" data-go="#bot">💬 Ассистент</button>
      </div>
      ${isAdmin(u) ? '<button class="btn btn-lg am-admin-btn" id="toAdmin">🛠 Панель разработчика</button>' : ''}
      <button class="btn btn-outline am-corp-btn" id="toCorp">🏢 Кабинет компании (HR)</button>
      <button class="btn btn-outline am-fb-btn" id="toFeedback">✍️ Оставить отзыв</button>
      <button class="am-logout" id="logoutBtn">Выйти из кабинета</button>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
      closeModal();
      const t = document.querySelector(b.dataset.go);
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });
    const adminBtn = modal.querySelector('#toAdmin');
    if (adminBtn) adminBtn.onclick = () => showAdminPanel();
    modal.querySelector('#toCorp').onclick = () => {
      closeModal();
      document.dispatchEvent(new CustomEvent('ml:corp-open'));
    };
    modal.querySelector('#toFeedback').onclick = () => showFeedbackForm();
    modal.querySelector('#logoutBtn').onclick = () => {
      setSession('');
      renderAuthState();
      closeModal();
    };
  }

  /* ---- Форма обратной связи ---- */
  function showFeedbackForm(msg) {
    const u = currentUser();
    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <h3 class="am-title">Обратная связь</h3>
      <p class="am-sub">Расскажите, что понравилось или что улучшить — это увидят разработчики.</p>
      ${msg ? `<div class="am-demo">${msg}</div>` : ''}
      <form class="am-form" id="fbForm">
        <label>Ваш отзыв<textarea name="text" rows="4" required placeholder="Ваши мысли, идеи, замечания…"></textarea></label>
        <button type="submit" class="btn btn-primary btn-lg am-submit">Отправить</button>
      </form>
      <button class="am-logout" id="fbBack">← Назад</button>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelector('#fbBack').onclick = () => showCabinet();
    modal.querySelector('#fbForm').onsubmit = e => {
      e.preventDefault();
      const text = e.target.text.value.trim();
      if (!text) return;
      const fb = loadFeedback();
      fb.push({ text, from: u ? (u.name || u.login) : 'аноним', date: Date.now() });
      saveFeedback(fb);
      showFeedbackForm('💜 Спасибо! Ваш отзыв сохранён.');
    };
  }

  /* ---- Панель разработчика (админ: Светлана и Альбина) ---- */
  function genPromoCode() {
    const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += s[Math.floor(Math.random() * s.length)];
    return 'MTR-' + c;
  }
  function showAdminPanel() {
    const u = currentUser();
    if (!isAdmin(u)) { showLogin(); return; }
    const users = loadUsers();
    const entries = loadEntries();
    const promos = loadPromos();
    const feedback = loadFeedback();
    // Сводная статистика по эмоциям (учёт мультивыбора)
    const freq = {};
    entries.forEach(e => entryNames(e).forEach(n => freq[n] = (freq[n] || 0) + 1));
    const topEmotions = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const premiumCount = users.filter(x => x.premium).length;
    const clientUsers = users.filter(x => !isAdmin(x));

    openModal(`
      <button class="am-close" aria-label="Закрыть">×</button>
      <div class="am-hello">
        <div class="am-avatar admin">🛠</div>
        <div>
          <h3 class="am-title">Панель разработчика</h3>
          <p class="am-sub">${escapeHtml(u.name || u.login)} · полный доступ</p>
        </div>
      </div>
      <div class="adm-note">⚠️ Демо-режим: показаны данные этого браузера. Сквозная статистика по всем пользователям появится после подключения серверной базы (Yandex/Astra Cloud из ТЗ).</div>

      <div class="am-stats adm-stats">
        <div class="am-stat"><b>${clientUsers.length}</b><span>пользователей</span></div>
        <div class="am-stat"><b>${entries.length}</b><span>записей настроения</span></div>
        <div class="am-stat"><b>${premiumCount}</b><span>с доступом Premium</span></div>
      </div>

      <div class="adm-block">
        <h4>Топ эмоций</h4>
        <div class="adm-emotions">
          ${topEmotions.length ? topEmotions.map(([n, c]) =>
            `<span class="adm-chip" style="--e:${emotionColor(n)}">${n} · ${c}</span>`).join('') : '<span class="muted">Пока нет данных</span>'}
        </div>
      </div>

      <div class="adm-block">
        <h4>Пользователи <span class="muted">(${clientUsers.length})</span></h4>
        <div class="adm-users">
          ${clientUsers.length ? clientUsers.map(x => `
            <div class="adm-user">
              <span class="adm-uname">${escapeHtml(x.name || x.login)} <i class="muted">@${escapeHtml(x.login)}</i></span>
              <button class="adm-grant ${x.premium ? 'on' : ''}" data-login="${escapeHtml(x.login)}">
                ${x.premium ? '✓ Premium' : 'Выдать доступ'}
              </button>
            </div>`).join('') : '<span class="muted">Зарегистрированных пользователей пока нет</span>'}
        </div>
      </div>

      <div class="adm-block">
        <h4>Промокоды</h4>
        <button class="btn btn-outline adm-newpromo" id="newPromo">＋ Сгенерировать промокод</button>
        <div class="adm-promos" id="admPromos">
          ${promos.length ? promos.map(p =>
            `<span class="adm-chip promo ${p.used ? 'used' : ''}">${p.code}${p.used ? ' · использован' : ''}</span>`).join('') : '<span class="muted">Промокодов пока нет</span>'}
        </div>
      </div>

      <div class="adm-block">
        <h4>Обратная связь <span class="muted">(${feedback.length})</span></h4>
        <div class="adm-feedback">
          ${feedback.length ? feedback.slice().reverse().map(f => `
            <div class="adm-fb">
              <span class="adm-fb-txt">${escapeHtml(f.text)}</span>
              <time>${new Date(f.date).toLocaleDateString('ru-RU')} · ${escapeHtml(f.from || 'аноним')}</time>
            </div>`).join('') : '<span class="muted">Отзывов пока нет</span>'}
        </div>
      </div>

      <button class="am-logout" id="backCab">← Назад в кабинет</button>
    `);
    modal.querySelector('.am-close').onclick = closeModal;
    modal.querySelector('#backCab').onclick = () => showCabinet();
    // Выдача/снятие Premium-доступа
    modal.querySelectorAll('.adm-grant').forEach(b => b.onclick = () => {
      const list = loadUsers();
      const target = list.find(x => x.login === b.dataset.login);
      if (target) { target.premium = !target.premium; saveUsers(list); showAdminPanel(); }
    });
    // Генерация промокода
    modal.querySelector('#newPromo').onclick = () => {
      const p = loadPromos();
      p.push({ code: genPromoCode(), used: false, created: Date.now(), by: u.login });
      savePromos(p);
      showAdminPanel();
    };
  }

  /* ---- Состояние кнопки в шапке ---- */
  function renderAuthState() {
    const u = currentUser();
    if (u) {
      authBtn.textContent = '🪆 ' + (u.name || u.login);
      authBtn.classList.add('logged');
    } else {
      authBtn.textContent = 'Войти';
      authBtn.classList.remove('logged');
    }
  }

  authBtn.addEventListener('click', () => {
    if (currentUser()) showCabinet();
    else showLogin();
  });

  // Кнопка обратной связи в блоке «Путь пользователя»
  const journeyFb = document.getElementById('journeyFeedbackBtn');
  if (journeyFb) journeyFb.addEventListener('click', () => showFeedbackForm());

  renderAuthState();
})();
