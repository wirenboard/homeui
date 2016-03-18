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
                i = 0;
            // expand to matching ], or to the end of parts
            var expandParts = function() {
              var v = vars,
                  last = false,
                  k;

              for (; i < parts.length; i++) {
                k = parts[i];
                if (k[0] == '[') {
                  parts[i] = k.slice(1);
                  k = expandParts();
                }
                if (k[k.length - 1] == ']') {
                  k = k.slice(0, -1);
                  last = true;
                }
                if (!k)
                  break;

                if (Array.isArray(v)) {
                  for (var j = 0; j < v.length; j++) {
                    if (v[j]["id"] == k) {
                      k = j;
                      break;
                    }
                  }
                }

                v = v[k];
                if (!v || last)
                  break;
              }
              return v;
            }
            return expandParts();
          }

          return src
            .replace(/\{\{\s*if\s+([\w.\[\]]+?|".*?")\s*(==|in)\s*([\w.\[\]]+?|".*?")\s*\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{\s*endif\s*\}\}/g, function (m, left, op, right, ifTrue, ifFalse) {
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
            .replace(/\{\{(?:([^{]*?)\|)?\s*([\w.\[\]]+?)\s*(?:\|([^}]*?))?\}\}/g, function (m, prefix, expr, suffix) {
              var v = expandVar(expr);
              return v === undefined || v === null || v === "" ? "" : (prefix || "") + v + (suffix || "");
            });
        };
      }
    };
  });
