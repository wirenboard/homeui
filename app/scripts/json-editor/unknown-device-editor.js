'use strict';

import { JSONEditor } from '../../3rdparty/jsoneditor';

function makeUnknownDeviceEditor() {
  JSONEditor.defaults.languages.en.unknown_device_warning =
    'Template for the device is missing or invalid';
  return class extends JSONEditor.AbstractEditor {
    constructor(options, defaults) {
      super(options, defaults);
    }

    build() {
      this.error_holder = document.createElement('div');
      this.error_holder.appendChild(
        this.theme.getErrorMessage(this.translate('unknown_device_warning'))
      );
      this.container.appendChild(this.error_holder);
      this.editor_holder = this.theme.getTextareaInput();
      this.editor_holder.style.height = '200px';
      this.editor_holder.disabled = true;
      this.container.appendChild(this.editor_holder);
    }

    setValue(value) {
      this.value = value;
      this.editor_holder.value = JSON.stringify(value.value, null, '  ');
    }
  };
}

export default makeUnknownDeviceEditor;
