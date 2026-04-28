import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Switch } from '@/components/switch';
import { TabContent, Tabs, useTabs } from '@/components/tabs';
import { PageLayout } from '@/layouts/page';
import { aliceStore, DefaultRoom } from '@/stores/alice';
import { authStore, UserRole } from '@/stores/auth';
import { uiStore } from '@/stores/ui';
import { Room } from './components/room';
import { SmartDevice } from './components/smart-device';
import type { AlicePageProps, AlicePageState, View } from './types';
import './styles.css';

const AlicePage = observer(({ devicesStore }: AlicePageProps) => {
  const { t } = useTranslation();
  const {
    roomList,
    isAvailable,
    linkStatus,
    fetchData,
    fetchLinkStatus,
    fetchIntegrationStatus,
    isIntegrationEnabled,
    checkIsAvailable,
    setIntegrationEnabled,
  } = aliceStore;
  const [pageState, setPageState] = useState<AlicePageState>('isLoading');
  const [view, setView] = useState<View>({ roomId: 'all' });
  const [errors, setErrors] = useState([]);
  const [isIntegrationLoading, setIntegrationLoading] = useState(true);
  const sortedRooms = useMemo(() => [{ id: 'all', label: t('alice.buttons.all-devices') }, ...roomList
    .sort(([keyA], [keyB]) => {
      if (keyA === 'all') return -1;
      if (keyB === 'all') return 1;
      if (keyA === DefaultRoom) return -1;
      if (keyB === DefaultRoom) return 1;
      return 0;
    })
    .map(([id, room]) => ({ id, label: room.name }))], [roomList]);
  const { activeTab, setActiveTab, onTabChange } = useTabs({
    onAfterTabChange: (roomId) => setView({ roomId }),
    items: sortedRooms,
  });
  const isModuleInstalled = useMemo(() => uiStore.modules.some((item) => item === 'alice'), [uiStore.modules]);

  const refreshBindingStatus = async () => {
    try {
      await fetchLinkStatus();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message
        || t('alice.errors.integration-error');
      setErrors([{ variant: 'danger', text: msg, onClose: () => setErrors([]) }]);
      throw err;
    }
  };

  const handleIntegrationToggle = async (enabled: boolean) => {
    const prevEnabled = aliceStore.isIntegrationEnabled;
    let integrationUpdated = false;
    setIntegrationLoading(true);

    try {
      await setIntegrationEnabled(enabled);
      integrationUpdated = true;
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.detail || err?.response?.data?.message || null;

      runInAction(() => {
        aliceStore.isIntegrationEnabled = prevEnabled;
      });

      const msg = serverMessage
        ? serverMessage
        : status
          ? `${t('alice.errors.integration-error')} (${status})`
          : t('alice.errors.integration-error');

      setErrors([{ text: msg, variant: 'danger', onClose: () => setErrors([]) }]);
    } finally {
      if (integrationUpdated) {
        try {
          await refreshBindingStatus();
        } catch {
          // The integration state is independent from link status availability.
        }
      }
      setIntegrationLoading(false);
    }
  };
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (!authStore.hasRights(UserRole.Admin) || !isModuleInstalled) {
      return;
    }
    checkIsAvailable();
    setIntegrationLoading(true);
    (async () => {
      const results = await Promise.allSettled([
        fetchIntegrationStatus(),
        fetchLinkStatus(),
      ]);

      const firstRejected = results.find((result) => result.status === 'rejected');
      if (firstRejected?.status === 'rejected') {
        const err = firstRejected.reason;
        const msg = err?.response?.data?.detail || err?.response?.data?.message
          || t('alice.errors.integration-error');
        setErrors([{ variant: 'danger', text: msg, onClose: () => setErrors([]) }]);
      }

      setIntegrationLoading(false);
    })();

    fetchData()
      .then(() => setPageState('isConnected'))
      .catch(() => setPageState('isNotConnected'));
  }, [checkIsAvailable, fetchData, fetchIntegrationStatus, fetchLinkStatus, isModuleInstalled, t]);

  useEffect(() => {
    if (!authStore.hasRights(UserRole.Admin) || !isModuleInstalled) {
      return;
    }

    const refreshOnReturn = async () => {
      try {
        await fetchLinkStatus();
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.response?.data?.message
          || t('alice.errors.integration-error');
        setErrors([{ variant: 'danger', text: msg, onClose: () => setErrors([]) }]);
      }
    };

    const handleWindowFocus = () => {
      void refreshOnReturn();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshOnReturn();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchLinkStatus, isModuleInstalled, t]);

  useEffect(() => {
    if (!authStore.hasRights(UserRole.Admin)) {
      return;
    }
    const hasError = !isModuleInstalled || (typeof isAvailable === 'boolean' && !isAvailable);
    setErrors(hasError ? [{ variant: 'danger', text: t('alice.labels.unavailable') }] : []);
  }, [isAvailable, isModuleInstalled]);

  const isLoading = useMemo(
    () => (isModuleInstalled && isAvailable && pageState === 'isLoading'),
    [isModuleInstalled, isAvailable, pageState],
  );

  const handleUnlinkController = async (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setIsConfirmModalOpen(true);
  };

  const confirmUnlink = async () => {
    setIsConfirmModalOpen(false);
    try {
      await aliceStore.unlinkController();
      await refreshBindingStatus();
    } catch (err: any) {
      setErrors([{ variant: 'danger', text: err?.response?.data?.detail || err?.message || String(err) }]);
    }
  };

  const integrationToggle = isModuleInstalled && isAvailable ? (
    <div className="alice-integrationToggle">
      <span className="alice-integrationToggle-label">{t('alice.labels.enable-integration')}</span>
      <Switch
        id="alice-integration-enabled"
        value={isIntegrationEnabled}
        ariaLabel={t('alice.labels.enable-integration')}
        isDisabled={isIntegrationLoading}
        onChange={handleIntegrationToggle}
      />
    </div>
  ) : undefined;

  return (
    <PageLayout
      title={t('alice.title')}
      isLoading={isLoading}
      hasRights={authStore.hasRights(UserRole.Admin)}
      errors={errors}
      actions={integrationToggle}
    >
      {isModuleInstalled && isAvailable && (
        pageState === 'isConnected'
          ? (
            <>
              {linkStatus && (
                linkStatus.linked
                  ? (
                    <div className="alice-bindingContainer">
                      <a href={linkStatus.unlink_url} className="alice-binding" target="_blank" rel="noreferrer">
                        {t('alice.buttons.check-binding-status')}
                      </a>
                      <span>{t('alice.labels.is-binded')}</span>
                      <button
                        type="button"
                        className="alice-binding alice-unlink"
                        title={t('alice.binding.unlink-controller')}
                        onClick={handleUnlinkController}
                      >
                        {t('alice.binding.unlink-controller')}
                      </button>
                    </div>
                  )
                  : linkStatus.link_url ? (
                    <a href={linkStatus?.link_url} className="alice-binding" target="_blank" rel="noreferrer">
                      {t('alice.buttons.bind')}
                    </a>
                  ) : null
              )}

              <div className="alice-container">
                <aside className="alice-sidebar">
                  <div className="alice-mainButtons">
                    <Button
                      label={t('alice.buttons.add-device')}
                      onClick={() => {
                        setView({ isNewDevice: true });
                        setActiveTab(null);
                      }}
                    />

                    <Button
                      label={t('alice.buttons.add-room')}
                      variant="primary"
                      onClick={() => {
                        setView({ isNewRoom: true });
                        setActiveTab(null);
                      }}
                    />
                  </div>

                  <div className="alice-rooms">
                    <Tabs
                      className="alice-tabs"
                      activeTab={activeTab}
                      items={sortedRooms}
                      onTabChange={onTabChange}
                    />
                  </div>
                </aside>
                {!!(view.isNewRoom || view.roomId) && (
                  <TabContent tabId={view.roomId} activeTab={view.roomId}>
                    <Room
                      id={view.roomId}
                      onSave={(roomId) => {
                        setView({ roomId });
                        setActiveTab(roomId);
                      }}
                      onDelete={() => setView({ roomId: DefaultRoom })}
                      onOpenDevice={(deviceId) => setView({ deviceId })}
                    />
                  </TabContent>
                )}

                {!!(view.isNewDevice || view.deviceId) && (
                  <SmartDevice
                    id={view.deviceId}
                    devicesStore={devicesStore}
                    onSave={(deviceId) => setView({ deviceId })}
                    onDelete={() => setView({ roomId: 'all' })}
                    onOpenDevice={(deviceId) => setView({ deviceId })}
                  />)}
              </div>
            </>
          ) : (
            <ol className="alice-onboarding">
              <li>{t('alice.labels.onboarding1')}</li>
              <li>{t('alice.labels.onboarding2')}</li>
            </ol>
          )
      )}

      <Confirm
        isOpened={isConfirmModalOpen}
        heading={t('alice.binding.confirm-unlink')}
        confirmCallback={confirmUnlink}
        closeCallback={() => setIsConfirmModalOpen(false)}
        variant="danger"
        acceptLabel={t('alice.binding.confirm-unlink-button')}
      >
        {t('alice.binding.confirm-unlink-message')}
      </Confirm>
    </PageLayout>
  );
});

export default AlicePage;
