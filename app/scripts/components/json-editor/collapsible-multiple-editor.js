'use strict';

import angular from "angular";
import { JSONEditor } from "../../../3rdparty/jsoneditor";

// Editor for oneOf items with collapse button.
// In contrast with original multiple editor the editor doesn't rely on full oneOf items validation.
// It uses specially defined required properties.
// oneOf items must contain required string property with one value in enum.
// The property must be defined first in required list.
// Starts collapsed.
// To speed up creation, editor for selected type is created after expanding
// Has title_controls container to place array item buttons near combobox
// Properties button is taken from selected type editor and placed near combobox
// Title and header controls of a selected type editor are hidden
// Has additional expandEditor and collapseEditor functions
// Supports item grouping
// Hidden items can have additional caption and notice messages
//
// Additional editor options:
// "wb": {
//     "hidden_msg": "text to add to hidden item name",
//     "hidden_notice": "notice message on top of hidden item editor",
//     "groups": [] // item groups
// }
// Additional item options:
// "wb": {
//     "hide_from_selection": true,  // items are hidden from selection
//     "group": "group_id"
// }

function makeCollapsibleMultipleEditor () {
    return class extends JSONEditor.AbstractEditor {
        register () {
            if (this.editors) {
                for (let i = 0; i < this.editors.length; i++) {
                    if (!this.editors[i]) continue
                    this.editors[i].unregister()
                }
                if (this.editors[this.type]) this.editors[this.type].register()
            }
            super.register()
        }

        unregister () {
            super.unregister()
            if (this.editors) {
                for (let i = 0; i < this.editors.length; i++) {
                    if (!this.editors[i]) continue
                    this.editors[i].unregister()
                }
            }
        }

        build () {
            if (!this.schema.options || !this.schema.options.disable_collapse) {
                this.collapsed = true
            }

            const { container } = this

            this.header = this.label = this.theme.getFormInputLabel(this.getTitle(), this.isRequired())
            this.container.appendChild(this.header)

            this.switcher = this.theme.getSwitcher()

            var opt_group = undefined
            var opt_group_id = undefined

            this.types.forEach((type, i) => {
                this.editors[i] = false

                const option = document.createElement('option')
                option.setAttribute('value', type.display_text)
                option.textContent = type.display_text
                if (this._isHidden(type)) {
                    option.hidden = 'hidden'
                }
                option.setAttribute('value', type.display_text)
                if (this._hasWbOptions(type) && type.options.wb.group &&
                    this._hasGroups(this.schema) && this.schema.options.wb.groups.indexOf(type.options.wb.group) != -1) {
                    if (type.options.wb.group != opt_group_id) {
                        opt_group = document.createElement('optgroup')
                        opt_group.label = this.translateProperty(type.options.wb.group)
                        opt_group_id = type.options.wb.group
                        this.switcher.appendChild(opt_group)
                    }
                    opt_group.appendChild(option)
                } else {
                    this.switcher.appendChild(option)
                    opt_group = undefined
                    opt_group_id = undefined
                }
            })
            container.appendChild(this.switcher)
            this.switcher.addEventListener('change', e => {
              e.preventDefault()
              e.stopPropagation()
              this.switchEditor(this.display_text.indexOf(e.currentTarget.value))
              this.onChange(true)
            })

            this.editor_holder = document.createElement('div')
            container.appendChild(this.editor_holder)

            this.switchEditor(0)

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
            if (!this.always_disabled) {
                if (this.editors) {
                    for (let i = 0; i < this.editors.length; i++) {
                        if (!this.editors[i]) continue
                        this.editors[i].enable()
                    }
                }
                this.switcher.disabled = false
                super.enable()
            }
            if (this.collapsed) {
                this.switcher.disabled = true
            }
        }

        disable (alwaysDisabled) {
            if (alwaysDisabled) this.always_disabled = true
            if (this.editors) {
                for (let i = 0; i < this.editors.length; i++) {
                    if (!this.editors[i]) continue
                    this.editors[i].disable(alwaysDisabled)
                }
            }
            this.switcher.disabled = true
            super.disable()
        }

        updateWarnIcon() {
            var type = this.types[this.type]
            if (this._isHidden(type)) {
                if (this.warnIcon) {
                    this.warnIcon.style.display = ''
                } else {
                    if (this._hasWbOptions(this.schema) && this.schema.options.wb.hidden_notice) {
                        this.warnIcon = document.createElement('i')
                        this.warnIcon.title = this.translateProperty(this.schema.options.wb.hidden_notice)
                        this.warnIcon.classList.add('warning-sign')
                        this.warnIcon.classList.add('glyphicon')
                        this.warnIcon.classList.add('glyphicon-exclamation-sign')
                        this.container.insertBefore(this.warnIcon, this.container.childNodes[1])
                    }
                }
            } else {
                if (this.warnIcon) {
                    this.warnIcon.style.display = 'none'
                }
            }
        }

        updateDeprecationNotice() {
            var type = this.types[this.type]
            if (!this.collapsed && this._isHidden(type)) {
                if (this.deprecationNotice) {
                    this.deprecationNotice.style.display = ''
                } else {
                    if (this._hasWbOptions(this.schema) && this.schema.options.wb.hidden_notice) {
                        this.deprecationNotice = document.createElement('p')
                        this.deprecationNotice.innerHTML = this.translateProperty(this.schema.options.wb.hidden_notice)
                        this.deprecationNotice.classList.add('bg-warning')
                        this.deprecationNotice.classList.add('warning-notice')
                        this.container.insertBefore(this.deprecationNotice, this.container.childNodes[6])
                    }
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
            if (collapse) {
                this.collapsed = false
                this.collapseEditor()
            }
        }

        buildChildEditor (i) {
            const type = this.types[i]
            const holder = this.theme.getChildEditorHolder()
            this.editor_holder.appendChild(holder)

            let schema = angular.merge({}, type)
            const editor = this.jsoneditor.getEditorClass(schema)

            this.editors[i] = this.jsoneditor.createEditor(editor, {
                jsoneditor: this.jsoneditor,
                schema,
                container: holder,
                path: this.path,
                parent: this,
                required: true
            })
            this.editors[i].preBuild()
            this.editors[i].build()
            this.editors[i].postBuild()

            if (this.editors[i].header) this.editors[i].header.style.display = 'none'

            if (i !== this.type) holder.style.display = 'none'
        }

        preBuild () {
            this.types = []
            this.type = 0
            this.editors = []

            this.keep_values = true
            if (typeof this.jsoneditor.options.keep_oneof_values !== 'undefined') this.keep_values = this.jsoneditor.options.keep_oneof_values
            if (typeof this.options.keep_oneof_values !== 'undefined') this.keep_values = this.options.keep_oneof_values

            this.types = this.schema.oneOf
            delete this.schema.oneOf

            this.setDisplayText(this.types)

            if (this._hasGroups(this.schema)) {
                // Store original index of a type schema in oneOf array because it is used by Validator in error messages
                this.types.forEach((t, i) => t.originalIndex = i)
                this._sortTypesByGroups()
            }

            this.display_text = this.types.map(t => t.display_text)
        }

        setValue (val, initial) {
            this.value = angular.merge({}, val)
            this.valueToSet = angular.merge({}, val)
            const prevType = this.type
            var validI = null
            this.types.forEach((type, i) => {
                if (this._hasOneValueRequiredStringProperty(type)) {
                    if (this.value.hasOwnProperty(type.required[0]) &&
                        this.value[type.required[0]] === type.properties[type.required[0]].enum[0]) {
                        validI = i
                    }
                } else {
                    if (validI === null) {
                        validI = i
                    }
                }
            })
            if (validI !== null) {
                this.type = validI
                this.switcher.value = this.display_text[validI]
            }
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
            if (this.editors[this.type]) {
                this.refreshValue()
            }
            super.onChildEditorChange(editor)
            this.onWatchedFieldChange()
        }

        refreshValue () {
            this.value = this.editors[this.type].getValue()
        }

        setDisplayText (types) {
            const inc = {}

            types.forEach(el => {
                var title = 'Item'
                if (el.title) {
                    title = this.translateProperty(el.title)
                    if (this._hasWbOptions(this.schema) && this.schema.options.wb.hidden_msg && this._isHidden(el)) {
                        title = title + ' (' + this.translateProperty(this.schema.options.wb.hidden_msg) + ')'
                    }
                }
                if (inc[title]) {
                    title = `${title} ${inc[title]}`
                    inc[title]++
                } else {
                    inc[title] = 2
                }
                el.display_text = title
            })
        }

        destroy () {
            this.editors.forEach(editor => {
                if (editor) editor.destroy()
            })
            if (this.editor_holder && this.editor_holder.parentNode) this.editor_holder.parentNode.removeChild(this.editor_holder)
            if (this.switcher && this.switcher.parentNode) this.switcher.parentNode.removeChild(this.switcher)
            super.destroy()
        }

        showValidationErrors (errors) {
            /* oneOf error paths need to remove the oneOf[i] part before passing to child editors */
            this.editors.forEach((editor, i) => {
                if (!editor) return
                const originalIndex = this.types[i].originalIndex || i
                const check = `${this.path}.oneOf[${originalIndex}]`
                const filterError = (newErrors, error) => {
                    if (error.path.startsWith(check) || error.path === check.substr(0, error.path.length)) {
                        const newError = angular.merge({}, error)
            
                        if (error.path.startsWith(check)) {
                            newError.path = this.path + newError.path.substr(check.length)
                        }
            
                        newErrors.push(newError)
                    }
                    return newErrors
                }
                editor.showValidationErrors(errors.reduce(filterError, []))
            })
        }

        getDefault() {
            if (this.schema.default) {
                return this.schema.default
            }
            var df = {}
            if (this._hasOneValueRequiredStringProperty(this.types[0])) {
                df[this.types[0].required[0]] = this.types[0].properties[this.types[0].required[0]].enum[0]
            }
            return df
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

        _hasWbOptions(schema) {
            return schema.options && schema.options.wb
        }

        _isHidden(item_schema) {
            return this._hasWbOptions(item_schema) && item_schema.options.wb.hide_from_selection
        }

        _hasOneValueRequiredStringProperty(schema) {
            return schema.required &&
                schema.properties &&
                schema.properties[schema.required[0]] &&
                schema.properties[schema.required[0]].enum &&
                (schema.properties[schema.required[0]].enum.length == 1)
        }

        _hasGroups(schema) {
            return this._hasWbOptions(schema) && schema.options.wb.groups
        }

        // Sort oneOf schemas according to they group property
        // Groups are sorted in the same order as in this.schema.options.wb.groups
        // Types in groups are sorted in lexicographical order
        // Types without groups are placed in the end of array
        _sortTypesByGroups() {
            this.types.sort((t1, t2) => {
                var gr1 = (this._hasWbOptions(t1) && t1.options.wb.group)
                var gr2 = (this._hasWbOptions(t2) && t2.options.wb.group)
                if (gr1 != gr2) {
                    if (gr1 == undefined) {
                        return 1
                    }
                    if (gr2 == undefined) {
                        return -1
                    }
                    var gr1i = this.schema.options.wb.groups.indexOf(t1.options.wb.group)
                    var gr2i = this.schema.options.wb.groups.indexOf(t2.options.wb.group)
                    if (gr1i != gr2i) {
                        if (gr1i == -1) {
                            return 1
                        }
                        if (gr2i == -1) {
                            return -1
                        }
                        return gr1i - gr2i
                    }
                }
                return t1.display_text.localeCompare(t2.display_text)
            })
        }
    }
}

export default makeCollapsibleMultipleEditor