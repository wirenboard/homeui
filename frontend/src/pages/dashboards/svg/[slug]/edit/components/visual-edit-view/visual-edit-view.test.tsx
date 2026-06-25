// @vitest-environment happy-dom
import { Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent } from '@/test/render';
import { VisualEditView } from './visual-edit-view';

const { openFilePickerMock } = vi.hoisted(() => ({ openFilePickerMock: vi.fn() }));

vi.mock('@/components/tooltip', () => ({ Tooltip: ({ children }: any) => <div>{children}</div> }));
vi.mock('use-file-picker', () => ({
  useFilePicker: () => ({ openFilePicker: openFilePickerMock }),
}));
vi.mock('../svg-view', () => ({
  SvgView: () => <div data-testid="svg-editor-view" />,
}));
vi.mock('./components/visual-bindings-editor', () => ({
  VisualBindingsEditor: () => <div data-testid="bindings-editor" />,
}));

function makeStore(hasSvg = true, isSelected = false) {
  return {
    svgStore: {
      svg: hasSvg ? '<svg/>' : null,
      hasSvg,
      setSvg: vi.fn(),
      exportSvg: vi.fn(),
    },
    bindingsStore: {
      startJsonEditing: vi.fn(),
      onSelectSvgElement: vi.fn(),
      editable: { isSelected },
    },
    commonParameters: { id: 'dash1', name: 'My SVG', svg_fullwidth: false },
    swipeParameters: { enable: false, left: null, right: null },
    setCommonParam: vi.fn(),
    setSwipeParameters: vi.fn(),
  } as any;
}

function makeDashboardsStore() {
  return {
    dashboards: new Map([
      ['d2', { id: 'd2', name: 'Other', isSvg: true }],
    ]),
  } as any;
}

function renderView(store = makeStore(), dbStore = makeDashboardsStore()) {
  return render(
    <Routes>
      <Route
        path="/dashboards/svg/edit/:id"
        element={
          <VisualEditView store={store} dashboardsStore={dbStore} devices={[]} />
        }
      />
    </Routes>,
    { initialEntries: ['/dashboards/svg/edit/dash1'] },
  );
}

describe('VisualEditView', () => {
  test('renders svg view when svg is loaded', () => {
    renderView();
    expect(screen.getByTestId('svg-editor-view')).toBeDefined();
  });

  test('renders load svg button when no svg', () => {
    renderView(makeStore(false));
    expect(screen.getByText('edit-svg-dashboard.buttons.load-svg')).toBeDefined();
  });

  test('renders common parameters fields', () => {
    renderView();
    expect(screen.getByText('edit-svg-dashboard.labels.common-parameters-id')).toBeDefined();
    expect(screen.getByText('edit-svg-dashboard.labels.common-parameters-name')).toBeDefined();
    expect(screen.getByText('edit-svg-dashboard.labels.common-parameters-fullscreen')).toBeDefined();
  });

  test('renders bindings title when svg loaded', () => {
    renderView();
    expect(screen.getByText('edit-svg-dashboard.labels.bindings-title')).toBeDefined();
  });

  test('renders select caption alert', () => {
    renderView();
    expect(screen.getByText('edit-svg-dashboard.labels.select-caption')).toBeDefined();
  });

  test('renders edit json button', () => {
    renderView();
    expect(screen.getByText('edit-svg-dashboard.buttons.edit-json')).toBeDefined();
  });

  test('shows bindings editor when element is selected', () => {
    renderView(makeStore(true, true));
    expect(screen.getByTestId('bindings-editor')).toBeDefined();
  });

  test('hides bindings editor when no element selected', () => {
    renderView(makeStore(true, false));
    expect(screen.queryByTestId('bindings-editor')).toBeNull();
  });

  test('renders swipe enable toggle', () => {
    renderView();
    expect(screen.getByText('edit-svg-dashboard.labels.swipe-enable')).toBeDefined();
  });

  test('renders download svg button when svg loaded', () => {
    renderView();
    expect(screen.getByLabelText('edit-svg-dashboard.buttons.download-svg')).toBeDefined();
  });

  test('edit json button calls startJsonEditing', () => {
    const store = makeStore();
    renderView(store);
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.edit-json'));
    expect(store.bindingsStore.startJsonEditing).toHaveBeenCalled();
  });

  test('download button calls exportSvg with dashboard name', () => {
    const store = makeStore();
    renderView(store);
    fireEvent.click(screen.getByLabelText('edit-svg-dashboard.buttons.download-svg'));
    expect(store.svgStore.exportSvg).toHaveBeenCalledWith('My SVG');
  });

  test('hides bindings section when no svg', () => {
    renderView(makeStore(false));
    expect(screen.queryByText('edit-svg-dashboard.labels.bindings-title')).toBeNull();
    expect(screen.queryByText('edit-svg-dashboard.buttons.edit-json')).toBeNull();
  });

  test('hides download button when no svg', () => {
    renderView(makeStore(false));
    expect(screen.queryByLabelText('edit-svg-dashboard.buttons.download-svg')).toBeNull();
  });

  test('load svg button calls openFilePicker', () => {
    openFilePickerMock.mockClear();
    renderView(makeStore(false));
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.load-svg'));
    expect(openFilePickerMock).toHaveBeenCalled();
  });
});
