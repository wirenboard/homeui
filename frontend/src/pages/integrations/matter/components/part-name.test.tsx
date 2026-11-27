// @vitest-environment happy-dom
import type { MatterDevice } from '@/stores/matter';
import { render } from '@/test/render';
import { PartName } from './device-parts';

const part = (over: Partial<MatterDevice> = {}) => ({
  did: 10, name: 'Hall light', type: 'light', module: 'Hall light', group: null, ...over,
} as MatterDevice);

const namesIn = (container: HTMLElement) => Array.from(container.querySelectorAll('.matter-rowName'))
  .map((name) => name.textContent);

describe('PartName, the name of a part of a device', () => {
  it('says the name the part was given', () => {
    const { container } = render(<PartName device={part({ name: 'Ceiling' })} />);
    expect(namesIn(container)).toEqual(['Ceiling']);
  });

  it('says no name for a part that has none of its own, only what it is', () => {
    const { container } = render(<PartName device={part({ unnamed: true })} />);
    expect(namesIn(container)).toEqual([]);
    expect(container.querySelector('.matter-rowLine').textContent).toContain('light');
  });
});
