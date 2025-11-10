import classNames from 'classnames';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Switch } from '@/components/switch';
import { PageLayout } from '@/layouts/page';
import { aliceStore, DefaultRoom } from '@/stores/alice';
import { authStore, UserRole } from '@/stores/auth';
import { notificationsStore } from '@/stores/notifications';
import { Room } from './components/room';
import { SmartDevice } from './components/smart-device';
import type { AlicePageParams, AlicePageState, View } from './types';
import './styles.css';

const AlicePage = observer(({ deviceStore }: AlicePageParams) => {
  const { t } = useTranslation();
  const {
    rooms,
    integrations,
    fetchData,
    fetchIntegrationStatus,
    isIntegrationEnabled,
    setIntegrationEnabled,
  } = aliceStore;
  const [pageState, setPageState] = useState<AlicePageState>('isLoading');
  const [bindingInfo, setBindingInfo] = useState({ url: '', isBinded: false });
  const [view, setView] = useState<View>({ roomId: 'all' });
  const [errors, setErrors] = useState([]);

  const handleIntegrationToggle = async (enabled: boolean) => {
    try {
      await setIntegrationEnabled(enabled);
      notificationsStore.showNotification({
        variant: 'success',
        text: enabled
          ? t('alice.notifications.integration-enabled')
          : t('alice.notifications.integration-disabled'),
      });
    } catch (err) {
      if (err.response?.status === 412) {
        runInAction(() => {
          aliceStore.isIntegrationEnabled = true;
        });
      }

      notificationsStore.showNotification({
        variant: 'danger',
        text: err.response?.data?.detail || t('alice.notifications.integration-error'),
      });
    }
  };

  useEffect(() => {
    // Load integration status
    fetchIntegrationStatus();

    // Load main data
    fetchData()
      .then((res) => {
        setBindingInfo({
          isBinded: !!res.unlink_url,
          url: res.link_url || res.unlink_url,
        });
        setPageState('isConnected');
      })
      .catch(() => setPageState('isNotConnected'));
  }, []);

  useEffect(() => {
    // Handle visibility change event
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible, load actual status
        fetchIntegrationStatus();
      }
    };

    // Subscribe to visibility change event
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Unsubscribe on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchIntegrationStatus]);

  useEffect(() => {
    if (integrations) {
      setErrors(!integrations.includes('alice') ? [{ variant: 'danger', text: t('alice.labels.unavailable') }] : []);
    }
  }, [integrations]);

  const sortedRooms = Array.from(rooms).sort(([keyA], [keyB]) => {
    if (keyA === DefaultRoom) return -1;
    if (keyB === DefaultRoom) return 1;
    return 0;
  });

  const isLoading = useMemo(
    () => !integrations || (integrations?.length && pageState === 'isLoading'),
    [integrations, pageState]
  );

  const headerActions = (
    <div className="alice-integrationToggle">
      <span className="alice-integrationToggle-label">{t('alice.labels.enable-integration')}</span>
      <Switch
        id="alice-integration-enabled"
        value={isIntegrationEnabled}
        onChange={handleIntegrationToggle}
      />
    </div>
  );

  return (
    <PageLayout
      title={t('alice.title')}
      isLoading={isLoading}
      hasRights={authStore.hasRights(UserRole.Admin)}
      errors={errors}
      actions={headerActions}
    >
      {!!integrations?.length && (
        pageState === 'isConnected'
          ? (
            <>
              {isIntegrationEnabled && (
                bindingInfo.isBinded
                  ? (
                    <div className="alice-bindingContainer">
                      <span>{t('alice.labels.is-binded')}</span>
                      <a href={bindingInfo.url} className="alice-binding" target="_blank">
                        {t('alice.buttons.check-binding-status')}
                      </a>
                    </div>
                  )
                  : (
                    <a href={bindingInfo.url} className="alice-binding" target="_blank">
                      {t('alice.buttons.bind')}
                    </a>
                  )
              )}

              <div className="alice-container">
                <aside className="alice-sidebar">
                  <div className="alice-mainButtons">
                    <Button
                      label={t('alice.buttons.add-device')}
                      onClick={() => setView({ isNewDevice: true })}
                    />

                    <Button
                      label={t('alice.buttons.add-room')}
                      variant="secondary"
                      onClick={() => setView({ isNewRoom: true })}
                    />

                    <Button
                      className={classNames('alice-roomName', {
                        'alice-roomSelected': view.roomId === 'all',
                      })}
                      label={t('alice.buttons.all-devices')}
                      variant="unaccented"
                      onClick={() => setView({ roomId: 'all' })}
                    />
                  </div>

                  <div className="alice-rooms">
                    {sortedRooms.map(([key]) => (
                      <Fragment key={key}>
                        <Button
                          className={classNames('alice-roomName', {
                            'alice-roomSelected': key === view.roomId,
                          })}
                          label={rooms.get(key).name}
                          variant="unaccented"
                          onClick={() => setView({ roomId: key })}
                        />
                        {key === DefaultRoom && sortedRooms.length > 1 && <hr className="alice-separator" />}
                      </Fragment>
                    ))}
                  </div>
                </aside>
                {!!(view.isNewRoom || view.roomId) && (
                  <Room
                    id={view.roomId}
                    onSave={(roomId) => setView({ roomId })}
                    onDelete={() => setView({ roomId: DefaultRoom })}
                    onOpenDevice={(deviceId) => setView({ deviceId })}
                  />)}
                {!!(view.isNewDevice || view.deviceId) && (
                  <SmartDevice
                    id={view.deviceId}
                    deviceStore={deviceStore}
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
    </PageLayout>
  );
});

export default AlicePage;
