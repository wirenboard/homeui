import i18n from '../i18n/react/config';

export default class WebUICtrl {
    constructor(uiConfig, errors, rolesFactory, $window, $translate, tmhDynamicLocale) {
        'ngInject';

        this.rolesFactory = rolesFactory;
        this.uiConfig = uiConfig;
        this.language = $window.localStorage['language'];
        if (!this.language || i18n.languages.indexOf(this.language) === -1) {
            let preferredLanguages = window.navigator.languages;
            this.language = preferredLanguages.filter(lang => i18n.languages.indexOf(lang.split('-')[0]) !== -1)[0] || 'en';
        }

        uiConfig.whenReady()
            .then((data) => {
                this.dashboards = data.dashboards;
                this.widgets = data.widgets;
                this.defaultDashboardId = data.defaultDashboardId;
            })
            .catch(errors.catch('Error loading WebUI config'));

        this.changeLanguage = () => {
            $translate.use(this.language);
            tmhDynamicLocale.set(this.language);
            $window.localStorage.setItem('language', this.language);
            i18n.changeLanguage(this.language);
        }
    }

    changeDefaultDashboard() {
        let id = this.defaultDashboardId ? this.defaultDashboardId : '';
        this.uiConfig.setDefaultDashboard(id);
    };

}
