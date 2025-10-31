import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { PageLayout } from '@/layouts/page';
import { aliceStore, DefaultRoom } from '@/stores/alice';
import { notificationsStore } from '@/stores/notifications';
import { Room } from './components/room';
import { SmartDevice } from './components/smart-device';
import type { AlicePageParams, AlicePageState, View } from './types';
import './styles.css';

const AlicePage = observer(({ hasRights, deviceStore }: AlicePageParams) => {
  const { t } = useTranslation();
  const { rooms, integrations, fetchData } = aliceStore;
  const [pageState, setPageState] = useState<AlicePageState>('isLoading');
  const [bindingInfo, setBindingInfo] = useState({ url: '', isBinded: false });
  const [view, setView] = useState<View>({ roomId: 'all' });
  const [errors, setErrors] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
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

  const handleUnlinkController = async (ev?: React.MouseEvent) => {
    if (ev) ev.preventDefault();
    setIsConfirmModalOpen(true);
  };

  const confirmUnlink = async () => {
    setIsConfirmModalOpen(false);
    try {
      const url = `/integrations/alice/controller`;
      const resp = await fetch(url, { 
        method: 'DELETE',
        mode: 'cors',
        credentials: 'include',});
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || resp.statusText);
      }
      notificationsStore.showNotification({ variant: 'success', text: t('alice.binding.unlinked') });
      await fetchData();
      window.location.reload();
    } catch (err: any) {
      notificationsStore.showNotification({ variant: 'danger', text: err?.message || String(err) });
    }
  };

  return (
    <PageLayout
      title={t('alice.title')}
      isLoading={isLoading}
      hasRights={hasRights}
      errors={errors}
    >
      {!!integrations?.length && (
        pageState === 'isConnected'
          ? (
            <>
              {bindingInfo.isBinded
                ? (
                  <div className="alice-bindingContainer">
                    <a href={bindingInfo.url} className="alice-binding" target="_blank">
                      {t('alice.buttons.check-binding-status')}
                    </a>
                    <span>{t('alice.labels.is-binded')}</span>
                    <a
                      href="/integrations/alice/controller"
                      className="alice-binding alice-unlink"
                      onClick={handleUnlinkController}
                      title={t('alice.binding.unlink-controller')}
                    >
                      {t('alice.binding.unlink-controller')}
                    </a>
                  </div>
                )
                : (
                  <a href={bindingInfo.url} className="alice-binding" target="_blank">
                    {t('alice.buttons.bind')}
                  </a>
                )
              }

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
