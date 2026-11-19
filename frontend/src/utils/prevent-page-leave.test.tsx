// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { usePreventLeavePage } from './prevent-page-leave';

vi.mock('@/i18n/config', () => ({
  default: { t: (key: string) => key },
}));

const Editor = () => {
  const { isDirty, setIsDirty } = usePreventLeavePage();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="dirty">{String(isDirty)}</span>
      <button onClick={() => setIsDirty(true)}>edit</button>
      <button onClick={() => navigate('/other')}>leave</button>
      <button
        onClick={() => {
          // same tick: clear dirty flag and navigate (as save() does for a new rule)
          setIsDirty(false);
          navigate('/other');
        }}
      >
        save
      </button>
    </div>
  );
};

const renderRouter = () => {
  const router = createMemoryRouter(
    [
      { path: '/edit', element: <Editor /> },
      { path: '/other', element: <div data-testid="other">other</div> },
    ],
    { initialEntries: ['/edit'] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const confirmMock = vi.fn<(message?: string) => boolean>();

beforeEach(() => {
  confirmMock.mockReset();
  window.confirm = confirmMock;
});

describe('usePreventLeavePage', () => {
  test('navigates freely when not dirty', async () => {
    renderRouter();
    await act(async () => {
      fireEvent.click(screen.getByText('leave'));
    });
    expect(screen.getByTestId('other')).toBeDefined();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  test('asks for confirmation when leaving a dirty page and stays on decline', async () => {
    confirmMock.mockReturnValue(false);
    const router = renderRouter();
    fireEvent.click(screen.getByText('edit'));
    await act(async () => {
      fireEvent.click(screen.getByText('leave'));
    });
    expect(confirmMock).toHaveBeenCalledWith('common.prompt.dirty');
    expect(router.state.location.pathname).toBe('/edit');
  });

  test('leaves a dirty page when confirmed', async () => {
    confirmMock.mockReturnValue(true);
    renderRouter();
    fireEvent.click(screen.getByText('edit'));
    await act(async () => {
      fireEvent.click(screen.getByText('leave'));
    });
    expect(screen.getByTestId('other')).toBeDefined();
  });

  test('does not block navigation issued in the same tick as setIsDirty(false)', async () => {
    renderRouter();
    fireEvent.click(screen.getByText('edit'));
    expect(screen.getByTestId('dirty').textContent).toBe('true');
    await act(async () => {
      fireEvent.click(screen.getByText('save'));
    });
    expect(confirmMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('other')).toBeDefined();
  });
});
