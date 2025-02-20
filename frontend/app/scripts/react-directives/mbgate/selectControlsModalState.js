'use strict';

import SimpleModalState from '../components/modals/simpleModalState';
import ConfirmModalState from '../components/modals/confirmModalState';
import i18n from '../../i18n/react/config';
import { action, makeObservable } from 'mobx';

function makeControlNodes(deviceData, configuredControls, cellIds, lang) {
  return cellIds.reduce((nodes, cellId) => {
    if (!configuredControls.includes(cellId)) {
      nodes.push({
        id: cellId,
        name: deviceData.cell(cellId).getName(lang),
        mqttId: cellId,
      });
    }
    return nodes;
  }, []);
}

function addDeviceNode(deviceNodes, device, deviceId, controlNodes, lang) {
  if (controlNodes.length !== 0) {
    deviceNodes.push({
      id: device.id,
      name: device.getName(lang),
      mqttId: deviceId,
      children: controlNodes,
    });
  }
}
class SelectControlsModalState {
  constructor(deviceData) {
    this.simpleModalState = new SimpleModalState('select-controls-modal');
    this.confirmModalState = new ConfirmModalState();
    this.deviceData = deviceData;
    this.controls = [];
    this.selected = [];

    makeObservable(this, {
      show: action,
    });
  }

  async show(configuredControls) {
    const lang = i18n.language;
    this.controls = Object.entries(this.deviceData.devices).reduce(
      (deviceNodes, [deviceId, device]) => {
        addDeviceNode(
          deviceNodes,
          device,
          deviceId,
          makeControlNodes(this.deviceData, configuredControls || [], device.cellIds, lang),
          lang
        );
        return deviceNodes;
      },
      []
    );
    this.controls.sort((a, b) => a.name.localeCompare(b.name));
    this.selected = [];

    if (this.controls.length === 0) {
      await this.confirmModalState.show(i18n.t('mbgate.labels.no-controls'));
      return Promise.resolve(false);
    }

    return this.simpleModalState.show(
      i18n.t('mbgate.labels.select-channels'),
      i18n.t('mbgate.buttons.add')
    );
  }

  get selectedControls() {
    return this.selected.filter(node => node.level == 1).map(node => node.data.mqttId);
  }
}

export default SelectControlsModalState;
