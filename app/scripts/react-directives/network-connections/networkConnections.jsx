import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';
import {
  TabContent, TabPane, TabItem, TabsBuilder,
} from './tabs';
import {
  Spinner, ErrorBar, WarningBar, BootstrapRow, Button,
} from '../common';
import { ConfirmModal, SelectModal } from './modals';
import JsonEditor from './jsonEditor';
import { NetworksEditor } from './editorStore';
import { SwitcherForm } from './switcherEditor';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { ConnectionsStateProvider, useConnectionsState } from './context/ConnectionsStateContext';
import ConnectionsStore from './connectionsStore';

function makeTabItems(consStore) {
  const states = useConnectionsState();

  return consStore.connections.map((conStore) => {
    const onTabChange = async (from, to) => {
      await consStore.beforeConnectionSwitch(from);
      consStore.currentConnection = to;
    };

    const state = states.getState(conStore.connectionId);

    const children = (
      <div className={`connection-item ${state}`}>
        <i className={conStore.icon} />
        <div className="connection-item-text">
          <b>{conStore.name}</b>
          {conStore.description && (
          <span>
            <br />
            <Trans>{conStore.description}</Trans>
          </span>
          )}
        </div>
      </div>
    );

    return { id: conStore.connectionId, children, onTabChange };
  });
}

const TabPaneHeader = observer(({ conStore }) => {
  const { t } = useTranslation();
  const states = useConnectionsState();

  const state = states.getState(conStore.connectionId);
  const allowSwitchState = ['activated', 'not-connected'].includes(state);

  if (!conStore.managedByNM) {
    return '';
  }
  const labels = {
    '01_nm_ethernet': 'network-connections.labels.ethernet',
    '02_nm_modem': 'network-connections.labels.modem',
    '03_nm_wifi': 'network-connections.labels.wifi',
    '04_nm_wifi_ap': 'network-connections.labels.wifi-ap',
  };
  const label = labels[conStore.data.type] || 'network-connections.labels.connection';
  return (
    <BootstrapRow>
      <div className="col-xs-12 col-md-3 col-lg-2">
        <label className="tab-pane-header-label" htmlFor={`inputName${conStore.connectionId}`}>
          {t(label)}
        </label>
      </div>
      <div
        className={
          `col-xs-8 col-sm-9 col-md-6 col-lg-8 ${conStore.editedConnectionId ? '' : 'has-error'}`
        }
      >
        <input
          type="text"
          className="form-control"
          id={`inputName${conStore.connectionId}`}
          value={conStore.editedConnectionId}
          onChange={(e) => conStore.setConnectionId(e.target.value)}
        />
      </div>
      <div className="col-xs-4 col-sm-3 col-md-3 col-lg-2">
        <div className="pull-right">
          <Button
            disabled={!allowSwitchState}
            label={t(
              state === 'activated'
                ? 'network-connections.buttons.disconnect'
                : 'network-connections.buttons.connect',
            )}
            onClick={() => states.toggleState(conStore.connectionId)}
          />
        </div>
      </div>
    </BootstrapRow>
  );
});

const TabPaneButtons = observer(({ consStore, thisConStore }) => {
  const { t } = useTranslation();

  return (
    <BootstrapRow>
      <div className="col-md-12">
        <Button
          key="delete"
          label={t('network-connections.buttons.delete')}
          type="danger"
          onClick={() => consStore.deleteConnection(thisConStore)}
        />
        <div className="pull-right buttons-holder">
          <Button
            key="save"
            label={t('network-connections.buttons.save')}
            type="success"
            onClick={() => consStore.saveConnections()}
            disabled={!thisConStore.isChanged || thisConStore.hasErrors}
          />
          <Button
            key="cancel"
            label={t('network-connections.buttons.cancel')}
            type="default"
            onClick={() => thisConStore.rollback()}
            disabled={!thisConStore.isChanged || thisConStore === consStore.newConnection}
          />
        </div>
      </div>
    </BootstrapRow>
  );
});

function makeTabPanes(consStore) {
  return consStore.connections.map((conStore) => {
    const children = (
      <>
        <TabPaneHeader conStore={conStore} />
        <JsonEditor
          schema={conStore.schema}
          data={conStore.data}
          root={`cn${conStore.connectionId}`}
          onChange={conStore.setEditedData}
        />
        <TabPaneButtons consStore={consStore} thisConStore={conStore} />
      </>
    );

    return { id: conStore.connectionId, children };
  });
}

const ConnectionTabs = observer(() => {
  const { t } = useTranslation();
  const config = useConfig();

  const consStore = new ConnectionsStore(config);

  const addConnectionButton = (
    <Button
      label={t('network-connections.buttons.add-connection')}
      additionalStyles="add-connection-button"
      icon="glyphicon glyphicon-plus"
      onClick={() => consStore.createConnection()}
    />
  );
  return (
    <>
      <ErrorBar msg={config.error} />
      <DeprecationWarning deprecatedConnections={consStore.deprecatedConnections} />
      <ConfirmModal {...consStore.confirmModalState} />
      <SelectModal {...consStore.selectNewConnectionModalState} />
      <TabsBuilder
        tabs={makeTabItems(consStore)}
        contents={makeTabPanes(consStore)}
        bottomOfTheList={addConnectionButton}
        tabListClasses="col-md-2 nav nav-pills nav-stacked"
        tabContentClasses="col-md-10 well well-small"
      />
    </>
  );
});

function DeprecationWarning({ deprecatedConnections }) {
  if (!deprecatedConnections.length) {
    return '';
  }
  return (
    <WarningBar>
      <Trans
        count={deprecatedConnections.length}
        values={{ connections: deprecatedConnections.join(', ') }}
      >
        network-connections.labels.main-deprecation-notice
      </Trans>
    </WarningBar>
  );
}

function makeEditorTabItems(editor) {
  const { t } = useTranslation();
  const conOnClick = (e) => {
    e.preventDefault();
    editor.selectEditor(editor.connections);
  };
  const swOnClick = (e) => {
    e.preventDefault();
    editor.selectEditor(editor.switcher);
  };
  return (
    <>
      <EditorTabItem id="editorConnections" active={editor.connections.isActiveEditor} onClick={conOnClick}>
        {t('network-connections.title')}
      </EditorTabItem>
      <EditorTabItem id="editorManager" active={editor.switcher.isActiveEditor} onClick={swOnClick}>
        {t('connection-manager.title')}
      </EditorTabItem>
    </>
  );
}

function makeEditorTabPanes() {
  return (
    <>
      <EditorTabPane id="editorConnections" active={editor.connections.isActiveEditor}>
        <ConnectionTabs tabs={editor.connections} />
      </EditorTabPane>
      <EditorTabPane id="editorManager" active={editor.switcher.isActiveEditor}>
        <SwitcherForm switcher={editor.switcher} />
      </EditorTabPane>
    </>
  );
}

// what do we want from connections
//  - sorted list
//  - add/delete
//  - store new connections
//
// what do we want from a single connection
//  - store its edited state
//  - save on request
//  - scream when switch from tab without saving

function ConfigEditorTabs() {
  return <ConnectionTabs />;

  /*
  const { t } = useTranslation();
  const tabs = [{ id: 'Hello', children: (<i>Hello</i>), onTabChange: (from, to) => console.log('switch', from.id, to.id) }, { id: 'World', children: (<b>World</b>) }, { id: '123', children: '123' }];
  const contents = [{ id: 'Hello', children: (<i>Hello</i>) }, { id: 'World', children: (<b>World</b>) }, { id: '123', children: '123' }];

  const bottom = (
    <Button
      label={t('network-connections.buttons.add-connection')}
      additionalStyles="add-connection-button"
      icon="glyphicon glyphicon-plus"
      onClick={() => console.log('Hello!')}
    />
  );

  const subTabs = (
    <TabsBuilder
      tabs={tabs}
      contents={contents}
      bottomOfTheList={bottom}
      tabListClasses="col-md-2 nav nav-pills nav-stacked"
      tabContentClasses="col-md-10 well well-small"
    />
  );

  const superTabs = [{ id: 'FooBar', children: (<i>FooBar</i>) }, { id: 'BarBaz', children: ('BarBaz') }];
  const superContents = [{ id: 'FooBar', children: subTabs }, { id: 'BarBaz', children: 'trololo' }];

  return (
    <TabsBuilder tabs={superTabs} contents={superContents} tabListClasses="nav nav-tabs" />
  );

  return (
    <Tabs>
      <EditorTabList>{makeEditorTabItems()}</EditorTabList>
      <EditorTabContent>{makeEditorTabPanes()}</EditorTabContent>
    </Tabs>
  ); */
}

const NetworkConnectionsPage = observer(() => {
  const { t } = useTranslation();
  const configContext = useConfig();

  return (
    <div className="network-connections-page">
      <h1 className="page-header">
        <span>{t('network-connections.title')}</span>
      </h1>
      {configContext.isLoading ? <Spinner /> : <ConfigEditorTabs />}
    </div>
  );
});

function CreateNetworkConnections({ configContextData, connectionsStateContextData }) {
  return (
    <ConfigProvider data={configContextData}>
      <ConnectionsStateProvider data={connectionsStateContextData}>
        <NetworkConnectionsPage />
      </ConnectionsStateProvider>
    </ConfigProvider>
  );
}

export default CreateNetworkConnections;
