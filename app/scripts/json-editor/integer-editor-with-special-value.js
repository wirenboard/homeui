'use strict';

import { JSONEditor } from "../../3rdparty/jsoneditor";

// TODO: replace by implementation that has getDefault method returning undefined

// The editor is used for poll_interval setting of a channel.
// poll_interval is edited in table's cell.
// We want to show empty editors for poll_intervals that are not set, but
// json-editor sets default values to properties in tables cells.
// -1 is used as a default value to mark that poll_interval is not set.
// The editor handles the special case and shows an empty edit
function makeIntegerEditorWithSpecialValue () {
    return class extends JSONEditor.defaults.editors["integer"] {
        build() {
            super.build();
            if (this.input) {
                this.input.setAttribute('size', this.input.getAttribute('placeholder').length);
            }
        }

        setValue (value) {
            if (value != -1) {
                super.setValue(value);
            }
        }

        getValue () {
            if (!(this.input && this.input.value)) {
              return undefined;
            }
            return super.getValue();
        }
    }
}

export default makeIntegerEditorWithSpecialValue