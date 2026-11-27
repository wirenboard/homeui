// @vitest-environment happy-dom
import type { MatterSettings } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { SettingsCard } from './settings-card';

const ALL_OFF: MatterSettings = { name_in_model: false, detailed_journal: false };

// Each switch of the card: the setting it holds, its name and its explanation.
const SWITCHES = [
  ['name_in_model', 'matter.labels.name-in-model', 'matter.labels.name-in-model-hint'],
  ['detailed_journal', 'matter.labels.detailed-journal', 'matter.labels.detailed-journal-hint'],
] as const;

const theSwitch = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

const card = (settings: MatterSettings, props: Partial<Parameters<typeof SettingsCard>[0]> = {}) => (
  <SettingsCard settings={settings} isSaving={false} hasFailed={false} onChange={vi.fn()} {...props} />
);

describe('SettingsCard', () => {
  it.each(SWITCHES)('shows the switch of %s as the bridge holds it, named and explained', (setting, name, hint) => {
    const { rerender } = render(card({ ...ALL_OFF, [setting]: true }));
    expect(theSwitch(name).checked).toBe(true);
    // A screen reader reads the name and the explanation with the switch itself.
    expect(theSwitch(name).getAttribute('aria-describedby')).toBe(screen.getByText(hint).id);

    rerender(card(ALL_OFF));
    expect(theSwitch(name).checked).toBe(false);
  });

  it.each(SWITCHES)('asks for the other value of %s alone when its switch is clicked', (setting, name) => {
    const onChange = vi.fn();
    const { rerender } = render(card(ALL_OFF, { onChange }));

    fireEvent.click(theSwitch(name));
    expect(onChange).toHaveBeenLastCalledWith({ [setting]: true });

    rerender(card({ ...ALL_OFF, [setting]: true }, { onChange }));
    fireEvent.click(theSwitch(name));
    expect(onChange).toHaveBeenLastCalledWith({ [setting]: false });
  });

  it('does not move by itself, and cannot be thrown again while a change is on its way', () => {
    const { rerender } = render(card({ ...ALL_OFF, name_in_model: true }));

    fireEvent.click(theSwitch('matter.labels.name-in-model'));
    // The change is the bridge's to confirm. Nothing confirmed it here.
    expect(theSwitch('matter.labels.name-in-model').checked).toBe(true);

    rerender(card({ ...ALL_OFF, name_in_model: true }, { isSaving: true }));
    expect(theSwitch('matter.labels.name-in-model').disabled).toBe(true);
  });

  it('shows the setting nobody can change yet as a switch that is on and cannot be thrown', () => {
    const onChange = vi.fn();
    render(card({ ...ALL_OFF, parts_apart: true }, { fixed: ['parts_apart'], onChange }));

    const fixed = theSwitch('matter.labels.parts-apart');
    expect([fixed.checked, fixed.disabled]).toEqual([true, true]);
    // The explanation ends with why the switch does not move.
    expect(document.getElementById(fixed.getAttribute('aria-describedby')).textContent)
      .toBe('matter.labels.parts-apart-hint matter.labels.setting-fixed');
    // And the one beside it is as free as it was.
    expect(theSwitch('matter.labels.name-in-model').disabled).toBe(false);
  });

  it('lets that setting be thrown once the bridge stops naming it as fixed', () => {
    const onChange = vi.fn();
    render(card({ ...ALL_OFF, parts_apart: true }, { fixed: [], onChange }));

    fireEvent.click(theSwitch('matter.labels.parts-apart'));

    expect(onChange).toHaveBeenCalledWith({ parts_apart: false });
    expect(screen.queryByText(/matter\.labels\.setting-fixed/)).not.toBeInTheDocument();
  });

  it('has no such switch for a bridge that does not know the setting', () => {
    render(card(ALL_OFF));

    expect(screen.queryByText('matter.labels.parts-apart')).not.toBeInTheDocument();
  });

  it('has no switch of the journal for a bridge that does not send one', () => {
    render(card({ name_in_model: true }));

    expect(screen.queryByText('matter.labels.detailed-journal')).not.toBeInTheDocument();
  });

  it('says so when the change did not go through, and only then', () => {
    const { rerender } = render(card(ALL_OFF));
    expect(screen.queryByText('matter.labels.settings-failed')).not.toBeInTheDocument();

    rerender(card(ALL_OFF, { hasFailed: true }));
    expect(screen.getByText('matter.labels.settings-failed')).toBeInTheDocument();
  });
});
