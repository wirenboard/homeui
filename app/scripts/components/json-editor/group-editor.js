'use strict';

import angular from "angular";
import { JSONEditor } from "../../../3rdparty/jsoneditor";

class Editor {
    constructor(editor, group, schema) {
        this.editor = editor
        this.isEnabled = true
        this.schema = schema
        this.isChannel = (schema.default && schema.default.hasOwnProperty("channelIndex"))
        this.group = group
        this.oneOfIndex = 0
        this.errors = undefined
    }

    isTopLevelEditor() {
        return this.group && !this.group.schema
    }

    isHidden() {
        return this.schema.options && this.schema.options.hidden
    }

    // Parameters with same name are organized in oneOf schema.
    // Each element in oneOf array must have condition.
    // Generic oneOf parameters don't have conditions
    isConditionalOneOfEditor() {
        return this.schema.hasOwnProperty('oneOf') && this.schema.oneOf[0].hasOwnProperty('condition')
    }

    updateEditorDisplay() {
        if (!this.editor) {
            return
        }
        if (this.isConditionalOneOfEditor()) {
            this.editor.switcher.style.display = 'none'
            if (this.editor.type != this.oneOfIndex) {
                this.editor.switchEditor(this.oneOfIndex)
                // 'multiple' editor doesn't respect enabled state during subeditors creation.
                // So force enabling or disabling
                if (this.editor.isEnabled()) {
                    this.editor.enable()
                } else {
                    this.editor.disable()
                }
            }
        }
        if (this.isEnabled) {
            if (this.isTopLevelEditor()) {
                if (this.editor.isActive() && !this.isHidden()) {
                    this.show()
                }
            } else {
                if (!this.isHidden()) {
                    this.show()
                }
            }
        } else {
            this.hide()
        }
    }

    enable() {
        this.isEnabled = true
        this.updateEditorDisplay()
        if (this.group) {
            if (this.isChannel) {
                this.group.onChannelEnabled()
            } else {
                this.group.onParamEnabled()
            }
        }
    }

    disable() {
        this.isEnabled = false
        this.updateEditorDisplay()
        if (this.group) {
            if (this.isChannel) {
                this.group.onChannelDisabled()
            } else {
                this.group.onParamDisabled()
            }
        }
    }

    updateState(paramNames, paramValues) {
        var enable = this.shouldEnable(paramNames, paramValues)
        if (enable == this.isEnabled) {
            this.updateEditorDisplay()
            return false
        }
        if (enable) {
            this.enable();
        } else {
            this.disable()
        }
        return true
    }

    checkCondition(paramNames, paramValues, schema) {
        try {
            return new Function(paramNames, 'return ' + schema.condition + ';').apply(null, paramValues)
        } catch (e) {
            return false
        }
    }

    shouldEnable(paramNames, paramValues) {
        if (this.isConditionalOneOfEditor()) {
            var index = this.schema.oneOf.findIndex(schema => {
                return this.checkCondition(paramNames, paramValues, schema)
            })
            if (index == -1) {
                return false
            }
            this.oneOfIndex = index;
            return true;
        }
        if (!this.schema.condition) {
            return true
        }
        return this.checkCondition(paramNames, paramValues, this.schema)
    }

    show() {
        this.editor.container.style.display = ''
    }

    hide() {
        this.editor.container.style.display = 'none'
    }

    setValue(val, initial) {
        if (this.editor) {
            if (this.isConditionalOneOfEditor()) {
                this.editor.editors[this.editor.type].setValue(val, initial)
            } else {
                this.editor.setValue(val, initial)
            }
        }
    }

    setErrors(errors, path) {
        if (this.editor) {
            this.editor.showValidationErrors(errors)
        } else {
            this.errors = errors
        }
        if (errors.some(er => er.path.startsWith(path))) {
            if (this.group) {
                this.group.notifyError()
            }
        }
    }
}

class Group {
    constructor(schema) {
        this.schema = schema,
        this.parentGroup = undefined,
        this.subgroups = {
            groups: [],
            enabledCount: 0
        },
        this.isEnabled = true,
        this.panel = undefined,
        this.header = undefined,
        this.channels = {
            table: undefined,
            editors: {},
            enabledCount: 0
        },
        this.params = {
            editors: {},
            enabledCount: 0
        }
        this.hasErrors = false
    }

    updateState() {
        var oldState = this.isEnabled
        this.isEnabled = (this.params.enabledCount != 0) ||
                         (this.channels.enabledCount != 0) ||
                         (this.subgroups.enabledCount != 0)
        if (this.isEnabled == oldState) {
            return
        }
        if (this.isEnabled) {
            if (this.parentGroup) {
                this.parentGroup.onSubgroupEnabled()
            }
            if (this.panel) {
                this.panel.style.display = ''
            }
            if (this.header) {
                this.header.style.display = ''
            }
        } else {
            if (this.parentGroup) {
                this.parentGroup.onSubgroupDisabled()
            }
            if (this.panel) {
                this.panel.style.display = 'none'
            }
            if (this.header) {
                this.header.style.display = 'none'
            }
        }
    }

    addEditor(key, editor) {
        if (editor.isChannel) {
            this.channels.editors[key] = editor
            ++this.channels.enabledCount
        } else {
            this.params.editors[key] = editor
            ++this.params.enabledCount
        }
    }

    addSubgroup(group) {
        this.subgroups.groups.push(group)
        ++this.subgroups.enabledCount
    }

    onParamDisabled() {
        --this.params.enabledCount
        this.updateState()
    }

    onParamEnabled() {
        ++this.params.enabledCount
        this.updateState()
    }

    onChannelDisabled() {
        --this.channels.enabledCount
        if (this.channels.enabledCount == 0 && this.channels.table) {
            this.channels.table.style.display = 'none'
        }
        this.updateState()
    }

    onChannelEnabled() {
        ++this.channels.enabledCount
        if (this.channels.enabledCount != 0 && this.channels.table) {
            this.channels.table.style.display = ''
        }
        this.updateState()
    }

    onSubgroupDisabled() {
        --this.subgroups.enabledCount
        this.updateState()
    }

    onSubgroupEnabled() {
        ++this.subgroups.enabledCount
        this.updateState()
    }

    setHeader(header) {
        this.header = header
        if (!this.isEnabled) {
            this.header.style.display = 'none'
        }
    }

    setPanel(panel) {
        this.panel = panel
        if (!this.isEnabled) {
            this.panel.style.display = 'none'
        }
    }

    setChannelsTable(table) {
        this.channels.table = table
        if (this.channels.enabledCount == 0) {
            this.channels.table.style.display = 'none'
        }
    }

    notifyError() {
        if (this.parentGroup && this.parentGroup.parentGroup) {
            this.parentGroup.notifyError()
        } else {
            this.hasErrors = true
        }
    }
}

class Tab
{
    constructor(tabElement, contentElement, group) {
        this.hasEditors = false
        this.tab = tabElement
        this.container = contentElement
        this.group = group
    }
}

function makeGroupsEditor () {
    JSONEditor.defaults.languages.en.channel = 'Channel'
    return class extends JSONEditor.AbstractEditor {
        constructor (options, defaults) {
            super(options, defaults)
            this.MAX_GRID_COLUMNS = 12
        }

        getDefault() {
            if (this.schema.default) {
                return this.schema.default
            }
            var df = {}
            Object.entries(this.getRootGroup().params.editors).forEach(([key, ed]) => {
                if (this.checkRequired(key, ed)) {
                    df[key] = ed.editor.getDefault()
                }
            })
            return df
          }

        register() {
            super.register()
            if (this.editors) {
                Object.entries(this.editors).forEach(([key, ed]) => {
                    if (ed.editor) {
                        ed.editor.register()
                    }
                })
            }
        }

        unregister() {
            super.unregister()
            if (this.editors) {
                Object.entries(this.editors).forEach(([key, ed]) => {
                    if (ed.editor) {
                        ed.editor.unregister()
                    }
                })
            }
        }

        preBuildGroups() {
            this.groups.set(undefined, new Group(undefined)) // root group
            if (this.schema.options && this.schema.options.wb && this.schema.options.wb.groups) {
                this.schema.options.wb.groups.forEach(groupSchema => {
                    if (typeof groupSchema === 'object' && !Array.isArray(groupSchema) && groupSchema !== null) {
                        var group = this.groups.get(groupSchema.id)
                        if (group) {
                            group.schema = groupSchema
                        } else {
                            group = new Group(groupSchema)
                            this.groups.set(groupSchema.id, group)
                        }
                        var parentGroup = this.groups.get(groupSchema.group)
                        if (!parentGroup) {
                            parentGroup = new Group()
                            this.groups.set(groupSchema.group, parentGroup)
                        }
                        parentGroup.addSubgroup(group)
                        group.parentGroup = parentGroup
                    }
                })
            }
        }

        preBuildEditors() {
            Object.entries(this.schema.properties).forEach(([key, schema]) => {
                var group = this.groups.get(schema.group)
                group.addEditor(key, this.storeEditor(key, undefined, group, schema))
            })
        }

        preBuild() {
            this.value = {}
            this.tabs = []
            this.editors = {}
            this.groups = new Map()
            this.preBuildGroups()
            this.preBuildEditors()
        }

        getRootGroup() {
            return this.groups.get(undefined)
        }

        createTabs() {
            this.getRootGroup().subgroups.groups.forEach(group => {
                if (!this.tabs_holder) {
                    const grid_row = this.theme.getGridRow()
                    this.tabs_holder = this.theme.getTabHolder(this.getValidId(this.path))
                    grid_row.appendChild(this.tabs_holder)
                    this.theme.setGridColumnSize(this.tabs_holder, this.MAX_GRID_COLUMNS)
                    this.row_holder = this.theme.getTabContentHolder(this.tabs_holder)
                    this.editor_holder.appendChild(grid_row)
                }
                this.addTab(group)
            })
            if (this.tabs.length) {
                this.activeTab = this.tabs[0].tab
            }
            this.refreshTabs()
        }

        build() {
            this.error_holder = document.createElement('div')
            this.container.appendChild(this.error_holder)
            this.editor_holder = document.createElement('div')
            this.container.appendChild(this.editor_holder)
            
            this.controls = this.theme.getButtonHolder()
            this.controls.classList.add('je-object__controls')
            /* Object Properties Button */
            this.addproperty_button = this.getButton('properties', 'edit_properties', 'button_object_properties')
            this.addproperty_button.classList.add('json-editor-btntype-properties')
            this.addproperty_button.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                this.toggleAddProperty()
            })
            this.controls.appendChild(this.addproperty_button)
            /* Manage Properties modal */
            this.addproperty_holder = this.theme.getModal()
            this.addproperty_list = document.createElement('div')
            this.addproperty_list.classList.add('property-selector')
            this.addproperty_holder.appendChild(this.addproperty_list)

            this.controls.insertBefore(this.addproperty_holder, this.controls.childNodes[1])

            this.disableValueUpdate = true
            this.createTopLevelEditors(this.editor_holder)
            this.createChannels(this.editor_holder, this.getRootGroup())
            this.createTabs()
            this.updateEditorsState()
            this.disableValueUpdate = false
            this.showEnabledTab()
            this.refreshAddProperties()
        }

        checkRequired(key, editor) {
            return (this.schema.required && this.schema.required.includes(key)) || editor.schema.requiredProp
        }

        checkDefault(key) {
            return (this.schema.defaultProperties && this.schema.defaultProperties.includes(key))
        }

        refreshAddProperties() {
            if (this.addproperty_checkboxes) {
                this.addproperty_list.innerHTML = ''
            }
            this.addproperty_checkboxes = {}

            Object.entries(this.getRootGroup().params.editors).forEach(([key, ed]) => {
                if (ed.isEnabled && !ed.isHidden() && !this.checkRequired(key, ed) && (!ed.schema.options || !ed.schema.options.show_opt_in)) {
                    this.addPropertyCheckbox(key)
                }
            })
        }

        insertPropertyControlUsingPropertyOrder(property, control, container) {
            var propertyOrder
            if (this.schema.properties[property]) {
                propertyOrder = this.schema.properties[property].propertyOrder
            }
            if (typeof propertyOrder !== 'number') {
                propertyOrder = 1000
            }
            control.propertyOrder = propertyOrder
        
            for (var i = 0; i < container.childNodes.length; i++) {
                const child = container.childNodes[i]
                if (control.propertyOrder < child.propertyOrder) {
                    this.addproperty_list.insertBefore(control, child)
                    control = null
                    break
                }
            }
            if (control) {
                this.addproperty_list.appendChild(control)
            }
        }

        showAddProperty() {
            if (!this.addproperty_holder) return
        
            /* Position the form directly beneath the button */
            this.addproperty_holder.style.left = `${this.addproperty_button.offsetLeft}px`
            this.addproperty_holder.style.top = `${this.addproperty_button.offsetTop + this.addproperty_button.offsetHeight}px`
        
            /* Disable the rest of the form while editing JSON */
            this.disable()
        
            this.adding_property = true
            this.addproperty_button.disabled = false
            this.addproperty_holder.style.display = ''
            this.refreshAddProperties()
        }
        
        hideAddProperty() {
            if (!this.addproperty_holder) return
            if (!this.adding_property) return
        
            this.addproperty_holder.style.display = 'none'
            this.enable()
        
            this.adding_property = false
        }

        toggleAddProperty() {
            if (this.adding_property) this.hideAddProperty()
            else this.showAddProperty()
        }

        addPropertyCheckbox(key) {
            var labelText

            const checkbox = this.theme.getCheckbox()
            checkbox.style.width = 'auto'
        
            if (this.schema.properties[key] && this.schema.properties[key].title) {
                labelText = this.translateProperty(this.schema.properties[key].title)
            } else {
                labelText = key
            }

            const label = this.theme.getCheckboxLabel(labelText)
        
            const control = this.theme.getFormControl(label, checkbox)
            control.style.paddingBottom = control.style.marginBottom = control.style.paddingTop = control.style.marginTop = 0
            control.style.height = 'auto'
            this.insertPropertyControlUsingPropertyOrder(key, control, this.addproperty_list)
            checkbox.checked = this.editors[key].editor.isActive()
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.editors[key].editor.activate()
                    this.editors[key].show()
                } else {
                    this.editors[key].editor.deactivate()
                    this.editors[key].hide()
                }
                this.onChange(true)
            })
            this.addproperty_checkboxes[key] = checkbox
            return checkbox
        }

        setValue(value, initial) {
            this.value = angular.extend({}, value)
            this.disableValueUpdate = true
            this.enableEditorsAccordingToParams(value)
            Object.entries(value).forEach(([key, val]) => {
                if (this.editors.hasOwnProperty(key)) {
                    var ed = this.editors[key]
                    if (ed.editor) {
                        ed.setValue(val, initial)
                        ed.editor.activate()
                        ed.enable()
                    }
                }
            })

            Object.entries(this.getRootGroup().params.editors).forEach(([key, ed]) => {
                if (!value.hasOwnProperty(key) && !this.checkRequired(key, ed.editor) && ed.editor.options.show_opt_in) {
                    ed.editor.deactivate()
                }
            })

            this.updateEditorsState()
            this.disableValueUpdate = false
            this.showEnabledTab()
            this.onChange(true)
        }

        addTab(group) {
            var tabText = document.createElement('span')
            tabText.textContent = this.translateProperty(group.schema.title)
            var tab = new Tab(this.theme.getTab(tabText, this.getValidId(this.path + '.' + group.schema.id)),
                              this.theme.getTabContent(),
                              group)
            this.tabs.push(tab)
            group.setHeader(tab.tab)
            this.row_holder.appendChild(tab.container)
            this.theme.addTab(this.tabs_holder, tab.tab)
            tab.tab.addEventListener('click', (e) => {
                this.activeTab = tab.tab
                this.refreshTabs()
                e.preventDefault()
                e.stopPropagation()
            })
        }

        storeEditor(key, editor, group, schema) {
            var ed = new Editor(editor, group, schema)
            this.editors[key] = ed
            return ed
        }

        createChannels(container, group) {
            var schemas = Object.entries(group.channels.editors)
                                .sort((a, b)  => a[1].schema.default.channelIndex - b[1].schema.default.channelIndex)
            if (schemas.length) {
                var table = this.theme.getTable()
                container.appendChild(table)
                var thead = this.theme.getTableHead()
                table.appendChild(thead)
                var header_row = this.theme.getTableRow()
                thead.appendChild(header_row)
                var row_holder = this.theme.getTableBody()
                table.appendChild(row_holder)
                if (group) {
                    group.setChannelsTable(table)
                }

                schemas.forEach(([key, ed]) => {
                    const editorClass = this.jsoneditor.getEditorClass(ed.schema, this.jsoneditor)
                    var row = row_holder.appendChild(this.theme.getTableRow())
                    var ret = this.jsoneditor.createEditor(editorClass, {
                      jsoneditor: this.jsoneditor,
                      schema: ed.schema,
                      container: row,
                      path: `${this.path}.${key}`,
                      parent: this,
                      compact: true,
                      table_row: true
                    })
                    ed.editor = ret
                    ret.preBuild()
                    var cell = this.theme.getTableCell()
                    cell.style.verticalAlign = 'middle'
                    cell.textContent = ret.getTitle()
                    row.appendChild(cell)
                    ret.build()
                    ret.postBuild()
                    ret.setOptInCheckbox(ret.header)
                    if (this.value.hasOwnProperty(key)) {
                        ret.setValue(this.value[key], true)
                    }
                    ed.updateEditorDisplay()

                    if (!header_row.hasChildNodes()) {
                        header_row.appendChild(this.theme.getTableHeaderCell(this.translate('channel')))
                        const ce = ret.getChildEditors()
                        const order = ret.property_order || Object.keys(ce)
                        for (let i = 0; i < order.length; i++) {
                            if (!ce[order[i]].schema.options || !ce[order[i]].schema.options.hidden) {
                                header_row.appendChild(this.theme.getTableHeaderCell(ce[order[i]].getTitle()))
                            }
                        }
                    }
                })
            }
        }

        createTopLevelEditors(container) {
            Object.entries(this.getRootGroup().params.editors)
                  .sort((a, b) => (a[1].schema.propertyOrder || 0) - (b[1].schema.propertyOrder || 0))
                  .forEach(([key, ed]) => {
                        var editorHolder = document.createElement('div')
                        container.appendChild(editorHolder)
                        const editorClass = this.jsoneditor.getEditorClass(ed.schema)
                        if (ed.schema.requiredProp) {
                            ed.schema.required = true
                        }
                        var ret = this.jsoneditor.createEditor(editorClass, {
                            jsoneditor: this.jsoneditor,
                            schema: ed.schema,
                            container: editorHolder,
                            path: `${this.path}.${key}`,
                            parent: this,
                            required: true
                        })
                        ed.editor = ret
                        ret.preBuild()
                        ret.build()
                        ret.postBuild()
                        ret.setOptInCheckbox(ret.header)
                        if (this.checkRequired(key, ed) || this.checkDefault(key)) {
                            ret.activate()
                            ed.show()
                        } else {
                            ret.deactivate()
                            ed.hide()
                        }
                        if (ed.isHidden()) {
                            ed.hide()
                        }
                })
        }

        createEditors(container, group) {
            var rowHolder = undefined
            Object.entries(group.params.editors)
                  .sort((a, b) => (a[1].schema.propertyOrder || 0) - (b[1].schema.propertyOrder || 0))
                  .forEach(([key, ed]) => {
                        var editorHolder = document.createElement('div')
                        if (!rowHolder) {
                            rowHolder = this.theme.getGridRow()
                            container.appendChild(rowHolder)
                        }
                        this.theme.setGridColumnSize(editorHolder, this.MAX_GRID_COLUMNS/2)
                        rowHolder.appendChild(editorHolder)
                        if (ed.schema.requiredProp) {
                            ed.schema.required = true
                        }
                        if (ed.schema.hasOwnProperty('oneOf')) {
                            ed.schema.oneOf.forEach(s => s.options = angular.extend(s.options || {}, {show_opt_in: true}))
                        }
                        const editorClass = this.jsoneditor.getEditorClass(ed.schema)
                        var ret = this.jsoneditor.createEditor(editorClass, {
                            jsoneditor: this.jsoneditor,
                            schema: ed.schema,
                            container: editorHolder,
                            path: `${this.path}.${key}`,
                            parent: this,
                            required: true
                        })
                        ed.editor = ret
                        ret.preBuild()
                        ret.build()
                        ret.postBuild()
                        ret.setOptInCheckbox(ret.header)
                        ed.updateEditorDisplay()
                        if (this.value.hasOwnProperty(key)) {
                            ed.setValue(this.value[key], true)
                            ret.activate()
                        }
                        if (ed.errors) {
                            ed.editor.showValidationErrors(ed.errors)
                        }
                })
        }

        createGroups(container, group) {
            if (!group) {
                return
            }
            if (group.schema.description) {
                container.appendChild(this.theme.getFormInputDescription(this.translateProperty(group.schema.description)))
            }
            this.createEditors(container, group)
            this.createChannels(container, group)
            group.subgroups.groups.forEach(subgroup => {
                if (subgroup.schema.ui_options && 
                    subgroup.schema.ui_options.wb && 
                    subgroup.schema.ui_options.wb.disable_title)
                {
                    subgroup.setPanel(document.createElement('div'))
                } else {
                    subgroup.setHeader(document.createElement('label'))
                    subgroup.header.textContent = this.translateProperty(subgroup.schema.title)
                    container.appendChild(subgroup.header)
                    subgroup.setPanel(this.theme.getIndentedPanel())
                }
                container.appendChild(subgroup.panel)
                this.createGroups(subgroup.panel, subgroup)
            })
        }

        getParamsForConditions(params, paramNames, paramValues) {
            Object.entries(params)
                    .filter(([key, value]) => this.editors.hasOwnProperty(key) && !this.editors[key].isChannel)
                    .forEach(([key, value]) => {
                        paramNames.push(key)
                        paramValues.push(value)
                    })
            paramNames = paramNames.join(',')
            return [paramNames, paramValues]
        }

        enableEditorsAccordingToParams(params) {
            var paramValues = []
            var paramNames = []
            this.getParamsForConditions(params, paramNames, paramValues)
            Object.entries(this.editors).forEach(([key, ed]) => {
                ed.updateState(paramNames, paramValues)
            })
        }

        updateEditorsState() {
            var hasChanges = true
            for (var cycles = 0; hasChanges && cycles < 10; ++cycles) {
                var paramValues = []
                var paramNames = []
                this.getParamsForConditions(this.value, paramNames, paramValues)
                hasChanges = false
                Object.entries(this.editors).forEach(([key, ed]) => {
                    hasChanges = ed.updateState(paramNames, paramValues) || hasChanges
                    if (ed.isEnabled) {
                        if (ed.editor) {
                            if (ed.editor.isActive()) {
                                this.value[key] = ed.editor.getValue()
                            } else {
                                delete this.value[key]
                            }
                        } else {
                            if (ed.schema.requiredProp && !this.value.hasOwnProperty(key)) {
                                this.value[key] = ed.schema.default
                            }
                        }
                    } else {
                        delete this.value[key]
                    }
                })
            }
        }

        onChildEditorChange (editor) {
            if (this.disableValueUpdate) {
                return
            }
            var ed = this.editors[editor.key]
            if (ed) {
                if (ed.isEnabled && ed.editor.isActive()) {
                    this.value[editor.key] = ed.editor.getValue()
                } else {
                    delete this.value[editor.key]
                }
            }
            this.updateEditorsState()
            // current active tab can be disabled after editor change, so show first enabled tab
            this.showEnabledTab()
            super.onChildEditorChange(editor)
        }

        showEnabledTab() {
            if (!this.activeTab) {
                return
            }
            var tab = this.tabs.find(tab => tab.tab == this.activeTab)
            if (!tab || tab.group.isEnabled) {
                return
            }
            this.theme.markTabInactive(tab)
            tab = this.tabs.find(tab => tab.tab && tab.group.isEnabled)
            if (tab) {
                if (!tab.hasEditors) {
                    this.disableValueUpdate = true
                    this.createGroups(tab.container, tab.group)
                    this.disableValueUpdate = false
                    tab.hasEditors = true
                }
                this.activeTab = tab.tab
                this.theme.markTabActive(tab)
            }
        }

        refreshTabs() {
            this.tabs.forEach(tab => {
                if (!tab.tab) return
                if (tab.tab === this.activeTab) {
                    if (!tab.hasEditors) {
                        this.disableValueUpdate = true
                        this.createGroups(tab.container, tab.group)
                        this.disableValueUpdate = false
                        tab.hasEditors = true
                    }
                    this.theme.markTabActive(tab)
                } else {
                  this.theme.markTabInactive(tab)
                }
            })
        }

        destroy() {
            if (this.editor_holder) this.editor_holder.innerHTML = ''
            if (this.error_holder && this.error_holder.parentNode) this.error_holder.parentNode.removeChild(this.error_holder)
            this.editors = null
            if (this.editor_holder && this.editor_holder.parentNode) this.editor_holder.parentNode.removeChild(this.editor_holder)
            this.editor_holder = null
            super.destroy()
        }

        showValidationErrors(errors) {
            /* Get all the errors that pertain to this editor */
            const myErrors = []
            const otherErrors = []
            errors.forEach(error => {
                if (error.path === this.path) {
                    myErrors.push(error)
                } else {
                    otherErrors.push(error)
                }
            })
        
            /* Show errors for this editor */
            if (this.error_holder) {
                if (myErrors.length) {
                    this.error_holder.innerHTML = ''
                    this.error_holder.style.display = ''
                    myErrors.forEach(error => {
                        if (error.errorcount && error.errorcount > 1) error.message += ` (${error.errorcount} errors)`
                        this.error_holder.appendChild(this.theme.getErrorMessage(error.message))
                    })
                    /* Hide error area */
                } else {
                    this.error_holder.style.display = 'none'
                }
            }

            this.tabs.forEach(t => {
                if (t.group) {
                    t.group.hasErrors = false
                }
            })

            /* Show errors for child editors */
            Object.entries(this.editors).forEach(([key, ed]) => ed.setErrors(otherErrors, `${this.path}.${key}`))

            this.tabs.forEach(t => {
                if (t.group && t.group.hasErrors) {
                    t.tab.classList.add('has-error')
                } else {
                    t.tab.classList.remove('has-error')
                }
            })

        }
    }
}

export default makeGroupsEditor
