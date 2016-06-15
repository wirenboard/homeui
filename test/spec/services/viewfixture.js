"use strict";

angular.module('homeuiApp.viewFixture', ["homeuiApp"])
  .directive("datepickerPopup", () => {
    // Disable date pickers as they're hard to test.
    // Here's very naive replacement that makes it possible
    // to simulate date choice.
    return {
      restrict: "EA",
      priority: 1,
      terminal: true,
      link: (scope, element, attrs) => {
        scope.$watch(attrs.ngModel, (newValue) => {
          element.val(newValue ? newValue.getTime() : "");
        });
        element.data("setDate", (newDate) => {
          scope[attrs.ngModel] = newDate;
        });
      }
    };
  })
  .directive("datepickerOptions", () => {
    return {
      restrict: "EA",
      priority: 1,
      terminal: true
    };
  })
  .factory("HtmlFixture", ($rootScope, $compile, $location, $injector) => {
    class HtmlFixture {
      constructor (html, options) {
        this.cleanups = [];
        this.$scope = $rootScope.$new();
        if (options && options.hasOwnProperty("mixins"))
          options.mixins.forEach(name => {
            var copy = angular.extend({}, $injector.get(name));
            if (copy.cleanup) {
              this.cleanups.push(copy.cleanup);
              delete copy.cleanup;
            }
            angular.extend(this, copy);
          });
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
        this.cleanups.forEach(cleanup => { cleanup(); });
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
  .factory("ViewFixture", (HtmlFixture, $templateCache, $controller, $rootScope) => {
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
