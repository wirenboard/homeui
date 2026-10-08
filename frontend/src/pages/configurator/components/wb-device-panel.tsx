import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { OptionsField, StringField } from '@/components/form';
import {
  boundRole, CHANNEL_CLASSES, configuratorStore, findType, hasUnit, isAmbiguousClass, primaryRole, rowServices,
  splitKey, type DeviceRow,
} from '@/stores/configurator';
import type { Cell } from '@/stores/devices';
import type { WbDevicePanelProps } from '../types';
import {
  classifyCell, defaultName, deviceControls, deviceLabel, formatValue, isLiveDevice, roleLabel, UNESCAPED,
  whyText,
} from '../utils';
import { AdapterSwitches } from './adapter-switches';
import { TypeChoice } from './type-choice';
import { UnitField } from './unit-field';
import { UnsupportedChannels } from './unsupported-channels';

export const WbDevicePanel = observer(({ wb, onRemove }: WbDevicePanelProps) => {
  const { t } = useTranslation();
  const isLost = !isLiveDevice(wb.id);
  const controls = deviceControls(wb.id);
  const cellOf = (controlId: string) => controls.find((cell) => cell.controlId === controlId);
  // Пропавшее из MQTT устройство показываем по сохранённым каналам.
  const controlIds = isLost ? Object.keys(wb.channels) : controls.map((cell) => cell.controlId);

  const rows = controlIds.map((controlId) => {
    const cell = cellOf(controlId);
    const channel = wb.channels[controlId];
    const classification = cell ? classifyCell(cell) : { cls: null };
    const types = classification.cls ? [...CHANNEL_CLASSES[classification.cls].types] : [];
    if (channel?.type && !types.includes(channel.type)) {
      types.unshift(channel.type);
    }
    return { controlId, cell, channel, classification, types };
  });
  const typedRows = rows.filter((row) => row.types.length);
  const unsupportedRows = rows.filter((row) => !row.types.length);
  const selectedCount = typedRows.filter((row) => row.channel).length;

  const keyOf = (controlId: string) => `${wb.id}/${controlId}`;

  const changeType = (channel: DeviceRow, cell: Cell, controlId: string, typeId: string) => {
    const cls = classifyCell(cell).cls;
    configuratorStore.updateRow(channel, {
      type: typeId,
      bind: { [primaryRole(typeId, cls)]: keyOf(controlId) },
      name: channel.name === defaultName(channel.type, cell, cls) ? defaultName(typeId, cell, cls) : channel.name,
    });
  };

  const extraRoles = (controlId: string, channel: DeviceRow) => (findType(channel.type)?.roles ?? [])
    .map(([role]) => role)
    .filter((role) => role !== boundRole(channel, keyOf(controlId)))
    .map((role) => ({
      role,
      candidates: controls.filter((cell) =>
        cell.controlId !== controlId && CHANNEL_CLASSES[classifyCell(cell).cls].fits.includes(role)),
    }))
    .filter(({ candidates }) => candidates.length);

  return (
    <Card
      heading={deviceLabel(wb.id)}
      indicator={(
        <Button
          size="small"
          variant="danger"
          icon={<TrashIcon />}
          label={t('configurator.buttons.remove')}
          aria-label={t('configurator.buttons.remove-device')}
          aria-haspopup="dialog"
          onClick={() => onRemove(deviceLabel(wb.id))}
        />
      )}
    >
      <p className="configurator-status">
        {isLost ? t('configurator.labels.offline') : t('configurator.labels.online')}
      </p>
      {isLost && (
        <Alert variant="warn" size="small" className="configurator-alertInline">
          {t('configurator.labels.offline-text', { ...UNESCAPED, id: wb.id })}
        </Alert>
      )}
      {configuratorStore.mixed[wb.id] && (
        <Alert variant="info" size="small" className="configurator-alertInline">
          {t('configurator.labels.mixed-text')}
        </Alert>
      )}

      <AdapterSwitches target={wb} />

      <section className="configurator-section">
        <h3 className="configurator-sectionTitle">{t('configurator.labels.channels')}</h3>
        <p>
          {selectedCount
            ? t('configurator.labels.selected-of', { ...UNESCAPED, selected: selectedCount, total: typedRows.length })
            : t('configurator.labels.none-selected')}
        </p>
        <ul className="configurator-channels">
          {typedRows.map(({ controlId, cell, channel, classification, types }) => {
            const missing = channel ? rowServices(channel, keyOf(controlId)).missing : [];
            return (
              <li key={controlId} className="configurator-channel">
                <div className="configurator-channelHead">
                  <Checkbox
                    checked={!!channel}
                    title={cell?.name ?? controlId}
                    ariaLabel={t('configurator.labels.show-channel', { ...UNESCAPED, name: cell?.name ?? controlId })}
                    onChange={() => {
                      if (channel) {
                        configuratorStore.toggleChannel(wb, controlId);
                        return;
                      }
                      const type = isAmbiguousClass(classification.cls) ? '' : types[0];
                      configuratorStore.toggleChannel(wb, controlId, {
                        type,
                        name: defaultName(type, cell, classification.cls),
                        unit: classification.units,
                        bind: type ? { [primaryRole(type, classification.cls)]: keyOf(controlId) } : {},
                      });
                    }}
                  />
                  <span className="configurator-channelValue">{formatValue(cell)}</span>
                </div>
                {channel && (
                  <div className="configurator-channelBody">
                    <div className="configurator-fields">
                      <StringField
                        title={t('configurator.labels.name-in-apps')}
                        value={channel.name}
                        onChange={(name) => configuratorStore.updateRow(channel, { name: String(name) })}
                      />
                      <StringField
                        title={t('configurator.labels.group')}
                        value={channel.group}
                        placeholder={t('configurator.labels.no-group')}
                        onChange={(group) => configuratorStore.updateRow(channel, { group: String(group) })}
                      />
                      {hasUnit(channel.type) && (
                        <UnitField
                          value={channel.unit ?? ''}
                          onChange={(unit) => configuratorStore.updateRow(channel, { unit })}
                        />
                      )}
                    </div>
                    <TypeChoice
                      types={types}
                      value={channel.type}
                      ariaLabel={`${t('configurator.labels.type')}: ${channel.name}`}
                      onChange={(typeId) => changeType(channel, cell, controlId, typeId)}
                    />
                    {!isLost && extraRoles(controlId, channel).map(({ role, candidates }) => (
                      <OptionsField
                        key={role}
                        title={roleLabel(role)}
                        value={channel.bind[role] ? splitKey(channel.bind[role])[1] : ''}
                        options={[
                          { label: t('configurator.labels.none'), value: '' },
                          ...candidates.map((candidate) => ({ label: candidate.name, value: candidate.controlId })),
                        ]}
                        onChange={(value: string) =>
                          configuratorStore.bindRole(channel, role, value ? keyOf(value) : null)}
                      />
                    ))}
                    {!channel.type && (
                      <Alert variant="warn" size="small" className="configurator-alertInline">
                        {t('configurator.labels.type-required')}
                      </Alert>
                    )}
                    {!!missing.length && (
                      <Alert variant="warn" size="small" className="configurator-alertInline">
                        {t('configurator.labels.role-required', { ...UNESCAPED, role: roleLabel(missing[0]) })}
                      </Alert>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <UnsupportedChannels
          items={unsupportedRows.map(({ controlId, cell, classification }) => ({
            id: controlId, name: cell?.name ?? controlId, reason: whyText(classification),
          }))}
        />
      </section>
    </Card>
  );
});
