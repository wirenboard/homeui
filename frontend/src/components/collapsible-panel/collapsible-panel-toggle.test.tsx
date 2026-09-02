// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { CollapsiblePanel } from './collapsible-panel';

describe('CollapsiblePanel: the whole title row toggles, exactly once per click', () => {
  it('clicking the title text collapses and expands the body', () => {
    render(<CollapsiblePanel title="Broadcast settings"><div>body</div></CollapsiblePanel>);
    expect(screen.getByText('body')).toBeTruthy();
    fireEvent.click(screen.getByText('Broadcast settings'));
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(screen.getByText('Broadcast settings'));
    expect(screen.getByText('body')).toBeTruthy();
  });

  it('the toggle row is not a <label> — Chrome forwards label clicks into the button and toggles twice', () => {
    const { container } = render(<CollapsiblePanel title="T">x</CollapsiblePanel>);
    expect(container.querySelector('label.collapsiblePanel-label')).toBeNull();
    expect(container.querySelector('div.collapsiblePanel-label')).toBeTruthy();
  });
});
