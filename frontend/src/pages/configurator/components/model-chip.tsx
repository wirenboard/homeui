import classNames from 'classnames';
import type { ModelChipProps } from '../types';

// Метка модели со счётчиком устройств; подпись Button — только строка, поэтому классы кнопки заданы вручную.
export const ModelChip = ({
  label, count, isActive, onClick,
}: ModelChipProps) => (
  <button
    type="button"
    className={classNames('button button-s configurator-modelChip', isActive ? 'button-primary' : 'button-secondary')}
    aria-pressed={isActive}
    onClick={onClick}
  >
    {label}
    <span className="configurator-modelCount">{count}</span>
  </button>
);
