class SvgFormController {
  constructor($scope, uiConfig) {
    'ngInject';

    this.uiConfig = uiConfig;
    this.data = uiConfig.data;
  }

  isContent() {
    return this.dashboard.content.svg.current.length;
  }
}

export default SvgFormController;
