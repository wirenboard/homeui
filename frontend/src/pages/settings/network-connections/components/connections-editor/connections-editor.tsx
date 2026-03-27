import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { JsonEditor } from '@/components/json-editor';
import { Tabs, TabContent, useTabs } from '@/components/tabs';
import { useAsyncAction } from '@/utils/async-action';
import { NetworkType } from '../../stores/types';
import { ConnectionItem } from '../connection-item';
import { CreateConnectionModal } from '../create-connection-modal';
import { type ConnectionsEditorProps } from './types';
import './styles.css';

export const ConnectionsEditor = observer(({
  connections,
  onSelect,
  onSave,
  onDelete,
  onAdd,
  onToggleState,
}: ConnectionsEditorProps) => {
  const { t } = useTranslation();
  const [confirmDeleteConnection, setConfirmDeleteConnection] = useState(null);
  const [isShowCreate, setIsShowCreate] = useState(false);

  const labels = {
    [NetworkType.Ethernet]: 'network-connections.labels.ethernet',
    [NetworkType.Modem]: 'network-connections.labels.modem',
    [NetworkType.Wifi]: 'network-connections.labels.wifi',
    [NetworkType.WifiAp]: 'network-connections.labels.wifi-ap',
  };

  const tabs = useMemo(() => connections.connections.map((connection, index) => ({
    id: String(index),
    label: <ConnectionItem connection={connection} />,
  })), [connections.connections?.length]);

  const { activeTab, setActiveTab, onTabChange } = useTabs({
    defaultTab: '0',
    onBeforeTabChange: async (id) => {
      const targetIndex = await onSelect(Number(id), Number(activeTab));
      if (targetIndex !== null) {
        setActiveTab(String(targetIndex));
      }
      return false;
    },
    items: tabs,
  });

  const [onConfirmDelete, isDeleting] = useAsyncAction(async () => {
    await onDelete(confirmDeleteConnection);
    setConfirmDeleteConnection(null);
  });

  const [onConfirmSave, isSaving] = useAsyncAction(async () => {
    await onSave();
    setConfirmDeleteConnection(null);
  });

  return (
    <>
      <div className="connectionEditor">
        <div className="connectionEditor-tabs">
          <Tabs
            activeTab={activeTab}
            items={tabs}
            onTabChange={onTabChange}
          />
          <Button
            label={t('network-connections.buttons.add-connection')}
            className="connectionEditor-add"
            icon={<PlusIcon />}
            variant="secondary"
            aria-haspopup="dialog"
            onClick={() => setIsShowCreate(true)}
          />
        </div>
        <div className="connectionEditor-content">
          {connections.connections.map((connection, index) => (
            <TabContent
              key={index}
              activeTab={activeTab}
              tabId={String(index)}
              className="deviceSettingsEditor-tabContent"
            >
              {!!connection.managedByNM && (
                <header className="connectionEditor-header">
                  <label className="connectionEditor-connectionNameWrapper">
                    {t(labels[connection.data.type] || 'network-connections.labels.connection')}
                    <Input
                      className="connectionEditor-connectionName"
                      isInvalid={!connection.editedConnectionId}
                      value={connection.editedConnectionId}
                      isFullWidth
                      onChange={(value: string) => connection.setConnectionId(value)}
                    />
                  </label>
                  <Button
                    disabled={!connection.allowSwitchState}
                    label={t(
                      connection.state === 'activated'
                        ? 'network-connections.buttons.disconnect'
                        : 'network-connections.buttons.connect'
                    )}
                    onClick={() => onToggleState(connection)}
                  />
                </header>
              )}

              <JsonEditor
                schema={connection.schema}
                data={connection.data}
                root={'cn' + index}
                onChange={connection.setEditedData}
              />

              <div className="connectionEditor-footer">
                <Button
                  label={t('network-connections.buttons.delete')}
                  variant="danger"
                  aria-haspopup="dialog"
                  onClick={() => setConfirmDeleteConnection(connection)}
                />
                <div className="connectionEditor-actions">
                  <Button
                    label={t('network-connections.buttons.cancel')}
                    variant="secondary"
                    disabled={!connection.isDirty || connection.isNew}
                    onClick={() => connection.reset()}
                  />

                  <Button
                    label={t('network-connections.buttons.save')}
                    variant="primary"
                    isLoading={isSaving}
                    disabled={!connection.isDirty || connection.hasErrors}
                    onClick={onConfirmSave}
                  />
                </div>
              </div>
            </TabContent>
          ))}
        </div>
      </div>

      {!!confirmDeleteConnection && (
        <Confirm
          isOpened={!!confirmDeleteConnection}
          heading={t('network-connections.prompt.delete-title')}
          variant="danger"
          isLoading={isDeleting}
          acceptLabel={t('network-connections.buttons.delete')}
          closeCallback={() => setConfirmDeleteConnection(null)}
          confirmCallback={onConfirmDelete}
        >
          {t('network-connections.prompt.confirm-delete-connection')}
        </Confirm>
      )}

      {isShowCreate && (
        <CreateConnectionModal
          isOpened={isShowCreate}
          onClose={() => setIsShowCreate(false)}
          onCreate={async (value) => {
            const newIndex = await onAdd(value, Number(activeTab));
            if (newIndex !== null) {
              setActiveTab(String(newIndex));
            }
            setIsShowCreate(false);
          }}
        />
      )}
    </>
  );
}
);
