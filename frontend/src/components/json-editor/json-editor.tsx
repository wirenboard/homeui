import classNames from 'classnames';
import isEqual from 'lodash/isEqual';
import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import i18n from '@/i18n/config';
import { createJSONEditor } from './extensions/wb-json-editor';
import { type JsonEditorProps } from './types';
import './styles.css';

// Cap each sticky vertical tab list to the distance from its current top to the bottom
// of the viewport, so it scrolls on its own instead of running off-screen.
const TAB_LIST_SELECTOR = 'ul.nav-stacked';
const VIEWPORT_GAP = 12;
const DESKTOP_QUERY = '(min-width: 992px)';

const syncTabListMaxHeight = (root: HTMLElement | null) => {
  if (!root) {
    return;
  }
  const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
  root.querySelectorAll<HTMLElement>(TAB_LIST_SELECTOR).forEach((list) => {
    if (!isDesktop) {
      list.style.maxHeight = '';
      return;
    }
    // clamp the top to the pinned position: a list scrolled above the fold has a
    // negative rect.top, which would inflate the cap past the viewport and un-cap the list
    const top = Math.max(list.getBoundingClientRect().top, VIEWPORT_GAP);
    const viewportAvailable = window.innerHeight - top - VIEWPORT_GAP;
    // keep the list roughly level with its content pane (the flex sibling) so a long list
    // doesn't tower over a short form; still cap to the viewport for very tall forms
    const sibling = Array.from(list.parentElement?.children ?? []).find((el) => el !== list);
    const contentHeight = sibling ? sibling.getBoundingClientRect().height : viewportAvailable;
    const available = Math.min(viewportAvailable, contentHeight);
    // below the fold: drop the cap, let the CSS fallback hold until it scrolls into view
    list.style.maxHeight = available > 0 ? `${available}px` : '';
  });
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
      frame = requestAnimationFrame(() => syncTabListMaxHeight(root));
    };
    schedule();
    // capture phase to catch the inner page container scroll, not just window
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    // recompute when tabs change or content resizes the layout
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      resizeObserver.disconnect();
    };
  }, []);

  return <div ref={container} className={classNames('json-editor', props.className)} />;
});
