import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

const ConnectionItem = observer(({ connection }) => {
  const { t } = useTranslation();
  return (
    <div className={'connection-item ' + connection.state}>
      <i className={connection.icon}></i>
      <div>
        <b>{connection.name}</b>
        {connection.description && (
          <span>
            <br />
            {t(connection.description)}
          </span>
        )}
        {!connection.withAutoconnect && (
          <span>
            <br />
            {t('network-connections.labels.manual-connect')}
          </span>
        )}
      </div>
    </div>
  );
});

export default ConnectionItem;
