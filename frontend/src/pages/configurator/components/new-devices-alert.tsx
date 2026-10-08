import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { CHANNEL_CLASSES, configuratorStore } from '@/stores/configurator';
import type { NewDevicesAlertProps } from '../types';
import { classifyCell, deviceControls, deviceTitle, isVirtualDevice, listDevices, UNESCAPED } from '../utils';

const DISMISSED_KEY = 'configurator-dismissed-devices';
const SHOWN_LIMIT = 5;

const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
  } catch {
    return [];
  }
};

export const NewDevicesAlert = observer(({ onConfigure }: NewDevicesAlertProps) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);

  const configured = new Set([
    ...configuratorStore.wbs.map((wb) => wb.id),
    ...Array.from(configuratorStore.usedKeys).map((key) => key.split('/')[0]),
  ]);
  const devices = listDevices(false).filter((id) => !isVirtualDevice(id)
    && !configured.has(id)
    && !dismissed.includes(id)
    && deviceControls(id).some((cell) => CHANNEL_CLASSES[classifyCell(cell).cls].types.length));

  if (configuratorStore.isLoading || !devices.length) {
    return null;
  }

  const dismiss = () => {
    const next = [...dismissed, ...devices];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Без хранилища блок просто скроется до перезагрузки страницы.
    }
  };

  return (
    <Alert variant="info" size="small" className="configurator-alert" onClose={dismiss}>
      <p className="configurator-newDevicesText">{t('configurator.labels.new-devices')}</p>
      <div className="configurator-newDevices">
        {devices.slice(0, SHOWN_LIMIT).map((id) => (
          <Button
            key={id}
            size="small"
            variant="secondary"
            label={t('configurator.buttons.configure', { ...UNESCAPED, name: deviceTitle(id) })}
            aria-haspopup="dialog"
            onClick={() => onConfigure(id)}
          />
        ))}
        {devices.length > SHOWN_LIMIT && (
          <span>{t('configurator.labels.more-devices', { count: devices.length - SHOWN_LIMIT })}</span>
        )}
      </div>
    </Alert>
  );
});
