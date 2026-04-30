import { makeAutoObservable, runInAction } from 'mobx';
import type { AppItem, AppStatus, PackageSource, DiskInfo } from './types';

const DEFAULT_SOURCES: PackageSource[] = [
  {
    id: 'wb-stable',
    name: 'Wiren Board · stable',
    url: 'https://deb.wirenboard.com/ stable main',
    enabled: true,
    builtin: true,
  },
  {
    id: 'wb-testing',
    name: 'Wiren Board · testing',
    url: 'https://deb.wirenboard.com/ testing main',
    enabled: false,
    builtin: true,
  },
  {
    id: 'community',
    name: 'Community Apps',
    url: 'https://wirenboard.community/repo stable main',
    enabled: true,
  },
];

const SEED: AppItem[] = [
  {
    id: 'ha-bridge',
    name: 'Home Assistant Bridge',
    shortDescription: 'MQTT Discovery, импорт устройств и синхронизация состояний с Home Assistant.',
    description:
      'Двунаправленная интеграция Wiren Board ↔ Home Assistant. Автоматически публикует все устройства контроллера через MQTT Discovery, поддерживает группы, сцены и команды обратно из HA в wb-mqtt.',
    category: 'integrations',
    source: 'official',
    author: 'Wiren Board',
    installedVersion: '2.3.1',
    latestVersion: '2.4.0',
    size: '62 МБ',
    sizeMb: 62,
    status: 'update_available',
    iconText: 'HA',
    iconColor: 'red',
    featured: true,
    autostart: true,
    autoupdate: false,
    versionHistory: [
      { version: '2.4.0', date: '2026-04-12', notes: 'Поддержка climate.preset_mode, фиксы MQTT discovery.' },
      { version: '2.3.1', date: '2026-02-08', notes: 'Текущая. Исправлен ретеншн состояний при рестарте.' },
      { version: '2.3.0', date: '2026-01-15', notes: 'Группы и сцены, новый формат конфига.' },
      { version: '2.2.4', date: '2025-11-22', notes: 'Стабилизация подключения к HA Core 2025.11.' },
    ],
    relations: {
      requires: ['mosquitto'],
      recommends: ['ha-core'],
      worksWith: ['ha-core'],
    },
  },
  {
    id: 'zigbee2mqtt',
    name: 'Zigbee2MQTT',
    shortDescription: 'Поддержка Zigbee-устройств через USB-стик.',
    description: 'Интегрирует Zigbee-устройства в дерево wb-mqtt через USB-координатор.',
    category: 'drivers',
    source: 'community',
    author: 'Koenkk',
    installedVersion: '1.34.0',
    latestVersion: '1.35.1',
    size: '180 МБ',
    sizeMb: 180,
    status: 'update_available',
    iconText: 'Z2',
    iconColor: 'blue',
    autostart: true,
    versionHistory: [
      { version: '1.35.1', date: '2026-04-20', notes: 'Поддержка новых устройств Aqara, фикс совместимости с zigbee-herdsman.' },
      { version: '1.34.0', date: '2026-02-01', notes: 'Текущая. Группы Zigbee 3.0, оптимизация трафика.' },
      { version: '1.33.2', date: '2025-12-10' },
    ],
    relations: {
      requires: ['mosquitto'],
      conflicts: ['deconz'],
    },
  },
  {
    id: 'node-red',
    name: 'Node-RED',
    shortDescription: 'Визуальный конструктор сценариев с нодами для wb-mqtt.',
    description: 'Графический редактор автоматизаций. Включает готовые ноды для работы с топиками wb-mqtt.',
    category: 'automation',
    source: 'community',
    author: 'OpenJS Foundation',
    installedVersion: '3.1.0',
    latestVersion: '3.1.9',
    size: '95 МБ',
    sizeMb: 95,
    status: 'update_available',
    iconText: 'NR',
    iconColor: 'green',
    autostart: true,
    versionHistory: [
      { version: '3.1.9', date: '2026-04-05', notes: 'Security-фикс, обновление зависимостей.' },
      { version: '3.1.0', date: '2025-09-30', notes: 'Текущая. Большое обновление редактора.' },
      { version: '3.0.2', date: '2025-04-18' },
    ],
  },
  {
    id: 'alice',
    name: 'Яндекс.Алиса',
    shortDescription: 'Голосовое управление через Умный Дом Яндекса.',
    description: 'OAuth-привязка контроллера к УДЯ, автогенерация умных устройств и комнат.',
    category: 'integrations',
    source: 'official',
    author: 'Wiren Board',
    latestVersion: '1.6.0',
    size: '12 МБ',
    sizeMb: 12,
    status: 'not_installed',
    iconText: 'YA',
    iconColor: 'blue',
    featured: true,
  },
  {
    id: 'telegram-notify',
    name: 'Telegram Notify',
    shortDescription: 'Push-уведомления и команды боту прямо из wb-rules.',
    description: 'Лёгкий сервис для отправки сообщений в Telegram и приёма команд от бота.',
    category: 'integrations',
    source: 'community',
    author: '@ivan',
    latestVersion: '0.9.2',
    size: '4 МБ',
    sizeMb: 4,
    status: 'not_installed',
    iconText: 'TG',
    iconColor: 'blue',
  },
  {
    id: 'modbus-templates',
    name: 'Modbus Templates Pack',
    shortDescription: '180+ шаблонов сторонних счётчиков и контроллеров.',
    description: 'Расширенный пак device-templates: счётчики энергии, преобразователи, контроллеры от сторонних производителей.',
    category: 'drivers',
    source: 'official',
    author: 'Wiren Board',
    installedVersion: '24.04',
    latestVersion: '24.04',
    size: '8 МБ',
    sizeMb: 8,
    status: 'installed',
    iconText: 'MB',
    iconColor: 'yellow',
    autostart: true,
  },
  {
    id: 'grafana',
    name: 'Grafana',
    shortDescription: 'Графики и дашборды поверх собранных данных.',
    description: 'Локальный экземпляр Grafana, доступный на :3000. Источники данных — InfluxDB, Prometheus.',
    category: 'monitoring',
    source: 'community',
    author: 'Grafana Labs',
    latestVersion: '10.4.2',
    size: '210 МБ',
    sizeMb: 210,
    status: 'not_installed',
    iconText: 'GR',
    iconColor: 'green',
    relations: {
      recommends: ['influxdb'],
      worksWith: ['influxdb'],
    },
  },
  {
    id: 'influxdb',
    name: 'InfluxDB 2',
    shortDescription: 'Локальная time-series БД для топиков MQTT.',
    description: 'Автоматическая запись MQTT-топиков в InfluxDB с настраиваемой ретенцией.',
    category: 'monitoring',
    source: 'community',
    author: 'InfluxData',
    latestVersion: '2.7.6',
    size: '160 МБ',
    sizeMb: 160,
    status: 'not_installed',
    iconText: 'IN',
    iconColor: 'blue',
  },
  {
    id: 'wireguard',
    name: 'WireGuard VPN',
    shortDescription: 'Удалённый доступ к контроллеру по защищённому туннелю.',
    description: 'WireGuard-сервер и клиент с UI для генерации ключей пользователей.',
    category: 'network',
    source: 'official',
    author: 'Wiren Board',
    installedVersion: '1.0.20',
    latestVersion: '1.0.20',
    size: '6 МБ',
    sizeMb: 6,
    status: 'installed',
    iconText: 'WG',
    iconColor: 'gray',
    autostart: true,
    versionHistory: [
      { version: '1.0.20', date: '2026-03-01', notes: 'Текущая. Стабильный релиз.' },
      { version: '1.0.19', date: '2025-12-14' },
    ],
  },
  {
    id: 'backup',
    name: 'Backup & Restore',
    shortDescription: 'Резервные копии конфигов и БД на USB / S3 / по расписанию.',
    description: 'Создание и восстановление бэкапов: конфиги, сценарии, дашборды, база wb-mqtt-db.',
    category: 'system',
    source: 'official',
    author: 'Wiren Board',
    latestVersion: '0.5.0',
    size: '3 МБ',
    sizeMb: 3,
    status: 'not_installed',
    iconText: 'BK',
    iconColor: 'red',
  },
  {
    id: 'dashboard-boiler',
    name: 'Dashboard Pack «Котельная»',
    shortDescription: 'Готовые виджеты и мнемосхемы для типовой котельной.',
    description: 'Набор SVG-дашбордов и сценариев для управления котельной: ИТП, насосы, резервирование.',
    category: 'ui',
    source: 'community',
    author: '@petrov',
    latestVersion: '1.2.0',
    size: '2 МБ',
    sizeMb: 2,
    status: 'not_installed',
    iconText: 'DB',
    iconColor: 'yellow',
  },
  {
    id: 'modbus-master',
    name: 'Modbus Master Bridge',
    shortDescription: 'Modbus-RTU ↔ Modbus-TCP проксирование с отладочным логом.',
    description: 'Преобразование Modbus-RTU в Modbus-TCP для интеграции внешних SCADA.',
    category: 'network',
    source: 'official',
    author: 'Wiren Board',
    latestVersion: '2.1.0',
    size: '5 МБ',
    sizeMb: 5,
    status: 'not_installed',
    iconText: 'MD',
    iconColor: 'blue',
  },
  {
    id: 'ha-core',
    name: 'Home Assistant Core',
    shortDescription: 'Локальный экземпляр Home Assistant с веб-интерфейсом.',
    description:
      'Полнофункциональный сервер Home Assistant, работающий прямо на контроллере. Веб-интерфейс на :8123, поддержка интеграций, автоматизаций и Lovelace.',
    category: 'integrations',
    source: 'community',
    author: 'Home Assistant',
    latestVersion: '2026.4.1',
    size: '420 МБ',
    sizeMb: 420,
    status: 'not_installed',
    iconText: 'HC',
    iconColor: 'red',
    relations: {
      recommends: ['mosquitto', 'ha-bridge'],
    },
  },
  {
    id: 'mosquitto',
    name: 'Mosquitto MQTT Broker',
    shortDescription: 'Дополнительный MQTT-брокер уровня системы.',
    description: 'Eclipse Mosquitto — лёгкий MQTT-брокер. Используется как альтернатива встроенному wb-mqtt-broker для интеграций.',
    category: 'system',
    source: 'official',
    author: 'Eclipse Foundation',
    installedVersion: '2.0.18',
    latestVersion: '2.0.18',
    size: '8 МБ',
    sizeMb: 8,
    status: 'installed',
    iconText: 'MQ',
    iconColor: 'gray',
    autostart: true,
  },
  {
    id: 'deconz',
    name: 'deCONZ',
    shortDescription: 'Альтернативный Zigbee-стек на базе ConBee/RaspBee.',
    description: 'Zigbee-демон от dresden elektronik. Работает с координаторами ConBee/RaspBee, конфликтует с Zigbee2MQTT.',
    category: 'drivers',
    source: 'community',
    author: 'dresden elektronik',
    latestVersion: '2.27.6',
    size: '85 МБ',
    sizeMb: 85,
    status: 'not_installed',
    iconText: 'DC',
    iconColor: 'yellow',
    relations: {
      conflicts: ['zigbee2mqtt'],
    },
  },
  {
    id: 'bundle-ha-starter',
    name: 'Стартовый набор: Home Assistant',
    shortDescription: 'Готовый сетап: HA Core + Bridge для wb-mqtt + Mosquitto одним кликом.',
    description:
      'Мета-пакет, который последовательно установит и настроит Home Assistant Core, мост HA-WB и брокер Mosquitto. Удобно для быстрого старта.',
    category: 'integrations',
    source: 'official',
    author: 'Wiren Board',
    latestVersion: '1.0.0',
    size: '690 МБ',
    sizeMb: 690,
    status: 'not_installed',
    iconText: 'ST',
    iconColor: 'green',
    kind: 'bundle',
    includes: ['ha-core', 'ha-bridge', 'mosquitto'],
    featured: true,
  },
];

export class AppsStore {
  public apps: AppItem[] = SEED.map((a) => ({ ...a }));
  public selectedId: string | null = null;
  public installingProgress = 0;
  public sources: PackageSource[] = DEFAULT_SOURCES.map((s) => ({ ...s }));
  public disk: DiskInfo = { freeMb: 1840, totalMb: 4096 };
  public bulkUpdating = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get selected(): AppItem | undefined {
    return this.apps.find((a) => a.id === this.selectedId);
  }

  get updatesCount(): number {
    return this.apps.filter((a) => a.status === 'update_available').length;
  }

  get installedCount(): number {
    return this.apps.filter((a) => a.status === 'installed' || a.status === 'update_available').length;
  }

  get installedSizeMb(): number {
    return this.apps
      .filter((a) => a.status === 'installed' || a.status === 'update_available')
      .reduce((sum, a) => sum + (a.sizeMb || 0), 0);
  }

  select(id: string | null) {
    this.selectedId = id;
  }

  #setStatus(id: string, status: AppStatus) {
    runInAction(() => {
      const app = this.apps.find((a) => a.id === id);
      if (app) {
        app.status = status;
        if (status === 'installed') {
          app.installedVersion = app.latestVersion;
        }
        if (status === 'not_installed') {
          app.installedVersion = undefined;
        }
        if (status === 'installing') {
          app.lastResult = undefined;
          app.lastMessage = undefined;
        }
      }
    });
  }

  #setResult(id: string, result: 'success' | 'error', message: string) {
    runInAction(() => {
      const app = this.apps.find((a) => a.id === id);
      if (app) {
        app.lastResult = result;
        app.lastMessage = message;
      }
    });
  }

  async install(id: string) {
    this.#setStatus(id, 'installing');
    await this.#fakeDelay();
    this.#setStatus(id, 'installed');
    this.#setResult(id, 'success', 'Приложение установлено.');
  }

  async update(id: string) {
    this.#setStatus(id, 'installing');
    await this.#fakeDelay();
    this.#setStatus(id, 'installed');
    this.#setResult(id, 'success', 'Обновление установлено.');
  }

  async uninstall(id: string) {
    this.#setStatus(id, 'installing');
    await this.#fakeDelay(600);
    this.#setStatus(id, 'not_installed');
    this.#setResult(id, 'success', 'Приложение удалено.');
  }

  toggleAutostart(id: string) {
    runInAction(() => {
      const app = this.apps.find((a) => a.id === id);
      if (app) app.autostart = !app.autostart;
    });
  }

  toggleAutoupdate(id: string) {
    runInAction(() => {
      const app = this.apps.find((a) => a.id === id);
      if (app) app.autoupdate = !app.autoupdate;
    });
  }

  async rollback(id: string, version: string) {
    this.#setStatus(id, 'installing');
    await this.#fakeDelay();
    runInAction(() => {
      const app = this.apps.find((a) => a.id === id);
      if (app) {
        app.installedVersion = version;
        app.status = version === app.latestVersion ? 'installed' : 'update_available';
        app.lastResult = 'success';
        app.lastMessage = `Откат до версии ${version} выполнен.`;
      }
    });
  }

  async updateAll() {
    if (this.bulkUpdating) return;
    runInAction(() => { this.bulkUpdating = true; });
    const ids = this.apps.filter((a) => a.status === 'update_available').map((a) => a.id);
    for (const id of ids) {
      await this.update(id);
    }
    runInAction(() => { this.bulkUpdating = false; });
  }

  toggleSource(id: string) {
    runInAction(() => {
      const src = this.sources.find((s) => s.id === id);
      if (src) src.enabled = !src.enabled;
    });
  }

  addSource(name: string, url: string) {
    runInAction(() => {
      this.sources.push({
        id: `custom-${Date.now()}`,
        name: name.trim() || url,
        url: url.trim(),
        enabled: true,
      });
    });
  }

  removeSource(id: string) {
    runInAction(() => {
      this.sources = this.sources.filter((s) => s.id !== id || s.builtin);
    });
  }

  #fakeDelay(ms = 1200) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  getById(id: string): AppItem | undefined {
    return this.apps.find((a) => a.id === id);
  }

  isInstalled(id: string): boolean {
    const a = this.getById(id);
    return !!a && (a.status === 'installed' || a.status === 'update_available');
  }

  /** Список requires, которые ещё не установлены. */
  missingRequires(id: string): AppItem[] {
    const app = this.getById(id);
    if (!app?.relations?.requires) return [];
    return app.relations.requires
      .map((rid) => this.getById(rid))
      .filter((a): a is AppItem => !!a && !this.isInstalled(a.id));
  }

  /** Установленные конфликтующие приложения. */
  activeConflicts(id: string): AppItem[] {
    const app = this.getById(id);
    if (!app?.relations?.conflicts) return [];
    return app.relations.conflicts
      .map((cid) => this.getById(cid))
      .filter((a): a is AppItem => !!a && this.isInstalled(a.id));
  }

  /** Recommends, которые ещё не установлены — кандидаты для пред-установочного диалога. */
  pendingRecommends(id: string): AppItem[] {
    const app = this.getById(id);
    if (!app?.relations?.recommends) return [];
    return app.relations.recommends
      .map((rid) => this.getById(rid))
      .filter((a): a is AppItem => !!a && !this.isInstalled(a.id));
  }

  /** Установка с тягой зависимостей. extraIds — выбранные пользователем recommends/includes. */
  async installWithDeps(id: string, extraIds: string[] = []) {
    const app = this.getById(id);
    if (!app) return;

    if (this.activeConflicts(id).length > 0) {
      this.#setResult(id, 'error', 'Установка невозможна: есть конфликтующие приложения.');
      return;
    }

    const queue: string[] = [];
    const seen = new Set<string>();
    const push = (xid: string) => {
      if (seen.has(xid) || this.isInstalled(xid)) return;
      seen.add(xid);
      queue.push(xid);
    };

    // requires первым приоритетом
    this.missingRequires(id).forEach((r) => push(r.id));
    // выбранные пользователем (recommends или bundle includes)
    extraIds.forEach(push);
    // сам пакет — последним, кроме случая bundle без основного бинаря
    if (app.kind !== 'bundle') push(id);

    for (const qid of queue) {
      await this.install(qid);
    }

    if (app.kind === 'bundle') {
      // bundle сам помечается установленным после успеха всех вложенных
      runInAction(() => {
        app.status = 'installed';
        app.installedVersion = app.latestVersion;
        app.lastResult = 'success';
        app.lastMessage = `Набор «${app.name}» установлен.`;
      });
    }
  }
}

export const appsStore = new AppsStore();
