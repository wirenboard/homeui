import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Tooltip } from '@/components/tooltip';
import type { DescriptionStatusProps } from './types';
import './styles.css';

export const DescriptionStatus = ({ isConnected, isCompact, description }: DescriptionStatusProps) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery({ minWidth: 768 });

  return (
    <div
      className={classNames('descriptionStatus', {
        'descriptionStatus-mobile': !isDesktop,
      })}
    >
      {isCompact
        ? (
          <Tooltip
            text={t(isConnected ? 'navigation.connection.active' : 'navigation.connection.inactive')}
            className="descriptionStatus-tooltip"
          >
            <div
              className={classNames(
                'descriptionStatus-descriptionStatus',
                'descriptionStatus-descriptionStatusCompact', {
                  'descriptionStatus-statusConnectedBadge': isConnected,
                  'descriptionStatus-statusDisconnectedBadge': !isConnected,
                })}
            >
            </div>
          </Tooltip>
        )
        : (
          <>
            {description
              ? (
                <>
                  <div className="descriptionStatus-description">
                    {description}
                  </div>
                  <div
                    className={classNames('descriptionStatus-descriptionStatus', {
                      'descriptionStatus-statusConnectedBadge': isConnected,
                      'descriptionStatus-statusDisconnectedBadge': !isConnected,
                    })}
                  >
                  </div>
                </>
              )
              : (
                <div
                  className={classNames('descriptionStatus-status', {
                    'descriptionStatus-statusConnected': isConnected,
                    'descriptionStatus-statusDisconnected': !isConnected,
                  })}
                >
                  {t(isConnected ? 'navigation.connection.active' : 'navigation.connection.inactive')}
                </div>
              )
            }
          </>
        )}
    </div>
  );
};
