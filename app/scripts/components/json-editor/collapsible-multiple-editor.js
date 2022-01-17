'use strict';

import angular from "angular";
import { JSONEditor } from "../../../3rdparty/jsoneditor";

// Editor for oneOf items with collapse button
// Starts collapsed. To speed up creation, editor for selected type is created after expanding
// Has title_controls container to place array item buttons near combobox
// Properties button is taken from selected type editor and placed near combobox
// Title and header controls of a selected type editor are hidden
// Has additional expandEditor and collapseEditor functions
function makeCollapsibleMultipleEditor () {
    return class extends JSONEditor.defaults.editors["multiple"] {

        build () {
            if (!this.schema.options || !this.schema.options.disable_collapse) {
                this.collapsed = true
            }
            super.build()
            if (!this.schema.options || !this.schema.options.disable_collapse) {
                this.collapse_control = this._createCollapseButton()
                this.switcher.disabled = true
                this.container.style.paddingBottom = '9px'
            }
            this.title_controls = this.theme.getButtonHolder()
            this.title_controls.classList.add('je-object__controls')
            this.container.insertBefore(this.title_controls, this.container.childNodes[3])
        }

        enable () {
            super.enable()
            if (this.collapsed) {
                this.switcher.disabled = true
            }
        }

        switchEditor (i) {
            if (!this.editors[i]) {
                if (!this.collapsed || (this.schema.options && this.schema.options.disable_collapse)) {
                    this.buildChildEditor(i)
                }
            }
            const currentValue = this.getValue()
            this.type = i
            this.register()
            this.editors.forEach((editor, type) => {
                if (!editor) return
                if (this.type === type) {
                    if (this.keep_values) {
                        editor.setValue(currentValue, true)
                    }
                    this._adjustControls(editor)
                } else {
                    editor.container.style.display = 'none'
                }
            })
            if (this.editors[this.type]) {
                this.refreshValue()
            }
            this.refreshHeaderText()
        }

        setValue (val, initial) {
            this.value = angular.extend({}, val)
            this.valueToSet = angular.extend({}, val)
            /* Determine type by getting the first one that validates */
        
            const prevType = this.type
            /* find the best match one */
            let fitTestVal = {
              match: 0,
              extra: 0,
              i: this.type
            }
            const validVal = {
              match: 0,
              i: null
            }
            this.validators.forEach((validator, i) => {
              let fitTestResult = null
              if (typeof this.anyOf !== 'undefined' && this.anyOf) {
                fitTestResult = validator.fitTest(val)
                if (fitTestVal.match < fitTestResult.match) {
                  fitTestVal = fitTestResult
                  fitTestVal.i = i
                } else if (fitTestVal.match === fitTestResult.match) {
                  if (fitTestVal.extra > fitTestResult.extra) {
                    fitTestVal = fitTestResult
                    fitTestVal.i = i
                  }
                }
              }
              if (!validator.validate(val).length && validVal.i === null) {
                validVal.i = i
                if (fitTestResult !== null) {
                  validVal.match = fitTestResult.match
                }
              }
            })
            let finalI = validVal.i
            /* if the best fit schema has more match properties, then use the best fit schema. */
            /* usually the value could be */
            if (typeof this.anyOf !== 'undefined' && this.anyOf) {
              if (validVal.match < fitTestVal.match) {
                finalI = fitTestVal.i
              }
            }
            if (finalI === null) {
              finalI = this.type
            }
            this.type = finalI
            this.switcher.value = this.display_text[finalI]

            const typeChanged = this.type !== prevType
            if (typeChanged) {
              this.switchEditor(this.type)
            }

            if (this.editors[this.type]) {
                this.editors[this.type].setValue(val, initial)
                this.refreshValue()
            }
            this.onChange(typeChanged)
        }

        collapseEditor() {
            if (this.collapsed) {
                return
            }
            this.editors[this.type].editor_holder.style.display = 'none'
            this.collapsed = true
            this.setButtonText(this.collapse_control, '', 'expand', 'button_expand')
            this.container.style = ''
            if (this.childEditorControls) {
                this.container.removeChild(this.childEditorControls)
                this.childEditorControls = undefined
            }
            this.switcher.disabled = true
        }

        expandEditor() {
            if (!this.editors[this.type]) {
                this.buildChildEditor(this.type)
                this.editors[this.type].setValue(this.valueToSet, true)
                this.refreshValue()
            }
            this._adjustControls(this.editors[this.type])
            this.editors[this.type].editor_holder.style = ''
            this.collapsed = false
            this.setButtonText(this.collapse_control, '', 'collapse', 'button_collapse')
            this.container.style.paddingBottom = 0
            this.switcher.disabled = false
        }

        _adjustControls(editor)
        {
            if (editor.title) {
                editor.title.style.display = 'none'
            }
            editor.container.style.display = ''
            if (this.childEditorControls) {
                this.container.removeChild(this.childEditorControls)
            }
            this.childEditorControls = editor.controls
            this.container.insertBefore(this.childEditorControls, this.switcher.nextSibling)
        }

        _createCollapseButton () {
            const button = this.getButton('', 'expand', 'button_expand')
            button.classList.add('json-editor-btntype-toggle')
            button.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (this.collapsed) {
                    this.expandEditor()
                } else {
                    this.collapseEditor()
                }
            })

            this.container.insertBefore(button, this.container.childNodes[0])
            return button
        }
    }
}

export default makeCollapsibleMultipleEditor