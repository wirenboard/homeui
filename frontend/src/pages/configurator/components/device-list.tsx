import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { Tag } from '@/components/tag';
import { configuratorStore, stable, type Device } from '@/stores/configurator';
import type { DeviceListProps } from '../types';
import { hasLostBinding } from '../utils';

export const DeviceList = observer(({ onAdd, onClear, onSelect }: DeviceListProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { devices, selection, savedModel } = configuratorStore;
  const saved = new Map(savedModel.devices.map((device) => [device.id, stable(device)]));
  const needle = query.trim().toLowerCase();

  const shown = devices.filter((device) => !needle || [
    device.name,
    ...device.rows.flatMap((row) => [row.name, row.group, ...Object.values(row.bind)]),
  ].join(' ').toLowerCase().includes(needle));

  const mark = (device: Device) => {
    if (!saved.has(device.id)) {
      return t('configurator.labels.new');
    }
    return saved.get(device.id) !== stable(device) ? t('configurator.labels.changed') : null;
  };

  return (
    <Card
      className="configurator-list"
      heading={t('configurator.labels.devices')}
      variant="secondary"
      indicator={(
        <Button
          size="small"
          icon={<PlusIcon />}
          label={t('configurator.buttons.add')}
          aria-haspopup="dialog"
          onClick={onAdd}
        />
      )}
    >
      <Input
        type="text"
        value={query}
        placeholder={t('configurator.labels.search')}
        ariaLabel={t('configurator.labels.search')}
        isFullWidth
        onChange={(value) => setQuery(String(value))}
      />

      {!!shown.length && (
        <ul className="configurator-listItems configurator-listSection">
          {shown.map((device) => {
            const isSelected = selection?.id === device.id;
            const tag = mark(device);
            return (
              <li key={device.id}>
                <button
                  type="button"
                  className={classNames('configurator-listItem', { 'configurator-listItemSelected': isSelected })}
                  aria-current={isSelected || undefined}
                  onClick={() => {
                    configuratorStore.select({ id: device.id });
                    onSelect();
                  }}
                >
                  <span className="configurator-listText">
                    <span className="configurator-listTitle">{device.name || t('configurator.labels.new-device')}</span>
                    <span>
                      {device.rows.length
                        ? t('configurator.labels.channels-count', { count: device.rows.length })
                        : t('configurator.labels.channels-none')}
                    </span>
                  </span>
                  {hasLostBinding(device) && <Tag variant="warn">{t('configurator.labels.not-found')}</Tag>}
                  {configuratorStore.nameConflicts.has(device.id) && (
                    <Tag variant="warn">{t('configurator.labels.name-duplicate')}</Tag>
                  )}
                  {tag && <Tag variant="gray">{tag}</Tag>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!shown.length && (
        <p className="configurator-empty">
          {devices.length ? t('configurator.labels.nothing-found') : t('configurator.labels.no-devices')}
        </p>
      )}

      {!!devices.length && (
        <div className="configurator-actions">
          <Button
            size="small"
            variant="danger"
            icon={<TrashIcon />}
            label={t('configurator.buttons.clear-all')}
            aria-haspopup="dialog"
            onClick={onClear}
          />
        </div>
      )}
    </Card>
  );
});
