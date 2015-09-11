"use strict";

angular.module('homeuiApp.viewFixture', [])
  .factory("ViewFixture", function ($rootScope, $compile, $templateCache, $controller) {
    return {
      setup: function (url, controllerName, locals) {
        var html = $templateCache.get(url);
        if (html === undefined)
          throw new Error("ViewFixture: unable to locate view template: " + url);
        this.$scope = $rootScope.$new();
        this.ctrl = $controller(controllerName, angular.extend({
          $scope: this.$scope,
          $rootScope: $rootScope
        }, locals || {}));
        this.container = $("<div></div>").appendTo($("body"));
        $compile(angular.element(html))(this.$scope, function (clonedElement) {
          this.container.append(clonedElement);
        }.bind(this));
        this.$scope.$digest();
      },

      remove: function () {
        if (this.container)
          this.container.remove();
      }
    };
  });
