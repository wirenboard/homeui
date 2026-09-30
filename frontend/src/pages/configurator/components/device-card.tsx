import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { Dropdown, type Option } from '@/components/dropdown';
import { StringField } from '@/components/form';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import { configuratorStore } from '@/stores/configurator';
import { type Cell } from '@/stores/devices';
import { isReady, requiredRoles, resolveRange } from '../build-config';
import { roleDef } from '../roles';
import type { DeviceCardProps } from '../types';
import { cellLabel, matchesRole } from '../utils';

// Цели, которые устройство может отдавать (adapter_settings).
const ADAPTERS = [
  { key: 'matter', label: 'Matter' },
  { key: 'alice', label: 'navigation.labels.alice' },
];

export const DeviceCard = observer(({
  device, type, typeName, roleLabel, allCells, cellById, onDelete,
}: DeviceCardProps) => {
  const { t } = useTranslation();
  const required = requiredRoles(device, type);
  const moduleMissing = !device.module.trim();

  const toOption = (cell: Cell): Option<string> => ({ label: cellLabel(cell), value: cell.id });

  const handleBind = (role: string, cellId: string) => {
    configuratorStore.bindSlot(device.did, role, cellId);
    const cell = cellId ? cellById.get(cellId) : undefined;
    if (cell) {
      configuratorStore.setModuleIfEmpty(device.did, cell.deviceId);
    }
  };

  return (
    <Card
      heading={device.name || typeName}
      indicator={(
        <span className="configurator-cardIndicator">
          <Tag variant="gray">{typeName}</Tag>
          <Button
            size="small"
            variant="danger"
            icon={<TrashIcon />}
            label={t('common.buttons.remove')}
            aria-label={`${t('configurator.buttons.delete')} ${device.name || typeName}`}
            aria-haspopup="dialog"
            onClick={() => onDelete(device)}
          />
        </span>
      )}
    >
      <div className="configurator-fields">
        <StringField
          title={t('configurator.labels.name')}
          placeholder={t('configurator.labels.name-placeholder')}
          value={device.name}
          onChange={(value) => configuratorStore.setName(device.did, String(value))}
        />
        <StringField
          title={t('configurator.labels.module')}
          placeholder={t('configurator.labels.module-placeholder')}
          value={device.module}
          error={moduleMissing ? t('configurator.labels.module-required') : undefined}
          required
          onChange={(value) => configuratorStore.setModule(device.did, String(value))}
        />
        <StringField
          title={t('configurator.labels.area')}
          placeholder={t('configurator.labels.area-placeholder')}
          value={device.area ?? ''}
          onChange={(value) => configuratorStore.setArea(device.did, String(value))}
        />
      </div>

      <div className="configurator-filters">
        {ADAPTERS.map((adapter) => (
          <Checkbox
            key={adapter.key}
            checked={Boolean(device.adapters[adapter.key])}
            title={t(adapter.label)}
            onChange={(checked) => configuratorStore.setAdapter(device.did, adapter.key, checked)}
          />
        ))}
      </div>

      <Table isFullWidth>
        <TableRow isHeading>
          <TableCell width={200}>{t('configurator.labels.role')}</TableCell>
          <TableCell width={150}>{t('configurator.labels.access')}</TableCell>
          <TableCell>{t('configurator.labels.control')}</TableCell>
        </TableRow>
        {type.slots.map((slot) => {
          const def = roleDef(slot.role);
          const value = device.bindings[slot.role] || '';
          const isRequired = required.has(slot.role);
          const boundCell = value ? cellById.get(value) : undefined;
          const effRange = boundCell && def.kind === 'level'
            ? resolveRange(slot.role, boundCell, device.ranges[slot.role])
            : undefined;
          const applyRange = (field: 'min' | 'max' | 'step', raw: string | number) => {
            const parsed = Number(raw);
            if (!effRange || raw === '' || Number.isNaN(parsed)) {
              return;
            }
            configuratorStore.setRange(device.did, slot.role, { ...effRange, [field]: parsed });
          };
          const matching = allCells.filter((cell) => matchesRole(cell, slot.role));
          const others = allCells.filter((cell) => !matchesRole(cell, slot.role));
          const options: Option<string>[] = [
            { label: t('configurator.labels.matching'), options: matching.map(toOption) },
            { label: t('configurator.labels.others'), options: others.map(toOption) },
          ].filter((group) => group.options.length);

          return (
            <TableRow key={slot.role}>
              <TableCell verticalAlign="top">
                {roleLabel(slot.role)}
                {isRequired && (
                  <span title={t('configurator.labels.required')}>
                    <span aria-hidden="true">{' *'}</span>
                    <span className="sr-only">{t('configurator.labels.required')}</span>
                  </span>
                )}
              </TableCell>
              <TableCell verticalAlign="top">
                {def.access === 'read' ? t('configurator.labels.access-read') : t('configurator.labels.access-write')}
              </TableCell>
              <TableCell verticalAlign="top">
                <Dropdown
                  options={options}
                  value={value || null}
                  placeholder={t('configurator.labels.control-placeholder')}
                  ariaLabel={`${t('configurator.labels.control')}: ${roleLabel(slot.role)}`}
                  isInvalid={isRequired && !value}
                  isSearchable
                  isClearable
                  menuPortal
                  onChange={(option: Option<string>) => handleBind(slot.role, option?.value ?? '')}
                />
                {effRange && (
                  <div className="configurator-range">
                    {(['min', 'max', 'step'] as const).map((field) => (
                      <StringField
                        key={field}
                        type="number"
                        title={t(`configurator.labels.${field}`)}
                        value={effRange[field]}
                        onChange={(val) => applyRange(field, val)}
                      />
                    ))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </Table>

      {!isReady(device, type) && (
        <Alert variant="warn" size="small" className="configurator-alert">
          {t('configurator.labels.slots-required')}
        </Alert>
      )}
    </Card>
  );
});
