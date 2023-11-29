'use strict';

import { makeAutoObservable } from 'mobx';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import AccessLevelStore from '../components/access-level/accessLevelStore';

class ScriptEditorStore {
  constructor(rolesFactory, saveFn, fileName) {
    this.pageWrapperStore = new PageWrapperStore('');
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_THREE);
    this.ruleText = '';
    this.errorLine = null;
    this.focusElement = null;
    this.saveFn = saveFn;
    this.isNew = !fileName;
    if (this.isNew) {
      this.focusElement = 'title';
    }
    this.setFileName(fileName);
    if (this.isNew) {
      this.pageWrapperStore.setLoading(false);
    }

    makeAutoObservable(this);
  }

  get canSave() {
    return !!this.pageWrapperStore.title;
  }

  setFileName(fileName) {
    this.pageWrapperStore.setTitle(fileName || '');
  }

  setRuleText(value) {
    this.errorLine = null;
    this.ruleText = value;
    this.pageWrapperStore.setLoading(false);
  }

  setError(error) {
    if (error) {
      this.pageWrapperStore.setError(error.message);
    } else {
      this.pageWrapperStore.clearError();
    }

    if (!error?.traceback || !error?.traceback?.length) {
      this.errorLine = null;
      return;
    }

    for (let i = 0; i < error.traceback.length; i++) {
      if (error.traceback[i].name == this.pageWrapperStore.title) {
        this.errorLine = error.traceback[i].line;
        break;
      }
    }
  }

  setNotNew() {
    this.isNew = false;
  }

  setFocusElement(element) {
    this.focusElement = element;
  }

  async save() {
    this.pageWrapperStore.setLoading(true);
    try {
      await this.saveFn(this.pageWrapperStore.title, this.ruleText);
      this.setError(null);
      this.setNotNew();
      this.setFocusElement('editor');
    } catch (e) {
      this.setError(e);
      if (this.isNew && e.code == 1008) {
        // wrong file name
        this.setFocusElement('title');
      } else {
        this.setFocusElement('editor');
      }
    }
    this.pageWrapperStore.setLoading(false);
  }
}

export default ScriptEditorStore;
