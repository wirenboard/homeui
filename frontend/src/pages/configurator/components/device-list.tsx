import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { Popup } from '@/components/popup';
import { Tag } from '@/components/tag';
import { configuratorStore, stable, type Device } from '@/stores/configurator';
import type { AddWay, DeviceListProps } from '../types';
import { hasLostBinding } from '../utils';

export const DeviceList = observer(({ onAdd, onAddEmpty, onClear, onSelect }: DeviceListProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isMenuOpened, setIsMenuOpened] = useState(false);
  const ways: AddWay[] = [
    { id: 'manual', onPick: onAddEmpty },
    { id: 'from-device', onPick: onAdd },
    { id: 'from-wb' },
  ];
  const { devices, selection, savedModel, isOverview } = configuratorStore;
  const saved = new Map(savedModel.devices.map((device) => [device.id, stable(device)]));
  const needle = query.trim().toLowerCase();

  const shown = devices.filter((device) => !needle || [
    device.name,
    device.group,
    ...device.rows.flatMap((row) => [row.name, ...Object.values(row.bind)]),
  ].join(' ').toLowerCase().includes(needle));

  const groups = Array.from(new Set(shown.map((device) => device.group.trim())))
    .sort((a, b) => Number(!a) - Number(!b) || a.localeCompare(b));

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
        <Popup
          isOpen={isMenuOpened}
          placement="bottom-end"
          className="configurator-addMenu"
          content={(
            <ul className="configurator-addMenuItems" role="menu">
              {ways.map(({ id, onPick }) => (
                <li key={id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="configurator-addMenuItem"
                    disabled={!onPick}
                    onClick={() => {
                      setIsMenuOpened(false);
                      onPick();
                    }}
                  >
                    <span className="configurator-listTitle">
                      {t(`configurator.labels.add-${id}`)}
                      {!onPick && <Tag variant="gray">{t('configurator.labels.soon')}</Tag>}
                    </span>
                    <span>{t(`configurator.labels.add-${id}-text`)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          onOpenChange={setIsMenuOpened}
        >
          <Button
            size="small"
            icon={<PlusIcon />}
            label={t('configurator.buttons.add')}
            aria-haspopup="menu"
            aria-expanded={isMenuOpened}
          />
        </Popup>
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

      {groups.map((group) => (
        <section key={group} className="configurator-listSection">
          {groups.some(Boolean) && (
            <h4 className="configurator-listGroup">{group || t('configurator.labels.no-group')}</h4>
          )}
          <ul className="configurator-listItems">
            {shown.filter((device) => device.group.trim() === group).map((device) => {
              const isSelected = !isOverview && selection?.id === device.id;
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
                      <span className="configurator-listTitle">
                        {device.name || t('configurator.labels.new-device')}
                      </span>
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
        </section>
      ))}

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
