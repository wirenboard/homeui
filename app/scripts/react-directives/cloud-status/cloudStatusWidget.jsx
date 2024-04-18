import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

const ActivationLink = observer(({ link }) => {
  const { t } = useTranslation();
  return (
    <div className="alert alert-info">
      {t('system.cloud-status.activation-link-preamble')}{' '}
      <a href={link} className="alert-link" target="_blank" rel="noreferrer">
        {t('system.cloud-status.activation-link')}
      </a>
    </div>
  );
});

const CloudStatus = observer(({ status }) => {
  const { t } = useTranslation();

  if (status == 'ok') {
    return (
      <div className="alert alert-success">
        <i className="glyphicon glyphicon-ok" /> {t('system.cloud-status.status-ok')}
      </div>
    );
  }
  return (
    <div className="alert alert-danger">
      <i className="glyphicon glyphicon-remove" /> {t('system.cloud-status.status-error') + status}
    </div>
  );
});

function CloudLink({ link }) {
  const { t } = useTranslation();

  return (
    <a href={link} target="_blank" className="btn btn-success btn-lg" rel="noreferrer">
      <i className="glyphicon glyphicon-cloud" /> {t('system.cloud-status.goto-cloud')}
    </a>
  );
}

const CloudStatusWidget = observer(({ store }) => {
  const { t } = useTranslation();

  if (!store.initialized) {
    return null;
  }

  return (
    <div className="panel panel-default">
      <div className="panel-heading">
        <h3 className="panel-title">
          <i className="glyphicon glyphicon-cloud" /> {t('system.cloud-status.title')} ({store.provider})
        </h3>
      </div>
      <div className="panel-body">
        {store.activationLink == null ? (
          <>
            <CloudStatus status={store.status} />
            <CloudLink link={store.cloudLink} />
          </>
        ) : (
          <ActivationLink link={store.activationLink} />
        )}
      </div>
    </div>
  );
});

function CreateCloudStatusWidget({ store }) {
  return <CloudStatusWidget store={store} />;
}

export default CreateCloudStatusWidget;
