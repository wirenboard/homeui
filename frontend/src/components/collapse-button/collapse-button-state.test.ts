import { CollapseButtonState } from './collapse-button-state';

describe('CollapseButtonState', () => {
  test('initializes with given collapsed state', () => {
    expect(new CollapseButtonState(true).collapsed).toBe(true);
    expect(new CollapseButtonState(false).collapsed).toBe(false);
  });

  test('setCollapsed(true) calls onCollapseFn and sets collapsed', () => {
    const onCollapse = vi.fn();
    const state = new CollapseButtonState(false, onCollapse);
    state.setCollapsed(true);

    expect(state.collapsed).toBe(true);
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  test('setCollapsed(false) calls onRestoreFn and sets collapsed', () => {
    const onRestore = vi.fn();
    const state = new CollapseButtonState(true, undefined, onRestore);
    state.setCollapsed(false);

    expect(state.collapsed).toBe(false);
    expect(onRestore).toHaveBeenCalledOnce();
  });

  test('works without callbacks', () => {
    const state = new CollapseButtonState(false);
    expect(() => state.setCollapsed(true)).not.toThrow();
    expect(state.collapsed).toBe(true);
  });
});
