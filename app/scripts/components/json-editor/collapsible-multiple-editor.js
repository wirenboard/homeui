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
    JSONEditor.defaults.languages.en.deprecated_template = 'deprecated template'
    JSONEditor.defaults.languages.en.deprecated_notice = 'Device template is deprecated, use newer version'
    return class extends JSONEditor.defaults.editors["multiple"] {

        build () {
            if (!this.schema.options || !this.schema.options.disable_collapse) {
                this.collapsed = true
            }

            super.build()

            this.switcher_options.forEach((op ,i) => {
                const ops = this.types[i].options
                if (ops && ops.wb && ops.wb.hide_from_selection) {
                    op.hidden = 'hidden'
                }
            })

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

        updateWarnIcon() {
            var type = this.types[this.type]
            if (type.options && type.options.wb && type.options.wb.hide_from_selection) {
                if (this.warnIcon) {
                    this.warnIcon.style.display = ''
                } else {
                    this.warnIcon = document.createElement('i')
                    this.warnIcon.title = this.translate('deprecated_notice')
                    this.warnIcon.classList.add('warning-sign')
                    this.warnIcon.classList.add('glyphicon')
                    this.warnIcon.classList.add('glyphicon-exclamation-sign')
                    this.container.insertBefore(this.warnIcon, this.container.childNodes[1])
                }
            } else {
                if (this.warnIcon) {
                    this.warnIcon.style.display = 'none'
                }
            }
        }

        updateDeprecationNotice() {
            var type = this.types[this.type]
            if (!this.collapsed && type.options && type.options.wb && type.options.wb.hide_from_selection) {
                if (this.deprecationNotice) {
                    this.deprecationNotice.style.display = ''
                } else {
                    this.deprecationNotice = document.createElement('p')
                    this.deprecationNotice.innerHTML = this.translate('deprecated_notice') 
                    this.deprecationNotice.classList.add('bg-warning')
                    this.deprecationNotice.classList.add('warning-notice')
                    this.container.insertBefore(this.deprecationNotice, this.container.childNodes[6])
                }
            } else {
                if (this.deprecationNotice) {
                    this.deprecationNotice.style.display = 'none'
                }
            }
        }

        switchEditor (i) {
            var collapse = false
            if (!this.editors[i]) {
                if (!this.collapsed || (this.schema.options && this.schema.options.disable_collapse)) {
                    this.buildChildEditor(i)
                }
                if (this._isUnknownDeviceType(i)) {
                    this.buildChildEditor(i)
                    collapse = true
                }
            }
            const currentValue = this.getValue()
            this.type = i
            this.register()
            this.updateWarnIcon()
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
            if (collapse) {
                this.collapsed = false
                this.collapseEditor()
            }
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
            // hide only editor, error_holder still be shown
            this.editors[this.type].editor_holder.style.display = 'none'
            this.collapsed = true
            this.setButtonText(this.collapse_control, '', 'expand', 'button_expand')
            this.container.style.paddingBottom = ''
            if (this.childEditorControls) {
                this.container.removeChild(this.childEditorControls)
                this.childEditorControls = undefined
            }
            this.switcher.disabled = true
            this.updateDeprecationNotice()
        }

        expandEditor() {
            if (!this.editors[this.type]) {
                this.buildChildEditor(this.type)
                this.editors[this.type].setValue(this.valueToSet, true)
                this.refreshValue()
            }
            this._adjustControls(this.editors[this.type])
            this.editors[this.type].editor_holder.style.display = ''
            this.collapsed = false
            this.setButtonText(this.collapse_control, '', 'collapse', 'button_collapse')
            this.container.style.paddingBottom = 0
            this.switcher.disabled = false
            this.updateDeprecationNotice()
        }

        onChildEditorChange (editor) {
            super.onChildEditorChange(editor)
            this.onWatchedFieldChange()
        }

        getDisplayText (arr) {
            const disp = []
            const inc = {}

            arr.forEach(el => {
                var title = 'Item'
                if (el.title) {
                    title = this.translateProperty(el.title)
                    if (el.options && el.options.wb && el.options.wb.hide_from_selection) {
                        title = title + ' (' + this.translate('deprecated_template') + ')'
                    }
                }
                if (inc[title]) {
                    title = `${title} ${inc[title]}`
                    inc[title]++
                } else {
                    inc[title] = 2
                }
                disp.push(title)
            })

            return disp
          }

        _adjustControls(editor)
        {
            if (editor.title) {
                editor.title.style.display = 'none'
            }
            editor.container.style.display = ''
            if (this.childEditorControls) {
                this.container.removeChild(this.childEditorControls)
                this.childEditorControls = undefined
            }
            if (editor.controls) {
                this.childEditorControls = editor.controls
                this.container.insertBefore(this.childEditorControls, this.switcher.nextSibling)
            }
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

        _isUnknownDeviceType(i) {
            const props = this.types[i].properties;
            return (props && props.device_type && props.device_type.enum && props.device_type.enum[0] === 'unknown');
        }
    }
}

export default makeCollapsibleMultipleEditor