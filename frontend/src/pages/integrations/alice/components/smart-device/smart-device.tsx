import { observer } from 'mobx-react-lite';
import React, { FormEvent, useCallback, useEffect, useState } from 'react';
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

  const renderDropdownOptionWithIcon = (icon: React.ReactNode, text: string) => (
    <div className="aliceOptionWithIcon">
      <span className="aliceOptionWithIcon-icon" aria-hidden>{icon ?? '📦'}</span>
      <span className="aliceOptionWithIcon-label">{text}</span>
    </div>
  );

  // --- Icon maps (emoji now; later can be replaced with SVG components)
  // Category keys = deviceTypes keys
  const CategoryIcon: Record<string, React.ReactNode> = {
    sensor: '📟',
    smart_meter: '⏲',
    media: '📺',
    cooking: '🍳',
    appliances: '🏠',
    pet: '🐾',
    climate: '🌡️',
    electrics: '🔌',
    openable: '🚪',
    other: '⚙️',
    default: '📦',
  };

  // Type keys = strings from deviceTypes[category]
  const TypeIcon: Record<string, React.ReactNode> = {
    // --- sensor ---
    'devices.types.sensor': '👀',
    'devices.types.sensor.button': '🔘',
    'devices.types.sensor.climate': '🌡️',
    'devices.types.sensor.gas': '💨',
    'devices.types.sensor.illumination': '☀️',
    'devices.types.sensor.motion': '🏃‍♂️',
    'devices.types.sensor.open': '🚪',
    'devices.types.sensor.smoke': '🚭',
    'devices.types.sensor.vibration': '〰️',
    'devices.types.sensor.water_leak': '💧',

    // --- smart_meter ---
    'devices.types.smart_meter': '⏲',
    'devices.types.smart_meter.cold_water': '💧',
    'devices.types.smart_meter.electricity': '⚡',
    'devices.types.smart_meter.gas': '🔥',
    'devices.types.smart_meter.heat': '🌡️',
    'devices.types.smart_meter.hot_water': '🚿',

    // --- media ---
    'devices.types.camera': '📷',
    'devices.types.media_device': '🎬',
    'devices.types.media_device.receiver': '📡',
    'devices.types.media_device.tv': '📺',
    'devices.types.media_device.tv_box': '📦',

    // --- cooking ---
    'devices.types.cooking': '👨‍🍳',
    'devices.types.cooking.coffee_maker': '☕',
    'devices.types.cooking.kettle': '🫖',
    'devices.types.cooking.multicooker': '🍲',
    'devices.types.dishwasher': '🍽️',

    // --- appliances ---
    'devices.types.iron': '🧼',
    'devices.types.vacuum_cleaner': '🧹',
    'devices.types.washing_machine': '👕',

    // --- pet ---
    'devices.types.pet_drinking_fountain': '⛲',
    'devices.types.pet_feeder': '🍖',

    // --- climate ---
    'devices.types.humidifier': '💦',
    'devices.types.purifier': '🫧',
    'devices.types.thermostat': '🌡️',
    'devices.types.thermostat.ac': '❄️',
    'devices.types.ventilation': '🌬️',
    'devices.types.ventilation.fan': '🪭',

    // --- electrics ---
    'devices.types.light': '💡',
    'devices.types.light.lamp': '🛋️',
    'devices.types.light.ceiling': '🪩',
    'devices.types.light.strip': '🌈',
    'devices.types.socket': '🔌',
    'devices.types.switch': '⏻',
    'devices.types.switch.relay': '🔀',

    // --- openable ---
    'devices.types.openable': '🚪',
    'devices.types.openable.curtain': '🪟',
    'devices.types.openable.valve': '🚰',

    // --- other ---
    'devices.types.other': '⚙️',

    // fallback
    default: '📟',
  };


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
      if (!id) {
        const device = await addDevice(data as AddDeviceParams);
        notificationsStore.showNotification({
          variant: 'success',
          text: t('alice.notifications.device-added', { name: data.name }),
        });
        await fetchData();
        onSave(device);
      } else {
        await updateDevice(id, data);
        notificationsStore.showNotification({
          variant: 'success',
          text: t('alice.notifications.device-updated', { name: data.name }),
        });
        await fetchData();
      }
      setIsEditingTitle(false);
    } catch (err) {
      notificationsStore.showNotification({ variant: 'danger', text: err.message });
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
      notificationsStore.showNotification({ variant: 'danger', text: err.message });
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
                size="large"
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
            size="large"
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
                options={Object.keys(deviceTypes).map((val) => ({
                  label: renderDropdownOptionWithIcon(
                    CategoryIcon[val] ?? CategoryIcon.default,
                    t(`alice.device-types.${val}`)
                  ),
                  value: val
                }))}
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
                options={
                  !category
                    ? []
                    : deviceTypes[category].map((value) => ({
                        label: renderDropdownOptionWithIcon(TypeIcon[value] ?? TypeIcon.default, value),
                        value
                      }))
                }
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
