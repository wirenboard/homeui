import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { configuratorStore } from '@/stores/configurator';
import { devicesStore, DeviceType, type Cell } from '@/stores/devices';
import {
  buildConfig,
  defaultTypeForRole,
  draftsFromConfig,
  isReady,
  requiredRoles,
  resolveRange,
  typeById,
} from './build-config';
import { inferRole } from './infer';
import { roleDef } from './roles';
import { DEVICE_TYPES } from './templates';
import type { Config } from './types';
import './styles.css';

// Цели, которые устройство может отдавать (adapter_settings).
const ADAPTERS = [
  { key: 'matter', label: 'Matter' },
  { key: 'alice', label: 'Алиса' },
];

// Контрол подходит роли, если совпал вид и доступ (запись → нужен rw-контрол).
const matchesRole = (cell: Cell, role: string): boolean => {
  const def = roleDef(role);
  return inferRole(cell).kind === def.kind && (def.access === 'read' || !cell.readOnly);
};

const cellLabel = (cell: Cell): string => `${cell.name} — ${cell.deviceId}`;

// Роль по контролу неоднозначна, если /meta многозначно: range (какой уровень?), alarm,
// или value без единиц (общий числовой) — оператору стоит уточнить роль.
const AMBIGUOUS_TYPES = new Set(['range', 'alarm']);
const isAmbiguous = (cell: Cell): boolean =>
  AMBIGUOUS_TYPES.has(cell.type as string) || (cell.type === 'value' && !cell.units);

const ConfiguratorPage = observer(() => {
  const [typePick, setTypePick] = useState(DEVICE_TYPES[0].id);
  const [showSystem, setShowSystem] = useState(false);
  const [showVirtual, setShowVirtual] = useState(false);
  const [showBound, setShowBound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const importedRef = useRef(false);
  const [savedConfig, setSavedConfig] = useState<Config | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);

  const devices = Array.from(devicesStore.devices.values());
  const allCells = devices.flatMap((device) => devicesStore.getDeviceCells(device.id));
  const cellById = new Map(allCells.map((cell) => [cell.id, cell]));
  const cellByTopic = new Map(allCells.map((cell) => [cell.topic, cell.id]));

  // Проверяем, установлен ли бэкенд wb-converter-ext. Без него страница работает автономно
  // («собрать → Скопировать/Скачать YAML»): кнопку «Сохранить» и подгрузку не показываем.
  useEffect(() => {
    let cancelled = false;
    fetch('/converter-ext/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        if (!cancelled && status && typeof status.has_config === 'boolean') {
          setBackendAvailable(true);
        }
      })
      .catch(() => {
        // Бэкенд недоступен — остаёмся в автономном режиме.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Когда бэкенд есть — забираем ранее сохранённый на контроллере конфиг.
  useEffect(() => {
    if (!backendAvailable) {
      return;
    }
    let cancelled = false;
    fetch('/converter-ext/config')
      .then((response) => (response.ok ? response.text() : null))
      .then((text) => {
        if (cancelled || !text) {
          return;
        }
        try {
          const parsed = loadYaml(text) as Config;
          if (parsed && Array.isArray(parsed.devices)) {
            setSavedConfig(parsed);
          }
        } catch {
          // Битый файл не должен ломать открытие страницы.
        }
      })
      .catch(() => {
        // Сервис недоступен — просто открываемся с пустым конфигом.
      });
    return () => {
      cancelled = true;
    };
  }, [backendAvailable]);

  // Разворачиваем конфиг в черновики, когда контролы загрузились (иначе привязки не срослись бы).
  // Один раз и только если оператор ещё ничего не набрал, чтобы не затирать правки.
  useEffect(() => {
    if (importedRef.current || !savedConfig || configuratorStore.devices.length > 0 || allCells.length === 0) {
      return;
    }
    configuratorStore.setDevices(draftsFromConfig(savedConfig, cellByTopic));
    importedRef.current = true;
  }, [savedConfig, allCells.length]);

  const config = buildConfig(configuratorStore.devices, cellById);
  const configYaml = dumpYaml(config, { lineWidth: 120 });

  // Скрываем шум по источнику устройства (driver из /meta → device.type) и уже привязанные контролы.
  const boundCellIds = new Set(
    configuratorStore.devices.flatMap((device) => Object.values(device.bindings)),
  );
  const systemCount = devices.filter((device) => device.type === DeviceType.System).length;
  const virtualCount = devices.filter((device) => device.type === DeviceType.Virtual).length;
  const discoveryDevices = devices.filter((device) => {
    if (device.type === DeviceType.System) {
      return showSystem;
    }
    if (device.type === DeviceType.Virtual) {
      return showVirtual;
    }
    return true;
  });
  // Устройства с непустым списком контролов (после фильтра привязанных) — для показа и счётчиков.
  const shownDevices = discoveryDevices
    .map((device) => ({
      device,
      cells: devicesStore.getDeviceCells(device.id).filter((cell) => showBound || !boundCellIds.has(cell.id)),
    }))
    .filter((entry) => entry.cells.length > 0);
  const shownCellCount = shownDevices.reduce((sum, entry) => sum + entry.cells.length, 0);

  const typeLabel = (id: string) => typeById(id)?.name.ru ?? id;

  const handleAddDevice = () => {
    configuratorStore.addDevice(typePick, typeLabel(typePick));
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(configYaml);
  };

  const handleDownload = () => {
    const blob = new Blob([configYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wb-convention-config.yaml';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Браузер не может писать в файловую систему контроллера, поэтому конфиг сохраняет бэк:
  // POST на /converter-ext/config (проксируется nginx на сервис wb-converter-ext).
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const response = await fetch('/converter-ext/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/yaml' },
        body: configYaml,
      });
      if (response.ok) {
        const result = await response.json();
        setSaveStatus({ ok: true, text: `Сохранено на контроллере — устройств: ${result.device_count}` });
      } else {
        const detail = await response.text();
        setSaveStatus({ ok: false, text: `Ошибка ${response.status}: ${detail}` });
      }
    } catch (error) {
      setSaveStatus({ ok: false, text: `Не удалось связаться с сервисом: ${String(error)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Конфигуратор устройств (прототип)"
      hasRights={authStore.hasRights(UserRole.Operator)}
    >
      <p className="configurator-summary">
        Добавьте устройство (тип) и укажите, к какому <strong>физическому прибору</strong> оно
        относится — поле «Прибор». По нему адаптеры склеивают части одного прибора (у MSW
        температура, влажность и CO₂ — это разные устройства с одним прибором). Затем привяжите
        контролы к ролям.
      </p>

      <details className="configurator-discovery">
        <summary className="configurator-discovery-summary">
          <span className="configurator-discovery-summaryTitle">Обнаружено</span>
          <span className="configurator-discovery-summaryCount">
            {`${shownDevices.length} устройств · ${shownCellCount} контролов`}
          </span>
        </summary>

        <div className="configurator-discovery-filters">
          <label>
            <input type="checkbox" checked={showSystem} onChange={(event) => setShowSystem(event.target.checked)} />
            {`Служебные (${systemCount})`}
          </label>
          <label>
            <input type="checkbox" checked={showVirtual} onChange={(event) => setShowVirtual(event.target.checked)} />
            {`Виртуальные (${virtualCount})`}
          </label>
          <label>
            <input type="checkbox" checked={showBound} onChange={(event) => setShowBound(event.target.checked)} />
            {`Привязанные (${boundCellIds.size})`}
          </label>
        </div>

        {shownDevices.length === 0 && (
          <p className="configurator-empty">Нет устройств для показа (проверьте плашки выше).</p>
        )}
        {shownDevices.map(({ device, cells }) => (
          <details className="configurator-discovery-device" key={device.id}>
            <summary className="configurator-discovery-deviceHead">
              <span className="configurator-discovery-deviceName">{device.name}</span>
              <span className="configurator-discovery-deviceId">{device.id}</span>
              <span className="configurator-discovery-count">{`${cells.length} контролов`}</span>
            </summary>
            <ul className="configurator-discovery-cells">
              {cells.map((cell) => {
                const suggestion = inferRole(cell);
                const createType = defaultTypeForRole(suggestion.role);
                return (
                  <li className="configurator-discovery-cell" key={cell.id}>
                    <span className="configurator-discovery-cellName">{cell.name}</span>
                    <span className="configurator-discovery-role">{suggestion.role}</span>
                    {isAmbiguous(cell) && (
                      <span
                        className="configurator-discovery-ambiguous"
                        title="Роль неоднозначна — уточните при сборке"
                      >
                        ?
                      </span>
                    )}
                    {createType && (
                      <button
                        type="button"
                        className="configurator-discovery-add"
                        title={`Создать «${typeLabel(createType)}» из этого контрола`}
                        onClick={() => configuratorStore.addDeviceFromControl(
                          createType, suggestion.role, cell.id, device.id, cell.name,
                        )}
                      >
                        + устройство
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </details>

      <div className="configurator-layout">
        <div className="configurator-main">
          <div className="configurator-add">
            <select value={typePick} onChange={(event) => setTypePick(event.target.value)}>
              {DEVICE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.name.ru}</option>
              ))}
            </select>
            <button type="button" onClick={handleAddDevice}>+ Добавить устройство</button>
          </div>

          {configuratorStore.devices.length === 0 && (
            <p className="configurator-empty">Пока нет устройств. Добавьте по типу выше.</p>
          )}

          {configuratorStore.devices.map((device) => {
            const type = typeById(device.type);
            if (!type) {
              return null;
            }
            const ready = isReady(device, type);
            const required = requiredRoles(device, type);
            const moduleMissing = !device.module.trim();
            const invalid = !ready || moduleMissing;
            return (
              <section className={`configurator-device${invalid ? ' is-invalid' : ''}`} key={device.did}>
                <div className="configurator-deviceHead">
                  <span className="configurator-did">{`did ${device.did}`}</span>
                  <input
                    className="configurator-nameInput"
                    type="text"
                    placeholder="Имя устройства"
                    value={device.name}
                    onChange={(event) => configuratorStore.setName(device.did, event.target.value)}
                  />
                  <span className="configurator-deviceType">{`${type.name.ru} · ${type.id}`}</span>
                  <button type="button" onClick={() => configuratorStore.removeDevice(device.did)}>
                    Удалить
                  </button>
                </div>

                <div className="configurator-deviceMeta">
                  <label className={`configurator-field${moduleMissing ? ' is-missing' : ''}`}>
                    <span className="configurator-fieldLabel">
                      Прибор <span className="configurator-fieldHint">— физический прибор, обяз.</span>
                    </span>
                    <input
                      type="text"
                      placeholder="например: WB-MSW в ванной"
                      value={device.module}
                      onChange={(event) => configuratorStore.setModule(device.did, event.target.value)}
                    />
                  </label>
                  <label className="configurator-field">
                    <span className="configurator-fieldLabel">
                      Комната <span className="configurator-fieldHint">— опц.</span>
                    </span>
                    <input
                      type="text"
                      placeholder="например: Ванная"
                      value={device.area ?? ''}
                      onChange={(event) => configuratorStore.setArea(device.did, event.target.value)}
                    />
                  </label>
                  <span className="configurator-adapters">
                    {ADAPTERS.map((adapter) => (
                      <label key={adapter.key}>
                        <input
                          type="checkbox"
                          checked={Boolean(device.adapters[adapter.key])}
                          onChange={(event) =>
                            configuratorStore.setAdapter(device.did, adapter.key, event.target.checked)}
                        />
                        {adapter.label}
                      </label>
                    ))}
                  </span>
                </div>

                {moduleMissing && (
                  <p className="configurator-warn">⚠ Заполните поле «Прибор» — иначе устройство не экспортируется.</p>
                )}
                {!ready && (
                  <p className="configurator-warn">⚠ Заполните обязательные слоты — иначе не экспортируется.</p>
                )}

                <table className="configurator-table">
                  <thead>
                    <tr>
                      <th>Слот (роль)</th>
                      <th>вид</th>
                      <th>доступ</th>
                      <th>Контрол</th>
                    </tr>
                  </thead>
                  <tbody>
                    {type.slots.map((slot) => {
                      const def = roleDef(slot.role);
                      const matching = allCells.filter((cell) => matchesRole(cell, slot.role));
                      const others = allCells.filter((cell) => !matchesRole(cell, slot.role));
                      const value = device.bindings[slot.role] || '';
                      const isRequired = required.has(slot.role);
                      const missing = isRequired && !value;
                      const boundCell = value ? cellById.get(value) : undefined;
                      const effRange = boundCell && def.kind === 'level'
                        ? resolveRange(slot.role, boundCell, device.ranges[slot.role])
                        : undefined;
                      const applyRange = (field: 'min' | 'max' | 'step', raw: string) => {
                        const parsed = Number(raw);
                        if (!effRange || Number.isNaN(parsed)) {
                          return;
                        }
                        configuratorStore.setRange(device.did, slot.role, { ...effRange, [field]: parsed });
                      };
                      const handleBind = (cellId: string) => {
                        configuratorStore.bindSlot(device.did, slot.role, cellId);
                        const cell = cellId ? cellById.get(cellId) : undefined;
                        if (cell) {
                          configuratorStore.setModuleIfEmpty(device.did, cell.deviceId);
                        }
                      };
                      return (
                        <tr key={slot.role} className={missing ? 'is-missing' : ''}>
                          <td>
                            {slot.role}
                            {isRequired && <span className="configurator-req">*</span>}
                          </td>
                          <td>{def.kind}</td>
                          <td>{def.access === 'read' ? 'ro' : 'rw'}</td>
                          <td>
                            <select
                              className="configurator-slotSelect"
                              value={value}
                              onChange={(event) => handleBind(event.target.value)}
                            >
                              <option value="">— не выбрано —</option>
                              {matching.length > 0 && (
                                <optgroup label="Подходящие">
                                  {matching.map((cell) => (
                                    <option key={cell.id} value={cell.id}>{cellLabel(cell)}</option>
                                  ))}
                                </optgroup>
                              )}
                              {others.length > 0 && (
                                <optgroup label="Прочие">
                                  {others.map((cell) => (
                                    <option key={cell.id} value={cell.id}>{cellLabel(cell)}</option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            {effRange && (
                              <div className="configurator-range">
                                <label>
                                  <span>min</span>
                                  <input
                                    type="number"
                                    value={effRange.min}
                                    onChange={(event) => applyRange('min', event.target.value)}
                                  />
                                </label>
                                <label>
                                  <span>max</span>
                                  <input
                                    type="number"
                                    value={effRange.max}
                                    onChange={(event) => applyRange('max', event.target.value)}
                                  />
                                </label>
                                <label>
                                  <span>шаг</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={effRange.step}
                                    onChange={(event) => applyRange('step', event.target.value)}
                                  />
                                </label>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>

        <aside className="configurator-preview">
          <div className="configurator-previewHead">
            <h3>{`Конфиг — устройств: ${config.devices.length}`}</h3>
            <div className="configurator-actions">
              {backendAvailable && (
                <button
                  type="button"
                  className="configurator-saveButton"
                  disabled={config.devices.length === 0 || saving}
                  onClick={handleSave}
                >
                  {saving ? 'Сохранение…' : 'Сохранить на контроллер'}
                </button>
              )}
              <button type="button" disabled={config.devices.length === 0} onClick={handleCopy}>
                Скопировать
              </button>
              <button type="button" disabled={config.devices.length === 0} onClick={handleDownload}>
                Скачать YAML
              </button>
              <button
                type="button"
                disabled={configuratorStore.devices.length === 0}
                onClick={() => configuratorStore.clear()}
              >
                Очистить
              </button>
            </div>
            {saveStatus && (
              <p className={`configurator-saveStatus${saveStatus.ok ? ' is-ok' : ' is-error'}`}>
                {saveStatus.text}
              </p>
            )}
          </div>
          {config.devices.length === 0 ? (
            <p className="configurator-empty">Добавьте устройство, заполните поле «Прибор» и обязательные слоты.</p>
          ) : (
            <pre className="configurator-config">{configYaml}</pre>
          )}
        </aside>
      </div>
    </PageLayout>
  );
});

export default ConfiguratorPage;
