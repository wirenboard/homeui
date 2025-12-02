import { makeAutoObservable, runInAction } from 'mobx';
import { ObjectStore, StoreBuilder } from '@/stores/json-schema-editor';
import type { Gateway, GatewayDetailed } from './types';

export default class DaliStore {
  public gateways: Map<string, Gateway> = new Map();
  public isLoading = true;
  #daliProxy: any;
  #whenMqttReady: () => Promise<void>;

  constructor(whenMqttReady: () => Promise<void>, DaliProxy: any) {
    this.#daliProxy = DaliProxy;
    this.#whenMqttReady = whenMqttReady;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  async getGateways(): Promise<Map<string, Gateway>> {
    try {
      await this.#whenMqttReady();
      const gateways = await this.#daliProxy.GetList();
      gateways.forEach((gateway) => {
        this.gateways.set(gateway.id, gateway);
      });
    } finally {
      this.isLoading = false;
    }
    return this.gateways;
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
