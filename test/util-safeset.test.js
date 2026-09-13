// Страховка от переполнения localStorage: safeSet не роняет приложение,
// а честно возвращает false, чтобы вызывающий мог предупредить человека.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { safeSet } from '../js/util.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('safeSet', () => {
  it('обычная запись проходит и возвращает true', () => {
    expect(safeSet('ml_test', '{"a":1}')).toBe(true);
    expect(localStorage.getItem('ml_test')).toBe('{"a":1}');
  });

  it('при переполнении хранилища возвращает false, а не бросает исключение', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => safeSet('ml_test', 'x')).not.toThrow();
    expect(safeSet('ml_test', 'x')).toBe(false);
  });
});
