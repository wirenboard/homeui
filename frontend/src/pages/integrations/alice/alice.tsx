import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { PageLayout } from '@/layouts/page';
import { aliceStore, DefaultRoom } from '@/stores/alice';
import { Room } from './components/room';
import { SmartDevice } from './components/smart-device';
import type { AlicePageParams, AlicePageState, View } from './types';
import './styles.css';

const AlicePage = observer(({ hasRights, deviceStore }: AlicePageParams) => {
  const { t } = useTranslation();
  const { rooms, isAvailable, fetchData } = aliceStore;
  const [pageState, setPageState] = useState<AlicePageState>('isLoading');
  const [bindingInfo, setBindingInfo] = useState({ url: '', isBinded: false });
  const [view, setView] = useState<View>({ roomId: 'all' });
  const [errors, setErrors] = useState([]);

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
    setErrors(isAvailable === false ? [{ variant: 'danger', text: t('alice.labels.unavailable') }] : []);
  }, [isAvailable]);

  const sortedRooms = Array.from(rooms).sort(([keyA], [keyB]) => {
    if (keyA === DefaultRoom) return -1;
    if (keyB === DefaultRoom) return 1;
    return 0;
  });

  const isLoading = useMemo(
    () => isAvailable === undefined || (isAvailable && pageState === 'isLoading'),
    [isAvailable, pageState]
  );

  return (
    <PageLayout
      title={t('alice.title')}
      isLoading={isLoading}
      hasRights={hasRights}
      errors={errors}
    >
      {isAvailable && (
        pageState === 'isConnected'
          ? (
            <>
              {bindingInfo.isBinded
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
              }

              <div className="alice-container">
                <aside className="alice-sidebar">
                  <div className="alice-mainButtons">
                    <Button
                      label={t('alice.buttons.add-device')}
                      size="large"
                      onClick={() => setView({ isNewDevice: true })}
                    />

                    <Button
                      label={t('alice.buttons.add-room')}
                      size="large"
                      variant="secondary"
                      onClick={() => setView({ isNewRoom: true })}
                    />

                    <Button
                      className={classNames('alice-roomName', {
                        'alice-roomSelected': view.roomId === 'all',
                      })}
                      label={t('alice.buttons.all-devices')}
                      size="large"
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
                          size="large"
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
