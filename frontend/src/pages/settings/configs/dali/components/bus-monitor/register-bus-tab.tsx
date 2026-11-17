import { consolePanelStore } from '@/stores/console-panel';
import { busTabId } from '@/stores/dali/bus-tab-id';
import { DaliBusMonitorContent, DaliBusMonitorToolbar } from './bus-monitor-tab';
import type { RegisterBusTabParams } from './types';

export function registerBusTab({ busId, monitorStore, getLabel, onClose }: RegisterBusTabParams) {
  consolePanelStore.registerTab({
    id: busTabId(busId),
    label: getLabel(),
    renderToolbar: () => <DaliBusMonitorToolbar monitorStore={monitorStore} getLabel={getLabel} />,
    renderContent: () => <DaliBusMonitorContent monitorStore={monitorStore} />,
    closable: true,
    onClose,
  });
}
