import classNames from 'classnames';
import isEqual from 'lodash/isEqual';
import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import i18n from '@/i18n/config';
import { createJSONEditor } from './extensions/wb-json-editor';
import { type JsonEditorProps, type TabListThumbDrag } from './types';
import './styles.css';

// Top-level tabs are capped at the window bottom, so the list and the pane scroll instead of the page.
// Tabs starting too low (a long form above) get a sticky list capped by the window instead.
// The list scrollbar is drawn here, the native one is hidden in styles.css.
const TAB_LIST_SELECTOR = 'ul.nav-stacked';
const TAB_PANE_SELECTOR = '.tab-content';
const SCROLLBAR_SELECTOR = '.je-tablist-scrollbar';
const THUMB_SELECTOR = '.je-tablist-thumb';
const THUMB_ACTIVE_CLASS = 'je-tablist-thumb--active';
const FIT_CLASS = 'je-tabs-fit';
const STICKY_CLASS = 'je-tabs-sticky';
const DESKTOP_QUERY = '(min-width: 992px)';
const VIEWPORT_GAP = 12;
// below this the list sticks to the scrolling page instead
const MIN_FIT_HEIGHT = 240;
const MIN_THUMB_HEIGHT = 24;

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
  const scrollbar = holder?.querySelector<HTMLElement>(`:scope > ${SCROLLBAR_SELECTOR}`);
  if (!holder || !pane || !scrollbar) {
    return;
  }
  // nested holders flow inside the top-level pane, an empty list is not rendered
  const isTopLevel = isDesktop && !root.contains(holder.closest(TAB_PANE_SELECTOR)) && list.getClientRects().length > 0;
  if (!isTopLevel) {
    holder.classList.remove(FIT_CLASS, STICKY_CLASS);
    list.style.maxHeight = '';
    pane.style.maxHeight = '';
    scrollbar.hidden = true;
    return;
  }
  // what follows the holder (margins, trailing fields) has to fit under it
  const trailing = root.getBoundingClientRect().bottom - holder.getBoundingClientRect().bottom;
  const available = window.innerHeight - unscrolledTop(holder) - VIEWPORT_GAP - trailing;
  const isFit = available >= MIN_FIT_HEIGHT;
  holder.classList.toggle(FIT_CLASS, isFit);
  holder.classList.toggle(STICKY_CLASS, !isFit);
  // a sticky list is as tall as the window allows once pinned
  const listCap = isFit ? available : window.innerHeight - 2 * VIEWPORT_GAP - trailing;
  list.style.maxHeight = listCap > 0 ? `${listCap}px` : '';
  pane.style.maxHeight = isFit ? `${available}px` : '';

  const { clientHeight, scrollHeight, scrollTop } = list;
  const canScroll = scrollHeight > clientHeight;
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
  const thumb = scrollbar.querySelector<HTMLElement>(THUMB_SELECTOR);
  if (thumb) {
    const thumbHeight = Math.max(MIN_THUMB_HEIGHT, Math.round((clientHeight * clientHeight) / scrollHeight));
    const thumbTop = Math.round((scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight));
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${thumbTop}px`;
  }
};

const syncTabLists = (root: HTMLElement | null) => {
  if (!root) {
    return;
  }
  const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
  root.querySelectorAll<HTMLElement>(TAB_LIST_SELECTOR).forEach((list) => syncTabList(root, list, isDesktop));
};

export const JsonEditor = observer((props: JsonEditorProps) => {
  const container = useRef<HTMLDivElement>(null);
  let jse = useRef(null);
  const stateRef = useRef(null);
  const [schema, setSchema] = useState(undefined);
  const [firstStart, setFirstStart] = useState(true);
  stateRef.current = firstStart;

  const constructEditor = (props) => {
    if (props.schema === undefined) {
      return undefined;
    }
    const editor = createJSONEditor(
      container.current,
      props.schema,
      props.data,
      i18n.language,
      props.root,
      props.cells,
    );
    editor.on('change', () => {
      if (props.onChange) {
        props.onChange(editor.getValue(), editor.validate(), stateRef.current);
      }
      if (stateRef.current) {
        setFirstStart(false);
      }
    });
    // json-editor can modify an internal schema object,
    // so store original one to recreate editor only on real schema change
    setSchema(props.schema);
    return editor;
  };

  useLayoutEffect(() => {
    if (!jse.current) {
      jse.current = constructEditor(props);
    } else {
      if (isEqual(props.schema, schema)) {
        if (!isEqual(props.data, jse.current.getValue())) {
          jse.current.setValue(props.data);
        }
      } else {
        jse.current.destroy();
        jse.current = undefined;
        jse.current = constructEditor(props);
      }
    }
  });

  useEffect(() => {
    const root = container.current;
    if (!root) {
      return undefined;
    }
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => syncTabLists(root));
    };
    schedule();
    // capture phase, the page container and the tab list scroll, not the window
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    // recompute when content resizes the layout
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(root);
    // a capped list does not grow with new tabs, so the root does not resize either
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(root, { childList: true, subtree: true });

    let drag: TabListThumbDrag | null = null;
    const onPointerDown = (e: PointerEvent) => {
      const thumb = (e.target as HTMLElement).closest<HTMLElement>(THUMB_SELECTOR);
      const scrollbar = thumb?.parentElement;
      const list = scrollbar?.parentElement?.querySelector<HTMLElement>(TAB_LIST_SELECTOR);
      if (!thumb || !list) {
        return;
      }
      e.preventDefault();
      drag = { list, scrollbar, thumb, startY: e.clientY, startScrollTop: list.scrollTop };
      thumb.classList.add(THUMB_ACTIVE_CLASS);
      thumb.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag) {
        return;
      }
      const { list, scrollbar, thumb, startY, startScrollTop } = drag;
      const travel = scrollbar.clientHeight - thumb.offsetHeight;
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
  }, []);

  return <div ref={container} className={classNames('json-editor', props.className)} />;
});
