// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { PageLayout } from './page';

vi.mock('@/utils/focus-content', () => ({
  focusToMainContent: vi.fn(),
}));
vi.mock('./components/expose-check', () => ({
  ExposeCheck: () => null,
}));
vi.mock('./components/info', () => ({
  Info: () => null,
}));
vi.mock('./components/loader', () => ({
  PageLoader: () => <div data-testid="page-loader" />,
}));

describe('PageLayout', () => {
  test('renders title and children', () => {
    render(<PageLayout title="Dashboard" hasRights>Content here</PageLayout>);
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Content here')).toBeDefined();
  });

  test('renders actions', () => {
    render(
      <PageLayout title="T" actions={<button>Action</button>} hasRights>x</PageLayout>,
    );
    expect(screen.getByText('Action')).toBeDefined();
  });

  test('shows loader when isLoading', () => {
    render(<PageLayout title="T" hasRights isLoading>x</PageLayout>);
    expect(screen.getByTestId('page-loader')).toBeDefined();
  });

  test('shows access denied when no rights', () => {
    render(<PageLayout title="T" hasRights={false}>x</PageLayout>);
    expect(screen.getByText('page.labels.access-denied')).toBeDefined();
  });

  test('shows 404 page for 404 error', () => {
    render(
      <PageLayout
        title="T"
        errors={[{ variant: 'danger', text: 'Not found', code: 404 }]}
        hasRights
      >
        x
      </PageLayout>,
    );
    expect(screen.getByText('page.labels.not-found')).toBeDefined();
  });

  test('renders error alerts', () => {
    render(
      <PageLayout
        title="T"
        errors={[{ variant: 'danger', text: 'Something broke' }]}
        hasRights
      >
        x
      </PageLayout>,
    );
    expect(screen.getByText('Something broke')).toBeDefined();
  });

  test('hides header when isHideHeader', () => {
    render(<PageLayout title="Hidden" hasRights isHideHeader>x</PageLayout>);
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  test('renders footer', () => {
    render(<PageLayout title="T" footer={<div>Footer</div>} hasRights>x</PageLayout>);
    expect(screen.getByText('Footer')).toBeDefined();
  });

  test('shows content with overlay loader', () => {
    render(
      <PageLayout title="T" loadingOptions={{ overlay: true }} hasRights isLoading>
        Under overlay
      </PageLayout>,
    );
    expect(screen.getByText('Under overlay')).toBeDefined();
  });
});
