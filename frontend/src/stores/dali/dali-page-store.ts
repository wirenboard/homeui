import { runInAction, makeObservable, observable, action, reaction, type IReactionDisposer } from 'mobx';
import { type ErrorInfo } from '@/layouts/page';
import { formatError } from '@/utils/format-error';
import { BusStore } from './bus-store';
import type { DaliGlobalStore } from './dali-global-store';
import { GatewayStore } from './gateway-store';
import type { ItemStore } from './types';

// The bus of a selected device or group it no longer holds: a factory reset, a group
// switched off or a rescan can leave the selection on a node that is out of the tree.
const detachedParentBus = (item: ItemStore | null): BusStore | null => {
  if (!item || !('parent' in item)) {
    return null;
  }
  const parent = item.parent;
  return parent && !parent.children.includes(item) ? parent : null;
};

export class DaliPageStore {
  public gateways: GatewayStore[] = [];
  public selectedItem: ItemStore | null = null;
  public isLoading = true;
  public errors: ErrorInfo[];

  private daliGlobalStore: DaliGlobalStore;
  private selectionDisposer: IReactionDisposer;

  constructor(daliGlobalStore: DaliGlobalStore) {
    this.daliGlobalStore = daliGlobalStore;
    makeObservable(this, {
      isLoading: observable,
      errors: observable,
      gateways: observable.shallow,
      selectedItem: observable.ref,
      selectItem: action,
    });
    this.selectionDisposer = reaction(
      () => detachedParentBus(this.selectedItem),
      (parentBus) => {
        if (parentBus) {
          this.selectItem(parentBus);
        }
      },
    );
  }

  selectItem(item: ItemStore | null) {
    this.selectedItem = item;
    item?.load();
  }

  async load() {
    try {
      const gateways = await this.daliGlobalStore.refresh();
      runInAction(() => {
        this.gateways = gateways.map((gateway) => {
          const gatewayStore = new GatewayStore(gateway.id, gateway.name);
          gatewayStore.children = gateway.buses.map(
            (bus, idx) => new BusStore(bus, idx + 1, gateway.name),
          );
          return gatewayStore;
        });
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  destroy() {
    this.selectionDisposer();
    this.gateways.forEach((gateway) => {
      gateway.children.forEach((bus) => {
        bus.destroy();
      });
    });
  }

  setError(error: unknown) {
    if (!error) {
      this.errors = [];
      return;
    }
    this.errors = [{ variant: 'danger', text: formatError(error) }];
  }
}
