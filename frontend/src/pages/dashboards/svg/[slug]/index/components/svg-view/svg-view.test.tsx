// @vitest-environment happy-dom
import { render, waitFor } from '@testing-library/react';
import { observable } from 'mobx';
import { SvgView } from './svg-view';

describe('SvgView', () => {
  const svgContent = '<svg><text id="label"><tspan>Hello</tspan></text><rect id="box" /></svg>';
  const defaultValues = observable.map({ 'dev/ctrl': '42' });

  function renderView(overrides: Record<string, any> = {}) {
    return render(
      <SvgView
        svg={svgContent}
        params={[]}
        id="d"
        currentDashboard="d"
        values={defaultValues}
        className=""
        confirmHandler={vi.fn()}
        onSwitchValue={vi.fn()}
        onMoveToDashboard={vi.fn()}
        {...overrides}
      />,
    );
  }

  describe('rendering', () => {
    test('renders svg content', () => {
      const { container } = renderView();
      expect(container.querySelector('svg')).toBeTruthy();
      expect(container.querySelector('#label')).toBeTruthy();
    });

    test('applies className', () => {
      const { container } = renderView({ className: 'custom-cls' });
      expect(container.querySelector('.custom-cls')).toBeTruthy();
    });

    test('cleans up svg on unmount', () => {
      const { container, unmount } = renderView();
      const wrapper = container.firstElementChild;
      unmount();
      expect(wrapper!.innerHTML).toBe('');
    });
  });

  describe('read handler', () => {
    test('applies read value to tspan element', () => {
      const vals = observable.map({ 'dev/temp': '25' });
      const params = [{ id: 'label', read: { enable: true, channel: 'dev/temp', value: 'val' } }];
      const { container } = renderView({ params, values: vals });
      expect(container.querySelector('#label tspan')!.innerHTML).toBe('25');
    });

    test('applies read value to element without tspan', () => {
      const svg = '<svg><text id="plain">old</text></svg>';
      const vals = observable.map({ 'dev/x': '99' });
      const params = [{ id: 'plain', read: { enable: true, channel: 'dev/x', value: 'val' } }];
      const { container } = renderView({ svg, params, values: vals });
      expect(container.querySelector('#plain')!.innerHTML).toBe('99');
    });

    test('handles invalid read expression gracefully', () => {
      const vals = observable.map({ 'dev/x': '1' });
      const params = [{ id: 'box', read: { enable: true, channel: 'dev/x', value: '{{{invalid' } }];
      const { container } = renderView({ params, values: vals });
      expect(container.querySelector('#box')).toBeTruthy();
    });
  });

  describe('style handler', () => {
    test('applies style to element', () => {
      const vals = observable.map({ 'dev/temp': '50' });
      const params = [{
        id: 'box', style: { enable: true, channel: 'dev/temp', value: '"opacity:0.5"' },
      }];
      const { container } = renderView({ params, values: vals });
      const box = container.querySelector('#box') as HTMLElement;
      expect(box.style.cssText).toContain('opacity');
    });
  });

  describe('visible handler', () => {
    test('shows element when condition is true', () => {
      const vals = observable.map({ 'dev/state': '1' });
      const params = [{
        id: 'box', visible: { enable: true, channel: 'dev/state', condition: '==', value: '1' },
      }];
      const { container } = renderView({ params, values: vals });
      expect((container.querySelector('#box') as HTMLElement).style.display).not.toBe('none');
    });

    test('hides element when condition is false', () => {
      const vals = observable.map({ 'dev/state': '0' });
      const params = [{
        id: 'box', visible: { enable: true, channel: 'dev/state', condition: '==', value: '1' },
      }];
      const { container } = renderView({ params, values: vals });
      expect((container.querySelector('#box') as HTMLElement).style.display).toBe('none');
    });
  });

  describe('click handlers', () => {
    test('write handler calls onSwitchValue', () => {
      const onSwitch = vi.fn();
      const params = [{
        id: 'box',
        write: { enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: false },
      }];
      const { container } = renderView({ params, onSwitchValue: onSwitch });
      container.querySelector('#box')!.dispatchEvent(new Event('click'));
      expect(onSwitch).toHaveBeenCalledWith('dev/sw', { on: 1, off: 0 });
    });

    test('write with check calls confirmHandler before switch', async () => {
      const confirmFn = vi.fn().mockResolvedValue(true);
      const onSwitch = vi.fn();
      const params = [{
        id: 'box',
        write: { enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: true },
      }];
      const { container } = renderView({
        params, confirmHandler: confirmFn, onSwitchValue: onSwitch,
      });
      container.querySelector('#box')!.dispatchEvent(new Event('click'));
      await waitFor(() => expect(onSwitch).toHaveBeenCalled());
      expect(confirmFn).toHaveBeenCalled();
    });

    test('write with check denied does not switch', async () => {
      const confirmFn = vi.fn().mockResolvedValue(false);
      const onSwitch = vi.fn();
      const params = [{
        id: 'box',
        write: { enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: true },
      }];
      const { container } = renderView({
        params, confirmHandler: confirmFn, onSwitchValue: onSwitch,
      });
      container.querySelector('#box')!.dispatchEvent(new Event('click'));
      await waitFor(() => expect(confirmFn).toHaveBeenCalled());
      expect(onSwitch).not.toHaveBeenCalled();
    });

    test('click handler navigates to dashboard', () => {
      const onMove = vi.fn();
      const params = [{ id: 'box', click: { enable: true, dashboard: 'target-dash' } }];
      const { container } = renderView({ params, onMoveToDashboard: onMove });
      container.querySelector('#box')!.dispatchEvent(new Event('click'));
      expect(onMove).toHaveBeenCalledWith('target-dash');
    });

    test('adds switch class to clickable elements', () => {
      const params = [{
        id: 'box',
        write: { enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: false },
      }];
      const { container } = renderView({ params });
      expect(container.querySelector('#box')!.classList.contains('switch')).toBe(true);
    });
  });

  describe('long press handlers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function stubPointerCapture(el: Element) {
      (el as any).setPointerCapture = vi.fn();
      (el as any).releasePointerCapture = vi.fn();
    }

    test('long press navigates to dashboard', () => {
      const onMove = vi.fn();
      const params = [{ id: 'box', 'long-press': { enable: true, dashboard: 'target' } }];
      const { container } = renderView({ params, onMoveToDashboard: onMove });
      const box = container.querySelector('#box')!;
      stubPointerCapture(box);
      box.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
      vi.advanceTimersByTime(500);
      expect(onMove).toHaveBeenCalledWith('target');
    });

    test('long press cancelled on pointerup', () => {
      const onMove = vi.fn();
      const params = [{ id: 'box', 'long-press': { enable: true, dashboard: 'target' } }];
      const { container } = renderView({ params, onMoveToDashboard: onMove });
      const box = container.querySelector('#box')!;
      stubPointerCapture(box);
      box.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
      box.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      vi.advanceTimersByTime(500);
      expect(onMove).not.toHaveBeenCalled();
    });

    test('long press write calls onSwitchValue', () => {
      const onSwitch = vi.fn();
      const params = [{
        id: 'box',
        'long-press-write': {
          enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: false,
        },
      }];
      const { container } = renderView({ params, onSwitchValue: onSwitch });
      const box = container.querySelector('#box')!;
      stubPointerCapture(box);
      box.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
      vi.advanceTimersByTime(500);
      expect(onSwitch).toHaveBeenCalledWith('dev/sw', { on: 1, off: 0 });
    });

    test('long press write with check calls confirmHandler', async () => {
      vi.useRealTimers();
      const confirmFn = vi.fn().mockResolvedValue(true);
      const onSwitch = vi.fn();
      const params = [{
        id: 'box',
        'long-press-write': {
          enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: true,
        },
      }];
      const { container } = renderView({
        params, confirmHandler: confirmFn, onSwitchValue: onSwitch,
      });
      const box = container.querySelector('#box')!;
      stubPointerCapture(box);
      vi.useFakeTimers();
      box.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
      vi.advanceTimersByTime(500);
      vi.useRealTimers();
      await waitFor(() => expect(confirmFn).toHaveBeenCalled());
      expect(onSwitch).toHaveBeenCalledWith('dev/sw', { on: 1, off: 0 });
    });
  });

  describe('element lookup', () => {
    test('finds element by data-svg-param-id', () => {
      const svg = '<svg><rect data-svg-param-id="mybox" /></svg>';
      const vals = observable.map({ 'dev/x': '10' });
      const params = [{ id: 'mybox', read: { enable: true, channel: 'dev/x', value: 'val' } }];
      const { container } = renderView({ svg, params, values: vals });
      expect(container.querySelector('[data-svg-param-id=mybox]')!.innerHTML).toBe('10');
    });

    test('skips handlers when element not found', () => {
      const onSwitch = vi.fn();
      const params = [{
        id: 'nonexistent',
        write: { enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: false },
      }];
      renderView({ params, onSwitchValue: onSwitch });
      expect(onSwitch).not.toHaveBeenCalled();
    });

    test('skips handlers when id !== currentDashboard', () => {
      const onSwitch = vi.fn();
      const params = [{
        id: 'box',
        write: { enable: true, channel: 'dev/sw', value: { on: 1, off: 0 }, check: false },
      }];
      const { container } = renderView({
        params, id: 'other', currentDashboard: 'current', onSwitchValue: onSwitch,
      });
      container.querySelector('#box')!.dispatchEvent(new Event('click'));
      expect(onSwitch).not.toHaveBeenCalled();
    });
  });
});
