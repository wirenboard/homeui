"use strict";

angular.module('homeuiApp.viewFixture', [])
  .directive("datepickerPopup", function () {
    // Disable date pickers as they're hard to test.
    // Here's very naive replacement that makes it possible
    // to simulate date choice.
    return {
      restrict: "EA",
      priority: 1,
      terminal: true,
      link: function (scope, element, attrs) {
        scope.$watch(attrs.ngModel, function (newValue) {
          element.val(newValue ? newValue.getTime() : "");
        });
        element.data("setDate", function (newDate) {
          scope[attrs.ngModel] = newDate;
        });
      }
    };
  })
  .directive("datepickerOptions", function () {
    return {
      restrict: "EA",
      priority: 1,
      terminal: true
    };
  })
  .factory("ViewFixture", function ($rootScope, $compile, $templateCache, $location, $controller) {
    return {
      $location: $location,
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
      },

      click: function (element) {
        if (typeof element == "string")
          element = this.container.find(element);
        expect(element).toHaveLength(1);
        expect(element).toBeVisible();
        element.click();
      }
    };
  });
