import { observer } from 'mobx-react-lite';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import EditSquareIcon from '@/assets/icons/edit-square.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  aliceStore,
  DefaultRoom,
  deviceTypes,
  floatUnitsByInstance,
  type AddDeviceParams,
  type SmartDevice as SmartDeviceData
} from '@/stores/alice';
import { notificationsStore } from '@/stores/notifications';
import { DeviceSkills } from './components/device-skills';
import type { SmartDeviceParams } from './types';
import './styles.css';

export const SmartDevice = observer(({ id, deviceStore, onSave, onDelete, onOpenDevice }: SmartDeviceParams) => {
  const { t } = useTranslation();
  const { addDevice, devices, rooms, fetchData, deleteDevice, updateDevice, copyDevice } = aliceStore;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [category, setCategory] = useState<string>();
  const [isDeleteDevice, setIsDeleteDevice] = useState(false);
  const [data, setData] = useState<Partial<SmartDeviceData>>({ capabilities: [], properties: [] });

  useEffect(() => {
    setIsEditingTitle(!id);
    const cat = id
      ? Object.keys(deviceTypes).find((key) => deviceTypes[key].includes(devices.get(id).type))
      : Object.keys(deviceTypes).at(0);
    setCategory(cat);
    setData({
      name: id ? devices.get(id).name : '',
      room_id: id ? devices.get(id).room_id : DefaultRoom,
      type: id ? devices.get(id).type : deviceTypes[cat].at(0),
      capabilities: id ? devices.get(id).capabilities : [],
      properties: id ? devices.get(id).properties : [],
    });
  }, [id]);

  const save = useCallback(async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      // Normalize properties: map "<name>_event" instances to "<name>" when base instance exists
      const normalizedProperties = (data?.properties || []).map((p: any) => {
        const params = { ...(p.parameters || {}) };
        if (typeof params.instance === 'string' && params.instance.endsWith('_event')) {
          const base = params.instance.replace(/_event$/, '');
          if (base && Object.prototype.hasOwnProperty.call(floatUnitsByInstance, base)) {
            params.instance = base;
          }
        }
        return { ...p, parameters: params };
      });

      const payload = { ...data, properties: normalizedProperties } as AddDeviceParams;

      if (!id) {
        const device = await addDevice(payload);
        notificationsStore.showNotification({
          variant: 'success',
          text: t('alice.notifications.device-added', { name: data.name }),
        });
        await fetchData();
        onSave(device);
      } else {
        await updateDevice(id, payload);
        notificationsStore.showNotification({
          variant: 'success',
          text: t('alice.notifications.device-updated', { name: data.name }),
        });
        await fetchData();
      }
      setIsEditingTitle(false);
    } catch (err) {
      notificationsStore.showNotification({ variant: 'danger', text: err.response.data.detail });
    }
  }, [id, data]);

  const onConfirmDelete = async () => {
    try {
      await deleteDevice(id);
      await fetchData();
      notificationsStore.showNotification({
        variant: 'success',
        text: t('alice.notifications.device-deleted', { name: data.name }),
      });
      onDelete();
    } catch (err) {
      notificationsStore.showNotification({ variant: 'danger', text: err.response.data.detail });
    }
  };

  return (
    <>
      <div>
        <form className="alice-headerContainer" onSubmit={save}>
          <div className="alice-headerTitleWrapper">
            {isEditingTitle ? (
              <Input
                value={data.name}
                placeholder={t('alice.labels.device-name')}
                autoFocus
                isFullWidth
                onChange={(name: string) => setData({ ...data, name })}
              />
            ) : (<h4 className="alice-title">{devices.get(id)?.name}</h4>)}

            {(!isEditingTitle && id) && (
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

          {!!id && (
            <Button
              size="small"
              type="button"
              icon={<CopyIcon />}
              variant="secondary"
              isOutlined
              onClick={async () => {
                const deviceId = await copyDevice(data as SmartDeviceData);
                notificationsStore.showNotification({
                  variant: 'success',
                  text: t('alice.notifications.device-copied'),
                });
                onOpenDevice(deviceId);
              }}
            />
          )}
          <Button
            size="small"
            type="button"
            icon={<TrashIcon />}
            variant="secondary"
            isOutlined
            onClick={() => {
              if (id) {
                setIsDeleteDevice(true);
              } else {
                onDelete();
              }
            }}
          />
          <Button
            type="submit"
            disabled={!data.name}
            label={t('alice.buttons.save')}
            variant="secondary"
          />
        </form>
        <div>
          <label className="aliceSmartDevice-label">
            <div>{t('alice.labels.room')}</div>
            <Dropdown
              value={data.room_id}
              options={Array.from(rooms.keys()).map((room) => ({ label: rooms.get(room).name, value: room }))}
              onChange={({ value: roomId }: any) => setData({ ...data, room_id: roomId })}
            />
          </label>

          <div className="aliceSmartDevice-inlineLabel">
            <label className="aliceSmartDevice-label">
              <div>{t('alice.labels.device-category')}</div>
              <Dropdown
                value={category}
                options={Object.keys(deviceTypes).map((val) => ({ label: t(`alice.device-types.${val}`), value: val }))}
                onChange={({ value }) => {
                  setCategory(value as string);
                  setData({ ...data, type: deviceTypes[value as string].at(0) });
                }}
              />
            </label>
            <label className="aliceSmartDevice-label">
              <div>{t('alice.labels.device-type')}</div>
              <Dropdown
                value={data.type}
                isDisabled={!category}
                options={!category ? [] : deviceTypes[category].map((value) => ({ label: value, value }))}
                onChange={(option) => setData({ ...data, type: option.value as string })}
              />
            </label>
          </div>

          <DeviceSkills
            capabilities={data.capabilities}
            properties={data.properties}
            deviceStore={deviceStore}
            onCapabilityChange={(capabilities) => {
              setData((prev: SmartDeviceData) => ({
                ...prev,
                capabilities,
              }));
            }}
            onPropertyChange={(properties) => {
              setData((prev: SmartDeviceData) => ({
                ...prev,
                properties,
              }));
            }}
          />
        </div>
      </div>

      <Confirm
        isOpened={isDeleteDevice}
        heading={t('alice.prompt.delete-device-title')}
        variant="danger"
        closeCallback={() => setIsDeleteDevice(false)}
        confirmCallback={onConfirmDelete}
      >
        <Trans
          i18nKey="alice.prompt.delete-device"
          values={{
            name: devices.get(id)?.name,
          }}
          components={[<b key="device-name" />]}
          shouldUnescape
        />
      </Confirm>
    </>
  );
});
