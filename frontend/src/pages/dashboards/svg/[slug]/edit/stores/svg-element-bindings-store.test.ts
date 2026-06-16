// @vitest-environment happy-dom
import { DashboardSvgParam } from './dashboard-svg-param';
import { SvgElementBindingsStore } from './svg-element-bindings-store';

describe('SvgElementBindingsStore', () => {
  let store: SvgElementBindingsStore;

  beforeEach(() => {
    store = new SvgElementBindingsStore();
  });

  test('starts with no selection', () => {
    expect(store.isSelected).toBe(false);
    expect(store.id).toBeNull();
    expect(store.element).toBeNull();
  });

  test('setSelectedElement sets element and id', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const params = new DashboardSvgParam({ id: 'r1' });
    store.setSelectedElement(el, 'r1', params);

    expect(store.isSelected).toBe(true);
    expect(store.id).toBe('r1');
    expect(store.element).toBe(el);
    expect(store.tagName).toBe('rect');
  });

  test('setSelectedElement adds selected class to element', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.setSelectedElement(el, 'r1', new DashboardSvgParam());
    expect(el.classList.contains('selected')).toBe(true);
  });

  test('setSelectedElement creates params for text elements with read', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    store.setSelectedElement(el, 't1', new DashboardSvgParam());
    expect(store.params).toHaveProperty('read');
    expect(store.params).toHaveProperty('write');
    expect(store.params).toHaveProperty('click');
    expect(store.params).toHaveProperty('style');
    expect(store.params).toHaveProperty('visible');
    expect(store.params).toHaveProperty('long-press');
    expect(store.params).toHaveProperty('long-press-write');
  });

  test('setSelectedElement for non-text does not add read param initially', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.setSelectedElement(el, 'r1', new DashboardSvgParam());
    expect(store.params).not.toHaveProperty('read');
    expect(store.params).toHaveProperty('write');
  });

  test('clearSelection removes class and resets state', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.setSelectedElement(el, 'r1', new DashboardSvgParam());

    store.clearSelection();

    expect(store.isSelected).toBe(false);
    expect(store.id).toBeNull();
    expect(store.element).toBeNull();
    expect(store.tagName).toBe('');
    expect(el.classList.contains('selected')).toBe(false);
  });

  test('elementCaption returns label for known tags', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    store.setSelectedElement(el, 't1', new DashboardSvgParam());
    expect(store.elementCaption).toBe('edit-svg-dashboard.labels.text');
  });

  test('elementCaption returns tagName for unknown tags', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    store.setSelectedElement(el, 'p1', new DashboardSvgParam());
    expect(store.elementCaption).toBe('polygon');
  });

  test('setParamValue updates a specific param field', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.setSelectedElement(el, 'r1', new DashboardSvgParam());
    store.setParamValue('write', 'enable', true);
    expect(store.params.write!.enable).toBe(true);
  });

  test('setParamValue updates channel', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.setSelectedElement(el, 'r1', new DashboardSvgParam());
    store.setParamValue('write', 'channel', 'lamp/switch');
    expect(store.params.write!.channel).toBe('lamp/switch');
  });

  test('makeNewParamsStore clears params', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.setSelectedElement(el, 'r1', new DashboardSvgParam());
    expect(Object.keys(store.params).length).toBeGreaterThan(0);

    store.makeNewParamsStore();
    expect(Object.keys(store.params)).toHaveLength(0);
  });

  test('setSelectedElement merges provided param data', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const params = new DashboardSvgParam({
      write: { enable: true, channel: 'dev/x', value: { on: 1, off: 0 }, check: true },
    });
    store.setSelectedElement(el, 'r1', params);
    expect(store.params.write?.enable).toBe(true);
    expect(store.params.write?.channel).toBe('dev/x');
    expect(store.params.write?.check).toBe(true);
  });

  test('clearSelection when nothing selected does not throw', () => {
    expect(() => store.clearSelection()).not.toThrow();
    expect(store.isSelected).toBe(false);
  });

  test('tracks reaction disposers for each param', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    store.setSelectedElement(el, 'r1', new DashboardSvgParam());
    expect(store.paramsStoreDisposers.length).toBe(6);
  });
});
