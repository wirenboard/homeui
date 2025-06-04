import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useState } from 'react';
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
  const { rooms, fetchData } = aliceStore;
  const [pageState, setPageState] = useState<AlicePageState>('isLoading');
  const [view, setView] = useState<View>({ roomId: 'all' });

  useEffect(() => {
    fetchData()
      .then(() => setPageState('isConnected'))
      .catch(() => setPageState('isNotConnected'));
  }, []);

  const sortedRooms = Array.from(rooms).sort(([keyA], [keyB]) => {
    if (keyA === DefaultRoom) return -1;
    if (keyB === DefaultRoom) return 1;
    return 0;
  });

  return (
    <PageLayout
      title={t('alice.title')}
      isLoading={pageState === 'isLoading'}
      hasRights={hasRights}
    >
      {pageState === 'isConnected'
        ? (
          <>
            <a href="" className="alice-binding" target="_blank">{t('alice.buttons.binding')}</a>

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
        )}
    </PageLayout>
  );
});

export default AlicePage;
