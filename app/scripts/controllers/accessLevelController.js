/**
 * Created by ozknemoy on 21.06.2017.
 */

export default class accessLevelController {
    constructor($timeout,rolesFactory) {
        'ngInject';

        this.$timeout = $timeout;

        this.one = rolesFactory.ROLES[0];
        this.two = rolesFactory.ROLES[1];
        this.three = rolesFactory.ROLES[2];
        this.rolesFactory = rolesFactory;
        this.activeRole = rolesFactory.current.role;
        this.level = '' + rolesFactory.getRole();
        this.type = {id: +this.level};
    }

    select(newType) {
        if(newType.id > this.type.id) {
            if(confirm(`Switch to ${newType.name}?`)) {
                this.type = newType;
            } else {
                // откатываю значение
                // чтобы не переключалось ставлю пустышку
                this.level = '';
                this.$timeout(()=>this.level = '' + this.type.id)
            }
        } else {
            this.type = newType;
        }
    }

    apply() {
        this.rolesFactory.setRole(this.level);
        this.activeRole = this.level;
    }
}