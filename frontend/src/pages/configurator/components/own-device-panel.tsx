import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Dropdown, type Option } from '@/components/dropdown';
import { StringField } from '@/components/form';
import {
  CHANNEL_CLASSES, configuratorStore, findType, hasUnit, primaryRole, rowServices, splitKey, topicOf,
  type DeviceRow,
  type RoleId,
} from '@/stores/configurator';
import { devicesStore } from '@/stores/devices';
import type { OwnDevicePanelProps } from '../types';
import {
  classifyCell, defaultName, deviceControls, deviceTitle, formatValue, listDevices, roleLabel, TYPE_ICONS,
  typeName,
  UNESCAPED,
} from '../utils';
import { AdapterSwitches } from './adapter-switches';
import { TypeTiles } from './type-tiles';
import { UnitField } from './unit-field';

export const OwnDevicePanel = observer(({ item, onRemove }: OwnDevicePanelProps) => {
  const { t } = useTranslation();
  const [isTilesOpened, setIsTilesOpened] = useState(false);
  const devices = listDevices(false);

  const lowerName = item.name.trim().toLowerCase();
  const isNameTaken = !!lowerName && (
    Array.from(devicesStore.devices.keys()).some((id) => id.toLowerCase() === lowerName)
    || configuratorStore.own.some((other) => other.id !== item.id && other.name.trim().toLowerCase() === lowerName)
  );

  const roleOptions = (role: RoleId, current: string): Option<string>[] => {
    const groups: Option<string>[] = devices
      .map((deviceId) => ({
        label: `${deviceTitle(deviceId)} (${deviceId})`,
        options: deviceControls(deviceId)
          .filter((cell) => CHANNEL_CLASSES[classifyCell(cell).cls].fits.includes(role))
          .map((cell) => ({ label: `${cell.name} · ${formatValue(cell)}`, value: cell.id })),
      }))
      .filter((group) => group.options.length);
    const isListed = groups.some((group) => group.options.some((option) => option.value === current));
    if (current && !isListed) {
      const cell = devicesStore.cells.get(current);
      const label = cell
        ? `${deviceTitle(cell.deviceId)}: ${cell.name} · ${formatValue(cell)}`
        : t('configurator.labels.channel-lost', { ...UNESCAPED, topic: topicOf(...splitKey(current)) });
      groups.unshift({ label, value: current });
    }
    return groups;
  };

  const bindRole = (row: DeviceRow, role: RoleId, key: string | null) => {
    const primary = primaryRole(row.type);
    const cell = key ? devicesStore.cells.get(key) : undefined;
    if (cell && role === primary) {
      const { cls, units } = classifyCell(cell);
      configuratorStore.updateRow(row, {
        ...(row.name === typeName(row.type) ? { name: defaultName(row.type, cell, cls) } : {}),
        ...(hasUnit(row.type) && !row.unit ? { unit: units } : {}),
      });
    }
    configuratorStore.bindRole(row, role, key);
  };

  const addRow = (typeId: string) => {
    if (!item.name.trim()) {
      configuratorStore.setOwnName(item, typeName(typeId));
    }
    configuratorStore.addOwnRow(item, { type: typeId, name: typeName(typeId), bind: {} });
    setIsTilesOpened(false);
  };

  return (
    <Card
      heading={item.name || t('configurator.labels.new-device')}
      indicator={(
        <Button
          size="small"
          variant="danger"
          icon={<TrashIcon />}
          label={t('configurator.buttons.remove')}
          aria-label={t('configurator.buttons.remove-device')}
          aria-haspopup="dialog"
          onClick={() => onRemove(item.name || t('configurator.labels.new-device'))}
        />
      )}
    >
      <div className="configurator-fields">
        <StringField
          title={t('configurator.labels.device-name')}
          value={item.name}
          placeholder={t('configurator.labels.new-device')}
          error={isNameTaken ? t('configurator.labels.name-taken') : undefined}
          onChange={(name) => configuratorStore.setOwnName(item, String(name))}
        />
      </div>
      {configuratorStore.mixed[item.id] && (
        <Alert variant="info" size="small" className="configurator-alertInline">
          {t('configurator.labels.mixed-text')}
        </Alert>
      )}

      <AdapterSwitches target={item} />

      <section className="configurator-section">
        <div className="configurator-sectionHead">
          <h3 className="configurator-sectionTitle">{t('configurator.labels.channels')}</h3>
          <Button
            size="small"
            variant="secondary"
            icon={<PlusIcon />}
            label={t('configurator.buttons.add-channel')}
            aria-expanded={isTilesOpened}
            onClick={() => setIsTilesOpened(!isTilesOpened)}
          />
        </div>
        {isTilesOpened && (
          <div className="configurator-tilesPanel">
            <p>{t('configurator.labels.choose-type')}</p>
            <TypeTiles onPick={addRow} />
          </div>
        )}
        <ul className="configurator-channels">
          {item.rows.map((row) => {
            const type = findType(row.type);
            const { missing } = rowServices(row);
            const TypeIcon = TYPE_ICONS[row.type];
            const roles = type.roles
              .filter(([role, isRequired]) => isRequired || row.bind[role] || roleOptions(role, '').length);
            return (
              <li key={row.did} className="configurator-channel">
                <div className="configurator-channelHead">
                  <span className="configurator-channelTitle">
                    <TypeIcon className="configurator-typeIcon" />
                    {typeName(row.type)}
                  </span>
                  <Button
                    size="small"
                    variant="secondary"
                    icon={<TrashIcon />}
                    aria-label={t('configurator.buttons.remove-channel', { ...UNESCAPED, name: row.name })}
                    onClick={() => configuratorStore.removeOwnRow(item, row.did)}
                  />
                </div>
                <div className="configurator-channelBody">
                  <div className="configurator-fields">
                    <StringField
                      title={t('configurator.labels.name-in-apps')}
                      value={row.name}
                      onChange={(name) => configuratorStore.updateRow(row, { name: String(name) })}
                    />
                    <StringField
                      title={t('configurator.labels.group')}
                      value={row.group}
                      placeholder={t('configurator.labels.no-group')}
                      onChange={(group) => configuratorStore.updateRow(row, { group: String(group) })}
                    />
                    {hasUnit(row.type) && (
                      <UnitField
                        value={row.unit ?? ''}
                        onChange={(unit) => configuratorStore.updateRow(row, { unit })}
                      />
                    )}
                  </div>
                  {roles.map(([role, isRequired]) => (
                    <div key={role} className="configurator-role">
                      <span className="configurator-choiceLabel">{roleLabel(role)}</span>
                      <Dropdown
                        options={roleOptions(role, row.bind[role] ?? '')}
                        value={row.bind[role] ?? null}
                        placeholder={t(isRequired ? 'configurator.labels.choose-channel' : 'configurator.labels.none')}
                        ariaLabel={t('configurator.labels.channel-for-role', { ...UNESCAPED, role: roleLabel(role) })}
                        isInvalid={isRequired && !row.bind[role]}
                        isSearchable
                        isClearable
                        menuPortal
                        onChange={(option: Option<string>) => bindRole(row, role, option?.value ?? null)}
                      />
                    </div>
                  ))}
                  {!!missing.length && (
                    <Alert variant="warn" size="small" className="configurator-alertInline">
                      {t('configurator.labels.role-required', { ...UNESCAPED, role: roleLabel(missing[0]) })}
                    </Alert>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </Card>
  );
});
