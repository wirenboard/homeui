// @vitest-environment happy-dom
import { attachTabListLayout, TAB_LIST_SCROLLBAR_CLASS, TAB_LIST_THUMB_CLASS } from './tab-list-layout';

const GAP = 12;
const ROW_HEIGHT = 45;

interface Geometry {
  rows?: number;
  holderTop?: number;
  /** bottom of the scrolling page area, above the window bottom while the console panel is open */
  scrollerBottom?: number;
  /** what the editor keeps under the tabs, a trailing array on the NTP page */
  trailing?: number;
  /** a list inside another tab pane, as the channels of a WBIO module are */
  nested?: boolean;
  /** in the DOM but not rendered, as a KNX device list with no devices is */
  empty?: boolean;
  desktop?: boolean;
}

const rect = (top: number, bottom: number) => ({
  top, bottom, left: 0, right: 200, width: 200, height: bottom - top, x: 0, y: top, toJSON: () => ({}),
}) as DOMRect;

const stubRect = (el: HTMLElement, top: number, bottom: number) => {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(top, bottom));
};

const buildEditor = ({
  rows = 4, holderTop = 100, scrollerBottom = 900 - GAP, trailing = 0, nested = false, empty = false, desktop = true,
}: Geometry = {}) => {
  vi.stubGlobal('innerHeight', 900);
  vi.stubGlobal('matchMedia', () => ({ matches: desktop }));
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('MutationObserver', class {
    observe() {}
    disconnect() {}
  });

  const scroller = document.createElement('div');
  scroller.style.overflowY = 'auto';
  const root = document.createElement('div');
  root.className = 'json-editor';
  const outerPane = document.createElement('div');
  outerPane.className = 'tab-content';
  const holder = document.createElement('div');
  const list = document.createElement('ul');
  list.className = 'nav nav-pills nav-stacked';
  const pane = document.createElement('div');
  pane.className = 'tab-content';
  const scrollbar = document.createElement('div');
  scrollbar.className = TAB_LIST_SCROLLBAR_CLASS;
  scrollbar.hidden = true;
  const thumb = document.createElement('div');
  thumb.className = TAB_LIST_THUMB_CLASS;

  scrollbar.appendChild(thumb);
  holder.append(list, pane, scrollbar);
  if (nested) {
    outerPane.appendChild(holder);
    root.appendChild(outerPane);
  } else {
    root.appendChild(holder);
  }
  scroller.appendChild(root);
  document.body.appendChild(scroller);

  const scrollHeight = rows * ROW_HEIGHT;
  Object.defineProperty(list, 'scrollHeight', { get: () => scrollHeight, configurable: true });
  Object.defineProperty(list, 'clientHeight', {
    get: () => Math.min(scrollHeight, parseFloat(list.style.maxHeight) || scrollHeight),
    configurable: true,
  });
  vi.spyOn(list, 'getClientRects').mockReturnValue(
    (empty ? [] : [rect(holderTop, holderTop + scrollHeight)]) as unknown as DOMRectList,
  );

  stubRect(scroller, GAP, scrollerBottom);
  stubRect(holder, holderTop, holderTop + scrollHeight);
  stubRect(root, holderTop, holderTop + scrollHeight + trailing);
  stubRect(list, holderTop, holderTop + scrollHeight);

  return { root, holder, list, pane, scrollbar, dispose: attachTabListLayout(root) };
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('attachTabListLayout, a top-level tab list', () => {
  // the tabs start at 100 in a 900px window
  test.each([
    { name: 'is capped at the page area bottom', scrollerBottom: 888, trailing: 0, cap: 788 },
    { name: 'follows an area shortened by the console panel', scrollerBottom: 600, trailing: 0, cap: 500 },
    { name: 'leaves room for the fields under the tabs', scrollerBottom: 888, trailing: 120, cap: 668 },
  ])('$name', ({ scrollerBottom, trailing, cap }) => {
    const { holder, list, pane } = buildEditor({ rows: 20, scrollerBottom, trailing });

    expect(holder.classList.contains('wb-jsonEditor-tabsFit')).toBe(true);
    expect(list.style.maxHeight).toBe(`${cap}px`);
    // the pane is capped too, so it scrolls on its own instead of the page
    expect(pane.style.maxHeight).toBe(`${cap}px`);
  });

  test('starting too low for a cap of its own, sticks to the top of the scrolling page instead', () => {
    // a long form above the tabs: only 88px left below them
    const { holder, list, pane } = buildEditor({ rows: 20, holderTop: 800, scrollerBottom: 888, trailing: 20 });

    expect(holder.classList.contains('wb-jsonEditor-tabsSticky')).toBe(true);
    expect(holder.classList.contains('wb-jsonEditor-tabsFit')).toBe(false);
    // as tall as the area allows once pinned, wherever the list stands now
    expect(list.style.maxHeight).toBe('856px');
    // the page scrolls in this mode, so the pane keeps its natural height
    expect(pane.style.maxHeight).toBe('');
  });

  test.each([
    { name: 'a nested list, which scrolls with the pane around it', geometry: { nested: true } },
    { name: 'an empty list, which is not rendered at all', geometry: { empty: true } },
    { name: 'any list below the desktop width', geometry: { desktop: false } },
  ])('leaves $name alone', ({ geometry }) => {
    const { holder, list, pane, scrollbar } = buildEditor({ rows: 20, ...geometry });

    expect(holder.className).toBe('');
    expect(list.style.maxHeight).toBe('');
    expect(pane.style.maxHeight).toBe('');
    expect(scrollbar.hidden).toBe(true);
  });
});

describe('attachTabListLayout, the drawn scrollbar', () => {
  test('appears with the row gutter only while the list overflows its cap', () => {
    const overflowing = buildEditor({ rows: 20 });

    expect(overflowing.scrollbar.hidden).toBe(false);
    expect(overflowing.list.classList.contains('wb-jsonEditor-tabListGutter')).toBe(true);

    overflowing.dispose();
    document.body.innerHTML = '';
    const short = buildEditor({ rows: 4 });

    expect(short.scrollbar.hidden).toBe(true);
    // no gutter, so rows and the selected-row marker reach the border
    expect(short.list.classList.contains('wb-jsonEditor-tabListGutter')).toBe(false);
  });

  test('drags the list by the thumb', () => {
    const { list, scrollbar } = buildEditor({ rows: 20 });
    const thumb = scrollbar.querySelector<HTMLElement>(`.${TAB_LIST_THUMB_CLASS}`)!;
    Object.defineProperty(thumb, 'offsetHeight', { value: 100, configurable: true });
    thumb.setPointerCapture = vi.fn();

    thumb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: 0 }));
    thumb.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: 50 }));

    // 50px of a (788 - 100) travel over a (900 - 788) scrollable range
    expect(Math.round(list.scrollTop)).toBe(8);
    expect(thumb.classList.contains('wb-jsonEditor-tabListThumbActive')).toBe(true);

    thumb.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientY: 50 }));
    expect(thumb.classList.contains('wb-jsonEditor-tabListThumbActive')).toBe(false);
  });
});

describe('attachTabListLayout teardown', () => {
  test('stops recomputing after dispose', () => {
    const { list, dispose } = buildEditor({ rows: 20 });
    expect(list.style.maxHeight).toBe('788px');

    dispose();
    list.style.maxHeight = '';
    window.dispatchEvent(new Event('resize'));

    expect(list.style.maxHeight).toBe('');
  });
});
