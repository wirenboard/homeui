import { JSONEditor } from '@wirenboard/json-editor';

// Single value editor for scenario output actions.
// One column that morphs its widget depending on the sibling `behaviorType`
// (watched as `wbActionType`):
//   - setColor                          -> color swatch (<input type="color">), value is #rrggbb hex
//   - setText                           -> text input
//   - setValue/increase/decrease (else) -> number input
// The value is always stored as a string; the scenario engine coerces it by action type.
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function inputTypeForAction(actionType) {
  if (actionType === 'setColor') return 'color';
  if (actionType === 'setText') return 'text';
  return 'number';
}

export function makeActionValueEditor() {
  return class extends JSONEditor.AbstractEditor {
    register() {
      super.register();
      if (!this.input) return;
      this.input.setAttribute('name', this.formname);
    }

    unregister() {
      super.unregister();
      if (!this.input) return;
      this.input.removeAttribute('name');
    }

    build() {
      if (!this.options.compact) {
        this.label = this.theme.getFormInputLabel(this.getTitle());
      }
      this.input = this.theme.getFormInputField('text');

      this.input.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.refreshValue();
        this.onChange(true);
      });

      this.control = this.theme.getFormControl(this.label, this.input);
      this.container.appendChild(this.control);

      if (this.schema.description) {
        this.container.appendChild(
          this.theme.getFormInputDescription(this.translateProperty(this.schema.description)),
        );
      }

      if (this.options.compact) {
        this.container.classList.add('compact');
      }

      this.applyInputType();

      requestAnimationFrame(() => {
        this.theme.afterInputReady(this.input);
      });
    }

    currentActionType() {
      const vars = this.getWatchedFieldValues ? this.getWatchedFieldValues() : null;
      return vars ? vars.wbActionType : undefined;
    }

    // Switch the input widget to match the selected action and keep the value sane
    applyInputType() {
      if (!this.input) return;
      const type = inputTypeForAction(this.currentActionType());
      if (this.input.type === type) return;
      this.input.type = type;

      if (type === 'color' && !HEX_RE.test(this.input.value)) {
        this.input.value = '#ffffff';
        this.refreshValue();
      } else if (type !== 'color' && HEX_RE.test(this.input.value)) {
        this.input.value = '';
        this.refreshValue();
      }
    }

    onWatchedFieldChange() {
      this.applyInputType();
      super.onWatchedFieldChange();
    }

    setValue(value) {
      if (typeof value !== 'undefined' && typeof value !== 'string') {
        value = `${value}`;
      }
      if (value === undefined || value === null) {
        value = '';
      }
      if (this.value === value && this.input.value === value) {
        return;
      }
      this.input.value = value;
      this.applyInputType();
      this.refreshValue();
      this.onChange(true);
    }

    getValue() {
      if (typeof this.input === 'undefined') {
        return undefined;
      }
      return this.input.value;
    }

    refreshValue() {
      this.value = this.input.value;
    }

    showValidationErrors(errors) {
      const messages = errors.reduce((acc, error) => {
        if (error.path === this.path) {
          acc.push(error.message);
        }
        return acc;
      }, []);

      if (messages.length) {
        this.theme.addInputError(this.input, `${messages.join('. ')}.`);
      } else {
        this.theme.removeInputError(this.input);
      }
    }

    getDefault() {
      return '';
    }

    disable() {
      super.disable();
      if (this.input) this.input.disabled = true;
    }

    enable() {
      if (this.input) this.input.disabled = false;
      super.enable();
    }

    destroy() {
      if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input);
      if (this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label);
      super.destroy();
    }
  };
}
