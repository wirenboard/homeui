export default angular.module('homeuiApp.cellPickerMixin', [])
  .factory("CellPickerMixin", () => {
    // XXX: this mixin depends upon the inner structure of ui-select
    return {
      cleanup() {
        $(".ui-select-container").remove();
      },

      isUISelectVisible() {
        return !!this.container.find(".ui-select-match").length;
      },

      clickUISelect() {
        this.click(".ui-select-toggle");
        expect($(".ui-select-choices")).toExist();
      },

      extractUISelectText() {
        return this.container
          .find(".ui-select-choices-row .ng-binding:not(.ui-select-placeholder)")
          .text().replace(/^\s+|\s+$/g, "");
      },

      extractChoices() {
        return $(".ui-select-choices-row-inner .ng-binding").toArray().map(
          el => $(el).text().replace(/^\s+|\s+$/g, ""));
      },

      clickChoice(substring) {
        // the following is ugly-ish, but we're dealing with tests here
        var el = $(".ui-select-choices-row:contains('" + substring + "')");
        expect(el).toExist();
        el.click();
      }
    };
  })
  .name;
