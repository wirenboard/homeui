import { type TabListThumbDrag } from './types';

// The top-level tab list and its pane are capped at the bottom of the scrolling area, so they
// scroll instead of the page. Tabs starting too low for that get a sticky list capped by the area.
// The list scrollbar is drawn here, the native one is hidden in styles.css.
const TAB_LIST_SELECTOR = 'ul.nav-stacked';
const TAB_PANE_SELECTOR = '.tab-content';
const FIT_CLASS = 'wb-jsonEditor-tabsFit';
const STICKY_CLASS = 'wb-jsonEditor-tabsSticky';
const GUTTER_CLASS = 'wb-jsonEditor-tabListGutter';
const THUMB_ACTIVE_CLASS = 'wb-jsonEditor-tabListThumbActive';
const DESKTOP_QUERY = '(min-width: 992px)';
const VIEWPORT_GAP = 12;
// below this the list sticks to the scrolling page instead
const MIN_FIT_HEIGHT = 240;
const MIN_THUMB_HEIGHT = 24;

// the theme builds these, this module places and shows them
export const TAB_LIST_SCROLLBAR_CLASS = 'wb-jsonEditor-tabListScrollbar';
export const TAB_LIST_THUMB_CLASS = 'wb-jsonEditor-tabListThumb';

const closestScroller = (el: HTMLElement) => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node;
    }
  }
  return null;
};

// the visible band of the closest scrolling ancestor, which the console panel can cut short
const scrollingBand = (el: HTMLElement) => {
  const band = { top: VIEWPORT_GAP, bottom: window.innerHeight - VIEWPORT_GAP };
  const scroller = closestScroller(el);
  if (!scroller) {
    return band;
  }
  const rect = scroller.getBoundingClientRect();
  return { top: Math.max(band.top, rect.top), bottom: Math.min(band.bottom, rect.bottom) };
};

// top as if nothing were scrolled, so the cap does not depend on the scroll position
const unscrolledTop = (el: HTMLElement) => {
  let top = el.getBoundingClientRect().top;
  for (let node = el.parentElement; node; node = node.parentElement) {
    top += node.scrollTop;
  }
  return top;
};

const syncTabList = (root: HTMLElement, list: HTMLElement, isDesktop: boolean) => {
  const holder = list.parentElement;
  const pane = holder?.querySelector<HTMLElement>(`:scope > ${TAB_PANE_SELECTOR}`);
  const scrollbar = holder?.querySelector<HTMLElement>(`:scope > .${TAB_LIST_SCROLLBAR_CLASS}`);
  if (!holder || !pane || !scrollbar) {
    return;
  }
  // nested holders flow inside the top-level pane, an empty list is not rendered
  const isTopLevel = isDesktop && !root.contains(holder.closest(TAB_PANE_SELECTOR)) && list.getClientRects().length > 0;
  if (!isTopLevel) {
    holder.classList.remove(FIT_CLASS, STICKY_CLASS);
    list.classList.remove(GUTTER_CLASS);
    list.style.maxHeight = '';
    pane.style.maxHeight = '';
    scrollbar.hidden = true;
    return;
  }
  const band = scrollingBand(holder);
  // what follows the holder (margins, trailing fields) has to fit under it
  const trailing = root.getBoundingClientRect().bottom - holder.getBoundingClientRect().bottom;
  const available = band.bottom - unscrolledTop(holder) - trailing;
  const isFit = available >= MIN_FIT_HEIGHT;
  holder.classList.toggle(FIT_CLASS, isFit);
  holder.classList.toggle(STICKY_CLASS, !isFit);
  // a sticky list is as tall as the band allows once pinned
  const listCap = isFit ? available : band.bottom - band.top - trailing;
  list.style.maxHeight = listCap > 0 ? `${listCap}px` : '';
  pane.style.maxHeight = isFit ? `${available}px` : '';

  // measured without the gutter, so a row wrapping because of it cannot flip the decision
  list.classList.remove(GUTTER_CLASS);
  const { clientHeight, scrollHeight, scrollTop } = list;
  const canScroll = scrollHeight > clientHeight;
  list.classList.toggle(GUTTER_CLASS, canScroll);
  scrollbar.hidden = !canScroll;
  if (!canScroll) {
    return;
  }
  const holderRect = holder.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  // inside the 1px border, same on every side
  scrollbar.style.top = `${listRect.top - holderRect.top + list.clientTop}px`;
  scrollbar.style.right = `${holderRect.right - listRect.right + list.clientLeft}px`;
  scrollbar.style.height = `${clientHeight}px`;
  const thumb = scrollbar.querySelector<HTMLElement>(`.${TAB_LIST_THUMB_CLASS}`);
  if (thumb) {
    const thumbHeight = Math.max(MIN_THUMB_HEIGHT, Math.round((clientHeight * clientHeight) / scrollHeight));
    const thumbTop = Math.round((scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight));
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${thumbTop}px`;
  }
};

export const attachTabListLayout = (root: HTMLElement) => {
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
      root.querySelectorAll<HTMLElement>(TAB_LIST_SELECTOR).forEach((list) => syncTabList(root, list, isDesktop));
    });
  };
  schedule();
  // capture phase, the page container and the tab list scroll, not the window
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(root);
  // the console panel resizes the scrolling area, touching neither the window nor the editor
  const scroller = closestScroller(root);
  if (scroller) {
    resizeObserver.observe(scroller);
  }
  // a capped list does not grow with new tabs, so the root does not resize either
  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(root, { childList: true, subtree: true });

  let drag: TabListThumbDrag | null = null;
  const onPointerDown = (e: PointerEvent) => {
    const thumb = (e.target as HTMLElement).closest<HTMLElement>(`.${TAB_LIST_THUMB_CLASS}`);
    const list = thumb?.parentElement?.parentElement?.querySelector<HTMLElement>(TAB_LIST_SELECTOR);
    if (!thumb || !list) {
      return;
    }
    e.preventDefault();
    drag = { list, thumb, startY: e.clientY, startScrollTop: list.scrollTop };
    thumb.classList.add(THUMB_ACTIVE_CLASS);
    thumb.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag) {
      return;
    }
    const { list, thumb, startY, startScrollTop } = drag;
    const travel = list.clientHeight - thumb.offsetHeight;
    if (travel > 0) {
      list.scrollTop = startScrollTop + ((e.clientY - startY) * (list.scrollHeight - list.clientHeight)) / travel;
    }
  };
  const onPointerUp = () => {
    drag?.thumb.classList.remove(THUMB_ACTIVE_CLASS);
    drag = null;
  };
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', schedule);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerup', onPointerUp);
    root.removeEventListener('pointercancel', onPointerUp);
  };
};
