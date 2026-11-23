import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@/assets/icons/close.svg';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Dialog } from '@/components/dialog';
import {
  CHANNEL_CLASSES, configuratorStore, findType, primaryRole, splitKey, type NewDeviceRow,
} from '@/stores/configurator';
import type { Cell } from '@/stores/devices';
import type { AddDialogProps, PickedChannel } from '../types';
import {
  classifyCell, defaultName, deviceControls, deviceTitle, formatValue, isSystemDevice, isVirtualDevice, listDevices,
  TYPE_ICONS, typeName, UNESCAPED, whyText,
} from '../utils';
import { TypeChoice } from './type-choice';
import { TypeTiles } from './type-tiles';
import { UnsupportedChannels } from './unsupported-channels';

export const AddDialog = observer(({
  isOpened, onClose, initialDeviceId, target, isEmpty, onAdded,
}: AddDialogProps) => {
  const { t } = useTranslation();
  const [isTilesShown, setIsTilesShown] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  // Выбор по всем устройствам контроллера: ключ — «устройство/контрол».
  const [picked, setPicked] = useState<Record<string, PickedChannel>>({});

  const used = configuratorStore.usedKeys;
  const suitableControls = (id: string) =>
    deviceControls(id).filter((cell) => CHANNEL_CLASSES[classifyCell(cell).cls].types.length);
  const hasFree = (id: string) => suitableControls(id).some((cell) => !used.has(cell.id));

  const allDevices = listDevices(showSystem);
  const devices = [...allDevices.filter(hasFree), ...allDevices.filter((id) => !hasFree(id))];
  const systemCount = listDevices(true).filter(isSystemDevice).length;
  const current = deviceId && devices.includes(deviceId) ? deviceId : null;

  useEffect(() => {
    if (!isOpened) {
      return;
    }
    setIsTilesShown(!!isEmpty);
    setPicked({});
    const bound = target?.rows.flatMap((row) => Object.values(row.bind).map((key) => splitKey(key)[0])) ?? [];
    const fromTarget = listDevices(true).find((id) => bound.includes(id) && hasFree(id));
    if (fromTarget && isSystemDevice(fromTarget)) {
      setShowSystem(true);
    }
    setDeviceId(initialDeviceId ?? fromTarget ?? listDevices(false).find(hasFree) ?? listDevices(false)[0] ?? null);
  }, [isOpened]);

  const channelsOf = (id: string) => deviceControls(id).map((cell) => {
    const classification = classifyCell(cell);
    const { types } = CHANNEL_CLASSES[classification.cls];
    const isUsed = used.has(cell.id);
    const choice: PickedChannel = isUsed
      ? { checked: true, type: '' }
      : picked[cell.id] ?? { checked: false, type: '' };
    return {
      cell, classification, types, choice, isUsed,
    };
  });

  const channels = current ? channelsOf(current) : [];
  const typed = channels.filter((channel) => channel.types.length);
  const unsupported = channels.filter((channel) => !channel.types.length);
  const pickedDevices = Array.from(new Set(Object.keys(picked).map((key) => splitKey(key)[0])));
  const chosen = pickedDevices.flatMap((id) => channelsOf(id)
    .filter((channel) => channel.types.length && !channel.isUsed && channel.choice.checked)
    .map((channel) => ({ ...channel, deviceId: id })));
  const pickedCount = (id: string) => chosen.filter((channel) => channel.deviceId === id).length;

  // Отмеченному каналу ставится первый подходящий тип; его видно в строке и можно сменить.
  const check = (types: string[]): PickedChannel => ({ checked: true, type: types[0] });

  const pick = (key: string, choice: PickedChannel) => setPicked({ ...picked, [key]: choice });

  // Все свободные каналы текущего устройства; уже отмеченные сохраняют свой тип.
  const free = typed.filter(({ isUsed }) => !isUsed);

  const pickAll = () => setPicked({
    ...picked,
    ...Object.fromEntries(free
      .filter(({ choice }) => !choice.checked)
      .map(({ cell, types }) => [cell.id, check(types)])),
  });

  const pickNone = () => setPicked(Object.fromEntries(
    Object.entries(picked).filter(([key]) => !free.some(({ cell }) => cell.id === key)),
  ));

  const isAllPicked = !!free.length && free.every(({ choice }) => choice.checked);

  const add = (name: string, rows: NewDeviceRow[]) => {
    if (target) {
      configuratorStore.addRows(target, rows);
    } else {
      onAdded?.(configuratorStore.addDevice(name, rows));
    }
    onClose();
  };

  const addChosen = () => {
    const rows: NewDeviceRow[] = chosen.map(({
      cell, classification, choice, deviceId,
    }) => {
      const battery = channelsOf(deviceId).find((channel) => channel.classification.cls === 'battery')?.cell.id;
      const hasBattery = findType(choice.type).roles.some(([role]) => role === 'battery');
      return {
        type: choice.type,
        name: defaultName(choice.type, cell, classification.cls),
        bind: {
          [primaryRole(choice.type, classification.cls)]: cell.id,
          ...(battery && hasBattery ? { battery } : {}),
        },
        unit: classification.units,
      };
    });
    const sources = Array.from(new Set(chosen.map((channel) => channel.deviceId)));
    add(sources.length === 1 ? deviceTitle(sources[0]) : t('configurator.labels.new-device'), rows);
  };

  const addEmpty = (typeId: string) => {
    if (target && !target.name.trim()) {
      configuratorStore.setName(target, typeName(typeId));
    }
    add(typeName(typeId), [{ type: typeId, name: typeName(typeId), bind: {} }]);
  };

  const deviceHint = (id: string) => {
    const suitable = suitableControls(id);
    const usedCount = suitable.filter((cell) => used.has(cell.id)).length;
    let kind = '';
    if (isSystemDevice(id)) {
      kind = t('configurator.labels.service-device');
    } else if (isVirtualDevice(id)) {
      kind = t('configurator.labels.virtual-device');
    }
    const count = usedCount
      ? t('configurator.labels.suitable-used', { ...UNESCAPED, count: suitable.length, used: usedCount })
      : t('configurator.labels.suitable', { ...UNESCAPED, count: suitable.length });
    const pickedHere = pickedCount(id);
    const pickedText = pickedHere ? t('configurator.labels.picked-count', { ...UNESCAPED, count: pickedHere }) : '';
    return [id, kind, count, pickedText].filter(Boolean).join(' · ');
  };

  return (
    <Dialog
      className="configurator-addDialog"
      isOpened={isOpened}
      heading={t(target ? 'configurator.labels.add-channels-title' : 'configurator.labels.add-title')}
      width={960}
      onClose={onClose}
    >
      {isTilesShown ? (
        <div className="configurator-addNew">
          <p>{t(target ? 'configurator.labels.choose-type' : 'configurator.labels.empty-hint')}</p>
          <TypeTiles onPick={addEmpty} />
        </div>
      ) : (
        <div className="configurator-addLayout">
          <section className="configurator-addDevices">
            <h3 className="configurator-sectionTitle">{t('configurator.labels.controller-devices')}</h3>
            <ul className="configurator-listItems">
              {devices.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={classNames('configurator-listItem', { 'configurator-listItemSelected': id === current })}
                    aria-pressed={id === current}
                    onClick={() => setDeviceId(id)}
                  >
                    <span className="configurator-listText">
                      <span className="configurator-listTitle">{deviceTitle(id)}</span>
                      <span>{deviceHint(id)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!devices.length && <p className="configurator-empty">{t('configurator.labels.no-controller-devices')}</p>}
            <Checkbox
              checked={showSystem}
              title={t('configurator.labels.show-service', { ...UNESCAPED, count: systemCount })}
              onChange={setShowSystem}
            />
          </section>

          <section className="configurator-addChannels">
            {current ? (
              <>
                <h3 className="configurator-sectionTitle">{`${deviceTitle(current)} (${current})`}</h3>
                <p>{t('configurator.labels.add-hint')}</p>
                <div className="configurator-addAll">
                  <Checkbox
                    checked={isAllPicked}
                    indeterminate={!isAllPicked && free.some(({ choice }) => choice.checked)}
                    title={t('configurator.labels.all-channels')}
                    ariaLabel={t('configurator.labels.all-channels')}
                    isDisabled={!free.length}
                    onChange={() => (isAllPicked ? pickNone() : pickAll())}
                  />
                </div>
                <ul className="configurator-channels">
                  {typed.map(({
                    cell, types, choice, isUsed,
                  }) => (
                    <li key={cell.controlId} className="configurator-channel">
                      <div className="configurator-channelHead">
                        <Checkbox
                          checked={choice.checked}
                          title={cell.name}
                          ariaLabel={t('configurator.labels.show-channel', { ...UNESCAPED, name: cell.name })}
                          isDisabled={isUsed}
                          onChange={(checked) => pick(
                            cell.id,
                            checked ? check(types) : { checked: false, type: '' },
                          )}
                        />
                        <span className="configurator-channelValue">
                          {isUsed ? t('configurator.labels.already-used') : (
                            <>
                              {t('configurator.labels.value', { ...UNESCAPED, value: formatValue(cell) })}
                            </>
                          )}
                        </span>
                      </div>
                      {!isUsed && (
                        <TypeChoice
                          types={types}
                          value={choice.type}
                          ariaLabel={`${t('configurator.labels.type')}: ${cell.name}`}
                          onChange={(typeId) => pick(cell.id, { checked: true, type: typeId })}
                        />
                      )}
                    </li>
                  ))}
                </ul>
                <UnsupportedChannels
                  items={unsupported.map(({ cell, classification }) => ({
                    id: cell.controlId, name: cell.name, reason: whyText(classification),
                  }))}
                />
              </>
            ) : (
              <p>{t('configurator.labels.no-controller-devices')}</p>
            )}
          </section>
        </div>
      )}
      {current && !isTilesShown && (
        <section className="configurator-picked">
          <p className="configurator-pickedSummary">
            {t('configurator.labels.selected-count', { ...UNESCAPED, count: chosen.length })}
          </p>
          {!!chosen.length && (
            <ul className="configurator-pickedItems" aria-label={t('configurator.labels.picked-channels')}>
              {chosen.map(({ cell, deviceId, choice }) => {
                const TypeIcon = TYPE_ICONS[choice.type];
                return (
                  <li key={cell.id} className="configurator-pickedItem" title={typeName(choice.type)}>
                    {TypeIcon && <TypeIcon className="configurator-typeIcon" aria-hidden="true" />}
                    {`${cell.name} · ${deviceTitle(deviceId)}`}
                    <button
                      type="button"
                      className="configurator-pickedRemove"
                      aria-label={t('configurator.labels.unpick', { ...UNESCAPED, name: cell.name })}
                      onClick={() => pick(cell.id, { checked: false, type: '' })}
                    >
                      <CloseIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      <footer className="configurator-dialogFooter">
        <span />
        <Button variant="secondary" label={t('modal.labels.cancel')} onClick={onClose} />
        {isTilesShown && target && (
          <Button
            variant="secondary"
            label={t('configurator.buttons.to-controller-devices')}
            onClick={() => setIsTilesShown(false)}
          />
        )}
        {!isTilesShown && (
          <>
            {target && (
              <Button
                variant="secondary"
                label={t('configurator.buttons.empty-channel')}
                onClick={() => setIsTilesShown(true)}
              />
            )}
            <Button
              label={t(target ? 'configurator.buttons.add-channels' : 'configurator.buttons.add-device')}
              disabled={!chosen.length || !chosen.every((channel) => channel.choice.type)}
              onClick={addChosen}
            />
          </>
        )}
      </footer>
    </Dialog>
  );
});
