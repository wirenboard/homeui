import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@/assets/icons/check.svg';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Tag } from '@/components/tag';
import {
  CHANNEL_CLASSES, configuratorStore, recipeModels, recipeModelTitle, recipeRows, recipeSkipped, type RecipeFit,
} from '@/stores/configurator';
import type { WbDialogProps } from '../types';
import {
  classifyCell, deviceControls, deviceTitle, isModbusDevice, listDevices, recipeRowName, TYPE_ICONS, typeName,
  UNESCAPED,
} from '../utils';

export const WbDialog = observer(({ isOpened, onClose, onAdded }: WbDialogProps) => {
  const { t } = useTranslation();
  const [skipped, setSkipped] = useState<string[]>([]);

  useEffect(() => {
    if (isOpened) {
      setSkipped([]);
    }
  }, [isOpened]);

  const devices = listDevices(false).map((id) => {
    const cells = deviceControls(id);
    const controlIds = cells.map((cell) => cell.controlId);
    const serial = configuratorStore.serialDevices[id];
    const isFit: RecipeFit = (controlId, role) => {
      const cell = cells.find((item) => item.controlId === controlId);
      return CHANNEL_CLASSES[classifyCell(cell).cls].fits.includes(role);
    };
    return {
      id,
      model: recipeModelTitle(id, serial),
      skipped: recipeSkipped(id, controlIds, serial),
      rows: (recipeRows(id, controlIds, configuratorStore.usedKeys, isFit, serial) ?? [])
        .map((item) => ({ ...item.row, name: recipeRowName(item) })),
    };
  });
  const found = devices.filter(({ rows }) => rows.length);
  const unsupported = devices.filter(({ id, model }) => !model && isModbusDevice(id));
  const absent = recipeModels().filter(({ title }) => !devices.some(({ model }) => model === title));
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
      <div className="configurator-addNew configurator-wbSections">
        <p>{t(found.length ? 'configurator.labels.wb-legend' : 'configurator.labels.wb-none')}</p>
        <ul className="configurator-wbModels">
          {found.map(({ id, rows, skipped: curtains }) => {
            const isChecked = !skipped.includes(id);
            const types = Array.from(new Set(rows.map((row) => row.type)));
            return (
              <li key={id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  aria-label={deviceTitle(id)}
                  title={rows.map((row) => row.name).join(', ')}
                  className="configurator-wbModel configurator-wbModelFound"
                  onClick={() => setSkipped(isChecked ? [...skipped, id] : skipped.filter((item) => item !== id))}
                >
                  <span className="configurator-wbModelIcons" aria-hidden="true">
                    {types.map((type) => {
                      const Icon = TYPE_ICONS[type];
                      return <Icon key={type} className="configurator-typeIcon" />;
                    })}
                    {types.length === 1 && rows.length > 1 && `× ${rows.length}`}
                    <span className={classNames('configurator-wbCheck', { 'configurator-wbCheckOn': isChecked })}>
                      {isChecked && <CheckIcon />}
                    </span>
                  </span>
                  <span className="configurator-listTitle">{deviceTitle(id)}</span>
                  {!!curtains && <span>{t('configurator.labels.wb-curtains', { count: curtains })}</span>}
                </button>
              </li>
            );
          })}
          {absent.map(({ title, types, count }) => (
            <li key={title} className="configurator-wbModel configurator-wbModelAbsent">
              <span className="configurator-wbModelIcons" aria-hidden="true">
                {types.map((type) => {
                  const Icon = TYPE_ICONS[type];
                  return <Icon key={type} className="configurator-typeIcon" />;
                })}
                {count > 1 && `× ${count}`}
              </span>
              <span className="configurator-listTitle">{title}</span>
              <span className="sr-only">
                {types.map(typeName).join(', ')}
                {count > 1 && ` × ${count}`}
              </span>
            </li>
          ))}
        </ul>

        {!!unsupported.length && (
          <section>
            <h3 className="configurator-sectionTitle">{t('configurator.labels.wb-unsupported')}</h3>
            <div className="configurator-wbTags">
              {unsupported.map(({ id }) => <Tag key={id} variant="gray">{deviceTitle(id)}</Tag>)}
            </div>
          </section>
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
