'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

// The editor is derived from multiple editor.
// It is used with oneOf nodes when changing of type is prohibited
function makeReadonlyOneOfEditor () {
    return class extends JSONEditor.defaults.editors["multiple"] {
        build() {
            super.build();
            this.switcher.style.display = 'none';
            this.header.style.display = 'none';
        }

        switchEditor(i) {
            // Remove previous editor from DOM
            if (this.type) {
                this.editor_holder.removeChild(this.editor_holder.childNodes[0]);
                this.editors[this.type] = null;
            }

            super.switchEditor(i)

            if (this.editors[i].header) {
                this.editors[i].header.style.display = ''
            }

            if (this.editors[i].schema.options && this.editors[i].schema.options.wb && this.editors[i].schema.options.wb.controls_on_top) {
                this.title_controls = this.editors[i].controls;
            } else {
                this.title_controls = undefined;
            }
        }
    }
}

export default makeReadonlyOneOfEditor
