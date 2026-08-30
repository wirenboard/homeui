import { useLayoutEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';

/**
 * The sticky row at the top of every DALI page: what the page is, and what
 * can be done to it, on one line — the title used to float above the action
 * buttons on a row of its own.
 *
 * Its height is published as `--dali-toolbar-height` on the scroll container:
 * the featured-controls strip below is sticky too and must park exactly flush
 * against this toolbar's bottom edge, which moves whenever the title or the
 * button row wraps.
 */
export const TabToolbar = ({ title, children }: PropsWithChildren<{ title?: ReactNode }>) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    const container = toolbar?.closest<HTMLElement>('.dali-content');
    if (!toolbar || !container) {
      return undefined;
    }
    const publish = () => container.style.setProperty('--dali-toolbar-height', `${toolbar.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={toolbarRef} className="dali-deviceToolbar dali-tabToolbar">
      {title && <h2 className="dali-contentTitle">{title}</h2>}
      <div className="dali-tabToolbar-actions">{children}</div>
    </div>
  );
};
