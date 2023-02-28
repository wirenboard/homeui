'use strict';

import { JSONEditor } from "../../3rdparty/jsoneditor";

// Create object editor with title_controls container on top
// It can be used to place controls created by array item editor on top
function makeObjectEditorWithButtonsOnTop () {
    return class extends JSONEditor.defaults.editors["object"] {

        build () {
            super.build()
            this.title_controls = this.theme.getButtonHolder()
            this.title_controls.classList.add('je-object__controls')
            this.container.insertBefore(this.title_controls, this.container.childNodes[3])
        }
    }
}

export default makeObjectEditorWithButtonsOnTop