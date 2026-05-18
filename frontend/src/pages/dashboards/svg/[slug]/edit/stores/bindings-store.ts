import cloneDeep from 'lodash/cloneDeep';
import { action, makeObservable, observable } from 'mobx';
import type { SvgDashboardConstructor, SvgParam } from '@/stores/dashboards';
import { DashboardSvgParam } from './dashboard-svg-param';
import { SvgElementBindingsStore } from './svg-element-bindings-store';

export class BindingsStore {
  public jsonEditMode = false;
  public params: Partial<SvgDashboardConstructor>[] = [];
  public editable: SvgElementBindingsStore;
  public jsonSource = '';
  public dashboards: { label: string; value: string } [] = [];

  constructor() {
    this.editable = new SvgElementBindingsStore();

    makeObservable(this, {
      editable: observable,
      jsonEditMode: observable,
      setJsonSource: action,
      startJsonEditing: action,
      cancelEditingJson: action,
      saveJson: action,
    });
  }

  setParams(params: Partial<SvgDashboardConstructor>[]) {
    this.params = cloneDeep(params);
  }

  setJsonSource(jsonSource: string) {
    this.jsonSource = jsonSource;
  }

  startJsonEditing() {
    this.jsonSource = JSON.stringify(this.params, null, 2);
    this.jsonEditMode = true;
    this.editable.clearSelection();
  }

  cancelEditingJson() {
    this.jsonEditMode = false;
  }

  saveJson() {
    try {
      this.params = JSON.parse(this.jsonSource);
      this.jsonEditMode = false;
    } catch (e) {
      alert(e);
    }
  }

  setDashboards(dashboards: { label: string; value: string } []) {
    this.dashboards = dashboards;
  }

  onSelectSvgElement(element: Element) {
    this.saveBinding();
    if (element) {
      const id = element.getAttribute('data-svg-param-id') || element.getAttribute('id');
      if (id === null) {
        return;
      }
      let data: Partial<SvgDashboardConstructor> = this.params.find((param) => param.id === id);
      if (!data) {
        data = {
          id,
        };
      }
      this.editable.setSelectedElement(element, id, new DashboardSvgParam(data));
    } else {
      this.editable.clearSelection();
    }
  }

  saveBinding() {
    if (this.editable.id) {
      const hasBindings = (param: SvgParam) => {
        return Object.values(param).some((p) => p?.enable);
      };

      let oldData = this.params.find((param: SvgDashboardConstructor) => param.id === this.editable.id);
      let res = this.editable.params;
      if (oldData) {
        if (hasBindings(res as SvgParam)) {
          Object.assign(oldData, this.editable.params as SvgParam);
        } else {
          this.params = this.params.filter((param) => param.id !== this.editable.id);
        }
      } else {
        if (hasBindings(res as SvgParam)) {
          res.id = this.editable.id;
          this.params.push(res);
        }
      }
    }
  }
}
