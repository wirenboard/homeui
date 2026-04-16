import { makeAutoObservable, runInAction } from 'mobx';
import { Dashboard, type DashboardsStore, type DashboardBase } from '@/stores/dashboards';
import { BindingsStore } from './bindings-store';
import { SvgStore } from './svg-store';

export class EditSvgDashboardPageStore {
  public bindingsStore: BindingsStore;
  public svgStore: SvgStore;
  public dashboard: Dashboard = null;
  public isLoading: boolean = true;
  public originalId: string = null;
  public commonParameters: Pick<DashboardBase, 'id' | 'name'> & { svg_fullwidth: boolean } = {
    id: '',
    name: '',
    svg_fullwidth: false,
  };
  public swipeParameters: DashboardBase['swipe'] = { enable: false, left: null, right: null };

  #dashboardsStore: DashboardsStore;

  constructor(dashboardsStore: DashboardsStore) {
    this.#dashboardsStore = dashboardsStore;
    this.svgStore = new SvgStore();
    this.bindingsStore = new BindingsStore();

    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isValid() {
    return this.commonParameters.id && this.commonParameters.name && this.svgStore.svg;
  }

  setCommonParam<K extends keyof typeof this.commonParameters>(key: K, value: typeof this.commonParameters[K]) {
    runInAction(() => {
      this.commonParameters[key] = value;
    });
  }

  setSwipeParameters<K extends keyof typeof this.swipeParameters>(key: K, value: typeof this.swipeParameters[K]) {
    runInAction(() => {
      this.swipeParameters[key] = value;
    });
  }

  get isNew() {
    return !this.originalId;
  }

  setDashboard(dashboardId: string) {
    const db = this.#dashboardsStore.dashboards.get(dashboardId);
    this.setOriginalId(dashboardId);
    this.dashboard = db || this.#createNewDashboard();
    this.commonParameters.id = this.dashboard.id;
    this.commonParameters.name = this.dashboard.name;
    this.commonParameters.svg_fullwidth = this.dashboard.svg_fullwidth;
    const dashboardsForClicks = this.#dashboardsStore.dashboardsList
      .filter((d) => d.id !== dashboardId)
      .map(({ id, name }) => ({ value: id, label: name }));
    this.bindingsStore.setDashboards(dashboardsForClicks);
    this.bindingsStore.setParams(this.dashboard.svg.params);

    this.swipeParameters = this.dashboard.swipe;

    this.svgStore.setSvg(!dashboardId ? null : this.dashboard?.svg?.current);
    this.isLoading = false;
  }

  setOriginalId(value?: string) {
    this.originalId = value;
  }

  async removeDashboard() {
    await this.#dashboardsStore.deleteDashboard(this.dashboard.id);
  }

  async onSaveDashboard(): Promise<string> {
    this.bindingsStore.saveBinding();
    Object.assign(this.dashboard, this.commonParameters);
    this.dashboard.swipe = this.swipeParameters;
    this.dashboard.svg.current = this.svgStore.svg;
    this.dashboard.svg.params = this.bindingsStore.params;

    if (this.isNew) {
      this.dashboard.svg_url = 'local';
      await this.#dashboardsStore.addDashboard(this.dashboard);
    } else {
      await this.#dashboardsStore.updateDashboard(this.originalId, this.dashboard);
    }
    return this.dashboard.id;
  }

  #createNewDashboard() {
    return new Dashboard(
      {
        id: '',
        name: '',
        isSvg: true,
        svg_url: '',
        svg_fullwidth: true,
        widgets: [],
        swipe: {
          enable: false,
          left: null,
          right: null,
        },
        svg: {
          original: {},
          current: '',
          params: [],
        },
      },
      this.#dashboardsStore,
    );
  }
}
