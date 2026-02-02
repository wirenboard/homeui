import classNames from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Tooltip } from '@/components/tooltip';
import type { DescriptionStatusProps } from './types';
import './styles.css';

export const DescriptionStatus = ({ mqttClient, isCompact, description }: DescriptionStatusProps) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery({ minWidth: 768 });
  const isConnected = useMemo(() => mqttClient.isConnected(), [mqttClient.isConnected()]);

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
