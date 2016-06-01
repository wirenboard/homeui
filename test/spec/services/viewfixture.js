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
        scope.$watch(attrs.ngModel, (newValue) => {
          element.val(newValue ? newValue.getTime() : "");
        });
        element.data("setDate", (newDate) => {
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
  .factory("HtmlFixture", function ($rootScope, $compile, $location) {
    class HtmlFixture {
      constructor (html, options) {
        this.$scope = $rootScope.$new();
        this.setup(options);
        this.container = $("<div></div>").appendTo($("body"));
        this.element = $compile(angular.element(html))(this.$scope, (clonedElement) => {
          this.container.append(clonedElement);
        });
        this.$scope.$digest();
      }

      setup (options) {}

      get $location () {
        return $location;
      }

      remove () {
        if (this.container)
          this.container.remove();
      }

      click (element) {
        if (typeof element == "string")
          element = this.container.find(element);
        expect(element).toHaveLength(1);
        expect(element).toBeVisible();
        element.click();
      }
    }

    return HtmlFixture;
  })
  .factory("ViewFixture", function (HtmlFixture, $templateCache, $controller, $rootScope) {
    class ViewFixture extends HtmlFixture {
      constructor (url, controllerName, locals, options) {
        super($templateCache.get(url), angular.extend({
          controllerName: controllerName,
          locals: locals
        }, options));
      }

      setup (options) {
        this.ctrl = $controller(options.controllerName, angular.extend({
          $scope: this.$scope,
          $rootScope: $rootScope
        }, options.locals || {}));
      }
    }

    return ViewFixture;
  });
