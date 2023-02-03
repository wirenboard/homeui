'use strict';

import { JSONEditor } from "../../3rdparty/jsoneditor";

function makeTranslatedInfoEditor () {
    return class extends JSONEditor.AbstractEditor {
        constructor (options, defaults) {
          super(options, defaults)
        }

        build () {
          this.input = this.theme.getFormInputField("text")
          this.input.disabled = true
          this.container.appendChild(this.input)
        }

        setValue (value) {
          this.input.value = this.translateProperty(value);
          this.input.setAttribute('size', this.input.value.length);
        }
    }
}

export default makeTranslatedInfoEditor
