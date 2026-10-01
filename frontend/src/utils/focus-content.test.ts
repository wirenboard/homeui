// @vitest-environment happy-dom
import { focusToMainContent } from './focus-content';

describe('focusToMainContent', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><h1 tabindex="-1">Title</h1></main>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('focuses h1 inside main', () => {
    vi.useFakeTimers();
    focusToMainContent();
    vi.advanceTimersByTime(0);

    expect(document.activeElement).toBe(document.querySelector('h1'));
    vi.useRealTimers();
  });

  test('focuses input inside login-form', () => {
    document.body.innerHTML = '<main><div class="login-form"><input type="text" /></div></main>';
    vi.useFakeTimers();
    focusToMainContent();
    vi.advanceTimersByTime(0);

    expect(document.activeElement).toBe(document.querySelector('input'));
    vi.useRealTimers();
  });

  test('skips when input is already focused', () => {
    document.body.innerHTML = '<main><h1 tabindex="-1">Title</h1></main><input id="active" />';
    const input = document.getElementById('active') as HTMLInputElement;
    input.focus();

    vi.useFakeTimers();
    focusToMainContent();
    vi.advanceTimersByTime(0);

    expect(document.activeElement).toBe(input);
    vi.useRealTimers();
  });

  test('respects delay parameter', () => {
    vi.useFakeTimers();
    focusToMainContent(100);
    vi.advanceTimersByTime(50);
    expect(document.activeElement).not.toBe(document.querySelector('h1'));

    vi.advanceTimersByTime(50);
    expect(document.activeElement).toBe(document.querySelector('h1'));
    vi.useRealTimers();
  });
});
