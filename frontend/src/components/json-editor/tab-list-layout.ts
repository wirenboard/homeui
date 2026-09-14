import { type TabbedEditor, type TabbedEditorRegistry } from './types';

// Keeps the top-level tab list and its pane inside the visible page area: both get a height cap
// and scroll on their own, so the page does not. When the form above the tabs leaves too little
// room for that, the list is pinned to the top of the area instead and the page scrolls as before.
const FIT_CLASS = 'wb-jsonEditor-tabsFit';
const STICKY_CLASS = 'wb-jsonEditor-tabsSticky';
const DESKTOP_QUERY = '(min-width: 992px)';
const VIEWPORT_GAP = 12;
// a cap shorter than this leaves a cramped slot at the bottom of the page, pin the list instead
const MIN_FIT_HEIGHT = 240;

// the theme puts these on the holder of a vertical tab list, so a row of tabs on top is left alone
export const TAB_HOLDER_CLASS = 'wb-jsonEditor-tabHolder';
export const TAB_LIST_CLASS = 'wb-jsonEditor-tabList';
export const TAB_PANE_CLASS = 'wb-jsonEditor-tabPane';

const closestScroller = (el: HTMLElement) => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node;
    }
  }
  return null;
};

// top and bottom of what is on screen of the page area the tabs scroll in,
// which the open console panel cuts short from below
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

// tabs count only once their holder is in the form: an object editor builds one even when it
// lays its fields out in rows, and then never inserts it
const holdsTabs = (root: HTMLElement, editor: TabbedEditor) =>
  !!editor?.tabs_holder && root.contains(editor.tabs_holder);

// a list inside another tab pane flows with that pane, only the outermost one is capped.
// walk the whole way up: one level of tabs is two editors, the tabbed array and the editor of its item
const isTopLevel = (root: HTMLElement, editor: TabbedEditor) => {
  for (let parent = editor.parent; parent; parent = parent.parent) {
    if (holdsTabs(root, parent)) {
      return false;
    }
  }
  return true;
};

const tabbedEditors = (root: HTMLElement, jsonEditor: TabbedEditorRegistry) =>
  Object.values(jsonEditor?.editors ?? {}).filter(
    (editor) =>
      holdsTabs(root, editor) &&
      editor.tabs_holder.classList.contains(TAB_HOLDER_CLASS) &&
      isTopLevel(root, editor),
  );

const syncTabList = (root: HTMLElement, editor: TabbedEditor, isDesktop: boolean) => {
  const holder = editor.tabs_holder;
  // the theme builds the holder as the tab list followed by the pane
  const list = holder.children[0] as HTMLElement;
  const pane = holder.children[1] as HTMLElement;
  // an empty list is not drawn at all, as on a KNX page without devices
  if (!isDesktop || !list.children.length) {
    holder.classList.remove(FIT_CLASS, STICKY_CLASS);
    list.style.maxHeight = '';
    pane.style.maxHeight = '';
    return;
  }
  const bounds = visibleBounds(holder);
  // margins and fields the editor draws under the tabs have to fit under them too
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
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
      tabbedEditors(root, getJsonEditor()).forEach((editor) => syncTabList(root, editor, isDesktop));
    });
  };
  schedule();
  // in the capture phase: what scrolls is the page container or the list itself, never the window
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(root);
  // the console panel resizes that area without resizing either the window or the editor
  const scroller = closestScroller(root);
  if (scroller) {
    resizeObserver.observe(scroller);
  }

  return {
    // the editor rebuilds and reshapes the form on its own, and not every reshape resizes the root
    sync: schedule,
    dispose: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      resizeObserver.disconnect();
    },
  };
};
