// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { MockWebSocket } from '@/test/mocks/websocket';
import { terminalStore } from './terminal-store';
import { TerminalContent } from './terminal-tab';

vi.stubGlobal('WebSocket', MockWebSocket);
vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });

/** Decoded text of each input message sent to the server. */
function sentInput(): string[] {
  return MockWebSocket.last.send.mock.calls
    .map(([message]) => JSON.parse(message))
    .filter((message) => message.type === 'input')
    .map((message) => new TextDecoder().decode(Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0))));
}

function textarea(): HTMLTextAreaElement {
  return terminalStore.terminal.textarea;
}

/** Fires the events a browser sends for a key typed through a non-composing IME (Firefox with IBus). */
function typeThroughIme(text: string, { textLandsAfterXtermLooks }: { textLandsAfterXtermLooks: boolean }) {
  textarea().dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', keyCode: 229, bubbles: true }));
  const insert = () => {
    textarea().dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true }));
    textarea().value += text;
    textarea().dispatchEvent(
      new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true, composed: true }),
    );
  };
  if (textLandsAfterXtermLooks) {
    // xterm checks the textarea after a zero timeout; here the text arrives later
    vi.advanceTimersByTime(1);
  }
  insert();
  vi.runAllTimers();
}

describe('typing through an input method that does not compose (Firefox with IBus)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    terminalStore.forgetSession();
    MockWebSocket.reset();
    render(<TerminalContent />);
    MockWebSocket.last.simulateOpen();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a character the IME delivers after xterm has looked at the textarea still reaches the server', () => {
    typeThroughIme('r', { textLandsAfterXtermLooks: true });

    expect(sentInput()).toEqual(['r']);
  });

  test('a character the IME delivers before xterm looks is sent once, not by xterm and the workaround both', () => {
    typeThroughIme('o', { textLandsAfterXtermLooks: false });

    expect(sentInput()).toEqual(['o']);
  });

  test('a word typed fast arrives whole and in order whichever way each key races xterm', () => {
    typeThroughIme('r', { textLandsAfterXtermLooks: true });
    typeThroughIme('o', { textLandsAfterXtermLooks: false });
    typeThroughIme('o', { textLandsAfterXtermLooks: true });
    typeThroughIme('t', { textLandsAfterXtermLooks: true });

    expect(sentInput()).toEqual(['r', 'o', 'o', 't']);
  });

  test('text inserted without an IME key before it (an emoji picker) is left to xterm and sent once', () => {
    textarea().dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: '😀', bubbles: true }));
    textarea().value += '😀';
    textarea().dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: '😀', bubbles: true }));
    vi.runAllTimers();

    expect(sentInput()).toEqual(['😀']);
  });
});
