import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

interface AppRenderOptions extends RenderOptions {
  initialEntries?: string[];
}

function renderWithRouter(
  ui: ReactElement,
  { initialEntries = ['/'], ...options }: AppRenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
export { renderWithRouter as render };
