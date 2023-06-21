'use strict';

import { makeObservable, observable, action, computed } from 'mobx';
import { FormStore } from '../../react-directives/forms/formStore';
import { BooleanStore } from '../../react-directives/forms/booleanStore';
import { StringStore } from '../../react-directives/forms/stringStore';
import { OptionsStore } from '../../react-directives/forms/optionsStore';
import i18n from '../../i18n/react/config';
import { makeNotEmptyValidator } from '../forms/stringValidators';
import ConfirmModalState from '../components/modals/confirmModalState';
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
      id: 'svg_fullwidth',
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
      id: 'edit-svg-dashboard.labels.swipe-enable',
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

class EditSvgDashboardPageStore {
  constructor(showDashboardsList, preview) {
    this.loading = true;
    this.error = '';
    this.dashboard = null;
    this.originalId = null;
    this.showDashboardsList = showDashboardsList;
    this.preview = preview;
    this.svgStore = new SvgStore();
    this.confirmModalState = new ConfirmModalState();
    this.bindingsStore = new BindingsStore();
    this.commonParameters = makeCommonParametersStore();
    this.swipeParameters = makeSwipeParametersStore();

    makeObservable(this, {
      loading: observable,
      error: observable,
      isValid: computed,
      isNew: computed,
      setError: action,
      setLoading: action,
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
    this.error = msg;
  }

  setLoading(isLoading) {
    this.loading = isLoading;
  }

  setDashboard(dashboard, deviceData, localeId, dashboards) {
    this.commonParameters.setValue(dashboard.content);
    this.dashboard = dashboard;
    this.bindingsStore.setDevices(deviceData, localeId);
    const dashboardsForSelect = dashboards
      .filter(d => d.isSvg && d.id !== dashboard.id)
      .map(d =>
        ({
          label: d.name,
          value: d.id,
        })
      );
    this.bindingsStore.setDashboards(dashboardsForSelect);
    this.bindingsStore.setParams(this.dashboard.content.svg.params);

    this.swipeParameters.params.left.setOptions(dashboardsForSelect);
    this.swipeParameters.params.right.setOptions(dashboardsForSelect);
    this.swipeParameters.setValue(this.dashboard.content.swipe);

    this.svgStore.setSvg(this.dashboard?.content?.svg?.current);
    this.setLoading(false);
  }

  setOriginalId(value) {
    this.originalId = value;
  }

  onShowDashboardsList() {
    this.showDashboardsList();
  }

  onPreview() {
    this.preview(this.commonParameters.params.id.value);
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
    this.onShowDashboardsList();
  }

  onSaveDashboard() {
    this.bindingsStore.saveBinding();
    Object.assign(this.dashboard.content, this.commonParameters.value);
    this.dashboard.content.swipe = this.swipeParameters.value;
    this.dashboard.content.svg.current = this.svgStore.svg;
    this.dashboard.content.svg.params = this.bindingsStore.params;
    if (this.dashboard.content.isNew) {
      this.dashboard.content.svg_url = 'local';
      delete this.dashboard.content.isNew;
      this.onShowDashboardsList();
    }
  }
}

export default EditSvgDashboardPageStore;
