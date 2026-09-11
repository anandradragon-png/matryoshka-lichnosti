/**
 * chat-journal.js — флаг userSpoke, одно событие на диалог, лимит строк.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv } from './helpers/boot.js';

beforeEach(freshEnv);

describe('chat-journal: приветствие бота не создаёт событие', () => {
  test('реплики бота без ответа человека → нет событий в журнале', async () => {
    const { logChatLine } = await import('../js/chat-journal.js');
    const { loadEvents } = await import('../js/journal.js');
    logChatLine('bot', 'Привет! Как ты себя чувствуешь сегодня?');
    logChatLine('bot', 'Я здесь, чтобы помочь тебе разобраться.');
    expect(loadEvents().length).toBe(0);
  });

  test('после первой реплики пользователя бот создаёт событие', async () => {
    const { logChatLine } = await import('../js/chat-journal.js');
    const { loadEvents } = await import('../js/journal.js');
    logChatLine('bot', 'Привет!');           // до userSpoke — игнорируется
    logChatLine('user', 'Привет, мне грустно');
    logChatLine('bot', 'Слышу тебя.');
    const events = loadEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('chat');
  });

  test('длинный диалог остаётся ОДНИМ событием журнала', async () => {
    const { logChatLine } = await import('../js/chat-journal.js');
    const { loadEvents } = await import('../js/journal.js');
    logChatLine('user', 'Первая реплика');
    logChatLine('bot', 'Ответ 1');
    logChatLine('user', 'Вторая реплика');
    logChatLine('bot', 'Ответ 2');
    logChatLine('user', 'Третья реплика');
    logChatLine('bot', 'Ответ 3');
    expect(loadEvents().length).toBe(1);
  });

  test('хранит не более 6 последних реплик в data.lines', async () => {
    const { logChatLine } = await import('../js/chat-journal.js');
    const { loadEvents } = await import('../js/journal.js');
    for (let i = 1; i <= 7; i++) {
      logChatLine('user', `msg${i}`);
    }
    const events = loadEvents();
    expect(events.length).toBe(1);
    const lines = events[0].data.lines;
    expect(lines.length).toBeLessThanOrEqual(6);
    expect(lines.some(l => l.text === 'msg1')).toBe(false); // старая вытеснена
    expect(lines[lines.length - 1].text).toBe('msg7');      // новая на месте
  });

  test('пустая реплика не добавляется в журнал', async () => {
    const { logChatLine } = await import('../js/chat-journal.js');
    const { loadEvents } = await import('../js/journal.js');
    logChatLine('user', '');
    logChatLine('user', '   <b></b>   '); // после plainText станет пустой
    expect(loadEvents().length).toBe(0);
  });
});
