import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { Popup } from '@/components/popup';
import { Tag } from '@/components/tag';
import { Tree, type TreeItem } from '@/components/tree';
import { configuratorStore, stable, type Device } from '@/stores/configurator';
import type { DeviceListProps } from '../types';
import { hasLostBinding } from '../utils';

export const DeviceList = observer(({
  onAdd, onAddEmpty, onClear, onSelect,
}: DeviceListProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isMenuOpen, setMenuOpen] = useState(false);
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

  const choose = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const mark = (device: Device) => {
    if (!saved.has(device.id)) {
      return t('configurator.labels.new');
    }
    return saved.get(device.id) !== stable(device) ? t('configurator.labels.changed') : null;
  };

  const item = (device: Device): TreeItem => {
    const tag = mark(device);
    return {
      id: device.id,
      label: (
        <span className="configurator-treeDevice">
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
        </span>
      ),
    };
  };

  // Группы — ветки дерева; пока ни у кого нет группы, список плоский.
  const tree: TreeItem[] = groups.some(Boolean)
    ? groups.map((group) => ({
      id: `group:${group}`,
      label: <span className="configurator-treeGroup">{group || t('configurator.labels.no-group')}</span>,
      children: shown.filter((device) => device.group.trim() === group).map(item),
    }))
    : shown.map(item);

  return (
    <Card
      className="configurator-list"
      heading={t('configurator.labels.devices')}
      variant="secondary"
      indicator={(
        <div className="configurator-splitButton">
          <Button
            size="small"
            icon={<PlusIcon />}
            label={t('configurator.buttons.add')}
            aria-haspopup="dialog"
            onClick={onAddEmpty}
          />
          <Popup
            isOpen={isMenuOpen}
            placement="bottom-end"
            content={(
              <div className="configurator-menu">
                <button type="button" className="configurator-menuItem" onClick={() => choose(onAdd)}>
                  {t('configurator.labels.devices-title')}
                </button>
                {!!devices.length && (
                  <button
                    type="button"
                    className="configurator-menuItem configurator-menuItemDanger"
                    onClick={() => choose(onClear)}
                  >
                    {t('configurator.buttons.clear-all')}
                  </button>
                )}
              </div>
            )}
            onOpenChange={setMenuOpen}
          >
            <Button
              size="small"
              variant="secondary"
              icon={<MoreIcon />}
              aria-label={t('configurator.buttons.more-actions')}
              title={t('configurator.buttons.more-actions')}
            />
          </Popup>
        </div>
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
        <div className="configurator-tree">
          <Tree
            data={tree}
            activeId={isOverview ? '' : selection?.id ?? ''}
            onItemClick={({ id }) => {
              if (devices.some((device) => device.id === id)) {
                configuratorStore.select({ id });
                onSelect();
              }
            }}
          />
        </div>
      )}

      {!shown.length && (
        <p className="configurator-empty">
          {devices.length ? t('configurator.labels.nothing-found') : t('configurator.labels.no-devices')}
        </p>
      )}
    </Card>
  );
});
