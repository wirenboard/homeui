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
import { configuratorStore, type OwnDevice, type WbDevice } from '@/stores/configurator';
import { stable } from '@/stores/configurator';
import type { DeviceListProps } from '../types';
import { deviceLabel, isLiveDevice } from '../utils';

export const DeviceList = observer(({ onAdd, onClear }: DeviceListProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { wbs, own, selection, savedModel } = configuratorStore;
  const savedWb = new Map(savedModel.wbs.map((wb) => [wb.id, stable(wb)]));
  const savedOwn = new Map(savedModel.own.map((item) => [item.id, stable(item)]));
  const needle = query.trim().toLowerCase();
  const matches = (text: string) => !needle || text.toLowerCase().includes(needle);

  const shownWbs = wbs.filter((wb) => matches([
    deviceLabel(wb.id),
    ...Object.entries(wb.channels).flatMap(([controlId, channel]) => [controlId, channel.name, channel.group]),
  ].join(' ')));
  const shownOwn = own.filter((item) => matches([
    item.name,
    ...item.rows.flatMap((row) => [row.name, row.group, ...Object.values(row.bind)]),
  ].join(' ')));

  const mark = (saved: Map<string, string>, item: WbDevice | OwnDevice) => {
    if (!saved.has(item.id)) {
      return t('configurator.labels.new');
    }
    return saved.get(item.id) !== stable(item) ? t('configurator.labels.changed') : null;
  };

  const renderItem = (
    kind: 'wb' | 'own', item: WbDevice | OwnDevice, title: string, count: number, tag: string | null, isLost = false,
  ) => {
    const isSelected = selection?.kind === kind && selection.id === item.id;
    return (
      <li key={`${kind}:${item.id}`}>
        <button
          type="button"
          className={classNames('configurator-listItem', { 'configurator-listItemSelected': isSelected })}
          aria-current={isSelected || undefined}
          onClick={() => configuratorStore.select({ kind, id: item.id })}
        >
          <span className="configurator-listText">
            <span className="configurator-listTitle">{title}</span>
            <span>
              {count ? t('configurator.labels.channels-count', { count }) : t('configurator.labels.channels-none')}
            </span>
          </span>
          {isLost && <Tag variant="warn">{t('configurator.labels.not-found')}</Tag>}
          {!isLost && tag && <Tag variant="gray">{tag}</Tag>}
        </button>
      </li>
    );
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

      {!!shownWbs.length && (
        <>
          <h3 className="configurator-sectionTitle configurator-listSection">{t('configurator.labels.wb-devices')}</h3>
          <ul className="configurator-listItems">
            {shownWbs.map((wb) => renderItem(
              'wb', wb, deviceLabel(wb.id), Object.keys(wb.channels).length, mark(savedWb, wb), !isLiveDevice(wb.id),
            ))}
          </ul>
        </>
      )}

      {!!shownOwn.length && (
        <>
          <h3 className="configurator-sectionTitle configurator-listSection">{t('configurator.labels.created')}</h3>
          <ul className="configurator-listItems">
            {shownOwn.map((item) => renderItem(
              'own', item, item.name || t('configurator.labels.new-device'), item.rows.length, mark(savedOwn, item),
            ))}
          </ul>
        </>
      )}

      {!shownWbs.length && !shownOwn.length && (
        <p className="configurator-empty">
          {wbs.length + own.length ? t('configurator.labels.nothing-found') : t('configurator.labels.no-devices')}
        </p>
      )}

      {!!(wbs.length + own.length) && (
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
