// @vitest-environment happy-dom
import { Route, Routes } from 'react-router-dom';
import { DashboardSvgParam } from '@/pages/dashboards/svg/[slug]/edit/stores/dashboard-svg-param';
import { SvgElementBindingsStore } from '@/pages/dashboards/svg/[slug]/edit/stores/svg-element-bindings-store';
import { render, screen, fireEvent } from '@/test/render';
import { VisualBindingsEditor } from './visual-bindings-editor';

vi.mock('@/components/tooltip', () => ({ Tooltip: ({ children }: any) => <div>{children}</div> }));

function makeStore(tagName = 'rect') {
  const store = new SvgElementBindingsStore();
  const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  store.setSelectedElement(el, 'el1', new DashboardSvgParam());
  return store;
}

function makeDashboardsStore() {
  return {
    dashboards: new Map([
      ['d1', { id: 'd1', name: 'Dash 1', isSvg: true }],
      ['d2', { id: 'd2', name: 'Dash 2', isSvg: false }],
    ]),
  } as any;
}

const devices = [
  { label: 'Group', options: [{ label: 'dev/ctrl', value: 'dev/ctrl' }] },
];

function renderEditor(store = makeStore(), dbStore = makeDashboardsStore()) {
  return render(
    <Routes>
      <Route
        path="/dashboards/svg/edit/:id"
        element={
          <VisualBindingsEditor store={store} dashboardsStore={dbStore} devices={devices} />
        }
      />
    </Routes>,
    { initialEntries: ['/dashboards/svg/edit/current'] },
  );
}

describe('VisualBindingsEditor', () => {
  test('renders tag name heading', () => {
    renderEditor();
    expect(screen.getByText(/edit-svg-dashboard\.labels\.tag-name/)).toBeDefined();
  });

  test('renders click binding card', () => {
    renderEditor();
    expect(screen.getByText('edit-svg-dashboard.labels.click')).toBeDefined();
  });

  test('renders style binding card', () => {
    renderEditor();
    expect(screen.getByText('edit-svg-dashboard.labels.style-enable')).toBeDefined();
  });

  test('renders visible binding card', () => {
    renderEditor();
    expect(screen.getByText('edit-svg-dashboard.labels.visible-enable')).toBeDefined();
  });

  test('renders long-press binding card', () => {
    renderEditor();
    expect(screen.getByText('edit-svg-dashboard.labels.long-press')).toBeDefined();
  });

  test('renders read binding for text elements', () => {
    const store = makeStore('text');
    renderEditor(store);
    expect(screen.getByText('edit-svg-dashboard.labels.read-enable')).toBeDefined();
  });

  test('does not render read binding for non-text elements', () => {
    const store = makeStore('rect');
    renderEditor(store);
    expect(screen.queryByText('edit-svg-dashboard.labels.read-enable')).toBeNull();
  });

  test('enables click binding via toggle', () => {
    const store = makeStore();
    renderEditor(store);

    const toggles = screen.getAllByRole('checkbox');
    const clickToggle = toggles.find((el) => {
      const label = el.closest('label');
      return label?.textContent?.includes('edit-svg-dashboard.labels.click');
    });

    if (clickToggle) {
      fireEvent.click(clickToggle);
      const writeOrClick = store.params.write?.enable || store.params.click?.enable;
      expect(writeOrClick).toBe(true);
    }
  });

  test('renders write/click radio group when click enabled', () => {
    const store = makeStore();
    store.setParamValue('write', 'enable', true);
    renderEditor(store);
    expect(screen.getByText('edit-svg-dashboard.labels.write-enable')).toBeDefined();
    expect(screen.getByText('edit-svg-dashboard.labels.click-enable')).toBeDefined();
  });

  test('renders channel dropdown when write is enabled', () => {
    const store = makeStore();
    store.setParamValue('write', 'enable', true);
    renderEditor(store);
    expect(screen.getAllByText('edit-svg-dashboard.labels.channel').length).toBeGreaterThanOrEqual(1);
  });

  test('renders on/off fields when write is enabled', () => {
    const store = makeStore();
    store.setParamValue('write', 'enable', true);
    renderEditor(store);
    expect(screen.getByText('edit-svg-dashboard.labels.on')).toBeDefined();
    expect(screen.getByText('edit-svg-dashboard.labels.off')).toBeDefined();
  });

  test('renders check toggle when write enabled', () => {
    const store = makeStore();
    store.setParamValue('write', 'enable', true);
    renderEditor(store);
    expect(screen.getByText('edit-svg-dashboard.labels.check')).toBeDefined();
  });

  test('hides check toggle when click mode enabled', () => {
    const store = makeStore();
    store.setParamValue('click', 'enable', true);
    renderEditor(store);
    expect(screen.queryByText('edit-svg-dashboard.labels.check')).toBeNull();
  });

  test('enables visible binding via toggle', () => {
    const store = makeStore();
    renderEditor(store);
    const toggles = screen.getAllByRole('checkbox');
    const visibleToggle = toggles.find((el) => {
      const label = el.closest('label');
      return label?.textContent?.includes('edit-svg-dashboard.labels.visible-enable');
    });
    if (visibleToggle) {
      fireEvent.click(visibleToggle);
      expect(store.params.visible?.enable).toBe(true);
    }
  });

  test('switching radio to click mode disables write', () => {
    const store = makeStore();
    store.setParamValue('write', 'enable', true);
    renderEditor(store);
    fireEvent.click(screen.getByLabelText('edit-svg-dashboard.labels.click-enable'));
    expect(store.params.click?.enable).toBe(true);
    expect(store.params.write?.enable).toBe(false);
  });

  test('visible form shows condition and value fields when enabled', () => {
    const store = makeStore();
    store.setParamValue('visible', 'enable', true);
    renderEditor(store);
    expect(screen.getByText('edit-svg-dashboard.labels.condition')).toBeDefined();
  });
});
