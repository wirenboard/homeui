/**
 * Created by ozknemoy on 21.06.2017.
 */

export default function rolesFactory () {
    'ngInject';
    var roles = {};

    roles.ROLE_ONE = 1;
    roles.ROLE_TWO = 2;
    roles.ROLE_THREE = 3;


    roles.current = {
        role: localStorage.getItem('role') || 1
    };

    roles.getRole = ()=> {
        roles.current.role = localStorage.getItem('role');
        return roles.current.role
    };

    roles.setRole = (n)=> {
        roles.current = {role:n};
        localStorage.setItem('role',n)
    };

    roles.resetRole = (n)=> {
        localStorage.setItem('role',n)
    };

    // проверяет есть ли права доступа/просмотра
    // принимает значение минимально возможного статуса для доступа/просмотра
    roles.checkRights = (onlyRoleGreatThanOrEqual)=> {
        return roles.getRole() >= onlyRoleGreatThanOrEqual
    };

    return roles
}