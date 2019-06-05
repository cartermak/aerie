/**
 * Copyright 2018, by the California Institute of Technology. ALL RIGHTS RESERVED. United States Government Sponsorship acknowledged.
 * Any commercial use must be negotiated with the Office of Technology Transfer at the California Institute of Technology.
 * This software may be subject to U.S. export control laws and regulations.
 * By accepting this document, the user agrees to comply with all applicable U.S. export laws and regulations.
 * User has the responsibility to obtain export licenses, or other export authority as may be required
 * before exporting such information to foreign countries or providing access to foreign persons
 */

import { Action } from '@ngrx/store';

export enum EditorActionTypes {
  AddText = '[sequencing-editor] add_text',
  OpenEditorHelpDialog = '[sequencing-editor] open_editor_help_dialog',
}

export class AddText implements Action {
  readonly type = EditorActionTypes.AddText;
  constructor(public text: string) {}
}

export class OpenEditorHelpDialog implements Action {
  readonly type = EditorActionTypes.OpenEditorHelpDialog;

  constructor(public width: string = '400px') {}
}

export type EditorActions = AddText | OpenEditorHelpDialog;
