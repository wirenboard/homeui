'use strict';

class AccountSelectController {
    
    constructor ($scope, $element, rolesFactory, webUIService) {
        'ngInject';

        this.$scope = $scope;
        this.$element = $element;
        this.rolesFactory = rolesFactory;
        this.service = webUIService;
        
        this.accounts = webUIService.accounts;
        this.current = webUIService.current;

        this.isMultiple = process.env.WEBUI_MULTIPLE === 'true';

        $scope.$watch('$ctrl.current', (newValue, oldValue) => {
            if (newValue !== oldValue) {
                this.login(newValue);
            }
        });
    }

    login(account) {
        this.service.login(account);
    }
}

export default AccountSelectController;