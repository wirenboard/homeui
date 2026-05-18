import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { Tree, type TreeItem } from '@/components/tree';
import type Cell from '@/stores/devices/cell';
import type { SelectControlProps, ControlNode } from './types';
import './styles.css';

function makeControlNodes(
  cells: Map<string, Cell>,
  configuredControls: string[],
  cellIds: string[],
): ControlNode[] {
  return cellIds.reduce<ControlNode[]>((nodes, cellId) => {
    if (!configuredControls.includes(cellId)) {
      nodes.push({
        id: cellId,
        name: cells.get(cellId)!.name,
        mqttId: cellId,
      });
    }
    return nodes;
  }, []);
}

function buildControlTree(
  devicesStore: SelectControlProps['devicesStore'],
  configuredControls: string[],
): ControlNode[] {
  const tree = Array.from(devicesStore.filteredDevices.values()).reduce<ControlNode[]>(
    (deviceNodes, device) => {
      const controlNodes = makeControlNodes(
        devicesStore.cells,
        configuredControls,
        Array.from(device.cells),
      );
      if (controlNodes.length !== 0) {
        deviceNodes.push({
          id: device.id,
          name: device.name,
          mqttId: device.id,
          children: controlNodes,
        });
      }
      return deviceNodes;
    },
    [],
  );
  tree.sort((a, b) => a.name.localeCompare(b.name));
  return tree;
}

function toTreeItem(node: ControlNode): TreeItem {
  return {
    id: node.id,
    label: (
      <span>
        {node.name}
        <span className="selectControls-mqttId">({node.mqttId})</span>
      </span>
    ),
    children: node.children?.map(toTreeItem),
  };
}

function filterTree(
  nodes: ControlNode[],
  devicePattern: string,
  controlPattern: string,
): ControlNode[] {
  return nodes.reduce<ControlNode[]>((result, device) => {
    const deviceMatches = !devicePattern || device.name.toLowerCase().includes(devicePattern);
    if (!deviceMatches) return result;

    const filteredChildren = device.children?.filter(
      (control) => !controlPattern || control.name.toLowerCase().includes(controlPattern),
    );
    if (filteredChildren?.length) {
      result.push({ ...device, children: filteredChildren });
    }
    return result;
  }, []);
}

export const SelectControls = ({
  isOpen,
  configuredControls,
  devicesStore,
  onConfirm,
  onClose,
}: SelectControlProps) => {
  const { t } = useTranslation();
  const [devicePattern, setDevicePattern] = useState('');
  const [controlPattern, setControlPattern] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const controls = useMemo(
    () => buildControlTree(devicesStore, configuredControls),
    [devicesStore, configuredControls],
  );

  const leafIds = useMemo(() => {
    const ids = new Set<string>();
    controls.forEach((device) => device.children?.forEach((c) => ids.add(c.id)));
    return ids;
  }, [controls]);

  const filteredTreeItems = useMemo(() => {
    const filtered = filterTree(
      controls,
      devicePattern.toLowerCase(),
      controlPattern.toLowerCase(),
    );
    return filtered.map(toTreeItem);
  }, [controls, devicePattern, controlPattern]);

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selectedIds).filter((id) => leafIds.has(id)));
  }, [selectedIds, leafIds, onConfirm]);

  return (
    <Confirm
      isOpened={isOpen}
      width={650}
      heading={t('mbgate.labels.select-channels')}
      acceptLabel={t('mbgate.buttons.add')}
      closeCallback={onClose}
      confirmCallback={handleConfirm}
    >
      <div className="selectControls-header">
        <Input
          placeholder={t('mbgate.labels.search-device')}
          value={devicePattern}
          onChange={(val: string) => setDevicePattern(val)}
        />
        <Input
          placeholder={t('mbgate.labels.search-control')}
          value={controlPattern}
          onChange={(val: string) => setControlPattern(val)}
        />
      </div>
      <Tree
        data={filteredTreeItems}
        selectedIds={selectedIds}
        size="small"
        selectable
        onSelectionChange={setSelectedIds}
      />
    </Confirm>
  );
};
