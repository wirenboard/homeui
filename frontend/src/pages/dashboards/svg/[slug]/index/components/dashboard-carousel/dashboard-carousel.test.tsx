// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { DashboardCarousel } from './dashboard-carousel';

let carouselProps: any = null;

vi.mock('react-responsive-carousel', () => ({
  Carousel: ({ children, ...props }: any) => {
    carouselProps = props;
    return <div data-testid="carousel">{children}</div>;
  },
}));

function makeStore(count: number, overrides: Record<string, any> = {}) {
  return {
    dashboards: Array.from({ length: count }, (_, i) => ({ id: `d${i}` })),
    dashboardIndex: 0,
    dashboardId: 'd0',
    moveToDashboard: vi.fn(),
    ...overrides,
  } as any;
}

beforeEach(() => {
  carouselProps = null;
});

describe('DashboardCarousel', () => {
  test('renders children directly when single dashboard', () => {
    render(
      <DashboardCarousel store={makeStore(1)} width={800}>
        <div>Single</div>
      </DashboardCarousel>,
    );
    expect(screen.getByText('Single')).toBeDefined();
    expect(screen.queryByTestId('carousel')).toBeNull();
  });

  test('renders carousel when multiple dashboards', () => {
    render(
      <DashboardCarousel store={makeStore(3)} width={800}>
        <div>Slide 1</div>
        <div>Slide 2</div>
        <div>Slide 3</div>
      </DashboardCarousel>,
    );
    expect(screen.getByTestId('carousel')).toBeDefined();
    expect(screen.getByText('Slide 1')).toBeDefined();
  });

  test('passes selectedItem from store', () => {
    render(
      <DashboardCarousel store={makeStore(3, { dashboardIndex: 2 })} width={800}>
        <div>A</div><div>B</div><div>C</div>
      </DashboardCarousel>,
    );
    expect(carouselProps.selectedItem).toBe(2);
  });

  test('calculates swipeScrollTolerance from width', () => {
    render(
      <DashboardCarousel store={makeStore(2)} width={900}>
        <div>A</div><div>B</div>
      </DashboardCarousel>,
    );
    expect(carouselProps.swipeScrollTolerance).toBe(300);
  });

  test('onChange calls moveToDashboard with dashboard id', () => {
    const store = makeStore(3);
    render(
      <DashboardCarousel store={store} width={800}>
        <div>A</div><div>B</div><div>C</div>
      </DashboardCarousel>,
    );
    carouselProps.onChange(2);
    expect(store.moveToDashboard).toHaveBeenCalledWith('d2');
  });
});
