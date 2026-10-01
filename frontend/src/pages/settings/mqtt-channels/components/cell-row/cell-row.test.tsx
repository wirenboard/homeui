// @vitest-environment happy-dom
import { render, screen } from '@/test/render';
import { CellRow } from './cell-row';

vi.mock('@/components/table', () => ({
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
vi.mock('@/components/tag', () => ({
  Tag: ({ children, variant }: any) => <span data-testid="tag" data-variant={variant}>{children}</span>,
}));
vi.mock('@/common/links', () => ({
  errorsConvention: 'https://errors.example.com',
}));

function makeCell(overrides: Record<string, any> = {}) {
  return {
    id: 'wb-adc/Vin',
    deviceId: 'wb-adc',
    controlId: 'Vin',
    type: 'voltage',
    value: 12.5,
    error: null,
    ...overrides,
  } as any;
}

describe('CellRow', () => {
  test('renders cell id', () => {
    render(<table><tbody><CellRow cell={makeCell()} /></tbody></table>);
    expect(screen.getByText('wb-adc/Vin')).toBeInTheDocument();
  });

  test('renders cell type', () => {
    render(<table><tbody><CellRow cell={makeCell()} /></tbody></table>);
    expect(screen.getByText('voltage')).toBeInTheDocument();
  });

  test('renders MQTT topic from deviceId and controlId', () => {
    render(<table><tbody><CellRow cell={makeCell()} /></tbody></table>);
    expect(screen.getByText('/devices/wb-adc/controls/Vin')).toBeInTheDocument();
  });

  test('renders cell value as string', () => {
    render(<table><tbody><CellRow cell={makeCell({ value: 12.5 })} /></tbody></table>);
    expect(screen.getByText('12.5')).toBeInTheDocument();
  });

  test('renders boolean value as string', () => {
    render(<table><tbody><CellRow cell={makeCell({ value: true })} /></tbody></table>);
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  test('renders OK tag when no error', () => {
    render(<table><tbody><CellRow cell={makeCell()} /></tbody></table>);
    const tag = screen.getByTestId('tag');
    expect(tag).toHaveTextContent('OK');
    expect(tag).toHaveAttribute('data-variant', 'success');
  });

  test('renders error tag with link when error present', () => {
    render(<table><tbody><CellRow cell={makeCell({ error: ['r'] })} /></tbody></table>);
    const tag = screen.getByTestId('tag');
    expect(tag).toHaveAttribute('data-variant', 'danger');
    const link = tag.closest('a');
    expect(link).toHaveAttribute('href', 'https://errors.example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('renders first error code in error tag', () => {
    render(<table><tbody><CellRow cell={makeCell({ error: ['r', 'w'] })} /></tbody></table>);
    const tag = screen.getByTestId('tag');
    expect(tag).toHaveTextContent('mqtt.labels.error');
  });

  test('renders topic for complex device/control ids', () => {
    render(
      <table>
        <tbody>
          <CellRow
            cell={makeCell({
              id: 'wb-gpio/A1_OUT',
              deviceId: 'wb-gpio',
              controlId: 'A1_OUT',
            })}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('/devices/wb-gpio/controls/A1_OUT')).toBeInTheDocument();
  });

  test('renders null value as string', () => {
    render(<table><tbody><CellRow cell={makeCell({ value: null })} /></tbody></table>);
    expect(screen.getByText('null')).toBeInTheDocument();
  });
});
