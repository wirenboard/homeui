import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Dialog } from '@/components/dialog';
import { configuratorStore, recipeRows } from '@/stores/configurator';
import type { WbDialogProps } from '../types';
import { deviceControls, deviceTitle, listDevices, recipeRowName, UNESCAPED } from '../utils';

export const WbDialog = observer(({ isOpened, onClose, onAdded }: WbDialogProps) => {
  const { t } = useTranslation();
  const [skipped, setSkipped] = useState<string[]>([]);

  useEffect(() => {
    if (isOpened) {
      setSkipped([]);
    }
  }, [isOpened]);

  const found = listDevices(false)
    .map((id) => ({
      id,
      rows: (recipeRows(id, deviceControls(id).map((cell) => cell.controlId), configuratorStore.usedKeys) ?? [])
        .map((item) => ({ ...item.row, name: recipeRowName(item) })),
    }))
    .filter(({ rows }) => rows.length);
  const chosen = found.filter(({ id }) => !skipped.includes(id));

  const create = () => {
    const [first] = chosen.map(({ id, rows }) => configuratorStore.addDevice(deviceTitle(id), rows));
    configuratorStore.select({ id: first.id });
    onAdded();
    onClose();
  };

  return (
    <Dialog
      className="configurator-addDialog"
      isOpened={isOpened}
      heading={t('configurator.labels.wb-title')}
      width={640}
      onClose={onClose}
    >
      <div className="configurator-addNew">
        {found.length ? (
          <>
            <p>{t('configurator.labels.wb-hint')}</p>
            <ul className="configurator-channels">
              {found.map(({ id, rows }) => (
                <li key={id} className="configurator-channel configurator-wbDevice">
                  <Checkbox
                    checked={!skipped.includes(id)}
                    ariaLabel={deviceTitle(id)}
                    onChange={(checked) => {
                      setSkipped(checked ? skipped.filter((item) => item !== id) : [...skipped, id]);
                    }}
                  />
                  <span className="configurator-listText">
                    <span className="configurator-listTitle">{deviceTitle(id)}</span>
                    <span>{rows.map((row) => row.name).join(', ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>{t('configurator.labels.wb-none')}</p>
        )}
      </div>
      <footer className="configurator-dialogFooter">
        <span>
          {!!found.length && t('configurator.labels.wb-selected-count', { ...UNESCAPED, count: chosen.length })}
        </span>
        <Button variant="secondary" label={t('modal.labels.cancel')} onClick={onClose} />
        {!!found.length && (
          <Button label={t('configurator.buttons.create-devices')} disabled={!chosen.length} onClick={create} />
        )}
      </footer>
    </Dialog>
  );
});
