/**
 * Created by ozknemoy on 21.06.2017.
 */

export default class accessLevelController {
    constructor(rolesFactory) {
        'ngInject';

        this.rolesFactory = rolesFactory;

        this.level = '' + rolesFactory.getRole();
    }


    apply() {
        this.rolesFactory.setRole(this.level)
    }
}