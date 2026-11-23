import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { Tag } from '@/components/tag';
import {
  CHANNEL_CLASSES, configuratorStore, findType, hasUnit, primaryRole, recipeModels, recipeModelTitle, recipeRows,
  recipeSkipped, recipeSplit, splitKey, topicOf, type NewDeviceRow, type RecipeFit,
} from '@/stores/configurator';
import type { WbControl, WbDialogProps, WbUnit } from '../types';
import {
  classifyCell, controlMeta, deviceControls, deviceTitle, formatValue, isModbusDevice, listDevices, recipeRowName,
  TYPE_ICONS, typeName, UNESCAPED,
} from '../utils';
import { TypeChoice } from './type-choice';

export const WbDialog = observer(({ isOpened, onClose, onAdded }: WbDialogProps) => {
  const { t } = useTranslation();
  // Модель, открытая на втором этапе; null — этап с плитками моделей.
  const [model, setModel] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  const open = (title: string | null) => {
    setModel(title);
    setSkipped([]);
    setTypes({});
    setNames({});
  };

  useEffect(() => {
    if (isOpened) {
      open(null);
    }
  }, [isOpened]);

  const devices = listDevices(false).map((id) => {
    const cells = deviceControls(id);
    const controlIds = cells.map((cell) => cell.controlId);
    const serial = configuratorStore.serialDevices[id];
    const cellOf = (row: NewDeviceRow) => cells.find((cell) => cell.id === row.bind[primaryRole(row.type)]);
    // Заряд батареи каталог относит к роли «батарея», но как числовое показание он тоже годится.
    const isFit: RecipeFit = (controlId, role) => {
      const { cls } = classifyCell(cells.find((item) => item.controlId === controlId));
      return CHANNEL_CLASSES[cls].fits.includes(role) || (role === 'number' && cls === 'battery');
    };
    const items = (recipeRows(id, controlIds, configuratorStore.usedKeys, isFit, serial) ?? []).map((item) => {
      const cell = cellOf(item.row);
      // У числового датчика имя и единицы берутся от самого контрола.
      const row: NewDeviceRow = {
        ...item.row,
        name: item.byControl || hasUnit(item.row.type) ? cell.name : recipeRowName(item),
        ...(hasUnit(item.row.type) ? { unit: controlMeta(cell).units } : {}),
      };
      return { ...item, row, choices: CHANNEL_CLASSES[classifyCell(cell).cls].types };
    });
    const controlsOf = (row: NewDeviceRow): WbControl[] => Object.values(row.bind).map((key) => {
      const cell = cells.find((item) => item.id === key);
      return { name: cell?.name ?? key, value: formatValue(cell), topic: topicOf(...splitKey(key)) };
    });
    const split = recipeSplit(id, serial);
    const units: WbUnit[] = [];
    items.forEach((item, at) => {
      const key = split === 'index' ? `${id}#${item.index}` : `${id}#row${at}`;
      const unit = split && units.find((other) => other.key === key);
      if (unit) {
        unit.rows.push(item.row);
        unit.controls.push(...controlsOf(item.row));
        unit.choices = [];
      } else if (split || !units.length) {
        const label = split === 'index'
          ? t('configurator.labels.recipe-channel', { index: item.index })
          : item.row.name;
        units.push({
          key: split ? key : id,
          name: split ? `${deviceTitle(id)} · ${label}` : deviceTitle(id),
          label: split ? label : deviceTitle(id),
          rows: [item.row],
          controls: controlsOf(item.row),
          // Тип можно менять, только пока в строке один канал с несколькими подходящими типами.
          choices: split && item.choices.includes(item.row.type) ? item.choices : [],
          suggest: item.suggest,
        });
      } else {
        units[0].rows.push(item.row);
        units[0].controls.push(...controlsOf(item.row));
      }
    });
    return {
      id, units, model: recipeModelTitle(id, serial), skipped: recipeSkipped(id, controlIds, serial),
    };
  });

  const found = devices.filter(({ units }) => units.length);
  const models = Array.from(new Set(found.map((device) => device.model)));
  const unsupported = devices.filter((device) => !device.model && isModbusDevice(device.id));
  const absent = recipeModels().filter(({ title }) => !devices.some((device) => device.model === title));
  const opened = found.filter((device) => device.model === model);
  const chosen = opened.flatMap(({ units }) => units).filter(({ key }) => !skipped.includes(key));
  const typeOf = (unit: WbUnit) => types[unit.key] ?? unit.suggest ?? unit.rows[0].type;
  const nameOf = (unit: WbUnit) => (names[unit.key] ?? unit.name).trim();
  // Имя занято другой карточкой или другой отмеченной строкой; пустое тоже не годится.
  const taken = new Set(configuratorStore.devices.map((device) => device.name.trim().toLowerCase()));
  const isBadName = (unit: WbUnit) => !nameOf(unit) || taken.has(nameOf(unit).toLowerCase())
    || chosen.some((other) => other !== unit && nameOf(other).toLowerCase() === nameOf(unit).toLowerCase());

  // Строка под выбранный тип: привязки ролей, которых у типа нет, отбрасываются.
  const typed = (row: NewDeviceRow, type: string): NewDeviceRow => ({
    ...row,
    type,
    bind: Object.fromEntries(findType(type).roles
      .filter(([role]) => row.bind[role])
      .map(([role]) => [role, row.bind[role]])),
  });

  const create = () => {
    const created = chosen.map((unit) => configuratorStore.addDevice(
      nameOf(unit),
      unit.choices.length ? [typed(unit.rows[0], typeOf(unit))] : unit.rows,
    ));
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
      className="configurator-addDialog"
      isOpened={isOpened}
      heading={model ?? t('configurator.labels.wb-title')}
      width={640}
      onClose={onClose}
    >
      {model ? (
        <div className="configurator-addNew configurator-wbSections">
          <p>{t('configurator.labels.wb-step-hint')}</p>
          {opened.map(({ id, units, skipped: curtains }) => (
            <section key={id}>
              <h3 className="configurator-sectionTitle">{deviceTitle(id)}</h3>
              <ul className="configurator-channels">
                {units.map((unit) => (
                  <li key={unit.key} className="configurator-channel">
                    <div className="configurator-channelHead">
                      <Checkbox
                        checked={!skipped.includes(unit.key)}
                        ariaLabel={unit.label}
                        onChange={(checked) => {
                          setSkipped(checked ? skipped.filter((key) => key !== unit.key) : [...skipped, unit.key]);
                        }}
                      />
                      <Input
                        className="configurator-wbName"
                        value={names[unit.key] ?? unit.name}
                        ariaLabel={t('configurator.labels.wb-name', { ...UNESCAPED, label: unit.label })}
                        isInvalid={!skipped.includes(unit.key) && isBadName(unit)}
                        isFullWidth
                        onChange={(value) => setNames({ ...names, [unit.key]: String(value) })}
                      />
                      <span className="configurator-wbModelIcons" aria-hidden="true">
                        {icons(unit.choices.length ? [typeOf(unit)] : unit.rows.map((row) => row.type))}
                      </span>
                    </div>
                    {unit.choices.length > 1 && (
                      <TypeChoice
                        types={unit.choices}
                        value={typeOf(unit)}
                        ariaLabel={`${t('configurator.labels.type')}: ${unit.name}`}
                        onChange={(typeId) => setTypes({ ...types, [unit.key]: typeId })}
                      />
                    )}
                    <p className="configurator-adapterNote">
                      {unit.controls.map((control, at) => (
                        <span key={control.topic} title={control.topic}>
                          {at > 0 && ', '}
                          {`${control.name} · ${control.value}`}
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
              {!!curtains && (
                <p className="configurator-adapterNote">
                  {t('configurator.labels.wb-curtains', { count: curtains })}
                </p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="configurator-addNew configurator-wbSections">
          <p>{t(found.length ? 'configurator.labels.wb-legend' : 'configurator.labels.wb-none')}</p>
          <ul className="configurator-wbModels">
            {models.map((title) => {
              const same = found.filter((device) => device.model === title);
              return (
                <li key={title}>
                  <button
                    type="button"
                    className="configurator-wbModel configurator-wbModelFound"
                    aria-label={t('configurator.labels.wb-open', { ...UNESCAPED, title, count: same.length })}
                    onClick={() => open(title)}
                  >
                    <span className="configurator-wbModelIcons" aria-hidden="true">
                      {icons(same.flatMap(({ units }) => units).flatMap(({ rows }) => rows.map((row) => row.type)))}
                      <span className="configurator-wbCount">{same.length}</span>
                    </span>
                    <span className="configurator-listTitle">{title}</span>
                  </button>
                </li>
              );
            })}
            {absent.map(({ title, types: rowTypes, count }) => (
              <li key={title} className="configurator-wbModel configurator-wbModelAbsent">
                <span className="configurator-wbModelIcons" aria-hidden="true">
                  {icons(rowTypes)}
                  {count > 1 && `× ${count}`}
                </span>
                <span className="configurator-listTitle">{title}</span>
                <span className="sr-only">
                  {rowTypes.map(typeName).join(', ')}
                  {count > 1 && ` × ${count}`}
                </span>
              </li>
            ))}
          </ul>

          {!!unsupported.length && (
            <section>
              <h3 className="configurator-sectionTitle">{t('configurator.labels.wb-unsupported')}</h3>
              <div className="configurator-wbTags">
                {unsupported.map(({ id }) => <Tag key={id} variant="gray">{deviceTitle(id)}</Tag>)}
              </div>
            </section>
          )}
        </div>
      )}
      <footer className="configurator-dialogFooter">
        <span>
          {model && t('configurator.labels.wb-create-count', { ...UNESCAPED, count: chosen.length })}
        </span>
        <Button variant="secondary" label={t('modal.labels.cancel')} onClick={onClose} />
        {model && (
          <>
            <Button
              variant="secondary"
              label={t('configurator.buttons.wb-back')}
              onClick={() => open(null)}
            />
            <Button
              label={t('configurator.buttons.create-devices')}
              disabled={!chosen.length || chosen.some(isBadName)}
              onClick={create}
            />
          </>
        )}
      </footer>
    </Dialog>
  );
});
