// @vitest-environment happy-dom
import { attachTabListLayout, TAB_HOLDER_CLASS, TAB_LIST_CLASS, TAB_PANE_CLASS } from './tab-list-layout';

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
  /** tabs on top, a row of them instead of a list beside the pane */
  topTabs?: boolean;
  /** built by an object editor that lays its fields out in rows, so it never reaches the form */
  detached?: boolean;
  desktop?: boolean;
}

const rect = (top: number, bottom: number) => ({
  top, bottom, left: 0, right: 200, width: 200, height: bottom - top, x: 0, y: top, toJSON: () => ({}),
}) as DOMRect;

const stubRect = (el: HTMLElement, top: number, bottom: number) => {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(top, bottom));
};

const buildHolder = (rows: number) => {
  const holder = document.createElement('div');
  holder.className = TAB_HOLDER_CLASS;
  const list = document.createElement('ul');
  list.className = TAB_LIST_CLASS;
  Array.from({ length: rows }, () => list.appendChild(document.createElement('li')));
  const pane = document.createElement('div');
  pane.className = TAB_PANE_CLASS;
  holder.append(list, pane);
  return { holder, list, pane };
};

const buildEditor = ({
  rows = 4, holderTop = 100, scrollerBottom = 900 - GAP, trailing = 0, nested = false, empty = false,
  topTabs = false, detached = false, desktop = true,
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

  const scroller = document.createElement('div');
  scroller.style.overflowY = 'auto';
  const root = document.createElement('div');
  root.className = 'json-editor';
  const { holder, list, pane } = buildHolder(empty ? 0 : rows);
  const outer = buildHolder(2);
  if (topTabs) {
    holder.classList.remove(TAB_HOLDER_CLASS);
  }

  // the root object editor builds a holder of its own and lays its fields out in rows instead
  const rootEditor = { tabs_holder: buildHolder(3).holder, parent: undefined };
  const outerEditor = { tabs_holder: outer.holder, parent: rootEditor };
  const editor = { tabs_holder: holder, parent: nested ? outerEditor : rootEditor };

  if (nested) {
    outer.pane.appendChild(holder);
    root.appendChild(outer.holder);
  } else if (!detached) {
    root.appendChild(holder);
  }
  scroller.appendChild(root);
  document.body.appendChild(scroller);

  const listHeight = (empty ? 0 : rows) * ROW_HEIGHT;
  stubRect(scroller, GAP, scrollerBottom);
  stubRect(holder, holderTop, holderTop + listHeight);
  stubRect(root, holderTop, holderTop + listHeight + trailing);
  stubRect(list, holderTop, holderTop + listHeight);

  const jsonEditor = { editors: { 'root.channels': editor, 'root.channels.0.items': outerEditor } };
  return { root, holder, list, pane, ...attachTabListLayout(root, () => jsonEditor) };
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

  test('is recomputed on demand, as the editor reshapes the form without resizing the root', () => {
    const { root, holder, list, sync } = buildEditor({ rows: 20 });
    expect(list.style.maxHeight).toBe('788px');

    // a field above the tabs unfolds and pushes them 200px down
    stubRect(holder, 300, 1200);
    stubRect(root, 300, 1200);
    sync();

    expect(list.style.maxHeight).toBe('588px');
  });

  test.each([
    { name: 'a nested list, which scrolls with the pane around it', geometry: { nested: true } },
    { name: 'an empty list, which is not rendered at all', geometry: { empty: true } },
    { name: 'tabs drawn on top, which the theme does not mark', geometry: { topTabs: true } },
    { name: 'a holder its editor left out of the form', geometry: { detached: true } },
    { name: 'any list below the desktop width', geometry: { desktop: false } },
  ])('leaves $name alone', ({ geometry }) => {
    const { holder, list, pane } = buildEditor({ rows: 20, ...geometry });

    expect(holder.classList.contains('wb-jsonEditor-tabsFit')).toBe(false);
    expect(holder.classList.contains('wb-jsonEditor-tabsSticky')).toBe(false);
    expect(list.style.maxHeight).toBe('');
    expect(pane.style.maxHeight).toBe('');
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
