import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@/assets/icons/check.svg';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow, type TableCellSortDirection } from '@/components/table';
import { Tag } from '@/components/tag';
import { configuratorStore, type Adapter, type Device } from '@/stores/configurator';
import type { OverviewColumn, OverviewProps } from '../types';
import { adapterLabel, hasLostBinding, isAdapterOn, UNESCAPED } from '../utils';

export const Overview = observer(({ onSelect }: OverviewProps) => {
  const { t, i18n } = useTranslation();
  const { adapters } = configuratorStore;

  const [column, setColumn] = useState<OverviewColumn>('group');
  const [direction, setDirection] = useState<TableCellSortDirection>('asc');

  // Состояние адаптера у устройства: 0 — передаётся, 1 — служба остановлена, 2 — выключено.
  const rank = (device: Device, adapter: Adapter) => {
    if (!isAdapterOn(device, adapter)) {
      return 2;
    }
    return adapter.active === false ? 1 : 0;
  };

  // Зелёная галочка — передаётся; серая — включено, но не передаётся; пусто — выключено.
  const STATE_KEYS = ['adapter-on', 'adapter-service-stopped', 'adapter-off'];
  const stateOf = (device: Device, adapter: Adapter): ReactNode => {
    const value = rank(device, adapter);
    const text = t(`configurator.labels.${STATE_KEYS[value]}`);
    return (
      <span className="configurator-adapterState" title={text}>
        {value < 2 && (
          <CheckIcon
            className={classNames('configurator-adapterCheck', { 'configurator-adapterCheckOn': !value })}
            aria-hidden="true"
          />
        )}
        <span className="sr-only">{text}</span>
      </span>
    );
  };

  // Пустые имена и группы остаются внизу в любом направлении; при равенстве порядок по имени.
  const byText = (a: string, b: string) => Number(!a) - Number(!b)
    || (direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
  const compare = (a: Device, b: Device) => {
    const sign = direction === 'asc' ? 1 : -1;
    if (column === 'name') {
      return byText(a.name.trim(), b.name.trim());
    }
    if (column === 'group') {
      return byText(a.group.trim(), b.group.trim()) || a.name.localeCompare(b.name);
    }
    if (column === 'channels') {
      return sign * (a.rows.length - b.rows.length) || a.name.localeCompare(b.name);
    }
    const adapter = adapters.find(({ id }) => `adapter:${id}` === column);
    return adapter ? sign * (rank(a, adapter) - rank(b, adapter)) || a.name.localeCompare(b.name) : 0;
  };
  const sorted = [...configuratorStore.devices].sort(compare);

  const toggle = (next: OverviewColumn) => {
    setDirection(next === column && direction === 'asc' ? 'desc' : 'asc');
    setColumn(next);
  };

  // Заголовок, сортирующий по нажатию и на название, и на значок рядом.
  const heading = (key: OverviewColumn, label: string) => (
    <TableCell
      key={key}
      sort={{
        onSort: () => toggle(key), isActive: column === key, direction: column === key ? direction : undefined, label,
      }}
    >
      <button type="button" className="configurator-sortLabel" onClick={() => toggle(key)}>{label}</button>
    </TableCell>
  );

  return (
    <Card heading={t('configurator.labels.overview')}>
      <Table isFullWidth>
        <TableRow isHeading>
          {heading('name', t('configurator.labels.device'))}
          {heading('group', t('configurator.labels.group'))}
          {heading('channels', t('configurator.labels.channels'))}
          {adapters.map((adapter) => heading(`adapter:${adapter.id}`, adapterLabel(adapter, i18n.language)))}
        </TableRow>

        {sorted.map((device) => (
          <TableRow
            key={device.id}
            className="configurator-overviewRow"
            aria-label={t('configurator.labels.open-device', { ...UNESCAPED, name: device.name })}
            onClick={() => onSelect(device.id)}
          >
            <TableCell>
              <span className="configurator-overviewName">
                {device.name || t('configurator.labels.new-device')}
                {hasLostBinding(device) && <Tag variant="warn">{t('configurator.labels.not-found')}</Tag>}
                {configuratorStore.nameConflicts.has(device.id) && (
                  <Tag variant="warn">{t('configurator.labels.name-duplicate')}</Tag>
                )}
              </span>
            </TableCell>
            <TableCell>{device.group.trim()}</TableCell>
            <TableCell>{device.rows.length}</TableCell>
            {adapters.map((adapter) => <TableCell key={adapter.id}>{stateOf(device, adapter)}</TableCell>)}
          </TableRow>
        ))}
      </Table>
    </Card>
  );
});
