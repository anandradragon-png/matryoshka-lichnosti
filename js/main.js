/* ================= Точка входа (ES-модули) =================
   Импортирует модули ради их сайд-эффектов (инициализация секций) в порядке,
   совпадающем с картой модулей в CLAUDE.md. Зависимости (core, util, practices,
   organizer) исполняются раньше зависящих от них модулей автоматически —
   гарантия ESM. dars-data.js остаётся классическим скриптом (window.YupDar),
   подключается ДО этого модуля в index.html, поэтому map.js его уже видит. */
import './core.js';
import './util.js';
import './practices.js';
import './organizer.js';
import './chat.js';
import './map.js';
import './billing.js';
import './lead.js';
import './account.js';
import './corp.js';
import './cookie.js';
