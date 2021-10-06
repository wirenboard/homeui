const dumbTemplateModule = angular
  .module("homeuiApp.DumbTemplate", [])
  .factory('DumbTemplate', dumbTemplateService)
  .name;

//-----------------------------------------------------------------------------
function dumbTemplateService() {
  return {
    compile: function (src, translateFn) {
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
              if (!k)
                return k;

              if (typeof k == 'string' && k[k.length - 1] == ']') {
                k = k.slice(0, -1);
                last = true;
              }

              if (Array.isArray(v)) {
                v = v.find(function(element) {
                  return (element.id == k);
                });
              } else {
                v = v[k];
              }
              if (!v || last)
                break;
            }
            return v;
          }
          return expandParts();
        }

        var stringify = function(v) {
          return v === undefined || v === null || v === "" ? "" : v.toString()
        }

          return src
            // {{if VARIABLE1 COMPARE_OPERATION VARIABLE2}}...{{else}}...{{endif}}
            .replace(/\{\{\s*if\s+([\w.\[\]]+?|".*?")\s*(==|in|intersect)\s*([\w.\[\]]+?|".*?")\s*\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{\s*endif\s*\}\}/g, function (m, left, op, right, ifTrue, ifFalse) {
              left = expandVar(left);
              right = expandVar(right);
              var result = false;
              if (op == "==") {
                result = ((typeof right == 'string' ? stringify(left) : left) == right);
              }
              else if (op == "in") {
                result = (right.indexOf(left) >= 0);
              }
              else if (op == "intersect") {
                result = left.filter(function(n) {
                  return right.indexOf(n) != -1;
                }).length > 0;
              }
              return result ? (ifTrue || "") : (ifFalse || "");
            })
            // {{translate VARIABLE}}
            // The variable value will be passed to translateFn and replaced by found translation
            .replace(/\{\{\s*translate\s+([\w.\[\]]+?)\s*\}\}/g, function (m, expr) {
              var v = stringify(expandVar(expr));
              return translateFn ? translateFn(v) : v;
            })
            // {{PREFIX|VARIABLE|POSTFIX}}
            .replace(/\{\{(?:([^{]*?)\|)?\s*([\w.\[\]]+?)\s*(?:\|([^}]*?))?\}\}/g, function (m, prefix, expr, suffix) {
              var v = stringify(expandVar(expr));
              return v === "" ? "" : (prefix || "") + v + (suffix || "");
            });
        };
      }
    };
  };

//-----------------------------------------------------------------------------
export default dumbTemplateModule;
