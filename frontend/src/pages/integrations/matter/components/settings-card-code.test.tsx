// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { SettingsCard } from './settings-card';

const cardOf = (props = {}) => (
  <SettingsCard
    settings={{ name_in_model: true }}
    isSaving={false}
    hasFailed={false}
    isCodeBusy={false}
    canChangeCode
    onChange={vi.fn()}
    onNewCode={vi.fn()}
    {...props}
  />
);

describe('SettingsCard, the pairing code', () => {
  it('offers to change the code and says when that is worth doing', () => {
    const onNewCode = vi.fn();
    render(cardOf({ onNewCode }));

    expect(screen.getByText('matter.labels.pairing-code')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.pairing-code-hint')).toBeInTheDocument();

    fireEvent.click(screen.getByText('matter.buttons.new-code'));
    expect(onNewCode).toHaveBeenCalledTimes(1);
  });

  it('takes the button away while a fabric is being added, and says why', () => {
    render(cardOf({ canChangeCode: false }));

    expect(screen.queryByText('matter.buttons.new-code')).not.toBeInTheDocument();
    expect(screen.getByText('matter.labels.pairing-code-busy')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.pairing-code-hint')).not.toBeInTheDocument();
  });

  it('takes no press while the bridge is busy with the code', () => {
    const onNewCode = vi.fn();
    render(cardOf({ isCodeBusy: true, onNewCode }));

    const button = screen.getByRole('button', { name: 'matter.buttons.new-code' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onNewCode).not.toHaveBeenCalled();
  });

  it('shows the code line without a switch for a bridge that sends no settings', () => {
    render(cardOf({ settings: undefined }));

    expect(screen.getByText('matter.labels.settings')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('matter.buttons.new-code')).toBeInTheDocument();
  });

  it('has no line about the code when there is no way to change it', () => {
    render(cardOf({ onNewCode: undefined }));

    expect(screen.queryByText('matter.labels.pairing-code')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });
});
