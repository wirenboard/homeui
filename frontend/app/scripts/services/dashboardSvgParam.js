'use strict';

class DashboardSvgParam {
  constructor(data) {
    this.id = data.id || null;

    this.read = data.read || {
      enable: false,
      channel: null,
      value: 'val',
    };

    this.write = data.write || {
      enable: false,
      channel: null,
      value: {
        on: 1,
        off: 0,
      },
    };

    this.visible = data.visible || {
      enable: false,
      channel: null,
      condition: '==',
      value: null,
    };

    this.style = data.style || {
      enable: false,
      channel: null,
      value: null,
    };

    this['long-press'] = data['long-press'] || {
      enable: false,
      dashboard: null,
    };

    this['long-press-write'] = data['long-press-write'] || {
      enable: false,
      channel: null,
      value: {
        on: 1,
        off: 0,
      },
    };

    this.click = data.click || {
      enable: false,
      dashboard: null,
    };
  }
}

export default DashboardSvgParam;
