import React from 'react';
import { Spinner, ErrorBar, WarningBar } from '../common';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';
import ConnectionsEditor from './connectionsEditor';
import SwitcherEditor from './switcherEditor';
import { ConfirmModal, SelectModal } from './modals';
import { HorizontalTabs, TabContent, TabItem, TabPane, TabsList } from './tabs';

const TabTitle = ({ title }) => {
  return <div className="tab-title">{title}</div>;
};

const PageTabs = ({
  connections,
  switcher,
  onSelect,
  selectedIndex,
  onSelectConnection,
  onAdd,
  onDeleteConnection,
  onToggleConnectionState,
  onSave,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <HorizontalTabs selectedIndex={selectedIndex} onSelect={onSelect}>
        <TabsList>
          <TabItem>
            <TabTitle title={t('network-connections.labels.connections')} />
          </TabItem>
          <TabItem>
            <TabTitle title={t('network-connections.labels.switcher')} />
          </TabItem>
        </TabsList>
        <TabContent>
          <TabPane>
            <ConnectionsEditor
              connections={connections}
              onSave={onSave}
              onDelete={onDeleteConnection}
              onSelect={onSelectConnection}
              onAdd={onAdd}
              onToggleState={onToggleConnectionState}
            />
          </TabPane>
          <TabPane>
            <SwitcherEditor switcher={switcher} onSave={onSave} />
          </TabPane>
        </TabContent>
      </HorizontalTabs>
    </>
  );
};

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

const NetworkConnectionsPage = observer(({ pageStore }) => {
  const { t } = useTranslation();
  return (
    <div className="network-connections-page">
      <ErrorBar msg={pageStore.error}></ErrorBar>
      <h1 className="page-header">{t('network-connections.labels.connections')}</h1>
      <DeprecationWarning deprecatedConnections={pageStore.connections.deprecatedConnections} />
      <ConfirmModal {...pageStore.confirmModalState} />
      <SelectModal {...pageStore.selectNewConnectionModalState} />
      {pageStore.loading ? (
        <Spinner />
      ) : (
        <PageTabs
          connections={pageStore.connections}
          switcher={pageStore.switcher}
          selectedIndex={pageStore.selectedTabIndex}
          onSelect={(index, lastIndex) => pageStore.onSelect(index, lastIndex)}
          onSelectConnection={index => pageStore.selectConnection(index)}
          onAdd={() => pageStore.createConnection()}
          onDeleteConnection={connection => pageStore.deleteConnection(connection)}
          onToggleConnectionState={connection => pageStore.toggleConnectionState(connection)}
          onSave={() => pageStore.saveAll()}
        />
      )}
    </div>
  );
});

function CreateNetworkConnectionsPage({ pageStore }) {
  return <NetworkConnectionsPage pageStore={pageStore}></NetworkConnectionsPage>;
}

export default CreateNetworkConnectionsPage;
