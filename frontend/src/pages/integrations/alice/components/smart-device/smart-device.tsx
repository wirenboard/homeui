import { observer } from 'mobx-react-lite';
import { type FormEvent, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import EditSquareIcon from '@/assets/icons/edit-square.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  aliceStore,
  DefaultRoom,
  deviceTypes,
  type AddDeviceParams,
  type SmartDevice as SmartDeviceData,
} from '@/stores/alice';
import { useAsyncAction } from '@/utils/async-action';
import { DeviceSkills } from './components/device-skills';
import { type SmartDeviceProps } from './types';
import './styles.css';

export const SmartDevice = observer(({ id, devicesStore, onSave, onDelete, onOpenDevice }: SmartDeviceProps) => {
  const { t } = useTranslation();
  const { addDevice, devices, rooms, fetchData, deleteDevice, updateDevice, copyDevice } = aliceStore;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [category, setCategory] = useState<string>();
  const [isDeleteDevice, setIsDeleteDevice] = useState(false);
  const [data, setData] = useState<Partial<SmartDeviceData>>({ capabilities: [], properties: [] });
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setIsEditingTitle(!id);
    setSaveError(null);
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

  const [save, isSaving] = useAsyncAction(async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      const payload = { ...data } as AddDeviceParams;

      if (!id) {
        const device = await addDevice(payload);
        await fetchData();
        onSave(device);
      } else {
        await updateDevice(id, payload);
        await fetchData();
      }
      setIsEditingTitle(false);
    } catch (err) {
      setSaveError(err.response.data.detail);
    }
  });

  const [onConfirmDelete, isDeleting] = useAsyncAction(async () => {
    try {
      await deleteDevice(id);
      setIsDeleteDevice(false);
      fetchData();
      onDelete();
    } catch (err) {
      await fetchData();
      if (err.status === 404) {
        return onDelete();
      }
      setSaveError(err.response.data.detail);
      setIsDeleteDevice(false);
    }
  });

  const [onCopy, isCopied] = useAsyncAction(async () => {
    const deviceId = await copyDevice(data as SmartDeviceData);
    onOpenDevice(deviceId);
  });

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
              type="button"
              icon={<CopyIcon />}
              variant="secondary"
              isLoading={isCopied}
              isOutlined
              onClick={onCopy}
            />
          )}
          <Button
            type="button"
            icon={<TrashIcon />}
            variant="danger"
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
            isLoading={isSaving}
            disabled={!data.name}
            label={t('alice.buttons.save')}
            variant="primary"
          />
        </form>

        {!!saveError && <Alert className="alice-saveAlert" variant="danger" size="small">{saveError}</Alert>}

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
            devicesStore={devicesStore}
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
        isLoading={isDeleting}
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
