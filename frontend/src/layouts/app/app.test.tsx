// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import type * as ReactRouterDom from 'react-router-dom';
import { HttpsSetupPhase, uiStore } from '@/stores/ui';
import { App } from './app';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof ReactRouterDom>(),
  RouterProvider: () => <div data-testid="router" />,
}));

describe('App', () => {
  beforeEach(() => {
    uiStore.setHttpsSetupPhase(HttpsSetupPhase.Checking);
  });

  it('names the connection check while it is unknown whether HTTPS is going to be set up', () => {
    render(<App />);

    expect(screen.getByText('common.labels.checking-connection')).toBeDefined();
  });

  it('names the HTTPS setup once a certificate is being issued', () => {
    uiStore.setHttpsSetupPhase(HttpsSetupPhase.IssuingCertificate);

    render(<App />);

    expect(screen.getByText('common.labels.setting-up-https')).toBeDefined();
  });

  it('keeps the loader until both the HTTPS setup is done and the router is built', () => {
    const router = {} as ReturnType<typeof ReactRouterDom.createHashRouter>;

    const { rerender } = render(<App router={router} />);
    expect(screen.queryByTestId('router')).toBeNull();

    uiStore.setHttpsSetupPhase(HttpsSetupPhase.Done);
    rerender(<App />);
    expect(screen.queryByTestId('router')).toBeNull();

    rerender(<App router={router} />);
    expect(screen.getByTestId('router')).toBeDefined();
  });
});
