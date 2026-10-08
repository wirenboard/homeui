import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Dialog } from '@/components/dialog';
import { TabContent, Tabs } from '@/components/tabs';
import {
  CHANNEL_CLASSES, configuratorStore, findType, isAmbiguousClass, NO_PRESET, primaryRole, type NewWbChannel,
} from '@/stores/configurator';
import type { Cell } from '@/stores/devices';
import type { AddDialogProps, PickedChannel } from '../types';
import {
  classifyCell, defaultName, deviceControls, deviceTitle, formatValue, isSystemDevice, isVirtualDevice, listDevices,
  typeName, UNESCAPED, whyText,
} from '../utils';
import { TypeChoice } from './type-choice';
import { TypeTiles } from './type-tiles';
import { UnsupportedChannels } from './unsupported-channels';

const TAB_WB = 'configurator-add-wb';
const TAB_NEW = 'configurator-add-new';

export const AddDialog = observer(({ isOpened, onClose, initialDeviceId }: AddDialogProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(TAB_WB);
  const [showSystem, setShowSystem] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  // Выбор пользователя поверх предотметки.
  const [picked, setPicked] = useState<Record<string, PickedChannel>>({});

  const added = new Set(configuratorStore.wbs.map((wb) => wb.id));
  const allDevices = listDevices(showSystem);
  const devices = [...allDevices.filter((id) => !added.has(id)), ...allDevices.filter((id) => added.has(id))];
  const systemCount = listDevices(true).filter(isSystemDevice).length;
  const current = deviceId && !added.has(deviceId) && devices.includes(deviceId) ? deviceId : null;

  useEffect(() => {
    if (isOpened) {
      setTab(TAB_WB);
      setPicked({});
      setDeviceId(initialDeviceId ?? listDevices(false).find((id) => !added.has(id)) ?? null);
    }
  }, [isOpened]);

  const used = configuratorStore.usedKeys;
  const preset = (cell: Cell, types: string[], isPreset: boolean): PickedChannel => {
    const checked = isPreset && !used.has(cell.id) && !NO_PRESET.test(cell.controlId) && !NO_PRESET.test(cell.name);
    return { checked, type: checked ? types[0] : '' };
  };

  const channels = current ? deviceControls(current).map((cell) => {
    const classification = classifyCell(cell);
    const { types, preset: isPreset } = CHANNEL_CLASSES[classification.cls];
    const choice = picked[cell.controlId] ?? preset(cell, types, isPreset);
    return { cell, classification, types, choice };
  }) : [];
  const typed = channels.filter((channel) => channel.types.length);
  const unsupported = channels.filter((channel) => !channel.types.length);
  const chosenCount = typed.filter((channel) => channel.choice.checked).length;

  const pick = (controlId: string, choice: PickedChannel) => setPicked({ ...picked, [controlId]: choice });

  const addWb = () => {
    const result: Record<string, NewWbChannel> = {};
    const battery = channels.find((channel) => channel.classification.cls === 'battery')?.cell.controlId;
    typed.filter((channel) => channel.choice.checked).forEach(({ cell, classification, choice }) => {
      const hasBattery = findType(choice.type)?.roles.some(([role]) => role === 'battery');
      result[cell.controlId] = {
        type: choice.type,
        name: defaultName(choice.type, cell, classification.cls),
        prim: choice.type
          ? primaryRole(choice.type, classification.cls)
          : CHANNEL_CLASSES[classification.cls].fits[0],
        extra: battery && hasBattery ? { battery } : {},
      };
    });
    configuratorStore.addWb(current, result);
    onClose();
  };

  const addOwn = (typeId: string) => {
    configuratorStore.addOwn(typeName(typeId), { type: typeId, name: typeName(typeId), group: '', bind: {} });
    onClose();
  };

  const deviceHint = (id: string) => {
    if (added.has(id)) {
      return t('configurator.labels.already-added');
    }
    const suitable = deviceControls(id).filter((cell) => CHANNEL_CLASSES[classifyCell(cell).cls].types.length).length;
    let kind = '';
    if (isSystemDevice(id)) {
      kind = t('configurator.labels.service-device');
    } else if (isVirtualDevice(id)) {
      kind = t('configurator.labels.virtual-device');
    }
    return [id, kind, t('configurator.labels.suitable', { ...UNESCAPED, count: suitable })].filter(Boolean).join(' · ');
  };

  return (
    <Dialog
      className="configurator-addDialog"
      isOpened={isOpened}
      heading={t('configurator.labels.add-title')}
      width={960}
      onClose={onClose}
    >
      <Tabs
        items={[
          { id: TAB_WB, label: t('configurator.labels.tab-wb') },
          { id: TAB_NEW, label: t('configurator.labels.tab-new') },
        ]}
        activeTab={tab}
        orientation="horizontal"
        onTabChange={setTab}
      />

      <TabContent tabId={TAB_WB} activeTab={tab}>
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
                    onClick={() => {
                      if (added.has(id)) {
                        configuratorStore.select({ kind: 'wb', id });
                        onClose();
                      } else {
                        setDeviceId(id);
                        setPicked({});
                      }
                    }}
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
                <ul className="configurator-channels">
                  {typed.map(({ cell, classification, types, choice }) => (
                    <li key={cell.controlId} className="configurator-channel">
                      <div className="configurator-channelHead">
                        <Checkbox
                          checked={choice.checked}
                          title={cell.name}
                          ariaLabel={t('configurator.labels.show-channel', { ...UNESCAPED, name: cell.name })}
                          onChange={(checked) => pick(cell.controlId, {
                            checked,
                            type: checked && !isAmbiguousClass(classification.cls) ? types[0] : '',
                          })}
                        />
                        <span className="configurator-channelValue">
                          {t('configurator.labels.value', { ...UNESCAPED, value: formatValue(cell) })}
                          {isAmbiguousClass(classification.cls) && `, ${t('configurator.labels.choose-type-hint')}`}
                        </span>
                      </div>
                      <TypeChoice
                        types={types}
                        value={choice.type}
                        ariaLabel={`${t('configurator.labels.type')}: ${cell.name}`}
                        onChange={(typeId) => pick(cell.controlId, { checked: true, type: typeId })}
                      />
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
              <p>
                {devices.length ? t('configurator.labels.all-added') : t('configurator.labels.no-controller-devices')}
              </p>
            )}
          </section>
        </div>
        <footer className="configurator-dialogFooter">
          <span>{current && t('configurator.labels.selected-count', { ...UNESCAPED, count: chosenCount })}</span>
          <Button variant="secondary" label={t('modal.labels.cancel')} onClick={onClose} />
          <Button label={t('configurator.buttons.add-device')} disabled={!current} onClick={addWb} />
        </footer>
      </TabContent>

      <TabContent tabId={TAB_NEW} activeTab={tab}>
        <div className="configurator-addNew">
          <p>{t('configurator.labels.new-hint')}</p>
          <TypeTiles onPick={addOwn} />
        </div>
      </TabContent>
    </Dialog>
  );
});
