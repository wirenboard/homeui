import React from 'react';
import { Tabs, TabList, TabContent, TabPane, TabItem } from './tabs';
import { Spinner, ErrorBar, WarningBar } from '../common';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';
import { BootstrapRow } from '../common';
import { ConfirmModal, SelectModal } from './modals';
import JsonEditor from './jsonEditor';
import { Button } from '../common';

function makeTabItems(tabs) {
  return tabs.connections.map(tab => {
    const onClick = e => {
      e.preventDefault();
      tabs.setSelected(tab);
    };

    return (
      <TabItem key={tab.id} active={tab.active} onClick={onClick}>
        <div className={'connection-item ' + tab.state}>
          <i className={tab.icon}></i>
          <div className="connection-item-text">
            <b>{tab.name}</b>
            {tab.description && (
              <span>
                <br />
                <Trans>{tab.description}</Trans>
              </span>
            )}
          </div>
        </div>
      </TabItem>
    );
  });
}

function makeTabPanes(tabs) {
  const { t } = useTranslation();
  return tabs.connections.map(tab => {
    return (
      <TabPane key={tab.id} active={tab.active}>
        <JsonEditor
          schema={tab.schema}
          data={tab.data}
          root={'cn' + tab.id}
          onChange={tab.setEditedData}
        />
        <BootstrapRow>
          <div className="col-md-12">
            <Button
              key="delete"
              label={t('network-connections.buttons.delete')}
              type="danger"
              onClick={() => tabs.deleteConnection(tab)}
            />
            <div className="pull-right buttons-holder">
              <Button
                key="save"
                label={t('network-connections.buttons.save')}
                type="success"
                onClick={() => tabs.saveConnections(tabs.connections)}
                disabled={!tab.isChanged || tab.hasErrors}
              />
              <Button
                key="cancel"
                label={t('network-connections.buttons.cancel')}
                type="default"
                onClick={() => tab.rollback()}
                disabled={!tab.isChanged || tab.isNew}
              />
            </div>
          </div>
        </BootstrapRow>
      </TabPane>
    );
  });
}

const ConnectionTabs = observer(({ tabs }) => {
  const { t } = useTranslation();
  return (
    <>
      <ConfirmModal {...tabs.confirmModalState} />
      <SelectModal {...tabs.selectNewConnectionModalState} />
      <Tabs>
        <TabList>
          {makeTabItems(tabs)}
          <Button
            label={t('network-connections.buttons.add-connection')}
            additionalStyles="add-connection-button"
            icon="glyphicon glyphicon-plus"
            onClick={() => tabs.createConnection()}
          />
        </TabList>
        <TabContent>{makeTabPanes(tabs)}</TabContent>
      </Tabs>
    </>
  );
});

const DeprecationWarning = ({ deprecatedConnections }) => {
  if (!deprecatedConnections.length) {
    return;
  }
  return (
    <WarningBar>
      <Trans
        count={deprecatedConnections.length}
        values={{ connections: deprecatedConnections.join(', ') }}
      >
        {'network-connections.labels.main-deprecation-notice'}
      </Trans>
    </WarningBar>
  );
};

const NetworkConnectionsPage = observer(({ connections }) => {
  const { t } = useTranslation();
  return (
    <div className="network-connections-page">
      <ErrorBar msg={connections.error}></ErrorBar>
      <DeprecationWarning deprecatedConnections={connections.deprecatedConnections} />
      <h1 className="page-header">
        <span>{t('network-connections.title')}</span>
      </h1>
      {connections.loading ? <Spinner /> : <ConnectionTabs tabs={connections} />}
    </div>
  );
});

function CreateNetworkConnections({ connections }) {
  return <NetworkConnectionsPage connections={connections}></NetworkConnectionsPage>;
}

export default CreateNetworkConnections;
