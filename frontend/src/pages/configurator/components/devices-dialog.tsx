import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Dialog } from '@/components/dialog';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  configuratorStore, findType, recipeModelTitle, recipeSkipped, splitKey, topicOf, type NewDeviceRow, type RoleId,
} from '@/stores/configurator';
import { DeviceType, devicesStore } from '@/stores/devices';
import type { BoundChannel, DevicesDialogProps, RoleBinds, WbUnit } from '../types';
import { plainUnits, recipeUnits, retype } from '../units';
import {
  deviceControls, deviceTitle, formatValue, isSystemDevice, listDevices, roleLabel, TYPE_ICONS, UNESCAPED,
} from '../utils';
import { DeviceFold } from './device-fold';
import { ModelChip } from './model-chip';
import { TypeChoice } from './type-choice';
import { UnitRoles } from './unit-roles';

// Модель устройств без рецепта.
const OTHER = '';
const NO_SYSTEM = 'no-system';
// Типы устройств, как в фильтре страницы устройств.
const KINDS: Record<string, DeviceType> = {
  system: DeviceType.System,
  virtual: DeviceType.Virtual,
  modbus: DeviceType.Modbus,
  zigbee: DeviceType.Zigbee,
  dali: DeviceType.DALI,
};

export const DevicesDialog = observer(({
  isOpened, onClose, onAdded, onCompose,
}: DevicesDialogProps) => {
  const { t } = useTranslation();
  const [model, setModel] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<Record<string, string>>({});
  // Подмены каналов по строкам: ключ — «ключ строки диалога#номер строки устройства».
  const [binds, setBinds] = useState<Record<string, RoleBinds>>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [kind, setKind] = useState(NO_SYSTEM);
  const [query, setQuery] = useState('');
  // Свёрнутость устройств, заданная руками; без неё одно показанное развёрнуто, несколько — свёрнуты.
  const [folded, setFolded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpened) {
      setModel(null);
      setChecked([]);
      setTypes({});
      setNames({});
      setGroups({});
      setBinds({});
      setExpanded([]);
      setKind(NO_SYSTEM);
      setQuery('');
      setFolded({});
    }
  }, [isOpened]);

  const used = configuratorStore.usedKeys;
  const boundOf = (row: NewDeviceRow): BoundChannel[] => Object.entries(row.bind).map(([role, key]) => {
    const cell = devicesStore.cells.get(key);
    return {
      role: role as RoleId, name: cell?.name ?? key, value: formatValue(cell), topic: topicOf(...splitKey(key)),
    };
  });

  const all = listDevices(true).map((id) => {
    const cells = deviceControls(id);
    const serial = configuratorStore.serialDevices[id];
    return {
      id,
      units: recipeUnits(id, cells, used, serial, (index) => t('configurator.labels.recipe-channel', { index }))
        ?? plainUnits(id, cells, used),
      model: recipeModelTitle(id, serial) ?? OTHER,
      skipped: recipeSkipped(id, cells.map((cell) => cell.controlId), serial),
    };
  }).filter(({ units }) => units.length)
    .sort((a, b) => Number(a.model === OTHER) - Number(b.model === OTHER));
  const isKind = (id: string, key: string) => {
    if (key === NO_SYSTEM || key === 'system') {
      return isSystemDevice(id) === (key === 'system');
    }
    return key === 'all' || devicesStore.devices.get(id)?.type === KINDS[key];
  };
  const kinds: Option<string>[] = [
    { value: NO_SYSTEM, label: t('configurator.labels.filter-no-system') },
    { value: 'all', label: t('devices.labels.all-devices') },
    ...Object.keys(KINDS).filter((key) => all.some(({ id }) => isKind(id, key)))
      .map((key) => ({ value: key, label: t(`devices.labels.type-${key}`) })),
  ];
  const devices = all.filter(({ id }) => isKind(id, kind));

  const models = Array.from(new Set(devices.map((device) => device.model).filter((title) => title !== OTHER)))
    .sort((a, b) => a.localeCompare(b));
  const needle = query.trim().toLowerCase();
  const shown = devices.filter((device) => (model === null || device.model === model)
    && `${deviceTitle(device.id)} ${device.id}`.toLowerCase().includes(needle));
  const isFolded = (id: string) => folded[id] ?? shown.length > 1;
  const isAllFolded = shown.every(({ id }) => isFolded(id));
  const units = all.flatMap((device) => device.units);
  const chosen = units.filter(({ key }) => checked.includes(key));
  const typeOf = (unit: WbUnit) => types[unit.key] ?? unit.suggest ?? unit.rows[0].type;
  const owners = new Map(all.flatMap((device) => device.units.map((unit) => [unit.key, device.id])));
  // Имя по умолчанию дополняется устройством контроллера, вписанное берётся как есть.
  const nameOf = (unit: WbUnit) => {
    const title = deviceTitle(owners.get(unit.key));
    if (names[unit.key] !== undefined) {
      return names[unit.key].trim();
    }
    return unit.name === title ? title : `${title} · ${unit.name}`;
  };
  const taken = new Set(configuratorStore.devices.map((device) => device.name.trim().toLowerCase()));
  const nameError = (unit: WbUnit) => {
    const name = nameOf(unit);
    if (!name) {
      return t('configurator.labels.wb-name-empty');
    }
    const isTaken = taken.has(name.toLowerCase());
    const isBad = isTaken || chosen.some((item) => item !== unit && nameOf(item).toLowerCase() === name.toLowerCase());
    return isBad ? t(`configurator.labels.wb-name-${isTaken ? 'taken' : 'repeat'}`, { ...UNESCAPED, name }) : null;
  };
  const isBadName = (unit: WbUnit) => !!nameError(unit);

  // Строки будущего устройства с выбранным типом и подменёнными каналами.
  const rowsOf = (unit: WbUnit): NewDeviceRow[] => (
    unit.choices.length ? [retype(unit.rows[0], typeOf(unit))] : unit.rows
  ).map((row, at) => {
    const roles = findType(row.type).roles.map(([role]) => role);
    const bind = { ...row.bind, ...binds[`${unit.key}#${at}`] };
    return {
      ...row,
      bind: Object.fromEntries(roles.filter((role) => bind[role]).map((role) => [role, bind[role]])),
    };
  });

  const check = (keys: string[], isOn: boolean) => setChecked(isOn
    ? Array.from(new Set([...checked, ...keys]))
    : checked.filter((key) => !keys.includes(key)));

  // Флажок над набором строк: отмечены все, часть или ни одной.
  const groupBox = (keys: string[], label: string, title?: string) => {
    const count = keys.filter((key) => checked.includes(key)).length;
    return (
      <Checkbox
        checked={!!keys.length && count === keys.length}
        indeterminate={!!count && count < keys.length}
        title={title}
        ariaLabel={label}
        isDisabled={!keys.length}
        onChange={() => check(keys, count !== keys.length)}
      />
    );
  };

  const groupOptions: Option<string>[] = Array.from(new Set([
    ...configuratorStore.devices.map((device) => device.group.trim()),
    ...Object.values(groups),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b)).map((group) => ({ label: group, value: group }));

  const create = () => {
    const created = chosen.map((unit) => {
      const rows = rowsOf(unit);
      // У устройства из одного канала канал называется так же, как устройство.
      const device = configuratorStore.addDevice(
        nameOf(unit),
        rows.length === 1 ? [{ ...rows[0], name: nameOf(unit) }] : rows,
      );
      if (groups[unit.key]) {
        configuratorStore.setGroup(device, groups[unit.key]);
      }
      return device;
    });
    if (created.length > 1) {
      configuratorStore.showOverview();
    } else {
      onAdded();
    }
    onClose();
  };

  const icons = (rowTypes: string[]) => Array.from(new Set(rowTypes)).map((type) => {
    const Icon = TYPE_ICONS[type];
    return <Icon key={type} className="configurator-typeIcon" />;
  });

  return (
    <Dialog
      className="configurator-addDialog configurator-devicesDialog"
      isOpened={isOpened}
      heading={t('configurator.labels.devices-title')}
      width={720}
      onClose={onClose}
    >
      <div className="configurator-addNew configurator-wbSections">
        <p className={classNames({ 'configurator-wbHint': all.length })}>
          {t(all.length ? 'configurator.labels.devices-hint' : 'configurator.labels.devices-none')}
        </p>
        <div className="configurator-wbOptions">
          <Input
            className="configurator-wbSearch"
            type="search"
            value={query}
            placeholder={t('configurator.labels.wb-search')}
            ariaLabel={t('configurator.labels.wb-search')}
            onChange={(value) => setQuery(String(value))}
          />
          <Dropdown
            className="configurator-wbKind"
            value={kind}
            options={kinds}
            ariaLabel={t('devices.labels.filter-type')}
            onChange={(option: Option<string>) => {
              setKind(option?.value ?? NO_SYSTEM);
              setModel(null);
            }}
          />
        </div>
        {!!models.length && (
          <div className="configurator-wbFilters" role="group" aria-label={t('configurator.labels.filter-models')}>
            {[null, ...models].map((title) => (
              <ModelChip
                key={title ?? ''}
                label={title ?? t('configurator.labels.filter-all')}
                count={devices.filter((device) => title === null || device.model === title).length}
                isActive={model === title}
                onClick={() => setModel(title)}
              />
            ))}
          </div>
        )}
        {!!shown.length && (
          <div className="configurator-wbListHead">
            {groupBox(
              shown.flatMap((device) => device.units.map(({ key }) => key)),
              t('configurator.labels.wb-check-all'),
              t('configurator.labels.wb-check-all'),
            )}
            {shown.length > 1 && (
              <Button
                className="configurator-wbFold"
                size="small"
                variant="secondary"
                label={t(`configurator.buttons.${isAllFolded ? 'expand-all' : 'collapse-all'}`)}
                onClick={() => setFolded(Object.fromEntries(shown.map(({ id }) => [id, !isAllFolded])))}
              />
            )}
          </div>
        )}
        {shown.map(({ id, units: deviceUnits, skipped: curtains }) => (
          <section key={id} className="configurator-card">
            <div className="configurator-channelHead configurator-cardHead">
              <span className="configurator-channelTitle">
                {groupBox(
                  deviceUnits.map(({ key }) => key),
                  t('configurator.labels.wb-check-device', { ...UNESCAPED, title: deviceTitle(id) }),
                )}
                <h3 className="configurator-sectionTitle configurator-wbDeviceTitle">{deviceTitle(id)}</h3>
              </span>
              <DeviceFold
                title={deviceTitle(id)}
                types={deviceUnits.flatMap((unit) => rowsOf(unit).map((row) => row.type))}
                picked={deviceUnits.filter(({ key }) => checked.includes(key)).length}
                isFolded={isFolded(id)}
                onToggle={() => setFolded({ ...folded, [id]: !isFolded(id) })}
              />
            </div>
            {!isFolded(id) && (
              <ul className="configurator-channels configurator-cardBody">
                {deviceUnits.map((unit) => {
                  const isExpanded = expanded.includes(unit.key);
                  const unitRows = rowsOf(unit);
                  return (
                    <li key={unit.key} className="configurator-channel">
                      <div className="configurator-channelHead">
                        <Checkbox
                          checked={checked.includes(unit.key)}
                          ariaLabel={unit.label}
                          onChange={(isOn) => check([unit.key], isOn)}
                        />
                        <Input
                          className="configurator-wbName"
                          value={names[unit.key] ?? unit.name}
                          ariaLabel={t('configurator.labels.wb-name', { ...UNESCAPED, label: unit.label })}
                          isInvalid={checked.includes(unit.key) && isBadName(unit)}
                          isFullWidth
                          onChange={(value) => {
                            setNames({ ...names, [unit.key]: String(value) });
                            check([unit.key], true);
                          }}
                        />
                        <span className="configurator-wbModelIcons" aria-hidden="true">
                          {icons(unitRows.map((row) => row.type))}
                        </span>
                      </div>
                      {checked.includes(unit.key) && isBadName(unit) && (
                        <p className="configurator-wbNameError">{nameError(unit)}</p>
                      )}
                      {unit.choices.length > 1 && (
                        <TypeChoice
                          types={unit.choices}
                          value={typeOf(unit)}
                          ariaLabel={`${t('configurator.labels.type')}: ${unit.label}`}
                          onChange={(typeId) => setTypes({ ...types, [unit.key]: typeId })}
                        />
                      )}
                      <div className="configurator-role configurator-wbGroup">
                        <span className="configurator-choiceLabel">{t('configurator.labels.group')}</span>
                        <Dropdown
                          options={groupOptions}
                          value={groups[unit.key] || null}
                          placeholder={t('configurator.labels.no-group')}
                          ariaLabel={`${t('configurator.labels.group')}: ${unit.label}`}
                          isSearchable
                          isClearable
                          isCreatable
                          menuPortal
                          onChange={(option: Option<string>) => {
                            setGroups({ ...groups, [unit.key]: option?.value.trim() ?? '' });
                            check([unit.key], true);
                          }}
                        />
                      </div>
                      <div className="configurator-wbControls">
                        <ul className="configurator-adapterNote configurator-wbBinds">
                          {unitRows.flatMap(boundOf)
                            .filter((bound, at, all) => all.findIndex(({ role, topic }) => role === bound.role
                            && topic === bound.topic) === at)
                            .map((bound) => (
                              <li key={`${bound.role}:${bound.topic}`} title={bound.topic}>
                                {`${roleLabel(bound.role)} · ${bound.name} · ${bound.value}`}
                              </li>
                            ))}
                        </ul>
                        <Button
                          size="small"
                          variant="secondary"
                          icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          label={t('configurator.buttons.channels')}
                          aria-expanded={isExpanded}
                          onClick={() => setExpanded(isExpanded
                            ? expanded.filter((key) => key !== unit.key)
                            : [...expanded, unit.key])}
                        />
                      </div>
                      {isExpanded && (
                        <UnitRoles
                          rows={rowsOf(unit)}
                          deviceId={id}
                          onBind={(at, role, value) => {
                            const key = `${unit.key}#${at}`;
                            setBinds({ ...binds, [key]: { ...binds[key], [role]: value } });
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!isFolded(id) && !!curtains && (
              <p className="configurator-adapterNote configurator-wbCurtains">
                {t('configurator.labels.wb-curtains', { count: curtains })}
              </p>
            )}
          </section>
        ))}
        {!shown.length && !!all.length && (
          <p className="configurator-empty">{t('configurator.labels.nothing-found')}</p>
        )}
        <Button
          className="configurator-wbCompose"
          size="small"
          variant="secondary"
          label={t('configurator.buttons.compose')}
          onClick={onCompose}
        />
      </div>
      <footer className="configurator-dialogFooter">
        <span />
        <Button variant="secondary" label={t('modal.labels.cancel')} onClick={onClose} />
        <Button
          label={t('configurator.buttons.create-devices', chosen.length ? { count: chosen.length } : {})}
          disabled={!chosen.length || chosen.some(isBadName)}
          onClick={create}
        />
      </footer>
    </Dialog>
  );
});
