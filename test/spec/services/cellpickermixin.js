"use strict";

angular.module('homeuiApp.cellPickerMixin', [])
  .factory("CellPickerMixin", () => {
    // XXX: this mixin depends upon the inner structure of ui-select
    return {
      cleanup () {
        $(".ui-select-container").remove();
      },

      isUISelectVisible () {
        return !!this.container.find(".ui-select-match").size();
      },

      clickUISelect () {
        this.click(".ui-select-match .ui-select-toggle");
      },

      extractUISelectText () {
        return this.container
          .find(".ui-select-match .ui-select-toggle .ng-binding:not(.ui-select-placeholder)")
          .text().replace(/^\s+|\s+$/g, "");
      },

      extractChoices () {
        return $(".ui-select-container a.ui-select-choices-row-inner").toArray().map(
          el => $(el).text().replace(/^\s+|\s+$/g, ""));
      },

      clickChoice (substring) {
        // the following is ugly-ish, but we're dealing with tests here
        var el = $(".ui-select-container a.ui-select-choices-row-inner:contains('" + substring + "')");
        expect(el).toExist();
        el.click();
      }
    };
  });
