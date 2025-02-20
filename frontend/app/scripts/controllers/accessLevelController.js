/**
 * Created by ozknemoy on 21.06.2017.
 */

export default class accessLevelController {
  constructor($timeout, rolesFactory) {
    'ngInject';

    this.$timeout = $timeout;
    this.rolesFactory = rolesFactory;

    this.ok = false;
    this.isLevelUp = false;
    this.one = rolesFactory.ROLES[0];
    this.two = rolesFactory.ROLES[1];
    this.three = rolesFactory.ROLES[2];
    this.activeRole = rolesFactory.current.role;
    this.level = '' + rolesFactory.getRole();
    this.type = { id: +this.level };
  }

  select(newType) {
    if (newType.id > this.activeRole) {
      this.ok = false;
      this.isLevelUp = true;
    } else if (newType.id == this.activeRole) {
      this.ok = false;
      this.isLevelUp = false;
    } else {
      this.ok = true;
      this.isLevelUp = false;
      this.type = newType;
    }
  }

  apply() {
    this.rolesFactory.setRole(this.level);
    this.ok = false;
    this.isLevelUp = false;
    this.activeRole = this.level;
  }
}
