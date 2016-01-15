"use strict";

angular.module("homeuiApp.DumbTemplate", [])
  .factory("DumbTemplate", function () {
    return {
      compile: function (src) {
        // sorry, no actual compilation at the moment
        return function (vars) {
          var expandVar = function(expr) {
            var t = expr.match(/^"(.*)"$/);
            if (t) {
              return t[1];
            }
            var parts = expr.split("."),
                v = vars;
            for (var i = 0; i < parts.length; i++) {
              v = v[parts[i]];
              if (!v)
                break;
            }
            return v;
          }

          return src
            .replace(/\{\{\s*if\s+([\w.]+?|".*?")\s*(==|in)\s*([\w.]+?|".*?")\s*\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{\s*endif\s*\}\}/g, function (m, left, op, right, ifTrue, ifFalse) {
              left = expandVar(left);
              right = expandVar(right);
              var result = false;
              if (op == "==") {
                result = (left == right);
              }
              else if (op == "in") {
                result = (right.indexOf(left) >= 0);
              }
              return result ? (ifTrue || "") : (ifFalse || "");
            })
            .replace(/\{\{(?:([^{]*?)\|)?\s*([\w.]+?)\s*(?:\|([^}]*?))?\}\}/g, function (m, prefix, expr, suffix) {
              var v = expandVar(expr);
              return v === undefined || v === null || v === "" ? "" : (prefix || "") + v + (suffix || "");
            });
        };
      }
    };
  });
