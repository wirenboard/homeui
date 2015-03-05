'use strict';

angular.module('homeuiApp')
  .controller('WidgetCtrl', ['$rootScope', 'HomeUIWidgets', function($rootScope, HomeUIWidgets){
    var vm = this;

    vm.widget = {};

    vm.change = function(control) {
      console.log('Room changed');
    };

    vm.widgets = HomeUIWidgets.list();

    vm.hello_world = function(){
      return 'Hello World!';
    };

    vm.addOrUpdateWidget = function(){
      var widget_index = vm.widgets.map(function(e) {return e.uid; }).indexOf(vm.widget.uid);

      if(widget_index >= 0){
        vm.widgets[widget_index].name = vm.widget.name;
      }else{
        vm.widgets.push(vm.widget);
      }
      vm.widget = {};
    };
  }]);