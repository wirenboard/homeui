// @vitest-environment happy-dom
import type { MatterSettings } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { SettingsCard } from './settings-card';

const BOTH_OFF: MatterSettings = { name_in_model: false, fabric_details: false };

// Each switch of the card: the setting it holds, its name and its explanation.
const SWITCHES = [
  ['name_in_model', 'matter.labels.name-in-model', 'matter.labels.name-in-model-hint'],
  ['fabric_details', 'matter.labels.fabric-details', 'matter.labels.fabric-details-hint'],
] as const;

const theSwitch = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

const card = (settings: MatterSettings, props: Partial<Parameters<typeof SettingsCard>[0]> = {}) => (
  <SettingsCard settings={settings} isSaving={false} hasFailed={false} onChange={vi.fn()} {...props} />
);

describe('SettingsCard', () => {
  it.each(SWITCHES)('shows the switch of %s as the bridge holds it, named and explained', (setting, name, hint) => {
    const { rerender } = render(card({ ...BOTH_OFF, [setting]: true }));
    expect(theSwitch(name).checked).toBe(true);
    // A screen reader reads the name and the explanation with the switch itself.
    expect(theSwitch(name).getAttribute('aria-describedby')).toBe(screen.getByText(hint).id);

    rerender(card(BOTH_OFF));
    expect(theSwitch(name).checked).toBe(false);
  });

  it.each(SWITCHES)('asks for the other value of %s alone when its switch is clicked', (setting, name) => {
    const onChange = vi.fn();
    const { rerender } = render(card(BOTH_OFF, { onChange }));

    fireEvent.click(theSwitch(name));
    expect(onChange).toHaveBeenLastCalledWith({ [setting]: true });

    rerender(card({ ...BOTH_OFF, [setting]: true }, { onChange }));
    fireEvent.click(theSwitch(name));
    expect(onChange).toHaveBeenLastCalledWith({ [setting]: false });
  });

  it('shows the details switch off for a bridge that says nothing of it', () => {
    render(card({ name_in_model: true }));
    expect(theSwitch('matter.labels.fabric-details').checked).toBe(false);
  });

  it('does not move by itself, and cannot be thrown again while a change is on its way', () => {
    const { rerender } = render(card({ ...BOTH_OFF, name_in_model: true }));

    fireEvent.click(theSwitch('matter.labels.name-in-model'));
    // The change is the bridge's to confirm. Nothing confirmed it here.
    expect(theSwitch('matter.labels.name-in-model').checked).toBe(true);

    rerender(card({ ...BOTH_OFF, name_in_model: true }, { isSaving: true }));
    expect(theSwitch('matter.labels.name-in-model').disabled).toBe(true);
    expect(theSwitch('matter.labels.fabric-details').disabled).toBe(true);
  });

  it('says so when the change did not go through, and only then', () => {
    const { rerender } = render(card(BOTH_OFF));
    expect(screen.queryByText('matter.labels.settings-failed')).not.toBeInTheDocument();

    rerender(card(BOTH_OFF, { hasFailed: true }));
    expect(screen.getByText('matter.labels.settings-failed')).toBeInTheDocument();
  });
});
