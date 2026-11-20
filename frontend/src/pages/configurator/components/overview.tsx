import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import { configuratorStore, type Adapter, type AdapterId, type Device } from '@/stores/configurator';
import type { OverviewProps } from '../types';
import { adapterLabel, hasLostBinding, isAdapterShown, sortByGroup, UNESCAPED } from '../utils';

export const Overview = observer(({ onSelect }: OverviewProps) => {
  const { t, i18n } = useTranslation();
  const adapters = configuratorStore.adapters.filter((adapter) => isAdapterShown(adapter, i18n.language));

  const state = (device: Device, adapter: Adapter) => {
    if (!device[adapter.id as AdapterId]) {
      return <Tag variant="gray">{t('configurator.labels.adapter-off')}</Tag>;
    }
    if (!adapter.installed) {
      return <Tag variant="warn">{t('configurator.labels.adapter-no-package')}</Tag>;
    }
    return adapter.active
      ? <Tag variant="success">{t('configurator.labels.adapter-on')}</Tag>
      : <Tag variant="warn">{t('configurator.labels.adapter-service-stopped')}</Tag>;
  };

  return (
    <Card heading={t('configurator.labels.overview')}>
      <Table isFullWidth>
        <TableRow isHeading>
          <TableCell>{t('configurator.labels.device')}</TableCell>
          <TableCell>{t('configurator.labels.group')}</TableCell>
          <TableCell>{t('configurator.labels.channels')}</TableCell>
          {adapters.map((adapter) => (
            <TableCell key={adapter.id}>{adapterLabel(adapter, i18n.language)}</TableCell>
          ))}
        </TableRow>

        {sortByGroup(configuratorStore.devices).map((device) => (
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
            {adapters.map((adapter) => <TableCell key={adapter.id}>{state(device, adapter)}</TableCell>)}
          </TableRow>
        ))}
      </Table>
    </Card>
  );
});
