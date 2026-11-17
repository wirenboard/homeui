// @vitest-environment happy-dom
import { BindingsStore } from './bindings-store';

describe('BindingsStore', () => {
  let store: BindingsStore;

  beforeEach(() => {
    store = new BindingsStore();
  });

  test('initializes with defaults', () => {
    expect(store.jsonEditMode).toBe(false);
    expect(store.params).toEqual([]);
    expect(store.jsonSource).toBe('');
    expect(store.dashboards).toEqual([]);
  });

  test('setParams deep-clones params', () => {
    const params = [{ id: 'a', read: { enable: true, channel: 'x' } }];
    store.setParams(params);
    expect(store.params).toEqual(params);
    expect(store.params).not.toBe(params);
    expect(store.params[0]).not.toBe(params[0]);
  });

  test('setJsonSource updates jsonSource', () => {
    store.setJsonSource('{"test": true}');
    expect(store.jsonSource).toBe('{"test": true}');
  });

  test('startJsonEditing serializes params and enters edit mode', () => {
    store.setParams([{ id: 'x' }]);
    store.startJsonEditing();
    expect(store.jsonEditMode).toBe(true);
    expect(JSON.parse(store.jsonSource)).toEqual([{ id: 'x' }]);
  });

  test('cancelEditingJson exits edit mode', () => {
    store.startJsonEditing();
    store.cancelEditingJson();
    expect(store.jsonEditMode).toBe(false);
  });

  test('saveJson parses jsonSource into params', () => {
    store.setJsonSource('[{"id":"new"}]');
    store.saveJson();
    expect(store.params).toEqual([{ id: 'new' }]);
    expect(store.jsonEditMode).toBe(false);
  });

  test('saveJson alerts on invalid JSON', () => {
    globalThis.alert = vi.fn();
    const alertSpy = vi.spyOn(globalThis, 'alert');
    store.jsonEditMode = true;
    store.setJsonSource('not valid json');
    store.saveJson();
    expect(alertSpy).toHaveBeenCalled();
    expect(store.jsonEditMode).toBe(true);
    alertSpy.mockRestore();
  });

  test('setDashboards stores dashboards list', () => {
    store.setDashboards([{ label: 'Main', value: 'main' }]);
    expect(store.dashboards).toEqual([{ label: 'Main', value: 'main' }]);
  });

  test('onSelectSvgElement sets editable from existing param', () => {
    store.setParams([{ id: 'rect1', read: { enable: true, channel: 'dev/ctrl', value: 'text' } }]);
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('id', 'rect1');
    store.onSelectSvgElement(el);
    expect(store.editable.id).toBe('rect1');
  });

  test('onSelectSvgElement uses data-svg-param-id over id', () => {
    store.setParams([{ id: 'custom-id' }]);
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('id', 'html-id');
    el.setAttribute('data-svg-param-id', 'custom-id');
    store.onSelectSvgElement(el);
    expect(store.editable.id).toBe('custom-id');
  });

  test('onSelectSvgElement with null clears selection', () => {
    store.editable.id = 'x';
    store.onSelectSvgElement(null);
    expect(store.editable.id).toBeNull();
  });

  test('saveBinding adds new binding to params', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('id', 'new-el');
    store.onSelectSvgElement(el);
    store.editable.params.read = { enable: true, channel: 'a/b', value: '' };
    store.saveBinding();
    expect(store.params.find((p) => p.id === 'new-el')).toBeDefined();
  });

  test('saveBinding removes binding when no actions enabled', () => {
    store.setParams([{ id: 'rm', read: { enable: true, channel: 'x' } }]);
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('id', 'rm');
    store.onSelectSvgElement(el);
    Object.values(store.editable.params).forEach((p: any) => {
      if (p) p.enable = false;
    });
    store.saveBinding();
    expect(store.params.find((p) => p.id === 'rm')).toBeUndefined();
  });

  test('onSelectSvgElement ignores element without id', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.onSelectSvgElement(el);
    expect(store.editable.id).toBeNull();
  });

  test('saveBinding updates existing param with enabled bindings', () => {
    store.setParams([{ id: 'up', write: { enable: true, channel: 'old' } }]);
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('id', 'up');
    store.onSelectSvgElement(el);
    store.editable.params.write = { enable: true, channel: 'new' };
    store.saveBinding();
    expect(store.params.find((p) => p.id === 'up')?.write?.channel).toBe('new');
  });

  test('startJsonEditing clears editable selection', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('id', 'r1');
    store.onSelectSvgElement(el);
    expect(store.editable.id).toBe('r1');
    store.startJsonEditing();
    expect(store.editable.id).toBeNull();
  });
});
