import { type TabbedEditor, type TabbedEditorRegistry } from './types';

// A tab list that opts in with options.wb.fit_tabs is kept inside the visible page area: it and its
// pane are capped and scroll on their own instead of the page. With too little room under the tabs
// for a cap, the list is pinned to the top of the area and the page scrolls as before. The cap is
// measured against the page area, so the option belongs on a list the form lays out top level.
const FIT_CLASS = 'wb-jsonEditor-tabsFit';
const STICKY_CLASS = 'wb-jsonEditor-tabsSticky';
const DESKTOP_QUERY = '(min-width: 992px)';
const VIEWPORT_GAP = 12;
// a cap shorter than this leaves a cramped slot at the bottom of the page, pin the list instead
const MIN_FIT_HEIGHT = 240;

// styles.css addresses the tabs by these, added here and not in the theme, so a form
// without the layout keeps the markup of the library
export const TAB_HOLDER_CLASS = 'wb-jsonEditor-tabHolder';
export const TAB_LIST_CLASS = 'wb-jsonEditor-tabList';
export const TAB_PANE_CLASS = 'wb-jsonEditor-tabPane';
// the theme marks a vertical list with it, a row of tabs on top gets another holder
const STACKED_LIST_CLASS = 'nav-stacked';

const closestScroller = (el: HTMLElement) => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node;
    }
  }
  return null;
};

// what is on screen of the page area the tabs scroll in, which the console panel cuts short
const visibleBounds = (el: HTMLElement) => {
  const bounds = { top: VIEWPORT_GAP, bottom: window.innerHeight - VIEWPORT_GAP };
  const scroller = closestScroller(el);
  if (!scroller) {
    return bounds;
  }
  const rect = scroller.getBoundingClientRect();
  return { top: Math.max(bounds.top, rect.top), bottom: Math.min(bounds.bottom, rect.bottom) };
};

// top of the element as if nothing were scrolled, so its cap does not change as the page scrolls
const unscrolledTop = (el: HTMLElement) => {
  let top = el.getBoundingClientRect().top;
  for (let node = el.parentElement; node; node = node.parentElement) {
    top += node.scrollTop;
  }
  return top;
};

// json-editor merges the options of a schema into every editor it builds
const wantsFitTabs = (editor: TabbedEditor) => !!editor?.options?.wb?.fit_tabs;

// tabs count only once their holder is in the form: an object editor builds one even when it
// lays its fields out in rows, and then never inserts it
const holdsTabs = (root: HTMLElement, editor: TabbedEditor) =>
  !!editor.tabs_holder && root.contains(editor.tabs_holder);

const tabbedEditors = (root: HTMLElement, jsonEditor: TabbedEditorRegistry) =>
  Object.values(jsonEditor?.editors ?? {}).filter(
    (editor) =>
      wantsFitTabs(editor) &&
      holdsTabs(root, editor) &&
      editor.tabs_holder.children[0]?.classList.contains(STACKED_LIST_CLASS),
  );

const syncTabList = (root: HTMLElement, editor: TabbedEditor, isDesktop: boolean) => {
  const holder = editor.tabs_holder;
  // the theme builds the holder as the tab list followed by the pane
  const list = holder.children[0] as HTMLElement;
  const pane = holder.children[1] as HTMLElement;
  holder.classList.add(TAB_HOLDER_CLASS);
  list.classList.add(TAB_LIST_CLASS);
  pane.classList.add(TAB_PANE_CLASS);
  // an empty list is not drawn at all, as on a KNX page without devices
  if (!isDesktop || !list.children.length) {
    holder.classList.remove(FIT_CLASS, STICKY_CLASS);
    list.style.maxHeight = '';
    pane.style.maxHeight = '';
    return;
  }
  const bounds = visibleBounds(holder);
  // what the editor draws under the tabs has to fit under them too
  const trailing = root.getBoundingClientRect().bottom - holder.getBoundingClientRect().bottom;
  // what is left from the top of the tabs down to the bottom of the area
  const available = bounds.bottom - unscrolledTop(holder) - trailing;
  const isFit = available >= MIN_FIT_HEIGHT;
  holder.classList.toggle(FIT_CLASS, isFit);
  holder.classList.toggle(STICKY_CLASS, !isFit);
  // pinned to the top, the list may run the whole height of the area
  const listCap = isFit ? available : bounds.bottom - bounds.top - trailing;
  list.style.maxHeight = listCap > 0 ? `${listCap}px` : '';
  pane.style.maxHeight = isFit ? `${available}px` : '';
};

export const attachTabListLayout = (root: HTMLElement, getJsonEditor: () => TabbedEditorRegistry) => {
  let frame = 0;
  let resizeObserver: ResizeObserver = null;

  const sync = () => {
    const editors = tabbedEditors(root, getJsonEditor());
    if (editors.length) {
      listen();
    }
    const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
    editors.forEach((editor) => syncTabList(root, editor, isDesktop));
  };

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(sync);
  };

  // nothing of ours on a form where no list opted in, so the listeners go up on the first pass
  // that finds one, and a schema cannot gain the option without a rebuild
  const listen = () => {
    if (resizeObserver) {
      return;
    }
    // in the capture phase: what scrolls is the page container or the list itself, never the window
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(root);
    // the console panel resizes that area without resizing either the window or the editor
    const scroller = closestScroller(root);
    if (scroller) {
      resizeObserver.observe(scroller);
    }
  };

  schedule();

  return {
    // the editor rebuilds and reshapes the form on its own, and not every reshape resizes the root
    sync: schedule,
    dispose: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
    },
  };
};
