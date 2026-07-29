import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { type MouseEvent, type TouchEvent, useCallback, useEffect, useState } from 'react';
import { terminalStore } from '../terminal-store';
import { KEY_MAP } from '../types';
import './styles.css';

const MOBILE_BREAKPOINT = 768;

const vibrate = () => navigator.vibrate?.(25);

function dispatchKeyToTerminal(key: string, code: string, keyCode: number) {
  const textarea = terminalStore.terminal?.textarea;
  if (!textarea) return;

  textarea.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    code,
    keyCode,
    which: keyCode,
    ctrlKey: terminalStore.isCtrlActive,
    altKey: terminalStore.isAltActive,
    shiftKey: false,
    metaKey: false,
    bubbles: true,
    cancelable: true,
  }));

  terminalStore.resetModifiers();
  terminalStore.terminal?.focus();
}

function sendKey(name: string) {
  vibrate();
  const mapping = KEY_MAP[name];
  if (mapping) {
    dispatchKeyToTerminal(mapping.key, mapping.code, mapping.keyCode);
  }
}

function sendChar(char: string) {
  vibrate();
  const textarea = terminalStore.terminal?.textarea;
  if (!textarea) return;

  textarea.dispatchEvent(new InputEvent('input', {
    data: char,
    inputType: 'insertText',
    bubbles: true,
    cancelable: true,
  }));

  terminalStore.terminal?.focus();
}

function toggleModifier(modifier: 'ctrl' | 'alt') {
  vibrate();
  if (modifier === 'ctrl') {
    terminalStore.toggleCtrl();
  } else {
    terminalStore.toggleAlt();
  }
  terminalStore.terminal?.focus();
}

export const MobileKeyboardPanel = observer(() => {
  const [isMobile, setIsMobile] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);

  const checkMobile = useCallback(() => {
    setIsMobile(
      window.innerWidth <= MOBILE_BREAKPOINT ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0,
    );
    setScreenWidth(window.innerWidth);
    setScreenHeight(window.innerHeight);
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile || !terminalStore.terminal) {
    return null;
  }

  const isLandscape = screen.width > screen.height && screenHeight < 500;

  const showExtraCol1 = screenWidth >= 340;
  const showExtraCol2 = screenWidth >= 380;
  const showExtraCol3 = screenWidth >= 420;

  const showLandscapeExtra1 = screenWidth >= 600;
  const showLandscapeExtra2 = screenWidth >= 700;
  const showLandscapeExtra3 = screenWidth >= 800;

  const prevent = (ev: MouseEvent | TouchEvent) => {
    if (ev.target === ev.currentTarget) {
      ev.preventDefault();
    }
  };

  if (isLandscape) {
    return (
      <div className="mobileKeyboard" onMouseDown={prevent} onTouchStart={prevent}>
        <div className="mobileKeyboard-row">
          <button className="mobileKeyboard-key" onClick={() => sendKey('esc')}>ESC</button>
          <button className="mobileKeyboard-key" onClick={() => sendKey('tab')}>↹</button>
          <button
            className={classNames('mobileKeyboard-key', 'mobileKeyboard-key--modifier', {
              'mobileKeyboard-key--active': terminalStore.isCtrlActive,
            })}
            onClick={() => toggleModifier('ctrl')}
          >
            CTRL
          </button>
          <button
            className={classNames('mobileKeyboard-key', 'mobileKeyboard-key--modifier', {
              'mobileKeyboard-key--active': terminalStore.isAltActive,
            })}
            onClick={() => toggleModifier('alt')}
          >
            ALT
          </button>
          {showLandscapeExtra1 && (
            <>
              <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('$')}>$</button>
              <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('|')}>|</button>
            </>
          )}
          {showLandscapeExtra2 && (
            <>
              <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('<')}>
                &lt;
              </button>
              <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('>')}>
                {'>'}
              </button>
            </>
          )}
          <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('left')}>←</button>
          <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('down')}>↓</button>
          <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('up')}>↑</button>
          <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('right')}>→</button>
          {showLandscapeExtra3 && (
            <>
              <button className="mobileKeyboard-key" onClick={() => sendKey('home')}>HOME</button>
              <button className="mobileKeyboard-key" onClick={() => sendKey('end')}>END</button>
            </>
          )}
          <button className="mobileKeyboard-key" onClick={() => sendKey('pgup')}>PGUP</button>
          <button className="mobileKeyboard-key" onClick={() => sendKey('pgdn')}>PGDN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobileKeyboard" onMouseDown={prevent} onTouchStart={prevent}>
      <div className="mobileKeyboard-row">
        <button className="mobileKeyboard-key" onClick={() => sendKey('esc')}>ESC</button>
        <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('=')}>=</button>
        <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('/')}>/</button>
        {showExtraCol1 && (
          <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('$')}>$</button>
        )}
        {showExtraCol2 && (
          <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('<')}>&lt;</button>
        )}
        <button className="mobileKeyboard-key" onClick={() => sendKey('home')}>HOME</button>
        <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('up')}>↑</button>
        <button className="mobileKeyboard-key" onClick={() => sendKey('end')}>END</button>
        <button className="mobileKeyboard-key" onClick={() => sendKey('pgup')}>PGUP</button>
        {showExtraCol3 && (
          <button className="mobileKeyboard-key" onClick={() => sendKey('delete')}>DEL</button>
        )}
      </div>

      <div className="mobileKeyboard-row">
        <button className="mobileKeyboard-key" onClick={() => sendKey('tab')}>↹</button>
        <button
          className={classNames('mobileKeyboard-key', 'mobileKeyboard-key--modifier', {
            'mobileKeyboard-key--active': terminalStore.isCtrlActive,
          })}
          onClick={() => toggleModifier('ctrl')}
        >
          CTRL
        </button>
        <button
          className={classNames('mobileKeyboard-key', 'mobileKeyboard-key--modifier', {
            'mobileKeyboard-key--active': terminalStore.isAltActive,
          })}
          onClick={() => toggleModifier('alt')}
        >
          ALT
        </button>
        {showExtraCol1 && (
          <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('|')}>|</button>
        )}
        {showExtraCol2 && (
          <button className="mobileKeyboard-key mobileKeyboard-key--char" onClick={() => sendChar('>')}>{'>'}</button>
        )}
        <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('left')}>←</button>
        <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('down')}>↓</button>
        <button className="mobileKeyboard-key mobileKeyboard-key--arrow" onClick={() => sendKey('right')}>→</button>
        <button className="mobileKeyboard-key" onClick={() => sendKey('pgdn')}>PGDN</button>
        {showExtraCol3 && (
          <button className="mobileKeyboard-key" onClick={() => sendKey('backspace')}>⌫</button>
        )}
      </div>
    </div>
  );
});
