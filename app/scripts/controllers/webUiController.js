/**
 * Created by ozknemoy on 21.06.2017.
 */

export default class WebUICtrl {
    constructor(uiConfig, errors, rolesFactory, $window, $translate, tmhDynamicLocale) {
        'ngInject';

        this.rolesFactory = rolesFactory;
        this.uiConfig = uiConfig;
        this.language =  $window.localStorage['language'] || 'en';

        uiConfig.whenReady()
            .then((data) => {
                this.dashboards = data.dashboards;
                this.widgets = data.widgets;
                this.defaultDashboard = uiConfig.getDashboard(data.defaultDashboardId);
            })
            .catch(errors.catch('Error loading WebUI config'));

        this.changeLanguage = () => {
            $translate.use(this.language);
            tmhDynamicLocale.set(this.language);
            $window.localStorage.setItem('language', this.language);
        }
    }

    changeDefaultDashboard() {
        let id = this.defaultDashboard ? this.defaultDashboard.id : '';
        this.uiConfig.setDefaultDashboard(id);
    };

}