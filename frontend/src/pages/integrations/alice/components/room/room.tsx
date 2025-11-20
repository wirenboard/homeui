import { observer } from 'mobx-react-lite';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import EditSquareIcon from '@/assets/icons/edit-square.svg';
import SwapIcon from '@/assets/icons/swap.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { Table, TableCell, TableRow } from '@/components/table';
import { aliceStore, DefaultRoom } from '@/stores/alice';
import { notificationsStore } from '@/stores/notifications';
import type { RoomParams } from './types';
import './styles.css';

export const Room = observer(({ id, onOpenDevice, onSave, onDelete }: RoomParams) => {
  const { t } = useTranslation();
  const { addRoom, deleteRoom, devices, fetchData, rooms, updateRoom } = aliceStore;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDeleteRoom, setIsDeleteRoom] = useState(false);
  const [roomName, setRoomName] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const deviceList = useMemo(() => {
    const formatRoomDevices = (keys: string[]) => keys
      .map((id) => {
        const device = devices.get(id)!;
        const room = rooms.get(device.room_id)?.name;

        const type: string[] = [];
        const mqtt: string[] = [];

        for (const skill of [...device.capabilities, ...device.properties]) {
          type.push(skill.type.split('.').at(-1)!);
          mqtt.push(skill.mqtt);
        }

        return {
          id,
          name: device.name,
          room,
          type,
          mqtt,
        };
      })
      .sort((a, b) =>
        sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );

    if (id === 'all') {
      return formatRoomDevices(Array.from(devices.keys()));
    } else if (id) {
      // After create new room - can return undefined, fix it by []
      return formatRoomDevices(rooms.get(id)?.devices || []);
    } else {
      return [];
    }
  }, [devices, rooms, id, sortDirection]);

  const save = useCallback(async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      if (!id) {
        const room = await addRoom(roomName);
        notificationsStore.showNotification({
          variant: 'success',
          text: t('alice.notifications.room-added', { name: roomName }),
        });
        onSave(room);
      } else {
        await updateRoom(id, { name: roomName, devices: deviceList.map((device) => device.id) });
        setIsEditingTitle(false);
        notificationsStore.showNotification({
          variant: 'success',
          text: t('alice.notifications.room-updated', { name: roomName }),
        });
      }
    } catch (err) {
      notificationsStore.showNotification({ variant: 'danger', text: err.response.data.detail });
    }
  }, [id, roomName, deviceList]);

  useEffect(() => {
    setIsEditingTitle(!id);
    if (id === 'all') {
      setRoomName(t('alice.buttons.all-devices'));
    } else {
      setRoomName(id ? rooms.get(id).name : '');
    }
  }, [id]);

  const onConfirmDelete = async () => {
    await deleteRoom(id);
    setIsDeleteRoom(false);
    await fetchData();
    notificationsStore.showNotification({
      variant: 'success',
      text: t('alice.notifications.room-deleted', { name: roomName }),
    });
    onDelete();
  };

  return (
    <>
      <div>
        <form className="alice-headerContainer" onSubmit={save}>
          <div className="alice-headerTitleWrapper">
            {isEditingTitle ? (
              <Input
                value={roomName}
                placeholder={t('alice.labels.room-name')}
                autoFocus
                isFullWidth
                onChange={(val: string) => setRoomName(val)}
              />
            ) : (<h4 className="alice-title">{roomName}</h4>)}

            {(!isEditingTitle && id && id !== DefaultRoom && id !== 'all') && (
              <Button
                size="small"
                type="button"
                icon={<EditSquareIcon />}
                variant="secondary"
                isOutlined
                onClick={() => setIsEditingTitle(true)}
              />
            )}
          </div>
          {id !== DefaultRoom && id !== 'all' && (
            <>
              <Button
                size="small"
                type="button"
                icon={<TrashIcon />}
                variant="secondary"
                isOutlined
                onClick={() => {
                  if (id) {
                    setIsDeleteRoom(true);
                  } else {
                    onDelete();
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!roomName}
                label={t('alice.buttons.save')}
                variant="secondary"
              />
            </>
          )}
        </form>
        <Table isWithoutGap>
          <TableRow isHeading>
            <TableCell>
              <div
                className="aliceRoom-swap"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {t('alice.labels.device')}
                <SwapIcon />
              </div>
            </TableCell>
            <TableCell>
              {t('alice.labels.room')}
            </TableCell>
            <TableCell>
              {t('alice.labels.property-capability')}
            </TableCell>
            <TableCell>
              {t('alice.labels.topic')}
            </TableCell>
          </TableRow>
          {deviceList.map((device) => (
            <TableRow key={device.id} className="aliceRoom-item" onClick={() => onOpenDevice(device.id)}>
              <TableCell verticalAlign="top" ellipsis>
                {device.name}
              </TableCell>

              <TableCell verticalAlign="top">
                {device.room}
              </TableCell>

              <TableCell isWithoutPadding>
                {device.type.map((type, i) => (
                  <div className="aliceRoom-skills" key={type + i}>{type}</div>
                ))}
              </TableCell>

              <TableCell isWithoutPadding>
                {device.mqtt.map((mqtt, i) => (
                  <div className="aliceRoom-skills" key={mqtt + i}>{mqtt}</div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </Table>

        {!deviceList.length && (
          <div className="aliceRoom-emptyList">{t('alice.labels.empty-list')}</div>
        )}
      </div>
      <Confirm
        isOpened={isDeleteRoom}
        heading={t('alice.prompt.delete-room-title')}
        variant="danger"
        closeCallback={() => setIsDeleteRoom(false)}
        confirmCallback={onConfirmDelete}
      >
        <Trans
          i18nKey="alice.prompt.delete-room"
          values={{
            name: rooms.get(id)?.name,
          }}
          components={[<b key="room-name" />]}
          shouldUnescape
        />
      </Confirm>
    </>
  );
});
