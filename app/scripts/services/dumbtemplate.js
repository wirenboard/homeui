"use strict";

angular.module("homeuiApp.DumbTemplate", [])
  .factory("DumbTemplate", function () {
    return {
      compile: function (src) {
        // sorry, no actual compilation at the moment
        return function (vars) {
          return src.replace(/\{\{(?:([^{]*?)\|)?\s*([\w.]+?)\s*(?:\|([^}]*?))?\}\}/g, function (m, prefix, expr, suffix) {
            var parts = expr.split("."),
                v = vars;
            for (var i = 0; i < parts.length; i++) {
              v = v[parts[i]];
              if (!v)
                break;
            }
            return v === undefined || v === null || v === "" ? "" : (prefix || "") + v + (suffix || "");
          });
        };
      }
    };
  });
