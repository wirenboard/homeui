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

const TabPaneHeader = observer(({ tab }) => {
  const { t } = useTranslation();
  if (!tab.managedByNM) {
    return;
  }
  const labels = {
    '01_nm_ethernet': 'network-connections.labels.ethernet',
    '02_nm_modem': 'network-connections.labels.modem',
    '03_nm_wifi': 'network-connections.labels.wifi',
    '04_nm_wifi_ap': 'network-connections.labels.wifi-ap',
  };
  const label = labels[tab.data.type] || 'network-connections.labels.connection';
  return (
    <BootstrapRow>
      <div className="col-xs-12 col-md-3 col-lg-2">
        <label className={'tab-pane-header-label'} htmlFor={'inputName' + tab.id}>
          {t(label)}
        </label>
      </div>
      <div
        className={
          'col-xs-8 col-sm-9 col-md-6 col-lg-8' + (tab.editedConnectionId ? '' : ' has-error')
        }
      >
        <input
          type="text"
          className="form-control"
          id={'inputName' + tab.id}
          value={tab.editedConnectionId}
          onChange={e => tab.setConnectionId(e.target.value)}
        />
      </div>
      <div className="col-xs-4 col-sm-3 col-md-3 col-lg-2">
        <div className="pull-right">
          <Button
            disabled={!tab.allowSwitchState}
            label={t(
              tab.state === 'activated'
                ? 'network-connections.buttons.disconnect'
                : 'network-connections.buttons.connect'
            )}
            onClick={() => tab.switchState()}
          />
        </div>
      </div>
    </BootstrapRow>
  );
});

const TabPaneButtons = observer(({ tabs, tab }) => {
  const { t } = useTranslation();
  return (
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
  );
});

function makeTabPanes(tabs) {
  return tabs.connections.map(tab => {
    return (
      <TabPane key={tab.id} active={tab.active}>
        <TabPaneHeader tab={tab} />
        <JsonEditor
          schema={tab.schema}
          data={tab.data}
          root={'cn' + tab.id}
          onChange={tab.setEditedData}
        />
        <TabPaneButtons tabs={tabs} tab={tab} />
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
