import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Dialog } from '@/components/dialog';
import { TabContent, Tabs } from '@/components/tabs';
import { CHANNEL_CLASSES, configuratorStore, NO_PRESET, primaryRole, type WbChannel } from '@/stores/configurator';
import type { Cell } from '@/stores/devices';
import type { AddDialogProps } from '../types';
import {
  classifyCell, defaultName, deviceControls, deviceTitle, formatValue, isSystemDevice, isVirtualDevice, listDevices,
  typeName, UNESCAPED, whyText,
} from '../utils';
import { TypeChoice } from './type-choice';
import { TypeTiles } from './type-tiles';

const TAB_WB = 'configurator-add-wb';
const TAB_NEW = 'configurator-add-new';

export const AddDialog = observer(({ isOpened, onClose }: AddDialogProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(TAB_WB);
  const [showSystem, setShowSystem] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  // Выбор пользователя поверх предотметки: controlId → тип или '' (снят).
  const [picked, setPicked] = useState<Record<string, string>>({});

  const added = new Set(configuratorStore.wbs.map((wb) => wb.id));
  const allDevices = listDevices(showSystem);
  const devices = [...allDevices.filter((id) => !added.has(id)), ...allDevices.filter((id) => added.has(id))];
  const systemCount = listDevices(true).filter(isSystemDevice).length;
  const current = deviceId && !added.has(deviceId) && devices.includes(deviceId) ? deviceId : null;

  useEffect(() => {
    if (isOpened) {
      setTab(TAB_WB);
      setPicked({});
      setDeviceId(listDevices(false).find((id) => !added.has(id)) ?? null);
    }
  }, [isOpened]);

  const used = configuratorStore.usedKeys;
  const presetType = (cell: Cell, types: string[], preset: boolean) =>
    preset && !used.has(cell.id) && !NO_PRESET.test(cell.controlId) && !NO_PRESET.test(cell.name) ? types[0] : '';

  const channels = current ? deviceControls(current).map((cell) => {
    const classification = classifyCell(cell);
    const { types, preset } = CHANNEL_CLASSES[classification.cls];
    const chosen = cell.controlId in picked ? picked[cell.controlId] : presetType(cell, types, preset);
    return { cell, classification, types, preset, chosen };
  }) : [];
  const typed = channels.filter((channel) => channel.types.length);
  const unsupported = channels.filter((channel) => !channel.types.length);
  const chosenCount = typed.filter((channel) => channel.chosen).length;

  const pick = (controlId: string, typeId: string) => setPicked({ ...picked, [controlId]: typeId });

  const addWb = () => {
    const result: Record<string, Omit<WbChannel, 'did' | 'group' | 'extra'>> = {};
    typed.filter((channel) => channel.chosen).forEach(({ cell, classification, chosen }) => {
      result[cell.controlId] = {
        type: chosen,
        name: defaultName(chosen, cell, classification.cls),
        prim: primaryRole(chosen, classification.cls),
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
                  {typed.map(({ cell, types, preset, chosen }) => (
                    <li key={cell.controlId} className="configurator-channel">
                      <div className="configurator-channelHead">
                        <Checkbox
                          checked={!!chosen}
                          title={cell.name}
                          ariaLabel={t('configurator.labels.show-channel', { ...UNESCAPED, name: cell.name })}
                          onChange={() => pick(cell.controlId, chosen ? '' : types[0])}
                        />
                        <span className="configurator-channelValue">
                          {t('configurator.labels.value', { ...UNESCAPED, value: formatValue(cell) })}
                          {!preset && `, ${t('configurator.labels.choose-type-hint')}`}
                        </span>
                      </div>
                      {types.length > 1 && (
                        <TypeChoice
                          types={types}
                          value={chosen}
                          ariaLabel={`${t('configurator.labels.type')}: ${cell.name}`}
                          onChange={(typeId) => pick(cell.controlId, typeId)}
                        />
                      )}
                    </li>
                  ))}
                  {unsupported.map(({ cell, classification }) => (
                    <li key={cell.controlId} className="configurator-channel">
                      <div className="configurator-channelHead">
                        <Checkbox
                          checked={false}
                          title={cell.name}
                          ariaLabel={t('configurator.labels.channel-unsupported', { ...UNESCAPED, name: cell.name })}
                          isDisabled
                          onChange={() => {}}
                        />
                        <span className="configurator-channelValue">{whyText(classification)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
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
