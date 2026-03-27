import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Tabs, TabContent, useTabs } from '@/components/tabs';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import { ConnectionsEditor } from './components/connections-editor/connections-editor';
import { SwitcherEditor } from './components/switcher';
import { type NetworkConnectionsPageProps } from './types';
import './styles.css';

const NetworkConnectionsPage = observer(({ store, rootScope }: NetworkConnectionsPageProps) => {
  const { t } = useTranslation();
  const { setIsDirty } = usePreventLeavePage(rootScope);
  const [ confirmChanges, isConfirmChangesOpened, handleConfirmChanges, handleCloseConfirmChanges ] = useConfirm<any>();
  const [ confirmErrors, isConfirmErrorsOpened, handleConfirmErrors, handleCloseConfirmErrors ] = useConfirm<any>();

  const tabs = [
    { id: 0, label: t('network-connections.labels.connections') },
    { id: 1, label: t('network-connections.labels.switcher') },
  ];

  useEffect(() => {
    setIsDirty(store.isDirty);
  }, [store.isDirty]);

  const { activeTab, onTabChange } = useTabs({
    defaultTab: 0,
    items: tabs,
    onBeforeTabChange: (next, current) => store.onSelect(next, current, confirmChanges, confirmErrors),
  });

  return (
    <>
      <PageLayout
        title={t('network-connections.labels.connections')}
        hasRights={authStore.hasRights(UserRole.Admin)}
        isLoading={store.loading}
        errors={store.error ? [{ variant: 'danger', text: store.error }] : []}
      >

        <div className="network-connections-page">
          <div>
            {!!store.connections.deprecatedConnections.length && (
              <Alert variant="warn" className="networkConnections-alert">
                <Trans
                  i18nKey="network-connections.labels.main-deprecation-notice"
                  count={store.connections.deprecatedConnections.length}
                  values={{ connections: store.connections.deprecatedConnections.join(', ') }}
                />
              </Alert>
            )}
            <Tabs
              activeTab={activeTab}
              items={tabs}
              orientation="horizontal"
              onTabChange={onTabChange}
            />
            <div className="networkConnections-content">
              <TabContent activeTab={activeTab} tabId={0}>
                <ConnectionsEditor
                  connections={store.connections}
                  onSave={() => store.saveAll()}
                  onDelete={(connection) => store.deleteConnection(connection)}
                  onSelect={(newIndex, currentIndex) => store
                    .selectConnection(newIndex, currentIndex, confirmChanges, confirmErrors)}
                  onAdd={(connectionType, currentIndex) => store
                    .createConnection(connectionType, currentIndex, confirmChanges, confirmErrors)}
                  onToggleState={(connection) => store.toggleConnectionState(connection)}
                />
              </TabContent>
              <TabContent activeTab={activeTab} tabId={1}>
                <SwitcherEditor switcher={store.switcher} onSave={() => store.saveAll()} />
              </TabContent>
            </div>
          </div>
        </div>
      </PageLayout>
      {isConfirmChangesOpened && (
        <Confirm
          isOpened={isConfirmChangesOpened}
          heading={t('network-connections.prompt.confirmation-title')}
          footerActions={
            <>
              <Button
                label={t('network-connections.buttons.cancel')}
                variant="secondary"
                onClick={() => handleCloseConfirmChanges('cancel')}
              />
              <Button
                label={t('network-connections.buttons.dont-save')}
                variant="danger"
                onClick={() => handleConfirmChanges('dont-save')}
              />
              <Button
                label={t('network-connections.buttons.save')}
                variant="primary"
                onClick={() => handleConfirmChanges('save')}
              />
            </>
          }
        >{t('network-connections.labels.changes')}
        </Confirm>
      )}
      {isConfirmErrorsOpened && (
        <Confirm
          isOpened={isConfirmErrorsOpened}
          heading={t('network-connections.prompt.confirmation-title')}
          variant="danger"
          acceptLabel={t('network-connections.buttons.dont-save')}
          closeCallback={() => handleCloseConfirmErrors('cancel')}
          confirmCallback={() => handleConfirmErrors('dont-save')}
        >
          {t('network-connections.labels.has-errors')}
        </Confirm>
      )}
    </>
  );
});

export default NetworkConnectionsPage;
