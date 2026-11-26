import classNames from 'classnames';
import InfoIcon from '@/assets/icons/info.svg';
import { Tooltip } from '@/components/tooltip';
import type { InfoIconButtonProps } from './types';
import './styles.css';

export const InfoIconButton = ({ className, tooltip, tooltipPlacement, ...rest }: InfoIconButtonProps) => {
  const button = (
    <button type="button" className={classNames('infoIconButton', className)} {...rest}>
      <InfoIcon className="infoIconButton-icon" aria-hidden="true" />
    </button>
  );

  return tooltip ? <Tooltip text={tooltip} placement={tooltipPlacement}>{button}</Tooltip> : button;
};
