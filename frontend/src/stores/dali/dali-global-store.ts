import { action, makeObservable, observable } from 'mobx';
import i18n from '@/i18n/config';
import { registerBusTab } from '@/pages/settings/configs/dali/components/bus-monitor';
import { daliProxy, mqttClient } from '@/services';
import { consolePanelStore } from '@/stores/console-panel';
import { busTabId } from './bus-tab-id';
import { MonitorStore } from './monitor-store';
import type { EnableOptions, Gateway, MonitorRecord } from './types';

const buildLabel = (gatewayName: string, busIndex: number) =>
  `${gatewayName} / ${i18n.t('dali.labels.bus', { num: busIndex })}`;

export class DaliGlobalStore {
  public enabledBusIds = new Set<string>();

  private monitors: Map<string, MonitorRecord> = new Map();
  private inflightRefresh: Promise<Gateway[]> | null = null;

  constructor() {
    makeObservable(this, {
      enabledBusIds: observable,
      enable: action,
      disable: action,
      updateLabel: action,
    });
  }

  /** Fetches the gateway list and reconciles monitors; concurrent calls share one request. */
  async refresh(): Promise<Gateway[]> {
    if (this.inflightRefresh) {
      return this.inflightRefresh;
    }
    const promise = (async () => {
      await mqttClient.whenConnected();
      const gateways = await daliProxy.GetList();
      this.reconcile(gateways);
      return gateways;
    })();
    this.inflightRefresh = promise;
    try {
      return await promise;
    } finally {
      this.inflightRefresh = null;
    }
  }

  /**
   * Tears down all monitor tabs and MQTT subscriptions. Called on logout so the
   * next user does not inherit the previous session's bus-monitor tabs (the store
   * is a module-level singleton, not reset by SPA navigation between login/logout).
   */
  reset() {
    Array.from(this.monitors.keys()).forEach((busId) => this.disable(busId));
  }

  enable(busId: string, { gatewayName, busIndex, autoShow }: EnableOptions) {
    let record = this.monitors.get(busId);
    if (!record) {
      const newRecord: MonitorRecord = {
        monitorStore: new MonitorStore(),
        gatewayName,
        busIndex,
        shownOnce: false,
      };
      record = newRecord;
      this.monitors.set(busId, newRecord);
      registerBusTab({
        busId,
        monitorStore: newRecord.monitorStore,
        // `newRecord` is mutated in place by updateLabel/reconcile, so reading it
        // directly always reflects the current gateway name / bus index.
        getLabel: () => buildLabel(newRecord.gatewayName, newRecord.busIndex),
        onClose: () => {
          // Close optimistically; if persisting the disabled flag fails the backend
          // stays enabled, so revert (re-register + re-subscribe) to keep the UI in
          // sync with persisted state instead of the next reconcile bringing it back.
          this.disable(busId);
          daliProxy.SetBus({ busId, config: { bus_monitor_enabled: false } })
            .catch((err) => {
              console.warn(`Failed to disable bus monitor for ${busId}`, err);
              this.enable(busId, {
                gatewayName: newRecord.gatewayName,
                busIndex: newRecord.busIndex,
                autoShow: true,
              });
            });
        },
      });
    } else {
      record.gatewayName = gatewayName;
      record.busIndex = busIndex;
    }
    this.enabledBusIds.add(busId);
    record.monitorStore.enableMonitoring(busId);
    this.syncTabLabel(busId);
    if (autoShow && !record.shownOnce) {
      consolePanelStore.show(busTabId(busId));
      record.shownOnce = true;
    }
  }

  disable(busId: string) {
    const record = this.monitors.get(busId);
    if (!record) {
      return;
    }
    record.monitorStore.disableMonitoring();
    consolePanelStore.unregisterTab(busTabId(busId), { silent: true });
    this.enabledBusIds.delete(busId);
    this.monitors.delete(busId);
  }

  get(busId: string): MonitorStore | undefined {
    return this.monitors.get(busId)?.monitorStore;
  }

  updateLabel(busId: string, { gatewayName, busIndex }: { gatewayName?: string; busIndex?: number }) {
    const record = this.monitors.get(busId);
    if (!record) {
      return;
    }
    if (gatewayName !== undefined) {
      record.gatewayName = gatewayName;
    }
    if (busIndex !== undefined) {
      record.busIndex = busIndex;
    }
    this.syncTabLabel(busId);
  }

  /**
   * Persists the bus_monitor_enabled flag, then creates or tears down the
   * monitor + console tab. Throws if the backend write fails — the toggle reads
   * its state from isMonitorEnabled, so a failed write leaves it unchanged.
   */
  async setBusMonitorEnabled(
    busId: string,
    value: boolean,
    { gatewayName, busIndex }: { gatewayName: string; busIndex: number },
  ) {
    await daliProxy.SetBus({ busId, config: { bus_monitor_enabled: value } });
    if (value) {
      this.enable(busId, { gatewayName, busIndex, autoShow: true });
    } else {
      this.disable(busId);
    }
  }

  isMonitorEnabled(busId: string): boolean {
    return this.enabledBusIds.has(busId);
  }

  private syncTabLabel(busId: string) {
    const record = this.monitors.get(busId);
    if (!record) {
      return;
    }
    const tab = consolePanelStore.tabs.find((t) => t.id === busTabId(busId));
    if (tab) {
      tab.label = buildLabel(record.gatewayName, record.busIndex);
    }
  }

  private reconcile(gateways: Gateway[]) {
    const seen = new Set<string>();
    gateways.forEach((gw) => {
      gw.buses.forEach((bus, idx) => {
        seen.add(bus.id);
        const busIndex = idx + 1;
        const record = this.monitors.get(bus.id);
        if (bus.bus_monitor_enabled && !record) {
          this.enable(bus.id, {
            gatewayName: gw.name,
            busIndex,
            autoShow: true,
          });
        } else if (record) {
          this.updateLabel(bus.id, { gatewayName: gw.name, busIndex });
        }
      });
    });
    Array.from(this.monitors.keys()).forEach((busId) => {
      if (!seen.has(busId)) {
        this.disable(busId);
      }
    });
  }
}
