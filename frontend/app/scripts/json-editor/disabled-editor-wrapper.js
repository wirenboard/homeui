'use strict';

function makeDisabledEditorWrapper(Base) {
  return class extends Base {
    build() {
      super.build();
      this.disabledEditor = this.theme.getFormInputField(this.input_type);
      this.disabledEditor.style.display = 'none';
      this.disabledEditor.disabled = true;
      var disabledEditorText = this?.schema?.options?.wb?.disabledEditorText;
      if (disabledEditorText) {
        this.disabledEditor.value = this.translateProperty(disabledEditorText);
      } else {
        this.disabledEditor.value = this.translate('unknown');
      }
      this.control.insertBefore(this.disabledEditor, this.description);
    }

    enable() {
      this.input.style.display = '';
      this.disabledEditor.style.display = 'none';
      super.enable();
    }

    disable(alwaysDisabled) {
      super.disable(alwaysDisabled);
      this.input.style.display = 'none';
      this.disabledEditor.style.display = '';
    }
  };
}

export default makeDisabledEditorWrapper;
