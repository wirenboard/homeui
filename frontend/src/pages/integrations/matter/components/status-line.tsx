import classNames from 'classnames';
import WarnIcon from '@/assets/icons/warn.svg';
import type { NamedLineProps, StatusLineProps } from '../types';

/**
 * One line of what the page says of a device or of a fabric, drawn by how it came out:
 *
 * - 'error' - there is something to do: the triangle stands before the line. It is the
 *   only sign this page draws;
 * - 'ok' - all is well: no sign, only its empty place, so every line starts at one level;
 * - 'off' - there is nothing to say (not passed, not known, never happened): no sign, grey.
 *
 * In a column of a table the place of the sign is the margin of the column, so the words
 * of the lines stand under its heading: see `matter-linesCell` in the styles.
 */
export const StatusLine = ({ status, children }: StatusLineProps) => (
  <span className={classNames('matter-line', { 'matter-lineQuiet': status === 'off' })}>
    {status === 'error'
      ? <WarnIcon className="matter-sign" aria-hidden="true" />
      : <span className="matter-sign" aria-hidden="true" />}
    <span>{children}</span>
  </span>
);

/**
 * A line that names a thing and says what it has to say of it. The two tables of the page
 * are read by this one rule:
 *
 * - with a `reason` the line is "name — reason", the name in bold when it is a problem;
 * - without one it is the name in grey and the value beside it, and the first line of a
 *   block goes without its name: the row itself says what that line is about.
 */
export const NamedLine = ({
  status, name, isFirst = false, reason, children,
}: NamedLineProps) => (
  <StatusLine status={status}>
    {reason ? (
      <>
        <span className={status === 'error' ? 'matter-lineWhat' : undefined}>{name}</span>
        <span className="matter-lineReason">{` — ${reason}`}</span>
      </>
    ) : (
      <>
        {!isFirst && <span className="matter-lineName">{name}</span>}
        {children}
      </>
    )}
  </StatusLine>
);
