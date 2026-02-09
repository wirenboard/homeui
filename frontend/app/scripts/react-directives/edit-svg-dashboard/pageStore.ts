// @ts-nocheck

import { makeObservable, action, computed } from 'mobx';
import { type DashboardsStore } from '@/stores/dashboards';
import i18n from '../../i18n/react/config';
import AccessLevelStore from '../components/access-level/accessLevelStore';
import ConfirmModalState from '../components/modals/confirmModalState';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import { BooleanStore } from '../forms/booleanStore';
import { FormStore } from '../forms/formStore';
import { OptionsStore } from '../forms/optionsStore';
import { StringStore } from '../forms/stringStore';
import { makeNotEmptyValidator } from '../forms/stringValidators';
import BindingsStore from './bindingsStore';
import SvgStore from './svgStore';

const makeCommonParametersStore = () => {
  let res = new FormStore('edit-svg-dashboard.labels.common-parameters-title');
  res.add(
    'id',
    new StringStore({
      name: i18n.t('edit-svg-dashboard.labels.common-parameters-id'),
    })
  );
  res.add(
    'name',
    new StringStore({
      name: i18n.t('edit-svg-dashboard.labels.common-parameters-name'),
      validator: makeNotEmptyValidator(),
    })
  );
  res.add(
    'svg_fullwidth',
    new BooleanStore({
      name: i18n.t('edit-svg-dashboard.labels.common-parameters-fullscreen'),
    })
  );
  return res;
};

const makeSwipeParametersStore = () => {
  let res = new FormStore();
  res.add(
    'enable',
    new BooleanStore({
      name: i18n.t('edit-svg-dashboard.labels.swipe-enable'),
    })
  );
  res.add(
    'left',
    new OptionsStore({
      name: i18n.t('edit-svg-dashboard.labels.left'),
      placeholder: i18n.t('edit-svg-dashboard.labels.select-dashboard-placeholder'),
      strict: false,
    })
  );
  res.add(
    'right',
    new OptionsStore({
      name: i18n.t('edit-svg-dashboard.labels.right'),
      placeholder: i18n.t('edit-svg-dashboard.labels.select-dashboard-placeholder'),
      strict: false,
    })
  );
  return res;
};

const makeOptionsFromDashboards = (dashboards) => {
  return dashboards.map((d) => ({
    label: d.name,
    value: d.id,
  }));
};

class EditSvgDashboardPageStore {
  #dashboardsStore : DashboardsStore;
  openPage : (page : string, params : any) => void;

  constructor(dashboardsStore, openPage, rolesFactory) {
    this.dashboard = null;
    this.originalId = null;
    this.openPage = openPage;
    this.#dashboardsStore = dashboardsStore;
    this.svgStore = new SvgStore();
    this.confirmModalState = new ConfirmModalState();
    this.bindingsStore = new BindingsStore();
    this.commonParameters = makeCommonParametersStore();
    this.swipeParameters = makeSwipeParametersStore();
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_TWO);
    this.pageWrapperStore = new PageWrapperStore();

    makeObservable(this, {
      isValid: computed,
      isNew: computed,
      setDashboard: action,
    });
  }

  get isValid() {
    return this.svgStore.hasSvg && !this.commonParameters.hasErrors;
  }

  get isNew() {
    return !this.originalId;
  }

  setError(msg) {
    this.pageWrapperStore.setError(msg);
  }

  setLoading(isLoading) {
    this.pageWrapperStore.setLoading(isLoading);
  }

  setDashboard(dashboardId, uiConfig, deviceData, localeId) {
    if (this.accessLevelStore.accessGranted) {
      const dashboards = uiConfig.filtered().dashboards;
      this.dashboard = dashboardId
        ? uiConfig.getDashboard(dashboardId)
        : uiConfig.addDashboardWithSvg();
      this.commonParameters.setValue(this.dashboard.content);
      this.bindingsStore.setDevices(deviceData, localeId);
      const dashboardsForClicks = makeOptionsFromDashboards(
        dashboards.filter((d) => d.id !== dashboardId)
      );
      this.bindingsStore.setDashboards(dashboardsForClicks);
      this.bindingsStore.setParams(this.dashboard.content.svg.params);

      const dashboardsForSwipe = makeOptionsFromDashboards(
        dashboards.filter((d) => d.isSvg && d.id !== dashboardId)
      );
      this.swipeParameters.params.left.setOptions(dashboardsForSwipe);
      this.swipeParameters.params.right.setOptions(dashboardsForSwipe);
      this.swipeParameters.setValue(this.dashboard.content.swipe);

      this.svgStore.setSvg(this.dashboard?.content?.svg?.current);
    }
    this.setLoading(false);
  }

  setOriginalId(value) {
    this.originalId = value;
  }

  async onRemoveDashboard() {
    if (!this.isNew) {
      const action = await this.confirmModalState.show(
        i18n.t('edit-svg-dashboard.labels.confirm-remove'),
        [
          {
            label: i18n.t('edit-svg-dashboard.buttons.remove'),
            type: 'danger',
            result: 'delete',
          },
        ]
      );
      if (action !== 'delete') {
        return;
      }
    }
    this.dashboard.remove();
    this.openPage('dashboards');
  }

  async onSaveDashboard(initId: string) {
    this.bindingsStore.saveBinding();
    Object.assign(this.dashboard.content, this.commonParameters.value);
    this.dashboard.content.swipe = this.swipeParameters.value;
    this.dashboard.content.svg.current = this.svgStore.svg;
    this.dashboard.content.svg.params = this.bindingsStore.params;

    if (this.dashboard.content.isNew) {
      this.dashboard.content.svg_url = 'local';
      delete this.dashboard.content.isNew;
      await this.#dashboardsStore.addDashboard(this.dashboard.content);
      this.openPage('dashboard-svg', { id: this.dashboard.content.id });
    } else {
      await this.#dashboardsStore.updateDashboard(initId, this.dashboard.content);
      this.openPage('dashboard-svg-edit', { id: this.dashboard.content.id });
    }
  }
}

export default EditSvgDashboardPageStore;
