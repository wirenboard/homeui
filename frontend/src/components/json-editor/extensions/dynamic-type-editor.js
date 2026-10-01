import { JSONEditor } from '@wirenboard/json-editor';

// Value editor whose input type morphs by another field's value (the "source").
// Config in `options.dynamicType`: { sourceField, typeByValue: { <sourceValue>: <inputType> },
// defaultType, defaultValueByType: { <inputType>: <default value> } }. Unmapped source values
// fall back to `defaultType`. Visibility is left to json-editor `dependencies`. The value is
// always stored as a string and the consumer coerces it by action.
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

      // Deferred so the whole form (incl. the source field) exists when we resolve it.
      requestAnimationFrame(() => {
        this.theme.afterInputReady(this.input);
        this.setupSourceWatch();
      });
    }

    // options.dynamicType -> value->type lookup.
    parseDynamicType() {
      const dt = this.options.dynamicType;
      this.defaultType = (dt && dt.defaultType) || 'number';
      // Built-in defaults, author's override them. Unlisted types fall back to '' (see applyInputType).
      this.defaultValueByType = { color: '#ffffff', number: 0, ...(dt && dt.defaultValueByType) };
      if (!dt || !dt.typeByValue) return;
      this.sourceName = dt.sourceField;
      this.valueToType = { ...dt.typeByValue };
    }

    // Nearest ancestor's child editor named `name`. Array/table editors have no
    // `editors`, so they're skipped — that lets a table cell reach an outside source.
    resolveSourceEditor(name) {
      let node = this.parent;
      while (node) {
        if (node.editors && node.editors[name]) return node.editors[name];
        node = node.parent;
      }
      return null;
    }

    // Watch the source and re-apply the input type on its change. Guarded because
    // the deferred frame may fire after this editor was destroyed.
    setupSourceWatch() {
      if (!this.jsoneditor || !this.input) return;
      if (!this.valueToType || !this.sourceName) return;
      const source = this.resolveSourceEditor(this.sourceName);
      if (!source) {
        console.warn(`wb-dynamic-type: source field "${this.sourceName}" not found`);
        return;
      }
      this.sourceWatchPath = source.path;
      this.sourceListener = () => this.applyInputType();
      this.jsoneditor.watch(this.sourceWatchPath, this.sourceListener);
      this.applyInputType();
    }

    currentType() {
      // Before the source resolves (watch is deferred), keep the input as text — a
      // number input would silently drop a color/text value assigned meanwhile.
      if (!this.sourceWatchPath) return 'text';
      // Look up the source live by path — a cached editor ref goes stale when
      // json-editor rebuilds object-level fields.
      const source = this.jsoneditor.getEditor(this.sourceWatchPath);
      const value = source ? source.getValue() : undefined;
      if (this.valueToType && this.valueToType[value]) return this.valueToType[value];
      return this.defaultType;
    }

    // Whether a stored string fits an input type. Any non-empty string fits text.
    isValidForType(value, type) {
      if (type === 'color') return HEX_RE.test(value);
      if (type === 'number') return value !== '' && !Number.isNaN(Number(value));
      return value !== '';
    }

    // Switch the input to match the source and keep the value sane.
    // Visibility is left to json-editor's `dependencies`.
    applyInputType() {
      if (!this.input) return;
      const type = this.currentType();
      if (this.input.type === type) return;

      // Read value before the switch: a color input coerces non-hex to #000000.
      const prevValue = this.input.value;
      this.input.type = type;

      // Substitute the type's default only when the current value no longer fits, so a value
      // that already fits (a saved hex morphing into a color input) survives reopening.
      if (!this.isValidForType(prevValue, type)) {
        this.input.value = this.defaultValueByType[type] ?? '';
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
      if (this.sourceWatchPath && this.sourceListener) {
        this.jsoneditor.unwatch(this.sourceWatchPath, this.sourceListener);
      }
      if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input);
      if (this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label);
      super.destroy();
    }
  };
}
