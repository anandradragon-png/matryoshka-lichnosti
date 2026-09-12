/* ================= ПАНЕЛЬ РАЗРАБОТЧИКА =================
   Видна только аккаунтам с ролью admin (Светлана и Альбина). Показывает то,
   что накопилось в ЭТОМ браузере: сквозной статистики по всем людям здесь
   быть не может, пока данные не собираются на сервере.

   Здесь же лежит хранилище промокодов и отзывов: кроме этой панели их никто
   не читает, а форма отзыва берёт отсюда только запись. */
import { ML_KEYS } from './core.js';
import { escapeHtml, safeParse } from './util.js';
import { openModal, closeModal, inModal, allInModal } from './modal.js';
import { loadUsers, currentUser, isAdmin } from './users.js';
import { loadEntries, entryNames, emotionColor } from './organizer.js';
import { getPlan, setPlan, nextPlan, PLAN_LABEL } from './plan.js';

export const loadFeedback = () => safeParse(localStorage.getItem(ML_KEYS.feedback), []);
export const saveFeedback = f => localStorage.setItem(ML_KEYS.feedback, JSON.stringify(f));

const loadPromos = () => safeParse(localStorage.getItem(ML_KEYS.promos), []);
const savePromos = p => localStorage.setItem(ML_KEYS.promos, JSON.stringify(p));

/* Код без похожих знаков (0/O, 1/I): его диктуют голосом и переписывают руками. */
function genPromoCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return 'MTR-' + code;
}

/* back — возврат в кабинет. Передаётся снаружи, чтобы панель не зависела от
   account.js: иначе два модуля импортировали бы друг друга по кругу. */
export function showAdminPanel(back) {
  const u = currentUser();
  if (!isAdmin(u)) return;
  const users = loadUsers();
  const entries = loadEntries();
  const promos = loadPromos();
  const feedback = loadFeedback();
  // Сводка по эмоциям с учётом мультивыбора в дневнике.
  const freq = {};
  entries.forEach(e => entryNames(e).forEach(n => { freq[n] = (freq[n] || 0) + 1; }));
  const topEmotions = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  // Тариф читается из plan.js — единственного источника правды о доступе.
  const paidCount = users.filter(x => getPlan(x.login) !== 'free').length;
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
    <div class="adm-note">⚠️ Демо-режим: показаны данные этого браузера. Сквозная статистика по всем пользователям появится, когда приложение начнёт хранить данные на сервере.</div>

    <div class="am-stats adm-stats">
      <div class="am-stat"><b>${clientUsers.length}</b><span>пользователей</span></div>
      <div class="am-stat"><b>${entries.length}</b><span>записей настроения</span></div>
      <div class="am-stat"><b>${paidCount}</b><span>на платном тарифе</span></div>
    </div>

    <div class="adm-block">
      <h4>Топ эмоций</h4>
      <div class="adm-emotions">
        ${topEmotions.length ? topEmotions.map(([n, c]) =>
          `<span class="adm-chip" style="--e:${emotionColor(n)}">${escapeHtml(n)} · ${c}</span>`).join('') : '<span class="muted">Пока нет данных</span>'}
      </div>
    </div>

    <div class="adm-block">
      <h4>Пользователи <span class="muted">(${clientUsers.length})</span></h4>
      <div class="adm-users">
        ${clientUsers.length ? clientUsers.map(x => `
          <div class="adm-user">
            <span class="adm-uname">${escapeHtml(x.name || x.login)} <i class="muted">@${escapeHtml(x.login)}</i></span>
            <button class="adm-grant ${getPlan(x.login) !== 'free' ? 'on' : ''}" data-login="${escapeHtml(x.login)}"
              title="Нажмите, чтобы сменить тариф">${PLAN_LABEL[getPlan(x.login)]}</button>
          </div>`).join('') : '<span class="muted">Зарегистрированных пользователей пока нет</span>'}
      </div>
    </div>

    <div class="adm-block">
      <h4>Промокоды</h4>
      <button class="btn btn-outline adm-newpromo" id="newPromo">＋ Сгенерировать промокод</button>
      <div class="adm-promos" id="admPromos">
        ${promos.length ? promos.map(p =>
          `<span class="adm-chip promo ${p.used ? 'used' : ''}">${escapeHtml(p.code)}${p.used ? ' · использован' : ''}</span>`).join('') : '<span class="muted">Промокодов пока нет</span>'}
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
  inModal('.am-close').onclick = closeModal;
  inModal('#backCab').onclick = () => back();
  // Смена тарифа по кругу: Базовая → Стандартная → Премиум → Базовая
  allInModal('.adm-grant').forEach(b => {
    b.onclick = () => {
      setPlan(nextPlan(getPlan(b.dataset.login)), b.dataset.login);
      showAdminPanel(back);
    };
  });
  inModal('#newPromo').onclick = () => {
    savePromos([...loadPromos(), { code: genPromoCode(), used: false, created: Date.now(), by: u.login }]);
    showAdminPanel(back);
  };
}
