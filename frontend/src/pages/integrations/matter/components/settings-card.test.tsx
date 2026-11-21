// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { SettingsCard } from './settings-card';

/** The one switch of the card: a checkbox labelled by the name of the setting. */
const theSwitch = () => screen.getByRole('checkbox') as HTMLInputElement;

describe('SettingsCard', () => {
  it('shows the switch as the bridge holds it', () => {
    const { rerender } = render(
      <SettingsCard settings={{ name_in_model: true }} isSaving={false} hasFailed={false} onChange={vi.fn()} />,
    );
    expect(theSwitch().checked).toBe(true);

    rerender(
      <SettingsCard settings={{ name_in_model: false }} isSaving={false} hasFailed={false} onChange={vi.fn()} />,
    );
    expect(theSwitch().checked).toBe(false);
  });

  it('says what the switch is and what it does, and ties both to it', () => {
    render(
      <SettingsCard settings={{ name_in_model: true }} isSaving={false} hasFailed={false} onChange={vi.fn()} />,
    );

    const label = screen.getByText('matter.labels.name-in-model');
    const hint = screen.getByText('matter.labels.name-in-model-hint');
    expect(screen.getByText('matter.labels.settings')).toBeInTheDocument();
    // A screen reader reads the name and the explanation with the switch itself.
    expect(theSwitch().getAttribute('aria-labelledby')).toBe(label.id);
    expect(theSwitch().getAttribute('aria-describedby')).toBe(hint.id);
    expect(label.id).not.toBe('');
    expect(label.id).not.toBe(hint.id);
  });

  it('asks for the other value of that one setting when it is clicked', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SettingsCard settings={{ name_in_model: true }} isSaving={false} hasFailed={false} onChange={onChange} />,
    );

    fireEvent.click(theSwitch());
    expect(onChange).toHaveBeenLastCalledWith({ name_in_model: false });

    rerender(
      <SettingsCard settings={{ name_in_model: false }} isSaving={false} hasFailed={false} onChange={onChange} />,
    );
    fireEvent.click(theSwitch());
    expect(onChange).toHaveBeenLastCalledWith({ name_in_model: true });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('does not move by itself: it shows what it was given until it is given something else', () => {
    render(
      <SettingsCard settings={{ name_in_model: true }} isSaving={false} hasFailed={false} onChange={vi.fn()} />,
    );

    fireEvent.click(theSwitch());

    // The change is the bridge's to confirm. Nothing confirmed it here.
    expect(theSwitch().checked).toBe(true);
  });

  it('cannot be thrown again while a change is on its way', () => {
    const onChange = vi.fn();
    render(
      <SettingsCard settings={{ name_in_model: true }} hasFailed={false} isSaving onChange={onChange} />,
    );

    expect(theSwitch().disabled).toBe(true);
  });

  it('says so when the change did not go through, and only then', () => {
    const { rerender } = render(
      <SettingsCard settings={{ name_in_model: true }} isSaving={false} hasFailed={false} onChange={vi.fn()} />,
    );
    expect(screen.queryByText('matter.labels.settings-failed')).not.toBeInTheDocument();

    rerender(
      <SettingsCard settings={{ name_in_model: true }} isSaving={false} hasFailed onChange={vi.fn()} />,
    );
    expect(screen.getByText('matter.labels.settings-failed')).toBeInTheDocument();
  });
});
