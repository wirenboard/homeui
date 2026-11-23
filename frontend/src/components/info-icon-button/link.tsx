import classNames from 'classnames';
import InfoIcon from '@/assets/icons/info.svg';
import { Tooltip } from '@/components/tooltip';
import type { InfoIconLinkProps } from './types';
import './styles.css';

export const InfoIconLink = ({ className, tooltip, tooltipPlacement, ...rest }: InfoIconLinkProps) => {
  const link = (
    <a className={classNames('infoIconButton', className)} {...rest}>
      <InfoIcon className="infoIconButton-icon" aria-hidden="true" />
    </a>
  );

  return tooltip ? <Tooltip text={tooltip} placement={tooltipPlacement}>{link}</Tooltip> : link;
};
