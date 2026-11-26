import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import EditSquareIcon from '@/assets/icons/edit-square.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Dropdown, type Option } from '@/components/dropdown';
import { StringField } from '@/components/form';
import { Input } from '@/components/input';
import {
  CHANNEL_CLASSES, configuratorStore, findType, hasUnit, inheritedName, isUnnamed, primaryRole, rowName, splitKey,
  type ChannelClass,
  type DeviceRow,
  type RoleId,
} from '@/stores/configurator';
import { devicesStore, type Cell } from '@/stores/devices';
import type { DevicePanelProps } from '../types';
import {
  classifyCell, defaultName, deviceControls, listDevices, liveControls, roleLabel,
  TYPE_ICONS, typeName, UNESCAPED,
} from '../utils';
import { AdapterSwitches } from './adapter-switches';
import { GroupField } from './group-field';
import { TypeChoice } from './type-choice';
import { UnitField } from './unit-field';

export const DevicePanel = observer(({
  item, onOverview, onRemove, onAddRows,
}: DevicePanelProps) => {
  const { t } = useTranslation();
  const devices = listDevices(true);

  // Свёрнутые каналы карточки по их did.
  const [collapsed, setCollapsed] = useState<number[]>([]);
  const [editedName, setEditedName] = useState<number | null>(null);
  const isAllCollapsed = item.rows.every((row) => collapsed.includes(row.did));
  const listRef = useRef<HTMLUListElement>(null);
  const knownDids = useRef(item.rows.map((row) => row.did));

  // Добавленный канал встаёт в конец: прокручиваем к нему.
  useEffect(() => {
    const added = item.rows.find((row) => !knownDids.current.includes(row.did));
    knownDids.current = item.rows.map((row) => row.did);
    if (added) {
      listRef.current?.querySelector(`[data-did="${added.did}"]`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  });

  // Необязательная роль показывается, только если на контроллере есть канал, который ей подходит.
  const hasFit = (role: RoleId) => devices.some((deviceId) => deviceControls(deviceId)
    .some((cell) => CHANNEL_CLASSES[classifyCell(cell).cls].fits.includes(role)));

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

  // Живой контрол первой привязанной роли, если она основная для его класса.
  const primaryChannel = (row: DeviceRow) => {
    const role = findType(row.type).roles.map(([typeRole]) => typeRole).find((typeRole) => row.bind[typeRole]);
    const cell = role && liveControls.meta(...splitKey(row.bind[role])) ? devicesStore.cells.get(row.bind[role]) : null;
    const cls = cell ? classifyCell(cell).cls : null;
    return cell && primaryRole(row.type, cls) === role ? { cell, cls } : null;
  };

  const changeType = (row: DeviceRow, cell: Cell, cls: ChannelClass, typeId: string) => {
    configuratorStore.changeType(
      row,
      typeId,
      primaryRole(typeId, cls),
      row.name === defaultName(row.type, cell, cls) ? defaultName(typeId, cell, cls) : row.name,
    );
  };

  return (
    <Card
      heading={t('configurator.labels.device-settings')}
      indicator={(
        <div className="configurator-listActions">
          {onOverview && (
            <Button
              size="small"
              variant="secondary"
              label={t('configurator.buttons.to-overview')}
              onClick={onOverview}
            />
          )}
          <Button
            size="small"
            variant="danger"
            icon={<TrashIcon />}
            label={t('configurator.buttons.remove')}
            aria-label={t('configurator.buttons.remove-device')}
            aria-haspopup="dialog"
            onClick={() => onRemove(item.name || t('configurator.labels.new-device'))}
          />
        </div>
      )}
    >
      <div className="configurator-fields">
        <StringField
          title={t('configurator.labels.device-name')}
          value={item.name}
          placeholder={t('configurator.labels.new-device')}
          error={configuratorStore.nameConflicts.has(item.id) ? t('configurator.labels.name-taken') : undefined}
          onChange={(name) => configuratorStore.setName(item, String(name))}
        />
        <GroupField value={item.group} onChange={(group) => configuratorStore.setGroup(item, group)} />
      </div>
      {configuratorStore.mixed[item.id] && (
        <Alert variant="info" size="small" className="configurator-alertInline">
          {t('configurator.labels.mixed-text')}
        </Alert>
      )}

      <AdapterSwitches target={item} />

      <section className="configurator-section">
        <div className="configurator-sectionHead">
          <h3 className="configurator-sectionTitle">
            {t('configurator.labels.channels')}
            {!!item.rows.length && ` (${item.rows.length})`}
          </h3>
          <div className="configurator-listActions">
            {item.rows.length > 1 && (
              <Button
                size="small"
                variant="secondary"
                label={t(`configurator.buttons.${isAllCollapsed ? 'expand-all' : 'collapse-all'}`)}
                onClick={() => setCollapsed(isAllCollapsed ? [] : item.rows.map((row) => row.did))}
              />
            )}
            <Button
              size="small"
              variant="secondary"
              icon={<PlusIcon />}
              label={t('configurator.buttons.add-channel')}
              aria-haspopup="dialog"
              onClick={onAddRows}
            />
          </div>
        </div>
        {!item.rows.length && <p className="configurator-empty">{t('configurator.labels.channels-none')}</p>}
        <ul ref={listRef} className="configurator-channels configurator-cards">
          {item.rows.map((row, index) => {
            const TypeIcon = TYPE_ICONS[row.type];
            const roles = findType(row.type).roles
              .filter(([role, isRequired]) => isRequired || row.bind[role] || hasFit(role));
            const isCollapsed = collapsed.includes(row.did);
            const title = rowName(item, row) || typeName(row.type);
            const hint = isUnnamed(item, row) ? t('configurator.labels.channel-name-hint') : '';
            const primary = primaryChannel(row);
            const classTypes = primary ? CHANNEL_CLASSES[primary.cls].types : [];
            const types = !classTypes.length || classTypes.includes(row.type) ? classTypes : [row.type, ...classTypes];
            return (
              <li key={row.did} className="configurator-card" data-did={row.did}>
                <div className="configurator-channelHead configurator-cardHead">
                  <span className="configurator-channelTitle">
                    <button
                      type="button"
                      className="configurator-collapse"
                      aria-expanded={!isCollapsed}
                      aria-label={t('configurator.labels.toggle-channel', { ...UNESCAPED, name: title })}
                      onClick={() => setCollapsed(isCollapsed
                        ? collapsed.filter((did) => did !== row.did)
                        : [...collapsed, row.did])}
                    >
                      {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                    </button>
                    <span className="configurator-cardNumber">{index + 1}</span>
                    <TypeIcon className="configurator-typeIcon" aria-label={typeName(row.type)} />
                    {editedName === row.did ? (
                      <Input
                        className="configurator-channelName"
                        value={row.name}
                        placeholder={hint || inheritedName(item, row)}
                        ariaLabel={t('configurator.labels.name-in-apps')}
                        autoFocus
                        onChange={(name) => configuratorStore.updateRow(row, { name: String(name) })}
                        onEnter={() => setEditedName(null)}
                        onBlur={() => setEditedName(null)}
                      />
                    ) : (
                      <>
                        <span
                          className={classNames('configurator-channelText', { 'configurator-channelHint': hint })}
                        >
                          {hint || title}
                        </span>
                        <Button
                          size="small"
                          variant="secondary"
                          icon={<EditSquareIcon />}
                          aria-label={t('configurator.buttons.edit-channel-name', { ...UNESCAPED, name: title })}
                          isOutlined
                          onClick={() => setEditedName(row.did)}
                        />
                      </>
                    )}
                  </span>
                  <Button
                    size="small"
                    variant="secondary"
                    icon={<TrashIcon />}
                    aria-label={t('configurator.buttons.remove-channel', { ...UNESCAPED, name: title })}
                    onClick={() => configuratorStore.removeRow(item, row.did)}
                  />
                </div>
                {!isCollapsed && (
                  <div className="configurator-channelBody configurator-cardBody">
                    {hasUnit(row.type) && (
                      <div className="configurator-fields">
                        <UnitField
                          value={row.unit ?? ''}
                          onChange={(unit) => configuratorStore.updateRow(row, { unit })}
                        />
                      </div>
                    )}
                    {types.length > 1 && (
                      <TypeChoice
                        types={types}
                        value={row.type}
                        ariaLabel={`${t('configurator.labels.type')}: ${title}`}
                        onChange={(typeId) => changeType(row, primary.cell, primary.cls, typeId)}
                      />
                    )}
                    {roles.map(([role, isRequired]) => (
                      <div key={role} className="configurator-role">
                        <span className="configurator-choiceLabel">{roleLabel(role)}</span>
                        <Dropdown
                          options={devicesStore.topicsWithoutSystem}
                          value={row.bind[role] ?? null}
                          placeholder={t(`configurator.labels.${isRequired ? 'choose-channel' : 'none'}`)}
                          ariaLabel={t('configurator.labels.channel-for-role', { ...UNESCAPED, role: roleLabel(role) })}
                          isInvalid={isRequired && !row.bind[role]}
                          isCreatable
                          isSearchable
                          isClearable
                          menuPortal
                          onChange={(option: Option<string>) => bindRole(row, role, option?.value || null)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </Card>
  );
});
