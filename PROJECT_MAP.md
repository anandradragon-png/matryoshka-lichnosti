# PROJECT_MAP — Матрёшка Личности (prototype)

Статический прототип. Ванильный JS, ES-модули, без сборщика, без бэкенда.
Данные — localStorage. Деплой — GitHub Pages из этой папки.

## Структура файлов

| Путь | Что это |
|---|---|
| `index.html` | Разметка всей страницы, точка входа |
| `styles.css` | Все стили |
| `report.css` | Стили отчёта (открывается в новой вкладке) |
| `dars-data.js` | База Даров/Полей (`window.YupDar`), классический скрипт |
| `js/main.js` | Точка входа ES-модулей, импортирует секции в нужном порядке |
| `js/core.js` | Меню, навигация; экспортирует `ML_KEYS` |
| `js/util.js` | `escapeHtml`, `safeParse`, `dayKey`, `trapFocus` |
| `js/scope.js` | Чьи это данные: `scopedKey(base)` — ключ дневника/журнала с привязкой к вошедшему |
| `js/practices.js` | Каталог практик и модалка |
| `js/organizer.js` | Дневник эмоций, стрик, инсайты; экспортирует `loadEntries`, `computeStreak`, `entryEmotions`, `entryNames`, `safeColor`, `NEG_NAMES` |
| `js/chat.js` | Чат-бот (демо / YandexGPT через прослойку) |
| `js/map.js` | Карта личности (Дары/Поля) |
| `js/billing.js` | Переключатель тарифов, заглушка оплаты |
| `js/account.js` | Вход/регистрация, сид-аккаунты, админка, демо-переключатель тарифа |
| `js/lead.js` | Форма заявки B2B |
| `js/corp.js` | Раздел «Матрёшка для компаний», HR-панель (показатели пока синтетические) |
| `js/cookie.js` | Cookie-баннер |
| `js/journal.js` | Журнал дня: `logEvent`, `loadEvents`, `updateEvent`, `eventsOfDay`, `eventsInPeriod`, `hasToday` |
| `js/plan.js` | Тариф: `getPlan`, `setPlan`, `planAllows`, `nextPlan` |
| `js/chat-journal.js` | Превращает реплики диалога в одно событие журнала |
| `js/report/data.js` | `collectReport(period)` — сбор данных для отчёта |
| `js/report/sections.js` | Вёрстка секций отчёта |
| `js/report/document.js` | Сборка HTML-документа отчёта |
| `js/report/launcher.js` | Открытие отчёта в новой вкладке |
| `docs/` | HTML-черновики юридических политик (152-ФЗ) |

## Тесты (`test/`)

| Файл | Покрывает |
|---|---|
| `test/smoke.test.js` | Инициализация страницы, XSS, кризис-детекция |
| `test/scope.test.js` | `scope.js`: разделение дневника и журнала между пользователями, перенос гостевых данных |
| `test/journal-core.test.js` | `journal.js`: logEvent, loadEvents, битые данные, обрезка 400, границы периодов |
| `test/plan.test.js` | `plan.js`: planAllows (эскалация прав), getPlan/setPlan, мутационная проверка |
| `test/chat-journal.test.js` | `chat-journal.js`: флаг userSpoke, одно событие на диалог, лимит 6 строк |
| `test/report-data.test.js` | `report/data.js`: пустые данные (нет NaN), weeklyTrend с выравниванием |
| `test/helpers/boot.js` | Хелпер: `freshEnv()`, `bootDomModules()` — общая инициализация |

## Ключи localStorage (все через `ML_KEYS` в `js/core.js`)

| Ключ | Что хранит |
|---|---|
| `ml_diary__<логин>` | Записи дневника эмоций конкретного человека (без входа — `ml_diary`) |
| `ml_users` | Список пользователей |
| `ml_session` | Логин текущего пользователя |
| `ml_promos` | Промо-коды |
| `ml_feedback` | Отзывы |
| `ml_cookie_consent` | Согласие с cookie |
| `ml_companies` | B2B-компании |
| `ml_journal__<логин>` | Журнал дня конкретного человека (без входа — `ml_journal`) |
| `ml_plan` | Тариф пользователей (`{ login: plan }`) |

## Куда класть новый файл

| Что за файл | Куда |
|---|---|
| Новая секция сайта (логика) | `js/<имя-секции>.js` + строка в `js/main.js` |
| Логика, которой пользуются два и более модуля | отдельный модуль с именем-существительным, не в `util.js` |
| Новый блок отчёта | функция в `js/report/sections.js`, данные для неё — в `js/report/data.js` |
| Стили отчёта | `report.css` (префикс `r-`), НЕ в `styles.css` |
| Стили приложения | `styles.css`, класс с префиксом своей секции |
| Юридический документ | `docs/` + отдельная галочка согласия в регистрации |
| Тест | `test/<модуль>.test.js` |

## Известные ограничения

| Что | Состояние |
|---|---|
| `index.html` 648 строк, `styles.css` 778 | Выше нормы. Разбиение требует сборщика, которого в проекте намеренно нет |
| `js/corp.js` 420, `js/organizer.js` 377, `js/account.js` 366, `js/practices.js` 267 | Выше нормы 250, разбиение не согласовано |
| Авторизация фейковая | Пароли в localStorage и в открытом исходнике. Привязка данных к логину (`scope.js`) разделяет людей, но не защищает: чужой ключ читается инструментами разработчика. Настоящая защита — только с сервером |
| Показатели HR-панели | Синтетические (`Math.random()` в `corp.js`), настоящего источника данных нет |

## Кто что ведёт

| Модуль | Кто |
|---|---|
| — | Свободно. Занял модуль надолго — впиши себя, освободил — вычеркни |

## Команды

```
npm test          # Vitest run (все тесты)
npm run lint      # ESLint
npm run check     # lint + test
npm run format    # Prettier
```
