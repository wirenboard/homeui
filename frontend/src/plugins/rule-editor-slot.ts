import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { makeAutoObservable, observable } from 'mobx';
import type { RuleEditorAction } from './types';

/** What plugins add to the rule editor, and the editor they can act on. */
class RuleEditorSlot {
  public extensions: Extension[] = [];
  public actions: RuleEditorAction[] = [];
  public view: EditorView | null = null;

  constructor() {
    makeAutoObservable(this, { extensions: observable.ref, view: observable.ref }, { autoBind: true });
  }

  addExtension(extension: Extension) {
    this.extensions = [...this.extensions, extension];
  }

  addAction(action: RuleEditorAction) {
    if (!this.actions.some((a) => a.id === action.id)) {
      this.actions.push(action);
    }
  }

  setView(view: EditorView | null) {
    this.view = view;
  }
}

export const ruleEditorSlot = new RuleEditorSlot();
