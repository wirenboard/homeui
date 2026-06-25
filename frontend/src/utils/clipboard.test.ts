// @vitest-environment happy-dom
import { copyToClipboard } from './clipboard';

describe('copyToClipboard', () => {
  test('uses navigator.clipboard in secure context', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    copyToClipboard('hello');
    expect(writeText).toHaveBeenCalledWith('hello');

    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
  });

  test('falls back to textarea when not secure', () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    (document as any).execCommand = vi.fn(() => true);

    copyToClipboard('fallback text');

    expect((document as any).execCommand).toHaveBeenCalledWith('copy');
    delete (document as any).execCommand;
  });
});
