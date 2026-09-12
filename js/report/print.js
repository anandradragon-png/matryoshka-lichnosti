/* ================= ОТЧЁТ: ПЕЧАТЬ =================
   Отдаёт готовый отчёт в диалог печати браузера, откуда человек выбирает
   «Сохранить в PDF».

   ПОЧЕМУ НЕ НОВАЯ ВКЛАДКА. Раньше отчёт открывался через window.open().
   Браузеры считают такую вкладку всплывающим окном и блокируют её молча:
   человек жал кнопку, и не происходило ничего. Здесь документ грузится в
   невидимую рамку на самой странице — блокировщику всплывающих окон нечего
   перехватывать.

   Рамка отодвинута за левый край экрана, а не спрятана display:none:
   спрятанный так документ часть браузеров печатать отказывается.

   Своя таблица стилей отчёта (report.css) остаётся: у рамки отдельный
   документ, стили приложения в него не попадают. */
import { PERIODS } from './data.js';
import { buildReportHtml } from './document.js';

const FRAME_ID = 'mlReportFrame';
const LOAD_LIMIT_MS = 8000;

function ensureFrame() {
  const found = document.getElementById(FRAME_ID);
  if (found) return found;
  const frame = document.createElement('iframe');
  frame.id = FRAME_ID;
  frame.title = 'Отчёт для печати';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
  document.body.appendChild(frame);
  return frame;
}

/* Собрать отчёт и открыть диалог печати. Возвращает промис: true — диалог
   показан, false — собрать не удалось (тогда наверху показываем сообщение). */
export function printReport(period = 'day') {
  return new Promise(resolve => {
    if (!PERIODS[period]) { resolve(false); return; }

    let frame;
    try {
      frame = ensureFrame();
    } catch {
      resolve(false);
      return;
    }

    let settled = false;
    const finish = ok => {
      if (settled) return;
      settled = true;
      frame.onload = null;
      clearTimeout(timer);
      resolve(ok);
    };
    // Документ не догрузился — не держим человека перед кнопкой, которая молчит.
    const timer = setTimeout(() => finish(false), LOAD_LIMIT_MS);

    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) { finish(false); return; }
      try {
        win.focus();
        win.print();
        finish(true);
      } catch {
        finish(false);
      }
    };

    try {
      // srcdoc, а не document.write: только с ним рамка сообщает о загрузке,
      // и печать уходит уже с подключённым report.css, а не голым текстом.
      frame.srcdoc = buildReportHtml(period);
    } catch {
      finish(false);
    }
  });
}
