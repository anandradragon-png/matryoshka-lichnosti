/**
 * Общий хелпер инициализации для тестов новых модулей.
 * Даёт свежий DOM из index.html, чистый localStorage и сброс модульного кеша.
 */
import { vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
export const bodyInner = html
  .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '');

/** Свежий DOM + чистый storage + сброс модульного кеша. */
export async function freshEnv() {
  document.body.innerHTML = bodyInner;
  localStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.scrollTo = function () {};
  window.alert = function () {};
  vi.resetModules();
}

/**
 * Импортирует модули, которым нужен DOM (core → util → practices → organizer),
 * чтобы report/data.js мог подтянуть их зависимости без ошибок.
 */
export async function bootDomModules() {
  await import('../../js/core.js');
  await import('../../js/util.js');
  await import('../../js/practices.js');
  await import('../../js/organizer.js');
}
