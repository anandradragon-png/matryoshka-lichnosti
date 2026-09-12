/* ================= ТАРИФ ПОЛЬЗОВАТЕЛЯ =================
   Раньше тариф существовал только на картинке в разделе «Тарифы»: приложение
   не знало, какой доступ у человека. Отчёт трёх уровней без этого знания
   невозможен, поэтому тариф появляется здесь.

   ЭТО ДЕМО, А НЕ МОНЕТИЗАЦИЯ. Тариф лежит в localStorage и переключается
   кнопкой в личном кабинете — чтобы видеть, чем отличаются отчёты. Настоящий
   тариф придёт с приёмом оплаты и серверной проверкой; тогда getPlan() будет
   спрашивать сервер, а переключатель исчезнет. Единственное место, где
   принимается решение о доступе, — planAllows(): менять придётся одну функцию. */
import { ML_KEYS } from './core.js';
import { safeParse } from './util.js';
import { apiOn, apiCall } from './api.js';

export const PLAN_ORDER = ['free', 'standard', 'premium'];
export const PLAN_LABEL = { free: 'Базовая', standard: 'Стандартная', premium: 'Премиум' };

/* Возможность → минимальный тариф, который её открывает.
   Список читается как прайс-лист: что человек получает за деньги. */
const FEATURE_MIN_PLAN = {
  'report.day': 'free',              // отчёт за сегодня — всем, каждый день
  'report.period': 'standard',       // отчёт за неделю и месяц
  'report.insights': 'standard',     // связь сна, энергии и настроения
  'report.dar': 'standard',          // Дар и Поле в отчёте
  'report.chat': 'standard',         // выводы диалогов с ассистентом
  'report.darFull': 'premium',       // расширенная расшифровка Дара
  'report.practiceHistory': 'premium', // вся история практик, а не только за период
  'report.trends': 'premium',        // динамика по неделям
};

/* Хранилище: { "<логин>": "standard" }. Пустой логин — гость без входа,
   у него свой тариф, иначе демо-переключатель было бы негде показать. */
function loadPlans() {
  const v = safeParse(localStorage.getItem(ML_KEYS.plan), {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}
const currentLogin = () => localStorage.getItem(ML_KEYS.session) || '';

export function getPlan(login = currentLogin()) {
  const p = loadPlans()[login];
  return PLAN_ORDER.includes(p) ? p : 'free';
}

export function setPlan(plan, login = currentLogin()) {
  if (!PLAN_ORDER.includes(plan)) return;
  const all = loadPlans();
  all[login] = plan;
  localStorage.setItem(ML_KEYS.plan, JSON.stringify(all));
  // Тариф — это про деньги, поэтому при подключённом сервере он хранится там,
  // а в браузере остаётся копия для отрисовки. Не доехало — не беда: при
  // следующем входе тариф придёт с сервера и перезапишет местную копию.
  if (apiOn() && login === currentLogin()) apiCall('plan.set', { plan }).catch(() => {});
  document.dispatchEvent(new CustomEvent('ml:plan-change', { detail: { login, plan } }));
}

/* Единственная точка принятия решения о доступе. Неизвестная возможность —
   запрещена: лучше не показать блок, чем отдать платное бесплатно. А вот
   неизвестный тариф — это «free», а не «ничего»: из-за опечатки в хранилище
   человек не должен потерять даже бесплатную часть отчёта. */
export function planAllows(feature, plan = getPlan()) {
  const min = FEATURE_MIN_PLAN[feature];
  if (!min) return false;
  const safe = PLAN_ORDER.includes(plan) ? plan : 'free';
  return PLAN_ORDER.indexOf(safe) >= PLAN_ORDER.indexOf(min);
}

/* Следующий тариф по кругу — для кнопки в панели разработчика. */
export function nextPlan(plan) {
  return PLAN_ORDER[(PLAN_ORDER.indexOf(plan) + 1) % PLAN_ORDER.length];
}

/* ---- Демо-переключатель для личного кабинета ----
   Значения подставляются только из PLAN_ORDER/PLAN_LABEL (свои константы),
   пользовательского текста здесь нет — экранировать нечего. */
export function planSwitcherHtml(login = currentLogin()) {
  const cur = getPlan(login);
  return `
    <div class="plan-switch" data-plan-switch>
      <div class="plan-switch__head">
        <span class="plan-switch__lbl">Ваш тариф</span>
        <span class="plan-switch__demo">демо-режим</span>
      </div>
      <div class="plan-switch__btns" role="group" aria-label="Выбор тарифа">
        ${PLAN_ORDER.map(p => `<button type="button" class="plan-switch__btn${p === cur ? ' on' : ''}"
          data-plan="${p}" aria-pressed="${p === cur ? 'true' : 'false'}">${PLAN_LABEL[p]}</button>`).join('')}
      </div>
      <p class="plan-switch__hint">Переключите, чтобы увидеть, чем отличаются отчёты. Приём оплаты подключим позже.</p>
    </div>`;
}

export function bindPlanSwitcher(root, onChange) {
  const box = root && root.querySelector('[data-plan-switch]');
  if (!box) return;
  box.querySelectorAll('[data-plan]').forEach(b => {
    b.onclick = () => {
      setPlan(b.dataset.plan);
      if (onChange) onChange();
    };
  });
}
