// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapseButton } from './collapse-button';
import { CollapseButtonState } from './collapse-button-state';

describe('CollapseButton', () => {
  test('renders expanded state', () => {
    const state = new CollapseButtonState(false);
    render(<CollapseButton state={state} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('common.buttons.collapse');
  });

  test('renders collapsed state', () => {
    const state = new CollapseButtonState(true);
    render(<CollapseButton state={state} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBe('common.buttons.expand');
  });

  test('toggles state on click', () => {
    const state = new CollapseButtonState(false);
    render(<CollapseButton state={state} />);
    fireEvent.click(screen.getByRole('button'));
    expect(state.collapsed).toBe(true);
  });

  test('stopPropagation prevents event bubbling', () => {
    const state = new CollapseButtonState(false);
    const outerClick = vi.fn();
    render(
      <div onClick={outerClick}>
        <CollapseButton state={state} stopPropagation />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(outerClick).not.toHaveBeenCalled();
  });

  test('applies custom className', () => {
    const state = new CollapseButtonState(false);
    const { container } = render(<CollapseButton state={state} className="custom" />);
    expect(container.querySelector('.custom')).toBeTruthy();
  });
});
