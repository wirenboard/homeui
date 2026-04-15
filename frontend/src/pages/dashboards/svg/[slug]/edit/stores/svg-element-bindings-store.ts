import { type IReactionDisposer, makeAutoObservable, reaction } from 'mobx';
import type { ParamAction, SvgDashboardConstructor, SvgEditableParam } from '@/stores/dashboards';
import { type DashboardSvgParam } from './dashboard-svg-param';

const addEnableReaction = (binding: SvgEditableParam, params: Partial<Record<ParamAction, SvgEditableParam>>) => {
  return reaction(
    () => binding.enable,
    (value) => {
      if (value && !binding.channel) {
        Object.entries(params).some(([_key, param]) => {
          if (param?.enable) {
            const channel = param?.channel;
            if (channel) {
              binding.channel = channel;
              return true;
            }
          }
          return false;
        });
      }
    },
  );
};

export class SvgElementBindingsStore {
  public id = null;
  public element = null;
  public tagName = '';
  public params: Partial<SvgDashboardConstructor> = {};
  declare paramsStoreDisposers: IReactionDisposer[];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.paramsStoreDisposers = [];
  }

  get isSelected() {
    return !!this.element;
  }

  get elementCaption() {
    const captions = {
      g: 'edit-svg-dashboard.labels.group',
      text: 'edit-svg-dashboard.labels.text',
      path: 'edit-svg-dashboard.labels.path',
      circle: 'edit-svg-dashboard.labels.circle',
      rect: 'edit-svg-dashboard.labels.rect',
    };
    return captions[this.tagName] || this.tagName;
  }

  makeNewParamsStore() {
    this.paramsStoreDisposers.forEach((disposer) => disposer());
    this.paramsStoreDisposers = [];
    this.params = {};
  }

  addParam(key: ParamAction, value: SvgEditableParam) {
    this.params[key] = value;
    this.paramsStoreDisposers.push(addEnableReaction(this.params[key], this.params));
  }

  setParamValue<K extends keyof SvgEditableParam>(param: ParamAction, key: K, value: SvgEditableParam[K]) {
    this.params[param]![key] = value;
  }

  setSelectedElement(element: Element, id: string, params: DashboardSvgParam) {
    this.clearSelection();
    if (element) {
      element.classList.add('selected');
      this.element = element;
      this.id = id;
      if (this.tagName !== element.tagName) {
        this.makeNewParamsStore();
        if (element.tagName === 'text') {
          this.addParam('read', { enable: false, channel: null, value: '' });
        }
        this.addParam('write', { enable: false, channel: null, check: false, value: { on: 1, off: 0 }, dashboard: '' });
        this.addParam('click', { enable: false, dashboard: '' });
        this.addParam('style', { enable: false, channel: null, value: '' });
        this.addParam('visible', { enable: false, channel: null, condition: '', value: '' });
        this.addParam('long-press', { enable: false, dashboard: '' });
        this.addParam(
          'long-press-write',
          { enable: false, channel: null, check: false, value: { on: 1, off: 0 }, dashboard: '' },
        );
        this.tagName = element.tagName;
      }

      Object.entries(params).forEach(([key, value]) => {
        if (this.params[key]) {
          this.params[key] = value || undefined;
        }
      });
    }
  }

  clearSelection() {
    this.tagName = '';
    this.id = null;
    if (Object.keys(this?.params).length) {
      this.makeNewParamsStore();
    }
    if (this.element) {
      this.element.classList.remove('selected');
    }
    this.element = null;
  }
}
