import { observable, runInAction } from 'mobx';
import { DaliPageStore } from './dali-page-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

// The selection only needs the tree shape. `deep: false` mirrors BusStore's
// observable.shallow, so the children keep their identity instead of becoming proxies.
const buildBus = () => ({
  type: 'bus',
  id: 'bus1',
  load: vi.fn(),
  children: observable.array<any>([], { deep: false }),
});

const buildChild = (bus: any, type: 'device' | 'group') => {
  const child = { type, id: `${type}1`, load: vi.fn(), parent: bus };
  runInAction(() => bus.children.push(child));
  return child;
};

describe('DaliPageStore', () => {
  let store: DaliPageStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new DaliPageStore({ refresh: vi.fn() } as any);
  });

  afterEach(() => store.destroy());

  describe('selectItem', () => {
    test('remembers the item and loads it', () => {
      const bus = buildBus();

      store.selectItem(bus as any);

      expect(store.selectedItem).toBe(bus);
      expect(bus.load).toHaveBeenCalled();
    });

    test('clears the selection without loading anything', () => {
      store.selectItem(buildBus() as any);

      store.selectItem(null);

      expect(store.selectedItem).toBeNull();
    });
  });

  describe('selection of an item that leaves the tree', () => {
    test.each(['device', 'group'] as const)(
      'falls back to the bus when the selected %s is removed from it',
      (type) => {
        const bus = buildBus();
        const child = buildChild(bus, type);
        store.selectItem(child as any);

        runInAction(() => bus.children.remove(child));

        expect(store.selectedItem).toBe(bus);
        expect(bus.load).toHaveBeenCalled();
      },
    );

    test('keeps the selection while the item is still in the tree', () => {
      const bus = buildBus();
      const device = buildChild(bus, 'device');
      const other = buildChild(bus, 'group');
      store.selectItem(device as any);

      runInAction(() => bus.children.remove(other));

      expect(store.selectedItem).toBe(device);
      expect(bus.load).not.toHaveBeenCalled();
    });

    test('stops watching the selection once the page store is destroyed', () => {
      const bus = buildBus();
      const device = buildChild(bus, 'device');
      store.selectItem(device as any);

      store.destroy();
      runInAction(() => bus.children.remove(device));

      expect(store.selectedItem).toBe(device);
    });
  });
});
