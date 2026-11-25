// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { copyToClipboard } from '@/utils/clipboard';
import {
  Details, DetailsToggle, Facts, Section,
} from './details';

vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

const COPY = { name: 'matter.buttons.copy' };

describe('Details, the copy of what a row says', () => {
  beforeEach(() => vi.mocked(copyToClipboard).mockClear());

  it('copies the details as text: the name of the row, a section after an empty line, a fact as "name: value"', () => {
    render(
      <Details title="Kitchen socket" footer={<button type="button">a way out</button>}>
        <Section title="Pairing">
          <Facts
            rows={[
              ['Vendor', 'Apple Home (0x1349)'],
              // What stands in two lines on the screen is two pieces of one fact.
              ['Command', (
                <span key="command">
                  <span>Socket - on</span>
                  <span className="matter-detailsNote">sent by the hub</span>
                </span>
              )],
            ]}
          />
          <span className="matter-detailsAdvice">Pair the bridge anew.</span>
        </Section>
        <Section title="Status">
          {/* A control of the page: its button and the hint beside it are not what the row says. */}
          <div data-nocopy>
            <button type="button">Check</button>
            <span className="matter-detailsNote">the bridge will ask the app</span>
          </div>
          <Facts rows={[['Heard', 'a minute ago']]} />
        </Section>
      </Details>,
    );

    fireEvent.click(screen.getByRole('button', COPY));

    // The name of the row first: nothing else in the details says whose they are.
    expect(copyToClipboard).toHaveBeenCalledWith([
      'Kitchen socket',
      '',
      'Pairing',
      'Vendor: Apple Home (0x1349)',
      // A remark under a value is the same fact, in brackets.
      'Command: Socket - on (sent by the hub)',
      'Pair the bridge anew.',
      '',
      'Status',
      'Heard: a minute ago',
    ].join('\n'));
  });

  it('says the copy was made, and puts at its foot what the card gave it', () => {
    render(
      <Details title="Kitchen socket" footer={<button type="button">a way out</button>}>
        <Section title="Pairing">text</Section>
      </Details>,
    );

    fireEvent.click(screen.getByRole('button', COPY));

    // The icon and the hint change for the eye, the status says it to a screen reader.
    expect(screen.getByRole('button', COPY)).toHaveAttribute('title', 'matter.buttons.copied');
    expect(screen.getByRole('status').textContent).toBe('matter.labels.copied');
    expect(screen.getByRole('button', { name: 'a way out' })).toBeInTheDocument();
  });
});

describe('DetailsToggle', () => {
  it('says whether the details are open, and asks to change that', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<DetailsToggle isOpened={false} label="Details of Socket" onToggle={onToggle} />);
    const toggle = () => screen.getByRole('button', { name: 'Details of Socket' });
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle());
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<DetailsToggle label="Details of Socket" isOpened onToggle={onToggle} />);
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });
});
