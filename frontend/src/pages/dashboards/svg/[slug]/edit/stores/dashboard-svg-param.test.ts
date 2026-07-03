import { DashboardSvgParam } from './dashboard-svg-param';

describe('DashboardSvgParam', () => {
  test('creates with defaults when no data', () => {
    const param = new DashboardSvgParam();
    expect(param.id).toBeNull();
    expect(param.read.enable).toBe(false);
    expect(param.read.channel).toBeNull();
    expect(param.read.value).toBe('val');
    expect(param.write.enable).toBe(false);
    expect(param.write.value).toEqual({ on: 1, off: 0 });
    expect(param.visible.enable).toBe(false);
    expect(param.visible.condition).toBe('==');
    expect(param.style.enable).toBe(false);
    expect(param.click.enable).toBe(false);
    expect(param['long-press'].enable).toBe(false);
    expect(param['long-press-write'].enable).toBe(false);
  });

  test('sets id from data', () => {
    const param = new DashboardSvgParam({ id: 'my-element' });
    expect(param.id).toBe('my-element');
  });

  test('merges partial data with defaults', () => {
    const param = new DashboardSvgParam({
      id: 'el',
      read: { enable: true, channel: 'dev/ctrl', value: 'text' },
    });
    expect(param.read.enable).toBe(true);
    expect(param.read.channel).toBe('dev/ctrl');
    expect(param.read.value).toBe('text');
    expect(param.write.enable).toBe(false);
  });

  test('overrides write values', () => {
    const param = new DashboardSvgParam({
      write: { enable: true, channel: 'lamp/switch', value: { on: 'true', off: 'false' }, check: true },
    });
    expect(param.write.enable).toBe(true);
    expect(param.write.channel).toBe('lamp/switch');
    expect(param.write.value).toEqual({ on: 'true', off: 'false' });
    expect(param.write.check).toBe(true);
  });

  test('overrides click dashboard', () => {
    const param = new DashboardSvgParam({
      click: { enable: true, dashboard: 'dashboard-2' },
    });
    expect(param.click.enable).toBe(true);
    expect(param.click.dashboard).toBe('dashboard-2');
  });

  test('preserves all default keys', () => {
    const param = new DashboardSvgParam({});
    expect(param).toHaveProperty('read');
    expect(param).toHaveProperty('write');
    expect(param).toHaveProperty('visible');
    expect(param).toHaveProperty('style');
    expect(param).toHaveProperty('click');
    expect(param).toHaveProperty('long-press');
    expect(param).toHaveProperty('long-press-write');
  });
});
