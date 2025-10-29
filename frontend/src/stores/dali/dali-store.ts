import { makeAutoObservable, runInAction } from 'mobx';
import { ObjectStore, StoreBuilder } from '@/stores/json-schema-editor';
import type { Gateway, GatewayDetailed } from './types';

export default class DaliStore {
  public gateways: Map<string, Gateway> = new Map();
  public isLoading = true;
  #daliProxy: any;

  constructor(DaliProxy: any) {
    this.#daliProxy = DaliProxy;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  getGateways(): Promise<Map<string, Gateway>> {
    // return this.#daliProxy.GetGateways();

    return new Promise((resolve) => {
      setTimeout(() => {
        runInAction(() => {
          const gateways = [
            { id: '1', name: 'WB-MDALI3', buses: [
              { id: '11', name: 'Bus 1', groups: [
                { id: 'group1', name: 1 },
                { id: 'group3', name: 3 },
                { id: 'group10', name: 10 },
              ], devices: [
                { id: '111', name: 'MART-DIN#22', groups: ['group1', 'group3'] },
                { id: '222', name: 'Led-BR', groups: [] },
                { id: '333', name: 'SMART_LAMP 12', groups: ['group3', 'group10'] },
              ] },
              { id: '22', name: 'Bus 2', groups: [], devices: [
                { id: '444', name: 'Crystal Lamp', groups: [] },
              ],
              },
            ] },
            { id: '2', name: 'WB-MDALI3 #2', buses: [
              { id: '1g1', name: 'Bus 1', groups: [], devices: [
                { id: 'q111', name: 'Device 1', groups: [] },
                { id: 'w222', name: 'Device 2', groups: [] },
                { id: 'e333', name: 'Device 3', groups: [] },
              ] },
              { id: 'r22', name: 'Bus 2', groups: [], devices: [
                { id: 'g444', name: 'Device one more 1', groups: [] },
                { id: 'f444', name: 'Device one more 2', groups: [] },
                { id: '4g44', name: 'Device one more 3', groups: [] },
                { id: '4g4hgf4', name: 'Device one more 4', groups: [] },
              ],
              },
            ] },
          ];

          gateways.forEach((gateway) => {
            this.gateways.set(gateway.id, gateway);
          });

          this.isLoading = false;
        });
        resolve(this.gateways);
      }, 500);
    });
  }

  getGateway(id: string): Promise<GatewayDetailed> {
    // return this.#daliProxy.GetGateway(id);

    return new Promise((resolve) => {
      const response = {
        config: {
          ws: false,
          port: 8080,
          sn: 'AX34123B',
          firmware: '1.0.3',
        },
        schema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          properties: {
            ws: {
              format: 'checkbox',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 1,
              title: 'Включить websocket',
              type: 'boolean',
            },
            port: {
              format: 'number',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 2,
              title: 'Порт',
              type: 'number',
            },
            sn: {
              format: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 3,
              title: 'Серийный номер',
              type: 'string',
            },
            firmware: {
              format: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 3,
              title: 'Версия прошивки',
              type: 'string',
            },
          },
          type: 'object',
        },
      };

      const res = new ObjectStore(response.schema, response.config, false, new StoreBuilder());

      setTimeout(() => {
        resolve(res);
      }, 1000);
    });
  }

  updateGateway(data) {
    return this.#daliProxy.SetGateway(data);
  }

  getBus(id: string): Promise<GatewayDetailed> {
    // return this.#daliProxy.GetBus(id);

    return new Promise((resolve) => {
      const response = {
        config: {
          amperage: '25мА',
          percent: '75%',
          enable: true,
        },
        schema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          properties: {
            amperage: {
              format: 'string',
              type: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 1,
              title: 'Ток потребления',
            },
            percent: {
              format: 'string',
              type: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 2,
              title: 'Процент занятости',
            },
            enable: {
              format: 'checkbox',
              type: 'boolean',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 3,
              title: 'Включить блок питания',
            },
          },
          type: 'object',
        },
      };

      const res = new ObjectStore(response.schema, response.config, false, new StoreBuilder());

      setTimeout(() => {
        resolve(res);
      }, 1000);
    });
  }

  updateBus(data) {
    return this.#daliProxy.SetBus(data);
  }

  async scanBus(id: string) {
    const busDevices = await this.#daliProxy.Scan(id);
    const gatewayId = this.gatewayList.find((g) => g.buses.some((bus) => bus.id === id))!.id;
    const gateway = this.gateways.get(gatewayId);
    gateway.buses.find((item) => item.id = id).devices = busDevices;
    this.gateways.set(gateway.id, gateway);
  }

  getDevice(id: string): Promise<GatewayDetailed> {
    // return this.#daliProxy.GetDevice(id);

    return new Promise((resolve) => {
      const response = {
        config: {
          amperage: '25мА',
          percent: '75%',
          enable: true,
        },
        schema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          properties: {
            amperage: {
              format: 'string',
              type: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 1,
              title: 'Ток потребления',
            },
            percent: {
              format: 'string',
              type: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 2,
              title: 'Процент занятости',
            },
            enable: {
              format: 'checkbox',
              type: 'boolean',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 3,
              title: 'Включить блок питания',
            },
          },
          type: 'object',
        },
      };

      const res = new ObjectStore(response.schema, response.config, false, new StoreBuilder());

      setTimeout(() => {
        resolve(res);
      }, 1000);
    });
  }

  updateDevice(data) {
    return this.#daliProxy.SetDevice(data);
  }

  getGroup(id: string): Promise<GatewayDetailed> {
    return new Promise((resolve) => {
      const response = {
        config: {
          amperage: '25мА',
          percent: '75%',
          enable: true,
        },
        schema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          properties: {
            amperage: {
              format: 'string',
              type: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 1,
              title: 'Ток потребления',
            },
            percent: {
              format: 'string',
              type: 'string',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 2,
              title: 'Процент занятости',
            },
            enable: {
              format: 'checkbox',
              type: 'boolean',
              options: {
                wb: {
                  show_editor: true,
                },
              },
              propertyOrder: 3,
              title: 'Включить блок питания',
            },
          },
          type: 'object',
        },
      };

      const res = new ObjectStore(response.schema, response.config, false, new StoreBuilder());

      setTimeout(() => {
        resolve(res);
      }, 1000);
    });
  }

  updateGroup(data) {
    return this.#daliProxy.SetGroup(data);
  }

  get gatewayList() {
    return Array.from(this.gateways.values());
  }
}
