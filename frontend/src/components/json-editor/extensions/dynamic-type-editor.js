import { JSONEditor } from '@wirenboard/json-editor';

// Value editor whose input type morphs by another field's value (the "driver").
// Config in `options.dynamicType`: { source, map: { <inputType>: [driverValue...] } }.
// Unmapped values default to `number`. Visibility is left to json-editor `dependencies`.
// The value is always stored as a string; the consumer coerces it by action.
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function makeDynamicTypeEditor() {
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

      this.parseDynamicType();
      this.applyInputType();

      // Deferred so the whole form (incl. the driver field) exists when we resolve it.
      requestAnimationFrame(() => {
        this.theme.afterInputReady(this.input);
        this.setupDriverWatch();
      });
    }

    // options.dynamicType -> value->type lookup.
    parseDynamicType() {
      const dt = this.options.dynamicType;
      if (!dt || !dt.map) return;
      this.driverName = dt.source;
      this.valueToType = {};
      Object.keys(dt.map).forEach((type) => {
        const list = Array.isArray(dt.map[type]) ? dt.map[type] : [dt.map[type]];
        list.forEach((value) => {
          if (this.valueToType[value] !== undefined && this.valueToType[value] !== type) {
            console.warn(
              `wb-dynamic-type: driver value "${value}" is mapped to both `
                + `"${this.valueToType[value]}" and "${type}"; using "${type}"`,
            );
          }
          this.valueToType[value] = type;
        });
      });
    }

    // Nearest ancestor's child editor named `name`. Array/table editors have no
    // `editors`, so they're skipped — that lets a table cell reach an outside driver.
    resolveDriverEditor(name) {
      let node = this.parent;
      while (node) {
        if (node.editors && node.editors[name]) return node.editors[name];
        node = node.parent;
      }
      return null;
    }

    // Watch the driver and re-apply the input type on its change. Guarded because
    // the deferred frame may fire after this editor was destroyed.
    setupDriverWatch() {
      if (!this.jsoneditor || !this.input) return;
      if (!this.valueToType || !this.driverName) return;
      const driver = this.resolveDriverEditor(this.driverName);
      if (!driver) {
        console.warn(`wb-dynamic-type: driver field "${this.driverName}" not found`);
        return;
      }
      this.driverWatchPath = driver.path;
      this.driverListener = () => this.applyInputType();
      this.jsoneditor.watch(this.driverWatchPath, this.driverListener);
      this.applyInputType();
    }

    currentType() {
      // Before the driver resolves (watch is deferred), keep the input as text — a
      // number input would silently drop a color/text value assigned meanwhile.
      if (!this.driverWatchPath) return 'text';
      // Look up the driver live by path — a cached editor ref goes stale when
      // json-editor rebuilds object-level fields.
      const driver = this.jsoneditor.getEditor(this.driverWatchPath);
      const value = driver ? driver.getValue() : undefined;
      if (this.valueToType && this.valueToType[value]) return this.valueToType[value];
      return 'number';
    }

    // Switch the input to match the driver and keep the value sane. Visibility is left
    // to json-editor's `dependencies`; this widget never touches `display`.
    applyInputType() {
      if (!this.input) return;
      const type = this.currentType();
      if (this.input.type === type) return;

      // Read value before the switch: a color input coerces non-hex to #000000.
      const prevValue = this.input.value;
      this.input.type = type;

      if (type === 'color' && !HEX_RE.test(prevValue)) {
        this.input.value = '#ffffff';
        this.refreshValue();
      } else if (type !== 'color' && HEX_RE.test(prevValue)) {
        this.input.value = '';
        this.refreshValue();
      }
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
      if (this.driverWatchPath && this.driverListener) {
        this.jsoneditor.unwatch(this.driverWatchPath, this.driverListener);
      }
      if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input);
      if (this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label);
      super.destroy();
    }
  };
}
