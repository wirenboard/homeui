import { makeAutoObservable, runInAction, toJS } from 'mobx';
import { Dashboard, type DashboardBase, dashboardsStore } from '@/stores/dashboards';
import { BindingsStore } from './bindings-store';
import { SvgStore } from './svg-store';

export class EditSvgDashboardPageStore {
  public bindingsStore: BindingsStore;
  public svgStore: SvgStore;
  public dashboard: Dashboard = null;
  public isLoading: boolean = true;
  public svgLoadError: boolean = false;
  // Set when a save is rejected on a 409 (id already taken); shows the message, keeps the editor open.
  public idConflictError: boolean = false;
  public originalId: string = null;
  public commonParameters: Pick<DashboardBase, 'id' | 'name'> & { svg_fullwidth: boolean } = {
    id: '',
    name: '',
    svg_fullwidth: false,
  };
  public swipeParameters: DashboardBase['swipe'] = { enable: false, left: null, right: null };
  // Monotonic guard for overlapping setDashboard runs; trailing writes are skipped once bumped.
  private _loadToken = 0;

  constructor() {
    this.svgStore = new SvgStore();
    this.bindingsStore = new BindingsStore();

    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isValid() {
    return this.commonParameters.id && this.commonParameters.name && this.svgStore.svg && this.isIdUnique;
  }

  // The chosen id must not collide with another dashboard (the one being edited keeps its own id).
  get isIdUnique() {
    const id = this.commonParameters.id;
    if (!id || id === this.originalId) {
      return true;
    }
    return !dashboardsStore.dashboards.has(id);
  }

  setCommonParam<K extends keyof typeof this.commonParameters>(key: K, value: typeof this.commonParameters[K]) {
    runInAction(() => {
      this.commonParameters[key] = value;
      if (key === 'id') {
        // The user is fixing the id — drop a stale 409 message.
        this.idConflictError = false;
      }
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

  async setDashboard(dashboardId: string) {
    // Capture a token so a stale loadSvg from an overlapping run can't write the wrong markup.
    const token = ++this._loadToken;

    const db = dashboardsStore.dashboards.get(dashboardId);
    this.setOriginalId(dashboardId);
    this.dashboard = db || this.#createNewDashboard();
    this.commonParameters.id = this.dashboard.id;
    this.commonParameters.name = this.dashboard.name;
    this.commonParameters.svg_fullwidth = this.dashboard.svg_fullwidth;
    const dashboardsForClicks = dashboardsStore.dashboardsList
      .filter((d) => d.id !== dashboardId)
      .map(({ id, name }) => ({ value: id, label: name }));
    this.bindingsStore.setDashboards(dashboardsForClicks);
    this.bindingsStore.setParams(this.dashboard.svg.params);

    this.swipeParameters = this.dashboard.swipe;

    let svgLoadError = false;
    let markup: string | null = null;
    if (dashboardId) {
      try {
        markup = await dashboardsStore.loadSvg(dashboardId);
      } catch (e) {
        // Flag the load failure so the editor shows an error instead of an empty canvas to overwrite.
        svgLoadError = true;
      }
    }

    if (token !== this._loadToken) {
      return;
    }
    this.svgStore.setSvg(markup);
    runInAction(() => {
      this.svgLoadError = svgLoadError;
      this.isLoading = false;
    });
  }

  setOriginalId(value?: string) {
    this.originalId = value;
  }

  async removeDashboard() {
    await dashboardsStore.deleteDashboard(this.dashboard.id);
  }

  async onSaveDashboard(): Promise<string | null> {
    this.bindingsStore.saveBinding();

    // Build a plain snapshot and write that: this.dashboard is the live store instance, so
    // mutating it before the write would corrupt the store map on a 409/error. We touch the
    // live instance only after a successful save.
    const snapshot: DashboardBase = {
      ...toJS(this.dashboard),
      ...this.commonParameters,
      swipe: { ...this.swipeParameters },
      svg: {
        ...this.dashboard.svg,
        params: this.bindingsStore.params,
        current: this.svgStore.svg,
      },
    };
    if (this.isNew) {
      snapshot.svg_url = 'local';
    }

    runInAction(() => {
      this.idConflictError = false;
    });

    // Single atomic write (metadata + svg.current); the body carries the new id on a rename.
    const result = await dashboardsStore.saveSvgDashboard(this.originalId || snapshot.id, snapshot);
    if (result === 'conflict') {
      runInAction(() => {
        this.idConflictError = true;
      });
      return null;
    }
    if (result === 'error') {
      return null;
    }

    // Save succeeded — sync the working copy with what was persisted.
    runInAction(() => {
      Object.assign(this.dashboard, this.commonParameters);
      this.dashboard.swipe = snapshot.swipe;
      this.dashboard.svg.params = snapshot.svg.params;
      this.dashboard.svg.current = snapshot.svg.current;
      if (this.isNew) {
        this.dashboard.svg_url = 'local';
      }
    });

    this.setOriginalId(snapshot.id);
    return snapshot.id;
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
    );
  }
}
