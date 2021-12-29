'use strict';

import angular from "angular";
import { JSONEditor } from "../../../3rdparty/jsoneditor";

// The editor merges default value to a value passed to setValue function
// and also removes all default values from result.
// It can be used to show editors for all possible object's properties even if they are not set.
function makeMergedDefaultValuesEditor () {
    return class extends JSONEditor.defaults.editors["object"] {

        setValue (value, initial) {
            value = angular.merge(this.getDefault(), value)
            super.setValue(value, initial)
        }

        getValue() {
            var subtractValue = function (v1, v2) {
                if (!angular.isObject(v1) || !angular.isObject(v2)) {
                    return
                }
                Object.entries(v2).forEach(([k, v]) => {
                    if (v1.hasOwnProperty(k)) {
                        if (v1[k] === v) {
                            delete v1[k];
                        } else {
                            subtractValue(v1[k], v);
                            if (angular.isObject(v1[k]) && Object.keys(v1[k]).length == 0) {
                                delete v1[k]
                            }
                        }
                    }
                });
            };
            var value = super.getValue();
            subtractValue(value, this.getDefault());
            return value;
        }
    }
}

export default makeMergedDefaultValuesEditor
