import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';

const ActivationLink = observer(({ store }) => (
  <div className="alert alert-info">
    <Trans i18nKey="system.cloud-status.activation-link-preamble" />
    {' '}
    <a href={store.activationLink} className="alert-link" target="_blank" rel="noreferrer"><Trans i18nKey="system.cloud-status.activation-link" /></a>
  </div>
));

const CloudStatus = observer(({ store }) => {
  const { t } = useTranslation();

  if (store.status == 'ok') {
    return (
      <div className="alert alert-success">
        <i className="glyphicon glyphicon-ok" />
        {' '}
        {t('system.cloud-status.status-ok')}
      </div>
    );
  }
  return (
    <div className="alert alert-danger">
      <i className="glyphicon glyphicon-remove" />
      {' '}
      {t('system.cloud-status.status-error') + store.status}
    </div>
  );
});

function CloudLink() {
  const { t } = useTranslation();

  return (
    <a href="https://wirenboard.cloud" target="_blank" className="btn btn-success btn-lg" rel="noreferrer">
      <i className="glyphicon glyphicon-cloud" />
      {' '}
      {t('system.cloud-status.goto-cloud')}
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
          <i className="glyphicon glyphicon-cloud" />
          {' '}
          {t('system.cloud-status.title')}
        </h3>
      </div>
      <div className="panel-body">
        { store.activationLink != null ? <ActivationLink store={store} /> : null }
        { store.activationLink == null ? (
          <>
            <CloudStatus store={store} />
            <CloudLink />
          </>
        ) : null }
      </div>
    </div>
  );
});

function CreateCloudStatusWidget({ store }) {
  return <CloudStatusWidget store={store} />;
}

export default CreateCloudStatusWidget;
