'use strict';

function makeDisabledEditorWrapper(Base) {
  return class extends Base {
    build() {
      super.build();
      this.disabledEditor = this.theme.getFormInputField(this.input_type);
      this.disabledEditor.style.display = 'none';
      this.disabledEditor.disabled = true;
      if (
        this.schema.options &&
        this.schema.options.inputAttributes &&
        this.schema.options.inputAttributes.placeholder
      ) {
        this.disabledEditor.value = this.translateProperty(
          this.schema.options.inputAttributes.placeholder
        );
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
