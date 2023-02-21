import React from 'react';
import { VerticalTabs, TabsList, TabContent, TabPane, TabItem } from './tabs';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { BootstrapRow } from '../common';
import JsonEditor from './jsonEditor';
import { Button } from '../common';
import ConnectionItem from './connectionItem';

function makeTabItems(connections) {
  return connections.map((connection, index) => {
    return (
      <TabItem key={index}>
        <ConnectionItem connection={connection} />
      </TabItem>
    );
  });
}

const TabPaneHeader = observer(({ connection, onToggleState }) => {
  const { t } = useTranslation();
  if (!connection.managedByNM) {
    return;
  }
  const labels = {
    '01_nm_ethernet': 'network-connections.labels.ethernet',
    '02_nm_modem': 'network-connections.labels.modem',
    '03_nm_wifi': 'network-connections.labels.wifi',
    '04_nm_wifi_ap': 'network-connections.labels.wifi-ap',
  };
  const label = labels[connection.data.type] || 'network-connections.labels.connection';
  return (
    <BootstrapRow>
      <div className="col-xs-12 col-md-3 col-lg-2">
        <label className={'tab-pane-header-label'}>{t(label)}</label>
      </div>
      <div
        className={
          'col-xs-8 col-sm-9 col-md-6 col-lg-8' +
          (connection.editedConnectionId ? '' : ' has-error')
        }
      >
        <input
          type="text"
          className="form-control"
          value={connection.editedConnectionId}
          onChange={e => connection.setConnectionId(e.target.value)}
        />
      </div>
      <div className="col-xs-4 col-sm-3 col-md-3 col-lg-2">
        <div className="pull-right">
          <Button
            disabled={!connection.allowSwitchState}
            label={t(
              connection.state === 'activated'
                ? 'network-connections.buttons.disconnect'
                : 'network-connections.buttons.connect'
            )}
            onClick={() => onToggleState(connection)}
          />
        </div>
      </div>
    </BootstrapRow>
  );
});

const TabPaneButtons = observer(({ onSave, onDelete, connection }) => {
  const { t } = useTranslation();
  return (
    <BootstrapRow>
      <div className="col-md-12">
        <Button
          key="delete"
          label={t('network-connections.buttons.delete')}
          type="danger"
          onClick={() => onDelete(connection)}
        />
        <div className="pull-right buttons-holder">
          <Button
            key="save"
            label={t('network-connections.buttons.save')}
            type="success"
            onClick={() => onSave(connection)}
            disabled={!connection.isDirty || connection.hasErrors}
          />
          <Button
            key="cancel"
            label={t('network-connections.buttons.cancel')}
            type="default"
            onClick={() => connection.reset()}
            disabled={!connection.isDirty || connection.isNew}
          />
        </div>
      </div>
    </BootstrapRow>
  );
});

function makeTabPanes(connections, onSave, onDelete, onToggleState) {
  return connections.map((connection, index) => {
    return (
      <TabPane key={index}>
        <TabPaneHeader connection={connection} onToggleState={onToggleState} />
        <JsonEditor
          schema={connection.schema}
          data={connection.data}
          root={'cn' + index}
          onChange={connection.setEditedData}
        />
        <TabPaneButtons connection={connection} onSave={onSave} onDelete={onDelete} />
      </TabPane>
    );
  });
}

const ConnectionsEditor = observer(
  ({ connections, onSelect, onSave, onDelete, onAdd, onToggleState }) => {
    const { t } = useTranslation();
    return (
      <>
        <VerticalTabs selectedIndex={connections.selectedConnectionIndex} onSelect={onSelect}>
          <TabsList>
            {makeTabItems(connections.connections)}
            <Button
              label={t('network-connections.buttons.add-connection')}
              additionalStyles="add-connection-button"
              icon="glyphicon glyphicon-plus"
              onClick={onAdd}
            />
          </TabsList>
          <TabContent>
            {makeTabPanes(connections.connections, onSave, onDelete, onToggleState)}
          </TabContent>
        </VerticalTabs>
      </>
    );
  }
);

export default ConnectionsEditor;
