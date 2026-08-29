import type { PropsWithChildren, ReactNode } from 'react';

/**
 * The sticky row at the top of every DALI page: what the page is, and what
 * can be done to it, on one line — the title used to float above the action
 * buttons on a row of its own.
 */
export const TabToolbar = ({ title, children }: PropsWithChildren<{ title?: ReactNode }>) => (
  <div className="dali-deviceToolbar dali-tabToolbar">
    {title && <h2 className="dali-contentTitle">{title}</h2>}
    <div className="dali-tabToolbar-actions">{children}</div>
  </div>
);
