import { makeAutoObservable, when } from 'mobx';
import { devicesStore } from '@/stores/devices';
import { downloadFile } from '@/utils/donwload-file';
import { type ZabbixExportInput } from '@/utils/zabbix-template/types';
import { buildZabbixExport } from '@/utils/zabbix-template/yaml-builder';

const DRAFT_KEY = 'zabbix-export-draft';

interface ZabbixExportDraft {
  addedDevices: string[];
  excludedControls: string[];
}

export class ZabbixExportPageStore {
  public addedDevices: string[] = [];
  public excludedControls: Set<string> = new Set();
  // True while an export/save operation is in flight (guards against re-entry).
  public isProcessing = false;

  constructor() {
    this.loadDraft();
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // List of devices available in the picker. System devices are hidden by
  // default, matching the rest of the UI (devicesStore.filteredDevices).
  get availableDevices() {
    return Array.from(devicesStore.filteredDevices.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Devices not yet added, used to populate the picker.
  get pickerOptions() {
    return this.availableDevices
      .filter((device) => !this.addedDevices.includes(device.id))
      .map((device) => ({
        label: `${device.name} [${device.id}]`,
        value: device.id,
      }));
  }

  // The live device list briefly empties on every MQTT reconnect (cells are
  // dropped and re-added by devicesStore). Exporting in that window yields a
  // template with no items, so an added device with no live controls means the
  // store is still settling and we must not act yet.
  get isReady() {
    return this.addedDevices.every((deviceId) => devicesStore.getDeviceCells(deviceId).length > 0);
  }

  // Spinner/disabled state for the action buttons: either an export/save is
  // running, or the device list is still settling after a reconnect.
  get isLoading() {
    return this.isProcessing || !this.isReady;
  }

  isControlExcluded(cellId: string) {
    return this.excludedControls.has(cellId);
  }

  // Controls that will actually be exported for a device (pushbuttons are
  // write-only and never monitored). Drives the "keep at least one" guard.
  monitoredControlsCount(deviceId: string) {
    return devicesStore.getDeviceCells(deviceId)
      .filter((cell) => cell.type !== 'pushbutton' && !this.excludedControls.has(cell.id))
      .length;
  }

  addDevice(deviceId: string) {
    if (!deviceId || this.addedDevices.includes(deviceId)) {
      return;
    }
    this.addedDevices.push(deviceId);
  }

  removeDevice(deviceId: string) {
    this.addedDevices = this.addedDevices.filter((id) => id !== deviceId);
    for (const cellId of Array.from(this.excludedControls)) {
      if (cellId.startsWith(`${deviceId}/`)) {
        this.excludedControls.delete(cellId);
      }
    }
  }

  excludeControl(cellId: string) {
    const [deviceId] = cellId.split('/');
    // Keep at least one monitored control, otherwise the device drops out of
    // the export entirely (see buildInput's controls.length filter).
    if (this.monitoredControlsCount(deviceId) <= 1) {
      return;
    }
    this.excludedControls.add(cellId);
  }

  // Re-read live data: restores deleted controls of the device (and picks up new ones).
  refreshDevice(deviceId: string) {
    for (const cell of devicesStore.getDeviceCells(deviceId)) {
      this.excludedControls.delete(cell.id);
    }
  }

  private buildInput(): ZabbixExportInput {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    // Hyphen (not ':') between hours/minutes: a colon in the template name breaks
    // Zabbix trigger expressions and the downloaded file name.
    const templateDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
      + `${pad(now.getHours())}-${pad(now.getMinutes())}`;

    const devices = this.addedDevices
      .map((deviceId) => {
        const controls = devicesStore.getDeviceCells(deviceId)
          .filter((cell) => !this.excludedControls.has(cell.id))
          .map((cell) => ({
            // Cell.name follows the interface language and falls back to controlId.
            controlId: cell.controlId,
            name: cell.name,
            type: cell.type,
            units: cell.units,
          }));
        return { slug: deviceId, name: devicesStore.devices.get(deviceId)?.name ?? deviceId, controls };
      })
      .filter((device) => device.controls.length);

    return {
      templateDate,
      devices,
    };
  }

  // Wait out a transient empty device list before reading it. Falls through
  // after a timeout so a genuinely offline device can't block forever.
  private async ensureReady() {
    if (this.isReady) {
      return;
    }
    try {
      await when(() => this.isReady, { timeout: 7000 });
    } catch {
      // Timed out: the device list is still empty (e.g. disconnected). Proceed
      // with whatever is available rather than hanging on the button.
    }
  }

  private setProcessing(value: boolean) {
    this.isProcessing = value;
  }

  async export() {
    if (this.isProcessing) {
      return;
    }
    this.setProcessing(true);
    try {
      await this.ensureReady();
      const input = this.buildInput();
      const yaml = buildZabbixExport(input);
      const fileName = `Wiren Board export ${input.templateDate}.yaml`.replace(/ /g, '_');
      downloadFile(fileName, 'application/yaml', yaml);
    } finally {
      this.setProcessing(false);
    }
  }

  async save() {
    if (this.isProcessing) {
      return;
    }
    this.setProcessing(true);
    try {
      await this.ensureReady();
      const draft: ZabbixExportDraft = {
        addedDevices: this.addedDevices,
        excludedControls: Array.from(this.excludedControls),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } finally {
      this.setProcessing(false);
    }
  }

  private loadDraft() {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (!stored) {
        return;
      }
      const draft: ZabbixExportDraft = JSON.parse(stored);
      this.addedDevices = Array.isArray(draft.addedDevices) ? draft.addedDevices : [];
      this.excludedControls = new Set(Array.isArray(draft.excludedControls) ? draft.excludedControls : []);
    } catch (error) {
      console.warn('Failed to load Zabbix export draft:', error);
    }
  }
}
