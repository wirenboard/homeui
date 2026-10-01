import classNames from 'classnames';
import { createElement } from 'react';
import { Tooltip } from '@/components/tooltip';
import type { ConsoleIconButtonProps } from './types';

/** Tooltip-wrapped icon button matching the console header button style. */
export const ConsoleIconButton = ({ icon, tooltip, active, disabled, onClick }: ConsoleIconButtonProps) => (
  <Tooltip text={tooltip}>
    <button
      className="consolePanel-button"
      aria-label={tooltip}
      disabled={disabled}
      onClick={onClick}
    >
      {createElement(icon, { className: classNames('consolePanel-icon', { 'consolePanel-iconActive': active }) })}
    </button>
  </Tooltip>
);
