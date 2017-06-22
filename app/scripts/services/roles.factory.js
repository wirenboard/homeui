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
        return localStorage.getItem('role')
    };

    roles.setRole = (n)=> {
        roles.current = {role:n};
        localStorage.setItem('role',n)
    };

    roles.resetRole = (n)=> {
        localStorage.setItem('role',n)
    };

    return roles
}

/*
* три режима:
 1) Режим простого пользователя (по-умолчанию)
 Только смотреть и взаимодействовать с Widgets на дашбордах + просматривать историю. Доступны разделы:
  Home,
  Dashboards (read-only),
   Widgets (read-only),
   History (read-only) значит, что нельзя менять виджеты.
   Если в виджете есть допустим кнопка или изменяемое поле - пользоваться можно.
 2) Режим "настройка интерфейса"
 - разблокирует изменения интерфейса, т.е. добавление/удаление/изменение виджетов
   - появляется раздел Devices.
 3) Режим "эксперт"
 Следующий уровень "Эксперт" активируется с огромным Warning об опасности действий и
  активирует всё остальное.
 */